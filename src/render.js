// Разметка дневника и всплывашек. Только строки — без обращений к таверне.
import { moodletLeftLabel, WEIGHT_NAMES, WEIGHT_TURNS, eventTitle, eventText, signed, shownAliases, SHOWN_MOODLETS, FACE_NAMES, guessFace, plural } from './core.js';
import { themeLabels, EVENT_ICONS, BLOCK_ICONS, toastKicker, icon, faceIcon } from './themes.js';
import { npcBadge } from './npc-icons.js';

// Данные для подбора значка НПС: роль из лорбука или от модели, черты, имя, пол.
function badgeInfo(c, entry) {
    return { who: (entry && entry.who) || c.who || '', traits: (entry && entry.traits) || [], name: c.name, g: c.g || (entry && entry.g) || 'n' };
}

// Невидимый фильтр «дрожащей линии» для рисованных тем.
const ROUGH_FILTER = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="iw-rough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></svg>';

export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13c2 1.4 3.4 3 4.6 5 3-5.6 6.6-9.6 11.4-12.5"/></svg>';
const SCRIBBLE = '<svg class="iw-scribble" width="220" height="12" viewBox="0 0 260 12" fill="none" aria-hidden="true"><path d="M2 8c20-6 40 4 60-1s40-5 60 0 40 4 60-1 40-4 76 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

function delBtn(kind, i) {
    return `<button type="button" class="iw-del" data-iw-del="${kind}:${i}" title="Убрать" aria-label="Убрать">${icon('x')}</button>`;
}

function blockHead(kind, label, extra = '') {
    return `<div class="iw-block-head"><span class="iw-block-icon">${icon(BLOCK_ICONS[kind])}</span><span class="iw-label">${label}</span>${extra}</div>`;
}

function groupHead(label, hint = '') {
    return `<div class="iw-group-head"><span>${esc(label)}</span>${hint ? `<span class="iw-group-hint">${esc(hint)}</span>` : ''}</div>`;
}

// Кошелёк в шапке: очки текущего персонажа, по нажатию — у всех.
function renderWallet(wallet) {
    if (!wallet || !wallet.list.length) return '';
    const cur = wallet.list.find(x => x.key === wallet.current) || wallet.list[0];
    const items = wallet.list.map(x => `<li><button type="button" class="iw-wallet-row${x.key === cur.key ? ' on' : ''}" data-iw-view="shop:${esc(x.key)}"><span>${esc(x.name)}</span><b>${icon('coin')}${x.points}</b></button></li>`).join('');
    return `<details class="iw-wallet"><summary title="Очки за желания и мечту">${icon('coin')}<b>${cur.points}</b></summary><ul class="iw-wallet-list">${items}</ul></details>`;
}

export function renderHeader(settings, theme, busy, inSettings = false, wallet = null) {
    const L = themeLabels(theme, 'm');
    const sound = settings.sound !== false;
    return `
<div class="iw-head">
  <div class="iw-titlebox"><div class="iw-title">${esc(L.title)}</div>${SCRIBBLE}</div>
  <div class="iw-tools">
    ${renderWallet(wallet)}
    <button type="button" class="iw-tool iw-sound${sound ? '' : ' off'}" title="${sound ? 'Звук включён' : 'Звук выключен'}" aria-label="Звук" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}</button>
    <button type="button" class="iw-tool iw-gear${inSettings ? ' on' : ''}" title="${inSettings ? 'Вернуться к дневнику' : 'Настройки'}" aria-label="Настройки" aria-pressed="${inSettings}">${icon('gear')}</button>
    <button type="button" class="iw-tool iw-close" title="Закрыть" aria-label="Закрыть">${icon('x')}</button>
  </div>
</div>`;
}

// Лицо-смайлик на вкладке: цвет и выражение по настроению.
function faceBadge(c) {
    if (!c || (!c.face && !c.mood)) return '';
    // «ровно» от модели уточняем по слову настроения: «сосредоточен» — это не пустое лицо
    const face = c.face && c.face !== 'neutral' ? c.face : guessFace(c.mood);
    return `<span class="iw-face iw-face-${face}" title="${esc(FACE_NAMES[face] || '')}">${faceIcon(face)}</span>`;
}

