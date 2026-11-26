// «Внутренний мир» — желания, страхи, настроение, мечта, черты и первое впечатление персонажей.
import {
    MODULES, MODEL_MODULES, MODULE_NAMES, normText, mergeSettings, emptyState, parseAnalysis, applyAnalysis, sameName, decayState,
    buildSystemPrompt, buildUserPrompt, buildInjection, buildAttrInjection, cleanMessageText, mentioned,
    emptyRoster, parseRoster, rosterFind, rosterMentioned, rosterNames, isMain, namesMatch, namesLookAlike, buildRosterPrompt, loreText,
    prepText, mentionedIn, catchUpTokens, CATCHUP_MSG_CHARS, CATCHUP_EXCERPTS, verifyAliases,
    mergeRoster, buildDreamPrompt, parseDream, buildRewardsPrompt, parseRewards, buyReward, carryOwnEdits, restoreTrait, responseBudget, classifyError, looksCut, includeBodyWithThinking,
    extractJson, nameScript, parseBorn, zodiacOf, bornText, ZODIAC, ZODIAC_MID, zodiacOn, zodiacMidOn,
    plural,
    purseOf, claimWant,
    cancelReward,
    loveToAttitude, loveFor, npcWeight, cleanWeather, cleanNightDream, cleanNightDreams, cleanRumor, bornFromText,
    eventTitle, signed, WEIGHT_NAMES, moodFaces, CHEM_NOW_NAMES, relStatus, seedRel, genderOf, gw,
    orientFromText, textAbout,
    achGate, cleanArt, buildArtPrompt, ACH_RATE_NAMES, buildWishesPrompt, parseWishes, buildAttractionPrompt, parseAttraction,
    toastAllowed, rumorPlain, RUMOR_FORM_NAMES, buildBuyInjection, cleanMeme, memePlain, MEME_FORMAT_NAMES, buildMemePrompt, TOKENS_MIN, TOKENS_MAX,
} from './src/core.js';
import { generateImage, findImageExtensions, describeImageExtension } from './src/imagegen.js';
import { cleanAchievement, addAchievement } from './src/showcase.js';
import {
    normCalendar, normTime, advance, findStamp, stampToTime, addMinutes, atHour, toMinutes, fmtDate, fmtTime, fmtSpan, partOfDay, seasonOf,
    upcoming, monthGrid, monthMarks, shiftMonth, monthName, monthCount, monthDays, clockInjection, buildCalendarPrompt, parseCalendarAnswer, sceneTimeFix,
    parseClockCommand, CALENDAR_TYPES, MONTHS_RU, dayIndex, plainForClock,
} from './src/clock.js';
import { playSound, setVolume, setSilentMode } from './src/sound.js';
import { THEMES, THEME_IDS, validTheme, themeFontUrls, themeParts, icon as iconHtml } from './src/themes.js';
import { lifeText as lifeTextIb } from './src/core.js';
import { renderPanel, renderToast, renderGroupToast, renderInfobarHtml, ibShortName, renderErrorToast, renderFab, renderBooksField, setSignInfo, esc, orderOfBlocks } from './src/render.js';
import { renderSettingsForm, applySettingChange, rangeLabel, IMG_STATUS } from './src/settings-ui.js';
import { chatRequest, fetchModels, missingFields } from './src/api.js';

const VERSION = '0.7.4';
const UPDATED = '26.11.2026'; // дата последнего обновления — видна внизу дневника и настроек
setSignInfo(VERSION, UPDATED);
const UI_CSS = new URL('./ui.css', import.meta.url).href;

const SETTINGS_KEY = 'innerWorld';
const META_KEY = 'inner_world';
const PROMPT_KEY = 'inner_world';
const ATTR_PROMPT_KEY = 'inner_world_attraction';
const CLOCK_PROMPT_KEY = 'inner_world_clock';
const BUY_PROMPT_KEY = 'inner_world_shop';
const CLOCK_KEY = 'inner_world_clock';
const KEEP_SNAPSHOTS = 12;
const ROSTER_V = 2;        // 2 — в списке НПС есть знакомства по предыстории (knows_main / knows_player)
const SKIP_TYPES = ['first_message', 'command', 'extension', 'impersonate', 'quiet'];

let busy = false;
let busyKind = '';         // какая кнопка разбора сейчас крутится: chat | lore | all
let dreamBusy = false;
let wishBusy = '';   // кому сейчас придумываются новые желания и страхи
const histOpen = {}; // раскрыты ли «прошлые сны / слухи»
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
let currentDark = false; // тёмный вариант темы («ночь»): та же тема + класс iw-dark
// классы темы для всех окон дневника
const themeCls = () => `iw-theme-${currentTheme}${currentDark ? " iw-dark" : ""}`;
// Часы сцены: какой месяц открыт в календаре, раскрыт ли листок часов, идёт ли определение календаря.
let clockMonth = null;
let clockOpen = false;
let clockBusy = false;
let clockSetOpen = false;
let clockDraft = null;     // выбранные в листке дата и время — применяются только кнопкой «Поставить»
let clockHolMonth = 0;     // месяц для нового праздника
let clockAddOpen = false;  // открыта ли форма «своя дата»
// ключ даты в списке: чтобы убрать её из «Праздники и личные даты»
const evKey = e => [e.kind || '', e.who || '', e.name || '', e.m || 0, e.d || 0, e.months ? 'm' : (e.years ? 'y' : '')].join('|');
let clockCalOpen = false;
let clockEvOpen = false;
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

// Если при изучении лорбука модель не вернула, кем НПС приходится героям («knows_player» / «knows_main»),
// достаём это из «кто это»: «бывший жених Евы» → для Евы «бывший жених», «лучший друг Виктора» → для Виктора «лучший друг».
const REL_TAIL = /\s(с|у|от|для|к|о|об|про|через|возле|рядом|около|при|из|на|в|по)$/i;
function relFromWho(who, name) {
    const first = String(name || '').trim().split(/\s+/)[0] || '';
    if (first.length < 3 || !who) return '';
    const stem = first.replace(/[аяьй]$/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|[,;(]\\s*)([^,;()«»"]{2,48}?)\\s+${stem}[а-яё]{0,3}(?=$|[\\s,;.)!?])`, 'i');
    const m = String(who).match(re);
    if (!m) return '';
    const rel = m[1].trim().toLowerCase();
    if (rel.split(/\s+/).length > 5 || REL_TAIL.test(rel)) return '';
    return rel.slice(0, 40);
}
function guessRel(e) {
    if (!e || e.rel || e.relUser) return;
    const c = ctx();
    const u = relFromWho(e.who, c.name1);
    const m = relFromWho(e.who, c.name2);
    if (u) e.relUser = u;
    if (m) e.rel = m;
}

function roster() {
    const key = rosterKey();
    const r = (key && settings().rosters[key]) || emptyRoster();
    for (const e of r.npc || []) guessRel(e);
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
    // мультибот: главные — те, кого выбрала игрок (или кого назвал разбор карточки); сама карточка — рассказчик
    if (r.multi && !c.groupId) {
        const picked = Array.isArray(r.pickedMain) ? r.pickedMain : (r.main || []);
        const outM = [];
        for (const n of picked) if (n && !sameName(n, c.name1) && !outM.some(x => namesMatch(x, n) || namesLookAlike(x, n))) outM.push(n);
        if (outM.length) return outM;
    }
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

// Сколько НПС вести в дневнике (выбирается в первой настройке). 99 — все.
function npcCap() {
    const v = Number(settings().npcLimit);
    return v > 0 && v < 99 ? v : Infinity;
}
const rosterWeight = e => npcWeight(null, e) + (e && e.relUser ? 4 : 0);

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
async function studyLore({ mode = 'lore', book = '', keepLive = false } = {}) {
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
            const { system, user } = buildRosterPrompt(sources, c.name1, settings().language, { multi: !!(settings().rosters[key] && settings().rosters[key].multi) });
            const rAsk = withBudget('roster');
            if (live) live.est = tokenEstimate(system, user, rAsk.responseLength);
            liveStage('think');
            const raw = await callModel(system, user, rAsk, text => {
                if (live && text && live.stage !== 'write') liveStage('write');
                if (live) live.len = text.length;
            });
            const fresh = verifyAliases(parseRoster(raw, c.name1), sources.map(x => x.text).join('\n'));
            const old = settings().rosters[key];
            const merged = old && old.at ? mergeRoster(old, fresh) : { main: fresh.main, npc: fresh.npc };
            const books = new Set((old && old.books) || []);
            if (book) books.add(book);
            settings().rosters[key] = Object.assign({ main: merged.main, npc: merged.npc, at: Date.now(), books: [...books], v: ROSTER_V },
                // выбор «мультибот» и главных героев переживает повторный разбор карточки
                old && old.multi ? { multi: true, pickedMain: old.pickedMain, picked: old.picked } : {});
            saveSettings();
            rememberKnowledge(sources);
            status = `Знаю персонажей мира: ${merged.npc.length}`;
            historyCache.key = '';
        }
    } catch (err) {
        if ((err && err.cancelled) || my !== runId) return;
        console.error('[Внутренний мир]', err);
        const info = classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw), thinking: settings().thinking });
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
        await analyze(last, { manual: true, fromLore: sources.map(x => `[${x.title}]\n${x.text}`), kind: mode === 'all' ? 'all' : 'lore', keepLive: true });
    }
    if (my !== runId) return;
    chatMeta().fp = Object.assign({}, chatMeta().fp, { lore: loreFp });
    ctx().saveMetadataDebounced?.();
    if (!keepLive) setLive(null);
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

// То же состояние, но только для чтения и без копии: инфоблок под каждым ответом перерисовывается часто,
// и полная копия дневника на каждое сообщение заметно тормозила длинные чаты. Ничего в нём не меняем!
function peekState(beforeId) {
    const h = findHolder(beforeId);
    const st = h.state || emptyState();
    return st.order ? st : { ...st, order: Object.keys(st.characters || {}) };
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
    // время прямо не названо — шаг по смыслу сцены; разбор потом может его поправить (scene_time)
    const res = advance(cal, cur, texts, { step: 'auto' });
    if (!res || !res.t) return;
    writeClock(messageId, { t: res.t, prev: cur, why: res.why, size: cur ? toMinutes(cal, res.t) - toMinutes(cal, cur) : 0 });
    ctx().saveMetadataDebounced?.();
}

// Для календаря и возраста: главные персонажи и персона первыми.
function clockPeople(state) {
    // умерших не считаем: у них нет ни дня рождения в календаре, ни возраста «сейчас»
    const list = Object.entries((state && state.characters) || {}).filter(([, c]) => c && (c.born || c.ageAt || c.metOn) && c.dead !== true);
    const mains = new Set(splitCast(state || emptyState()).mains);
    list.sort((a, b) => (mains.has(b[0]) || b[1].persona ? 1 : 0) - (mains.has(a[0]) || a[1].persona ? 1 : 0));
    // «месяц / год со дня знакомства» — только между главными героями и твоим героем, у НПС не отмечаем
    return list.map(([k, c]) => ({ name: c.name, born: c.born, ageAt: c.ageAt, met: mains.has(k) ? c.metOn : undefined }));
}

// День знакомства с героем: ставим дату сцены, когда у персонажа впервые появилось впечатление
// (кроме тех, кто знаком давно — у них знакомство было до истории).
function pinMeetings(state, messageId) {
    const now = clockNow(messageId + 1);
    if (!now || !now.cal || !now.t || now.cal.type === 'days') return;
    for (const c of Object.values(state.characters || {})) {
        if (!c || c.persona || c.metOn || !c.impression || c.impression.known) continue;
        if (c.met === false) continue;
        c.metOn = { y: now.t.y, m: now.t.m, d: now.t.d };
    }
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
    if (s.clock === false) return '';
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
    // последние сообщения: если дата прямо названа там, часы встают на неё даже при большом скачке
    const chat = ctx().chat || [];
    const recent = [];
    for (let i = messageId, k = 0; i >= 0 && k < 6; i--) {
        const m = chat[i];
        if (!m || m.is_system || !m.mes) continue;
        recent.push(m.mes);
        k++;
    }
    const t = sceneTimeFix(now.cal, now.t, st, recent.join('\n'));
    if (!t) return;
    const prev = own ? own.prev : now.t;
    writeClock(messageId, { t, prev, why: 'model', size: prev ? toMinutes(now.cal, t) - toMinutes(now.cal, prev) : 0 });
}

// Один раз на чат: модель смотрит карточку, лорбук и сообщения и говорит, какой тут календарь и который час.
// Дата из чата: самая свежая отметка с датой в последних сообщениях (сколько читает разбор, но не меньше 6).
// Это главный источник «сейчас»: важнее карточки и лорбука.
function chatStampTime(cal, { first = false } = {}) {
    const chat = ctx().chat || [];
    const c0 = cal || normCalendar({ type: 'greg' });
    const n = Math.max(6, Number(settings().contextMessages) || 6);
    const at = i => {
        const m = chat[i];
        if (!m || m.is_system || !m.mes) return null;
        const st = findStamp(m.mes, c0);
        if (!st || !st.date) return null;
        const t = stampToTime(c0, null, st);
        return t ? { index: i, t } : null;
    };
    for (let i = chat.length - 1, k = 0; i >= 0 && k < n; i--) {
        const m = chat[i];
        if (!m || m.is_system || !m.mes) continue;
        k++;
        const r = at(i);
        if (r) return r;
    }
    // при первой настройке — ещё и первое сообщение (вступление часто начинается с даты)
    if (first) {
        const f = chat.findIndex(m => m && !m.is_system && m.mes);
        if (f >= 0) return at(f);
    }
    return null;
}

// Перед разбором: если в чате есть свежая дата, а часы показывают другое — ставим часы по чату.
// Время, которое дневник взял из карточки/лорбука или угадал, всегда уступает дате из чата.
function syncClockFromChat() {
    if (settings().clock === false || !hasChat()) return;
    const cal = calendarOf();
    if (!cal || cal.type === 'days') return;
    const fc = chatStampTime(cal);
    if (!fc) return;
    const now = clockNow();
    const chat = ctx().chat || [];
    const last = chat.length - 1;
    if (last < 0) return;
    const rec = now && now.h && now.h.rec;
    const recIdx = now && now.h ? now.h.index : -1;
    const weak = !rec || rec.why === 'detect' || rec.why === 'base';
    const same = now && now.t && toMinutes(cal, now.t) === toMinutes(cal, fc.t);
    if (same) return;
    if (!now || !now.t || weak || fc.index >= recIdx) {
        writeClock(last, { t: fc.t, prev: (now && now.t) || null, why: 'stamp', size: 0 });
        chatMeta().timeSet = true;
        ctx().saveMetadataDebounced?.();
    }
}

// Календаря нет — или он собран только по метке времени в сообщении (без страны и праздников): спросить модель один раз
function calendarNeedsModel() {
    const m = chatMeta();
    // время так и не встало — пробуем ещё пару раз на следующих разборах
    if (!m.calendar) return !m.calendarTried || (!m.timeSet && (m.calendarTries || 0) < 3);
    return m.calendar.source === 'stamp' && !m.calendarUp;
}
function markCalendarTried() {
    const m = chatMeta();
    m.calendarTries = (m.calendarTries || 0) + 1;
    if (m.calendar) m.calendarUp = true;
    else m.calendarTried = true;
}

async function detectCalendar({ manual = false, onlyCalendar = false } = {}) {
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
        const pre = chatStampTime(null, { first: true });
        const chatDate = pre ? `${String(pre.t.d).padStart(2, '0')}.${String(pre.t.m).padStart(2, '0')}.${pre.t.y}${pre.t.h !== undefined ? `, ${String(pre.t.h).padStart(2, '0')}:${String(pre.t.mi).padStart(2, '0')}` : ''}` : '';
        const { system, user } = buildCalendarPrompt({ botName: c.name2, userName: c.name1, card: cardText(c), persona: personaText(c), lore, messages: msgs, chatDate }, settings().language || 'русском');
        const raw = await callModel(system, user, withBudget('rewards'));
        const ans = parseCalendarAnswer(extractJson(raw));
        const meta = chatMeta();
        const before = findClock();
        meta.calendar = ans.calendar;
        // время: дата из чата — главнее всего; если часы уже идут (первый разбор был) — карточка и лорбук их не перебивают;
        // и только в новом чате без даты в сообщениях берём то, что модель нашла в карточке и лорбуке
        const last = chat.length - 1;
        const fromChat = onlyCalendar ? null : chatStampTime(calendarOf(), { first: !before.t });
        if (onlyCalendar && before.t) {
            // календарь уточнили (праздники, страна) — часы не трогаем
        } else if (fromChat && last >= 0) {
            writeClock(last, { t: fromChat.t, prev: before.t || null, why: 'stamp', size: 0 });
            meta.timeSet = true;
        } else if (before.t && (meta.timeSet || before.rec)) {
            // часы уже стоят — не трогаем
        } else if (ans.now) {
            if (last >= 0) writeClock(last, { t: ans.now, prev: before.t || null, why: 'detect', size: 0 });
            else meta.clockBase = ans.now;
            meta.timeSet = true;
        }
        clockMonth = null;
        ctx().saveMetadataDebounced?.();
        await c.saveChat?.();
        if (manual) notice(`Календарь: ${CALENDAR_TYPES[ans.calendar.type]}${ans.calendar.name ? ` «${ans.calendar.name}»` : ''}`);
    } catch (err) {
        if (err && err.cancelled) return;
        console.warn('[Внутренний мир] календарь не определился', err);
        if (manual) showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw), thinking: settings().thinking }), { manual: true, what: 'календарь' });
    } finally {
        clockBusy = false;
        updateInjection();
        renderAll();
    }
}

