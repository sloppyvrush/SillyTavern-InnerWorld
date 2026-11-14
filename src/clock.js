// Часы и календарь сцены: какое сейчас число и время в истории, таймскипы, праздники и дни рождения.
// Время хранится как { y, m, d, h, mi } (для «счёта дней» — только d, h, mi). Календарь — один на чат.

export const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export const MONTHS_RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const WEEKDAYS_RU = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const WEEKDAY_STEMS = ['понед', 'вторн', 'сред', 'четв', 'пятн', 'суб', 'воскр'];
const WEEKDAY_EN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Праздники по умолчанию, пока календарь не определён: только то, что отмечают везде.
export const DEFAULT_HOLIDAYS = [
    { m: 1, d: 1, name: 'Новый год' },
    { m: 12, d: 31, name: 'Канун Нового года' },
];

// Праздники России с годами, когда их на самом деле отмечали, и с названиями своего времени.
// rule — плавающая дата: easter_o — православная Пасха (+ offset дней), nth — n-й день недели месяца.
export const HOLIDAYS_RU = [
    { m: 1, d: 1, name: 'Новый год' },
    { m: 1, d: 7, name: 'Рождество Христово', from: 1991 },
    { m: 1, d: 14, name: 'Старый Новый год' },
    { m: 1, d: 25, name: 'Татьянин день' },
    { m: 2, d: 23, name: 'День Советской армии и Военно-морского флота', to: 1992 },
    { m: 2, d: 23, name: 'День защитников Отечества', from: 1993 },
    { m: 3, d: 8, name: 'Международный женский день' },
    { m: 2, d: 14, name: 'День святого Валентина', from: 1993, about: 'в 90-е только входил в моду' },
    { m: 4, d: 1, name: 'День смеха' },
    { m: 4, d: 12, name: 'День космонавтики', from: 1962 },
    { m: 5, d: 1, name: 'День международной солидарности трудящихся', to: 1991 },
    { m: 5, d: 1, name: 'Праздник Весны и Труда', from: 1992 },
    { m: 5, d: 9, name: 'День Победы', from: 1945 },
    { m: 6, d: 1, name: 'День защиты детей', from: 1950 },
    { m: 6, d: 12, name: 'День принятия Декларации о суверенитете России', from: 1992, to: 2001 },
    { m: 6, d: 12, name: 'День России', from: 2002 },
    { m: 9, d: 1, name: 'День знаний', from: 1984 },
    { m: 11, d: 4, name: 'День народного единства', from: 2005 },
    { m: 11, d: 7, name: 'Годовщина Октябрьской революции', to: 1995 },
    { m: 11, d: 7, name: 'День согласия и примирения', from: 1996, to: 2004 },
    { m: 12, d: 12, name: 'День Конституции', from: 1994 },
    { m: 12, d: 31, name: 'Канун Нового года' },
    { rule: 'easter_o', offset: -49, name: 'Масленица (Прощёное воскресенье)' },
    { rule: 'easter_o', offset: 0, name: 'Пасха' },
    { rule: 'nth', m: 11, wd: 7, n: -1, name: 'День матери', from: 1998 },
    { m: 10, d: 31, name: 'Хэллоуин', from: 2000, about: 'в основном в клубах и у молодёжи' },
];

export const HOLIDAYS_US = [
    { m: 1, d: 1, name: 'Новый год' },
    { rule: 'nth', m: 1, wd: 1, n: 3, name: 'День Мартина Лютера Кинга', from: 1986 },
    { m: 2, d: 14, name: 'День святого Валентина' },
    { m: 3, d: 17, name: 'День святого Патрика' },
    { rule: 'easter_w', offset: 0, name: 'Пасха' },
    { rule: 'nth', m: 5, wd: 7, n: 2, name: 'День матери', from: 1914 },
    { rule: 'nth', m: 5, wd: 1, n: -1, name: 'День памяти', from: 1971 },
    { m: 7, d: 4, name: 'День независимости' },
    { rule: 'nth', m: 9, wd: 1, n: 1, name: 'День труда', from: 1894 },
    { m: 10, d: 31, name: 'Хэллоуин' },
    { rule: 'nth', m: 11, wd: 4, n: 4, name: 'День благодарения', from: 1942 },
    { m: 12, d: 24, name: 'Сочельник' },
    { m: 12, d: 25, name: 'Рождество' },
    { m: 12, d: 31, name: 'Канун Нового года' },
];

export const COUNTRY_HOLIDAYS = { RU: HOLIDAYS_RU, US: HOLIDAYS_US };

// Пасха: православная (юлианская, переведённая на наш календарь) и западная (григорианская).
function easter(y, orthodox) {
    if (orthodox) {
        const a = y % 4, b = y % 7, c = y % 19;
        const d = (19 * c + 15) % 30;
        const e = (2 * a + 4 * b - d + 34) % 7;
        const month = Math.floor((d + e + 114) / 31);
        const day = ((d + e + 114) % 31) + 1;
        const dt = new Date(Date.UTC(2000, month - 1, day));
        dt.setUTCFullYear(y);
        // разница юлианского и григорианского календарей
        const shift = Math.floor(y / 100) - Math.floor(y / 400) - 2;
        dt.setUTCDate(dt.getUTCDate() + shift);
        return dt;
    }
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    const dt = new Date(Date.UTC(2000, month - 1, day));
    dt.setUTCFullYear(y);
    return dt;
}

