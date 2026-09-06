"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import AccessGate from "./access-gate";
import Dashboard from "./dashboard";
import { supabase } from "../lib/supabase";

export default function Page() {
  const [session, setSession] =
    useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <main className="auth-loading">
        Carregando…
      </main>
    );
  }

  if (!session) {
    return (
      <AccessGate
        onAuthenticated={async () => {
          const {
            data: { session: nextSession },
          } = await supabase.auth.getSession();

          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <Dashboard
      userEmail={session.user.email || ""}
      onLogout={async () => {
        await supabase.auth.signOut();
        setSession(null);
      }}
    />
  );
}