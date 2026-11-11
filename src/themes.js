// Темы оформления дневника. Тему выбирает пользователь.
import { PX_ICONS } from './pixel-icons.js';
import { ICQ_FACES, ICQ_PICT, ICQ_SIZE } from './icq-smiles.js';

export const THEMES = {
    diary: {
        name: 'Дневник',
        fonts: 'family=Caveat:wght@600;700&family=Neucha',
    },
    dark: {
        name: 'Тёмный дневник',
        fonts: 'family=Caveat:wght@600;700&family=Neucha',
    },
    icq: {
        name: 'Аська',
        // Tahoma есть почти на каждом компьютере; PT Sans — запасной, если её нет
        fonts: 'family=PT+Sans:ital,wght@0,400;0,700;1,400',
    },
    sims: {
        name: 'Как в симуляторе жизни',
        fonts: 'family=Nunito:wght@600;700;800;900',
    },
    medieval: {
        name: 'Летопись',
        fonts: 'family=Ruslan+Display&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Alegreya:ital,wght@0,400;0,500;0,700;1,400;1,500',
    },
    cyber: {
        name: 'Нейроинтерфейс',
        fonts: 'family=Russo+One&family=JetBrains+Mono:wght@400;500;600;700',
    },
    bimbo: {
        name: 'Бимбо-пикми',
        fonts: 'family=Pacifico&family=Nunito:wght@500;600;700;800',
    },
    grid: {
        name: 'Тетрадь в клетку',
        fonts: 'family=Marck+Script&family=Neucha',
    },
    china: {
        name: 'Китайский свиток',
        fonts: 'family=Prata&family=PT+Serif:ital,wght@0,400;0,700;1,400',
        // кисть только для иероглифов на печатях — грузим лишь эти знаки
        glyphs: 'family=Ma+Shan+Zheng&text=%E6%83%85%E6%84%BF%E6%83%A7%E6%A2%A6%E6%80%A7%E5%BF%83%E5%8F%B2%E7%A4%BC%E4%B9%A6%E9%AD%82%E7%BC%98',
    },
    herbal: {
        name: 'Травница',
        fonts: 'family=Pacifico&family=Philosopher:ital,wght@0,400;0,700;1,400&family=Comfortaa:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500;1,600',
    },
    arcana: {
        name: 'Аркан',
        fonts: 'family=Poiret+One&family=Forum&family=Jura:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,600;1,500;1,600',
    },
    nav: {
        name: 'Навь',
        fonts: 'family=Ruslan+Display&family=Kurale&family=Andika:ital,wght@0,400;0,700;1,400',
    },
    seance: {
        name: 'Сеанс',
        fonts: 'family=Spectral+SC:wght@400;500;600&family=Ledger&family=Cormorant+Garamond:ital,wght@0,600;1,500;1,600',
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
    vk: {
        name: 'ВКонтакте',
        fonts: 'family=Open+Sans:wght@400;600;700',
    },
};

// Цвета для карточек выбора темы: фон, чернила, акцент.
export const THEME_SWATCHES = {
    diary: ['#fbf6ea', '#2b2a4a', '#f28cb4'],
    dark: ['#1f1d26', '#ece6f5', '#c6a8ff'],
    sims: ['#eef4fb', '#2f73c0', '#7ed957'],
    medieval: ['#efe0bd', '#5a3a1a', '#a3241a'],
    cyber: ['#0b0d14', '#3ef0ff', '#ff3ea5'],
    bimbo: ['#fff0f7', '#ff3d96', '#c44fd1'],
    china: ['#2a0c10', '#d4a64a', '#e65a46'],
    herbal: ['#1b2016', '#d29a3c', '#a9bf6e'],
    arcana: ['#0d1130', '#e6c46e', '#a8b8f2'],
    grid: ['#f7f8f2', '#1f3a93', '#c0262d'],
    seance: ['#1d1916', '#c4a26f', '#d39a8c'],
    nav: ['#111814', '#d9c8a6', '#d6392e'],
    dossier: ['#d8bf8a', '#2a2a2a', '#c0262d'],
    logbook: ['#0c141a', '#f2a93f', '#62d6c8'],
    vk: ['#edeef0', '#4a76a8', '#ffffff'],
    icq: ['#dfe8f2', '#3f8f2a', '#e2453c'],
    telegram: ['#c9dbb7', '#3390ec', '#effdde'],
};

export const THEME_IDS = Object.keys(THEMES);

// Значок валюты — у каждой темы свой: сердечко-монетка, лунная монета, кристалл, дукат с короной, чип,
// бриллиант, звёздочка из тетради, цянь, росток, звёздный знак, свеча, веретено, жетон, кредит, пиксельная монета.
const CURRENCY_ICONS = {
    diary: 'cur_heart', dark: 'cur_moon', sims: 'cur_crystal', medieval: 'cur_ducat', cyber: 'cur_chip', bimbo: 'cur_gem',
    grid: 'cur_star', china: 'cashcoin', herbal: 'cur_sprout', arcana: 'cur_sigil', seance: 'cur_candle', nav: 'cur_spindle', dossier: 'cur_token', logbook: 'credit', pixel: 'pxcoin',
    vk: 'cur_vote', icq: 'cur_flower', telegram: 'cur_tgstar',
};
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
    currency: 'монетки',
    attraction: 'Что привлекает',
    wallet: 'очки',
    analyze: 'Проанализировать',
    analyzing: 'Записываю',
};

