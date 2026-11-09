// Чистая логика «Внутреннего мира»: состояние, разбор ответа модели, сравнение, тексты.
// Здесь нет обращений к таверне, поэтому файл можно проверять тестами в node.

export const MODULES = ['mood', 'wants', 'fears', 'dream', 'traits', 'impression', 'chronicle'];
// Блоки, которые спрашивают у модели (хроника собирается сама и токенов не тратит).
export const MODEL_MODULES = ['mood', 'wants', 'fears', 'dream', 'traits', 'impression'];

export const MODULE_NAMES = {
    mood: 'Настроение',
    wants: 'Желания',
    fears: 'Страхи',
    dream: 'Мечта жизни',
    traits: 'Черты',
    impression: 'Отношение к тебе',
    chronicle: 'Хроника',
};

export const DEFAULT_SETTINGS = {
    enabled: true,
    modules: { mood: true, wants: true, fears: true, dream: true, traits: true, impression: true, chronicle: true },
    theme: 'diary',
    track: 'scene',          // scene | bot | list
    trackList: '',
    every: 1,                // 0 = только по кнопке, 1 = после каждого ответа, 3 = раз в 3 ответа
    source: 'main',          // main — та же модель, что в чате; custom — отдельное подключение
    apiKind: 'profile',      // profile — профиль таверны; openrouter; openai — свой адрес (OpenAI-совместимый); gemini
    profileId: '',
    apiEndpoint: '',
    apiKey: '',
    apiModel: '',
    apiModels: [],
    contextMessages: 6,
    responseLength: 1500,
    maxChars: 12,
    language: 'русском',
    inject: true,
    injectDepth: 4,
    toasts: true,
    fab: true,
    fabPos: null,
    moodMode: 'auto',        // auto — длительность решает модель в рамках; manual — как задано ниже
    moodTurns: { light: 2, medium: 4, deep: 12 },
    moodInfluence: 'medium', // none | strong | medium | all — какие эмоции передавать основной модели
    onlyPresent: true,       // анализировать только тех, кто есть в последних сообщениях
    catchUpMessages: 12,     // сколько последних сообщений читать при первом заполнении старого чата
    showNpc: true,           // вести и показывать НПС, а не только главного персонажа
    rosters: {},             // список НПС из лорбука и карточки — по персонажу (аватарке)
};

const WANT_STATUS = ['active', 'done', 'dropped'];
const FEAR_STATUS = ['active', 'realized', 'gone'];
const TRAIT_KINDS = ['base', 'up', 'new', 'down'];
const TONES = ['good', 'bad', 'mid'];
const WEIGHTS = ['light', 'medium', 'deep'];

// Сколько ответов живёт эмоция в зависимости от силы: [минимум, по умолчанию, максимум].
export const WEIGHT_TURNS = {
    light: [1, 2, 2],
    medium: [2, 4, 6],
    deep: [6, 12, 25],
};

const MAX_MOODLETS = 5;
const MAX_TRAITS = 8;
const TRAIT_COOLDOWN = 3; // столько обновлений после изменения характера новые изменения не принимаются

export function mergeSettings(saved) {
    const s = Object.assign({}, DEFAULT_SETTINGS, saved || {});
    s.modules = Object.assign({}, DEFAULT_SETTINGS.modules, (saved && saved.modules) || {});
    s.moodTurns = Object.assign({}, DEFAULT_SETTINGS.moodTurns, (saved && saved.moodTurns) || {});
    s.rosters = Object.assign({}, (saved && saved.rosters) || {});
    if (s.theme === 'auto') s.theme = 'diary';
    if (Number(s.maxChars) === 4) s.maxChars = 12; // старое значение по умолчанию: с НПС мало
    if (s.source === 'profile') { s.source = 'custom'; s.apiKind = 'profile'; }
    if (!['русском', 'английском'].includes(s.language)) s.language = 'русском';
    if (!Array.isArray(s.apiModels)) s.apiModels = [];
    delete s.badges;
    return s;
}

export function emptyState() {
    return { characters: {}, order: [] };
}

function str(v, max = 200) {
    if (v === undefined || v === null) return '';
    return String(v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function num(v, min, max, def) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, Math.round(n)));
}

function oneOf(v, list, def) {
    const s = String(v || '').toLowerCase().trim();
    return list.includes(s) ? s : def;
}

