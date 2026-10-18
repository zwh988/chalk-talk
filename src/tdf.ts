// Table Difficulty Factor: TDF = TSF x PSF x PAF x PLF. Derived from measured inches, never stored.
// Mouth = opening across the points, throat = narrowest part inside, shelf = depth. All tunables live here.
export const TDF={
  sizes:[['12','12 ft (gigantic)',1.25],['10','10 ft (oversized)',1.10],['9','9 ft (regulation)',1],['8p','8 ft pro 8',.95],['8','8 ft (home table)',.90],['7','6-7 ft (bar box)',.85]] as [string,string,number][],
  psf:[[3.375,1.55],[3.5,1.46],[3.625,1.38],[3.75,1.31],[3.875,1.25],[4,1.2],[4.125,1.15],[4.25,1.1],[4.375,1.05],[4.5,1],[4.75,.95],[5,.91],[5.25,.88]] as [number,number][],psfTop:.85,
  // PAF: band by mouth - throat (d > each limit, first hit), values depend on PSF (<=.9 lo, <1.1 mid, else hi)
  paf:{d:[1.25,1,.875,.75,.625,.5,.375,.25],lo:[1.09,1.07,1.05,1.03,1.01,1,.98,.96,.94],mid:[1.14,1.1,1.07,1.04,1.02,1,.98,.97,.95],hi:[1.2,1.14,1.09,1.05,1.02,1,.99,.98,.97]},
  // PLF: band by shelf, values depend on PSF (<=.9 lo), PSF and PAF both <1.1 (mid), else hi
  plf:{s:[2.25,2,1.75,1.5,1.25],lo:[1.07,1.03,1.01,1,.97,.93],mid:[1.1,1.05,1.03,1,.98,.95],hi:[1.15,1.07,1.03,1,.99,.98]},
  w:[4,2], // corner : side pockets (4 corner, 2 side)
};
const band=(v:number,l:number[])=>{const i=l.findIndex(x=>v>x);return i<0?l.length:i};
export const tsf=(size:string)=>TDF.sizes.find(s=>s[0]===size)?.[2]??1;
const ok=(p:any)=>p&&p.m>0&&p.t>0&&p.s>0&&p.m>=p.t;
// factors for one pocket type {m:mouth,t:throat,s:shelf}
export function pocket(p:any){
  if(!ok(p))return null;
  const psf=TDF.psf.find(b=>p.m<=b[0])?.[1]??TDF.psfTop;
  const c=band(p.m-p.t,TDF.paf.d),paf=(psf<=.9?TDF.paf.lo:psf<1.1?TDF.paf.mid:TDF.paf.hi)[c];
  const k=band(p.s,TDF.plf.s),plf=(psf<=.9?TDF.plf.lo:psf<1.1&&paf<1.1?TDF.plf.mid:TDF.plf.hi)[k];
  return {psf,paf,plf,f:psf*paf*plf};
}
// table = {size, c:corner, p:side?}; side falls back to corner if not measured. null if corner is incomplete.
export function tdf(t:any):number|null{
  const c=pocket(t?.c);if(!c)return null;
  const s=pocket(t?.p)||c,[a,b]=TDF.w;
  return tsf(t.size)*(c.f*a+s.f*b)/(a+b);
}
export const tdfOf=(venue:any,name:string)=>{const t=venue?.d?.tables?.find((x:any)=>x.name===name);return t?tdf(t):null};
