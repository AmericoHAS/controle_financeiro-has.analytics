import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import Dashboard from "./dashboard";
import AccessGate from "./access-gate";
import { getDb } from "../db";
import { accessSessions } from "../db/schema";
import { hashValue } from "./access-utils";
import { env } from "cloudflare:workers";
export const dynamic="force-dynamic";
export default async function Page(){
  const h=await headers();
  const owner=h.get("oai-authenticated-user-email")===(env.OWNER_EMAIL||"amefell.colab@gmail.com");
  if(owner)return <Dashboard/>;
  const token=(await cookies()).get("clareza_session")?.value;
  if(token){const rows=await getDb().select().from(accessSessions).where(and(eq(accessSessions.tokenHash,await hashValue(token)),gt(accessSessions.expiresAt,new Date().toISOString()))).limit(1);if(rows.length)return <Dashboard/>}
  return <AccessGate/>;
}
