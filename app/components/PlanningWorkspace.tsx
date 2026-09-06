"use client";
import { useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2 } from "lucide-react";
import { usePersistedFinance } from "../../lib/use-persisted-finance";
import type { Ledger, PlanItem } from "../../lib/finance-types";
import { money, settled } from "../../lib/finance-summary";
import ModalHead from "./ModalHead";

type Budget = { name: string; icon: string; value: number; color: string };
const initialItems: PlanItem[] = [];
const initialBudgets: Budget[] = [];
export default function PlanningWorkspace({ entries, selectedMonth, onEntries }: { entries: Ledger[]; selectedMonth: string; onEntries: () => void }) {
  const [items, setItems, state] = usePersistedFinance("planning-items", initialItems);
  const [budgets, setBudgets, budgetState] = usePersistedFinance("planning-budgets", initialBudgets);
  const [editing, setEditing] = useState<PlanItem | null | undefined>();
  const monthEntries = entries.filter(entry => entry.date.startsWith(`${selectedMonth}-`));
  const expenses = monthEntries.filter(entry => entry.type === "Despesa");
  const monthItems = items.filter(item => !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || item.date.startsWith(`${selectedMonth}-`));
  const extra = monthItems.filter(item => item.active && !expenses.some(entry => entry.id === item.ledgerId));
  const income = monthEntries.filter(entry => entry.type === "Receita").reduce((sum,entry) => sum + entry.value,0);
  const spent = expenses.reduce((sum,entry) => sum + entry.value,0);
  const extraTotal = extra.reduce((sum,item) => sum + item.value,0);
  const pending = expenses.filter(entry => !settled(entry)).reduce((sum,entry) => sum + entry.value,0);
  const categories = Array.from(new Set([...expenses.map(entry => entry.category), ...budgets.map(budget => budget.name), "Mercado", "Transporte", "Lazer"]));
  const ready = state === "salvo";
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const value = Number(data.get("value"));
    if (!name || !Number.isFinite(value) || value <= 0) return;
    const item: PlanItem = { id: editing?.id || Date.now(), name, value, date: String(data.get("date")), category: "Planejamento", icon: "📌", kind: "Fixo", active: true, ledgerId: Number(data.get("ledgerId")) || undefined };
    setItems(list => editing ? list.map(current => current.id === item.id ? item : current) : [...list,item]);
    setEditing(undefined);
  }
  return <div className="finance-workspace planning-v2">
    <section className="planning-intro"><span className="bank-kicker">ORÇAMENTO DO MÊS</span><h2>Organize o que precisa pagar</h2><p>As despesas de <strong>{selectedMonth.split("-").reverse().join("/")}</strong> aparecem automaticamente aqui. Acrescente o que ainda pretende gastar e acompanhe os limites por categoria.</p><p>Este planejamento ajuda a decidir os gastos do mês. Para juntar dinheiro para um objetivo, use Metas e reservas.</p><button className="primary" onClick={onEntries}>Ver lançamentos do mês</button></section>
    <div className="planning-metrics">{[["Receitas do mês",income,"Recebidas e a receber"],["Despesas registradas",spent,"Pagas e a pagar"],["Ainda a pagar",pending,"Somente despesas registradas"],["Margem após os compromissos",income-spent-extraTotal,"Receitas menos despesas e extras"]].map(([title,value,detail]) => <article className="panel" key={String(title)}><span>{title}</span><strong>{money(Number(value))}</strong><small>{detail}</small></article>)}</div>
    <div className="planning-columns"><section className="panel planning-box"><div className="panel-head"><div><h3>Compromissos do mês</h3><p>Extras que ainda não estão nos lançamentos.</p></div><button className="primary" disabled={!ready} onClick={() => setEditing(null)}><Plus />Adicionar compromisso</button></div>
      <div className="planning-example"><strong>💡 Exemplo: revisão do carro</strong><p>Você prevê gastar R$ 300 neste mês, mas ainda não registrou a despesa. Crie um compromisso e, quando lançar o pagamento, vincule-o para evitar contar duas vezes.</p></div>
      <p role="status">{state === "erro" ? "Não foi possível carregar ou salvar o plano. Recarregue para conferir." : state === "carregando" ? "Carregando compromissos…" : state === "salvando" ? "Salvando…" : `${monthItems.length} compromisso(s) neste mês`}</p>
      <div className="planning-rows">{monthItems.map(item => <article key={item.id}><div><strong>{item.icon} {item.name}</strong><small>{item.date.includes("-") ? item.date.split("-").reverse().join("/") : `Dia ${item.date} · recorrente`} · {!item.active ? "Inativo" : expenses.some(entry => entry.id === item.ledgerId) ? "Já incluído nas despesas" : "Extra previsto"}</small></div><b>{money(item.value)}</b><div className="goal-actions"><button disabled={!ready} aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><Pencil /></button><button disabled={!ready} aria-label={`Excluir ${item.name}`} onClick={() => { if (confirm(`Excluir o compromisso ${item.name}?`)) setItems(list => list.filter(current => current.id !== item.id)); }}><Trash2 /></button></div></article>)}</div>
      <p><strong>Extras previstos: {money(extraTotal)}</strong></p>
    </section><section className="panel planning-box"><h3>Limites por categoria</h3><p>Compare as despesas do mês com seus limites mensais. Os limites são referências e não são somados novamente às despesas.</p><p role="status">{budgetState === "erro" ? "Erro ao carregar ou salvar limites." : budgetState === "salvando" ? "Salvando limites…" : ""}</p>{categories.map(category => { const total = expenses.filter(entry => entry.category === category).reduce((sum,entry) => sum+entry.value,0); const budget = budgets.find(item => item.name === category); return <div className="planning-budget" key={category}><label><strong>{category}</strong><span>{money(total)} em despesas</span><input aria-label={`Limite mensal para ${category}`} type="number" min="0" step="0.01" placeholder="Definir limite" disabled={budgetState !== "salvo"} defaultValue={budget?.value || ""} key={`${category}-${budget?.value}`} onBlur={event => { const value = Number(event.target.value); if (!Number.isFinite(value) || value < 0 || value === (budget?.value || 0)) return; setBudgets(list => [...list.filter(item => item.name !== category), { name: category, value, icon: "📊", color: "teal" }]); }} /></label>{budget && budget.value > 0 && <><progress aria-label={`Uso do limite de ${category}`} value={Math.min(total,budget.value)} max={budget.value} /><small>{total > budget.value ? `Acima do limite em ${money(total-budget.value)}` : `Disponível: ${money(budget.value-total)}`}</small></>}</div>; })}</section></div>
    <section className="panel planning-box"><div className="panel-head"><div><h3>Despesas do mês · automáticas</h3><p>Atualizadas a partir de Lançamentos. A edição é feita naquela aba.</p></div></div><div className="planning-rows">{expenses.length ? [...expenses].sort((a,b) => a.date.localeCompare(b.date)).map(entry => <article key={entry.id}><div><strong>{entry.name}</strong><small>{entry.date.split("-").reverse().join("/")} · {entry.category}</small></div><span className="planning-status">{settled(entry) ? "Pago" : "A pagar"}</span><b>{money(entry.value)}</b></article>) : <p>Nenhuma despesa registrada neste mês.</p>}</div></section>
    {editing !== undefined && <div className="modal-bg"><form className="modal small" onSubmit={save}><ModalHead title={editing ? "Editar compromisso" : "Novo compromisso"} sub="Planeje um gasto antes de registrá-lo." close={() => setEditing(undefined)} icon={<CalendarDays />} /><div className="form-grid"><label className="wide">Nome do compromisso<input name="name" required defaultValue={editing?.name} placeholder="Ex.: revisão do carro" /></label><label>Valor previsto<input name="value" required type="number" step="0.01" min="0.01" defaultValue={editing?.value} /></label><label>Data prevista<input name="date" type="date" required defaultValue={editing?.date.includes("-") ? editing.date : `${selectedMonth}-01`} /></label><label className="wide">Já está nos lançamentos?<select name="ledgerId" defaultValue={editing?.ledgerId || ""}><option value="">Ainda não · considerar como extra</option>{expenses.map(entry => <option key={entry.id} value={entry.id}>{entry.name} · {money(entry.value)}</option>)}</select></label></div><div className="modal-foot"><button type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="primary" disabled={!ready}>Salvar compromisso</button></div></form></div>}
  </div>;
}
