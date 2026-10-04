export const VARS:[string,string][]=[['--bg','Background'],['--panel','Cards'],['--ink','Text'],['--mute','Secondary text'],['--cloth','Primary (selected items)'],['--amber','Accent (main buttons)'],['--nav','Navigation bar']];
export type Mode='auto'|'light'|'dark';
export const getMode=():Mode=>(localStorage.getItem('ct.mode') as Mode)||'auto';
const eff=()=>{const m=getMode();return m==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m};
const load=()=>JSON.parse(localStorage.getItem('ct.theme')||'{}');
export function applyTheme(){
  const root=document.documentElement,m=getMode();
  if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
  const t=load()[eff()]||{};
  VARS.forEach(([v])=>t[v]?root.style.setProperty(v,t[v]):root.style.removeProperty(v));
}
export const setMode=(m:Mode)=>{localStorage.setItem('ct.mode',m);applyTheme()};
export function setVar(v:string,val:string){const all=load();all[eff()]={...(all[eff()]||{}),[v]:val};localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export function resetTheme(){const all=load();delete all[eff()];localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export const cur=(v:string)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
