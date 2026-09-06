import {getSupabaseAdmin} from "../../../../lib/supabase-admin";
import {normalizeEmail} from "../../../access-utils";
export async function POST(req:Request){
 try{const p=await req.json() as {name?:string,email?:string};const name=p.name?.trim(),email=normalizeEmail(p.email||"");if(!name||!email.includes("@"))return Response.json({error:"Preencha nome e e-mail corretamente."},{status:400});
 const admin=getSupabaseAdmin();const {error}=await admin.from("access_requests").upsert({name,email,status:"pending",updated_at:new Date().toISOString()},{onConflict:"email"});if(error)throw error;
 const key=process.env.RESEND_API_KEY,owner=process.env.ADMIN_EMAIL;if(key&&owner)await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||"HAS Analytics <onboarding@resend.dev>",to:[owner],subject:"Nova solicitação de acesso — HAS Analytics",html:`<h2>Nova solicitação</h2><p><strong>${name.replace(/[<>]/g,"")}</strong> solicitou acesso usando <strong>${email.replace(/[<>]/g,"")}</strong>.</p><p>Abra a área de acessos da HAS Analytics para aprovar e gerar a chave.</p>`})});
 return Response.json({message:"Solicitação enviada. Você receberá a chave após a aprovação."});}catch{return Response.json({error:"Não foi possível registrar a solicitação agora."},{status:500})}
}
