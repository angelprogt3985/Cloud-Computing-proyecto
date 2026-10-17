const { randomUUID } = require('node:crypto');
const { fail } = require('./game');
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
    fighters:[from,to].map(p=>({id:p.id,name:p.name,hp:40,maxHp:40,guard:false,potions:2})),
    log:[`${from.name} invita a ${to.name}. Ambos deben aceptar combatir.`] };
}
function respond(a,id,duelId,accept,now=Date.now()) {
  participant(a,id);expired(a,now);
  if (a.id!==duelId || a.status!=='pending' || a.fighters[1].id!==id) fail(409,'La invitación ya no está disponible');
  a.status=accept?'active':'declined';a.expiresAt=now+60000;a.log=[accept?'¡Duelo iniciado! Salud y daño iguales para ambos.':'Invitación rechazada.'];return a;
}
function turn(a,id,duelId,version,action,now=Date.now()) {
  participant(a,id);expired(a,now);
  if (a.id!==duelId || a.status!=='active' || a.turn!==version || a.next!==id) fail(409,'Espera tu turno o sincroniza el duelo');
  if (!['attack','defend','heal','run'].includes(action)) fail(400,'Acción inválida');
  const me=a.fighters.find(p=>p.id===id),other=a.fighters.find(p=>p.id!==id);
  me.guard=false;
  if (action==='run') {a.status='finished';a.winner=other.id;a.log=[`${me.name} se retira.`];}
  else if (action==='attack') {const damage=other.guard?3:10;other.hp=Math.max(0,other.hp-damage);other.guard=false;a.log=[`${me.name} golpea: ${damage} de daño.`];}
  else if(action==='defend') {me.guard=true;a.log=[`${me.name} prepara un escudo: reduce el próximo golpe.`];}
  else {if(!me.potions || me.hp===me.maxHp) fail(409,'No puedes curarte ahora');me.potions--;me.hp=Math.min(me.maxHp,me.hp+12);a.log=[`${me.name} recupera salud.`];}
  if(other.hp===0){a.status='finished';a.winner=me.id;a.log.push(`¡${me.name} gana el duelo!`);}
  a.turn++;a.next=other.id;a.expiresAt=now+60000;return a;
}
module.exports={participant,expired,challenge,respond,turn};
