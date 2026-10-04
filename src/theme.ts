export const VARS:[string,string][]=[['--bg','Background'],['--panel','Cards'],['--ink','Text'],['--mute','Secondary text'],['--cloth','Primary (selected items)'],['--amber','Accent (main buttons)'],['--nav','Navigation bar']];
const mode=()=>matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
const load=()=>JSON.parse(localStorage.getItem('ct.theme')||'{}');
export function applyTheme(){const t=load()[mode()]||{};VARS.forEach(([v])=>t[v]?document.documentElement.style.setProperty(v,t[v]):document.documentElement.style.removeProperty(v))}
export function setVar(v:string,val:string){const all=load();all[mode()]={...(all[mode()]||{}),[v]:val};localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export function resetTheme(){const all=load();delete all[mode()];localStorage.setItem('ct.theme',JSON.stringify(all));applyTheme()}
export const cur=(v:string)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
