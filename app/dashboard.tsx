"use client";

import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CreditCard,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LogOut,
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
  ).padStart(2, "0")}-${String(now.getDate()).padStart(
    2,
    "0"
  )}`;
}

function changeMonth(current: string, amount: number) {
  const [year, month] = current.split("-").map(Number);

  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function defaultDateForMonth(month: string) {
  if (month === currentMonthKey()) {
    return currentDateKey();
  }

  return `${month}-01`;
}

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  })
    .format(new Date(year, month - 1, day))
    .replace(".", "");
}

function dateBelongsToMonth(
  date: string,
  selectedMonth: string
) {
  return date.startsWith(selectedMonth);
}

function convertImportedDate(
  value: string,
  selectedMonth: string
) {
  const parts = value.split(/[/-]/).map(Number);

  const day = parts[0];
  const month = parts[1];

  let year = parts[2];

  if (!year) {
    year = Number(selectedMonth.split("-")[0]);
  }

  if (year < 100) {
    year += 2000;
  }

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

/* =========================================================
   TIPOS
   ========================================================= */

type Ledger = {
  id: number;
  type: "Receita" | "Despesa";
  name: string;
  category: string;
  icon: string;
  date: string;
  value: number;
  account: string;
  frequency: "Único" | "Mensal" | "Parcelado";
  installment?: string;
  remaining?: number;
  status: "Confirmado" | "Previsto";
  sourceType?: "account" | "card" | "cash";
  sourceId?: number;
};

type FinanceCard = {
  id: number;
  bank: string;
  logo: string;
  last4: string;
  closing: number;
  due: number;
  color: string;
  color2: string;
};

type FinanceAccount = {
  id: number;
  name: string;
  bank: string;
  type:
    | "Corrente"
    | "Poupança"
    | "Dinheiro"
    | "Investimento";
  balance: number;
};

type PlanItem = {
  id: number;
  name: string;
  category: string;
  icon: string;
  date: string;
  value: number;
  kind: "Fixo" | "Fatura" | "Parcela";
  detail?: string;
  active: boolean;
};

/* =========================================================
   VALORES INICIAIS
   ========================================================= */

const ledgerSeed: Ledger[] = [];

const initialCards: FinanceCard[] = [];

const initialAccounts: FinanceAccount[] = [];

const initialPlan: PlanItem[] = [];

const initialBudgets: {
  name: string;
  icon: string;
  value: number;
  color: string;
}[] = [];

const categorySeed = [
  ["Salários", "💼", "Receita"],
  ["Bolsas", "🎓", "Receita"],
  ["Renda extra", "📊", "Receita"],
  ["Moradia", "🏠", "Despesa"],
  ["Mercado", "🛒", "Despesa"],
  ["Compras", "🛍️", "Despesa"],
  ["Casa", "🛋️", "Despesa"],
  ["Assinaturas", "🎵", "Despesa"],
  ["Transporte", "🚗", "Despesa"],
];

const bankCatalog = [
  ["Nubank", "#820ad1", "#4c0677", "NU"],
  ["Inter", "#ff7a00", "#c94d00", "inter"],
  ["Itaú", "#ec7000", "#073f87", "itaú"],
  ["Banco do Brasil", "#f9dc16", "#173863", "BB"],
  ["Caixa", "#087bb8", "#005ca9", "CAIXA"],
  ["Bradesco", "#cc092f", "#8e0623", "bradesco"],
  ["Santander", "#ec0000", "#9e0000", "S"],
  ["C6 Bank", "#242424", "#050505", "C6"],
  ["BTG Pactual", "#18365f", "#071a34", "BTG"],
  ["XP", "#171717", "#000000", "XP"],
  ["Sicredi", "#68a82f", "#39751e", "sicredi"],
  ["Sicoob", "#006b5b", "#003b37", "sicoob"],
  ["PicPay", "#21c25e", "#087f42", "PicPay"],
  [
    "Mercado Pago",
    "#16aee8",
    "#0876b9",
    "mercado pago",
  ],
  ["PagBank", "#42b549", "#187c31", "PagBank"],
  ["Neon", "#00b8e6", "#006ed0", "neon"],
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
  const [section, setSection] =
    useState("Visão geral");

  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* Sempre inicia no mês atual */
  const [month, setMonth] =
    useState(currentMonthKey);

  /*
    Fonte única dos lançamentos.
    A Visão geral e Lançamentos usam o mesmo namespace.
  */
  const [entries, setEntries, saveState] =
    usePersistedFinance<Ledger[]>(
      "ledger",
      ledgerSeed
    );

  const [importOpen, setImportOpen] =
    useState(false);

  const [paste, setPaste] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  const nav = [
    ["Visão geral", LayoutDashboard],
    ["Planejamento", CalendarDays],
    ["Lançamentos", ArrowUpRight],
    ["Cartões", CreditCard],
    ["Contas", Landmark],
    ["Metas e reservas", Target],
    ["Relatório anual", PiggyBank],
    ["Acessos", KeyRound],
  ] as const;

  /* Lançamentos somente do mês selecionado */
  const monthEntries = useMemo(
    () =>
      entries.filter((entry) =>
        dateBelongsToMonth(entry.date, month)
      ),
    [entries, month]
  );

  const income = monthEntries
    .filter((entry) => entry.type === "Receita")
    .reduce((total, entry) => total + entry.value, 0);

  const spent = monthEntries
    .filter((entry) => entry.type === "Despesa")
    .reduce((total, entry) => total + entry.value, 0);

  const projectedBalance = income - spent;

  const filtered = monthEntries.filter(
    (entry) =>
      entry.type === "Despesa" &&
      (
        entry.name +
        entry.category +
        entry.account
      )
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const cats = useMemo(() => {
    const totals = monthEntries
      .filter((entry) => entry.type === "Despesa")
      .reduce(
        (acc, entry) => {
          acc[entry.category] =
            (acc[entry.category] || 0) +
            entry.value;

          return acc;
        },
        {} as Record<string, number>
      );

    return Object.entries(totals).sort(
      (a, b) => b[1] - a[1]
    );
  }, [monthEntries]);

  function doImport() {
    const lines = paste
      .split(/\n/)
      .filter(Boolean);

    const added: Ledger[] = [];

    lines.forEach((line, index) => {
      const match = line.match(
        /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?).*?([+-]?\s?R?\$?\s?[\d.]+,\d{2})/
      );

      if (!match) return;

      const raw = match[2]
        .replace(/[^\d,\-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      const value = Number(raw);

      const description =
        line
          .slice(
            match.index! +
              match[0].indexOf(match[1]) +
              match[1].length,
            line.lastIndexOf(match[2])
          )
          .replace(/[;|]/g, " ")
          .trim() || "Lançamento importado";

      const low = description.toLowerCase();

      const map = low.includes("merc")
        ? ["Mercado", "🛒"]
        : low.includes("posto") ||
          low.includes("uber")
        ? ["Transporte", "🚗"]
        : low.includes("sal")
        ? ["Salários", "💼"]
        : low.includes("ifood")
        ? ["Delivery", "🛵"]
        : ["A confirmar", "✨"];

      added.push({
        id: Date.now() + index,
        type:
          value >= 0
            ? "Receita"
            : "Despesa",
        name: description,
        category: map[0],
        icon: map[1],
        date: convertImportedDate(
          match[1],
          month
        ),
        value: Math.abs(value),
        account: "Extrato importado",
        frequency: "Único",
        status:
          map[0] === "A confirmar"
            ? "Previsto"
            : "Confirmado",
        sourceType: "cash",
      });
    });

    if (!added.length) {
      setNotice(
        "Não identifiquei linhas com data e valor."
      );

      return;
    }

    const unique = added.filter(
      (newEntry) =>
        !entries.some(
          (entry) =>
            entry.name === newEntry.name &&
            entry.value === newEntry.value &&
            entry.date === newEntry.date
        )
    );

    setEntries((current) => [
      ...unique,
      ...current,
    ]);

    setNotice(
      `${unique.length} lançamentos novos; ${
        added.length - unique.length
      } duplicados ignorados.`
    );

    setPaste("");
  }

  return (
    <div
      className={
        collapsed
          ? "app-shell sidebar-collapsed"
          : "app-shell"
      }
    >
      <aside
        className={
          mobile ? "sidebar open" : "sidebar"
        }
      >
        <button
          className="collapse-sidebar"
          onClick={() =>
            setCollapsed((value) => !value)
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
            className="brandmark has-logo"
            src="/has-financial-logo.png"
            alt="HAS Financial"
          />

          <div>
            <strong>HAS Financial</strong>
            <small>
              Inteligência financeira
            </small>
          </div>

          <button
            className="close-mobile"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>

        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={
                section === name
                  ? "nav active"
                  : "nav"
              }
              onClick={() => {
                if (name === "Acessos") {
                  location.href =
                    "/admin/requests";
                  return;
                }

                setSection(name);
                setMobile(false);
              }}
            >
              <Icon />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <button className="nav">
            <Settings />
            <span>Preferências</span>
          </button>

          <div className="profile">
            <div>
              {userEmail
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <span>
              <b>
                {userEmail.split("@")[0]}
              </b>

              <small>Conta pessoal</small>
            </span>

            <ChevronDown />
          </div>
        </div>
      </aside>

      {mobile && (
        <button
          className="backdrop"
          onClick={() => setMobile(false)}
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
              MINHA VIDA FINANCEIRA ·{" "}
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
            {/* Navegação mensal ilimitada */}

            <div className="month-navigation">
              <button
                type="button"
                onClick={() =>
                  setMonth((current) =>
                    changeMonth(current, -1)
                  )
                }
                title="Mês anterior"
              >
                ‹
              </button>

              <label
                className="month-current"
                title="Selecionar mês e ano"
              >
                <CalendarDays />

                <input
                  type="month"
                  value={month}
                  onChange={(event) =>
                    setMonth(event.target.value)
                  }
                  aria-label="Selecionar mês"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  setMonth((current) =>
                    changeMonth(current, 1)
                  )
                }
                title="Próximo mês"
              >
                ›
              </button>
            </div>

            <button
              className="iconbtn"
              title="Voltar para o mês atual"
              onClick={() =>
                setMonth(currentMonthKey())
              }
            >
              <CalendarDays />
            </button>

            <button
              className="iconbtn"
              title={userEmail}
            >
              <Bell />
            </button>

            <button
              className="primary"
              onClick={() =>
                setImportOpen(true)
              }
            >
              <Upload />
              Importar extrato
            </button>

            <button
              className="add"
              onClick={() =>
                setSection("Lançamentos")
              }
              title="Novo lançamento"
            >
              <Plus />
            </button>

            <button
              className="iconbtn"
              onClick={onLogout}
              title="Sair"
            >
              <LogOut />
            </button>
          </div>
        </header>

        {section === "Cartões" ? (
          <BankCatalog />
        ) : section === "Contas" ? (
          <AccountsWorkspace />
        ) : section === "Planejamento" ? (
          <Planning />
        ) : section === "Lançamentos" ? (
          <TransactionsWorkspace
            selectedMonth={month}
            entries={entries}
            setEntries={setEntries}
          />
        ) : section !== "Visão geral" ? (
          <div className="section-placeholder">
            <div className="placeholder-icon">
              <Sparkles />
            </div>

            <h2>{section}</h2>

            <p>
              Esta área faz parte do seu
              controle financeiro e será
              vinculada aos dados da sua conta.
            </p>
          </div>
        ) : (
          <div className="content">
            <section className="forecast">
              <div>
                <span className="eyebrow">
                  SALDO PROJETADO ·{" "}
                  {monthLabel(month)}
                </span>

                <h2>
                  {projectedBalance < 0
                    ? "− "
                    : ""}
                  {fmt(projectedBalance)}
                </h2>

                <p>
                  {monthEntries.length
                    ? "Calculado com base nos lançamentos deste mês."
                    : "Nenhum lançamento registrado neste mês."}
                </p>
              </div>

              <div className="forecast-right">
                <div>
                  <span>
                    Saldo projetado
                  </span>

                  <b>
                    {projectedBalance < 0
                      ? "− "
                      : ""}
                    {fmt(
                      projectedBalance
                    )}
                  </b>
                </div>

                <div className="line" />

                <div>
                  <span>A receber</span>

                  <b className="green">
                    + {fmt(income)}
                  </b>
                </div>

                <div>
                  <span>A pagar</span>

                  <b className="red">
                    − {fmt(spent)}
                  </b>
                </div>
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
                  Use o seletor superior para
                  consultar qualquer mês.
                </span>
              </div>

              <button
                onClick={() =>
                  setSection("Lançamentos")
                }
              >
                Ver lançamentos
              </button>
            </div>

            <section className="kpis">
              <Kpi
                title="Receitas"
                value={fmt(income)}
                sub={monthLabel(month)}
                foot={`${monthEntries.filter(
                  (entry) =>
                    entry.type === "Receita"
                ).length} lançamentos`}
                kind="green"
              />

              <Kpi
                title="Despesas"
                value={fmt(spent)}
                sub={monthLabel(month)}
                foot={`${monthEntries.filter(
                  (entry) =>
                    entry.type === "Despesa"
                ).length} lançamentos`}
                kind="coral"
              />

              <Kpi
                title="Cartões"
                value="R$ 0,00"
                sub="Faturas do período"
                foot="Integração em desenvolvimento"
                kind="cards"
              />

              <Kpi
                title="Reservas"
                value="R$ 0,00"
                sub="Metas e reservas"
                foot="Configure suas metas"
                kind="gold"
              />
            </section>

            <div className="grid-main">
              <section className="panel cash">
                <PanelHead
                  title="Fluxo do mês"
                  sub={monthLabel(month)}
                  onDetails={() =>
                    setSection(
                      "Lançamentos"
                    )
                  }
                />

                <div className="legend">
                  <span>
                    <i className="lg-in" />
                    Entradas
                  </span>

                  <span>
                    <i className="lg-out" />
                    Saídas
                  </span>

                  <span>
                    <i className="lg-proj" />
                    Saldo projetado
                  </span>
                </div>

                <div className="chart">
                  <div className="axis">
                    <span>12 mil</span>
                    <span>8 mil</span>
                    <span>4 mil</span>
                    <span>0</span>
                  </div>

                  <div className="plot">
                    {[0, 0, 0, 0, 0, 0].map(
                      (height, index) => (
                        <div
                          className="bars"
                          key={index}
                        >
                          <i
                            className="in"
                            style={{
                              height: `${height}%`,
                            }}
                          />

                          <i
                            className="out"
                            style={{
                              height: `${height}%`,
                            }}
                          />

                          <span>
                            {
                              [
                                "01",
                                "06",
                                "12",
                                "18",
                                "24",
                                "30",
                              ][index]
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </section>

              <section className="panel categories">
                <PanelHead
                  title="Para onde foi o dinheiro"
                  sub={monthLabel(month)}
                />

                <div className="donut-wrap">
                  <div className="donut">
                    <div>
                      <b>{fmt(spent)}</b>
                      <span>
                        total gasto
                      </span>
                    </div>
                  </div>

                  <div className="cat-list">
                    {cats
                      .slice(0, 5)
                      .map(
                        (
                          [category, value],
                          index
                        ) => (
                          <div
                            key={category}
                          >
                            <span>
                              <i
                                className={`c${index}`}
                              />
                              ✨ {category}
                            </span>

                            <b>
                              {fmt(value)}
                            </b>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </section>
            </div>

            <section className="panel transactions">
              <div className="panel-head">
                <div>
                  <h3>
                    Despesas de{" "}
                    {monthLabel(month)}
                  </h3>

                  <p>
                    Despesas registradas no
                    período selecionado
                  </p>
                </div>

                <div className="table-actions">
                  <label>
                    <Search />

                    <input
                      placeholder="Buscar"
                      value={query}
                      onChange={(event) =>
                        setQuery(
                          event.target.value
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
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>
                        Conta / cartão
                      </th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map(
                      (entry) => (
                        <tr key={entry.id}>
                          <td>
                            {formatDate(
                              entry.date
                            )}
                          </td>

                          <td>
                            <span className="tx-icon">
                              {entry.icon}
                            </span>

                            <b>
                              {entry.name}
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
                            {entry.category}
                          </td>

                          <td>
                            {entry.account}
                          </td>

                          <td>
                            <span
                              className={`status ${
                                entry.status ===
                                "Confirmado"
                                  ? "confirmado"
                                  : "previsto"
                              }`}
                            >
                              {
                                entry.status
                              }
                            </span>
                          </td>

                          <td
                            className={
                              entry.type ===
                              "Receita"
                                ? "green"
                                : "red"
                            }
                          >
                            {entry.type ===
                            "Receita"
                              ? "+ "
                              : "− "}

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
      </main>

      {importOpen && (
        <div className="modal-bg">
          <div className="modal">
            <ModalHead
              title="Importar extrato"
              sub="Cole as movimentações copiadas do seu banco."
              close={() => {
                setImportOpen(false);
                setNotice("");
              }}
              icon={<Upload />}
            />

            <label className="paste-label">
              EXTRATO BANCÁRIO

              <textarea
                value={paste}
                onChange={(event) =>
                  setPaste(
                    event.target.value
                  )
                }
                placeholder={
                  "03/09 Supermercado -387,42\n05/09 Salário +5.498,70"
                }
              />
            </label>

            {notice && (
              <p className="notice">
                {notice}
              </p>
            )}

            <div className="modal-foot">
              <button
                onClick={() =>
                  setImportOpen(false)
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                onClick={doImport}
              >
                Analisar lançamentos
                <ArrowUpRight />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   KPI
   ========================================================= */

function Kpi({
  title,
  value,
  sub,
  foot,
  kind,
}: {
  title: string;
  value: string;
  sub: string;
  foot: string;
  kind: string;
}) {
  return (
    <article>
      <div className="kpi-title">
        <span>{title}</span>

        {title === "Receitas" ? (
          <ArrowDownLeft />
        ) : title === "Despesas" ? (
          <ArrowUpRight />
        ) : title === "Cartões" ? (
          <WalletCards />
        ) : (
          <PiggyBank />
        )}
      </div>

      <h3>{value}</h3>
      <small>{sub}</small>

      {kind === "cards" ? (
        <div className="card-dots">
          <i />
          <i />
          <i />
        </div>
      ) : (
        <div className={`bar ${kind}`}>
          <i style={{ width: "0%" }} />
        </div>
      )}

      <p>
        <b>{foot}</b>
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
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>

      {onDetails && (
        <button onClick={onDetails}>
          Ver detalhes
        </button>
      )}
    </div>
  );
}

/* =========================================================
   CABEÇALHO DE MODAL
   ========================================================= */

function ModalHead({
  title,
  sub,
  close,
  icon,
}: {
  title: string;
  sub: string;
  close: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="modal-head">
      <div>
        <span className="modal-icon">
          {icon}
        </span>

        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>

      <button
        onClick={close}
        type="button"
      >
        <X />
      </button>
    </div>
  );
}

/* =========================================================
   LANÇAMENTOS
   ========================================================= */

function TransactionsWorkspace({
  selectedMonth,
  entries,
  setEntries,
}: {
  selectedMonth: string;
  entries: Ledger[];
  setEntries: React.Dispatch<
    React.SetStateAction<Ledger[]>
  >;
}) {
  const [accounts, setAccounts] =
    usePersistedFinance<FinanceAccount[]>(
      "accounts",
      initialAccounts
    );

  const [cards] =
    usePersistedFinance<FinanceCard[]>(
      "cards",
      initialCards
    );

  const [view, setView] = useState<
    "Todos" | "Receitas" | "Despesas"
  >("Todos");

  const [search, setSearch] = useState("");
  const [form, setForm] = useState(false);

  const [categories, setCategories] =
    usePersistedFinance<string[][]>(
      "categories",
      categorySeed
    );

  const [catOpen, setCatOpen] =
    useState(false);

  const [newCat, setNewCat] =
    useState("");

  const monthEntries = entries.filter(
    (entry) =>
      dateBelongsToMonth(
        entry.date,
        selectedMonth
      )
  );

  const shown = monthEntries.filter(
    (entry) =>
      (view === "Todos" ||
        entry.type ===
          (view === "Receitas"
            ? "Receita"
            : "Despesa")) &&
      (
        entry.name +
        entry.category +
        entry.account
      )
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const revenues = monthEntries
    .filter(
      (entry) => entry.type === "Receita"
    )
    .reduce(
      (total, entry) =>
        total + entry.value,
      0
    );

  const expenses = monthEntries
    .filter(
      (entry) => entry.type === "Despesa"
    )
    .reduce(
      (total, entry) =>
        total + entry.value,
      0
    );

  const monthlyIncome = monthEntries
    .filter(
      (entry) =>
        entry.type === "Receita" &&
        entry.frequency === "Mensal"
    )
    .reduce(
      (total, entry) =>
        total + entry.value,
      0
    );

  const futureInstallments = entries
  .filter(
    (entry) =>
      entry.frequency === "Parcelado" &&
      entry.date > `${selectedMonth}-31`
  )
  .reduce(
    (total, entry) =>
      total + entry.value,
    0
  );

  
  async function saveNamespace(
    namespace: string,
    payload: unknown
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const { error } = await supabase
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

  async function submit(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const fd = new FormData(
    event.currentTarget
  );

  const type = String(
    fd.get("type")
  ) as "Receita" | "Despesa";

  const frequency = String(
    fd.get("frequency")
  ) as Ledger["frequency"];

  const total = Math.max(
    1,
    Number(fd.get("parts")) || 1
  );

  const value = Math.abs(
    Number(fd.get("value")) || 0
  );

  const destination = String(
    fd.get("account")
  );

  const baseDate = String(
    fd.get("date")
  );

  let accountLabel = "Dinheiro";

  let sourceType:
    | "account"
    | "card"
    | "cash" = "cash";

  let sourceId:
    | number
    | undefined;

  /* =====================================================
     CONTA
     ===================================================== */

  if (
    destination.startsWith(
      "account:"
    )
  ) {
    const accountId = Number(
      destination.replace(
        "account:",
        ""
      )
    );

    const selectedAccount =
      accounts.find(
        (account) =>
          account.id === accountId
      );

    if (!selectedAccount) {
      alert("Conta não encontrada.");
      return;
    }

    sourceType = "account";
    sourceId = accountId;

    accountLabel = `${selectedAccount.name} · ${selectedAccount.bank}`;

    /*
      Em compra parcelada, apenas a primeira parcela
      afeta imediatamente o saldo da conta.
    */

    const amountToApply =
      frequency === "Parcelado"
        ? value
        : value;

    const updatedAccounts =
      accounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              balance:
                type === "Receita"
                  ? account.balance +
                    amountToApply
                  : account.balance -
                    amountToApply,
            }
          : account
      );

    try {
      await saveNamespace(
        "accounts",
        updatedAccounts
      );

      setAccounts(updatedAccounts);
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao atualizar o saldo da conta."
      );

      return;
    }
  }

  /* =====================================================
     CARTÃO
     ===================================================== */

  if (
    destination.startsWith(
      "card:"
    )
  ) {
    const cardId = Number(
      destination.replace(
        "card:",
        ""
      )
    );

    const selectedCard =
      cards.find(
        (card) =>
          card.id === cardId
      );

    if (!selectedCard) {
      alert(
        "Cartão não encontrado."
      );

      return;
    }

    sourceType = "card";
    sourceId = cardId;

    accountLabel = `${selectedCard.bank} • ${selectedCard.last4}`;
  }

  /* =====================================================
     CRIA OS LANÇAMENTOS
     ===================================================== */

  let newEntries: Ledger[] = [];

  if (
    frequency === "Parcelado"
  ) {
    const [year, month, day] =
      baseDate
        .split("-")
        .map(Number);

    newEntries = Array.from(
      { length: total },
      (_, index) => {
        const parcelDate = new Date(
          year,
          month - 1 + index,
          day
        );

        const parcelDateKey =
          `${parcelDate.getFullYear()}-${String(
            parcelDate.getMonth() + 1
          ).padStart(2, "0")}-${String(
            parcelDate.getDate()
          ).padStart(2, "0")}`;

        return {
          id:
            Date.now() +
            index,

          type,

          name: String(
            fd.get("name")
          ),

          category: String(
            fd.get("category")
          ),

          icon:
            type === "Receita"
              ? "💰"
              : "✨",

          date: parcelDateKey,

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
            index === 0
              ? "Confirmado"
              : "Previsto",

          sourceType,
          sourceId,
        };
      }
    );
  } else {
    newEntries = [
      {
        id: Date.now(),

        type,

        name: String(
          fd.get("name")
        ),

        category: String(
          fd.get("category")
        ),

        icon:
          type === "Receita"
            ? "💰"
            : "✨",

        date: baseDate,

        value,

        account:
          accountLabel,

        frequency,

        status:
          "Confirmado",

        sourceType,
        sourceId,
      },
    ];
  }

  const updatedEntries = [
    ...newEntries,
    ...entries,
  ];

  try {
    await saveNamespace(
      "ledger",
      updatedEntries
    );

    setEntries(
      updatedEntries
    );

    setForm(false);
  } catch (error) {
    console.error(error);

    alert(
      "Erro ao salvar o lançamento."
    );
  }
}
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

    if (
      entry.sourceType ===
        "account" &&
      entry.sourceId
    ) {
      const updatedAccounts =
        accounts.map((account) =>
          account.id ===
          entry.sourceId
            ? {
                ...account,
                balance:
                  entry.type ===
                  "Despesa"
                    ? account.balance +
                      entry.value
                    : account.balance -
                      entry.value,
              }
            : account
        );

      try {
        await saveNamespace(
          "accounts",
          updatedAccounts
        );

        setAccounts(updatedAccounts);
      } catch (error) {
        console.error(error);

        alert(
          "Erro ao devolver o valor para a conta."
        );

        return;
      }
    }

    const updatedEntries =
      entries.filter(
        (item) =>
          item.id !== entry.id
      );

    try {
      await saveNamespace(
        "ledger",
        updatedEntries
      );

      setEntries(updatedEntries);
    } catch (error) {
      console.error(error);

      alert(
        "Erro ao excluir o lançamento."
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
            Receitas e despesas ·{" "}
            {monthLabel(
              selectedMonth
            )}
          </h2>

          <p>
            Cadastre receitas, despesas,
            recorrências e compras
            parceladas.
          </p>
        </div>

        <div>
          <button
            className="category-btn"
            onClick={() =>
              setCatOpen(
                (value) => !value
              )
            }
          >
            <Settings />
            Categorias
          </button>

          <button
            className="primary ledger-add"
            onClick={() =>
              setForm(true)
            }
          >
            <Plus />
            Novo lançamento
          </button>
        </div>
      </section>

      <section className="ledger-summary">
        <article>
          <span>Receitas</span>

          <b className="ledger-green">
            + {fmt(revenues)}
          </b>

          <small>
            {fmt(monthlyIncome)}{" "}
            recorrentes mensalmente
          </small>
        </article>

        <article>
          <span>Despesas</span>

          <b className="ledger-red">
            − {fmt(expenses)}
          </b>

          <small>
            {
              monthEntries.filter(
                (entry) =>
                  entry.type ===
                    "Despesa" &&
                  entry.frequency ===
                    "Mensal"
              ).length
            }{" "}
            compromissos recorrentes
          </small>
        </article>

        <article>
          <span>
            Saldo previsto
          </span>

          <b>
            {revenues - expenses <
            0
              ? "− "
              : ""}

            {fmt(
              revenues - expenses
            )}
          </b>

          <small>
            Considerando os
            lançamentos deste mês
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

      {catOpen && (
        <section className="category-manager">
          <div>
            <h3>
              Categorias
              personalizadas
            </h3>

            <p>
              Organize receitas e
              despesas do seu jeito.
            </p>
          </div>

          <div className="category-chips">
            {categories.map(
              (category, index) => (
                <span
                  key={`${category[0]}-${index}`}
                >
                  {category[1]}{" "}
                  {category[0]}

                  <small>
                    {category[2]}
                  </small>

                  <button
                    type="button"
                    onClick={() =>
                      setCategories(
                        (list) =>
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
            onSubmit={(event) => {
              event.preventDefault();

              if (
                newCat.trim()
              ) {
                setCategories(
                  (list) => [
                    ...list,
                    [
                      newCat,
                      "✨",
                      "Despesa",
                    ],
                  ]
                );

                setNewCat("");
              }
            }}
          >
            <input
              value={newCat}
              onChange={(event) =>
                setNewCat(
                  event.target.value
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

      <section className="panel ledger-panel">
        <div className="ledger-toolbar">
          <div className="ledger-tabs">
            {[
              "Todos",
              "Receitas",
              "Despesas",
            ].map((tab) => (
              <button
                key={tab}
                className={
                  view === tab
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
                  {tab === "Todos"
                    ? monthEntries.length
                    : tab ===
                      "Receitas"
                    ? monthEntries.filter(
                        (entry) =>
                          entry.type ===
                          "Receita"
                      ).length
                    : monthEntries.filter(
                        (entry) =>
                          entry.type ===
                          "Despesa"
                      ).length}
                </span>
              </button>
            ))}
          </div>

          <label>
            <Search />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar lançamento, categoria ou conta"
            />
          </label>
        </div>

        <div className="ledger-list">
          <div className="ledger-row ledger-labels">
            <span>Data</span>
            <span>Lançamento</span>
            <span>Categoria</span>
            <span>
              Conta ou cartão
            </span>
            <span>Repetição</span>
            <span>Valor</span>
            <span>Ações</span>
          </div>

          {shown.map((entry) => (
            <article
              className="ledger-row"
              key={entry.id}
            >
              <span>
                {formatDate(
                  entry.date
                )}
              </span>

              <div>
                <i>{entry.icon}</i>

                <p>
                  <b>{entry.name}</b>

                  <small>
                    {entry.status}
                  </small>
                </p>
              </div>

              <span className="ledger-category">
                {entry.category}
              </span>

              <span>
                {entry.account}
              </span>

              <div>
                <b className="frequency">
                  {entry.frequency}
                </b>

                {entry.installment && (
                  <small>
                    Parcela{" "}
                    {
                      entry.installment
                    }{" "}
                    · faltam{" "}
                    {
                      entry.remaining
                    }
                  </small>
                )}
              </div>

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
                {fmt(entry.value)}
              </strong>

              <button
                type="button"
                onClick={() =>
                  deleteEntry(entry)
                }
                title="Excluir lançamento"
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {form && (
        <div className="modal-bg">
          <form
            className="modal ledger-modal"
            onSubmit={submit}
          >
            <ModalHead
              title="Novo lançamento"
              sub={`Novo lançamento em ${monthLabel(
                selectedMonth
              )}.`}
              close={() =>
                setForm(false)
              }
              icon={<Plus />}
            />

            <div className="ledger-form">
              <label>
                Tipo

                <select name="type">
                  <option>
                    Despesa
                  </option>
                  <option>
                    Receita
                  </option>
                </select>
              </label>

              <label>
                Descrição

                <input
                  name="name"
                  required
                  placeholder="Ex.: Mercado, salário ou aluguel"
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

                <select name="category">
                  {categories.map(
                    (
                      category,
                      index
                    ) => (
                      <option
                        key={`${category[0]}-${index}`}
                      >
                        {
                          category[0]
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

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
                    (account) => (
                      <option
                        key={`account-${account.id}`}
                        value={`account:${account.id}`}
                      >
                        {
                          account.name
                        }{" "}
                        ·{" "}
                        {
                          account.bank
                        }{" "}
                        · Saldo{" "}
                        {fmt(
                          account.balance
                        )}
                      </option>
                    )
                  )}

                  {cards.map(
                    (card) => (
                      <option
                        key={`card-${card.id}`}
                        value={`card:${card.id}`}
                      >
                        {card.bank} •{" "}
                        {card.last4}
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

                <select name="frequency">
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

              <label>
                Número de parcelas

                <input
                  name="parts"
                  type="number"
                  min="1"
                  placeholder="Somente se parcelado"
                />
              </label>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                onClick={() =>
                  setForm(false)
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
    </div>
  );
}

/* =========================================================
   PLANEJAMENTO
   ========================================================= */

function Planning() {
  const [income, setIncome] =
    usePersistedFinance<number>(
      "planning-income",
      0
    );

  const [reserve, setReserve] =
    usePersistedFinance<number>(
      "planning-reserve",
      0
    );

  const [items, setItems] =
    usePersistedFinance<PlanItem[]>(
      "planning-items",
      initialPlan
    );

  const [budgets, setBudgets] =
    usePersistedFinance<
      typeof initialBudgets
    >(
      "planning-budgets",
      initialBudgets
    );

  const [editing, setEditing] =
    useState(false);

  const commitments = items
    .filter((item) => item.active)
    .reduce(
      (sum, item) =>
        sum + item.value,
      0
    );

  const flexible = budgets.reduce(
    (sum, item) =>
      sum + item.value,
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
            ((commitments +
              flexible +
              reserve) /
              income) *
              100
          )
        )
      : 0;

  const changeBudget = (
    index: number,
    value: number
  ) =>
    setBudgets((list) =>
      list.map((budget, current) =>
        current === index
          ? {
              ...budget,
              value: Math.max(
                0,
                value
              ),
            }
          : budget
      )
    );

  return (
    <div className="planning-page">
      <section className="planning-top">
        <div>
          <span className="planning-kicker">
            <CalendarDays />{" "}
            PLANEJAMENTO
          </span>

          <h2>
            Decida o mês antes que
            ele comece.
          </h2>

          <p>
            Organize compromissos,
            limites de gasto e
            reservas.
          </p>
        </div>

        <div className="planning-score">
          <span>PLANEJADO</span>

          <b>{plannedPct}%</b>

          <div>
            <i
              style={{
                width: `${plannedPct}%`,
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
              value={income}
              onChange={(event) =>
                setIncome(
                  Number(
                    event.target.value
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

          <b>{fmt(commitments)}</b>

          <small>
            {
              items.filter(
                (item) =>
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
              value={reserve}
              onChange={(event) =>
                setReserve(
                  Number(
                    event.target.value
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
            Saldo livre projetado
          </span>

          <b>
            {free < 0 ? "− " : ""}
            {fmt(free)}
          </b>

          <small>
            Depois de todo o plano
          </small>
        </article>
      </section>

      <div className="planning-grid">
        <section className="panel plan-commitments">
          <div className="panel-head">
            <div>
              <h3>
                Compromissos do mês
              </h3>

              <p>
                Adicione as despesas
                programadas
              </p>
            </div>

            <button
              onClick={() =>
                setEditing(
                  (value) => !value
                )
              }
            >
              {editing
                ? "Concluir"
                : "Editar plano"}
            </button>
          </div>

          <div className="commitment-list">
            {items.map((item) => (
              <article
                className={
                  item.active
                    ? ""
                    : "disabled"
                }
                key={item.id}
              >
                <button
                  className="plan-check"
                  onClick={() =>
                    setItems((list) =>
                      list.map(
                        (current) =>
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
                  {item.icon}
                </span>

                <div>
                  <b>{item.name}</b>

                  <small>
                    {item.date} ·{" "}
                    {item.kind}

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
                      value={item.value}
                      onChange={(
                        event
                      ) =>
                        setItems(
                          (list) =>
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
                    className="plan-remove"
                    onClick={() =>
                      setItems(
                        (list) =>
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
            ))}
          </div>

          <button
            className="add-commitment"
            onClick={() =>
              setItems((list) => [
                ...list,
                {
                  id: Date.now(),
                  name: "Novo compromisso",
                  category: "Outros",
                  icon: "✨",
                  date: "30",
                  value: 0,
                  kind: "Fixo",
                  active: true,
                },
              ])
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
                Limites para gastos
                variáveis
              </h3>

              <p>
                Defina quanto pretende
                gastar
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
                  key={budget.name}
                >
                  <div
                    className={`budget-icon ${budget.color}`}
                  >
                    {budget.icon}
                  </div>

                  <div>
                    <b>
                      {budget.name}
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
                            event.target
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
              Total reservado para
              variáveis
            </span>

            <b>{fmt(flexible)}</b>
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
                      (free /
                        income) *
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

/* =========================================================
   CARTÕES
   ========================================================= */

function BankCatalog() {
  const [cards, setCards] =
    usePersistedFinance<FinanceCard[]>(
      "cards",
      initialCards
    );

  const [q, setQ] = useState("");

  const [editing, setEditing] =
    useState<FinanceCard | null>(
      null
    );

  const banks = bankCatalog.filter(
    (bank) =>
      bank[0]
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  function openCard(
    bank?: (typeof bankCatalog)[number]
  ) {
    setEditing({
      id: Date.now(),
      bank: bank?.[0] || "",
      color:
        bank?.[1] || "#078c94",
      color2:
        bank?.[2] || "#04363c",
      logo: bank?.[3] || "CARD",
      last4: "",
      closing: 1,
      due: 10,
    });
  }

  function saveCard(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editing) return;

    const fd = new FormData(
      event.currentTarget
    );

    const next: FinanceCard = {
      id: editing.id,

      bank: String(
        fd.get("bank")
      ).trim(),

      logo:
        String(
          fd.get("logo")
        ).trim() || "CARD",

      last4: String(
        fd.get("last4")
      )
        .replace(/\D/g, "")
        .slice(-4)
        .padStart(4, "0"),

      closing: Number(
        fd.get("closing")
      ),

      due: Number(fd.get("due")),

      color: String(
        fd.get("color")
      ),

      color2: String(
        fd.get("color2")
      ),
    };

    setCards((list) =>
      list.some(
        (card) =>
          card.id === next.id
      )
        ? list.map((card) =>
            card.id === next.id
              ? next
              : card
          )
        : [...list, next]
    );

    setEditing(null);
  }

  return (
    <div className="bank-page">
      <div className="bank-title">
        <div>
          <span className="bank-kicker">
            CARTEIRA DE CARTÕES
          </span>

          <h2>
            Meus cartões e bancos
          </h2>

          <p>
            Cadastre seus cartões e
            configure fechamento e
            vencimento.
          </p>
        </div>

        <div className="bank-title-actions">
          <label>
            <Search />

            <input
              value={q}
              onChange={(event) =>
                setQ(
                  event.target.value
                )
              }
              placeholder="Buscar instituição"
            />
          </label>

          <button
            className="primary"
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
          <h3>Seus cartões</h3>

          <small>
            {cards.length}{" "}
            {cards.length === 1
              ? "cartão cadastrado"
              : "cartões cadastrados"}
          </small>
        </div>

        {cards.length ? (
          <div>
            {cards.map((card) => (
              <article
                className="credit-visual"
                key={card.id}
                style={{
                  background: `linear-gradient(135deg, ${card.color}, ${card.color2})`,
                }}
              >
                <div className="card-shine" />

                <div className="card-top">
                  <span>
                    {card.logo}
                  </span>

                  <CreditCard />
                </div>

                <b>
                  ••••&nbsp;{" "}
                  {card.last4}
                </b>

                <small>
                  Fechamento dia{" "}
                  {card.closing} ·
                  Vencimento dia{" "}
                  {card.due}
                </small>

                <button
                  className="edit-card"
                  onClick={() =>
                    setEditing(card)
                  }
                >
                  <Pencil />
                  Editar
                </button>

                <strong>
                  {card.bank}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cards">
            <CreditCard />

            <b>
              Nenhum cartão cadastrado
            </b>

            <span>
              Adicione seu primeiro
              cartão.
            </span>

            <button
              className="primary"
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
        {banks.map((bank) => {
          const added = cards.some(
            (card) =>
              card.bank === bank[0]
          );

          return (
            <button
              key={bank[0]}
              className={
                added
                  ? "bank-option chosen"
                  : "bank-option"
              }
              onClick={() =>
                added
                  ? setEditing(
                      cards.find(
                        (card) =>
                          card.bank ===
                          bank[0]
                      )!
                    )
                  : openCard(bank)
              }
            >
              <span
                className="bank-logo"
                style={{
                  background: `linear-gradient(135deg,${bank[1]},${bank[2]})`,
                  color:
                    bank[0] ===
                    "Banco do Brasil"
                      ? "#173863"
                      : "white",
                }}
              >
                {bank[3]}
              </span>

              <b>{bank[0]}</b>

              <small>
                {added
                  ? "Editar cartão"
                  : "Adicionar cartão"}
              </small>

              {added && <Check />}
            </button>
          );
        })}

        <button
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
            onSubmit={saveCard}
          >
            <ModalHead
              title={
                cards.some(
                  (card) =>
                    card.id ===
                    editing.id
                )
                  ? "Editar cartão"
                  : "Adicionar cartão"
              }
              sub="Configure as informações do cartão."
              close={() =>
                setEditing(null)
              }
              icon={<CreditCard />}
            />

            <div
              className="card-preview"
              style={{
                background: `linear-gradient(135deg,${editing.color},${editing.color2})`,
              }}
            >
              <span>
                {editing.logo ||
                  "CARD"}
              </span>

              <b>
                ••••&nbsp;{" "}
                {editing.last4 ||
                  "0000"}
              </b>

              <small>
                Fechamento dia{" "}
                {editing.closing} ·
                Vencimento dia{" "}
                {editing.due}
              </small>
            </div>

            <div className="card-form">
              <label>
                Instituição

                <input
                  name="bank"
                  required
                  value={editing.bank}
                  onChange={(event) => {
                    const match =
                      bankCatalog.find(
                        (bank) =>
                          bank[0].toLowerCase() ===
                          event.target.value.toLowerCase()
                      );

                    setEditing({
                      ...editing,
                      bank:
                        event.target
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
                  value={editing.logo}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      logo:
                        event.target
                          .value,
                    })
                  }
                  maxLength={12}
                />
              </label>

              <label>
                Final do cartão

                <input
                  name="last4"
                  inputMode="numeric"
                  required
                  value={editing.last4}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      last4:
                        event.target.value
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
                  maxLength={4}
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
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      closing: Number(
                        event.target
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
                  value={editing.due}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      due: Number(
                        event.target
                          .value
                      ),
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
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      color:
                        event.target
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
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      color2:
                        event.target
                          .value,
                    })
                  }
                />
              </label>
            </div>

            <div className="modal-foot card-modal-foot">
              {cards.some(
                (card) =>
                  card.id ===
                  editing.id
              ) && (
                <button
                  className="delete-card"
                  type="button"
                  onClick={() => {
                    setCards(
                      (list) =>
                        list.filter(
                          (card) =>
                            card.id !==
                            editing.id
                        )
                    );

                    setEditing(null);
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
                  setEditing(null)
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

/* =========================================================
   CONTAS
   ========================================================= */

function AccountsWorkspace() {
  const [accounts, setAccounts] =
    usePersistedFinance<FinanceAccount[]>(
      "accounts",
      initialAccounts
    );

  const [formOpen, setFormOpen] =
    useState(false);

  function saveAccount(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const fd = new FormData(
      event.currentTarget
    );

    const account: FinanceAccount = {
      id: Date.now(),
      name: String(
        fd.get("name")
      ),
      bank: String(
        fd.get("bank")
      ),
      type: String(
        fd.get("type")
      ) as FinanceAccount["type"],
      balance:
        Number(
          fd.get("balance")
        ) || 0,
    };

    setAccounts((list) => [
      ...list,
      account,
    ]);

    setFormOpen(false);
  }

  return (
    <div className="bank-page">
      <div className="bank-title">
        <div>
          <span className="bank-kicker">
            CONTAS FINANCEIRAS
          </span>

          <h2>Minhas contas</h2>

          <p>
            Cadastre contas
            bancárias, dinheiro,
            poupança e
            investimentos.
          </p>
        </div>

        <button
          className="primary"
          onClick={() =>
            setFormOpen(true)
          }
        >
          <Plus />
          Adicionar conta
        </button>
      </div>

      <div className="selected-banks">
        <div className="selected-heading">
          <h3>
            Contas cadastradas
          </h3>

          <small>
            {accounts.length}{" "}
            {accounts.length === 1
              ? "conta"
              : "contas"}
          </small>
        </div>

        {accounts.length ? (
          <div className="account-list">
            {accounts.map(
              (account) => (
                <article
                  className="panel"
                  key={account.id}
                >
                  <div>
                    <Landmark />

                    <h3>
                      {
                        account.name
                      }
                    </h3>

                    <p>
                      {
                        account.bank
                      }
                    </p>

                    <small>
                      {
                        account.type
                      }
                    </small>
                  </div>

                  <strong>
                    {fmt(
                      account.balance
                    )}
                  </strong>

                  <button
                    className="delete-card"
                    onClick={() =>
                      setAccounts(
                        (list) =>
                          list.filter(
                            (
                              current
                            ) =>
                              current.id !==
                              account.id
                          )
                      )
                    }
                  >
                    <Trash2 />
                    Excluir
                  </button>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="empty-cards">
            <Landmark />

            <b>
              Nenhuma conta
              cadastrada
            </b>

            <span>
              Adicione sua primeira
              conta para organizar
              seus saldos.
            </span>

            <button
              className="primary"
              onClick={() =>
                setFormOpen(true)
              }
            >
              <Plus />
              Adicionar conta
            </button>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="modal-bg">
          <form
            className="modal small"
            onSubmit={saveAccount}
          >
            <ModalHead
              title="Nova conta"
              sub="Cadastre uma conta financeira."
              close={() =>
                setFormOpen(false)
              }
              icon={<Landmark />}
            />

            <div className="form-grid">
              <label className="wide">
                Nome da conta

                <input
                  name="name"
                  required
                  placeholder="Ex.: Conta principal"
                />
              </label>

              <label className="wide">
                Banco / instituição

                <input
                  name="bank"
                  required
                  placeholder="Ex.: Nubank"
                />
              </label>

              <label>
                Tipo

                <select name="type">
                  <option>
                    Corrente
                  </option>
                  <option>
                    Poupança
                  </option>
                  <option>
                    Dinheiro
                  </option>
                  <option>
                    Investimento
                  </option>
                </select>
              </label>

              <label>
                Saldo atual

                <input
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                />
              </label>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
              >
                Cancelar
              </button>

              <button
                className="primary"
                type="submit"
              >
                <Check />
                Salvar conta
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}