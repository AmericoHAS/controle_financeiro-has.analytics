export type ImportRow = { date: string; name: string; value: number; type: "Receita" | "Despesa"; category: string; row: number };
export type Mapping = { date: number; name: number; value: number; type: number; category: number };
export function parseAmount(input: unknown, locale: "br" | "en") {
  if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
  let value = String(input ?? "").trim().replace(/R\$|\$|\s/g, "");
  const negative = /^\(.*\)$/.test(value) || /D$/i.test(value);
  value = value.replace(/[()CD]$/gi, "").replace(/^\(/, "");
  value = locale === "br" ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  if (!/^[+-]?\d+(\.\d+)?$/.test(value)) return NaN;
  return negative ? -Math.abs(Number(value)) : Number(value);
}
export function parseStatementDate(input: unknown): string | null {
  if (input instanceof Date && Number.isFinite(input.getTime())) return `${input.getFullYear()}-${String(input.getMonth()+1).padStart(2,"0")}-${String(input.getDate()).padStart(2,"0")}`;
  if (typeof input === "number" && input > 0 && input < 2958466) return new Date(Date.UTC(1899,11,30) + Math.floor(input) * 86400000).toISOString().slice(0,10);
  const value = String(input ?? "").trim();
  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(value);
  if (!br && !iso) return null;
  let year = Number(br ? br[3] : iso![1]);
  if (year < 100) year += 2000;
  const month = Number(br ? br[2] : iso![2]), day = Number(br ? br[1] : iso![3]);
  const date = new Date(Date.UTC(year,month-1,day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0,10);
}
export const normalizeHeader = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export function guessMapping(headers: unknown[]): Mapping {
  const find = (names: string[]) => headers.findIndex(header => names.includes(normalizeHeader(header)));
  return { date: find(["data", "date", "data lancamento", "data de lancamento"]), name: find(["descricao", "description", "historico", "lancamento", "nome"]), value: find(["valor", "value", "amount", "valor (r$)"]), type: find(["tipo", "type", "natureza", "entrada/saida"]), category: find(["categoria", "category"]) };
}
export function prepareRows(rows: unknown[][], mapping: Mapping, locale: "br" | "en", firstRow = 2) {
  const valid: ImportRow[] = [], errors: string[] = [];
  rows.forEach((cells,index) => {
    if (cells.every(cell => cell == null || String(cell).trim() === "")) return;
    const row = firstRow + index, date = parseStatementDate(cells[mapping.date]);
    const name = String(cells[mapping.name] ?? "").trim();
    const amount = parseAmount(cells[mapping.value],locale);
    const kind = mapping.type >= 0 ? normalizeHeader(cells[mapping.type]) : "";
    const expense = ["despesa", "saida", "debito", "d", "debit"].includes(kind);
    const income = ["receita", "entrada", "credito", "c", "credit"].includes(kind);
    if (!date || !name || !Number.isFinite(amount) || amount === 0 || (kind && !expense && !income)) { errors.push(`Linha ${row}: confira data, descrição, valor ou tipo.`); return; }
    const type = expense ? "Despesa" : income ? "Receita" : amount < 0 ? "Despesa" : "Receita";
    valid.push({ row, date, name, type, value: Math.round(Math.abs(amount)*100)/100, category: String(cells[mapping.category] ?? "").trim() || (type === "Receita" ? "Outras receitas" : "Outras despesas") });
  });
  return { valid, errors };
}
