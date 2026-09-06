export type LedgerStatus =
  | "Recebido"
  | "A receber"
  | "Pago"
  | "A pagar"
  | "Confirmado"
  | "Previsto";

export type Ledger = {
  id: number;

  type:
    | "Receita"
    | "Despesa"
    | "Investimento";

  name: string;
  category: string;
  icon: string;
  date: string;
  value: number;
  account: string;

  frequency:
    | "Único"
    | "Mensal"
    | "Mensal até dezembro"
    | "Parcelado";

  installment?: string;
  remaining?: number;

  status: LedgerStatus;

  sourceType?:
    | "account"
    | "card"
    | "cash";

  sourceId?: number;
  seriesId?: number;
};

export type FinanceCard = {
  id: number;
  bank: string;
  logo: string;
  last4: string;
  closing: number;
  due: number;
  color: string;
  color2: string;
};

export type FinanceAccount = {
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

export type PlanItem = {
  ledgerId?: number;
  id: number;
  name: string;
  category: string;
  icon: string;
  date: string;
  value: number;

  kind:
    | "Fixo"
    | "Fatura"
    | "Parcela";

  detail?: string;
  active: boolean;
};
