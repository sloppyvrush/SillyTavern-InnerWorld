// Настройки «Внутреннего мира» — одна схема, два вида: в панели расширений таверны и внутри дневника.
import { MODULES, MODULE_NAMES, catchUpTokens, applyAttrPower, CONTEXT_OPTIONS, CATCHUP_OPTIONS, BUDGET_CAP_OPTIONS, RESPONSE_LENGTH_OPTIONS } from './core.js';
import { THEMES, THEME_IDS, THEME_SWATCHES } from './themes.js';
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
export const NUMERIC_KEYS = ['every', 'contextMessages', 'catchUpMessages', 'responseLength', 'budgetCap', 'maxChars', 'injectDepth', 'attrDepth', 'volume', 'clockStep'];

const TURN_OPTIONS = n([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);

// Разделы и поля. show — когда поле видно; hint — пояснение мелким шрифтом.
// id раздела постоянный: по нему запоминается, какие разделы раскрыты.
export function settingsSchema(ctx = {}) {
    const custom = s => s.source === 'custom';
    const own = s => s.source === 'custom' && s.apiKind !== 'profile';
    const models = (ctx.models && ctx.models.length ? ctx.models : []).map(m => [m, m]);
    const books = (ctx.books || []).map(b => [b, b]);
    return [
        {
            id: 'main',
            title: 'Главное',
            fields: [
                { type: 'toggle', key: 'enabled', label: 'Дневник включён', only: 'st' },
                { type: 'modules', label: 'Что вести в дневнике', hint: 'Выключенный блок не анализируется и не тратит токены.' },
                { type: 'toggle', key: 'showNpc', label: 'Вести и показывать НПС', hint: 'Если выключить — дневник только по главному персонажу.' },
                { type: 'toggle', key: 'persona', label: 'Вести дневник персоны (твоего героя)', hint: 'Всё то же, что у персонажа: настроение, желания, страхи, мечта, черты, отношение к персонажу. Только для тебя — на ответы бота не влияет. Каждый разбор становится длиннее примерно на 500–800 токенов ответа.' },
                { type: 'select', key: 'every', label: 'Когда обновлять дневник', options: [[1, 'после каждого ответа бота'], [2, 'раз в 2 ответа'], [3, 'раз в 3 ответа'], [5, 'раз в 5 ответов'], [0, 'только по кнопке «Чат»']] },
                { type: 'select', key: 'analyzeWhen', label: 'Когда писать дневник', options: [['after', 'после ответа бота — точнее'], ['parallel', 'пока бот пишет ответ — быстрее']], show: s => Number(s.every) > 0, hint: s => (s.analyzeWhen === 'parallel' ? 'Дневник разбирает всё до твоей реплики одновременно с ответом бота — к концу ответа сводка уже готова. Сам ответ бота попадёт в следующий разбор. Если модель дневника та же, что в чате, она будет занята двумя запросами сразу.' : 'Дневник читает готовый ответ бота — записи точнее, но появляются через несколько секунд после ответа. Быстрее всего — отдельная лёгкая модель в «Подключении».') },
                { type: 'select', key: 'contextMessages', label: 'Сколько последних сообщений читать', options: n(CONTEXT_OPTIONS), hint: 'Больше — точнее, но дороже. Обычно хватает 6.' },
                { type: 'select', key: 'catchUpMessages', label: 'Старый чат: сколько сообщений прочитать в первый раз', options: n(CATCHUP_OPTIONS), hint: s => `Разовый запрос при первом заполнении: ≈ ${catchUpTokens(s.catchUpMessages).toLocaleString('ru-RU')} токенов.` },
                { type: 'toggle', key: 'onlyPresent', label: 'Экономия: только те, кто сейчас в сцене', hint: 'Остальные персонажи ждут, пока снова не появятся.' },
                { type: 'select', key: 'maxChars', label: 'Сколько персонажей держать в дневнике', options: n([4, 6, 8, 12, 16, 20]) },
                { type: 'toggle', key: 'hud', label: 'Мини-инфоблок в чате', hint: 'Показывает сюжетную дату и настроения отдельной плашкой. Не добавляет сообщение в историю и не передаёт его модели.' },
                { type: 'select', key: 'hudPosition', label: 'Где показывать инфоблок', options: [['top', 'сверху чата'], ['bottom', 'снизу чата']], show: s => s.hud || s.debugMode },
                { type: 'toggle', key: 'hudClock', label: 'Инфоблок: дата и время', show: s => s.hud },
                { type: 'toggle', key: 'hudSeason', label: 'Инфоблок: время года', show: s => s.hud },
                { type: 'toggle', key: 'hudWeather', label: 'Инфоблок: погода из описания сцены', show: s => s.hud, hint: 'Показывается только если в недавнем тексте явно описана погода; расширение не угадывает её.' },
                { type: 'toggle', key: 'hudNextEvent', label: 'Инфоблок: ближайшая дата', show: s => s.hud },
                { type: 'toggle', key: 'hudMood', label: 'Инфоблок: настроения персонажей', show: s => s.hud },
                { type: 'toggle', key: 'debugMode', label: 'Режим диагностики в чате', hint: 'Показывает, какие часы, анализы и инструкции срабатывают. Не отправляется модели. Выключай для обычной игры.' },
                { type: 'toggle', key: 'clock', label: 'Часы и календарь сцены', hint: 'Дата и время истории над дневником: сами понимают таймскипы и строчки вида «[02:50 | 08.10.1996]», календарь подстраивается под сеттинг, есть праздники и дни рождения.' },
                { type: 'select', key: 'clockStep', label: 'Сколько времени проходит за обычный ответ', options: [[0, 'нисколько — только явные скачки'], [1, '1 минута'], [2, '2 минуты'], [5, '5 минут'], [10, '10 минут'], [15, '15 минут'], [30, '30 минут']], show: s => s.clock !== false, hint: 'Если в ответе нет ни отметки времени, ни «через два дня», часы сдвигаются на столько.' },
                { type: 'toggle', key: 'points', label: 'Очки и награды', hint: 'За исполненные желания и мечту персонаж получает очки, на них можно купить награды.' },
                { type: 'toggle', key: 'achievements', label: 'Достижения на витрине', hint: 'Когда в истории случается что-то крупное, дневник сам выдаёт достижение и ставит его на полку витрины. Почти не тратит токенов: строчка в ответе только в важные моменты.' },
                { type: 'toggle', key: 'dreams', label: 'Сны героев', hint: 'Когда герой ложится спать или наступает утро, дневник записывает, о чём он думал, засыпая, и что ему снилось. Сон мягко отзывается в его утре.' },
                { type: 'toggle', key: 'rumors', label: 'Слухи о твоём герое', hint: 'Изредка, после заметных событий, НПС начинают судачить. Слухи собираются на странице твоего героя: кто болтает и правда ли это.' },
                { type: 'toggle', key: 'weather', label: 'Погода и время года', hint: 'В полоске часов — погода и время года. Только для красоты, на настроение не влияет.' },

                { type: 'toggle', key: 'sound', label: 'Звуки', hint: 'Свой звук на каждое событие, а на кнопки разбора — карандаш по бумаге.' },
                { type: 'range', key: 'volume', label: 'Громкость звуков', min: 0, max: 100, step: 5, show: s => s.sound },
                { type: 'toggle', key: 'toasts', label: 'Всплывашки о событиях', hint: '«Желание исполнено», «Страх сбылся», «Новая черта»…' },
                { type: 'toggle', key: 'animations', label: 'Анимации', hint: 'Если выключить, дневник станет статичным: без движения, мигания и вращения. То же переключается кнопкой со звёздочкой в шапке.' },
                { type: 'toggle', key: 'liveView', label: 'Показывать, как пишется дневник', hint: 'Пока модель пишет, поверх дневника листок с этапами, а за ним постепенно проступают записи. Если подключение умеет отдавать ответ потоком, видно, как он пишется.' },
                { type: 'select', key: 'toastPos', label: 'Где всплывают уведомления', options: [['top', 'сверху'], ['bottom', 'снизу']], hint: 'И на компьютере, и на телефоне. Касается и событий, и ошибок дневника.' },
                { type: 'toggle', key: 'fab', label: 'Плавающая кнопка-блокнот', hint: s => (s.fab ? 'Её можно перетащить в любое место экрана.' : 'Дневник открывается из меню расширений у поля ввода (волшебная палочка).') },
            ],
        },
        {
            id: 'connect',
            title: 'Подключение',
            fields: [
                { type: 'select', key: 'source', label: 'Какая модель пишет дневник', options: [['main', 'та же, что в чате'], ['custom', 'отдельное подключение']] },
                { type: 'select', key: 'apiKind', label: 'Подключение', options: API_KINDS, show: custom },
                { type: 'select', key: 'profileId', label: 'Профиль', options: [['', '— выбери профиль —'], ...(ctx.profiles || [])], show: s => custom(s) && s.apiKind === 'profile', hint: 'Профили создаются в таверне: «Подключение к API» → «Профили подключения».' },
                { type: 'text', key: 'apiEndpoint', label: 'Адрес API', placeholder: 'https://…/v1', show: s => custom(s) && s.apiKind === 'openai', hint: 'Адрес OpenAI-совместимого API, обычно заканчивается на /v1.' },
                { type: 'text', key: 'apiKey', input: 'password', label: 'Ключ API', placeholder: 'вставь ключ', show: own },
                { type: 'model', key: 'apiModel', label: 'Модель', options: models, show: own },
                { type: 'buttons', show: custom, buttons: [{ id: 'testApi', label: 'Проверить подключение', hint: ctx.apiStatus || '' }] },
                { type: 'select', key: 'budgetMode', label: 'Запас на ответ модели', options: [['auto', 'сам, по размеру сцены'], ['fixed', 'как я задам']], hint: s => (s.budgetMode === 'fixed' ? 'Каждый запрос получает ровно столько. Если ответы обрываются — увеличь.' : 'Дневник считает запас сам: сколько персонажей в сцене, какой разбор, думающая ли модель. Платишь только за то, что модель написала, а запас лишь не даёт ей оборваться. Повторных запросов дневник сам не делает.') },
                { type: 'select', key: 'budgetCap', label: 'Потолок на один ответ', options: BUDGET_CAP_OPTIONS.map((v, i) => [v, i === 0 ? `${v} токенов` : (v === 8000 ? '8000 (обычно)' : String(v))]), show: s => s.budgetMode !== 'fixed', hint: 'Больше этого дневник не попросит ни при каком разборе. Защищает от слишком долгих размышлений модели.' },
                { type: 'select', key: 'responseLength', label: 'Запас на каждый ответ', options: RESPONSE_LENGTH_OPTIONS.map((v, i) => [v, i === 0 ? `${v} токенов` : String(v)]), show: s => s.budgetMode === 'fixed', hint: 'Думающие модели (Gemini 3 Pro и похожие) тратят запас ещё и на размышления.' },
            ],
        },
        {
            id: 'emotions',
            title: 'Влияние на ролевую',
            fields: [
                { type: 'toggle', key: 'inject', label: 'Дневник влияет на ответы персонажей', hint: 'Модель знает настроение, желания и страхи и ведёт себя соответственно.' },
                { type: 'sub', label: 'Эмоции' },
                { type: 'select', key: 'moodMode', label: 'Сколько длятся эмоции', options: [['auto', 'сами — по силе и обстоятельствам'], ['manual', 'как я задам']], hint: s => (s.moodMode === 'manual' ? '' : 'Слабые — 1–2 ответа, средние — 2–6, сильные — 6–25.') },
                { type: 'turns', label: 'Длительность в ответах', show: s => s.moodMode === 'manual' },
                { type: 'select', key: 'moodInfluence', label: 'Какие эмоции влияют на чат', options: [['medium', 'средние и сильные'], ['strong', 'только сильные'], ['all', 'все, даже слабые'], ['none', 'никакие — только для дневника']], show: s => s.inject },
                { type: 'select', key: 'injectDepth', label: 'Насколько настойчиво', options: [[1, 'очень сильно'], [2, 'сильно'], [4, 'обычно'], [6, 'мягко'], [10, 'еле заметно']], show: s => s.inject && s.moodInfluence !== 'none' },
                { type: 'toggle', key: 'clockInject', label: 'Модель знает время сцены', show: s => s.inject && s.clock !== false, hint: 'Дата, время суток, ближайшие праздники и дни рождения, и сколько прошло после таймскипа.' },
                { type: 'sub', label: 'Притяжение и отторжение', show: s => s.modules && s.modules.attraction !== false },
                { type: 'select', key: 'attrActivation', label: 'Когда учитывать предпочтения', options: [['context', 'по ситуации: ключи и контекст'], ['always', 'всегда передавать все']], show: s => s.inject && s.modules && s.modules.attraction !== false, hint: 'Ситуативный режим передаёт только подходящие к сцене предпочтения, уменьшая расход токенов. Можно добавить свои ключи и регулярные выражения к тегам.' },
                { type: 'select', key: 'attrPower', label: 'Как симпатии и антипатии влияют на чат', options: [['max', 'очень сильно'], ['strong', 'сильно'], ['medium', 'обычно'], ['soft', 'мягко'], ['faint', 'еле заметно'], ['none', 'не влияют — только для дневника']], show: s => s.inject && s.modules && s.modules.attraction !== false, hint: s => (s.attrPower === 'none' ? 'Что привлекает и отталкивает персонажа видно только в дневнике.' : 'Что привлекает и отталкивает персонажа, и совместимость с тобой: модель учитывает это в реакциях. Чем сильнее, тем ближе к концу чата подсказка и тем настойчивее она звучит.') },
            ],
        },
        {
            id: 'chat',
            title: 'Этот чат',
            fields: [
                { type: 'books', label: 'Лорбуки для разбора', options: books, studied: ctx.studied || [], html: ctx.booksHtml || '', hint: 'Кроме лорбука персонажа можно доизучить книгу памяти или лорбук мира — сведения добавятся, а не заменятся.' },
                { type: 'forget', only: 'diary', label: 'Забыть персонажа', html: ctx.forgetHtml || '', hint: 'Персонаж пропадёт из дневника этого чата. Если он снова появится в сцене, дневник заведёт его заново.' },
            ],
        },
        {
            id: 'look',
            title: 'Оформление',
            fields: [
                { type: 'themes', key: 'theme' },
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
export function renderSettingsForm(s, { variant = 'st', profiles = [], models = [], apiStatus = '', books = [], studied = [], open = {}, booksHtml = '', forgetHtml = '', version = '', updated = '' } = {}) {
    const st = variant === 'st';
    const schema = settingsSchema({ profiles, models: models.length ? models : s.apiModels, apiStatus, books, studied, booksHtml, forgetHtml });
    const sections = schema.map(sec => {
        const fields = sec.fields.filter(f => !f.only || f.only === variant).map(f => {
            const hidden = f.show && !f.show(s) ? ' hidden' : '';
            const hint = hintText(f, s);
            const hintHtml = `<small class="iw-f-hint"${hint ? '' : ' hidden'}>${esc(hint)}</small>`;
            if (f.type === 'toggle') {
                return st
                    ? `<div class="iw-f"${hidden}><label class="checkbox_label"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span>${esc(f.label)}</span></label>${hintHtml}</div>`
                    : `<div class="iw-f"${hidden}><label class="iw-switch"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span class="iw-switch-track" aria-hidden="true"></span><span>${esc(f.label)}</span></label>${hintHtml}</div>`;
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
                const v = Number(s[f.key]) || 0;
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)} <output class="iw-range-val">${v}%</output><input type="range" class="iw-range" data-iw-set="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}"></label>${hintHtml}</div>`;
            }
            if (f.type === 'text') {
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}<input type="${f.input === 'password' ? 'password' : 'text'}" class="${st ? 'text_pole' : 'iw-input'}" data-iw-set="${f.key}" value="${esc(fieldValue(s, f.key))}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" spellcheck="false"></label>${hintHtml}</div>`;
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
                const cards = THEME_IDS.map(id => {
                    const [bg, ink, acc] = THEME_SWATCHES[id] || ['#fff', '#333', '#f9c'];
                    const on = s.theme === id;
                    return `<button type="button" class="iw-theme-card${on ? ' on' : ''}" data-iw-theme="${id}" aria-pressed="${on}" style="--sw-bg:${bg};--sw-ink:${ink};--sw-acc:${acc}"><span class="iw-theme-sw" aria-hidden="true"><i></i><i></i></span><span class="iw-theme-name">${esc(THEMES[id].name)}</span></button>`;
                }).join('');
                return `<div class="iw-f iw-theme-cards"${hidden}>${cards}</div>`;
            }
            if (f.type === 'modules') {
                // в дневнике — наклейки-кнопки: на телефоне не выделяется текст и ничего не «уезжает»
                const boxes = MODULES.map(m => st
                    ? `<label class="checkbox_label"><input type="checkbox" data-iw-set-mod="${m}"${s.modules[m] ? ' checked' : ''}><span>${esc(MODULE_NAMES[m])}</span></label>`
                    : `<button type="button" class="iw-mod${s.modules[m] ? ' on' : ''}" data-iw-mod="${m}" aria-pressed="${!!s.modules[m]}">${esc(MODULE_NAMES[m])}</button>`).join('');
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
