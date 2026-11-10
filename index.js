// «Внутренний мир» — желания, страхи, настроение, мечта, черты и первое впечатление персонажей.
import {
    MODULES, MODEL_MODULES, MODULE_NAMES, normText, mergeSettings, emptyState, parseAnalysis, applyAnalysis, sameName, decayState,
    buildSystemPrompt, buildUserPrompt, buildInjection, cleanMessageText, mentioned,
    emptyRoster, parseRoster, rosterFind, rosterMentioned, rosterNames, isMain, namesMatch, namesLookAlike, buildRosterPrompt, loreText,
    prepText, mentionedIn, catchUpTokens, CATCHUP_MSG_CHARS, CATCHUP_EXCERPTS, verifyAliases,
    mergeRoster, buildDreamPrompt, parseDream, buildRewardsPrompt, parseRewards, buyReward, carryOwnEdits, restoreTrait, responseBudget, classifyError,
} from './src/core.js';
import { playSound, setVolume } from './src/sound.js';
import { THEMES, THEME_IDS, validTheme, themeFontUrls, icon as iconHtml } from './src/themes.js';
import { renderPanel, renderToast, renderErrorToast, renderFab, esc } from './src/render.js';
import { renderSettingsForm, applySettingChange } from './src/settings-ui.js';
import { chatRequest, fetchModels, missingFields } from './src/api.js';

const VERSION = '0.4.0';
const UI_CSS = new URL('./ui.css', import.meta.url).href;

const SETTINGS_KEY = 'innerWorld';
const META_KEY = 'inner_world';
const PROMPT_KEY = 'inner_world';
const KEEP_SNAPSHOTS = 12;
const SKIP_TYPES = ['first_message', 'command', 'extension', 'impersonate', 'quiet'];

