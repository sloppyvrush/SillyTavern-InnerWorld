// Картинки к мемам — через уже установленное расширение картинок.
// Дневник берёт из его настроек подключение (тип, адрес, модель, ключ), размеры и параметры, стиль
// и негатив в момент рисования и ничего к себе не копирует. Промпт — свой, мемный: генератор
// промптов того расширения не вызывается.
// Готовая картинка сохраняется в таверну (её папку картинок), в чате хранится только путь.
// Ключи: дневник их не логирует, не пишет в чат и не отправляет никуда, кроме сервиса из того расширения.

const trimSlash = s => String(s || '').trim().replace(/\/+$/, '');

// В заголовки идут только видимые ASCII-символы: так ключ не сломает запрос
const cleanKey = k => String(k || '').trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').replace(/[^\x21-\x7e]/g, '');
const bearer = key => (cleanKey(key) ? { Authorization: `Bearer ${cleanKey(key)}` } : {});
const json = (extra = {}) => Object.assign({ 'Content-Type': 'application/json' }, extra);

// Из текста ошибки убираем всё, что похоже на ключ: сервисы иногда повторяют присланный ключ в ответе
export function scrubSecrets(text, keys = []) {
    let t = String(text || '');
    for (const k of keys) { const c = cleanKey(k); if (c.length >= 6) t = t.split(c).join('•••'); }
    return t
        .replace(/\b(sk|rk|pk)-[A-Za-z0-9_\-]{8,}/g, '•••')
        .replace(/\bpst-[A-Za-z0-9_\-]{8,}/g, '•••')
        .replace(/\bAIza[0-9A-Za-z_\-]{20,}/g, '•••')
        .replace(/\b(Bearer)\s+[A-Za-z0-9._\-]{8,}/gi, '$1 •••')
        .replace(/([?&](key|api_key|apikey|token)=)[^&\s]+/gi, '$1•••');
}
const safeSrc = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/?[\w\-.]+(\/[\w\-. %]+)*\.(png|jpe?g|webp|gif)$/i.test(u) || /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(u))) ? u : null;

async function readError(res) {
    let t = '';
    try { t = await res.text(); } catch { /* пусто */ }
    try { const j = JSON.parse(t); t = (j.error && (j.error.message || j.error)) || j.message || j.detail || t; } catch { /* текст как есть */ }
    return `${res.status}${t ? `: ${String(typeof t === 'string' ? t : JSON.stringify(t)).slice(0, 200)}` : ''}`;
}
const fail = async res => { throw new Error(`сервис картинок ответил ${await readError(res)}`); };

// ---------- Какие расширения картинок установлены ----------
const TYPE_NAMES = {
    novelai: 'NovelAI через таверну', 'novelai-direct': 'NovelAI напрямую', openai: 'OpenAI-совместимый', 'openai-chat': 'чат с картинками',
    gemini: 'Gemini', custom: 'свой адрес', naistera: 'Naistera', electronhub: 'Electron Hub',
};
const EXT_TYPES = ['novelai', 'novelai-direct', 'openai', 'openai-chat', 'gemini', 'custom', 'naistera'];
const typeOf = v => String((v && v.apiType) || '').toLowerCase();

// Ищем в настройках таверны блоки, похожие на настройки генератора картинок: тип подключения + модель
export function findImageExtensions(extSettings) {
    const out = [];
    for (const [key, v] of Object.entries(extSettings || {})) {
        if (!v || typeof v !== 'object' || Array.isArray(v) || key === 'innerWorld') continue;
        const type = typeOf(v);
        if (!type) continue;
        if (typeof v.model !== 'string' && typeof v.novelaiModel !== 'string' && typeof v.naisteraModel !== 'string') continue;
        out.push({ key, name: prettyKey(key), type, ok: EXT_TYPES.includes(type) });
    }
    return out;
}
function prettyKey(k) {
    const t = String(k).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t ? t[0].toUpperCase() + t.slice(1) : k;
}

