import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType} from './db';
import {playerStats,breakStats} from './stats';
import {attrs,rating,rankOf,progress,confidence,confLabel,ATTRS,PROV,CONF} from './rating';
import Avatar from './Avatar';
import {periods,ppDelta,N as PN} from './delta';
const pc=(w:number,n:number)=>n?Math.round(w/n*100):0;
// Change vs the previous 4 sessions. Arrow = direction the number moved; green = better, red = worse (`low` = lower is better).
const Dlt=({d,pp,low}:any)=>{if(d==null)return null;const r=pp?Math.round(d*10)/10:Math.round(d);if(!r)return <span className="n" style={{marginLeft:6}}>±0{pp?' pp':''}</span>;return <span style={{marginLeft:6,fontSize:13,fontWeight:700,whiteSpace:'nowrap',color:(low?r<0:r>0)?'var(--good)':'var(--bad)'}}>{r>0?'↑':'↓'}{pp?Math.abs(r).toFixed(1)+' pp':Math.abs(r)}</span>};
const Donut=({w,n,label,d,low}:any)=>{const p=n?w/n:0,r=34,c=2*Math.PI*r;return <div style={{textAlign:'center',opacity:n<5?.45:1}}><svg viewBox="0 0 90 90" width="96"><circle cx="45" cy="45" r={r} fill="none" stroke="var(--chip)" strokeWidth="11"/><circle cx="45" cy="45" r={r} fill="none" stroke="var(--cloth)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${p*c} ${c}`} transform="rotate(-90 45 45)"/><text x="45" y="50" textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--ink)">{n?Math.round(p*100)+'%':'—'}</text></svg><div className="n">{label}<br/>{w}/{n}{d!=null&&<><br/><Dlt d={d} pp low={low}/></>}</div></div>};
const HBar=({l,w,n,d,low}:any)=><div style={{opacity:n<5?.45:1,margin:'8px 0'}}><div className="srow" style={{border:0,padding:0}}><span>{l}</span><span><b>{n?pc(w,n)+'%':'—'}</b> <span className="n">{w}/{n}</span>{d!=null&&<Dlt d={d} pp low={low}/>}</span></div><div className="bar"><i style={{width:pc(w,n)+'%'}}/></div></div>;
const Cols=({vals,labels}:any)=>{const m=Math.max(1,...vals),W=300/vals.length;return <svg viewBox="0 0 300 112" style={{width:'100%',maxWidth:480,display:'block',margin:'auto'}}>{vals.map((v:number,i:number)=><g key={i}><rect x={i*W+6} y={84-v/m*66} width={W-12} height={v/m*66} rx="3" fill="var(--cloth)"/><text x={i*W+W/2} y="104" textAnchor="middle" fontSize="12" fill="var(--mute)">{labels[i]}</text>{v>0&&<text x={i*W+W/2} y={80-v/m*66} textAnchor="middle" fontSize="12" fill="var(--ink)">{v}</text>}</g>)}</svg>};
const pt=(i:number,v:number)=>{const a=(-90+60*i)*Math.PI/180,r=v/100*80;return [150+r*Math.cos(a),150+r*Math.sin(a)]};
const poly=(v:number[])=>v.map((x,i)=>pt(i,x).join(',')).join(' ');
const Radar=({a,b}:any)=><svg viewBox="0 0 300 300" style={{width:'100%',maxWidth:340,display:'block',margin:'auto'}}>{[33,66,100].map(k=><polygon key={k} points={poly(Array(6).fill(k))} fill="none" stroke="var(--line)"/>)}
  {ATTRS.map((n,i)=>{const [x,y]=pt(i,100),[lx,ly]=pt(i,122);return <g key={n}><line x1="150" y1="150" x2={x} y2={y} stroke="var(--line)"/><text x={lx} y={ly+4} textAnchor="middle" fontSize="13" fill="var(--mute)">{n}</text></g>})}
  {b&&<polygon points={poly(b)} fill="var(--amber)" fillOpacity=".12" stroke="var(--amber)" strokeWidth="2" strokeDasharray="5 4"/>}<polygon points={poly(a)} fill="var(--cloth)" fillOpacity=".3" stroke="var(--cloth)" strokeWidth="2.5"/></svg>;
