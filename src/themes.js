// Темы оформления дневника. Тему выбирает пользователь.
import { PX_ICONS } from './pixel-icons.js';

export const THEMES = {
    diary: {
        name: 'Дневник',
        fonts: 'family=Caveat:wght@600;700&family=Neucha',
    },
    dark: {
        name: 'Тёмный дневник',
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
        fonts: 'family=Russo+One&family=JetBrains+Mono:wght@400;500;600;700',
    },
    grid: {
        name: 'Тетрадь в клетку',
        fonts: 'family=Marck+Script&family=Neucha',
    },
    bimbo: {
        name: 'Бимбо-пикми',
        fonts: 'family=Pacifico&family=Nunito:wght@500;600;700;800',
    },
    china: {
        name: 'Китайский свиток',
        fonts: 'family=Prata&family=PT+Serif:ital,wght@0,400;0,700;1,400',
        // кисть только для иероглифов на печатях — грузим лишь эти знаки
        glyphs: 'family=Ma+Shan+Zheng&text=%E6%83%85%E6%84%BF%E6%83%A7%E6%A2%A6%E6%80%A7%E5%BF%83%E5%8F%B2%E7%A4%BC%E4%B9%A6%E9%AD%82',
    },
    grimoire: {
        name: 'Ведьмин гримуар',
        fonts: 'family=Bad+Script&family=Lora:ital,wght@0,400;0,600;1,400',
    },
    dossier: {
        name: 'Досье 90-х',
        fonts: 'family=Rubik+Mono+One&family=IBM+Plex+Mono:wght@400;500;600;700',
    },
    logbook: {
        name: 'Бортовой журнал',
        // как на сайте Stellar Fleet: Oswald — заголовки, Onest — текст, JetBrains Mono — служебное
        fonts: 'family=Oswald:wght@400;500;600&family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500',
    },
    pixel: {
        name: 'Пиксельная игра',
        // пиксельный шрифт с кириллицей, как на старых приставках — для всего текста
        fonts: 'family=Press+Start+2P',
    },
};

// Цвета для карточек выбора темы: фон, чернила, акцент.
export const THEME_SWATCHES = {
    diary: ['#fbf6ea', '#2b2a4a', '#f28cb4'],
    dark: ['#1f1d26', '#ece6f5', '#c6a8ff'],
    sims: ['#eef4fb', '#2f73c0', '#7ed957'],
    medieval: ['#efe0bd', '#5a3a1a', '#a3241a'],
    cyber: ['#0b0d14', '#3ef0ff', '#ff3ea5'],
    grid: ['#f7f8f2', '#1f3a93', '#c0262d'],
    bimbo: ['#fff0f7', '#ff3d96', '#c44fd1'],
    china: ['#f6efe0', '#1d1a17', '#c8312b'],
    grimoire: ['#1b1324', '#e8c77a', '#8fe39b'],
    dossier: ['#d8bf8a', '#2a2a2a', '#c0262d'],
    logbook: ['#0c141a', '#f2a93f', '#62d6c8'],
    pixel: ['#f4b6c4', '#4a2730', '#7ccf5b'],
};

export const THEME_IDS = Object.keys(THEMES);

// Значок валюты: в журнале — кредиты, в свитке — монетка с квадратным отверстием, в остальных — монета.
const CURRENCY_ICONS = { logbook: 'credit', china: 'cashcoin', pixel: 'pxcoin' };
export function currencyIcon(theme) {
    return CURRENCY_ICONS[theme] || 'coin';
}

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
    persona: 'Тип личности',
    chartMark: '♥',
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
    rewards: 'Награды',
    shop: 'Магазин наград',
    wallet: 'очки',
    analyze: 'Проанализировать',
    analyzing: 'Записываю',
};

