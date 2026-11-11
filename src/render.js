// Разметка дневника и всплывашек. Только строки — без обращений к таверне.
import { settleMood, purseOf, isHearsay, isDead, npcWeight, moodletLeftLabel, WEIGHT_NAMES, WEIGHT_TURNS, eventTitle, eventText, signed, shownAliases, SHOWN_MOODLETS, FACE_NAMES, guessFace, moodFaces, plural, genderOf, gw, PTYPES, PTYPE_GROUPS, ptypeGroup, TEMPERS, ZODIAC, bornText, CHEM_NAMES, ATTRACT_CATALOG, CHEM_SCORE, CHEM_NOW_NAMES, chemLevelOf, CONTEXT_OPTIONS, CATCHUP_OPTIONS, catchUpTokens, BUDGET_CAP_OPTIONS, RESPONSE_LENGTH_OPTIONS } from './core.js';
import { ageNow } from './clock.js';
import { themeLabels, EVENT_ICONS, BLOCK_ICONS, toastKicker, errorKicker, icon, faceIcon, currencyIcon, bimboNicks, setIconTheme } from './themes.js';
import { npcBadge } from './npc-icons.js';
import { collectionOf, TIER_NAMES_RU, ACH_FACES, ACH_KINDS } from './showcase.js';

// Всё, что стоит отдельной строкой или плашкой, — с заглавной буквы (модель пишет со строчной).
function cap(v) {
    const t = String(v ?? '');
    return t.replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (m, a, b) => a + b.toUpperCase());
}
const ce = v => esc(cap(v));

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
    const btn = kind === 'rewards' ? '' : `<button type="button" class="iw-fold" data-iw-fold="${kind}" title="${folded ? 'Развернуть' : 'Свернуть'}" aria-label="${folded ? 'Развернуть' : 'Свернуть'}" aria-expanded="${!folded}">${icon(folded ? 'plus' : 'minus')}</button>`;
    return `<div class="iw-block-head"><span class="iw-block-icon">${icon(BLOCK_ICONS[kind])}</span><span class="iw-label"${kind === 'rewards' ? '' : ` data-iw-fold="${kind}"`}>${label}</span>${folded ? '' : extra}${btn}</div>`;
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
        <div class="iw-wallet-title">${coin}<span>${esc(Name)}</span></div>
        <p>Общий кошелёк этого чата. Монеты падают, когда что-то сбывается у любого — у персонажа, НПС или твоего героя: исполненное желание <b>+10</b>, преодолённый страх <b>+5</b>, шаг к мечте <b>+25</b>, мечта целиком <b>+100</b>.</p>
        <p>Тратится на награды для персонажа: открой «${esc(L.shop || 'Магазин наград')}» рядом, там настроение, события и вещи в коллекцию.</p>
        <p class="iw-wallet-now"><span>Сейчас:</span><b>${coin}<span>${Number(cur.points || 0).toLocaleString('ru-RU')}</span></b></p>
        <button type="button" class="iw-btn iw-mini-btn iw-cheat" data-iw-cheat="1" title="Как в «Симс»: ввести чит-код">${icon('key')}<span>Ввести код</span></button>
      </div></details>`;
}

// ВРЕМЕННО: меню проверки уведомлений и звуков. Потом убрать вместе с обработчиком data-iw-test в index.js.
const TEST_EVENTS = [
    ['want_done', 'Желание сбылось'], ['dream_step', 'Шаг к мечте'], ['dream_grow', 'Мечта дополнилась'], ['dream_change', 'Мечта изменилась'],
    ['dream_done', 'Мечта сбылась'], ['fear_real', 'Страх сбылся'], ['fear_gone', 'Страх отступил'], ['trait_new', 'Новая черта'],
    ['trait_up', 'Черта сильнее'], ['trait_down', 'Черта слабее'], ['impression', 'Первое впечатление'], ['attitude', 'Отношение'],
    ['reward', 'Покупка'], ['write', 'Карандаш (разбор)'], ['error', 'Ошибка'],
];
const TEST_MENU = `<details class="iw-vol iw-testmenu">
      <summary class="iw-tool" title="Проверка уведомлений и звуков (временно)" aria-label="Проверка уведомлений и звуков">${'<svg class="iw-ico" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>'}</summary>
      <div class="iw-vol-menu iw-test-menu">
        <div class="iw-vol-row"><span>Проверка (временно)</span></div>
        <button type="button" class="iw-test-all" data-iw-test="all">▶ Все по очереди</button>
        <div class="iw-test-grid">${TEST_EVENTS.map(([k, n]) => `<button type="button" data-iw-test="${k}">${n}</button>`).join('')}</div>
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
        <div class="iw-vol-row"><span>Громкость</span><output class="iw-range-val">${Number(settings.volume ?? 45)}%</output></div>
        <input type="range" class="iw-range iw-vol-range" data-iw-volume min="0" max="100" step="5" value="${Number(settings.volume ?? 45)}" aria-label="Громкость звуков"${sound ? '' : ' disabled'}>
      </div>
    </details>
    ${TEST_MENU}
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
    return ` <span class="iw-title-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face)}</span>`;
}

// Фон карточки в цвет главного настроения: мягкий градиент под фотографией и именем.
function tabTint(c) {
    const [a, b] = moodFaces(c);
    if (!a || a === 'neutral') return '';
    return `<span class="iw-tab-tint iw-face-${a}" aria-hidden="true">${b && b !== 'neutral' ? `<span class="iw-tab-tint2 iw-face-${b}"></span>` : ''}</span>`;
}

function faceBadge(c) {
    const [face] = moodFaces(c);
    if (!face) return '';
    return `<span class="iw-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face)}</span>`;
}

// Кнопки разбора: над ними надпись «Проанализировать» с рисованной стрелкой к кнопкам;
// пока идёт разбор, надпись сменяется загрузкой в стиле темы (точки, сердечки, полоска).
// Меню у кнопки «Лорбук»: галочками отмечается, что разбирать в этом чате —
// его берут и «Лорбук», и «Всё сразу». Карточка, описание персоны и привязанные лорбуки
// (персонажа, чата, персоны) отмечены сами, но их тоже можно снять.
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
          <div class="iw-books-cap">Что разбирать <span class="iw-books-count">${n ? `ещё отмечено: ${n}` : ''}</span></div>
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

function analyzeButtons(busyKind, labels = {}, books = [], picked = [], linked = [], working = false, off = [], hasPersona = false) {
    const btn = (kind, ic, label, title) => {
        // Кнопка, которая сейчас работает, сама становится «Стоп» — на том же месте и того же размера.
        if (busyKind === kind) {
            return `<button type="button" class="iw-act iw-act-${kind} busy iw-act-stop" data-iw-stop title="Остановить разбор" aria-label="Остановить разбор"><span class="iw-stop-ring" aria-hidden="true">${icon('stop')}</span><span>Стоп</span></button>`;
        }
        return `<button type="button" class="iw-act iw-act-${kind}" data-iw-analyze="${kind}" title="${title}"${working ? ' disabled' : ''}>${icon(ic)}<span>${label}</span>${kind === 'chat' && !working ? nextBadge() : ''}</button>`;
    };
    const cap = working
        ? `<span class="iw-loader" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="iw-cap-text">${esc(labels.analyzing || 'Записываю')}</span>`
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
    const age = clock && clock.cal && clock.t ? ageNow(clock.cal, clock.t, c) : null;
    const edit = key ? ` data-iw-born="${esc(key)}" role="button" tabindex="0"` : '';
    if (!c.born || !c.born.d || !c.born.m) {
        if (age !== null) return `<span class="iw-tab-born"${edit} title="Возраст на дату сцены${c.born && c.born.y ? `, год рождения ${c.born.y}` : ''}. Нажми, чтобы вписать день рождения">${icon('cake')}<span>${c.born && c.born.y ? `${c.born.y} · ` : ''}${age} ${plural(age, 'год', 'года', 'лет')}</span></span>`;
        return key ? `<span class="iw-tab-born iw-born-none"${edit} title="День рождения не указан — нажми, чтобы вписать">${icon('cake')}<span>д.р.?</span></span>` : '';
    }
    const today = clock && clock.t && clock.cal && clock.cal.type === 'greg' && clock.t.m === c.born.m && clock.t.d === c.born.d;
    return `<span class="iw-tab-born${today ? ' iw-born-today' : ''}"${edit} title="Нажми, чтобы поправить. День рождения: ${esc(bornText(c.born))}${age !== null ? `, ${age} ${plural(age, 'год', 'года', 'лет')}` : ''}">${icon('cake')}<span>${c.born.d} ${MONTH_SHORT[c.born.m - 1]}${age !== null ? ` · ${age}` : ''}</span></span>`;
}

