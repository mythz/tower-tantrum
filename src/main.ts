import Phaser from 'phaser';
import { GameScene } from './game/presentation/GameScene';
document.querySelector('#app')!.innerHTML='<h1>Tower Tantrum</h1><p id="stats"></p><button id="start">Start wave</button><button id="pause">Pause</button><button id="restart">Restart</button><div id="game"></div>';
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:576,scene:[GameScene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
