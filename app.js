/* ЦКС — Робочий офіс. Уся логіка програми.
   Дані зберігаються в браузері (localStorage). */
/* ===== Шлях і назви зображень =====
   Папка з картинками лежить поруч з index.html і називається "Img".
   Назви файлів — рівно такі, як ви надіслали. Щоб замінити картинку — змініть назву тут.
   Якщо файл не знайдено, програма сама пробує варіанти назви:
   «_» замість пробілу та «__2_» замість « (2)» (так Windows називає копії файлів). */
const IMG_DIR='Img/';
const IMG={logo:'лого__2_.png',sidebar_btn:'кнопка_боковая_панель.png',edit:'значок_редактирования.png',delete:'значок_удаления.png',export:'значок_экспорта.png',search:'поиск.png',dots_big:'троеточие_большое.png',dots_small:'троеточие_маленькое.png',triangle:'кнопка_треугольник.png'};
const OPTIONS_BG='окно_выбора_опций.png'; /* фон меню; також прописаний у style.css */
const ALT=n=>[...new Set([n,n.replace(/__(\d+)_/,' ($1)').replace(/_/g,' '),n.replace(/_/g,' ')])];
const GROUPS=Object.values(IMG).concat([OPTIONS_BG]).map(ALT);
Object.keys(IMG).forEach(k=>IMG[k]=IMG_DIR+IMG[k]);
document.addEventListener('error',e=>{const i=e.target;if(!i||i.tagName!='IMG')return;let cur;try{cur=decodeURIComponent(i.src.split('/').pop())}catch(x){return}
  const gr=GROUPS.find(a=>a.includes(cur));if(!gr)return;const nx=gr[gr.indexOf(cur)+1];if(!nx)return;
  Object.keys(IMG).forEach(k=>{if(IMG[k]==IMG_DIR+cur)IMG[k]=IMG_DIR+nx});i.src=IMG_DIR+nx},true);
(function(){const gr=GROUPS[GROUPS.length-1];let k=0;const t=()=>{if(k>=gr.length)return;const im=new Image();im.onload=()=>document.documentElement.style.setProperty('--ow','url("'+IMG_DIR+gr[k]+'")');im.onerror=()=>{k++;t()};im.src=IMG_DIR+gr[k]};t()})();

const K='cks_office_v1',K2='cks_ui_v1';
const CFG=window.CKS_CONFIG||{};
const CLOUD=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase);
const DB=CLOUD?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const ST=['Не почато','Постійна задача','В процесі','Виконано'],SC=['s0','s1','s2','s3'];
const TN={timeline:'Таймлайн',dash:'Центр управління',tasks:'Таблиця «Робочі задачі»',projects:'Проєкти',kanban:'Статус задач (Kanban)',table:'Власна таблиця',chart:'Графік',canvas:'Вільне полотно'};
const BN={title:'Назва задачі',status:'Статус',stage:'Етап виконання',start:'Дата початку',end:'Дата кінця',who:'Відповідальний',project:'Проєкт',prog:'Прогрес',cat:'Категорія'};
const ALLB=['title','status','stage','start','end','who','project','prog','cat'];
const CT=[['text','Текст'],['number','Число'],['percent','Відсоток'],['date','Дата'],['func','Функція (сума числових зліва)']];
const OLD={'Не выполнено':'Не почато','Постоянная задача':'Постійна задача','В процессе':'В процесі','Выполнено':'Виконано'};
const PNM={'Рабочие задачи':'Робочі задачі','Канбан':'Статус задач','Проекты':'Проєкти'};

let S;try{S=JSON.parse(localStorage.getItem(CLOUD?K2:K))}catch(e){}
S=S||{users:[],depts:[],me:null,dept:null,page:null,open:null};
if(CLOUD){S.users=[];S.depts=[];S.me=null;S.open=null;S.loading=true}
S.deptOrder=S.deptOrder||[];
let M='',mcb=null,from=null,reg=false,draft={pos:'boss'},PF='',SB=true,MN=null;
let FL={q:'',st:'',who:'',cat:'',sub:'',sw:'',arch:false,sort:'',only:false,pick:false,find:false},SEL={};
function defCols(){return ALLB.slice(0,6).map(k=>({id:k,key:k,name:BN[k],type:'b'}))}
S.depts.forEach(d=>{d.projects=d.projects||[];d.cats=d.cats||[];d.cols=d.cols||defCols();
  if(!d.v3){d.v3=1;d.cols=d.cols.filter(c=>c.key!='project'&&c.key!='prog');d.cols.forEach(c=>{if(c.type=='b')c.name=BN[c.key]});d.pages.forEach(p=>p.name=PNM[p.name]||p.name)}
  d.tasks.forEach(t=>{t.status=OLD[t.status]||t.status})});

const $=document.getElementById('app'),uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const me=()=>S.users.find(u=>u.id==S.me),isA=()=>me()&&me().admin,vis=()=>{const o=S.deptOrder||[];return S.depts.filter(d=>isA()||d.members.includes(S.me)).sort((a,b)=>{const i=o.indexOf(a.id),j=o.indexOf(b.id);return (i<0?999:i)-(j<0?999:j)})};
const D=()=>vis().find(d=>d.id==S.dept),P=()=>D()&&D().pages.find(p=>p.id==S.page),un=u=>(S.users.find(x=>x.id==u)||{name:'?'}).name,tg=t=>D().tasks.find(x=>x.id==t);
const wr=()=>{try{if(CLOUD){localStorage.setItem(K2,JSON.stringify({dept:S.dept,page:S.page,deptOrder:S.deptOrder}));schedPush();return 1}localStorage.setItem(K,JSON.stringify(S));return 1}catch(e){return 0}},sv=()=>{wr();R()},g=i=>document.getElementById(i).value.trim();
const canMng=d=>isA()||d.boss==S.me,isBoss=()=>isA()||(me()&&me().pos!='asst');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dn=t=>{if(t.status==ST[3]&&!t.doneAt)celebrate(t);t.doneAt=t.status==ST[3]?today():''},pn=t=>{const p=D().projects.find(x=>x.id==t.project);return p?p.name:''};
const stage=t=>{const s=t.subs.find(x=>!x.done);return s?s.t:(t.subs.length?'Усі етапи виконано':'—')},prog=t=>t.subs.length?Math.round(100*t.subs.filter(x=>x.done).length/t.subs.length):0,bar=v=>`<div class="bar" title="${v}%"><b style="width:${v}%"></b></div>`;

