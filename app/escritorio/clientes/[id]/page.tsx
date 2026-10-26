"use client";

import Link from "next/link";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { StatusChip } from "@/components/StatusChip";
import { useStore, docsOf, revenueOf } from "@/lib/store";
import { obligationsFor } from "@/lib/obligations";
import { brl, dateBR, daysUntil, fileSize, competenciaLabel } from "@/lib/format";
import { DOC_LABEL } from "@/lib/types";

export default function DetalheCliente({ params }: { params: { id: string } }) {
  return (
    <Shell role="escritorio">
      <Conteudo id={params.id} />
    </Shell>
  );
}

function Conteudo({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const [ajusteDoc, setAjusteDoc] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  const client = state.clients.find((c) => c.id === id);
  if (!client) {
    return (
      <p>
        Cliente não encontrado. <Link href="/escritorio" className="underline">Voltar</Link>
      </p>
    );
  }

  const docs = docsOf(state, id);
  const revenue = revenueOf(state, id);
  const obligations = obligationsFor(client, state.competencia);
  const cancelledCount = docs.flatMap((d) => d.files).filter((f) => f.cancelled).length;

  return (
    <>
      <Link href="/escritorio" className="text-sm text-stone-500 hover:text-brand">
        ← Todos os clientes
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-stone-600">
            CNPJ {client.cnpj} · {client.regime === "simples" ? "Simples Nacional" : "Lucro Presumido"} · {client.segment}
          </p>
        </div>
        <div className="card px-5 py-3 text-right">
          <p className="label">Faturamento em {competenciaLabel(state.competencia)}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{brl(revenue)}</p>
          <p className="text-[11px] text-stone-400">
            soma dos XMLs de vendas{cancelledCount ? ` (${cancelledCount} cancelada(s) ignorada(s))` : ""}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {docs.map((d) => (
            <article key={d.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{DOC_LABEL[d.type]}</h2>
                <StatusChip status={d.status} />
              </div>

              {d.files.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">Nada enviado ainda.</p>
              ) : (
                <ul className="mt-3 divide-y divide-stone-100 text-sm">
                  {d.files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0 tabular-nums text-xs text-stone-500">
                        {f.total != null ? `${brl(f.total)} · ` : ""}
                        {fileSize(f.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {d.status === "ajuste" && d.note && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Ajuste solicitado: {d.note}</p>
              )}

              {d.status === "enviado" && (
                <div className="mt-4">
                  {ajusteDoc === d.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="O que o cliente precisa corrigir?"
                        className="w-full rounded-lg border border-stone-300 p-2 text-sm focus:border-brand focus:outline-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          disabled={!nota.trim()}
                          onClick={() => {
                            dispatch({ type: "review", docId: d.id, result: "ajuste", note: nota.trim() });
                            setAjusteDoc(null);
                            setNota("");
                          }}
                        >
                          Enviar pedido
                        </button>
                        <button className="btn-ghost" onClick={() => setAjusteDoc(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button className="btn-primary" onClick={() => dispatch({ type: "review", docId: d.id, result: "aprovado" })}>
                        Aprovar
                      </button>
                      <button className="btn-ghost" onClick={() => setAjusteDoc(d.id)}>
                        Pedir ajuste
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>

        <aside className="card h-fit p-5">
          <h2 className="font-display text-lg font-semibold">Obrigações deste cliente</h2>
          <ul className="mt-3 space-y-3">
            {obligations.map((o) => {
              const dd = daysUntil(o.dueDate);
              return (
                <li key={o.id} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{o.title}</span>
                    <span className="shrink-0 tabular-nums text-stone-500">{dateBR(o.dueDate)}</span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {dd >= 0 ? `em ${dd} dia(s)` : "vencido"}
                    {o.note ? ` · ${o.note}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
}
