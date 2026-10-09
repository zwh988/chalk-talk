import type {Rec} from './db';
import {walk,isMe} from './stats';
// Initiative model (STATS_CONTROL_SPEC.md; "control" was renamed "initiative", identifiers kept). Pure, derived from the same `groups` (one sorted event list per session) as playerStats.
// Every count is the list of records behind it (`.length` = the number), so drill-downs can never disagree with the numbers.
// Opponent-based blocks skip solo sessions; Scotch records (sp/bp) and push-out visits are never counted.
const CH=['Easy','Hard'],MISS=['Missed','Foul'],UF=['Pot','Position','Decision'],CAU=['Pot','Position','Decision','Other'];
const UK:Record<string,string>={Pot:'pot',Position:'pos',Decision:'dec'};
const L=():Rec[]=>[];
export function controlStats(pid:string,groups:Rec[][]){
  const c={
    m:0,                                              // number of match (non-solo) sessions seen; 0 = opponent blocks have no data
    ctl:{won:L(),kept:L(),gave:L(),pend:L()},         // 3.2: chance visits by outcome (resolved = won + kept (held the initiative) + gave (lost it))
    lost:{pot:L(),pos:L(),dec:L(),other:L(),hard:L(),safe:L()}, // 3.3: split of `gave`, exactly one reason each
    keptErr:L(),                                      // 3.3 footnote: Easy-open Pot/Position/Decision misses that did not cost the initiative
    safe:{easy:L(),hard:L(),cont:L(),esc:L(),miss:L(),foul:L(),pend:L()}, // 3.4: graded by the opponent's next visit
    esc:{made:L(),fail:L()},                          // 3.5: No-shot escape attempts
    hard:{made:L(),miss:L(),easy:L(),none:L(),pend:L(),cause:{Pot:L(),Position:L(),Decision:L(),Other:L()}}, // 3.6 (miss = 0 potted; easy/none/pend split the misses)
    fin:{                                             // 3.7 (solo included)
      len:[{n:L(),ro:L()},{n:L(),ro:L()},{n:L(),ro:L()}], // chance visits by balls on the table at the start: 6+, 3–5, 1–2 (n = attempts, ro = ran out); first visit after own break excluded
      bnr:{n:L(),ro:L()},                             // break records: n = own breaks (not skip/golden) with a following visit, ro = same player then ran out
      golden:L()},                                    // golden breaks (break records)
    rack:{brk:{n:L(),w:L()},rcv:{n:L(),w:L()}},       // 3.8: break records of completed racks as breaker / receiver (w = won by the player)
    ball:{made:0,pe:0,ok:0,pf:0},                     // rating only, solo included: per-ball counts over Easy-opening visits (made = balls potted minus flukes, pe = pot errors, ok/pf = position kept/failed)
    escA:{made:L(),fail:L()}                          // rating only: No-shot escape attempts, solo included (c.esc is matches only)
  };
  for(const evs of groups){
    const it=walk(evs),solo=evs.some(e=>(e.d.by||'').includes('~')),duo=evs.some(e=>e.d.sp||e.d.bp);
    if(!solo)c.m++;
    // Rack winner/breaker (3.8): matches only, Scotch sessions skipped as a whole (team seats are not individuals)
    if(!solo&&!duo){const R=new Map<any,any>();
      for(const x of it){const d=x.e.d,o=R.get(d.rack)||(R.set(d.rack,{}),R.get(d.rack));
        if(x.kind==='break'){if(!o.b)o.b=x.e;if(d.nine)o.w=d.by}else if(d.won)o.w=d.by}
      R.forEach(o=>{if(!o.b||o.w==null)return;const k=isMe(o.b.d.by,pid)?c.rack.brk:c.rack.rcv;k.n.push(o.b);if(isMe(o.w,pid))k.w.push(o.b)})}
    it.forEach((x:any,i:number)=>{const e:Rec=x.e,d=e.d;
      if(d.sp||d.bp)return;
      if(x.kind==='break'){
        if(!isMe(d.by,pid))return;
        if(d.nine){c.fin.golden.push(e);return}
        if(d.skip)return;
        const nx=it[i+1];if(!nx||nx.kind!=='visit'||nx.e.d.rack!==d.rack)return;   // pending / in progress
        c.fin.bnr.n.push(e);if(nx.e.d.by===d.by&&nx.e.d.won&&nx.e.d.runout)c.fin.bnr.ro.push(e);
        return}
      if(!isMe(d.by,pid)||d.push)return;
      // Next visit of the same rack (a different seat to count as resolved; same seat, e.g. after a pass, is unresolved)
      const nx=it.slice(i+1).find((y:any)=>y.kind==='visit'&&y.e.d.rack===d.rack),n=nx&&nx.e.d.by!==d.by?nx.e.d:null,no=n?.open;
      const chance=CH.includes(d.open),mf=MISS.includes(d.res);
      // Finishing: chance visits by starting table size; the first visit after the player's own (non-skipped) break is break-and-run territory, so left out
      const pv=it[i-1],afterOwn=pv&&pv.kind==='break'&&pv.e.d.rack===d.rack&&pv.e.d.by===d.by&&!pv.e.d.skip&&!pv.e.d.nine;
      if(chance&&!afterOwn){const g=c.fin.len[x.start.length>=6?0:x.start.length>=3?1:2];g.n.push(e);if(d.won&&d.runout)g.ro.push(e)}
      if(d.open==='Easy'){const m=Math.max(0,d.potted.length-(d.fl?.length||0)),pe=mf&&d.cause==='Pot'?1:0,b=c.ball;b.made+=m;b.pe+=pe;b.ok+=Math.max(0,m-1)+(m>0&&pe?1:0);b.pf+=mf&&d.cause==='Position'?1:0}
      if(d.open==='None'&&['Escape hit','Missed','Foul'].includes(d.res))(d.res==='Escape hit'?c.escA.made:c.escA.fail).push(e);
      if(solo)return;   // everything below needs an opponent
      if(chance){
        if(d.won)c.ctl.won.push(e);
        else if(!['Easy','Hard','None'].includes(no))c.ctl.pend.push(e);
        else if(no==='Easy'){c.ctl.gave.push(e);
          if(d.open==='Easy'&&mf)(c.lost as any)[UK[d.cause]||'other'].push(e);
          else if(d.open==='Hard'&&mf)c.lost.hard.push(e);
          else if(d.res==='Safe played')c.lost.safe.push(e);
          else c.lost.other.push(e)}
        else{c.ctl.kept.push(e);if(d.open==='Easy'&&mf&&UF.includes(d.cause))c.keptErr.push(e)}
      }
      if(d.res==='Safe played'){
        const s=c.safe;
        if(!n)s.pend.push(e);
        else if(no==='Easy'||n.won)s.easy.push(e);
        else if(no==='Hard')s.hard.push(e);
        else if(no==='None'){const r=n.res;if(r==='Safe played')s.cont.push(e);else if(r==='Escape hit')s.esc.push(e);else if(r==='Missed')s.miss.push(e);else if(r==='Foul')s.foul.push(e);else s.pend.push(e)}
        else s.pend.push(e)}
      if(d.open==='None'&&['Escape hit','Missed','Foul'].includes(d.res))(d.res==='Escape hit'?c.esc.made:c.esc.fail).push(e);
      if(d.open==='Hard'&&!['Safe played','Escape hit'].includes(d.res)){
        const h=c.hard;
        if(d.potted.length>=1)h.made.push(e);
        else{h.miss.push(e);h.cause[(CAU.includes(d.cause)?d.cause:'Other') as 'Pot'].push(e);
          if(no==='Easy')h.easy.push(e);else if(no==='Hard'||no==='None')h.none.push(e);else h.pend.push(e)}}
    });
  }
  return c;
}
