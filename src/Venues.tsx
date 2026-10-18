import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {save,drop,ofType} from './db';
import {ask,tell} from './ui';
import {TDF,tsf,pocket,tdf} from './tdf';
const blank=()=>({name:'',size:'9',c:{m:'',t:'',s:''},p:{m:'',t:'',s:''}});
const num=(p:any)=>({m:parseFloat(p.m)||0,t:parseFloat(p.t)||0,s:parseFloat(p.s)||0});
const str=(p:any)=>p?{m:String(p.m),t:String(p.t),s:String(p.s)}:{m:'',t:'',s:''};
const f2=(x:number)=>x.toFixed(2);
function Pocket({title,v,set}:any){
  const f=(k:string,l:string)=><label style={{flex:1}}>{l}<input type="number" inputMode="decimal" step="any" value={v[k]} onChange={e=>set({...v,[k]:e.target.value})}/></label>;
  const r=pocket(num(v));
  return <><div className="n" style={{marginTop:8}}>{title}</div>
    <div className="row">{f('m','Mouth "')}{f('t','Throat "')}{f('s','Shelf "')}</div>
    {r&&<div className="n">PSF {f2(r.psf)} · PAF {f2(r.paf)} · PLF {f2(r.plf)}</div>}</>;
}
function Tables({v}:any){
  const ts:any[]=v.d.tables||[];
  const [ix,setIx]=useState<number|null>(null),[d,setD]=useState<any>(blank());
  const open=(i:number)=>{const t=ts[i];setD(t?{name:t.name,size:t.size,c:str(t.c),p:str(t.p)}:blank());setIx(i)};
  const put=async(next:any[])=>{await save('venue',{...v.d,tables:next},v.id);setIx(null)};
  const sv=async()=>{
    const t:any={name:d.name.trim(),size:d.size,c:num(d.c)};
    if(!t.name)return tell('Give the table a name or number.');
    if(ts.some((x,i)=>i!==ix&&x.name===t.name))return tell('This venue already has a table with that name.');
    if(!pocket(t.c))return tell('Enter the corner pocket mouth, throat and shelf (mouth must be at least the throat).');
    if(d.p.m||d.p.t||d.p.s){if(!pocket(num(d.p)))return tell('Side pocket needs mouth, throat and shelf (mouth at least the throat), or leave all three empty.');t.p=num(d.p)}
    put(ix===ts.length?[...ts,t]:ts.map((x,i)=>i===ix?t:x));
  };
  const tot=ix!==null?tdf({size:d.size,c:num(d.c),p:pocket(num(d.p))?num(d.p):undefined}):null;
  return <div style={{marginTop:8}}>
    {ts.map((t,i)=>{const x=tdf(t);return <button key={t.name} className="ghost" style={{display:'block',width:'100%',textAlign:'left',marginBottom:6}} onClick={()=>open(i)}>Table {t.name} · {TDF.sizes.find(s=>s[0]===t.size)?.[1]||t.size} · TDF {x==null?'–':f2(x)}</button>})}
    {ix===null?<button className="link" onClick={()=>open(ts.length)}>+ Add table</button>
    :<div className="card">
      <label>Table name / number<input value={d.name} onChange={e=>setD({...d,name:e.target.value})}/></label>
      <label>Size<select value={d.size} onChange={e=>setD({...d,size:e.target.value})}>{TDF.sizes.map(s=><option key={s[0]} value={s[0]}>{s[1]} · TSF {f2(s[2])}</option>)}</select></label>
      <Pocket title="Corner pockets (inches)" v={d.c} set={(c:any)=>setD({...d,c})}/>
      <Pocket title="Side pockets (inches, optional: corner used if empty)" v={d.p} set={(p:any)=>setD({...d,p})}/>
      <div style={{margin:'8px 0',fontWeight:600}}>TDF {tot==null?'–':f2(tot)} <span className="n">(TSF {f2(tsf(d.size))} × pockets, corner:side {TDF.w[0]}:{TDF.w[1]})</span></div>
      <div className="row">
        {ix<ts.length&&<button className="ghost danger" onClick={async()=>{if(await ask(`Delete table ${ts[ix].name}? Past sessions keep the table name.`,'Delete table'))put(ts.filter((_,i)=>i!==ix))}}>Delete</button>}
        <button className="ghost" onClick={()=>setIx(null)}>Cancel</button>
        <button className="go sm" style={{flex:1}} onClick={sv}>Save</button></div></div>}
  </div>;
}
export default function Venues(){
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const ss=useLiveQuery(()=>ofType('session'),[])||[];
  const [name,setName]=useState('');
  const add=async()=>{if(!name.trim())return;await save('venue',{name:name.trim()});setName('')};
  const old=[...new Set(ss.map(s=>s.d.venue as string).filter(Boolean))].filter(n=>!vs.some(v=>v.d.name===n));
  return <><h1>Venues</h1>
    {!vs.length&&<p className="n">Add the places you play. They become a dropdown when you start a session.</p>}
    {vs.map(v=><div className="card" key={v.id+v.u}><div className="row">
      <input defaultValue={v.d.name} onBlur={e=>e.target.value.trim()&&e.target.value!==v.d.name&&save('venue',{...v.d,name:e.target.value.trim()},v.id)}/>
      <button className="ghost danger" onClick={async()=>{if(await ask(`Delete ${v.d.name}? Past sessions keep the venue name.`,'Delete venue'))drop(v.id)}}>Delete</button></div>
      <Tables v={v}/></div>)}
    <div className="card row"><input placeholder="New venue name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button className="go sm" onClick={add}>Add</button></div>
    {old.length>0&&<button className="ghost" onClick={()=>old.forEach(n=>save('venue',{name:n}))}>Add {old.length} venue{old.length>1?'s':''} from past sessions</button>}</>;
}
