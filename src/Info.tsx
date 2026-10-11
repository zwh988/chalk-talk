// More → Info: static reference (logging rubrics + how the rating is calculated). No data, no state.
// Weights, score ranges, data targets, ranks and confidence bands are read from ratingConfig.ts so the numbers cannot drift; the wording is hand-written and must be edited if a formula changes (rating.ts).
import {ATTRS,W,PROV,AN,FIN,HARD,MINF,RANKS,CONF} from './ratingConfig';
const pc=(x:number)=>Math.round(x*100)+'%';
const rg=(k:[number,number])=>`0 at ${pc(k[0])}, 100 at ${pc(k[1])}`;
const U=['chances','shots','balls','breaks','safeties and escapes','chances'];
const body={fontSize:'var(--fs-m)',lineHeight:1.4};
const Head=({t}:any)=><div style={{fontSize:'var(--fs-l)',fontWeight:700,margin:'26px 0 8px'}}>{t}</div>;
const Item=({c,t,children}:any)=><div style={{display:'flex',gap:12,margin:'14px 0'}}>
  <i aria-hidden style={{width:5,borderRadius:3,background:c,flex:'none'}}/>
  <div><div style={{fontWeight:700,fontSize:'var(--fs-b)'}}>{t}</div><div style={body}>{children}</div></div></div>;
const Step=({n,children}:any)=><div style={{display:'flex',gap:12,margin:'12px 0',alignItems:'flex-start'}}>
  <b style={{flex:'none',width:24,height:24,borderRadius:12,border:'1px solid var(--line)',display:'grid',placeItems:'center',fontSize:'var(--fs-s)'}}>{n}</b>
  <div style={body}>{children}</div></div>;
const Attr=({i,lines,data,children}:any)=><div style={{margin:'18px 0',paddingTop:14,borderTop:'1px solid var(--line)'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}}><b style={{fontSize:'var(--fs-b)'}}>{ATTRS[i]}</b><span className="n">{pc(W[i])} of rating</span></div>
  <div style={{...body,margin:'4px 0'}}>{children}</div>
  {lines&&lines.map((l:string)=><div key={l} className="n">{l}</div>)}
  <div className="n" style={{marginTop:4}}>Data: {data}. Counts as established after {PROV[i]} {U[i]}.</div></div>;

