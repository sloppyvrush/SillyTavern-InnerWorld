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
    sound: true,             // звуки при событиях
    points: true,            // очки за желания и мечту + награды
};

// Как выглядит лицо персонажа на вкладке: смайлик и цвет по настроению.
export const FACES = ['joy', 'calm', 'love', 'shy', 'sad', 'angry', 'fear', 'tired', 'focus', 'surprise', 'neutral'];
export const FACE_NAMES = {
    joy: 'радость', calm: 'спокойствие', love: 'нежность', shy: 'смущение', sad: 'грусть',
    angry: 'злость', fear: 'страх, тревога', tired: 'усталость', focus: 'сосредоточенность', surprise: 'удивление', neutral: 'ровно',
};

// Если модель не сказала, какое у эмоции лицо, угадываем по слову (порядок важен: «беспокойство» — не «спокойствие»).
const FACE_WORDS = [
    ['angry', ['зл', 'раздраж', 'гнев', 'ярост', 'бешен', 'ненавист', 'ревн', 'недовол', 'возмущ', 'досад', 'презр', 'отвращ', 'брезг', 'зол', 'злит', 'злоб', 'серд', 'рассерж', 'взбеш', 'раздосад']],
    ['fear', ['страх', 'боязн', 'тревог', 'напряж', 'испуг', 'паник', 'беспокой', 'опас', 'насторож', 'ужас', 'нервн', 'неуверен', 'волнен', 'волну', 'подозр', 'тревож', 'напуган', 'испуган', 'боит', 'опасает', 'дерган']],
    ['sad', ['груст', 'тоск', 'печал', 'вин', 'одинок', 'гор', 'сожал', 'обид', 'разочар', 'боль', 'отчаян', 'скорб', 'уныни', 'ностальг', 'расстро', 'подавлен', 'обиж', 'грущ', 'тоскл']],
    ['shy', ['смущ', 'стыд', 'неловк', 'стесн', 'робост', 'застенч']],
    ['tired', ['устал', 'измот', 'выгор', 'апат', 'скук', 'сонлив', 'опустош', 'безразлич', 'вял']],
    ['love', ['нежн', 'любов', 'любв', 'влюбл', 'привяз', 'страст', 'забот', 'умил', 'тепл', 'симпат', 'влечен', 'желани', 'нежен', 'очарован']],
    ['focus', ['сосредоточ', 'решим', 'решител', 'собран', 'целеустрем', 'упрям', 'деловит', 'настойчив', 'сосредот', 'концентр']],
    ['surprise', ['удивл', 'озадач', 'любопыт', 'изумл', 'растерян', 'шок', 'недоум', 'интерес', 'замешат']],
    ['calm', ['спокой', 'спокоен', 'умиротвор', 'облегч', 'уверен', 'безмятеж', 'расслаб', 'покой', 'смирен']],
    ['joy', ['рад', 'счаст', 'восторг', 'весел', 'гордост', 'довол', 'азарт', 'воодушев', 'предвкуш', 'ликов', 'торжеств', 'благодар', 'надежд', 'восхищ', 'удовлетвор']],
];

export function guessFace(word, tone) {
    const w = ' ' + String(word || '').toLowerCase().replace(/ё/g, 'е');
    for (const [face, stems] of FACE_WORDS) {
        // короткие корни — только с начала слова («рад» не должен ловить «отрада»), длинные — где угодно
        if (stems.some(st => (st.length >= 5 ? w.includes(st) : new RegExp('[^а-я]' + st).test(w)))) return face;
    }
    return tone === 'good' ? 'joy' : (tone === 'bad' ? 'sad' : 'neutral');
}

// Очки за события (как в симуляторе жизни).
export const POINTS = { want_done: 10, fear_gone: 5, dream_step: 25, dream_done: 100 };
export const REWARD_KINDS = ['buff', 'event', 'collect'];
export const REWARD_ICONS = ['gift', 'star', 'cake', 'ribbon', 'key', 'flower', 'potion', 'crown', 'note', 'book', 'sun', 'moon', 'heart', 'cup', 'letter', 'feather', 'shield', 'gem'];

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

