// Practice helpers. Selection lives here only: replace pickNext (Phase 6) without touching the data model.
export const blocks=(at:any[])=>{const o:string[]=[];at.forEach(a=>{if(o[o.length-1]!==a.d.shot)o.push(a.d.shot)});return o};
// Shuffle-bag: every shot once per pass in random order, never the same shot twice in a row.
export const pickNext=(ids:string[],drawn:string[])=>{
  if(!ids.length)return '';
  let seen=new Set<string>();for(const d of drawn){seen.add(d);if(ids.every(i=>seen.has(i)))seen=new Set()}
  let c=ids.filter(i=>!seen.has(i));if(!c.length)c=ids;
  const nl=c.filter(i=>i!==drawn[drawn.length-1]),p=nl.length?nl:c;return p[Math.floor(Math.random()*p.length)];
};
export const tally=(at:any[])=>{const n=at.length,made=at.filter(a=>a.d.ok).length;return {n,made,rate:n?made/n:0}};
