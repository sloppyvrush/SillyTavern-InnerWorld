// Чистая логика «Внутреннего мира»: состояние, разбор ответа модели, сравнение, тексты.
// Здесь нет обращений к таверне, поэтому файл можно проверять тестами в node.

export const MODULES = ['mood', 'wants', 'fears', 'dream', 'traits', 'impression', 'attraction', 'chronicle'];
// Блоки, которые спрашивают у модели (хроника собирается сама и токенов не тратит).
export const MODEL_MODULES = ['mood', 'wants', 'fears', 'dream', 'traits', 'impression', 'attraction'];

export const MODULE_NAMES = {
    mood: 'Настроение',
    wants: 'Желания',
    fears: 'Страхи',
    dream: 'Мечта жизни',
    traits: 'Черты',
    impression: 'Отношение к тебе',
    attraction: 'Что привлекает',
    chronicle: 'Хроника',
};

export const DEFAULT_SETTINGS = {
    enabled: true,
    modules: { mood: true, wants: true, fears: true, dream: true, traits: true, impression: true, attraction: true, chronicle: true },
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
    budgetMode: 'auto',      // auto — запас считается по сцене, но не выше потолка; fixed — ровно responseLength
    budgetCap: 8000,
    responseLength: 4000,
    persona: true,           // вести дневник персоны игрока (только для информации, на ответы бота не влияет)
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
    toastPos: 'top',         // где всплывают уведомления: top | bottom
    collapsed: {},           // свёрнутые блоки дневника: { mood: true, … }
    attrPower: 'medium',      // как симпатии и антипатии влияют на чат: max | strong | medium | soft | faint | none
    attrInfluence: 'medium',  // выводится из attrPower: тон подсказки strong | medium | light | none
    attrDepth: 4,            // выводится из attrPower: глубина подсказки
    animations: true,        // анимации в дневнике; выключить — всё статично
    liveView: true,          // живой листок: как модель пишет дневник (потоком, если подключение умеет)
    volume: 45,              // громкость звуков, 0–100
    analyzeWhen: 'after',    // after — после ответа бота; parallel — пока бот пишет (быстрее, отстаёт на ответ)
    clock: true,             // часы и календарь сцены
    clockStep: 5,            // сколько минут проходит за обычный ответ без явного таймскипа
    clockInject: true,       // подсказывать модели время сцены
    points: true,            // очки за желания и мечту + награды
};

// Как выглядит лицо персонажа на вкладке: смайлик и цвет по настроению.
export const FACES = [
    'joy', 'excited', 'playful', 'energized', 'inspired', 'pride', 'confident', 'hope', 'grateful', 'calm', 'love', 'flirty', 'desire', 'shy',
    'sad', 'melancholy', 'hurt', 'guilt', 'angry', 'irritated', 'envy', 'disgust', 'contempt',
    'fear', 'anxious', 'suspicious', 'uncomfortable', 'tired', 'bored', 'focus', 'surprise', 'dazed', 'confused', 'curious', 'neutral',
];
export const FACE_NAMES = {
    joy: 'радость', excited: 'азарт, восторг', playful: 'озорство', energized: 'бодрость', inspired: 'вдохновение',
    pride: 'гордость', confident: 'уверенность', hope: 'надежда', grateful: 'благодарность',
    calm: 'спокойствие', love: 'нежность', flirty: 'кокетство, флирт', desire: 'страсть, влечение', shy: 'смущение',
    sad: 'грусть', melancholy: 'тоска', hurt: 'обида', guilt: 'вина, стыд',
    angry: 'злость', irritated: 'раздражение', envy: 'зависть, ревность', disgust: 'отвращение', contempt: 'презрение',
    fear: 'страх', anxious: 'тревога', suspicious: 'подозрение', uncomfortable: 'дискомфорт', tired: 'усталость', bored: 'скука, апатия',
    focus: 'сосредоточенность', surprise: 'удивление', dazed: 'оглушённость', confused: 'растерянность', curious: 'любопытство', neutral: 'ровно',
};

