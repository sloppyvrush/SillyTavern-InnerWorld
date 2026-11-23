import assert from 'node:assert/strict';
import * as C from '../src/clock.js';
import { dominantMood, settleMood, purseOf,
    DEFAULT_SETTINGS, mergeSettings, emptyState, parseAnalysis, applyAnalysis, buildInjection, buildAttrInjection, decayState,
    buildSystemPrompt, buildUserPrompt, buildDreamPrompt, cleanMessageText, extractJson, eventText, lowerWord, moodletLeftLabel, mentioned, plural,
} from '../src/core.js';
import { themeLabels, validTheme } from '../src/themes.js';
import { renderPanel, renderToast } from '../src/render.js';
import { parseRoster, rosterFind, isMain, loreText, buildRosterPrompt, namesLookAlike, parseRewards, buyReward, mergeRoster, guessFace, moodFaces, carryOwnEdits, genderOf, restoreTrait, responseBudget, classifyError, looksCut, parseBorn, zodiacOf } from '../src/core.js';
import { renderNpcList, renderErrorToast, layoutBlocks } from '../src/render.js';
import { cancelReward, cleanLife, lifeText, lifeHit, cleanRel, mergeRel, relStatus, cleanRumor } from '../src/core.js';
import * as S from '../src/showcase.js';
import * as C2 from '../src/core.js';

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
    const [m] = one({ name: 'Марк', mood: 'Встревожен', moodlets: [{ emotion: 'Досада', weight: 'light', turns: 9, why: 'тест' }] });
    assert.equal(m.mood, 'встревожен');
    assert.equal(m.moodlets[0].emotion, 'досада');
    assert.equal(m.moodlets[0].left, 2, 'мимолётная эмоция живёт не дольше 2 ответов');
});

test('сила эмоции ограничивает срок', () => {
    const [m] = one({ name: 'Марк', moodlets: [
        { emotion: 'горе', weight: 'deep', turns: 2, why: 'тест' },
        { emotion: 'тревога', weight: 'medium', turns: 40, why: 'тест' },
        { emotion: 'скука', why: 'тест' },
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
        { emotion: 'горе', weight: 'deep', turns: 6, why: 'тест' }, { emotion: 'скука', weight: 'light', turns: 2, why: 'тест' },
    ] }] }), { manualTurns: manual });
    assert.deepEqual(list[0].moodlets.map(m => m.left), [30, 1]);
    const sys = buildSystemPrompt({ ...DEFAULT_SETTINGS, moodMode: 'manual' }, { userName: 'Ева', botName: 'Марк', trackNames: [] });
    assert.ok(!sys.includes('"turns"'));
});

test('эмоции угасают сами и освежаются без дублей', () => {
    let { state } = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'весел', moodlets: [
        { emotion: 'радость', weight: 'medium', turns: 3, tone: 'good', why: 'тест' },
        { emotion: 'смущение', weight: 'light', turns: 1, why: 'тест' },
        { emotion: 'влюблённость', weight: 'deep', turns: 15, tone: 'good', why: 'тест' },
    ] }), all, {});
    state = decayState(state, 2);
    assert.deepEqual(state.characters['Марк'].moodlets.map(m => [m.emotion, m.left]), [['влюблённость', 13], ['радость', 1]]);
    // модель вернула ту же радость снова и сняла влюблённость
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'рад', moodlets: [{ emotion: 'Радость', weight: 'medium', turns: 4, why: 'тест' }], ended: ['влюблённость'] }), all, {}));
    assert.deepEqual(state.characters['Марк'].moodlets.map(m => [m.emotion, m.left]), [['радость', 4]]);
    // без новых эмоций старые остаются как были
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'рад' }), all, {}));
    assert.equal(state.characters['Марк'].moodlets.length, 1);
    assert.equal(state.characters['Марк'].mood, 'рад');
    // состояние без эмоции за ним: эмоция добавляется сама
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'сосредоточен', mood_why: 'разбирает донесения' }), all, {}));
    assert.ok(state.characters['Марк'].moodlets.some(m => m.emotion === 'сосредоточенность' && m.face === 'focus' && m.why === 'разбирает донесения'));
    // без объяснения пустую эмоцию не заводим
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'напуган' }), all, {}));
    assert.ok(!state.characters['Марк'].moodlets.some(m => m.face === 'fear' && !m.why && !m.feel));
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
    // исполненное ещё видно несколько ответов, новое встаёт рядом
    assert.deepEqual(r3.state.characters['Марк'].wants.map(w => w.text), ['Чтобы Ева осталась на ужин', 'Поговорить наедине']);
});

test('желания и страхи не переписываются каждый ответ, эмоции не теряют причину', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Марк', g: 'm', mood: 'спокоен',
        wants: [{ text: 'Найти убийцу' }, { text: 'Выспаться' }, { text: 'Помириться с братом' }],
        fears: [{ text: 'Что Лида узнает', strength: 3 }, { text: 'Потерять работу', strength: 1 }],
        moodlets: [{ emotion: 'нежность', why: 'она улыбнулась', weight: 'medium', tone: 'good' }] }), all).state;
    // модель забыла два желания и предложила три новых: старые остаются, новых не больше одного места
    st = applyAnalysis(st, one({ name: 'Марк', wants: [{ text: 'Найти убийцу' }, { text: 'Купить машину' }, { text: 'Уехать на море' }, { text: 'Сменить квартиру' }],
        fears: [{ text: 'что Лида узнает обо всём' }], moodlets: [{ emotion: 'нежность', why: 'совсем другая причина', weight: 'medium', tone: 'good' }] }), all).state;
    let m = st.characters['Марк'];
    assert.deepEqual(m.wants.filter(w => w.status === 'active').map(w => w.text), ['Найти убийцу', 'Выспаться', 'Помириться с братом']);
    assert.deepEqual(m.fears.map(f => f.text), ['Что Лида узнает', 'Потерять работу']);
    assert.equal(m.moodlets.find(x => x.emotion === 'нежность').why, 'она улыбнулась');
    // страх сбылся: эмоция появляется сама, страх виден несколько ответов, на его место — максимум один новый
    st = applyAnalysis(st, one({ name: 'Марк', fears: [{ text: 'Что Лида узнает', status: 'realized' }, { text: 'Тюрьма' }, { text: 'Одиночество' }] }), all).state;
    m = st.characters['Марк'];
    assert.ok(m.moodlets.some(x => x.emotion === 'потрясение' && x.weight === 'deep' && x.why.includes('Лида')));
    assert.deepEqual(m.fears.map(f => f.text + ':' + f.status), ['Что Лида узнает:realized', 'Потерять работу:active', 'Тюрьма:active']);
    assert.ok(buildInjection(st, all, 'Ева').includes('только что сбылось'));
    for (let i = 0; i < 2; i++) st = applyAnalysis(st, one({ name: 'Марк', fears: [] }), all).state;
    assert.ok(st.characters['Марк'].fears.some(f => f.status === 'realized'), 'ещё видно');
    st = applyAnalysis(st, one({ name: 'Марк', fears: [] }), all).state;
    assert.ok(!st.characters['Марк'].fears.some(f => f.status === 'realized'), 'через несколько ответов уходит');
    // отношение обновляется и без label
    st = applyAnalysis(emptyState(), one({ name: 'Марк', impression: { label: 'интерес', score: 1, now: 'присматривается' } }), all).state;
    st = applyAnalysis(st, parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', impression: { now: 'доверяет ей', now_score: 2 } }] })), all).state;
    assert.equal(st.characters['Марк'].impression.nowScore, 2);
    assert.equal(st.characters['Марк'].impression.now, 'доверяет ей');
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
        moodlets: [{ emotion: 'тревога', why: 'письмо', weight: 'medium' }, { emotion: 'скука', weight: 'light', why: 'тест' }, { emotion: 'горе', weight: 'deep', why: 'смерть отца' }],
        wants: [{ text: 'Уехать' }], fears: [{ text: 'Одиночества' }],
        impression: { label: 'Интерес', score: 1, now: 'доверяет' },
    }), all, {});
    const text = buildInjection(state, all, 'Ева');
    // главное настроение — по самой весомой эмоции, как в «Симс»: сильное горе перевешивает тревогу
    assert.ok(text.includes('Марк: сейчас подавлен; на душе: горе (сильно) — смерть отца; тревога — письмо'));
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
    for (const t of ['diary', 'dark', 'medieval', 'sims']) assert.equal(themeLabels(t, 'm').traits, 'Черты характера');
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
    assert.ok(html.toLowerCase().includes('&lt;b&gt;x&lt;/b&gt;'));
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
    assert.ok(list.includes('ещё не разобран') && list.includes('data-iw-npc-study'));
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
    assert.equal(buyReward(ch, rewards[1]), 'не хватает монет');
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
    const st = applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'встревожен', moodlets: [{ emotion: 'ревность', why: 'она ушла с другим' }, { emotion: 'нежность', face: 'love', why: 'тест' }] }), all).state;
    const ml = st.characters['Роберт'].moodlets;
    assert.equal(ml[0].face, 'envy');
    assert.equal(ml[1].face, 'love');
    const html = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'bimbo', view: 'main:Роберт', busy: false, status: '', mains: ['Роберт'], npcKeys: [], roster: null });
    assert.ok(html.includes('iw-face-envy') && html.includes('iw-feel-face'));
    assert.ok(html.includes('Проанализируем, зай?'));
});

