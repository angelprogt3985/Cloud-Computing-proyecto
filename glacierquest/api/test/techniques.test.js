const {test}=require('node:test');
const assert=require('node:assert/strict');
const game=require('../src/game');
const arena=require('../src/arena');
function pve(level){const p=game.newPlayer('Explorer');p.x=520;p.y=160;p.xp=60*(level-1)**2;game.startBattle(p,20000);return p;}
function duel(level){const p=pve(level),q=pve(1);const a=arena.challenge(null,p,q,20000);arena.respond(a,q.id,a.id,true,21000);return a;}
test('locked techniques and insufficient energy cannot mutate PvE or PvP',()=>{
 for(const [action,level] of [['brace',2],['nova',4],['nova',5]]){
  const p=pve(level),before=structuredClone(p);
  assert.throws(()=>game.battleTurn(p,action,p.battle.id,0,22000),{status:409});assert.deepEqual(p,before);
  const a=duel(level),original=structuredClone(a);
  assert.throws(()=>arena.turn(a,a.next,a.id,0,action,22000),{status:409});assert.deepEqual(a,original);
 }
});
test('level 3 cautious strike deals damage, costs energy and halves the response',()=>{
 const p=pve(3);game.battleTurn(p,'brace',p.battle.id,0,22000);
 assert.equal(p.battle.hp,27);assert.equal(p.battle.focus,1);assert.equal(p.hp,p.maxHp-3);
 const a=duel(3),[me,enemy]=a.fighters;
 arena.turn(a,me.id,a.id,0,'brace',22000);assert.equal(enemy.hp,33);assert.equal(me.focus,1);
 arena.turn(a,enemy.id,a.id,1,'attack',23000);assert.equal(me.hp,35);assert.equal(me.braced,false);
});
test('level 5 nova spends three energy and existing attacks stay available',()=>{
 const p=pve(5);p.battle.focus=3;game.battleTurn(p,'nova',p.battle.id,0,22000);
 assert.equal(p.battle.hp,10);assert.equal(p.battle.focus,0);
 const a=duel(5),[me,enemy]=a.fighters;me.focus=3;
 arena.turn(a,me.id,a.id,0,'nova',22000);assert.equal(enemy.hp,18);assert.equal(me.focus,0);
 arena.turn(a,enemy.id,a.id,1,'defend',23000);arena.turn(a,me.id,a.id,2,'attack',24000);assert.equal(me.focus,1);
});
test('duel level is fixed at invitation and cautious stance expires after the rival turn',()=>{
 const p=pve(3),q=pve(1),a=arena.challenge(null,p,q,20000);p.level=5;
 arena.respond(a,q.id,a.id,true,21000);assert.equal(a.fighters[0].level,3);
 arena.turn(a,p.id,a.id,0,'brace',22000);arena.turn(a,q.id,a.id,1,'defend',23000);
 arena.turn(a,p.id,a.id,2,'attack',24000);arena.turn(a,q.id,a.id,3,'attack',25000);
 assert.equal(a.fighters[0].hp,30);
});
