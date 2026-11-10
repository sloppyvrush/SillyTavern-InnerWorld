import assert from 'node:assert/strict';
import {
    DEFAULT_SETTINGS, mergeSettings, emptyState, parseAnalysis, applyAnalysis, buildInjection, decayState,
    buildSystemPrompt, buildUserPrompt, cleanMessageText, extractJson, eventText, lowerWord, moodletLeftLabel, mentioned, plural,
} from '../src/core.js';
import { themeLabels, validTheme } from '../src/themes.js';
import { renderPanel, renderToast } from '../src/render.js';
import { parseRoster, rosterFind, isMain, loreText, buildRosterPrompt, namesLookAlike, parseRewards, buyReward, mergeRoster, guessFace, moodFaces, carryOwnEdits, genderOf, restoreTrait, responseBudget, classifyError, parseBorn, zodiacOf } from '../src/core.js';
import { renderNpcList, renderErrorToast } from '../src/render.js';

const all = DEFAULT_SETTINGS.modules;
let passed = 0;
function test(name, fn) {
    try {
        fn();
    } catch (e) {
        console.error('ПРОВАЛ:', name);
        throw e;
    }
    passed++;
}
const one = obj => parseAnalysis(JSON.stringify({ characters: [obj] }));

test('настройки: «авто» больше нет, остаётся дневник', () => {
    const s = mergeSettings({ theme: 'auto', modules: { traits: false } });
    assert.equal(s.theme, 'diary');
    assert.equal(s.modules.traits, false);
    assert.equal(s.modules.wants, true);
    assert.equal(s.fab, true);
    assert.equal(s.badges, undefined);
    assert.equal(s.moodTurns.deep, 12);
    assert.equal(validTheme('nope'), 'diary');
});

test('JSON достаётся из ```json и размышлений', () => {
    const d = extractJson('<think>хм {не то}</think>Вот:\n```json\n{"characters":[{"name":"Марк","mood":"напряжён",}]}\n```');
    assert.equal(d.characters[0].name, 'Марк');
});

test('эмоции и настроение — со строчной, без точки', () => {
    assert.equal(lowerWord('Усталость.'), 'усталость');
    assert.equal(lowerWord('НКВД'), 'НКВД');
    const [m] = one({ name: 'Марк', mood: 'Встревожен', moodlets: [{ emotion: 'Досада', weight: 'light', turns: 9 }] });
    assert.equal(m.mood, 'встревожен');
    assert.equal(m.moodlets[0].emotion, 'досада');
    assert.equal(m.moodlets[0].left, 2, 'мимолётная эмоция живёт не дольше 2 ответов');
});

test('сила эмоции ограничивает срок', () => {
    const [m] = one({ name: 'Марк', moodlets: [
        { emotion: 'горе', weight: 'deep', turns: 2 },
        { emotion: 'тревога', weight: 'medium', turns: 40 },
        { emotion: 'скука' },
    ] });
    assert.equal(m.moodlets[0].left, 6);
    assert.equal(m.moodlets[1].left, 6);
    assert.equal(m.moodlets[2].weight, 'medium');
    assert.equal(moodletLeftLabel({ weight: 'deep', left: 12 }), 'ещё 12 ответов');
    assert.equal(moodletLeftLabel({ weight: 'deep', left: 22 }), 'ещё 22 ответа');
    assert.equal(moodletLeftLabel({ weight: 'light', left: 1 }), 'пройдёт после следующего ответа');
    assert.equal(plural(21, 'ответ', 'ответа', 'ответов'), 'ответ');
    assert.equal(plural(11, 'ответ', 'ответа', 'ответов'), 'ответов');
});

test('ручная длительность эмоций', () => {
    const manual = { light: 1, medium: 3, deep: 30 };
    const list = parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', moodlets: [
        { emotion: 'горе', weight: 'deep', turns: 6 }, { emotion: 'скука', weight: 'light', turns: 2 },
    ] }] }), { manualTurns: manual });
    assert.deepEqual(list[0].moodlets.map(m => m.left), [30, 1]);
    const sys = buildSystemPrompt({ ...DEFAULT_SETTINGS, moodMode: 'manual' }, { userName: 'Ева', botName: 'Марк', trackNames: [] });
    assert.ok(!sys.includes('"turns"'));
});

test('эмоции угасают сами и освежаются без дублей', () => {
    let { state } = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'весел', moodlets: [
        { emotion: 'радость', weight: 'medium', turns: 3, tone: 'good' },
        { emotion: 'смущение', weight: 'light', turns: 1 },
        { emotion: 'влюблённость', weight: 'deep', turns: 15, tone: 'good' },
    ] }), all, {});
    state = decayState(state, 2);
    assert.deepEqual(state.characters['Марк'].moodlets.map(m => [m.emotion, m.left]), [['влюблённость', 13], ['радость', 1]]);
    // модель вернула ту же радость снова и сняла влюблённость
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'рад', moodlets: [{ emotion: 'Радость', weight: 'medium', turns: 4 }], ended: ['влюблённость'] }), all, {}));
    assert.deepEqual(state.characters['Марк'].moodlets.map(m => [m.emotion, m.left]), [['радость', 4]]);
    // без новых эмоций старые остаются как были
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'спокоен' }), all, {}));
    assert.equal(state.characters['Марк'].moodlets.length, 1);
    assert.equal(state.characters['Марк'].mood, 'спокоен');
});

