import {useState,useRef,useLayoutEffect} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,ofType} from './db';
import Venues from './Venues';
import Avatar from './Avatar';
import Cropper from './Cropper';
import Stats from './Review';
import Shots from './Shots';
import Decks from './Decks';
import {unfinished} from './Practice';
import Live from './Live';
import Settings from './Settings';
import History from './History';
import {ask,tell,Dialogs,Active,useBack} from './ui';
import {getCfg,setCfg,sync} from './sync';
const COLORS=['#14575a','#e8a33d','#c4513d','#5b3a8c','#1f4fa3','#2f8f5b'];
type Tab='play'|'review'|'shots'|'more';
const LABEL:Record<Tab,string>={play:'Play',review:'Review',shots:'Train',more:'More'};
const ICONS:Record<Tab,any>={
  play:<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/></svg>,
  review:<svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>,
  shots:<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>,
  more:<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/></svg>};
// Play and Shots stay mounted (hidden) so a half-filled visit, shot diagram or practice run survives a tab switch; Review and More remount. Each tab's scroll position is remembered.
export default function App(){
  const [tab,setTab]=useState<Tab>('play'),[mi,setMi]=useState(''),mr=useRef<HTMLElement>(null),pos=useRef<Record<string,number>>({});
  const live=useLiveQuery(()=>ofType('session').then(r=>r.some(s=>!s.d.end)),[]),fl=useLiveQuery(()=>ofType('flag').then(r=>r.filter(x=>x.d.status!=='converted').length),[]),dy=useLiveQuery(()=>db.recs.where('dirty').equals(1).count(),[]),pu=useLiveQuery(unfinished,[]);
  const bd:Partial<Record<Tab,number|true>>={play:live?true:undefined,shots:pu?true:fl||undefined,more:dy||undefined},note:Partial<Record<Tab,string>>={play:'session in progress',shots:pu?'practice in progress':'flagged',more:'unsynced'};
  const go=(t:Tab)=>{if(t===tab)return;if(mr.current)pos.current[tab]=mr.current.scrollTop;setMi('');setTab(t)};
  const toPlayers=()=>{go('more');setMi('players')};
  useLayoutEffect(()=>{if(mr.current)mr.current.scrollTop=pos.current[tab]||0},[tab]);
  return <div className="app"><main ref={mr}>
    <Active.Provider value={tab==='play'}><div hidden={tab!=='play'}><Session toPlayers={toPlayers}/></div></Active.Provider>
    <Active.Provider value={tab==='shots'}><div hidden={tab!=='shots'}><ShotsHome fl={fl||0}/></div></Active.Provider>
    {tab==='review'&&<Review/>}{tab==='more'&&<More init={mi}/>}</main>
    <nav>{(Object.keys(ICONS) as Tab[]).map(t=>{const b=bd[t];return <button key={t} aria-label={LABEL[t]+(b?`, ${b===true?'':b+' '}${note[t]}`:'')} aria-current={tab===t?'page':undefined} className={tab===t?'on':''} onClick={()=>go(t)}>{ICONS[t]}<span className="lb">{LABEL[t]}</span>{b?<i className={'bdg'+(b===true?' dot':'')}>{b===true?'':b>99?'99+':b}</i>:null}</button>})}</nav><Dialogs/></div>;
}
function Seg({items,cur,set}:any){return <div className="row" style={{marginBottom:12}}>{items.map(([k,l]:string[])=><button key={k} className={'chip'+(cur===k?' on':'')} onClick={()=>set(k)}>{l}</button>)}</div>}
function ShotsHome({fl}:{fl:number}){const [v,setV]=useState('decks'),seg=<Seg items={[['decks','Decks'],['shots','Library'],['flags','Flagged'+(fl?` (${fl})`:'')]]} cur={v} set={setV}/>;return v==='decks'?<Decks seg={seg}/>:<Shots seg={seg} flags={v==='flags'}/>}
function Review(){const [v,setV]=useState('sessions');return <><Seg items={[['sessions','Match history'],['players','Players'],['breaks','Breaks']]} cur={v} set={setV}/>
  {v==='sessions'?<History/>:<Stats kind={v}/>}</>}