test('общее состояние: цвет из эмоций, смешанное — два цвета', () => {
    assert.deepEqual(moodFaces({ mood: 'встревожен', moodlets: [] }), ['anxious']);
    assert.deepEqual(moodFaces({ mood: 'странно', moodlets: [{ emotion: 'горе', weight: 'deep', left: 5, why: 'тест' }, { emotion: 'радость', weight: 'light', left: 1, why: 'тест' }] }), ['sad']);
    // равные по очкам настроения разного цвета — смешанное; слово модели лицо не перебивает
    assert.deepEqual(moodFaces({ mood: 'растерян', face: 'surprise', moodlets: [{ emotion: 'нежность', weight: 'medium', left: 3, why: 'тест' }, { emotion: 'тревога', weight: 'medium', left: 2, why: 'тест' }] }), ['love', 'anxious']);
    assert.deepEqual(moodFaces({}), []);
});

test('главное настроение, как в «Симс»: очки, радость-подпитка, сила и «держится при равенстве»', () => {
    // грусть, тоска и обида складываются в одно настроение и перевешивают одну злость
    let d = dominantMood([{ emotion: 'грусть', weight: 'medium', why: 'тест' }, { emotion: 'тоска', weight: 'light', why: 'тест' }, { emotion: 'злость', weight: 'medium', why: 'тест' }]);
    assert.equal(d.key, 'sad');
    assert.equal(d.score, 3);
    assert.equal(d.level, 1);
    // радость подпитывает уверенность (у которой есть своя средняя эмоция) — получается «очень уверен»
    d = dominantMood([{ emotion: 'радость', weight: 'medium', why: 'тест' }, { emotion: 'гордость', weight: 'light', why: 'тест' }, { emotion: 'уверенность', weight: 'medium', why: 'тест' }, { emotion: 'облегчение', weight: 'light', why: 'тест' }]);
    assert.equal(d.key, 'confident');
    assert.equal(d.level, 2);
    // слабая искорка флирта рядом с радостью радость не перебивает
    d = dominantMood([{ emotion: 'радость', weight: 'medium', why: 'тест' }, { emotion: 'кокетство', weight: 'light', why: 'тест' }]);
    assert.equal(d.key, 'happy');
    // при равенстве держится прошлое настроение
    const two = [{ emotion: 'злость', weight: 'medium', left: 5, why: 'тест' }, { emotion: 'страх', weight: 'medium', left: 3, why: 'тест' }];
    assert.equal(dominantMood(two).key, 'angry');
    assert.equal(dominantMood(two, 'scared').key, 'scared');
    // сильный стыд перекрывает несколько средних радостей — под ним не «счастлив»
    d = dominantMood([{ face: 'guilt', weight: 'deep', left: 4 }, { face: 'joy', weight: 'medium', left: 3 }, { face: 'hope', weight: 'medium', left: 3 }, { face: 'grateful', weight: 'medium', left: 3 }, { face: 'love', weight: 'medium', left: 3 }]);
    assert.equal(d.key, 'embarrassed');
    // а сильная радость рядом с лёгким смущением остаётся радостью
    assert.equal(dominantMood([{ face: 'joy', weight: 'deep', left: 4 }, { face: 'shy', weight: 'light', left: 3 }]).key, 'happy');
    // то, что вот-вот пройдёт, держит настроение слабее
    assert.equal(dominantMood([{ emotion: 'злость', weight: 'medium', left: 1, why: 'тест' }, { emotion: 'страх', weight: 'medium', left: 4, why: 'тест' }]).key, 'scared');
    // сила: одна сильная — «очень», две сильные — предел
    assert.equal(dominantMood([{ emotion: 'страх', weight: 'deep', why: 'тест' }]).level, 2);
    assert.equal(dominantMood([{ emotion: 'страх', weight: 'deep', why: 'тест' }, { emotion: 'ужас', weight: 'deep', why: 'тест' }]).level, 3);
    // слова: на первой силе — слово модели, если оно про то же настроение; дальше — общие слова, по роду
    const c = settleMood({ g: 'f', mood: 'насторожена', face: 'suspicious', moodlets: [{ emotion: 'тревога', weight: 'medium', left: 3, why: 'тест' }] });
    assert.equal(c.mood, 'насторожена');
    c.moodlets.push({ emotion: 'беспокойство', weight: 'deep', left: 6, why: 'тест' });
    settleMood(c);
    assert.equal(c.mood, 'на взводе');
    c.moodlets = [{ emotion: 'страх', weight: 'deep', left: 2, why: 'тест' }, { emotion: 'паника', weight: 'deep', left: 2, why: 'тест' }];
    settleMood(c);
    assert.equal(c.mood, 'в ужасе');
    assert.equal(c.face, 'fear');
    // эмоции прошли — как в «Симс»: остаётся сказанное моделью или «в порядке»
    c.moodlets = [];
    settleMood(c);
    assert.equal(c.mood, 'насторожена');
});

test('новые темы на месте: надписи, шрифты, громкость', () => {
    for (const th of ['china', 'herbal', 'arcana', 'seance', 'dossier', 'logbook']) {
        assert.equal(validTheme(th), th);
        assert.ok(themeLabels(th, 'm').analyze);
    }
    // гримуар переехал в травницу, а тетрадь в клетку вернулась
    assert.equal(validTheme('grimoire'), 'herbal');
    assert.equal(validTheme('grid'), 'grid');
    assert.equal(mergeSettings({ theme: 'grid' }).theme, 'grid');
    assert.equal(mergeSettings({ theme: 'grimoire' }).theme, 'herbal');
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
    assert.ok(html.includes('не появлялась в сцене'));
    assert.ok(html.includes('не появлялся в сцене'));
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
    assert.ok(html.includes('iw-acquired') && html.includes('Приобретена') && html.toLowerCase().includes('чуть не погиб'));
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

test('пиксельная тема убрана: старый выбор переезжает в «Дневник»', () => {
    assert.equal(validTheme('pixel'), 'diary');
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

test('привязанные лорбуки, карточку и персону можно снять галочкой', () => {
    const h = renderPanel({ state: emptyState(), settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Марк', mains: ['Марк'], npcKeys: [], books: ['Мир', 'Город'], picked: [], linked: [{ name: 'Мир', from: 'char' }, { name: 'Ева-лор', from: 'persona' }], off: ['Мир'], persona: { key: 'Ева', name: 'Ева' } });
    assert.ok(h.includes('data-iw-skip-book="__card" aria-pressed="true"'));
    assert.ok(h.includes('data-iw-skip-book="__persona" aria-pressed="true"'));
    assert.ok(h.includes('data-iw-skip-book="Мир" aria-pressed="false"'));
    assert.ok(h.includes('data-iw-skip-book="Ева-лор" aria-pressed="true"') && h.includes('<em>персоны</em>'));
});

test('валюта: своё имя в каждой теме, пояснение в кошельке, очки во всплывашке', async () => {
    const { renderToast } = await import('../src/render.js');
    for (const th of ['diary', 'pixel', 'logbook', 'medieval', 'cyber']) assert.ok(themeLabels(th, 'm').currency, th);
    const t = renderToast({ type: 'want_done', who: 'Марк', text: 'чай', points: 10 }, 'medieval');
    assert.ok(t.includes('iw-toast-points') && t.includes('+10') && t.includes('золотые'));
    assert.ok(!renderToast({ type: 'want_done', who: 'Марк', text: 'чай' }, 'medieval').includes('iw-toast-points'));
    let st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен' }), all).state;
    st.characters['Марк'].points = 35;
    const h = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'logbook', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('iw-wallet-info') && h.includes('Кредиты снабжения') && h.includes('Склад снабжения'));
});

test('совместимость и первое впечатление как мнение', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', impression: { label: 'смелая чудачка', score: 1, why: 'не полезла к зевакам' }, chem: { level: 'good', why: 'оба упрямые' } }), all).state;
    assert.equal(st.characters['Марк'].chem.level, 'good');
    const h = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('iw-chem-good') && h.includes('Есть контакт') && h.includes('Оба упрямые'));
    // без пересборки совместимость не перезаписывается
    st = applyAnalysis(st, one({ name: 'Марк', chem: { level: 'awful', why: 'x' } }), all).state;
    assert.equal(st.characters['Марк'].chem.level, 'good');
    const sys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [] });
    assert.ok(sys.includes('МНЕНИЕ персонажа') && sys.includes('amazing'));
});

test('что привлекает: модель заполняет один раз, правки игрока не перезаписываются', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', turn_ons: ['Темноволосые', 'надёжные'], turn_offs: ['грубые'] }), all).state;
    assert.deepEqual(st.characters['Марк'].likes, ['темноволосые', 'надёжные']);
    st = applyAnalysis(st, one({ name: 'Марк', turn_ons: ['другое'] }), all).state;
    assert.deepEqual(st.characters['Марк'].likes, ['темноволосые', 'надёжные']);
    st.characters['Марк'].likes = [];
    st.characters['Марк'].dislikes = [];
    st.characters['Марк'].attrSet = true;
    st = applyAnalysis(st, one({ name: 'Марк', turn_ons: ['другое'] }), all).state;
    assert.deepEqual(st.characters['Марк'].likes, []);
    const h = renderPanel({ state: applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', turn_ons: ['темноволосые'] }), all).state, settings: DEFAULT_SETTINGS, theme: 'pixel', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('iw-b-attraction') && h.includes('Симпатии') && h.includes('Темноволосые') && h.includes('data-iw-attr="toggle:likes:рыжие"'));
});

test('совместимость: первая не меняется, «сейчас» живёт по чату; давно знакомые; «что привлекает» — только из лорбука', () => {
    let st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', impression: { label: 'жена', score: 2, why: 'родная', known: 'супруги' }, chem: { level: 'good', why: 'x' } }), all).state;
    assert.equal(st.characters['Марк'].chemNow.score, 2);
    st = applyAnalysis(st, one({ name: 'Марк', chem: { level: 'awful' }, chem_now: { score: -1, why: 'поссорились' } }), all).state;
    const m = st.characters['Марк'];
    assert.equal(m.chem.level, 'good');
    assert.equal(m.chemNow.score, -1);
    const h = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('Давно знакомы: супруги') && h.includes('Холодок') && h.includes('iw-chem-meter') && h.includes('Поссорились'));
    const chatSys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [], kind: 'chat' });
    const loreSys = buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Ева', botName: 'Марк', trackNames: [], kind: 'lore', fromLore: true });
    assert.ok(!chatSys.includes('turn_ons') && loreSys.includes('turn_ons'));
    assert.ok(chatSys.includes('chem_now'));
});

