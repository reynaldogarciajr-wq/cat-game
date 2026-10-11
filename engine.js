export const MOODS = ['Leaves','Scratch','Hiss','Angry','Neutral','Happy','Eyes Closed','Head Down','Purring','Licking Paw','Sleeping'];
export const THRESHOLDS = [0,1,1,1,1,1,1,1,1,1,0];
export const LOOPS = [{time:1500,delay:450,tolerance:45,radius:57},{time:1200,delay:350,tolerance:35,radius:49},{time:900,delay:250,tolerance:30,radius:43}];
export const CATS = [
 {id:'moona',name:'Moona',pronoun:'her',description:'Curious kitten. Quick paws, big adventures.',penalty:1,loops:[{time:1800,delay:450,tolerance:55,radius:62},{time:1500,delay:350,tolerance:45,radius:56},{time:1200,delay:250,tolerance:40,radius:50}]},
 {id:'blaze',name:'Blaze',pronoun:'him',description:'Calm and social. A gentle touch goes a long way.',penalty:1,loops:[{time:1700,delay:450,tolerance:35,radius:57},{time:1400,delay:350,tolerance:30,radius:51},{time:1100,delay:250,tolerance:25,radius:45}]},
 {id:'cinco',name:'Cinco',pronoun:'him',description:'The grumpy old boss. Every miss costs two moods.',penalty:2,loops:LOOPS}
];
// Coordinates share the illustration's 400 x 560 viewBox. Angles use screen axes.
export const ZONES = [
 {name:'Head',x:145,y:169,directions:[0,180]},
 {name:'Left cheek',x:88,y:220,directions:[45]},
 {name:'Right cheek',x:198,y:220,directions:[135]},
 {name:'Upper back',x:235,y:288,directions:[70]},
 {name:'Mid back',x:270,y:346,directions:[70]},
 {name:'Side / flank',x:280,y:406,directions:[45]}
];
export const BONUS_SPOTS=[{x:195,y:270,label:'Neck pets!'},{x:180,y:355,label:'Tickle bellies!'},{x:275,y:365,label:'Scratch that sweet spot!'}];
export class Game {
 constructor(random=Math.random){this.random=random;this.restart();}
 restart(){this.bonusScores=[0,0,0];this.bonusCount=0;this.catIndex=0;this.mood=4;this.progress=0;this.loop=0;this.phase='ready';this.target=null;this.streak=0;this.hits=0;this.misses=0;this.bag=[];this.previous=-1;this.recent=[];this.sequence=0;}
 start(now){this.phase='playing';this.nextAt=now;}
 get cat(){return CATS[this.catIndex];}
 get settings(){return this.cat.loops[this.loop];}
 get zones(){return ZONES;}
 get loopProgress(){return Math.max(0,Math.min(1,(this.mood-4)/6));}
 get bonusSpot(){return BONUS_SPOTS[this.catIndex];}
 startBonus(now){if(this.phase!=='bonusReady')return false;this.phase='bonus';this.bonusCount=0;this.bonusDeadline=now+3000;return true;}
 petBonus(p,now){if(this.phase!=='bonus'||now>=this.bonusDeadline||Math.hypot(p.x-this.bonusSpot.x,p.y-this.bonusSpot.y)>65)return false;this.bonusCount++;return true;}
 resetCat(now){this.mood=4;this.progress=0;this.loop=0;this.streak=0;this.target=null;this.bag=[];this.recent=[];this.previous=-1;this.phase='playing';this.nextAt=now+700;}
 nextCat(now){if(this.phase!=='catComplete')return false;this.catIndex++;this.resetCat(now);return true;}
 retryCat(now){if(this.phase!=='failed')return false;this.resetCat(now);return true;}
 tick(now){
  if(this.phase==='bonus'&&now>=this.bonusDeadline){this.bonusScores[this.catIndex]=this.bonusCount;this.phase=this.catIndex===CATS.length-1?'complete':'catComplete';return {type:'bonusComplete'};}
  if(this.phase!=='playing')return null;
  if(this.target && now>=this.target.deadline)return this.settle(false,'Too slow',now);
  if(!this.target && now>=this.nextAt){
   if(!this.bag.length){this.bag=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag[0]===this.previous)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];}
   const allowed=this.bag.findIndex(zone=>!this.recent.includes(zone));
   [this.bag[0],this.bag[allowed]]=[this.bag[allowed],this.bag[0]];
   const zone=this.bag.shift();this.previous=zone;this.recent.push(zone);this.recent=this.recent.slice(-2);const z=this.zones[zone];
   this.target={id:++this.sequence,zone,angle:z.directions[Math.floor(this.random()*z.directions.length)],deadline:now+this.settings.time};
   return {type:'target'};
  }return null;
 }
 settle(success,reason,now){
  if(this.phase!=='playing'||!this.target)return null;
  this.target=null;this.nextAt=now+this.settings.delay;
  if(success){this.hits++;this.streak++;if(++this.progress>=THRESHOLDS[this.mood]){this.mood++;this.progress=0;}}
  else {this.misses++;this.streak=0;this.mood=Math.max(0,this.mood-this.cat.penalty);this.progress=0;}
  if(this.mood===0)this.phase='failed';
  if(this.mood===10)this.phase=this.loop===2?'bonusReady':'sleeping';
  return {type:success?'hit':'miss',reason};
 }
 swipe(id,start,end,path,now){
  if(!this.target||id!==this.target.id||this.phase!=='playing')return null;
  if(now>=this.target.deadline)return this.settle(false,'Too slow',now);
  const z=this.zones[this.target.zone],dx=end.x-start.x,dy=end.y-start.y;
  let reason='';
  if(Math.hypot(start.x-z.x,start.y-z.y)>this.settings.radius+15)reason='Wrong zone';
  else if(Math.hypot(dx,dy)<60)reason='Swipe, don’t tap';
  else {
   const angle=Math.atan2(dy,dx)*180/Math.PI;
   const delta=Math.abs(((angle-this.target.angle+540)%360)-180);
   if(delta>this.settings.tolerance+1e-8)reason='Follow the arrow';
   else if(path.some(p=>Math.abs((p.x-start.x)*dy-(p.y-start.y)*dx)/Math.hypot(dx,dy)>this.settings.radius+15)||Math.hypot(dx,dy)>210)reason='Keep your swipe close';
  }
  return this.settle(!reason,reason,now);
 }
 wake(now){if(this.phase!=='sleeping')return;this.loop++;this.mood=4;this.progress=0;this.streak=0;this.phase='playing';this.target=null;this.nextAt=now+700;}
}
