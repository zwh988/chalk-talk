import {db} from './db';
export type Cfg={repo:string;token:string;branch:string};
export const getCfg=():Cfg=>JSON.parse(localStorage.getItem('ct.cfg')||'{"repo":"","token":"","branch":"main"}');
export const setCfg=(c:Cfg)=>localStorage.setItem('ct.cfg',JSON.stringify(c));
const b64=(s:string)=>btoa(unescape(encodeURIComponent(s)));
const unb64=(s:string)=>decodeURIComponent(escape(atob(s.replace(/\n/g,''))));
// One small JSON file per record: records/<type>/<id>.json. Last write (u) wins.
export async function sync(say:(m:string)=>void){
  const c=getCfg();if(!c.repo||!c.token)throw new Error('Add repo and token first');
  const api=(p:string,o:RequestInit={})=>fetch(`https://api.github.com/repos/${c.repo}/${p}`,{...o,headers:{Authorization:`Bearer ${c.token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
  say('Reading repo…');
  const t=await api(`git/trees/${c.branch}?recursive=1`);
  if(!t.ok&&t.status!==409)throw new Error(`GitHub said ${t.status}. Check repo name, branch and token.`);
  const files:{path:string;sha:string;type:string}[]=t.ok?(await t.json()).tree:[];
  let pulled=0,pushed=0;
  for(const f of files){
    const m=f.path.match(/^records\/([^/]+)\/([^/]+)\.json$/);if(!m||f.type!=='blob')continue;
    const local=await db.recs.get(m[2]);if(local?.sha===f.sha)continue;
    pulled++;say(`Pulling ${pulled}…`);
    const r=JSON.parse(unb64((await (await api(`git/blobs/${f.sha}`)).json()).content));
    if(local&&local.dirty&&local.u>r.u)await db.recs.update(local.id,{sha:f.sha});
    else await db.recs.put({id:r.id,type:r.type,u:r.u,del:r.del,d:r.d,dirty:0,sha:f.sha});
  }
  const dirty=await db.recs.where('dirty').equals(1).toArray();
  for(const r of dirty){
    pushed++;say(`Pushing ${pushed} of ${dirty.length}…`);
    const body={id:r.id,type:r.type,u:r.u,del:r.del,d:r.d};
    const res=await api(`contents/records/${r.type}/${r.id}.json`,{method:'PUT',body:JSON.stringify({message:`${r.type} ${r.id.slice(0,8)}`,branch:c.branch,sha:r.sha,content:b64(JSON.stringify(body))})});
    if(!res.ok)throw new Error(`Push failed (${res.status}). Try syncing again.`);
    await db.recs.update(r.id,{dirty:0,sha:(await res.json()).content.sha});
  }
  return {pulled,pushed};
}
