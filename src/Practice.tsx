import {useState,useRef} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import {Table,POW,pw,title} from './Shots';
import {blocks,pickNext,tally} from './practice';
// practice {deck,deckName,by,venueId,venue,per,start,end?} · attempt {t,s(practice id),shot(id),by,n(1..per),ok}. Attempts are append-only; undo soft-deletes the last one.
function Run({sid,pd,pool,all,pname,onExit}:any){
  const at=(useLiveQuery(()=>db.recs.where('type').equals('attempt').filter(r=>!r.del&&r.d.s===sid).toArray(),[sid])||[]).sort((a:any,b:any)=>a.d.t-b.d.t);
  const [fin,setFin]=useState(false),lock=useRef(-1),pend=useRef<any>({k:-1,id:''});
  const per=pd.per,last=at[at.length-1]?.d.shot;let run=0;for(let i=at.length-1;i>=0&&at[i].d.shot===last;i--)run++;
  const mid=!!at.length&&run<per;
  if(!mid&&pend.current.k!==at.length)pend.current={k:at.length,id:pickNext(pool.map((s:any)=>s.id),blocks(at))};
  const cur=mid?last:pend.current.id,n=mid?run+1:1,s=pool.find((x:any)=>x.id===cur),t=tally(at);
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
      <div className="card"><h2>{title(s.d,all,s.id)}</h2><Table d={s.d} small/><div className="n">Power: {POW[pw(s.d)]}{s.d.note?` · ${s.d.note}`:''}</div></div>
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
