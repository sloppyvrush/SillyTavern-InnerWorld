// Разметка дневника и всплывашек. Только строки — без обращений к таверне.
import { moodletLeftLabel, WEIGHT_NAMES, WEIGHT_TURNS, eventTitle, eventText, signed, shownAliases, SHOWN_MOODLETS, FACE_NAMES, guessFace, moodFaces, plural, genderOf, gw, PTYPES, PTYPE_GROUPS, ptypeGroup, TEMPERS, ZODIAC, bornText } from './core.js';
import { themeLabels, EVENT_ICONS, BLOCK_ICONS, toastKicker, errorKicker, icon, faceIcon, currencyIcon, bimboNicks } from './themes.js';
import { npcBadge } from './npc-icons.js';

// Данные для подбора значка НПС: роль из лорбука или от модели, черты, имя, пол.
function badgeInfo(c, entry) {
    return { who: (entry && entry.who) || c.who || '', traits: (entry && entry.traits) || [], name: c.name, g: genderOf(c.g && c.g !== 'n' ? c.g : (entry && entry.g), c.name, (entry && entry.who) || c.who || '') };
}

// Невидимый фильтр «дрожащей линии» для рисованных тем.
const ROUGH_FILTER = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="iw-rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></svg>';

export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13c2 1.4 3.4 3 4.6 5 3-5.6 6.6-9.6 11.4-12.5"/></svg>';
const SCRIBBLE = '<svg class="iw-scribble" width="220" height="12" viewBox="0 0 260 12" fill="none" aria-hidden="true"><path d="M2 8c20-6 40 4 60-1s40-5 60 0 40 4 60-1 40-4 76 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

function delBtn(kind, i) {
    return `<button type="button" class="iw-del" data-iw-del="${kind}:${i}" title="Убрать из дневника" aria-label="Убрать из дневника">${icon('x')}</button>`;
}

function blockHead(kind, label, extra = '') {
    return `<div class="iw-block-head"><span class="iw-block-icon">${icon(BLOCK_ICONS[kind])}</span><span class="iw-label">${label}</span>${extra}</div>`;
}

function groupHead(label, hint = '') {
    return `<div class="iw-group-head"><span>${esc(label)}</span>${hint ? `<span class="iw-group-hint">${esc(hint)}</span>` : ''}</div>`;
}

// Кошелёк в шапке: очки текущего персонажа, по нажатию — у всех.
function renderWallet(wallet, theme = '') {
    const coin = icon(currencyIcon(theme));
    if (!wallet || !wallet.list.length) return '';
    const cur = wallet.list.find(x => x.key === wallet.current) || wallet.list[0];
    const items = wallet.list.map(x => `<li><button type="button" class="iw-wallet-row${x.key === cur.key ? ' on' : ''}" data-iw-view="shop:${esc(x.key)}"><span>${esc(x.name)}</span><b>${coin}${x.points}</b></button></li>`).join('');
    return `<details class="iw-wallet"><summary title="Очки за желания и мечту">${coin}<b>${cur.points}</b></summary><ul class="iw-wallet-list">${items}</ul></details>`;
}

export function renderHeader(settings, theme, busy, inSettings = false, wallet = null) {
    const L = themeLabels(theme, 'm');
    const sound = settings.sound !== false;
    return `
<div class="iw-head">
  <div class="iw-titlebox"><div class="iw-title">${esc(L.title)}</div>${SCRIBBLE}</div>
  <div class="iw-tools">
    ${renderWallet(wallet, theme)}
    <details class="iw-vol${sound ? '' : ' off'}">
      <summary class="iw-tool" title="Звук и громкость" aria-label="Звук и громкость">${icon(sound ? 'sound' : 'mute')}</summary>
      <div class="iw-vol-menu">
        <button type="button" class="iw-vol-toggle iw-sound${sound ? '' : ' off'}" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}<span>${sound ? 'Звук включён' : 'Звук выключен'}</span></button>
        <div class="iw-vol-row"><span>Громкость</span><output class="iw-range-val">${Number(settings.volume ?? 45)}%</output></div>
        <input type="range" class="iw-range iw-vol-range" data-iw-volume min="0" max="100" step="5" value="${Number(settings.volume ?? 45)}" aria-label="Громкость звуков"${sound ? '' : ' disabled'}>
      </div>
    </details>
    <button type="button" class="iw-tool iw-gear${inSettings ? ' on' : ''}" title="${inSettings ? 'Вернуться к дневнику' : 'Настройки'}" aria-label="Настройки" aria-pressed="${inSettings}">${icon('gear')}</button>
    <button type="button" class="iw-tool iw-close" title="Закрыть" aria-label="Закрыть">${icon('x')}</button>
  </div>
</div>`;
}

// Лицо-смайлик на вкладке: цвет и выражение по настроению.
function faceBadge(c) {
    const [face] = moodFaces(c);
    if (!face) return '';
    return `<span class="iw-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face)}</span>`;
}

