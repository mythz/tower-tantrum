import {it,expect} from 'vitest';
import {levels} from '../../src/game/data/levels';
import {enemies,towers,validateDefinitions} from '../../src/game/data/definitions';
import {buildable,center,distance,lengthOf,position} from '../../src/game/data/map';
import {applyCommand,createGame,enemyHealth,stars,stepGame} from '../../src/game/core/simulation';
import type {EnemyKind,TowerKind} from '../../src/game/core/types';
const cells=Array.from({length:240},(_,i)=>({x:i%20,y:Math.floor(i/20)}));
it('provides six themed maps with valid lanes, reserved scenery and boss finales',()=>{
 expect(levels).toHaveLength(6);expect(new Set(levels.map(l=>l.map.visual)).size).toBe(6);
 console.log('BUILD SPACE',levels.map(l=>cells.filter(c=>buildable(c,l.map)).length));
 for(const l of levels){validateDefinitions(l.waves);for(const [i,path] of l.map.paths.entries()){expect(path[0].x).toBeLessThan(0);expect(path.at(-1)!.x).toBeGreaterThan(960);expect(position(lengthOf(l.map,i),l.map,i)).toEqual(path.at(-1));}
  for(const key of l.map.reserved){const [x,y]=key.split(',').map(Number);expect(buildable({x,y},l.map)).toBe(false);}
  expect(l.waves.at(-1)!.groups.some(g=>enemies[g.kind].boss)).toBe(true);}
 expect(levels.some(l=>l.map.paths.length>1)).toBe(true);
});
it.each(['baron','duchess','king'] as EnemyKind[])('boss %s applies its defensive traits and special ability',kind=>{
 const s=createGame({level:5});applyCommand(s,{type:'StartWave'});s.queue=[{kind:'wobbler',at:100000}];const def=enemies[kind];const e={id:100,kind,health:enemyHealth(s,kind)*.4,progress:100,slows:[{amount:.5,until:10000}]};s.enemies=[e];const p=position(100,s.config.map);s.projectiles=[{id:200,owner:0,kind:'pea',target:100,...p,destination:p,stats:{...towers.pea.levels[0],speed:10000},life:300}];const health=e.health;stepGame(s);expect(e.health).toBe(health-Math.max(1,9-(def.armor??0)));expect(e.progress-100).toBeCloseTo(def.speed*s.config.speedScale*(1-.5*(1-(def.slowResistance??0)))*(def.rage??1)/60);
 if(def.summon){s.waveTick=def.summon-1;stepGame(s);expect(s.enemies.some(v=>v.kind==='dasher')).toBe(true);}
});
/** A greedy bot without abilities: builds on the cells covering the most route, mixes every tower and upgrades. */
export function autoplay(level:number,mix:TowerKind[]=['pea','berry','frost','zap','sun']){
 const s=createGame({level});const route=s.config.map;const samples=route.paths.flatMap((_,lane)=>Array.from({length:Math.ceil(lengthOf(route,lane)/24)},(_,i)=>position(i*24,route,lane)));
 const ranked=cells.filter(c=>buildable(c,route)).map(cell=>({cell,score:samples.filter(p=>distance(center(cell),p)<=150).length})).sort((a,b)=>b.score-a.score);
 for(let wave=0;wave<s.config.waves.length;wave++){
  for(const t of s.towers)while(t.level<2&&applyCommand(s,{type:'UpgradeTower',id:t.id}).ok){}
  for(const {cell} of ranked)applyCommand(s,{type:'PlaceTower',kind:mix[s.towers.length%mix.length],cell});
  applyCommand(s,{type:'StartWave'});stepGame(s,40000);if(s.phase==='lost')break;
 }
 return s;
}
it.each([0,1,2,3,4,5])('level %s can be defended with upgrades and a mixed army',level=>{
 const s=autoplay(level);console.log('BALANCE',level,levels[level].name,s.phase,`${s.lives}/${s.config.lives}`,`wave ${s.wave}/${s.config.waves.length}`,`towers ${s.towers.length}`,`stars ${stars(s)}`);expect(s.phase).toBe('won');
});
