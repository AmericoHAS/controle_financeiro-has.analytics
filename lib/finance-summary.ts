import type { FinanceAccount, Ledger } from "./finance-types";

export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const settled = (entry: Ledger) => entry.status === "Confirmado" || (entry.type === "Receita" && entry.status === "Recebido") || (entry.type === "Despesa" && entry.status === "Pago");
export function belongsToAccount(entry: Ledger, account: FinanceAccount) {
  if (entry.sourceType === "card") return false;
  if (entry.sourceId != null) return entry.sourceType === "account" && entry.sourceId === account.id;
  return entry.account === `${account.name} · ${account.bank}` || entry.account === account.name;
}
export function annualSummary(entries: Ledger[], year: number) {
  let accumulated = 0;
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const totals = { income: 0, expense: 0, reserve: 0 };
    for (const entry of entries) {
      if (!entry.date.startsWith(`${month}-`) || !settled(entry)) continue;
      const key = entry.type === "Receita" ? "income" : entry.type === "Despesa" ? "expense" : "reserve";
      totals[key] += Math.round(entry.value * 100);
    }
    const balance = totals.income - totals.expense - totals.reserve;
    accumulated += balance;
    return { month, income: totals.income / 100, expense: totals.expense / 100, reserve: totals.reserve / 100, balance: balance / 100, accumulated: accumulated / 100 };
  });
}
