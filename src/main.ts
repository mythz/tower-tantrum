import Phaser from 'phaser';
import { GameScene } from './game/presentation/GameScene';
import { mountUI } from './game/ui/Hud';
import './style.css';
mountUI();
/** Software-emulated WebGL (SwiftShader, llvmpipe) is slower than Canvas 2D and cannot create Phaser's framebuffers, so use Canvas there. */
function renderer(){const forced=new URLSearchParams(location.search).get('renderer');if(forced==='canvas')return Phaser.CANVAS;if(forced==='webgl')return Phaser.WEBGL;
 try{const gl=document.createElement('canvas').getContext('webgl');if(!gl)return Phaser.CANVAS;const info=gl.getExtension('WEBGL_debug_renderer_info');const name=String(info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER));return /swiftshader|llvmpipe|software|softpipe/i.test(name)?Phaser.CANVAS:Phaser.WEBGL;}catch{return Phaser.CANVAS;}}
// The world is 960×576; GPU rendering runs at 2× through camera zoom so sprites and text stay crisp on high-density screens.
const type=renderer(),scale=type===Phaser.WEBGL?2:1;
new Phaser.Game({type,parent:'game',width:960*scale,height:576*scale,backgroundColor:'#0c1714',scene:[GameScene],render:{antialias:true,powerPreference:'high-performance'},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