const THEME_LABELS = {
    bimbo: {
        chartMark: '♡',
        persona: 'Типаж и вайб ✨',
        title: 'Мой дневничок ♡',
        moodTitle: 'Вайб дня',
        moodLead: 'Сейчас {он}',
        feels: 'Почему тучка плачет?',
        feelsHint: 'что на сердечке',
        wants: 'Чего хочет {ник1}',
        fears: 'Чего боится {ник2}',
        dream: 'Мечта-мечточка ✨',
        traits: 'Какой {он} по жизни',
        traitsBase: 'С рождения',
        traitsGained: 'Новенькое ✨',
        attitude: 'Как {он} к тебе, зай?',
        first: 'первое впечатление',
        now: 'а сейчас',
        chronicle: 'Что было, пупс',
        chronicleEmpty: 'Пока тишина, кис ♡',
        whois: 'Это кто, зай?',
        whoisTraits: 'по лорбуку',
        settings: 'Настроечки',
        noChat: 'Открой чатик, коть ♡',
        empty: 'Тут пока пусто, зай ♡ Дневничок заполнится после следующего ответа — или жми «Чат».',
        rewards: 'Подарочки ♡',
        shop: 'Шопинг ♡',
        analyze: 'Проанализируем, зай?',
        analyzing: 'Секундочку, коть',
    },
    sims: {
        chartMark: '◆',
        persona: 'Тип личности',
        wants: 'Желания',
        fears: 'Страхи',
        feels: 'Эмоции',
        analyzing: 'Загрузка',
    },
    medieval: {
        chartMark: '⚜',
        persona: 'Склад и нрав',
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
        rewards: 'Дары',
        shop: 'Лавка даров',
        analyze: 'Вопросить летопись',
        analyzing: 'Летописец пишет',
    },
    cyber: {
        chartMark: '◉',
        persona: 'Психотип',
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
        rewards: 'Бонусы',
        shop: 'Магазин бонусов',
        analyze: 'Запустить анализ',
        analyzing: 'Сканирую',
    },
    dark: {
        chartMark: '☾',
        analyze: 'Разобрать',
    },
    china: {
        chartMark: '◈',
        persona: 'Стихия души',
        title: 'Книга сердца',
        moodTitle: 'Состояние духа',
        moodLead: 'Сейчас {он}',
        feels: 'Чувства',
        wants: 'Чего желает',
        fears: 'Чего страшится',
        dream: 'Путь сердца',
        traits: 'Природа',
        traitsBase: 'Врождённое',
        traitsGained: 'Обретённое',
        attitude: 'Как {он} смотрит на тебя',
        first: 'первая встреча',
        now: 'ныне',
        chronicle: 'Летопись дней',
        chronicleEmpty: 'Свиток пока чист.',
        whois: 'Кто это?',
        whoisTraits: 'из свитков',
        empty: 'Свиток пока чист. Кисть коснётся бумаги после следующего ответа.',
        noChat: 'Свиток свёрнут. Открой чат с персонажем.',
        rewards: 'Дары',
        shop: 'Лавка даров',
        analyze: 'Раскрыть свиток',
        analyzing: 'Кисть пишет',
    },
    grimoire: {
        chartMark: '✦',
        persona: 'Натальная суть',
        title: 'Гримуар',
        moodTitle: 'Аура',
        moodLead: 'Сейчас {он}',
        feels: 'Чувства',
        wants: 'Тайные желания',
        fears: 'Тёмные страхи',
        dream: 'Заветная мечта',
        traits: 'Суть',
        traitsBase: 'Врождённое',
        traitsGained: 'Проявилось',
        attitude: 'Нить между вами',
        first: 'первое гадание',
        now: 'сейчас',
        chronicle: 'Книга теней',
        chronicleEmpty: 'Страницы пока молчат.',
        whois: 'Кто это?',
        whoisTraits: 'из гримуара',
        empty: 'Страницы пока молчат. Знаки проявятся после следующего ответа.',
        noChat: 'Гримуар закрыт. Открой чат с персонажем.',
        settings: 'Обряды',
        rewards: 'Обереги',
        shop: 'Лавка зелий',
        analyze: 'Прочесть знаки',
        analyzing: 'Варю зелье',
    },
    dossier: {
        chartMark: '●',
        persona: 'Психотип',
        title: 'Личное дело',
        moodTitle: 'Состояние',
        moodLead: 'Сейчас {он}',
        feels: 'Эмоции',
        wants: 'Мотивы',
        fears: 'Уязвимости',
        dream: 'Конечная цель',
        traits: 'Характеристика',
        traitsBase: 'Исходные данные',
        traitsGained: 'Выявлено',
        attitude: 'Отношение к тебе',
        first: 'при первой встрече',
        now: 'на данный момент',
        chronicle: 'Протокол событий',
        chronicleEmpty: 'Протокол пуст.',
        whois: 'Справка',
        whoisTraits: 'по картотеке',
        empty: 'Дело пока пустое. Сведения поступят после следующего ответа.',
        noChat: 'Дело не заведено. Открой чат с персонажем.',
        settings: 'Параметры',
        rewards: 'Поощрения',
        shop: 'Спецснабжение',
        analyze: 'Собрать сведения',
        analyzing: 'Печатаю',
    },
    logbook: {
        chartMark: '✧',
        persona: 'Психопрофиль',
        title: 'Бортовой журнал',
        moodTitle: 'Состояние',
        moodLead: 'Сейчас {он}',
        feels: 'Эмоции',
        wants: 'Задачи',
        fears: 'Риски',
        dream: 'Курс жизни',
        traits: 'Профиль',
        traitsBase: 'Исходный',
        traitsGained: 'Обновлено в рейсе',
        attitude: 'Связь с тобой',
        first: 'первый контакт',
        now: 'сейчас',
        chronicle: 'Записи журнала',
        chronicleEmpty: 'Журнал пуст.',
        whois: 'Кто на борту?',
        whoisTraits: 'из реестра',
        empty: 'Журнал пуст. Записи появятся после следующего ответа.',
        noChat: 'Нет связи. Открой чат с персонажем.',
        settings: 'Системы',
        rewards: 'Снабжение',
        shop: 'Склад снабжения',
        analyze: 'Запросить телеметрию',
        analyzing: 'Приём данных',
    },
    pixel: {
        chartMark: '♥',
        persona: 'Класс персонажа',
        title: 'Дневник игрока',
        moodTitle: 'Статус',
        moodLead: 'Сейчас {он}',
        feels: 'Эффекты',
        wants: 'Квесты',
        fears: 'Угрозы',
        dream: 'Главный квест',
        traits: 'Перки',
        traitsBase: 'Стартовые',
        traitsGained: 'Открыты в игре',
        attitude: 'Отношение к тебе',
        first: 'первая встреча',
        now: 'сейчас',
        chronicle: 'Журнал игры',
        chronicleEmpty: 'Пока ничего не случилось. Игра только начинается!',
        whois: 'Кто это?',
        whoisTraits: 'из лорбука',
        empty: 'Сохранений пока нет. Дневник заполнится после следующего ответа.',
        noChat: 'Нажми START: открой чат с персонажем.',
        settings: 'Опции',
        rewards: 'Лут',
        shop: 'Лавка лута',
        analyze: 'Сохранить игру',
        analyzing: 'Сохраняю',
    },
    grid: {
        chartMark: '✓',
    },
};