export function renderTabs({ state, mains, view, avatarFor, npc, busyKind = '', persona = null, labels = {}, books = [], picked = [], linked = [], working = false, off = [], noActs = false, clock = null }) {
    const tabs = mains.map(key => {
        const c = state.characters[key] || { name: key };
        const on = view === 'main:' + key || view === 'shop:' + key;
        return `<button type="button" class="iw-tab${on ? ' on' : ''}" data-iw-view="main:${esc(key)}" aria-pressed="${on}">${tabTint(c)}<span class="iw-tape"></span><span class="iw-photo-wrap">${photoHtml(c, avatarFor)}${faceBadge(c)}</span><span class="iw-tab-name${nameFit(c.name)}">${esc(c.name)}</span>${c.mood ? `<span class="iw-tab-mood">${ce(c.mood)}</span>` : ''}${state.characters[key] ? tabBorn(c, clock, key) : ''}</button>`;
    }).join('');
    const sticker = npc
        ? `<button type="button" class="iw-npc-sticker${view.startsWith('npc') ? ' on' : ''}" data-iw-view="npc" aria-pressed="${view.startsWith('npc')}">
             <span class="iw-npc-sticker-title">${icon('users')} НПС</span>
             <span class="iw-npc-sticker-count">${npc.met}${npc.known ? ` из ${npc.known}` : ''}</span>
           </button>`
        : '';
    // карточка персоны игрока — такая же, как у персонажа (без подписи: и так понятно, чья она)
    let me = '';
    if (persona) {
        const pc = (persona.key && state.characters[persona.key]) || { name: persona.name };
        const on = view.startsWith('me:');
        const photo = persona.avatar
            ? `<span class="iw-photo" style="background-image:url('${esc(persona.avatar)}')"></span>`
            : `<span class="iw-photo iw-photo-letter">${esc((pc.name || '?').slice(0, 1).toUpperCase())}</span>`;
        me = `<button type="button" class="iw-tab iw-tab-persona${on ? ' on' : ''}" data-iw-view="me:${esc(persona.key || '')}" aria-pressed="${on}" title="Дневник твоего героя: только для тебя, на ответы бота не влияет">${persona.key ? tabTint(pc) : ''}<span class="iw-tape"></span><span class="iw-photo-wrap">${photo}${persona.key ? faceBadge(pc) : ''}</span><span class="iw-tab-name${nameFit(pc.name)}">${esc(pc.name)}</span>${pc.mood ? `<span class="iw-tab-mood">${ce(pc.mood)}</span>` : ''}${persona.key ? tabBorn(pc, clock, persona.key) : ''}</button>`;
    }
    return `<div class="iw-tabrow"><div class="iw-tabs">${tabs}${sticker}${me}</div>${noActs ? '' : `<span class="iw-divider" aria-hidden="true"></span>${analyzeButtons(busyKind, labels, books, picked, linked, working || !!busyKind, off, !!persona)}`}</div>`;
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
          <span class="iw-feel-face" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face)}</span>
          <span class="iw-feel-name">${ce(m.emotion)}</span>
          <span class="iw-feel-power">${ce(WEIGHT_NAMES[m.weight] || '')}</span>
          ${delBtn('moodlets', i)}
        </div>
        ${m.feel ? `<div class="iw-feel-inner">${ce(m.feel)}</div>` : ''}
        ${m.why ? `<div class="iw-feel-why"><span class="iw-feel-cause">из-за:</span> ${ce(m.why)}</div>` : ''}
        <div class="iw-feel-time">${feelMeter(m, opts.manualTurns)}<span>${esc(moodletLeftLabel(m))}</span></div>
      </li>`;
    };
    const list = c.moodlets || [];
    const shown = list.slice(0, SHOWN_MOODLETS).map(one).join('');
    const rest = list.slice(SHOWN_MOODLETS);
    const more = rest.length
        ? `<details class="iw-more"><summary>ещё ${rest.length} ${plural(rest.length, 'эмоция', 'эмоции', 'эмоций')}</summary><ul class="iw-feels">${rest.map((m, j) => one(m, j + SHOWN_MOODLETS)).join('')}</ul></details>`
        : '';
    const feels = shown;
    return `
    <section class="iw-block iw-b-mood">
      ${blockHead('mood', esc(L.moodTitle))}
      <div class="iw-mood-now"><span class="iw-mood-lead">${esc(L.moodLead)}</span> ${c.mood ? moodWord(c) : '<span class="iw-muted">— пока не понятно</span>'}</div>
      ${feels ? `<ul class="iw-feels iw-feels-flat">${feels}</ul>${more}` : '<div class="iw-muted">Ничего особенного</div>'}
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
    const known = c.impression && c.impression.known;
    const nowScore = c.chemNow ? c.chemNow.score : (CHEM_SCORE[c.chem.level] ?? 0);
    const nowLevel = chemLevelOf(nowScore);
    const cells = [-3, -2, -1, 0, 1, 2, 3].map(v => `<span class="iw-chem-cell${(nowScore > 0 && v > 0 && v <= nowScore) || (nowScore < 0 && v < 0 && v >= nowScore) || (v === 0) ? ' on' : ''}${v < 0 ? ' neg' : (v > 0 ? ' pos' : ' mid')}"></span>`).join('');
    return `<div class="iw-chem-wrap">
      <div class="iw-chem iw-chem-${esc(c.chem.level)}" title="Совместимость по чертам и типу личности">
        <span class="iw-chem-ico">${icon('chem_' + c.chem.level)}</span>
        <span class="iw-chem-body"><span class="iw-att-cap">${known ? `Давно знакомы: ${esc(known)}` : 'Первая совместимость'}</span><b class="iw-chem-name">${esc(CHEM_NAMES[c.chem.level])}</b>${c.chem.why ? `<span class="iw-chem-why">${ce(c.chem.why)}</span>` : ''}</span>
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
          <div class="iw-attr-chips">${items.length ? items.map((t, i) => (i < ATTR_SHOWN || (opts.attrMore && opts.attrMore[list]) ? chip(list, t, i) : '')).join('') : '<span class="iw-muted">Пока ничего</span>'}${items.length > ATTR_SHOWN ? `<button type="button" class="iw-attr-more" data-iw-attr="more:${list}">${opts.attrMore && opts.attrMore[list] ? 'свернуть' : `ещё ${items.length - ATTR_SHOWN}`}${icon('chevron')}</button>` : ''}</div>
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
        <summary class="iw-btn iw-attr-add">${icon('plus')}<span>Выбрать из списка</span></summary>
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

function renderAttitude(c, L, opts = {}) {
    if (!c.impression) return '';
    const im = c.impression;
    const nowScore = im.nowScore ?? im.score;
    return `
    <section class="iw-block iw-b-impression">
      <span class="iw-tape iw-tape-blue"></span>
      ${blockHead('impression', esc(L.attitude))}
      ${opts.attrBlock ? '' : chemPlate(c)}
      <div class="iw-att-row">
        <div class="iw-att-cell">
          <div class="iw-att-cap">${im.known ? `Давно знакомы: ${esc(im.known)}` : ce(L.first)}</div>
          <div class="iw-imp-row">${scoreBadge(im.score)}<span class="iw-imp-label">${ce(im.label)}</span></div>
          ${im.why ? `<div class="iw-imp-why">${ce(im.why)}</div>` : ''}
        </div>
        ${im.now ? `
        <div class="iw-att-cell">
          <div class="iw-att-cap">${ce(L.now)}</div>
          <div class="iw-imp-row">${scoreBadge(nowScore)}<span class="iw-imp-now">${ce(im.now)}</span></div>
        </div>` : ''}
      </div>
      ${attitudeChart(c.attitude, L.chartMark)}
    </section>`;
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
        <span class="iw-box">${done ? ICON_CHECK : ''}</span>
        <span class="iw-want-text">${ce(w.text)}${done ? ' <b class="iw-tag">Сбылось</b>' : ''}${dropped ? ' <b class="iw-tag">Уже неважно</b>' : ''}</span>
        <span class="iw-row-tools">${pin}${delBtn('wants', i)}</span>
      </li>`;
    }).join('');
    return `
    <section class="iw-block iw-b-wants">
      ${blockHead('wants', esc(L.wants))}
      ${items ? `<ul class="iw-list">${items}</ul>` : '<div class="iw-muted">Ничего особенного</div>'}
    </section>`;
}

