const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
test('audio waits for play, does not stack loops, mutes offscreen and persists preferences',async()=>{
 const intervals=new Set(),saved=new Map(),listeners={};let voices=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}});
 const node=()=>({connect(){},disconnect(){},start(){},stop(){},gain:param(),frequency:param()});
 class AudioContext{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={};}createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(400)};}createOscillator(){voices++;return node();}async resume(){this.state='running';}}
 const context=vm.createContext({window:{AudioContext},document:{hidden:false,addEventListener:(k,fn)=>listeners[k]=fn},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},setInterval:fn=>{intervals.add(fn);return fn;},clearInterval:fn=>intervals.delete(fn)});
 const source=readFileSync(require.resolve('../../client/src/soundscape.js'),'utf8').replace('export function','function');
 vm.runInContext(source+';var audio=createSoundscape();',context);const audio=context.audio;
 await audio.unlock();assert.equal(voices,0);audio.setActive(true);assert.ok(voices>0);assert.equal(intervals.size,1);
 const before=voices;await audio.unlock();assert.equal(voices,before);assert.equal(intervals.size,1);
 await audio.toggle();assert.equal(intervals.size,0);assert.equal(audio.playing,false);assert.equal(saved.get('gq-music'),'off');
 await audio.toggle();audio.setVolume(.4);assert.equal(saved.get('gq-volume'),'0.4');assert.equal(audio.playing,true);
 context.document.hidden=true;listeners.visibilitychange();assert.equal(intervals.size,0);assert.equal(audio.playing,false);
 context.document.hidden=false;listeners.visibilitychange();assert.equal(intervals.size,1);
 audio.setActive(false);assert.equal(intervals.size,0);assert.equal(audio.playing,false);
});
