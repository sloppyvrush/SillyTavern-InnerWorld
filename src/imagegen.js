// Картинки к мемам. Источник выбирается в настройках:
//   st     — генерация картинок, настроенная в самой таверне (раздел «Генерация изображений»)
//   ext    — подключение уже установленного расширения картинок: берём его тип, адрес, модель и ключ
//            прямо из настроек таверны в момент запроса и никуда их не копируем
//   openai — любой сервис с OpenAI-совместимым API картинок (/v1/images/generations)
//   gemini — сервисы с Gemini-совместимым API (модели gemini-*-image, Nano Banana и похожие)
// Готовая картинка сохраняется в таверну (её папку картинок), в чате хранится только путь.
// Ключи: дневник их не логирует, не пишет в чат и не отправляет никуда, кроме выбранного сервиса.

const trimSlash = s => String(s || '').trim().replace(/\/+$/, '');

// В заголовки идут только видимые ASCII-символы: так ключ не сломает запрос и не «протечёт» лишним
const cleanKey = k => String(k || '').replace(/[^\x21-\x7e]/g, '');
function headersJson(extra = {}) {
    const h = { 'Content-Type': 'application/json' };
    for (const [k, v] of Object.entries(extra)) h[k] = /^(authorization|x-goog-api-key)$/i.test(k) ? v.replace(/^(Bearer )?(.*)$/, (m, b, key) => (b || '') + cleanKey(key)) : v;
    return h;
}
// Из текста ошибки убираем всё, что похоже на ключ: сервисы иногда повторяют присланный ключ в ответе
export function scrubSecrets(text, keys = []) {
    let t = String(text || '');
    for (const k of keys) { const c = cleanKey(k); if (c.length >= 6) t = t.split(c).join('•••'); }
    return t
        .replace(/\b(sk|rk|pk)-[A-Za-z0-9_\-]{8,}/g, '•••')
        .replace(/\bAIza[0-9A-Za-z_\-]{20,}/g, '•••')
        .replace(/\b(Bearer)\s+[A-Za-z0-9._\-]{8,}/gi, '$1 •••')
        .replace(/([?&](key|api_key|apikey|token)=)[^&\s]+/gi, '$1•••');
}
const safeSrc = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/?[\w\-.]+(\/[\w\-. %]+)*\.(png|jpe?g|webp|gif)$/i.test(u) || /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(u))) ? u : null;

async function readError(res) {
    let t = '';
    try { t = await res.text(); } catch { /* пусто */ }
    try { const j = JSON.parse(t); t = (j.error && (j.error.message || j.error)) || j.message || t; } catch { /* текст как есть */ }
    return `${res.status}${t ? `: ${String(t).slice(0, 200)}` : ''}`;
}