function R(){const pr={};document.querySelectorAll('.cd[data-i]').forEach(e=>{pr[e.dataset.i]=e.getBoundingClientRect()});
  $.innerHTML=S.loading?'<div class="au"><div class="card">Завантаження…</div></div>':(me()?app():auth());
  if(!REDUCED)document.querySelectorAll('.cd[data-i]').forEach(e=>{const o=pr[e.dataset.i];if(!o||!e.animate)return;const n=e.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;if(Math.abs(dx)+Math.abs(dy)>3)e.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'})});
  const m=document.getElementById('mi');if(m)m.focus();if(typeof HVT!='undefined'&&HVT&&hvEl().style.display=='block')hvFill();postR()}

/* ---------- вхід / реєстрація ---------- */
function auth(){const d=draft,deps=CLOUD?(S.pub||[]):S.depts;return `<div class="au"><div class="card"><div class="lgb"><span>Steel solution<br>for solid business</span><img src="${IMG.logo}"></div><h3>${reg?'Реєстрація':'Вхід'}</h3>${reg?`<input id="fn" placeholder="Прізвище та ім’я" value="${esc(d.n)}"><select id="fpos" onchange="rp()"><option value="boss" ${d.pos=='boss'?'selected':''}>Посада: Начальник</option><option value="asst" ${d.pos=='asst'?'selected':''}>Посада: Помічник</option></select>${d.pos=='asst'?(deps.length?`<select id="fd">${deps.map(x=>`<option value="${x.id}" ${x.id==d.d?'selected':''}>Відділ: ${esc(x.name)}${(x.boss||x.boss_name)?' (нач. '+esc(CLOUD?x.boss_name:un(x.boss))+')':''}</option>`).join('')}</select>`:'<div class="err">Поки немає відділів. Спочатку начальник має зареєструватись і створити відділ.</div>'):'<div class="mu">Після реєстрації ви створите свій відділ.</div>'}`:''}<input id="fe" placeholder="Email" value="${esc(d.e)}"><input id="fp" type="password" placeholder="Пароль"><div class="err" id="er">${esc(S.err||'')}</div><button class="b" onclick="${reg?'doReg()':'doLogin()'}">${reg?'Створити акаунт':'Увійти'}</button><a onclick="reg=!reg;R()">${reg?'Вже є акаунт? Увійти':'Немає акаунта? Зареєструватись'}</a>${CLOUD&&!reg?'<a onclick="resetPw()">Забули пароль?</a>':''}${S.users.length?'':'<p class="mu">Перший зареєстрований користувач отримує повний доступ до всіх відділів.</p>'}</div></div>`}
const er=t=>{document.getElementById('er').textContent=t},rp=()=>{draft={n:g('fn'),e:g('fe'),pos:g('fpos'),d:(document.getElementById('fd')||{}).value};R()};
function doRegL(){const n=g('fn'),e=g('fe').toLowerCase(),p=g('fp'),pos=g('fpos'),dp=document.getElementById('fd');if(!n||!e||p.length<4)return er('Заповніть поля (пароль від 4 символів)');if(S.users.some(u=>u.email==e))return er('Такий email уже зареєстровано');if(pos=='asst'&&!dp)return er('Немає відділу для вибору');const u={id:uid(),name:n,email:e,pass:p,pos:pos,admin:!S.users.length};S.users.push(u);S.me=u.id;S.dept=S.page=null;draft={pos:'boss'};reg=false;if(pos=='asst'){const d=S.depts.find(x=>x.id==dp.value);d.members.push(u.id);S.dept=d.id;S.page=d.pages[0]&&d.pages[0].id}sv();if(pos=='boss')newDept()}
function doLoginL(){const u=S.users.find(x=>x.email==g('fe').toLowerCase()&&x.pass==g('fp'));if(!u)return er('Невірний email або пароль');S.me=u.id;S.dept=S.page=S.open=null;sv()}
const outL=()=>{S.me=S.dept=S.page=S.open=null;sv()};

/* ---------- модальні вікна й меню ---------- */
function ask(t,cb,x,val,btn){M=`<div class="ov"><div class="card"><h3>${t}</h3><input id="mi" placeholder="Назва" value="${esc(val||'')}" onkeydown="if(event.key=='Enter')mok()">${x||''}<div class="row"><button class="b" onclick="mok()">${btn||'Створити'}</button><button class="b2" onclick="M='';R()">Скасувати</button></div></div></div>`;mcb=cb;R()}
function mok(){const v=g('mi'),s=document.getElementById('ms');if(!v)return;const f=mcb;M='';f(v,s&&s.value)}
const info=m=>{M=`<div class="ov" onclick="M='';R()"><div class="card">${m}</div></div>`;R()};
const cfm=(t,f)=>{mcb=f;M=`<div class="ov"><div class="card"><h3>${t}</h3><div class="row"><button class="b" onclick="M='';mcb();">Так</button><button class="b2" onclick="M='';R()">Скасувати</button></div></div></div>`;R()};
/* menu(подія, ()=>[{i:'edit',t:'Текст',c:'s2',f:()=>{},keep:1}]) — випадаюче вікно опцій */
const menu=(ev,build)=>{const fresh=!MN;MN={x:ev.clientX,y:ev.clientY,build:build};if(fresh){MA=true;setTimeout(()=>{MA=false},300)}R()};
function mnh(){const it=MN.build(),x=Math.min(MN.x,innerWidth-170),y=Math.min(MN.y+8,innerHeight-130);return `<div class="mv" onclick="MN=null;R()"></div><div class="mn ${MA?'pop':''}" style="left:${x}px;top:${y}px">${it.map((o,i)=>`<div onclick="mnr(${i})">${o.i?`<img src="${IMG[o.i]}">`:''}${o.c?`<span class="pill ${o.c}">${esc(o.t)}</span>`:esc(o.t)}</div>`).join('')}</div>`}
const mnr=i=>{const o=MN.build()[i];if(!o.keep)MN=null;o.f();if(o.keep)R()};

/* ---------- каркас ---------- */
function app(){const d=D(),p=P(),u=me();return `<div class="lay">${SB?side(d,u):''}<main><div id="pres" class="pres">${presHtml()}</div>${S.err&&me()?`<div class="warn">${esc(S.err)}</div>`:''}${SB?'':`<button class="ib" onclick="SB=true;R()"><img src="${IMG.sidebar_btn}"></button>`}${d?head(d)+(p?body(d,p):'<p class="mu">Оберіть сторінку ліворуч</p>'):'<h1>Ласкаво просимо</h1><p class="mu">Оберіть відділ ліворуч або створіть новий.</p>'}</main>${S.open&&d&&tg(S.open)?panel(d):''}${MN?mnh():''}${M}</div>`}
function side(d,u){return `<aside><div class="tag"><span>Steel solution for solid business</span><img class="sbtn" src="${IMG.sidebar_btn}" onclick="SB=false;R()"></div><img class="lg" src="${IMG.logo}"><div class="usr"><span>${esc(u.name)}</span><small>${isA()?'Повний доступ':(u.pos=='asst'?'Помічник':'Начальник')}</small></div><nav>${vis().map(x=>`<div ondragover="dov(event)" ondrop="drS(event,'d','${x.id}')"><div class="dn" draggable="true" ondragstart="dgS(event,'d','${x.id}')" onclick="selD('${x.id}')">${esc(x.name)}</div>${x.id==S.dept?x.pages.map(q=>`<div class="pg ${q.id==S.page?'on':''}" draggable="true" ondragstart="dgS(event,'p','${q.id}')" ondragover="dov(event)" ondrop="drS(event,'p','${q.id}')" onclick="selP('${q.id}')"><span>• ${esc(q.name)}</span><img src="${IMG.dots_small}" onclick="event.stopPropagation();pgMenu(event,'${q.id}')"></div>`).join('')+'<div class="pg add" onclick="newPage()">+ Сторінка</div>':''}</div>`).join('')}</nav>${isBoss()?'<button class="cb" onclick="newDept()">+ Створити відділ</button>':''}<a class="lo" onclick="out()">Вийти</a></aside>`}
function head(d){return `<h1>${canMng(d)?`<input class="ti h1" value="${esc(d.name)}" onchange="D().name=this.value.trim()||D().name;sv()">`:esc(d.name)}</h1><div class="acc"><b>Доступ:</b>${canMng(d)?d.members.filter(m=>!S.users.find(u=>u.id==m).admin).map(m=>`<span class="c">${esc(un(m))}<i onclick="rm('${m}')">×</i></span>`).join('')+`<select onchange="am(this.value)"><option value="">+ співробітник</option>${S.users.filter(u=>!u.admin&&!d.members.includes(u.id)).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select>`:''}</div>`}
const am=u=>{if(u){D().members.push(u);sv()}},rm=u=>{const d=D();d.members=d.members.filter(x=>x!=u);sv()};
function body(d,p){const t=p.type=='tasks';return `<div class="pt"><input class="ti h2" value="${esc(p.name)}" onchange="P().name=this.value.trim()||P().name;sv()"><span class="ic">${t?`<button class="bn" onclick="FL.arch=!FL.arch;R()">${FL.arch?'← До задач':'Архів ('+d.tasks.filter(x=>x.arch).length+')'}</button><button class="bn" onclick="colMenu(event)">+ Додати стовпець</button><img src="${IMG.search}" onclick="FL.find=!FL.find;R()"><img src="${IMG.export}" onclick="expMenu(event)">`:''}<img class="dg" src="${IMG.dots_big}" onclick="pgMenu(event,'${p.id}')"></span></div>`+({timeline:tml,dash:dash,projects:prj,tasks:tbl,kanban:kan,chart:cht,table:ctab,canvas:cnv}[p.type])(d,p)}
const selD=i=>{S.dept=i;S.page=D().pages[0]&&D().pages[0].id;S.open=null;sv()},selP=i=>{S.page=i;S.open=null;sv()};
const newDept=()=>ask('Створіть свій відділ',v=>{const d={id:uid(),name:v,boss:S.me,members:[S.me],tasks:[],projects:[],cats:[],cols:defCols(),v3:1,pages:[{id:uid(),name:'Робочі задачі',type:'tasks'},{id:uid(),name:'Статус задач',type:'kanban'},{id:uid(),name:'Проєкти',type:'projects'},{id:uid(),name:'Таймлайн',type:'timeline'},{id:uid(),name:'Центр управління',type:'dash'}],v4:1};S.depts.push(d);S.dept=d.id;S.page=d.pages[0].id;sv()});
const newPage=()=>ask('Нова сторінка',(v,t)=>{const p={id:uid(),name:v,type:t,data:t=='table'?{cols:[{id:uid(),name:'Назва',type:'text'}],rows:[]}:t=='canvas'?{nodes:[],links:[]}:{}};D().pages.push(p);S.page=p.id;sv()},`<select id="ms">${Object.keys(TN).map(k=>`<option value="${k}">${TN[k]}</option>`).join('')}</select>`);
const pgMenu=(ev,id)=>menu(ev,()=>[{i:'edit',t:'Перейменувати',f:()=>ask('Назва сторінки',v=>{D().pages.find(p=>p.id==id).name=v;sv()},'',D().pages.find(p=>p.id==id).name,'Зберегти')},{i:'delete',t:'Видалити сторінку',f:()=>cfm('Видалити сторінку?',()=>{const d=D();d.pages=d.pages.filter(x=>x.id!=id);if(S.page==id)S.page=d.pages[0]&&d.pages[0].id;sv()})}]);

/* ---------- сторінка «Робочі задачі» ---------- */
function vrows(d){let L=d.tasks.filter(t=>(!PF||t.project==PF)&&(!FL.st||t.status==FL.st)&&(!FL.cat||t.cat==FL.cat)&&(FL.arch?t.arch:!t.arch)&&(!FL.sub||(FL.sub=='has'?t.subs.length>0:FL.sub=='none'?!t.subs.length:FL.sub=='open'?t.subs.some(s=>!s.done):t.subs.length>0&&t.subs.every(s=>s.done)))&&(!FL.sw||t.subs.some(s=>s.who.includes(FL.sw)))&&(!FL.who||t.who.includes(FL.who))&&(!FL.q||(t.title+' '+stage(t)+' '+t.subs.map(s=>s.t).join(' ')).toLowerCase().includes(FL.q.toLowerCase()))&&(!FL.only||SEL[t.id]));
  if(FL.sort){const f={title:t=>t.title,start:t=>t.start||'9',end:t=>t.end||'9',status:t=>ST.indexOf(t.status),who:t=>t.who.map(un).join()}[FL.sort];L=L.slice().sort((a,b)=>f(a)>f(b)?1:f(a)<f(b)?-1:0)}return L}
function tbl(d){d.cols=d.cols||defCols();const A=vrows(d),hid=ALLB.filter(k=>!d.cols.some(c=>c.key==k)),n=Object.keys(SEL).filter(k=>SEL[k]).length;
  const none=A.filter(t=>!d.projects.some(p=>p.id==t.project)),gs=d.projects.filter(p=>!PF||p.id==PF).map(p=>grp(d,p,A.filter(t=>t.project==p.id))).join('')+((!PF&&(none.length||!d.projects.length))?grp(d,null,none):'');
  const sk=(k,t)=>`<span class="sk ${FL.sort==k?'on':''}" onclick="FL.sort=FL.sort=='${k}'?'':'${k}';R()">${t}<img src="${IMG.dots_small}"></span>`;
  return `${FL.arch?'<div class="warn" style="background:rgba(23,55,94,.08);color:var(--navy);border-color:var(--ln)">Архів задач. Виконані задачі потрапляють сюди автоматично через місяць. Кнопка зі стрілкою в рядку повертає задачу назад.</div>':''}${FL.find?`<div class="fb"><input placeholder="Пошук за назвою задачі чи підзадачі" value="${esc(FL.q)}" onchange="FL.q=this.value;R()"><select onchange="PF=this.value;R()"><option value="">Усі проєкти</option>${d.projects.map(p=>`<option value="${p.id}" ${p.id==PF?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select onchange="FL.st=this.value;R()"><option value="">Усі статуси</option>${ST.map(s=>`<option ${FL.st==s?'selected':''}>${s}</option>`).join('')}</select><select onchange="FL.who=this.value;R()"><option value="">Усі виконавці</option>${S.users.map(u=>`<option value="${u.id}" ${FL.who==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select><select onchange="FL.sub=this.value;R()">${[['','Підзадачі: усі'],['has','Є підзадачі'],['none','Без підзадач'],['open','Є невиконані підзадачі'],['done','Усі підзадачі виконані']].map(o=>`<option value="${o[0]}" ${FL.sub==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><select onchange="FL.sw=this.value;R()"><option value="">Підзадачі: усі виконавці</option>${S.users.map(u=>`<option value="${u.id}" ${FL.sw==u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`:''}<div class="sr"><span>Сортувати за:</span>${sk('status','Статус')}${sk('end','Дата кінця')}${sk('who','Відповідальний')}<img class="dg" src="${IMG.dots_big}" onclick="sortMenu(event)"></div>${catRow(d)}${gs}<div class="bt"><input id="pn2" placeholder="Назва проєкту"><button class="bn" onclick="addP('pn2')">+ Проєкт</button></div>`}
function grp(d,pj,L){const key=pj?pj.id:'_',cl=pj?pj.closed:d.closedNone;
  return `<div><div class="gh"><img class="tri ${cl?'cl':''}" src="${IMG.triangle}" onclick="tglG('${key}')">${pj&&pj.avatar?`<img class="pav" src="${pj.avatar}">`:''}<span class="gp">${pj?`<input class="gi" value="${esc(pj.name)}" size="${Math.max(6,pj.name.length)}" onchange="renP('${pj.id}',this.value)">`:'Без проєкту'}</span>${pj&&pj.qty?`<span class="mu">К-сть: ${esc(pj.qty)}</span>`:''}<img class="dg" src="${IMG.dots_big}" onclick="grpMenu(event,'${key}')"></div>${cl?'':`<table class="t"><thead><tr>${FL.pick?'<th class="pk"></th>':''}${d.cols.map((c,i)=>`<th><input class="hi" value="${esc(c.name)}" onchange="cr(${i},this.value)"><span class="hc"><i onclick="cm(${i},-1)">◀</i><i onclick="cm(${i},1)">▶</i>${c.key=='title'?'':`<i onclick="cdel(${i})">✕</i>`}${c.type!='b'?`<select onchange="D().cols[${i}].type=this.value;sv()">${CT.map(o=>`<option value="${o[0]}" ${c.type==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`:''}</span></th>`).join('')}<th class="ac"></th></tr></thead><tbody>${L.map(t=>`<tr class="${SEL[t.id]?'sl':''} ${PULSE==t.id?'pulse':''}">${FL.pick?`<td class="pk"><input type="checkbox" ${SEL[t.id]?'checked':''} onchange="SEL['${t.id}']=this.checked;R()"></td>`:''}${d.cols.map(c=>`<td class="c-${c.key}">${cell(t,c)}</td>`).join('')}<td class="ac"><img src="${IMG.edit}" title="Відкрити" onclick="op('${t.id}')">${t.arch?`<span title="Повернути з архіву" onclick="arch('${t.id}',false)">${UN_SVG}</span>`:`<span title="В архів" onclick="arch('${t.id}',true)">${AR_SVG}</span>`}<img src="${IMG.delete}" title="Видалити" onclick="delT('${t.id}')"></td></tr>`).join('')}</tbody></table>${FL.arch?'':`<div class="ad" onclick="addT('${pj?pj.id:''}')">+ Нова задача</div>`}`}</div>`}
function cell(t,c){if(c.type=='b'){const k=c.key;
    return k=='title'?`<a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)||'Без назви'}</a>`:k=='status'?`<button class="pill ${SC[ST.indexOf(t.status)]}" onclick="stMenu(event,'${t.id}')">${esc(t.status)}</button>`:k=='stage'?esc(stage(t)):(k=='start'||k=='end')?`<input type="date" value="${t[k]||''}" onchange="up('${t.id}','${k}',this.value)">`:k=='who'?`<span class="wh" onclick="whoMenu(event,'${t.id}')">${t.who.map(un).map(esc).join(', ')||'—'}</span>`:k=='project'?psel(t):k=='cat'?`<button class="pill s0" onclick="catPick(event,'${t.id}')">${esc(catN(t))||'—'}</button>`:bar(prog(t))}
  if(c.type=='func')return `<b>${fsum(t,c)}</b>`;const v=(t.c||{})[c.id];return `<input type="${c.type=='text'?'text':c.type=='percent'?'number':c.type}" value="${esc(v)}" onchange="tc('${t.id}','${c.id}',this.value)">${c.type=='percent'?bar(Math.min(100,+v||0)):''}`}
const fsum=(t,c)=>{const cs=D().cols,i=cs.findIndex(x=>x.id==c.id);return cs.slice(0,i).filter(x=>x.type=='number'||x.type=='percent').reduce((a,x)=>a+(+((t.c||{})[x.id])||0),0)};
const stMenu=(ev,t)=>menu(ev,()=>ST.map((s,i)=>({t:s,c:SC[i],f:()=>up(t,'status',s)})));
const whoMenu=(ev,t)=>menu(ev,()=>S.users.map(u=>({t:(tg(t).who.includes(u.id)?'✓ ':'')+u.name,keep:1,f:()=>{const o=tg(t);const had=o.who.includes(u.id);o.who=had?o.who.filter(x=>x!=u.id):o.who.concat(u.id);if(!had)assignNotify(t,u.id);wr()}})));
const expMenu=ev=>menu(ev,()=>[{i:'export',t:'Задачі: Excel',f:()=>exportT('xlsx')},{i:'export',t:'Задачі: PDF (друк)',f:()=>exportT('pdf')},{i:'export',t:'Задачі: Word',f:()=>exportT('doc')},{i:'export',t:'Підзадачі: Excel',f:()=>exportS('xlsx')},{i:'export',t:'Підзадачі: PDF (друк)',f:()=>exportS('pdf')},{i:'export',t:'Підзадачі: Word',f:()=>exportS('doc')},{i:'export',t:'Excel: зроблено сьогодні',f:()=>exportX()}]);
const sortMenu=ev=>menu(ev,()=>[{t:FL.pick?'Сховати вибір рядків':'Вибрати рядки для вигрузки',f:()=>{FL.pick=!FL.pick;R()}},{t:FL.only?'Показати всі рядки':'Лише відмічені',f:()=>{FL.only=!FL.only;if(FL.only)FL.pick=true;R()}},{t:'Архівувати відмічені',f:archSel},{t:'Архівувати всі виконані',f:archDone},{t:'Скинути фільтри',f:()=>{FL={q:'',st:'',who:'',cat:'',sub:'',sw:'',arch:false,sort:'',only:false,pick:false,find:false};SEL={};PF='';R()}}]);
const grpMenu=(ev,k)=>menu(ev,()=>[{t:'Додати задачу',f:()=>addT(k=='_'?'':k)}].concat(k=='_'?[]:[{i:'delete',t:'Видалити проєкт',f:()=>cfm('Видалити проєкт? Задачі залишаться без проєкту.',()=>delPj(k))}]));
const tglG=k=>{const d=D();if(k=='_')d.closedNone=!d.closedNone;else{const p=d.projects.find(x=>x.id==k);p.closed=!p.closed}sv()},renP=(i,v)=>{D().projects.find(p=>p.id==i).name=v.trim()||'Проєкт';sv()};
const psel=t=>`<select onchange="up('${t.id}','project',this.value)"><option value="">Без проєкту</option>${D().projects.map(p=>`<option value="${p.id}" ${p.id==t.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`;
const up=(t,f,v)=>{tg(t)[f]=v;if(f=='status'){tg(t).auto=false;dn(tg(t))}sv()},tc=(t,c,v)=>{const o=tg(t);o.c=o.c||{};o.c[c]=v;sv()},cr=(i,v)=>{D().cols[i].name=v;sv()},cdel=i=>{const d=D();d.hid=d.hid||[];d.hid.push(d.cols.splice(i,1)[0]);sv()};
const cm=(i,x)=>{const c=D().cols,j=i+x;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];sv()};
function addT(pj){const t={id:uid(),title:'Нова задача',status:ST[0],start:'',end:'',who:[],subs:[],project:pj===undefined?PF:pj,cat:'',ts:Date.now(),doneAt:''};D().tasks.push(t);PA=true;setTimeout(()=>{PA=false},500);S.open=t.id;sv()}
const delT=t=>cfm('Видалити задачу?',()=>{const d=D();d.tasks=d.tasks.filter(x=>x.id!=t);if(S.open==t)S.open=null;sv()}),op=t=>{if(S.open!=t){PA=true;setTimeout(()=>{PA=false},500)}S.open=t;R()};
const addP=i=>{const v=g(i);if(!v)return;D().projects.push({id:uid(),name:v,desc:'',qty:'',avatar:'',files:[],ts:Date.now()});sv()},delPj=i=>{const d=D();d.projects=d.projects.filter(p=>p.id!=i);d.tasks.forEach(t=>{if(t.project==i)t.project=''});sv()};

/* ---------- вигрузка ---------- */
function tv(t,c){if(c.type=='b'){return {title:t.title,status:t.status,stage:stage(t),start:t.start,end:t.end,who:t.who.map(un).join(', '),project:pn(t),prog:prog(t)+'%',cat:catN(t)}[c.key]}if(c.type=='func')return fsum(t,c);const v=(t.c||{})[c.id];return v==null||v===''?'':c.type=='percent'?v+'%':c.type=='number'?+v:v}
function exportT(f){const d=D(),L=vrows(d);if(!L.length)return info('Немає рядків для вигрузки');outTable(f,d.cols.map(c=>c.name),L.map(t=>d.cols.map(c=>tv(t,c))),'Задачі_'+d.name+'_'+today(),'Задачі','ЦКС · '+d.name+' · Задачі · '+today())}
/* Підзадачі: враховуються ті самі фільтри, що й для задач (та фільтри підзадач), і відмічені рядки */
const subOk=s=>(!FL.sw||s.who.includes(FL.sw))&&(FL.sub!='open'||!s.done)&&(FL.sub!='done'||s.done);
function exportS(f){const d=D(),rows=[];vrows(d).forEach(t=>t.subs.forEach(s=>{if(subOk(s))rows.push([t.title,pn(t),catN(t),s.t,s.done?'Виконано':'Не виконано',(s.who.length?s.who:t.who).map(un).join(', '),s.doneAt||''])}));
  if(!rows.length)return info('Немає підзадач для вигрузки');outTable(f,['Задача','Проєкт','Категорія','Підзадача','Статус','Відповідальні','Дата виконання'],rows,'Підзадачі_'+d.name+'_'+today(),'Підзадачі','ЦКС · '+d.name+' · Підзадачі · '+today())}
function outTable(f,H,B,nm,sheet,title){
  if(f=='xlsx'){if(!window.XLSX)return info('Бібліотека Excel не завантажилась (потрібен інтернет). Виберіть Word або PDF.');const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([H].concat(B));ws['!cols']=H.map(()=>({wch:22}));XLSX.utils.book_append_sheet(wb,ws,sheet);XLSX.writeFile(wb,nm+'.xlsx');return}
  const h='<html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#17375E}table{border-collapse:collapse;width:100%}th{background:#17375E;color:#F1E5CD;text-align:left}td,th{border:1px solid #999;padding:5px;font-size:12px}</style></head><body><h2>'+esc(title)+'</h2><table><tr>'+H.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr>'+B.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table></body></html>';
  if(f=='doc'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+h],{type:'application/msword'}));a.download=nm+'.doc';a.click();return}
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(fr);fr.contentDocument.write(h);fr.contentDocument.close();setTimeout(()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),3000)},300)}
function exportX(){const d=D(),t0=today(),rows=[['Тип','Задача','Проєкт','Статус','Відповідальні','Відділ','Дата']];d.tasks.forEach(t=>{if(t.doneAt==t0)rows.push(['Задача',t.title,pn(t),t.status,t.who.map(un).join(', '),d.name,t0]);t.subs.forEach(s=>{if(s.doneAt==t0)rows.push(['Підзадача',s.t+' ('+t.title+')',pn(t),ST[3],(s.who.length?s.who:t.who).map(un).join(', '),d.name,t0])})});
  if(rows.length<2)return info('Сьогодні виконаних задач поки немає.');const fn='Зроблено_'+t0+'_'+d.name+'.xlsx';
  if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:11},{wch:40},{wch:20},{wch:14},{wch:28},{wch:18},{wch:12}];XLSX.utils.book_append_sheet(wb,ws,'Зроблено сьогодні');XLSX.writeFile(wb,fn)}
  else{const h='<meta charset="utf-8"><table>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>',a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'application/vnd.ms-excel'}));a.download=fn.replace('.xlsx','.xls');a.click()}}

