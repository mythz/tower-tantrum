import type { GameMap, Point } from '../core/types';
export const map:GameMap = {visual:'meadow',width:960,height:576,cell:48,paths:[[{x:-24,y:168},{x:216,y:168},{x:216,y:408},{x:504,y:408},{x:504,y:168},{x:744,y:168},{x:744,y:456},{x:984,y:456}]],reserved:['1,1','2,1','17,1','18,1','1,10','2,10','17,10','18,10','7,0','8,0','12,0','11,10','12,10','13,10','11,11','12,11','13,11']};
export const distance = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y);
const cache=new WeakMap<Point[],number[]>();
/** Segment lengths are cached per lane array, since enemy positions are sampled thousands of times a second. */
export const segments = (path:Point[]) => {let v=cache.get(path);if(!v){v=path.slice(1).map((p,i)=>distance(p,path[i]));cache.set(path,v);}return v;};
export const lane = (route:GameMap,index=0) => route.paths[index%route.paths.length];
export const segmentLengths = (route:GameMap,index=0) => segments(lane(route,index));
export const lengthOf = (route:GameMap,index=0) => segmentLengths(route,index).reduce((a,b)=>a+b,0);
export const routeLength = lengthOf(map);
export function position(progress:number,route:GameMap=map,index=0):Point { const path=lane(route,index),lengths=segments(path); let d=Math.max(0,progress); for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const a=path[i], b=path[i+1], t=d/lengths[i];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};} d-=lengths[i];} return {...path.at(-1)!}; }
export const center = (cell:Point):Point => ({x:cell.x*48+24,y:cell.y*48+24});
/** Shortest distance from a point to any lane of the route. */
export function pathDistance(p:Point,route:GameMap):number { let best=Infinity; for(const path of route.paths){const lengths=segments(path);for(let i=0;i<lengths.length;i++){const a=path[i],b=path[i+1];const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/lengths[i]**2));best=Math.min(best,distance(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)}));}} return best; }
export function buildable(cell:Point,route:GameMap=map):boolean { if(cell.x<0||cell.y<0||cell.x>=20||cell.y>=12||route.reserved.includes(`${cell.x},${cell.y}`)) return false; return pathDistance(center(cell),route)>=40; }