test('блоки сворачиваются: у свёрнутого только заголовок', () => {
    const st = applyAnalysis(emptyState(), one({ name: 'Марк', g: 'm', mood: 'насторожен', moodlets: [{ emotion: 'тревога', weight: 'medium', tone: 'bad', why: 'тест' }], wants: [{ text: 'найти убийцу' }], turn_ons: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }), all, {}).state;
    const s2 = Object.assign({}, DEFAULT_SETTINGS, { collapsed: { mood: true, wants: true } });
    const h = renderPanel({ state: st, settings: s2, theme: 'diary', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('iw-b-mood iw-collapsed') && h.includes('iw-b-wants iw-collapsed') && !h.includes('iw-fold-sum'));
    assert.ok(!h.includes('iw-b-fears iw-collapsed'));
    assert.ok(h.includes('ещё 2'));
});

test('притяжение попадает в чат своей подсказкой и выключается', () => {
    const st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', turn_ons: ['рыжие'], turn_offs: ['лживые'], impression: { label: 'x', score: 1 }, chem: { level: 'good' } }), all).state;
    const t = buildAttrInjection(st, 'Ева', 'strong', { mode: 'always' });
    assert.ok(t.includes('привлекает: рыжие') && t.includes('отталкивает: лживые') && t.includes('тянет друг к другу') && t.includes('заметно'));
    assert.equal(buildAttrInjection(st, 'Ева', 'none'), '');
    // по ключам: совместимость всегда, вкусы — только когда тема всплыла
    const quiet = buildAttrInjection(st, 'Ева', 'strong', { recent: 'Они молча смотрели в окно.' });
    assert.ok(quiet.includes('тянет друг к другу') && !quiet.includes('рыжие') && !quiet.includes('лживые'));
    const hits = [];
    const hair = buildAttrInjection(st, 'Ева', 'strong', { recent: 'Ева поправила рыжую прядь и соврала, что не устала.', hits });
    assert.ok(hair.includes('привлекает: рыжие') && hair.includes('отталкивает: лживые'));
    assert.deepEqual(hits.map(h => h.tag), ['рыжие', 'лживые']);
    assert.ok(quiet.length < t.length);
});

test('очки коротко: 1,2К и 15К, полное число — в пояснении', async () => {
    const { shortPoints } = await import('../src/render.js');
    assert.equal(shortPoints(999), '999');
    assert.equal(shortPoints(1200), '1,2К');
    assert.equal(shortPoints(15300), '15К');
    assert.equal(shortPoints(2500000), '2,5М');
    const st = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен' }), all).state;
    st.characters['Марк'].points = 1234;
    const h = renderPanel({ state: st, settings: DEFAULT_SETTINGS, theme: 'pixel', view: 'main:Марк', mains: ['Марк'], npcKeys: [] });
    assert.ok(h.includes('<b>1,2К</b>') && h.includes('1\u00a0234'));
});


test('притяжение и отторжение — одна настройка силы', () => {
    assert.equal(mergeSettings({}).attrPower, 'medium');
    const s = mergeSettings({ attrPower: 'max' });
    assert.equal(s.attrInfluence, 'strong');
    assert.equal(s.attrDepth, 1);
    assert.equal(mergeSettings({ attrPower: 'none' }).attrInfluence, 'none');
    // старые две настройки переезжают в одну
    assert.equal(mergeSettings({ attrInfluence: 'light', attrDepth: 10 }).attrPower, 'faint');
    assert.equal(mergeSettings({ attrInfluence: 'none' }).attrPower, 'none');
});

test('мечта персоны придумывается по её описанию, а не по карточке персонажа', () => {
    const { system, user } = buildDreamPrompt({ persona: true, card: 'Ева — журналистка', botName: 'Ева', userName: 'Виктор', messages: [], loreMain: [] }, { name: 'Ева', dream: { title: 'старое' } });
    assert.ok(user.includes('[Описание персоны игрока: Ева]') && system.includes('мечту ИМЕННО ЕГО') && system.includes('Это не мечта Виктор'));
});

test('часы сцены: отметки, таймскипы, шаг, праздники и дни рождения', () => {
    const g = C.normCalendar({ type: 'greg' });
    const t0 = { y: 1996, m: 10, d: 8, h: 2, mi: 50 };
    assert.equal(C.fmtDate(g, t0), 'вторник, 8 октября 1996');
    assert.deepEqual(C.findStamp('[HUD: 02:50 | Вторник | 08.10.1996 | Санкт-Петербург]').date, { d: 8, m: 10, y: 1996 });
    assert.deepEqual(C.findStamp('**02:40, двор на улице Зайцева. 8 октября 1996 года.**\n\nСнег').time, { h: 2, mi: 40 });
    // время посреди обычного текста — не отметка
    assert.equal(C.findStamp('Он сказал, что в 10:30 будет встреча, и ушёл.'), null);
    // таймскип в рассказе — да, в прямой речи — нет
    assert.deepEqual(C.findSkip('Прошло три дня. Виктор вернулся.'), { add: 4320 });
    assert.equal(C.findSkip('— Через два дня уеду, — сказал он.'), null);
    let a = C.advance(g, t0, ['', 'На следующее утро она проснулась.']);
    assert.equal(C.fmtDate(g, a.t) + ' ' + C.fmtTime(a.t), 'среда, 9 октября 1996 08:00');
    a = C.advance(g, t0, ['', 'Просто сцена.'], { step: 5 });
    assert.equal(C.fmtTime(a.t), '02:55');
    // время без даты «раньше» текущего — значит, уже следующие сутки
    a = C.advance(g, { y: 1996, m: 10, d: 8, h: 23, mi: 50 }, ['', '**00:20** Тишина']);
    assert.equal(a.t.d, 9);
    const ru = C.normCalendar({ type: 'greg', country: 'RU', source: 'model', canon: [{ who: 'Виктор', name: 'годовщина смерти матери', month: 10, day: 20 }] });
    const ev = C.upcoming(ru, t0, [{ name: 'Ева', born: { d: 12, m: 10, y: 1971 } }], 31);
    assert.equal(ev[0].kind, 'birthday');
    assert.equal(ev[0].age, 25);
    // праздники своего времени: в 1996-м 7 ноября — «День согласия и примирения», а Хэллоуина в России ещё нет
    assert.ok(ev.some(e => e.name === 'День согласия и примирения' && e.inDays === 30));
    assert.ok(!ev.some(e => e.name === 'Хэллоуин'));
    assert.ok(ev.some(e => e.kind === 'canon' && e.who === 'Виктор'));
    // плавающие даты: православная Пасха
    assert.deepEqual(C.holidayDate(ru, { rule: 'easter_o' }, 1996), { m: 4, d: 14 });
    assert.deepEqual(C.holidayDate(ru, { rule: 'easter_o' }, 2026), { m: 4, d: 12 });
    // свой календарь мира: месяцы разной длины, дни недели по кругу
    const cu = C.normCalendar({ type: 'custom', era: 'г. Т.Э.', months: [{ name: 'Месяц Урожая', gen: 'Урожайника', days: 30 }, { name: 'Месяц Снега', gen: 'Снежника', days: 28 }], weekdays: ['Солнечник', 'Лунник', 'Звездник'] });
    const tc = C.addMinutes(cu, { y: 1247, m: 1, d: 29, h: 20, mi: 0 }, 2 * 1440);
    assert.equal(C.fmtDate(cu, tc, { weekday: false }), '1 Снежника, 1247 г. Т.Э.');
    assert.deepEqual(C.findStamp('**3 Снежника 1247, 21:15**', cu).date, { d: 3, m: 2, y: 1247 });
    // поправка от модели дневника: вперёд — да, назад или «через полсуток» по одному времени — нет
    assert.equal(C.sceneTimeFix(g, t0, { time: '06:30' }).h, 6);
    assert.equal(C.sceneTimeFix(g, t0, { time: '01:00' }), null);
    assert.equal(C.sceneTimeFix(g, t0, { time: '07:00', flashback: true }), null);
    // дата прямо названа в чате: часы догоняют её даже через месяцы и даже назад (дневник убежал вперёд)
    const mar = { y: 1997, m: 3, d: 8, h: 2, mi: 0 };
    assert.deepEqual(C.sceneTimeFix(g, mar, { date: '1997-05-09', time: '07:20' }, 'Утро 9 мая выдалось тёплым'), { y: 1997, m: 5, d: 9, h: 7, mi: 20 });
    assert.equal(C.sceneTimeFix(g, mar, { date: '1997-05-09', time: '07:20' }, 'ничего про дату'), null);
    assert.equal(C.sceneTimeFix(g, { y: 1997, m: 6, d: 1, h: 9, mi: 0 }, { date: '1997-05-09' }, '09.05.1997').m, 5);
    assert.equal(C.dateNamedIn(g, { y: 1997, m: 5, d: 9 }, 'в мае 1997 года'), true);
    assert.equal(C.dateNamedIn(g, { y: 1997, m: 5, d: 9 }, 'мама 1997'), false);
    assert.equal(C.dateNamedIn(g, { y: 1997, m: 5, d: 9 }, 'прошло девять дней'), false);
    // ручные команды
    assert.equal(C.parseClockCommand(g, t0, '+2ч').h, 4);
    assert.equal(C.parseClockCommand(g, t0, '+3д').d, 11);
    assert.equal(C.parseClockCommand(g, t0, 'вечер').h, 19);
    // ответ модели про календарь
    const ans = C.parseCalendarAnswer({ calendar: { type: 'real', holidays: [{ name: 'Хэллоуин', month: 10, day: 31 }] }, now: { date: '1996-10-08', time: '02:50' } });
    assert.equal(ans.calendar.type, 'greg');
    assert.deepEqual([ans.now.y, ans.now.m, ans.now.d, ans.now.h], [1996, 10, 8, 2]);
    assert.ok(C.clockInjection(g, t0, { lastSkip: 4320 }).includes('прошло 3 дня'));
    // возраст идёт по часам сцены: прошло 10 лет — персонаж на 10 лет старше, чем в карточке
    assert.equal(C.ageNow(g, { y: 2006, m: 10, d: 8 }, { ageAt: { age: 27, y: 1996, m: 10, d: 8 } }), 37);
    assert.equal(C.ageNow(g, { y: 1996, m: 10, d: 8 }, { born: { d: 20, m: 8, y: 1969 } }), 27);
    assert.ok(C.clockInjection(g, { y: 2006, m: 10, d: 8, h: 12, mi: 0 }, { people: [{ name: 'Ева', born: { d: 20, m: 8, y: 1969 } }] }).includes('Ева — 37'));
});

test('общий кошелёк: монеты за успехи всех, в том числе персоны', () => {
    let { state } = applyAnalysis(emptyState(), one({ name: 'Марк', wants: [{ text: 'Найти брата' }] }), all, { points: true, mesId: 1 });
    ({ state } = applyAnalysis(state, one({ name: 'Марк', wants: [{ text: 'Найти брата', status: 'done' }] }), all, { points: true, mesId: 2 }));
    assert.equal(state.purse, 10);
    ({ state } = applyAnalysis(state, one({ name: 'Ева', wants: [{ text: 'Выспаться' }] }), all, { points: true, mesId: 3, persona: true, userName: 'Ева' }));
    ({ state } = applyAnalysis(state, one({ name: 'Ева', wants: [{ text: 'Выспаться', status: 'done' }] }), all, { points: true, mesId: 4, persona: true, userName: 'Ева' }));
    assert.equal(state.purse, 20);
    // старые дневники: счета персонажей складываются в один кошелёк
    const old = { characters: { a: { name: 'А', points: 30 }, b: { name: 'Б', points: 15 } }, order: ['a', 'b'] };
    assert.equal(purseOf(old), 45);
});

test('НПС понаслышке: без настроения, только кто он и что о нём слышно', () => {
    const mains = ['Роберт'];
    let { state } = applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'устал', met: false }), all, { mains, persona: true, userName: 'Эвелин' });
    assert.equal(state.characters['Роберт'].met, undefined);
    ({ state } = applyAnalysis(state, one({ name: 'Хильда', g: 'f', who: 'дочь Роберта', met: false, mood: 'грустна', moodlets: [{ emotion: 'грусть', weight: 'deep', why: 'тест' }], heard: [{ fact: 'умерла в детстве', from: 'рассказал Роберт' }] }), all, { mains, persona: true, userName: 'Эвелин' }));
    const h = state.characters['Хильда'];
    assert.equal(h.met, false);
    assert.equal(h.mood, undefined);
    assert.equal(h.moodlets, undefined);
    assert.equal(h.heard[0].from, 'рассказал Роберт');
    assert.ok(!buildInjection(state, all, 'Эвелин').includes('Хильда'));
    const cs = JSON.parse(buildUserPrompt({ mainNames: mains, botName: 'Роберт' }, state, all).split('[Текущее состояние]\n')[1].split('\n\n')[0]);
    const hc = cs.characters.find(x => x.name === 'Хильда');
    assert.equal(hc.met, false);
    assert.equal(hc.moodlets_now, undefined);
    assert.equal(cs.characters.find(x => x.name === 'Роберт').no_met, undefined);
    // знакомые понаслышке не занимают места живых персонажей
    for (const n of ['Ромео', 'Элора', 'Кристина', 'Элли']) ({ state } = applyAnalysis(state, one({ name: n, met: false }), all, { mains, maxChars: 2 }));
    ({ state } = applyAnalysis(state, one({ name: 'Марта', mood: 'весела' }), all, { mains, maxChars: 2 }));
    assert.ok(state.characters['Марта']);
    // встретились лично — дальше обычная запись
    ({ state } = applyAnalysis(state, one({ name: 'Хильда', met: true, mood: 'удивлена' }), all, { mains }));
    assert.equal(state.characters['Хильда'].met, true);
    assert.equal(state.characters['Хильда'].mood, 'удивлена');
    ({ state } = applyAnalysis(state, one({ name: 'Хильда', met: false }), all, { mains }));
    assert.equal(state.characters['Хильда'].met, true);
    const html = renderNpcList({ state, npcKeys: ['Ромео', 'Марта'], roster: null, personaName: 'Эвелин', personaG: 'f' });
    assert.ok(html.includes('Знает понаслышке') && html.includes('Знакомы лично'));
});

