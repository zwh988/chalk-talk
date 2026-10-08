import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType,save,drop} from './db';
import {derive,sName} from './engine';
import {line} from './Live';
import Avatar from './Avatar';
export default function History(){
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [open,setOpen]=useState('');
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const vn=(s:any)=>vs.find(v=>v.id===s.d.venueId)?.d.name??s.d.venue;
  const delSession=async(s:any)=>{if(!confirm('Delete this session and all its racks? This cannot be undone.'))return;
    for(const x of await db.recs.filter(r=>!r.del&&r.d?.s===s.id).toArray())await drop(x.id);await drop(s.id)};
  const delRack=async(s:any,r:number)=>{if(!confirm(`Delete rack ${r}? Later racks are renumbered and the score updates.`))return;
    for(const x of await db.recs.filter(q=>!q.del&&q.d?.s===s.id&&q.d.rack!=null).toArray()){if(x.d.rack===r)await drop(x.id);else if(x.d.rack>r)await save(x.type,{...x.d,rack:x.d.rack-1},x.id)}};
  const bs=(id:string)=>id.split('~')[0],pp=(id:string)=>ps.find(p=>p.id===bs(id));
  const nm=(id:string)=>(ps.find(p=>p.id===bs(id))?.d.name??'?')+(id.includes('~')?' (2)':'');
  return <>{!ss.length&&<p className="n">No sessions yet.</p>}
    {ss.map(s=>{
      const pl:string[]=s.d.players,evs=all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)),st=derive(pl,evs),sn=(id:string)=>sName(s.d,id,nm);
      const ro=pl.map(p=>evs.filter(e=>e.type==='visit'&&e.d.by===p&&e.d.runout).length);
      const racks=[...new Set(evs.map(e=>e.d.rack))] as number[];
      return <div className="card" key={s.id}><button className="hist" onClick={()=>setOpen(open===s.id?'':s.id)}>
        <div className="hdr"><b>{s.d.name||new Date(s.d.start).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}{!s.d.end&&' · in progress'}</b><b style={{display:'flex',alignItems:'center',gap:6}}><Avatar p={pp(pl[0])} size={24}/>{sn(pl[0])} {st.scores[0]} – {st.scores[1]} {sn(pl[1])}<Avatar p={pp(pl[1])} size={24}/></b></div>
        <div className="n">{s.d.solo&&'Solo practice · '}{s.d.fmt==='scotch'&&'Scotch Doubles · '}{s.d.name&&new Date(s.d.start).toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '}{vn(s)||'No venue'}{s.d.table?` · table ${s.d.table}`:''} · {racks.length} rack{racks.length===1?'':'s'} · run-outs: {sn(pl[0])} {ro[0]}, {sn(pl[1])} {ro[1]}</div></button>
        {open===s.id&&<div className="log"><EditSession s={s} vs={vs}/>{[...racks].reverse().map(r=>{const w=evs.find(e=>e.d.rack===r&&(e.d.won||e.d.nine));
          return <div key={r}><div className="rh">Rack {r} · {w?sn(w.d.by)+' won':'in progress'}<button className="link" style={{marginLeft:8,fontSize:11}} onClick={()=>delRack(s,r)}>Delete rack</button></div>{evs.filter(e=>e.d.rack===r).reverse().map(e=><div className="v" key={e.id}>{line(e,sn,nm)}</div>)}</div>})}<button className="ghost" style={{marginTop:12}} onClick={()=>delSession(s)}>Delete session</button></div>}</div>})}</>;
}

function EditSession({s,vs}:any){
  const [on,setOn]=useState(false),[name,setName]=useState(s.d.name||''),[vid,setVid]=useState(s.d.venueId||''),[tbl,setTbl]=useState(s.d.table||'');
  if(!on)return <button className="ghost" style={{marginBottom:8}} onClick={()=>setOn(true)}>Edit details</button>;
  return <div className="card"><label>Session name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Venue<select value={vid} onChange={e=>setVid(e.target.value)}><option value="">No venue</option>{vs.map((v:any)=><option key={v.id} value={v.id}>{v.d.name}</option>)}</select></label>
    <label>Table number<input value={tbl} onChange={e=>setTbl(e.target.value)}/></label>
    <div className="row"><button className="ghost" onClick={()=>setOn(false)}>Cancel</button><button className="go sm" style={{flex:1}} onClick={async()=>{await save('session',{...s.d,name:name.trim(),venueId:vid,venue:vid?(vs.find((v:any)=>v.id===vid)?.d.name??''):'',table:tbl},s.id);setOn(false)}}>Save</button></div></div>;
}
