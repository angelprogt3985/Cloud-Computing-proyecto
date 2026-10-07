const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newPlayer, startBattle, battleTurn, collect, coordinates } = require('../src/game');
const fighter = () => startBattle({ ...newPlayer('Pablo'), x: 520, y: 160 });
const act = (p,a) => battleTurn(p,a,p.battle.id,p.battle.turn);
test('enemy responds, charge creates vulnerability, defense reduces storm', () => {
  const p=fighter(); act(p,'attack'); assert.equal(p.hp,25); assert.equal(p.battle.hp,28);
  act(p,'attack'); assert.equal(p.battle.hp,16); assert.equal(p.hp,25);
  act(p,'defend'); assert.equal(p.hp,21);
  act(p,'attack'); act(p,'attack'); assert.equal(p.battle.status,'won'); assert.equal(p.coins,10);
  assert.throws(()=>act(p,'attack'),{status:409}); assert.equal(p.coins,10);
});
test('stale turn cannot grant duplicate rewards',()=>{const p=fighter(),id=p.battle.id;act(p,'attack');assert.throws(()=>battleTurn(p,'attack',id,0),{status:409});});
test('healing is bounded and consumes a turn; fleeing ends duel',()=>{const p=fighter();assert.throws(()=>act(p,'heal'),{status:409});act(p,'attack');act(p,'heal');assert.equal(p.hp,30);assert.equal(p.battle.potions,1);act(p,'run');assert.equal(p.battle.status,'escaped');assert.equal(p.coins,0);});
test('doing nothing but defending eventually loses',()=>{const p=fighter();for(let i=0;i<40&&p.battle.status==='active';i++)act(p,'defend');assert.equal(p.battle.status,'lost');assert.equal(p.hp,0);});
test('collect requires proximity and is idempotent',()=>{const p=newPlayer('A');assert.throws(()=>collect(p,'c1'),{status:409});p.x=120;p.y=320;collect(p,'c1');collect(p,'c1');assert.equal(p.coins,3);assert.equal(p.collected.length,1);});
test('invalid names, coordinates, and distant battles rejected',()=>{assert.throws(()=>newPlayer({}),{status:400});assert.throws(()=>coordinates(NaN,20),{status:400});assert.throws(()=>coordinates(700,20),{status:400});assert.throws(()=>startBattle(newPlayer('A')),{status:409});});