export function normText(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function sameName(a, b) {
    return normText(a) === normText(b);
}

// «Усталость.» → «усталость»: эмоции и настроение пишутся со строчной и без точки в конце.
export function lowerWord(s, max = 40) {
    let t = str(s, max).replace(/[.!…,;:]+$/u, '').trim();
    if (t && t[0] !== t[0].toLowerCase() && !(t[1] && t[1] !== t[1].toLowerCase())) {
        t = t[0].toLowerCase() + t.slice(1);
    }
    return t;
}

// manual — объект {light, medium, deep} из настроек: тогда срок задан жёстко.
export function moodletTurns(weight, turns, manual) {
    if (manual && manual[weight] !== undefined) return num(manual[weight], 1, 99, WEIGHT_TURNS[weight][1]);
    const [min, def, max] = WEIGHT_TURNS[weight] || WEIGHT_TURNS.medium;
    return num(turns, min, max, def);
}

// Приводит одного персонажа из ответа модели к ровному виду.
export function cleanCharacter(raw, opts = {}) {
    if (!raw || typeof raw !== 'object') return null;
    const name = str(raw.name, 60);
    if (!name) return null;
    const c = { name, g: oneOf(raw.g, ['m', 'f', 'n'], 'n') };
    if (raw.who) c.who = str(raw.who, 160);

    if (raw.mood !== undefined) c.mood = lowerWord(typeof raw.mood === 'object' ? raw.mood.label : raw.mood);
    if (Array.isArray(raw.moodlets)) {
        c.moodlets = raw.moodlets.map(m => {
            const weight = oneOf(m && (m.weight || m.power), WEIGHTS, 'medium');
            return {
                emotion: lowerWord(m && (m.emotion || m.name)),
                why: str(m && m.why, 160),
                weight,
                tone: oneOf(m && m.tone, TONES, 'mid'),
                left: moodletTurns(weight, m && (m.turns ?? m.duration), opts.manualTurns),
            };
        }).filter(m => m.emotion).slice(0, MAX_MOODLETS);
    }
    if (Array.isArray(raw.ended)) {
        c.ended = raw.ended.map(e => normText(typeof e === 'object' && e ? e.emotion || e.name : e)).filter(Boolean);
    }
    if (Array.isArray(raw.wants)) {
        c.wants = raw.wants.map(w => ({
            text: str(w && w.text, 160),
            status: oneOf(w && w.status, WANT_STATUS, 'active'),
        })).filter(w => w.text).slice(0, 6);
    }
    if (Array.isArray(raw.fears)) {
        c.fears = raw.fears.map(f => ({
            text: str(f && f.text, 160),
            level: lowerWord(f && f.level, 30),
            strength: num(f && f.strength, 1, 3, 1),
            status: oneOf(f && f.status, FEAR_STATUS, 'active'),
        })).filter(f => f.text).slice(0, 6);
    }
    if (raw.dream && typeof raw.dream === 'object') {
        const steps = Array.isArray(raw.dream.steps) ? raw.dream.steps : [];
        c.dream = {
            title: str(raw.dream.title, 120),
            steps: steps.map(s => typeof s === 'string'
                ? { text: str(s, 120), done: false }
                : { text: str(s && s.text, 120), done: !!(s && s.done) }).filter(s => s.text).slice(0, 7),
        };
        if (!c.dream.title) delete c.dream;
    }
    if (Array.isArray(raw.traits)) {
        c.traits = raw.traits.map(t => ({
            name: str(t && (t.name || t.text), 40),
            why: str(t && t.why, 140),
            kind: oneOf(t && t.kind, TRAIT_KINDS, 'base'),
        })).filter(t => t.name).slice(0, MAX_TRAITS);
    }
    if (raw.impression && typeof raw.impression === 'object' && str(raw.impression.label)) {
        c.impression = {
            label: lowerWord(raw.impression.label, 40),
            score: num(raw.impression.score, -3, 3, 0),
            why: str(raw.impression.why, 200),
            now: str(raw.impression.now, 200),
            nowScore: num(raw.impression.now_score ?? raw.impression.nowScore, -3, 3, undefined),
        };
    }
    return c;
}

// Достаёт JSON из ответа модели: убирает размышления, ```json, текст до и после.
export function extractJson(text) {
    if (text && typeof text === 'object') return text;
    let t = String(text || '');
    t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1];
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('В ответе модели нет JSON');
    let body = t.slice(start, end + 1);
    try {
        return JSON.parse(body);
    } catch (e) {
        body = body
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/[“”«»]/g, '"')
            .replace(/\/\/[^\n"]*\n/g, '\n');
        return JSON.parse(body);
    }
}

export function parseAnalysis(text, opts = {}) {
    const data = extractJson(text);
    const list = Array.isArray(data) ? data : (data.characters || data.chars || []);
    if (!Array.isArray(list)) throw new Error('В ответе нет списка персонажей');
    return list.map(c => cleanCharacter(c, opts)).filter(Boolean);
}

// Упоминается ли персонаж в тексте: по любому слову имени длиннее двух букв, с учётом падежей.
export function mentioned(name, text) {
    return mentionedIn(name, prepText(text));
}

// Текст, подготовленный для многих проверок подряд (вся история чата).
export function prepText(text) {
    return ' ' + normText(text) + ' ';
}

export function mentionedIn(name, prepared) {
    const words = normText(name).split(' ').filter(w => w.length >= 3);
    return words.some(w => {
        const stem = w.length > 4 ? w.slice(0, w.length - 2) : (w.length === 4 ? w.slice(0, 3) : w);
        return prepared.includes(' ' + stem);
    });
}

const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'u', я: 'a' };

// Грубый «скелет» слова, одинаковый для кириллицы и латиницы: «Дамиан» и «Damian» → «ksn».
export function nameSkeleton(word) {
    let w = normText(word).split('').map(ch => TRANSLIT[ch] ?? ch).join('');
    w = w.replace(/ph/g, 'f').replace(/[cq]/g, 'k').replace(/w/g, 'v').replace(/x/g, 'ks').replace(/[yj]/g, 'i').replace(/kh/g, 'h');
    w = w.replace(/(.)\1+/g, '$1');
    return w[0] + w.slice(1).replace(/[aeiou]/g, '');
}

