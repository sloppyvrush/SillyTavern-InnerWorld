// Отдельное подключение для дневника: OpenRouter, свой OpenAI-совместимый адрес или Google Gemini.
// Запросы идут прямо из браузера, как в расширениях для картинок.

export const API_KINDS = [
    ['profile', 'профиль подключения таверны'],
    ['openrouter', 'OpenRouter'],
    ['openai', 'свой адрес (OpenAI-совместимый)'],
    ['gemini', 'Google Gemini (AI Studio)'],
];

const OPENROUTER = 'https://openrouter.ai/api/v1';
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

function cleanKey(key) {
    return String(key ?? '').trim().replace(/^Bearer\s+/i, '');
}

export function baseUrl(s) {
    if (s.apiKind === 'openrouter') return OPENROUTER;
    if (s.apiKind === 'gemini') return GEMINI;
    let url = String(s.apiEndpoint || '').trim().replace(/\/+$/, '');
    url = url.replace(/\/chat\/completions$/i, '').replace(/\/models$/i, '');
    return url;
}

// Что не заполнено — чтобы подсказать человеку, а не падать с непонятной ошибкой.
export function missingFields(s) {
    if (s.apiKind === 'profile') return s.profileId ? [] : ['профиль'];
    const out = [];
    if (s.apiKind === 'openai' && !baseUrl(s)) out.push('адрес');
    if (!cleanKey(s.apiKey)) out.push('ключ');
    if (!s.apiModel) out.push('модель');
    return out;
}

async function readError(res) {
    let text = '';
    try {
        text = await res.text();
        const j = JSON.parse(text);
        text = (j.error && (j.error.message || j.error)) || j.message || text;
    } catch { /* как есть */ }
    return `${res.status}: ${String(text).slice(0, 300)}`;
}

export async function fetchModels(s, fetchImpl = fetch) {
    const key = cleanKey(s.apiKey);
    if (s.apiKind === 'gemini') {
        const res = await fetchImpl(`${GEMINI}/models?key=${encodeURIComponent(key)}&pageSize=200`);
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        return (data.models || [])
            .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => String(m.name).replace(/^models\//, ''))
            .sort();
    }
    const base = baseUrl(s);
    if (!base) throw new Error('не указан адрес');
    const res = await fetchImpl(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {} });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.data || data.models || []);
    return list.map(m => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean).sort();
}

// Читает поток SSE: на каждую строку «data: …» вызывает onData(разобранный JSON).
async function readSse(res, onData) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try { onData(JSON.parse(data)); } catch { /* неполная строка — пропускаем */ }
        }
    }
}

// onText(весь текст на сейчас, размышления на сейчас) — если передан, ответ идёт потоком.
export async function chatRequest(s, system, user, maxTokens, fetchImpl = fetch, onText = null) {
    const key = cleanKey(s.apiKey);
    if (s.apiKind === 'gemini' && onText) {
        const res = await fetchImpl(`${GEMINI}/models/${encodeURIComponent(s.apiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: user }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
            }),
        });
        if (!res.ok) throw new Error(await readError(res));
        let text = '';
        let think = '';
        await readSse(res, d => {
            const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
            for (const p of parts) {
                if (p.thought) think += p.text || '';
                else text += p.text || '';
            }
            onText(text, think);
        });
        if (!text) throw new Error('модель вернула пустой ответ');
        return text;
    }
    if (s.apiKind === 'gemini') {
        const res = await fetchImpl(`${GEMINI}/models/${encodeURIComponent(s.apiModel)}:generateContent?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: user }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
            }),
        });
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
        const text = parts.filter(p => !p.thought).map(p => p.text || '').join('');
        if (!text) throw new Error('модель вернула пустой ответ');
        return text;
    }
    const base = baseUrl(s);
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (s.apiKind === 'openrouter') {
        headers['HTTP-Referer'] = location.origin;
        headers['X-Title'] = 'Inner World (SillyTavern)';
    }
    const res = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: s.apiModel,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            max_tokens: maxTokens,
            temperature: 0.7,
            ...(onText ? { stream: true } : {}),
        }),
    });
    if (!res.ok) throw new Error(await readError(res));
    if (onText && res.body && /event-stream/i.test(res.headers.get('content-type') || '')) {
        let text = '';
        let think = '';
        await readSse(res, d => {
            const delta = d.choices && d.choices[0] && (d.choices[0].delta || d.choices[0].message) || {};
            const c = delta.content;
            if (typeof c === 'string') text += c;
            else if (Array.isArray(c)) text += c.map(x => x.text || '').join('');
            const r = delta.reasoning || delta.reasoning_content;
            if (typeof r === 'string') think += r;
            onText(text, think);
        });
        if (!text) throw new Error('модель вернула пустой ответ');
        return text;
    }
    const data = await res.json();
    const msg = data.choices && data.choices[0] && (data.choices[0].message || data.choices[0]);
    const text = msg && (msg.content ?? msg.text);
    if (!text) throw new Error('модель вернула пустой ответ');
    return Array.isArray(text) ? text.map(p => p.text || '').join('') : String(text);
}