// Если модель не сказала, какое у эмоции лицо, угадываем по слову. Порядок важен: первое совпадение побеждает,
// поэтому точные чувства стоят раньше общих («беспокойство» — не «спокойствие», «недовольство» — не «довольство»).
const FACE_WORDS = [
    ['disgust', ['отвращ', 'брезг', 'омерз', 'гадлив', 'тошн', 'мерзост']],
    ['contempt', ['презр', 'пренебреж', 'высокомер', 'снисходител', 'надменн', 'свысока']],
    ['envy', ['завист', 'завид', 'ревн', 'соперн', 'обделен']],
    ['irritated', ['раздраж', 'досад', 'недовол', 'нетерп', 'раздосад', 'бесит', 'взвинч']],
    ['angry', ['зл', 'гнев', 'ярост', 'бешен', 'ненавист', 'зол', 'злит', 'злоб', 'сердит', 'рассерж', 'взбеш', 'возмущ', 'негодов', 'свирепо']],
    ['anxious', ['тревог', 'тревож', 'беспокой', 'волнен', 'волну', 'нервн', 'нервоз', 'напряж', 'неуверен', 'озабоч', 'мандраж', 'дерган', 'на взводе', 'опас']],
    ['fear', ['страх', 'боязн', 'испуг', 'паник', 'ужас', 'напуган', 'испуган', 'боит', 'жутк', 'трепет']],
    ['uncomfortable', ['дискомф', 'неудоб', 'неуют', 'голод', 'замерз', 'продрог', 'озноб', 'мерзн', 'зуд', 'духот', 'тесн', 'жарко', 'холодно', 'липк']],
    ['suspicious', ['подозр', 'недовер', 'насторож', 'сомнен', 'бдител']],
    ['guilt', ['вин', 'стыд', 'раская', 'сожал', 'угрызен', 'совест']],
    ['hurt', ['обид', 'обиж', 'разочар', 'уязвл', 'гореч', 'задет', 'оскорбл']],
    ['melancholy', ['тоск', 'одино', 'ностальг', 'меланх', 'скучает', 'скучани', 'скучаю', 'светлая грусть']],
    ['sad', ['груст', 'печал', 'горе', 'горест', 'горьк', 'боль', 'отчаян', 'скорб', 'уныни', 'расстро', 'подавлен', 'грущ', 'безнадеж', 'несчаст', 'слез']],
    ['shy', ['смущ', 'неловк', 'стесн', 'робост', 'застенч', 'конфуз']],
    ['dazed', ['оглуш', 'контуж', 'ступор', 'оцепен', 'прострац', 'дурман', 'одурман', 'опьян', 'пьян', 'головокруж', 'в тумане', 'туман в голове', 'ошалел', 'ошарашен', 'ошелом']],
    ['bored', ['скук', 'скучн', 'апат', 'безразлич', 'равнодуш', 'опустош', 'пустот']],
    ['tired', ['устал', 'измот', 'выгор', 'сонлив', 'вял', 'изнур', 'утомл']],
    ['flirty', ['кокет', 'флирт', 'заигрыв', 'игривое кокет']],
    ['desire', ['страст', ' влечен', 'вожделен', 'желани', 'жажд', 'возбужд', 'томлен']],
    ['grateful', ['благодар', 'признател', 'тронут']],
    ['love', ['нежн', 'любов', 'любв', 'влюбл', 'привяз', 'забот', 'умил', 'тепл', 'симпат', 'нежен', 'очарован', 'сердечн', 'обожан']],
    ['focus', ['сосредоточ', 'решим', 'решител', 'собран', 'целеустрем', 'упрям', 'деловит', 'настойчив', 'сосредот', 'концентр']],
    ['confused', ['растерян', 'замешат', 'недоум', 'озадач', 'смятен', 'сбит с толку']],
    ['curious', ['любопыт', 'интерес', 'увлеч', 'заинтриг']],
    ['surprise', ['удивл', 'изумл', 'шок', 'поражен', 'оторопь']],
    ['hope', ['надежд', 'надея', 'мечтат', 'оптимиз', 'вера в']],
    ['inspired', ['вдохнов', 'озарен', 'творческ', 'креатив']],
    ['playful', ['озорн', 'озорств', 'игрив', 'шалов', 'дураш', 'хулиган', 'смешлив', 'проказ', 'баловств', 'веселый кураж']],
    ['energized', ['бодр', 'энерги', 'задор', 'прилив сил', 'заряжен', 'полон сил', 'неугомон']],
    ['excited', ['азарт', 'воодушев', 'предвкуш', 'восторг', 'энтузиаз', 'ликов', 'эйфор', 'кураж']],
    ['pride', ['горд', 'торжеств', 'триумф', 'самодовол', 'превосход', 'тщеслав', 'польщен']],
    ['confident', ['уверен', 'самоувер', 'смел', 'храбр', 'отваг', 'бесстраш', 'дерз', 'хладнокров', 'невозмут']],
    ['calm', ['спокой', 'спокоен', 'умиротвор', 'облегч', 'безмятеж', 'расслаб', 'покой', 'смирен', 'умирот']],
    ['joy', ['рад', 'счаст', 'весел', 'довол', 'восхищ', 'удовлетвор', 'наслажд', 'блаженств', 'ликов']],
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
// Совместимость, как в «Симс»: насколько персонажи подходят друг другу по чертам и типу личности.
export const CHEM_LEVELS = ['amazing', 'good', 'neutral', 'bad', 'awful'];
export const CHEM_SCORE = { amazing: 3, good: 2, neutral: 0, bad: -2, awful: -3 };
export function chemLevelOf(score) {
    const v = Number(score) || 0;
    return v >= 3 ? 'amazing' : v >= 1 ? 'good' : v <= -3 ? 'awful' : v <= -1 ? 'bad' : 'neutral';
}
export const CHEM_NOW_NAMES = { 3: 'Сильное притяжение', 2: 'Тянет друг к другу', 1: 'Есть симпатия', 0: 'Ровно', '-1': 'Холодок', '-2': 'Отталкивает', '-3': 'Сильное отторжение' };
export const CHEM_NAMES = { amazing: 'Родственные души', good: 'Есть контакт', neutral: 'Ровно', bad: 'Не по душе', awful: 'Как кошка с собакой' };

// Что привлекает и что отталкивает (как «turn-ons / turn-offs» в «Симс»): готовые теги по разделам.
export const ATTRACT_CATALOG = {
    'Телосложение': ['худощавые', 'стройные', 'спортивные', 'накачанные', 'крепкие', 'с формами', 'пухленькие', 'высокие', 'невысокие', 'широкоплечие', 'изящные'],
    'Внешность': ['темноволосые', 'светловолосые', 'рыжие', 'седые', 'кудрявые', 'с длинными волосами', 'коротко стриженные', 'лысые', 'голубоглазые', 'кареглазые', 'зеленоглазые', 'выразительные глаза', 'смуглые', 'бледные', 'красивая улыбка', 'красивые руки'],
    'Приметы': ['с бородой', 'с щетиной', 'с веснушками', 'с родинками', 'с татуировками', 'с пирсингом', 'со шрамами', 'в очках', 'с ямочками на щеках'],
    'Стиль': ['ухоженные', 'стильно одетые', 'в строгом костюме', 'в коже', 'спортивный стиль', 'небрежный вид', 'яркий макияж', 'без макияжа', 'с украшениями'],
    'Голос и запах': ['низкий голос', 'бархатный голос', 'хрипотца в голосе', 'звонкий смех', 'приятный запах', 'запах табака', 'запах парфюма'],
    'Характер': ['харизматичные', 'надёжные', 'уверенные в себе', 'добрые', 'заботливые', 'нежные', 'весёлые', 'остроумные', 'умные', 'честные', 'смелые', 'дерзкие', 'загадочные', 'застенчивые', 'спокойные', 'вспыльчивые', 'амбициозные', 'романтичные', 'независимые', 'властные', 'преданные', 'ревнивые', 'грубые', 'лживые', 'трусливые', 'самовлюблённые'],
    'Образ жизни': ['активные', 'домоседы', 'авантюристы', 'трудоголики', 'тусовщики', 'хозяйственные', 'опрятные', 'неряшливые', 'при деньгах', 'с опасной работой', 'с тёмным прошлым', 'курящие', 'пьющие', 'верующие'],
    'Увлечения': ['музыка', 'книги', 'кулинария', 'спорт', 'искусство', 'техника', 'игры', 'путешествия', 'природа', 'животные', 'танцы', 'наука', 'оружие', 'машины'],
};
// В какой раздел попадает тег (свои теги — в «Другое»).
export function attractCategory(tag) {
    const t = String(tag || '').toLowerCase().trim();
    for (const [cat, tags] of Object.entries(ATTRACT_CATALOG)) if (tags.includes(t)) return cat;
    return 'Другое';
}

export const POINTS = { want_done: 10, fear_gone: 5, dream_step: 25, dream_done: 100 };
export const REWARD_KINDS = ['buff', 'event', 'collect'];
export const REWARD_ICONS = ['gift', 'star', 'cake', 'ribbon', 'key', 'flower', 'potion', 'crown', 'note', 'book', 'sun', 'moon', 'heart', 'cup', 'letter', 'feather', 'shield', 'gem'];

const WANT_STATUS = ['active', 'done', 'dropped'];
const FEAR_STATUS = ['active', 'realized', 'gone'];
const TRAIT_KINDS = ['base', 'up', 'new', 'down', 'gone'];
export const TRAIT_GONE_TURNS = 2; // столько ответов ушедшая черта видна зачёркнутой, чтобы её можно было вернуть

// Запас токенов на ответ. Модель останавливают, когда он кончился, — поэтому обрыв = мало запаса.
// Платится только то, что модель реально написала (и продумала), запас лишь задаёт предел.
// «Сам»: считаем по сцене (сколько персонажей, какие блоки, какой разбор) и никогда не выходим за потолок.
// Повторных запросов дневник сам не делает — токены не утекают незаметно.
export const THINKING_MODEL = /gemini-(2\.5|3)|think|reason|deepseek-r|-r1\b|\bo[134](-|$)|gpt-5|qwq|kimi-k2|glm-4\.[5-9]|magistral|claude-(opus|sonnet)-4/i;
export function responseBudget(s, { kind = 'chat', mains = 1, npcs = 0, model = '' } = {}) {
    if (s.budgetMode === 'fixed') return Math.max(1000, Number(s.responseLength) || 4000);
    const cap = Math.max(2000, Number(s.budgetCap) || 8000);
    const on = MODEL_MODULES.filter(m => s.modules && s.modules[m]).length / MODEL_MODULES.length;
    let need;
    if (kind === 'roster') need = 3000;
    else if (kind === 'dream') need = 1000;
    else if (kind === 'rewards') need = 1600;
    else if (kind === 'test') need = 300;
    else {
        const per = Math.max(1, mains) * 900 + Math.max(0, npcs) * 450;
        need = 600 + per * Math.max(0.3, on) * (kind === 'chat' ? 1 : 1.6);
    }
    if (THINKING_MODEL.test(model || '')) need += kind === 'test' ? 1500 : 2500; // место на размышления
    return Math.min(cap, Math.max(1500, Math.ceil(need / 100) * 100));
}

// Ошибки дневника по видам: что случилось и что с этим сделать.
export function classifyError(err, { raw = '', cut = false, budget = 0 } = {}) {
    const msg = String((err && (err.message || err.error || err)) || '');
    const low = msg.toLowerCase();
    const tok = budget ? ` Сейчас запас: ${budget} токенов.` : '';
    const more = 'Подними запас в настройках дневника («Подключение» → «Запас на ответ» или его потолок).';
    if (cut) return { kind: 'cut', title: 'Не хватило запаса', text: 'Модель не успела дописать запись: ответ оборвался на середине. Сохранила то, что успело прийти.' + tok, hint: more + ' Думающие модели тратят запас ещё и на размышления.', settings: true };
    if (/не заполнено|не выбран|выбери профиль/.test(low)) return { kind: 'settings', title: 'Подключение не настроено', text: msg, hint: 'Открой настройки дневника, раздел «Подключение».', settings: true };
    if (/\b(401|403)\b|unauthor|forbidden|invalid.*key|api key|ключ/.test(low)) return { kind: 'auth', title: 'Нет доступа к модели', text: 'Модель отказала в доступе: ключ не подошёл или закончился.', hint: 'Проверь ключ или профиль подключения.', settings: true };
    if (/\b429\b|rate.?limit|quota|too many requests|resource.?exhausted|лимит/.test(low)) return { kind: 'rate', title: 'Модель просит подождать', text: 'Слишком много запросов или закончилась квота.', hint: 'Подожди минуту и попробуй снова.' };
    if (/context|too long|maximum.*(length|tokens)|token limit|prompt is too long|\b413\b|слишком длин/.test(low)) return { kind: 'context', title: 'Слишком длинный запрос', text: 'Чат, карточка и лорбуки не поместились в модель.', hint: 'Уменьши «Сколько последних сообщений читать» или число персонажей, либо сними лишние лорбуки.', settings: true };
    if (/safety|blocked|content.?filter|prohibited|recitation|policy|отказ/.test(low)) return { kind: 'safety', title: 'Модель отказалась отвечать', text: 'Сработал фильтр модели.', hint: 'Попробуй ещё раз или выбери для дневника другую модель.' };
    if (/\b5\d\d\b|overload|unavailable|internal server|bad gateway|timeout|timed out/.test(low)) return { kind: 'server', title: 'Модель сейчас недоступна', text: 'Сервер модели перегружен или не ответил вовремя.', hint: 'Попробуй чуть позже или выбери другую модель.' };
    if (/failed to fetch|network|networkerror|load failed|econn/.test(low)) return { kind: 'network', title: 'Нет связи с моделью', text: 'Запрос не дошёл до модели.', hint: 'Проверь интернет, прокси или адрес API.', settings: true };
    const empty = !String(raw || '').trim();
    if (/пустой ответ|нет json/.test(low) && (empty || /<\/?think/i.test(raw))) return { kind: 'thinking', title: 'Не хватило запаса на ответ', text: 'Модель потратила весь запас на размышления, и до записи дело не дошло.' + tok, hint: more, settings: true };
    if (/json|испорчен|списка персонажей/.test(low)) return { kind: 'format', title: 'Модель ответила не по форме', text: 'Ответ пришёл, но дневник не смог его прочитать.', hint: 'Попробуй ещё раз. Если повторяется — выбери другую модель для дневника.' };
    if (/ни одного персонажа/.test(low)) return { kind: 'nochars', title: 'В сцене никого не нашлось', text: 'Модель не вернула ни одного персонажа.', hint: 'Проверь в настройках, кого вести, или нажми «Всё сразу».' };
    return { kind: 'other', title: 'Что-то пошло не так', text: msg || 'Неизвестная ошибка.', hint: 'Попробуй ещё раз.' };
}

// Знак зодиака: считается по дню и месяцу рождения (надёжнее, чем просить модель).
export const ZODIAC = {
    capricorn: { name: 'Козерог', glyph: '♑', el: 'earth', text: 'Земля: честолюбие, выдержка, долгие планы.' },
    aquarius: { name: 'Водолей', glyph: '♒', el: 'air', text: 'Воздух: независимость, необычный взгляд, дружба на расстоянии.' },
    pisces: { name: 'Рыбы', glyph: '♓', el: 'water', text: 'Вода: мечтательность, сострадание, уход в себя.' },
    aries: { name: 'Овен', glyph: '♈', el: 'fire', text: 'Огонь: напор, азарт, первым бросается в бой.' },
    taurus: { name: 'Телец', glyph: '♉', el: 'earth', text: 'Земля: упорство, любовь к комфорту, надёжность.' },
    gemini: { name: 'Близнецы', glyph: '♊', el: 'air', text: 'Воздух: любопытство, живой ум, переменчивость.' },
    cancer: { name: 'Рак', glyph: '♋', el: 'water', text: 'Вода: чувствительность, забота о своих, долгая память на обиды.' },
    leo: { name: 'Лев', glyph: '♌', el: 'fire', text: 'Огонь: гордость, щедрость, любит быть в центре.' },
    virgo: { name: 'Дева', glyph: '♍', el: 'earth', text: 'Земля: внимание к мелочам, порядок, строгость к себе.' },
    libra: { name: 'Весы', glyph: '♎', el: 'air', text: 'Воздух: дипломатичность, чувство меры, нерешительность.' },
    scorpio: { name: 'Скорпион', glyph: '♏', el: 'water', text: 'Вода: страсть, скрытность, не прощает предательства.' },
    sagittarius: { name: 'Стрелец', glyph: '♐', el: 'fire', text: 'Огонь: свобода, прямота, тяга к дальним дорогам.' },
};
const ZODIAC_EDGES = [[20, 'capricorn', 'aquarius'], [19, 'aquarius', 'pisces'], [21, 'pisces', 'aries'], [20, 'aries', 'taurus'], [21, 'taurus', 'gemini'], [21, 'gemini', 'cancer'], [23, 'cancer', 'leo'], [23, 'leo', 'virgo'], [23, 'virgo', 'libra'], [23, 'libra', 'scorpio'], [22, 'scorpio', 'sagittarius'], [22, 'sagittarius', 'capricorn']];
export function zodiacOf(d, m) {
    const e = ZODIAC_EDGES[m - 1];
    if (!e || !(d >= 1 && d <= 31)) return '';
    return d < e[0] ? e[1] : e[2];
}
export function cleanZodiac(v) {
    const x = String(v || '').toLowerCase().trim();
    if (!x) return '';
    if (ZODIAC[x]) return x;
    const hit = Object.entries(ZODIAC).find(([, z]) => z.name.toLowerCase() === x);
    return hit ? hit[0] : '';
}
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
// Дата рождения из того, как её написала модель: 14.03.1968, 14.03, 1968-03-14, «14 марта 1968», «March 14, 1968».
export function parseBorn(v) {
    const t = String(v || '').toLowerCase().trim();
    if (!t) return null;
    let d, m, y;
    let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
    if (!r && (r = t.match(/(\d{1,2})\s*[./]\s*(\d{1,2})(?:\s*[./]\s*(\d{2,4}))?/))) { d = +r[1]; m = +r[2]; y = r[3] ? +r[3] : undefined; }
    if (!r && (r = t.match(/(\d{1,2})\s+([а-яё]+)(?:\s+(\d{3,4}))?/))) {
        d = +r[1];
        const w = r[2];
        m = w.startsWith('ма') ? (w.startsWith('мар') ? 3 : 5) : MONTHS.findIndex(x => w.startsWith(x)) + 1;
        y = r[3] ? +r[3] : undefined;
    }
    if (!r && (r = t.match(/([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{3,4}))?/))) {
        m = MONTHS_EN.findIndex(x => r[1].startsWith(x)) + 1;
        d = +r[2];
        y = r[3] ? +r[3] : undefined;
    }
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    if (y !== undefined && y < 100) y = undefined;
    return y ? { d, m, y } : { d, m };
}
export function bornText(b) {
    return b ? `${b.d} ${MONTH_GEN[b.m - 1]}${b.y ? ' ' + b.y : ''}` : '';
}

// Тип личности (16 типов, как в тесте 16personalities) и темперамент — из характера по карточке и лорбуку.
export const PTYPES = {
    INTJ: 'Архитектор', INTP: 'Логик', ENTJ: 'Командир', ENTP: 'Полемист',
    INFJ: 'Заступник', INFP: 'Посредник', ENFJ: 'Протагонист', ENFP: 'Активист',
    ISTJ: 'Логист', ISFJ: 'Защитник', ESTJ: 'Менеджер', ESFJ: 'Консул',
    ISTP: 'Виртуоз', ISFP: 'Авантюрист', ESTP: 'Предприниматель', ESFP: 'Артист',
};
// Группа типа: аналитики (NT), дипломаты (NF), стражи (SJ), искатели (SP).
export function ptypeGroup(code) {
    const c = String(code || '');
    if (c[1] === 'N') return c[2] === 'T' ? 'analyst' : 'diplomat';
    if (c[1] === 'S') return c[3] === 'J' ? 'sentinel' : 'explorer';
    return '';
}
export const PTYPE_GROUPS = { analyst: 'Аналитики', diplomat: 'Дипломаты', sentinel: 'Стражи', explorer: 'Искатели' };
export const TEMPERS = { choleric: 'холерик', sanguine: 'сангвиник', phlegmatic: 'флегматик', melancholic: 'меланхолик' };
const TEMPER_RU = { холерик: 'choleric', сангвиник: 'sanguine', флегматик: 'phlegmatic', меланхолик: 'melancholic' };
export function cleanPtype(v) {
    const m = String(v || '').toUpperCase().replace(/[^A-Z-]/g, '').match(/^([EI][SN][TF][JP])(?:-?([AT]))?$/);
    return m ? m[1] + (m[2] ? '-' + m[2] : '') : '';
}
export function cleanTemper(v) {
    const x = String(v || '').toLowerCase().trim();
    if (TEMPERS[x]) return x;
    return TEMPER_RU[x] || '';
}
const TONES = ['good', 'bad', 'mid'];
const WEIGHTS = ['light', 'medium', 'deep'];

// Сколько ответов живёт эмоция в зависимости от силы: [минимум, по умолчанию, максимум].
export const WEIGHT_TURNS = {
    light: [1, 2, 2],
    medium: [2, 4, 6],
    deep: [6, 12, 25],
};

const MAX_MOODLETS = 8;
export const GOAL_LINGER = 3; // столько ответов исполненное желание и сбывшийся страх ещё видны (и влияют на поведение)
const MAX_GOALS = 3;
const MAX_TRAITS = 8;
const TRAIT_COOLDOWN = 3; // столько обновлений после изменения характера новые изменения не принимаются
const DREAM_COOLDOWN = 6; // мечта меняется редко: не чаще, чем раз в столько обновлений
export const SHOWN_MOODLETS = 3; // столько эмоций видно сразу, остальные — под «ещё»

// Варианты числовых настроек — одни и те же в настройках и в быстрых кнопках пустого дневника.
export const CONTEXT_OPTIONS = [2, 4, 6, 8, 10, 15, 20];
export const CATCHUP_OPTIONS = [6, 8, 10, 12, 15, 20, 30];
export const BUDGET_CAP_OPTIONS = [4000, 6000, 8000, 12000, 16000];
export const RESPONSE_LENGTH_OPTIONS = [2000, 3000, 4000, 6000, 8000, 12000, 16000];

// Одна настройка силы влияния притяжения → тон подсказки и её глубина в чате.
export const ATTR_POWER = {
    max: ['strong', 1], strong: ['strong', 2], medium: ['medium', 4], soft: ['light', 6], faint: ['light', 10], none: ['none', 4],
};

export function applyAttrPower(s) {
    const [inf, depth] = ATTR_POWER[s.attrPower] || ATTR_POWER.medium;
    s.attrInfluence = inf;
    s.attrDepth = depth;
    return s;
}

export function mergeSettings(saved) {
    const s = Object.assign({}, DEFAULT_SETTINGS, saved || {});
    s.modules = Object.assign({}, DEFAULT_SETTINGS.modules, (saved && saved.modules) || {});
    s.moodTurns = Object.assign({}, DEFAULT_SETTINGS.moodTurns, (saved && saved.moodTurns) || {});
    s.rosters = Object.assign({}, (saved && saved.rosters) || {});
    s.collapsed = Object.assign({}, (saved && saved.collapsed) || {});
    if (s.theme === 'auto') s.theme = 'diary';
    // раньше было две настройки притяжения — сводим к одной
    if (!(saved && saved.attrPower) && saved && (saved.attrInfluence || saved.attrDepth)) {
        const inf = saved.attrInfluence || 'medium';
        const d = Number(saved.attrDepth) || 4;
        s.attrPower = inf === 'none' ? 'none' : inf === 'light' ? (d >= 10 ? 'faint' : 'soft') : inf === 'strong' ? (d <= 1 ? 'max' : 'strong') : 'medium';
    }
    if (!ATTR_POWER[s.attrPower]) s.attrPower = 'medium';
    applyAttrPower(s);
    if (s.theme === 'grimoire') s.theme = 'herbal'; // гримуар заменён травницей
    if (Number(s.maxChars) === 4) s.maxChars = 12; // старое значение по умолчанию: с НПС мало
    if (s.source === 'profile') { s.source = 'custom'; s.apiKind = 'profile'; }
    if (!['русском', 'английском'].includes(s.language)) s.language = 'русском';
    if (!Array.isArray(s.apiModels)) s.apiModels = [];
    s.volume = Math.max(0, Math.min(100, Number.isFinite(Number(s.volume)) ? Number(s.volume) : 45));
    if (!['auto', 'fixed'].includes(s.budgetMode)) s.budgetMode = 'auto';
    s.budgetCap = Math.max(2000, Math.min(32000, Number(s.budgetCap) || 8000));
    s.responseLength = Math.max(1000, Math.min(32000, Number(s.responseLength) || 4000));
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
    const pt = cleanPtype(raw.ptype);
    if (pt) c.ptype = pt;
    const tm = cleanTemper(raw.temper);
    if (tm) c.temper = tm;
    if (raw.ptype_note) c.ptypeNote = str(raw.ptype_note, 260);
    if (raw.temper_note) c.temperNote = str(raw.temper_note, 260);
    if (raw.born !== undefined && raw.born !== null && raw.born !== '') {
        const b = parseBorn(raw.born);
        if (b) c.born = b;
        else if (/^(нет|none|no|unknown|не указан\S*|-)$/i.test(String(raw.born).trim())) c.bornNone = true;
    }
    if (raw.age !== undefined && raw.age !== null && raw.age !== '') {
        const a = parseInt(String(raw.age), 10);
        if (a > 0 && a < 1000) c.ageSaid = a;
    }
    const z = cleanZodiac(raw.zodiac) || (c.born ? zodiacOf(c.born.d, c.born.m) : '');
    if (z) c.zodiac = z;

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
            strength: num(f && f.strength, 1, 3, undefined),
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
            about: str(t && t.about, 320),
        })).filter(t => t.name).slice(0, MAX_TRAITS);
    }
    if (raw.chem_now && typeof raw.chem_now === 'object' && raw.chem_now.score !== undefined) {
        c.chemNow = { score: num(raw.chem_now.score, -3, 3, 0), why: str(raw.chem_now.why, 200) };
    }
    const tags = v => (Array.isArray(v) ? v : []).map(x => lowerWord(typeof x === 'object' && x ? x.tag || x.name : x, 40)).filter(Boolean).slice(0, 8);
    if (raw.turn_ons !== undefined) c.likes = tags(raw.turn_ons);
    if (raw.turn_offs !== undefined) c.dislikes = tags(raw.turn_offs);
    if (raw.chem && typeof raw.chem === 'object' && CHEM_LEVELS.includes(String(raw.chem.level || '').toLowerCase().trim())) {
        c.chem = { level: String(raw.chem.level).toLowerCase().trim(), why: str(raw.chem.why, 200) };
    }
    // модель часто не повторяет label у уже существующего впечатления — принимаем и одни now / now_score
    if (raw.impression && typeof raw.impression === 'object' && (str(raw.impression.label) || str(raw.impression.now) || raw.impression.now_score !== undefined || raw.impression.nowScore !== undefined)) {
        c.impression = {
            label: lowerWord(raw.impression.label, 40),
            score: num(raw.impression.score, -3, 3, 0),
            why: str(raw.impression.why, 200),
            now: str(raw.impression.now, 200),
            nowScore: num(raw.impression.now_score ?? raw.impression.nowScore, -3, 3, undefined),
            known: str(raw.impression.known, 40),
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
            settleMood(c);
        }
        if (Array.isArray(c.buffs)) {
            c.buffs = c.buffs
                .map(b => Object.assign({}, b, { left: (b.left ?? 1) - n }))
                .filter(b => b.left > 0);
        }
        if (Array.isArray(c.traits) && c.traits.some(t => t.kind === 'gone')) {
            c.traits = c.traits
                .map(t => t.kind === 'gone' ? Object.assign({}, t, { left: (t.left ?? 1) - n }) : t)
                .filter(t => t.kind !== 'gone' || t.left > 0);
        }
    }
    return next;
}

