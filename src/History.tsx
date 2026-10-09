import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType,save,drop} from './db';
import {derive,sName} from './engine';
import {playerStats,breakStats} from './stats';
import {Ln} from './Live';
import Avatar from './Avatar';
import {ask} from './ui';
const bs=(id:string)=>id.split('~')[0];
export default function History(){
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [open,setOpen]=useState(''),[pf,setPf]=useState(''),[vf,setVf]=useState('');
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const vn=(s:any)=>vs.find(v=>v.id===s.d.venueId)?.d.name??s.d.venue;
  const delSession=async(s:any)=>{if(!await ask('Delete this session and all its racks? This cannot be undone.','Delete session'))return;
    for(const x of await db.recs.filter(r=>!r.del&&r.d?.s===s.id).toArray())await drop(x.id);await drop(s.id)};
  const delRack=async(s:any,r:number)=>{if(!await ask(`Delete rack ${r}? Later racks are renumbered and the score updates.`,'Delete rack'))return;
    for(const x of await db.recs.filter(q=>!q.del&&q.d?.s===s.id&&q.d.rack!=null).toArray()){if(x.d.rack===r)await drop(x.id);else if(x.d.rack>r)await save(x.type,{...x.d,rack:x.d.rack-1},x.id)}};
  const pp=(id:string)=>ps.find(p=>p.id===bs(id));
  const nm=(id:string)=>(ps.find(p=>p.id===bs(id))?.d.name??'?')+(id.includes('~')?' (2)':'');
  // Filters (dropdowns): only players/venues that appear in a session; a select is shown only when there is something to choose.
  const ids=(s:any)=>[...s.d.players,...(s.d.teams||[]).flat()].map(bs),po=ps.filter(p=>ss.some(s=>ids(s).includes(p.id))),vo=[...new Set(ss.map(vn).filter(Boolean))].sort() as string[];
  const fs=ss.filter(s=>(!pf||ids(s).includes(pf))&&(!vf||vn(s)===vf));
  const ml=(s:any)=>new Date(s.d.start).toLocaleDateString(undefined,{month:'long',year:'numeric'}),mc:Record<string,number>={};fs.forEach(s=>{mc[ml(s)]=(mc[ml(s)]||0)+1});
  return <>{!ss.length&&<p className="n">No sessions yet.</p>}
    {(po.length>1||vo.length>1)&&<div className="filt">{po.length>1&&<select aria-label="Player" value={pf} onChange={e=>setPf(e.target.value)}><option value="">All players</option>{po.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>}{vo.length>1&&<select aria-label="Venue" value={vf} onChange={e=>setVf(e.target.value)}><option value="">All venues</option>{vo.map(v=><option key={v} value={v}>{v}</option>)}</select>}</div>}
    {!!ss.length&&!fs.length&&<p className="n">No sessions match.</p>}
    {fs.map((s,i)=>{
      const pl:string[]=s.d.players,evs=all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)),st=derive(pl,evs),sn=(id:string)=>sName(s.d,id,nm);
      const racks=[...new Set(evs.map(e=>e.d.rack))] as number[],o=open===s.id,solo=!!s.d.solo,dt=(f:any)=>new Date(s.d.start).toLocaleDateString(undefined,f);
      // Winner = higher score of a finished match (none for solo, ties, or while in progress).
      const wn=s.d.end&&!solo&&st.scores[0]!==st.scores[1]?(st.scores[0]>st.scores[1]?0:1):-1;
      const meta=[solo&&'Solo practice',s.d.fmt==='scotch'&&'Scotch Doubles',s.d.name&&dt({month:'short',day:'numeric'}),vn(s)||'No venue',s.d.table&&`table ${s.d.table}`,`${racks.length} rack${racks.length===1?'':'s'}`].filter(Boolean).join(' · ');
      return <div key={s.id}>{(i===0||ml(fs[i-1])!==ml(s))&&<div className="mh"><span>{ml(s)}</span><span>{mc[ml(s)]}</span></div>}
      <div className="card"><button className={'hist'+(o?' o':'')} aria-expanded={o} onClick={()=>setOpen(o?'':s.id)}>
        <div className="hh"><b>{s.d.name||dt({weekday:'short',month:'short',day:'numeric'})}{!s.d.end&&<span className="ip"> · in progress</span>}</b><span className="chev" aria-hidden="true">›</span></div>
        <div className="n" style={{margin:'2px 0 0'}}>{meta}</div>
        <div className="sb">{(solo?[0]:[0,1]).map(k=><div key={k} className={'sr'+(wn===k?' w':wn>=0?' l':'')}><Avatar p={pp(pl[k])} size={28}/><span className="nm">{sn(pl[k])}</span>{wn===k&&<span className="wt">Won</span>}{!solo&&<b className="num">{st.scores[k]}</b>}</div>)}</div></button>
        {o&&<div className="log"><Summary s={s} evs={evs} pl={pl} sn={sn} st={st}/><EditSession s={s} vs={vs}/>{[...racks].reverse().map(r=>{const w=evs.find(e=>e.d.rack===r&&(e.d.won||e.d.nine));
          return <div key={r}><div className="rh hx"><span>Rack {r} · {w?sn(w.d.by)+' won':'in progress'}</span><button className="ghost danger" onClick={()=>delRack(s,r)}>Delete rack</button></div>{evs.filter(e=>e.d.rack===r).reverse().map(e=><div className="v" key={e.id}><Ln e={e} name={sn} pn={nm}/></div>)}</div>})}<button className="ghost danger" style={{marginTop:12}} onClick={()=>delSession(s)}>Delete session</button></div>}</div></div>})}</>;
}

