import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,save,drop} from './db';
import {derive} from './engine';
const BC=['','#c9a200','#1f4fa3','#c4513d','#5b3a8c','#e07b1f','#1f7a4a','#7a2330','#222','#d9b200'];
const Z=['L3','L2','L1','C','R1','R2','R3'],C=['−3','−2','−1','½','+1','+2','+3'],SP=['Controlled','Medium','Power'],ONE=['Pocketed','High of side','Low of side','Other'];
const srt=(a:number[])=>[...a].sort((x,y)=>x-y);
const Chips=({items,cur,set,w}:any)=><div className="row">{items.map((x:string,i:number)=><button key={i} className={'chip'+(cur===i?' on':'')} style={w?{minWidth:w,padding:'12px 2px'}:undefined} onClick={()=>set(i)}>{x}</button>)}</div>;
const tipLabel=(t:number[])=>{const dx=t[0]-100,dy=t[1]-100,v=Math.abs(dy)<18?'centre':dy<0?'high':'low',h=Math.abs(dx)<18?'':dx<0?' left':' right';return v==='centre'&&!h?'dead centre':v+h};

export default function Live({session,name,end}:any){
  const pl:string[]=session.d.players,sid=session.id;
  const evs=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del&&r.d.s===sid).sortBy('u'),[sid])||[];
  const st=derive(pl,evs);
  const other=(p:string)=>pl[1-pl.indexOf(p)];
  const last=[...evs].reverse().find(e=>e.type==='break'&&!e.d.skip)?.d;
  const k=evs.length;
  return <><div className="hdr"><h1>Rack {st.rack}</h1><b>{name(pl[0])} {st.scores[0]} – {st.scores[1]} {name(pl[1])}</b></div>
    {st.phase==='break'?<BreakForm key={'b'+k} st={st} sid={sid} last={last} name={name} other={other}/>:<VisitForm key={'v'+k} st={st} sid={sid} name={name} other={other}/>}
    <div className="card log"><h2>Racks</h2>{[...evs].reverse().map((e,i,a)=>{const r=e.d.rack;return <div key={e.id}>{(i===0||a[i-1].d.rack!==r)&&<div className="rh">Rack {r}</div>}<div className="v">{line(e,name)}</div></div>})}{!evs.length&&<div className="n">Nothing logged yet.</div>}</div>
    <div className="row"><button className="ghost" disabled={!k} onClick={()=>drop(evs[k-1].id)}>Undo last</button><button className="ghost" onClick={end}>End session</button></div></>;
}
function line(e:any,name:(id:string)=>string){
  const d=e.d;
  if(e.type==='break')return d.skip?'Break not logged':`Break (${name(d.by)}) · ${Z[d.z]} · ${C[d.cut]} ${d.side?'R':'L'} · ${SP[d.spd]} · 1 ball ${d.one==null?'n/a':ONE[d.one].toLowerCase()} · ${d.drops.length} dropper${d.drops.length===1?'':'s'}${d.scratch?' · scratch':''}${d.nine?' · 9 on break':''}${d.rating?' · '+d.rating:''}`;
  const n=['Safe played','Escape hit'].includes(d.res)?'':` · ${d.potted.length} ball${d.potted.length===1?'':'s'}`;
  const t=d.push?'Push out':d.won?(d.runout?'Won rack · run out':'Won rack · 9 off a combo'):d.res==='Missed'?`Missed the ${d.low}`:d.res;
  return `${name(d.by)} ${d.rating?`[${d.rating}] `:''}· ${t}${n}${d.cause?' · '+d.cause:''}${d.fl.length?` · fluke ×${d.fl.length}`:''}${d.fg?` · ⚑${d.fg}`:''}`;
}
function BreakForm({st,sid,last,name,other}:any){
  const [by,setBy]=useState(st.breaker);const [ask,setAsk]=useState(false);
  const [z,setZ]=useState(last?.z??1),[cut,setCut]=useState(last?.cut??2),[side,setSide]=useState(last?.side??0),[spd,setSpd]=useState(last?.spd??1);
  const [tip,setTip]=useState<number[]>(last?.tip??[100,128]);
  const [one,setOne]=useState<number|null>(null),[drops,setDrops]=useState<number[]>([]),[scratch,setSc]=useState(false),[nine,setNine]=useState(false),[rating,setR]=useState('');
  const o=other(by);
  const log=()=>{const cont=!scratch&&!nine&&(one===0||drops.length>0);
    save('break',{s:sid,rack:st.rack,by,z,cut,side,spd,tip,one,drops,scratch,nine,rating,next:cont||nine?by:o,prefill:cont&&rating?rating:null})};
  const skip=(first:string)=>save('break',{s:sid,rack:st.rack,by,skip:true,drops:[],one:null,next:first});
  return <div className="card"><div className="hdr"><b>{name(by)} breaks</b><button className="link" onClick={()=>setBy(o)}>Change breaker</button></div>
    <div className="lbl">Where from</div><Chips items={Z} cur={z} set={setZ} w={40}/>
    <div className="lbl">Contact on the 1 (−3 thinnest · ½ half ball · +3 thickest)</div><Chips items={C} cur={cut} set={setCut} w={40}/>
    <div className="lbl">Cut side</div><Chips items={['Cut left','Cut right']} cur={side} set={setSide}/>
    <div className="lbl">Speed</div><Chips items={SP} cur={spd} set={setSpd}/>
    <div className="lbl">Cue ball tip · {tipLabel(tip)}</div>
    <svg viewBox="0 0 200 200" style={{width:180,display:'block',margin:'auto'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*200-100,dy=(e.clientY-r.top)/r.height*200-100,d=Math.hypot(dx,dy),f=d>78?78/d:1;setTip([100+dx*f,100+dy*f])}}>
      <circle cx="100" cy="100" r="92" fill="#f5f2e8" stroke="#bbb" strokeWidth="2"/><line x1="100" y1="8" x2="100" y2="192" stroke="#ccc"/><line x1="8" y1="100" x2="192" y2="100" stroke="#ccc"/><circle cx={tip[0]} cy={tip[1]} r="9" fill="#c4513d"/></svg>
    <div className="lbl">1 ball went</div><Chips items={ONE} cur={one} set={setOne}/>
    <div className="lbl">Other balls that dropped (tap which)</div>
    <div className="strip">{[2,3,4,5,6,7,8].map(i=><button key={i} className={'b'+(drops.includes(i)?' pot':'')} style={{['--c' as any]:BC[i]}} onClick={()=>setDrops(drops.includes(i)?drops.filter(x=>x!==i):[...drops,i])}>{i}</button>)}</div>
    <div className="row"><button className={'chip'+(scratch?' on':'')} onClick={()=>setSc(!scratch)}>Scratch</button><button className={'chip'+(nine?' on':'')} onClick={()=>setNine(!nine)}>9 on the break</button></div>
    <div className="lbl">Position left</div><Chips items={['A','B','C','D']} cur={'ABCD'.indexOf(rating)} set={(i:number)=>setR('ABCD'[i])}/>
    <button className="go" onClick={log}>Log break</button>
    <button className="link" onClick={()=>setAsk(!ask)}>Skip break details</button>
    {ask&&<div><div className="lbl">Who shoots first?</div><div className="row">{[by,o].map(p=><button key={p} className="chip" onClick={()=>skip(p)}>{name(p)}</button>)}</div></div>}</div>;
}
function VisitForm({st,sid,name,other}:any){
  const [rating,setRating]=useState(st.prefill||''),[res,setRes]=useState(''),[P,setP]=useState<number[]>([]);
  const [cause,setCause]=useState(''),[fl,setFl]=useState<number[]>([]),[fg,setFg]=useState(0),[fp,setFp]=useState(false),[ask,setAsk]=useState(false);
  const by=st.shooter,o=other(by),push=res==='Push out';
  const outsFor=(r:string)=>{const p=st.first?['Push out']:[];return !r?p:r==='D'?['Safe played','Escape hit','Foul','Pocketed anyway',...p]:['Won rack','Missed','Foul',...p]};
  const auto=(n:number[],rs:string,r:string)=>n.includes(9)?'Won rack':(rs==='Won rack'?'':rs)||(r&&n.length?(r==='D'?'Pocketed anyway':'Missed'):'');
  const rem=st.table.filter((x:number)=>!P.includes(x)),won=P.includes(9);
  const sorted=srt(st.table);let j=0;while(j<sorted.length&&P.includes(sorted[j]))j++;
  const oo=sorted.slice(j).filter(x=>P.includes(x));
  const tap=(i:number)=>{
    if(!st.table.includes(i)||['Safe played','Escape hit'].includes(res)||(push&&i===9))return;
    let n=[...P];
    if(n.includes(i))n=n.filter(x=>x!==i);
    else{const m=n.length?Math.max(...n):0;if(i>m)st.table.forEach((x:number)=>{if(x>m&&x<=i)n.push(x)});else n.push(i)}
    setP(n);setRes(auto(n,res,rating));
  };
  const pick=(r:string)=>{setRes(r);if(r==='Won rack')setP([...st.table]);else if(r==='Safe played'||r==='Escape hit')setP([]);else setP(P.filter(x=>x!==9))};
  const rate=(r:string)=>{setRating(r);const ok=res==='Won rack'||outsFor(r).includes(res);setRes(ok?auto(P,res,r):auto(P,'',r))};
  const finish=async(pass:boolean)=>{
    const id=await save('visit',{s:sid,rack:st.rack,by,rating:push?'':rating,res:won?'Won rack':res,potted:P,low:rem[0],cause,fl,fg,won,first:st.first,push,next:won?by:push&&pass?by:o,runout:won&&rem.length===0&&!oo.length});
    for(let i=0;i<fg;i++)await save('flag',{s:sid,rack:st.rack,by,table:st.table,rating,visit:id});
  };
  const list=outsFor(rating);
  return <div className="card"><div className="hdr"><b>{name(by)}{st.first?' · first shot':' at the table'}</b></div>
    <div className="strip">{[1,2,3,4,5,6,7,8,9].map(i=>{const on=st.table.includes(i);return <button key={i} disabled={!on||(push&&i===9)} className={'b'+(!on?' gone':P.includes(i)?' pot':'')+((res==='Missed'||res==='Foul')&&!won&&i===rem[0]?' now':'')+(fl.includes(i)?' fl':'')} style={{['--c' as any]:BC[i]}} onClick={()=>tap(i)}>{i}</button>})}</div>
    <div className="n">{won?`9 down · rack won${rem.length?` (${rem.join(', ')} still up)`:' · run out'}`:P.length?`Potted ${srt(P).join(', ')}${oo.length?` · out of order: ${oo.join(', ')}`:''}`:'Tap the last ball you potted. Tap a potted ball to take it back.'}</div>
    <div className="lbl">Position when you stepped up</div>
    <div className="row">{['A','B','C','D'].map(r=><button key={r} className={'chip'+(rating===r?' on':'')} onClick={()=>rate(r)}>{r}<small>{{A:'Clean',B:'Problem ball',C:'Scrappy',D:'No shot'}[r]}</small></button>)}</div>
    <div className="lbl">What happened</div>
    <div className="row">{list.length?list.map(x=><button key={x} className={'chip'+(res===x?' on':'')} onClick={()=>pick(x)}>{x}{x==='Escape hit'&&<small>kick or jump</small>}</button>):<span className="n">Pick a rating first.</span>}</div>
    {['Missed','Foul'].includes(res)&&rating!=='D'&&<><div className="lbl">Cause (optional)</div><div className="row">{['Pot','Position','Decision','Other'].map(c=><button key={c} className={'chip'+(cause===c?' on':'')} onClick={()=>setCause(cause===c?'':c)}>{c}</button>)}</div></>}
    <div className="lbl">Optional</div>
    <div className="row"><button className="chip opt" onClick={()=>{setFg(fg+1)}}>⚑ Flag shot</button><button className="chip opt" onClick={()=>setFp(true)}>✦ Fluke</button></div>
    {fp&&<><div className="lbl">Which ball fluked?</div><div className="row">{[...st.table.map(String),'Skip'].map(b=><button key={b} className="chip" style={{minWidth:40}} onClick={()=>{setFl([...fl,+b||0]);setFp(false)}}>{b}</button>)}</div></>}
    <div className="tags">{fl.map((f,i)=><span key={i} className="tag f">✦ Fluke{f?' · '+f:''}<button className="x" onClick={()=>setFl(fl.filter((_,q)=>q!==i))}>✕</button></span>)}{fg>0&&<span className="tag g">⚑ Flags: {fg}<button className="x" onClick={()=>setFg(fg-1)}>✕</button></span>}</div>
    <button className="go" disabled={!res||(!rating&&!push)} onClick={()=>push?setAsk(true):finish(false)}>{won?`Log visit · ${name(by)} wins rack ${st.rack}`:'Log visit'}</button>
    {ask&&<div className="card"><b>Push out played</b><div className="n">Potted balls stay down. The 9 is respotted.</div><div className="row"><button className="chip" onClick={()=>finish(false)}>{name(o)} shoots it</button><button className="chip" onClick={()=>finish(true)}>Passes it back</button></div></div>}</div>;
}
