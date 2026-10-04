export const VARS:[string,string][]=[['--bg','Background'],['--panel','Cards'],['--ink','Text'],['--mute','Secondary text'],['--cloth','Primary (selected items)'],['--amber','Accent (main buttons)'],['--nav','Navigation bar']];
const ALL=[...VARS.map(v=>v[0]),'--chip','--line'];
export type Mode='auto'|'light'|'dark';
export const getMode=():Mode=>(localStorage.getItem('ct.mode') as Mode)||'auto';
const eff=()=>{const m=getMode();return m==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m};
const load=()=>JSON.parse(localStorage.getItem('ct.theme')||'{}');
export function applyTheme(){
  const root=document.documentElement,m=getMode();
  if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
  const t=load()[eff()]||{};
  ALL.forEach(v=>t[v]?root.style.setProperty(v,t[v]):root.style.removeProperty(v));
}
export const setMode=(m:Mode)=>{localStorage.setItem('ct.mode',m);applyTheme()};
export function setVar(v:string,val:string){const all=load();all[eff()]={...(all[eff()]||{}),[v]:val};localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export function resetTheme(){const all=load();delete all[eff()];localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export const cur=(v:string)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export const PRESETS:{name:string;mode:Mode;c:Record<string,string>}[]=[
  {name:'Cloth & chalk',mode:'auto',c:{}},
  {name:'Tournament green',mode:'light',c:{'--bg':'#f4efe0','--panel':'#fffdf6','--ink':'#1b2420','--mute':'#5f6b63','--cloth':'#0b5d3b','--amber':'#c9a24a','--nav':'#08432a','--chip':'#e8e4d2','--line':'#d8d3bd'}},
  {name:'Midnight hall',mode:'dark',c:{'--bg':'#0e1116','--panel':'#1c2430','--ink':'#e8edf2','--mute':'#8d9bab','--cloth':'#1f8f7d','--amber':'#f2e24a','--nav':'#080a0e','--chip':'#263142','--line':'#2c3646'}},
  {name:'Burgundy bar',mode:'light',c:{'--bg':'#f7f1e8','--panel':'#fffaf3','--ink':'#2a2f36','--mute':'#6b6f76','--cloth':'#6b1f2a','--amber':'#d4a24c','--nav':'#4a1520','--chip':'#eee5d8','--line':'#dccfbe'}}];
export const DEFAULTS:Record<string,string>={'--bg':'#f2f5f4','--cloth':'#14575a','--amber':'#e8a33d','--nav':'#0e4144'};
export function applyPreset(p:typeof PRESETS[number]){
  if(!Object.keys(p.c).length){localStorage.removeItem('ct.theme');setMode('auto');return}
  setMode(p.mode);resetTheme();Object.entries(p.c).forEach(([k,v])=>setVar(k,v));
}
