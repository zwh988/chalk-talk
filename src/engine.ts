import type {Rec} from './db';
export const ALL=[1,2,3,4,5,6,7,8,9];
// Replays a session's break + visit records into the current game state. Nothing here is stored.
export function derive(players:string[],evs:Rec[]){
  let rack=1,table=[...ALL],scores=[0,0],shooter=players[0],first=false,phase:'break'|'visit'='break',breaker=players[0],prefill:string|null=null;
  const idx=(p:string)=>players.indexOf(p);
  for(const e of evs){
    const d=e.d;
    if(e.type==='break'){
      if(d.nine){scores[idx(d.by)]++;rack++;table=[...ALL];breaker=d.by;phase='break';continue}
      const gone=new Set<number>([...(d.one===0?[1]:[]),...(d.drops||[])]);
      table=ALL.filter(x=>!gone.has(x));shooter=d.next;first=true;prefill=d.prefill||null;phase='visit';
    }else{
      if(d.won){scores[idx(d.by)]++;rack++;table=[...ALL];breaker=d.by;phase='break';prefill=null;continue}
      table=table.filter(x=>!d.potted.includes(x));shooter=d.next;first=false;prefill=null;
    }
  }
  return {rack,table,scores,shooter,first,phase,breaker,prefill};
}
