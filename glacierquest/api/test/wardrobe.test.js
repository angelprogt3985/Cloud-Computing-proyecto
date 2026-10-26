const test = require('node:test');
const assert = require('node:assert/strict');
const { catalog, appearance, customize, buy } = require('../src/wardrobe');

function failsWith(status, fn) {
  assert.throws(fn, error => error.status === status);
}

test('legacy players get a valid appearance without modifying stored progress', () => {
  const player = { id: 'old', coins: 8, collected: ['c1'], hp: 23, level: 2 };
  const before = structuredClone(player);
  assert.deepEqual(appearance(player), { color: catalog.colors[0].color, accessory: null });
  assert.deepEqual(player, before);
  assert.deepEqual(appearance(null), appearance(player));
});

test('four free colors preserve balances and unrelated player data', () => {
  const player = { coins: 0, hp: 23, level: 2, collected: ['c1'], futureField: 'keep' };
  assert.equal(catalog.colors.length, 4);
  for (const color of catalog.colors) {
    assert.equal(customize(player, { color: color.color }), player);
    assert.deepEqual(appearance(player), { color: color.color, accessory: null });
    assert.equal(player.coins, 0);
  }
  assert.equal(player.hp, 23);
  assert.equal(player.level, 2);
  assert.equal(player.futureField, 'keep');
  assert.deepEqual(player.collected, ['c1']);
  assert.deepEqual(player.ownedCosmetics, []);
});

test('buy uses server prices, preserves combat stats, and never charges repeated purchases', () => {
  const player = { coins: 180, hp: 17, maxHp: 30, level: 4, avatar: { future: true } };
  assert.equal(catalog.accessories.length, 9);
  for (const accessory of catalog.accessories) {
    const previousCoins = player.coins;
    assert.equal(buy(player, accessory.id), player);
    assert.equal(player.coins, previousCoins - accessory.price);
    const purchased = structuredClone(player);
    buy(player, accessory.id);
    assert.deepEqual(player, purchased);
    assert.equal(player.ownedCosmetics.filter(id => id === accessory.id).length, 1);
  }
  assert.equal(player.coins, 15);
  assert.equal(player.hp, 17);
  assert.equal(player.maxHp, 30);
  assert.equal(player.level, 4);
  assert.equal(player.avatar.future, true);
  assert.equal(player.avatar.accessory, null);
});

test('only owned catalog accessories can be equipped; unequipping keeps ownership', () => {
  const player = { coins: 12 };
  failsWith(409, () => customize(player, { accessory: 'glasses' }));
  assert.deepEqual(player, { coins: 12 });
  buy(player, 'glasses');
  customize(player, { color: '#A78BFA', accessory: 'glasses' });
  assert.deepEqual(appearance(player), { color: '#a78bfa', accessory: 'glasses' });
  customize(player, { accessory: null });
  assert.equal(player.avatar.accessory, null);
  assert.equal(player.avatar.color, '#a78bfa');
  assert.deepEqual(player.ownedCosmetics, ['glasses']);
  assert.equal(player.coins, 0);
});

test('invalid catalog input or insufficient funds cannot partially update a player', () => {
  const player = { coins: 5, avatar: { color: '#f472b6', accessory: null }, ownedCosmetics: [] };
  const before = structuredClone(player);
  for (const id of ['missing', '__proto__', null, {}, 2]) failsWith(400, () => buy(player, id));
  failsWith(409, () => buy(player, 'hat'));
  for (const options of [null, [], { color: '#ffffff' }, { color: 2 }, { accessory: 'missing' }, { color: '#36b5d8', accessory: 'hat' }]) {
    assert.throws(() => customize(player, options));
    assert.deepEqual(player, before);
  }
});

test('invalid balances cannot buy and malformed legacy appearances are safe to render', () => {
  for (const coins of [undefined, null, '20', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const player = { coins };
    failsWith(409, () => buy(player, 'hat'));
    assert.equal(player.coins, coins);
    assert.equal(player.ownedCosmetics, undefined);
  }
  for (const player of [
    { avatar: { color: 'red', accessory: 'hat' } },
    { avatar: { color: 42, accessory: 'glasses' }, ownedCosmetics: 'glasses' },
    { avatar: { accessory: 'unknown' }, ownedCosmetics: ['unknown'] },
  ]) {
    const before = structuredClone(player);
    assert.deepEqual(appearance(player), { color: catalog.colors[0].color, accessory: null });
    assert.deepEqual(player, before);
  }
});
