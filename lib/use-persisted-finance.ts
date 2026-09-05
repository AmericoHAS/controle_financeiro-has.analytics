"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

type SaveState = "carregando" | "salvo" | "salvando" | "erro";

export function usePersistedFinance<T>(
  namespace: string,
  initialValue: T
) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] =
    useState<SaveState>("carregando");

  const loaded = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setReady(false);
      setSaveState("carregando");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setSaveState("erro");
        return;
      }

      const { data, error } = await supabase
        .from("finance_records")
        .select("payload")
        .eq("user_id", user.id)
        .eq("namespace", namespace)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(
          `Erro ao carregar ${namespace}:`,
          error
        );

        setSaveState("erro");
        return;
      }

      if (data?.payload !== null && data?.payload !== undefined) {
        setValue(data.payload as T);
      }

      loaded.current = true;
      setReady(true);
      setSaveState("salvo");
    }

    loadData();

    return () => {
      active = false;
    };
  }, [namespace]);

  useEffect(() => {
    if (!ready || !loaded.current) return;

    const timer = window.setTimeout(async () => {
      setSaveState("salvando");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveState("erro");
        return;
      }

      const { error } = await supabase
        .from("finance_records")
        .upsert(
          {
            user_id: user.id,
            namespace,
            payload: value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,namespace",
          }
        );

      if (error) {
        console.error(
          `Erro ao salvar ${namespace}:`,
          error
        );

        setSaveState("erro");
        return;
      }

      setSaveState("salvo");
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, namespace, ready]);

  return [value, setValue, saveState] as const;
}