const FEAR_POWER = { 1: 'слабый', 2: 'сильный', 3: 'очень сильный' };

function renderFears(c, L) {
    const items = (c.fears || []).map((f, i) => `
      <li class="iw-fear iw-fs-${f.strength}${f.status !== 'active' ? ' ' + f.status : ''}">
        <span class="iw-fear-mark" aria-hidden="true">${icon('ghost')}</span>
        <span class="iw-fear-text">${ce(f.text)}${f.status === 'realized' ? ' <b class="iw-tag">Сбылся</b>' : ''}${f.status === 'gone' ? ' <b class="iw-tag">Прошёл</b>' : ''}</span>
        <span class="iw-row-tools"><span class="iw-fear-power">${ce(f.level || FEAR_POWER[f.strength])}</span>${delBtn('fears', i)}</span>
      </li>`).join('');
    return `
    <section class="iw-block iw-b-fears">
      ${blockHead('fears', esc(L.fears))}
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

function renderDream(c, L, opts = {}) {
    if (!c.dream) {
        return `<section class="iw-block iw-b-dream">${blockHead('dream', esc(L.dream), dreamTools(c, opts.dreamBusy === true || (!!opts.dreamBusy && opts.dreamBusy === opts.key)))}<div class="iw-muted">Ещё не ясна</div></section>`;
    }
    const steps = c.dream.steps;
    const done = steps.filter(s => s.done).length;
    return `
    <section class="iw-block iw-b-dream${c.dream.pinned ? ' pinned' : ''}">
      ${blockHead('dream', esc(L.dream), `<span class="iw-count">${done} из ${steps.length}</span>${dreamTools(c, opts.dreamBusy === true || (!!opts.dreamBusy && opts.dreamBusy === opts.key))}`)}
      <div class="iw-dream-title">${esc(c.dream.title)}${c.dream.plus ? `${/^[…,;:—–-]/.test(c.dream.plus.trim()) ? ' ' : ', '}<span class="iw-dream-plus">${esc(c.dream.plus.trim())}</span>` : ''}</div>
      <ol class="iw-steps">${steps.map(s => `<li class="iw-step${s.done ? ' done' : ''}"><span class="iw-star">${s.done ? '★' : '☆'}</span><span>${ce(s.text)}</span></li>`).join('')}</ol>
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
    if (t.why && (t.kept || t.kind === 'base')) more.push(`<p class="iw-trait-origin"><b>Появилась:</b> ${ce(t.why)}</p>`);
    if (!more.length) more.push(`<p class="iw-muted">${acquired ? 'Подробности появятся после следующего разбора.' : 'Откуда эта черта, станет ясно после разбора «Всё сразу» или «Лорбук».'}</p>`);
    return `
      <span class="iw-trait iw-k-${t.kind}${acquired ? ' iw-acquired' : ''}">
        <span class="iw-trait-head">
        <details class="iw-trait-det">
          <summary class="iw-trait-name" title="Подробнее о черте"><span class="iw-trait-label">${ce(t.name)}</span><span class="iw-trait-chev" aria-hidden="true">${icon('chevron')}</span>${mark}</summary>
          <span class="iw-trait-more">${more.join('')}</span>
        </details>
        <span class="iw-trait-tools">${tools}</span>
        </span>
        ${t.kept ? '<span class="iw-trait-kept">Приобретена</span>' : ''}
        ${t.why && t.kind !== 'base' && !t.kept ? `<span class="iw-trait-why">${ce(t.why)}</span>` : ''}
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
          ${c.ptypeNote ? `<p class="iw-persona-own">${esc(c.ptypeNote)}</p>` : ''}
        </div>`);
    }
    if (TEMPERS[c.temper]) {
        cards.push(`
        <div class="iw-persona-card iw-tm-${c.temper}">
          <div class="iw-persona-top">
            <span class="iw-persona-code">${icon('flame')}</span>
            <span class="iw-persona-name">${esc(TEMPERS[c.temper])}<small>темперамент</small></span>
          </div>
          <p class="iw-persona-general">${esc(byGender(TEMPER_TEXT[c.temper], g))}</p>
          ${c.temperNote ? `<p class="iw-persona-own">${esc(c.temperNote)}</p>` : ''}
        </div>`);
    }
    const z = ZODIAC[c.zodiac];
    // дату рождения можно вписать или поправить руками — она же попадает в календарь и на карточку
    const bornBtn = opts.key ? `<button type="button" class="iw-born-edit" data-iw-born="${esc(opts.key)}" title="${c.born ? 'Поправить дату рождения' : 'Вписать дату рождения'}">${icon('feather')}<span>${c.born ? 'поправить' : 'вписать дату'}</span></button>` : '';
    {
        const born = c.born ? `${gw(g, 'родился', 'родилась', 'день рождения:')} ${esc(bornText(c.born))}` : 'дата рождения не указана';
        cards.push(`
        <div class="iw-persona-card iw-zd-${z ? z.el : 'none'}">
          <div class="iw-persona-top">
            <span class="iw-persona-code iw-zodiac-glyph">${z ? `${z.glyph}\uFE0E` : icon('zodiac')}</span>
            <span class="iw-persona-name">${esc(z ? z.name : 'знак не ясен')}<small>${born} ${bornBtn}</small></span>
          </div>
          ${z ? `<p class="iw-persona-general">${esc(z.text)}</p>` : ''}
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
      <div class="iw-note iw-note-${b.kind === 'event' ? 'event' : 'buff'}" role="listitem" style="--iw-tilt:${(i % 2 ? 1 : -1) * (1 + (i % 3) * 0.6)}deg">
        <span class="iw-note-pin" aria-hidden="true"></span>
        <span class="iw-note-ico">${icon(b.icon || (b.kind === 'event' ? 'sparkle' : 'potion'))}</span>
        <span class="iw-note-body"><b>${ce(b.title)}</b><small>${b.kind === 'event' ? 'случится в следующем ответе' : `действует ещё ${b.left} ${plural(b.left, 'ответ', 'ответа', 'ответов')}`}</small></span>
        <button type="button" class="iw-note-x" data-iw-unbuy="${esc(key)}:${esc(b.id)}" title="Отменить — монеты вернутся${b.cost ? ` (${b.cost})` : ''}" aria-label="Отменить">${icon('x')}</button>
      </div>`).join('')}</div>`;
}


// Категории наград: у каждой свой цвет и понятная подпись.
const REWARD_GROUPS = [
    { kind: 'buff', icon: 'potion', name: 'На время', hint: 'эффект на несколько ответов: настроение, сила, удача' },
    { kind: 'event', icon: 'sparkle', name: 'Событие', hint: 'случится в сюжете в следующем ответе' },
    { kind: 'collect', icon: 'gem', name: 'В коллекцию', hint: 'памятная вещь, остаётся навсегда' },
];

export function renderShop(c, theme, key, { shopBusy = false, purse = null, persona = null, giftTo = 'owner' } = {}) {
    const forPersona = !!persona && giftTo === 'persona';
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who));
    const pts = purse ?? (c.points || 0);
    const row = r => `
      <li class="iw-reward iw-rk-${r.kind}${pts < r.cost ? ' locked' : ''}">
        <span class="iw-rw-ico iw-rw-big">${icon(r.icon || 'gift')}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${ce(r.title)}</b><span class="iw-rw-desc">${ce(r.desc || r.effect || '')}</span>${r.kind === 'buff' ? `<span class="iw-rw-kind">действует ${r.turns} ${plural(r.turns, 'ответ', 'ответа', 'ответов')}</span>` : ''}</span>
        <button type="button" class="iw-buy" data-iw-buy="${esc(r.id)}"${pts < r.cost ? ' disabled' : ''} title="${pts < r.cost ? 'Не хватает очков' : 'Купить'}">${icon(currencyIcon(theme))}<span>${r.cost}</span></button>
      </li>`;
    // купленное уходит с полки: действующее висит листочком, памятная вещь — уже на витрине
    const active = new Set((c.buffs || []).map(b => b.id));
    // памятная вещь уходит с полки, когда она уже есть у того, кому её сейчас покупают
    const owned = new Set(((forPersona ? persona.collection : c.collection) || []).map(x => String(x.title || '').toLowerCase()));
    const shop = (c.shop || []).filter(r => !active.has(r.id) && !(r.kind === 'collect' && owned.has(String(r.title || '').toLowerCase())));
    const groups = REWARD_GROUPS.map(g => {
        const list = shop.filter(r => r.kind === g.kind);
        if (!list.length) return '';
        const gift = g.kind === 'collect' && persona
            ? `<div class="iw-gift-to" role="group" aria-label="Кому купить"><span class="iw-muted">Кому:</span><button type="button" class="iw-gift-opt${forPersona ? '' : ' on'}" data-iw-giftto="owner" aria-pressed="${!forPersona}">${esc(c.name)}</button><button type="button" class="iw-gift-opt${forPersona ? ' on' : ''}" data-iw-giftto="persona" aria-pressed="${forPersona}">${esc(persona.name)}</button></div>`
            : '';
        return `
    <div class="iw-rw-group iw-rg-${g.kind}">
      <div class="iw-rw-cat"><span class="iw-rw-cat-name">${icon(g.icon)}${g.name}</span><span class="iw-rw-cat-hint">${g.hint}</span></div>${gift}
      <ul class="iw-list iw-rewards">${list.map(row).join('')}</ul>
    </div>`;
    }).join('');
    return `
