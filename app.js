import {Sound} from './sound.js';
const sound=new Sound();
import {ART} from './art.js';
import {Game,MOODS,THRESHOLDS,CATS} from './engine.js';
const $=id=>document.getElementById(id),game=new Game();
let gesture=null,paused=false,pausedAt=0,lastTarget=0,feedbackUntil=0,action='start';
const scene=$('scene'),cat=$('cat');
// Atlas order: neutral, happy, closed, relaxed, purring, grooming, angry, hiss, scratch, sleep, leave, wake.
const moodFrames=[10,8,7,6,0,1,2,3,4,5,9];
let wakingUntil=0;
function showPose(index){const art=ART[game.cat.id];const box=art.frames?.[index]||[(index%3)*art.cell,Math.floor(index/3)*art.cell,art.cell,art.cell];$('cinco-art').setAttribute('href',art.src);$('cinco-art').setAttribute('width',art.width);$('cinco-art').setAttribute('height',art.height);$('sprite-frame').setAttribute('viewBox',box.join(' '));['x','y','width','height'].forEach((key,i)=>$('sprite-crop').setAttribute(key,box[i]));}


function card(kicker,title,text,button,next,note='Best played in portrait · swipe, don’t tap'){$('card-kicker').textContent=kicker;$('card-title').textContent=title;$('card-text').textContent=text;$('action').innerHTML=button+' <span>↗</span>';$('card-note').textContent=note;$('overlay').hidden=false;action=next;}
function render(){
 cat.setAttribute('class',`mood-${game.mood}`);
 showPose(['bonus','catComplete','complete'].includes(game.phase)?4:moodFrames[game.mood]);
 $('overlay').classList.toggle('result',['sleeping','catComplete','complete'].includes(game.phase));
 $('app').dataset.phase=game.phase;
 const bonus=game.phase==='bonus';
 $('bonus-hud').hidden=!bonus;
 $('bonus-target').setAttribute('visibility',bonus?'visible':'hidden');
 $('bonus-target').setAttribute('transform',`translate(${game.bonusSpot.x} ${game.bonusSpot.y})`);
 $('bonus-label').textContent=game.bonusSpot.label;
 $('cat-progress').innerHTML=[0,1,2].map(i=>`<span><i style="width:${100*(i<game.loop?1:i===game.loop?game.loopProgress:0)}%"></i></span>`).join('');
 $('cat-progress').setAttribute('aria-valuenow',Math.round(100*(game.loop+game.loopProgress)/3));
 $('cat-progress').setAttribute('aria-label',`${game.cat.name} · loop ${game.loop+1} of 3`);
 $('app').dataset.mood=game.mood;
 $('app').dataset.cat=game.cat.id;
 $('cat-name').textContent=game.cat.name+(game.cat.penalty===2?' · FINAL BOSS':'');
 $('edition').textContent=`CAT ${game.catIndex+1} / 3`;
 $('journey').innerHTML=CATS.map((c,i)=>`<span class="${i<game.catIndex?'done':i===game.catIndex?'active':''}">${i<game.catIndex?'✓ ':''}${c.name}</span>`).join('<b>›</b>');
 cat.setAttribute('aria-label',`${game.cat.name}: ${MOODS[game.mood]}`);
 $('mood').textContent=game.phase==='bonus'?'Bonus pets!':MOODS[game.mood];
 if(bonus){$('bonus-clock').textContent=(Math.max(0,game.bonusDeadline-performance.now())/1000).toFixed(1)+'s';$('bonus-count').textContent=game.bonusCount+' pets';$('bonus-meter').value=game.bonusCount;$('hint').textContent='Tap or rub the heart · no miss penalties';}
 $('loops').innerHTML=[0,1,2].map(i=>`<i class="${i<game.loop?'done':i===game.loop?'current':''}"></i>`).join('');
 $('loops').setAttribute('aria-label',`Loop ${game.loop+1} of 3`);
 $('progress').innerHTML=Array.from({length:THRESHOLDS[game.mood]},(_,i)=>`<i class="${i<game.progress?'filled':''}"></i>`).join('');
 $('progress').setAttribute('aria-label',`${game.progress} of ${THRESHOLDS[game.mood]} pets to next mood`);
 $('pause').hidden=!['playing','bonus'].includes(game.phase);$('edition').hidden=game.phase==='playing';
 if(game.phase==='bonusReady')card('THREE LOOPS COMPLETE',game.bonusSpot.label,`${game.cat.name} is won over! Tap or rub the glowing spot as fast as you can for three seconds. No misses, just bonus pets.`,'Start bonus','bonus','The timer starts when you press Start bonus');
 if(game.phase==='sleeping')card(`LOOP ${game.loop+1} COMPLETE`,'One happy catnap.',`${game.cat.name} is sleeping. Wake ${game.cat.pronoun} for loop ${game.loop+2} — the next loop is quicker.`,`Wake ${game.cat.name}`,'wake');
 if(game.phase==='catComplete'){const next=CATS[game.catIndex+1];card(`${game.cat.name.toUpperCase()} COMPLETE`,`You won ${game.cat.name} over!`,`${game.bonusCount} bonus pets! Next: ${next.name}. ${next.description} ${next.penalty===2?'A miss drops two moods.':'A miss drops one mood.'}`,`Meet ${next.name}`,'next','Three loops each · one good swipe per mood');}
 if(game.phase==='complete')card('MOONA · BLAZE · CINCO','All Cats Complete!',`Even Cinco approves. You finished all nine loops with ${game.hits} good pets and ${game.misses} misses, plus ${game.bonusScores.reduce((a,b)=>a+b,0)} bonus pets!`,'Play again','start','Three personalities. One purr-fect adventure.');
 if(game.phase==='failed')card(`${game.cat.name.toUpperCase()} NEEDS SOME SPACE`,`${game.cat.name} needs a break.`,`A miss costs ${game.cat.penalty===2?'two moods':'one mood'}. One good swipe moves one mood back up. Try ${game.cat.name} again; completed cats stay complete.`,`Retry ${game.cat.name}`,'retry',`Restart ${game.cat.name} at loop 1 · Neutral`);

}
function respond(event,now){if(!event)return;if(event.type==='hit')sound.cue(game.mood===10?'sleep':game.mood===8?'purr':'pet',game.catIndex);if(event.type==='miss')sound.cue('miss',game.catIndex);if(event.type==='bonusComplete')sound.cue('win',game.catIndex);if(event.type==='bonusComplete'){gesture=null;render();$('feedback').textContent='Over the top! ♥';feedbackUntil=now+1800;cat.classList.add('celebrate');return;}if(event.type==='target'){drawTarget();return;}gesture=null;lastTarget=0;$('target').setAttribute('visibility','hidden');$('feedback').textContent=event.type==='hit'?(game.streak%5===0?'Purr-fect!':'Lovely ♥'):event.reason;$('feedback').className=event.type==='miss'?'bad':'';feedbackUntil=now+850;render();cat.classList.remove('hit','miss');void cat.getBoundingClientRect();cat.classList.add(event.type);}
function drawTarget(){const t=game.target;if(!t)return;const z=game.zones[t.zone],r=game.settings.radius;$('target').setAttribute('transform',`translate(${z.x} ${z.y})`);$('target').setAttribute('visibility','visible');$('target-fill').setAttribute('r',r);$('timer-ring').setAttribute('r',r-5);$('arrow').setAttribute('transform',`rotate(${t.angle})`);$('hint').textContent=`${z.name} · follow the arrow`;lastTarget=t.id;}
function point(e){const p=cat.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(cat.getScreenCTM().inverse());}
scene.addEventListener('pointerdown',e=>{if(paused||gesture||!e.isPrimary)return;
 if(game.phase==='bonus'){e.preventDefault();scene.setPointerCapture(e.pointerId);const p=point(e);gesture={id:e.pointerId,bonus:true,last:p};bonusPet(p);return;}
 if(!game.target)return;e.preventDefault();const now=performance.now();if(now>=game.target.deadline){respond(game.tick(now),now);return;}scene.setPointerCapture(e.pointerId);const p=point(e);gesture={id:e.pointerId,target:game.target.id,start:p,path:[p]};});