const MAX_MOODLETS = 6;
const MAX_TRAITS = 8;
const TRAIT_COOLDOWN = 3; // столько обновлений после изменения характера новые изменения не принимаются
const DREAM_COOLDOWN = 6; // мечта меняется редко: не чаще, чем раз в столько обновлений
export const SHOWN_MOODLETS = 3; // столько эмоций видно сразу, остальные — под «ещё»

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
    delete s.track;
    delete s.trackList;
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

// Эмоция — это чувство, а не поступок: «нежность», «облегчение». Если модель вписала
// действие («укрыл её плащом…»), берём только первое слово-существительное не длиннее трёх слов.
export function emotionWord(s) {
    const t = lowerWord(s, 60);
    const words = t.split(' ');
    return words.length > 3 ? words.slice(0, 2).join(' ') : t;
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
    if (raw.face !== undefined) c.face = oneOf(raw.face, FACES, 'neutral');
    if (Array.isArray(raw.moodlets)) {
        c.moodlets = raw.moodlets.map(m => {
            const weight = oneOf(m && (m.weight || m.power), WEIGHTS, 'medium');
            const emotion = emotionWord(m && (m.emotion || m.name));
            const tone = oneOf(m && m.tone, TONES, 'mid');
            return {
                emotion,
                feel: str(m && (m.feel || m.inner), 140),
                why: str(m && m.why, 160),
                weight,
                tone,
                face: FACES.includes(m && m.face) ? m.face : guessFace(emotion, tone),
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
            change: oneOf(raw.dream.change, ['same', 'change', 'add'], 'same'),
            plus: str(raw.dream.plus, 120),
            why: str(raw.dream.why, 160),
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
// Если ответ сломан — чинит кавычки внутри текста и аккуратно закрывает оборванный конец.
export function extractJson(text) {
    if (text && typeof text === 'object') return text;
    let t = String(text || '');
    t = t.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
    t = t.replace(/^[\s\S]*?<\/think(?:ing)?>/i, '');
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
    if (fence && fence[1].includes('{')) t = fence[1];
    const start = t.indexOf('{');
    if (start < 0) throw new Error('В ответе модели нет JSON');
    const end = t.lastIndexOf('}');
    if (end > start) {
        try {
            return JSON.parse(t.slice(start, end + 1));
        } catch { /* чиним ниже */ }
    }
    const repaired = repairJson(t.slice(start));
    if (repaired === null) throw new Error('модель вернула испорченный ответ — попробуй обновить ещё раз');
    return repaired;
}

// Чинит то, что обычно ломают модели:
// — кавычки внутри текста («он сказал "да"») — экранирует;
// — висящие запятые;
// — оборванный конец (кончились токены) — отрезает недописанный кусок и закрывает скобки.
export function repairJson(src) {
    let out = '';
    const stack = [];
    let inStr = false;
    let esc = false;
    const cuts = []; // места, где можно безопасно обрезать: после завершённого значения
    const nextSignificant = i => {
        for (let j = i; j < src.length; j++) {
            const ch = src[j];
            if (!/\s/.test(ch)) return ch;
        }
        return '';
    };
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (inStr) {
            if (esc) { out += ch; esc = false; continue; }
            if (ch === '\\') { out += ch; esc = true; continue; }
            if (ch === '\n') { out += '\\n'; continue; }
            if (ch === '"') {
                const nx = nextSignificant(i + 1);
                if (nx === '' || nx === ',' || nx === ':' || nx === '}' || nx === ']') {
                    inStr = false;
                    out += ch;
                } else {
                    out += '\\"';
                }
                continue;
            }
            out += ch;
            continue;
        }
        if (ch === '"') { inStr = true; out += ch; continue; }
        if (ch === '{' || ch === '[') { stack.push(ch); out += ch; continue; }
        if (ch === '}' || ch === ']') {
            out = out.replace(/,\s*$/, '');
            stack.pop();
            out += ch;
            cuts.push({ len: out.length, stack: stack.slice() });
            if (!stack.length) break;
            continue;
        }
        if (ch === ',') cuts.push({ len: out.length, stack: stack.slice() });
        out += ch;
    }
    const close = (body, st) => body.replace(/,\s*$/, '') + st.slice().reverse().map(c => (c === '{' ? '}' : ']')).join('');
    const tryParse = str => {
        try {
            return JSON.parse(str);
        } catch {
            return undefined;
        }
    };
    if (!inStr && !stack.length) {
        const whole = tryParse(out);
        if (whole !== undefined) return whole;
    }
    // Оборванный ответ: откатываемся к последнему завершённому значению и закрываем скобки.
    for (let k = cuts.length - 1; k >= 0 && k >= cuts.length - 60; k--) {
        const c = cuts[k];
        const res = tryParse(close(out.slice(0, c.len), c.stack));
        if (res !== undefined) return res;
    }
    return null;
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
        if (Array.isArray(c.moodlets)) {
            c.moodlets = c.moodlets
                .map(m => Object.assign({}, m, { left: (m.left ?? m.turns ?? 1) - n }))
                .filter(m => m.left > 0);
        }
        if (Array.isArray(c.buffs)) {
            c.buffs = c.buffs
                .map(b => Object.assign({}, b, { left: (b.left ?? 1) - n }))
                .filter(b => b.left > 0);
        }
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
            prev.feel = m.feel || prev.feel;
            prev.tone = m.tone;
            if (m.face) prev.face = m.face;
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

// Мечта — глобальная и личная, меняется редко.
// pinned — закреплена: название не меняется никогда, только отмечаются этапы.
// change — модель предлагает новую мечту после потрясения; add — мечта дополняется («…вместе с ней»).
export function mergeDream(old, fresh, cycle) {
    const prev = old && old.dream && old.dream.title ? old.dream : null;
    const clean = d => ({ title: d.title, steps: (d.steps || []).map(s => ({ text: s.text, done: !!s.done })), plus: d.plus || '' });
    if (!prev) return Object.assign(clean(fresh), { changedAt: cycle });
    const cooling = old.dreamChangedAt !== undefined && cycle - old.dreamChangedAt < DREAM_COOLDOWN;
    const steps = prev.steps.map(s => {
        const n = findByText(fresh.steps, s.text);
        return { text: s.text, done: s.done || !!(n && n.done) };
    });
    const out = { title: prev.title, steps, plus: prev.plus || '', pinned: !!prev.pinned };
    if (prev.history) out.history = prev.history.slice();
    if (!prev.pinned && !cooling && fresh.why) {
        if (fresh.change === 'change' && normText(fresh.title) !== normText(prev.title)) {
            out.history = (out.history || []).concat([{ title: prev.title, plus: prev.plus || '' }]).slice(-4);
            out.title = fresh.title;
            out.steps = (fresh.steps || []).map(s => ({ text: s.text, done: !!s.done }));
            out.plus = fresh.plus || '';
            out.why = fresh.why;
            out.changedAt = cycle;
            out.event = 'dream_change';
            return out;
        }
        if (fresh.change === 'add' && fresh.plus && normText(fresh.plus) !== normText(prev.plus)) {
            out.plus = fresh.plus;
            out.why = fresh.why;
            out.changedAt = cycle;
            out.event = 'dream_grow';
        }
    }
    for (const s of fresh.steps || []) {
        if (!findByText(out.steps, s.text) && out.steps.length < 7 && !cooling) out.steps.push({ text: s.text, done: !!s.done });
    }
    return out;
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
        if (fresh.face) out.face = fresh.face;
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
        const d = mergeDream(old, fresh.dream, out.cycle);
        if (d.changedAt === out.cycle) out.dreamChangedAt = out.cycle;
        delete d.changedAt;
        out.dream = d;
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
        if (merged.dream) delete merged.dream.event;
        if (opts.points) {
            const got = evs.reduce((sum, e) => sum + (POINTS[e.type] || 0), 0);
            if (got) {
                merged.points = (merged.points || 0) + got;
                for (const e of evs) if (POINTS[e.type]) e.points = POINTS[e.type];
            }
        }
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
    if (modules.dream && now.dream && now.dream.event && old && old.dream) {
        if (now.dream.event === 'dream_change') ev.push({ type: 'dream_change', who, text: now.dream.title, why: now.dream.why });
        if (now.dream.event === 'dream_grow') ev.push({ type: 'dream_grow', who, text: `${now.dream.title} — ${now.dream.plus}`, why: now.dream.why });
    }
    if (modules.dream && now.dream && !(now.dream.event === 'dream_change')) {
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
        dream_change: 'Мечта изменилась',
        dream_grow: 'Мечта дополнилась',
        reward: 'Награда',
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
        case 'dream_change':
        case 'dream_grow': return `«${ev.text}»${ev.why ? ` — ${ev.why}` : ''}`;
        case 'reward': return ev.text || '';
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
        c.face = FACES.join('|');
        const ml = { emotion: 'облегчение', feel: 'как это ощущается внутри', why: 'что именно это вызвало', weight: 'light|medium|deep', tone: 'good|bad|mid', face: FACES.join('|') };
        if (!manualTurns) ml.turns = 2;
        c.moodlets = [ml];
        c.ended = ['эмоция, которую события сняли'];
    }
    if (modules.wants) c.wants = [{ text: 'чего хочет', status: 'active|done|dropped' }];
    if (modules.fears) c.fears = [{ text: 'чего боится', level: 'тревожит|пугает|в ужасе', strength: 2, status: 'active|realized|gone' }];
    if (modules.dream) c.dream = { title: 'мечта жизни', plus: '', steps: [{ text: 'этап', done: false }], change: 'same|change|add', why: '' };
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
    if (ctx.fromLore) {
        rules.push('Сейчас разбор карточки и лорбуков. Дополни главного персонажа (и тех, кто есть в сцене) тем, что о нём известно оттуда: черты характера, страхи, желания и мечта должны опираться на карточку и лорбук. То, что уже есть в текущем состоянии, не стирай — дополняй и уточняй.');
    }
    if (ctx.catchUp && ctx.catchUp.length) {
        rules.push(`Это первое заполнение дневника для уже идущей истории. Восстанови состояние по всему, что видно в сообщениях и эпизодах из прошлого. Обязательно верни этих персонажей, если они лично появлялись в истории (а не только упоминались в разговоре): ${ctx.catchUp.join(', ')}. impression — каким было первое впечатление об игроке при знакомстве, now и now_score — каким отношение стало к последней сцене. Желания и страхи — актуальные на конец. moodlets — только эмоции, которые ещё должны действовать сейчас.`);
    }
    if (ctx.knownNames && ctx.knownNames.length) {
        rules.push(`Известные персонажи этого мира: ${ctx.knownNames.join(', ')}. Если кто-то из них есть в сцене — называй его ровно так. Добавляй персонажа, только если он действительно присутствует или действует в последних сообщениях, а не просто упомянут.`);
    }
    if (m.mood) {
        rules.push('mood — общее состояние одним-двумя словами так, чтобы оно продолжало фразу «Сейчас он…» / «Сейчас она…»: краткое прилагательное или причастие в роде персонажа, со строчной буквы («встревожен», «весела», «не в духе», «сосредоточена»). Не существительное и не полная форма («замотанный» — нельзя, «вымотан» — можно).');
        const manual = settings.moodMode === 'manual';
        rules.push('face — какое лицо сейчас у персонажа: joy (радость), calm (спокоен), love (нежность, влюблённость), shy (смущён), sad (грусть), angry (злость, ревность), fear (страх, тревога, напряжение), tired (усталость), focus (сосредоточен, решителен), surprise (удивлён, озадачен), neutral. У каждой эмоции в moodlets тоже свой face из этого же списка — по самому чувству.');
        rules.push('moodlets — эмоции, которые ВЫЗВАЛИ ИЛИ УСИЛИЛИ последние события. Старые эмоции из текущего состояния не повторяй: они угасают сами. emotion — ЧУВСТВО одним-двумя словами, существительное со строчной буквы («облегчение», «нежность», «ревность», «стыд»), никогда не поступок и не описание сцены. feel — как это чувство ощущается внутри у самого персонажа, коротко и по-человечески («внутри теплеет, хочется её защитить», «сжимается в груди»). why — что его вызвало: конкретное событие с точки зрения персонажа, коротко («успел перехватить Эвелин в переулке»). Не путай: поступок персонажа — это причина (why), а не эмоция. weight — сила: light — слабая бытовая (раздражение, скука, смущение, лёгкая досада), medium — заметная (обида, тревога, радость от события), deep — сильная и долгая (горе, потрясение, влюблённость, страх после угрозы жизни). Обычные мелочи — только light, deep — только после серьёзных событий.'
            + (manual ? '' : ' turns — сколько ответов продержится, по силе и по контексту: light 1–2, medium 3–6, deep 6–25.')
            + ' Если исполнилось желание — добавь приятную эмоцию, если сбылся страх — сильную неприятную. ended — эмоции из текущего состояния, которые события сняли (обида прошла после извинений и т. п.).');
    }
    rules.push('Желания, страхи и мечта должны быть правдой о ЭТОМ персонаже по его карточке и событиям, а не шаблонно-светлыми. Если персонаж мрачный, сломленный, жестокий или депрессивный — его желания и мечта тоже могут быть тёмными (исчезнуть, отомстить, чтобы всё закончилось, власть любой ценой). Не делай их позитивными и не смягчай, если этого нет в персонаже.');
    if (m.wants) rules.push('wants — до 3 текущих желаний, конкретных и живых, из характера, сюжета и мечты; не только про игрока. Исполнившееся по событиям помечай status "done", неактуальное — "dropped", вместо них можно добавить новые.');
    if (m.fears) rules.push('fears — до 3 страхов, из характера, прошлого и сюжета; strength 1–3; level — одно слово. Если то, чего персонаж боялся, ПРОИЗОШЛО в последних сообщениях — обязательно помечай "realized". Преодолённый — "gone".');
    if (m.dream) rules.push(`dream — мечта всей жизни: одна большая личная цель, которая следует из характера и истории персонажа (карточка, прошлое, ценности), с 3–5 этапами. Это глобальное и личное, а не текущая сцена. ${user} может появиться в мечте, ТОЛЬКО если между ними уже по-настоящему близкие отношения (отношение +2 и выше) и было сильное общее событие; незнакомец, знакомый или просто приятель в мечту не попадает. Если мечта уже есть — повторяй её название, plus и этапы дословно, отмечай выполненные этапы (done: true) и ставь change "same". Меняй мечту, только если случилось настоящее потрясение, которое переворачивает жизнь персонажа: change "change" — новая мечта (новые title и steps), change "add" — мечта дополнилась (plus — короткое продолжение, например «…вместе с ней»); в why — какое событие. Мелкие события мечту не трогают.`);
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
    if (ctx.loreMain && ctx.loreMain.length) {
        parts.push(`[Карточка и лорбуки — сведения о мире и главном персонаже]\n${ctx.loreMain.join('\n\n')}`);
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
        if (modules.dream && c.dream) o.dream = { title: c.dream.title, plus: c.dream.plus || '', steps: c.dream.steps, pinned: !!c.dream.pinned };
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
            bits.push(`мечта: ${c.dream.title}${c.dream.plus ? ` ${c.dream.plus}` : ''}${next ? ` (следующий шаг: ${next.text})` : ''}`);
        }
        if (modules.traits && c.traits && c.traits.length) {
            bits.push(`черты: ${c.traits.filter(t => t.kind !== 'down').map(t => t.name).join(', ')}`);
        }
        if (Array.isArray(c.buffs) && c.buffs.length) {
            const eventsNow = c.buffs.filter(b => b.kind === 'event').map(b => b.effect || b.title);
            const lasting = c.buffs.filter(b => b.kind !== 'event').map(b => b.effect || b.title);
            if (lasting.length) bits.push(`сейчас действует: ${lasting.join('; ')}`);
            if (eventsNow.length) bits.push(`вплети в ближайший ответ это событие: ${eventsNow.join('; ')}`);
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


// ---------- Мечта: перегенерировать ----------

export function buildDreamPrompt(info, c, lang = 'русском') {
    const user = info.userName || 'игрок';
    const system = [
        'Ты ведёшь «внутренний мир» персонажа ролевой истории. Придумай заново его мечту всей жизни.',
        `Отвечай ТОЛЬКО JSON, без пояснений. Тексты — на ${lang} языке, коротко.`,
        'Мечта — одна большая личная цель, которая следует из характера, прошлого и ценностей персонажа (по карточке и лорбуку) и из того, что с ним случилось в истории. 3–5 этапов. Если персонаж мрачный или сломленный — мечта может быть тёмной; не делай её шаблонно-светлой.',
        `${user} может быть в мечте только если отношения уже по-настоящему близкие (отношение +2 и выше) и было сильное общее событие. Тогда лучше добавь это в plus («…вместе с ней»), а саму мечту оставь личной.`,
        c && c.dream && c.dream.title ? `Прошлая мечта была: «${c.dream.title}». Предложи другую, но правдивую для персонажа.` : '',
        'Формат: {"dream":{"title":"мечта","plus":"","steps":[{"text":"этап","done":false}]}}',
    ].filter(Boolean).join('\n');
    const parts = [];
    if (info.card) parts.push(`[Карточка: ${info.botName}]\n${info.card}`);
    if (info.loreMain && info.loreMain.length) parts.push(`[Лорбук]\n${info.loreMain.join('\n\n')}`);
    if (c) parts.push(`[Персонаж сейчас]\n${JSON.stringify({ name: c.name, mood: c.mood, traits: (c.traits || []).map(t => t.name), wants: (c.wants || []).map(w => w.text), fears: (c.fears || []).map(f => f.text), attitude_to_player: c.impression ? (c.impression.nowScore ?? c.impression.score) : null })}`);
    if (info.messages && info.messages.length) parts.push(`[Последние сообщения]\n${info.messages.join('\n\n')}`);
    parts.push('Верни JSON.');
    return { system, user: parts.join('\n\n') };
}

export function parseDream(text) {
    const data = extractJson(text);
    const raw = data.dream || data;
    const c = cleanCharacter({ name: 'x', dream: raw });
    if (!c || !c.dream) throw new Error('модель не вернула мечту');
    return { title: c.dream.title, plus: c.dream.plus || '', steps: c.dream.steps };
}

// ---------- Награды ----------

export function buildRewardsPrompt(info, c, lang = 'русском') {
    const system = [
        'Ты придумываешь «магазин наград» для персонажа ролевой истории, как в симуляторе жизни: игрок тратит очки, которые персонаж заработал за исполненные желания и мечту.',
        `Отвечай ТОЛЬКО JSON, без пояснений. Тексты — на ${lang} языке, коротко и мило.`,
        'Придумай 8 наград строго под этого персонажа, его характер, мир и историю. Три вида: buff — состояние на несколько ответов (turns 3–10), которое влияет на поведение («в приподнятом настроении», «не мучает бессонница»); event — приятный или значимый случай, который модель вплетёт в ближайший ответ («находит старое письмо матери»); collect — памятная вещица или знак в коллекцию, на поведение не влияет.',
        'effect — для buff и event: что именно передать рассказчику, одной фразой. cost — от 10 до 150, сильнее и редкое — дороже. icon — одно из: ' + REWARD_ICONS.join(', ') + '.',
        'Формат: {"rewards":[{"title":"название","desc":"коротко для игрока","kind":"buff|event|collect","effect":"для рассказчика","turns":5,"cost":40,"icon":"gift"}]}',
    ].join('\n');
    const parts = [];
    if (info.card) parts.push(`[Карточка: ${info.botName}]\n${info.card}`);
    if (c) parts.push(`[Персонаж]\n${JSON.stringify({ name: c.name, traits: (c.traits || []).map(t => t.name), dream: c.dream ? c.dream.title : '', wants: (c.wants || []).map(w => w.text), fears: (c.fears || []).map(f => f.text) })}`);
    if (info.messages && info.messages.length) parts.push(`[Последние сообщения]\n${info.messages.slice(-4).join('\n\n')}`);
    parts.push('Верни JSON.');
    return { system, user: parts.join('\n\n') };
}

export function parseRewards(text) {
    const data = extractJson(text);
    const list = Array.isArray(data) ? data : (data.rewards || []);
    return list.map((r, i) => ({
        id: `r${Date.now().toString(36)}${i}`,
        title: str(r && r.title, 60),
        desc: str(r && r.desc, 140),
        kind: oneOf(r && r.kind, REWARD_KINDS, 'buff'),
        effect: str(r && r.effect, 180),
        turns: num(r && r.turns, 1, 20, 5),
        cost: num(r && r.cost, 5, 500, 30),
        icon: oneOf(r && r.icon, REWARD_ICONS, 'gift'),
    })).filter(r => r.title).slice(0, 10);
}

// Купить награду: списывает очки и применяет. Возвращает текст ошибки или null.
export function buyReward(c, reward) {
    if (!c || !reward) return 'нет такой награды';
    if ((c.points || 0) < reward.cost) return 'не хватает очков';
    c.points = (c.points || 0) - reward.cost;
    if (reward.kind === 'collect') {
        c.collection = (c.collection || []).concat([{ title: reward.title, icon: reward.icon, desc: reward.desc }]).slice(-30);
    } else {
        c.buffs = (c.buffs || []).filter(b => b.id !== reward.id).concat([{
            id: reward.id, title: reward.title, icon: reward.icon, kind: reward.kind,
            effect: reward.effect || reward.desc || reward.title,
            left: reward.kind === 'event' ? 1 : reward.turns,
        }]);
    }
    c.log = [{ type: 'reward', text: `${reward.title} (−${reward.cost})`, m: null }].concat(c.log || []).slice(0, 40);
    return null;
}

// ---------- Несколько лорбуков ----------

// Новый разбор лорбука дополняет список, а не заменяет: новые НПС добавляются, у известных — дополняются описание и черты.
export function mergeRoster(old, fresh) {
    const out = { main: [...((old && old.main) || [])], npc: ((old && old.npc) || []).map(e => Object.assign({}, e)) };
    for (const m of fresh.main || []) if (!out.main.some(x => sameName(x, m))) out.main.push(m);
    for (const e of fresh.npc || []) {
        const prev = out.npc.find(x => sameName(x.name, e.name) || namesMatch(x.name, e.name));
        if (prev) {
            if (!prev.who && e.who) prev.who = e.who;
            prev.traits = [...new Set([...(prev.traits || []), ...(e.traits || [])])].slice(0, 6);
            prev.aliases = [...new Set([...(prev.aliases || []), ...(e.aliases || [])])].slice(0, 8);
            if (prev.g === 'n' && e.g) prev.g = e.g;
        } else if (!out.main.some(m => namesMatch(m, e.name))) {
            out.npc.push(Object.assign({}, e));
        }
    }
    out.npc = out.npc.slice(0, 60);
    return out;
}
