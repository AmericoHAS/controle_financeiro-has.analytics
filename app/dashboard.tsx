"use client";

import type { LedgerStatus, Ledger, FinanceCard, FinanceAccount } from "../lib/finance-types";
import OverviewChart from "./components/OverviewChart";
import StatementImport from "./components/StatementImport";
import ProfileMenu from "./components/ProfileMenu";
import PreferencesWorkspace, { defaultPreferences } from "./components/PreferencesWorkspace";
import ModalHead from "./components/ModalHead";
import PlanningWorkspace from "./components/PlanningWorkspace";
import AccountsWorkspace from "./components/AccountsWorkspace";
import GoalsWorkspace from "./components/GoalsWorkspace";
import AnnualReportWorkspace from "./components/AnnualReportWorkspace";
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  CircleCheck,
  CreditCard,
  Filter,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";

import { usePersistedFinance } from "../lib/use-persisted-finance";

/* =========================================================
   UTILIDADES
   ========================================================= */

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(n));

function currentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function currentDateKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function changeMonth(
  current: string,
  amount: number
) {
  const [year, month] = current
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(year, month - 1, 1)
  );
}

function defaultDateForMonth(
  month: string
) {
  if (month === currentMonthKey()) {
    return currentDateKey();
  }

  return `${month}-01`;
}

function formatDate(date: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return date;
  }

  const [year, month, day] = date
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
    }
  )
    .format(
      new Date(year, month - 1, day)
    )
    .replace(".", "");
}

function dateBelongsToMonth(
  date: string,
  selectedMonth: string
) {
  return date.startsWith(
    selectedMonth
  );
}

function addMonthsToDateKey(
  dateKey: string,
  amount: number
) {
  const [year, month, day] =
    dateKey
      .split("-")
      .map(Number);

  const target = new Date(
    year,
    month - 1 + amount,
    1
  );

  const targetYear =
    target.getFullYear();

  const targetMonth =
    target.getMonth();

  const lastDay =
    new Date(
      targetYear,
      targetMonth + 1,
      0
    ).getDate();

  const safeDay =
    Math.min(day, lastDay);

  return `${targetYear}-${String(
    targetMonth + 1
  ).padStart(2, "0")}-${String(
    safeDay
  ).padStart(2, "0")}`;
}

async function saveFinanceNamespace(
  namespace: string,
  payload: unknown
) {
  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Usuário não autenticado."
    );
  }

  const { error } =
    await supabase
      .from("finance_records")
      .upsert(
        {
          user_id: user.id,
          namespace,
          payload,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,namespace",
        }
      );

  if (error) {
    throw error;
  }
}

/* =========================================================
   TIPOS
   ========================================================= */

/* =========================================================
   NORMALIZAÇÃO DOS STATUS ANTIGOS
   ========================================================= */

function normalizedStatus(
  entry: Ledger
): LedgerStatus {
  if (
    entry.status === "Confirmado"
  ) {
    if (
      entry.type === "Receita"
    ) {
      return "Recebido";
    }

    if (
      entry.type === "Despesa"
    ) {
      return "Pago";
    }

    return "Confirmado";
  }

  if (
    entry.status === "Previsto"
  ) {
    if (
      entry.type === "Receita"
    ) {
      return "A receber";
    }

    if (
      entry.type === "Despesa"
    ) {
      return "A pagar";
    }

    return "Previsto";
  }

  return entry.status;
}

/* =========================================================
   VALORES INICIAIS
   ========================================================= */

const ledgerSeed: Ledger[] = [];

const initialCards:
  FinanceCard[] = [];

const initialAccounts:
  FinanceAccount[] = [];

const categorySeed = [
  ["Salário", "💼", "Receita"],
  ["Bolsa", "🎓", "Receita"],
  ["Freelance", "💻", "Receita"],
  ["Renda extra", "📈", "Receita"],
  ["Investimentos", "💰", "Receita"],
  ["Reembolso", "↩️", "Receita"],
  ["Outras receitas", "✨", "Receita"],

  ["Moradia", "🏠", "Despesa"],
  ["Mercado", "🛒", "Despesa"],
  ["Alimentação", "🍽️", "Despesa"],
  ["Transporte", "🚗", "Despesa"],
  ["Combustível", "⛽", "Despesa"],
  ["Saúde", "❤️", "Despesa"],
  ["Educação", "📚", "Despesa"],
  ["Lazer", "🎮", "Despesa"],
  ["Compras", "🛍️", "Despesa"],
  ["Assinaturas", "🎵", "Despesa"],
  ["Contas da casa", "💡", "Despesa"],
  ["Impostos", "🧾", "Despesa"],
  ["Outras despesas", "✨", "Despesa"],
];

const bankCatalog = [
  ["Nubank", "#820ad1", "#4c0677", "NU"],
  ["Inter", "#ff7a00", "#c94d00", "inter"],
  ["Itaú", "#ec7000", "#073f87", "itaú"],
  [
    "Banco do Brasil",
    "#f9dc16",
    "#173863",
    "BB",
  ],
  ["Caixa", "#087bb8", "#005ca9", "CAIXA"],
  [
    "Bradesco",
    "#cc092f",
    "#8e0623",
    "bradesco",
  ],
  [
    "Santander",
    "#ec0000",
    "#9e0000",
    "S",
  ],
  [
    "C6 Bank",
    "#242424",
    "#050505",
    "C6",
  ],
  [
    "BTG Pactual",
    "#18365f",
    "#071a34",
    "BTG",
  ],
  ["XP", "#171717", "#000000", "XP"],
  [
    "Sicredi",
    "#68a82f",
    "#39751e",
    "sicredi",
  ],
  [
    "Sicoob",
    "#006b5b",
    "#003b37",
    "sicoob",
  ],
  [
    "PicPay",
    "#21c25e",
    "#087f42",
    "PicPay",
  ],
  [
    "Mercado Pago",
    "#16aee8",
    "#0876b9",
    "mercado pago",
  ],
  [
    "PagBank",
    "#42b549",
    "#187c31",
    "PagBank",
  ],
  [
    "Neon",
    "#00b8e6",
    "#006ed0",
    "neon",
  ],
] as const;

/* =========================================================
   HOME
   ========================================================= */

export default function Home({
  userEmail,
  onLogout,
}: {
  userEmail: string;
  onLogout: () => void;
}) {
  const [
    section,
    setSection,
  ] =
    useState("Visão geral");

  const [
    mobile,
    setMobile,
  ] =
    useState(false);

  const [
    collapsed,
    setCollapsed,
  ] =
    useState(false);

  const [
    month,
    setMonth,
  ] =
    useState(currentMonthKey);





  const [
    entries,
    setEntries,
    saveState,
  ] =
    usePersistedFinance<
      Ledger[]
    >(
      "ledger",
      ledgerSeed
    );

  const [
    investmentAccounts,
    setInvestmentAccounts,
    accountsSaveState,
  ] =
    usePersistedFinance<
      FinanceAccount[]
    >(
      "accounts",
      initialAccounts
    );

  const [cards] =
    usePersistedFinance<
      FinanceCard[]
    >(
      "cards",
      initialCards
    );

  const [homeCategories] =
    usePersistedFinance<
      string[][]
    >(
      "categories",
      categorySeed
    );

  const [
    importOpen,
    setImportOpen,
  ] =
    useState(false);

  const [
    investOpen,
    setInvestOpen,
  ] =
    useState(false);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [preferences, setPreferences, preferencesState] = usePersistedFinance("preferences", defaultPreferences);

  const nav = [
    [
      "Visão geral",
      LayoutDashboard,
    ],

    [
      "Planejamento",
      CalendarDays,
    ],

    [
      "Lançamentos",
      ArrowUpRight,
    ],

    [
      "Cartões",
      CreditCard,
    ],

    [
      "Contas",
      Landmark,
    ],

    [
      "Metas e reservas",
      Target,
    ],

    [
      "Relatório anual",
      PiggyBank,
    ],

    [
      "Acessos",
      KeyRound,
    ],
  ] as const;

  const monthEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) =>
            dateBelongsToMonth(
              entry.date,
              month
            )
        ),
      [
        entries,
        month,
      ]
    );

  /* =======================================================
     RESUMO FINANCEIRO
     ======================================================= */

  const income =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Receita"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const spent =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Despesa"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const invested =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Investimento"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  /*
    Este é o valor previsto considerando
    TODAS as receitas e despesas,
    independentemente de já terem sido
    recebidas ou pagas.
  */
  const projectedBalance =
    income -
    spent -
    invested;

  const received =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Receita" &&
          normalizedStatus(
            entry
          ) ===
            "Recebido"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const toReceive =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Receita" &&
          normalizedStatus(
            entry
          ) ===
            "A receber"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const paid =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Despesa" &&
          normalizedStatus(
            entry
          ) ===
            "Pago"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const toPay =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Despesa" &&
          normalizedStatus(
            entry
          ) ===
            "A pagar"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  /*
    Dinheiro efetivamente realizado
    até o momento.
  */
  const realizedBalance =
    received -
    paid -
    invested;

  const cardExpenses =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Despesa" &&
          entry.sourceType ===
            "card"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const cardEntryCount =
    monthEntries.filter(
      (entry) =>
        entry.type ===
          "Despesa" &&
        entry.sourceType ===
          "card"
    ).length;


    const totalCardLimit =
  cards.reduce(
    (total, card) =>
      total +
      Number(card.limit || 0),
    0
  );

const usedCardLimit =
  entries
    .filter(
      (entry) =>
        entry.type === "Despesa" &&
        entry.sourceType === "card" &&
        normalizedStatus(entry) ===
          "A pagar"
    )
    .reduce(
      (total, entry) =>
        total + entry.value,
      0
    );

