"use client";

import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserPlus,
} from "lucide-react";

import { supabase } from "../lib/supabase";

type AccessGateProps = {
  onAuthenticated: () => void | Promise<void>;
};

export default function AccessGate({
  onAuthenticated,
}: AccessGateProps) {
  const [mode, setMode] =
    useState<"login" | "request">("login");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* =========================================================
     LOGIN
     ========================================================= */

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const data =
      new FormData(event.currentTarget);

    const email =
      String(data.get("email") || "")
        .trim()
        .toLowerCase();

    const password =
      String(data.get("password") || "");

    try {
      const {
        error: signInError,
      } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(
          "Não foi possível entrar. Verifique o e-mail e a senha."
        );

        return;
      }

      setError("");
      setMessage("");

      await onAuthenticated();
    } catch (loginError) {
      console.error(loginError);

      setMessage("");

      setError(
        "Não foi possível entrar agora. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     SOLICITAÇÃO DE ACESSO
     ========================================================= */

  async function handleRequest(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const form =
      event.currentTarget;

    const data =
      new FormData(form);

    const name =
      String(data.get("name") || "")
        .trim();

    const email =
      String(data.get("email") || "")
        .trim()
        .toLowerCase();

    if (!name || !email) {
      setMessage("");

      setError(
        "Preencha seu nome e e-mail."
      );

      setLoading(false);
      return;
    }

    try {
      const response =
        await fetch(
          "/api/access/request",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              email,
            }),
          }
        );

      let result:
        | {
            error?: string;
            message?: string;
          }
        | null = null;

      try {
        result =
          await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Não foi possível enviar a solicitação."
        );
      }

      setError("");

      setMessage(
        result?.message ||
          "Solicitação enviada. Você receberá um e-mail quando o acesso for aprovado."
      );

      form.reset();
    } catch (requestError) {
      console.error(requestError);

      setMessage("");

      setError(
        "Não foi possível enviar sua solicitação agora."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     TROCA DE TELA
     ========================================================= */

  function changeMode(
    nextMode: "login" | "request"
  ) {
    setMode(nextMode);

    setError("");
    setMessage("");
    setLoading(false);
  }

  return (
    <main className="access-page">
      <section className="access-shell">

        {/* ===================================================
            ÁREA INSTITUCIONAL
            =================================================== */}

        <div className="access-brand-panel">
          <div className="access-brand">
            <img
              src="/has-financial-logo.png"
              alt="HAS Financial"
              className="access-logo"
            />

            <div>
              <strong>
                HAS Finanças
              </strong>

              <span>
                Inteligência financeira
              </span>
            </div>
          </div>

          <div className="access-brand-copy">
            <span className="access-kicker">
              CONTROLE FINANCEIRO
            </span>

            <h1>
              Organize sua vida financeira
              em um só lugar.
            </h1>

            <p>
              Acompanhe receitas, despesas,
              cartões, contas, planejamento,
              metas e reservas.
            </p>
          </div>

          <div className="access-brand-footer">
            <span>
              HAS Finanças
            </span>

            <a
              href="https://hasanalytics.com.br"
              target="_blank"
              rel="noreferrer"
            >
              Desenvolvido por Haward Antunny ·
              HAS Analytics
            </a>
          </div>
        </div>

        {/* ===================================================
            FORMULÁRIO
            =================================================== */}

        <div className="access-form-panel">
          <div className="access-form-card">

            <div className="access-form-head">
              <span className="access-form-icon">
                {mode === "login" ? (
                  <LockKeyhole />
                ) : (
                  <UserPlus />
                )}
              </span>

              <div>
                <h2>
                  {mode === "login"
                    ? "Acessar sua conta"
                    : "Solicitar acesso"}
                </h2>

                <p>
                  {mode === "login"
                    ? "Entre com seu e-mail e senha."
                    : "Preencha seus dados para solicitar acesso à plataforma."}
                </p>
              </div>
            </div>

            {/* =================================================
                LOGIN
                ================================================= */}

            {mode === "login" ? (
              <form
                className="access-form"
                onSubmit={handleLogin}
              >
                <label>
                  E-mail

                  <div className="access-input">
                    <Mail />

                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seuemail@exemplo.com"
                      required
                    />
                  </div>
                </label>

                <label>
                  Senha

                  <div className="access-input">
                    <LockKeyhole />

                    <input
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff />
                      ) : (
                        <Eye />
                      )}
                    </button>
                  </div>
                </label>

                <a
                  className="forgot-password"
                  href="mailto:antunnyamerico@gmail.com?subject=Solicitação%20de%20troca%20de%20senha%20-%20HAS%20Financial"
                >
                  Esqueci minha senha
                </a>

                {error ? (
                  <p className="access-message error">
                    {error}
                  </p>
                ) : message ? (
                  <p className="access-message success">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="access-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Entrando..."
                    : "Entrar"}

                  {!loading && (
                    <ArrowRight />
                  )}
                </button>
              </form>
            ) : (

              /* ===============================================
                 SOLICITAÇÃO DE ACESSO
                 =============================================== */

              <form
                className="access-form"
                onSubmit={handleRequest}
              >
                <label>
                  Nome completo

                  <div className="access-input">
                    <UserPlus />

                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      required
                    />
                  </div>
                </label>

                <label>
                  E-mail

                  <div className="access-input">
                    <Mail />

                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seuemail@exemplo.com"
                      required
                    />
                  </div>
                </label>

                {error ? (
                  <p className="access-message error">
                    {error}
                  </p>
                ) : message ? (
                  <p className="access-message success">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="access-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Enviando..."
                    : "Enviar solicitação"}

                  {!loading && (
                    <ArrowRight />
                  )}
                </button>
              </form>
            )}

            {/* =================================================
                TROCA LOGIN / SOLICITAÇÃO
                ================================================= */}

            <div className="access-switch">
              <span>
                {mode === "login"
                  ? "Ainda não possui acesso?"
                  : "Já possui uma conta?"}
              </span>

              <button
                type="button"
                onClick={() =>
                  changeMode(
                    mode === "login"
                      ? "request"
                      : "login"
                  )
                }
              >
                {mode === "login"
                  ? "Solicitar acesso"
                  : "Voltar ao login"}
              </button>
            </div>

            <div className="access-support">
              Problemas para acessar?{" "}

              <a href="mailto:antunnyamerico@gmail.com?subject=Suporte%20HAS%20Financial">
                Fale com o suporte
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}