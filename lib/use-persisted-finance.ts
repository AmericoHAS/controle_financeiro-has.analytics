"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "./supabase";
export function usePersistedFinance<T>(namespace:string,initialValue:T){
 const [value,setValue]=useState<T>(initialValue),[ready,setReady]=useState(false),[saveState,setSaveState]=useState<"carregando"|"salvo"|"salvando"|"erro">("carregando");const firstSave=useRef(true);
 useEffect(()=>{let active=true;(async()=>{const {data,error}=await supabase.from("finance_records").select("payload").eq("namespace",namespace).maybeSingle();if(!active)return;if(data?.payload!=null)setValue(data.payload as T);setReady(true);setSaveState(error?"erro":"salvo")})();return()=>{active=false}},[namespace]);
 useEffect(()=>{if(!ready)return;if(firstSave.current){firstSave.current=false;return}setSaveState("salvando");const timer=window.setTimeout(async()=>{const {data:auth}=await supabase.auth.getUser();if(!auth.user)return setSaveState("erro");const {error}=await supabase.from("finance_records").upsert({user_id:auth.user.id,namespace,payload:value,updated_at:new Date().toISOString()},{onConflict:"user_id,namespace"});setSaveState(error?"erro":"salvo")},500);return()=>window.clearTimeout(timer)},[namespace,ready,value]);
 return [value,setValue,saveState] as const;
}
