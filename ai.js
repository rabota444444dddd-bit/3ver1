/* =====================================================================
   ЦКС — ЛОКАЛЬНИЙ ПОМІЧНИК
   Працює повністю у вашому браузері: без інтернету, без зовнішніх сервісів,
   дані нікуди не відправляються. Це не нейромережа, а «розумний» помічник на
   правилах: розуміє прості запити українською та російською, вчиться на ваших
   задачах (шукає схожі) і має базу типових планів, яку можна доповнювати нижче.

   Що вміє:
   • «Розпиши план для виставки до 20.11»        — план кроків (з перевіркою схожих ваших задач)
   • «Додай підзадачі до «Виставка»»              — підзадачі до наявної задачі
   • «Створи задачу Підготувати КП до п’ятниці для Олени по проєкту Об’єкт А»
   • «Термін доставки МК до 17.10.2026 по проєкту Об’єкт А» — термін + автозадача + нагадування
   • «Аналіз процесів»                             — сильні/слабкі сторони, що довго, що швидко, ризики
   • «Що на сьогодні?», «Кому призначити?», «Чого не вистачає по проєкту …?»
   ===================================================================== */

/* ---------- База типових планів (можна редагувати й додавати свої) ---------- */
const AIKB=[
 {n:'Виставка / стенд',k:/виставк|выставк|експо|экспо|експозиц|стенд/,s:['Узгодити мету, бюджет і формат участі','Підготувати концепцію та бриф','Розробити дизайн-макет стенду','Погодити макет із керівництвом','Виготовити стенд і друковані матеріали','Організувати логістику та доставку','Змонтувати стенд на місці','Провести роботу на виставці та зібрати контакти','Демонтаж і повернення обладнання','Підготувати звіт і передати ліди відділу продажів']},
 {n:'Поставка / відвантаження МК',k:/поставк|відвантаж|отгруз|доставк|металоконструкц|(^|\s)мк(\s|$|[,.;:])/,s:['Узгодити специфікацію та графік поставки','Підтвердити готовність продукції (ВТК, маркування)','Замовити транспорт і погодити машини','Оформити супровідні документи (ТТН, накладні)','Завантажити та відвантажити машину','Контроль доставки та приймання на об’єкті','Закрити документи та акти приймання']},
 {n:'Монтаж / будівництво',k:/монтаж|будівн|строительств|будов|об['’ʼ]?єкт|объект/,s:['Підготувати майданчик і допуски','Завезти конструкції та матеріали','Підготувати бригаду, техніку, інструмент','Змонтувати конструкції за черговістю','Контроль якості та усунення зауважень','Підписати акти виконаних робіт','Передати об’єкт замовнику']},
 {n:'Виготовлення (цех)',k:/виготовл|изготовл|цех|виробниц|производств|зварюван|сварк/,s:['Отримати креслення КМД','Закупити метал і комплектуючі','Розкрій і заготівля','Збірка та зварювання','Контроль якості (ВТК)','Антикорозійний захист / фарбування','Маркування та передача на склад']},
 {n:'Тендер / кошторис / КП',k:/тендер|кошторис|смет|комерційн|коммерческ|(^|\s)кп(\s|$)|пропозиц/,s:['Зібрати вихідні дані та вимоги замовника','Розрахувати кошторис','Підготувати комерційну пропозицію / тендерну документацію','Внутрішнє погодження','Подати документи','Відповісти на запитання замовника','Підбити підсумки та зафіксувати результат']},
 {n:'Проєктування / документація',k:/проєкт|проект|креслен|кмд|(^|\s)км(\s|$)|документац|технічн/,s:['Сформувати технічне завдання','Розробити креслення / модель','Внутрішня перевірка та розрахунки','Погодити з замовником','Внести правки','Випустити остаточну документацію']},
 {n:'Маркетинг / контент',k:/маркетинг|бренд|реклам|соцмереж|сайт|контент|кампан|пост\b|публікац/,s:['Визначити мету та аудиторію','Скласти контент-план і бюджет','Підготувати матеріали (тексти, візуали)','Погодити матеріали','Запустити / опублікувати','Зібрати та проаналізувати результати']},
 {n:'Договір / документи',k:/договір|договор|контракт|підписан|подпис|угод/,s:['Підготувати проєкт договору','Юридична перевірка','Погодити умови зі сторонами','Підписати договір','Передати в бухгалтерію та архів']},
 {n:'Нарада / захід',k:/нарад|зустріч|встреч|презентац|захід|мероприят|семінар|конференц/,s:['Визначити мету та учасників','Підготувати матеріали й порядок денний','Розіслати запрошення','Провести захід','Зафіксувати рішення та розіслати протокол']}
];
const AIGEN=['Уточнити вимоги та очікуваний результат','Скласти план, терміни й ресурси','Підготувати необхідні матеріали / документи','Виконати основну роботу','Перевірити якість і погодити результат','Закрити задачу: звіт та передача результату'];

/* ---------- Стан ---------- */
const AI={open:false,msgs:[],pend:{},n:0,ready:false};
const aiId=()=>'p'+(++AI.n);

/* ---------- Розуміння тексту ---------- */
const aiN=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/ы/g,'и').replace(/э/g,'е').replace(/ъ/g,"'").replace(/[’ʼ`´]/g,"'").replace(/і/g,'и').replace(/ї/g,'и').replace(/є/g,'е');
const AISTOP=new Set(['для','при','над','про','або','чи','що','це','по','на','до','от','від','та','за','из','із','как','что','или','это','его','щодо','під','підзадачі','задачу','задачі']);
const aiTok=s=>aiN(s).split(/[^a-zа-я0-9']+/).filter(w=>w.length>=2&&!AISTOP.has(w)).map(w=>w.slice(0,5));
function aiSim(a,b){const A=new Set(aiTok(a)),B=new Set(aiTok(b));if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/(A.size+B.size-i)}
const aiCap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const aiClean=s=>String(s||'').replace(/^[\s:,.\-–—;]+|[\s:,.\-–—;]+$/g,'').replace(/\s{2,}/g,' ').trim();
function aiDate(text){const n=aiN(text),td=dnum(today());let m;
  const cut=(m0)=>aiClean((text.slice(0,m0.index)+' '+text.slice(m0.index+m0[0].length)).replace(/\s(до|на|к|до|в|у)\s*$/i,'').replace(/(^|\s)(до|на|к)\s*(?=\s|$)/i,' '));
  if(m=n.match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/)){const dd=+m[1],mm=+m[2];if(dd>=1&&dd<=31&&mm>=1&&mm<=12){let yy=m[3]?+m[3]:new Date().getFullYear();if(yy<100)yy+=2000;let s=yy+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');if(!m[3]&&dnum(s)<td)s=(yy+1)+s.slice(4);return {d:s,rest:cut(m)}}}
  if(m=n.match(/через\s+(\d+)\s*(дн|ден|тиж|нед|мис|мес)/)){const k=+m[1],u=m[2],days=u=='дн'||u=='ден'?k:u=='тиж'||u=='нед'?k*7:k*30;return {d:dstr(td+days),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(післязавтра|послезавтра)/)){return {d:dstr(td+2),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(завтра)/)){return {d:dstr(td+1),rest:cut(m)}}
  if(m=n.match(/(?:^|\s)(сьогодни|сегодня|сьогодни)/)){return {d:dstr(td),rest:cut(m)}}
  const WD=[[/понедил\S*|понедел\S*/,0],[/вивтор\S*|вторник\S*/,1],[/серед[аиуою]\b|средa?\S*|среду/,2],[/четвер\S*|четверг\S*/,3],[/п'ятн\S*|пятн\S*/,4],[/субот\S*|суббот\S*/,5],[/недил\S*|воскрес\S*/,6]];
  for(const w of WD){if(m=n.match(w[0])){const cur=(td+3)%7;let k=(w[1]-cur+7)%7;if(k==0)k=7;return {d:dstr(td+k),rest:cut(m)}}}
  return {d:'',rest:text}}
function aiUsers(text){const T=aiN(text),res=[];S.users.forEach(u=>{const ws=aiN(u.name).split(/\s+/).filter(w=>w.length>2);if(ws.some(w=>new RegExp("(^|[^а-яa-z'])"+w.slice(0,Math.max(4,w.length-1)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(T)))res.push(u)});return res}
function aiProj(text){const d=D();if(!d)return null;const T=aiN(text);let best=null,bl=0;d.projects.forEach(p=>{const nm=aiN(p.name).trim(),tk=aiTok(p.name);if(!nm)return;const hit=T.includes(nm)||(tk.length&&tk.every(w=>aiTok(text).includes(w)));if(hit&&nm.length>bl){best=p;bl=nm.length}});return best}
function aiCat(text){const d=D();if(!d)return null;const T=aiN(text);return (d.cats||[]).find(c=>T.includes(aiN(c.name)))||null}
function aiSubject(q){const m=q.match(/[«"“]([^»"”]{2,})[»"”]/);if(m)return aiClean(m[1]);
  let s=q.replace(/(будь ласка|пліз|please|пожалуйста)[,\s]*/ig,' ').replace(/(розпиши|розписати|розпишіть|розбий|склади|скласти|створи|створити|додай|додати|зроби|сформуй|распиши|расписать|составь|создай|создать|добавь|план(\s+дій|\s+робіт|\s+действий)?|підзадач[іи]?|подзадач[иы]?|нову|нове|нова|нову задачу|задачу|завдання|задача)(?=[\s:,.]|$)/ig,' ');
  s=aiClean(s).replace(/^(для|по|на|до|про|щодо|під|для)\s+/i,'');return aiClean(s)}

/* ---------- Кроки плану: спочатку схожі ваші задачі, потім база типових планів ---------- */
function aiSteps(subject){let best=null,bs=0;
  vis().forEach(dd=>dd.tasks.forEach(t=>{if(t.subs.length<2)return;const s=aiSim(subject,t.title);if(s>bs){bs=s;best=t}}));
  if(best&&bs>=.34)return {src:'Взяв підзадачі зі схожої задачі «'+best.title+'» (збіг '+Math.round(bs*100)+'%)',steps:best.subs.map(s=>s.t)};
  const low=String(subject).toLowerCase(),k=AIKB.find(x=>x.k.test(low));
  if(k)return {src:'Типовий план: '+k.n+' (базу планів можна доповнювати в ai.js)',steps:k.s.slice()};
  return {src:'Універсальний план — доповніть кроки під вашу задачу',steps:AIGEN.slice()}}

/* ---------- Картки з попереднім переглядом ---------- */
function aiStepRows(steps){return steps.map((s,i)=>`<label class="ai-st"><input type="checkbox" checked><input type="text" value="${esc(s)}"></label>`).join('')}
function aiOptLine(o){const d=D(),a=[];if(o.end)a.push('термін: '+fmtD(o.end));if(o.project){const p=d.projects.find(x=>x.id==o.project);if(p)a.push('проєкт: '+esc(p.name))}if(o.who&&o.who.length)a.push('виконавці: '+o.who.map(u=>esc(un(u))).join(', '));if(o.cat){const c=(d.cats||[]).find(x=>x.id==o.cat);if(c)a.push('категорія: '+esc(c.name))}return a.length?`<div class="mu">${a.join(' · ')}</div>`:''}
function aiPlanCard(subject,o){const p=aiSteps(subject),id=aiId();AI.pend[id]={subject:subject,o:o};
  return `<div data-pend="${id}"><b>План: ${esc(aiCap(subject))}</b><div class="mu">${esc(p.src)}</div>${aiOptLine(o)}<div style="margin-top:6px">${aiStepRows(p.steps)}</div><div class="ai-b">${o.taskId?`<button class="b" onclick="aiApply('${id}','sub')">Додати підзадачі до «${esc(tgTitle(o.taskId))}»</button>`:`<button class="b" onclick="aiApply('${id}','task')">Створити задачу з підзадачами</button><button class="b2" onclick="aiApply('${id}','split')">Кроки — окремі задачі</button>`}</div></div>`}
const tgTitle=id=>{const t=D().tasks.find(x=>x.id==id);return t?t.title:''};
function aiRead(id){const r=document.querySelector('#aip [data-pend="'+id+'"]');if(!r)return [];return [...r.querySelectorAll('.ai-st')].filter(x=>x.querySelector('input[type=checkbox]').checked).map(x=>aiClean(x.querySelector('input[type=text]').value)).filter(Boolean)}
function aiMk(o){const t={id:uid(),title:o.title,status:ST[0],start:o.start||'',end:o.end||'',who:o.who||[],subs:(o.subs||[]).map(s=>({id:uid(),t:s,done:false,who:[]})),project:o.project||'',cat:o.cat||'',ts:Date.now(),doneAt:''};D().tasks.push(t);return t}
function aiApply(id,mode){const P=AI.pend[id],d=D();if(!P||!d)return;const steps=aiRead(id),o=P.o;if(!steps.length)return aiSay('Відмітьте хоча б один крок.');
  if(mode=='sub'){const t=d.tasks.find(x=>x.id==o.taskId);if(!t)return aiSay('Не знайшов задачу.');steps.forEach(s=>t.subs.push({id:uid(),t:s,done:false,who:[]}));autoSt(t);sv();return aiSay(`✅ Додано підзадач: <b>${steps.length}</b> до задачі «${esc(t.title)}». <a onclick="aiOpen('${t.id}')">Відкрити</a>`)}
  if(mode=='task'){const t=aiMk({title:aiCap(P.subject),start:today(),end:o.end,who:o.who,project:o.project,cat:o.cat,subs:steps});sv();return aiSay(`✅ Створено задачу «${esc(t.title)}» з підзадачами: <b>${steps.length}</b>. <a onclick="aiOpen('${t.id}')">Відкрити</a>`)}
  const n=steps.length,a=dnum(today()),b=o.end?Math.max(a,dnum(o.end)):null,made=[];
  steps.forEach((s,i)=>{let st='',en='';if(b!=null){const tot=b-a+1;st=dstr(a+Math.floor(i*tot/n));en=dstr(Math.max(a+Math.floor(i*tot/n),a+Math.floor((i+1)*tot/n)-1))}made.push(aiMk({title:s,start:st,end:en,who:o.who,project:o.project,cat:o.cat}))});
  sv();aiSay(`✅ Створено окремих задач: <b>${made.length}</b>${b!=null?' (строки розподілено до '+fmtD(o.end)+')':''}. Відкрийте «Таймлайн» чи «Календар», щоб побачити їх.`)}
function aiOpen(tid){const dd=S.depts.find(x=>x.tasks.some(t=>t.id==tid));if(!dd)return;S.dept=dd.id;const pg=dd.pages.find(p=>p.type=='tasks');if(pg)S.page=pg.id;op(tid)}

/* ---------- Розбір запитів ---------- */
function aiFindTask(text){const T=text,m=T.match(/[«"“]([^»"”]{2,})[»"”]/),key=m?m[1]:aiSubject(T);if(!key)return null;let best=null,bs=0;const d=D();d.tasks.filter(t=>!t.arch).forEach(t=>{const s=aiN(t.title).includes(aiN(key))?1:aiSim(key,t.title);if(s>bs){bs=s;best=t}});return bs>=.4?best:null}
function aiCreate(q){const dt=aiDate(q);let rest=dt.rest;const us=aiUsers(rest),pj=aiProj(rest),ct=aiCat(rest);
  us.forEach(u=>aiN(u.name).split(/\s+/).forEach(w=>{if(w.length>2)rest=rest.replace(new RegExp('(для|на|виконавець|відповідальн\\S*|призначити|назначить)?\\s*'+w.slice(0,Math.max(4,w.length-1)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\S*','ig'),' ')}));
  if(pj)rest=rest.replace(new RegExp('(по|в|у|для)?\\s*(проєкт\\S*|проект\\S*)?\\s*'+pj.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),' ');
  const parts=aiSubject(rest).split(/\s*;\s*|\n+/).map(aiClean).filter(x=>x.length>1);return {items:parts,end:dt.d,who:us.map(u=>u.id),project:pj?pj.id:'',cat:ct?ct.id:''}}
function aiCreateCard(c){const id=aiId();AI.pend[id]={c:c};return `<div data-pend="${id}"><b>Створити ${c.items.length>1?'задачі':'задачу'}:</b>${aiOptLine({end:c.end,project:c.project,who:c.who,cat:c.cat})}<div style="margin-top:6px">${aiStepRows(c.items.map(aiCap))}</div><div class="ai-b"><button class="b" onclick="aiApplyCreate('${id}')">Створити</button></div></div>`}
function aiApplyCreate(id){const P=AI.pend[id],c=P&&P.c;if(!c)return;const items=aiRead(id);if(!items.length)return aiSay('Відмітьте хоча б одну задачу.');const L=items.map(t=>aiMk({title:t,start:c.end?today():'',end:c.end,who:c.who,project:c.project,cat:c.cat}));sv();aiSay('✅ Створено: '+L.map(t=>`«${esc(t.title)}» <a onclick="aiOpen('${t.id}')">відкрити</a>`).join('; '))}

/* ---------- Термін проєкту → автозадача ---------- */
function aiMs(q){const dt=aiDate(q);if(!dt.d)return null;const d=D(),pj=aiProj(q),X=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let nm=dt.rest;
  if(pj)nm=nm.replace(new RegExp('(по|в|у|для)?\\s*(проєкт\\S*|проект\\S*)?\\s*'+X(pj.name),'ig'),' ');
  nm=aiClean(nm.replace(/\s+(по|в|у|для)\s+(проєкт\S*|проект\S*)\s*$/i,' ').replace(/^(створи|додай|додати|добавь|створити)\s+/i,''));
  if(!/^(термін|строк|срок|дедлайн)/i.test(nm))nm=nm?'Термін '+nm:'Термін';
  let tpl=null,bs=0;(d.tpl||[]).forEach(t=>{const s=aiSim(nm,t.m);if(s>bs){bs=s;tpl=t}});return {name:aiCap(nm),date:dt.d,project:pj,task:(tpl&&bs>=.3)?tpl.t:'Виконати: '+nm.replace(/^(термін|строк|срок|дедлайн)\s*/i,'')}}
function aiMsCard(m){const d=D(),id=aiId();AI.pend[id]={m:m};return `<div data-pend="${id}"><b>Новий термін проєкту</b><div class="mu">Створю віху на графіку, автозадачу з датою та нагадування за 3 дні.</div><div style="margin-top:6px"><div class="ai-st"><span class="mu" style="width:70px">Назва</span><input type="text" data-f="name" value="${esc(m.name)}"></div><div class="ai-st"><span class="mu" style="width:70px">Дата</span><input type="date" data-f="date" value="${m.date}"></div><div class="ai-st"><span class="mu" style="width:70px">Задача</span><input type="text" data-f="task" value="${esc(m.task)}"></div><div class="ai-st"><span class="mu" style="width:70px">Проєкт</span><select data-f="proj">${d.projects.map(p=>`<option value="${p.id}" ${m.project&&m.project.id==p.id?'selected':''}>${esc(p.name)}</option>`).join('')||'<option value="">— немає проєктів —</option>'}</select></div></div><div class="ai-b"><button class="b" onclick="aiApplyMs('${id}')">Створити термін і задачу</button></div></div>`}
function aiApplyMs(id){const r=document.querySelector('#aip [data-pend="'+id+'"]'),v=f=>r.querySelector('[data-f="'+f+'"]').value.trim(),p=pj2(v('proj'));if(!p)return aiSay('Спершу створіть проєкт (сторінка «Проєкти»).');if(!v('name')||!v('date'))return aiSay('Вкажіть назву та дату.');
  p.ms=p.ms||[];const x={id:uid(),name:v('name'),date:v('date'),title:v('task')||('Виконати: '+v('name')),remind:3,task:''};p.ms.push(x);msMkTask(p,x);sv();aiSay(`✅ Термін «${esc(x.name)}» (${fmtD(x.date)}) додано до проєкту «${esc(p.name)}». Автозадача створена, нагадування — за 3 дні (змінюється в картці проєкту).`)}

/* ---------- Що на сьогодні, кому призначити, чого не вистачає ---------- */
function aiToday(){const td=dnum(today()),me1=S.me;let L=[];vis().forEach(dd=>dd.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;const mine=t.who.includes(me1),due=t.end&&dnum(t.end)<=td;if((mine&&(due||t.status==ST[2]))||(t.ms&&due))L.push({t:t,dd:dd,k:t.end?dnum(t.end)-td:99})}));L.sort((a,b)=>a.k-b.k);
  if(!L.length)return 'На сьогодні для вас нічого не горить 👍 Можна взяти задачу з «Робочі задачі» або попросити мене розписати план.';
  return `<b>Ваш день</b><ul>${L.slice(0,12).map(o=>`<li><a onclick="aiOpen('${o.t.id}')">${esc(o.t.title)}</a> <span class="mu">${o.k<0?'прострочено '+(-o.k)+' дн.':o.k==0?'сьогодні':o.k<99?'через '+o.k+' дн.':'в процесі'}</span></li>`).join('')}</ul>`}
function aiWho(){const d=D(),cnt={};d.members.forEach(u=>cnt[u]=0);d.tasks.forEach(t=>{if(t.arch||t.status==ST[3])return;t.who.forEach(u=>{if(cnt[u]!=null)cnt[u]++})});const a=Object.keys(cnt).map(u=>[u,cnt[u]]).sort((x,y)=>x[1]-y[1]);if(!a.length)return 'У відділі ще немає співробітників.';
  return `<b>Навантаження (невиконані задачі)</b>${a.map(x=>`<div class="hb"><span>${esc(un(x[0]))}</span><div class="bar"><b style="width:${100*x[1]/Math.max(1,a[a.length-1][1])}%"></b></div><b>${x[1]}</b></div>`).join('')}<div style="margin-top:6px">Найменше зайнятий(а): <b>${esc(un(a[0][0]))}</b> (${a[0][1]}). Далі: ${a.slice(1,3).map(x=>esc(un(x[0]))+' ('+x[1]+')').join(', ')||'—'}.</div>`}
function aiGaps(q){const d=D(),pj=aiProj(q);if(!pj)return 'Скажіть, про який проєкт мова, наприклад: «чого не вистачає по проєкту Об’єкт А?»';
  const T=d.tasks.filter(t=>t.project==pj.id),base=pj.name+' '+T.map(t=>t.title).join(' ')+' '+(pj.desc||''),low=base.toLowerCase(),k=AIKB.find(x=>x.k.test(low))||{n:'Універсальний',s:AIGEN},miss=k.s.filter(s=>!T.some(t=>aiSim(s,t.title)>=.3));
  if(!miss.length)return `По проєкту «${esc(pj.name)}» (план «${esc(k.n)}») усі типові кроки вже покриті задачами 👍`;
  const id=aiId();AI.pend[id]={subject:pj.name,o:{project:pj.id}};return `<div data-pend="${id}"><b>Можливо, пропущено по «${esc(pj.name)}»</b><div class="mu">Порівняв ваші задачі з типовим планом «${esc(k.n)}».</div><div style="margin-top:6px">${aiStepRows(miss)}</div><div class="ai-b"><button class="b" onclick="aiApply('${id}','split')">Створити вибране як задачі</button></div></div>`}

/* ---------- Аналіз процесів ---------- */
function aiAnalyze(){const d=D();if(!d)return 'Оберіть відділ.';const td=dnum(today()),all=d.tasks,open=all.filter(t=>t.status!=ST[3]&&!t.arch),done=all.filter(t=>t.status==ST[3]&&t.doneAt);
  const st0=t=>t.start?dnum(t.start):(t.ts?Math.floor(t.ts/ONE):null),dur=t=>{const s=st0(t);return s==null?null:Math.max(1,dnum(t.doneAt)-s+1)};
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,r1=x=>Math.round(x*10)/10;
  const D1=done.map(t=>({t:t,k:dur(t)})).filter(x=>x.k!=null);
  const grp=f=>{const m={};D1.forEach(x=>{const k=f(x.t);if(!k)return;(m[k]=m[k]||[]).push(x.k)});return Object.keys(m).map(k=>({k:k,n:m[k].length,a:avg(m[k])})).sort((a,b)=>b.a-a.a)};
  const byCat=grp(catN),byProj=grp(pn),byWho={};D1.forEach(x=>x.t.who.forEach(u=>{(byWho[u]=byWho[u]||[]).push(x.k)}));const who=Object.keys(byWho).map(u=>({k:un(u),n:byWho[u].length,a:avg(byWho[u])})).sort((a,b)=>b.a-a.a);
  const withEnd=done.filter(t=>t.end),onTime=withEnd.filter(t=>t.doneAt<=t.end),otp=withEnd.length?Math.round(100*onTime.length/withEnd.length):null;
  const gaps={};done.concat(open).forEach(t=>{const s=t.subs.filter(x=>x.done&&x.doneAt).sort((a,b)=>a.doneAt<b.doneAt?-1:1);let prev=st0(t);s.forEach(x=>{const g=Math.max(0,dnum(x.doneAt)-(prev==null?dnum(x.doneAt):prev));(gaps[aiN(x.t).trim()]=gaps[aiN(x.t).trim()]||{t:x.t,v:[]}).v.push(g);prev=dnum(x.doneAt)})});
  const stages=Object.values(gaps).map(o=>({t:o.t,n:o.v.length,a:avg(o.v)})),slowSt=stages.filter(x=>x.a>=2).sort((a,b)=>b.a-a.a).slice(0,3),fastSt=stages.filter(x=>x.a<=1).sort((a,b)=>a.a-b.a).slice(0,3);
  const overdue=open.filter(t=>t.end&&dnum(t.end)<td&&t.status!=ST[1]),stuck=open.filter(t=>t.status==ST[2]&&st0(t)!=null&&td-st0(t)>14&&prog(t)<50),risks=riskTasks(d),noDates=open.filter(t=>!t.end).length,noSubs=open.filter(t=>!t.subs.length).length;
  const wl={};open.forEach(t=>t.who.forEach(u=>wl[u]=(wl[u]||0)+1));const wa=Object.keys(wl).map(u=>[u,wl[u]]).sort((a,b)=>b[1]-a[1]),wavg=wa.length?avg(wa.map(x=>x[1])):0;
  const cnt=(a,b)=>done.filter(t=>dnum(t.doneAt)>=td-a&&dnum(t.doneAt)<=td-b).length,last=cnt(13,0),prev=cnt(27,14);
  const strong=[],weak=[],rec=[];
  if(otp!=null&&withEnd.length>=3){if(otp>=80)strong.push(`Дедлайни дотримуються: <b>${otp}%</b> задач завершено вчасно.`);else if(otp<60){weak.push(`Часто зриваються строки: вчасно закрито лише <b>${otp}%</b> задач.`);rec.push('Закладайте запас 15–20% до строків і розбивайте великі задачі на підзадачі з проміжними датами.')}}
  if(byCat.length>1){const f=byCat[byCat.length-1],s=byCat[0];strong.push(`Швидше за все виконуються задачі категорії «${esc(f.k)}»: у середньому <b>${r1(f.a)} дн.</b>`);if(s.a>=f.a*2&&s.a>=3){weak.push(`Найдовше тягнуться задачі категорії «${esc(s.k)}»: у середньому <b>${r1(s.a)} дн.</b>`);rec.push(`Подивіться, чому категорія «${esc(s.k)}» повільна: чи немає зовнішніх погоджень, які можна почати раніше.`)}}
  if(last>prev&&last>=2)strong.push(`Темп зростає: за 14 днів виконано <b>${last}</b> проти ${prev} за попередні 14.`);else if(prev>last&&prev>=3){weak.push(`Темп падає: за 14 днів виконано <b>${last}</b> проти ${prev} раніше.`)}
  if(wa.length>1&&wa[0][1]>=5&&wa[0][1]>wavg*1.4){weak.push(`Нерівномірне навантаження: у <b>${esc(un(wa[0][0]))}</b> ${wa[0][1]} невиконаних задач (середнє ${r1(wavg)}).`);rec.push(`Передайте частину задач від ${esc(un(wa[0][0]))} комусь із менш завантажених (запитайте мене: «кому призначити?»).`)}else if(wa.length>1)strong.push('Навантаження розподілено рівномірно.');
  if(overdue.length){weak.push(`Прострочено зараз: <b>${overdue.length}</b> задач${overdue.length>1?'':'а'}.`);rec.push('Перегляньте прострочені задачі: перенесіть дати, що нереальні, або закрийте неактуальні.')}else if(open.length)strong.push('Прострочених задач немає.');
  if(slowSt.length){weak.push('Вузькі місця (етапи, після яких довго немає руху): '+slowSt.map(x=>`«${esc(x.t)}» — ~${r1(x.a)} дн.`).join('; '));rec.push(`Розбийте етап «${esc(slowSt[0].t)}» на менші кроки й призначте окремого відповідального.`)}
  if(stuck.length){weak.push(`Застрягли в статусі «В процесі» понад 14 днів: <b>${stuck.length}</b> (${stuck.slice(0,3).map(t=>'«'+esc(t.title)+'»').join(', ')}).`);rec.push('Для задач, що застрягли, уточніть, що блокує, і запишіть це в підзадачу.')}
  if(open.length&&noDates/open.length>.3){weak.push(`Багато задач без дат: <b>${noDates}</b> із ${open.length}. Складно планувати та нагадувати.`);rec.push('Проставте дати кінця — тоді працюватимуть нагадування, календар і таймлайн.')}
  if(open.length&&noSubs/open.length>.5)rec.push('Більшість задач без підзадач: розпишіть кроки — тоді буде видно прогрес і вузькі місця (скажіть мені «розпиши план»).');
  const bar=(a,m)=>`<div class="hb"><span>${esc(a.k)}</span><div class="bar"><b style="width:${Math.max(4,100*a.a/m)}%;background:#5b7fb0"></b></div><b>${r1(a.a)} дн.</b></div>`,mx=Math.max(1,...byProj.map(x=>x.a),...byCat.map(x=>x.a),...who.map(x=>x.a));
  const enough=D1.length>=3;
  return `<b>Аналіз процесів відділу «${esc(d.name)}»</b><div class="mu">Виконано задач: ${done.length} · у роботі: ${open.length}${D1.length?' · середній цикл: '+r1(avg(D1.map(x=>x.k)))+' дн.':''}${otp!=null?' · вчасно: '+otp+'%':''}</div>`
   +(enough?'':'<div class="mu" style="margin-top:6px">Завершених задач з датами поки мало (потрібно 3+), тому висновки неповні. Ось що видно вже зараз.</div>')
   +(strong.length?`<h5>✅ Сильні сторони</h5><ul>${strong.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')
   +(weak.length?`<h5>⚠ Слабкі сторони</h5><ul>${weak.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')
   +(byProj.length?`<h5>⏱ Скільки займають проєкти</h5>${byProj.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')+(byCat.length?`<h5>⏱ Скільки займають категорії</h5>${byCat.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')+(who.length>1?`<h5>⏱ Середній цикл по виконавцях</h5>${who.slice(0,5).map(a=>bar(a,mx)).join('')}`:'')
   +(D1.length>=2?`<h5>🐢 Найдовші задачі</h5><ul>${D1.slice().sort((a,b)=>b.k-a.k).slice(0,3).map(x=>`<li>«${esc(x.t.title)}» — ${x.k} дн.</li>`).join('')}</ul><h5>⚡ Найшвидші задачі</h5><ul>${D1.slice().sort((a,b)=>a.k-b.k).slice(0,3).map(x=>`<li>«${esc(x.t.title)}» — ${x.k} дн.</li>`).join('')}</ul>`:'')
   +(fastSt.length?`<h5>⚡ Етапи, що йдуть швидко</h5><ul>${fastSt.map(x=>`<li>«${esc(x.t)}» — ~${r1(x.a)} дн.</li>`).join('')}</ul>`:'')
   +(risks.length?`<h5>🔮 Ризик зриву</h5><ul>${risks.slice(0,4).map(o=>`<li><a onclick="aiOpen('${o.t.id}')">${esc(o.t.title)}</a> <span class="mu">час ${Math.round(o.el*100)}% · готово ${Math.round(o.pr*100)}%</span></li>`).join('')}</ul>`:'')
   +(rec.length?`<h5>💡 Рекомендації</h5><ul>${rec.map(x=>'<li>'+x+'</li>').join('')}</ul>`:'')}

/* ---------- Головний розбір ---------- */
const AIHELP=`<b>Привіт! Я локальний помічник.</b> Працюю у вашому браузері, без інтернету.<ul><li>«Розпиши план для виставки до 20.11»</li><li>«Додай підзадачі до «Підготувати виставку»»</li><li>«Створи задачу Підготувати КП до п’ятниці для Олени»</li><li>«Термін доставки МК до 17.10.2026 по проєкту …»: створю термін, задачу й нагадування</li><li>«Аналіз процесів»: сильні й слабкі сторони, що довго, що швидко</li><li>«Що на сьогодні?», «Кому призначити?», «Чого не вистачає по проєкту …?»</li></ul>`;
function aiReply(q){const n=aiN(q),d=D();
  if(!d&&!/^(привит|привет|помощ|допом|help|\?)/.test(n))return 'Спершу оберіть відділ ліворуч.';
  if(/^(привит|привет|добрии|добрый|help|допом|помощ|що ти вмиеш|что ты умеешь|\?)/.test(n))return AIHELP;
  if(/анализ|аналитик|сильн|слабк|эффективн|ефективн|статистик|вузьк|узк|процес/.test(n))return aiAnalyze();
  if(/(що|что|шо).{0,10}(сьогодн|сегодн)|мии день|мои дела|на сьогодн|на сегодн|що робити|что делать|плани на день/.test(n))return aiToday();
  if(/кому (призначити|дати|доручити|назначить|поручить)|на кого (призначити|назначить)/.test(n))return aiWho();
  if(/чого не вистача|чего не хвата|що ще (треба|потрибно)|что еще|пропущен|що забули|что забыли|перевир.{0,6}повнот|перевер.{0,6}полнот/.test(n))return aiGaps(q);
  if(/(термин|строк|срок|дедлайн)/.test(n)&&!/(пидзадач|подзадач|розпиши|расписать|план)/.test(n)){const m=aiMs(q);if(m)return aiMsCard(m);return 'Вкажіть дату терміну, наприклад: «Термін доставки МК до 17.10.2026 по проєкту Об’єкт А».'}
  if(/(пидзадач|подзадач)/.test(n)){const t=aiFindTask(q);if(!t)return 'До якої задачі додати підзадачі? Вкажіть її назву в лапках: «…». Наприклад: додай підзадачі до «Підготувати виставку».';
    const lm=q.match(/[:：]\s*(.+)$/);const list=lm?lm[1].split(/\s*[;,\n]\s*/).map(aiClean).filter(x=>x.length>1):[];
    if(list.length>=2){const id=aiId();AI.pend[id]={subject:t.title,o:{taskId:t.id}};return `<div data-pend="${id}"><b>Додати підзадачі до «${esc(t.title)}»</b><div style="margin-top:6px">${aiStepRows(list.map(aiCap))}</div><div class="ai-b"><button class="b" onclick="aiApply('${id}','sub')">Додати</button></div></div>`}
    return aiPlanCard(t.title,{taskId:t.id})}
  if(/розпиши|розписа|распиши|расписать|склади план|составь план|скласти план|(^|\s)план(\s|$)|декомпоз|розбий|разбей/.test(n)){const dt=aiDate(q),sub=aiSubject(dt.rest);if(!sub||sub.length<3)return 'Для чого розписати план? Наприклад: «розпиши план для виставки до 20.11».';
    const ex=aiFindTask(sub);return aiPlanCard(sub,{end:dt.d,who:aiUsers(dt.rest).map(u=>u.id),project:(aiProj(dt.rest)||{}).id||'',cat:(aiCat(dt.rest)||{}).id||'',taskId:ex&&/(до задач|в задач|у задач|к задач)/.test(n)?ex.id:''})}
  if(/(створи|створити|додай|додати|добавь|создай|создать|нова задача|новая задача|нове завдання)/.test(n)){const c=aiCreate(q);if(!c.items.length)return 'Що саме створити? Наприклад: «створи задачу Підготувати КП до п’ятниці для Олени».';return aiCreateCard(c)}
  const sub=aiClean(q);if(sub.length>=4){const id=aiId();AI.pend[id]={q:sub};return `Не зовсім зрозумів запит. Що зробити з «${esc(sub)}»?<div class="ai-b"><button class="b2" onclick="aiAsk('розпиши план для '+AI.pend['${id}'].q)">Розписати план</button><button class="b2" onclick="aiAsk('створи задачу '+AI.pend['${id}'].q)">Створити задачу</button></div>`}
  return AIHELP}

/* ---------- Інтерфейс помічника ---------- */
function aiSay(h){AI.msgs.push({r:'a',h:h});aiRender()}
function aiRender(){const m=document.getElementById('aim');if(!m)return;m.innerHTML=AI.msgs.map(x=>`<div class="aim ${x.r}">${x.r=='u'?esc(x.h):x.h}</div>`).join('');m.scrollTop=m.scrollHeight}
function aiSubmit(){const t=document.getElementById('aii'),q=t.value.trim();if(!q)return;t.value='';AI.msgs.push({r:'u',h:q});aiRender();setTimeout(()=>{let h;try{h=aiReply(q)}catch(e){h='Щось пішло не так: '+esc(e.message||e)}aiSay(h)},180)}
const aiAsk=q=>{document.getElementById('aii').value=q;aiSubmit()};
function aiVis(){const p=document.getElementById('aip'),b=document.getElementById('aib');if(!p||!b)return;const on=!!(S&&S.me);b.style.display=on?'':'none';p.classList.toggle('open',on&&AI.open)}
function aiMount(){if(!S||!S.me||(typeof SH!='undefined'&&SH)){const b=document.getElementById('aib');if(b)b.style.display='none';const p=document.getElementById('aip');if(p)p.classList.remove('open');AI.msgs=[];AI.pend={};AI.open=false;return}
  if(!document.getElementById('aib')){const b=document.createElement('button');b.id='aib';b.className='aib';b.textContent='✦ Помічник';b.onclick=()=>{AI.open=!AI.open;aiVis();if(AI.open){const i=document.getElementById('aii');if(i)i.focus()}};document.body.appendChild(b);
    const p=document.createElement('div');p.id='aip';p.className='aip';p.innerHTML='<div class="aip-h"><b>✦ Помічник</b><span class="mu">локально · без інтернету</span><button class="x" onclick="AI.open=false;aiVis()">✕</button></div><div class="aip-m" id="aim"></div><div class="aip-c"><button onclick="aiAsk(\'Що на сьогодні?\')">Що на сьогодні?</button><button onclick="aiAsk(\'Аналіз процесів\')">Аналіз процесів</button><button onclick="document.getElementById(\'aii\').value=\'Розпиши план для \';document.getElementById(\'aii\').focus()">Розписати план</button><button onclick="aiAsk(\'Кому призначити?\')">Кому призначити?</button></div><div class="aip-i"><textarea id="aii" rows="2" placeholder="Напишіть запит… напр.: розпиши план для виставки до 20.11"></textarea><button class="b" onclick="aiSubmit()">➤</button></div>';document.body.appendChild(p);
    document.getElementById('aii').addEventListener('keydown',e=>{if(e.key=='Enter'&&!e.shiftKey){e.preventDefault();aiSubmit()}});
  }
  if(!AI.msgs.length){AI.msgs.push({r:'a',h:AIHELP});aiRender()}
  aiVis()}
aiMount();
