import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop,uid} from './db';
import {shrink} from './photo';
import Photo from './Photo';
import {derive,mate,sName} from './engine';
import {sync} from './sync';
import Avatar from './Avatar';
import {Sheet} from './ui';
import {Tip,Power,POW,tipLabel} from './Shots';
const BC=['','#c9a200','#1f4fa3','#c4513d','#5b3a8c','#e07b1f','#1f7a4a','#7a2330','#222','#d9b200'];
const Z=['L3','L2','L1','C','R1','R2','R3'],C=['−3','−2','−1','½','+1','+2','+3'],ONE=['Pocketed','High of side','Low of side','Other'];
const srt=(a:number[])=>[...a].sort((x,y)=>x-y);
const Chips=({items,cur,set,w}:any)=><div className="row">{items.map((x:string,i:number)=><button key={i} className={'chip'+(cur===i?' on':'')} style={w?{minWidth:w,padding:'12px 2px'}:undefined} onClick={()=>set(i)}>{x}</button>)}</div>;

export default function Live({session,name,pr,end}:any){
  const pl:string[]=session.d.players,sid=session.id;
  const evs=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del&&r.d.s===sid).toArray().then(a=>a.sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u))),[sid])||[];
  const dirty=useLiveQuery(()=>db.recs.where('dirty').equals(1).count(),[])??0;
  const [ce,setCe]=useState(false),[msg,setMsg]=useState(''),[bz,setBz]=useState(false),[cb,setCb]=useState<[number,string]|null>(null);
  const tm:string[][]|undefined=session.d.fmt==='scotch'?session.d.teams:undefined,sn=(id:string)=>sName(session.d,id,name);
  const st=derive(pl,evs,tm);
  const other=(p:string)=>pl[1-pl.indexOf(p)];
  const last=[...evs].reverse().find(e=>e.type==='break'&&!e.d.skip)?.d;
  const k=evs.length;
  const at=st.phase==='break'?(cb&&cb[0]===k?cb[1]:st.breaker):st.shooter;   // who is at the table (breaker may be changed in the form)
  const Sc=(i:number)=>{const on=pl[i]===at;return <div className={'sc'+(on?' at':'')} aria-current={on?'true':undefined}><Avatar p={pr(pl[i])} size={32}/><div style={{minWidth:0}}><div className="nm">{sn(pl[i])}</div><div className="sn"><span className="num">{st.scores[i]}</span>{on&&<span className="cap">{st.phase==='break'?'breaking':'at table'}</span>}</div></div></div>};
  const safeOk=(i:number)=>{const e=evs[i].d;if(e.safeOk!=null)return e.safeOk;const nx=evs.slice(i+1).find(x=>x.type==='visit'&&x.d.rack===e.rack);return nx?['None','Hard'].includes(nx.d.open):null};
  const doEnd=async(withSync:boolean)=>{setBz(true);try{if(withSync)await sync(setMsg);await end();if(withSync)await sync(()=>{}).catch(()=>{})}catch(e:any){setMsg(e.message)}setBz(false)};
  return <><div className="row" style={{marginBottom:k?4:10}}><button className="ghost" disabled={!k} onClick={()=>drop(evs[k-1].id)}>Undo last</button>{dirty>0&&<span className="n">{dirty} unsynced</span>}<button className="ghost danger" style={{marginLeft:'auto'}} onClick={()=>setCe(true)}>End session</button></div>
    {k>0&&<div className="n" style={{margin:'0 0 10px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Last logged: {line(evs[k-1],sn,name)}</div>}
    {ce&&<Sheet onClose={()=>!bz&&setCe(false)}><h2>End session?</h2>{dirty>0&&<div className="n"><b>{dirty} change{dirty===1?'':'s'} not synced to GitHub.</b></div>}{msg&&<div className="n" role="status">{msg}</div>}
      <div className="row" style={{marginTop:8}}>{dirty>0?<><button className="go sm" style={{flex:1}} disabled={bz} onClick={()=>doEnd(true)}>{bz?'Syncing…':'Sync and end'}</button><button className="ghost danger" disabled={bz} onClick={()=>doEnd(false)}>End anyway</button></>:<button className="go sm danger" style={{flex:1}} disabled={bz} onClick={()=>doEnd(false)}>End session</button>}<button className="ghost" disabled={bz} onClick={()=>setCe(false)}>Cancel</button></div></Sheet>}
    {session.d.name&&<div className="n">{session.d.name}</div>}<div className="score">{Sc(0)}<div className="rk">Rack<b>{st.rack}</b></div>{Sc(1)}</div>
    {st.phase==='break'?<BreakForm key={'b'+k} st={st} sid={sid} last={last} name={sn} pn={name} other={other} session={session} onBy={(p:string)=>setCb([k,p])}/>:<VisitForm key={'v'+k} st={st} sid={sid} name={sn} pn={name} other={other} session={session}/>}
    <div className="card log"><h2>Racks</h2>{[...evs].reverse().map((e,i,a)=>{const r=e.d.rack,ix=evs.indexOf(e),ok=e.d.res==='Safe played'?safeOk(ix):undefined;
      return <div key={e.id}>{(i===0||a[i-1].d.rack!==r)&&<div className="rh">Rack {r}</div>}<div className="v">{line(e,sn,name)}{e.type==='visit'&&e.d.res==='Safe played'&&<span className="n" style={{marginLeft:6}}>{ok==null?'… pending':ok?'✓ safe held':'✗ safe failed'}</span>}</div></div>})}{!evs.length&&<div className="n">Nothing logged yet.</div>}</div></>;
}
export function line(e:any,name:(id:string)=>string,pn?:(id:string)=>string){
  const d=e.d,p:string[]=[name(d.by)],sd=d.side?'R':'L';
  if(pn&&d.bp)p[0]=pn(d.bp);if(pn&&d.sp)p.push(pn(d.sp)+' starts');   // Scotch Doubles: the individual who broke / started the visit
  if(e.type==='break'){
    if(d.skip)p.push('Break not logged');
    else p.push('Break',d.ct!=null?(d.ct===8?'straight on':`${d.ct}/8 ${sd}`):`${C[d.cut]} ${sd}`,Z[d.z],POW[4+d.spd],`1-ball ${d.one==null?'n/a':ONE[d.one].toLowerCase()}`,`${d.drops.length} dropper${d.drops.length===1?'':'s'}`,...(d.scratch?['scratch']:[]),...(d.nine?['golden break']:[]));
    return p.join(' · ');
  }
  const open=d.open?(d.open==='None'?'No shot':d.open):d.rating||'';
  if(open)p.push(open);
  if(d.board==='Problem')p.push('problem '+(d.prob?.join(',')||'?'));
  p.push(d.push?'Push out':d.won?(d.runout?'Won rack · run out':'Won rack · 9 off a combo'):d.res==='Missed'?`Missed the ${d.low}`:d.res);
  if(!(d.potted.length===0&&['Safe played','Escape hit'].includes(d.res)))p.push(`${d.potted.length} ball${d.potted.length===1?'':'s'}`);
  if(d.oo?.length)p.push('out of order '+d.oo.join(','));
  if(d.cause)p.push(d.cause);if(d.fl.length)p.push(`fluke ×${d.fl.length}`);if(d.fg)p.push(`⚑${d.fg}`);
  return p.join(' · ');
}
const KX=[0,1,2,3,4,5,6].map(i=>111.3+i*12.9);
function Kitchen({z,set}:any){
  const pick=(e:any)=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*300;set(Math.max(0,Math.min(6,Math.round((x-111.3)/12.9))))};
  return <svg viewBox="0 0 300 175" style={{width:'100%',maxWidth:440,display:'block',margin:'auto',touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pick(e)}} onPointerMove={e=>{if(e.buttons)pick(e)}}>
    <rect width="300" height="175" rx="8" fill="#0e4144"/><rect x="16" y="14" width="268" height="134" fill="#14575a"/>
    <circle cx="16" cy="148" r="11" fill="#06191a"/><circle cx="284" cy="148" r="11" fill="#06191a"/>
    {[83,150,217].map(x=><circle key={x} cx={x} cy="156" r="2.5" fill="#e8d9a8"/>)}
    <line x1="16" y1="14" x2="284" y2="14" stroke="#9fd0e6" strokeDasharray="5 4"/>
    <text x="150" y="9" textAnchor="middle" fontSize="8" fill="#9fd0e6">head string · rack is up this way ↑</text>
    <rect x="105.3" y="14" width="89.4" height="134" fill="rgba(232,163,61,.12)" stroke="#e8a33d" strokeWidth="2" strokeDasharray="6 3"/>
    {KX.map((x,i)=><circle key={i} cx={x} cy="23" r={i===z?6:2.2} fill={i===z?'#f5f2e8':'#9fd0e6'} stroke={i===z?'#e8a33d':'none'} strokeWidth="2"/>)}
    <text x="150" y="171" textAnchor="middle" fontSize="9" fill="#9fd0e6">head rail · {Z[z]}</text></svg>;
}
const ctLabel=(ct:number)=>ct===4?'half ball':ct<4?'thinner than half':'thicker than half';
function Contact({side,cf,set}:any){
  const R=40,cx=120,cy=40,p=1-cf,s=side?1:-1,gx=cx+s*2*R*p,gy=cy+2*R*Math.sqrt(1-p*p);
  const upd=(e:any)=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*240-cx,q=Math.min(1,Math.abs(x)/(2*R));set(x<0?0:1,Math.max(1,Math.min(8,Math.round((1-q)*8)))/8)};
  const lines=[1,2,3,4,5,6,7,8].flatMap(k=>(k===8?[0]:[-1,1]).map(sg=>({k,x:cx+sg*2*R*(1-k/8)})));
  return <svg viewBox="0 0 240 172" style={{width:'100%',maxWidth:320,display:'block',margin:'auto',touchAction:'none'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);upd(e)}} onPointerMove={e=>{if(e.buttons)upd(e)}}>
    {lines.map(l=><g key={l.k+'_'+l.x}><line x1={l.x} y1={cy} x2={l.x} y2="160" stroke={l.k===4?'#e8a33d':'#9fd0e6'} strokeWidth={l.k===4?2:1} strokeDasharray={l.k===4?'6 3':'2 3'} opacity={l.k===4?1:.55}/>
      {l.k===4&&<text x={l.x} y="171" textAnchor="middle" fontSize="9" fill="#e8a33d">½</text>}</g>)}
    <circle cx={cx} cy={cy} r={R} fill={BC[1]}/><text x={cx} y={cy+7} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" opacity=".6">1</text>
    <circle cx={gx} cy={gy} r={R} fill="#f5f2e8" opacity=".85" stroke="#888" strokeDasharray="4 3"/>
    <circle cx={gx} cy={gy} r="4.5" fill="#c4513d" stroke="#fff" strokeWidth="1.5"/></svg>;
}
function BreakForm({st,sid,last,name,pn,other,session,onBy}:any){
  const [by,setBy]=useState(st.breaker);const [ask,setAsk]=useState(false),[sw,setSw]=useState(false);
  const duo=session.d.fmt==='scotch',bp=duo?(sw?mate(session.d.teams,st.up[by]):st.up[by]):'';
  const [z,setZ]=useState(last?.z??1),[cf,setCf]=useState<number>(last?.cf??(last?.ct??4)/8),[side,setSide]=useState(last?.side??0),[spd,setSpd]=useState(last?.spd??1);
  const [tip,setTip]=useState<number[]>(last?.tip??[100,128]);
  const [one,setOne]=useState<number|null>(null),[drops,setDrops]=useState<number[]>([]),[scratch,setSc]=useState(false),[nine,setNine]=useState(false);
  const o=other(by);const ct=Math.max(1,Math.min(8,Math.round(cf*8)));
  const log=()=>{const cont=!scratch&&!nine&&(one===0||drops.length>0);
    save('break',{t:Date.now(),s:sid,rack:st.rack,by,...(duo?{bp}:{}),z,ct,cf,side,spd,tip,one,drops,scratch,nine,next:cont||nine?by:o})};
  const skip=(first:string)=>save('break',{t:Date.now(),s:sid,rack:st.rack,by,...(duo?{bp}:{}),skip:true,drops:[],one:null,next:first});
  return <div className="card"><div className="hdr"><b>{duo?pn(bp):name(by)} breaks</b><span><button className="link" onClick={()=>{setBy(o);setSw(false);onBy(o)}}>Change {duo?'team':'breaker'}</button>{duo&&<button className="link" style={{marginLeft:10}} onClick={()=>setSw(!sw)}>Swap shooter</button>}</span></div>
    <div className="lbl">Contact on 1-ball · drag the cue ball around the 1-ball</div><Contact side={side} cf={cf} set={(sd:number,c:number)=>{setSide(sd);setCf(c)}}/>
    <div className="n" style={{textAlign:'center'}}>{ct===8?'Straight on · no cut':`${side?'Right':'Left'} · ${ct}/8 ball · ${ctLabel(ct)}`}</div>
    <div className="lbl">Cue ball position · {Z[z]}</div><Kitchen z={z} set={setZ}/>
    <div className="lbl">Cue ball and power</div>
    <div style={{display:'flex',gap:18,alignItems:'center',justifyContent:'center'}}><div style={{width:170,flex:'none'}}><Tip tip={tip} set={setTip}/><div className="n" style={{textAlign:'center',height:18,whiteSpace:'nowrap'}}>{tipLabel(tip)}</div></div><Power v={4+spd} set={(i:number)=>setSpd(i-4)} min={4}/></div>
    <div className="lbl">1-Ball direction</div><Chips items={ONE} cur={one} set={setOne}/>
    <div className="lbl">Other balls that dropped (tap which)</div>
    <div className="strip t">{[2,3,4,5,6,7,8].map(i=><button key={i} className={'bt'+(drops.includes(i)?' pot':'')} style={{['--c' as any]:BC[i]}} onClick={()=>setDrops(drops.includes(i)?drops.filter(x=>x!==i):[...drops,i])}>{i}</button>)}</div>
    <div className="row"><button className={'chip'+(scratch?' on':'')} onClick={()=>setSc(!scratch)}>Scratch</button><button className={'chip'+(nine?' on':'')} onClick={()=>setNine(!nine)}>Golden break</button></div>
    <button className="link" onClick={()=>setAsk(!ask)}>Skip break details</button>
    {ask&&<div><div className="lbl">Who shoots first?</div><div className="row">{[by,o].map(p=><button key={p} className="chip" onClick={()=>skip(p)}>{name(p)}</button>)}</div></div>}
    <div className="stick"><button className="go" onClick={log}>Log break</button></div></div>;
}
function VisitForm({st,sid,name,pn,other,session}:any){
  const [open,setOpen]=useState(''),[board,setBoard]=useState(st.prob?.length?'Problem':'Clear'),[prob,setProb]=useState<number[]>(st.prob||[]),[res,setRes]=useState(''),[P,setP]=useState<number[]>([]);
  const [cause,setCause]=useState(''),[fl,setFl]=useState<number[]>([]),[fgs,setFgs]=useState<string[]>([]),[fm,setFm]=useState(false),[fn,setFn]=useState(''),[fph,setFph]=useState(''),[vid]=useState(uid),[fp,setFp]=useState(false),[ask,setAsk]=useState(false);
  const by=st.shooter,o=other(by),push=res==='Push out',[sw,setSw]=useState(false),duo=session.d.fmt==='scotch',sp=duo?(sw?mate(session.d.teams,st.up[by]):st.up[by]):'';
  const outsFor=(op:string)=>{const p=st.first?['Push out']:[];return !op?p:op==='None'?['Won rack','Safe played','Escape hit','Missed','Foul',...p]:['Won rack','Missed','Safe played','Foul',...p]};
  const auto=(n:number[],rs:string,op:string)=>n.includes(9)?'Won rack':(rs==='Won rack'?'':rs)||(op&&n.length?'Missed':'');
  const rem=st.table.filter((x:number)=>!P.includes(x)),won=P.includes(9);
  const sorted=srt(st.table);let j=0;while(j<sorted.length&&P.includes(sorted[j]))j++;
  const oo=sorted.slice(j).filter(x=>P.includes(x));
  const tap=(i:number)=>{
    if(!st.table.includes(i)||res==='Escape hit'||(push&&i===9))return;
    let n=[...P];
    if(n.includes(i))n=n.filter(x=>x!==i);
    else{const m=n.length?Math.max(...n):0;if(i>m)st.table.forEach((x:number)=>{if(x>m&&x<=i)n.push(x)});else n.push(i)}
    setP(n);setRes(auto(n,res,open));
  };
  const pick=(r:string)=>{setRes(r);if(r==='Won rack')setP([...st.table]);else if(r==='Escape hit')setP([]);else setP(P.filter(x=>x!==9))};
  const choose=(op:string)=>{setOpen(op);const ok=res==='Won rack'||outsFor(op).includes(res);setRes(ok?auto(P,res,op):auto(P,'',op))};
  const finish=async(pass:boolean)=>{
    await save('visit',{t:Date.now(),s:sid,rack:st.rack,by,...(duo?{sp}:{}),open:push?'':open,board:push?'':board,prob:board==='Problem'?prob:[],res:won?'Won rack':res,potted:P,oo,low:rem[0],cause,fl,fg:fgs.length,won,first:st.first,push,next:won?by:push&&pass?by:o,runout:won&&rem.length===0&&!oo.length},vid);
  };
  // Flag = capture now, diagram later. Saved at once (not with the visit) with the context the form already knows; status 'pending' until converted to a shot in the library.
  const pickPh=async(e:any)=>{const f=e.target.files?.[0];e.target.value='';if(f)setFph(await shrink(f))};
  const addFlag=async()=>{const id=await save('flag',{t:Date.now(),s:sid,rack:st.rack,visit:vid,by:(duo?sp:by).split('~')[0],venueId:session.d.venueId||'',venue:session.d.venue||'',table:st.table,open,note:fn.trim(),photo:fph||undefined,status:'pending'});setFgs([...fgs,id]);setFm(false);setFn('');setFph('')};
  const list=outsFor(open);
  return <div className="card"><div className="hdr"><b>{name(by)}{st.first?' · first shot':' at the table'}</b>{duo&&<button className="link" onClick={()=>setSw(!sw)}>{pn(sp)} starts · swap</button>}</div>
    <div className="strip t">{[1,2,3,4,5,6,7,8,9].map(i=>{const on=st.table.includes(i);return <button key={i} disabled={!on||(push&&i===9)} className={'bt'+(!on?' gone':P.includes(i)?' pot':'')+((res==='Missed'||res==='Foul')&&!won&&i===rem[0]?' now':'')+(fl.includes(i)?' fl':'')} style={{['--c' as any]:BC[i]}} onClick={()=>tap(i)}>{i}</button>})}</div>
    <div className="n">{won?`9 down · rack won${rem.length?` (${rem.join(', ')} still up)`:' · run out'}`:P.length?`Potted ${srt(P).join(', ')}${oo.length?` · out of order: ${oo.join(', ')}`:''}`:'Tap the last ball you potted. Tap a potted ball to take it back.'}</div>
    <div className="lbl">Opening shot</div>
    <div className="row">{[['Easy','Clear shot'],['Hard','Tough shot'],['None','No shot']].map(([v,t])=><button key={v} className={'chip'+(open===v?' on':'')} onClick={()=>choose(v)}>{v==='None'?'No shot':v}<small>{v==='None'?'\u00a0':t}</small></button>)}</div>
    {open&&<><div className="lbl">Board state</div>
      <div className="row">{['Clear','Problem'].map(b=><button key={b} className={'chip'+(board===b?' on':'')} onClick={()=>setBoard(b)}>{b==='Clear'?'Clean':b}</button>)}</div>
      {board==='Problem'&&<><div className="lbl">Which ball(s) are the problem?</div><div className="row">{st.table.map((i:number)=><button key={i} className={'chip'+(prob.includes(i)?' on':'')} style={{minWidth:40,padding:'10px 4px'}} onClick={()=>setProb(prob.includes(i)?prob.filter(x=>x!==i):[...prob,i])}>{i}</button>)}</div></>}</>}
    <div className="lbl">What happened</div>
    <div className="row">{list.length?list.map(x=><button key={x} className={'chip'+(res===x?' on':'')} onClick={()=>pick(x)}>{x}</button>):<span className="n">Pick the opening shot first.</span>}</div>
    {['Missed','Foul'].includes(res)&&open!=='None'&&<><div className="lbl">Cause (required)</div><div className="row">{['Pot','Position','Decision','Other'].map(c=><button key={c} className={'chip'+(cause===c?' on':'')} onClick={()=>setCause(cause===c?'':c)}>{c}</button>)}</div></>}
    <div className="lbl">Optional</div>
    <div className="row"><button className="chip opt" onClick={()=>setFm(true)}>⚑ Flag shot<small>Save for the library</small></button><button className="chip opt" onClick={()=>setFp(true)}>✦ Fluke<small>Lucky pot · stat note</small></button></div>
    {fp&&<><div className="lbl">Which ball fluked?</div><div className="row">{[...st.table.map(String),'Skip'].map(b=><button key={b} className="chip" style={{minWidth:40}} onClick={()=>{setFl([...fl,+b||0]);setFp(false)}}>{b}</button>)}</div></>}
    <div className="tags">{fl.map((f,i)=><span key={i} className="tag f">✦ Fluke{f?' · '+f:''}<button className="x" onClick={()=>setFl(fl.filter((_,q)=>q!==i))}>✕</button></span>)}{fgs.length>0&&<span className="tag g">⚑ Flags: {fgs.length}<button className="x" onClick={()=>{drop(fgs[fgs.length-1]);setFgs(fgs.slice(0,-1))}}>✕</button></span>}</div>
    {fm&&<Sheet><h2>Flag shot</h2>
      <input value={fn} onChange={e=>setFn(e.target.value)} placeholder="Quick note (optional)"/>
      <div className="row" style={{margin:'10px 0'}}><label className="chip opt">📷 {fph?'Retake':'Camera'}<input type="file" accept="image/*" capture="environment" className="file" onChange={pickPh}/></label><label className="chip opt">🖼 Choose<input type="file" accept="image/*" className="file" onChange={pickPh}/></label>{fph&&<button className="chip opt" onClick={()=>setFph('')}>Remove photo</button>}</div>
      {fph&&<Photo src={fph} style={{width:'100%',height:'auto',maxHeight:'45vh',objectFit:'contain',borderRadius:8,marginBottom:10}}/>}
      <div className="row"><button className="ghost" onClick={()=>{setFm(false);setFn('');setFph('')}}>Cancel</button><button className="go sm" style={{flex:1}} onClick={addFlag}>Save flag</button></div></Sheet>}
    <div className="stick"><button className="go" disabled={!res||(!open&&!push)||(['Missed','Foul'].includes(res)&&open!=='None'&&!cause)} onClick={()=>push?setAsk(true):finish(false)}>{won?`Log visit · ${name(by)} wins rack ${st.rack}`:'Log visit'}</button></div>
    {ask&&<Sheet onClose={()=>setAsk(false)}><h2>Push out played</h2><div className="n">Potted balls stay down. The 9 is respotted.</div><div className="row"><button className="chip" onClick={()=>finish(false)}>{name(o)} shoots it</button><button className="chip" onClick={()=>finish(true)}>Passes it back</button></div><button className="ghost" style={{marginTop:10}} onClick={()=>setAsk(false)}>Cancel</button></Sheet>}</div>;
}