// OpenAI-совместимый: POST {base}/images/generations → data[0].b64_json | data[0].url
async function genOpenAI(prompt, cfg, signal) {
    let base = trimSlash(cfg.url || 'https://api.openai.com/v1');
    if (!/\/v\d+$/.test(base) && !/\/images\/generations$/.test(base)) base += '/v1';
    const url = /\/images\/generations$/.test(base) ? base : `${base}/images/generations`;
    const body = { model: cfg.model || 'gpt-image-1', prompt, n: 1, size: '1024x1024' };
    if (!/gpt-image/.test(body.model)) body.response_format = 'b64_json';
    const res = await fetch(url, { method: 'POST', headers: headersJson(cfg.key ? { Authorization: `Bearer ${cfg.key}` } : {}), body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(`сервис картинок ответил ${await readError(res)}`);
    const j = await res.json();
    const d = j && j.data && j.data[0];
    if (d && d.b64_json) return { b64: d.b64_json, mime: 'image/png' };
    if (d && d.url) return { url: d.url };
    throw new Error('сервис не прислал картинку');
}

// Gemini-совместимый: POST {base}/v1beta/models/{model}:generateContent → candidates[].content.parts[].inlineData
async function genGemini(prompt, cfg, signal) {
    let base = trimSlash(cfg.url || 'https://generativelanguage.googleapis.com');
    const model = cfg.model || 'gemini-2.5-flash-image';
    if (!/\/v1(beta)?$/.test(base)) base += '/v1beta';
    const url = `${base}/models/${encodeURIComponent(model)}:generateContent`;
    const h = {};
    if (cfg.key) {
        if (/googleapis\.com/.test(base)) h['x-goog-api-key'] = cfg.key;
        else h.Authorization = `Bearer ${cfg.key}`;
    }
    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } };
    const res = await fetch(url, { method: 'POST', headers: headersJson(h), body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(`сервис картинок ответил ${await readError(res)}`);
    const j = await res.json();
    for (const c of (j && j.candidates) || []) {
        for (const p of (c.content && c.content.parts) || []) {
            const d = p.inlineData || p.inline_data;
            if (d && d.data) return { b64: d.data, mime: d.mimeType || d.mime_type || 'image/png' };
        }
    }
    throw new Error('сервис не прислал картинку');
}

// Генерация таверны: команда /sd quiet=true возвращает путь к готовой картинке
async function genST(prompt, ctx) {
    if (!ctx.executeSlashCommandsWithOptions) throw new Error('в этой версии таверны нет команд');
    const r = await ctx.executeSlashCommandsWithOptions(`/sd quiet=true ${prompt.replace(/\|/g, ' ')}`, { handleExecutionErrors: true });
    const path = r && (r.pipe || r.result);
    if (!path || typeof path !== 'string' || r.isError) throw new Error('генерация картинок таверны не вернула картинку — проверь её настройки');
    return { url: path };
}


// ---------- Подключение через установленное расширение картинок ----------
// Ищем в настройках таверны блоки, похожие на настройки генератора картинок: тип подключения, адрес, модель.
const EXT_TYPES = ['openai', 'gemini', 'custom', 'naistera'];
export function findImageExtensions(extSettings) {
    const out = [];
    for (const [key, v] of Object.entries(extSettings || {})) {
        if (!v || typeof v !== 'object' || Array.isArray(v) || key === 'innerWorld') continue;
        if (typeof v.apiType !== 'string' || !EXT_TYPES.includes(v.apiType.toLowerCase())) continue;
        if (typeof v.endpoint !== 'string' && typeof v.apiKey !== 'string') continue;
        if (typeof v.model !== 'string' && typeof v.naisteraModel !== 'string') continue;
        out.push({ key, name: prettyKey(key), type: v.apiType });
    }
    return out;
}
function prettyKey(k) {
    const t = String(k).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t ? t[0].toUpperCase() + t.slice(1) : k;
}
const stripVer = u => String(u || '').trim().replace(/\/+$/, '').replace(/\/v1(beta)?$/i, '').replace(/\/+$/, '');

// Картинка из ответа chat/completions: images[] (как у OpenRouter), части content, ссылка в тексте, data[]
function imageFromChat(j) {
    const msg = j && j.choices && j.choices[0] && j.choices[0].message;
    if (msg) {
        for (const im of msg.images || []) { const u = im && (im.image_url && im.image_url.url || im.url); if (u) return u; }
        if (Array.isArray(msg.content)) {
            for (const p of msg.content) {
                const u = p && (p.image_url && p.image_url.url || (p.type === 'image' && (p.url || (p.source && p.source.data && `data:${p.source.media_type || 'image/png'};base64,${p.source.data}`))));
                if (u) return u;
                if (p && p.inline_data && p.inline_data.data) return `data:${p.inline_data.mime_type || 'image/png'};base64,${p.inline_data.data}`;
            }
        }
        if (typeof msg.content === 'string') {
            const m = msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/) || msg.content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp)(?:\?\S*)?/i);
            if (m) return m[0];
        }
    }
    if (j && Array.isArray(j.data) && j.data[0]) {
        if (j.data[0].b64_json) return `data:image/png;base64,${j.data[0].b64_json}`;
        if (j.data[0].url) return j.data[0].url;
    }
    return null;
}
async function chatImage(url, key, model, prompt, signal) {
    const body = Object.assign(model ? { model } : {}, { messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }], modalities: ['image', 'text'], stream: false });
    const res = await fetch(url, { method: 'POST', headers: headersJson(key ? { Authorization: `Bearer ${key}` } : {}), body: JSON.stringify(body), signal });
    if (!res.ok) throw new Error(`сервис картинок ответил ${await readError(res)}`);
    const u = imageFromChat(await res.json());
    if (!u) throw new Error('сервис не прислал картинку');
    return u;
}
const fromDataUrl = u => { const m = /^data:([^;]+);base64,(.+)$/.exec(u || ''); return m ? { b64: m[2], mime: m[1] } : { url: u }; };

