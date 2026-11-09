// Темы оформления дневника. Тему выбирает пользователь.

export const THEMES = {
    diary: {
        name: 'Дневник',
        fonts: 'family=Caveat:wght@600;700&family=Neucha',
    },
    dark: {
        name: 'Тёмный блокнот',
        fonts: 'family=Caveat:wght@600;700&family=Neucha',
    },
    sims: {
        name: 'Как в симуляторе жизни',
        fonts: 'family=Nunito:wght@600;700;800;900',
    },
    medieval: {
        name: 'Летопись',
        fonts: 'family=Ruslan+Display&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500',
    },
    cyber: {
        name: 'Нейроинтерфейс',
        fonts: 'family=Russo+One&family=JetBrains+Mono:wght@400;700',
    },
    grid: {
        name: 'Тетрадь в клетку',
        fonts: 'family=Marck+Script&family=Neucha',
    },
};

export const THEME_IDS = Object.keys(THEMES);

// Подписи блоков: у каждой темы свой голос. {он} → он/она.
// Строка настроения: «Сейчас он» + слово из mood («Сейчас он собран»).
const BASE_LABELS = {
    title: 'Внутренний мир',
    moodTitle: 'Настроение',
    moodLead: 'Сейчас {он}',
    feels: 'Чувствует',
    feelsHint: 'что сейчас на сердце и почему',
    wants: 'Хочет…',
    fears: 'Боится…',
    dream: 'Мечта жизни',
    traits: 'Черты характера',
    traitsBase: 'Основные',
    traitsGained: 'Приобретённые',
    attitude: 'Отношение к тебе',
    first: 'первое впечатление',
    now: 'сейчас',
    chronicle: 'Хроника',
    chronicleEmpty: 'Пока ничего важного не случилось.',
    whois: 'Кто это?',
    whoisTraits: 'по лорбуку',
    empty: 'Пока пусто. Дневник заполнится после следующего ответа — или нажми «обновить».',
    noChat: 'Открой чат с персонажем — и здесь появится его дневник.',
    settings: 'Настройки',
};

const THEME_LABELS = {
    sims: {
        wants: 'Желания',
        fears: 'Страхи',
        feels: 'Эмоции',
    },
    medieval: {
        title: 'Летопись души',
        moodTitle: 'Расположение духа',
        moodLead: 'Ныне {он}',
        feels: 'Чувства',
        feelsHint: 'что ныне на сердце и отчего',
        wants: 'Жаждет…',
        fears: 'Страшится…',
        dream: 'Великая мечта',
        first: 'первое суждение',
        now: 'ныне',
        chronicle: 'Летопись событий',
        whois: 'Кто сей?',
        whoisTraits: 'по преданиям',
        chronicleEmpty: 'Летописцу пока нечего записать.',
        empty: 'Страницы чисты. Летописец запишет после следующего ответа.',
        noChat: 'Летопись закрыта. Открой чат с персонажем, чтобы прочесть его страницы.',
        settings: 'Уложения',
    },
    cyber: {
        title: 'NEURO//LINK',
        moodTitle: 'Эмоц. статус',
        moodLead: 'Статус',
        feels: 'Эмоции',
        feelsHint: 'активные процессы и причины',
        wants: 'Цели',
        fears: 'Угрозы',
        dream: 'Главная директива',
        traits: 'Профиль личности',
        traitsBase: 'Базовый',
        traitsGained: 'Обновления',
        first: 'первичный скан',
        now: 'текущая оценка',
        chronicle: 'Журнал событий',
        whois: 'Досье',
        whoisTraits: 'из базы данных',
        chronicleEmpty: 'Журнал пуст.',
        empty: 'Нет данных. Сканирование после следующего ответа.',
        noChat: 'Нет подключения. Открой чат с персонажем.',
        settings: 'Конфигурация',
    },
};

export function themeLabels(theme, g) {
    const l = Object.assign({}, BASE_LABELS, THEME_LABELS[theme] || {});
    const he = g === 'f' ? 'она' : 'он';
    const out = {};
    for (const [k, v] of Object.entries(l)) out[k] = v.replace(/\{он\}/g, he);
    return out;
}

