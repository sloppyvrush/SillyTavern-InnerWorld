// Разметка дневника и всплывашек. Только строки — без обращений к таверне.
import { buyBlock, dedupeSteps, settleMood, cleanKnown, purseOf, isHearsay, isDead, npcWeight, loveFor, loveToAttitude, moodletLeftLabel, WEIGHT_NAMES, WEIGHT_TURNS, eventTitle, eventText, signed, shownAliases, SHOWN_MOODLETS, FACE_NAMES, guessFace, moodFaces, plural, genderOf, gw, PTYPES, PTYPE_GROUPS, ptypeGroup, TEMPERS, ZODIAC, bornText, CHEM_NAMES, ATTRACT_CATALOG, CHEM_SCORE, CHEM_NOW_NAMES, chemLevelOf, CONTEXT_OPTIONS, CATCHUP_OPTIONS, catchUpTokens, BUDGET_CAP_OPTIONS, RESPONSE_LENGTH_OPTIONS, MODULES, MODULE_NAMES, LIFE_FIELDS, COUNT_WORDS, relStatus, friendLevel, romanceLevel, seedRel, ORIENTS, orientName, MEME_PIC, rumorPlain as rumorPlainIb, EXTRA_MODULES } from './core.js';
import { ageNow, annivText } from './clock.js';
import { themeLabels, EVENT_ICONS, BLOCK_ICONS, toastKicker, errorKicker, icon, pictIcon, smileHtml, faceIcon, currencyIcon, bimboNicks, setIconTheme, iconStyle } from './themes.js';
import { npcBadge } from './npc-icons.js';
import { tokenPick } from './settings-ui.js';
import { REL_THEMED } from './rel-themes.js';
import { collectionOf, TIER_NAMES_RU, ACH_FACES, ACH_KINDS } from './showcase.js';

// Всё, что стоит отдельной строкой или плашкой, — с заглавной буквы (модель пишет со строчной).
function cap(v) {
    const t = String(v ?? '');
    return t.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (m, a, b) => a + b.toUpperCase());
}
const ce = v => esc(cap(v));
// Длинное слово в заголовке карточки (ориентация, знак) — чуть мельче, чтобы не залезало под кнопку
const pnLong = t => { const w = Math.max(...String(t || '').split(/\s+/).map(x => x.length)); return w >= 17 ? ' iw-pn-xlong' : (w >= 13 ? ' iw-pn-long' : ''); };

// Данные для подбора значка НПС: роль из лорбука или от модели, черты, имя, пол.
function badgeInfo(c, entry) {
    return { who: (entry && entry.who) || c.who || '', traits: (entry && entry.traits) || [], name: c.name, g: genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, (entry && entry.who) || c.who || '') };
}

// Невидимый фильтр «дрожащей линии» для рисованных тем.
const ROUGH_FILTER = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="iw-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="iw-rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter><filter id="iw-pixelate" x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse"><feFlood x="1" y="1" width="1" height="1" flood-color="#000"/><feComposite width="2" height="2"/><feTile result="dots"/><feComposite in="SourceGraphic" in2="dots" operator="in"/><feMorphology operator="dilate" radius="1"/></filter><filter id="iw-brush"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.2"/></filter><filter id="iw-stamp"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.6" result="holes"/><feComposite in="SourceGraphic" in2="holes" operator="in"/></filter></svg>';

export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13c2 1.4 3.4 3 4.6 5 3-5.6 6.6-9.6 11.4-12.5"/></svg>';
const SCRIBBLE = '<svg class="iw-scribble" width="220" height="12" viewBox="0 0 260 12" fill="none" aria-hidden="true"><path d="M2 8c20-6 40 4 60-1s40-5 60 0 40 4 60-1 40-4 76 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

function delBtn(kind, i) {
    return `<button type="button" class="iw-del" data-iw-del="${kind}:${i}" title="Убрать из дневника" aria-label="Убрать из дневника">${icon('x')}</button>`;
}

// Имя не рвётся посреди слова: чем длиннее самое длинное слово, тем мельче шрифт.
// Короткое имя для превью: «Виктор Громов» → «Виктор Г.», «Анна Сергеевна Белова» → «Анна Б.».
// Обращения («Мастер Кубин», «леди Ровена») и одно слово не трогаем; полное имя — в досье и подсказке.
const NAME_TITLES = /^(мастер|госпожа|господин|госпожой|леди|лорд|сэр|мисс|миссис|мистер|мадам|месье|доктор|док|профессор|капитан|майор|генерал|сержант|лейтенант|полковник|тётя|тетя|дядя|баба|бабушка|дед|дедушка|отец|мать|сестра|брат|святой|святая|король|королева|принц|принцесса|князь|княгиня|граф|графиня|барон|баронесса|lady|lord|sir|miss|mrs|mr|dr|master|captain)$/i;
export function shortName(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || NAME_TITLES.test(words[0])) return words.join(' ');
    const rest = words.slice(1).filter(w => /^\p{Lu}/u.test(w));
    if (!rest.length) return words.join(' ');
    const last = rest[rest.length - 1];
    return `${words[0]} ${[...last][0]}.`;
}