// Ласковые прозвища в бимбо-теме: у главного персонажа «котя / зая», у остальных — свои, по имени.
const BIMBO_NICKS = [['котя', 'зая'], ['пупсик', 'лапуля'], ['малыш', 'солнышко'], ['кис', 'булочка'], ['зайка', 'котик'], ['лапочка', 'пончик'], ['сладость', 'медвежонок'], ['птенчик', 'карамелька']];

export function bimboNicks(name = '', first = false) {
    if (first || !name) return BIMBO_NICKS[0];
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return BIMBO_NICKS[1 + (h % (BIMBO_NICKS.length - 1))];
}

export function themeLabels(theme, g, nicks = null) {
    const l = Object.assign({}, BASE_LABELS, THEME_LABELS[theme] || {});
    const he = g === 'f' ? 'она' : 'он';
    const [n1, n2] = nicks || BIMBO_NICKS[0];
    const out = {};
    for (const [k, v] of Object.entries(l)) out[k] = v.replace(/\{он\}/g, he).replace(/\{ник1\}/g, n1).replace(/\{ник2\}/g, n2);
    return out;
}

// Все ссылки на шрифты темы: основная и, если есть, отдельная для редких знаков.
export function themeFontUrls(theme) {
    const t = THEMES[theme] || THEMES.diary;
    const list = [`https://fonts.googleapis.com/css2?${t.fonts}&display=swap`];
    if (t.glyphs) list.push(`https://fonts.googleapis.com/css2?${t.glyphs}&display=swap`);
    return list;
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
    pxcoin: '<g transform="translate(0 0) scale(2)" shape-rendering="crispEdges"><rect x="4" y="0" width="4" height="1" fill="currentColor" stroke="none"/><rect x="2" y="1" width="8" height="1" fill="currentColor" stroke="none"/><rect x="1" y="2" width="10" height="1" fill="currentColor" stroke="none"/><rect x="1" y="3" width="4" height="1" fill="currentColor" stroke="none"/><rect x="7" y="3" width="4" height="1" fill="currentColor" stroke="none"/><rect x="0" y="4" width="5" height="1" fill="currentColor" stroke="none"/><rect x="7" y="4" width="5" height="1" fill="currentColor" stroke="none"/><rect x="0" y="5" width="5" height="1" fill="currentColor" stroke="none"/><rect x="7" y="5" width="5" height="1" fill="currentColor" stroke="none"/><rect x="0" y="6" width="5" height="1" fill="currentColor" stroke="none"/><rect x="7" y="6" width="5" height="1" fill="currentColor" stroke="none"/><rect x="0" y="7" width="5" height="1" fill="currentColor" stroke="none"/><rect x="7" y="7" width="5" height="1" fill="currentColor" stroke="none"/><rect x="1" y="8" width="4" height="1" fill="currentColor" stroke="none"/><rect x="7" y="8" width="4" height="1" fill="currentColor" stroke="none"/><rect x="1" y="9" width="10" height="1" fill="currentColor" stroke="none"/><rect x="2" y="10" width="8" height="1" fill="currentColor" stroke="none"/><rect x="4" y="11" width="4" height="1" fill="currentColor" stroke="none"/></g>',
    pxheart: '<g transform="translate(0 0) scale(2)" shape-rendering="crispEdges"><rect x="1" y="0" width="2" height="1" fill="currentColor" stroke="none"/><rect x="6" y="0" width="2" height="1" fill="currentColor" stroke="none"/><rect x="0" y="1" width="4" height="1" fill="currentColor" stroke="none"/><rect x="5" y="1" width="4" height="1" fill="currentColor" stroke="none"/><rect x="0" y="2" width="9" height="1" fill="currentColor" stroke="none"/><rect x="0" y="3" width="9" height="1" fill="currentColor" stroke="none"/><rect x="1" y="4" width="7" height="1" fill="currentColor" stroke="none"/><rect x="2" y="5" width="5" height="1" fill="currentColor" stroke="none"/><rect x="3" y="6" width="3" height="1" fill="currentColor" stroke="none"/><rect x="4" y="7" width="1" height="1" fill="currentColor" stroke="none"/></g>',
    alert: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.3v.2"/>',
    zodiac: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/><circle cx="12" cy="12" r="3.2"/>',
    flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.4-5 3.4-8.4 1.9 1.4 2.6 3.2 2.6 4.6 1-.8 1.6-2 1.7-3.4 2.4 1.9 4.3 4.4 4.3 7.2 0 3.2-2.4 5.6-6 5.6z"/>',
    persona: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8"/>',
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
    chevron: '<path d="M6 9.5l6 6 6-6"/>',
    tick: '<path d="M5.5 12.5l4 4 9-9.5"/>',
    trash: '<path d="M5 7h14"/><path d="M9.5 7V4.8h5V7"/><path d="M6.8 7l.9 12.2h8.6L17.2 7"/><path d="M10.3 10.5v5.5M13.7 10.5v5.5"/>',
    arrowup: '<path d="M12 19V5.5"/><path d="M6.5 11L12 5.5 17.5 11"/>',
    arrowdown: '<path d="M12 5v13.5"/><path d="M6.5 13L12 18.5 17.5 13"/>',
    arrowright: '<path d="M5 12h13.5"/><path d="M13 6.5l5.5 5.5-5.5 5.5"/>',
    credit: '<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M8.5 10.2h7M8.5 13.8h7"/>',
    cashcoin: '<circle cx="12" cy="12" r="8.5"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx=".4"/>',
    tobase: '<path d="M12 15V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 14v5.5h15V14"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/>',
    crown: '<path d="M4 8l4 3.5L12 5l4 6.5L20 8l-1.6 10H5.6z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
    swap: '<path d="M4 9h13l-3.5-3.5"/><path d="M20 15H7l3.5 3.5"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/><circle cx="12" cy="12" r="6.5"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.5" r="2.5"/><path d="M15.8 14.2c2.4-.3 4.3 1.2 4.8 4"/>',
    spin: '<path d="M19.5 9.5c-1.3-3.4-4.6-5.6-8.2-5.2C7 4.8 4 8.3 4.2 12.6"/><path d="M19.8 4.6l-.2 5.1-5-.6"/><path d="M4.6 14.6c1.3 3.4 4.6 5.6 8.2 5.2 4.3-.5 7.3-4 7.1-8.3"/><path d="M4.2 19.4l.2-5.1 5 .6"/>',
    lips: '<path d="M3 12c2.2-3.6 4.7-4.8 6.6-3.8.9.5 1.6.5 2.4 0 .8.5 1.5.5 2.4 0 1.9-1 4.4.2 6.6 3.8-2.6 4-5.8 5.6-9 5.6S5.6 16 3 12z"/><path d="M3.5 12.2c2.8.9 5.6 1.2 8.5 1.2s5.7-.3 8.5-1.2"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9c1.2 1.6 1.2 4.4 0 6"/><path d="M18.3 6.5c2.4 3 2.4 8 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    pin: '<path d="M8.5 3h7l-1.2 5.6L18 12H6l3.7-3.4z" fill="currentColor"/><path d="M12 12v8.5"/>',
    unpin: '<path d="M8.5 3h7l-1.2 5.6L18 12H6l3.7-3.4z"/><path d="M12 12v8.5"/>',
    dice: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/><path d="M12 9.5l.8 1.7 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.7.9.4-1.9-1.4-1.3 1.9-.3z"/>',
    chat: '<path d="M4.5 6.5c0-1.4 1.1-2.5 2.5-2.5h10c1.4 0 2.5 1.1 2.5 2.5v7c0 1.4-1.1 2.5-2.5 2.5H11l-4.5 3.5V16h0c-1.1 0-2-1.1-2-2.5z"/><path d="M8.5 9h7M8.5 12h4.5"/>',
    bookopen: '<path d="M3 5.5c3-1.4 6-1.4 9 .8 3-2.2 6-2.2 9-.8v13c-3-1.4-6-1.4-9 .8-3-2.2-6-2.2-9-.8z"/><path d="M12 6.3v13"/><path d="M5.5 9.5c1.6-.5 3.2-.4 4.5.3M14 9.8c1.3-.7 2.9-.8 4.5-.3"/>',
    sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    coin: '<ellipse cx="12" cy="12" rx="8" ry="8"/><path d="M12 7.5v9M9.5 9.5c.3-1 1.3-1.6 2.5-1.6 1.6 0 2.6.8 2.6 2s-1 1.7-2.6 2.1-2.7 1-2.7 2.2 1.1 2 2.7 2c1.3 0 2.3-.6 2.6-1.6"/>',
    pointer: '<path d="M3 5.5c5.5-2.4 11.6-1.6 15.2 3.4 1 1.4 1.6 3.4 1.7 5.6"/><path d="M15.9 12.2l4 3.6 2.4-4.6"/>',
    shop: '<path d="M4 9.5l1.5-5h13l1.5 5"/><path d="M4 9.5c0 1.4 1.3 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.2 2.5 2.6 2.5S20 10.9 20 9.5"/><path d="M5.5 12v7.5h13V12"/><path d="M10 19.5v-4.5h4v4.5"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.6-3.5-5.5-4.2-5.5-1.8C6.5 9 12 9 12 9zM12 9c1.6-3.5 5.5-4.2 5.5-1.8C17.5 9 12 9 12 9z"/>',
    cake: '<path d="M5 20v-7.5h14V20z"/><path d="M5 15.5c1.5 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0"/><path d="M8.5 12.5V10M12 12.5V9.5M15.5 12.5V10"/><path d="M8.5 7.5l.01.01M12 6.5l.01.01M15.5 7.5l.01.01" stroke-width="2.6"/>',
    ribbon: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7 21l5-2.6 5 2.6-2-7.5"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M17.5 12v3M20 12v2"/>',
    flower: '<circle cx="12" cy="10" r="2.2"/><path d="M12 7.8c-1-3 2-3.8 2.4-1.6M14.2 10c2.8-1 3.8 2 1.6 2.6M12 12.2c1 3-2 3.8-2.4 1.6M9.8 10c-2.8 1-3.8-2-1.6-2.6"/><path d="M12 14.5V21M12 18c-1.5-1.5-3.5-1.5-4.5-.5M12 17c1.5-1.5 3.5-1.5 4.5-.5"/>',
    potion: '<path d="M9.5 3.5h5M10.5 3.5v5L6 16.5a2.6 2.6 0 0 0 2.3 4h7.4a2.6 2.6 0 0 0 2.3-4l-4.5-8v-5"/><path d="M7.8 14h8.4"/>',
    note: '<path d="M9 18V5.5l10-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    book: '<path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11.5"/><path d="M9 8.5h6"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    cup: '<path d="M5 8.5h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
    letter: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
    shield: '<path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
    gem: '<path d="M7 4.5h10l3.5 5L12 20 3.5 9.5z"/><path d="M3.5 9.5h17M9.5 4.5L8 9.5l4 10.5 4-10.5-1.5-5"/>',
};

