const { fail } = require('./game');
const ZONES = [
  {id:'wilds',name:'Paso de Escarcha',detail:'Enemigos errantes: acércate para combatir y ganar experiencia',color:'#bac9dd'},
  { id:'plaza', name:'Plaza Boreal', detail:'Tienda, refugio y duelos de práctica', color:'#c8e3e8' },
  { id:'lake', name:'Bahía de los Ecos', detail:'Pesca con ritmo y cambia dos peces por seis monedas', color:'#86c6d8' },
  { id:'forest', name:'Bosque de Aurora', detail:'Busca cristales entre los árboles y cámbialos en el taller', color:'#89bdb3' },
  { id:'ruins', name:'Ruinas Estelares', detail:'Lee las pistas y activa las tres runas en orden', color:'#a5a1cd' }
];
const PORTALS = [
  {id:'to-wilds',zone:'plaza',to:'wilds',x:1350,y:820,name:'Paso de Escarcha · peligro'},
  { id:'to-lake',zone:'plaza',to:'lake',x:1300,y:450,name:'Camino a la bahía' },
  { id:'to-forest',zone:'plaza',to:'forest',x:800,y:800,name:'Camino al bosque' },
  { id:'to-ruins',zone:'plaza',to:'ruins',x:1050,y:170,name:'Camino a las ruinas' },
  ...['lake','forest','ruins','wilds'].map(zone=>({id:'return-'+zone,zone,to:'plaza',x:230,y:500,name:'Volver a la plaza'}))
].map(p=>({...p,kind:'portal',hint:p.name+' · E para cruzar',radius:80}));
const ACTIVITIES = [
  {id:'fish-market',zone:'lake',x:1020,y:650,kind:'trade-fish',name:'Puesto del pescador',hint:'Cambia 2 peces por 6 monedas'},
  ...[[650,280],[1100,520],[720,800]].map(([x,y],i)=>({id:'crystal-'+i,zone:'forest',x,y,kind:'forage',name:'Cristal de aurora',hint:'Recoge un cristal · se renueva en 60 s'})),
  {id:'workshop',zone:'forest',x:350,y:300,kind:'trade-crystals',name:'Taller del bosque',hint:'Cambia 3 cristales por 9 monedas'},
  {id:'inscription',zone:'ruins',x:700,y:700,kind:'clue',name:'Inscripción antigua',hint:'Lee la pista del santuario'},
  ...[['moon','Luna',640,330],['star','Estrella',1000,330],['sun','Sol',820,500]].map(([id,name,x,y])=>({id:'rune-'+id,zone:'ruins',x,y,kind:'rune',name:'Runa '+name,hint:'Activa la runa '+name}))
];
function zoneOf(p){return ZONES.some(z=>z.id===p?.zone)?p.zone:'plaza';}
function check(p, expected){if(expected!==undefined&&expected!==zoneOf(p))fail(409,'La zona cambió; vuelve a sincronizar');}
function places(zone){
  const old=require('./expedition').PLACES.filter(p=>zone==='plaza'?['camp','arena'].includes(p.id):zone==='lake'?p.id==='lake':false);
  return [...old,...(zone==='plaza'?[require('./wardrobe').catalog.shop]:[]),...ACTIVITIES.filter(p=>p.zone===zone),...PORTALS.filter(p=>p.zone===zone)];
}
function travel(p,id,pos){
  if(p.battle?.status==='active')fail(409,'Termina el combate antes de viajar');
  const portal=PORTALS.find(v=>v.id===id&&v.zone===zoneOf(p));
  if(!portal||Math.hypot(pos.x-portal.x,pos.y-portal.y)>80)fail(409,'Acércate al sendero para viajar');
  const previous=zoneOf(p);p.zone=portal.to;p.fishing=null;
  p.runeStep=0;p.encounterSafeUntil=Date.now()+12000;
  const entry=p.zone==='plaza'?PORTALS.find(v=>v.to===previous):PORTALS.find(v=>v.zone===p.zone);
  p.x=entry.x+(p.zone==='plaza'?-100:100);p.y=entry.y;
  p.visitedZones||=['plaza'];if(!p.visitedZones.includes(p.zone))p.visitedZones.push(p.zone);
  return p;
}
function activity(p,id,now=Date.now()){
  const a=ACTIVITIES.find(v=>v.id===id&&v.zone===zoneOf(p));
  if(!a||Math.hypot(p.x-a.x,p.y-a.y)>85)fail(409,'Acércate a la actividad de esta zona');
  if(p.battle?.status==='active')fail(409,'Termina el combate primero');
  p.crystals||=0;p.activityReadyAt||={};
  const gain=xp=>require('./expedition').gain(p,xp);
  if(a.kind==='trade-fish'){if(p.fish<2)fail(409,'Necesitas dos peces');p.fish-=2;p.coins+=6;p.activityMessage='Intercambio: -2 peces, +6 monedas.';}
  if(a.kind==='trade-crystals'){if(p.crystals<3)fail(409,`Tienes ${p.crystals}/3 cristales`);p.crystals-=3;p.coins+=9;p.activityMessage='Intercambio: -3 cristales, +9 monedas.';}
  if(a.kind==='forage'){
    if(now<(p.activityReadyAt[id]||0))fail(409,'Este cristal todavía está creciendo');
    p.activityReadyAt[id]=now+60000;p.crystals++;gain(6);p.activityMessage=`Cristal recogido. Tienes ${p.crystals}/3 para el taller.`;
  }
  if(a.kind==='clue')p.activityMessage='Primero despierta el Sol, después aparece la Luna; al final brilla la Estrella.';
  if(a.kind==='rune'){
    if(now<(p.activityReadyAt.ruins||0))fail(409,'El santuario se recarga durante tres minutos');
    const order=['rune-sun','rune-moon','rune-star'];p.runeStep||=0;
    if(order[p.runeStep]!==id){p.runeStep=0;p.activityMessage='Las runas se apagan. Lee la inscripción y empieza otra vez.';}
    else if(++p.runeStep===3){p.runeStep=0;p.activityReadyAt.ruins=now+180000;p.coins+=8;gain(20);p.activityMessage='¡Santuario resuelto! +8 monedas y +20 EXP.';}
    else p.activityMessage=`Runa correcta: ${p.runeStep}/3. Busca la siguiente.`;
  }
  return p;
}
module.exports={ZONES,PORTALS,zoneOf,check,places,travel,activity};
