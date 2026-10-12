import Phaser from 'phaser';
import { abilities, applyCommand, createGame, enemyHealth, enemyPosition, enemyShield, getPlacementPreview, stars, stepGame } from '../core/simulation';
import type { Ability, Command, DomainEvent, EnemyKind, Point, Targeting, TowerKind } from '../core/types';
import { buildable, center, distance } from '../data/map';
import { levels } from '../data/levels';
import { enemies, towers, validateDefinitions } from '../data/definitions';
import { images } from '../assets/manifest';
import { $, renderHud, saveStars } from '../ui/Hud';
import { AudioController } from './Audio';
import { mapSvg, themes } from './mapArt';
const kinds=Object.keys(towers) as TowerKind[];
const goo:Record<EnemyKind,number>={wobbler:0xf08a54,dasher:0xf2cf3d,chunky:0x9d7ccc,bubble:0x4fd1c1,mender:0xff8fc0,splitter:0x8be067,jellet:0x8be067,captain:0xe0606a,baron:0xa8b1c2,duchess:0xb46ae0,king:0xc83a3a};
const aims:Record<TowerKind,boolean>={pea:true,berry:true,frost:false,zap:false,sun:true};
const heads:Record<TowerKind,number>={pea:70,berry:70,frost:68,zap:66,sun:72};
const reasons={OCCUPIED:'A tower already lives here.',OUT_OF_BOUNDS:'Stay inside the garden.',NOT_BUILDABLE:'Keep the path and scenery clear.',INSUFFICIENT_COINS:'A few more coins needed.',MAX_LEVEL:'Already fully grown!',INVALID_PHASE:'Send a wave first.',NOT_FOUND:'Select a tower first.',COOLDOWN:'Still recharging…'};
interface TowerView { base:Phaser.GameObjects.Image; head:Phaser.GameObjects.Image; angle:number; target:number; born:number; recoil:number; level:number; badge:Phaser.GameObjects.Text }
interface Floater { text:Phaser.GameObjects.Text; age:number; life:number; x:number; y:number; rise:number; pop:boolean }
interface Ring { x:number; y:number; age:number; life:number; radius:number; color:number; width:number }
export class GameScene extends Phaser.Scene {
 state=createGame();private background!:Phaser.GameObjects.Image;private ground!:Phaser.GameObjects.Graphics;private graphics!:Phaser.GameObjects.Graphics;private glow!:Phaser.GameObjects.Graphics;private elapsed=0;private kind:TowerKind|null=null;private selected:number|null=null;private ready=false;private hudDirty=true;private hudSignature='';private failure=false;
 private towerViews=new Map<number,TowerView>();private enemyViews=new Map<number,Phaser.GameObjects.Image>();private shotViews=new Map<number,{sprite:Phaser.GameObjects.Image;from:Point;trail:Point[]}>();private pool:Phaser.GameObjects.Image[]=[];
 private flashes=new Map<number,number>();private floaters:Floater[]=[];private labels:Phaser.GameObjects.Text[]=[];private rings:Ring[]=[];private zaps:{points:Point[];age:number}[]=[];private screenFlash={color:0xffffff,age:1,life:1,alpha:0};
 private fx!:Record<'chunks'|'glow'|'spark'|'smoke'|'confetti'|'flake'|'ambient',Phaser.GameObjects.Particles.ParticleEmitter>;private ghostBase!:Phaser.GameObjects.Image;private ghostHead!:Phaser.GameObjects.Image;private bossLabel!:Phaser.GameObjects.Text;private banner!:Phaser.GameObjects.Container;
 private audio=new AudioController();private bindings:AbortController|null=null;private overlayPhase='intro';private speed=1;private targeting:Ability|null=null;private combo={count:0,last:0};private clock=0;private theme='';
 constructor(){super('game');}
 preload(){for(const l of levels)validateDefinitions(l.waves);this.load.on('loaderror',(file:Phaser.Loader.File)=>{if(!file.key.startsWith('sfx'))this.failure=true;});const scale=this.scale.width/960;for(const [key,url] of Object.entries(images))this.load.svg(key,url,{scale});
  for(const l of levels){const key=`map-${l.map.visual}`;if(!this.textures.exists(key))this.load.svg(key,URL.createObjectURL(new Blob([mapSvg(l.map)],{type:'image/svg+xml'})),{width:960*scale,height:576*scale});}}
 create(){
 if(this.failure){$('overlay').innerHTML='<div class="modal"><h2>The garden could not load.</h2><p>Check your connection and try again.</p><button class="primary" onclick="location.reload()">Retry</button></div>';return;}
 this.cameras.main.setZoom(this.scale.width/960).centerOn(480,288);this.makeTextures();
 this.background=this.add.image(480,288,`map-${this.state.config.map.visual}`).setDisplaySize(960,576).setDepth(-10);
 this.ground=this.add.graphics().setDepth(-5);this.graphics=this.add.graphics().setDepth(10000);this.glow=this.add.graphics().setDepth(9500).setBlendMode(Phaser.BlendModes.ADD);
 this.ghostBase=this.add.image(0,0,'base-0').setAlpha(.65).setDepth(9990).setVisible(false);this.ghostHead=this.add.image(0,0,'pea-head-0').setAlpha(.75).setDepth(9991).setVisible(false);
 const text=(size:number,color='#fff8df',stroke='#2c3a33')=>this.add.text(0,0,'',{fontFamily:'"Trebuchet MS", Arial, sans-serif',fontSize:`${size}px`,fontStyle:'bold',color,stroke,strokeThickness:Math.max(3,size/5),resolution:this.scale.width/960}).setOrigin(.5);
 for(let i=0;i<40;i++)this.labels.push(text(14).setDepth(10001).setVisible(false));
 this.bossLabel=text(13).setDepth(10003).setVisible(false);
 const title=text(44,'#fff6d6','#2c3a33').setName('title'),subtitle=text(17,'#ffffff','#2c3a33').setName('subtitle').setY(38);
 this.banner=this.add.container(480,250,[this.add.rectangle(0,10,960,104,0x1c2a24,.55).setName('band'),title,subtitle]).setDepth(10005).setAlpha(0);
 this.fx={
  chunks:this.add.particles(0,0,'chunk',{lifespan:{min:350,max:700},speed:{min:60,max:230},scale:{start:1,end:0},gravityY:420,emitting:false}).setDepth(9000),
  glow:this.add.particles(0,0,'glow',{lifespan:320,scale:{start:1.4,end:.2},alpha:{start:.9,end:0},blendMode:'ADD',emitting:false}).setDepth(9400),
  spark:this.add.particles(0,0,'spark',{lifespan:{min:350,max:650},speed:{min:40,max:190},scale:{start:.7,end:0},rotate:{min:0,max:360},blendMode:'ADD',emitting:false}).setDepth(9401),
  smoke:this.add.particles(0,0,'glow',{lifespan:{min:500,max:900},speed:{min:8,max:40},scale:{start:.5,end:1.6},alpha:{start:.32,end:0},tint:0xf3ead8,emitting:false}).setDepth(8999),
  confetti:this.add.particles(0,0,'confetti',{lifespan:{min:900,max:1500},speed:{min:120,max:340},angle:{min:200,max:340},gravityY:520,rotate:{start:0,end:540},scaleX:{min:.6,max:1},tint:[0xff6b9a,0xffd25e,0x7ce0c3,0x9db8ff,0xffffff,0xc9a6ff],emitting:false}).setDepth(9002),
  flake:this.add.particles(0,0,'flake',{lifespan:{min:500,max:900},speed:{min:20,max:90},scale:{start:.7,end:0},rotate:{min:0,max:360},emitting:false}).setDepth(9003),
  ambient:this.add.particles(0,0,'glow',{emitting:false}).setDepth(9600)
 };
 this.applyTheme();
 this.bindings=new AbortController();const signal=this.bindings.signal;
 const live=()=>this.ready&&['build','wave'].includes(this.state.phase);
 const on=(id:string,fn:()=>void)=>$(id).addEventListener('click',()=>{fn();if(live())this.audio.unlock();},{signal});
 $('level-select').addEventListener('change',()=>this.restart(Number($<HTMLSelectElement>('level-select').value)),{signal});
 on('begin',()=>{this.ready=true;this.hideOverlay();this.showBanner(levels[this.state.config.level].name,levels[this.state.config.level].subtitle);});on('start',()=>this.command({type:'StartWave'}));on('pause',()=>this.pause());on('settings',()=>this.pause());on('cancel',()=>this.cancel());on('speed',()=>this.cycleSpeed());
 on('mute',()=>{this.audio.settings.mute=!this.audio.settings.mute;this.audio.sync();if(!this.audio.settings.mute&&live())this.audio.unlock();this.soundUI();});
 for(const a of Object.keys(abilities) as Ability[])on(`ability-${a}`,()=>this.useAbility(a));
 $<HTMLInputElement>('volume').value=String(this.audio.settings.volume);$('volume').addEventListener('input',()=>{this.audio.settings.volume=Number($<HTMLInputElement>('volume').value);this.audio.sync();if(live())this.audio.unlock();},{signal});
 for(const kind of kinds)on(`pick-${kind}`,()=>this.pick(kind));
 $('selection').addEventListener('click',e=>{const button=(e.target as HTMLElement).closest('button');const id=this.selected;if(!button||id===null)return;if(button.id==='upgrade')this.command({type:'UpgradeTower',id});if(button.id==='sell'&&this.command({type:'SellTower',id}))this.selected=null;if(button.dataset.target)this.command({type:'SetTargeting',id,targeting:button.dataset.target as Targeting});this.hudDirty=true;},{signal});
 $('overlay').addEventListener('click',e=>{const id=(e.target as HTMLElement).closest('button')?.id;if(id==='resume'){this.command({type:'Resume'});this.hideOverlay();this.audio.unlock();}if(id==='restart')this.restart();if(id==='next-level')this.restart(this.state.config.level+1);},{signal});
 $('overlay').addEventListener('change',e=>{if((e.target as HTMLElement).id==='motion'){this.audio.settings.reducedMotion=(e.target as HTMLInputElement).checked;this.audio.sync();}},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&live()){this.command({type:'Pause'});this.showOverlay('paused');this.audio.pause();}},{signal});
 document.addEventListener('keydown',e=>{if(e.repeat||(e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();
  if(e.key==='Escape')this.cancel();if(key==='p')this.pause();if(key==='f')this.cycleSpeed();if(key==='q')this.useAbility('bomb');if(key==='w')this.useAbility('chill');
  if(this.selected!==null&&live()){if(key==='u')this.command({type:'UpgradeTower',id:this.selected});if(key==='t'){const t=this.state.towers.find(t=>t.id===this.selected);const modes:Targeting[]=['first','last','strong','close'];if(t)this.command({type:'SetTargeting',id:t.id,targeting:modes[(modes.indexOf(t.targeting??'first')+1)%4]});}}
  if(e.code==='Space'&&!(e.target as HTMLElement).closest('button,a')){e.preventDefault();if(this.ready&&this.state.phase==='build')this.command({type:'StartWave'});}
  const k=Number(e.key);if(k>=1&&k<=kinds.length)this.pick(kinds[k-1]);},{signal});
 this.game.canvas.addEventListener('contextmenu',e=>{e.preventDefault();this.cancel();},{signal});
 this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(!live())return;if(p.rightButtonDown()){this.cancel();return;}this.audio.unlock();const w=this.world(p);
  if(this.targeting){if(this.command({type:'UseAbility',ability:this.targeting,at:w}))this.targeting=null;this.hudDirty=true;return;}
  const cell={x:Math.floor(w.x/48),y:Math.floor(w.y/48)};const existing=this.state.towers.find(t=>t.cell.x===cell.x&&t.cell.y===cell.y);if(existing){this.selected=existing.id;this.kind=null;this.hudDirty=true;return;}
  if(this.kind){const r=this.command({type:'PlaceTower',kind:this.kind,cell});if(r){this.selected=this.state.towers.at(-1)!.id;this.kind=null;this.hudDirty=true;}}else if(this.selected!==null){this.selected=null;this.hudDirty=true;}});
 this.events.once('shutdown',()=>{this.bindings?.abort();this.audio.pause();});this.soundUI();this.hudDirty=true;
 if(import.meta.env.DEV&&new URLSearchParams(location.search).has('test'))void import('./testFixture').then(m=>m.installFixture(this));
 }
 /** Small particle textures drawn once at startup, so effects need no extra downloads. */
 private makeTextures(){
  const canvas=(key:string,w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void)=>{if(this.textures.exists(key))return;const t=this.textures.createCanvas(key,w,h)!;draw(t.getContext());t.refresh();};
  canvas('glow',64,64,c=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
  canvas('chunk',16,16,c=>{c.fillStyle='#fff';c.beginPath();c.arc(8,8,7,0,Math.PI*2);c.fill();});
  canvas('spark',32,32,c=>{c.fillStyle='#fff';c.beginPath();for(let i=0;i<8;i++){const r=i%2?4:15,a=i*Math.PI/4;c.lineTo(16+Math.cos(a)*r,16+Math.sin(a)*r);}c.fill();});
  canvas('confetti',8,14,c=>{c.fillStyle='#fff';c.fillRect(0,0,8,14);});
  canvas('flake',24,24,c=>{c.strokeStyle='#fff';c.lineWidth=3;c.lineCap='round';for(let i=0;i<3;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(12-Math.cos(a)*10,12-Math.sin(a)*10);c.lineTo(12+Math.cos(a)*10,12+Math.sin(a)*10);c.stroke();}});
  canvas('leaf',20,12,c=>{c.fillStyle='#fff';c.beginPath();c.ellipse(10,6,9,5,0,0,Math.PI*2);c.fill();});
 }
 private applyTheme(){const visual=this.state.config.map.visual;if(this.theme===visual)return;this.theme=visual;this.background.setTexture(`map-${visual}`).setDisplaySize(960,576);
  const a=themes[visual].ambient,reduced=this.audio.settings.reducedMotion;this.fx.ambient.destroy();
  const texture=visual==='orchard'?'leaf':(visual==='fjord'||visual==='glacier')?'chunk':'glow',drift=a.drift==='down'?{y:{min:-20,max:-10},speedY:{min:25,max:55},speedX:{min:-25,max:15}}:a.drift==='up'?{y:{min:560,max:600},speedY:{min:-60,max:-25},speedX:{min:-10,max:10}}:{y:{min:0,max:576},speedY:{min:-12,max:12},speedX:{min:-14,max:14}};
  this.fx.ambient=this.add.particles(0,0,texture,{x:{min:0,max:960},...drift,lifespan:a.drift==='float'?6000:16000,frequency:a.drift==='float'?220:(visual==='fjord'||visual==='glacier')?90:260,quantity:1,maxParticles:a.count,scale:{min:a.size*.5,max:a.size},rotate:{min:0,max:360},tint:a.color,blendMode:texture==='glow'?'ADD':'NORMAL',alpha:{onEmit:()=>0,onUpdate:(_p:unknown,_k:string,t:number)=>Math.sin(t*Math.PI)*(texture==='glow'?.85:.9)}}).setDepth(9600);
  if(reduced)this.fx.ambient.stop();}
 private world(p:{x:number;y:number}):Point{const w=this.cameras.main.getWorldPoint(p.x,p.y);return {x:w.x,y:w.y};}
 private soundUI(){$('mute').textContent=this.audio.settings.mute?'♪̸':'♫';$('mute').setAttribute('aria-pressed',String(this.audio.settings.mute));}
 private cycleSpeed(){if(!this.ready)return;this.speed=this.speed===3?1:this.speed+1;$('speed').textContent=`${this.speed}×`;$('speed').setAttribute('aria-label',`Game speed ${this.speed}×`);$('speed').classList.toggle('fast',this.speed>1);}
 private pick(kind:TowerKind){if(!this.ready||!['build','wave'].includes(this.state.phase))return;this.kind=kind;this.selected=null;this.targeting=null;this.hudDirty=true;$('hint').textContent='Find an open patch of ground. Tap to build.';}
 private cancel(){this.kind=null;this.selected=null;this.targeting=null;this.hudDirty=true;$('hint').textContent='Choose a tower, then find a patch of ground.';}
 private useAbility(a:Ability){if(!this.ready||this.state.phase!=='wave'){$('hint').textContent='Powers wake up once the grumps arrive.';return;}if(this.state.abilities[a]>0){$('hint').textContent=reasons.COOLDOWN;return;}
  if(a==='chill'){this.command({type:'UseAbility',ability:a,at:{x:480,y:288}});return;}this.targeting=this.targeting===a?null:a;this.kind=null;this.selected=null;this.hudDirty=true;$('hint').textContent=this.targeting?'Tap the path to drop a Sugar Bomb!':'Choose a tower, then find a patch of ground.';}
 private command(c:Command){if(!this.ready&&c.type!=='Pause')return false;const r=applyCommand(this.state,c);if(!r.ok){$('hint').textContent=reasons[r.reason];return false;}this.consume(r.events);this.hudDirty=true;return true;}
 private pause(){if(!this.ready)return;if(this.state.phase==='paused'){this.command({type:'Resume'});this.hideOverlay();this.audio.unlock();}else if(['build','wave'].includes(this.state.phase)){this.command({type:'Pause'});this.showOverlay('paused');this.audio.pause();}}
 private hideOverlay(){$('overlay').classList.add('hidden');this.overlayPhase='';this.elapsed=0;}
 private showOverlay(phase:string){if(this.overlayPhase===phase)return;this.overlayPhase=phase;$('overlay').classList.remove('hidden');const paused=phase==='paused',won=phase==='won',level=levels[this.state.config.level];const earned=stars(this.state);if(won)saveStars(this.state.config.level,earned);
  $('overlay').innerHTML=`<div class="modal ${phase}">${won?`<div class="stars" aria-label="${earned} of 3 stars">${[1,2,3].map(i=>`<span class="${i<=earned?'on':''}" style="animation-delay:${i*.18}s">★</span>`).join('')}</div>`:''}<span class="eyebrow">${paused?'TAKE A LITTLE BREATHER':won?'THE GARDEN IS SAFE':'GRUMPS AT THE GATE'}</span><h2>${paused?'Even towers need<br>a tea break.':won?'Sweet victory!':'A little too much<br>tantrum.'}</h2><p>${paused?'Build beside the path, mix tower types and tap a tower to upgrade, retarget or sell. Send waves early for bonus coins. Powers: <b>Q</b> Sugar Bomb, <b>W</b> Big Chill. <b>F</b> changes speed.':won?`${this.state.config.waves.length} waves defended in ${level.name}. ${this.state.lives} lives left · ${this.state.kills} grumps calmed.`:`You made it to wave ${this.state.wave} of ${this.state.config.waves.length}. Try more splash, a little frost, and save a Sugar Bomb for the boss.`}</p>${paused?`<label><input id="motion" type="checkbox" ${this.audio.settings.reducedMotion?'checked':''}> Reduce motion & effects</label><button id="resume" class="primary">Back to the garden <span>→</span></button>`:''}${won&&this.state.config.level<levels.length-1?`<button id="next-level" class="primary">Next: ${levels[this.state.config.level+1].name} <span>→</span></button>`:''}<button id="restart" class="${paused||won&&this.state.config.level<levels.length-1?'text-button':'primary'}">Plant a fresh start ${paused?'':'<span>↻</span>'}</button></div>`;}
 private restart(level=this.state.config.level){this.state=createGame({level});this.applyTheme();this.ready=true;this.kind=null;this.selected=null;this.targeting=null;this.flashes.clear();this.rings=[];this.zaps=[];this.combo.count=0;for(const f of this.floaters)f.text.setVisible(false);this.floaters=[];this.elapsed=0;this.hideOverlay();this.hudDirty=true;this.audio.unlock();this.banner.setAlpha(0);this.showBanner(levels[level].name,levels[level].subtitle);$('hint').textContent='Fresh garden, fresh attitude. Choose your first tower.';}
 private float(x:number,y:number,label:string,color='#fff8df',size=14,life=900,rise=28){const text=this.labels.find(l=>!l.visible)??this.floaters.shift()?.text;if(!text)return;text.setText(label).setColor(color).setFontSize(size).setVisible(true).setAlpha(1).setPosition(x,y);this.floaters.push({text,age:0,life,x,y,rise,pop:size>16});}
 private showBanner(title:string,subtitle:string,color='#fff6d6'){(this.banner.getByName('title') as Phaser.GameObjects.Text).setText(title).setColor(color);(this.banner.getByName('subtitle') as Phaser.GameObjects.Text).setText(subtitle);this.tweens.killTweensOf(this.banner);this.banner.setAlpha(0).setScale(.7);
  this.tweens.chain({targets:this.banner,tweens:[{alpha:1,scale:1,duration:380,ease:'Back.Out'},{alpha:0,scale:1.04,delay:1300,duration:450,ease:'Sine.In'}]});}
 private ring(x:number,y:number,radius:number,color:number,life=450,width=4){if(this.rings.length<40)this.rings.push({x,y,age:0,life,radius,color,width});}
 private shake(duration:number,intensity:number){if(!this.audio.settings.reducedMotion)this.cameras.main.shake(duration,intensity);}
 private flash(color:number,alpha:number,life=350){this.screenFlash={color,alpha,age:0,life};}
 private burst(emitter:keyof GameScene['fx'],count:number,x:number,y:number,tint?:number){if(this.audio.settings.reducedMotion)count=Math.ceil(count/3);const e=this.fx[emitter];if(tint!==undefined)e.setParticleTint(tint);e.explode(count,x,y);}
 private consume(events:DomainEvent[]){const now=this.clock;for(const e of events){this.hudDirty=true;
  if(e.type==='shot'&&e.kind){this.audio.play(`shot-${e.kind}`,e.kind==='pea'?.55:.75);const v=this.towerViews.get(e.id!);if(v){v.recoil=now+120;if(e.points?.[0])v.target=Math.atan2(e.points[0].y-(e.y-13),e.points[0].x-e.x);}this.burst('glow',1,e.x+Math.cos(v?.angle??0)*30,e.y-13+Math.sin(v?.angle??0)*30,towers[e.kind].color);}
  if(e.type==='zap'&&e.points){this.zaps.push({points:e.points,age:0});for(const p of e.points.slice(1)){this.burst('spark',4,p.x,p.y-12,0xd9c2ff);this.burst('glow',1,p.x,p.y-12,0xb98aff);}}
  if(e.type==='impact'&&e.kind){const y=e.y-10;
   if(e.kind==='berry'){this.audio.play('boom',.8);this.burst('glow',3,e.x,y,0xff9ab8);this.burst('chunks',14,e.x,y,0xe8577e);this.burst('smoke',4,e.x,y);this.ring(e.x,y,towers.berry.levels[2].splash,0xffd0dd,420,5);this.shake(90,.0025);}
   else if(e.kind==='frost'){this.burst('flake',6,e.x,y,0xcff8ff);this.burst('glow',1,e.x,y,0x7fe6ff);}
   else if(e.kind==='sun'){this.burst('spark',8,e.x,y,0xffe066);this.burst('glow',2,e.x,y,0xffc23a);}
   else {this.audio.play('impact',.4);this.burst('chunks',5,e.x,y,0x9ddb6a);}}
  if(e.type==='damage'&&e.id)this.flashes.set(e.id,now+70);
  if(e.type==='death'&&e.enemy){const boss=enemies[e.enemy].boss;this.audio.play(boss?'boom':'pop',boss?1:.6);this.burst('chunks',boss?40:10,e.x,e.y-12,goo[e.enemy]);this.burst('confetti',boss?60:5,e.x,e.y-12);this.burst('glow',boss?4:1,e.x,e.y-12,goo[e.enemy]);this.float(e.x,e.y-26,`+${e.amount}`,'#ffd84a',boss?22:14);
   if(boss){this.shake(450,.008);this.flash(0xffffff,.55,500);this.ring(e.x,e.y-12,140,0xfff2b0,700,8);this.showBanner(`${enemies[e.enemy].name} defeated!`,`+${e.amount} coins`,'#ffd84a');}
   this.combo.count=now-this.combo.last<1100?this.combo.count+1:1;this.combo.last=now;if(this.combo.count>=5&&this.combo.count%5===0){this.float(e.x,e.y-52,`COMBO ×${this.combo.count}!`,'#ff8fc0',20,1100,36);this.audio.play('combo',.6,0);}}
  if(e.type==='spawn')this.burst('smoke',3,e.x+16,e.y);
  if(e.type==='boss'&&e.enemy){this.audio.play('boss',1,0);this.showBanner(`⚠ ${enemies[e.enemy].name}`,{captain:'A very crumbly captain approaches.',baron:'Heavy armor — upgrade for big hits.',duchess:'Summons dashers. Focus fire!',king:'Armored, summoning, and furious below half health.'}[e.enemy as string]??'','#ff9a7a');this.shake(600,.004);this.flash(0xff4a4a,.18,700);}
  if(e.type==='leak'){this.audio.play('leak',.8,0);this.float(e.x-30,e.y-20,`−${e.amount??1} ♥`,'#ff7a7a',18);this.shake(220,.006);this.flash(0xff2a2a,.3,450);}
  if(e.type==='heal'&&e.amount){this.audio.play('heal',.35);this.ring(e.x,e.y-12,enemies.mender.heal!.radius,0x8bff9a,600,3);this.burst('spark',4,e.x,e.y-20,0x8bff9a);}
  if(e.type==='shield'){this.audio.play('shield',.6);this.burst('spark',10,e.x,e.y-14,0xb8fff5);this.ring(e.x,e.y-14,34,0xb8fff5,300,3);}
  if(e.type==='placed'){this.audio.play('placed');this.burst('smoke',8,e.x,e.y+14);this.ring(e.x,e.y+10,34,0xffffff,350,3);}
  if(e.type==='upgrade'){this.audio.play('upgrade',.9,0);this.burst('spark',18,e.x,e.y-10,0xffe27a);this.burst('glow',2,e.x,e.y-10,0xffd84a);this.ring(e.x,e.y,40,0xffe27a,500,4);this.float(e.x,e.y-48,e.level===2?'MAX LEVEL!':'LEVEL UP!','#ffe27a',16);const v=this.towerViews.get(e.id!);if(v)v.born=now;}
  if(e.type==='sold'){this.audio.play('sold');this.burst('spark',12,e.x,e.y,0xffd84a);this.burst('smoke',6,e.x,e.y+10);this.float(e.x,e.y-30,`+${e.amount}`,'#ffd84a',16);}
  if(e.type==='wave'){this.audio.play('wave',.9,0);const wave=this.state.config.waves[(e.amount??1)-1];if(wave)this.showBanner(`Wave ${e.amount}`,wave.name);}
  if(e.type==='early'){this.audio.play('coin',.8,0);this.float(480,120,`Early call! +${e.amount}`,'#ffd84a',20,1200,20);}
  if(e.type==='complete'&&this.state.phase==='build'){this.audio.play('coin',.9,0);this.showBanner('Wave cleared!',`+${e.amount} bonus coins`,'#c8ff9a');}
  if(e.type==='ability'){this.audio.play(`ability-${e.ability}`,1,0);
   if(e.ability==='bomb'){this.burst('glow',6,e.x,e.y,0xff9ad0);this.burst('chunks',30,e.x,e.y,0xf05fa8);this.burst('confetti',24,e.x,e.y);this.burst('smoke',10,e.x,e.y);this.ring(e.x,e.y,abilities.bomb.radius,0xffd0ec,550,7);this.ring(e.x,e.y,abilities.bomb.radius*1.5,0xffffff,700,3);this.shake(350,.01);this.flash(0xffd0ec,.35,400);}
   else {this.flash(0x9fe8ff,.45,900);this.ring(480,288,560,0xcff8ff,900,10);for(const en of this.state.enemies){const p=enemyPosition(this.state,en);this.burst('flake',4,p.x,p.y-14,0xcff8ff);}}}
  if(e.type==='end'){if(this.state.phase==='won'){this.audio.play('win',1,0);for(let i=0;i<6;i++)this.time.delayedCall(i*220,()=>this.burst('confetti',40,120+Math.random()*720,560));}else this.audio.play('lose',1,0);}
 }}
 private image(map:Map<number,Phaser.GameObjects.Image>,id:number,key:string){let v=map.get(id);if(!v){v=this.pool.pop()??this.add.image(0,0,key);v.setTexture(key).setVisible(true).setAlpha(1).setScale(1).setRotation(0).setFlip(false,false).clearTint().setBlendMode(Phaser.BlendModes.NORMAL).setOrigin(.5);map.set(id,v);}return v;}
 private release(v:Phaser.GameObjects.Image){v.setVisible(false);if(this.pool.length<300)this.pool.push(v);else v.destroy();}
 update(_time:number,delta:number){if(this.failure||!this.graphics)return;
 const paused=this.state.phase==='paused';if(!paused)this.clock+=delta;const now=this.clock;
 if(this.ready&&!paused){this.elapsed+=Math.min(delta,100)*this.speed;let steps=0;while(this.elapsed>=1000/60&&steps++<6*this.speed){this.consume(stepGame(this.state));this.elapsed-=1000/60;}}else this.elapsed=0;
 if(['won','lost'].includes(this.state.phase)){this.showOverlay(this.state.phase);this.audio.stopMusic();}
 const signature=[this.state.coins,this.state.lives,this.state.wave,this.state.phase,this.state.enemies.length,this.selected,this.kind,this.targeting,...Object.values(this.state.abilities).map(v=>Math.ceil(v/30))].join('|');if(signature!==this.hudSignature){this.hudDirty=true;this.hudSignature=signature;}
 if(this.hudDirty){renderHud(this.state,this.selected,this.kind,this.targeting);this.hudDirty=false;}
 this.applyTheme();
 const g=this.graphics,gr=this.ground,gl=this.glow;g.clear();gr.clear();gl.clear();const reduced=this.audio.settings.reducedMotion;const t=this.state.tick/60;const step=paused?0:delta;
 const pointer=this.world(this.input.activePointer),hoverCell={x:Math.floor(pointer.x/48),y:Math.floor(pointer.y/48)},inside=pointer.x>=0&&pointer.x<960&&pointer.y>=0&&pointer.y<576&&this.input.activePointer.active!==false;
 // towers
 const active=new Set<number>();
 for(const tw of this.state.towers){active.add(tw.id);const p=center(tw.cell);let v=this.towerViews.get(tw.id);
  if(!v){v={base:this.pool.pop()??this.add.image(0,0,'base-0'),head:this.pool.pop()??this.add.image(0,0,'pea-head-0'),angle:0,target:0,born:now,recoil:0,level:-1,badge:this.add.text(0,0,'',{fontFamily:'"Trebuchet MS", Arial, sans-serif',fontSize:'17px',fontStyle:'bold',color:'#fff8df',stroke:'#2c3a33',strokeThickness:5,resolution:this.scale.width/960}).setOrigin(.5)};for(const s of [v.base,v.head])s.setVisible(true).setAlpha(1).setRotation(0).setFlip(false,false).clearTint().setOrigin(.5).setBlendMode(Phaser.BlendModes.NORMAL);this.towerViews.set(tw.id,v);}
  if(v.level!==tw.level){v.level=tw.level;v.base.setTexture(`base-${tw.level}`);v.head.setTexture(`${tw.kind}-head-${tw.level}`);v.badge.setText(String(tw.level+1)).setColor(['#fff8df','#8ff0ff','#ffd84a'][tw.level]).setFontSize(15+tw.level*3);}
  const pop=reduced?1:Math.min(1,(now-v.born)/380),ease=pop<1?Phaser.Math.Easing.Back.Out(pop):1,recoil=!reduced&&v.recoil>now?(v.recoil-now)/120:0;
  if(aims[tw.kind]){let d=Phaser.Math.Angle.Wrap(v.target-v.angle);v.angle+=d*Math.min(1,step/60);}else v.angle=0;
  const flip=Math.cos(v.angle)<0,breathe=reduced?0:Math.sin(now/420+tw.id)*.025,size=heads[tw.kind]+tw.level*2;
  v.base.setPosition(p.x,p.y+6).setDisplaySize(52*ease,52*ease).setDepth(p.y);
  v.head.setPosition(p.x-Math.cos(v.angle)*recoil*6,p.y-13-Math.sin(v.angle)*recoil*6+(tw.kind==='frost'&&!reduced?Math.sin(now/300+tw.id)*2:0)).setDisplaySize(size*ease*(1+recoil*.12),size*ease*(1+breathe-recoil*.1)).setDepth(p.y+.5)
   .setRotation(aims[tw.kind]?v.angle:tw.kind==='zap'&&!reduced?now/900:0).setFlipY(aims[tw.kind]&&flip);
  const badgePop=v.level>0&&!reduced&&now-v.born<600?1+Math.sin((now-v.born)/600*Math.PI)*.8:1;v.badge.setPosition(p.x+19,p.y+16).setScale(badgePop).setDepth(p.y+1);
  if(tw.level===2&&!reduced){gl.fillStyle(towers[tw.kind].color,.12+Math.sin(now/300+tw.id)*.05);gl.fillCircle(p.x,p.y-12,30);}}
 for(const [id,v] of this.towerViews)if(!active.has(id)){this.release(v.base);this.release(v.head);v.badge.destroy();this.towerViews.delete(id);}
 // enemies
 const enemyIds=new Set<number>();let boss=null as null|typeof this.state.enemies[number];
 for(const e of this.state.enemies){enemyIds.add(e.id);const def=enemies[e.kind],p=enemyPosition(this.state,e),ahead=enemyPosition(this.state,{...e,progress:e.progress+2}),v=this.image(this.enemyViews,e.id,def.visual);if(def.boss&&(!boss||e.health>boss.health))boss=e;
  const max=enemyHealth(this.state,e.kind),slowed=e.slows.length>0,rage=def.rage&&e.health<max*.5,pace=(slowed?.5:1)*(rage?1.6:1),phase=t*9*pace+e.id,hop=reduced?0:Math.abs(Math.sin(phase))*(e.kind==='dasher'||e.kind==='jellet'?4:2.5),squash=reduced?0:Math.sin(phase*2)*.05,size=def.size;
  gr.fillStyle(0x000000,.2);gr.fillEllipse(p.x,p.y+size*.32-4,size*.72-hop*2,size*.2);
  if(def.boss&&!reduced){gl.fillStyle(rage?0xff3a2a:goo[e.kind],.18+Math.sin(now/180)*.08);gl.fillCircle(p.x,p.y-size*.2,size*.62);}
  v.setPosition(p.x,p.y-size*.22-hop).setDisplaySize(size*(1+squash),size*(1-squash)).setDepth(p.y+1).setFlipX(ahead.x<p.x-.01).setRotation(reduced?0:Math.sin(phase*.5)*.05);
  if((this.flashes.get(e.id)??0)>now&&!reduced)v.setTintFill(0xffffff);else if(rage)v.setTint(0xff9a8a);else if(slowed)v.setTint(0xa8ecff);else v.clearTint();
  if(slowed&&!reduced&&Math.random()<.02)this.burst('flake',1,p.x+(Math.random()-.5)*size*.6,p.y-size*.4,0xe0fbff);
  if(e.shield&&e.shield>0){const r=size*.62,a=.5+.5*e.shield/enemyShield(this.state,e.kind);g.fillStyle(0x9ff6ff,.16*a);g.fillCircle(p.x,p.y-size*.24-hop,r);g.lineStyle(2.5,0xc8fffa,.85*a);g.strokeCircle(p.x,p.y-size*.24-hop,r);g.fillStyle(0xffffff,.7*a);g.fillEllipse(p.x-r*.4,p.y-size*.24-hop-r*.45,r*.4,r*.2);}
  if(e.health<max&&!def.boss){const w=Math.max(30,size*.8),y=p.y-size*.78-hop,f=Math.max(0,e.health/max);g.fillStyle(0x1c2a24,.75);g.fillRoundedRect(p.x-w/2-1.5,y-1.5,w+3,7,3);g.fillStyle(f>.5?0x8be067:f>.25?0xffd25e:0xff6b5a);g.fillRoundedRect(p.x-w/2,y,Math.max(2,w*f),4,2);}}
 for(const [id,v] of this.enemyViews)if(!enemyIds.has(id)){this.release(v);this.enemyViews.delete(id);this.flashes.delete(id);}
 // projectiles
 const shotIds=new Set<number>();
 for(const p of this.state.projectiles){shotIds.add(p.id);let view=this.shotViews.get(p.id);if(!view){const sprite=this.pool.pop()??this.add.image(0,0,'shot-'+p.kind);sprite.setTexture(p.kind==='zap'?'shot-pea':'shot-'+p.kind).setVisible(true).setAlpha(1).setScale(1).clearTint().setFlip(false,false).setOrigin(.5).setBlendMode(p.kind==='sun'?Phaser.BlendModes.ADD:Phaser.BlendModes.NORMAL);view={sprite,from:{x:p.x,y:p.y},trail:[]};this.shotViews.set(p.id,view);}
  const total=Math.max(1,distance(view.from,p.destination)+distance(view.from,p)),frac=Math.min(1,distance(view.from,p)/total),lob=p.kind==='berry'?Math.sin(frac*Math.PI)*Math.min(70,total*.4):0,x=p.x,y=p.y-16-lob,prev=view.trail.at(-1),angle=prev?Math.atan2(y-prev.y,x-prev.x):0;
  if(!paused&&(!prev||distance(prev,{x,y})>2)){view.trail.push({x,y});if(view.trail.length>(p.kind==='sun'?6:5))view.trail.shift();}
  if(p.kind==='berry'){gr.fillStyle(0x000000,.18);gr.fillEllipse(p.x,p.y+4,14-lob*.08,5);}
  const size=p.kind==='berry'?18:p.kind==='sun'?34:p.kind==='frost'?15:12;view.sprite.setPosition(x,y).setDisplaySize(size,p.kind==='sun'?11:size).setDepth(9800).setRotation(p.kind==='berry'?(reduced?0:now/90):angle);
  if(!reduced&&view.trail.length>1){const color=towers[p.kind].color;for(let i=1;i<view.trail.length;i++){const a=view.trail[i-1],b=view.trail[i],k=i/view.trail.length;gl.lineStyle((p.kind==='sun'?6:4)*k,color,.55*k);gl.lineBetween(a.x,a.y,b.x,b.y);}}}
 for(const [id,v] of this.shotViews)if(!shotIds.has(id)){this.release(v.sprite);this.shotViews.delete(id);}
 // lightning, shockwaves, floating text, screen flash
 this.zaps=this.zaps.filter(z=>z.age<170);for(const z of this.zaps){z.age+=step;const a=1-z.age/170;for(let i=1;i<z.points.length;i++){const from=i===1?z.points[0]:{x:z.points[i-1].x,y:z.points[i-1].y-12},to={x:z.points[i].x,y:z.points[i].y-12},pts=[from];for(let k=1;k<6;k++){const f=k/6;pts.push({x:from.x+(to.x-from.x)*f+(Math.random()-.5)*14,y:from.y+(to.y-from.y)*f+(Math.random()-.5)*14});}pts.push(to);
  gl.lineStyle(7,0x9b6cff,.35*a);gl.strokePoints(pts);gl.lineStyle(2.5,0xf4ecff,a);gl.strokePoints(pts);}}
 this.rings=this.rings.filter(r=>r.age<r.life);for(const r of this.rings){r.age+=step;const k=r.age/r.life,e=1-(1-k)**3;g.lineStyle(r.width*(1-k)+.5,r.color,1-k);g.strokeCircle(r.x,r.y,4+r.radius*e);}
 this.floaters=this.floaters.filter(f=>{f.age+=step;if(f.age>=f.life){f.text.setVisible(false);return false;}const k=f.age/f.life,s=f.pop?Math.min(1,f.age/160)*(1+.25*Math.max(0,1-f.age/320)):1;f.text.setPosition(f.x,f.y-(reduced?0:f.rise*(1-(1-k)**2))).setAlpha(k>.7?(1-k)/.3:1).setScale(s);return true;});
 if(this.screenFlash.age<this.screenFlash.life){this.screenFlash.age+=step;const k=1-this.screenFlash.age/this.screenFlash.life;if(!reduced){g.fillStyle(this.screenFlash.color,this.screenFlash.alpha*k);g.fillRect(0,0,960,576);}}
 // boss health bar
 if(boss){const def=enemies[boss.kind],f=Math.max(0,boss.health/enemyHealth(this.state,boss.kind));g.fillStyle(0x1c1530,.88);g.fillRoundedRect(290,12,380,36,12);g.lineStyle(2,0xffd25e,.9);g.strokeRoundedRect(290,12,380,36,12);g.fillStyle(0x4a2a3a);g.fillRoundedRect(302,33,356,8,4);g.fillStyle(def.rage&&f<.5?0xff3a2a:0xff7a5c);g.fillRoundedRect(302,33,Math.max(4,356*f),8,4);g.fillStyle(0xffffff,.35);g.fillRoundedRect(302,33,Math.max(4,356*f),3,2);this.bossLabel.setText(`${def.name} · ${Math.ceil(boss.health)} HP`).setPosition(480,23).setVisible(true);}else this.bossLabel.setVisible(false);
 // placement preview, ability targeting, selection
 this.ghostBase.setVisible(false);this.ghostHead.setVisible(false);const live=this.ready&&['build','wave'].includes(this.state.phase);
 if(this.kind&&live&&inside){const p=center(hoverCell),result=getPlacementPreview(this.state,this.kind,hoverCell),color=result.ok?0xf7ffe0:0xff6b5a,range=towers[this.kind].levels[0].range;
  for(let x=0;x<20;x++)for(let y=0;y<12;y++)if(buildable({x,y},this.state.config.map)&&!this.state.towers.some(t=>t.cell.x===x&&t.cell.y===y)){gr.fillStyle(0xffffff,.07);gr.fillRoundedRect(x*48+4,y*48+4,40,40,8);}
  g.fillStyle(color,.1);g.fillCircle(p.x,p.y,range);g.lineStyle(2,color,.85);g.strokeCircle(p.x,p.y,range);g.lineStyle(3,color);g.strokeRoundedRect(hoverCell.x*48+3,hoverCell.y*48+3,42,42,9);
  this.ghostBase.setTexture('base-0').setPosition(p.x,p.y+6).setDisplaySize(52,52).setTint(result.ok?0xffffff:0xff9696).setVisible(true);this.ghostHead.setTexture(`${this.kind}-head-0`).setPosition(p.x,p.y-13).setDisplaySize(heads[this.kind],heads[this.kind]).setTint(result.ok?0xffffff:0xff9696).setVisible(true);
  $('hint').textContent=result.ok?'✓ Lovely spot! Tap to plant your tower.':`✕ ${reasons[result.reason]}`;}
 if(this.targeting==='bomb'&&inside&&live){const r=abilities.bomb.radius,pulse=reduced?0:Math.sin(now/120)*3;g.fillStyle(0xff5fa8,.14);g.fillCircle(pointer.x,pointer.y,r);g.lineStyle(3,0xff8fc0,.95);g.strokeCircle(pointer.x,pointer.y,r+pulse);g.lineBetween(pointer.x-14,pointer.y,pointer.x+14,pointer.y);g.lineBetween(pointer.x,pointer.y-14,pointer.x,pointer.y+14);}
 const hovered=!this.kind&&inside?this.state.towers.find(t=>t.cell.x===hoverCell.x&&t.cell.y===hoverCell.y&&t.id!==this.selected):undefined;
 if(hovered){const p=center(hovered.cell);g.lineStyle(1.5,0xffffff,.45);g.strokeCircle(p.x,p.y,towers[hovered.kind].levels[hovered.level].range);}
 const selected=this.state.towers.find(t=>t.id===this.selected);if(selected){const p=center(selected.cell),range=towers[selected.kind].levels[selected.level].range;g.fillStyle(0xfff5c7,.07);g.fillCircle(p.x,p.y,range);g.lineStyle(2,0xfff5c7,.8);const spin=reduced?0:now/1500;for(let i=0;i<24;i++){const a=spin+i*Math.PI/12;g.beginPath();g.arc(p.x,p.y,range,a,a+Math.PI/20);g.strokePath();}g.lineStyle(3,0xffe27a,.95);g.strokeEllipse(p.x,p.y+18,52,18);}
 }
}
