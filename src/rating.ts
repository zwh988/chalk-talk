import {walk,isMe} from './stats';
import type {Rec} from './db';
import {W,PROV,AN,RANKS,ATTRS} from './ratingConfig';
export {ATTRS,PROV};
const sc=(r:number,k:[number,number])=>Math.max(0,Math.min(100,(r-k[0])/(k[1]-k[0])*100));
const avg=(xs:(number|null)[])=>{const v=xs.filter((x):x is number=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
// Raw per-attribute scores (0-100) and sample sizes, straight from logged visits and breaks.
export function attrs(pid:string,groups:Rec[][]){
  const t={shot:0,won:0,potted:0,onTable:0,made:0,potFail:0,posOK:0,posFail:0,brk:0,brkOK:0,brkBalls:0,brkRun:0,brkScr:0,safe:0,held:0,escOK:0,escTry:0,visits:0,fouls:0,decision:0,noShot:0,noShotMiss:0};
  for(const evs of groups){const it=walk(evs);
    it.forEach((x:any,i:number)=>{const d=x.e.d;
      if(d.sp||d.bp)return;   // Scotch Doubles: not rated yet (no per-shot attribution in the rating)
      const next=()=>it.slice(i+1).find((y:any)=>y.kind==='visit'&&y.e.d.rack===d.rack);
      if(x.kind==='break'){if(!isMe(d.by,pid)||d.skip)return;
        const dr=d.drops.length+(d.one===0?1:0);t.brk++;t.brkBalls+=dr;if(d.scratch)t.brkScr++;if(!d.scratch&&(dr>0||d.nine))t.brkOK++;
        if(d.nine)t.brkRun++;else{const nx=next();if(nx&&nx.e.d.by===d.by&&nx.e.d.won)t.brkRun++}return}
      if(!isMe(d.by,pid)||d.push)return;
      t.visits++;if(d.res==='Foul')t.fouls++;if(d.cause==='Decision')t.decision++;
      const fail=d.res==='Missed'||d.res==='Foul',m=Math.max(0,d.potted.length-(d.fl?.length||0)),pf=fail&&d.cause==='Pot'?1:0;
      t.made+=m;t.potFail+=pf;t.posOK+=Math.max(0,m-1)+(m>0&&pf?1:0);t.posFail+=fail&&d.cause==='Position'?1:0;
      if(d.open==='None'){t.noShot++;if(d.res==='Missed')t.noShotMiss++;if(d.res==='Escape hit'){t.escOK++;t.escTry++}else if(fail)t.escTry++}
      if(d.res==='Safe played'){const nx=next();if(nx){t.safe++;if(['None','Hard'].includes(nx.e.d.open))t.held++}}
      if(['Easy','Hard'].includes(d.open)){t.shot++;if(d.won)t.won++;t.potted+=d.potted.length;t.onTable+=x.start.length}
    });
  }
  const A:{raw:number|null;n:number}[]=[
    {raw:t.shot?avg([sc(t.won/t.shot,AN.runout),t.onTable?sc(t.potted/t.onTable,AN.conv):null]):null,n:t.shot},
    {raw:t.made+t.potFail?sc(t.made/(t.made+t.potFail),AN.pot):null,n:t.made+t.potFail},
    {raw:t.posOK+t.posFail?sc(t.posOK/(t.posOK+t.posFail),AN.pos):null,n:t.posOK+t.posFail},
    {raw:t.brk?.3*sc(t.brkOK/t.brk,AN.brkOK)+.3*sc(t.brkBalls/t.brk,AN.brkBalls)+.3*sc(t.brkRun/t.brk,AN.brkRun)+.1*sc(1-t.brkScr/t.brk,AN.brkClean):null,n:t.brk},
    {raw:avg([t.safe?sc(t.held/t.safe,AN.held):null,t.escTry?sc(t.escOK/t.escTry,AN.esc):null]),n:t.safe+t.escTry},
    {raw:t.visits?avg([sc(t.fouls/t.visits,AN.foul),sc(t.decision/t.visits,AN.decision),t.noShot?sc(t.noShotMiss/t.noShot,AN.scrap):null]):null,n:t.visits}];
  // No shrinkage toward 50: `adj` is the raw score (50 only as a placeholder when an attribute has no data). How much to trust it is `conf`, not a pull to average.
  return A.map((a,i)=>{const raw=a.raw??50;return {raw,n:a.n,adj:raw,prov:a.n<PROV[i],conf:Math.min(1,a.n/PROV[i])}});
}
// Rating = weighted mean of the attributes that have data (weights renormalised over those), ×10. No data at all = 500.
// `only` limits it to chosen attributes, so two periods can be compared like for like.
export const rating=(a:{adj:number;n:number}[],only?:boolean[])=>{let s=0,w=0;a.forEach((x,i)=>{if(x.n>0&&(!only||only[i])){s+=x.adj*W[i];w+=W[i]}});return w?s/w*10:500};
// Confidence (0–1): how much of the evidence the rating needs has been logged = importance-weighted share of each attribute's provisional sample size (PROV), capped at 1.
export const confidence=(a:{conf:number}[])=>a.reduce((s,x,i)=>s+W[i]*x.conf,0)/W.reduce((s:number,x:number)=>s+x,0);
// Labels for the confidence score. Lives here because ratingConfig.ts wasn't to hand; move it there with the other tunables.
export const CONF:[number,string][]=[[.4,'Low'],[.75,'Medium'],[1.01,'High']];
export const confLabel=(c:number)=>CONF.find(l=>c<l[0])![1];
export const rankIx=(r:number)=>RANKS.reduce((b,[,f],i)=>r>=f?i:b,0);
export const rankOf=(r:number)=>RANKS[rankIx(r)][0];
export const progress=(r:number)=>{const i=rankIx(r),lo=RANKS[i][1],nx=RANKS[i+1];return nx?{next:nx[0],left:Math.ceil(nx[1]-r),pct:(r-lo)/(nx[1]-lo)}:{next:null,left:0,pct:1}};