function More({init}:{init?:string}){
  const [v,setV]=useState(init||''),dy=useLiveQuery(()=>db.recs.where('dirty').equals(1).count(),[])||0;const items:[string,string][]=[['players','Players'],['venues','Venues'],['sync','Sync'],['settings','Settings']];
  useBack(!!v,()=>setV(''));
  if(v)return <><button className="back" onClick={()=>setV('')}>‹ More</button>{v==='players'?<Players/>:v==='venues'?<Venues/>:v==='sync'?<Sync/>:<Settings/>}</>;
  return <><h1>More</h1>{items.map(([k,l])=><button key={k} className="nav-row" onClick={()=>setV(k)}><span>{l}{k==='sync'&&dy>0&&<span className="n"> · {dy} unsynced</span>}</span><span>›</span></button>)}</>;
}
function Players(){
  const ps=useLiveQuery(()=>ofType('player'),[])||[];
  const [name,setName]=useState('');
  const add=async()=>{if(!name.trim())return;await save('player',{name:name.trim(),color:COLORS[ps.length%COLORS.length],archived:false});setName('')};
  const [crop,setCrop]=useState<any>(null);
  useBack(!!crop,()=>setCrop(null));
  const pickPic=(e:any,p:any)=>{const f=e.target.files?.[0];e.target.value='';if(f)setCrop({f,p})};
  return <>{crop&&<Cropper file={crop.f} onCancel={()=>setCrop(null)} onDone={async(u:string)=>{await save('player',{...crop.p.d,pic:u},crop.p.id);setCrop(null)}}/>}<h1>Players</h1>
    {!ps.length&&<p className="n">Create the two of you to get started.</p>}
    {ps.map(p=><div className={'card row'+(p.d.archived?' arch':'')} key={p.id+p.u}>
      <label className="avatar-btn"><Avatar p={p} size={44}/><input type="file" accept="image/*" className="file" onChange={e=>pickPic(e,p)}/></label>
      <input defaultValue={p.d.name} onBlur={e=>e.target.value.trim()&&e.target.value!==p.d.name&&save('player',{...p.d,name:e.target.value.trim()},p.id)}/>
      <button className="ghost" onClick={()=>save('player',{...p.d,archived:!p.d.archived},p.id)}>{p.d.archived?'Restore':'Archive'}</button><button className="ghost danger" onClick={async()=>{const used=(await ofType('session')).filter(s=>s.d.players.includes(p.id)||(s.d.teams||[]).flat().includes(p.id)).length;if(used){await tell(`${p.d.name} is in ${used} session${used>1?'s':''}. Archive instead, or delete those sessions first.`);return}if(await ask(`Delete ${p.d.name}?`,'Delete player'))drop(p.id)}}>Delete</button></div>)}
    <div className="card row"><input placeholder="New player name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}/><button className="go sm" onClick={add}>Add</button></div></>;
}
// Solo practice: seat 2 is a virtual player id `<id>~2`, so the engine sees two sides. Always look players up through base().
const base=(id:string)=>id.split('~')[0];
function Session({toPlayers}:{toPlayers:()=>void}){
  const all=useLiveQuery(()=>ofType('player'),[])||[];
  const ps=all.filter(p=>!p.d.archived);
  const ss=useLiveQuery(()=>ofType('session'),[])||[];
  const vs=useLiveQuery(()=>ofType('venue'),[])||[];
  const active=ss.find(s=>!s.d.end);
  // Start form: defaults are derived from the latest session (archived players / deleted venues fall back to blank); `o` holds only what the user changed.
  const [o,setO]=useState<any>({}),[sname,setN]=useState('');
  const last=[...ss].sort((x,y)=>(y.d.start||0)-(x.d.start||0))[0],okP=(id?:string)=>id&&ps.some(p=>p.id===id)?id:'',lp=last?.d.players||[],lt=last?.d.teams;
  const df:any=last?{fmt:last.d.fmt==='scotch'?'scotch':'singles',a:okP(lp[0]),b:last.d.solo?'solo':okP(lp[1]),a2:okP(lt?.[0]?.[1]),b2:okP(lt?.[1]?.[1]),venue:vs.find(v=>v.id===last.d.venueId)?.id||vs.find(v=>v.d.name===last.d.venue)?.id||'',tbl:last.d.table??''}:{fmt:'singles',a:'',b:'',a2:'',b2:'',venue:'',tbl:''};
  const g=(k:string)=>k in o?o[k]:df[k],set=(k:string,x:string)=>setO((p:any)=>({...p,[k]:x})),st=(k:string)=>(x:string)=>set(k,x);
  const a=g('a'),b=g('b'),a2=g('a2'),b2=g('b2'),venue=g('venue'),tbl=g('tbl'),fmt=g('fmt'),sc=fmt==='scotch';
  const venues=[...new Set(ss.map(s=>s.d.venue as string).filter(Boolean))];
  const nm=(id:string)=>(all.find(p=>p.id===base(id))?.d.name??'?')+(id.includes('~')?' (2)':'');
  if(active)return <Live session={active} name={nm} pr={(id:string)=>all.find(p=>p.id===base(id))} end={()=>save('session',{...active.d,end:Date.now()},active.id)}/>;
  const ok=sc?[a,a2,b,b2].every(Boolean)&&new Set([a,a2,b,b2]).size===4&&b!=='solo':a&&b&&a!==b;
  const opts=ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>);
  const sel=(l:string,v:string,f:any,solo?:boolean)=><label>{l}<select value={v} onChange={e=>f(e.target.value)}><option value="">Choose…</option>{solo&&<option value="solo">Myself (solo practice)</option>}{opts}</select></label>;
  return <><h1>New session</h1>
    {!ps.length?<div className="card"><p className="n">Add at least two players to get started.</p><button className="go" onClick={toPlayers}>Add players</button></div>:<div className="card">
      <label>Session name (optional)<input value={sname} onChange={e=>setN(e.target.value)} placeholder="e.g. Filler vs Shaw, WCS final"/></label>
      <Seg items={[['singles','Singles'],['scotch','Scotch Doubles']]} cur={fmt} set={(v:string)=>{set('fmt',v);if(v==='scotch'&&b==='solo')set('b','')}}/>
      {sel(sc?'Our team · Player A':'Player 1',a,st('a'))}{sc&&sel('Our team · Player B',a2,st('a2'))}{sel(sc?'Opponent · Player A':'Player 2',b,st('b'),!sc)}{sc&&sel('Opponent · Player B',b2,st('b2'))}
      <label>Venue<select value={venue} onChange={e=>set('venue',e.target.value)}><option value="">No venue</option>{vs.map(v=><option key={v.id} value={v.id}>{v.d.name}</option>)}</select></label>{!vs.length&&<div className="n">Add venues in More → Venues.</div>}
      <label>Table number<input value={tbl} onChange={e=>set('tbl',e.target.value)} inputMode="numeric"/></label>
      <button className="go" disabled={!ok} onClick={()=>save('session',{name:sname.trim(),players:sc?[a,b]:[a,b==='solo'?a+'~2':b],solo:!sc&&b==='solo',...(sc?{fmt:'scotch',teams:[[a,a2],[b,b2]]}:{}),venue:vs.find(v=>v.id===venue)?.d.name??'',venueId:venue,table:tbl,start:Date.now()}).then(()=>{setO({});setN('')})}>Start session</button></div>}</>;
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
