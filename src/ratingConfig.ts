// Everything tunable about the rating lives here. Order: Finishing, Shotmaking, Position, Break, Defence, Decision. All anchors/weights/cut-offs are placeholders until calibrated on logged players (RATING_AND_INITIATIVE_UPDATE.md B6).
export const ATTRS=['Finishing','Shotmaking','Position','Break','Defence','Decision'];
export const W=[.25,.15,.15,.20,.15,.10];          // weights in the overall rating (sum 1)
export const PROV=[40,100,100,40,30,80];           // observations needed to drop the "Provisional" tag (Shotmaking counts Easy-opening balls + Hard attempts, Position counts balls)
export const MINB=5;                               // Finishing: a length bucket counts in full from this many chances; below it, weight n/MINB. Finishing needs at least one full bucket
export const RO:[number,number][]=[[.05,.5],[.3,.85],[.5,.95]]; // run-out rate anchors by balls on the table at the start: 6+, 3–5, 1–2
export const AN:Record<string,[number,number]>={   // [rate that scores 0, rate that scores 100]
  pot:[.75,.97],hard:[.3,.7],pos:[.6,.93],dec:[.85,.99],        // per ball / per resolved chance (clean rates)
  forced:[.05,.35],safe:[.45,.9],esc:[.2,.8],      // Defence: forced-error rate, safe rate (not leaving an easy shot), escape success
  brkOK:[.3,.9],brkBalls:[.5,2.5],brkRun:[0,.25],brkClean:[.7,1]}; // Break (unchanged, being reworked separately)
export const HARD={w:.25,n:10};                  // Shotmaking = Easy per-ball pot rate blended with the Hard-opening make rate (misses count): Hard takes up to `w` of the score, scaled by min(1, attempts/`n`)
export const RANKS:[string,number][]=[['F',0],['D',300],['C',400],['B',500],['A',600],['S',700],['SS',800],['SSS',900]];
export const CONF:[number,string][]=[[.4,'Low'],[.75,'Medium'],[1.01,'High']]; // confidence bands: below .4 Low, below .75 Medium (provisional rank), else High
