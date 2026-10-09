import {useState,useRef} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import {Table,Tip,POW,pw,title,measure,tipLabel,dm} from './Shots';
import {ask,useBack,Sheet} from './ui';
import {blocks,pickNext,tally,shotStats,mastery,level} from './practice';
// practice {deck,deckName,by,venueId,venue,per,start,end?} · attempt {t,s(practice id),shot(id),by,n(1..per),ok}. Attempts are append-only; undo soft-deletes the last one.
// The unfinished run to offer for resume: latest practice without `end`; empty ones older than a day are ignored (abandoned Start taps). → {x:record,n:attempts} | null
export const unfinished=()=>ofType('practice').then((r:any[])=>{const ps=r.filter(x=>!x.d.end).sort((a,b)=>b.d.start-a.d.start);if(!ps.length)return null as any;const ids=new Set(ps.map(x=>x.id));return db.recs.where('type').equals('attempt').filter(a=>!a.del&&ids.has(a.d.s)).toArray().then(att=>{for(const x of ps){const n=att.filter(a=>a.d.s===x.id).length;if(n||Date.now()-x.d.start<864e5)return {x,n}}return null as any})});
function Run({sid,pd,pool,all,pname,onExit,again}:any){
  const hist=useLiveQuery(()=>db.recs.where('type').equals('attempt').filter(r=>!r.del&&r.d.by===pd.by).toArray(),[pd.by]);
  const [fin,setFin]=useState(false),[odds,setOdds]=useState(false),lock=useRef(-1),pend=useRef<any>({k:-1,id:''}),leaveRef=useRef<()=>any>();
  useBack(true,()=>leaveRef.current?.());
  if(!hist)return null;
  const at=hist.filter((a:any)=>a.d.s===sid).sort((a:any,b:any)=>a.d.t-b.d.t),stats=shotStats(hist,pd.by);
  const per=pd.per,last=at[at.length-1]?.d.shot;let run=0;for(let i=at.length-1;i>=0&&at[i].d.shot===last;i--)run++;
  const mid=!!at.length&&run<per;
  if(!mid&&pend.current.k!==at.length)pend.current={k:at.length,...pickNext(pool.map((s:any)=>s.id),blocks(at),stats)};
  const cur=mid?last:pend.current.id,n=mid?run+1:1,s=pool.find((x:any)=>x.id===cur),t=tally(at),st=stats[cur],mp=mastery(st),why=pend.current.id===cur?pend.current:null;
  const gl:{id:string;r:boolean[]}[]=[];at.forEach((a:any)=>{const g=gl[gl.length-1];if(g&&g.id===a.d.shot)g.r.push(a.d.ok);else gl.push({id:a.d.shot,r:[a.d.ok]})});
  const go=async(ok:boolean)=>{if(lock.current===at.length)return;lock.current=at.length;await save('attempt',{t:Date.now(),s:sid,shot:cur,by:pd.by,n,ok})};
  const undo=()=>{lock.current=-1;const a=at[at.length-1];a&&drop(a.id)};
  const end=async()=>{if(at.length){await save('practice',{...pd,end:Date.now()},sid);setFin(true)}else{await drop(sid);onExit()}};
  // Back: on the summary just leave; mid-run end the session (attempts are kept) after a confirm; an empty run is dropped by end().
  leaveRef.current=async()=>{if(fin){onExit();return}if(at.length&&!await ask('End this practice session? Your attempts so far are kept.','End practice',false))return false;await end()};
  if(fin){const ids=[...new Set(at.map((a:any)=>a.d.shot))] as string[];return <><h1>Practice done</h1>
    <div className="card"><div className="n">{pname(pd.by)} · {pd.venue||'No venue'} · {pd.deckName}</div><div style={{fontSize:30,fontWeight:800}}>{t.made}/{t.n} <span className="n">{Math.round(t.rate*100)}%</span></div></div>
    {ids.map(id=>{const x=tally(at.filter((a:any)=>a.d.shot===id)),sh=all.find((q:any)=>q.id===id);return <div key={id} className="srow"><span>{sh?title(sh.d,all,id):'Deleted shot'}</span><span><b>{x.made}/{x.n}</b></span></div>})}
    <div className="row" style={{marginTop:12}}><button className="ghost" onClick={onExit}>Done</button><button className="go sm" style={{flex:1}} onClick={again}>Practice again</button></div></>}
  return <><div className="hdr"><b>{pd.deckName}</b><button className="ghost" onClick={()=>leaveRef.current?.()}>End practice</button></div>
    <div className="n">{pname(pd.by)} · {pd.venue||'No venue'} · {t.made}/{t.n} made</div>
    {!s?<div className="card"><p className="n">No shot available. End the practice or add shots to the deck.</p><button className="ghost" disabled={!at.length} onClick={undo}>Undo last attempt</button></div>:<>
      {(()=>{const m=measure(s.d),w=pw(s.d);return <div className="card"><h2>{title(s.d,all,s.id)}</h2>
        <div className="srow" style={{border:0,padding:0}}><span><b>{level(mp)}</b> <span className="n">for {pname(pd.by)}</span></span><span className="n">{st?`recent ${st.recent.made}/${st.recent.n} · all ${st.made}/${st.n}`:'no history'}</span></div><div className="bar" style={{margin:'4px 0'}}><i style={{width:Math.round((mp??.5)*100)+'%'}}/></div>
        {why&&<button className="hist" aria-expanded={odds} style={{fontSize:'var(--fs-s)',color:'var(--mute)',margin:'6px 0 8px'}} onClick={()=>setOdds(!odds)}>Why now: {why.why.join(' · ')} · {odds?`${Math.round(why.share*100)}% chance of this pick`:'ⓘ'}</button>}<Table d={s.d}/>
        <div className="row" style={{flexWrap:'nowrap',gap:12,alignItems:'flex-start',marginTop:10}}>
          <div style={{width:104,flex:'none',pointerEvents:'none'}}><Tip tip={s.d.tip} set={()=>{}} size={104}/><div className="n" style={{textAlign:'center'}}>{tipLabel(s.d.tip)}</div></div>
          <div style={{flex:1,minWidth:0}}><div className="srow"><span>Power</span><b>{POW[w]}</b></div><div className="bar"><i style={{width:(w+1)/7*100+'%'}}/></div>
            {m&&<><div className="srow"><span>Cut angle</span><b>{Math.round(m.cut)}°</b></div><div className="srow"><span>Cue → contact</span><b>{dm(m.cue)}◇</b></div><div className="srow"><span>Object → pocket</span><b>{dm(m.obj)}◇</b></div>
              {m.after>0&&<div className="srow"><span>Cue after contact</span><b>{dm(m.after)}◇{m.rails>0?` · ${m.rails} rail${m.rails>1?'s':''}`:''}</b></div>}</>}</div></div>
        {s.d.note&&<div className="n" style={{marginTop:8}}>{s.d.note}</div>}</div>})()}
      </>}
    {at.length>0&&<div style={{marginTop:14}}><div className="lbl">This session · ✓ made · ✗ missed</div><div style={{maxHeight:200,overflowY:'auto'}}>{[...gl].reverse().map((g,i)=>{const sh=all.find((q:any)=>q.id===g.id);return <div key={i} className="srow"><span>{sh?title(sh.d,all,g.id):'Deleted shot'}</span><span>{g.r.map((ok:boolean,j:number)=><span key={j} title={ok?'Made':'Missed'} style={{color:ok?'var(--good)':'var(--bad)',marginRight:2}}>{ok?'✓':'✗'}</span>)} <span className="n">{g.r.filter(Boolean).length}/{g.r.length}</span></span></div>})}</div></div>}
    {s&&<div className="stick" style={{borderRadius:0}}><div className="n" style={{textAlign:'center',margin:'0 0 6px'}}>Attempt {n} of {per}{mid&&<> · {at.slice(-run).map((a:any)=>a.d.ok?'●':'○').join(' ')}</>}</div>
      <div className="pbar"><button className="u" aria-label="Undo last attempt" disabled={!at.length} onClick={undo}>↶<small>Undo</small></button><button className="mk y" onClick={()=>go(true)}>✓ Made</button><button className="mk m" onClick={()=>go(false)}>✗ Missed</button></div></div>}</>;
}
// Setup sheet: defaults (player, venue, attempts/shot) come from the latest practice record; `o` holds only what the user changed. Nothing stored.
export function Setup({deck,pool,onStart,onClose}:any){
  const ps=(useLiveQuery(()=>ofType('player'),[])||[]).filter((p:any)=>!p.d.archived),vs=useLiveQuery(()=>ofType('venue'),[])||[],last=[...(useLiveQuery(()=>ofType('practice'),[])||[])].sort((a:any,b:any)=>b.d.start-a.d.start)[0];
  const [o,setO]=useState<any>({}),[bz,setBz]=useState(false);
  const df:any={p:ps.find((x:any)=>x.id===last?.d.by)?.id||ps[0]?.id||'',v:vs.find((x:any)=>x.id===last?.d.venueId)?.id||'',per:last?.d.per||3},g=(k:string)=>k in o?o[k]:df[k],set=(k:string,x:any)=>setO((q:any)=>({...q,[k]:x})),pid=g('p'),v=g('v'),per=g('per');
  return <Sheet onClose={onClose}><h2>Practice · {deck.d.name}</h2>
    {!ps.length?<><p className="n">Add a player first (More → Players).</p><button className="ghost" onClick={onClose}>Close</button></>:<><div className="n">{pool.length} shot{pool.length===1?'':'s'} in this deck</div>
      <label>Player<select value={pid} onChange={e=>set('p',e.target.value)}>{ps.map((x:any)=><option key={x.id} value={x.id}>{x.d.name}</option>)}</select></label>
      <label>Venue<select value={v} onChange={e=>set('v',e.target.value)}><option value="">No venue</option>{vs.map((x:any)=><option key={x.id} value={x.id}>{x.d.name}</option>)}</select></label>
      <label>Attempts per shot<select value={per} onChange={e=>set('per',+e.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <div className="row" style={{marginTop:8}}><button className="ghost" onClick={onClose}>Cancel</button><button className="go sm" style={{flex:1}} disabled={!pool.length||!pid||bz} onClick={async()=>{setBz(true);const pd={deck:deck.id,deckName:deck.d.name,by:pid,venueId:v,venue:vs.find((x:any)=>x.id===v)?.d.name??'',per,start:Date.now()};onStart({pd,sid:await save('practice',pd)})}}>Start practice</button></div></>}</Sheet>;
}
// Run wrapper: owns the current {sid,pd} so "Practice again" can start a fresh record with the same player/venue/per (Run is keyed by sid, so it resets).
export default function Practice({sid,pd,pool,all,onExit}:any){
  const pl=useLiveQuery(()=>ofType('player'),[])||[],[cur,setCur]=useState({sid,pd}),pname=(id:string)=>pl.find((x:any)=>x.id===id)?.d.name??'—';
  const again=async()=>{const p={...cur.pd,start:Date.now()};setCur({pd:p,sid:await save('practice',p)})};
  return <Run key={cur.sid} sid={cur.sid} pd={cur.pd} pool={pool} all={all} pname={pname} onExit={onExit} again={again}/>;
}