test('нет в живых: серая карточка, без настроения, главного и персону не трогаем', () => {
    const mains = ['Роберт'];
    let { state } = applyAnalysis(emptyState(), one({ name: 'Сорель', mood: 'весел', moodlets: [{ emotion: 'радость', why: 'тест' }] }), all, { mains });
    ({ state } = applyAnalysis(state, one({ name: 'Сорель', dead: true, heard: [{ fact: 'погиб на войне', from: 'Роберт' }] }), all, { mains }));
    const c = state.characters['Сорель'];
    assert.equal(c.dead, true);
    assert.equal(c.mood, undefined);
    ({ state } = applyAnalysis(state, one({ name: 'Сорель', mood: 'зол', dead: false }), all, { mains }));
    assert.equal(state.characters['Сорель'].dead, true);
    assert.equal(state.characters['Сорель'].mood, undefined);
    ({ state } = applyAnalysis(state, one({ name: 'Роберт', mood: 'устал', dead: true }), all, { mains }));
    assert.equal(state.characters['Роберт'].dead, undefined);
    assert.ok(!buildInjection(state, all, 'Эвелин').includes('Сорель'));
    const html = renderNpcList({ state, npcKeys: ['Сорель'], roster: null, personaName: 'Эвелин', personaG: 'f' });
    assert.ok(html.includes('iw-dead') && html.includes('нет в живых'));
    const roster = parseRoster(JSON.stringify({ main: ['Роберт'], npc: [{ name: 'Хильда', who: 'дочь', dead: true }, { name: 'Марта', dead: 'false' }] }));
    assert.equal(roster.npc[0].dead, true);
    assert.equal(roster.npc[1].dead, false);
});

test('тайны лорбука и знание персоны о незнакомых', () => {
    const entries = {
        1: { key: ['Хильда'], content: 'Хильда — младшая дочь Роберта.' },
        2: { key: ['Хильда'], keysecondary: ['смерть', 'умерла'], selective: true, selectiveLogic: 0, content: 'Хильду отравила мачеха.' },
        3: { key: ['Роберт'], comment: 'Тайна Роберта', content: 'Роберт служил палачом.' },
        4: { key: ['Марта'], keysecondary: ['кухня'], selective: true, selectiveLogic: 2, content: 'Марта — экономка.' },
    };
    const closed = loreText(entries, 9000, { chatText: 'Роберт рассказал про Хильду.', names: ['Роберт', 'Эвелин'] });
    assert.ok(closed.includes('младшая дочь') && closed.includes('экономка'));
    assert.ok(!closed.includes('отравила'));
    assert.ok(!closed.includes('палачом')); // имя героя звучит всегда — тайну оно не раскрывает
    entries[3].key = ['Роберт', 'палач'];
    assert.ok(loreText(entries, 9000, { chatText: 'Говорят, он был палачом', names: ['Роберт'] }).includes('палачом'));
    assert.ok(!loreText(entries, 9000, { chatText: 'Привет' }).includes('палачом'));
    const open = loreText(entries, 9000, { chatText: 'Хильда умерла прошлой зимой' });
    assert.ok(open.includes('отравила') && open.includes('[ТАЙНА'));
    // разбор только лорбука: персона ничего не «узнаёт» о незнакомых
    const mains = ['Роберт'];
    let { state } = applyAnalysis(emptyState(), one({ name: 'Хильда', met: false, who: 'отравленная дочь', dead: true, heard: [{ fact: 'рисовала углём' }] }), all, { mains, noChat: true });
    const h = state.characters['Хильда'];
    assert.equal(h.who, undefined);
    assert.equal(h.heard, undefined);
    assert.equal(h.dead, undefined);
    ({ state } = applyAnalysis(state, one({ name: 'Хильда', met: false, who: 'дочь Роберта', heard: [{ fact: 'умерла в детстве', from: 'рассказал Роберт' }] }), all, { mains }));
    assert.equal(state.characters['Хильда'].who, 'дочь Роберта');
    assert.equal(state.characters['Хильда'].heard.length, 1);
    // убранный вручную факт не возвращается
    state.characters['Хильда'].heardOff = ['умерла в детстве'];
    state.characters['Хильда'].heard = [];
    ({ state } = applyAnalysis(state, one({ name: 'Хильда', met: false, heard: [{ fact: 'Умерла в детстве!', from: 'Роберт' }] }), all, { mains }));
    assert.equal(state.characters['Хильда'].heard.length, 0);
    // старые записи понаслышке (до 0.4.3) пересобираются
    const old = { characters: { x: { name: 'Ромео', met: false, who: 'из лорбука', heard: [{ fact: 'тайна' }] } }, order: ['x'] };
    ({ state } = applyAnalysis(old, [], all, {}));
    assert.equal(state.characters.x.who, undefined);
});

