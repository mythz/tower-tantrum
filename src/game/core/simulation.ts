import type { Command, CommandResult, Config, DomainEvent, GameState, Point, TowerKind } from './types';
import { enemies, towers, waves } from '../data/definitions';
import { buildable, center, distance, position, routeLength } from '../data/map';
export function createGame(config:Partial<Config>={}):GameState {return {config:{waves,coins:180,lives:20,...config},tick:0,waveTick:0,phase:'build',previous:'build',coins:config.coins??180,lives:config.lives??20,wave:0,nextId:1,enemies:[],towers:[],projectiles:[],queue:[]};}
export function getPlacementPreview(s:GameState,kind:TowerKind,cell:Point):CommandResult {
 if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};
 if(!Number.isInteger(cell.x)||!Number.isInteger(cell.y)||cell.x<0||cell.y<0||cell.x>=20||cell.y>=12)return {ok:false,reason:'OUT_OF_BOUNDS'};
 if(!buildable(cell))return {ok:false,reason:'NOT_BUILDABLE'};
 if(s.towers.some(t=>t.cell.x===cell.x&&t.cell.y===cell.y))return {ok:false,reason:'OCCUPIED'};
 if(s.coins<towers[kind].cost)return {ok:false,reason:'INSUFFICIENT_COINS'};
 return {ok:true,events:[]};
}
export function applyCommand(s:GameState,c:Command):CommandResult {
 const events:DomainEvent[]=[];
 if(c.type==='Pause'){if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};s.previous=s.phase;s.phase='paused';return {ok:true,events};}
 if(c.type==='Resume'){if(s.phase!=='paused')return {ok:false,reason:'INVALID_PHASE'};s.phase=s.previous;return {ok:true,events};}
 if(s.phase!=='build'&&s.phase!=='wave')return {ok:false,reason:'INVALID_PHASE'};
 if(c.type==='PlaceTower'){const r=getPlacementPreview(s,c.kind,c.cell);if(!r.ok)return r;s.coins-=towers[c.kind].cost;const id=s.nextId++;s.towers.push({id,kind:c.kind,cell:{...c.cell},level:0,cooldown:0});events.push({type:'placed',id,kind:c.kind,...center(c.cell)});}
 if(c.type==='UpgradeTower'){const t=s.towers.find(t=>t.id===c.id);if(!t)return {ok:false,reason:'NOT_FOUND'};const next=towers[t.kind].levels[t.level+1];if(!next)return {ok:false,reason:'MAX_LEVEL'};if(s.coins<next.cost)return {ok:false,reason:'INSUFFICIENT_COINS'};s.coins-=next.cost;t.level++;events.push({type:'upgrade',id:t.id,...center(t.cell)});}
 if(c.type==='StartWave'){if(s.phase!=='build'||s.wave>=s.config.waves.length)return {ok:false,reason:'INVALID_PHASE'};s.queue=s.config.waves[s.wave].groups.flatMap(g=>Array.from({length:g.count},(_,i)=>({at:g.delay+i*g.spacing,kind:g.kind}))).sort((a,b)=>a.at-b.at);s.wave++;s.waveTick=0;s.phase='wave';events.push({type:'wave',x:480,y:200});}
 return {ok:true,events};
}
export function stepGame(s:GameState,deltaTicks=1):DomainEvent[] {
 const out:DomainEvent[]=[];
 for(let tick=0;tick<deltaTicks;tick++){
 if(s.phase!=='wave')break;s.tick++;s.waveTick++;
 while(s.queue.length&&s.queue[0].at<=s.waveTick){const spawn=s.queue.shift()!;const id=s.nextId++;s.enemies.push({id,kind:spawn.kind,health:enemies[spawn.kind].health,progress:0,slows:[]});out.push({type:'spawn',id,...position(0)});}
 for(const e of [...s.enemies]){e.slows=e.slows.filter(v=>v.until>s.tick);const slow=Math.max(0,...e.slows.map(v=>v.amount));e.progress=Math.min(routeLength,e.progress+enemies[e.kind].speed*(1-slow)/60);if(e.progress>=routeLength){s.lives=Math.max(0,s.lives-enemies[e.kind].leak);s.enemies=s.enemies.filter(v=>v.id!==e.id);out.push({type:'leak',id:e.id,...position(e.progress)});}}
 if(s.lives<=0){s.phase='lost';s.projectiles=[];out.push({type:'end',x:480,y:288});break;}
 for(const t of s.towers){t.cooldown=Math.max(0,t.cooldown-1);if(t.cooldown)continue;const stats=towers[t.kind].levels[t.level];const p=center(t.cell);const target=s.enemies.filter(e=>distance(p,position(e.progress))<=stats.range).sort((a,b)=>b.progress-a.progress||a.id-b.id)[0];if(!target)continue;t.cooldown=stats.cooldown;const id=s.nextId++;s.projectiles.push({id,owner:t.id,kind:t.kind,target:target.id,...p,destination:position(target.progress),stats:{...stats},life:300});out.push({type:'shot',id:t.id,kind:t.kind,...p});}
 for(const p of [...s.projectiles]){p.life--;const target=s.enemies.find(e=>e.id===p.target);if((!target&&!p.stats.splash)||p.life<=0){s.projectiles=s.projectiles.filter(v=>v.id!==p.id);continue;}if(target&&!p.stats.splash)p.destination=position(target.progress);const d=distance(p,p.destination),travel=p.stats.speed/60;if(d>travel){p.x+=(p.destination.x-p.x)/d*travel;p.y+=(p.destination.y-p.y)/d*travel;continue;}s.projectiles=s.projectiles.filter(v=>v.id!==p.id);out.push({type:'impact',kind:p.kind,...p.destination});const hit=p.stats.splash?s.enemies.filter(e=>distance(position(e.progress),p.destination)<=p.stats.splash):target?[target]:[];for(const e of hit){if(!s.enemies.includes(e))continue;e.health-=p.stats.damage;const pos=position(e.progress);out.push({type:'damage',id:e.id,...pos});if(p.stats.slow)e.slows.push({amount:p.stats.slow,until:s.tick+p.stats.duration});if(e.health<=0){s.enemies=s.enemies.filter(v=>v.id!==e.id);s.coins+=enemies[e.kind].bounty;out.push({type:'death',id:e.id,amount:enemies[e.kind].bounty,...pos});}}}
 if(!s.enemies.length&&!s.queue.length){s.projectiles=[];s.coins+=s.config.waves[s.wave-1].bonus;s.phase=s.wave===s.config.waves.length?'won':'build';out.push({type:'complete',x:480,y:288});if(s.phase==='won')out.push({type:'end',x:480,y:288});}
 }
 return out;
}
