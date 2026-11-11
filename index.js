// «Внутренний мир» — желания, страхи, настроение, мечта, черты и первое впечатление персонажей.
import {
    MODULES, MODEL_MODULES, MODULE_NAMES, normText, mergeSettings, emptyState, parseAnalysis, applyAnalysis, sameName, decayState,
    buildSystemPrompt, buildUserPrompt, buildInjection, buildAttrInjection, cleanMessageText, mentioned,
    emptyRoster, parseRoster, rosterFind, rosterMentioned, rosterNames, isMain, namesMatch, namesLookAlike, buildRosterPrompt, loreText,
    prepText, mentionedIn, catchUpTokens, CATCHUP_MSG_CHARS, CATCHUP_EXCERPTS, verifyAliases,
    mergeRoster, buildDreamPrompt, parseDream, buildRewardsPrompt, parseRewards, buyReward, carryOwnEdits, restoreTrait, responseBudget, classifyError,
    extractJson, nameScript, parseBorn, zodiacOf, bornText,
    plural,
    purseOf,
    cancelReward,
} from './src/core.js';
import { cleanAchievement, addAchievement } from './src/showcase.js';
import {
    normCalendar, normTime, advance, findStamp, stampToTime, addMinutes, atHour, toMinutes, fmtDate, fmtTime, fmtSpan, partOfDay,
    upcoming, monthGrid, monthMarks, shiftMonth, monthName, monthCount, monthDays, clockInjection, buildCalendarPrompt, parseCalendarAnswer, sceneTimeFix,
    parseClockCommand, CALENDAR_TYPES, MONTHS_RU, dayIndex,
} from './src/clock.js';
import { playSound, setVolume, setSilentMode } from './src/sound.js';
import { THEMES, THEME_IDS, validTheme, themeFontUrls, icon as iconHtml } from './src/themes.js';
import { renderPanel, renderToast, renderErrorToast, renderFab, renderBooksField, setSignInfo, esc } from './src/render.js';
import { renderSettingsForm, applySettingChange } from './src/settings-ui.js';
import { chatRequest, fetchModels, missingFields } from './src/api.js';

const VERSION = '0.5.1';
const UPDATED = '10.11.2026'; // дата последнего обновления — видна внизу дневника и настроек
setSignInfo(VERSION, UPDATED);
const UI_CSS = new URL('./ui.css', import.meta.url).href;

const SETTINGS_KEY = 'innerWorld';
const META_KEY = 'inner_world';
const PROMPT_KEY = 'inner_world';
const ATTR_PROMPT_KEY = 'inner_world_attraction';
const CLOCK_PROMPT_KEY = 'inner_world_clock';
const CLOCK_KEY = 'inner_world_clock';
const KEEP_SNAPSHOTS = 12;
const ROSTER_V = 2;        // 2 — в списке НПС есть знакомства по предыстории (knows_main / knows_player)
const SKIP_TYPES = ['first_message', 'command', 'extension', 'impersonate', 'quiet'];

let busy = false;
let busyKind = '';         // какая кнопка разбора сейчас крутится: chat | lore | all
let dreamBusy = false;
let shopBusy = false;
let pending = null;
let view = '';
let viewBefore = '';      // куда вернуться из витрины
let caseSel = '';         // что выбрано на полке витрины
let giftTo = 'owner';     // кому покупать памятные вещи в лавке: владельцу лавки или персоне игрока            // 'main:<имя>' | 'npc' | 'npc:<имя>' | 'settings'
let lastView = '';
let rosterBusy = false;
let status = '';
// Живой листок поверх дневника, пока модель пишет: этап, что уже написано и черновое состояние за размытием.
let live = null;
let liveTimer = null;
// Выбор «что привлекает»: какой список пополняем и открыт ли каталог.
let attrMode = 'likes';
let attrOpen = false;
let attrMore = {};
let currentTheme = 'diary';
// Часы сцены: какой месяц открыт в календаре, раскрыт ли листок часов, идёт ли определение календаря.
let clockMonth = null;
let clockOpen = false;
let clockBusy = false;
let clockSetOpen = false;
let clockDraft = null;     // выбранные в листке дата и время — применяются только кнопкой «Поставить»
let clockHolMonth = 0;     // месяц для нового праздника
let clockCalOpen = false;
const loadedFonts = new Set();

const ctx = () => SillyTavern.getContext();

// Дневник, кнопка и всплывашки живут в отдельном «слое» (shadow DOM):
// стили и темы таверны туда не попадают, и наши стили не задевают таверну.
let uiRoot = null;