scene.addEventListener('pointermove',e=>{if(gesture?.id!==e.pointerId)return;e.preventDefault();const p=point(e);if(gesture.bonus){if(Math.hypot(p.x-gesture.last.x,p.y-gesture.last.y)>=24){bonusPet(p);gesture.last=p;}return;}gesture.path.push(p);});
scene.addEventListener('pointerup',e=>{if(gesture?.id!==e.pointerId)return;e.preventDefault();const g=gesture;gesture=null;if(g.bonus)return;const now=performance.now();respond(game.swipe(g.target,g.start,point(e),g.path,now),now);});
scene.addEventListener('pointercancel',()=>{gesture=null;});
// A cancelled OS gesture is allowed to time out once; never apply a second penalty.
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
function pause(){if(paused||!['playing','bonus'].includes(game.phase))return;sound.quiet(true);paused=true;pausedAt=performance.now();gesture=null;card('TAKE A BREATHER',`${game.cat.name} can wait.`,'Your loop and mood are saved. Resume when you’re ready to pet again.','Resume','resume','The target timer is paused');}
function resume(){sound.quiet(false);sound.unlock();const now=performance.now(),elapsed=now-pausedAt;if(game.phase==='bonus')game.bonusDeadline+=elapsed;else if(game.target)game.target.deadline+=elapsed;else game.nextAt+=elapsed;paused=false;$('overlay').hidden=true;if(game.phase==='bonus')$('bonus-clock').textContent=(Math.max(0,game.bonusDeadline-now)/1000).toFixed(1)+'s';}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',pause);window.addEventListener('resize',()=>{if(gesture)pause();});$('pause').addEventListener('click',pause);
document.addEventListener('keydown',e=>{if(e.key==='Escape')paused?resume():pause();});
function activate(){sound.quiet(false);sound.unlock();sound.cue('wake',game.catIndex);const now=performance.now();$('overlay').hidden=true;if(action==='resume'){resume();return;}paused=false;gesture=null;wakingUntil=0;lastTarget=0;$('target').setAttribute('visibility','hidden');
 if(action==='bonus'){game.startBonus(now);$('feedback').textContent='Go! Tap or rub the heart!';feedbackUntil=now+900;}
 else if(action==='wake'){game.wake(now);$('feedback').textContent=`Rise and shine, ${game.cat.name}`;feedbackUntil=now+900;}
 else if(action==='next'){game.nextCat(now);$('feedback').textContent=game.cat.penalty===2?'The boss is judging. Make it count.':`Hello, ${game.cat.name}!`;feedbackUntil=now+1100;}
 else if(action==='retry'){game.retryCat(now);$('feedback').textContent='A fresh start. You’ve got this.';feedbackUntil=now+1100;}
 else{game.restart();game.start(now+700);$('feedback').textContent='Find the glow. Follow the arrow.';feedbackUntil=now+1200;}
 render();$('feedback').className='';if(action==='wake'){cat.classList.add('waking');showPose(11);wakingUntil=now+650;}
}

