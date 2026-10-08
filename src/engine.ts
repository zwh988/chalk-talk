import type {Rec} from './db';
export const ALL=[1,2,3,4,5,6,7,8,9];
// Scotch Doubles helpers. A session keeps seats in `players` (= each team's first player) so the replay below is unchanged; `teams` holds both members of each side.
export const mate=(t:string[][],p:string)=>{const x=t.find(q=>q.includes(p));return x?x[1-x.indexOf(p)]:p};
// Shooter of shot i within a visit: the starting player on even i, their partner on odd i. Derived, never stored.
export const shooterAt=(t:string[][],sp:string,i:number)=>i%2?mate(t,sp):sp;
// Index of the visit's final shot (the one that missed/fouled/safed, or potted the 9).
export const lastShot=(d:any)=>d.won?Math.max(0,d.potted.length-1):d.potted.length;
// Seat label: team names for Scotch Doubles, the player's name otherwise. `nm` resolves one individual id.
export const sName=(s:any,id:string,nm:(id:string)=>string)=>s.fmt==='scotch'?s.teams[s.players.indexOf(id)].map(nm).join(' + '):nm(id);
// Replays a session's break + visit records into the current game state. Nothing here is stored.
// `teams` (Scotch Doubles only) also yields `up`: which teammate should start each seat's next visit (alternation continues across visits; the log can override it via `sp`/`bp`).
export function derive(players:string[],evs:Rec[],teams?:string[][]){
  let rack=1,table=[...ALL],scores=[0,0],shooter=players[0],first=false,phase:'break'|'visit'='break',breaker=players[0],prefill:string|null=null,prob:number[]=[];
  const up:Record<string,string>={};if(teams)players.forEach((p,i)=>up[p]=teams[i][0]);
  const idx=(p:string)=>players.indexOf(p);
  for(const e of evs){
    const d=e.d;
    if(teams)up[d.by]=mate(teams,e.type==='break'?(d.bp||up[d.by]):shooterAt(teams,d.sp||up[d.by],lastShot(d)));
    if(e.type==='break'){
      if(d.nine){scores[idx(d.by)]++;rack++;table=[...ALL];breaker=d.by;phase='break';continue}
      const gone=new Set<number>([...(d.one===0?[1]:[]),...(d.drops||[])]);
      table=ALL.filter(x=>!gone.has(x));shooter=d.next;first=true;prefill=d.prefill||null;phase='visit';prob=[];
    }else{
      if(d.won){scores[idx(d.by)]++;rack++;table=[...ALL];breaker=d.by;phase='break';prefill=null;continue}
      table=table.filter(x=>!d.potted.includes(x));shooter=d.next;first=false;prefill=null;
      prob=d.board==='Problem'?(d.prob||[]).filter((x:number)=>table.includes(x)):d.board==='Clear'?[]:prob.filter(x=>table.includes(x));
    }
  }
  return {rack,table,scores,shooter,first,phase,breaker,prefill,prob,up};
}
