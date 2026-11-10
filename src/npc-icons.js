import { PX_ICONS, PX_PORTRAITS, PX_PORTRAIT_OF } from './pixel-icons.js';
import { iconStyle, pxSvg } from './themes.js';
// Значки НПС: рисованные архетипы, подбираются по тому, кто это (роль из лорбука или от модели).
// Рисунок один, а вид — под тему: в дневнике дрожащая линия, в летописи — чернила в медальоне и т. д.

// Порядок важен: первым срабатывает более точное совпадение.
export const NPC_ICONS = [
    { id: 'criminal', keys: ['бандит', 'вор в законе', 'авторитет', 'криминальн', 'преступн', 'группировк', 'правая рука', 'шестерк', 'гангстер', 'мафи', 'рэкет', 'братв', 'головорез', 'наёмн', 'наемн', 'убийц', 'киллер', 'gangster', 'mafia', 'thug', 'criminal', 'killer'],
        svg: '<path d="M5 10.5c0-3.5 3-6 7-6s7 2.5 7 6v1.5H5z"/><path d="M4 12h16"/><path d="M8 15.5c1.2.8 2.5 1.2 4 1.2s2.8-.4 4-1.2"/><path d="M7.5 9.5h2.5M14 9.5h2.5"/><path d="M9 20l3-2 3 2"/>' },
    { id: 'police', keys: ['полиц', 'милиц', 'опер', 'розыск', 'угрозыск', 'рувд', 'мвд', 'прокурат', 'следовател', 'детектив', 'сыщик', 'шериф', 'инспектор', 'участков', 'police', 'cop', 'detective', 'sheriff'],
        svg: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 8.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 14.5l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>' },
    { id: 'ex', keys: ['бывший жених', 'бывшая невест', 'бывший муж', 'бывшая жена', 'бывший парень', 'бывшая девушк', 'жених', 'невест', 'преследу', 'stalker', 'fiance'],
        svg: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/><path d="M12 7.4l-1.5 3.5 2.5 2-2 4"/>' },
    { id: 'thief', keys: ['вор ', 'воровк', 'карманник', 'шпион', 'осведомител', 'информатор', 'стукач', 'контрабанд', 'шулер', 'мошенни', 'шантаж', 'thief', 'spy', 'informant', 'rogue'],
        svg: '<path d="M3 10c2-1.5 5-2 9-2s7 .5 9 2c-1 2.5-2.5 4-4.5 4S14 12.5 12 12.5 9.5 14 7.5 14 4 12.5 3 10z"/><circle cx="8" cy="10.8" r="1"/><circle cx="16" cy="10.8" r="1"/><path d="M9 18h6"/>' },
    { id: 'doctor', keys: ['врач', 'доктор', 'медик', 'медсестр', 'хирург', 'фельдшер', 'лекар', 'целител', 'знахар', 'санитар', 'doctor', 'nurse', 'medic', 'healer', 'surgeon'],
        svg: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>' },
    { id: 'soldier', keys: ['солдат', 'армей', 'военн', 'офицер', 'сержант', 'капитан', 'майор', 'полковник', 'генерал', 'десантн', 'афган', 'сослуживец', 'ветеран', 'soldier', 'army', 'officer', 'veteran', 'marine'],
        svg: '<path d="M4 13c0-4.5 3.6-8 8-8s8 3.5 8 8"/><path d="M3 13h18"/><path d="M6 13v2.5c0 1.5 1 2.5 2.5 2.5h7c1.5 0 2.5-1 2.5-2.5V13"/><path d="M12 5v4"/>' },
    { id: 'guard', keys: ['страж', 'стражник', 'охран', 'телохранител', 'воин', 'рыцар', 'паладин', 'дружинник', 'гвардеец', 'guard', 'knight', 'warrior', 'bodyguard'],
        svg: '<path d="M12 3l7 2.5v6c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5v-6z"/><path d="M12 6v12M7.5 10.5h9"/>' },
    { id: 'royal', keys: ['корол', 'королев', 'царь', 'царица', 'принц', 'принцесс', 'князь', 'княгин', 'княжн', 'император', 'герцог', 'граф', 'лорд', 'леди', 'барон', 'дворян', 'аристократ', 'king', 'queen', 'prince', 'princess', 'duke', 'lord', 'lady', 'noble'],
        svg: '<path d="M4 8l4 3.5L12 5l4 6.5L20 8l-1.5 9.5h-13z"/><path d="M5.5 20h13"/>' },
    { id: 'boss', keys: ['начальник', 'шеф', 'босс', 'командир', 'глава', 'руководител', 'директор', 'председател', 'старший', 'мэр', 'губернатор', 'boss', 'chief', 'director', 'commander', 'mayor'],
        svg: '<path d="M7 9.5a5 5 0 0 1 10 0c0 3-2.2 5-5 5s-5-2-5-5z"/><path d="M4.5 21c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5"/><path d="M12 15.5l-1.2 2.5L12 21l1.2-3z"/>' },
    { id: 'mage', keys: ['маг ', 'маги ', 'волшебн', 'чародей', 'колдун', 'ведьм', 'ведун', 'некромант', 'алхимик', 'шаман', 'жрица', 'mage', 'wizard', 'witch', 'sorcer', 'alchemist', 'shaman'],
        svg: '<path d="M12 3l5.5 12.5h-11z"/><path d="M4 18c2.5 1.5 13.5 1.5 16 0"/><path d="M11 9.5l1-1.5 1 1.5M10 13h4"/>' },
    { id: 'priest', keys: ['священ', 'жрец', 'монах', 'монахин', 'батюшк', 'епископ', 'пастор', 'настоятел', 'priest', 'monk', 'nun', 'cleric', 'bishop'],
        svg: '<path d="M12 3v6M9 5.5h6"/><path d="M6.5 21v-7.5a5.5 5.5 0 0 1 11 0V21"/><path d="M4.5 21h15"/>' },
    { id: 'merchant', keys: ['торгов', 'купец', 'купчих', 'бизнесмен', 'предпринимател', 'коммерсант', 'продав', 'лавочник', 'рынок', 'ростовщик', 'банкир', 'импортёр', 'импортер', 'merchant', 'trader', 'businessman', 'banker'],
        svg: '<ellipse cx="12" cy="7" rx="6" ry="2.5"/><path d="M6 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7"/><path d="M6 11v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/>' },
    { id: 'scholar', keys: ['учител', 'преподавател', 'профессор', 'учёный', 'ученый', 'библиотекар', 'историк', 'летописец', 'мудрец', 'teacher', 'professor', 'scholar', 'librarian', 'scientist'],
        svg: '<path d="M3 6.5c3-1.4 6-1.4 9 .8 3-2.2 6-2.2 9-.8v12c-3-1.4-6-1.4-9 .8-3-2.2-6-2.2-9-.8z"/><path d="M12 7.3v12"/>' },
    { id: 'student', keys: ['студент', 'школьни', 'ученик', 'ученица', 'курсант', 'первокурсник', 'одноклассни', 'однокурсни', 'student', 'pupil', 'classmate'],
        svg: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-4"/><path d="M21.5 9.5v5"/>' },
    { id: 'tech', keys: ['хакер', 'программист', 'инженер', 'техник', 'механик', 'криминалист', 'эксперт', 'аналитик', 'изобретател', 'hacker', 'engineer', 'technician', 'mechanic', 'programmer'],
        svg: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2.5 19.5h19"/><path d="M9 9l-2 1.5L9 12M15 9l2 1.5L15 12"/>' },
    { id: 'robot', keys: ['робот', 'андроид', 'киборг', 'синтетик', 'ии ', 'искусственный интеллект', 'нейросет', 'android', 'robot', 'cyborg', 'ai '],
        svg: '<rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 3.5V7"/><circle cx="12" cy="3.5" r="1"/><circle cx="9.5" cy="12" r="1.3"/><circle cx="14.5" cy="12" r="1.3"/><path d="M9.5 15.5h5"/>' },
    { id: 'writer', keys: ['журналист', 'писател', 'поэт', 'репортёр', 'репортер', 'редактор', 'блогер', 'сценарист', 'journalist', 'writer', 'poet', 'reporter'],
        svg: '<path d="M19.5 4.5C12 5 7.5 9.5 6.5 17.5"/><path d="M19.5 4.5c-.5 6-4.5 9.5-10 10.5"/><path d="M4.5 20l2-2.5"/>' },
    { id: 'artist', keys: ['художни', 'музыкант', 'певец', 'певиц', 'актёр', 'актер', 'актрис', 'танцор', 'танцовщ', 'бард', 'менестрел', 'гитарист', 'artist', 'musician', 'singer', 'actor', 'actress', 'dancer', 'bard'],
        svg: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>' },
    { id: 'cook', keys: ['повар', 'кухар', 'бармен', 'официант', 'трактирщ', 'хозяйк трактира', 'кондитер', 'булочн', 'кабатчик', 'cook', 'chef', 'bartender', 'waiter', 'innkeeper'],
        svg: '<path d="M5 9h12v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M17 10.5h1.5a2 2 0 0 1 0 4H17"/><path d="M8.5 3.5c-.8 1 .8 2-.1 3M12 3.5c-.8 1 .8 2-.1 3"/>' },
    { id: 'servant', keys: ['слуг', 'служанк', 'горничн', 'дворецк', 'камердинер', 'прислуг', 'лакей', 'няня', 'гувернант', 'экономк', 'servant', 'maid', 'butler', 'nanny'],
        svg: '<path d="M5 17a7 7 0 0 1 14 0z"/><path d="M3.5 17h17"/><path d="M12 10V8.5"/><circle cx="12" cy="7.5" r="1"/>' },
    { id: 'traveler', keys: ['водител', 'таксист', 'шофёр', 'шофер', 'моряк', 'матрос', 'пилот', 'штурман', 'путешеств', 'странник', 'кочевник', 'курьер', 'driver', 'sailor', 'pilot', 'traveler', 'wanderer'],
        svg: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6"/>' },
    { id: 'worker', keys: ['рабоч', 'кузнец', 'плотник', 'строител', 'грузчик', 'сантехник', 'автосервис', 'крестьян', 'фермер', 'шахтёр', 'шахтер', 'дворник', 'worker', 'blacksmith', 'farmer', 'builder'],
        svg: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19l-2.5-2.5z"/><path d="M9.5 16.5L5 21l-2-2 4.5-4.5"/>' },
    { id: 'child', keys: ['ребён', 'ребен', 'малыш', 'младенц', 'племянни', 'внук', 'внучк', 'девочк', 'мальчик', 'дочк', 'сынок', 'школьник', 'child', 'kid', 'baby', 'niece', 'nephew'],
        svg: '<circle cx="12" cy="13" r="6.5"/><circle cx="6.5" cy="7" r="2.3"/><circle cx="17.5" cy="7" r="2.3"/><circle cx="10" cy="12.5" r=".8"/><circle cx="14" cy="12.5" r=".8"/><path d="M10.5 15.5c.8.6 2.2.6 3 0"/>' },
    { id: 'elder', keys: ['бабушк', 'бабк', 'баба ', 'дедушк', 'дед ', 'старик', 'старуш', 'пожил', 'пенсионер', 'старец', 'старейшин', 'grandma', 'grandpa', 'elder', 'old man', 'old woman'],
        svg: '<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M11 12h2M5 12H3M19 12h2"/>' },
    { id: 'sibling', keys: ['сестр', 'брат', 'близнец', 'кузен', 'кузин', 'двоюродн', 'sister', 'brother', 'twin', 'cousin'],
        svg: '<circle cx="8.5" cy="8" r="2.8"/><circle cx="15.5" cy="8" r="2.8"/><path d="M3.5 19.5c.4-3.3 2.4-5.3 5-5.3 1.4 0 2.6.5 3.5 1.5.9-1 2.1-1.5 3.5-1.5 2.6 0 4.6 2 5 5.3"/>' },
    { id: 'parent', keys: ['мать', 'мама', 'матер', 'отец', 'папа', 'отчим', 'мачех', 'родител', 'mother', 'father', 'mom', 'dad', 'parent'],
        svg: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M12 17.5s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8z"/>' },
    { id: 'lover', keys: ['возлюблен', 'любим', 'любовни', 'муж', 'жена', 'супруг', 'парень', 'девушка', 'lover', 'husband', 'wife', 'boyfriend', 'girlfriend', 'spouse'],
        svg: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>' },
    { id: 'friend', keys: ['друг', 'подруг', 'приятел', 'товарищ', 'кореш', 'напарни', 'соратни', 'союзни', 'friend', 'buddy', 'partner', 'ally'],
        svg: '<path d="M3 11.5l3.5-3.5 3 1 2.5-1.5 2.5 1.5 3-1 3.5 3.5"/><path d="M6.5 8l4.5 6.5c.7 1 2 1.1 2.8.2l3.7-4.2"/><path d="M9 13l-1.5 1.5M11.5 15.5L10 17"/>' },
    { id: 'neighbor', keys: ['сосед', 'соседк', 'знаком', 'горожан', 'житель', 'neighbor', 'acquaintance', 'villager'],
        svg: '<path d="M3 20V10l5-4 5 4v10z"/><path d="M13 20v-7l4-3 4 3v7"/><path d="M6.5 20v-4h3v4"/>' },
    { id: 'monster', keys: ['демон', 'вампир', 'оборот', 'волк', 'чудовищ', 'монстр', 'тварь', 'дракон', 'нежить', 'зомби', 'дьявол', 'demon', 'vampire', 'werewolf', 'monster', 'dragon', 'undead', 'beast'],
        svg: '<path d="M5 9l1.5-5L10 7.5h4L17.5 4 19 9c1 1.5 1.5 3 1.5 4.5 0 4-3.8 6.5-8.5 6.5s-8.5-2.5-8.5-6.5C3.5 12 4 10.5 5 9z"/><path d="M9 12.5l1.5 1M15 12.5l-1.5 1"/><path d="M10 16.5l1 1.2 1-1.2 1 1.2 1-1.2"/>' },
    { id: 'ghost', keys: ['призрак', 'дух ', 'духи', 'привиден', 'фантом', 'ghost', 'spirit', 'phantom'],
        svg: '<path d="M6 20V10.5a6 6 0 0 1 12 0V20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z"/><circle cx="10" cy="10.5" r=".9"/><circle cx="14" cy="10.5" r=".9"/>' },
    { id: 'animal', keys: ['кошк', 'собак', 'пёс', 'пес ', 'щенок', 'котёнок', 'котенок', 'питом', 'лошад', 'конь ', 'фамильяр', 'cat', 'dog', 'pet', 'horse', 'familiar'],
        svg: '<circle cx="12" cy="15" r="3.8"/><circle cx="6" cy="10" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/>' },
    { id: 'woman', keys: [],
        svg: '<circle cx="12" cy="8.5" r="3.6"/><path d="M8.5 9c-.5 3 .3 5 1.2 5.8M15.5 9c.5 3-.3 5-1.2 5.8"/><path d="M5 21c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>' },
    { id: 'man', keys: [],
        svg: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 21c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>' },
];

const BY_ID = Object.fromEntries(NPC_ICONS.map(i => [i.id, i]));

// Текст для поиска: только буквы и цифры через пробел — ключ ищем с начала слова.
function norm(s) {
    return ' ' + String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}-]+/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
}

function has(text, key) {
    const k = key.toLowerCase().replace(/ё/g, 'е');
    return text.includes(' ' + k.trimStart());
}

// Подобрать значок: сначала по роли (who), потом по чертам и имени, иначе — по полу.
export function pickNpcIcon({ who = '', traits = [], name = '', g = 'n' } = {}) {
    const sources = [norm(who), norm(traits.join(' ')), norm(name)];
    for (const text of sources) {
        if (text.trim() === '') continue;
        for (const icon of NPC_ICONS) {
            if (icon.keys.some(k => has(text, k))) return icon.id;
        }
    }
    return g === 'f' ? 'woman' : 'man';
}

export function npcIconSvg(id) {
    const icon = BY_ID[id] || BY_ID.man;
    if (iconStyle() === 'pixel' && PX_ICONS['npc:' + icon.id]) return pxSvg(PX_ICONS['npc:' + icon.id], 'iw-npc-ico');
    return `<svg class="iw-npc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon.svg}</svg>`;
}

// Готовый значок в рамке темы.
export function npcBadge(entry, size = '') {
    const id = pickNpcIcon(entry);
    if (iconStyle() === 'pixel') {
        const who = PX_PORTRAIT_OF[id] || (entry && entry.g === 'f' ? 'woman' : 'man');
        return `<span class="iw-npc-badge iw-npc-badge-px ${size}" data-icon="${id}"><svg class="iw-npc-ico iw-npc-px" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${PX_PORTRAITS[who]}</svg></span>`;
    }
    return `<span class="iw-npc-badge ${size}" data-icon="${id}">${npcIconSvg(id)}</span>`;
}