// Стиль, как его собирает само расширение: стиль по умолчанию + включённые стили из галереи
function extStyle(v) {
    const parts = [v.defaultStyle];
    const gallery = Array.isArray(v.styleGalleryItems) ? v.styleGalleryItems : [];
    for (const id of Array.isArray(v.activeStyleIds) ? v.activeStyleIds : []) {
        const it = gallery.find(x => x && x.id === id) || (Array.isArray(v.styles) ? v.styles.find(x => x && x.id === id) : null);
        if (it) parts.push(it.prompt || it.value);
    }
    if (v.activeStyleId && Array.isArray(v.styles)) {
        const it = v.styles.find(x => x && x.id === v.activeStyleId);
        if (it) parts.push(it.value || it.prompt);
    }
    return [...new Set(parts.map(p => String(p || '').trim()).filter(Boolean))].join(', ');
}
function styleNames(v) {
    const gallery = Array.isArray(v.styleGalleryItems) ? v.styleGalleryItems : [];
    const names = (Array.isArray(v.activeStyleIds) ? v.activeStyleIds : []).map(id => (gallery.find(x => x && x.id === id) || {}).name).filter(Boolean);
    if (v.activeStyleId && Array.isArray(v.styles)) { const it = v.styles.find(x => x && x.id === v.activeStyleId); if (it && it.name) names.push(it.name); }
    return names;
}
function extNegative(v) {
    const g = Array.isArray(v.negativeGalleryItems) ? v.negativeGalleryItems.find(x => x && x.id === v.activeNegativeId) : null;
    return String((g && g.prompt) || '').trim();
}

// Что сейчас выбрано в том расширении — для подписи в настройках (без ключей)
export function describeImageExtension(extSettings, key) {
    const v = (extSettings || {})[key];
    if (!v || typeof v !== 'object') return '';
    const type = typeOf(v);
    const model = /^novelai/.test(type) ? v.novelaiModel : (type === 'naistera' ? v.naisteraModel : v.model);
    const prof = Array.isArray(v.connectionProfiles) ? v.connectionProfiles.find(p => p && p.id === v.activeConnectionProfileId && typeOf(p) === type) : null;
    const styles = styleNames(v);
    const bits = [TYPE_NAMES[type] || type];
    if (model) bits.push(String(model));
    if (prof && prof.name) bits.push(`профиль «${prof.name}»`);
    bits.push(styles.length ? `стиль: ${styles.join(', ')}` : (v.defaultStyle ? 'стиль по умолчанию' : 'без стиля'));
    return bits.join(' · ') + (EXT_TYPES.includes(type) ? '' : ' — этот тип подключения дневник пока не умеет');
}

