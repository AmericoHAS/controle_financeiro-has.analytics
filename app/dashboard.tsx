"use client";
import { supabase } from "../lib/supabase";
import { useMemo, useState } from "react";
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

type Tx = {
  id: number;
  date: string;
  description: string;
  category: string;
  icon: string;
  account: string;
  value: number;
  status: "confirmado" | "previsto" | "revisar";
  installment?: string;
};

const initial: Tx[] = [];

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(n));

export default function Home({
  userEmail,
  onLogout,
}: {
  userEmail: string;
  onLogout: () => void;
}) {
  const [section, setSection] = useState("Visão geral");
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [month, setMonth] = useState("Setembro 2026");

  const [txs, setTxs, saveState] = usePersistedFinance<Tx[]>(
    "dashboard-transactions",
    initial
  );

  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
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

  const spent = txs
    .filter((x) => x.value < 0)
    .reduce((a, b) => a - b.value, 0);

  const income = txs
    .filter((x) => x.value > 0)
    .reduce((a, b) => a + b.value, 0);

  const projectedBalance = income - spent;

  const filtered = txs.filter(
    (t) =>
      t.value < 0 &&
      (t.description + t.category + t.account)
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const cats = useMemo(
    () =>
      Object.entries(
        txs
          .filter((t) => t.value < 0)
          .reduce(
            (a, t) => ({
              ...a,
              [t.category]: (a[t.category] || 0) - t.value,
            }),
            {} as Record<string, number>
          )
      ).sort((a, b) => b[1] - a[1]),
    [txs]
  );

  function doImport() {
    const lines = paste.split(/\n/).filter(Boolean);
    const added: Tx[] = [];

    lines.forEach((line, j) => {
      const m = line.match(
        /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?).*?([+-]?\s?R?\$?\s?[\d.]+,\d{2})/
      );

      if (!m) return;

      const raw = m[2]
        .replace(/[^\d,\-]/g, "")
        .replace(".", "")
        .replace(",", ".");

      const desc =
        line
          .slice(
            m.index! + m[0].indexOf(m[1]) + m[1].length,
            line.lastIndexOf(m[2])
          )
          .replace(/[;|]/g, " ")
          .trim() || "Lançamento importado";

      const low = desc.toLowerCase();

      const map = low.includes("merc")
        ? ["Mercado", "🛒"]
        : low.includes("posto") || low.includes("uber")
        ? ["Transporte", "🚗"]
        : low.includes("sal")
        ? ["Renda", "💼"]
        : low.includes("ifood")
        ? ["Delivery", "🛵"]
        : ["A confirmar", "✨"];

      added.push({
        id: Date.now() + j,
        date: m[1].slice(0, 5).replace("/", " "),
        description: desc,
        category: map[0],
        icon: map[1],
        account: "Extrato importado",
        value: Number(raw),
        status: map[0] === "A confirmar" ? "revisar" : "confirmado",
      });
    });

    if (!added.length) {
      setNotice(
        "Não identifiquei linhas com data e valor. Cole uma movimentação por linha."
      );
      return;
    }

    const unique = added.filter(
      (n) =>
        !txs.some(
          (t) =>
            t.description === n.description &&
            t.value === n.value &&
            t.date === n.date
        )
    );

    setTxs((p) => [...unique, ...p]);

    setNotice(
      `${unique.length} lançamentos novos; ${
        added.length - unique.length
      } duplicados ignorados.`
    );

    setPaste("");
  }

  return (
    <div className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <button
          className="collapse-sidebar"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>

        <div className="brand">
          <img
            className="brandmark has-logo"
            src="/has-financial-logo.png"
            alt="HAS Financial"
          />

          <div>
            <strong>HAS Financial</strong>
            <small>Inteligência financeira</small>
          </div>

          <button className="close-mobile" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>

        <nav>
          {nav.map(([n, I]) => (
            <button
              key={n}
              className={section === n ? "nav active" : "nav"}
              onClick={() => {
                if (n === "Acessos") {
                  location.href = "/admin/requests";
                  return;
                }

                setSection(n);
                setMobile(false);
              }}
            >
              <I />
              <span>{n}</span>
            </button>
          ))}
        </nav>

        <div className="side-bottom">
          <button className="nav">
            <Settings />
            <span>Preferências</span>
          </button>

          <div className="profile">
            <div>{userEmail.slice(0, 2).toUpperCase()}</div>

            <span>
              <b>{userEmail.split("@")[0]}</b>
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
          <button className="hamb" onClick={() => setMobile(true)}>
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
            <button
              className="month"
              onClick={() =>
                setMonth(
                  month === "Setembro 2026"
                    ? "Outubro 2026"
                    : "Setembro 2026"
                )
              }
            >
              <CalendarDays />
              {month}
              <ChevronDown />
            </button>

            <button className="iconbtn" title={userEmail}>
              <Bell />
            </button>

            <button className="primary" onClick={() => setImportOpen(true)}>
              <Upload />
              Importar extrato
            </button>

            <button className="add" onClick={() => setAddOpen(true)}>
              <Plus />
            </button>

            <button className="iconbtn" onClick={onLogout} title="Sair">
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
  <TransactionsWorkspace />
) : section !== "Visão geral" ? (
          <div className="section-placeholder">
            <div className="placeholder-icon">
              <Sparkles />
            </div>

            <h2>{section}</h2>

            <p>
              Esta área faz parte do seu controle financeiro e será vinculada
              aos dados da sua conta.
            </p>

            <button className="primary" onClick={() => setAddOpen(true)}>
              <Plus />
              Novo lançamento
            </button>
          </div>
        ) : (
          <div className="content">
            <section className="forecast">
              <div>
                <span className="eyebrow">SALDO PROJETADO</span>

                <h2>
                  {projectedBalance < 0 ? "− " : ""}
                  {fmt(projectedBalance)}
                </h2>

                <p>
                  {txs.length
                    ? "Calculado com base nos seus lançamentos."
                    : "Cadastre suas receitas e despesas para iniciar."}
                </p>
              </div>

              <div className="forecast-right">
                <div>
                  <span>Saldo projetado</span>
                  <b>
                    {projectedBalance < 0 ? "− " : ""}
                    {fmt(projectedBalance)}
                  </b>
                </div>

                <div className="line" />

                <div>
                  <span>A receber</span>
                  <b className="green">+ {fmt(income)}</b>
                </div>

                <div>
                  <span>A pagar</span>
                  <b className="red">− {fmt(spent)}</b>
                </div>
              </div>
            </section>

            <div className="alert">
              <Sparkles />

              <div>
                <b>
                  {txs.length
                    ? "Seus dados financeiros estão atualizados"
                    : "Comece seu planejamento financeiro"}
                </b>

                <span>
                  {txs.length
                    ? "Todas as informações são vinculadas à sua conta."
                    : "Cadastre receitas, despesas, cartões e contas para montar seu painel."}
                </span>
              </div>

              <button onClick={() => setSection("Lançamentos")}>
                {txs.length ? "Ver lançamentos" : "Começar"}
              </button>
            </div>

            <section className="kpis">
              <Kpi
                title="Receitas"
                value={fmt(income)}
                sub="Registradas no período"
                foot={`${txs.filter((t) => t.value > 0).length} lançamentos`}
                kind="green"
              />

              <Kpi
                title="Despesas"
                value={fmt(spent)}
                sub="Registradas no período"
                foot={`${txs.filter((t) => t.value < 0).length} lançamentos`}
                kind="coral"
              />

              <Kpi
                title="Cartões"
                value="R$ 0,00"
                sub="Faturas do período"
                foot="Cadastre seus cartões"
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
                  sub="Entradas e saídas registradas"
                  onDetails={() => setSection("Lançamentos")}
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
                    {[0, 0, 0, 0, 0, 0].map((h, i) => (
                      <div className="bars" key={i}>
                        <i className="in" style={{ height: `${h}%` }} />
                        <i className="out" style={{ height: `${h}%` }} />

                        <span>
                          {["01", "06", "12", "18", "24", "30"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel categories">
                <PanelHead
                  title="Para onde foi o dinheiro"
                  sub="Maiores categorias no período"
                />

                <div className="donut-wrap">
                  <div className="donut">
                    <div>
                      <b>{fmt(spent)}</b>
                      <span>total gasto</span>
                    </div>
                  </div>

                  <div className="cat-list">
                    {cats.slice(0, 5).map(([c, v], i) => (
                      <div key={c}>
                        <span>
                          <i className={`c${i}`} />
                          ✨ {c}
                        </span>

                        <b>{fmt(v)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <section className="panel transactions">
              <div className="panel-head">
                <div>
                  <h3>Despesas do mês</h3>
                  <p>Despesas registradas na sua conta</p>
                </div>

                <div className="table-actions">
                  <label>
                    <Search />

                    <input
                      placeholder="Buscar"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>

                  <button onClick={() => setAddOpen(true)}>
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
                      <th>Conta / cartão</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>

                        <td>
                          <span className="tx-icon">{t.icon}</span>
                          <b>{t.description}</b>

                          {t.installment && (
                            <small>Parcela {t.installment}</small>
                          )}
                        </td>

                        <td>{t.category}</td>
                        <td>{t.account}</td>

                        <td>
                          <span className={`status ${t.status}`}>
                            {t.status === "confirmado"
                              ? "Confirmado"
                              : t.status === "previsto"
                              ? "Previsto"
                              : "Revisar"}
                          </span>
                        </td>

                        <td className={t.value > 0 ? "green" : ""}>
                          {t.value > 0 ? "+ " : "− "}
                          {fmt(t.value)}
                        </td>
                      </tr>
                    ))}
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
                onChange={(e) => setPaste(e.target.value)}
                placeholder={
                  "03/09 Supermercado -387,42\n05/09 Salário +5.498,70"
                }
              />
            </label>

            {notice && <p className="notice">{notice}</p>}

            <div className="modal-foot">
              <button onClick={() => setImportOpen(false)}>Cancelar</button>

              <button className="primary" onClick={doImport}>
                Analisar lançamentos
                <ArrowUpRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="modal-bg">
          <form
            className="modal small"
            onSubmit={(e) => {
              e.preventDefault();

              const fd = new FormData(e.currentTarget);

              setTxs((p) => [
                {
                  id: Date.now(),
                  date: String(fd.get("date") || "Hoje"),
                  description: String(fd.get("desc")),
                  category: String(fd.get("cat")),
                  icon: "✨",
                  account: "Conta principal",
                  value: -Math.abs(Number(fd.get("value")) || 0),
                  status: "confirmado",
                },
                ...p,
              ]);

              setAddOpen(false);
            }}
          >
            <ModalHead
              title="Novo lançamento"
              sub="Registre uma despesa."
              close={() => setAddOpen(false)}
              icon={<Plus />}
            />

            <div className="form-grid">
              <label>
                Data
                <input name="date" placeholder="04 set" required />
              </label>

              <label>
                Valor
                <input
                  name="value"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  required
                />
              </label>

              <label className="wide">
                Descrição
                <input name="desc" placeholder="Ex.: Mercado" required />
              </label>

              <label className="wide">
                Categoria
                <select name="cat">
                  <option>Mercado</option>
                  <option>Moradia</option>
                  <option>Transporte</option>
                  <option>Compras</option>
                  <option>Assinaturas</option>
                  <option>Outros</option>
                </select>
              </label>
            </div>

            <div className="modal-foot">
              <button type="button" onClick={() => setAddOpen(false)}>
                Cancelar
              </button>

              <button className="primary" type="submit">
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

      {onDetails && <button onClick={onDetails}>Ver detalhes</button>}
    </div>
  );
}

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
        <span className="modal-icon">{icon}</span>

        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>

      <button onClick={close} type="button">
        <X />
      </button>
    </div>
  );
}

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

const ledgerSeed: Ledger[] = [];

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


  function TransactionsWorkspace() {
  const [accounts, setAccounts] = usePersistedFinance<FinanceAccount[]>(
    "accounts",
    initialAccounts
  );

  const [cards] = usePersistedFinance<FinanceCard[]>(
    "cards",
    initialCards
  );

  const [entries, setEntries] = usePersistedFinance<Ledger[]>(
    "ledger",
    ledgerSeed
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

  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");

  const shown = entries.filter(
    (e) =>
      (view === "Todos" || e.type === view.slice(0, -1)) &&
      (e.name + e.category + e.account)
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const revenues = entries
    .filter((e) => e.type === "Receita")
    .reduce((a, e) => a + e.value, 0);

  const expenses = entries
    .filter((e) => e.type === "Despesa")
    .reduce((a, e) => a + e.value, 0);

  const monthlyIncome = entries
    .filter((e) => e.type === "Receita" && e.frequency === "Mensal")
    .reduce((a, e) => a + e.value, 0);

  const futureInstallments = entries
    .filter((e) => e.frequency === "Parcelado")
    .reduce((a, e) => a + e.value * (e.remaining || 0), 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const fd = new FormData(e.currentTarget);

  const type = String(fd.get("type")) as "Receita" | "Despesa";
  const frequency = String(fd.get("frequency")) as Ledger["frequency"];
  const total = Math.max(1, Number(fd.get("parts")) || 1);
  const value = Math.abs(Number(fd.get("value")) || 0);
  const destination = String(fd.get("account"));

  let accountLabel = "Dinheiro";
  let sourceType: "account" | "card" | "cash" = "cash";
  let sourceId: number | undefined;

  // CONTA BANCÁRIA
  if (destination.startsWith("account:")) {
    const accountId = Number(destination.replace("account:", ""));

    const selectedAccount = accounts.find(
      (account) => account.id === accountId
    );

    if (!selectedAccount) {
      alert("Conta não encontrada.");
      return;
    }

    sourceType = "account";
    sourceId = accountId;

    accountLabel = `${selectedAccount.name} · ${selectedAccount.bank}`;

    const updatedAccounts = accounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            balance:
              type === "Receita"
                ? account.balance + value
                : account.balance - value,
          }
        : account
    );

    setAccounts(updatedAccounts);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado.");
      return;
    }

    const { error } = await supabase
      .from("finance_records")
      .upsert(
        {
          user_id: user.id,
          namespace: "accounts",
          payload: updatedAccounts,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,namespace",
        }
      );

    if (error) {
      console.error("Erro ao atualizar saldo:", error);
      alert("Erro ao atualizar o saldo da conta.");
      return;
    }
  }

  // CARTÃO
  if (destination.startsWith("card:")) {
    const cardId = Number(destination.replace("card:", ""));

    const selectedCard = cards.find(
      (card) => card.id === cardId
    );

    if (!selectedCard) {
      alert("Cartão não encontrado.");
      return;
    }

    sourceType = "card";
    sourceId = cardId;

    accountLabel = `${selectedCard.bank} • ${selectedCard.last4}`;
  }

  const newEntry: Ledger = {
    id: Date.now(),
    type,
    name: String(fd.get("name")),
    category: String(fd.get("category")),
    icon: type === "Receita" ? "💰" : "✨",
    date: String(fd.get("date") || "Hoje"),
    value,
    account: accountLabel,
    frequency,
    installment:
      frequency === "Parcelado" ? `1/${total}` : undefined,
    remaining:
      frequency === "Parcelado" ? total - 1 : undefined,
    status: "Previsto",
    sourceType,
    sourceId,
  };

  setEntries((list) => [newEntry, ...list]);

  setForm(false);
}


function deleteEntry(entry: Ledger) {
  if (!window.confirm(`Excluir "${entry.name}"?`)) return;

  if (entry.sourceType === "account" && entry.sourceId) {
    setAccounts((list) =>
      list.map((account) =>
        account.id === entry.sourceId
          ? {
              ...account,
              balance:
                entry.type === "Despesa"
                  ? account.balance + entry.value
                  : account.balance - entry.value,
            }
          : account
      )
    );
  }

  setEntries((list) =>
    list.filter((item) => item.id !== entry.id)
  );
}
  return (
    <div className="ledger-page">
      <section className="ledger-heading">
        <div>
          <span>CONTROLE FINANCEIRO</span>
          <h2>Receitas e despesas</h2>
          <p>
            Cadastre receitas, despesas, recorrências e compras parceladas.
          </p>
        </div>

        <div>
          <button
            className="category-btn"
            onClick={() => setCatOpen((v) => !v)}
          >
            <Settings />
            Categorias
          </button>

          <button
            className="primary ledger-add"
            onClick={() => setForm(true)}
          >
            <Plus />
            Novo lançamento
          </button>
        </div>
      </section>

      <section className="ledger-summary">
        <article>
          <span>Receitas</span>
          <b className="ledger-green">+ {fmt(revenues)}</b>
          <small>{fmt(monthlyIncome)} recorrentes mensalmente</small>
        </article>

        <article>
          <span>Despesas</span>
          <b className="ledger-red">− {fmt(expenses)}</b>
          <small>
            {
              entries.filter(
                (e) => e.type === "Despesa" && e.frequency === "Mensal"
              ).length
            }{" "}
            compromissos recorrentes
          </small>
        </article>

        <article>
          <span>Saldo previsto</span>
          <b>
            {revenues - expenses < 0 ? "− " : ""}
            {fmt(revenues - expenses)}
          </b>
          <small>Considerando todos os lançamentos</small>
        </article>

        <article>
          <span>Parcelas futuras</span>
          <b>{fmt(futureInstallments)}</b>
          <small>Valores programados</small>
        </article>
      </section>

      {catOpen && (
        <section className="category-manager">
          <div>
            <h3>Categorias personalizadas</h3>
            <p>Organize receitas e despesas do seu jeito.</p>
          </div>

          <div className="category-chips">
            {categories.map((c, i) => (
              <span key={c[0]}>
                {c[1]} {c[0]}
                <small>{c[2]}</small>

                <button
                  onClick={() =>
                    setCategories((list) =>
                      list.filter((_, j) => j !== i)
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (newCat.trim()) {
                setCategories((list) => [
                  ...list,
                  [newCat, "✨", "Despesa"],
                ]);

                setNewCat("");
              }
            }}
          >
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Nome da nova categoria"
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
            {(["Todos", "Receitas", "Despesas"] as const).map((t) => (
              <button
                className={view === t ? "active" : ""}
                onClick={() => setView(t)}
                key={t}
              >
                {t}

                <span>
                  {t === "Todos"
                    ? entries.length
                    : t === "Receitas"
                    ? entries.filter((e) => e.type === "Receita").length
                    : entries.filter((e) => e.type === "Despesa").length}
                </span>
              </button>
            ))}
          </div>

          <label>
            <Search />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lançamento, categoria ou conta"
            />
          </label>
        </div>

<div className="ledger-list">
  <div className="ledger-row ledger-labels">
    <span>Data</span>
    <span>Lançamento</span>
    <span>Categoria</span>
    <span>Conta ou cartão</span>
    <span>Repetição</span>
    <span>Valor</span>
    <span>Ações</span>
  </div>

  {shown.map((e) => (
            <article className="ledger-row" key={e.id}>
              <span>{e.date}</span>

              <div>
                <i>{e.icon}</i>

                <p>
                  <b>{e.name}</b>
                  <small>{e.status}</small>
                </p>
              </div>

              <span className="ledger-category">{e.category}</span>
              <span>{e.account}</span>

              <div>
                <b className="frequency">{e.frequency}</b>

                {e.installment && (
                  <small>
                    Parcela {e.installment} · faltam {e.remaining}
                  </small>
                )}
              </div>

              <strong
  className={
    e.type === "Receita"
      ? "ledger-green"
      : "ledger-red"
  }
>
  {e.type === "Receita" ? "+" : "−"} {fmt(e.value)}
</strong>

<button
  type="button"
  onClick={() => deleteEntry(e)}
  title="Excluir lançamento"
  style={{
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Trash2 size={18} />
</button>
            </article>
          ))}
        </div>
      </section>

      {form && (
        <div className="modal-bg">
          <form className="modal ledger-modal" onSubmit={submit}>
            <ModalHead
              title="Novo lançamento"
              sub="Defina se o valor acontece uma vez, mensalmente ou em parcelas."
              close={() => setForm(false)}
              icon={<Plus />}
            />

            <div className="ledger-form">
              <label>
                Tipo
                <select name="type">
                  <option>Despesa</option>
                  <option>Receita</option>
                </select>
              </label>

              <label>
                Descrição
                <input
                  name="name"
                  required
                  placeholder="Ex.: Salário, aluguel ou compra"
                />
              </label>

              <label>
                Valor
                <input
                  name="value"
                  type="number"
                  step=".01"
                  required
                  placeholder="0,00"
                />
              </label>

              <label>
                Data
                <input name="date" required placeholder="15 out" />
              </label>

              <label>
                Categoria
                <select name="category">
                  {categories.map((c) => (
                    <option key={c[0]}>{c[0]}</option>
                  ))}
                </select>
              </label>

 <label>
  Conta ou cartão

  <select name="account" required>
    <option value="">Selecione</option>

    {accounts.map((account) => (
      <option
        key={`account-${account.id}`}
        value={`account:${account.id}`}
      >
        {account.name} · {account.bank} · Saldo {fmt(account.balance)}
      </option>
    ))}

    {cards.map((card) => (
      <option
        key={`card-${card.id}`}
        value={`card:${card.id}`}
      >
        {card.bank} • {card.last4}
      </option>
    ))}

    <option value="cash">Dinheiro</option>
  </select>
</label>

              <label>
                Repetição
                <select name="frequency">
                  <option>Único</option>
                  <option>Mensal</option>
                  <option>Parcelado</option>
                </select>
              </label>

              <label>
                Número de parcelas
                <input
                  name="parts"
                  type="number"
                  min="1"
                  placeholder="Preencha se parcelado"
                />
              </label>
            </div>

            <div className="modal-foot">
              <button type="button" onClick={() => setForm(false)}>
                Cancelar
              </button>

              <button className="primary">
                <Check />
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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

const initialPlan: PlanItem[] = [];

const initialBudgets: {
  name: string;
  icon: string;
  value: number;
  color: string;
}[] = [];

function Planning() {
  const [income, setIncome] = usePersistedFinance<number>(
    "planning-income",
    0
  );

  const [reserve, setReserve] = usePersistedFinance<number>(
    "planning-reserve",
    0
  );

  const [items, setItems] = usePersistedFinance<PlanItem[]>(
    "planning-items",
    initialPlan
  );

  const [budgets, setBudgets] = usePersistedFinance<
    typeof initialBudgets
  >("planning-budgets", initialBudgets);

  const [editing, setEditing] = useState(false);

  const commitments = items
    .filter((i) => i.active)
    .reduce((sum, i) => sum + i.value, 0);

  const flexible = budgets.reduce((sum, i) => sum + i.value, 0);

  const free = income - commitments - flexible - reserve;

  const plannedPct =
    income > 0
      ? Math.min(
          100,
          Math.round(
            ((commitments + flexible + reserve) / income) * 100
          )
        )
      : 0;

  const changeBudget = (index: number, value: number) =>
    setBudgets((list) =>
      list.map((b, i) =>
        i === index ? { ...b, value: Math.max(0, value) } : b
      )
    );

  return (
    <div className="planning-page">
      <section className="planning-top">
        <div>
          <span className="planning-kicker">
            <CalendarDays /> PLANEJAMENTO
          </span>

          <h2>Decida o mês antes que ele comece.</h2>

          <p>
            Organize compromissos, limites de gasto e reservas.
          </p>
        </div>

        <div className="planning-score">
          <span>PLANEJADO</span>
          <b>{plannedPct}%</b>

          <div>
            <i style={{ width: `${plannedPct}%` }} />
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
              onChange={(e) => setIncome(Number(e.target.value))}
            />
          </label>

          <small>Salários e outras entradas</small>
        </article>

        <article>
          <span>
            <ReceiptText />
            Compromissos
          </span>

          <b>{fmt(commitments)}</b>
          <small>{items.filter((i) => i.active).length} programados</small>
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
              onChange={(e) => setReserve(Number(e.target.value))}
            />
          </label>

          <small>Valor reservado</small>
        </article>

        <article className={free < 0 ? "free-card danger" : "free-card"}>
          <span>
            <Wallet />
            Saldo livre projetado
          </span>

          <b>
            {free < 0 ? "− " : ""}
            {fmt(free)}
          </b>

          <small>Depois de todo o plano</small>
        </article>
      </section>

      <div className="planning-grid">
        <section className="panel plan-commitments">
          <div className="panel-head">
            <div>
              <h3>Compromissos do mês</h3>
              <p>Adicione as despesas programadas</p>
            </div>

            <button onClick={() => setEditing((v) => !v)}>
              {editing ? "Concluir" : "Editar plano"}
            </button>
          </div>

          <div className="commitment-list">
            {items.map((item) => (
              <article
                className={item.active ? "" : "disabled"}
                key={item.id}
              >
                <button
                  className="plan-check"
                  onClick={() =>
                    setItems((list) =>
                      list.map((i) =>
                        i.id === item.id
                          ? { ...i, active: !i.active }
                          : i
                      )
                    )
                  }
                >
                  {item.active ? <CircleCheck /> : <Circle />}
                </button>

                <span className="plan-emoji">{item.icon}</span>

                <div>
                  <b>{item.name}</b>

                  <small>
                    {item.date} · {item.kind}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </small>
                </div>

                {editing ? (
                  <label className="plan-value">
                    R${" "}
                    <input
                      type="number"
                      value={item.value}
                      onChange={(e) =>
                        setItems((list) =>
                          list.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  value: Number(e.target.value),
                                }
                              : i
                          )
                        )
                      }
                    />
                  </label>
                ) : (
                  <strong>{fmt(item.value)}</strong>
                )}

                {editing && (
                  <button
                    className="plan-remove"
                    onClick={() =>
                      setItems((list) =>
                        list.filter((i) => i.id !== item.id)
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
              <h3>Limites para gastos variáveis</h3>
              <p>Defina quanto pretende gastar</p>
            </div>
          </div>

          <div className="budget-list">
            {budgets.map((budget, index) => (
              <article key={budget.name}>
                <div className={`budget-icon ${budget.color}`}>
                  {budget.icon}
                </div>

                <div>
                  <b>{budget.name}</b>
                  <span>Limite mensal</span>
                </div>

                <label>
                  R${" "}
                  <input
                    type="number"
                    step="50"
                    value={budget.value}
                    onChange={(e) =>
                      changeBudget(index, Number(e.target.value))
                    }
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="budget-total">
            <span>Total reservado para variáveis</span>
            <b>{fmt(flexible)}</b>
          </div>

          <div className="planning-tip">
            <Sparkles />

            <p>
              <b>Margem disponível</b>
              <br />
              Sua margem atual é{" "}
              <strong>
                {income > 0 ? Math.round((free / income) * 100) : 0}%
              </strong>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

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
  ["Mercado Pago", "#16aee8", "#0876b9", "mercado pago"],
  ["PagBank", "#42b549", "#187c31", "PagBank"],
  ["Neon", "#00b8e6", "#006ed0", "neon"],
] as const;

const initialCards: FinanceCard[] = [];

function BankCatalog() {
  const [cards, setCards] = usePersistedFinance<FinanceCard[]>(
    "cards",
    initialCards
  );

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<FinanceCard | null>(null);

  const banks = bankCatalog.filter((b) =>
    b[0].toLowerCase().includes(q.toLowerCase())
  );

  function openCard(bank?: (typeof bankCatalog)[number]) {
    setEditing({
      id: Date.now(),
      bank: bank?.[0] || "",
      color: bank?.[1] || "#063b70",
      color2: bank?.[2] || "#021b3a",
      logo: bank?.[3] || "CARD",
      last4: "",
      closing: 1,
      due: 10,
    });
  }

  function saveCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const next: FinanceCard = {
      id: editing!.id,
      bank: String(fd.get("bank")).trim(),
      logo: String(fd.get("logo")).trim() || "CARD",
      last4: String(fd.get("last4"))
        .replace(/\D/g, "")
        .slice(-4)
        .padStart(4, "0"),
      closing: Number(fd.get("closing")),
      due: Number(fd.get("due")),
      color: String(fd.get("color")),
      color2: String(fd.get("color2")),
    };

    setCards((list) =>
      list.some((c) => c.id === next.id)
        ? list.map((c) => (c.id === next.id ? next : c))
        : [...list, next]
    );

    setEditing(null);
  }

  return (
    <div className="bank-page">
      <div className="bank-title">
        <div>
          <span className="bank-kicker">CARTEIRA DE CARTÕES</span>
          <h2>Meus cartões e bancos</h2>
          <p>
            Cadastre seus cartões e configure fechamento e vencimento.
          </p>
        </div>

        <div className="bank-title-actions">
          <label>
            <Search />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar instituição"
            />
          </label>

          <button className="primary" onClick={() => openCard()}>
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
                  background: `linear-gradient(135deg,${card.color},${card.color2})`,
                }}
              >
                <div className="card-shine" />

                <div className="card-top">
                  <span>{card.logo}</span>
                  <CreditCard />
                </div>

                <b>••••&nbsp; {card.last4}</b>

                <small>
                  Fechamento dia {card.closing} · Vencimento dia{" "}
                  {card.due}
                </small>

                <button
                  className="edit-card"
                  onClick={() => setEditing(card)}
                >
                  <Pencil />
                  Editar
                </button>

                <strong>{card.bank}</strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cards">
            <CreditCard />
            <b>Nenhum cartão cadastrado</b>

            <span>
              Adicione seu primeiro cartão para acompanhar suas faturas.
            </span>

            <button className="primary" onClick={() => openCard()}>
              <Plus />
              Adicionar cartão
            </button>
          </div>
        )}
      </div>

      <h3>Catálogo de instituições</h3>

      <div className="bank-grid">
        {banks.map((bank) => {
          const added = cards.some((c) => c.bank === bank[0]);

          return (
            <button
              key={bank[0]}
              className={added ? "bank-option chosen" : "bank-option"}
              onClick={() =>
                added
                  ? setEditing(cards.find((c) => c.bank === bank[0])!)
                  : openCard(bank)
              }
            >
              <span
                className="bank-logo"
                style={{
                  background: `linear-gradient(135deg,${bank[1]},${bank[2]})`,
                  color:
                    bank[0] === "Banco do Brasil" ? "#173863" : "white",
                }}
              >
                {bank[3]}
              </span>

              <b>{bank[0]}</b>

              <small>
                {added ? "Editar cartão" : "Adicionar cartão"}
              </small>

              {added && <Check />}
            </button>
          );
        })}

        <button
          className="bank-option custom-bank"
          onClick={() => openCard()}
        >
          <span className="bank-logo">
            <Plus />
          </span>

          <b>Outra instituição</b>
          <small>Cadastrar manualmente</small>
        </button>
      </div>

      {editing && (
        <div className="modal-bg">
          <form className="modal card-modal" onSubmit={saveCard}>
            <ModalHead
              title={
                cards.some((c) => c.id === editing.id)
                  ? "Editar cartão"
                  : "Adicionar cartão"
              }
              sub="Configure as informações do cartão."
              close={() => setEditing(null)}
              icon={<CreditCard />}
            />

            <div
              className="card-preview"
              style={{
                background: `linear-gradient(135deg,${editing.color},${editing.color2})`,
              }}
            >
              <span>{editing.logo || "CARD"}</span>

              <b>••••&nbsp; {editing.last4 || "0000"}</b>

              <small>
                Fechamento dia {editing.closing} · Vencimento dia{" "}
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
                  onChange={(e) => {
                    const match = bankCatalog.find(
                      (b) =>
                        b[0].toLowerCase() ===
                        e.target.value.toLowerCase()
                    );

                    setEditing({
                      ...editing,
                      bank: e.target.value,
                      ...(match
                        ? {
                            logo: match[3],
                            color: match[1],
                            color2: match[2],
                          }
                        : {}),
                    });
                  }}
                  placeholder="Ex.: Nubank"
                />
              </label>

              <label>
                Nome curto / logo
                <input
                  name="logo"
                  value={editing.logo}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      logo: e.target.value,
                    })
                  }
                  maxLength={12}
                  placeholder="Ex.: NU"
                />
              </label>

              <label>
                Final do cartão
                <input
                  name="last4"
                  inputMode="numeric"
                  required
                  value={editing.last4}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      last4: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4),
                    })
                  }
                  maxLength={4}
                  placeholder="0000"
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
                  value={editing.closing}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      closing: Number(e.target.value),
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
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      due: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label className="color-field">
                Cor principal
                <input
                  name="color"
                  type="color"
                  value={editing.color}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      color: e.target.value,
                    })
                  }
                />
              </label>

              <label className="color-field">
                Cor de apoio
                <input
                  name="color2"
                  type="color"
                  value={editing.color2}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      color2: e.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="modal-foot card-modal-foot">
              {cards.some((c) => c.id === editing.id) && (
                <button
                  className="delete-card"
                  type="button"
                  onClick={() => {
                    setCards((list) =>
                      list.filter((c) => c.id !== editing.id)
                    );

                    setEditing(null);
                  }}
                >
                  <Trash2 />
                  Excluir
                </button>
              )}

              <span />

              <button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>

              <button className="primary" type="submit">
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

type FinanceAccount = {
  id: number;
  name: string;
  bank: string;
  type: "Corrente" | "Poupança" | "Dinheiro" | "Investimento";
  balance: number;
};

const initialAccounts: FinanceAccount[] = [];

function AccountsWorkspace() {
  const [accounts, setAccounts] = usePersistedFinance<FinanceAccount[]>(
    "accounts",
    initialAccounts
  );

  const [formOpen, setFormOpen] = useState(false);

  function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const account: FinanceAccount = {
      id: Date.now(),
      name: String(fd.get("name")),
      bank: String(fd.get("bank")),
      type: String(fd.get("type")) as FinanceAccount["type"],
      balance: Number(fd.get("balance")) || 0,
    };

    setAccounts((list) => [...list, account]);
    setFormOpen(false);
  }

  return (
    <div className="bank-page">
      <div className="bank-title">
        <div>
          <span className="bank-kicker">CONTAS FINANCEIRAS</span>
          <h2>Minhas contas</h2>
          <p>
            Cadastre contas bancárias, dinheiro, poupança e investimentos.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setFormOpen(true)}
        >
          <Plus />
          Adicionar conta
        </button>
      </div>

      <div className="selected-banks">
        <div className="selected-heading">
          <h3>Contas cadastradas</h3>

          <small>
            {accounts.length}{" "}
            {accounts.length === 1 ? "conta" : "contas"}
          </small>
        </div>

        {accounts.length ? (
          <div className="account-list">
            {accounts.map((account) => (
              <article className="panel" key={account.id}>
                <div>
                  <Landmark />
                  <h3>{account.name}</h3>
                  <p>{account.bank}</p>
                  <small>{account.type}</small>
                </div>

                <strong>{fmt(account.balance)}</strong>

                <button
                  className="delete-card"
                  onClick={() =>
                    setAccounts((list) =>
                      list.filter((a) => a.id !== account.id)
                    )
                  }
                >
                  <Trash2 />
                  Excluir
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cards">
            <Landmark />
            <b>Nenhuma conta cadastrada</b>
            <span>
              Adicione sua primeira conta para organizar seus saldos.
            </span>

            <button
              className="primary"
              onClick={() => setFormOpen(true)}
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
              close={() => setFormOpen(false)}
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
                  <option>Corrente</option>
                  <option>Poupança</option>
                  <option>Dinheiro</option>
                  <option>Investimento</option>
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
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </button>

              <button className="primary" type="submit">
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