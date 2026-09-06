"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function DefinirSenhaPage() {
  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [ready, setReady] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data,
      } =
        await supabase.auth.getSession();

      if (
        data.session
      ) {
        setReady(true);
        return;
      }

      const {
        data: listener,
      } =
        supabase.auth.onAuthStateChange(
          (
            event,
            session
          ) => {
            if (
              session ||
              event ===
                "PASSWORD_RECOVERY"
            ) {
              setReady(true);
            }
          }
        );

      setTimeout(
        () => {
          setReady(true);
        },
        1500
      );

      return () => {
        listener.subscription.unsubscribe();
      };
    }

    checkSession();
  }, []);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      password.length < 8
    ) {
      setError(
        "A senha deve ter pelo menos 8 caracteres."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "As senhas não coincidem."
      );

      return;
    }

    setLoading(true);

    const {
      error:
        updateError,
    } =
      await supabase.auth.updateUser({
        password,
      });

    if (
      updateError
    ) {
      setError(
        updateError.message ||
          "Não foi possível definir a senha."
      );

      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);

    setTimeout(
      () => {
        window.location.href =
          "/";
      },
      1800
    );
  }

  return (
    <main className="password-page">
      <section className="password-card">
        <img
          src="/has-financial-logo.png"
          alt="HAS Financial"
          className="password-logo"
        />

        {!success ? (
          <>
            <div className="password-head">
              <span>
                <LockKeyhole />
              </span>

              <div>
                <h1>
                  Defina sua senha
                </h1>

                <p>
                  Crie a senha que será usada para acessar o HAS Financial.
                </p>
              </div>
            </div>

            {!ready ? (
              <p className="password-loading">
                Validando convite...
              </p>
            ) : (
              <form
                className="password-form"
                onSubmit={
                  handleSubmit
                }
              >
                <label>
                  Nova senha

                  <div className="password-input">
                    <LockKeyhole />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event
                            .target
                            .value
                        )
                      }
                      autoComplete="new-password"
                      placeholder="Mínimo de 8 caracteres"
                      required
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
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

                <label>
                  Confirmar senha

                  <div className="password-input">
                    <LockKeyhole />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event
                      ) =>
                        setConfirmPassword(
                          event
                            .target
                            .value
                        )
                      }
                      autoComplete="new-password"
                      placeholder="Digite a senha novamente"
                      required
                    />
                  </div>
                </label>

                {error && (
                  <p className="access-message error">
                    {error}
                  </p>
                )}

                <button
                  className="password-submit"
                  type="submit"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? "Salvando..."
                    : "Definir senha"}
                </button>
              </form>
            )}

            <p className="password-support">
              Problemas com o convite?{" "}

              <a href="mailto:antunnyamerico@gmail.com?subject=Problema%20com%20convite%20-%20HAS%20Financial">
                Fale com o suporte
              </a>
            </p>
          </>
        ) : (
          <div className="password-success">
            <CheckCircle2 />

            <h1>
              Senha definida
            </h1>

            <p>
              Seu acesso está pronto. Você será redirecionado para o HAS Financial.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}