test('дни недели и порядок НПС', () => {
    assert.deepEqual(C.weekdayHeads(['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']), ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
    assert.deepEqual(C.weekdayHeads(['Солнцедень', 'Лунник', 'Огнедень']), ['Со', 'Лу', 'Ог']);
    assert.deepEqual(C.weekdayHeads(['Сорн', 'Солм']), ['Сор', 'Сол']);
    const mains = ['Роберт'];
    let { state } = applyAnalysis(emptyState(), one({ name: 'Хильда', role: 'minor', mood: 'спокойна' }), all, { mains });
    ({ state } = applyAnalysis(state, one({ name: 'Марта', role: 'major', mood: 'весела' }), all, { mains }));
    ({ state } = applyAnalysis(state, one({ name: 'Сорель', role: 'key', mood: 'зол' }), all, { mains }));
    const html = renderNpcList({ state, npcKeys: ['Хильда', 'Марта', 'Сорель'], roster: null });
    const at = n => html.indexOf(`>${n}<`);
    assert.ok(at('Сорель') < at('Марта') && at('Марта') < at('Хильда'));
});

test('год рождения без дня, отмена покупки, достижения из сюжета', () => {
    assert.deepEqual(parseBorn('1969'), { y: 1969 });
    assert.deepEqual(parseBorn('1969 г.'), { y: 1969 });
    const g = C.normCalendar({ type: 'greg' });
    assert.equal(C.ageNow(g, { y: 1996, m: 10, d: 8 }, { born: { y: 1966 } }), 30);
    const cu = C.normCalendar({ type: 'custom', months: [{ name: 'А', days: 30 }, { name: 'Б', days: 30 }] });
    assert.equal(C.ageNow(cu, { y: 92, m: 2, d: 3 }, { born: { y: 62 } }), 30);
    let { state } = applyAnalysis(emptyState(), one({ name: 'Роберт', born: '14.03' }), all, {});
    ({ state } = applyAnalysis(state, one({ name: 'Роберт', born: '1690' }), all, {}));
    assert.deepEqual(state.characters['Роберт'].born, { d: 14, m: 3, y: 1690 });
    // отмена купленного: убирается и возвращает всё
    const st = { characters: { r: { name: 'Роберт', shop: [{ id: 'k', kind: 'buff', title: 'Кофе', cost: 30, turns: 3 }, { id: 'e', kind: 'event', title: 'Звонок', cost: 50 }] } }, order: ['r'], purse: 100 };
    const ch = st.characters.r;
    assert.equal(buyReward(ch, ch.shop[0], st), null);
    assert.equal(buyReward(ch, ch.shop[1], st), null);
    assert.equal(st.purse, 20);
    assert.equal(cancelReward(ch, 'e', st), 50);
    assert.equal(st.purse, 70);
    assert.equal(ch.buffs.length, 1);
    assert.ok(!buildInjection(st, all, '').includes('Звонок'));
    // достижения: одно на сообщение, при свайпе заменяется, одинаковые не повторяются
    const a1 = S.cleanAchievement({ title: 'Первый поцелуй', desc: 'под дождём', icon: 'lips', tier: 'silver' });
    let r = S.addAchievement([], a1, { mes: 10 });
    assert.ok(r.added);
    r = S.addAchievement(r.list, S.cleanAchievement({ title: 'Спасение', icon: 'nope' }), { mes: 10 });
    assert.equal(r.list.length, 1);
    assert.equal(r.list[0].icon, 'shield'); // значок подобран по смыслу
    assert.equal(S.cleanAchievement({ title: 'Мастер неловких пауз', icon: 'shy', kind: 'funny' }).icon, 'shy');
    assert.equal(S.cleanAchievement({ title: 'Просто так', kind: 'cute' }).icon, 'heart');
    r = S.addAchievement(r.list, S.cleanAchievement({ title: 'спасение!' }), { mes: 12 });
    assert.equal(r.added, null);
    assert.equal(S.cleanAchievement({}), null);
});

test('связка с Love Score', () => {
    const { loveToAttitude, loveFor } = C2;
    assert.equal(loveToAttitude(53.5, 100), 2);
    assert.equal(loveToAttitude(-30, 100), -1);
    assert.equal(loveToAttitude(100, 100), 3);
    assert.equal(loveToAttitude(-100, 100), -3);
    const love = { main: { name: 'Роберт', score: 53.5, max: 100, type: 'romance', typeLabel: 'романтика' }, npcs: [{ name: 'Марта', nameEn: 'Martha', score: 10, max: 100, type: 'friendship', typeLabel: 'дружба' }] };
    assert.ok(loveFor(love, 'Martha'));
    let { state } = applyAnalysis(emptyState(), one({ name: 'Роберт', mood: 'спокоен', impression: { label: 'странная', score: 0, why: 'x', now: 'тянет к ней' } }), all, {});
    const inj = buildInjection(state, all, 'Эвелин', 'medium', { love });
    assert.ok(!inj.includes('из 3'));
    assert.ok(inj.includes('тянет к ней'));
    assert.ok(buildInjection(state, all, 'Эвелин').includes('из 3'));
    const up = buildUserPrompt({ love, userName: 'Эвелин', botName: 'Роберт' }, state, all);
    assert.ok(up.includes('Love Score') && up.includes('54 из 100, романтика'));
    assert.ok(!cleanMessageText('Привет <!-- [LOVE_SCORE:47:признание > всё] --> мир').includes('LOVE'));
});

test('подарки от персонажа и лавка персоны', () => {
    const st = { characters: { r: { name: 'Роберт', shop: [{ id: 'g', kind: 'gift', title: 'Старый компас', effect: 'компас отца', cost: 40, tone: 'romantic' }] } }, order: ['r'], purse: 100 };
    const ch = st.characters.r;
    assert.equal(buyReward(ch, ch.shop[0], st), null);
    assert.equal(ch.buffs[0].kind, 'gift');
    const later = decayState(st, 3);
    assert.equal(later.characters.r.buffs.length, 1);
    assert.ok(buildInjection(st, all, 'Эвелин').includes('сам дарит Эвелин'));
    const up = buildUserPrompt({ userName: 'Эвелин', botName: 'Роберт' }, st, all);
    assert.ok(up.includes('gift_pending'));
    assert.ok(buildSystemPrompt(DEFAULT_SETTINGS, { userName: 'Эвелин', botName: 'Роберт', hasGifts: true, trackNames: [], mainNames: ['Роберт'] }).includes('gift_given'));
    const P = C2.buildRewardsPrompt({ userName: 'Эвелин' }, { name: 'Эвелин', persona: true });
    assert.ok(P.system.includes('памятные вещи для персоны'));
    const R = C2.parseRewards(JSON.stringify({ rewards: [{ title: 'Компас', kind: 'gift', tone: 'funny', cost: 30 }] }));
    assert.equal(R[0].kind, 'gift');
    assert.equal(R[0].tone, 'funny');
});

console.log(`значки: ${passed} проверок прошло`);

test('обрыв ответа: хвост после закрытого JSON — не обрыв, незакрытые скобки — обрыв', () => {
    assert.equal(looksCut('{"a": [1, 2]}'), false);
    assert.equal(looksCut('```json\n{"a": 1}\n```\nНадеюсь, помогла.'), false);
    assert.equal(looksCut('{"a": "x"}</answer>'), false);
    assert.equal(looksCut('{"a": "фигурная } в тексте", "b": [1]}.'), false);
    assert.equal(looksCut('<think>думаю {</think>{"a": 1}'), false);
    assert.equal(looksCut('{"a": [1, 2'), true);
    assert.equal(looksCut('{"a": "оборвалось на полусло'), true);
    assert.equal(looksCut(''), false);
    assert.equal(looksCut('просто текст'), false);
});

test('думающие модели: новые версии тоже получают место на размышления', () => {
    const s = mergeSettings({ budgetCap: 20000 });
    const plain = responseBudget(s, { kind: 'chat', mains: 1, model: 'mistral-large-4' });
    for (const m of ['google/gemini-4-argon', 'google/gemini-3.8-flash', 'z-ai/glm-5.3', 'deepseek/deepseek-v4-pro', 'moonshotai/kimi-k3', 'x-ai/grok-4.1'])
        assert.ok(responseBudget(s, { kind: 'chat', mains: 1, model: m }) > plain, m);
});

test('свёрнутые блоки: развёрнутые «Хочет / Боится» не уезжают наверх', () => {
    const b = k => `<section class="iw-block iw-b-${k}"></section>`;
    const kinds = html => [...html.matchAll(/iw-b-([a-z]+)([^"]*)/g)].map(m => m[1] + (m[2].includes('iw-solo') ? '*' : ''));
    const all = [b('mood'), b('impression'), b('wants'), b('fears')];
    assert.deepEqual(kinds(layoutBlocks(all, { mood: true, impression: true })), ['mood', 'impression', 'wants', 'fears']);
    assert.deepEqual(kinds(layoutBlocks(all, { impression: true })), ['mood*', 'impression*', 'wants', 'fears']);
    assert.deepEqual(kinds(layoutBlocks(all, {})), ['mood', 'impression', 'wants', 'fears']);
});

test('сколько думать: тело запроса для своего адреса и OpenRouter-образных прокси', () => {
    assert.deepEqual(C2.thinkingBody('low'), { reasoning: { effort: 'low' } });
    assert.deepEqual(C2.thinkingBody('chat'), {});
    assert.equal(C2.includeBodyWithThinking('', 'low'), 'reasoning:\n  effort: low');
    assert.equal(C2.includeBodyWithThinking('top_k: 40', 'medium'), 'top_k: 40\nreasoning:\n  effort: medium');
    assert.equal(C2.includeBodyWithThinking('{"top_k":40}', 'low'), '{"top_k":40,"reasoning":{"effort":"low"}}');
    // своё «reasoning» в теле не перебиваем, «как в чате» ничего не добавляет
    assert.equal(C2.includeBodyWithThinking('reasoning:\n  max_tokens: 500', 'low'), 'reasoning:\n  max_tokens: 500');
    assert.equal(C2.includeBodyWithThinking('top_k: 40', 'chat'), 'top_k: 40');
    assert.equal(mergeSettings({ thinking: 'weird' }).thinking, 'low');
});

test('сны: список на ночь, по одному на каждого, старый формат тоже понимается', () => {
    const list = C2.cleanNightDreams([{ who: 'Виктор', text: 'Снился мост', tone: 'тревожный' }, { who: 'Ева', text: 'Снилось море' }, { who: '', text: 'без имени' }]);
    assert.equal(list.length, 2);
    assert.equal(C2.cleanNightDreams({ who: 'Виктор', text: 'Один сон' }).length, 1);
    assert.deepEqual(C2.cleanNightDreams(null), []);
});

test('часы: сторонние инфоблоки в HTML и размышления не мешают', () => {
    const g = C.normCalendar({ type: 'greg' });
    const html = '<think>в 1985 году ему было 27</think><div class="status"><span>📅 9 мая 1997</span> · <span>07:20</span></div>\n\nТекст сцены.';
    const st = C.findStamp(html, g);
    assert.deepEqual(st.date, { d: 9, m: 5, y: 1997 });
    assert.deepEqual(st.time, { h: 7, mi: 20 });
    // «прошло два дня» в сообщении игрока
    const cur = { y: 1997, m: 5, d: 9, h: 7, mi: 20 };
    const r = C.advance(g, cur, ['*Прошло два дня.*'], { step: 0 });
    assert.equal(r.why, 'skip');
    assert.equal(r.t.d, 11);
    assert.equal(C.advance(g, cur, ['Привет!'], { step: 0 }).why, 'same');
});

test('часы: «через три дня ей исполнится» — не скачок; «прошло два дня. Вечером» — вечер', () => {
    const g = C.normCalendar({ type: 'greg' });
    assert.equal(C.findSkip('Он помнил то, что через три дня, в среду, ей исполнится двадцать восемь.'), null);
    assert.equal(C.findSkip('Через неделю будет суд.'), null);
    assert.equal(C.findSkip('Через два часа они вернулись домой.').add, 120);
    assert.equal(C.findSkip('Они поужинали, а через час легли спать.').add, 60);
    const cur = { y: 1997, m: 8, d: 15, h: 8, mi: 10 };
    const r = C.advance(g, cur, ['*Прошло два дня. Вечером Ева вернулась с работы.*'], { step: 0 });
    assert.equal(r.t.d, 17);
    assert.equal(r.t.h, 19);
});

test('брак и дети: заполняются один раз, меняются только по событию, правку игрока не трогают', () => {
    assert.deepEqual(cleanLife({ marry: 'не хочет', kids: 'love', own: 'maybe', when: 'later', count: 2 }).marry, 'no');
    assert.equal(cleanLife({ marry: 'unknown', kids: 'unknown' }), null);
    assert.equal(lifeText({ marry: 'no', kids: 'love', own: 'no', when: 'later', count: 2 }), 'брак: не хочет; дети: любит; свои: не хочет');
    assert.equal(lifeHit('Он заговорил о свадьбе'), 'свадьб');
    assert.equal(lifeHit('Детектив осмотрел двор'), null);
    let { state } = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', life: { marry: 'yes', kids: 'love', own: 'want', when: 'later', count: 2, why: 'вырос в большой семье' } }), all, {});
    const k = state.order[0];
    assert.equal(state.characters[k].life.marry, 'yes');
    // повторный разбор без события — взгляды не меняются
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'спокоен', family: { marry: 'no', kids: 'dislike' } }), all, {}));
    // плоские поля, как теперь просит подсказка
    {
        const flat = applyAnalysis(emptyState(), one({ name: 'Олег', mood: 'спокоен', want_marry: 'maybe', kids_attitude: 'love', want_kids: 'want', kids_when: 'later', kids_count: 2, family_why: 'вырос без отца' }), all, {}).state;
        assert.equal(flat.characters[flat.order[0]].life.own, 'want');
        assert.equal(C2.nameInText('Кирилл Вершинин', 'Позвонил Вершинину и ушёл'), true);
        assert.equal(C2.nameInText('Кирилл Вершинин', 'Он расправил плечи'), false);
    }
    // строка-биография в старом ключе life не ломает взгляды
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'спокоен', life: 'Майор милиции, прошёл Афганистан' }), all, {}));
    assert.equal(state.characters[k].life.marry, 'yes');
    // событие — меняются, с историей
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'грустен', life: { marry: 'no', changed: true, why: 'невеста сбежала со свадьбы' } }), all, {}));
    assert.equal(state.characters[k].life.marry, 'no');
    assert.equal(state.characters[k].lifeLog.length, 1);
    // правка игрока закрепляет
    state.characters[k].lifeSet = true;
    state.characters[k].life.marry = 'maybe';
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'грустен', life: { marry: 'yes', changed: true, why: 'помирились' } }), all, {}));
    assert.equal(state.characters[k].life.marry, 'maybe');
    // к месту — только когда в сообщениях тема брака и детей
    const quiet = buildAttrInjection(state, 'Ева', 'medium', { mode: 'keys', recent: 'Они пили чай.' });
    assert.ok(!quiet.includes('брак'));
    const hits = [];
    const talk = buildAttrInjection(state, 'Ева', 'medium', { mode: 'keys', recent: 'А ты хочешь детей?', hits });
    assert.ok(talk.includes('взгляды на брак и детей'));
    assert.equal(hits[0].side, 'life');
    const html = renderPanel({ state, settings: DEFAULT_SETTINGS, theme: 'diary', view: 'main:' + k, mains: [k], npcKeys: [] });
    assert.ok(html.includes('iw-b-life') && html.includes('data-iw-life="marry"'));
});
test('отношения: шкалы двигаются постепенно, формальный статус — только по событию', () => {
    assert.equal(relStatus(null, false).label, 'незнакомцы');
    assert.equal(relStatus({ friend: 60, romance: 0 }).label, 'хорошие друзья');
    assert.equal(relStatus({ friend: 30, romance: 55 }).label, 'влюблённость');
    assert.equal(relStatus({ friend: 20, romance: 0 }).label, 'приятели');
    assert.equal(relStatus({ friend: 80, romance: 22 }).label, 'близкие друзья');
    assert.equal(relStatus({ friend: 30, romance: 22 }).label, 'симпатия');
    assert.equal(relStatus({ friend: -50, romance: 0 }).label, 'неприязнь');
    assert.equal(relStatus({ friend: -71, romance: 0 }).label, 'враги');
    assert.equal(relStatus({ friend: -90, romance: 0 }).label, 'заклятые враги');
    assert.equal(C2.romanceLevel(-70)[1], 'отвращение');
    assert.equal(C2.friendLevel(0)[1], 'знакомые');
    assert.equal(relStatus({ friend: 10, romance: 80, formal: 'married' }).label, 'супруги');
    assert.equal(cleanRel({ friend: 250, romance: -4, formal: 'жена' }).formal, 'married');
    let { rel } = mergeRel(null, { friend: 10, romance: 0 });
    ({ rel } = mergeRel(rel, { friend: 90, romance: 60 }));
    // за один разбор — немного, и чем выше, тем медленнее
    assert.equal(rel.romance, 8);
    assert.ok(rel.friend > 10 && rel.friend <= 18);
    let hi = { friend: 85, romance: 0 };
    ({ rel: hi } = mergeRel(hi, { friend: 100 }));
    assert.ok(hi.friend - 85 <= 2, 'у самого верха шкала почти не растёт');
    // а предательство роняет быстро
    ({ rel: hi } = mergeRel(hi, { friend: 20, changed: true, why: 'предал' }));
    assert.ok(hi.friend <= 66);
    let r2 = mergeRel(rel, { formal: 'engaged' });
    assert.equal(r2.rel.formal || '', '');
    r2 = mergeRel(rel, { formal: 'engaged', changed: true, why: 'сделал предложение' });
    assert.equal(r2.rel.formal, 'engaged');
    assert.equal(r2.log.to, 'помолвлены');
});
test('тип личности не скачет при повторном разборе; подсказка из прошлых разборов уходит модели', () => {
    let { state } = applyAnalysis(emptyState(), one({ name: 'Марк', mood: 'спокоен', ptype: 'INTJ-A', temper: 'melancholic', ptype_note: 'стратег', temper_note: 'сдержан' }), all, {});
    const k = state.order[0];
    ({ state } = applyAnalysis(state, one({ name: 'Марк', mood: 'спокоен', ptype: 'ENFP-T', temper: 'sanguine' }), all, { rebuild: true }));
    assert.equal(state.characters[k].ptype, 'INTJ-A');
    assert.equal(state.characters[k].temper, 'melancholic');
    const u = buildUserPrompt({ botName: 'Марк', userName: 'Ева', typeHints: { 'Лена': { ptype: 'ISFJ-T', temper: 'phlegmatic' } } }, state, all);
    assert.ok(u.includes('Лена: ISFJ-T, phlegmatic'));
});
test('календарь: многодневный праздник идёт несколько дней, однодневный — одна дата', () => {
    const cal = C.normCalendar({ type: 'greg', source: 'user', holidays: [{ name: 'Святки', month: 1, day: 7, days: 12 }, { name: 'День знаний', month: 9, day: 1 }] });
    const h = cal.holidays.find(x => x.name === 'Святки');
    assert.equal(h.len, 12);
    assert.equal(cal.holidays.find(x => x.name === 'День знаний').len, undefined);
    const ev = C.upcoming(cal, { y: 1997, m: 1, d: 10, h: 12, mi: 0 }, [], 30);
    const sv = ev.find(e => e.name === 'Святки');
    assert.equal(sv.inDays, 0);
    assert.equal(sv.ongoing, 4);
});
test('сквозной: лавка, баффы, событие, подарок, слух, отношения, НПС до встречи', () => {
    let { state } = applyAnalysis(emptyState(), parseAnalysis(JSON.stringify({ characters: [
        { name: 'Марк', mood: 'спокоен', impression: { label: 'смелая', score: 1, why: 'не испугалась' }, rel: { friend: 20, romance: 10 } },
        { name: 'Лёша', mood: 'спокоен', unmet: true, wants: [{ text: 'выспаться' }] },
    ] })), all, { mains: ['Марк'], force: ['Лёша'] });
    const mk = state.order.find(k => state.characters[k].name === 'Марк');
    const lk = state.order.find(k => state.characters[k].name === 'Лёша');
    assert.ok(lk, 'НПС, заведённый по кнопке, появился, хоть и не встречались');
    assert.ok(state.characters[lk].unmet);
    // повторный разбор с met:false не превращает заведённого по кнопке в запись «понаслышке»
    ({ state } = applyAnalysis(state, parseAnalysis(JSON.stringify({ characters: [{ name: 'Лёша', met: false, mood: 'спокоен', wants: [{ text: 'выспаться' }] }] })), all, { mains: ['Марк'] }));
    assert.ok(state.characters[lk].wants && state.characters[lk].wants.length);
    assert.notEqual(state.characters[lk].met, false);
    const c = state.characters[mk];
    state.purse = 200;
    const rewards = parseRewards(JSON.stringify({ rewards: [
        { title: 'Амулет храбрости', kind: 'buff', turns: 3, cost: 30, effect: 'смелее с игроком' },
        { title: 'Письмо от сестры', kind: 'event', cost: 20, effect: 'приходит письмо' },
        { title: 'Брошь', kind: 'gift', cost: 40, effect: 'брошь с совой' },
        { title: 'Ракушка', kind: 'collect', cost: 10, for: 'user' },
    ] }));
    assert.equal(rewards.find(r => r.title === 'Ракушка').forUser, true);
    assert.equal(rewards.find(r => r.title === 'Брошь').forUser, false);
    for (const r of rewards.slice(0, 3)) assert.equal(buyReward(c, r, state), null);
    assert.equal(state.purse, 110);
    let inj = buildInjection(state, all, 'Ева', 'medium', { mains: ['Марк'] });
    assert.ok(inj.includes('сейчас действует: смелее с игроком'));
    assert.ok(inj.includes('вплети в ближайший ответ это событие: приходит письмо'));
    assert.ok(inj.includes('сам дарит Ева: Брошь'));
    assert.ok(inj.includes('кто они друг другу'));
    // через один ответ событие ушло, бафф ещё держится, подарок ждёт вручения
    state = decayState(state, 1);
    const c2 = state.characters[mk];
    assert.ok(!c2.buffs.some(b => b.kind === 'event'));
    assert.ok(c2.buffs.some(b => b.kind === 'buff'));
    assert.ok(c2.buffs.some(b => b.kind === 'gift'));
    state = decayState(state, 5);
    assert.ok(!state.characters[mk].buffs.some(b => b.kind === 'buff'));
    assert.ok(state.characters[mk].buffs.some(b => b.kind === 'gift'));
    // слух
    const r = cleanRumor({ who: 'соседка', about: 'Ева', text: 'Ева ночевала у майора', truth: 'half' });
    assert.ok(r && r.text.includes('майора'));
    // отношения: встреча снимает «не встречались», шкала двигается не скачком
    ({ state } = applyAnalysis(state, parseAnalysis(JSON.stringify({ characters: [
        { name: 'Лёша', mood: 'рад', impression: { label: 'своя', score: 1, why: 'помогла' }, rel: { friend: 80 } },
        { name: 'Марк', mood: 'рад', rel: { friend: 90, romance: 80 } },
    ] })), all, { mains: ['Марк'] }));
    assert.ok(!state.characters[lk].unmet);
    assert.ok(state.characters[mk].rel.friend > 20 && state.characters[mk].rel.friend < 40, 'дружба растёт понемногу');
    assert.ok(state.characters[mk].rel.romance > 10 && state.characters[mk].rel.romance < 30);
});
test('дата рождения из карточки: «Birthday: January 9th (Capricorn)» после «born and raised»', () => {
    const b = C2.bornFromText;
    assert.deepEqual(b('- Age: 24\n- Birthday: January 9th (Capricorn)\n- Height: 185 cm'), { d: 9, m: 1 });
    assert.deepEqual(b('Eva was born and raised in Leningrad.\n- Birthday: January 9th (Capricorn)'), { d: 9, m: 1 });
    assert.deepEqual(b('**Birthday:** 9th of January'), { d: 9, m: 1 });
    assert.deepEqual(b('Born in 1990. Birthday: Jan 9'), { d: 9, m: 1, y: 1990 });
    assert.deepEqual(b('Родилась в Ленинграде. День рождения: 9 января'), { d: 9, m: 1 });
    assert.deepEqual(b('Date of birth: 1975'), { y: 1975 });
    assert.equal(b('ничего такого'), null);
});
test('желание сбылось: награду забирают кнопкой, повторный разбор не даёт её второй раз', () => {
    const all = { ...DEFAULT_SETTINGS.modules };
    const one = (st, wants, o = {}) => applyAnalysis(st, parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', mood: 'рад', wants }] })), all, { mains: ['Марк'], points: true, ...o });
    let { state } = one(emptyState(), [{ text: 'выпить кофе', status: 'active' }]);
    const before = JSON.parse(JSON.stringify(state));
    const r = one(state, [{ text: 'выпить кофе', status: 'done' }], { claimWants: true, mesId: 5 });
    state = r.state;
    const w = state.characters['Марк'].wants.find(x => x.text === 'выпить кофе');
    assert.equal(w.unclaimed, 10);
    assert.equal(C2.purseOf(state), 0);
    assert.ok(r.events.some(e => e.type === 'want_done' && e.claim === 10 && !e.points));
    // ещё несколько разборов — желание с наградой не исчезает
    for (let k = 0; k < 5; k++) state = one(state, [{ text: 'новое желание ' + k, status: 'active' }], { claimWants: true }).state;
    const i = state.characters['Марк'].wants.findIndex(x => x.text === 'выпить кофе');
    assert.ok(i >= 0);
    assert.equal(C2.claimWant(state, 'Марк', i), 10);
    assert.equal(C2.purseOf(state), 10);
    assert.ok(!state.characters['Марк'].wants.some(x => x.text === 'выпить кофе'));
    assert.equal(C2.claimWant(state, 'Марк', 0), 0);
    // повторный разбор того же ответа от состояния «до»: награду уже забрали — второй раз не появится
    const base = C2.carryOwnEdits(before, state, 5);
    const again = one(base, [{ text: 'выпить кофе', status: 'done' }], { claimWants: true, mesId: 5 }).state;
    assert.ok(!again.characters['Марк'].wants.some(x => x.text === 'выпить кофе' && x.unclaimed));
    assert.equal(C2.purseOf(again), 10);
    // автоматически: монеты сразу
    const auto = one(before, [{ text: 'выпить кофе', status: 'done' }], { mesId: 6 }).state;
    assert.equal(C2.purseOf(auto), 10);
});
test('текст сообщения для разбора: скрытый <plan> не съедает окно, середина длинного ответа видна', () => {
    const plan = '<plan>\n<plan>\nHaru: Config check! ' + 'план '.repeat(300) + '</plan>\n';
    const scene = 'Начало сцены в зале. ' + 'Придворные шептались. '.repeat(120) + 'Леди Кэтрин Торн подошла с кубком вина. ' + 'Я перехватил её руку. '.repeat(60) + 'Конец.';
    const out = C2.cleanMessageText(plan + '<details><summary>✦ 23/08/812&nbsp;|&nbsp;19:15</summary>шапка</details>' + scene, 5000);
    assert.ok(!/Haru|план план/.test(out));
    assert.ok(out.includes('Кэтрин Торн'));
    assert.ok(out.includes('23/08/812 | 19:15'));
    const sp = C2.buildSystemPrompt({ ...DEFAULT_SETTINGS, modules: { ...DEFAULT_SETTINGS.modules } }, { userName: 'Евэй', botName: 'Кассиан', mainNames: ['Кассиан'], trackNames: ['Кассиан'], trackPersona: true, npcRoom: 3 });
    assert.ok(/Новые НПС: заведи каждого, кто назван по имени/.test(sp));
});
test('ориентация: из карточки, «нет» не выдумывает, ручная не перебивается; у персоны — общие шкалы', () => {
    const all = { ...DEFAULT_SETTINGS.modules };
    assert.equal(C2.cleanOrient('лесбиянка'), 'homo');
    assert.equal(C2.cleanOrient('гей'), 'homo');
    assert.equal(C2.cleanOrient('bisexual'), 'bi');
    assert.equal(C2.cleanOrient('нет'), '');
    assert.equal(C2.orientName('homo', 'f'), 'лесбиянка');
    assert.equal(C2.orientName('homo', 'm'), 'гей');
    const run = (st, o, opts = {}) => applyAnalysis(st, parseAnalysis(JSON.stringify({ characters: [Object.assign({ name: 'Марк', g: 'm', mood: 'спокоен' }, o)] })), all, { mains: ['Марк'], ...opts }).state;
    let st = run(emptyState(), { orient: 'нет' });
    assert.ok(!st.characters['Марк'].orient);
    assert.ok(st.characters['Марк'].orientChecked);
    st = run(st, { orient: 'bi' });
    assert.equal(st.characters['Марк'].orient, 'bi');
    // выбрала вручную — следующий разбор не перебивает
    const before = JSON.parse(JSON.stringify(st));
    st.characters['Марк'].orient = 'pan'; st.characters['Марк'].orientManual = true;
    const carried = C2.carryOwnEdits(before, st, 3);
    const again = run(carried, { orient: 'hetero' }, { mesId: 3 });
    assert.equal(again.characters['Марк'].orient, 'pan');
    // у персоны — тот же блок «кто вы друг другу» со шкалами персонажа
    const s2 = JSON.parse(JSON.stringify(again));
    s2.characters['Марк'].rel = { friend: 40, romance: 30, formal: '' };
    s2.characters['Марк'].impression = { label: 'интерес', score: 1, now: 'тянется', nowScore: 1 };
    s2.characters['Ева'] = { name: 'Ева', g: 'f', persona: true, mood: 'нежна', impression: { label: 'интерес', score: 1, now: 'тепло', nowScore: 1 }, orient: 'homo' };
    s2.order = ['Марк', 'Ева'];
    const html = renderPanel({ state: s2, settings: DEFAULT_SETTINGS, theme: 'china', view: 'me:Ева', busy: false, status: '', mains: ['Марк'], npcKeys: [], roster: null, persona: { key: 'Ева', name: 'Ева' } });
    assert.ok(html.includes('iw-rel-bars'));
    assert.ok(/Как она относится к нему/.test(html));
    assert.ok(html.includes('лесбиянка'));
    assert.ok(html.includes('+40'));
});
test('мультибот: плашка выбора главных, «сделать главным» у НПС и «в НПС» у главного', () => {
    const st = emptyState();
    st.characters['Adrian Vale'] = { name: 'Adrian Vale', g: 'm', mood: 'спокоен' };
    st.characters['Diana Cross'] = { name: 'Diana Cross', g: 'f', mood: 'увлечена', impression: { label: 'x', score: 1 } };
    st.order = ['Adrian Vale', 'Diana Cross'];
    const r = { multi: true, at: 1, picked: false, main: ['Adrian Vale', 'Ethan Rowe'], npc: [{ name: 'Diana Cross', who: 'учёная', role: 'key' }, { name: 'Lena Arden', who: 'техник станции', role: 'minor' }], find: () => null };
    const base = { state: st, settings: DEFAULT_SETTINGS, theme: 'logbook', busy: false, status: '', mains: ['Adrian Vale'], npcKeys: ['Diana Cross'], roster: r };
    const html = renderPanel(Object.assign({}, base, { view: 'main:Adrian Vale' }));
    assert.ok(html.includes('Кто здесь главные герои?'));
    assert.ok(html.includes('data-iw-mainpick="Ethan Rowe"'));
    assert.ok(html.includes('data-iw-demote="Adrian Vale"'));
    const npc = renderPanel(Object.assign({}, base, { view: 'npc:Diana Cross', roster: Object.assign({}, r, { picked: true }) }));
    assert.ok(npc.includes('data-iw-promote="Diana Cross"'));
    assert.ok(!npc.includes('Кто здесь главные герои?'));
    const single = renderPanel(Object.assign({}, base, { view: 'npc:Diana Cross', roster: Object.assign({}, r, { multi: false }) }));
    assert.ok(!single.includes('data-iw-promote'));
    const sp = C2.buildRosterPrompt([{ title: 'Карточка', text: 'x' }], 'Ева', 'русском', { multi: true }).system;
    assert.ok(/мультибот/.test(sp));
});

test('частота ачивок: на «эпохальных» — только золото и с паузой; на «обычно» — как раньше', () => {
    const list = [{ mes: 10 }];
    assert.equal(C2.achGate({ tier: 'bronze' }, list, 40, { achRate: 1 }), false);
    assert.equal(C2.achGate({ tier: 'silver' }, list, 40, { achRate: 1 }), false);
    assert.equal(C2.achGate({ tier: 'gold' }, list, 40, { achRate: 1 }), true);
    assert.equal(C2.achGate({ tier: 'silver' }, list, 15, { achRate: 2 }), false);
    assert.equal(C2.achGate({ tier: 'silver' }, list, 30, { achRate: 2 }), true);
    assert.equal(C2.achGate({ tier: 'bronze' }, list, 11, {}), true);
    assert.ok(C2.buildSystemPrompt(Object.assign({}, C2.DEFAULT_SETTINGS, { achRate: 1 }), { messages: ['x'] }).includes('эпохальное'));
});
test('картинка памятной вещи: только безопасный SVG, свои id', () => {
    const svg = C2.cleanArt('вот: <svg viewBox="0 0 64 64" onload="x()"><script>alert(1)</script><defs><radialGradient id="g"><stop offset="0" stop-color="#f00"/></radialGradient></defs><circle cx="32" cy="32" r="20" fill="url(#g)" onclick="y"/><image href="http://evil"/><a href="javascript:1"><path d="M0 0"/></a><foreignObject><div>x</div></foreignObject></svg> готово', 'k1');
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
    assert.ok(!/script|onload|onclick|image|href|foreignObject|alert/i.test(svg));
    assert.ok(svg.includes('url(#iwak1-g)') && svg.includes('id="iwak1-g"'));
    assert.equal(C2.cleanArt('<svg><text>нет фигур</text></svg>'), '');
    assert.equal(C2.cleanArt('без картинки'), '');
});
test('слухи: общие «по городу» видны у всех; желания и страхи заново — разбираются', () => {
    const r = cleanRumor({ who: 'торговки', about: 'город', text: 'В порт пришёл корабль с чумой', truth: 'half' });
    assert.ok(r.town && !r.about);
    const w = C2.parseWishes('{"wants":[{"text":"Поговорить с Евэй наедине"}],"fears":[{"text":"Что её увезут","strength":3}]}');
    assert.equal(w.wants[0].status, 'active');
    assert.equal(w.fears[0].strength, 3);
    assert.throws(() => C2.parseWishes('{"wants":[],"fears":[]}'));
});
test('повторный разбор того же сообщения не стирает уже записанный сон', () => {
    const base = { order: ['m'], characters: { m: { name: 'Марк', dreams: [{ text: 'старый сон', at: 1 }] } } };
    const own = { order: ['m'], characters: { m: { name: 'Марк', dreams: [{ text: 'старый сон', at: 1 }, { text: 'сон этой ночи', at: 5 }] } } };
    const out = C2.carryOwnEdits(base, own, 3);
    assert.deepEqual(out.characters.m.dreams.map(d => d.text), ['старый сон', 'сон этой ночи']);
});
test('этапы мечты не дублируются, даже перефразированные', () => {
    const d = C2.mergeDream({ dream: { title: 'Сохранить империю', steps: [{ text: 'Найти способ укрепить Договоры', done: false }, { text: 'Найти способ укрепить Договоры', done: true }] } },
        { title: 'Сохранить империю', steps: [{ text: 'Найти способ укрепить истончающиеся Договоры', done: false }, { text: 'Заключить брак', done: false }] }, 5);
    assert.equal(d.steps.length, 2);
    assert.ok(d.steps[0].done);
});
test('брак и дети: закреплён только пункт, поменянный руками, остальные меняются по истории', () => {
    const one = C2.parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', mood: 'спокоен', life: { marry: 'yes', kids: 'love', own: 'want', why: 'хочет семью' } }] }));
    let { state } = C2.applyAnalysis(C2.emptyState(), one, C2.DEFAULT_SETTINGS.modules, { mains: ['Марк'] });
    const k = state.order[0];
    state.characters[k].life.marry = 'no';
    state.characters[k].lifeLock = { marry: true };
    const two = C2.parseAnalysis(JSON.stringify({ characters: [{ name: 'Марк', mood: 'спокоен', life: { marry: 'yes', kids: 'dislike', own: 'no', changed: true, why: 'после ссоры' } }] }));
    ({ state } = C2.applyAnalysis(state, two, C2.DEFAULT_SETTINGS.modules, { mains: ['Марк'] }));
    assert.equal(state.characters[k].life.marry, 'no');
    assert.equal(state.characters[k].life.kids, 'dislike');
    assert.equal(state.characters[k].life.own, 'no');
});
test('лавка: за раз один подарок, одно событие и один эффект', () => {
    const st = { purse: 500, order: ['m'], characters: { m: { name: 'Марк', buffs: [] } } };
    const c = st.characters.m;
    assert.equal(C2.buyReward(c, { id: 'g1', kind: 'gift', title: 'Кольцо', cost: 10 }, st), null);
    assert.ok(/вручит/.test(C2.buyReward(c, { id: 'g2', kind: 'gift', title: 'Брошь', cost: 10 }, st)));
    assert.equal(C2.buyReward(c, { id: 'e1', kind: 'event', title: 'Гроза', cost: 10 }, st), null);
    assert.ok(C2.buyReward(c, { id: 'e2', kind: 'event', title: 'Бал', cost: 10 }, st));
    assert.equal(C2.buyReward(c, { id: 'b1', kind: 'buff', title: 'Смелость', cost: 10, turns: 3 }, st), null);
    assert.ok(C2.buyReward(c, { id: 'b2', kind: 'buff', title: 'Удача', cost: 10, turns: 3 }, st));
    assert.equal(C2.buyReward(c, { id: 'c1', kind: 'collect', title: 'Перо', cost: 10 }, st), null);
    assert.equal(c.buffs.length, 3);
});
console.log(`итого: ${passed} проверок`);
