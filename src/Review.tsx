import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,ofType} from './db';
import {playerStats,breakStats} from './stats';
import {controlStats} from './control';
import {EARLY} from './controlConfig';
import type {Rec} from './db';
import {Ln} from './Live';
import {Sheet} from './ui';
import {attrs,rating,rankOf,progress,confidence,ATTRS,PROV,CONF} from './rating';
import Avatar from './Avatar';
import {periods,ppDelta,N as PN} from './delta';
const pc=(w:number,n:number)=>n?Math.round(w/n*100):0;
// Change vs the previous 4 sessions. Arrow = direction the number moved; green = better, red = worse (`low` = lower is better).
const Dlt=({d,pp,low}:any)=>{if(d==null)return null;const r=pp?Math.round(d*10)/10:Math.round(d);if(!r)return <span className="n" style={{marginLeft:6}}>±0{pp?' pp':''}</span>;return <span style={{marginLeft:6,fontSize:13,fontWeight:700,whiteSpace:'nowrap',color:(low?r<0:r>0)?'var(--good)':'var(--bad)'}}>{r>0?'↑':'↓'}{pp?Math.abs(r).toFixed(1)+' pp':Math.abs(r)}</span>};
const Donut=({w,n,label,d,low}:any)=>{const p=n?w/n:0,r=34,c=2*Math.PI*r;return <div style={{textAlign:'center',opacity:n<5?.45:1}}><svg viewBox="0 0 90 90" width="96"><circle cx="45" cy="45" r={r} fill="none" stroke="var(--chip)" strokeWidth="11"/><circle cx="45" cy="45" r={r} fill="none" stroke="var(--cloth)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${p*c} ${c}`} transform="rotate(-90 45 45)"/><text x="45" y="50" textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--ink)">{n?Math.round(p*100)+'%':'—'}</text></svg><div className="n">{label}<br/>{w}/{n}{d!=null&&<><br/><Dlt d={d} pp low={low}/></>}</div></div>};
const Cols=({vals,labels}:any)=>{const m=Math.max(1,...vals),W=300/vals.length;return <svg viewBox="0 0 300 112" style={{width:'100%',maxWidth:480,display:'block',margin:'auto'}}>{vals.map((v:number,i:number)=><g key={i}><rect x={i*W+6} y={84-v/m*66} width={W-12} height={v/m*66} rx="3" fill="var(--cloth)"/><text x={i*W+W/2} y="104" textAnchor="middle" fontSize="12" fill="var(--mute)">{labels[i]}</text>{v>0&&<text x={i*W+W/2} y={80-v/m*66} textAnchor="middle" fontSize="12" fill="var(--ink)">{v}</text>}</g>)}</svg>};
const pt=(i:number,v:number)=>{const a=(-90+60*i)*Math.PI/180,r=v/100*80;return [150+r*Math.cos(a),150+r*Math.sin(a)]};
const poly=(v:number[])=>v.map((x,i)=>pt(i,x).join(',')).join(' ');
const Radar=({a,b}:any)=><svg viewBox="0 0 300 300" style={{width:'100%',maxWidth:340,display:'block',margin:'auto'}}>{[33,66,100].map(k=><polygon key={k} points={poly(Array(6).fill(k))} fill="none" stroke="var(--line)"/>)}
  {ATTRS.map((n,i)=>{const [x,y]=pt(i,100),[lx,ly]=pt(i,122);return <g key={n}><line x1="150" y1="150" x2={x} y2={y} stroke="var(--line)"/><text x={lx} y={ly+4} textAnchor="middle" fontSize="13" fill="var(--mute)">{n}</text></g>})}
  {b&&<polygon points={poly(b)} fill="var(--amber)" fillOpacity=".12" stroke="var(--amber)" strokeWidth="2" strokeDasharray="5 4"/>}<polygon points={poly(a)} fill="var(--cloth)" fillOpacity=".3" stroke="var(--cloth)" strokeWidth="2.5"/></svg>;