test('черты: при знакомстве все исходные, потом одно изменение и пауза', () => {
    let { state, events } = applyAnalysis(emptyState(), one({ name: 'Марк', traits: [
        { name: 'скрытный', kind: 'base' }, { name: 'вспыльчивый', kind: 'new', why: 'просто так' },
    ] }), all, {});
    assert.deepEqual(state.characters['Марк'].traits.map(t => t.kind), ['base', 'base']);
    assert.equal(events.length, 0);

    // без причины изменения не принимаются, а пропущенные черты не пропадают
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', traits: [{ name: 'скрытный', kind: 'down' }, { name: 'ревнивый', kind: 'new' }] }), all, {}));
    assert.deepEqual(state.characters['Марк'].traits.map(t => `${t.name}:${t.kind}`), ['скрытный:base', 'вспыльчивый:base']);
    assert.equal(events.length, 0);

    // значимое событие: принимается только одно изменение
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', traits: [
        { name: 'недоверчивый', kind: 'new', why: 'узнал о предательстве сестры' },
        { name: 'скрытный', kind: 'up', why: 'то же' },
    ] }), all, {}));
    assert.deepEqual(state.characters['Марк'].traits.map(t => `${t.name}:${t.kind}`), ['скрытный:base', 'вспыльчивый:base', 'недоверчивый:new']);
    assert.deepEqual(events.map(e => e.type), ['trait_new']);

    // сразу после изменения — пауза
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', traits: [{ name: 'вспыльчивый', kind: 'down', why: 'успокоился' }] }), all, {}));
    assert.equal(state.characters['Марк'].traits[1].kind, 'base');
    assert.equal(events.length, 0);
    for (let i = 0; i < 2; i++) ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'ок' }), all, {}));
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', traits: [{ name: 'вспыльчивый', kind: 'down', why: 'Ева спасла ему жизнь' }] }), all, {}));
    assert.equal(state.characters['Марк'].traits[1].kind, 'down');
    assert.deepEqual(events.map(e => e.type), ['trait_down']);
});

test('события: желание, страх, шаг к мечте, первое впечатление', () => {
    const r1 = applyAnalysis(emptyState(), one({
        name: 'Марк', g: 'm', wants: [{ text: 'Чтобы Ева осталась на ужин', pct: 60 }],
        fears: [{ text: 'Что Лида узнает', strength: 2, level: 'Пугает' }],
        dream: { title: 'Сохранить дом', steps: [{ text: 'Отдать долг' }, { text: 'Починить крышу' }] },
        impression: { label: 'Интерес', score: 1, why: 'смелая', now: 'присматривается' },
    }), all, { userName: 'Ева' });
    assert.deepEqual(r1.events.map(e => e.type), ['impression']);
    assert.equal(r1.state.characters['Марк'].fears[0].level, 'пугает');

    const r2 = applyAnalysis(r1.state, parseAnalysis(JSON.stringify({ characters: [{
        name: 'марк', wants: [{ text: 'Чтобы Ева осталась на ужин', pct: 100, status: 'done' }],
        fears: [{ text: 'Что Лида узнает', strength: 3, status: 'realized' }],
        dream: { title: 'Другая мечта', steps: [{ text: 'Отдать долг', done: true }] },
        impression: { label: 'Другое', score: -2, now: 'доверяет' },
    }, { name: 'Ева', mood: 'это игрок' }] })), all, { userName: 'Ева' });
    assert.deepEqual(r2.events.map(e => e.type).sort(), ['dream_step', 'fear_real', 'want_done']);
    const m = r2.state.characters['Марк'];
    assert.equal(r2.state.order.length, 1, 'игрок не попадает в дневник');
    assert.equal(m.dream.title, 'Сохранить дом');
    assert.equal(m.impression.label, 'интерес');
    assert.equal(m.impression.now, 'доверяет');

    const r3 = applyAnalysis(r2.state, one({ name: 'Марк', wants: [{ text: 'Чтобы Ева осталась на ужин', status: 'done' }, { text: 'Поговорить наедине', pct: 30 }], fears: [{ text: 'Что Лида узнает', status: 'realized' }] }), all, {});
    assert.equal(r3.events.length, 0);
    assert.deepEqual(r3.state.characters['Марк'].wants.map(w => w.text), ['Поговорить наедине']);
});

test('выключенные блоки не просятся у модели', () => {
    const mods = { ...all, traits: false, dream: false };
    const sys = buildSystemPrompt({ ...DEFAULT_SETTINGS, modules: mods }, { userName: 'Ева', botName: 'Марк', trackNames: [] });
    assert.ok(!sys.includes('"traits"'));
    assert.ok(!sys.includes('"dream"'));
    assert.ok(sys.includes('«Сейчас он…»'));
    assert.ok(!sys.includes('ТОЛЬКО после'));
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] }).includes('ТОЛЬКО после'));
});

test('подсказка основной модели без мимолётных эмоций', () => {
    const { state } = applyAnalysis(emptyState(), one({
        name: 'Марк', mood: 'напряжён',
        moodlets: [{ emotion: 'тревога', why: 'письмо', weight: 'medium' }, { emotion: 'скука', weight: 'light' }, { emotion: 'горе', weight: 'deep', why: 'смерть отца' }],
        wants: [{ text: 'Уехать' }], fears: [{ text: 'Одиночества' }],
        impression: { label: 'Интерес', score: 1, now: 'доверяет' },
    }), all, {});
    const text = buildInjection(state, all, 'Ева');
    assert.ok(text.includes('Марк: сейчас напряжён; на душе: горе (сильно) — смерть отца; тревога — письмо'));
    assert.ok(!text.includes('скука'));
    assert.ok(text.includes('отношение к игроку (Ева): +1 из 3 — доверяет'));
    assert.ok(buildInjection(state, all, 'Ева', 'all').includes('скука'));
    assert.ok(!buildInjection(state, all, 'Ева', 'strong').includes('тревога'));
    assert.ok(!buildInjection(state, all, 'Ева', 'none').includes('горе'));
    assert.equal(buildInjection(emptyState(), all, 'Ева'), '');
});