// Кнопки разбора: над ними надпись «Проанализировать» с рисованной стрелкой к кнопкам;
// пока идёт разбор, надпись сменяется загрузкой в стиле темы (точки, сердечки, полоска).
// Меню у кнопки «Лорбук»: галочками отмечаются лорбуки для этого чата —
// их берут и «Лорбук», и «Всё сразу». Привязанные к персонажу и чату читаются всегда.
function booksMenu(books = [], picked = [], linked = [], busy = false) {
    const on = new Set(picked);
    const own = new Set(linked);
    const box = `<span class="iw-book-box" aria-hidden="true">${icon('tick')}</span>`;
    const ownRows = books.filter(n => own.has(n)).map(name => `<div class="iw-book-opt on linked">${box}<span>${esc(name)}</span><em>свой</em></div>`).join('');
    const rows = books.filter(n => !own.has(n)).map(name => `<button type="button" class="iw-book-opt${on.has(name) ? ' on' : ''}" data-iw-pick-book="${esc(name)}" aria-pressed="${on.has(name)}">${box}<span>${esc(name)}</span></button>`).join('');
    const n = books.filter(x => !own.has(x) && on.has(x)).length;
    return `
      <details class="iw-books">
        <summary class="iw-books-btn" title="Выбрать лорбуки для разбора" aria-label="Выбрать лорбуки">${icon('chevron')}</summary>
        <div class="iw-books-menu">
          <div class="iw-books-cap">Какие лорбуки разбирать <span class="iw-books-count">${n ? `отмечено: ${n}` : ''}</span></div>
          <div class="iw-books-list">
            <div class="iw-book-opt on linked">${box}<span>Карточка персонажа</span><em>всегда</em></div>
            ${ownRows}${rows || (ownRows ? '' : '<div class="iw-books-empty">Других лорбуков в таверне нет.</div>')}
          </div>
          <button type="button" class="iw-book-go" data-iw-analyze="lore"${busy ? ' disabled' : ''}>${icon('bookopen')}<span>Разобрать отмеченные</span></button>
          <div class="iw-books-hint">Галочки запоминаются для этого чата. «Всё сразу» тоже берёт отмеченные лорбуки. Сведения добавляются к уже собранным, ничего не стирается.</div>
        </div>
      </details>`;
}

function analyzeButtons(busyKind, labels = {}, books = [], picked = [], linked = [], working = false) {
    const btn = (kind, ic, label, title) => {
        // Кнопка, которая сейчас работает, сама становится «Стоп» — на том же месте и того же размера.
        if (busyKind === kind) {
            return `<button type="button" class="iw-act iw-act-${kind} busy iw-act-stop" data-iw-stop title="Остановить разбор" aria-label="Остановить разбор"><span class="iw-stop-ring" aria-hidden="true">${icon('stop')}</span><span>Стоп</span></button>`;
        }
        return `<button type="button" class="iw-act iw-act-${kind}" data-iw-analyze="${kind}" title="${title}"${working ? ' disabled' : ''}>${icon(ic)}<span>${label}</span></button>`;
    };
    const cap = working
        ? `<span class="iw-loader" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="iw-cap-text">${esc(labels.analyzing || 'Записываю')}</span>`
        : `<span class="iw-cap-text">${esc(labels.analyze || 'Проанализировать')}</span><span class="iw-cap-arrow" aria-hidden="true">${icon('pointer')}</span>`;
    return `
  <div class="iw-acts-wrap">
    <div class="iw-acts-cap${working ? ' busy' : ''}" role="status">${cap}</div>
    <div class="iw-acts" role="group" aria-label="Проанализировать" aria-busy="${working}">
      ${btn('chat', 'chat', 'Чат', 'Разобрать последние сообщения')}
      <span class="iw-act-split">${btn('lore', 'bookopen', 'Лорбук', 'Разобрать карточку и лорбуки: НПС и сведения о персонажах')}${booksMenu(books, picked, linked, working)}</span>
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
export function renderTabs({ state, mains, view, avatarFor, npc, busyKind = '', shopKey = null, shopLabel = 'Магазин наград', labels = {}, books = [], picked = [], linked = [], working = false }) {
    const tabs = mains.map(key => {
        const c = state.characters[key] || { name: key };
        const on = view === 'main:' + key || view === 'shop:' + key;
        return `<button type="button" class="iw-tab${on ? ' on' : ''}" data-iw-view="main:${esc(key)}" aria-pressed="${on}"><span class="iw-tape"></span><span class="iw-photo-wrap">${photoHtml(c, avatarFor)}${faceBadge(c)}</span><span class="iw-tab-name">${esc(c.name)}</span>${c.mood ? `<span class="iw-tab-mood">${esc(c.mood)}</span>` : ''}</button>`;
    }).join('');
    const sticker = npc
        ? `<button type="button" class="iw-npc-sticker${view.startsWith('npc') ? ' on' : ''}" data-iw-view="npc" aria-pressed="${view.startsWith('npc')}">
             <span class="iw-npc-sticker-title">${icon('users')} НПС</span>
             <span class="iw-npc-sticker-count">${npc.met}${npc.known ? ` из ${npc.known}` : ''}</span>
           </button>`
        : '';
    const shop = shopKey
        ? `<button type="button" class="iw-shop-sticker${view.startsWith('shop:') ? ' on' : ''}" data-iw-view="shop:${esc(shopKey)}" aria-pressed="${view.startsWith('shop:')}">${icon('shop')}<span>${esc(shopLabel)}</span></button>`
        : '';
    return `<div class="iw-tabrow"><div class="iw-tabs">${tabs}${sticker}${shop}</div><span class="iw-divider" aria-hidden="true"></span>${analyzeButtons(busyKind, labels, books, picked, linked, working || !!busyKind)}</div>`;
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
          <span class="iw-feel-name">${esc(m.emotion)}</span>
          <span class="iw-feel-power">${esc(WEIGHT_NAMES[m.weight] || '')}</span>
          ${delBtn('moodlets', i)}
        </div>
        ${m.feel ? `<div class="iw-feel-inner">${esc(m.feel)}</div>` : ''}
        ${m.why ? `<div class="iw-feel-why"><span class="iw-feel-cause">из-за:</span> ${esc(m.why)}</div>` : ''}
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
      ${feels ? `<ul class="iw-feels iw-feels-flat">${feels}</ul>${more}` : '<div class="iw-muted">ничего особенного</div>'}
    </section>`;
}