// Лица персонажа по настроению — рисованные смайлики.
const FACE_PATHS = {
    joy: '<path d="M7.5 10.6c.5-1.3 2.1-1.3 2.6 0M13.9 10.6c.5-1.3 2.1-1.3 2.6 0"/><path d="M7.6 13.4h8.8c-.4 3-2.2 4.5-4.4 4.5s-4-1.5-4.4-4.5z" fill="currentColor"/>',
    calm: '<path d="M7.5 10.2c.7.9 1.9.9 2.6 0M13.9 10.2c.7.9 1.9.9 2.6 0"/><path d="M8.8 14.6c1.9 1.6 4.5 1.6 6.4 0"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity=".3"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity=".3"/>',
    love: '<path d="M9 12.2s-2.3-1.3-2.3-2.9a1.15 1.15 0 0 1 2.3-.6 1.15 1.15 0 0 1 2.3.6c0 1.6-2.3 2.9-2.3 2.9zM15 12.2s-2.3-1.3-2.3-2.9a1.15 1.15 0 0 1 2.3-.6 1.15 1.15 0 0 1 2.3.6c0 1.6-2.3 2.9-2.3 2.9z" fill="currentColor" stroke-width="1"/><path d="M8.8 15c1.9 1.7 4.5 1.7 6.4 0"/>',
    shy: '<circle cx="9.2" cy="11.2" r="1.3" fill="currentColor" stroke="none"/><circle cx="14.8" cy="11.2" r="1.3" fill="currentColor" stroke="none"/><path d="M10.2 15.4c.6-.5 1.2-.5 1.8 0s1.2.5 1.8 0"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity=".5"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity=".5"/>',
    sad: '<path d="M7.4 8.8l2.5-1M16.6 8.8l-2.5-1"/><circle cx="9" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><path d="M8.8 16.6c1.9-2 4.5-2 6.4 0"/><path d="M16.9 12.4c.6 1 .8 1.8.2 2.3-.6.4-1.4 0-1.3-.7.1-.6.5-1 1.1-1.6z" fill="currentColor" stroke-width="1"/>',
    angry: '<path d="M7.2 8.2l3.1 1.6M16.8 8.2l-3.1 1.6" stroke-width="2.4"/><circle cx="9" cy="11.4" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="11.4" r="1.3" fill="currentColor" stroke="none"/><path d="M8.8 16.6c1.9-1.6 4.5-1.6 6.4 0"/>',
    fear: '<circle cx="9" cy="10.4" r="1.9"/><circle cx="15" cy="10.4" r="1.9"/><circle cx="9" cy="10.6" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r=".8" fill="currentColor" stroke="none"/><path d="M8.4 16c.8-.8 1.6-.8 2.4 0s1.6.8 2.4 0 1.6-.8 2.4 0"/><path d="M18.4 6.6c.6 1 .8 1.8.2 2.3-.6.4-1.4 0-1.3-.7.1-.6.5-1 1.1-1.6z" fill="currentColor" stroke-width="1"/>',
    tired: '<path d="M7.4 10.4h3M13.6 10.4h3"/><path d="M7.8 11.2c.7.6 1.7.6 2.4 0M13.8 11.2c.7.6 1.7.6 2.4 0" stroke-width="1.3"/><path d="M10 15.6h4"/><path d="M16.8 4.6h2.6l-2.6 2.6h2.6" stroke-width="1.5"/>',
    focus: '<path d="M7.2 8.4h3.2M13.6 8.4h3.2" stroke-width="2.4"/><circle cx="9" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><path d="M9.2 15.6h5.6"/>',
    surprise: '<path d="M7.3 7.8c.8-1 2.3-1 3.1 0M13.6 7.8c.8-1 2.3-1 3.1 0"/><circle cx="9" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><ellipse cx="12" cy="15.6" rx="1.6" ry="2"/>',
    neutral: '<circle cx="9" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><path d="M9 15.2h6"/>',
};