/* ---------- бокове вікно задачі ---------- */
const stSel=t=>`<select onchange="up('${t.id}','status',this.value)">${ST.map(s=>`<option ${s==t.status?'selected':''}>${s}</option>`).join('')}</select>`;
function chips(arr,t,s){return `<div class="ch">${arr.map(u=>`<span class="c">${esc(un(u))}<i onclick="rw('${t}','${s}','${u}')">×</i></span>`).join('')}<select onchange="aw('${t}','${s}',this.value)"><option value="">+</option>${S.users.filter(u=>!arr.includes(u.id)).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>`}
const tgt=(t,s)=>s?tg(t).subs.find(x=>x.id==s):tg(t),aw=(t,s,u)=>{if(u){tgt(t,s).who.push(u);assignNotify(t,u);sv()}},rw=(t,s,u)=>{const o=tgt(t,s);o.who=o.who.filter(x=>x!=u);sv()};
function panel(d){const t=tg(S.open),done=t.subs.filter(s=>s.done),cr={};done.forEach(s=>{const w=s.who.length?s.who:t.who;w.forEach(u=>cr[u]=(cr[u]||0)+1/w.length)});const tot=Object.values(cr).reduce((a,b)=>a+b,0);
return `<div class="pn ${PA?'in':''}"><div class="row"><b style="flex:1;color:var(--navy);text-transform:uppercase">Задача</b><button class="x" onclick="arch('${t.id}',${!t.arch})">${t.arch?'↩ З архіву':'В архів'}</button><button class="x" onclick="S.open=null;R()">✕ закрити</button></div><input class="tl" value="${esc(t.title)}" onchange="up('${t.id}','title',this.value)">${stSel(t)}${psel(t)}${csel(t)}<div class="row"><input type="date" value="${t.start}" onchange="up('${t.id}','start',this.value)"><input type="date" value="${t.end}" onchange="up('${t.id}','end',this.value)"></div>${chips(t.who,t.id,'')}<div>Виконано: <b>${done.length} з ${t.subs.length}</b> · Загальний прогрес <b>${prog(t)}%</b>${bar(prog(t))}</div><div class="mu">Етап виконання: <b>${esc(stage(t))}</b></div><h4>Підзадачі</h4>${t.subs.map(s=>`<div class="sbt"><input type="checkbox" ${s.done?'checked':''} onchange="tog('${t.id}','${s.id}')"><input class="f ${s.done?'dn2':''}" value="${esc(s.t)}" onchange="tgt('${t.id}','${s.id}').t=this.value;sv()">${chips(s.who,t.id,s.id)}<button class="x" onclick="ds('${t.id}','${s.id}')">✕</button></div>`).join('')}<div class="row"><input id="ns" style="flex:1" placeholder="Нова підзадача" onkeydown="if(event.key=='Enter')as('${t.id}')"><button class="b" onclick="as('${t.id}')">+</button></div><h4>Вкладення</h4>${atts(t)}<h4>Внесок виконавців</h4>${tot?Object.keys(cr).map(u=>`<div>${esc(un(u))} — ${Math.round(100*cr[u]/tot)}%${bar(Math.round(100*cr[u]/tot))}</div>`).join(''):'<div class="mu">З’явиться після виконання підзадач</div>'}</div>`}
/* Усі підзадачі виконано → задача автоматично «Виконано» (крім «Постійна задача») */
const autoSt=t=>{if(!t.subs.length||t.status==ST[1])return;const all=t.subs.every(s=>s.done);if(all&&t.status!=ST[3]){t.status=ST[3];t.auto=true;dn(t)}else if(!all&&t.status==ST[3]&&t.auto){t.status=ST[2];t.auto=false;dn(t)}};
const tog=(t,s)=>{const o=tgt(t,s);o.done=!o.done;o.doneAt=o.done?today():'';autoSt(tg(t));sv()},ds=(t,s)=>{const o=tg(t);o.subs=o.subs.filter(x=>x.id!=s);autoSt(o);sv()},as=t=>{const v=g('ns');if(!v)return;const o=tg(t);o.subs.push({id:uid(),t:v,done:false,who:[]});autoSt(o);sv()};
function atts(t){t.att=t.att||[];return `<div>${t.att.map(a=>`<div class="sbt">${a.k=='link'?`<a href="${esc(a.u)}" target="_blank" rel="noopener">🔗 ${esc(a.n)}</a>`:a.img?`<a href="${a.u}" download="${esc(a.n)}"><img src="${a.u}" style="max-height:80px;max-width:140px;border-radius:4px"></a>`:`<a href="${a.u}" download="${esc(a.n)}">📎 ${esc(a.n)}</a>`}<button class="x" onclick="da('${t.id}','${a.id}')">✕</button></div>`).join('')||'<div class="mu">Вкладень немає</div>'}<div class="row" style="margin-top:6px"><input id="lk1" placeholder="https://посилання" style="flex:1"><button class="b2" onclick="addL('${t.id}')">+ Посилання</button></div><input type="file" multiple onchange="addF('${t.id}',this.files)"><div class="mu">${CLOUD?'Файли зберігаються в хмарі (до 10 МБ на файл).':'Файли й картинки зберігаються в браузері (до ~1 МБ на файл).'}</div></div>`}
const da=(t,a)=>{const o=tg(t);o.att=o.att.filter(x=>x.id!=a);sv()},addL=t=>{let u=g('lk1');if(!u)return;if(!/^https?:\/\//i.test(u))u='https://'+u;const o=tg(t);o.att=o.att||[];o.att.push({id:uid(),k:'link',n:u.replace(/^https?:\/\//i,'').slice(0,50),u:u});sv()};
async function addF(tid,fs){const t=tg(tid);t.att=t.att||[];for(const f of [...fs]){try{const a=await fileToAtt(f,D().id);t.att.push(a);if(!wr()){t.att.pop();info('Пам’ять браузера заповнена, файл не додано');return}}catch(e){info(esc(e.message||'Не вдалося додати файл'));return}}R()}

/* ---------- Kanban («Статус задач») ---------- */
function kan(d){return `<div class="kb">${ST.map((s,i)=>`<div class="kc" ondragover="event.preventDefault()" ondrop="drp(event,'${i}')"><h4>${s} · ${d.tasks.filter(t=>!t.arch&&t.status==s).length}</h4>${d.tasks.filter(t=>!t.arch&&t.status==s).map(t=>`<div class="cd" draggable="true" ondragstart="event.dataTransfer.setData('text',this.dataset.i)" data-i="${t.id}" data-hv="${t.id}" onclick="op('${t.id}')"><b>${esc(t.title)}</b>${t.cat?`<span class="pill s0" style="align-self:flex-start">${esc(catN(t))}</span>`:''}<span class="mu">${esc(pn(t))}</span><span class="mu">${esc(stage(t))}</span><span class="mu">${t.who.map(un).map(esc).join(', ')}</span>${bar(prog(t))}</div>`).join('')}</div>`).join('')}</div>`}
const drp=(e,i)=>{e.preventDefault();const t=tg(e.dataTransfer.getData('text'));if(t){t.status=ST[+i];t.auto=false;dn(t);sv()}};

/* ---------- Проєкти ---------- */
function prj(d){return `<div class="row"><input id="pnm" placeholder="Назва проєкту (об’єкта)"><button class="b" onclick="addP('pnm')">+ Проєкт</button><button class="b2" onclick="exportX()">Excel: зроблено сьогодні</button></div>${d.projects.map(p=>{const TA=d.tasks.filter(t=>t.project==p.id),T=TA.filter(t=>!t.arch),v=TA.length?Math.round(100*TA.filter(t=>t.status==ST[3]).length/TA.length):0;p.files=p.files||[];return `<div class="pjc"><div class="pjh"><div class="av" title="Змінити фото об’єкта" onclick="document.getElementById('av_${p.id}').click()">${p.avatar?`<img src="${p.avatar}">`:'<span>+ фото</span>'}</div><input type="file" accept="image/*" id="av_${p.id}" style="display:none" onchange="setAv('${p.id}',this.files[0])"><div class="pjm"><div class="row"><input class="ti" style="flex:1;font-size:15px" value="${esc(p.name)}" onchange="renP('${p.id}',this.value)"><button class="x" title="Видалити проєкт" onclick="cfm('Видалити проєкт?',()=>delPj('${p.id}'))">✕</button></div><textarea class="pd" placeholder="Опис об’єкта" onchange="setPj('${p.id}','desc',this.value)">${esc(p.desc)}</textarea><div class="row"><label class="mu">Кількість <input type="number" style="width:90px" value="${esc(p.qty)}" onchange="setPj('${p.id}','qty',this.value)"></label><span class="mu">${T.length} задач · виконано ${v}%</span></div>${bar(v)}</div></div><h4 class="ph">Файли</h4>${p.files.map(a=>`<div class="sbt">${a.img?`<a href="${a.u}" target="_blank" rel="noopener"><img src="${a.u}" style="max-height:60px;border-radius:4px"></a>`:`<a href="${a.u}" target="_blank" rel="noopener" download="${esc(a.n)}">📎 ${esc(a.n)}</a>`}<span class="mu">${esc(a.n)}</span><button class="x" onclick="delPF('${p.id}','${a.id}')">✕</button></div>`).join('')||'<div class="mu">Файлів немає</div>'}<input type="file" multiple onchange="addPF('${p.id}',this.files)"><h4 class="ph">Задачі</h4>${T.map(t=>`<div class="sbt"><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a><span class="pill ${SC[ST.indexOf(t.status)]}">${esc(t.status)}</span><span class="mu">${esc(stage(t))}</span></div>`).join('')}<button class="b2" style="margin-top:8px" onclick="addT('${p.id}')">+ Задача в проєкт</button></div>`}).join('')||'<p class="mu">Проєктів поки немає — створіть перший.</p>'}`}

/* ---------- Графік ---------- */
function cht(d){const n=ST.map(s=>d.tasks.filter(t=>!t.arch&&t.status==s).length),m=Math.max(1,...n);return `<h4>Задачі за статусами</h4>${ST.map((s,i)=>`<div class="hb"><span>${s}</span><div class="bar"><b style="width:${100*n[i]/m}%"></b></div><b>${n[i]}</b></div>`).join('')}<h4>Прогрес задач</h4>${d.tasks.filter(t=>!t.arch).map(t=>`<div class="hb"><span>${esc(t.title)}</span>${bar(prog(t))}<b>${prog(t)}%</b></div>`).join('')||'<p class="mu">Немає задач</p>'}`}

/* ---------- Власна таблиця ---------- */
function ctab(d,p){const c=p.data.cols,fn=(r,i)=>c.slice(0,i).filter(x=>x.type=='number'||x.type=='percent').reduce((a,x)=>a+(+r.c[x.id]||0),0);
return `<table class="t"><thead><tr>${c.map((x,i)=>`<th><input class="hi" value="${esc(x.name)}" onchange="P().data.cols[${i}].name=this.value;sv()"><span class="hc"><i onclick="mc(${i},-1)">◀</i><i onclick="mc(${i},1)">▶</i><i onclick="P().data.cols.splice(${i},1);sv()">✕</i><select onchange="P().data.cols[${i}].type=this.value;sv()">${[['text','Текст'],['number','Число'],['percent','Відсоток'],['func','Функція (сума зліва)']].map(o=>`<option value="${o[0]}" ${x.type==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></span></th>`).join('')}<th class="ac"></th></tr></thead><tbody>${p.data.rows.map((r,ri)=>`<tr>${c.map((x,i)=>`<td>${x.type=='func'?`<b>${fn(r,i)}</b>`:`<input type="${x.type=='text'?'text':'number'}" value="${esc(r.c[x.id])}" onchange="P().data.rows[${ri}].c['${x.id}']=this.value;sv()">${x.type=='percent'?bar(Math.min(100,+r.c[x.id]||0)):''}`}</td>`).join('')}<td class="ac"><img src="${IMG.delete}" onclick="P().data.rows.splice(${ri},1);sv()"></td></tr>`).join('')}</tbody></table><div class="bt"><button class="b" onclick="P().data.rows.push({c:{}});sv()">+ Рядок</button><input id="cn" placeholder="Назва нового стовпця"><select id="ct"><option value="text">Текст</option><option value="number">Число</option><option value="percent">Відсоток</option><option value="func">Функція</option></select><button class="bn" onclick="addC()">+ Стовпець</button></div>`}
const mc=(i,d)=>{const c=P().data.cols,j=i+d;if(j<0||j>=c.length)return;[c[i],c[j]]=[c[j],c[i]];sv()},addC=()=>{P().data.cols.push({id:uid(),name:g('cn')||'Стовпець',type:document.getElementById('ct').value});sv()};

/* ---------- Вільне полотно ---------- */
function cnv(d,p){const n=p.data.nodes,ct=x=>[x.x+80,x.y+35];return `<div class="row"><button class="b" onclick="P().data.nodes.push({id:uid(),x:20+P().data.nodes.length*20,y:20+P().data.nodes.length*20,t:''});sv()">+ Блок</button><span class="mu">Зв’язок: натисніть ⇢ на одному блоці, потім на іншому.</span></div><div class="cv"><svg>${p.data.links.map(l=>{const a=n.find(x=>x.id==l[0]),b=n.find(x=>x.id==l[1]);if(!a||!b)return'';const[p1,p2]=[ct(a),ct(b)];return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#17375E" stroke-opacity=".6" stroke-width="2"/>`}).join('')}</svg>${n.map((x,i)=>`<div class="nd" style="left:${x.x}px;top:${x.y}px"><div onpointerdown="nd(event,${i})"><span onclick="lk('${x.id}')" style="cursor:pointer">${from==x.id?'●':'⇢'}</span><span onclick="P().data.nodes.splice(${i},1);P().data.links=P().data.links.filter(l=>l[0]!='${x.id}'&&l[1]!='${x.id}');sv()" style="cursor:pointer">✕</span></div><textarea onchange="P().data.nodes[${i}].t=this.value;wr()">${esc(x.t)}</textarea></div>`).join('')}</div><div class="row mu">${p.data.links.map((l,i)=>`<a onclick="P().data.links.splice(${i},1);sv()">✕ ${esc((n.find(x=>x.id==l[0])||{}).t||'блок')} → ${esc((n.find(x=>x.id==l[1])||{}).t||'блок')}</a>`).join('')}</div>`}
const lk=i=>{if(!from)from=i;else{if(from!=i)P().data.links.push([from,i]);from=null}sv()};
function nd(ev,i){const n=P().data.nodes[i],sx=ev.clientX-n.x,sy=ev.clientY-n.y,el=ev.currentTarget.parentNode;if(ev.target.tagName=='SPAN')return;const mv=e=>{n.x=Math.max(0,e.clientX-sx);n.y=Math.max(0,e.clientY-sy);el.style.left=n.x+'px';el.style.top=n.y+'px'},u=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',u);sv()};addEventListener('pointermove',mv);addEventListener('pointerup',u)}

/* =====================================================================
   НОВІ МОЖЛИВОСТІ
   ===================================================================== */

/* ---------- Перетягування в боковій панелі (сторінки та відділи) ---------- */
const dov=e=>e.preventDefault();
const dgS=(e,k,id)=>{e.dataTransfer.setData('text',k+':'+id);e.dataTransfer.effectAllowed='move'};
function drS(e,k,id){const a=(e.dataTransfer.getData('text')||'').split(':');if(a[0]!=k)return;e.preventDefault();e.stopPropagation();const sid=a[1];if(sid==id)return;
  if(k=='p'){const L=D().pages,i=L.findIndex(p=>p.id==sid),j=L.findIndex(p=>p.id==id);if(i<0||j<0)return;L.splice(j,0,L.splice(i,1)[0])}
  else{const o=vis().map(x=>x.id),i=o.indexOf(sid),j=o.indexOf(id);if(i<0||j<0)return;o.splice(j,0,o.splice(i,1)[0]);S.deptOrder=o}
  sv()}

/* ---------- Файли та картинки (локально — у браузері, в хмарі — Supabase Storage) ---------- */
function loadImg(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('Не вдалося прочитати зображення'));im.src=r.result};r.onerror=()=>no(new Error('Не вдалося прочитати файл'));r.readAsDataURL(f)})}
async function fileToAtt(f,dept,o){o=o||{};const isI=f.type.indexOf('image/')==0;if(o.imgOnly&&!isI)throw new Error('Потрібне зображення (png, jpg)');
  let blob=f,url=null;
  if(isI){const im=await loadImg(f),sc=Math.min(1,(o.max||1000)/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    if(CLOUD)blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.82));else url=c.toDataURL('image/jpeg',0.8)}
  else if(!CLOUD&&f.size>1e6)throw new Error('Файл «'+f.name+'» більший за 1 МБ');
  else if(CLOUD&&f.size>1e7)throw new Error('Файл «'+f.name+'» більший за 10 МБ');
  if(!CLOUD&&!url)url=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
  if(CLOUD){const ext=isI?'jpg':((f.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').slice(0,8)||'bin'),path=dept+'/'+uid()+uid()+'.'+ext,r=await DB.storage.from('files').upload(path,blob,{contentType:isI?'image/jpeg':(f.type||'application/octet-stream')});if(r.error)throw r.error;url=DB.storage.from('files').getPublicUrl(path).data.publicUrl}
  return {id:uid(),k:'file',n:f.name,u:url,img:isI}}

/* ---------- Проєкти: опис, кількість, фото-аватар, файли ---------- */
const pj1=i=>D().projects.find(p=>p.id==i);
const setPj=(i,f,v)=>{pj1(i)[f]=v;sv()};
async function setAv(i,f){if(!f)return;try{const a=await fileToAtt(f,D().id,{imgOnly:true,max:400});pj1(i).avatar=a.u;if(!wr()){info('Пам’ять браузера заповнена');return}R()}catch(e){info(esc(e.message||'Помилка'))}}
async function addPF(i,fs){const p=pj1(i);p.files=p.files||[];for(const f of [...fs]){try{const a=await fileToAtt(f,D().id);p.files.push(a);if(!wr()){p.files.pop();info('Пам’ять браузера заповнена, файл не додано');return}}catch(e){info(esc(e.message||'Помилка'));return}}R()}
const delPF=(i,a)=>{const p=pj1(i);p.files=p.files.filter(x=>x.id!=a);sv()};

/* ---------- Категорії задач ---------- */
const catN=t=>{const c=(D().cats||[]).find(x=>x.id==t.cat);return c?c.name:''};
const csel=t=>`<select onchange="if(this.value=='__new'){newCat('${t.id}')}else up('${t.id}','cat',this.value)"><option value="">Без категорії</option>${(D().cats||[]).map(c=>`<option value="${c.id}" ${c.id==t.cat?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__new">+ Нова категорія…</option></select>`;
const catRow=d=>`<div class="cats"><span class="mu">Категорії:</span><span class="cp ${!FL.cat?'on':''}" onclick="FL.cat='';R()">Усі</span>${(d.cats||[]).map(c=>`<span class="cp ${FL.cat==c.id?'on':''}" onclick="FL.cat=FL.cat=='${c.id}'?'':'${c.id}';R()">${esc(c.name)}<img src="${IMG.dots_small}" onclick="event.stopPropagation();catMenu(event,'${c.id}')"></span>`).join('')}<span class="cp add" onclick="newCat()">+ Категорія</span></div>`;
const newCat=tid=>ask('Нова категорія',v=>{const c={id:uid(),name:v};D().cats=D().cats||[];D().cats.push(c);if(tid)tg(tid).cat=c.id;sv()});
const catPick=(ev,t)=>menu(ev,()=>[{t:'Без категорії',f:()=>up(t,'cat','')}].concat((D().cats||[]).map(c=>({t:c.name,f:()=>up(t,'cat',c.id)}))).concat([{t:'+ Нова категорія',f:()=>newCat(t)}]));
const catMenu=(ev,id)=>menu(ev,()=>[{i:'edit',t:'Перейменувати',f:()=>ask('Назва категорії',v=>{D().cats.find(c=>c.id==id).name=v;sv()},'',D().cats.find(c=>c.id==id).name,'Зберегти')},{i:'delete',t:'Видалити категорію',f:()=>cfm('Видалити категорію? Задачі залишаться без категорії.',()=>{const d=D();d.cats=d.cats.filter(c=>c.id!=id);d.tasks.forEach(t=>{if(t.cat==id)t.cat=''});if(FL.cat==id)FL.cat='';sv()})}]);

/* ---------- Коротка інформація про задачу при наведенні ---------- */
let HVT=null,HVC=null,HVS=null;
const hvEl=()=>{let e=document.getElementById('hv');if(!e){e=document.createElement('div');e.id='hv';e.className='hv';document.body.appendChild(e);e.addEventListener('mouseenter',()=>clearTimeout(HVC));e.addEventListener('mouseleave',hvHide)}return e};
const hvClose=()=>{HVT=null;hvEl().style.display='none'},hvHide=()=>{clearTimeout(HVC);HVC=setTimeout(hvClose,300)};
function hvFill(){const e=hvEl(),d=D(),t=d&&d.tasks.find(x=>x.id==HVT);if(!t){hvClose();return}const done=t.subs.filter(s=>s.done).length;
  e.innerHTML=`<div class="row"><b style="flex:1;color:var(--navy)">${esc(t.title)}</b><span class="pill ${SC[ST.indexOf(t.status)]}">${esc(t.status)}</span></div>${bar(prog(t))}<div class="mu" style="margin:4px 0 6px">Підзадачі: ${done} з ${t.subs.length}${catN(t)?' · '+esc(catN(t)):''}</div>${t.subs.length?t.subs.map(s=>`<label class="hs"><input type="checkbox" ${s.done?'checked':''} onchange="hvTog('${t.id}','${s.id}')"><span class="${s.done?'dn2':''}">${esc(s.t)}</span><small class="mu">${s.who.map(un).map(esc).join(', ')}</small></label>`).join(''):'<div class="mu">Підзадач немає</div>'}<a class="hl" onclick="op('${t.id}');hvClose()">Відкрити задачу →</a>`}
function hvOpen(a){HVT=a.dataset.hv;const e=hvEl();hvFill();if(!HVT)return;e.style.display='block';const r=a.getBoundingClientRect();e.style.left=Math.max(8,Math.min(r.left,innerWidth-e.offsetWidth-8))+'px';let y=r.bottom+4;if(y+e.offsetHeight>innerHeight-8)y=Math.max(8,r.top-e.offsetHeight-4);e.style.top=y+'px'}
const hvTog=(t,s)=>{tog(t,s);hvFill()};
document.addEventListener('mouseover',e=>{const a=e.target.closest&&e.target.closest('[data-hv]');if(!a)return;clearTimeout(HVC);clearTimeout(HVS);if(HVT==a.dataset.hv&&hvEl().style.display=='block')return;HVS=setTimeout(()=>hvOpen(a),200)});
document.addEventListener('mouseout',e=>{const a=e.target.closest&&e.target.closest('[data-hv]');if(a){clearTimeout(HVS);hvHide()}});


/* ---------- Архів задач ---------- */
const AR_SVG='<svg class="ai" viewBox="0 0 24 24" fill="none" stroke="#17375E" stroke-width="2"><rect x="3" y="4" width="18" height="4"/><path d="M5 8v12h14V8M10 12h4"/></svg>',UN_SVG='<svg class="ai" viewBox="0 0 24 24" fill="none" stroke="#17375E" stroke-width="2"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/></svg>';
const arch=(t,v)=>{const o=tg(t);o.arch=v;o.archAt=v?today():'';if(!v&&o.status==ST[3])o.doneAt=today();if(v&&S.open==t)S.open=null;sv()};
const archSel=()=>{const d=D();let n=0;d.tasks.forEach(t=>{if(SEL[t.id]&&!t.arch){t.arch=true;t.archAt=today();n++}});SEL={};if(!n)info('Спершу відмітьте рядки: меню ··· → «Вибрати рядки для вигрузки».');else sv()};
const archDone=()=>{const L=D().tasks.filter(t=>t.status==ST[3]&&!t.arch);if(!L.length)return info('Немає виконаних задач для архівації.');cfm('Архівувати виконані задачі ('+L.length+')?',()=>{L.forEach(t=>{t.arch=true;t.archAt=today()});sv()})};

/* Автоархів: виконана задача через місяць після виконання сама йде в архів.
   Задачі «Виконано» без дати виконання отримують сьогоднішню дату (відлік починається зараз). */
function autoArchive(){const lim=new Date();lim.setMonth(lim.getMonth()-1);const L=lim.getFullYear()+'-'+String(lim.getMonth()+1).padStart(2,'0')+'-'+String(lim.getDate()).padStart(2,'0');let n=0;
  S.depts.forEach(d=>d.tasks.forEach(t=>{if(t.status==ST[3]&&!t.arch){if(!t.doneAt){t.doneAt=today();n++;return}if(t.doneAt<=L){t.arch=true;t.archAt=today();t.autoArch=true;n++}}}));return n}
function runAuto(){if(!me())return;if(autoArchive()){if(CLOUD)schedPush();else wr();R()}}
setInterval(runAuto,3600000);

/* ---------- Кнопка «+ Додати стовпець» (праворуч угорі) ---------- */
const colMenu=ev=>menu(ev,()=>{const d=D();d.hid=d.hid||[];const hb=ALLB.filter(k=>!d.cols.some(c=>c.key==k)&&!d.hid.some(c=>c.key==k&&c.type=='b')).map(k=>({id:k,key:k,name:BN[k],type:'b'}));
  return d.hid.concat(hb).map(c=>({t:c.name+(c.type=='b'?'':' ('+((CT.find(x=>x[0]==c.type)||['',''])[1])+')'),f:()=>{d.hid=d.hid.filter(x=>x.id!=c.id);d.cols.push(c);sv()}})).concat([{t:'+ Створити новий стовпець',f:newCol}])});
const newCol=()=>ask('Новий стовпець',(v,t)=>{D().cols.push({id:uid(),key:'c',name:v,type:t||'text'});sv()},`<select id="ms">${CT.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`);

/* =====================================================================
   ТАЙМЛАЙН, ЦЕНТР УПРАВЛІННЯ, АНІМАЦІЇ, ЖИВА ПРИСУТНІСТЬ
   ===================================================================== */
let TL={ppd:16,pf:'',sx:0,sy:0,first:true,tx:0,mn:0},PA=false,MA=false,PULSE=null,LMP={x:innerWidth/2,y:innerHeight/2},LK='',CNT=false,ANT=null,PCH=null;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
addEventListener('mousemove',e=>{LMP={x:e.clientX,y:e.clientY}});
const ONE=864e5,dnum=s=>s?Math.floor(Date.parse(s+'T00:00:00Z')/ONE):null,dstr=n=>new Date(n*ONE).toISOString().slice(0,10);

/* ---------- Нові сторінки у відділі ---------- */
function ensureV4(d){if(d.v4)return false;d.v4=1;d.pages=d.pages||[];if(!d.pages.some(p=>p.type=='timeline'))d.pages.push({id:uid(),name:'Таймлайн',type:'timeline'});if(!d.pages.some(p=>p.type=='dash'))d.pages.push({id:uid(),name:'Центр управління',type:'dash'});return true}

/* ---------- Анімації ---------- */
function enter(){const b=document.body;b.classList.add('ani');clearTimeout(ANT);ANT=setTimeout(()=>b.classList.remove('ani'),1400)}
function cntUp(el){const to=+el.dataset.cnt,t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/800),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e);if(k<1)requestAnimationFrame(f)})(t0)}
function confetti(){if(REDUCED)return;const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:60';document.body.appendChild(c);
  const x=c.getContext('2d'),cols=['#17375E','#F1E5CD','#00be49','#8300b7','#5b7fb0'],P=[];for(let i=0;i<80;i++){const a=Math.random()*Math.PI*2,v=3+Math.random()*7;P.push({x:LMP.x,y:LMP.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,s:4+Math.random()*6,c:cols[i%cols.length],r:Math.random()*6,vr:(Math.random()-.5)*.4})}
  const t0=performance.now();(function f(t){const e=t-t0;x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.25;p.vx*=.99;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.globalAlpha=Math.max(0,1-e/1500);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);x.restore()});if(e<1500)requestAnimationFrame(f);else c.remove()})(t0)}