const WEIGHT_RANK = { light: 1, medium: 2, deep: 3 };

// ---------- Главное настроение, как в «Симс» ----------
// Каждая эмоция в списке — как мудлет: даёт очки своему настроению (слабая +1, средняя +2, сильная +5).
// Похожие эмоции складываются в одно настроение (грусть, тоска и обида — всё «грусть»).
// Главное настроение — то, у которого больше всего очков. Радость, как в «Симс», вторична:
// она подпитывает другие хорошие настроения (уверенность, флирт, бодрость…), если у тех есть своя опора.
// Сила: 1–4 очка — просто настроение, 5–8 — «очень», 9 и больше — предел. Без эмоций — «в порядке».
export const MOOD_POINTS = { light: 1, medium: 2, deep: 5 };
export const MOOD_VERY = 5;
export const MOOD_EXTREME = 9;

// Настроения: какие лица в них входят, хорошее ли оно, и как звучит на каждой силе (он / она).
export const MOODS = {
    happy: { faces: ['joy', 'excited', 'hope', 'grateful'], good: true, name: 'радость', words: [['в хорошем настроении', 'в хорошем настроении'], ['счастлив', 'счастлива'], ['на седьмом небе', 'на седьмом небе']] },
    confident: { faces: ['confident', 'pride'], good: true, name: 'уверенность', words: [['уверен в себе', 'уверена в себе'], ['полон уверенности', 'полна уверенности'], ['чувствует себя королём', 'чувствует себя королевой']] },
    energized: { faces: ['energized'], good: true, name: 'бодрость', words: [['бодр', 'бодра'], ['полон сил', 'полна сил'], ['горы готов свернуть', 'горы готова свернуть']] },
    playful: { faces: ['playful'], good: true, name: 'озорство', words: [['игрив', 'игрива'], ['в озорном настроении', 'в озорном настроении'], ['дурачится вовсю', 'дурачится вовсю']] },
    inspired: { faces: ['inspired', 'curious'], good: true, name: 'вдохновение', words: [['вдохновлён', 'вдохновлена'], ['полон идей', 'полна идей'], ['охвачен вдохновением', 'охвачена вдохновением']] },
    focused: { faces: ['focus'], good: true, name: 'сосредоточенность', words: [['сосредоточен', 'сосредоточена'], ['полностью сосредоточен', 'полностью сосредоточена'], ['весь в деле', 'вся в деле']] },
    calm: { faces: ['calm'], good: true, name: 'спокойствие', words: [['спокоен', 'спокойна'], ['умиротворён', 'умиротворена'], ['безмятежен', 'безмятежна']] },
    tender: { faces: ['love'], good: true, name: 'нежность', words: [['нежен', 'нежна'], ['полон нежности', 'полна нежности'], ['тает от нежности', 'тает от нежности']] },
    flirty: { faces: ['flirty', 'desire'], good: true, name: 'влечение', words: [['настроен на флирт', 'настроена на флирт'], ['охвачен влечением', 'охвачена влечением'], ['сгорает от страсти', 'сгорает от страсти']] },
    embarrassed: { faces: ['shy', 'guilt'], good: false, name: 'смущение', words: [['смущён', 'смущена'], ['пристыжен', 'пристыжена'], ['готов провалиться сквозь землю', 'готова провалиться сквозь землю']] },
    sad: { faces: ['sad', 'melancholy', 'hurt'], good: false, name: 'грусть', words: [['грустит', 'грустит'], ['подавлен', 'подавлена'], ['убит горем', 'убита горем']] },
    angry: { faces: ['angry', 'irritated', 'contempt', 'disgust', 'envy'], good: false, name: 'злость', words: [['раздражён', 'раздражена'], ['зол', 'зла'], ['в ярости', 'в ярости']] },
    tense: { faces: ['anxious', 'suspicious'], good: false, name: 'напряжение', words: [['напряжён', 'напряжена'], ['на взводе', 'на взводе'], ['на грани срыва', 'на грани срыва']] },
    scared: { faces: ['fear'], good: false, name: 'страх', words: [['встревожен', 'встревожена'], ['напуган', 'напугана'], ['в ужасе', 'в ужасе']] },
    uncomfortable: { faces: ['uncomfortable', 'tired'], good: false, name: 'дискомфорт', words: [['не в своей тарелке', 'не в своей тарелке'], ['сам не свой', 'сама не своя'], ['на пределе', 'на пределе']] },
    bored: { faces: ['bored'], good: false, name: 'скука', words: [['скучает', 'скучает'], ['изнывает от скуки', 'изнывает от скуки'], ['ко всему безразличен', 'ко всему безразлична']] },
    dazed: { faces: ['dazed', 'confused', 'surprise'], good: false, name: 'растерянность', words: [['растерян', 'растеряна'], ['ошеломлён', 'ошеломлена'], ['в полном ступоре', 'в полном ступоре']] },
};
const FACE_MOOD = {};
for (const [k, m] of Object.entries(MOODS)) for (const f of m.faces) FACE_MOOD[f] = k;
// На первой силе у некоторых лиц своё, более точное слово (обида — не просто грусть).
const FACE_WORD_1 = {
    excited: ['в азарте', 'в азарте'], hope: ['полон надежды', 'полна надежды'], grateful: ['благодарен', 'благодарна'],
    pride: ['гордится собой', 'гордится собой'], curious: ['заинтригован', 'заинтригована'], desire: ['охвачен влечением', 'охвачена влечением'],
    guilt: ['чувствует вину', 'чувствует вину'], melancholy: ['тоскует', 'тоскует'], hurt: ['обижен', 'обижена'],
    contempt: ['полон презрения', 'полна презрения'], disgust: ['испытывает отвращение', 'испытывает отвращение'], envy: ['ревнует', 'ревнует'],
    suspicious: ['насторожен', 'насторожена'], tired: ['устал', 'устала'], surprise: ['удивлён', 'удивлена'], dazed: ['оглушён', 'оглушена'],
};

