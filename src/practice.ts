// Practice helpers. All selection logic lives here: tune PC or replace weigh/pickNext without touching the data model.
export const blocks=(at:any[])=>{const o:string[]=[];at.forEach(a=>{if(o[o.length-1]!==a.d.shot)o.push(a.d.shot)});return o};
export const RECENT=10;
// Per-player stats for each shot, derived from raw attempts on every call (never stored). Keyed by shot id.
export const shotStats=(at:any[],by:string)=>{const g:Record<string,any[]>={};
  at.filter(a=>a.d.by===by).sort((a,b)=>a.d.t-b.d.t).forEach(a=>(g[a.d.shot]=g[a.d.shot]||[]).push(a));
  const o:Record<string,any>={};for(const id in g){const l=g[id],r=l.slice(-RECENT),n=l.length,made=l.filter(a=>a.d.ok).length;o[id]={n,made,miss:n-made,rate:made/n,last:l[n-1].d.t,recent:{n:r.length,made:r.filter(a=>a.d.ok).length}}}return o};
export const ago=(t:number)=>{const d=Math.floor((Date.now()-t)/864e5);return d<1?'today':d===1?'yesterday':`${d}d ago`};
export const tally=(at:any[])=>{const n=at.length,made=at.filter(a=>a.d.ok).length;return {n,made,rate:n?made/n:0}};
// Adaptive selection tunables. Weight = (floor + need + staleness) × cooldown, need = 1 − mastery.
export const PC={prior:{n:4,rate:.5},floor:.15,newW:.9,coolH:4,coolMin:.25,staleD:14,staleMax:.3,
  levels:[[.35,'Needs work'],[.6,'Developing'],[.8,'Solid'],[1.01,'Mastered']] as [number,string][]};
// Mastery is derived per player + shot from the last RECENT attempts, smoothed toward 50% so a few attempts never swing it to 0 or 100.
export const mastery=(st:any):number|null=>st?(st.recent.made+PC.prior.n*PC.prior.rate)/(st.recent.n+PC.prior.n):null;
export const level=(p:number|null)=>p==null?'New':PC.levels.find(l=>p<l[0])![1];
export function weigh(st:any,now:number){
  if(!st)return {w:PC.newW,why:['New shot, not practiced yet']};
  const p=mastery(st)!,lv=level(p),h=(now-st.last)/36e5,d=h/24,cd=PC.coolMin+(1-PC.coolMin)*Math.min(1,h/PC.coolH),stale=Math.min(1,d/PC.staleD)*PC.staleMax;
  const why=[lv==='Mastered'?'Mastered, back as a refresher':lv==='Solid'?'Solid, coming up for a check':'Needs more reps'];if(d>=7)why.push(`last practiced ${Math.floor(d)} days ago`);
  return {w:(PC.floor+(1-p)+stale)*cd,why};
}
// Weighted random draw from the deck; never the same shot twice in a row. Returns the pick, its reasons and its chance.
export function pickNext(ids:string[],drawn:string[],stats:Record<string,any>,now=Date.now()){
  if(!ids.length)return {id:'',why:[] as string[],share:0};
  const last=drawn[drawn.length-1],pool=ids.length>1?ids.filter(i=>i!==last):ids,ws=pool.map(id=>({id,...weigh(stats[id],now)})),sum=ws.reduce((a,x)=>a+x.w,0);
  let r=Math.random()*sum,x=ws[ws.length-1];for(const c of ws){r-=c.w;if(r<=0){x=c;break}}
  return {id:x.id,why:x.why,share:x.w/sum};
}