export function faceIcon(face, cls = '') {
    const inner = FACE_PATHS[face] || FACE_PATHS.neutral;
    return `<svg class="iw-face-ico ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="iw-face-bg" d="M12 3.2c4.9-.2 8.9 3.6 8.8 8.7-.1 4.9-3.9 8.8-8.9 8.8-4.9 0-8.7-3.8-8.7-8.8 0-4.8 3.9-8.5 8.8-8.7z"/>${inner}</svg>`;
}

// В пиксельной теме значки рисуются пиксель-артом (16×16), в остальных — контуром.
let iconTheme = '';
export function setIconTheme(theme) {
    iconTheme = theme || '';
}
export function iconStyle() {
    return iconTheme;
}
export function pxSvg(d, cls = '') {
    return `<svg class="iw-ico iw-px ${cls}" viewBox="0 0 16 16" width="1em" height="1em" fill="currentColor" stroke="none" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}"/></svg>`;
}

export function icon(name, cls = '') {
    if (iconTheme === 'pixel' && PX_ICONS[name]) return pxSvg(PX_ICONS[name], cls);
    return `<svg class="iw-ico ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.star}</svg>`;
}

export const EVENT_ICONS = {
    want_done: 'check',
    fear_real: 'ghost',
    fear_gone: 'sun',
    trait_new: 'feather',
    trait_up: 'up',
    trait_down: 'down',
    trait_gone: 'x',
    dream_step: 'star',
    dream_done: 'crown',
    impression: 'eye',
    attitude: 'swap',
    dream_change: 'star',
    dream_grow: 'sparkle',
    reward: 'gift',
};