function scoreBadge(score) {
    const tone = score > 0 ? 'good' : (score < 0 ? 'bad' : 'mid');
    return `<span class="iw-score iw-score-${tone}">${esc(signed(score))}</span>`;
}

// Маленький график: как менялось отношение от −3 до +3.
// Как менялось отношение: линия по шкале от −3 до +3, точки — отдельными значками (не сплющиваются),
// на конце — стрелка: теплеет, остывает или ровно. Вид линии и значков у каждой темы свой.
function attitudeChart(points) {
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
    const end = `<span class="iw-chart-end iw-trend-${trend}" style="left:${pct(xs[xs.length - 1], w)}%;top:${pct(y(last), h)}%" title="${trendName}">${icon(trend === 'up' ? 'arrowup' : trend === 'down' ? 'arrowdown' : 'arrowright')}</span>`;
    return `
      <div class="iw-chart-wrap" role="img" aria-label="Как менялось отношение: ${points.map(p => signed(p.s)).join(', ')} — ${trendName}">
        <svg class="iw-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
          <line class="iw-chart-zero" x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}"/>
          <polyline points="${coords.join(' ')}"/>
        </svg>
        ${dots}${end}
      </div>`;
}

function renderAttitude(c, L) {
    if (!c.impression) return '';
    const im = c.impression;
    const nowScore = im.nowScore ?? im.score;
    return `
    <section class="iw-block iw-b-impression">
      <span class="iw-tape iw-tape-blue"></span>
      ${blockHead('impression', esc(L.attitude))}
      <div class="iw-att-row">
        <div class="iw-att-cell">
          <div class="iw-att-cap">${esc(L.first)}</div>
          <div class="iw-imp-row">${scoreBadge(im.score)}<span class="iw-imp-label">${esc(im.label)}</span></div>
          ${im.why ? `<div class="iw-imp-why">${esc(im.why)}</div>` : ''}
        </div>
        ${im.now ? `
        <div class="iw-att-cell">
          <div class="iw-att-cap">${esc(L.now)}</div>
          <div class="iw-imp-row">${scoreBadge(nowScore)}<span class="iw-imp-now">${esc(im.now)}</span></div>
        </div>` : ''}
      </div>
      ${attitudeChart(c.attitude)}
    </section>`;
}

function renderWants(c, L) {
    const items = (c.wants || []).map((w, i) => {
        const done = w.status === 'done';
        const dropped = w.status === 'dropped';
        const pin = !done && !dropped
            ? `<button type="button" class="iw-mini iw-want-pin${w.pinned ? ' on' : ''}" data-iw-want-pin="${i}" title="${w.pinned ? 'Закреплено: не изменится, пока не исполнится. Нажми, чтобы открепить' : 'Закрепить желание: оно останется, пока не исполнится'}" aria-pressed="${!!w.pinned}">${icon(w.pinned ? 'pin' : 'unpin')}</button>`
            : '';
        return `
      <li class="iw-want${done ? ' done' : ''}${dropped ? ' dropped' : ''}${w.pinned && !done ? ' pinned' : ''}">
        <span class="iw-box">${done ? ICON_CHECK : ''}</span>
        <span class="iw-want-text">${esc(w.text)}${done ? ' <b class="iw-tag">сбылось</b>' : ''}${dropped ? ' <b class="iw-tag">уже неважно</b>' : ''}</span>
        <span class="iw-row-tools">${pin}${delBtn('wants', i)}</span>
      </li>`;
    }).join('');
    return `
    <section class="iw-block iw-b-wants">
      ${blockHead('wants', esc(L.wants))}
      ${items ? `<ul class="iw-list">${items}</ul>` : '<div class="iw-muted">ничего особенного</div>'}
    </section>`;
}

const FEAR_POWER = { 1: 'слабый', 2: 'сильный', 3: 'очень сильный' };

function renderFears(c, L) {
    const items = (c.fears || []).map((f, i) => `
      <li class="iw-fear iw-fs-${f.strength}${f.status !== 'active' ? ' ' + f.status : ''}">
        <span class="iw-fear-mark" aria-hidden="true">${icon('ghost')}</span>
        <span class="iw-fear-text">${esc(f.text)}${f.status === 'realized' ? ' <b class="iw-tag">сбылся</b>' : ''}${f.status === 'gone' ? ' <b class="iw-tag">прошёл</b>' : ''}</span>
        <span class="iw-row-tools"><span class="iw-fear-power">${esc(f.level || FEAR_POWER[f.strength])}</span>${delBtn('fears', i)}</span>
      </li>`).join('');
    return `
    <section class="iw-block iw-b-fears">
      ${blockHead('fears', esc(L.fears))}
      ${items ? `<ul class="iw-list">${items}</ul>` : '<div class="iw-muted">ничего не пугает</div>'}
    </section>`;
}

