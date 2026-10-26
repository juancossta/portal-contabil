"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { site } from "@/lib/site.config";
import { useStore } from "@/lib/store";
import { competenciaLabel } from "@/lib/format";
import type { Role } from "@/lib/types";

export function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { state, hydrated, dispatch } = useStore();
  const router = useRouter();

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
      <div className="bg-stone-900 px-4 py-1.5 text-center text-xs text-stone-300">
        Ambiente de demonstração com dados fictícios ·{" "}
        <a href={wa} target="_blank" rel="noreferrer" className="font-medium text-white underline underline-offset-2">
          {site.poweredBy.cta}
        </a>
      </div>

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={role === "escritorio" ? "/escritorio" : "/cliente"} className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display text-lg text-white">
              {site.brand.name[0]}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">{site.brand.name}</span>
              <span className="block text-xs text-stone-500">
                {role === "escritorio" ? "Painel do escritório" : client?.name} · {competenciaLabel(state.competencia)}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => dispatch({ type: "reset" })}>
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

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-stone-400">
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
