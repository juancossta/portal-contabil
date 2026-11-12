"use client";

import { useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { FileList } from "@/components/FileList";
import { saveLocalFiles } from "@/lib/file-storage";
import { validateBatch } from "@/lib/upload-validation";
import { StatusChip } from "@/components/StatusChip";
import { site } from "@/lib/site.config";
import { useStore, docsOf, revenueOf } from "@/lib/store";
import { obligationsFor } from "@/lib/obligations";
import { parseUpload, sampleFiles, validateUpload } from "@/lib/xml";
import { brl, dateBR, daysUntil, competenciaLabel } from "@/lib/format";
import { DOC_HINT, DOC_LABEL } from "@/lib/types";
import type { DocRequest } from "@/lib/types";

export default function AreaCliente() {
  return (
    <Shell role="cliente">
      <Conteudo />
    </Shell>
  );
}

function Conteudo() {
  const { state } = useStore();
  const client = state.clients.find((c) => c.id === state.activeClientId);
  if (!client) return null;

  const docs = docsOf(state, client.id);
  const obligations = obligationsFor(client, state.competencia);
  const revenue = revenueOf(state, client.id);
  const done = docs.filter((d) => d.status === "aprovado").length;
  const todo = docs.filter((d) => d.status === "pendente" || d.status === "ajuste").length;
  const wa = `https://wa.me/${site.officeWhatsapp}?text=${encodeURIComponent(`Olá! Sou da ${client.name} e tenho uma dúvida sobre o fechamento.`)}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Olá, {client.contact}</h1>
          <p className="mt-1 text-stone-600">
            {todo > 0
              ? `Faltam ${todo} item(ns) para fechar ${competenciaLabel(state.competencia)}.`
              : done === docs.length
                ? `Tudo certo! ${competenciaLabel(state.competencia)} está completo.`
                : "Seus documentos estão em análise pelo escritório."}
          </p>
        </div>
        <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost">
          Falar com o escritório
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-4">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} />
          ))}
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <p className="label">Faturamento lido dos XMLs</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{brl(revenue)}</p>
            <p className="mt-1 text-xs text-stone-500">Atualiza sozinho a cada XML de venda enviado.</p>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Próximos vencimentos</h2>
            <ul className="mt-3 space-y-3">
              {obligations.map((o) => {
                const dd = daysUntil(o.dueDate);
                return (
                  <li key={o.id} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{o.title}</span>
                      <span className="shrink-0 tabular-nums text-stone-500">{dateBR(o.dueDate)}</span>
                    </div>
                    <p className="text-xs text-stone-500">{dd >= 0 ? `em ${dd} dia(s)` : "vencido"}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-stone-400">Datas ilustrativas na demo.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

function DocCard({ doc }: { doc: DocRequest }) {
  const { state, dispatch } = useStore();
  const sending = useRef(false);
  const [feedback, setFeedback] = useState("");
  const client = state.clients.find(c => c.id === doc.clientId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const isXml = doc.type === "xml_vendas" || doc.type === "xml_compras";
  const locked = doc.status === "aprovado";

  async function send(list: File[]) {
    if (!list.length || sending.current || locked) return;
    sending.current = true;
    setBusy(true);
    setFeedback("");
    try {
      if (list.length > 30) throw new Error("Envie no máximo 30 arquivos por vez.");
      list.forEach(file => validateUpload(file, doc.type));
      const parsed = await Promise.all(list.map(parseUpload));
      if (!client) throw new Error("Cliente não encontrado.");
      validateBatch(parsed, doc, client);
      await saveLocalFiles(parsed.map((file, i) => ({ key: file.fingerprint!, file: list[i] })));
      dispatch({ type: "upload", docId: doc.id, files: parsed });
      setFeedback("Arquivos salvos neste navegador e enviados para revisão na demo.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível enviar os arquivos.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{DOC_LABEL[doc.type]}</h2>
          <p className="text-xs text-stone-500">{DOC_HINT[doc.type]}</p>
        </div>
        <StatusChip status={doc.status} />
      </div>

      {doc.status === "ajuste" && doc.note && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">O escritório pediu ajuste: {doc.note}</p>
      )}

      {doc.files.length > 0 && (
        <FileList files={doc.files} disabled={busy} onRemove={locked ? undefined : index => dispatch({ type: "removeFile", docId: doc.id, index })} />
      )}

      {feedback && <p role="status" className="mt-3 text-sm text-stone-700">{feedback}</p>}
      {doc.status === "ajuste" && doc.files.length > 0 && <button className="btn-primary mt-3" disabled={busy} onClick={() => dispatch({ type: "resubmit", docId: doc.id })}>Reenviar arquivos para revisão</button>}
      {!locked && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void send(Array.from(e.dataTransfer.files));
          }}
          className={`drop-zone mt-4 ${
            drag ? "border-brand bg-brand/5" : "border-stone-300"
          }`}
        >
          <p className="mb-2 text-xs text-stone-500">Até 10 MB por arquivo, 30 arquivos por envio. Arquivos ficam apenas neste navegador.</p>
          <p className="text-stone-600">{busy ? "Lendo arquivos…" : "Arraste os arquivos aqui ou"}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
              Escolher arquivos
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => void send(sampleFiles(doc.type, Date.now(), doc.competencia, doc.type === "xml_vendas" ? client?.cnpj : "11222333000181", doc.type === "xml_compras" ? client?.cnpj : undefined))}>
              {isXml ? "Usar XMLs de exemplo" : "Usar arquivo de exemplo"}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={isXml ? ".xml" : doc.type === "extrato" ? ".pdf,.ofx" : ".pdf,.csv,.xlsx,.xls"}
            onChange={(e) => {
              void send(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      )}
    </article>
  );
}