const availableCardLimit =
  Math.max(
    0,
    totalCardLimit -
      usedCardLimit
  );
  /* =======================================================
     PROGRESSO DOS KPIs
     ======================================================= */

  const kpiMaximum =
    Math.max(
      income,
      spent,
      cardExpenses,
      invested,
      1
    );

  const incomeProgress =
    (income /
      kpiMaximum) *
    100;

  const expenseProgress =
    (spent /
      kpiMaximum) *
    100;

  const cardProgress =
    (cardExpenses /
      kpiMaximum) *
    100;

  const reserveProgress =
    (invested /
      kpiMaximum) *
    100;

  /* =======================================================
     CATEGORIAS
     ======================================================= */

  function getCategoryIcon(
    categoryName: string
  ) {
    const category =
      homeCategories.find(
        (item) =>
          item[0] ===
          categoryName
      );

    return (
      category?.[1] ||
      "✨"
    );
  }

  const cats =
    useMemo(() => {
      const totals =
        monthEntries
          .filter(
            (entry) =>
              entry.type ===
              "Despesa"
          )
          .reduce(
            (
              acc,
              entry
            ) => {
              acc[
                entry.category
              ] =
                (
                  acc[
                    entry.category
                  ] || 0
                ) +
                entry.value;

              return acc;
            },
            {} as Record<
              string,
              number
            >
          );

      return Object.entries(
        totals
      ).sort(
        (a, b) =>
          b[1] -
          a[1]
      );
    }, [
      monthEntries,
    ]);

   const categoryColors = [
  "#118f8b",
  "#4c73c9",
  "#d6a63b",
  "#d76b61",
  "#7c6db0",
];

const topCategories =
  cats.slice(0, 5);

const categoryTotal =
  topCategories.reduce(
    (total, [, value]) =>
      total + value,
    0
  );

