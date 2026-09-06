"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  ClipboardPaste,
  CreditCard,
  Landmark,
  Upload,
} from "lucide-react";

import type {
  FinanceAccount,
  FinanceCard,
  Ledger,
} from "../../lib/finance-types";

import {
  guessMapping,
  prepareRows,
  type Mapping,
} from "../../lib/statement-import";

import {
  belongsToAccount,
  money,
} from "../../lib/finance-summary";

import ModalHead from "./ModalHead";

type InputMode =
  | "file"
  | "paste";

type StatementKind =
  | "account"
  | "card";

type ReviewType =
  | "Receita"
  | "Despesa"
  | "Ignorar";

type RowOverride = {
  name?: string;
  type?: ReviewType;
  category?: string;
};

type PastedRow = {
  row: number;
  date: string;
  name: string;
  value: number;
  signedValue: number;
  category: string;
  type:
    | "Receita"
    | "Despesa";
};

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function parseMoney(
  value: unknown,
  locale:
    | "br"
    | "en" = "br"
) {
  if (
    typeof value ===
    "number"
  ) {
    return value;
  }

  let text =
    String(
      value ?? ""
    )
      .trim()
      .replace(
        /R\$/gi,
        ""
      )
      .replace(
        /\s+/g,
        ""
      );

  if (!text) {
    return 0;
  }

  let negative =
    text.startsWith(
      "-"
    );

  /*
    Alguns PDFs copiam valores negativos
    entre parênteses.
  */
  if (
    text.startsWith(
      "("
    ) &&
    text.endsWith(
      ")"
    )
  ) {
    negative =
      true;

    text =
      text.slice(
        1,
        -1
      );
  }

  text =
    text.replace(
      /^[-+]/,
      ""
    );

  if (
    locale ===
    "br"
  ) {
    text =
      text
        .replace(
          /\./g,
          ""
        )
        .replace(
          ",",
          "."
        );
  } else {
    text =
      text.replace(
        /,/g,
        ""
      );
  }

  const parsed =
    Number(text);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return negative
    ? -Math.abs(
        parsed
      )
    : parsed;
}

function parsePastedDate(
  rawDate: string
) {
  const cleaned =
    rawDate
      .trim()
      .replace(
        /\./g,
        "/"
      )
      .replace(
        /-/g,
        "/"
      );

  const parts =
    cleaned
      .split("/")
      .map(
        Number
      );

  if (
    parts.length <
    2
  ) {
    return "";
  }

  const day =
    parts[0];

  const month =
    parts[1];

  let year =
    parts[2];

  if (!year) {
    year =
      new Date()
        .getFullYear();
  }

  if (
    year <
    100
  ) {
    year += 2000;
  }

  if (
    !day ||
    !month ||
    !year ||
    month > 12 ||
    day > 31
  ) {
    return "";
  }

  return `${year}-${String(
    month
  ).padStart(
    2,
    "0"
  )}-${String(
    day
  ).padStart(
    2,
    "0"
  )}`;
}

function guessCategory(
  name: string,
  type: ReviewType
) {
  if (
    type ===
    "Receita"
  ) {
    return "Outras receitas";
  }

  if (
    type ===
    "Ignorar"
  ) {
    return "";
  }

  const text =
    normalizeText(
      name
    );

  if (
    text.includes(
      "iof"
    )
  ) {
    return "Impostos";
  }

  if (
    text.includes(
      "ifood"
    ) ||
    text.includes(
      "restaurante"
    ) ||
    text.includes(
      "lanch"
    ) ||
    text.includes(
      "food"
    )
  ) {
    return "Alimentação";
  }

  if (
    text.includes(
      "openai"
    ) ||
    text.includes(
      "chatgpt"
    ) ||
    text.includes(
      "apple.com"
    ) ||
    text.includes(
      "netflix"
    ) ||
    text.includes(
      "spotify"
    ) ||
    text.includes(
      "wellhub"
    ) ||
    text.includes(
      "google"
    )
  ) {
    return "Assinaturas";
  }

  if (
    text.includes(
      "posto"
    ) ||
    text.includes(
      "combust"
    )
  ) {
    return "Combustível";
  }

  if (
    text.includes(
      "uber"
    ) ||
    text.includes(
      "99app"
    ) ||
    text.includes(
      "99 "
    )
  ) {
    return "Transporte";
  }

  if (
    text.includes(
      "mercado"
    ) ||
    text.includes(
      "supermercado"
    )
  ) {
    return "Mercado";
  }

  if (
    text.includes(
      "farmacia"
    ) ||
    text.includes(
      "drogaria"
    )
  ) {
    return "Saúde";
  }

  return "Compras";
}