test('отношение к игроку меняется со временем и попадает в хронику', () => {
    let { state, events } = applyAnalysis(emptyState(), one({ name: 'Марк', impression: { label: 'Подозрение', score: -1, why: 'чужая' } }), all, { mesId: 3 });
    assert.deepEqual(state.characters['Марк'].attitude.map(p => p.s), [-1]);
    assert.equal(state.characters['Марк'].log[0].type, 'impression');
    assert.equal(state.characters['Марк'].log[0].m, 3);
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', impression: { label: 'x', score: 3, now: 'привыкает', now_score: 0 } }), all, { mesId: 5 }));
    assert.equal(events.length, 0, 'шаг на 1 — без всплывашки');
    assert.equal(state.characters['Марк'].impression.label, 'подозрение');
    ({ state, events } = applyAnalysis(state, one({ name: 'Марк', impression: { label: 'x', now: 'доверяет', now_score: 2 } }), all, { mesId: 9 }));
    assert.deepEqual(events.map(e => e.type), ['attitude']);
    assert.deepEqual(state.characters['Марк'].attitude.map(p => p.s), [-1, 0, 2]);
    assert.deepEqual(state.characters['Марк'].log.map(l => l.type), ['attitude', 'impression']);
    assert.equal(eventText(events[0]), '0 → +2: доверяет');
});

