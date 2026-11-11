// Витрина: памятные вещи из лавки и достижения истории — на полках красиво нарисованного шкафа.
import { icon, themeLabels } from './themes.js';
import { plural } from './core.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const TIER_NAMES = { bronze: 'бронза', silver: 'серебро', gold: 'золото' };

// Все памятные вещи со всех страниц дневника
export function collectionOf(state) {
    const out = [];
    for (const [key, c] of Object.entries((state && state.characters) || {})) {
        (c && c.collection || []).forEach((x, i) => out.push(Object.assign({ owner: c.name, key, i }, x)));
    }
    return out.sort((a, b) => (a.got || 0) - (b.got || 0));
}

function shelves(items, per) {
    const rows = [];
    for (let i = 0; i < items.length; i += per) rows.push(items.slice(i, i + per));
    return rows;
}

function caseBox(kind, title, sub, body, opening) {
    return `
<section class="iw-case iw-case-${kind}${opening ? ' iw-case-opening' : ''}">
  <div class="iw-case-top"><span class="iw-case-plate">${esc(title)}</span>${sub ? `<span class="iw-case-sub">${esc(sub)}</span>` : ''}</div>
  <div class="iw-case-inner">
    ${body}
    <span class="iw-case-shine" aria-hidden="true"></span>
    <span class="iw-case-door iw-case-door-l" aria-hidden="true"></span>
    <span class="iw-case-door iw-case-door-r" aria-hidden="true"></span>
  </div>
  <div class="iw-case-base" aria-hidden="true"><i></i><i></i></div>
</section>`;
}