function ui() {
    if (uiRoot) return uiRoot;
    const host = document.createElement('div');
    host.id = 'iw_host';
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:3050;';
    document.body.appendChild(host);
    uiRoot = host.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${UI_CSS}?v=${VERSION}-${Date.now()}`;
    uiRoot.appendChild(link);
    return uiRoot;
}

function byId(id) {
    return ui().getElementById(id);
}

let settingsReady = false;

function settings() {
    const c = ctx();
    if (!settingsReady || !c.extensionSettings[SETTINGS_KEY]) {
        c.extensionSettings[SETTINGS_KEY] = mergeSettings(c.extensionSettings[SETTINGS_KEY]);
        settingsReady = true;
    }
    return c.extensionSettings[SETTINGS_KEY];
}

function saveSettings() {
    ctx().saveSettingsDebounced();
}

function clone(v) {
    return JSON.parse(JSON.stringify(v));
}

// ---------- НПС из лорбука и карточки ----------

function rosterKey() {
    const c = ctx();
    if (c.groupId) return 'group:' + c.groupId;
    const ch = c.characters && c.characters[c.characterId];
    return ch ? ch.avatar : '';
}

function roster() {
    const key = rosterKey();
    const r = (key && settings().rosters[key]) || emptyRoster();
    return Object.assign({}, r, { find: name => rosterFind(r, name) });
}

// Открыт ли чат с персонажем или группой (на главной странице таверны — нет).
function hasChat() {
    const c = ctx();
    if (c.groupId) return true;
    const id = c.characterId;
    return id !== undefined && id !== null && id !== '' && !!(c.characters && c.characters[id]);
}

// Главные персонажи: имя карточки, имя файла аватарки, разбор карточки и участники группы.
// Если карточку изучили и главного в ней нет (карточка-рассказчик), имя бота главным не считаем.
function mainNames() {
    const c = ctx();
    if (!hasChat()) return [];
    const r = roster();
    const names = [...(r.main || [])];
    if (c.groupId) {
        const g = (c.groups || []).find(x => x.id === c.groupId);
        for (const av of (g && g.members) || []) {
            const ch = (c.characters || []).find(x => x.avatar === av);
            if (ch) names.push(ch.name.trim(), String(ch.avatar).replace(/\.[^.]+$/, ''));
        }
    } else {
        const narrator = r.at && !(r.main || []).length;
        const ch = c.characters[c.characterId];
        if (!narrator && ch) names.push(String(ch.name || '').trim(), String(ch.avatar || '').replace(/\.[^.]+$/, ''));
    }
    const out = [];
    for (const n of names) {
        if (n && !sameName(n, c.name1) && !out.some(x => namesMatch(x, n) || namesLookAlike(x, n))) out.push(n);
    }
    return out;
}

// Главные — сверху вкладками, даже если дневник по ним ещё пуст; остальные — НПС.
// Персона игрока в дневнике: ключ её записи (если уже разобрана) и имя.
function personaKeyOf(state) {
    const name = ctx().name1 || '';
    return state.order.find(k => state.characters[k] && (state.characters[k].persona || (name && sameName(k, name)))) || null;
}

function splitCast(state) {
    const mn = mainNames();
    const pk = personaKeyOf(state);
    const mainsInState = state.order.filter(k => k !== pk && isMain(k, mn));
    // пустая вкладка нужна, только если главного в дневнике ещё нет совсем (одна на персонажа карточки)
    const placeholders = mainsInState.length ? [] : mn.slice(0, 1);
    const mains = [...mainsInState, ...placeholders];
    const npcKeys = state.order.filter(k => k !== pk && !mainsInState.includes(k));
    return { mains, npcKeys, mn, placeholders, personaKey: pk };
}

// Аватарка персоны игрока — из модуля персон таверны (подгружаем один раз).
let personasMod = null;
import('/scripts/personas.js').then(m => { personasMod = m; }).catch(() => {});
function personaAvatarUrl() {
    const file = personasMod && personasMod.user_avatar;
    return file ? `/thumbnail?type=persona&file=${encodeURIComponent(file)}` : '';
}

// Кто из НПС лорбука уже упоминался в этом чате (без модели, простым поиском по тексту).
// seen — упоминались; lastAt — номер последнего сообщения с упоминанием;
// pending — упоминались после последней проверки (их ещё стоит разобрать).
let historyCache = { key: '', seen: [], lastAt: {}, pending: [] };

function historySeen() {
    const c = ctx();
    const ros = roster();
    const chat = c.chat || [];
    const checked = (chatMeta().checked) || {};
    const key = `${c.getCurrentChatId ? c.getCurrentChatId() : ''}|${chat.length}|${ros.at || 0}|${JSON.stringify(checked).length}`;
    if (historyCache.key === key) return historyCache;
    const mn = mainNames();
    const candidates = (ros.npc || []).filter(e => !mn.some(m => namesMatch(m, e.name)));
    const lastAt = {};
    chat.forEach((m, i) => {
        if (!m || m.is_system || !m.mes) return;
        const prepared = prepText(m.mes);
        for (const e of candidates) {
            if (rosterNames(e).some(n => mentionedIn(n, prepared))) lastAt[e.name] = i;
        }
    });
    const seen = candidates.filter(e => lastAt[e.name] !== undefined);
    const pending = seen.filter(e => !(checked[e.name] >= lastAt[e.name]));
    historyCache = { key, seen, lastAt, pending };
    return historyCache;
}

// Отрывок вокруг первого упоминания персонажа в сообщении.
function excerptAround(text, names, radius = 350) {
    const clean = cleanMessageText(text, 100000);
    const low = clean.toLowerCase().replace(/ё/g, 'е');
    let at = -1;
    for (const n of names) {
        for (const w of normText(n).split(' ').filter(x => x.length >= 3)) {
            const stem = w.length > 4 ? w.slice(0, w.length - 2) : (w.length === 4 ? w.slice(0, 3) : w);
            const i = low.indexOf(stem);
            if (i >= 0 && (at < 0 || i < at)) at = i;
        }
    }
    if (at < 0) return clean.slice(0, radius * 2);
    const from = Math.max(0, at - radius);
    return (from > 0 ? '… ' : '') + clean.slice(from, at + radius) + (at + radius < clean.length ? ' …' : '');
}

// onlyBook — разобрать только одну выбранную книгу (доп. лорбук, книгу памяти).
// Весь текст чата — чтобы понять, какие тайны из лорбука уже прозвучали
function chatTextAll() {
    return (ctx().chat || []).filter(m => m && !m.is_system && m.mes).map(m => m.mes).join('\n');
}

async function collectLoreSources(onlyBook = '') {
    const c = ctx();
    const out = [];
    const chatText = chatTextAll();
    const names = [c.name2, c.name1, ...((roster() && roster().main) || [])].filter(Boolean);
    if (onlyBook) {
        try {
            const data = await c.loadWorldInfo(onlyBook);
            const text = loreText(data && data.entries, 14000, { chatText, names });
            if (text) out.push({ title: `Лорбук: ${onlyBook}`, text });
        } catch (e) {
            console.warn('[Внутренний мир] лорбук не прочитан', onlyBook, e);
        }
        return out;
    }
    const ch = c.characters && c.characters[c.characterId];
    const off = new Set(offBooks());
    const card = off.has('__card') ? '' : cardDescription(c);
    if (card.trim()) out.push({ title: `Карточка: ${c.name2}`, text: cleanMessageText(card, 5000) });
    const persona = !off.has('__persona') && c.powerUserSettings && c.powerUserSettings.persona_description;
    if (persona) out.push({ title: `Игрок: ${c.name1}`, text: cleanMessageText(persona, 1500) });

    const books = new Set();
    const charBook = ch && ch.data && ch.data.extensions && ch.data.extensions.world;
    if (charBook) books.add(charBook);
    try {
        const wi = await import('/scripts/world-info.js');
        const extra = wi.world_info && wi.world_info.charLore && ch && wi.world_info.charLore.find(e => e.name === String(ch.avatar).replace(/\.[^.]+$/, ''));
        for (const b of (extra && extra.extraBooks) || []) books.add(b);
    } catch { /* нет доступа к доп. лорбукам */ }
    if (c.chatMetadata && c.chatMetadata.world_info) books.add(c.chatMetadata.world_info);
    const personaBook = c.powerUserSettings && c.powerUserSettings.persona_description_lorebook;
    if (personaBook) books.add(personaBook);
    // снятые галочками привязанные лорбуки не читаем
    for (const b of off) books.delete(b);
    // лорбуки, отмеченные галочками для этого чата
    for (const b of pickedBooks()) books.add(b);
    const per = Math.max(3000, Math.floor(14000 / Math.max(1, books.size)));
    for (const name of books) {
        try {
            const data = await c.loadWorldInfo(name);
            const text = loreText(data && data.entries, per, { chatText, names });
            if (text) out.push({ title: `Лорбук: ${name}`, text });
        } catch (e) {
            console.warn('[Внутренний мир] лорбук не прочитан', name, e);
        }
    }
    return out;
}

// Разбор карточки и лорбуков: список НПС (дополняется, а не заменяется) и сведения для главного персонажа.
// mode: 'lore' — только лорбук; 'all' — лорбук, а потом весь чат; book — доизучить одну книгу.
async function studyLore({ mode = 'lore', book = '' } = {}) {
    const c = ctx();
    const key = rosterKey();
    if (!key || !hasChat()) return notice('Сначала открой чат с персонажем.');
    if (rosterBusy || busy) return;
    const my = runId;
    rosterBusy = true;
    busyKind = mode === 'all' ? 'all' : 'lore';
    status = book ? `Читаю лорбук «${book}»…` : 'Читаю карточку и лорбуки…';
    setLive({ kind: 'roster', stage: 'prep', t0: Date.now(), chars: [], len: 0 });
    renderAll();
    let sources = [];
    let loreFp = '';
    try {
        sources = await collectLoreSources(book);
        if (!sources.length) throw new Error(book ? 'в этом лорбуке нет включённых записей' : 'нечего читать: карточка и лорбук пустые');
        // ничего не поменялось с прошлого разбора — новое не добавляем
        loreFp = hashStr(mode + '|' + sources.map(x => x.title + '\n' + x.text).join('\n'));
        const fp = chatMeta().fp || {};
        const sameLore = fp.lore === loreFp;
        const last0 = lastBotMessageId();
        const sameChat = last0 < 0 || (!!recordOf((c.chat || [])[last0]) && fp.chat === chatFp(last0));
        if (sameLore && (mode === 'lore' || sameChat) && !missingPersona() && settings().rosters[key] && (settings().rosters[key].v || 0) >= ROSTER_V) {
            rosterBusy = false;
            busyKind = '';
            setLive(null);
            status = 'Ничего нового с прошлого разбора';
            nothingNew(mode === 'lore' ? 'карточка и лорбуки' : 'чат, карточка и лорбуки');
            renderAll();
            return;
        }
        const rosterOld = !settings().rosters[key] || (settings().rosters[key].v || 0) < ROSTER_V;
        if ((!sameLore || rosterOld) && (settings().showNpc !== false || !(settings().rosters[key] && settings().rosters[key].at))) {
            const { system, user } = buildRosterPrompt(sources, c.name1, settings().language);
            liveStage('think');
            const raw = await callModel(system, user, withBudget('roster'), text => {
                if (live && text && live.stage !== 'write') liveStage('write');
                if (live) live.len = text.length;
            });
            const fresh = verifyAliases(parseRoster(raw, c.name1), sources.map(x => x.text).join('\n'));
            const old = settings().rosters[key];
            const merged = old && old.at ? mergeRoster(old, fresh) : { main: fresh.main, npc: fresh.npc };
            const books = new Set((old && old.books) || []);
            if (book) books.add(book);
            settings().rosters[key] = { main: merged.main, npc: merged.npc, at: Date.now(), books: [...books], v: ROSTER_V };
            saveSettings();
            rememberKnowledge(sources);
            status = `Знаю персонажей мира: ${merged.npc.length}`;
            historyCache.key = '';
        }
    } catch (err) {
        if ((err && err.cancelled) || my !== runId) return;
        console.error('[Внутренний мир]', err);
        const info = classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw) });
        status = 'Не получилось изучить: ' + info.title;
        showError(info, { manual: true, what: 'Изучение лорбука' });
        setLive(null);
        rosterBusy = false;
        busyKind = '';
        renderAll();
        return;
    }
    if (my !== runId) return;
    rosterBusy = false;
    if (live) live.stage = 'prep';
    renderAll();
    // сведения из карточки и лорбука — главному персонажу и тем, кто в сцене
    const last = lastBotMessageId();
    if (last >= 0) {
        await analyze(last, { manual: true, fromLore: sources.map(x => `[${x.title}]\n${x.text}`), kind: mode === 'all' ? 'all' : 'lore' });
    }
    if (my !== runId) return;
    chatMeta().fp = Object.assign({}, chatMeta().fp, { lore: loreFp });
    ctx().saveMetadataDebounced?.();
    setLive(null);
    busyKind = '';
    syncSettingsForm();
    renderAll();
}

// ---------- Где хранится состояние ----------
// Состояние лежит в сообщении, после которого его посчитали (mes.extra.inner_world),
// поэтому свайпы и удаление сообщений сами откатывают дневник. Старые копии переезжают в метаданные чата.

function chatMeta() {
    const c = ctx();
    if (!c.chatMetadata[META_KEY]) c.chatMetadata[META_KEY] = { base: null, counter: 0 };
    return c.chatMetadata[META_KEY];
}

// Запись дневника привязана к конкретному свайпу ответа (как скрытая отметка у ачивок):
// перегенерировал ответ — у нового свайпа записи нет, дневник берёт состояние ДО этого ответа
// и разбирает новый вариант заново; вернулся на старый свайп — возвращается и его запись.
function recordOf(mes) {
    if (!mes) return null;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    const own = mes.extra && mes.extra[META_KEY];
    if (own && own.state && (own.sid ?? 0) === sid) return own;
    // таверна не всегда переносит extra свайпа в сообщение — ищем запись в самом свайпе
    const sw = Array.isArray(mes.swipe_info) && mes.swipe_info[sid];
    const fromSwipe = sw && sw.extra && sw.extra[META_KEY];
    if (fromSwipe && fromSwipe.state && (fromSwipe.sid ?? sid) === sid) return fromSwipe;
    return null;
}

// Ищет последнее сохранённое состояние до сообщения beforeId (не включая его).
function findHolder(beforeId) {
    const chat = ctx().chat || [];
    const from = Math.min(beforeId ?? chat.length, chat.length) - 1;
    for (let i = from; i >= 0; i--) {
        const rec = recordOf(chat[i]);
        if (rec) return { index: i, state: rec.state };
    }
    const base = ctx().chatMetadata && ctx().chatMetadata[META_KEY] && ctx().chatMetadata[META_KEY].base;
    return { index: -1, state: base || null };
}

function currentState(beforeId) {
    const h = findHolder(beforeId);
    const st = h.state ? clone(h.state) : emptyState();
    if (!st.order) st.order = Object.keys(st.characters || {});
    return st;
}

// Сколько ответов бота прошло после сообщения holderIndex (до upTo включительно).
function botRepliesBetween(holderIndex, upTo) {
    if (holderIndex < 0) return 0;
    const chat = ctx().chat || [];
    let n = 0;
    for (let i = holderIndex + 1; i <= Math.min(upTo, chat.length - 1); i++) {
        const m = chat[i];
        if (m && !m.is_user && !m.is_system) n++;
    }
    return n;
}

// Состояние «на сейчас»: эмоции уже постарели на прошедшие ответы.
function liveState(beforeId) {
    const h = findHolder(beforeId);
    const upTo = (beforeId ?? (ctx().chat || []).length) - 1;
    return decayState(currentState(beforeId), botRepliesBetween(h.index, upTo));
}

function writeRecord(mesId, state) {
    const c = ctx();
    const mes = c.chat[mesId];
    if (!mes) return;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    const rec = { state: clone(state), sid, at: Date.now() };
    mes.extra = mes.extra || {};
    mes.extra[META_KEY] = rec;
    if (Array.isArray(mes.swipe_info) && mes.swipe_info[sid]) {
        mes.swipe_info[sid].extra = mes.swipe_info[sid].extra || {};
        mes.swipe_info[sid].extra[META_KEY] = clone(rec);
    }
    pruneRecords();
}

function pruneRecords() {
    const chat = ctx().chat || [];
    const holders = [];
    chat.forEach((m, i) => { if (m && m.extra && m.extra[META_KEY]) holders.push(i); });
    if (holders.length <= KEEP_SNAPSHOTS) return;
    const drop = holders.slice(0, holders.length - KEEP_SNAPSHOTS);
    const meta = chatMeta();
    for (const i of drop) {
        const rec = recordOf(chat[i]);
        if (rec) meta.base = rec.state;
        delete chat[i].extra[META_KEY];
        for (const sw of chat[i].swipe_info || []) {
            if (sw && sw.extra) delete sw.extra[META_KEY];
        }
    }
    ctx().saveMetadataDebounced?.();
}

async function saveEditedState(state) {
    const h = findHolder();
    if (h.index >= 0) {
        writeRecord(h.index, state);
        await ctx().saveChat();
    } else {
        chatMeta().base = clone(state);
        ctx().saveMetadataDebounced?.();
    }
}

// ---------- Часы и календарь сцены ----------
// Календарь — один на чат (в данных чата). Время — у каждого ответа своё (как запись дневника у свайпа):
// перегенерировал ответ — время считается заново от прошлого, вернулся на старый свайп — вернулось и его время.

function clockRecOf(mes) {
    if (!mes) return null;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    const own = mes.extra && mes.extra[CLOCK_KEY];
    if (own && own.t && (own.sid ?? 0) === sid) return own;
    const sw = Array.isArray(mes.swipe_info) && mes.swipe_info[sid];
    const fromSwipe = sw && sw.extra && sw.extra[CLOCK_KEY];
    if (fromSwipe && fromSwipe.t && (fromSwipe.sid ?? sid) === sid) return fromSwipe;
    return null;
}

function calendarOf() {
    const m = hasChat() ? chatMeta() : null;
    return m && m.calendar ? m.calendar : null;
}

// Время до сообщения beforeId (не включая его). Если записей нет — ищем отметку времени в недавних сообщениях.
function findClock(beforeId) {
    const chat = ctx().chat || [];
    const from = Math.min(beforeId ?? chat.length, chat.length) - 1;
    for (let i = from; i >= 0; i--) {
        const rec = clockRecOf(chat[i]);
        if (rec) return { index: i, t: rec.t, rec };
    }
    const meta = hasChat() ? chatMeta() : {};
    if (meta.clockBase) return { index: -1, t: meta.clockBase, rec: null };
    // часов ещё нет: может, время написано прямо в ответах («[02:50 | 08.10.1996]»)
    const cal = calendarOf();
    for (let i = from; i >= Math.max(0, from - 40); i--) {
        const m = chat[i];
        if (!m || m.is_system || !m.mes) continue;
        const st = findStamp(m.mes, cal);
        if (!st || (!cal && !st.date)) continue;
        const t = stampToTime(cal || normCalendar({ type: 'greg' }), null, st);
        if (t) return { index: i, t, rec: null, fromStamp: true, cal: cal || normCalendar({ type: 'greg', source: 'stamp' }) };
    }
    return { index: -1, t: null, rec: null };
}

function writeClock(mesId, rec) {
    const c = ctx();
    const mes = c.chat[mesId];
    if (!mes) return;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    const r = Object.assign({ sid, at: Date.now() }, rec);
    mes.extra = mes.extra || {};
    mes.extra[CLOCK_KEY] = r;
    if (Array.isArray(mes.swipe_info) && mes.swipe_info[sid]) {
        mes.swipe_info[sid].extra = mes.swipe_info[sid].extra || {};
        mes.swipe_info[sid].extra[CLOCK_KEY] = clone(r);
    }
}

function saveChatSoon() {
    const c = ctx();
    if (typeof c.saveChatDebounced === 'function') c.saveChatDebounced();
    else c.saveChat?.();
}

// Календарь и время «на сейчас» (или до сообщения beforeId).
function clockNow(beforeId) {
    if (settings().clock === false || !hasChat()) return null;
    const h = findClock(beforeId);
    let cal = calendarOf();
    if (!cal && h.cal) cal = h.cal;
    if (!cal) return { cal: null, t: null, h };
    return { cal, t: h.t ? normTime(cal, h.t) : null, h };
}

// Свежий ответ бота: сдвигаем часы — по отметке времени в ответе, по таймскипу или на обычный шаг.
function stepClock(messageId) {
    const s = settings();
    if (s.clock === false || !hasChat()) return;
    const chat = ctx().chat || [];
    const mes = chat[messageId];
    if (!mes || mes.is_user || mes.is_system) return;
    const meta = chatMeta();
    const prev = findClock(messageId);
    let cal = meta.calendar || prev.cal || null;
    const user = [];
    for (let i = messageId - 1; i >= 0 && i > prev.index; i--) {
        const m = chat[i];
        if (!m || m.is_system) continue;
        if (!m.is_user) break;
        user.unshift(m.mes || '');
    }
    const texts = [...user, mes.mes || ''];
    // календаря ещё нет, но в ответе есть дата — значит, обычный календарь
    if (!cal) {
        const st = findStamp(mes.mes, null);
        if (!st || !st.date) return;
        cal = normCalendar({ type: 'greg', source: 'stamp' });
    }
    if (!meta.calendar) meta.calendar = cal;
    const cur = prev.t ? normTime(cal, prev.t) : null;
    if (meta.clockLocked && cur) {
        writeClock(messageId, { t: cur, prev: cur, why: 'locked', size: 0 });
        return;
    }
    const res = advance(cal, cur, texts, { step: Number(s.clockStep ?? 5) });
    if (!res || !res.t) return;
    writeClock(messageId, { t: res.t, prev: cur, why: res.why, size: cur ? toMinutes(cal, res.t) - toMinutes(cal, cur) : 0 });
    ctx().saveMetadataDebounced?.();
}

// Для календаря и возраста: главные персонажи и персона первыми.
function clockPeople(state) {
    // умерших не считаем: у них нет ни дня рождения в календаре, ни возраста «сейчас»
    const list = Object.entries((state && state.characters) || {}).filter(([, c]) => c && (c.born || c.ageAt) && c.dead !== true);
    const mains = new Set(splitCast(state || emptyState()).mains);
    list.sort((a, b) => (mains.has(b[0]) || b[1].persona ? 1 : 0) - (mains.has(a[0]) || a[1].persona ? 1 : 0));
    return list.map(([, c]) => ({ name: c.name, born: c.born, ageAt: c.ageAt }));
}

// Возраст, названный в карточке, привязываем к дате сцены — дальше он растёт сам.
function pinAges(state, messageId) {
    const now = clockNow(messageId + 1);
    if (!now || !now.cal || !now.t) return;
    for (const c of Object.values(state.characters || {})) {
        if (!c || !c.ageSaid || c.ageAt) continue;
        c.ageAt = Object.assign({ age: c.ageSaid }, now.cal.type === 'days' ? { d: now.t.d } : { y: now.t.y, m: now.t.m, d: now.t.d });
        delete c.ageSaid;
    }
}

function clockPromptText(beforeId) {
    const s = settings();
    if (s.clock === false || s.clockInject === false) return '';
    const now = clockNow(beforeId);
    if (!now || !now.cal || !now.t) return '';
    const rec = now.h && now.h.rec;
    const chat = ctx().chat || [];
    const lastBot = beforeId === undefined ? lastBotMessageId() : beforeId - 1;
    const lastSkip = rec && now.h.index >= lastBot - 1 && (rec.why === 'skip' || rec.why === 'stamp' || rec.why === 'manual') ? Math.max(0, rec.size || 0) : 0;
    return clockInjection(now.cal, now.t, { people: clockPeople(liveState(beforeId)), lastSkip: chat.length ? lastSkip : 0 });
}

// Для дневника: модель видит часы сцены и может их поправить.
function clockForAnalysis(messageId) {
    const now = clockNow(messageId + 1);
    if (!now || !now.cal || !now.t) return '';
    return `${fmtDate(now.cal, now.t)}, ${fmtTime(now.t)} — ${partOfDay(now.t.h)}`;
}

function applySceneTime(messageId, raw) {
    if (settings().clock === false) return;
    let data = null;
    try { data = extractJson(raw); } catch { return; }
    const st = data && !Array.isArray(data) ? data.scene_time : null;
    if (!st) return;
    const meta = chatMeta();
    if (meta.clockLocked) return;
    const now = clockNow(messageId + 1);
    if (!now || !now.cal || !now.t) return;
    // если в самом ответе есть отметка времени — она главнее
    const mes = (ctx().chat || [])[messageId];
    const own = clockRecOf(mes);
    if (own && own.why === 'stamp') return;
    const t = sceneTimeFix(now.cal, now.t, st);
    if (!t) return;
    const prev = own ? own.prev : now.t;
    writeClock(messageId, { t, prev, why: 'model', size: prev ? toMinutes(now.cal, t) - toMinutes(now.cal, prev) : 0 });
}

// Один раз на чат: модель смотрит карточку, лорбук и сообщения и говорит, какой тут календарь и который час.
async function detectCalendar({ manual = false } = {}) {
    if (clockBusy || !hasChat() || settings().clock === false) return;
    const c = ctx();
    clockBusy = true;
    renderAll();
    try {
        const chat = c.chat || [];
        const msgs = [];
        const first = chat.findIndex(m => m && !m.is_system && m.mes);
        if (first >= 0) msgs.push(`#${first} ${chat[first].name}: ${cleanMessageText(chat[first].mes, 1500)}`);
        for (let i = chat.length - 1, n = 0; i > first && n < 4; i--) {
            const m = chat[i];
            if (!m || m.is_system || !m.mes) continue;
            msgs.splice(first >= 0 ? 1 : 0, 0, `#${i} ${m.name}: ${cleanMessageText(m.mes, 1200)}`);
            n++;
        }
        let lore = [];
        try {
            const src = await collectLoreSources();
            lore = src.filter(x => /^Лорбук/.test(x.title)).map(x => `[${x.title}]\n${cleanMessageText(x.text, 5000)}`).slice(0, 3);
        } catch { /* без лорбука */ }
        const { system, user } = buildCalendarPrompt({ botName: c.name2, userName: c.name1, card: cardText(c), persona: personaText(c), lore, messages: msgs }, settings().language || 'русском');
        const raw = await callModel(system, user, withBudget('rewards'));
        const ans = parseCalendarAnswer(extractJson(raw));
        const meta = chatMeta();
        const before = findClock();
        meta.calendar = ans.calendar;
        // время: если уже идёт по отметкам в ответах обычного календаря — не трогаем, иначе берём то, что сказала модель
        const keep = before.t && ans.calendar.type === 'greg' && (!before.cal || before.cal.type === 'greg') && !manual;
        if (!keep && ans.now) {
            const last = chat.length - 1;
            if (last >= 0) writeClock(last, { t: ans.now, prev: before.t || null, why: 'detect', size: 0 });
            else meta.clockBase = ans.now;
        }
        clockMonth = null;
        ctx().saveMetadataDebounced?.();
        await c.saveChat?.();
        if (manual) notice(`Календарь: ${CALENDAR_TYPES[ans.calendar.type]}${ans.calendar.name ? ` «${ans.calendar.name}»` : ''}`);
    } catch (err) {
        if (err && err.cancelled) return;
        console.warn('[Внутренний мир] календарь не определился', err);
        if (manual) showError(classifyError(err), { manual: true, what: 'календарь' });
    } finally {
        clockBusy = false;
        updateInjection();
        renderAll();
    }
}

// Модель часов для дневника: что показать в полоске и в листке.
function clockView() {
    const s = settings();
    if (s.clock === false || !hasChat()) return null;
    const now = clockNow();
    const meta = chatMeta();
    if (!now || !now.cal || !now.t) return { t: null, busy: clockBusy };
    const { cal, t } = now;
    const people = clockPeople(liveState());
    const daysWord = n => { const x = n % 100, y = n % 10; return x > 10 && x < 20 ? 'дней' : (y === 1 ? 'день' : (y >= 2 && y <= 4 ? 'дня' : 'дней')); };
    const ev = upcoming(cal, t, people, cal.type === 'custom' ? Math.max(366, cal.months.reduce((x, m) => x + m.days, 0)) : 366).map(e => Object.assign(e, { dateText: `${e.d} ${monthName(cal, e.m, true)}`, inDaysText: e.inDays >= 45 ? fmtSpan(e.inDays * 1440) : `${e.inDays} ${daysWord(e.inDays)}` }));
    const draft = normTime(cal, clockDraft || t);
    let grid = null;
    if (cal.type !== 'days') {
        const vm = clockMonth || { y: draft.y, m: draft.m };
        grid = monthGrid(cal, vm.y, vm.m, monthMarks(cal, vm.y, vm.m, people));
    }
    const holDate = h => h.rule
        ? ({ easter_o: 'Пасха (правосл.)', easter_w: 'Пасха' }[h.rule] ? `${h.offset ? `${h.offset > 0 ? '+' : ''}${h.offset} дн. от Пасхи` : 'по Пасхе'}` : 'плавающая дата')
        : `${h.d} ${monthName(cal, h.m, true)}`;
    return {
        cal, t, draft,
        draftChanged: toMinutes(cal, draft) !== toMinutes(cal, t),
        draftDate: fmtDate(cal, draft),
        draftPart: partOfDay(draft.h),
        time: fmtTime(t),
        part: partOfDay(t.h),
        date: fmtDate(cal, t),
        today: ev.filter(e => e.inDays === 0),
        upcoming: ev,
        grid,
        locked: !!meta.clockLocked,
        busy: clockBusy,
        open: clockOpen,
        calOpen: clockCalOpen,
        typeName: CALENDAR_TYPES[cal.type],
        calName: cal.name || '',
        country: cal.country || '',
        why: cal.why || '',
        monthNames: cal.type === 'custom' ? cal.months.map(x => x.name) : MONTHS_RU,
        holMonth: clockHolMonth || draft.m || 1,
        monthsText: cal.type === 'custom' ? cal.months.map(x => `${x.name} (${x.days})`).join(', ') : '',
        weekdaysText: cal.type === 'custom' && cal.weekdays ? cal.weekdays.join(', ') : '',
        holidays: (cal.holidays || []).map(h => ({ name: h.name, kind: h.kind === 'canon' ? 'canon' : 'holiday', who: h.who, dateText: holDate(h), years: h.from && h.to ? `${h.from}–${h.to}` : (h.from ? `с ${h.from}` : (h.to ? `до ${h.to}` : '')) })),
    };
}

