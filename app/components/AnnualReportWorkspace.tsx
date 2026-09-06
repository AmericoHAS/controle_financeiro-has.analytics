"use client";
import FinanceChart from "./FinanceChart";
import { useState } from "react";
import type { Ledger } from "../../lib/finance-types";
import { annualSummary, money } from "../../lib/finance-summary";

export default function AnnualReportWorkspace({ entries, selectedMonth }: { entries: Ledger[]; selectedMonth: string }) {
  const [year, setYear] = useState(Number(selectedMonth.slice(0, 4)));
  const rows = annualSummary(entries, year);
  const totals = rows.reduce((sum,row) => ({ income: sum.income + row.income, expense: sum.expense + row.expense, reserve: sum.reserve + row.reserve }), { income: 0, expense: 0, reserve: 0 });
  return <div className="bank-page finance-workspace"><div className="bank-title"><div><span className="bank-kicker">RELATÓRIO ANUAL</span><h2>Seu ano em números</h2><p>Receitas recebidas, despesas pagas e reservas confirmadas, pela data do lançamento.</p></div><label className="annual-year">Ano<input aria-label="Ano do relatório" type="number" min="1900" max="9999" value={year} onChange={event => { const value = Number(event.target.value); if (value >= 1900 && value <= 9999) setYear(value); }} /></label></div>
    <FinanceChart title="Receitas, despesas e reservas" description="Barras para os valores realizados e linha para o saldo de cada mês." annual rows={rows.map((row,index) => ({ ...row, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year,index,1)).replace(".", "") }))} />
    <section className="panel account-history"><p className="mobile-table-hint">Deslize a tabela para ver todos os valores →</p><div className="finance-table-scroll"><table><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Reservas</th><th>Saldo</th><th>Acumulado</th></tr></thead><tbody>{rows.map((row,index) => <tr key={row.month}><th>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year,index,1))}</th><td>{money(row.income)}</td><td>{money(row.expense)}</td><td>{money(row.reserve)}</td><td>{money(row.balance)}</td><td>{money(row.accumulated)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{money(totals.income)}</td><td>{money(totals.expense)}</td><td>{money(totals.reserve)}</td><td>{money(rows[11].accumulated)}</td><td>{money(rows[11].accumulated)}</td></tr></tfoot></table></div><p>Saldo = receitas − despesas − reservas. O acumulado começa em zero no início do ano e não inclui os saldos cadastrados das contas. Reservas correspondem aos lançamentos de investimento.</p></section>
  </div>;
}
