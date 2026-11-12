import type { State } from "./types";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === "string";
export const validMonth = (v: unknown): v is string => string(v) && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

// Persisted data is untrusted, including data written by older demo versions.
export function isState(v: unknown): v is State {
  if (!object(v) || !validMonth(v.competencia) || !Array.isArray(v.clients) || !Array.isArray(v.docs) || !Array.isArray(v.activity)) return false;
  if (![null, "cliente", "escritorio"].includes(v.role as null) || !(v.activeClientId === null || string(v.activeClientId))) return false;
  if (!v.clients.every(c => object(c) && [c.id, c.name, c.cnpj, c.segment, c.contact, c.phone].every(string) && ["simples", "presumido"].includes(String(c.regime)) && typeof c.hasEmployees === "boolean")) return false;
  const clients = new Set(v.clients.map(c => c.id));
  if (clients.size !== v.clients.length || (v.role === "cliente" && !clients.has(v.activeClientId))) return false;
  if (!v.docs.every(d => object(d) && string(d.id) && clients.has(d.clientId) && validMonth(d.competencia) && ["xml_vendas", "xml_compras", "extrato", "folha"].includes(String(d.type)) && ["pendente", "enviado", "aprovado", "ajuste"].includes(String(d.status)) && (d.note === undefined || string(d.note)) && Array.isArray(d.files) && d.files.every(f => object(f) && string(f.name) && typeof f.size === "number" && Number.isFinite(f.size) && f.size >= 0 && string(f.uploadedAt) && Number.isFinite(Date.parse(f.uploadedAt)) && (f.total === undefined || (typeof f.total === "number" && Number.isFinite(f.total) && f.total >= 0)) && [f.fingerprint, f.fiscalKey, f.issuedMonth, f.issuerCnpj, f.number].every(x => x === undefined || string(x)) && (f.cancelled === undefined || typeof f.cancelled === "boolean") && (f.kind === undefined || ["nfe", "nfce", "nfse", "outro"].includes(String(f.kind)))))) return false;
  if (new Set(v.docs.map(d => d.id)).size !== v.docs.length) return false;
  return v.activity.every(a => object(a) && string(a.id) && string(a.text) && string(a.ts) && Number.isFinite(Date.parse(a.ts)));
}
