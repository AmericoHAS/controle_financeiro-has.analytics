import {env} from "cloudflare:workers";
import {getDb} from "../../../../db";
import {accessRequests} from "../../../../db/schema";
import {normalizeEmail} from "../../../access-utils";
export async function POST(req:Request){
 try{const p=await req.json() as {name?:string,email?:string};const name=p.name?.trim(),email=normalizeEmail(p.email||"");if(!name||!email.includes("@"))return Response.json({error:"Preencha nome e e-mail corretamente."},{status:400});
 await getDb().insert(accessRequests).values({name,email,status:"pending"}).onConflictDoUpdate({target:accessRequests.email,set:{name,status:"pending"}});
 const key=env.RESEND_API_KEY;const owner=env.OWNER_EMAIL||"amefell.colab@gmail.com";if(key)await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from:"HAS Analytics <onboarding@resend.dev>",to:[owner],subject:"Nova solicitação de acesso — HAS Analytics",html:`<h2>Nova solicitação</h2><p><strong>${name.replace(/[<>]/g,"")}</strong> solicitou acesso usando <strong>${email.replace(/[<>]/g,"")}</strong>.</p><p>Abra a área de acessos da HAS Analytics para aprovar e gerar a chave.</p>`})});
 return Response.json({message:"Solicitação enviada. Você receberá a chave após a aprovação."});}catch{return Response.json({error:"Não foi possível registrar a solicitação agora."},{status:500})}
}
