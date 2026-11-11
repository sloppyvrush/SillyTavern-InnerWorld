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

// Значки для достижений — со смыслом: модель выбирает тот, что подходит событию
export const ACH_ICON_MEANING = {
    trophy: 'победа, триумф', star: 'успех, первый раз', crown: 'власть, лидерство, триумф', heart: 'любовь, нежность',
    lips: 'поцелуй, флирт', flower: 'ухаживание, цветы', gift: 'подарок, сюрприз', ribbon: 'награда, подарок', cake: 'праздник, день рождения',
    cup: 'чай, кофе, посиделки', potion: 'алкоголь, зелье, лекарство', shield: 'защита, спасение', flame: 'страсть, драка, ярость, пожар',
    key: 'тайна, разгадка', lock: 'секрет, заперто', ghost: 'мистика, страх, призраки', eye: 'подглядывание, слежка, разоблачение',
    letter: 'письмо, записка', scroll: 'документ, договор', book: 'знание, учёба', feather: 'стихи, творчество', note: 'музыка, песня',
    dice: 'азарт, удача, случай', coin: 'деньги, сделка, взятка', gem: 'сокровище, ценность', sun: 'утро, надежда', moon: 'ночь, бессонница',
    clock: 'опоздание, время', chat: 'разговор, болтовня', users: 'компания, знакомство', sparkle: 'магия, чудо', alert: 'опасность, тревога',
    trash: 'провал, всё пошло не так',
};
// лица-эмоции — для смешных, милых и неловких достижений
export const ACH_FACES = ['joy', 'playful', 'shy', 'dazed', 'confused', 'surprise', 'tired', 'angry', 'sad', 'fear', 'love', 'flirty', 'guilt', 'pride', 'suspicious', 'disgust', 'bored', 'hurt'];
export const ACH_ICONS = [...Object.keys(ACH_ICON_MEANING), ...ACH_FACES];
export const ACH_KINDS = { story: 'сюжет', feat: 'подвиг', funny: 'забавное', cute: 'милое', romance: 'романтика', dark: 'мрачное', secret: 'тайное' };
const KIND_ICON = { story: 'star', feat: 'trophy', funny: 'playful', cute: 'heart', romance: 'lips', dark: 'ghost', secret: 'key' };
// если модель назвала значок не из списка — подбираем по словам
const WORD_ICON = [[/поцел/, 'lips'], [/любов|влюб|сердц/, 'heart'], [/чай|кофе|чаепит/, 'cup'], [/пьян|вино|выпил|бутыл|зель|алкогол/, 'potion'], [/спас|защит/, 'shield'], [/драк|ярост|пожар|огон/, 'flame'], [/тайн|секрет|разгад/, 'key'], [/призрак|страх|ужас/, 'ghost'], [/письм|записк/, 'letter'], [/подар/, 'gift'], [/цвет/, 'flower'], [/день рожд|праздн/, 'cake'], [/деньг|монет|взятк|сделк/, 'coin'], [/ночь|бессон/, 'moon'], [/опозд/, 'clock'], [/песн|музык/, 'note'], [/неловк|смущ|красне/, 'shy'], [/провал|облом/, 'trash']];
const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Достижение из ответа модели: { title, desc, icon, tier, kind } или null
export function cleanAchievement(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const title = clean(raw.title || raw.name, 48);
    if (!title) return null;
    const desc = clean(raw.desc || raw.about || raw.why, 180);
    const kind = Object.keys(ACH_KINDS).includes(raw.kind) ? raw.kind : 'story';
    let ic = String(raw.icon || '').trim();
    if (!ACH_ICONS.includes(ic)) {
        const text = `${title} ${desc}`.toLowerCase();
        ic = (WORD_ICON.find(([re]) => re.test(text)) || [])[1] || KIND_ICON[kind] || 'trophy';
    }
    return { title, desc, icon: ic, tier: ['bronze', 'silver', 'gold'].includes(raw.tier) ? raw.tier : 'bronze', kind };
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