// ---------- Герои на картинке: внешность и фото из того же расширения ----------
// people: [{ name, char: файл аватарки карточки, persona: файл аватарки персоны }]
const norm = t => String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const aliasList = a => (Array.isArray(a) ? a : String(a || '').split(',')).map(norm).filter(Boolean);
function nameHit(name, labels) {
    const n = norm(name);
    if (!n) return false;
    const first = n.split(' ')[0];
    return labels.some(l => l === n || (first.length > 2 && l === first) || (l.split(' ')[0] === first && first.length > 2));
}
function findProfile(v, person) {
    const cp = v.characterProfiles || {};
    const chars = cp.characters || {}, users = cp.users || {};
    if (person.char && chars[`avatar:${person.char}`]) return { p: chars[`avatar:${person.char}`], kind: 'char', file: person.char };
    if (person.persona && users[`avatar:${person.persona}`]) return { p: users[`avatar:${person.persona}`], kind: 'user', file: person.persona };
    for (const [kind, pool] of [[person.persona ? 'user' : 'char', person.persona ? users : chars], [person.persona ? 'char' : 'user', person.persona ? chars : users]]) {
        for (const [k, p] of Object.entries(pool)) {
            const file = k.replace(/^avatar:/, '');
            if (p && nameHit(person.name, [...aliasList(p.aliases), norm(file.replace(/\.[^.]+$/, '').replace(/\d+$/, ''))])) return { p, kind, file };
        }
    }
    for (const n of Array.isArray(v.npcReferences) ? v.npcReferences : (Array.isArray(v.npcList) ? v.npcList : [])) {
        if (n && nameHit(person.name, [norm(n.name), ...aliasList(n.aliases)])) return { p: n, kind: 'npc' };
    }
    return null;
}
function lookOf(hit, nai) {
    const p = hit.p;
    const by = p.appearances && typeof p.appearances === 'object' ? (nai ? p.appearances.novelai : p.appearances.banana) : '';
    return String(by || p.appearance || (hit.kind === 'npc' ? p.description : '') || '').trim().slice(0, 1500);
}
// Фото героя для референса: своя картинка из расширения, иначе аватарка карточки или персоны
async function refImage(hit, v) {
    const p = hit.p;
    let url = '';
    if (hit.kind === 'char' && v.sendCharAvatar === false) return null;
    if (hit.kind === 'user' && v.sendUserAvatar === false && !v.userRefAlways) return null;
    if (p.avatarSource === 'custom' && p.customAvatarData) url = /^data:/.test(p.customAvatarData) ? p.customAvatarData : `data:image/png;base64,${p.customAvatarData}`;
    else if (hit.kind === 'npc' && p.enabled !== false && (p.imageBase64 || p.imagePath)) url = p.imageBase64 ? (/^data:/.test(p.imageBase64) ? p.imageBase64 : `data:image/png;base64,${p.imageBase64}`) : p.imagePath;
    else if (hit.kind === 'char' && hit.file) url = `/characters/${encodeURIComponent(hit.file)}`;
    else if (hit.kind === 'user' && hit.file) url = `/User Avatars/${encodeURIComponent(hit.file)}`;
    if (!url || (!/^data:image\//.test(url) && !/^\/[^/]/.test(url))) return null;
    try {
        const blob = await (await fetch(url)).blob();
        if (!/^image\//.test(blob.type)) return null;
        // уменьшаем до 1024 px по большей стороне, чтобы запрос не раздувался
        const bmp = await createImageBitmap(blob);
        const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        const d = cv.toDataURL('image/jpeg', 0.9);
        return { mime: 'image/jpeg', data: d.slice(d.indexOf(',') + 1) };
    } catch { return null; }
}
async function castOf(v, people, nai, withRefs) {
    const out = [];
    for (const person of (people || []).slice(0, 4)) {
        const hit = findProfile(v, person);
        if (!hit) continue;
        const look = lookOf(hit, nai);
        const ref = withRefs ? await refImage(hit, v) : null;
        if (look || ref) out.push({ name: person.name, look, ref });
    }
    return out;
}

// ---------- Запросы по типам подключения ----------
const isRouter = ep => /closerouter|openrouter|rout\.my/i.test(String(ep || ''));
const stripVer = u => trimSlash(u).replace(/\/v1(beta)?$/i, '');

// Картинка из ответа chat/completions: images[], части content, ссылка в тексте, data[]
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
const fromDataUrl = u => { const m = /^data:([^;]+);base64,(.+)$/.exec(u || ''); return m ? { b64: m[2], mime: m[1] } : { url: u }; };

function textPrompt(prompt, style, negative, cast = []) {
    const refs = cast.filter(c => c.ref);
    return ['Generate an image from the following instruction. Return the generated image in the response.',
        refs.length ? `[REFERENCE IMAGES: ${refs.map((c, i) => `image ${i + 1} = ${c.name}`).join('; ')}. Faces and looks must match their references.]` : '',
        '[IMAGE SPECIFICATIONS: aspect ratio 4:3]', style ? `[STYLE: ${style}]` : '',
        ...cast.filter(c => c.look).map(c => `[CHARACTER "${c.name}": ${c.look}]`),
        `[SCENE TO GENERATE]\n${prompt}`,
        negative ? `[NEGATIVE PROMPT: ${negative}]` : ''].filter(Boolean).join('\n\n');
}

async function genChat(url, key, model, text, signal, refs = []) {
    const content = [{ type: 'text', text }, ...refs.map(r => ({ type: 'image_url', image_url: { url: `data:${r.mime};base64,${r.data}` } }))];
    const body = Object.assign(model ? { model } : {}, { messages: [{ role: 'user', content }], modalities: ['image', 'text'], stream: false });
    const res = await fetch(url, { method: 'POST', headers: json(bearer(key)), body: JSON.stringify(body), signal });
    if (!res.ok) await fail(res);
    const u = imageFromChat(await res.json());
    if (!u) throw new Error('сервис не прислал картинку');
    return fromDataUrl(u);
}
async function genImages(url, key, model, text, signal) {
    const body = { prompt: text, n: 1, size: '1024x1024' };
    if (model) body.model = model;
    if (!/gpt-image/.test(model || '')) body.response_format = 'b64_json';
    const res = await fetch(url, { method: 'POST', headers: json(bearer(key)), body: JSON.stringify(body), signal });
    if (!res.ok) await fail(res);
    const u = imageFromChat(await res.json());
    if (!u) throw new Error('сервис не прислал картинку');
    return fromDataUrl(u);
}
async function genGemini(base, key, model, text, signal, refs = []) {
    let b = trimSlash(base || 'https://generativelanguage.googleapis.com');
    if (!/\/v1(beta)?$/.test(b)) b += '/v1beta';
    const h = cleanKey(key) ? (/googleapis\.com/.test(b) ? { 'x-goog-api-key': cleanKey(key) } : bearer(key)) : {};
    const body = { contents: [{ role: 'user', parts: [...refs.map(r => ({ inlineData: { mimeType: r.mime, data: r.data } })), { text }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } };
    const res = await fetch(`${b}/models/${encodeURIComponent(model || 'gemini-2.5-flash-image')}:generateContent`, { method: 'POST', headers: json(h), body: JSON.stringify(body), signal });
    if (!res.ok) await fail(res);
    const j = await res.json();
    for (const c of (j && j.candidates) || []) {
        for (const p of (c.content && c.content.parts) || []) {
            const d = p.inlineData || p.inline_data;
            if (d && d.data) return { b64: d.data, mime: d.mimeType || d.mime_type || 'image/png' };
        }
    }
    throw new Error('сервис не прислал картинку');
}

// NovelAI: размер мема 4:3 в пределах площади из настроек, но не больше 1024×1024 и не больше 28 шагов —
// на подписке Opus такие картинки не тратят Анлас
function naiSize(v) {
    const area = Math.min((Number(v.novelaiWidth) || 1024) * (Number(v.novelaiHeight) || 1024), 1024 * 1024);
    let w = Math.floor(Math.sqrt(area * 4 / 3) / 64) * 64, h = Math.floor(Math.sqrt(area * 3 / 4) / 64) * 64;
    while (w * h > 1024 * 1024) w -= 64;
    return { width: Math.max(512, w), height: Math.max(512, h) };
}
async function unzipPng(buf) {
    const bytes = new Uint8Array(buf);
    const view = new DataView(buf);
    const u16 = o => view.getUint16(o, true), u32 = o => view.getUint32(o, true);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return bytes; // уже PNG
    let end = -1;
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) if (u32(p) === 0x06054b50) { end = p; break; }
    if (end < 0) throw new Error('NovelAI не прислал картинку');
    let off = u32(end + 16);
    for (let i = 0, n = Math.min(u16(end + 10), 50); i < n && off + 46 <= end && u32(off) === 0x02014b50; i++) {
        const method = u16(off + 10), size = u32(off + 20), nl = u16(off + 28), el = u16(off + 30), cl = u16(off + 32), lo = u32(off + 42);
        const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nl));
        if (/\.png$/i.test(name) && u32(lo) === 0x04034b50) {
            const start = lo + 30 + u16(lo + 26) + u16(lo + 28);
            const data = bytes.subarray(start, start + size);
            if (method === 0) return data;
            if (method === 8) return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        }
        off += 46 + nl + el + cl;
    }
    throw new Error('NovelAI не прислал картинку');
}
const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x6000) s += String.fromCharCode(...bytes.subarray(i, i + 0x6000)); return btoa(s); };

