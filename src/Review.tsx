import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType} from './db';
import {playerStats,breakStats} from './stats';
const pc=(w:number,n:number)=>n?Math.round(w/n*100)+'%':'—';
const Row=({l,w,n,raw}:any)=><div className={'srow'+(raw==null&&n<5?' dim':'')}><span>{l}</span><span><b>{raw??pc(w,n)}</b>{raw==null&&<span className="n"> {w}/{n}</span>}</span></div>;
const TRow=({l,g}:any)=><div className={'srow'+(g.n<5?' dim':'')}><span>{l}</span><span className="n">n={g.n} · 1-ball {pc(g.one,g.n)} · droppers {g.n?(g.drops/g.n).toFixed(1):'—'} · scratch {pc(g.scr,g.n)}</span></div>;
const Z=['L3','L2','L1','C','R1','R2','R3'];
export default function Stats({kind}:{kind:string}){
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [pid,setPid]=useState(''),[win,setWin]=useState('4');
  const sel=pid||ps[0]?.id;
  const mine=ss.filter(s=>s.d.players.includes(sel)&&all.some(e=>e.d.s===s.id));
  const use=win==='all'?mine:mine.slice(0,4);
  const groups=use.map(s=>all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)));
  if(!ps.length)return <p className="n">Add players and log a session first.</p>;
  const s=kind==='players'?playerStats(sel,groups):null,b=kind==='breaks'?breakStats(sel,groups):null;
  const cnt=(o:any)=>`Easy ${o.Easy} · Hard ${o.Hard} · No shot ${o.None}`;
  return <>
    <div className="row" style={{marginBottom:8}}>{ps.filter(p=>!p.d.archived).map(p=><button key={p.id} className={'chip'+(sel===p.id?' on':'')} onClick={()=>setPid(p.id)}>{p.d.name}</button>)}</div>
    <div className="row" style={{marginBottom:6}}>{[['4','Last 4 sessions'],['all','All time']].map(([k,l])=><button key={k} className={'chip'+(win===k?' on':'')} onClick={()=>setWin(k)}>{l}</button>)}</div>
    <div className="n" style={{marginBottom:10}}>{use.length} session{use.length===1?'':'s'} · greyed rows have fewer than 5 observations</div>
    {s&&<>
      <div className="card"><h2>Run-out from chance</h2><Row l="All chances (Easy or Hard)" w={s.won} n={s.shot}/>
        {['Easy/Clear','Easy/Problem','Hard/Clear','Hard/Problem'].map(k=>{const g=s.grid[k]||{n:0,w:0};return <Row key={k} l={k.replace('/',' · ')} w={g.w} n={g.n}/>})}</div>
      <div className="card"><h2>Balls run</h2><Row l="Conversion (potted ÷ on table)" w={s.potted} n={s.onTable}/>
        {['0 balls','1–2 balls','3–4 balls','5+ balls'].map((l,i)=><Row key={l} l={l} w={s.dist[i]} n={s.shot}/>)}</div>
      <div className="card"><h2>Where visits end (misses)</h2>{[1,2,3,4,5,6,7,8,9].map(i=>{const m=Math.max(1,...s.low);return <div className="srow" key={i}><span>Ball {i}</span><span style={{flex:1,margin:'0 10px'}}><div className="bar"><i style={{width:(s.low[i]/m*100)+'%'}}/></div></span><b>{s.low[i]}</b></div>})}</div>
      <div className="card"><h2>Miss and foul causes</h2>{Object.keys(s.cause).map(k=><Row key={k} l={k} raw={s.cause[k]}/>)}</div>
      <div className="card"><h2>Defence and discipline</h2><Row l="Safeties held" w={s.held} n={s.safe}/>{s.pending>0&&<div className="n">{s.pending} safe{s.pending>1?'s':''} pending the opponent's next visit</div>}
        <Row l="Escapes hit" raw={s.escape}/><Row l="Fouls" raw={s.fouls}/><Row l="Flukes" raw={s.fluke}/></div>
      <div className="card"><h2>Racks</h2><Row l="Racks won" w={s.rackWins} n={s.racks}/><Row l="Run-outs" raw={s.runouts}/></div></>}
    {b&&<>
      <div className="card"><h2>Break summary</h2><Row l="Breaks logged" raw={b.n}/><Row l="1-ball pocketed" w={b.one} n={b.n}/><Row l="Scratch" w={b.scratch} n={b.n}/><Row l="Golden break" w={b.golden} n={b.n}/><Row l="Avg other droppers" raw={b.n?(b.drops/b.n).toFixed(2):'—'}/></div>
      <div className="card"><h2>Opening shot after the break</h2><div className="srow"><span>Breaker shot</span><span className="n">{cnt(b.open.brk)}</span></div><div className="srow"><span>Opponent shot</span><span className="n">{cnt(b.open.opp)}</span></div></div>
      <div className="card"><h2>By position</h2>{Z.map((l,i)=><TRow key={l} l={l} g={b.zone[i]}/>)}</div>
      <div className="card"><h2>By contact</h2>{Object.keys(b.con).sort().map(k=><TRow key={k} l={k} g={b.con[k]}/>)}{!Object.keys(b.con).length&&<div className="n">No breaks with contact logged yet.</div>}</div></>}
  </>;
}
