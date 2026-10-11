import {it,expect} from 'vitest';
import {applyCommand,createGame,stepGame} from '../../src/game/core/simulation';
import {buildable} from '../../src/game/data/map';
import {validateDefinitions} from '../../src/game/data/definitions';
import type {TowerKind} from '../../src/game/core/types';
function run(mix:TowerKind[]){const s=createGame();const cells=[{x:2,y:5},{x:6,y:6},{x:8,y:5},{x:12,y:5},{x:14,y:6},{x:16,y:7},{x:6,y:9},{x:11,y:7},{x:8,y:2},{x:12,y:2}];for(let wave=0;wave<10;wave++){for(const t of s.towers){if(t.level<2)applyCommand(s,{type:'UpgradeTower',id:t.id});}for(let i=0;i<cells.length;i++)if(buildable(cells[i]))applyCommand(s,{type:'PlaceTower',kind:mix[i%mix.length],cell:cells[i]});applyCommand(s,{type:'StartWave'});stepGame(s,20000);if(s.phase==='lost')break;}return s;}
it('validates all production definitions',()=>{expect(()=>validateDefinitions()).not.toThrow();});
it.each([['pea','berry','frost'],['pea','berry'],['pea','frost','berry','pea']] as TowerKind[][])('completes production waves with mix %j',(...kinds)=>{const s=run(kinds);console.log('BALANCE',kinds,s.phase,s.lives,s.tick/60,s.towers.length);expect(s.phase).toBe('won');expect(s.wave).toBe(10);});
it('deterministic across tick batching',()=>{const a=createGame(),b=createGame();for(const s of [a,b]){applyCommand(s,{type:'PlaceTower',kind:'pea',cell:{x:2,y:5}});applyCommand(s,{type:'StartWave'});}stepGame(a,3000);for(let i=0;i<300;i++)stepGame(b,10);expect(a).toEqual(b);});
