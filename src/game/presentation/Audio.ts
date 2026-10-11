import { sounds } from '../assets/manifest';
export interface Settings {version:1;volume:number;mute:boolean;reducedMotion:boolean}
export class AudioController {
 settings:Settings={version:1,volume:.5,mute:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
 private music=new Audio(sounds.music);private active:HTMLAudioElement[]=[];private last=new Map<string,number>();
 constructor(){try{const s:unknown=JSON.parse(localStorage.getItem('tantrum-settings')??'null');if(s&&typeof s==='object'&&'version'in s&&s.version===1&&'volume'in s&&typeof s.volume==='number'&&Number.isFinite(s.volume)&&'mute'in s&&typeof s.mute==='boolean'&&'reducedMotion'in s&&typeof s.reducedMotion==='boolean')this.settings={version:1,volume:Math.max(0,Math.min(1,s.volume)),mute:s.mute,reducedMotion:s.reducedMotion};}catch{console.info('Sound settings unavailable; using defaults.');}this.music.loop=true;this.sync();}
 sync(){this.music.volume=this.settings.volume*.35;this.music.muted=this.settings.mute;for(const a of this.active){a.volume=this.settings.volume;a.muted=this.settings.mute;}try{localStorage.setItem('tantrum-settings',JSON.stringify(this.settings));}catch{console.info('Settings could not be persisted.');}}
 unlock(){if(!this.settings.mute)void this.music.play().catch(()=>console.info('Audio unavailable; continuing silently.'));}
 /** Plays a cue with slight pitch variation so rapid repeats feel less mechanical. */
 play(key:string,volume=1,vary=.08){if(this.settings.mute||!sounds[key])return;const now=performance.now();if(now-(this.last.get(key)??-1000)<70)return;this.last.set(key,now);this.active=this.active.filter(a=>!a.ended&&!a.paused);if(this.active.length>=12)return;const a=new Audio(sounds[key]);a.volume=this.settings.volume*volume;a.preservesPitch=false;a.playbackRate=1+(Math.random()*2-1)*vary;this.active.push(a);void a.play().catch(()=>console.info(`Optional sound unavailable: ${key}`));}
 stopMusic(){this.music.pause();}
 pause(){this.stopMusic();for(const a of this.active)a.pause();this.active=[];}
}