function toast(m){let c=document.getElementById('toasts');if(!c){c=document.createElement('div');c.id='toasts';c.className='toasts';document.body.appendChild(c)}const e=document.createElement('div');e.className='toast';e.textContent=m;c.appendChild(e);setTimeout(()=>{e.classList.add('out');setTimeout(()=>e.remove(),300)},4200)}
function celebrate(t){PULSE=t.id;setTimeout(()=>{PULSE=null},1200);confetti();toast('Задачу «'+t.title+'» виконано 🎉');bc('done',{title:t.title})}

/* ---------- Жива присутність (потрібна база даних) ---------- */
const ini=n=>(n||'?').split(/\s+/).map(w=>w[0]||'').slice(0,2).join('').toUpperCase();
function presHtml(){const m=me();if(!m)return '';const L=CLOUD?(S.online&&S.online.length?S.online:[{id:S.me,name:m.name}]):[{id:S.me,name:m.name}],A=L.slice(0,8);
  return `<span class="mu">${CLOUD?'Онлайн: '+L.length:'Ви онлайн'}</span><span class="pst">${A.map(u=>`<i class="pa" title="${esc(u.name)}${u.dept?' · '+esc(u.dept):''}${u.page?' · '+esc(u.page):''}">${esc(ini(u.name))}<b></b></i>`).join('')}${L.length>8?`<i class="pa">+${L.length-8}</i>`:''}</span>`}
