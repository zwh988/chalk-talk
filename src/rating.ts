import {walk,isMe} from './stats';
import {controlStats} from './control';
import type {Rec} from './db';
import {W,PROV,AN,RO,MINB,RANKS,ATTRS,CONF} from './ratingConfig';
export {ATTRS,PROV,CONF};
const sc=(r:number,k:[number,number])=>Math.max(0,Math.min(100,(r-k[0])/(k[1]-k[0])*100));
const avg=(xs:(number|null)[])=>{const v=xs.filter((x):x is number=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
// Raw per-attribute scores (0-100) and sample sizes. Everything except Break comes from controlStats (control.ts), so the page and the rating share one per-visit classification.
// Definitions: RATING_AND_INITIATIVE_UPDATE.md B2. Every rate is a clean/success rate (higher = better).
export function attrs(pid:string,groups:Rec[][]){
  const c=controlStats(pid,groups),L=(x:any[])=>x.length;
  // Finishing: run-out rate per start-length bucket (6+, 3–5, 1–2), each scored on its own; buckets under MINB chances are left out
  const fb=c.fin.len.map((g,i)=>L(g.n)>=MINB?{n:L(g.n),s:sc(L(g.ro)/L(g.n),RO[i])}:null).filter(Boolean) as {n:number;s:number}[];
  // Defence: forced-error rate and safe rate over resolved safeties (matches only), escape success (matches + solo)
  const sf=c.safe,rs=L(sf.easy)+L(sf.hard)+L(sf.cont)+L(sf.esc)+L(sf.miss)+L(sf.foul),fe=L(sf.esc)+L(sf.miss)+L(sf.foul),et=L(c.escA.made)+L(c.escA.fail);
  // Decision: every Easy-opening Decision error (cost the initiative or not) + gambles lost, per resolved chance (matches only)
  const rc=L(c.ctl.won)+L(c.ctl.kept)+L(c.ctl.gave),de=L(c.lost.dec)+c.keptErr.filter(e=>e.d.cause==='Decision').length+L(c.lost.hard);
  // Break: unchanged formula (any rack win on the breaker's next visit counts as break-and-run until the Break rework)
  const t={brk:0,brkOK:0,brkBalls:0,brkRun:0,brkScr:0};
  for(const evs of groups){const it=walk(evs);
    it.forEach((x:any,i:number)=>{const d=x.e.d;
      if(d.sp||d.bp||x.kind!=='break'||!isMe(d.by,pid)||d.skip)return;
      const dr=d.drops.length+(d.one===0?1:0);t.brk++;t.brkBalls+=dr;if(d.scratch)t.brkScr++;if(!d.scratch&&(dr>0||d.nine))t.brkOK++;
      if(d.nine)t.brkRun++;else{const nx=it.slice(i+1).find((y:any)=>y.kind==='visit'&&y.e.d.rack===d.rack);if(nx&&nx.e.d.by===d.by&&nx.e.d.won)t.brkRun++}});
  }
  const b=c.ball,A:{raw:number|null;n:number}[]=[
    {raw:fb.length?fb.reduce((a,x)=>a+x.s,0)/fb.length:null,n:fb.reduce((a,x)=>a+x.n,0)},
    {raw:b.made+b.pe?sc(b.made/(b.made+b.pe),AN.pot):null,n:b.made+b.pe},
    {raw:b.ok+b.pf?sc(b.ok/(b.ok+b.pf),AN.pos):null,n:b.ok+b.pf},
    {raw:t.brk?.3*sc(t.brkOK/t.brk,AN.brkOK)+.3*sc(t.brkBalls/t.brk,AN.brkBalls)+.3*sc(t.brkRun/t.brk,AN.brkRun)+.1*sc(1-t.brkScr/t.brk,AN.brkClean):null,n:t.brk},
    {raw:avg([rs?sc(fe/rs,AN.forced):null,rs?sc(1-L(sf.easy)/rs,AN.safe):null,et?sc(L(c.escA.made)/et,AN.esc):null]),n:rs+et},
    {raw:rc?sc(1-de/rc,AN.dec):null,n:rc}];
  // No shrinkage toward 50: `adj` is the raw score (50 only as a placeholder when an attribute has no data). How much to trust it is `conf`, not a pull to average.
  return A.map((a,i)=>{const raw=a.raw??50;return {raw,n:a.n,adj:raw,prov:a.n<PROV[i],conf:Math.min(1,a.n/PROV[i])}});
}
// Rating = weighted mean of the attributes that have data (weights renormalised over those), ×10. No data at all = 500.
// `only` limits it to chosen attributes, so two periods can be compared like for like.
export const rating=(a:{adj:number;n:number}[],only?:boolean[])=>{let s=0,w=0;a.forEach((x,i)=>{if(x.n>0&&(!only||only[i])){s+=x.adj*W[i];w+=W[i]}});return w?s/w*10:500};
// Confidence (0–1): how much of the evidence the rating needs has been logged = importance-weighted share of each attribute's provisional sample size (PROV), capped at 1.
export const confidence=(a:{conf:number}[])=>a.reduce((s,x,i)=>s+W[i]*x.conf,0)/W.reduce((s:number,x:number)=>s+x,0);
export const confLabel=(c:number)=>CONF.find(l=>c<l[0])![1];
export const rankIx=(r:number)=>RANKS.reduce((b,[,f],i)=>r>=f?i:b,0);
export const rankOf=(r:number)=>RANKS[rankIx(r)][0];
export const progress=(r:number)=>{const i=rankIx(r),lo=RANKS[i][1],nx=RANKS[i+1];return nx?{next:nx[0],left:Math.ceil(nx[1]-r),pct:(r-lo)/(nx[1]-lo)}:{next:null,left:0,pct:1}};