// Per-match summary: derived from the same replay helpers as Review (playerStats/breakStats); nothing stored.
// Scotch Doubles visits are team-level (not credited to a person by playerStats), so only racks and run-outs are shown there; solo has one column and no rack result.
function Summary({s,evs,pl,sn,st}:any){
  const solo=!!s.d.solo,sc=s.d.fmt==='scotch',seats=solo?[0]:[0,1];
  const X=seats.map((i:number)=>sc?null:{s:playerStats(bs(pl[i]),[evs]),b:breakStats(bs(pl[i]),[evs])});
  const ro=(i:number)=>evs.filter((e:any)=>e.type==='visit'&&e.d.by===pl[i]&&e.d.runout).length;
  const R:[string,(i:number,x:any)=>any][]=[...(solo?[]:[['Racks won',(i:number)=>st.scores[i]]]),['Run-outs',(i:number,x:any)=>x?x.s.runouts:ro(i)],
    ...(sc?[]:[['Won from chance',(i:number,x:any)=>`${x.s.won}/${x.s.shot}`],['1-ball on the break',(i:number,x:any)=>`${x.b.one}/${x.b.n}`],['Safeties held',(i:number,x:any)=>`${x.s.held}/${x.s.safe}`],['Fouls',(i:number,x:any)=>x.s.fouls]])] as any;
  return <><div className="lbl" style={{marginTop:0}}>Match summary</div><div className="ms" style={{gridTemplateColumns:`minmax(0,1.5fr) repeat(${seats.length},minmax(0,1fr))`}}><span className="h"/>{seats.map((i:number)=><span key={i} className="h" style={{textAlign:'center'}}>{sn(pl[i])}</span>)}
    {R.map(([l,f]:any)=><div key={l} style={{display:'contents'}}><span className="k">{l}</span>{seats.map((i:number,j:number)=><span key={i} className="v">{f(i,X[j])}</span>)}</div>)}</div></>;
}

function EditSession({s,vs}:any){
  const [on,setOn]=useState(false),[name,setName]=useState(s.d.name||''),[vid,setVid]=useState(s.d.venueId||''),[tbl,setTbl]=useState(s.d.table||'');
  if(!on)return <button className="ghost" style={{marginBottom:8}} onClick={()=>setOn(true)}>Edit details</button>;
  return <div className="card"><label>Session name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>Venue<select value={vid} onChange={e=>setVid(e.target.value)}><option value="">No venue</option>{vs.map((v:any)=><option key={v.id} value={v.id}>{v.d.name}</option>)}</select></label>
    <label>Table number<input value={tbl} onChange={e=>setTbl(e.target.value)}/></label>
    <div className="row"><button className="ghost" onClick={()=>setOn(false)}>Cancel</button><button className="go sm" style={{flex:1}} onClick={async()=>{await save('session',{...s.d,name:name.trim(),venueId:vid,venue:vid?(vs.find((v:any)=>v.id===vid)?.d.name??''):'',table:tbl},s.id);setOn(false)}}>Save</button></div></div>;
}
