import {useState,useRef} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {save,drop,ofType,uid} from './db';
import Photo from './Photo';
import {ask,useBack} from './ui';
const BC=['#f5f2e8','#c9a200','#1f4fa3','#c4513d','#5b3a8c','#e07b1f','#1f7a4a','#7a2330','#222','#d9b200'];
const POCK:[number,number][]=[[0,0],[50,0],[100,0],[0,50],[50,50],[100,50]];
const PNAME=['top-left','top-side','top-right','bottom-left','bottom-side','bottom-right'];
const BR=1.125,DIA=2.25;
const SPEEDS=['Pocket speed','Soft','Medium','Firm','Max power'];
const blank=()=>({no:0,tag:'',name:'',by:'',balls:[{n:0,x:25,y:25}],target:null as number|null,pocket:null as number|null,path:[] as any[],tip:[100,100],pw:3,leave:null as any,note:''});
// Ghost ball, cut angle and distances are derived from the diagram, never typed in.
export function measure(d:any){
  const o=d.balls.find((b:any)=>b.n===d.target),c=d.balls.find((b:any)=>b.n===0);
  if(!o||!c||d.pocket==null)return null;
  const p=POCK[d.pocket],L=Math.hypot(p[0]-o.x,p[1]-o.y)||1,ux=(p[0]-o.x)/L,uy=(p[1]-o.y)/L;
  const g={x:o.x-ux*DIA,y:o.y-uy*DIA},ax=g.x-c.x,ay=g.y-c.y,A=Math.hypot(ax,ay)||1,dot=(ax*ux+ay*uy)/A;
  const tx=ax/A-dot*ux,ty=ay/A-dot*uy,tl=Math.hypot(tx,ty);   // tangent line: where a stun cue ball goes after contact
  const pts=[g,...d.path,...(d.leave?[d.leave]:[])];
  let after=0;for(let i=1;i<pts.length;i++)after+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  const rails=d.path.filter((q:any)=>q.x===0||q.x===100||q.y===0||q.y===50).length;
  return {g,route:[{x:o.x,y:o.y},{x:p[0],y:p[1]}],cut:Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI,cue:A,obj:L,after,rails,tan:tl>1e-3?{x:tx/tl,y:ty/tl}:null};
}
export const title=(d:any,all:any[],id?:string)=>{const tg=(d.tag||'').toLowerCase(),n=d.tag?all.filter(x=>x.id!==id&&(x.d.tag||'').toLowerCase()===tg&&(x.d.no<d.no||(x.d.no===d.no&&x.id<(id||'~')))).length+1:0;return d.tag?`${d.tag} #${n}${d.name?`: ${d.name}`:''}`:`#${d.no}${d.name?`: ${d.name}`:''}`};
export const tipLabel=(t:number[])=>{const dx=t[0]-100,dy=t[1]-100,v=Math.abs(dy)<18?'centre':dy<0?'high':'low',h=Math.abs(dx)<18?'':dx<0?' left':' right';return v==='centre'&&!h?'dead centre':v+h};
export function Tip({tip,set,size}:any){
  const upd=(e:any)=>{const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*200-100,dy=(e.clientY-r.top)/r.height*200-100,d=Math.hypot(dx,dy),f=d>78?78/d:1;set([100+dx*f,100+dy*f])};
  return <svg viewBox="0 0 200 200" style={{width:size||170,display:'block',margin:'auto',touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);upd(e)}} onPointerMove={e=>{if(e.buttons)upd(e)}}>
    <circle cx="100" cy="100" r="92" fill="#f5f2e8" stroke="#bbb" strokeWidth="2"/><line x1="100" y1="8" x2="100" y2="192" stroke="#ccc"/><line x1="8" y1="100" x2="192" y2="100" stroke="#ccc"/><circle cx={tip[0]} cy={tip[1]} r="9" fill="#c4513d"/></svg>;
}
export const dm=(v:number)=>(v/12.5).toFixed(1);
const rail=(x:number,y:number,dx:number,dy:number)=>Math.min(dx>0?(100-x)/dx:dx<0?-x/dx:1e9,dy>0?(50-y)/dy:dy<0?-y/dy:1e9);   // distance from (x,y) along a unit vector to the cushion
const dia=(x:number,y:number)=><polygon key={x+'_'+y} points={`${x},${y-1} ${x+1},${y} ${x},${y+1} ${x-1},${y}`} fill="#e8d9a8"/>;
export function Table({d,sel,handlers,small}:any){
  const m=measure(d),cue=d.balls.find((b:any)=>b.n===0),r=small?2.4:BR;
  return <svg viewBox="-5 -5 110 60" style={{width:'100%',display:'block',touchAction:handlers?'none':'auto'}} {...handlers}>
    <rect x="-5" y="-5" width="110" height="60" rx="3" fill="#4a2f1d"/><rect x="-1.2" y="-1.2" width="102.4" height="52.4" fill="#0f3f42"/><rect width="100" height="50" fill="#14575a"/>
    {[1,2,3,4,5,6,7].map(k=><line key={'x'+k} x1={k*12.5} y1="0" x2={k*12.5} y2="50" stroke="#fff" strokeOpacity=".16" strokeWidth=".3"/>)}
    {[1,2,3].map(k=><line key={'y'+k} x1="0" y1={k*12.5} x2="100" y2={k*12.5} stroke="#fff" strokeOpacity=".16" strokeWidth=".3"/>)}
    {[1,2,3,5,6,7].flatMap(k=>[dia(k*12.5,-3),dia(k*12.5,53)])}{[1,2,3].flatMap(k=>[dia(-3,k*12.5),dia(103,k*12.5)])}
    {POCK.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={i===d.pocket?3.4:2.6} fill={i===d.pocket?'#e8a33d':'#06191a'}/>)}
    {d.leave&&<><circle cx={d.leave.x} cy={d.leave.y} r={d.leave.tol} fill="rgba(232,163,61,.2)" stroke="#e8a33d" strokeWidth=".5" strokeDasharray="1.5 1"/><circle cx={d.leave.x} cy={d.leave.y} r="1" fill="#e8a33d"/></>}
    {m&&cue&&<line x1={cue.x} y1={cue.y} x2={m.g.x} y2={m.g.y} stroke="#fff" strokeWidth=".5" strokeDasharray="1.5 1.2"/>}
    {m&&!small&&m.obj>1e-3&&(()=>{const o=m.route[0],ux=(o.x-m.route[1].x)/m.obj,uy=(o.y-m.route[1].y)/m.obj,s=rail(o.x,o.y,ux,uy);return <line x1={o.x} y1={o.y} x2={o.x+ux*s} y2={o.y+uy*s} stroke="#9fd0e6" strokeOpacity=".3" strokeWidth=".4" strokeDasharray="1 1.5"/>})()}
    {m&&<line x1={m.route[0].x} y1={m.route[0].y} x2={m.route[1].x} y2={m.route[1].y} stroke="#9fd0e6" strokeWidth=".5" strokeDasharray="1.5 1.2"/>}
    {m&&m.tan&&!small&&(()=>{const t=m.tan,s=rail(m.g.x,m.g.y,t.x,t.y),b=rail(m.g.x,m.g.y,-t.x,-t.y);return <line x1={m.g.x-t.x*b} y1={m.g.y-t.y*b} x2={m.g.x+t.x*s} y2={m.g.y+t.y*s} stroke="#fff" strokeOpacity=".3" strokeWidth=".4" strokeDasharray="1 1.5"/>})()}
    {m&&(d.path.length>0||d.leave)&&<polyline points={[m.g,...d.path,...(d.leave?[d.leave]:[])].map((p:any)=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#e8a33d" strokeWidth=".6" strokeDasharray="1.5 1.2"/>}
    {m&&d.path.map((p:any,i:number)=><circle key={i} cx={p.x} cy={p.y} r="1.1" fill="#e8a33d"/>)}
    {m&&<circle cx={m.g.x} cy={m.g.y} r={r} fill="none" stroke="#fff" strokeWidth=".5" strokeDasharray="1 .8"/>}
    {d.balls.map((b:any)=><g key={b.n}><circle cx={b.x} cy={b.y} r={r} fill={BC[b.n]} stroke={b.n===0?'#0b1a1b':'#fff'} strokeWidth=".5"/>{(sel===b.n||b.n===d.target)&&<circle cx={b.x} cy={b.y} r={r+1} fill="none" stroke={sel===b.n?'#e8a33d':'#9fd0e6'} strokeWidth=".6"/>}
      {sel===b.n&&!small&&<text x={b.x} y={b.y-2.6} textAnchor="middle" fontSize="3" fill="#fff">{b.n===0?'CB':b.n}</text>}</g>)}</svg>;
}
export const POW=['Pocket speed','Very soft','Soft','Medium','Firm','Hard','Max power'];
export const pw=(d:any)=>d.pw??Math.round((d.speed??2)*6/4);   // legacy 5-step speed mapped onto 7 steps
// 7-step vertical bar. Steps below `min` stay visible but dimmed and can't be picked. Fixed width/label height so a changing label never moves neighbouring controls.
export function Power({v,set,min=0}:any){
  const upd=(e:any)=>{const r=e.currentTarget.getBoundingClientRect(),i=Math.max(0,Math.min(6,6-Math.floor((e.clientY-r.top)/r.height*7)));if(i>=min)set(i)};
  return <div style={{textAlign:'center',width:96,flex:'none'}}><div className="n">Power</div>
    <div style={{width:44,height:170,display:'flex',flexDirection:'column-reverse',gap:3,touchAction:'none',margin:'4px auto'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);upd(e)}} onPointerMove={e=>{if(e.buttons)upd(e)}}>
      {POW.map((_,i)=><div key={i} style={{flex:1,borderRadius:4,background:i<=v?`hsl(${150-i*22} 55% 45%)`:'var(--chip)',opacity:i<min?.35:1}}/>)}</div>
    <div className="n" style={{height:18,whiteSpace:'nowrap'}}><b>{POW[v]}</b></div></div>;
}
function Editor({init,id,players,shots,onDone,flag}:any){
  const [d,setD]=useState<any>(init),[mode,setMode]=useState('balls'),[sel,setSel]=useState<number|null>(null);
  const drag=useRef<any>(null),[was]=useState(()=>JSON.stringify(init));
  // Leaving (‹ button or Back) asks first only when the diagram/fields changed; returns false to veto the Back press.
  const leave=async()=>{if(JSON.stringify(d)!==was&&!await ask('Discard your unsaved changes to this shot?','Discard'))return false;onDone()};
  useBack(true,leave);
  const pt=(e:any)=>{const r=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*110-5,y:(e.clientY-r.top)/r.height*60-5}};
  const hit=(p:any)=>d.balls.map((b:any)=>({b,k:Math.hypot(b.x-p.x,b.y-p.y)})).filter((h:any)=>h.k<4).sort((a:any,b:any)=>a.k-b.k)[0]?.b;
  const cl=(v:number,m:number)=>Math.max(BR,Math.min(m-BR,v));
  const snap=(p:any)=>({x:p.x<3?0:p.x>97?100:p.x,y:p.y<3?0:p.y>47?50:p.y});
  const put=(n:number,p:any)=>setD((x:any)=>({...x,balls:x.balls.some((b:any)=>b.n===n)?x.balls.map((b:any)=>b.n===n?{...b,x:cl(p.x,100),y:cl(p.y,50)}:b):[...x.balls,{n,x:cl(p.x,100),y:cl(p.y,50)}]}));
  const down=(e:any)=>{e.currentTarget.setPointerCapture(e.pointerId);const p=pt(e);
    const pi=d.path.findIndex((q:any)=>Math.hypot(q.x-p.x,q.y-p.y)<3.5);
    if(pi>=0){drag.current={k:'path',i:pi};return}
    if(d.leave&&Math.hypot(d.leave.x-p.x,d.leave.y-p.y)<3.5){drag.current={k:'leave'};return}
    const h=hit(p);
    if(h){drag.current={k:'ball',n:h.n};if(mode==='target'&&h.n!==0)setD({...d,target:h.n});else if(mode==='balls')setSel(h.n);return}
    if(mode==='balls'){if(sel!==null)put(sel,p)}
    else if(mode==='target'){const pk=POCK.findIndex(q=>Math.hypot(q[0]-p.x,q[1]-p.y)<7);if(pk>=0)setD({...d,pocket:pk})}
    else if(mode==='path'){if(d.path.length<4)setD({...d,path:[...d.path,snap(p)]})}
    else setD({...d,leave:{x:p.x,y:p.y,tol:d.leave?.tol??6}});
  };
  const mv=(e:any)=>{const g=drag.current;if(!g)return;const p=pt(e);
    if(g.k==='ball')put(g.n,p);
    else if(g.k==='path')setD((x:any)=>({...x,path:x.path.map((q:any,i:number)=>i===g.i?snap(p):q)}));
    else setD((x:any)=>({...x,leave:{...x.leave,x:p.x,y:p.y}}));
  };
  const pick=(n:number)=>{setSel(n);setMode('balls');if(!d.balls.some((b:any)=>b.n===n))put(n,{x:30+n*4,y:25})};
  const m=measure(d);
  const hint:any={balls:'Pick a ball below, tap the table to place it, drag to move.',target:'Tap the object ball, then tap the pocket it should go in.',path:'Tap where the cue ball travels after contact, in order. Rail hits snap to the cushion. Faint line = natural stun path. Drag any point to adjust.',leave:'Tap where the cue ball should end up.'};
  return <>
    <div className="hdr"><button className="back" onClick={leave}>‹ Catalogue</button><b>{title(d,shots,id)}</b></div>
    {flag&&(flag.d.photo||flag.d.note)&&<div className="card">{flag.d.photo&&<Photo src={flag.d.photo} style={{width:'100%',height:'auto',maxHeight:'70vh',objectFit:'contain',borderRadius:8}}/>}{flag.d.note&&<div className="n" style={{marginTop:6}}>Flag note: {flag.d.note}</div>}</div>}
    <div className="card"><Table d={d} sel={sel} handlers={{onPointerDown:down,onPointerMove:mv,onPointerUp:()=>{drag.current=null}}}/>
      <div className="row" style={{marginTop:8}}>{['balls','target','leave','path'].map(k=><button key={k} className={'chip'+(mode===k?' on':'')} onClick={()=>setMode(k)}>{k[0].toUpperCase()+k.slice(1)}</button>)}</div>
      <div className="n">{hint[mode]}</div>
      {mode==='balls'&&<><div className="row">{[0,1,2,3,4,5,6,7,8,9].map(n=><button key={n} className={'chip'+(sel===n?' on':'')} style={{minWidth:34,padding:'9px 2px',opacity:d.balls.some((b:any)=>b.n===n)?1:.55}} onClick={()=>pick(n)}>{n===0?'CB':n}</button>)}</div>
        {sel!==null&&d.balls.some((b:any)=>b.n===sel)&&<button className="link" onClick={()=>{setD({...d,balls:d.balls.filter((b:any)=>b.n!==sel),target:d.target===sel?null:d.target});setSel(null)}}>Remove selected ball</button>}</>}
      {mode==='target'&&<div className="n">Target: {d.target!=null?'ball '+d.target:'—'} → {d.pocket!=null?PNAME[d.pocket]+' pocket':'—'}</div>}
      {mode==='path'&&<button className="link" onClick={()=>setD({...d,path:d.path.slice(0,-1)})}>Undo last point</button>}
      {mode==='leave'&&<div className="row">{[3,6,9].map(t=><button key={t} className={'chip'+(d.leave?.tol===t?' on':'')} onClick={()=>d.leave&&setD({...d,leave:{...d.leave,tol:t}})}>{['Tight','Medium','Loose'][t/3-1]}</button>)}<button className="link" onClick={()=>setD({...d,leave:null})}>Clear</button></div>}
    </div>
    <div className="card"><h2>Measured</h2>{m?<div className="tags"><span className="tag f">Cut {Math.round(m.cut)}°</span><span className="tag g">Cue ball travel {dm(m.cue)} diamonds</span><span className="tag g">Object ball travel {dm(m.obj)} diamonds</span>{m.after>0&&<span className="tag g">Cue ball after contact {dm(m.after)} diamonds{m.rails?` · ${m.rails} rail${m.rails>1?'s':''}`:''}</span>}</div>:<div className="n">Set a target ball and pocket to get the ghost ball, cut angle and distances.</div>}
      {m&&m.cut>85&&<div className="n">Cut over 85° · not makeable</div>}</div>
    <div className="card"><h2>Cue ball</h2><div style={{display:'flex',gap:18,alignItems:'center',justifyContent:'center'}}>
      <div style={{width:170,flex:'none'}}><Tip tip={d.tip} set={(t:number[])=>setD({...d,tip:t})}/><div className="n" style={{textAlign:'center',height:18,whiteSpace:'nowrap'}}>{tipLabel(d.tip)}</div></div>
      <Power v={pw(d)} set={(i:number)=>setD({...d,pw:i})}/></div></div>
    <div className="card"><label>Tag (optional)<input list="tags" value={d.tag||''} onChange={e=>setD({...d,tag:e.target.value})} placeholder="e.g. Bank, Cut, Safety"/></label><datalist id="tags">{[...new Set(shots.map((x:any)=>x.d.tag).filter(Boolean))].map((x:any)=><option key={x} value={x}/>)}</datalist>
      <label>Name (optional)<input value={d.name} onChange={e=>setD({...d,name:e.target.value})} placeholder="e.g. Long cut to the 7"/></label>
      <label>Shot by<select value={d.by} onChange={e=>setD({...d,by:e.target.value})}>{players.map((p:any)=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></label>
      <label>Note<input value={d.note} onChange={e=>setD({...d,note:e.target.value})}/></label>
      <button className="go" onClick={async()=>{let tg=(d.tag||'').trim();const ex=shots.find((x:any)=>x.d.tag&&x.d.tag.toLowerCase()===tg.toLowerCase());if(ex)tg=ex.d.tag;const sid=id||uid();await save('shot',{...d,tag:tg,pw:pw(d),speed:undefined,tagNo:undefined},sid);if(flag&&flag.d.status!=='converted')await save('flag',{...flag.d,status:'converted',shot:sid},flag.id);onDone()}}>Save shot</button>
      {id&&<button className="ghost danger" style={{marginTop:8}} onClick={async()=>{if(await ask('Delete this shot?','Delete shot')){await drop(id);onDone()}}}>Delete shot</button>}</div></>;
}
export const ShotCard=({s,all,nm,onClick,sub}:any)=>{const m=measure(s.d);return <button className="card shotcard" onClick={onClick}>
  <div style={{width:140,flex:'none'}}><Table d={s.d} small/></div>
  <div><b>{title(s.d,all,s.id)}</b><div className="n">by {nm(s.d.by)} · {POW[pw(s.d)]}</div>{sub&&<div className="n">{sub}</div>}
    {m&&<div className="n">Cut {Math.round(m.cut)}° · cue {dm(m.cue)}◇ · object {dm(m.obj)}◇</div>}</div></button>};
// Pending flags = flag records whose status isn't 'converted' (older flags have no status). Converting keeps the flag and stores the new shot id on it.
function Flags({fgs,ss,onBack,onCreate}:any){
  const pl=useLiveQuery(()=>ofType('player'),[])||[],se=useLiveQuery(()=>ofType('session'),[])||[];
  const nm=(id:string)=>pl.find(p=>p.id===id)?.d.name??'—',tm=(x:any)=>x.d.t??x.u;
  const ctx=(x:any)=>{const s=se.find(q=>q.id===x.d.s);return [s?(s.d.name||new Date(s.d.start).toLocaleDateString()):'',x.d.rack?`rack ${x.d.rack}`:'',nm(x.d.by)].filter(Boolean).join(' · ')};
  const at=(x:any)=>new Date(tm(x)).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const pend=fgs.filter((x:any)=>x.d.status!=='converted').sort((a:any,b:any)=>tm(b)-tm(a)),done=fgs.filter((x:any)=>x.d.status==='converted').sort((a:any,b:any)=>tm(b)-tm(a));
  return <><button className="back" onClick={onBack}>‹ Shots</button><h1>Flagged shots</h1>
    {!pend.length&&<p className="n">Nothing waiting. Tap ⚑ Flag shot during a visit to capture one.</p>}
    {pend.map((x:any)=><div key={x.id} className="card">{x.d.photo&&<Photo src={x.d.photo} style={{width:'100%',height:'auto',maxHeight:'70vh',objectFit:'contain',borderRadius:8,marginBottom:8}}/>}
      <div>{x.d.note||<span className="n">No note</span>}</div><div className="n">{at(x)} · {x.d.venue||'No venue'}</div><div className="n">{ctx(x)}</div>
      <div className="row" style={{marginTop:8}}><button className="go sm" onClick={()=>onCreate(x)}>Create shot</button><button className="ghost danger" onClick={async()=>{if(await ask('Delete this flag?','Delete flag'))drop(x.id)}}>Delete</button></div></div>)}
    {done.length>0&&<><h2 style={{marginTop:16}}>Converted ({done.length})</h2>{done.map((x:any)=>{const sh=ss.find((q:any)=>q.id===x.d.shot);return <div key={x.id} className="srow"><span>{x.d.note||'Flag'} <span className="n">{at(x)}</span></span><b>→ {sh?title(sh.d,ss,sh.id):'deleted shot'}</b></div>})}</>}</>;
}
export default function Shots({seg}:any){
  const ss=useLiveQuery(()=>ofType('shot'),[])||[],ps=(useLiveQuery(()=>ofType('player'),[])||[]).filter(p=>!p.d.archived);
  const [f,setF]=useState('all'),[tf,setTf]=useState(''),[ed,setEd]=useState<any>(null),[fv,setFv]=useState(false),fgs=useLiveQuery(()=>ofType('flag'),[])||[],pend=fgs.filter(x=>x.d.status!=='converted');
  useBack(fv,()=>setFv(false));
  const nm=(id:string)=>ps.find(p=>p.id===id)?.d.name??'—';
  if(ed)return <Editor key={ed.id||'new'+(ed.flag?.id||'')} id={ed.id} init={ed.d} flag={ed.flag} players={ps} shots={ss} onDone={()=>setEd(null)}/>;
  const next=Math.max(0,...ss.map(s=>s.d.no))+1;
  if(fv)return <Flags fgs={fgs} ss={ss} onBack={()=>setFv(false)} onCreate={(x:any)=>setEd({d:{...blank(),no:next,by:x.d.by||ps[0]?.id||'',note:x.d.note||''},flag:x})}/>;
  const list=ss.filter(s=>(f==='all'||s.d.by===f)&&(!tf||s.d.tag===tf)).sort((a,b)=>a.d.no-b.d.no);
  return <>{seg}<div className="hdr"><h1>Shots</h1><div className="row" style={{flexWrap:'nowrap'}}>{fgs.length>0&&<button className="ghost" onClick={()=>setFv(true)}>⚑ Flagged ({pend.length})</button>}<button className="go sm" onClick={()=>setEd({d:{...blank(),no:next,by:ps[0]?.id||''}})}>New shot</button></div></div>
    <select value={f} onChange={e=>setF(e.target.value)} style={{marginBottom:12}}><option value="all">All players</option>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>
    <select value={tf} onChange={e=>setTf(e.target.value)} style={{marginBottom:12}}><option value="">All tags</option>{[...new Set(ss.map(s=>s.d.tag).filter(Boolean))].sort().map((x:any)=><option key={x} value={x}>{x}</option>)}</select>
    {!list.length&&<p className="n">No shots yet. Tap New shot to diagram one.</p>}
    {list.map(s=><ShotCard key={s.id} s={s} all={ss} nm={nm} onClick={()=>setEd(s)}/>)}</>;
}
