import type { EnemyDefinition, EnemyKind, TowerDefinition, TowerKind, Wave } from '../core/types';
export const level = (damage:number,range:number,cooldown:number,cost:number) => ({damage,range,cooldown,speed:360,splash:0,slow:0,duration:90,cost});
export const towers:Record<TowerKind,TowerDefinition> = {
 pea:{name:'Pea Popper',role:'Quick • single target',cost:60,visual:'pea',levels:[level(9,140,39,0)]},
 berry:{name:'Boom Berry',role:'Heavy • splash damage',cost:100,visual:'berry',levels:[{...level(22,125,108,0),splash:48}]},
 frost:{name:'Frosty Cone',role:'Chill • slows enemies',cost:80,visual:'frost',levels:[{...level(5,120,66,0),slow:0.3}]}
};
export const enemies:Record<EnemyKind,EnemyDefinition> = {
 wobbler:{health:30,speed:50,bounty:6,leak:1,visual:'wobbler'}, dasher:{health:22,speed:85,bounty:7,leak:1,visual:'dasher'}, chunky:{health:140,speed:34,bounty:16,leak:2,visual:'chunky'}, captain:{health:1400,speed:28,bounty:120,leak:5,visual:'captain'}
};
export const waves:Wave[] = [1,2,3].map(n=>({name:`Wobbler welcome ${n}`,bonus:30,groups:[{kind:'wobbler',count:4+n*2,spacing:75,delay:0}]}));