const drawPres=()=>{const e=document.getElementById('pres');if(e)e.innerHTML=presHtml()};
const trackPres=()=>{if(PCH&&me())try{PCH.track({id:S.me,name:me().name,dept:D()?D().name:'',page:P()?P().name:''})}catch(e){}};
function bc(ev,p){if(!CLOUD||!PCH||!me())return;try{PCH.send({type:'broadcast',event:ev,payload:Object.assign({by:me().name,uid:S.me,dept:S.dept},p)})}catch(e){}}
function assignNotify(tid,u){if(u==S.me)return;const t=tg(tid);if(t)bc('assign',{title:t.title,to:[u]})}
function subPres(){if(!CLOUD||PCH)return;PCH=DB.channel('cks-presence',{config:{presence:{key:S.me}}});
  PCH.on('presence',{event:'sync'},()=>{const st=PCH.presenceState();S.online=Object.keys(st).map(k=>st[k][0]).filter(Boolean);drawPres()})
   .on('broadcast',{event:'done'},m=>{const p=m.payload||{};if(vis().some(x=>x.id==p.dept))toast(p.by+' виконав(ла) задачу «'+p.title+'»')})
   .on('broadcast',{event:'assign'},m=>{const p=m.payload||{};if((p.to||[]).includes(S.me))toast(p.by+' призначив(ла) вам задачу «'+p.title+'»')})
   .subscribe(st=>{if(st==='SUBSCRIBED')trackPres()})}