// Погода и время года для полоски часов. Погода устаревает через день по часам сцены.
const WX_ICON = { 'ясно': 'wx_sun', 'жара': 'wx_sun', 'облачно': 'wx_cloud', 'пасмурно': 'wx_cloud', 'дождь': 'wx_rain', 'ливень': 'wx_rain', 'гроза': 'wx_storm', 'снег': 'wx_snow', 'метель': 'wx_snow', 'мороз': 'wx_snow', 'туман': 'wx_fog', 'ветер': 'wx_wind' };
function weatherChip(cal, t, w) {
    if (settings().weather === false) return null;
    const season = seasonOf(cal, t);
    let fresh = w;
    if (w && w.day && cal.type !== 'days' && w.day.y !== undefined) {
        const a = Date.UTC(w.day.y, (w.day.m || 1) - 1, w.day.d || 1), b = Date.UTC(t.y, (t.m || 1) - 1, t.d || 1);
        if (cal.type === 'greg' && Math.abs(b - a) > 36 * 3600e3) fresh = null;
        if (cal.type !== 'greg' && (w.day.y !== t.y || w.day.m !== t.m || Math.abs((w.day.d || 0) - t.d) > 1)) fresh = null;
    }
    if (!fresh && !season) return null;
    const temp = fresh && fresh.temp !== null && fresh.temp !== undefined ? `${fresh.temp > 0 ? '+' : ''}${fresh.temp}°` : '';
    const text = [fresh ? [temp, fresh.sky].filter(Boolean).join(' ') : '', season].filter(Boolean).join(' · ');
    return { icon: (fresh && WX_ICON[fresh.sky]) || ({ 'зима': 'wx_snow', 'весна': 'wx_sprout', 'лето': 'wx_sun', 'осень': 'wx_leaf' }[season] || 'wx_cloud'), text, title: fresh && fresh.note ? fresh.note : '' };
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
    const hidden = new Set(meta.evHidden || []);
    const ev = upcoming(cal, t, people, cal.type === 'custom' ? Math.max(366, cal.months.reduce((x, m) => x + m.days, 0)) : 366)
        .filter(e => !hidden.has(evKey(e)))
        .map(e => Object.assign(e, { key: evKey(e), dateText: evDateText(cal, e), inDaysText: e.inDays >= 45 ? fmtSpan(e.inDays * 1440) : `${e.inDays} ${daysWord(e.inDays)}` }));
    const draft = normTime(cal, clockDraft || t);
    let grid = null;
    if (cal.type !== 'days') {
        const vm = clockMonth || { y: draft.y, m: draft.m };
        grid = monthGrid(cal, vm.y, vm.m, monthMarks(cal, vm.y, vm.m, people));
    }
    const holDate = h => (h.len && !h.rule ? evDateText(cal, { m: h.m, d: h.d, y: t.y, len: h.len }) : null) || (h.rule
        ? ({ easter_o: 'Пасха (правосл.)', easter_w: 'Пасха' }[h.rule] ? `${h.offset ? `${h.offset > 0 ? '+' : ''}${h.offset} дн. от Пасхи` : 'по Пасхе'}` : 'плавающая дата')
        : `${h.d} ${monthName(cal, h.m, true)}`);
    return {
        cal, t, draft,
        draftChanged: toMinutes(cal, draft) !== toMinutes(cal, t),
        draftDate: fmtDate(cal, draft),
        draftPart: partOfDay(draft.h),
        time: fmtTime(t),
        part: partOfDay(t.h),
        date: fmtDate(cal, t),
        wx: weatherChip(cal, t, meta.weather),
        today: ev.filter(e => e.inDays === 0),
        upcoming: ev,
        grid,
        locked: !!meta.clockLocked,
        busy: clockBusy,
        open: clockOpen,
        calOpen: clockCalOpen,
        evOpen: clockEvOpen,
        typeName: CALENDAR_TYPES[cal.type],
        calName: cal.name || '',
        country: cal.country || '',
        why: cal.why || '',
        monthNames: cal.type === 'custom' ? cal.months.map(x => x.name) : MONTHS_RU,
        holMonth: clockHolMonth || draft.m || 1,
        addOpen: clockAddOpen,
        monthsText: cal.type === 'custom' ? cal.months.map(x => `${x.name} (${x.days})`).join(', ') : '',
        weekdaysText: cal.type === 'custom' && cal.weekdays ? cal.weekdays.join(', ') : '',
        // в списке — только праздники, которые уже (и ещё) отмечают в год сцены; годы появления не показываем
        holidays: (cal.holidays || []).map((h, idx) => ({ h, idx }))
            .filter(({ h }) => cal.type === 'days' || t.y === undefined || !((h.from && t.y < h.from) || (h.to && t.y > h.to)))
            .map(({ h, idx }) => ({ idx, name: h.name, kind: h.kind === 'canon' ? 'canon' : 'holiday', who: h.who, dateText: holDate(h) })),
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
        const m = Number(v('hm')) || clockHolMonth || draft.m || 1;
        if (!name || !d) return notice('Напиши название и число.');
        if (d > monthDays(cal, 2000, m)) return notice('В этом месяце нет такого числа.');
        // «Виктор: годовщина» — личная дата персонажа
        const h = { m, d, name };
        const who = name.match(/^([^:]{2,40}):\s*(.+)$/);
        if (who) Object.assign(h, { kind: 'canon', who: who[1].trim(), name: who[2].trim() });
        meta.calendar = Object.assign({}, cal, { holidays: [...(cal.holidays || []), h] });
        clockAddOpen = false;
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
    if (cmd === 'add-open') { clockAddOpen = !clockAddOpen; return renderAll(); }
    if (cmd === 'ev-del') {
        const key = decodeURIComponent(arg || '');
        const [kind, who, name, m, d] = key.split('|');
        const list = (cal.holidays || []).slice();
        const i = list.findIndex(h => h.name === name && Number(h.m) === Number(m) && Number(h.d) === Number(d) && (kind !== 'canon' || !who || h.who === who));
        if (!(await confirmDelete(name, i >= 0 ? 'Дата уйдёт из календаря.' : 'Дата больше не будет показываться в списке.'))) return;
        if (i >= 0 && (kind === 'holiday' || kind === 'canon')) { list.splice(i, 1); meta.calendar = Object.assign({}, cal, { holidays: list }); }
        else meta.evHidden = [...new Set([...(meta.evHidden || []), key])].slice(-200);
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
    if (cmd === 'hol-del') {
        const h = (cal.holidays || [])[Number(arg)];
        if (!(await confirmDelete(h && h.name, 'Дата уйдёт из календаря.'))) return;
        const list = (cal.holidays || []).slice();
        list.splice(Number(arg), 1);
        meta.calendar = Object.assign({}, cal, { holidays: list });
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
}

// ---------- Love Score: работаем в связке ----------
// Если у игрока стоит и включено расширение Love Score, отношение персонажа (и НПС группы) к игроку
// дневник берёт оттуда: показывает его счёт, сверяет с ним свою шкалу −3…+3 и не дублирует подсказку модели.
const LOVE_TYPES = { neutral: 'нейтрально', romance: 'романтика', friendship: 'дружба', family: 'семья', platonic: 'платоника', rival: 'соперничество', obsession: 'одержимость', hostile: 'ненависть' };
function loveScoreInfo() {
    try {
        const c = ctx();
        const es = c.extensionSettings || {};
        const ls = es['love-score'];
        if (!ls || ls.isEnabled === false || !ls.chatLoveData || !hasChat() || c.groupId) return null;
        const off = es.disabledExtensions || [];
        if (off.some(x => /love-score$/i.test(String(x)))) return null;
        const id = c.chatId ?? (c.chatMetadata && c.chatMetadata.chat_id);
        const d = id && ls.chatLoveData[id];
        if (!d) return null;
        const one = (name, x) => ({ name, nameEn: x.nameEn || '', score: Math.round((Number(x.score) || 0) * 10) / 10, max: Math.max(1, Number(x.maxScore) || 100), type: x.relationType || 'neutral', typeLabel: LOVE_TYPES[x.relationType || 'neutral'] || '' });
        return {
            main: one(c.name2, d),
            npcs: ls.groupMode ? (d.groupNpcs || []).filter(n => n && n.name).map(n => one(n.name, n)) : [],
        };
    } catch { return null; }
}

// Отношение к игроку по Love Score — в нашу шкалу (сам счёт Love Score не трогаем)
function syncLove(state, love) {
    if (!love || !state) return;
    for (const k of state.order || []) {
        const ch = state.characters[k];
        if (!ch || ch.persona || !ch.impression) continue;
        const l = loveFor(love, ch.name);
        if (!l) continue;
        const v = loveToAttitude(l.score, l.max);
        if ((ch.impression.nowScore ?? ch.impression.score) !== v) {
            ch.impression.nowScore = v;
            ch.attitude = (ch.attitude || []).concat([{ s: v, c: ch.cycle || 0 }]).slice(-16);
        }
        ch.loveType = l.type;
    }
}

// ---------- Подсказка основной модели ----------

// Последние сообщения чата одним текстом (без размышлений и разметки) — по ним включаются ключи.
function recentText(beforeId, n = 4) {
    const chat = ctx().chat || [];
    const out = [];
    for (let i = Math.min(beforeId ?? chat.length, chat.length) - 1; i >= 0 && out.length < n; i--) {
        const m = chat[i];
        if (!m || m.is_system || !m.mes) continue;
        out.unshift(plainForClock(m.mes));
    }
    return out.join('\n');
}

function updateInjection(beforeId) {
    const c = ctx();
    const s = settings();
    let text = '';
    if (s.enabled && s.inject && hasChat() && c.chat && c.chat.length) {
        text = buildInjection(liveState(beforeId), s.modules, c.name1, s.moodInfluence, { love: loveScoreInfo() });
    }
    c.setExtensionPrompt(PROMPT_KEY, text, 1, Number(s.injectDepth) || 0, false, 0);
    // купленное в лавке — всегда и у самого конца: это выбор игрока на следующий ответ
    let buyText = '';
    if (s.enabled && hasChat() && c.chat && c.chat.length) {
        try { buyText = buildBuyInjection(liveState(beforeId), c.name1); } catch (e) { console.warn('[Внутренний мир] покупки', e); }
    }
    c.setExtensionPrompt(BUY_PROMPT_KEY, buyText, 1, 0, false, 0);
    // притяжение — своей подсказкой, со своей настойчивостью
    let attr = '';
    const attrHits = [];
    if (s.enabled && s.inject && s.modules.attraction !== false && s.attrInfluence !== 'none' && hasChat() && c.chat && c.chat.length) {
        attr = buildAttrInjection(liveState(beforeId), c.name1, s.attrInfluence, { mode: s.attrKeys === 'always' ? 'always' : 'keys', recent: recentText(beforeId, 4), hits: attrHits, mains: mainNames().length ? mainNames() : null });
    }
    c.setExtensionPrompt(ATTR_PROMPT_KEY, attr, 1, Number(s.attrDepth) || 4, false, 0);
    // часы сцены — у самого конца чата, чтобы модель не теряла время суток и дату
    // часы сцены модель видит всегда, пока часы включены: даже если «Влияние на ролевую» выключено
    let clockText = '';
    if (s.enabled && hasChat() && c.chat && c.chat.length) {
        try { clockText = clockPromptText(beforeId); } catch (e) { console.warn('[Внутренний мир] часы', e); }
    }
    if (s.enabled && s.inject && hasChat() && c.chat && c.chat.length) {
        // свежий сон (записан в последних сообщениях) — пусть отзовётся в утре героя; сны персоны — только для игрока
        try {
            const last = c.chat.length - 1;
            const fresh = Object.values(liveState(beforeId).characters || {}).filter(x => x && !x.persona).map(x => ({ c: x, d: (x.dreams || [])[(x.dreams || []).length - 1] }))
                .filter(x => x.d && x.d.mes !== undefined && last - x.d.mes <= 4);
            if (fresh.length) clockText += `${clockText ? ' ' : ''}[${fresh.map(x => `Прошлой ночью ${x.c.name} снилось: ${x.d.text}${x.d.tone ? ` (${x.d.tone} сон)` : ''}`).join('. ')}. Можно мимоходом отразить это в настроении утром, но не пересказывать сон дословно.]`;
        } catch { /* без сна */ }
        // свежий слух — чтобы мир вокруг жил: персонажи могут его услышать или упомянуть
        try {
            const last = c.chat.length - 1;
            const rs = s.rumors !== false ? (chatMeta().rumors || []).filter(r => r.mes !== undefined && last - r.mes <= 6).slice(-2) : [];
            if (rs.length) clockText += `${clockText ? ' ' : ''}[Слухи вокруг: ${rs.map(r => { const t = rumorPlain(r); const q = r.form === 'dialog' || r.form === 'news' ? t : `«${t}»`; return `${q}${r.who || r.source ? ` (${r.form && r.form !== 'dialog' ? (RUMOR_FORM_NAMES[r.form] + ', ') : 'болтает '}${r.source || r.who})` : ''}`; }).join('; ')}. Если к месту, кто-то из персонажей может это услышать, обсудить или отреагировать; не вставляй дословно и не делай главным в сцене.]`;
        } catch { /* без слухов */ }
    }
    c.setExtensionPrompt(CLOCK_PROMPT_KEY, clockText, 1, 0, false, 0);
    lastInjected = { mood: text, attr, clock: clockText, shop: buyText, moodDepth: Number(s.injectDepth) || 0, attrDepth: Number(s.attrDepth) || 4, moodLevel: s.moodInfluence, attrLevel: s.attrInfluence, attrHits: attrHits.slice(0, 20), attrMode: s.attrKeys === 'always' ? 'always' : 'keys' };
}

// ---------- Теги влияния в чате (диагностика) ----------
// Перед ответом бота запоминаем, что расширение отдало модели; после разбора — что изменилось.
// Всё это живёт в extra сообщения и рисуется под ним; в промпт не попадает.
const DIAG_KEY = 'inner_world_diag';
let lastInjected = null;
let pendingDiag = null;

function snapshotDiag() {
    if (!lastInjected) return null;
    const x = lastInjected;
    if (!x.mood && !x.attr && !x.clock && !x.shop) return null;
    return Object.assign({ at: Date.now() }, clone(x));
}

function diagOf(mes) {
    const d = mes && mes.extra && mes.extra[DIAG_KEY];
    if (!d) return null;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    return d.sid === undefined || d.sid === sid ? d : null;
}

function writeDiag(mesId, patch) {
    const mes = (ctx().chat || [])[mesId];
    if (!mes) return;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    mes.extra = mes.extra || {};
    const cur = diagOf(mes) || { sid };
    mes.extra[DIAG_KEY] = Object.assign(cur, patch, { sid });
}

// Что изменилось после разбора: события дневника, эмоции (новые и ушедшие), отношение к игроку, часы, сны, слухи.
function diagChanges(base, state, events, extra) {
    const out = [];
    for (const ev of [...(events || []), ...(extra || [])]) {
        if (!ev) continue;
        out.push({ kind: ev.type, who: ev.who || '', text: `${eventTitle(ev)}${ev.text ? `: ${String(ev.text).slice(0, 140)}` : ''}` });
    }
    const chars = (state && state.characters) || {};
    for (const [k, c] of Object.entries(chars)) {
        if (!c) continue;
        const was = base && base.characters && base.characters[k];
        const before = new Set(((was && was.moodlets) || []).map(m => m.emotion));
        const now = new Set((c.moodlets || []).map(m => m.emotion));
        const added = (c.moodlets || []).filter(m => !before.has(m.emotion));
        const gone = [...before].filter(e => !now.has(e));
        if (added.length) out.push({ kind: 'mood_up', who: c.name, text: `новые эмоции: ${added.map(m => `${m.emotion}${m.weight ? ` (${WEIGHT_NAMES[m.weight] || m.weight})` : ''}`).join(', ')}` });
        if (gone.length) out.push({ kind: 'mood_down', who: c.name, text: `прошло: ${gone.join(', ')}` });
        if (was && was.mood !== c.mood && c.mood) out.push({ kind: 'mood', who: c.name, text: `настроение: ${was.mood || '—'} → ${c.mood}` });
        const a = was && was.impression ? (was.impression.nowScore ?? was.impression.score) : null;
        const b = c.impression ? (c.impression.nowScore ?? c.impression.score) : null;
        if (a !== null && b !== null && a !== b && !c.persona) out.push({ kind: 'attitude', who: c.name, text: `отношение к игроку: ${signed(a)} → ${signed(b)}` });
        const ca = was && was.chemNow ? was.chemNow.score : null;
        const cb = c.chemNow ? c.chemNow.score : null;
        if (ca !== null && cb !== null && ca !== cb && cb !== undefined) out.push({ kind: 'chem', who: c.name, text: `совместимость сейчас: ${signed(ca)} → ${signed(cb)}` });
    }
    // события дневника про эмоции и отношение уже есть — не дублируем одинаковые строки
    const seen = new Set();
    return out.filter(x => { const k = x.who + '|' + x.text; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30);
}

function renderDiagAll() {
    const on = settings().diag === true && hasChat();
    const chatEl = document.getElementById('chat');
    if (!chatEl) return;
    if (!on) { chatEl.querySelectorAll('.iw-diag').forEach(el => el.remove()); return; }
    const chat = ctx().chat || [];
    for (const el of chatEl.querySelectorAll('.mes[mesid]')) {
        const id = Number(el.getAttribute('mesid'));
        const mes = chat[id];
        const html = mes ? diagHtml(mes, id) : '';
        let box = el.querySelector(':scope .iw-diag');
        if (!html) { if (box) box.remove(); continue; }
        if (!box) {
            box = document.createElement('div');
            box.className = 'iw-diag';
            const anchor = el.querySelector('.mes_text');
            if (!anchor) continue;
            anchor.after(box);
        }
        box.className = `iw-diag iw-diag-${currentTheme}`;
        if (box.dataset.sig !== html.length + ':' + id) {
            const open = box.querySelector('details[open]');
            box.innerHTML = html;
            if (open) box.querySelector('details') && box.querySelector('details').setAttribute('open', '');
            box.dataset.sig = html.length + ':' + id;
        }
    }
}

function diagHtml(mes, id) {
    const d = diagOf(mes);
    const rec = clockRecOf(mes);
    const chips = [];
    const chip = (kind, label, text, title = '') => chips.push(`<span class="iw-dg iw-dg-${kind}"${title ? ` title="${esc(title)}"` : ''}><i>${esc(label)}</i>${esc(text)}</span>`);
    // часы: какое время у этого сообщения и почему
    if (rec && rec.t) {
        const cal = calendarOf() || normCalendar({ type: 'greg' });
        const WHY = { stamp: 'по отметке в тексте', skip: 'по скачку времени', model: 'поправил дневник', step: 'обычный шаг', manual: 'вручную', detect: 'определил дневник', locked: 'часы на паузе', same: 'без изменений' };
        const sz = rec.size > 0 ? ` (+${fmtSpan(rec.size)})` : (rec.size < 0 ? ` (назад ${fmtSpan(-rec.size)})` : '');
        try { chip('clock', 'время', `${fmtDate(cal, normTime(cal, rec.t), { year: false })}, ${fmtTime(rec.t)}${sz}`, `${WHY[rec.why] || rec.why || ''}${rec.user ? ' · из сообщения игрока' : ''}`); } catch { /* без часов */ }
    }
    if (d && d.sent) {
        const x = d.sent;
        const LEVEL = { 1: 'очень сильно', 2: 'сильно', 4: 'обычно', 6: 'мягко', 10: 'еле заметно' };
        // по строкам подсказки «Имя: …» — один тег на персонажа: настроение, чувства, отношение и что ещё ушло модели
        const people = [];
        for (const line of String(x.mood || '').split('\n').slice(1)) {
            const m = line.match(/^([^:]{1,60}):\s*(.*)$/);
            if (!m) continue;
            const body = m[2];
            const mood = (body.match(/сейчас ([^;.]+)/) || [])[1];
            const soul = (body.match(/на душе: ([^.]+)/) || [])[1];
            const feels = soul ? soul.split('; ').map(f => f.split(' — ')[0]).slice(0, 2) : [];
            const att = (body.match(/отношение к игроку[^:]*: ([+−-]?\d+)/) || [])[1];
            const what = [/хочет:/.test(body) && 'желания', /боится:/.test(body) && 'страхи', /только что сбылось то, чего боялся/.test(body) && 'страх сбылся!', /мечта:/.test(body) && 'мечта'].filter(Boolean);
            people.push({ who: m[1], text: [mood, feels.join(', '), att !== undefined ? `отн. ${att}` : '', what.join(', ')].filter(Boolean).join(' · ') });
        }
        const LEVELW = LEVEL[x.moodDepth] || 'обычно';
        people.slice(0, 3).forEach(p => chip('mood', p.who.split(/\s+/)[0], p.text, `${p.who}: что ушло модели (настойчивость — ${LEVELW})`));
        if (people.length > 3) chip('mood', `+${people.length - 3}`, plural(people.length - 3, 'персонаж', 'персонажа', 'персонажей'), people.slice(3).map(p => `${p.who}: ${p.text}`).join('\n'));
        if (x.attr) {
            const hits = x.attrHits || [];
            if (x.attrMode === 'keys') {
                if (hits.length) hits.slice(0, 4).forEach(h => chip('attr', h.who.split(/\s+/)[0], `${h.side === 'life' ? 'брак и дети' : (h.side === 'dislike' ? 'не любит' : 'любит') + ': ' + h.tag} ← «${h.word}»`, 'тег притяжения включился по слову в последних сообщениях'));
                if (hits.length > 4) chip('attr', 'притяжение', `ещё ${hits.length - 4}`, hits.slice(4).map(h => `${h.who}: ${h.tag} ← ${h.word}`).join('\n'));
                if (!hits.length) chip('attr', 'притяжение', 'только совместимость', 'теги «нравится / не нравится» к этой сцене не подошли — модели ушла только совместимость с игроком');
            } else chip('attr', 'притяжение', `все теги · ${({ strong: 'заметно', medium: 'проскальзывает', light: 'оттенок' }[x.attrLevel] || 'есть')}`, 'что привлекает и отталкивает → модели');
        }
        for (const line of String(x.shop || '').split('\n').slice(1)) {
            const m = line.match(/^([^:]{1,60}):\s*(.*)$/);
            if (!m) continue;
            const kinds = [/В ЭТОМ ответе обязательно происходит/.test(m[2]) && 'событие', /дарит/.test(m[2]) && 'подарок', /сейчас действует/.test(m[2]) && 'эффект'].filter(Boolean);
            chip('shop', m[1].split(/\s+/)[0], `куплено: ${kinds.join(', ')}`, `${m[1]}: купленное в лавке → модели в этот ответ`);
        }
        if (/снилось:/.test(x.clock || '')) chip('night', 'сон', 'свежий — в настроении', 'свежий сон → модели: может отозваться в настроении героя');
    }
    const after = d && d.after ? d.after : [];
    if (!chips.length && !after.length && !(d && d.sent)) return '';
    const tok = t => Math.round(String(t || '').length / 3.6);
    const sentTxt = d && d.sent ? [['Купленное в лавке', d.sent.shop], ['Эмоции, желания, отношение', d.sent.mood], ['Притяжение', d.sent.attr], ['Часы сцены и сон', d.sent.clock]].filter(([, t]) => t) : [];
    const total = sentTxt.reduce((n, [, t]) => n + tok(t), 0);
    return `<div class="iw-dg-row"><b class="iw-dg-head" title="Теги влияния «Внутреннего мира» — видны только тебе">ВМ</b>${chips.join('')}${after.length ? `<span class="iw-dg iw-dg-after"><i>после разбора</i>${after.length} ${plural(after.length, 'перемена', 'перемены', 'перемен')}</span>` : ''}</div>`
        + (sentTxt.length || after.length ? `<details class="iw-dg-more"><summary>${sentTxt.length ? `что ушло модели · ≈${total} ток.` : ''}${sentTxt.length && after.length ? ' · ' : ''}${after.length ? 'что изменилось' : ''}</summary>`
            + (after.length ? `<ul class="iw-dg-after-list">${after.map(a => `<li class="iw-dg-k-${esc(a.kind)}"><b>${esc(a.who)}</b> ${esc(a.text)}</li>`).join('')}</ul>` : '')
            + sentTxt.map(([n, t]) => `<div class="iw-dg-sent"><div class="iw-dg-sent-h">${esc(n)} · ≈${tok(t)} ток.</div><pre>${esc(t)}</pre></div>`).join('')
            + '</details>' : '');
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

// Если модель не взяла дату рождения, а в карточке бота или описании персоны она прямо написана
// («born March 14, 1961», «родился 14 марта 1961») — берём её сами.
function fillBornFromCards(state) {
    try {
        const c = ctx();
        const fix = (ch, text) => {
            if (!ch || ch.bornManual || (ch.born && ch.born.d && ch.born.y)) return;
            const b = bornFromText(text);
            if (!b) return;
            if (ch.born && ch.born.d && !b.d) return;
            ch.born = b.y || !(ch.born && ch.born.y) ? b : { ...b, y: ch.born.y };
            delete ch.bornChecked;
        };
        const botKey = Object.keys(state.characters || {}).find(k => !state.characters[k].persona && sameName(k, c.name2));
        if (botKey) fix(state.characters[botKey], cardDescription(c));
        const pk = Object.keys(state.characters || {}).find(k => state.characters[k].persona);
        if (pk) fix(state.characters[pk], (c.powerUserSettings && c.powerUserSettings.persona_description) || '');
    } catch (e) { console.warn('[Внутренний мир] дата рождения из карточки', e); }
}

// Ориентация из карточки, описания персоны и разобранного лорбука: если там прямо написано (на любом языке,
// любым словом из списка — «Orientation: bi», «гетеросексуален», «openly gay»), подтягиваем в дневник.
// Руками выбранную не трогаем. В карточке на несколько героев читаем кусок про каждого.
// Знак зодиака по дате рождения — в календаре этой истории (свои месяцы — своя раскладка знаков)
function fixZodiacs(state) {
    try {
        const n = clockNow();
        const cal = n && n.cal;
        if (!cal || cal.type !== 'custom') return;
        for (const ch of Object.values(state.characters || {})) {
            if (!ch || !ch.born || !ch.born.d || !ch.born.m) continue;
            const z = zodiacOn(cal, ch.born.d, ch.born.m);
            if (z) ch.zodiac = z;
        }
    } catch { /* без календаря */ }
}

function fillOrientFromCards(state) {
    try {
        const c = ctx();
        const chars = state.characters || {};
        const keys = Object.keys(chars);
        const names = keys.map(k => chars[k].name || k);
        const card = cardDescription(c) || '';
        const lore = (knowledgeLore(6) || []).join('\n\n');
        const set = (ch, text) => {
            if (!ch || ch.orientManual || ch.orient) return;
            const o = orientFromText(text);
            if (o) { ch.orient = o; delete ch.noOrient; }
        };
        for (const k of keys) {
            const ch = chars[k];
            if (!ch || ch.orient || ch.orientManual) continue;
            if (ch.persona) { set(ch, (c.powerUserSettings && c.powerUserSettings.persona_description) || ''); continue; }
            const others = names.filter(n => n !== (ch.name || k));
            const isBot = sameName(k, c.name2) || sameName(ch.name || '', c.name2);
            // одна карточка — один герой: читаем её целиком; иначе — только кусок о нём
            if (isBot) set(ch, card);
            if (!ch.orient) set(ch, textAbout(card, ch.name || k, others));
            if (!ch.orient && lore) set(ch, textAbout(lore, ch.name || k, others));
        }
    } catch (e) { console.warn('[Внутренний мир] ориентация из карточки', e); }
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
// Примерный расход токенов: русский текст ≈ 3,2 знака на токен. Запрос считаем сами, ответ — до лимита.
function tokenEstimate(system, user, limit) {
    return { prompt: Math.round((String(system || '').length + String(user || '').length) / 3.2), limit: Number(limit) || 0, auto: settings().budgetMode !== 'fixed' };
}

function withBudget(kind, counts = {}) {
    const s = settings();
    return Object.assign({}, s, { responseLength: responseBudget(s, Object.assign({ kind, model: modelName(s) }, counts)) });
}

function modelName(s) {
    if (s.source === 'custom' && s.apiKind !== 'profile') return s.apiModel || '';
    // свой профиль подключения: модель берём из профиля, а не из основного чата
    if (s.source === 'custom' && s.apiKind === 'profile' && s.profileId) {
        try {
            const c = ctx();
            const list = (c.extensionSettings && c.extensionSettings.connectionManager && c.extensionSettings.connectionManager.profiles) || [];
            const p = list.find(x => x && x.id === s.profileId);
            if (p && p.model) return String(p.model);
        } catch { /* как раньше */ }
    }
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
    try { window.__innerWorldLast = { raw: lastCall.raw, budget: lastCall.budget, at: Date.now() }; } catch { /* нет окна */ }
    return res;
}

// Мультибот: одна карточка — несколько главных героев. Игрок сам решает, кто главный, а кто НПС.
// «Какая это карточка» — один раз на карточку, при первом нажатии «Чат», «Лорбук» или «Всё сразу»
// Был ли в этом чате хоть один разбор (запись в сообщении или свайпе, стартовое состояние).
function chatEverAnalyzed() {
    const c = ctx();
    const meta = c.chatMetadata && c.chatMetadata[META_KEY];
    if (meta && (meta.base || meta.modeAsked)) return true;
    for (const m of c.chat || []) {
        if (m && m.extra && m.extra[META_KEY]) return true;
        for (const sw of (m && m.swipe_info) || []) if (sw && sw.extra && sw.extra[META_KEY]) return true;
    }
    return false;
}

// Вопрос «какая это карточка» — только перед самым первым разбором чата (или после очистки его дневника).
// Если в чате уже был разбор — не спрашиваем никогда.
let cardModeAsking = null;
async function askCardMode() {
    const key = rosterKey();
    if (!key || !hasChat()) return true;
    if (chatEverAnalyzed()) return true;
    // «Обычный бот / Мультибот» выбирается на первой странице дневника («Перед первым разбором») — отдельно не спрашиваем
    const r = settings().rosters[key];
    if (!r || !r.modeSet) {
        const rs = settings().rosters;
        rs[key] = Object.assign(emptyRoster(), rs[key] || {}, { modeSet: true });
        saveSettings();
    }
    chatMeta().modeAsked = true;
    return true;
    if (cardModeAsking) return cardModeAsking;
    cardModeAsking = askCardModeNow(key).finally(() => { cardModeAsking = null; });
    return cardModeAsking;
}

async function askCardModeNow(key) {
    const rs = settings().rosters;
    const res = await iwDialog({
        title: 'Какая это карточка?',
        html: '<p class="iw-modal-text"><b>Обычный бот</b> — главный герой один: персонаж карточки. Остальные люди мира — НПС.</p><p class="iw-modal-text"><b>Мультибот</b> — в карточке несколько главных героев (экипаж, команда, семья). После разбора лорбука выберешь, кто из них главный, — и сможешь переносить героев из НПС в главные и обратно.</p>',
        buttons: [{ text: 'Обычный бот', value: 'single', kind: 'main' }, { text: 'Мультибот', value: 'multi', kind: 'main' }, { text: 'Отмена', value: null }],
    });
    // спросили — в этом чате больше не спрашиваем, даже если закрыли без ответа
    chatMeta().modeAsked = true;
    ctx().saveMetadataDebounced?.();
    if (res !== 'single' && res !== 'multi') return false;
    const r = rs[key] = Object.assign(emptyRoster(), rs[key] || {});
    r.modeSet = true;
    if (res === 'multi' && !r.multi) { r.multi = true; r.picked = false; if (!Array.isArray(r.pickedMain)) r.pickedMain = (r.main || []).slice(); }
    if (res === 'single') r.multi = false;
    saveSettings();
    renderAll();
    return true;
}

function onMultiAction(d) {
    const key = rosterKey();
    if (!key) return;
    const rs = settings().rosters;
    const r = rs[key] = Object.assign(emptyRoster(), rs[key] || {});
    const cur = () => (Array.isArray(r.pickedMain) ? r.pickedMain.slice() : mainNames());
    const has = (list, n) => list.some(x => namesMatch(x, n));
    if (d.iwMulti !== undefined) {
        r.multi = d.iwMulti === '1';
        r.modeSet = true;
        if (r.multi) { r.picked = false; if (!Array.isArray(r.pickedMain)) r.pickedMain = (r.main || []).slice(); }
        notice(r.multi ? (r.at ? 'Мультибот включён: отметь в плашке, кто здесь главные герои. НПС можно сделать главными и обратно.' : 'Мультибот: после разбора лорбука выбери, кто здесь главные герои. НПС можно сделать главными и обратно.') : 'Обычный бот: главный — персонаж карточки, остальные — НПС.');
    } else if (d.iwMainpick !== undefined) {
        const list = cur();
        const n = d.iwMainpick;
        r.pickedMain = has(list, n) ? list.filter(x => !namesMatch(x, n)) : list.concat(n);
    } else if (d.iwMainsave !== undefined) {
        if (!cur().length) return notice('Отметь хотя бы одного главного героя.');
        r.pickedMain = cur();
        r.picked = true;
    } else if (d.iwPromote !== undefined) {
        const list = cur();
        if (!has(list, d.iwPromote)) list.push(d.iwPromote);
        r.pickedMain = list; r.picked = true;
        view = 'main:' + d.iwPromote;
        notice(`${d.iwPromote} — теперь главный герой`);
    } else if (d.iwDemote !== undefined) {
        const list = cur().filter(x => !namesMatch(x, d.iwDemote));
        if (!list.length) return notice('Должен остаться хотя бы один главный герой.');
        r.pickedMain = list; r.picked = true;
        view = 'npc';
        notice(`${d.iwDemote} — теперь в НПС`);
    }
    historyCache.key = '';
    saveSettings();
    updateInjection();
    renderAll();
}

function stopAnalysis(msg = '') {
    // остановили вручную — следующее нажатие «Чат», «Лорбук» или «Всё сразу» разбирает заново,
    // а не отвечает «ничего нового» (часть разбора могла успеть записаться до остановки)
    const wasRunning = busy || rosterBusy || !!live;
    try { if (wasRunning && hasChat()) { chatMeta().fp = {}; ctx().saveMetadataDebounced?.(); } } catch { /* нет чата */ }
    runId++;
    setLive(null);
    if (abortCtl) abortCtl.abort();
    abortCtl = null;
    busy = false;
    rosterBusy = false;
    dreamBusy = false;
    wishBusy = '';
    shopBusy = false;
    busyKind = '';
    pending = null;
    status = msg || 'Разбор остановлен';
    updateInjection();
    renderAll();
    flushBuyQueue();
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
function mainStreamRequest(c, system, user, max, stream = true) {
    const o = c.chatCompletionSettings || {};
    const think = settings().thinking;
    // свой адрес (custom) таверна шлёт как есть: «reasoning: effort» добавляем в тело запроса;
    // остальным источникам таверна сама переводит reasoning_effort в нужный вид
    const effort = think && think !== 'chat' ? think : o.reasoning_effort;
    const includeBody = o.chat_completion_source === 'custom' ? includeBodyWithThinking(o.custom_include_body, think) : o.custom_include_body;
    const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? undefined : Number(v));
    return {
        stream,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: max,
        model: c.getChatCompletionModel ? c.getChatCompletionModel() : undefined,
        chat_completion_source: o.chat_completion_source,
        temperature: num(o.temp_openai),
        top_p: num(o.top_p_openai),
        custom_url: o.custom_url,
        custom_include_body: includeBody,
        custom_exclude_body: o.custom_exclude_body,
        custom_include_headers: o.custom_include_headers,
        custom_prompt_post_processing: o.custom_prompt_post_processing,
        reverse_proxy: o.reverse_proxy,
        proxy_password: o.proxy_password,
        reasoning_effort: effort,
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
    if (c.mainApi === 'openai' && c.ChatCompletionService && c.chatCompletionSettings) {
        // тем же запросом, что и поток, — чтобы и без потока работала настройка «сколько думать»
        if (watch) {
            try {
                const res = await c.ChatCompletionService.processRequest(mainStreamRequest(c, system, user, max), {}, true, signal);
                if (typeof res === 'function') return await drainStream(res, watch);
                const text = typeof res === 'string' ? res : (res && res.content) || '';
                if (text) return text;
            } catch (err) { fallback(err); }
        }
        try {
            const res = await c.ChatCompletionService.processRequest(mainStreamRequest(c, system, user, max, false), {}, true, signal);
            const text = typeof res === 'string' ? res : (res && res.content) || '';
            if (text) return text;
        } catch (err) {
            if (signal.aborted) throw err;
            console.warn('[Внутренний мир] запрос без потока не получился, пробую обычной генерацией', err);
        }
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

async function analyze(messageId, { manual = false, catchUp = null, fromLore = null, kind = 'chat', keepLive = false, study = null } = {}) {
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
    // самый первый разбор этой карточки (даже автоматический после ответа бота) — сначала спросить, какая это карточка
    if (!manual && !fromLore && !(await askCardMode())) return;
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
    if (s.clock !== false && hasChat() && calendarNeedsModel() && !clockBusy) {
        markCalendarTried();
        live.calendar = 'busy';
        calP = detectCalendar({ onlyCalendar: !!chatMeta().calendar }).finally(() => { if (live) { live.calendar = 'done'; renderAll(); } });
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
            if (missingOk.length && ((userTurns >= 1 && messageId >= 2) || manual)) {
                // сначала главные, потом НПС — по важности, сколько влезает в лимит
                const ph = new Set(placeholders);
                const have = splitCast(base).npcKeys.length;
                const room = Math.max(0, npcCap() - have);
                const npcs = missingOk.filter(n => !ph.has(n))
                    .map(n => ({ n, w: rosterWeight(rosterFind(ros0, n)) })).sort((a, b) => b.w - a.w).slice(0, room).map(x => x.n);
                catchUp = [...missingOk.filter(n => ph.has(n)), ...npcs].slice(0, 8);
                if (!catchUp.length) catchUp = null;
            }
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
            // самое свежее сообщение — почти целиком: в середине длинного ответа бывают новые лица (раньше видели только начало и конец)
            msgs.unshift(`#${i} ${m.name}: ${cleanMessageText(m.mes, catchUp ? CATCHUP_MSG_CHARS : (i === messageId ? 5000 : 1500))}`);
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
            typeHints: typeHintsFor(mn),
            studyNames: study || null,
            catchUp,
            fromLore: !!fromLore,
            kind,
            loreMain: fromLore ? fromLore.map(t => cleanMessageText(t, 6000)).slice(0, 6) : [],
            history,
            knownNames: s.showNpc === false ? [] : [...(ros.main || []), ...(ros.npc || []).map(e => e.name).filter(n => !isIgnored(n))].slice(0, 40),
            ignored: ignoredNames(),
            lore: [],
            clockNow: kind !== 'lore' && s.clock !== false ? (syncClockFromChat(), clockForAnalysis(messageId)) : '',
            achTitles: (chatMeta().achList || []).filter(x => x.mes !== messageId).map(x => x.title).slice(-15),
            love: loveScoreInfo(),
            hasGifts: Object.values(base.characters || {}).some(ch => ch && (ch.buffs || []).some(b => b.kind === 'gift')),
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
        // лимит НПС: сколько ещё можно завести, самые важные — первыми
        let npcRoom = Math.max(0, npcCap() - splitCast(base).npcKeys.length - (catchUp ? catchUp.length : 0));
        const byWeight = list => [...list].sort((a, b) => rosterWeight(b) - rosterWeight(a));
        // в обычном разборе чата: знакомые персоны (её бывший, подруга, родня) — всегда, знакомые бота — если их упоминали в чате
        const plainChat = kind === 'chat' && !(catchUp && catchUp.length);
        const seenInChat = plainChat ? new Set(historySeen().seen.map(e => e.name)) : null;
        const acqEntries = [];
        if (s.showNpc !== false) {
            info.acquainted = [];
            for (const e of byWeight(ros.npc || [])) {
                if (npcRoom <= 0) break;
                if (!e.rel && !e.relUser) continue;
                if (plainChat && !e.relUser && !seenInChat.has(e.name)) continue;
                if (isIgnored(e.name)) continue;
                if (base.order.some(k => rosterFind(ros, k) === e || namesMatch(k, e.name))) continue;
                const al = e.aliases || [], tr = e.traits || [];
                info.acquainted.push(`${e.name}${al.length ? ` (${al.join(', ')})` : ''}: ${e.who || ''}${e.rel ? `; для ${c.name2} — ${e.rel}` : ''}${e.relUser ? `; для ${c.name1} — ${e.relUser}` : ''}${e.dead ? '; нет в живых' : ''}${tr.length ? `; черты: ${tr.join(', ')}` : ''}`);
                acqEntries.push(e);
                npcRoom--;
                if (info.acquainted.length >= 8) break;
            }
        }
        // НПС из лорбука, которые впервые пришли в сцену: даём модели их описание
        if (s.showNpc !== false) {
            for (const e of byWeight(ros.npc || [])) {
                if (npcRoom <= 0) break;
                if (base.order.some(k => rosterFind(ros, k) === e)) continue;
                if (isIgnored(e.name)) continue;
                if (!rosterMentioned(e, recentText) && !(catchUp && catchUp.includes(e.name))) continue;
                info.lore.push(`${e.name}${e.aliases.length ? ` (${e.aliases.join(', ')})` : ''}: ${e.who}${e.traits.length ? `; черты: ${e.traits.join(', ')}` : ''}`);
                npcRoom--;
                if (info.lore.length >= (catchUp ? 10 : 5)) break;
            }
        }
        if (npcCap() !== Infinity) info.npcRoom = Math.max(0, npcRoom);
        // погода, последний сон, слухи — чтобы модель не повторялась
        try {
            const meta = chatMeta();
            if (meta.weather) info.weatherNow = weatherText(meta.weather);
            const dreams = Object.values(base.characters || {}).flatMap(c => (c.dreams || []).map(d => Object.assign({ who: c.name }, d)))
                .sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 4);
            if (dreams.length) info.lastDream = dreams.map(ld => `${ld.who}${ld.date ? `, ${ld.date}` : ''}: ${ld.text}`).join('; ');
            // по часам сцены прошла ночь (дата сменилась с прошлого разбора) — подсказываем модели, даже если сон не описан
            try {
                const nowC = clockNow(messageId + 1);
                const lastNight = dreams.length ? dreams[0].night : '';
                if (nowC && nowC.t && nowC.cal && nowC.cal.type !== 'days') {
                    const today = JSON.stringify({ y: nowC.t.y, m: nowC.t.m, d: nowC.t.d });
                    const prevDay = chatMeta().sceneDay;
                    if (prevDay && prevDay !== today && lastNight !== today && nowC.t.h >= 4 && nowC.t.h < 14) info.nightPassed = true;
                }
            } catch { /* без подсказки */ }
            info.rumorTexts = (meta.rumors || []).slice(-6).map(r => r.text);
            info.rumorForms = (meta.rumors || []).slice(-3).map(r => RUMOR_FORM_NAMES[r.form || 'talk'] || 'сплетня');
            // слухи — время от времени: давно не было — пора, только что был — не надо
            {
                const lastR = (meta.rumors || []).reduce((m, r) => Math.max(m, Number(r.mes) || 0), -1);
                const since = lastR < 0 ? (meta.rumorSkip ? messageId - meta.rumorSkip : messageId) : messageId - lastR;
                info.rumorDue = since >= 14 ? 'now' : (since >= 7 ? 'maybe' : 'no');
            }
            // мемы — раз в выбранное число сообщений
            {
                const memes = meta.memes || [];
                const lastM = memes.reduce((m, x) => Math.max(m, Number(x.mes) || 0), -1);
                const every = Math.max(1, Number(s.memeEvery) || 6);
                const since = lastM < 0 ? messageId - (Number(meta.memeFrom) || 0) : messageId - lastM;
                info.memeDue = s.memes !== false && since >= every;
                info.memeRecent = memes.slice(-8).map(x => x.format);
                info.memeTexts = memes.slice(-5).map(memePlain).filter(Boolean);
            }
            // слухи и сны — только по ходу ролевой: при первом разборе (дневник ещё пуст) их не просим
            info.firstRun = !(base.order || []).some(k => base.characters && base.characters[k]) || !(msgs && msgs.length);
        } catch { /* без подсказок */ }
        const system = buildSystemPrompt(s, info);
        const user = buildUserPrompt(info, base, s.modules, present);
        const cast = present || base.order;
        const castMains = Math.max(1, cast.filter(k => isMain(k, mn)).length) + (s.persona !== false ? 1 : 0);
        const castNpcs = (s.showNpc === false ? 0 : cast.filter(k => k !== pk && !isMain(k, mn)).length) + info.lore.length + (catchUp ? catchUp.length : 0) + (info.acquainted ? info.acquainted.length : 0);
        const ask = withBudget(catchUp || fromLore ? 'all' : 'chat', { mains: castMains, npcs: castNpcs });
        budget = ask.responseLength;
        if (live) live.est = tokenEstimate(system, user, ask.responseLength);
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
            showError(classifyError(null, { cut: true, budget, thinking: settings().thinking }), { manual });
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
        // НПС, которого разбирали по кнопке, а модель не вернула, — заводим сами: лично ещё не встречались
        if (study) {
            // разобранный по кнопке — полная карточка, а не запись «понаслышке»: «лично не встречались» отдельно
            for (const f of fresh) {
                if (!study.some(n => namesMatch(f.name, n))) continue;
                if (f.met === false) { delete f.met; f.unmet = !f.impression; }
            }
            for (const name of study) {
                if (base.order.some(k => namesMatch(k, name)) || fresh.some(f => namesMatch(f.name, name))) continue;
                const e = ros.find ? ros.find(name) : null;
                fresh.push({ name, g: (e && e.g) || 'n', who: (e && e.who) || '', unmet: true });
            }
        }
        // знакомые персоны ещё до истории, которых модель всё равно пропустила, — заводим сами: карточка «знакомы лично»
        {
            for (const e of acqEntries) {
                if (!e.relUser) continue;
                if (base.order.some(k => namesMatch(k, e.name)) || fresh.some(f => namesMatch(f.name, e.name))) continue;
                const rec = { name: e.name, g: e.g || 'n', who: e.who || '', met: true };
                if (e.dead) rec.dead = true;
                fresh.push(rec);
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
        evBatch = [];
        const { state, events } = applyAnalysis(base, fresh, s.modules, { maxChars: Number(s.maxChars) || 4, userName: c.name1, mains: mn, noChat: !(msgs && msgs.length), mesId: messageId, points: s.points !== false, claimWants: s.points !== false && s.claimAuto !== true, persona: s.persona !== false, rebuild: kind !== 'chat' || !!(catchUp && catchUp.length), force: study || null });
        fillBornFromCards(state);
        fillOrientFromCards(state);
        fixZodiacs(state);
        // сверх лимита НПС: новых второстепенных не берём (уже записанных не трогаем)
        if (npcCap() !== Infinity) try {
            const was = new Set(base.order);
            const { npcKeys } = splitCast(state);
            const extra = npcKeys.length - npcCap();
            if (extra > 0) {
                const drop = npcKeys.filter(k => !was.has(k)).map(k => ({ k, w: npcWeight(state.characters[k], rosterFind(ros0, k)) }))
                    .sort((a, b) => a.w - b.w).slice(0, extra).map(x => x.k);
                for (const k of drop) { delete state.characters[k]; state.order = state.order.filter(x => x !== k); }
            }
        } catch (e) { console.warn('[Внутренний мир] лимит НПС', e); }
        if (info.love) try { syncLove(state, info.love); } catch (e) { console.warn('[Внутренний мир] Love Score', e); }
        if (info.clockNow) applySceneTime(messageId, raw);
        if (!fromLore && info.hasGifts) try { takeGifts(raw, state); } catch (e) { console.warn('[Внутренний мир] подарок', e); }
        if (!fromLore) try { takeAchievement(raw, messageId); } catch (e) { console.warn('[Внутренний мир] достижение', e); }
        if (!fromLore) try { takeExtras(raw, state, messageId); } catch (e) { console.warn('[Внутренний мир] погода, сны, слухи', e); }
        try { pinAges(state, messageId); } catch (e) { console.warn('[Внутренний мир] возраст', e); }
        try { pinMeetings(state, messageId); } catch (e) { console.warn('[Внутренний мир] знакомство', e); }
        writeRecord(messageId, state);
        rememberTypes(state);
        // день сцены на момент разбора: по нему следующий разбор поймёт, что прошла ночь
        try {
            const nowC = clockNow(messageId + 1);
            if (!fromLore && nowC && nowC.t && nowC.cal && nowC.cal.type !== 'days') chatMeta().sceneDay = JSON.stringify({ y: nowC.t.y, m: nowC.t.m, d: nowC.t.d });
        } catch { /* без дня */ }
        if (calP) {
            // ждём календарь, чтобы время встало вместе с записями
            await calP;
            if (info.clockNow === '' && s.clock !== false) {
                try { pinAges(state, messageId); pinMeetings(state, messageId); writeRecord(messageId, state); } catch { /* без возраста */ }
            }
        }
        chatMeta().fp = Object.assign({}, chatMeta().fp, { chat: chatFp(messageId) });
        {
            // кого проверили по истории, но в сцене лично не было — не перепроверяем, пока не упомянут снова;
            // в обычном разборе — те, кого упоминали в прочитанных сообщениях, тоже уже проверены
            const meta = chatMeta();
            meta.checked = meta.checked || {};
            const hs = historySeen();
            const done = new Set(catchUp || []);
            if (!fromLore) for (const e of hs.pending) if ((hs.lastAt[e.name] ?? -1) >= firstInWindow && (hs.lastAt[e.name] ?? -1) <= messageId) done.add(e.name);
            if (done.size) {
                for (const name of done) meta.checked[name] = messageId;
                historyCache.key = '';
                ctx().saveMetadataDebounced?.();
            }
        }
        await ctx().saveChat();
        status = fromLore ? 'Дневник дополнен по карточке и лорбуку' : (catchUp ? `Дневник заполнен по истории чата (до сообщения #${messageId})` : `Обновлено после сообщения #${messageId}`);
        // сны, слухи, подарки, собранные по ходу разбора, — вместе с событиями дневника
        const extra = evBatch || [];
        evBatch = null;
        if (!catchUp && !fromLore) {
            try { writeDiag(messageId, { after: diagChanges(base, state, events, extra.filter(x => x.type !== 'achievement')) }); saveChatSoon(); } catch (e) { console.warn('[Внутренний мир] теги', e); }
        }
        if (!catchUp && !fromLore) {
            if (s.toasts) flushEvents([...events, ...extra]);
            else if (s.sound !== false && events.length) playSound(events[0].type, currentTheme);
        }
        if (events.length && !isOpen()) markFab(true);
        if (!view) view = '';
    } catch (err) {
        if (evBatch && evBatch.length) { const left = evBatch; evBatch = null; flushEvents(left); }
        evBatch = null;
        if (err && err.cancelled) return;
        console.error('[Внутренний мир]', err);
        const info = classifyError(err, { raw, budget, cut: looksCut(raw) && /JSON|испорчен|персонаж/.test(String(err && err.message)), thinking: settings().thinking });
        status = 'Не получилось: ' + info.title;
        showError(info, { manual });
    } finally {
        if (my !== runId) return; // этот разбор остановили — флаги уже сброшены
        busy = false;
        if (live && live.previewPending) clearTimeout(live.previewPending);
        // листок не закрываем, если следом пойдёт ещё работа (награды в лавку) — он закроется в самом конце
        if (!keepLive) setLive(null);
        else if (live) { live.stage = 'done'; live.preview = null; }
        if (manual && kind === 'chat') busyKind = '';
        updateInjection();
        renderAll();
        flushBuyQueue();
        // пустые «привлекает / отталкивает» у главных — дозаполним отдельной короткой просьбой
        if (!pending && !fromLore) setTimeout(() => { if (!busy && !rosterBusy) fillAttractionGaps(); }, 1500);
        if (pending) {
            const p = pending;
            pending = null;
            if (p.messageId !== messageId || p.manual) analyze(p.messageId, { manual: p.manual });
        } else if (s.clock !== false && hasChat() && calendarNeedsModel()) {
            // первый разбор в чате — заодно узнаём календарь истории (один раз); календарь «по метке времени» — уточняем праздники
            markCalendarTried();
            detectCalendar({ onlyCalendar: !!chatMeta().calendar });
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
    box.className = `iw-toasts iw-toasts-${settings().toastPos === 'bottom' ? 'bottom' : 'top'} ${themeCls()}${settings().animations === false ? ' iw-noanim' : ''}`;
    return box;
}

// Короткое сообщение дневника — листочком в стиле темы, а не плашкой таверны (без звука)
function notice(text, who = 'Дневник') {
    showEvent({ type: 'note', who, text: String(text || '') });
}

// Смайлики «Аськи» анимируются несколько секунд (касание на телефоне, новое уведомление)
let smilePlay = null;
// после перерисовки по касанию: смайлик выбранной вкладки, открытой карточки НПС и её настроения продолжает играть
function replaySmiles(el) {
    if (!smilePlay || Date.now() > smilePlay.until) { smilePlay = null; return; }
    const left = smilePlay.until - Date.now();
    const v = smilePlay.view;
    const sel = [`[data-iw-view="${CSS.escape(v)}"]`];
    if (v.startsWith('npc:') || v.startsWith('main:') || v.startsWith('me:')) sel.push('.iw-dossier-face', '.iw-title-face', '.iw-tab.on', '.iw-tab-persona.on');
    for (const host of el.querySelectorAll(sel.join(', '))) playSmiles(host, left);
}

function playSmiles(el, ms = 3500) {
    const list = el.classList && el.classList.contains('iw-smile') ? [el] : [...el.querySelectorAll('.iw-smile')];
    for (const sm of list) {
        sm.classList.add('iw-play');
        clearTimeout(sm._iwPlay);
        sm._iwPlay = setTimeout(() => sm.classList.remove('iw-play'), ms);
    }
}

// Пока идёт разбор, события копятся здесь и после разбора показываются одним уведомлением.
let evBatch = null;

// Важность события для звука и порядка в сводке: что сильнее — то и звучит.
const EV_RANK = ['dream_done', 'fear_real', 'want_done', 'dream_change', 'trait_new', 'trait_gone', 'dream_step', 'dream_grow', 'fear_gone', 'trait_up', 'trait_down', 'impression', 'attitude', 'reward', 'night', 'rumor', 'note'];
function evRank(t) { const i = EV_RANK.indexOf(t); return i < 0 ? EV_RANK.length : i; }

// После разбора: ачивки — каждая отдельно (их редко больше одной), остальное — одним уведомлением,
// если событий больше двух; одно-два — как раньше, по отдельности.
function flushEvents(list) {
    const items = (list || []).filter(ev => ev && toastAllowed(settings(), ev.type));
    if (!items.length) return;
    if (items.length <= 2) { items.forEach((ev, i) => showEvent(ev, i * 450)); return; }
    showGroup(items);
}

function showGroup(items) {
    if (settings().popups === false) return;
    const sorted = [...items].sort((a, b) => evRank(a.type) - evRank(b.type));
    const box = toastBox();
    const wrap = document.createElement('div');
    wrap.className = 'iw-toast-wrap';
    wrap.innerHTML = renderGroupToast(sorted, currentTheme);
    let timer = null;
    const close = () => {
        if (timer) clearTimeout(timer);
        wrap.classList.add('iw-out');
        setTimeout(() => wrap.remove(), 350);
    };
    wrap.addEventListener('click', e => {
        if (e.target.closest('.iw-toast-close')) return close();
        if (e.target.closest('.iw-group-more')) {
            // раскрыли — больше не закрываем сами: человек читает
            const card = wrap.querySelector('.iw-toast-group');
            card.classList.toggle('iw-open');
            const btn = wrap.querySelector('.iw-group-more');
            btn.textContent = card.classList.contains('iw-open') ? 'свернуть' : btn.dataset.label;
            if (timer) { clearTimeout(timer); timer = null; }
            return;
        }
        const row = e.target.closest('[data-iw-ev]');
        const ev = row ? sorted[Number(row.dataset.iwEv)] : sorted[0];
        const st = currentState();
        const key = ev && st.order.find(k => sameName(k, ev.who));
        if (key) {
            const cast = splitCast(st);
            view = key === cast.personaKey ? 'me:' + key : (cast.mains.includes(key) ? 'main:' + key : 'npc:' + key);
        }
        openPanel();
        close();
    });
    box.appendChild(wrap);
    playSmiles(wrap);
    if (settings().sound !== false) playSound(sorted[0].type, currentTheme);
    timer = setTimeout(close, 14000);
}

function showEvent(ev, delay = 0) {
    // всплывашки выключены: событие всё равно записано (витрина, лента), просто не показываем
    if (settings().popups === false) return;
    // этот вид всплывашек выключен в настройках (проверочные из настроек показываем всегда)
    if (!ev.force && !toastAllowed(settings(), ev.type)) return;
    // идёт разбор — копим, ачивку показываем сразу
    if (evBatch && ev.type !== 'achievement') { evBatch.push(ev); return; }
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
        playSmiles(wrap);
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
            sectionOpen.diary.connect = true; sectionOpen.diary['connect-g0'] = true;
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
    if (pendingDiag) { try { writeDiag(id, { sent: pendingDiag, after: [] }); } catch { /* без тегов */ } pendingDiag = null; }
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
    const my = runId;
    await analyze(id);
    // лавка с автообновлением подбирается заново вместе с разбором, когда подошёл её срок
    if (my === runId && settings().shopAuto && needsRewards()) {
        await autoRewards();
        if (live && !busy && !rosterBusy && !shopBusy) setLive(null);
        renderAll();
    }
}

// Через сколько ответов будет следующий автоматический разбор (0 — не показываем: каждый ответ или только по кнопке)
function nextAnalysisIn() {
    const s = settings();
    const every = Number(s.every) || 0;
    if (every <= 1 || !s.enabled || !hasChat()) return 0;
    return every - ((chatMeta().counter || 0) % every);
}

// Сообщение игрока: «прошло два дня», «наутро», отметка времени — часы сдвигаются сразу, ещё до ответа бота,
// чтобы бот писал уже в новом времени. Обычного шага за сообщение игрока нет — его даёт ответ бота.
function stepUserClock(messageId) {
    const s = settings();
    if (s.clock === false || !hasChat()) return false;
    const chat = ctx().chat || [];
    const mes = chat[messageId];
    if (!mes || !mes.is_user || !mes.mes || clockRecOf(mes)) return false;
    const prev = findClock(messageId);
    const cal = chatMeta().calendar || prev.cal || null;
    if (!cal) return false;
    const cur = prev.t ? normTime(cal, prev.t) : null;
    if (!cur || chatMeta().clockLocked) return false;
    const res = advance(cal, cur, [mes.mes], { step: 0 });
    if (!res || !res.t || res.why === 'same') return false;
    writeClock(messageId, { t: res.t, prev: cur, why: res.why, size: toMinutes(cal, res.t) - toMinutes(cal, cur), user: true });
    ctx().saveMetadataDebounced?.();
    return true;
}

function onGenerationStarted(type, _options, dryRun) {
    if (dryRun) return;
    if (type !== 'swipe' && type !== 'regenerate' && hasChat()) {
        try {
            const chat = ctx().chat || [];
            const lastId = chat.length - 1;
            if (chat[lastId] && chat[lastId].is_user && stepUserClock(lastId)) saveChatSoon();
        } catch (e) { console.warn('[Внутренний мир] часы по сообщению игрока', e); }
    }
    // При свайпе и перегенерации прячем то, что было посчитано по заменяемому ответу.
    if (type === 'swipe' || type === 'regenerate') {
        const last = lastBotMessageId();
        updateInjection(last >= 0 ? last : undefined);
    } else {
        updateInjection();
    }
    // что именно ушло модели перед этим ответом — для тегов влияния
    pendingDiag = snapshotDiag();
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
    const parts = themeParts(validTheme(settings().theme));
    currentTheme = parts.base;
    currentDark = parts.dark;
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
    fab.classList.toggle('iw-dark', currentDark);
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
        el.addEventListener('pointerdown', onBlockDragStart);
        el.addEventListener('change', onPanelChange);
        el.addEventListener('input', onPanelInput);
        el.addEventListener('toggle', e => {
            rememberSection('diary', e.target);
            // витрина: какие разделы свёрнуты — запоминаем
            const d = e.target;
            if (d && d.matches && d.matches('details[data-iw-hist]')) histOpen[d.dataset.iwHist] = d.open;
            if (d && d.matches && d.matches('details[data-iw-tile]')) { if (d.open) caseSel = d.dataset.iwTile; else if (caseSel === d.dataset.iwTile) caseSel = ''; }
            if (d && d.matches && d.matches('details[data-iw-case]')) { const s = settings(); s.caseFold = Object.assign({}, s.caseFold || {}, { [d.dataset.iwCase]: d.open }); saveSettings(); }
            masonrySoon();
        }, true);
        window.addEventListener('resize', masonrySoon);
        try { document.fonts && document.fonts.ready.then(masonrySoon); } catch { /* без шрифтов */ }
        new MutationObserver(() => { if (!el.hidden) masonrySoon(); }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
    }
    return el;
}

function isOpen() {
    const el = byId('iw_panel');
    return !!el && !el.hidden;
}

// ---------- Перетаскивание блоков за «ручку» в заголовке: порядок общий для всех страниц ----------
let blockDrag = null;
let dragRenderPending = false;
function onBlockDragStart(e) {
    const grip = e.target.closest && e.target.closest('.iw-drag');
    if (!grip || (e.button !== undefined && e.button > 0)) return;
    const block = grip.closest('.iw-block');
    const grid = block && block.closest('.iw-grid');
    if (!block || !grid) return;
    e.preventDefault();
    const scroller = isPhone() ? panelEl().querySelector('.iw-book') : panelEl().querySelector('.iw-body');
    const d = blockDrag = { kind: grip.dataset.iwDrag, block, grid, x0: e.clientX, y0: e.clientY, s0: scroller ? scroller.scrollTop : 0, target: null, after: false, x: e.clientX, y: e.clientY, raf: 0 };
    block.classList.add('iw-block-dragging');
    try { grip.setPointerCapture(e.pointerId); } catch { /* старые браузеры */ }
    const clearMarks = () => grid.querySelectorAll('.iw-drop-before, .iw-drop-after').forEach(x => x.classList.remove('iw-drop-before', 'iw-drop-after', 'iw-drop-side'));
    const paint = () => {
        d.raf = 0;
        const ds = scroller ? scroller.scrollTop - d.s0 : 0;
        block.style.transform = `translate(${d.x - d.x0}px, ${d.y - d.y0 + ds}px)`;
        // цель — блок, на который наехал сам перетаскиваемый блок (больше всего перекрытия),
        // а если ни на какой не наехал — ближайший к его середине. Палец может быть где угодно на блоке.
        const me = block.getBoundingClientRect();
        const cx = me.left + me.width / 2, cy = me.top + me.height / 2;
        let tgt = null, bestOver = 0, bestDist = Infinity, near = null;
        for (const b of grid.children) {
            if (b === block || !b.classList.contains('iw-block')) continue;
            const r = b.getBoundingClientRect();
            const ox = Math.max(0, Math.min(me.right, r.right) - Math.max(me.left, r.left));
            const oy = Math.max(0, Math.min(me.bottom, r.bottom) - Math.max(me.top, r.top));
            const over = (ox * oy) / Math.max(1, Math.min(me.width * me.height, r.width * r.height));
            if (over > bestOver) { bestOver = over; tgt = b; }
            const dist = (cx - (r.left + r.width / 2)) ** 2 + (cy - (r.top + r.height / 2)) ** 2;
            if (dist < bestDist) { bestDist = dist; near = b; }
        }
        if (bestOver < 0.12) tgt = near;
        clearMarks();
        d.target = null;
        if (!tgt || tgt === block) return;
        const r = tgt.getBoundingClientRect();
        const half = r.width < grid.getBoundingClientRect().width * 0.7;
        // как в списках с перетаскиванием: наехал на блок — занимаешь его место (он сдвигается в твою сторону)
        const kids = [...grid.children];
        d.after = kids.indexOf(block) < kids.indexOf(tgt);
        d.target = tgt;
        tgt.classList.add(d.after ? 'iw-drop-after' : 'iw-drop-before');
        tgt.classList.toggle('iw-drop-side', half);
        // у краёв — листаем дневник
        if (scroller) {
            const sr = scroller.getBoundingClientRect();
            if (d.y < sr.top + 50) scroller.scrollTop -= 14;
            else if (d.y > sr.bottom - 50) scroller.scrollTop += 14;
        }
    };
    const move = ev => {
        d.x = ev.clientX;
        d.y = ev.clientY;
        if (!d.raf) d.raf = requestAnimationFrame(paint);
    };
    const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        if (d.raf) cancelAnimationFrame(d.raf);
        clearMarks();
        block.classList.remove('iw-block-dragging');
        block.style.transform = '';
        blockDrag = null;
        const kindOf = el => ((el && el.className || '').match(/iw-b-([a-z]+)/) || [])[1] || '';
        const to = kindOf(d.target);
        if (to && to !== d.kind) {
            const order0 = orderOfBlocks(settings().blockOrder);
            const after = order0.indexOf(d.kind) < order0.indexOf(to);
            const order = order0.filter(k => k !== d.kind);
            const at = order.indexOf(to);
            order.splice(after ? at + 1 : at, 0, d.kind);
            settings().blockOrder = order;
            saveSettings();
            dragRenderPending = true;
        }
        if (dragRenderPending) { dragRenderPending = false; renderPanelNow(); }
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
}

function renderPanelNow() {
    const el = panelEl();
    if (el.hidden) return;
    // пока блок тащат — не перерисовываем (иначе он выскочит из-под пальца); догоним после
    if (blockDrag) { dragRenderPending = true; return; }
    const s = settings();
    if (!hasChat() && view !== 'settings') {
        el.className = `iw-panel ${themeCls()}${s.animations === false ? ' iw-noanim' : ''}`;
        el.lang = 'ru';
        el.innerHTML = renderPanel({ state: emptyState(), settings: s, theme: currentTheme, view: '', busy: false, status: '', mains: [], npcKeys: [], roster: null, noChat: true });
        watchHead(el);
        return;
    }
    const state = (live && live.preview) || liveState();
    // ориентация из карточки видна сразу, даже до следующего разбора (запишется при нём)
    if (!(live && live.preview)) { fillOrientFromCards(state); fixZodiacs(state); }
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
    el.className = `iw-panel ${themeCls()}${s.animations === false ? ' iw-noanim' : ''}`;
    const keepScroll = readScroll(el);
    const hs = showNpc ? historySeen() : { seen: [], pending: [] };
    const seenOnly = hs.seen.filter(e => !isIgnored(e.name))
        .filter(e => !npcKeys.some(k => namesMatch(k, e.name) || rosterFind(roster(), k) === e))
        .map(e => Object.assign({}, e, { checked: !hs.pending.includes(e) }));
    el.innerHTML = renderPanel({ state, settings: s, theme: currentTheme, view, busy, busyKind, dreamBusy, shopBusy, status, avatarFor, mains, npcKeys, persona, roster: roster(), rosterBusy, seenOnly, settingsHtml: view === 'settings' ? settingsFormHtml('diary') : '', books: worldNames, picked: pickedBooks(), linked: linkedBooks, off: offBooks(), live, attrMode, attrOpen, attrMore, working: busy || rosterBusy || dreamBusy || shopBusy || !!wishBusy, wishBusy: wishBusy && wishBusy === viewKey() ? wishBusy : '', mobile: isPhone(), clock: safeClockView(), nextIn: nextAnalysisIn(), showcase: showcaseModel(), ignored: hasChat() ? ignoredNames() : [], giftTo, love: loveScoreInfo(), rumors: hasChat() && settings().rumors !== false ? (chatMeta().rumors || []) : null, memes: hasChat() && settings().memes !== false ? { list: chatMeta().memes || [], drawing: [...memeDrawing], rerolling: [...memeRerolling], img: !!memeImgCfg(), every: Math.max(1, Number(settings().memeEvery) || 6) } : null, nights: settings().dreams !== false, histOpen });
    masonry(el);
    writeScroll(el, keepScroll);
    replaySmiles(el);
    watchHead(el);
}

// Телефон: плавающий крестик показываем, только когда шапка с настройками уехала вверх
let headObs = null;
function watchHead(el) {
    if (headObs) { headObs.disconnect(); headObs = null; }
    const head = el && el.querySelector('.iw-head');
    if (!head || typeof IntersectionObserver === 'undefined') { if (el) el.classList.remove('iw-head-gone'); return; }
    headObs = new IntersectionObserver(es => {
        for (const e of es) el.classList.toggle('iw-head-gone', !e.isIntersecting);
    }, { threshold: 0 });
    headObs.observe(head);
}

// Блоки дневника «кирпичиком»: у каждого высота в мелких рядах сетки, короткие встают под короткими —
// без пустых провалов рядом с высокими соседями. Блоки остаются на своих местах в DOM (перетаскивание работает).
const MASONRY_ROW = 4;
const MASONRY_GAP = 16;
// Эти блоки всегда стоят рядом, в одном ряду (вторым вытягивается по высоте первого)
const MASONRY_PAIRS = [['mood', 'impression'], ['wants', 'fears']];
function masonry(el) {
    if (!el) return;
    for (const grid of el.querySelectorAll('.iw-grid')) {
        const kids = [...grid.children].filter(k => k.classList.contains('iw-block'));
        const reset = () => { grid.classList.remove('iw-masonry'); for (const k of kids) { k.style.gridRowStart = ''; k.style.gridRowEnd = ''; k.style.gridColumn = ''; k.style.minHeight = ''; } };
        if (isPhone() || kids.length < 3 || !grid.getClientRects().length || grid.getBoundingClientRect().width < 500) { reset(); continue; }
        reset();
        grid.classList.add('iw-masonry');
        const kind = k => (k.className.match(/iw-b-([a-z]+)/) || [])[1] || '';
        // высоту меряем уже на ширине одной колонки: на всю ширину блок ниже, и потом текст вылезал бы за рамку
        const rows = k => { if (k.style.gridColumn !== '1 / -1') k.style.gridColumn = k.style.gridColumn || '1'; return Math.max(1, Math.ceil((k.offsetHeight + MASONRY_GAP) / MASONRY_ROW)); };
        const col = [1, 1]; // следующая свободная строка в каждой колонке
        for (let i = 0; i < kids.length; i++) {
            const k = kids[i];
            // широкие блоки (во всю ширину по стилю темы или одиночки) так и остаются широкими
            const cs = getComputedStyle(k);
            const stackable = ['life', 'nights', 'rumors', 'memes'].includes(kind(k)) && !k.classList.contains('iw-collapsed');
            const solo = !stackable && (k.classList.contains('iw-solo') || cs.gridColumnEnd === '-1' || /span\s*2/.test(cs.gridColumnEnd) || cs.gridColumnStart === 'span 2');
            if (solo) {
                const at = Math.max(col[0], col[1]);
                k.style.gridColumn = '1 / -1';
                k.style.gridRowEnd = '';
                k.style.gridRowStart = at;
                k.style.gridRowEnd = `span ${rows(k)}`;
                col[0] = col[1] = at + rows(k);
                continue;
            }
            const next = kids[i + 1];
            const paired = next && !next.classList.contains('iw-solo') && MASONRY_PAIRS.some(([x, y]) => (kind(k) === x && kind(next) === y) || (kind(k) === y && kind(next) === x));
            if (paired) {
                const at = Math.max(col[0], col[1]);
                const span = Math.max(rows(k), rows(next));
                [k, next].forEach((b, c) => {
                    b.style.gridColumn = String(c + 1);
                    b.style.gridRowStart = at;
                    b.style.gridRowEnd = `span ${span}`;
                    // «Отношение к тебе» держит свою высоту и не тянется за «Настроением»
                    if (kind(b) !== 'impression' && kind(b) !== 'mood') b.style.minHeight = `${span * MASONRY_ROW - MASONRY_GAP}px`;
                });
                col[0] = col[1] = at + span;
                i++;
                continue;
            }
            // подряд идущие «свободные» блоки (семья, сны, слухи, мемы) раскладываем по колонкам так,
            // чтобы колонки вышли как можно ровнее — без пустоты сбоку
            const run = [k];
            while (i + run.length < kids.length) {
                const n = kids[i + run.length];
                if (!['life', 'nights', 'rumors', 'memes'].includes(kind(n)) || n.classList.contains('iw-collapsed')) break;
                run.push(n);
            }
            if (run.length >= 2 && run.length <= 8 && run.every(b => ['life', 'nights', 'rumors', 'memes'].includes(kind(b)) && !b.classList.contains('iw-collapsed'))) {
                const h = run.map(rows);
                let best = null;
                for (let mask = 0; mask < (1 << run.length); mask++) {
                    const t = [col[0], col[1]];
                    for (let j = 0; j < run.length; j++) t[(mask >> j) & 1] += h[j];
                    const score = Math.max(t[0], t[1]) * 1000 + Math.abs(t[0] - t[1]);
                    if (!best || score < best.score) best = { mask, score };
                }
                for (let j = 0; j < run.length; j++) {
                    const c = (best.mask >> j) & 1;
                    run[j].style.gridColumn = String(c + 1);
                    run[j].style.gridRowStart = col[c];
                    run[j].style.gridRowEnd = `span ${h[j]}`;
                    col[c] += h[j];
                }
                i += run.length - 1;
                continue;
            }
            const c = col[0] <= col[1] ? 0 : 1;
            const r = rows(k);
            k.style.gridColumn = String(c + 1);
            k.style.gridRowStart = col[c];
            k.style.gridRowEnd = `span ${r}`;
            col[c] += r;
        }
        // если содержимое блока потом выросло (картинка, шрифт, новая запись) — раскладываем заново
        if (typeof ResizeObserver === 'function') {
            if (!grid._iwRO) grid._iwRO = new ResizeObserver(list => { if (list.some(e => e.target.isConnected && Math.abs(e.target.offsetHeight - (Number(e.target.dataset.iwH) || 0)) > 4)) masonrySoon(); });
            for (const k of kids) { k.dataset.iwH = String(k.offsetHeight); grid._iwRO.observe(k); }
        }
    }
}
let masonryTimer = null;
function masonrySoon() {
    clearTimeout(masonryTimer);
    masonryTimer = setTimeout(() => { const el = panelEl(); if (el && !el.hidden) masonry(el); }, 60);
}

// ---------- Витрина: достижения истории ----------
// Полученные хранятся в метаданных чата: { id: { at, scene } }. Новые всплывают уведомлением.
function showcaseModel() {
    if (!hasChat()) return null;
    const meta = chatMeta();
    const s = settings();
    return { got: Array.isArray(meta.achList) ? meta.achList : [], sel: caseSel, fresh: (meta.achNew || []).length, fold: s.caseFold || {}, art: s.caseArt !== false, artBusy, view: s.caseView === 'grid' ? 'grid' : 'list' };
}

// ---------- Картинки памятных вещей ----------
let artBusy = '';
// очередь сам-рисования: купил несколько вещей подряд — рисуются по очереди, а не только первая
let artQueue = [];
function nextArt() {
    while (artQueue.length && !artBusy) {
        const q = artQueue.shift();
        const ch = currentState().characters[q.key];
        if (!ch) continue;
        let idx = -1;
        if (q.buff) { idx = (ch.buffs || []).findIndex(b => b && b.kind === 'gift' && b.title === q.title && !b.art); if (idx >= 0) idx = 'b' + idx; }
        else { const list = ch.collection || []; for (let j = list.length - 1; j >= 0; j--) if (list[j] && list[j].title === q.title && !list[j].art) { idx = j; break; } }
        if (idx === -1) continue;
        drawItemArt(q.key, idx, { quiet: true });
        return;
    }
}
async function drawItemArt(key, i, { quiet = false } = {}) {
    if (settings().caseArt === false) return;
    const st0 = currentState();
    const ch0 = st0.characters[key];
    // подарок, который ещё не вручён, живёт в buffs: номер вида «b3»
    const isBuff = typeof i === 'string' && i.startsWith('b');
    const bi = isBuff ? Number(i.slice(1)) : -1;
    const item0 = ch0 && (isBuff ? (ch0.buffs || [])[bi] : (ch0.collection || [])[i]);
    if (!item0) return;
    if (artBusy) {
        // рисуется другая вещь: сам-рисование ставим в очередь, нажатие кнопки — просто ждёт своей очереди тоже
        if (!artQueue.some(q => q.key === key && q.title === item0.title)) artQueue.push({ key, title: item0.title, buff: isBuff });
        return;
    }
    const my = runId;
    artBusy = `${key}:${i}`;
    renderAll();
    try {
        const story = (ctx().chat || []).filter(m => m && !m.is_system).slice(-4).map(m => `${m.name}: ${cleanMessageText(m.mes || '', 500)}`).join('\n');
        const { system, user } = buildArtPrompt(item0, ch0.name, story, settings().language);
        const raw = await callModel(system, user, withBudget('art'));
        const svg = cleanArt(raw, `${Date.now().toString(36)}${i}`);
        if (!svg) throw new Error('модель не прислала картинку');
        const st = currentState();
        const ch = st.characters[key];
        const item = ch && (isBuff ? (ch.buffs || [])[bi] : (ch.collection || [])[i]);
        if (!item || item.title !== item0.title) return;
        item.art = svg;
        await saveEditedState(st);
    } catch (err) {
        if (err && err.cancelled) return;
        console.warn('[Внутренний мир] картинка вещи', err);
        if (!quiet) notice('Картинка не нарисовалась — попробуй ещё раз');
    } finally {
        if (my === runId || artBusy) { artBusy = ''; renderAll(); }
        if (my === runId) setTimeout(nextArt, 200); else artQueue = [];
    }
}
// «Нарисовать все»: по очереди, по одной просьбе на вещь; остановить можно кнопкой стоп
async function drawAllArt(which = 'items') {
    const fits = x => (which === 'gifts' ? !!x.gift : !x.gift);
    if (artBusy || settings().caseArt === false) return;
    const my = runId;
    const st = currentState();
    const todo = [];
    for (const k of st.order || []) (st.characters[k] && st.characters[k].collection || []).forEach((x, i) => { if (fits(x) && !x.art) todo.push([k, i]); });
    if (which === 'gifts') for (const k of st.order || []) (st.characters[k] && st.characters[k].buffs || []).forEach((b, bi) => { if (b && b.kind === 'gift' && !b.art) todo.push([k, 'b' + bi]); });
    // рисуем только ненарисованные; перерисовать — кнопкой у самой вещи
    if (!todo.length) return notice('Всё уже нарисовано. Перерисовать можно кнопкой у самой вещи.');
    let n = 0;
    for (const [k, i] of todo) {
        if (my !== runId) break;
        await drawItemArt(k, i, { quiet: true });
        { const cc = currentState().characters[k]; const it = cc && (String(i).startsWith('b') ? (cc.buffs || [])[Number(String(i).slice(1))] : (cc.collection || [])[i]); if (it && it.art) n++; }
    }
    if (todo.length) notice(n === todo.length ? `Нарисовано: ${n}` : `Нарисовано ${n} из ${todo.length} — остальные можно дорисовать ещё раз`);
}

// после покупки или подарка: рисуем новую вещь сами, если так выбрано в настройках
// (иначе — только по кнопке «нарисовать» у самой вещи)
function artAuto(kind) {
    const s = settings();
    if (s.caseArt === false) return false;
    return kind === 'gift' ? s.artAutoGifts !== false : s.artAutoItems !== false;
}
function drawNewItem(target, kind = 'item', delay = 300) {
    if (!artAuto(kind) || !target || !Array.isArray(target.collection)) return;
    const title = (target.collection[target.collection.length - 1] || {}).title;
    const name = target.name;
    setTimeout(() => {
        // ищем вещь заново: к этому времени дневник мог уже переписать запись
        const st = currentState();
        const key = Object.keys(st.characters).find(k => st.characters[k] && st.characters[k].name === name);
        const list = key && st.characters[key].collection || [];
        let i = -1;
        for (let j = list.length - 1; j >= 0; j--) if (list[j] && list[j].title === title) { i = j; break; }
        if (i >= 0 && !list[i].art) drawItemArt(key, i, { quiet: true });
    }, delay);
}

function seenAchievements() {
    const meta = chatMeta();
    if (meta.achNew && meta.achNew.length) {
        meta.achNew = [];
        ctx().saveMetadataDebounced?.();
    }
}

// Подарок вручён: снимаем листочек «подарит», кладём вещь в коллекцию персоны
function takeGifts(raw, state) {
    let data = null;
    try { data = extractJson(raw); } catch { return; }
    const list = data && !Array.isArray(data) && Array.isArray(data.gift_given) ? data.gift_given : [];
    if (!list.length) return;
    const norm = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const pk = splitCast(state).personaKey;
    const pc = pk && state.characters[pk];
    for (const g of list) {
        for (const k of state.order || []) {
            const ch = state.characters[k];
            const b = ch && (ch.buffs || []).find(x => x.kind === 'gift' && (norm(x.title) === norm(g && g.title) || norm(g && g.title).includes(norm(x.title)) || norm(x.title).includes(norm(g && g.title))));
            if (!b) continue;
            ch.buffs = ch.buffs.filter(x => x !== b);
            if (pc) { pc.collection = (pc.collection || []).concat([Object.assign({ title: b.title, icon: b.icon, desc: `Подарок от ${ch.name}${g.how ? `: ${String(g.how).slice(0, 140)}` : ''}`, got: Date.now(), gift: true }, b.art ? { art: b.art } : {})]).slice(-30); if (!b.art) drawNewItem(pc, 'gift', 6000); }
            showEvent({ type: 'reward', who: ch.name, text: `«${b.title}» — подарено${pc ? `, теперь в коллекции ${pc.name}` : ''}`, icon: b.icon }, 300);
            break;
        }
    }
}

// Достижение из ответа модели — на полку витрины и всплывающим листочком
// Погода, сон, слух — то, что модель вернула рядом с characters
function weatherText(w) {
    if (!w) return '';
    return [w.sky, w.temp !== null && w.temp !== undefined ? `${w.temp > 0 ? '+' : ''}${w.temp}°` : '', w.note].filter(Boolean).join(', ');
}
function takeExtras(raw, state, messageId) {
    let data = null;
    try { data = extractJson(raw); } catch { return; }
    if (!data || Array.isArray(data)) return;
    const s = settings();
    const meta = chatMeta();
    const now = clockNow(messageId + 1);
    const day = now && now.cal && now.t && now.cal.type !== 'days' ? { y: now.t.y, m: now.t.m, d: now.t.d } : (now && now.t ? { d: now.t.d } : null);
    const dateText = now && now.cal && now.t ? fmtDate(now.cal, now.t) : '';
    let changed = false;
    const w = s.weather !== false && cleanWeather(data.weather);
    if (w) {
        meta.weather = Object.assign(w, { day });
        changed = true;
        // погода этого сообщения — для инфоблока в чате (у старых сообщений своя погода)
        const mes = (ctx().chat || [])[messageId];
        if (mes) { mes.extra = mes.extra || {}; mes.extra[WX_KEY] = clone(meta.weather); }
    }
    // сны: по одному на каждого, кто спал; за одну ночь (одну дату сцены) у героя — один сон
    const dreams = s.dreams !== false ? cleanNightDreams(data.night_dream) : [];
    const night = day ? JSON.stringify(day) : '';
    let delay = 900;
    for (const nd of dreams) {
        const key = Object.keys(state.characters || {}).find(k => sameName(k, nd.who) || sameName(state.characters[k].name, nd.who) || namesMatch(state.characters[k].name, nd.who));
        const c = key && state.characters[key];
        if (!c) continue;
        if (c.persona && s.persona === false) continue;
        const list = c.dreams || [];
        const last = list[list.length - 1];
        if (last && (last.text === nd.text || (night && last.night === night))) continue;
        const rec = Object.assign(nd, { date: dateText, night, at: Date.now(), mes: messageId });
        delete rec.who;
        c.dreams = [...list, rec].slice(-8);
        showEvent({ type: 'night', who: c.name, text: nd.text, icon: 'moon' }, delay);
        delay += 600;
    }
    const r = s.rumors !== false && cleanRumor(data.rumor);
    if (r && !(meta.rumors || []).some(x => x.text === r.text)) {
        meta.rumors = [...(meta.rumors || []), Object.assign(r, { date: dateText, mes: messageId, at: Date.now() })].slice(-12);
        changed = true;
        showEvent({ type: 'rumor', who: r.who || r.source || 'Слухи', text: r.text, icon: 'chat', rumor: r, plain: r.form === 'dialog' || r.form === 'news' ? rumorPlain(r) : '' }, 1200);
    }
    const mm = s.memes !== false && cleanMeme(data.meme);
    if (mm && !(meta.memes || []).some(x => memePlain(x) === memePlain(mm))) {
        const rec = Object.assign(mm, { date: dateText, mes: messageId, at: Date.now() });
        meta.memes = [...(meta.memes || []), rec].slice(-20);
        changed = true;
        // без всплывашки: мем виден в блоке «Мемы» и, если включено, в инфоблоке этого ответа; картинка — только по кнопке
    }
    if (changed) ctx().saveMetadataDebounced?.();
}

// ---------- Картинки к мемам ----------
function memeImgCfg() {
    const s = settings();
    if (!s.memeImg || s.memeImg === 'none') return null;
    // только имя расширения: ключ и адрес читаются из его настроек в момент запроса
    const list = findImageExtensions(ctx().extensionSettings).filter(e => e.ok);
    const pick = list.find(e => e.key === s.memeImgExt) || list[0];
    return pick ? { kind: 'ext', extKey: pick.key } : null;
}
// Кто нарисован на меме: имя + файл аватарки карточки или персоны, чтобы расширение картинок нашло их внешность
function memePeople(names) {
    const c = ctx();
    const out = [];
    const cards = (c.characters || []).filter(Boolean);
    for (const name of names || []) {
        if (c.name1 && (sameName(name, c.name1) || namesLookAlike(name, c.name1))) { out.push({ name, persona: (personasMod && personasMod.user_avatar) || '' }); continue; }
        let file = '';
        if (!c.groupId && c.characterId !== undefined && isMain(name, mainNames())) file = (c.characters[c.characterId] || {}).avatar || '';
        if (!file) { const ch = cards.find(x => sameName(x.name, name) || namesLookAlike(x.name, name)); if (ch) file = ch.avatar || ''; }
        out.push({ name, char: file });
    }
    return out;
}
const memeDrawing = new Set();
const memeRerolling = new Set();
// «Другой мем»: отдельная короткая просьба к модели дневника — новый мем к той же сцене на месте старого
async function rerollMeme(at) {
    if (!hasChat() || memeRerolling.has(at)) return;
    const chatId = ctx().getCurrentChatId?.();
    const list0 = chatMeta().memes || [];
    const m0 = list0.find(x => x.at === at);
    if (!m0) return;
    memeRerolling.add(at);
    renderAll();
    try {
        const c = ctx();
        const chat = c.chat || [];
        const upto = Number.isInteger(m0.mes) && m0.mes >= 0 ? Math.min(m0.mes, chat.length - 1) : chat.length - 1;
        const msgs = [];
        for (let i = upto; i >= 0 && msgs.length < 6; i--) {
            const m = chat[i];
            if (!m || m.is_system || !m.mes) continue;
            msgs.unshift(`${m.name}: ${cleanMessageText(m.mes, 1200)}`);
        }
        const st = currentState();
        const cast = (st.order || []).slice(0, 6).map(k => st.characters[k]).filter(Boolean).map(ch => `${ch.name}${ch.persona ? ' (персонаж игрока)' : ''}${ch.mood ? ` — ${ch.mood}` : ''}`);
        const others = list0.filter(x => x.at !== at).slice(-4).map(memePlain);
        const { system, user } = buildMemePrompt({ messages: msgs, cast, recent: [m0.format, ...list0.slice(-6).map(x => x.format)], texts: others, was: memePlain(m0) }, settings().language || 'русском');
        const raw = await callModel(system, user, withBudget('rewards'));
        const data = extractJson(raw);
        const mm = cleanMeme((data && data.meme) || data);
        if (!mm) throw new Error('модель не прислала мем');
        if (ctx().getCurrentChatId?.() !== chatId) return;
        const meta = chatMeta();
        const idx = (meta.memes || []).findIndex(x => x.at === at);
        if (idx < 0) return;
        const old = meta.memes[idx];
        meta.memes[idx] = Object.assign(mm, { date: old.date, mes: old.mes, at: Date.now() });
        ctx().saveMetadataDebounced?.();
    } catch (err) {
        if (err && err.cancelled) return;
        console.warn('[Внутренний мир] другой мем', err);
        notice(`Другой мем не получился: ${String(err && err.message || err).slice(0, 160)}`);
    } finally {
        memeRerolling.delete(at);
        renderAll();
    }
}
async function drawMemeImage(at, { manual = false } = {}) {
    const cfg = memeImgCfg();
    if (!cfg || !hasChat() || memeDrawing.has(at)) return;
    const chatId = ctx().getCurrentChatId?.();
    const m0 = (chatMeta().memes || []).find(x => x.at === at);
    if (!m0) return;
    memeDrawing.add(at);
    renderAll();
    try {
        // старые мемы без описания картинки — рисуем по самому мему
        const prompt = `Funny internet meme picture, expressive and comedic, bold simple composition, no text, no letters, no watermark. ${m0.img || `A funny reaction picture for this meme: ${memePlain(m0)}`}`;
        const src = await generateImage(prompt, Object.assign({ people: memePeople(m0.cast) }, cfg), ctx());
        if (ctx().getCurrentChatId?.() !== chatId) return;
        const m = (chatMeta().memes || []).find(x => x.at === at);
        if (!m || !src) return;
        m.pic = src;
        ctx().saveMetadataDebounced?.();
    } catch (err) {
        console.warn('[Внутренний мир] картинка мема', err);
        if (manual) notice(`Картинка к мему не нарисовалась: ${String(err && err.message || err).slice(0, 160)}`);
    } finally {
        memeDrawing.delete(at);
        renderAll();
    }
}

function takeAchievement(raw, messageId) {
    if (settings().achievements === false) return;
    let data = null;
    try { data = extractJson(raw); } catch { return; }
    const a = cleanAchievement(data && !Array.isArray(data) ? data.achievement : null);
    if (!a) return;
    const meta = chatMeta();
    // подарок вручён — ачивка всегда; остальное — по частоте из настроек
    const giftMoment = !!(data && Array.isArray(data.gift_given) && data.gift_given.length);
    if (!giftMoment && !achGate(a, meta.achList, messageId, settings())) return;
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

// ---------- Инфоблок внутри чата ----------
// В начале каждого ответа бота — тонкая плашка в стиле темы: время, дата, погода, праздник и настроения
// на момент ЭТОГО сообщения. У каждой плашки свой теневой DOM со стилями дневника; в текст сообщения
// и в запрос к модели она не попадает.
const ibOpen = new Set();
const ibTab = new Map(); // какой герой открыт в развёрнутом инфоблоке
const WEIGHT_RANK_IB = { deep: 3, medium: 2, light: 1 };
const WX_KEY = 'inner_world_wx';

// Погода на момент сообщения: ближайшая записанная до него (или общая погода чата).
function weatherAt(id) {
    const chat = ctx().chat || [];
    for (let i = id; i >= 0 && i > id - 60; i--) {
        const w = chat[i] && chat[i].extra && chat[i].extra[WX_KEY];
        if (w) return w;
    }
    return chatMeta().weather || null;
}

function infobarModelFor(id) {
    const s = settings();
    const chat = ctx().chat || [];
    let clock = null;
    if (s.clock !== false) {
        try {
            const now = clockNow(id + 1);
            if (now && now.cal && now.t) {
                const { cal, t } = now;
                const st0 = peekState(id + 1);
                const people = clockPeople(st0);
                const daysWord = n => { const x = n % 100, y = n % 10; return x > 10 && x < 20 ? 'дней' : (y === 1 ? 'день' : (y >= 2 && y <= 4 ? 'дня' : 'дней')); };
                const ev = upcoming(cal, t, people, 14).map(e => Object.assign(e, { dateText: evDateText(cal, e), inDaysText: `${e.inDays} ${daysWord(e.inDays)}` }));
                clock = { t, time: fmtTime(t), part: partOfDay(t.h), date: fmtDate(cal, t), wx: weatherChip(cal, t, weatherAt(id)), today: ev.filter(e => e.inDays === 0), upcoming: ev };
            }
        } catch (e) { console.warn('[Внутренний мир] инфоблок: часы', e); }
    }
    const cast = [];
    try {
        const st = peekState(id + 1);
        const { mains, personaKey } = splitCast(st);
        const live = arr => (arr || []).filter(x => x && x.text && (!x.status || x.status === 'active'));
        for (const k of [...mains, personaKey].filter(Boolean)) {
            const c = st.characters[k];
            if (!c) continue;
            const persona = !!c.persona || k === personaKey;
            const [face, face2] = c.mood ? moodFaces(c) : ['neutral', null];
            const byWeight = [...(c.moodlets || [])].sort((a, b) => (WEIGHT_RANK_IB[b.weight] || 2) - (WEIGHT_RANK_IB[a.weight] || 2));
            const wants = live(c.wants).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 2).map(w => w.text);
            const fears = live(c.fears).sort((a, b) => (b.strength || 1) - (a.strength || 1)).slice(0, 2).map(f => f.text);
            const imp = c.impression || {};
            const now = c.chemNow ? c.chemNow.score : null;
            const attitude = imp.now || imp.why || imp.label || '';
            // у твоего героя — как он(а) относится к персонажу: «К нему» / «К ней»
            const bot = mains[0] && st.characters[mains[0]];
            const attCap = persona && bot ? `К ${gw(genderOf(bot.g, bot.name, bot.who), 'нему', 'ней', 'нему')}` : '';
            const chem = !persona && now !== null && CHEM_NOW_NAMES[now] ? CHEM_NOW_NAMES[now] : '';
            const night = (c.dreams || [])[(c.dreams || []).length - 1];
            cast.push({
                key: k, name: c.name, mood: c.mood || '', face, face2, persona,
                feels: byWeight.slice(0, 3).map(m => ({ e: m.emotion, w: m.weight, why: m.why || '' })),
                status: !persona ? relStatus(c.rel || seedRel(c), !!c.impression).label : '',
                rel: !persona && c.impression && !c.unmet ? (c.rel || seedRel(c)) : null,
                wants, fears,
                attitude, attCap, chem, chemTone: now > 0 ? 'pos' : (now < 0 ? 'neg' : 'mid'),
                night: night && night.text ? { text: night.text, date: night.date || '' } : null,
                dream: c.dream && c.dream.title ? c.dream.title : '',
                traits: (c.traits || []).filter(t => t && t.name && t.kind !== 'gone').slice(0, 4).map(t => t.name),
                life: c.life ? lifeTextIb(c.life) : '',
            });
        }
    } catch (e) { console.warn('[Внутренний мир] инфоблок: герои', e); }
    // что изменилось в дневнике после этого ответа (сравнение с записью до него)
    const changes = [];
    try {
        const st = peekState(id + 1);
        const was = peekState(id);
        if (st !== was && st.order) {
            const { mains, personaKey } = splitCast(st);
            const txt = arr => new Map((arr || []).filter(x => x && x.text).map(x => [x.text, x.status || 'active']));
            for (const k of [...mains, personaKey].filter(Boolean)) {
                const c = st.characters[k];
                const o = was.characters && was.characters[k];
                if (!c || !o) continue;
                const who = ibShortName(c.name);
                const nw = txt(c.wants), ow = txt(o.wants);
                for (const [t, stt] of nw) {
                    if (!ow.has(t) && stt === 'active') changes.push({ who, kind: 'want', sign: '+', text: t });
                    else if (ow.get(t) === 'active' && stt === 'done') changes.push({ who, kind: 'want', sign: '✓', text: t });
                }
                const nf = txt(c.fears), of = txt(o.fears);
                for (const [t, stt] of nf) {
                    if (!of.has(t) && stt === 'active') changes.push({ who, kind: 'fear', sign: '+', text: t });
                    else if (of.get(t) === 'active' && stt === 'gone') changes.push({ who, kind: 'fear', sign: '−', text: t });
                }
                const ni = c.impression || {}, oi = o.impression || {};
                if (!c.persona && ni.now && ni.now !== oi.now && ((ni.nowScore ?? ni.score) !== (oi.nowScore ?? oi.score))) changes.push({ who, kind: 'att', sign: '~', text: ni.now });
                const ot = new Set((o.traits || []).map(t => t && t.name));
                for (const t of c.traits || []) if (t && t.name && !ot.has(t.name) && t.kind !== 'gone') changes.push({ who, kind: 'trait', sign: '+', text: t.name });
                if ((c.lifeLog || []).length > (o.lifeLog || []).length) changes.push({ who, kind: 'life', sign: '~', text: (c.lifeLog[c.lifeLog.length - 1] || {}).why || 'взгляды на брак и детей' });
            }
        }
    } catch (e) { console.warn('[Внутренний мир] инфоблок: изменения', e); }
    const show = { time: s.ibTime, date: s.ibDate, weather: s.ibWeather && s.weather !== false, events: s.ibEvents, moods: s.ibMoods };
    for (const f of ['Wants', 'Fears', 'Attitude', 'Night', 'Soon', 'Feels', 'Dream', 'Traits', 'Life', 'Rumor', 'Meme']) show[f.toLowerCase()] = !!s['ib' + f];
    if (s.modules && s.modules.dream === false) show.dream = false;
    if (s.modules && s.modules.traits === false) show.traits = false;
    if (s.modules && s.modules.life === false) show.life = false;
    if (s.rumors === false) show.rumor = false;
    if (s.memes === false) show.meme = false;
    // слух и мем, которые появились именно после этого ответа
    let rumor = null, meme = null;
    try {
        const meta = hasChat() ? chatMeta() : {};
        if (show.rumor) rumor = (meta.rumors || []).slice().reverse().find(r => r && r.mes === id) || null;
        if (show.meme) meme = (meta.memes || []).slice().reverse().find(m => m && m.mes === id) || null;
    } catch { /* без слухов и мемов */ }
    if (s.dreams === false) show.night = false;
    show.clockOn = s.clock !== false;
    show.changes = s.ibChanges !== false;
    show.rel = s.ibRel !== false && s.ibMoods !== false;
    return { clock, cast: cast.slice(0, 4), show, changes: changes.slice(0, 8), rumor, meme };
}

// Разобрать одного НПС по кнопке: карточка заводится, даже если лично в сцене его ещё не было
async function studyNpc(name) {
    if (busy) return notice('Дневник уже пишет — подожди немного.');
    const id = lastBotMessageId();
    if (id < 0) return notice('В чате ещё нет ответа персонажа.');
    if (settings().sound !== false) playSound('write', currentTheme);
    await analyze(id, { manual: true, kind: 'chat', catchUp: [name], study: [name] });
    if (live && !busy && !rosterBusy && !shopBusy) setLive(null);
    renderAll();
}

// Дата события: однодневное — «9 мая», многодневное — «7–13 марта» или «28 дек. – 3 янв.»
function evDateText(cal, e) {
    if (!e.len || e.len < 2) return `${e.d} ${monthName(cal, e.m, true)}`;
    let y = e.y ?? 2000, m = e.m, d = e.d + e.len - 1;
    while (d > monthDays(cal, y, m)) { d -= monthDays(cal, y, m); m += 1; if (m > monthCount(cal)) { m = 1; y += 1; } }
    return m === e.m ? `${e.d}–${d} ${monthName(cal, e.m, true)}` : `${e.d} ${monthName(cal, e.m, true)} – ${d} ${monthName(cal, m, true)}`;
}

// Тип личности и темперамент запоминаются по имени между чатами: повторный разбор той же карточки даёт тот же тип
function rememberTypes(state) {
    try {
        const s = settings();
        const cache = s.typeCache && typeof s.typeCache === 'object' ? s.typeCache : {};
        let changed = false;
        for (const k of state.order || []) {
            const c = state.characters[k];
            if (!c || c.persona || !c.ptype) continue;
            const cur = cache[c.name];
            if (!cur || cur.ptype !== c.ptype || cur.temper !== c.temper) {
                cache[c.name] = { ptype: c.ptype, temper: c.temper || '', at: Date.now() };
                changed = true;
            }
        }
        const names = Object.keys(cache);
        if (names.length > 300) names.sort((a, b) => (cache[a].at || 0) - (cache[b].at || 0)).slice(0, names.length - 300).forEach(n => delete cache[n]);
        if (changed) { s.typeCache = cache; saveSettings(); }
    } catch (e) { console.warn('[Внутренний мир] типы личности', e); }
}

function typeHintsFor(names) {
    const cache = settings().typeCache || {};
    const out = {};
    const st = currentState();
    const want = new Set([...(names || []), ...((st && st.order) || []).map(k => st.characters[k] && st.characters[k].name).filter(Boolean), ...((roster().npc || []).map(e => e.name))]);
    for (const n of want) if (cache[n]) out[n] = { ptype: cache[n].ptype, temper: cache[n].temper };
    return Object.keys(out).length ? out : null;
}

// Открыть дневник на странице героя (из инфоблока)
function openDiaryAt(key) {
    const st = currentState();
    const k = st.order.find(x => x === key) || st.order.find(x => sameName(x, key));
    if (k) {
        const cast = splitCast(st);
        view = k === cast.personaKey ? 'me:' + k : (cast.mains.includes(k) ? 'main:' + k : 'npc:' + k);
    }
    openPanel();
}

const ibSigs = new WeakMap();
function renderInfobar() {
    const s = settings();
    const chatEl = document.getElementById('chat');
    if (!chatEl) return;
    document.getElementById('iw_infobar')?.remove(); // старая плашка над чатом
    const on = s.enabled && s.infobar !== false && hasChat();
    if (!on) { chatEl.querySelectorAll('.iw-ib-host').forEach(el => el.remove()); return; }
    const chat = ctx().chat || [];
    const lastBot = lastBotMessageId();
    // общая часть подписи: если у сообщения не поменялись ни записи дневника до него, ни часы, ни настройки —
    // его инфоблок не пересчитываем (на длинном чате это сотни лишних проходов при каждой подгрузке)
    const ibSet = Object.keys(s).filter(k => /^ib|^clock$|^infobar|^animations$/.test(k)).map(k => `${k}=${s[k]}`).join(',');
    const common = `${currentTheme}|${ibSet}|${mainNames().join(',')}|${ctx().name1 || ''}`;
    const cal = calendarOf();
    for (const el of chatEl.querySelectorAll('.mes[mesid]')) {
        const id = Number(el.getAttribute('mesid'));
        const mes = chat[id];
        let host = el.querySelector(':scope .iw-ib-host');
        const want = mes && !mes.is_user && !mes.is_system && (s.infobarWhere !== 'last' || id === lastBot);
        if (!want) { if (host) host.remove(); continue; }
        const anchor = el.querySelector('.mes_text');
        if (!anchor) continue;
        if (!host) {
            host = document.createElement('div');
            host.className = 'iw-ib-host';
            const root = host.attachShadow({ mode: 'open' });
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${UI_CSS}?v=${VERSION}`;
            root.appendChild(link);
            const wrap = document.createElement('div');
            wrap.className = 'iw-ib-wrap';
            root.appendChild(wrap);
            const toggle = e => {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                const tabEl = e.composedPath().find(n => n.dataset && n.dataset.iwIbTab);
                if (tabEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    const mid = Number(host.closest('.mes')?.getAttribute('mesid'));
                    ibTab.set(mid, tabEl.dataset.iwIbTab);
                    renderInfobar();
                    return;
                }
                const go = e.composedPath().find(n => n.dataset && n.dataset.iwIbOpen);
                if (go) {
                    e.preventDefault();
                    e.stopPropagation();
                    openDiaryAt(go.dataset.iwIbOpen);
                    return;
                }
                if (!e.composedPath().some(n => n.classList && n.classList.contains('iw-ib-bar'))) return;
                e.preventDefault();
                e.stopPropagation();
                const mid = Number(host.closest('.mes')?.getAttribute('mesid'));
                if (ibOpen.has(mid)) ibOpen.delete(mid); else ibOpen.add(mid);
                renderInfobar();
            };
            wrap.addEventListener('click', toggle);
            wrap.addEventListener('keydown', toggle);
        }
        if (host.nextElementSibling !== anchor) anchor.before(host);
        const ck = s.clock !== false ? findClock(id + 1) : null;
        const sig = [common, ibOpen.has(id), ibTab.get(id) || '', findHolder(id + 1).state, findHolder(id).state,
            ck && (ck.rec || JSON.stringify(ck.t)), cal, weatherAt(id)];
        const old = ibSigs.get(host);
        if (old && old.length === sig.length && old.every((v, i) => v === sig[i])) continue;
        ibSigs.set(host, sig);
        const html = renderInfobarHtml(infobarModelFor(id), currentTheme, ibOpen.has(id), ibTab.get(id) || '');
        const wrap = host.shadowRoot.querySelector('.iw-ib-wrap');
        wrap.className = `iw-ib-wrap iw-ib-in ${themeCls()}${s.animations === false ? ' iw-noanim' : ''}`;
        host.hidden = !html;
        if (wrap.dataset.html !== html) {
            wrap.innerHTML = html;
            wrap.dataset.html = html;
        }
    }
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
    try { renderDiagAll(); } catch (e) { console.warn('[Внутренний мир] теги', e); }
    try { renderInfobar(); } catch (e) { console.warn('[Внутренний мир] инфоблок', e); }
}

async function openPanel() {
    refreshTheme();
    markFab(false);
    panelEl().hidden = false;
    raiseLayer(true);
    renderPanelNow();
    fitPanel();
}

// Телефон: дневник ровно по экрану. Таверна и темы иногда ставят transform на <html> или страница
// шире экрана — тогда «fixed» считается не от экрана, и дневник уезжает вправо. Меряем и сдвигаем назад.
function fitPanel() {
    const el = panelEl();
    if (!el) return;
    el.style.left = ''; el.style.width = ''; el.style.right = '';
    if (!isPhone() || el.hidden) return;
    const vw = Math.round(Math.min(window.innerWidth || 9999, document.documentElement.clientWidth || 9999));
    el.style.width = vw + 'px';
    el.style.right = 'auto';
    el.style.left = '0px';
    // где он оказался на самом деле — и сдвигаем так, чтобы левый край совпал с краем экрана
    const dx = Math.round(el.getBoundingClientRect().left);
    if (Math.abs(dx) > 1) el.style.left = (-dx) + 'px';
}
window.addEventListener('resize', () => fitPanel());


function closePanel() {
    panelEl().hidden = true;
    raiseLayer(false);
}

// Открытый дневник — поверх плавающих кнопок и окошек других расширений (у некоторых слой 10000 и выше).
// Всплывающие окна таверны (подтверждения) живут в верхнем слое браузера и остаются над дневником.
// Своё окно в стиле темы дневника — вместо всплывашек таверны.
// buttons: [{ text, value, kind: 'main' | 'danger' | '' }]; input — подпись и значение поля; Esc и клик мимо — отмена (null).
// Подтверждение перед любым удалением в дневнике
async function confirmDelete(what, note = '') {
    const ok = await iwDialog({ title: 'Точно удалить?', html: `<p class="iw-modal-text">${what ? `«${esc(String(what).slice(0, 120))}» пропадёт из дневника.` : 'Запись пропадёт из дневника.'}${note ? ` ${esc(note)}` : ''}</p>`, buttons: [{ text: 'Удалить', value: true, kind: 'danger' }, { text: 'Отмена', value: null }] });
    return !!ok;
}

function iwDialog({ title = '', text = '', html = '', input = null, buttons = [{ text: 'Хорошо', value: true, kind: 'main' }, { text: 'Отмена', value: null }], onReady = null } = {}) {
    return new Promise(resolve => {
        const root = ui();
        const wrap = document.createElement('div');
        wrap.className = `iw-modal ${themeCls()}${settings().animations === false ? ' iw-noanim' : ''}`;
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
        const field = wrap.querySelector('input.iw-modal-input');
        const done = v => {
            document.removeEventListener('keydown', onKey, true);
            wrap.remove();
            if (!panelOpen && !isOpen()) raiseLayer(false);
            resolve(v);
        };
        const pick = i => {
            const b = buttons[i];
            if (!b) return done(null);
            const extra = {};
            for (const x of wrap.querySelectorAll('[data-iw-dlg]')) extra[x.dataset.iwDlg] = x.value;
            done(input ? (b.value === null || b.value === undefined ? null : { value: b.value, input: field ? field.value : '', extra }) : b.value);
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
        if (typeof onReady === 'function') try { onReady(wrap, field); } catch { /* без доп. полей */ }
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
        for (const k of st.order) if (st.characters[k] && st.characters[k].dreams) st.characters[k].dreams = st.characters[k].dreams.filter(x => !x.test);
        meta.rumors = (meta.rumors || []).filter(x => !x.test);
        await saveEditedState(st);
        showEvent({ type: 'reward', who: 'Проверка', text: 'Тестовые достижения, вещи, сны и слухи стёрты' });
        return renderAll();
    }
}

// Проверка снов и слухов: тестовый сон боту и пара слухов (о боте и о твоём герое), стираются кнопкой «Стереть тестовые»
const TEST_DREAMS = [
    { thought: 'Надо было проводить её до самой двери.', text: 'Снилась мокрая набережная и чужой смех за спиной; он всё шёл на свет в окне и никак не мог дойти.', tone: 'тревожный' },
    { form: 'fragments', thought: 'Завтра. Всё завтра.', text: 'Обрывки', lines: [{ text: 'Чёрный ворон на перилах моста' }, { text: 'Ключ, который не подходит ни к одной двери' }, { text: 'Её смех — где-то за стеной' }], tone: 'странный' },
    { form: 'dialog', thought: 'Отец бы не одобрил.', text: 'Говорил во сне с отцом', lines: [{ who: 'Отец', text: 'Корона не для того, чтобы её любили.' }, { who: 'Он', text: 'А для чего тогда я?' }, { who: 'Отец', text: 'Спроси у неё.' }], tone: 'вещий' },
    { form: 'memory', when: 'Как в детстве, зимой', thought: 'Тогда было проще.', text: 'Снился двор старого дома, санки и мамин голос из окна: «Домой, уже темно!»', tone: 'сладкий' },
    { form: 'symbol', symbol: 'Разбитое зеркало', thought: 'Не к добру всё это.', text: 'В каждом осколке — другое его лицо, и ни одно не улыбается. Кажется, он боится, что так и не узнает, кто он без короны.', tone: 'кошмар' },
];
const TEST_MEMES = [
    { format: 'nobody', lines: [{ who: 'Никто', text: '' }, { who: 'Абсолютно никто', text: '' }, { who: 'bot', text: 'в три часа ночи ищет копчёную селёдку с мёдом' }] },
    { format: 'me', lines: [{ who: 'Я на совете', text: 'Император. Холодный. Неприступный.' }, { who: 'Тоже я в 3 ночи', text: 'ест варенье ложкой, потому что она сказала, что это вкусно' }] },
    { format: 'when', top: 'Когда она говорит «всё нормально», а ты император и привык к донесениям', emoji: '🧐📜', img: 'a stern king squinting suspiciously at a cheerful woman, cartoon' },
    { format: 'demotivator', title: 'Дипломатия', text: 'Когда переговоры зашли в тупик, но у тебя есть варенье', emoji: '🍯👑' },
    { format: 'chat', lines: [{ who: 'persona', text: 'ты спишь?' }, { who: 'bot', text: 'Император не спит. Император бдит.' }, { who: 'persona', text: 'то есть не спишь' }, { who: 'bot', text: 'Иди сюда.' }] },
    { format: 'brain', lines: [{ text: 'Подарить цветы' }, { text: 'Подарить драгоценности' }, { text: 'Подарить провинцию' }, { text: 'Отдать ей свой плащ и делать вид, что не мёрзнешь' }] },
    { format: 'expect', lines: [{ text: 'Ожидание: грозный император' }, { text: 'Реальность: прячет её любимые ягоды в карман мундира' }], emoji: '👑🫐' },
    { format: 'buttons', who: 'bot', lines: [{ text: 'Сохранить лицо' }, { text: 'Признаться, что скучал' }] },
    { format: 'tweet', who: 'Дворцовый кот', source: '@palace_cat', text: 'император опять ходил по галерее до рассвета. я тоже ходил. мы оба делали вид, что просто так #вайб', likes: 1204, reposts: 88 },
    {"format": "reaction", "top": "Моё лицо, когда она назвала меня «милым» при послах", "emoji": "😐👑"},
    {"format": "nature", "text": "Перед нами взрослый самец императора. Он делает вид, что не ждёт её у окна, уже третий час.", "emoji": "🦁"},
    {"format": "trailer", "text": "В мире, где все боятся императора… одна девушка не боится. И это его пугает.", "title": "Ледяной трон: Варенье", "emoji": "🎬"},
    {"format": "quote", "text": "Волк не тот, кто воет. Волк тот, кто молча носит её плащ", "who": "bot", "emoji": "🐺"},
    {"format": "before", "lines": [{"text": "Холодный правитель, никому не верит"}, {"text": "Спрашивает у неё, тепло ли ей, каждые пять минут"}]},
    {"format": "started", "lines": [{"text": "Брак по договору ради мира"}, {"text": "Ревнует к собственному плащу"}]},
    {"format": "see", "title": "Он глазами…", "lines": [{"who": "Совет", "text": "Тиран и стратег"}, {"who": "Слуги", "text": "Ходячая метель"}, {"who": "Она", "text": "Большой сонный кот"}, {"who": "На самом деле", "text": "Всё сразу и ещё немного варенья"}]},
    {"format": "doctor", "lines": [{"who": "Лекарь", "text": "Вашему величеству нужен покой и никаких волнений"}, {"who": "bot", "text": "*идёт на бал смотреть, как она танцует с другим*"}]},
    {"format": "mom", "lines": [{"who": "Я", "text": "Мам, можно свадьбу как в легендах?"}, {"who": "Мама", "text": "У нас есть свадьба дома"}, {"who": "Свадьба дома", "text": "подпись в договоре и два хмурых советника"}]},
    {"format": "therapist", "lines": [{"who": "Психолог", "text": "Ревнивый император не существует, он не может тебе навредить"}, {"who": "Ревнивый император", "text": "*стоит за колонной уже сорок минут*"}]},
    {"format": "interview", "lines": [{"who": "HR", "text": "Где вы видите себя через пять лет?"}, {"who": "bot", "text": "Рядом с ней. И на троне. Но в первую очередь рядом с ней."}]},
    {"format": "translator", "title": "Переводчик с языка императора", "lines": [{"who": "Сказал", "text": "Возьмите плащ, во дворце сквозняки"}, {"who": "Имел в виду", "text": "Я всю ночь думал, не замёрзла ли ты"}]},
    {"format": "twotypes", "title": "Есть два типа людей", "lines": [{"text": "Те, кто боится императора"}, {"text": "Те, кто ещё не видел его злым"}, {"text": "И та, которая кормит его ягодами"}]},
    {"format": "groupchat", "title": "Слуги восточного крыла 🧹", "lines": [{"who": "Марта", "text": "он опять улыбнулся"}, {"who": "Грета", "text": "кто"}, {"who": "Марта", "text": "ИМПЕРАТОР"}, {"who": "Повар", "text": "всем по пирогу, это надо отметить"}]},
    {"format": "search", "title": "История поиска императора", "lines": [{"text": "как понять, что девушка тебя не боится"}, {"text": "нормально ли думать о ком-то во время совета"}, {"text": "сколько ягод съедает человек в день"}, {"text": "как подарить провинцию незаметно"}]},
    {"format": "autocomplete", "top": "почему император", "lines": [{"text": "почему император не спит"}, {"text": "почему император улыбается"}, {"text": "почему император носит с собой ягоды"}]},
    {"format": "notifications", "lines": [{"who": "Совет", "text": "Срочно: вопрос о налогах"}, {"who": "Совет", "text": "Ваше величество??"}, {"who": "persona", "text": "иди спать 🌙"}]},
    {"format": "top", "title": "Топ-4 причины, почему император опоздал на совет", "lines": [{"text": "Пробки в коридоре"}, {"text": "Сквозняк"}, {"text": "Государственные дела"}, {"text": "Она попросила рассказать сказку"}]},
    {"format": "starter", "title": "Стартовый набор холодного императора", "lines": [{"who": "👑", "text": "Корона"}, {"who": "🧥", "text": "Плащ, который вечно на ком-то другом"}, {"who": "🫐", "text": "Ягоды в кармане"}, {"who": "😐", "text": "Лицо «мне всё равно»"}, {"who": "📜", "text": "Указ, который никто не читал"}, {"who": "🌙", "text": "Бессонница"}]},
    {"format": "recipe", "title": "Рецепт: император в хорошем настроении", "lines": [{"who": "1 шт.", "text": "Её улыбка"}, {"who": "горсть", "text": "Ягоды"}, {"who": "0 шт.", "text": "Советников рядом"}], "bottom": "Подавать на балконе, не мешать."},
    {"format": "redflags", "title": "Красные флаги императора", "lines": [{"text": "Знает, где ты была каждые 10 минут"}, {"text": "Называет это «безопасностью»"}, {"text": "Подарил тебе крепость"}]},
    {"format": "greenflags", "title": "Зелёные флаги императора", "lines": [{"text": "Помнит, какие ягоды ты любишь"}, {"text": "Отдал плащ и сделал вид, что не мёрзнет"}, {"text": "Спрашивает, а не приказывает (иногда)"}]},
    {"format": "rules", "title": "Правила дворца", "lines": [{"text": "Не бегать по коридорам"}, {"text": "Не трогать императорский плащ"}, {"text": "Не входить в покои без стука"}, {"text": "Ей можно всё"}]},
    {"format": "checklist", "title": "План императора на день", "lines": [{"text": "Совет", "val": 1}, {"text": "Подписать указы", "val": 0}, {"text": "Случайно пройти мимо её комнаты", "val": 1}, {"text": "Случайно пройти ещё раз", "val": 1}]},
    {"format": "signs", "title": "Ты точно император Велесгара, если…", "lines": [{"text": "Твой плащ живёт своей жизнью"}, {"text": "Слуги замирают при твоём появлении"}, {"text": "Кроме одной"}]},
    {"format": "patch", "title": "Император 2.0 — список изменений", "lines": [{"who": "+", "text": "Улыбка (редкая, но есть)"}, {"who": "−", "text": "Желание казнить всех за ошибки"}, {"who": "фикс", "text": "Исправлена бессонница, если она рядом"}]},
    {"format": "bingo", "title": "Бинго: ужин с императором", "lines": [{"text": "Молчит 10 минут", "val": 1}, {"text": "Смотрит на неё", "val": 1}, {"text": "Хмурится на посла", "val": 0}, {"text": "Отдаёт свой десерт", "val": 1}, {"text": "", "val": 1}, {"text": "Говорит «садись»", "val": 1}, {"text": "Ревнует к вилке", "val": 0}, {"text": "Улыбается", "val": 0}, {"text": "Уходит первым", "val": 0}]},
    {"format": "receipt", "title": "Лавка у Южных ворот", "lines": [{"text": "Ягоды, корзина", "who": "3 сер."}, {"text": "Ленты шёлковые", "who": "12 сер."}, {"text": "Молчание продавца", "who": "50 зол."}], "bottom": "ИТОГО: 50 зол. 15 сер."},
    {"format": "priceless", "lines": [{"text": "Новое платье", "who": "200 зол."}, {"text": "Бал на всю столицу", "who": "5000 зол."}], "bottom": "Лицо советников, когда он танцует с ней второй раз — бесценно"},
    {"format": "tier", "title": "Тир-лист вещей во дворце", "lines": [{"who": "S", "text": "Её смех"}, {"who": "A", "text": "Ягоды"}, {"who": "B", "text": "Тёплый плащ"}, {"who": "F", "text": "Утренний совет"}]},
    {"format": "align", "title": "Обитатели дворца", "lines": [{"text": "Император на совете"}, {"text": "Повар"}, {"text": "Она"}, {"text": "Первый советник"}, {"text": "Кот"}, {"text": "Служанка Марта"}, {"text": "Казначей"}, {"text": "Сквозняк"}, {"text": "Император, когда она танцует с другим"}]},
    {"format": "iceberg", "title": "Айсберг императора", "lines": [{"text": "Он правит империей"}, {"text": "Он плохо спит"}, {"text": "Он хранит её ленту"}, {"text": "Он написал ей стихи"}, {"text": "Стихи были плохие"}]},
    {"format": "stats", "title": "Император, ур. 34", "lines": [{"who": "Стратегия", "val": 10}, {"who": "Сдержанность", "val": 8}, {"who": "Скрывать чувства", "val": 2}, {"who": "Отказать ей", "val": 0}]},
    {"format": "meter", "title": "Уровень ревности императора", "score": 87, "bottom": "Она просто поздоровалась с послом", "emoji": "🔥"},
    {"format": "loading", "title": "Загрузка терпения…", "score": 4, "text": "Посол говорит уже час"},
    {"format": "poll", "title": "Он сегодня улыбнулся?", "lines": [{"text": "Да, я видела!", "val": 23}, {"text": "Тебе показалось", "val": 77}]},
    {"format": "error", "title": "Император.exe", "text": "Не удалось сохранить холодное выражение лица: она рядом", "lines": [{"text": "Повторить"}, {"text": "Сдаться"}]},
    {"format": "achievement", "title": "Без титулов", "text": "Назвать её просто по имени при всём дворе", "emoji": "🏆"},
    {"format": "quest", "title": "Добыть зимние ягоды", "text": "Она сказала, что скучает по ним. Ни слова больше.", "lines": [{"text": "+100 к её улыбке"}]},
    {"format": "notice", "title": "ОБЪЯВЛЕНИЕ", "text": "Уважаемые придворные! Кто брал плащ его величества — верните. Он мёрзнет, но делает вид, что нет.", "bottom": "Вернуть плащ"},
    {"format": "sign", "title": "Осторожно: злой император", "text": "Добреет от ягод", "emoji": "⚠️"},
    {"format": "horoscope", "who": "Император ♑", "text": "Сегодня звёзды советуют не притворяться, что вам всё равно. Не поможет.", "emoji": "♑"},
    {"format": "news", "source": "Столичный вестник", "title": "СРОЧНО: император замечен улыбающимся", "text": "Свидетели в шоке, лекари разводят руками"},
    {"format": "review", "title": "Бал во дворце", "who": "Первый советник", "score": 2, "text": "Император танцевал дважды с одной дамой. Протокол нарушен. Музыка хорошая."},
    {"format": "status", "who": "bot", "text": "Корона тяжела. Но плащ ещё тяжелее, когда его некому отдать"},
    {"format": "card", "title": "Император", "lines": [{"who": "Должность", "text": "Император"}, {"who": "Хобби", "text": "Ходить по галерее до рассвета"}, {"who": "Слабость", "text": "Она"}, {"who": "Сила", "text": "Делать вид, что слабости нет"}]},
    {"format": "dictionary", "title": "Императорить", "who": "гл.", "text": "Делать вид, что тебе всё равно, при этом всё помнить и всё замечать.", "bottom": "Он опять императорит у окна."},
    {"format": "formula", "lines": [{"text": "Холодный император"}, {"text": "Её плащ"}], "bottom": "Тёплый император"},
];
let testMemeIdx = 0;
async function testMeme() {
    if (!hasChat()) return notice('Открой чат с персонажем — тогда тестовый мем запишется в его дневник.');
    const st = currentState();
    const { mains, personaKey } = splitCast(st);
    const bot = mains[0] && st.characters[mains[0]];
    const pname = (personaKey && st.characters[personaKey] && st.characters[personaKey].name) || ctx().name1 || 'Я';
    const bname = (bot && bot.name.split(' ')[0]) || ctx().name2 || 'Он';
    const fix = v => (v === 'bot' ? bname : (v === 'persona' ? pname.split(' ')[0] : v));
    const m0 = JSON.parse(JSON.stringify(TEST_MEMES[testMemeIdx++ % TEST_MEMES.length]));
    for (const l of m0.lines || []) l.who = fix(l.who);
    if (m0.who) m0.who = fix(m0.who);
    const m = Object.assign(cleanMeme(m0) || m0, { at: Date.now(), test: true, mes: (ctx().chat || []).length - 1 });
    const meta = chatMeta();
    meta.memes = [...(meta.memes || []), m].slice(-20);
    ctx().saveMetadataDebounced?.();
    notice(`Тестовый мем «${MEME_FORMAT_NAMES[m.format] || m.format}» добавлен в блок «Мемы».`);
    return renderAll();
}
const TEST_RUMORS = [
    { form: 'dialog', who: 'соседки на лавочке', about: 'bot', text: 'ночует у неё в машине', truth: 'half', lines: [{ who: 'Тамара Петровна', text: 'Опять этот в чёрном под её окнами стоял. До трёх ночи!' }, { who: 'Нина', text: 'Да ладно, может, охраняет.' }, { who: 'Тамара Петровна', text: 'Охраняет он… Знаем мы таких охранников.' }] },
    { form: 'post', who: 'Подслушано в районе', source: '@podslushano_rayon', via: 'Telegram', about: 'persona', text: 'Девушка из третьего подъезда опять гадала кому-то на картах у ларька 🔮 Говорят, сбывается всё. Кто знает, как к ней записаться? #подслушано', truth: 'false', likes: 214, reposts: 37 },
    { form: 'news', who: 'утренняя газета', source: 'Вечерний вестник', title: 'Таинственная пара замечена на рассвете', about: 'persona', text: 'Наш корреспондент видел, как молодая особа покидала автомобиль у набережной в пятом часу утра. Кто её спутник — пока загадка.', truth: 'true' },
    { form: 'herald', who: 'глашатай на площади', source: 'Глашатай', about: 'город', text: 'Слушайте, слушайте! Указом совета ворота закрываются с заходом солнца, а всякий, кто будет замечен на улицах после, — будет допрошен!', truth: 'true' },
    { form: 'note', who: 'кто-то неизвестный', source: 'на двери подъезда', about: 'bot', text: 'ТОТ, КТО ЕЗДИТ НА ЧЁРНОЙ МАШИНЕ, — ВЕРНИ ДОЛГ. МЫ ЗНАЕМ, ГДЕ ТЫ СПИШЬ.', truth: 'half' },
];
let testDreamIdx = 0;
async function testNightRumor(kind) {
    if (!hasChat()) return showEvent({ type: kind === 'night' ? 'night' : 'rumor', who: 'Проверка', text: 'Открой чат с персонажем — тогда тестовый сон или слух запишутся в его дневник.' });
    const st = currentState();
    const { mains, personaKey } = splitCast(st);
    const botKey = mains[0];
    if (!botKey) return showEvent({ type: 'night', who: 'Проверка', text: 'Сначала заполни дневник этого чата (кнопка «Чат»).' });
    const bot = st.characters[botKey];
    const now = clockNow();
    const date = now && now.cal && now.t ? fmtDate(now.cal, now.t) : '';
    if (kind === 'night') {
        const d = TEST_DREAMS[testDreamIdx++ % TEST_DREAMS.length];
        bot.dreams = [...(bot.dreams || []), Object.assign({ date, at: Date.now(), test: true }, d)].slice(-8);
        await saveEditedState(st);
        showEvent({ type: 'night', who: bot.name, text: d.text, icon: 'moon' });
        return renderAll();
    }
    const meta = chatMeta();
    const pname = (personaKey && st.characters[personaKey] && st.characters[personaKey].name) || ctx().name1 || '';
    const have = (meta.rumors || []).map(r => r.text);
    const r0 = TEST_RUMORS.find(r => !have.includes(r.text)) || TEST_RUMORS[0];
    const r = Object.assign({}, r0, { about: r0.about === 'город' ? '' : (r0.about === 'bot' ? bot.name : pname), date, at: Date.now(), test: true }, r0.about === 'город' ? { town: true } : {});
    meta.rumors = [...(meta.rumors || []).filter(x => x.text !== r.text), r].slice(-12);
    ctx().saveMetadataDebounced?.();
    showEvent({ type: 'rumor', who: r.who || r.source, text: r.text, icon: 'chat', rumor: r, force: true });
    return renderAll();
}

function testNotice(kind) {
    const who = (currentState().order || []).map(k => currentState().characters[k] && currentState().characters[k].name).find(Boolean) || ctx().name2 || 'Персонаж';
    if (kind === 'ach' || kind === 'keep' || kind === 'clearcase') return testShowcase(kind);
    if (kind === 'night' || kind === 'rumor') return testNightRumor(kind);
    if (kind === 'meme') return testMeme();
    if (kind === 'write') return writeSound();
    if (kind === 'error') return showError({ kind: 'test', title: 'Модель не ответила', text: 'Это проверочная ошибка: так выглядит листок, если разбор не удался.' }, { manual: true, what: 'Проверка' });
    if (kind === 'all') {
        const kinds = Object.keys(TEST_SAMPLES);
        kinds.forEach((k, i) => showEvent(Object.assign({ type: k, who, force: true }, TEST_SAMPLES[k]), i * 2600));
        return;
    }
    showEvent(Object.assign({ type: kind, who, force: true }, TEST_SAMPLES[kind] || {}));
}

async function onPanelClick(e) {
    // всплывающие меню (кошелёк, звук, лорбуки) закрываются, если нажать мимо них
    for (const d of panelEl().querySelectorAll('details.iw-wallet[open], details.iw-vol[open], details.iw-books[open], details.iw-clock[open], details.iw-pick[open]')) {
        if (d.contains(e.target)) continue;
        d.open = false;
        if (d.classList.contains('iw-clock')) { clockOpen = false; clockDraft = null; clockMonth = null; }
    }
    // свернуть / развернуть блок: стрелка или заголовок; свёрнутый — кликом в любом его месте
    // сворачивается только кнопкой «−/+» (заголовок занят ручкой перетаскивания)
    const fold = e.target.closest('button[data-iw-fold]');
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
    const bornTag = e.target.closest('[data-iw-born], [data-iw-npcx], [data-iw-cheat]');
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
    if (t.classList.contains('iw-popups')) {
        s.popups = s.popups === false;
        saveSettings();
        t.classList.toggle('off', !s.popups);
        t.setAttribute('aria-pressed', String(s.popups));
        t.innerHTML = `${iconHtml(s.popups ? 'bell' : 'bell_off')}<span>${s.popups ? 'Всплывашки включены' : 'Всплывашки выключены'}</span>`;
        if (s.popups) showEvent({ type: 'note', who: 'Дневник', text: 'Всплывающие уведомления снова включены.' });
        return;
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
    if (t.dataset.iwOrderReset !== undefined) {
        settings().blockOrder = null;
        saveSettings();
        notice('Блоки вернулись на свои места');
        return renderAll();
    }
    if (t.dataset.iwStop !== undefined) return stopAnalysis(t.dataset.iwStop === 'dream' ? 'Остановлено: мечта осталась прежней' : t.dataset.iwStop === 'wishes' ? 'Остановлено: желания и страхи остались прежними' : '');
    if (t.dataset.iwAttr) return onAttrAction(t.dataset.iwAttr, t);
    if (t.dataset.iwLifePin) return onLifeEdit(null, null);
    if (t.dataset.iwLifeUnlock) return onLifeEdit('unlock:' + t.dataset.iwLifeUnlock, null);
    if (t.dataset.iwNpcStudy) return studyNpc(t.dataset.iwNpcStudy);
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
    if (t.dataset.iwMulti !== undefined || t.dataset.iwMainpick !== undefined || t.dataset.iwMainsave !== undefined || t.dataset.iwPromote !== undefined || t.dataset.iwDemote !== undefined) {
        return onMultiAction(t.dataset);
    }
    if (t.dataset.iwAnalyze) {
        if (!hasChat()) return notice('Сначала открой чат с персонажем.');
        const menu = t.closest('details');
        if (menu) menu.open = false;
        const kind = t.dataset.iwAnalyze;
        // первая генерация для этой карточки — сначала спрашиваем: обычный бот или мультибот
        if (!(await askCardMode())) return;
        if (kind === 'chat') {
            const id0 = lastBotMessageId();
            if (id0 >= 0 && recordOf(ctx().chat[id0]) && (chatMeta().fp || {}).chat === chatFp(id0) && !missingPersona() && !(settings().showNpc !== false && historySeen().pending.length)) return nothingNew('сообщения чата');
        }
        // карандаш «пишет» один раз — только на нажатие кнопки, не на автообновления
        if (!busy && s.sound !== false) playSound('write', currentTheme);
        if (kind === 'chat') {
            const id = lastBotMessageId();
            if (id < 0) return notice('В чате ещё нет ответа персонажа.');
            const my = runId;
            const more = needsRewards();
            await analyze(id, { manual: true, kind: 'chat', keepLive: more });
            if (my === runId) await autoRewards();
            if (live && !busy && !rosterBusy && !shopBusy) setLive(null);
            renderAll();
            return;
        }
        const my = runId;
        await studyLore({ mode: kind, keepLive: true });
        if (my === runId) await autoRewards();
        if (live && !busy && !rosterBusy && !shopBusy) setLive(null);
        renderAll();
        return;
    }
    if (t.dataset.iwTheme) {
        s.theme = t.dataset.iwTheme;
        saveSettings();
        refreshTheme();
        syncSettingsForm();
        return renderAll();
    }
    if (t.dataset.iwWishes) {
        if (!wishBusy) writeSound();
        return regenWishes();
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
    if (t.dataset.iwWantClaim !== undefined) return claimWantReward(Number(t.dataset.iwWantClaim));
    if (t.dataset.iwFearCross !== undefined) return crossFear(Number(t.dataset.iwFearCross));
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
    if (t.dataset.iwModSet) {
        // сны, слухи, мемы, погода — переключаются из «Что вести в дневнике»
        const k = t.dataset.iwModSet;
        s[k] = s[k] === false;
        saveSettings();
        syncSettingsForm();
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwTk) {
        const k = t.dataset.iwTk;
        s.toastKinds = Object.assign({}, s.toastKinds);
        if (s.toastKinds[k] === false) delete s.toastKinds[k]; else s.toastKinds[k] = false;
        saveSettings();
        syncSettingsForm();
        return renderAll();
    }
    if (t.dataset.iwMod) {
        const m = t.dataset.iwMod;
        s.modules[m] = s.modules[m] === false;
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
        if (!(await askCardMode())) return;
        if (!rosterBusy && !busy) writeSound();
        return studyLore({ mode: 'lore' });
    }
    if (t.dataset.iwTok) {
        // токены: готовое значение из меню
        const i = t.dataset.iwTok.indexOf(':');
        setTokens(t.dataset.iwTok.slice(0, i), t.dataset.iwTok.slice(i + 1));
        return;
    }
    if (t.dataset.iwQuick) return onQuickSetting(t.dataset.iwQuick);
    if (t.dataset.iwQuickOpen) return openSettingsAt(t.dataset.iwQuickOpen);
    if (t.dataset.iwCaseview) {
        settings().caseView = t.dataset.iwCaseview === 'grid' ? 'grid' : 'list';
        saveSettings();
        return renderPanelNow();
    }
    if (t.dataset.iwArtAll) return drawAllArt(t.dataset.iwArtAll);
    if (t.dataset.iwMemeDel) {
        const at = Number(t.dataset.iwMemeDel);
        const meta = chatMeta();
        const m = (meta.memes || []).find(x => x.at === at);
        if (!m || !(await confirmDelete(memePlain(m) || 'мем'))) return;
        meta.memes = (meta.memes || []).filter(x => x !== m);
        ctx().saveMetadataDebounced?.();
        return renderAll();
    }
    if (t.dataset.iwMemePic) return drawMemeImage(Number(t.dataset.iwMemePic), { manual: true });
    if (t.dataset.iwMemeAgain) return rerollMeme(Number(t.dataset.iwMemeAgain));
    if (t.dataset.iwRumorDel) {
        const id = decodeURIComponent(t.dataset.iwRumorDel);
        const meta = chatMeta();
        const r = (meta.rumors || []).find(x => String(x.at || x.text) === id);
        if (!r || !(await confirmDelete(r.text))) return;
        meta.rumors = (meta.rumors || []).filter(x => x !== r);
        ctx().saveMetadataDebounced?.();
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwArt) {
        const at = t.dataset.iwArt.lastIndexOf(':');
        const k = t.dataset.iwArt.slice(0, at), i = t.dataset.iwArt.slice(at + 1);
        drawItemArt(k, i.startsWith('b') ? i : Number(i));
        return;
    }
    if (t.dataset.iwAchdel) {
        const meta = chatMeta();
        const a0 = (meta.achList || []).find(x => x.id === t.dataset.iwAchdel);
        if (!(await confirmDelete(a0 && a0.title, 'Достижение уйдёт с витрины.'))) return;
        meta.achList = (meta.achList || []).filter(x => x.id !== t.dataset.iwAchdel);
        ctx().saveMetadataDebounced?.();
        caseSel = '';
        return renderPanelNow();
    }
    if (t.dataset.iwCase) {
        caseSel = caseSel === t.dataset.iwCase ? '' : t.dataset.iwCase;
        return renderPanelNow();
    }
    if (t.dataset.iwClock === 'evmore') {
        e.preventDefault();
        clockEvOpen = !clockEvOpen;
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
        const calNow = (() => { try { const n = clockNow(); return n && n.cal ? n.cal : null; } catch { return null; } })();
        const zOf = (d, m) => zodiacOn(calNow, d, m);
        const zNow = ch.zodiac || (ch.born && ch.born.d && ch.born.m ? zOf(ch.born.d, ch.born.m) : '');
        const zSel = `<label class="iw-modal-field"><span class="iw-muted">Знак зодиака — если точной даты нет, дата встанет примерно, по середине знака</span><select class="iw-modal-input iw-modal-select" data-iw-dlg="zodiac"><option value="">— по дате —</option>${Object.entries(ZODIAC).map(([k, z]) => `<option value="${k}"${k === zNow ? ' selected' : ''}>${z.glyph} ${esc(z.name)}</option>`).join('')}</select></label>`;
        const got = await iwDialog({ title: `День рождения: ${ch.name}`, text: 'Дата — 20.08.1969, просто 20.08 или только год рождения — 1969. Или возраст на сегодня по часам сцены — например 27, дальше он будет расти сам. Оставь пустым, чтобы убрать.', html: zSel, input: { label: 'Дата или возраст', value: cur, placeholder: '20.08.1969' }, buttons: [{ text: 'Сохранить', value: 'ok', kind: 'main' }, { text: 'Отмена', value: null }],
            onReady: (wrap, field) => {
                // выбрала знак — дата подстраивается: середина знака, год сохраняется
                const sel = wrap.querySelector('[data-iw-dlg="zodiac"]');
                if (!sel || !field) return;
                sel.addEventListener('change', () => {
                    const mid = zodiacMidOn(calNow, sel.value);
                    if (!mid) return;
                    const b = parseBorn(field.value.trim()) || {};
                    if (b.d && b.m && zOf(b.d, b.m) === sel.value) return;
                    const y = b.y || (/^\d{3,4}$/.test(field.value.trim()) ? field.value.trim() : '');
                    field.value = `${p2(mid.d)}.${p2(mid.m)}${y ? '.' + y : ''}`;
                    field.dataset.approx = '1';
                });
                field.addEventListener('input', () => { delete field.dataset.approx; });
            } });
        const val = got ? got.input : null;
        const pickedZ = got && got.extra ? got.extra.zodiac : '';
        if (val === null || val === undefined || val === false) return;
        const txt = String(val).trim();
        const ageOnly = txt.match(/^(\d{1,3})\s*(год|года|лет|г\.?)?$/i);
        if (ageOnly) {
            // возраст вручную: привязываем к дате сцены, дальше он растёт по часам; год рождения из лорбука больше не главный
            const now = clockNow();
            const age = Number(ageOnly[1]);
            if (now && now.cal && now.t) {
                ch.ageAt = Object.assign({ age }, now.cal.type === 'days' ? { d: now.t.d } : { y: now.t.y, m: now.t.m, d: now.t.d });
                delete ch.ageSaid;
            } else {
                // часов сцены ещё нет — запоминаем возраст как есть; к дате он привяжется, когда появятся часы
                delete ch.ageAt;
                ch.ageSaid = age;
            }
            if (ch.born && ch.born.y) { ch.born = Object.assign({}, ch.born); delete ch.born.y; }
            ch.bornManual = true;
            await saveEditedState(state);
            updateInjection();
            notice(`${ch.name}: ${age} ${plural(age, 'год', 'года', 'лет')}${now && now.cal && now.t ? ' — дальше по часам сцены' : ''}`);
            return renderAll();
        }
        if (!txt && pickedZ && zodiacMidOn(calNow, pickedZ)) {
            const mz = zodiacMidOn(calNow, pickedZ);
            ch.born = { d: mz.d, m: mz.m, approx: true };
            ch.zodiac = pickedZ;
        } else if (!txt) {
            delete ch.born;
            delete ch.ageAt;
        } else {
            let b = parseBorn(txt);
            if (!b) return notice('Не поняла дату. Пример: 20.08.1969, 20.08 или 1969');
            // знак выбран, а даты нет или она из другого знака — ставим примерную дату по знаку
            const midZ = pickedZ ? zodiacMidOn(calNow, pickedZ) : null;
            if (midZ && (!(b.d && b.m) || zOf(b.d, b.m) !== pickedZ)) {
                b = Object.assign({}, b, { d: midZ.d, m: midZ.m, approx: true });
            } else if (midZ && b.d === midZ.d && b.m === midZ.m) b.approx = true; // дата — подставленная по знаку
            ch.born = b;
            if (b.d && b.m) ch.zodiac = zOf(b.d, b.m) || ch.zodiac;
        }
        ch.bornManual = true;
        await saveEditedState(state);
        updateInjection();
        notice(ch.born ? `${ch.name}: ${bornText(ch.born, calNow)}` : `${ch.name}: дата рождения убрана`);
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
        const item = ch[kind][Number(idx)];
        const what = item && (typeof item === 'string' ? item : (item.emotion || item.text || item.name || item.fact || item.title || ''));
        if (!(await confirmDelete(what))) return;
        // убранный факт «что знает персона» модель больше не вернёт
        if (kind === 'heard' && ch.heard[Number(idx)]) ch.heardOff = [...(ch.heardOff || []), ch.heard[Number(idx)].fact].slice(-20);
        ch[kind].splice(Number(idx), 1);
        markEdited(ch, kind);
        await saveEditedState(state);
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwNpcx || t.dataset.iwForget) {
        // убрать персонажа: только сейчас (вернётся, когда снова придёт в сцену) или навсегда.
        // Одинаково из списка НПС и из настроек «Этот чат»; экран, где был игрок, не меняется.
        const key = t.dataset.iwNpcx || t.dataset.iwForget;
        const state = currentState();
        const ch = state.characters[key];
        if (!ch) return;
        const res = await iwDialog({ title: `Убрать ${ch.name} из дневника?`, html: `<p class="iw-modal-text"><b>Только сейчас</b> — запись пропадёт, но если ${esc(ch.name)} снова появится в сцене, она заведётся заново.</p><p class="iw-modal-text"><b>Навсегда</b> — в этом чате ${esc(ch.name)} больше не попадёт ни в записи, ни в списки. Вернуть можно внизу списка НПС или в настройках, раздел «Этот чат», — с чистого листа.</p>`, buttons: [{ text: 'Только сейчас', value: 1, kind: 'main' }, { text: 'Навсегда', value: 2, kind: 'danger' }, { text: 'Отмена', value: null }] });
        if (res !== 1 && res !== 2) return;
        delete state.characters[key];
        state.order = state.order.filter(k => k !== key);
        if (res === 2) {
            const meta = chatMeta();
            meta.ignored = [...ignoredNames().filter(n => !sameName(n, ch.name)), ch.name];
        }
        // после удаления следующий разбор не должен решить, что ничего нового нет
        chatMeta().fp = {};
        if (view === 'npc:' + key || view === key) view = view.startsWith('npc') ? 'npc' : '';
        await saveEditedState(state);
        ctx().saveMetadataDebounced?.();
        updateInjection();
        syncSettingsForm();
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
function nothingNew(what) {
    notice(`Ничего нового: ${what} не менялись с прошлого разбора. Мечту и награды можно придумать заново — кубиком у мечты и в магазине.`);
    // но если у главных пусто «что привлекает / отталкивает» — дозаполним
    fillAttractionGaps();
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

// Лавке пора обновиться: её нет вовсе, или включено автообновление и прошло нужное число сообщений.
function shopStale(ch) {
    if (!ch) return true;
    if (!(ch.shop && ch.shop.length)) return true;
    if (!settings().shopAuto) return false;
    const every = Math.max(1, Number(settings().shopEvery) || 10);
    const now = (ctx().chat || []).length;
    return now - (Number(ch.shopMes) || 0) >= every;
}

function needsRewards() {
    if (settings().points === false || !hasChat()) return false;
    const st = currentState();
    return splitCast(st).mains.some(k => shopStale(st.characters[k]));
}

// Награды подбираются сами после разбора — тем главным, у кого лавки ещё нет или ей пора обновиться.
async function autoRewards() {
    if (settings().points === false || !hasChat()) return;
    const st = currentState();
    for (const key of splitCast(st).mains) {
        if (!shopStale(st.characters[key])) continue;
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
            showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw), thinking: settings().thinking }), { manual: true, what: 'Мечта не придумалась' });
        } finally {
            if (my === runId) {
                dreamBusy = false;
                renderAll();
            }
        }
    }
}

// Разбор не дал «что привлекает / отталкивает» главным героям и персоне — одна короткая просьба, чтобы заполнить.
// Один раз на героя (attrAsked), чтобы не дёргать модель снова, если она опять промолчит.
let attrFilling = false;
async function fillAttractionGaps() {
    const s = settings();
    if (attrFilling || busy || !hasChat() || s.modules.attraction === false) return;
    const st0 = currentState();
    const { mains, personaKey } = splitCast(st0);
    const keys = mains.concat(s.persona !== false && personaKey ? [personaKey] : []).filter(k => {
        const c = st0.characters[k];
        return c && !c.attrSet && !c.attrAsked && !c.dead && !((c.likes || []).length || (c.dislikes || []).length);
    });
    if (!keys.length) return;
    attrFilling = true;
    const my = runId;
    try {
        const info = analysisInfo(6);
        const c0 = ctx();
        info.personaText = cleanMessageText((c0.powerUserSettings && c0.powerUserSettings.persona_description) || '', 2000);
        const cached = knowledgeLore(3);
        if (cached) info.loreMain = cached;
        const { system, user } = buildAttractionPrompt(info, keys.map(k => st0.characters[k]), s.language);
        const raw = await callModel(system, user, withBudget('wishes'));
        if (my !== runId) return;
        const got = parseAttraction(raw);
        const st = currentState();
        for (const k of keys) {
            const c = st.characters[k];
            if (!c) continue;
            c.attrAsked = true;
            const g = got.find(x => sameName(x.name, c.name) || namesMatch(x.name, c.name));
            if (g && !((c.likes || []).length || (c.dislikes || []).length)) { c.likes = g.likes || []; c.dislikes = g.dislikes || []; }
        }
        await saveEditedState(st);
        updateInjection();
        renderAll();
    } catch (err) {
        console.warn('[Внутренний мир] что привлекает', err);
    } finally { attrFilling = false; }
}

// Желания и страхи заново — как кнопка у мечты. Закреплённые желания остаются.
async function regenWishes() {
    const key = viewKey();
    const state = currentState();
    const ch = key && state.characters[key];
    if (!ch || wishBusy) return;
    const my = runId;
    wishBusy = key;
    renderAll();
    try {
        const info = analysisInfo(6);
        const c0 = ctx();
        if (key === personaKeyOf(state)) {
            const pdesc = c0.powerUserSettings && c0.powerUserSettings.persona_description;
            info.persona = true;
            info.card = cleanMessageText(pdesc || '', 4000);
            info.botName = ch.name || c0.name1;
            info.userName = c0.name2;
        } else {
            const cached = knowledgeLore(3);
            if (cached) info.loreMain = cached;
        }
        const { system, user } = buildWishesPrompt(info, ch, settings().language);
        const raw = await callModel(system, user, withBudget('wishes'));
        if (my !== runId) return;
        const fresh = parseWishes(raw);
        const st = currentState();
        const c2 = st.characters[key];
        if (!c2) return;
        const keep = (c2.wants || []).filter(w => (w.pinned && w.status === 'active') || (w.status === 'done' && w.unclaimed));
        const same = (a, b) => String(a).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') === String(b).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        c2.wants = keep.concat(fresh.wants.filter(w => !keep.some(k => same(k.text, w.text)))).slice(0, 6);
        if (fresh.fears.length) c2.fears = fresh.fears.slice(0, 6);
        c2.log = [{ type: 'note', text: 'желания и страхи придуманы заново', m: null }].concat(c2.log || []).slice(0, 40);
        await saveEditedState(st);
        updateInjection();
    } catch (err) {
        if (err && err.cancelled) return;
        console.error('[Внутренний мир]', err);
        showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw), thinking: settings().thinking }), { manual: true, what: 'Желания и страхи не придумались' });
    } finally {
        if (my === runId) { wishBusy = ''; renderAll(); }
    }
}

async function regenShop(forKey = null, { quiet = false } = {}) {
    const key = forKey || viewKey();
    if (!key || shopBusy) return;
    const ch = currentState().characters[key];
    if (!ch) return;
    const my = runId;
    shopBusy = true;
    if (quiet) {
        status = `Подбираю награды: ${ch.name}…`;
        // листок разбора остаётся и показывает, что идёт ещё подбор наград
        if (live) Object.assign(live, { kind: 'rewards', stage: 'think', chars: [], len: 0, est: null });
    }
    renderAll();
    try {
        const info = analysisInfo(4);
        info.loreMain = knowledgeLore(2) || [];
        info.style = (THEMES[currentTheme] && THEMES[currentTheme].name) || '';
        if (ch.persona) info.persona = cleanMessageText(personaText(ctx()), 1500);
        else info.personaText = cleanMessageText(personaText(ctx()), 800);
        const { system, user } = buildRewardsPrompt(info, ch, settings().language);
        const raw = await callModel(system, user, withBudget('rewards'));
        const rewards = parseRewards(raw);
        if (!rewards.length) throw new Error('модель не вернула наград');
        const st = currentState();
        if (!st.characters[key]) return;
        st.characters[key].shop = rewards;
        st.characters[key].shopMes = (ctx().chat || []).length; // от этого сообщения считаем автообновление
        await saveEditedState(st);
    } catch (err) {
        if (err && err.cancelled) return;
        console.error('[Внутренний мир]', err);
        if (!quiet) showError(classifyError(err, { raw: lastCall.raw, budget: lastCall.budget, cut: looksCut(lastCall.raw), thinking: settings().thinking }), { manual: true, what: 'Награды не подобрались' });
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
        if (!(await confirmDelete(arr[Number(rest[0])]))) return;
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

// Брак и дети: правка игрока закрепляет взгляды (field null — вернуть модели)
async function onLifeEdit(field, value) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    if (!ch) return;
    if (field === null) {
        if (ch.lifeSet) delete ch.lifeSet;
        else ch.lifeSet = true;
    }
    else if (String(field).startsWith('unlock:')) {
        // снять замок с одного пункта — модель снова ведёт его сама
        const f = String(field).slice(7);
        if (ch.lifeLock) { delete ch.lifeLock[f]; if (!Object.keys(ch.lifeLock).length) delete ch.lifeLock; }
    }
    else {
        const life = Object.assign({ marry: '', kids: '', own: '', when: '', count: 0, why: '' }, ch.life);
        life[field] = field === 'count' ? (Number(value) || 0) : String(value || '');
        ch.life = life;
        // закрепляется только то, что поменяли руками; «не ясно» — отдать пункт модели
        ch.lifeLock = Object.assign({}, ch.lifeLock);
        if (life[field]) ch.lifeLock[field] = true; else delete ch.lifeLock[field];
        if (!Object.keys(ch.lifeLock).length) delete ch.lifeLock;
    }
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
async function claimWantReward(i) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    const text = ch && ch.wants && ch.wants[i] ? ch.wants[i].text : '';
    const got = claimWant(st, key, i);
    if (!got) return;
    await saveEditedState(st);
    updateInjection();
    renderAll();
    showEvent({ type: 'reward', who: ch.name, text: `«${text}» — награда получена: +${got.toLocaleString('ru-RU')}`, icon: 'coin' });
}

// Сбывшийся или прошедший страх вычёркивается рукой — как желание, только без награды
async function crossFear(i) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    const f = ch && ch.fears && ch.fears[i];
    if (!f || f.status === 'active') return;
    ch.fears.splice(i, 1);
    ch.fearsCrossed = [...(ch.fearsCrossed || []), f.text].slice(-20);
    markEdited(ch, 'fears');
    await saveEditedState(st);
    updateInjection();
    renderAll();
    showEvent({ type: 'fear_gone', who: ch.name, text: f.text, icon: f.status === 'realized' ? 'ghost' : 'sun' });
}

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

// Секрет для тех, кто помнит «Симс»: консоль открывается по нажатию на большую монетку в кошельке.
// Подсказок нет. motherlode — +50 000, kaching — +1 000. За первый чит — ачивка.
const CHEATS = { motherlode: 50000, kaching: 1000 };
const CHEAT_LINES = [
    'Ctrl + Shift + C. Ты ведь знаешь, что вводить. Все мы помним «Симс» — и лестницу в бассейн тоже.',
];
async function enterCheat() {
    if (!hasChat()) return;
    for (const d of panelEl().querySelectorAll('details.iw-wallet[open]')) d.open = false;
    const got = await iwDialog({ title: 'Консоль', text: CHEAT_LINES[Math.floor(Math.random() * CHEAT_LINES.length)], input: { label: '>', value: '', placeholder: '' }, buttons: [{ text: 'Ввести', value: 'ok', kind: 'main' }, { text: 'Закрыть', value: null }] });
    if (!got) return;
    const code = String(got.input || '').toLowerCase().replace(/[^a-z]/g, '');
    const add = CHEATS[code];
    if (!add) return notice('Ничего не произошло. Может, опечатка?', 'Консоль');
    const st = currentState();
    st.purse = purseOf(st) + add;
    await saveEditedState(st);
    showEvent({ type: 'reward', who: 'Консоль', text: `+${add.toLocaleString('ru-RU')} — теперь в кошельке ${st.purse.toLocaleString('ru-RU')}`, icon: 'coin' });
    // первый чит в этом чате — позорная ачивка
    const meta = chatMeta();
    if (!meta.cheated) {
        meta.cheated = true;
        const now = clockNow();
        const { list, added } = addAchievement(meta.achList, { title: 'Читер поганый', desc: 'Ввести чит-код и надеяться, что никто не заметит. Мы заметили.', icon: 'guilt', tier: 'bronze', kind: 'funny' }, { scene: now && now.cal && now.t ? fmtDate(now.cal, now.t) : '' });
        meta.achList = list;
        if (added) {
            meta.achNew = [...(meta.achNew || []), added.id].slice(-30);
            showEvent({ type: 'achievement', who: 'Витрина', text: added.title, desc: added.desc, icon: added.icon, tier: added.tier, kind: added.kind }, 1400);
        }
        ctx().saveMetadataDebounced?.();
    }
    renderAll();
}

// Покупки, сделанные, пока дневник пишет запись: разбор взял состояние до покупки и иначе затёр бы её.
// Копим и проводим сразу, как только запись готова.
let buyQueue = [];
function flushBuyQueue() {
    if (busy || !buyQueue.length) return;
    const q = buyQueue; buyQueue = [];
    const chatNow = ctx().getCurrentChatId?.();
    (async () => { for (const b of q) if (b.chat === chatNow) await buy(b.id, b.key, true); })();
}

async function buy(id, keyArg = null, queued = false) {
    const key = keyArg || viewKey();
    if (busy && key) {
        buyQueue.push({ id, key, chat: ctx().getCurrentChatId?.() });
        notice('Дневник как раз дописывает запись — покупка пройдёт через пару секунд, как только он закончит');
        return;
    }
    const st = currentState();
    const ch = key && st.characters[key];
    if (!ch) return;
    const reward = (ch.shop || []).find(r => r.id === id);
    // вещица «для тебя» ложится в коллекцию персоны игрока (если её дневник ведётся)
    const pk = reward && reward.forUser ? splitCast(st).personaKey : null;
    const target = pk && st.characters[pk] ? st.characters[pk] : ch;
    if (reward && reward.forUser && target !== ch) {
        const have = purseOf(st);
        if (have < reward.cost) return notice('не хватает монет');
        st.purse = have - reward.cost;
        target.collection = (target.collection || []).concat([{ title: reward.title, icon: reward.icon, desc: reward.desc, got: Date.now() }]).slice(-30);
        ch.shop = (ch.shop || []).filter(r => r.id !== reward.id);
        await saveEditedState(st);
        showEvent({ type: 'reward', who: target.name, text: `«${reward.title}» — в твоей коллекции, загляни на витрину`, icon: reward.icon });
        renderAll();
        return drawNewItem(target);
    }
    const err = buyReward(target, reward, st, settings().buyOne !== false);
    if (err) return notice(err);
    // эффект считается от покупки: если последние ответы ещё не разобраны, их не вычитаем из срока —
    // иначе событие на «следующий ответ» пропадало бы, не дойдя до модели
    if (reward.kind !== 'collect') {
        const lag = botRepliesBetween(findHolder().index, (ctx().chat || []).length - 1);
        const b = (target.buffs || []).find(x => x && x.id === reward.id);
        if (b && lag > 0 && b.kind !== 'gift') b.left = (b.left ?? 1) + lag;
    }
    await saveEditedState(st);
    updateInjection();
    const persName = ctx().name1 || 'тебе';
    if (reward.kind === 'collect') drawNewItem(target);
    // подарок рисуется сразу, пока ждёт вручения; при вручении картинка переходит на витрину
    if (reward.kind === 'gift' && artAuto('gift')) {
        const gi = (target.buffs || []).findIndex(b => b && b.kind === 'gift' && b.id === reward.id);
        if (gi >= 0) setTimeout(() => drawItemArt(key, 'b' + gi, { quiet: true }), 300);
    }
    showEvent({ type: 'reward', who: target.name, text: reward.kind === 'collect' ? `«${reward.title}» — в коллекции, загляни на витрину` : reward.kind === 'gift' ? `«${reward.title}» — ${target.name} подарит это ${persName} в ближайшей сцене` : `«${reward.title}» — ${reward.kind === 'event' ? 'случится в следующем ответе' : `действует ${reward.turns} ${plural(reward.turns, 'ответ', 'ответа', 'ответов')}`}`, icon: reward.icon });
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
    // ползунки со словами (частота ачивок): подпись меняется сразу
    if (el && el.matches && el.matches('[data-iw-fmt]')) {
        const out = el.closest('label') && el.closest('label').querySelector('.iw-range-val');
        if (out) out.textContent = rangeLabel(el.dataset.iwFmt, el.value);
        return;
    }
    if (!el || !(el.matches('[data-iw-volume]') || el.dataset.iwSet === 'volume')) return;
    const v = Number(el.value) || 0;
    settings().volume = v;
    setVolume(v);
    const box = el.closest('.iw-vol-menu, label');
    const out = box && box.querySelector('.iw-range-val');
    if (out) out.textContent = v + '%';
}

function setTokens(key, raw) {
    if (key !== 'budgetCap' && key !== 'responseLength') return;
    const v = Math.round(Number(String(raw).replace(/[^\d]/g, '')));
    if (!Number.isFinite(v) || v <= 0) return notice('Впиши число токенов, например 20000.');
    const s = settings();
    s[key] = Math.max(key === 'budgetCap' ? 2000 : TOKENS_MIN, Math.min(TOKENS_MAX, v));
    saveSettings();
    syncSettingsForm();
    renderAll();
}

async function onPanelChange(e) {
    const el = e.target;
    if (el && el.matches && el.matches('[data-iw-life]')) return onLifeEdit(el.dataset.iwLife, el.value);
    if (el && el.matches && el.matches('[data-iw-orient]')) {
        const state = currentState();
        const ch = state.characters[el.dataset.iwOrient];
        if (!ch) return;
        if (el.value) ch.orient = el.value; else delete ch.orient;
        ch.orientManual = true;
        await saveEditedState(state);
        return renderAll();
    }
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
    if (el && el.matches && el.matches('[data-iw-tok-in]')) {
        if (String(el.value).trim()) setTokens(el.dataset.iwTokIn, el.value);
        return;
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
        item.innerHTML = '<div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div>💭 Внутренний мир';
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
    return renderSettingsForm(s, { variant, profiles: profileList(), apiStatus, books: worldNames, studied: studiedBooks(), open: sectionOpen[variant], booksHtml, forgetHtml, version: VERSION, updated: UPDATED, imgExts: findImageExtensions(ctx().extensionSettings), imgDesc: key => describeImageExtension(ctx().extensionSettings, key) });
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
      <b class="iw-drawer-title"><span class="iw-dt-spark" aria-hidden="true">✦</span><span class="iw-dt-main">Внутренний</span><span class="iw-dt-main iw-dt-sub">мир</span><svg class="iw-dt-ico" viewBox="0 0 40 32" aria-hidden="true"><defs><linearGradient id="iwDtGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c77dff"/><stop offset=".55" stop-color="#ff6fae"/><stop offset="1" stop-color="#ffa46b"/></linearGradient></defs><path d="M11 22.5c-4.6 0-8-3-8-6.9 0-3.6 2.9-6.4 6.6-6.8C10.7 5 14.3 2.6 18.6 2.6c3.7 0 6.9 1.8 8.4 4.6 4.6-.2 8.4 3.2 8.4 7.4 0 4.4-3.8 7.9-8.6 7.9z" fill="url(#iwDtGrad)" opacity=".22"/><path d="M11 22.5c-4.6 0-8-3-8-6.9 0-3.6 2.9-6.4 6.6-6.8C10.7 5 14.3 2.6 18.6 2.6c3.7 0 6.9 1.8 8.4 4.6 4.6-.2 8.4 3.2 8.4 7.4 0 4.4-3.8 7.9-8.6 7.9z" fill="none" stroke="url(#iwDtGrad)" stroke-width="2.2" stroke-linejoin="round"/><path d="M19.4 18.4c-3.1-2.1-5-3.8-5-6 0-1.5 1.1-2.6 2.5-2.6.9 0 1.8.5 2.5 1.4.7-.9 1.6-1.4 2.5-1.4 1.4 0 2.5 1.1 2.5 2.6 0 2.2-1.9 3.9-5 6z" fill="url(#iwDtGrad)"/><circle cx="8" cy="26.5" r="2.2" fill="url(#iwDtGrad)"/><circle cx="4" cy="30" r="1.3" fill="url(#iwDtGrad)"/></svg></b>
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
const QUICK_KEYS = { budgetMode: ['auto', 'fixed'], budgetCap: null, responseLength: null, contextMessages: null, catchUpMessages: null, npcLimit: null, source: ['main', 'custom'], thinking: ['low', 'medium', 'chat'], infobar: ['on', 'off'], infobarWhere: ['all', 'last'] };
function onQuickSetting(spec) {
    const i = spec.indexOf(':');
    const key = spec.slice(0, i);
    const raw = spec.slice(i + 1);
    if (!(key in QUICK_KEYS)) return;
    const allowed = QUICK_KEYS[key];
    if (allowed && !allowed.includes(raw)) return;
    let value = allowed ? raw : Number(raw);
    if (!allowed && !(value > 0)) return;
    if (key === 'infobar') value = raw === 'on';
    const s = settings();
    s[key] = value;
    saveSettings();
    syncSettingsForm();
    if (key === 'source' && value === 'custom') return openSettingsAt('connect');
    renderPanelNow();
    if (key === 'infobar' || key === 'infobarWhere') renderInfobar();
}

function openSettingsAt(section) {
    sectionOpen.diary[section] = true;
    if (section === 'connect') sectionOpen.diary['connect-g0'] = true;
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
    if (action === 'testMemeImg') {
        const cfg = memeImgCfg();
        if (!cfg) { IMG_STATUS.text = 'Источник картинок не найден: выбери расширение или другой способ.'; return refreshForms(); }
        IMG_STATUS.text = 'Рисую пробную картинку…';
        refreshForms();
        try {
            const src = await generateImage('a tiny cute cartoon cat waving, flat colors, simple background', cfg, ctx());
            IMG_STATUS.text = src ? 'Работает: картинка нарисовалась.' : 'Сервис ничего не вернул.';
        } catch (err) {
            IMG_STATUS.text = `Не вышло: ${String(err && err.message || err).slice(0, 180)}`;
        }
        return refreshForms();
    }
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
    // шрифты для названия расширения в списке расширений таверны и общие для всех тем (записки слухов, мемы)
    if (!document.querySelector('link[data-iw-title-font]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Marck+Script&family=Comfortaa:wght@700&family=Caveat:wght@600;700&family=Oswald:wght@600;700&display=swap';
        link.dataset.iwTitleFont = '1';
        document.head.appendChild(link);
    }
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
    // теги влияния и инфоблок живут рядом с сообщениями: перерисовываем, когда таверна дорисовала чат
    // таверна шлёт событие на каждое дорисованное сообщение (при подгрузке истории — десятки подряд):
    // собираем их в одну перерисовку, иначе на длинном чате прокрутка вверх подлагивает
    let chatBitsTimer = 0;
    const redrawChatBits = () => {
        clearTimeout(chatBitsTimer);
        chatBitsTimer = setTimeout(() => { try { renderDiagAll(); renderInfobar(); } catch { /* без тегов */ } }, 80);
    };
    for (const name of ['CHARACTER_MESSAGE_RENDERED', 'USER_MESSAGE_RENDERED', 'MORE_MESSAGES_LOADED', 'MESSAGE_EDITED', 'MESSAGE_UPDATED', 'CHAT_LOADED']) {
        if (ev[name]) c.eventSource.on(ev[name], redrawChatBits);
    }
    document.querySelectorAll('#chat .iw-badge').forEach(b => b.remove());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closePanel(); });
    // «Аська» на телефоне: наведения нет, поэтому смайлик оживает от касания
    // (дневник живёт в теневом DOM — настоящий элемент под пальцем берём из composedPath)
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const t0 = (e.composedPath && e.composedPath()[0]) || e.target;
        if (!t0 || !t0.closest) return;
        const host = t0.closest('.iw-smile, .iw-npc, .iw-tab, .iw-npc-sticker, .iw-feel, .iw-toast-card, .iw-mood-word, .iw-dossier-face, .iw-panel li');
        if (!host) return;
        playSmiles(host);
        // нажали на вкладку или карточку НПС — страница сейчас перерисуется: оживим смайлик и на новой
        const v = host.closest('[data-iw-view]');
        if (v) smilePlay = { view: v.dataset.iwView, until: Date.now() + 3500 };
    }, { passive: true, capture: true });
    onChatChanged();
}

jQuery(() => {
    try {
        init();
    } catch (e) {
        console.error('[Внутренний мир] не запустилось', e);
    }
});
