// «Внутренний мир» — желания, страхи, настроение, мечта, черты и первое впечатление персонажей.
import {
    MODULES, MODEL_MODULES, MODULE_NAMES, normText, mergeSettings, emptyState, parseAnalysis, applyAnalysis, sameName, decayState,
    buildSystemPrompt, buildUserPrompt, buildInjection, cleanMessageText, mentioned,
    emptyRoster, parseRoster, rosterFind, rosterMentioned, rosterNames, isMain, namesMatch, namesLookAlike, buildRosterPrompt, loreText,
    prepText, mentionedIn, catchUpTokens, CATCHUP_MSG_CHARS, CATCHUP_EXCERPTS, verifyAliases,
} from './src/core.js';
import { THEMES, THEME_IDS, validTheme, themeFontsUrl } from './src/themes.js';
import { renderPanel, renderToast, renderFab, esc } from './src/render.js';
import { renderSettingsForm, applySettingChange } from './src/settings-ui.js';
import { chatRequest, fetchModels, missingFields } from './src/api.js';

const VERSION = '0.2.0';
const UI_CSS = new URL('./ui.css', import.meta.url).href;

const SETTINGS_KEY = 'innerWorld';
const META_KEY = 'inner_world';
const PROMPT_KEY = 'inner_world';
const KEEP_SNAPSHOTS = 12;
const SKIP_TYPES = ['first_message', 'command', 'extension', 'impersonate', 'quiet'];

let busy = false;
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