/* ---------- Після кожного малювання: вхід на сторінку, лічильники, прокрутка таймлайну ---------- */
function postR(){if(!S.me)return;const k=S.dept+':'+S.page;if(k!=LK){LK=k;enter();TL.first=true;CNT=true;trackPres()}
  if(CNT&&document.body.classList.contains('ani'))document.querySelectorAll('[data-cnt]').forEach(cntUp);CNT=false;
  const sc=document.getElementById('gtsc');if(sc){if(TL.first){sc.scrollLeft=Math.max(0,TL.tx-320);TL.sx=sc.scrollLeft;TL.first=false}else{sc.scrollLeft=TL.sx;sc.scrollTop=TL.sy||0}sc.addEventListener('scroll',()=>{TL.sx=sc.scrollLeft;TL.sy=sc.scrollTop})}}

/* ---------- Таймлайн (діаграма Ганта) ---------- */
function tml(d){const T=d.tasks.filter(t=>!t.arch&&(!TL.pf||t.project==TL.pf)),td=dnum(today()),ppd=TL.ppd,LW=220;
  let mn=td-7,mx=td+45;T.forEach(t=>{if(t.start||t.end){mn=Math.min(mn,dnum(t.start||t.end)-3);mx=Math.max(mx,dnum(t.end||t.start)+10)}});
  const N=mx-mn+1,W=N*ppd;TL.mn=mn;TL.tx=LW+(td-mn)*ppd;
  const MS=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  let mo='',dy='',i=0;
  while(i<N){const dt=new Date((mn+i)*ONE),y=dt.getUTCFullYear(),m=dt.getUTCMonth(),len=Math.min(N-i,new Date(Date.UTC(y,m+1,0)).getUTCDate()-dt.getUTCDate()+1);mo+=`<div style="width:${len*ppd}px">${ppd>=5?MS[m]+' '+y:''}</div>`;i+=len}
  for(let k=0;k<N;k++){const n=mn+k,dt=new Date(n*ONE);dy+=`<div style="width:${ppd}px;${(n+3)%7>=5&&ppd>=14?'background:rgba(23,55,94,.05)':''}">${ppd>=14?dt.getUTCDate():''}</div>`}
  const gs=ppd>=14?`background-image:linear-gradient(to right,rgba(23,55,94,.08) 1px,transparent 1px);background-size:${ppd}px 100%`:`background-image:linear-gradient(to right,rgba(23,55,94,.1) 1px,transparent 1px);background-size:${7*ppd}px 100%;background-position:${((7-((mn+3)%7))%7)*ppd}px 0`;
  const gb=t=>{const a=t.start||t.end,b=t.end||t.start;if(!a)return `<span class="gt-nd" style="left:${(td-mn)*ppd}px" onclick="tlDefault('${t.id}')">+ задати дати</span>`;
    const x=(dnum(a)-mn)*ppd,w=(dnum(b)-dnum(a)+1)*ppd,late=t.status!=ST[3]&&dnum(b)<td;
    return `<div class="gt-bar s${ST.indexOf(t.status)}b ${late?'late':''}" data-hv="${t.id}" style="left:${x}px;width:${w}px" onpointerdown="tlDown(event,'${t.id}')"><u class="hl"></u><i style="width:${prog(t)}%"></i><span>${w>70?esc(t.title):''}</span><u class="hr"></u></div>`};
  const G=d.projects.map(p=>({p:p,L:T.filter(t=>t.project==p.id)})).concat([{p:null,L:T.filter(t=>!d.projects.some(p=>p.id==t.project))}]).filter(g=>g.L.length);
  const rows=G.map(g=>{const ds=g.L.filter(t=>t.start||t.end);let sp='';if(ds.length){const a=Math.min(...ds.map(t=>dnum(t.start||t.end))),b=Math.max(...ds.map(t=>dnum(t.end||t.start)));sp=`<div class="gt-sp" style="left:${(a-mn)*ppd}px;width:${(b-a+1)*ppd}px"></div>`}
    return `<div class="gt-r gh2"><div class="gt-l">${g.p&&g.p.avatar?`<img class="pav" src="${g.p.avatar}">`:''}${esc(g.p?g.p.name:'Без проєкту')}</div><div class="gt-t" style="width:${W}px">${sp}</div></div>`+g.L.map(t=>`<div class="gt-r"><div class="gt-l" title="${esc(t.title)}"><span class="dot s${ST.indexOf(t.status)}b"></span><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a></div><div class="gt-t" style="width:${W}px;${gs}">${gb(t)}</div></div>`).join('')}).join('');
  return `<div class="gtb"><select onchange="TL.ppd=+this.value;TL.first=true;R()">${[[34,'Дні'],[16,'Тижні'],[5,'Місяці']].map(o=>`<option value="${o[0]}" ${TL.ppd==o[0]?'selected':''}>Масштаб: ${o[1]}</option>`).join('')}</select><select onchange="TL.pf=this.value;R()"><option value="">Усі проєкти</option>${d.projects.map(p=>`<option value="${p.id}" ${p.id==TL.pf?'selected':''}>${esc(p.name)}</option>`).join('')}</select><button class="bn" onclick="tlToday()">Сьогодні</button><span class="mu">Тягніть смугу, щоб змінити строки; краї смуги змінюють початок і кінець. Клік відкриває задачу.</span></div><div class="gt-sc" id="gtsc"><div class="gt-in" style="width:${LW+W}px"><div class="gt-hd"><div class="gt-r" style="height:auto"><div class="gt-l"></div><div class="gt-mo">${mo}</div></div><div class="gt-r" style="height:auto"><div class="gt-l"></div><div class="gt-dy">${dy}</div></div></div>${rows||'<p class="mu" style="padding:16px">Немає задач</p>'}<div class="gt-today" style="left:${TL.tx+ppd/2}px"></div></div></div>`}
