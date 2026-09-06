export async function hashValue(value:string){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
export function normalizeEmail(value:string){return value.trim().toLowerCase()}
export function makeAccessKey(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const b=new Uint8Array(10);crypto.getRandomValues(b);return Array.from(b,x=>chars[x%chars.length]).join("")}
export function makeToken(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
