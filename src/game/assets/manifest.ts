const base=import.meta.env.BASE_URL+'assets/';
const kinds=['pea','berry','frost','zap','sun'];
export const images=Object.fromEntries([...kinds,...kinds.flatMap(k=>[0,1,2].map(l=>`${k}-head-${l}`)),'base-0','base-1','base-2','wobbler','dasher','chunky','bubble','mender','splitter','jellet','captain','baron','duchess','king','shot-pea','shot-berry','shot-frost','shot-sun','icon-bomb','icon-chill','coin'].map(k=>[k,base+k+'.svg']));
export const sounds=Object.fromEntries(['placed','shot-pea','shot-berry','shot-frost','shot-zap','shot-sun','impact','boom','pop','coin','upgrade','sold','wave','boss','leak','win','lose','ability-bomb','ability-chill','heal','shield','combo','music'].map(k=>[k,base+k+'.wav']));
