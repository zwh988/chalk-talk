import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import {shotStats,tally,ago} from './practice';
import {ShotCard,title} from './Shots';
import Practice from './Practice';
const lc=(s:any)=>(s||'').toLowerCase();
// A deck's shots are resolved at read time: smart = tag/player rule over the whole library, custom = explicit shot ids. Nothing is copied or stored.
export const deckShots=(k:any,ss:any[])=>(k.kind==='custom'?ss.filter(s=>(k.shotIds||[]).includes(s.id)):ss.filter(s=>(!k.rule?.tag||lc(s.d.tag)===lc(k.rule.tag))&&(!k.rule?.by||s.d.by===k.rule.by))).sort((a,b)=>lc(a.d.tag).localeCompare(lc(b.d.tag))||a.d.no-b.d.no);
const sum=(k:any,nm:any)=>k.kind==='custom'?'Custom':k.rule?.tag||k.rule?.by?['Smart',k.rule.tag&&`tag ${k.rule.tag}`,k.rule.by&&`by ${nm(k.rule.by)}`].filter(Boolean).join(' · '):'Smart · all shots';
const blank=()=>({name:'',kind:'smart',rule:{tag:'',by:''},shotIds:[] as string[],c:Date.now()});
function DeckEditor({init,ss,ps,onDone}:any){
  const [d,setD]=useState<any>(init.d),[tf,setTf]=useState('');
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
  const [sel,setSel]=useState<string|null>(null),[ed,setEd]=useState<any>(null),[pr,setPr]=useState<any>(null),[pid,setPid]=useState(''),at=useLiveQuery(()=>db.recs.where('type').equals('attempt').filter(r=>!r.del).toArray(),[])||[],pss=useLiveQuery(()=>ofType('practice'),[])||[];
  const nm=(id:string)=>all.find(p=>p.id===id)?.d.name??'—',k=ks.find(x=>x.id===sel);
  if(ed)return <DeckEditor key={ed.id||'new'} init={ed} ss={ss} ps={ps} onDone={()=>setEd(null)}/>;
  if(pr)return <Practice deck={pr} pool={deckShots(pr.d,ss)} all={ss} onExit={()=>setPr(null)}/>;
  if(k){const sh=deckShots(k.d,ss),who=pid||ps[0]?.id||'',st=shotStats(at,who),mine=sh.filter(s=>st[s.id]),tot=mine.reduce((a,s)=>({n:a.n+st[s.id].n,m:a.m+st[s.id].made}),{n:0,m:0}),hist=pss.filter(x=>x.d.deck===k.id).sort((a,b)=>b.d.start-a.d.start);
    const delS=(xs:string[])=>Promise.all([...at.filter(a=>xs.includes(a.d.s)).map(a=>drop(a.id)),...xs.map(drop)]);return <><button className="back" onClick={()=>setSel(null)}>‹ Decks</button><h1>{k.d.name}</h1>
    <div className="n">{sum(k.d,nm)} · {sh.length} shot{sh.length===1?'':'s'} · created {new Date(k.d.c??k.u).toLocaleDateString()}</div>
    <button className="go" style={{margin:'10px 0'}} disabled={!sh.length} onClick={()=>setPr(k)}>Start practice</button>
    <div className="row" style={{marginBottom:10}}><button className="ghost" onClick={()=>setEd(k)}>Edit</button><button className="ghost" onClick={()=>confirm(`Delete deck "${k.d.name}"? The shots and practice history are kept.`)&&drop(k.id).then(()=>setSel(null))}>Delete</button></div>
    {!sh.length&&<p className="n">No shots in this deck yet.</p>}
    {ps.length>0&&<><select value={who} onChange={e=>setPid(e.target.value)} style={{marginBottom:6}}>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>
      <div className="n" style={{marginBottom:8}}>{tot.n?`${tot.n} attempts · ${Math.round(tot.m/tot.n*100)}% made · ${mine.length} of ${sh.length} shots practiced`:'No practice yet'}</div></>}
    {sh.map(s=>{const x=st[s.id];return <ShotCard key={s.id} s={s} all={ss} nm={nm} sub={x?`${x.made}/${x.n} · ${Math.round(x.rate*100)}% · last ${ago(x.last)} · recent ${x.recent.made}/${x.recent.n}`:'Not practiced yet'}/>})}
    {hist.length>0&&<div className="card"><h2>Practice history</h2>{hist.map(x=>{const t=tally(at.filter(a=>a.d.s===x.id));return <div key={x.id} className="srow"><span>{new Date(x.d.start).toLocaleDateString()} · {nm(x.d.by)}{x.d.venue?` · ${x.d.venue}`:''} <span className="n">{t.made}/{t.n}</span></span><button className="ghost" onClick={()=>confirm('Delete this session and its attempts?')&&delS([x.id])}>Delete</button></div>})}
      {hist.some(x=>x.d.by===who)&&<button className="ghost" style={{marginTop:8}} onClick={()=>confirm(`Delete all of ${nm(who)}'s practice sessions for this deck?`)&&delS(hist.filter(x=>x.d.by===who).map(x=>x.id))}>Reset {nm(who)}'s history for this deck</button>}</div>}</>}
  return <>{seg}<div className="hdr"><h1>Decks</h1><button className="go sm" onClick={()=>setEd({d:blank()})}>New deck</button></div>
    {!ks.length&&<p className="n">No decks yet. A smart deck follows a tag or player; a custom deck is hand-picked.</p>}
    {ks.map(x=><button key={x.id} className="card" style={{width:'100%',textAlign:'left'}} onClick={()=>setSel(x.id)}><b>{x.d.name}</b><div className="n">{sum(x.d,nm)} · {deckShots(x.d,ss).length} shots</div></button>)}</>;
}
