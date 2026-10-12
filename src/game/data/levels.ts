import type { EnemyKind, GameMap, Group, LevelDefinition, Theme, Wave } from '../core/types';
import { group as g, waves } from './definitions';
import { map } from './map';
/** Lanes are authored in grid cells; each point becomes that cell's center. */
const route = (visual:Theme, lanes:number[][][], reserved:string[]):GameMap => ({width:960,height:576,cell:48,visual,paths:lanes.map(points=>points.map(([x,y])=>({x:x*48+24,y:y*48+24}))),reserved});
const block = (x:number,y:number,w:number,h:number) => Array.from({length:w*h},(_,i)=>`${x+i%w},${y+Math.floor(i/w)}`);
const orchard=route('orchard',[[[-1,2],[3,2],[3,9],[7,9],[7,2],[12,2],[12,9],[16,9],[16,5],[20,5]]],[...block(9,5,2,2),...block(0,5,2,1),...block(18,1,2,2),...block(18,9,2,2),'14,5','14,6']);
const canyon=route('canyon',[[[-1,5],[5,5],[5,1],[9,1],[9,10],[14,10],[14,4],[20,4]]],[...block(0,0,3,2),...block(11,1,2,3),...block(0,9,3,3),...block(17,8,3,2),...block(6,7,2,2)]);
const fjord=route('fjord',[[[-1,2],[6,2],[6,5],[12,5],[12,8],[20,8]],[[-1,9],[8,9],[8,5],[12,5],[12,8],[20,8]]],[...block(14,1,4,3),...block(1,5,2,2),...block(9,10,2,2),...block(16,10,3,2)]);
const volcano=route('volcano',[[[-1,1],[7,1],[7,4],[16,4],[16,6],[20,6]],[[-1,10],[10,10],[10,7],[16,7],[16,6],[20,6]]],[...block(2,5,2,2),...block(12,0,3,2),...block(13,9,3,2),...block(18,0,2,2),...block(18,10,2,2)]);
const citadel=route('citadel',[[[-1,6],[3,6],[3,2],[8,2],[8,9],[12,9],[12,2],[17,2],[17,6],[20,6]]],[...block(9,4,2,3),...block(0,0,2,2),...block(0,10,2,2),...block(14,9,3,2),...block(5,5,2,1)]);
const lagoon=route('lagoon',[[[-1,3],[4,3],[4,8],[10,8],[10,3],[16,3],[16,7],[20,7]],[[-1,9],[4,9],[4,8],[10,8],[10,3],[16,3],[16,7],[20,7]]],[...block(6,4,3,2),...block(12,9,3,2),...block(0,0,2,2),...block(18,1,2,2)]);
const grove=route('grove',[[[-1,6],[3,6],[3,2],[7,2],[7,9],[12,9],[12,2],[16,2],[16,6],[20,6]]],[...block(0,0,2,2),...block(9,4,2,3),...block(18,9,2,2),...block(4,10,2,2),...block(14,7,2,1)]);
const dunes=route('dunes',[[[-1,2],[5,2],[5,6],[11,6],[11,9],[16,9],[16,5],[20,5]],[[-1,10],[7,10],[7,6],[11,6],[11,9],[16,9],[16,5],[20,5]]],[...block(1,5,3,2),...block(8,1,3,2),...block(13,3,2,2),...block(18,9,2,2)]);
const glacier=route('glacier',[[[-1,1],[4,1],[4,5],[10,5],[10,8],[16,8],[16,5],[20,5]],[[-1,10],[4,10],[4,7],[10,7],[10,8],[16,8],[16,5],[20,5]]],[...block(6,1,3,2),...block(12,2,3,2),...block(6,10,2,2),...block(18,9,2,2)]);
const astral=route('astral',[[[-1,3],[3,3],[3,8],[8,8],[8,2],[13,2],[13,9],[17,9],[17,6],[20,6]],[[-1,10],[3,10],[3,8],[8,8],[8,2],[13,2],[13,9],[17,9],[17,6],[20,6]]],[...block(0,0,2,2),...block(5,4,2,2),...block(10,5,2,2),...block(15,0,3,2),...block(18,2,2,2)]);
/** A tiered campaign: the same teaching arc as the meadow, denser and mixed with every grump type, ending in a boss. */
function campaign(tier:number,length:number,finale:Wave,mid:EnemyKind):Wave[] {
 const c=(n:number)=>Math.ceil(n*(1+.22*tier)), sp=(s:number)=>Math.max(24,s-6*tier);
 const template:[string,Group[]][] = [
  ['Grumpy greetings',[g('wobbler',c(12),sp(80))]],
  ['Pitter patter',[g('dasher',c(14),sp(60)),g('wobbler',c(8),sp(70),300)]],
  ['Bubble trouble',[g('bubble',c(8),sp(90)),g('wobbler',c(10),sp(60),200)]],
  ['Chunky monkeys',[g('chunky',c(8),sp(120)),g('dasher',c(12),sp(50),400)]],
  ['Muffin top',[g('mender',c(4),sp(200)),g('chunky',c(8),sp(110)),g('wobbler',c(16),sp(50),100)]],
  [`A ${mid==='captain'?'captain':'baron'} at the crossroads`,[g(mid,1,1,600),g('splitter',c(6),sp(120)),g('bubble',c(8),sp(80),300)]],
  ['Rush hour',[g('dasher',c(36),sp(34)),g('jellet',c(18),sp(30),600)]],
  ['Mixed nuts',[g('chunky',c(12),sp(90)),g('mender',c(4),sp(220),200),g('splitter',c(8),sp(110),500),g('dasher',c(22),sp(40),300)]],
  ['Bubble wrap',[g('bubble',c(18),sp(55)),g('chunky',c(12),sp(90),300),g('mender',c(5),sp(160),400)]],
  ['Jelly jamboree',[g('splitter',c(16),sp(80)),g('jellet',c(30),sp(26),200),g('mender',c(4),sp(200),500)]],
  ['The siege begins',[g('chunky',c(24),sp(70)),g('dasher',c(36),sp(30),200),g('bubble',c(10),sp(70),600)]],
  ['No time for tea',[g(tier>1?'baron':'captain',1,1,700),g('chunky',c(26),sp(65)),g('dasher',c(40),sp(28),350),g('mender',c(6),sp(150),300)]],
  ['Sticky situation',[g('splitter',c(20),sp(70)),g('bubble',c(20),sp(50),300),g('chunky',c(16),sp(80),600)]],
  ['The last picnic',[g('captain',2,900,300),g('chunky',c(28),sp(60)),g('mender',c(8),sp(140),200),g('dasher',c(44),sp(26),500)]]
 ];
 const result=template.slice(0,length-1).map(([name,groups],i)=>({name,bonus:40+10*tier+6*i,groups}));
 return [...result,finale];
}
const finale = (name:string,tier:number,bosses:Group[]):Wave => ({name,bonus:180+40*tier,groups:[...bosses,g('chunky',32+6*tier,60),g('bubble',10+4*tier,70,300),g('dasher',50+10*tier,26,450),g('splitter',6+3*tier,140,800)]});
export const levels:LevelDefinition[]=[
 {name:'Jellybean Junction',subtitle:'A little garden. A big tantrum.',difficulty:'Meadow · Normal',map,waves,coins:180,lives:20,healthScale:1,speedScale:1},
 {name:'Bramble Orchard',subtitle:'Thicker thorns. Tougher grumps.',difficulty:'Orchard · Hard',map:orchard,waves:campaign(1,12,finale('Iron Baron',1,[g('baron',1,1,850)]),'captain'),coins:220,lives:18,healthScale:1.35,speedScale:1.05},
 {name:'Caramel Canyon',subtitle:'Short road. Long odds.',difficulty:'Canyon · Expert',map:canyon,waves:campaign(2,12,finale('Swarm Duchess',2,[g('duchess',1,1,850)]),'captain'),coins:260,lives:16,healthScale:1.7,speedScale:1.1},
 {name:'Frosting Fjord',subtitle:'Two roads diverged. Both are angry.',difficulty:'Fjord · Expert',map:fjord,waves:campaign(2,14,finale('Twin Barons',2,[g('baron',2,700,850)]),'baron'),coins:300,lives:16,healthScale:1.6,speedScale:1.1},
 {name:'Fondue Volcano',subtitle:'Things are heating up.',difficulty:'Volcano · Master',map:volcano,waves:campaign(3,14,finale('Royal Eruption',3,[g('duchess',1,1,850),g('baron',1,1,1500)]),'baron'),coins:340,lives:15,healthScale:1.45,speedScale:1.12},
 {name:'Licorice Citadel',subtitle:'The king of all tantrums.',difficulty:'Citadel · Nightmare',map:citadel,waves:campaign(3,15,finale('King Cataclysm',3,[g('king',1,1,850),g('duchess',1,1,1600)]),'baron'),coins:380,lives:15,healthScale:2.2,speedScale:1.15},
 {name:'Marshmallow Lagoon',subtitle:'Sweet shores. Sour company.',difficulty:'Lagoon · Master',map:lagoon,waves:campaign(3,15,finale('Tidal Tantrum',3,[g('duchess',2,800,850)]),'baron'),coins:420,lives:15,healthScale:1.8,speedScale:1.12},
 {name:'Pistachio Grove',subtitle:'Deep roots. Deeper trouble.',difficulty:'Grove · Nightmare',map:grove,waves:campaign(4,15,finale('The Thorn Crown',4,[g('king',1,1,850),g('baron',2,650,1400)]),'baron'),coins:460,lives:15,healthScale:2.2,speedScale:1.15},
 {name:'Honeycomb Dunes',subtitle:'Two trails through a sugar storm.',difficulty:'Dunes · Nightmare',map:dunes,waves:campaign(4,15,finale('The Golden Swarm',4,[g('duchess',2,750,850),g('baron',1,1,1700)]),'baron'),coins:500,lives:15,healthScale:2,speedScale:1.16},
 {name:'Peppermint Glacier',subtitle:'Cold paths. Hot tempers.',difficulty:'Glacier · Legendary',map:glacier,waves:campaign(4,15,finale('Deep Freeze',4,[g('king',1,1,850),g('duchess',1,1,1600)]),'baron'),coins:540,lives:15,healthScale:2.1,speedScale:1.18},
 {name:'Starlight Confection',subtitle:'One last stand among the sugar stars.',difficulty:'Astral · Legendary',map:astral,waves:campaign(5,15,finale('The Cosmic Crown',5,[g('king',2,1000,850),g('duchess',2,850,1700)]),'baron'),coins:580,lives:15,healthScale:2.4,speedScale:1.2}
];
