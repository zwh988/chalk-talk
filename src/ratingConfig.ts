// Everything tunable about the rating lives here. Order: Finishing, Potting, Position, Break, Defence, Discipline.
export const ATTRS=['Finishing','Potting','Position','Break','Defence','Discipline'];
export const W=[.25,.20,.20,.15,.10,.10];          // weights in the overall rating
export const K=[20,40,40,20,15,40];                // shrink toward 50: confidence = n / (n + k)
export const PROV=[40,100,100,40,30,100];          // observations needed to drop the "Provisional" tag
export const AN:Record<string,[number,number]>={   // [rate that scores 0, rate that scores 100]
  runout:[.03,.5],conv:[.3,.85],pot:[.75,.97],pos:[.6,.93],
  brkOK:[.3,.9],brkBalls:[.5,2.5],brkRun:[0,.25],brkClean:[.7,1],
  held:[.2,.7],esc:[.2,.8],foul:[.15,0],decision:[.15,0],scrap:[.8,0]};
export const RANKS:[string,number][]=[['F',0],['D',300],['C',400],['B',500],['A',600],['S',700],['SS',800],['SSS',900]];