export default function Info(){
  return <><h1>Info</h1>

    <Head t="Logging"/>
    <div className="card"><h2>Opening shot</h2>
      <div className="n">What you face when you come to the table. Pick the closest match.</div>
      <Item c="var(--good)" t="Easy">A routine pot with a viable path to the next shot.</Item>
      <Item c="var(--warn)" t="Hard">A difficult pot because of a long distance or an excessive angle, or one where you have to do something unusual to get position.</Item>
      <Item c="var(--mute)" t="No shot">No reasonable offensive shot. This does not necessarily mean you are snookered.</Item></div>
    <div className="card"><h2>Table</h2>
      <div className="n">The state of the balls still on the table.</div>
      <Item c="var(--good)" t="Clean">Every ball can reasonably go into its nearest or easiest pocket.</Item>
      <Item c="var(--warn)" t="Problem">One or more balls are blocked, on the short side, or need a carom, a combo or a breakout.</Item>
      <div className="n">Problem balls carry over to later visits while they are still on the table.</div></div>

    <Head t="How the rating works"/>
    <div className="card"><h2>The calculation</h2>
      <Step n={1}>Six attributes are each scored from 0 to 100. Every score comes from a rate where higher is better, with a rate that scores 0 and a rate that scores 100.</Step>
      <Step n={2}>The six scores are combined as a weighted average, using the weights below.</Step>
      <Step n={3}>That average is multiplied by 10, giving a rating out of 1000, which sets your rank.</Step>
      <div className="n">Example: a score of 70 in every attribute gives a rating of 700, rank S.</div>
      <div className="n" style={{marginTop:8}}>Weights and score ranges are starting values and will be tuned as more matches are logged.</div></div>

    <div className="card"><h2>The six attributes</h2>
      <Attr i={0} data="matches and solo" lines={[`Expected run-out chance, Easy opening on a clean table: ${[1,2,4,6,8].map(n=>`${n} ball${n>1?'s':''} ${pc(FIN.r**n)}`).join(', ')}`,`Hard opening: x${FIN.hard}. Problem table: x${FIN.problem}.`,`Weighted success rate: 0 at ${pc(FIN.lo)}, 100 at ${pc(FIN.hi)}, the level the expected chances are set at (about top pro)`]}>
        How often you finish the rack, judged against how hard each chance was. Every chance has an expected run-out chance based on the balls on the table, the opening shot and the table. A run-out earns the part of that chance you were not expected to get, and a failure costs the expected chance, so finishing a long run earns a lot and missing a short one costs a lot. The first visit after your own break is not included. Scored once you have {MINF} chances.</Attr>
      <Attr i={1} data="Easy shots from matches and solo, Hard shots from matches" lines={[`Easy pot rate: ${rg(AN.pot)}`,`Hard make rate: ${rg(AN.hard)}`]}>
        How reliably you make shots. Mostly your pot rate on Easy openings, blended with your make rate on Hard openings. Hard shots take up to {pc(HARD.w)} of the score, reached at {HARD.n} attempts. Misses count against you and flukes do not count as makes.</Attr>
      <Attr i={2} data="matches and solo" lines={[`Position kept: ${rg(AN.pos)}`]}>
        How often your position into the next ball works out. Position kept after each ball you pot, against position errors, on Easy openings.</Attr>
      <Attr i={3} data="matches and solo">
        The quality of your breaks: breaks that drop a ball without a scratch (30%), balls dropped per break (30%), breaks that turn into a rack win (30%) and avoiding scratches (10%). This one is being reworked, so it may change.</Attr>
      <Attr i={4} data="safeties from matches, escapes from matches and solo" lines={[`Safeties forcing an escape, miss or foul: ${rg(AN.forced)}`,`Safeties not leaving an easy shot: ${rg(AN.safe)}`,`Escapes made: ${rg(AN.esc)}`]}>
        How well you play safe. The average of three rates: how often your safeties force the opponent into an escape, a miss or a foul, how often they avoid leaving an easy shot, and how often you escape when you have no shot.</Attr>
      <Attr i={5} data="matches only" lines={[`Chances without a decision error: ${rg(AN.dec)}`]}>
        How good your shot choices are. The share of your chances with no decision error, counting Easy shots lost to a bad decision and Hard shots you missed that handed the opponent an easy shot.</Attr></div>

    <div className="card"><h2>Ranks</h2>
      <div className="n">Your rating sets your rank. The rating card shows how many points you are from the next one.</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>{RANKS.map(([r,f])=><div key={r} style={{border:'1px solid var(--line)',borderRadius:8,padding:'6px 12px',textAlign:'center',minWidth:52}}>
        <b style={{fontSize:'var(--fs-b)'}}>{r}</b><div className="n">{f}+</div></div>)}</div></div>

    <div className="card"><h2>Reading the numbers</h2>
      <Item c="var(--line)" t="Missing data">An attribute with no data is left out and the other weights are scaled up to fill the gap, so a new player's rating reflects only what has been logged so far.</Item>
      <Item c="var(--line)" t="Confidence">Confidence is the weighted share of the data each attribute needs, shown as Low below {pc(CONF[0][0])}, Medium up to {pc(CONF[1][0])} and High above that. Below {pc(CONF[1][0])} the rank is marked Provisional.</Item>
      <Item c="var(--line)" t="No smoothing">Scores are your actual rates, not pulled towards the middle for small samples. Confidence tells you how far to trust them.</Item>
      <Item c="var(--line)" t="Work on">The lowest-scoring attribute among those with at least half of the data they need, shown once two or more qualify.</Item>
      <Item c="var(--line)" t="Arrows">Arrows compare your latest 4 sessions with the 4 before them.</Item></div></>;
}