// Кнопки разбора: над ними надпись «Проанализировать» с рисованной стрелкой к кнопкам;
// пока идёт разбор, надпись сменяется загрузкой в стиле темы (точки, сердечки, полоска).
function analyzeButtons(busyKind, labels = {}) {
    const btn = (kind, ic, label, title) => {
        const on = busyKind === kind;
        return `<button type="button" class="iw-act iw-act-${kind}${on ? ' busy' : ''}" data-iw-analyze="${kind}" title="${title}"${busyKind ? ' disabled' : ''}>${icon(ic)}<span>${label}</span></button>`;
    };
    const cap = busyKind
        ? `<span class="iw-loader" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="iw-cap-text">${esc(labels.analyzing || 'Записываю')}</span>`
        : `<span class="iw-cap-text">${esc(labels.analyze || 'Проанализировать')}</span><span class="iw-cap-arrow" aria-hidden="true">${icon('pointer')}</span>`;
    return `
  <div class="iw-acts-wrap">
    <div class="iw-acts-cap${busyKind ? ' busy' : ''}" role="status">${cap}</div>
    <div class="iw-acts" role="group" aria-label="Проанализировать" aria-busy="${!!busyKind}">
      ${btn('chat', 'chat', 'Чат', 'Разобрать последние сообщения')}
      ${btn('lore', 'bookopen', 'Лорбук', 'Разобрать карточку и лорбуки: НПС и сведения о персонажах')}
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
export function renderTabs({ state, mains, view, avatarFor, npc, busyKind = '', shopKey = null, shopLabel = 'Магазин наград', labels = {} }) {
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
    return `<div class="iw-tabrow"><div class="iw-tabs">${tabs}${sticker}${shop}</div><span class="iw-divider" aria-hidden="true"></span>${analyzeButtons(busyKind, labels)}</div>`;
}

function feelMeter(m, manualTurns) {
    const max = manualTurns ? (manualTurns[m.weight] || 1) : (WEIGHT_TURNS[m.weight] || WEIGHT_TURNS.medium)[2];
    const pct = Math.max(6, Math.min(100, Math.round((m.left / max) * 100)));
    return `<span class="iw-feel-meter" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
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
        </div>
        ${m.feel ? `<div class="iw-feel-inner">${esc(m.feel)}</div>` : ''}
        ${m.why ? `<div class="iw-feel-why"><span class="iw-feel-cause">из-за:</span> ${esc(m.why)}</div>` : ''}
        <div class="iw-feel-time">${feelMeter(m, opts.manualTurns)}<span>${esc(moodletLeftLabel(m))}</span></div>
        ${delBtn('moodlets', i)}
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
      <div class="iw-mood-now"><span class="iw-mood-lead">${esc(L.moodLead)}</span> ${c.mood ? `<span class="iw-mood-word"><span class="iw-hl iw-hl-main">${esc(c.mood)}</span></span>` : '<span class="iw-muted">— пока не понятно</span>'}</div>
      ${feels ? `<ul class="iw-feels iw-feels-flat">${feels}</ul>${more}` : '<div class="iw-muted">ничего особенного</div>'}
    </section>`;
}

function scoreBadge(score) {
    const tone = score > 0 ? 'good' : (score < 0 ? 'bad' : 'mid');
    return `<span class="iw-score iw-score-${tone}">${esc(signed(score))}</span>`;
}

// Маленький график: как менялось отношение от −3 до +3.
function attitudeChart(points) {
    if (!points || points.length < 2) return '';
    const w = 240;
    const h = 56;
    const pad = 6;
    const step = (w - pad * 2) / (points.length - 1);
    const y = s => pad + ((3 - s) / 6) * (h - pad * 2);
    const coords = points.map((p, i) => `${(pad + i * step).toFixed(1)},${y(p.s).toFixed(1)}`);
    const dots = points.map((p, i) => `<circle cx="${(pad + i * step).toFixed(1)}" cy="${y(p.s).toFixed(1)}" r="3.2"/>`).join('');
    return `
      <svg class="iw-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Как менялось отношение: ${points.map(p => signed(p.s)).join(', ')}">
        <line class="iw-chart-zero" x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}"/>
        <polyline points="${coords.join(' ')}"/>
        <g>${dots}</g>
      </svg>`;
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
        return `
      <li class="iw-want${done ? ' done' : ''}${dropped ? ' dropped' : ''}">
        <span class="iw-box">${done ? ICON_CHECK : ''}</span>
        <span class="iw-want-text">${esc(w.text)}${done ? ' <b class="iw-tag">сбылось</b>' : ''}${dropped ? ' <b class="iw-tag">уже неважно</b>' : ''}</span>
        ${delBtn('wants', i)}
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
        <span class="iw-fear-power">${esc(f.level || FEAR_POWER[f.strength])}</span>
        ${delBtn('fears', i)}
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
    const mark = t.kind === 'up' ? '<span class="iw-trait-mark">усилилась</span>' : (t.kind === 'down' ? '<span class="iw-trait-mark">слабеет</span>' : '');
    return `
      <span class="iw-trait iw-k-${t.kind}">
        <span class="iw-trait-name">${esc(t.name)}${mark}</span>
        ${t.why && t.kind !== 'base' ? `<span class="iw-trait-why">${esc(t.why)}</span>` : ''}
        ${delBtn('traits', i)}
      </span>`;
}

