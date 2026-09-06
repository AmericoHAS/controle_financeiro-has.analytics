"use client";
import {useEffect,useState} from "react";
import type {Session} from "@supabase/supabase-js";
import Dashboard from "./dashboard";
import AccessGate from "./access-gate";
import {supabase} from "../lib/supabase";
export default function Page(){
 const [session,setSession]=useState<Session|null|undefined>(undefined);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>data.subscription.unsubscribe()},[]);
 if(session===undefined)return <main className="auth-loading">Carregando…</main>;
 if(!session)return <AccessGate/>;
 return <Dashboard userEmail={session.user.email||""} onLogout={()=>supabase.auth.signOut()}/>;
}
