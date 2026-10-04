import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,ofType} from './db';
import Live from './Live';
import {getCfg,setCfg,sync} from './sync';
const COLORS=['#14575a','#e8a33d','#c4513d','#5b3a8c','#1f4fa3','#2f8f5b'];
type Tab='session'|'players'|'sync';
export default function App(){
  const [tab,setTab]=useState<Tab>('session');
  return <div className="app"><main>{tab==='session'?<Session/>:tab==='players'?<Players/>:<Sync/>}</main>
    <nav><b className="brand">Chalk Talk</b>{(['session','players','sync'] as Tab[]).map(t=>
      <button key={t} className={tab===t?'on':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</nav></div>;
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
      <button className="ghost" onClick={()=>save('player',{...p.d,archived:!p.d.archived},p.id)}>{p.d.archived?'Restore':'Archive'}</button></div>)}
    <div className="card row"><input placeholder="New player name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button className="go sm" onClick={add}>Add</button></div></>;
}
function Session(){
  const all=useLiveQuery(()=>ofType('player'),[])||[];
  const ps=all.filter(p=>!p.d.archived);
  const ss=useLiveQuery(()=>ofType('session'),[])||[];
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
      <label>Venue<input list="v" value={venue} onChange={e=>setV(e.target.value)} placeholder="e.g. Cue & Chalk"/></label><datalist id="v">{venues.map(v=><option key={v} value={v}/>)}</datalist>
      <label>Table number<input value={tbl} onChange={e=>setT(e.target.value)} inputMode="numeric"/></label>
      <button className="go" disabled={!ok} onClick={()=>save('session',{players:[a,b],venue,table:tbl,start:Date.now()})}>Start session</button></div>}</>;
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
