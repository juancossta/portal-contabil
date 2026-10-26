import type { DocStatus } from "@/lib/types";

const MAP: Record<DocStatus, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-stone-100 text-stone-600 ring-stone-200" },
  enviado: { label: "Em análise", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  ajuste: { label: "Ajuste pedido", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
};

export function StatusChip({ status }: { status: DocStatus }) {
  const s = MAP[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}
