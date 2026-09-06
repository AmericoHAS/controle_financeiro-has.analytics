import {createClient} from "@supabase/supabase-js";
export function getSupabaseAdmin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!serviceKey)throw new Error("Variáveis privadas do Supabase ausentes.");return createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})}
