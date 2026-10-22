const {test}=require('node:test');
const assert=require('node:assert/strict');
const wardrobe=require('../src/wardrobe');
const arena=require('../src/arena');
function player(id,accessory=null){return {id,name:id,coins:30,avatar:{color:'#36b5d8',accessory},ownedCosmetics:accessory?[accessory]:[]};}

test('equipment trades health for damage, cannot stack, and ignores unowned or forged bonuses',()=>{
 for(const [id,hp,attack] of [[null,40,10],['hat',40,10],['scarf',44,9],['glasses',36,11]]){
  const p=player('a',id);p.attack=999;p.maxHp=999;p.avatar.hp=999;
  const before=structuredClone(p),loadout=wardrobe.duelLoadout(p);
  assert.equal(loadout.maxHp,hp);assert.equal(loadout.attack,attack);assert.deepEqual(p,before);
 }
 const forged=player('a','glasses');forged.ownedCosmetics=[];
 assert.equal(wardrobe.duelLoadout(forged).attack,10);
 const p=player('a','scarf');p.ownedCosmetics.push('glasses');
 wardrobe.customize(p,{accessory:'glasses'});
 assert.equal(wardrobe.duelLoadout(p).maxHp,36);
});

test('duel equipment is snapshotted at invitation; defense and healing respect modified stats',()=>{
 const p=player('a','scarf'),q=player('b','glasses');
 const a=arena.challenge(null,p,q,1000);wardrobe.customize(p,{accessory:null});
 assert.equal(a.fighters[0].maxHp,44);assert.equal(a.fighters[0].avatar.accessory,'scarf');
 arena.respond(a,'b',a.id,true,2000);
 arena.turn(a,'a',a.id,0,'defend',3000);arena.turn(a,'b',a.id,1,'attack',4000);
 assert.equal(a.fighters[0].hp,40); // ceil(11 * .3)
 arena.turn(a,'a',a.id,2,'heal',5000);assert.equal(a.fighters[0].hp,44);
 arena.turn(a,'b',a.id,3,'defend',6000);arena.turn(a,'a',a.id,4,'attack',7000);
 assert.equal(a.fighters[1].hp,33); // ceil(9 * .3)
});

test('old active duels without equipment still use the original damage',()=>{
 const a=arena.challenge(null,player('a'),player('b'),1000);
 for(const fighter of a.fighters){delete fighter.attack;delete fighter.avatar;}
 arena.respond(a,'b',a.id,true,2000);arena.turn(a,'a',a.id,0,'attack',3000);
 assert.equal(a.fighters[1].hp,30);
});

test('physical shop rejects distance and active PvE before charging',()=>{
 const p=player('a'),before=structuredClone(p);
 for(const pos of [null,{x:NaN,y:310},{x:700,y:310}])assert.throws(()=>wardrobe.purchaseAt(p,'hat',pos),{status:409});
 assert.deepEqual(p,before);p.battle={status:'active'};
 assert.throws(()=>wardrobe.purchaseAt(p,'hat',{x:390,y:310}),{status:409});assert.equal(p.coins,30);
 p.battle.status='won';wardrobe.purchaseAt(p,'hat',{x:390,y:310});assert.equal(p.coins,24);
});

test('all equipment matchups end with a finite winner and bounded health',()=>{
 for(const one of [null,'hat','scarf','glasses'])for(const two of [null,'hat','scarf','glasses']){
  const a=arena.challenge(null,player('a',one),player('b',two),1000);arena.respond(a,'b',a.id,true,2000);
  while(a.status==='active'&&a.turn<20){arena.turn(a,a.next,a.id,a.turn,'attack',3000+a.turn*100);for(const p of a.fighters)assert.ok(p.hp>=0&&p.hp<=p.maxHp);}
  assert.equal(a.status,'finished');assert.ok(['a','b'].includes(a.winner));
 }
});

test('energy equipment is owned, fixed at invitation and respects recovery caps',()=>{
 const p=player('a','pendant'),q=player('b','gloves');
 const a=arena.challenge(null,p,q,1000);wardrobe.customize(p,{accessory:null});
 arena.respond(a,'b',a.id,true,2000);
 arena.turn(a,'a',a.id,0,'defend',3000);arena.turn(a,'b',a.id,1,'attack',4000);
 assert.equal(a.fighters[1].focus,3);
 arena.turn(a,'a',a.id,2,'defend',5000);assert.equal(a.fighters[0].focus,4);
 arena.turn(a,'b',a.id,3,'power',6000);assert.equal(a.fighters[1].focus,1);
 arena.turn(a,'a',a.id,4,'power',7000);assert.equal(a.fighters[0].focus,2);
 arena.turn(a,'b',a.id,5,'attack',8000);assert.equal(a.fighters[1].focus,3);
 const unowned=player('x','pendant');unowned.ownedCosmetics=[];
 assert.equal(wardrobe.duelLoadout(unowned).maxFocus,3);
});