const TRow=({l,g}:any)=><div className={'srow'+(g.n<5?' dim':'')}><span>{l}</span><span className="n">n={g.n} · 1-ball {pc(g.one,g.n)}% · droppers {g.n?(g.drops/g.n).toFixed(1):'—'} · scratch {pc(g.scr,g.n)}%</span></div>;
// Card title + scope (what data the card covers).
const CH=({t,sub}:any)=><div className="ch"><h2>{t}</h2>{sub&&<span className="n">{sub}</span>}</div>;
const Z=['L3','L2','L1','C','R1','R2','R3'],CC=['var(--cloth)','var(--amber)','#c4513d','#8aa3a5'];
export default function Stats({kind}:{kind:string}){
  const ps=(useLiveQuery(()=>ofType('player'),[])||[]).filter(p=>!p.d.archived);
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [pid,setPid]=useState(''),[win,setWin]=useState('4'),[cmp,setCmp]=useState(''),[typ,setTyp]=useState('all');
  if(!ps.length)return <p className="n">Add players and log a session first.</p>;
  const sel=pid||ps[0].id,me=ps.find(p=>p.id===sel);
  const gr=(id:string,dn?:boolean)=>ss.filter(s=>(typ==='all'||(typ==='solo')===!!s.d.solo)&&(!dn||s.d.end)&&s.d.players.includes(id)&&all.some(e=>e.d.s===s.id)).map(s=>all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)));
  const mine=gr(sel),groups=win==='all'?mine:mine.slice(0,4);
  // Scope labels: the rating always uses every session of the chosen type; the other cards follow the window.
  const wd=typ==='match'?'match':typ==='solo'?'solo session':'session',pl=(n:number)=>n+' '+wd+(n===1?'':typ==='match'?'es':'s'),rs='All '+pl(mine.length),ws=win==='all'?rs:groups.length===1?'Last '+wd:'Last '+pl(groups.length);
  const s=kind==='players'?playerStats(sel,groups):null,b=kind==='breaks'?breakStats(sel,groups):null;
  const ms=s?s.low.reduce((a:number,x:number)=>a+x,0):0;
  const cnt=(o:any)=>`Easy ${o.Easy} · Hard ${o.Hard} · No shot ${o.None}`;
  const at=attrs(sel,mine),R=rating(at),cf=confidence(at),pg=progress(R),ca=cmp?attrs(cmp,gr(cmp)):null;
  const cur=attrs(sel,mine.slice(0,4)),prev=attrs(sel,mine.slice(4,8));
  // Recent change: completed sessions only (newest first), latest 4 vs the 4 before; stats are recomputed over each combined period.
  const dn=gr(sel,true),per=periods(dn),sc=per&&s?playerStats(sel,per.cur):null,sp=per&&s?playerStats(sel,per.prev):null,bc=per&&b?breakStats(sel,per.cur):null,bp=per&&b?breakStats(sel,per.prev):null;
  const dR=(()=>{if(!per||!s)return null;const a=attrs(sel,per.cur),p=attrs(sel,per.prev),m=a.map((x,i)=>x.n>0&&p[i].n>0);return m.some(Boolean)?rating(a,m)-rating(p,m):null})(),dd=(c:any,p:any,f:(x:any)=>number[])=>c&&p?ppDelta(f(c),f(p)):null;
  // Rank is provisional until confidence reaches the top of the Medium band; "Work on" = lowest-scoring attribute with at least half its provisional sample (needs two to compare).
  const pv=cf<CONF[1][0],wk=(()=>{const c=at.map((x,i)=>({i,x})).filter(o=>o.x.n>=PROV[o.i]/2);return c.length>=2?c.reduce((a,o)=>o.x.adj<a.x.adj?o:a):null})(),cn=ps.find(p=>p.id===cmp)?.d.name;
  const tr=(i:number)=>prev[i].n>=PROV[i]/2&&cur[i].n>0?Math.round(cur[i].raw-prev[i].raw):null;
  return <>
    <div className="filt"><select aria-label="Player" value={sel} onChange={e=>setPid(e.target.value)}>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></div>
    <div className="filt"><select aria-label="Window" value={win} onChange={e=>setWin(e.target.value)}><option value="4">Last 4 sessions</option><option value="all">All time</option></select><select aria-label="Session type" value={typ} onChange={e=>setTyp(e.target.value)}><option value="all">All types</option><option value="match">Matches only</option><option value="solo">Solo only</option></select></div>
    <div className="n" style={{marginBottom:10}}>Faded = fewer than 5 observations{(s||b)&&<><br/>{per?'Arrows: latest 4 vs previous 4 completed sessions':`Trends unlock after ${2*PN} completed sessions (${2*PN-dn.length} more)`}</>}</div>
    {s&&<>
      <div className="card"><div className="row" style={{flexWrap:'nowrap',gap:14}}><Avatar p={me} size={64}/><div style={{flex:1,minWidth:0}}><div className="n">{me?.d.name} · {rs}</div><div style={{fontSize:30,fontWeight:800,lineHeight:1.1}}>{Math.round(R)}<Dlt d={dR}/></div>{pg.next?<div className="n">{pg.left} to {pg.next}</div>:<div className="n">Top rank</div>}<div className="n">Confidence: <b>{confLabel(cf)}</b> · {Math.round(cf*100)}% of needed data</div></div><div style={{textAlign:'center',flex:'none'}}>{pv?<div style={{fontSize:40,fontWeight:800,lineHeight:1.1,color:'transparent',WebkitTextStroke:'2px var(--mute)'}}>{rankOf(R)}</div>:<div style={{fontSize:46,fontWeight:900,color:'var(--cloth)'}}>{rankOf(R)}</div>}{pv&&<div className="n" style={{margin:0,fontWeight:700}}>Provisional</div>}</div></div>
        <div className="bar" style={{margin:'10px 0'}}><i style={{width:pg.pct*100+'%'}}/></div>
        {wk&&<div style={{marginBottom:10}}>Work on: <b>{ATTRS[wk.i]}</b> <span className="n">· {Math.round(wk.x.adj)} · n={wk.x.n}</span><div className="n" style={{margin:0}}>Lowest score among attributes with enough data.</div></div>}
        <select aria-label="Compare with" value={cmp} onChange={e=>setCmp(e.target.value)} style={{marginBottom:6}}><option value="">Compare with…</option>{ps.filter(p=>p.id!==sel).map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>
        {ca&&<div className="key"><span><i/>{me?.d.name}</span><span><i className="d"/>{cn}</span></div>}
        <Radar a={at.map(x=>x.adj)} b={ca?ca.map(x=>x.adj):null}/>
        {ATTRS.map((n,i)=><div key={n} style={{margin:'10px 0'}}><div className="srow" style={{border:0,padding:0}}><span>{n}<span className="n"> · n={at[i].n}</span>{at[i].prov&&<span className="n"> · provisional</span>}</span><span><b>{Math.round(at[i].adj)}</b> <span className="n">{tr(i)==null?'–':tr(i)!>0?'▲'+tr(i):tr(i)!<0?'▼'+Math.abs(tr(i)!):'–'}</span></span></div><div className="bar"><i style={{width:at[i].adj+'%'}}/></div></div>)}<div className="n">▲▼ = change vs the 4 sessions before · – = not enough data to compare</div></div>
      <div className="card"><CH t="Run-out from chance" sub={ws}/><div className="row" style={{justifyContent:'center'}}><Donut w={s.won} n={s.shot} label="all chances" d={dd(sc,sp,x=>[x.won,x.shot])}/></div>
        {['Easy/Clear','Easy/Problem','Hard/Clear','Hard/Problem'].map(k=>{const g=s.grid[k]||{n:0,w:0};return <HBar key={k} l={k.replace('/',' · ')} w={g.w} n={g.n} d={dd(sc,sp,x=>{const q=x.grid[k]||{n:0,w:0};return [q.w,q.n]})}/>})}</div>
      <div className="card"><CH t="Balls run" sub={ws}/><div className="row" style={{justifyContent:'center'}}><Donut w={s.potted} n={s.onTable} label="conversion" d={dd(sc,sp,x=>[x.potted,x.onTable])}/></div><div className="n" style={{textAlign:'center'}}>Balls potted per chance visit</div><Cols vals={s.dist} labels={['0','1–2','3–4','5+']}/></div>
      <div className="card"><CH t="Lowest ball left after a miss" sub={ws}/><div className={ms<5?'dim':''}><Cols vals={s.low.slice(1)} labels={[1,2,3,4,5,6,7,8,9]}/></div><div className="n" style={{textAlign:'center'}}>n={ms} misses · by ball number</div></div>
      <div className="card"><CH t="Miss and foul causes" sub={ws}/>{(()=>{const k=Object.keys(s.cause),t=k.reduce((a,x)=>a+s.cause[x],0);return t?<><div style={{display:'flex',height:16,borderRadius:8,overflow:'hidden'}}>{k.map((x,i)=><div key={x} style={{flex:s.cause[x],background:CC[i]}}/>)}</div><div className="row" style={{marginTop:8}}>{k.map((x,i)=><span key={x} className="n"><i style={{display:'inline-block',width:10,height:10,borderRadius:3,background:CC[i],marginRight:4}}/>{x} {s.cause[x]}</span>)}</div></>:<div className="n">No causes logged yet.</div>})()}</div>
      <div className="card"><CH t="Defence and discipline" sub={ws}/><HBar l="Safeties held" w={s.held} n={s.safe} d={dd(sc,sp,x=>[x.held,x.safe])}/>{s.pending>0&&<div className="n">{s.pending} pending the opponent's next visit</div>}
        <div className="row" style={{marginTop:8}}>{[['Escapes hit',s.escape],['Fouls',s.fouls],['Flukes',s.fluke],['Run-outs',s.runouts]].map(([l,v])=><div key={l as string} className="chip" style={{cursor:'default'}}><b style={{fontSize:20}}>{v}</b><small>{l}</small></div>)}</div></div>
      <div className="card"><CH t="Racks" sub={ws}/><div className="row" style={{justifyContent:'center'}}><Donut w={s.rackWins} n={s.racks} label="racks won" d={dd(sc,sp,x=>[x.rackWins,x.racks])}/></div></div></>}
    {b&&<>
      <div className="card"><CH t="Break summary" sub={ws}/><div className="row" style={{justifyContent:'space-around'}}><Donut w={b.one} n={b.n} label="1-ball pocketed" d={dd(bc,bp,x=>[x.one,x.n])}/><Donut w={b.scratch} n={b.n} label="scratch" low d={dd(bc,bp,x=>[x.scratch,x.n])}/><Donut w={b.golden} n={b.n} label="golden" d={dd(bc,bp,x=>[x.golden,x.n])}/></div><div className="n" style={{textAlign:'center',marginTop:6}}>{b.n} breaks · {b.n?(b.drops/b.n).toFixed(2):'—'} balls dropped each</div></div>
      <div className="card"><CH t="Opening shot after the break" sub={ws}/><div className="srow"><span>Breaker shot</span><span className="n">{cnt(b.open.brk)}</span></div><div className="srow"><span>Opponent shot</span><span className="n">{cnt(b.open.opp)}</span></div></div>
      <div className="card"><CH t="By position" sub={ws}/>{Z.map((l,i)=><TRow key={l} l={l} g={b.zone[i]}/>)}</div>
      <div className="card"><CH t="By contact" sub={ws}/>{Object.keys(b.con).sort().map(k=><TRow key={k} l={k} g={b.con[k]}/>)}{!Object.keys(b.con).length&&<div className="n">No breaks with contact logged yet.</div>}</div></>}
  </>;
}
