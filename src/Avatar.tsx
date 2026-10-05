const hue=(s:string)=>[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
// Photo if the player has one, otherwise their initial on a colour derived from their id.
export default function Avatar({p,size=28}:{p:any;size?:number}){
  const pic=p?.d?.pic;
  return <span style={{width:size,height:size,borderRadius:'50%',flex:'none',display:'inline-grid',placeItems:'center',color:'#fff',fontWeight:800,fontSize:size*.45,overflow:'hidden',verticalAlign:'middle',background:pic?`url(${pic}) center/cover`:`hsl(${hue(p?.id||'?')} 45% 38%)`}}>{!pic&&(p?.d?.name?.[0]||'?')}</span>;
}