<button type="button" class="iw-back" data-iw-view="main:${esc(key)}">${icon('back')}<span>к дневнику</span></button>
<section class="iw-block iw-b-shop">
  ${blockHead('rewards', esc(L.shop), `<span class="iw-points" title="${Number(pts || 0).toLocaleString('ru-RU')}">${icon(currencyIcon(theme))}<b>${shortPoints(pts)}</b></span>`)}
  <div class="iw-muted">Очки: желание +10, этап мечты +25, мечта целиком +100. Награды подобраны под персонажа: ${esc(c.name)}.</div>
  <div class="iw-shop-top"><button type="button" class="iw-btn${shopBusy ? ' busy' : ''}" data-iw-shop="regen"${shopBusy ? ' disabled' : ''}>${icon(shopBusy ? 'rotate' : 'dice')}<span>${groups ? 'Подобрать заново' : 'Подобрать награды'}</span></button><button type="button" class="iw-btn iw-cheat" data-iw-cheat="1" title="Как в «Симс»: ввести чит-код">${icon('key')}<span>Ввести код</span></button></div>
  ${buffNotes(c, key)}
  ${groups || ((c.shop || []).length ? '<div class="iw-empty">Всё уже куплено. Нажми «Подобрать заново» — появятся новые награды.</div>' : '<div class="iw-empty">Наград пока нет — нажми «Подобрать награды».</div>')}
</section>`;
}

// Витрина — как лавка: список памятных вещей и достижений, значки в скетчевых кружках, звёздочки за достоинство.
const TIER_STARS = { bronze: 1, silver: 2, gold: 3 };
// значок достижения: обычный рисунок или лицо-эмоция (для смешных и милых)
export function achIcon(name) {
    return ACH_FACES.includes(name) ? faceIcon(name, 'iw-ach-face') : icon(name || 'trophy');
}
function renderShowcase({ state, theme, got = [], sel = '' }) {
    const items = collectionOf(state);
    const list = (Array.isArray(got) ? got : []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const stars = t => `<span class="iw-case-stars iw-tier-${t}" title="${esc(TIER_NAMES_RU[t] || '')}">${Array.from({ length: TIER_STARS[t] || 1 }, () => icon('star')).join('')}<em>${esc(TIER_NAMES_RU[t] || '')}</em></span>`;
    const itemRow = x => `
      <li class="iw-reward iw-rk-collect iw-case-row">
        <span class="iw-case-ico">${icon(x.icon || 'gift')}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${ce(x.title)}</b>${x.desc ? `<span class="iw-rw-desc">${ce(x.desc)}</span>` : ''}<span class="iw-rw-kind">в коллекции: ${esc(x.owner)}</span></span>
      </li>`;
    const achRow = a => `
      <li class="iw-reward iw-case-row iw-case-ach iw-tier-${a.tier}${sel === `a:${a.id}` ? ' on' : ''}">
        <span class="iw-case-ico">${achIcon(a.icon)}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${ce(a.title)}</b>${a.desc ? `<span class="iw-rw-desc">${ce(a.desc)}</span>` : ''}<span class="iw-rw-kind">${stars(a.tier)}${a.kind && ACH_KINDS[a.kind] ? `<span class="iw-ach-kind iw-ach-${a.kind}">${esc(ACH_KINDS[a.kind])}</span>` : ''}${a.scene ? `<span>${esc(a.scene)}</span>` : ''}${a.mes !== undefined ? `<span>сообщение #${esc(a.mes)}</span>` : ''}</span></span>
        <button type="button" class="iw-mini iw-case-x" data-iw-achdel="${esc(a.id)}" title="Убрать с витрины" aria-label="Убрать с витрины">${icon('x')}</button>
      </li>`;
    const doodles = '<div class="iw-cal-doodles iw-case-doodles" aria-hidden="true"><i class="iw-dd iw-dd-a"></i><i class="iw-dd iw-dd-b"></i><i class="iw-dd iw-dd-c"></i></div>';
    return `