test('кто в сцене: имя в любом падеже', () => {
    assert.ok(mentioned('Иван Соколов', 'Соколова позвали к начальству'));
    assert.ok(mentioned('Петя Зайцев', 'она посмотрела на Петю'));
    assert.ok(!mentioned('Марк', 'Ева пошла домой'));
    const state = applyAnalysis(emptyState(), parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', mood: 'рад' }, { name: 'Лида', mood: 'зла' }] })), all, {}).state;
    const u = buildUserPrompt({ botName: 'Марк', userName: 'Ева', messages: ['Марк: привет'] }, state, all, ['Марк']);
    assert.ok(u.includes('"name":"Марк"'));
    assert.ok(!u.includes('"name":"Лида"'));
    assert.ok(u.includes('Нет в сцене (не возвращай): Лида'));
});

test('запрос к модели собирается', () => {
    const u = buildUserPrompt({ botName: 'Марк', userName: 'Ева', card: 'карточка', persona: '', messages: ['Марк: привет'] }, emptyState(), all);
    assert.ok(u.includes('[Карточка: Марк]'));
    assert.ok(u.includes('пока пусто'));
});

test('чистка текста сообщения', () => {
    assert.equal(cleanMessageText('<think>скрыто</think>Привет <img src="[IMG:GEN]"> <b>мир</b>'), 'Привет мир');
    assert.ok(cleanMessageText('а'.repeat(5000), 1000).length < 1100);
});

test('подписи по полу и теме', () => {
    assert.equal(themeLabels('diary', 'f').moodLead, 'Сейчас она');
    assert.equal(themeLabels('diary', 'm').wants, 'Хочет…');
    assert.equal(themeLabels('dark', 'm').fears, 'Боится…');
    assert.equal(themeLabels('medieval', 'f').moodLead, 'Ныне она');
    for (const t of ['diary', 'dark', 'medieval', 'grid', 'sims']) assert.equal(themeLabels(t, 'm').traits, 'Черты характера');
    assert.equal(themeLabels('bimbo', 'f').moodLead, 'Сейчас она');
    assert.equal(validTheme('bimbo'), 'bimbo');
});

test('дневник и всплывашка рисуются и экранируют текст', () => {
    const { state } = applyAnalysis(emptyState(), one({
        name: 'Марк<script>', g: 'm', mood: 'рад', moodlets: [{ emotion: 'радость', why: '<b>x</b>', tone: 'good' }],
        wants: [{ text: 'Уехать' }], fears: [{ text: 'Одиночества', strength: 2, level: 'пугает' }],
        dream: { title: 'Дом', steps: [{ text: 'Долг', done: true }, { text: 'Крыша' }] },
        traits: [{ name: 'Скрытный' }], impression: { label: 'Интерес', score: -1, why: 'смотрела' },
    }), all, {});
    const html = renderPanel({ state, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:' + state.order[0], busy: false, status: '', mains: state.order, npcKeys: [], roster: null });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
    assert.ok(html.includes('1 из 2'));
    assert.ok(!html.includes('Чувствует') && html.includes('iw-feels-flat'));
    assert.ok(html.includes('Сейчас он'));
    assert.ok(html.includes('Основные'));
    assert.ok(html.includes('Приобретённые'));
    assert.ok(html.includes('Хроника'));
    assert.ok(html.includes('Отношение к тебе'));
    assert.ok(!html.includes('fa-solid'));
    assert.ok(!html.includes('iw-bar'));
    assert.ok(!html.includes('value="auto"'));
    const empty = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'cyber', view: '', mains: [], npcKeys: [], roster: null });
    assert.ok(empty.includes('Нет данных'));
    const toast = renderToast({ type: 'fear_real', who: 'Лида<', text: 'Что узнают' }, 'cyber');
    assert.ok(toast.includes('THREAT DETECTED'));
    assert.ok(toast.includes('Лида&lt;'));
    assert.ok(renderToast({ type: 'want_done', who: 'Марк', text: 'Ужин' }, 'diary').includes('Желание исполнено'));
});

test('тексты всплывашек', () => {
    assert.equal(eventText({ type: 'want_done', who: 'Марк', text: 'Ужин' }), '«Ужин» — сбылось!');
});

test('НПС из лорбука: список, поиск по прозвищу, главный персонаж', () => {
    const r = parseRoster(JSON.stringify({ main: ['Иван Соколов'], npc: [
        { name: 'Константин Волков', aliases: ['Волк', 'Волков'], g: 'm', who: 'бандит из качалки', traits: ['Жестокий'] },
        { name: 'Ева Белова', who: 'это игрок' },
        { name: 'Иван Соколов', who: 'дубль главного' },
        { name: 'Хромой', who: 'главарь' },
    ] }), 'Ева Белова');
    assert.deepEqual(r.npc.map(e => e.name), ['Константин Волков', 'Хромой']);
    assert.equal(r.npc[0].traits[0], 'жестокий');
    assert.equal(rosterFind(r, 'Волк').name, 'Константин Волков');
    assert.equal(rosterFind(r, 'Волкову').name, 'Константин Волков');
    assert.equal(rosterFind(r, 'Лида'), null);
    assert.ok(isMain('Соколов', ['Иван Соколов']));
    assert.ok(!isMain('Хромой', ['Иван Соколов']));
    assert.ok(!isMain('Ирина Соколова', ['Иван Соколов']), 'однофамильцы — разные люди');
    assert.ok(isMain('Ивана Соколова', ['Иван Соколов']));
    const lt = loreText({ 1: { comment: 'Волк', key: ['волк'], content: 'Бандит.' }, 2: { disable: true, content: 'скрыто' } });
    assert.ok(lt.includes('Волк') && !lt.includes('скрыто'));
    assert.ok(buildRosterPrompt([{ title: 'Карточка', text: 'x' }], 'Ева').system.includes('Игрока (Ева)'));
});

test('список НПС: встреченные и вопросики', () => {
    const { state } = applyAnalysis(emptyState(), parseAnalysis(JSON.stringify({ characters: [{ name: 'Иван Соколов', mood: 'собран' }, { name: 'Константин Волков', mood: 'зол' }] })), all, {});
    const ros = parseRoster(JSON.stringify({ main: ['Иван Соколов'], npc: [{ name: 'Константин Волков', aliases: ['Волк'] }, { name: 'Хромой' }, { name: 'Зоя' }] }));
    const roster = Object.assign({}, ros, { find: n => rosterFind(ros, n) });
    const html = renderPanel({ state, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'npc', mains: ['Иван Соколов'], npcKeys: ['Константин Волков'], roster });
    assert.ok(html.includes('data-iw-view="npc:Константин Волков"'));
    assert.equal((html.match(/iw-npc-unknown"/g) || []).length, 2);
    assert.ok(!html.includes('Хромой'), 'невстреченные скрыты');
    assert.ok(html.includes('1 из 3'));
    const open = renderPanel({ state, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'npc:Константин Волков', mains: ['Иван Соколов'], npcKeys: ['Константин Волков'], roster });
    assert.ok(open.includes('все НПС') && open.includes('зол'));
    assert.ok(open.includes('Кто это?'));
    assert.ok(!open.includes('ещё зовут'), 'непроверенные прозвища не показываем');
    const off = renderPanel({ state, settings: { ...DEFAULT_SETTINGS, showNpc: false }, theme: 'diary', view: 'main:Иван Соколов', mains: ['Иван Соколов'], npcKeys: ['Константин Волков'], roster });
    assert.ok(!off.includes('iw-npc-sticker'));
});

test('кириллица и латиница, пустой главный, был в истории', () => {
    assert.ok(namesLookAlike('Дамиан', 'Damian Rowe'));
    assert.ok(namesLookAlike('Иван Соколов', 'Ivan Sokolov'));
    assert.ok(!namesLookAlike('Марина', 'Mark'));
    const html = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Иван Соколов', mains: ['Иван Соколов'], npcKeys: [], roster: null });
    assert.ok(html.includes('Дневник ещё не заполнен'));
    assert.ok(html.includes('data-iw-view="main:Иван Соколов"'));
    const ros = parseRoster(JSON.stringify({ main: ['Иван Соколов'], npc: [{ name: 'Хромой', who: 'главарь' }, { name: 'Зоя' }] }));
    const roster = Object.assign({}, ros, { find: n => rosterFind(ros, n) });
    const emptyNpc = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: 'npc', mains: ['Иван Соколов'], npcKeys: [], roster, seenOnly: [ros.npc[0]] });
    assert.ok(emptyNpc.includes('Дневник ещё не заполнен') && !emptyNpc.includes('iw-npc-title'), 'пустой дневник: на вкладке НПС та же подсказка, без имени');
    const emptyMe = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: 'me:Ева', mains: ['Иван Соколов'], npcKeys: [], roster, persona: { key: 'Ева', name: 'Ева', avatar: '' } });
    assert.ok(emptyMe.includes('Дневник ещё не заполнен'));
    const filled = applyAnalysis(emptyState(), one({ name: 'Иван Соколов', mood: 'спокоен' }), all).state;
    const list = renderPanel({ state: filled, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'npc', mains: ['Иван Соколов'], npcKeys: [], roster, seenOnly: [ros.npc[0]] });
    assert.ok(list.includes('ждёт разбора'));
    assert.ok(list.includes('iw-npc-badge'), 'у НПС значок вместо фото');
    assert.ok(!list.includes('iw-photo"'), 'фото у НПС нет');
    assert.ok(list.includes('Хромой'));
    assert.equal((list.match(/iw-npc-unknown"/g) || []).length, 1);
    const sys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Соколов', trackNames: [], catchUp: ['Хромой'] });
    assert.ok(sys.includes('первое заполнение дневника') && sys.includes('Хромой'));
    assert.ok(buildUserPrompt({ botName: 'Г', userName: 'Е', messages: ['x'], history: ['#2 Соколов (про Хромой): …'] }, emptyState(), all).includes('Раньше в истории'));
    assert.equal(mergeSettings({ maxChars: 4 }).maxChars, 12);
});

test('без открытого чата — никого', () => {
    const html = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: '', mains: [], npcKeys: [], roster: null, noChat: true });
    assert.ok(html.includes('Открой чат с персонажем'));
    assert.ok(!html.includes('iw-tab') && !html.includes('iw-npc-sticker'));
});

const { renderSettingsForm, applySettingChange } = await import('../src/settings-ui.js');
test('форма настроек', () => {
    const s = mergeSettings({ moodMode: 'manual', source: 'main', inject: false, contextMessages: 7 });
    const st = renderSettingsForm(s, { variant: 'st', profiles: [['p1', 'Быстрый']] });
    const diary = renderSettingsForm(s, { variant: 'diary' });
    assert.ok(!st.includes('type="number"') && !diary.includes('type="number"'), 'нет полей с цифрами');
    assert.ok(st.includes('text_pole') && diary.includes('iw-select'));
    assert.ok(st.includes('data-iw-turn="deep"'), 'ручная длительность видна');
    assert.ok(/data-iw-set="profileId"/.test(st));
    assert.ok(st.includes('<option value="7" selected>7</option>'), 'нестандартное значение не теряется');
    assert.ok(diary.includes('iw-switch'));
    const el = { dataset: { iwSet: 'contextMessages' }, type: 'select-one', value: '10' };
    applySettingChange(s, el);
    assert.equal(s.contextMessages, 10);
    applySettingChange(s, { dataset: { iwSetMod: 'dream' }, checked: false });
    assert.equal(s.modules.dream, false);
    applySettingChange(s, { dataset: { iwTurn: 'light' }, value: '3' });
    assert.equal(s.moodTurns.light, 3);
});

console.log(`core: ${passed} проверок прошло`);

const { pickNpcIcon, NPC_ICONS } = await import('../src/npc-icons.js');
test('значки НПС по роли', () => {
    assert.ok(NPC_ICONS.length >= 30);
    assert.equal(pickNpcIcon({ who: 'начальник районного угрозыска' }), 'police');
    assert.equal(pickNpcIcon({ who: 'правая рука Хромого, бывший опер' }), 'criminal');
    assert.equal(pickNpcIcon({ who: 'бывший жених Евы' }), 'ex');
    assert.equal(pickNpcIcon({ who: 'эксперт-криминалист' }), 'tech');
    assert.equal(pickNpcIcon({ who: 'разговорчивый трактирщик' }), 'cook');
    assert.equal(pickNpcIcon({ who: 'королева эльфов' }), 'royal');
    assert.equal(pickNpcIcon({ who: '', g: 'f' }), 'woman');
});
const { verifyAliases, shownAliases } = await import('../src/core.js');
test('прозвища — только из текста лорбука', () => {
    const r = parseRoster(JSON.stringify({ npc: [{ name: 'Петя Зайцев', aliases: ['Петька', 'Пётр', 'Зайцев', 'Рыжий'] }] }));
    verifyAliases(r, 'Зайцев, по прозвищу Рыжий, служит в угрозыске.');
    assert.deepEqual(r.npc[0].aliases, ['Рыжий']);
    assert.deepEqual(shownAliases(r.npc[0]), ['Рыжий']);
    assert.deepEqual(shownAliases({ name: 'Волк', aliases: ['Волков'] }), [], 'старый список без проверки не показываем');
});
const { repairJson } = await import('../src/core.js');
test('сломанный ответ модели чинится', () => {
    const cut = extractJson('{"characters":[{"name":"Роберт","mood":"зол","wants":[{"text":"чтобы сказала «да»"}]},{"name":"Лиза","mood":"ве');
    assert.equal(cut.characters.length, 2);
    assert.equal(cut.characters[0].wants[0].text, 'чтобы сказала «да»');
    const quotes = extractJson('{"characters":[{"name":"Р","why":"он сказал "нет" и ушёл"},]}');
    assert.equal(quotes.characters[0].why, 'он сказал "нет" и ушёл');
    assert.equal(repairJson('{"a":'), null);
    assert.equal(parseAnalysis('{"characters":[{"name":"A","traits":[{"name":"смелый"},{"name":"гор').length, 1);
});
test('эмоция — чувство, а не поступок; есть «как ощущается»', () => {
    const [c] = one({ name: 'Роберт', face: 'love', moodlets: [{ emotion: 'Укрыл её своим плащом на балконе', feel: 'внутри теплеет', why: 'она замёрзла' }] });
    assert.ok(c.moodlets[0].emotion.split(' ').length <= 2);
    assert.equal(c.moodlets[0].feel, 'внутри теплеет');
    assert.equal(c.face, 'love');
    assert.equal(one({ name: 'X', face: 'бред' })[0].face, 'neutral');
});

test('мечта: закреплённая не меняется, смена — только после потрясения и не чаще кулдауна', () => {
    const d1 = { title: 'Обрести покой', steps: [{ text: 'уйти со службы', done: false }] };
    let st = applyAnalysis(emptyState(), one({ name: 'Роберт', dream: d1 }), all).state;
    // без why — не меняется
    st = applyAnalysis(st, one({ name: 'Роберт', dream: { title: 'Стать королём', change: 'change', steps: [] } }), all).state;
    assert.equal(st.characters['Роберт'].dream.title, 'Обрести покой');
    // кулдаун: сразу после появления менять нельзя
    st = applyAnalysis(st, one({ name: 'Роберт', dream: { title: 'Стать королём', change: 'change', why: 'потерял всё', steps: [] } }), all).state;
    assert.equal(st.characters['Роберт'].dream.title, 'Обрести покой');
    for (let i = 0; i < 6; i++) st = applyAnalysis(st, one({ name: 'Роберт', dream: d1 }), all).state;
    const r = applyAnalysis(st, one({ name: 'Роберт', dream: { title: 'Обрести покой', change: 'add', plus: 'вместе с Эвелин', why: 'признался ей', steps: [] } }), all);
    assert.equal(r.state.characters['Роберт'].dream.plus, 'вместе с Эвелин');
    assert.ok(r.events.some(e => e.type === 'dream_grow'));
    // закрепили — потрясение не меняет
    const pinned = JSON.parse(JSON.stringify(r.state));
    pinned.characters['Роберт'].dream.pinned = true;
    pinned.characters['Роберт'].dreamChangedAt = -100;
    const r2 = applyAnalysis(pinned, one({ name: 'Роберт', dream: { title: 'Отомстить', change: 'change', why: 'её убили', steps: [] } }), all);
    assert.equal(r2.state.characters['Роберт'].dream.title, 'Обрести покой');
    assert.equal(r2.state.characters['Роберт'].dream.pinned, true);
});

test('очки и награды', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Роберт', wants: [{ text: 'выспаться' }] }), all, { points: true }).state;
    const r = applyAnalysis(st, one({ name: 'Роберт', wants: [{ text: 'выспаться', status: 'done' }] }), all, { points: true });
    assert.equal(r.state.characters['Роберт'].points, 10);
    const rewards = parseRewards(JSON.stringify({ rewards: [{ title: 'Тёплый плед', kind: 'buff', effect: 'спокоен', turns: 4, cost: 8, icon: 'gift' }, { title: 'Кулон', kind: 'collect', cost: 50 }] }));
    const ch = r.state.characters['Роберт'];
    assert.equal(buyReward(ch, rewards[1]), 'не хватает очков');
    assert.equal(buyReward(ch, rewards[0]), null);
    assert.equal(ch.points, 2);
    assert.equal(ch.buffs[0].left, 4);
    assert.ok(buildInjection({ characters: { 'Роберт': ch }, order: ['Роберт'] }, all, 'Ева').includes('спокоен'));
    assert.equal(decayState({ characters: { 'Роберт': ch }, order: ['Роберт'] }, 4).characters['Роберт'].buffs.length, 0);
});

