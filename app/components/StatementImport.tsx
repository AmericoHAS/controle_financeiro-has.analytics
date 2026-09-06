"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import type { FinanceAccount, Ledger } from "../../lib/finance-types";
import { guessMapping, prepareRows, type Mapping } from "../../lib/statement-import";
import { money, belongsToAccount } from "../../lib/finance-summary";
import ModalHead from "./ModalHead";

export default function StatementImport({ accounts, entries, onImport, onClose }: { accounts: FinanceAccount[]; entries: Ledger[]; onImport: (rows: Ledger[]) => Promise<void>; onClose: () => void }) {
  const [sheets,setSheets] = useState<Record<string,unknown[][]>>({});
  const [sheet,setSheet] = useState("");
  const [header,setHeader] = useState(1);
  const [mapping,setMapping] = useState<Mapping>({ date: -1, name: -1, value: -1, type: -1, category: -1 });
  const [locale,setLocale] = useState<"br" | "en">("br");
  const [accountId,setAccountId] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [selected,setSelected] = useState<Set<number> | null>(null);
  const [confirmed,setConfirmed] = useState(false);
  const [previewPage,setPreviewPage] = useState(0);
  const rows = sheets[sheet] || [];
  const headers = rows[header-1] || [];
  const account = accounts.find(item => item.id === Number(accountId));
  const prepared = mapping.date >= 0 && mapping.name >= 0 && mapping.value >= 0 ? prepareRows(rows.slice(header),mapping,locale,header+1) : { valid: [], errors: [] };
  const signature = (entry: { date:string; name:string; value:number; type:string }) => `${entry.date}|${entry.name.trim().toLowerCase()}|${entry.value.toFixed(2)}|${entry.type}`;
  const seen = new Set(entries.filter(entry => account ? belongsToAccount(entry,account) : entry.account === "Extrato importado").map(signature));
  const preview = prepared.valid.map(entry => { const duplicate = seen.has(signature(entry)); seen.add(signature(entry)); return { ...entry, duplicate }; });
  const chosen = preview.filter(entry => selected == null ? !entry.duplicate : selected.has(entry.row));
  function resetReview() { setSelected(null); setConfirmed(false); setMessage(""); setPreviewPage(0); }
  async function load(file: File | undefined) {
    if (!file) return;
    setMessage(""); setSheets({}); setSheet(""); resetReview();
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setMessage("Escolha um arquivo CSV, XLSX ou XLS."); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage("O limite é 10 MB. Divida o extrato em arquivos menores."); return; }
    setBusy(true);
    try {
      const XLSX = await import("../../vendor/xlsx.mjs");
      const bytes = await file.arrayBuffer();
      let content: ArrayBuffer | string = bytes;
      if (/\.csv$/i.test(file.name)) { const decoded = new TextDecoder("utf-8").decode(bytes); content = decoded.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : decoded; }
      const book = XLSX.read(content,{ type: typeof content === "string" ? "string" : "array", raw: true, cellDates: true, sheetRows: 5002 });
      const loaded = Object.fromEntries(book.SheetNames.map(name => [name,XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name],{ header: 1, raw: true, defval: "", blankrows: true })]));
      if (!book.SheetNames.length) throw new Error("O arquivo não contém planilhas.");
      if (Object.values(loaded).some(data => data.length > 5001)) throw new Error("Limite de 5.000 linhas. Divida o arquivo para importar todas as movimentações.");
      const first = book.SheetNames[0]; setSheets(loaded); setSheet(first); setHeader(1); setMapping(guessMapping(loaded[first][0] || []));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ler o arquivo."); }
    finally { setBusy(false); }
  }
  async function commit() {
    if (busy || !confirmed || !chosen.length) return;
    setBusy(true);
    try {
      const ids = new Set(entries.map(entry => entry.id)); let next = entries.reduce((max,entry) => Math.max(max,entry.id),0) + 1;
      const imported: Ledger[] = chosen.map(entry => { while (ids.has(next)) next++; const id = next++; ids.add(id); return { id, date: entry.date, name: entry.name, value: entry.value, category: entry.category, type: entry.type, icon: entry.type === "Receita" ? "↗️" : "↘️", account: account ? `${account.name} · ${account.bank}` : "Extrato importado", sourceType: account ? "account" : "cash", sourceId: account?.id, frequency: "Único", status: entry.type === "Receita" ? "Recebido" : "Pago" }; });
      await onImport(imported); onClose();
    } catch { setMessage("Não foi possível salvar o extrato. Sua seleção foi mantida; tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="modal-bg"><div className="modal statement-modal finance-workspace"><ModalHead title="Importar extrato" sub="Selecione um arquivo do celular ou computador e confira antes de salvar." icon={<Upload />} close={() => { if (!busy) onClose(); }} /><div className="statement-body"><label className="statement-file">Arquivo CSV ou Excel<input type="file" accept=".csv,.xlsx,.xls" disabled={busy} onChange={event => void load(event.target.files?.[0])} /></label><p>Até 10 MB e 5.000 linhas. O arquivo é lido no seu aparelho.</p>
      {rows.length > 0 && <><div className="form-grid"><label>Planilha<select value={sheet} disabled={busy} onChange={event => { setSheet(event.target.value); setHeader(1); setMapping(guessMapping(sheets[event.target.value][0] || [])); resetReview(); }}>{Object.keys(sheets).map(name => <option key={name}>{name}</option>)}</select></label><label>Linha dos títulos<input type="number" min="1" max={rows.length} value={header} disabled={busy} onChange={event => { const value = Math.max(1,Math.min(rows.length,Number(event.target.value))); setHeader(value); setMapping(guessMapping(rows[value-1] || [])); resetReview(); }} /></label><label>Formato dos valores<select value={locale} disabled={busy} onChange={event => { setLocale(event.target.value as "br" | "en"); resetReview(); }}><option value="br">1.234,56 (brasileiro)</option><option value="en">1,234.56 (internacional)</option></select></label><label>Conta do extrato<select value={accountId} disabled={busy} onChange={event => { setAccountId(event.target.value); resetReview(); }}><option value="">Sem conta vinculada</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{([['date','Data'],['name','Descrição'],['value','Valor'],['type','Tipo (opcional)'],['category','Categoria (opcional)']] as const).map(([key,label]) => <label key={key}>{label}<select value={mapping[key]} disabled={busy} onChange={event => { setMapping({ ...mapping, [key]: Number(event.target.value) }); resetReview(); }}><option value={-1}>Selecionar coluna</option>{headers.map((value,index) => <option key={index} value={index}>{index+1}. {String(value || "Sem título")}</option>)}</select></label>)}</div><p>Sem coluna Tipo: valores negativos são despesas; positivos são receitas. Se o banco usa valores sempre positivos, selecione a coluna Tipo.</p>
      <h3>Confira os lançamentos</h3><p>{chosen.length} selecionado(s) · {preview.filter(row => row.duplicate).length} possível(is) repetido(s), desmarcados inicialmente</p><div className="statement-preview">{preview.slice(previewPage*50,(previewPage+1)*50).map(entry => <label className="statement-row" key={entry.row}><input type="checkbox" disabled={busy} checked={selected == null ? !entry.duplicate : selected.has(entry.row)} onChange={event => { const next = new Set(selected || preview.filter(row => !row.duplicate).map(row => row.row)); if (event.target.checked) next.add(entry.row); else next.delete(entry.row); setSelected(next); setConfirmed(false); }} /><span><strong>{entry.name}</strong><small>{entry.date.split("-").reverse().join("/")} · {entry.type}{entry.duplicate ? " · Possível repetido" : ""}</small></span><b>{money(entry.value)}</b></label>)}</div>{preview.length > 50 && <div className="preview-pagination"><button disabled={busy || previewPage === 0} onClick={() => setPreviewPage(value => value-1)}>Anterior</button><span>Página {previewPage+1} de {Math.ceil(preview.length/50)}</span><button disabled={busy || (previewPage+1)*50 >= preview.length} onClick={() => setPreviewPage(value => value+1)}>Próxima</button></div>}{prepared.errors.length > 0 && <details><summary>{prepared.errors.length} linha(s) inválida(s), que não serão importadas</summary>{prepared.errors.slice(0,30).map(error => <p key={error}>{error}</p>)}</details>}<label className="preference-option"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>Conferi os valores e tipos. Importar como receitas recebidas e despesas pagas. O saldo cadastrado da conta não será recalculado por este histórico.</span></label></>}
      <p role="status">{busy ? "Processando…" : message}</p></div><div className="modal-foot"><button disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={busy || !confirmed || !chosen.length} onClick={() => void commit()}>Importar {chosen.length || ""} lançamento(s)</button></div></div></div>;
}