<button type="button" class="iw-back" data-iw-view="back">${icon('back')}<span>к дневнику</span></button>
<section class="iw-block iw-b-shop iw-b-showcase">
  ${blockHead('rewards', 'Витрина', `<span class="iw-points iw-case-count" title="Достижений: ${list.length}">${icon('trophy')}<b>${list.length}</b></span>`)}
  <div class="iw-muted">Памятные вещи из лавки и достижения истории. Достижения появляются сами, когда случается что-то по-настоящему важное.</div>
  <div class="iw-rw-group iw-rg-ach">
    <div class="iw-rw-cat"><span class="iw-rw-cat-name">${icon('trophy')}Достижения</span><span class="iw-rw-cat-hint">${list.length ? `получено: ${list.length}` : 'появятся по ходу истории'}</span></div>
    ${list.length ? `<ul class="iw-list iw-rewards">${list.map(achRow).join('')}</ul>` : '<p class="iw-case-empty-text">Пока пусто. Признание, спасение, предательство, большая победа — и здесь появится первая запись.</p>'}
  </div>
  <div class="iw-rw-group iw-rg-collect">
    <div class="iw-rw-cat"><span class="iw-rw-cat-name">${icon('gem')}Памятные вещи</span><span class="iw-rw-cat-hint">${items.length ? `${items.length} ${plural(items.length, 'вещь', 'вещи', 'вещей')}` : 'покупаются в лавке «в коллекцию»'}</span></div>
    ${items.length ? `<ul class="iw-list iw-rewards">${items.map(itemRow).join('')}</ul>` : '<p class="iw-case-empty-text">Пока пусто. Загляни в лавку — там есть вещицы «в коллекцию».</p>'}
  </div>
  ${doodles}
</section>`;
}

// Раскладка блоков без дыр. Блоки остаются в своей части дневника:
// узкие (настроение, отношение, желания, страхи) — открытые парами, под ними свёрнутые плашками по две;
// если узкому не хватило пары, он растягивается на всю ширину. Широкий блок сворачивается полоской на своём месте.
const NARROW_BLOCKS = new Set(['mood', 'impression', 'wants', 'fears']);
export function layoutBlocks(blocks, collapsed = {}) {
    const items = blocks.filter(Boolean).map(h => ({ h, k: (h.match(/class="iw-block iw-b-([a-z]+)/) || [])[1] || '' }));
    const mark = (x, cls) => (cls ? x.h.replace(/class="iw-block iw-b-([a-z]+)(?=[" ])/, m => `${m}${cls}`) : x.h);
    const out = [];
    let run = [];
    const pairs = (list, extra) => list.forEach((x, i) => out.push(mark(x, `${extra}${list.length % 2 && i === list.length - 1 ? ' iw-solo' : ''}`)));
    const flush = () => {
        pairs(run.filter(x => !collapsed[x.k]), '');
        pairs(run.filter(x => collapsed[x.k]), ' iw-collapsed');
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

export function renderCharacter(c, modules, theme, opts = {}) {
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who), bimboNicks(c.name, !!opts.first));
    if (opts.persona) {
        const pg = genderOf(c.g, c.name, c.who);
        L.attitude = `Как ${gw(pg, 'он', 'она', 'твой герой')} относится к ${gw(opts.botG, 'нему', 'ней', 'персонажу')}`;
    }
    FOLD = { collapsed: opts.collapsed || {} };
    const blocks = [];
    if (modules.mood) blocks.push(renderMood(c, L, opts));
    if (modules.impression) blocks.push(renderAttitude(c, L, { attrBlock: !!modules.attraction }));
    if (modules.wants) blocks.push(renderWants(c, L));
    if (modules.fears) blocks.push(renderFears(c, L));
    if (modules.dream) blocks.push(renderDream(c, L, opts));
    if (modules.traits) blocks.push(renderTraits(c, L));
    if (modules.traits) blocks.push(renderPersona(c, L, opts));
    if (modules.attraction) blocks.push(renderAttraction(c, L, opts));
    if (modules.chronicle) blocks.push(renderChronicle(c, L));
    const collapsed = FOLD.collapsed;
    FOLD = { collapsed: {} };
    return `${opts.key ? buffNotes(c, opts.key) : ''}<div class="iw-grid">${layoutBlocks(blocks, collapsed)}</div>`;
}

// Список НПС: встреченные — карточками, ещё не появлявшиеся — знаками вопроса.
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
            heardCards.push(`
      <button type="button" class="iw-npc met iw-npc-heard${dead ? ' iw-dead' : ''}" data-iw-view="npc:${esc(key)}" title="${esc(dead ? `${c.name}: нет в живых` : `${personaName || 'Твой герой'} знает ${gw(g, 'его', 'её', 'его')} только понаслышке`)}">
        ${deadMark}<span class="iw-npc-x" data-iw-npcx="${esc(key)}" role="button" tabindex="0" title="Убрать из НПС" aria-label="Убрать ${esc(c.name)} из НПС">${icon('x')}</span><span class="iw-npc-face-wrap">${npcBadge(badgeInfo(c, entry))}</span>
        <span class="iw-npc-name${nameFit(c.name)}">${esc(c.name)}</span>
        <span class="iw-npc-mood iw-npc-heardmark">${dead ? 'нет в живых' : 'понаслышке'}</span>
        ${who ? `<span class="iw-npc-who">${ce(who)}</span>` : ''}
      </button>`);
            continue;
        }
        cards.push(`
      <button type="button" class="iw-npc met${dead ? ' iw-dead' : ''}" data-iw-view="npc:${esc(key)}" title="${esc(dead ? `${c.name}: нет в живых` : `Открыть: ${c.name}`)}">
        ${deadMark}<span class="iw-npc-x" data-iw-npcx="${esc(key)}" role="button" tabindex="0" title="Убрать из НПС" aria-label="Убрать ${esc(c.name)} из НПС">${icon('x')}</span><span class="iw-npc-face-wrap">${npcBadge(badgeInfo(c, entry))}${dead ? '' : faceBadge(c)}</span>
        <span class="iw-npc-name${nameFit(c.name)}">${esc(c.name)}</span>
        ${!dead && (c.born || c.ageAt) ? tabBorn(c, clock, key) : ''}
        ${dead ? '<span class="iw-npc-mood iw-npc-heardmark">нет в живых</span>' : (c.mood ? `<span class="iw-npc-mood iw-npc-now">${ce(c.mood)}</span>` : '')}
        ${who ? `<span class="iw-npc-who">${ce(who)}</span>` : ''}
      </button>`);
    }
    for (const e of seenOnly) {
        used.add(e.name);
        const g = genderOf(e.g, e.name, e.who);
        const tip = e.checked
            ? gw(g, 'О нём говорили, но лично он в сцене не появлялся', 'О ней говорили, но лично она в сцене не появлялась', 'Об этом персонаже говорили, но лично в сцене его не было')
            : gw(g, 'Упоминался', 'Упоминалась', 'Был упомянут') + ' в этом чате. Нажми «Чат», и дневник разберёт историю';
        cards.push(`
      <div class="iw-npc seen${e.checked ? ' checked' : ''}" title="${esc(tip)}">
        ${npcBadge(badgeInfo(e, e))}
        <span class="iw-npc-name${nameFit(e.name)}">${esc(e.name)}</span>
        <span class="iw-npc-mood">${e.checked ? gw(g, 'только упоминался', 'только упоминалась', 'только упоминание') : 'ждёт разбора'}</span>
      </div>`);
    }
    const ign = new Set(ignored.map(n => String(n).toLowerCase()));
    const unknown = ((roster && roster.npc) || []).filter(e => !used.has(e.name) && !npcKeys.some(k => roster.find(k) === e) && !ign.has(String(e.name).toLowerCase()));
    const unknownTiles = unknown.map(() => `
      <span class="iw-npc-unknown" title="Ещё не было в сцене"><span class="iw-unknown-mark"></span></span>`).join('');
    const known = (roster && roster.npc && roster.npc.length) || 0;
    const studyLabel = known ? 'Изучить заново' : 'Изучить лорбук и карточку';
    return `