// Дата праздника в этом году: { m, d } или null, если в этот год его не отмечали.
export function holidayDate(cal, h, y) {
    if (!h) return null;
    if (h.from && y < h.from) return null;
    if (h.to && y > h.to) return null;
    if (!h.rule) return h.m && h.d ? { m: h.m, d: h.d } : null;
    if (!cal || cal.type !== 'greg') return null;
    if (h.rule === 'easter_o' || h.rule === 'easter_w') {
        const dt = easter(y, h.rule === 'easter_o');
        dt.setUTCDate(dt.getUTCDate() + (h.offset || 0));
        return { m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    }
    if (h.rule === 'nth') {
        const days = monthDays(cal, y, h.m);
        const list = [];
        for (let d = 1; d <= days; d++) {
            const wd = ((dayIndex(cal, { y, m: h.m, d }) + 3) % 7 + 7) % 7 + 1; // 1 — понедельник
            if (wd === h.wd) list.push(d);
        }
        const d = h.n > 0 ? list[h.n - 1] : list[list.length + h.n];
        return d ? { m: h.m, d } : null;
    }
    return null;
}

export const CALENDAR_TYPES = { greg: 'обычный', custom: 'придуманный', days: 'счёт дней' };

const int = (v, d = 0) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? n : d;
};
const pad = n => String(n).padStart(2, '0');
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

// ---------- Календарь ----------

export function normCalendar(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const t = String(r.type || '').toLowerCase();
    const type = /custom|fantasy|придум|свой/.test(t) ? 'custom' : (/day|дн/.test(t) ? 'days' : 'greg');
    const cal = { type };
    if (r.name) cal.name = clean(r.name).slice(0, 80);
    if (r.why) cal.why = clean(r.why).slice(0, 200);
    if (type === 'custom') {
        const months = (Array.isArray(r.months) ? r.months : [])
            .map(m => (typeof m === 'string' ? { name: m } : m))
            .filter(m => m && clean(m.name))
            .map(m => ({ name: clean(m.name).slice(0, 40), gen: clean(m.gen || m.genitive || m.name).slice(0, 40), days: Math.max(1, Math.min(99, int(m.days, 30))) }))
            .slice(0, 24);
        if (!months.length) return normCalendar(Object.assign({}, r, { type: 'days' }));
        cal.months = months;
        cal.weekdays = (Array.isArray(r.weekdays) ? r.weekdays : []).map(clean).filter(Boolean).map(w => w.slice(0, 30)).slice(0, 14);
        if (r.era) cal.era = clean(r.era).slice(0, 40);
    }
    if (type !== 'days') {
        const one = (h, kind) => {
            if (!h || typeof h !== 'object') return null;
            const x = { name: clean(h.name).slice(0, 70) };
            if (!x.name) return null;
            if (h.rule) {
                x.rule = String(h.rule);
                if (h.offset) x.offset = int(h.offset);
                if (h.wd) x.wd = int(h.wd);
                if (h.n) x.n = int(h.n);
                if (h.m || h.month) x.m = int(h.m ?? h.month);
            } else {
                x.m = int(h.month ?? h.m);
                x.d = int(h.day ?? h.d);
                if (!(x.m >= 1 && x.d >= 1 && x.m <= monthCount(cal) && x.d <= monthDays(cal, 2000, x.m))) return null;
            }
            if (h.from || h.since) x.from = int(h.from ?? h.since);
            if (h.to || h.until) x.to = int(h.to ?? h.until);
            if (h.about) x.about = clean(h.about).slice(0, 160);
            const k = h.kind || kind;
            if (k === 'canon') { x.kind = 'canon'; if (h.who) x.who = clean(h.who).slice(0, 60); }
            return x;
        };
        const hol = (Array.isArray(r.holidays) ? r.holidays : []).map(h => one(h, 'holiday')).filter(Boolean).slice(0, 30);
        const canon = (Array.isArray(r.canon) ? r.canon : []).map(h => one(h, 'canon')).filter(Boolean).slice(0, 20);
        const country = String(r.country || '').toUpperCase().slice(0, 2);
        if (type === 'greg' && country) cal.country = country;
        let base = hol;
        // для России и США — свои точные списки (с годами и плавающими датами); от модели добавляем только то, чего в них нет
        if (type === 'greg' && COUNTRY_HOLIDAYS[country] && r.source === 'model') {
            base = COUNTRY_HOLIDAYS[country].map(h => Object.assign({}, h));
            for (const h of hol) if (!base.some(b => b.name.toLowerCase() === h.name.toLowerCase() || (!b.rule && b.m === h.m && b.d === h.d))) base.push(h);
        }
        cal.holidays = [...(base.length || hol.length || r.holidays ? base : (type === 'greg' ? DEFAULT_HOLIDAYS.map(h => Object.assign({}, h)) : [])), ...canon];
    }
    if (r.wdShift !== undefined) cal.wdShift = int(r.wdShift);
    if (r.source) cal.source = String(r.source);
    return cal;
}

export function monthCount(cal) {
    return cal && cal.type === 'custom' ? cal.months.length : 12;
}