test('доизученный лорбук дополняет НПС, а не стирает', () => {
    const old = { main: ['Роберт'], npc: [{ name: 'Иван Соколов', aliases: [], g: 'm', who: '', traits: ['хитрый'] }] };
    const fresh = { main: [], npc: [{ name: 'Иван Соколов', aliases: ['Сокол'], g: 'm', who: 'капитан', traits: ['смелый'] }, { name: 'Мила', aliases: [], g: 'f', who: 'служанка', traits: [] }] };
    const m = mergeRoster(old, fresh);
    assert.equal(m.npc.length, 2);
    assert.equal(m.npc[0].who, 'капитан');
    assert.deepEqual(m.npc[0].traits, ['хитрый', 'смелый']);
});

test('у каждой эмоции своё лицо и цвет', () => {
    assert.equal(guessFace('беспокойство'), 'anxious');
    assert.equal(guessFace('испуг'), 'fear');
    assert.equal(guessFace('спокойствие'), 'calm');
    assert.equal(guessFace('недовольство'), 'irritated');
    assert.equal(guessFace('самодовольство'), 'pride');
    assert.equal(guessFace('безнадёжность'), 'sad');
    assert.equal(guessFace('надежда'), 'hope');
    assert.equal(guessFace('зависть'), 'envy');
    assert.equal(guessFace('озадаченность'), 'confused');
    assert.equal(guessFace('гордость'), 'pride');
    assert.equal(guessFace('горд'), 'pride');
    assert.equal(guessFace('горе'), 'sad');
    assert.equal(guessFace('сердечность'), 'love');
    assert.equal(guessFace('одиночество'), 'melancholy');
    assert.equal(guessFace('сосредоточен'), 'focus');
    assert.equal(guessFace('что-то странное', 'good'), 'joy');
    const st = applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'встревожен', moodlets: [{ emotion: 'ревность', why: 'она ушла с другим' }, { emotion: 'нежность', face: 'love' }] }), all).state;
    const ml = st.characters['Роберт'].moodlets;
    assert.equal(ml[0].face, 'envy');
    assert.equal(ml[1].face, 'love');
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'bimbo', view: 'main:Роберт', busy: false, status: '', mains: ['Роберт'], npcKeys: [], roster: null });
    assert.ok(html.includes('iw-face-envy') && html.includes('iw-feel-face'));
    assert.ok(html.includes('Проанализируем, зай?'));
});

