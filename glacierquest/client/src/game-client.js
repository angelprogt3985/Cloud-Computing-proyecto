import { createSoundscape } from './soundscape.js';
import { mergeMessages } from './chat-state.mjs';
import { render, camera, W, H } from './world.js';
const $=id=>document.getElementById(id),canvas=$('map-canvas'),minimap=$('minimap');
let token=localStorage.getItem('gq-session')||sessionStorage.getItem('gq-session');
let player,target,npc={x:520,y:160},items=[],places=[],remotes=[],messages=[],duel=null,mode='login',battleMode='pve';
let playing=false,drawer=null,busy=false,started=false,mutation=0,clockOffset=0,energy=100,nearest=null,lastQuests='',lastPeople='',closedDuel='',fishing=false,local=false;
const sound=createSoundscape();
function audioSettings(){$('music-toggle').textContent=sound.enabled?'Sonido activado':'Sonido silenciado';$('music-toggle').setAttribute('aria-pressed',String(sound.enabled));$('music-volume').value=Math.round(sound.volume*100);$('volume-label').textContent=Math.round(sound.volume*100)+'%';$('sound-status').textContent=sound.playing?'Aurora boreal · sonando':!sound.enabled||sound.volume===0?'Sonido silenciado':'Aurora boreal · pulsa activar sonido para escuchar';}
$('music-toggle').onclick=async()=>{await sound.toggle();audioSettings();};
$('music-volume').oninput=e=>{sound.setVolume(Number(e.target.value)/100);audioSettings();};audioSettings();
const keys=new Set(),collecting=new Set();
let noticeTimer;const notice=t=>{$('notice').textContent=t;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',6000);};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function closeDrawer(){drawer=null;document.body.classList.remove('drawer-open');$('game-drawer').hidden=true;for(const id of ['open-menu','open-chat','open-quests','open-players'])$(id).setAttribute('aria-expanded','false');if(playing)canvas.focus();}
function openDrawer(which){if(!playing)return;if(drawer===which){closeDrawer();return;}drawer=which;document.body.classList.add('drawer-open');$('game-drawer').dataset.view=which;keys.clear();target=null;$('game-drawer').hidden=false;$('journal-drawer').hidden=!['quests','players'].includes(which);$('chat-drawer').hidden=which!=='chat';$('menu-drawer').hidden=which!=='menu';$('drawer-title').textContent={quests:'Diario de expedición',players:'Exploradores',chat:'Conversación',menu:'Menú'}[which];for(const id of ['menu','chat','quests','players'])$('open-'+id).setAttribute('aria-expanded',String(id===which));if(which==='menu')audioSettings();if(which==='quests'||which==='players')tab(which);if(which==='chat'){$('chat-badge').hidden=true;$('chat-list').scrollTop=$('chat-list').scrollHeight;$('chat-input').focus();}else $('close-drawer').focus();}
for(const which of ['menu','quests','chat','players'])$('open-'+which).onclick=()=>openDrawer(which);
$('close-drawer').onclick=$('resume-game').onclick=closeDrawer;
function titleScreen(){playing=false;sound.setActive(false);$('game-root').inert=true;keys.clear();target=null;closeDrawer();$('join-overlay').hidden=true;$('title-screen').hidden=false;document.body.classList.add('at-title');$('title-player').textContent=player?`${player.name} · Nivel ${player.level||1} · Tu expedición te espera`:'Explora. Descubre. Desafía a tus amigos.';$('play-game').focus();}
$('return-title').onclick=titleScreen;$('back-title').onclick=()=>{if(playing){$('join-overlay').hidden=true;canvas.focus();}else titleScreen();};
$('play-game').onclick=()=>{sound.unlock();if(player)launch();else{$('join-overlay').hidden=false;$('join-email').focus();}};
function launch(){playing=true;sound.setActive(true);sound.unlock().then(audioSettings);$('game-root').inert=false;document.body.classList.remove('at-title');$('title-screen').hidden=true;$('join-overlay').hidden=true;closeDrawer();hud();loadAsset();if(!started){started=true;sync();}canvas.focus();}
$('toggle-minimap').onclick=()=>{const show=$('minimap').hidden;$('minimap').hidden=!show;$('toggle-minimap').setAttribute('aria-pressed',String(show));$('toggle-minimap').textContent=show?'Ocultar minimapa':'Mostrar minimapa';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('El juego ya ocupa toda la ventana. Puedes usar F11 en tu navegador.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
function error(e){notice(e.message);if(e.status===401){token=null;player=null;localStorage.removeItem('gq-session');sessionStorage.removeItem('gq-session');$('join-overlay').hidden=false;}}
async function api(path,body){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok){const e=new Error(d.error||'No se pudo conectar');e.status=r.status;throw e;}return d;}
function setPlayer(p){if(!p)return;const xy=player?{x:player.x,y:player.y}:{};const old=player?.level||1;player={...p,...xy};if(player.level>old)notice(`¡Nivel ${player.level}! Más salud y fuerza para tu expedición.`);hud();}
function hud(){if(!player)return;const level=player.level||1,xp=player.xp||0,base=60*(level-1)**2,next=60*level**2;
 $('hud-name').textContent=player.name;$('level').textContent=`Nivel ${level} · ${level>4?'Guardián del norte':level>2?'Explorador de escarcha':'Viajero del hielo'}`;
 $('coins').textContent=player.coins;$('fish').textContent=player.fish;$('health').max=player.maxHp;$('health').value=player.hp;$('health-label').textContent=`${player.hp} / ${player.maxHp}`;$('xp').max=next-base;$('xp').value=xp-base;$('xp-label').textContent=`${xp-base} / ${next-base} EXP`;
 $('link-account').hidden=!!player.account||local;$('save-status').textContent=player.account?'Cuenta vinculada · Progreso guardado':'Personaje de práctica';renderBattle();
}
function showQuests(q=[]){const key=JSON.stringify(q);if(key===lastQuests)return;lastQuests=key;$('quests').replaceChildren();for(const quest of q){const card=el('div',undefined,'quest'+(quest.claimed?' done':'')),top=el('div',undefined,'quest-top');top.append(el('span',quest.name,'quest-title'),el('span',`+${quest.xp} EXP`,'reward'));const progress=el('progress');progress.max=quest.goal;progress.value=quest.current;card.append(top,el('small',quest.claimed?'Completada':`${quest.current} / ${quest.goal} · +${quest.coins} monedas`),progress);if(quest.current===quest.goal&&!quest.claimed){const btn=el('button','Reclamar recompensa');btn.onclick=()=>explore('quest',quest.id);card.append(btn);}$('quests').append(card);}}
function showPeople(){const key=JSON.stringify(remotes.map(p=>[p.id,p.name,p.level]));if(key!==lastPeople){lastPeople=key;$('players').replaceChildren();if(!remotes.length)$('players').append(el('p','Todavía estás solo. Invita a un amigo a entrar al mundo.','muted'));for(const p of remotes){const row=el('div',undefined,'player-row'),label=el('span',p.name);label.append(el('small',`Nivel ${p.level||1} · En línea`));const btn=el('button','Desafiar');btn.onclick=()=>challenge(p.id);row.append(label,btn);$('players').append(row);}}$('arena-status').textContent=duel?.status==='active'?'Arena ocupada: hay un duelo en curso.':duel?.status==='pending'?'Hay una invitación pendiente.':'Arena abierta · Duelo justo: 40 PV para ambos.';}
function tab(which){$('quest-panel').hidden=which!=='quests';$('players-panel').hidden=which!=='players';$('tab-quests').classList.toggle('selected',which==='quests');$('tab-players').classList.toggle('selected',which==='players');}
$('tab-quests').onclick=()=>tab('quests');$('tab-players').onclick=()=>tab('players');
function showMessages(incoming){
 const next=mergeMessages(messages,incoming);
 if(next.length===messages.length&&next.every((m,i)=>m.id===messages[i].id))return;
 const fresh=next.filter(m=>!messages.some(old=>old.id===m.id));
 if(messages.length&&drawer!=='chat'&&fresh.some(m=>m.player_name!==player?.name))$('chat-badge').hidden=false;
 const list=$('chat-list'),oldScroll=list.scrollTop;
 const follow=list.scrollHeight-list.clientHeight-list.scrollTop<48||fresh.some(m=>m.player_name===player?.name);
 messages=next;list.replaceChildren();
 for(const m of messages){
  const p=el('p',undefined,'chat-message'+(m.player_name===player?.name?' own':''));
  p.append(el('b',m.player_name),el('span',m.body));list.append(p);
 }
 list.scrollTop=follow?list.scrollHeight:oldScroll;
}
async function loadAsset(){try{const r=await fetch('/api/asset',{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const old=$('banner').src;$('banner').src=URL.createObjectURL(await r.blob());if(old.startsWith('blob:'))URL.revokeObjectURL(old);$('asset-source').textContent='Recurso visual: '+r.headers.get('X-Asset-Source');}catch{}}
async function inspect(){try{const d=await api('services');$('services').replaceChildren();for(const s of d.services)$('services').append(el('li',`${s.name}: ${s.status}`));$('checked').textContent='Actualizado: '+new Date(d.checkedAt).toLocaleTimeString();loadAsset();}catch(e){error(e);}}
$('technical').onclick=()=>{closeDrawer();$('technical-overlay').hidden=false;inspect();};$('close-technical').onclick=()=>{$('technical-overlay').hidden=true;openDrawer('menu');};$('refresh-services').onclick=inspect;
function authMode(next){mode=next;$('name-field').hidden=mode!=='register';$('join-name').required=mode==='register';$('login-tab').classList.toggle('selected',mode==='login');$('register-tab').classList.toggle('selected',mode==='register');$('auth-title').textContent=mode==='login'?'Volver a la expedición':'Tu primer paso al norte';$('join-button').textContent=mode==='login'?'Entrar al mundo →':'Crear mi explorador →';$('join-password').autocomplete=mode==='login'?'current-password':'new-password';$('join-error').textContent='';}
$('login-tab').onclick=()=>authMode('login');$('register-tab').onclick=()=>authMode('register');
async function begin(d){token=d.token||token;localStorage.setItem('gq-session',token);sessionStorage.removeItem('gq-session');player=d.player;$('join-password').value='';launch();}
$('join-form').onsubmit=async e=>{e.preventDefault();$('join-button').disabled=true;try{await begin(await api('account',{mode,email:$('join-email').value.trim(),password:$('join-password').value,name:$('join-name').value.trim(),code:$('join-code').value}));}catch(e){$('join-error').textContent=e.message;}finally{$('join-button').disabled=false;}};
$('guest').onclick=async()=>{try{await begin(await api('join',{name:$('join-name').value.trim()||'Explorador local',code:$('join-code').value}));}catch(e){$('join-error').textContent=e.message;}};
$('reset-password').onclick=async()=>{try{const d=await api('account',{mode:'reset',email:$('join-email').value.trim(),code:$('join-code').value});$('join-error').textContent=d.message;}catch(e){$('join-error').textContent=e.message;}};
$('link-account').onclick=()=>{authMode('register');$('join-name').value=player.name;$('join-overlay').hidden=false;};
$('logout').onclick=()=>{localStorage.removeItem('gq-session');sessionStorage.removeItem('gq-session');location.reload();};
fetch('/health').then(r=>r.json()).then(d=>{local=d.ephemeral;$('guest').hidden=d.cloud;$('demo-warning').hidden=!d.ephemeral;if(!d.accounts&&!d.cloud){$('join-error').textContent='Usa «Probar sin cuenta» para explorar esta versión local.';$('name-field').hidden=false;}}).catch(()=>{});
async function sync(){try{if(playing&&player&&!document.hidden){const version=mutation;const d=await api('sync',{x:player.x,y:player.y});remotes=d.players.filter(p=>p.id!==player.id).map(p=>{const old=remotes.find(r=>r.id===p.id);return {...p,drawX:old?.drawX??p.x,drawY:old?.drawY??p.y};});npc=d.npc;items=d.items;places=d.places||[];clockOffset=d.serverTime-Date.now();if(version===mutation&&!busy){setPlayer(d.player);showQuests(d.quests);}setArena(d.arena);showPeople();showMessages(d.messages);$('online').textContent=`${d.players.length} explorador${d.players.length===1?'':'es'}`;$('connection').textContent='Conectado';}}catch(e){$('connection').textContent='Reconectando';error(e);}finally{setTimeout(sync,1500);}}
$('chat-form').onsubmit=async e=>{e.preventDefault();const body=$('chat-input').value.trim();if(!body)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const d=await api('chat',{body});showMessages([d.message]);if($('chat-input').value.trim()===body)$('chat-input').value='';}catch(e){error(e);}finally{btn.disabled=false;}};
async function explore(action,place){if(busy||!player)return;busy=true;mutation++;try{const d=await api('explore',{action,place,x:player.x,y:player.y});setPlayer(d.player);showQuests(d.quests);clockOffset=d.serverTime-Date.now();fishing=action==='cast';notice({quest:'¡Misión completada! Recompensa guardada.',rest:'El calor del refugio te devuelve la energía.',explore:'Lugar descubierto. Sigue explorando el glaciar.',cast:'Anzuelo al agua… espera la señal y pulsa E.',catch:'¡Buena captura! +20 EXP y un pez.'}[action]);}catch(e){fishing=false;error(e);}finally{busy=false;canvas.focus();}}
function interact(){if(!nearest||busy||!player)return;if(nearest.kind==='arena'){openDrawer('players');explore('explore',nearest.id);}else if(nearest.kind==='fish'){const now=Date.now()+clockOffset;if(fishing&&player.fishing&&now<=player.fishing.until)explore('catch',nearest.id);else explore('cast',nearest.id);}else explore(nearest.kind==='camp'?'rest':'explore',nearest.id);}
$('interact-button').onclick=interact;
async function challenge(id){if(busy)return;busy=true;try{setArena((await api('arena/challenge',{targetId:id})).arena);notice('Invitación enviada. Esperando respuesta…');}catch(e){error(e);}finally{busy=false;}}
function setArena(a){if(!playing)return;if(duel&&a&&duel.id===a.id&&duel.turn>a.turn)return;duel=a;if(!player)return;const participates=a?.fighters.some(p=>p.id===player.id);$('invite-overlay').hidden=!(participates&&a.status==='pending'&&a.fighters[1].id===player.id);if(!$('invite-overlay').hidden)$('invite-text').textContent=`${a.fighters[0].name} quiere medirse contigo.`;
 if(participates&&a.status==='active'){battleMode='pvp';$('battle-overlay').hidden=false;target=null;}
 if(participates&&['finished','expired'].includes(a.status)&&closedDuel!==a.id&&battleMode==='pvp')$('battle-overlay').hidden=false;
 renderBattle();}
async function respond(accept){try{setArena((await api('arena/respond',{id:duel.id,accept})).arena);}catch(e){error(e);}}
$('accept-duel').onclick=()=>respond(true);$('reject-duel').onclick=()=>respond(false);
let lastAnimation='',animationTimers=[];
function animateBattle(b){
 const key=b.id+':'+b.turn;if(key===lastAnimation)return;
 const same=lastAnimation.startsWith(b.id+':');lastAnimation=key;
 for(const timer of animationTimers)clearTimeout(timer);animationTimers=[];
 if(!same||!b.events?.length)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const [i,event] of b.events.entries())animationTimers.push(setTimeout(()=>{
  if($('battle-overlay').hidden)return;
  const actor=$(event.actor===player.id?'fighter-you':'fighter-enemy'),target=$(event.target===player.id?'fighter-you':'fighter-enemy');
  sound.effect(event.action);
  const effect=el('i',event.damage?`−${event.damage}`:event.heal?`+${event.heal}`:event.action==='charge'?'Cargando':'◇','combat-float '+event.action);target.append(effect);setTimeout(()=>effect.remove(),1200);
  if(reduced)return;
  const sprite=actor.querySelector('.fighter-sprite'),victim=target.querySelector('.fighter-sprite');
  if(['attack','power','frost'].includes(event.action)){
   const direction=event.actor===player.id?1:-1;
   sprite.animate([{transform:'translateX(0)'},{transform:`translateX(${direction*26}px) rotate(${direction*12}deg)`},{transform:'translateX(0)'}],{duration:400});
   victim.animate([{filter:'brightness(1)'},{filter:event.action==='frost'?'brightness(2) drop-shadow(0 0 15px #9deaff)':'brightness(2)',transform:'translateY(-6px)'},{filter:'brightness(1)',transform:'translateY(0)'}],{duration:550});
   const burst=el('i',event.action==='frost'?'❄':event.action==='power'?'✦':'╱','combat-burst '+event.action);target.append(burst);setTimeout(()=>burst.remove(),800);
  }else sprite.animate([{filter:'brightness(1)'},{filter:'brightness(1.8) drop-shadow(0 0 18px #8bdfd0)'},{filter:'brightness(1)'}],{duration:650});
 },i*650));
}
function renderBattle(){if(!player||$('battle-overlay').hidden)return;const pvp=battleMode==='pvp',b=pvp?duel:player.battle;if(!b)return;const me=pvp?b.fighters.find(p=>p.id===player.id):player,enemy=pvp?b.fighters.find(p=>p.id!==player.id):b;if(!me||!enemy)return;
 animateBattle(b);$('battle-energy').textContent=`Energía ${'◆'.repeat((pvp?me.focus:b.focus)??2)}${'◇'.repeat(3-((pvp?me.focus:b.focus)??2))} / 3${pvp&&me.chilled?' · Escarcha: tu próximo ataque causa 4 menos':''}`;
 $('fighter-enemy').querySelector('.fighter-sprite').textContent=pvp?'🐧':'♜';
 $('battle-title').textContent=pvp?'Duelo de exploradores':'Guardián de hielo';$('battle-you').textContent=player.name;$('battle-enemy').textContent=pvp?enemy.name:'Guardián';$('your-hp').max=me.maxHp;$('your-hp').value=me.hp;$('enemy-hp').max=enemy.maxHp;$('enemy-hp').value=enemy.hp;$('battle-status').textContent=`${me.hp} / ${me.maxHp} PV · Rival ${enemy.hp} / ${enemy.maxHp} PV`;
 const active=b.status==='active',myTurn=!pvp||b.next===player.id;
 $('intent').textContent=active?(pvp?(myTurn?'Tu turno · Elige con cuidado':'Tu rival está pensando…'):`Próxima acción: ${b.intent}`):(pvp?(b.status==='expired'?'El duelo caducó por inactividad':b.winner===player.id?'¡Victoria! +60 EXP y 10 monedas':'Duelo terminado · +15 EXP por participar'):{won:'¡Victoria! +45 EXP y 10 monedas',lost:'La próxima vez será tuya',escaped:'Te retiras del combate'}[b.status]);
 $('battle-log').textContent=b.log.join(' ');const potions=pvp?me.potions:b.potions;$('heal').textContent=`✚ Curar (${potions})`;
 for(const btn of document.querySelectorAll('[data-action]'))btn.disabled=busy||!active||!myTurn||(((pvp?me.focus:b.focus)??2)<({power:2,frost:1}[btn.dataset.action]||0))||(btn.dataset.action==='heal'&&(!potions||me.hp===me.maxHp));
 $('close-battle').hidden=active&&pvp;$('close-battle').textContent=active?'Ocultar combate':'Volver a explorar';}
$('duel').onclick=async()=>{if(busy||!player)return;busy=true;mutation++;target=null;try{setPlayer((await api('battle/start',{x:player.x,y:player.y})).player);battleMode='pve';$('battle-overlay').hidden=false;}catch(e){error(e);}finally{busy=false;hud();}};
for(const btn of document.querySelectorAll('[data-action]'))btn.onclick=async()=>{if(busy)return;busy=true;mutation++;renderBattle();try{if(battleMode==='pvp'){const d=await api('arena/turn',{id:duel.id,turn:duel.turn,action:btn.dataset.action});setArena(d.arena);setPlayer(d.player);}else{const b=player.battle;setPlayer((await api('battle/turn',{battleId:b.id,turn:b.turn,action:btn.dataset.action})).player);}}catch(e){error(e);try{setPlayer((await api('me')).player);}catch{}}finally{busy=false;renderBattle();}};
$('close-battle').onclick=()=>{if(battleMode==='pvp'&&duel)closedDuel=duel.id;$('battle-overlay').hidden=true;canvas.focus();};
canvas.addEventListener('pointerdown',e=>{if(!playing||drawer||!player||!$('battle-overlay').hidden)return;const r=canvas.getBoundingClientRect();target={x:Math.max(16,Math.min(W-16,camera.x+(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(16,Math.min(H-16,camera.y+(e.clientY-r.top)*canvas.height/r.height))};canvas.focus();});
const directions={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)||!playing||!player||!$('join-overlay').hidden||!$('technical-overlay').hidden||!$('battle-overlay').hidden)return;const k=e.key.toLowerCase();if(drawer)return;if(directions[k]||k==='shift'){e.preventDefault();keys.add(k);target=null;}if(k==='e'&&!e.repeat){e.preventDefault();interact();}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
for(const btn of document.querySelectorAll('[data-move]')){const k={up:'w',down:'s',left:'a',right:'d'}[btn.dataset.move];btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);target=null;};btn.onpointerup=btn.onpointercancel=()=>keys.delete(k);}
let last=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;let moving=false;
 if(player&&playing){const free=!drawer&&$('join-overlay').hidden&&$('battle-overlay').hidden&&$('invite-overlay').hidden&&$('technical-overlay').hidden;
  if(free){let dx=0,dy=0;for(const k of keys){const v=directions[k];if(v){dx+=v[0];dy+=v[1];}}let dist=Math.hypot(dx,dy);const keyboard=dist>0;if(!dist&&target){dx=target.x-player.x;dy=target.y-player.y;dist=Math.hypot(dx,dy);if(dist<2)target=null;}const sprint=keys.has('shift')&&energy>1&&dist>0;const step=(sprint?290:165)*dt;energy=Math.max(0,Math.min(100,energy+(sprint?-24:16)*dt));if(dist>0){moving=true;player.x=Math.max(16,Math.min(W-16,player.x+dx/dist*(keyboard?step:Math.min(step,dist))));player.y=Math.max(16,Math.min(H-16,player.y+dy/dist*(keyboard?step:Math.min(step,dist))));}
  for(const item of items)if(!busy&&!player.collected.includes(item.id)&&!collecting.has(item.id)&&player.battle?.status!=='active'&&Math.hypot(player.x-item.x,player.y-item.y)<22){collecting.add(item.id);mutation++;api('collect',{itemId:item.id,x:player.x,y:player.y}).then(d=>{setPlayer(d.player);notice('Hallazgo guardado · +12 EXP');}).catch(error).finally(()=>setTimeout(()=>collecting.delete(item.id),2000));}
  }
  $('stamina').value=energy;nearest=places.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)<80).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];$('interaction').hidden=!nearest||!free;
  if(nearest){let hint=nearest.hint;if(nearest.kind==='fish'&&fishing&&player.fishing){const time=Date.now()+clockOffset;hint=time<player.fishing.biteAt?'Espera… el agua se mueve':time<=player.fishing.until?'¡AHORA! Pulsa E para recoger':'El pez escapó. Vuelve a lanzar.';}$('interact-hint').textContent=hint;}
  const closest=places.slice().sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];if(closest){$('zone-name').textContent=closest.name;$('zone-sub').textContent=(player.discovered||[]).includes(closest.id)?'Territorio descubierto':'Territorio por descubrir';}
  $('duel').disabled=busy||Math.hypot(player.x-npc.x,player.y-npc.y)>52||duel?.status==='active';
 }
 render(canvas,minimap,{player,remotes,items,target,npc,moving},dt,now);requestAnimationFrame(frame);
}
if(token){$('play-game').disabled=true;$('title-player').textContent='Recuperando tu explorador…';api('me').then(d=>{player=d.player;hud();titleScreen();}).catch(()=>{localStorage.removeItem('gq-session');sessionStorage.removeItem('gq-session');token=null;titleScreen();}).finally(()=>$('play-game').disabled=false);}
requestAnimationFrame(frame);

window.addEventListener('keydown',e=>{
 if(!playing||!$('join-overlay').hidden||!$('battle-overlay').hidden||!$('invite-overlay').hidden||!$('technical-overlay').hidden)return;
 if(e.key==='Escape'){e.preventDefault();if(drawer)closeDrawer();else openDrawer('menu');return;}
 if(e.key==='Tab'&&drawer){const nodes=[...$('game-drawer').querySelectorAll('button,input')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(e.repeat||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 const which={q:'quests',c:'chat',p:'players'}[e.key.toLowerCase()];if(which){e.preventDefault();openDrawer(which);}
});
