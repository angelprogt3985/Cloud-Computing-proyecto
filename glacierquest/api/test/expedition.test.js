const {test}=require('node:test');const assert=require('node:assert/strict');
const {newPlayer,collect}=require('../src/game');const {normalize,gain,act}=require('../src/expedition');
const arena=require('../src/arena');const {MemoryStore}=require('../src/store');const {createApp}=require('../src/app');
test('legacy profiles migrate; XP thresholds and quest claims persist without duplicate rewards',()=>{
 const p=normalize(newPlayer('A'));gain(p,59);assert.equal(p.level,1);gain(p,1);assert.equal(p.level,2);assert.equal(p.maxHp,34);
 p.x=120;p.y=320;collect(p,'c1');const xp=p.xp;collect(p,'c1');assert.equal(p.xp,xp);
 p.collected=['a','b','c','d','e'];act(p,'quest','collector');const after=p.xp;act(p,'quest','collector');assert.equal(p.xp,after);
});
test('fishing rejects distance and early/late catches; a successful catch cannot be replayed',()=>{
 const p=newPlayer('A');assert.throws(()=>act(p,'cast','lake',20000),{status:409});p.x=760;p.y=490;
 act(p,'cast','lake',20000);assert.throws(()=>act(p,'catch','lake',21000),{status:409});act(p,'catch','lake',23000);
 assert.equal(p.catches,1);assert.throws(()=>act(p,'catch','lake',23001),{status:409});assert.throws(()=>act(p,'cast','lake',24000),{status:429});
 act(p,'cast','lake',40000);assert.throws(()=>act(p,'catch','lake',45000),{status:409});
});
test('duels require consent, enforce actors and versions, defense and expiry',()=>{
 const p=newPlayer('A'),q=newPlayer('B');let a=arena.challenge(null,p,q,1000);
 assert.throws(()=>arena.turn(a,p.id,a.id,0,'attack',2000),{status:409});
 assert.throws(()=>arena.respond(a,p.id,a.id,true,2000),{status:409});
 arena.respond(a,q.id,a.id,true,2000);assert.throws(()=>arena.turn(a,q.id,a.id,0,'attack',3000),{status:409});
 arena.turn(a,p.id,a.id,0,'defend',3000);arena.turn(a,q.id,a.id,1,'attack',4000);assert.equal(a.fighters[0].hp,37);
 assert.throws(()=>arena.turn(a,p.id,a.id,0,'attack',4000),{status:409});
 assert.throws(()=>arena.turn(a,'intruder',a.id,2,'attack',4000),{status:403});
 assert.equal(arena.expired(a,100000).status,'expired');
});
test('email login reuses profile; simultaneous PvP turns and settlement award once',async t=>{
 const store=new MemoryStore(),logs=[];const app=createApp({store,secret:'test',demoCode:'class',logger:x=>logs.push(x),accountAuth:async b=>{if(b.password!=='correct-password')throw Object.assign(new Error('Invalid'),{status:401});return {uid:b.email};}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}`;
 async function call(route,body,token){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,d:await r.json()};}
 const login=email=>call('account',{mode:'login',email,password:'correct-password',name:email,code:'class'});
 const a=(await login('a')).d,b=(await login('b')).d;
 await store.mutate(a.player.id,p=>gain(p,125));assert.equal((await login('a')).d.player.xp,125);
 assert.notEqual(a.player.id,b.player.id);
 assert.equal((await call('account',{email:'a',password:'wrong',code:'class'})).status,401);
 const duel=(await call('arena/challenge',{targetId:b.player.id},a.token)).d.arena;
 await call('arena/respond',{id:duel.id,accept:true},b.token);
 const payload={id:duel.id,turn:0,action:'attack'};
 const race=await Promise.all([call('arena/turn',payload,a.token),call('arena/turn',payload,a.token)]);
 assert.deepEqual(race.map(v=>v.status).sort(),[200,409]);
 await call('arena/turn',{id:duel.id,turn:1,action:'run'},b.token);
 await Promise.all([call('sync',{x:320,y:340},a.token),call('sync',{x:320,y:340},b.token)]);
 assert.equal((await store.get(a.player.id)).xp,185);assert.equal((await store.get(a.player.id)).coins,10);
 assert.equal((await store.get(b.player.id)).xp,15);assert.ok(logs.every(l=>!l.includes('correct-password')));
});
test('linking a guest requires its signed session and cannot be claimed by another account',async t=>{
 const store=new MemoryStore();const app=createApp({store,secret:'test',logger:()=>{},accountAuth:async b=>({uid:b.email})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const url=`http://127.0.0.1:${server.address().port}/api/`;
 const call=async(path,body,token)=>{const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,d:await r.json()};};
 const guest=(await call('join',{name:'Original'})).d;await store.mutate(guest.player.id,p=>gain(p,200));
 const linked=await call('account',{email:'one',name:'New'},guest.token);assert.equal(linked.d.player.xp,200);assert.equal(linked.d.player.name,'Original');
 const stolen=await call('account',{email:'two'},guest.token);assert.equal(stolen.status,409);
 const forged=await call('account',{email:'three'},guest.token+'x');assert.equal(forged.status,401);
});