test('общее состояние: цвет из эмоций, смешанное — два цвета', () => {
    assert.deepEqual(moodFaces({ mood: 'встревожен', moodlets: [] }), ['anxious']);
    assert.deepEqual(moodFaces({ mood: 'странно', moodlets: [{ emotion: 'горе', weight: 'deep', left: 5 }, { emotion: 'радость', weight: 'light', left: 1 }] }), ['sad']);
    assert.deepEqual(moodFaces({ mood: 'растерян', face: 'surprise', moodlets: [{ emotion: 'нежность', weight: 'medium', left: 3 }, { emotion: 'тревога', weight: 'medium', left: 2 }] }), ['surprise', 'love']);
    assert.deepEqual(moodFaces({}), []);
});

test('новые темы на месте: надписи, шрифты, громкость', () => {
    for (const th of ['china', 'grimoire', 'dossier', 'logbook']) {
        assert.equal(validTheme(th), th);
        assert.ok(themeLabels(th, 'm').analyze);
    }
    assert.equal(mergeSettings({}).volume, 45);
    assert.equal(mergeSettings({ volume: 300 }).volume, 100);
});

test('во время разбора видна кнопка «стоп», лорбуки — галочками', () => {
    const st = applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'спокоен' }), all).state;
    const base = { state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Роберт', busy: false, status: '', mains: ['Роберт'], npcKeys: [], roster: null, books: ['Мир', 'Город'], picked: ['Город'], linked: ['Мир'] };
    const idle = renderPanel(base);
    assert.ok(!idle.includes('data-iw-stop'));
    assert.ok(idle.includes('data-iw-pick-book="Город" aria-pressed="true"'));
    assert.ok(!idle.includes('data-iw-pick-book="Мир"'));
    const busyAll = renderPanel(Object.assign({}, base, { working: true, busyKind: 'all' }));
    assert.equal((busyAll.match(/data-iw-stop/g) || []).length, 1);
    assert.ok(busyAll.includes('iw-act-all busy iw-act-stop'));
});

test('закреплённое желание держится до исполнения, переразбор не теряет награды', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Роберт', wants: [{ text: 'найти брата' }, { text: 'выспаться' }] }), all).state;
    st.characters['Роберт'].wants[0].pinned = true;
    st = applyAnalysis(st, one({ name: 'Роберт', wants: [{ text: 'поесть' }] }), all).state;
    assert.ok(st.characters['Роберт'].wants.some(w => w.text === 'найти брата' && w.pinned));
    st = applyAnalysis(st, one({ name: 'Роберт', wants: [{ text: 'найти брата', status: 'done' }] }), all).state;
    assert.equal(st.characters['Роберт'].wants.find(w => w.text === 'найти брата').status, 'done');
    const before = applyAnalysis(emptyState(), one({ name: 'Роберт', wants: [{ text: 'выспаться' }] }), all, { points: true, mesId: 4 }).state;
    const own = applyAnalysis(before, one({ name: 'Роберт', wants: [{ text: 'выспаться', status: 'done' }] }), all, { points: true, mesId: 5 }).state;
    own.characters['Роберт'].shop = [{ id: 'r1', title: 'Плед', kind: 'buff', cost: 5 }];
    const carried = carryOwnEdits(before, own, 5);
    assert.equal(carried.characters['Роберт'].shop.length, 1);
    assert.equal(carried.characters['Роберт'].points, 0);
});

