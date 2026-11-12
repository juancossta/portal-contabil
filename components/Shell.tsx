"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { clearLocalFiles } from "@/lib/file-storage";
import { site } from "@/lib/site.config";
import { useStore } from "@/lib/store";
import { competenciaLabel } from "@/lib/format";
import type { Role } from "@/lib/types";

export function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { state, hydrated, dispatch } = useStore();
  const router = useRouter();
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (hydrated && state.role !== role) router.replace("/");
  }, [hydrated, state.role, role, router]);

  if (!hydrated || state.role !== role) {
    return <div className="grid min-h-screen place-items-center text-sm text-stone-500">Carregando…</div>;
  }

  const client = state.clients.find((c) => c.id === state.activeClientId);
  const wa = `https://wa.me/${site.poweredBy.whatsapp}?text=${encodeURIComponent(site.poweredBy.message)}`;

  return (
    <div className="min-h-screen">
      <div className="demo-banner px-4 py-2 text-center text-xs leading-relaxed">
        Ambiente de demonstração com dados fictícios ·{" "}
        <a href={wa} target="_blank" rel="noreferrer" className="font-medium text-white underline underline-offset-2">
          {site.poweredBy.cta}
        </a>
      </div>

      <header className="portal-header">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <Link href={role === "escritorio" ? "/escritorio" : "/cliente"} className="flex items-center gap-3">
            <span className="brand-mark">
              {site.brand.name[0]}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">{site.brand.name}</span>
              <span className="block text-xs text-stone-500">
                {role === "escritorio" ? "Painel do escritório" : client?.name} · {competenciaLabel(state.competencia)}
              </span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <label className="month-control">Competência
              <input type="month" min="2000-01" max="2100-12" value={state.competencia} className="month-input" onChange={e => dispatch({ type: "setCompetencia", competencia: e.target.value })} />
            </label>
            <button className="btn-ghost" disabled={resetting} onClick={async () => {
              if (!window.confirm("Apagar os dados e arquivos locais e restaurar a demonstração?")) return;
              setResetting(true);
              setResetError("");
              try { await clearLocalFiles(); dispatch({ type: "reset" }); }
              catch (e) { setResetError(e instanceof Error ? e.message : "Falha ao resetar a demo."); }
              finally { setResetting(false); }
            }}>
              Resetar demo
            </button>
            <Link
              href="/"
              onClick={() => dispatch({ type: "setRole", role: null })}
              className="btn-ghost"
            >
              Trocar perfil
            </Link>
          </div>
        </div>
      </header>

      <main className="portal-main">{resetError && <p role="alert" className="mb-4 text-sm text-rose-700">{resetError}</p>}{children}</main>

      <footer className="mx-auto max-w-7xl border-t border-stone-200 px-4 py-6 text-xs text-stone-500 sm:px-6 lg:px-8">
        Desenvolvido por{" "}
        <a
          href={site.poweredBy.instagram}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2 hover:text-brand"
        >
          {site.poweredBy.name}
        </a>
      </footer>
    </div>
  );
}
