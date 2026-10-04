import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {save,drop,ofType} from './db';
export default function Venues(){
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const ss=useLiveQuery(()=>ofType('session'),[])||[];
  const [name,setName]=useState('');
  const add=async()=>{if(!name.trim())return;await save('venue',{name:name.trim()});setName('')};
  const old=[...new Set(ss.map(s=>s.d.venue as string).filter(Boolean))].filter(n=>!vs.some(v=>v.d.name===n));
  return <><h1>Venues</h1>
    {!vs.length&&<p className="n">Add the places you play. They become a dropdown when you start a session.</p>}
    {vs.map(v=><div className="card row" key={v.id+v.u}>
      <input defaultValue={v.d.name} onBlur={e=>e.target.value.trim()&&e.target.value!==v.d.name&&save('venue',{...v.d,name:e.target.value.trim()},v.id)}/>
      <button className="ghost" onClick={()=>confirm(`Delete ${v.d.name}? Past sessions keep the venue name.`)&&drop(v.id)}>Delete</button></div>)}
    <div className="card row"><input placeholder="New venue name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button className="go sm" onClick={add}>Add</button></div>
    {old.length>0&&<button className="ghost" onClick={()=>old.forEach(n=>save('venue',{name:n}))}>Add {old.length} venue{old.length>1?'s':''} from past sessions</button>}</>;
}
