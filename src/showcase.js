// Витрина: памятные вещи из лавки и достижения, которые появляются сами по ходу истории.
const TIER_NAMES = { bronze: 'бронза', silver: 'серебро', gold: 'золото' };

// Все памятные вещи со всех страниц дневника
export function collectionOf(state) {
    const out = [];
    for (const [key, c] of Object.entries((state && state.characters) || {})) {
        (c && c.collection || []).forEach((x, i) => out.push(Object.assign({ owner: c.name, key, i }, x)));
    }
    return out.sort((a, b) => (a.got || 0) - (b.got || 0));
}

export const TIER_NAMES_RU = TIER_NAMES;

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
