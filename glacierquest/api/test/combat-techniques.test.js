const {test}=require('node:test');
const assert=require('node:assert/strict');
const game=require('../src/game'),arena=require('../src/arena');
const fighter=()=>game.startBattle({...game.newPlayer('A'),x:520,y:160});
const act=(p,action)=>game.battleTurn(p,action,p.battle.id,p.battle.turn);
test('PvE techniques spend energy, reject overspending without mutations, recharge and preserve version checks',()=>{
 const p=fighter();act(p,'power');assert.equal(p.battle.hp,20);assert.equal(p.battle.focus,0);
 const snapshot=JSON.stringify(p);assert.throws(()=>act(p,'frost'),{status:409});assert.equal(JSON.stringify(p),snapshot);
 act(p,'defend');assert.equal(p.battle.focus,1);
 const old=p.battle.turn;act(p,'frost');assert.equal(p.hp,15);assert.equal(p.battle.hp,14);assert.equal(p.battle.focus,0);
 assert.equal(p.battle.events[0].action,'frost');assert.equal(p.battle.events[1].damage,10);
 assert.throws(()=>game.battleTurn(p,'frost',p.battle.id,old),{status:409});
});
test('old saved battles gain compatible energy; frost can finish battle and pays rewards once',()=>{
 const p=fighter();delete p.battle.focus;p.battle.hp=6;act(p,'frost');assert.equal(p.battle.status,'won');assert.equal(p.battle.focus,1);assert.equal(p.coins,10);assert.equal(p.xp,45);
 assert.throws(()=>act(p,'frost'),{status:409});assert.equal(p.coins,10);
});
test('PvP frost weakens one attack, energy is per fighter and rejected moves leave state untouched',()=>{
 const p=game.newPlayer('A'),q=game.newPlayer('B'),a=arena.challenge(null,p,q);arena.respond(a,q.id,a.id,true);
 const move=(id,action)=>arena.turn(a,id,a.id,a.turn,action);
 move(p.id,'frost');assert.equal(a.fighters[1].hp,34);assert.equal(a.fighters[0].focus,1);
 move(q.id,'power');assert.equal(a.fighters[0].hp,28);assert.equal(a.fighters[1].chilled,false);assert.equal(a.fighters[1].focus,0);
 const snapshot=JSON.stringify(a);assert.throws(()=>move(p.id,'power'),{status:409});assert.equal(JSON.stringify(a),snapshot);
 move(p.id,'defend');move(q.id,'attack');assert.equal(a.fighters[0].hp,25);assert.equal(a.fighters[0].focus,2);assert.equal(a.fighters[1].focus,1);
});
test('PvP invalid healing does not clear defense or alter energy, even for direct store callers',()=>{
 const p=game.newPlayer('A'),q=game.newPlayer('B'),a=arena.challenge(null,p,q);arena.respond(a,q.id,a.id,true);
 a.fighters[0].guard=true;const snapshot=JSON.stringify(a);
 assert.throws(()=>arena.turn(a,p.id,a.id,0,'heal'),{status:409});assert.equal(JSON.stringify(a),snapshot);
});
