const { randomUUID } = require('node:crypto');
const { techniques } = require('./techniques');
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
  if (require('./zones').zoneOf(player)!=='plaza') fail(409,'El guardián está en la plaza');
  if (!near(player, NPC, 52)) fail(409, 'Acércate al guardián');
  if (now - player.lastBattleAt < 10000) fail(429, 'El guardián descansa 10 segundos entre duelos');
  player.hp = player.maxHp;
  player.battle = { id: randomUUID(), turn: 0, hp: 36, maxHp: 36, status: 'active', potions: 2, focus: 2, intent: intents[0], log: ['Duelo de práctica. El guardián anuncia su siguiente acción.'] };
  return player;
}
function battleTurn(player, action, battleId, turn, now = Date.now()) {
  const b = player.battle;
  if (!b || b.status !== 'active') fail(409, 'No hay un duelo activo');
  if (b.id !== battleId || b.turn !== turn) fail(409, 'El turno ya cambió; sincroniza el duelo');
  if (!['attack', 'power', 'frost', 'brace', 'nova', 'defend', 'heal', 'run'].includes(action)) fail(400, 'Acción inválida');
  const technique = techniques[action];
  if (technique && (player.level || 1) < technique.level) fail(409, `Se desbloquea en nivel ${technique.level}`);
  const focus = b.focus ?? 2, cost = technique?.cost ?? ({power:2,frost:1}[action] || 0);
  if (focus < cost) fail(409, 'Necesitas energía: usa Golpe o Defender');
  if (action === 'heal' && (!b.potions || player.hp === player.maxHp)) fail(409, 'No puedes curarte ahora');
  b.focus = Math.min(3, focus - cost + (['attack','defend'].includes(action) ? 1 : 0));
  const log = [], events = [];
  if (action === 'run') { b.status = 'escaped'; log.push('Te retiras sin recompensa.'); }
  else {
    if (action === 'heal') {
      if (!b.potions) fail(409, 'No quedan pociones');
      if (player.hp === player.maxHp) fail(409, 'Ya tienes toda la salud');
      b.potions--; const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + 12); log.push(`Recuperas ${player.hp - before} PV.`); events.push({actor:player.id,target:player.id,action,heal:player.hp-before});
    } else if (['attack','power','frost','brace','nova'].includes(action)) {
      const damage = ((technique?.damage ?? {attack:8,power:16,frost:6}[action]) + (b.turn % 3 === 1 ? 4 : 0)) + (player.level || 1) - 1;
      b.hp = Math.max(0, b.hp - damage); log.push(`${technique?.name ?? {attack:'Golpe',power:'Impacto polar',frost:'Escarcha'}[action]}: ${damage} de daño${b.turn % 3 === 1 ? ' (rival vulnerable)' : ''}.`); events.push({actor:player.id,target:b.enemyId||'guardian',action,damage});
    } else {log.push('Te cubres: reduces el daño y recuperas energía.'); events.push({actor:player.id,target:player.id,action:'defend'});}
    if (b.hp === 0) { b.status = 'won'; player.coins += b.rewardCoins??10; if(!b.enemyId)player.guardianWins = (player.guardianWins || 0) + 1; else player.wildWins=(player.wildWins||0)+1; require('./expedition').gain(player,b.rewardXp??45); log.push(`¡Victoria! +${b.rewardCoins??10} monedas y +${b.rewardXp??45} EXP.`); }
    else {
      let damage = (b.damage||[5, 0, 14])[b.turn % 3];
      if (action === 'frost') {damage = Math.max(0, damage - 4);log.push('La escarcha reduce en 4 la respuesta del rival.');}
      if (action === 'brace') {damage = Math.ceil(damage * 0.5);log.push('Tu postura reduce a la mitad la respuesta rival.');}
      if (action === 'defend') damage = Math.ceil(damage * 0.25);
      player.hp = Math.max(0, player.hp - damage);
      events.push({actor:b.enemyId||'guardian',target:player.id,action:damage?'attack':'charge',damage});
      log.push(damage ? `${b.intent}: recibes ${damage} de daño.` : 'El rival se prepara para su siguiente acción.');
      if (player.hp === 0) { b.status = 'lost'; log.push('Duelo perdido. Puedes recuperarte e intentarlo de nuevo.'); }
    }
  }
  b.events = events; b.turn++; b.intent = (b.intents||intents)[b.turn % 3]; b.log = log;
  if (b.status !== 'active') {player.lastBattleAt = now;require('./encounters').finish(player,b,now);}
  return player;
}
const RESOURCE_COOLDOWN = { coin: 120000, fish: 180000 };
function itemZone(item) { return item.id==='c3'?'lake':item.id.startsWith('exp-')?['lake','forest','ruins'][Number(item.id.slice(4))%3]:'plaza'; }
function availableItems(player) { return ITEMS.filter(i=>itemZone(i)===require('./zones').zoneOf(player)).map(i=>({...i,availableAt:player.resourceReadyAt?.[i.id]||0})); }
function collect(player, itemId, now = Date.now()) {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item) fail(400, 'Objeto desconocido');
  if (itemZone(item)!==require('./zones').zoneOf(player)) fail(409,'Ese recurso está en otra zona');
  player.resourceReadyAt ||= {};
  if (now < (player.resourceReadyAt[itemId] || 0)) return player;
  if (!near(player, item, 30)) fail(409, 'Acércate al objeto');
  player.resourceReadyAt[itemId] = now + RESOURCE_COOLDOWN[item.type];
  if (!player.collected.includes(itemId)) player.collected.push(itemId);
  if (item.type === 'coin') player.coins += 3; else player.fish++;
  require('./expedition').gain(player,12);
  return player;
}
module.exports = { availableItems, RESOURCE_COOLDOWN, itemZone, NPC, ITEMS, fail, coordinates, newPlayer, startBattle, battleTurn, collect };
