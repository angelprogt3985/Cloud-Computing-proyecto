const { randomUUID } = require('node:crypto');
const NPC = { id: 'guardian', name: 'Guardián del glaciar', x: 520, y: 160 };
const ITEMS = [{ id: 'c1', x: 120, y: 320, type: 'coin' }, { id: 'c2', x: 560, y: 340, type: 'coin' }, { id: 'c3', x: 60, y: 80, type: 'fish' }, ...[[640,700],[900,190],[1340,300],[1100,840],[1450,630],[500,900],[1020,550],[180,650]].map(([x,y],i)=>({id:`exp-${i}`,x,y,type:i%3===0?'fish':'coin'}))];
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function near(a, b, radius) { return Math.hypot(a.x - b.x, a.y - b.y) <= radius; }
function coordinates(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 16 || x > 1584 || y < 16 || y > 984) fail(400, 'Posición fuera del mapa');
  return { x: Math.round(x), y: Math.round(y) };
}
function newPlayer(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 24) fail(400, 'Escribe un nombre de 1 a 24 caracteres');
  return { id: randomUUID(), name: name.trim(), x: 320, y: 340, hp: 30, maxHp: 30, coins: 0, fish: 0, collected: [], battle: null, lastBattleAt: 0, createdAt: Date.now() };
}
const intents = ['Golpe de hielo', 'Cargar ventisca', 'Ventisca'];
function startBattle(player, now = Date.now()) {
  require('./expedition').normalize(player);
  if (player.battle?.status === 'active') return player;
  if (!near(player, NPC, 52)) fail(409, 'Acércate al guardián');
  if (now - player.lastBattleAt < 10000) fail(429, 'El guardián descansa 10 segundos entre duelos');
  player.hp = player.maxHp;
  player.battle = { id: randomUUID(), turn: 0, hp: 36, maxHp: 36, status: 'active', potions: 2, intent: intents[0], log: ['Duelo de práctica. El guardián anuncia su siguiente acción.'] };
  return player;
}
function battleTurn(player, action, battleId, turn, now = Date.now()) {
  const b = player.battle;
  if (!b || b.status !== 'active') fail(409, 'No hay un duelo activo');
  if (b.id !== battleId || b.turn !== turn) fail(409, 'El turno ya cambió; sincroniza el duelo');
  if (!['attack', 'defend', 'heal', 'run'].includes(action)) fail(400, 'Acción inválida');
  const log = [];
  if (action === 'run') { b.status = 'escaped'; log.push('Te retiras sin recompensa.'); }
  else {
    if (action === 'heal') {
      if (!b.potions) fail(409, 'No quedan pociones');
      if (player.hp === player.maxHp) fail(409, 'Ya tienes toda la salud');
      b.potions--; const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + 12); log.push(`Recuperas ${player.hp - before} PV.`);
    } else if (action === 'attack') {
      const damage = (b.turn % 3 === 1 ? 12 : 8) + (player.level || 1) - 1;
      b.hp = Math.max(0, b.hp - damage); log.push(`Tu golpe causa ${damage} de daño${damage === 12 ? ': vulnerable mientras carga' : ''}.`);
    } else log.push('Te cubres: reduces el daño de este turno.');
    if (b.hp === 0) { b.status = 'won'; player.coins += 10; player.guardianWins = (player.guardianWins || 0) + 1; require('./expedition').gain(player,45); log.push('¡Victoria! +10 monedas y +45 EXP.'); }
    else {
      let damage = [5, 0, 14][b.turn % 3];
      if (action === 'defend') damage = Math.ceil(damage * 0.25);
      player.hp = Math.max(0, player.hp - damage);
      log.push(damage ? `${b.intent}: recibes ${damage} de daño.` : 'El guardián carga una ventisca. ¡Prepárate!');
      if (player.hp === 0) { b.status = 'lost'; log.push('Duelo perdido. Puedes recuperarte e intentarlo de nuevo.'); }
    }
  }
  b.turn++; b.intent = intents[b.turn % 3]; b.log = log;
  if (b.status !== 'active') player.lastBattleAt = now;
  return player;
}
function collect(player, itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item) fail(400, 'Objeto desconocido');
  if (player.collected.includes(itemId)) return player;
  if (!near(player, item, 30)) fail(409, 'Acércate al objeto');
  player.collected.push(itemId);
  if (item.type === 'coin') player.coins += 3; else player.fish++;
  require('./expedition').gain(player,12);
  return player;
}
module.exports = { NPC, ITEMS, fail, coordinates, newPlayer, startBattle, battleTurn, collect };
