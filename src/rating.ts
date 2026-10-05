// Fargo-style scale: tiers start at 300 and step by 50. Filler (843) lands in S; 850 is the cap (S+). Tunable later.
export const TIERS=['F','C-','C','C+','B-','B','B+','A-','A','A+','S-','S','S+'];
export const FLOOR=300,STEP=50,MAX=850;
export const clampRating=(r:number)=>Math.max(0,Math.min(MAX,r));
export const tierIndex=(r:number)=>r<FLOOR?0:Math.min(TIERS.length-1,1+Math.floor((r-FLOOR)/STEP));
export const tierOf=(r:number)=>TIERS[tierIndex(r)];
export const tierFloor=(i:number)=>i===0?0:FLOOR+(i-1)*STEP;
export const toNext=(r:number)=>{const i=tierIndex(r);return i>=TIERS.length-1?null:tierFloor(i+1)-r};
