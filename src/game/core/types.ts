export type TowerKind = 'pea' | 'berry' | 'frost' | 'zap' | 'sun';
export type EnemyKind = 'wobbler' | 'dasher' | 'chunky' | 'bubble' | 'mender' | 'splitter' | 'jellet' | 'captain' | 'baron' | 'duchess' | 'king';
export type Targeting = 'first' | 'last' | 'strong' | 'close';
export type Ability = 'bomb' | 'chill';
export type Theme = 'meadow' | 'orchard' | 'canyon' | 'fjord' | 'volcano' | 'citadel' | 'lagoon' | 'grove' | 'dunes' | 'glacier' | 'astral';
export interface Point { x:number; y:number }
/** Per-level tower values. `splash` doubles as chain-jump radius for zap; `pierce` ignores that much armor. */
export interface Stats { damage:number; range:number; cooldown:number; speed:number; splash:number; slow:number; duration:number; cost:number; chain:number; pierce:number }
export interface TowerDefinition { name:string; role:string; cost:number; visual:string; color:number; targeting:Targeting; levels:Stats[] }
export interface EnemyDefinition { health:number; speed:number; bounty:number; leak:number; visual:string; size:number; name?:string; boss?:boolean; armor?:number; slowResistance?:number; rage?:number; summon?:number; shield?:number; heal?:{amount:number; radius:number; interval:number}; split?:{kind:EnemyKind; count:number} }
export interface Group { kind:EnemyKind; count:number; spacing:number; delay:number }
export interface Wave { name:string; bonus:number; groups:Group[] }
export interface Enemy { id:number; kind:EnemyKind; health:number; progress:number; slows:{amount:number; until:number}[]; lane?:number; shield?:number }
export interface Tower { id:number; kind:TowerKind; cell:Point; level:number; cooldown:number; targeting?:Targeting; spent?:number; kills?:number }
export interface Projectile extends Point { id:number; owner:number; kind:TowerKind; target:number; destination:Point; stats:Stats; life:number }
export type Phase = 'build'|'wave'|'paused'|'won'|'lost';
/** Every lane starts off the west edge and ends at the base; enemies alternate lanes as they spawn. */
export interface GameMap { width:number; height:number; cell:number; paths:Point[][]; reserved:string[]; visual:Theme }
export interface LevelDefinition { name:string; subtitle:string; difficulty:string; map:GameMap; waves:Wave[]; coins:number; lives:number; healthScale:number; speedScale:number }
export interface Config { waves:Wave[]; coins:number; lives:number; level:number; map:GameMap; healthScale:number; speedScale:number }
export interface GameState { config:Config; tick:number; waveTick:number; phase:Phase; previous:'build'|'wave'; coins:number; lives:number; wave:number; nextId:number; enemies:Enemy[]; towers:Tower[]; projectiles:Projectile[]; queue:{at:number;kind:EnemyKind}[]; bonus:number; spawned:number; abilities:Record<Ability,number>; kills:number }
export type Command = {type:'PlaceTower';kind:TowerKind;cell:Point}|{type:'UpgradeTower'|'SellTower';id:number}|{type:'SetTargeting';id:number;targeting:Targeting}|{type:'UseAbility';ability:Ability;at:Point}|{type:'StartWave'|'Pause'|'Resume'};
export type Reason = 'OCCUPIED'|'OUT_OF_BOUNDS'|'NOT_BUILDABLE'|'INSUFFICIENT_COINS'|'MAX_LEVEL'|'INVALID_PHASE'|'NOT_FOUND'|'COOLDOWN';
export type CommandResult = {ok:true;events:DomainEvent[]}|{ok:false;reason:Reason};
export interface DomainEvent extends Point { type:'spawn'|'shot'|'impact'|'damage'|'death'|'leak'|'upgrade'|'placed'|'sold'|'wave'|'complete'|'end'|'zap'|'heal'|'shield'|'ability'|'boss'|'early'; id?:number; amount?:number; kind?:TowerKind; enemy?:EnemyKind; ability?:Ability; points?:Point[]; level?:number }