// sel — что выбрано на полке: 'c:<ключ>:<номер>' или 'a:<id>'
export function renderShowcase({ state, theme, got = [], sel = '', opening = false, mobile = false }) {
    const L = themeLabels(theme, 'm');
    const items = collectionOf(state);
    const per = mobile ? 3 : 5;
    const itemHtml = x => {
        const id = `c:${x.key}:${x.i}`;
        return `<button type="button" class="iw-case-item${sel === id ? ' on' : ''}" data-iw-case="${esc(id)}" title="${esc(x.title)}${x.desc ? ' — ' + esc(x.desc) : ''}">
      <span class="iw-case-dome">${icon(x.icon || 'gift')}</span>
      <span class="iw-case-stand" aria-hidden="true"></span>
      <span class="iw-case-tag">${esc(x.title)}</span>
    </button>`;
    };
    const emptySpot = '<span class="iw-case-item iw-case-empty" aria-hidden="true"><span class="iw-case-dome"></span><span class="iw-case-stand"></span></span>';
    const fill = (row, mk, n) => row.map(mk).join('') + (row.length < n ? Array(n - row.length).fill(emptySpot).join('') : '');
    const collRows = items.length ? shelves(items, per) : [[]];
    const collBody = collRows.map(row => `<div class="iw-shelf">${fill(row, itemHtml, per)}</div>`).join('')
        + (items.length ? '' : `<p class="iw-case-hint">Памятные вещи из ${esc(L.shop ? `«${L.shop}»` : 'лавки')} встанут сюда — купи что-нибудь «в коллекцию».</p>`);

    // достижения появляются сами по ходу истории — на полке только полученные
    const list = (Array.isArray(got) ? got : []).slice().sort((a, b) => (a.at || 0) - (b.at || 0));
    const medal = a => {
        const id = `a:${a.id}`;
        return `<button type="button" class="iw-medal iw-medal-${a.tier} got${sel === id ? ' on' : ''}" data-iw-case="${esc(id)}" title="${esc(`${a.title}${a.desc ? ' — ' + a.desc : ''}`)}">
      <span class="iw-medal-ribbon" aria-hidden="true"></span>
      <span class="iw-medal-disc">${icon(a.icon || 'trophy')}</span>
      <span class="iw-case-tag">${esc(a.title)}</span>
    </button>`;
    };
    const medalsPer = mobile ? 4 : 6;
    const achRows = list.length ? shelves(list, medalsPer) : [[]];
    const achBody = achRows.map(row => `<div class="iw-shelf iw-shelf-medals">${fill(row, medal, medalsPer)}</div>`).join('')
        + (list.length ? '' : '<p class="iw-case-hint">Достижения появляются сами, когда в истории случается что-то по-настоящему важное: признание, спасение, предательство, большая победа.</p>');

    // табличка с описанием выбранного
    let plaque = '';
    if (sel.startsWith('c:')) {
        const x = items.find(it => `c:${it.key}:${it.i}` === sel);
        if (x) plaque = `<div class="iw-case-plaque"><span class="iw-plaque-ico">${icon(x.icon || 'gift')}</span><div><b>${esc(x.title)}</b>${x.desc ? `<p>${esc(x.desc)}</p>` : ''}<small>в коллекции: ${esc(x.owner)}</small></div></div>`;
    } else if (sel.startsWith('a:')) {
        const a = list.find(x => x.id === sel.slice(2));
        if (a) plaque = `<div class="iw-case-plaque iw-plaque-${a.tier}"><span class="iw-plaque-ico">${icon(a.icon || 'trophy')}</span><div><b>${esc(a.title)}</b>${a.desc ? `<p>${esc(a.desc)}</p>` : ''}<small>${TIER_NAMES[a.tier] || ''}${a.scene ? ` · ${esc(a.scene)}` : ''}${a.mes !== undefined ? ` · сообщение #${esc(a.mes)}` : ''}</small></div><button type="button" class="iw-mini iw-plaque-x" data-iw-achdel="${esc(a.id)}" title="Убрать с витрины" aria-label="Убрать с витрины">${icon('x')}</button></div>`;
    }

    return `
<div class="iw-showcase">
  <div class="iw-showcase-head">
    <span class="iw-label">Витрина</span>
    <span class="iw-muted">${list.length ? `${list.length} ${plural(list.length, 'достижение', 'достижения', 'достижений')}` : 'достижений пока нет'} · ${items.length ? `${items.length} ${plural(items.length, 'памятная вещь', 'памятные вещи', 'памятных вещей')}` : 'вещей пока нет'}</span>
  </div>
  ${plaque}
  ${caseBox('coll', 'Коллекция', items.length ? '' : 'пока пусто', collBody, opening)}
  ${caseBox('ach', 'Достижения', list.length ? String(list.length) : 'пока пусто', achBody, opening)}
</div>`;
}


// Значки, из которых модель выбирает картинку для достижения
export const ACH_ICONS = ['trophy', 'heart', 'star', 'crown', 'shield', 'flame', 'ghost', 'key', 'gem', 'sun', 'moon', 'sparkle', 'gift', 'cake', 'letter', 'cup', 'flower', 'potion', 'users', 'eye', 'lips', 'ribbon', 'feather', 'coin', 'scroll', 'book'];
const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Достижение из ответа модели: { title, desc, icon, tier } или null
export function cleanAchievement(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const title = clean(raw.title || raw.name, 48);
    if (!title) return null;
    return {
        title,
        desc: clean(raw.desc || raw.about || raw.why, 180),
        icon: ACH_ICONS.includes(raw.icon) ? raw.icon : 'trophy',
        tier: ['bronze', 'silver', 'gold'].includes(raw.tier) ? raw.tier : 'bronze',
    };
}

// Добавить на полку: одно достижение на сообщение (при свайпе заменяется), одинаковые названия не повторяются
export function addAchievement(list, a, { mes, scene = '', who = '' } = {}) {
    const norm = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const out = (list || []).filter(x => !(mes !== undefined && x.mes === mes));
    if (out.some(x => norm(x.title) === norm(a.title))) return { list: out, added: null };
    const item = Object.assign({ id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now(), scene, who }, a, mes !== undefined ? { mes } : {});
    out.push(item);
    return { list: out.slice(-60), added: item };
}