function dreamTools(c, busy) {
    const pinned = !!(c.dream && c.dream.pinned);
    return `<span class="iw-dream-tools">
      <button type="button" class="iw-mini${pinned ? ' on' : ''}" data-iw-dream="pin" title="${pinned ? 'Мечта закреплена — не изменится. Нажми, чтобы отпустить' : 'Закрепить мечту: она не будет меняться'}" aria-pressed="${pinned}">${icon(pinned ? 'pin' : 'unpin')}</button>
      <button type="button" class="iw-mini${busy ? ' busy' : ''}" data-iw-dream="regen" title="${pinned ? 'Сначала открепи мечту' : 'Придумать мечту заново'}"${pinned || busy ? ' disabled' : ''}>${icon(busy ? 'rotate' : 'dice')}</button>
    </span>`;
}

function renderDream(c, L, opts = {}) {
    if (!c.dream) {
        return `<section class="iw-block iw-b-dream">${blockHead('dream', esc(L.dream), dreamTools(c, opts.dreamBusy))}<div class="iw-muted">ещё не ясна</div></section>`;
    }
    const steps = c.dream.steps;
    const done = steps.filter(s => s.done).length;
    return `
    <section class="iw-block iw-b-dream${c.dream.pinned ? ' pinned' : ''}">
      ${blockHead('dream', esc(L.dream), `<span class="iw-count">${done} из ${steps.length}</span>${dreamTools(c, opts.dreamBusy)}`)}
      <div class="iw-dream-title">${esc(c.dream.title)}${c.dream.plus ? ` <span class="iw-dream-plus">${esc(c.dream.plus)}</span>` : ''}</div>
      <ol class="iw-steps">${steps.map(s => `<li class="iw-step${s.done ? ' done' : ''}"><span class="iw-star">${s.done ? '★' : '☆'}</span><span>${esc(s.text)}</span></li>`).join('')}</ol>
    </section>`;
}

function traitChip(t, i) {
    const gone = t.kind === 'gone';
    const acquired = t.kind === 'new' || !!t.kept || (gone && t.was === 'new');
    const mark = t.kind === 'up' ? '<span class="iw-trait-mark">усилилась</span>' : (t.kind === 'down' ? '<span class="iw-trait-mark">слабеет</span>' : (gone ? '<span class="iw-trait-mark">ушла</span>' : ''));
    const tools = gone
        ? `<button type="button" class="iw-trait-tool" data-iw-trait="back:${i}" title="Вернуть черту: событие её не сломало" aria-label="Вернуть черту">${icon('rotate')}</button>`
        : `${t.kind === 'new' ? `<button type="button" class="iw-trait-tool" data-iw-trait="keep:${i}" title="Сделать постоянной: перенести в основные черты" aria-label="Сделать постоянной">${icon('tobase')}</button>` : ''}${delBtn('traits', i)}`;
    const left = gone && t.left ? `<span class="iw-trait-left">${t.left > 1 ? 'исчезнет через ' + t.left + ' ' + plural(t.left, 'ответ', 'ответа', 'ответов') : 'исчезнет после следующего ответа'}</span>` : '';
    // «Подробнее»: откуда черта у персонажа, а у приобретённой — какое событие её породило.
    const more = [];
    if (t.about) more.push(`<p>${esc(t.about)}</p>`);
    if (t.why && (t.kept || t.kind === 'base')) more.push(`<p class="iw-trait-origin"><b>Появилась:</b> ${esc(t.why)}</p>`);
    if (!more.length) more.push(`<p class="iw-muted">${acquired ? 'Подробности появятся после следующего разбора.' : 'Откуда эта черта, станет ясно после разбора «Всё сразу» или «Лорбук».'}</p>`);
    return `
      <span class="iw-trait iw-k-${t.kind}${acquired ? ' iw-acquired' : ''}">
        <span class="iw-trait-head">
        <details class="iw-trait-det">
          <summary class="iw-trait-name" title="Подробнее о черте"><span class="iw-trait-label">${esc(t.name)}</span>${mark}${t.kept ? '<span class="iw-trait-kept">приобретена</span>' : ''}<span class="iw-trait-chev" aria-hidden="true">${icon('chevron')}</span></summary>
          <span class="iw-trait-more">${more.join('')}</span>
        </details>
        <span class="iw-trait-tools">${tools}</span>
        </span>
        ${t.why && t.kind !== 'base' && !t.kept ? `<span class="iw-trait-why">${esc(t.why)}</span>` : ''}
        ${left}
      </span>`;
}

