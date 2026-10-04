import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import Venues from './Venues';
import Shots from './Shots';
import Live from './Live';
import Settings from './Settings';
import History from './History';
import {getCfg,setCfg,sync} from './sync';
const COLORS=['#14575a','#e8a33d','#c4513d','#5b3a8c','#1f4fa3','#2f8f5b'];
type Tab='play'|'review'|'shots'|'more';
const LABEL:Record<Tab,string>={play:'Play',review:'Review',shots:'Shots',more:'More'};
export default function App(){
  const [tab,setTab]=useState<Tab>('play');
  return <div className="app"><main>{tab==='play'?<Session/>:tab==='review'?<Review/>:tab==='shots'?<Shots/>:<More/>}</main>
    <nav><b className="brand">Chalk Talk</b>{(Object.keys(LABEL) as Tab[]).map(t=><button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{LABEL[t]}</button>)}</nav></div>;
}
function Seg({items,cur,set}:any){return <div className="row" style={{marginBottom:12}}>{items.map(([k,l]:string[])=><button key={k} className={'chip'+(cur===k?' on':'')} onClick={()=>set(k)}>{l}</button>)}</div>}
function Review(){const [v,setV]=useState('sessions');return <><Seg items={[['sessions','Sessions'],['players','Players'],['breaks','Breaks']]} cur={v} set={setV}/>
  {v==='sessions'?<History/>:<div className="card"><b>Coming soon</b><div className="n">Run-out rates, balls run, and break tables will appear here once the stats build lands.</div></div>}</>}
function More(){
  const [v,setV]=useState('');const items:[string,string][]=[['players','Players'],['venues','Venues'],['sync','Sync'],['settings','Settings']];
  if(v)return <><button className="link" onClick={()=>setV('')}>‹ More</button>{v==='players'?<Players/>:v==='venues'?<Venues/>:v==='sync'?<Sync/>:<Settings/>}</>;
  return <><h1>More</h1>{items.map(([k,l])=><button key={k} className="nav-row" onClick={()=>setV(k)}><span>{l}</span><span>›</span></button>)}</>;
}
function Players(){
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const [name,setName]=useState('');
  const add=async()=>{if(!name.trim())return;await save('player',{name:name.trim(),color:COLORS[ps.length%COLORS.length],archived:false});setName('')};
  return <><h1>Players</h1>
    {!ps.length&&<p className="n">Create the two of you to get started.</p>}
    {ps.map(p=><div className={'card row'+(p.d.archived?' arch':'')} key={p.id+p.u}>
      <button className="dot" aria-label="Change colour" style={{background:p.d.color}} onClick={()=>save('player',{...p.d,color:COLORS[(COLORS.indexOf(p.d.color)+1)%COLORS.length]},p.id)}/>
      <input defaultValue={p.d.name} onBlur={e=>e.target.value.trim()&&e.target.value!==p.d.name&&save('player',{...p.d,name:e.target.value.trim()},p.id)}/>
      <button className="ghost" onClick={()=>save('player',{...p.d,archived:!p.d.archived},p.id)}>{p.d.archived?'Restore':'Archive'}</button><button className="ghost" onClick={async()=>{const used=(await ofType('session')).filter(s=>s.d.players.includes(p.id)).length;if(used){alert(`${p.d.name} is in ${used} session${used>1?'s':''}. Archive instead, or delete those sessions first.`);return}if(confirm(`Delete ${p.d.name}?`))drop(p.id)}}>Delete</button></div>)}
    <div className="card row"><input placeholder="New player name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button className="go sm" onClick={add}>Add</button></div></>;
}
function Session(){
  const all=useLiveQuery(()=>ofType('player'),[])||[];
  const ps=all.filter(p=>!p.d.archived);
  const ss=useLiveQuery(()=>ofType('session'),[])||[];
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const active=ss.find(s=>!s.d.end);
  const [a,setA]=useState('');const [b,setB]=useState('');const [venue,setV]=useState('');const [tbl,setT]=useState('');
  const venues=[...new Set(ss.map(s=>s.d.venue as string).filter(Boolean))];
  const nm=(id:string)=>all.find(p=>p.id===id)?.d.name??'?';
  if(active)return <Live session={active} name={nm} end={()=>save('session',{...active.d,end:Date.now()},active.id)}/>;
  const ok=a&&b&&a!==b;
  return <><h1>New session</h1>
    {ps.length<2?<p className="n">Add at least two players on the Players tab first.</p>:<div className="card">
      <label>Player 1<select value={a} onChange={e=>setA(e.target.value)}><option value="">Choose…</option>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
      <label>Player 2<select value={b} onChange={e=>setB(e.target.value)}><option value="">Choose…</option>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
      <label>Venue<select value={venue} onChange={e=>setV(e.target.value)}><option value="">No venue</option>{vs.map(v=><option key={v.id} value={v.id}>{v.d.name}</option>)}</select></label>{!vs.length&&<div className="n">Add venues on the Venues tab.</div>}
      <label>Table number<input value={tbl} onChange={e=>setT(e.target.value)} inputMode="numeric"/></label>
      <button className="go" disabled={!ok} onClick={()=>save('session',{players:[a,b],venue:vs.find(v=>v.id===venue)?.d.name??'',venueId:venue,table:tbl,start:Date.now()})}>Start session</button></div>}</>;
}
function Sync(){
  const [c,setC]=useState(getCfg());const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
  const dirty=useLiveQuery(()=>db.recs.where('dirty').equals(1).count(),[])??0;
  const run=async()=>{setCfg(c);setBusy(true);try{const r=await sync(setMsg);setMsg(`Done · pulled ${r.pulled}, pushed ${r.pushed}`)}catch(e:any){setMsg(e.message)}setBusy(false)};
  const backup=async()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(await db.recs.toArray())],{type:'application/json'}));a.download=`chalk-talk-backup-${new Date().toISOString().slice(0,10)}.json`;a.click()};
  return <><h1>Sync</h1><div className="card">
    <label>Data repo (owner/name)<input value={c.repo} onChange={e=>setC({...c,repo:e.target.value.trim()})} placeholder="you/chalk-talk-data"/></label>
    <label>Branch<input value={c.branch} onChange={e=>setC({...c,branch:e.target.value.trim()})}/></label>
    <label>Access token<input type="password" value={c.token} onChange={e=>setC({...c,token:e.target.value.trim()})} placeholder="github_pat_…"/></label>
    <div className="n">{dirty} change{dirty===1?'':'s'} not yet synced. The token stays on this device only.</div>
    <button className="go" disabled={busy} onClick={run}>{busy?'Syncing…':'Sync now'}</button><div className="n" role="status">{msg}</div></div>
    <button className="ghost" onClick={backup}>Download full backup</button></>;
}
