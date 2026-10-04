import {useState,useRef} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {save,drop,ofType} from './db';
const BC=['#f5f2e8','#c9a200','#1f4fa3','#c4513d','#5b3a8c','#e07b1f','#1f7a4a','#7a2330','#222','#d9b200'];
const POCK:[number,number][]=[[0,0],[50,0],[100,0],[0,50],[50,50],[100,50]];
const PNAME=['top-left','top-side','top-right','bottom-left','bottom-side','bottom-right'];
const BR=1.125,DIA=2.25;
const SPEEDS=['Pocket speed','Soft','Medium','Firm','Max power'];
const blank=()=>({no:0,name:'',by:'',balls:[{n:0,x:25,y:25}],target:null as number|null,pocket:null as number|null,path:[] as any[],tip:[100,100],speed:2,leave:null as any,note:''});
// Ghost ball, cut angle and distances are derived from the diagram, never typed in.
export function measure(d:any){
  const o=d.balls.find((b:any)=>b.n===d.target),c=d.balls.find((b:any)=>b.n===0);
  if(!o||!c||d.pocket==null)return null;
  const p=POCK[d.pocket],L=Math.hypot(p[0]-o.x,p[1]-o.y)||1,ux=(p[0]-o.x)/L,uy=(p[1]-o.y)/L;
  const g={x:o.x-ux*DIA,y:o.y-uy*DIA},pts=[c,...d.path,g];
  let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  const q=pts[pts.length-2],ax=g.x-q.x,ay=g.y-q.y,A=Math.hypot(ax,ay)||1;
  return {g,cut:Math.acos(Math.max(-1,Math.min(1,(ax*ux+ay*uy)/A)))*180/Math.PI,cue:len,obj:L};
}
export const tipLabel=(t:number[])=>{const dx=t[0]-100,dy=t[1]-100,v=Math.abs(dy)<18?'centre':dy<0?'high':'low',h=Math.abs(dx)<18?'':dx<0?' left':' right';return v==='centre'&&!h?'dead centre':v+h};
export function Tip({tip,set}:any){
  const upd=(e:any)=>{const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*200-100,dy=(e.clientY-r.top)/r.height*200-100,d=Math.hypot(dx,dy),f=d>78?78/d:1;set([100+dx*f,100+dy*f])};
  return <svg viewBox="0 0 200 200" style={{width:170,display:'block',margin:'auto',touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);upd(e)}} onPointerMove={e=>{if(e.buttons)upd(e)}}>
    <circle cx="100" cy="100" r="92" fill="#f5f2e8" stroke="#bbb" strokeWidth="2"/><line x1="100" y1="8" x2="100" y2="192" stroke="#ccc"/><line x1="8" y1="100" x2="192" y2="100" stroke="#ccc"/><circle cx={tip[0]} cy={tip[1]} r="9" fill="#c4513d"/></svg>;
}
function Table({d,sel,handlers,small}:any){
  const m=measure(d),cue=d.balls.find((b:any)=>b.n===0),r=small?2.4:BR;
  const route=cue?[cue,...d.path,...(m?[m.g]:[])]:[];
  return <svg viewBox="-4 -4 108 58" style={{width:'100%',display:'block',touchAction:handlers?'none':'auto'}} {...handlers}>
    <rect x="-4" y="-4" width="108" height="58" rx="3" fill="#0e4144"/><rect width="100" height="50" fill="#14575a"/>
    {POCK.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={i===d.pocket?3.4:2.6} fill={i===d.pocket?'#e8a33d':'#06191a'}/>)}
    {d.leave&&<circle cx={d.leave.x} cy={d.leave.y} r={d.leave.tol} fill="rgba(232,163,61,.2)" stroke="#e8a33d" strokeWidth=".5" strokeDasharray="1.5 1"/>}
    {route.length>1&&<polyline points={route.map((p:any)=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#fff" strokeWidth=".5" strokeDasharray="1.5 1.2"/>}
    {d.path.map((p:any,i:number)=><circle key={i} cx={p.x} cy={p.y} r=".9" fill="#fff"/>)}
    {m&&(()=>{const o=d.balls.find((b:any)=>b.n===d.target),pk=POCK[d.pocket];return <line x1={o.x} y1={o.y} x2={pk[0]} y2={pk[1]} stroke="#9fd0e6" strokeWidth=".5" strokeDasharray="1.5 1.2"/>})()}
    {m&&<circle cx={m.g.x} cy={m.g.y} r={r} fill="none" stroke="#fff" strokeWidth=".5" strokeDasharray="1 .8"/>}
    {d.balls.map((b:any)=><g key={b.n}><circle cx={b.x} cy={b.y} r={r} fill={BC[b.n]} stroke={sel===b.n?'#e8a33d':b.n===d.target?'#9fd0e6':'none'} strokeWidth=".7"/>
      {sel===b.n&&!small&&<text x={b.x} y={b.y-2.6} textAnchor="middle" fontSize="3" fill="#fff">{b.n===0?'CB':b.n}</text>}</g>)}</svg>;
}
function Editor({init,id,players,onDone}:any){
  const [d,setD]=useState<any>(init),[mode,setMode]=useState('balls'),[sel,setSel]=useState<number|null>(null);
  const drag=useRef(false);
  const pt=(e:any)=>{const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*108-4,y:(e.clientY-r.top)/r.height*58-4}};
  const hit=(p:any)=>d.balls.map((b:any)=>({b,k:Math.hypot(b.x-p.x,b.y-p.y)})).filter((h:any)=>h.k<4).sort((a:any,b:any)=>a.k-b.k)[0]?.b;
  const cl=(v:number,m:number)=>Math.max(BR,Math.min(m-BR,v));
  const put=(n:number,p:any)=>setD((x:any)=>({...x,balls:x.balls.some((b:any)=>b.n===n)?x.balls.map((b:any)=>b.n===n?{...b,x:cl(p.x,100),y:cl(p.y,50)}:b):[...x.balls,{n,x:cl(p.x,100),y:cl(p.y,50)}]}));
  const down=(e:any)=>{e.currentTarget.setPointerCapture(e.pointerId);const p=pt(e);
    if(mode==='balls'){const h=hit(p);if(h){setSel(h.n);drag.current=true}else if(sel!==null)put(sel,p)}
    else if(mode==='target'){const h=hit(p),pk=POCK.findIndex(q=>Math.hypot(q[0]-p.x,q[1]-p.y)<7);if(h&&h.n!==0)setD({...d,target:h.n});else if(pk>=0)setD({...d,pocket:pk})}
    else if(mode==='path'){if(d.path.length<4)setD({...d,path:[...d.path,p]})}
    else setD({...d,leave:{x:p.x,y:p.y,tol:d.leave?.tol??6}});
  };
  const mv=(e:any)=>{if(drag.current&&sel!==null)put(sel,pt(e))};
  const pick=(n:number)=>{setSel(n);setMode('balls');if(!d.balls.some((b:any)=>b.n===n))put(n,{x:30+n*4,y:25})};
  const m=measure(d);
  const hint:any={balls:'Pick a ball below, tap the table to place it, drag to move.',target:'Tap the object ball, then tap the pocket it should go in.',path:'Tap points the cue ball passes through before the ghost ball (kicks, banks).',leave:'Tap where the cue ball should end up.'};
  return <>
    <div className="hdr"><button className="link" onClick={onDone}>‹ Catalogue</button><b>Shot #{d.no}</b></div>
    <div className="card"><Table d={d} sel={sel} handlers={{onPointerDown:down,onPointerMove:mv,onPointerUp:()=>{drag.current=false}}}/>
      <div className="row" style={{marginTop:8}}>{['balls','target','path','leave'].map(k=><button key={k} className={'chip'+(mode===k?' on':'')} onClick={()=>setMode(k)}>{k[0].toUpperCase()+k.slice(1)}</button>)}</div>
      <div className="n">{hint[mode]}</div>
      {mode==='balls'&&<><div className="row">{[0,1,2,3,4,5,6,7,8,9].map(n=><button key={n} className={'chip'+(sel===n?' on':'')} style={{minWidth:34,padding:'9px 2px',opacity:d.balls.some((b:any)=>b.n===n)?1:.55}} onClick={()=>pick(n)}>{n===0?'CB':n}</button>)}</div>
        {sel!==null&&d.balls.some((b:any)=>b.n===sel)&&<button className="link" onClick={()=>{setD({...d,balls:d.balls.filter((b:any)=>b.n!==sel),target:d.target===sel?null:d.target});setSel(null)}}>Remove selected ball</button>}</>}
      {mode==='target'&&<div className="n">Target: {d.target!=null?'ball '+d.target:'—'} → {d.pocket!=null?PNAME[d.pocket]+' pocket':'—'}</div>}
      {mode==='path'&&<button className="link" onClick={()=>setD({...d,path:d.path.slice(0,-1)})}>Undo last point</button>}
      {mode==='leave'&&<div className="row">{[3,6,9].map(t=><button key={t} className={'chip'+(d.leave?.tol===t?' on':'')} onClick={()=>d.leave&&setD({...d,leave:{...d.leave,tol:t}})}>{['Tight','Medium','Loose'][t/3-1]}</button>)}<button className="link" onClick={()=>setD({...d,leave:null})}>Clear</button></div>}
    </div>
    <div className="card"><h2>Measured</h2>{m?<div className="tags"><span className="tag f">Cut {Math.round(m.cut)}°</span><span className="tag g">Cue ball travel {Math.round(m.cue)}"</span><span className="tag g">Object ball to pocket {Math.round(m.obj)}"</span></div>:<div className="n">Set a target ball and pocket to get the ghost ball, cut angle and distances.</div>}
      {m&&m.cut>85&&<div className="n">Cut over 85° · not makeable</div>}</div>
    <div className="card"><h2>Cue ball</h2><Tip tip={d.tip} set={(t:number[])=>setD({...d,tip:t})}/><div className="n" style={{textAlign:'center'}}>{tipLabel(d.tip)}</div>
      <div className="lbl">Speed</div><div className="row">{SPEEDS.map((s,i)=><button key={s} className={'chip'+(d.speed===i?' on':'')} style={{padding:'10px 4px'}} onClick={()=>setD({...d,speed:i})}>{s}</button>)}</div></div>
    <div className="card"><label>Name (optional)<input value={d.name} onChange={e=>setD({...d,name:e.target.value})} placeholder="e.g. Long cut to the 7"/></label>
      <label>Shot by<select value={d.by} onChange={e=>setD({...d,by:e.target.value})}>{players.map((p:any)=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
      <label>Note<input value={d.note} onChange={e=>setD({...d,note:e.target.value})}/></label>
      <button className="go" onClick={async()=>{await save('shot',d,id);onDone()}}>Save shot</button>
      {id&&<button className="ghost" style={{marginTop:8}} onClick={()=>confirm('Delete this shot?')&&drop(id).then(onDone)}>Delete shot</button>}</div></>;
}
export default function Shots(){
  const ss=useLiveQuery(()=>ofType('shot'),[])||[],ps=(useLiveQuery(()=>ofType('player'),[])||[]).filter(p=>!p.d.archived);
  const [f,setF]=useState('all'),[ed,setEd]=useState<any>(null);
  const nm=(id:string)=>ps.find(p=>p.id===id)?.d.name??'—';
  if(ed)return <Editor key={ed.id||'new'} id={ed.id} init={ed.d} players={ps} onDone={()=>setEd(null)}/>;
  const next=Math.max(0,...ss.map(s=>s.d.no))+1,list=ss.filter(s=>f==='all'||s.d.by===f).sort((a,b)=>a.d.no-b.d.no);
  return <><div className="hdr"><h1>Shots</h1><button className="go sm" onClick={()=>setEd({d:{...blank(),no:next,by:ps[0]?.id||''}})}>New shot</button></div>
    <div className="row" style={{marginBottom:12}}>{[['all','All'],...ps.map(p=>[p.id,p.d.name])].map(([k,l])=><button key={k} className={'chip'+(f===k?' on':'')} onClick={()=>setF(k)}>{l}</button>)}</div>
    {!list.length&&<p className="n">No shots yet. Tap New shot to diagram one.</p>}
    {list.map(s=>{const m=measure(s.d);return <button key={s.id} className="card shotcard" onClick={()=>setEd(s)}>
      <div style={{width:140,flex:'none'}}><Table d={s.d} small/></div>
      <div><b>#{s.d.no}{s.d.name?` · ${s.d.name}`:''}</b><div className="n">by {nm(s.d.by)} · {SPEEDS[s.d.speed]}</div>
        {m&&<div className="n">Cut {Math.round(m.cut)}° · cue {Math.round(m.cue)}" · object {Math.round(m.obj)}"</div>}</div></button>})}</>;
}
