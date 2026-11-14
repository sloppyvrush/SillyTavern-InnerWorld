// Регрессии по задачам из пользовательских заметок InnerWorld.
import assert from 'node:assert/strict';
import * as K from '../src/clock.js';
import { DEFAULT_SETTINGS, emptyState, mergeSettings, parseBorn, parseAnalysis, applyAnalysis, mergeCharacter, buildAttrInjection, triggeredPreferences, carryOwnEdits, buildSystemPrompt, buildUserPrompt } from '../src/core.js';
import { renderPanel } from '../src/render.js';
import { renderSettingsForm } from '../src/settings-ui.js';
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`✗ ${name}`); throw e; } };
const cal = K.normCalendar({type:'greg',country:'RU'});

test('Время: дата прямо в повествовании', () => {
  assert.equal(K.findSceneStamp('На дворе 17 мая 1996 года.').date.m, 5);
  assert.equal(K.findSceneStamp('Сейчас май 1996 года.').monthOnly, true);
  assert.equal(K.findSceneStamp('Действие происходит в мае 1996-го.').date.y, 1996);
  assert.equal(K.findSceneStamp('Раньше было 17 марта 1996 года.'), null);
  assert.equal(K.findSceneStamp('«Сейчас май 1996 года», — сказала она.'), null);
});
test('Время: сюжетная майская дата перекрывает март и не подменяется шагом', () => {
  const cur={y:1996,m:3,d:12,h:19,mi:0};
  const out=K.advance(cal,cur,['На дворе май 1996 года.','Она посмотрела в окно.'],{step:5});
  assert.equal(out.why,'scene');
  assert.deepEqual({y:out.t.y,m:out.t.m,d:out.t.d},{y:1996,m:5,d:12});
  const seq=K.advance(cal,out.t,['Она улыбнулась'],{step:5});
  assert.equal(seq.why,'step');
  assert.equal(seq.t.m,5);
});
test('Время: таймскип из истории остаётся рабочим', () => {
  const cur={y:1996,m:5,d:12,h:19,mi:0};
  const t=K.advance(cal,cur,['*Спустя два дня они встретились снова*'],{step:5});
  assert.equal(t.why,'skip');
});
test('Праздники: Хэллоуин не является массовым праздником России 90-х', () => {
  const ru=K.HOLIDAYS_RU.find(h=>/Хэллоуин/.test(h.name));
  const us=K.HOLIDAYS_US.find(h=>/Хэллоуин/.test(h.name));
  assert.equal(K.holidayDate(cal,ru,1995),null);
  assert.deepEqual(K.holidayDate(K.normCalendar({type:'greg',country:'US'}),us,1995),{m:10,d:31});
});
test('Дата рождения: различные форматы, в том числе словами', () => {
  assert.deepEqual(parseBorn('17.05.1996'),{d:17,m:5,y:1996});
  assert.deepEqual(parseBorn('17 мая 1996'),{d:17,m:5,y:1996});
  assert.deepEqual(parseBorn('двадцать первого мая 1996'),{d:21,m:5,y:1996});
  assert.deepEqual(parseBorn('первого июня 1996'),{d:1,m:6,y:1996});
});
test('Тип личности и темперамент не прыгают при новом анализе', () => {
 const fresh={name:'Ирина',ptype:'ENFP-T',temper:'choleric',ptypeNote:'Другое',temperNote:'Другое'};
 const merged=mergeCharacter({name:'Ирина',ptype:'INFJ-A',temper:'melancholic',ptypeNote:'Первое',temperNote:'Первое'},fresh,DEFAULT_SETTINGS.modules);
 assert.equal(merged.ptype,'INFJ-A');assert.equal(merged.temper,'melancholic');
 assert.equal(merged.ptypeNote,'Первое');
});
test('Сны: у персоны и чара сохраняются отдельно от мечты жизни', () => {
 let st=emptyState();
 const fresh=parseAnalysis(JSON.stringify({characters:[
  {name:'Ева',before_sleep:'Думает о письме',night_dream:'Лес у озера'},
  {name:'Марк',before_sleep:'Тревожится',night_dream:'Старый дом'}
 ]}));
 st=applyAnalysis(st,fresh,DEFAULT_SETTINGS.modules,{userName:'Ева',mains:['Марк'],persona:true}).state;
 assert.equal(st.characters['Ева'].persona,true);
 assert.equal(st.characters['Ева'].nightDream,'Лес у озера');
 assert.equal(st.characters['Марк'].beforeSleep,'Тревожится');
 const next=parseAnalysis(JSON.stringify({characters:[{name:'Ева',mood:'радостна'}]}));
 st=applyAnalysis(st,next,DEFAULT_SETTINGS.modules,{userName:'Ева',mains:['Марк'],persona:true}).state;
 assert.equal(st.characters['Ева'].nightDream,'Лес у озера');
});
test('Модель получает поля ночного сна только при событии сна', () => {
 const no=buildSystemPrompt(DEFAULT_SETTINGS,{userName:'Ева',botName:'Марк',trackNames:[]});
 const yes=buildSystemPrompt(DEFAULT_SETTINGS,{userName:'Ева',botName:'Марк',trackNames:[],sleepEvent:true});
 assert.ok(!no.includes('night_dream'));
 assert.ok(yes.includes('night_dream'));
});
test('Предпочтения: по ситуации, ключам и регулярным выражениям', () => {
 const st={order:['Марк'],characters:{Марк:{name:'Марк',likes:['длинные волосы','успокоительные слова'],dislikes:['грубость'],attrKeys:{'грубость':'re:оскорб(ил|ила)|хамств'}}}};
 assert.ok(!buildAttrInjection(st,'Ева','medium','Они осмотрели улицу').includes('длинные волосы'));
 assert.ok(buildAttrInjection(st,'Ева','medium','Она поправила волосы').includes('длинные волосы'));
 assert.ok(buildAttrInjection(st,'Ева','medium','Он её оскорбил').includes('грубость'));
 assert.ok(buildAttrInjection(st,'Ева','medium',null).includes('успокоительные слова'));
 assert.deepEqual(triggeredPreferences(['красные волосы'],'стол и компьютер',{'красные волосы':'re:[invalid'}),[]);
});
test('Лавка: общее состояние переносится при обновлении записи', () => {
 const mine={...emptyState(),shop:[{id:'x',title:'Билет',kind:'event',cost:50}],order:['Ева'],characters:{Ева:{name:'Ева',persona:true,points:55}}};
 const next=carryOwnEdits(emptyState(),mine,5);
 assert.equal(next.shop?.[0]?.title,'Билет');
});
test('Интерфейс: ночные сны и настройки доступны', () => {
 const st={...emptyState(),order:['Ева'],characters:{Ева:{name:'Ева',persona:true,nightDream:'Огонь'}}};
 const h=renderPanel({state:st,settings:DEFAULT_SETTINGS,theme:'diary',view:'me:Ева',mains:[],npcKeys:[],persona:{key:'Ева',name:'Ева'},roster:{npc:[],find:()=>null},showcase:{got:[],fresh:0},avatarFor:()=>''});
 assert.ok(h.includes('Сны и мысли перед сном') && h.includes('Огонь'));
 const settings=renderSettingsForm(DEFAULT_SETTINGS,{variant:'diary'});
 assert.ok(settings.includes('attrActivation'));
 assert.ok(settings.includes('hudClock'));
});
console.log(`improvements: ${passed} проверок прошло`);
