"use client";

import { useRouter } from "next/navigation";
import { site } from "@/lib/site.config";
import { useStore } from "@/lib/store";

export default function Entrada() {
  const { state, hydrated, dispatch } = useStore();
  const router = useRouter();
  const wa = `https://wa.me/${site.poweredBy.whatsapp}?text=${encodeURIComponent(site.poweredBy.message)}`;

  const enter = (role: "escritorio" | "cliente", clientId?: string) => {
    dispatch({ type: "setRole", role, clientId: clientId ?? null });
    router.push(role === "escritorio" ? "/escritorio" : "/cliente");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-10 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand font-display text-xl text-white">
          {site.brand.name[0]}
        </span>
        <span className="font-display text-lg font-semibold">{site.brand.name}</span>
      </div>

      <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
        Pare de caçar documento de cliente no WhatsApp.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-stone-600">
        Seus clientes enviam XMLs e extratos num só lugar. Você enxerga quem já mandou, quem está atrasado e cobra com um clique.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-sm text-stone-600">
        {["Leitura automática de XML", "Prazos fiscais por regime", "Cobrança via WhatsApp", "Sua marca, seu domínio"].map((t) => (
          <span key={t} className="rounded-full border border-stone-300 bg-white px-3 py-1">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <section className="card p-6">
          <p className="label">Perfil 1</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Sou do escritório</h2>
          <p className="mt-2 text-sm text-stone-600">
            Painel com todos os clientes, pendências do mês, aprovação de documentos e cobrança por WhatsApp.
          </p>
          <button className="btn-primary mt-5" onClick={() => enter("escritorio")} disabled={!hydrated}>
            Entrar no painel
          </button>
        </section>

        <section className="card p-6">
          <p className="label">Perfil 2</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Sou cliente</h2>
          <p className="mt-2 text-sm text-stone-600">Escolha uma empresa para ver o que ela precisa enviar e os próximos vencimentos.</p>
          <div className="mt-4 grid gap-2">
            {state.clients.map((c) => (
              <button
                key={c.id}
                disabled={!hydrated}
                onClick={() => enter("cliente", c.id)}
                className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-left text-sm hover:border-brand hover:bg-stone-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-stone-500">{c.regime === "simples" ? "Simples Nacional" : "Lucro Presumido"}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6 text-sm text-stone-500">
        <span>
          Demo com dados fictícios · desenvolvido por{" "}
          <a
            href={site.poweredBy.instagram}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-stone-700 underline underline-offset-2 hover:text-brand"
          >
            {site.poweredBy.name}
          </a>
        </span>
        <a href={wa} target="_blank" rel="noreferrer" className="btn-primary">
          {site.poweredBy.cta}
        </a>
      </div>
    </div>
  );
}