async function genNovelAI(v, prompt, style, ctx, signal, cast = []) {
    const direct = typeOf(v) === 'novelai-direct';
    const { width, height } = naiSize(v);
    const steps = Math.min(Number(v.novelaiSteps) || 28, 28);
    const looks = cast.map(c => c.look).filter(Boolean);
    const model0 = String(v.novelaiCustomModel || v.novelaiModel || '');
    // V4 и новее понимают отдельные описания героев; иначе внешность идёт в общий текст
    const charPrompts = direct && /^nai-diffusion-[4-9]/.test(model0) && looks.length ? looks : [];
    const text = [style, prompt, ...(charPrompts.length ? [] : looks)].filter(Boolean).join(', ');
    const negative = extNegative(v) || String(v.novelaiNegativePrompt || '').trim();
    const model = String(v.novelaiCustomModel || v.novelaiModel || 'nai-diffusion-4-5-full');
    const p = { steps, scale: Number(v.novelaiScale) || 5, sampler: v.novelaiSampler || 'k_euler_ancestral', scheduler: v.novelaiScheduler || 'karras', sm: !!v.novelaiSm, sm_dyn: !!v.novelaiSmDyn, decrisper: !!v.novelaiDecrisper, variety_boost: !!v.novelaiVarietyBoost };
    if (!direct) {
        // через сервер таверны: токен NovelAI лежит в секретах таверны, в браузер он не попадает
        const res = await fetch('/api/novelai/generate-image', { method: 'POST', headers: ctx.getRequestHeaders(), signal, body: JSON.stringify(Object.assign({ prompt: text, model, negative_prompt: negative, width, height, seed: -1 }, p)) });
        if (!res.ok) throw new Error(res.status === 400 ? 'NovelAI: в секретах таверны нет токена' : `NovelAI через таверну ответил ${res.status}`);
        const b64 = (await res.text()).trim();
        if (!/^iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new Error('NovelAI прислал что-то непохожее на картинку');
        return { b64, mime: 'image/png' };
    }
    const token = cleanKey(v.novelaiApiKey);
    if (!token) throw new Error('в расширении картинок не указан токен NovelAI');
    const body = {
        action: 'generate', input: text, model,
        parameters: {
            params_version: /^nai-diffusion-[45]/.test(model) ? (model.startsWith('nai-diffusion-5-') ? 4 : 3) : 1,
            width, height, steps, scale: p.scale, sampler: p.sampler, noise_schedule: p.scheduler, n_samples: 1,
            seed: Math.floor(Math.random() * 4294967295), negative_prompt: negative, ucPreset: 0, qualityToggle: false,
            sm: p.sm, sm_dyn: p.sm_dyn, dynamic_thresholding: p.decrisper, prefer_brownian: true, legacy: false, legacy_v3_extend: false,
            add_original_image: false, controlnet_strength: 1, deliberate_euler_ancestral_bug: false, uncond_scale: 1, skip_cfg_above_sigma: null, use_coords: false,
            reference_image_multiple: [], reference_information_extracted_multiple: [], reference_strength_multiple: [],
            characterPrompts: charPrompts.map(t => ({ prompt: t, uc: '', center: { x: 0.5, y: 0.5 }, enabled: true })),
            v4_prompt: { caption: { base_caption: text, char_captions: charPrompts.map(t => ({ char_caption: t, centers: [{ x: 0.5, y: 0.5 }] })) }, use_coords: false, use_order: true },
            v4_negative_prompt: { caption: { base_caption: negative, char_captions: charPrompts.map(() => ({ char_caption: '', centers: [{ x: 0.5, y: 0.5 }] })) }, legacy_uc: false },
        },
    };
    const res = await fetch('https://image.novelai.net/ai/generate-image', { method: 'POST', headers: json(bearer(token)), body: JSON.stringify(body), signal });
    if (!res.ok) await fail(res);
    return { b64: toB64(await unzipPng(await res.arrayBuffer())), mime: 'image/png' };
}

async function genExt(prompt, cfg, ctx, signal) {
    const all = (ctx && ctx.extensionSettings) || {};
    const v = all[cfg.extKey];
    if (!v || typeof v !== 'object') throw new Error('выбранное расширение картинок не найдено — оно удалено или выключено?');
    // всё берём на время одного запроса: ключ не копируется в настройки дневника и не сохраняется отдельно
    const type = typeOf(v);
    const key = v.apiKey;
    const style = extStyle(v);
    const negative = extNegative(v);
    const nai = type === 'novelai' || type === 'novelai-direct';
    // фото-референсы умеют только сервисы с картинками на входе (Gemini, «нано-банана» и чаты с картинками)
    const withRefs = !nai && type !== 'naistera' && !(type === 'openai' && !isRouter(v.endpoint)) && !(type === 'custom' && (v.customBodyFormat || v.customRequestFormat) === 'images');
    const cast = await castOf(v, cfg.people, nai, withRefs);
    const refs = cast.map(c => c.ref).filter(Boolean);
    if (nai) return genNovelAI(v, prompt, style, ctx, signal, cast);
    if (type === 'naistera') {
        const ep = trimSlash(v.endpoint || 'https://naistera.org');
        const url = /\/api\/generate$/.test(ep) ? ep : `${ep}/api/generate`;
        const model = String(v.naisteraModel || 'grok').toLowerCase().replace(/\s+/g, ' ').trim();
        const res = await fetch(url, { method: 'POST', headers: json(bearer(key)), body: JSON.stringify({ prompt: [style, prompt, ...cast.map(c => c.look && `${c.name}: ${c.look}`)].filter(Boolean).join(', '), aspect_ratio: '4:3', model }), signal });
        if (!res.ok) await fail(res);
        const j = await res.json();
        const d = j && (j.data_url || (j.result && j.result.data_url));
        if (!d || j.media_kind === 'video') throw new Error('сервис не прислал картинку');
        return fromDataUrl(d);
    }
    const text = textPrompt(prompt, style, negative, cast);
    if (type === 'custom') {
        const url = trimSlash(v.customFullUrl || v.endpoint);
        if ((v.customBodyFormat || v.customRequestFormat) === 'images') return genImages(url, key, v.model, text, signal);
        return genChat(url, key, v.model, text, signal, refs);
    }
    const base = stripVer(v.endpoint);
    if (type === 'openai-chat' || (isRouter(v.endpoint) && (type === 'openai' || type === 'gemini'))) return genChat(`${base}/v1/chat/completions`, key, v.model, text, signal, refs);
    if (type === 'gemini') return genGemini(base || 'https://generativelanguage.googleapis.com', key, v.model, text, signal, refs);
    if (type === 'openai') {
        // обычный OpenAI-совместимый адрес: сначала images/generations, если сервис его не знает — чат с картинками
        try { return await genImages(`${base}/v1/images/generations`, key, v.model, text, signal); } catch (e) {
            if (!/ответил 40[45]/.test(String(e.message))) throw e;
            return genChat(`${base}/v1/chat/completions`, key, v.model, text, signal);
        }
    }
    throw new Error(`тип подключения «${v.apiType}» в этом расширении дневник пока не умеет — выбери там другое подключение`);
}

// Сохранить в таверну, чтобы картинка не жила в памяти чата
async function upload(ctx, b64, mime) {
    const ext = /jpe?g/.test(mime) ? 'jpg' : (/webp/.test(mime) ? 'webp' : 'png');
    const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: ctx.getRequestHeaders ? ctx.getRequestHeaders() : json(),
        body: JSON.stringify({ image: b64, format: ext, ch_name: 'inner-world-memes', filename: `meme_${Date.now().toString(36)}` }),
    });
    if (!res.ok) throw new Error(`таверна не сохранила картинку: ${await readError(res)}`);
    const j = await res.json();
    if (!j || !j.path) throw new Error('таверна не вернула путь к картинке');
    return j.path;
}

// Картинка по описанию. Возвращает путь (или адрес), который можно поставить в <img src>.
export async function generateImage(prompt, cfg, ctx, signal) {
    const v = cfg && cfg.kind === 'ext' ? ((ctx && ctx.extensionSettings) || {})[cfg.extKey] : null;
    const keys = v ? [v.apiKey, v.novelaiApiKey] : [];
    let out;
    try {
        if (!v) throw new Error('источник картинок не выбран');
        out = await genExt(prompt, cfg, ctx, signal);
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