// Одно ли это имя, если одно написано кириллицей, а другое латиницей. Нужны совпадения всех слов короткого имени.
export function namesLookAlike(a, b) {
    const wa = normText(a).split(' ').filter(w => w.length >= 3);
    const wb = normText(b).split(' ').filter(w => w.length >= 3);
    if (!wa.length || !wb.length) return false;
    const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    return short.every(x => long.some(y => {
        const sx = nameSkeleton(x);
        const sy = nameSkeleton(y);
        return sx.length >= 2 && sx === sy;
    }));
}

function findByText(list, text) {
    const key = normText(text);
    return (list || []).find(x => normText(x.text) === key);
}

function findTrait(list, name) {
    const key = normText(name);
    return (list || []).find(t => normText(t.name) === key);
}

// Эмоции угасают сами: за каждый ответ бота с прошлого обновления — минус один ход.
export function decayState(state, elapsed) {
    const next = JSON.parse(JSON.stringify(state || emptyState()));
    const n = Math.max(0, Number(elapsed) || 0);
    if (!n) return next;
    for (const c of Object.values(next.characters || {})) {
        if (!Array.isArray(c.moodlets)) continue;
        c.moodlets = c.moodlets
            .map(m => Object.assign({}, m, { left: (m.left ?? m.turns ?? 1) - n }))
            .filter(m => m.left > 0);
    }
    return next;
}

const WEIGHT_RANK = { light: 1, medium: 2, deep: 3 };

// Новые эмоции добавляются к тем, что ещё не прошли; одинаковые — освежаются, а не дублируются.
export function mergeMoodlets(oldList, freshList, ended) {
    const endedKeys = new Set(ended || []);
    const list = (oldList || [])
        .filter(m => !endedKeys.has(normText(m.emotion)))
        .map(m => Object.assign({}, m));
    for (const m of freshList || []) {
        const prev = list.find(x => normText(x.emotion) === normText(m.emotion));
        if (prev) {
            prev.why = m.why || prev.why;
            prev.tone = m.tone;
            if (WEIGHT_RANK[m.weight] > WEIGHT_RANK[prev.weight || 'medium']) prev.weight = m.weight;
            prev.left = Math.max(prev.left || 0, m.left);
        } else {
            list.push(Object.assign({}, m));
        }
    }
    list.sort((a, b) => (WEIGHT_RANK[b.weight] - WEIGHT_RANK[a.weight]) || (b.left - a.left));
    return list.slice(0, MAX_MOODLETS);
}

// Черты: при знакомстве все исходные; потом не больше одного изменения за раз,
// только с причиной и не чаще, чем раз в несколько обновлений. Черты не пропадают сами.
export function mergeTraits(old, fresh, cycle) {
    const freshTraits = fresh.traits || [];
    if (!old || !Array.isArray(old.traits) || !old.traits.length) {
        return { traits: freshTraits.map(t => Object.assign({}, t, { kind: 'base' })), changedAt: old ? old.traitChangedAt : undefined };
    }
    const traits = old.traits.map(t => Object.assign({}, t));
    const cooling = old.traitChangedAt !== undefined && cycle - old.traitChangedAt < TRAIT_COOLDOWN;
    let changedAt = old.traitChangedAt;
    if (cooling) return { traits, changedAt };
    for (const t of freshTraits) {
        const prev = findTrait(traits, t.name);
        if (prev) {
            if (t.kind === prev.kind || t.kind === 'base' || !t.why) continue;
            if (t.kind === 'new' && prev.kind !== 'new') continue; // старую черту нельзя сделать «новой»
            prev.kind = t.kind;
            prev.why = t.why;
            changedAt = cycle;
            break;
        }
        if (!t.why || traits.length >= MAX_TRAITS) continue;
        traits.push({ name: t.name, why: t.why, kind: 'new' });
        changedAt = cycle;
        break;
    }
    return { traits, changedAt };
}

