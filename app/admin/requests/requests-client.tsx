"use client";

import {
  Check,
  ChevronLeft,
  KeyRound,
  Mail,
  RefreshCw,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";

type Row = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  approved_at: string | null;
};

type Filter =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export default function AdminRequests() {
  const [rows, setRows] =
    useState<Row[]>([]);

  const [busy, setBusy] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("pending");

  async function api(
    method: "GET" | "POST",
    body?: unknown
  ) {
    const { data } =
      await supabase.auth.getSession();

    return fetch(
      "/api/admin/access",
      {
        method,

        headers: {
          "content-type":
            "application/json",

          authorization:
            `Bearer ${
              data.session
                ?.access_token || ""
            }`,
        },

        body: body
          ? JSON.stringify(body)
          : undefined,
      }
    );
  }

  async function loadRows() {
    setError("");

    const response =
      await api("GET");

    const result =
      await response.json();

    if (!response.ok) {
      setError(
        result.error ||
          "Acesso restrito ao administrador."
      );

      return;
    }

    setRows(
      result.rows || []
    );
  }

  useEffect(() => {
    loadRows();
  }, []);

  const counts =
    useMemo(
      () => ({
        all:
          rows.length,

        pending:
          rows.filter(
            (row) =>
              row.status ===
              "pending"
          ).length,

        approved:
          rows.filter(
            (row) =>
              row.status ===
              "approved"
          ).length,

        rejected:
          rows.filter(
            (row) =>
              row.status ===
              "rejected"
          ).length,
      }),
      [rows]
    );

  const shownRows =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          row.status ===
          filter
      );
    }, [
      rows,
      filter,
    ]);

  async function action(
    id: number,
    type:
      | "approve"
      | "reject"
      | "resend"
  ) {
    setBusy(id);
    setError("");
    setMessage("");

    try {
      const response =
        await api(
          "POST",
          {
            id,
            type,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Não foi possível concluir a ação."
        );

        return;
      }

      if (
        type ===
        "approve"
      ) {
        setMessage(
          `Acesso aprovado para ${result.email}. O convite foi enviado por e-mail.`
        );
      }

      if (
        type ===
        "reject"
      ) {
        setMessage(
          "Solicitação recusada."
        );
      }

      if (
        type ===
        "resend"
      ) {
        setMessage(
          `Novo convite enviado para ${result.email}.`
        );
      }

      await loadRows();
    } catch (actionError) {
      console.error(
        actionError
      );

      setError(
        "Não foi possível concluir a ação."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-head">
        <div>
          <a
            href="/"
            aria-label="Voltar"
          >
            <ChevronLeft />
          </a>

          <span>
            <KeyRound />
          </span>

          <div>
            <small>
              ADMINISTRAÇÃO
            </small>

            <h1>
              Solicitações de acesso
            </h1>
          </div>
        </div>

        <div className="admin-head-actions">
          <b>
            {
              counts.pending
            }{" "}
            pendentes
          </b>

          <button
            type="button"
            onClick={
              loadRows
            }
            title="Atualizar"
          >
            <RefreshCw />
          </button>
        </div>
      </header>

      {error && (
        <div className="access-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="access-message success">
          {message}
        </div>
      )}

      <section className="admin-filters">
        <button
          type="button"
          className={
            filter ===
            "pending"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "pending"
            )
          }
        >
          Pendentes

          <span>
            {
              counts.pending
            }
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "approved"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "approved"
            )
          }
        >
          Aprovados

          <span>
            {
              counts.approved
            }
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "rejected"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "rejected"
            )
          }
        >
          Recusados

          <span>
            {
              counts.rejected
            }
          </span>
        </button>

        <button
          type="button"
          className={
            filter ===
            "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setFilter(
              "all"
            )
          }
        >
          Todos

          <span>
            {
              counts.all
            }
          </span>
        </button>
      </section>

      <section className="requests-list">
        {!error &&
        shownRows.length ===
          0 ? (
          <div className="empty-requests">
            <Mail />

            <h2>
              Nenhuma solicitação
            </h2>

            <p>
              Não há solicitações nesta categoria.
            </p>
          </div>
        ) : (
          shownRows.map(
            (row) => (
              <article
                key={
                  row.id
                }
              >
                <div className="request-avatar">
                  {row.name
                    .slice(
                      0,
                      2
                    )
                    .toUpperCase()}
                </div>

                <div className="request-info">
                  <h3>
                    {
                      row.name
                    }
                  </h3>

                  <p>
                    {
                      row.email
                    }
                  </p>

                  <small>
                    Solicitado em{" "}
                    {new Date(
                      row.created_at
                    ).toLocaleDateString(
                      "pt-BR",
                      {
                        day:
                          "2-digit",
                        month:
                          "2-digit",
                        year:
                          "numeric",
                      }
                    )}
                  </small>

                  {row.approved_at &&
                    row.status ===
                      "approved" && (
                      <small>
                        Aprovado em{" "}
                        {new Date(
                          row.approved_at
                        ).toLocaleDateString(
                          "pt-BR",
                          {
                            day:
                              "2-digit",
                            month:
                              "2-digit",
                            year:
                              "numeric",
                          }
                        )}
                      </small>
                    )}
                </div>

                <span
                  className={`request-status ${row.status}`}
                >
                  {row.status ===
                  "pending"
                    ? "Pendente"
                    : row.status ===
                      "approved"
                    ? "Aprovado"
                    : "Recusado"}
                </span>

                {row.status ===
                  "pending" && (
                  <div className="request-actions">
                    <button
                      type="button"
                      disabled={
                        busy ===
                        row.id
                      }
                      onClick={() =>
                        action(
                          row.id,
                          "reject"
                        )
                      }
                    >
                      <X />

                      Recusar
                    </button>

                    <button
                      type="button"
                      className="approve"
                      disabled={
                        busy ===
                        row.id
                      }
                      onClick={() =>
                        action(
                          row.id,
                          "approve"
                        )
                      }
                    >
                      <Check />

                      {busy ===
                      row.id
                        ? "Aprovando..."
                        : "Aprovar acesso"}
                    </button>
                  </div>
                )}

                {row.status ===
                  "approved" && (
                  <div className="request-actions">
                    <button
                      type="button"
                      disabled={
                        busy ===
                        row.id
                      }
                      onClick={() =>
                        action(
                          row.id,
                          "resend"
                        )
                      }
                    >
                      <Mail />

                      {busy ===
                      row.id
                        ? "Enviando..."
                        : "Reenviar convite"}
                    </button>
                  </div>
                )}

                {row.status ===
                  "rejected" && (
                  <div className="request-actions">
                    <button
                      type="button"
                      className="approve"
                      disabled={
                        busy ===
                        row.id
                      }
                      onClick={() =>
                        action(
                          row.id,
                          "approve"
                        )
                      }
                    >
                      <Check />

                      Aprovar acesso
                    </button>
                  </div>
                )}
              </article>
            )
          )
        )}
      </section>
    </main>
  );
}