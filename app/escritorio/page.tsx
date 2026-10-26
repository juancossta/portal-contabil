"use client";

import Link from "next/link";
import { Shell } from "@/components/Shell";
import { site } from "@/lib/site.config";
import { useStore, clientProgress, docsOf, revenueOf } from "@/lib/store";
import { obligationsFor } from "@/lib/obligations";
import { brl, dateBR, dateTimeBR, daysUntil, competenciaLabel } from "@/lib/format";
import { DOC_LABEL } from "@/lib/types";
import type { Client } from "@/lib/types";

export default function Painel() {
  return (
    <Shell role="escritorio">
      <Conteudo />
    </Shell>
  );
}

function Conteudo() {
  const { state, dispatch } = useStore();

  const rows = state.clients.map((c) => ({ c, p: clientProgress(state, c.id), revenue: revenueOf(state, c.id) }));
  const totalDocs = rows.reduce((a, r) => a + r.p.total, 0);
  const done = rows.reduce((a, r) => a + r.p.done, 0);
  const review = rows.reduce((a, r) => a + r.p.sent, 0);
  const pending = rows.reduce((a, r) => a + r.p.pending, 0);
  const late = rows.filter((r) => r.p.pending > 0).length;
  const pct = totalDocs ? Math.round((done / totalDocs) * 100) : 0;

  const upcoming = state.clients
    .flatMap((c) => obligationsFor(c, state.competencia).map((o) => ({ ...o, client: c })))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const nudge = (c: Client) => {
    const faltam = docsOf(state, c.id)
      .filter((d) => d.status === "pendente" || d.status === "ajuste")
      .map((d) => DOC_LABEL[d.type].toLowerCase());
    const msg = `Olá, ${c.contact}! Aqui é do ${site.brand.name}. Para fechar ${competenciaLabel(state.competencia)} ainda precisamos de: ${faltam.join(", ")}. Você pode enviar direto pelo portal. Obrigado!`;
    window.open(`https://wa.me/${c.phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    dispatch({ type: "nudge", clientId: c.id });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Fechamento de {competenciaLabel(state.competencia)}</h1>
        <p className="mt-1 text-stone-600">Quem já enviou, quem falta e o que precisa da sua revisão.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Clientes" value={String(state.clients.length)} sub={`${late} com pendência`} />
        <Kpi label="Aguardando você" value={String(review)} sub="documentos para revisar" tone="amber" />
        <Kpi label="Faltando enviar" value={String(pending)} sub="documentos pendentes" tone="rose" />
        <Kpi label="Concluído" value={`${pct}%`} sub={`${done} de ${totalDocs} aprovados`} tone="emerald" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <div className="border-b border-stone-200 px-5 py-3">
            <h2 className="font-display text-lg font-semibold">Clientes</h2>
          </div>
          <ul className="divide-y divide-stone-100">
            {rows.map(({ c, p, revenue }) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-[200px] flex-1">
                  <Link href={`/escritorio/clientes/${c.id}`} className="font-medium hover:text-brand">
                    {c.name}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {c.regime === "simples" ? "Simples Nacional" : "Lucro Presumido"} · {c.segment}
                  </p>
                </div>
                <div className="w-40">
                  <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="bg-emerald-500" style={{ width: `${(p.done / p.total) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(p.sent / p.total) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {p.done}/{p.total} aprovados{p.sent ? ` · ${p.sent} p/ revisar` : ""}
                  </p>
                </div>
                <div className="w-28 text-right text-sm tabular-nums text-stone-700">
                  {revenue > 0 ? brl(revenue) : <span className="text-stone-400">—</span>}
                  <p className="text-[11px] text-stone-400">faturamento (XML)</p>
                </div>
                <div className="flex gap-2">
                  {p.pending > 0 && (
                    <button className="btn-ghost" onClick={() => nudge(c)}>
                      Cobrar
                    </button>
                  )}
                  <Link href={`/escritorio/clientes/${c.id}`} className="btn-ghost">
                    Abrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Próximos vencimentos</h2>
            <ul className="mt-3 space-y-3">
              {upcoming.map((o) => {
                const d = daysUntil(o.dueDate);
                return (
                  <li key={o.id} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{o.title}</span>
                      <span className="shrink-0 tabular-nums text-stone-500">{dateBR(o.dueDate)}</span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {o.client.name}
                      {d >= 0 ? ` · em ${d} dia(s)` : " · vencido"}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-stone-400">Datas ilustrativas na demo.</p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Atividade recente</h2>
            <ul className="mt-3 space-y-3">
              {state.activity.slice(0, 6).map((a) => (
                <li key={a.id} className="text-sm">
                  <p>{a.text}</p>
                  <p className="text-xs text-stone-400">{dateTimeBR(a.ts)}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "amber" | "rose" | "emerald" }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-ink";
  return (
    <div className="card p-5">
      <p className="label">{label}</p>
      <p className={`mt-1 font-display text-4xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-stone-500">{sub}</p>
    </div>
  );
}