// Сливает старое состояние персонажа с новым ответом модели.
export function mergeCharacter(old, fresh, modules) {
    const out = old ? JSON.parse(JSON.stringify(old)) : { name: fresh.name };
    out.name = old ? old.name : fresh.name;
    if (fresh.g && fresh.g !== 'n') out.g = fresh.g;
    if (!out.who && fresh.who) out.who = fresh.who;
    if (!out.g) out.g = 'n';
    out.cycle = (old && old.cycle ? old.cycle : 0) + 1;

    if (modules.mood) {
        if (fresh.mood) out.mood = fresh.mood;
        if (fresh.moodlets || fresh.ended) out.moodlets = mergeMoodlets(old && old.moodlets, fresh.moodlets, fresh.ended);
    }
    if (modules.wants && fresh.wants) {
        out.wants = fresh.wants.filter(w => {
            if (w.status === 'active') return true;
            const prev = findByText(old && old.wants, w.text);
            return !prev || prev.status === 'active';
        });
    }
    if (modules.fears && fresh.fears) {
        out.fears = fresh.fears.filter(f => {
            if (f.status === 'active') return true;
            const prev = findByText(old && old.fears, f.text);
            return !prev || prev.status === 'active';
        });
    }
    if (modules.dream && fresh.dream) {
        if (old && old.dream && old.dream.title) {
            const steps = old.dream.steps.map(s => {
                const n = findByText(fresh.dream.steps, s.text);
                return { text: s.text, done: s.done || !!(n && n.done) };
            });
            for (const s of fresh.dream.steps) {
                if (!findByText(steps, s.text) && steps.length < 7) steps.push(s);
            }
            out.dream = { title: old.dream.title, steps };
        } else {
            out.dream = fresh.dream;
        }
    }
    if (modules.traits && fresh.traits) {
        const r = mergeTraits(old, fresh, out.cycle);
        out.traits = r.traits;
        if (r.changedAt !== undefined) out.traitChangedAt = r.changedAt;
    }
    if (modules.impression) {
        if (old && old.impression) {
            if (fresh.impression) {
                if (fresh.impression.now) out.impression.now = fresh.impression.now;
                const last = out.attitude && out.attitude.length ? out.attitude[out.attitude.length - 1].s : out.impression.score;
                const next = fresh.impression.nowScore ?? last;
                out.impression.nowScore = next;
                if (next !== last) {
                    out.attitude = (out.attitude || [{ s: out.impression.score, c: 1 }]).concat([{ s: next, c: out.cycle }]).slice(-16);
                }
            }
        } else if (fresh.impression) {
            out.impression = Object.assign({}, fresh.impression, { nowScore: fresh.impression.score });
            out.attitude = [{ s: fresh.impression.score, c: out.cycle }];
        }
    }
    return out;
}

// Применяет ответ модели к состоянию (которое уже «состарено» decayState).
// Возвращает новое состояние и список событий для всплывашек.
export function applyAnalysis(state, freshList, modules, opts = {}) {
    const next = JSON.parse(JSON.stringify(state || emptyState()));
    if (!next.characters) next.characters = {};
    if (!Array.isArray(next.order)) next.order = Object.keys(next.characters);
    const events = [];
    const maxChars = opts.maxChars || 4;
    const userName = opts.userName || '';

    for (const fresh of freshList) {
        if (userName && sameName(fresh.name, userName)) continue;
        const key = Object.keys(next.characters).find(k => sameName(k, fresh.name)) || fresh.name;
        const old = next.characters[key];
        if (!old && next.order.length >= maxChars) continue;
        const merged = mergeCharacter(old, fresh, modules);
        const evs = diffCharacter(old, merged, modules);
        if (evs.length) {
            const entries = evs.map(e => ({ type: e.type, text: eventText(e), m: opts.mesId ?? null }));
            merged.log = entries.reverse().concat(merged.log || []).slice(0, 40);
        }
        events.push(...evs);
        next.characters[key] = merged;
        if (!next.order.includes(key)) next.order.push(key);
    }
    next.order = next.order.filter(k => next.characters[k]);
    return { state: next, events };
}

export function diffCharacter(old, now, modules) {
    const ev = [];
    const who = now.name;
    if (modules.wants) {
        for (const w of now.wants || []) {
            const prev = findByText(old && old.wants, w.text);
            if (w.status === 'done' && (!prev || prev.status === 'active')) ev.push({ type: 'want_done', who, text: w.text });
        }
    }
    if (modules.fears) {
        for (const f of now.fears || []) {
            const prev = findByText(old && old.fears, f.text);
            if (f.status === 'realized' && (!prev || prev.status === 'active')) ev.push({ type: 'fear_real', who, text: f.text });
            if (f.status === 'gone' && prev && prev.status === 'active') ev.push({ type: 'fear_gone', who, text: f.text });
        }
    }
    if (modules.traits && old && old.traits && old.traits.length) {
        for (const t of now.traits || []) {
            const prev = findTrait(old.traits, t.name);
            if (!prev && t.kind === 'new') ev.push({ type: 'trait_new', who, text: t.name, why: t.why });
            else if (prev && prev.kind !== t.kind && t.kind === 'up') ev.push({ type: 'trait_up', who, text: t.name, why: t.why });
            else if (prev && prev.kind !== t.kind && t.kind === 'down') ev.push({ type: 'trait_down', who, text: t.name, why: t.why });
        }
    }
    if (modules.dream && now.dream) {
        const before = old && old.dream ? old.dream.steps : [];
        for (const s of now.dream.steps) {
            const prev = findByText(before, s.text);
            if (s.done && prev && !prev.done) ev.push({ type: 'dream_step', who, text: s.text, dream: now.dream.title });
        }
        const all = now.dream.steps.length > 0 && now.dream.steps.every(s => s.done);
        const wasAll = old && old.dream && old.dream.steps.length > 0 && old.dream.steps.every(s => s.done);
        if (all && !wasAll && old && old.dream) ev.push({ type: 'dream_done', who, text: now.dream.title });
    }
    if (modules.impression && now.impression && !(old && old.impression)) {
        ev.push({ type: 'impression', who, text: now.impression.label, why: now.impression.why, score: now.impression.score });
    }
    if (modules.impression && now.impression && old && old.impression) {
        const was = old.impression.nowScore ?? old.impression.score;
        const is = now.impression.nowScore ?? was;
        const flipped = (was > 0 && is < 0) || (was < 0 && is > 0);
        if (Math.abs(is - was) >= 2 || flipped) ev.push({ type: 'attitude', who, text: now.impression.now, from: was, to: is });
    }
    return ev;
}