// Статус для превью: первая часть «кто это» — «мама Вити», «экономка Роберта».
export function shortStatus(who) {
    let t = String(who || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    t = t.split(/\s*[,;.(]\s*|\s+[—–-]\s+/)[0].trim();
    if ([...t].length > 34) t = [...t].slice(0, 33).join('').replace(/\s+\S*$/, '') + '…';
    return t;
}

function nameFit(name) {
    const longest = Math.max(0, ...String(name || '').split(/[\s-]+/).map(w => w.length));
    if (longest >= 13) return ' iw-name-xxl';
    if (longest >= 10) return ' iw-name-xl';
    if (longest >= 8) return ' iw-name-l';
    return '';
}

// Сворачивание блоков: какие свёрнуты. У свёрнутого блока виден только заголовок.
let FOLD = { collapsed: {} };

function blockHead(kind, label, extra = '') {
    const folded = !!FOLD.collapsed[kind];
    const grip = FOLD.drag ? `<span class="iw-drag" data-iw-drag="${kind}" title="Перетащить блок" aria-label="Перетащить блок">${icon('grip')}</span>` : '';
    const btn = kind === 'rewards' ? '' : `<button type="button" class="iw-fold" data-iw-fold="${kind}" title="${folded ? 'Развернуть' : 'Свернуть'}" aria-label="${folded ? 'Развернуть' : 'Свернуть'}" aria-expanded="${!folded}">${icon(folded ? 'plus' : 'minus')}</button>`;
    // приписка в скобках («Стена (Дуров, верни стену)») — мелко, справа от заголовка
    const m = /^(.+?)\s*\(([^()]+)\)$/.exec(String(label));
    const aside = m ? `<span class="iw-label-aside">${m[2]}</span>` : '';
    return `<div class="iw-block-head">${grip}<span class="iw-block-icon">${icon(BLOCK_ICONS[kind])}</span><span class="iw-label">${m ? m[1] : label}</span>${aside}${folded ? '' : extra}${btn}</div>`;
}

function groupHead(label, hint = '') {
    return `<div class="iw-group-head"><span>${esc(label)}</span>${hint ? `<span class="iw-group-hint">${esc(hint)}</span>` : ''}</div>`;
}

// Кошелёк в шапке: крупный значок валюты и очки текущего персонажа;
// по нажатию — что это за валюта в этой теме, за что даётся и на что тратится.
function renderWallet(wallet, theme = '') {
    const coin = icon(currencyIcon(theme));
    if (!wallet || !wallet.list.length) return '';
    const L = themeLabels(theme, 'm');
    const cur = { points: wallet.purse ?? ((wallet.list.find(x => x.key === wallet.current) || wallet.list[0]).points) };
    const name = L.currency || 'монетки';
    const Name = name.charAt(0).toUpperCase() + name.slice(1);
    return `<details class="iw-wallet"><summary title="${esc(Name)}: что это">${coin}<b>${shortPoints(cur.points)}</b></summary>
      <div class="iw-wallet-info">
        <div class="iw-wallet-title"><span class="iw-cheat-coin" data-iw-cheat="1">${coin}</span><span>${esc(Name)}</span></div>
        <p>Общий кошелёк этого чата. Монеты падают, когда что-то сбывается у любого — у персонажа, НПС или твоего героя: исполненное желание <b>+10</b>, преодолённый страх <b>+5</b>, шаг к мечте <b>+25</b>, мечта целиком <b>+100</b>.</p>
        <p>Тратится на награды для персонажа: открой «${esc(L.shop || 'Магазин наград')}» рядом, там настроение, события и вещи в коллекцию.</p>
        <p class="iw-wallet-now"><span>Сейчас:</span><b>${coin}<span>${Number(cur.points || 0).toLocaleString('ru-RU')}</span></b></p>
      </div></details>`;
}

// Проверка звуков и всплывашек: прячется под «Проверить» в меню громкости
const TEST_EVENTS = [
    ['want_done', 'Желание сбылось'], ['dream_step', 'Шаг к мечте'], ['dream_grow', 'Мечта дополнилась'], ['dream_change', 'Мечта изменилась'],
    ['dream_done', 'Мечта сбылась'], ['fear_real', 'Страх сбылся'], ['fear_gone', 'Страх отступил'], ['trait_new', 'Новая черта'],
    ['trait_up', 'Черта сильнее'], ['trait_down', 'Черта слабее'], ['impression', 'Первое впечатление'], ['attitude', 'Отношение'],
    ['reward', 'Покупка'], ['write', 'Запись в дневник'], ['error', 'Ошибка'],
];
const TEST_PICK = `<details class="iw-vol-test"><summary>▶ Проверить звуки и всплывашки</summary><div class="iw-vol-test-body">
        <button type="button" class="iw-test-all" data-iw-test="all">▶ Все по очереди</button>
        <div class="iw-test-grid">${TEST_EVENTS.map(([k, n]) => `<button type="button" data-iw-test="${k}">${n}</button>`).join('')}</div>
        <div class="iw-vol-row"><span>Сны и слухи</span></div>
        <div class="iw-test-grid"><button type="button" data-iw-test="night">Сон боту</button><button type="button" data-iw-test="rumor">Слух</button><button type="button" data-iw-test="meme">Мем</button></div>
        <div class="iw-vol-row"><span>Витрина</span></div>
        <div class="iw-test-grid"><button type="button" data-iw-test="ach">Достижение</button><button type="button" data-iw-test="keep">Памятная вещь</button><button type="button" data-iw-test="clearcase">Стереть тестовые</button></div>
      </div></details>`;
const TEST_MENU = `<details class="iw-vol iw-testmenu">
      <summary class="iw-tool" title="Проверка уведомлений и звуков (временно)" aria-label="Проверка уведомлений и звуков">${'<svg class="iw-ico" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>'}</summary>
      <div class="iw-vol-menu iw-test-menu">
        <div class="iw-vol-row"><span>Проверка (временно)</span></div>
        <button type="button" class="iw-test-all" data-iw-test="all">▶ Все по очереди</button>
        <div class="iw-test-grid">${TEST_EVENTS.map(([k, n]) => `<button type="button" data-iw-test="${k}">${n}</button>`).join('')}</div>
        <div class="iw-vol-row"><span>Сны и слухи</span></div>
        <div class="iw-test-grid"><button type="button" data-iw-test="night">Сон боту</button><button type="button" data-iw-test="rumor">Слух</button><button type="button" data-iw-test="meme">Мем</button></div>
        <div class="iw-vol-row"><span>Витрина</span></div>
        <div class="iw-test-grid"><button type="button" data-iw-test="ach">Достижение</button><button type="button" data-iw-test="keep">Памятная вещь</button><button type="button" data-iw-test="clearcase">Стереть тестовые</button></div>
      </div>
    </details>`;

// acts — кнопки разбора: на телефоне они живут в шапке (прилипают сверху вместе с ней), на компьютере — под вкладками.
let CASE_BTN = null; // { on, fresh } — значок витрины в шапке
export function renderHeader(settings, theme, busy, inSettings = false, wallet = null, shop = null, acts = '') {
    const L = themeLabels(theme, 'm');
    const sound = settings.sound !== false;
    // на телефоне кошелёк прячется, а монеты видны цифрой-кружком на значке лавки
    const purse = shop && wallet ? { points: wallet.purse ?? 0 } : null;
    const badge = purse ? `<b class="iw-shop-badge" aria-label="${esc(L.currency || 'монетки')}: ${Number(purse.points || 0)}">${shortPoints(purse.points)}</b>` : '';
    return `
<div class="iw-head">
  <div class="iw-titlebox"><div class="iw-title${[...String(L.title || '')].length > 9 ? ' iw-title-long' : ''}">${esc(L.title)}</div>${SCRIBBLE}</div>
  ${shop || (wallet && wallet.list && wallet.list.length) ? `<div class="iw-shopbar">
    ${shop ? `<button type="button" class="iw-shop-sticker${shop.on ? ' on' : ''}" data-iw-view="shop:${esc(shop.key)}" aria-pressed="${shop.on}" title="${esc(L.shop || 'Магазин наград')}">${icon('shop')}<span>${esc(L.shop || 'Магазин наград')}</span></button>` : ''}
    ${renderWallet(wallet, theme)}
  </div>` : ''}
  <div class="iw-tools">
    ${shop ? `<button type="button" class="iw-tool iw-shop-tool${shop.on ? ' on' : ''}" data-iw-view="shop:${esc(shop.key)}" aria-pressed="${shop.on}" title="${esc(L.shop || 'Магазин наград')}" aria-label="${esc(L.shop || 'Магазин наград')}">${icon('shop')}${badge}</button>` : ''}
    ${CASE_BTN ? `<button type="button" class="iw-tool iw-case-tool${CASE_BTN.on ? ' on' : ''}" data-iw-view="${CASE_BTN.on ? 'back' : 'showcase'}" aria-pressed="${CASE_BTN.on}" title="Витрина: памятные вещи и достижения" aria-label="Витрина">${icon('trophy')}${CASE_BTN.fresh ? `<b class="iw-case-new" aria-label="новых достижений: ${CASE_BTN.fresh}">${CASE_BTN.fresh}</b>` : ''}</button>` : ''}
    <details class="iw-vol${sound ? '' : ' off'}">
      <summary class="iw-tool" title="Звук и громкость" aria-label="Звук и громкость">${icon(sound ? 'sound' : 'mute')}</summary>
      <div class="iw-vol-menu">
        <button type="button" class="iw-vol-toggle iw-sound${sound ? '' : ' off'}" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}<span>${sound ? 'Звук включён' : 'Звук выключен'}</span></button>
        <div class="iw-vol-row"><span>Громкость</span><output class="iw-range-val">${Number(settings.volume ?? 50)}%</output></div>
        <input type="range" class="iw-range iw-vol-range" data-iw-volume min="0" max="100" step="1" value="${Number(settings.volume ?? 50)}" aria-label="Громкость звуков"${sound ? '' : ' disabled'}>
        <button type="button" class="iw-vol-toggle iw-popups${settings.popups === false ? ' off' : ''}" aria-pressed="${settings.popups !== false}">${icon(settings.popups === false ? 'bell_off' : 'bell')}<span>${settings.popups === false ? 'Всплывашки выключены' : 'Всплывашки включены'}</span></button>
        ${TEST_PICK}
      </div>
    </details>
    <button type="button" class="iw-tool iw-anim${settings.animations === false ? ' off' : ''}" title="${settings.animations === false ? 'Анимации выключены: нажми, чтобы включить' : 'Выключить анимации'}" aria-label="Анимации" aria-pressed="${settings.animations !== false}">${icon(settings.animations === false ? 'sparkle_off' : 'sparkle')}</button>
    <button type="button" class="iw-tool iw-gear${inSettings ? ' on' : ''}" title="${inSettings ? 'Вернуться к дневнику' : 'Настройки'}" aria-label="Настройки" aria-pressed="${inSettings}">${icon('gear')}</button>
    <button type="button" class="iw-tool iw-close" title="Закрыть" aria-label="Закрыть">${icon('x')}</button>
  </div>${acts ? `<div class="iw-head-acts">${acts}</div>` : ''}
</div>`;
}

// Лицо-смайлик на вкладке: цвет и выражение по настроению.
// Смайлик эмоции рядом с именем в открытом НПС.
function titleFace(c) {
    const [face] = moodFaces(c);
    if (!face) return '';
    return ` <span class="iw-title-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face, '', true)}</span>`;
}

// Фон карточки в цвет главного настроения: мягкий градиент под фотографией и именем.
function tabTint(c) {
    const [a, b] = moodFaces(c);
    if (!a || a === 'neutral') return '';
    return `<span class="iw-tab-tint iw-face-${a}" aria-hidden="true">${b && b !== 'neutral' ? `<span class="iw-tab-tint2 iw-face-${b}"></span>` : ''}</span>`;
}

function faceBadge(c, npc = false) {
    const [face] = moodFaces(c);
    if (!face) return '';
    return `<span class="iw-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face, '', npc)}</span>`;
}

// Кнопки разбора: над ними надпись «Проанализировать» с рисованной стрелкой к кнопкам;
// пока идёт разбор, надпись сменяется загрузкой в стиле темы (точки, сердечки, полоска).
// Меню у кнопки «Лорбук»: галочками отмечается, что разбирать в этом чате —
// его берут и «Лорбук», и «Всё сразу». Карточка, описание персоны и привязанные лорбуки
// (персонажа, чата, персоны) отмечены сами, но их тоже можно снять.
let MULTI_NOW = false;
let WISH_BUSY = ''; // кому сейчас придумываются новые желания и страхи
let HIST_OPEN = {}; // раскрыты ли «прошлые сны» и «прошлые слухи»
let CAL_NOW = null; // календарь истории — чтобы дата рождения писалась его месяцами

const LINK_TAG = { char: 'персонажа', chat: 'чата', persona: 'персоны' };
function booksMenu(books = [], picked = [], linked = [], busy = false, off = [], hasPersona = false, wide = false) {
    const on = new Set(picked);
    const offSet = new Set(off);
    const links = linked.map(x => (typeof x === 'string' ? { name: x, from: 'char' } : x));
    const own = new Set(links.map(x => x.name));
    const box = `<span class="iw-book-box" aria-hidden="true">${icon('tick')}</span>`;
    const opt = (key, label, tag, isOn) => `<button type="button" class="iw-book-opt linked${isOn ? ' on' : ''}" data-iw-skip-book="${esc(key)}" aria-pressed="${isOn}">${box}<span>${esc(label)}</span>${tag ? `<em>${esc(tag)}</em>` : ''}</button>`;
    const fixedRows = opt('__card', 'Карточка персонажа', 'описание', !offSet.has('__card'))
        + (hasPersona ? opt('__persona', 'Описание персоны', 'твоё', !offSet.has('__persona')) : '');
    const ownRows = links.map(x => opt(x.name, x.name, LINK_TAG[x.from] || 'свой', !offSet.has(x.name))).join('');
    const rows = books.filter(n => !own.has(n)).map(name => `<button type="button" class="iw-book-opt${on.has(name) ? ' on' : ''}" data-iw-pick-book="${esc(name)}" aria-pressed="${on.has(name)}">${box}<span>${esc(name)}</span></button>`).join('');
    const n = books.filter(x => !own.has(x) && on.has(x)).length;
    return `
      <details class="iw-books${wide ? ' iw-books-wide' : ''}">
        ${wide
            ? `<summary class="iw-books-btn iw-books-field" title="Выбрать лорбуки для разбора">${icon('bookopen')}<span class="iw-books-field-text">${booksSummary(links, books, on, offSet, hasPersona)}</span>${icon('chevron')}</summary>`
            : `<summary class="iw-books-btn" title="Выбрать лорбуки для разбора" aria-label="Выбрать лорбуки">${icon('chevron')}</summary>`}
        <div class="iw-books-menu">
          <div class="iw-books-cap">Что разбирать <span class="iw-books-count">${n ? `Ещё отмечено: ${n}` : ''}</span></div>
          <div class="iw-books-list">
            ${fixedRows}${ownRows}${rows || (ownRows ? '' : '<div class="iw-books-empty">Других лорбуков в таверне нет.</div>')}
          </div>
          <button type="button" class="iw-book-go" data-iw-analyze="lore"${busy ? ' disabled' : ''}>${icon('bookopen')}<span>Разобрать отмеченные</span></button>
          <div class="iw-books-hint">Привязанное к персонажу, чату и персоне отмечено само, но галочку можно снять. Галочки запоминаются для этого чата, «Всё сразу» берёт то же самое. Сведения добавляются к уже собранным, ничего не стирается.</div>
        </div>
      </details>`;
}

// Подпись на кнопке списка в настройках: сколько всего отмечено.
function booksSummary(links, books, on, offSet, hasPersona) {
    const own = new Set(links.map(x => x.name));
    const fixed = 1 + (hasPersona ? 1 : 0);
    const total = fixed + links.length + books.filter(n => !own.has(n)).length;
    const picked = ['__card', ...(hasPersona ? ['__persona'] : [])].filter(k => !offSet.has(k)).length
        + links.filter(x => !offSet.has(x.name)).length
        + books.filter(n => !own.has(n) && on.has(n)).length;
    return `Отмечено: ${picked} из ${total}`;
}

// Тот же список лорбуков с галочками — для настроек дневника, во всю ширину.
export function renderBooksField({ books = [], picked = [], linked = [], busy = false, off = [], hasPersona = false } = {}) {
    return booksMenu(books, picked, linked, busy, off, hasPersona, true);
}

// Сколько ответов осталось до следующего автоматического разбора (при «раз в N ответов»)
let NEXT_IN = 0;
function nextBadge() {
    if (!(NEXT_IN > 0)) return '';
    const t = `Следующий автоматический разбор — ${NEXT_IN === 1 ? 'после следующего ответа' : `через ${NEXT_IN} ${plural(NEXT_IN, 'ответ', 'ответа', 'ответов')}`}`;
    return `<span class="iw-act-next" title="${t}" aria-label="${t}">${icon('clock')}<b>${NEXT_IN}</b></span>`;
}

// ВКонтакте: пока дневник пишется — случайный стикер у надписи и на листке загрузки (один на весь разбор)
const VK_CAP = [79197, 79186, 76100, 76115, 76098, 76106];
const VK_SHEET = [79158, 79171, 79187, 76110, 76099, 76091, 76101];
const VK_LOAD = { on: false, cap: VK_CAP[0], sheet: VK_SHEET[0] };
function vkLoadPick(working) {
    if (working && !VK_LOAD.on) {
        VK_LOAD.cap = VK_CAP[Math.floor(Math.random() * VK_CAP.length)];
        VK_LOAD.sheet = VK_SHEET[Math.floor(Math.random() * VK_SHEET.length)];
    }
    VK_LOAD.on = !!working;
}
function analyzeButtons(busyKind, labels = {}, books = [], picked = [], linked = [], working = false, off = [], hasPersona = false) {
    const btn = (kind, ic, label, title) => {
        // Кнопка, которая сейчас работает, сама становится «Стоп» — на том же месте и того же размера.
        if (busyKind === kind) {
            return `<button type="button" class="iw-act iw-act-${kind} busy iw-act-stop" data-iw-stop title="Остановить разбор" aria-label="Остановить разбор"><span class="iw-stop-ring" aria-hidden="true">${icon('stop')}</span><span>Стоп</span></button>`;
        }
        return `<button type="button" class="iw-act iw-act-${kind}" data-iw-analyze="${kind}" title="${title}"${working ? ' disabled' : ''}>${icon(ic)}<span>${label}</span>${kind === 'chat' && !working ? nextBadge() : ''}</button>`;
    };
    vkLoadPick(working);
    const cap = working
        ? `<span class="iw-loader" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="iw-cap-text">${esc(labels.analyzing || 'Записываю')}</span><span class="iw-vk-st iw-vk-st-${VK_LOAD.cap}" aria-hidden="true"></span>`
        : `<span class="iw-cap-text">${esc(labels.analyze || 'Проанализировать')}</span><span class="iw-cap-arrow" aria-hidden="true">${icon('pointer')}</span>`;
    return `
  <div class="iw-acts-wrap">
    <div class="iw-acts-cap${working ? ' busy' : ''}" role="status">${cap}</div>
    <div class="iw-acts" role="group" aria-label="Проанализировать" aria-busy="${working}">
      ${btn('chat', 'chat', 'Чат', 'Разобрать последние сообщения')}
      <span class="iw-act-split">${btn('lore', 'bookopen', 'Лорбук', 'Разобрать карточку и лорбуки: НПС и сведения о персонажах')}${booksMenu(books, picked, linked, working, off, hasPersona)}</span>
      ${btn('all', 'sparkle', 'Всё сразу', 'Сначала лорбук и карточка, потом чат')}
    </div>
  </div>`;
}

function photoHtml(c, avatarFor) {
    const url = avatarFor ? avatarFor(c.name) : '';
    return url
        ? `<span class="iw-photo" style="background-image:url('${esc(url)}')"></span>`
        : `<span class="iw-photo iw-photo-letter">${esc((c.name || '?').slice(0, 1).toUpperCase())}</span>`;
}

// Вкладки: главные персонажи-фотографии и наклейка «НПС»; справа — кнопки разбора.
// День рождения на карточке: «20 авг · 27» (возраст — по часам сцены, если календарь обычный).
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function tabBorn(c, clock, key = '') {
    if (!c) return '';
    // возраст: по часам сцены, а если часов нет — тот, что вписан (вручную или из карточки)
    let age = clock && clock.cal && clock.t ? ageNow(clock.cal, clock.t, c) : null;
    if (age === null && c.ageAt && Number.isFinite(c.ageAt.age)) age = c.ageAt.age;
    if (age === null && Number.isFinite(c.ageSaid)) age = c.ageSaid;
    const edit = key ? ` data-iw-born="${esc(key)}" role="button" tabindex="0"` : '';
    if (!c.born || !c.born.d || !c.born.m) {
        if (age !== null) return `<span class="iw-tab-born"${edit} title="Возраст на дату сцены${c.born && c.born.y ? `, год рождения ${c.born.y}` : ''}. Нажми, чтобы вписать день рождения">${icon('cake')}<span>${c.born && c.born.y ? `${c.born.y} · ` : ''}${age} ${plural(age, 'год', 'года', 'лет')}</span></span>`;
        return key ? `<span class="iw-tab-born iw-born-none"${edit} title="День рождения не указан — нажми, чтобы вписать">${icon('cake')}<span>д.р.?</span></span>` : '';
    }
    const today = clock && clock.t && clock.cal && clock.cal.type !== 'days' && clock.t.m === c.born.m && clock.t.d === c.born.d;
    const cm = CAL_NOW && CAL_NOW.type === 'custom' && Array.isArray(CAL_NOW.months) ? CAL_NOW.months[c.born.m - 1] : null;
    const mShort = cm && cm.name ? cm.name.slice(0, 4).toLowerCase() : MONTH_SHORT[c.born.m - 1];
    return `<span class="iw-tab-born${today ? ' iw-born-today' : ''}"${edit} title="Нажми, чтобы поправить. День рождения: ${esc(bornText(c.born, CAL_NOW))}${age !== null ? `, ${age} ${plural(age, 'год', 'года', 'лет')}` : ''}">${icon('cake')}<span>${c.born.d} ${mShort}${age !== null ? ` · ${age}` : ''}</span></span>`;
}

// Мультибот с двумя и больше главными героями: карусель — выбранный герой впереди, соседи по бокам на заднем плане;
// стрелки и клик по соседу листают по кругу. Последнего показанного героя помним, пока открыты НПС или персона.
let CAR_LAST = '';
export function renderTabs({ state, mains, view, avatarFor, npc, busyKind = '', persona = null, labels = {}, books = [], picked = [], linked = [], working = false, off = [], noActs = false, clock = null, customOrder = false, carDir = '' }) {
    const tab = (key, extra = '', attrs = '') => {
        const c = state.characters[key] || { name: key };
        const on = view === 'main:' + key || view === 'shop:' + key;
        return `<button type="button" class="iw-tab${on ? ' on' : ''}${extra}" data-iw-view="main:${esc(key)}" aria-pressed="${on}"${attrs}>${tabTint(c)}<span class="iw-tape"></span><span class="iw-photo-wrap">${photoHtml(c, avatarFor)}${faceBadge(c)}</span><span class="iw-tab-name${nameFit(shortName(c.name))}" title="${esc(c.name)}">${esc(shortName(c.name))}</span>${c.mood ? `<span class="iw-tab-mood">${ce(c.mood)}</span>` : ''}${state.characters[key] ? tabBorn(c, clock, key) : ''}</button>`;
    };
    let tabs;
    if (mains.length >= 2) {
        const shown = mains.find(k => view === 'main:' + k || view === 'shop:' + k);
        if (shown) CAR_LAST = shown;
        const n = mains.length;
        const cur = Math.max(0, mains.indexOf(CAR_LAST));
        const at = d => mains[(cur + d + n) % n];
        const cards = mains.map((key, i) => {
            const d = (i - cur + n) % n;
            const pos = d === 0 ? 'c' : d === 1 ? 'r' : d === n - 1 ? 'l' : 'h';
            const dir = pos === 'r' ? 'next' : pos === 'l' ? 'prev' : '';
            return tab(key, ` iw-car-card iw-car-${pos}`, `${dir ? ` data-iw-cardir="${dir}"` : ''}${pos === 'h' ? ' tabindex="-1" aria-hidden="true"' : ''}`);
        }).join('');
        const dots = mains.map((k, i) => `<span class="iw-car-dot${i === cur ? ' on' : ''}"></span>`).join('');
        tabs = `<div class="iw-car"${carDir ? ` data-dir="${esc(carDir)}"` : ''} role="group" aria-label="Главные герои: ${n}">
          <button type="button" class="iw-car-arrow iw-car-prev" data-iw-view="main:${esc(at(-1))}" data-iw-cardir="prev" title="${esc(shortName((state.characters[at(-1)] || { name: at(-1) }).name))}" aria-label="Предыдущий герой">${icon('back')}</button>
          <div class="iw-car-stage">${cards}</div>
          <button type="button" class="iw-car-arrow iw-car-next" data-iw-view="main:${esc(at(1))}" data-iw-cardir="next" title="${esc(shortName((state.characters[at(1)] || { name: at(1) }).name))}" aria-label="Следующий герой">${icon('back')}</button>
          <div class="iw-car-dots" aria-hidden="true">${dots}</div>
        </div>`;
    } else {
        tabs = mains.map(key => tab(key)).join('');
    }
    const sticker = npc
        ? `<button type="button" class="iw-npc-sticker${view.startsWith('npc') ? ' on' : ''}" data-iw-view="npc" aria-pressed="${view.startsWith('npc')}">
             <span class="iw-npc-sticker-title">${icon('users')} ${esc(labels.npc || 'НПС')}</span>
             <span class="iw-npc-sticker-count">${npc.met}${npc.known ? ` из ${npc.known}` : ''}</span>
           </button>`
        : '';
    // блоки переставлены — под НПС маленькая красная кнопка «вернуть как было»
    const resetBtn = customOrder ? `<button type="button" class="iw-order-reset" data-iw-order-reset title="Вернуть блоки дневника на их обычные места">${icon('undo')}<span>вернуть блоки</span></button>` : '';
    const npcCol = resetBtn ? `<div class="iw-npc-col">${sticker}${resetBtn}</div>` : sticker;
    // карточка персоны игрока — такая же, как у персонажа (без подписи: и так понятно, чья она)
    let me = '';
    if (persona) {
        const pc = (persona.key && state.characters[persona.key]) || { name: persona.name };
        const on = view.startsWith('me:');
        const photo = persona.avatar
            ? `<span class="iw-photo" style="background-image:url('${esc(persona.avatar)}')"></span>`
            : `<span class="iw-photo iw-photo-letter">${esc((pc.name || '?').slice(0, 1).toUpperCase())}</span>`;
        me = `<button type="button" class="iw-tab iw-tab-persona${on ? ' on' : ''}" data-iw-view="me:${esc(persona.key || '')}" aria-pressed="${on}" title="Дневник твоего героя: только для тебя, на ответы бота не влияет">${persona.key ? tabTint(pc) : ''}<span class="iw-tape"></span><span class="iw-photo-wrap">${photo}${persona.key ? faceBadge(pc) : ''}</span><span class="iw-tab-name${nameFit(shortName(pc.name))}" title="${esc(pc.name)}">${esc(shortName(pc.name))}</span>${pc.mood ? `<span class="iw-tab-mood">${ce(pc.mood)}</span>` : ''}${persona.key ? tabBorn(pc, clock, persona.key) : ''}</button>`;
    }
    return `<div class="iw-tabrow"><div class="iw-tabs">${tabs}${npcCol}${me}</div>${noActs ? '' : `<span class="iw-divider" aria-hidden="true"></span>${analyzeButtons(busyKind, labels, books, picked, linked, working || !!busyKind, off, !!persona)}`}</div>`;
}

function feelMeter(m, manualTurns) {
    const max = manualTurns ? (manualTurns[m.weight] || 1) : (WEIGHT_TURNS[m.weight] || WEIGHT_TURNS.medium)[2];
    const pct = Math.max(6, Math.min(100, Math.round((m.left / max) * 100)));
    return `<span class="iw-feel-meter" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
}

// Слово состояния подсвечено цветом эмоции; смешанное состояние — переходом из одного цвета в другой.
function moodWord(c) {
    const [a, b] = moodFaces(c);
    const cls = a ? ` iw-face-${a}` : '';
    const style = b ? ` style="--face-bg2: var(--fb-${b}); --face-ink2: var(--fi-${b})"` : '';
    const title = a ? ` title="${esc([a, b].filter(Boolean).map(f => FACE_NAMES[f]).join(' + '))}"` : '';
    return `<span class="iw-mood-word${cls}${b ? ' iw-mood-mix' : ''}"${style}${title}><span class="iw-hl iw-hl-main">${esc(c.mood)}</span></span>`;
}

function renderMood(c, L, opts) {
    const one = (m, i) => {
        const face = m.face || guessFace(m.emotion, m.tone);
        return `
      <li class="iw-feel iw-tone-${m.tone || 'mid'} iw-face-${face} iw-w-${m.weight || 'medium'}">
        <div class="iw-feel-top">
          <span class="iw-feel-face" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face, '', !!(opts && opts.npc))}</span>
          <span class="iw-feel-name${[...String(m.emotion || '')].length > 15 ? ' iw-feel-xlong' : ([...String(m.emotion || '')].length > 11 ? ' iw-feel-long' : '')}">${ce(m.emotion)}</span>
          <span class="iw-feel-power">${ce(WEIGHT_NAMES[m.weight] || '')}</span>
          ${delBtn('moodlets', i)}
        </div>
        ${m.feel ? `<div class="iw-feel-inner">${ce(m.feel)}</div>` : ''}
        ${m.why ? `<div class="iw-feel-why"><span class="iw-feel-cause">Из-за:</span> ${ce(m.why)}</div>` : ''}
        <div class="iw-feel-time">${feelMeter(m, opts.manualTurns)}<span>${ce(moodletLeftLabel(m))}</span></div>
      </li>`;
    };
    const list = c.moodlets || [];
    const shown = list.slice(0, SHOWN_MOODLETS).map(one).join('');
    const rest = list.slice(SHOWN_MOODLETS);
    const more = rest.length
        ? `<details class="iw-more"><summary>Ещё ${rest.length} ${plural(rest.length, 'эмоция', 'эмоции', 'эмоций')}</summary><ul class="iw-feels">${rest.map((m, j) => one(m, j + SHOWN_MOODLETS)).join('')}</ul></details>`
        : '';
    const feels = shown;
    return `
    <section class="iw-block iw-b-mood">
      ${blockHead('mood', esc(L.moodTitle))}
      <div class="iw-mood-now"><span class="iw-mood-lead">${esc(L.moodLead)}</span> ${c.mood ? moodWord(c) : '<span class="iw-muted">— пока не понятно</span>'}</div>
      ${feels ? `<ul class="iw-feels iw-feels-flat">${feels}</ul>${more}` : '<div class="iw-muted">Ничего особенного</div>'}
    </section>`;
}

// Вкладки «Витрина | Фотоальбом» — альбом живёт рядом с витриной, чтобы не теснить шапку

// Сны и мысли перед сном — свой блок: последний сон крупно, прошлые — списком
function renderNights(c, persona = false, L = {}) {
    const d = (c.dreams || [])[(c.dreams || []).length - 1];
    const g = genderOf(c.g, c.name, c.who);
    const who = persona ? gw(g, 'твой герой', 'твоя героиня', 'твой герой') : gw(g, 'герой', 'героиня', 'герой');
    const body = d ? dreamNote(c) : `<div class="iw-muted">Пока не ${gw(g, 'спал', 'спала', 'спал')}. Когда ${who} ляжет спать или в истории наступит утро, здесь появится, о чём ${gw(g, 'он', 'она', 'он')} ${gw(g, 'думал', 'думала', 'думал')}, засыпая, и что ${gw(g, 'ему', 'ей', 'ему')} снилось.${persona ? ' Сон только для тебя — на ответы бота не влияет.' : ''}</div>`;
    return `
    <section class="iw-block iw-b-nights">
      ${blockHead('nights', esc(L.nights || 'Сны и мысли перед сном'))}
      ${body}
    </section>`;
}

// Один сон — карточкой; i — его номер в c.dreams (для кнопки «убрать»)
const DREAM_KIND = { scene: 'Сон', fragments: 'Обрывки сна', dialog: 'Разговор во сне', memory: 'Сон-воспоминание', symbol: 'Сон-знак', recurring: 'Снова этот сон' };
function dreamBody(d) {
    const f = d.form || 'scene';
    const L = Array.isArray(d.lines) ? d.lines.map(l => (typeof l === 'string' ? { text: l } : l)).filter(l => l && l.text) : [];
    if (f === 'fragments' && L.length) return `<ul class="iw-night-frags">${L.map(l => `<li>${ce(l.text)}</li>`).join('')}</ul>`;
    if (f === 'dialog' && L.length) return `<div class="iw-night-dlg">${L.map(l => `<div class="iw-nd-line">${l.who ? `<b>${esc(l.who)}:</b> ` : ''}<span>${ce(l.text)}</span></div>`).join('')}</div>${d.text && !/^[^ ]+:/.test(d.text) ? `<div class="iw-night-sub">${ce(d.text)}</div>` : ''}`;
    if (f === 'symbol' && d.symbol) return `<div class="iw-night-sym"><span>${esc(d.symbol)}</span></div><div class="iw-night-text">${ce(d.text)}</div>`;
    if (f === 'memory') return `${d.when ? `<div class="iw-night-when">${esc(d.when)}</div>` : ''}<div class="iw-night-text iw-night-mem">${ce(d.text)}</div>`;
    return `<div class="iw-night-text">${ce(d.text)}</div>`;
}
export function nightCard(d, i, big = false) {
    const f = d.form || 'scene';
    return `<li class="iw-night${big ? ' iw-night-big' : ''} iw-night-${esc(String(d.tone || '').replace(/\s+/g, '-'))} iw-nf-${esc(f)}">
      <div class="iw-night-head">${icon(f === 'memory' ? 'clock' : (f === 'dialog' ? 'chat' : (f === 'symbol' ? 'key' : 'moon')))}<span>${DREAM_KIND[f] || 'Сон'}${d.tone ? ` · ${esc(d.tone)}` : ''}</span><button type="button" class="iw-del iw-hist-x" data-iw-del="dreams:${i}" title="Убрать этот сон" aria-label="Убрать сон">${icon('x')}</button></div>
      ${d.thought ? `<div class="iw-night-thought">Засыпая: «${ce(d.thought)}»</div>` : ''}
      ${dreamBody(d)}
      ${d.date ? `<div class="iw-night-date">${esc(d.date)}</div>` : ''}
    </li>`;
}
const cap1 = t => { const x = String(t ?? ''); return x ? x[0].toLocaleUpperCase('ru') + x.slice(1) : x; };
// В блоке — последний сон; «все сны» раскрывает прошлые тем же видом, новые сверху
function dreamNote(c) {
    const list = c.dreams || [];
    if (!list.length) return '';
    const last = list.length - 1;
    const older = list.map((d, i) => ({ d, i })).slice(0, -1).reverse();
    return `<ul class="iw-hist-list">${nightCard(list[last], last, true)}</ul>
      ${older.length ? `<details class="iw-hist" data-iw-hist="nights"${HIST_OPEN.nights ? ' open' : ''}><summary class="iw-hist-sum"><span>Прошлые сны</span><b>${older.length}</b>${icon('chevron')}</summary><ul class="iw-hist-list">${older.map(x => nightCard(x.d, x.i)).join('')}</ul></details>` : ''}`;
}

// Слухи о герое (персоне или боте): кто болтает, что говорят и насколько это правда
const RUMOR_TRUTH = { true: 'Правда', half: 'Полуправда', false: 'Выдумка' };
const nameKey = v => String(v || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, '').trim();
function aboutHim(r, name, persona) {
    // на странице твоего героя — все слухи; у персонажа — о нём и общие, «по городу»
    if (persona || r.town) return true;
    const a = nameKey(r.about);
    const n = nameKey(name);
    if (!a) return false;
    return a === n || a.split(' ')[0] === n.split(' ')[0];
}
// Хэштеги и @ники в посте — подсвечены
const tagged = t => esc(t).replace(/(^|\s)([#@][\p{L}\p{N}_]+)/gu, '$1<span class="iw-rp-tag">$2</span>');
const shortNum = n => (n >= 10000 ? `${Math.round(n / 1000)}k` : (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n)));

// Тело слуха — по форме, каждая свёрстана как настоящая вещь: шёпот, «подслушано», газетная вырезка,
// свиток глашатая, пост, записка
const initial = v => esc(String(v || '').replace(/^@/, '').replace(/[^\p{L}\d]/gu, '').charAt(0).toUpperCase() || '?');
const hueOf = v => [...String(v || '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
// Эпоха по умолчанию для старых слухов без era — как они выглядели раньше
const RUMOR_DEF_ERA = { talk: 'modern', whisper: 'medieval', dialog: 'modern', report: 'medieval', news: 'retro', herald: 'medieval', post: 'modern', note: 'modern' };
const RUMOR_EDITION = { medieval: ['свежий лист', 'цена — медяк'], retro: ['вечерний выпуск', 'цена 5 коп.'], steam: ['экстренный выпуск', 'паровая печать'], modern: ['только что', 'новости'], cyber: ['LIVE', 'лента'] };
const strips = t => String(t || '').split(/(?<=[.!?…])\s+/).filter(Boolean).map(x => `<span class="iw-g-strip">${esc(x)}</span>`).join(' ');
export function rumorBody(r) {
    const f = r.form || 'talk';
    const era = r.era || RUMOR_DEF_ERA[f] || 'modern';
    const box = (form, inner) => `<div class="iw-prop iw-pf-${form} iw-pe-${esc(era)}">${inner}</div>`;
    const head = (kick, src) => `<div class="iw-g-head"><span class="iw-g-kick">${esc(kick)}</span>${src ? `<span class="iw-g-src">${esc(src)}</span>` : ''}</div>`;
    const lines = list => {
        const who = [];
        return `<div class="iw-g-lines">${list.map(l => {
            let k = who.indexOf(l.who); if (k < 0) { who.push(l.who); k = who.length - 1; }
            return `<div class="iw-g-line iw-g-${k % 2 ? 'b' : 'a'}">${l.who ? `<b class="iw-g-who">${esc(l.who)}</b>` : ''}<span class="iw-g-say">${ce(l.text)}</span></div>`;
        }).join('')}</div>`;
    };
    const title = r.title ? `<div class="iw-g-title">${ce(r.title)}</div>` : '';
    if (f === 'whisper' && Array.isArray(r.lines) && r.lines.length) {
        return box('whisper', `${head('Шепчутся', r.place || '')}${lines(r.lines)}`);
    }
    if (f === 'dialog' && Array.isArray(r.lines) && r.lines.length) {
        const k = era === 'cyber' ? 'Перехват' : 'Подслушано';
        return box('dialog', `${head(k, r.place || r.who || '')}${lines(r.lines)}`);
    }
    if (f === 'report') {
        const kick = { medieval: 'Донесение', retro: 'Рапорт', steam: 'Донесение', modern: 'Докладывает', cyber: 'Отчёт агента' }[era] || 'Донесение';
        return box('report', `${head(kick, r.place || '')}<div class="iw-g-route"><span><i>от</i> <b class="iw-g-who">${esc(r.who || 'неизвестного')}</b></span><span><i>кому</i> <b class="iw-g-who">${esc(r.to || '—')}</b></span></div><div class="iw-g-text">${ce(r.text)}</div><span class="iw-g-deco" aria-hidden="true"></span>`);
    }
    if (f === 'news') {
        const ed = RUMOR_EDITION[era] || RUMOR_EDITION.retro;
        return box('news', `<div class="iw-g-mast">${esc(r.source || 'Городской вестник')}</div><div class="iw-g-dateline"><span>${esc(ed[0])}</span><span>${esc(ed[1])}</span></div>${title}<div class="iw-g-text">${ce(r.text)}</div>`);
    }
    if (f === 'herald') {
        return box('herald', `${head(r.source || r.who || 'Слушайте все', '')}${title}<div class="iw-g-text">${ce(r.text)}</div><span class="iw-g-deco" aria-hidden="true"></span>`);
    }
    if (f === 'post') {
        const author = r.who && r.source && r.who !== r.source ? r.who : (r.source || r.who || 'аноним');
        const handle = r.source && r.source !== author ? r.source : '';
        return box('post', `<div class="iw-g-head"><span class="iw-g-ava" aria-hidden="true">${initial(author)}</span><span class="iw-g-names"><b class="iw-g-who">${esc(author)}</b>${handle || r.via ? `<span class="iw-g-src">${esc([handle, r.via].filter(Boolean).join(' · '))}</span>` : ''}</span></div>${title}<div class="iw-g-text">${tagged(r.text)}</div><div class="iw-g-foot"><span>♡ ${shortNum(r.likes || 37 + (hueOf(r.text) % 400))}</span><span>↻ ${shortNum(r.reposts || 3 + (hueOf(author) % 40))}</span></div>`);
    }
    if (f === 'note') {
        const kick = era === 'steam' || era === 'retro' ? 'Телеграмма' : (era === 'cyber' ? 'Зашифровано' : (era === 'modern' ? 'Сообщение' : ''));
        return box('note', `${kick ? head(kick, r.title || '') : (r.title ? `<div class="iw-g-head"><span class="iw-g-kick">${ce(r.title)}</span></div>` : '')}<div class="iw-g-text">${era === 'steam' || era === 'retro' ? strips(r.text) : esc(r.text)}</div>${r.source ? `<div class="iw-g-foot">${esc(r.source)}</div>` : ''}<span class="iw-g-deco" aria-hidden="true"></span>`);
    }
    return box('talk', `<div class="iw-g-text">${ce(r.text)}</div><div class="iw-g-foot">${r.who ? `<b class="iw-g-who">${ce(r.who)}</b>` : '<b class="iw-g-who">Кто-то</b>'}<span>${r.place ? esc(r.place) : 'шепчет'}</span></div>`);
}

export function rumorCard(r, name, persona) {
    const id = r.at || r.text;
    return `<li class="iw-rumor iw-rumor-${esc(r.truth)} iw-rf-${esc(r.form || 'talk')}${r.era ? ` iw-re-${esc(r.era)}` : ''}${r.town ? ' iw-rumor-wide' : ''}">
        ${r.town ? '<div class="iw-rumor-scope"><span aria-hidden="true">◎</span>Говорит весь город</div>' : ''}
        ${rumorBody(r)}
        <div class="iw-rumor-meta">${r.town ? '' : (r.about && persona && nameKey(r.about) !== nameKey(name) ? `<span class="iw-rumor-about">о ${esc(r.about)}</span>` : '')}${r.who && !['talk', 'dialog', 'whisper', 'post', 'report'].includes(r.form || 'talk') ? `<b>${ce(r.who)}</b>` : ''}${r.date ? `<span>${esc(r.date)}</span>` : ''}<span class="iw-rumor-truth">${RUMOR_TRUTH[r.truth] || ''}</span></div>
        <button type="button" class="iw-del iw-hist-x" data-iw-rumor-del="${esc(encodeURIComponent(String(id)))}" title="Убрать этот слух" aria-label="Убрать слух">${icon('x')}</button>
      </li>`;
}
function renderRumors(list, name, persona, L = {}) {
    const mine = (list || []).filter(r => aboutHim(r, name, persona));
    if (!mine.length) {
        return `
    <section class="iw-block iw-b-rumors">
      ${blockHead('rumors', esc(L.rumors || 'Слухи'))}
      <div class="iw-muted">Пока никто не судачит. Слухи пойдут по ходу истории — время от времени: после скандала, подвига, странного поступка, если вас увидят вместе или если в округе что-то случится.</div>
    </section>`;
    }
    const newest = mine.slice().reverse();
    const older = newest.slice(1);
    return `
    <section class="iw-block iw-b-rumors">
      ${blockHead('rumors', esc(L.rumors || 'Слухи'))}
      <ul class="iw-rumors iw-hist-list">${rumorCard(newest[0], name, persona)}</ul>
      ${older.length ? `<details class="iw-hist" data-iw-hist="rumors"${HIST_OPEN.rumors ? ' open' : ''}><summary class="iw-hist-sum"><span>Прошлые слухи</span><b>${older.length}</b>${icon('chevron')}</summary><ul class="iw-rumors iw-hist-list">${older.map(r => rumorCard(r, name, persona)).join('')}</ul></details>` : ''}
    </section>`;
}

// ---------- Мемы ----------
const MEME_GRADS = ['#ff9a9e,#fad0c4', '#a18cd1,#fbc2eb', '#84fab0,#8fd3f4', '#fccb90,#d57eeb', '#f6d365,#fda085', '#89f7fe,#66a6ff', '#fddb92,#d1fdff', '#c2e9fb,#a1c4fd'];
function memePic(m, drawing) {
    const g = MEME_GRADS[Math.abs(Number(m.at) || 0) % MEME_GRADS.length].split(',');
    const emo = m.emoji ? esc(m.emoji) : '😶';
    return `<div class="iw-meme-pic iw-meme-emo${drawing ? ' iw-meme-drawing' : ''}" style="--mg1:${g[0]};--mg2:${g[1]}"><span>${emo}</span></div>`;
}
const ALIGN = ['Законный добрый', 'Нейтральный добрый', 'Хаотичный добрый', 'Законный нейтральный', 'Истинно нейтральный', 'Хаотичный нейтральный', 'Законный злой', 'Нейтральный злой', 'Хаотичный злой'];
const PAIR = { compare: ['', ''], expect: ['Ожидание', 'Реальность'], before: ['До', 'После'], started: ['Как начиналось', 'Как идёт'], plan: ['План', 'Реальность'], now: ['Тогда', 'Сейчас'] };
const PAIR_EMO = { expect: ['✨', '🫠'], before: ['🙂', '💀'], started: ['🌱', '🔥'], plan: ['📋', '🫠'], now: ['🌸', '🥀'] };
const pct = v => Math.max(0, Math.min(100, Number(v) || 0));
const stripLbl = (t, lbls) => String(t || '').replace(new RegExp(`^(${lbls.filter(Boolean).join('|')})\\s*[:—-]\\s*`, 'i'), '');
function memeList(m, L, kind, mark) {
    return `<div class="iw-meme-doc iw-mdoc-${kind}">${m.title ? `<div class="iw-mdoc-title">${ce(m.title)}</div>` : ''}<ul class="iw-mdoc-list">${L.map((l, i) => `<li><i aria-hidden="true">${typeof mark === 'function' ? mark(l, i) : mark}</i><span>${ce(l.text)}</span></li>`).join('')}</ul>${m.bottom ? `<div class="iw-mdoc-foot">${ce(m.bottom)}</div>` : ''}</div>`;
}
// ---------- Нарисованные человечки для мемов ----------
// Простые SVG-фигурки в духе комиксов из пабликов: голова, палочки, лицо по настроению
const D_EYES = { dot: '<circle cx="26" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="34" cy="12" r="1.6" fill="currentColor" stroke="none"/>', closed: '<path d="M23.5 12.5q2.5 2 5 0M31.5 12.5q2.5 2 5 0"/>', big: '<circle cx="26" cy="12" r="3.2"/><circle cx="34" cy="12" r="3.2"/><circle cx="26" cy="12.4" r="1" fill="currentColor" stroke="none"/><circle cx="34" cy="12.4" r="1" fill="currentColor" stroke="none"/>', half: '<path d="M23.5 12h5M31.5 12h5"/><path d="M24 13.5q2 1.2 4 0M32 13.5q2 1.2 4 0" stroke-width="1.6"/>', angry: '<path d="M22.5 8.5l6 2.5M37.5 8.5l-6 2.5" stroke-width="2.2"/><circle cx="26" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="34" cy="13" r="1.5" fill="currentColor" stroke="none"/>', heart: '<path d="M26 14.5l-2.6-2.6a1.5 1.5 0 0 1 2.6-1.6a1.5 1.5 0 0 1 2.6 1.6z" fill="#e8336a" stroke="none"/><path d="M34 14.5l-2.6-2.6a1.5 1.5 0 0 1 2.6-1.6a1.5 1.5 0 0 1 2.6 1.6z" fill="#e8336a" stroke="none"/>', shades: '<path d="M21 10.5h18" stroke-width="1.8"/><rect x="22" y="10.5" width="7" height="4" rx="1.2" fill="currentColor" stroke="none"/><rect x="31" y="10.5" width="7" height="4" rx="1.2" fill="currentColor" stroke="none"/>', sad: '<path d="M23 9.5l5-1.5M37 9.5l-5-1.5" stroke-width="1.8"/><circle cx="26" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="34" cy="13" r="1.5" fill="currentColor" stroke="none"/>' };
const D_MOUTH = { flat: '<path d="M26 19.5h8"/>', smile: '<path d="M25 17.5q5 5.5 10 0"/>', grin: '<path d="M24.5 17h11q-1 5.5-5.5 5.5t-5.5-5.5z" class="dd-f"/>', frown: '<path d="M25 21q5-4.5 10 0"/>', open: '<ellipse cx="30" cy="19.5" rx="3" ry="3.6" fill="currentColor" stroke="none"/>', yell: '<path d="M25 17h10l-2 6h-6z" fill="currentColor" stroke="none"/>', smirk: '<path d="M26 19.5q5 2.5 9-2.5"/>', wavy: '<path d="M25 19.5q1.7-2 3.3 0t3.4 0t3.3 0"/>' };
const D_LEGS = { stand: 'M30 58L20 88M30 58L40 88', run: 'M30 58L18 74L10 86M30 58L42 72L52 66', sit: 'M30 58L48 58L48 86M30 58L44 62L44 86', dance: 'M30 58L18 86M30 58L46 70L56 64', wide: 'M30 58L16 88M30 58L44 88', weak: 'M30 60L25 88M30 60L35 88' };
const D_POSE = {
    stand: { eyes: 'dot', mouth: 'flat', arms: 'M30 34L18 52M30 34L42 52' },
    point: { eyes: 'dot', mouth: 'flat', arms: 'M30 34L18 52M30 34L58 28', extra: '<path d="M54 25l4 3l-4 2" stroke-width="2"/>' },
    facepalm: { eyes: 'closed', mouth: 'frown', arms: 'M30 34L18 52M30 34L42 40L34 12', extra: '<ellipse cx="33.5" cy="11" rx="4.5" ry="3" class="dd-f"/>' },
    shrug: { eyes: 'half', mouth: 'wavy', arms: 'M30 34L16 32L12 22M30 34L44 32L48 22', extra: '<path d="M22 6.5l5 1M38 6.5l-5 1" stroke-width="1.8"/>' },
    cry: { eyes: 'sad', mouth: 'frown', arms: 'M30 34L20 52M30 34L40 52', extra: '<path d="M25 15v8M35 15v10" stroke="#3b9cff" stroke-width="2.4"/>' },
    rage: { eyes: 'angry', mouth: 'yell', arms: 'M30 34L14 26M30 34L46 26', extra: '<circle cx="14" cy="25" r="3" fill="currentColor" stroke="none"/><circle cx="46" cy="25" r="3" fill="currentColor" stroke="none"/><path d="M8 4l4 4M52 4l-4 4M30 -1v4" stroke="#e33" stroke-width="2"/>', head: '#ffd2d2' },
    happy: { eyes: 'closed', mouth: 'grin', arms: 'M30 34L14 18M30 34L46 18' },
    think: { eyes: 'dot', mouth: 'flat', arms: 'M30 34L18 52M30 34L42 42L33 22', extra: '<circle cx="46" cy="6" r="2.4"/><circle cx="52" cy="0" r="3.4"/>' },
    run: { eyes: 'big', mouth: 'open', arms: 'M30 34L16 44M30 34L44 26', legs: 'run', extra: '<path d="M2 50h8M0 58h8M4 66h7" stroke-width="2"/>', lean: 8 },
    sit: { eyes: 'dot', mouth: 'flat', arms: 'M30 34L44 46M30 34L40 50', legs: 'sit', extra: '<path d="M16 60h36M20 60v28M48 60v28" stroke-width="2.4"/>' },
    read: { eyes: 'dot', mouth: 'flat', arms: 'M30 34L38 46M30 34L46 46', extra: '<rect x="35" y="38" width="16" height="12" rx="1" class="dd-f"/><path d="M43 38v12"/>' },
    buff: { eyes: 'angry', mouth: 'smirk', arms: 'M30 32L12 34L10 20M30 32L48 34L50 20', extra: '<circle cx="15" cy="27" r="4.5" class="dd-f"/><circle cx="45" cy="27" r="4.5" class="dd-f"/><path d="M20 28h20l-4 30h-12z" class="dd-f" stroke-width="3"/>', legs: 'wide', width: 4.5 },
    weak: { eyes: 'sad', mouth: 'wavy', arms: 'M30 36L23 60M30 36L37 60', legs: 'weak', bodyPath: 'M30 25q-4 18 0 35', width: 2.2 },
    smug: { eyes: 'half', mouth: 'smirk', arms: 'M22 40L40 46M38 40L20 46M30 34L22 40M30 34L38 40' },
    wave: { eyes: 'dot', mouth: 'smile', arms: 'M30 34L18 52M30 34L46 16', extra: '<path d="M50 10q3 3 0 6M54 7q4 5 0 10" stroke-width="1.8"/>' },
    dance: { eyes: 'closed', mouth: 'smile', arms: 'M30 34L12 22M30 34L46 46', legs: 'dance', extra: '<path d="M50 6l2-4l2 4M8 40l2-4l2 4" stroke-width="1.6"/>' },
    sleep: { eyes: 'closed', mouth: 'flat', arms: 'M30 34L22 54M30 34L38 54', extra: '<text x="42" y="8" font-size="10" font-family="Arial" font-weight="700" fill="currentColor" stroke="none">z</text><text x="50" y="0" font-size="13" font-family="Arial" font-weight="700" fill="currentColor" stroke="none">Z</text>' },
    scared: { eyes: 'big', mouth: 'open', arms: 'M30 34L16 20M30 34L44 20', extra: '<path d="M42 5q3 4 0 6q-3-2 0-6z" fill="#7cc4ff" stroke="none"/>', legs: 'wide' },
    love: { eyes: 'heart', mouth: 'smile', arms: 'M30 34L14 40M30 34L46 40', extra: '<path d="M50 4l-2.6-2.6a1.6 1.6 0 0 1 2.6-1.8a1.6 1.6 0 0 1 2.6 1.8z" fill="#e8336a" stroke="none"/>' },
    cool: { eyes: 'shades', mouth: 'smirk', arms: 'M22 40L40 46M38 40L20 46M30 34L22 40M30 34L38 40' },
};
export function doodle(pose, cls = '') {
    const p = D_POSE[pose] || D_POSE.stand;
    const w = p.width || 3;
    const body = p.bodyPath || 'M30 24V58';
    const tilt = p.lean ? ` transform="rotate(${p.lean} 30 58)"` : '';
    return `<svg class="iw-doodle ${cls}" viewBox="0 -4 60 96" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g${tilt}><circle cx="30" cy="14" r="10" ${p.head ? `fill="${p.head}"` : 'class="dd-f"'} stroke-width="2.6"/><g stroke-width="2">${D_EYES[p.eyes] || D_EYES.dot}${D_MOUTH[p.mouth] || D_MOUTH.flat}</g><path d="${body}"/><path d="${p.arms}"/><path d="${D_LEGS[p.legs || 'stand']}"/>${p.extra || ''}</g></svg>`;
}
// «Свой формат»: мем собран моделью из блоков
function memeFree(m) {
    const b = (m.blocks || []).map(x => {
        if (x.t === 'text') return `<div class="iw-mfr-text iw-mfr-${x.size || 'm'}" style="text-align:${x.align === 'left' ? 'left' : 'center'}">${ce(x.text)}</div>`;
        if (x.t === 'draw') return `<div class="iw-mfr-draw">${doodle(x.pose || 'stand')}${x.label ? `<span>${ce(x.label)}</span>` : ''}</div>`;
        if (x.t === 'emoji') return `<div class="iw-mfr-emoji" aria-hidden="true">${esc(x.emoji)}</div>`;
        if (x.t === 'row') return `<div class="iw-mfr-row">${x.items.map(it => `<div class="iw-mfr-item">${it.pose ? doodle(it.pose) : (it.emoji ? `<em aria-hidden="true">${esc(it.emoji)}</em>` : '')}${it.label ? `<span>${ce(it.label)}</span>` : ''}</div>`).join('')}</div>`;
        if (x.t === 'bubble') return `<div class="iw-mfr-bubble">${x.who ? `<b>${esc(x.who)}</b>` : ''}<span>${ce(x.text)}</span></div>`;
        if (x.t === 'list') return `<ul class="iw-mfr-list">${x.items.map(i => `<li>${ce(i)}</li>`).join('')}</ul>`;
        if (x.t === 'bar') return `<div class="iw-mfr-bar"><span>${ce(x.label || '')}</span><i><u style="width:${x.val}%"></u></i><b>${x.val}%</b></div>`;
        if (x.t === 'stamp') return `<div class="iw-mfr-stamp"><span>${esc(x.text)}</span></div>`;
        if (x.t === 'divider') return '<hr class="iw-mfr-hr">';
        return '';
    }).join('');
    return `<div class="iw-meme-free iw-mfr-bg-${esc(m.bg || 'white')} iw-mfr-f-${esc(m.font || 'bold')}">${b}</div>`;
}
export function memeBody(m, { drawing = false } = {}) {
    const f = m.format || 'macro';
    const L = m.lines || [];
    if (f === 'demotivator') return `<div class="iw-meme-demo">${memePic(m, drawing)}<div class="iw-md-title">${ce(m.title || m.top || '')}</div>${m.text || m.bottom ? `<div class="iw-md-sub">${ce(m.text || m.bottom)}</div>` : ''}</div>`;
    if (f === 'macro' || f === 'pov') return `<div class="iw-meme-macro">${memePic(m, drawing)}${m.top || f === 'pov' ? `<div class="iw-mm-top">${ce(m.top || m.text || '')}</div>` : ''}${m.bottom ? `<div class="iw-mm-bot">${ce(m.bottom)}</div>` : ''}${!m.top && !m.bottom && L.length ? `<div class="iw-mm-bot">${ce(L.map(l => l.text).join(' / '))}</div>` : ''}</div>`;
    if (f === 'when' || f === 'reaction') return `<div class="iw-meme-when"><div class="iw-mw-cap">${ce(m.top || m.text || m.title || '')}</div>${memePic(m, drawing)}${m.bottom ? `<div class="iw-mw-cap iw-mw-bot">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'nature') return `<div class="iw-meme-nature">${memePic(m, drawing)}<div class="iw-mn-sub">${ce(m.text || m.top || m.title || '')}</div></div>`;
    if (f === 'trailer') return `<div class="iw-meme-trailer">${memePic(m, drawing)}<div class="iw-mt-voice">${ce(m.text || m.top || '')}</div>${m.title ? `<div class="iw-mt-name">${esc(m.title)}</div>` : ''}<div class="iw-mt-soon">Скоро в кино</div></div>`;
    if (f === 'quote') return `<div class="iw-meme-quote">${memePic(m, drawing)}<div class="iw-mq-box"><div class="iw-mq-text">«${esc(String(m.text || m.top || m.title || '').replace(/^[«"]|[»"]$/g, ''))}»</div>${m.who ? `<div class="iw-mq-who">— ${esc(m.who)}</div>` : ''}</div></div>`;
    if (f === 'compare') return `<div class="iw-meme-cmp">${L.slice(0, 2).map((l, i) => `<div class="iw-mc-row iw-mc-${i ? 'yes' : 'no'}"><span class="iw-mc-ico" aria-hidden="true">${i ? '😎👉' : '🙅‍♂️'}</span><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (PAIR[f]) return `<div class="iw-meme-exp iw-mx-${f}">${L.slice(0, 2).map((l, i) => `<div class="iw-me-col iw-me-${i ? 'real' : 'exp'}"><b>${esc(l.who && f !== 'expect' && l.who.length < 24 ? l.who : PAIR[f][i])}</b><span class="iw-me-emo" aria-hidden="true">${PAIR_EMO[f][i]}</span><span>${ce(stripLbl(l.text, PAIR[f]))}</span></div>`).join('')}</div>`;
    if (f === 'see') return `<div class="iw-meme-see">${m.title ? `<div class="iw-msee-title">${ce(m.title)}</div>` : ''}<div class="iw-msee-grid">${L.slice(0, 4).map((l, i) => `<div class="iw-msee-cell iw-msee-${i}"><b>${esc(l.who || '')}</b><span>${ce(l.text)}</span></div>`).join('')}</div></div>`;
    if (['nobody', 'me', 'doctor', 'mom', 'therapist', 'interview', 'translator', 'friend', 'teacher', 'boss', 'grandma', 'inner', 'faq'].includes(f)) return `<div class="iw-meme-lines iw-ml-${f}">${m.title ? `<div class="iw-ml-title">${ce(m.title)}</div>` : ''}${L.map(l => `<div class="iw-ml-row"><b>${esc(l.who || '')}:</b>${l.text ? ` <span>${ce(l.text)}</span>` : ''}</div>`).join('')}</div>`;
    if (f === 'twotypes') return `<div class="iw-meme-lines iw-ml-twotypes"><div class="iw-ml-title">${ce(m.title || 'Есть два типа людей')}</div>${L.slice(0, 3).map((l, i) => `<div class="iw-ml-row iw-tt-${i}"><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'chat' || f === 'groupchat') {
        const who = [];
        return `<div class="iw-meme-chat${f === 'groupchat' ? ' iw-mch-group' : ''}">${f === 'groupchat' ? `<div class="iw-mch-head"><span aria-hidden="true">👥</span><b>${ce(m.title || 'Общий чат')}</b></div>` : ''}${L.map(l => { let k = who.indexOf(l.who); if (k < 0) { who.push(l.who); k = who.length - 1; } return `<div class="iw-mch iw-mch-${f === 'groupchat' ? `g${k % 4}` : (k % 2 ? 'b' : 'a')}">${l.who ? `<b>${esc(l.who)}</b>` : ''}<span>${ce(l.text)}</span></div>`; }).join('')}</div>`;
    }
    if (f === 'search') return `<div class="iw-meme-search">${m.title ? `<div class="iw-ms-title">${ce(m.title)}</div>` : ''}${L.map(l => `<div class="iw-ms-row"><i aria-hidden="true">🕘</i><span>${esc(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'autocomplete') return `<div class="iw-meme-search iw-ms-auto"><div class="iw-ms-box"><i aria-hidden="true">🔍</i><span>${esc(m.top || m.title || '')}</span></div>${L.map(l => { const t = String(l.text); const q = String(m.top || m.title || ''); const k = q && t.toLowerCase().startsWith(q.toLowerCase()) ? q.length : 0; return `<div class="iw-ms-row"><i aria-hidden="true">🔍</i><span>${esc(t.slice(0, k))}<b>${esc(t.slice(k))}</b></span></div>`; }).join('')}</div>`;
    if (f === 'notifications') return `<div class="iw-meme-lock"><div class="iw-mlk-time">03:47</div>${L.map(l => `<div class="iw-mlk-n"><b>${esc(l.who || 'Сообщение')}</b><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'average' || f === 'vs' || f === 'chad') return `<div class="iw-meme-vs iw-mvs-${f}">${m.title ? `<div class="iw-mvs-title">${ce(m.title)}</div>` : ''}<div class="iw-mvs-row">${L.slice(0, 2).map((l, i) => `<div class="iw-mvs-side iw-mvs-${i ? 'b' : 'a'}"><b>${esc(l.who || (i ? 'Он' : 'Я'))}</b><span class="iw-mvs-emo" aria-hidden="true">${f === 'chad' ? (i ? '🗿' : '🤓') : (f === 'average' ? (i ? '😎' : '😩') : (i ? '🥊' : '🛡️'))}</span><span>${ce(l.text)}</span></div>`).join('<i class="iw-mvs-x" aria-hidden="true">VS</i>')}</div></div>`;
    if (f === 'diary') return `<div class="iw-meme-diary"><div class="iw-mdy-date">${ce(m.title || 'Дорогой дневник')}</div><div class="iw-mdy-text">${ce(m.text || '')}</div>${m.who ? `<div class="iw-mdy-who">${esc(m.who)}</div>` : ''}</div>`;
    if (f === 'certificate') return `<div class="iw-meme-cert"><div class="iw-mct-title">Грамота</div><div class="iw-mct-sub">награждается</div><div class="iw-mct-who">${ce(m.who || m.title || '')}</div><div class="iw-mct-text">${ce(m.text || '')}</div>${m.source ? `<div class="iw-mct-sign">${esc(m.source)}</div>` : ''}<span class="iw-mct-seal" aria-hidden="true">★</span></div>`;
    if (f === 'wanted') return `<div class="iw-meme-wanted"><div class="iw-mwt-head">Разыскивается</div>${memePic(m, drawing)}<div class="iw-mwt-name">${ce(m.title || m.who || '')}</div>${m.text ? `<div class="iw-mwt-text">${ce(m.text)}</div>` : ''}${m.bottom ? `<div class="iw-mwt-reward">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'ticket') return `<div class="iw-meme-ticket"><div class="iw-mtk-main"><small>Билет</small><b>${ce(m.title || '')}</b><div class="iw-mtk-rows">${L.map(l => `<span><small>${esc(l.who || '')}</small>${ce(l.text)}</span>`).join('')}</div></div><div class="iw-mtk-stub" aria-hidden="true">№ ${String((Number(m.at) || 7) % 1000).padStart(3, '0')}</div></div>`;
    if (f === 'tiktok') return `<div class="iw-meme-tiktok">${memePic(m, drawing)}<div class="iw-mtt-side" aria-hidden="true"><span>♥<small>${shortNum(m.likes || 12400)}</small></span><span>💬</span><span>↗</span></div><div class="iw-mtt-cap">${m.who ? `<b>${esc(m.who)}</b>` : ''}<span>${tagged(m.text || '')}</span>${m.source ? `<small>${esc(m.source)}</small>` : ''}</div></div>`;
    if (f === 'battery') { const v = pct(m.score ?? 12); return `<div class="iw-meme-battery"><div class="iw-mbat-title">${ce(m.title || 'Заряд')}</div><div class="iw-mbat-cell${v <= 20 ? ' iw-mbat-low' : ''}"><i style="width:${v}%"></i><b>${v}%</b></div>${m.bottom || m.text ? `<div class="iw-mbat-cap">${ce(m.bottom || m.text)}</div>` : ''}</div>`; }
    if (f === 'timeline' || f === 'forecast') return `<div class="iw-meme-timeline iw-mtl-${f}">${m.title ? `<div class="iw-mtl-title">${ce(m.title)}</div>` : ''}${L.map(l => `<div class="iw-mtl-row"><b>${esc(l.who || '')}</b><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'manual') return memeList(m, L, 'manual', (l, i) => `${i + 1}`);
    if (f === 'menu') return `<div class="iw-meme-receipt iw-mr-menu">${m.title ? `<div class="iw-mr-title">${esc(m.title)}</div>` : ''}${L.map(l => `<div class="iw-mr-row"><span>${ce(l.text)}</span><i aria-hidden="true"></i><b>${esc(l.who || '')}</b></div>`).join('')}${m.bottom ? `<div class="iw-mr-total">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'top') return memeList(m, L, 'top', (l, i) => `${i + 1}.`);
    if (f === 'redflags') return memeList(m, L, 'red', '🚩');
    if (f === 'greenflags') return memeList(m, L, 'green', '💚');
    if (f === 'rules') return memeList(m, L, 'rules', (l, i) => `${i + 1}.`);
    if (f === 'signs') return memeList(m, L, 'signs', '•');
    if (f === 'checklist') return memeList(m, L, 'check', l => (l.val ? '☑' : '☐'));
    if (f === 'iceberg') return `<div class="iw-meme-ice">${m.title ? `<div class="iw-mice-title">${ce(m.title)}</div>` : ''}${L.map((l, i) => `<div class="iw-mice-l iw-mice-${Math.min(i, 4)}">${ce(l.text)}</div>`).join('')}</div>`;
    if (f === 'starter') return `<div class="iw-meme-doc iw-mdoc-starter"><div class="iw-mdoc-title">${ce(m.title || 'Стартовый набор')}</div><div class="iw-mst-grid">${L.map(l => `<div class="iw-mst-item">${l.who && l.who.length <= 6 ? `<i aria-hidden="true">${esc(l.who)}</i>` : ''}<span>${ce(l.text)}</span></div>`).join('')}</div></div>`;
    if (f === 'recipe') return `<div class="iw-meme-doc iw-mdoc-recipe"><div class="iw-mdoc-title">${ce(m.title || 'Рецепт')}</div><ul class="iw-mdoc-list">${L.map(l => `<li><i>${esc(l.who || '•')}</i><span>${ce(l.text)}</span></li>`).join('')}</ul>${m.bottom ? `<div class="iw-mdoc-foot">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'patch') return `<div class="iw-meme-doc iw-mdoc-patch"><div class="iw-mdoc-title">${ce(m.title || 'Список изменений')}</div><ul class="iw-mdoc-list">${L.map(l => { const w = String(l.who || '+'); const k = /^[−-]/.test(w) ? 'del' : (/^\+/.test(w) ? 'add' : 'fix'); return `<li class="iw-mp-${k}"><i>${esc(w.slice(0, 8))}</i><span>${ce(l.text)}</span></li>`; }).join('')}</ul></div>`;
    if (f === 'receipt' || f === 'priceless') return `<div class="iw-meme-receipt iw-mr-${f}">${m.title ? `<div class="iw-mr-title">${esc(m.title)}</div>` : ''}${L.map(l => `<div class="iw-mr-row"><span>${ce(l.text)}</span><b>${esc(l.who || '')}</b></div>`).join('')}${m.bottom ? `<div class="iw-mr-total">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'bingo') return `<div class="iw-meme-bingo">${m.title ? `<div class="iw-mbg-title">${ce(m.title)}</div>` : ''}<div class="iw-mbg-grid">${L.slice(0, 9).map((l, i) => `<div class="iw-mbg-c${l.val ? ' iw-mbg-on' : ''}">${i === 4 && !l.text ? 'СВОБОДНО' : ce(l.text)}</div>`).join('')}</div></div>`;
    if (f === 'align') return `<div class="iw-meme-align">${m.title ? `<div class="iw-mal-title">${ce(m.title)}</div>` : ''}<div class="iw-mal-grid">${L.slice(0, 9).map((l, i) => `<div class="iw-mal-c iw-mal-${i}"><b>${ALIGN[i]}</b><span>${ce(l.text)}</span></div>`).join('')}</div></div>`;
    if (f === 'tier') return `<div class="iw-meme-tier">${m.title ? `<div class="iw-mti-title">${ce(m.title)}</div>` : ''}${L.map((l, i) => `<div class="iw-mti-row"><b class="iw-mti-${esc(String(l.who || 'SABCDF'[i] || 'F').charAt(0).toUpperCase())}">${esc(String(l.who || 'SABCDF'[i] || 'F').slice(0, 3))}</b><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'stats') return `<div class="iw-meme-stats">${m.title ? `<div class="iw-mss-title">${ce(m.title)}</div>` : ''}${L.map(l => { const v = l.val == null ? 50 : (l.val <= 10 ? l.val * 10 : l.val); return `<div class="iw-mss-row"><span>${ce(l.who || l.text)}</span><i><u style="width:${pct(v)}%"></u></i><b>${Math.round(pct(v) / 10)}/10</b></div>`; }).join('')}</div>`;
    if (f === 'meter') { const v = pct(m.score ?? 90); return `<div class="iw-meme-meter"><div class="iw-mmt-title">${ce(m.title || 'Уровень')}</div><div class="iw-mmt-gauge"><i style="--v:${v}"></i><span aria-hidden="true">${esc(m.emoji || '🔥')}</span></div><div class="iw-mmt-val">${v}%</div>${m.bottom || m.text ? `<div class="iw-mmt-cap">${ce(m.bottom || m.text)}</div>` : ''}</div>`; }
    if (f === 'loading') { const v = pct(m.score ?? 3); return `<div class="iw-meme-load"><div class="iw-mld-title">${ce(m.title || 'Загрузка…')}</div><div class="iw-mld-bar"><i style="width:${v}%"></i></div><div class="iw-mld-row"><span>${ce(m.text || '')}</span><b>${v}%</b></div></div>`; }
    if (f === 'poll') return `<div class="iw-meme-poll"><div class="iw-mpl-q">${ce(m.title || m.top || 'Вопрос')}</div>${L.slice(0, 3).map(l => `<div class="iw-mpl-opt"><i style="width:${pct(l.val ?? 50)}%"></i><span>${ce(l.text)}</span><b>${pct(l.val ?? 50)}%</b></div>`).join('')}</div>`;
    if (f === 'error') return `<div class="iw-meme-err"><div class="iw-merr-bar"><span>${esc(m.title || 'Ошибка')}</span><i aria-hidden="true">✕</i></div><div class="iw-merr-body"><span class="iw-merr-ico" aria-hidden="true">⛔</span><span>${ce(m.text || m.top || '')}</span></div><div class="iw-merr-btns">${(L.length ? L.slice(0, 2) : [{ text: 'ОК' }]).map(l => `<span>${esc(l.text)}</span>`).join('')}</div></div>`;
    if (f === 'achievement') return `<div class="iw-meme-ach"><span class="iw-mach-ico" aria-hidden="true">${esc(m.emoji || '🏆')}</span><div><small>Достижение получено</small><b>${ce(m.title || '')}</b>${m.text ? `<span>${ce(m.text)}</span>` : ''}</div></div>`;
    if (f === 'quest') return `<div class="iw-meme-quest"><small>Новое задание</small><b>${ce(m.title || '')}</b>${m.text ? `<p>${ce(m.text)}</p>` : ''}${L.length ? `<div class="iw-mqs-rew">Награда: ${L.map(l => ce(l.text)).join(', ')}</div>` : ''}</div>`;
    if (f === 'notice') return `<div class="iw-meme-notice"><div class="iw-mno-title">${esc(m.title || 'ОБЪЯВЛЕНИЕ')}</div><div class="iw-mno-text">${ce(m.text || '')}</div>${m.bottom ? `<div class="iw-mno-tabs">${Array.from({ length: 6 }, () => `<span>${esc(m.bottom)}</span>`).join('')}</div>` : ''}</div>`;
    if (f === 'sign') return `<div class="iw-meme-sign"><span class="iw-msg-tri" aria-hidden="true">${esc(m.emoji || '⚠️')}</span><b>${esc(m.title || 'ОСТОРОЖНО')}</b>${m.text ? `<span>${ce(m.text)}</span>` : ''}</div>`;
    if (f === 'horoscope') return `<div class="iw-meme-horo"><div class="iw-mho-head"><span aria-hidden="true">${esc(m.emoji || '🔮')}</span><b>${esc(m.who || m.title || 'Гороскоп')}</b><small>на сегодня</small></div><div class="iw-mho-text">${ce(m.text || '')}</div></div>`;
    if (f === 'news') return `<div class="iw-meme-news"><div class="iw-mnw-live"><b>СРОЧНО</b><span>${esc(m.source || 'Новости')}</span></div><div class="iw-mnw-title">${ce(String(m.title || m.top || '').replace(/^срочно\s*[:!.—-]*\s*/i, ''))}</div>${m.text ? `<div class="iw-mnw-text">${ce(m.text)}</div>` : ''}</div>`;
    if (f === 'review') { const n = Math.max(1, Math.min(5, Number(m.score) || 1)); return `<div class="iw-meme-review"><div class="iw-mrv-head"><span class="iw-rp-ava" aria-hidden="true">${esc(String(m.who || '?').charAt(0).toUpperCase())}</span><b>${esc(m.who || 'Покупатель')}</b><span class="iw-mrv-stars" aria-label="${n} из 5">${'★'.repeat(n)}<s>${'★'.repeat(5 - n)}</s></span></div>${m.title ? `<div class="iw-mrv-what">${ce(m.title)}</div>` : ''}<div class="iw-mrv-text">${ce(m.text || '')}</div></div>`; }
    if (f === 'status') return `<div class="iw-meme-status"><span class="iw-rp-ava" aria-hidden="true">${esc(String(m.who || '?').charAt(0).toUpperCase())}</span><div><b>${esc(m.who || '')}</b><span>${ce(m.text || m.title || '')}</span></div></div>`;
    if (f === 'card') return `<div class="iw-meme-card"><div class="iw-mcd-head"><span aria-hidden="true">🪪</span><b>${ce(m.title || 'Паспорт')}</b></div>${L.map(l => `<div class="iw-mcd-row"><small>${esc(l.who || '')}</small><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'dictionary') return `<div class="iw-meme-dict"><b>${esc(m.title || m.top || '')}</b>${m.who ? ` <i>${esc(m.who)}</i>` : ''}<p>${ce(m.text || '')}</p>${m.bottom ? `<p class="iw-mdc-ex">${ce(m.bottom)}</p>` : ''}</div>`;
    if (f === 'formula') return `<div class="iw-meme-formula">${L.map(l => `<span>${ce(l.text)}</span>`).join('<i>+</i>')}<i>=</i><b>${ce(m.bottom || m.text || '?')}</b></div>`;
    if (f === 'brain') return `<div class="iw-meme-brain">${L.map((l, i) => `<div class="iw-mb-row iw-mb-${Math.min(i, 3)}"><span>${ce(l.text)}</span><i aria-hidden="true">${['🧠', '🧠✨', '🌟🧠🌟', '🌌'][Math.min(i, 3)]}</i></div>`).join('')}</div>`;
    if (f === 'buttons') return `<div class="iw-meme-btns"><div class="iw-mbt-row">${L.slice(0, 2).map(l => `<span class="iw-mbt">${ce(l.text)}</span>`).join('')}</div><div class="iw-mbt-who"><span aria-hidden="true">😰</span>${m.who ? `<b>${esc(m.who)}</b>` : ''}</div></div>`;
    if (f === 'tweet') return `<div class="iw-rumor-post iw-meme-tweet"><div class="iw-rp-head"><span class="iw-rp-ava" aria-hidden="true">${esc(String(m.who || m.source || '?').replace(/^@/, '').charAt(0).toUpperCase())}</span><span class="iw-rp-names"><b>${esc(m.who || m.source || 'аноним')}</b>${m.source && m.source !== m.who ? `<span>${esc(m.source)}</span>` : ''}</span></div><div class="iw-rp-text">${tagged(m.text || '')}</div>${m.likes || m.reposts ? `<div class="iw-rp-foot">${m.reposts ? `<span>${icon('rotate')}${shortNum(m.reposts)}</span>` : ''}${m.likes ? `<span>${icon('heart')}${shortNum(m.likes)}</span>` : ''}</div>` : ''}</div>`;
    // ----- нарисованные форматы -----
    const pick = (i, d) => (L[i] && L[i].text) || d;
    if (f === 'stick') return `<div class="iw-meme-stick">${m.title ? `<div class="iw-mst-title">${ce(m.title)}</div>` : ''}<div class="iw-mst-row iw-mst-n${Math.min(L.length, 4)}">${L.slice(0, 4).map(l => `<div class="iw-mst-cell"><div class="iw-mst-say">${ce(l.text)}</div>${doodle(l.pose || 'stand')}${l.who ? `<small>${esc(l.who)}</small>` : ''}</div>`).join('')}</div></div>`;
    if (f === 'bellcurve') return `<div class="iw-meme-bell"><svg class="iw-mbl-curve" viewBox="0 0 300 110" preserveAspectRatio="none" aria-hidden="true"><path d="M0 108 C70 108 90 6 150 6 S230 108 300 108" fill="#dfe9ff" stroke="#2b3a67" stroke-width="2"/><path d="M75 108V60M225 108V60" stroke="#2b3a67" stroke-dasharray="4 4"/></svg><div class="iw-mbl-row">${[0, 1, 2].map(i => `<div class="iw-mbl-c iw-mbl-${i}">${doodle(['happy', 'cry', 'cool'][i])}<div class="iw-mbl-say">${ce(pick(i, ''))}</div><small>${esc((L[i] && L[i].who) || ['IQ 55', 'IQ 100', 'IQ 145'][i])}</small></div>`).join('')}</div></div>`;
    if (f === 'trolley') return `<div class="iw-meme-trolley">${m.title ? `<div class="iw-mtr-title">${ce(m.title)}</div>` : ''}<svg viewBox="0 0 300 120" aria-hidden="true"><path d="M10 60H120L290 20M120 60L290 100" stroke="#555" stroke-width="5" fill="none"/><path d="M10 66H118M124 66L290 106M124 54L290 14" stroke="#999" stroke-width="2" fill="none"/><rect x="24" y="44" width="34" height="18" rx="3" fill="#c0392b"/><circle cx="32" cy="64" r="4" fill="#333"/><circle cx="50" cy="64" r="4" fill="#333"/><path d="M112 40l14 20" stroke="#333" stroke-width="3"/><circle cx="112" cy="38" r="4" fill="#e74c3c"/></svg><div class="iw-mtr-up">${ce(pick(0, ''))}</div><div class="iw-mtr-down">${ce(pick(1, ''))}</div>${m.who ? `<div class="iw-mtr-who">${doodle('think')}<span>${ce(m.who)}</span></div>` : ''}</div>`;
    if (f === 'exit') return `<div class="iw-meme-exit"><div class="iw-mex-sign"><span class="iw-mex-l">${ce(pick(0, 'прямо'))}<i>↑</i></span><span class="iw-mex-r">${ce(pick(1, 'съезд'))}<i>↗</i></span></div><svg viewBox="0 0 300 110" aria-hidden="true"><path d="M60 110L120 0M240 110L180 0" stroke="#fff" stroke-width="3"/><path d="M150 110V0" stroke="#ffd400" stroke-width="3" stroke-dasharray="12 10"/><path d="M220 110Q230 50 300 30" stroke="#fff" stroke-width="3" fill="none"/><g transform="translate(180 64) rotate(-28)"><rect x="-16" y="-9" width="32" height="18" rx="5" fill="#d33"/><rect x="-6" y="-7" width="12" height="14" rx="2" fill="#bfe3ff"/></g><path d="M172 92q8 -6 14 -2" stroke="#999" stroke-width="2" fill="none"/></svg>${m.who ? `<div class="iw-mex-car">${ce(m.who)}</div>` : ''}</div>`;
    if (f === 'pie') {
        const tot = L.reduce((a, l) => a + (Number(l.val) || 0), 0) || 100;
        const cols = ['#ff6b6b', '#ffd166', '#4ecdc4', '#5c7cfa', '#c084fc'];
        let acc = 0;
        const stops = L.slice(0, 5).map((l, i) => { const a0 = acc; acc += (Number(l.val) || Math.round(100 / L.length)) / tot * 100; return `${cols[i]} ${a0}% ${acc}%`; }).join(', ');
        return `<div class="iw-meme-pie">${m.title ? `<div class="iw-mpi-title">${ce(m.title)}</div>` : ''}<div class="iw-mpi-body"><span class="iw-mpi-disc" style="background:conic-gradient(${stops})" aria-hidden="true"></span><ul>${L.slice(0, 5).map((l, i) => `<li><i style="background:${cols[i]}"></i><span>${ce(l.text)}</span>${Number.isFinite(l.val) ? `<b>${l.val}%</b>` : ''}</li>`).join('')}</ul></div></div>`;
    }
    if (f === 'venn') return `<div class="iw-meme-venn"><div class="iw-mvn-pic"><span class="iw-mvn-a">${ce(pick(0, ''))}</span><span class="iw-mvn-b">${ce(pick(1, ''))}</span><b class="iw-mvn-mid">${ce(m.text || '')}</b></div></div>`;
    if (f === 'graph') {
        const pts = L.slice(0, 5); const n = pts.length;
        const xy = pts.map((l, i) => [20 + i * (260 / Math.max(1, n - 1)), 100 - (Number.isFinite(l.val) ? l.val : 50) * 0.85]);
        const up = n > 1 && xy[n - 1][1] < xy[0][1];
        return `<div class="iw-meme-graph">${m.title ? `<div class="iw-mgr-title">${ce(m.title)}</div>` : ''}<svg viewBox="0 0 300 120" aria-hidden="true"><path d="M14 4V106H296" stroke="#888" stroke-width="2" fill="none"/><polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="${up ? '#1db954' : '#e63946'}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>${xy.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#fff" stroke="${up ? '#1db954' : '#e63946'}" stroke-width="2.5"/>`).join('')}</svg><div class="iw-mgr-labels" style="--n:${n}">${pts.map(l => `<span>${ce(l.text)}</span>`).join('')}</div>${m.who ? `<div class="iw-mgr-axis">${ce(m.who)}</div>` : ''}</div>`;
    }
    if (f === 'captcha') return `<div class="iw-meme-captcha"><div class="iw-mcp-head">${ce(m.title || 'Выберите все изображения')}<small>Если их нет, нажмите «Пропустить»</small></div><div class="iw-mcp-grid">${L.slice(0, 9).map((l, i) => `<span class="iw-mcp-cell${l.val ? ' iw-on' : ''}"><em aria-hidden="true">${esc([...(m.emoji || '')][i % Math.max(1, [...(m.emoji || '')].length)] || '▦')}</em>${ce(l.text)}</span>`).join('')}</div><div class="iw-mcp-foot"><span>↻ 🎧 ⓘ</span><b>ПОДТВЕРДИТЬ</b></div></div>`;
    if (f === 'rpg') return `<div class="iw-meme-rpg"><div class="iw-mrp-box"><span class="iw-mrp-ava" aria-hidden="true">${esc(m.emoji || '🙂')}</span><div><b>${esc(m.who || '???')}</b><p>${ce(m.text || '')}</p></div></div>${L.length ? `<ul class="iw-mrp-opts">${L.slice(0, 3).map((l, i) => `<li>${i === 0 ? '▶ ' : '  '}${ce(l.text)}</li>`).join('')}</ul>` : ''}</div>`;
    if (f === 'sms') return `<div class="iw-meme-sms"><div class="iw-msm-phone"><div class="iw-msm-screen"><div class="iw-msm-top"><span>▮▮▮▯</span><span>${esc(m.bottom || '23:47')}</span><span>▭</span></div><div class="iw-msm-from">✉ ${esc(m.who || 'Номер скрыт')}</div><div class="iw-msm-text">${esc(m.text || m.top || '')}</div><div class="iw-msm-keys"><span>Ответ</span><span>Назад</span></div></div></div></div>`;
    if (f === 'tombstone') return `<div class="iw-meme-grave"><div class="iw-mgv-stone"><span class="iw-mgv-rip">R.I.P.</span><b>${ce(m.title || m.top || '')}</b>${m.text ? `<small>${ce(m.text)}</small>` : ''}</div><div class="iw-mgv-grass" aria-hidden="true"></div></div>`;
    if (f === 'tearoff') return `<div class="iw-meme-tear"><div class="iw-mte-sheet"><b>${ce(m.title || 'ОБЪЯВЛЕНИЕ')}</b><p>${ce(m.text || '')}</p></div><div class="iw-mte-tabs">${L.slice(0, 6).map((l, i) => `<span class="${i === 1 ? 'iw-gone' : ''}">${esc(l.text)}</span>`).join('')}</div></div>`;
    if (f === 'homework') return `<div class="iw-meme-hw"><div class="iw-mhw-task"><b>${ce(m.title || 'Задача №1')}</b> ${ce(m.text || '')}</div>${m.bottom ? `<div class="iw-mhw-ans"><span>Решение:</span> ${ce(m.bottom)}</div>` : ''}${m.who ? `<span class="iw-mhw-mark">${esc(m.who)}</span>` : ''}</div>`;
    if (f === 'mock') { const mk = String(m.text || m.top || '').split('').map((c, i) => (i % 2 ? c.toLocaleUpperCase('ru') : c.toLocaleLowerCase('ru'))).join(''); return `<div class="iw-meme-mock"><div class="iw-mmk-said"><b>${esc(m.who || 'Он')}:</b> ${ce(m.top || '')}</div><div class="iw-mmk-row">${doodle('smug')}<div class="iw-mmk-text">${esc(mk)}</div></div></div>`; }
    if (f === 'isthis') return `<div class="iw-meme-isthis"><div class="iw-mis-pic"><span class="iw-mis-me">${doodle('point', 'iw-mis-guy')}${m.who ? `<span class="iw-mis-who">${ce(m.who)}</span>` : ''}</span><span class="iw-mis-obj">${ce(m.top || '')}</span></div><div class="iw-mis-q">${ce(m.text || 'Это что, мем?')}</div></div>`;
    if (f === 'shrug') return `<div class="iw-meme-shrug">${m.top ? `<div class="iw-msh-top">${ce(m.top)}</div>` : ''}<div class="iw-msh-row">${doodle('shrug')}<div class="iw-msh-text">${ce(m.text || '')}<span aria-hidden="true">¯\\_(ツ)_/¯</span></div></div></div>`;
    if (f === 'facepalm') return `<div class="iw-meme-facepalm">${doodle('facepalm')}<div class="iw-mfp-text"><span>${ce(m.top || m.text || '')}</span>${m.who ? `<small>— ${esc(m.who)}</small>` : ''}</div></div>`;
    if (f === 'buff') return `<div class="iw-meme-buff"><div class="iw-mbf-c">${doodle('buff')}<b>${esc((L[0] && L[0].who) || 'Тогда')}</b><span>${ce(pick(0, ''))}</span></div><div class="iw-mbf-c">${doodle('weak')}<b>${esc((L[1] && L[1].who) || 'Сейчас')}</b><span>${ce(pick(1, ''))}</span></div></div>`;
    if (f === 'map') return `<div class="iw-meme-map">${m.title ? `<div class="iw-mmp-title">${ce(m.title)}</div>` : ''}<div class="iw-mmp-land iw-mmp-n${Math.min(L.length, 6)}">${L.slice(0, 6).map((l, i) => `<span class="iw-mmp-r iw-mmp-r${i}">${ce(l.text)}</span>`).join('')}</div></div>`;
    if (f === 'week') return `<div class="iw-meme-week">${m.title ? `<div class="iw-mwk-title">${ce(m.title)}</div>` : ''}<ul>${L.slice(0, 7).map((l, i, a) => `<li class="${i === a.length - 1 ? 'iw-last' : ''}"><b>${esc(l.who || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i])}</b><span>${ce(l.text)}</span></li>`).join('')}</ul></div>`;
    if (f === 'wikihow') return `<div class="iw-meme-how"><div class="iw-mhow-title">${ce(m.title || 'Как сделать всё за 3 шага')}</div><div class="iw-mhow-steps">${L.slice(0, 3).map((l, i) => `<div class="iw-mhow-step"><div class="iw-mhow-pic">${doodle(l.pose || ['stand', 'think', 'happy'][i])}</div><b>${i + 1}</b><span>${ce(l.text)}</span></div>`).join('')}</div></div>`;
    if (f === 'scroll') return `<div class="iw-meme-scroll"><div class="iw-msc-row">${doodle('read')}<div class="iw-msc-paper">${ce(m.text || '')}</div></div><div class="iw-msc-row iw-msc-2">${doodle('rage')}<span>${esc(m.who || '')}</span></div></div>`;
    if (f === 'dating') return `<div class="iw-meme-dating"><div class="iw-mdt-photo" aria-hidden="true">${esc(m.emoji || '🙂')}</div><div class="iw-mdt-info"><b>${esc(m.who || 'Кто-то, 27')}</b><span>${ce(m.text || '')}</span>${L.length ? `<div class="iw-mdt-tags">${L.slice(0, 4).map(l => `<i>${esc(l.text)}</i>`).join('')}</div>` : ''}</div><div class="iw-mdt-btns" aria-hidden="true"><span>✕</span><span>★</span><span>♥</span></div></div>`;
    if (f === 'sale') { const sc = m.score || 4; return `<div class="iw-meme-sale"><div class="iw-msl-pic" aria-hidden="true">${esc(m.emoji || '📦')}</div><div class="iw-msl-info"><b class="iw-msl-price">${esc(m.who || '999 ₽')}</b><span class="iw-msl-name">${ce(m.title || '')}</span><span class="iw-msl-stars">${'★'.repeat(sc)}${'☆'.repeat(5 - sc)} <small>${L.length || 12} ${plural(L.length || 12, 'отзыв', 'отзыва', 'отзывов')}</small></span>${m.text ? `<p>${ce(m.text)}</p>` : ''}${L.length ? L.slice(0, 2).map(l => `<q>${ce(l.text)}</q>`).join('') : ''}<span class="iw-msl-buy">В корзину</span></div></div>`; }
    if (f === 'playlist') return `<div class="iw-meme-playlist"><div class="iw-mpl-head"><span class="iw-mpl-cover" aria-hidden="true">${esc(m.emoji || '♫')}</span><div><small>ПЛЕЙЛИСТ</small><b>${ce(m.title || 'Без названия')}</b></div></div><ol>${L.slice(0, 6).map((l, i) => `<li><span>${ce(l.text)}</span><small>${esc(l.who || '')}</small><i>${2 + (i * 7) % 3}:${String(10 + (i * 23) % 49).padStart(2, '0')}</i></li>`).join('')}</ol></div>`;
    if (f === 'wrapped') return `<div class="iw-meme-wrapped"><div class="iw-mwr-title">${ce(m.title || 'Итоги года')}</div>${L.slice(0, 4).map((l, i) => `<div class="iw-mwr-card iw-mwr-${i}"><b>${esc(l.who || '')}</b><span>${ce(l.text)}</span></div>`).join('')}</div>`;
    if (f === 'free') return memeFree(m);
    if (f === 'comic') return `<div class="iw-meme-comic">${m.title ? `<div class="iw-mcm-title">${ce(m.title)}</div>` : ''}<div class="iw-mcm-grid iw-mcm-n${Math.min(L.length, 4)}">${L.slice(0, 4).map(l => `<div class="iw-mcm-cell"><span class="iw-mcm-say">${ce(l.text)}</span><span class="iw-mcm-face" aria-hidden="true">${esc(l.who && [...l.who].length <= 4 ? l.who : '😐')}</span></div>`).join('')}</div></div>`;
    if (f === 'bebill') return `<div class="iw-meme-bebill"><span class="iw-mbb-fig" aria-hidden="true"><svg viewBox="0 0 40 80" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"><circle cx="20" cy="12" r="8"/><path d="M20 20v30M20 28L8 40M20 28l12 12M20 50L10 74M20 50l10 24"/><path d="M14 4h12l-2-4h-8z" fill="#111"/></svg></span><div class="iw-mbb-text"><b>${ce(m.title || 'Это он.')}</b>${L.map(l => `<span>${ce(l.text)}</span>`).join('')}${m.bottom ? `<b>${ce(m.bottom)}</b>` : ''}</div></div>`;
    if (f === 'nothing' || f === 'likeif') return `<div class="iw-meme-vkpic iw-mvp-${f}"><div class="iw-mvp-cap">${ce(m.top || m.text || m.title || '')}</div>${memePic(m, drawing)}${m.bottom ? `<div class="iw-mvp-cap iw-mvp-bot">${ce(m.bottom)}</div>` : ''}${f === 'likeif' ? `<div class="iw-mvp-like" aria-hidden="true">♥ Мне нравится</div>` : ''}</div>`;
    if (f === 'meanwhile') return `<div class="iw-meme-meanwhile">${memePic(m, drawing)}<div class="iw-mmw-cap">${ce(m.top || m.title || 'Тем временем…')}</div>${m.bottom || m.text ? `<div class="iw-mmw-sub">${ce(m.bottom || m.text)}</div>` : ''}</div>`;
    if (f === 'rarephoto') return `<div class="iw-meme-rare">${memePic(m, drawing)}<div class="iw-mra-cap">${ce(m.top || m.title || m.text || '')}</div>${m.bottom ? `<div class="iw-mra-sub">${ce(m.bottom)}</div>` : ''}</div>`;
    if (f === 'loveis') return `<div class="iw-meme-loveis"><div class="iw-mli-pic" aria-hidden="true">${esc(m.emoji || '👫')}</div><div class="iw-mli-text"><b>Love is…</b><span>${esc((t => t.charAt(0).toLowerCase() + t.slice(1))(String(m.text || m.top || m.title || '').replace(/^love is/i, '').replace(/^[\s….]+/, '')))}</span></div><span class="iw-mli-no" aria-hidden="true">№ ${String((Math.abs(Number(m.at) || 7) % 900) + 100)}</span></div>`;
    if (f === 'story') { const sc = m.score != null ? m.score : 300 + (Math.abs(Number(m.at) || 7) % 1500); return `<div class="iw-meme-story"><div class="iw-msy-rate" aria-hidden="true"><i>▲</i><b>${shortNum(sc)}</b><i>▼</i></div><div class="iw-msy-main">${m.title ? `<div class="iw-msy-title">${ce(m.title)}</div>` : ''}<div class="iw-msy-text">${ce(m.text || '')}</div>${L.length ? `<div class="iw-msy-tags">${L.slice(0, 4).map(l => `<span>${esc(l.text)}</span>`).join('')}</div>` : ''}</div></div>`; }
    if (f === 'saywithout') return `<div class="iw-meme-say"><div class="iw-msw-q"><span class="iw-rp-ava" aria-hidden="true">?</span><span>${ce(m.title || m.top || '')}</span></div><div class="iw-msw-a"><span class="iw-rp-ava" aria-hidden="true">${esc(String(m.who || '!').charAt(0).toUpperCase())}</span><div>${m.who ? `<b>${esc(m.who)}</b>` : ''}<span>${ce(m.text || m.bottom || '')}</span></div></div></div>`;
    if (f === 'fact') return `<div class="iw-meme-fact"><div class="iw-mft-head"><span aria-hidden="true">${esc(m.emoji || '🧐')}</span><b>${ce(m.title || 'Интересный факт')}</b></div><div class="iw-mft-text">${ce(m.text || m.top || '')}</div></div>`;
    if (L.length) return memeList(m, L, 'top', '•');
    return `<div class="iw-meme-lines">${ce([m.title, m.top, m.text, m.bottom].filter(Boolean).join(' — '))}</div>`;
}
// Мем как пост в паблике: шапка с названием паблика, сам мем, лайки и репосты
const NO_POST = ['tweet', 'tiktok', 'status'];
const POSTLIKE = ['story', 'saywithout', 'likeif'];
// Пост — только когда модель назвала паблик: так выглядит лишь часть мемов, как репост из группы
export function memePost(m, body) {
    if (!m.public || NO_POST.includes(m.format) || POSTLIKE.includes(m.format)) return body;
    const seed = Math.abs(Number(m.at) || 7);
    const name = m.public;
    const likes = m.likes || 120 + (seed % 9000);
    const reposts = Math.round(likes / (6 + (seed % 7)));
    const hue = (seed * 37) % 360;
    return `<div class="iw-mpost"><div class="iw-mpost-head"><span class="iw-mpost-ava" style="--h:${hue}" aria-hidden="true">${esc(String(name).replace(/[^\p{L}\d]/gu, '').charAt(0).toUpperCase() || 'М')}</span><span class="iw-mpost-names"><b>${esc(name)}</b><small>${esc(m.date ? 'запись к сцене' : 'только что')}</small></span><span class="iw-mpost-more" aria-hidden="true">⋯</span></div><div class="iw-mpost-body">${body}</div><div class="iw-mpost-foot" aria-hidden="true"><span>♥ ${shortNum(likes)}</span><span>💬 ${shortNum(Math.round(likes / 11))}</span><span>↪ ${shortNum(reposts)}</span></div></div>`;
}
function memeCard(m, info) {
    const rerolling = (info.rerolling || []).includes(m.at);
    const again = `<button type="button" class="iw-meme-draw iw-meme-again${rerolling ? ' iw-spin' : ''}" data-iw-meme-again="${esc(String(m.at))}"${rerolling ? ' disabled' : ''} title="Придумать другой мем — по другому моменту истории">${icon('rotate')}<span>${rerolling ? 'Придумываю…' : 'Другой мем'}</span></button>`;
    return `<li class="iw-meme iw-mf-${esc(m.format || 'macro')}">
        ${memePost(m, memeBody(m))}
        <div class="iw-meme-meta">${again}</div>
        <button type="button" class="iw-del iw-hist-x" data-iw-meme-del="${esc(String(m.at))}" title="Убрать этот мем" aria-label="Убрать мем">${icon('x')}</button>
      </li>`;
}
function renderMemes(info, L = {}) {
    const list = (info && info.list) || [];
    if (!list.length) {
        return `
    <section class="iw-block iw-b-memes">
      ${blockHead('memes', esc(L.memes || 'Мемы'))}
      <div class="iw-muted">Пока без мемов. Раз в ${info.every} ${plural(info.every, 'сообщение', 'сообщения', 'сообщений')} дневник подберёт смешной мем к тому, что творится в истории — или придумай его прямо сейчас по последней сцене.</div>
      <div class="iw-meme-meta iw-meme-first"><button type="button" class="iw-meme-draw${(info.rerolling || []).includes('new') ? ' iw-spin' : ''}" data-iw-meme-again="new"${(info.rerolling || []).includes('new') ? ' disabled' : ''} title="Придумать мем по последней сцене">${icon('sparkle')}<span>${(info.rerolling || []).includes('new') ? 'Придумываю…' : 'Сгенерировать мем'}</span></button></div>
    </section>`;
    }
    // мем всегда один — его можно только заменить другим
    const cur = list[list.length - 1];
    return `
    <section class="iw-block iw-b-memes">
      ${blockHead('memes', esc(L.memes || 'Мемы'))}
      <ul class="iw-memes iw-hist-list">${memeCard(cur, info)}</ul>
    </section>`;
}

function scoreBadge(score) {
    const tone = score > 0 ? 'good' : (score < 0 ? 'bad' : 'mid');
    return `<span class="iw-score iw-score-${tone}">${esc(signed(score))}</span>`;
}

// Маленький график: как менялось отношение от −3 до +3.
// Как менялось отношение: линия по шкале от −3 до +3, точки — отдельными значками (не сплющиваются),
// на конце — стрелка: теплеет, остывает или ровно. Вид линии и значков у каждой темы свой.
function attitudeChart(points, mark = '♥') {
    if (!points || points.length < 2) return '';
    const w = 240;
    const h = 56;
    const pad = 6;
    const step = (w - pad * 2) / (points.length - 1);
    const y = s => pad + ((3 - s) / 6) * (h - pad * 2);
    const xs = points.map((p, i) => pad + i * step);
    const coords = points.map((p, i) => `${xs[i].toFixed(1)},${y(p.s).toFixed(1)}`);
    const pct = (v, total) => ((v / total) * 100).toFixed(2);
    const last = points[points.length - 1].s;
    const prev = points[points.length - 2].s;
    const trend = last > prev ? 'up' : (last < prev ? 'down' : 'flat');
    const trendName = { up: 'теплеет', down: 'остывает', flat: 'без перемен' }[trend];
    const dots = points.slice(0, -1).map((p, i) => `<span class="iw-chart-dot" style="left:${pct(xs[i], w)}%;top:${pct(y(p.s), h)}%"></span>`).join('');
    const end = `<span class="iw-chart-end iw-trend-${trend}" style="left:${pct(xs[xs.length - 1], w)}%;top:${pct(y(last), h)}%" title="${trendName}">${esc(mark)}</span>`;
    return `
      <div class="iw-chart-wrap" role="img" aria-label="Как менялось отношение: ${points.map(p => signed(p.s)).join(', ')} — ${trendName}">
        <svg class="iw-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
          <line class="iw-chart-zero" x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}"/>
          <polyline points="${coords.join(' ')}"/>
        </svg>
        ${dots}${end}
      </div>`;
}

// Совместимость: первая (при знакомстве, не меняется) и как складывается сейчас — по чату, со шкалой.
function chemPlate(c) {
    if (!c.chem || !CHEM_NAMES[c.chem.level]) return '';
    const known = c.impression && cleanKnown(c.impression.known);
    const nowScore = c.chemNow ? c.chemNow.score : (CHEM_SCORE[c.chem.level] ?? 0);
    const nowLevel = chemLevelOf(nowScore);
    const cells = [-3, -2, -1, 0, 1, 2, 3].map(v => `<span class="iw-chem-cell${(nowScore > 0 && v > 0 && v <= nowScore) || (nowScore < 0 && v < 0 && v >= nowScore) || (v === 0) ? ' on' : ''}${v < 0 ? ' neg' : (v > 0 ? ' pos' : ' mid')}"></span>`).join('');
    return `<div class="iw-chem-wrap">
      <div class="iw-chem iw-chem-${esc(c.chem.level)}" title="Совместимость по чертам и типу личности">
        <span class="iw-chem-ico">${icon('chem_' + c.chem.level)}</span>
        <span class="iw-chem-body"><span class="iw-att-cap">${known ? `Давно знакомы: ${esc(known)}` : (c.impression && c.impression.via ? `${esc(c.impression.via)}` + ' · первая совместимость' : 'Первая совместимость')}</span><b class="iw-chem-name">${esc(CHEM_NAMES[c.chem.level])}</b>${c.chem.why ? `<span class="iw-chem-why">${ce(c.chem.why)}</span>` : ''}</span>
      </div>
      <div class="iw-chem iw-chem-now iw-chem-${nowLevel}" title="Как совместимость складывается сейчас, по событиям чата">
        <span class="iw-chem-ico">${icon('chem_' + nowLevel)}</span>
        <span class="iw-chem-body"><span class="iw-att-cap">Сейчас</span><b class="iw-chem-name">${esc(CHEM_NOW_NAMES[nowScore] || '')}</b>
          <span class="iw-chem-meter" aria-label="от отторжения до притяжения: ${nowScore > 0 ? '+' : ''}${nowScore}">${cells}</span>
          ${c.chemNow && c.chemNow.why ? `<span class="iw-chem-why">${ce(c.chemNow.why)}</span>` : ''}</span>
      </div>
    </div>`;
}

// Очки коротко, чтобы влезали в плашку: 1 200 → «1,2К», 15 300 → «15К», 2 500 000 → «2,5М».
export function shortPoints(n) {
    const v = Math.max(0, Math.round(Number(n) || 0));
    const one = x => (Math.floor(x * 10) / 10).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    if (v < 1000) return String(v);
    if (v < 10000) return one(v / 1000) + 'К';
    if (v < 1000000) return Math.floor(v / 1000) + 'К';
    return one(v / 1000000) + 'М';
}

// Брак и дети (как в модах «Симс»): устойчивые взгляды. Модель заполняет один раз и меняет только по событию;
// игрок может поправить сам — тогда взгляды закреплены и модель их не трогает.
function renderLife(c, L = {}) {
    const life = Object.assign({}, c.life || {});
    if (life.own === 'has') life.own = ''; // старый пункт «уже есть» убран
    const sel = (f, opts, cap) => {
        const cur = f === 'count' ? String(life.count || '') : (life[f] || '');
        const list = Object.entries(opts).map(([v, t]) => `<option value="${esc(v)}"${String(v) === cur ? ' selected' : ''}>${esc(t)}</option>`).join('');
        const locked = !!(c.lifeLock && c.lifeLock[f]) && !c.lifeSet;
        return `<label class="iw-life-row${locked ? ' iw-life-locked' : ''}"><span class="iw-life-cap">${esc(cap)}</span><select class="iw-life-sel${cur ? '' : ' iw-unk'}" data-iw-life="${f}"><option value=""${cur ? '' : ' selected'}>не ясно</option>${list}</select>${locked ? `<button type="button" class="iw-life-lock" data-iw-life-unlock="${f}" title="Ты поменяла это сама — модель этот пункт не трогает. Нажми, чтобы снова отдать его истории" aria-label="Снять замок">${icon('lock')}</button>` : ''}</label>`;
    };
    const counts = Object.fromEntries(COUNT_WORDS.slice(1).map((w, i) => [String(i + 1), w]));
    // не хочет своих детей — «когда» и «сколько» не к месту
    const ownOff = life.own === 'no';
    const log = (c.lifeLog || []).slice().reverse();
    const pinned = !!c.lifeSet;
    const pin = `<button type="button" class="iw-life-pin${pinned ? ' on' : ''}" data-iw-life-pin="1" aria-pressed="${pinned}" title="${pinned ? 'Весь блок закреплён: модель не меняет ни один пункт. Нажми, чтобы открепить' : 'Закрепить весь блок: модель не будет менять ни один пункт. Отдельный пункт закрепляется сам, когда меняешь его руками'}" aria-label="${pinned ? 'Открепить' : 'Закрепить'}">${icon('pin')}</button>`;
    return `
    <section class="iw-block iw-b-life">
      ${blockHead('life', esc(L.life || 'Брак и дети'), pin)}
      <div class="iw-life">
        <div class="iw-life-sec">${icon('ring')}<span>Брак</span></div>
        ${sel('marry', LIFE_FIELDS.marry.opts, 'Хочет ли в брак')}
        <div class="iw-life-sec">${icon('users')}<span>Дети</span></div>
        ${sel('kids', LIFE_FIELDS.kids.opts, 'Как относится')}
        ${sel('own', LIFE_FIELDS.own.opts, 'Свои дети')}
        ${ownOff ? '' : sel('when', LIFE_FIELDS.when.opts, 'Когда')}
        ${ownOff ? '' : sel('count', counts, 'Сколько')}
      </div>
      ${life.why ? `<div class="iw-life-why" title="${esc(life.why)}">${ce(life.why)}</div>` : ''}
      ${log.length ? `<details class="iw-more"><summary>Как менялись · ${log.length}</summary><ul class="iw-life-log">${log.map(e => `<li><b>${esc(e.from || 'не ясно')} → ${esc(e.to)}</b>${e.why ? ` — ${ce(e.why)}` : ''}</li>`).join('')}</ul></details>` : ''}
    </section>`;
}

const ATTR_SHOWN = 6; // столько тегов видно сразу, остальные — по стрелке

// Что привлекает и что отталкивает (как в «Симс»): теги от модели, их можно убрать и добавить свои из списка.
function renderAttraction(c, L, opts = {}) {
    const likes = c.likes || [];
    const dislikes = c.dislikes || [];
    const mode = opts.attrMode === 'dislikes' ? 'dislikes' : 'likes';
    const chip = (list, t, i) => `<span class="iw-attr-chip iw-attr-${list}"><span>${ce(t)}</span><button type="button" class="iw-attr-x" data-iw-attr="del:${list}:${i}" title="Убрать" aria-label="Убрать">${icon('x')}</button></span>`;
    const row = (list, cap, items) => `
        <div class="iw-attr-row iw-attr-row-${list}">
          <span class="iw-attr-cap">${icon(list === 'likes' ? 'heart' : 'x')}<span>${cap}</span><span class="iw-attr-count">${items.length || ''}</span></span>
          <div class="iw-attr-chips">${items.length ? items.map((t, i) => (i < ATTR_SHOWN || (opts.attrMore && opts.attrMore[list]) ? chip(list, t, i) : '')).join('') : '<span class="iw-muted">Пока ничего</span>'}${items.length > ATTR_SHOWN ? `<button type="button" class="iw-attr-more${opts.attrMore && opts.attrMore[list] ? ' on' : ''}" data-iw-attr="more:${list}" aria-expanded="${!!(opts.attrMore && opts.attrMore[list])}">${opts.attrMore && opts.attrMore[list] ? 'свернуть' : `ещё ${items.length - ATTR_SHOWN}`}${icon('chevron')}</button>` : ''}</div>
        </div>`;
    const have = new Set((mode === 'likes' ? likes : dislikes).map(x => x.toLowerCase()));
    const other = new Set((mode === 'likes' ? dislikes : likes).map(x => x.toLowerCase()));
    const cats = Object.entries(ATTRACT_CATALOG).map(([cat, tags]) => `
          <div class="iw-attr-cat"><div class="iw-attr-cat-name">${esc(cat)}</div><div class="iw-attr-opts">${tags.map(t => `<button type="button" class="iw-attr-opt${have.has(t) ? ' on' : ''}${other.has(t) ? ' other' : ''}" data-iw-attr="toggle:${mode}:${esc(t)}" aria-pressed="${have.has(t)}">${ce(t)}</button>`).join('')}</div></div>`).join('');
    const empty = !likes.length && !dislikes.length;
    return `
    <section class="iw-block iw-b-attraction">
      ${blockHead('attraction', esc(L.attraction || 'Что привлекает'))}
      ${chemPlate(c)}
      ${empty ? '<div class="iw-muted">Определится при следующем разборе, или выбери сама.</div>' : ''}
      <div class="iw-attr-cols">
      ${row('likes', 'Привлекает', likes)}
      ${row('dislikes', 'Отталкивает', dislikes)}
      </div>
      <details class="iw-attr-pick"${opts.attrOpen ? ' open' : ''}>
        <summary class="iw-btn iw-attr-add"><span class="iw-pm-plus">${icon('plus')}</span><span class="iw-pm-minus">${icon('minus')}</span><span>Выбрать из списка</span></summary>
        <div class="iw-attr-panel">
          <div class="iw-attr-modes">
            <button type="button" class="iw-qopt${mode === 'likes' ? ' on' : ''}" data-iw-attr="mode:likes" aria-pressed="${mode === 'likes'}">Привлекает</button>
            <button type="button" class="iw-qopt${mode === 'dislikes' ? ' on' : ''}" data-iw-attr="mode:dislikes" aria-pressed="${mode === 'dislikes'}">Отталкивает</button>
          </div>
          ${cats}
          <div class="iw-attr-own"><input type="text" class="iw-input iw-attr-input" maxlength="40" placeholder="Своё, например «шрам на брови»"><button type="button" class="iw-btn" data-iw-attr="own:${mode}">${icon('plus')}<span>Добавить</span></button></div>
        </div>
      </details>
    </section>`;
}

let LOVE = null; // данные Love Score для этого чата, если расширение стоит
function renderAttitude(c, L, opts = {}) {
    if (!c.impression && !opts.persona && (c.unmet || opts.npc)) {
        return `
    <section class="iw-block iw-b-impression iw-unmet">
      <span class="iw-tape iw-tape-blue"></span>
      ${blockHead('impression', esc(L.attitude))}
      <div class="iw-muted iw-unmet-note">${c.unmet ? 'Вы ещё не встречались лично — мыслей о тебе пока нет. Появятся после первой встречи в сцене.' : 'Мыслей о тебе пока нет — появятся, когда вы встретитесь в сцене.'}</div>
      ${relPlate(c)}
    </section>`;
    }
    // у твоего героя — те же шкалы и статус, что у персонажа: отношения одни на двоих
    const relOf = opts.persona ? opts.relOf : c;
    const plate = relOf ? relPlate(relOf) : '';
    if (!c.impression) {
        if (!opts.persona || !plate) return '';
        return `
    <section class="iw-block iw-b-impression">
      <span class="iw-tape iw-tape-blue"></span>
      ${blockHead('impression', esc(L.attitude))}
      ${plate}
    </section>`;
    }
    const im = c.impression;
    const love = !opts.persona && loveFor(LOVE, c.name);
    // если стоит соседнее расширение со счётом отношений — «сейчас» тихо сверяется с ним
    const nowScore = love ? loveToAttitude(love.score, love.max) : (im.nowScore ?? im.score);
    return `
    <section class="iw-block iw-b-impression">
      <span class="iw-tape iw-tape-blue"></span>
      ${blockHead('impression', esc(L.attitude))}
      ${opts.attrBlock ? '' : chemPlate(c)}
      <div class="iw-att-row">
        <div class="iw-att-cell">
          <div class="iw-att-cap">${cleanKnown(im.known) ? `Давно знакомы: ${esc(cleanKnown(im.known))}` : (im.via ? `Связаны через общего знакомого: ${esc(im.via)}` : ce(L.first))}</div>
          <div class="iw-imp-row">${scoreBadge(im.score)}<span class="iw-imp-label">${ce(im.label)}</span></div>
          ${im.why ? `<div class="iw-imp-why">${ce(im.why)}</div>` : ''}
        </div>
        ${im.now ? `
        <div class="iw-att-cell">
          <div class="iw-att-cap">${ce(L.now)}</div>
          <div class="iw-imp-row">${scoreBadge(nowScore)}<span class="iw-imp-now">${ce(im.now || '')}</span></div>
        </div>` : ''}
      </div>
      ${opts.persona ? (plate || attitudeChart(c.attitude, L.chartMark)) : plate}
    </section>`;
}

const REL_ICON = {
    married: 'ring', engaged: 'ring', dating: 'heart', soul: 'heart', love: 'heart', smitten: 'heart', crush: 'heart', fond: 'heart', spark: 'sparkle',
    best: 'handshake', close: 'handshake', good: 'handshake', friend: 'handshake', pal: 'smile', know: 'smile', strangers: 'user',
    cool: 'wx_cloud', dislike: 'wx_cloud', enemy: 'swords', nemesis: 'swords', rivals: 'swords', ex: 'heartbreak', exspouse: 'heartbreak', kin: 'users',
    awkward: 'wx_cloud', repel: 'wx_cloud', despise: 'swords',
};
const REL_GROUP = {
    married: 'ring', engaged: 'ring', dating: 'love', soul: 'love', love: 'love', smitten: 'love', crush: 'love', fond: 'love', spark: 'love',
    best: 'friends', close: 'friends', good: 'friends', friend: 'friends', pal: 'hello', know: 'hello', strangers: 'hello', kin: 'home',
    cool: 'storm', dislike: 'storm', enemy: 'storm', nemesis: 'storm', rivals: 'storm', ex: 'broken', exspouse: 'broken',
    awkward: 'storm', repel: 'storm', despise: 'storm',
};


// Центральный мотив под шкалами (viewBox 200×92): аккуратная виньетка — мотив по центру,
// симметричные завитки по бокам и пунктир снизу; всё внутри рамки, ничего не обрезается
const REL_FLANK = '<path class="t" d="M66 50C56 50 50 43 41 43C33 43 28 49 31 54C34 58 40 56 39 51"/><path class="t" d="M134 50C144 50 150 43 159 43C167 43 172 49 169 54C166 58 160 56 161 51"/><path class="t" d="M48 64C42 64 38 61 36 57M152 64C158 64 162 61 164 57"/><path class="t" stroke-dasharray=".1 6" stroke-width="2.4" d="M72 82H128"/>';
const SPARK = (x, y, r = 5) => `<path class="t" d="M${x} ${y - r}Q${x + r * .25} ${y - r * .25} ${x + r} ${y}Q${x + r * .25} ${y + r * .25} ${x} ${y + r}Q${x - r * .25} ${y + r * .25} ${x - r} ${y}Q${x - r * .25} ${y - r * .25} ${x} ${y - r}z"/>`;
const HEART = (x, y, k = 1) => `<path d="M${x} ${y + 15 * k}C${x - 9 * k} ${y + 8 * k} ${x - 15 * k} ${y + 2 * k} ${x - 15 * k} ${y - 5 * k}C${x - 15 * k} ${y - 13 * k} ${x - 3 * k} ${y - 15 * k} ${x} ${y - 6 * k}C${x + 3 * k} ${y - 15 * k} ${x + 15 * k} ${y - 13 * k} ${x + 15 * k} ${y - 5 * k}C${x + 15 * k} ${y + 2 * k} ${x + 9 * k} ${y + 8 * k} ${x} ${y + 15 * k}z"/>`;
const REL_ART = {
    love: REL_FLANK + HEART(100, 44, 1.45) + `<g class="t">${HEART(128, 22, .45)}</g>` + SPARK(74, 24, 4) + SPARK(132, 70, 3),
    ring: REL_FLANK + '<circle cx="90" cy="48" r="17"/><circle cx="112" cy="48" r="17"/><path class="t" d="M101 22l4-6 4 6-4 4z"/>' + SPARK(72, 24, 4) + SPARK(132, 22, 3),
    friends: REL_FLANK + '<circle cx="86" cy="46" r="15"/><path d="M80 43v.1M92 43v.1" stroke-width="3"/><path d="M79 51Q86 57 93 51"/><circle cx="116" cy="46" r="15"/><path d="M110 43v.1M122 43v.1" stroke-width="3"/><path d="M109 51Q116 57 123 51"/>' + SPARK(101, 20, 4),
    hello: REL_FLANK + '<path d="M80 52L124 30 110 66 102 56z"/><path d="M102 56L124 30"/><path class="t" stroke-dasharray="3 5" d="M78 54C72 56 70 62 74 66"/>' + SPARK(130, 66, 3.5) + SPARK(76, 26, 3),
    storm: REL_FLANK + '<path d="M80 54h40a9 9 0 0 0 1-18 13 13 0 0 0-24-6 10 10 0 0 0-18 7 9 9 0 0 0 1 17z"/><path class="t" d="M96 58l-5 9h7l-5 10M110 58l-4 7h6l-4 8"/>',
    broken: REL_FLANK + '<g transform="rotate(-4 100 46)">' + HEART(100, 44, 1.45) + '</g><path class="t" d="M101 30l-5 8 7 6-6 8 5 7"/>',
    home: REL_FLANK + '<path d="M78 48l22-19 22 19"/><path d="M83 44v28h34V44"/><path d="M95 72V60h10v12"/><path d="M111 34v-7h5v11"/>' + SPARK(130, 24, 3.5),
};

const REL_LEAD = '<path class="t" stroke-dasharray=".1 6" stroke-width="2.4" d="M60 28H104"/>';
const REL_DOODLE = {
    love: REL_LEAD + HEART(128, 24, .95) + SPARK(146, 8, 3),
    ring: REL_LEAD + '<circle cx="121" cy="26" r="10"/><circle cx="135" cy="26" r="10"/>' + SPARK(112, 8, 3),
    friends: REL_LEAD + '<circle cx="118" cy="25" r="9"/><path d="M114.5 23v.1M121.5 23v.1" stroke-width="2.6"/><path d="M114 28Q118 31.5 122 28"/><circle cx="139" cy="25" r="9"/><path d="M135.5 23v.1M142.5 23v.1" stroke-width="2.6"/><path d="M135 28Q139 31.5 143 28"/>',
    hello: REL_LEAD + '<path d="M112 28L146 12 136 40 128 32z"/><path d="M128 32L146 12"/>',
    storm: REL_LEAD + '<path d="M110 32h28a6.5 6.5 0 0 0 1-13 9 9 0 0 0-17-4 7 7 0 0 0-12 5 6.5 6.5 0 0 0 0 12z"/><path class="t" d="M124 34l-3 5h4l-3 6"/>',
    broken: REL_LEAD + '<g transform="rotate(-6 128 25)">' + HEART(128, 24, .95) + '</g><path class="t" d="M128 15l-3 5 4 4-3 5 2 4"/>',
    home: REL_LEAD + '<path d="M112 26l16-13 16 13"/><path d="M116 23v18h24V23"/><path d="M125 41v-8h6v8"/>',
};

// Кто они друг другу + две шкалы, как в «Симс 4»: дружба (зелёная) и романтика (розовая); в минусе — красные, около нуля — серые
let REL_THEME = '';
function relPlate(c) {
    const met = !!c.impression && !c.unmet;
    const rel = c.rel || seedRel(c);
    const st = relStatus(rel, met);
    const f = rel ? (rel.friend || 0) : 0;
    const r = rel ? (rel.romance || 0) : 0;
    const fl = friendLevel(f);
    const rl = romanceLevel(r);
    const tone = (v, lo) => (v <= -lo ? 'neg' : (v < lo ? 'mid' : 'pos'));
    const log = (c.relLog || []).slice(-1)[0];
    const bar = (cls, ic, cap, lvl, v, t, tip) => `
          <div class="iw-rel-bar ${cls} iw-rel-${t}" title="${esc(tip)}">
            <span class="iw-rel-cap">${icon(ic)}<span>${cap}</span><em>${esc(lvl)}</em></span>
            <span class="iw-rel-track"><span class="iw-rel-fill" style="left:${v < 0 ? 50 + v / 2 : 50}%;width:${Math.abs(v) / 2}%"></span><span class="iw-rel-ends"><i>−100</i><b>${v > 0 ? '+' + v : (v < 0 ? '−' + -v : '0')}</b><i>100</i></span></span>
          </div>`;
    const grp = REL_GROUP[st.key] || 'hello';
    // в «классических» темах — рисунки от руки; в остальных — свой набор под стиль темы
    const th = REL_THEMED[REL_THEME];
    const doodle = th ? `${th.link}<g transform="translate(104 2) scale(.9)">${th.m[grp]}</g>` : REL_DOODLE[grp];
    const art = th ? `${th.acc}<g transform="translate(64 10) scale(1.5)">${th.m[grp]}</g>` : REL_ART[grp];
    return `
      <div class="iw-rel iw-rel-${esc(st.key)}">
        <div class="iw-rel-head">
          <div class="iw-rel-badge" title="${esc(log && log.why ? `${log.from ? log.from + ' → ' : ''}${log.to}: ${log.why}` : 'Кто вы друг другу')}">
            <span class="iw-rel-ico">${icon(REL_ICON[st.key] || 'heart')}</span><b>${esc(st.label)}</b>
          </div>
          <svg class="iw-rel-doodle${th ? ' iw-rel-th' : ''}" viewBox="0 0 150 48" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${doodle}</svg>
        </div>
        <div class="iw-rel-bars">
          ${bar('iw-rel-fr', 'handshake', 'Дружба', fl[1], f, tone(f, 20), `Дружба: ${signed(f)} — ${fl[1]}. Как в «Симс»: ноль посередине, вправо — теплее, влево — хуже`)}
          ${bar('iw-rel-ro', 'heart', 'Романтика', rl[1], r, tone(r, 10), `Романтика: ${signed(r)} — ${rl[1]}. Ноль — романтики нет; вправо — симпатия и любовь, влево — неловкость и отвращение`)}
        </div>
        <div class="iw-rel-art${th ? ' iw-rel-th' : ''}" aria-hidden="true"><svg class="iw-rel-main" viewBox="0 0 200 92" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${art}</svg></div>
      </div>`;
}

// ===== «Симулятор жизни»: значки из пака иконок — у желаний, страхов, мечты и черт (по смыслу текста) =====
const SIMS_W = [
    [/брак|свадьб|жени|замуж|помолв|кольц|невест|жених/, 'ring'], [/поцел|губ/, 'lips'], [/обня|прижа|согре|тепл|утеш/, 'hug'],
    [/защит|оград|спас|охран|уберечь|прикры/, 'shield'], [/денег|деньг|богат|заработ|золот|монет|долг|казн/, 'money'],
    [/власт|трон|корон|импер|корол|правит|двор[ауео ]|престол/, 'crown'], [/тайн|секрет|выясн|узна|расслед|разгад|понять/, 'search'],
    [/книг|учи|изуч|прочит|знани|науч/, 'book'], [/работ|карьер|служб|договор|контракт|сделк|дел[оа]\b|поручен/, 'work'],
    [/ед[аыу]\b|поесть|ужин|обед|завтрак|приготов|накорм/, 'food'], [/выпи|вин[оа]|бокал|напит/, 'wine'], [/ча[йя]\b|кофе/, 'tea'],
    [/спать|выспа|отдох|отдых|покой|сон\b/, 'bed'], [/побед|выигр|лучш|соревн|турнир|превзойти/, 'trophy'],
    [/друз|дружб|друг/, 'friends'], [/подар/, 'gift'], [/драк|удар|бой|сраж|отомст|месть|наказ|проучи/, 'fight'],
    [/музык|песн|спе[тл]|сыгра/, 'music'], [/рисов|картин|творч/, 'paint'], [/путеш|уехать|сбеж|дорог|поход|увидеть мир/, 'trip'],
    [/дом\b|дома\b|домой|уют/, 'home'], [/ребён|ребен|дет[еи]|сын|доч/, 'baby'], [/смех|рассмеш|шут|весел|позабав/, 'joke'],
    [/довери|уваж|приня|признан/, 'trust'], [/танц/, 'dance'], [/письм|записк|напис/, 'letter'], [/ключ|отпер|открыть/, 'key'],
    [/цвет[ыо]|букет|роз[уаы]/, 'flower'], [/любв|любим|сердц|роман|свидан|влюб|нрав/, 'heart'], [/поговор|разговор|сказать|призна|объясн|расспрос|говор/, 'talk'],
];
const SIMS_W_ANY = ['star', 'cloud', 'shoot', 'bulb', 'rainbow', 'hearts', 'chest'];
const SIMS_F = [
    [/смерт|умер|умр|погиб|убьют|убит|гибел|казн/, 'death'], [/одиноч|один\b|одна\b|брош|покину|оставят|никому не нуж/, 'alone'],
    [/отверж|расстав|измен|разлюб|разбит|сердц|любов/, 'heart'], [/позор|стыд|унижен|насмеш|опозор|смешн/, 'shame'],
    [/суд\b|суда|закон|приговор|тюрьм|арест|казн/, 'law'], [/работ|карьер|должност|служб/, 'work'],
    [/отец|отц|мать|матер|семь|род[ауе ]/, 'family'], [/призрак|дух[аи ]|прошл|кошмар/, 'ghost'], [/огон|пожар|плам|сгор/, 'fire'],
    [/вод[аыу]|утон|мор[еяю]/, 'water'], [/холод|снег|зим|бур[яи]/, 'cold'], [/учеб|экзам|школ/, 'school'],
    [/осуд|мнени|осужд|взгляд|люд[ие]|толп|сплетн/, 'judge'], [/чудовищ|монстр|зверь|звер[яи]/, 'beast'], [/тьм|темнот|мрак|безум|сойти с ума|себя/, 'dark'],
    [/провал|не справ|неуда|утрат|потер|разруш|распад|рухн|слаб|сил[уы]/, 'fail'],
];
const SIMS_F_ANY = ['fail', 'judge', 'ghost', 'alone', 'dark'];
const SIMS_T = [
    [/добр|заботл|милосерд|отзывч|ласков/, 'kind'], [/романт|нежн|чувствен/, 'romantic'], [/страст|пылк/, 'passion'],
    [/умн|гени|интелл|аналит|рассудит|проницат|мудр/, 'smart'], [/амбиц|честолюб|целеустрем|властн/, 'ambition'],
    [/зл[оаы]|жесток|безжалост|бессердеч/, 'evil'], [/вспыльч|импульс|горяч|гнев|взрывн/, 'hot'], [/агресс|груб|вражд|резк/, 'mean'],
    [/весел|жизнерад|оптим|бодр|позитив|солнеч/, 'cheer'], [/шутн|игрив|озорн|дурач|насмешл/, 'goof'], [/творч|артист|креатив|мечтат|фантаз/, 'creative'],
    [/активн|спорт|энерг|подвиж/, 'active'], [/лен[иья]|безделн/, 'lazy'], [/общит|дружел|открыт|обаят|харизм|приветл|компан/, 'social'],
    [/одино|замкн|скрыт|нелюдим|интроверт|отстран|сдержан|молчал/, 'loner'], [/ревнив|завист/, 'jealous'],
    [/верн|предан|надёжн|надежн|ответств|долг/, 'loyal'], [/аккурат|педант|перфекц|порядоч|дисципл|пунктуал/, 'perfect'],
    [/горд|высокомер|сноб|надмен|аристокр|изыскан|тщесл/, 'snob'], [/уверен|смел|отваж|храбр|решител|прямолин|дерзк/, 'bold'],
    [/суров|строг|серьёзн|серьезн|мрачн|угрюм|холодн/, 'gloomy'], [/подозрит|осторож|недовер|параноид|бдител/, 'suspect'],
    [/хитр|коварн|манипул|лжив|интриг|расчётл|расчетл/, 'sly'], [/любопыт|любозн/, 'curious'], [/жадн|меркант|скуп/, 'greedy'],
    [/чистопл|опрят/, 'neat'], [/неряш/, 'slob'], [/книж|начитан|учён|учен/, 'bookworm'], [/музык/, 'music'], [/природ|лесн/, 'nature'],
    [/семейн|материн|отцовск/, 'family'], [/гурман|прожор/, 'foodie'], [/нервн|тревож|пуглив|робк|застенч|стеснит/, 'shy'],
    [/стойк|выносл|упрям|непоколеб|твёрд|тверд|сильн/, 'tough'], [/чест|справедл|прав[ды]/, 'honest'], [/благород|самоотвер|жертвен/, 'noble'],
    [/спокойн|невозмут|хладнокров|терпел|уравнов/, 'calm'], [/инфантил|ребяч|капризн/, 'childish'], [/тусов|гуляк|кутил/, 'party'],
    [/мил[аы]?[йя]?\b|очаров|кротк|послушн|покорн/, 'sweet'], [/громк|болтлив|шумн/, 'loud'], [/сонлив/, 'sleepy'], [/дик|звер|волч/, 'wolf'],
];
const SIMS_T_ANY = ['ambition', 'creative', 'kind', 'cheer', 'bold', 'smart', 'social', 'loyal', 'honest', 'sweet'];
const SIMS_D = [
    [/любов|семь|брак|свадьб|сердц/, 'heart'], [/мир[ауе ]?\b|импер|стран|народ|королевств|госуд|город/, 'world'],
    [/богат|деньг|состояни|золот/, 'gold'], [/знани|наук|истин|тайн|мудр/, 'mind'], [/сил[уаы]|мощ|воин|бой|сильн|побед/, 'power'],
    [/творч|искусств|музык|песн|картин/, 'art'], [/слав|извест|призна|сцен/, 'fame'], [/свобод|путеш|вырваться|сбежать/, 'free'],
    [/дом\b|дома|уют|покой/, 'home'], [/друз|люд[ие]|общин|команд/, 'people'], [/дет[еия]|ребён|ребен|сын|доч/, 'family'],
    [/спас|защит|помо|исцел|добр/, 'angel'], [/кухн|готов|повар/, 'chef'], [/природ|лес|сад/, 'nature'], [/маск|себя|человеком|собой/, 'mask'],
];
const SIMS_D_ANY = ['bulb', 'coin', 'book', 'gold'];
function simsHash(t) { let h = 0; for (const ch of String(t || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function simsPick(text, map, any) {
    const t = String(text || '').toLowerCase().replace(/ё/g, 'е');
    for (const [re, k] of map) if (re.test(t)) return k;
    return any[simsHash(t) % any.length];
}
function simsIco(prefix, text, cls = '') {
    if (REL_THEME !== 'sims') return '';
    const map = { w: [SIMS_W, SIMS_W_ANY], f: [SIMS_F, SIMS_F_ANY], t: [SIMS_T, SIMS_T_ANY], d: [SIMS_D, SIMS_D_ANY] }[prefix];
    const k = simsPick(text, map[0], map[1]);
    return `<span class="iw-si${cls ? ' ' + cls : ''}" style="--si:url('icons/sims/${prefix}-${k}.webp')" aria-hidden="true"></span>`;
}

function renderWants(c, L) {
    // закреплённые (и ещё не исполненные) желания — наверху списка
    const ordered = (c.wants || []).map((w, i) => ({ w, i }));
    const top = x => (x.w.pinned && x.w.status !== 'done' && x.w.status !== 'dropped' ? 0 : 1);
    ordered.sort((a, b) => top(a) - top(b) || a.i - b.i);
    const items = ordered.map(({ w, i }) => {
        const done = w.status === 'done';
        const dropped = w.status === 'dropped';
        const pin = !done && !dropped
            ? `<button type="button" class="iw-mini iw-want-pin${w.pinned ? ' on' : ''}" data-iw-want-pin="${i}" title="${w.pinned ? 'Закреплено: не изменится, пока не исполнится. Нажми, чтобы открепить' : 'Закрепить желание: оно останется, пока не исполнится'}" aria-pressed="${!!w.pinned}">${icon(w.pinned ? 'pin' : 'unpin')}</button>`
            : '';
        return `
      <li class="iw-want${done ? ' done' : ''}${dropped ? ' dropped' : ''}${w.pinned && !done ? ' pinned' : ''}">
        <span class="iw-box">${done ? ICON_CHECK : ''}</span>${simsIco('w', w.text, 'iw-si-want')}
        <span class="iw-want-text">${ce(w.text)}${done && !w.unclaimed ? ' <b class="iw-tag">Сбылось</b>' : ''}${dropped ? ' <b class="iw-tag">Уже неважно</b>' : ''}${done && w.unclaimed ? `<br><button type="button" class="iw-claim" data-iw-want-claim="${i}" title="Желание сбылось! Забрать награду — монеты придут в кошелёк, желание уйдёт из списка">${icon('gift')}<span>Забрать награду</span><b>+${Number(w.unclaimed)}${icon('coin')}</b></button>` : ''}</span>
        <span class="iw-row-tools">${pin}${done && w.unclaimed ? '' : delBtn('wants', i)}</span>
      </li>`;
    }).join('');
    return `
    <section class="iw-block iw-b-wants">
      ${blockHead('wants', esc(L.wants), wishTools('wants'))}
      ${items ? `<ul class="iw-list">${items}</ul>` : '<div class="iw-muted">Ничего особенного</div>'}
      ${(() => {
        // несколько несобранных наград — одна кнопка на все сразу
        const open = (c.wants || []).filter(w => w.status === 'done' && w.unclaimed);
        if (open.length < 2) return '';
        const sum = open.reduce((n, w) => n + (Number(w.unclaimed) || 0), 0);
        return `<button type="button" class="iw-claim iw-claim-all" data-iw-want-claim-all title="Забрать награды за все сбывшиеся желания: монеты придут в кошелёк, желания уйдут из списка">${icon('gift')}<span>Забрать все награды · ${open.length}</span><b>+${sum.toLocaleString('ru-RU')}${icon('coin')}</b></button>`;
      })()}
    </section>`;
}

const wishTools = (kind) => (WISH_BUSY
    ? `<span class="iw-dream-tools"><button type="button" class="iw-mini iw-mini-stop" data-iw-stop="wishes" title="Остановить: желания и страхи останутся прежними" aria-label="Остановить">${icon('stop')}</button></span>`
    : `<span class="iw-dream-tools"><button type="button" class="iw-mini" data-iw-wishes="regen" title="Придумать желания и страхи заново (закреплённые желания останутся)">${icon('dice')}</button></span>`);
const FEAR_POWER = { 1: 'слабый', 2: 'сильный', 3: 'очень сильный' };

function renderFears(c, L) {
    const items = (c.fears || []).map((f, i) => `
      <li class="iw-fear iw-fs-${f.strength}${f.status !== 'active' ? ' ' + f.status : ''}">
        <span class="iw-fear-mark" aria-hidden="true">${icon('ghost')}</span>${simsIco('f', f.text, 'iw-si-fear')}
        <span class="iw-fear-text">${ce(f.text)}${f.status === 'realized' ? ' <b class="iw-tag">Сбылся</b>' : ''}${f.status === 'gone' ? ' <b class="iw-tag">Прошёл</b>' : ''}${f.status !== 'active' ? `<br><button type="button" class="iw-claim iw-fear-cross" data-iw-fear-cross="${i}" title="${f.status === 'realized' ? 'Страх сбылся — вычеркнуть его из списка' : 'Страх прошёл — вычеркнуть его из списка'}">${icon('check')}<span>Вычеркнуть</span></button>` : ''}</span>
        <span class="iw-row-tools"><span class="iw-fear-power">${ce(f.level || FEAR_POWER[f.strength])}</span>${delBtn('fears', i)}</span>
      </li>`).join('');
    return `
    <section class="iw-block iw-b-fears">
      ${blockHead('fears', esc(L.fears), wishTools('fears'))}
      ${items ? `<ul class="iw-list">${items}</ul>` : '<div class="iw-muted">Ничего не пугает</div>'}
    </section>`;
}

function dreamTools(c, busy) {
    const pinned = !!(c.dream && c.dream.pinned);
    return `<span class="iw-dream-tools">
      <button type="button" class="iw-mini${pinned ? ' on' : ''}" data-iw-dream="pin" title="${pinned ? 'Мечта закреплена — не изменится. Нажми, чтобы отпустить' : 'Закрепить мечту: она не будет меняться'}" aria-pressed="${pinned}">${icon(pinned ? 'pin' : 'unpin')}</button>
      ${busy
        ? `<button type="button" class="iw-mini iw-mini-stop" data-iw-stop="dream" title="Остановить: мечта останется прежней" aria-label="Остановить">${icon('stop')}</button>`
        : `<button type="button" class="iw-mini" data-iw-dream="regen" title="${pinned ? 'Сначала открепи мечту' : 'Придумать мечту заново'}"${pinned ? ' disabled' : ''}>${icon('dice')}</button>`}
    </span>`;
}

// Мечта исполнена: большая кнопка «Выбрать новую мечту», потом — варианты на выбор
function dreamDoneBox(c, opts) {
    const busy = opts.dreamBusy === true || (!!opts.dreamBusy && opts.dreamBusy === opts.key);
    const list = c.dreamOptions || [];
    if (list.length) {
        return `<div class="iw-dream-done"><div class="iw-dream-done-cap">${icon('sparkle')}<span>Мечта исполнена. Какой будет новая?</span></div>
        <div class="iw-dream-opts">${list.map((o, i) => `<button type="button" class="iw-dream-opt" data-iw-dream-pick="${i}"${busy ? ' disabled' : ''}><b>${esc(o.title)}${o.plus ? `, <span class="iw-dream-plus">${esc(o.plus)}</span>` : ''}</b>${o.why ? `<small>${ce(o.why)}</small>` : ''}<span class="iw-dream-opt-steps">${o.steps.length} ${plural(o.steps.length, 'этап', 'этапа', 'этапов')}</span></button>`).join('')}</div>
        <button type="button" class="iw-mini-btn iw-btn iw-dream-more" data-iw-dream="choose"${busy ? ' disabled' : ''}>${icon('dice')}<span>${busy ? 'Придумываю…' : 'Другие варианты'}</span></button></div>`;
    }
    return `<div class="iw-dream-done"><div class="iw-dream-done-cap">${icon('sparkle')}<span>Мечта исполнена!</span></div>
      <button type="button" class="iw-btn iw-dream-new${busy ? ' iw-spin' : ''}" data-iw-dream="choose"${busy ? ' disabled' : ''}>${icon('star')}<span>${busy ? 'Придумываю варианты…' : 'Выбрать новую мечту'}</span></button></div>`;
}
function renderDream(c, L, opts = {}) {
    if (!c.dream) {
        return `<section class="iw-block iw-b-dream">${blockHead('dream', esc(L.dream), dreamTools(c, opts.dreamBusy === true || (!!opts.dreamBusy && opts.dreamBusy === opts.key)))}<div class="iw-muted">Ещё не ясна</div></section>`;
    }
    const steps = dedupeSteps(c.dream.steps); // старые дневники могли записать один этап дважды
    const done = steps.filter(s => s.done).length;
    const fulfilled = steps.length > 0 && done === steps.length;
    return `
    <section class="iw-block iw-b-dream${c.dream.pinned ? ' pinned' : ''}${fulfilled ? ' iw-dream-fulfilled' : ''}">
      ${blockHead('dream', esc(L.dream), `<span class="iw-count">${done} из ${steps.length}</span>${dreamTools(c, opts.dreamBusy === true || (!!opts.dreamBusy && opts.dreamBusy === opts.key))}`)}
      <div class="iw-dream-title">${simsIco('d', c.dream.title + ' ' + (c.dream.plus || ''), 'iw-si-dream')}${REL_THEME === 'sims' ? '<span class="iw-dream-tt">' : ''}${esc(c.dream.title)}${c.dream.plus ? `${/^[…,;:—–-]/.test(c.dream.plus.trim()) ? ' ' : ', '}<span class="iw-dream-plus">${esc(c.dream.plus.trim())}</span>` : ''}${REL_THEME === 'sims' ? '</span>' : ''}</div>
      ${fulfilled ? `<div class="iw-dream-stamp">${icon('check')}<span>Исполнена</span></div>` : ''}
      <ol class="iw-steps">${steps.map(s => `<li class="iw-step${s.done ? ' done' : ''}"><span class="iw-star">${s.done ? '★' : '☆'}</span><span>${ce(s.text)}</span></li>`).join('')}</ol>
      ${steps.length && done === steps.length ? dreamDoneBox(c, opts) : ''}
    </section>`;
}

function traitChip(t, i) {
    const gone = t.kind === 'gone';
    const acquired = t.kind === 'new' || !!t.kept || (gone && t.was === 'new');
    const mark = t.kind === 'up' ? '<span class="iw-trait-mark">Усилилась</span>' : (t.kind === 'down' ? '<span class="iw-trait-mark">Слабеет</span>' : (gone ? '<span class="iw-trait-mark">Ушла</span>' : ''));
    const tools = gone
        ? `<button type="button" class="iw-trait-tool" data-iw-trait="back:${i}" title="Вернуть черту: событие её не сломало" aria-label="Вернуть черту">${icon('rotate')}</button>`
        : `${t.kind === 'new' ? `<button type="button" class="iw-trait-tool" data-iw-trait="keep:${i}" title="Сделать постоянной: перенести в основные черты" aria-label="Сделать постоянной">${icon('tobase')}</button>` : ''}${delBtn('traits', i)}`;
    const left = gone && t.left ? `<span class="iw-trait-left">${t.left > 1 ? 'исчезнет через ' + t.left + ' ' + plural(t.left, 'ответ', 'ответа', 'ответов') : 'исчезнет после следующего ответа'}</span>` : '';
    // «Подробнее»: откуда черта у персонажа, а у приобретённой — какое событие её породило.
    const more = [];
    if (t.about) more.push(`<p>${esc(t.about)}</p>`);
    if (t.why) more.push(`<p class="iw-trait-origin"><b>${t.kind === 'up' ? 'Усилилась' : (t.kind === 'down' ? 'Слабеет' : (gone ? 'Ушла' : 'Появилась'))}:</b> ${ce(t.why)}</p>`);
    if (!more.length) more.push(`<p class="iw-muted">${acquired ? 'Подробности появятся после следующего разбора.' : 'Откуда эта черта, станет ясно после разбора «Всё сразу» или «Лорбук».'}</p>`);
    return `
      <span class="iw-trait iw-k-${t.kind}${acquired ? ' iw-acquired' : ''}">
        <span class="iw-trait-head">
        <details class="iw-trait-det">
          <summary class="iw-trait-name" title="Подробнее о черте">${simsIco('t', t.name, 'iw-si-trait')}<span class="iw-trait-label">${ce(t.name)}</span><span class="iw-trait-chev" aria-hidden="true">${icon('chevron')}</span>${mark}</summary>
          <span class="iw-trait-more">${more.join('')}</span>
        </details>
        <span class="iw-trait-tools">${tools}</span>
        </span>
        ${t.kept ? '<span class="iw-trait-kept">Приобретена</span>' : ''}
        ${left}
      </span>`;
}

// Тип личности (16 типов) и темперамент — отдельный блок «про персонажа»:
// общее описание типа и то, как он проявляется именно в этом персонаже.
// Общие описания — в роде персонажа: [он, она].
const PTYPE_TEXT = {
    INTJ: ['Стратег с планом на всё: независим, рационален, видит систему там, где другие видят хаос.', 'Стратег с планом на всё: независима, рациональна, видит систему там, где другие видят хаос.'],
    INTP: ['Изобретательный мыслитель: любопытен, ищет логику во всём, легко уходит в свои мысли.', 'Изобретательный ум: любопытна, ищет логику во всём, легко уходит в свои мысли.'],
    ENTJ: ['Прирождённый лидер: решителен, требователен, умеет вести людей к цели.', 'Прирождённый лидер: решительна, требовательна, умеет вести людей к цели.'],
    ENTP: ['Остроумный спорщик: любит идеи и вызовы, ломает шаблоны, быстро соображает.', 'Остроумная спорщица: любит идеи и вызовы, ломает шаблоны, быстро соображает.'],
    INFJ: ['Тихий идеалист: глубоко чувствует людей, живёт по внутренним принципам, стремится помогать.', 'Тихая идеалистка: глубоко чувствует людей, живёт по внутренним принципам, стремится помогать.'],
    INFP: ['Мечтатель с большим сердцем: живёт ценностями, раним, ищет смысл и гармонию.', 'Мечтательница с большим сердцем: живёт ценностями, ранима, ищет смысл и гармонию.'],
    ENFJ: ['Вдохновляющий лидер: харизматичен, заботится о других и умеет их сплотить.', 'Вдохновляющий лидер: харизматична, заботится о других и умеет их сплотить.'],
    ENFP: ['Энтузиаст: открыт, общителен, загорается идеями и людьми.', 'Энтузиастка: открыта, общительна, загорается идеями и людьми.'],
    ISTJ: ['Надёжный и последовательный: ценит факты, порядок и данное слово.', 'Надёжная и последовательная: ценит факты, порядок и данное слово.'],
    ISFJ: ['Тёплый хранитель: внимателен к близким, предан, тихо заботится.', 'Тёплая хранительница: внимательна к близким, предана, тихо заботится.'],
    ESTJ: ['Организатор: любит порядок и правила, берёт ответственность на себя.', 'Организатор: любит порядок и правила, берёт ответственность на себя.'],
    ESFJ: ['Душа компании: заботлив, общителен, ему важно, чтобы всем было хорошо.', 'Душа компании: заботлива, общительна, ей важно, чтобы всем было хорошо.'],
    ISTP: ['Практик: хладнокровен, изобретателен, лучше всего понимает мир руками.', 'Практик: хладнокровна, изобретательна, лучше всего понимает мир руками.'],
    ISFP: ['Свободный художник: живёт моментом, чуток к красоте, не любит рамок.', 'Свободная творческая душа: живёт моментом, чутка к красоте, не любит рамок.'],
    ESTP: ['Человек действия: смел, азартен, хорошо чувствует обстановку здесь и сейчас.', 'Человек действия: смела, азартна, хорошо чувствует обстановку здесь и сейчас.'],
    ESFP: ['Звезда момента: спонтанен, энергичен, любит людей и внимание.', 'Звезда момента: спонтанна, энергична, любит людей и внимание.'],
};
const PTYPE_TAIL = {
    A: [['уверенный', 'спокойно держит удар'], ['уверенная', 'спокойно держит удар']],
    T: [['беспокойный', 'требователен к себе, остро переживает'], ['беспокойная', 'требовательна к себе, остро переживает']],
};
const TEMPER_TEXT = {
    choleric: ['Быстрый и горячий: решителен, вспыльчив, легко заводится и так же быстро остывает.', 'Быстрая и горячая: решительна, вспыльчива, легко заводится и так же быстро остывает.'],
    sanguine: ['Живой и лёгкий: общителен, оптимистичен, быстро переключается и не держит зла.', 'Живая и лёгкая: общительна, оптимистична, быстро переключается и не держит зла.'],
    phlegmatic: ['Спокойный и ровный: раскачивается не сразу, зато надёжен и почти никогда не теряет самообладания.', 'Спокойная и ровная: раскачивается не сразу, зато надёжна и почти никогда не теряет самообладания.'],
    melancholic: ['Чуткий и глубокий: остро переживает, раним, внимателен к мелочам и настроениям.', 'Чуткая и глубокая: остро переживает, ранима, внимательна к мелочам и настроениям.'],
};
const byGender = (pair, g) => (Array.isArray(pair) ? pair[g === 'f' ? 1 : 0] : pair || '');

function renderPersona(c, L, opts = {}) {
    const code = c.ptype ? c.ptype.slice(0, 4) : '';
    const name = PTYPES[code];
    const grp = ptypeGroup(code);
    const tail = c.ptype && c.ptype.length > 5 ? c.ptype.slice(5) : '';
    const g = genderOf(c.g, c.name, c.who);
    const tailPair = tail && PTYPE_TAIL[tail] ? byGender(PTYPE_TAIL[tail], g) : null;
    const cards = [];
    if (name) {
        cards.push(`
        <div class="iw-persona-card iw-pt-${grp}">
          <div class="iw-persona-top">
            <span class="iw-persona-code">${esc(code)}${tail ? `<i>-${esc(tail)}</i>` : ''}</span>
            <span class="iw-persona-name">${esc(name)}<small>${esc(PTYPE_GROUPS[grp] || '')}</small></span>
          </div>
          <p class="iw-persona-general">${esc(byGender(PTYPE_TEXT[code], g))}${tailPair ? ` ${esc(tailPair[0].charAt(0).toUpperCase() + tailPair[0].slice(1))}: ${esc(tailPair[1])}.` : ''}</p>
          ${c.ptypeNote ? `<p class="iw-persona-own">${ce(c.ptypeNote)}</p>` : ''}
        </div>`);
    }
    if (TEMPERS[c.temper]) {
        cards.push(`
        <div class="iw-persona-card iw-tm-${c.temper}">
          <div class="iw-persona-top">
            <span class="iw-persona-code">${icon('flame')}</span>
            <span class="iw-persona-name">${esc(cap1(TEMPERS[c.temper]))}<small>Темперамент</small></span>
          </div>
          <p class="iw-persona-general">${esc(byGender(TEMPER_TEXT[c.temper], g))}</p>
          ${c.temperNote ? `<p class="iw-persona-own">${ce(c.temperNote)}</p>` : ''}
        </div>`);
    }
    const z = ZODIAC[c.zodiac];
    // дату рождения можно вписать или поправить руками — она же попадает в календарь и на карточку
    const bornBtn = opts.key ? `<button type="button" class="iw-born-edit iw-pc-edit" data-iw-born="${esc(opts.key)}" title="${c.born ? 'Поправить дату рождения или знак зодиака' : 'Вписать дату рождения или выбрать знак зодиака'}" aria-label="${c.born ? 'Изменить' : 'Вписать'}">${icon('feather')}</button>` : '';
    {
        const born = c.born ? `${gw(g, 'Родился', 'Родилась', 'День рождения:')} ${esc(bornText(c.born, CAL_NOW))}` : 'Дата рождения не указана';
        cards.push(`
        <div class="iw-persona-card iw-pc-editable iw-zd-${z ? z.el : 'none'}">
          <div class="iw-persona-top">
            <span class="iw-persona-code iw-zodiac-glyph">${z ? `${z.glyph}\uFE0E` : icon('zodiac')}</span>
            <span class="iw-persona-name${pnLong(z ? z.name : 'Знак не ясен')}">${esc(z ? z.name : 'Знак не ясен')}<small>${born}</small></span>
            ${bornBtn}
          </div>
          ${z ? `<p class="iw-persona-general">${esc(z.text)}</p>` : ''}
        </div>`);
    }
    {
        // ориентация — из карточки, лорбука или описания персоны; если не названа, можно выбрать самой
        const ok = ORIENTS[c.orient] ? c.orient : '';
        const opts2 = ['<option value="">не указана</option>'].concat(Object.keys(ORIENTS).map(k => `<option value="${k}"${k === ok ? ' selected' : ''}>${esc(orientName(k, g))}</option>`)).join('');
        const pick = opts.key ? `<label class="iw-orient-pick iw-pc-edit" title="Выбрать ориентацию вручную — модель её больше не поменяет">${icon('feather')}<select data-iw-orient="${esc(opts.key)}" aria-label="Ориентация">${opts2}</select></label>` : '';
        const src = ok ? (c.orientManual ? 'выбрано вручную' : 'из карточки и лорбука') : 'в карточке не указана';
        cards.push(`
        <div class="iw-persona-card iw-pc-editable iw-or-${ok || 'none'}">
          <div class="iw-persona-top">
            <span class="iw-persona-code iw-orient-glyph">${icon('heart')}</span>
            <span class="iw-persona-name${pnLong(ok ? orientName(ok, g) : 'Ориентация не ясна')}">${esc(ok ? cap1(orientName(ok, g)) : 'Ориентация не ясна')}<small>Ориентация · ${src}</small></span>
            ${pick}
          </div>
          ${ok ? `<p class="iw-persona-general">${esc(ORIENTS[ok].text)}</p>` : ''}
        </div>`);
    }
    return `
    <section class="iw-block iw-b-persona">
      ${blockHead('persona', esc(L.persona || 'Тип личности'))}
      ${cards.length ? `<div class="iw-persona-grid">${cards.join('')}</div>` : '<div class="iw-muted">Определится при следующем разборе: «Всё сразу» или «Лорбук»</div>'}
    </section>`;
}

function renderTraits(c, L) {
    const list = (c.traits || []).map((t, i) => ({ t, i }));
    const isNew = t => t.kind === 'new' || (t.kind === 'gone' && t.was === 'new');
    const base = list.filter(x => !isNew(x.t));
    const gained = list.filter(x => isNew(x.t));
    if (!list.length) {
        return `<section class="iw-block iw-b-traits">${blockHead('traits', esc(L.traits))}<span class="iw-muted">Пока не разобрались</span></section>`;
    }
    return `
    <section class="iw-block iw-b-traits">
      ${blockHead('traits', esc(L.traits))}
      <div class="iw-trait-groups">
        <div class="iw-group">
          ${groupHead(L.traitsBase)}
          <div class="iw-traits">${base.map(x => traitChip(x.t, x.i)).join('') || '<span class="iw-muted">—</span>'}</div>
        </div>
        <div class="iw-group">
          ${groupHead(L.traitsGained, 'после важных событий')}
          <div class="iw-traits">${gained.map(x => traitChip(x.t, x.i)).join('') || '<span class="iw-muted iw-group-empty">Пока ничего</span>'}</div>
        </div>
      </div>
    </section>`;
}

function renderChronicle(c, L) {
    const items = (c.log || []).map(e => `
      <li class="iw-log iw-ev-${e.type}">
        <span class="iw-log-icon">${icon(EVENT_ICONS[e.type] || 'star')}</span>
        <span class="iw-log-body"><b>${esc(eventTitle(e))}</b> ${ce(e.text)}</span>
        ${e.m !== null && e.m !== undefined ? `<span class="iw-log-at">#${esc(e.m)}</span>` : ''}
      </li>`).join('');
    return `
    <section class="iw-block iw-b-chronicle">
      ${blockHead('chronicle', esc(L.chronicle))}
      ${items ? `<ul class="iw-list iw-logs">${items}</ul>` : `<div class="iw-muted">${esc(L.chronicleEmpty)}</div>`}
    </section>`;
}

// Купленное и ещё действующее — приклеенными листочками с кнопкой «отменить» (монеты вернутся).
export function buffNotes(c, key) {
    const list = (c && c.buffs) || [];
    if (!list.length) return '';
    return `<div class="iw-notes" role="list">${list.map((b, i) => `
      <div class="iw-note iw-note-${b.kind === 'event' || b.kind === 'gift' ? b.kind : 'buff'}" role="listitem" style="--iw-tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.6)}deg">
        <span class="iw-note-pin" aria-hidden="true"></span>
        <span class="iw-note-ico">${icon(b.icon || (b.kind === 'event' ? 'sparkle' : 'potion'))}</span>
        <span class="iw-note-body"><b>${ce(b.title)}</b><small>${b.kind === 'event' ? 'случится в следующем ответе' : b.kind === 'gift' ? 'подарит в ближайшей сцене' : `действует ещё ${b.left} ${plural(b.left, 'ответ', 'ответа', 'ответов')}`}</small></span>
        <button type="button" class="iw-note-x" data-iw-unbuy="${esc(key)}:${esc(b.id)}" title="Отменить — монеты вернутся${b.cost ? ` (${b.cost})` : ''}" aria-label="Отменить">${icon('x')}</button>
      </div>`).join('')}</div>`;
}


// Категории наград: у каждой свой цвет и понятная подпись.
const REWARD_GROUPS = [
    { kind: 'buff', icon: 'potion', name: 'На время', hint: 'эффект на несколько ответов: настроение, сила, удача' },
    { kind: 'event', icon: 'sparkle', name: 'Событие', hint: 'случится в сюжете в следующем ответе' },
    { kind: 'gift', icon: 'gift', name: 'Подарок', hint: '' },
    { kind: 'collect', icon: 'gem', name: 'В коллекцию', hint: 'памятная вещь, остаётся навсегда' },
];

export function renderShop(c, theme, key, { shopBusy = false, purse = null, personaName = '', personaOwned = [], buyOne = true } = {}) {
    const persona = null, forPersona = false;
    const userOwned = new Set(personaOwned.map(t => String(t || '').toLowerCase()));
    const own = !!c.persona; // лавка персоны игрока — только памятные вещи для неё
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who));
    const pts = purse ?? (c.points || 0);
    const row = r => `
      <li class="iw-reward iw-rk-${r.kind}${pts < r.cost || buyBlock(c, r.kind, buyOne) ? ' locked' : ''}${r.pinned ? ' pinned' : ''}">
        <span class="iw-rw-ico iw-rw-big">${icon(r.icon || 'gift')}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${ce(r.title)}</b>${r.forUser ? `<span class="iw-rw-for">для ${esc(personaName || 'тебя')}</span>` : ''}<span class="iw-rw-desc">${ce(r.desc || r.effect || '')}</span>${r.kind === 'buff' ? `<span class="iw-rw-kind">действует ${r.turns} ${plural(r.turns, 'ответ', 'ответа', 'ответов')}</span>` : ''}</span>
        <button type="button" class="iw-mini iw-shop-pin${r.pinned ? ' on' : ''}" data-iw-shop-pin="${esc(r.id)}" title="${r.pinned ? 'Закреплено: останется в лавке при «Подобрать заново» и после разборов — можно купить позже. Нажми, чтобы открепить' : 'Закрепить: награда не пропадёт при «Подобрать заново», можно купить позже'}" aria-pressed="${!!r.pinned}">${icon(r.pinned ? 'pin' : 'unpin')}</button>
        <button type="button" class="iw-buy" data-iw-buy="${esc(r.id)}"${pts < r.cost || buyBlock(c, r.kind, buyOne) ? ' disabled' : ''} title="${esc(buyBlock(c, r.kind, buyOne) || (pts < r.cost ? 'Не хватает очков' : 'Купить'))}">${icon(currencyIcon(theme))}<span>${r.cost}</span></button>
      </li>`;
    // купленное уходит с полки: действующее висит листочком, памятная вещь — уже на витрине
    const active = new Set((c.buffs || []).map(b => b.id));
    // памятная вещь уходит с полки, когда она уже есть у того, кому её сейчас покупают
    const owned = new Set(((forPersona ? persona.collection : c.collection) || []).map(x => String(x.title || '').toLowerCase()));
    const shop = (c.shop || []).filter(r => !active.has(r.id) && !(r.kind === 'collect' && (r.forUser ? userOwned : owned).has(String(r.title || '').toLowerCase())));
    const groups = REWARD_GROUPS.map(g => {
        if (own && g.kind !== 'collect') return '';
        const list = shop.filter(r => r.kind === g.kind);
        if (!list.length) return '';
        const gift = g.kind === 'collect' && persona
            ? `<div class="iw-gift-to" role="group" aria-label="Кому купить"><span class="iw-muted">Кому:</span><button type="button" class="iw-gift-opt${forPersona ? '' : ' on'}" data-iw-giftto="owner" aria-pressed="${!forPersona}">${esc(c.name)}</button><button type="button" class="iw-gift-opt${forPersona ? ' on' : ''}" data-iw-giftto="persona" aria-pressed="${forPersona}">${esc(persona.name)}</button></div>`
            : '';
        return `
    <div class="iw-rw-group iw-rg-${g.kind}${buyBlock(c, g.kind, buyOne) ? ' iw-rg-wait' : ''}">
      <div class="iw-rw-cat"><span class="iw-rw-cat-name">${icon(g.icon)}${g.kind === 'gift' ? `Подарок ${esc(personaName ? `для ${personaName}` : 'тебе')}` : g.name}</span><span class="iw-rw-cat-hint">${g.kind === 'gift' ? `${esc(c.name)} ${gw(genderOf(c.g, c.name, c.who), "сам", "сама", "сам")} подарит это в ближайшей сцене — как умеет и как сейчас относится` : (own && g.kind === 'collect' ? `вещи для ${esc(c.name)}, лягут в ${gw(genderOf(c.g, c.name, c.who), 'его', 'её', 'его')} коллекцию` : g.hint)}</span></div>${gift}
      <ul class="iw-list iw-rewards">${list.map(row).join('')}</ul>
    </div>`;
    }).join('');
    // лавку ещё ни разу не подбирали — кнопка «наполнить» на языке темы; уже подбирали — «Подобрать заново»
    const shopMade = (c.shop || []).length > 0;
    const firstLabel = SHOP_FIRST[theme] || 'Подобрать награды';
    return `
<button type="button" class="iw-back" data-iw-view="${own ? 'me' : 'main'}:${esc(key)}">${icon('back')}<span>к дневнику</span></button>
<section class="iw-block iw-b-shop">
  ${blockHead('rewards', esc(L.shop), `<span class="iw-points" title="${Number(pts || 0).toLocaleString('ru-RU')}"><span class="iw-cheat-coin" data-iw-cheat="1">${icon(currencyIcon(theme))}</span><b>${shortPoints(pts)}</b></span>`)}
  <div class="iw-muted">${own ? `Памятные вещи для ${esc(c.name)}: покупаются за общие монеты чата и встают на витрину.` : `Очки: желание +10, этап мечты +25, мечта целиком +100. Награды подобраны под персонажа: ${esc(c.name)}.`}</div>
  <div class="iw-shop-top"><button type="button" class="iw-btn${shopBusy ? ' busy' : ''}" data-iw-shop="regen"${shopBusy ? ' disabled' : ''}>${icon(shopBusy ? 'rotate' : 'dice')}<span>${shopMade ? 'Подобрать заново' : esc(firstLabel)}</span></button></div>
  ${buffNotes(c, key)}
  ${groups || (shopMade ? '<div class="iw-empty">Всё уже куплено. Нажми «Подобрать заново» — появятся новые награды.</div>' : `<div class="iw-empty">Наград пока нет — нажми «${esc(firstLabel)}».</div>`)}
</section>`;
}

const SHOP_FIRST = {
    icq: 'Загрузить смайлы и подарки', vk: 'Найти подарки', sims: 'Заполнить магазин', bimbo: 'Хочу шопинг ♡',
    medieval: 'Наполнить лавку', china: 'Наполнить лавку', herbal: 'Собрать травы', arcana: 'Разложить талисманы',
    nav: 'Наполнить лавку', seance: 'Собрать подношения', cyber: 'Загрузить бонусы', dossier: 'Запросить снабжение',
    logbook: 'Пополнить склад', noir: 'Открыть салон', grid: 'Подобрать награды', diary: 'Подобрать награды', dark: 'Подобрать награды',
};

// Витрина — как лавка: список памятных вещей и достижений, значки в скетчевых кружках, звёздочки за достоинство.
const TIER_STARS = { bronze: 1, silver: 2, gold: 3 };
// значок достижения: обычный рисунок или лицо-эмоция (для смешных и милых)
export function achIcon(name) {
    const sims = simsPict(name || 'trophy');
    if (sims) return sims;
    return ACH_FACES.includes(name) ? faceIcon(name, 'iw-ach-face') : pictIcon(name || 'trophy');
}
// «Симулятор жизни»: значки достижений и вещей — из пака иконок игры
const SIMS_PICT = new Set(['trophy', 'star', 'crown', 'heart', 'lips', 'flower', 'gift', 'ribbon', 'cake', 'cup', 'potion', 'shield', 'flame', 'key', 'lock', 'ghost', 'eye', 'letter', 'scroll', 'book', 'feather', 'note', 'dice', 'coin', 'gem', 'sun', 'moon', 'clock', 'chat', 'users', 'sparkle', 'alert', 'trash']);
function simsPict(name) {
    if (REL_THEME !== 'sims') return '';
    const file = SIMS_PICT.has(name) ? `a-${name}` : (ACH_FACES.includes(name) ? `e-${name}` : '');
    return file ? `<span class="iw-si-pict" style="--si:url('icons/sims/${file}.webp')" aria-hidden="true"></span>` : '';
}
// Витрина: два сворачиваемых раздела — достижения (внутри по золоту, серебру, бронзе) и памятные вещи.
// Что открыто, а что свёрнуто — запоминается. Памятные вещи могут быть нарисованы моделью (настройка «Рисовать…»).
const CASE_FOLD_DEFAULT = { ach: true, items: true, gifts: true, gold: true, silver: false, bronze: false };
// «Нарисовать» — перо и подпись словом, чтобы было понятно без подсказки
function drawBtn(x, art, artBusy) {
    if (!art) return '';
    const id = `${x.key}:${x.pending ? 'b' + x.bi : x.i}`;
    const busyHere = artBusy === id;
    const label = busyHere ? 'рисую…' : (x.art ? 'перерисовать' : 'нарисовать');
    return `<button type="button" class="iw-case-draw${busyHere ? ' iw-spin' : ''}" data-iw-art="${esc(id)}"${artBusy ? ' disabled' : ''} title="${x.art ? 'Перерисовать картинку' : 'Нарисовать картинку по смыслу вещи и истории'}">${icon('feather')}<span>${label}</span></button>`;
}
function renderShowcase({ state, theme, got = [], sel = '', fold = {}, art = true, artBusy = '', view = 'list' }) {
    const all = collectionOf(state);
    // подарки персонажа (и те, что ещё ждут вручения) — отдельной розовой полкой
    const pending = [];
    for (const [k, c] of Object.entries((state && state.characters) || {})) ((c && c.buffs) || []).forEach((b, bi) => { if (b && b.kind === 'gift') pending.push({ title: b.title, icon: b.icon, desc: b.desc || '', owner: c.name, key: k, pending: true, bi, art: b.art || '' }); });
    const gifts = all.filter(x => x.gift).concat(pending);
    const items = all.filter(x => !x.gift);
    const grid = view === 'grid' || view === 'cards'; // «Карточками» больше нет — показываем сеткой
    const cards = false;
    const isOpen = k => (fold && fold[k] !== undefined ? !!fold[k] : CASE_FOLD_DEFAULT[k]);
    const list = (Array.isArray(got) ? got : []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const stars = (t, word = true) => `<span class="iw-case-stars iw-tier-${t}" title="${esc(TIER_NAMES_RU[t] || '')}">${Array.from({ length: TIER_STARS[t] || 1 }, () => icon('star')).join('')}${word ? `<em>${esc(TIER_NAMES_RU[t] || '')}</em>` : ''}</span>`;
    const kindTag = a => (a.kind && ACH_KINDS[a.kind] ? `<span class="iw-ach-kind iw-ach-${a.kind}">${esc(ACH_KINDS[a.kind])}</span>` : '');
    const pic = x => (art && x.art ? `<span class="iw-case-art" aria-hidden="true">${x.art}</span>` : `<span class="iw-case-ico">${simsPict(x.icon || 'gift') || pictIcon(x.icon || 'gift')}</span>`);
    const achDel = a => `<button type="button" class="iw-mini iw-case-x" data-iw-achdel="${esc(a.id)}" title="Убрать с витрины" aria-label="Убрать с витрины">${icon('x')}</button>`;
    const achMeta = a => `${a.scene ? `<span>${esc(a.scene)}</span>` : ''}${a.mes !== undefined ? `<span>сообщение #${esc(a.mes)}</span>` : ''}`;
    const owner = x => (x.pending ? `${esc(x.owner)} подарит в ближайшей сцене` : (x.gift ? `подарок · ${esc(x.desc && /^Подарок от ([^:]+)/.test(x.desc) ? x.desc.match(/^Подарок от ([^:]+)/)[1] : x.owner)}` : `в коллекции: ${esc(x.owner)}`));
    const itemDesc = x => (x.gift && x.desc ? x.desc.replace(/^Подарок от [^:]+:?\s*/, '') : x.desc);
    // столбиком: тег — сразу у названия
    const achRow = a => `
      <li class="iw-reward iw-case-row iw-case-ach iw-tier-${a.tier}${sel === `a:${a.id}` ? ' on' : ''}">
        <span class="iw-case-ico">${achIcon(a.icon)}</span>
        <span class="iw-rw-body"><span class="iw-case-titleline"><b class="iw-rw-title">${ce(a.title)}</b>${kindTag(a)}</span>${a.desc ? `<span class="iw-rw-desc">${ce(a.desc)}</span>` : ''}<span class="iw-rw-kind">${stars(a.tier)}${achMeta(a)}</span></span>
        ${achDel(a)}
      </li>`;
    const itemRow = (x, cls) => `
      <li class="iw-reward ${cls} iw-case-row${art && x.art ? ' iw-has-art' : ''}${x.pending ? ' iw-case-pending' : ''}">
        ${pic(x)}
        <span class="iw-rw-body"><b class="iw-rw-title">${ce(x.title)}</b>${itemDesc(x) ? `<span class="iw-rw-desc">${ce(itemDesc(x))}</span>` : ''}<span class="iw-rw-kind">${owner(x)}</span>${drawBtn(x, art, artBusy)}</span>
      </li>`;
    // сеткой: значок, название и ранг; нажала — плитка раскрывается во всю строку
    const achTile = a => `
      <li class="iw-case-cell iw-case-ach iw-tier-${a.tier}"><details class="iw-case-tile" data-iw-tile="a:${esc(a.id)}"${sel === `a:${a.id}` ? ' open' : ''}>
        <summary class="iw-case-tile-sum"><span class="iw-case-ico">${achIcon(a.icon)}</span><span class="iw-case-tile-name">${ce(a.title)}</span>${stars(a.tier, false)}</summary>
        <div class="iw-case-tile-more"><div class="iw-case-tile-tags">${stars(a.tier)}${kindTag(a)}</div>${a.desc ? `<p class="iw-case-tile-desc">${ce(a.desc)}</p>` : ''}<div class="iw-case-tile-meta">${achMeta(a)}${achDel(a)}</div></div>
      </details></li>`;
    const itemTile = (x, cls) => `
      <li class="iw-case-cell ${cls}${x.pending ? ' iw-case-pending' : ''}"><details class="iw-case-tile" data-iw-tile="i:${esc(x.key)}:${x.i ?? 'p'}:${esc(x.title)}"${sel === `i:${x.key}:${x.i ?? 'p'}:${x.title}` ? ' open' : ''}>
        <summary class="iw-case-tile-sum">${pic(x)}<span class="iw-case-tile-name">${ce(x.title)}</span></summary>
        <div class="iw-case-tile-more">${itemDesc(x) ? `<p class="iw-case-tile-desc">${ce(itemDesc(x))}</p>` : ''}<div class="iw-case-tile-meta"><span>${owner(x)}</span></div>${drawBtn(x, art, artBusy)}</div>
      </details></li>`;
    // карточками по две в ряд: крупная картинка сверху, под ней всё о вещи
    const achCard = a => `
      <li class="iw-case-card iw-case-ach iw-tier-${a.tier}">
        <span class="iw-case-card-pic">${achIcon(a.icon)}</span>
        <span class="iw-case-card-body"><b class="iw-rw-title">${ce(a.title)}</b>${stars(a.tier)}${kindTag(a)}${a.desc ? `<span class="iw-rw-desc">${ce(a.desc)}</span>` : ''}<span class="iw-case-card-meta">${achMeta(a)}</span></span>
        ${achDel(a)}
      </li>`;
    const itemCard = (x, cls) => `
      <li class="iw-case-card ${cls}${art && x.art ? ' iw-has-art' : ''}${x.pending ? ' iw-case-pending' : ''}">
        <span class="iw-case-card-pic">${art && x.art ? `<span class="iw-case-art" aria-hidden="true">${x.art}</span>` : (simsPict(x.icon || 'gift') || pictIcon(x.icon || 'gift'))}</span>
        <span class="iw-case-card-body"><b class="iw-rw-title">${ce(x.title)}</b>${itemDesc(x) ? `<span class="iw-rw-desc">${ce(itemDesc(x))}</span>` : ''}<span class="iw-rw-kind">${owner(x)}</span>${drawBtn(x, art, artBusy)}</span>
      </li>`;
    const ul = (rows, f, cls = '') => `<ul class="iw-list iw-rewards${grid ? ' iw-case-grid' : ''}" lang="ru">${rows.map(x => f(x, cls)).join('')}</ul>`;
    const tiers = ['gold', 'silver', 'bronze'].map(tier => {
        const rows = list.filter(a => (a.tier || 'bronze') === tier);
        if (!rows.length) return '';
        return `
    <details class="iw-case-tier iw-tier-${tier}" data-iw-case="${tier}"${isOpen(tier) ? ' open' : ''}>
      <summary class="iw-case-tier-head">${stars(tier)}<span class="iw-case-n">${rows.length}</span><span class="iw-case-pm" aria-hidden="true">${icon('plus')}${icon('minus')}</span></summary>
      ${ul(rows, grid ? achTile : achRow)}
    </details>`;
    }).join('');
    const sec = (k, cls, ico, name, hint, body) => `
  <details class="iw-rw-group iw-case-sec ${cls}" data-iw-case="${k}"${isOpen(k) ? ' open' : ''}>
    <summary class="iw-rw-cat"><span class="iw-rw-cat-name">${icon(ico)}${name}</span><span class="iw-rw-cat-hint">${hint}</span><span class="iw-case-pm" aria-hidden="true">${icon('plus')}${icon('minus')}</span></summary>
    ${body}
  </details>`;
    // «Нарисовать все сразу» — у своей полки: памятные вещи и подарки рисуются отдельно
    const drawAll = (which, rows) => (art && rows.length ? `<div class="iw-case-sectools"><button type="button" class="iw-case-vbtn iw-case-drawall" data-iw-art-all="${which}"${artBusy || !rows.some(x => !x.art) ? ' disabled' : ''} title="${rows.some(x => !x.art) ? `Нарисовать ${which === 'gifts' ? 'подарки' : 'памятные вещи'} без картинки: ${rows.filter(x => !x.art).length}. Уже нарисованные не трогаются — перерисовать можно кнопкой у самой вещи` : 'Всё уже нарисовано. Перерисовать можно кнопкой у самой вещи'}">${icon('feather')}<span>${artBusy ? 'рисую…' : 'Нарисовать все сразу'}</span></button></div>` : '');
    const doodles = '<div class="iw-cal-doodles iw-case-doodles" aria-hidden="true"><i class="iw-dd iw-dd-a"></i><i class="iw-dd iw-dd-b"></i><i class="iw-dd iw-dd-c"></i></div>';
    const toolbar = `<div class="iw-case-bar">
    <div class="iw-case-views" role="group" aria-label="Как показывать витрину">
      <button type="button" class="iw-case-vbtn${grid ? '' : ' on'}" data-iw-caseview="list" aria-pressed="${!grid}" title="Столбиком: всё сразу подробно">${icon('list')}<span>Столбиком</span></button>
      <button type="button" class="iw-case-vbtn${grid ? ' on' : ''}" data-iw-caseview="grid" aria-pressed="${grid}" title="Сеткой: значки с названиями; нажми, чтобы раскрыть">${icon('grid')}<span>Сеткой</span></button>
    </div>
  </div>`;
    return `
<button type="button" class="iw-back" data-iw-view="back">${icon('back')}<span>к дневнику</span></button>
<section class="iw-block iw-b-shop iw-b-showcase${grid ? ' iw-case-gridview' : ''}${cards ? ' iw-case-cardview' : ''}">
  ${blockHead('rewards', 'Витрина', `<span class="iw-points iw-case-count" title="Достижений: ${list.length}">${icon('trophy')}<b>${list.length}</b></span>`)}
  <div class="iw-muted">Памятные вещи, подарки и достижения истории. Достижения появляются сами, когда случается что-то по-настоящему важное.</div>
  ${toolbar}
  ${sec('ach', 'iw-rg-ach', 'trophy', 'Достижения', list.length ? `получено: ${list.length}` : 'появятся по ходу истории', list.length ? tiers : '<p class="iw-case-empty-text">Пока пусто. Признание, спасение, предательство, большая победа — и здесь появится первая запись.</p>')}
  ${sec('items', 'iw-rg-collect', 'gem', 'Памятные вещи', items.length ? `${items.length} ${plural(items.length, 'вещь', 'вещи', 'вещей')}` : 'покупаются в лавке «в коллекцию»', items.length ? drawAll('items', items) + ul(items, grid ? itemTile : itemRow, 'iw-rk-collect') : '<p class="iw-case-empty-text">Пока пусто. Загляни в лавку — там есть вещицы «в коллекцию».</p>')}
  ${sec('gifts', 'iw-rg-gift', 'gift', 'Подарки', gifts.length ? `${gifts.length} ${plural(gifts.length, 'подарок', 'подарка', 'подарков')}` : 'покупаются в лавке персонажа «в подарок»', gifts.length ? drawAll('gifts', gifts) + ul(gifts, grid ? itemTile : itemRow, 'iw-rk-gift') : '<p class="iw-case-empty-text">Пока пусто. В лавке персонажа можно купить подарок — он вручит его сам, и подарок ляжет сюда.</p>')}
  ${doodles}
</section>`;
}

// Раскладка блоков без дыр. Блоки остаются в своей части дневника:
// узкие (настроение, отношение, желания, страхи) — открытые парами, под ними свёрнутые плашками по две;
// если узкому не хватило пары, он растягивается на всю ширину. Широкий блок сворачивается полоской на своём месте.
const NARROW_BLOCKS = new Set(['mood', 'impression', 'wants', 'fears', 'life', 'nights', 'rumors', 'memes']);
export const BLOCK_ORDER = ['mood', 'impression', 'wants', 'fears', 'dream', 'traits', 'persona', 'attraction', 'life', 'nights', 'rumors', 'memes', 'chronicle'];
export function orderOfBlocks(custom) {
    const own = Array.isArray(custom) ? custom.filter(k => BLOCK_ORDER.includes(k)) : [];
    const rest = BLOCK_ORDER.filter(k => !own.includes(k));
    // новые блоки, которых не было в сохранённом порядке, встают на свои обычные места
    const out = own.slice();
    for (const k of rest) {
        const i = BLOCK_ORDER.indexOf(k);
        const after = BLOCK_ORDER.slice(0, i).reverse().find(x => out.includes(x));
        out.splice(after ? out.indexOf(after) + 1 : 0, 0, k);
    }
    return out;
}
export function layoutBlocks(blocks, collapsed = {}) {
    const items = blocks.filter(Boolean).map(h => ({ h, k: (h.match(/class="iw-block iw-b-([a-z]+)/) || [])[1] || '' }));
    const mark = (x, cls) => (cls ? x.h.replace(/class="iw-block iw-b-([a-z]+)(?=[" ])/, m => `${m}${cls}`) : x.h);
    const out = [];
    let run = [];
    // блоки держат своё место: пару составляют соседи в одном состоянии (оба открыты или оба свёрнуты),
    // иначе блок растягивается на всю ширину. Раньше открытые уезжали наверх, обгоняя свёрнутые.
    const flush = () => {
        for (let i = 0; i < run.length;) {
            const a = run[i], b = run[i + 1];
            const fa = collapsed[a.k] ? ' iw-collapsed' : '';
            if (b && !!collapsed[a.k] === !!collapsed[b.k]) {
                out.push(mark(a, fa), mark(b, fa));
                i += 2;
            } else {
                out.push(mark(a, `${fa} iw-solo`));
                i += 1;
            }
        }
        run = [];
    };
    for (const x of items) {
        if (NARROW_BLOCKS.has(x.k)) { run.push(x); continue; }
        flush();
        out.push(mark(x, collapsed[x.k] ? ' iw-collapsed iw-solo' : ''));
    }
    flush();
    return out.join('');
}

// ===== ВКонтакте: «сейчас играет» в статусе, как в старом ВК. Песни 2006–2010, что крутили школьники и студенты;
// после каждого разбора дневника выпадает другая (меняется вместе с записями персонажа) =====
const VK_SONGS = [
    ['Stigmata', 'Сентябрь'], ['Tokio Hotel', 'Durch den Monsun'], ['Tokio Hotel', 'Schrei'], ['Tokio Hotel', 'Rette mich'], ['Tokio Hotel', 'Spring nicht'],
    ['Звери', 'Районы-кварталы'], ['Звери', 'Всё, что тебя касается'], ['Звери', 'Напитки покрепче'], ['Uma2rmaH', 'Проститься'], ['Uma2rmaH', 'Ночной дозор'],
    ['Серебро', 'Song #1'], ['Серебро', 'Дыши'], ['Ранетки', 'Ангелы'], ['Ранетки', 'О тебе'], ['Город 312', 'Останусь'], ['Город 312', 'Вне зоны доступа'],
    ['Банд\'Эрос', 'Коламбия Пикчерз не представляет'], ['Банд\'Эрос', 'Манхэттен'], ['Дима Билан', 'Невозможное возможно'], ['Дима Билан', 'Believe'],
    ['МакSим', 'Знаешь ли ты'], ['МакSим', 'Трудный возраст'], ['МакSим', 'Нежность'], ['МакSим', 'Отпускаю'], ['Винтаж', 'Плохая девочка'], ['Винтаж', 'Ева'],
    ['Нюша', 'Выбирать чудо'], ['Animal ДжаZ', 'Три полоски'], ['Lumen', 'Сид и Нэнси'], ['Lumen', 'Гореть'], ['Мельница', 'Ночная кобыла'], ['Мельница', 'Дракон'],
    ['Земфира', 'Хочешь?'], ['Земфира', 'Небомореоблака'], ['Би-2', 'Полковнику никто не пишет'], ['Сплин', 'Выхода нет'], ['Ёлка', 'Девушка из высшего общества'],
    ['Каста', 'Вокруг шум'], ['Тимати', 'Не сходи с ума'], ['Ангина', 'Болела'], ['Кукрыниксы', 'По раскрашенной душе'], ['Король и Шут', 'Лесник'],
    ['Пропаганда', 'Мелом'], ['Корни', 'Ты узнаешь её'], ['Фабрика', 'Про любовь'], ['ВИА Гра', 'Поцелуи'], ['Т.А.Т.у.', 'Нас не догонят'], ['Ленинград', 'WWW'],
    ['Smash!!', 'Freeway'], ['Мумий Тролль', 'Невеста?'], ['Ночные Снайперы', '31-я весна'], ['Найк Борзов', 'Лошадка'], ['Агата Кристи', 'Как на войне'],
    ['Evanescence', 'Bring Me to Life'], ['Evanescence', 'My Immortal'], ['Linkin Park', 'What I\'ve Done'], ['Linkin Park', 'Numb'], ['Linkin Park', 'Leave Out All the Rest'],
    ['My Chemical Romance', 'Welcome to the Black Parade'], ['My Chemical Romance', 'Helena'], ['Fall Out Boy', 'Sugar, We\'re Goin Down'], ['Panic! at the Disco', 'I Write Sins Not Tragedies'],
    ['30 Seconds to Mars', 'The Kill'], ['30 Seconds to Mars', 'From Yesterday'], ['The Rasmus', 'In the Shadows'], ['Green Day', 'Boulevard of Broken Dreams'],
    ['Green Day', 'Wake Me Up When September Ends'], ['Avril Lavigne', 'Girlfriend'], ['Avril Lavigne', 'When You\'re Gone'], ['Rihanna', 'Umbrella'], ['Timbaland', 'Apologize'],
    ['Nelly Furtado', 'Say It Right'], ['Lady Gaga', 'Poker Face'], ['Katy Perry', 'Hot n Cold'], ['Akon', 'Lonely'], ['Gwen Stefani', 'The Sweet Escape'],
    ['Placebo', 'Running Up That Hill'], ['HIM', 'Wings of a Butterfly'], ['Muse', 'Supermassive Black Hole'], ['The Pretty Reckless', 'Make Me Wanna Die'],
    ['Billy Talent', 'Fallen Leaves'], ['Simple Plan', 'Welcome to My Life'], ['Kerli', 'Walking on Air'], ['Within Temptation', 'What Have You Done'],
    ['Lordi', 'Hard Rock Hallelujah'], ['Scooter', 'Jumping All Over the World'], ['Basshunter', 'Now You\'re Gone'], ['Alexander Rybak', 'Fairytale'], ['Gotan Project', 'Diferente'],
];
function vkSong(c) {
    const seed = `${c.name || ''}|${(c.log || []).length}|${c.moodSaid || c.mood || ''}|${(c.feels || c.moodlets || []).length}`;
    let h = 2166136261;
    for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return VK_SONGS[h % VK_SONGS.length];
}
function vkStatus(c) {
    if (REL_THEME !== 'vk' || !c) return '';
    const [who, title] = vkSong(c);
    return `<div class="iw-vk-status" title="Статус: сейчас играет. Меняется после каждого разбора дневника"><span class="iw-vk-status-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M9 17.5a3 3 0 1 1-2-2.83V5.6c0-.7.46-1.3 1.13-1.48l9-2.4A1.5 1.5 0 0 1 19 3.17v11.83a3 3 0 1 1-2-2.83V6.9l-8 2.13z"/></svg></span><span class="iw-vk-status-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="iw-vk-status-txt"><b>${esc(who)}</b> — ${esc(title)}</span><button type="button" class="iw-vk-status-x" data-iw-vkmusic="hide" title="Скрыть песню. Вернуть — в настройках оформления" aria-label="Скрыть песню">${icon('x')}</button></div>`;
}

export function renderCharacter(c, modules, theme, opts = {}) {
    REL_THEME = theme;
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who), bimboNicks(c.name, !!opts.first));
    if (opts.persona) {
        const pg = genderOf(c.g, c.name, c.who);
        L.attitude = `Как ${gw(pg, 'он', 'она', 'твой герой')} относится к ${gw(opts.botG, 'нему', 'ней', 'персонажу')}`;
    }
    FOLD = { collapsed: opts.collapsed || {}, drag: true };
    const blocks = [];
    if (modules.mood) blocks.push(renderMood(c, L, opts));
    if (modules.impression) blocks.push(renderAttitude(c, L, { attrBlock: !!modules.attraction, persona: !!opts.persona, relOf: opts.relOf }));
    if (modules.wants) blocks.push(renderWants(c, L));
    if (modules.fears) blocks.push(renderFears(c, L));
    if (modules.dream) blocks.push(renderDream(c, L, opts));
    if (modules.traits) blocks.push(renderTraits(c, L));
    if (modules.ptype !== false) blocks.push(renderPersona(c, L, opts));
    if (modules.attraction) blocks.push(renderAttraction(c, L, opts));
    if (modules.life !== false && !opts.persona && !opts.npc) blocks.push(renderLife(c, L));
    if (modules.chronicle) blocks.push(renderChronicle(c, L));
    if (opts.nights && !opts.npc) blocks.push(renderNights(c, !!opts.persona, L));
    if (Array.isArray(opts.rumors) && !opts.npc) blocks.push(renderRumors(opts.rumors, c.name, !!opts.persona, L));
    if (opts.memes && !opts.npc) blocks.push(renderMemes(opts.memes, L));
    // порядок блоков: свой (перетащила игрок) или обычный; хроника — в самом низу
    const order = orderOfBlocks(opts.blockOrder);
    const kindOf = h => (String(h || '').match(/class="iw-block iw-b-([a-z]+)/) || [])[1] || '';
    blocks.sort((a, b) => order.indexOf(kindOf(a)) - order.indexOf(kindOf(b)));
    const collapsed = FOLD.collapsed;
    FOLD = { collapsed: {} };
    return `${opts.key ? buffNotes(c, opts.key) : ''}<div class="iw-grid">${layoutBlocks(blocks, collapsed)}</div>`;
}

// Список НПС: встреченные — карточками, ещё не появлявшиеся — знаками вопроса.
// Плитка НПС: имя, настроение маркером, ниже приклеенный листочек «кто это»; всё на одних уровнях
function npcTile({ tag = 'button', cls = '', attrs = '', title = '', x = '', face = '', name = '', mood = '', moodMark = false, who = '', born = '', action = '' }) {
    const fullWho = String(who || '').replace(/\s+/g, ' ').trim();
    return `
      <${tag}${tag === 'button' ? ' type="button"' : ''} class="iw-npc ${cls}" ${attrs} title="${esc(title)}">
        ${x}<span class="iw-npc-face-wrap">${face}</span>
        <span class="iw-npc-body">
          <span class="iw-npc-top"><span class="iw-npc-name" title="${esc(name)}">${esc(name)}</span>${born || ''}</span>
          <span class="iw-npc-mood${moodMark ? ' iw-npc-mark' : ''}">${mood ? (moodMark ? ce(mood) : `<span class="iw-hl iw-hl-main">${ce(mood)}</span>`) : '&nbsp;'}</span>
          <span class="iw-npc-note${fullWho ? '' : ' empty'}" title="${esc(fullWho)}">${fullWho ? ce(fullWho) : '&nbsp;'}</span>
          ${action}
        </span>
      </${tag}>`;
}

export function renderNpcList({ state, npcKeys, roster, rosterBusy, avatarFor, seenOnly = [], personaName = '', personaG = 'n', clock = null, ignored = [] }) {
    const used = new Set();
    const cards = [];
    const heardCards = [];
    // сначала важные для сюжета, в конце — эпизодические
    const entryOf = k => (roster && roster.find ? roster.find(k) : null);
    const sorted = npcKeys.filter(k => state.characters[k]).map((k, i) => ({ k, i, w: npcWeight(state.characters[k], entryOf(k)) }))
        .sort((a, b) => b.w - a.w || a.i - b.i).map(x => x.k);
    for (const key of sorted) {
        const c = state.characters[key];
        const entry = roster && roster.find ? roster.find(key) : null;
        if (entry) used.add(entry.name);
        const who = (entry && entry.who) || c.who || '';
        const dead = isDead(c, entry);
        const deadMark = dead ? '<span class="iw-dead-mark" aria-hidden="true"></span>' : '';
        if (isHearsay(c)) {
            const g = genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, c.who || '');
            const who = c.who || ''; // только то, что знает персона, а не лорбук
            heardCards.push(npcTile({
                cls: `met iw-npc-heard${dead ? ' iw-dead' : ''}`, attrs: `data-iw-view="npc:${esc(key)}"`,
                title: dead ? `${c.name}: нет в живых` : `${personaName || 'Твой герой'} знает ${gw(g, 'его', 'её', 'его')} только понаслышке`,
                x: `${deadMark}<span class="iw-npc-x" data-iw-npcx="${esc(key)}" role="button" tabindex="0" title="Убрать из НПС" aria-label="Убрать ${esc(c.name)} из НПС">${icon('x')}</span>`,
                face: npcBadge(badgeInfo(c, entry)), name: c.name, mood: dead ? 'нет в живых' : 'понаслышке', moodMark: true, who,
            }));
            continue;
        }
        cards.push(npcTile({
            cls: `met${dead ? ' iw-dead' : ''}`, attrs: `data-iw-view="npc:${esc(key)}"`,
            title: dead ? `${c.name}: нет в живых` : `Открыть: ${c.name}`,
            x: `${deadMark}<span class="iw-npc-x" data-iw-npcx="${esc(key)}" role="button" tabindex="0" title="Убрать из НПС" aria-label="Убрать ${esc(c.name)} из НПС">${icon('x')}</span>`,
            face: `${npcBadge(badgeInfo(c, entry))}${dead ? '' : faceBadge(c, true)}`, name: c.name,
            mood: dead ? 'нет в живых' : (c.mood || ''), moodMark: dead, who,
            born: !dead && (c.born || c.ageAt || c.ageSaid) ? tabBorn(c, clock, key) : '',
        }));
    }
    for (const e of seenOnly) {
        used.add(e.name);
        const g = genderOf(e.g, e.name, e.who);
        const tip = (e.checked
            ? gw(g, 'О нём говорили, но лично он в сцене не появлялся.', 'О ней говорили, но лично она в сцене не появлялась.', 'Об этом персонаже говорили, но лично в сцене его не было.')
            : gw(g, 'Упоминался', 'Упоминалась', 'Был упомянут') + ' в этом чате, дневник его ещё не разбирал.')
            + ' Кнопка «разобрать» заведёт карточку: характер, желания, страхи, мечта. Отношение к тебе появится после встречи в сцене.';
        cards.push(npcTile({
            tag: 'div', cls: `seen${e.checked ? ' checked' : ''}`, title: tip,
            face: npcBadge(badgeInfo(e, e)), name: e.name,
            mood: e.checked ? gw(g, 'не появлялся в сцене', 'не появлялась в сцене', 'не появлялся в сцене') : 'Ещё не разобран', moodMark: true, who: e.who,
            action: `<button type="button" class="iw-npc-study" data-iw-npc-study="${esc(e.name)}" title="Завести карточку: характер, желания, страхи, мечта">${icon('rotate')}<span>разобрать</span></button>`,
        }));
    }
    const ign = new Set(ignored.map(n => String(n).toLowerCase()));
    const unknown = ((roster && roster.npc) || []).filter(e => !used.has(e.name) && !npcKeys.some(k => roster.find(k) === e) && !ign.has(String(e.name).toLowerCase()));
    // знакомые по карточке и лорбуку (родня, бывшие, друзья) — открыты сразу, их можно разобрать по кнопке
    const CLOSE_TIE = /сестр|брат|мать|мама|матер|отец|отч|пап|сын|доч|жена|муж|супруг|бывш|племян|дяд|тёт|тет|бабуш|дедуш|внук|внуч|кузен|кузин|друг|подруг|невест|жених|любим|родн|семь/i;
    const knownBefore = unknown.filter(e => e.relUser || (e.rel && CLOSE_TIE.test(`${e.rel} ${e.who || ''}`)));
    for (const e of knownBefore) {
        const g = genderOf(e.g, e.name, e.who);
        const tie = e.relUser ? `тебе — ${e.relUser}` : `знакомы с героем: ${e.rel}`;
        cards.push(npcTile({
            tag: 'div', cls: 'seen known', title: `${e.name}: ${tie}. В сцене ${gw(g, 'ещё не появлялся', 'ещё не появлялась', 'ещё не появлялся')}.`,
            face: npcBadge(badgeInfo(e, e)), name: e.name, mood: gw(g, 'ещё не появлялся', 'ещё не появлялась', 'ещё не появлялся'), moodMark: true, who: e.who,
            action: `<button type="button" class="iw-npc-study" data-iw-npc-study="${esc(e.name)}" title="Завести карточку заранее: характер, желания, страхи, мечта">${icon('rotate')}<span>разобрать</span></button>`,
        }));
    }
    const unknownTiles = unknown.filter(e => !knownBefore.includes(e)).map(() => `
      <span class="iw-npc-unknown" title="Ещё не было в сцене"><span class="iw-unknown-mark"></span></span>`).join('');
    const known = (roster && roster.npc && roster.npc.length) || 0;
    const studyLabel = known ? 'Изучить заново' : 'Изучить лорбук и карточку';
    return `
<div class="iw-npc-view">
  <div class="iw-npc-bar">
    <div class="iw-npc-bar-text">
      <span class="iw-label">Другие персонажи</span>
      <span class="iw-muted">${known ? `в лорбуке и карточке: ${known} · в дневнике: ${npcKeys.length}${seenOnly.filter(e => !e.checked).length ? ` · не разобраны: ${seenOnly.filter(e => !e.checked).length}` : ''}${seenOnly.filter(e => e.checked).length ? ` · не появлялись в сцене: ${seenOnly.filter(e => e.checked).length}` : ''}` : 'появляются здесь, когда приходят в сцену'}</span>
    </div>
    <button type="button" class="iw-study${rosterBusy ? ' busy' : ''}" data-iw-study="1"${rosterBusy ? ' disabled' : ''}>${icon(rosterBusy ? 'rotate' : 'scroll')}<span>${rosterBusy ? 'Изучаю…' : studyLabel}</span></button>
  </div>
  ${cards.length && heardCards.length ? `<div class="iw-group">${groupHead(`Знакомы лично${personaName ? ` с ${esc(personaName)}` : ''} · ${cards.length}`, 'встречались в сцене или знакомы до истории')}</div>` : ''}
  ${cards.length ? `<div class="iw-npc-grid">${cards.join('')}</div>` : (heardCards.length ? '' : unknown.length ? '<div class="iw-muted">Пока никто из них не появлялся в сцене.</div>' : '<div class="iw-empty">Пока никого. Нажми «Изучить лорбук и карточку» — и я узнаю, кто живёт в этом мире. В дневнике они появятся, когда придут в сцену.</div>')}
  ${heardCards.length ? `<div class="iw-group iw-group-heard">${groupHead(`${REL_THEME === 'vk' ? 'Возможно, вы знакомы' : 'Знает понаслышке'} · ${heardCards.length}`, `${personaName ? esc(personaName) : 'твой герой'} с ними лично не ${gw(personaG, 'встречался', 'встречалась', 'встречался')} — только ${gw(personaG, 'слышал', 'слышала', 'слышал')}: из рассказов, слухов, газет`)}<div class="iw-npc-grid">${heardCards.join('')}</div></div>` : ''}
  ${unknown.length ? `<div class="iw-group">${groupHead(`Ещё не встречались · ${unknown.length}`, 'появятся, когда придут в сцену')}<div class="iw-npc-unknowns">${unknownTiles}</div></div>` : ''}
  ${ignored.length ? `<div class="iw-group iw-group-ignored">${groupHead(`Забыты навсегда · ${ignored.length}`, 'дневник их не ведёт; стрелочка — вернуть')}<div class="iw-forget-ignored">${ignored.map(n => `<button type="button" class="iw-btn iw-forget-chip iw-unignore" data-iw-unignore="${esc(n)}" title="Вернуть: дневник снова будет замечать ${esc(n)}">${esc(n)} ${icon('undo')}</button>`).join('')}</div></div>` : ''}
</div>`;
}

// Подпись внизу дневника: версия, дата обновления и автор со ссылкой на телеграм-канал.
let SIGN_INFO = { version: '', updated: '' };
export function setSignInfo(version = '', updated = '') {
    SIGN_INFO = { version, updated };
}
// Внизу дневника — только маленькая подпись с версией в правом углу, чтобы подвал не закрывал записи.
function footHtml() {
    const { version, updated } = SIGN_INFO;
    return `<div class="iw-foot iw-foot-mini"><a class="iw-foot-ver" href="https://t.me/sillysloppy" target="_blank" rel="noopener" title="«Внутренний мир»${updated ? ` · обновлено ${esc(updated)}` : ''} · от Слоппи ♥">Внутренний мир${version ? ` v${esc(version)}` : ''}</a></div>`;
}

function signHtml() {
    const { version, updated } = SIGN_INFO;
    return `<span class="iw-foot-sign">«Внутренний мир»${version ? ` · v${esc(version)}` : ''}${updated ? ` · ${esc(updated)}` : ''} · от <a class="iw-sign-nick" href="https://t.me/sillysloppy" target="_blank" rel="noopener" title="Телеграм-канал: t.me/sillysloppy">Слоппи ♥</a></span>`;
}

// ---------- Часы и календарь сцены ----------
// clock — готовая модель от дневника: { cal, t, draft, view, time, part, date, today, upcoming, grid, locked, busy, … }
function clockEventText(e) {
    if (e.kind === 'birthday') return `${e.name} — день рождения${e.age ? ` (${e.inDays === undefined ? '' : 'исполнится '}${e.age})` : ''}`;
    if (e.kind === 'canon' && e.who) return `${e.who}: ${e.name}`;
    if (e.kind === 'anniv') return annivText(e);
    return e.name;
}

function clockWhen(e) {
    if (e.ongoing) return `идёт, ${e.ongoing}-й день`;
    return e.inDays === 0 ? 'сегодня' : (e.inDays === 1 ? 'завтра' : `через ${e.inDaysText}`);
}

// Листок отрывного календаря: число крупно, месяц коротко
function evDateBox(e) {
    const txt = String(e.dateText || '');
    const m = txt.match(/^([\d–-]+)\s+(.+)$/);
    // значок вида даты (торт, подарок, сердце) — уголком на самом листке, чтобы справа было больше места под название
    const ico = `<span class="iw-ev-ico iw-ev-corner" aria-hidden="true">${calIcon(e.kind)}</span>`;
    if (!m) return `<span class="iw-ev-date iw-ev-date-text">${esc(txt)}${ico}</span>`;
    const mon = m[2].split(/[\s–-]+/)[0];
    return `<span class="iw-ev-date"><b>${esc(m[1])}</b><i>${esc(mon.length > 4 ? mon.slice(0, 3) + '.' : mon)}</i>${ico}</span>`;
}

const EVENT_ICON = { birthday: 'cake', canon: 'feather', holiday: 'gift', anniv: 'heart' };
// в «Аське» у каждого вида даты свой смайлик, в остальных темах — свой рисунок
const calIcon = kind => (iconStyle() === 'icq' ? pictIcon(kind) : icon(EVENT_ICON[kind] || 'gift'));

// Свой выпадающий список в стиле темы (вместо системного): key — что меняем, options — [[значение, подпись, выбрано]].
function clockPick(key, label, options, cls = '') {
    return `<details class="iw-pick ${cls}"><summary class="iw-pick-sum"><span>${esc(label)}</span>${icon('chevron')}</summary><div class="iw-pick-list">${options.map(([v, t, on]) => `<button type="button" class="iw-pick-opt${on ? ' on' : ''}" data-iw-clock="${key}:${v}">${esc(t)}</button>`).join('')}</div></details>`;
}

const pad2 = n => String(n).padStart(2, '0');

export function renderClock(clock) {
    if (!clock) return '';
    if (!clock.t) {
        return `<div class="iw-clock iw-clock-empty">
  <span class="iw-clock-ico">${icon('clock')}</span>
  <span class="iw-muted">${clock.busy ? 'Определяю календарь и время по истории…' : 'Дата и время сцены встанут сами при разборе.'}</span>
</div>`;
    }
    const cal = clock.cal;
    const d = clock.draft;
    const today = (clock.today || []).map(e => `<span class="iw-clock-tag iw-clock-${e.kind}">${calIcon(e.kind)}<span>${esc(clockEventText(e))}</span></span>`).join('');
    let grid = '';
    if (clock.grid) {
        const g = clock.grid;
        const monthOpts = (clock.monthNames || []).map((n, i) => [i + 1, n, i + 1 === g.m]);
        grid = `
    <div class="iw-cal">
      <div class="iw-cal-nav">
        <button type="button" class="iw-mini" data-iw-clock="month:-1" aria-label="Прошлый месяц">${icon('chevron', 'iw-rot90')}</button>
        <div class="iw-cal-head">
          ${clockPick('vmonth', clock.monthNames[g.m - 1] || '', monthOpts, 'iw-pick-month')}
          <span class="iw-cal-year">
            <button type="button" class="iw-cal-ystep" data-iw-clock="year:-1" aria-label="Год назад">${icon('chevron', 'iw-rot90')}</button>
            <input type="number" class="iw-cal-yin" data-iw-clock-in="vy" value="${g.y}" aria-label="Год">
            <button type="button" class="iw-cal-ystep" data-iw-clock="year:1" aria-label="Год вперёд">${icon('chevron', 'iw-rot-90')}</button>
          </span>
        </div>
        <button type="button" class="iw-mini" data-iw-clock="month:1" aria-label="Следующий месяц">${icon('chevron', 'iw-rot-90')}</button>
      </div>
      ${cal.era ? `<div class="iw-cal-era-row">${esc(cal.era)}</div>` : ''}
      <table class="iw-cal-grid">
        ${g.heads.length ? `<thead><tr>${g.heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : ''}
        <tbody>${g.weeks.map(w => `<tr>${w.map(c => {
            if (!c) return '<td></td>';
            const isToday = g.y === clock.t.y && g.m === clock.t.m && c.d === clock.t.d;
            const isSel = g.y === d.y && g.m === d.m && c.d === d.d;
            const kinds = new Set(c.marks.map(x => x.kind));
            const title = c.marks.map(clockEventText).join(', ');
            const cls = ['iw-cal-day', isToday ? 'iw-cal-today' : '', isSel ? 'iw-cal-sel' : '', kinds.has('holiday') ? 'iw-cal-hol' : '', kinds.has('birthday') ? 'iw-cal-bday' : '', kinds.has('canon') || kinds.has('anniv') ? 'iw-cal-canon' : ''].filter(Boolean).join(' ');
            return `<td><button type="button" class="${cls}" data-iw-clock="day:${c.d}"${title ? ` title="${esc(title)}"` : ''}><span>${c.d}</span></button></td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>
      <div class="iw-cal-legend"><span class="iw-lg iw-lg-hol">праздник</span><span class="iw-lg iw-lg-canon">личная дата</span><span class="iw-lg iw-lg-bday">день рождения</span><span class="iw-lg iw-lg-today">сейчас в истории</span></div>
      <div class="iw-cal-doodles" aria-hidden="true"><i class="iw-dd iw-dd-a"></i><i class="iw-dd iw-dd-b"></i><i class="iw-dd iw-dd-c"></i></div>
    </div>`;
    } else {
        grid = `<div class="iw-cal iw-cal-days">
      <div class="iw-clock-sub">День истории</div>
      <span class="iw-cal-year iw-cal-dayno">
        <button type="button" class="iw-cal-ystep" data-iw-clock="dday:-1" aria-label="День назад">${icon('chevron', 'iw-rot90')}</button>
        <input type="number" class="iw-cal-yin" data-iw-clock-in="dd" value="${d.d}" min="1" aria-label="День истории">
        <button type="button" class="iw-cal-ystep" data-iw-clock="dday:1" aria-label="День вперёд">${icon('chevron', 'iw-rot-90')}</button>
      </span>
    </div>`;
    }
    const hours = Array.from({ length: 24 }, (_, h) => [h, pad2(h), h === d.h]);
    const mins = Array.from({ length: 12 }, (_, i) => [i * 5, pad2(i * 5), i * 5 === d.mi - (d.mi % 5)]);
    const changed = clock.draftChanged;
    // ближайшие праздники и личные даты: первые четыре видны сразу, остальные — «ещё»
    const evRow = e => `<li class="iw-clock-ev iw-ev2 iw-clock-${e.kind}${e.inDays === 0 ? ' iw-ev-now' : ''}" title="${esc([e.dateText, e.about].filter(Boolean).join(' — '))}">${evDateBox(e)}<span class="iw-ev-body"><span class="iw-ev-name"><span class="iw-ev-title">${esc(clockEventText(e))}</span></span>${e.about ? `<small>${esc(e.about)}</small>` : ''}</span><em class="iw-ev-in">${esc(clockWhen(e))}</em>${e.key ? `<button type="button" class="iw-mini iw-clock-x iw-ev-del" data-iw-clock="ev-del:${esc(encodeURIComponent(e.key))}" title="Убрать эту дату" aria-label="Убрать">${icon('x')}</button>` : ''}</li>`;
    const evAll = clock.upcoming || [];
    // справа — ближайшие; «ещё» раскрывается под календарём и часами двумя столбиками: правый продолжает список, слева добавляется
    const SHOWN = 3;
    const events = evAll.length ? `<ul class="iw-clock-events">${evAll.slice(0, SHOWN).map(evRow).join('')}</ul>${evAll.length > SHOWN ? `<button type="button" class="iw-clock-evtoggle${clock.evOpen ? ' on' : ''}" data-iw-clock="evmore" aria-expanded="${!!clock.evOpen}">${icon('chevron')}<span>${clock.evOpen ? 'Свернуть' : `Ещё ${evAll.length - SHOWN}`}</span></button>` : ''}` : '<p class="iw-muted iw-clock-noev">В ближайший год ничего не отмечено</p>';
    const evMore = evAll.length > SHOWN && clock.evOpen ? `<ul class="iw-clock-events iw-clock-evrest">${evAll.slice(SHOWN).map(evRow).join('')}</ul>` : '';
    const hols = (clock.holidays || []).map((h, i) => `<li class="iw-clock-${h.kind}"><span>${esc(h.dateText)} — ${esc(h.kind === 'canon' && h.who ? `${h.who}: ${h.name}` : h.name)}</span><button type="button" class="iw-mini iw-clock-x" data-iw-clock="hol-del:${h.idx ?? i}" title="Убрать" aria-label="Убрать">${icon('x')}</button></li>`).join('');
    return `
<details class="iw-clock"${clock.open ? ' open' : ''}>
  <summary class="iw-clock-bar" title="Часы и календарь сцены">
    <span class="iw-clock-ico">${icon('clock')}</span>
    <b class="iw-clock-time">${esc(clock.time)}</b>
    <span class="iw-clock-part">${esc(clock.part)}</span>
    <span class="iw-clock-date">${esc(clock.date)}</span>
    ${clock.wx ? `<span class="iw-clock-wx" title="${esc(clock.wx.title || '')}">${icon(clock.wx.icon)}<span>${esc(clock.wx.text)}</span></span>` : ''}
    ${today}

    <span class="iw-clock-chev">${icon('chevron')}</span>
  </summary>
  <div class="iw-clock-pop">
    <div class="iw-clock-cols">
      ${grid}
      <div class="iw-clock-side">
        <div class="iw-clock-sub">Время в истории</div>
        <div class="iw-clock-chosen${changed ? ' iw-changed' : ''}">${esc(clock.draftDate)}</div>
        <div class="iw-clock-row iw-clock-hm">
          ${clockPick('h', pad2(d.h), hours, 'iw-pick-grid iw-pick-h')}
          <b class="iw-clock-colon">:</b>
          ${clockPick('mi', pad2(d.mi), mins, 'iw-pick-grid iw-pick-mi')}
          <span class="iw-muted iw-clock-partof">${esc(clock.draftPart)}</span>
          <span class="iw-clock-applyrow">
            <button type="button" class="iw-btn iw-mini-btn iw-clock-apply" data-iw-clock="set"${changed ? '' : ' disabled'} title="Поставить это время и дату в истории" aria-label="Поставить">${icon('tick')}<span>Поставить</span></button>
            ${changed ? `<button type="button" class="iw-btn iw-mini-btn iw-clock-reset" data-iw-clock="reset" title="Вернуть как сейчас в истории" aria-label="Как было">${icon('back')}<span>Как было</span></button>` : ''}
          </span>
        </div>
        
        <div class="iw-clock-sub iw-clock-evhead"><span class="iw-doodle-mark" aria-hidden="true"></span>Праздники и личные даты<button type="button" class="iw-mini iw-clock-addbtn${clock.addOpen ? ' on' : ''}" data-iw-clock="add-open" title="${clock.addOpen ? 'Свернуть' : 'Добавить свою дату'}" aria-expanded="${!!clock.addOpen}">${icon(clock.addOpen ? 'minus' : 'plus')}</button></div>
        ${clock.addOpen ? `<div class="iw-clock-add">
          <input type="text" class="iw-input" data-iw-clock-in="hname" maxlength="60" placeholder="Название — или «Кассиан: годовщина»">
          <div class="iw-clock-add-row"><input type="number" class="iw-input iw-clock-add-d" data-iw-clock-in="hd" min="1" max="31" placeholder="число">${(clock.monthNames && clock.monthNames.length) ? `<select class="iw-input" data-iw-clock-in="hm">${clock.monthNames.map((n, i) => `<option value="${i + 1}"${i + 1 === Number(clock.holMonth) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}<button type="button" class="iw-btn iw-mini-btn" data-iw-clock="hol-add">${icon('plus')}<span>Добавить</span></button></div>
          <div class="iw-muted iw-clock-add-hint">Праздник для всех — просто название. Личная дата героя — «Имя: что за дата».</div>
        </div>` : ''}
        ${events}
        <button type="button" class="iw-btn iw-mini-btn iw-clock-redo${clock.busy ? ' busy' : ''}" data-iw-clock="detect"${clock.busy ? ' disabled' : ''} title="Заново составить календарь по карточке и лорбуку: месяцы, дни недели и праздники под сеттинг. Дата и время в истории останутся, свои праздники — тоже">${icon(clock.busy ? 'rotate' : 'dice')}<span>${clock.busy ? 'Составляю…' : 'Пересобрать календарь'}</span></button>
      </div>
      ${evMore}
    </div>
  </div>
</details>`;
}

export function renderPanel({ state, settings, theme, view, busy, busyKind = '', dreamBusy = false, shopBusy = false, status, avatarFor, mains, npcKeys, persona = null, roster, rosterBusy, seenOnly = [], noChat = false, settingsHtml = '', books = [], picked = [], linked = [], working = false, off = [], live = null, attrMode = 'likes', attrOpen = false, attrMore = {}, mobile = false, clock = null, nextIn = 0, showcase = null, ignored = [], giftTo = 'owner', love = null, rumors = null, memes = null, nights = true, wishBusy = '', histOpen = {}, carDir = '' }) {
    REL_THEME = theme;
    HIST_OPEN = histOpen || {};
    CAL_NOW = clock && clock.cal ? clock.cal : null;
    MULTI_NOW = !!(roster && roster.multi);
    WISH_BUSY = wishBusy || '';
    LOVE = love;
    NEXT_IN = nextIn;
    // showcase: { got, sel, fresh } — витрина этого чата
    CASE_BTN = showcase && !noChat ? { on: view === 'showcase', fresh: showcase.fresh || 0 } : null;

    setIconTheme(theme);
    const L = themeLabels(theme, 'm');
    // дневники, записанные до «настроения как в Симс», пересчитываем при первом показе
    for (const c of Object.values((state && state.characters) || {})) if (c && !c.moodCalc && Array.isArray(c.moodlets)) settleMood(c);
    if (view === 'settings') {
        return `
<div class="iw-book">
  <div class="iw-float-close"><button type="button" class="iw-close iw-close-float" title="Закрыть дневник" aria-label="Закрыть дневник">${icon('x')}</button></div>
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, true)}
  <div class="iw-settings-head"><span class="iw-label">${esc(L.settings)}</span><button type="button" class="iw-back iw-gear">${icon('back')}<span>к дневнику</span></button></div>
  <div class="iw-body">${settingsHtml}</div>
</div>`;
    }
    if (noChat) {
        return `
<div class="iw-book">
  <div class="iw-float-close"><button type="button" class="iw-close iw-close-float" title="Закрыть дневник" aria-label="Закрыть дневник">${icon('x')}</button></div>
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, false)}
  <div class="iw-body"><div class="iw-empty">${esc(L.noChat)}</div></div>
  ${footHtml()}
</div>`;
    }
    const opts = { manualTurns: settings.moodMode === 'manual' ? settings.moodTurns : null, dreamBusy, points: settings.points !== false, attrMode, attrOpen, attrMore, collapsed: settings.collapsed || {}, blockOrder: settings.blockOrder || null };
    const showNpc = settings.showNpc !== false;
    let body;
    let current = null;
    let topStatus = '';
    let personaNote = false;
    // пока дневник ни разу не заполнялся — на всех вкладках (персонаж, НПС, твой герой) одна и та же подсказка
    const diaryEmpty = !(state.order || []).some(k => state.characters[k]);
    if (view === 'showcase' && showcase) {
        body = renderShowcase({ state, theme, got: showcase.got || [], sel: showcase.sel || '', fold: showcase.fold || {}, art: showcase.art !== false, artBusy: showcase.artBusy || '', view: showcase.view || 'list' });
    } else if (diaryEmpty && /^(main:|npc|me:)/.test(view)) {
        body = renderWaiting(mains[0] || '', settings, theme, roster);
    } else if (view === 'npc' && showNpc) {
        const pc0 = persona && state.characters[persona.key];
        body = renderNpcList({ state, npcKeys, roster, rosterBusy, avatarFor, seenOnly, personaName: (persona && persona.name) || '', personaG: genderOf(pc0 && pc0.g, (persona && persona.name) || '', ''), clock, ignored });
    } else if (view.startsWith('npc:') && showNpc && state.characters[view.slice(4)] && (isHearsay(state.characters[view.slice(4)]) || isDead(state.characters[view.slice(4)], roster && roster.find ? roster.find(view.slice(4)) : null))) {
        const key = view.slice(4);
        const c = state.characters[key];
        const entry = roster && roster.find ? roster.find(key) : null;
        current = key;
        const LL = themeLabels(theme, genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, (entry && entry.who) || c.who || ''));
        const hearsay0 = isHearsay(c);
        // знакомый понаслышке: «кто это» — только то, что знает персона, без лорбука
        const who = hearsay0 ? (c.who || '') : ((entry && entry.who) || c.who || '');
        const g = genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, who);
        const pName = (persona && persona.name) || 'твой герой';
        const pc0 = persona && state.characters[persona.key];
        const pg = genderOf(pc0 && pc0.g, (persona && persona.name) || '', '');
        const mainName = (mains[0] && state.characters[mains[0]] && state.characters[mains[0]].name) || mains[0] || '';
        const aliases = shownAliases(entry);
        const heard = c.heard || [];
        const dead = isDead(c, entry);
        const hearsay = isHearsay(c);
        const why = dead
            ? `${esc(c.name)} нет в живых, поэтому настроения, желаний и отношения здесь нет — только память о ${gw(g, 'нём', 'ней', 'нём')}.`
            : `${esc(pName)} с ${gw(g, 'ним', 'ней', 'ним')} лично не ${gw(pg, 'встречался', 'встречалась', 'встречался')}, поэтому отношения к тебе здесь нет. Когда они познакомятся в сцене, дневник заведёт полную запись — или заведи её сейчас: характер, желания, страхи, мечта.`;
        body = `${roster && roster.multi && !c.dead ? `<div class="iw-multi-bar iw-multi-npc">${icon('users')}<span>Персонаж мультибота · сейчас в НПС</span><button type="button" class="iw-mini-btn iw-btn" data-iw-promote="${esc(key)}" title="Сделать ${esc(c.name)} главным героем: встанет в карусель наверху, с полным дневником">${icon('star')}<span>сделать главным</span></button></div>` : ''}
<button type="button" class="iw-back iw-back-npc" data-iw-view="npc">${icon('back')}<span>все НПС</span></button>
<section class="iw-dossier iw-dossier-tight iw-dossier-heard${dead ? ' iw-dead' : ''}">
  <span class="iw-tape" aria-hidden="true"></span>
  ${dead ? '<span class="iw-dead-mark iw-dead-mark-lg" aria-hidden="true"></span>' : ''}
  <div class="iw-dossier-face">${npcBadge(badgeInfo(c, entry), 'iw-badge-lg')}</div>
  <div class="iw-dossier-main">
    <div class="iw-npc-title${nameFit(c.name)}">${esc(c.name)}</div>
    ${aliases.length ? `<div class="iw-npc-aka">Ещё зовут: ${esc(aliases.join(', '))}</div>` : ''}
    <div class="iw-dossier-meta">${dead ? `<span class="iw-heard-chip iw-dead-chip">${icon('feather')}<span>нет в живых</span></span>` : ''}${hearsay ? `<span class="iw-heard-chip" title="${esc(pName)} и ${esc(c.name)} лично не встречались: ${esc(pName)} знает о ${gw(g, 'нём', 'ней', 'нём')} только по рассказам">${icon('feather')}<span>лично не знакомы — ${esc(pName)} знает понаслышке</span></span>` : ''}</div>
    <div class="iw-whois">
      <span class="iw-whois-tag">${esc(LL.whois)}</span>
      <div class="iw-whois-text">${who ? ce(who) : `<span class="iw-muted">${hearsay ? `${esc(pName)} знает только имя` : 'Пока неизвестно'}</span>`}</div>
      ${!hearsay && entry && entry.rel && mainName ? `<div class="iw-whois-traits"><span class="iw-muted">Связь:</span> ${esc(entry.rel)} · ${esc(mainName)}</div>` : ''}
    </div>
  </div>
</section>
<div class="iw-grid"><section class="iw-block iw-b-heard">
  <div class="iw-block-head"><span class="iw-label">Что ${esc(pName)} о ${gw(g, 'нём', 'ней', 'нём')} знает</span></div>
  ${heard.length ? `<ul class="iw-heard-list">${heard.map((h, i) => `<li><span>${ce(h.fact)}</span>${h.from ? `<small class="iw-muted">${esc(h.from)}</small>` : ''}<button type="button" class="iw-mini iw-heard-x" data-iw-del="heard:${i}" title="Убрать: ${esc(pName)} этого не знает" aria-label="Убрать">${icon('x')}</button></li>`).join('')}</ul>` : `<p class="iw-muted">Пока только имя: подробностей ${esc(pName)} не ${gw(pg, 'слышал', 'слышала', 'слышал')}.</p>`}
  <p class="iw-muted iw-heard-note">${why}</p>
  <div class="iw-heard-acts">
    ${hearsay ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-npc-study="${esc(c.name)}" title="Дневник прочитает карточку, лорбук и чат и заполнит полную запись: характер, желания, страхи, мечта. Отношение к тебе появится после встречи">${icon('feather')}<span>Заполнить ${gw(g, 'его', 'её', 'его')} дневник</span></button><button type="button" class="iw-btn iw-mini-btn" data-iw-met="${esc(key)}:1" title="${esc(pName)} и ${esc(c.name)} уже встречались — дневник станет обычным, с отношением к тебе">${icon('tick')}<span>Они знакомы лично</span></button>` : ''}
    ${dead ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-dead="${esc(key)}:0">${icon('back')}<span>${gw(g, 'Он жив', 'Она жива', 'Жив')}</span></button>` : ''}
  </div>
</section></div>`;
    } else if (view.startsWith('npc:') && showNpc && state.characters[view.slice(4)]) {
        const key = view.slice(4);
        const c = state.characters[key];
        const entry = roster && roster.find ? roster.find(key) : null;
        current = key;
        const LL = themeLabels(theme, genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, (entry && entry.who) || c.who || ''));
        const who = (entry && entry.who) || c.who || '';
        const loreTraits = (entry && entry.traits) || [];
        const aliases = shownAliases(entry);
        body = `
<button type="button" class="iw-back iw-back-npc" data-iw-view="npc">${icon('back')}<span>все НПС</span></button>
${roster && roster.multi && !c.dead ? `<div class="iw-multi-bar iw-multi-npc">${icon('users')}<span>Персонаж мультибота · сейчас в НПС</span><button type="button" class="iw-mini-btn iw-btn" data-iw-promote="${esc(key)}" title="Сделать ${esc(c.name)} главным героем: встанет в карусель наверху, с полным дневником">${icon('star')}<span>сделать главным</span></button></div>` : ''}
<section class="iw-dossier iw-dossier-tight">
  <span class="iw-tape" aria-hidden="true"></span>
  <div class="iw-dossier-face">${npcBadge(badgeInfo(c, entry), 'iw-badge-lg')}</div>
  <div class="iw-dossier-main">
    <div class="iw-npc-title${nameFit(c.name)}">${esc(c.name)}${titleFace(c)}</div>
    ${aliases.length ? `<div class="iw-npc-aka">Ещё зовут: ${esc(aliases.join(', '))}</div>` : ''}
    <div class="iw-dossier-meta">${c.mood ? `<span class="iw-dossier-mood">${esc(LL.moodLead)} <span class="iw-hl iw-hl-main">${esc(c.mood)}</span></span>` : ''}${tabBorn(c, clock, key)}</div>
    <div class="iw-whois">
      <span class="iw-whois-tag">${esc(LL.whois)}</span>
      <div class="iw-whois-text">${who ? ce(who) : '<span class="iw-muted">Пока неизвестно</span>'}</div>
      ${loreTraits.length ? `<div class="iw-whois-traits"><span class="iw-muted">${esc(LL.whoisTraits)}:</span> ${esc(loreTraits.join(', '))}</div>` : ''}
    </div>
    <div class="iw-dossier-acts"><button type="button" class="iw-heard-toggle" data-iw-dead="${esc(key)}:1" title="Отметить, что ${esc(c.name)} нет в живых: карточка станет серой, настроение и желания уберутся">нет в живых?</button>${persona ? `<button type="button" class="iw-heard-toggle" data-iw-met="${esc(key)}:0" title="Если ${esc(persona.name)} и ${esc(c.name)} лично не встречались — дневник оставит только то, что о ${esc(c.name)} слышно">не знакомы лично?</button>` : ''}</div>
  </div>
</section>
${renderCharacter(c, settings.modules, theme, Object.assign({ key, npc: true }, opts))}`;
    } else if (view.startsWith('me:')) {
        const key = view.slice(3);
        const pc = key && state.characters[key];
        const bot = mains[0] && state.characters[mains[0]];
        const botName = (bot && bot.name) || mains[0] || '';
        const botG = genderOf(bot && bot.g, botName, bot && bot.who);
        if (pc) {
            current = key;
            personaNote = true;
            body = `${renderCharacter(pc, settings.modules, theme, Object.assign({ key, persona: true, botName, botG, rumors, memes, nights, relOf: bot || null }, opts))}`;
            if (settings.vkMusic !== false) topStatus = vkStatus(pc);
        } else {
            body = `<div class="iw-waiting"><div class="iw-waiting-text"><p>${(() => { const pg = genderOf('n', (persona && persona.name) || '', ''); const his = gw(pg, 'его', 'её', 'его'); return `Дневник твоего героя заполнится после следующего разбора: ${his} настроение, желания, страхи, мечта, черты и то, как ${gw(pg, 'он', 'она', 'герой')} относится к ${gw(botG, 'нему', 'ней', 'персонажу')}${botName ? ` (${esc(botName)})` : ''}.`; })()} Описание персоны и её лорбук дневник прочитает при «Лорбук» и «Всё сразу».</p>${(() => {
                // персону сменили посреди истории: прежний герой игрока остаётся в дневнике обычным персонажем
                const prev = state.order.map(k => state.characters[k]).find(x => x && (x.persona || x.wasPersona) && x.name && !(persona && persona.name && String(x.name).toLowerCase() === String(persona.name).toLowerCase()));
                return prev ? `<p class="iw-muted">Похоже, ты сменила персону. ${esc(prev.name)} остаётся в дневнике обычным персонажем — среди НПС, а у новой персоны${persona && persona.name ? ` — ${esc(persona.name)} —` : ''} будет свой дневник. Вернёшься к прежней персоне — её дневник продолжится с того же места.</p>` : '';
            })()}<p class="iw-muted">Он только для тебя: на ответы бота не влияет. Выключить можно в настройках, раздел «Главное».</p></div></div>`;
        }
    } else if (view.startsWith('shop:') && state.characters[view.slice(5)]) {
        const key = view.slice(5);
        const pKey = (persona && persona.key) || null;
        body = renderShop(state.characters[key], theme, key, { shopBusy, purse: settings.points !== false ? purseOf(state) : null, personaName: (persona && persona.name) || '', personaOwned: pKey ? (state.characters[pKey].collection || []).map(x => x.title) : [], buyOne: settings.buyOne !== false });
    } else if (view.startsWith('main:') && state.characters[view.slice(5)]) {
        current = view.slice(5);
        body = renderCharacter(state.characters[current], settings.modules, theme, Object.assign({ key: current, first: current === mains[0], rumors, memes, nights }, opts));
        if (settings.vkMusic !== false) topStatus = vkStatus(state.characters[current]);
        if (roster && roster.multi) body = `<div class="iw-multi-bar">${icon('users')}<span>Главный герой мультибота</span><button type="button" class="iw-mini-btn iw-btn" data-iw-demote="${esc(current)}" title="Перенести ${esc(state.characters[current].name)} в НПС: вкладка уйдёт, дневник сохранится">в НПС</button></div>${body}`;
    } else if (view.startsWith('main:')) {
        body = renderWaiting(view.slice(5), settings, theme, roster);
    } else {
        body = `<div class="iw-empty">${esc(L.empty)}</div>`;
    }
    if (roster && roster.multi && roster.at && !roster.picked && /^(main:|npc)/.test(view)) body = renderMainsPick(state, roster, mains) + body;
    const shopKey = settings.points !== false
        ? (view.startsWith('shop:') ? view.slice(5) : (current && state.characters[current] && !state.characters[current].persona && mains.includes(current) ? current : (mains.find(k => state.characters[k]) || null)))
        : null;
    const wallet = settings.points !== false
        ? { current: shopKey, purse: purseOf(state), list: state.order.filter(k => state.characters[k] && !state.characters[k].persona && (mains.includes(k) || (state.characters[k].points || 0) > 0)).map(k => ({ key: k, name: state.characters[k].name, points: state.characters[k].points || 0 })) }
        : null;
    const npcInfo = showNpc ? { met: npcKeys.length, known: (roster && roster.npc && roster.npc.length) || 0 } : null;
    return `
<div class="iw-book">
  <div class="iw-float-close"><button type="button" class="iw-close iw-close-float" title="Закрыть дневник" aria-label="Закрыть дневник">${icon('x')}</button></div>
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, false, wallet, shopKey ? { key: shopKey, on: view.startsWith('shop:') } : null, mobile ? analyzeButtons(busyKind, L, books, picked, linked, working || !!busyKind, off, !!persona) : '')}
  ${ROUGH_FILTER}
  ${renderTabs({ state, mains, view, avatarFor, npc: npcInfo, busyKind, persona, labels: L, books, picked, linked, working, off, noActs: mobile, clock: clock && clock.t ? clock : null, customOrder: Array.isArray(settings.blockOrder) && settings.blockOrder.length > 0, carDir })}
  <div class="iw-body${live && !live.hidden ? ' iw-live-on' : ''}">${live && !live.hidden ? renderLive(live, theme, L) : ''}${live && live.hidden ? livePeek(live) : ''}${topStatus}${renderClock(clock)}${body}</div>
  ${footHtml()}
</div>`;
}

// Свёрнутый листок: маленький ярлычок, по нажатию листок возвращается.
function livePeek(live) {
    const secs = Math.round((Date.now() - live.t0) / 1000);
    return `<div class="iw-live iw-live-mini"><button type="button" class="iw-live-peek" data-iw-live-show title="Вернуть листок">${icon('feather')}<span>Пишу дневник · <span class="iw-live-secs">${secs}</span> с</span><span class="iw-live-dots" aria-hidden="true"><i></i><i></i><i></i></span></button></div>`;
}

// Живой листок, пока модель пишет дневник: этап, секунды, что уже готово. За ним — размытый черновик.
// Симс: смешные подсказки на листке разбора, сменяются каждые несколько секунд (свои, в духе загрузочных экранов)
export const SIMS_TIPS = [
    'Пересчитываем бабочек в животе…',
    'Взбиваем подушки для ночных снов…',
    'Ищем, куда герой спрятал свои страхи…',
    'Подметаем крошки от недосказанностей…',
    'Совет: не оставляйте НПС одних надолго — они начинают сплетничать.',
    'Полируем кристалл настроения…',
    'Сверяем желания с семейным бюджетом…',
    'Совет: если персонаж грустит, поговорите с ним. Или подарите кота.',
    'Раскладываем эмоции по полочкам…',
    'Учим черты характера вести себя прилично…',
    'Поливаем мечту жизни…',
    'Совет: чем дольше история, тем гуще слухи.',
    'Договариваемся с совестью персонажа…',
    'Заводим часы сюжета…',
    'Распутываем любовный треугольник…',
    'Выдаём НПС их маленькие мечты…',
    'Проверяем, не пригорел ли ужин в сцене…',
    'Подбираем подарок, который точно не передарят…',
    'Совет: страхи сами не уходят — их нужно прожить.',
    'Перекладываем воспоминания из коробки в коробку…',
    'Считаем, сколько раз он на тебя посмотрел…',
    'Совет: слишком много драмы утомляет даже героев.',
    'Подкручиваем шкалу симпатии…',
    'Сушим слёзы после прошлой сцены…',
    'Генерируем неловкую паузу…',
    'Прячем дневник от любопытных НПС…',
    'Совет: лучшее время для признания — когда никто не ждёт.',
    'Будим вдохновение. Оно просило ещё пять минут…',
    'Расставляем мебель в чертогах разума…',
    'Совет: желания сбываются чаще, если их записать.',
];
export const simsTipAt = (t0, now = Date.now()) => SIMS_TIPS[(Math.floor(((Number(t0) || 0) / 1000) % SIMS_TIPS.length) + Math.floor((now - (Number(t0) || now)) / 4500)) % SIMS_TIPS.length];

const LIVE_STEPS = ['prep', 'think', 'write', 'done'];
const fmtTok = n => (Number(n) || 0).toLocaleString('ru-RU');
function renderLive(live, theme, L) {
    const prepText = { chat: 'Листаю последние сообщения', catchup: 'Листаю историю чата', lore: 'Читаю карточку и лорбуки', all: 'Читаю карточку, лорбуки и чат', roster: 'Ищу, кто живёт в этом мире', rewards: 'Дневник записан' }[live.kind] || 'Собираю, что было';
    const steps = [
        ['prep', prepText],
        ['think', live.thinking ? 'Модель размышляет' : 'Модель думает'],
        ['write', live.kind === 'roster' ? 'Модель составляет список' : (live.kind === 'rewards' ? 'Подбираю награды в лавку' : 'Модель пишет дневник')],
        ['done', 'Раскладываю по страницам'],
    ];
    const at = Math.max(0, LIVE_STEPS.indexOf(live.stage));
    const secs = Math.round((Date.now() - live.t0) / 1000);
    const delay = `style="animation-delay:-${((Date.now() - live.t0) / 1000).toFixed(2)}s"`;
    const list = steps.map(([k, text], i) => `<li class="iw-live-step${i < at ? ' done' : (i === at ? ' now' : '')}"><span class="iw-live-dot" aria-hidden="true">${i < at ? icon('tick') : ''}</span><span>${esc(text)}${i === at ? '<span class="iw-live-dots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</span></li>`).join('');
    // календарь и время истории узнаются параллельно с разбором — отдельной строкой
    const calStep = live.calendar ? `<li class="iw-live-step${live.calendar === 'done' ? ' done' : ' now'}"><span class="iw-live-dot" aria-hidden="true">${live.calendar === 'done' ? icon('tick') : ''}</span><span>Узнаю календарь и время истории${live.calendar === 'done' ? '' : '<span class="iw-live-dots" aria-hidden="true"><i></i><i></i><i></i></span>'}</span></li>` : '';
    const chars = (live.chars || []).map(c => `<li class="iw-live-char"><b>${esc(c.name)}</b>${c.mood ? ` <span class="iw-muted">— ${esc(c.mood)}</span>` : ''}${c.parts.length ? `<span class="iw-live-parts">${c.parts.map(p => `<span class="iw-live-part">${esc(p)}</span>`).join('')}</span>` : ''}</li>`).join('');
    return `
    <div class="iw-live" role="status" aria-live="polite">
      <div class="iw-live-card" ${delay}>
        <span class="iw-tape" aria-hidden="true"></span>
        <div class="iw-live-head">
          ${theme === 'vk' ? `<span class="iw-vk-st iw-vk-sheet iw-vk-st-${VK_LOAD.sheet}" aria-hidden="true"></span>` : ''}${theme === 'sims' ? `<span class="iw-sims-spin" ${delay} aria-hidden="true"></span>` : ''}<span class="iw-live-title">${esc(L.analyzing || 'Записываю')}</span>
          ${theme === 'icq' ? `<div class="iw-runner" aria-hidden="true"><span class="iw-runner-go" ${delay}>${smileHtml('cw', 'iw-play')}</span></div>` : ''}
          <span class="iw-live-time"><span class="iw-live-secs">${secs}</span> с</span>
          <button type="button" class="iw-mini iw-mini-stop iw-live-stop" data-iw-stop title="Остановить: модель перестанет думать и писать, дневник останется как был" aria-label="Остановить">${icon('stop')}</button>
          <button type="button" class="iw-mini iw-live-hide" data-iw-live-hide title="Свернуть листок: разбор продолжится" aria-label="Свернуть">${icon('x')}</button>
        </div>
        ${theme === 'sims' ? `<div class="iw-sims-tip" aria-hidden="true">${esc(simsTipAt(live.t0))}</div>` : ''}
        <svg class="iw-live-scribble" viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true"><path ${delay} d="M2 8c14-6 22 5 36 0s22-6 36 0 22 5 36 0 22-6 36 0 22 5 36 0 20-5 34 0"/></svg>
        <div class="iw-live-scroll">
          <ol class="iw-live-steps">${list}${calStep}</ol>
          ${chars ? `<ul class="iw-live-chars">${chars}</ul>` : ''}
        </div>
        ${live.est || live.len ? `<div class="iw-live-len iw-muted">${live.est ? `<span title="Примерно: русский текст — около 3 знаков на токен">Запрос ≈ ${fmtTok(live.est.prompt)} ток. · ответ до ${fmtTok(live.est.limit)}${live.est.auto ? ' (подобрано само)' : ''}</span>` : ''}${live.len ? `<span>Написано ~${Math.round(live.len / 5)} слов ≈ ${fmtTok(Math.round(live.len / 3.2))} ток.</span>` : ''}</div>` : ''}
      </div>
    </div>`;
}

// Всплывашка в стиле темы.
export function renderToast(ev, theme) {
    setIconTheme(theme);
    if (ev.type === 'achievement') {
        // в стиле темы, а цвет — по достоинству: бронза, серебро, золото
        const tier = ['bronze', 'silver', 'gold'].includes(ev.tier) ? ev.tier : 'bronze';
        return `
<div class="iw-toast-card iw-ev-achievement iw-ach-toast iw-tier-${tier}" role="status">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon iw-ach-medal">${achIcon(ev.icon)}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(toastKicker(theme, 'achievement', 'Достижение!'))}</div>
    <div class="iw-toast-who">${esc(ev.text)}</div>
    ${ev.desc ? `<div class="iw-toast-text">${esc(ev.desc)}</div>` : ''}
    <div class="iw-ach-tierline">${Array.from({ length: TIER_STARS[tier] }, () => icon('star')).join('')}<span>${esc(TIER_NAMES_RU[tier])}${ev.kind && ACH_KINDS[ev.kind] ? ` · ${esc(ACH_KINDS[ev.kind])}` : ''}</span></div>
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
    }
    const RK = { whisper: 'Шепчутся', report: 'Донесение', dialog: 'Подслушано', news: 'В газете', herald: 'Объявление', post: 'В сети', note: 'Записка' };
    const kicker = ev.type === 'rumor' && ev.rumor && RK[ev.rumor.form] ? RK[ev.rumor.form] : toastKicker(theme, ev.type, eventTitle(ev));
    return `
<div class="iw-toast-card iw-ev-${ev.type}" role="status">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon">${pictIcon(ev.icon || EVENT_ICONS[ev.type] || 'star')}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(kicker)}</div>
    <div class="iw-toast-who">${esc(ev.who)}</div>
    ${ev.type === 'rumor' && ev.rumor && ev.rumor.form ? `<div class="iw-toast-text iw-toast-rumor">${rumorBody(ev.rumor)}</div>` : (ev.type === 'meme' && ev.meme ? `<div class="iw-toast-text iw-toast-meme">${memeBody(ev.meme)}</div>` : `<div class="iw-toast-text">${ce(eventText(ev))}</div>`)}
    ${ev.points ? `<div class="iw-toast-points">+${esc(String(ev.points))} ${icon(currencyIcon(theme))}<span>${esc(themeLabels(theme, 'm').currency || '')}</span></div>` : ''}
    ${ev.claim ? `<div class="iw-toast-points iw-toast-claim">${icon('gift')}<span>Награда ждёт в дневнике: +${esc(String(ev.claim))}</span> ${icon(currencyIcon(theme))}</div>` : ''}
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
}

// Инфоблок над чатом: одна тонкая строка в стиле темы, по нажатию — подробности.
// model: { clock, cast: [{ name, mood, face, face2, feels: [{ e, w }] , persona }], show: { time, date, weather, events, moods } }
export function renderInfobarHtml(model, theme, open = false, tab = '') {
    setIconTheme(theme);
    const { clock, cast = [], show = {}, changes = [], rumor = null, meme = null } = model || {};
    // листочек: сверху крупно время (и значки справа), ниже мелко дата, погода и праздник, ещё ниже — герои по строке
    let top = '';
    const parts = [];
    if (!(clock && clock.t) && show.clockOn !== false && (show.time !== false || show.date !== false)) {
        top = `<span class="iw-ib-time iw-ib-notime" title="Дневник пока не понял, когда идёт сцена. Время появится, когда в истории прозвучит дата или время — или задай его в дневнике, над блоками.">${icon('clock')}<em>время сцены не определено</em></span>`;
    }
    if (clock && clock.t) {
        if (show.time !== false) top = `<span class="iw-ib-time">${icon('clock')}<b>${esc(clock.time)}</b><em>${esc(clock.part)}</em></span>`;
        if (show.date !== false) parts.push(`<span class="iw-ib-date">${esc(clock.date)}</span>`);
        if (show.weather !== false && clock.wx) parts.push(`<span class="iw-ib-wx"${clock.wx.title ? ` title="${esc(clock.wx.title)}"` : ''}>${icon(clock.wx.icon)}<span>${esc(clock.wx.text)}</span></span>`);
        if (show.events !== false && clock.today && clock.today.length) parts.push(`<span class="iw-ib-today">${calIcon(clock.today[0].kind)}<span>${esc(clockEventText(clock.today[0]))}${clock.today.length > 1 ? ` +${clock.today.length - 1}` : ''}</span></span>`);
    }
    const faces = show.moods !== false ? cast.filter(p => p.mood || p.rel).map(p => {
        const style = p.face2 ? ` style="--face-bg2: var(--fb-${p.face2}); --face-ink2: var(--fi-${p.face2})"` : '';
        const chip = `<span class="iw-ib-who iw-face-${esc(p.face || 'neutral')}${p.persona ? ' iw-ib-me' : ''}" title="${esc(`${p.name} — ${p.mood}`)}"${style}>${faceIcon(p.face || 'neutral', '', true)}<span class="iw-ib-name">${esc(ibShortName(p.name))}</span><span class="iw-ib-mood">${esc(p.mood)}</span></span>`;
        // справа от героя — его шкалы дружбы и романтики к тебе (ноль посередине, как в дневнике)
        const mini = (cls, ic, label, v) => {
            const n = Math.max(-100, Math.min(100, Math.round(Number(v) || 0)));
            const tone = n <= -10 ? 'neg' : (n < 10 ? 'mid' : 'pos');
            return `<span class="iw-ib-rel ${cls} iw-rel-${tone}" title="${esc(`${label}: ${n > 0 ? '+' + n : n}`)}">${icon(ic)}<span class="iw-ib-rlabel">${label}</span><span class="iw-ib-rtrack"><span class="iw-ib-rfill" style="left:${n < 0 ? 50 + n / 2 : 50}%;width:${Math.abs(n) / 2}%"></span></span><b>${n > 0 ? '+' + n : (n < 0 ? '−' + -n : '0')}</b></span>`;
        };
        const rel = show.rel !== false && p.rel ? `<span class="iw-ib-rels" data-who="${esc(ibShortName(p.name))}">${p.status ? `<span class="iw-ib-rstatus">${icon('heart')}<span>${esc(p.status)}</span></span>` : ''}${mini('iw-ib-rfr', 'handshake', 'Дружба', p.rel.friend)}${mini('iw-ib-rro', 'heart', 'Романтика', p.rel.romance)}</span>` : '';
        return { chip, rel };
    }) : [];
    // слева столбиком — кто как себя чувствует, справа столбиком — шкалы; оба столбика по центру друг друга
    const relCol = faces.map(x => x.rel).filter(Boolean);
    const castHtml = faces.length ? `<span class="iw-ib-cast${relCol.length ? ' iw-ib-cast2' : ''}"><span class="iw-ib-chips">${faces.map(x => x.chip).join('')}</span>${relCol.length ? `<span class="iw-ib-relcol${relCol.length > 1 ? ' iw-ib-relmany' : ''}">${relCol.join('')}</span>` : ''}</span>` : '';
    if (!top && !parts.length && !faces.length && !rumor && !meme) return '';
    // подробности: то, что есть в дневнике, коротко — настроение уже видно в строке, здесь не повторяем
    // развёрнуто: герои вкладками, у выбранного — по строке на раздел
    const chg = show.changes !== false ? changes : [];
    const CHG = { want: 'хочет', fear: 'боится', att: 'к тебе', trait: 'черта', life: 'брак и дети' };
    const chgLi = x => `<li class="iw-ib-chg-${esc(x.kind)}${x.sign === '−' || x.sign === '✓' ? ' iw-ib-chg-off' : ''}"><b class="iw-ib-sign">${esc(x.sign)}</b><span class="iw-ib-chg-kind">${esc(x.sign === '✓' ? 'сбылось' : (x.sign === '−' && x.kind === 'fear' ? 'страх ушёл' : CHG[x.kind] || ''))}</span><span class="iw-ib-txt" title="${esc(x.text)}">${esc(x.text)}</span></li>`;
    // «новое после ответа» — у каждого героя своё, во вкладке героя
    const people = cast.map(p => ({ p, rows: ibRows(p, show), chg: chg.filter(x => x.who === ibShortName(p.name)) })).filter(x => x.rows.length || x.chg.length);
    const cur = people.find(x => x.p.key === tab) || people[0];
    const soon = show.soon !== false && show.events !== false && clock && clock.upcoming ? clock.upcoming.filter(e => e.inDays > 0).slice(0, 3) : [];
    const evs = soon.map(e => `<span class="iw-ib-ev">${calIcon(e.kind)}<b>${esc(e.dateText)}</b> ${esc(clockEventText(e))} <em>${esc(clockWhen(e))}</em></span>`).join('');
    // слух и мем к этому ответу — отдельным рядом под героями
    const world = [];
    if (rumor) world.push(`<div class="iw-ib-sec iw-ib-rumor"><span class="iw-ib-sec-cap">${icon('chat')}Слух</span><span class="iw-ib-wtxt">${rumor.source || rumor.who ? `<b>${esc(rumor.source || rumor.who)}:</b> ` : ''}${esc(rumorPlainIb(rumor))}</span></div>`);
    if (meme) world.push(`<div class="iw-ib-sec iw-ib-memesec"><span class="iw-ib-sec-cap">${icon('joy')}Мем</span><div class="iw-ib-meme iw-meme iw-mf-${esc(meme.format || 'macro')}">${memePost(meme, memeBody(meme))}</div></div>`);
    const more = people.length || evs || world.length;
    let body = '';
    if (more && open) {
        const tabs = people.map(({ p, chg: pc }) => {
            const on = cur && p.key === cur.p.key;
            return `<button type="button" class="iw-ib-tab${on ? ' on' : ''}${people.length > 1 ? '' : ' solo'}${p.persona ? ' iw-ib-tab-me' : ''}" data-iw-ib-tab="${esc(p.key)}" aria-pressed="${on}"><span>${esc(ibShortName(p.name))}</span>${pc.length ? `<i class="iw-ib-tabnew" title="Новое после ответа: ${pc.length}">${pc.length}</i>` : ''}</button>`;
        }).join('<span class="iw-ib-tabsep" aria-hidden="true"></span>');
        body = `
<div class="iw-ib-more">
  ${cur ? `<div class="iw-ib-tabs${people.length === 2 ? ' iw-ib-tabs2' : ''}">${tabs}</div>
  ${cur.rows.length ? `<dl class="iw-ib-rows">${cur.rows.join('')}</dl>` : ''}
  ${cur.chg.length ? `<div class="iw-ib-sec iw-ib-chg"><span class="iw-ib-sec-cap" title="Что изменилось у ${esc(ibShortName(cur.p.name))} в дневнике после этого ответа">${icon('sparkle')}Новое после ответа</span><ul>${cur.chg.map(chgLi).join('')}</ul></div>` : ''}` : ''}
  ${evs ? `<div class="iw-ib-sec iw-ib-soon"><span class="iw-ib-sec-cap">${icon('calendar')}Скоро</span><span class="iw-ib-evs">${evs}</span></div>` : ''}
  ${world.length ? `<div class="iw-ib-world${world.length > 1 ? ' iw-ib-world2' : ''}">${world.join('')}</div>` : ''}
  ${cur ? `<div class="iw-ib-foot"><button type="button" class="iw-ib-open" data-iw-ib-open="${esc(cur.p.key)}">подробнее в дневнике ${icon('arrowright')}</button></div>` : ''}
</div>`;
    }
    const flags = `${rumor ? `<span class="iw-ib-flag" title="После этого ответа пошёл слух — разверни">${icon('chat')}</span>` : ''}${meme ? `<span class="iw-ib-flag" title="К этому ответу есть мем — разверни">${icon('joy')}</span>` : ''}`;
    const end = chg.length || more ? `<span class="iw-ib-end">${flags}${chg.length ? `<span class="iw-ib-chgcount" title="Изменилось в дневнике после этого ответа: ${chg.length}">${icon('sparkle')}${chg.length}</span>` : ''}${more ? `<span class="iw-ib-chev">${icon('chevron')}</span>` : ''}</span>` : '';
    return `<div class="iw-ib-note${open && body ? ' iw-open' : ''}">
<div class="iw-ib-bar${open ? ' iw-open' : ''}" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}" title="Внутренний мир: нажми — подробности">
  <span class="iw-ib-top">${top || '<span></span>'}${end}</span>
  ${parts.length ? `<span class="iw-ib-line">${parts.join('<span class="iw-ib-sep" aria-hidden="true"></span>')}</span>` : ''}
  ${castHtml}
</div>${body}</div>`;
}

// «пятница, 15 августа 1997» → «15 августа»
function ibDay(d) {
    return String(d || '').replace(/^[^,\d]+,\s*/, '').replace(/\s+\d{3,4}(\s*г\.?)?\s*$/, '').trim();
}

// Только то, что меняется по ходу истории (мечта, черты и вкусы — в дневнике).
// Строки раздела: подпись слева, одна запись справа в одну строку (целиком — в подсказке и в дневнике), остальные — «+N»
function ibRows(p, show) {
    const rows = [];
    const row = (cls, cap, items, lead = '', capTag = '') => {
        const list = (Array.isArray(items) ? items : [items]).map(t => String(t || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (!list.length && !lead && !capTag) return;
        const extra = list.length > 1 ? `<span class="iw-ib-plus" title="${esc(list.slice(1).join('\n'))}">+${list.length - 1}</span>` : '';
        rows.push(`<div class="iw-ib-row ${cls}"><dt class="iw-ib-cap"><span>${esc(cap)}</span>${capTag}</dt>${list[0] ? `<dd class="iw-ib-val" title="${esc(list[0])}">${lead}<span class="iw-ib-txt">${esc(list[0])}</span>${extra}</dd>` : ''}</div>`);
    };
    if (show.attitude && (!p.persona || p.attCap)) row('iw-ib-r-att', p.persona ? p.attCap : 'К тебе', p.attitude, '', p.chem ? `<b class="iw-ib-chem iw-ib-chem-${esc(p.chemTone || 'mid')}">${esc(p.chem)}</b>` : '');
    if (show.wants) row('iw-ib-r-wants', 'Хочет', p.wants);
    if (show.fears) row('iw-ib-r-fears', 'Боится', p.fears);
    if (show.night && p.night) row('iw-ib-r-night', 'Сон', p.night.text, p.night.date ? `<em class="iw-ib-when">${esc(ibDay(p.night.date))}</em>` : '');
    if (show.feels && p.feels && p.feels.length) row('iw-ib-r-feels', 'Чувства', p.feels.map(f => `${f.e}${f.why ? ` — ${f.why}` : ''}`));
    if (show.dream && p.dream) row('iw-ib-r-dream', 'Мечта', p.dream);
    if (show.traits && p.traits && p.traits.length) row('iw-ib-r-traits', 'Черты', p.traits.join(', '));
    if (show.life && p.life) row('iw-ib-r-life', 'Брак и дети', p.life);
    return rows;
}

export function ibShortName(n) {
    const w = String(n || '').trim().split(/\s+/);
    return w[0] || '';
}

// Сводка событий после разбора: верхние три строки видны сразу, остальные — по «подробнее».
export function renderGroupToast(items, theme) {
    setIconTheme(theme);
    const rows = items.map((ev, i) => `<li class="iw-group-row${i >= 3 ? ' iw-group-extra' : ''}" data-iw-ev="${i}"><span class="iw-group-ic">${pictIcon(ev.icon || EVENT_ICONS[ev.type] || 'star')}</span><span class="iw-group-line"><b>${esc(ev.who || '')}</b> <em>${esc(eventTitle(ev))}</em> ${ce(eventText(ev))}</span></li>`).join('');
    const more = items.length > 3 ? items.length - 3 : 0;
    const label = `подробнее · ещё ${more}`;
    const pts = items.reduce((n, ev) => n + (Number(ev.points) || 0), 0);
    return `
<div class="iw-toast-card iw-ev-${esc(items[0].type)} iw-toast-group" role="status">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon">${pictIcon(items[0].icon || EVENT_ICONS[items[0].type] || 'star')}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(toastKicker(theme, 'note', 'В дневнике'))}</div>
    <div class="iw-toast-who">${items.length} ${esc(plural(items.length, 'перемена', 'перемены', 'перемен'))}</div>
    <ul class="iw-group-list">${rows}</ul>
    ${more ? `<button type="button" class="iw-group-more" data-label="${esc(label)}">${esc(label)}</button>` : ''}
    ${pts ? `<div class="iw-toast-points">+${esc(String(pts))} ${icon(currencyIcon(theme))}<span>${esc(themeLabels(theme, 'm').currency || '')}</span></div>` : ''}
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
}

// Скетчевая стрелка «сюда»: в рисованных темах — от руки, в технических — ломаная линия.
const TECH_THEMES = ['cyber', 'logbook', 'dossier', 'noir'];
function sketchArrow(theme, cls = '') {
    const tech = TECH_THEMES.includes(theme);
    // в поле слева от шагов: от подсказки загибается вверх и показывает на кнопки над ней
    if (cls.includes('iw-arrow-long')) {
        const path = tech
            ? '<path d="M31 43H9V9h24"/><path d="M28 4l6 5-6 5"/>'
            : '<path d="M31 42c-9 3-19 1-22-7-3-9 0-19 7-24 5-3 11-4 17-3"/><path d="M27 3.5c3 1.4 5.3 3 6.8 4.8-2.2 1.3-4.6 3-6.4 5"/>';
        return `<svg class="iw-sketch-arrow ${cls}" viewBox="0 0 40 48" width="40" height="48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
    }
    const path = tech
        ? '<path d="M4 30h22V8"/><path d="M19 15l7-7 7 7"/>'
        : '<path d="M4 31c9 1 17-3 20-10s3-11 1-15"/><path d="M18 10c3-2 5-4 7-6 1 3 3 5 5 7"/>';
    return `<svg class="iw-sketch-arrow ${cls}" viewBox="0 0 38 36" width="38" height="36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

// Мультибот: кто из героев карточки главный. Отмеченные — вкладками наверху, остальные — в НПС.
function renderMainsPick(state, roster, mains) {
    const picked = Array.isArray(roster.pickedMain) ? roster.pickedMain : mains;
    const isOn = n => picked.some(x => String(x).toLowerCase() === String(n).toLowerCase());
    const seen = new Set();
    const list = [];
    const add = (name, who = '') => { const k = String(name || '').toLowerCase(); if (!name || seen.has(k)) return; seen.add(k); list.push({ name, who }); };
    for (const n of roster.main || []) add(n, 'главный по карточке');
    const rank = { key: 0, major: 1, minor: 2 };
    for (const e of (roster.npc || []).slice().sort((a, b) => (rank[a.role] ?? 1) - (rank[b.role] ?? 1)).slice(0, 18)) if (!e.dead) add(e.name, e.who || '');
    for (const k of state.order || []) { const c = state.characters[k]; if (c && !c.persona) add(k, c.who || ''); }
    return `
<section class="iw-block iw-mains-pick">
  <span class="iw-tape" aria-hidden="true"></span>
  <div class="iw-mains-head">${icon('users')}<b>Кто здесь главные герои?</b></div>
  <div class="iw-muted">Это мультибот: отметь героев, которых ведёт карточка. Они встанут вкладками наверху, остальные будут в НПС. Поменять можно в любой момент — кнопками «сделать главным» и «в НПС».</div>
  <div class="iw-mains-list">${list.map(x => `<button type="button" class="iw-qopt${isOn(x.name) ? ' on' : ''}" data-iw-mainpick="${esc(x.name)}" aria-pressed="${isOn(x.name)}" title="${esc(x.who)}">${isOn(x.name) ? icon('star') : ''}<span>${esc(x.name)}</span></button>`).join('')}</div>
  <div class="iw-mains-foot"><span class="iw-muted">Главных: ${picked.length}</span><button type="button" class="iw-btn iw-btn-main" data-iw-mainsave>${icon('check')}<span>Готово</span></button></div>
</section>`;
}

function quickOpt(key, value, label, on) {
    const l = String(label);
    return `<button type="button" class="iw-qopt${on ? ' on' : ''}" data-iw-quick="${esc(key)}:${esc(value)}" aria-pressed="${on}">${esc(l ? l[0].toUpperCase() + l.slice(1) : l)}</button>`;
}

// Пустой дневник: что нажать и быстрые настройки запаса прямо здесь, до первого разбора.
function renderWaiting(name, s, theme, roster) {
    const entry = roster && roster.find ? roster.find(name) : null;
    const g = genderOf(entry && entry.g, name, entry && entry.who);
    const him = gw(g, 'у него', 'у неё', 'у персонажа');
    const auto = s.budgetMode !== 'fixed';
    const caps = BUDGET_CAP_OPTIONS;
    const fixed = RESPONSE_LENGTH_OPTIONS;
    const budgetRow = auto ? tokenPick('budgetCap', s.budgetCap, caps) : tokenPick('responseLength', s.responseLength, fixed);
    return `
<div class="iw-waiting">
  <div class="iw-waiting-text">
    <p>Дневник ещё не заполнен. Отправь сообщение, и я запишу, что ${him} на душе. Или нажми кнопку разбора справа сверху:</p>
    <ul class="iw-waiting-list">
      <li><b>«Чат»</b> — прочитаю историю и восстановлю настроение, желания, страхи и отношение к тебе;</li>
      <li><b>«Лорбук»</b> — разберу карточку и лорбуки: основу характера, мечту, тип личности и НПС;</li>
      <li><b>«Всё сразу»</b> — сведу и то, и другое в одну картину.</li>
    </ul>
  </div>
  <section class="iw-quick">
    <div class="iw-quick-head"><span class="iw-label">Перед первым разбором</span><span class="iw-muted">Можно настроить прямо здесь</span></div>
    <div class="iw-quick-step iw-quick-multi">
      <span class="iw-quick-num">${icon('users')}</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Какая это карточка</div>
        <div class="iw-qrow"><button type="button" class="iw-qopt${roster && roster.multi ? '' : ' on'}" data-iw-multi="0" aria-pressed="${!(roster && roster.multi)}">Обычный бот</button><button type="button" class="iw-qopt${roster && roster.multi ? ' on' : ''}" data-iw-multi="1" aria-pressed="${!!(roster && roster.multi)}">Мультибот</button></div>
        <div class="iw-quick-hint"><span>${roster && roster.multi ? 'Мультибот: в карточке несколько главных героев (команда, экипаж, семья). После «Лорбука» выберешь, кто из них главный, а кто НПС, — и сможешь переносить их туда и обратно.' : 'Обычный бот: главный — персонаж карточки, остальные люди мира — НПС. Если в карточке целая команда героев, выбери «Мультибот».'}</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">1</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько токенов давать модели на ответ</div>
        <div class="iw-qrow">${quickOpt('budgetMode', 'auto', 'сам, по размеру сцены', auto)}${quickOpt('budgetMode', 'fixed', 'как я задам', !auto)}</div>
        <div class="iw-qrow iw-qrow-sub"><span class="iw-qlabel">${auto ? 'Потолок:' : 'На каждый ответ:'}</span>${budgetRow}</div>
        <div class="iw-quick-hint iw-hint-arrow">${sketchArrow(theme, 'iw-arrow-long')}<span>${auto ? 'Дневник сам считает, сколько нужно, и никогда не выходит за потолок. Платишь только за то, что модель написала.' : 'Каждый запрос получит ровно столько.'} Думающим моделям (Gemini 3, Claude 3.7 и новее) лучше от 16 000: часть запаса уходит на размышления. В меню — готовые значения или своё число.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">2</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько последних сообщений читать</div>
        <div class="iw-qrow">${CONTEXT_OPTIONS.map(v => quickOpt('contextMessages', v, String(v), Number(s.contextMessages) === v)).join('')}</div>
        <div class="iw-quick-hint"><span>Больше — точнее, но дороже. Обычно хватает 6.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">3</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Если чат уже идёт: сколько сообщений прочитать в первый раз</div>
        <div class="iw-qrow">${CATCHUP_OPTIONS.map(v => quickOpt('catchUpMessages', v, String(v), Number(s.catchUpMessages) === v)).join('')}</div>
        <div class="iw-quick-hint"><span>Разовый запрос при первом заполнении: ≈ ${catchUpTokens(s.catchUpMessages).toLocaleString('ru-RU')} токенов. Дальше дневник читает только последние сообщения.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">4</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько НПС вести в дневнике</div>
        <div class="iw-qrow">${[4, 8, 12, 20].map(v => quickOpt('npcLimit', v, String(v), Number(s.npcLimit ?? 12) === v)).join('')}${quickOpt('npcLimit', 99, 'все', Number(s.npcLimit) >= 99)}</div>
        <div class="iw-quick-hint"><span>${Number(s.npcLimit) >= 99 ? 'Разберу всех НПС из лорбука и чата.' : `Разберу до ${Number(s.npcLimit ?? 12)} НПС из лорбука и чата — самых важных: ключевых для сюжета и близких твоему герою, второстепенных — в последнюю очередь.`} Чем больше НПС, тем дольше думает модель и тем длиннее ответ. Если позже в чате появится кто-то из лорбука, он подтянется сам при разборе сообщения.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">5</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Что разбирать</div>
        <div class="iw-qrow iw-qmods">${MODULES.map(m => `<button type="button" class="iw-qopt${s.modules[m] !== false ? ' on' : ''}" data-iw-mod="${m}" aria-pressed="${s.modules[m] !== false}">${esc(MODULE_NAMES[m])}</button>`).join('')}${EXTRA_MODULES.map(([k, label]) => `<button type="button" class="iw-qopt${s[k] !== false ? ' on' : ''}" data-iw-mod-set="${k}" aria-pressed="${s[k] !== false}">${esc(label)}</button>`).join('')}</div>
        <div class="iw-quick-hint"><span>Выключенные блоки не разбираются и не тратят токены. Так и останутся выключенными, пока не включишь их в настройках.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">6</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Какая модель пишет дневник</div>
        <div class="iw-qrow">${quickOpt('source', 'main', 'та же, что в чате', s.source !== 'custom')}${quickOpt('source', 'custom', 'отдельная — настроить', s.source === 'custom')}</div>
        <div class="iw-qrow iw-qrow-sub"><span class="iw-qlabel">Сколько ей думать:</span>${quickOpt('thinking', 'low', 'коротко', s.thinking === 'low' || !s.thinking)}${quickOpt('thinking', 'medium', 'средне', s.thinking === 'medium')}${quickOpt('thinking', 'chat', 'как в чате', s.thinking === 'chat')}</div>
        <div class="iw-quick-hint"><span>Разбор — выписка из готового текста, долгие размышления ему не нужны. Думающие модели (Gemini 3 и 4 и похожие) иначе съедают весь запас, и запись обрывается.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">7</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Инфоблок в чате</div>
        <div class="iw-qrow">${quickOpt('infobar', 'on', 'добавлять', s.infobar !== false)}${quickOpt('infobar', 'off', 'не нужен', s.infobar === false)}</div>
        ${s.infobar !== false ? `<div class="iw-qrow iw-qrow-sub"><span class="iw-qlabel">Где:</span>${quickOpt('infobarWhere', 'all', 'в каждом ответе', s.infobarWhere !== 'last')}${quickOpt('infobarWhere', 'last', 'только в последнем', s.infobarWhere === 'last')}</div>` : ''}
        <div class="iw-quick-hint"><span>В начале ответа бота — тонкая плашка в стиле темы: время и дата сцены, погода, праздник, настроение героев. Только для тебя: в текст и в запрос к модели не попадает. Потом можно поменять в настройках, раздел «Инфоблок».</span></div>
      </div>
    </div>
    <div class="iw-quick-foot">
      <button type="button" class="iw-btn" data-iw-quick-open="connect">${icon('gear')}<span>Все настройки подключения</span></button>
      <span class="iw-quick-go">${sketchArrow(theme, 'iw-arrow-up')}<span>Готово? Жми «Всё сразу» справа сверху</span></span>
    </div>
  </section>
</div>`;
}

// Ошибка дневника: что случилось и что сделать — листиком в стиле темы.
export function renderErrorToast(info, theme) {
    setIconTheme(theme);
    return `
<div class="iw-toast-card iw-ev-fear_real iw-toast-error iw-err-${esc(info.kind)}" role="alert">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon">${icon('alert')}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(errorKicker(theme))}${info.what ? ` · ${esc(info.what)}` : ''}</div>
    <div class="iw-toast-who">${esc(info.title)}</div>
    <div class="iw-toast-text">${esc(info.text)}</div>
    ${info.hint ? `<div class="iw-toast-hint">${icon('pointer')}<span>${esc(info.hint)}</span></div>` : ''}
    ${info.settings ? '<div class="iw-toast-link">нажми, чтобы открыть настройки</div>' : ''}
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
}

// Папка расширения — для картинок (значок ВК на плавающей кнопке)
const FAB_IMG_BASE = (() => { try { return new URL('../', import.meta.url).href; } catch { return '/scripts/extensions/third-party/inner-world/'; } })();
// Кнопка-дневничок.
export function renderFab() {
    return `
<span class="iw-fab-book" aria-hidden="true">
  <span class="iw-fab-spine"></span>
  <span class="iw-fab-cover">${icon('heart', 'iw-fab-heart')}</span>
  <img class="iw-fab-app" src="${FAB_IMG_BASE}img/vk-fab.png" alt="" draggable="false">
  <img class="iw-fab-sims" src="${FAB_IMG_BASE}icons/sims/fab.webp" alt="" draggable="false">
  <svg class="iw-fab-flower" viewBox="0 0 64 64"><g fill="#6cc24a" stroke="#2f7a1f" stroke-width="2.2"><ellipse cx="32" cy="15" rx="9" ry="13" transform="rotate(0 32 32)"/><ellipse cx="32" cy="15" rx="9" ry="13" transform="rotate(72 32 32)"/><ellipse cx="32" cy="15" rx="9" ry="13" transform="rotate(144 32 32)"/><ellipse cx="32" cy="15" rx="9" ry="13" transform="rotate(216 32 32)"/><ellipse cx="32" cy="15" rx="9" ry="13" transform="rotate(288 32 32)"/></g><circle cx="32" cy="32" r="8" fill="#ffe36b" stroke="#2f7a1f" stroke-width="2.2"/></svg>
  <span class="iw-fab-ribbon"></span>
</span>
<span class="iw-fab-dot" hidden></span>`;
}