async function collectLoreSources() {
    const c = ctx();
    const out = [];
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

async function studyLore() {
    const c = ctx();
    const key = rosterKey();
    if (!key || !hasChat()) return toastr.info('Сначала открой чат с персонажем.', 'Внутренний мир');
    if (rosterBusy) return;
    rosterBusy = true;
    status = 'Читаю карточку и лорбук…';
    renderAll();
    try {
        const sources = await collectLoreSources();
        if (!sources.length) throw new Error('нечего читать: карточка и лорбук пустые');
        const { system, user } = buildRosterPrompt(sources, c.name1, settings().language);
        const raw = await callModel(system, user, Object.assign({}, settings(), { responseLength: 2500 }));
        const r = verifyAliases(parseRoster(raw, c.name1), sources.map(x => x.text).join('\n'));
        settings().rosters[key] = { main: r.main, npc: r.npc, at: Date.now() };
        saveSettings();
        status = `Знаю персонажей мира: ${r.npc.length}`;
        view = 'npc';
        historyCache.key = '';
    } catch (err) {
        console.error('[Внутренний мир]', err);
        status = 'Не получилось изучить: ' + (err && err.message ? err.message : err);
        toastr.error(status, 'Внутренний мир');
    } finally {
        rosterBusy = false;
        renderAll();
    }
    // если чат не новый — сразу отмечаем тех, кто уже встречался по истории
    const last = lastBotMessageId();
    if (settings().rosters[key] && last >= 2 && (ctx().chat || []).some(m => m && m.is_user)) {
        await analyze(last, { manual: true });
    }
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

async function callModel(system, user, s) {
    const c = ctx();
    const max = Number(s.responseLength) || 1500;
    if (s.source === 'custom') {
        const missing = missingFields(s);
        if (missing.length) throw new Error(`в настройках подключения не заполнено: ${missing.join(', ')}`);
        if (s.apiKind !== 'profile') return await chatRequest(s, system, user, max);
    }
    if (s.source === 'custom' && s.apiKind === 'profile' && s.profileId && c.ConnectionManagerRequestService) {
        const res = await c.ConnectionManagerRequestService.sendRequest(
            s.profileId,
            [{ role: 'system', content: system }, { role: 'user', content: user }],
            Number(s.responseLength) || 1500,
            { stream: false, extractData: true, includePreset: true, includeInstruct: true },
        );
        return typeof res === 'string' ? res : (res && res.content) || '';
    }
    return await c.generateRaw({ systemPrompt: system, prompt: user, responseLength: Number(s.responseLength) || 1500, trimNames: false });
}

async function analyze(messageId, { manual = false, catchUp = null } = {}) {
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
    busy = true;
    status = 'Пишу в дневник…';
    renderAll();
    try {
        const chat = c.chat;
        // эмоции стареют на число ответов бота с прошлой записи, включая этот
        const base = decayState(currentState(messageId), botRepliesBetween(findHolder(messageId).index, messageId));
        // «Догоняющий» режим: дневник заполняется впервые для уже идущей истории
        // или в истории есть НПС из лорбука, которых в дневнике ещё нет.
        const ros0 = roster();
        if (catchUp === null && (manual || base.order.length === 0)) {
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
        const raw = await callModel(system, user, catchUp ? Object.assign({}, s, { responseLength: Math.max(Number(s.responseLength) || 1500, 3000) }) : s);
        if (chatId && c.getCurrentChatId && ctx().getCurrentChatId() !== chatId) return; // чат сменился
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
        const { state, events } = applyAnalysis(base, fresh, s.modules, { maxChars: Number(s.maxChars) || 4, userName: c.name1, mesId: messageId });
        writeRecord(messageId, state);
        if (catchUp) {
            // кого проверили по истории, но в сцене лично не было — не перепроверяем, пока не упомянут снова
            const meta = chatMeta();
            meta.checked = meta.checked || {};
            for (const name of catchUp) meta.checked[name] = messageId;
            ctx().saveMetadataDebounced?.();
        }
        await ctx().saveChat();
        status = catchUp ? `Дневник заполнен по истории чата (до сообщения #${messageId})` : `Обновлено после сообщения #${messageId}`;
        if (s.toasts && !catchUp) events.forEach((ev, i) => showEvent(ev, i * 450));
        if (events.length && !isOpen()) markFab(true);
        if (!view) view = '';
    } catch (err) {
        console.error('[Внутренний мир]', err);
        status = 'Не получилось: ' + (err && err.message ? err.message : err);
        if (manual) toastr.error(status, 'Внутренний мир');
    } finally {
        busy = false;
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
        setTimeout(close, 9000);
    }, delay);
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
    loadFonts(currentTheme);
    const fab = byId('iw_fab');
    if (fab) fab.className = `iw-fab iw-theme-${currentTheme}`;
}

function loadFonts(theme) {
    if (loadedFonts.has(theme)) return;
    loadedFonts.add(theme);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = themeFontsUrl(theme);
    link.dataset.iwFonts = theme;
    document.head.appendChild(link);
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
        || (showNpc && view === 'npc')
        || (showNpc && view.startsWith('npc:') && npcKeys.includes(view.slice(4)));
    if (!valid) view = mains.length ? 'main:' + mains[0] : (showNpc ? 'npc' : '');
    el.className = `iw-panel iw-theme-${currentTheme}`;
    const keepScroll = el.querySelector('.iw-body')?.scrollTop || 0;
    const hs = showNpc ? historySeen() : { seen: [], pending: [] };
    const seenOnly = hs.seen
        .filter(e => !npcKeys.some(k => namesMatch(k, e.name) || rosterFind(roster(), k) === e))
        .map(e => Object.assign({}, e, { checked: !hs.pending.includes(e) }));
    el.innerHTML = renderPanel({ state, settings: s, theme: currentTheme, view, busy, status, avatarFor, mains, npcKeys, roster: roster(), rosterBusy, seenOnly, settingsHtml: view === 'settings' ? settingsFormHtml('diary') : '' });
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
    const t = e.target.closest('button');
    if (!t) return;
    const s = settings();
    if (t.classList.contains('iw-close')) return closePanel();
    if (t.classList.contains('iw-gear')) {
        view = view === 'settings' ? lastView || '' : (lastView = view, 'settings');
        return renderPanelNow();
    }
    if (t.dataset.iwAction) return onSettingsAction(t.dataset.iwAction);
    if (t.classList.contains('iw-refresh')) {
        if (!hasChat()) return toastr.info('Сначала открой чат с персонажем.', 'Внутренний мир');
        const id = lastBotMessageId();
        if (id < 0) return toastr.info('В чате ещё нет ответа персонажа.', 'Внутренний мир');
        return analyze(id, { manual: true });
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
        view = t.dataset.iwView;
        const body = panelEl().querySelector('.iw-body');
        if (body) body.scrollTop = 0;
        return renderPanelNow();
    }
    if (t.dataset.iwStudy) return studyLore();
    if (t.dataset.iwDel) {
        const [kind, idx] = t.dataset.iwDel.split(':');
        const state = currentState();
        const key = view.includes(':') ? view.slice(view.indexOf(':') + 1) : null;
        const ch = key && state.characters[key];
        if (!ch || !Array.isArray(ch[kind])) return;
        ch[kind].splice(Number(idx), 1);
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

async function onPanelChange(e) {
    const el = e.target;
    if (el.closest && el.closest('.iw-form')) {
        const body = panelEl().querySelector('.iw-body');
        const keep = body ? body.scrollTop : 0;
        const form = panelEl().querySelector('.iw-form');
        const open = form ? openSections(form) : {};
        await onSettingsChanged(el);
        const form2 = panelEl().querySelector('.iw-form');
        if (form2) restoreSections(form2, open);
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

function addFab() {
    let btn = byId('iw_fab');
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
    ui().appendChild(btn);
    btn.className = `iw-fab iw-theme-${currentTheme}`;
    placeFab(btn);

    let drag = null;
    btn.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: btn.offsetLeft, by: btn.offsetTop, moved: false };
        btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        btn.classList.add('iw-dragging');
        const x = Math.min(Math.max(drag.bx + dx, 4), window.innerWidth - btn.offsetWidth - 4);
        const y = Math.min(Math.max(drag.by + dy, 4), window.innerHeight - btn.offsetHeight - 4);
        btn.style.left = `${x}px`;
        btn.style.top = `${y}px`;
    });
    const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        const moved = drag.moved;
        drag = null;
        btn.classList.remove('iw-dragging');
        if (moved) {
            settings().fabPos = {
                x: (btn.offsetLeft + btn.offsetWidth / 2) / window.innerWidth,
                y: (btn.offsetTop + btn.offsetHeight / 2) / window.innerHeight,
            };
            saveSettings();
        } else if (e.type === 'pointerup') {
            togglePanel();
        }
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePanel();
        }
    });
    window.addEventListener('resize', () => {
        const b = byId('iw_fab');
        if (b) placeFab(b);
    });
}

