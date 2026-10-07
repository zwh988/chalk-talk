// Recent-change indicator: latest 4 completed sessions vs the 4 before. Raw counts are aggregated by the caller (playerStats/breakStats over all 4 sessions), never per-session percentages averaged.
export const N=4,MIN_OBS=5;
/** `done` = completed session groups, newest first. Needs 2N sessions or there is no comparison. */
export const periods=<T,>(done:T[]):{cur:T[];prev:T[]}|null=>done.length>=2*N?{cur:done.slice(0,N),prev:done.slice(N,2*N)}:null;
/** Percentage-point change between [wins, observations] pairs; null when either period is too thin to trust. */
export const ppDelta=(c:number[],p:number[])=>c[1]>=MIN_OBS&&p[1]>=MIN_OBS?(c[0]/c[1]-p[0]/p[1])*100:null;