export function moodOfFace(face) {
    return FACE_MOOD[face] || '';
}

// Считает главное настроение по эмоциям. prev — прошлое главное настроение: при равенстве оно держится (как в «Симс»).
export function dominantMood(moodlets, prev = '') {
    const sums = {};
    for (const m of moodlets || []) {
        const face = m.face || guessFace(m.emotion, m.tone);
        const key = FACE_MOOD[face];
        if (!key) continue;
        const pts = MOOD_POINTS[m.weight] || MOOD_POINTS.medium;
        const e = sums[key] || (sums[key] = { key, own: 0, top: null, topPts: 0, left: 0 });
        e.own += pts;
        if (pts > e.topPts || (pts === e.topPts && (m.left || 0) > e.left)) { e.top = face; e.topPts = pts; e.left = m.left || 0; }
    }
    const list = Object.values(sums);
    if (!list.length) return null;
    const happy = sums.happy ? sums.happy.own : 0;
    for (const e of list) {
        // радость подпитывает другое хорошее настроение, если у него самого есть хотя бы средняя эмоция
        e.score = e.own + (e.key !== 'happy' && MOODS[e.key].good && e.own >= MOOD_POINTS.medium ? happy : 0);
    }
    list.sort((a, b) => b.score - a.score
        || (b.key === prev) - (a.key === prev)
        || (a.key === 'happy') - (b.key === 'happy')
        || b.topPts - a.topPts
        || b.left - a.left);
    const win = list[0];
    const level = win.score >= MOOD_EXTREME ? 3 : (win.score >= MOOD_VERY ? 2 : 1);
    return { key: win.key, face: win.top, level, score: win.score, scores: list.map(e => ({ key: e.key, score: e.score, face: e.top })) };
}

// Слово настроения: на первой силе — слово модели, если оно про то же настроение, иначе точное слово лица;
// «очень» и предел — общие слова настроения, чтобы сила была видна.
export function moodWordFor(dom, g, modelWord = '', modelFace = '') {
    if (!dom) return modelWord || '';
    const i = g === 'f' ? 1 : 0;
    if (dom.level === 1) {
        // о чём слово — сначала по самому слову («насторожен» — это напряжение), а если слово незнакомое — по лицу от модели
        const wf = guessFace(modelWord);
        const mf = wf !== 'neutral' ? wf : modelFace;
        if (modelWord && FACE_MOOD[mf] === dom.key) return modelWord;
        if (FACE_WORD_1[dom.face]) return FACE_WORD_1[dom.face][i];
    }
    return MOODS[dom.key].words[dom.level - 1][i];
}

// Пересчитать главное настроение персонажа по его эмоциям. Слово и лицо модели сохраняются отдельно (moodSaid, faceSaid).
export function settleMood(c) {
    if (!c) return c;
    // старый дневник, где настроение ещё не считалось: что было записано — это и есть слово модели
    if (!c.moodCalc) {
        if (c.moodSaid === undefined && c.mood) c.moodSaid = c.mood;
        if (c.faceSaid === undefined && c.face) c.faceSaid = c.face;
        c.moodCalc = true;
    }
    const dom = dominantMood(c.moodlets, c.moodKey || '');
    if (!dom) {
        // эмоций нет — как в «Симс»: «в порядке», если модель не сказала иного
        c.mood = c.moodSaid || (Array.isArray(c.moodlets) ? (c.g === 'f' ? 'в порядке' : 'в порядке') : c.mood);
        c.face = c.faceSaid || 'neutral';
        delete c.moodKey;
        delete c.moodLevel;
        return c;
    }
    c.moodKey = dom.key;
    c.moodLevel = dom.level;
    c.face = dom.face;
    c.mood = moodWordFor(dom, c.g, c.moodSaid, c.faceSaid);
    return c;
}

// Цвет и смайлик общего состояния — лицо главного настроения.
// Если второе настроение набрало столько же очков и оно другого цвета — состояние смешанное, отдаём оба лица.
export function moodFaces(c) {
    if (!c) return [];
    const dom = dominantMood(c.moodlets, c.moodKey || '');
    if (!dom) {
        if (!c.mood && !c.face) return [];
        const f = c.face && c.face !== 'neutral' ? c.face : guessFace(c.mood);
        return [f];
    }
    const second = dom.scores[1];
    return second && second.score === dom.score && second.face && second.face !== dom.face ? [dom.face, second.face] : [dom.face];
}