export function signed(n) {
    return n > 0 ? `+${n}` : String(n);
}

export function eventTitle(ev) {
    return {
        want_done: 'Желание исполнено',
        fear_real: 'Страх сбылся',
        fear_gone: 'Страх отступил',
        trait_new: 'Новая черта',
        trait_up: 'Черта усилилась',
        trait_down: 'Черта слабеет',
        dream_step: 'Шаг к мечте',
        dream_done: 'Мечта сбылась',
        impression: 'Первое впечатление',
        attitude: 'Отношение изменилось',
    }[ev.type] || 'Внутренний мир';
}

export function eventText(ev) {
    switch (ev.type) {
        case 'want_done': return `«${ev.text}» — сбылось!`;
        case 'fear_real': return `«${ev.text}»`;
        case 'fear_gone': return `Больше не боится: «${ev.text}»`;
        case 'trait_new':
        case 'trait_up':
        case 'trait_down': return `${ev.text}${ev.why ? ` — ${ev.why}` : ''}`;
        case 'dream_step': return `${ev.text} — выполнено`;
        case 'dream_done': return `«${ev.text}»`;
        case 'impression': return `${ev.text} (${signed(ev.score)})${ev.why ? ` — ${ev.why}` : ''}`;
        case 'attitude': return `${signed(ev.from)} → ${signed(ev.to)}${ev.text ? `: ${ev.text}` : ''}`;
        default: return ev.text || '';
    }
}

// Шаблон ответа для модели: только включённые блоки, чтобы не тратить токены.
export function responseTemplate(modules, manualTurns) {
    const c = { name: 'Имя', g: 'm|f', who: 'кто это (только для нового персонажа)' };
    if (modules.mood) {
        c.mood = 'встревожен';
        const ml = { emotion: 'досада', why: 'из-за чего, по событиям', weight: 'light|medium|deep', tone: 'good|bad|mid' };
        if (!manualTurns) ml.turns = 2;
        c.moodlets = [ml];
        c.ended = ['эмоция, которую события сняли'];
    }
    if (modules.wants) c.wants = [{ text: 'чего хочет', status: 'active|done|dropped' }];
    if (modules.fears) c.fears = [{ text: 'чего боится', level: 'тревожит|пугает|в ужасе', strength: 2, status: 'active|realized|gone' }];
    if (modules.dream) c.dream = { title: 'мечта жизни', steps: [{ text: 'этап', done: false }] };
    if (modules.traits) c.traits = [{ name: 'черта', why: 'событие, после которого изменилась', kind: 'base|up|new|down' }];
    if (modules.impression) c.impression = { label: '1–2 слова', score: 1, why: 'почему так', now: 'что думает сейчас', now_score: 1 };
    return JSON.stringify({ characters: [c] });
}

