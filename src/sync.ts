import {db} from './db';
import type {Rec} from './db';
export type Cfg={repo:string;token:string;branch:string};
export const getCfg=():Cfg=>JSON.parse(localStorage.getItem('ct.cfg')||'{"repo":"","token":"","branch":"main"}');
export const setCfg=(c:Cfg)=>localStorage.setItem('ct.cfg',JSON.stringify(c));
const b64=(s:string)=>btoa(unescape(encodeURIComponent(s)));
const unb64=(s:string)=>decodeURIComponent(escape(atob(s.replace(/\n/g,''))));
// One file per session (sessions/<id>.json: the session, its breaks, visits, flags) plus players.json.
const fileOf=(r:Rec)=>r.type==='player'?'players.json':`sessions/${r.type==='session'?r.id:r.d.s}.json`;
const strip=(r:Rec)=>({id:r.id,type:r.type,u:r.u,del:r.del,d:r.d});
export async function sync(say:(m:string)=>void){
  const c=getCfg();if(!c.repo||!c.token)throw new Error('Set up sync first (Sync tab).');
  if(localStorage.getItem('ct.shas')===null)await db.recs.toCollection().modify({dirty:1}); // first run of per-session format
  const known:Record<string,string>=JSON.parse(localStorage.getItem('ct.shas')||'{}');
  const api=(p:string,o:RequestInit={})=>fetch(`https://api.github.com/repos/${c.repo}/${p}`,{...o,headers:{Authorization:`Bearer ${c.token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
  say('Reading repo…');
  const t=await api(`git/trees/${c.branch}?recursive=1`);
  if(!t.ok&&t.status!==409)throw new Error(`GitHub said ${t.status}. Check repo name, branch and token.`);
  const files:{path:string;sha:string;type:string}[]=t.ok?(await t.json()).tree:[];
  let pulled=0,pushed=0;
  for(const f of files){
    if(f.type!=='blob'||!(f.path==='players.json'||/^sessions\/[^/]+\.json$/.test(f.path)))continue;
    known[f.path]=known[f.path]&&known[f.path]===f.sha?f.sha:f.sha;
    if(localStorage.getItem('ct.seen:'+f.path)===f.sha)continue;
    say(`Pulling ${f.path}…`);
    const remote:any[]=JSON.parse(unb64((await (await api(`git/blobs/${f.sha}`)).json()).content)).recs;
    for(const r of remote){const l=await db.recs.get(r.id);if(!l||r.u>l.u){await db.recs.put({...r,dirty:0});pulled++}}
    localStorage.setItem('ct.seen:'+f.path,f.sha);
  }
  const dirty=await db.recs.where('dirty').equals(1).toArray();
  for(const path of new Set(dirty.map(fileOf))){
    say(`Pushing ${path}…`);
    const all=(await db.recs.toArray()).filter(r=>fileOf(r)===path);
    const res=await api(`contents/${path}`,{method:'PUT',body:JSON.stringify({message:`sync ${path}`,branch:c.branch,sha:known[path],content:b64(JSON.stringify({recs:all.map(strip)}))})});
    if(!res.ok)throw new Error(`Push failed (${res.status}). Try syncing again.`);
    const sha=(await res.json()).content.sha;known[path]=sha;localStorage.setItem('ct.seen:'+path,sha);
    await db.recs.bulkPut(all.map(r=>({...r,dirty:0 as const})));pushed+=all.filter(r=>dirty.some(d=>d.id===r.id)).length;
  }
  localStorage.setItem('ct.shas',JSON.stringify(known));
  return {pulled,pushed};
}