// Поставить время руками: пишется в последний ответ, прошлое время запоминается для «отменить».
function setClockManual(t, why = 'manual') {
    const now = clockNow();
    const cal = (now && now.cal) || normCalendar({ type: 'greg', source: 'user' });
    const meta = chatMeta();
    if (!meta.calendar) meta.calendar = cal;
    const nt = normTime(cal, t);
    const last = (ctx().chat || []).length - 1;
    const prev = now && now.t ? now.t : null;
    if (last >= 0) writeClock(last, { t: nt, prev, why, size: prev ? toMinutes(cal, nt) - toMinutes(cal, prev) : 0 });
    else meta.clockBase = nt;
    ctx().saveMetadataDebounced?.();
    saveChatSoon();
    updateInjection();
    renderAll();
}

function clockInputs() {
    const el = panelEl();
    const v = k => { const x = el.querySelector(`[data-iw-clock-in="${k}"]`); return x ? x.value : ''; };
    return v;
}

async function onClockAction(spec) {
    const parts = spec.split(':');
    const cmd = parts[0];
    const arg = parts.slice(1).join(':');
    const meta = chatMeta();
    const now = clockNow();
    const cal = now && now.cal;
    const t = now && now.t;
    if (cmd === 'detect') return detectCalendar({ manual: true });
    if (cmd === 'lock') {
        meta.clockLocked = !meta.clockLocked;
        ctx().saveMetadataDebounced?.();
        clockOpen = true;
        return renderAll();
    }
    if (!cal || !t) return;
    clockOpen = true;
    const draft = normTime(cal, clockDraft || t);
    const view = clockMonth || { y: draft.y, m: draft.m };
    if (cmd === 'month') { clockMonth = shiftMonth(cal, view.y, view.m, Number(arg) || 0); return renderAll(); }
    if (cmd === 'year') { clockMonth = { y: view.y + (Number(arg) || 0), m: view.m }; return renderAll(); }
    if (cmd === 'vmonth') { clockMonth = { y: view.y, m: Number(arg) || 1 }; return renderAll(); }
    if (cmd === 'day') {
        // выбор дня только отмечает его — время меняется кнопкой «Поставить»
        const d = Math.min(Number(arg) || 1, monthDays(cal, view.y, view.m));
        clockDraft = Object.assign({}, draft, { y: view.y, m: view.m, d });
        return renderAll();
    }
    if (cmd === 'dday') { clockDraft = Object.assign({}, draft, { d: Math.max(1, draft.d + (Number(arg) || 0)) }); return renderAll(); }
    if (cmd === 'h') { clockDraft = Object.assign({}, draft, { h: Number(arg) || 0 }); return renderAll(); }
    if (cmd === 'mi') { clockDraft = Object.assign({}, draft, { mi: Number(arg) || 0 }); return renderAll(); }
    if (cmd === 'hm') { clockHolMonth = Number(arg) || 1; return renderAll(); }
    if (cmd === 'reset') { clockDraft = null; clockMonth = null; return renderAll(); }
    if (cmd === 'set') {
        const nt = normTime(cal, draft);
        clockDraft = null;
        clockMonth = null;
        return setClockManual(nt);
    }
    if (cmd === 'type') {
        const type = arg === 'days' ? 'days' : 'greg';
        meta.calendar = normCalendar({ type, source: 'user' });
        const nt = type === 'days' ? { d: 1, h: t.h, mi: t.mi } : { y: 2000, m: 1, d: 1, h: t.h, mi: t.mi };
        clockMonth = null;
        clockDraft = null;
        return setClockManual(nt, 'manual');
    }
    if (cmd === 'hol-add') {
        const v = clockInputs();
        let name = String(v('hname') || '').trim();
        const d = Number(v('hd'));
        const m = clockHolMonth || draft.m || 1;
        if (!name || !d) return notice('Напиши название и число.');
        if (d > monthDays(cal, 2000, m)) return notice('В этом месяце нет такого числа.');
        // «Виктор: годовщина» — личная дата персонажа
        const h = { m, d, name };
        const who = name.match(/^([^:]{2,40}):\s*(.+)$/);
        if (who) Object.assign(h, { kind: 'canon', who: who[1].trim(), name: who[2].trim() });
        meta.calendar = Object.assign({}, cal, { holidays: [...(cal.holidays || []), h] });
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
    if (cmd === 'hol-del') {
        const list = (cal.holidays || []).slice();
        list.splice(Number(arg), 1);
        meta.calendar = Object.assign({}, cal, { holidays: list });
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
}

// ---------- Подсказка основной модели ----------

function updateInjection(beforeId) {
    const c = ctx();
    const s = settings();
    let text = '';
    if (s.enabled && s.inject && hasChat() && c.chat && c.chat.length) {
        text = buildInjection(liveState(beforeId), s.modules, c.name1, s.moodInfluence);
    }
    c.setExtensionPrompt(PROMPT_KEY, text, 1, Number(s.injectDepth) || 0, false, 0);
    // притяжение — своей подсказкой, со своей настойчивостью
    let attr = '';
    if (s.enabled && s.inject && s.modules.attraction !== false && s.attrInfluence !== 'none' && hasChat() && c.chat && c.chat.length) {
        attr = buildAttrInjection(liveState(beforeId), c.name1, s.attrInfluence);
    }
    c.setExtensionPrompt(ATTR_PROMPT_KEY, attr, 1, Number(s.attrDepth) || 4, false, 0);
    // часы сцены — у самого конца чата, чтобы модель не теряла время суток и дату
    let clockText = '';
    if (s.enabled && s.inject && hasChat() && c.chat && c.chat.length) {
        try { clockText = clockPromptText(beforeId); } catch (e) { console.warn('[Внутренний мир] часы', e); }
    }
    c.setExtensionPrompt(CLOCK_PROMPT_KEY, clockText, 1, 0, false, 0);
}

// ---------- Анализ ----------

function lastBotMessageId() {
    const chat = ctx().chat || [];
    for (let i = chat.length - 1; i >= 0; i--) {
        const m = chat[i];
        if (m && !m.is_user && !m.is_system && m.mes) return i;
    }
    return -1;
}

function isFreshReply(messageId, type) {
    if (SKIP_TYPES.includes(type)) return false;
    const chat = ctx().chat || [];
    const mes = chat[messageId];
    if (!mes || mes.is_user || mes.is_system || !mes.mes) return false;
    return chat.slice(0, messageId).some(m => m && m.is_user);
}

// Из карточки дневник читает только описание персонажа, резюме личности и заметку о персонаже
// (если они заполнены). Сценарий, примеры диалогов, заметки автора, системный промпт — не трогает.
// Поля читаем напрямую: если карточка сохранена криво (поле записано массивом), берём первый
// непустой текст, а не падаем.
function cardField(v) {
    if (Array.isArray(v)) v = v.find(x => typeof x === 'string' && x.trim()) || '';
    return typeof v === 'string' ? v.trim() : '';
}

function cardDescription(c) {
    try {
        if (c.characterId === undefined || c.characterId === null) return '';
        const ch = (c.characters && c.characters[c.characterId]) || {};
        const d = ch.data || {};
        const ext = d.extensions || {};
        const parts = [
            cardField(d.description !== undefined ? d.description : ch.description),
            cardField(d.personality !== undefined ? d.personality : ch.personality),
            cardField(ext.depth_prompt && ext.depth_prompt.prompt),
        ];
        const text = [
            parts[0],
            parts[1] && `Резюме личности: ${parts[1]}`,
            parts[2] && `Заметка о персонаже: ${parts[2]}`,
        ].filter(Boolean).join('\n\n');
        return text && typeof c.substituteParams === 'function' ? c.substituteParams(text) : text;
    } catch {
        return '';
    }
}

function cardText(c) {
    return cleanMessageText(cardDescription(c), 2500);
}

function personaText(c) {
    const p = c.powerUserSettings && c.powerUserSettings.persona_description;
    return cleanMessageText(p || '', 600);
}

function trackNames(s) {
    return String(s.trackList || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
}

// Остановка: каждый запуск помнит свой номер; «Стоп» меняет номер — ответ старого запроса выбрасывается,
// а запрос к своему API обрывается сразу.
let runId = 0;
let abortCtl = null;

function cancelledError() {
    const e = new Error('остановлено');
    e.cancelled = true;
    return e;
}

// Последний запрос к модели: ответ и запас — чтобы понять, почему не получилось.
let lastCall = { raw: '', budget: 0 };

// Настройки с запасом на ответ под этот разбор (см. responseBudget): «сам» — по сцене и не выше потолка.
function withBudget(kind, counts = {}) {
    const s = settings();
    return Object.assign({}, s, { responseLength: responseBudget(s, Object.assign({ kind, model: modelName(s) }, counts)) });
}

function modelName(s) {
    if (s.source === 'custom' && s.apiKind !== 'profile') return s.apiModel || '';
    const cc = ctx().chatCompletionSettings || {};
    const src = cc.chat_completion_source || '';
    return String(cc[`${src}_model`] || cc.custom_model || cc.model || '');
}

async function callModel(system, user, s, onText = null) {
    lastCall = { raw: '', budget: Number(s.responseLength) || 0 };
    const my = runId;
    if (!abortCtl || abortCtl.signal.aborted) abortCtl = new AbortController();
    const signal = abortCtl.signal;
    let res;
    try {
        res = await callModelRaw(system, user, s, signal, onText && s.liveView !== false ? (t, r) => { if (my === runId) onText(t, r); } : null);
    } catch (err) {
        if (my !== runId || signal.aborted) throw cancelledError();
        throw err;
    }
    if (my !== runId) throw cancelledError();
    lastCall.raw = typeof res === 'string' ? res : '';
    return res;
}

function stopAnalysis(msg = '') {
    runId++;
    setLive(null);
    if (abortCtl) abortCtl.abort();
    abortCtl = null;
    busy = false;
    rosterBusy = false;
    dreamBusy = false;
    shopBusy = false;
    busyKind = '';
    pending = null;
    status = msg || 'Разбор остановлен';
    updateInjection();
    renderAll();
}

// Поток от таверны (профиль подключения или основное подключение): генератор отдаёт текст целиком на сейчас.
async function drainStream(gen, onText) {
    let text = '';
    for await (const chunk of gen()) {
        text = (chunk && chunk.text) || text;
        onText(text, (chunk && chunk.state && chunk.state.reasoning) || '');
    }
    if (!text) throw new Error('модель вернула пустой ответ');
    return text;
}

// Основное подключение таверны (Chat Completion) — тем же запросом, но потоком.
function mainStreamRequest(c, system, user, max) {
    const o = c.chatCompletionSettings || {};
    const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? undefined : Number(v));
    return {
        stream: true,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: max,
        model: c.getChatCompletionModel ? c.getChatCompletionModel() : undefined,
        chat_completion_source: o.chat_completion_source,
        temperature: num(o.temp_openai),
        top_p: num(o.top_p_openai),
        custom_url: o.custom_url,
        custom_include_body: o.custom_include_body,
        custom_exclude_body: o.custom_exclude_body,
        custom_include_headers: o.custom_include_headers,
        custom_prompt_post_processing: o.custom_prompt_post_processing,
        reverse_proxy: o.reverse_proxy,
        proxy_password: o.proxy_password,
        reasoning_effort: o.reasoning_effort,
        include_reasoning: !!o.show_thoughts,
        vertexai_auth_mode: o.vertexai_auth_mode,
        vertexai_region: o.vertexai_region,
        vertexai_express_project_id: o.vertexai_express_project_id,
    };
}

async function callModelRaw(system, user, s, signal, onText = null) {
    const c = ctx();
    const max = Number(s.responseLength) || 4000;
    let got = false;
    const watch = onText ? (t, r) => { if (t) got = true; onText(t, r); } : null;
    // поток не получился ещё до первого слова — тихо пробуем обычным запросом
    const fallback = err => {
        if (signal.aborted || got) throw err;
        console.warn('[Внутренний мир] поток не получился, пишу без него', err);
    };
    if (s.source === 'custom') {
        const missing = missingFields(s);
        if (missing.length) throw new Error(`в настройках подключения не заполнено: ${missing.join(', ')}`);
        if (s.apiKind !== 'profile') {
            const f = (url, opts) => fetch(url, Object.assign({}, opts, { signal }));
            if (watch) {
                try { return await chatRequest(s, system, user, max, f, watch); } catch (err) { fallback(err); }
            }
            return await chatRequest(s, system, user, max, f);
        }
    }
    if (s.source === 'custom' && s.apiKind === 'profile' && s.profileId && c.ConnectionManagerRequestService) {
        const msgs = [{ role: 'system', content: system }, { role: 'user', content: user }];
        if (watch) {
            try {
                const res = await c.ConnectionManagerRequestService.sendRequest(s.profileId, msgs, max, { stream: true, signal, extractData: true, includePreset: true, includeInstruct: true });
                if (typeof res === 'function') return await drainStream(res, watch);
                const text = typeof res === 'string' ? res : (res && res.content) || '';
                if (text) return text;
            } catch (err) { fallback(err); }
        }
        const res = await c.ConnectionManagerRequestService.sendRequest(s.profileId, msgs, max, { stream: false, extractData: true, includePreset: true, includeInstruct: true });
        return typeof res === 'string' ? res : (res && res.content) || '';
    }
    if (watch && c.mainApi === 'openai' && c.ChatCompletionService && c.chatCompletionSettings) {
        try {
            const res = await c.ChatCompletionService.processRequest(mainStreamRequest(c, system, user, max), {}, true, signal);
            if (typeof res === 'function') return await drainStream(res, watch);
            const text = typeof res === 'string' ? res : (res && res.content) || '';
            if (text) return text;
        } catch (err) { fallback(err); }
    }
    return await c.generateRaw({ systemPrompt: system, prompt: user, responseLength: max, trimNames: false });
}

// ---------- Живой листок ----------
function setLive(next) {
    live = next;
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = null;
    // секунды на листке тикают сами, без перерисовки всего дневника
    if (live) {
        liveTimer = setInterval(() => {
            const el = panelEl().querySelector('.iw-live-secs');
            if (el && live) el.textContent = String(Math.round((Date.now() - live.t0) / 1000));
        }, 1000);
    }
}

function liveStage(stage, extra = {}) {
    if (!live) return;
    Object.assign(live, { stage }, extra);
    renderAll();
}

// Что уже написано: по черновому ответу собираем строки «кто — что готово» и черновое состояние.
function livePreview(raw, base, s, opts) {
    if (!live) return;
    live.len = raw.length;
    live.raw = raw;
    if (live.previewAt && Date.now() - live.previewAt < 900) {
        if (!live.previewPending) {
            live.previewPending = setTimeout(() => {
                if (!live) return;
                live.previewPending = null;
                live.previewAt = 0;
                livePreview(live.raw, base, s, opts);
            }, 900);
        }
        return;
    }
    live.previewAt = Date.now();
    try {
        const fresh = parseAnalysis(raw, { manualTurns: s.moodMode === 'manual' ? s.moodTurns : null });
        const ros = roster();
        for (const f of fresh) {
            const entry = ros.find(f.name);
            if (entry) f.name = entry.name;
            const known = base.order.find(k => namesMatch(k, f.name));
            if (known) f.name = known;
        }
        live.chars = fresh.map(f => ({
            name: f.name,
            mood: f.mood || '',
            parts: [
                f.moodlets && f.moodlets.length ? `эмоции: ${f.moodlets.length}` : '',
                f.wants && f.wants.length ? 'желания' : '',
                f.fears && f.fears.length ? 'страхи' : '',
                f.dream ? 'мечта' : '',
                f.traits && f.traits.length ? 'черты' : '',
                f.impression ? 'отношение' : '',
            ].filter(Boolean),
        }));
        if (fresh.length) live.preview = applyAnalysis(base, fresh, s.modules, opts).state;
    } catch { /* ответ ещё слишком короткий */ }
    renderAll();
}

async function analyze(messageId, { manual = false, catchUp = null, fromLore = null, kind = 'chat' } = {}) {
    const s = settings();
    const c = ctx();
    if (!MODEL_MODULES.some(m => s.modules[m])) {
        if (manual) notice('Все блоки выключены — анализировать нечего.');
        return;
    }
    if (busy) {
        pending = { messageId, manual };
        return;
    }
    const chatId = c.getCurrentChatId && c.getCurrentChatId();
    const my = runId;
    let raw = '';
    let budget = 0;
    busy = true;
    if (manual) busyKind = kind;
    status = fromLore ? 'Дополняю дневник по карточке и лорбуку…' : 'Пишу в дневник…';
    setLive({ kind: fromLore ? kind : (catchUp ? 'catchup' : 'chat'), stage: 'prep', t0: (live && live.t0) || Date.now(), chars: [], len: 0, hidden: !!(live && live.hidden) });
    // календаря у чата ещё нет — узнаём его одновременно с разбором, а не после: листок не закроется, пока всё не встанет
    let calP = null;
    if (s.clock !== false && hasChat() && !chatMeta().calendar && !chatMeta().calendarTried && !clockBusy) {
        chatMeta().calendarTried = true;
        live.calendar = 'busy';
        calP = detectCalendar().finally(() => { if (live) { live.calendar = 'done'; renderAll(); } });
    }
    renderAll();
    try {
        const chat = c.chat;
        // эмоции стареют на число ответов бота с прошлой записи, включая этот
        const own = recordOf(chat[messageId]);
        const base = carryOwnEdits(decayState(currentState(messageId), botRepliesBetween(findHolder(messageId).index, messageId)), own && own.state, messageId);
        // «Догоняющий» режим: дневник заполняется впервые для уже идущей истории
        // или в истории есть НПС из лорбука, которых в дневнике ещё нет.
        const ros0 = roster();
        if (catchUp === null && (kind !== 'lore') && (manual || base.order.length === 0)) {
            const { placeholders } = splitCast(base);
            const missing = [...placeholders];
            if (s.showNpc !== false) {
                for (const e of historySeen().pending) {
                    if (!base.order.some(k => namesMatch(k, e.name) || rosterFind(ros0, k) === e)) missing.push(e.name);
                }
            }
            const userTurns = chat.slice(0, messageId + 1).filter(m => m && m.is_user).length;
            const missingOk = missing.filter(n => !isIgnored(n));
            if (missingOk.length && userTurns >= 1 && messageId >= 2) catchUp = missingOk.slice(0, 8);
        }
        const msgs = [];
        const catchUpCount = Math.min(40, Math.max(4, Number(s.catchUpMessages) || 12));
        const count = catchUp ? Math.max(catchUpCount, Number(s.contextMessages) || 6) : Math.max(2, Number(s.contextMessages) || 6);
        let firstInWindow = messageId;
        // «Лорбук» разбирает только карточку и лорбуки: сообщения чата (и первое сообщение тоже) сюда не идут —
        // их читают «Чат» и «Всё сразу»
        for (let i = messageId; kind !== 'lore' && i >= 0 && msgs.length < count; i--) {
            const m = chat[i];
            if (!m || m.is_system || !m.mes) continue;
            msgs.unshift(`#${i} ${m.name}: ${cleanMessageText(m.mes, catchUp ? CATCHUP_MSG_CHARS : 1500)}`);
            firstInWindow = i;
        }
        const history = [];
        if (catchUp) {
            for (const name of catchUp) {
                const entry = ros0.find(name);
                const names = entry ? rosterNames(entry) : [name];
                // эпизоды до окна — и длинные сообщения в окне, где середина могла не попасть в выдержку
                const hits = [];
                for (let i = 0; i <= messageId && hits.length < 2; i++) {
                    const m = chat[i];
                    if (!m || m.is_system || !m.mes || !names.some(n => mentioned(n, m.mes))) continue;
                    if (i < firstInWindow || cleanMessageText(m.mes, 100000).length > CATCHUP_MSG_CHARS) hits.push(i);
                }
                // одного отрывка на персонажа хватает, чтобы понять, был ли он в сцене
                for (const i of hits.slice(0, 1)) history.push(`#${i} ${chat[i].name} (про ${name}): ${excerptAround(chat[i].mes, names, 250)}`);
                if (history.length >= CATCHUP_EXCERPTS) break;
            }
        }
        const ros = roster();
        const mn = mainNames();
        const info = {
            botName: c.name2,
            userName: c.name1,
            card: kind !== 'chat' && offBooks().includes('__card') ? '' : cardText(c),
            persona: kind !== 'chat' && offBooks().includes('__persona') ? '' : personaText(c),
            trackNames: [c.name2, ...trackNames(s)],
            trackPersona: s.persona !== false,
            messages: msgs,
            mainNames: mn,
            catchUp,
            fromLore: !!fromLore,
            kind,
            loreMain: fromLore ? fromLore.map(t => cleanMessageText(t, 6000)).slice(0, 6) : [],
            history,
            knownNames: s.showNpc === false ? [] : [...(ros.main || []), ...(ros.npc || []).map(e => e.name).filter(n => !isIgnored(n))].slice(0, 40),
            ignored: ignoredNames(),
            lore: [],
            clockNow: kind !== 'lore' && s.clock !== false ? clockForAnalysis(messageId) : '',
            achTitles: (chatMeta().achList || []).filter(x => x.mes !== messageId).map(x => x.title).slice(-15),
        };
        // экономия: в запрос идут только те, кто есть в последнем обмене репликами
        const recent = [];
        for (let i = messageId; i >= 0 && recent.length < 2; i--) {
            const m = chat[i];
            if (m && !m.is_system && m.mes) recent.push(m);
        }
        const recentText = recent.map(m => m.mes).join('\n');
        const speakers = recent.filter(m => !m.is_user).map(m => m.name);
        const inScene = k => {
            const entry = ros.find(k);
            return mentioned(k, recentText) || speakers.some(n => sameName(n, k)) || (entry && rosterMentioned(entry, recentText));
        };
        let present = null;
        if (s.onlyPresent && base.order.length) present = base.order.filter(inScene);
        // персона игрока всегда «в сцене»: это её реплики
        const pk = s.persona !== false ? personaKeyOf(base) : null;
        if (present && pk && !present.includes(pk)) present.push(pk);
        // знакомые по предыстории (друзья, бывшие, родня главного героя или игрока) — заводим им записи при разборе лорбука
        if (s.showNpc !== false && (kind !== 'chat' || (catchUp && catchUp.length))) {
            info.acquainted = [];
            for (const e of ros.npc || []) {
                if (!e.rel && !e.relUser) continue;
                if (isIgnored(e.name)) continue;
                if (base.order.some(k => rosterFind(ros, k) === e || namesMatch(k, e.name))) continue;
                const al = e.aliases || [], tr = e.traits || [];
                info.acquainted.push(`${e.name}${al.length ? ` (${al.join(', ')})` : ''}: ${e.who || ''}${e.rel ? `; для ${c.name2} — ${e.rel}` : ''}${e.relUser ? `; для ${c.name1} — ${e.relUser}` : ''}${e.dead ? '; нет в живых' : ''}${tr.length ? `; черты: ${tr.join(', ')}` : ''}`);
                if (info.acquainted.length >= 8) break;
            }
        }
        // НПС из лорбука, которые впервые пришли в сцену: даём модели их описание
        if (s.showNpc !== false) {
            for (const e of ros.npc || []) {
                if (base.order.some(k => rosterFind(ros, k) === e)) continue;
                if (isIgnored(e.name)) continue;
                if (!rosterMentioned(e, recentText) && !(catchUp && catchUp.includes(e.name))) continue;
                info.lore.push(`${e.name}${e.aliases.length ? ` (${e.aliases.join(', ')})` : ''}: ${e.who}${e.traits.length ? `; черты: ${e.traits.join(', ')}` : ''}`);
                if (info.lore.length >= (catchUp ? 10 : 5)) break;
            }
        }
        const system = buildSystemPrompt(s, info);
        const user = buildUserPrompt(info, base, s.modules, present);
        const cast = present || base.order;
        const castMains = Math.max(1, cast.filter(k => isMain(k, mn)).length) + (s.persona !== false ? 1 : 0);
        const castNpcs = (s.showNpc === false ? 0 : cast.filter(k => k !== pk && !isMain(k, mn)).length) + info.lore.length + (catchUp ? catchUp.length : 0) + (info.acquainted ? info.acquainted.length : 0);
        const ask = withBudget(catchUp || fromLore ? 'all' : 'chat', { mains: castMains, npcs: castNpcs });
        budget = ask.responseLength;
        const previewOpts = { maxChars: Number(s.maxChars) || 4, userName: c.name1, mains: mn, noChat: !(msgs && msgs.length), mesId: messageId, points: false, persona: s.persona !== false, rebuild: kind !== 'chat' || !!(catchUp && catchUp.length) };
        liveStage('think');
        raw = await callModel(system, user, ask, (text, think) => {
            if (!live) return;
            if (text) {
                if (live.stage !== 'write') live.stage = 'write';
                livePreview(text, base, s, previewOpts);
            } else if (think && live.stage === 'think' && !live.thinking) {
                live.thinking = true;
                renderAll();
            }
        });
        liveStage('done');
        if (chatId && c.getCurrentChatId && ctx().getCurrentChatId() !== chatId) return; // чат сменился
        if (looksCut(raw)) {
            console.warn('[Внутренний мир] ответ модели оборвался', String(raw || '').slice(-300));
            showError(classifyError(null, { cut: true, budget }), { manual });
        }
        let fresh = parseAnalysis(raw, { manualTurns: s.moodMode === 'manual' ? s.moodTurns : null });
        // имена приводим к тем, что в лорбуке («Волк» → «Константин Волков»)
        for (const f of fresh) {
            const entry = ros.find(f.name);
            if (entry) f.name = entry.name;
            const known = base.order.find(k => namesMatch(k, f.name));
            if (known) {
                // раньше записан латиницей («Lyuba»), а в лорбуке — «Люба Хмурова»: показываем имя из лорбука
                if (entry && base.characters[known] && base.characters[known].name !== entry.name && nameScript(base.characters[known].name) !== nameScript(entry.name)) base.characters[known].name = entry.name;
                f.name = known;
            }
        }
        if (s.showNpc === false) fresh = fresh.filter(x => isMain(x.name, mn));
        if (ignoredNames().length) fresh = fresh.filter(x => isMain(x.name, mn) || sameName(x.name, c.name1) || !isIgnored(x.name));
        if (s.track === 'bot') fresh = fresh.filter(x => sameName(x.name, c.name2));
        if (s.track === 'list') {
            const allowed = info.trackNames;
            fresh = fresh.filter(x => allowed.some(n => sameName(n, x.name)));
        }
        if (!fresh.length) throw new Error('Модель не вернула ни одного персонажа');
        const { state, events } = applyAnalysis(base, fresh, s.modules, { maxChars: Number(s.maxChars) || 4, userName: c.name1, mains: mn, noChat: !(msgs && msgs.length), mesId: messageId, points: s.points !== false, persona: s.persona !== false, rebuild: kind !== 'chat' || !!(catchUp && catchUp.length) });
        if (info.clockNow) applySceneTime(messageId, raw);
        if (!fromLore) try { takeAchievement(raw, messageId); } catch (e) { console.warn('[Внутренний мир] достижение', e); }
        try { pinAges(state, messageId); } catch (e) { console.warn('[Внутренний мир] возраст', e); }
        writeRecord(messageId, state);
        if (calP) {
            // ждём календарь, чтобы время встало вместе с записями
            await calP;
            if (info.clockNow === '' && s.clock !== false) {
                try { pinAges(state, messageId); writeRecord(messageId, state); } catch { /* без возраста */ }
            }
        }
        chatMeta().fp = Object.assign({}, chatMeta().fp, { chat: chatFp(messageId) });
        if (catchUp) {
            // кого проверили по истории, но в сцене лично не было — не перепроверяем, пока не упомянут снова
            const meta = chatMeta();
            meta.checked = meta.checked || {};
            for (const name of catchUp) meta.checked[name] = messageId;
            ctx().saveMetadataDebounced?.();
        }
        await ctx().saveChat();
        status = fromLore ? 'Дневник дополнен по карточке и лорбуку' : (catchUp ? `Дневник заполнен по истории чата (до сообщения #${messageId})` : `Обновлено после сообщения #${messageId}`);
        if (!catchUp && !fromLore) {
            if (s.toasts) events.forEach((ev, i) => showEvent(ev, i * 450));
            else if (s.sound !== false && events.length) playSound(events[0].type, currentTheme);
        }
        if (events.length && !isOpen()) markFab(true);
        if (!view) view = '';
    } catch (err) {
        if (err && err.cancelled) return;
        console.error('[Внутренний мир]', err);
        const info = classifyError(err, { raw, budget, cut: looksCut(raw) && /JSON|испорчен|персонаж/.test(String(err && err.message)) });
        status = 'Не получилось: ' + info.title;
        showError(info, { manual });
    } finally {
        if (my !== runId) return; // этот разбор остановили — флаги уже сброшены
        busy = false;
        if (live && live.previewPending) clearTimeout(live.previewPending);
        setLive(null);
        if (manual && kind === 'chat') busyKind = '';
        updateInjection();
        renderAll();
        if (pending) {
            const p = pending;
            pending = null;
            if (p.messageId !== messageId || p.manual) analyze(p.messageId, { manual: p.manual });
        } else if (s.clock !== false && hasChat() && !chatMeta().calendar && !chatMeta().calendarTried) {
            // первый разбор в чате — заодно узнаём календарь истории (один раз)
            chatMeta().calendarTried = true;
            detectCalendar();
        }
    }
}

function toastBox() {
    let box = byId('iw_toasts');
    if (!box) {
        box = document.createElement('div');
        box.id = 'iw_toasts';
        box.setAttribute('aria-live', 'polite');
        ui().appendChild(box);
    }
    box.className = `iw-toasts iw-toasts-${settings().toastPos === 'bottom' ? 'bottom' : 'top'} iw-theme-${currentTheme}${settings().animations === false ? ' iw-noanim' : ''}`;
    return box;
}

// Короткое сообщение дневника — листочком в стиле темы, а не плашкой таверны (без звука)
function notice(text, who = 'Дневник') {
    showEvent({ type: 'note', who, text: String(text || '') });
}

function showEvent(ev, delay = 0) {
    setTimeout(() => {
        const box = toastBox();
        const wrap = document.createElement('div');
        wrap.className = 'iw-toast-wrap';
        wrap.innerHTML = renderToast(ev, currentTheme);
        const close = () => {
            wrap.classList.add('iw-out');
            setTimeout(() => wrap.remove(), 350);
        };
        wrap.addEventListener('click', e => {
            if (e.target.closest('.iw-toast-close')) return close();
            if (ev.type === 'achievement') {
                if (view !== 'showcase') { viewBefore = view; caseSel = ''; }
                view = 'showcase';
                seenAchievements();
                openPanel();
                return close();
            }
            const st = currentState();
            const key = st.order.find(k => sameName(k, ev.who));
            const cast = splitCast(st);
            if (key) view = key === cast.personaKey ? 'me:' + key : (cast.mains.includes(key) ? 'main:' + key : 'npc:' + key);
            openPanel();
            close();
        });
        box.appendChild(wrap);
        if (settings().sound !== false) playSound(ev.type === 'achievement' ? 'dream_done' : ev.type, currentTheme);
        setTimeout(close, 9000);
    }, delay);
}

// Ошибка дневника — своим листиком в стиле темы и с тревожным звуком, вместо уведомления таверны.
// При автоматическом разборе одна и та же ошибка не всплывает чаще раза в 2 минуты.
const lastErrShown = {};
function showError(info, { manual = false, what = '' } = {}) {
    const now = Date.now();
    if (!manual && lastErrShown[info.kind] && now - lastErrShown[info.kind] < 120000) return;
    lastErrShown[info.kind] = now;
    const box = toastBox();
    const wrap = document.createElement('div');
    wrap.className = 'iw-toast-wrap';
    wrap.innerHTML = renderErrorToast(Object.assign({}, info, { what }), currentTheme);
    const close = () => {
        wrap.classList.add('iw-out');
        setTimeout(() => wrap.remove(), 350);
    };
    wrap.addEventListener('click', e => {
        if (e.target.closest('.iw-toast-close')) return close();
        if (info.settings) {
            sectionOpen.diary.connect = true;
            view = 'settings';
        }
        openPanel();
        close();
    });
    box.appendChild(wrap);
    if (settings().sound !== false) playSound('fear_real', currentTheme);
    setTimeout(close, 15000);
}

async function onMessageReceived(messageId, type) {
    const s = settings();
    if (!s.enabled || !hasChat()) return;
    const id = Number(messageId);
    if (!isFreshReply(id, type)) {
        renderAll();
        return;
    }
    try { stepClock(id); } catch (e) { console.warn('[Внутренний мир] часы', e); }
    updateInjection();
    // режим «пока бот пишет»: дневник уже разобран в начале генерации — здесь только часы
    if (s.analyzeWhen === 'parallel') {
        renderAll();
        return;
    }
    const every = Number(s.every) || 0;
    if (every <= 0) {
        renderAll();
        return;
    }
    if (type !== 'swipe' && type !== 'regenerate') {
        const meta = chatMeta();
        meta.counter = (meta.counter || 0) + 1;
        ctx().saveMetadataDebounced?.();
        if (meta.counter % every !== 0) {
            renderAll();
            return;
        }
    }
    await analyze(id);
}

// Через сколько ответов будет следующий автоматический разбор (0 — не показываем: каждый ответ или только по кнопке)
function nextAnalysisIn() {
    const s = settings();
    const every = Number(s.every) || 0;
    if (every <= 1 || !s.enabled || !hasChat()) return 0;
    return every - ((chatMeta().counter || 0) % every);
}

function onGenerationStarted(type, _options, dryRun) {
    if (dryRun) return;
    // При свайпе и перегенерации прячем то, что было посчитано по заменяемому ответу.
    if (type === 'swipe' || type === 'regenerate') {
        const last = lastBotMessageId();
        updateInjection(last >= 0 ? last : undefined);
    } else {
        updateInjection();
    }
    // «Пока бот пишет»: разбираем всё до последней реплики игрока параллельно с ответом бота.
    // К концу ответа дневник уже обновлён; сам ответ бота попадёт в следующий разбор.
    const s = settings();
    if (s.analyzeWhen !== 'parallel' || !s.enabled || !hasChat()) return;
    if (type && !['normal', 'continue'].includes(type)) return;
    const chat = ctx().chat || [];
    const lastId = chat.length - 1;
    const last = chat[lastId];
    if (!last || !last.is_user || recordOf(last)) return;
    const every = Number(s.every) || 0;
    if (every <= 0) return;
    const meta = chatMeta();
    meta.counter = (meta.counter || 0) + 1;
    ctx().saveMetadataDebounced?.();
    if (meta.counter % every !== 0) return;
    setTimeout(() => analyze(lastId), 0);
}

// ---------- Тема ----------

function refreshTheme() {
    currentTheme = validTheme(settings().theme);
    setVolume(settings().volume ?? 45);
    setSilentMode(true, () => settings().sound !== false);
    loadFonts(currentTheme);
    const fab = document.getElementById('iw_fab');
    if (fab) setFabTheme(fab);
}

// Меняем только класс темы: чужие классы (например, «спрятано в папку» от STFolder) не трогаем.
function setFabTheme(fab) {
    fab.classList.add('iw-fab');
    for (const cls of [...fab.classList]) if (cls.startsWith('iw-theme-') && cls !== `iw-theme-${currentTheme}`) fab.classList.remove(cls);
    fab.classList.add(`iw-theme-${currentTheme}`);
    fab.classList.toggle('iw-noanim', settings().animations === false);
}

function loadFonts(theme) {
    if (loadedFonts.has(theme)) return;
    loadedFonts.add(theme);
    for (const href of themeFontUrls(theme)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.iwFonts = theme;
        document.head.appendChild(link);
    }
}

// ---------- Дневник на экране ----------

// Фото: карточка с таким же именем — по имени карточки или имени файла аватарки,
// в том числе через имена из лорбука («Петя Зайцев» → «Пётр Зайцев.png»).
function avatarFor(name) {
    const c = ctx();
    const entry = rosterFind(settings().rosters[rosterKey()], name);
    const names = entry ? [name, entry.name, ...entry.aliases] : [name];
    if (entry && entry.name.includes(' ')) {
        const surname = entry.name.split(' ').slice(-1)[0];
        for (const a of entry.aliases) if (!a.includes(' ') && !sameName(a, surname)) names.push(`${a} ${surname}`);
    }
    const labels = x => [x.name, String(x.avatar || '').replace(/\.[^.]+$/, '')];
    const exact = x => labels(x).some(l => names.some(n => sameName(l, n)));
    const close = x => labels(x).some(l => normText(l).split(' ').length > 1 && names.some(n => normText(n).split(' ').length > 1 && namesMatch(l, n)));
    const alike = x => labels(x).some(l => names.some(n => namesLookAlike(l, n)));
    if (!c.groupId && c.characterId !== undefined && isMain(name, mainNames())) {
        const cur = c.characters[c.characterId];
        if (cur && cur.avatar) return `/thumbnail?type=avatar&file=${encodeURIComponent(cur.avatar)}`;
    }
    const list = (c.characters || []).filter(Boolean);
    const ch = list.find(exact) || list.find(close) || list.find(alike);
    return ch && ch.avatar ? `/thumbnail?type=avatar&file=${encodeURIComponent(ch.avatar)}` : '';
}

function panelEl() {
    let el = byId('iw_panel');
    if (!el) {
        el = document.createElement('div');
        el.id = 'iw_panel';
        el.className = 'iw-panel';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', 'Внутренний мир');
        el.setAttribute('lang', 'ru');
        el.hidden = true;
        const toasts = byId('iw_toasts');
        if (toasts) ui().insertBefore(el, toasts);
        else ui().appendChild(el);
        el.addEventListener('click', onPanelClick);
        el.addEventListener('change', onPanelChange);
        el.addEventListener('input', onPanelInput);
        el.addEventListener('toggle', e => rememberSection('diary', e.target), true);
    }
    return el;
}

function isOpen() {
    const el = byId('iw_panel');
    return !!el && !el.hidden;
}

function renderPanelNow() {
    const el = panelEl();
    if (el.hidden) return;
    const s = settings();
    if (!hasChat() && view !== 'settings') {
        el.className = `iw-panel iw-theme-${currentTheme}${s.animations === false ? ' iw-noanim' : ''}`;
        el.innerHTML = renderPanel({ state: emptyState(), settings: s, theme: currentTheme, view: '', busy: false, status: '', mains: [], npcKeys: [], roster: null, noChat: true });
        return;
    }
    const state = (live && live.preview) || liveState();
    const { mains, npcKeys, personaKey } = splitCast(state);
    const showNpc = s.showNpc !== false;
    const personaOn = s.persona !== false && hasChat();
    const persona = personaOn ? { key: personaKey, name: ctx().name1 || 'Ты', avatar: personaAvatarUrl() } : null;
    const valid = view === 'settings' || view === 'showcase'
        || (personaOn && view.startsWith('me:'))
        || (view.startsWith('main:') && mains.includes(view.slice(5)))
        || (view.startsWith('shop:') && !!state.characters[view.slice(5)])
        || (showNpc && view === 'npc')
        || (showNpc && view.startsWith('npc:') && npcKeys.includes(view.slice(4)));
    if (!valid) view = mains.length ? 'main:' + mains[0] : (showNpc ? 'npc' : '');
    el.className = `iw-panel iw-theme-${currentTheme}${s.animations === false ? ' iw-noanim' : ''}`;
    const keepScroll = readScroll(el);
    const hs = showNpc ? historySeen() : { seen: [], pending: [] };
    const seenOnly = hs.seen.filter(e => !isIgnored(e.name))
        .filter(e => !npcKeys.some(k => namesMatch(k, e.name) || rosterFind(roster(), k) === e))
        .map(e => Object.assign({}, e, { checked: !hs.pending.includes(e) }));
    el.innerHTML = renderPanel({ state, settings: s, theme: currentTheme, view, busy, busyKind, dreamBusy, shopBusy, status, avatarFor, mains, npcKeys, persona, roster: roster(), rosterBusy, seenOnly, settingsHtml: view === 'settings' ? settingsFormHtml('diary') : '', books: worldNames, picked: pickedBooks(), linked: linkedBooks, off: offBooks(), live, attrMode, attrOpen, attrMore, working: busy || rosterBusy || dreamBusy || shopBusy, mobile: isPhone(), clock: safeClockView(), nextIn: nextAnalysisIn(), showcase: showcaseModel(), ignored: hasChat() ? ignoredNames() : [], giftTo });
    writeScroll(el, keepScroll);
}

// ---------- Витрина: достижения истории ----------
// Полученные хранятся в метаданных чата: { id: { at, scene } }. Новые всплывают уведомлением.
function showcaseModel() {
    if (!hasChat()) return null;
    const meta = chatMeta();
    return { got: Array.isArray(meta.achList) ? meta.achList : [], sel: caseSel, fresh: (meta.achNew || []).length };
}

function seenAchievements() {
    const meta = chatMeta();
    if (meta.achNew && meta.achNew.length) {
        meta.achNew = [];
        ctx().saveMetadataDebounced?.();
    }
}

// Достижение из ответа модели — на полку витрины и всплывающим листочком
function takeAchievement(raw, messageId) {
    if (settings().achievements === false) return;
    let data = null;
    try { data = extractJson(raw); } catch { return; }
    const a = cleanAchievement(data && !Array.isArray(data) ? data.achievement : null);
    if (!a) return;
    const meta = chatMeta();
    const now = clockNow(messageId + 1);
    const scene = now && now.cal && now.t ? fmtDate(now.cal, now.t) : '';
    const { list, added } = addAchievement(meta.achList, a, { mes: messageId, scene });
    meta.achList = list;
    if (!added) return;
    meta.achNew = [...(meta.achNew || []).filter(id => list.some(x => x.id === id)), added.id].slice(-30);
    ctx().saveMetadataDebounced?.();
    showEvent({ type: 'achievement', who: 'Витрина', text: added.title, desc: added.desc, icon: added.icon, tier: added.tier, kind: added.kind }, 600);
}

function safeClockView() {
    try { return clockView(); } catch (e) { console.warn('[Внутренний мир] часы', e); return null; }
}

// Телефон: кнопки разбора переезжают в шапку. Перерисовываем, когда экран переходит через границу (поворот, окно).
const PHONE_QUERY = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null;
function isPhone() {
    return !!(PHONE_QUERY && PHONE_QUERY.matches);
}
if (PHONE_QUERY) {
    const onPhoneChange = () => { if (panelEl() && !panelEl().hidden) renderPanelNow(); };
    if (PHONE_QUERY.addEventListener) PHONE_QUERY.addEventListener('change', onPhoneChange);
    else if (PHONE_QUERY.addListener) PHONE_QUERY.addListener(onPhoneChange);
}

// На компьютере листается тело дневника, на телефоне — вся страница дневника целиком: запоминаем обе прокрутки.
// Живой листок тоже листается: если читатель был внизу списка (или только открыл), держим его на последних строках.
function readScroll(el) {
    const lv = el?.querySelector('.iw-live-scroll');
    return {
        body: el?.querySelector('.iw-body')?.scrollTop || 0,
        book: el?.querySelector('.iw-book')?.scrollTop || 0,
        live: lv ? lv.scrollTop : null,
        liveEnd: lv ? lv.scrollTop + lv.clientHeight >= lv.scrollHeight - 12 : true,
    };
}

function writeScroll(el, keep) {
    const body = el?.querySelector('.iw-body');
    const book = el?.querySelector('.iw-book');
    if (body) body.scrollTop = keep.body;
    if (book) book.scrollTop = keep.book;
    fitLiveCard(el);
    const lv = el?.querySelector('.iw-live-scroll');
    if (lv) lv.scrollTop = keep.liveEnd !== false || keep.live == null ? lv.scrollHeight : keep.live;
}

// Листок не выше видимой части дневника: всё, что не влезло, листается внутри него.
function fitLiveCard(el) {
    const card = el?.querySelector('.iw-live-card');
    const body = el?.querySelector('.iw-body');
    const book = el?.querySelector('.iw-book');
    if (!card || !body || !book) return;
    const top = card.getBoundingClientRect().top;
    const bottom = Math.min(body.getBoundingClientRect().bottom, book.getBoundingClientRect().bottom);
    const lim = Math.round(bottom - top - 14);
    if (lim > 160) card.style.maxHeight = lim + 'px';
}

function renderAll() {
    const fab = document.getElementById('iw_fab');
    if (fab) fab.classList.toggle('iw-noanim', settings().animations === false);
    renderPanelNow();
}

async function openPanel() {
    refreshTheme();
    markFab(false);
    panelEl().hidden = false;
    raiseLayer(true);
    renderPanelNow();
}

function closePanel() {
    panelEl().hidden = true;
    raiseLayer(false);
}

// Открытый дневник — поверх плавающих кнопок и окошек других расширений (у некоторых слой 10000 и выше).
// Всплывающие окна таверны (подтверждения) живут в верхнем слое браузера и остаются над дневником.
// Своё окно в стиле темы дневника — вместо всплывашек таверны.
// buttons: [{ text, value, kind: 'main' | 'danger' | '' }]; input — подпись и значение поля; Esc и клик мимо — отмена (null).
function iwDialog({ title = '', text = '', html = '', input = null, buttons = [{ text: 'Хорошо', value: true, kind: 'main' }, { text: 'Отмена', value: null }] } = {}) {
    return new Promise(resolve => {
        const root = ui();
        const wrap = document.createElement('div');
        wrap.className = `iw-modal iw-theme-${currentTheme}${settings().animations === false ? ' iw-noanim' : ''}`;
        wrap.innerHTML = `
<div class="iw-modal-back"></div>
<div class="iw-modal-paper"><div class="iw-modal-card iw-block" role="dialog" aria-modal="true" aria-label="${esc(title)}">
  <span class="iw-tape" aria-hidden="true"></span>
  ${title ? `<div class="iw-modal-title iw-label">${esc(title)}</div>` : ''}
  ${text ? `<p class="iw-modal-text">${esc(text)}</p>` : ''}${html}
  ${input ? `<label class="iw-modal-field"><span class="iw-muted">${esc(input.label || '')}</span><input type="text" class="iw-modal-input" value="${esc(input.value || '')}" placeholder="${esc(input.placeholder || '')}" autocomplete="off"></label>` : ''}
  <div class="iw-modal-btns">${buttons.map((b, i) => `<button type="button" class="iw-btn iw-modal-btn${b.kind ? ' iw-modal-' + b.kind : ''}" data-i="${i}">${esc(b.text)}</button>`).join('')}</div>
</div></div>`;
        const panelOpen = isOpen();
        raiseLayer(true);
        root.appendChild(wrap);
        const field = wrap.querySelector('.iw-modal-input');
        const done = v => {
            document.removeEventListener('keydown', onKey, true);
            wrap.remove();
            if (!panelOpen && !isOpen()) raiseLayer(false);
            resolve(v);
        };
        const pick = i => {
            const b = buttons[i];
            if (!b) return done(null);
            done(input ? (b.value === null || b.value === undefined ? null : { value: b.value, input: field ? field.value : '' }) : b.value);
        };
        const onKey = ev => {
            if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(null); }
            if (ev.key === 'Enter' && field && wrap.contains(ev.composedPath()[0])) { ev.preventDefault(); pick(buttons.findIndex(b => b.kind === 'main')); }
        };
        document.addEventListener('keydown', onKey, true);
        wrap.addEventListener('click', ev => {
            const b = ev.target.closest('.iw-modal-btn');
            if (b) return pick(Number(b.dataset.i));
            if (ev.target.classList.contains('iw-modal-back')) done(null);
        });
        setTimeout(() => (field || wrap.querySelector('.iw-modal-main') || wrap.querySelector('.iw-modal-btn')).focus(), 30);
    });
}

function raiseLayer(on) {
    const host = document.getElementById('iw_host');
    if (host) host.style.setProperty('z-index', on ? '2147483000' : '3050', 'important');
}

function togglePanel() {
    if (isOpen()) closePanel();
    else openPanel();
}

// В настройках на кнопке списка лорбуков — «Отмечено: N из M»; обновляем на месте.
function updateBooksCount(el) {
    const wrap = el.closest('.iw-books-wide');
    const text = wrap && wrap.querySelector('.iw-books-field-text');
    if (!text) return;
    const all = wrap.querySelectorAll('.iw-book-opt').length;
    const on = wrap.querySelectorAll('.iw-book-opt.on').length;
    text.textContent = `Отмечено: ${on} из ${all}`;
}

// Карандаш по бумаге — на всех кнопках, которые заново что-то пишут: разбор, мечта, НПС, лавка.
function writeSound() {
    if (settings().sound !== false) playSound('write', currentTheme);
}

// ВРЕМЕННО: проверка уведомлений и звуков из меню с колокольчиком в шапке. Потом убрать вместе с TEST_MENU в render.js.
const TEST_SAMPLES = {
    want_done: { text: 'напоить свидетельницу горячим чаем', points: 10 },
    dream_step: { text: 'собрать старые записи', points: 25 },
    dream_grow: { text: 'написать книгу — вместе с ней', why: 'она поверила в него' },
    dream_change: { text: 'уехать к морю и начать заново', why: 'после того вечера всё изменилось' },
    dream_done: { text: 'написать книгу', points: 100 },
    fear_real: { text: 'снова потерять близких' },
    fear_gone: { text: 'остаться одному' },
    trait_new: { text: 'Покровительственный', why: 'опекает её с первой встречи' },
    trait_up: { text: 'Заботливый', why: 'всё чаще думает о других' },
    trait_down: { text: 'Недоверчивый', why: 'начал открываться' },
    impression: { text: 'Напуганная, но стойкая', score: 1, why: 'не лезет в толпу' },
    attitude: { from: 1, to: 2, text: 'стал теплее' },
    reward: { text: 'Термос с горячим чаем' },
};
// Проверка витрины: тестовые достижения и памятные вещи (помечены test, стираются одной кнопкой)
const TEST_ACH = [
    { title: 'Чай, а не яд', desc: 'Выпить чай, который заварил вампир, и остаться в живых.', icon: 'cup', kind: 'funny', tier: 'bronze' },
    { title: 'Мастер неловких пауз', desc: 'Молчать двадцать секунд после признания.', icon: 'shy', kind: 'funny', tier: 'bronze' },
    { title: 'Не в этот раз, смерть', desc: 'Вытащить человека из горящего дома.', icon: 'shield', kind: 'feat', tier: 'gold' },
    { title: 'Кто здесь?', desc: 'Услышать шаги на чердаке пустого дома.', icon: 'ghost', kind: 'dark', tier: 'silver' },
    { title: 'Под дождём', desc: 'Первый поцелуй у старой часовни.', icon: 'lips', kind: 'romance', tier: 'silver' },
    { title: 'Плед на двоих', desc: 'Укрыть уснувшего у камина.', icon: 'heart', kind: 'cute', tier: 'bronze' },
    { title: 'Скелет в шкафу', desc: 'Узнать, что от тебя скрывали с первого дня.', icon: 'key', kind: 'secret', tier: 'silver' },
];
const TEST_KEEP = [
    { title: 'Старый компас', icon: 'key', desc: 'Стрелка почему-то всегда указывает на дом.' },
    { title: 'Засушенная роза', icon: 'flower', desc: 'Подарок в первую ночь.' },
    { title: 'Письмо без подписи', icon: 'letter', desc: 'Почерк кажется знакомым.' },
];
let testAchIdx = 0;
async function testShowcase(kind) {
    if (!hasChat()) {
        // без чата — только показать, как выглядит уведомление; на витрину ничего не пишем
        if (kind === 'ach') {
            const a = TEST_ACH[testAchIdx++ % TEST_ACH.length];
            return showEvent({ type: 'achievement', who: 'Витрина', text: a.title, desc: `${a.desc} (проверка: открой чат, и тестовая ачивка встанет на витрину)`, icon: a.icon, tier: a.tier, kind: a.kind });
        }
        return showEvent({ type: 'reward', who: 'Витрина', text: 'Открой чат с персонажем — тогда тестовая вещь или очистка сработают в нём.' });
    }
    const meta = chatMeta();
    if (kind === 'ach') {
        const have = (meta.achList || []).map(x => x.title);
        const pickA = TEST_ACH.find(a => !have.includes(a.title)) || TEST_ACH[Math.floor(Math.random() * TEST_ACH.length)];
        const now = clockNow();
        const { list, added } = addAchievement((meta.achList || []).filter(x => x.title !== pickA.title), Object.assign({}, pickA), { scene: now && now.cal && now.t ? fmtDate(now.cal, now.t) : '' });
        added.test = true;
        meta.achList = list;
        meta.achNew = [...(meta.achNew || []), added.id].slice(-30);
        ctx().saveMetadataDebounced?.();
        showEvent({ type: 'achievement', who: 'Витрина', text: added.title, desc: added.desc, icon: added.icon, tier: added.tier, kind: added.kind });
        return renderAll();
    }
    if (kind === 'keep' || kind === 'clearcase') {
        const st = currentState();
        const { mains } = splitCast(st);
        if (kind === 'keep') {
            const key = mains[0] || st.order[0];
            if (!key) return showEvent({ type: 'reward', who: 'Витрина', text: 'Сначала заполни дневник этого чата (кнопка «Чат»), потом положи вещь.' });
            const ch = st.characters[key];
            const owned = (ch.collection || []).map(x => x.title);
            const item = TEST_KEEP.find(x => !owned.includes(x.title)) || TEST_KEEP[0];
            ch.collection = (ch.collection || []).concat([Object.assign({ got: Date.now(), test: true }, item)]);
            await saveEditedState(st);
            showEvent({ type: 'reward', who: ch.name, text: `«${item.title}» — на витрине (тестовая вещь)` });
            return renderAll();
        }
        meta.achList = (meta.achList || []).filter(x => !x.test);
        meta.achNew = (meta.achNew || []).filter(id => meta.achList.some(x => x.id === id));
        ctx().saveMetadataDebounced?.();
        for (const k of st.order) if (st.characters[k] && st.characters[k].collection) st.characters[k].collection = st.characters[k].collection.filter(x => !x.test);
        await saveEditedState(st);
        showEvent({ type: 'reward', who: 'Витрина', text: 'Тестовые достижения и вещи стёрты' });
        return renderAll();
    }
}

function testNotice(kind) {
    const who = (currentState().order || []).map(k => currentState().characters[k] && currentState().characters[k].name).find(Boolean) || ctx().name2 || 'Персонаж';
    if (kind === 'ach' || kind === 'keep' || kind === 'clearcase') return testShowcase(kind);
    if (kind === 'write') return writeSound();
    if (kind === 'error') return showError({ kind: 'test', title: 'Модель не ответила', text: 'Это проверочная ошибка: так выглядит листок, если разбор не удался.' }, { manual: true, what: 'Проверка' });
    if (kind === 'all') {
        const kinds = Object.keys(TEST_SAMPLES);
        kinds.forEach((k, i) => showEvent(Object.assign({ type: k, who }, TEST_SAMPLES[k]), i * 2600));
        return;
    }
    showEvent(Object.assign({ type: kind, who }, TEST_SAMPLES[kind] || {}));
}

async function onPanelClick(e) {
    // всплывающие меню (кошелёк, звук, лорбуки) закрываются, если нажать мимо них
    for (const d of panelEl().querySelectorAll('details.iw-wallet[open], details.iw-vol[open], details.iw-books[open], details.iw-clock[open], details.iw-pick[open]')) {
        if (d.contains(e.target)) continue;
        d.open = false;
        if (d.classList.contains('iw-clock')) { clockOpen = false; clockDraft = null; clockMonth = null; }
    }
    // свернуть / развернуть блок: стрелка или заголовок; свёрнутый — кликом в любом его месте
    const folded = e.target.closest('.iw-block.iw-collapsed');
    const fold = e.target.closest('[data-iw-fold]')
        || (folded && !e.target.closest('a, input, select, textarea') && folded.querySelector('[data-iw-fold]'));
    if (fold) {
        const s0 = settings();
        const k = fold.dataset.iwFold;
        s0.collapsed = Object.assign({}, s0.collapsed, { [k]: !(s0.collapsed && s0.collapsed[k]) });
        if (!s0.collapsed[k]) delete s0.collapsed[k];
        saveSettings();
        return renderAll();
    }
    const attrSum = e.target.closest('summary.iw-attr-add');
    if (attrSum) attrOpen = !attrSum.parentElement.open;
    // листок часов и раздел «Календарь» помнят, раскрыты ли они, между перерисовками
    const clockSum = e.target.closest('summary.iw-clock-bar');
    if (clockSum) clockOpen = !clockSum.parentElement.open;
    const calSum = e.target.closest('.iw-clock-cal > summary');
    if (calSum) clockCalOpen = !calSum.parentElement.open;
    // день рождения на карточке — своя кнопка внутри карточки, карточку при этом не открываем
    const bornTag = e.target.closest('[data-iw-born], [data-iw-npcx]');
    const t = bornTag && bornTag.tagName !== 'BUTTON' ? bornTag : e.target.closest('button');
    if (bornTag) { e.preventDefault(); e.stopPropagation(); }
    if (!t) return;
    const s = settings();
    if (t.classList.contains('iw-close')) return closePanel();
    if (t.classList.contains('iw-gear')) {
        view = view === 'settings' ? lastView || '' : (lastView = view, 'settings');
        return renderPanelNow();
    }
    if (t.dataset.iwAction) return onSettingsAction(t.dataset.iwAction, t);
    if (t.dataset.iwLang) return setLanguage(t.dataset.iwLang);
    if (t.classList.contains('iw-anim')) {
        s.animations = s.animations === false;
        saveSettings();
        syncSettingsForm();
        return renderAll();
    }
    if (t.classList.contains('iw-sound')) {
        s.sound = s.sound === false;
        saveSettings();
        if (s.sound) playSound('trait_up', currentTheme);
        syncSettingsForm();
        // меню громкости не закрываем: обновляем его на месте
        const vol = t.closest('.iw-vol');
        if (vol && view !== 'settings') {
            vol.classList.toggle('off', !s.sound);
            t.classList.toggle('off', !s.sound);
            t.setAttribute('aria-pressed', String(s.sound));
            t.innerHTML = `${iconHtml(s.sound ? 'sound' : 'mute')}<span>${s.sound ? 'Звук включён' : 'Звук выключен'}</span>`;
            const sum = vol.querySelector('summary');
            if (sum) sum.innerHTML = iconHtml(s.sound ? 'sound' : 'mute');
            const range = vol.querySelector('[data-iw-volume]');
            if (range) range.disabled = !s.sound;
            return;
        }
        return renderAll();
    }
    if (t.dataset.iwTest) return testNotice(t.dataset.iwTest);
    if (t.dataset.iwStop !== undefined) return stopAnalysis(t.dataset.iwStop === 'dream' ? 'Остановлено: мечта осталась прежней' : '');
    if (t.dataset.iwAttr) return onAttrAction(t.dataset.iwAttr, t);
    if (t.dataset.iwLiveHide !== undefined) {
        if (live) live.hidden = true;
        return renderAll();
    }
    if (t.dataset.iwLiveShow !== undefined) {
        if (live) live.hidden = false;
        return renderAll();
    }
    if (t.dataset.iwSkipBook) {
        if (!hasChat()) return notice('Сначала открой чат с персонажем.');
        const on = toggleOffBook(t.dataset.iwSkipBook);
        t.classList.toggle('on', on);
        t.setAttribute('aria-pressed', String(on));
        updateBooksCount(t);
        return;
    }
    if (t.dataset.iwPickBook) {
        if (!hasChat()) return notice('Сначала открой чат с персонажем.');
        // галочка ставится на месте, меню не закрывается
        const on = togglePickedBook(t.dataset.iwPickBook);
        t.classList.toggle('on', on);
        t.setAttribute('aria-pressed', String(on));
        const menu = t.closest('.iw-books-menu');
        const n = menu ? menu.querySelectorAll('.iw-book-opt.on:not(.linked)').length : 0;
        const cnt = menu && menu.querySelector('.iw-books-count');
        if (cnt) cnt.textContent = n ? `ещё отмечено: ${n}` : '';
        updateBooksCount(t);
        return;
    }
    if (t.dataset.iwAnalyze) {
        if (!hasChat()) return notice('Сначала открой чат с персонажем.');
        const menu = t.closest('details');
        if (menu) menu.open = false;
        const kind = t.dataset.iwAnalyze;
        if (kind === 'chat') {
            const id0 = lastBotMessageId();
            if (id0 >= 0 && recordOf(ctx().chat[id0]) && (chatMeta().fp || {}).chat === chatFp(id0) && !missingPersona()) return nothingNew('сообщения чата');
        }
        // карандаш «пишет» один раз — только на нажатие кнопки, не на автообновления
        if (!busy && s.sound !== false) playSound('write', currentTheme);
        if (kind === 'chat') {
            const id = lastBotMessageId();
            if (id < 0) return notice('В чате ещё нет ответа персонажа.');
            const my = runId;
            await analyze(id, { manual: true, kind: 'chat' });
            if (my === runId) await autoRewards();
            return;
        }
        const my = runId;
        await studyLore({ mode: kind });
        if (my === runId) await autoRewards();
        return;
    }
    if (t.dataset.iwTheme) {
        s.theme = t.dataset.iwTheme;
        saveSettings();
        refreshTheme();
        syncSettingsForm();
        return renderAll();
    }
    if (t.dataset.iwDream) {
        if (t.dataset.iwDream === 'regen' && !dreamBusy) writeSound();
        return onDreamAction(t.dataset.iwDream);
    }
    if (t.dataset.iwShop) {
        if (!shopBusy) writeSound();
        return regenShop();
    }
    if (t.dataset.iwWantPin !== undefined) return toggleWantPin(Number(t.dataset.iwWantPin));
    if (t.dataset.iwTrait) return onTraitAction(t.dataset.iwTrait);
    if (t.dataset.iwCheat) return enterCheat();
    if (t.dataset.iwBuy) return buy(t.dataset.iwBuy);
    if (t.dataset.iwGiftto) { giftTo = t.dataset.iwGiftto; return renderPanelNow(); }
    if (t.dataset.iwUnbuy) {
        const i = t.dataset.iwUnbuy.indexOf(':');
        const key = t.dataset.iwUnbuy.slice(0, i), id = t.dataset.iwUnbuy.slice(i + 1);
        const st = currentState();
        const ch = st.characters[key];
        const back = cancelReward(ch, id, st);
        if (back === null) return;
        await saveEditedState(st);
        updateInjection();
        notice(`«${(ch && ch.name) || ''}»: отменено, вернулось ${back} ${plural(back, 'монета', 'монеты', 'монет')}.`);
        return renderAll();
    }
    if (t.dataset.iwMod) {
        const m = t.dataset.iwMod;
        s.modules[m] = !s.modules[m];
        saveSettings();
        syncSettingsForm();
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwView) {
        const next = t.dataset.iwView === 'back' ? (viewBefore || '') : t.dataset.iwView;
        if (next === 'showcase' && view !== 'showcase') { viewBefore = view; caseSel = ''; seenAchievements(); }
        view = next;
        writeScroll(panelEl(), { body: 0, book: 0 });
        return renderPanelNow();
    }
    if (t.dataset.iwStudy) {
        if (!rosterBusy && !busy) writeSound();
        return studyLore({ mode: 'lore' });
    }
    if (t.dataset.iwQuick) return onQuickSetting(t.dataset.iwQuick);
    if (t.dataset.iwQuickOpen) return openSettingsAt(t.dataset.iwQuickOpen);
    if (t.dataset.iwAchdel) {
        const meta = chatMeta();
        meta.achList = (meta.achList || []).filter(x => x.id !== t.dataset.iwAchdel);
        ctx().saveMetadataDebounced?.();
        caseSel = '';
        return renderPanelNow();
    }
    if (t.dataset.iwCase) {
        caseSel = caseSel === t.dataset.iwCase ? '' : t.dataset.iwCase;
        return renderPanelNow();
    }
    if (t.dataset.iwClock) {
        e.preventDefault();
        return onClockAction(t.dataset.iwClock);
    }
    if (t.dataset.iwBorn) {
        const key = t.dataset.iwBorn;
        const state = currentState();
        const ch = state.characters[key];
        if (!ch) return;
        const c0 = ctx();
        const p2 = n => String(n).padStart(2, '0');
        const cur = ch.born ? (ch.born.d && ch.born.m ? `${p2(ch.born.d)}.${p2(ch.born.m)}${ch.born.y ? '.' + ch.born.y : ''}` : String(ch.born.y || '')) : '';
        const got = await iwDialog({ title: `День рождения: ${ch.name}`, text: 'Дата — 20.08.1969, просто 20.08 или только год рождения — 1969. Или возраст на сегодня по часам сцены — например 27, дальше он будет расти сам. Оставь пустым, чтобы убрать.', input: { label: 'Дата или возраст', value: cur, placeholder: '20.08.1969' }, buttons: [{ text: 'Сохранить', value: 'ok', kind: 'main' }, { text: 'Отмена', value: null }] });
        const val = got ? got.input : null;
        if (val === null || val === undefined || val === false) return;
        const txt = String(val).trim();
        const ageOnly = txt.match(/^(\d{1,3})\s*(год|года|лет|г\.?)?$/i);
        if (ageOnly) {
            // возраст вручную: привязываем к дате сцены, дальше он растёт по часам; год рождения из лорбука больше не главный
            const now = clockNow();
            if (!now || !now.cal || !now.t) return notice('Сначала нужны часы сцены: открой календарь в дневнике.');
            const age = Number(ageOnly[1]);
            ch.ageAt = Object.assign({ age }, now.cal.type === 'days' ? { d: now.t.d } : { y: now.t.y, m: now.t.m, d: now.t.d });
            if (ch.born && ch.born.y) { ch.born = Object.assign({}, ch.born); delete ch.born.y; }
            delete ch.ageSaid;
            ch.bornManual = true;
            await saveEditedState(state);
            updateInjection();
            notice(`${ch.name}: ${age} ${plural(age, 'год', 'года', 'лет')} — дальше по часам сцены`);
            return renderAll();
        }
        if (!txt) {
            delete ch.born;
            delete ch.ageAt;
        } else {
            const b = parseBorn(txt);
            if (!b) return notice('Не поняла дату. Пример: 20.08.1969, 20.08 или 1969');
            ch.born = b;
            if (b.d && b.m) ch.zodiac = zodiacOf(b.d, b.m) || ch.zodiac;
        }
        ch.bornManual = true;
        await saveEditedState(state);
        updateInjection();
        notice(ch.born ? `${ch.name}: ${bornText(ch.born)}` : `${ch.name}: дата рождения убрана`);
        return renderAll();
    }
    if (t.dataset.iwDead) {
        // игрок сам отмечает: персонажа нет в живых — или он всё-таки жив
        const i = t.dataset.iwDead.lastIndexOf(':');
        const key = t.dataset.iwDead.slice(0, i), dead = t.dataset.iwDead.slice(i + 1) === '1';
        const state = currentState();
        const ch = state.characters[key];
        if (!ch) return;
        ch.dead = dead;
        ch.deadManual = true;
        if (dead) for (const k of ['mood', 'moodSaid', 'faceSaid', 'face', 'moodlets', 'moodCalc', 'moodKey']) delete ch[k];
        await saveEditedState(state);
        updateInjection();
        notice(dead ? `${ch.name}: нет в живых` : `${ch.name}: снова среди живых — заполнится при следующем разборе`);
        return renderAll();
    }
    if (t.dataset.iwMet) {
        // игрок сам поправляет: знакомы лично или только понаслышке
        const i = t.dataset.iwMet.lastIndexOf(':');
        const key = t.dataset.iwMet.slice(0, i), met = t.dataset.iwMet.slice(i + 1) === '1';
        const state = currentState();
        const ch = state.characters[key];
        if (!ch) return;
        ch.met = met;
        ch.metManual = true;
        await saveEditedState(state);
        updateInjection();
        notice(met ? `${ch.name}: знакомы лично — заполнится при следующем разборе` : `${ch.name}: только понаслышке`);
        return renderAll();
    }
    if (t.dataset.iwDel) {
        const [kind, idx] = t.dataset.iwDel.split(':');
        const state = currentState();
        const key = view.includes(':') ? view.slice(view.indexOf(':') + 1) : null;
        const ch = key && state.characters[key];
        if (!ch || !Array.isArray(ch[kind])) return;
        // убранный факт «что знает персона» модель больше не вернёт
        if (kind === 'heard' && ch.heard[Number(idx)]) ch.heardOff = [...(ch.heardOff || []), ch.heard[Number(idx)].fact].slice(-20);
        ch[kind].splice(Number(idx), 1);
        markEdited(ch, kind);
        await saveEditedState(state);
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwNpcx) {
        // убрать НПС: только сейчас (вернётся, когда снова придёт в сцену) или навсегда
        const key = t.dataset.iwNpcx;
        const state = currentState();
        const ch = state.characters[key];
        if (!ch) return;
        const c0 = ctx();
        const res = await iwDialog({ title: `Убрать ${ch.name} из НПС?`, html: `<p class="iw-modal-text"><b>Только сейчас</b> — запись пропадёт, но если ${esc(ch.name)} снова появится в сцене, дневник заведёт запись заново.</p><p class="iw-modal-text"><b>Навсегда</b> — дневник больше не будет ни вести, ни показывать этого персонажа в этом чате. Вернуть можно внизу списка НПС или в настройках, раздел «Этот чат».</p>`, buttons: [{ text: 'Только сейчас', value: 1, kind: 'main' }, { text: 'Навсегда', value: 2, kind: 'danger' }, { text: 'Отмена', value: null }] });
        if (res !== 1 && res !== 2) return;
        delete state.characters[key];
        state.order = state.order.filter(k => k !== key);
        if (res === 2) {
            const meta = chatMeta();
            meta.ignored = [...ignoredNames().filter(n => !sameName(n, ch.name)), ch.name];
        }
        chatMeta().fp = {};
        if (view === 'npc:' + key) view = 'npc';
        await saveEditedState(state);
        ctx().saveMetadataDebounced?.();
        updateInjection();
        notice(res === 2 ? `${ch.name}: забыт навсегда` : `${ch.name}: убран, вернётся, если снова придёт в сцену`);
        return renderAll();
    }
    if (t.dataset.iwUnignore) {
        const name = t.dataset.iwUnignore;
        chatMeta().ignored = ignoredNames().filter(n => !sameName(n, name));
        ctx().saveMetadataDebounced?.();
        syncSettingsForm();
        notice(`${name}: дневник снова будет его замечать`);
        return renderAll();
    }
    if (t.dataset.iwForget) {
        const key = t.dataset.iwForget;
        const state = currentState();
        if (!state.characters[key]) return;
        const c0 = ctx();
        const ok = await iwDialog({ title: `Забыть ${state.characters[key].name}?`, text: 'Всё, что о нём записано в дневнике этого чата, пропадёт. Если он снова появится в сцене, дневник заведёт запись заново.', buttons: [{ text: 'Забыть', value: true, kind: 'danger' }, { text: 'Отмена', value: null }] });
        if (!ok) return;
        delete state.characters[key];
        state.order = state.order.filter(k => k !== key);
        // после «забыть» следующий разбор не должен решить, что ничего нового нет
        chatMeta().fp = {};
        view = '';
        await saveEditedState(state);
        updateInjection();
        return renderAll();
    }
}

// НПС, которых игрок попросил забыть навсегда: дневник их больше не ведёт и не показывает
function ignoredNames() {
    const list = chatMeta().ignored;
    return Array.isArray(list) ? list : [];
}
function isIgnored(name) {
    return ignoredNames().some(n => sameName(n, name) || namesMatch(n, name));
}

// Ключ персонажа, чья страница открыта.
function viewKey() {
    return view.includes(':') ? view.slice(view.indexOf(':') + 1) : null;
}

function analysisInfo(n = 6) {
    const c = ctx();
    const chat = c.chat || [];
    const msgs = [];
    for (let i = chat.length - 1; i >= 0 && msgs.length < n; i--) {
        const m = chat[i];
        if (m && !m.is_system && m.mes) msgs.unshift(`#${i} ${m.name}: ${cleanMessageText(m.mes, 1200)}`);
    }
    return { botName: c.name2, userName: c.name1, card: cardText(c), messages: msgs, loreMain: [] };
}

// Отпечатки: что было на входе прошлого разбора. Совпал — значит, нового ничего, модель не зовём.
function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36) + ':' + str.length;
}