function renderTraits(c, L) {
    const list = (c.traits || []).map((t, i) => ({ t, i }));
    const base = list.filter(x => x.t.kind !== 'new');
    const gained = list.filter(x => x.t.kind === 'new');
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
    const L = themeLabels(theme, c.g);
    const pts = c.points || 0;
    const row = r => `
      <li class="iw-reward iw-rk-${r.kind}${pts < r.cost ? ' locked' : ''}">
        <span class="iw-rw-ico iw-rw-big">${icon(r.icon || 'gift')}</span>
        <span class="iw-rw-body"><b class="iw-rw-title">${esc(r.title)}</b><span class="iw-rw-desc">${esc(r.desc || r.effect || '')}</span>${r.kind === 'buff' ? `<span class="iw-rw-kind">действует ${r.turns} ${plural(r.turns, 'ответ', 'ответа', 'ответов')}</span>` : ''}</span>
        <button type="button" class="iw-buy" data-iw-buy="${esc(r.id)}"${pts < r.cost ? ' disabled' : ''} title="${pts < r.cost ? 'Не хватает очков' : 'Купить'}">${icon('coin')}<span>${r.cost}</span></button>
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
  ${blockHead('rewards', esc(L.shop), `<span class="iw-points">${icon('coin')}<b>${pts}</b></span>`)}
  <div class="iw-muted">Очки: желание +10, этап мечты +25, мечта целиком +100. Награды подобраны под ${esc(c.name)}.</div>
  ${activeRewards(c)}
  ${groups || '<div class="iw-empty">Наград пока нет — нажми «Подобрать награды».</div>'}
  <button type="button" class="iw-btn${shopBusy ? ' busy' : ''}" data-iw-shop="regen"${shopBusy ? ' disabled' : ''}>${icon(shopBusy ? 'rotate' : 'dice')}<span>${groups ? 'Подобрать заново' : 'Подобрать награды'}</span></button>
</section>`;
}

export function renderCharacter(c, modules, theme, opts = {}) {
    const L = themeLabels(theme, c.g);
    const blocks = [];
    if (modules.mood) blocks.push(renderMood(c, L, opts));
    if (modules.impression) blocks.push(renderAttitude(c, L));
    if (modules.wants) blocks.push(renderWants(c, L));
    if (modules.fears) blocks.push(renderFears(c, L));
    if (modules.dream) blocks.push(renderDream(c, L, opts));
    if (modules.traits) blocks.push(renderTraits(c, L));
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
        cards.push(`
      <div class="iw-npc seen${e.checked ? ' checked' : ''}" title="${e.checked ? 'О нём говорили, но лично он в сцене не появлялся' : 'Упоминался в этом чате — нажми «Чат», и дневник разберёт историю'}">
        ${npcBadge(badgeInfo(e, e))}
        <span class="iw-npc-name">${esc(e.name)}</span>
        <span class="iw-npc-mood">${e.checked ? 'только упоминался' : 'ждёт разбора'}</span>
      </div>`);
    }
    const unknown = ((roster && roster.npc) || []).filter(e => !used.has(e.name) && !npcKeys.some(k => roster.find(k) === e));
    const unknownTiles = unknown.map(() => `
      <span class="iw-npc-unknown" title="Ещё не появлялся в сцене"><span class="iw-unknown-mark"></span></span>`).join('');
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

export function renderPanel({ state, settings, theme, view, busy, busyKind = '', dreamBusy = false, shopBusy = false, status, avatarFor, mains, npcKeys, roster, rosterBusy, seenOnly = [], noChat = false, settingsHtml = '' }) {
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
        const LL = themeLabels(theme, c.g);
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
        body = renderCharacter(state.characters[current], settings.modules, theme, Object.assign({ key: current }, opts));
    } else if (view.startsWith('main:')) {
        const name = view.slice(5);
        body = `
<div class="iw-waiting">
  ${photoHtml({ name }, avatarFor)}
  <div class="iw-waiting-text">
    <div class="iw-npc-title">${esc(name)}</div>
    <div>Дневник ещё не заполнен. Отправь сообщение — или нажми «Чат» справа сверху: я прочитаю историю и восстановлю настроение, желания, страхи и отношение к тебе. «Лорбук» — разберёт карточку и лорбуки.</div>
  </div>
</div>`;
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
  ${renderTabs({ state, mains, view, avatarFor, npc: npcInfo, busyKind, shopKey, shopLabel: L.shop, labels: L })}
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