export function buildSystemPrompt(settings, ctx) {
    const m = settings.modules;
    const lang = settings.language || 'русском';
    const user = ctx.userName || 'игрок';
    let who;
    if (settings.showNpc === false) who = `только главный персонаж: ${(ctx.mainNames && ctx.mainNames.length ? ctx.mainNames : [ctx.botName]).join(', ')}`;
    else if (settings.track === 'bot') who = `только ${ctx.botName}`;
    else if (settings.track === 'list') who = `только эти персонажи, если они есть в сцене: ${ctx.trackNames.join(', ')}`;
    else who = `все значимые персонажи, которые есть в последней сцене (не больше ${settings.maxChars})`;

    const rules = [
        'Ты ведёшь «внутренний мир» персонажей ролевой истории, как в симуляторе жизни. По последним сообщениям обнови их состояние.',
        `Отвечай ТОЛЬКО JSON, без пояснений и без markdown. Все тексты — на ${lang} языке, коротко.`,
        `Кого вести: ${who}. ${user} — это игрок: его внутренний мир не веди и в список не включай.`,
        'Если у персонажа уже есть пункты, повторяй их текст дословно, пока они не изменились. Ничего не выдумывай сверх того, что следует из текста и карточки.',
        'who — только для персонажа, которого ещё нет в текущем состоянии: кто это одной строкой (роль, связь с героями). У известных персонажей who не пиши.',
    ];
    if (ctx.catchUp && ctx.catchUp.length) {
        rules.push(`Это первое заполнение дневника для уже идущей истории. Восстанови состояние по всему, что видно в сообщениях и эпизодах из прошлого. Обязательно верни этих персонажей, если они лично появлялись в истории (а не только упоминались в разговоре): ${ctx.catchUp.join(', ')}. impression — каким было первое впечатление об игроке при знакомстве, now и now_score — каким отношение стало к последней сцене. Желания и страхи — актуальные на конец. moodlets — только эмоции, которые ещё должны действовать сейчас.`);
    }
    if (ctx.knownNames && ctx.knownNames.length) {
        rules.push(`Известные персонажи этого мира: ${ctx.knownNames.join(', ')}. Если кто-то из них есть в сцене — называй его ровно так. Добавляй персонажа, только если он действительно присутствует или действует в последних сообщениях, а не просто упомянут.`);
    }
    if (m.mood) {
        rules.push('mood — общее состояние одним-двумя словами так, чтобы оно продолжало фразу «Сейчас он…» / «Сейчас она…»: краткое прилагательное или причастие в роде персонажа, со строчной буквы («встревожен», «весела», «не в духе», «сосредоточена»). Не существительное и не полная форма («замотанный» — нельзя, «вымотан» — можно).');
        const manual = settings.moodMode === 'manual';
        rules.push('moodlets — эмоции, которые ВЫЗВАЛИ ИЛИ УСИЛИЛИ последние события. Старые эмоции из текущего состояния не повторяй: они угасают сами. emotion — существительное со строчной буквы («усталость», «досада», «нежность»). weight — сила: light — слабая бытовая (раздражение, скука, смущение, лёгкая досада), medium — заметная (обида, тревога, радость от события), deep — сильная и долгая (горе, потрясение, влюблённость, страх после угрозы жизни). Обычные мелочи — только light, deep — только после серьёзных событий.'
            + (manual ? '' : ' turns — сколько ответов продержится, по силе и по контексту: light 1–2, medium 3–6, deep 6–25.')
            + ' Если исполнилось желание — добавь приятную эмоцию, если сбылся страх — сильную неприятную. ended — эмоции из текущего состояния, которые события сняли (обида прошла после извинений и т. п.).');
    }
    if (m.wants) rules.push('wants — до 3 текущих желаний, конкретных, связанных с сюжетом, характером и мечтой. Исполнившееся помечай status "done", неактуальное — "dropped", вместо них можно добавить новые.');
    if (m.fears) rules.push('fears — до 3 страхов; strength 1–3; level — одно слово. Сбывшийся страх помечай "realized", преодолённый — "gone".');
    if (m.dream) rules.push('dream — одна большая жизненная цель с 3–5 этапами. Если мечта уже есть — не меняй название, отмечай выполненные этапы (done: true), можно добавить этап.');
    if (m.traits) rules.push('traits — 3–6 черт характера. Если персонаж новый — только kind "base". Характер меняется ТОЛЬКО после по-настоящему значимого события: предательство, потеря, спасение жизни, признание, тяжёлый выбор, крупная победа или провал. В обычной сцене верни черты без изменений. Не больше одного изменения за раз: new — появилась, up — усилилась, down — слабеет; в why — какое именно событие.');
    if (m.impression) rules.push(`impression — первое впечатление персонажа об игроке (${user}) при знакомстве: label, score от -3 до 3, why. Если впечатление уже есть — label, score и why не меняй, обновляй только now (что думает об игроке теперь) и now_score (от -3 до 3; меняй постепенно, резко — только после серьёзного поступка).`);
    rules.push('Если в [Текущем состоянии] указано, что персонажей нет в сцене, — их не возвращай.');
    rules.push(`Формат ответа: ${responseTemplate(m, settings.moodMode === 'manual')}`);
    return rules.join('\n');
}

export function buildUserPrompt(ctx, state, modules, onlyKeys) {
    const parts = [];
    if (ctx.card) parts.push(`[Карточка: ${ctx.botName}]\n${ctx.card}`);
    if (ctx.persona) parts.push(`[Игрок: ${ctx.userName}]\n${ctx.persona}`);
    if (ctx.history && ctx.history.length) {
        parts.push(`[Раньше в истории — эпизоды с персонажами, которых ещё нет в дневнике]\n${ctx.history.join('\n\n')}`);
    }
    if (ctx.lore && ctx.lore.length) {
        parts.push(`[Из лорбука: эти персонажи впервые появились в сцене — опирайся на описание, черты бери отсюда]\n${ctx.lore.join('\n')}`);
    }
    const current = compactState(state, modules, onlyKeys);
    const absent = onlyKeys ? (state.order || []).filter(k => !onlyKeys.includes(k)) : [];
    parts.push(`[Текущее состояние]\n${current || 'пока пусто — составь с нуля'}${absent.length ? `\nНет в сцене (не возвращай): ${absent.join(', ')}` : ''}`);
    parts.push(`[Последние сообщения]\n${ctx.messages.join('\n\n')}`);
    parts.push('Верни обновлённый JSON.');
    return parts.join('\n\n');
}

export function compactState(state, modules, onlyKeys) {
    if (!state || !state.order || !state.order.length) return '';
    const keys = onlyKeys ? state.order.filter(k => onlyKeys.includes(k)) : state.order;
    if (!keys.length) return '';
    const list = keys.map(k => {
        const c = state.characters[k];
        const o = { name: c.name, g: c.g };
        if (modules.mood) {
            o.mood = c.mood;
            o.moodlets_now = (c.moodlets || []).map(m => ({ emotion: m.emotion, why: m.why, weight: m.weight, left: m.left }));
        }
        if (modules.wants) o.wants = (c.wants || []).filter(w => w.status === 'active');
        if (modules.fears) o.fears = (c.fears || []).filter(f => f.status === 'active');
        if (modules.dream) o.dream = c.dream;
        if (modules.traits) o.traits = c.traits;
        if (modules.impression && c.impression) o.impression = { label: c.impression.label, score: c.impression.score, now: c.impression.now, now_score: c.impression.nowScore };
        return o;
    });
    return JSON.stringify({ characters: list });
}

