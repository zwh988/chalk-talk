import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType} from './db';
import {derive} from './engine';
import {line} from './Live';
export default function History(){
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [open,setOpen]=useState('');
  const nm=(id:string)=>ps.find(p=>p.id===id)?.d.name??'?';
  return <><h1>Match history</h1>{!ss.length&&<p className="n">No sessions yet.</p>}
    {ss.map(s=>{
      const pl:string[]=s.d.players,evs=all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)),st=derive(pl,evs);
      const ro=pl.map(p=>evs.filter(e=>e.type==='visit'&&e.d.by===p&&e.d.runout).length);
      const racks=[...new Set(evs.map(e=>e.d.rack))] as number[];
      return <div className="card" key={s.id}><button className="hist" onClick={()=>setOpen(open===s.id?'':s.id)}>
        <div className="hdr"><b>{new Date(s.d.start).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}{!s.d.end&&' · in progress'}</b><b>{nm(pl[0])} {st.scores[0]} – {st.scores[1]} {nm(pl[1])}</b></div>
        <div className="n">{s.d.venue||'No venue'}{s.d.table?` · table ${s.d.table}`:''} · {racks.length} rack{racks.length===1?'':'s'} · run-outs: {nm(pl[0])} {ro[0]}, {nm(pl[1])} {ro[1]}</div></button>
        {open===s.id&&<div className="log">{racks.map(r=>{const w=evs.find(e=>e.d.rack===r&&(e.d.won||e.d.nine));
          return <div key={r}><div className="rh">Rack {r} · {w?nm(w.d.by)+' won':'in progress'}</div>{evs.filter(e=>e.d.rack===r).map(e=><div className="v" key={e.id}>{line(e,nm)}</div>)}</div>})}</div>}</div>})}</>;
}
