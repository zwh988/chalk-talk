import {useState} from 'react';
import {VARS,cur,setVar,resetTheme,getMode,setMode,eff,PRESETS,DEFAULTS,applyPreset} from './theme';
export default function Settings(){
  const [,tick]=useState(0);const re=()=>tick(x=>x+1);
  return <><h1>Settings</h1>
    <details className="card"><summary style={{fontWeight:600,cursor:'pointer'}}>Info: logging rubrics</summary>
      <div className="n" style={{margin:'10px 0'}}>How to label the opening shot of a visit and the state of the table.</div>
      <div style={{fontWeight:600,fontSize:13}}>Opening shot</div>
      <div className="n"><b>Easy:</b> a routine pot with a viable path to the next shot.</div>
      <div className="n"><b>Hard:</b> a hard pot because of a long distance or an excessive angle, or one where you have to do something unusual to get position.</div>
      <div className="n"><b>No shot:</b> no reasonable offensive shot. This does not necessarily mean you are snookered.</div>
      <div style={{fontWeight:600,fontSize:13,marginTop:12}}>Table</div>
      <div className="n"><b>Clean:</b> all balls reasonably go into their nearest or easiest pocket.</div>
      <div className="n"><b>Problem:</b> there are balls that are blocked, on the short side, or that need a carom, a combo or a breakout.</div>
    </details>
    <div className="card"><h2>Appearance</h2><div className="row">{(['light','dark'] as const).map(m=><button key={m} className={eff()===m?'go':'ghost'} onClick={()=>{setMode(m);re()}}>{m==='light'?'Light':'Dark'}</button>)}</div></div>
    <div className="card"><h2>Presets</h2><div className="row">{PRESETS.map(p=><button key={p.name} className="chip" onClick={()=>{applyPreset(p);re()}}>
      <span style={{display:'flex',gap:3,justifyContent:'center',marginBottom:6}}>{['--bg','--cloth','--amber','--nav'].map(k=><i key={k} style={{width:16,height:16,borderRadius:4,border:'1px solid #8884',background:p[eff()][k]||DEFAULTS[k]}}/>)}</span>{p.name}</button>)}</div>
      <div className="n">Each preset has a light and a dark version; switch with Appearance above. A preset replaces your colours for both; you can fine-tune any colour below afterwards.</div></div>
    <div className="card"><h2>Theme colours</h2>
    <div className="n">Tap a swatch to pick a colour, or type a hex code. Changes apply to the current light/dark mode and stay on this device.</div>
    {VARS.map(([v,label])=>{const val=cur(v);return <div className="row" key={v+val+getMode()} style={{margin:'12px 0'}}>
      <input type="color" value={val} onChange={e=>{setVar(v,e.target.value);re()}} style={{width:52,height:44,padding:2,flex:'none'}}/>
      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{label}</div>
        <input defaultValue={val} maxLength={7} onChange={e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value)){setVar(v,e.target.value.toLowerCase());re()}}}/></div></div>})}
    <button className="ghost" onClick={()=>{resetTheme();re()}}>Reset to defaults</button></div></>;
}
