const palettes={plaza:['#d7e9ec','#afcfd9'],lake:['#b7e1e8','#6faccc'],forest:['#b9d7d1','#598b86'],wilds:['#d6ddea','#718da6'],ruins:['#c1c5df','#757d9c']};
function oval(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill();}
function path(c,points){c.strokeStyle='#f0efdf99';c.lineWidth=55;c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.strokeStyle='#aec5c055';c.lineWidth=2;c.stroke();}
function hut(c,x,y,label){c.fillStyle='#487383';c.fillRect(x-45,y-55,90,65);c.fillStyle='#e5f3ee';c.beginPath();c.moveTo(x-60,y-55);c.lineTo(x,y-110);c.lineTo(x+60,y-55);c.fill();c.fillStyle='#eec68b';c.fillRect(x-30,y-40,18,18);c.fillStyle='#294b5e';c.fillRect(x+5,y-25,22,35);c.font='bold 13px Segoe UI';c.textAlign='center';c.fillStyle='#ffe6ad';c.fillText(label,x,y-60);}
export function makeZone(zone,W,H){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
 const [light,dark]=palettes[zone]||palettes.plaza,g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,light);g.addColorStop(1,dark);c.fillStyle=g;c.fillRect(0,0,W,H);
 for(let i=0;i<90;i++)oval(c,(i*371)%W,(i*137)%H,20+i%40,5+i%12,'#f5fffa33');
 const trees=[];
 if(zone==='plaza'){
  path(c,[[650,450],[1350,820]]);path(c,[[320,340],[650,450],[1300,450]]);path(c,[[650,450],[800,800]]);path(c,[[650,450],[1050,170]]);path(c,[[320,340],[360,790]]);
  hut(c,250,275,'REFUGIO');hut(c,390,270,'TIENDA');hut(c,175,415,'EXPEDICIÓN');
  oval(c,360,790,110,70,'#6587a2');oval(c,360,790,95,58,'#d7e3e7');
  c.strokeStyle='#8a748d';c.lineWidth=5;c.strokeRect(455,105,130,100);
  for(let i=0;i<22;i++)trees.push({x:75+(i*277)%1450,y:60+(i*149)%850,s:.8});
 }else if(zone==='lake'){
  oval(c,790,430,500,290,'#5c9db9');oval(c,790,430,455,248,'#76bace');
  for(let i=0;i<5;i++){c.strokeStyle='#d6f3f480';c.lineWidth=3;c.beginPath();c.ellipse(790,430,420-i*55,220-i*30,0,0,Math.PI*2);c.stroke();}
  path(c,[[230,500],[410,720],[1020,720],[1020,650]]);
  c.fillStyle='#8a8273';c.fillRect(715,480,90,255);for(let i=0;i<25;i++){c.fillStyle=i%2?'#b3a68b':'#9c947e';c.fillRect(719,483+i*10,82,7);}
  hut(c,1020,650,'PESCADERÍA');
  for(const [x,y] of [[480,270],[1100,300],[920,150],[590,500]])oval(c,x,y,70,20,'#e4f4ef');
 }else if(zone==='forest'){
  path(c,[[230,500],[350,300],[650,280],[1100,520],[720,800],[230,500]]);hut(c,350,300,'TALLER');
  for(let i=0;i<150;i++){const x=40+(i*239)%1520,y=50+(i*173)%900;if([[230,500],[350,300],[650,280],[1100,520],[720,800]].every(([a,b])=>Math.hypot(x-a,y-b)>110))trees.push({x,y,s:.9+(i%4)*.15});}
  oval(c,840,180,160,45,'#81cdbb55');
 }else if(zone==='wilds'){
  path(c,[[230,500],[650,550],[1000,300],[1210,740]]);hut(c,300,400,'ENTRADA SEGURA');
  for(let i=0;i<30;i++){const x=450+(i*217)%1050,y=100+(i*139)%800;oval(c,x,y,35,18,'#617f98');}
  c.fillStyle='#263e55';c.font='bold 20px Segoe UI';c.fillText('Enemigos errantes: observa sus ataques',470,150);
 }else{
  path(c,[[230,500],[700,700],[820,500],[640,330],[1000,330],[820,500]]);
  oval(c,820,450,300,240,'#9d9bb8');oval(c,820,450,260,200,'#bcbcd3');
  for(const [x,y,h] of [[500,230,120],[1120,240,140],[530,700,80],[1120,700,100]]){c.fillStyle='#666c89';c.fillRect(x,y-h,38,h);c.fillStyle='#d0d5e6';c.fillRect(x-8,y-h-7,54,15);}
  c.strokeStyle='#e0d7a655';c.lineWidth=4;c.beginPath();c.arc(820,450,185,0,Math.PI*2);c.stroke();
 }
 // Border ridges make each room read as an enclosed place, without enlarging its server footprint.
 for(let i=0;i<12;i++){const x=i*150;c.fillStyle=dark;c.beginPath();c.moveTo(x-70,75);c.lineTo(x,-35);c.lineTo(x+100,75);c.fill();}
 return {canvas,trees};
}
export function drawPlaces(c,places,player,now){
 for(const p of places){
  if(!['portal','forage','rune','clue','trade-fish','trade-crystals'].includes(p.kind))continue;
  c.save();c.translate(p.x,p.y);const ready=(player?.activityReadyAt?.[p.id]||0)<=now;
  if(p.kind==='portal'){oval(c,0,0,45,21,'#f9edbc66');c.fillStyle='#466276';c.fillRect(-3,-60,6,55);c.fillStyle='#f2dca9';c.fillRect(-66,-64,132,25);c.fillStyle='#304e5d';c.font='bold 11px Segoe UI';c.textAlign='center';c.fillText(p.name,0,-47);}
  else if(p.kind==='forage'){c.fillStyle=ready?'#96fff0':'#628b86';c.beginPath();c.moveTo(-15,5);c.lineTo(-8,-28);c.lineTo(6,-44);c.lineTo(18,-14);c.lineTo(10,8);c.fill();}
  else if(p.kind==='rune'||p.kind==='clue'){oval(c,0,0,32,18,'#64677f');c.fillStyle='#fce2a2';c.font='bold 27px Segoe UI';c.textAlign='center';c.fillText(p.id==='rune-sun'?'☀':p.id==='rune-moon'?'☽':p.id==='rune-star'?'★':'≋',0,-8);}
  if(p.kind!=='portal'){c.font='bold 12px Segoe UI';c.textAlign='center';const label=p.kind==='forage'&&!ready?`Crece en ${Math.ceil((player.activityReadyAt[p.id]-now)/1000)} s`:p.name;c.fillStyle='#183e50';c.fillText(label,0,34);}
  c.restore();
 }
}
