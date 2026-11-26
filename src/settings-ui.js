// Настройки «Внутреннего мира» — одна схема, два вида: в панели расширений таверны и внутри дневника.
import { MODULES, MODULE_NAMES, EXTRA_MODULES, catchUpTokens, applyAttrPower, CONTEXT_OPTIONS, CATCHUP_OPTIONS, BUDGET_CAP_OPTIONS, RESPONSE_LENGTH_OPTIONS, THINKING_OPTIONS, ACH_RATE_NAMES, DEFAULT_SETTINGS, TOAST_KINDS } from './core.js';
import { THEMES, THEME_IDS, THEME_SWATCHES, THEME_CARDS, THEME_VARIANTS, themeFamily } from './themes.js';
import { API_KINDS } from './api.js';

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const n = list => list.map(v => [v, String(v)]);

// Пункты списков пишутся с большой буквы: «Сам, по размеру сцены», «Очень сильно».
export function cap(t) {
    const x = String(t ?? '');
    return x ? x[0].toUpperCase() + x.slice(1) : x;
}

// Поля, которые хранятся числом.
export const NUMERIC_KEYS = ['memeEvery', 'shopEvery', 'every', 'contextMessages', 'catchUpMessages', 'responseLength', 'budgetCap', 'maxChars', 'injectDepth', 'attrDepth', 'volume', 'clockStep'];

