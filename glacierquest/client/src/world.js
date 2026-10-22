import { makeZone, drawPlaces } from './zone-scenery.js';
import { activeBubbles, drawBubble } from './chat-bubbles.mjs';
export const W=1600,H=1000;
export const camera={x:0,y:0};
let scenery,sceneryZone,trees=[];
function ellipse(c,x,y,a,b,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fill();}
function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function tree(c,{x,y,s}){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,5,12,28,9,'#547e8d22');c.fillStyle='#5a6d70';c.fillRect(-3,-6,6,20);for(let j=0;j<3;j++){const h=j*14;poly(c,[[-23+h/5,7-h],[0,-38-h],[23-h/5,7-h]],j%2?'#437e86':'#316a78');poly(c,[[-18+h/5,-h],[0,-38-h],[17-h/5,-h],[4,-7-h],[-3,-4-h]],'#e6f4f1');}c.restore();}
function penguin(c,x,y,color,label,level,now,walking=false,accessory=null){c.save();c.translate(x,y+(walking?Math.sin(now/80)*2:0));ellipse(c,2,15,18,6,'#294b6540');ellipse(c,-6,17,7,3,'#dfa657');ellipse(c,7,17,7,3,'#dfa657');ellipse(c,0,-1,14,20,color);ellipse(c,-13,2,4,10,color);ellipse(c,13,2,4,10,color);ellipse(c,0,4,9,12,'#f4faf5');ellipse(c,-4,-10,3,4,'#f4faf5');ellipse(c,4,-10,3,4,'#f4faf5');ellipse(c,-3,-10,1.4,2,'#173447');ellipse(c,5,-10,1.4,2,'#173447');poly(c,[[-4,-5],[6,-5],[0,1]],'#eeb96a');if(accessory==='scarf'){c.fillStyle='#d68c69';c.fillRect(-11,-1,23,4);c.fillRect(7,1,5,10);}if(accessory==='hat'){c.fillStyle='#af475d';c.fillRect(-15,-22,30,5);c.fillRect(-10,-34,20,12);}if(accessory==='glasses'){c.fillStyle='#172b45';c.fillRect(-10,-14,9,7);c.fillRect(2,-14,9,7);c.fillRect(-2,-12,5,2);}if(accessory==='earmuffs'){c.strokeStyle='#b787cf';c.lineWidth=4;c.beginPath();c.arc(0,-12,13,Math.PI,0);c.stroke();ellipse(c,-13,-10,5,7,'#c9a2df');ellipse(c,13,-10,5,7,'#c9a2df');}
if(accessory==='crown'){poly(c,[[-13,-22],[-14,-34],[-6,-28],[0,-39],[6,-28],[14,-34],[13,-22]],'#b6eff5');c.fillStyle='#6bbdd7';c.fillRect(-13,-24,26,4);ellipse(c,0,-28,2,3,'#7286d3');}
if(accessory==='vest'){poly(c,[[-11,-2],[-4,0],[-3,15],[-12,12]],'#568c70');poly(c,[[11,-2],[4,0],[3,15],[12,12]],'#568c70');c.fillStyle='#d4bf83';c.fillRect(-10,6,5,4);c.fillRect(5,6,5,4);}
if(accessory==='sword'){poly(c,[[18,7],[16,-21],[20,-29],[24,-21],[22,7]],'#b5e8f2');c.fillStyle='#7ab2cb';c.fillRect(19,-20,2,26);c.fillStyle='#bd9554';c.fillRect(13,6,14,4);c.fillStyle='#684b54';c.fillRect(18,10,5,9);}if(accessory==='pendant'){c.strokeStyle='#cfb675';c.lineWidth=2;c.beginPath();c.moveTo(-8,-2);c.lineTo(0,8);c.lineTo(8,-2);c.stroke();poly(c,[[0,4],[5,10],[0,16],[-5,10]],'#89e8d5');}if(accessory==='gloves'){ellipse(c,-14,8,5,7,'#9967c3');ellipse(c,14,8,5,7,'#9967c3');c.fillStyle='#eed292';c.fillRect(-18,3,8,3);c.fillRect(10,3,8,3);}c.font='600 10px Segoe UI';c.textAlign='center';const text=label||'',w=c.measureText(text).width+16;if(!label){c.restore();return;}c.fillStyle='#142c41cc';c.beginPath();c.roundRect(-w/2,28,w,20,5);c.fill();c.fillStyle='#f4f8fa';c.fillText(text,0,42);c.restore();}
// Same drawing as the world: previews cannot drift from the equipped appearance.
export function drawAvatar(canvas,avatar={}){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);c.fillStyle='#234557';c.fillRect(0,0,w,h);
 ellipse(c,w/2,h*.8,w*.32,h*.08,'#a6d8d333');
 const scale=Math.min(w/70,h/85);c.save();c.translate(w/2,h*.62);c.scale(scale,scale);
 penguin(c,0,0,avatar?.color||'#36b5d8',null,null,0,false,avatar?.accessory);c.restore();
}
export function render(canvas,minimap,state,dt,now){const zone=state.player?.zone||'plaza';if(!scenery||sceneryZone!==zone){const scene=makeZone(zone,W,H);scenery=scene.canvas;trees=scene.trees;sceneryZone=zone;}const scale=Math.min(1.15,1280/canvas.clientWidth,850/canvas.clientHeight);const cw=Math.round(canvas.clientWidth*scale),ch=Math.round(canvas.clientHeight*scale);if(cw>0&&ch>0&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;}const vw=canvas.width,vh=canvas.height,c=canvas.getContext('2d'),{player,remotes,items,target,npc}=state;
 const px=player?.x??320,py=player?.y??340;camera.x=Math.max(0,Math.min(W-vw,px-vw/2));camera.y=Math.max(0,Math.min(H-vh,py-vh/2));
 c.clearRect(0,0,vw,vh);c.save();c.translate(-camera.x,-camera.y);c.drawImage(scenery,0,0);
 // Warm campfire and small footprints give the otherwise icy world a focal point.
 if(zone==='plaza'){const glow=c.createRadialGradient(320,340,1,320,340,48);glow.addColorStop(0,'#ffc37b55');glow.addColorStop(1,'#ffc37b00');c.fillStyle=glow;c.fillRect(270,290,100,100);ellipse(c,320,345,15,7,'#617f83');poly(c,[[310,344],[317,320+Math.sin(now/180)*4],[323,332],[327,325],[331,344]],'#e7a95e');poly(c,[[317,344],[321,329],[326,344]],'#ffe5a1');}
 for(const item of items)if(state.serverNow>=Math.max(item.availableAt||0,player?.resourceReadyAt?.[item.id]||0)){const y=item.y+Math.sin(now/450+item.x)*3;ellipse(c,item.x,item.y+9,8,3,'#4f7b8c33');if(item.type==='coin'){ellipse(c,item.x,y,7,9,'#d69b48');ellipse(c,item.x-1,y-1,5,7,'#f5cf7b');c.fillStyle='#c18d48';c.fillRect(item.x-1,y-4,2,7);}else{ellipse(c,item.x,y,10,5,'#528b9c');poly(c,[[item.x+7,y],[item.x+16,y-7],[item.x+16,y+7]],'#689caa');}}
 if(target){c.strokeStyle='#4a8d9c';c.lineWidth=2;c.beginPath();c.ellipse(target.x,target.y,10,5,0,0,Math.PI*2);c.stroke();}
 drawPlaces(c,state.places||[],player,state.serverNow);
 const objects=trees.map(t=>({y:t.y,draw:()=>tree(c,t)}));
 for(const e of state.enemies||[])if(state.serverNow>=(player?.enemyReadyAt?.[e.id]||0))objects.push({y:e.y,draw:()=>{ellipse(c,e.x,e.y+12,24,9,'#894c5866');c.font='36px Segoe UI Emoji';c.textAlign='center';c.fillText(e.icon,e.x,e.y+3);c.font='bold 12px Segoe UI';c.fillStyle='#233849';c.fillText(e.name,e.x,e.y+31);}});
 if(npc)objects.push({y:npc.y,draw:()=>penguin(c,npc.x,npc.y,'#6b648d','Guardián',null,now)});
 for(const r of remotes){r.drawX+=(r.x-r.drawX)*Math.min(1,dt*10);r.drawY+=(r.y-r.drawY)*Math.min(1,dt*10);objects.push({y:r.drawY,draw:()=>penguin(c,r.drawX,r.drawY,r.avatar?.color||'#36b5d8',r.name,null,now,Math.hypot(r.x-r.drawX,r.y-r.drawY)>2,r.avatar?.accessory)});}
 if(player)objects.push({y:py,draw:()=>penguin(c,px,py,player.avatar?.color||'#36b5d8',player.name,null,now,!!target||state.moving,player.avatar?.accessory)});
 objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());c.restore();
 for(let i=0;i<45;i++){const x=(i*191+now*.014)%(vw+20),y=(i*73+now*(.008+i%3*.003))%(vh+20);c.fillStyle='#ffffff90';c.beginPath();c.arc(x,y,1+i%2*.5,0,Math.PI*2);c.fill();}
 const bubbles=activeBubbles(state.messages||[],state.serverNow);for(const p of [...remotes,...(player?[player]:[])]){const x=(p.drawX??p.x)-camera.x,y=(p.drawY??p.y)-camera.y;if(bubbles.has(p.id)&&x>=0&&x<=vw&&y>=0&&y<=vh)drawBubble(c,bubbles.get(p.id).body,x,y,vw,vh);}
 const m=minimap.getContext('2d');m.drawImage(scenery,0,0,160,100);m.strokeStyle='#ffffff';m.lineWidth=1;m.strokeRect(camera.x/10,camera.y/10,vw/10,vh/10);m.fillStyle='#0c536e';m.beginPath();m.arc(px/10,py/10,3,0,Math.PI*2);m.fill();m.fillStyle='#be6e60';for(const r of remotes){m.beginPath();m.arc(r.x/10,r.y/10,2,0,Math.PI*2);m.fill();}
}