// Тип личности (16 типов) и темперамент — отдельный блок «про персонажа»:
// общее описание типа и то, как он проявляется именно в этом персонаже.
const PTYPE_TEXT = {
    INTJ: 'Стратег с планом на всё: независим, рационален, видит систему там, где другие видят хаос.',
    INTP: 'Изобретательный мыслитель: любопытен, ищет логику во всём, легко уходит в свои мысли.',
    ENTJ: 'Прирождённый лидер: решителен, требователен, умеет вести людей к цели.',
    ENTP: 'Остроумный спорщик: любит идеи и вызовы, ломает шаблоны, быстро соображает.',
    INFJ: 'Тихий идеалист: глубоко чувствует людей, живёт по внутренним принципам, стремится помогать.',
    INFP: 'Мечтатель с большим сердцем: живёт ценностями, раним, ищет смысл и гармонию.',
    ENFJ: 'Вдохновляющий лидер: харизматичен, заботится о других и умеет их сплотить.',
    ENFP: 'Энтузиаст: открыт, общителен, загорается идеями и людьми.',
    ISTJ: 'Надёжный и последовательный: ценит факты, порядок и данное слово.',
    ISFJ: 'Тёплый хранитель: внимателен к близким, предан, тихо заботится.',
    ESTJ: 'Организатор: любит порядок и правила, берёт ответственность на себя.',
    ESFJ: 'Душа компании: заботлив, общителен, ему важно, чтобы всем было хорошо.',
    ISTP: 'Практик: хладнокровен, изобретателен, лучше всего понимает мир руками.',
    ISFP: 'Свободный художник: живёт моментом, чуток к красоте, не любит рамок.',
    ESTP: 'Человек действия: смел, азартен, хорошо чувствует обстановку здесь и сейчас.',
    ESFP: 'Звезда момента: спонтанен, энергичен, любит людей и внимание.',
};
const PTYPE_TAIL = { A: 'уверенный: спокойно держит удар', T: 'беспокойный: требователен к себе, остро переживает' };
const TEMPER_TEXT = {
    choleric: 'Быстрый и горячий: решителен, вспыльчив, легко заводится и так же быстро остывает.',
    sanguine: 'Живой и лёгкий: общителен, оптимистичен, быстро переключается и не держит зла.',
    phlegmatic: 'Спокойный и ровный: медленно раскачивается, но надёжен и устойчив к нервам.',
    melancholic: 'Чуткий и глубокий: остро переживает, раним, внимателен к мелочам и настроениям.',
};

function renderPersona(c, L) {
    const code = c.ptype ? c.ptype.slice(0, 4) : '';
    const name = PTYPES[code];
    const grp = ptypeGroup(code);
    const tail = c.ptype && c.ptype.length > 5 ? c.ptype.slice(5) : '';
    const cards = [];
    if (name) {
        cards.push(`
        <div class="iw-persona-card iw-pt-${grp}">
          <div class="iw-persona-top">
            <span class="iw-persona-code">${esc(code)}${tail ? `<i>-${esc(tail)}</i>` : ''}</span>
            <span class="iw-persona-name">${esc(name)}<small>${esc(PTYPE_GROUPS[grp] || '')}${tail ? ` · ${esc(PTYPE_TAIL[tail].split(':')[0])}` : ''}</small></span>
          </div>
          <p class="iw-persona-general">${esc(PTYPE_TEXT[code])}${tail ? ` ${esc(PTYPE_TAIL[tail].charAt(0).toUpperCase() + PTYPE_TAIL[tail].slice(1))}.` : ''}</p>
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
          <p class="iw-persona-general">${esc(TEMPER_TEXT[c.temper])}</p>
          ${c.temperNote ? `<p class="iw-persona-own">${esc(c.temperNote)}</p>` : ''}
        </div>`);
    }
    const z = ZODIAC[c.zodiac];
    if (z || c.born) {
        const g = genderOf(c.g, c.name, c.who);
        const born = c.born ? `${gw(g, 'родился', 'родилась', 'день рождения:')} ${esc(bornText(c.born))}` : 'дата рождения не указана';
        cards.push(`
        <div class="iw-persona-card iw-zd-${z ? z.el : 'none'}">
          <div class="iw-persona-top">
            <span class="iw-persona-code iw-zodiac-glyph">${z ? `${z.glyph}\uFE0E` : icon('zodiac')}</span>
            <span class="iw-persona-name">${esc(z ? z.name : 'знак не ясен')}<small>${born}</small></span>
          </div>
          ${z ? `<p class="iw-persona-general">${esc(z.text)}</p>` : ''}
        </div>`);
    }
    return `
    <section class="iw-block iw-b-persona">
      ${blockHead('persona', esc(L.persona || 'Тип личности'))}
      ${cards.length ? `<div class="iw-persona-grid">${cards.join('')}</div>` : '<div class="iw-muted">определится при следующем разборе: «Всё сразу» или «Лорбук»</div>'}
    </section>`;
}