function chatFp(id) {
    const chat = ctx().chat || [];
    const m = chat[id];
    if (!m) return '';
    let userText = '';
    for (let i = id - 1; i >= 0; i--) {
        if (chat[i] && chat[i].is_user) { userText = chat[i].mes || ''; break; }
    }
    return hashStr(`${id}|${m.swipe_id ?? 0}|${m.mes}|${userText}|${JSON.stringify(settings().modules)}`);
}

// У кого из главных ещё нет типа личности, темперамента или «подробнее» к чертам — такой разбор не считаем пустым.
function missingPersona() {
    if (!hasChat()) return false;
    const st = currentState();
    // главного героя нет в дневнике (его забыли или дневник очистили) — разбирать есть что
    if (mainNames().some(n => !st.order.some(k => namesMatch(k, n)))) return true;
    if (!settings().modules.traits) return false;
    return splitCast(st).mains.some(k => {
        const ch = st.characters[k];
        return ch && (!ch.ptype || !ch.temper || (ch.traits || []).some(t => t.kind !== 'gone' && !t.about));
    });
}

// Ответ обрезан: JSON не закрыт (кончились токены, часто у думающих моделей).
function looksCut(raw) {
    const t = String(raw || '').replace(/```\s*$/, '').trim();
    return !!t && t.includes('{') && !t.endsWith('}') && !t.endsWith(']');
}

function nothingNew(what) {
    notice(`Ничего нового: ${what} не менялись с прошлого разбора. Мечту и награды можно придумать заново — кубиком у мечты и в магазине.`);
}

// Сведения из карточки и лорбуков запоминаются после разбора кнопками «Лорбук» / «Всё сразу».
// Мечта и награды придумываются заново по ним, а не перечитывают лорбуки каждый раз.
function rememberKnowledge(sources) {
    if (!hasChat() || !sources || !sources.length) return;
    chatMeta().knowledge = { at: Date.now(), lore: sources.map(x => `[${x.title}]\n${cleanMessageText(x.text, 4000)}`).slice(0, 6) };
    ctx().saveMetadataDebounced?.();
}

function knowledgeLore(limit = 3) {
    const k = hasChat() ? chatMeta().knowledge : null;
    return k && Array.isArray(k.lore) ? k.lore.filter(t => !t.startsWith('[Карточка')).slice(0, limit) : null;
}

// Награды подбираются сами после разбора — тем главным персонажам, у кого магазина ещё нет.
async function autoRewards() {
    if (settings().points === false || !hasChat()) return;
    const st = currentState();
    for (const key of splitCast(st).mains) {
        const ch = st.characters[key];
        if (!ch || (ch.shop && ch.shop.length)) continue;
        await regenShop(key, { quiet: true });
    }
}

async function onDreamAction(action) {
    const key = viewKey();
    const state = currentState();
    const ch = key && state.characters[key];
    if (!ch) return;
    if (action === 'pin') {
        if (!ch.dream) return;
        ch.dream.pinned = !ch.dream.pinned;
        await saveEditedState(state);
        return renderAll();
    }
    if (action === 'regen' && !dreamBusy) {
        if (ch.dream && ch.dream.pinned) return;
        const my = runId;
        dreamBusy = key; // крутится только кнопка этого персонажа
        renderAll();
        try {
            const info = analysisInfo(6);
            const c0 = ctx();
            const isPersona = key === personaKeyOf(state);
            if (isPersona) {
                // мечта персоны игрока — по её описанию и её лорбуку, а не по карточке персонажа
                const pdesc = c0.powerUserSettings && c0.powerUserSettings.persona_description;
                const pbook = c0.powerUserSettings && c0.powerUserSettings.persona_description_lorebook;
                info.persona = true;
                info.card = cleanMessageText(pdesc || '', 4000);
                info.botName = ch.name || c0.name1;
                info.userName = c0.name2;
                const lore = pbook ? await collectLoreSources().catch(() => []) : [];
                info.loreMain = lore.filter(x => x.title === `Лорбук: ${pbook}`).map(x => `[${x.title}]\n${cleanMessageText(x.text, 4000)}`).slice(0, 1);
            } else {
                const cached = knowledgeLore(3);
                if (cached) info.loreMain = cached;
                else {
                    const lore = await collectLoreSources().catch(() => []);
                    info.loreMain = lore.filter(x => x.title.startsWith('Лорбук')).map(x => `[${x.title}]\n${cleanMessageText(x.text, 4000)}`).slice(0, 3);
                }
            }
            const { system, user } = buildDreamPrompt(info, ch, settings().language);
            const raw = await callModel(system, user, withBudget('dream'));
            const dream = parseDream(raw);
            const st = currentState();
            const c2 = st.characters[key];
            if (!c2) return;
            const prev = c2.dream;
            c2.dream = Object.assign(dream, { pinned: false, manual: true, history: prev ? ((prev.history || []).concat([{ title: prev.title, plus: prev.plus || '' }])).slice(-4) : [] });
            c2.dreamChangedAt = c2.cycle || 0;
            c2.log = [{ type: 'dream_change', text: `«${dream.title}» — придумана заново`, m: null }].concat(c2.log || []).slice(0, 40);
            await saveEditedState(st);
            updateInjection();
            if (settings().sound !== false) playSound('dream_change', currentTheme);
        } catch (err) {
            if (err && err.cancelled) return;
            console.error('[Внутренний мир]', err);
            showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw) }), { manual: true, what: 'Мечта не придумалась' });
        } finally {
            if (my === runId) {
                dreamBusy = false;
                renderAll();
            }
        }
    }
}

async function regenShop(forKey = null, { quiet = false } = {}) {
    const key = forKey || viewKey();
    if (!key || shopBusy) return;
    const ch = currentState().characters[key];
    if (!ch) return;
    const my = runId;
    shopBusy = true;
    if (quiet) status = `Подбираю награды: ${ch.name}…`;
    renderAll();
    try {
        const info = analysisInfo(4);
        info.loreMain = knowledgeLore(2) || [];
        info.style = (THEMES[currentTheme] && THEMES[currentTheme].name) || '';
        const { system, user } = buildRewardsPrompt(info, ch, settings().language);
        const raw = await callModel(system, user, withBudget('rewards'));
        const rewards = parseRewards(raw);
        if (!rewards.length) throw new Error('модель не вернула наград');
        const st = currentState();
        if (!st.characters[key]) return;
        st.characters[key].shop = rewards;
        await saveEditedState(st);
    } catch (err) {
        if (err && err.cancelled) return;
        console.error('[Внутренний мир]', err);
        if (!quiet) showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw) }), { manual: true, what: 'Награды не подобрались' });
    } finally {
        if (my === runId) {
            shopBusy = false;
            renderAll();
        }
    }
}

// «Что привлекает»: убрать тег, переключить список, добавить из каталога или своё.
async function onAttrAction(spec, btn) {
    const [act, list, ...rest] = spec.split(':');
    if (act === 'more') {
        attrMore = Object.assign({}, attrMore, { [list]: !attrMore[list] });
        return renderAll();
    }
    if (act === 'mode') {
        attrMode = list === 'dislikes' ? 'dislikes' : 'likes';
        attrOpen = true;
        return renderAll();
    }
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    if (!ch || !['likes', 'dislikes'].includes(list)) return;
    const arr = (ch[list] = Array.isArray(ch[list]) ? ch[list] : []);
    const other = list === 'likes' ? 'dislikes' : 'likes';
    if (act === 'del') {
        arr.splice(Number(rest[0]), 1);
    } else {
        let tag = act === 'own' ? String((btn.closest('.iw-attr-own') && btn.closest('.iw-attr-own').querySelector('.iw-attr-input') || {}).value || '') : rest.join(':');
        tag = tag.trim().replace(/\s+/g, ' ').slice(0, 40).toLowerCase();
        if (!tag) return;
        const at = arr.findIndex(x => x.toLowerCase() === tag);
        if (at >= 0 && act === 'toggle') arr.splice(at, 1);
        else if (at < 0) {
            arr.push(tag);
            // один и тот же тег не может и привлекать, и отталкивать
            if (Array.isArray(ch[other])) ch[other] = ch[other].filter(x => x.toLowerCase() !== tag);
        }
        attrOpen = true;
    }
    ch.attrSet = true;
    markEdited(ch, 'likes');
    markEdited(ch, 'dislikes');
    await saveEditedState(st);
    renderAll();
}

// Отметка «игрок правил этот блок руками» — при повторном разборе того же ответа правка не потеряется.
function markEdited(ch, field) {
    ch.edited = Object.assign({}, ch.edited, { [field]: findHolder().index });
}

// Черты: закрепить (модель не изменит) и перенести приобретённую в постоянные.
async function onTraitAction(spec) {
    const [act, idx] = spec.split(':');
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    const tr = ch && ch.traits && ch.traits[Number(idx)];
    if (!tr) return;
    if (act === 'back') restoreTrait(tr);
    if (act === 'keep') {
        tr.kind = 'base';
        tr.kept = true;
    }
    markEdited(ch, 'traits');
    await saveEditedState(st);
    updateInjection();
    renderAll();
}

// Закрепить желание: не изменится и не пропадёт, пока не исполнится (как в «Симс»).
async function toggleWantPin(i) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    const w = ch && ch.wants && ch.wants[i];
    if (!w || w.status !== 'active') return;
    w.pinned = !w.pinned;
    markEdited(ch, 'wants');
    await saveEditedState(st);
    updateInjection();
    renderAll();
}

// Чит-коды, как в «Симс»: motherlode — +50 000, kaching и rosebud — +1 000 в общий кошелёк чата
const CHEATS = { motherlode: 50000, kaching: 1000, rosebud: 1000 };
async function enterCheat() {
    if (!hasChat()) return notice('Сначала открой чат с персонажем.');
    for (const d of panelEl().querySelectorAll('details.iw-wallet[open]')) d.open = false;
    const got = await iwDialog({ title: 'Чит-код', text: 'Как в «Симс»: введи код — монеты упадут в общий кошелёк этого чата.', input: { label: 'Код', value: '', placeholder: 'motherlode' }, buttons: [{ text: 'Ввести', value: 'ok', kind: 'main' }, { text: 'Отмена', value: null }] });
    if (!got) return;
    const code = String(got.input || '').toLowerCase().replace(/[^a-z!;]/g, '').replace(/[!;]+/g, '');
    const add = CHEATS[code];
    if (!add) return notice(`Код «${String(got.input || '').trim() || '…'}» не сработал. Попробуй motherlode.`, 'Чит-код');
    const st = currentState();
    st.purse = purseOf(st) + add;
    await saveEditedState(st);
    showEvent({ type: 'reward', who: 'Чит-код', text: `${code}: +${add.toLocaleString('ru-RU')} — теперь в кошельке ${st.purse.toLocaleString('ru-RU')}`, icon: 'coin' });
    renderAll();
}

async function buy(id) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    if (!ch) return;
    const reward = (ch.shop || []).find(r => r.id === id);
    // памятную вещь можно подарить и персоне игрока — она ляжет в её коллекцию
    const pk = splitCast(st).personaKey;
    const target = reward && reward.kind === 'collect' && giftTo === 'persona' && pk && st.characters[pk] ? st.characters[pk] : ch;
    const err = buyReward(target, reward, st);
    if (err) return notice(err);
    await saveEditedState(st);
    updateInjection();
    showEvent({ type: 'reward', who: target.name, text: reward.kind === 'collect' ? `«${reward.title}» — в коллекции, загляни на витрину` : `«${reward.title}» — ${reward.kind === 'event' ? 'случится в следующем ответе' : `действует ${reward.turns} ${plural(reward.turns, 'ответ', 'ответа', 'ответов')}`}`, icon: reward.icon });
    renderAll();
}

function setLanguage(lang) {
    const s = settings();
    if (s.language === lang) return;
    s.language = lang;
    saveSettings();
    syncSettingsForm();
    renderAll();
}

// Ползунок громкости: двигаешь — громкость меняется сразу, отпустил — слышно, как звучит.
function onPanelInput(e) {
    const el = e.target;
    if (!el || !(el.matches('[data-iw-volume]') || el.dataset.iwSet === 'volume')) return;
    const v = Number(el.value) || 0;
    settings().volume = v;
    setVolume(v);
    const box = el.closest('.iw-vol-menu, label');
    const out = box && box.querySelector('.iw-range-val');
    if (out) out.textContent = v + '%';
}

async function onPanelChange(e) {
    const el = e.target;
    if (el && el.matches && el.matches('[data-iw-clock="lock"]')) return onClockAction('lock');
    if (el && el.matches && el.matches('[data-iw-clock-in="vy"]')) {
        const now = clockNow();
        if (!now || !now.t) return;
        const draft = clockDraft || now.t;
        const view = clockMonth || { y: draft.y, m: draft.m };
        clockMonth = { y: Number(el.value) || view.y, m: view.m };
        clockOpen = true;
        return renderAll();
    }
    if (el && el.matches && el.matches('[data-iw-clock-in="dd"]')) {
        const now = clockNow();
        if (!now || !now.t) return;
        clockDraft = Object.assign({}, clockDraft || now.t, { d: Math.max(1, Number(el.value) || 1) });
        clockOpen = true;
        return renderAll();
    }
    if (el && el.matches && el.matches('[data-iw-volume]')) {
        settings().volume = Number(el.value) || 0;
        setVolume(settings().volume);
        saveSettings();
        playSound('want_done', currentTheme);
        syncSettingsForm();
        return;
    }
    if (el.closest && el.closest('.iw-form')) {
        const keep = readScroll(panelEl());
        await onSettingsChanged(el);
        writeScroll(panelEl(), keep);
    }
}

// ---------- Кнопки и настройки ----------

// Плавающая кнопка: перетаскивается, место запоминается (в долях экрана, чтобы не терялась при смене размера окна).
function placeFab(btn) {
    const pos = settings().fabPos || { x: 0.92, y: 0.7 };
    const w = btn.offsetWidth || 52;
    const h = btn.offsetHeight || 52;
    const x = Math.min(Math.max(pos.x * window.innerWidth - w / 2, 4), window.innerWidth - w - 4);
    const y = Math.min(Math.max(pos.y * window.innerHeight - h / 2, 4), window.innerHeight - h - 4);
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
}

// Кнопка живёт прямо на странице (не в изолированном слое): так её видят и умеют копировать
// расширения-«папки» вроде STFolder, которые собирают плавающие кнопки в одну.
// Стили у неё в style.css и привязаны к id — темы таверны их не перебивают.
function addFab() {
    let btn = document.getElementById('iw_fab');
    const s = settings();
    if (!s.fab) {
        if (btn) btn.remove();
        return;
    }
    if (btn) return;
    btn = document.createElement('button');
    btn.id = 'iw_fab';
    btn.type = 'button';
    btn.title = 'Внутренний мир (можно перетащить)';
    btn.setAttribute('aria-label', 'Внутренний мир');
    btn.innerHTML = renderFab();
    document.body.appendChild(btn);
    setFabTheme(btn);
    placeFab(btn);

    // Перетаскивание: двигаем через transform раз в кадр — на телефоне так не лагает;
    // настоящие left/top выставляем один раз, когда палец отпустили.
    let drag = null;
    let frame = 0;
    let lastToggle = 0;
    const paint = () => {
        frame = 0;
        if (!drag) return;
        btn.style.transform = `translate3d(${drag.x - drag.bx}px, ${drag.y - drag.by}px, 0)`;
    };
    btn.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: btn.offsetLeft, by: btn.offsetTop, x: btn.offsetLeft, y: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight, moved: false };
        btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        if (!drag.moved) btn.classList.add('iw-dragging');
        drag.moved = true;
        drag.x = Math.min(Math.max(drag.bx + dx, 4), window.innerWidth - drag.w - 4);
        drag.y = Math.min(Math.max(drag.by + dy, 4), window.innerHeight - drag.h - 4);
        if (!frame) frame = requestAnimationFrame(paint);
    });
    const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const moved = drag.moved;
        const fin = drag;
        drag = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        btn.classList.remove('iw-dragging');
        if (moved) {
            lastToggle = Date.now(); // после перетаскивания браузер шлёт click — его не считаем нажатием
            btn.style.transform = '';
            btn.style.left = `${fin.x}px`;
            btn.style.top = `${fin.y}px`;
            settings().fabPos = {
                x: (btn.offsetLeft + btn.offsetWidth / 2) / window.innerWidth,
                y: (btn.offsetTop + btn.offsetHeight / 2) / window.innerHeight,
            };
            saveSettings();
        } else if (e.type === 'pointerup') {
            lastToggle = Date.now();
            togglePanel();
        }
    };
    // Нажатие, пересланное без pointer-событий (например, из папки другого расширения), — только click.
    btn.addEventListener('click', () => {
        if (Date.now() - lastToggle < 400) return;
        lastToggle = Date.now();
        togglePanel();
    });
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    // Enter и пробел на <button> сами дают click — отдельный обработчик клавиш не нужен.
    window.addEventListener('resize', () => {
        const b = document.getElementById('iw_fab');
        if (b) placeFab(b);
    });
}

// Точка на кнопке: что-то случилось, а дневник закрыт.
function markFab(on) {
    const dot = document.querySelector('#iw_fab .iw-fab-dot');
    if (dot) dot.hidden = !on;
}

function addButtons() {
    addFab();
    const menu = document.getElementById('extensionsMenu');
    if (menu && !document.getElementById('iw_menu_item')) {
        const item = document.createElement('div');
        item.id = 'iw_menu_item';
        item.className = 'list-group-item flex-container flexGap5 interactable';
        item.tabIndex = 0;
        item.innerHTML = '<div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div>Внутренний мир';
        item.addEventListener('click', openPanel);
        menu.appendChild(item);
    }
    syncMenuItem();
}

// Пункт в меню расширений (волшебная палочка у поля ввода) — только когда плавающая кнопка выключена.
function syncMenuItem() {
    const item = document.getElementById('iw_menu_item');
    if (item) item.style.display = settings().fab ? 'none' : '';
}

function profileList() {
    const c = ctx();
    try {
        const list = c.ConnectionManagerRequestService ? c.ConnectionManagerRequestService.getSupportedProfiles() : [];
        return list.map(p => [p.id, p.name]);
    } catch {
        return [];
    }
}

// Какие разделы формы раскрыты — запоминаем, чтобы после перерисовки (проверка подключения,
// выбор модели) ничего не схлопывалось.
const sectionOpen = { st: {}, diary: {} };

function rememberSection(variant, el) {
    if (el && el.matches && el.matches('details[data-iw-sec]')) sectionOpen[variant][el.dataset.iwSec] = el.open;
}

let apiStatus = '';
let worldNames = [];

async function loadWorldNames() {
    try {
        const wi = await import('/scripts/world-info.js');
        worldNames = Array.isArray(wi.world_names) ? wi.world_names.slice() : [];
    } catch {
        worldNames = [];
    }
    await loadLinkedBooks();
}

// Отмеченные галочками лорбуки — свои у каждого чата. Пока ничего не отмечали — те, что уже изучались.
function pickedBooks() {
    if (!hasChat()) return [];
    const meta = chatMeta();
    if (Array.isArray(meta.books)) return meta.books.filter(b => worldNames.includes(b));
    return studiedBooks();
}

function togglePickedBook(name) {
    const meta = chatMeta();
    const list = new Set(pickedBooks());
    if (list.has(name)) list.delete(name);
    else list.add(name);
    meta.books = [...list];
    ctx().saveMetadataDebounced?.();
    return list.has(name);
}

// Лорбуки, которые привязаны к персонажу, чату или персоне: отмечены сами, но их можно снять галочкой.
let linkedBooks = [];

async function loadLinkedBooks() {
    const c = ctx();
    const out = new Map();
    try {
        const ch = c.characters && c.characters[c.characterId];
        const charBook = ch && ch.data && ch.data.extensions && ch.data.extensions.world;
        if (charBook) out.set(charBook, 'char');
        const wi = await import('/scripts/world-info.js');
        const extra = wi.world_info && wi.world_info.charLore && ch && wi.world_info.charLore.find(e => e.name === String(ch.avatar).replace(/\.[^.]+$/, ''));
        for (const b of (extra && extra.extraBooks) || []) if (!out.has(b)) out.set(b, 'char');
        if (c.chatMetadata && c.chatMetadata.world_info && !out.has(c.chatMetadata.world_info)) out.set(c.chatMetadata.world_info, 'chat');
        const personaBook = c.powerUserSettings && c.powerUserSettings.persona_description_lorebook;
        if (personaBook && !out.has(personaBook)) out.set(personaBook, 'persona');
    } catch { /* без привязанных */ }
    linkedBooks = [...out].map(([name, from]) => ({ name, from }));
}

// Что из «отмеченного само» игрок снял в этом чате: '__card', '__persona' или имя привязанного лорбука.
function offBooks() {
    if (!hasChat()) return [];
    const off = chatMeta().off;
    return Array.isArray(off) ? off : [];
}

function toggleOffBook(key) {
    const meta = chatMeta();
    const list = new Set(offBooks());
    if (list.has(key)) list.delete(key);
    else list.add(key);
    meta.off = [...list];
    ctx().saveMetadataDebounced?.();
    return !list.has(key); // true — снова отмечено
}

function studiedBooks() {
    const r = settings().rosters[rosterKey()];
    return (r && r.books) || [];
}

function settingsFormHtml(variant) {
    const s = settings();
    const booksHtml = variant === 'diary' && hasChat()
        ? renderBooksField({ books: worldNames, picked: pickedBooks(), linked: linkedBooks, off: offBooks(), busy: busy || rosterBusy, hasPersona: s.persona !== false })
        : '';
    let forgetHtml = '';
    if (variant === 'diary' && hasChat()) {
        const st = currentState();
        forgetHtml = (st.order || []).filter(k => st.characters[k]).map(k => `<button type="button" class="iw-btn iw-forget-chip" data-iw-forget="${esc(k)}" title="Забыть ${esc(st.characters[k].name)}">${esc(st.characters[k].name)} <span aria-hidden="true">×</span></button>`).join('');
        const ign = ignoredNames();
        if (ign.length) forgetHtml += `<div class="iw-forget-ignored"><span class="iw-muted">Забыты навсегда:</span> ${ign.map(n => `<button type="button" class="iw-btn iw-forget-chip iw-unignore" data-iw-unignore="${esc(n)}" title="Вернуть: дневник снова будет замечать ${esc(n)}">${esc(n)} <span aria-hidden="true">↺</span></button>`).join('')}</div>`;
    }
    return renderSettingsForm(s, { variant, profiles: profileList(), apiStatus, books: worldNames, studied: studiedBooks(), open: sectionOpen[variant], booksHtml, forgetHtml, version: VERSION, updated: UPDATED });
}

function refreshForms() {
    syncSettingsForm();
    if (view === 'settings') renderPanelNow();
}

// Блок в панели расширений таверны.
function settingsHtml() {
    return `
<div class="iw-settings">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>Внутренний мир</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="iw-settings-intro">
        <span>Дневник персонажей: настроение, желания, страхи, мечта, черты и отношение к тебе.</span>
        <button type="button" class="menu_button" id="iw_set_open"><i class="fa-solid fa-book-open"></i> Открыть дневник</button>
      </div>
      <div class="iw-settings-form">${settingsFormHtml('st')}</div>
    </div>
  </div>
</div>`;
}

function syncSettingsForm() {
    const holder = document.querySelector('.iw-settings-form');
    if (!holder) return;
    holder.innerHTML = settingsFormHtml('st');
}

// Быстрые настройки на пустом дневнике: запас на ответ, сколько читать, какая модель.
const QUICK_KEYS = { budgetMode: ['auto', 'fixed'], budgetCap: null, responseLength: null, contextMessages: null, catchUpMessages: null, source: ['main', 'custom'] };
function onQuickSetting(spec) {
    const i = spec.indexOf(':');
    const key = spec.slice(0, i);
    const raw = spec.slice(i + 1);
    if (!(key in QUICK_KEYS)) return;
    const allowed = QUICK_KEYS[key];
    if (allowed && !allowed.includes(raw)) return;
    const value = allowed ? raw : Number(raw);
    if (!allowed && !(value > 0)) return;
    const s = settings();
    s[key] = value;
    saveSettings();
    syncSettingsForm();
    if (key === 'source' && value === 'custom') return openSettingsAt('connect');
    renderPanelNow();
}

function openSettingsAt(section) {
    sectionOpen.diary[section] = true;
    view = 'settings';
    openPanel();
    renderPanelNow();
}

// Общий обработчик изменений — и для таверны, и для дневника.
async function onSettingsChanged(el) {
    const s = settings();
    const before = `${s.apiKind}|${s.apiEndpoint}`;
    if (!applySettingChange(s, el)) return false;
    if (el.dataset.iwSet === 'volume') {
        setVolume(s.volume);
        if (s.sound !== false) playSound('want_done', currentTheme);
    }
    if (`${s.apiKind}|${s.apiEndpoint}` !== before) {
        s.apiModels = [];
        s.apiModel = '';
        apiStatus = '';
    }
    saveSettings();
    refreshTheme();
    addFab();
    syncMenuItem();
    updateInjection();
    syncSettingsForm();
    renderAll();
    return true;
}

async function onSettingsAction(action, el) {
    const s = settings();
    if (action === 'loadModels') {
        apiStatus = 'Загружаю список моделей…';
        refreshForms();
        try {
            if (s.apiKind !== 'gemini' && s.apiKind !== 'openrouter' && !s.apiEndpoint) throw new Error('сначала укажи адрес API');
            if (!s.apiKey && s.apiKind !== 'openai') throw new Error('сначала вставь ключ');
            s.apiModels = await fetchModels(s);
            if (!s.apiModel && s.apiModels.length) s.apiModel = s.apiModels[0];
            saveSettings();
            apiStatus = `Моделей найдено: ${s.apiModels.length}. Выбери нужную в списке.`;
        } catch (err) {
            apiStatus = 'Не загрузилось: ' + (err && err.message ? err.message : err);
        }
        return refreshForms();
    }
    if (action === 'testApi') {
        apiStatus = 'Проверяю…';
        refreshForms();
        try {
            const text = await callModel('Ответь одним словом.', 'Скажи «работает».', withBudget('test'));
            apiStatus = `✓ Работает. Модель ответила: «${String(text).trim().slice(0, 60)}»`;
        } catch (err) {
            apiStatus = '✗ Не работает: ' + (err && err.message ? err.message : err);
        }
        return refreshForms();
    }
    if (action === 'studyBook') {
        const form = el && el.closest('.iw-form');
        const sel = form && form.querySelector('select[data-iw-book]');
        const book = sel ? sel.value : '';
        if (!busy && settings().sound !== false) playSound('write', currentTheme);
        await studyLore({ mode: 'lore', book });
        return;
    }
    if (action === 'study') {
        await studyLore({ mode: 'lore' });
        openPanel();
    } else if (action === 'reset') {
        await resetChat();
    } else if (action === 'resetSettings') {
        await resetAllSettings();
    }
}

function addSettings() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.querySelector('.iw-settings')) return;
    host.insertAdjacentHTML('beforeend', settingsHtml());
    const root = host.querySelector('.iw-settings');
    root.addEventListener('change', e => onSettingsChanged(e.target));
    root.addEventListener('input', onPanelInput);
    root.addEventListener('toggle', e => rememberSection('st', e.target), true);
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-iw-action]');
        if (b) onSettingsAction(b.dataset.iwAction, b);
        const l = e.target.closest('[data-iw-lang]');
        if (l) setLanguage(l.dataset.iwLang);
    });
    root.querySelector('#iw_set_open').addEventListener('click', openPanel);
}

// Все настройки — к начальным, как при установке. Записи дневников живут в чатах и не трогаются;
// изученные лорбуки и найденные НПС (rosters) — тоже записи, их оставляем.
async function resetAllSettings() {
    const c = ctx();
    const ok = await iwDialog({ title: 'Сбросить все настройки?', text: 'Тема, звуки, подключение и ключ API вернутся как были при установке. Записи дневников в чатах останутся.', buttons: [{ text: 'Сбросить', value: true, kind: 'danger' }, { text: 'Отмена', value: null }] });
    if (!ok) return;
    const old = settings();
    const fresh = mergeSettings({});
    fresh.rosters = old.rosters || {}; // изученные лорбуки и НПС — это записи, а не настройки
    for (const k of Object.keys(old)) delete old[k];
    Object.assign(old, fresh);
    saveSettings();
    refreshTheme();
    addFab();
    syncMenuItem();
    setVolume(old.volume ?? 45);
    status = 'Настройки сброшены';
    syncSettingsForm();
    updateInjection();
    renderAll();
}

async function resetChat() {
    const c = ctx();
    if (!c.chat || !c.chat.length) return;
    const ok = await iwDialog({ title: 'Очистить дневник этого чата?', text: 'Все записи о персонажах пропадут, сообщения чата не пострадают. Календарь останется.', buttons: [{ text: 'Очистить', value: true, kind: 'danger' }, { text: 'Отмена', value: null }] });
    if (!ok) return;
    for (const m of c.chat) {
        if (m && m.extra) delete m.extra[META_KEY];
        for (const sw of (m && m.swipe_info) || []) if (sw && sw.extra) delete sw.extra[META_KEY];
    }
    c.chatMetadata[META_KEY] = { base: null, counter: 0, calendar: (c.chatMetadata[META_KEY] || {}).calendar };
    await c.saveChat();
    c.saveMetadataDebounced?.();
    view = '';
    status = 'Дневник очищен';
    updateInjection();
    renderAll();
}

function registerCommands() {
    try {
        const { SlashCommandParser, SlashCommand } = ctx();
        if (!SlashCommandParser || !SlashCommand) return;
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'innerworld',
            callback: async () => { await openPanel(); return ''; },
            helpString: 'Открыть дневник «Внутренний мир».',
        }));
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'innerworld-update',
            callback: async () => {
                const id = lastBotMessageId();
                if (id >= 0) await analyze(id, { manual: true });
                return '';
            },
            helpString: 'Обновить «Внутренний мир» по последнему ответу.',
        }));
        const timeCmd = {
            callback: async (_args, value) => {
                const now = clockNow();
                if (!now || !now.cal) { notice('Часы сцены ещё не заведены: открой дневник и поставь время.'); return ''; }
                const arg = String(value || '').trim();
                if (!arg) return now.t ? `${fmtDate(now.cal, now.t)}, ${fmtTime(now.t)}` : '';
                const nt = parseClockCommand(now.cal, now.t, arg);
                if (!nt) { notice('Не поняла время. Примеры: +2ч, +3д, 14:30, 1996-10-08, утро.'); return ''; }
                setClockManual(nt);
                return `${fmtDate(now.cal, nt)}, ${fmtTime(nt)}`;
            },
            helpString: 'Часы сцены «Внутреннего мира»: /время +2ч, /время +3д, /время 14:30, /время 1996-10-08, /время утро. Без аргумента — показать время.',
        };
        SlashCommandParser.addCommandObject(SlashCommand.fromProps(Object.assign({ name: 'время', aliases: ['iw-time'] }, timeCmd)));
    } catch (e) {
        console.warn('[Внутренний мир] команды не добавлены', e);
    }
}

async function onChatChanged() {
    view = '';
    status = '';
    clockMonth = null;
    clockOpen = false;
    clockSetOpen = false;
    clockDraft = null;
    await loadWorldNames();
    syncSettingsForm();
    refreshTheme();
    updateInjection();
    renderAll();
}

function init() {
    const c = ctx();
    const ev = c.eventTypes || c.event_types;
    settings();
    addButtons();
    addSettings();
    registerCommands();
    c.eventSource.on(ev.MESSAGE_RECEIVED, onMessageReceived);
    c.eventSource.on(ev.GENERATION_STARTED, onGenerationStarted);
    c.eventSource.on(ev.CHAT_CHANGED, onChatChanged);
    c.eventSource.on(ev.MESSAGE_SWIPED, () => { updateInjection(); renderAll(); });
    c.eventSource.on(ev.MESSAGE_DELETED, () => { updateInjection(); renderAll(); });
    document.querySelectorAll('#chat .iw-badge').forEach(b => b.remove());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closePanel(); });
    onChatChanged();
}

jQuery(() => {
    try {
        init();
    } catch (e) {
        console.error('[Внутренний мир] не запустилось', e);
    }
});
