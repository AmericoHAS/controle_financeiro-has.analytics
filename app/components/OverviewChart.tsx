"use client";
import type { Ledger } from "../../lib/finance-types";
import { settled } from "../../lib/finance-summary";
import FinanceChart from "./FinanceChart";
export default function OverviewChart({ entries, month }: { entries: Ledger[]; month: string }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year,monthNumber,0).getDate();
  const periods = Array.from({ length: Math.ceil(days/7) }, (_,index) => {
    const from = index * 7 + 1, to = Math.min(days,from + 6);
    const records = entries.filter(entry => entry.date.startsWith(`${month}-`) && settled(entry) && Number(entry.date.slice(8,10)) >= from && Number(entry.date.slice(8,10)) <= to);
    const sum = (type: Ledger["type"]) => records.filter(entry => entry.type === type).reduce((total,entry) => total + entry.value,0);
    const income = sum("Receita"), expense = sum("Despesa");
    return { label: `${from}–${to}`, income, expense, balance: income - expense - sum("Investimento") };
  });
  const rows = periods.map((period,index) => ({ ...period, balance: periods.slice(0,index+1).reduce((total,row) => total + row.balance,0) }));
  return <FinanceChart title="Como o mês está evoluindo" description="Entradas e saídas realizadas por período. A linha mostra o saldo acumulado após as reservas." rows={rows} />;
}