function detectInstallment(
  name: string
) {
  const match =
    name.match(
      /(?:parcela\s*)?(\d+)\s*\/\s*(\d+)/i
    );

  if (!match) {
    return null;
  }

  const current =
    Number(
      match[1]
    );

  const total =
    Number(
      match[2]
    );

  if (
    !current ||
    !total ||
    current >
      total
  ) {
    return null;
  }

  return {
    installment:
      `${current}/${total}`,

    remaining:
      Math.max(
        0,
        total -
          current
      ),
  };
}

/*
  Converte a data da compra na competência
  da fatura considerando o fechamento.

  Exemplo:
  fechamento dia 20

  compra 13/08 -> fatura 09/2026
  compra 25/08 -> fatura 10/2026
*/
function getCardStatementDate(
  purchaseDate: string,
  closingDay: number
) {
  const [
    year,
    month,
    day,
  ] =
    purchaseDate
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return purchaseDate;
  }

  let statementYear =
    year;

  let statementMonth =
    month;

  /*
    Se a compra ocorreu até o fechamento,
    permanece na fatura do mesmo mês.

    Se ocorreu após o fechamento,
    vai para a fatura do mês seguinte.
  */
  if (
    day >
    closingDay
  ) {
    statementMonth +=
      1;
  }

  if (
    statementMonth >
    12
  ) {
    statementMonth =
      1;

    statementYear +=
      1;
  }

  return `${statementYear}-${String(
    statementMonth
  ).padStart(
    2,
    "0"
  )}-01`;
}

