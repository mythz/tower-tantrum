import type { GameScene } from './GameScene';
import { createGame,applyCommand,stepGame } from '../core/simulation';
import { buildable,center,distance,lengthOf,position } from '../data/map';
import type { TowerKind } from '../core/types';
export interface Fixture { snapshot:()=>{phase:string;tick:number;towers:number;enemies:number}; finish:(won:boolean)=>void; combat:()=>void; stress:()=>void; showcase:(wave?:number)=>void; advance:(ticks:number)=>void }
declare global {interface Window {tantrumTest?:Fixture}}
const kinds:TowerKind[]=['pea','berry','frost','zap','sun'];
export function installFixture(scene:GameScene){window.tantrumTest={snapshot:()=>({phase:scene.state.phase,tick:scene.state.tick,towers:scene.state.towers.length,enemies:scene.state.enemies.length}),advance:ticks=>{stepGame(scene.state,ticks);},
 finish:won=>{const s=createGame({level:scene.state.config.level,lives:won?20:1});s.wave=s.config.waves.length-1;applyCommand(s,{type:'StartWave'});s.queue=[];s.enemies=won?[]:[{id:1,kind:'wobbler',health:30,progress:lengthOf(s.config.map)-1,slows:[]}];stepGame(s,3);scene.state=s;},
 combat:()=>{const s=createGame({coins:1000});applyCommand(s,{type:'PlaceTower',kind:'pea',cell:{x:2,y:5}});applyCommand(s,{type:'StartWave'});s.enemies=[{id:100,kind:'chunky',health:140,progress:120,slows:[]}];scene.state=s;},
 stress:()=>{const s=createGame({coins:100000});for(let x=0;x<20;x++)for(let y=0;y<12;y++)if(s.towers.length<30&&buildable({x,y}))applyCommand(s,{type:'PlaceTower',kind:(['pea','berry','frost'] as const)[s.towers.length%3],cell:{x,y}});applyCommand(s,{type:'StartWave'});s.queue=[];s.enemies=Array.from({length:150},(_,i)=>({id:1000+i,kind:'chunky',health:140,progress:i*10,slows:[]}));scene.state=s;},
 /** A mid-game battle on the current level: a mixed, partly upgraded army facing a later wave. */
 showcase:(wave=6)=>{const s=createGame({level:scene.state.config.level,coins:100000});const route=s.config.map;const samples=route.paths.flatMap((_,lane)=>Array.from({length:Math.ceil(lengthOf(route,lane)/24)},(_,i)=>position(i*24,route,lane)));
  const ranked=Array.from({length:240},(_,i)=>({x:i%20,y:Math.floor(i/20)})).filter(c=>buildable(c,route)).map(cell=>({cell,score:samples.filter(p=>distance(center(cell),p)<=140).length})).sort((a,b)=>b.score-a.score);
  for(const [i,{cell}] of ranked.slice(0,14).entries()){applyCommand(s,{type:'PlaceTower',kind:kinds[i%5],cell});const t=s.towers.at(-1)!;for(let l=0;l<i%3;l++)applyCommand(s,{type:'UpgradeTower',id:t.id});}
  s.wave=Math.min(wave,s.config.waves.length-1);applyCommand(s,{type:'StartWave'});s.coins=740;stepGame(s,900);scene.state=s;}};}
