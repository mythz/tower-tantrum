import Phaser from 'phaser';
import { applyCommand, createGame, getPlacementPreview, stepGame } from '../core/simulation';
import { center, map, position } from '../data/map';
export class GameScene extends Phaser.Scene {
 state=createGame(); graphics!:Phaser.GameObjects.Graphics; elapsed=0;
 constructor(){super('game');}
 create(){this.graphics=this.add.graphics();this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{applyCommand(this.state,{type:'PlaceTower',kind:'pea',cell:{x:Math.floor(p.x/48),y:Math.floor(p.y/48)}});});
 document.querySelector('#start')?.addEventListener('click',()=>applyCommand(this.state,{type:'StartWave'}));
 document.querySelector('#pause')?.addEventListener('click',()=>applyCommand(this.state,{type:this.state.phase==='paused'?'Resume':'Pause'}));
 document.querySelector('#restart')?.addEventListener('click',()=>{this.state=createGame();});}
 update(_time:number,delta:number){this.elapsed+=Math.min(delta,100);while(this.elapsed>=1000/60){stepGame(this.state);this.elapsed-=1000/60;}const g=this.graphics;g.clear();g.fillStyle(0x8dc975);g.fillRect(0,0,960,576);g.lineStyle(48,0xf4d597);g.strokePoints(map.path,false);for(const t of this.state.towers){const p=center(t.cell);g.fillStyle(0x357652);g.fillCircle(p.x,p.y,20);}for(const e of this.state.enemies){const p=position(e.progress);g.fillStyle(0xec795e);g.fillCircle(p.x,p.y,16);}for(const p of this.state.projectiles){g.fillStyle(0xffffff);g.fillCircle(p.x,p.y,4);}const pointer=this.input.activePointer;const cell={x:Math.floor(pointer.x/48),y:Math.floor(pointer.y/48)},p=center(cell);g.lineStyle(2,getPlacementPreview(this.state,'pea',cell).ok?0xffffff:0xff3333);g.strokeCircle(p.x,p.y,140);const hud=document.querySelector('#stats');if(hud)hud.textContent=`${this.state.coins} coins • ${this.state.lives} lives • wave ${this.state.wave}/3 • ${this.state.phase}`;}
}