<div class="iw-npc-view">
  <div class="iw-npc-bar">
    <div class="iw-npc-bar-text">
      <span class="iw-label">Другие персонажи</span>
      <span class="iw-muted">${known ? `в лорбуке и карточке: ${known} · в дневнике: ${npcKeys.length}${seenOnly.filter(e => !e.checked).length ? ` · ждут разбора: ${seenOnly.filter(e => !e.checked).length}` : ''}${seenOnly.filter(e => e.checked).length ? ` · только упоминались: ${seenOnly.filter(e => e.checked).length}` : ''}` : 'появляются здесь, когда приходят в сцену'}</span>
    </div>
    <button type="button" class="iw-study${rosterBusy ? ' busy' : ''}" data-iw-study="1"${rosterBusy ? ' disabled' : ''}>${icon(rosterBusy ? 'rotate' : 'scroll')}<span>${rosterBusy ? 'Изучаю…' : studyLabel}</span></button>
  </div>
  ${cards.length && heardCards.length ? `<div class="iw-group">${groupHead(`Знакомы лично${personaName ? ` с ${esc(personaName)}` : ''} · ${cards.length}`, 'встречались в сцене или знакомы до истории')}</div>` : ''}
  ${cards.length ? `<div class="iw-npc-grid">${cards.join('')}</div>` : (heardCards.length ? '' : unknown.length ? '<div class="iw-muted">Пока никто из них не появлялся в сцене.</div>' : '<div class="iw-empty">Пока никого. Нажми «Изучить лорбук и карточку» — и я узнаю, кто живёт в этом мире. В дневнике они появятся, когда придут в сцену.</div>')}
  ${heardCards.length ? `<div class="iw-group iw-group-heard">${groupHead(`Знает понаслышке · ${heardCards.length}`, `${personaName ? esc(personaName) : 'твой герой'} с ними лично не ${gw(personaG, 'встречался', 'встречалась', 'встречался')} — только ${gw(personaG, 'слышал', 'слышала', 'слышал')}: из рассказов, слухов, газет`)}<div class="iw-npc-grid">${heardCards.join('')}</div></div>` : ''}
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
    return e.name;
}

function clockWhen(e) {
    return e.inDays === 0 ? 'сегодня' : (e.inDays === 1 ? 'завтра' : `через ${e.inDaysText}`);
}

const EVENT_ICON = { birthday: 'cake', canon: 'feather', holiday: 'gift' };

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
  <span class="iw-muted">${clock.busy ? 'Определяю календарь и время по истории…' : 'Время сцены пока не понятно.'}</span>
  ${clock.busy ? '' : `<button type="button" class="iw-btn iw-mini-btn" data-iw-clock="detect">${icon('sparkle')}<span>Определить по истории</span></button>`}
</div>`;
    }
    const cal = clock.cal;
    const d = clock.draft;
    const today = (clock.today || []).map(e => `<span class="iw-clock-tag iw-clock-${e.kind}">${icon(EVENT_ICON[e.kind] || 'gift')}<span>${esc(clockEventText(e))}</span></span>`).join('');
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
            const cls = ['iw-cal-day', isToday ? 'iw-cal-today' : '', isSel ? 'iw-cal-sel' : '', kinds.has('holiday') ? 'iw-cal-hol' : '', kinds.has('birthday') ? 'iw-cal-bday' : '', kinds.has('canon') ? 'iw-cal-canon' : ''].filter(Boolean).join(' ');
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
    const evRow = e => `<li class="iw-clock-ev iw-clock-${e.kind}"${e.about ? ` title="${esc(e.about)}"` : ''}><span class="iw-ev-ico">${icon(EVENT_ICON[e.kind] || 'gift')}</span><span class="iw-ev-body"><span class="iw-ev-when"><b>${esc(e.dateText)}</b><em>${esc(clockWhen(e))}</em></span><span class="iw-ev-name">${esc(clockEventText(e))}</span>${e.about ? `<small>${esc(e.about)}</small>` : ''}</span></li>`;
    const evAll = clock.upcoming || [];
    const events = evAll.length ? `<ul class="iw-clock-events">${evAll.slice(0, 3).map(evRow).join('')}</ul>${evAll.length > 3 ? `<details class="iw-clock-evmore"><summary>${icon('chevron')}<span>Ещё ${evAll.length - 3}</span></summary><ul class="iw-clock-events">${evAll.slice(3).map(evRow).join('')}</ul></details>` : ''}` : '<p class="iw-muted iw-clock-noev">В ближайший год ничего не отмечено</p>';
    const hols = (clock.holidays || []).map((h, i) => `<li class="iw-clock-${h.kind}"><span>${esc(h.dateText)} — ${esc(h.kind === 'canon' && h.who ? `${h.who}: ${h.name}` : h.name)}${h.years ? `<small class="iw-muted"> (${esc(h.years)})</small>` : ''}</span><button type="button" class="iw-mini iw-clock-x" data-iw-clock="hol-del:${i}" title="Убрать" aria-label="Убрать">${icon('x')}</button></li>`).join('');
    return `
<details class="iw-clock"${clock.open ? ' open' : ''}>
  <summary class="iw-clock-bar" title="Часы и календарь сцены">
    <span class="iw-clock-ico">${icon('clock')}</span>
    <b class="iw-clock-time">${esc(clock.time)}</b>
    <span class="iw-clock-part">${esc(clock.part)}</span>
    <span class="iw-clock-date">${esc(clock.date)}</span>
    ${today}
    ${clock.locked ? `<span class="iw-clock-lockmark" title="Часы стоят: сами не двигаются">${icon('lock')}</span>` : ''}
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
        </div>
        <div class="iw-clock-row">
          <button type="button" class="iw-btn iw-mini-btn iw-clock-apply" data-iw-clock="set"${changed ? '' : ' disabled'}>${icon('tick')}<span>Поставить</span></button>
          ${changed ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-clock="reset">${icon('back')}<span>Как сейчас</span></button>` : ''}
        </div>
        <label class="iw-clock-lock"><input type="checkbox" data-iw-clock="lock"${clock.locked ? ' checked' : ''}> <span>Часы стоят — сами не двигаются</span></label>
        <div class="iw-clock-sub iw-clock-evhead"><span class="iw-doodle-mark" aria-hidden="true"></span>Праздники и личные даты</div>
        ${events}
      </div>
    </div>
    <details class="iw-clock-cal"${clock.calOpen ? ' open' : ''}>
      <summary>${icon('calendar')}<span>Календарь: ${esc(clock.typeName)}${clock.calName ? ` «${esc(clock.calName)}»` : ''}${clock.country ? ` · ${esc(clock.country)}` : ''}</span>${icon('chevron')}</summary>
      ${clock.why ? `<p class="iw-muted">${esc(clock.why)}</p>` : ''}
      ${clock.monthsText ? `<p class="iw-clock-months"><b>Месяцы:</b> ${esc(clock.monthsText)}</p>` : ''}
      ${clock.weekdaysText ? `<p class="iw-clock-months"><b>Дни недели:</b> ${esc(clock.weekdaysText)}</p>` : ''}
      ${cal.type !== 'days' ? `<div class="iw-clock-sub">Праздники и личные даты</div><ul class="iw-clock-hols">${hols || '<li class="iw-muted">пока нет</li>'}</ul>
      <div class="iw-clock-row iw-clock-holadd">
        <input type="text" class="iw-input" data-iw-clock-in="hname" placeholder="Название (или «Виктор: годовщина»)" maxlength="70">
        <input type="number" class="iw-input iw-clock-num" data-iw-clock-in="hd" placeholder="число" min="1" max="99">
        ${clockPick('hm', clock.monthNames[(clock.holMonth || 1) - 1] || '', (clock.monthNames || []).map((n, i) => [i + 1, n, i + 1 === clock.holMonth]), 'iw-pick-month')}
        <button type="button" class="iw-btn iw-mini-btn" data-iw-clock="hol-add">${icon('plus')}<span>Добавить</span></button>
      </div>` : ''}
      <div class="iw-clock-row">
        <button type="button" class="iw-btn iw-mini-btn" data-iw-clock="detect"${clock.busy ? ' disabled' : ''}>${icon('sparkle')}<span>${clock.busy ? 'Определяю…' : 'Определить заново по истории'}</span></button>
        ${cal.type !== 'greg' ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-clock="type:greg">Обычный календарь</button>` : ''}
        ${cal.type !== 'days' ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-clock="type:days">Просто считать дни</button>` : ''}
      </div>
    </details>
  </div>
</details>`;
}

