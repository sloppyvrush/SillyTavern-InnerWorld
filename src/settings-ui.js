// Настройки «Внутреннего мира» — одна схема, два вида: в панели расширений таверны и внутри дневника.
import { MODULES, MODULE_NAMES, catchUpTokens } from './core.js';
import { THEMES, THEME_IDS } from './themes.js';
import { API_KINDS } from './api.js';

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const n = list => list.map(v => [v, String(v)]);

// Поля, которые хранятся числом.
export const NUMERIC_KEYS = ['every', 'contextMessages', 'catchUpMessages', 'responseLength', 'maxChars', 'injectDepth'];

const TURN_OPTIONS = n([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);

// Разделы и поля. show — когда поле видно; hint — пояснение мелким шрифтом.
export function settingsSchema(ctx = {}) {
    const custom = s => s.source === 'custom';
    const own = s => s.source === 'custom' && s.apiKind !== 'profile';
    const models = (ctx.models && ctx.models.length ? ctx.models : []).map(m => [m, m]);
    return [
        {
            title: 'Оформление',
            fields: [
                { type: 'select', key: 'theme', label: 'Тема дневника', options: THEME_IDS.map(id => [id, THEMES[id].name]) },
                { type: 'toggle', key: 'fab', label: 'Плавающая кнопка-блокнот', hint: s => (s.fab ? 'Её можно перетащить в любое место экрана.' : 'Дневник открывается из меню расширений у поля ввода (волшебная палочка).') },
                { type: 'toggle', key: 'toasts', label: 'Всплывашки о событиях', hint: '«Желание исполнено», «Страх сбылся», «Новая черта»…' },
            ],
        },
        {
            title: 'Главное',
            fields: [
                { type: 'toggle', key: 'enabled', label: 'Дневник включён', only: 'st' },
                { type: 'select', key: 'source', label: 'Какая модель пишет дневник', options: [['main', 'та же, что в чате'], ['custom', 'отдельное подключение']] },
                { type: 'select', key: 'apiKind', label: 'Подключение', options: API_KINDS, show: custom },
                { type: 'select', key: 'profileId', label: 'Профиль', options: [['', '— выбери профиль —'], ...(ctx.profiles || [])], show: s => custom(s) && s.apiKind === 'profile', hint: 'Профили создаются в таверне: «Подключение к API» → «Профили подключения».' },
                { type: 'text', key: 'apiEndpoint', label: 'Адрес API', placeholder: 'https://…/v1', show: s => custom(s) && s.apiKind === 'openai', hint: 'Адрес OpenAI-совместимого API, обычно заканчивается на /v1.' },
                { type: 'text', key: 'apiKey', input: 'password', label: 'Ключ API', placeholder: 'вставь ключ', show: own },
                { type: 'model', key: 'apiModel', label: 'Модель', options: models, show: own },
                { type: 'buttons', show: custom, buttons: [{ id: 'testApi', label: 'Проверить подключение', hint: ctx.apiStatus || '' }] },
            ],
        },
        {
            title: 'Что вести',
            fields: [
                { type: 'modules', label: 'Блоки дневника', hint: 'Выключенный блок не анализируется и не тратит токены.' },
                { type: 'toggle', key: 'showNpc', label: 'Вести и показывать НПС', hint: 'Если выключить — дневник только по главному персонажу.' },
            ],
        },
        {
            title: 'Когда обновлять',
            fields: [
                { type: 'select', key: 'every', label: 'Обновлять дневник', options: [[1, 'после каждого ответа бота'], [2, 'раз в 2 ответа'], [3, 'раз в 3 ответа'], [5, 'раз в 5 ответов'], [0, 'только по кнопке «обновить»']] },
                { type: 'select', key: 'contextMessages', label: 'Сколько последних сообщений читать', options: n([2, 4, 6, 8, 10, 15, 20]), hint: 'Больше — точнее, но дороже. Обычно хватает 6.' },
                { type: 'select', key: 'catchUpMessages', label: 'Старый чат: сколько сообщений прочитать в первый раз', options: n([6, 8, 10, 12, 15, 20, 30]), hint: s => `Разовый запрос при первом заполнении: ≈ ${catchUpTokens(s.catchUpMessages).toLocaleString('ru-RU')} токенов.` },
                { type: 'toggle', key: 'onlyPresent', label: 'Экономия: только те, кто сейчас в сцене', hint: 'Остальные персонажи ждут, пока снова не появятся.' },
            ],
        },
        {
            title: 'Эмоции',
            fields: [
                { type: 'select', key: 'moodMode', label: 'Сколько длятся эмоции', options: [['auto', 'сами — по силе и обстоятельствам'], ['manual', 'как я задам']], hint: s => (s.moodMode === 'manual' ? '' : 'Слабые — 1–2 ответа, средние — 2–6, сильные — 6–25.') },
                { type: 'turns', label: 'Длительность в ответах', show: s => s.moodMode === 'manual' },
                { type: 'select', key: 'moodInfluence', label: 'Какие эмоции влияют на поведение', options: [['medium', 'средние и сильные'], ['strong', 'только сильные'], ['all', 'все, даже слабые'], ['none', 'никакие — только для дневника']] },
            ],
        },
        {
            title: 'Подсказка модели',
            fields: [
                { type: 'toggle', key: 'inject', label: 'Учитывать дневник в ответах персонажей', hint: 'Модель знает настроение, желания и страхи и ведёт себя соответственно.' },
                { type: 'select', key: 'injectDepth', label: 'Насколько настойчиво', options: [[1, 'очень (у самого конца чата)'], [2, 'сильно'], [4, 'обычно'], [6, 'мягко'], [10, 'еле заметно']], show: s => s.inject },
            ],
        },
        {
            title: 'Дополнительно',
            collapsed: true,
            fields: [
                { type: 'select', key: 'language', label: 'Язык записей', options: [['русском', 'русский'], ['английском', 'английский']] },
                { type: 'select', key: 'maxChars', label: 'Сколько персонажей держать в дневнике', options: n([4, 6, 8, 12, 16, 20]) },
                { type: 'select', key: 'responseLength', label: 'Запас на ответ модели', options: [[1000, 'маленький (1000 токенов)'], [1500, 'обычный (1500)'], [2000, 'побольше (2000)'], [3000, 'большой (3000)'], [4000, 'очень большой (4000)']], hint: 'Если записи обрываются — увеличь.' },
            ],
        },
        {
            title: 'Этот чат',
            fields: [
                { type: 'buttons', buttons: [
                    { id: 'study', label: 'Изучить лорбук и карточку', hint: 'Узнать НПС этого мира — они появятся в дневнике, когда придут в сцену.' },
                    { id: 'reset', label: 'Очистить дневник этого чата', danger: true },
                ] },
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
export function renderSettingsForm(s, { variant = 'st', profiles = [], models = [], apiStatus = '' } = {}) {
    const st = variant === 'st';
    const schema = settingsSchema({ profiles, models: models.length ? models : s.apiModels, apiStatus });
    const sections = schema.map((sec, si) => {
        const fields = sec.fields.filter(f => !f.only || f.only === variant).map(f => {
            const hidden = f.show && !f.show(s) ? ' hidden' : '';
            const hint = hintText(f, s);
            const hintHtml = `<small class="iw-f-hint"${hint ? '' : ' hidden'}>${esc(hint)}</small>`;
            if (f.type === 'toggle') {
                return st
                    ? `<div class="iw-f"${hidden}><label class="checkbox_label"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span>${esc(f.label)}</span></label>${hintHtml}</div>`
                    : `<div class="iw-f"${hidden}><label class="iw-switch"><input type="checkbox" data-iw-set="${f.key}"${s[f.key] ? ' checked' : ''}><span class="iw-switch-track" aria-hidden="true"></span><span>${esc(f.label)}</span></label>${hintHtml}</div>`;
            }
            if (f.type === 'select') {
                const cur = fieldValue(s, f.key);
                const list = f.options.some(([v]) => String(v) === cur) || cur === '' ? f.options : [...f.options, [cur, cur]];
                const opts = list.map(([v, label]) => `<option value="${esc(v)}"${String(v) === cur ? ' selected' : ''}>${esc(label)}</option>`).join('');
                return `<div class="iw-f"${hidden}><label class="iw-f-label">${esc(f.label)}<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-set="${f.key}">${opts}</select></label>${hintHtml}</div>`;
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
            if (f.type === 'modules') {
                const boxes = MODULES.map(m => st
                    ? `<label class="checkbox_label"><input type="checkbox" data-iw-set-mod="${m}"${s.modules[m] ? ' checked' : ''}><span>${esc(MODULE_NAMES[m])}</span></label>`
                    : `<label class="iw-check"><input type="checkbox" data-iw-set-mod="${m}"${s.modules[m] ? ' checked' : ''}><span>${esc(MODULE_NAMES[m])}</span></label>`).join('');
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-f-mods">${boxes}</div>${hintHtml}</div>`;
            }
            if (f.type === 'turns') {
                const one = (w, label) => `<label class="iw-f-label">${label}<select class="${st ? 'text_pole' : 'iw-select'}" data-iw-turn="${w}">${TURN_OPTIONS.map(([v]) => `<option value="${v}"${Number(s.moodTurns[w]) === v ? ' selected' : ''}>${v}</option>`).join('')}</select></label>`;
                return `<div class="iw-f"${hidden}><div class="iw-f-label">${esc(f.label)}</div><div class="iw-f-turns">${one('light', 'слабые')}${one('medium', 'средние')}${one('deep', 'сильные')}</div></div>`;
            }
            if (f.type === 'buttons') {
                return `<div class="iw-f iw-f-buttons"${hidden}>${f.buttons.map(b => `<div class="iw-f-btn"><button type="button" class="${st ? 'menu_button' : 'iw-btn'}${b.danger ? ' iw-danger' : ''}" data-iw-action="${b.id}">${esc(b.label)}</button>${b.hint ? `<small class="iw-f-hint">${esc(b.hint)}</small>` : ''}</div>`).join('')}</div>`;
            }
            return '';
        }).join('');
        // в дневнике все разделы свёрнуты; в таверне раскрыто всё, кроме «Дополнительно»
        const open = st && !sec.collapsed ? ' open' : '';
        return `<details class="iw-f-section"${open} data-iw-sec="${si}"><summary>${esc(sec.title)}</summary><div class="iw-f-body">${fields}</div></details>`;
    }).join('');
    return `<div class="iw-form iw-form-${variant}">${sections}</div>`;
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
    return true;
}