function renderTraits(c, L) {
    const list = (c.traits || []).map((t, i) => ({ t, i }));
    const isNew = t => t.kind === 'new' || (t.kind === 'gone' && t.was === 'new');
    const base = list.filter(x => !isNew(x.t));
    const gained = list.filter(x => isNew(x.t));
    if (!list.length) {
        return `<section class="iw-block iw-b-traits">${blockHead('traits', esc(L.traits))}<span class="iw-muted">пока не разобрались</span></section>`;
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
          <div class="iw-traits">${gained.map(x => traitChip(x.t, x.i)).join('') || '<span class="iw-muted iw-group-empty">пока ничего</span>'}</div>
        </div>
      </div>
    </section>`;
}

function renderChronicle(c, L) {
    const items = (c.log || []).map(e => `
      <li class="iw-log iw-ev-${e.type}">
        <span class="iw-log-icon">${icon(EVENT_ICONS[e.type] || 'star')}</span>
        <span class="iw-log-body"><b>${esc(eventTitle(e))}</b> ${esc(e.text)}</span>
        ${e.m !== null && e.m !== undefined ? `<span class="iw-log-at">#${esc(e.m)}</span>` : ''}
      </li>`).join('');
    return `
    <section class="iw-block iw-b-chronicle">
      ${blockHead('chronicle', esc(L.chronicle))}
      ${items ? `<ul class="iw-list iw-logs">${items}</ul>` : `<div class="iw-muted">${esc(L.chronicleEmpty)}</div>`}
    </section>`;
}

// Что сейчас действует и коллекция.
function activeRewards(c) {
    const buffs = (c.buffs || []).map(b => `<li class="iw-buff iw-buff-${b.kind} iw-rk-${b.kind}"><span class="iw-rw-ico">${icon(b.icon || 'gift')}</span><span><b>${esc(b.title)}</b> <span class="iw-muted">${b.kind === 'event' ? 'в следующем ответе' : `ещё ${b.left} ${plural(b.left, 'ответ', 'ответа', 'ответов')}`}</span></span></li>`).join('');
    const coll = (c.collection || []).map(x => `<span class="iw-coll" title="${esc(x.title)}${x.desc ? ' — ' + esc(x.desc) : ''}">${icon(x.icon || 'gift')}</span>`).join('');
    return `${buffs ? `<div class="iw-group-cap">сейчас действует</div><ul class="iw-list iw-buffs">${buffs}</ul>` : ''}${coll ? `<div class="iw-group-cap">коллекция</div><div class="iw-colls iw-rk-collect">${coll}</div>` : ''}`;
}

// Категории наград: у каждой свой цвет и понятная подпись.
const REWARD_GROUPS = [
    { kind: 'buff', icon: 'potion', name: 'На время', hint: 'эффект на несколько ответов: настроение, сила, удача' },
    { kind: 'event', icon: 'sparkle', name: 'Событие', hint: 'случится в сюжете в следующем ответе' },
    { kind: 'collect', icon: 'gem', name: 'В коллекцию', hint: 'памятная вещь, остаётся навсегда' },
];

export function renderShop(c, theme, key, { shopBusy = false } = {}) {
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who));
    const pts = c.points || 0;
    const row = r => `
      <li class="iw-reward iw-rk-${r.kind}${pts < r.cost ? ' locked' : ''}">
        <span class="iw-rw-ico iw-rw-big">${icon(r.icon || 'gift')}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${esc(r.title)}</b><span class="iw-rw-desc">${esc(r.desc || r.effect || '')}</span>${r.kind === 'buff' ? `<span class="iw-rw-kind">действует ${r.turns} ${plural(r.turns, 'ответ', 'ответа', 'ответов')}</span>` : ''}</span>
        <button type="button" class="iw-buy" data-iw-buy="${esc(r.id)}"${pts < r.cost ? ' disabled' : ''} title="${pts < r.cost ? 'Не хватает очков' : 'Купить'}">${icon(currencyIcon(theme))}<span>${r.cost}</span></button>
      </li>`;
    const shop = c.shop || [];
    const groups = REWARD_GROUPS.map(g => {
        const list = shop.filter(r => r.kind === g.kind);
        if (!list.length) return '';
        return `
    <div class="iw-rw-group iw-rg-${g.kind}">
      <div class="iw-rw-cat"><span class="iw-rw-cat-name">${icon(g.icon)}${g.name}</span><span class="iw-rw-cat-hint">${g.hint}</span></div>
      <ul class="iw-list iw-rewards">${list.map(row).join('')}</ul>
    </div>`;
    }).join('');
    return `
<button type="button" class="iw-back" data-iw-view="main:${esc(key)}">${icon('back')}<span>к дневнику</span></button>
<section class="iw-block iw-b-shop">
  ${blockHead('rewards', esc(L.shop), `<span class="iw-points">${icon(currencyIcon(theme))}<b>${pts}</b></span>`)}
  <div class="iw-muted">Очки: желание +10, этап мечты +25, мечта целиком +100. Награды подобраны под ${esc(c.name)}.</div>
  ${activeRewards(c)}
  ${groups || '<div class="iw-empty">Наград пока нет — нажми «Подобрать награды».</div>'}
  <button type="button" class="iw-btn${shopBusy ? ' busy' : ''}" data-iw-shop="regen"${shopBusy ? ' disabled' : ''}>${icon(shopBusy ? 'rotate' : 'dice')}<span>${groups ? 'Подобрать заново' : 'Подобрать награды'}</span></button>
</section>`;
}

export function renderCharacter(c, modules, theme, opts = {}) {
    const L = themeLabels(theme, genderOf(c.g, c.name, c.who), bimboNicks(c.name, !!opts.first));
    const blocks = [];
    if (modules.mood) blocks.push(renderMood(c, L, opts));
    if (modules.impression) blocks.push(renderAttitude(c, L));
    if (modules.wants) blocks.push(renderWants(c, L));
    if (modules.fears) blocks.push(renderFears(c, L));
    if (modules.dream) blocks.push(renderDream(c, L, opts));
    if (modules.traits) blocks.push(renderTraits(c, L));
    if (modules.traits) blocks.push(renderPersona(c, L));
    if (modules.chronicle) blocks.push(renderChronicle(c, L));
    return `<div class="iw-grid">${blocks.join('')}</div>`;
}

// Список НПС: встреченные — карточками, ещё не появлявшиеся — знаками вопроса.
export function renderNpcList({ state, npcKeys, roster, rosterBusy, avatarFor, seenOnly = [] }) {
    const used = new Set();
    const cards = [];
    for (const key of npcKeys) {
        const c = state.characters[key];
        const entry = roster && roster.find ? roster.find(key) : null;
        if (entry) used.add(entry.name);
        cards.push(`
      <button type="button" class="iw-npc met" data-iw-view="npc:${esc(key)}" title="Открыть: ${esc(c.name)}">
        ${npcBadge(badgeInfo(c, entry))}
        <span class="iw-npc-name">${esc(c.name)}</span>
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
        <span class="iw-npc-name">${esc(e.name)}</span>
        <span class="iw-npc-mood">${e.checked ? gw(g, 'только упоминался', 'только упоминалась', 'только упоминание') : 'ждёт разбора'}</span>
      </div>`);
    }
    const unknown = ((roster && roster.npc) || []).filter(e => !used.has(e.name) && !npcKeys.some(k => roster.find(k) === e));
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
  ${cards.length ? `<div class="iw-npc-grid">${cards.join('')}</div>` : (unknown.length ? '<div class="iw-muted">Пока никто из них не появлялся в сцене.</div>' : '<div class="iw-empty">Пока никого. Нажми «Изучить лорбук и карточку» — и я узнаю, кто живёт в этом мире. В дневнике они появятся, когда придут в сцену.</div>')}
  ${unknown.length ? `<div class="iw-group">${groupHead(`Ещё не встречались · ${unknown.length}`, 'появятся, когда придут в сцену')}<div class="iw-npc-unknowns">${unknownTiles}</div></div>` : ''}
</div>`;
}

export function renderPanel({ state, settings, theme, view, busy, busyKind = '', dreamBusy = false, shopBusy = false, status, avatarFor, mains, npcKeys, roster, rosterBusy, seenOnly = [], noChat = false, settingsHtml = '', books = [], picked = [], linked = [], working = false }) {
    const L = themeLabels(theme, 'm');
    if (view === 'settings') {
        return `
<div class="iw-book">
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, true)}
  <div class="iw-settings-head"><span class="iw-label">${esc(L.settings)}</span><button type="button" class="iw-back iw-gear">${icon('back')}<span>к дневнику</span></button></div>
  <div class="iw-body">${settingsHtml}</div>
  <div class="iw-foot"><span class="iw-status">${esc(status || '')}</span></div>
</div>`;
    }
    if (noChat) {
        return `
<div class="iw-book">
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, false)}
  <div class="iw-body"><div class="iw-empty">${esc(L.noChat)}</div></div>
  <div class="iw-foot"><span class="iw-status"></span></div>
</div>`;
    }
    const opts = { manualTurns: settings.moodMode === 'manual' ? settings.moodTurns : null, dreamBusy, points: settings.points !== false };
    const showNpc = settings.showNpc !== false;
    let body;
    let current = null;
    if (view === 'npc' && showNpc) {
        body = renderNpcList({ state, npcKeys, roster, rosterBusy, avatarFor, seenOnly });
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
    <div class="iw-npc-title">${esc(c.name)}</div>
    ${aliases.length ? `<div class="iw-npc-aka">ещё зовут: ${esc(aliases.join(', '))}</div>` : ''}
    ${c.mood ? `<div class="iw-dossier-mood">${esc(LL.moodLead)} <span class="iw-hl iw-hl-main">${esc(c.mood)}</span></div>` : ''}
  </div>
  <div class="iw-whois">
    <span class="iw-whois-tag">${esc(LL.whois)}</span>
    <div class="iw-whois-text">${who ? esc(who) : '<span class="iw-muted">пока неизвестно</span>'}</div>
    ${loreTraits.length ? `<div class="iw-whois-traits"><span class="iw-muted">${esc(LL.whoisTraits)}:</span> ${esc(loreTraits.join(', '))}</div>` : ''}
  </div>
</section>
${renderCharacter(c, settings.modules, theme, Object.assign({ key }, opts))}`;
    } else if (view.startsWith('shop:') && state.characters[view.slice(5)]) {
        const key = view.slice(5);
        body = renderShop(state.characters[key], theme, key, { shopBusy });
    } else if (view.startsWith('main:') && state.characters[view.slice(5)]) {
        current = view.slice(5);
        body = renderCharacter(state.characters[current], settings.modules, theme, Object.assign({ key: current, first: current === mains[0] }, opts));
    } else if (view.startsWith('main:')) {
        body = renderWaiting(view.slice(5), settings, theme, roster);
    } else {
        body = `<div class="iw-empty">${esc(L.empty)}</div>`;
    }
    const shopKey = settings.points !== false
        ? (view.startsWith('shop:') ? view.slice(5) : (current && state.characters[current] ? current : (mains.find(k => state.characters[k]) || null)))
        : null;
    const wallet = settings.points !== false
        ? { current: shopKey, list: state.order.filter(k => state.characters[k] && (mains.includes(k) || (state.characters[k].points || 0) > 0)).map(k => ({ key: k, name: state.characters[k].name, points: state.characters[k].points || 0 })) }
        : null;
    const forget = current ? `<button type="button" class="iw-forget" data-iw-forget="${esc(current)}">забыть ${esc(state.characters[current].name)}</button>` : '';
    const npcInfo = showNpc ? { met: npcKeys.length, known: (roster && roster.npc && roster.npc.length) || 0 } : null;
    return `
<div class="iw-book">
  <div class="iw-margin" aria-hidden="true"></div>
  ${renderHeader(settings, theme, busy, false, wallet)}
  ${ROUGH_FILTER}
  ${renderTabs({ state, mains, view, avatarFor, npc: npcInfo, busyKind, shopKey, shopLabel: L.shop, labels: L, books, picked, linked, working })}
  <div class="iw-body">${body}</div>
  <div class="iw-foot"><span class="iw-status">${esc(status || '')}</span>${forget}</div>
</div>`;
}

// Всплывашка в стиле темы.
export function renderToast(ev, theme) {
    const kicker = toastKicker(theme, ev.type, eventTitle(ev));
    return `
<div class="iw-toast-card iw-ev-${ev.type}" role="status">
  <span class="iw-tape" aria-hidden="true"></span>
  <span class="iw-toast-icon">${icon(EVENT_ICONS[ev.type] || 'star')}</span>
  <div class="iw-toast-body">
    <div class="iw-toast-kicker">${esc(kicker)}</div>
    <div class="iw-toast-who">${esc(ev.who)}</div>
    <div class="iw-toast-text">${esc(eventText(ev))}</div>
  </div>
  <button type="button" class="iw-toast-close" aria-label="Закрыть">${icon('x')}</button>
</div>`;
}

// Скетчевая стрелка «сюда»: в рисованных темах — от руки, в технических — ломаная линия.
const TECH_THEMES = ['cyber', 'grid', 'logbook', 'dossier'];
function sketchArrow(theme, cls = '') {
    const path = TECH_THEMES.includes(theme)
        ? '<path d="M4 30h22V8"/><path d="M19 15l7-7 7 7"/>'
        : '<path d="M4 31c9 1 17-3 20-10s3-11 1-15"/><path d="M18 10c3-2 5-4 7-6 1 3 3 5 5 7"/>';
    return `<svg class="iw-sketch-arrow ${cls}" viewBox="0 0 38 36" width="38" height="36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function quickOpt(key, value, label, on) {
    return `<button type="button" class="iw-qopt${on ? ' on' : ''}" data-iw-quick="${esc(key)}:${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
}

// Пустой дневник: что нажать и быстрые настройки запаса прямо здесь, до первого разбора.
function renderWaiting(name, s, theme, roster) {
    const entry = roster && roster.find ? roster.find(name) : null;
    const g = genderOf(entry && entry.g, name, entry && entry.who);
    const him = gw(g, 'у него', 'у неё', 'у персонажа');
    const auto = s.budgetMode !== 'fixed';
    const caps = [4000, 6000, 8000, 12000, 16000];
    const fixed = [2000, 3000, 4000, 6000, 8000, 12000];
    const budgetRow = auto
        ? caps.map(v => quickOpt('budgetCap', v, String(v), Number(s.budgetCap) === v)).join('')
        : fixed.map(v => quickOpt('responseLength', v, String(v), Number(s.responseLength) === v)).join('');
    return `
<div class="iw-waiting">
  <div class="iw-waiting-text">
    <div class="iw-npc-title">${esc(name)}</div>
    <p>Дневник ещё не заполнен. Отправь сообщение, и я запишу, что ${him} на душе. Или нажми кнопку разбора справа сверху:</p>
    <ul class="iw-waiting-list">
      <li><b>«Чат»</b> — прочитаю историю и восстановлю настроение, желания, страхи и отношение к тебе;</li>
      <li><b>«Лорбук»</b> — разберу карточку и лорбуки: основу характера, мечту, тип личности и НПС;</li>
      <li><b>«Всё сразу»</b> — сведу и то, и другое в одну картину.</li>
    </ul>
  </div>
  <section class="iw-quick">
    <div class="iw-quick-head"><span class="iw-label">Перед первым разбором</span><span class="iw-muted">можно настроить прямо здесь</span></div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">1</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько токенов давать модели на ответ</div>
        <div class="iw-qrow">${quickOpt('budgetMode', 'auto', 'сам, по сцене (советую)', auto)}${quickOpt('budgetMode', 'fixed', 'как я задам', !auto)}</div>
        <div class="iw-qrow iw-qrow-sub"><span class="iw-qlabel">${auto ? 'потолок:' : 'на каждый ответ:'}</span>${budgetRow}</div>
        <div class="iw-quick-hint">${sketchArrow(theme, 'iw-arrow-side')}<span>${auto ? 'Дневник сам считает, сколько нужно, и никогда не выходит за потолок. Платишь только за то, что модель написала.' : 'Каждый запрос получит ровно столько.'} Думающим моделям (Gemini 3 Pro и похожие) лучше от 6000: часть запаса уходит на размышления.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">2</span>
      <div class="iw-quick-body">
        <div class="iw-quick-title">Сколько последних сообщений читать</div>
        <div class="iw-qrow">${[4, 6, 10, 15].map(v => quickOpt('contextMessages', v, String(v), Number(s.contextMessages) === v)).join('')}</div>
        <div class="iw-quick-hint"><span>Больше — точнее, но дороже. Обычно хватает 6.</span></div>
      </div>
    </div>
    <div class="iw-quick-step">
      <span class="iw-quick-num">3</span>
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