const THEME_LABELS = {
    vk: {
        title: 'Моя страница',
        moodTitle: 'Статус',
        moodLead: 'Сейчас {он}',
        feels: 'Что на душе',
        wants: 'Хочет',
        fears: 'Боится',
        chronicle: 'Стена',
        chronicleEmpty: 'На стене пока нет записей.',
        currency: 'голоса',
        shop: 'Подарки',
        rewards: 'Подарки',
        analyzing: 'Обновляю страницу',
        whois: 'Информация',
    },
    icq: {
        title: 'Аська',
        moodTitle: 'Статус',
        moodLead: '{он} сейчас',
        feels: 'Чувства',
        wants: 'Хочет',
        fears: 'Боится',
        chronicle: 'История сообщений',
        chronicleEmpty: 'История сообщений пуста.',
        currency: 'цветочки',
        shop: 'Смайлы и подарки',
        analyzing: 'Соединение…',
        whois: 'Анкета',
    },
    telegram: {
        title: 'Избранное',
        moodTitle: 'В сети',
        moodLead: 'Сейчас {он}',
        feels: 'Чувства',
        wants: 'Хочет',
        fears: 'Боится',
        chronicle: 'Закреплённые',
        chronicleEmpty: 'Пока ничего не закреплено.',
        currency: 'звёзды',
        shop: 'Подарки',
        analyzing: 'печатает…',
        whois: 'Профиль',
    },
    grid: {
        chartMark: '✓',
        currency: 'звёздочки',
        shop: 'Лавка звёздочек',
    },
    bimbo: {
        attraction: 'Мой типаж',
        currency: 'блестяшки',
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
        attraction: 'Что манит',
        currency: 'золотые',
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
        attraction: 'Триггеры притяжения',
        currency: 'кредиты',
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
        attraction: 'Что притягивает',
        currency: 'лунные монетки',
        chartMark: '☾',
        analyze: 'Разобрать',
    },
    china: {
        attraction: 'Что влечёт',
        currency: 'медные цяни',
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
    herbal: {
        attraction: 'Что манит',
        currency: 'крупицы',
        chartMark: '❦',
        persona: 'Природа души',
        title: 'Травник',
        moodTitle: 'Настрой',
        moodLead: 'Сейчас {он}',
        feels: 'Что на душе',
        wants: 'Чего просит душа',
        fears: 'Горькие корни',
        dream: 'Заветная мечта',
        traits: 'Нрав',
        traitsBase: 'Корни',
        traitsGained: 'Проросло',
        attitude: 'Как {он} к тебе',
        first: 'первая встреча',
        now: 'сейчас',
        chronicle: 'Записи травницы',
        chronicleEmpty: 'Страницы травника пока пусты.',
        whois: 'Кто это?',
        whoisTraits: 'из травника',
        empty: 'Страницы травника пусты. Записи появятся после следующего ответа.',
        noChat: 'Травник закрыт. Открой чат с персонажем.',
        settings: 'Рецепты',
        rewards: 'Гостинцы',
        shop: 'Травная лавка',
        analyze: 'Заварить сбор',
        analyzing: 'Завариваю',
    },
    arcana: {
        attraction: 'Что манит',
        currency: 'знаки',
        chartMark: '✦',
        persona: 'Натальная карта',
        title: 'Аркан',
        moodTitle: 'Знак дня',
        moodLead: 'Сейчас {он}',
        feels: 'Что выпало',
        wants: 'Карты желаний',
        fears: 'Тени расклада',
        dream: 'Путеводная звезда',
        traits: 'Суть',
        traitsBase: 'Врождённое',
        traitsGained: 'Выпало в раскладе',
        attitude: 'Связь между вами',
        first: 'первый расклад',
        now: 'сейчас',
        chronicle: 'Летопись раскладов',
        chronicleEmpty: 'Карты пока молчат.',
        whois: 'Кто это?',
        whoisTraits: 'по картам',
        empty: 'Карты ещё не легли. Расклад появится после следующего ответа.',
        noChat: 'Колода закрыта. Открой чат с персонажем.',
        settings: 'Ритуалы',
        rewards: 'Талисманы',
        shop: 'Лавка талисманов',
        analyze: 'Разложить карты',
        analyzing: 'Тасую колоду',
    },
    nav: {
        attraction: 'Что манит',
        currency: 'нити',
        chartMark: '◆',
        persona: 'Суть',
        title: 'Навь',
        moodTitle: 'На душе',
        moodLead: 'Сейчас {он}',
        feels: 'Что на душе',
        wants: 'Заветное',
        fears: 'Лихо',
        dream: 'Жар-птица',
        traits: 'Нрав',
        traitsBase: 'Врождённое',
        traitsGained: 'Проявилось',
        attitude: 'Нить меж вами',
        first: 'первая встреча',
        now: 'сейчас',
        chronicle: 'Сказ',
        chronicleEmpty: 'Сказ пока не начат.',
        whois: 'Кто это?',
        whoisTraits: 'из сказов',
        empty: 'Нить ещё не спрядена. Сказ появится после следующего ответа.',
        noChat: 'Тропа закрыта. Открой чат с персонажем.',
        settings: 'Заговоры',
        rewards: 'Обереги',
        shop: 'Лавка оберегов',
        analyze: 'Спросить у Нави',
        analyzing: 'Пряду нить',
    },
    seance: {
        attraction: 'Что манит',
        currency: 'свечи',
        chartMark: '❖',
        persona: 'Суть души',
        title: 'Сеанс',
        moodTitle: 'Аура',
        moodLead: 'Сейчас {он}',
        feels: 'Что тревожит дух',
        wants: 'Шёпот желаний',
        fears: 'Тени за спиной',
        dream: 'Заветная мечта',
        traits: 'Черты',
        traitsBase: 'Врождённое',
        traitsGained: 'Проявилось',
        attitude: 'Связь с тобой',
        first: 'первое явление',
        now: 'сейчас',
        chronicle: 'Протокол сеанса',
        chronicleEmpty: 'Завеса пока молчит.',
        whois: 'Кто это?',
        whoisTraits: 'со слов духов',
        empty: 'Завеса молчит. Голоса проявятся после следующего ответа.',
        noChat: 'Стол пуст. Открой чат с персонажем.',
        settings: 'Ритуал',
        rewards: 'Подношения',
        shop: 'Лавка подношений',
        analyze: 'Начать сеанс',
        analyzing: 'Спрашиваю духов',
    },
    dossier: {
        attraction: 'Предпочтения',
        currency: 'жетоны',
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
        attraction: 'Притяжение',
        currency: 'кредиты снабжения',
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
        attraction: 'Симпатии',
        currency: 'монеты',
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

// Темы, которые заменены новыми: гримуар → травница, тетрадь в клетку → аркан.
// пиксельная тема убрана — у кого она стояла, откроется обычный дневник
export const RENAMED_THEMES = { grimoire: 'herbal', pixel: 'diary', telegram: 'diary' };

export function validTheme(theme) {
    const t = RENAMED_THEMES[theme] || theme;
    return THEMES[t] ? t : 'diary';
}

// Значки рисуем сами (SVG), чтобы не зависеть от шрифтов и тем таверны.
const PATHS = {
    cur_star: '<path d="M12 3.5l2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.6 7.1 18.2l1.1-5.4-4-3.7 5.4-.6z"/><path d="M12 8.5v4.5M9.8 11h4.4" stroke-width="1.4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grip: '<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
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
    cur_vote: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 9h1.8l1.7 5 1.7-5h1.8l-2.6 6.5h-1.8z" fill="currentColor" stroke="none"/>',
    cur_flower: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="6.2" r="2.8"/><circle cx="17.5" cy="10.2" r="2.8"/><circle cx="15.4" cy="16.6" r="2.8"/><circle cx="8.6" cy="16.6" r="2.8"/><circle cx="6.5" cy="10.2" r="2.8"/>',
    cur_tgstar: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z" fill="currentColor" fill-opacity=".25"/>',
    cur_heart: '<circle cx="12" cy="12" r="8.5"/><path d="M12 15.8c-2.7-1.8-4-3.2-4-4.8 0-1.1.8-2 1.9-2 .9 0 1.6.5 2.1 1.3.5-.8 1.2-1.3 2.1-1.3 1.1 0 1.9.9 1.9 2 0 1.6-1.3 3-4 4.8z" fill="currentColor" stroke="none"/>',
    cur_moon: '<circle cx="12" cy="12" r="8.5"/><path d="M13.4 7.4a4.8 4.8 0 1 0 3 8.4 3.9 3.9 0 1 1-3-8.4z" fill="currentColor" stroke="none"/>',
    cur_crystal: '<path d="M12 2.6l5.2 9.4-5.2 9.4-5.2-9.4z"/><path d="M6.8 12h10.4M12 2.6v18.8" stroke-width="1.2" opacity=".6"/>',
    cur_ducat: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="6.2" stroke-width="1" opacity=".55"/><path d="M8.5 14.8l-.6-5.2 2.5 2.1 1.6-3.1 1.6 3.1 2.5-2.1-.6 5.2z" fill="currentColor" stroke="none"/>',
    cur_chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><path d="M9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/><rect x="9.6" y="9.6" width="4.8" height="4.8" fill="currentColor" stroke="none"/>',
    cur_gem: '<path d="M6.6 4.6h10.8l3.4 4.8L12 19.8 3.2 9.4z"/><path d="M3.2 9.4h17.6M9.4 4.6L8 9.4l4 10.4 4-10.4-1.4-4.8" stroke-width="1.3"/>',
    cur_sprout: '<path d="M12 21v-7.2"/><path d="M12 13.8c0-4 2.7-6.6 6.8-6.8-.2 4.1-2.8 6.8-6.8 6.8z"/><path d="M12 15.6c0-3.3-2.2-5.5-5.7-5.7.2 3.5 2.4 5.7 5.7 5.7z"/><path d="M8.5 21h7"/>',
    cur_sigil: '<circle cx="12" cy="12" r="8.5"/><path d="M12 5.8l1.4 4.8 4.8 1.4-4.8 1.4-1.4 4.8-1.4-4.8-4.8-1.4 4.8-1.4z" fill="currentColor" stroke="none"/>',
    cur_candle: '<path d="M8.8 10.6h6.4v9.6H8.8z"/><path d="M12 10.6V8.8M6.5 20.6h11"/><path d="M12 2.6c1.7 2 2.3 3.3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1 .6-2.3 2.3-4.3z" fill="currentColor" stroke="none"/>',
    cur_spindle: '<path d="M12 2.5v19"/><path d="M12 6.8c3.1 0 4.6 2.5 4.6 5.2S15.1 17.2 12 17.2 7.4 14.7 7.4 12 8.9 6.8 12 6.8z"/><path d="M7.9 10l8.2 3.6M7.9 13.6l8.2-3.6" stroke-width="1.2"/>',
    cur_token: '<path d="M3.8 7h16.4v3.2a1.8 1.8 0 0 0 0 3.6V17H3.8v-3.2a1.8 1.8 0 0 0 0-3.6z"/><path d="M9.4 7.5v9" stroke-dasharray="1.4 1.7"/><path d="M12.6 10.6h4.2M12.6 13.4h3"/>',
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
    // совместимость: магнит-сердце, магнит, ровно, перечёркнутый магнит, разбитое сердце
    wx_sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    wx_cloud: '<path d="M7 18h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/>',
    wx_rain: '<path d="M7 14h10.5a3.6 3.6 0 0 0 .4-7.2 5.6 5.6 0 0 0-10.7 1.4A2.9 2.9 0 0 0 7 14z"/><path d="M8 17.5l-1 2.5M12 17.5l-1 2.5M16 17.5l-1 2.5"/>',
    wx_storm: '<path d="M7 13h10.5a3.6 3.6 0 0 0 .4-7.2 5.6 5.6 0 0 0-10.7 1.4A2.9 2.9 0 0 0 7 13z"/><path d="M12.5 14l-2 3.5h3l-2 3.5"/>',
    wx_snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M10 4.5l2 1.5 2-1.5M10 19.5l2-1.5 2 1.5"/>',
    wx_fog: '<path d="M4 9h16M6 13h12M4 17h16"/><path d="M8 5h8"/>',
    wx_wind: '<path d="M3 9h12a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h9"/>',
    wx_sprout: '<path d="M12 21v-9"/><path d="M12 13c-4 0-6-2.5-6-6 4 0 6 2.5 6 6zM12 11c0-3.5 2-6 6-6 0 3.5-2 6-6 6z"/>',
    wx_leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19l8-8"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    bell_off: '<path d="M8.7 3A6 6 0 0 1 18 8c0 2.8.5 4.8 1.2 6.2M17 17H3s3-2 3-9c0-.7.1-1.4.4-2"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M2 2l20 20"/>',
    sparkle_off: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M3.5 3.5l17 17" stroke-width="2.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.9M16 6h2.5a2.5 2.5 0 0 1-2.6 3.9"/><path d="M12 13v3.5M9 20h6M10 16.5h4V20h-4z"/>',
    cabinet: '<rect x="4.5" y="3" width="15" height="18" rx="1.5"/><path d="M12 3v18M4.5 9.5h15M4.5 15h15"/><path d="M10.5 12.2v1M13.5 12.2v1"/>',
    chem_amazing: '<path d="M12 21s-8-4.9-8-10.6A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8 2.4C20 16.1 12 21 12 21z" fill="currentColor" fill-opacity=".85"/><path d="M12 2.2v2.6M5.2 4.4l1.7 1.8M18.8 4.4l-1.7 1.8"/>',
    chem_good: '<path d="M6.5 6v7a5.5 5.5 0 0 0 11 0V6h-3.8v7a1.7 1.7 0 0 1-3.4 0V6z"/><path d="M6.5 9.5h3.8M13.7 9.5h3.8"/><path d="M8.4 1.6v2M15.6 1.6v2M12 2.4v1.4" stroke-width="1.6"/>',
    chem_neutral: '<path d="M6.5 6v7a5.5 5.5 0 0 0 11 0V6h-3.8v7a1.7 1.7 0 0 1-3.4 0V6z"/><path d="M6.5 9.5h3.8M13.7 9.5h3.8"/>',
    chem_bad: '<path d="M6.5 6v7a5.5 5.5 0 0 0 11 0V6h-3.8v7a1.7 1.7 0 0 1-3.4 0V6z"/><path d="M6.5 9.5h3.8M13.7 9.5h3.8"/><path d="M3.5 3.5l17 17" stroke-width="2.4"/>',
    chem_awful: '<path d="M12 20.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 8a4 4 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/><path d="M12.6 8.4l-1.8 3.4 2.6 1.6-1.6 3.6" stroke-width="1.8"/>',
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
    excited: '<path d="M9 8.399999999999999l0.66 1.54 1.54 0.66-1.54 0.66-0.66 1.54-0.66-1.54-1.54-0.66 1.54-0.66z" fill="currentColor" stroke-width="1"/><path d="M15 8.399999999999999l0.66 1.54 1.54 0.66-1.54 0.66-0.66 1.54-0.66-1.54-1.54-0.66 1.54-0.66z" fill="currentColor" stroke-width="1"/><path d="M7.6 13.6h8.8c-.4 3-2.2 4.4-4.4 4.4s-4-1.4-4.4-4.4z" fill="currentColor"/>',
    pride: '<path d="M7.4 10.9c.6-1.1 2-1.1 2.6 0M14 10.9c.6-1.1 2-1.1 2.6 0"/><path d="M9.2 14.6c1.8 1.6 4.4 1.4 5.9-.8"/><path d="M18.7 3.5999999999999996l0.60 1.40 1.40 0.60-1.40 0.60-0.60 1.40-0.60-1.40-1.40-0.60 1.40-0.60z" fill="currentColor" stroke-width="1"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.3"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.3"/>',
    hope: '<path d="M7.4 8c.8-.7 2-.7 2.8 0M13.8 8c.8-.7 2-.7 2.8 0"/><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="M10 14.9c1.2 1 2.8 1 4 0"/><path d="M18.6 3.7l0.51 1.19 1.19 0.51-1.19 0.51-0.51 1.19-0.51-1.19-1.19-0.51 1.19-0.51z" fill="currentColor" stroke-width="1"/>',
    grateful: '<path d="M7.5 11c.5-1.2 2.1-1.2 2.6 0M13.9 11c.5-1.2 2.1-1.2 2.6 0"/><path d="M9.4 14.4c1.5 1.4 3.7 1.4 5.2 0"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.45"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.45"/><path d="M18.6 7.8s-1.7-1-1.7-2.2a.85.85 0 0 1 1.7-.45.85.85 0 0 1 1.7.45c0 1.2-1.7 2.2-1.7 2.2z" fill="currentColor" stroke-width="1"/>',
    desire: '<path d="M7.2 10.2h3.4M13.4 10.2h3.4"/><path d="M7.7 10.4a1.2 1.2 0 0 0 2.4 0zM13.9 10.4a1.2 1.2 0 0 0 2.4 0z" fill="currentColor" stroke-width="1.2"/><path d="M9.4 14.8c1.5 1 3.5.9 5.2-.7"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.55"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.55"/>',
    melancholy: '<path d="M7.6 8.4l2.4-.9M16.4 8.4L14 7.5"/><path d="M7.6 10.8h2.8M13.6 10.8h2.8"/><path d="M7.9 11a1.1 1.1 0 0 0 2.2 0zM13.9 11a1.1 1.1 0 0 0 2.2 0z" fill="currentColor" stroke-width="1.2"/><path d="M9.8 16c1.4-.6 3-.6 4.4 0"/>',
    hurt: '<path d="M7.4 8.6l2.6-1.1M16.6 8.6L14 7.5"/><circle cx="9" cy="10.8" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10.8" r="1.3" fill="currentColor" stroke="none"/><path d="M10.2 16.2c1.1-.9 2.5-.9 3.6 0"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.45"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.45"/><path d="M16.9 12.4c.6 1 .8 1.8.2 2.3-.6.4-1.4 0-1.3-.7.1-.6.5-1 1.1-1.6z" fill="currentColor" stroke-width="1" opacity=".75"/>',
    guilt: '<path d="M7.6 9l2.4-1.1M16.4 9L14 7.9"/><circle cx="9" cy="11.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="11.8" r="1.2" fill="currentColor" stroke="none"/><path d="M10.2 15.9c.6-.4 1.2-.4 1.8 0s1.2.4 1.8 0"/><path d="M5.6 6.6c-.6 1-.8 1.8-.2 2.3.6.4 1.4 0 1.3-.7-.1-.6-.5-1-1.1-1.6z" fill="currentColor" stroke-width="1"/>',
    irritated: '<path d="M7.4 8.6l2.8.8M16.6 8.6l-2.8.8"/><path d="M7.6 10.8h2.8M13.6 10.8h2.8"/><path d="M7.9 11a1.1 1.1 0 0 0 2.2 0zM13.9 11a1.1 1.1 0 0 0 2.2 0z" fill="currentColor" stroke-width="1.2"/><path d="M8.9 14.6h6.2v2.2H8.9zM11 14.6v2.2M13 14.6v2.2" stroke-width="1.5"/>',
    envy: '<path d="M7.4 10.2h3.2M13.4 10.2h3.2"/><path d="M8.8 10.4a1.1 1.1 0 0 0 2.2 0zM14.8 10.4a1.1 1.1 0 0 0 2.2 0z" fill="currentColor" stroke-width="1.2"/><path d="M9.2 15.6c.9-.7 2-.5 2.8 0s1.7.6 2.6-.3"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.35"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.35"/>',
    disgust: '<path d="M7.6 9.3l2.4 1.3-2.4 1.3M16.4 9.3L14 10.6l2.4 1.3"/><path d="M8.6 15c.9-.7 1.8-.7 2.6 0s1.8.7 2.6 0 1.6-.5 1.6-.5"/><path d="M11.6 15.4c.1 1.5.7 2.3 1.5 2.3s1.3-.8 1.1-2" fill="currentColor" stroke-width="1.2"/>',
    contempt: '<path d="M13.6 7.6c.8-.6 2-.6 2.8 0"/><path d="M7.6 10.4h2.8M13.6 10.4h2.8"/><path d="M7.9 10.6a1.1 1.1 0 0 0 2.2 0zM13.9 10.6a1.1 1.1 0 0 0 2.2 0z" fill="currentColor" stroke-width="1.2"/><path d="M10 15.6c1.8.3 3.5-.1 4.8-1.4"/>',
    anxious: '<path d="M7.3 8.7c.8-.8 2-.9 2.9-.4M16.7 8.7c-.8-.8-2-.9-2.9-.4"/><circle cx="9" cy="10.9" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="10.9" r="1.1" fill="currentColor" stroke="none"/><path d="M9 15.6c.6-.5 1.2-.5 1.8 0s1.2.5 1.8 0 1.2-.5 1.8 0 .6.3.6.3"/><path d="M18.4 6.6c.6 1 .8 1.8.2 2.3-.6.4-1.4 0-1.3-.7.1-.6.5-1 1.1-1.6z" fill="currentColor" stroke-width="1"/>',
    suspicious: '<path d="M13.6 7.8l3 .9"/><path d="M7.2 10.2h3.4M13.4 10.4h3.4"/><path d="M8.6 10.4a1.1 1.1 0 0 0 2.2 0zM14.8 10.6a1.1 1.1 0 0 0 2.2 0z" fill="currentColor" stroke-width="1.2"/><path d="M10 15.4h4.4"/>',
    bored: '<path d="M7.4 10.2h3.2M13.4 10.2h3.2"/><path d="M8.6 10.4a1 1 0 0 0 2 0zM14.6 10.4a1 1 0 0 0 2 0z" fill="currentColor" stroke-width="1.2"/><path d="M10.6 15.6h3.8"/><circle cx="16.4" cy="15.2" r=".75" fill="currentColor" stroke="none"/>',
    confused: '<path d="M7.4 8.3c.8-.7 2-.7 2.8 0M13.6 9.3l2.8-.6"/><circle cx="9" cy="10.9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="11.1" r="1.3" fill="currentColor" stroke="none"/><path d="M8.8 15.6l1.6-.8 1.6.8 1.6-.8 1.6.8"/><path d="M17.4 4.7c.3-1 2-1 2.1.2.1.8-1.1 1-1.1 1.9M18.4 8.3v.1" stroke-width="1.5"/>',
    curious: '<path d="M7.6 8.6h2.6M13.6 7.4c.8-.7 2-.7 2.8 0"/><circle cx="9" cy="10.9" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="10.7" r="1.8" fill="currentColor" stroke="none"/><ellipse cx="12.4" cy="15.6" rx="1" ry="1.1"/>',
    playful: '<path d="M7.5 11c.5-1.1 2.1-1.1 2.6 0"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><path d="M8.4 13.6h7.2c-.4 2.5-1.9 3.6-3.6 3.6s-3.2-1.1-3.6-3.6z"/><path d="M12.2 15.4c.2 1.7.9 2.5 1.7 2.5s1.3-.9 1.1-2.2" fill="currentColor" stroke-width="1.2"/>',
    energized: '<path d="M7.4 7.8c.8-.7 2-.7 2.8 0M13.8 7.8c.8-.7 2-.7 2.8 0"/><circle cx="9" cy="10.2" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="10.2" r="1.4" fill="currentColor" stroke="none"/><path d="M7.6 13.4h8.8c-.4 3-2.2 4.5-4.4 4.5s-4-1.5-4.4-4.5z" fill="currentColor"/><path d="M19 3.4l-2.2 3.4h1.7l-1.1 3 2.8-3.9h-1.8l1-2.5z" fill="currentColor" stroke-width=".8"/>',
    inspired: '<circle cx="9" cy="9.7" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9.7" r="1.3" fill="currentColor" stroke="none"/><path d="M7.4 7.6c.8-.6 2-.6 2.8 0M13.8 7.6c.8-.6 2-.6 2.8 0"/><path d="M9.6 13.8h4.8c-.3 1.9-1.3 2.9-2.4 2.9s-2.1-1-2.4-2.9z" fill="currentColor"/><circle cx="18.6" cy="4.9" r="1.7" stroke-width="1.3"/><path d="M17.8 7.4h1.6M18.1 8.6h1" stroke-width="1.2"/>',
    confident: '<path d="M6.4 9.2h11.2" stroke-width="1.6"/><path d="M6.9 9.2h4.3l-.4 2.3c-.2.9-.9 1.3-1.7 1.3s-1.6-.4-1.8-1.3zM12.8 9.2h4.3l-.4 2.3c-.2.9-.9 1.3-1.7 1.3s-1.6-.4-1.8-1.3z" fill="currentColor" stroke-width="1"/><path d="M9.4 15c1.6 1.1 3.6 1 5.4-.7"/>',
    flirty: '<path d="M7.4 10.4c.7.7 1.9.7 2.6 0"/><path d="M7.2 9.8l-.6-.6" stroke-width="1.3"/><circle cx="15" cy="10.6" r="1.3" fill="currentColor" stroke="none"/><path d="M9 14.2c1.8 1.7 4.2 1.7 6 0"/><ellipse cx="6.9" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.55"/><ellipse cx="17.1" cy="13.6" rx="1.7" ry="1" fill="currentColor" stroke="none" opacity="0.55"/><path d="M18.9 7.8s-1.6-.9-1.6-2a.8.8 0 0 1 1.6-.45.8.8 0 0 1 1.6.45c0 1.1-1.6 2-1.6 2z" fill="currentColor" stroke-width="1"/>',
    uncomfortable: '<path d="M7.3 9.9l2.9.7M16.7 9.9l-2.9.7"/><circle cx="9" cy="11.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="11.8" r="1.1" fill="currentColor" stroke="none"/><path d="M9 16.2l1.5-.9 1.5.9 1.5-.9 1.5.9"/><path d="M5.6 6.6c-.6 1-.8 1.8-.2 2.3.6.4 1.4 0 1.3-.7-.1-.6-.5-1-1.1-1.6z" fill="currentColor" stroke-width="1"/><path d="M17.4 5.4l.8.8M19 4.6l.6.9" stroke-width="1.2"/>',
    dazed: '<path d="M9 10.8m-.6 0a.6.6 0 1 1 1.2 0 1.2 1.2 0 1 1-2.4 0 1.8 1.8 0 1 1 3.6 0" stroke-width="1.1"/><path d="M15 10.8m-.6 0a.6.6 0 1 1 1.2 0 1.2 1.2 0 1 1-2.4 0 1.8 1.8 0 1 1 3.6 0" stroke-width="1.1"/><path d="M10.2 15.8c.6-.4 1.2-.4 1.8 0s1.2.4 1.8 0"/><path d="M18.6 3.5l0.45 1.05 1.05 0.45-1.05 0.45-0.45 1.05-0.45-1.05-1.05-0.45 1.05-0.45z" fill="currentColor" stroke-width="1"/><path d="M5.4 4.1l0.33 0.77 0.77 0.33-0.77 0.33-0.33 0.77-0.33-0.77-0.77-0.33 0.77-0.33z" fill="currentColor" stroke-width="1"/>',
};

// Фон лица — переход двух цветов эмоции (--face-bg → --face-bg2); у одноцветных они совпадают.
let faceSeq = 0;
// Смайлик QIP (тема «Аська»): неподвижный, а при наведении — анимация (если анимации не выключены)
const SMILE_BASE = new URL('../smiles/icq/', import.meta.url).href;
export function smileHtml(file, cls = '', title = '') {
    const [w, h] = ICQ_SIZE[file] || [20, 20];
    return `<span class="iw-smile ${cls}" style="--sw:${w};--sh:${h};--s:url('${SMILE_BASE}${file}.png');--a:url('${SMILE_BASE}${file}.gif')"${title ? ` title="${title}"` : ''} aria-hidden="true"></span>`;
}

// plain = нарисованный значок даже в «Аське»: смайлики настроений — только у бота и персоны, у НПС смайлик уже на значке
export function faceIcon(face, cls = '', plain = false) {
    if (!plain && iconTheme === 'icq' && ICQ_FACES[face]) return smileHtml(ICQ_FACES[face], `iw-face-ico ${cls}`);
    const inner = FACE_PATHS[face] || FACE_PATHS.neutral;
    const id = 'iwfg' + (++faceSeq).toString(36);
    return `<svg class="iw-face-ico ${cls}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color: var(--face-bg, #eee7dc)"/><stop offset="1" style="stop-color: var(--face-bg2, var(--face-bg, #eee7dc))"/></linearGradient></defs><path class="iw-face-bg" style="fill: url(#${id})" d="M12 3.2c4.9-.2 8.9 3.6 8.8 8.7-.1 4.9-3.9 8.8-8.9 8.8-4.9 0-8.7-3.8-8.7-8.8 0-4.8 3.9-8.5 8.8-8.7z"/>${inner}</svg>`;
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

// Значок-рисунок (достижения, витрина, календарь, уведомления): в «Аське» — смайлик QIP
export function pictIcon(name, cls = '') {
    if (iconTheme === 'icq' && ICQ_PICT[name]) return smileHtml(ICQ_PICT[name], `iw-pict ${cls}`);
    return icon(name, cls);
}

export const EVENT_ICONS = { achievement: 'trophy', note: 'feather', night: 'moon', rumor: 'chat',
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
    attraction: 'chem_good',
    chronicle: 'scroll',
    rewards: 'gift',
    nights: 'moon',
    rumors: 'chat',
};

// Подписи всплывашек в духе темы.
const TOAST_KICKERS = {
    bimbo: { want_done: 'Ура-ура, сбылось! ♡', fear_real: 'Почему тучка плачет? Страх сбылся…', fear_gone: 'Фух, больше не страшно ✨', trait_new: 'Новый вайб, кис', trait_up: 'Вайб усилился, коть', trait_down: 'Вайб слабеет…', trait_gone: 'Вайб ушёл, пока-пока', dream_step: 'Шажочек к мечте ✨', dream_done: 'Мечта сбылась, ааа!! ♡', dream_change: 'Новая мечточка ✨', dream_grow: 'Мечта стала больше ♡', impression: 'Первое впечатление, зай', attitude: 'Ой, отношение поменялось!', reward: 'Обновочка, кис ♡' },
    medieval: { attitude: 'Переменилось отношение', want_done: 'Желание исполнилось', fear_real: 'Сбылся страх', trait_new: 'Новая черта нрава', dream_step: 'Шаг к великой мечте', impression: 'Первое суждение' },
    china: { want_done: 'Желание исполнилось', fear_real: 'Страх обрёл плоть', fear_gone: 'Тревога рассеялась', trait_new: 'Обретена новая черта', dream_step: 'Шаг по пути сердца', dream_done: 'Путь пройден', dream_change: 'Путь изменился', dream_grow: 'Путь стал шире', impression: 'Первая встреча', attitude: 'Сердце переменилось', reward: 'Дар принят' },
    herbal: { want_done: 'Желание сбылось', fear_real: 'Горький корень дал всходы: страх сбылся', fear_gone: 'Горечь ушла', trait_new: 'Проросла новая черта', trait_up: 'Черта окрепла', trait_down: 'Черта вянет', trait_gone: 'Черта увяла', dream_step: 'Мечта набирает силу', dream_done: 'Мечта расцвела', dream_change: 'Мечта пустила новые корни', dream_grow: 'Мечта разрослась', impression: 'Первая встреча', attitude: 'Отношение переменилось', reward: 'Гостинец получен' },
    arcana: { want_done: 'Карта сыграла: желание сбылось', fear_real: 'Выпала тёмная карта: страх сбылся', fear_gone: 'Тень ушла из расклада', trait_new: 'Открылась новая карта', trait_up: 'Карта усилилась', trait_down: 'Карта слабеет', trait_gone: 'Карта ушла из расклада', dream_step: 'Звезда ближе', dream_done: 'Звезда достигнута', dream_change: 'Звезда сменилась', dream_grow: 'Звезда засияла ярче', impression: 'Первый расклад', attitude: 'Связь переменилась', reward: 'Талисман получен' },
    nav: { want_done: 'Желание сбылось', fear_real: 'Лихо пришло: страх сбылся', fear_gone: 'Лихо отступило', trait_new: 'Проявилась новая черта', trait_up: 'Черта окрепла', trait_down: 'Черта слабеет', trait_gone: 'Черта ушла', dream_step: 'Шаг к Жар-птице', dream_done: 'Жар-птица поймана', dream_change: 'Мечта сменилась', dream_grow: 'Мечта разрослась', impression: 'Первая встреча', attitude: 'Нить натянулась иначе', reward: 'Оберег получен' },
    seance: { want_done: 'Желание сбылось', fear_real: 'Тень явилась: страх сбылся', fear_gone: 'Тень отступила', trait_new: 'Проявилась новая черта', trait_up: 'Черта окрепла', trait_down: 'Черта слабеет', trait_gone: 'Черта растаяла', dream_step: 'Шаг к заветному', dream_done: 'Заветное свершилось', dream_change: 'Духи сказали иное', dream_grow: 'Мечта стала шире', impression: 'Первое явление', attitude: 'Связь дрогнула', reward: 'Подношение принято' },
    dossier: { want_done: 'Мотив реализован', fear_real: 'ВНИМАНИЕ: уязвимость подтвердилась', fear_gone: 'Угроза снята', trait_new: 'Выявлена новая черта', trait_up: 'Черта усилилась', trait_down: 'Черта ослабла', trait_gone: 'Черта утрачена', dream_step: 'Продвижение к цели', dream_done: 'Цель достигнута', dream_change: 'Цель сменилась', dream_grow: 'Цель расширена', impression: 'Новый фигурант', attitude: 'Отношение изменилось', reward: 'Поощрение выдано' },
    logbook: { want_done: 'Задача выполнена', fear_real: 'ТРЕВОГА: риск сработал', fear_gone: 'Риск миновал', trait_new: 'Профиль обновлён', trait_up: 'Профиль обновлён', trait_down: 'Профиль обновлён', trait_gone: 'Профиль обновлён', dream_step: 'Курс выдержан', dream_done: 'Пункт назначения достигнут', dream_change: 'Курс изменён', dream_grow: 'Курс продлён', impression: 'Первый контакт', attitude: 'Связь изменилась', reward: 'Груз получен' },
    cyber: { attitude: 'RELATION SHIFT', want_done: 'TASK COMPLETE', fear_real: 'THREAT DETECTED', fear_gone: 'THREAT CLEARED', trait_new: 'PROFILE UPDATE', trait_up: 'PROFILE UPDATE', trait_down: 'PROFILE UPDATE', dream_step: 'DIRECTIVE PROGRESS', dream_done: 'DIRECTIVE COMPLETE', impression: 'NEW CONTACT' },
    vk: { want_done: 'Новое уведомление: желание сбылось', fear_real: 'Новое уведомление: страх сбылся', fear_gone: 'Страх больше не беспокоит', trait_new: 'Обновлена информация: новая черта', trait_up: 'Обновлена информация', trait_down: 'Обновлена информация', dream_step: 'Шаг к мечте', dream_done: 'Мечта сбылась!', attitude: 'Изменилось отношение', impression: 'Новый друг', reward: 'Вам подарок' },
    icq: { want_done: 'О-оу! Желание сбылось', fear_real: 'О-оу! Страх сбылся', fear_gone: 'Страх ушёл в оффлайн', trait_new: 'Анкета обновлена', trait_up: 'Анкета обновлена', trait_down: 'Анкета обновлена', dream_step: 'Шаг к мечте', dream_done: 'Мечта сбылась!', attitude: 'Новое сообщение: отношение', impression: 'Добавлен в контакты', reward: 'Новый подарок' },
    telegram: { want_done: 'Желание сбылось ✓✓', fear_real: 'Страх сбылся', fear_gone: 'Страх отпустил', trait_new: 'Новая черта', trait_up: 'Черта окрепла', trait_down: 'Черта ослабла', dream_step: 'Шаг к мечте', dream_done: 'Мечта сбылась!', attitude: 'Новое сообщение', impression: 'Новый контакт', reward: 'Подарок' },
    pixel: { want_done: 'Квест выполнен!', fear_real: 'Получен урон!', fear_gone: 'Угроза пройдена', trait_new: 'Новый перк!', trait_up: 'Перк прокачан', trait_down: 'Перк ослаб', trait_gone: 'Перк потерян', dream_step: 'Прогресс главного квеста', dream_done: 'Главный квест пройден!', dream_change: 'Новый главный квест', dream_grow: 'Квест расширен', impression: 'Новый персонаж!', attitude: 'Отношение изменилось', reward: 'Лут получен!' },
};

// Подпись листика с ошибкой дневника — в голосе темы.
const ERROR_KICKERS = {
    diary: 'Не получилось', dark: 'Не получилось', sims: 'Ой! Ошибка', grid: 'Ошибка — исправить!',
    vk: 'Ошибка', icq: 'О-оу! Ошибка соединения', telegram: 'Не удалось отправить',
    bimbo: 'Ой-ой, ошибочка…', medieval: 'Худая весть', cyber: 'ERR // сбой', china: 'Кисть сорвалась',
    herbal: 'Отвар не удался', arcana: 'Карты спутались', seance: 'Связь оборвалась', nav: 'Нить оборвалась', dossier: 'СБОЙ: дело не оформлено', logbook: 'СБОЙ СИСТЕМЫ', pixel: 'GAME OVER? Нет, просто ошибка',
};
export function errorKicker(theme) {
    return ERROR_KICKERS[theme] || 'Не получилось';
}

export function toastKicker(theme, type, fallback) {
    return (TOAST_KICKERS[theme] && TOAST_KICKERS[theme][type]) || fallback;
}