const TRow=({l,g}:any)=><div className={'srow'+(g.n<5?' dim':'')}><span>{l}</span><span className="n">n={g.n} · 1-ball {pc(g.one,g.n)}% · droppers {g.n?(g.drops/g.n).toFixed(1):'—'} · scratch {pc(g.scr,g.n)}%</span></div>;
// Card title + scope (what data the card covers).
const CH=({t,sub}:any)=><div className="ch"><h2>{t}</h2>{sub&&<span className="n">{sub}</span>}</div>;
const Z=['L3','L2','L1','C','R1','R2','R3'];
// Initiative blocks (S2). Hidden when the filter leaves no matches (opponent-based, see STATS_CONTROL_SPEC.md).
// Rank (R2): big block letter in the tier colour (fixed --rk-* tokens, styled in styles.css). Provisional = same letter faded, no outline.
const RKH=(r:string)=>r==='SSS'?'var(--rk-SSSb)':'var(--rk-'+r+')';
const Rank=({r,prov}:{r:string;prov?:boolean})=><div role="img" aria-label={'Rank '+r+(prov?', provisional':'')} className={'rank'+(prov?' pv':'')} data-r={r} style={{fontSize:r.length>2?34:r.length>1?44:56}}>{r}</div>;
const Er=()=><span className="er">Early read</span>;
const act=(f:()=>any)=>({role:'button',tabIndex:0,onClick:f,onKeyDown:(e:any)=>{if(e.key==='Enter')f()}});
const Rw=({l,v,w,c,dim,sw,on}:any)=><div className={'rw'+(dim?' dim':'')+(on?' t':'')} {...(on?act(on):{})}><div className="rt"><span>{sw&&<i className="sw" style={{background:c}}/>}{l}</span><span className="rv"><b>{v}</b>{on&&<span className="chev">›</span>}</span></div><div className="rb"><i style={{width:Math.round(w*100)+'%',background:c}}/></div></div>;
const KC='color-mix(in srgb,var(--good) 45%,var(--panel))',HC='color-mix(in srgb,var(--warn) 55%,var(--panel))',NC='color-mix(in srgb,var(--mute) 35%,var(--panel))';   // segment colours differ in lightness, not just hue
function ControlCards({cs,ws,op}:any){
  const C=cs.ctl,w=C.won.length,k=C.kept.length,g=C.gave.length,tot=w+k+g,kc=w+k,Lo=cs.lost,ke=cs.keptErr.length,R=cs.rack;
  const rows:[string,any[],string,string][]=[['Position error',Lo.pos,'var(--bad)','Position errors'],['Potting error',Lo.pot,'var(--bad)','Potting errors'],['Decision error',Lo.dec,'var(--bad)','Decision errors'],['Safety left an easy shot',Lo.safe,'var(--warn)','Safeties that left an easy shot'],['Hard shot missed, left an easy one',Lo.hard,'var(--warn)','Hard shots missed that left an easy one'],['Other miss',Lo.other,'var(--mute)','']];
  const cseg:[number,string,string,any[]][]=[[w,'var(--good)','Won the rack',C.won],[k,KC,'Held the initiative',C.kept],[g,'var(--bad)','Lost the initiative',C.gave]];
  const bg=rows.slice(0,5).reduce((a,r)=>r[1].length>a[1].length?r:a);
  const tile=(l:string,r:any)=>{const n=r.n.length,v=r.w.length;return <div {...(n?{className:'t',...act(()=>op(l,r.n,'racks',(e:Rec)=>r.w.includes(e)?'Won':'Lost'))}:{})}><div className="n">{l}</div><b>{n?Math.round(v/n*100)+'%':'—'}</b><div className="n">{n?v+' of '+n:'No racks yet'}</div>{n>0&&<span className="chev">›</span>}</div>};
  return <>
    <div className="card"><CH t="Initiative" sub={<>{ws}{tot<EARLY.chances&&<Er/>}</>}/>
      {tot?<><div className="big">{Math.round(kc/tot*100)}% <span className="n">of chances</span></div>
        <div className="n" style={{margin:'2px 0 10px'}}>You held the initiative on {kc} of your {tot} chances.</div>
        <div className="stk">{cseg.map(([n,c,t,a])=>n>0&&<i key={t} className="t" aria-label={t+' '+n} {...act(()=>op(t,a))} style={{width:n/tot*100+'%',background:c}}/>)}</div>
        <div className="lg">{cseg.map(([n,c,t,a])=><span key={t} className="t" {...act(()=>a.length&&op(t,a))}><i style={{background:c}}/>{t} {n}</span>)}</div></>
        :<div className="n">No resolved chances yet.</div>}
      {C.pend.length>0&&<div className="n">{C.pend.length} more not counted yet (no next visit)</div>}
      <div className="tl">{tile('Racks won as breaker',R.brk)}{tile('Racks won as receiver',R.rcv)}</div></div>
    {tot>0&&<div className="card"><CH t="How the initiative was lost" sub={<>{ws}{g<EARLY.leak&&<Er/>}</>}/>
      {g>0?<>{g>=EARLY.leak&&bg[1].length>0&&<div className="tk">Biggest leak: {bg[3]}, {bg[1].length} of {g}</div>}
        <div className="rws">{rows.map(([l,a,c])=><Rw key={l} l={l} v={a.length} w={a.length/g} c={c} dim={g<5} on={a.length?()=>op(l,a):undefined}/>)}</div></>
        :<div className="n">You haven't lost the initiative on a chance yet.</div>}
      {ke>0&&<div className="n"><button className="link" style={{font:'inherit',padding:0}} onClick={()=>op("Errors that didn't cost the initiative",cs.keptErr)}>{ke} more error{ke===1?'':'s'} didn't cost you the initiative ›</button></div>}</div>}
  </>}
// S3 blocks. Finishing includes solo; Defence and Hard shots are opponent-based (matches only).
function FinishCard({cs,ws,op}:any){
  const F=cs.fin,rows:[string,any,string][]=[['Break and run',F.bnr,'Break and run'],['Ran out from 6+ balls',F.len[0],'Ran out'],['Ran out from 3–5 balls',F.len[1],'Ran out'],['Ran out from 1–2 balls',F.len[2],'Ran out']];
  return <div className="card"><CH t="Finishing" sub={ws}/>
    {rows.some(([,r])=>r.n.length)||F.golden.length?<><div className="rws">{rows.map(([l,r,t])=>{const n=r.n.length;return <Rw key={l} l={l} v={n?r.ro.length+' of '+n:'—'} w={n?r.ro.length/n:0} c="var(--good)" dim={n<5} on={n?()=>op(l,r.n,l==='Break and run'?'breaks':'visits',(e:Rec)=>r.ro.includes(e)?t:undefined):undefined}/>})}</div>
      <div className="n">Break and run = your own breaks. The other rows = your chances, by balls on the table when the visit started.</div>
      <div className="n" style={{margin:0}}>{F.golden.length?<button className="link" style={{font:'inherit',padding:0}} onClick={()=>op('Golden breaks',F.golden,'breaks')}>Golden breaks: {F.golden.length} ›</button>:'Golden breaks: 0'}</div></>
      :<div className="n">No chances logged yet.</div>}</div>}
function DefenceCard({cs,ws,op}:any){
  const S=cs.safe,e=S.easy.length,h=S.hard.length,c=S.cont.length,fe=S.esc.length,fm=S.miss.length,ff=S.foul.length,fo=fe+fm+ff,tot=e+h+c+fo,E=cs.esc,em=E.made.length,et=em+E.fail.length;
  const seg:[string,number,string,any[]][]=[['Left an easy shot',e,'var(--bad)',S.easy],['Left a hard shot',h,HC,S.hard],['Contained',c,NC,S.cont],['Forced an error',fo,'var(--good)',[...S.esc,...S.miss,...S.foul]]],tg=(x:Rec)=>S.esc.includes(x)?'Escape':S.miss.includes(x)?'Miss':S.foul.includes(x)?'Foul':undefined;
  return <div className="card"><CH t="Defence" sub={<>{ws}{tot<EARLY.safeties&&<Er/>}</>}/>
    {tot?<><div className="n" style={{margin:'0 0 8px'}}>What your {tot} safeties left the opponent.</div>
      <div className="stk">{seg.map(([l,n,c,a])=>n>0&&<i key={l} className="t" aria-label={l+' '+n} {...act(()=>op(l,a,'safeties',l==='Forced an error'?tg:undefined))} style={{width:n/tot*100+'%',background:c}}/>)}</div>
      <div className="rws" style={{marginTop:6}}>{seg.map(([l,n,c,a])=><Rw key={l} sw l={l} v={n} w={n/tot} c={c} dim={tot<5} on={n?()=>op(l,a,'safeties',l==='Forced an error'?tg:undefined):undefined}/>)}</div>
      {fo>0&&<div className="n">Forced errors: Escape {fe} · Miss {fm} · Foul {ff}</div>}</>
      :<div className="n">No safeties with a result yet.</div>}
    {S.pend.length>0&&<div className="n">{S.pend.length} more not counted yet (no next visit)</div>}
    <div className="rws" style={{marginTop:10,borderTop:'1px solid var(--line)'}}><Rw l="Escapes made" v={et?em+' of '+et:'—'} w={et?em/et:0} c="var(--good)" dim={et<5} on={et?()=>op('Escapes',[...E.made,...E.fail],'visits',(x:Rec)=>E.made.includes(x)?'Made':'Failed'):undefined}/></div></div>}
function HardCard({cs,ws,op}:any){
  const H=cs.hard,m=H.made.length,ms=H.miss.length,at=m+ms,ez=H.easy.length,no=H.none.length,pd=H.pend.length,K=H.cause,cz:[string,any[]][]=[['Potting',K.Pot],['Position',K.Position],['Decision',K.Decision],['Other',K.Other]];
  return <div className="card"><CH t="Hard shots" sub={<>{ws}<span className="tg">Descriptive, no verdict</span>{at<EARLY.hard&&<Er/>}</>}/>
    {at?<><div className="rws"><Rw l="Made" v={m+' of '+at} w={m/at} c="var(--cloth)" dim={at<5} on={()=>op('Hard shots',[...H.made,...H.miss],'visits',(x:Rec)=>H.made.includes(x)?'Made':'Missed')}/>
      <Rw l="Missed, opponent got an easy shot" v={ez} w={ms?ez/ms:0} c="var(--warn)" dim={at<5} on={ez?()=>op('Hard shot missed, opponent got an easy shot',H.easy):undefined}/>
      <Rw l="Missed, no easy shot given up" v={no} w={ms?no/ms:0} c="var(--mute)" dim={at<5} on={no?()=>op('Hard shot missed, no easy shot given up',H.none):undefined}/></div>
      {pd>0&&<div className="n">{pd} more miss{pd===1?'':'es'} not sorted yet (no next visit)</div>}
      {ms>0&&<div className="n">Misses by cause: {cz.map(([l,a])=>l+' '+a.length).join(' · ')}</div>}</>
      :<div className="n">No hard shots logged yet.</div>}</div>}
export default function Stats({kind}:{kind:string}){
  const pa=useLiveQuery(()=>ofType('player'),[])||[],ps=pa.filter(p=>!p.d.archived);
  const ss=(useLiveQuery(()=>ofType('session'),[])||[]).sort((a,b)=>b.d.start-a.d.start);
  const all=useLiveQuery(()=>db.recs.where('type').anyOf('break','visit').filter(r=>!r.del).toArray(),[])||[];
  const [pid,setPid]=useState(''),[win,setWin]=useState('4'),[cmp,setCmp]=useState(''),[typ,setTyp]=useState('all'),[tc,setTc]=useState<any>(null);
  if(!ps.length)return <p className="n">Add players and log a session first.</p>;
  const sel=pid||ps[0].id,me=ps.find(p=>p.id===sel),nm=(id:string)=>pa.find(p=>p.id===(id||'').split('~')[0])?.d.name||'Unknown';
  // Tap to trace: opens a sheet with the records behind a number (newest first); `tag` adds a small label per record.
  const op=(t:string,l:Rec[],u='visits',tag?:(e:Rec)=>string|undefined)=>setTc({t,u,it:[...l].sort((a:any,b:any)=>(b.d.t??b.u)-(a.d.t??a.u)).map(e=>({e,x:tag?tag(e):undefined}))});
  const gr=(id:string,dn?:boolean)=>ss.filter(s=>(typ==='all'||(typ==='solo')===!!s.d.solo)&&(!dn||s.d.end)&&s.d.players.includes(id)&&all.some(e=>e.d.s===s.id)).map(s=>all.filter(e=>e.d.s===s.id).sort((x:any,y:any)=>(x.d.t??x.u)-(y.d.t??y.u)));
  const mine=gr(sel),groups=win==='all'?mine:mine.slice(0,4);
  // Scope labels: the rating always uses every session of the chosen type; the other cards follow the window.
  const wd=typ==='match'?'match':typ==='solo'?'solo session':'session',pl=(n:number)=>n+' '+wd+(n===1?'':typ==='match'?'es':'s'),rs='All '+pl(mine.length),ws=win==='all'?rs:groups.length===1?'Last '+wd:'Last '+pl(groups.length);
  const s=kind==='players'?playerStats(sel,groups):null,b=kind==='breaks'?breakStats(sel,groups):null;
  const ms=s?s.low.reduce((a:number,x:number)=>a+x,0):0,cs=s?controlStats(sel,groups):null;
  const cnt=(o:any)=>`Easy ${o.Easy} · Hard ${o.Hard} · No shot ${o.None}`;
  const at=attrs(sel,mine),R=rating(at),cf=confidence(at),pg=progress(R),ca=cmp?attrs(cmp,gr(cmp)):null;
  const cur=attrs(sel,mine.slice(0,4)),prev=attrs(sel,mine.slice(4,8));
  // Recent change: completed sessions only (newest first), latest 4 vs the 4 before; stats are recomputed over each combined period.
  const dn=gr(sel,true),per=periods(dn),sc=per&&s?playerStats(sel,per.cur):null,sp=per&&s?playerStats(sel,per.prev):null,bc=per&&b?breakStats(sel,per.cur):null,bp=per&&b?breakStats(sel,per.prev):null;
  const dR=(()=>{if(!per||!s)return null;const a=attrs(sel,per.cur),p=attrs(sel,per.prev),m=a.map((x,i)=>x.n>0&&p[i].n>0);return m.some(Boolean)?rating(a,m)-rating(p,m):null})(),dd=(c:any,p:any,f:(x:any)=>number[])=>c&&p?ppDelta(f(c),f(p)):null;
  // Rank is provisional until confidence reaches the top of the Medium band; "Work on" = lowest-scoring attribute with at least half its provisional sample (needs two to compare).
  const pv=cf<CONF[1][0],wk=(()=>{const c=at.map((x,i)=>({i,x})).filter(o=>o.x.n>=PROV[o.i]/2);return c.length>=2?c.reduce((a,o)=>o.x.adj<a.x.adj?o:a):null})(),cn=ps.find(p=>p.id===cmp)?.d.name;
  const tr=(i:number)=>prev[i].n>=PROV[i]/2&&cur[i].n>0?Math.round(cur[i].raw-prev[i].raw):null;
  return <>
    <div className="filt"><select aria-label="Player" value={sel} onChange={e=>setPid(e.target.value)}>{ps.map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select></div>
    <div className="filt"><select aria-label="Window" value={win} onChange={e=>setWin(e.target.value)}><option value="4">Last 4 sessions</option><option value="all">All time</option></select><select aria-label="Session type" value={typ} onChange={e=>setTyp(e.target.value)}><option value="all">All types</option><option value="match">Matches only</option><option value="solo">Solo only</option></select></div>
    <div className="n" style={{marginBottom:10}}>Faded = fewer than 5 observations{(s||b)&&<><br/>{per?'Arrows: latest 4 vs previous 4 completed sessions':`Trends unlock after ${2*PN} completed sessions (${2*PN-dn.length} more)`}</>}</div>
    {tc&&<Sheet onClose={()=>setTc(null)}><h2>{tc.t}</h2><div className="n">{tc.it.length} {tc.u} · {ws}</div>
      <div className="tr">{tc.it.map(({e,x}:any)=>{const se=ss.find(q=>q.id===e.d.s),op2=se&&!se.d.solo?se.d.players.map((id:string)=>id.split('~')[0]).find((id:string)=>id!==sel):null;
        return <div key={e.id}><div className="n">{se?new Date(se.d.start).toLocaleDateString(undefined,{day:'numeric',month:'short'}):'Session'}{se?.d.solo?' · Solo':op2?' · vs '+nm(op2):''} · Rack {e.d.rack}</div><Ln e={e} name={nm}/>{x&&<span className="tg">{x}</span>}</div>})}</div>
      <button className="ghost" style={{width:'100%',marginTop:10}} onClick={()=>setTc(null)}>Close</button></Sheet>}
    {s&&<>
      <div className="card"><div className="row" style={{flexWrap:'nowrap',gap:14,alignItems:'center'}}><Avatar p={me} size={88}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:'var(--fs-xl)',fontWeight:800,lineHeight:1.15,overflowWrap:'anywhere'}}>{me?.d.name}</div><div className="n" style={{margin:'2px 0 4px'}}>{rs}</div><div style={{fontSize:30,fontWeight:800,lineHeight:1.1}}>{Math.round(R)}<Dlt d={dR}/></div>{pg.next?<div className="n">{pg.left} to {pg.next}</div>:<div className="n">Top rank</div>}</div><div style={{textAlign:'center',flex:'none'}}><Rank r={rankOf(R)} prov={pv}/>{pv&&<div className="n" style={{margin:0,fontWeight:700}}>Provisional</div>}</div></div>
        <div className="bar" style={{margin:'10px 0'}}><i style={{width:pg.pct*100+'%',background:RKH(rankOf(R))}}/></div>
        {wk&&<div style={{marginBottom:10}}>Work on: <b>{ATTRS[wk.i]}</b> <span className="n">· {Math.round(wk.x.adj)} · n={wk.x.n}</span><div className="n" style={{margin:0}}>Lowest score among attributes with enough data.</div></div>}
        <select aria-label="Compare with" value={cmp} onChange={e=>setCmp(e.target.value)} style={{marginBottom:6}}><option value="">Compare with…</option>{ps.filter(p=>p.id!==sel).map(p=><option key={p.id} value={p.id}>{p.d.name}</option>)}</select>
        {ca&&<div className="key"><span><i/>{me?.d.name}</span><span><i className="d"/>{cn}</span></div>}
        <Radar a={at.map(x=>x.adj)} b={ca?ca.map(x=>x.adj):null}/>
        {ATTRS.map((n,i)=><div key={n} style={{margin:'10px 0'}}><div className="srow" style={{border:0,padding:0}}><span>{n}<span className="n"> · n={at[i].n}</span>{at[i].prov&&<span className="n"> · provisional</span>}</span><span><b>{Math.round(at[i].adj)}</b> <span className="n">{tr(i)==null?'–':tr(i)!>0?'▲'+tr(i):tr(i)!<0?'▼'+Math.abs(tr(i)!):'–'}</span></span></div><div className="bar"><i style={{width:at[i].adj+'%'}}/></div></div>)}<div className="n">▲▼ = change vs the 4 sessions before · – = not enough data to compare</div></div>
      {cs&&cs.m>0&&<ControlCards cs={cs} ws={ws} op={op}/>}
      {cs&&<FinishCard cs={cs} ws={ws} op={op}/>}
      {cs&&cs.m>0&&<><DefenceCard cs={cs} ws={ws} op={op}/><HardCard cs={cs} ws={ws} op={op}/></>}
      <div className="mh"><span>More detail</span></div>
      <div className="card"><CH t="Balls run" sub={ws}/><div className="row" style={{justifyContent:'center'}}><Donut w={s.potted} n={s.onTable} label="conversion" d={dd(sc,sp,x=>[x.potted,x.onTable])}/></div><div className="n" style={{textAlign:'center'}}>Balls potted per chance visit</div><Cols vals={s.dist} labels={['0','1–2','3–4','5+']}/></div>
      <div className="card"><CH t="Lowest ball left after a miss" sub={ws}/><div className={ms<5?'dim':''}><Cols vals={s.low.slice(1)} labels={[1,2,3,4,5,6,7,8,9]}/></div><div className="n" style={{textAlign:'center'}}>{ms} misses · by ball number</div></div></>}
    {b&&<>
      <div className="card"><CH t="Break summary" sub={ws}/><div className="row" style={{justifyContent:'space-around'}}><Donut w={b.one} n={b.n} label="1-ball pocketed" d={dd(bc,bp,x=>[x.one,x.n])}/><Donut w={b.scratch} n={b.n} label="scratch" low d={dd(bc,bp,x=>[x.scratch,x.n])}/><Donut w={b.golden} n={b.n} label="golden" d={dd(bc,bp,x=>[x.golden,x.n])}/></div><div className="n" style={{textAlign:'center',marginTop:6}}>{b.n} breaks · {b.n?(b.drops/b.n).toFixed(2):'—'} balls dropped each</div></div>
      <div className="card"><CH t="Opening shot after the break" sub={ws}/><div className="srow"><span>Breaker shot</span><span className="n">{cnt(b.open.brk)}</span></div><div className="srow"><span>Opponent shot</span><span className="n">{cnt(b.open.opp)}</span></div></div>
      <div className="card"><CH t="By position" sub={ws}/>{Z.map((l,i)=><TRow key={l} l={l} g={b.zone[i]}/>)}</div>
      <div className="card"><CH t="By contact" sub={ws}/>{Object.keys(b.con).sort().map(k=><TRow key={k} l={k} g={b.con[k]}/>)}{!Object.keys(b.con).length&&<div className="n">No breaks with contact logged yet.</div>}</div></>}
  </>;
}
