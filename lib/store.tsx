"use client";

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode, type Dispatch } from "react";
import type { Role, State, UploadedFile } from "./types";
import { buildSeed } from "./seed";

const KEY = "reforged-portal-contabil-v1";

type Action =
  | { type: "load"; state: State }
  | { type: "setRole"; role: Role | null; clientId?: string | null }
  | { type: "upload"; docId: string; files: UploadedFile[] }
  | { type: "review"; docId: string; result: "aprovado" | "ajuste"; note?: string }
  | { type: "nudge"; clientId: string }
  | { type: "reset" };

const log = (s: State, text: string): State => ({
  ...s,
  activity: [{ id: `a${Date.now()}${Math.random()}`, ts: new Date().toISOString(), text }, ...s.activity].slice(0, 30),
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return action.state;
    case "setRole":
      return { ...state, role: action.role, activeClientId: action.clientId ?? null };
    case "upload": {
      const doc = state.docs.find((d) => d.id === action.docId);
      if (!doc) return state;
      const client = state.clients.find((c) => c.id === doc.clientId);
      const next: State = {
        ...state,
        docs: state.docs.map((d) =>
          d.id === action.docId
            ? { ...d, files: [...d.files, ...action.files], status: "enviado", note: undefined }
            : d
        ),
      };
      return log(next, `${client?.name ?? "Cliente"} enviou ${action.files.length} arquivo(s)`);
    }
    case "review": {
      const doc = state.docs.find((d) => d.id === action.docId);
      if (!doc) return state;
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
      return log(state, `Cobrança enviada por WhatsApp para ${client?.name}`);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) dispatch({ type: "load", state: JSON.parse(raw) as State });
    } catch {
      /* sem storage: segue com seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state, hydrated]);

  return <StoreCtx.Provider value={{ state, hydrated, dispatch }}>{children}</StoreCtx.Provider>;
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
