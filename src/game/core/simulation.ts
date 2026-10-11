import type { Ability, Command, CommandResult, Config, DomainEvent, Enemy, EnemyKind, GameState, Point, Targeting, Tower, TowerKind } from './types';
import { enemies, towers } from '../data/definitions';
import { buildable, center, distance, position as routePosition, lengthOf } from '../data/map';
import { levels } from '../data/levels';
export const enemyHealth = (s:GameState,kind:EnemyKind) => enemies[kind].health*s.config.healthScale;
export const enemyShield = (s:GameState,kind:EnemyKind) => (enemies[kind].shield??0)*s.config.healthScale;
export const abilities:Record<Ability,{name:string;cooldown:number;radius:number}> = {bomb:{name:'Sugar Bomb',cooldown:1800,radius:85},chill:{name:'Big Chill',cooldown:2700,radius:0}};
export const bombDamage = (s:GameState) => 90+18*s.wave;
export const sellValue = (t:Tower) => Math.floor((t.spent??towers[t.kind].cost)*.7);
export const earlyBonus = (s:GameState) => 10+2*s.wave;
export function createGame(config:Partial<Config>={}):GameState {const index=Math.max(0,Math.min(levels.length-1,Math.floor(config.level??0)));const level=levels[index];const settings={...level,...config,level:index};return {config:settings,tick:0,waveTick:0,phase:'build',previous:'build',coins:settings.coins,lives:settings.lives,wave:0,nextId:1,enemies:[],towers:[],projectiles:[],queue:[],bonus:0,spawned:0,abilities:{bomb:0,chill:0},kills:0};}
export const enemyPosition = (s:GameState,e:Enemy) => routePosition(e.progress,s.config.map,e.lane??0);
export const remaining = (s:GameState,e:Enemy) => lengthOf(s.config.map,e.lane??0)-e.progress;
export function getPlacementPreview(s:GameState,kind:TowerKind,cell:Point):CommandResult {
 if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};
 if(!Number.isInteger(cell.x)||!Number.isInteger(cell.y)||cell.x<0||cell.y<0||cell.x>=20||cell.y>=12)return {ok:false,reason:'OUT_OF_BOUNDS'};
 if(!buildable(cell,s.config.map))return {ok:false,reason:'NOT_BUILDABLE'};
 if(s.towers.some(t=>t.cell.x===cell.x&&t.cell.y===cell.y))return {ok:false,reason:'OCCUPIED'};
 if(s.coins<towers[kind].cost)return {ok:false,reason:'INSUFFICIENT_COINS'};
 return {ok:true,events:[]};
}
function schedule(s:GameState,offset:number){s.queue.push(...s.config.waves[s.wave].groups.flatMap(g=>Array.from({length:g.count},(_,i)=>({at:offset+g.delay+i*g.spacing,kind:g.kind}))));s.queue.sort((a,b)=>a.at-b.at);s.bonus+=s.config.waves[s.wave].bonus;s.wave++;}
export function applyCommand(s:GameState,c:Command):CommandResult {
 const events:DomainEvent[]=[];
 if(c.type==='Pause'){if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};s.previous=s.phase;s.phase='paused';return {ok:true,events};}
 if(c.type==='Resume'){if(s.phase!=='paused')return {ok:false,reason:'INVALID_PHASE'};s.phase=s.previous;return {ok:true,events};}
 if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};
 if(c.type==='PlaceTower'){const r=getPlacementPreview(s,c.kind,c.cell);if(!r.ok)return r;const cost=towers[c.kind].cost;s.coins-=cost;const id=s.nextId++;s.towers.push({id,kind:c.kind,cell:{...c.cell},level:0,cooldown:0,targeting:towers[c.kind].targeting,spent:cost,kills:0});events.push({type:'placed',id,kind:c.kind,...center(c.cell)});}
 if(c.type==='UpgradeTower'){const t=s.towers.find(t=>t.id===c.id);if(!t)return {ok:false,reason:'NOT_FOUND'};const next=towers[t.kind].levels[t.level+1];if(!next)return {ok:false,reason:'MAX_LEVEL'};if(s.coins<next.cost)return {ok:false,reason:'INSUFFICIENT_COINS'};s.coins-=next.cost;t.spent=(t.spent??towers[t.kind].cost)+next.cost;t.level++;events.push({type:'upgrade',id:t.id,kind:t.kind,level:t.level,...center(t.cell)});}
 if(c.type==='SellTower'){const t=s.towers.find(t=>t.id===c.id);if(!t)return {ok:false,reason:'NOT_FOUND'};const value=sellValue(t);s.coins+=value;s.towers=s.towers.filter(v=>v!==t);events.push({type:'sold',id:t.id,kind:t.kind,amount:value,...center(t.cell)});}
 if(c.type==='SetTargeting'){const t=s.towers.find(t=>t.id===c.id);if(!t)return {ok:false,reason:'NOT_FOUND'};t.targeting=c.targeting;}
 if(c.type==='UseAbility'){if(s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};if(s.abilities[c.ability]>0)return {ok:false,reason:'COOLDOWN'};s.abilities[c.ability]=abilities[c.ability].cooldown;events.push({type:'ability',ability:c.ability,...c.at});
  if(c.ability==='bomb')for(const e of s.enemies.filter(e=>distance(enemyPosition(s,e),c.at)<=abilities.bomb.radius))damage(s,e,bombDamage(s),99,events,0);
  else for(const e of s.enemies)e.slows.push({amount:.6,until:s.tick+240});}
 if(c.type==='StartWave'){if(s.wave>=s.config.waves.length)return {ok:false,reason:'INVALID_PHASE'};
  if(s.phase==='wave'){const bonus=earlyBonus(s);s.coins+=bonus;schedule(s,s.waveTick);events.push({type:'early',amount:bonus,x:480,y:200});}
  else {s.queue=[];schedule(s,0);s.waveTick=0;s.phase='wave';}
  events.push({type:'wave',amount:s.wave,...routePosition(0,s.config.map)});}
 return {ok:true,events};
}
/** Applies damage through shields and armor; awards the bounty and spawns split children exactly once. */
function damage(s:GameState,e:Enemy,amount:number,pierce:number,out:DomainEvent[],owner:number){
 if(!s.enemies.includes(e))return;const def=enemies[e.kind];const pos=enemyPosition(s,e);
 let hit=Math.max(1,amount-Math.max(0,(def.armor??0)-pierce));
 if(e.shield&&e.shield>0){const absorbed=Math.min(e.shield,hit);e.shield-=absorbed;hit-=absorbed;if(e.shield<=0)out.push({type:'shield',id:e.id,...pos});if(!hit){out.push({type:'damage',id:e.id,...pos});return;}}
 e.health-=hit;out.push({type:'damage',id:e.id,amount:hit,...pos});
 if(e.health>0)return;
 s.enemies=s.enemies.filter(v=>v.id!==e.id);s.coins+=def.bounty;s.kills++;const tower=s.towers.find(t=>t.id===owner);if(tower)tower.kills=(tower.kills??0)+1;
 out.push({type:'death',id:e.id,amount:def.bounty,enemy:e.kind,...pos});
 if(def.split)for(let i=0;i<def.split.count;i++){const id=s.nextId++;s.enemies.push({id,kind:def.split.kind,health:enemyHealth(s,def.split.kind),progress:Math.max(0,e.progress+(i-(def.split.count-1)/2)*14),slows:[],lane:e.lane});out.push({type:'spawn',id,enemy:def.split.kind,...pos});}
}
function pick(s:GameState,p:Point,range:number,mode:Targeting,positions:Map<number,Point>,exclude?:Set<number>):Enemy|undefined {
 let best:Enemy|undefined,score=-Infinity;
 for(const e of s.enemies){if(exclude?.has(e.id))continue;const d=distance(p,positions.get(e.id)??enemyPosition(s,e));if(d>range)continue;const left=remaining(s,e);
  const v=mode==='last'?left:mode==='strong'?e.health+(e.shield??0)-left/1e6:mode==='close'?-d:-left;
  if(v>score||(v===score&&best&&e.id<best.id)){best=e;score=v;}}
 return best;
}
export function stepGame(s:GameState,deltaTicks=1):DomainEvent[] {
 const position=(e:Enemy)=>enemyPosition(s,e);
 const out:DomainEvent[]=[];
 for(let tick=0;tick<deltaTicks;tick++){
 if(s.phase!=='wave')break;s.tick++;s.waveTick++;
 for(const k of Object.keys(s.abilities) as Ability[])s.abilities[k]=Math.max(0,s.abilities[k]-1);
 while(s.queue.length&&s.queue[0].at<=s.waveTick){const spawn=s.queue.shift()!;const id=s.nextId++;const lane=s.spawned++%s.config.map.paths.length;s.enemies.push({id,kind:spawn.kind,health:enemyHealth(s,spawn.kind),progress:0,slows:[],lane,shield:enemyShield(s,spawn.kind)||undefined});const p=routePosition(0,s.config.map,lane);out.push({type:'spawn',id,enemy:spawn.kind,...p});if(enemies[spawn.kind].boss)out.push({type:'boss',id,enemy:spawn.kind,...p});}
 for(const e of [...s.enemies]){e.slows=e.slows.filter(v=>v.until>s.tick);const def=enemies[e.kind];const slow=Math.max(0,...e.slows.map(v=>v.amount))*(1-(def.slowResistance??0));const rage=def.rage&&e.health<enemyHealth(s,e.kind)*.5?def.rage:1;const length=lengthOf(s.config.map,e.lane??0);e.progress=Math.min(length,e.progress+def.speed*s.config.speedScale*rage*(1-slow)/60);if(e.progress>=length){s.lives=Math.max(0,s.lives-def.leak);s.enemies=s.enemies.filter(v=>v.id!==e.id);out.push({type:'leak',id:e.id,amount:def.leak,enemy:e.kind,...position(e)});}}
 if(s.lives<=0){s.phase='lost';s.projectiles=[];out.push({type:'end',x:480,y:288});break;}
 for(const boss of [...s.enemies]){const interval=enemies[boss.kind].summon;if(interval&&s.waveTick%interval===0){const id=s.nextId++;s.enemies.push({id,kind:'dasher',health:enemyHealth(s,'dasher'),progress:boss.progress,slows:[],lane:boss.lane});out.push({type:'spawn',id,enemy:'dasher',...position(boss)});}}
 const positions=new Map(s.enemies.map(e=>[e.id,position(e)]));const at=(e:Enemy)=>positions.get(e.id)??position(e);
 for(const healer of s.enemies){const heal=enemies[healer.kind].heal;if(!heal||(s.waveTick+healer.id)%heal.interval)continue;const origin=at(healer);let healed=0;for(const e of s.enemies){const max=enemyHealth(s,e.kind);if(e.health<max&&distance(origin,at(e))<=heal.radius){e.health=Math.min(max,e.health+heal.amount*s.config.healthScale);healed++;}}out.push({type:'heal',id:healer.id,amount:healed,...origin});}
 for(const t of s.towers){t.cooldown=Math.max(0,t.cooldown-1);if(t.cooldown)continue;const stats=towers[t.kind].levels[t.level];const p=center(t.cell);const target=pick(s,p,stats.range,t.targeting??'first',positions);if(!target)continue;t.cooldown=stats.cooldown;
  if(stats.chain){const chain=[target],hit=new Set([target.id]);while(chain.length<stats.chain){const next=pick(s,at(chain.at(-1)!),stats.splash,'close',positions,hit);if(!next)break;chain.push(next);hit.add(next.id);}out.push({type:'zap',id:t.id,kind:t.kind,points:[{x:p.x,y:p.y-22},...chain.map(e=>(at(e)))],...at(target)});out.push({type:'shot',id:t.id,kind:t.kind,points:[at(target)],...p});chain.forEach((e,i)=>damage(s,e,stats.damage*.85**i,stats.pierce,out,t.id));continue;}
  const id=s.nextId++;s.projectiles.push({id,owner:t.id,kind:t.kind,target:target.id,...p,destination:at(target),stats:{...stats},life:300});out.push({type:'shot',id:t.id,kind:t.kind,points:[at(target)],...p});}
 for(const p of [...s.projectiles]){p.life--;const target=s.enemies.find(e=>e.id===p.target);if((!target&&!p.stats.splash)||p.life<=0){s.projectiles=s.projectiles.filter(v=>v.id!==p.id);continue;}if(target&&!p.stats.splash)p.destination=position(target);const d=distance(p,p.destination),travel=p.stats.speed/60;if(d>travel){p.x+=(p.destination.x-p.x)/d*travel;p.y+=(p.destination.y-p.y)/d*travel;continue;}s.projectiles=s.projectiles.filter(v=>v.id!==p.id);out.push({type:'impact',kind:p.kind,...p.destination});const hit=p.stats.splash?s.enemies.filter(e=>distance(position(e),p.destination)<=p.stats.splash):target?[target]:[];for(const e of hit){if(!s.enemies.includes(e))continue;if(p.stats.slow){const existing=e.slows.find(v=>v.amount===p.stats.slow);if(existing)existing.until=s.tick+p.stats.duration;else e.slows.push({amount:p.stats.slow,until:s.tick+p.stats.duration});}damage(s,e,p.stats.damage,p.stats.pierce,out,p.owner);}}
 if(!s.enemies.length&&!s.queue.length){s.projectiles=[];const bonus=s.bonus;s.coins+=bonus;s.bonus=0;s.phase=s.wave===s.config.waves.length?'won':'build';out.push({type:'complete',amount:bonus,x:480,y:288});if(s.phase==='won')out.push({type:'end',x:480,y:288});}
 }
 return out;
}
/** 3 stars for a near-flawless defense, 2 for keeping at least half the lives, 1 for any victory. */
export const stars = (s:GameState) => s.phase!=='won'?0:s.lives>=s.config.lives*.9?3:s.lives>=s.config.lives*.5?2:1;
