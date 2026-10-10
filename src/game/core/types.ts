export type TowerKind = 'pea' | 'berry' | 'frost';
export type EnemyKind = 'wobbler' | 'dasher' | 'chunky' | 'captain';
export interface Point { x:number; y:number }
export interface Stats { damage:number; range:number; cooldown:number; speed:number; splash:number; slow:number; duration:number; cost:number }
export interface TowerDefinition { name:string; role:string; cost:number; visual:string; levels:Stats[] }
export interface EnemyDefinition { health:number; speed:number; bounty:number; leak:number; visual:string }
export interface Wave { name:string; bonus:number; groups:{kind:EnemyKind; count:number; spacing:number; delay:number}[] }
export interface Enemy { id:number; kind:EnemyKind; health:number; progress:number; slows:{amount:number; until:number}[] }
export interface Tower { id:number; kind:TowerKind; cell:Point; level:number; cooldown:number }
export interface Projectile extends Point { id:number; owner:number; kind:TowerKind; target:number; destination:Point; stats:Stats; life:number }
export type Phase = 'build'|'wave'|'paused'|'won'|'lost';
export interface Config { waves:Wave[]; coins:number; lives:number }
export interface GameState { config:Config; tick:number; waveTick:number; phase:Phase; previous:'build'|'wave'; coins:number; lives:number; wave:number; nextId:number; enemies:Enemy[]; towers:Tower[]; projectiles:Projectile[]; queue:{at:number;kind:EnemyKind}[] }
export type Command = {type:'PlaceTower';kind:TowerKind;cell:Point}|{type:'UpgradeTower';id:number}|{type:'StartWave'|'Pause'|'Resume'};
export type Reason = 'OCCUPIED'|'OUT_OF_BOUNDS'|'NOT_BUILDABLE'|'INSUFFICIENT_COINS'|'MAX_LEVEL'|'INVALID_PHASE'|'NOT_FOUND';
export type CommandResult = {ok:true;events:DomainEvent[]}|{ok:false;reason:Reason};
export interface DomainEvent extends Point { type:'spawn'|'shot'|'impact'|'damage'|'death'|'leak'|'upgrade'|'placed'|'wave'|'complete'|'end'; id?:number; amount?:number; kind?:TowerKind }
