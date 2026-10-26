const {randomUUID}=require('node:crypto');
const {fail}=require('./game');
const TYPES=[
 {id:'snowling',name:'Bola de nieve',icon:'❄',color:'#68b8ce',x:650,y:550,hp:24,damage:[4,0,8],intents:['Rebote','Tomar impulso','Salto helado'],xp:24,coins:4},
 {id:'fox',name:'Zorro polar',icon:'🦊',color:'#dcad75',x:1000,y:300,hp:34,damage:[6,8,0],intents:['Zarpazo','Embestida','Recuperar aliento'],xp:36,coins:6},
 {id:'golem',name:'Gólem de escarcha',icon:'🗿',color:'#9986b9',x:1210,y:740,hp:48,damage:[0,13,5],intents:['Cargar fuerza','Golpe pesado','Esquirlas'],xp:55,coins:9}
];
function position(e,now){const t=now/1000;return {x:e.x+Math.sin(t/5+e.x)*65,y:e.y+Math.cos(t/7+e.y)*45};}
function list(p,now=Date.now()) {return p.zone==='wilds'?TYPES.filter(e=>now>=(p.enemyReadyAt?.[e.id]||0)).map(e=>({...e,homeX:e.x,homeY:e.y,...position(e,now)})):[];}
function start(p,id,now=Date.now()) {
 require('./expedition').normalize(p);
 if(p.battle?.status==='active')return p;
 const e=TYPES.find(e=>e.id===id);
 if(!e||p.zone!=='wilds')fail(409,'Este enemigo está en el Paso de Escarcha');
 if(now<(p.encounterSafeUntil||0)||now<(p.enemyReadyAt?.[id]||0))fail(409,'Todavía puedes explorar sin combatir');
 if(p.hp<=0)fail(409,'Vuelve al refugio para recuperar salud');
 const pos=position(e,now);
 if(Math.hypot(p.x-pos.x,p.y-pos.y)>85)fail(409,'El enemigo está demasiado lejos');
 p.battle={id:randomUUID(),enemyId:e.id,name:e.name,icon:e.icon,turn:0,hp:e.hp,maxHp:e.hp,status:'active',potions:2,focus:2,intent:e.intents[0],damage:e.damage,intents:e.intents,rewardXp:e.xp,rewardCoins:e.coins,log:[`${e.name} te ha encontrado. Observa su próxima acción o huye.`]};
 return p;
}
function finish(p,b,now){if(!b.enemyId)return;p.enemyReadyAt||={};p.enemyReadyAt[b.enemyId]=now+(b.status==='won'?90000:20000);p.encounterSafeUntil=now+12000;if(b.status==='lost')p.hp=Math.max(1,Math.ceil(p.maxHp/3));}
module.exports={TYPES,position,list,start,finish};
