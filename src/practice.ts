// Practice helpers. Selection lives here only: replace pickNext (Phase 6) without touching the data model.
export const blocks=(at:any[])=>{const o:string[]=[];at.forEach(a=>{if(o[o.length-1]!==a.d.shot)o.push(a.d.shot)});return o};
// Shuffle-bag: every shot once per pass in random order, never the same shot twice in a row.
export const pickNext=(ids:string[],drawn:string[])=>{
  if(!ids.length)return '';
  let seen=new Set<string>();for(const d of drawn){seen.add(d);if(ids.every(i=>seen.has(i)))seen=new Set()}
  let c=ids.filter(i=>!seen.has(i));if(!c.length)c=ids;
  const nl=c.filter(i=>i!==drawn[drawn.length-1]),p=nl.length?nl:c;return p[Math.floor(Math.random()*p.length)];
};
export const RECENT=10;
// Per-player stats for each shot, derived from raw attempts on every call (never stored). Keyed by shot id.
export const shotStats=(at:any[],by:string)=>{const g:Record<string,any[]>={};
  at.filter(a=>a.d.by===by).sort((a,b)=>a.d.t-b.d.t).forEach(a=>(g[a.d.shot]=g[a.d.shot]||[]).push(a));
  const o:Record<string,any>={};for(const id in g){const l=g[id],r=l.slice(-RECENT),n=l.length,made=l.filter(a=>a.d.ok).length;o[id]={n,made,miss:n-made,rate:made/n,last:l[n-1].d.t,recent:{n:r.length,made:r.filter(a=>a.d.ok).length}}}return o};
export const ago=(t:number)=>{const d=Math.floor((Date.now()-t)/864e5);return d<1?'today':d===1?'yesterday':`${d}d ago`};
export const tally=(at:any[])=>{const n=at.length,made=at.filter(a=>a.d.ok).length;return {n,made,rate:n?made/n:0}};