async function genExt(prompt, cfg, ctx, signal) {
    const all = (ctx && ctx.extensionSettings) || {};
    const v = all[cfg.extKey];
    if (!v || typeof v !== 'object') throw new Error('выбранное расширение картинок не найдено — оно удалено или выключено?');
    // всё берём на время одного запроса: ключ не копируется в настройки дневника и не сохраняется отдельно
    const type = String(v.apiType || '').toLowerCase();
    const key = String(v.apiKey || '').trim();
    const base = stripVer(v.endpoint);
    if (type === 'openai' || (type === 'custom' && (v.customBodyFormat || 'chat') === 'chat')) {
        const url = type === 'custom' ? String(v.endpoint || '').trim().replace(/\/+$/, '') : `${base}/v1/chat/completions`;
        return fromDataUrl(await chatImage(url, key, v.model, prompt, signal));
    }
    if (type === 'custom' && v.customBodyFormat === 'images') {
        return genOpenAI(prompt, { url: String(v.endpoint || '').trim(), key, model: v.model }, signal);
    }
    if (type === 'gemini') {
        return genGemini(prompt, { url: base || 'https://generativelanguage.googleapis.com', key, model: v.model }, signal);
    }
    if (type === 'naistera') {
        const ep = String(v.endpoint || 'https://naistera.org').trim().replace(/\/+$/, '');
        const url = /\/api\/generate$/.test(ep) ? ep : `${ep}/api/generate`;
        const model = String(v.naisteraModel || 'grok').toLowerCase().replace(/\s+/g, ' ').trim();
        const res = await fetch(url, { method: 'POST', headers: headersJson(key ? { Authorization: `Bearer ${key}` } : {}), body: JSON.stringify({ prompt, aspect_ratio: '4:3', model }), signal });
        if (!res.ok) throw new Error(`сервис картинок ответил ${await readError(res)}`);
        const j = await res.json();
        if (!j || !j.data_url || j.media_kind === 'video') throw new Error('сервис не прислал картинку');
        return fromDataUrl(j.data_url);
    }
    throw new Error(`тип подключения «${v.apiType}» у этого расширения пока не поддерживается — выбери другой источник`);
}

// Сохранить в таверну, чтобы картинка не жила в памяти чата
async function upload(ctx, b64, mime) {
    const ext = /jpe?g/.test(mime) ? 'jpg' : (/webp/.test(mime) ? 'webp' : 'png');
    const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: ctx.getRequestHeaders ? ctx.getRequestHeaders() : headersJson(),
        body: JSON.stringify({ image: b64, format: ext, ch_name: 'inner-world-memes', filename: `meme_${Date.now().toString(36)}` }),
    });
    if (!res.ok) throw new Error(`таверна не сохранила картинку: ${await readError(res)}`);
    const j = await res.json();
    if (!j || !j.path) throw new Error('таверна не вернула путь к картинке');
    return j.path;
}

// Картинка по описанию. Возвращает путь (или адрес), который можно поставить в <img src>.
export async function generateImage(prompt, cfg, ctx, signal) {
    const kind = cfg && cfg.kind;
    const extCfg = kind === 'ext' ? ((ctx && ctx.extensionSettings) || {})[cfg.extKey] : null;
    const keys = [cfg && cfg.key, extCfg && extCfg.apiKey].filter(Boolean);
    let out;
    try {
        if (kind === 'st') out = await genST(prompt, ctx);
        else if (kind === 'ext') out = await genExt(prompt, cfg, ctx, signal);
        else if (kind === 'openai') out = await genOpenAI(prompt, cfg, signal);
        else if (kind === 'gemini') out = await genGemini(prompt, cfg, signal);
        else throw new Error('источник картинок не выбран');
    } catch (e) {
        throw new Error(scrubSecrets(e && e.message || e, keys));
    }
    if (out && out.url && !out.b64) {
        const d = /^data:([^;]+);base64,(.+)$/.exec(out.url);
        if (d) out = { b64: d[2], mime: d[1] };
    }
    if (out.b64) {
        try { return await upload(ctx, out.b64, out.mime); } catch (e) {
            console.warn('[Внутренний мир] картинка не сохранилась в таверну, держу её в чате', e);
            return `data:${out.mime};base64,${out.b64}`;
        }
    }
    const src = safeSrc(out.url);
    if (!src) throw new Error('сервис прислал непонятную ссылку на картинку');
    return src;
}

// Короткая проверка источника: одна маленькая картинка
export async function testImageSource(cfg, ctx) {
    return generateImage('a tiny cute cartoon cat waving, flat colors, simple background', cfg, ctx);
}