const tlToday=()=>{const sc=document.getElementById('gtsc');if(sc){sc.scrollLeft=Math.max(0,TL.tx-320);TL.sx=sc.scrollLeft}};
const tlDefault=id=>{const t=tg(id);t.start=today();t.end=dstr(dnum(today())+7);sv()};
function tlDown(ev,id){if(ev.button)return;hvClose();const t=tg(id),el=ev.currentTarget,mode=ev.target.classList.contains('hl')?'l':ev.target.classList.contains('hr')?'r':'m',x0=ev.clientX,ppd=TL.ppd,L0=parseFloat(el.style.left),W0=parseFloat(el.style.width);let dd=0,moved=false;
  const mv=e=>{const dx=e.clientX-x0;if(Math.abs(dx)>3)moved=true;dd=Math.round(dx/ppd);if(mode=='m')el.style.left=(L0+dd*ppd)+'px';else if(mode=='l'){const w=Math.max(ppd,W0-dd*ppd);el.style.left=(L0+(W0-w))+'px';el.style.width=w+'px'}else el.style.width=Math.max(ppd,W0+dd*ppd)+'px'};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(!moved){op(id);return}const a=dnum(t.start||t.end),b=dnum(t.end||t.start);let na=a,nb=b;if(mode=='m'){na=a+dd;nb=b+dd}else if(mode=='l')na=Math.min(a+dd,b);else nb=Math.max(b+dd,a);t.start=dstr(na);t.end=dstr(nb);sv()};
  addEventListener('pointermove',mv);addEventListener('pointerup',up);ev.preventDefault()}

/* ---------- Центр управління (дашборд відділу) ---------- */
function dash(d){const T=d.tasks.filter(t=>!t.arch),td=today(),open=T.filter(t=>t.status!=ST[3]),late=open.filter(t=>t.end&&t.end<td).sort((a,b)=>a.end<b.end?-1:1),cnt=ST.map(s=>T.filter(t=>t.status==s).length),C=2*Math.PI*34;
  const kp=(l,v,c)=>`<div class="ds-c ds-k"><div class="mu">${l}</div><b class="kv" ${c?`style="color:${c}"`:''} data-cnt="${v}">${v}</b></div>`;
  const ring=v=>`<svg viewBox="0 0 80 80" width="76" height="76"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(23,55,94,.12)" stroke-width="8"/><circle class="rg" cx="40" cy="40" r="34" fill="none" stroke="#00be49" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-v/100)}" style="--c:${C}" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="#17375E">${v}%</text></svg>`;
  const projs=d.projects.map(p=>{const TA=d.tasks.filter(t=>t.project==p.id),v=TA.length?Math.round(100*TA.filter(t=>t.status==ST[3]).length/TA.length):0;return `<div class="ds-p">${ring(v)}<div><b>${esc(p.name)}</b><div class="mu">${TA.length} задач${p.qty?' · К-сть '+esc(p.qty):''}</div></div></div>`}).join('')||'<div class="mu">Проєктів поки немає</div>';
  const cols=['#cfcfcf','#8300b7','#00be49','#00803a'],tot=T.length||1;let off=0;const arcs=cnt.map((n,i)=>{const l=C*n/tot,a=`<circle cx="40" cy="40" r="34" fill="none" stroke="${cols[i]}" stroke-width="12" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 40 40)"/>`;off+=l;return a}).join('');
  const days=[];for(let i=13;i>=0;i--){const ds=dstr(dnum(td)-i);days.push([ds,d.tasks.filter(t=>t.doneAt==ds).length])}const mx=Math.max(1,...days.map(x=>x[1]));
  const wl={};open.forEach(t=>t.who.forEach(u=>wl[u]=(wl[u]||0)+1));const arr=Object.keys(wl).map(u=>[u,wl[u]]).sort((a,b)=>b[1]-a[1]),avg=arr.length?arr.reduce((a,x)=>a+x[1],0)/arr.length:0,wm=Math.max(1,...arr.map(x=>x[1]));
  return `<div class="ds"><div class="ds-g4">${kp('Активні задачі',T.length)}${kp('В процесі',cnt[2])}${kp('Виконано',cnt[3],'#00803a')}${kp('Прострочено',late.length,late.length?'#c0392b':'')}</div>
<div class="ds-g2"><div class="ds-c"><h4>Проєкти</h4><div class="ds-pw">${projs}</div></div><div class="ds-c"><h4>Статуси</h4><div class="row"><svg class="ds-dn" viewBox="0 0 80 80" width="110" height="110">${arcs}<text x="40" y="45" text-anchor="middle" font-size="15" font-weight="700" fill="#17375E">${T.length}</text></svg><div class="ds-leg">${ST.map((s,i)=>`<span><i style="background:${cols[i]}"></i>${s}: <b>${cnt[i]}</b></span>`).join('')}</div></div></div></div>
<div class="ds-g2"><div class="ds-c"><h4>Виконано за 14 днів</h4><div class="ds-ch">${days.map(x=>`<div class="ds-b" title="${x[0]}: ${x[1]}"><em>${x[1]||''}</em><div class="ds-bw"><i style="height:${100*x[1]/mx}%"></i></div><span>${x[0].slice(8)}</span></div>`).join('')}</div></div><div class="ds-c"><h4>Навантаження</h4>${arr.map(a=>{const over=a[1]>=5&&a[1]>avg*1.4;return `<div class="hb"><span>${esc(un(a[0]))}</span><div class="bar"><b style="width:${100*a[1]/wm}%;background:${over?'#c0392b':'var(--ok)'}"></b></div><b>${a[1]}</b>${over?'<small class="over">перевантажений</small>':''}</div>`}).join('')||'<div class="mu">Невиконаних задач з виконавцями немає</div>'}</div></div>
<div class="ds-c"><h4>Прострочені задачі</h4>${late.map(t=>`<div class="sbt"><a class="tt" data-hv="${t.id}" onclick="op('${t.id}')">${esc(t.title)}</a><span class="mu" style="flex:1">${t.who.map(un).map(esc).join(', ')}</span><span class="late-b">${dnum(td)-dnum(t.end)} дн.</span></div>`).join('')||'<div class="mu">Прострочених задач немає 👍</div>'}</div></div>`}