export const BLOCK_ICONS = {
    mood: 'smile',
    wants: 'heart',
    fears: 'ghost',
    dream: 'star',
    traits: 'feather',
    persona: 'persona',
    impression: 'eye',
    chronicle: 'scroll',
    rewards: 'gift',
};

// Подписи всплывашек в духе темы.
const TOAST_KICKERS = {
    bimbo: { want_done: 'Ура-ура, сбылось! ♡', fear_real: 'Почему тучка плачет? Страх сбылся…', fear_gone: 'Фух, больше не страшно ✨', trait_new: 'Новый вайб, кис', trait_up: 'Вайб усилился, коть', trait_down: 'Вайб слабеет…', trait_gone: 'Вайб ушёл, пока-пока', dream_step: 'Шажочек к мечте ✨', dream_done: 'Мечта сбылась, ааа!! ♡', dream_change: 'Новая мечточка ✨', dream_grow: 'Мечта стала больше ♡', impression: 'Первое впечатление, зай', attitude: 'Ой, отношение поменялось!', reward: 'Обновочка, кис ♡' },
    medieval: { attitude: 'Переменилось отношение', want_done: 'Желание исполнилось', fear_real: 'Сбылся страх', trait_new: 'Новая черта нрава', dream_step: 'Шаг к великой мечте', impression: 'Первое суждение' },
    china: { want_done: 'Желание исполнилось', fear_real: 'Страх обрёл плоть', fear_gone: 'Тревога рассеялась', trait_new: 'Обретена новая черта', dream_step: 'Шаг по пути сердца', dream_done: 'Путь пройден', dream_change: 'Путь изменился', dream_grow: 'Путь стал шире', impression: 'Первая встреча', attitude: 'Сердце переменилось', reward: 'Дар принят' },
    grimoire: { want_done: 'Желание сбылось', fear_real: 'Тьма настигла: страх сбылся', fear_gone: 'Морок развеялся', trait_new: 'Проявилась новая суть', trait_up: 'Суть окрепла', trait_down: 'Суть слабеет', trait_gone: 'Суть развеялась', dream_step: 'Заклинание крепнет', dream_done: 'Заклинание свершилось', dream_change: 'Знаки изменились', dream_grow: 'Мечта разрослась', impression: 'Первое гадание', attitude: 'Нить натянулась иначе', reward: 'Оберег получен' },
    dossier: { want_done: 'Мотив реализован', fear_real: 'ВНИМАНИЕ: уязвимость подтвердилась', fear_gone: 'Угроза снята', trait_new: 'Выявлена новая черта', trait_up: 'Черта усилилась', trait_down: 'Черта ослабла', trait_gone: 'Черта утрачена', dream_step: 'Продвижение к цели', dream_done: 'Цель достигнута', dream_change: 'Цель сменилась', dream_grow: 'Цель расширена', impression: 'Новый фигурант', attitude: 'Отношение изменилось', reward: 'Поощрение выдано' },
    logbook: { want_done: 'Задача выполнена', fear_real: 'ТРЕВОГА: риск сработал', fear_gone: 'Риск миновал', trait_new: 'Профиль обновлён', trait_up: 'Профиль обновлён', trait_down: 'Профиль обновлён', trait_gone: 'Профиль обновлён', dream_step: 'Курс выдержан', dream_done: 'Пункт назначения достигнут', dream_change: 'Курс изменён', dream_grow: 'Курс продлён', impression: 'Первый контакт', attitude: 'Связь изменилась', reward: 'Груз получен' },
    cyber: { attitude: 'RELATION SHIFT', want_done: 'TASK COMPLETE', fear_real: 'THREAT DETECTED', fear_gone: 'THREAT CLEARED', trait_new: 'PROFILE UPDATE', trait_up: 'PROFILE UPDATE', trait_down: 'PROFILE UPDATE', dream_step: 'DIRECTIVE PROGRESS', dream_done: 'DIRECTIVE COMPLETE', impression: 'NEW CONTACT' },
    pixel: { want_done: 'Квест выполнен!', fear_real: 'Получен урон!', fear_gone: 'Угроза пройдена', trait_new: 'Новый перк!', trait_up: 'Перк прокачан', trait_down: 'Перк ослаб', trait_gone: 'Перк потерян', dream_step: 'Прогресс главного квеста', dream_done: 'Главный квест пройден!', dream_change: 'Новый главный квест', dream_grow: 'Квест расширен', impression: 'Новый персонаж!', attitude: 'Отношение изменилось', reward: 'Лут получен!' },
};

// Подпись листика с ошибкой дневника — в голосе темы.
const ERROR_KICKERS = {
    diary: 'Не получилось', dark: 'Не получилось', sims: 'Ой! Ошибка', grid: 'Ошибка',
    bimbo: 'Ой-ой, ошибочка…', medieval: 'Худая весть', cyber: 'ERR // сбой', china: 'Кисть сорвалась',
    grimoire: 'Заклинание сорвалось', dossier: 'СБОЙ: дело не оформлено', logbook: 'СБОЙ СИСТЕМЫ', pixel: 'GAME OVER? Нет, просто ошибка',
};
export function errorKicker(theme) {
    return ERROR_KICKERS[theme] || 'Не получилось';
}

export function toastKicker(theme, type, fallback) {
    return (TOAST_KICKERS[theme] && TOAST_KICKERS[theme][type]) || fallback;
}