// Новые эмоции добавляются к тем, что ещё не прошли; одинаковые — освежаются, а не дублируются.
export function mergeMoodlets(oldList, freshList, ended) {
    const endedKeys = new Set(ended || []);
    const list = (oldList || [])
        .filter(m => !endedKeys.has(normText(m.emotion)))
        .map(m => Object.assign({}, m));
    for (const m of freshList || []) {
        const prev = list.find(x => normText(x.emotion) === normText(m.emotion));
        if (prev) {
            // та же эмоция снова: срок продлевается, а причина остаётся прежней —
            // новая причина только если чувство стало сильнее
            const stronger = WEIGHT_RANK[m.weight] > WEIGHT_RANK[prev.weight || 'medium'];
            if (stronger || !prev.why) prev.why = m.why || prev.why;
            if (stronger || !prev.feel) prev.feel = m.feel || prev.feel;
            if (!prev.face && m.face) prev.face = m.face;
            if (stronger) prev.weight = m.weight;
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
    const freshTraits = (fresh.traits || []).filter(t => t.kind !== 'gone' || (old && old.traits && old.traits.length));
    if (!old || !Array.isArray(old.traits) || !old.traits.length) {
        return { traits: freshTraits.map(t => (t.about ? { name: t.name, kind: 'base', about: t.about } : { name: t.name, kind: 'base' })), changedAt: old ? old.traitChangedAt : undefined };
    }
    const traits = old.traits.map(t => Object.assign({}, t));
    // «Подробнее» о черте: почему она у персонажа. Дописываем, если её ещё не было, — даже когда характер не меняется.
    for (const t of freshTraits) {
        const prev = t.about ? findTrait(traits, t.name) : null;
        if (prev && !prev.about) prev.about = t.about;
    }
    const cooling = old.traitChangedAt !== undefined && cycle - old.traitChangedAt < TRAIT_COOLDOWN;
    let changedAt = old.traitChangedAt;
    if (cooling) return { traits, changedAt };
    // За раз — одно изменение характера. Исключение: черта ушла и на её место пришла новая
    // (был доверчивым → после измены стал недоверчивым).
    let gone = false, other = false;
    for (const t of freshTraits) {
        if (!t.why) continue;
        const prev = findTrait(traits, t.name);
        if (t.kind === 'gone') {
            if (gone || !prev || prev.kind === 'gone') continue;
            prev.was = prev.kind;
            prev.kind = 'gone';
            prev.why = t.why;
            prev.left = TRAIT_GONE_TURNS;
            gone = true;
            changedAt = cycle;
            continue;
        }
        if (other) continue;
        if (prev) {
            if (prev.kind === 'gone') continue; // ушедшую черту модель сама не возвращает
            if (t.kind === prev.kind || t.kind === 'base') continue;
            if (t.kind === 'new' && prev.kind !== 'new') continue; // старую черту нельзя сделать «новой»
            prev.kind = t.kind;
            prev.why = t.why;
            other = true;
            changedAt = cycle;
            continue;
        }
        if (traits.filter(x => x.kind !== 'gone').length >= MAX_TRAITS) continue;
        traits.push(Object.assign({ name: t.name, why: t.why, kind: 'new' }, t.about ? { about: t.about } : {}));
        other = true;
        changedAt = cycle;
    }
    return { traits, changedAt };
}

// Вернуть ушедшую черту туда, где она была.
export function restoreTrait(t) {
    if (!t || t.kind !== 'gone') return t;
    t.kind = t.was && t.was !== 'gone' ? t.was : 'base';
    delete t.was;
    delete t.left;
    if (t.kind === 'base' && !t.kept) delete t.why;
    return t;
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
// Похожие ли это формулировки одного и того же желания/страха (модель любит перефразировать).
function stems(text) {
    return new Set(normText(text).split(/[^a-zа-я0-9]+/).filter(w => w.length > 2).map(w => w.slice(0, 5)));
}
function sameGoal(a, b) {
    if (normText(a) === normText(b)) return true;
    const x = stems(a);
    const y = stems(b);
    if (!x.size || !y.size) return false;
    let common = 0;
    for (const w of x) if (y.has(w)) common++;
    return common / Math.min(x.size, y.size) >= 0.6;
}

// Желания и страхи живут дольше одного ответа:
// — то, что модель не упомянула, остаётся (пропущенное ≠ отменённое);
// — перефразированное остаётся со старым текстом;
// — исполненное / сбывшееся видно ещё GOAL_LINGER ответов, отменённое — исчезает со следующим ответом;
// — в обычном разборе чата за раз добавляется не больше одного нового пункта (или столько, сколько закрылось).
export function mergeGoals(oldList, freshList, { done, dropped, cycle = 0, maxNew = MAX_GOALS, extra = [] } = {}) {
    const out = [];
    const fresh = (freshList || []).map(f => Object.assign({}, f));
    const used = new Set();
    let closedNow = 0;
    for (const o of oldList || []) {
        if (o.status !== 'active') {
            const at = o.closedAt ?? -99;
            const linger = o.status === done ? GOAL_LINGER : 1;
            if (cycle - at < linger) out.push(Object.assign({}, o));
            continue;
        }
        const i = fresh.findIndex((f, j) => !used.has(j) && sameGoal(f.text, o.text));
        if (i < 0) { out.push(Object.assign({}, o)); continue; }
        used.add(i);
        const f = fresh[i];
        const item = Object.assign({}, o);
        for (const k of extra) if (f[k] !== undefined && f[k] !== '') item[k] = f[k];
        if (f.status !== 'active') {
            if (o.pinned && f.status === dropped) { out.push(item); continue; } // закреплённое игрок не отпускал
            item.status = f.status;
            item.closedAt = cycle;
            if (o.pinned) item.pinned = false;
            closedNow++;
        }
        out.push(item);
    }
    let room = Math.max(maxNew, closedNow);
    fresh.forEach((f, j) => {
        if (used.has(j)) return;
        if (f.status === dropped) return;
        if (out.some(x => sameGoal(x.text, f.text))) return; // уже есть (в том числе недавно закрытое)
        const active = out.filter(x => x.status === 'active').length;
        if (f.status === 'active') {
            if (active >= MAX_GOALS || room <= 0) return;
            room--;
            out.push(Object.assign({}, f, extra.includes('strength') && f.strength === undefined ? { strength: 1 } : {}));
        } else {
            // новое и сразу исполнившееся / сбывшееся
            out.push(Object.assign({}, f, { closedAt: cycle }, extra.includes('strength') && f.strength === undefined ? { strength: 1 } : {}));
        }
    });
    return out;
}

export function mergeCharacter(old, fresh, modules, mopts = {}) {
    const out = old ? JSON.parse(JSON.stringify(old)) : { name: fresh.name };
    out.name = old ? old.name : fresh.name;
    if (fresh.g && fresh.g !== 'n') out.g = fresh.g;
    if (!out.who && fresh.who) out.who = fresh.who;
    if (fresh.ptype) out.ptype = fresh.ptype;
    if (fresh.temper) out.temper = fresh.temper;
    if (fresh.ptypeNote) out.ptypeNote = fresh.ptypeNote;
    if (fresh.temperNote) out.temperNote = fresh.temperNote;
    if (fresh.born && !out.bornManual) out.born = fresh.born;
    // возраст из карточки запоминаем один раз — дальше он растёт по часам сцены, а не берётся из карточки заново
    if (fresh.ageSaid && !out.ageAt) out.ageSaid = fresh.ageSaid;
    if (fresh.zodiac) out.zodiac = fresh.zodiac;
    if (fresh.bornNone && !out.born && !out.zodiac) out.bornChecked = true;
    if (!out.g) out.g = 'n';
    out.cycle = (old && old.cycle ? old.cycle : 0) + 1;

    if (modules.mood) {
        if (fresh.mood) { out.mood = fresh.mood; out.moodSaid = fresh.mood; out.faceSaid = fresh.face || ''; }
        else if (fresh.face) out.faceSaid = fresh.face;
        if (fresh.moodlets || fresh.ended) out.moodlets = mergeMoodlets(old && old.moodlets, fresh.moodlets, fresh.ended);
        // Слово модели без эмоции за ним — заводим эту эмоцию. Если в списке уже есть другие эмоции, новая — слабая (+1):
        // главное настроение считается по всем эмоциям, как в «Симс», и одно слово модели их не перевешивает.
        if (fresh.mood && Array.isArray(out.moodlets)) {
            const face = (fresh.face && fresh.face !== 'neutral') ? fresh.face : guessFace(fresh.mood);
            const backed = face === 'neutral' || out.moodlets.some(m => (m.face || guessFace(m.emotion, m.tone)) === face);
            if (!backed) {
                const word = String(FACE_NAMES[face] || '').split(',')[0].trim();
                const tone = ['joy', 'excited', 'playful', 'energized', 'inspired', 'pride', 'confident', 'hope', 'grateful', 'calm', 'love', 'flirty', 'desire', 'curious'].includes(face) ? 'good' : (['focus', 'surprise', 'confused'].includes(face) ? 'mid' : 'bad');
                const w = out.moodlets.length ? 'light' : 'medium';
                if (word) out.moodlets = mergeMoodlets(out.moodlets, [{ emotion: word, feel: '', why: '', weight: w, tone, face, left: WEIGHT_TURNS[w][1] }]);
            }
        }
    }
    const rebuild = !old || !!mopts.rebuild;
    if (modules.wants && fresh.wants) {
        const oldActive = ((old && old.wants) || []).filter(w => w.status === 'active').length;
        out.wants = mergeGoals(old && old.wants, fresh.wants, { done: 'done', dropped: 'dropped', cycle: out.cycle, maxNew: rebuild || !oldActive ? MAX_GOALS : 1 });
    }
    if (modules.fears && fresh.fears) {
        const oldActive = ((old && old.fears) || []).filter(f => f.status === 'active').length;
        out.fears = mergeGoals(old && old.fears, fresh.fears, { done: 'realized', dropped: 'gone', cycle: out.cycle, maxNew: rebuild || !oldActive ? MAX_GOALS : 1, extra: ['strength', 'level'] });
    }
    // Сбылся страх или исполнилось желание — это обязательно отражается на настроении,
    // даже если модель забыла добавить эмоцию.
    if (modules.mood) {
        const added = fresh.moodlets || [];
        const nowClosed = (list, st) => (list || []).filter(x => x.status === st && x.closedAt === out.cycle);
        for (const f of nowClosed(out.fears, 'realized')) {
            if (added.some(m => m.tone === 'bad' && m.weight !== 'light')) break;
            const weight = (f.strength || 1) >= 3 ? 'deep' : 'medium';
            out.moodlets = mergeMoodlets(out.moodlets, [{ emotion: 'потрясение', feel: '', why: `сбылось то, чего боялся: ${f.text}`, weight, tone: 'bad', face: 'fear', left: WEIGHT_TURNS[weight][1] }]);
        }
        for (const w of nowClosed(out.wants, 'done')) {
            if (added.some(m => m.tone === 'good')) break;
            out.moodlets = mergeMoodlets(out.moodlets, [{ emotion: 'удовлетворение', feel: '', why: `исполнилось: ${w.text}`, weight: 'medium', tone: 'good', face: 'joy', left: WEIGHT_TURNS.medium[1] }]);
        }
        settleMood(out);
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
    if (modules.impression && fresh.chem && !out.chem) out.chem = fresh.chem;
    // совместимость сейчас: стартует с первой и дальше живёт по чату
    if (modules.impression && out.chem && !out.chemNow) out.chemNow = { score: CHEM_SCORE[out.chem.level] ?? 0, why: '' };
    if (modules.impression && fresh.chemNow && out.chemNow) {
        const prev = out.chemNow.score;
        out.chemNow = { score: fresh.chemNow.score, why: fresh.chemNow.why || out.chemNow.why || '' };
        if (fresh.chemNow.score !== prev) out.chemAt = out.cycle;
    }
    // что привлекает — заполняется один раз (или пока пусто); правки игрока модель не трогает
    if (modules.attraction) {
        if (!out.attrSet && fresh.likes && fresh.likes.length && !(out.likes && out.likes.length)) out.likes = fresh.likes;
        if (!out.attrSet && fresh.dislikes && fresh.dislikes.length && !(out.dislikes && out.dislikes.length)) out.dislikes = fresh.dislikes;
    }
    if (modules.impression) {
        if (old && old.impression) {
            if (fresh.impression) {
                if (fresh.impression.now) out.impression.now = fresh.impression.now;
                if (fresh.impression.known && !out.impression.known) out.impression.known = fresh.impression.known;
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

    if (opts.points) purseOf(next);
    let purseGot = 0;
    for (const fresh of freshList) {
        // персона игрока ведётся только если это включено; в лимит персонажей она не входит
        const isPersona = !!(userName && sameName(fresh.name, userName));
        if (isPersona && !opts.persona) continue;
        const key = isPersona
            ? (Object.keys(next.characters).find(k => next.characters[k].persona || sameName(k, userName)) || userName)
            : (Object.keys(next.characters).find(k => sameName(k, fresh.name) && !next.characters[k].persona) || fresh.name);
        const old = next.characters[key];
        const counted = next.order.filter(k => next.characters[k] && !next.characters[k].persona).length;
        if (!old && !isPersona && counted >= maxChars) continue;
        const merged = mergeCharacter(old, fresh, modules, { rebuild: !!opts.rebuild });
        if (isPersona) merged.persona = true;
        const evs = diffCharacter(old, merged, modules);
        if (merged.dream) delete merged.dream.event;
        if (opts.points) {
            const got = evs.reduce((sum, e) => sum + (POINTS[e.type] || 0), 0);
            if (got) {
                purseGot += got;
                merged.points = (merged.points || 0) + got;
                // запоминаем, сколько дал этот ответ: при повторном разборе того же ответа очки не удвоятся
                merged.earned = got;
                merged.earnedAt = opts.mesId ?? null;
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
    if (opts.points && purseGot) {
        next.purse = purseOf(next) + purseGot;
        // сколько дал этот ответ: при повторном разборе того же ответа монеты не удвоятся
        next.purseEarned = purseGot;
        next.purseAt = opts.mesId ?? null;
    }
    return { state: next, events };
}

// Повторный разбор того же ответа начинается с состояния ДО него — но то, что сделал сам игрок
// (награды, покупки, очки, закреплённая или придуманная заново мечта, закреплённые желания), сохраняем.
export function carryOwnEdits(base, own, mesId) {
    if (!own || !own.characters) return base;
    const out = JSON.parse(JSON.stringify(base || emptyState()));
    if (own.purse !== undefined) out.purse = Math.max(0, (own.purse || 0) - (own.purseAt === mesId ? (own.purseEarned || 0) : 0));
    if (!out.characters) out.characters = {};
    if (!Array.isArray(out.order)) out.order = Object.keys(out.characters);
    for (const [key, mine] of Object.entries(own.characters)) {
        let c = out.characters[key];
        if (!c) {
            if (!(mine.shop || mine.points || mine.collection || mine.buffs)) continue;
            c = out.characters[key] = { name: mine.name, g: mine.g || 'n' };
            if (!out.order.includes(key)) out.order.push(key);
        }
        for (const f of ['shop', 'buffs', 'collection']) if (mine[f]) c[f] = JSON.parse(JSON.stringify(mine[f]));
        if (mine.points !== undefined) c.points = Math.max(0, (mine.points || 0) - (mine.earnedAt === mesId ? (mine.earned || 0) : 0));
        if (mine.dream && (mine.dream.pinned || mine.dream.manual)) {
            c.dream = JSON.parse(JSON.stringify(mine.dream));
            if (mine.dreamChangedAt !== undefined) c.dreamChangedAt = mine.dreamChangedAt;
        }
        if (mine.attrSet) c.attrSet = true;
        // дату рождения вписали руками — она главнее того, что нашла модель
        if (mine.bornManual) {
            c.bornManual = true;
            if (mine.born) c.born = JSON.parse(JSON.stringify(mine.born)); else delete c.born;
            if (mine.zodiac) c.zodiac = mine.zodiac;
        }
        // правки игрока руками (удалил, закрепил, перенёс) — переносим блок целиком
        for (const f of ['wants', 'fears', 'traits', 'moodlets', 'likes', 'dislikes']) {
            if (mine.edited && mine.edited[f] === mesId && mine[f]) c[f] = JSON.parse(JSON.stringify(mine[f]));
        }
        for (const w of mine.wants || []) {
            if (!w.pinned || w.status !== 'active') continue;
            c.wants = c.wants || [];
            const have = findByText(c.wants, w.text);
            if (have) have.pinned = true;
            else c.wants.unshift({ text: w.text, status: 'active', pinned: true });
        }
    }
    return out;
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
            else if (prev && prev.kind !== t.kind && t.kind === 'gone') ev.push({ type: 'trait_gone', who, text: t.name, why: t.why });
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
        trait_gone: 'Черта ушла',
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
        case 'trait_down':
        case 'trait_gone': return `${ev.text}${ev.why ? ` — ${ev.why}` : ''}`;
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
    if (modules.traits) {
        c.traits = [{ name: 'черта характера', why: 'событие, после которого изменилась', kind: 'base|up|new|down|gone', about: 'почему эта черта у него (только если no_about)' }];
        c.ptype = 'INFP-T';
        c.ptype_note = 'как этот тип проявляется именно в нём (только при no_ptype)';
        c.temper = 'choleric|sanguine|phlegmatic|melancholic';
        c.temper_note = 'как темперамент виден в его поведении';
        c.born = 'ДД.ММ.ГГГГ или ДД.ММ (только при no_born)';
        c.age = 'сколько лет, если в карточке назван только возраст (только при no_born)';
    }
    if (modules.impression) {
        c.impression = { label: 'каким показался игрок, 1–3 слова', score: 1, why: 'что подумал при встрече', now: 'что думает сейчас', now_score: 1, known: 'если давно знакомы: кто они друг другу' };
        c.chem = { level: CHEM_LEVELS.join('|'), why: 'какие черты сходятся или сталкиваются' };
        c.chem_now = { score: 0, why: 'что сейчас тянет друг к другу или отталкивает' };
    }
    if (modules.attraction) {
        c.turn_ons = ['что привлекает в других'];
        c.turn_offs = ['что отталкивает'];
    }
    return JSON.stringify({ characters: [c] });
}

export function buildSystemPrompt(settings, ctx) {
    // «что привлекает» берётся из карточки и лорбуков, а не из чата: просим только при «Лорбук» и «Всё сразу»
    const m = Object.assign({}, settings.modules, { attraction: !!settings.modules.attraction && !!(ctx.fromLore || ctx.kind === 'all' || ctx.kind === 'lore') });
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
        ctx.trackPersona
            ? `Кого вести: ${who}. Кроме них ВСЕГДА веди и ${user} — это персона игрока: отдельный персонаж с name "${user}". Её состояние выводи только из её описания и из того, что она сама сказала и сделала в сообщениях; не придумывай ей поступков и мыслей. У ${user} impression — её отношение к ${ctx.botName} (а не к игроку).`
            : `Кого вести: ${who}. ${user} — это игрок: его внутренний мир не веди и в список не включай.`,
        'Если у персонажа уже есть пункты, повторяй их текст дословно, пока они не изменились. Ничего не выдумывай сверх того, что следует из текста и карточки.',
        'who — только для персонажа, которого ещё нет в текущем состоянии: кто это одной строкой (роль, связь с героями). У известных персонажей who не пиши.',
        'g — пол персонажа: m или f. Бери его из карточки, лорбука или текста (она сказала, он ушёл, окончания глаголов, имя). Все слова о персонаже (mood, feel, why, ended, who, traits, about, ptype_note, temper_note, желания и страхи) пиши в его роде: «встревожена», «успела», «сама», «недоверчивая», «ранима». Это касается и персоны игрока.',
    ];
    if (ctx.kind === 'all') {
        rules.push('Сейчас общий разбор «всё сразу». Сначала основа из карточки и лорбуков: врождённый характер, мечта, глубинные желания и страхи. Затем поверх неё — всё, что случилось в чате: события меняют основу только там, где они по-настоящему сильнее её. Сведи всё в одну согласованную картину на текущий момент.');
    } else if (ctx.fromLore) {
        rules.push('Сейчас разбор карточки и лорбуков. Это ОСНОВА персонажа: врождённые черты, мечта, глубинные желания и страхи должны опираться на карточку и лорбук. То, что уже есть в текущем состоянии, не стирай: если это сложилось по событиям чата — оставь и согласуй с основой (дополни, уточни формулировку), а пустые места заполни из лорбука. Сообщений чата в этом разборе нет: сцену не разбирай, текущее настроение и эмоции не меняй и новых не добавляй.');
    } else if (!(ctx.catchUp && ctx.catchUp.length)) {
        rules.push('Сейчас разбор новых сообщений чата. Текущее состояние — основа персонажа (из карточки, лорбука и прошлых событий), она остаётся. Меняй её только соразмерно событию: обычная сцена — только эмоции и отметки «сбылось»; заметное событие — можно обновить желание или страх; настоящее потрясение — мечту или черту характера. Если ничего важного не случилось — лишь дополняй, а не переписывай.');
    }
    if (ctx.acquainted && ctx.acquainted.length) {
        rules.push(`Персонажи из [Знакомые по предыстории] знакомы главному персонажу или ${user} ещё до начала истории. Заведи запись и для каждого из них, даже если в сцене их нет: who, характер (traits), желания, страхи и мечта — по лорбуку; настроение и эмоции не придумывай (moodlets пустые, mood — по характеру, спокойное). impression — их отношение к ${user}: если они знакомы с ${user}, заполни impression.known (кто они друг другу) и label/why/score по их общей истории; если с ${user} не знакомы — impression не пиши.`);
    }
    if (ctx.catchUp && ctx.catchUp.length) {
        rules.push(`Это первое заполнение дневника для уже идущей истории. Восстанови состояние по всему, что видно в сообщениях и эпизодах из прошлого. Обязательно верни этих персонажей, если они лично появлялись в истории (а не только упоминались в разговоре): ${ctx.catchUp.join(', ')}. impression — каким было первое впечатление об игроке при знакомстве, now и now_score — каким отношение стало к последней сцене. Желания и страхи — актуальные на конец. moodlets — только эмоции, которые ещё должны действовать сейчас.`);
    }
    if (ctx.knownNames && ctx.knownNames.length) {
        rules.push(`Известные персонажи этого мира: ${ctx.knownNames.join(', ')}. Если кто-то из них есть в сцене — называй его ровно так. Добавляй персонажа, только если он действительно присутствует или действует в последних сообщениях, а не просто упомянут.`);
    }
    if (m.mood) {
        rules.push('mood — общее состояние одним-двумя словами так, чтобы оно продолжало фразу «Сейчас он…» / «Сейчас она…»: краткое прилагательное или причастие в роде персонажа, со строчной буквы («встревожен», «весела», «не в духе», «сосредоточена»). Не существительное и не полная форма («замотанный» — нельзя, «вымотан» — можно). Главное состояние дневник считает сам, как в «Симс»: складывает силу всех эмоций (старых, что ещё не прошли, и новых) по похожим чувствам, и побеждает то, у которого сила больше. Поэтому mood называй по самому сильному чувству из всех эмоций, а не по последнему событию и не смесью — слово про другое чувство дневник не возьмёт. face — лицо этого самого сильного чувства. Общее состояние всегда опирается на эмоции из moodlets: если состояние называет чувство, которого среди эмоций нет (например, «сосредоточен», а сосредоточенности в списке нет), добавь эту эмоцию в moodlets с причиной.');
        const manual = settings.moodMode === 'manual';
        rules.push('face — какое лицо сейчас у персонажа, выбирай самое точное: joy (радость, веселье), excited (азарт, восторг, воодушевление, предвкушение), playful (озорство, игривость, дурачится), energized (бодрость, прилив сил), inspired (вдохновение, озарение), pride (гордость, торжество), confident (уверенность, смелость, хладнокровие), hope (надежда), grateful (благодарность, тронут), calm (спокоен, облегчение), love (нежность, влюблённость, забота), flirty (кокетство, флирт), desire (страсть, влечение), shy (смущён), sad (грусть, горе, отчаяние), melancholy (тоска, одиночество, ностальгия), hurt (обида, разочарование), guilt (вина, стыд, раскаяние), angry (злость, гнев), irritated (раздражение, досада), envy (зависть, ревность), disgust (отвращение, брезгливость), contempt (презрение, высокомерие), fear (страх, испуг, ужас), anxious (тревога, беспокойство, напряжение), suspicious (подозрение, недоверие, настороженность), uncomfortable (телесный дискомфорт: голод, холод, жара, неудобство), tired (усталость), bored (скука, апатия, опустошённость), focus (сосредоточен, решителен), surprise (удивлён), dazed (оглушён, в ступоре, в тумане, пьян), confused (растерян, озадачен), curious (любопытство, интерес), neutral. У каждой эмоции в moodlets тоже свой face из этого же списка — по самому чувству.');
        rules.push('moodlets — эмоции, которые ВЫЗВАЛИ ИЛИ УСИЛИЛИ последние события, обычно 1–2, не больше 3. Старые эмоции из текущего состояния (moodlets_now) не повторяй и не переименовывай синонимами: они идут своим сроком (left) и угасают сами. emotion — ЧУВСТВО одним-двумя словами, существительное со строчной буквы («облегчение», «нежность», «ревность», «стыд»), никогда не поступок и не описание сцены. feel — как это чувство ощущается внутри у самого персонажа, коротко и по-человечески («внутри теплеет, хочется её защитить», «сжимается в груди»). why — что его вызвало: конкретное событие с точки зрения персонажа, коротко («успел перехватить Эвелин в переулке»). Не путай: поступок персонажа — это причина (why), а не эмоция. weight — сила: light — слабая бытовая (раздражение, скука, смущение, лёгкая досада), medium — заметная (обида, тревога, радость от события), deep — сильная и долгая (горе, потрясение, влюблённость, страх после угрозы жизни). Обычные мелочи — только light, deep — только после серьёзных событий.'
            + (manual ? '' : ' turns — сколько ответов продержится, по силе и по контексту: light 1–2, medium 3–6, deep 6–25.')
            + ' Если исполнилось желание — добавь приятную эмоцию, если сбылся страх — сильную неприятную. ended — только те эмоции из moodlets_now, которые событие в последних сообщениях ПРЯМО сняло (обида прошла после извинений, страх ушёл, когда опасность миновала). Если сцена просто сменилась — эмоцию не снимай: она догорит сама.');
    }
    rules.push('Желания, страхи и мечта должны быть правдой о ЭТОМ персонаже по его карточке и событиям, а не шаблонно-светлыми. Если персонаж мрачный, сломленный, жестокий или депрессивный — его желания и мечта тоже могут быть тёмными (исчезнуть, отомстить, чтобы всё закончилось, власть любой ценой). Не делай их позитивными и не смягчай, если этого нет в персонаже.');
    if (m.wants) rules.push('wants — до 3 текущих желаний, конкретных и живых, из характера, сюжета и мечты; не только про игрока. Желания живут долго: повторяй текст уже записанных желаний ДОСЛОВНО и не переписывай их. Исполнившееся по событиям помечай status "done", ставшее неважным из-за события — "dropped"; только на место закрытого можно добавить новое (за раз не больше одного). Желания с pinned: true игрок закрепил: верни их как есть, не меняй текст и не отменяй — только status "done", когда исполнится.');
    if (m.fears) rules.push('fears — до 3 страхов, из характера, прошлого и сюжета; strength 1–3; level — одно слово. Страхи глубокие и держатся долго: повторяй текст уже записанных страхов ДОСЛОВНО и не заменяй их новыми без причины. Если то, чего персонаж боялся, ПРОИЗОШЛО в последних сообщениях — обязательно помечай "realized" и добавь сильную неприятную эмоцию. Преодолённый — "gone". Новый страх — только на место закрытого или если появилась настоящая новая угроза. fears_realized_recently — что недавно сбылось: это ещё влияет на настроение и поведение, учитывай.');
    if (m.dream) rules.push(`dream — мечта всей жизни: одна большая личная цель, которая следует из характера и истории персонажа (карточка, прошлое, ценности), с 3–5 этапами. Это глобальное и личное, а не текущая сцена. ${user} может появиться в мечте, ТОЛЬКО если между ними уже по-настоящему близкие отношения (отношение +2 и выше) и было сильное общее событие; незнакомец, знакомый или просто приятель в мечту не попадает. Если мечта уже есть — повторяй её название, plus и этапы дословно, отмечай выполненные этапы (done: true) и ставь change "same". Меняй мечту, только если случилось настоящее потрясение, которое переворачивает жизнь персонажа: change "change" — новая мечта (новые title и steps), change "add" — мечта дополнилась (plus — короткое продолжение, например «…вместе с ней»); в why — какое событие. Мелкие события мечту не трогают. Мечта у каждого своя: если у одного персонажа (или у персоны игрока) мечта поменялась, это не повод менять мечту другого — у остальных повторяй их мечты дословно с change "same".`);
    if (m.traits) rules.push('ptype — тип личности по 16 типам (как в тесте 16personalities): четыре буквы и -A (уверенный) или -T (беспокойный), например INFP-T, ENTJ-A; temper — темперамент: choleric, sanguine, phlegmatic или melancholic. Определяй их по характеру из карточки, лорбука и поведения в чате. ptype_note и temper_note — по 1–2 предложения: как этот тип и темперамент проявляются именно в этом персонаже, в его привычках и поступках (не общее описание типа). Пиши ptype, ptype_note, temper и temper_note только для персонажей с no_ptype: true и для новых; у остальных эти поля не пиши вовсе — они уже сохранены.');
    if (m.traits) rules.push('born — дата рождения, только если она прямо написана в карточке, лорбуке или (для персоны игрока) в её описании: "ДД.ММ.ГГГГ" или "ДД.ММ". Если даты нет, но назван знак зодиака — верни zodiac (по-русски, например "Скорпион"). Ничего не выдумывай и не высчитывай из возраста: если ни даты, ни знака нет — верни born: "нет". Если названа дата без года, но назван возраст, а в [Часы сцены] есть дата — вычисли год рождения. Если даты нет совсем, но назван возраст — верни age (число лет на начало истории). Пиши эти поля только для персонажей с no_born: true и для новых.');
    if (m.traits) rules.push('traits — 3–6 черт характера. Черта — свойство характера одним прилагательным или коротким словосочетанием («недоверчивый», «вспыльчивый», «упрямый», «заботливый»), а не поступок, роль или отношение к кому-то: «опекает свидетельницу», «любит Еву», «следователь» — НЕ черты. Если персонаж новый — только kind "base". Характер меняется ТОЛЬКО после по-настоящему значимого события: предательство, измена, потеря, спасение жизни, признание, тяжёлый выбор, крупная победа или провал. В обычной сцене верни черты без изменений. За раз одно изменение: new — появилась, up — усилилась, down — слабеет, gone — черта ушла совсем; в why — какое именно событие. Если событие ломает черту (был доверчив, а ему изменили), верни старую черту с kind "gone" и тут же новую с kind "new" («недоверчивый»). Черты с kind "gone" уже ушли: не возвращай их и не добавляй снова. about — 1–2 предложения, почему эта черта есть у персонажа: для основной — что в его прошлом, воспитании, работе или судьбе (по карточке и лорбуку) её выстроило; для приобретённой — как именно событие её породило. Пиши about только для новых черт и для тех, где стоит no_about: true; у остальных не пиши.');
    if (m.impression) rules.push(`impression — первое впечатление персонажа об игроке (${user}) при знакомстве — это МНЕНИЕ персонажа, а не описание сцены: label — каким игрок ему показался, 1–3 слова («смелая чудачка», «опасный тип»); why — что персонаж подумал о нём при встрече, его глазами («не полезла к зевакам — уважаю, хоть и дрожит как воробей»), score от -3 до 3. chem — совместимость, как в «Симс»: насколько они подходят друг другу по чертам, типу личности и ценностям; level: amazing (родственные души), good (есть контакт), neutral (ровно), bad (не по душе), awful (как кошка с собакой); why — коротко, какие черты сходятся или сталкиваются. Если по карточке, лорбуку или чату персонаж и игрок уже давно знакомы (родня, друзья, коллеги, пара, супруги, бывшие) — это не первое впечатление: верни impression.known — кто они друг другу, 1–3 слова («супруги», «давние друзья», «бывшие»); label и why — каким персонаж видит игрока с учётом их общей истории; chem — сложившаяся совместимость; chem_now — по их нынешним отношениям. Если они незнакомы — known не пиши. chem — это ПЕРВАЯ (или сложившаяся) совместимость, она не меняется: пиши её только при первом знакомстве и для тех, у кого no_chem: true. chem_now — как совместимость складывается сейчас, по событиям чата: score от -3 (сильное отторжение) до 3 (сильное притяжение), why — коротко, что их сейчас сближает или отталкивает. Меняй score постепенно: на 1 за заметное событие (общий риск, забота, флирт, ссора, обман), больше — только после очень сильного; если ничего не случилось — повтори прежний. Если впечатление уже есть — label, score и why не меняй, обновляй только now (что думает об игроке теперь) и now_score (от -3 до 3). Каждый разбор честно оцени, сдвинулось ли отношение: помощь, забота, честность, общее переживание, флирт, который зашёл, — повод подняться на 1; грубость, ложь, предательство — опуститься на 1 и больше. Отношения в долгой истории живые: если сближение идёт, отношение должно расти со временем, а не застревать на одном числе. now — переписывай, как только персонаж узнал или понял об игроке что-то новое (характер, привычки, прошлое, поступки), коротко и конкретно.`);
    if (m.attraction) rules.push(`turn_ons и turn_offs — что этого персонажа привлекает в других и что отталкивает (как в «Симс»): по 3–8 коротких тегов во множественном числе — телосложение, внешность, приметы, стиль, голос и запах, характер, образ жизни, увлечения («спортивные», «темноволосые», «со шрамами», «низкий голос», «надёжные», «с тёмным прошлым», «грубые»). Бери теги из этого списка, слово в слово: ${Object.entries(ATTRACT_CATALOG).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')}. Своё — только если в списке совсем нет подходящего. Выводи из характера, вкусов и истории персонажа. Пиши их только для персонажей с no_attraction: true и для новых; у остальных не пиши — они уже сохранены, а игрок мог их поправить. Совместимость (chem) с игроком учитывай и по этим тегам: подходит ли ему игрок внешностью и характером.`);
    if (ctx.clockNow) rules.push('scene_time — часы сцены: в запросе есть [Часы сцены] — какое время сейчас по дневнику. Верни scene_time на верхнем уровне JSON, рядом с characters, только если по последним сообщениям ясно, что время стало другим (прямо названо, наступило утро, прошёл вечер, долгая поездка): {"time":"ЧЧ:ММ","date":"ГГГГ-ММ-ДД" или null,"flashback":false}. Время не идёт назад. Если сцена — воспоминание о прошлом, верни flashback: true. Если ничего не ясно — не пиши scene_time.');
    rules.push('Если в [Текущем состоянии] указано, что персонажей нет в сцене, — их не возвращай.');
    rules.push(`Формат ответа: ${responseTemplate(m, settings.moodMode === 'manual')}`);
    return rules.join('\n');
}

export function buildUserPrompt(ctx, state, modules, onlyKeys) {
    const parts = [];
    if (ctx.clockNow) parts.push(`[Часы сцены]\n${ctx.clockNow}`);
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
    if (ctx.acquainted && ctx.acquainted.length) {
        parts.push(`[Знакомые по предыстории — в сцене их может не быть, но герои знают их давно]\n${ctx.acquainted.join('\n')}`);
    }
    const current = compactState(state, modules, onlyKeys, { recheckBorn: !!(ctx.fromLore || ctx.kind === 'all' || ctx.kind === 'lore') });
    const absent = onlyKeys ? (state.order || []).filter(k => !onlyKeys.includes(k)) : [];
    parts.push(`[Текущее состояние]\n${current || 'пока пусто — составь с нуля'}${absent.length ? `\nНет в сцене (не возвращай): ${absent.join(', ')}` : ''}`);
    if (ctx.messages && ctx.messages.length) parts.push(`[Последние сообщения]\n${ctx.messages.join('\n\n')}`);
    else if (ctx.kind === 'lore') parts.push('[Сообщения чата]\nВ этом разборе чат не читается — только карточка и лорбуки.');
    parts.push('Верни обновлённый JSON.');
    return parts.join('\n\n');
}

export function compactState(state, modules, onlyKeys, opts = {}) {
    if (!state || !state.order || !state.order.length) return '';
    const keys = onlyKeys ? state.order.filter(k => onlyKeys.includes(k)) : state.order;
    if (!keys.length) return '';
    const list = keys.map(k => {
        const c = state.characters[k];
        const o = { name: c.name, g: genderOf(c.g, c.name, c.who) };
        if (modules.mood) {
            o.mood = c.mood;
            o.moodlets_now = (c.moodlets || []).map(m => ({ emotion: m.emotion, why: m.why, weight: m.weight, left: m.left }));
        }
        if (modules.wants) {
            o.wants = (c.wants || []).filter(w => w.status === 'active').map(w => (w.pinned ? { text: w.text, status: 'active', pinned: true } : { text: w.text, status: 'active' }));
            const doneNow = (c.wants || []).filter(w => w.status === 'done').map(w => w.text);
            if (doneNow.length) o.wants_done_recently = doneNow;
        }
        if (modules.fears) {
            o.fears = (c.fears || []).filter(f => f.status === 'active').map(f => ({ text: f.text, level: f.level, strength: f.strength, status: 'active' }));
            const realNow = (c.fears || []).filter(f => f.status === 'realized').map(f => f.text);
            if (realNow.length) o.fears_realized_recently = realNow;
        }
        if (modules.dream && c.dream) o.dream = { title: c.dream.title, plus: c.dream.plus || '', steps: c.dream.steps, pinned: !!c.dream.pinned };
        if (modules.traits) {
            o.traits = (c.traits || []).map(t => Object.assign({ name: t.name, kind: t.kind, why: t.why }, t.about ? {} : { no_about: true }));
            if (c.ptype && c.temper && c.ptypeNote && c.temperNote) o.ptype = c.ptype;
            else o.no_ptype = true;
            // при разборе карточки и лорбука дату рождения спрашиваем заново, даже если раньше не нашли
            if ((!c.born || (!c.born.y && !c.ageAt)) && !c.bornManual && (!c.bornChecked || opts.recheckBorn)) o.no_born = true;
        }
        if (modules.impression && c.impression) o.impression = { label: c.impression.label, score: c.impression.score, now: c.impression.now, now_score: c.impression.nowScore };
        if (modules.impression && c.impression && !c.chem) o.no_chem = true;
        if (modules.impression && c.chem) o.chem_now = { score: c.chemNow ? c.chemNow.score : (CHEM_SCORE[c.chem.level] ?? 0) };
        if (modules.attraction) {
            if ((c.likes && c.likes.length) || (c.dislikes && c.dislikes.length) || c.attrSet) {
                o.turn_ons = c.likes || [];
                o.turn_offs = c.dislikes || [];
            } else o.no_attraction = true;
        }
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
        if (!c || c.persona || (userName && sameName(c.name, userName))) continue; // дневник персоны — только для игрока
        const bits = [];
        if (modules.mood && c.mood) {
            const ml = (c.moodlets || []).filter(m => (WEIGHT_RANK[m.weight] || 2) >= minRank)
                .map(m => `${m.emotion}${m.weight === 'deep' ? ' (сильно)' : ''}${m.why ? ` — ${m.why}` : ''}`).join('; ');
            bits.push(`сейчас ${c.mood}${ml ? `; на душе: ${ml}` : ''}`);
        }
        if (modules.wants) {
            const w = (c.wants || []).filter(x => x.status === 'active').map(x => x.text);
            if (w.length) bits.push(`хочет: ${w.join('; ')}`);
            const got = (c.wants || []).filter(x => x.status === 'done').map(x => x.text);
            if (got.length) bits.push(`только что исполнилось (это всё ещё радует): ${got.join('; ')}`);
        }
        if (modules.fears) {
            const f = (c.fears || []).filter(x => x.status === 'active').map(x => x.text);
            if (f.length) bits.push(`боится: ${f.join('; ')}`);
            const hit = (c.fears || []).filter(x => x.status === 'realized').map(x => x.text);
            if (hit.length) bits.push(`только что сбылось то, чего боялся, — это заметно выбивает из колеи и сказывается на поведении: ${hit.join('; ')}`);
        }
        if (modules.dream && c.dream) {
            const next = c.dream.steps.find(s => !s.done);
            bits.push(`мечта: ${c.dream.title}${c.dream.plus ? ` ${c.dream.plus}` : ''}${next ? ` (следующий шаг: ${next.text})` : ''}`);
        }
        if (modules.traits && c.traits && c.traits.length) {
            bits.push(`черты: ${c.traits.filter(t => t.kind !== 'down' && t.kind !== 'gone').map(t => t.name).join(', ')}`);
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

// Подсказка про притяжение: что привлекает и отталкивает персонажа и как он сейчас относится к игроку по совместимости.
const ATTR_TONE = {
    strong: 'Учитывай это заметно: персонаж реагирует на то, что его привлекает или отталкивает, — во взглядах, тоне, решениях и в том, к кому тянется.',
    medium: 'Пусть это проскальзывает в реакциях персонажа, когда к месту.',
    light: 'Это лишь лёгкий оттенок — не выпячивай.',
};
export function buildAttrInjection(state, userName, level = 'medium') {
    if (!ATTR_TONE[level] || !state || !state.order) return '';
    const lines = [];
    for (const key of state.order) {
        const c = state.characters[key];
        if (!c || c.persona || (userName && sameName(c.name, userName))) continue;
        const bits = [];
        if (c.likes && c.likes.length) bits.push(`привлекает: ${c.likes.join(', ')}`);
        if (c.dislikes && c.dislikes.length) bits.push(`отталкивает: ${c.dislikes.join(', ')}`);
        if (c.chem && CHEM_NAMES[c.chem.level]) {
            const now = c.chemNow ? c.chemNow.score : (CHEM_SCORE[c.chem.level] ?? 0);
            bits.push(`совместимость с игроком${userName ? ` (${userName})` : ''} сейчас: ${String(CHEM_NOW_NAMES[now] || '').toLowerCase()}${c.chemNow && c.chemNow.why ? ` — ${c.chemNow.why}` : ''}`);
        }
        if (bits.length) lines.push(`${c.name}: ${bits.join('; ')}.`);
    }
    if (!lines.length) return '';
    return `[Притяжение: кого и что персонажи находят привлекательным. ${ATTR_TONE[level]} Не пересказывай это напрямую.]\n${lines.join('\n')}`;
}

// Пол персонажа для склонений: из лорбука или ответа модели (m/f), иначе догадка
// по описанию («девушка», «сестра») и по имени (Маша, Анна Петровна, Смирнова).
const MALE_A = new Set(['никита', 'илья', 'кузьма', 'фома', 'лука', 'савва', 'данила', 'гаврила', 'фрол', 'миша', 'мишка', 'петя', 'ваня', 'дима', 'серёжа', 'сережа', 'лёша', 'леша', 'алёша', 'алеша', 'гоша', 'паша', 'костя', 'толя', 'вова', 'володя', 'слава', 'боря', 'гриша', 'федя', 'стёпа', 'степа', 'тёма', 'тема', 'юра', 'витя', 'коля', 'сеня', 'лёва', 'лева', 'гена', 'жора', 'рома', 'вася', 'тоша', 'кеша', 'эзра', 'джошуа', 'андреа', 'luka', 'ezra', 'joshua', 'nikita', 'ilya', 'misha']);
const UNISEX_A = new Set(['саша', 'женя', 'валя', 'шура', 'сашка', 'sasha']);
const FEMALE_WHO = /(^|[^а-яё])(девушк|девочк|девчонк|женщин|дам[аы]|леди|сестр|мать|мама|матер|дочь|дочк|дочер|жена|жён|невест|подруг|бабушк|бабк|тётя|тетя|тётк|тетк|госпожа|королев|принцесс|княжн|княгин|ведьм|колдунь|служанк|горничн|официантк|актрис|певиц|студентк|школьниц|медсестр|секретарш|хозяйк|вдов|героин|она[^а-яё]|она$)/;
const MALE_WHO = /(^|[^а-яё])(парен|парн|мужчин|мальчик|мальчишк|юнош|сударь|господин|брат|отец|папа|сын|муж[^с]|муж$|жених|дедушк|дед[^у]|дед$|дядя|дядьк|король|принц[^е]|принц$|князь|колдун[^ь]|колдун$|слуга|студент[^к]|студент$|вдовец|он[^а-яё]|он$)/;
export function genderOf(g, name = '', who = '') {
    if (g === 'm' || g === 'f') return g;
    const w = String(who || '').toLowerCase();
    const f = FEMALE_WHO.test(w), m = MALE_WHO.test(w);
    if (f && !m) return 'f';
    if (m && !f) return 'm';
    const words = String(name || '').toLowerCase().replace(/[^a-zа-яё\s-]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return 'n';
    // Отчество и фамилия говорят надёжнее имени.
    for (const x of words) {
        if (/(овна|евна|ична|инична)$/.test(x)) return 'f';
        if (/(ович|евич|ич)$/.test(x) && x.length > 4) return 'm';
    }
    for (const x of words.slice(1)) {
        if (/(ова|ева|ёва|ина|ына|ская|цкая|ая)$/.test(x)) return 'f';
        if (/(ов|ев|ёв|ин|ын|ский|цкий|ой|ый)$/.test(x)) return 'm';
    }
    const first = words[0];
    if (UNISEX_A.has(first) || MALE_A.has(first)) return MALE_A.has(first) ? 'm' : 'n';
    if (/[ая]$/.test(first) || /[a-z]a$/.test(first) || /(ия|ья|ie|ine|elle|ette|lyn|lynn)$/.test(first)) return 'f';
    if (/[а-яё]$/.test(first) && /[бвгджзклмнпрстфхцчшщй]$/.test(first)) return 'm';
    return 'n';
}

// Слово в роде персонажа: gw('f', 'упоминался', 'упоминалась').
export function gw(g, m, f, n) {
    return g === 'f' ? f : (g === 'm' ? m : (n ?? m));
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
            rel: lowerWord(raw.knows_main || raw.rel || '', 40),
            relUser: lowerWord(raw.knows_player || raw.relUser || '', 40),
        });
        if (npc.length >= 40) break;
    }
    return { main, npc };
}

// Одно и то же ли имя с учётом падежей и полноты: «Соколов» = «Иван Соколов», но «Ирина Соколова» ≠ «Иван Соколов».
export function namesMatch(a, b) {
    if (sameName(a, b)) return true;
    // одно имя латиницей, другое кириллицей («Lyuba» и «Люба Хмурова») — сравниваем по звучанию
    const sa = nameScript(a), sb = nameScript(b);
    if (sa && sb && sa !== sb) return namesLookAlike(a, b);
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

// Какими буквами написано имя: 'cyr' | 'lat' | '' (смешанное или без букв).
export function nameScript(name) {
    const t = String(name || '');
    const cyr = /[а-яё]/i.test(t), lat = /[a-z]/i.test(t);
    return cyr && !lat ? 'cyr' : (lat && !cyr ? 'lat' : '');
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
        `knows_main — если главный персонаж знаком с этим человеком ещё ДО начала истории (родня, друзья, бывшие, коллеги, враги, соседи — по карточке или лорбуку), кто он главному персонажу, 1–3 слова («бывшая», «друг детства», «сестра»); если не знакомы — пустая строка. knows_player — то же для игрока (${userName || 'игрок'}), по описанию игрока и лорбуку: кто он игроку, если они знакомы до истории, иначе пустая строка.`,
        'Не включай группы людей без имени («охрана», «соседи»), места, предметы и организации. Не больше 30 персонажей, самые важные — первыми.',
        'Формат: {"main":["Имя"],"npc":[{"name":"Имя","aliases":["прозвище"],"g":"m","who":"кто это","traits":["черта"],"knows_main":"","knows_player":""}]}',
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
        info.persona ? `Это персонаж игрока — ${info.botName}. Придумай мечту ИМЕННО ЕГО, по его описанию и тому, что с ним было в истории. Это не мечта ${user}: ${user} здесь — другой персонаж.` : '',
        'Формат: {"dream":{"title":"мечта","plus":"","steps":[{"text":"этап","done":false}]}}',
    ].filter(Boolean).join('\n');
    const parts = [];
    if (info.card) parts.push(`[${info.persona ? 'Описание персоны игрока' : 'Карточка'}: ${info.botName}]\n${info.card}`);
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
        'Придумай 8 наград строго под этого персонажа, его характер, мир и историю. Награда — это ВЕЩЬ или СЛУЧАЙ, который игрок покупает и дарит персонажу: зелье, амулет, талисман, письмо, подарок, книга, угощение, билет на событие и т. п. — в духе мира истории' + (info.style ? ` и в стиле «${info.style}»` : '') + '. Никогда не называй награду просто чувством или состоянием («Щемящая нежность», «Надёжный щит» — нельзя): title — понятный предмет или случай из 2–4 слов («Зелье нежности», «Амулет спокойствия», «Письмо от сестры», «Билет: тихий вечер вдвоём»).',
        'Три вида: buff — предмет, который действует несколько ответов (turns 3–10) и меняет поведение персонажа; event — случай, который рассказчик вплетёт в ближайший ответ; collect — памятная вещица в коллекцию, на поведение не влияет.',
        'desc — для игрока, просто и конкретно, одной фразой: что изменится в истории («Ещё 5 ответов Роберт мягче и ласковее с тобой», «В следующем ответе Еве приходит письмо от сестры», «Просто милая вещица на память»). Без поэзии и метафор.',
        'effect — для buff и event: что именно передать рассказчику, одной фразой. cost — от 10 до 150, сильнее и редкое — дороже. icon — одно из: ' + REWARD_ICONS.join(', ') + '.',
        'Формат: {"rewards":[{"title":"название","desc":"коротко для игрока","kind":"buff|event|collect","effect":"для рассказчика","turns":5,"cost":40,"icon":"gift"}]}',
    ].join('\n');
    const parts = [];
    if (info.card) parts.push(`[Карточка: ${info.botName}]\n${info.card}`);
    if (c) parts.push(`[Персонаж]\n${JSON.stringify({ name: c.name, traits: (c.traits || []).map(t => t.name), dream: c.dream ? c.dream.title : '', wants: (c.wants || []).map(w => w.text), fears: (c.fears || []).map(f => f.text) })}`);
    if (info.loreMain && info.loreMain.length) parts.push(`[Лорбук — сведения из прошлого разбора]\n${info.loreMain.join('\n\n')}`);
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

// Общий кошелёк чата: сюда падают монеты за успехи всех — персонажей, НПС и персоны игрока.
// Старые дневники, где у каждого был свой счёт, при первом обращении складываются в один.
export function purseOf(state) {
    if (!state) return 0;
    if (state.purse === undefined) {
        state.purse = Object.values(state.characters || {}).reduce((a, c) => a + (c && !c.persona ? (c.points || 0) : 0), 0);
    }
    return Math.max(0, state.purse || 0);
}

// Купить награду: списывает монеты из общего кошелька и применяет. Возвращает текст ошибки или null.
export function buyReward(c, reward, state = null) {
    if (!c || !reward) return 'нет такой награды';
    const have = state ? purseOf(state) : (c.points || 0);
    if (have < reward.cost) return 'не хватает монет';
    if (state) state.purse = have - reward.cost;
    else c.points = (c.points || 0) - reward.cost;
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
            if (e.rel) prev.rel = e.rel;
            if (e.relUser) prev.relUser = e.relUser;
        } else if (!out.main.some(m => namesMatch(m, e.name))) {
            out.npc.push(Object.assign({}, e));
        }
    }
    out.npc = out.npc.slice(0, 60);
    return out;
}
