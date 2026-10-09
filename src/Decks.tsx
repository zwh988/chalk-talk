import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import {shotStats,tally,ago,mastery,level,PC} from './practice';
import {ShotCard,title,Table} from './Shots';
import Practice,{Setup,unfinished} from './Practice';
import {ask,useBack,Sheet} from './ui';
const lc=(s:any)=>(s||'').toLowerCase();
// A deck's shots are resolved at read time: smart = tag/player rule over the whole library, custom = explicit shot ids. Nothing is copied or stored.
export const deckShots=(k:any,ss:any[])=>(k.kind==='custom'?ss.filter(s=>(k.shotIds||[]).includes(s.id)):ss.filter(s=>(!k.rule?.tag||lc(s.d.tag)===lc(k.rule.tag))&&(!k.rule?.by||s.d.by===k.rule.by))).sort((a,b)=>lc(a.d.tag).localeCompare(lc(b.d.tag))||a.d.no-b.d.no);
const sum=(k:any,nm:any)=>k.kind==='custom'?'Custom':k.rule?.tag||k.rule?.by?['Smart',k.rule.tag&&`tag ${k.rule.tag}`,k.rule.by&&`by ${nm(k.rule.by)}`].filter(Boolean).join(' · '):'Smart · all shots';
const Bars=({v,l}:any)=>{const W=300/v.length;return <svg viewBox="0 0 300 100" style={{width:'100%'}}>{v.map((x:number,i:number)=><g key={i}><rect x={i*W+6} y={80-x*.66} width={W-12} height={x*.66} rx="3" fill="var(--cloth)"/><text x={i*W+W/2} y="95" textAnchor="middle" fontSize="9" fill="var(--mute)">{l[i]}</text><text x={i*W+W/2} y={76-x*.66} textAnchor="middle" fontSize="9" fill="var(--ink)">{x}</text></g>)}</svg>};
const Hist=({xs,at,nm,del,edit,deck}:any)=><>{xs.map((x:any)=>{const t=tally(at.filter((a:any)=>a.d.s===x.id));return <div key={x.id} className="srow"><span>{new Date(x.d.start).toLocaleDateString()} · {nm(x.d.by)}{deck?` · ${x.d.deckName}`:''}{x.d.venue?` · ${x.d.venue}`:''} <span className="n">{t.made}/{t.n}</span></span><span className="row" style={{flexWrap:'nowrap'}}><button className="ghost" onClick={()=>edit(x)}>Edit</button><button className="ghost danger" onClick={async()=>{if(await ask('Delete this session and its attempts?'))del([x.id])}}>Delete</button></span></div>})}</>;
// Fix a wrongly logged practice session: player and venue live on the practice record AND the player on every attempt (stats key off attempt.by), so both are rewritten together.
function EditPractice({x,at,pl,vs,onDone}:any){
  const [by,setBy]=useState(x.d.by),[vid,setVid]=useState(x.d.venueId||''),mine=at.filter((a:any)=>a.d.s===x.id);
  return <Sheet onClose={onDone}><h2>Edit practice session</h2>
    <label>Player<select value={by} onChange={e=>setBy(e.target.value)}>{pl.filter((p:any)=>!p.d.archived||p.id===x.d.by).map((p:any)=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
    <label>Venue<select value={vid} onChange={e=>setVid(e.target.value)}><option value="">No venue</option>{vs.map((v:any)=><option key={v.id} value={v.id}>{v.d.name}</option>)}</select></label>
    {by!==x.d.by&&<div className="n">Moves all {mine.length} attempt{mine.length===1?'':'s'} in this session to the new player; both players' stats update.</div>}
    <div className="row" style={{marginTop:8}}><button className="ghost" onClick={onDone}>Cancel</button><button className="go sm" style={{flex:1}} onClick={async()=>{
      await save('practice',{...x.d,by,venueId:vid,venue:vid===x.d.venueId?x.d.venue:(vs.find((v:any)=>v.id===vid)?.d.name??'')},x.id);
      if(by!==x.d.by)for(const a of mine)await save('attempt',{...a.d,by},a.id);
      onDone()}}>Save</button></div></Sheet>;
}
const blank=()=>({name:'',kind:'smart',rule:{tag:'',by:''},shotIds:[] as string[],c:Date.now()});
function DeckEditor({init,ss,ps,onDone}:any){
  const [d,setD]=useState<any>(init.d),[tf,setTf]=useState('');
  useBack(true,onDone);
  const tags=[...new Set(ss.map((s:any)=>s.d.tag).filter(Boolean))].sort() as string[],rule=d.rule||{},ids:string[]=d.shotIds||[],sm=d.kind!=='custom';
  const ok=d.name.trim()&&(sm||ids.length),n=deckShots(d,ss).length;
  const tog=(id:string)=>setD({...d,shotIds:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]});
  const pick=ss.filter((s:any)=>!tf||s.d.tag===tf).sort((a:any,b:any)=>lc(a.d.tag).localeCompare(lc(b.d.tag))||a.d.no-b.d.no);
  return <><div className="hdr"><button className="back" onClick={onDone}>‹ Decks</button><b>{init.id?'Edit deck':'New deck'}</b></div>
    <div className="card"><label>Name<input value={d.name} onChange={e=>setD({...d,name:e.target.value})} placeholder="e.g. Spot shots"/></label>
      <div className="row" style={{margin:'10px 0'}}>{[['smart','Smart (by rule)'],['custom','Custom (pick shots)']].map(([k,l])=><button key={k} className={'chip'+(d.kind===k||(k==='smart'&&sm)?' on':'')} onClick={()=>setD({...d,kind:k})}>{l}</button>)}</div>
      {sm?<>
        <label>Tag<select value={rule.tag||''} onChange={e=>setD({...d,rule:{...rule,tag:e.target.value}})}><option value="">Any tag</option>{tags.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
        <label>Shot by<select value={rule.by||''} onChange={e=>setD({...d,rule:{...rule,by:e.target.value}})}><option value="">Anyone</option>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
        <div className="n">{n} shot{n===1?'':'s'} match now. New matching shots join automatically.{!rule.tag&&!rule.by&&' Any tag and anyone = the whole library.'}</div></>
      :<>
        <select value={tf} onChange={e=>setTf(e.target.value)} style={{marginBottom:10}}><option value="">All tags</option>{tags.map(t=><option key={t} value={t}>{t}</option>)}</select>
        {!pick.length&&<p className="n">No shots yet.</p>}
        {pick.map((s:any)=>{const on=ids.includes(s.id);return <button key={s.id} className={'chip'+(on?' on':'')} style={{width:'100%',textAlign:'left',marginBottom:6}} onClick={()=>tog(s.id)}>{on?'✓ ':'○ '}{title(s.d,ss,s.id)}</button>})}
        <div className="n">{ids.length} selected</div></>}
      <button className="go" style={{marginTop:12}} disabled={!ok} onClick={async()=>{await save('deck',{...d,name:d.name.trim(),kind:sm?'smart':'custom',rule:{tag:rule.tag||'',by:rule.by||''}},init.id);onDone()}}>Save deck</button></div></>;
}
export default function Decks({seg}:any){
  const ks=(useLiveQuery(()=>ofType('deck'),[])||[]).sort((a,b)=>(b.d.c??b.u)-(a.d.c??a.u)),ss=useLiveQuery(()=>ofType('shot'),[])||[],all=useLiveQuery(()=>ofType('player'),[])||[],ps=all.filter(p=>!p.d.archived);
  const [sel,setSel]=useState<string|null>(null),[ed,setEd]=useState<any>(null),[su,setSu]=useState<any>(null),[run,setRun]=useState<any>(null),pu=useLiveQuery(unfinished,[]),[pid,setPid]=useState(''),[ep,setEp]=useState<any>(null),vs=useLiveQuery(()=>ofType('venue'),[])||[],at=useLiveQuery(()=>db.recs.where('type').equals('attempt').filter(r=>!r.del).toArray(),[])||[],pss=useLiveQuery(()=>ofType('practice'),[])||[];
  useBack(!!sel,()=>setSel(null));
  const sus=su&&<Setup key={su.id} deck={su} pool={deckShots(su.d,ss)} onStart={(r:any)=>{setSu(null);setRun(r)}} onClose={()=>setSu(null)}/>,eps=ep&&<EditPractice key={ep.id} x={ep} at={at} pl={all} vs={vs} onDone={()=>setEp(null)}/>;
  const nm=(id:string)=>all.find(p=>p.id===id)?.d.name??'—',k=ks.find(x=>x.id===sel),delS=(xs:string[])=>Promise.all([...at.filter(a=>xs.includes(a.d.s)).map(a=>drop(a.id)),...xs.map(drop)]);
  if(ed)return <DeckEditor key={ed.id||'new'} init={ed} ss={ss} ps={ps} onDone={()=>setEd(null)}/>;
  if(run){const rk=ks.find(q=>q.id===run.pd.deck);return <Practice sid={run.sid} pd={run.pd} pool={rk?deckShots(rk.d,ss):[]} all={ss} onExit={()=>setRun(null)}/>}
  if(k){const sh=deckShots(k.d,ss),who=pid||ps[0]?.id||'',st=shotStats(at,who),mine=sh.filter(s=>st[s.id]),tot=mine.reduce((a,s)=>({n:a.n+st[s.id].n,m:a.m+st[s.id].made}),{n:0,m:0}),hist=pss.filter(x=>x.d.deck===k.id).sort((a,b)=>b.d.start-a.d.start);
    const need=mine.map(s=>({s,p:mastery(st[s.id])!})).filter(o=>o.p<PC.levels[1][0]).sort((a,b)=>a.p-b.p).slice(0,3),lastP=Math.max(0,...mine.map(s=>st[s.id].last)),ses=hist.filter(x=>x.d.by===who).sort((a,b)=>a.d.start-b.d.start).map(x=>({x,t:tally(at.filter(a=>a.d.s===x.id))})).filter(o=>o.t.n).slice(-8);return <><button className="back" onClick={()=>setSel(null)}>‹ Decks</button><h1>{k.d.name}</h1>
    <div className="n">{sum(k.d,nm)} · {sh.length} shot{sh.length===1?'':'s'} · created {new Date(k.d.c??k.u).toLocaleDateString()}</div>
    <button className="go" style={{margin:'10px 0'}} disabled={!sh.length} onClick={()=>setSu(k)}>Start practice</button>
    <div className="row" style={{marginBottom:10}}><button className="ghost" onClick={()=>setEd(k)}>Edit</button><button className="ghost danger" onClick={async()=>{if(await ask(`Delete deck "${k.d.name}"? The shots and practice history are kept.`,'Delete deck')){await drop(k.id);setSel(null)}}}>Delete</button></div>
    {!sh.length&&<p className="n">No shots in this deck yet.</p>}
    {ps.length>0&&<><select value={who} onChange={e=>setPid(e.target.value)} style={{marginBottom:6}}>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>
      <div className="n" style={{marginBottom:8}}>{tot.n?`${tot.n} attempts · ${Math.round(tot.m/tot.n*100)}% made · ${mine.length} of ${sh.length} shots practiced`:'No practice yet'}</div></>}
    {mine.length>0&&<div className="card"><h2>Progress · {nm(who)}</h2>
      {ses.length>1?<><Bars v={ses.map(o=>Math.round(o.t.rate*100))} l={ses.map(o=>{const d=new Date(o.x.d.start);return `${d.getMonth()+1}/${d.getDate()}`})}/><div className="n">Make % per session, last {ses.length}</div></>:<div className="n">Two or more sessions will show progress here.</div>}
      <div className="srow"><span>Last practiced</span><b>{ago(lastP)}</b></div><div className="srow"><span>Not practiced yet</span><b>{sh.length-mine.length}</b></div>
      {need.length>0&&<><div className="n" style={{marginTop:8}}>Needs attention</div>{need.map(o=><div key={o.s.id} className="srow"><span>{title(o.s.d,ss,o.s.id)}</span><span className="n">{level(o.p)} · recent {st[o.s.id].recent.made}/{st[o.s.id].recent.n}</span></div>)}</>}</div>}
    {sh.map(s=>{const x=st[s.id];return <ShotCard key={s.id} s={s} all={ss} nm={nm} sub={x?`${x.made}/${x.n} · ${Math.round(x.rate*100)}% · last ${ago(x.last)} · recent ${x.recent.made}/${x.recent.n}`:'Not practiced yet'}/>})}
    {hist.length>0&&<div className="card"><h2>Practice history</h2><Hist xs={hist} at={at} nm={nm} del={delS} edit={setEp}/>
      {hist.some(x=>x.d.by===who)&&<button className="ghost danger" style={{marginTop:8}} onClick={async()=>{if(await ask(`Delete all of ${nm(who)}'s practice sessions for this deck?`,'Reset history'))delS(hist.filter(x=>x.d.by===who).map(x=>x.id))}}>Reset {nm(who)}'s history for this deck</button>}</div>}{eps}{sus}</>}
  return <>{seg}<div className="hdr"><h1>Decks</h1><button className="go sm" onClick={()=>setEd({d:blank()})}>New deck</button></div>
    {pu&&(()=>{const x=pu.x,dk=ks.find(q=>q.id===x.d.deck);return <div className="card" style={{borderColor:'var(--amber)',borderWidth:2}}><b>Practice in progress</b><div className="n">{x.d.deckName} · {nm(x.d.by)} · {pu.n} attempt{pu.n===1?'':'s'} · started {ago(x.d.start)}{!dk&&' · deck deleted'}</div>
      <div className="row">{dk&&<button className="go sm" style={{flex:1}} onClick={()=>setRun({sid:x.id,pd:x.d})}>Resume</button>}{pu.n?<button className="ghost" onClick={async()=>{if(await ask(`End this practice? Its ${pu.n} attempt${pu.n===1?' is':'s are'} kept.`,'End practice',false))save('practice',{...x.d,end:Date.now()},x.id)}}>End practice</button>:<button className="ghost danger" onClick={()=>drop(x.id)}>Discard</button>}</div></div>})()}
    {!ks.length&&<p className="n">No decks yet. A smart deck follows a tag or player; a custom deck is hand-picked.</p>}
    {ks.map(x=>{const lp=Math.max(0,...pss.filter(q=>q.d.deck===x.id).map(q=>q.d.start)),sh=deckShots(x.d,ss),n=sh.length;return <div key={x.id} className="card"><button className="hist" onClick={()=>setSel(x.id)}><b>{x.d.name}</b><div className="n">{sum(x.d,nm)} · {n} shot{n===1?'':'s'}</div>{n>0&&<div className="dth">{sh.slice(0,4).map(s=><div key={s.id}><Table d={s.d} small/><div className="n">{title(s.d,ss,s.id)}</div></div>)}</div>}</button>
      <div className="row" style={{justifyContent:'space-between',flexWrap:'nowrap',marginTop:4}}><span className="n" style={{margin:0}}>{lp?`Last practiced ${ago(lp)}`:'Not practiced yet'}</span><button className="go sm" disabled={!n} onClick={()=>setSu(x)}>Start practice</button></div></div>})}
    {pss.some(x=>!ks.some(q=>q.id===x.d.deck))&&<div className="card"><h2>History from deleted decks</h2><Hist xs={pss.filter(x=>!ks.some(q=>q.id===x.d.deck)).sort((a,b)=>b.d.start-a.d.start)} at={at} nm={nm} del={delS} edit={setEp} deck/></div>}{eps}{sus}</>;
}