$('action').addEventListener('click',activate);
function bonusPet(p){if(game.petBonus(p,performance.now())){sound.cue('bonus',game.catIndex);$('bonus-count').textContent=`${game.bonusCount} pets`;$('bonus-meter').value=game.bonusCount;cat.classList.remove('bonus-pop');void cat.getBoundingClientRect();cat.classList.add('bonus-pop');}}
function frame(now){if(!paused){if(wakingUntil&&now>=wakingUntil){wakingUntil=0;showPose(moodFrames[game.mood]);}respond(game.tick(now),now);if(game.phase==='bonus'){$('bonus-clock').textContent=(Math.max(0,game.bonusDeadline-now)/1000).toFixed(1)+'s';$('bonus-count').textContent=game.bonusCount+' pets';$('bonus-meter').value=game.bonusCount;$('hint').textContent='Tap or rub the heart · no miss penalties';}if(game.target){if(lastTarget!==game.target.id)drawTarget();const ring=$('timer-ring'),length=2*Math.PI*(game.settings.radius-5);ring.style.strokeDasharray=length;ring.style.strokeDashoffset=length*(1-Math.max(0,(game.target.deadline-now)/game.settings.time));}if(now>feedbackUntil)$('feedback').textContent='';}requestAnimationFrame(frame);}requestAnimationFrame(frame);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

render();
// Decode all cats before starting so a slow connection cannot consume a target timer.
$('action').disabled=true;
Promise.all(Object.values(ART).map(a=>{const image=new Image();image.src=a.src;return image.decode();})).then(()=>{$('action').disabled=false;}).catch(()=>{$('card-text').textContent='The cat artwork did not finish loading. Reopen the game when connected to try again.';});

function soundLabel(){$('sound').textContent=sound.enabled?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound.enabled));}soundLabel();$('sound').addEventListener('click',()=>{sound.toggle();soundLabel();if(sound.enabled)sound.cue('pet',game.catIndex);});document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.quiet(true);});
