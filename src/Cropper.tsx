import {useEffect,useMemo,useRef,useState} from 'react';
import {tell} from './ui';
const B=260;
// Drag to move, slider to zoom. The circle shows exactly what the avatar will look like.
export default function Cropper({file,onDone,onCancel}:any){
  const [img,setImg]=useState<ImageBitmap|null>(null),[z,setZ]=useState(1),[o,setO]=useState<any>(null),drag=useRef<any>(null);
  const url=useMemo(()=>URL.createObjectURL(file),[file]);
  useEffect(()=>{createImageBitmap(file).then(setImg).catch(()=>{tell('Could not read that photo. Try a JPEG or PNG.');onCancel()})},[]);
  if(!img)return null;
  const s=B/Math.min(img.width,img.height)*z;
  const cl=(x:number,y:number)=>({x:Math.min(0,Math.max(B-img.width*s,x)),y:Math.min(0,Math.max(B-img.height*s,y))});
  const p=cl(o?o.x:(B-img.width*s)/2,o?o.y:(B-img.height*s)/2);
  const ok=()=>{const c=document.createElement('canvas');c.width=c.height=192;c.getContext('2d')!.drawImage(img,-p.x/s,-p.y/s,B/s,B/s,0,0,192,192);onDone(c.toDataURL('image/jpeg',.8))};
  return <div className="modal"><div className="card" style={{maxWidth:340,width:'100%'}}><h2>Crop photo</h2>
    <div style={{width:B,height:B,borderRadius:'50%',overflow:'hidden',position:'relative',margin:'8px auto',touchAction:'none',border:'3px solid var(--chalk)',background:'#000'}}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX-p.x,y:e.clientY-p.y}}}
      onPointerMove={e=>{if(drag.current)setO(cl(e.clientX-drag.current.x,e.clientY-drag.current.y))}} onPointerUp={()=>{drag.current=null}}>
      <img src={url} draggable={false} style={{position:'absolute',left:p.x,top:p.y,width:img.width*s,height:img.height*s,maxWidth:'none',pointerEvents:'none',userSelect:'none'}}/></div>
    <div className="n" style={{textAlign:'center'}}>Drag to position · slide to zoom</div>
    <input type="range" min="1" max="3" step="0.01" value={z} onChange={e=>setZ(+e.target.value)} style={{padding:0,border:0}}/>
    <div className="row" style={{marginTop:10}}><button className="ghost" onClick={onCancel}>Cancel</button><button className="go sm" style={{flex:1}} onClick={ok}>Use photo</button></div></div></div>;
}
