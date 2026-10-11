import type { EnemyDefinition, EnemyKind, Group, Stats, TowerDefinition, TowerKind, Wave } from '../core/types';
export const level = (damage:number,range:number,cooldown:number,cost:number,extra:Partial<Stats>={}):Stats => ({damage,range,cooldown,speed:360,splash:0,slow:0,duration:90,cost,chain:0,pierce:0,...extra});
export const towers:Record<TowerKind,TowerDefinition> = {
 pea:{name:'Pea Popper',role:'Quick • single target',cost:60,visual:'pea',color:0x9dda6b,targeting:'first',levels:[level(9,140,39,0),level(16,160,33,70),level(26,180,27,110)]},
 berry:{name:'Boom Berry',role:'Heavy • splash damage',cost:100,visual:'berry',color:0xef8ca3,targeting:'first',levels:[level(22,125,108,0,{splash:48,speed:300}),level(38,145,96,110,{splash:60,speed:300}),level(62,165,84,160,{splash:72,speed:300})]},
 frost:{name:'Frosty Cone',role:'Chill • slows enemies',cost:80,visual:'frost',color:0x97e2ec,targeting:'first',levels:[level(5,120,66,0,{slow:.3}),level(9,145,60,90,{slow:.4,duration:120}),level(14,165,51,140,{slow:.5,duration:150})]},
 zap:{name:'Zappy Zinnia',role:'Shock • chains between foes',cost:120,visual:'zap',color:0xc9a6ff,targeting:'first',levels:[level(13,130,60,0,{chain:3,splash:85}),level(21,145,54,130,{chain:4,splash:95}),level(32,160,46,190,{chain:6,splash:110})]},
 sun:{name:'Sunbeam Sniper',role:'Focus • long range, pierces armor',cost:140,visual:'sun',color:0xffd25e,targeting:'strong',levels:[level(70,230,120,0,{pierce:4,speed:1400}),level(120,260,108,150,{pierce:6,speed:1500}),level(200,300,96,220,{pierce:10,speed:1600})]}
};
export const enemies:Record<EnemyKind,EnemyDefinition> = {
 wobbler:{name:'Wobbler',health:30,speed:50,bounty:6,leak:1,visual:'wobbler',size:42},
 dasher:{name:'Dasher',health:22,speed:85,bounty:7,leak:1,visual:'dasher',size:40},
 chunky:{name:'Chunky',health:140,speed:34,bounty:16,leak:2,visual:'chunky',size:54},
 bubble:{name:'Bubble Bop',health:40,speed:46,bounty:10,leak:1,visual:'bubble',size:46,shield:60},
 mender:{name:'Mendy Muffin',health:80,speed:40,bounty:14,leak:1,visual:'mender',size:46,heal:{amount:18,radius:80,interval:120}},
 splitter:{name:'Jelly Splitter',health:110,speed:38,bounty:10,leak:2,visual:'splitter',size:52,split:{kind:'jellet',count:3}},
 jellet:{name:'Jellet',health:20,speed:72,bounty:2,leak:1,visual:'jellet',size:28},
 captain:{name:'Captain Crumble',health:1400,speed:28,bounty:120,leak:5,visual:'captain',size:72,boss:true},
 baron:{name:'Iron Baron',health:2200,speed:30,bounty:180,leak:6,visual:'baron',size:74,boss:true,armor:5,slowResistance:.25},
 duchess:{name:'Swarm Duchess',health:2900,speed:33,bounty:220,leak:7,visual:'duchess',size:74,boss:true,summon:300,slowResistance:.35},
 king:{name:'King Cataclysm',health:4200,speed:32,bounty:300,leak:10,visual:'king',size:88,boss:true,armor:7,slowResistance:.5,rage:1.65,summon:240}
};
export const group = (kind:EnemyKind,count:number,spacing=65,delay=0):Group => ({kind,count,spacing,delay});
export const waves:Wave[] = [
 {name:'A little wobble',bonus:30,groups:[group('wobbler',8,100)]},
 {name:'The garden party',bonus:35,groups:[group('wobbler',14,85)]},
 {name:'Fast food',bonus:40,groups:[group('dasher',12,75)]},
 {name:'Double trouble',bonus:45,groups:[group('wobbler',18,65),group('dasher',10,80,600)]},
 {name:'Bubble bath',bonus:50,groups:[group('chunky',6,145),group('bubble',6,90,300),group('wobbler',10,65,500)]},
 {name:'Heavy traffic',bonus:55,groups:[group('chunky',10,120),group('mender',3,200,300),group('wobbler',22,55,200)]},
 {name:'Sugar rush',bonus:60,groups:[group('dasher',36,40),group('bubble',8,90,500),group('chunky',6,140,700)]},
 {name:'All sorts',bonus:65,groups:[group('wobbler',22,48),group('splitter',5,160,300),group('dasher',20,48,400),group('chunky',12,100,200)]},
 {name:'The long lunch',bonus:70,groups:[group('chunky',20,100),group('mender',5,180,200),group('splitter',8,120,500),group('dasher',28,50,700)]},
 {name:'Captain Crumble',bonus:100,groups:[group('captain',1,1,900),group('chunky',22,95),group('bubble',12,80,300),group('dasher',36,48,400),group('wobbler',30,55)]}
];
export function validateDefinitions(list:Wave[]=waves):void {
 for(const [id,t] of Object.entries(towers)){if(t.cost<0||t.levels.length!==3||t.levels.some(l=>l.damage<0||l.range<=0||l.cooldown<=0||l.cost<0))throw new Error(`Invalid tower ${id}`);}
 for(const w of list){if(w.bonus<0||w.groups.some(g=>!enemies[g.kind]||!Number.isInteger(g.count)||g.count<0||g.spacing<0||g.delay<0))throw new Error(`Invalid wave ${w.name}`);}
}