const TURN_OPTIONS = n([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);

// Разделы и поля. show — когда поле видно; hint — пояснение мелким шрифтом.
// id раздела постоянный: по нему запоминается, какие разделы раскрыты.
export function settingsSchema(ctx = {}) {
    ctx.imgStatus = IMG_STATUS.text;
    const custom = s => s.source === 'custom';
    const own = s => s.source === 'custom' && s.apiKind !== 'profile';
    const models = (ctx.models && ctx.models.length ? ctx.models : []).map(m => [m, m]);
    const books = (ctx.books || []).map(b => [b, b]);
    return [
        {
            id: 'main',
            title: 'Главное',
            fields: [
                { type: 'group', label: 'Дневник', hint: 'Включить дневник и выбрать, что в нём вести.' },
                { type: 'toggle', key: 'enabled', label: 'Дневник включён', only: 'st' },
                { type: 'modules', label: 'Что вести в дневнике', hint: 'Выключенный блок не анализируется и не тратит токены.' },
                { type: 'toggle', key: 'showNpc', label: 'Вести и показывать НПС', hint: 'Если выключить — дневник только по главному персонажу.' },
                { type: 'toggle', key: 'persona', label: 'Вести дневник персоны (твоего героя)', hint: 'Всё то же, что у персонажа: настроение, желания, страхи, мечта, черты, отношение к персонажу. Только для тебя — на ответы бота не влияет. Каждый разбор становится длиннее примерно на 500–800 токенов ответа.' },
                { type: 'select', key: 'maxChars', label: 'Сколько персонажей держать в дневнике', options: n([4, 6, 8, 12, 16, 20]) },
                { type: 'group', label: 'Разбор: когда и сколько читать', hint: 'Как часто дневник обновляется и сколько истории читает модель.' },
                { type: 'select', key: 'every', label: 'Когда обновлять дневник', options: [[1, 'после каждого ответа бота'], [2, 'раз в 2 ответа'], [3, 'раз в 3 ответа'], [5, 'раз в 5 ответов'], [0, 'только по кнопке «Чат»']] },
                { type: 'select', key: 'analyzeWhen', label: 'Когда писать дневник', options: [['after', 'после ответа бота — точнее'], ['parallel', 'пока бот пишет ответ — быстрее']], show: s => Number(s.every) > 0, hint: s => (s.analyzeWhen === 'parallel' ? 'Дневник разбирает всё до твоей реплики одновременно с ответом бота — к концу ответа сводка уже готова. Сам ответ бота попадёт в следующий разбор. Если модель дневника та же, что в чате, она будет занята двумя запросами сразу.' : 'Дневник читает готовый ответ бота — записи точнее, но появляются через несколько секунд после ответа. Быстрее всего — отдельная лёгкая модель в «Подключении».') },
                { type: 'select', key: 'contextMessages', label: 'Сколько последних сообщений читать', options: n(CONTEXT_OPTIONS), hint: 'Больше — точнее, но дороже. Обычно хватает 6.' },
                { type: 'select', key: 'catchUpMessages', label: 'Старый чат: сколько сообщений прочитать в первый раз', options: n(CATCHUP_OPTIONS), hint: s => `Разовый запрос при первом заполнении: ≈ ${catchUpTokens(s.catchUpMessages).toLocaleString('ru-RU')} токенов.` },
                { type: 'toggle', key: 'onlyPresent', label: 'Экономия: только те, кто сейчас в сцене', hint: 'Остальные персонажи ждут, пока снова не появятся.' },
                { type: 'group', label: 'Мир истории', hint: 'Время, погода, сны и слухи вокруг героев.' },
                { type: 'toggle', key: 'clock', label: 'Часы и календарь сцены', hint: 'Дата и время истории над дневником: сами понимают таймскипы и строчки вида «[02:50 | 08.10.1996]», календарь подстраивается под сеттинг, есть праздники и дни рождения.' },
                { type: 'select', key: 'clockStep', label: 'Часы сцены: шаг за обычный ответ', options: [[0, 'не двигать — только по тексту'], [1, '1 минута'], [2, '2 минуты'], [5, '5 минут'], [10, '10 минут'], [15, '15 минут'], [30, '30 минут']], show: s => s.clock !== false, hint: 'Это время ВНУТРИ истории, а не то, сколько модель думает или пишет. Каждый ответ бота часы сцены двигаются сами: по отметке времени в ответе, по названной дате, по «через два часа» или «наутро». Если в ответе ничего такого нет — на этот шаг: 5 минут подходят для разговора, 0 — если время у вас стоит, пока его не назовут.' },
                { type: 'range', key: 'memeEvery', label: 'Как часто мемы', min: 1, max: 30, step: 1, fmt: v => (Number(v) === 1 ? 'каждое сообщение' : `раз в ${v} сообщ.`), show: s => s.memes !== false },
                { type: 'group', label: 'Награды и витрина', hint: 'Очки за желания, лавка, достижения и картинки памятных вещей.' },
                { type: 'toggle', key: 'points', label: 'Очки и награды', hint: 'За исполненные желания и мечту персонаж получает очки, на них можно купить награды.' },
                { type: 'toggle', key: 'claimAuto', label: 'Забирать награду за желания сразу', show: s => s.points !== false, hint: s => (s.claimAuto ? 'Монеты за сбывшееся желание приходят сами, а желание вычёркивается.' : 'Сбывшееся желание остаётся в списке с кнопкой «Забрать награду» — монеты придут, когда нажмёшь, и желание уйдёт из списка.') },
                { type: 'toggle', key: 'shopAuto', label: 'Лавка обновляется сама', show: s => s.points !== false, hint: 'Включено — товары в лавке подбираются заново вместе с разбором, раз в выбранное число сообщений. Выключено — только кнопкой «обновить» в лавке.' },
                { type: 'range', key: 'shopEvery', label: 'Как часто обновлять лавку', min: 1, max: 30, step: 1, fmt: v => (Number(v) === 1 ? 'каждое сообщение' : `раз в ${v} сообщ.`), show: s => s.points !== false && s.shopAuto },
                { type: 'toggle', key: 'buyOne', label: 'Покупать по одному', show: s => s.points !== false, hint: 'Включено — у персонажа за раз ждёт один подарок, одно событие и действует один эффект: следующий такой же можно купить, когда прошлый случится. Выключено — можно набрать сколько угодно сразу.' },
                { type: 'toggle', key: 'achievements', label: 'Достижения на витрине', hint: 'Когда в истории случается что-то крупное, дневник сам выдаёт достижение и ставит его на полку витрины. Почти не тратит токенов: строчка в ответе только в важные моменты.' },
                { type: 'range', key: 'achRate', label: 'Как часто выпадают достижения', min: 1, max: 5, step: 1, fmt: v => ACH_RATE_NAMES[v] || '', show: s => s.achievements !== false, hint: 'Влево — реже: только по-настоящему важные события (признание, смерть, свадьба, раскрытая тайна). Вправо — чаще: смешные и трогательные мелочи тоже становятся ачивками. «Обычно» — как было.' },
                { type: 'toggle', key: 'caseArt', label: 'Картинки памятных вещей и подарков', hint: 'Модель рисует вещь маленькой картинкой по смыслу и по истории: засушенная роза, письмо с сургучом, часы. Одна короткая просьба к модели на картинку. Выключено — обычные значки и никаких кнопок «нарисовать».' },
                { type: 'toggle', key: 'artAutoItems', label: 'Памятные вещи рисовать сразу', show: s => s.caseArt !== false, hint: 'Купил вещицу в коллекцию — картинка рисуется сама. Выключено — только когда нажмёшь «нарисовать» у вещи на витрине.' },
                { type: 'toggle', key: 'artAutoGifts', label: 'Подарки рисовать сразу', show: s => s.caseArt !== false, hint: 'Купил подарок — картинка рисуется сама, пока он ждёт вручения, и потом переходит на витрину вместе с ним. Выключено — только по кнопке «нарисовать».' },
                { type: 'group', label: 'Вид и звук', hint: 'Уведомления, анимации и кнопка на экране.' },
                { type: 'toggle', key: 'toasts', label: 'Всплывашки о событиях', hint: '«Желание исполнено», «Страх сбылся», «Новая черта»…' },
                { type: 'toastKinds', label: 'Какие всплывашки показывать', show: s => s.toasts !== false && s.popups !== false, hint: 'Выключенные молчат, но события всё равно записываются в дневник, ленту и витрину.' },
                { type: 'select', key: 'toastPos', label: 'Где всплывают уведомления', options: [['top', 'сверху'], ['bottom', 'снизу']], hint: 'И на компьютере, и на телефоне. Касается и событий, и ошибок дневника.' },
                { type: 'toggle', key: 'sound', label: 'Звуки', hint: 'Свой звук на каждое событие, а на кнопки разбора — карандаш по бумаге.' },
                { type: 'range', key: 'volume', label: 'Громкость звуков', min: 0, max: 100, step: 5, show: s => s.sound },
                { type: 'toggle', key: 'animations', label: 'Анимации', hint: 'Если выключить, дневник станет статичным: без движения, мигания и вращения. То же переключается кнопкой со звёздочкой в шапке.' },
                { type: 'toggle', key: 'liveView', label: 'Показывать, как пишется дневник', hint: 'Пока модель пишет, поверх дневника листок с этапами, а за ним постепенно проступают записи. Если подключение умеет отдавать ответ потоком, видно, как он пишется.' },
                { type: 'toggle', key: 'fab', label: 'Плавающая кнопка-блокнот', hint: s => (s.fab ? 'Её можно перетащить в любое место экрана.' : 'Дневник открывается из меню расширений у поля ввода (волшебная палочка).') },
                { type: 'group', label: 'Для проверки' },
                { type: 'toggle', key: 'diag', label: 'Теги влияния под сообщениями (пока тестируем)', hint: 'Под ответами бота — строка меток: что дневник передал модели перед этим ответом (эмоции, отношение, желания, страхи, притяжение, часы, сон) и что изменилось после разбора. Нажми «что ушло модели» — увидишь точный текст подсказки. Метки видишь только ты: в историю и в запрос к модели они не попадают.' },
            ],
        },
        {
            id: 'connect',
            title: 'Подключение',
            fields: [
                { type: 'group', label: 'Модель дневника', hint: 'Та же модель, что в чате, или отдельное подключение.' },
                { type: 'select', key: 'source', label: 'Какая модель пишет дневник', options: [['main', 'та же, что в чате'], ['custom', 'отдельное подключение']] },
                { type: 'select', key: 'apiKind', label: 'Подключение', options: API_KINDS, show: custom },
                { type: 'select', key: 'profileId', label: 'Профиль', options: [['', '— выбери профиль —'], ...(ctx.profiles || [])], show: s => custom(s) && s.apiKind === 'profile', hint: 'Профили создаются в таверне: «Подключение к API» → «Профили подключения».' },
                { type: 'text', key: 'apiEndpoint', label: 'Адрес API', placeholder: 'https://…/v1', show: s => custom(s) && s.apiKind === 'openai', hint: 'Адрес OpenAI-совместимого API, обычно заканчивается на /v1.' },
                { type: 'text', key: 'apiKey', input: 'password', label: 'Ключ API', placeholder: 'вставь ключ', show: own },
                { type: 'model', key: 'apiModel', label: 'Модель', options: models, show: own },
                { type: 'buttons', show: custom, buttons: [{ id: 'testApi', label: 'Проверить подключение', hint: ctx.apiStatus || '' }] },
                { type: 'group', label: 'Размышления и запас на ответ', hint: 'Сколько модель думает и сколько токенов ей оставлять.' },
                { type: 'select', key: 'thinking', label: 'Сколько модели думать при разборе', options: THINKING_OPTIONS, hint: 'Разбор — это выписка из готового текста, долгие размышления ему почти не нужны. Думающие модели (Gemini 3 и 4, GLM, DeepSeek и похожие) иначе тратят на размышления весь запас, и запись обрывается. «Как в основном чате» — как выставлено в таверне.' },
                { type: 'select', key: 'budgetMode', label: 'Запас на ответ модели', options: [['auto', 'сам, по размеру сцены'], ['fixed', 'как я задам']], hint: s => (s.budgetMode === 'fixed' ? 'Каждый запрос получает ровно столько. Если ответы обрываются — увеличь.' : 'Дневник считает запас сам: сколько персонажей в сцене, какой разбор, думающая ли модель. Платишь только за то, что модель написала, а запас лишь не даёт ей оборваться. Повторных запросов дневник сам не делает.') },
                { type: 'select', key: 'budgetCap', label: 'Потолок на один ответ', options: BUDGET_CAP_OPTIONS.map((v, i) => [v, i === 0 ? `${v} токенов` : (v === 8000 ? '8000 (обычно)' : String(v))]), show: s => s.budgetMode !== 'fixed', hint: 'Больше этого дневник не попросит ни при каком разборе. Защищает от слишком долгих размышлений модели.' },
                { type: 'select', key: 'responseLength', label: 'Запас на каждый ответ', options: RESPONSE_LENGTH_OPTIONS.map((v, i) => [v, i === 0 ? `${v} токенов` : String(v)]), show: s => s.budgetMode === 'fixed', hint: 'Думающие модели (Gemini 3 Pro и похожие) тратят запас ещё и на размышления.' },
                { type: 'group', label: 'Картинки к мемам', hint: 'Чем рисовать картинки мемов: подключение берётся из установленного расширения картинок.' },
                { type: 'select', key: 'memeImg', label: 'Картинки к мемам', options: [['none', 'Без генерации: дневник рисует сам (эмодзи и вёрстка)'], ['ext', 'Через установленное расширение картинок']], hint: s => (s.memes === false ? 'Мемы сейчас выключены в «Что вести в дневнике».' : s.memeImg === 'ext' ? 'Дневник берёт из расширения подключение, модель, ключ, стиль и негатив в момент рисования и ничего к себе не копирует. Промпт для мема — свой, генератор промптов расширения не используется. Если на меме герои истории — их внешность и фото-референсы берутся оттуда же.' : 'Картинка мема — крупные эмодзи на цветном фоне. Чтобы были настоящие картинки, выбери расширение картинок.') },
                { type: 'select', key: 'memeImgExt', label: 'Какое расширение', show: s => s.memeImg === 'ext', options: (ctx.imgExts || []).length ? ctx.imgExts.map(e => [e.key, e.name]) : [['', 'Не нашла установленных расширений картинок']], hint: s => ((ctx.imgExts || []).length ? (ctx.imgDesc ? ctx.imgDesc(s.memeImgExt || ctx.imgExts[0].key) : '') : 'Установи и настрой расширение для генерации картинок, потом открой настройки заново.') },
                { type: 'buttons', show: s => s.memeImg === 'ext', buttons: [{ id: 'testMemeImg', label: 'Проверить картинки', hint: ctx.imgStatus || '' }] },
            ],
        },
        {
            id: 'emotions',
            title: 'Влияние на ролевую',
            fields: [
                { type: 'toggle', key: 'inject', label: 'Дневник влияет на ответы персонажей', hint: 'Модель знает настроение, желания и страхи и ведёт себя соответственно. Часы сцены модель знает всегда, пока они включены.' },
                { type: 'sub', label: 'Эмоции' },
                { type: 'select', key: 'moodMode', label: 'Сколько длятся эмоции', options: [['auto', 'сами — по силе и обстоятельствам'], ['manual', 'как я задам']], hint: s => (s.moodMode === 'manual' ? '' : 'Слабые — 1–2 ответа, средние — 2–6, сильные — 6–25.') },
                { type: 'turns', label: 'Длительность в ответах', show: s => s.moodMode === 'manual' },
                { type: 'select', key: 'moodInfluence', label: 'Какие эмоции влияют на чат', options: [['medium', 'средние и сильные'], ['strong', 'только сильные'], ['all', 'все, даже слабые'], ['none', 'никакие — только для дневника']], show: s => s.inject },
                { type: 'select', key: 'injectDepth', label: 'Насколько настойчиво', options: [[1, 'очень сильно'], [2, 'сильно'], [4, 'обычно'], [6, 'мягко'], [10, 'еле заметно']], show: s => s.inject && s.moodInfluence !== 'none' },
                { type: 'sub', label: 'Притяжение и отторжение', show: s => s.modules && s.modules.attraction !== false },
                { type: 'select', key: 'attrKeys', label: 'Когда напоминать модели о вкусах', options: [['keys', 'только к месту — когда тема всплыла'], ['always', 'всегда, все теги']], show: s => s.inject && s.modules && s.modules.attraction !== false && s.attrPower !== 'none', hint: s => (s.attrKeys === 'always' ? 'Все «нравится / не нравится» уходят модели перед каждым ответом.' : 'Совместимость с тобой модель знает всегда, а конкретный вкус — когда в последних сообщениях зашла речь о нём: о волосах, голосе, сигаретах, работе, собаках… Так персонажи не повторяют одно и то же, а токенов уходит меньше.') },
                { type: 'select', key: 'attrPower', label: 'Как симпатии и антипатии влияют на чат', options: [['max', 'очень сильно'], ['strong', 'сильно'], ['medium', 'обычно'], ['soft', 'мягко'], ['faint', 'еле заметно'], ['none', 'не влияют — только для дневника']], show: s => s.inject && s.modules && s.modules.attraction !== false, hint: s => (s.attrPower === 'none' ? 'Что привлекает и отталкивает персонажа видно только в дневнике.' : 'Что привлекает и отталкивает персонажа, и совместимость с тобой: модель учитывает это в реакциях. Чем сильнее, тем ближе к концу чата подсказка и тем настойчивее она звучит.') },
            ],
        },
        {
            id: 'chat',
            title: 'Этот чат',
            fields: [
                { type: 'books', label: 'Лорбуки для разбора', options: books, studied: ctx.studied || [], html: ctx.booksHtml || '', hint: 'Кроме лорбука персонажа можно доизучить книгу памяти или лорбук мира — сведения добавятся, а не заменятся.' },
                { type: 'forget', only: 'diary', label: 'Забыть персонажа', html: ctx.forgetHtml || '', hint: 'Нажми на имя и выбери: убрать только сейчас (вернётся, если снова придёт в сцену) или навсегда. Забытых навсегда возвращает стрелочка.' },
            ],
        },
        {
            id: 'look',
            title: 'Оформление',
            fields: [
                { type: 'themes', key: 'theme' },
            ],
        },
        {
            id: 'infobar',
            title: 'Инфоблок',
            fields: [
                { type: 'toggle', key: 'infobar', label: 'Инфоблок в сообщениях', hint: 'В начале ответа бота — тонкая плашка в стиле темы: время и дата в этот момент, погода, праздник, настроение героев. Нажми на неё — раскроется то, что есть в дневнике, чтобы не открывать его отдельно. Это только для тебя: в текст сообщения и в запрос к модели она не попадает.' },
                { type: 'select', key: 'infobarWhere', label: 'В каких ответах', options: [['all', 'в каждом ответе бота'], ['last', 'только в последнем']], show: s => s.infobar !== false },
                { type: 'sub', label: 'В строке', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibTime', label: 'Время и время суток', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibDate', label: 'Дата и день недели', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibWeather', label: 'Погода и время года', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibEvents', label: 'Праздник или день рождения сегодня', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibMoods', label: 'Настроение героев', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibRel', label: 'Шкалы дружбы и романтики', hint: 'Рядом с героем — две маленькие шкалы, как в дневнике: ноль посередине.', show: s => s.infobar !== false && s.ibMoods !== false },
                { type: 'sub', label: 'Если развернуть', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibChanges', label: 'Что изменилось после ответа', hint: 'Новые желания и страхи, что сбылось, что прошло, перемены в отношении к тебе. В строке — значок с числом перемен.', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibAttitude', label: 'Отношение к тебе', hint: 'Совместимость сейчас и что герой о тебе думает.', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibWants', label: 'Желания', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibFears', label: 'Страхи', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibNight', label: 'Последний сон', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibFeels', label: 'Чувства и их причины', hint: 'Само настроение и так видно в строке — это подробнее, из-за чего.', show: s => s.infobar !== false },
                { type: 'toggle', key: 'ibSoon', label: 'Ближайшие праздники и дни рождения', show: s => s.infobar !== false },
            ],
        },
    ];
}

function fieldValue(s, key) {
    const v = s[key];
    return v === undefined || v === null ? '' : String(v);
}

function hintText(f, s) {
    return typeof f.hint === 'function' ? f.hint(s) : (f.hint || '');
}

// variant: 'st' — разметка таверны; 'diary' — наши классы под тему дневника.
// Последний ответ проверки картинок — показывается под кнопкой
export const IMG_STATUS = { text: '' };

// Подпись ползунка со словами (частота ачивок, лавки): меняется сразу, пока двигаешь
export function rangeLabel(key, v) {
    for (const sec of settingsSchema({})) for (const f of sec.fields) if (f.key === key && f.fmt) return f.fmt(Number(v));
    return '';
}

export function renderSettingsForm(s, { variant = 'st', profiles = [], models = [], apiStatus = '', books = [], studied = [], open = {}, booksHtml = '', forgetHtml = '', version = '', updated = '', imgExts = [], imgDesc = null } = {}) {
    const st = variant === 'st';
    const schema = settingsSchema({ profiles, models: models.length ? models : s.apiModels, apiStatus, books, studied, booksHtml, forgetHtml, imgExts, imgDesc });
    const sections = schema.map(sec => {
        const fieldsRaw = sec.fields.filter(f => !f.only || f.only === variant).map(f => {
            const hidden = f.show && !f.show(s) ? ' hidden' : '';
            const hint = hintText(f, s);
            const hintHtml = `<small class="iw-f-hint"${hint ? '' : ' hidden'}>${esc(hint)}</small>`;
            if (f.type === 'toggle') {
                return st
                    ? `<div class="iw-f"${hidden}><label class="checkbox_label"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span>${esc(f.label)}</span></label>${hintHtml}</div>`
                    : `<div class="iw-f"${hidden}><label class="iw-switch"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span class="iw-switch-track" aria-hidden="true"></span><span>${esc(f.label)}</span></label>${hintHtml}</div>`;
            }
            if (f.type === 'group') {
                return `\u0001${esc(f.label)}\u0002${esc(f.hint || '')}\u0003`;
            }
            if (f.type === 'sub') {
                return `<div class="iw-f-sub"${hidden}>${esc(f.label)}</div>`;
            }
            if (f.type === 'select') {
                const cur = fieldValue(s, f.key);
                const list = f.options.some(([v]) => String(v) === cur) || cur === '' ? f.options : [...f.options, [cur, cur]];
                const opts = list.map(([v, label]) => `<option value="${esc(v)}"${String(v) === cur ? ' selected' : ''}>${esc(cap(label))}</option>`).join('');
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-set="${f.key}">${opts}</select></label>${hintHtml}</div>`;
            }
            if (f.type === 'range') {
                const v = Number(s[f.key] ?? DEFAULT_SETTINGS[f.key]) || 0;
                const shown = f.fmt ? f.fmt(v) : `${v}%`;
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)} <output class="iw-range-val">${esc(shown)}</output><input type="range" class="iw-range${f.fmt ? ' iw-range-steps' : ''}" data-iw-set="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"${f.fmt ? ` data-iw-fmt="${f.key}"` : ''}></label>${hintHtml}</div>`;
            }
            if (f.type === 'text') {
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}<input type="${f.input === 'password' ? 'password' : 'text'}" class="${st ? 'text_pole' : 'iw-input'}" data-iw-set="${f.key}" value="${esc(fieldValue(s, f.key))}" placeholder="${esc(f.placeholder || '')}" autocomplete="${f.input === 'password' ? 'new-password' : 'off'}" spellcheck="false"${f.input === 'password' ? ' data-lpignore="true" data-1p-ignore' : ''}></label>${hintHtml}</div>`;
            }
            if (f.type === 'model') {
                const cur = fieldValue(s, f.key);
                const list = f.options.length ? (f.options.some(([v]) => v === cur) || !cur ? f.options : [[cur, cur], ...f.options]) : [];
                const control = list.length
                    ? `<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-set="${f.key}">${cur ? '' : '<option value="">— выбери модель —</option>'}${list.map(([v, label]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>`
                    : `<input type="text" class="${st ? 'text_pole' : 'iw-input'}" data-iw-set="${f.key}" value="${esc(cur)}" placeholder="нажми «загрузить список» или впиши название" autocomplete="off" spellcheck="false">`;
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}${control}</label><div class="iw-f-row"><button type="button" class="${st ? 'menu_button' : 'iw-btn'}" data-iw-action="loadModels">загрузить список моделей</button></div>${hintHtml}</div>`;
            }
            if (f.type === 'themes') {
                if (st) {
                    const opts = THEME_IDS.map(id => `<option value="${id}"${s.theme === id ? ' selected' : ''}>${esc(THEMES[id].name)}</option>`).join('');
                    return `<div class="iw-f"${hidden}><label class="iw-f-label">Тема дневника<select class="text_pole" data-iw-set="theme">${opts}</select></label></div>`;
                }
                const fam = themeFamily(s.theme);
                const lum = hex => { const v = parseInt(String(hex).slice(1), 16); return ((v >> 16) * 299 + ((v >> 8) & 255) * 587 + (v & 255) * 114) / 255000; };
                const card = id => {
                    const night = THEME_VARIANTS[id];
                    const on = fam === id;
                    const isNight = on && night && s.theme === night;
                    const [bg, ink, acc] = THEME_SWATCHES[isNight ? night : id] || THEME_SWATCHES[id] || ['#fff', '#333', '#f9c'];
                    // у темы с тёмным вариантом — маленький переключатель «день / ночь» справа на самой карточке
                    const sw = night ? `<span class="iw-theme-dn" role="group" aria-label="Вариант темы">
                        <button type="button" class="iw-theme-dnb${on && !isNight ? ' on' : ''}" data-iw-theme="${id}" aria-pressed="${on && !isNight}" title="Дневной вариант" aria-label="День">${'\u2600\uFE0E'}</button>
                        <button type="button" class="iw-theme-dnb iw-dn-night${isNight ? ' on' : ''}" data-iw-theme="${night}" aria-pressed="${isNight}" title="Ночной вариант" aria-label="Ночь">${'\u263E\uFE0E'}</button></span>` : '';
                    return `<div class="iw-theme-cardw${on ? ' on' : ''}${night ? ' has-dn' : ''}${isNight ? ' night' : ''}"><button type="button" class="iw-theme-card${on ? ' on' : ''}" data-iw-theme="${on ? s.theme : id}" aria-pressed="${on}" style="--sw-bg:${bg};--sw-ink:${ink};--sw-acc:${acc}"><span class="iw-theme-sw" aria-hidden="true"><i></i><i></i></span><span class="iw-theme-name">${esc(THEMES[id].name)}</span></button>${sw}</div>`;
                };
                // по группам: с днём и ночью, тёмные, светлые
                const both = THEME_CARDS.filter(id => THEME_VARIANTS[id]);
                const rest = THEME_CARDS.filter(id => !THEME_VARIANTS[id]);
                const darkOnes = rest.filter(id => lum((THEME_SWATCHES[id] || ['#fff'])[0]) < 0.45);
                const lightOnes = rest.filter(id => !darkOnes.includes(id));
                const group = (title, ids) => (ids.length ? `<div class="iw-theme-group"><div class="iw-theme-group-cap">${esc(title)}</div><div class="iw-themes-grid">${ids.map(card).join('')}</div></div>` : '');
                const cards = group('Днём и ночью', both) + group('Тёмные', darkOnes) + group('Светлые', lightOnes);
                return `<div class="iw-f iw-theme-cards"${hidden}>${cards}</div>`;
            }
            if (f.type === 'modules') {
                // в дневнике — наклейки-кнопки: на телефоне не выделяется текст и ничего не «уезжает»
                const boxes = MODULES.map(m => st
                    ? `<label class="checkbox_label"><input type="checkbox" data-iw-set-mod="${m}"${s.modules[m] !== false ? ' checked' : ''}><span>${esc(MODULE_NAMES[m])}</span></label>`
                    : `<button type="button" class="iw-mod${s.modules[m] !== false ? ' on' : ''}" data-iw-mod="${m}" aria-pressed="${s.modules[m] !== false}">${esc(MODULE_NAMES[m])}</button>`).join('')
                    // сны, слухи, мемы, погода — свои настройки, но включаются тут же
                    + EXTRA_MODULES.map(([k, name]) => st
                        ? `<label class="checkbox_label"><input type="checkbox" data-iw-set="${k}"${s[k] !== false ? ' checked' : ''}><span>${esc(name)}</span></label>`
                        : `<button type="button" class="iw-mod${s[k] !== false ? ' on' : ''}" data-iw-mod-set="${k}" aria-pressed="${s[k] !== false}">${esc(name)}</button>`).join('');
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-f-mods">${boxes}</div>${hintHtml}</div>`;
            }
            if (f.type === 'toastKinds') {
                const tk = s.toastKinds || {};
                const boxes = Object.entries(TOAST_KINDS).map(([k, v]) => st
                    ? `<label class="checkbox_label"><input type="checkbox" data-iw-set-tk="${k}"${tk[k] !== false ? ' checked' : ''}><span>${esc(v.label)}</span></label>`
                    : `<button type="button" class="iw-mod${tk[k] !== false ? ' on' : ''}" data-iw-tk="${k}" aria-pressed="${tk[k] !== false}">${esc(v.label)}</button>`).join('');
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-f-mods">${boxes}</div>${hintHtml}</div>`;
            }
            if (f.type === 'turns') {
                const one = (w, label) => `<label class="iw-f-label">${label}<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-turn="${w}">${TURN_OPTIONS.map(([v]) => `<option value="${v}"${Number(s.moodTurns[w]) === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-f-turns">${one('light', 'слабые')}${one('medium', 'средние')}${one('deep', 'сильные')}</div></div>`;
            }
            if (f.type === 'forget') {
                return f.html ? `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-forget-list">${f.html}</div>${hintHtml}</div>` : '';
            }
            if (f.type === 'books' && f.html && !st) {
                // в дневнике — тот же список с галочками, что у кнопки «Лорбук»
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div>${f.html}${hintHtml}</div>`;
            }
            if (f.type === 'books') {
                const done = f.studied.length ? `<div class="iw-f-hint">Уже изучены: ${esc(f.studied.join(', '))}</div>` : '';
                const opts = f.options.length
                    ? `<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-book="1"><option value="">— лорбуки персонажа и чата —</option>${f.options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}${f.studied.includes(v) ? ' ✓' : ''}</option>`).join('')}</select>`
                    : '';
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}${opts}</label><div class="iw-f-row"><button type="button" class="${st ? 'menu_button' : 'iw-btn'}" data-iw-action="studyBook">Изучить</button></div>${done}${hintHtml}</div>`;
            }
            if (f.type === 'buttons') {
                return `<div class="iw-f iw-f-buttons"${hidden}>${f.buttons.map(b => `<div class="iw-f-btn"><button type="button" class="${st ? 'menu_button' : 'iw-btn'}${b.danger ? ' iw-danger' : ''}" data-iw-action="${b.id}">${esc(b.label)}</button>${b.hint ? `<small class="iw-f-hint">${esc(b.hint)}</small>` : ''}</div>`).join('')}</div>`;
            }
            return '';
        }).join('');
        // группы внутри раздела: карточки с заголовком — чтобы настройки не шли сплошняком
        let fields = fieldsRaw;
        if (fieldsRaw.includes('\u0001')) {
            const parts = fieldsRaw.split('\u0001');
            // каждая группа сворачивается; по умолчанию свёрнуты, дальше — как оставил пользователь
            fields = (parts[0] ? parts[0] : '') + parts.slice(1).map((p, i) => {
                const [label, rest] = p.split('\u0002');
                const [hint, inner] = rest.split('\u0003');
                const gid = `${sec.id}-g${i}`;
                return `<details class="iw-f-group" data-iw-sec="${gid}"${open[gid] ? ' open' : ''}><summary class="iw-f-group-head"><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</summary><div class="iw-f-group-body">${inner}</div></details>`;
            }).join('');
        }
        // в дневнике все разделы свёрнуты, в таверне раскрыты; дальше — как оставил пользователь
        const isOpen = open[sec.id] !== undefined ? open[sec.id] : st;
        return `<details class="iw-f-section"${isOpen ? ' open' : ''} data-iw-sec="${sec.id}"><summary>${esc(sec.title)}</summary><div class="iw-f-body">${fields}</div></details>`;
    }).join('');
    const lang = s.language === 'английском' ? 'en' : 'ru';
    const langPill = `<div class="iw-lang" role="group" aria-label="Язык записей в дневнике">
      <span class="iw-lang-cap" title="На каком языке модель пишет эмоции, желания, страхи и всё остальное в дневнике. Сами кнопки и настройки остаются на русском.">язык записей</span>
      <button type="button" class="iw-lang-opt${lang === 'ru' ? ' on' : ''}" data-iw-lang="русском" aria-pressed="${lang === 'ru'}" title="Записи в дневнике на русском">RU</button>
      <button type="button" class="iw-lang-opt${lang === 'en' ? ' on' : ''}" data-iw-lang="английском" aria-pressed="${lang === 'en'}" title="Записи в дневнике на английском">EN</button>
    </div>`;
    const btnCls = st ? 'menu_button' : 'iw-btn';
    const foot = `<div class="iw-form-foot">
      ${langPill}
      <div class="iw-foot-actions">
        <button type="button" class="${btnCls} iw-danger" data-iw-action="reset">Очистить дневник этого чата</button>
        <button type="button" class="${btnCls} iw-danger" data-iw-action="resetSettings">Сбросить все настройки</button>
      </div>
      <div class="iw-sign">«Внутренний мир»${version ? ` · версия ${esc(version)}` : ''}${updated ? ` · обновлено ${esc(updated)}` : ''}<br>расширение от <a class="iw-sign-nick" href="https://t.me/sillysloppy" target="_blank" rel="noopener" title="Телеграм-канал: t.me/sillysloppy">Слоппи ♥</a></div>
    </div>`;
    return `<div class="iw-form iw-form-${variant}">${sections}${foot}</div>`;
}

// Применить изменение поля формы к настройкам. Возвращает true, если что-то поменялось.
export function applySettingChange(s, el) {
    if (el.dataset.iwSetMod) {
        s.modules[el.dataset.iwSetMod] = el.checked;
        return true;
    }
    if (el.dataset.iwSetTk) {
        s.toastKinds = Object.assign({}, s.toastKinds);
        if (el.checked) delete s.toastKinds[el.dataset.iwSetTk];
        else s.toastKinds[el.dataset.iwSetTk] = false;
        return true;
    }
    if (el.dataset.iwTurn) {
        s.moodTurns[el.dataset.iwTurn] = Math.max(1, Math.min(99, Number(el.value) || 1));
        return true;
    }
    const k = el.dataset.iwSet;
    if (!k) return false;
    if (el.type === 'checkbox') s[k] = el.checked;
    else if (NUMERIC_KEYS.includes(k)) s[k] = Number(el.value);
    else s[k] = el.value;
    if (k === 'attrPower') applyAttrPower(s);
    return true;
}
