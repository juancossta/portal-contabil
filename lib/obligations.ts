import type { Client } from "./types";

export type Obligation = {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  note?: string;
};

// ATENÇÃO: datas ILUSTRATIVAS para a demo (sem feriados nem regras municipais).
// Em produção, substitua por uma tabela por município/regime mantida pelo escritório.
function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Se cair em fim de semana, antecipa para a sexta anterior.
function rollBack(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  if (dow === 6) dt.setUTCDate(dt.getUTCDate() - 1);
  if (dow === 0) dt.setUTCDate(dt.getUTCDate() - 2);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function obligationsFor(client: Client, competencia: string): Obligation[] {
  const [cy, cm] = competencia.split("-").map(Number);
  // vencimentos caem no mês seguinte à competência
  const y = cm === 12 ? cy + 1 : cy;
  const m = cm === 12 ? 1 : cm + 1;
  const list: Obligation[] = [];
  const add = (id: string, title: string, day: number, note?: string) =>
    list.push({ id: `${client.id}-${id}`, title, dueDate: rollBack(y, m, day), note });

  if (client.hasEmployees) {
    add("esocial", "eSocial — fechamento da folha", 7);
    add("dctfweb", "DCTFWeb", 15);
    add("fgts", "FGTS Digital", 20);
  }

  if (client.regime === "simples") {
    add("das", "DAS — Simples Nacional (PGDAS-D)", 20);
  } else {
    add("iss", "ISS (municipal)", 10, "Data varia por município");
    add("efd", "EFD ICMS/IPI", 25);
    add("pis", "DARF PIS/COFINS", 25);
  }

  return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