test('черты: ушедшая видна зачёркнутой два ответа, её можно вернуть; на смену приходит новая', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Роберт', traits: [{ name: 'доверчивый' }, { name: 'упрямый' }] }), all).state;
    st.characters['Роберт'].cycle = 50;
    const r = applyAnalysis(st, one({ name: 'Роберт', traits: [{ name: 'доверчивый', kind: 'gone', why: 'измена' }, { name: 'недоверчивый', kind: 'new', why: 'измена' }] }), all);
    const tr = r.state.characters['Роберт'].traits;
    assert.equal(tr[0].kind, 'gone');
    assert.equal(tr[0].left, 2);
    assert.equal(tr[2].name, 'недоверчивый');
    assert.ok(r.events.some(e => e.type === 'trait_gone'));
    const html = renderPanel({ state: r.state, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Роберт', mains: ['Роберт'], npcKeys: [] });
    assert.ok(html.includes('data-iw-trait="back:0"'));
    assert.ok(!html.includes('data-iw-trait="pin'));
    assert.ok(html.includes('data-iw-trait="keep:2"'));
    assert.equal(decayState(r.state, 1).characters['Роберт'].traits.length, 3);
    assert.equal(decayState(r.state, 2).characters['Роберт'].traits.length, 2);
    const back = JSON.parse(JSON.stringify(tr[0]));
    restoreTrait(back);
    assert.equal(back.kind, 'base');
    const own = JSON.parse(JSON.stringify(r.state));
    own.characters['Роберт'].edited = { traits: 7 };
    assert.equal(carryOwnEdits(st, own, 7).characters['Роберт'].traits.length, 3);
    const sys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [], kind: 'chat' });
    assert.ok(sys.includes('соразмерно событию') && sys.includes('kind "gone"'));
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [], kind: 'all', fromLore: true }).includes('«всё сразу»'));
});

test('пол: склонения по лорбуку, описанию и имени', () => {
    assert.equal(genderOf('n', 'Маша'), 'f');
    assert.equal(genderOf('n', 'Анна Смирнова'), 'f');
    assert.equal(genderOf('n', 'Никита'), 'm');
    assert.equal(genderOf('n', 'Тень', 'рыжая девушка-воровка'), 'f');
    assert.equal(genderOf('m', 'Маша'), 'm');
    assert.equal(genderOf('n', 'Саша'), 'n');
    const html = renderNpcList({ state: emptyState(), npcKeys: [], roster: { npc: [], find: () => null }, seenOnly: [
        { name: 'Маша', g: 'n', checked: true }, { name: 'Олег', g: 'm', checked: true }] });
    assert.ok(html.includes('только упоминалась'));
    assert.ok(html.includes('только упоминался'));
    assert.equal(themeLabels('diary', genderOf('n', 'Маша')).moodLead, 'Сейчас она');
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] }).includes('в его роде'));
});

test('тип личности и темперамент: из ответа модели, строкой в чертах', () => {
    const st = applyAnalysis(emptyState(), one({ name: 'Роберт', ptype: 'infp-t', temper: 'Флегматик', traits: [{ name: 'мечтательный' }] }), all).state;
    assert.equal(st.characters['Роберт'].ptype, 'INFP-T');
    assert.equal(st.characters['Роберт'].temper, 'phlegmatic');
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'bimbo', view: 'main:Роберт', mains: ['Роберт'], npcKeys: [] });
    assert.ok(html.includes('Посредник') && html.includes('флегматик') && html.includes('iw-pt-diplomat') && html.includes('iw-b-persona'));
    const sys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] });
    assert.ok(sys.includes('16personalities') && sys.includes('«опекает свидетельницу»'));
});

test('черты: «подробнее» дописывается, приобретённая и после переноса своего цвета', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Роберт', traits: [{ name: 'упрямый' }] }), all).state;
    st.characters['Роберт'].cycle = 50;
    st = applyAnalysis(st, one({ name: 'Роберт', traits: [{ name: 'упрямый', about: 'вырос среди старших братьев' }] }), all).state;
    assert.equal(st.characters['Роберт'].traits[0].about, 'вырос среди старших братьев');
    st.characters['Роберт'].traits.push({ name: 'осторожный', kind: 'base', kept: true, why: 'чуть не погиб' });
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Роберт', mains: ['Роберт'], npcKeys: [] });
    assert.ok(html.includes('вырос среди старших братьев'));
    assert.ok(html.includes('iw-acquired') && html.includes('приобретена') && html.includes('чуть не погиб'));
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] }).includes('no_about'));
});

test('запас: сам по сцене и не выше потолка; вручную — ровно как задано', () => {
    const s = mergeSettings({});
    assert.equal(s.budgetMode, 'auto');
    const small = responseBudget(s, { kind: 'chat', mains: 1 });
    const big = responseBudget(s, { kind: 'all', mains: 3, npcs: 10, model: 'google/gemini-3.1-pro-preview' });
    assert.ok(small >= 1500 && small < big);
    assert.equal(big, 8000);
    assert.ok(responseBudget(s, { kind: 'chat', mains: 1, model: 'gemini-3.1-pro' }) > small);
    assert.equal(responseBudget(mergeSettings({ budgetMode: 'fixed', responseLength: 3000 }), { kind: 'all', mains: 5 }), 3000);
    assert.equal(responseBudget(mergeSettings({ budgetCap: 4000 }), { kind: 'all', mains: 5, npcs: 9 }), 4000);
});

