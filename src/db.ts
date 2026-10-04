import Dexie from 'dexie';
// Every record is {id,type,u(updated ms),del(soft delete),d(payload)}. dirty=1 means not yet pushed to GitHub.
export type Rec={id:string;type:string;u:number;dirty:0|1;del?:boolean;sha?:string;d:any};
export const db=new Dexie('chalktalk') as Dexie&{recs:Dexie.Table<Rec,string>};
db.version(1).stores({recs:'id,type,dirty'});
export const uid=()=>crypto.randomUUID();
export async function save(type:string,d:any,id=uid()){
  const old=await db.recs.get(id);
  await db.recs.put({id,type,u:Date.now(),dirty:1,sha:old?.sha,del:false,d});return id;
}
export async function drop(id:string){const r=await db.recs.get(id);if(r)await db.recs.put({...r,u:Date.now(),dirty:1,del:true})}
export const ofType=(type:string)=>db.recs.where('type').equals(type).filter(r=>!r.del).toArray();