/* =====================================================================
   ХМАРНА БАЗА ДАНИХ (Supabase) — працює, якщо заповнено config.js.
   Без config.js програма працює як раніше: дані в браузері.
   ===================================================================== */
let SYNC={docs:{},depts:{}},pt=null,pushing=false,dirty=false,RT=null,rlT=null,softT=null;
const emsg=m=>({'User already registered':'Такий email уже зареєстровано','Invalid login credentials':'Невірний email або пароль','Email not confirmed':'Підтвердіть email (лист у пошті)'}[m]||m);
function normDept(d){d.projects=d.projects||[];d.cats=d.cats||[];d.hid=d.hid||[];d.cols=d.cols&&d.cols.length?d.cols:defCols();d.pages=d.pages||[];d.members=d.members||[];d.tasks=d.tasks||[];d.tasks.forEach(t=>{t.who=t.who||[];t.subs=t.subs||[]});d.tasks.sort((a,b)=>(a.ts||0)-(b.ts||0));d.projects.sort((a,b)=>(a.ts||0)-(b.ts||0))}
function docsOf(){const m={};S.depts.forEach(d=>{m['meta:'+d.id]={dept:d.id,kind:'meta',data:{pages:d.pages,cols:d.cols,cats:d.cats,closedNone:!!d.closedNone,hid:d.hid||[],v4:d.v4?1:0}};d.tasks.forEach(t=>m['task:'+t.id]={dept:d.id,kind:'task',data:t});d.projects.forEach(p=>m['project:'+p.id]={dept:d.id,kind:'project',data:p})});return m}
function applyDoc(r){const d=S.depts.find(x=>x.id==r.dept_id);if(!d)return;const x=r.data;if(r.kind=='meta'){d.pages=x.pages||[];d.cols=x.cols;d.cats=x.cats||[];d.hid=x.hid||[];d.v4=x.v4;d.closedNone=!!x.closedNone}else{const L=r.kind=='task'?d.tasks:d.projects,i=L.findIndex(y=>y.id==x.id);if(i<0)L.push(x);else L[i]=x}}
function removeDoc(id){const k=id.split(':')[0],oid=id.slice(k.length+1);S.depts.forEach(d=>{if(k=='task')d.tasks=d.tasks.filter(t=>t.id!=oid);if(k=='project')d.projects=d.projects.filter(p=>p.id!=oid)})}
async function fetchAll(tb){let out=[],from0=0;for(;;){const r=await DB.from(tb).select('*').range(from0,from0+999);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<1000)break;from0+=1000}return out}
async function loadAll(){const [pr,dp,mb,dc]=await Promise.all([fetchAll('profiles'),fetchAll('depts'),fetchAll('dept_members'),fetchAll('docs')]);
  S.users=pr.map(u=>({id:u.id,name:u.name,pos:u.pos,admin:u.admin}));
  S.depts=dp.map(d=>({id:d.id,name:d.name,boss:d.boss,members:mb.filter(m=>m.dept_id==d.id).map(m=>m.user_id),tasks:[],projects:[],cols:null,cats:[],pages:[],v3:1}));
  dc.forEach(applyDoc);S.depts.forEach(normDept);
  SYNC={docs:{},depts:{}};const cur=docsOf();for(const id in cur)SYNC.docs[id]=JSON.stringify(cur[id].data);S.depts.forEach(d=>SYNC.depts[d.id]={name:d.name,members:d.members.slice()});
  let mg=false;S.depts.forEach(d=>{if(ensureV4(d))mg=true});if(autoArchive()||mg)schedPush();
  if(!S.dept||!D()){const v=vis()[0];S.dept=v?v.id:null;S.page=v&&v.pages[0]?v.pages[0].id:null}}
function schedPush(){if(!CLOUD||!S.me)return;clearTimeout(pt);pt=setTimeout(push,500)}
async function push(){if(!CLOUD||!S.me)return;if(pushing){dirty=true;return}pushing=true;dirty=false;
  try{
    for(const d of S.depts){const sd=SYNC.depts[d.id];
      if(!sd){const r=await DB.from('depts').insert({id:d.id,name:d.name,boss:d.boss});if(r.error)throw r.error;SYNC.depts[d.id]={name:d.name,members:d.members.slice()}}
      else{if(sd.name!=d.name){const r=await DB.from('depts').update({name:d.name}).eq('id',d.id);if(r.error)throw r.error;sd.name=d.name}
        const add=d.members.filter(m=>!sd.members.includes(m)),rem=sd.members.filter(m=>!d.members.includes(m));
        if(add.length){const r=await DB.from('dept_members').upsert(add.map(u=>({dept_id:d.id,user_id:u})),{onConflict:'dept_id,user_id',ignoreDuplicates:true});if(r.error)throw r.error}
        if(rem.length){const r=await DB.from('dept_members').delete().eq('dept_id',d.id).in('user_id',rem);if(r.error)throw r.error}
        sd.members=d.members.slice()}}
    const cur=docsOf(),up=[],del=[];
    for(const id in cur){const j=JSON.stringify(cur[id].data);if(SYNC.docs[id]!==j)up.push({id:id,dept_id:cur[id].dept,kind:cur[id].kind,data:cur[id].data,j:j})}
    for(const id in SYNC.docs)if(!cur[id])del.push(id);
    for(let i=0;i<up.length;i+=100){const ch=up.slice(i,i+100),r=await DB.from('docs').upsert(ch.map(u=>({id:u.id,dept_id:u.dept_id,kind:u.kind,data:u.data,updated_at:new Date().toISOString()})));if(r.error)throw r.error;ch.forEach(u=>SYNC.docs[u.id]=u.j)}
    if(del.length){const r=await DB.from('docs').delete().in('id',del);if(r.error)throw r.error;del.forEach(id=>delete SYNC.docs[id])}
    if(S.err){S.err='';R()}
  }catch(e){S.err='Не вдалося зберегти зміни в базі: '+(e.message||e)+'. Спробуємо ще раз…';R();clearTimeout(pt);pt=setTimeout(push,5000)}
  pushing=false;if(dirty)push()}
const softR=()=>{const a=document.activeElement;if(a&&(a.tagName=='INPUT'||a.tagName=='TEXTAREA'||a.tagName=='SELECT')&&$.contains(a)){clearTimeout(softT);softT=setTimeout(softR,1500)}else R()};
const reloadSoon=()=>{clearTimeout(rlT);rlT=setTimeout(async()=>{try{await push();await loadAll();softR()}catch(e){}},800)};
function subRT(){if(RT)return;RT=DB.channel('cks-sync')
  .on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{try{if(p.eventType=='DELETE'){removeDoc(p.old.id);delete SYNC.docs[p.old.id]}else{const r=p.new,cur=docsOf()[r.id],j=JSON.stringify(r.data);if(cur&&JSON.stringify(cur.data)==j){SYNC.docs[r.id]=j;return}applyDoc(r);S.depts.forEach(normDept);SYNC.docs[r.id]=j}softR()}catch(e){}})
  .on('postgres_changes',{event:'*',schema:'public',table:'dept_members'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'depts'},reloadSoon)
  .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},reloadSoon).subscribe()}
async function loadPub(){try{const r=await DB.from('public_depts').select('*');S.pub=r.data||[]}catch(e){S.pub=[]}}
async function afterAuth(newBoss){const s=(await DB.auth.getSession()).data.session;if(!s)return;S.me=s.user.id;S.err='';reg=false;S.loading=true;R();
  try{await loadAll();subRT();subPres();if(!me())S.err='Профіль не знайдено. Перевірте, що SQL-схему (schema.sql) виконано.'}catch(e){S.err='Помилка завантаження: '+(e.message||e)}
  S.loading=false;R();if(newBoss&&me()&&!vis().length)newDept()}
async function doRegC(){const n=g('fn'),e=g('fe').toLowerCase(),p=g('fp'),pos=g('fpos'),dp=document.getElementById('fd');
  if(!n||!e||p.length<6)return er('Заповніть поля (пароль від 6 символів)');if(pos=='asst'&&!dp)return er('Немає відділу для вибору');
  const r=await DB.auth.signUp({email:e,password:p,options:{data:{name:n,pos:pos,dept:dp?dp.value:''}}});
  if(r.error)return er(emsg(r.error.message));
  if(!r.data.session){reg=false;draft={pos:'boss'};return info('Акаунт створено. Перевірте пошту, підтвердіть email і увійдіть.')}
  draft={pos:'boss'};await afterAuth(pos=='boss')}
async function doLoginC(){const e=g('fe').toLowerCase(),p=g('fp');if(!e||!p)return er('Введіть email і пароль');const r=await DB.auth.signInWithPassword({email:e,password:p});if(r.error)return er(emsg(r.error.message));await afterAuth(false)}
async function outC(){try{if(RT){DB.removeChannel(RT);RT=null}if(PCH){DB.removeChannel(PCH);PCH=null}S.online=[];await DB.auth.signOut()}catch(e){}S.me=null;S.users=[];S.depts=[];S.dept=S.page=S.open=null;SYNC={docs:{},depts:{}};await loadPub();R()}
async function resetPw(){const e=g('fe').toLowerCase();if(!e)return er('Введіть email у полі вище');const r=await DB.auth.resetPasswordForEmail(e,{redirectTo:location.href.split('#')[0].split('?')[0]});info(r.error?esc(emsg(r.error.message)):'Лист для відновлення пароля надіслано на '+esc(e))}
async function setNp(){const el=document.getElementById('np'),p=el.value,er2=document.getElementById('npe');if(p.length<6){er2.textContent='Мінімум 6 символів';return}const r=await DB.auth.updateUser({password:p});if(r.error){er2.textContent=emsg(r.error.message);return}M='';await afterAuth(false)}
function doReg(){return CLOUD?doRegC():doRegL()}
function doLogin(){return CLOUD?doLoginC():doLoginL()}
function out(){return CLOUD?outC():outL()}
async function boot(){DB.auth.onAuthStateChange(ev=>{if(ev=='PASSWORD_RECOVERY'){M='<div class="ov"><div class="card"><h3>Новий пароль</h3><input id="np" type="password" placeholder="Новий пароль (від 6 символів)"><div class="err" id="npe"></div><button class="b" onclick="setNp()">Зберегти</button></div></div>';R()}});
  S.loading=true;R();
  try{const s=(await DB.auth.getSession()).data.session;if(s){S.me=s.user.id;await loadAll();subRT();subPres();if(!me())S.err='Профіль не знайдено. Перевірте, що SQL-схему (schema.sql) виконано.'}else await loadPub()}catch(e){S.err='Не вдалося підключитися до бази: '+(e.message||e)}
  S.loading=false;R()}


if(!CLOUD){let ch=false;S.depts.forEach(d=>{if(ensureV4(d))ch=true});if(autoArchive()||ch)wr()}
CLOUD?boot():R();