function monthLabel(
  date: string
) {
  const [
    year,
    month,
  ] =
    date
      .split("-")
      .map(
        Number
      );

  if (
    !year ||
    !month
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      month:
        "long",
      year:
        "numeric",
    }
  ).format(
    new Date(
      year,
      month -
        1,
      1
    )
  );
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function StatementImport({
  accounts,
  cards,
  entries,
  onImport,
  onClose,
}: {
  accounts: FinanceAccount[];
  cards: FinanceCard[];
  entries: Ledger[];
  onImport: (
    rows: Ledger[]
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [
    inputMode,
    setInputMode,
  ] =
    useState<InputMode>(
      "file"
    );

  const [
    pastedText,
    setPastedText,
  ] =
    useState("");

  const [
    pastedRows,
    setPastedRows,
  ] =
    useState<
      PastedRow[]
    >([]);

  const [
    sheets,
    setSheets,
  ] =
    useState<
      Record<
        string,
        unknown[][]
      >
    >({});

  const [
    sheet,
    setSheet,
  ] =
    useState("");

  const [
    header,
    setHeader,
  ] =
    useState(1);

  const [
    mapping,
    setMapping,
  ] =
    useState<Mapping>({
      date: -1,
      name: -1,
      value: -1,
      type: -1,
      category: -1,
    });

  const [
    locale,
    setLocale,
  ] =
    useState<
      "br" | "en"
    >("br");

  const [
    statementKind,
    setStatementKind,
  ] =
    useState<StatementKind>(
      "account"
    );

  const [
    accountId,
    setAccountId,
  ] =
    useState("");

  const [
    cardId,
    setCardId,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    selected,
    setSelected,
  ] =
    useState<
      Set<number> | null
    >(null);

  const [
    confirmed,
    setConfirmed,
  ] =
    useState(false);

  const [
    previewPage,
    setPreviewPage,
  ] =
    useState(0);

  const [
    overrides,
    setOverrides,
  ] =
    useState<
      Record<
        number,
        RowOverride
      >
    >({});

  const rows =
    sheets[
      sheet
    ] || [];

  const headers =
    rows[
      header -
        1
    ] || [];

  const account =
    accounts.find(
      item =>
        item.id ===
        Number(
          accountId
        )
    );

  const card =
    cards.find(
      item =>
        item.id ===
        Number(
          cardId
        )
    );

  const prepared =
    inputMode ===
    "paste"
      ? {
          valid:
            pastedRows,
          errors:
            [] as string[],
        }
      : mapping.date >=
          0 &&
        mapping.name >=
          0 &&
        mapping.value >=
          0
      ? prepareRows(
          rows.slice(
            header
          ),
          mapping,
          locale,
          header +
            1
        )
      : {
          valid: [],
          errors:
            [] as string[],
        };

  /* =======================================================
     RESET
     ======================================================= */

  function resetReview() {
    setSelected(
      null
    );

    setConfirmed(
      false
    );

    setPreviewPage(
      0
    );

    setOverrides(
      {}
    );

    setMessage(
      ""
    );
  }

  /* =======================================================
     VALOR ORIGINAL COM SINAL
     ======================================================= */

  function signedValueForRow(
    rowNumber: number
  ) {
    if (
      inputMode ===
      "paste"
    ) {
      return (
        pastedRows.find(
          item =>
            item.row ===
            rowNumber
        )?.signedValue ??
        0
      );
    }

    const sourceRow =
      rows[
        rowNumber -
          1
      ];

    if (
      !sourceRow ||
      mapping.value <
        0
    ) {
      return 0;
    }

    return parseMoney(
      sourceRow[
        mapping.value
      ],
      locale
    );
  }

  /* =======================================================
     CLASSIFICAÇÃO
     ======================================================= */

  function defaultType(
    entry: {
      row: number;
      name: string;
      type:
        | "Receita"
        | "Despesa";
    }
  ): ReviewType {
    const text =
      normalizeText(
        entry.name
      );

    const signedValue =
      signedValueForRow(
        entry.row
      );

    /*
      CARTÃO DE CRÉDITO
    */
    if (
      statementKind ===
      "card"
    ) {
      if (
        text.includes(
          "pagamento recebido"
        ) ||
        text.includes(
          "pagamento de fatura"
        ) ||
        text.includes(
          "pagamento fatura"
        ) ||
        text.includes(
          "credito de pagamento"
        )
      ) {
        return "Ignorar";
      }

      /*
        Em faturas como Nubank,
        valores negativos representam
        pagamento/crédito.
      */
      if (
        signedValue <
        0
      ) {
        return "Ignorar";
      }

      return "Despesa";
    }

    /*
      CONTA BANCÁRIA
    */
    return signedValue <
      0
      ? "Despesa"
      : "Receita";
  }

  /* =======================================================
     TEXTO COLADO
     ======================================================= */

  function processPastedStatement() {
    setMessage("");

    setConfirmed(
      false
    );

    setSelected(
      null
    );

    setPreviewPage(
      0
    );

    setOverrides(
      {}
    );

    const lines =
      pastedText
        .split(
          /\r?\n/
        )
        .map(
          line =>
            line
              .replace(
                /\s+/g,
                " "
              )
              .trim()
        )
        .filter(
          Boolean
        );

    const parsed:
      PastedRow[] =
      [];

    lines.forEach(
      (
        line,
        index
      ) => {
        /*
          Formatos aceitos:

          13/08 Apple.Com/Bill 66,90

          13/08/2026 Apple.Com/Bill R$ 66,90

          13-08 OpenAI ChatGPT -106,65
        */
        const match =
          line.match(
            /^(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)\s+(.+?)\s+(-?\s*(?:R\$\s*)?[\d.]+,\d{2})$/i
          );

        if (
          !match
        ) {
          return;
        }

        const rawDate =
          match[1];

        const rawName =
          match[2];

        const rawValue =
          match[3];

        const date =
          parsePastedDate(
            rawDate
          );

        const signedValue =
          parseMoney(
            rawValue,
            "br"
          );

        if (
          !date ||
          !Number.isFinite(
            signedValue
          )
        ) {
          return;
        }

        parsed.push({
          row:
            index +
            1,

          date,

          name:
            rawName.trim(),

          value:
            Math.abs(
              signedValue
            ),

          signedValue,

          category:
            "",

          type:
            signedValue <
            0
              ? "Despesa"
              : "Receita",
        });
      }
    );

    if (
      !parsed.length
    ) {
      setPastedRows(
        []
      );

      setMessage(
        "Não consegui identificar lançamentos. Use linhas com data, descrição e valor."
      );

      return;
    }

    setPastedRows(
      parsed
    );

    setMessage(
      `${parsed.length} lançamento(s) identificado(s). Confira a revisão antes de importar.`
    );
  }

  /* =======================================================
     LINHAS PARA REVISÃO
     ======================================================= */

  const reviewRows =
    useMemo(
      () =>
        prepared.valid.map(
          entry => {
            const override =
              overrides[
                entry.row
              ] ||
              {};

            const type =
              override.type ??
              defaultType(
                entry
              );

            const name =
              override.name ??
              entry.name;

            const category =
              override.category ??
              (
                entry.category ||
                guessCategory(
                  name,
                  type
                )
              );

            return {
              ...entry,

              value:
                Math.abs(
                  Number(
                    entry.value
                  )
                ),

              name,

              type,

              category,
            };
          }
        ),
      [
        prepared.valid,
        overrides,
        statementKind,
        inputMode,
        pastedRows,
        rows,
        mapping.value,
        locale,
      ]
    );

  /* =======================================================
     DATA EFETIVA
     ======================================================= */

  function effectiveDate(
    entry: {
      date: string;
    }
  ) {
    if (
      statementKind ===
        "card" &&
      card
    ) {
      return getCardStatementDate(
        entry.date,
        Number(
          card.closing ||
            1
        )
      );
    }

    return entry.date;
  }

  /* =======================================================
     DUPLICIDADES
     ======================================================= */

  function signature(
    entry: {
      date: string;
      name: string;
      value: number;
      type: string;
    }
  ) {
    return `${entry.date}|${entry.name
      .trim()
      .toLowerCase()}|${Number(
      entry.value
    ).toFixed(
      2
    )}|${entry.type}`;
  }

  const existingEntries =
    entries.filter(
      entry => {
        if (
          statementKind ===
            "account" &&
          account
        ) {
          return belongsToAccount(
            entry,
            account
          );
        }

        if (
          statementKind ===
            "card" &&
          card
        ) {
          return (
            entry.sourceType ===
              "card" &&
            entry.sourceId ===
              card.id
          );
        }

        return false;
      }
    );

  const seen =
    new Set(
      existingEntries.map(
        entry =>
          signature({
            date:
              entry.date,

            name:
              entry.name,

            value:
              entry.value,

            type:
              entry.type,
          })
      )
    );

  const preview =
    reviewRows.map(
      entry => {
        const date =
          effectiveDate(
            entry
          );

        const comparable =
          {
            date,

            name:
              entry.name,

            value:
              entry.value,

            type:
              entry.type,
          };

        const duplicate =
          entry.type !==
            "Ignorar" &&
          seen.has(
            signature(
              comparable
            )
          );

        if (
          entry.type !==
          "Ignorar"
        ) {
          seen.add(
            signature(
              comparable
            )
          );
        }

        return {
          ...entry,
          effectiveDate:
            date,
          duplicate,
        };
      }
    );

  function isSelected(
    entry: (
      typeof preview
    )[number]
  ) {
    if (
      entry.type ===
      "Ignorar"
    ) {
      return false;
    }

    if (
      selected ===
      null
    ) {
      return !entry.duplicate;
    }

    return selected.has(
      entry.row
    );
  }

  const chosen =
    preview.filter(
      entry =>
        entry.type !==
          "Ignorar" &&
        isSelected(
          entry
        )
    );

  /* =======================================================
     EDITAR LINHA
     ======================================================= */

  function updateRow(
    row: number,
    update: RowOverride
  ) {
    setOverrides(
      current => ({
        ...current,

        [row]: {
          ...current[
            row
          ],

          ...update,
        },
      })
    );

    setConfirmed(
      false
    );
  }

  /* =======================================================
     ARQUIVO
     ======================================================= */

  async function load(
    file:
      | File
      | undefined
  ) {
    if (!file) {
      return;
    }

    setMessage("");

    setSheets({});

    setSheet("");

    resetReview();

    if (
      !/\.(csv|xlsx|xls)$/i.test(
        file.name
      )
    ) {
      setMessage(
        "Escolha um arquivo CSV, XLSX ou XLS."
      );

      return;
    }

    if (
      file.size >
      10 *
        1024 *
        1024
    ) {
      setMessage(
        "O limite é 10 MB. Divida o extrato em arquivos menores."
      );

      return;
    }

    setBusy(
      true
    );

    try {
      const XLSX =
        await import(
          "../../vendor/xlsx.mjs"
        );

      const bytes =
        await file.arrayBuffer();

      let content:
        | ArrayBuffer
        | string =
        bytes;

      if (
        /\.csv$/i.test(
          file.name
        )
      ) {
        const decoded =
          new TextDecoder(
            "utf-8"
          ).decode(
            bytes
          );

        content =
          decoded.includes(
            "�"
          )
            ? new TextDecoder(
                "windows-1252"
              ).decode(
                bytes
              )
            : decoded;
      }

      const book =
        XLSX.read(
          content,
          {
            type:
              typeof content ===
              "string"
                ? "string"
                : "array",

            raw:
              true,

            cellDates:
              true,

            sheetRows:
              5002,
          }
        );

      if (
        !book
          .SheetNames
          .length
      ) {
        throw new Error(
          "O arquivo não contém planilhas."
        );
      }

      const loaded =
        Object.fromEntries(
          book.SheetNames.map(
            name => [
              name,

              XLSX.utils.sheet_to_json<
                unknown[]
              >(
                book.Sheets[
                  name
                ],
                {
                  header:
                    1,

                  raw:
                    true,

                  defval:
                    "",

                  blankrows:
                    true,
                }
              ),
            ]
          )
        ) as Record<
          string,
          unknown[][]
        >;

      if (
        Object.values(
          loaded
        ).some(
          data =>
            data.length >
            5001
        )
      ) {
        throw new Error(
          "Limite de 5.000 linhas. Divida o arquivo para importar todas as movimentações."
        );
      }

      const first =
        book
          .SheetNames[0];

      setSheets(
        loaded
      );

      setSheet(
        first
      );

      setHeader(
        1
      );

      setMapping(
        guessMapping(
          loaded[
            first
          ]?.[0] ||
            []
        )
      );
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível ler o arquivo."
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  /* =======================================================
     IMPORTAR
     ======================================================= */

  async function commit() {
    if (
      busy ||
      !confirmed ||
      !chosen.length
    ) {
      return;
    }

    if (
      statementKind ===
        "account" &&
      !account
    ) {
      setMessage(
        "Selecione a conta correspondente ao extrato."
      );

      return;
    }

    if (
      statementKind ===
        "card" &&
      !card
    ) {
      setMessage(
        "Selecione o cartão correspondente à fatura."
      );

      return;
    }

    setBusy(
      true
    );

    try {
      const ids =
        new Set(
          entries.map(
            entry =>
              entry.id
          )
        );

      let next =
        entries.reduce(
          (
            max,
            entry
          ) =>
            Math.max(
              max,
              entry.id
            ),
          0
        ) +
        1;

      const imported:
        Ledger[] =
        chosen.map(
          entry => {
            while (
              ids.has(
                next
              )
            ) {
              next++;
            }

            const id =
              next++;

            ids.add(
              id
            );

            const installment =
              detectInstallment(
                entry.name
              );

            const isCard =
              statementKind ===
              "card";

            return {
              id,

              date:
                entry.effectiveDate,

              name:
                entry.name,

              value:
                Math.abs(
                  entry.value
                ),

              category:
                entry.category,

              type:
                entry.type as
                  | "Receita"
                  | "Despesa",

              icon:
                entry.type ===
                "Receita"
                  ? "↗️"
                  : "↘️",

              account:
                isCard &&
                card
                  ? `${card.bank} • ${card.last4}`
                  : account
                  ? `${account.name} · ${account.bank}`
                  : "Extrato importado",

              sourceType:
                isCard
                  ? "card"
                  : account
                  ? "account"
                  : "cash",

              sourceId:
                isCard
                  ? card?.id
                  : account?.id,

              frequency:
                installment
                  ? "Parcelado"
                  : "Único",

              installment:
                installment
                  ?.installment,

              remaining:
                installment
                  ?.remaining,

              status:
                isCard
                  ? "A pagar"
                  : entry.type ===
                    "Receita"
                  ? "Recebido"
                  : "Pago",
            };
          }
        );

      await onImport(
        imported
      );

      onClose();
    } catch {
      setMessage(
        "Não foi possível salvar o extrato. Sua seleção foi mantida; tente novamente."
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  const hasContent =
    inputMode ===
    "file"
      ? rows.length >
        0
      : pastedRows.length >
        0;

  const rawPreviewRows =
    rows.slice(
      header,
      header +
        6
    );

  /* =======================================================
     JSX
     ======================================================= */

  return (
    <div className="modal-bg">
      <div className="modal statement-modal finance-workspace">
        <ModalHead
          title="Importar extrato"
          sub="Configure, confira e ajuste os lançamentos antes de salvar."
          icon={
            <Upload />
          }
          close={() => {
            if (
              !busy
            ) {
              onClose();
            }
          }}
        />

        <div className="statement-body">

          {/* ===============================================
              MODO DE ENTRADA
              =============================================== */}

          <div className="statement-input-mode">
            <button
              type="button"
              className={
                inputMode ===
                "file"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setInputMode(
                  "file"
                );

                resetReview();
              }}
            >
              <Upload />
              CSV / Excel
            </button>

            <button
              type="button"
              className={
                inputMode ===
                "paste"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setInputMode(
                  "paste"
                );

                resetReview();
              }}
            >
              <ClipboardPaste />
              Colar fatura
            </button>
          </div>

          {/* ===============================================
              ARQUIVO
              =============================================== */}

          {inputMode ===
            "file" && (
            <>
              <label className="statement-file">
                Arquivo CSV ou Excel

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  disabled={
                    busy
                  }
                  onChange={
                    event =>
                      void load(
                        event
                          .target
                          .files?.[0]
                      )
                  }
                />
              </label>

              <p>
                Até 10 MB e 5.000 linhas. O arquivo é processado no seu aparelho.
              </p>
            </>
          )}

          {/* ===============================================
              COLAR FATURA
              =============================================== */}

          {inputMode ===
            "paste" && (
            <div className="statement-paste">
              <label>
                Cole os lançamentos da fatura

                <textarea
                  value={
                    pastedText
                  }
                  onChange={
                    event =>
                      setPastedText(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder={`Exemplo:

13/08 Apple.Com/Bill 66,90
13/08 IFD*Ifood Club 7,95
05/08 Jim.Com Wellington H - Parcela 4/5 197,37
04/09 Pagamento recebido -978,43`}
                />
              </label>

              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  !pastedText.trim()
                }
                onClick={
                  processPastedStatement
                }
              >
                Interpretar lançamentos
              </button>
            </div>
          )}

          {/* ===============================================
              CONFIGURAÇÃO
              =============================================== */}

          {hasContent && (
            <>
              <h3>
                Tipo de extrato
              </h3>

              <div className="statement-kind">
                <button
                  type="button"
                  className={
                    statementKind ===
                    "account"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatementKind(
                      "account"
                    );

                    resetReview();
                  }}
                >
                  <Landmark />

                  <span>
                    <b>
                      Conta bancária
                    </b>

                    <small>
                      Pix, transferências, débito e movimentações da conta
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    statementKind ===
                    "card"
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setStatementKind(
                      "card"
                    );

                    resetReview();
                  }}
                >
                  <CreditCard />

                  <span>
                    <b>
                      Cartão de crédito
                    </b>

                    <small>
                      Compras e lançamentos da fatura
                    </small>
                  </span>
                </button>
              </div>

              {/* ===========================================
                  CONTA / CARTÃO
                  =========================================== */}

              <div className="form-grid">
                {statementKind ===
                "account" ? (
                  <label>
                    Conta do extrato

                    <select
                      value={
                        accountId
                      }
                      disabled={
                        busy
                      }
                      onChange={
                        event => {
                          setAccountId(
                            event
                              .target
                              .value
                          );

                          resetReview();
                        }
                      }
                    >
                      <option value="">
                        Selecione a conta
                      </option>

                      {accounts.map(
                        item => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {item.name}
                            {" · "}
                            {item.bank}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                ) : (
                  <label>
                    Cartão da fatura

                    <select
                      value={
                        cardId
                      }
                      disabled={
                        busy
                      }
                      onChange={
                        event => {
                          setCardId(
                            event
                              .target
                              .value
                          );

                          resetReview();
                        }
                      }
                    >
                      <option value="">
                        Selecione o cartão
                      </option>

                      {cards.map(
                        item => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {item.bank}
                            {" • "}
                            {item.last4}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}
              </div>

              {/* ===========================================
                  MAPEAMENTO — APENAS ARQUIVO
                  =========================================== */}

              {inputMode ===
                "file" && (
                <div className="form-grid">
                  <label>
                    Planilha

                    <select
                      value={
                        sheet
                      }
                      disabled={
                        busy
                      }
                      onChange={
                        event => {
                          const value =
                            event
                              .target
                              .value;

                          setSheet(
                            value
                          );

                          setHeader(
                            1
                          );

                          setMapping(
                            guessMapping(
                              sheets[
                                value
                              ]?.[0] ||
                                []
                            )
                          );

                          resetReview();
                        }
                      }
                    >
                      {Object.keys(
                        sheets
                      ).map(
                        name => (
                          <option
                            key={
                              name
                            }
                            value={
                              name
                            }
                          >
                            {name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    Linha dos títulos

                    <input
                      type="number"
                      min="1"
                      max={
                        rows.length
                      }
                      value={
                        header
                      }
                      disabled={
                        busy
                      }
                      onChange={
                        event => {
                          const value =
                            Math.max(
                              1,
                              Math.min(
                                rows.length,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            );

                          setHeader(
                            value
                          );

                          setMapping(
                            guessMapping(
                              rows[
                                value -
                                  1
                              ] ||
                                []
                            )
                          );

                          resetReview();
                        }
                      }
                    />
                  </label>

                  <label>
                    Formato dos valores

                    <select
                      value={
                        locale
                      }
                      disabled={
                        busy
                      }
                      onChange={
                        event => {
                          setLocale(
                            event
                              .target
                              .value as
                              | "br"
                              | "en"
                          );

                          resetReview();
                        }
                      }
                    >
                      <option value="br">
                        1.234,56 (brasileiro)
                      </option>

                      <option value="en">
                        1,234.56 (internacional)
                      </option>
                    </select>
                  </label>

                  {(
                    [
                      [
                        "date",
                        "Data",
                      ],

                      [
                        "name",
                        "Descrição",
                      ],

                      [
                        "value",
                        "Valor",
                      ],

                      [
                        "type",
                        "Tipo (opcional)",
                      ],

                      [
                        "category",
                        "Categoria (opcional)",
                      ],
                    ] as const
                  ).map(
                    ([
                      key,
                      label,
                    ]) => (
                      <label
                        key={
                          key
                        }
                      >
                        {label}

                        <select
                          value={
                            mapping[
                              key
                            ]
                          }
                          disabled={
                            busy
                          }
                          onChange={
                            event => {
                              setMapping({
                                ...mapping,

                                [key]:
                                  Number(
                                    event
                                      .target
                                      .value
                                  ),
                              });

                              resetReview();
                            }
                          }
                        >
                          <option
                            value={
                              -1
                            }
                          >
                            Selecionar coluna
                          </option>

                          {headers.map(
                            (
                              value,
                              index
                            ) => (
                              <option
                                key={
                                  index
                                }
                                value={
                                  index
                                }
                              >
                                {index +
                                  1}
                                .{" "}
                                {String(
                                  value ||
                                    "Sem título"
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    )
                  )}
                </div>
              )}

              {/* ===========================================
                  INFORMAÇÃO
                  =========================================== */}

              <div className="statement-help">
                {statementKind ===
                "card" ? (
                  <>
                    <b>
                      Cartão de crédito
                    </b>

                    <span>
                      Compras serão atribuídas à fatura conforme o dia de
                      fechamento cadastrado no cartão. Pagamentos da fatura e
                      créditos negativos são ignorados inicialmente.
                    </span>
                  </>
                ) : (
                  <>
                    <b>
                      Conta bancária
                    </b>

                    <span>
                      Valores negativos são tratados como despesas e valores
                      positivos como receitas.
                    </span>
                  </>
                )}
              </div>

              {/* ===========================================
                  PRÉ-VISUALIZAÇÃO BRUTA
                  =========================================== */}

              {inputMode ===
                "file" && (
                <>
                  <h3>
                    Pré-visualização do arquivo
                  </h3>

                  <p>
                    Confira se as colunas selecionadas correspondem às informações
                    corretas.
                  </p>

                  <div className="statement-raw-preview">
                    <table>
                      <thead>
                        <tr>
                          {headers.map(
                            (
                              value,
                              index
                            ) => (
                              <th
                                key={
                                  index
                                }
                              >
                                {String(
                                  value ||
                                    `Coluna ${index + 1}`
                                )}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {rawPreviewRows.map(
                          (
                            rawRow,
                            rowIndex
                          ) => (
                            <tr
                              key={
                                rowIndex
                              }
                            >
                              {headers.map(
                                (
                                  _,
                                  columnIndex
                                ) => (
                                  <td
                                    key={
                                      columnIndex
                                    }
                                  >
                                    {String(
                                      rawRow[
                                        columnIndex
                                      ] ??
                                        ""
                                    )}
                                  </td>
                                )
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ===========================================
                  REVISÃO
                  =========================================== */}

              <h3>
                Revisar importação
              </h3>

              <p>
                {chosen.length} selecionado(s)
                {" · "}
                {
                  preview.filter(
                    row =>
                      row.duplicate
                  ).length
                }{" "}
                possível(is) repetido(s)
                {" · "}
                {
                  preview.filter(
                    row =>
                      row.type ===
                      "Ignorar"
                  ).length
                }{" "}
                ignorado(s)
              </p>

              <div className="statement-review">
                {preview
                  .slice(
                    previewPage *
                      50,
                    (
                      previewPage +
                      1
                    ) *
                      50
                  )
                  .map(
                    entry => (
                      <article
                        className={`statement-review-row ${
                          entry.type ===
                          "Ignorar"
                            ? "ignored"
                            : ""
                        }`}
                        key={
                          entry.row
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={
                            busy ||
                            entry.type ===
                              "Ignorar"
                          }
                          checked={
                            isSelected(
                              entry
                            )
                          }
                          onChange={
                            event => {
                              const next =
                                new Set(
                                  selected ||
                                    preview
                                      .filter(
                                        row =>
                                          !row.duplicate &&
                                          row.type !==
                                            "Ignorar"
                                      )
                                      .map(
                                        row =>
                                          row.row
                                      )
                                );

                              if (
                                event
                                  .target
                                  .checked
                              ) {
                                next.add(
                                  entry.row
                                );
                              } else {
                                next.delete(
                                  entry.row
                                );
                              }

                              setSelected(
                                next
                              );

                              setConfirmed(
                                false
                              );
                            }
                          }
                        />

                        <div className="statement-review-main">
                          <input
                            className="statement-edit-name"
                            value={
                              entry.name
                            }
                            disabled={
                              busy
                            }
                            onChange={
                              event =>
                                updateRow(
                                  entry.row,
                                  {
                                    name:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                            }
                          />

                          <small>
                            Compra:{" "}
                            {entry.date
                              .split(
                                "-"
                              )
                              .reverse()
                              .join(
                                "/"
                              )}

                            {statementKind ===
                              "card" &&
                              card && (
                                <>
                                  {" · "}
                                  Fatura:{" "}
                                  {monthLabel(
                                    entry.effectiveDate
                                  )}
                                </>
                              )}

                            {entry.duplicate
                              ? " · Possível repetido"
                              : ""}
                          </small>
                        </div>

                        <select
                          className="statement-type-select"
                          value={
                            entry.type
                          }
                          disabled={
                            busy
                          }
                          onChange={
                            event => {
                              const type =
                                event
                                  .target
                                  .value as ReviewType;

                              updateRow(
                                entry.row,
                                {
                                  type,

                                  category:
                                    guessCategory(
                                      entry.name,
                                      type
                                    ),
                                }
                              );
                            }
                          }
                        >
                          <option value="Despesa">
                            Despesa
                          </option>

                          <option value="Receita">
                            Receita
                          </option>

                          <option value="Ignorar">
                            Ignorar
                          </option>
                        </select>

                        <input
                          className="statement-category-input"
                          value={
                            entry.category
                          }
                          disabled={
                            busy ||
                            entry.type ===
                              "Ignorar"
                          }
                          onChange={
                            event =>
                              updateRow(
                                entry.row,
                                {
                                  category:
                                    event
                                      .target
                                      .value,
                                }
                              )
                          }
                          placeholder="Categoria"
                        />

                        <b>
                          {money(
                            entry.value
                          )}
                        </b>
                      </article>
                    )
                  )}
              </div>

              {/* ===========================================
                  PAGINAÇÃO
                  =========================================== */}

              {preview.length >
                50 && (
                <div className="preview-pagination">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      previewPage ===
                        0
                    }
                    onClick={() =>
                      setPreviewPage(
                        value =>
                          value -
                          1
                      )
                    }
                  >
                    Anterior
                  </button>

                  <span>
                    Página{" "}
                    {previewPage +
                      1}{" "}
                    de{" "}
                    {Math.ceil(
                      preview.length /
                        50
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      (
                        previewPage +
                        1
                      ) *
                        50 >=
                        preview.length
                    }
                    onClick={() =>
                      setPreviewPage(
                        value =>
                          value +
                          1
                      )
                    }
                  >
                    Próxima
                  </button>
                </div>
              )}

              {/* ===========================================
                  ERROS
                  =========================================== */}

              {prepared.errors.length >
                0 && (
                <details>
                  <summary>
                    {
                      prepared.errors
                        .length
                    }{" "}
                    linha(s) inválida(s), que não serão importadas
                  </summary>

                  {prepared.errors
                    .slice(
                      0,
                      30
                    )
                    .map(
                      error => (
                        <p
                          key={
                            error
                          }
                        >
                          {error}
                        </p>
                      )
                    )}
                </details>
              )}

              {/* ===========================================
                  CONFIRMAÇÃO
                  =========================================== */}

              <label className="preference-option">
                <input
                  type="checkbox"
                  disabled={
                    busy
                  }
                  checked={
                    confirmed
                  }
                  onChange={
                    event =>
                      setConfirmed(
                        event
                          .target
                          .checked
                      )
                  }
                />

                <span>
                  Conferi os lançamentos, categorias, tipos e competência das
                  faturas e desejo importar somente os itens selecionados.
                </span>
              </label>
            </>
          )}

          <p role="status">
            {busy
              ? "Processando…"
              : message}
          </p>
        </div>

        {/* ===============================================
            RODAPÉ
            =============================================== */}

        <div className="modal-foot">
          <button
            type="button"
            disabled={
              busy
            }
            onClick={
              onClose
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="primary"
            disabled={
              busy ||
              !confirmed ||
              !chosen.length
            }
            onClick={() =>
              void commit()
            }
          >
            Importar{" "}
            {chosen.length ||
              ""}{" "}
            lançamento(s)
          </button>
        </div>
      </div>
    </div>
  );
}