// Точка на кнопке: что-то случилось, а дневник закрыт.
function markFab(on) {
    const dot = ui().querySelector('#iw_fab .iw-fab-dot');
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

// Какие разделы формы раскрыты — чтобы после перерисовки ничего не схлопывалось.
function openSections(root) {
    const out = {};
    root.querySelectorAll('details[data-iw-sec]').forEach(d => { out[d.dataset.iwSec] = d.open; });
    return out;
}

function restoreSections(root, open) {
    root.querySelectorAll('details[data-iw-sec]').forEach(d => {
        if (open[d.dataset.iwSec] !== undefined) d.open = open[d.dataset.iwSec];
    });
}

let apiStatus = '';

function settingsFormHtml(variant) {
    return renderSettingsForm(settings(), { variant, profiles: profileList(), apiStatus });
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
    const open = openSections(holder);
    holder.innerHTML = settingsFormHtml('st');
    restoreSections(holder, open);
}

// Общий обработчик изменений — и для таверны, и для дневника.
async function onSettingsChanged(el) {
    const s = settings();
    const before = `${s.apiKind}|${s.apiEndpoint}`;
    if (!applySettingChange(s, el)) return false;
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

async function onSettingsAction(action) {
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
            const text = await callModel('Ответь одним словом.', 'Скажи «работает».', Object.assign({}, s, { responseLength: 50 }));
            apiStatus = `✓ Работает. Модель ответила: «${String(text).trim().slice(0, 60)}»`;
        } catch (err) {
            apiStatus = '✗ Не работает: ' + (err && err.message ? err.message : err);
        }
        return refreshForms();
    }
    if (action === 'study') {
        await studyLore();
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
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-iw-action]');
        if (b) onSettingsAction(b.dataset.iwAction);
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
