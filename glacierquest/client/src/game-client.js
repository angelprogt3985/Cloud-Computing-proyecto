import { createSoundscape } from './soundscape.js';
import { mergeMessages, recentMessages } from './chat-state.mjs';
import { render, drawAvatar, camera, W, H } from './world.js';
const $=id=>document.getElementById(id),canvas=$('map-canvas'),minimap=$('minimap');
let token=localStorage.getItem('gq-session')||sessionStorage.getItem('gq-session');
let player,target,npc={x:520,y:160},items=[],enemies=[],places=[],zones=[],remotes=[],messages=[],duel=null,mode='login',battleMode='pve';
let playing=false,drawer=null,busy=false,started=false,mutation=0,clockOffset=0,energy=100,nearest=null,lastQuests='',lastPeople='',closedDuel='',fishing=false,local=false;
const sound=createSoundscape();
function audioSettings(){$('music-toggle').textContent=sound.enabled?'Sonido activado':'Sonido silenciado';$('music-toggle').setAttribute('aria-pressed',String(sound.enabled));$('music-volume').value=Math.round(sound.volume*100);$('volume-label').textContent=Math.round(sound.volume*100)+'%';$('sound-status').textContent=sound.playing?'Aurora boreal · sonando':!sound.enabled||sound.volume===0?'Sonido silenciado':'Aurora boreal · pulsa activar sonido para escuchar';}
$('music-toggle').onclick=async()=>{await sound.toggle();audioSettings();};
$('music-volume').oninput=e=>{sound.setVolume(Number(e.target.value)/100);audioSettings();};audioSettings();
const keys=new Set(),collecting=new Set();
let chatStart=null,lastChatPrune=0,profileId=null,catalog=null,profileBusy=false;
let noticeTimer;const notice=t=>{$('notice').textContent=t;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',6000);};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function closeDrawer(){drawer=null;document.body.classList.remove('drawer-open');$('game-drawer').hidden=true;for(const id of ['open-menu','open-chat','open-quests','open-players'])$(id).setAttribute('aria-expanded','false');if(playing)canvas.focus();}
function openDrawer(which){if(!playing)return;if(drawer===which){closeDrawer();return;}drawer=which;document.body.classList.add('drawer-open');$('game-drawer').dataset.view=which;keys.clear();target=null;$('game-drawer').hidden=false;$('journal-drawer').hidden=!['quests','players'].includes(which);$('chat-drawer').hidden=which!=='chat';$('menu-drawer').hidden=which!=='menu';$('drawer-title').textContent={quests:'Diario de expedición',players:'Exploradores',chat:'Conversación',menu:'Menú'}[which];for(const id of ['menu','chat','quests','players'])$('open-'+id).setAttribute('aria-expanded',String(id===which));if(which==='menu')audioSettings();if(which==='quests'||which==='players')tab(which);if(which==='chat'){$('chat-badge').hidden=true;$('chat-list').scrollTop=$('chat-list').scrollHeight;$('chat-input').focus();}else $('close-drawer').focus();}
for(const which of ['menu','quests','chat','players'])$('open-'+which).onclick=()=>openDrawer(which);
$('close-drawer').onclick=$('resume-game').onclick=closeDrawer;
function titleScreen(){playing=false;sound.setActive(false);$('game-root').inert=true;keys.clear();target=null;closeDrawer();$('join-overlay').hidden=true;$('title-screen').hidden=false;document.body.classList.add('at-title');$('title-player').textContent=player?`${player.name} · Nivel ${player.level||1} · Tu expedición te espera`:'Explora. Descubre. Desafía a tus amigos.';$('play-game').focus();}
$('return-title').onclick=titleScreen;$('back-title').onclick=()=>{if(playing){$('join-overlay').hidden=true;canvas.focus();}else titleScreen();};
$('play-game').onclick=()=>{sound.unlock();if(player)launch();else{$('join-overlay').hidden=false;$('join-email').focus();}};
function launch(){chatStart=null;messages=[];$('chat-list').replaceChildren();playing=true;sound.setActive(true);sound.unlock().then(audioSettings);$('game-root').inert=false;document.body.classList.remove('at-title');$('title-screen').hidden=true;$('join-overlay').hidden=true;closeDrawer();setPlayer(player);loadAsset();if(!started){started=true;sync();}canvas.focus();}
$('toggle-minimap').onclick=()=>{const show=$('minimap').hidden;$('minimap').hidden=!show;$('toggle-minimap').setAttribute('aria-pressed',String(show));$('toggle-minimap').textContent=show?'Ocultar minimapa':'Mostrar minimapa';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('El juego ya ocupa toda la ventana. Puedes usar F11 en tu navegador.');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
function error(e){notice(e.message);if(e.status===401){token=null;player=null;localStorage.removeItem('gq-session');sessionStorage.removeItem('gq-session');$('join-overlay').hidden=false;}}
async function api(path,body){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify({...body,...(player?{zone:player.zone||'plaza'}:{})})}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok){const e=new Error(d.error||'No se pudo conectar');e.status=r.status;throw e;}return d;}
function setPlayer(p){if(!p)return;const changed=player&&(player.zone||'plaza')!==(p.zone||'plaza');if(changed){target=null;keys.clear();remotes=[];items=[];enemies=[];places=[];messages=[];npc=null;chatStart=Date.now()+clockOffset;fishing=false;$('chat-list').replaceChildren();}const xy=player&&!changed?{x:player.x,y:player.y}:{};const old=player?.level||1;player={...p,...xy};if(player.battle?.enemyId&&player.battle.status==='active'){battleMode='pve';$('battle-overlay').hidden=false;target=null;keys.clear();}if(player.level>old)notice(`¡Nivel ${player.level}! Más salud y fuerza para tu expedición.`);hud();}
function hud(){if(!player)return;const level=player.level||1,xp=player.xp||0,base=60*(level-1)**2,next=60*level**2;
 $('hud-name').textContent=player.name;$('level').textContent=`Nivel ${level} · ${level>4?'Guardián del norte':level>2?'Explorador de escarcha':'Viajero del hielo'}`;
 $('coins').textContent=player.coins;$('fish').textContent=player.fish;$('pocket-coins').textContent=player.coins;$('pocket-fish').textContent=player.fish;$('health').max=player.maxHp;$('health').value=player.hp;$('health-label').textContent=`${player.hp} / ${player.maxHp}`;$('xp').max=next-base;$('xp').value=xp-base;$('xp-label').textContent=`${xp-base} / ${next-base} EXP`;
 $('link-account').hidden=!!player.account||local;$('save-status').textContent=player.account?'Cuenta vinculada · Progreso guardado':'Personaje de práctica';renderBattle();
}
function showQuests(q=[]){const key=JSON.stringify(q);if(key===lastQuests)return;lastQuests=key;$('quests').replaceChildren();for(const quest of q){const card=el('div',undefined,'quest'+(quest.claimed?' done':'')),top=el('div',undefined,'quest-top');top.append(el('span',quest.name,'quest-title'),el('span',`+${quest.xp} EXP`,'reward'));const progress=el('progress');progress.max=quest.goal;progress.value=quest.current;card.append(top,el('small',quest.claimed?'Completada':`${quest.current} / ${quest.goal} · +${quest.coins} monedas`),progress);if(quest.current===quest.goal&&!quest.claimed){const btn=el('button','Reclamar recompensa');btn.onclick=()=>explore('quest',quest.id);card.append(btn);}$('quests').append(card);}}
function showPeople(){const key=JSON.stringify(remotes.map(p=>[p.id,p.name,p.level]));if(key!==lastPeople){lastPeople=key;$('players').replaceChildren();if(!remotes.length)$('players').append(el('p','Todavía estás solo. Invita a un amigo a entrar al mundo.','muted'));for(const p of remotes){const row=el('div',undefined,'player-row'),label=el('span',p.name);label.append(el('small',`Nivel ${p.level||1} · En línea`));const btn=el('button','Desafiar');btn.onclick=()=>challenge(p.id);const view=el('button','Ver ficha','secondary');view.onclick=()=>openProfile(p.id);row.append(label,view,btn);$('players').append(row);}}$('arena-status').textContent=duel?.status==='active'?'Arena ocupada: hay un duelo en curso.':duel?.status==='pending'?'Hay una invitación pendiente.':'Arena abierta · Base 40 PV, 10 de daño + equipo.';}
function tab(which){$('quest-panel').hidden=which!=='quests';$('players-panel').hidden=which!=='players';$('tab-quests').classList.toggle('selected',which==='quests');$('tab-players').classList.toggle('selected',which==='players');}
$('tab-quests').onclick=()=>tab('quests');$('tab-players').onclick=()=>tab('players');
function showMessages(incoming){
 const next=recentMessages(mergeMessages(messages,incoming),Date.now()+clockOffset,chatStart??Infinity);
 if(next.length===messages.length&&next.every((m,i)=>m.id===messages[i].id))return;
 const fresh=next.filter(m=>!messages.some(old=>old.id===m.id));
 if(drawer!=='chat'&&fresh.some(m=>m.player_id!==player?.id))$('chat-badge').hidden=false;
 const list=$('chat-list'),oldScroll=list.scrollTop;
 const follow=list.scrollHeight-list.clientHeight-list.scrollTop<48||fresh.some(m=>m.player_id===player?.id);
 messages=next;list.replaceChildren();
 for(const m of messages){
  const p=el('p',undefined,'chat-message'+(m.player_id===player?.id?' own':''));
  p.append(el('b',m.player_name),el('span',m.body));list.append(p);
 }
 list.scrollTop=follow?list.scrollHeight:oldScroll;
}
async function loadAsset(){try{const r=await fetch('/api/asset',{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const old=$('banner').src;$('banner').src=URL.createObjectURL(await r.blob());if(old.startsWith('blob:'))URL.revokeObjectURL(old);$('asset-source').textContent='Recurso visual: '+r.headers.get('X-Asset-Source');}catch{}}
async function inspect(){const btn=$('refresh-services');if(btn.disabled)return;btn.disabled=true;try{const d=await api('services');$('services').replaceChildren();const labels={local:'Local',configured:'Configurado',verified:'Comprobado',pending:'Evidencia pendiente',error:'Error'};for(const s of d.services){const li=el('li');li.append(el('strong',s.name),el('span',labels[s.state]||'Evidencia pendiente','evidence-tag'),el('p',s.purpose),el('small',s.status));$('services').append(li);}$('checked').textContent='Consulta API: '+new Date(d.checkedAt).toLocaleString()+'. La evidencia histórica de consola se conserva en el informe del proyecto.';loadAsset();}catch(e){error(e);}finally{btn.disabled=false;}}
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
async function sync(){try{if(playing&&player&&!document.hidden){const version=mutation;const d=await api('sync',{x:player.x,y:player.y});if(version!==mutation||busy)return;zones=d.zones||zones;remotes=d.players.filter(p=>p.id!==player.id).map(p=>{const old=remotes.find(r=>r.id===p.id);return {...p,drawX:old?.drawX??p.x,drawY:old?.drawY??p.y};});npc=d.npc;items=d.items;enemies=d.enemies||[];places=d.places||[];clockOffset=d.serverTime-Date.now();if(chatStart===null)chatStart=d.serverTime;if(version===mutation&&!busy&&!profileBusy){setPlayer(d.player);showQuests(d.quests);}setArena(d.arena);showPeople();showMessages(d.messages);$('online').textContent=`${d.players.length} explorador${d.players.length===1?'':'es'}`;$('connection').textContent='Conectado';}}catch(e){$('connection').textContent='Reconectando';if(e.status===409){try{setPlayer((await api('me')).player);}catch{}}else error(e);}finally{setTimeout(sync,1500);}}
$('chat-form').onsubmit=async e=>{e.preventDefault();const body=$('chat-input').value.trim();if(!body)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;try{const d=await api('chat',{body});if(Number.isFinite(d.serverTime))clockOffset=d.serverTime-Date.now();if(chatStart===null)chatStart=d.message.createdAt;showMessages([d.message]);if($('chat-input').value.trim()===body)$('chat-input').value='';}catch(e){error(e);}finally{btn.disabled=false;}};
async function explore(action,place){if(busy||!player)return;busy=true;mutation++;try{const d=await api('explore',{action,place,x:player.x,y:player.y});setPlayer(d.player);showQuests(d.quests);clockOffset=d.serverTime-Date.now();fishing=action==='cast';notice({quest:'¡Misión completada! Recompensa guardada.',rest:'El calor del refugio te devuelve la energía.',explore:'Lugar descubierto. Sigue explorando el glaciar.',cast:'Anzuelo al agua… espera la señal y pulsa E.',catch:'¡Buena captura! +20 EXP y un pez.'}[action]);}catch(e){fishing=false;error(e);}finally{busy=false;canvas.focus();}}
function interact(){if(!nearest||busy||!player)return;if(nearest.kind==='portal'){travel(nearest.id);return;}if(['forage','trade-fish','trade-crystals','clue','rune'].includes(nearest.kind)){doActivity(nearest.id);return;}if(nearest.kind==='shop'){openShop();return;}if(nearest.kind==='arena'){openDrawer('players');explore('explore',nearest.id);}else if(nearest.kind==='fish'){const now=Date.now()+clockOffset;if(fishing&&player.fishing&&now<=player.fishing.until)explore('catch',nearest.id);else explore('cast',nearest.id);}else explore(nearest.kind==='camp'?'rest':'explore',nearest.id);}
$('interact-button').onclick=interact;
async function challenge(id){if(busy)return;busy=true;try{setArena((await api('arena/challenge',{targetId:id})).arena);notice('Invitación enviada. Esperando respuesta…');}catch(e){error(e);}finally{busy=false;}}
function setArena(a){if(!playing)return;if(duel&&a&&duel.id===a.id&&duel.turn>a.turn)return;duel=a;if(!player)return;const participates=a?.fighters.some(p=>p.id===player.id);$('invite-overlay').hidden=!(participates&&a.status==='pending'&&a.fighters[1].id===player.id);if(!$('invite-overlay').hidden)$('invite-text').textContent=a.fighters.map(p=>`${p.name}: ${p.maxHp} PV · ${p.attack??10} daño`).join(' / ');
 if(participates&&a.status==='active'){if(!$('profile-overlay').hidden)closeProfile();if(!$('shop-overlay').hidden)closeShop();battleMode='pvp';$('battle-overlay').hidden=false;target=null;}
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
 const maxEnergy=pvp?(me.maxFocus??3):3;document.querySelector('[data-action=attack] small').textContent=`Recupera ${pvp?(me.attackRecovery??1):1} energía`;animateBattle(b);$('battle-energy').textContent=`Energía ${'◆'.repeat((pvp?me.focus:b.focus)??2)}${'◇'.repeat(Math.max(0,maxEnergy-((pvp?me.focus:b.focus)??2)))} / ${maxEnergy}${pvp&&me.chilled?' · Escarcha: tu próximo ataque causa 4 menos':''}`;
 $('fighter-enemy').querySelector('.fighter-sprite').textContent=pvp?'🐧':(b.icon||'♜');
 $('battle-title').textContent=pvp?'Duelo de exploradores':(b.name||'Guardián de hielo');$('battle-you').textContent=player.name;$('battle-enemy').textContent=pvp?enemy.name:(b.name||'Guardián');$('your-hp').max=me.maxHp;$('your-hp').value=me.hp;$('enemy-hp').max=enemy.maxHp;$('enemy-hp').value=enemy.hp;$('battle-status').textContent=`${me.hp} / ${me.maxHp} PV · Rival ${enemy.hp} / ${enemy.maxHp} PV`;
 $('battle-equipment').textContent=pvp?`Daño base: tú ${me.attack??10} · rival ${enemy.attack??10}. Equipo fijado para este duelo.`:'Golpe y Defender recuperan energía. Escarcha debilita la respuesta rival.';
 const active=b.status==='active',myTurn=!pvp||b.next===player.id;
 $('intent').textContent=active?(pvp?(myTurn?'Tu turno · Elige con cuidado':'Tu rival está pensando…'):`Próxima acción: ${b.intent}`):(pvp?(b.status==='expired'?'El duelo caducó por inactividad':b.winner===player.id?'¡Victoria! +60 EXP y 10 monedas':'Duelo terminado · +15 EXP por participar'):{won:`¡Victoria! +${b.rewardXp??45} EXP y ${b.rewardCoins??10} monedas`,lost:'La próxima vez será tuya',escaped:'Te retiras del combate'}[b.status]);
 $('battle-log').textContent=b.log.join(' ');const potions=pvp?me.potions:b.potions;$('heal').textContent=`✚ Curar (${potions})`;
 for(const btn of document.querySelectorAll('[data-action]'))btn.disabled=busy||!active||!myTurn||(((pvp?me.focus:b.focus)??2)<({power:2,frost:1}[btn.dataset.action]||0))||(btn.dataset.action==='heal'&&(!potions||me.hp===me.maxHp));
 $('close-battle').hidden=active&&(pvp||!!b.enemyId);$('close-battle').textContent=active?'Ocultar combate':'Volver a explorar';}
$('duel').onclick=async()=>{if(busy||!player)return;busy=true;mutation++;target=null;try{setPlayer((await api('battle/start',{x:player.x,y:player.y})).player);battleMode='pve';$('battle-overlay').hidden=false;}catch(e){error(e);}finally{busy=false;hud();}};
for(const btn of document.querySelectorAll('[data-action]'))btn.onclick=async()=>{if(busy)return;busy=true;mutation++;renderBattle();try{if(battleMode==='pvp'){const d=await api('arena/turn',{id:duel.id,turn:duel.turn,action:btn.dataset.action});setArena(d.arena);setPlayer(d.player);}else{const b=player.battle;setPlayer((await api('battle/turn',{battleId:b.id,turn:b.turn,action:btn.dataset.action})).player);}}catch(e){error(e);try{setPlayer((await api('me')).player);}catch{}}finally{busy=false;renderBattle();}};
$('close-battle').onclick=()=>{if(battleMode==='pvp'&&duel)closedDuel=duel.id;$('battle-overlay').hidden=true;canvas.focus();};
canvas.addEventListener('pointerdown',e=>{if(!playing||busy||!$('world-overlay').hidden||drawer||!player||!$('battle-overlay').hidden||!$('profile-overlay').hidden||!$('shop-overlay').hidden)return;const r=canvas.getBoundingClientRect();const x=camera.x+(e.clientX-r.left)*canvas.width/r.width,y=camera.y+(e.clientY-r.top)*canvas.height/r.height;const hit=[player,...remotes].find(p=>Math.hypot(x-(p.drawX??p.x),y-(p.drawY??p.y))<26);if(hit){openProfile(hit.id);return;}const shop=places.find(p=>p.kind==='shop');if(shop&&x>shop.x-45&&x<shop.x+45&&y>shop.y-100&&y<shop.y+15){if(Math.hypot(player.x-shop.x,player.y-shop.y)<=shop.radius)openShop();else{target={x:shop.x,y:shop.y};notice('Camina a la tienda y pulsa E para entrar.');}return;}target={x:Math.max(16,Math.min(W-16,camera.x+(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(16,Math.min(H-16,camera.y+(e.clientY-r.top)*canvas.height/r.height))};canvas.focus();});
const directions={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)||!playing||busy||!$('world-overlay').hidden||!player||!$('join-overlay').hidden||!$('technical-overlay').hidden||!$('profile-overlay').hidden||!$('shop-overlay').hidden||!$('battle-overlay').hidden)return;const k=e.key.toLowerCase();if(drawer)return;if(directions[k]||k==='shift'){e.preventDefault();keys.add(k);target=null;}if(k==='e'&&!e.repeat){e.preventDefault();interact();}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
for(const btn of document.querySelectorAll('[data-move]')){const k={up:'w',down:'s',left:'a',right:'d'}[btn.dataset.move];btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);keys.add(k);target=null;};btn.onpointerup=btn.onpointercancel=()=>keys.delete(k);}
let last=0;
function frame(now){for(const e of enemies){const t=(Date.now()+clockOffset)/1000;e.x=e.homeX+Math.sin(t/5+e.homeX)*65;e.y=e.homeY+Math.cos(t/7+e.homeY)*45;}const dt=Math.min(.05,(now-last)/1000);last=now;let moving=false;
 if(player&&playing){const free=!busy&&!drawer&&$('world-overlay').hidden&&$('join-overlay').hidden&&$('battle-overlay').hidden&&$('invite-overlay').hidden&&$('technical-overlay').hidden&&$('profile-overlay').hidden&&$('shop-overlay').hidden;
  if(free&&player.battle?.status!=='active'){let dx=0,dy=0;for(const k of keys){const v=directions[k];if(v){dx+=v[0];dy+=v[1];}}let dist=Math.hypot(dx,dy);const keyboard=dist>0;if(!dist&&target){dx=target.x-player.x;dy=target.y-player.y;dist=Math.hypot(dx,dy);if(dist<2)target=null;}const sprint=keys.has('shift')&&energy>1&&dist>0;const step=(sprint?290:165)*dt;energy=Math.max(0,Math.min(100,energy+(sprint?-24:16)*dt));if(dist>0){moving=true;player.x=Math.max(16,Math.min(W-16,player.x+dx/dist*(keyboard?step:Math.min(step,dist))));player.y=Math.max(16,Math.min(H-16,player.y+dy/dist*(keyboard?step:Math.min(step,dist))));}
  for(const item of items)if(!busy&&Date.now()+clockOffset>=Math.max(item.availableAt||0,player.resourceReadyAt?.[item.id]||0)&&!collecting.has(item.id)&&player.battle?.status!=='active'&&Math.hypot(player.x-item.x,player.y-item.y)<22){collecting.add(item.id);mutation++;api('collect',{itemId:item.id,x:player.x,y:player.y}).then(d=>{setPlayer(d.player);notice('Hallazgo guardado · +12 EXP');}).catch(error).finally(()=>{mutation++;setTimeout(()=>collecting.delete(item.id),2000);});}
  }
  $('stamina').value=energy;nearest=places.filter(p=>Math.hypot(p.x-player.x,p.y-player.y)<(p.radius||80)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];$('interaction').hidden=!nearest||!free;
  if(nearest){let hint=nearest.hint;if(nearest.kind==='fish'&&fishing&&player.fishing){const time=Date.now()+clockOffset;hint=time<player.fishing.biteAt?'Espera… el agua se mueve':time<=player.fishing.until?'¡AHORA! Pulsa E para recoger':'El pez escapó. Vuelve a lanzar.';}$('interact-hint').textContent=hint;}
  const currentZone=zones.find(z=>z.id===(player.zone||'plaza'));if(currentZone){$('zone-name').textContent=currentZone.name;$('zone-sub').textContent=currentZone.detail;}
  $('duel').disabled=busy||Math.hypot(player.x-(npc?.x??-9999),player.y-(npc?.y??-9999))>52||duel?.status==='active';
 }
 if(player&&playing&&!document.hidden&&!busy&&!drawer&&$('world-overlay').hidden&&$('battle-overlay').hidden&&$('profile-overlay').hidden&&$('shop-overlay').hidden&&$('technical-overlay').hidden&&$('invite-overlay').hidden&&!(duel&&['pending','active'].includes(duel.status))&&player.hp>0&&player.battle?.status!=='active'&&Date.now()+clockOffset>(player.encounterSafeUntil||0)){const foe=enemies.find(e=>Date.now()+clockOffset>=(player.enemyReadyAt?.[e.id]||0)&&Math.hypot(player.x-e.x,player.y-e.y)<55);if(foe&&Date.now()>nextEncounter)startEncounter(foe.id);}
 if(now-lastChatPrune>1000){showMessages([]);lastChatPrune=now;}
 render(canvas,minimap,{player,remotes,items,enemies,places,target,npc,moving,messages,serverNow:Date.now()+clockOffset},dt,now);requestAnimationFrame(frame);
}
if(token){$('play-game').disabled=true;$('title-player').textContent='Recuperando tu explorador…';api('me').then(d=>{player=d.player;hud();titleScreen();}).catch(()=>{localStorage.removeItem('gq-session');sessionStorage.removeItem('gq-session');token=null;titleScreen();}).finally(()=>$('play-game').disabled=false);}
requestAnimationFrame(frame);

window.addEventListener('keydown',e=>{
 if(!playing||!$('world-overlay').hidden||!$('join-overlay').hidden||!$('battle-overlay').hidden||!$('invite-overlay').hidden||!$('technical-overlay').hidden||!$('profile-overlay').hidden||!$('shop-overlay').hidden)return;
 if(e.key==='Escape'){e.preventDefault();if(drawer)closeDrawer();else openDrawer('menu');return;}
 if(e.key==='Tab'&&drawer){const nodes=[...$('game-drawer').querySelectorAll('button,input')].filter(n=>!n.disabled&&n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(e.repeat||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 const which={q:'quests',c:'chat',p:'players'}[e.key.toLowerCase()];if(which){e.preventDefault();openDrawer(which);}
});

function effectText(item){
 if(item?.maxFocus)return 'Energía máxima: 4 en arena (empiezas con 2)';
 if(item?.attackRecovery)return 'Golpe recupera 2 de energía en arena';
 if(!item||(!item.hp&&!item.attack))return 'Solo apariencia · 40 PV / 10 daño en arena';
 return `${item.hp>0?'+':''}${item.hp} PV / ${item.attack>0?'+':''}${item.attack} daño en arena`;
}
async function ensureCatalog(){if(!catalog)catalog=await api('catalog');return catalog;}
async function openProfile(id){
 if(profileBusy)return;
 profileId=id;target=null;keys.clear();closeDrawer();$('shop-overlay').hidden=true;
 $('profile-overlay').hidden=false;$('profile-title').textContent='Cargando explorador…';
 $('profile-summary').textContent='';$('profile-avatar').hidden=true;$('profile-self').hidden=true;$('profile-challenge').hidden=true;$('profile-feedback').textContent='';$('close-profile').focus();
 try{
  const [d]=await Promise.all([api('profile/'+encodeURIComponent(id)),ensureCatalog()]);
  if(profileId!==id)return;
  const p=d.profile;$('profile-title').textContent=p.name;$('profile-summary').textContent=`Nivel ${p.level}`;
  $('profile-avatar').hidden=false;drawAvatar($('profile-avatar'),p.avatar);
  $('profile-self').hidden=id!==player.id;$('profile-challenge').hidden=id===player.id;
  if(id===player.id)renderWardrobe();
 }catch(e){if(profileId===id)$('profile-feedback').textContent=e.message;}
}
function renderWardrobe(){
 if(!catalog||!player)return;
 const owned=player.ownedCosmetics||[],avatar=player.avatar||{color:catalog.colors[0].color};
 if(profileId===player.id){drawAvatar($('profile-avatar'),avatar);$('profile-summary').textContent=`Nivel ${player.level||1} · ${effectText(catalog.accessories.find(i=>i.id===avatar.accessory))}`;}
 $('avatar-colors').replaceChildren();
 for(const color of catalog.colors){const btn=el('button',color.name,'secondary');btn.setAttribute('aria-pressed',String(avatar.color===color.color));btn.disabled=profileBusy;btn.onclick=()=>changeAvatar('avatar',{color:color.color});$('avatar-colors').append(btn);}
 $('wardrobe-items').replaceChildren();
 const none=el('button',avatar.accessory?'Sin accesorio':'Sin accesorio · equipado','secondary');none.disabled=profileBusy||!avatar.accessory;none.onclick=()=>changeAvatar('avatar',{accessory:null});$('wardrobe-items').append(none);
 for(const item of catalog.accessories.filter(i=>owned.includes(i.id))){
  const row=el('div',undefined,'wardrobe-row'),label=el('div',item.name),equipped=avatar.accessory===item.id;
  label.append(el('small',effectText(item),'muted'));const btn=el('button',equipped?'Equipado':'Equipar');
  btn.disabled=profileBusy||equipped;btn.onclick=()=>changeAvatar('avatar',{accessory:item.id});row.append(label,btn);$('wardrobe-items').append(row);
 }
 if(!owned.length)$('wardrobe-items').append(el('p','Tu armario está vacío. Visita la cabaña con el letrero TIENDA.','muted'));
 $('find-shop').disabled=profileBusy;
}
function renderShop(){
 if(!catalog||!player)return;
 $('shop-balance').textContent=`Tu saldo: ${player.coins} monedas`;$('shop-items').replaceChildren();
 for(const item of catalog.accessories){
  const card=el('article',undefined,'shop-item'),preview=el('canvas');preview.width=160;preview.height=130;preview.setAttribute('role','img');preview.setAttribute('aria-label',`Vista previa: ${item.name}`);
  drawAvatar(preview,{color:player.avatar?.color,accessory:item.id});
  const owned=(player.ownedCosmetics||[]).includes(item.id),button=el('button',owned?'Ya lo tienes':`Comprar · ${item.price} monedas`);
  button.disabled=profileBusy||owned||player.coins<item.price;button.onclick=()=>changeAvatar('shop/buy',{itemId:item.id,x:player.x,y:player.y});
  card.append(preview,el('h3',item.name),el('p',effectText(item),'muted'),button);$('shop-items').append(card);
 }
 $('shop-wardrobe').disabled=profileBusy;
}
async function openShop(){
 if(profileBusy||!player||!$('battle-overlay').hidden||player.battle?.status==='active')return;
 const shop=places.find(p=>p.kind==='shop');
 if(!shop||Math.hypot(player.x-shop.x,player.y-shop.y)>shop.radius){notice('Acércate a la Tienda Boreal.');return;}
 closeProfile();closeDrawer();target=null;keys.clear();$('shop-overlay').hidden=false;$('shop-feedback').textContent='';$('close-shop').focus();
 try{await ensureCatalog();if(!$('shop-overlay').hidden)renderShop();}catch(e){$('shop-feedback').textContent=e.message;}
}
function closeShop(){$('shop-overlay').hidden=true;canvas.focus();}
async function changeAvatar(path,body){
 if(profileBusy)return;const feedback=path==='shop/buy'?'shop-feedback':'profile-feedback';
 profileBusy=true;mutation++;renderWardrobe();renderShop();
 try{const d=await api(path,body);setPlayer(d.player);$(feedback).textContent=path==='shop/buy'?'Compra guardada. Equipa el accesorio en tu armario.':'Apariencia guardada.';}
 catch(e){$(feedback).textContent=e.message;}
 finally{mutation++;profileBusy=false;renderWardrobe();renderShop();}
}
function closeProfile(){profileId=null;$('profile-overlay').hidden=true;canvas.focus();}
$('open-profile').onclick=()=>{if(playing&&player)openProfile(player.id);};
$('close-profile').onclick=closeProfile;
$('profile-challenge').onclick=()=>{const id=profileId;closeProfile();challenge(id);};
$('close-shop').onclick=closeShop;
$('shop-wardrobe').onclick=()=>openProfile(player.id);
$('find-shop').onclick=()=>{if((player.zone||'plaza')!=='plaza'){closeProfile();openWorld();notice('Vuelve a la plaza para visitar la tienda.');return;}const shop=catalog.shop;closeProfile();target={x:shop.x,y:shop.y};notice('Sigue el camino hasta la tienda y pulsa E.');};
window.addEventListener('keydown',e=>{
 const overlay=!$('profile-overlay').hidden?'profile-overlay':!$('shop-overlay').hidden?'shop-overlay':null;
 if(!overlay)return;
 if(e.key==='Escape'){e.preventDefault();overlay==='profile-overlay'?closeProfile():closeShop();}
 if(e.key==='Tab'){const nodes=[...$(overlay).querySelectorAll('button')].filter(n=>!n.disabled&&n.getClientRects().length);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}
});

async function travel(portal){
 if(busy||profileBusy||collecting.size){notice('Espera a que termine tu acción.');return;}
 busy=true;mutation++;keys.clear();target=null;
 try{const d=await api('travel',{portal,x:player.x,y:player.y});clockOffset=d.serverTime-Date.now();setPlayer(d.player);notice('Llegaste a una nueva zona. Explora sus actividades.');}
 catch(e){error(e);}finally{mutation++;busy=false;canvas.focus();}
}
async function doActivity(place){
 if(busy)return;busy=true;mutation++;target=null;
 try{const d=await api('activity',{place,x:player.x,y:player.y});setPlayer(d.player);showQuests(d.quests);notice(d.player.activityMessage);}
 catch(e){error(e);}finally{mutation++;busy=false;canvas.focus();}
}
function closeWorld(){$('world-overlay').hidden=true;canvas.focus();}
function openWorld(){
 if(!playing||busy||!player||!$('battle-overlay').hidden)return;
 closeDrawer();closeProfile();closeShop();keys.clear();target=null;
 $('world-overlay').hidden=false;$('zone-cards').replaceChildren();
 for(const z of zones){
  const here=z.id===(player.zone||'plaza'),card=el('article',undefined,'zone-card '+z.id);
  const btn=el('button',here?'Estás aquí':'Caminar al sendero','secondary');btn.disabled=here;
  card.append(el('span',{wilds:'⚔',plaza:'⌂',lake:'≈',forest:'♧',ruins:'✦'}[z.id],'zone-symbol'),el('h3',z.name),el('p',z.detail),btn);
  btn.onclick=()=>{const portal=places.find(p=>p.kind==='portal'&&p.to===z.id)||places.find(p=>p.kind==='portal'&&p.to==='plaza');closeWorld();if(portal){target={x:portal.x,y:portal.y};notice(portal.to===z.id?'Sigue el sendero y pulsa E al llegar.':'Primero vuelve a la plaza para tomar el siguiente camino.');}};
  $('zone-cards').append(card);
 }
 $('close-world').focus();
}
$('open-world').onclick=openWorld;$('close-world').onclick=closeWorld;
window.addEventListener('keydown',e=>{
 if($('world-overlay').hidden)return;
 if(e.key==='Escape'){e.preventDefault();closeWorld();}
 if(e.key==='Tab'){const nodes=[...$('world-overlay').querySelectorAll('button')].filter(n=>!n.disabled);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}
});

let nextEncounter=0;
async function startEncounter(enemyId){busy=true;mutation++;target=null;keys.clear();nextEncounter=Date.now()+4000;
 try{const d=await api('battle/start',{enemyId,x:player.x,y:player.y});setPlayer(d.player);battleMode='pve';$('battle-overlay').hidden=false;renderBattle();}
 catch(e){if(e.status!==409)error(e);}finally{mutation++;busy=false;renderBattle();}}
