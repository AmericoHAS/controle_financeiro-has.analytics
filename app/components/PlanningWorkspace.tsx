"use client";
import { useState } from "react";
import { CalendarDays, TrendingUp, ReceiptText, Target, Wallet, CircleCheck, Circle, Trash2, Plus, Sparkles } from "lucide-react";
import { usePersistedFinance } from "../../lib/use-persisted-finance";
import type { PlanItem } from "../../lib/finance-types";
import { money as fmt } from "../../lib/finance-summary";
const initialPlan: PlanItem[] = [];
const initialBudgets: {name:string;icon:string;value:number;color:string}[] = [];
export default function PlanningWorkspace() {
  const [
    income,
    setIncome,
  ] =
    usePersistedFinance<number>(
      "planning-income",
      0
    );

  const [
    reserve,
    setReserve,
  ] =
    usePersistedFinance<number>(
      "planning-reserve",
      0
    );

  const [
    items,
    setItems,
  ] =
    usePersistedFinance<PlanItem[]>(
      "planning-items",
      initialPlan
    );

  const [
    budgets,
    setBudgets,
  ] =
    usePersistedFinance<
      typeof initialBudgets
    >(
      "planning-budgets",
      initialBudgets
    );

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const commitments =
    items
      .filter(
        (item) =>
          item.active
      )
      .reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.value,
        0
      );

  const flexible =
    budgets.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.value,
      0
    );

  const free =
    income -
    commitments -
    flexible -
    reserve;

  const plannedPct =
    income > 0
      ? Math.min(
          100,
          Math.round(
            (
              (
                commitments +
                flexible +
                reserve
              ) /
              income
            ) *
              100
          )
        )
      : 0;

  function changeBudget(
    index: number,
    value: number
  ) {
    setBudgets(
      (
        list
      ) =>
        list.map(
          (
            budget,
            current
          ) =>
            current ===
            index
              ? {
                  ...budget,

                  value:
                    Math.max(
                      0,
                      value
                    ),
                }
              : budget
        )
    );
  }

  return (
    <div className="planning-page">
      <section className="planning-top">
        <div>
          <span className="planning-kicker">
            <CalendarDays />

            {" "}
            PLANEJAMENTO
          </span>

          <h2>
            Decida o mês antes
            que ele comece.
          </h2>

          <p>
            Organize compromissos,
            limites de gasto e
            reservas.
          </p>
        </div>

        <div className="planning-score">
          <span>
            PLANEJADO
          </span>

          <b>
            {plannedPct}%
          </b>

          <div>
            <i
              style={{
                width:
                  `${plannedPct}%`,
              }}
            />
          </div>

          <small>
            {income <= 0
              ? "Informe sua receita prevista."
              : free >= 0
              ? "Seu plano está dentro da renda prevista."
              : "Seu plano ultrapassou a renda prevista."}
          </small>
        </div>
      </section>

      <section className="plan-summary">
        <article>
          <span>
            <TrendingUp />

            Receita prevista
          </span>

          <label>
            R${" "}

            <input
              aria-label="Receita prevista"
              type="number"
              step="100"
              value={
                income
              }
              onChange={(
                event
              ) =>
                setIncome(
                  Number(
                    event
                      .target
                      .value
                  )
                )
              }
            />
          </label>

          <small>
            Salários e outras
            entradas
          </small>
        </article>

        <article>
          <span>
            <ReceiptText />

            Compromissos
          </span>

          <b>
            {fmt(
              commitments
            )}
          </b>

          <small>
            {
              items.filter(
                (
                  item
                ) =>
                  item.active
              ).length
            }{" "}
            programados
          </small>
        </article>

        <article>
          <span>
            <Target />

            Reserva planejada
          </span>

          <label>
            R${" "}

            <input
              aria-label="Reserva planejada"
              type="number"
              step="50"
              value={
                reserve
              }
              onChange={(
                event
              ) =>
                setReserve(
                  Number(
                    event
                      .target
                      .value
                  )
                )
              }
            />
          </label>

          <small>
            Valor reservado
          </small>
        </article>

        <article
          className={
            free < 0
              ? "free-card danger"
              : "free-card"
          }
        >
          <span>
            <Wallet />

            Saldo livre
            projetado
          </span>

          <b>
            {free < 0
              ? "− "
              : ""}

            {fmt(
              free
            )}
          </b>

          <small>
            Depois de todo
            o plano
          </small>
        </article>
      </section>

      <div className="planning-grid">
        <section className="panel plan-commitments">
          <div className="panel-head">
            <div>
              <h3>
                Compromissos
                do mês
              </h3>

              <p>
                Adicione as
                despesas
                programadas
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditing(
                  (
                    value
                  ) =>
                    !value
                )
              }
            >
              {editing
                ? "Concluir"
                : "Editar plano"}
            </button>
          </div>

          <div className="commitment-list">
            {items.map(
              (
                item
              ) => (
                <article
                  className={
                    item.active
                      ? ""
                      : "disabled"
                  }
                  key={
                    item.id
                  }
                >
                  <button
                    type="button"
                    className="plan-check"
                    onClick={() =>
                      setItems(
                        (
                          list
                        ) =>
                          list.map(
                            (
                              current
                            ) =>
                              current.id ===
                              item.id
                                ? {
                                    ...current,

                                    active:
                                      !current.active,
                                  }
                                : current
                          )
                      )
                    }
                  >
                    {item.active ? (
                      <CircleCheck />
                    ) : (
                      <Circle />
                    )}
                  </button>

                  <span className="plan-emoji">
                    {
                      item.icon
                    }
                  </span>

                  <div>
                    <b>
                      {
                        item.name
                      }
                    </b>

                    <small>
                      {
                        item.date
                      }{" "}
                      ·{" "}
                      {
                        item.kind
                      }

                      {item.detail
                        ? ` · ${item.detail}`
                        : ""}
                    </small>
                  </div>

                  {editing ? (
                    <label className="plan-value">
                      R${" "}

                      <input
                        type="number"
                        value={
                          item.value
                        }
                        onChange={(
                          event
                        ) =>
                          setItems(
                            (
                              list
                            ) =>
                              list.map(
                                (
                                  current
                                ) =>
                                  current.id ===
                                  item.id
                                    ? {
                                        ...current,

                                        value:
                                          Number(
                                            event
                                              .target
                                              .value
                                          ),
                                      }
                                    : current
                              )
                          )
                        }
                      />
                    </label>
                  ) : (
                    <strong>
                      {fmt(
                        item.value
                      )}
                    </strong>
                  )}

                  {editing && (
                    <button
                      type="button"
                      className="plan-remove"
                      onClick={() =>
                        setItems(
                          (
                            list
                          ) =>
                            list.filter(
                              (
                                current
                              ) =>
                                current.id !==
                                item.id
                            )
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  )}
                </article>
              )
            )}
          </div>

          <button
            type="button"
            className="add-commitment"
            onClick={() =>
              setItems(
                (
                  list
                ) => [
                  ...list,

                  {
                    id:
                      Date.now(),

                    name:
                      "Novo compromisso",

                    category:
                      "Outros",

                    icon:
                      "✨",

                    date:
                      "30",

                    value:
                      0,

                    kind:
                      "Fixo",

                    active:
                      true,
                  },
                ]
              )
            }
          >
            <Plus />

            Adicionar compromisso
          </button>
        </section>

        <section className="panel plan-budgets">
          <div className="panel-head">
            <div>
              <h3>
                Limites para
                gastos variáveis
              </h3>

              <p>
                Defina quanto
                pretende gastar
              </p>
            </div>
          </div>

          <div className="budget-list">
            {budgets.map(
              (
                budget,
                index
              ) => (
                <article
                  key={
                    budget.name
                  }
                >
                  <div
                    className={`budget-icon ${budget.color}`}
                  >
                    {
                      budget.icon
                    }
                  </div>

                  <div>
                    <b>
                      {
                        budget.name
                      }
                    </b>

                    <span>
                      Limite mensal
                    </span>
                  </div>

                  <label>
                    R${" "}

                    <input
                      type="number"
                      step="50"
                      value={
                        budget.value
                      }
                      onChange={(
                        event
                      ) =>
                        changeBudget(
                          index,
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                    />
                  </label>
                </article>
              )
            )}
          </div>

          <div className="budget-total">
            <span>
              Total reservado
              para variáveis
            </span>

            <b>
              {fmt(
                flexible
              )}
            </b>
          </div>

          <div className="planning-tip">
            <Sparkles />

            <p>
              <b>
                Margem disponível
              </b>

              <br />

              Sua margem atual é{" "}

              <strong>
                {income > 0
                  ? Math.round(
                      (
                        free /
                        income
                      ) *
                        100
                    )
                  : 0}
                %
              </strong>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