export function themeFontsUrl(theme) {
    const t = THEMES[theme] || THEMES.diary;
    return `https://fonts.googleapis.com/css2?${t.fonts}&display=swap`;
}

export function validTheme(theme) {
    return THEMES[theme] ? theme : 'diary';
}

// Значки рисуем сами (SVG), чтобы не зависеть от шрифтов и тем таверны.
const PATHS = {
    book: '<path d="M3 5.5c3-1.4 6-1.4 9 .8 3-2.2 6-2.2 9-.8v13c-3-1.4-6-1.4-9 .8-3-2.2-6-2.2-9-.8z"/><path d="M12 6.3v13"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c1.9 2.1 5.1 2.1 7 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01" stroke-width="2.6"/>',
    heart: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6z"/>',
    ghost: '<path d="M6 20V10.5a6 6 0 0 1 12 0V20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z"/><path d="M10 10.5h.01M14 10.5h.01" stroke-width="2.6"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    feather: '<path d="M19.5 4.5C11 5 6.5 10 6 18.5"/><path d="M19.5 4.5c-.5 6.5-4.5 10.5-11 11"/><path d="M4.5 20l3-3"/>',
    eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    scroll: '<path d="M7 4h10.5A1.5 1.5 0 0 1 19 5.5V18a2 2 0 0 1-2 2H8"/><path d="M7 4a2 2 0 0 0-2 2v1.5h4"/><path d="M7 4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1h4"/><path d="M11.5 9h4.5M11.5 12.5h4.5"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.4l2.6 2.6 5-5.4"/>',
    up: '<path d="M4 16.5l5.5-5.5 3.5 3.5L20 7.5"/><path d="M15 7.5h5v5"/>',
    down: '<path d="M4 7.5l5.5 5.5 3.5-3.5 7 7"/><path d="M15 16.5h5v-5"/>',
    crown: '<path d="M4 8l4 3.5L12 5l4 6.5L20 8l-1.6 10H5.6z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
    swap: '<path d="M4 9h13l-3.5-3.5"/><path d="M20 15H7l3.5 3.5"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/><circle cx="12" cy="12" r="6.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.5" r="2.5"/><path d="M15.8 14.2c2.4-.3 4.3 1.2 4.8 4"/>',
};

export function icon(name, cls = '') {
    return `<svg class="iw-ico ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.star}</svg>`;
}

export const EVENT_ICONS = {
    want_done: 'check',
    fear_real: 'ghost',
    fear_gone: 'sun',
    trait_new: 'feather',
    trait_up: 'up',
    trait_down: 'down',
    dream_step: 'star',
    dream_done: 'crown',
    impression: 'eye',
    attitude: 'swap',
};

export const BLOCK_ICONS = {
    mood: 'smile',
    wants: 'heart',
    fears: 'ghost',
    dream: 'star',
    traits: 'feather',
    impression: 'eye',
    chronicle: 'scroll',
};

// Подписи всплывашек в духе темы.
const TOAST_KICKERS = {
    medieval: { attitude: 'Переменилось отношение', want_done: 'Желание исполнилось', fear_real: 'Сбылся страх', trait_new: 'Новая черта нрава', dream_step: 'Шаг к великой мечте', impression: 'Первое суждение' },
    cyber: { attitude: 'RELATION SHIFT', want_done: 'TASK COMPLETE', fear_real: 'THREAT DETECTED', fear_gone: 'THREAT CLEARED', trait_new: 'PROFILE UPDATE', trait_up: 'PROFILE UPDATE', trait_down: 'PROFILE UPDATE', dream_step: 'DIRECTIVE PROGRESS', dream_done: 'DIRECTIVE COMPLETE', impression: 'NEW CONTACT' },
};

export function toastKicker(theme, type, fallback) {
    return (TOAST_KICKERS[theme] && TOAST_KICKERS[theme][type]) || fallback;
}
