// Original procedural score: slow D-minor pads, pentatonic bells and filtered wind.
// Synthesized locally; no audio downloads, trackers or cloud requests.
export function createSoundscape() {
  let ctx, master, music, effects, timer, wind, active=false, step=0;
  let enabled=true, volume=.22;
  try { enabled=localStorage.getItem('gq-music')!=='off'; const saved=localStorage.getItem('gq-volume'); if(saved!==null&&Number.isFinite(+saved))volume=Math.max(0,Math.min(1,+saved)); } catch {}
  const save=()=>{try{localStorage.setItem('gq-music',enabled?'on':'off');localStorage.setItem('gq-volume',String(volume));}catch{}};
  const hz=n=>440*2**((n-69)/12);
  function tone(note,when,length,gain=.05,type='sine',bus=music) {
    const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.value=hz(note);
    env.gain.setValueAtTime(0,when);env.gain.linearRampToValueAtTime(gain,when+Math.min(.7,length*.15));
    env.gain.exponentialRampToValueAtTime(.0001,when+length);osc.connect(env);env.connect(bus);
    osc.start(when);osc.stop(when+length+.05);osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
  function bar(){
    if(!active||!enabled||document.hidden||ctx.state!=='running')return;
    const chords=[[50,57,65],[46,53,62],[53,60,69],[48,55,64]],chord=chords[step%4],t=ctx.currentTime+.05;
    chord.forEach(n=>tone(n,t,9,.045));tone(chord[0]-12,t,8,.045);
    const melody=[[74,77,81,77],[74,72,69,65],[77,81,84,81],[76,72,69,72]][step%4];
    melody.forEach((n,i)=>{tone(n,t+i*1.8,3,.055);tone(n+12,t+i*1.8+.24,2,.012);});step++;
  }
  function init(){
    if(ctx)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    ctx=new Audio();master=ctx.createGain();music=ctx.createGain();effects=ctx.createGain();
    const compressor=ctx.createDynamicsCompressor();master.gain.value=0;music.connect(master);effects.connect(master);master.connect(compressor);compressor.connect(ctx.destination);
    const noise=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.08;
    wind=ctx.createBufferSource();wind.buffer=noise;wind.loop=true;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=420;wind.connect(filter);filter.connect(music);wind.start();
  }
  function update(){
    if(!ctx)return;
    const audible=active&&enabled&&!document.hidden;
    master.gain.setTargetAtTime(audible?volume:0,ctx.currentTime,.25);
    if(audible&&!timer){bar();timer=setInterval(bar,8000);}
    else if(!audible){clearInterval(timer);timer=null;}
  }
  async function unlock(){try{init();if(ctx?.state==='suspended')await ctx.resume();update();return !!ctx&&ctx.state==='running';}catch{return false;}}
  document.addEventListener('visibilitychange',update);
  return {
    get enabled(){return enabled;}, get volume(){return volume;},
    get playing(){return !!ctx&&ctx.state==='running'&&active&&enabled&&!document.hidden&&volume>0;},
    unlock,
    setActive(value){if(active===value)return;active=value;update();},
    async toggle(){enabled=!enabled;save();if(enabled)await unlock();else update();},
    setVolume(value){volume=Math.max(0,Math.min(1,value));save();if(ctx)master.gain.setTargetAtTime(active&&enabled&&!document.hidden?volume:0,ctx.currentTime,.1);},
    effect(action){if(!ctx||!active||!enabled||document.hidden||ctx.state!=='running')return;const t=ctx.currentTime;
      const notes={attack:[55,43],power:[38,45,50],frost:[86,81,77],heal:[62,65,69],defend:[50,57],charge:[38,41]}[action]||[];
      notes.forEach((n,i)=>tone(n,t+i*.075,.45,.1,action==='power'?'triangle':'sine',effects));
    }
  };
}
