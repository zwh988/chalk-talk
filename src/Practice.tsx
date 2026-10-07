import {useState,useRef} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import {Table,Tip,POW,pw,title,measure,tipLabel,dm} from './Shots';
import {blocks,pickNext,tally,shotStats,mastery,level} from './practice';
// practice {deck,deckName,by,venueId,venue,per,start,end?} · attempt {t,s(practice id),shot(id),by,n(1..per),ok}. Attempts are append-only; undo soft-deletes the last one.
function Run({sid,pd,pool,all,pname,onExit}:any){
  const hist=useLiveQuery(()=>db.recs.where('type').equals('attempt').filter(r=>!r.del&&r.d.by===pd.by).toArray(),[pd.by]);
  const [fin,setFin]=useState(false),lock=useRef(-1),pend=useRef<any>({k:-1,id:''});
  if(!hist)return null;
  const at=hist.filter((a:any)=>a.d.s===sid).sort((a:any,b:any)=>a.d.t-b.d.t),stats=shotStats(hist,pd.by);
  const per=pd.per,last=at[at.length-1]?.d.shot;let run=0;for(let i=at.length-1;i>=0&&at[i].d.shot===last;i--)run++;
  const mid=!!at.length&&run<per;
  if(!mid&&pend.current.k!==at.length)pend.current={k:at.length,...pickNext(pool.map((s:any)=>s.id),blocks(at),stats)};
  const cur=mid?last:pend.current.id,n=mid?run+1:1,s=pool.find((x:any)=>x.id===cur),t=tally(at),st=stats[cur],mp=mastery(st),why=pend.current.id===cur?pend.current:null;
  const go=async(ok:boolean)=>{if(lock.current===at.length)return;lock.current=at.length;await save('attempt',{t:Date.now(),s:sid,shot:cur,by:pd.by,n,ok})};
  const undo=()=>{lock.current=-1;const a=at[at.length-1];a&&drop(a.id)};
  const end=async()=>{if(at.length){await save('practice',{...pd,end:Date.now()},sid);setFin(true)}else{await drop(sid);onExit()}};
  if(fin){const ids=[...new Set(at.map((a:any)=>a.d.shot))] as string[];return <><h1>Session done</h1>
    <div className="card"><div className="n">{pname(pd.by)} · {pd.venue||'No venue'} · {pd.deckName}</div><div style={{fontSize:30,fontWeight:800}}>{t.made}/{t.n} <span className="n">{Math.round(t.rate*100)}%</span></div></div>
    {ids.map(id=>{const x=tally(at.filter((a:any)=>a.d.shot===id)),sh=all.find((q:any)=>q.id===id);return <div key={id} className="srow"><span>{sh?title(sh.d,all,id):'Deleted shot'}</span><span><b>{x.made}/{x.n}</b></span></div>})}
    <button className="go" style={{marginTop:12}} onClick={onExit}>Done</button></>}
  return <><div className="hdr"><b>{pd.deckName}</b><button className="ghost" onClick={end}>End session</button></div>
    <div className="n">{pname(pd.by)} · {pd.venue||'No venue'} · {t.made}/{t.n} made</div>
    {!s?<div className="card"><p className="n">No shot available. End the session or add shots to the deck.</p></div>:<>
      {(()=>{const m=measure(s.d),w=pw(s.d);return <div className="card"><h2>{title(s.d,all,s.id)}</h2>
        <div className="srow" style={{border:0,padding:0}}><span><b>{level(mp)}</b> <span className="n">for {pname(pd.by)}</span></span><span className="n">{st?`recent ${st.recent.made}/${st.recent.n} · all ${st.made}/${st.n}`:'no history'}</span></div><div className="bar" style={{margin:'4px 0'}}><i style={{width:Math.round((mp??.5)*100)+'%'}}/></div>
        {why&&<div className="n" style={{marginBottom:8}}>Why now: {why.why.join(' · ')} · {Math.round(why.share*100)}% chance of this pick</div>}<Table d={s.d}/>
        <div className="row" style={{flexWrap:'nowrap',gap:12,alignItems:'flex-start',marginTop:10}}>
          <div style={{width:104,flex:'none',pointerEvents:'none'}}><Tip tip={s.d.tip} set={()=>{}} size={104}/><div className="n" style={{textAlign:'center'}}>{tipLabel(s.d.tip)}</div></div>
          <div style={{flex:1,minWidth:0}}><div className="srow"><span>Power</span><b>{POW[w]}</b></div><div className="bar"><i style={{width:(w+1)/7*100+'%'}}/></div>
            {m&&<><div className="srow"><span>Cut angle</span><b>{Math.round(m.cut)}°</b></div><div className="srow"><span>Cue → contact</span><b>{dm(m.cue)}◇</b></div><div className="srow"><span>Object → pocket</span><b>{dm(m.obj)}◇</b></div>
              {m.after>0&&<div className="srow"><span>Cue after contact</span><b>{dm(m.after)}◇{m.rails>0?` · ${m.rails} rail${m.rails>1?'s':''}`:''}</b></div>}</>}</div></div>
        {s.d.note&&<div className="n" style={{marginTop:8}}>{s.d.note}</div>}</div>})()}
      <div className="n" style={{textAlign:'center',margin:'8px 0'}}>Attempt {n} of {per}{mid&&<> · {at.slice(-run).map((a:any)=>a.d.ok?'●':'○').join(' ')}</>}</div>
      <div className="row" style={{gap:10,flexWrap:'nowrap'}}><button className="go" style={{flex:1,minHeight:64,fontSize:20}} onClick={()=>go(true)}>Made</button><button className="ghost" style={{flex:1,minHeight:64,fontSize:20}} onClick={()=>go(false)}>Missed</button></div></>}
    <button className="ghost" style={{marginTop:12}} disabled={!at.length} onClick={undo}>Undo last attempt</button></>;
}
export default function Practice({deck,pool,all,onExit}:any){
  const pl=useLiveQuery(()=>ofType('player'),[])||[],ps=pl.filter(p=>!p.d.archived),vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const [p,setP]=useState(''),[v,setV]=useState(''),[per,setPer]=useState(3),[run,setRun]=useState<any>(null);
  const pname=(id:string)=>pl.find(x=>x.id===id)?.d.name??'—',pid=p||ps[0]?.id||'';
  if(run)return <Run sid={run.sid} pd={run.pd} pool={pool} all={all} pname={pname} onExit={onExit}/>;
  return <><button className="back" onClick={onExit}>‹ {deck.d.name}</button><h1>Practice</h1>
    {!ps.length?<p className="n">Add a player first (More → Players).</p>:<div className="card"><div className="n">{pool.length} shot{pool.length===1?'':'s'} in this deck</div>
      <label>Player<select value={pid} onChange={e=>setP(e.target.value)}>{ps.map(x=><option key={x.id} value={x.id}>{x.d.name}</option>)}</select></label>
      <label>Venue<select value={v} onChange={e=>setV(e.target.value)}><option value="">No venue</option>{vs.map(x=><option key={x.id} value={x.id}>{x.d.name}</option>)}</select></label>
      <label>Attempts per shot<select value={per} onChange={e=>setPer(+e.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <button className="go" disabled={!pool.length} onClick={async()=>{const pd={deck:deck.id,deckName:deck.d.name,by:pid,venueId:v,venue:vs.find(x=>x.id===v)?.d.name??'',per,start:Date.now()};setRun({pd,sid:await save('practice',pd)})}}>Start practice</button></div>}</>;
}
