import type { Point } from '../core/types';
export const map = {width:960,height:576,cell:48,path:[{x:-24,y:168},{x:216,y:168},{x:216,y:408},{x:504,y:408},{x:504,y:168},{x:744,y:168},{x:744,y:456},{x:984,y:456}],reserved:['1,1','2,1','17,1','18,1','1,10','2,10','17,10','18,10']};
export const lengths = map.path.slice(1).map((p,i)=>Math.hypot(p.x-map.path[i].x,p.y-map.path[i].y));
export const routeLength = lengths.reduce((a,b)=>a+b,0);
export function position(progress:number):Point { let d=Math.max(0,progress); for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const a=map.path[i], b=map.path[i+1], t=d/lengths[i];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};} d-=lengths[i];} return {...map.path.at(-1)!}; }
export const center = (cell:Point):Point => ({x:cell.x*48+24,y:cell.y*48+24});
export const distance = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y);
export function buildable(cell:Point):boolean { const p=center(cell); if(map.reserved.includes(`${cell.x},${cell.y}`)) return false; return map.path.slice(1).every((b,i)=>{const a=map.path[i];const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/lengths[i]**2));return distance(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)})>=54;}); }
