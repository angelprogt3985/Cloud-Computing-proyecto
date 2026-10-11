import { mergeMessages } from './chat-state.mjs';
const $ = id => document.getElementById(id);
const canvas = $('map-canvas'), ctx = canvas.getContext('2d');
let token = sessionStorage.getItem('gq-session'), player, target, npc = { x: 520, y: 160, name: 'Guardián' }, items = [], remotes = [], collecting = new Set(), busy = false, running = false;
const POLL_MS = 1500;
let messages = [];
function showMessages(incoming) {
  const next = mergeMessages(messages, incoming);
  if (next.length === messages.length && next.every((message, i) => message.id === messages[i].id)) return;
  messages = next; $('chat-list').replaceChildren();
  for (const m of messages) { const p = document.createElement('p'); const b = document.createElement('b'); b.textContent = m.player_name + ': '; p.append(b, document.createTextNode(m.body)); $('chat-list').append(p); }
  $('chat-list').scrollTop = $('chat-list').scrollHeight;
}
fetch('/health').then(r => r.json()).then(d => { $('demo-warning').hidden = !d.ephemeral; }).catch(() => {});
async function api(path, body) {
  const r = await fetch('/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(12000) });
  const data = await r.json(); if (!r.ok) { const e = new Error(data.error || 'Error del servidor'); e.status = r.status; throw e; } return data;
}
function error(e) { $('notice').textContent = e.message; if (e.status === 401) { sessionStorage.removeItem('gq-session'); token = null; player = null; $('join-overlay').hidden = false; } }
function setPlayer(p) { const xy = player ? { x: player.x, y: player.y } : {}; player = { ...p, ...xy }; hud(); }
function hud() {
  if (!player) return;
  $('hud-name').textContent = player.name;
  $('hud-stats').textContent = `${player.hp}/${player.maxHp} PV · ${player.coins} monedas · ${player.fish} peces`;
  const b = player.battle;
  if (b && ! $('battle-overlay').hidden) {
    $('battle-status').textContent = `Tú ${player.hp}/${player.maxHp} PV · Guardián ${b.hp}/${b.maxHp} PV`;
    $('enemy-hp').value = b.hp; $('your-hp').value = player.hp;
    $('intent').textContent = b.status === 'active' ? `Próxima acción: ${b.intent}` : ({ won: '¡Victoria!', lost: 'Derrota de práctica', escaped: 'Te retiraste' }[b.status]);
    $('battle-log').textContent = b.log.join(' ');
    $('heal').textContent = `Curar +12 (${b.potions})`;
    for (const btn of document.querySelectorAll('[data-action]')) btn.disabled = busy || b.status !== 'active' || (btn.dataset.action === 'heal' && (!b.potions || player.hp === player.maxHp));
    $('close-battle').disabled = busy;
    $('close-battle').textContent = b.status === 'active' ? 'Cerrar y continuar después' : 'Volver a la plaza';
  }
}
async function inspectServices() {
  try {
    const d = await api('services'); $('services').replaceChildren();
    for (const s of d.services) { const li = document.createElement('li'); const strong = document.createElement('strong'); strong.textContent = s.name + ': '; li.append(strong, document.createTextNode(s.status)); $('services').append(li); }
    $('checked').textContent = 'Comprobado: ' + new Date(d.checkedAt).toLocaleTimeString();
    const r = await fetch('/api/asset', { headers: { Authorization: 'Bearer ' + token } });
    if (!r.ok) throw new Error('No se pudo cargar el recurso de Storage');
    const old = $('banner').src; $('banner').src = URL.createObjectURL(await r.blob()); if (old.startsWith('blob:')) URL.revokeObjectURL(old);
    $('asset-source').textContent = 'Recurso visual: ' + r.headers.get('X-Asset-Source');
  } catch(e) { error(e); }
}
async function begin() {
  $('join-overlay').hidden = true; hud(); inspectServices();
  if (player.battle?.status === 'active') { $('battle-overlay').hidden = false; hud(); }
  if (!running) { running = true; sync(); requestAnimationFrame(frame); }
}
$('join-form').addEventListener('submit', async e => {
  e.preventDefault(); const btn = $('join-button'); btn.disabled = true;
  try { const d = await api('join', { name: $('join-name').value, code: $('join-code').value }); token = d.token; sessionStorage.setItem('gq-session', token); player = d.player; await begin(); }
  catch(e) { $('join-error').textContent = e.message; } finally { btn.disabled = false; }
});
async function sync() {
  try {
    if (player && !document.hidden) {
      const d = await api('sync', { x: player.x, y: player.y });
      remotes = d.players.filter(p => p.id !== player.id).map(p => { const prev = remotes.find(r => r.id === p.id); return { ...p, drawX: prev?.drawX ?? p.x, drawY: prev?.drawY ?? p.y }; });
      npc = d.npc; items = d.items; $('online').textContent = `${d.players.length} en la plaza`;
      $('connection').textContent = 'Conectado'; showMessages(d.messages);
    }
  } catch(e) { $('connection').textContent = 'Reconectando…'; error(e); }
  finally { setTimeout(sync, POLL_MS); }
}
$('chat-form').addEventListener('submit', async e => {
  e.preventDefault(); const body = $('chat-input').value.trim(); if (!body) return;
  const btn = e.currentTarget.querySelector('button'); btn.disabled = true;
  try { const d = await api('chat', { body }); showMessages([d.message]); if ($('chat-input').value.trim() === body) $('chat-input').value = ''; $('notice').textContent = 'Mensaje enviado'; } catch(e) { error(e); } finally { btn.disabled = false; }
});
$('refresh-services').addEventListener('click', inspectServices);
canvas.addEventListener('pointerdown', e => {
  if (!player || ! $('battle-overlay').hidden) return;
  const r = canvas.getBoundingClientRect();
  target = { x: Math.max(16, Math.min(624, (e.clientX - r.left) * 640 / r.width)), y: Math.max(16, Math.min(384, (e.clientY - r.top) * 400 / r.height)) };
  canvas.focus();
});
canvas.addEventListener('keydown', e => {
  const delta = { ArrowUp: [0,-35], ArrowDown: [0,35], ArrowLeft: [-35,0], ArrowRight: [35,0] }[e.key];
  if (delta && player && $('battle-overlay').hidden) { e.preventDefault(); target = { x: Math.max(16,Math.min(624,player.x+delta[0])), y: Math.max(16,Math.min(384,player.y+delta[1])) }; }
});
$('duel').addEventListener('click', async () => {
  if (!player || busy) return; busy = true; target = null;
  try { const d = await api('battle/start', { x: player.x, y: player.y }); setPlayer(d.player); $('battle-overlay').hidden = false; }
  catch(e) { error(e); } finally { busy = false; hud(); }
});
for (const btn of document.querySelectorAll('[data-action]')) btn.addEventListener('click', async () => {
  if (busy) return; busy = true; hud();
  try { const b = player.battle; setPlayer((await api('battle/turn', { action: btn.dataset.action, battleId: b.id, turn: b.turn })).player); }
  catch(e) { error(e); try { setPlayer((await api('me')).player); } catch(e2) { error(e2); } }
  finally { busy = false; hud(); }
});
$('close-battle').addEventListener('click', () => { $('battle-overlay').hidden = true; target = null; });
let last = 0;
function frame(time) {
  const dt = Math.min(0.05, (time-last)/1000); last = time;
  if (player && $('battle-overlay').hidden) {
    if (target) { const dx=target.x-player.x, dy=target.y-player.y, dist=Math.hypot(dx,dy), step=160*dt;
      if (dist <= step) { player.x=target.x; player.y=target.y; target=null; } else { player.x+=dx/dist*step; player.y+=dy/dist*step; }
    }
    $('duel').disabled = busy || Math.hypot(player.x-npc.x,player.y-npc.y)>52;
    for (const item of items) if (!player.collected.includes(item.id) && !collecting.has(item.id) && player.battle?.status !== 'active' && Math.hypot(player.x-item.x,player.y-item.y)<22) {
      collecting.add(item.id); api('collect',{ itemId:item.id,x:player.x,y:player.y }).then(d=>{setPlayer(d.player); $('notice').textContent='Objeto guardado en tu inventario';}).catch(error).finally(()=>setTimeout(()=>collecting.delete(item.id),2000));
    }
  }
  draw(dt); requestAnimationFrame(frame);
}
function penguin(x,y,color,label) {
  ctx.fillStyle='#16455722'; ctx.beginPath(); ctx.ellipse(x,y+13,18,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,14,19,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y+5,9,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#183345';ctx.beginPath();ctx.arc(x-4,y-7,2,0,Math.PI*2);ctx.arc(x+4,y-7,2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#efae45';ctx.beginPath();ctx.moveTo(x-4,y-2);ctx.lineTo(x+4,y-2);ctx.lineTo(x,y+3);ctx.fill();
  ctx.fillStyle='#173b50';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(label,x,Math.min(396,y+34));
}
function draw(dt) {
  ctx.fillStyle='#dceff1';ctx.fillRect(0,0,640,400);
  ctx.fillStyle='#9dd4df';ctx.beginPath();ctx.ellipse(318,188,225,118,-.1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#ffffff80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(318,188,200,97,-.1,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#f4faf6';for(const [x,y] of [[15,20],[140,35],[470,25],[615,240],[25,220]]) {ctx.beginPath();ctx.arc(x,y,45,0,Math.PI*2);ctx.fill();}
  ctx.font='bold 13px sans-serif';ctx.fillStyle='#557e89';ctx.textAlign='left';ctx.fillText('LAGUNA BOREAL',24,32);
  for (const i of items) if (!player?.collected.includes(i.id)) {ctx.fillStyle=i.type==='coin'?'#e9aa37':'#378f83';ctx.beginPath();ctx.ellipse(i.x,i.y,9,i.type==='coin'?9:5,0,0,Math.PI*2);ctx.fill();}
  if(target) {ctx.strokeStyle='#238796';ctx.beginPath();ctx.arc(target.x,target.y,9,0,Math.PI*2);ctx.stroke();}
  penguin(npc.x,npc.y,'#725b9b','Guardián');
  for(const p of remotes) {p.drawX+=(p.x-p.drawX)*Math.min(1,dt*8);p.drawY+=(p.y-p.drawY)*Math.min(1,dt*8);penguin(p.drawX,p.drawY,'#ca8451',p.name);}
  if(player) penguin(player.x,player.y,'#237a95',player.name);
}
if (token) api('me').then(d=>{player=d.player;begin();}).catch(e=>{token=null;sessionStorage.removeItem('gq-session');$('join-error').textContent=e.message;});
draw(0);
