"use client";

import { useState } from "react";
import { brl, fileSize } from "@/lib/format";
import { downloadLocalFile } from "@/lib/file-storage";
import type { UploadedFile } from "@/lib/types";

export function FileList({ files, onRemove, disabled }: { files: UploadedFile[]; onRemove?: (index: number) => void; disabled?: boolean }) {
  const [error, setError] = useState("");
  return <>
    <ul className="mt-3 divide-y divide-stone-100 text-sm">
      {files.map((f, i) => <li key={f.fingerprint ?? `${f.name}-${i}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
        <span className="min-w-0 flex-1 truncate">{f.name}{f.cancelled ? " (cancelada)" : ""}</span>
        <span className="text-xs text-stone-500">{f.total != null ? `${brl(f.total)} · ` : ""}{fileSize(f.size)}</span>
        {f.fingerprint ? <button className="btn-ghost" onClick={async () => {
          setError("");
          try { await downloadLocalFile(f.fingerprint!, f.name); }
          catch (e) { setError(e instanceof Error ? e.message : "Falha ao baixar arquivo."); }
        }} aria-label={`Baixar ${f.name}`}>Baixar</button> : <span className="text-xs text-stone-400">Exemplo sem arquivo</span>}
        {onRemove && <button className="btn-ghost" disabled={disabled} onClick={() => onRemove(i)} aria-label={`Remover ${f.name}`}>Remover</button>}
      </li>)}
    </ul>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
  </>;
}