export function renderPanel({ state, settings, theme, view, busy, busyKind = '', dreamBusy = false, shopBusy = false, status, avatarFor, mains, npcKeys, persona = null, roster, rosterBusy, seenOnly = [], noChat = false, settingsHtml = '', books = [], picked = [], linked = [], working = false, off = [], live = null, attrMode = 'likes', attrOpen = false, attrMore = {}, mobile = false, clock = null, nextIn = 0, showcase = null, ignored = [], giftTo = 'owner' }) {
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
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, true)}
  <div class="iw-settings-head"><span class="iw-label">${esc(L.settings)}</span><button type="button" class="iw-back iw-gear">${icon('back')}<span>к дневнику</span></button></div>
  <div class="iw-body">${settingsHtml}</div>
  ${footHtml()}
</div>`;
    }
    if (noChat) {
        return `
<div class="iw-book">
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, false)}
  <div class="iw-body"><div class="iw-empty">${esc(L.noChat)}</div></div>
  ${footHtml()}
</div>`;
    }
    const opts = { manualTurns: settings.moodMode === 'manual' ? settings.moodTurns : null, dreamBusy, points: settings.points !== false, attrMode, attrOpen, attrMore, collapsed: settings.collapsed || {} };
    const showNpc = settings.showNpc !== false;
    let body;
    let current = null;
    let personaNote = false;
    // пока дневник ни разу не заполнялся — на всех вкладках (персонаж, НПС, твой герой) одна и та же подсказка
    const diaryEmpty = !(state.order || []).some(k => state.characters[k]);
    if (view === 'showcase' && showcase) {
        body = renderShowcase({ state, theme, got: showcase.got || [], sel: showcase.sel || '' });
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
            : `${esc(pName)} с ${gw(g, 'ним', 'ней', 'ним')} лично не ${gw(pg, 'встречался', 'встречалась', 'встречался')}, поэтому настроения, желаний и отношения здесь нет. Когда они познакомятся в сцене, дневник заведёт полную запись.`;
        body = `
<button type="button" class="iw-back iw-back-npc" data-iw-view="npc">${icon('back')}<span>все НПС</span></button>
<section class="iw-dossier iw-dossier-heard${dead ? ' iw-dead' : ''}">
  <span class="iw-tape" aria-hidden="true"></span>
  ${dead ? '<span class="iw-dead-mark iw-dead-mark-lg" aria-hidden="true"></span>' : ''}
  <div class="iw-dossier-face">${npcBadge(badgeInfo(c, entry), 'iw-badge-lg')}</div>
  <div class="iw-dossier-main">
    <div class="iw-npc-title${nameFit(c.name)}">${esc(c.name)}</div>
    ${aliases.length ? `<div class="iw-npc-aka">ещё зовут: ${esc(aliases.join(', '))}</div>` : ''}
    <div class="iw-dossier-mood">${dead ? `<span class="iw-heard-chip iw-dead-chip">${icon('feather')}<span>нет в живых</span></span>` : ''}${hearsay ? `<span class="iw-heard-chip">${icon('feather')}<span>знает понаслышке</span></span>` : ''}</div>
  </div>
  <div class="iw-whois">
    <span class="iw-whois-tag">${esc(LL.whois)}</span>
    <div class="iw-whois-text">${who ? ce(who) : `<span class="iw-muted">${hearsay ? `${esc(pName)} знает только имя` : 'Пока неизвестно'}</span>`}</div>
    ${!hearsay && entry && entry.rel && mainName ? `<div class="iw-whois-traits"><span class="iw-muted">Связь:</span> ${esc(entry.rel)} · ${esc(mainName)}</div>` : ''}
  </div>
</section>
<div class="iw-grid"><section class="iw-block iw-b-heard">
  <div class="iw-block-head"><span class="iw-label">Что ${esc(pName)} о ${gw(g, 'нём', 'ней', 'нём')} знает</span></div>
  ${heard.length ? `<ul class="iw-heard-list">${heard.map((h, i) => `<li><span>${ce(h.fact)}</span>${h.from ? `<small class="iw-muted">${esc(h.from)}</small>` : ''}<button type="button" class="iw-mini iw-heard-x" data-iw-del="heard:${i}" title="Убрать: ${esc(pName)} этого не знает" aria-label="Убрать">${icon('x')}</button></li>`).join('')}</ul>` : `<p class="iw-muted">Пока только имя: подробностей ${esc(pName)} не ${gw(pg, 'слышал', 'слышала', 'слышал')}.</p>`}
  <p class="iw-muted iw-heard-note">${why}</p>
  <div class="iw-heard-acts">
    ${hearsay ? `<button type="button" class="iw-btn iw-mini-btn" data-iw-met="${esc(key)}:1">${icon('tick')}<span>Они знакомы лично</span></button>` : ''}
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
<section class="iw-dossier">
  <span class="iw-tape" aria-hidden="true"></span>
  <div class="iw-dossier-face">${npcBadge(badgeInfo(c, entry), 'iw-badge-lg')}</div>
  <div class="iw-dossier-main">
    <div class="iw-npc-title${nameFit(c.name)}">${esc(c.name)}${titleFace(c)}</div>
    ${aliases.length ? `<div class="iw-npc-aka">ещё зовут: ${esc(aliases.join(', '))}</div>` : ''}
    ${c.mood ? `<div class="iw-dossier-mood">${esc(LL.moodLead)} <span class="iw-hl iw-hl-main">${esc(c.mood)}</span></div>` : ''}
    <div class="iw-dossier-born">${tabBorn(c, clock, key)}</div>
  </div>
  <div class="iw-whois">
    <span class="iw-whois-tag">${esc(LL.whois)}</span>
    <div class="iw-whois-text">${who ? ce(who) : '<span class="iw-muted">Пока неизвестно</span>'}</div>
    ${loreTraits.length ? `<div class="iw-whois-traits"><span class="iw-muted">${esc(LL.whoisTraits)}:</span> ${esc(loreTraits.join(', '))}</div>` : ''}
    <button type="button" class="iw-heard-toggle" data-iw-dead="${esc(key)}:1" title="Отметить, что ${esc(c.name)} нет в живых: карточка станет серой, настроение и желания уберутся">нет в живых?</button>
    ${persona ? `<button type="button" class="iw-heard-toggle" data-iw-met="${esc(key)}:0" title="Если ${esc(persona.name)} и ${esc(c.name)} лично не встречались — дневник оставит только то, что о ${esc(c.name)} слышно">не знакомы лично?</button>` : ''}
  </div>
