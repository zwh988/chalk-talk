import {useState,useEffect,useRef,useContext,createContext,ReactNode} from 'react';
// Shared overlay primitives. Bottom sheet + promise dialogs that replace confirm()/alert().
// Back stack (Android back / iOS edge swipe). Screens open on top of a root screen call useBack(open, close); Back then closes the top one instead of leaving the app.
// One sentinel history entry exists while the stack is non-empty. close() may return false (or a promise of false) to veto, e.g. unsaved changes.
// Active: App wraps each kept-mounted tab in <Active.Provider>; a hidden tab's screens don't take part in the stack.
export const Active=createContext(true);
type E={close:()=>any};
const stk:E[]=[];let side=false,skip=0;
const ensure=()=>{if(stk.length&&!side){history.pushState({ct:1},'');side=true}};
const settle=()=>{if(!stk.length&&side){side=false;skip++;history.back()}};
if(typeof window!=='undefined')window.addEventListener('popstate',()=>{if(skip){skip--;return}side=false;const e=stk.pop();if(!e)return;ensure();Promise.resolve(e.close()).then(r=>{if(r===false){stk.push(e);ensure()}})});
export function useBack(on:boolean,close:()=>any){
  const c=useRef(close);c.current=close;const act=useContext(Active),live=on&&act;
  useEffect(()=>{if(!live)return;const e:E={close:()=>c.current()};stk.push(e);ensure();return()=>{const i=stk.indexOf(e);if(i>=0)stk.splice(i,1);setTimeout(settle)}},[live]);
}
// A sheet without onClose swallows Back (like it ignores backdrop taps) so it can't navigate away underneath.
export function Sheet({children,onClose}:{children:ReactNode;onClose?:()=>void}){
  useBack(true,()=>onClose?onClose():false);
  return <div className="sheet" onClick={onClose}><div className="card" onClick={e=>e.stopPropagation()}>{children}</div></div>;
}
type Q={msg:string;ok:string;danger:boolean;info?:boolean;res:(v:boolean)=>void};
let push:((q:Q)=>void)|null=null;
// await ask('Delete this shot?','Delete shot') → true if confirmed. Falls back to confirm() if <Dialogs/> isn't mounted.
export const ask=(msg:string,ok='Delete',danger=true)=>new Promise<boolean>(res=>push?push({msg,ok,danger,res}):res(confirm(msg)));
export const tell=(msg:string)=>new Promise<void>(res=>push?push({msg,ok:'OK',danger:false,info:true,res:()=>res()}):(alert(msg),res()));
// Mount once (App).
export function Dialogs(){
  const [q,setQ]=useState<Q|null>(null);
  useEffect(()=>{push=nq=>setQ(old=>{old?.res(false);return nq});return()=>{push=null}},[]);
  if(!q)return null;
  const done=(v:boolean)=>{q.res(v);setQ(null)};
  return <Sheet onClose={()=>done(false)}><div style={{marginBottom:12}}>{q.msg}</div>
    <div className="row">{!q.info&&<button className="ghost" autoFocus={q.danger} onClick={()=>done(false)}>Cancel</button>}
      <button className={'go sm'+(q.danger?' danger':'')} style={{flex:1}} autoFocus={!q.danger} onClick={()=>done(true)}>{q.ok}</button></div></Sheet>;
}
