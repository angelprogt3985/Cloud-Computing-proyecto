const { fail } = require('./game');
const WORLD = { width: 1600, height: 1000 };
const PLACES = [
  { id: 'camp', name: 'Refugio Boreal', x: 320, y: 340, kind: 'camp', hint: 'Descansa y recupera tu salud' },
  { id: 'lake', name: 'Lago de los ecos', x: 760, y: 490, kind: 'fish', hint: 'Pulsa E para lanzar el anzuelo' },
  { id: 'forest', name: 'Bosque de escarcha', x: 1190, y: 750, kind: 'explore', hint: 'Descubre el bosque y gana experiencia' },
  { id: 'ruins', name: 'Ruinas del norte', x: 1260, y: 210, kind: 'explore', hint: 'Encuentra los vestigios de la expedición' },
  { id: 'arena', name: 'Círculo de los valientes', x: 360, y: 790, kind: 'arena', hint: 'Desafía a otro explorador de la sala' }
];
function normalize(p) {
  if (!p) return p;
  p.xp ??= 0; p.level = Math.floor(Math.sqrt(p.xp / 60)) + 1;
  p.maxHp = 30 + (p.level - 1) * 4; p.hp = Math.min(p.hp ?? p.maxHp, p.maxHp);
  p.zone = require('./zones').zoneOf(p);
  p.collected ||= []; p.discovered ||= []; p.claimedQuests ||= [];
  p.guardianWins ||= 0; p.pvpWins ||= 0; p.catches ||= 0;
  return p;
}
function gain(p, xp) {
  normalize(p); const old = p.level; p.xp += xp; normalize(p);
  if (p.level > old) p.hp = p.maxHp;
  return p;
}
const QUESTS = [
  { id: 'scout', name: 'Cartógrafo del hielo', goal: 3, xp: 90, coins: 15, field: 'discovered' },
  { id: 'collector', name: 'Bolsillos llenos', goal: 5, xp: 60, coins: 12, field: 'collected' },
  { id: 'angler', name: 'La paciencia del pescador', goal: 3, xp: 80, coins: 15, field: 'catches' },
  { id: 'guardian', name: 'Romper el hielo', goal: 1, xp: 70, coins: 20, field: 'guardianWins' }
];
function quests(p) { normalize(p); return QUESTS.map(q => ({ ...q, current: Math.min(q.goal, Array.isArray(p[q.field]) ? p[q.field].length : p[q.field]), claimed: p.claimedQuests.includes(q.id) })); }
function act(p, action, id, now = Date.now()) {
  normalize(p);
  if (p.battle?.status === 'active') fail(409, 'Termina el combate primero');
  if (action === 'quest') {
    const q = quests(p).find(q => q.id === id);
    if (!q || q.current < q.goal) fail(409, 'Todavía faltan objetivos');
    if (q.claimed) return p;
    p.claimedQuests.push(id); p.coins += q.coins; return gain(p,q.xp);
  }
  const place = PLACES.find(v => v.id === id);
  const expected=id==='lake'?'lake':'plaza';
  if(require('./zones').zoneOf(p)!==expected) fail(409,'Esta actividad está en otra zona');
  if (!place || Math.hypot(p.x-place.x,p.y-place.y)>85) fail(409,'Acércate al lugar para interactuar');
  if (!p.discovered.includes(id)) { p.discovered.push(id); gain(p,20); }
  if (action === 'rest' && place.kind === 'camp') p.hp = p.maxHp;
  else if (action === 'explore') { /* Discovery is rewarded once. */ }
  else if (action === 'cast' && place.kind === 'fish') {
    if (now - (p.lastFishAt || 0) < 15000) fail(429,'Espera unos segundos antes de volver a pescar');
    p.lastFishAt = now; p.fishing = { startedAt: now, biteAt: now + 2500, until: now + 4300 };
  } else if (action === 'catch' && place.kind === 'fish') {
    if (!p.fishing || now < p.fishing.biteAt || now > p.fishing.until) fail(409,'El pez escapó. Lanza de nuevo y espera la señal');
    p.fishing = null; p.fish++; p.catches++; gain(p,20);
  } else fail(400,'Acción no disponible aquí');
  return p;
}
module.exports = { WORLD, PLACES, normalize, gain, quests, act };
