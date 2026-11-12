"use client";

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode, type Dispatch } from "react";
import type { Role, State, UploadedFile } from "./types";
import { buildSeed } from "./seed";
import { isState, validMonth } from "./state-validation";

const KEY = "reforged-portal-contabil-v1";

type Action =
  | { type: "load"; state: State }
  | { type: "setRole"; role: Role | null; clientId?: string | null }
  | { type: "upload"; docId: string; files: UploadedFile[] }
  | { type: "removeFile"; docId: string; index: number }
  | { type: "resubmit"; docId: string }
  | { type: "setCompetencia"; competencia: string }
  | { type: "review"; docId: string; result: "aprovado" | "ajuste"; note?: string }
  | { type: "nudge"; clientId: string }
  | { type: "reset" };

const log = (s: State, text: string): State => ({
  ...s,
  activity: [{ id: `a${Date.now()}${Math.random()}`, ts: new Date().toISOString(), text }, ...s.activity].slice(0, 30),
});

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return isState(action.state) ? action.state : state;
    case "setRole":
      return { ...state, role: action.role, activeClientId: action.clientId ?? null };
    case "upload": {
      const doc = state.docs.find((d) => d.id === action.docId);
      if (!doc || doc.status === "aprovado" || state.role !== "cliente" || doc.clientId !== state.activeClientId || doc.competencia !== state.competencia) return state;
      const identities = new Set(doc.files.flatMap(f => [f.fingerprint, f.fiscalKey].filter(Boolean)));
      const files = action.files.filter(f => {
        if ((f.fingerprint && identities.has(f.fingerprint)) || (f.fiscalKey && identities.has(f.fiscalKey))) return false;
        if (f.fingerprint) identities.add(f.fingerprint);
        if (f.fiscalKey) identities.add(f.fiscalKey);
        return true;
      });
      if (!files.length) return state;
      const client = state.clients.find((c) => c.id === doc.clientId);
      const next: State = {
        ...state,
        docs: state.docs.map((d) =>
          d.id === action.docId
            ? { ...d, files: [...d.files, ...files], status: "enviado", note: undefined }
            : d
        ),
      };
      return log(next, `${client?.name ?? "Cliente"} enviou ${files.length} arquivo(s)`);
    }
    case "removeFile": {
      const doc = state.docs.find(d => d.id === action.docId);
      if (!doc || state.role !== "cliente" || doc.clientId !== state.activeClientId || doc.competencia !== state.competencia || doc.status === "aprovado" || !doc.files[action.index]) return state;
      const files = doc.files.filter((_, i) => i !== action.index);
      return log({ ...state, docs: state.docs.map(d => d.id === doc.id ? { ...d, files, status: files.length ? "ajuste" : "pendente", note: "Arquivos alterados. Envie a versão corrigida para revisão." } : d) }, "Cliente removeu um arquivo para correção");
    }
    case "resubmit": {
      const doc = state.docs.find(d => d.id === action.docId);
      if (!doc || state.role !== "cliente" || doc.clientId !== state.activeClientId || doc.competencia !== state.competencia || doc.status !== "ajuste" || !doc.files.length) return state;
      return log({ ...state, docs: state.docs.map(d => d.id === doc.id ? { ...d, status: "enviado", note: undefined } : d) }, "Cliente reenviou documentos corrigidos para revisão");
    }
    case "setCompetencia": {
      if (!validMonth(action.competencia)) return state;
      const docs = [...state.docs];
      for (const client of state.clients) {
        for (const type of ["xml_vendas", "xml_compras", "extrato", ...(client.hasEmployees ? ["folha" as const] : [])] as const) {
          if (!docs.some(d => d.clientId === client.id && d.type === type && d.competencia === action.competencia)) docs.push({ id: `${client.id}-${type}-${action.competencia}`, clientId: client.id, competencia: action.competencia, type, status: "pendente", files: [] });
        }
      }
      return { ...state, competencia: action.competencia, docs };
    }
    case "review": {
      const doc = state.docs.find((d) => d.id === action.docId);
      if (!doc || state.role !== "escritorio" || doc.competencia !== state.competencia || doc.status !== "enviado" || !doc.files.length || (action.result === "ajuste" && !action.note?.trim())) return state;
      const next: State = {
        ...state,
        docs: state.docs.map((d) =>
          d.id === action.docId ? { ...d, status: action.result, note: action.result === "ajuste" ? action.note : undefined } : d
        ),
      };
      const client = state.clients.find((c) => c.id === doc.clientId);
      return log(next, action.result === "aprovado" ? `Você aprovou os documentos de ${client?.name}` : `Você pediu ajuste: ${client?.name}`);
    }
    case "nudge": {
      const client = state.clients.find((c) => c.id === action.clientId);
      return state.role === "escritorio" && client ? log(state, `Cobrança preparada no WhatsApp para ${client.name}`) : state;
    }
    case "reset":
      return buildSeed();
  }
}

type Ctx = { state: State; hydrated: boolean; dispatch: Dispatch<Action> };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildSeed);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (isState(saved)) dispatch({ type: "load", state: saved });
        else setStorageError("Dados locais incompatíveis. A demo foi reiniciada.");
      }
    } catch {
      setStorageError("Não foi possível recuperar os dados locais. A demo foi reiniciada.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setStorageError("Não foi possível salvar neste navegador. As alterações podem ser perdidas ao fechar a página.");
    }
  }, [state, hydrated]);

  return <StoreCtx.Provider value={{ state, hydrated, dispatch }}>{storageError && <p role="alert" className="bg-amber-50 px-4 py-3 text-sm text-amber-900">{storageError}</p>}{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore fora do StoreProvider");
  return ctx;
}

// Helpers derivados
export function docsOf(state: State, clientId: string) {
  return state.docs.filter((d) => d.clientId === clientId && d.competencia === state.competencia);
}

export function clientProgress(state: State, clientId: string) {
  const docs = docsOf(state, clientId);
  const done = docs.filter((d) => d.status === "aprovado").length;
  const sent = docs.filter((d) => d.status === "enviado").length;
  const pending = docs.filter((d) => d.status === "pendente" || d.status === "ajuste").length;
  return { total: docs.length, done, sent, pending };
}

export function revenueOf(state: State, clientId: string): number {
  return docsOf(state, clientId)
    .filter((d) => d.type === "xml_vendas")
    .flatMap((d) => d.files)
    .filter((f) => !f.cancelled)
    .reduce((acc, f) => acc + (f.total ?? 0), 0);
}
