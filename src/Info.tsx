// More → Info: static reference for the logging rubrics. No data, no state.
const Item=({c,t,children}:any)=><div style={{display:'flex',gap:12,margin:'14px 0'}}>
  <i aria-hidden style={{width:5,borderRadius:3,background:c,flex:'none'}}/>
  <div><div style={{fontWeight:700,fontSize:'var(--fs-b)'}}>{t}</div><div style={{fontSize:'var(--fs-m)',lineHeight:1.4}}>{children}</div></div></div>;
export default function Info(){
  return <><h1>Info</h1>
    <div className="n" style={{marginBottom:10}}>How to label a visit when you log it.</div>
    <div className="card"><h2>Opening shot</h2>
      <div className="n">What you face when you come to the table. Pick the closest match.</div>
      <Item c="var(--good)" t="Easy">A routine pot with a viable path to the next shot.</Item>
      <Item c="var(--warn)" t="Hard">A difficult pot because of a long distance or an excessive angle, or one where you have to do something unusual to get position.</Item>
      <Item c="var(--mute)" t="No shot">No reasonable offensive shot. This does not necessarily mean you are snookered.</Item></div>
    <div className="card"><h2>Table</h2>
      <div className="n">The state of the balls still on the table.</div>
      <Item c="var(--good)" t="Clean">Every ball can reasonably go into its nearest or easiest pocket.</Item>
      <Item c="var(--warn)" t="Problem">One or more balls are blocked, on the short side, or need a carom, a combo or a breakout.</Item>
      <div className="n">Problem balls carry over to later visits while they are still on the table.</div></div></>;
}
