import {useState} from 'react';
// Photo thumbnail; tap to view full-screen, tap anywhere to close.
export default function Photo({src,style}:any){
  const [o,setO]=useState(false);
  return <><img src={src} alt="Flag photo" style={{...style,cursor:'zoom-in'}} onClick={()=>setO(true)}/>
    {o&&<div onClick={()=>setO(false)} style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',paddingTop:'env(safe-area-inset-top,0px)',paddingBottom:'env(safe-area-inset-bottom,0px)',boxSizing:'border-box'}}>
      <img src={src} alt="" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
      <span style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px) + 10px)',right:16,color:'#fff',fontSize:28,lineHeight:1}}>✕</span></div>}</>;
}
