/* Trilha original sintetizada localmente: nenhum arquivo externo ou rastreamento. */
(function(){
'use strict';
let ctx,master,timer,next=0,beat=0,enabled=localStorage.getItem('imuno-music')!=='off';
let volume=Number(localStorage.getItem('imuno-volume')??.22);
if(!Number.isFinite(volume))volume=.22;
volume=Math.max(0,Math.min(.5,volume));
const button=document.getElementById('musicToggle'),slider=document.getElementById('musicVolume');
slider.value=volume;
function paint(){button.setAttribute('aria-pressed',String(enabled));button.querySelector('span').textContent=enabled?'Música ligada':'Música desligada';}
function tone(note,at,duration,gain,type='sine'){
 const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.value=440*Math.pow(2,(note-69)/12);
 env.gain.setValueAtTime(0,at);env.gain.linearRampToValueAtTime(gain,at+.018);env.gain.exponentialRampToValueAtTime(.0001,at+duration);
 osc.connect(env);env.connect(master);osc.start(at);osc.stop(at+duration+.02);
}
function schedule(){
 if(!ctx||ctx.state!=='running')return;
 while(next<ctx.currentTime+.16){
  const chords=[[48,52,55],[45,48,52],[53,57,60],[43,47,50]],chord=chords[Math.floor(beat/16)%4];
  const melody=[72,76,79,76,74,72,67,71,72,76,81,79,76,74,72,67];
  if(beat%2===0)tone(melody[Math.floor(beat/2)%16],next,.28,.10,'triangle');
  tone(chord[beat%3]+12,next,.19,.045);
  if(beat%4===0)tone(chord[0],next,.36,.13,'triangle');
  beat++;next+=60/108/2;
 }
}
async function start(){
 if(!enabled||document.hidden)return;
 try{if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctx=new Audio();master=ctx.createGain();master.connect(ctx.destination);}
 await ctx.resume();master.gain.setValueAtTime(volume,ctx.currentTime);next=ctx.currentTime+.04;
 if(!timer)timer=setInterval(schedule,50);schedule();
 }catch(error){console.warn('Áudio indisponível neste navegador.',error);}
}
function pause(){clearInterval(timer);timer=null;if(ctx)ctx.suspend().catch(()=>{});}
button.addEventListener('click',()=>{enabled=!enabled;localStorage.setItem('imuno-music',enabled?'on':'off');paint();enabled?start():pause();});
slider.addEventListener('input',()=>{volume=Number(slider.value);localStorage.setItem('imuno-volume',String(volume));if(master)master.gain.setTargetAtTime(volume,ctx.currentTime,.04);});
document.addEventListener('pointerdown',()=>{if(!timer)start();},{passive:true});
document.addEventListener('keydown',()=>{if(!timer)start();});
document.addEventListener('visibilitychange',()=>document.hidden?pause():start());
paint();
})();
