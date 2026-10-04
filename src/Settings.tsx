import {useState} from 'react';
import {VARS,cur,setVar,resetTheme,getMode,setMode} from './theme';
import type {Mode} from './theme';
export default function Settings(){
  const [,tick]=useState(0);const re=()=>tick(x=>x+1);
  return <><h1>Settings</h1>
    <div className="card"><h2>Appearance</h2><div className="row">{(['auto','light','dark'] as Mode[]).map(m=>
      <button key={m} className={'chip'+(getMode()===m?' on':'')} onClick={()=>{setMode(m);re()}}>{m[0].toUpperCase()+m.slice(1)}{m==='auto'&&<small>follow phone</small>}</button>)}</div></div>
    <div className="card"><h2>Theme colours</h2>
    <div className="n">Tap a swatch to pick a colour, or type a hex code. Changes apply to the current light/dark mode and stay on this device.</div>
    {VARS.map(([v,label])=>{const val=cur(v);return <div className="row" key={v+val+getMode()} style={{margin:'12px 0'}}>
      <input type="color" value={val} onChange={e=>{setVar(v,e.target.value);re()}} style={{width:52,height:44,padding:2,flex:'none'}}/>
      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{label}</div>
        <input defaultValue={val} maxLength={7} onChange={e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value)){setVar(v,e.target.value.toLowerCase());re()}}}/></div></div>})}
    <button className="ghost" onClick={()=>{resetTheme();re()}}>Reset to defaults</button></div></>;
}
