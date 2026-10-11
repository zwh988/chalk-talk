// Everything tunable about the rating lives here. Order: Finishing, Shotmaking, Position, Break, Defence, Decision. All anchors/weights/cut-offs are placeholders until calibrated on logged players (RATING_AND_INITIATIVE_UPDATE.md B6).
export const ATTRS=['Finishing','Shotmaking','Position','Break','Defence','Decision'];
export const W=[.25,.15,.15,.20,.15,.10];          // weights in the overall rating (sum 1)
export const PROV=[40,100,100,40,30,80];           // observations needed to drop the "Provisional" tag (Shotmaking counts Easy-opening balls + Hard attempts, Position counts balls)
export const MINF=5;                               // Finishing is scored once there are this many chances
export const FIN={r:.85,hard:.6,problem:.7,lo:.1,hi:.5};      // Finishing: expected run-out chance p = r^(balls on the table at the start), × hard for a Hard opening, × problem for a Problem table (r = per-ball pot-and-position reliability, about top-pro level). A run-out counts 1−p, a failed chance counts p; the weighted success rate S/(S+F) scores 0 at lo and 100 at hi (hi = performing exactly as expected)
export const AN:Record<string,[number,number]>={   // [rate that scores 0, rate that scores 100]
  pot:[.6,.97],hard:[.3,.7],pos:[.6,.93],dec:[.75,.97],        // per ball / per resolved chance (clean rates)
  forced:[.1,.6],safe:[.45,.9],esc:[.2,.8],      // Defence: forced-error rate, safe rate (not leaving an easy shot), escape success
  brkOK:[.3,.9],brkBalls:[.5,2.5],brkRun:[0,.25],brkClean:[.7,1]}; // Break (unchanged, being reworked separately)
export const HARD={w:.25,n:10};                  // Shotmaking = Easy per-ball pot rate blended with the Hard-opening make rate (misses count): Hard takes up to `w` of the score, scaled by min(1, attempts/`n`)
export const RANKS:[string,number][]=[['F',0],['D',300],['C',400],['B',500],['A',600],['S',700],['SS',800],['SSS',900]];
export const CONF:[number,string][]=[[.4,'Low'],[.75,'Medium'],[1.01,'High']]; // confidence bands: below .4 Low, below .75 Medium (provisional rank), else High
