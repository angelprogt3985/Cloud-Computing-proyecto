const { randomUUID } = require('node:crypto');
const { fail } = require('./game');
const { duelLoadout } = require('./wardrobe');
function participant(a,id) { if (!a || !a.fighters.some(p=>p.id===id)) fail(403,'No participas en este duelo'); }
function expired(a, now=Date.now()) {
  if (a && ['pending','active'].includes(a.status) && now>a.expiresAt) { a.status='expired';a.winner=null;a.log=['El duelo terminó por inactividad.']; }
  return a;
}
function challenge(a,from,to,now=Date.now()) {
  expired(a,now);
  if (a && (['pending','active'].includes(a.status) || (!a.settled && a.status==='finished'))) fail(409,'La arena está ocupada; espera a que termine el duelo');
  if (from.id===to.id) fail(400,'Elige a otro explorador');
  return { id:randomUUID(),status:'pending',turn:0,next:from.id,expiresAt:now+45000,
    fighters:[from,to].map(p=>{const loadout=duelLoadout(p);return {id:p.id,name:p.name,...loadout,hp:loadout.maxHp,guard:false,potions:2,focus:2,chilled:false};}),
    log:[`${from.name} invita a ${to.name}. Ambos deben aceptar combatir.`] };
}
function respond(a,id,duelId,accept,now=Date.now()) {
  participant(a,id);expired(a,now);
  if (a.id!==duelId || a.status!=='pending' || a.fighters[1].id!==id) fail(409,'La invitación ya no está disponible');
  a.status=accept?'active':'declined';a.expiresAt=now+60000;a.log=[accept?'¡Duelo iniciado! Equipo fijado al enviar la invitación.':'Invitación rechazada.'];return a;
}
function turn(a,id,duelId,version,action,now=Date.now()) {
  participant(a,id);expired(a,now);
  if (a.id!==duelId || a.status!=='active' || a.turn!==version || a.next!==id) fail(409,'Espera tu turno o sincroniza el duelo');
  if (!['attack','power','frost','defend','heal','run'].includes(action)) fail(400,'Acción inválida');
  const me=a.fighters.find(p=>p.id===id),other=a.fighters.find(p=>p.id!==id);
  const focus=me.focus??2,cost={power:2,frost:1}[action]||0;
  if(focus<cost)fail(409,'Necesitas energía: usa Golpe o Defender');
  if(action==='heal'&&(!me.potions||me.hp===me.maxHp))fail(409,'No puedes curarte ahora');
  me.focus=Math.min(me.maxFocus??3,focus-cost+(action==='attack'?(me.attackRecovery??1):action==='defend'?1:0));
  me.guard=false;a.events=[];
  if(action==='run'){a.status='finished';a.winner=other.id;a.log=[`${me.name} se retira.`];}
  else if(['attack','power','frost'].includes(action)){
    let damage={attack:10,power:16,frost:6}[action]+((me.attack??10)-10);
    if(me.chilled){damage=Math.max(1,damage-4);me.chilled=false;}
    if(other.guard)damage=Math.ceil(damage*.3);
    other.hp=Math.max(0,other.hp-damage);other.guard=false;
    if(action==='frost')other.chilled=true;
    a.events.push({actor:me.id,target:other.id,action,damage});
    a.log=[`${me.name} usa ${{attack:'Golpe',power:'Impacto polar',frost:'Escarcha'}[action]}: ${damage} de daño.`];
    if(action==='frost')a.log.push('El próximo ataque del rival causa 4 menos de daño.');
  }
  else if(action==='defend'){me.guard=true;a.log=[`${me.name} prepara un escudo y recupera energía.`];a.events.push({actor:me.id,target:me.id,action});}
  else {me.potions--;const before=me.hp;me.hp=Math.min(me.maxHp,me.hp+12);a.log=[`${me.name} recupera ${me.hp-before} PV.`];a.events.push({actor:me.id,target:me.id,action,heal:me.hp-before});}
  if(other.hp===0){a.status='finished';a.winner=me.id;a.log.push(`¡${me.name} gana el duelo!`);}
  a.turn++;a.next=other.id;a.expiresAt=now+60000;return a;
}
module.exports={participant,expired,challenge,respond,turn};
