const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../src/app');
const {MemoryStore}=require('../src/store');

test('New arrivals cannot retrieve earlier chat; wardrobe persists and purchases are idempotent through HTTP',async t=>{
 const store=new MemoryStore();
 const server=createApp({store,secret:'local-test-key',logger:()=>{}}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/api/`;
 async function call(route,body,token){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
 const a=(await call('join',{name:'Alex'})).data;
 store.messages.push({id:'earlier',player_id:a.player.id,player_name:'Alex',body:'Before arrival',createdAt:Date.now()-1000});
 const b=(await call('join',{name:'Alex'})).data;
 const room=(await call('sync',{x:320,y:340},b.token)).data;
 assert.equal(room.messages.length,0);
 const sent=await call('chat',{body:'After arrival',player_id:b.player.id},a.token);
 assert.equal(sent.data.message.player_id,a.player.id);
 assert.equal((await call('sync',{x:320,y:340},b.token)).data.messages[0].body,'After arrival');
 assert.equal((await call('avatar',{accessory:'hat'},a.token)).status,409);
 await store.mutate(a.player.id,p=>({...p,coins:12,duelRewards:{private:true},linkedAccount:'private'}));
 const buys=await Promise.all([call('shop/buy',{itemId:'hat',price:0,playerId:b.player.id,x:390,y:310},a.token),call('shop/buy',{itemId:'hat',x:390,y:310},a.token)]);
 assert.ok(buys.every(r=>r.status===200));
 assert.equal((await store.get(a.player.id)).coins,6);
 assert.equal((await store.get(b.player.id)).coins,0);
 const customized=await call('avatar',{color:'#a78bfa',accessory:'hat'},a.token);
 assert.equal(customized.status,200);
 assert.equal((await call('me',undefined,a.token)).data.player.avatar.accessory,'hat');
 const visible=(await call('profile/'+a.player.id,undefined,b.token)).data.profile;
 assert.equal(visible.avatar.color,'#a78bfa');
 assert.deepEqual(Object.keys(visible).sort(),['avatar','id','level','name']);
 assert.equal((await call('profile/'+a.player.id,undefined,a.token)).data.profile.coins,6);
 assert.equal((await call('shop/buy',{itemId:'glasses',x:1100,y:800},a.token)).status,409);
 assert.equal((await call('shop/buy',{itemId:'glasses'},a.token)).status,400);
 assert.equal((await store.get(a.player.id)).coins,6);
 assert.equal(visible.duelRewards,undefined);assert.equal(visible.linkedAccount,undefined);assert.equal(visible.ownedCosmetics,undefined);
 assert.equal((await call('shop/buy',{itemId:'hat'})).status,401);
 assert.equal((await call('profile/unknown',undefined,a.token)).status,404);
});

test('Client chat expires and old history does not reappear on re-entry',async()=>{
 const {recentMessages}=await import('../../client/src/chat-state.mjs');
 const messages=[{id:'old',createdAt:500},{id:'fresh',createdAt:1100}];
 assert.deepEqual(recentMessages(messages,1200,1000).map(m=>m.id),['fresh']);
 assert.equal(recentMessages(messages,121100,1000).length,0);
 assert.equal(recentMessages(messages,1200,1200).length,0);
});
