const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newPlayer,collect,availableItems,RESOURCE_COOLDOWN}=require('../src/game');
const zones=require('../src/zones');
const {normalize,act}=require('../src/expedition');
const {MemoryStore}=require('../src/store');
const {createApp}=require('../src/app');

test('legacy collections respawn per player, persist their cooldown and never inflate unique collection quests',()=>{
 const p=normalize(newPlayer('A'));p.collected=['c1'];p.x=120;p.y=320;
 collect(p,'c1',1000);assert.equal(p.coins,3);
 const saved=JSON.parse(JSON.stringify(p));collect(saved,'c1',120999);assert.equal(saved.coins,3);
 collect(saved,'c1',121000);assert.equal(saved.coins,6);assert.deepEqual(saved.collected,['c1']);
 assert.equal(availableItems(saved).find(i=>i.id==='c1').availableAt,241000);
 const other=normalize(newPlayer('B'));other.x=120;other.y=320;collect(other,'c1',1001);assert.equal(other.coins,3);
 saved.zone='lake';saved.x=60;saved.y=80;collect(saved,'c3',1000);collect(saved,'c3',180999);assert.equal(saved.fish,1);
 collect(saved,'c3',181000);assert.equal(saved.fish,2);assert.equal(RESOURCE_COOLDOWN.fish,180000);
});
test('zone boundaries, portal proximity and active combat guard travel; fishing remains repeatable',()=>{
 const p=normalize(newPlayer('A'));assert.throws(()=>zones.travel(p,'to-lake',p),{status:409});
 zones.travel(p,'to-lake',{x:1300,y:450});assert.equal(p.zone,'lake');assert.equal(p.fishing,null);
 assert.throws(()=>collect({...p,x:120,y:320},'c1'),{status:409});
 assert.throws(()=>zones.check(p,'plaza'),{status:409});
 p.x=760;p.y=490;act(p,'cast','lake',20000);act(p,'catch','lake',22500);assert.equal(p.fish,1);
 act(p,'cast','lake',35000);act(p,'catch','lake',37500);assert.equal(p.fish,2);
 p.battle={status:'active'};assert.throws(()=>zones.travel(p,'return-lake',{x:230,y:500}),{status:409});
});
test('forest and ruins reward actual activities with cooldowns and bounded exchanges',()=>{
 const p=normalize(newPlayer('A'));p.zone='forest';
 for(const a of zones.places('forest').filter(a=>a.kind==='forage')){Object.assign(p,{x:a.x,y:a.y});zones.activity(p,a.id,1000);assert.throws(()=>zones.activity(p,a.id,59999),{status:409});}
 assert.equal(p.crystals,3);p.x=350;p.y=300;zones.activity(p,'workshop');assert.equal(p.coins,9);assert.equal(p.crystals,0);
 assert.throws(()=>zones.activity(p,'workshop'),{status:409});
 p.zone='ruins';p.x=640;p.y=330;zones.activity(p,'rune-moon',1000);assert.equal(p.runeStep,0);
 for(const id of ['rune-sun','rune-moon','rune-star']){const a=zones.places('ruins').find(a=>a.id===id);p.x=a.x;p.y=a.y;zones.activity(p,id,1000);}
 assert.equal(p.coins,17);assert.throws(()=>zones.activity(p,'rune-star',1001),{status:409});assert.equal(p.coins,17);
 p.zone='lake';p.x=1020;p.y=650;p.fish=2;zones.activity(p,'fish-market');assert.equal(p.coins,23);assert.equal(p.fish,0);
});
test('HTTP rooms isolate presence and chat, reject stale-zone actions and preserve travel on reconnect',async t=>{
 const store=new MemoryStore();const server=createApp({store,secret:'test',logger:()=>{}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 async function call(path,body,token){const r=await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 const a=(await call('join',{name:'A'})).data,b=(await call('join',{name:'B'})).data;
 const travel=await call('travel',{zone:'plaza',portal:'to-lake',x:1300,y:450},a.token);assert.equal(travel.status,200);
 await call('chat',{body:'Bahía',zone:'lake'},a.token);
 const plaza=(await call('sync',{x:320,y:340,zone:'plaza'},b.token)).data;assert.deepEqual(plaza.players.map(p=>p.id),[b.player.id]);assert.equal(plaza.messages.length,0);
 const lake=(await call('sync',{x:330,y:500,zone:'lake'},a.token)).data;assert.equal(lake.npc,null);assert.equal(lake.messages[0].body,'Bahía');assert.ok(lake.places.some(p=>p.id==='lake'));assert.equal(lake.zones.length,5);
 assert.equal((await call('collect',{x:120,y:320,itemId:'c1',zone:'plaza'},a.token)).status,409);
 assert.equal((await call('shop/buy',{x:390,y:310,itemId:'hat',zone:'lake'},a.token)).status,409);
 assert.equal((await call('arena/challenge',{targetId:b.player.id},a.token)).status,409);
 assert.equal((await call('me',undefined,a.token)).data.player.zone,'lake');
 // Returning does not reset pickup cooldowns.
 await call('travel',{portal:'return-lake',x:230,y:500,zone:'lake'},a.token);
 const buys=await Promise.all([call('collect',{itemId:'c1',x:120,y:320,zone:'plaza'},a.token),call('collect',{itemId:'c1',x:120,y:320,zone:'plaza'},a.token)]);
 assert.ok(buys.every(r=>r.status===200));assert.equal((await store.get(a.player.id)).coins,3);
 store.arena={status:'pending',expiresAt:Date.now()+60000,fighters:[{id:a.player.id},{id:b.player.id}]};
 assert.equal((await call('travel',{portal:'to-lake',x:1300,y:450,zone:'plaza'},a.token)).status,409);
});