test('ошибки: понятный вид и подсказка, листик в стиле темы', () => {
    assert.equal(classifyError(null, { cut: true, budget: 4000 }).kind, 'cut');
    assert.ok(classifyError(null, { cut: true, budget: 4000 }).text.includes('4000'));
    assert.equal(classifyError(new Error('В ответе модели нет JSON'), { raw: '' }).kind, 'thinking');
    assert.equal(classifyError(new Error('HTTP 429: Resource exhausted')).kind, 'rate');
    assert.equal(classifyError(new Error('401 Unauthorized')).kind, 'auth');
    assert.equal(classifyError(new Error('This model maximum context length is 65000 tokens')).kind, 'context');
    assert.equal(classifyError(new Error('Failed to fetch')).kind, 'network');
    assert.equal(classifyError(new Error('Модель не вернула ни одного персонажа')).kind, 'nochars');
    const html = renderErrorToast(Object.assign(classifyError(null, { cut: true }), { what: '' }), 'bimbo');
    assert.ok(html.includes('Ой-ой, ошибочка') && html.includes('Не хватило запаса') && html.includes('iw-toast-hint'));
});

test('дата рождения и знак зодиака: только если указаны', () => {
    assert.deepEqual(parseBorn('14.03.1968'), { d: 14, m: 3, y: 1968 });
    assert.deepEqual(parseBorn('5 мая'), { d: 5, m: 5 });
    assert.equal(parseBorn('нет'), null);
    assert.equal(zodiacOf(23, 10), 'scorpio');
    assert.equal(zodiacOf(19, 1), 'capricorn');
    let st = applyAnalysis(emptyState(), one({ name: 'Маша', born: '21.03.1990' }), all).state;
    assert.equal(st.characters['Маша'].zodiac, 'aries');
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Маша', mains: ['Маша'], npcKeys: [] });
    assert.ok(html.includes('Овен') && html.includes('родилась 21 марта 1990'));
    st = applyAnalysis(emptyState(), one({ name: 'Олег', born: 'нет' }), all).state;
    assert.ok(st.characters['Олег'].bornChecked && !st.characters['Олег'].zodiac);
    st = applyAnalysis(emptyState(), one({ name: 'Олег', zodiac: 'Скорпион' }), all).state;
    assert.equal(st.characters['Олег'].zodiac, 'scorpio');
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] }).includes('no_born'));
});

test('пустой дневник: без фото, с быстрыми настройками запаса', () => {
    const html = renderPanel({ state: emptyState(), settings: mergeSettings({}), theme: 'logbook', view: 'main:Маша', mains: ['Маша'], npcKeys: [], roster: null, avatarFor: () => 'x.png' });
    const waiting = html.slice(html.indexOf('iw-waiting'));
    assert.ok(!waiting.includes('iw-photo'));
    assert.ok(waiting.includes('у неё на душе') && waiting.includes('«Всё сразу»'));
    assert.ok(waiting.includes('data-iw-quick="budgetCap:8000" aria-pressed="true"'));
    assert.ok(waiting.includes('data-iw-quick-open="connect"'));
});

test('пиксельная тема: есть, со своими подписями, монеткой и звуками', async () => {
    assert.equal(validTheme('pixel'), 'pixel');
    const L = themeLabels('pixel', 'f');
    assert.equal(L.wants, 'Квесты');
    assert.equal(L.analyze, 'Сохранить игру');
    const html = renderPanel({ state: applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'спокоен' }), all).state, settings: DEFAULT_SETTINGS, theme: 'pixel', view: 'main:Роберт', mains: ['Роберт'], npcKeys: [] });
    assert.ok(html.includes('Квесты') && html.includes('Перки') && html.includes('iw-px'));
    assert.ok(!renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: '', mains: [], npcKeys: [] }).includes('iw-px'));
    const snd = await import('../src/sound.js');
    assert.ok(snd.PATTERNS.pixel && snd.PATTERNS.pixel.want_done.length);
});

test('персона игрока: ведётся отдельно, не влияет на ответы, карточка вместо наклейки лавки', () => {
    const fresh = [{ name: 'Роберт', mood: 'спокоен' }, { name: 'Ева', mood: 'встревожена', impression: { label: 'симпатия', score: 1 } }].map(x => parseAnalysis(JSON.stringify({ characters: [x] }))[0]);
    const off = applyAnalysis(emptyState(), fresh, all, { userName: 'Ева', maxChars: 1 }).state;
    assert.ok(!off.characters['Ева']);
    const on = applyAnalysis(emptyState(), fresh, all, { userName: 'Ева', maxChars: 1, persona: true }).state;
    assert.ok(on.characters['Ева'] && on.characters['Ева'].persona);
    assert.ok(on.characters['Роберт']);
    assert.ok(!buildInjection(on, all, 'Ева').includes('встревожена'));
    const sys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Роберт', trackNames: [], trackPersona: true });
    assert.ok(sys.includes('персона игрока') && sys.includes('отношение к Роберт'));
    const html = renderPanel({ state: on, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'me:Ева', mains: ['Роберт'], npcKeys: [], persona: { key: 'Ева', name: 'Ева', avatar: '' } });
    assert.ok(html.includes('iw-tab-persona') && html.includes('Как она относится к нему') && html.includes('iw-shopbar') && html.includes('iw-shop-sticker'));
});

test('тип личности и темперамент — в роде персонажа', () => {
    const st = applyAnalysis(emptyState(), one({ name: 'Ева Лянь', g: 'f', mood: 'спокойна', ptype: 'INFP-T', temper: 'melancholic' }), all).state;
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Ева Лянь', mains: ['Ева Лянь'], npcKeys: [] });
    assert.ok(html.includes('Мечтательница') && html.includes('Чуткая и глубокая') && html.includes('ранима') && html.includes('Беспокойная'));
    const st2 = applyAnalysis(emptyState(), one({ name: 'Олег', g: 'm', mood: 'спокоен', temper: 'phlegmatic' }), all).state;
    const h2 = renderPanel({ state: st2, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Олег', mains: ['Олег'], npcKeys: [] });
    assert.ok(h2.includes('Спокойный и ровный') && !h2.includes('к нервам'));
});

console.log(`значки: ${passed} проверок прошло`);
