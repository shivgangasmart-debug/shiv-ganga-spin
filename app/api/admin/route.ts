import { getStore } from "@netlify/blobs";

const DEFAULT_PIN = "2580";
type LinkRow = {id:number;token:string;customerName:string;mobile:string;prize:string;status:string;createdAt:string;usedAt:string|null};
function store(){return getStore("sgm-lucky-spin")}
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function validPin(pin:string){const s=store();let saved=await s.get("settings:admin-pin",{type:"text"});if(!saved){saved=await hash(DEFAULT_PIN);await s.set("settings:admin-pin",saved)}return saved===await hash(pin)}

export async function POST(req:Request){
 try{
  const b=await req.json() as {action?:string;pin?:string;name?:string;mobile?:string;prize?:string;newPin?:string};
  if(!b.pin||!(await validPin(b.pin)))return Response.json({error:"गलत Admin PIN"},{status:401});
  const s=store();
  if(b.action==="login")return Response.json({ok:true});
  if(b.action==="list"){
   const found=await s.list({prefix:"link:"});
   const rows=(await Promise.all(found.blobs.map(async x=>await s.get(x.key,{type:"json"}) as LinkRow|null))).filter(Boolean) as LinkRow[];
   rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   return Response.json({links:rows.slice(0,50)});
  }
  if(b.action==="changePin"){
   if(!/^\d{4}$/.test(b.newPin||""))return Response.json({error:"PIN 4 अंकों का होना चाहिए"},{status:400});
   await s.set("settings:admin-pin",await hash(b.newPin!));return Response.json({ok:true});
  }
  if(b.action==="create"){
   if(!b.name?.trim()||!/^\d{10}$/.test(b.mobile||"")||!b.prize)return Response.json({error:"सही नाम, 10-digit mobile और Gift चुनें"},{status:400});
   const token=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().slice(0,8);
   const row:LinkRow={id:Date.now(),token,customerName:b.name.trim(),mobile:b.mobile!,prize:b.prize,status:"pending",createdAt:new Date().toISOString(),usedAt:null};
   await s.setJSON(`link:${token}`,row);return Response.json({token});
  }
  return Response.json({error:"Invalid action"},{status:400});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Server error"},{status:500})}
}
