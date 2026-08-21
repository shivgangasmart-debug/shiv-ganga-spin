import { getStore } from "@netlify/blobs";
type Row={id:number;token:string;customerName:string;mobile:string;prize:string;status:string;createdAt:string;usedAt:string|null};
function store(){return getStore("sgm-lucky-spin")}

export async function GET(req:Request){
 const token=new URL(req.url).searchParams.get("token")||"";
 const row=await store().get(`link:${token}`,{type:"json"}) as Row|null;
 if(!row)return Response.json({error:"यह Spin link सही नहीं है।"},{status:404});
 return Response.json({name:row.customerName,status:row.status,prize:row.status==="used"?row.prize:null,usedAt:row.usedAt});
}

export async function POST(req:Request){
 try{
  const {token}=await req.json() as {token?:string};
  if(!token)return Response.json({error:"Invalid link"},{status:400});
  const s=store(),row=await s.get(`link:${token}`,{type:"json",consistency:"strong"}) as Row|null;
  if(!row)return Response.json({error:"यह Spin link सही नहीं है।"},{status:404});
  if(row.status!=="pending")return Response.json({error:"यह Lucky Spin पहले ही इस्तेमाल हो चुका है।",prize:row.prize},{status:409});
  const now=new Date().toISOString();
  await s.setJSON(`link:${token}`,{...row,status:"used",usedAt:now});
  return Response.json({prize:row.prize,usedAt:now});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Server error"},{status:500})}
}