// Подсказка для основной модели: что сейчас внутри у персонажей.
// Мимолётные эмоции не передаём — они не должны заметно влиять на поведение.
const INFLUENCE_MIN = { all: 1, medium: 2, strong: 3, none: 99 };

export function buildInjection(state, modules, userName, influence = 'medium') {
    const minRank = INFLUENCE_MIN[influence] ?? 2;
    if (!state || !state.order || !state.order.length) return '';
    const lines = [];
    for (const key of state.order) {
        const c = state.characters[key];
        if (!c) continue;
        const bits = [];
        if (modules.mood && c.mood) {
            const ml = (c.moodlets || []).filter(m => (WEIGHT_RANK[m.weight] || 2) >= minRank)
                .map(m => `${m.emotion}${m.weight === 'deep' ? ' (сильно)' : ''}${m.why ? ` — ${m.why}` : ''}`).join('; ');
            bits.push(`сейчас ${c.mood}${ml ? `; на душе: ${ml}` : ''}`);
        }
        if (modules.wants) {
            const w = (c.wants || []).filter(x => x.status === 'active').map(x => x.text);
            if (w.length) bits.push(`хочет: ${w.join('; ')}`);
        }
        if (modules.fears) {
            const f = (c.fears || []).filter(x => x.status === 'active').map(x => x.text);
            if (f.length) bits.push(`боится: ${f.join('; ')}`);
        }
        if (modules.dream && c.dream) {
            const next = c.dream.steps.find(s => !s.done);
            bits.push(`мечта: ${c.dream.title}${next ? ` (следующий шаг: ${next.text})` : ''}`);
        }
        if (modules.traits && c.traits && c.traits.length) {
            bits.push(`черты: ${c.traits.filter(t => t.kind !== 'down').map(t => t.name).join(', ')}`);
        }
        if (modules.impression && c.impression) {
            bits.push(`отношение к игроку${userName ? ` (${userName})` : ''}: ${signed(c.impression.nowScore ?? c.impression.score)} из 3 — ${c.impression.now || c.impression.label}`);
        }
        if (bits.length) lines.push(`${c.name}: ${bits.join('. ')}.`);
    }
    if (!lines.length) return '';
    return `[Внутренний мир персонажей. Пусть это влияет на их поведение и реплики, но не пересказывай это напрямую.]\n${lines.join('\n')}`;
}

export function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
}

export function moodletLeftLabel(m) {
    const left = m.left ?? m.turns ?? 1;
    if (left <= 1) return 'пройдёт после следующего ответа';
    return `ещё ${left} ${plural(left, 'ответ', 'ответа', 'ответов')}`;
}

export const WEIGHT_NAMES = { light: 'слабая', medium: 'средняя', deep: 'сильная' };

// Чистит текст сообщения для анализа: без картинок, html и служебных блоков.
export function cleanMessageText(text, max = 1500) {
    let t = String(text || '');
    t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, ' ');
    t = t.replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ');
    t = t.replace(/<img[^>]*>/gi, ' ');
    t = t.replace(/<[^>]+>/g, ' ');
    t = t.replace(/```[\s\S]*?```/g, ' ');
    t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (t.length > max) t = t.slice(0, Math.floor(max * 0.35)) + ' … ' + t.slice(-Math.floor(max * 0.6));
    return t;
}

// ---------- НПС из лорбука и карточки ----------

export function emptyRoster() {
    return { main: [], npc: [], at: 0 };
}

// Разбор ответа модели со списком персонажей мира.
export function parseRoster(text, userName = '') {
    const data = extractJson(text);
    const main = (Array.isArray(data.main) ? data.main : [data.main]).map(x => str(x, 60)).filter(Boolean).slice(0, 6);
    const seen = new Set();
    const npc = [];
    for (const raw of Array.isArray(data.npc) ? data.npc : []) {
        if (!raw || typeof raw !== 'object') continue;
        const name = str(raw.name, 60);
        if (!name || seen.has(normText(name))) continue;
        if (userName && sameName(name, userName)) continue;
        if (main.some(m => sameName(m, name))) continue;
        seen.add(normText(name));
        npc.push({
            name,
            aliases: (Array.isArray(raw.aliases) ? raw.aliases : []).map(a => str(a, 40)).filter(a => a && !sameName(a, name)).slice(0, 6),
            g: oneOf(raw.g, ['m', 'f', 'n'], 'n'),
            who: str(raw.who, 160),
            traits: (Array.isArray(raw.traits) ? raw.traits : []).map(t => lowerWord(t, 30)).filter(Boolean).slice(0, 5),
        });
        if (npc.length >= 40) break;
    }
    return { main, npc };
}