</section>
${renderCharacter(c, settings.modules, theme, Object.assign({ key }, opts))}`;
    } else if (view.startsWith('me:')) {
        const key = view.slice(3);
        const pc = key && state.characters[key];
        const bot = mains[0] && state.characters[mains[0]];
        const botName = (bot && bot.name) || mains[0] || '';
        const botG = genderOf(bot && bot.g, botName, bot && bot.who);
        if (pc) {
            current = key;
            personaNote = true;
            body = `${renderCharacter(pc, settings.modules, theme, Object.assign({ key, persona: true, botName, botG }, opts))}`;
        } else {
            body = `<div class="iw-waiting"><div class="iw-waiting-text"><p>${(() => { const pg = genderOf('n', (persona && persona.name) || '', ''); const his = gw(pg, 'его', 'её', 'его'); return `Дневник твоего героя заполнится после следующего разбора: ${his} настроение, желания, страхи, мечта, черты и то, как ${gw(pg, 'он', 'она', 'герой')} относится к ${gw(botG, 'нему', 'ней', 'персонажу')}${botName ? ` (${esc(botName)})` : ''}.`; })()} Описание персоны и её лорбук дневник прочитает при «Лорбук» и «Всё сразу».</p><p class="iw-muted">Он только для тебя: на ответы бота не влияет. Выключить можно в настройках, раздел «Главное».</p></div></div>`;
        }
    } else if (view.startsWith('shop:') && state.characters[view.slice(5)]) {
        const key = view.slice(5);
        const pcS = persona && persona.key && state.characters[persona.key];
        body = renderShop(state.characters[key], theme, key, { shopBusy, purse: settings.points !== false ? purseOf(state) : null, persona: pcS && persona.key !== key ? { key: persona.key, name: pcS.name, collection: pcS.collection || [] } : null, giftTo });
    } else if (view.startsWith('main:') && state.characters[view.slice(5)]) {
        current = view.slice(5);
        body = renderCharacter(state.characters[current], settings.modules, theme, Object.assign({ key: current, first: current === mains[0] }, opts));
    } else if (view.startsWith('main:')) {
        body = renderWaiting(view.slice(5), settings, theme, roster);
    } else {
        body = `<div class="iw-empty">${esc(L.empty)}</div>`;
    }
    const shopKey = settings.points !== false
        ? (view.startsWith('shop:') ? view.slice(5) : (current && state.characters[current] && !state.characters[current].persona ? current : (mains.find(k => state.characters[k]) || null)))
        : null;
    const wallet = settings.points !== false
        ? { current: shopKey, purse: purseOf(state), list: state.order.filter(k => state.characters[k] && !state.characters[k].persona && (mains.includes(k) || (state.characters[k].points || 0) > 0)).map(k => ({ key: k, name: state.characters[k].name, points: state.characters[k].points || 0 })) }
        : null;
    const npcInfo = showNpc ? { met: npcKeys.length, known: (roster && roster.npc && roster.npc.length) || 0 } : null;
    return `
<div class="iw-book">
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, false, wallet, shopKey && !(persona && shopKey === persona.key) ? { key: shopKey, on: view.startsWith('shop:') } : null, mobile ? analyzeButtons(busyKind, L, books, picked, linked, working || !!busyKind, off, !!persona) : '')}
  ${ROUGH_FILTER}
  ${renderTabs({ state, mains, view, avatarFor, npc: npcInfo, busyKind, persona, labels: L, books, picked, linked, working, off, noActs: mobile, clock: clock && clock.t ? clock : null })}
  <div class="iw-body${live && !live.hidden ? ' iw-live-on' : ''}">${live && !live.hidden ? renderLive(live, theme, L) : ''}${live && live.hidden ? livePeek(live) : ''}${renderClock(clock)}${body}</div>
  ${footHtml()}
</div>`;
}

// Свёрнутый листок: маленький ярлычок, по нажатию листок возвращается.
function livePeek(live) {
    const secs = Math.round((Date.now() - live.t0) / 1000);
    return `<div class="iw-live iw-live-mini"><button type="button" class="iw-live-peek" data-iw-live-show title="Вернуть листок">${icon('feather')}<span>Пишу дневник · <span class="iw-live-secs">${secs}</span> с</span><span class="iw-live-dots" aria-hidden="true"><i></i><i></i><i></i></span></button></div>`;
}

// Живой листок, пока модель пишет дневник: этап, секунды, что уже готово. За ним — размытый черновик.
const LIVE_STEPS = ['prep', 'think', 'write', 'done'];
function renderLive(live, theme, L) {
    const prepText = { chat: 'Листаю последние сообщения', catchup: 'Листаю историю чата', lore: 'Читаю карточку и лорбуки', all: 'Читаю карточку, лорбуки и чат', roster: 'Ищу, кто живёт в этом мире' }[live.kind] || 'Собираю, что было';
    const steps = [
        ['prep', prepText],
        ['think', live.thinking ? 'Модель размышляет' : 'Модель думает'],
        ['write', live.kind === 'roster' ? 'Модель составляет список' : 'Модель пишет дневник'],
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
          <span class="iw-live-title">${esc(L.analyzing || 'Записываю')}</span>
          <span class="iw-live-time"><span class="iw-live-secs">${secs}</span> с</span>
          <button type="button" class="iw-mini iw-live-hide" data-iw-live-hide title="Свернуть листок: разбор продолжится" aria-label="Свернуть">${icon('x')}</button>
        </div>
        <svg class="iw-live-scribble" viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true"><path ${delay} d="M2 8c14-6 22 5 36 0s22-6 36 0 22 5 36 0 22-6 36 0 22 5 36 0 20-5 34 0"/></svg>
        <div class="iw-live-scroll">
          <ol class="iw-live-steps">${list}${calStep}</ol>
          ${chars ? `<ul class="iw-live-chars">${chars}</ul>` : ''}
        </div>
        ${live.len ? `<div class="iw-live-len iw-muted">Написано ~${Math.round(live.len / 5)} слов</div>` : ''}
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
    const kicker = toastKicker(theme, ev.type, eventTitle(ev));
    return `
<div class="iw-toast-card iw-ev-${ev.type}" role="status">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon">${icon(ev.icon || EVENT_ICONS[ev.type] || 'star')}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(kicker)}</div>
    <div class="iw-toast-who">${esc(ev.who)}</div>
    <div class="iw-toast-text">${ce(eventText(ev))}</div>
    ${ev.points ? `<div class="iw-toast-points">+${esc(String(ev.points))} ${icon(currencyIcon(theme))}<span>${esc(themeLabels(theme, 'm').currency || '')}</span></div>` : ''}
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
}

// Скетчевая стрелка «сюда»: в рисованных темах — от руки, в технических — ломаная линия.
const TECH_THEMES = ['cyber', 'logbook', 'dossier'];
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
    const budgetRow = auto
        ? caps.map(v => quickOpt('budgetCap', v, String(v), Number(s.budgetCap) === v)).join('')
        : fixed.map(v => quickOpt('responseLength', v, String(v), Number(s.responseLength) === v)).join('');
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
    <div class="iw-quick-step">
      <span class="iw-quick-num">1</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько токенов давать модели на ответ</div>
        <div class="iw-qrow">${quickOpt('budgetMode', 'auto', 'сам, по размеру сцены', auto)}${quickOpt('budgetMode', 'fixed', 'как я задам', !auto)}</div>
        <div class="iw-qrow iw-qrow-sub"><span class="iw-qlabel">${auto ? 'Потолок:' : 'На каждый ответ:'}</span>${budgetRow}</div>
        <div class="iw-quick-hint iw-hint-arrow">${sketchArrow(theme, 'iw-arrow-long')}<span>${auto ? 'Дневник сам считает, сколько нужно, и никогда не выходит за потолок. Платишь только за то, что модель написала.' : 'Каждый запрос получит ровно столько.'} Думающим моделям (Gemini 3 Pro и похожие) лучше от 6000: часть запаса уходит на размышления.</span></div>
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
        <div class="iw-quick-title">Какая модель пишет дневник</div>
        <div class="iw-qrow">${quickOpt('source', 'main', 'та же, что в чате', s.source !== 'custom')}${quickOpt('source', 'custom', 'отдельная — настроить', s.source === 'custom')}</div>
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

// Кнопка-дневничок.
export function renderFab() {
    return `
<span class="iw-fab-book" aria-hidden="true">
  <span class="iw-fab-spine"></span>
  <span class="iw-fab-cover">${icon('heart', 'iw-fab-heart')}</span>
  <span class="iw-fab-ribbon"></span>
</span>
<span class="iw-fab-dot" hidden></span>`;
}