let busy = false;
let busyKind = '';         // какая кнопка разбора сейчас крутится: chat | lore | all
let dreamBusy = false;
let shopBusy = false;
let pending = null;
let view = '';            // 'main:<имя>' | 'npc' | 'npc:<имя>' | 'settings'
let lastView = '';
let rosterBusy = false;
let status = '';
let currentTheme = 'diary';
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
function splitCast(state) {
    const mn = mainNames();
    const mainsInState = state.order.filter(k => isMain(k, mn));
    // пустая вкладка нужна, только если главного в дневнике ещё нет совсем (одна на персонажа карточки)
    const placeholders = mainsInState.length ? [] : mn.slice(0, 1);
    const mains = [...mainsInState, ...placeholders];
    const npcKeys = state.order.filter(k => !mainsInState.includes(k));
    return { mains, npcKeys, mn, placeholders };
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
async function collectLoreSources(onlyBook = '') {
    const c = ctx();
    const out = [];
    if (onlyBook) {
        try {
            const data = await c.loadWorldInfo(onlyBook);
            const text = loreText(data && data.entries, 14000);
            if (text) out.push({ title: `Лорбук: ${onlyBook}`, text });
        } catch (e) {
            console.warn('[Внутренний мир] лорбук не прочитан', onlyBook, e);
        }
        return out;
    }
    const ch = c.characters && c.characters[c.characterId];
    try {
        const f = c.getCharacterCardFields ? c.getCharacterCardFields() : {};
        const card = [f.description, f.personality, f.scenario].filter(Boolean).join('\n');
        if (card.trim()) out.push({ title: `Карточка: ${c.name2}`, text: cleanMessageText(card, 5000) });
    } catch { /* без карточки */ }
    if (c.chat && c.chat[0] && !c.chat[0].is_user && c.chat[0].mes) out.push({ title: 'Первое сообщение', text: cleanMessageText(c.chat[0].mes, 2000) });
    const persona = c.powerUserSettings && c.powerUserSettings.persona_description;
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
    // лорбуки, отмеченные галочками для этого чата
    for (const b of pickedBooks()) books.add(b);
    const per = Math.max(3000, Math.floor(14000 / Math.max(1, books.size)));
    for (const name of books) {
        try {
            const data = await c.loadWorldInfo(name);
            const text = loreText(data && data.entries, per);
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
    if (!key || !hasChat()) return toastr.info('Сначала открой чат с персонажем.', 'Внутренний мир');
    if (rosterBusy || busy) return;
    const my = runId;
    rosterBusy = true;
    busyKind = mode === 'all' ? 'all' : 'lore';
    status = book ? `Читаю лорбук «${book}»…` : 'Читаю карточку и лорбуки…';
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
        if (sameLore && (mode === 'lore' || sameChat) && !missingPersona()) {
            rosterBusy = false;
            busyKind = '';
            status = 'Ничего нового с прошлого разбора';
            nothingNew(mode === 'lore' ? 'карточка и лорбуки' : 'чат, карточка и лорбуки');
            renderAll();
            return;
        }
        if (!sameLore && (settings().showNpc !== false || !(settings().rosters[key] && settings().rosters[key].at))) {
            const { system, user } = buildRosterPrompt(sources, c.name1, settings().language);
            const raw = await callModel(system, user, withBudget('roster'));
            const fresh = verifyAliases(parseRoster(raw, c.name1), sources.map(x => x.text).join('\n'));
            const old = settings().rosters[key];
            const merged = old && old.at ? mergeRoster(old, fresh) : { main: fresh.main, npc: fresh.npc };
            const books = new Set((old && old.books) || []);
            if (book) books.add(book);
            settings().rosters[key] = { main: merged.main, npc: merged.npc, at: Date.now(), books: [...books] };
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
        rosterBusy = false;
        busyKind = '';
        renderAll();
        return;
    }
    if (my !== runId) return;
    rosterBusy = false;
    renderAll();
    // сведения из карточки и лорбука — главному персонажу и тем, кто в сцене
    const last = lastBotMessageId();
    if (last >= 0) {
        await analyze(last, { manual: true, fromLore: sources.map(x => `[${x.title}]\n${x.text}`), kind: mode === 'all' ? 'all' : 'lore' });
    }
    if (my !== runId) return;
    chatMeta().fp = Object.assign({}, chatMeta().fp, { lore: loreFp });
    ctx().saveMetadataDebounced?.();
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

function recordOf(mes) {
    const rec = mes && mes.extra && mes.extra[META_KEY];
    if (!rec || !rec.state) return null;
    const sid = typeof mes.swipe_id === 'number' ? mes.swipe_id : 0;
    if ((rec.sid ?? 0) !== sid) return null; // копия от другого свайпа
    return rec;
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

// ---------- Подсказка основной модели ----------

function updateInjection(beforeId) {
    const c = ctx();
    const s = settings();
    let text = '';
    if (s.enabled && s.inject && hasChat() && c.chat && c.chat.length) {
        text = buildInjection(liveState(beforeId), s.modules, c.name1, s.moodInfluence);
    }
    c.setExtensionPrompt(PROMPT_KEY, text, 1, Number(s.injectDepth) || 0, false, 0);
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

function cardText(c) {
    try {
        if (c.characterId === undefined || c.characterId === null) return '';
        const f = c.getCharacterCardFields ? c.getCharacterCardFields() : null;
        const ch = c.characters[c.characterId] || {};
        const parts = f
            ? [f.description, f.personality, f.scenario]
            : [ch.description, ch.personality, ch.scenario];
        return cleanMessageText(parts.filter(Boolean).join('\n'), 2000);
    } catch {
        return '';
    }
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

async function callModel(system, user, s) {
    lastCall = { raw: '', budget: Number(s.responseLength) || 0 };
    const my = runId;
    if (!abortCtl || abortCtl.signal.aborted) abortCtl = new AbortController();
    const signal = abortCtl.signal;
    let res;
    try {
        res = await callModelRaw(system, user, s, signal);
    } catch (err) {
        if (my !== runId || signal.aborted) throw cancelledError();
        throw err;
    }
    if (my !== runId) throw cancelledError();
    lastCall.raw = typeof res === 'string' ? res : '';
    return res;
}

function stopAnalysis() {
    runId++;
    if (abortCtl) abortCtl.abort();
    abortCtl = null;
    busy = false;
    rosterBusy = false;
    dreamBusy = false;
    shopBusy = false;
    busyKind = '';
    pending = null;
    status = 'Разбор остановлен';
    updateInjection();
    renderAll();
}

async function callModelRaw(system, user, s, signal) {
    const c = ctx();
    const max = Number(s.responseLength) || 4000;
    if (s.source === 'custom') {
        const missing = missingFields(s);
        if (missing.length) throw new Error(`в настройках подключения не заполнено: ${missing.join(', ')}`);
        if (s.apiKind !== 'profile') return await chatRequest(s, system, user, max, (url, opts) => fetch(url, Object.assign({}, opts, { signal })));
    }
    if (s.source === 'custom' && s.apiKind === 'profile' && s.profileId && c.ConnectionManagerRequestService) {
        const res = await c.ConnectionManagerRequestService.sendRequest(
            s.profileId,
            [{ role: 'system', content: system }, { role: 'user', content: user }],
            Number(s.responseLength) || 4000,
            { stream: false, extractData: true, includePreset: true, includeInstruct: true },
        );
        return typeof res === 'string' ? res : (res && res.content) || '';
    }
    return await c.generateRaw({ systemPrompt: system, prompt: user, responseLength: Number(s.responseLength) || 4000, trimNames: false });
}

async function analyze(messageId, { manual = false, catchUp = null, fromLore = null, kind = 'chat' } = {}) {
    const s = settings();
    const c = ctx();
    if (!MODEL_MODULES.some(m => s.modules[m])) {
        if (manual) toastr.info('Все блоки выключены — анализировать нечего.', 'Внутренний мир');
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
            if (missing.length && userTurns >= 1 && messageId >= 2) catchUp = missing.slice(0, 8);
        }
        const msgs = [];
        const catchUpCount = Math.min(40, Math.max(4, Number(s.catchUpMessages) || 12));
        const count = catchUp ? Math.max(catchUpCount, Number(s.contextMessages) || 6) : Math.max(2, Number(s.contextMessages) || 6);
        let firstInWindow = messageId;
        for (let i = messageId; i >= 0 && msgs.length < count; i--) {
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
            card: cardText(c),
            persona: personaText(c),
            trackNames: [c.name2, ...trackNames(s)],
            messages: msgs,
            mainNames: mn,
            catchUp,
            fromLore: !!fromLore,
            kind,
            loreMain: fromLore ? fromLore.map(t => cleanMessageText(t, 6000)).slice(0, 6) : [],
            history,
            knownNames: s.showNpc === false ? [] : [...(ros.main || []), ...(ros.npc || []).map(e => e.name)].slice(0, 40),
            lore: [],
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
        // НПС из лорбука, которые впервые пришли в сцену: даём модели их описание
        if (s.showNpc !== false) {
            for (const e of ros.npc || []) {
                if (base.order.some(k => rosterFind(ros, k) === e)) continue;
                if (!rosterMentioned(e, recentText) && !(catchUp && catchUp.includes(e.name))) continue;
                info.lore.push(`${e.name}${e.aliases.length ? ` (${e.aliases.join(', ')})` : ''}: ${e.who}${e.traits.length ? `; черты: ${e.traits.join(', ')}` : ''}`);
                if (info.lore.length >= (catchUp ? 10 : 5)) break;
            }
        }
        const system = buildSystemPrompt(s, info);
        const user = buildUserPrompt(info, base, s.modules, present);
        const cast = present || base.order;
        const castMains = Math.max(1, cast.filter(k => isMain(k, mn)).length);
        const castNpcs = (s.showNpc === false ? 0 : cast.length - cast.filter(k => isMain(k, mn)).length) + info.lore.length + (catchUp ? catchUp.length : 0);
        const ask = withBudget(catchUp || fromLore ? 'all' : 'chat', { mains: castMains, npcs: castNpcs });
        budget = ask.responseLength;
        raw = await callModel(system, user, ask);
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
            if (known) f.name = known;
        }
        if (s.showNpc === false) fresh = fresh.filter(x => isMain(x.name, mn));
        if (s.track === 'bot') fresh = fresh.filter(x => sameName(x.name, c.name2));
        if (s.track === 'list') {
            const allowed = info.trackNames;
            fresh = fresh.filter(x => allowed.some(n => sameName(n, x.name)));
        }
        if (!fresh.length) throw new Error('Модель не вернула ни одного персонажа');
        const { state, events } = applyAnalysis(base, fresh, s.modules, { maxChars: Number(s.maxChars) || 4, userName: c.name1, mesId: messageId, points: s.points !== false });
        writeRecord(messageId, state);
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
        if (manual && kind === 'chat') busyKind = '';
        updateInjection();
        renderAll();
        if (pending) {
            const p = pending;
            pending = null;
            if (p.messageId !== messageId || p.manual) analyze(p.messageId, { manual: p.manual });
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
    box.className = `iw-toasts iw-theme-${currentTheme}`;
    return box;
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
            const st = currentState();
            const key = st.order.find(k => sameName(k, ev.who));
            if (key) view = splitCast(st).mains.includes(key) ? 'main:' + key : 'npc:' + key;
            openPanel();
            close();
        });
        box.appendChild(wrap);
        if (settings().sound !== false) playSound(ev.type, currentTheme);
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

function onGenerationStarted(type, _options, dryRun) {
    if (dryRun) return;
    // При свайпе и перегенерации прячем то, что было посчитано по заменяемому ответу.
    if (type === 'swipe' || type === 'regenerate') {
        const last = lastBotMessageId();
        updateInjection(last >= 0 ? last : undefined);
    } else {
        updateInjection();
    }
}

// ---------- Тема ----------

function refreshTheme() {
    currentTheme = validTheme(settings().theme);
    setVolume(settings().volume ?? 45);
    loadFonts(currentTheme);
    const fab = document.getElementById('iw_fab');
    if (fab) setFabTheme(fab);
}

// Меняем только класс темы: чужие классы (например, «спрятано в папку» от STFolder) не трогаем.
function setFabTheme(fab) {
    fab.classList.add('iw-fab');
    for (const cls of [...fab.classList]) if (cls.startsWith('iw-theme-') && cls !== `iw-theme-${currentTheme}`) fab.classList.remove(cls);
    fab.classList.add(`iw-theme-${currentTheme}`);
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
        el.className = `iw-panel iw-theme-${currentTheme}`;
        el.innerHTML = renderPanel({ state: emptyState(), settings: s, theme: currentTheme, view: '', busy: false, status: '', mains: [], npcKeys: [], roster: null, noChat: true });
        return;
    }
    const state = liveState();
    const { mains, npcKeys } = splitCast(state);
    const showNpc = s.showNpc !== false;
    const valid = view === 'settings'
        || (view.startsWith('main:') && mains.includes(view.slice(5)))
        || (view.startsWith('shop:') && !!state.characters[view.slice(5)])
        || (showNpc && view === 'npc')
        || (showNpc && view.startsWith('npc:') && npcKeys.includes(view.slice(4)));
    if (!valid) view = mains.length ? 'main:' + mains[0] : (showNpc ? 'npc' : '');
    el.className = `iw-panel iw-theme-${currentTheme}`;
    const keepScroll = el.querySelector('.iw-body')?.scrollTop || 0;
    const hs = showNpc ? historySeen() : { seen: [], pending: [] };
    const seenOnly = hs.seen
        .filter(e => !npcKeys.some(k => namesMatch(k, e.name) || rosterFind(roster(), k) === e))
        .map(e => Object.assign({}, e, { checked: !hs.pending.includes(e) }));
    el.innerHTML = renderPanel({ state, settings: s, theme: currentTheme, view, busy, busyKind, dreamBusy, shopBusy, status, avatarFor, mains, npcKeys, roster: roster(), rosterBusy, seenOnly, settingsHtml: view === 'settings' ? settingsFormHtml('diary') : '', books: worldNames, picked: pickedBooks(), linked: linkedBooks, working: busy || rosterBusy || dreamBusy || shopBusy });
    const body = el.querySelector('.iw-body');
    if (body) body.scrollTop = keepScroll;
}

function renderAll() {
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

// Открытый дневник — поверх кнопок других расширений (у некоторых слой 10000).
function raiseLayer(on) {
    const host = document.getElementById('iw_host');
    if (host) host.style.zIndex = on ? '10050' : '3050';
}

function togglePanel() {
    if (isOpen()) closePanel();
    else openPanel();
}

async function onPanelClick(e) {
    // всплывающие меню (кошелёк, звук, лорбуки) закрываются, если нажать мимо них
    for (const d of panelEl().querySelectorAll('details.iw-wallet[open], details.iw-vol[open], details.iw-books[open]')) {
        if (!d.contains(e.target)) d.open = false;
    }
    const t = e.target.closest('button');
    if (!t) return;
    const s = settings();
    if (t.classList.contains('iw-close')) return closePanel();
    if (t.classList.contains('iw-gear')) {
        view = view === 'settings' ? lastView || '' : (lastView = view, 'settings');
        return renderPanelNow();
    }
    if (t.dataset.iwAction) return onSettingsAction(t.dataset.iwAction, t);
    if (t.dataset.iwLang) return setLanguage(t.dataset.iwLang);
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
    if (t.dataset.iwStop !== undefined) return stopAnalysis();
    if (t.dataset.iwPickBook) {
        if (!hasChat()) return toastr.info('Сначала открой чат с персонажем.', 'Внутренний мир');
        // галочка ставится на месте, меню не закрывается
        const on = togglePickedBook(t.dataset.iwPickBook);
        t.classList.toggle('on', on);
        t.setAttribute('aria-pressed', String(on));
        const menu = t.closest('.iw-books-menu');
        const n = menu ? menu.querySelectorAll('.iw-book-opt.on:not(.linked)').length : 0;
        const cnt = menu && menu.querySelector('.iw-books-count');
        if (cnt) cnt.textContent = n ? `отмечено: ${n}` : '';
        return;
    }
    if (t.dataset.iwAnalyze) {
        if (!hasChat()) return toastr.info('Сначала открой чат с персонажем.', 'Внутренний мир');
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
            if (id < 0) return toastr.info('В чате ещё нет ответа персонажа.', 'Внутренний мир');
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
    if (t.dataset.iwDream) return onDreamAction(t.dataset.iwDream);
    if (t.dataset.iwShop) return regenShop();
    if (t.dataset.iwWantPin !== undefined) return toggleWantPin(Number(t.dataset.iwWantPin));
    if (t.dataset.iwTrait) return onTraitAction(t.dataset.iwTrait);
    if (t.dataset.iwBuy) return buy(t.dataset.iwBuy);
    if (t.dataset.iwMod) {
        const m = t.dataset.iwMod;
        s.modules[m] = !s.modules[m];
        saveSettings();
        syncSettingsForm();
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwView) {
        view = t.dataset.iwView;
        const body = panelEl().querySelector('.iw-body');
        if (body) body.scrollTop = 0;
        return renderPanelNow();
    }
    if (t.dataset.iwStudy) return studyLore({ mode: 'lore' });
    if (t.dataset.iwQuick) return onQuickSetting(t.dataset.iwQuick);
    if (t.dataset.iwQuickOpen) return openSettingsAt(t.dataset.iwQuickOpen);
    if (t.dataset.iwDel) {
        const [kind, idx] = t.dataset.iwDel.split(':');
        const state = currentState();
        const key = view.includes(':') ? view.slice(view.indexOf(':') + 1) : null;
        const ch = key && state.characters[key];
        if (!ch || !Array.isArray(ch[kind])) return;
        ch[kind].splice(Number(idx), 1);
        markEdited(ch, kind);
        await saveEditedState(state);
        updateInjection();
        return renderAll();
    }
    if (t.dataset.iwForget) {
        const key = t.dataset.iwForget;
        const state = currentState();
        if (!state.characters[key]) return;
        delete state.characters[key];
        state.order = state.order.filter(k => k !== key);
        view = '';
        await saveEditedState(state);
        updateInjection();
        return renderAll();
    }
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
    if (!hasChat() || !settings().modules.traits) return false;
    const st = currentState();
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
    toastr.info(`Ничего нового: ${what} не менялись с прошлого разбора. Мечту и награды можно придумать заново — кубиком у мечты и в магазине.`, 'Внутренний мир');
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
        dreamBusy = true;
        renderAll();
        try {
            const info = analysisInfo(6);
            const cached = knowledgeLore(3);
            if (cached) info.loreMain = cached;
            else {
                const lore = await collectLoreSources().catch(() => []);
                info.loreMain = lore.filter(x => x.title.startsWith('Лорбук')).map(x => `[${x.title}]\n${cleanMessageText(x.text, 4000)}`).slice(0, 3);
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

async function buy(id) {
    const key = viewKey();
    const st = currentState();
    const ch = key && st.characters[key];
    if (!ch) return;
    const reward = (ch.shop || []).find(r => r.id === id);
    const err = buyReward(ch, reward);
    if (err) return toastr.info(err, 'Внутренний мир');
    await saveEditedState(st);
    updateInjection();
    if (settings().sound !== false) playSound('reward', currentTheme);
    if (settings().toasts) showEvent({ type: 'reward', who: ch.name, text: reward.kind === 'collect' ? `«${reward.title}» — в коллекции` : `«${reward.title}» — ${reward.kind === 'event' ? 'случится в следующем ответе' : 'действует'}` });
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
    if (el && el.matches && el.matches('[data-iw-volume]')) {
        settings().volume = Number(el.value) || 0;
        setVolume(settings().volume);
        saveSettings();
        playSound('want_done', currentTheme);
        syncSettingsForm();
        return;
    }
    if (el.closest && el.closest('.iw-form')) {
        const body = panelEl().querySelector('.iw-body');
        const keep = body ? body.scrollTop : 0;
        await onSettingsChanged(el);
        const body2 = panelEl().querySelector('.iw-body');
        if (body2) body2.scrollTop = keep;
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

// Лорбуки, которые и так привязаны к персонажу, чату или персоне: читаются всегда.
let linkedBooks = [];

async function loadLinkedBooks() {
    const c = ctx();
    const out = new Set();
    try {
        const ch = c.characters && c.characters[c.characterId];
        const charBook = ch && ch.data && ch.data.extensions && ch.data.extensions.world;
        if (charBook) out.add(charBook);
        const wi = await import('/scripts/world-info.js');
        const extra = wi.world_info && wi.world_info.charLore && ch && wi.world_info.charLore.find(e => e.name === String(ch.avatar).replace(/\.[^.]+$/, ''));
        for (const b of (extra && extra.extraBooks) || []) out.add(b);
        if (c.chatMetadata && c.chatMetadata.world_info) out.add(c.chatMetadata.world_info);
        const personaBook = c.powerUserSettings && c.powerUserSettings.persona_description_lorebook;
        if (personaBook) out.add(personaBook);
    } catch { /* без привязанных */ }
    linkedBooks = [...out];
}

function studiedBooks() {
    const r = settings().rosters[rosterKey()];
    return (r && r.books) || [];
}

function settingsFormHtml(variant) {
    return renderSettingsForm(settings(), { variant, profiles: profileList(), apiStatus, books: worldNames, studied: studiedBooks(), open: sectionOpen[variant] });
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
const QUICK_KEYS = { budgetMode: ['auto', 'fixed'], budgetCap: null, responseLength: null, contextMessages: null, source: ['main', 'custom'] };
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

async function resetChat() {
    const c = ctx();
    if (!c.chat || !c.chat.length) return;
    const ok = await c.callGenericPopup('Очистить дневник «Внутреннего мира» в этом чате? Сообщения не пострадают.', c.POPUP_TYPE.CONFIRM);
    if (!ok) return;
    for (const m of c.chat) {
        if (m && m.extra) delete m.extra[META_KEY];
        for (const sw of (m && m.swipe_info) || []) if (sw && sw.extra) delete sw.extra[META_KEY];
    }
    c.chatMetadata[META_KEY] = { base: null, counter: 0 };
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
    } catch (e) {
        console.warn('[Внутренний мир] команды не добавлены', e);
    }
}

async function onChatChanged() {
    view = '';
    status = '';
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
