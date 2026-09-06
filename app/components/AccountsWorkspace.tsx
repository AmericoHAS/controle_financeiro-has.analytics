"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Landmark, Plus, Check, Trash2 } from "lucide-react";
import type { FinanceAccount, Ledger } from "../../lib/finance-types";
import { belongsToAccount, money, settled } from "../../lib/finance-summary";
import ModalHead from "./ModalHead";

export default function AccountsWorkspace({ accounts, setAccounts, entries, saveState }: { accounts: FinanceAccount[]; setAccounts: Dispatch<SetStateAction<FinanceAccount[]>>; entries: Ledger[]; saveState: string }) {
  const [open, setOpen] = useState(false);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const bank = String(data.get("bank")).trim();
    const balance = Number(data.get("balance"));
    if (!name || !bank || !Number.isFinite(balance)) return;
    setAccounts(list => [...list, { id: Date.now(), name, bank, balance, type: String(data.get("type")) as FinanceAccount["type"] }]);
    setOpen(false);
  }
  return <div className="bank-page finance-workspace">
    <div className="bank-title"><div><span className="bank-kicker">CONTAS FINANCEIRAS</span><h2>Minhas contas</h2><p>Consulte os saldos e as movimentações. Edite os registros em Lançamentos.</p></div><button className="primary" disabled={saveState !== "salvo"} onClick={() => setOpen(true)}><Plus />Adicionar conta</button></div>
    <p role="status">{saveState === "erro" ? "Não foi possível carregar ou salvar as contas. Recarregue para conferir os dados." : saveState === "salvando" ? "Salvando contas…" : saveState === "carregando" ? "Carregando contas…" : "Contas salvas"}</p>
    {!accounts.length && <div className="empty-cards"><Landmark /><b>Nenhuma conta cadastrada</b></div>}
    {accounts.map(account => {
      const movements = entries.filter(entry => belongsToAccount(entry, account) && settled(entry)).sort((a,b) => b.date.localeCompare(a.date) || b.id-a.id);
      return <section className="panel account-history" key={account.id}><div className="panel-head"><div><h3>{account.name}</h3><p>{account.bank} · {account.type}</p></div><strong>Saldo cadastrado: {money(account.balance)}</strong></div>
        <p>Movimentações realizadas · todo o período</p>
        {movements.length ? <div className="finance-table-scroll"><table><thead><tr><th>Data</th><th>Movimento</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead><tbody>{movements.map(entry => <tr key={entry.id}><td>{entry.date.split("-").reverse().join("/")}</td><td>{entry.type === "Despesa" ? "Saída" : entry.type === "Investimento" ? "Entrada · reserva" : "Entrada"}</td><td>{entry.name}</td><td>{entry.category}</td><td className={entry.type === "Despesa" ? "red" : "green"}>{entry.type === "Despesa" ? "− " : "+ "}{money(entry.value)}</td></tr>)}</tbody></table></div> : <p>Nenhuma movimentação realizada nesta conta.</p>}
        <button className="delete-card" type="button" disabled={saveState !== "salvo"} onClick={() => { if (window.confirm(`Excluir a conta "${account.name}"? Os lançamentos serão preservados.`)) setAccounts(list => list.filter(item => item.id !== account.id)); }}><Trash2 />Excluir conta</button>
      </section>;
    })}
    {open && <div className="modal-bg"><form className="modal small" onSubmit={save}><ModalHead title="Nova conta" sub="Cadastre uma conta financeira." close={() => setOpen(false)} icon={<Landmark />} /><div className="form-grid"><label>Nome<input name="name" required /></label><label>Banco / instituição<input name="bank" required /></label><label>Tipo<select name="type">{["Corrente", "Poupança", "Dinheiro", "Investimento"].map(type => <option key={type}>{type}</option>)}</select></label><label>Saldo atual<input name="balance" type="number" step="0.01" defaultValue="0" required /></label></div><div className="modal-foot"><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={saveState !== "salvo"}><Check />Salvar conta</button></div></form></div>}
  </div>;
}