function leap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function monthDays(cal, y, m) {
    if (!cal || cal.type === 'days') return Infinity;
    if (cal.type === 'custom') return (cal.months[m - 1] || { days: 30 }).days;
    return [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 30;
}

export function monthName(cal, m, gen = false) {
    if (cal && cal.type === 'custom') {
        const x = cal.months[m - 1];
        return x ? (gen ? x.gen || x.name : x.name) : '';
    }
    return (gen ? MONTHS_RU_GEN : MONTHS_RU)[m - 1] || '';
}

function yearDays(cal) {
    return cal.months.reduce((a, x) => a + x.days, 0);
}

// Номер дня от начала отсчёта: по нему считаются день недели и разница во времени.
export function dayIndex(cal, t) {
    if (!cal || cal.type === 'days') return int(t.d, 1) - 1;
    if (cal.type === 'custom') {
        let n = int(t.y) * yearDays(cal);
        for (let i = 0; i < int(t.m, 1) - 1; i++) n += cal.months[i].days;
        return n + int(t.d, 1) - 1;
    }
    const dt = new Date(0);
    dt.setUTCFullYear(int(t.y, 2000), int(t.m, 1) - 1, int(t.d, 1));
    dt.setUTCHours(0, 0, 0, 0);
    return Math.floor(dt.getTime() / 86400000);
}

function fromDayIndex(cal, n) {
    if (!cal || cal.type === 'days') return { d: n + 1 };
    if (cal.type === 'custom') {
        const yl = yearDays(cal);
        const y = Math.floor(n / yl);
        let rest = n - y * yl;
        let m = 1;
        while (m < cal.months.length && rest >= cal.months[m - 1].days) { rest -= cal.months[m - 1].days; m++; }
        return { y, m, d: rest + 1 };
    }
    const dt = new Date(n * 86400000);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function toMinutes(cal, t) {
    return dayIndex(cal, t) * 1440 + int(t.h) * 60 + int(t.mi);
}

export function fromMinutes(cal, total) {
    const day = Math.floor(total / 1440);
    const rest = total - day * 1440;
    return Object.assign(fromDayIndex(cal, day), { h: Math.floor(rest / 60), mi: rest % 60 });
}

export function normTime(cal, t) {
    if (!t) return null;
    const x = { d: Math.max(1, int(t.d, 1)), h: Math.min(23, Math.max(0, int(t.h))), mi: Math.min(59, Math.max(0, int(t.mi))) };
    if (cal && cal.type !== 'days') {
        x.y = int(t.y, cal.type === 'greg' ? 2000 : 1);
        x.m = Math.min(monthCount(cal), Math.max(1, int(t.m, 1)));
        x.d = Math.min(monthDays(cal, x.y, x.m), x.d);
    }
    return x;
}

export function addMinutes(cal, t, n) {
    return fromMinutes(cal, toMinutes(cal, t) + Math.round(n));
}

// Следующий день (или этот же, если час ещё не наступил — when same) в заданный час.
export function atHour(cal, t, hour, { nextDay = false } = {}) {
    let day = dayIndex(cal, t);
    if (nextDay || int(t.h) * 60 + int(t.mi) >= hour * 60) day += 1;
    return Object.assign(fromDayIndex(cal, day), { h: hour, mi: 0 });
}

export function weekdayOf(cal, t) {
    if (!cal || cal.type === 'days') return '';
    if (cal.type === 'custom') {
        const L = cal.weekdays && cal.weekdays.length;
        if (!L) return '';
        return cal.weekdays[(((dayIndex(cal, t) + int(cal.wdShift)) % L) + L) % L];
    }
    const i = ((dayIndex(cal, t) + 3) % 7 + 7) % 7; // 1 января 1970 — четверг
    return WEEKDAYS_RU[i];
}

export function partOfDay(h) {
    h = int(h);
    if (h < 5) return 'ночь';
    if (h < 7) return 'раннее утро';
    if (h < 12) return 'утро';
    if (h < 17) return 'день';
    if (h < 22) return 'вечер';
    return 'поздний вечер';
}

export function fmtTime(t) {
    return t ? `${pad(int(t.h))}:${pad(int(t.mi))}` : '';
}

export function fmtDate(cal, t, { weekday = true, year = true } = {}) {
    if (!cal || !t) return '';
    if (cal.type === 'days') return `день ${int(t.d, 1)}`;
    const wd = weekday ? weekdayOf(cal, t) : '';
    let s = `${int(t.d, 1)} ${monthName(cal, int(t.m, 1), true)}`;
    if (year && t.y !== undefined) s += `${cal.type === 'greg' ? ' ' + t.y : ', ' + t.y}${cal.era ? ' ' + cal.era : ''}`;
    return (wd ? wd + ', ' : '') + s;
}

// Сколько прошло — словами: «2 часа», «3 дня», «неделя».
export function fmtSpan(min) {
    const m = Math.abs(Math.round(min));
    const pl = (n, a, b, c) => { const x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : (y === 1 ? a : (y >= 2 && y <= 4 ? b : c)); };
    if (m < 60) return `${m} ${pl(m, 'минута', 'минуты', 'минут')}`;
    if (m < 1440) { const h = Math.round(m / 60); return `${h} ${pl(h, 'час', 'часа', 'часов')}`; }
    if (m < 10080 * 2) { const d = Math.round(m / 1440); return `${d} ${pl(d, 'день', 'дня', 'дней')}`; }
    if (m < 43200 * 2) { const w = Math.round(m / 10080); return `${w} ${pl(w, 'неделя', 'недели', 'недель')}`; }
    if (m < 525600) { const mo = Math.round(m / 43200); return `${mo} ${pl(mo, 'месяц', 'месяца', 'месяцев')}`; }
    const y = Math.round(m / 525600);
    return `${y} ${pl(y, 'год', 'года', 'лет')}`;
}

// ---------- Отметки времени в тексте ответа (HUD, «**02:40, 8 октября 1996**») ----------

const RU_MONTH_RE = '(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])';
const EN_MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function ruMonth(w) {
    w = w.toLowerCase();
    if (w.startsWith('мар')) return 3;
    if (w.startsWith('ма')) return 5;
    const stems = ['янв', 'фев', 'мар', 'апр', 'ма', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return stems.findIndex(s => w.startsWith(s)) + 1;
}

function looksLikeStamp(line) {
    const l = line.trim();
    if (!l || l.length > 240) return false;
    return /[|[\]⌚⏰🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛📅📍]/u.test(l) || /^[*_`~>#\s]*\*\*/.test(l) || /^[*_`(\s]*\d{1,2}:\d{2}/.test(l) || /^\s*(время|time|date|дата)\s*[:—-]/i.test(l);
}

// Ищет в начале или в конце ответа строку-отметку с временем и/или датой. Возвращает { time, date, wd } или null.
export function findStamp(text, cal = null) {
    const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return null;
    const pool = lines.length <= 12 ? lines : [...lines.slice(0, 6), ...lines.slice(-6)];
    let found = null;
    for (const line of pool) {
        if (!looksLikeStamp(line)) continue;
        const l = line.replace(/[*_`]/g, '');
        const out = {};
        const tm = l.match(/(?:^|[^\d:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/);
        if (tm) out.time = { h: +tm[1], mi: +tm[2] };
        let r;
        if ((r = l.match(/\b(\d{3,4})-(\d{1,2})-(\d{1,2})\b/))) out.date = { y: +r[1], m: +r[2], d: +r[3] };
        else if ((r = l.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/))) out.date = { d: +r[1], m: +r[2], y: r[3].length === 2 ? (+r[3] > 40 ? 1900 : 2000) + +r[3] : +r[3] };
        else if ((r = l.match(new RegExp(`(\\d{1,2})\\s+${RU_MONTH_RE}(?:\\s+(\\d{3,4}))?`, 'i')))) out.date = { d: +r[1], m: ruMonth(r[2]), y: r[3] ? +r[3] : undefined };
        else if ((r = l.match(new RegExp(`\\b${EN_MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?(?:\\s+(\\d{3,4}))?`, 'i')))) out.date = { m: MONTHS_EN.indexOf(r[1].slice(0, 3).toLowerCase()) + 1, d: +r[2], y: r[3] ? +r[3] : undefined };
        else if ((r = l.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${EN_MONTH_RE}\\.?,?(?:\\s+(\\d{3,4}))?`, 'i')))) out.date = { d: +r[1], m: MONTHS_EN.indexOf(r[2].slice(0, 3).toLowerCase()) + 1, y: r[3] ? +r[3] : undefined };
        if (out.date && !(out.date.m >= 1 && out.date.m <= 12 && out.date.d >= 1 && out.date.d <= 31)) delete out.date;
        if (cal && cal.type === 'custom' && !out.date) {
            // свой календарь: «12 Урожайника 1247»
            for (let i = 0; i < cal.months.length; i++) {
                const mo = cal.months[i];
                const names = [mo.gen, mo.name].filter(Boolean).map(n => n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                const rr = l.toLowerCase().match(new RegExp(`(\\d{1,2})(?:-?[а-яё]{0,3})?\\s+(?:день\\s+)?(?:месяца\\s+)?(?:${names.join('|')})(?:[^\\d]{0,12}(\\d{1,5}))?`));
                if (rr) { out.date = { d: +rr[1], m: i + 1, y: rr[2] ? +rr[2] : undefined }; break; }
            }
        }
        const low = l.toLowerCase();
        const wdi = WEEKDAY_STEMS.findIndex(s => new RegExp(`(^|[^а-яё])${s}`).test(low));
        const wde = WEEKDAY_EN.findIndex(s => new RegExp(`\\b${s}`).test(low));
        if (cal && cal.type === 'custom' && cal.weekdays && cal.weekdays.length) {
            const ci = cal.weekdays.findIndex(w => low.includes(w.toLowerCase()));
            if (ci >= 0) out.wdName = cal.weekdays[ci];
        } else if (wdi >= 0) out.wd = wdi;
        else if (wde >= 0 && (out.time || out.date)) out.wd = wde;
        if (out.time || out.date) found = out;
    }
    return found;
}

// Явная сюжетная дата в ПОВЕСТВОВАНИИ, даже без декоративной строки-HUD.
// Исторические справки, даты рождения и планы на будущее не должны переводить часы.
const SCENE_DATE_CUE = /(?:^|[\s,.;:—–-])(?:сейчас|сегодня|на дворе|наступил(?:а|о)?|уже|теперь|в настоящий момент|действие происходит|события происходят|время действия|время в истории|в истории сейчас|в сцене|current date|today|it is now|scene date)(?=\s|\W|$)/i;
const SCENE_MONTH_RE = '(январ[ьея]|феврал[ьея]|март[ае]?|апрел[ьея]|ма[йея]|июн[ьея]|июл[ьея]|август[ае]?|сентябр[ьея]|октябр[ьея]|ноябр[ьея]|декабр[ьея])';
export function findSceneStamp(text, cal = null) {
    const lines = narrativeOnly(text).split(/\r?\n|[.!?](?=\s|$)/).map(x => x.trim()).filter(Boolean);
    let found = null;
    for (const line of lines.slice(-30)) {
        if (!SCENE_DATE_CUE.test(line)) continue;
        // Не воспринимать «сейчас думаю о 5 мая» как указание даты сцены.
        const scenePart = line.match(/(?:сейчас|сегодня|на дворе|наступил(?:а|о)?|уже|теперь|действие происходит|события происходят|время действия|время в истории|в истории сейчас|в сцене|current date|today|it is now|scene date)[^\n]{0,100}/i)?.[0] || line;
        let stamp = findStamp(`Дата: ${scenePart}`, cal);
        if (stamp && stamp.date) {
            stamp = { ...stamp, source: 'scene' };
            found = stamp;
            continue;
        }
        // «Сейчас май 1996 года», «действие происходит в мае 1996-го» —
        // точный день неизвестен: сохраняем число предыдущей даты.
        const m = scenePart.match(new RegExp(`(?:^|[^а-яёa-z])${SCENE_MONTH_RE}(?:\\s+(\\d{4})(?:-?(?:й|го|м))?)?`, 'i'));
        if (m) {
            const mo = ruMonth(m[1]);
            if (mo >= 1 && mo <= 12) found = { date: { m: mo, y: m[2] ? +m[2] : undefined }, monthOnly: true, source: 'scene' };
        }
    }
    return found;
}

// ---------- Таймскипы в тексте («через два дня», «на следующее утро», «three hours later») ----------

const NUM_WORDS = {
    один: 1, одна: 1, одну: 1, одного: 1, два: 2, две: 2, двух: 2, пару: 2, пара: 2, три: 3, трёх: 3, трех: 3, четыре: 4, пять: 5, шесть: 6, семь: 7,
    восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, пятнадцать: 15, двадцать: 20, тридцать: 30, сорок: 40, несколько: 3, нескольких: 3,
    полтора: 1.5, полторы: 1.5,
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, few: 3, several: 3, couple: 2,
};
const NUM_RE = '(\\d+|' + Object.keys(NUM_WORDS).join('|') + ')';
const UNIT_RE = '(минут[ауы]?|мин\\.?|час(?:а|ов)?|сут(?:ки|ок)|дн(?:я|ей)|день|недел[июья]|месяц(?:а|ев)?|год(?:а)?|лет|minutes?|hours?|days?|weeks?|months?|years?)';

function unitMin(u) {
    u = u.toLowerCase();
    if (/^мин|^minute/.test(u)) return 1;
    if (/^час|^hour/.test(u)) return 60;
    if (/^сут|^дн|^день|^day/.test(u)) return 1440;
    if (/^недел|^week/.test(u)) return 10080;
    if (/^месяц|^month/.test(u)) return 43200;
    return 525600;
}

function numOf(w) {
    if (w === undefined || w === null || w === '') return 1;
    const n = Number(w);
    return Number.isFinite(n) ? n : (NUM_WORDS[String(w).toLowerCase()] ?? 1);
}

// Прямая речь («через два дня уеду») — не таймскип: убираем её из текста.
function narrativeOnly(text) {
    return String(text || '')
        .replace(/«[^»]*»/g, ' ')
        .replace(/“[^”]*”/g, ' ')
        .replace(/"[^"\n]*"/g, ' ')
        .replace(/(^|\n)\s*[—–-]\s[^\n]*/g, '$1');
}

// Возвращает самый большой найденный скачок: { add: минуты } или { at: час, next: true|false }.
export function findSkip(text) {
    const t = ' ' + narrativeOnly(text).toLowerCase().replace(/ё/g, 'е') + ' ';
    let best = null;
    const take = (cand, size) => { if (!best || size > best.size) best = Object.assign({ size }, cand); };
    let r;
    const re1 = new RegExp(`(?:через|спустя|after)\\s+(?:${NUM_RE}\\s+)?(?:с\\s+)?${UNIT_RE}`, 'g');
    while ((r = re1.exec(t))) { const v = numOf(r[1]) * unitMin(r[2]); take({ add: v }, v); }
    const re2 = new RegExp(`(?:${NUM_RE}\\s+)?${UNIT_RE}\\s+(?:спустя|later)`, 'g');
    while ((r = re2.exec(t))) { const v = numOf(r[1]) * unitMin(r[2]); take({ add: v }, v); }
    const re3 = new RegExp(`прош(?:ло|ла|ел|ли)\\s+(?:еще\\s+|целых\\s+|почти\\s+)?(?:${NUM_RE}\\s+)?${UNIT_RE}`, 'g');
    while ((r = re3.exec(t))) { const v = numOf(r[1]) * unitMin(r[2]); take({ add: v }, v); }
    if (/(через|спустя)\s+полчаса|полчаса\s+спустя|half an hour later/.test(t)) take({ add: 30 }, 30);
    if (/(через|спустя)\s+четверть\s+часа/.test(t)) take({ add: 15 }, 15);
    if (/на следующее утро|следующим утром|наутро|утром следующего дня|the next morning|next morning/.test(t)) take({ at: 8, next: true }, 1440);
    else if (/на следующий день|следующим днем|the next day|next day/.test(t)) take({ at: 12, next: true }, 1440);
    if (/на следующий вечер|следующим вечером|вечером следующего дня|the next evening|next evening/.test(t)) take({ at: 19, next: true }, 1440);
    if (/(тем же|этим же|этим)\s+вечером|вечером того же дня|к вечеру|that evening/.test(t)) take({ at: 19 }, 60);
    if (/(той же|этой же)\s+ночью|к ночи|that night/.test(t)) take({ at: 23 }, 60);
    if (/к утру|под утро/.test(t)) take({ at: 6 }, 60);
    if (!best) return null;
    delete best.size;
    // скачки больше 20 лет — скорее всего не про сцену
    if (best.add && best.add > 525600 * 20) return null;
    return best;
}

export function applySkip(cal, t, skip) {
    if (!skip) return t;
    if (skip.add) return addMinutes(cal, t, skip.add);
    if (skip.at !== undefined) return atHour(cal, t, skip.at, { nextDay: !!skip.next });
    return t;
}

// Отметка из ответа → время. Неизвестные части (год, дата) берутся из текущих часов.
export function stampToTime(cal, cur, st) {
    if (!st) return null;
    const base = cur || (cal && cal.type !== 'days' ? { y: 2000, m: 1, d: 1, h: 12, mi: 0 } : { d: 1, h: 12, mi: 0 });
    let t = Object.assign({}, base);
    if (st.date && cal && cal.type !== 'days') {
        t.m = st.date.m;
        // Для «сейчас май 1996» не выдумываем первое число: сохраняем известный день.
        t.d = st.monthOnly ? Math.min(base.d, monthDays(cal, st.date.y ?? base.y, t.m)) : st.date.d;
        if (st.date.y !== undefined) t.y = st.date.y;
        else if (cur) {
            // год не указан: берём ближайшую такую дату не раньше текущей
            const same = Object.assign({}, t, { y: cur.y });
            t.y = toMinutes(cal, Object.assign({}, same, { h: 23, mi: 59 })) < toMinutes(cal, cur) ? cur.y + 1 : cur.y;
        }
    }
    if (st.time) { t.h = st.time.h; t.mi = st.time.mi; }
    else if (st.date && !cur) { t.h = 12; t.mi = 0; }
    // только время без даты: если оно «раньше», чем сейчас, — значит, уже следующий день
    if (st.time && !st.date && cur && toMinutes(cal, t) < toMinutes(cal, cur) - 30) t = addMinutes(cal, t, 1440);
    return normTime(cal, t);
}

// Новое время после ответа: отметка в тексте важнее всего, потом явный таймскип, потом обычный шаг за ответ.
export function advance(cal, cur, texts, { step = 5 } = {}) {
    const all = (Array.isArray(texts) ? texts : [texts]).filter(Boolean);
    const botText = all[all.length - 1] || '';
    // Приоритет: явная отметка бота, сюжетная дата бота, затем дата игрока.
    // Старый алгоритм вовсе не проверял дату в сообщении игрока.
    const candidates = [
        { st: findStamp(botText, cal), why: 'stamp' },
        { st: findSceneStamp(botText, cal), why: 'scene' },
        ...all.slice(0, -1).reverse().flatMap(tx => [
            { st: findStamp(tx, cal), why: 'stamp' },
            { st: findSceneStamp(tx, cal), why: 'scene' },
        ]),
    ];
    for (const { st, why } of candidates) {
        if (!st) continue;
        const t = stampToTime(cal, cur, st);
        if (t) return { t, why, stamp: st };
    }
    if (!cur) return null;
    let skip = null;
    for (const tx of all) {
        const s = findSkip(tx);
        if (!s) continue;
        const a = applySkip(cal, cur, s);
        const size = toMinutes(cal, a) - toMinutes(cal, cur);
        if (!skip || size > skip.size) skip = { t: a, size };
    }
    if (skip && skip.size > 0) return { t: skip.t, why: 'skip', size: skip.size };
    if (step > 0) return { t: addMinutes(cal, cur, step), why: 'step', size: step };
    return { t: cur, why: 'same', size: 0 };
}

// ---------- Праздники и дни рождения ----------

// Ближайшие события начиная с сегодняшнего дня: [{ m, d, name, kind, inDays, age?, about? }].
export function upcoming(cal, t, people = [], days = 60) {
    if (!cal || !t || cal.type === 'days') return [];
    const out = [];
    const today = dayIndex(cal, t);
    const addAt = (y, m, d, item) => {
        if (m < 1 || m > monthCount(cal)) return false;
        const dd = Math.min(d, monthDays(cal, y, m));
        const inDays = dayIndex(cal, { y, m, d: dd }) - today;
        if (inDays >= 0 && inDays <= days) { out.push(Object.assign({ m, d: dd, y, inDays }, item)); return true; }
        return false;
    };
    const add = (m, d, item) => { for (const y of [t.y, t.y + 1]) if (addAt(y, m, d, item)) break; };
    for (const h of cal.holidays || []) {
        for (const y of [t.y, t.y + 1]) {
            const at = holidayDate(cal, h, y);
            if (at && addAt(y, at.m, at.d, { name: h.name, kind: h.kind === 'canon' ? 'canon' : 'holiday', about: h.about, who: h.who })) break;
        }
    }
    for (const p of people || []) {
        if (!p || !p.born || !p.born.m || !p.born.d) continue;
        add(p.born.m, p.born.d, { name: p.name, kind: 'birthday', by: p.born.y });
    }
    for (const e of out) if (e.kind === 'birthday' && e.by && cal.type === 'greg') e.age = e.y - e.by;
    return out.sort((a, b) => a.inDays - b.inDays || (a.kind === 'holiday') - (b.kind === 'holiday'));
}

// Возраст на текущую дату (обычный календарь).
export function ageOn(cal, t, born) {
    if (!cal || cal.type === 'days' || !t || !born || !born.y) return null;
    let a = t.y - born.y;
    // известен только год рождения — считаем, что день рождения в этом году уже был
    if (born.m && born.d && (t.m < born.m || (t.m === born.m && t.d < born.d))) a -= 1;
    return a >= 0 && a < 200 ? a : null;
}

// Сколько лет персонажу сейчас, по часам сцены: по дате рождения, а если её нет — по возрасту,
// который был назван в момент ageAt ({ age, y, m, d }), плюс прошедшие с тех пор годы.
export function ageNow(cal, t, p) {
    if (!cal || !t || !p) return null;
    if (p.born && p.born.y && cal.type !== 'days') return ageOn(cal, t, p.born);
    const at = p.ageAt;
    if (!at || !Number.isFinite(at.age)) return null;
    if (cal.type === 'days' || at.d === undefined) return at.age;
    const yl = cal.type === 'custom' ? yearDays(cal) : 365.2425;
    const passed = dayIndex(cal, t) - dayIndex(cal, at);
    // если день рождения известен (без года) — возраст прибавляется ровно в него
    if (cal.type === 'greg' && p.born && p.born.m && at.y) {
        let a = at.age;
        for (let y = at.y; y <= t.y; y++) {
            const bd = dayIndex(cal, { y, m: p.born.m, d: Math.min(p.born.d, monthDays(cal, y, p.born.m)) });
            if (bd > dayIndex(cal, at) && bd <= dayIndex(cal, t)) a++;
        }
        return a;
    }
    return at.age + Math.max(0, Math.floor((passed + 1) / yl));
}

// Сетка месяца для календаря в дневнике: недели по строкам, в клетках — число и отметки.
// Короткие подписи дней недели, как в обычном календаре: «Пн», «Вт»… — две буквы, а если совпадают, то три.
export function weekdayHeads(list) {
    const names = (list || []).map(w => String(w || '').trim()).filter(Boolean);
    if (!names.length) return [];
    const cap = t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    // привычные русские дни недели — привычными сокращениями
    const RU = [['пон', 'Пн'], ['вто', 'Вт'], ['сре', 'Ср'], ['чет', 'Чт'], ['пят', 'Пт'], ['суб', 'Сб'], ['вос', 'Вс']];
    const ru = names.map(w => (RU.find(([st]) => w.toLowerCase().startsWith(st)) || [])[1]);
    if (ru.every(Boolean) && new Set(ru).size === ru.length) return ru;
    for (const n of [2, 3, 4]) {
        const short = names.map(w => cap(w.slice(0, n)));
        if (new Set(short).size === short.length) return short;
    }
    return names.map(w => cap(w.slice(0, 4)));
}

export function monthGrid(cal, y, m, marks = []) {
    if (!cal || cal.type === 'days') return null;
    const days = monthDays(cal, y, m);
    const L = cal.type === 'greg' ? 7 : (cal.weekdays && cal.weekdays.length) || 7;
    const first = dayIndex(cal, { y, m, d: 1 });
    const lead = cal.type === 'greg' ? ((first + 3) % 7 + 7) % 7 : (cal.weekdays && cal.weekdays.length ? (((first + int(cal.wdShift)) % L) + L) % L : 0);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push({ d, marks: marks.filter(x => x.m === m && x.d === d) });
    while (cells.length % L) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += L) weeks.push(cells.slice(i, i + L));
    const heads = cal.type === 'greg' ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] : weekdayHeads(cal.weekdays);
    return { y, m, title: `${monthName(cal, m)}${cal.type === 'greg' || y !== undefined ? ' ' + y + (cal.era ? ' ' + cal.era : '') : ''}`, heads, weeks };
}

// Отметки месяца: праздники (с учётом года и плавающих дат), канонные даты и дни рождения.
export function monthMarks(cal, y, m, people = []) {
    const out = [];
    for (const h of (cal && cal.holidays) || []) {
        const at = holidayDate(cal, h, y);
        if (at && at.m === m) out.push({ m, d: at.d, name: h.name, kind: h.kind === 'canon' ? 'canon' : 'holiday', who: h.who, about: h.about });
    }
    for (const p of people || []) {
        if (p.born && p.born.m === m && p.born.d) out.push({ m, d: p.born.d, name: p.name, kind: 'birthday', age: cal && cal.type === 'greg' && p.born.y ? y - p.born.y : null });
    }
    return out;
}

// Сдвиг на месяц вперёд/назад для листания календаря.
export function shiftMonth(cal, y, m, by) {
    const n = monthCount(cal);
    let idx = (y * n) + (m - 1) + by;
    const ny = Math.floor(idx / n);
    return { y: ny, m: idx - ny * n + 1 };
}

// ---------- Подсказка основной модели ----------

export function clockInjection(cal, t, { people = [], lastSkip = 0, lang = 'ru' } = {}) {
    if (!cal || !t) return '';
    const when = cal.type === 'days'
        ? `${fmtDate(cal, t)} истории, ${fmtTime(t)} — ${partOfDay(t.h)}`
        : `${fmtDate(cal, t)}, ${fmtTime(t)} — ${partOfDay(t.h)}`;
    const parts = [`Время сцены: ${when}.`];
    const ev = upcoming(cal, t, people, 7);
    const today = ev.filter(e => e.inDays === 0);
    const soon = ev.filter(e => e.inDays > 0).slice(0, 3);
    const evText = e => e.kind === 'birthday' ? `${e.name} — день рождения${e.age ? ` (исполнится ${e.age})` : ''}` : (e.kind === 'canon' && e.who ? `${e.who}: ${e.name}` : e.name);
    if (today.length) parts.push(`Сегодня: ${today.map(evText).join(', ')}.`);
    if (soon.length) parts.push(`Скоро: ${soon.map(e => `${evText(e)} — через ${fmtSpan(e.inDays * 1440)}`).join('; ')}.`);
    if (lastSkip >= 180) parts.push(`С прошлой сцены прошло ${fmtSpan(lastSkip)}.`);
    const ages = (people || []).map(p => ({ name: p.name, age: ageNow(cal, t, p) })).filter(x => x.age !== null && x.age >= 0).slice(0, 10);
    if (ages.length) parts.push(`Возраст сейчас: ${ages.map(x => `${x.name} — ${x.age}`).join(', ')} (это актуальный возраст на дату сцены — он важнее возраста, написанного в карточке и лорбуке).`);
    if (cal.type === 'custom') parts.push(`Календарь мира свой${cal.name ? ` («${cal.name}»)` : ''}: месяцы — ${cal.months.map(x => x.name).join(', ')}${cal.weekdays && cal.weekdays.length ? `; дни недели — ${cal.weekdays.join(', ')}` : ''}.`);
    parts.push('Учитывай время суток, день недели и сколько прошло времени. Время в истории идёт только вперёд.');
    return `[${parts.join(' ')}]`;
}

// ---------- Запрос: какой календарь у этой истории ----------

export function buildCalendarPrompt(info, lang = 'русском') {
    const system = [
        'Ты помогаешь вести часы и календарь ролевой истории. По карточке, описанию игрока, лорбуку и сообщениям определи, какой у этой истории календарь и который сейчас день и час.',
        `Отвечай ТОЛЬКО JSON, без пояснений. Названия — на ${lang} языке.`,
        'type: "real" — наш мир в любую эпоху (современность, прошлое, недалёкое будущее, альтернативная история с нашими месяцами); "custom" — любой мир, далёкий от нашего, где наши месяцы и дни недели были бы нелогичны: фэнтези, другая планета, далёкий космос и колонии со своим счётом времени, мир после катастрофы со своим летоисчислением, мифический или сказочный мир, своя эра. Если календарь мира явно не описан, сначала оцени фактические признаки привычных месяцев и дней недели; не выдумывай другой календарь лишь из-за наличия магии, фантастики, альтернативной истории или действия в 2090-х; "days" — только если по истории никак не понять ни даты, ни календаря и придумывать его странно.',
        'Для "custom": если в лорбуке или карточке есть свои месяцы, дни недели, эра и праздники — бери ровно их. Если нет — придумай календарь под сеттинг: 8–14 месяцев (у каждого name — как называется, gen — как пишется после числа: «12 Урожайника», days — сколько дней), 5–10 дней недели, era — подпись к году («г. Т.Э.»), 4–8 праздников этого мира с датами. Названия — в духе мира, не шаблонные. Дни недели в выдуманном мире — СВОИ (например, по богам, стихиям, лунам, ремёслам этого мира), а не понедельник, вторник, среда… и не их сокращения; наши названия бери, только если сам лорбук или карточка так их называют. То же с месяцами: «январь», «декабрь» и прочие наши — только если они прямо есть в мире.',
        'Для "real": country — двухбуквенный код страны, где идёт история (RU, US, GB, JP…). holidays — 7–18 действительно распространённых праздников, которые отмечали ИМЕННО в этой стране и в эту эпоху (число зависит от традиций, искусственно не заполняй) (с month и day числами; from/to — годы, если праздник появился или отменён). Не добавляй чужие праздники: например, в России 90-х Хэллоуин и католическое Рождество почти не праздновали, а 7 ноября было выходным. Для России и США можно не перечислять общеизвестные — их дневник знает сам; добавь только местные и особые для сеттинга.',
        'canon — личные даты из карточки и лорбука, которые важны персонажам: годовщины, дни памяти (например, когда герой ездит на кладбище к матери), свадьба, день знакомства, профессиональные праздники героя. who — чья это дата, name — что за дата, month и day — числами, about — коротко, что в этот день происходит. Только то, что прямо есть в тексте; если нет — пустой список.',
        'now — какое сейчас число и время в истории по последним сообщениям: date — "ГГГГ-ММ-ДД" для real, "Г-М-Д" числами для custom (месяц — номер по порядку), null если не понять; time — "ЧЧ:ММ" или null; day — номер дня истории для "days". Если дату не назвали прямо, но её можно надёжно вывести (год, сезон, события) — выведи; если нельзя — null.',
        'why — одна короткая фраза, почему такой календарь.',
        'Формат: {"calendar":{"type":"real|custom|days","country":"RU","name":"","era":"","why":"","months":[{"name":"","gen":"","days":30}],"weekdays":[""],"holidays":[{"name":"","month":1,"day":1,"about":"","from":null,"to":null}],"canon":[{"who":"","name":"","month":1,"day":1,"about":""}]},"now":{"date":null,"time":null,"day":1}}',
    ].join('\n');
    const parts = [];
    if (info.card) parts.push(`[Карточка: ${info.botName}]\n${info.card}`);
    if (info.persona) parts.push(`[Игрок: ${info.userName}]\n${info.persona}`);
    if (info.lore && info.lore.length) parts.push(`[Лорбук]\n${info.lore.join('\n\n')}`);
    if (info.messages && info.messages.length) parts.push(`[Сообщения]\n${info.messages.join('\n\n')}`);
    parts.push('Верни JSON.');
    return { system, user: parts.join('\n\n') };
}

// Разбирает ответ модели про календарь: { calendar, now } (now — уже в виде времени или null).
export function parseCalendarAnswer(data) {
    const d = data && typeof data === 'object' ? data : {};
    const raw = d.calendar || d;
    const type = String(raw.type || '').toLowerCase();
    const cal = normCalendar(Object.assign({}, raw, { type: type === 'real' ? 'greg' : type, source: 'model' }));
    const now = d.now || {};
    let t = null;
    if (cal.type === 'days') {
        t = { d: Math.max(1, int(now.day, 1)), h: 12, mi: 0 };
    } else if (now.date) {
        const r = String(now.date).match(/(-?\d{1,5})\D+(\d{1,2})\D+(\d{1,2})/);
        if (r) t = { y: +r[1], m: +r[2], d: +r[3], h: 12, mi: 0 };
    }
    if (now.time) {
        const r = String(now.time).match(/(\d{1,2})\D+(\d{2})/);
        if (r) {
            t = t || (cal.type === 'days' ? { d: 1 } : null);
            if (t) { t.h = +r[1]; t.mi = +r[2]; }
        }
    }
    return { calendar: cal, now: t ? normTime(cal, t) : null };
}

// Поправка от модели дневника: scene_time {time, date, flashback}. Время не идёт назад.
export function sceneTimeFix(cal, cur, st) {
    if (!cal || !cur || !st || typeof st !== 'object' || st.flashback) return null;
    const stamp = {};
    if (st.time) {
        const r = String(st.time).match(/(\d{1,2})\D+(\d{2})/);
        if (r && +r[1] < 24 && +r[2] < 60) stamp.time = { h: +r[1], mi: +r[2] };
    }
    if (st.date && cal.type !== 'days') {
        const r = String(st.date).match(/(-?\d{1,5})\D+(\d{1,2})\D+(\d{1,2})/);
        if (r) stamp.date = { y: +r[1], m: +r[2], d: +r[3] };
    }
    if (!stamp.time && !stamp.date) return null;
    const t = stampToTime(cal, cur, stamp);
    if (!t || toMinutes(cal, t) <= toMinutes(cal, cur)) return null;
    // одно время без даты, которое «перепрыгивает» на полсуток вперёд, — скорее поправка назад, такую не берём
    if (!stamp.date && toMinutes(cal, t) - toMinutes(cal, cur) > 720) return null;
    // больше месяца за один разбор — подозрительно, такую поправку не берём
    if (toMinutes(cal, t) - toMinutes(cal, cur) > 43200) return null;
    return t;
}

// Ручной ввод: «+2ч», «+3д», «+1н», «14:30», «1996-10-08», «утро».
export function parseClockCommand(cal, cur, arg) {
    const a = String(arg || '').trim().toLowerCase().replace(/ё/g, 'е');
    if (!a) return null;
    let r;
    if ((r = a.match(/^([+-])\s*(\d+(?:[.,]\d+)?)\s*(м|мин|min|ч|час|h|д|дн|день|дня|дней|d|н|нед|w|мес|m)?\w*$/))) {
        const n = parseFloat(r[2].replace(',', '.')) * (r[1] === '-' ? -1 : 1);
        const u = r[3] || 'ч';
        const k = /^м|^min/.test(u) && u !== 'мес' ? 1 : /^ч|^h/.test(u) ? 60 : /^д|^d/.test(u) ? 1440 : /^н|^w/.test(u) ? 10080 : 43200;
        return cur ? addMinutes(cal, cur, n * k) : null;
    }
    const parts = { 'утро': 8, 'утром': 8, 'день': 13, 'днем': 13, 'вечер': 19, 'вечером': 19, 'ночь': 23, 'ночью': 23 };
    if (parts[a] !== undefined && cur) return atHour(cal, cur, parts[a]);
    const st = findStamp(`[${arg}]`, cal);
    if (st) return stampToTime(cal, cur, st);
    if (cal && cal.type === 'days' && (r = a.match(/^(?:день\s*)?(\d+)$/))) return normTime(cal, Object.assign({}, cur || { h: 12, mi: 0 }, { d: +r[1] }));
    return null;
}
