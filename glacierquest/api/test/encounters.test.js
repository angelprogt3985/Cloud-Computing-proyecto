const test=require('node:test'),assert=require('node:assert/strict');
const {newPlayer,battleTurn}=require('../src/game');
const {normalize}=require('../src/expedition');
const E=require('../src/encounters');
const {createApp}=require('../src/app');
const {MemoryStore}=require('../src/store');
function player(e,now){const p=normalize(newPlayer('Explorador'));p.zone='wilds';Object.assign(p,E.position(e,now));return p;}
test('patrol positions move; encounter validates zone, distance and grace period',()=>{
 const e=E.TYPES[0],p=player(e,10000);
 assert.notDeepEqual(E.position(e,10000),E.position(e,12000));
 p.zone='plaza';assert.equal(E.list(p).length,0);assert.throws(()=>E.start(p,e.id,10000),{status:409});
 p.zone='wilds';p.x=230;p.y=500;assert.throws(()=>E.start(p,e.id,10000),{status:409});
 Object.assign(p,E.position(e,10000));p.encounterSafeUntil=11000;assert.throws(()=>E.start(p,e.id,10000),{status:409});
 p.encounterSafeUntil=0;E.start(p,e.id,10000);const id=p.battle.id;E.start(p,e.id,10001);assert.equal(p.battle.id,id);
});
test('each enemy uses its pattern and awards a single persistent reward',()=>{
 for(const e of E.TYPES){const p=player(e,10000);E.start(p,e.id,10000);assert.deepEqual(p.battle.damage,e.damage);
 p.battle.hp=1;const id=p.battle.id;battleTurn(p,'attack',id,0,11000);
 assert.equal(p.coins,e.coins);assert.equal(p.xp,e.xp);assert.equal(p.guardianWins,0);assert.equal(p.wildWins,1);
 assert.throws(()=>battleTurn(p,'attack',id,0,11001),{status:409});
 const saved=JSON.parse(JSON.stringify(p));assert.ok(!E.list(saved,11001).some(v=>v.id===e.id));assert.ok(E.list(saved,101000).some(v=>v.id===e.id));}
});
test('escape gives no reward; defeat restores enough health to leave and gives protection',()=>{
 const e=E.TYPES[0],p=player(e,10000);E.start(p,e.id,10000);battleTurn(p,'run',p.battle.id,0,11000);assert.equal(p.coins,0);assert.equal(p.xp,0);assert.equal(p.encounterSafeUntil,23000);
 const q=player(e,10000);E.start(q,e.id,10000);q.hp=1;battleTurn(q,'attack',q.battle.id,0,11000);assert.equal(q.battle.status,'lost');assert.ok(q.hp>0);assert.equal(q.encounterSafeUntil,23000);assert.equal(q.coins,0);
});
test('HTTP encounter persists across reconnect and blocks PvP overlap and travel',async t=>{
 const store=new MemoryStore(),server=createApp({store,secret:'test',logger:()=>{}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 let token;
 async function call(path,body){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 const joined=(await call('join',{name:'Prueba'})).data;token=joined.token;
 await call('travel',{portal:'to-wilds',zone:'plaza',x:1350,y:820});
 await store.mutate(joined.player.id,p=>{p.encounterSafeUntil=0;return p;});
 const e=E.list({zone:'wilds'})[0],body={enemyId:e.id,zone:'wilds',x:e.x,y:e.y};
 store.arena={status:'pending',expiresAt:Date.now()+60000,fighters:[{id:joined.player.id},{id:'other'}]};
 assert.equal((await call('battle/start',body)).status,409);store.arena=null;
 const started=await call('battle/start',body);assert.equal(started.status,200);assert.equal(started.data.player.battle.enemyId,e.id);
 assert.equal((await call('me')).data.player.battle.id,started.data.player.battle.id);
 assert.equal((await call('travel',{portal:'return-wilds',zone:'wilds',x:230,y:500})).status,409);
});
