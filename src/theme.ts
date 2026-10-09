export const VARS:[string,string][]=[['--bg','Background'],['--panel','Cards'],['--ink','Text'],['--mute','Secondary text'],['--cloth','Primary (selected items)'],['--amber','Accent (main buttons)'],['--nav','Navigation bar']];
const ALL=[...VARS.map(v=>v[0]),'--chip','--line'];
export type Mode='auto'|'light'|'dark';
export const getMode=():Mode=>(localStorage.getItem('ct.mode') as Mode)||'auto';
export const eff=()=>{const m=getMode();return m==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m};
const load=()=>JSON.parse(localStorage.getItem('ct.theme')||'{}');
export function applyTheme(){
  const root=document.documentElement,m=getMode();
  if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
  const t=load()[eff()]||{};
  ALL.forEach(v=>t[v]?root.style.setProperty(v,t[v]):root.style.removeProperty(v));
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',cur('--bg')||'#14575a');
}
export const setMode=(m:Mode)=>{localStorage.setItem('ct.mode',m);applyTheme()};
export function setVar(v:string,val:string){const all=load();all[eff()]={...(all[eff()]||{}),[v]:val};localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export function resetTheme(){const all=load();delete all[eff()];localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export const cur=(v:string)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
type M=Record<string,string>;
export type Preset={name:string;light:M;dark:M};
export const PRESETS:Preset[]=[
  {name:'Cloth & chalk',light:{},dark:{}}, // stylesheet default (teal), unchanged
  {name:'Royal baize', // blue cloth, orange accent
    light:{'--bg':'#eef2f8','--panel':'#ffffff','--ink':'#0f1a2e','--mute':'#566680','--cloth':'#1e4fb8','--amber':'#ff8a1f','--nav':'#0d2350','--chip':'#dfe7f3','--line':'#c8d3e4'},
    dark:{'--bg':'#0a1020','--panel':'#131c33','--ink':'#e8eef9','--mute':'#8b9bbb','--cloth':'#4a86f0','--amber':'#ffa040','--nav':'#060a16','--chip':'#1c2845','--line':'#26345a'}},
  {name:'Plum & brass', // violet cloth, brass accent
    light:{'--bg':'#f6f1f8','--panel':'#fffcff','--ink':'#221829','--mute':'#6d6078','--cloth':'#6b2d94','--amber':'#e3a620','--nav':'#3e1a58','--chip':'#eadff0','--line':'#d8cbe0'},
    dark:{'--bg':'#130d19','--panel':'#20172a','--ink':'#f0e8f6','--mute':'#a594b3','--cloth':'#a85fdc','--amber':'#f4c04b','--nav':'#0b060f','--chip':'#2e2139','--line':'#3b2b49'}},
  {name:'Copper & mint', // rust cloth, mint accent
    light:{'--bg':'#f7f1ea','--panel':'#fffcf8','--ink':'#271f19','--mute':'#6e6257','--cloth':'#b04a1c','--amber':'#4fc3a8','--nav':'#5a230c','--chip':'#ede3d6','--line':'#dccdbb'},
    dark:{'--bg':'#16100c','--panel':'#241a14','--ink':'#f3e9de','--mute':'#a8978a','--cloth':'#e0682f','--amber':'#5fd4b8','--nav':'#0d0806','--chip':'#33261d','--line':'#43332a'}},
  {name:'Graphite & lime', // neutral, one loud accent
    light:{'--bg':'#f1f1ef','--panel':'#ffffff','--ink':'#141414','--mute':'#626262','--cloth':'#2b2f36','--amber':'#b8e61f','--nav':'#16181c','--chip':'#e3e3e0','--line':'#cfcfcb'},
    dark:{'--bg':'#0c0c0d','--panel':'#171819','--ink':'#ededed','--mute':'#8e9094','--cloth':'#5b6472','--amber':'#c9f03a','--nav':'#000000','--chip':'#232528','--line':'#2e3033'}}];
export const DEFAULTS:Record<string,string>={'--bg':'#f2f5f4','--cloth':'#14575a','--amber':'#e8a33d','--nav':'#0e4144'};
export function applyPreset(p:Preset){
  if(!Object.keys(p.light).length&&!Object.keys(p.dark).length)localStorage.removeItem('ct.theme');
  else localStorage.setItem('ct.theme',JSON.stringify({light:p.light,dark:p.dark}));
  setMode('auto');
}
