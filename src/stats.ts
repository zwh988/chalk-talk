import type {Rec} from './db';
const ALL=[1,2,3,4,5,6,7,8,9];
// Replays one session's events so each visit knows how many balls were on the table when it began.
export function walk(evs:Rec[]){
  let table=[...ALL];const out:any[]=[];
  for(const e of evs){const d=e.d;
    if(e.type==='break'){out.push({e,kind:'break'});const gone=new Set<number>(d.nine?[]:[...(d.one===0?[1]:[]),...(d.drops||[])]);table=ALL.filter(x=>!gone.has(x))}
    else{out.push({e,kind:'visit',start:[...table]});table=d.won?[...ALL]:table.filter(x=>!d.potted.includes(x))}
  }
  return out;
}
// Solo practice sessions store seat 2 as `<id>~2`; both seats are the same player's stats.
export const isMe=(by:string,pid:string)=>(by||'').split('~')[0]===pid;
export function playerStats(pid:string,groups:Rec[][]){
  const s:any={visits:0,shot:0,won:0,runouts:0,grid:{},potted:0,onTable:0,dist:[0,0,0,0],low:Array(10).fill(0),cause:{Pot:0,Position:0,Decision:0,Other:0},safe:0,held:0,pending:0,escape:0,fouls:0,fluke:0,rackWins:0,racks:0};
  for(const evs of groups){
    const it=walk(evs),solo=evs.some(e=>(e.d.by||'').includes('~'));if(!solo)s.racks+=new Set(evs.map(e=>e.d.rack)).size;   // solo racks are always "won", so skip rack results
    it.forEach((x,i)=>{const d=x.e.d;
      if(x.kind==='break'){if(isMe(d.by,pid)&&d.nine&&!solo)s.rackWins++;return}
      if(!isMe(d.by,pid))return;
      s.visits++;if(d.won&&!solo)s.rackWins++;s.fluke+=d.fl?.length||0;
      if(d.res==='Foul')s.fouls++;if(d.res==='Escape hit')s.escape++;
      if(d.res==='Safe played'){const nx=it.slice(i+1).find((y:any)=>y.kind==='visit'&&y.e.d.rack===d.rack);if(!nx)s.pending++;else{s.safe++;if(['None','Hard'].includes(nx.e.d.open))s.held++}}
      if((d.res==='Missed'||d.res==='Foul')&&s.cause[d.cause]!=null)s.cause[d.cause]++;
      if(!['Easy','Hard'].includes(d.open)||d.push)return;
      s.shot++;if(d.won){s.won++;if(d.runout)s.runouts++}
      const k=d.open+'/'+d.board,g=s.grid[k]||(s.grid[k]={n:0,w:0});g.n++;if(d.won)g.w++;
      const c=d.potted.length;s.potted+=c;s.onTable+=x.start.length;s.dist[c===0?0:c<=2?1:c<=4?2:3]++;
      if(d.res==='Missed'&&d.low)s.low[d.low]++;
    });
  }
  return s;
}
export function breakStats(pid:string,groups:Rec[][]){
  const mk=()=>({n:0,one:0,drops:0,scr:0}),b:any={n:0,scratch:0,golden:0,one:0,drops:0,open:{brk:{Easy:0,Hard:0,None:0},opp:{Easy:0,Hard:0,None:0}},zone:Array.from({length:7},mk),con:{}};
  for(const evs of groups){
    const it=walk(evs);
    it.forEach((x,i)=>{const d=x.e.d;if(x.kind!=='break'||!isMe(d.by,pid)||d.skip)return;
      const one=d.one===0?1:0,dr=d.drops.length,sc=d.scratch?1:0;
      b.n++;b.one+=one;b.drops+=dr;b.scratch+=sc;if(d.nine)b.golden++;
      const z=b.zone[d.z];z.n++;z.one+=one;z.drops+=dr;z.scr+=sc;
      if(d.ct!=null){const band=d.ct===8?'Straight on':(d.ct<4?'Thin':d.ct===4?'Half':'Thick')+(d.side?' · right':' · left'),g=b.con[band]||(b.con[band]=mk());g.n++;g.one+=one;g.drops+=dr;g.scr+=sc}
      if(!d.nine){const nx=it.slice(i+1).find((y:any)=>y.kind==='visit'&&y.e.d.rack===d.rack);
        if(nx&&b.open.brk[nx.e.d.open]!=null)b.open[nx.e.d.by===d.by?'brk':'opp'][nx.e.d.open]++}
    });
  }
  return b;
}
