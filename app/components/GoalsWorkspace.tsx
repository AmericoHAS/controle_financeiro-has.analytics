"use client";
import { useState } from "react";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import type { FinanceAccount, Ledger } from "../../lib/finance-types";
import { usePersistedFinance } from "../../lib/use-persisted-finance";
import { money, settled, belongsToAccount } from "../../lib/finance-summary";
import GoalProgress from "./GoalProgress";
import ModalHead from "./ModalHead";

type Goal = { id: string; name: string; target: number; deadline: string; accountId: number | null; entryIds: number[] };
const initialGoals: Goal[] = [];
export default function GoalsWorkspace({ entries, accounts }: { entries: Ledger[]; accounts: FinanceAccount[] }) {
  const [goals, setGoals, state] = usePersistedFinance<Goal[]>("goals", initialGoals);
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined);
  const [accountId, setAccountId] = useState("");
  const [chosen, setChosen] = useState<number[]>([]);
  const available = entries.filter(entry => entry.type === "Investimento" && settled(entry));
  const busy = state !== "salvo";
  function open(goal: Goal | null) { setEditing(goal); setAccountId(goal?.accountId == null ? "" : String(goal.accountId)); setChosen(goal?.entryIds || []); }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const target = Number(data.get("target"));
    if (!name || !Number.isFinite(target) || target <= 0) return;
    const goal: Goal = { id: editing?.id || crypto.randomUUID(), name, target, deadline: String(data.get("deadline") || ""), accountId: accountId ? Number(accountId) : null, entryIds: chosen };
    setGoals(list => editing ? list.map(item => item.id === goal.id ? goal : item) : [...list, goal]);
    setEditing(undefined);
  }
  return <div className="bank-page finance-workspace"><div className="bank-title"><div><span className="bank-kicker">METAS E RESERVAS</span><h2>Planos para o seu futuro</h2><p>Vincule investimentos realizados a uma meta para acompanhar seu progresso.</p></div><button className="primary" disabled={busy} onClick={() => open(null)}><Plus />Nova meta</button></div>
    <p role="status">{state === "erro" ? "Erro ao carregar ou salvar metas. Recarregue para conferir os dados." : state === "carregando" ? "Carregando metas…" : state === "salvando" ? "Salvando metas…" : "Metas salvas"}</p>
    {!goals.length && state === "salvo" && <div className="empty-cards"><Target /><b>Qual é a sua próxima conquista?</b><p>Crie uma meta com valor-alvo e prazo.</p></div>}
    {goals.map(goal => {
      const reserved = available.filter(entry => goal.entryIds.includes(entry.id)).reduce((sum,entry) => sum + Math.round(entry.value * 100),0) / 100;
      const percent = Math.min(100, reserved / goal.target * 100);
      return <section className="panel account-history" key={goal.id}><div className="panel-head"><div><h3>{goal.name}</h3><p>{goal.deadline ? `Prazo: ${goal.deadline.split("-").reverse().join("/")}` : "Sem prazo"} · {accounts.find(account => account.id === goal.accountId)?.name || "Sem conta vinculada"}</p></div><div className="goal-actions"><button aria-label={`Editar ${goal.name}`} disabled={busy} onClick={() => open(goal)}><Pencil /></button><button aria-label={`Excluir ${goal.name}`} disabled={busy} onClick={() => { if (window.confirm("Excluir esta meta? Os lançamentos serão preservados.")) setGoals(list => list.filter(item => item.id !== goal.id)); }}><Trash2 /></button></div></div><strong>{money(reserved)} de {money(goal.target)}</strong><GoalProgress percent={percent} name={goal.name} /><p>{Math.round(percent)}% atingido · {reserved >= goal.target ? "Meta concluída" : `Faltam ${money(goal.target - reserved)}`}</p></section>;
    })}
    {editing !== undefined && <div className="modal-bg"><form className="modal small" onSubmit={save}><ModalHead title={editing ? "Editar meta" : "Nova meta"} sub="Cada investimento pode pertencer a uma única meta." close={() => setEditing(undefined)} icon={<Target />} /><div className="form-grid"><label>Nome<input name="name" required defaultValue={editing?.name} /></label><label>Valor-alvo<input name="target" type="number" min="0.01" step="0.01" required defaultValue={editing?.target} /></label><label>Prazo<input name="deadline" type="date" defaultValue={editing?.deadline} /></label><label>Conta (opcional)<select value={accountId} onChange={event => { setAccountId(event.target.value); setChosen([]); }}><option value="">Todas as contas</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><fieldset className="goal-movements"><legend>Investimentos vinculados</legend><p>Registre os aportes em Lançamentos ou em Reservar / investir na visão geral.</p>{available.filter(entry => !accountId || accounts.some(account => account.id === Number(accountId) && belongsToAccount(entry,account))).map(entry => { const assigned = goals.some(goal => goal.id !== editing?.id && goal.entryIds.includes(entry.id)); return <label key={entry.id}><input type="checkbox" disabled={assigned} checked={chosen.includes(entry.id)} onChange={event => setChosen(list => event.target.checked ? [...list,entry.id] : list.filter(id => id !== entry.id))} />{entry.date.split("-").reverse().join("/")} · {entry.name} · {money(entry.value)}{assigned ? " (outra meta)" : ""}</label>; })}{!available.length && <p>Nenhum investimento confirmado disponível.</p>}</fieldset><div className="modal-foot"><button type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="primary" disabled={busy}>Salvar meta</button></div></form></div>}
  </div>;
}