const donutBackground =
  categoryTotal > 0
    ? `conic-gradient(${topCategories
        .map(
          ([, value], index) => {
            const previous =
              topCategories
                .slice(0, index)
                .reduce(
                  (
                    sum,
                    [, current]
                  ) =>
                    sum +
                    current,
                  0
                ) /
              categoryTotal *
              100;

            const current =
              previous +
              (value /
                categoryTotal) *
                100;

            return `${categoryColors[index]} ${previous}% ${current}%`;
          }
        )
        .join(", ")})`
    : "#edf2f2";

  const filtered =
    monthEntries.filter(
      (entry) =>
        entry.type ===
          "Despesa" &&
        (
          entry.name +
          entry.category +
          entry.account
        )
          .toLowerCase()
          .includes(
            query.toLowerCase()
          )
    );

  

  /* =======================================================
     ALTERAR STATUS CLICANDO
     ======================================================= */

  async function toggleEntryStatus(
    entry: Ledger
  ) {
    let nextStatus:
      LedgerStatus;

    const currentStatus =
      normalizedStatus(
        entry
      );

    if (
      entry.type ===
      "Receita"
    ) {
      nextStatus =
        currentStatus ===
        "Recebido"
          ? "A receber"
          : "Recebido";
    } else if (
      entry.type ===
      "Despesa"
    ) {
      nextStatus =
        currentStatus ===
        "Pago"
          ? "A pagar"
          : "Pago";
    } else {
      return;
    }

    const updatedEntries =
      entries.map(
        (item) =>
          item.id ===
          entry.id
            ? {
                ...item,
                status:
                  nextStatus,
              }
            : item
      );

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Não foi possível alterar o status."
      );
    }
  }

  /* =======================================================
     IMPORTAÇÃO
     ======================================================= */

  async function submitInvestment(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const fd =
      new FormData(
        event.currentTarget
      );

    const accountId =
      Number(
        fd.get(
          "investmentAccount"
        )
      );

    const amount =
      Math.abs(
        Number(
          fd.get(
            "investmentValue"
          )
        ) || 0
      );

    if (
      amount <= 0
    ) {
      alert(
        "Informe um valor válido."
      );

      return;
    }

    if (
      amount >
      projectedBalance
    ) {
      alert(
        "O valor não pode ser maior que o saldo previsto."
      );

      return;
    }

    const account =
      investmentAccounts.find(
        (item) =>
          item.id ===
          accountId
      );

    if (!account) {
      alert(
        "Selecione uma conta."
      );

      return;
    }

    const updatedAccounts =
      investmentAccounts.map(
        (item) =>
          item.id ===
          accountId
            ? {
                ...item,

                balance:
                  item.balance +
                  amount,
              }
            : item
      );

    const movement:
      Ledger = {
      id:
        Date.now(),

      type:
        "Investimento",

      name:
        "Reserva / investimento",

      category:
        "Investimentos",

      icon:
        "🐷",

      date:
        defaultDateForMonth(
          month
        ),

      value:
        amount,

      account:
        `${account.name} · ${account.bank}`,

      frequency:
        "Único",

      status:
        "Confirmado",

      sourceType:
        "account",

      sourceId:
        account.id,
    };

    const updatedEntries =
      [
        movement,
        ...entries,
      ];

    try {
      await saveFinanceNamespace(
        "accounts",
        updatedAccounts
      );

      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setInvestmentAccounts(
        updatedAccounts
      );

      setEntries(
        updatedEntries
      );

      setInvestOpen(
        false
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Não foi possível guardar o dinheiro."
      );
    }
  }

  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${preferences.animations ? "" : "reduce-motion"} ${preferences.compact ? "compact-view" : ""}`}
    >
      <aside
        className={
          mobile
            ? "sidebar open"
            : "sidebar"
        }
      >
        <button
          className="collapse-sidebar"
          onClick={() =>
            setCollapsed(
              (value) =>
                !value
            )
          }
          aria-label={
            collapsed
              ? "Expandir menu"
              : "Recolher menu"
          }
        >
          {collapsed ? (
            <PanelLeftOpen />
          ) : (
            <PanelLeftClose />
          )}
        </button>

        <div className="brand">
          <img
            className={collapsed ? "brandmark has-icon" : "brandmark has-logo"}
            src={collapsed ? "/icon.png" : "/has-financial-logo.png"}
            alt="HAS Financial"
          />

          <div>
            <strong>
              HAS Financial
            </strong>

            <small>
              Inteligência financeira
            </small>
          </div>

          <button
            className="close-mobile"
            onClick={() =>
              setMobile(false)
            }
          >
            <X />
          </button>
        </div>

        <nav>
          {nav.map(
            ([
              name,
              Icon,
            ]) => (
              <button
                key={name}
                className={
                  section ===
                  name
                    ? "nav active"
                    : "nav"
                }
                onClick={() => {
                  if (
                    name ===
                    "Acessos"
                  ) {
                    location.href =
                      "/admin/requests";

                    return;
                  }

                  setSection(
                    name
                  );

                  setMobile(
                    false
                  );
                }}
              >
                <Icon />

                <span>
                  {name}
                </span>
              </button>
            )
          )}
        </nav>

        <div className="side-bottom">
          

          <ProfileMenu name={preferences.displayName || userEmail.split("@")[0]} email={userEmail} onProfile={() => { setSection("Minha conta"); setMobile(false); }} onLogout={onLogout} />
        </div>
      </aside>

      {mobile && (
        <button
          className="backdrop"
          onClick={() =>
            setMobile(false)
          }
          aria-label="Fechar menu"
        />
      )}

      <main>
        <header>
  <button
    className="hamb"
    onClick={() => setMobile(true)}
  >
    <Menu />
  </button>

  <div>
    <p>
      MINHA VIDA FINANCEIRA
      {" · "}

      {saveState === "salvando"
        ? "SALVANDO…"
        : saveState === "erro"
        ? "ERRO AO SALVAR"
        : saveState === "carregando"
        ? "CARREGANDO…"
        : "SALVO"}
    </p>

    <h1>{section}</h1>
  </div>

  <div className="header-actions">
    <div className="month-navigation">
      <button
        type="button"
        onClick={() =>
          setMonth((current) =>
            changeMonth(current, -1)
          )
        }
      >
        ‹
      </button>

      <div className="month-current">
  <CalendarDays />

  <span>
    {new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "numeric",
    })
      .format(
        new Date(
          Number(month.split("-")[0]),
          Number(month.split("-")[1]) - 1,
          1
        )
      )
      .replace(".", "")}
  </span>
</div>

      <button
        type="button"
        onClick={() =>
          setMonth((current) =>
            changeMonth(current, 1)
          )
        }
      >
        ›
      </button>
    </div>

    
  </div>
</header>

        {section ===
        "Cartões" ? (
          <BankCatalog entries={entries} />
        ) : section ===
          "Contas" ? (
          <AccountsWorkspace accounts={investmentAccounts} setAccounts={setInvestmentAccounts} entries={entries} saveState={accountsSaveState} />
        ) : section ===
          "Planejamento" ? (
          <PlanningWorkspace key={month} entries={entries} selectedMonth={month} onEntries={() => setSection("Lançamentos")} />
        ) : section ===
          "Lançamentos" ? (
          <TransactionsWorkspace
            importReady={saveState === "salvo" && accountsSaveState === "salvo"}
            accounts={investmentAccounts}
            setAccounts={setInvestmentAccounts}
            onImport={() => setImportOpen(true)}
            selectedMonth={
              month
            }
            entries={
              entries
            }
            setEntries={
              setEntries
            }
          />
        ) : section === "Metas e reservas" ? (
          <GoalsWorkspace entries={entries} accounts={investmentAccounts} />
        ) : section === "Relatório anual" ? (
          <AnnualReportWorkspace entries={entries} selectedMonth={month} />
        ) : section === "Preferências" || section === "Minha conta" ? (
          preferencesState === "carregando" ? <p className="preferences-page">Carregando preferências…</p> : <PreferencesWorkspace key={section} preferences={preferences} onSave={setPreferences} state={preferencesState} email={userEmail} onLogout={onLogout} profile={section === "Minha conta"} />
        ) : section !==
          "Visão geral" ? (
          <div className="section-placeholder">
            <div className="placeholder-icon">
              <Sparkles />
            </div>

            <h2>
              {section}
            </h2>

            <p>
              Esta área faz parte do seu
              controle financeiro.
            </p>
          </div>
        ) : (
          <div className="content">

            {/* ============================================
                PAINEL PRINCIPAL
                ============================================ */}

            <section className="forecast forecast-new">
              <div className="forecast-main">
                <span className="eyebrow">
                  PREVISÃO DO MÊS ·{" "}
                  {monthLabel(
                    month
                  )}
                </span>

                <h2>
                  {projectedBalance <
                  0
                    ? "− "
                    : ""}

                  {fmt(
                    projectedBalance
                  )}
                </h2>

                <p>
                  Valor previsto após considerar
                  todas as receitas, despesas e
                  reservas do mês.
                </p>

                {projectedBalance >
                  0 && (
                  <button
                    type="button"
                    className="invest-balance"
                    onClick={() =>
                      setInvestOpen(
                        true
                      )
                    }
                  >
                    <PiggyBank />

                    Guardar saldo
                  </button>
                )}
              </div>

              <div className="forecast-stats">
                <article>
                  <span>
                    Receitas previstas
                  </span>

                  <b className="green">
                    +{" "}
                    {fmt(
                      income
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    Despesas previstas
                  </span>

                  <b className="red">
                    −{" "}
                    {fmt(
                      spent
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    Já recebido
                  </span>

                  <b className="green">
                    +{" "}
                    {fmt(
                      received
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    A receber
                  </span>

                  <b>
                    {fmt(
                      toReceive
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    Já pago
                  </span>

                  <b className="red">
                    −{" "}
                    {fmt(
                      paid
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    A pagar
                  </span>

                  <b>
                    {fmt(
                      toPay
                    )}
                  </b>
                </article>

                <article>
                  <span>
                    Guardado
                  </span>

                  <b>
                    {fmt(
                      invested
                    )}
                  </b>
                </article>

                <article className="forecast-highlight">
                  <span>
                    Saldo realizado
                  </span>

                  <b>
                    {realizedBalance <
                    0
                      ? "− "
                      : ""}

                    {fmt(
                      realizedBalance
                    )}
                  </b>
                </article>
              </div>
            </section>

            <div className="alert">
              <Sparkles />

              <div>
                <b>
                  {monthEntries.length
                    ? `Dados de ${monthLabel(
                        month
                      )}`
                    : `Nenhum lançamento em ${monthLabel(
                        month
                      )}`}
                </b>

                <span>
                  O saldo projetado considera
                  também valores ainda não pagos
                  ou recebidos.
                </span>
              </div>

              <button
                onClick={() =>
                  setSection(
                    "Lançamentos"
                  )
                }
              >
                Ver lançamentos
              </button>
            </div>

            {/* ============================================
                KPIs
                ============================================ */}

            <section className="kpis">
              <Kpi
                title="Receitas"
                value={fmt(
                  income
                )}
                sub={monthLabel(
                  month
                )}
                foot={`${monthEntries.filter(
                  (entry) =>
                    entry.type ===
                    "Receita"
                ).length} lançamentos`}
                kind="green"
                progress={
                  incomeProgress
                }
              />

              <Kpi
                title="Despesas"
                value={fmt(
                  spent
                )}
                sub={monthLabel(
                  month
                )}
                foot={`${monthEntries.filter(
                  (entry) =>
                    entry.type ===
                    "Despesa"
                ).length} lançamentos`}
                kind="coral"
                progress={
                  expenseProgress
                }
              />

              <Kpi
  title="Cartões"
  value={fmt(cardExpenses)}
  sub={
    totalCardLimit > 0
      ? `Limite disponível: ${fmt(
          availableCardLimit
        )}`
      : "Cadastre o limite dos cartões"
  }
  foot={`${cardEntryCount} lançamentos`}
  kind="cards"
  progress={cardProgress}
/>

              <Kpi
                title="Reservas"
                value={fmt(
                  invested
                )}
                sub="Guardado no período"
                foot={
                  invested > 0
                    ? "Valor destinado a reservas"
                    : "Nenhum valor guardado"
                }
                kind="gold"
                progress={
                  reserveProgress
                }
              />
            </section>

            {/* ============================================
                GRÁFICOS
                ============================================ */}

            <div className="grid-main">
              <OverviewChart entries={entries} month={month} />

              <section className="panel categories">
                <PanelHead
                  title="Para onde foi o dinheiro"
                  sub={monthLabel(
                    month
                  )}
                />

                <div className="donut-wrap">
                 <div
  className="donut"
  style={{
    background: donutBackground,
  }}
>
                    <div>
                      <b>
                        {fmt(
                          spent
                        )}
                      </b>

                      <span>
                        total gasto
                      </span>
                    </div>
                  </div>

                  <div className="cat-list">
                   {topCategories.map(
                        (
                          [
                            category,
                            value,
                          ],
                          index
                        ) => (
                          <div
                            key={
                              category
                            }
                          >
                            <span>
                              <i
  className={`c${index}`}
  style={{
  background:
    categoryColors[index],
}}
/>

                              <span className="category-emoji">
                                {getCategoryIcon(
                                  category
                                )}
                              </span>

                              {
                                category
                              }
                            </span>

                            <b>
                              {fmt(
                                value
                              )}
                            </b>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </section>
            </div>

            {/* ============================================
                DESPESAS DO MÊS
                ============================================ */}

            <section className="panel transactions">
              <div className="panel-head">
                <div>
                  <h3>
                    Despesas de{" "}
                    {monthLabel(
                      month
                    )}
                  </h3>

                  <p>
                    Clique no status para marcar
                    uma despesa como paga ou
                    pendente.
                  </p>
                </div>

                <div className="table-actions">
                  <label>
                    <Search />

                    <input
                      placeholder="Buscar"
                      value={
                        query
                      }
                      onChange={(
                        event
                      ) =>
                        setQuery(
                          event
                            .target
                            .value
                        )
                      }
                    />
                  </label>

                  <button
                    onClick={() =>
                      setSection(
                        "Lançamentos"
                      )
                    }
                  >
                    <Plus />

                    Adicionar
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Data
                      </th>

                      <th>
                        Descrição
                      </th>

                      <th>
                        Categoria
                      </th>

                      <th>
                        Conta / cartão
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map(
                      (
                        entry
                      ) => (
                        <tr
                          key={
                            entry.id
                          }
                        >
                          <td>
                            {formatDate(
                              entry.date
                            )}
                          </td>

                          <td>
                            <span className="tx-icon">
                              {
                                entry.icon
                              }
                            </span>

                            <b>
                              {
                                entry.name
                              }
                            </b>

                            {entry.installment && (
                              <small>
                                Parcela{" "}
                                {
                                  entry.installment
                                }
                              </small>
                            )}
                          </td>

                          <td>
                            <span className="table-category">
                              <span className="category-emoji">
                                {getCategoryIcon(
                                  entry.category
                                )}
                              </span>

                              {
                                entry.category
                              }
                            </span>
                          </td>

                          <td>
                            {entry.sourceType ===
                            "card" ? (
                              <CardSourceBadge
                                entry={
                                  entry
                                }
                                cards={
                                  cards
                                }
                              />
                            ) : (
                              entry.account
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className={`status status-button ${
                                normalizedStatus(
                                  entry
                                ) ===
                                "Pago"
                                  ? "confirmado"
                                  : "previsto"
                              }`}
                              onClick={() =>
                                toggleEntryStatus(
                                  entry
                                )
                              }
                            >
                              {normalizedStatus(
                                entry
                              )}
                            </button>
                          </td>

                          <td className="red">
                            −{" "}
                            {fmt(
                              entry.value
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}



  <footer className="app-footer">
  <span>
    HAS Financial
  </span>

  <span>
    Desenvolvido por{" "}
    <a
      href="https://hasanalytics.com.br"
      target="_blank"
      rel="noreferrer"
    >
      Haward Antunny · HAS Analytics
    </a>
  </span>

  <a href="mailto:antunnyamerico@gmail.com">
    Suporte
  </a>
</footer>
      </main>

      {/* ===================================================
          IMPORTAÇÃO
          =================================================== */}

      {importOpen && section === "Lançamentos" && <StatementImport accounts={investmentAccounts} entries={entries} onClose={() => setImportOpen(false)} onImport={async rows => { const updated = [...rows, ...entries]; await saveFinanceNamespace("ledger", updated); setEntries(updated); }} />}

      {/* ===================================================
          GUARDAR SALDO
          =================================================== */}

      {investOpen && (
       <div className="modal-bg">
    {investmentAccounts.length === 0 ? (
      <div className="modal small investment-modal">
        <ModalHead
          title="Guardar saldo"
          sub="Você ainda não possui uma conta cadastrada."
          close={() => setInvestOpen(false)}
          icon={<PiggyBank />}
        />

        <div className="empty-cards">
          <Landmark />

          <b>
            Crie uma conta primeiro
          </b>

          <span>
            Para guardar dinheiro, você precisa ter pelo menos uma conta cadastrada.
          </span>

          <button
            type="button"
            className="primary"
            onClick={() => {
              setInvestOpen(false);
              setSection("Contas");
            }}
          >
            <Plus />
            Criar conta
          </button>
        </div>
      </div>
    ) : (
          <form
            className="modal small investment-modal"
            onSubmit={
              submitInvestment
            }
          >
            <ModalHead
              title="Guardar saldo"
              sub={`Disponível previsto em ${monthLabel(
                month
              )}: ${
                projectedBalance <
                0
                  ? "− "
                  : ""
              }${fmt(
                projectedBalance
              )}`}
              close={() =>
                setInvestOpen(
                  false
                )
              }
              icon={
                <PiggyBank />
              }
            />

            <div className="form-grid">
              <label className="wide">
                Valor para guardar

                <input
                  name="investmentValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    projectedBalance
                  }
                  defaultValue={projectedBalance.toFixed(
                    2
                  )}
                  required
                />
              </label>

              <label className="wide">
                Conta de destino

                <select
                  name="investmentAccount"
                  required
                >
                  <option value="">
                    Selecione
                  </option>

                  {investmentAccounts.map(
                    (
                      account
                    ) => (
                      <option
                        key={
                          account.id
                        }
                        value={
                          account.id
                        }
                      >
                        {
                          account.name
                        }{" "}
                        ·{" "}
                        {
                          account.bank
                        }{" "}
                        ·{" "}
                        {fmt(
                          account.balance
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="modal-foot investment-modal-foot">
              <button
                type="button"
                onClick={() =>
                  setInvestOpen(
                    false
                  )
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                type="submit"
              >
                <PiggyBank />

                Guardar dinheiro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}





/* =========================================================
   KPI E COMPONENTES AUXILIARES
   ========================================================= */

function Kpi({
  title,
  value,
  sub,
  foot,
  kind,
  progress = 0,
}: {
  title: string;
  value: string;
  sub: string;
  foot: string;
  kind: string;
  progress?: number;
}) {
  const safeProgress =
    Math.max(
      0,
      Math.min(
        100,
        progress
      )
    );

  return (
    <article className="kpi-card">
      <div className="kpi-title">
        <span>
          {title}
        </span>

        {title ===
        "Receitas" ? (
          <ArrowDownLeft />
        ) : title ===
          "Despesas" ? (
          <ArrowUpRight />
        ) : title ===
          "Cartões" ? (
          <WalletCards />
        ) : (
          <PiggyBank />
        )}
      </div>

      <h3>
        {value}
      </h3>

      <small>
        {sub}
      </small>

      <div
        className={`bar ${kind}`}
        title={`${Math.round(
          safeProgress
        )}% em relação ao maior valor do período`}
      >
        <i
          style={{
            width:
              `${safeProgress}%`,
          }}
        />
      </div>

      <p>
        <b>
          {foot}
        </b>
      </p>
    </article>
  );
}

/* =========================================================
   CABEÇALHO DE PAINEL
   ========================================================= */

function PanelHead({
  title,
  sub,
  onDetails,
}: {
  title: string;
  sub: string;
  onDetails?: () => void;
}) {
  return (
    <div className="panel-head">
      <div>
        <h3>
          {title}
        </h3>

        <p>
          {sub}
        </p>
      </div>

      {onDetails && (
        <button
          type="button"
          onClick={
            onDetails
          }
        >
          Ver detalhes
        </button>
      )}
    </div>
  );
}

/* =========================================================
   CABEÇALHO DE MODAL
   ========================================================= */

/* =========================================================
   IDENTIFICAÇÃO COLORIDA DO CARTÃO
   ========================================================= */

function CardSourceBadge({
  entry,
  cards,
}: {
  entry: Ledger;
  cards: FinanceCard[];
}) {
  const card =
    entry.sourceId != null
      ? cards.find(
          (
            item
          ) =>
            item.id ===
            entry.sourceId
        )
      : undefined;

  if (!card) {
    return (
      <span>
        {entry.account}
      </span>
    );
  }

  return (
    <span
      className="ledger-card-source"
      style={{
        background:
          `linear-gradient(135deg, ${card.color}, ${card.color2})`,
      }}
    >
      <CreditCard
        size={13}
      />

      {card.bank}

      <small>
        • {card.last4}
      </small>
    </span>
  );
}

/* =========================================================
   LANÇAMENTOS
   ========================================================= */

function TransactionsWorkspace({
  importReady,
  accounts,
  setAccounts,
  onImport,
  selectedMonth,
  entries,
  setEntries,
}: {
  accounts: FinanceAccount[];
  importReady: boolean;
  setAccounts: React.Dispatch<React.SetStateAction<FinanceAccount[]>>;
  onImport: () => void;
  selectedMonth: string;
  entries: Ledger[];
  setEntries: React.Dispatch<
    React.SetStateAction<Ledger[]>
  >;
}) {
  const [cards] =
    usePersistedFinance<
      FinanceCard[]
    >(
      "cards",
      initialCards
    );

  const [
    categories,
    setCategories,
  ] =
    usePersistedFinance<
      string[][]
    >(
      "categories",
      categorySeed
    );

  const [
    entryType,
    setEntryType,
  ] =
    useState<
      "Receita" | "Despesa"
    >("Despesa");

  const [
    frequency,
    setFrequency,
  ] =
    useState<
      | "Único"
      | "Mensal"
      | "Mensal até dezembro"
      | "Parcelado"
    >("Único");

  const [
    view,
    setView,
  ] =
    useState<
      | "Todos"
      | "Receitas"
      | "Despesas"
    >("Todos");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState(false);

  const [
    editingEntry,
    setEditingEntry,
  ] =
    useState<
      Ledger | null
    >(null);

  const [
    catOpen,
    setCatOpen,
  ] =
    useState(false);

  const [
    newCat,
    setNewCat,
  ] =
    useState("");

  /* =======================================================
     FILTROS
     ======================================================= */

  const [
    filterCategory,
    setFilterCategory,
  ] =
    useState("Todas");

  const [
    filterSource,
    setFilterSource,
  ] =
    useState("Todos");

  const [
    filterStatus,
    setFilterStatus,
  ] =
    useState("Todos");

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(false);

  const monthEntries =
    entries.filter(
      (entry) =>
        dateBelongsToMonth(
          entry.date,
          selectedMonth
        )
    );

  const availableCategories =
    Array.from(
      new Set(
        monthEntries.map(
          (entry) =>
            entry.category
        )
      )
    ).sort();

  const availableSources =
    Array.from(
      new Set(
        monthEntries
          .map(
            (entry) =>
              entry.account
          )
          .filter(Boolean)
      )
    ).sort();

  const shown =
    monthEntries.filter(
      (entry) => {
        const matchesView =
          view ===
            "Todos" ||
          (
            view ===
              "Receitas" &&
            entry.type ===
              "Receita"
          ) ||
          (
            view ===
              "Despesas" &&
            entry.type ===
              "Despesa"
          );

        const matchesSearch =
          (
            entry.name +
            " " +
            entry.category +
            " " +
            entry.account
          )
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchesCategory =
          filterCategory ===
            "Todas" ||
          entry.category ===
            filterCategory;

        const matchesSource =
          filterSource ===
            "Todos" ||
          entry.account ===
            filterSource;

        const matchesStatus =
          filterStatus ===
            "Todos" ||
          normalizedStatus(
            entry
          ) ===
            filterStatus;

        return (
          matchesView &&
          matchesSearch &&
          matchesCategory &&
          matchesSource &&
          matchesStatus
        );
      }
    );

  /* =======================================================
     RESUMOS
     ======================================================= */

  const revenues =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Receita"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const expenses =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Despesa"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const investments =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
          "Investimento"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const toReceive =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Receita" &&
          normalizedStatus(
            entry
          ) ===
            "A receber"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const received =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Receita" &&
          normalizedStatus(
            entry
          ) ===
            "Recebido"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const toPay =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Despesa" &&
          normalizedStatus(
            entry
          ) ===
            "A pagar"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const paid =
    monthEntries
      .filter(
        (entry) =>
          entry.type ===
            "Despesa" &&
          normalizedStatus(
            entry
          ) ===
            "Pago"
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  const futureInstallments =
    entries
      .filter(
        (entry) =>
          entry.frequency ===
            "Parcelado" &&
          entry.date >
            `${selectedMonth}-31`
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          entry.value,
        0
      );

  function getCategoryIcon(
    categoryName: string
  ) {
    const category =
      categories.find(
        (item) =>
          item[0] ===
          categoryName
      );

    return (
      category?.[1] ||
      "✨"
    );
  }

  /* =======================================================
     LIMPAR FILTROS
     ======================================================= */

  function clearFilters() {
    setFilterCategory(
      "Todas"
    );

    setFilterSource(
      "Todos"
    );

    setFilterStatus(
      "Todos"
    );

    setSearch("");
  }

  const hasFilters =
    filterCategory !==
      "Todas" ||
    filterSource !==
      "Todos" ||
    filterStatus !==
      "Todos" ||
    search.trim() !== "";

  /* =======================================================
     ALTERAR STATUS
     ======================================================= */

  async function toggleStatus(
    entry: Ledger
  ) {
    const current =
      normalizedStatus(
        entry
      );

    let next:
      LedgerStatus;

    if (
      entry.type ===
      "Receita"
    ) {
      next =
        current ===
        "Recebido"
          ? "A receber"
          : "Recebido";
    } else if (
      entry.type ===
      "Despesa"
    ) {
      next =
        current ===
        "Pago"
          ? "A pagar"
          : "Pago";
    } else {
      return;
    }

    const updatedEntries =
      entries.map(
        (item) =>
          item.id ===
          entry.id
            ? {
                ...item,
                status:
                  next,
              }
            : item
      );

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Não foi possível alterar o status."
      );
    }
  }

  /* =======================================================
     NOVO LANÇAMENTO
     ======================================================= */

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const fd =
      new FormData(
        event.currentTarget
      );

    const type =
      String(
        fd.get("type")
      ) as
        | "Receita"
        | "Despesa";

    const selectedFrequency =
      String(
        fd.get(
          "frequency"
        )
      ) as Ledger["frequency"];

    const total =
      Math.max(
        1,
        Number(
          fd.get(
            "parts"
          )
        ) || 1
      );

    const value =
      Math.abs(
        Number(
          fd.get(
            "value"
          )
        ) || 0
      );

    const destination =
      String(
        fd.get(
          "account"
        ) || ""
      );

    const baseDate =
      String(
        fd.get(
          "date"
        )
      );

    const seriesId =
      Date.now();

    let accountLabel =
      type === "Receita"
        ? "Receita"
        : "Dinheiro";

    let sourceType:
      | "account"
      | "card"
      | "cash" =
      "cash";

    let sourceId:
      | number
      | undefined;

    /* =====================================================
       IDENTIFICA A CONTA
       ===================================================== */

    if (
      type === "Despesa" &&
      destination.startsWith(
        "account:"
      )
    ) {
      const accountId =
        Number(
          destination.replace(
            "account:",
            ""
          )
        );

      const selectedAccount =
        accounts.find(
          (account) =>
            account.id ===
            accountId
        );

      if (
        !selectedAccount
      ) {
        alert(
          "Conta não encontrada."
        );

        return;
      }

      sourceType =
        "account";

      sourceId =
        accountId;

      accountLabel =
        `${selectedAccount.name} · ${selectedAccount.bank}`;
    }

    /* =====================================================
       IDENTIFICA O CARTÃO
       ===================================================== */

    if (
      type === "Despesa" &&
      destination.startsWith(
        "card:"
      )
    ) {
      const cardId =
        Number(
          destination.replace(
            "card:",
            ""
          )
        );

      const selectedCard =
        cards.find(
          (card) =>
            card.id ===
            cardId
        );

      if (
        !selectedCard
      ) {
        alert(
          "Cartão não encontrado."
        );

        return;
      }

      sourceType =
        "card";

      sourceId =
        cardId;

      accountLabel =
        `${selectedCard.bank} • ${selectedCard.last4}`;
    }

    let newEntries:
      Ledger[] = [];

    /* =====================================================
       RECEITA MENSAL ATÉ DEZEMBRO
       ===================================================== */

    if (
      type ===
        "Receita" &&
      selectedFrequency ===
        "Mensal até dezembro"
    ) {
      const month =
        Number(
          baseDate.split(
            "-"
          )[1]
        );

      const monthsRemaining =
        12 -
        month +
        1;

      newEntries =
        Array.from(
          {
            length:
              monthsRemaining,
          },
          (
            _,
            index
          ) => ({
            id:
              seriesId +
              index,

            seriesId,

            type:
              "Receita",

            name:
              String(
                fd.get(
                  "name"
                )
              ),

            category:
              String(
                fd.get(
                  "category"
                )
              ),

            icon:
              getCategoryIcon(
                String(
                  fd.get(
                    "category"
                  )
                )
              ),

            date:
              addMonthsToDateKey(
                baseDate,
                index
              ),

            value,

            account:
              "Receita",

            frequency:
              "Mensal até dezembro",

            status:
              "A receber",

            sourceType:
              "cash",
          })
        );
    }

    /* =====================================================
       DESPESA PARCELADA
       ===================================================== */

    else if (
      type ===
        "Despesa" &&
      selectedFrequency ===
        "Parcelado"
    ) {
      newEntries =
        Array.from(
          {
            length:
              total,
          },
          (
            _,
            index
          ) => ({
            id:
              seriesId +
              index,

            seriesId,

            type:
              "Despesa",

            name:
              String(
                fd.get(
                  "name"
                )
              ),

            category:
              String(
                fd.get(
                  "category"
                )
              ),

            icon:
              getCategoryIcon(
                String(
                  fd.get(
                    "category"
                  )
                )
              ),

            date:
              addMonthsToDateKey(
                baseDate,
                index
              ),

            value,

            account:
              accountLabel,

            frequency:
              "Parcelado",

            installment:
              `${index + 1}/${total}`,

            remaining:
              total -
              index -
              1,

            status:
              "A pagar",

            sourceType,

            sourceId,
          })
        );
    }

    /* =====================================================
       DESPESA MENSAL ATÉ DEZEMBRO
       ===================================================== */

    else if (
      type ===
        "Despesa" &&
      selectedFrequency ===
        "Mensal"
    ) {
      const month =
        Number(
          baseDate.split(
            "-"
          )[1]
        );

      const monthsRemaining =
        12 -
        month +
        1;

      newEntries =
        Array.from(
          {
            length:
              monthsRemaining,
          },
          (
            _,
            index
          ) => ({
            id:
              seriesId +
              index,

            seriesId,

            type:
              "Despesa",

            name:
              String(
                fd.get(
                  "name"
                )
              ),

            category:
              String(
                fd.get(
                  "category"
                )
              ),

            icon:
              getCategoryIcon(
                String(
                  fd.get(
                    "category"
                  )
                )
              ),

            date:
              addMonthsToDateKey(
                baseDate,
                index
              ),

            value,

            account:
              accountLabel,

            frequency:
              "Mensal",

            status:
              "A pagar",

            sourceType,

            sourceId,
          })
        );
    }

    /* =====================================================
       ÚNICO
       ===================================================== */

    else {
      newEntries = [
        {
          id:
            seriesId,

          type,

          name:
            String(
              fd.get(
                "name"
              )
            ),

          category:
            String(
              fd.get(
                "category"
              )
            ),

          icon:
            getCategoryIcon(
              String(
                fd.get(
                  "category"
                )
              )
            ),

          date:
            baseDate,

          value,

          account:
            accountLabel,

          frequency:
            "Único",

          /*
            Todo novo lançamento começa
            como pendente.
          */
          status:
            type ===
            "Receita"
              ? "A receber"
              : "A pagar",

          sourceType:
            type ===
            "Receita"
              ? "cash"
              : sourceType,

          sourceId:
            type ===
            "Receita"
              ? undefined
              : sourceId,
        },
      ];
    }

    const updatedEntries =
      [
        ...newEntries,
        ...entries,
      ];

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );

      setForm(
        false
      );

      setEntryType(
        "Despesa"
      );

      setFrequency(
        "Único"
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Erro ao salvar o lançamento."
      );
    }
  }










    /* =========================================================
     EXCLUIR E EDITAR LANÇAMENTO
     ========================================================= */

  async function deleteEntry(
    entry: Ledger
  ) {
    if (
      !window.confirm(
        `Excluir "${entry.name}"?`
      )
    ) {
      return;
    }

    /*
      Se for uma despesa já paga
      e vinculada a uma conta,
      devolve o valor ao saldo.
    */
    if (
      entry.type ===
        "Despesa" &&
      normalizedStatus(
        entry
      ) === "Pago" &&
      entry.sourceType ===
        "account" &&
      entry.sourceId != null
    ) {
      const updatedAccounts =
        accounts.map(
          (
            account
          ) =>
            account.id ===
            entry.sourceId
              ? {
                  ...account,

                  balance:
                    account.balance +
                    entry.value,
                }
              : account
        );

      try {
        await saveFinanceNamespace(
          "accounts",
          updatedAccounts
        );

        setAccounts(
          updatedAccounts
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          "Erro ao devolver o valor para a conta."
        );

        return;
      }
    }

    /*
      Ao excluir investimento,
      retira o valor da conta
      que recebeu a reserva.
    */
    if (
      entry.type ===
        "Investimento" &&
      entry.sourceType ===
        "account" &&
      entry.sourceId != null
    ) {
      const updatedAccounts =
        accounts.map(
          (
            account
          ) =>
            account.id ===
            entry.sourceId
              ? {
                  ...account,

                  balance:
                    account.balance -
                    entry.value,
                }
              : account
        );

      try {
        await saveFinanceNamespace(
          "accounts",
          updatedAccounts
        );

        setAccounts(
          updatedAccounts
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          "Erro ao reverter a reserva."
        );

        return;
      }
    }

    const updatedEntries =
      entries.filter(
        (
          item
        ) =>
          item.id !==
          entry.id
      );

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Erro ao excluir o lançamento."
      );
    }
  }

  async function updateEntry(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editingEntry
    ) {
      return;
    }

    const fd =
      new FormData(
        event.currentTarget
      );

    const updatedEntry:
      Ledger = {
      ...editingEntry,

      name:
        String(
          fd.get(
            "name"
          )
        ),

      value:
        Math.abs(
          Number(
            fd.get(
              "value"
            )
          ) || 0
        ),

      date:
        String(
          fd.get(
            "date"
          )
        ),

      category:
        String(
          fd.get(
            "category"
          )
        ),

      icon:
        getCategoryIcon(
          String(
            fd.get(
              "category"
            )
          )
        ),

      status:
        String(
          fd.get(
            "status"
          )
        ) as LedgerStatus,
    };

    const updatedEntries =
      entries.map(
        (
          entry
        ) =>
          entry.id ===
          editingEntry.id
            ? updatedEntry
            : entry
      );

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );

      setEditingEntry(
        null
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Erro ao atualizar o lançamento."
      );
    }
  }

  /* =========================================================
     STATUS + MOVIMENTAÇÃO DE SALDO
     ========================================================= */

  async function handleStatusClick(
    entry: Ledger
  ) {
    if (
      entry.type ===
      "Investimento"
    ) {
      return;
    }

    const current =
      normalizedStatus(
        entry
      );

    let next:
      LedgerStatus;

    if (
      entry.type ===
      "Receita"
    ) {
      next =
        current ===
        "Recebido"
          ? "A receber"
          : "Recebido";
    } else {
      next =
        current ===
        "Pago"
          ? "A pagar"
          : "Pago";
    }

    /*
      Ajusta saldo da conta somente
      para despesas vinculadas a conta.
    */
    if (
      entry.type ===
        "Despesa" &&
      entry.sourceType ===
        "account" &&
      entry.sourceId != null
    ) {
      const becomingPaid =
        next === "Pago";

      const updatedAccounts =
        accounts.map(
          (
            account
          ) =>
            account.id ===
            entry.sourceId
              ? {
                  ...account,

                  balance:
                    becomingPaid
                      ? account.balance -
                        entry.value
                      : account.balance +
                        entry.value,
                }
              : account
        );

      try {
        await saveFinanceNamespace(
          "accounts",
          updatedAccounts
        );

        setAccounts(
          updatedAccounts
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          "Erro ao atualizar o saldo da conta."
        );

        return;
      }
    }

    const updatedEntries =
      entries.map(
        (
          item
        ) =>
          item.id ===
          entry.id
            ? {
                ...item,
                status:
                  next,
              }
            : item
      );

    try {
      await saveFinanceNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(
        updatedEntries
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Não foi possível alterar o status."
      );
    }
  }

  return (
    <div className="ledger-page">
      <section className="ledger-heading">
        <div>
          <span>
            CONTROLE FINANCEIRO
          </span>

          <h2>
            Receitas e despesas
            {" · "}
            {monthLabel(
              selectedMonth
            )}
          </h2>

          <p>
            Cadastre receitas,
            despesas, recorrências
            e compras parceladas.
          </p>
        </div>

        <div className="ledger-heading-actions">
          <button className="primary" type="button" disabled={!importReady} onClick={onImport}><Upload />Importar extrato</button>
          <button
            className="category-btn"
            onClick={() =>
              setCatOpen(
                (
                  value
                ) =>
                  !value
              )
            }
          >
            <Settings />

            Categorias
          </button>

          <button
            className="primary ledger-add"
            onClick={() => {
              setEntryType(
                "Despesa"
              );

              setFrequency(
                "Único"
              );

              setForm(
                true
              );
            }}
          >
            <Plus />

            Novo lançamento
          </button>
        </div>
      </section>

      {/* ===================================================
          RESUMO
          =================================================== */}

      <section className="ledger-summary">
        <article>
          <span>
            A receber
          </span>

          <b className="ledger-green">
            +{" "}
            {fmt(
              toReceive
            )}
          </b>

          <small>
            Recebido:{" "}
            {fmt(
              received
            )}
          </small>
        </article>

        <article>
          <span>
            A pagar
          </span>

          <b className="ledger-red">
            −{" "}
            {fmt(
              toPay
            )}
          </b>

          <small>
            Pago:{" "}
            {fmt(
              paid
            )}
          </small>
        </article>

        <article>
          <span>
            Saldo previsto
          </span>

          <b>
            {revenues -
              expenses -
              investments <
            0
              ? "− "
              : ""}

            {fmt(
              revenues -
                expenses -
                investments
            )}
          </b>

          <small>
            Considerando todo o mês
          </small>
        </article>

        <article>
          <span>
            Parcelas futuras
          </span>

          <b>
            {fmt(
              futureInstallments
            )}
          </b>

          <small>
            Valores programados
          </small>
        </article>
      </section>

      {/* ===================================================
          CATEGORIAS
          =================================================== */}

      {catOpen && (
        <section className="category-manager">
          <div>
            <h3>
              Categorias personalizadas
            </h3>

            <p>
              Organize receitas e
              despesas do seu jeito.
            </p>
          </div>

          <div className="category-chips">
            {categories.map(
              (
                category,
                index
              ) => (
                <span
                  key={`${category[0]}-${index}`}
                >
                  {category[1]}{" "}
                  {category[0]}

                  <small>
                    {
                      category[2]
                    }
                  </small>

                  <button
                    type="button"
                    onClick={() =>
                      setCategories(
                        (
                          list
                        ) =>
                          list.filter(
                            (
                              _,
                              current
                            ) =>
                              current !==
                              index
                          )
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              )
            )}
          </div>

          <form
            onSubmit={(
              event
            ) => {
              event.preventDefault();

              if (
                !newCat.trim()
              ) {
                return;
              }

              setCategories(
                (
                  list
                ) => [
                  ...list,
                  [
                    newCat,
                    "✨",
                    "Despesa",
                  ],
                ]
              );

              setNewCat("");
            }}
          >
            <input
              value={
                newCat
              }
              onChange={(
                event
              ) =>
                setNewCat(
                  event
                    .target
                    .value
                )
              }
              placeholder="Nova categoria"
            />

            <button>
              <Plus />

              Criar categoria
            </button>
          </form>
        </section>
      )}

      {/* ===================================================
          TABELA E FILTROS
          =================================================== */}

      <section className="panel ledger-panel">
        <div className="ledger-toolbar ledger-toolbar-new">
          <div className="ledger-tabs">
            {[
              "Todos",
              "Receitas",
              "Despesas",
            ].map(
              (
                tab
              ) => (
                <button
                  key={
                    tab
                  }
                  className={
                    view ===
                    tab
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView(
                      tab as
                        | "Todos"
                        | "Receitas"
                        | "Despesas"
                    )
                  }
                >
                  {tab}

                  <span>
                    {tab ===
                    "Todos"
                      ? monthEntries.length
                      : tab ===
                        "Receitas"
                      ? monthEntries.filter(
                          (
                            entry
                          ) =>
                            entry.type ===
                            "Receita"
                        ).length
                      : monthEntries.filter(
                          (
                            entry
                          ) =>
                            entry.type ===
                            "Despesa"
                        ).length}
                  </span>
                </button>
              )
            )}
          </div>

          <div className="ledger-toolbar-actions">
            <label className="ledger-search">
              <Search />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Buscar"
              />
            </label>

            <button
              type="button"
              className={
                hasFilters
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFiltersOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
            >
              <Filter />

              Filtros
            </button>

            {hasFilters && (
              <button
                type="button"
                className="clear-filter-button"
                onClick={
                  clearFilters
                }
              >
                <X />
                Limpar
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div className="ledger-filters">
            <label>
              Categoria

              <select
                value={
                  filterCategory
                }
                onChange={(
                  event
                ) =>
                  setFilterCategory(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="Todas">
                  Todas
                </option>

                {availableCategories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {
                        getCategoryIcon(
                          category
                        )
                      }{" "}
                      {
                        category
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Conta / cartão

              <select
                value={
                  filterSource
                }
                onChange={(
                  event
                ) =>
                  setFilterSource(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="Todos">
                  Todos
                </option>

                {availableSources.map(
                  (
                    source
                  ) => (
                    <option
                      key={
                        source
                      }
                      value={
                        source
                      }
                    >
                      {
                        source
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Status

              <select
                value={
                  filterStatus
                }
                onChange={(
                  event
                ) =>
                  setFilterStatus(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="Todos">
                  Todos
                </option>

                <option value="A receber">
                  A receber
                </option>

                <option value="Recebido">
                  Recebido
                </option>

                <option value="A pagar">
                  A pagar
                </option>

                <option value="Pago">
                  Pago
                </option>
              </select>
            </label>
          </div>
        )}

        <div className="ledger-list">
          <div className="ledger-row ledger-labels ledger-row-new">
            <span>
              Data
            </span>

            <span>
              Lançamento
            </span>

            <span>
              Categoria
            </span>

            <span>
              Conta / cartão
            </span>

            <span>
              Repetição
            </span>

            <span>
              Status
            </span>

            <span>
              Valor
            </span>

            <span>
              Ações
            </span>
          </div>

          {shown.map(
            (
              entry
            ) => (
              <article
                className="ledger-row ledger-row-new"
                key={
                  entry.id
                }
              >
                <span>
                  {formatDate(
                    entry.date
                  )}
                </span>

                <div>
                  <i>
                    {
                      entry.icon
                    }
                  </i>

                  <p>
                    <b>
                      {
                        entry.name
                      }
                    </b>

                    {entry.installment && (
                      <small>
                        Parcela{" "}
                        {
                          entry.installment
                        }
                      </small>
                    )}
                  </p>
                </div>

                <span className="ledger-category">
                  <span className="ledger-category-icon">
                    {getCategoryIcon(
                      entry.category
                    )}
                  </span>

                  {
                    entry.category
                  }
                </span>

                <span>
                  {entry.sourceType ===
                  "card" ? (
                    <CardSourceBadge
                      entry={
                        entry
                      }
                      cards={
                        cards
                      }
                    />
                  ) : (
                    entry.account
                  )}
                </span>

                <div>
                  <b className="frequency">
                    {
                      entry.frequency
                    }
                  </b>

                  {entry.installment && (
                    <small>
                      Parcela{" "}
                      {
                        entry.installment
                      }
                      {" · "}
                      faltam{" "}
                      {
                        entry.remaining
                      }
                    </small>
                  )}
                </div>

                <button
                  type="button"
                  className={`ledger-status-button ${
                    normalizedStatus(
                      entry
                    ) ===
                      "Pago" ||
                    normalizedStatus(
                      entry
                    ) ===
                      "Recebido"
                      ? "done"
                      : "pending"
                  }`}
                  onClick={() =>
                    handleStatusClick(
                      entry
                    )
                  }
                  disabled={
                    entry.type ===
                    "Investimento"
                  }
                >
                  {normalizedStatus(
                    entry
                  )}
                </button>

                <strong
                  className={
                    entry.type ===
                    "Receita"
                      ? "ledger-green"
                      : "ledger-red"
                  }
                >
                  {entry.type ===
                  "Receita"
                    ? "+"
                    : "−"}{" "}

                  {fmt(
                    entry.value
                  )}
                </strong>

                <div className="ledger-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingEntry(
                        entry
                      )
                    }
                    title="Editar lançamento"
                  >
                    <Pencil
                      size={
                        17
                      }
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteEntry(
                        entry
                      )
                    }
                    title="Excluir lançamento"
                  >
                    <Trash2
                      size={
                        18
                      }
                    />
                  </button>
                </div>
              </article>
            )
          )}

          {!shown.length && (
            <div className="ledger-empty">
              <Search />

              <b>
                Nenhum lançamento encontrado
              </b>

              <span>
                Ajuste os filtros ou
                cadastre um novo lançamento.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          NOVO LANÇAMENTO
          =================================================== */}

      {form && (
        <div className="modal-bg">
          <form
            className="modal ledger-modal"
            onSubmit={
              submit
            }
          >
            <ModalHead
              title="Novo lançamento"
              sub={`Novo lançamento em ${monthLabel(
                selectedMonth
              )}.`}
              close={() =>
                setForm(
                  false
                )
              }
              icon={
                <Plus />
              }
            />

            <div className="ledger-form">
              <div className="entry-type-selector">
                <button
                  type="button"
                  className={
                    entryType ===
                    "Despesa"
                      ? "active expense"
                      : ""
                  }
                  onClick={() => {
                    setEntryType(
                      "Despesa"
                    );

                    setFrequency(
                      "Único"
                    );
                  }}
                >
                  <ArrowUpRight />

                  Despesa
                </button>

                <button
                  type="button"
                  className={
                    entryType ===
                    "Receita"
                      ? "active income"
                      : ""
                  }
                  onClick={() => {
                    setEntryType(
                      "Receita"
                    );

                    setFrequency(
                      "Único"
                    );
                  }}
                >
                  <ArrowDownLeft />

                  Receita
                </button>
              </div>

              <input
                type="hidden"
                name="type"
                value={
                  entryType
                }
              />

              <label>
                Descrição

                <input
                  name="name"
                  required
                  placeholder={
                    entryType ===
                    "Despesa"
                      ? "Ex.: Mercado, aluguel ou combustível"
                      : "Ex.: Salário, bolsa ou renda extra"
                  }
                />
              </label>

              <label>
                Valor

                <input
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                />
              </label>

              <label>
                Data

                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={defaultDateForMonth(
                    selectedMonth
                  )}
                />
              </label>

              <label>
                Categoria

                <select
                  name="category"
                  required
                >
                  <option value="">
                    Selecione
                  </option>

                  {categories
                    .filter(
                      (
                        category
                      ) =>
                        category[2] ===
                        entryType
                    )
                    .map(
                      (
                        category,
                        index
                      ) => (
                        <option
                          key={`${category[0]}-${index}`}
                          value={
                            category[0]
                          }
                        >
                          {
                            category[1]
                          }{" "}
                          {
                            category[0]
                          }
                        </option>
                      )
                    )}
                </select>
              </label>

              {entryType ===
              "Receita" ? (
                <>
                  <label>
                    Repetição

                    <select
                      name="frequency"
                      value={
                        frequency
                      }
                      onChange={(
                        event
                      ) =>
                        setFrequency(
                          event
                            .target
                            .value as
                            | "Único"
                            | "Mensal até dezembro"
                        )
                      }
                    >
                      <option>
                        Único
                      </option>

                      <option>
                        Mensal até dezembro
                      </option>
                    </select>
                  </label>

                  <div className="income-info">
                    <Sparkles />

                    <span>
                      Toda receita nova
                      será criada inicialmente
                      como <b>A receber</b>.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    Conta ou cartão

                    <select
                      name="account"
                      required
                    >
                      <option value="">
                        Selecione
                      </option>

                      {accounts.map(
                        (
                          account
                        ) => (
                          <option
                            key={`account-${account.id}`}
                            value={`account:${account.id}`}
                          >
                            {
                              account.name
                            }
                            {" · "}
                            {
                              account.bank
                            }
                            {" · "}
                            {fmt(
                              account.balance
                            )}
                          </option>
                        )
                      )}

                      {cards.map(
                        (
                          card
                        ) => (
                          <option
                            key={`card-${card.id}`}
                            value={`card:${card.id}`}
                          >
                            {
                              card.bank
                            }
                            {" • "}
                            {
                              card.last4
                            }
                          </option>
                        )
                      )}

                      <option value="cash">
                        Dinheiro
                      </option>
                    </select>
                  </label>

                  <label>
                    Repetição

                    <select
                      name="frequency"
                      value={
                        frequency
                      }
                      onChange={(
                        event
                      ) =>
                        setFrequency(
                          event
                            .target
                            .value as
                            | "Único"
                            | "Mensal"
                            | "Parcelado"
                        )
                      }
                    >
                      <option>
                        Único
                      </option>

                      <option>
                        Mensal
                      </option>

                      <option>
                        Parcelado
                      </option>
                    </select>
                  </label>

                  {frequency ===
                    "Parcelado" && (
                    <label>
                      Número de parcelas

                      <input
                        name="parts"
                        type="number"
                        min="2"
                        required
                        placeholder="Ex.: 3"
                      />
                    </label>
                  )}

                  <div className="income-info expense-info">
                    <Sparkles />

                    <span>
                      Toda despesa nova
                      será criada inicialmente
                      como <b>A pagar</b>.
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="modal-foot">
              <button
                type="button"
                onClick={() =>
                  setForm(
                    false
                  )
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                type="submit"
              >
                <Check />

                Salvar lançamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================
          EDITAR
          =================================================== */}

      {editingEntry && (
        <div className="modal-bg">
          <form
            className="modal small"
            onSubmit={
              updateEntry
            }
          >
            <ModalHead
              title="Editar lançamento"
              sub="A alteração será aplicada somente a este lançamento."
              close={() =>
                setEditingEntry(
                  null
                )
              }
              icon={
                <Pencil />
              }
            />

            <div className="form-grid">
              <label className="wide">
                Descrição

                <input
                  name="name"
                  defaultValue={
                    editingEntry.name
                  }
                  required
                />
              </label>

              <label>
                Valor

                <input
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    editingEntry.value
                  }
                  required
                />
              </label>

              <label>
                Data

                <input
                  name="date"
                  type="date"
                  defaultValue={
                    editingEntry.date
                  }
                  required
                />
              </label>

              <label>
                Categoria

                <select
                  name="category"
                  defaultValue={
                    editingEntry.category
                  }
                  required
                >
                  {categories
                    .filter(
                      (
                        category
                      ) =>
                        category[2] ===
                        editingEntry.type
                    )
                    .map(
                      (
                        category,
                        index
                      ) => (
                        <option
                          key={`${category[0]}-edit-${index}`}
                          value={
                            category[0]
                          }
                        >
                          {
                            category[1]
                          }{" "}
                          {
                            category[0]
                          }
                        </option>
                      )
                    )}
                </select>
              </label>

              {editingEntry.type !==
                "Investimento" && (
                <label>
                  Status

                  <select
                    name="status"
                    defaultValue={normalizedStatus(
                      editingEntry
                    )}
                  >
                    {editingEntry.type ===
                    "Receita" ? (
                      <>
                        <option value="A receber">
                          A receber
                        </option>

                        <option value="Recebido">
                          Recebido
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="A pagar">
                          A pagar
                        </option>

                        <option value="Pago">
                          Pago
                        </option>
                      </>
                    )}
                  </select>
                </label>
              )}

              {editingEntry.type ===
                "Investimento" && (
                <input
                  type="hidden"
                  name="status"
                  value={
                    editingEntry.status
                  }
                />
              )}
            </div>

            <div className="modal-foot">
              <button
                type="button"
                onClick={() =>
                  setEditingEntry(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                type="submit"
              >
                <Check />

                Salvar alteração
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}








/* =========================================================
   PLANEJAMENTO
   ========================================================= */

/* =========================================================
   CARTÕES
   ========================================================= */

function BankCatalog({
  entries,
}: {
  entries: Ledger[];
}) {
  const [
    cards,
    setCards,
  ] =
    usePersistedFinance<
      FinanceCard[]
    >(
      "cards",
      initialCards
    );

  const [
    q,
    setQ,
  ] =
    useState("");

  const [
    editing,
    setEditing,
  ] =
    useState<
      FinanceCard | null
    >(null);

  const banks =
    bankCatalog.filter(
      (
        bank
      ) =>
        bank[0]
          .toLowerCase()
          .includes(
            q.toLowerCase()
          )
    );

  function openCard(
    bank?: (typeof bankCatalog)[number]
  ) {
    setEditing({
      id:
        Date.now(),

      bank:
        bank?.[0] || "",

      color:
        bank?.[1] ||
        "#078c94",

      color2:
        bank?.[2] ||
        "#04363c",

      logo:
        bank?.[3] ||
        "CARD",

      last4:
        "",

      closing:
        1,

      due:
        10,

        limit: 0,
    });
  }

  function getCardLimitInfo(
  card: FinanceCard
) {
  const totalLimit =
    Number(card.limit || 0);

  const usedLimit =
    entries
      .filter(
        (entry) =>
          entry.type === "Despesa" &&
          entry.sourceType === "card" &&
          entry.sourceId === card.id &&
          normalizedStatus(entry) ===
            "A pagar"
      )
      .reduce(
        (total, entry) =>
          total + entry.value,
        0
      );

  const availableLimit =
    Math.max(
      0,
      totalLimit - usedLimit
    );

  return {
    totalLimit,
    usedLimit,
    availableLimit,
  };
}

  function saveCard(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !editing
    ) {
      return;
    }

    const fd =
      new FormData(
        event.currentTarget
      );

    const next:
      FinanceCard = {
      id:
        editing.id,

      bank:
        String(
          fd.get(
            "bank"
          )
        ).trim(),

      logo:
        String(
          fd.get(
            "logo"
          )
        ).trim() ||
        "CARD",

      last4:
        String(
          fd.get(
            "last4"
          )
        )
          .replace(
            /\D/g,
            ""
          )
          .slice(-4)
          .padStart(
            4,
            "0"
          ),

      closing:
        Number(
          fd.get(
            "closing"
          )
        ),

      due:
        Number(
          fd.get(
            "due"
          )
        ),

        limit:
  Math.max(
    0,
    Number(
      fd.get("limit")
    ) || 0
  ),

      color:
        String(
          fd.get(
            "color"
          )
        ),

      color2:
        String(
          fd.get(
            "color2"
          )
        ),
    };

    setCards(
      (
        list
      ) =>
        list.some(
          (
            card
          ) =>
            card.id ===
            next.id
        )
          ? list.map(
              (
                card
              ) =>
                card.id ===
                next.id
                  ? next
                  : card
            )
          : [
              ...list,
              next,
            ]
    );

    setEditing(
      null
    );
  }

  return (
    <div className="bank-page">
      <div className="bank-title">
        <div>
          <span className="bank-kicker">
            CARTEIRA DE CARTÕES
          </span>

          <h2>
            Meus cartões
            e bancos
          </h2>

          <p>
            Cadastre seus
            cartões e configure
            fechamento e
            vencimento.
          </p>
        </div>

        <div className="bank-title-actions">
          <label>
            <Search />

            <input
              value={
                q
              }
              onChange={(
                event
              ) =>
                setQ(
                  event
                    .target
                    .value
                )
              }
              placeholder="Buscar instituição"
            />
          </label>

          <button
            className="primary"
            type="button"
            onClick={() =>
              openCard()
            }
          >
            <Plus />

            Adicionar cartão
          </button>
        </div>
      </div>

      <div className="selected-banks">
        <div className="selected-heading">
          <h3>
            Seus cartões
          </h3>

          <small>
            {
              cards.length
            }{" "}

            {cards.length ===
            1
              ? "cartão cadastrado"
              : "cartões cadastrados"}
          </small>
        </div>

        {cards.length ? (
          <div>
            {cards.map(
  (card) => {
    const {
      totalLimit,
      usedLimit,
      availableLimit,
    } =
      getCardLimitInfo(card);

    return (
      <article
                  className="credit-visual"
                  key={
                    card.id
                  }
                  style={{
                    background:
                      `linear-gradient(135deg, ${card.color}, ${card.color2})`,
                  }}
                >
                  <div className="card-shine" />

                  <div className="card-top">
                    <span>
                      {
                        card.logo
                      }
                    </span>

                    <CreditCard />
                  </div>

                  <b>
                    ••••&nbsp;{" "}
                    {
                      card.last4
                    }
                  </b>

                  <small>
  Fechamento dia {card.closing}
  {" · "}
  Vencimento dia {card.due}
</small>

<div className="card-limit-info">
  <span>
    Disponível
    <b>
      {fmt(availableLimit)}
    </b>
  </span>

  <span>
    Utilizado
    <b>
      {fmt(usedLimit)}
    </b>
  </span>

  <span>
    Limite
    <b>
      {fmt(totalLimit)}
    </b>
  </span>
</div>
                  <button
                    type="button"
                    className="edit-card"
                    onClick={() =>
                      setEditing(
                        card
                      )
                    }
                  >
                    <Pencil />

                    Editar
                  </button>

                  <strong>
                    {
                      card.bank
                    }
                  </strong>
                </article>
    );
  }
)}
          </div>
        ) : (
          <div className="empty-cards">
            <CreditCard />

            <b>
              Nenhum cartão
              cadastrado
            </b>

            <span>
              Adicione seu
              primeiro cartão.
            </span>

            <button
              className="primary"
              type="button"
              onClick={() =>
                openCard()
              }
            >
              <Plus />

              Adicionar cartão
            </button>
          </div>
        )}
      </div>

      <h3>
        Catálogo de instituições
      </h3>

      <div className="bank-grid">
        {banks.map(
          (
            bank
          ) => {
            const added =
              cards.some(
                (
                  card
                ) =>
                  card.bank ===
                  bank[0]
              );

            return (
              <button
                type="button"
                key={
                  bank[0]
                }
                className={
                  added
                    ? "bank-option chosen"
                    : "bank-option"
                }
                onClick={() =>
                  added
                    ? setEditing(
                        cards.find(
                          (
                            card
                          ) =>
                            card.bank ===
                            bank[0]
                        )!
                      )
                    : openCard(
                        bank
                      )
                }
              >
                <span
                  className="bank-logo"
                  style={{
                    background:
                      `linear-gradient(135deg, ${bank[1]}, ${bank[2]})`,

                    color:
                      bank[0] ===
                      "Banco do Brasil"
                        ? "#173863"
                        : "white",
                  }}
                >
                  {
                    bank[3]
                  }
                </span>

                <b>
                  {
                    bank[0]
                  }
                </b>

                <small>
                  {added
                    ? "Editar cartão"
                    : "Adicionar cartão"}
                </small>

                {added && (
                  <Check />
                )}
              </button>
            );
          }
        )}

        <button
          type="button"
          className="bank-option custom-bank"
          onClick={() =>
            openCard()
          }
        >
          <span className="bank-logo">
            <Plus />
          </span>

          <b>
            Outra instituição
          </b>

          <small>
            Cadastrar manualmente
          </small>
        </button>
      </div>

      {editing && (
        <div className="modal-bg">
          <form
            className="modal card-modal"
            onSubmit={
              saveCard
            }
          >
            <ModalHead
              title={
                cards.some(
                  (
                    card
                  ) =>
                    card.id ===
                    editing.id
                )
                  ? "Editar cartão"
                  : "Adicionar cartão"
              }
              sub="Configure as informações do cartão."
              close={() =>
                setEditing(
                  null
                )
              }
              icon={
                <CreditCard />
              }
            />

            <div
              className="card-preview"
              style={{
                background:
                  `linear-gradient(135deg, ${editing.color}, ${editing.color2})`,
              }}
            >
              <span>
                {
                  editing.logo ||
                  "CARD"
                }
              </span>

              <b>
                ••••&nbsp;{" "}
                {
                  editing.last4 ||
                  "0000"
                }
              </b>

              <small>
                Fechamento dia{" "}
                {
                  editing.closing
                }
                {" · "}
                Vencimento dia{" "}
                {
                  editing.due
                }
              </small>
            </div>

            <div className="card-form">
              <label>
                Instituição

                <input
                  name="bank"
                  required
                  value={
                    editing.bank
                  }
                  onChange={(
                    event
                  ) => {
                    const match =
                      bankCatalog.find(
                        (
                          bank
                        ) =>
                          bank[0].toLowerCase() ===
                          event.target.value.toLowerCase()
                      );

                    setEditing({
                      ...editing,

                      bank:
                        event
                          .target
                          .value,

                      ...(match
                        ? {
                            logo:
                              match[3],

                            color:
                              match[1],

                            color2:
                              match[2],
                          }
                        : {}),
                    });
                  }}
                />
              </label>

              <label>
                Nome curto / logo

                <input
                  name="logo"
                  value={
                    editing.logo
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      logo:
                        event
                          .target
                          .value,
                    })
                  }
                  maxLength={
                    12
                  }
                />
              </label>

              <label>
                Final do cartão

                <input
                  name="last4"
                  inputMode="numeric"
                  required
                  value={
                    editing.last4
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      last4:
                        event
                          .target
                          .value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            4
                          ),
                    })
                  }
                  maxLength={
                    4
                  }
                />
              </label>

              <label>
                Fechamento

                <input
                  name="closing"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={
                    editing.closing
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      closing:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                />
              </label>

              <label>
                Vencimento

                <input
                  name="due"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={
                    editing.due
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      due:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                />
              </label>

              <label>
  Limite do cartão

  <input
    name="limit"
    type="number"
    min="0"
    step="0.01"
    required
    value={editing.limit ?? 0}
    onChange={(event) =>
      setEditing({
        ...editing,
        limit:
          Number(
            event.target.value
          ) || 0,
      })
    }
  />
</label>

              <label className="color-field">
                Cor principal

                <input
                  name="color"
                  type="color"
                  value={
                    editing.color
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      color:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </label>

              <label className="color-field">
                Cor de apoio

                <input
                  name="color2"
                  type="color"
                  value={
                    editing.color2
                  }
                  onChange={(
                    event
                  ) =>
                    setEditing({
                      ...editing,

                      color2:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </label>
            </div>

            <div className="modal-foot card-modal-foot">
              {cards.some(
                (
                  card
                ) =>
                  card.id ===
                  editing.id
              ) && (
                <button
                  className="delete-card"
                  type="button"
                  onClick={() => {
                    setCards(
                      (
                        list
                      ) =>
                        list.filter(
                          (
                            card
                          ) =>
                            card.id !==
                            editing.id
                        )
                    );

                    setEditing(
                      null
                    );
                  }}
                >
                  <Trash2 />

                  Excluir
                </button>
              )}

              <span />

              <button
                type="button"
                onClick={() =>
                  setEditing(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                type="submit"
              >
                <Check />

                Salvar cartão
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
