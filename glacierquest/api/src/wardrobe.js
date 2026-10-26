const { fail } = require('./game');

const catalog = Object.freeze({
  shop: Object.freeze({ id: 'shop', name: 'Tienda Boreal', x: 390, y: 310, kind: 'shop', radius: 70, hint: 'Entra a la tienda de accesorios' }),
  colors: Object.freeze([
    { id: 'blue', name: 'Turquesa', color: '#36b5d8' },
    { id: 'purple', name: 'Lila', color: '#a78bfa' },
    { id: 'gold', name: 'Dorado', color: '#f59e0b' },
    { id: 'pink', name: 'Rosa', color: '#f472b6' },
  ].map(Object.freeze)),
  accessories: Object.freeze([
    { id: 'hat', name: 'Gorro explorador', price: 6, hp: 0, attack: 0 },
    { id: 'scarf', name: 'Bufanda polar', price: 9, hp: 4, attack: -1 },
    { id: 'glasses', name: 'Gafas de nieve', price: 12, hp: -4, attack: 1 },
    { id: 'earmuffs', name: 'Orejeras de aurora', price: 8, hp: 0, attack: 0 },
    { id: 'crown', name: 'Corona de hielo', price: 18, hp: 0, attack: 0 },
    { id: 'vest', name: 'Chaleco de expedición', price: 24, hp: 6, attack: 0 },
    { id: 'sword', name: 'Espada de escarcha', price: 30, hp: 0, attack: 2 },
    { id: 'pendant', name: 'Amuleto de aurora', price: 26, hp: 0, attack: 0, maxFocus: 4 },
    { id: 'gloves', name: 'Guantes de impulso', price: 32, hp: 0, attack: 0, attackRecovery: 2 },
  ].map(Object.freeze)),
});

function validColor(value) {
  return typeof value === 'string' && catalog.colors.find(c => c.color === value.toLowerCase())?.color;
}
function item(id) { return catalog.accessories.find(a => a.id === id); }
function owned(player) { return Array.isArray(player?.ownedCosmetics) ? player.ownedCosmetics : []; }
function checkPlayer(player) {
  if (!player || typeof player !== 'object' || Array.isArray(player)) fail(400, 'Jugador inválido');
}

// Legacy players have no wardrobe. Rendering defaults never changes their stored data.
function appearance(player) {
  const accessory = player?.avatar?.accessory;
  return {
    color: validColor(player?.avatar?.color) || catalog.colors[0].color,
    accessory: item(accessory) && owned(player).includes(accessory) ? accessory : null,
  };
}

function customize(player, options) {
  checkPlayer(player);
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail(400, 'Apariencia inválida');
  const current = appearance(player);
  const color = Object.hasOwn(options, 'color') ? validColor(options.color) : current.color;
  if (!color) fail(400, 'Elige un color del catálogo');
  const accessory = Object.hasOwn(options, 'accessory') ? options.accessory : current.accessory;
  if (accessory !== null && !item(accessory)) fail(400, 'Accesorio desconocido');
  if (accessory !== null && !owned(player).includes(accessory)) fail(409, 'Compra este accesorio antes de equiparlo');
  player.avatar = { ...player.avatar, color, accessory };
  player.ownedCosmetics = [...owned(player)];
  return player;
}

function buy(player, itemId) {
  checkPlayer(player);
  const selected = item(itemId);
  if (!selected) fail(400, 'Accesorio desconocido');
  // Retried requests are harmless; the store must execute this inside its player transaction.
  if (owned(player).includes(itemId)) return player;
  if (!Number.isSafeInteger(player.coins) || player.coins < 0) fail(409, 'Saldo de monedas inválido');
  if (player.coins < selected.price) fail(409, 'No tienes suficientes monedas');
  const previousAppearance = appearance(player);
  player.coins -= selected.price;
  player.ownedCosmetics = [...owned(player), itemId];
  player.avatar = { ...player.avatar, ...previousAppearance };
  return player;
}

function duelLoadout(player) {
  const avatar = appearance(player), gear = item(avatar.accessory);
  return { avatar, maxHp: 40 + (gear?.hp || 0), attack: 10 + (gear?.attack || 0), maxFocus: gear?.maxFocus || 3, attackRecovery: gear?.attackRecovery || 1 };
}
function purchaseAt(player, itemId, pos) {
  if(require('./zones').zoneOf(player)!=='plaza') fail(409,'La tienda está en la plaza');
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || Math.hypot(pos.x-catalog.shop.x,pos.y-catalog.shop.y)>catalog.shop.radius) fail(409,'Acércate a la Tienda Boreal');
  if (player.battle?.status === 'active') fail(409,'Termina el combate antes de comprar');
  return buy(player, itemId);
}
module.exports = { catalog, appearance, customize, buy, duelLoadout, purchaseAt };