// Одно и то же ли имя с учётом падежей и полноты: «Соколов» = «Иван Соколов», но «Ирина Соколова» ≠ «Иван Соколов».
export function namesMatch(a, b) {
    if (sameName(a, b)) return true;
    const wa = normText(a).split(' ').filter(w => w.length >= 3);
    const wb = normText(b).split(' ').filter(w => w.length >= 3);
    if (!wa.length || !wb.length) return false;
    const same = (x, y) => mentioned(x, y) && mentioned(y, x);
    if (wa.length === 1 || wb.length === 1) {
        const [one, many] = wa.length === 1 ? [wa[0], wb] : [wb[0], wa];
        return many.some(w => same(one, w));
    }
    const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    return short.every(x => long.some(y => same(x, y)));
}

export function rosterNames(entry) {
    return [entry.name, ...(entry.aliases || [])];
}

// Найти в списке НПС того, кого модель назвала (по имени или прозвищу).
export function rosterFind(roster, name) {
    if (!roster || !name) return null;
    return (roster.npc || []).find(e => rosterNames(e).some(n => sameName(n, name)))
        || (roster.npc || []).find(e => rosterNames(e).some(n => namesMatch(n, name)))
        || null;
}

export function rosterMentioned(entry, text) {
    return rosterNames(entry).some(n => mentioned(n, text));
}

export function isMain(name, mainNames) {
    return (mainNames || []).some(m => namesMatch(m, name) || namesLookAlike(m, name));
}

export function buildRosterPrompt(sources, userName, lang = 'русском') {
    const system = [
        'Ты помогаешь вести дневник персонажей ролевой истории. Прочитай карточку, описание игрока и лорбук и выпиши персонажей этого мира.',
        `Отвечай ТОЛЬКО JSON, без пояснений. Тексты — на ${lang} языке, коротко.`,
        `main — главный персонаж (или персонажи) карточки, от лица которых пишет бот. Игрока (${userName || 'игрок'}) не включай никуда.`,
        'npc — остальные люди и разумные существа, которые могут появиться в сцене: имя так, как его пишут в тексте; g — пол m/f; who — кто это одной строкой (роль и связь с героями); traits — 2–4 черты характера, если они описаны.',
        'aliases — ТОЛЬКО клички, прозвища и другие имена, которые прямо написаны в карточке или лорбуке. Не придумывай уменьшительные формы и не разбивай имя на части (фамилию отдельно не пиши). Если таких нет — пустой список.',
        'Не включай группы людей без имени («охрана», «соседи»), места, предметы и организации. Не больше 30 персонажей, самые важные — первыми.',
        'Формат: {"main":["Имя"],"npc":[{"name":"Имя","aliases":["прозвище"],"g":"m","who":"кто это","traits":["черта"]}]}',
    ].join('\n');
    const user = sources.map(src => `[${src.title}]\n${src.text}`).join('\n\n') + '\n\nВерни JSON.';
    return { system, user };
}

// Текст лорбука для разбора: включённые записи, по порядку, в пределах лимита.
export function loreText(entries, limit = 9000) {
    const list = Object.values(entries || {})
        .filter(e => e && !e.disable && String(e.content || '').trim())
        .sort((a, b) => (b.order ?? 100) - (a.order ?? 100));
    const out = [];
    let used = 0;
    for (const e of list) {
        const title = [e.comment, (e.key || []).slice(0, 4).join(', ')].filter(Boolean).join(' — ');
        const body = cleanMessageText(e.content, 900);
        const piece = `• ${title ? title + ': ' : ''}${body}`;
        if (used + piece.length > limit) break;
        out.push(piece);
        used += piece.length;
    }
    return out.join('\n');
}

// Примерный расход на «догоняющее» заполнение: сообщения + отрывки про НПС + инструкции + ответ.
export const CATCHUP_MSG_CHARS = 1200;
export const CATCHUP_EXCERPTS = 6;

export function catchUpTokens(messages) {
    const chars = Math.max(4, Number(messages) || 12) * CATCHUP_MSG_CHARS * 0.8 + CATCHUP_EXCERPTS * 550 + 4500;
    return Math.round(chars / 3.2 / 500) * 500 + 1500; // ~3,2 знака на токен для русского + ответ
}

// Оставляем только настоящие прозвища: те, что дословно есть в карточке или лорбуке,
// и не просто часть полного имени («Зайцев» у «Пети Зайцева» — не прозвище).
export function verifyAliases(roster, sourceText) {
    const prepared = prepText(sourceText);
    for (const e of roster.npc || []) {
        const parts = normText(e.name).split(' ');
        e.aliases = (e.aliases || []).filter(a => {
            const n = normText(a);
            if (!n || parts.includes(n) || n === normText(e.name)) return false;
            return prepared.includes(' ' + n + ' ');
        });
        e.aliasesChecked = true;
    }
    return roster;
}

// Что показывать в «ещё зовут»: только проверенные прозвища.
export function shownAliases(entry) {
    if (!entry || !entry.aliasesChecked) return [];
    const parts = normText(entry.name).split(' ');
    return (entry.aliases || []).filter(a => !parts.includes(normText(a)));
}

