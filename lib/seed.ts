import type { Activity, Client, DocRequest, DocStatus, DocType, State, UploadedFile } from "./types";

export function previousCompetencia(now = new Date()): string {
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

const CLIENTS: Client[] = [
  { id: "c1", name: "Farmácia Vida Plena Ltda", cnpj: "12.345.678/0001-90", regime: "presumido", segment: "Farmácia", contact: "Marcos", phone: "5521988880001", hasEmployees: true },
  { id: "c2", name: "Studio Bella Hair ME", cnpj: "23.456.789/0001-01", regime: "simples", segment: "Salão de beleza", contact: "Camila", phone: "5521988880002", hasEmployees: true },
  { id: "c3", name: "Mercadinho Bom Preço", cnpj: "34.567.890/0001-12", regime: "simples", segment: "Comércio varejista", contact: "Seu Antônio", phone: "5521988880003", hasEmployees: true },
  { id: "c4", name: "Clínica Odonto Sorriso", cnpj: "45.678.901/0001-23", regime: "presumido", segment: "Saúde", contact: "Dra. Paula", phone: "5521988880004", hasEmployees: false },
  { id: "c5", name: "Auto Peças Irmãos Silva", cnpj: "56.789.012/0001-34", regime: "presumido", segment: "Autopeças", contact: "Roberto", phone: "5521988880005", hasEmployees: true },
  { id: "c6", name: "Padaria Pão Quente", cnpj: "67.890.123/0001-45", regime: "simples", segment: "Alimentação", contact: "Dona Lúcia", phone: "5521988880006", hasEmployees: true },
];

type Plan = Partial<Record<DocType, { status: DocStatus; files?: number; total?: number; note?: string; kind?: "nfe" | "nfse" }>>;

const PLAN: Record<string, Plan> = {
  c1: {
    xml_vendas: { status: "aprovado", files: 3, total: 48210.5 },
    xml_compras: { status: "enviado", files: 2, total: 21980.0 },
    extrato: { status: "aprovado", files: 1 },
    folha: { status: "pendente" },
  },
  c2: {
    xml_vendas: { status: "enviado", files: 2, total: 9340.9, kind: "nfse" },
    xml_compras: { status: "pendente" },
    extrato: { status: "pendente" },
    folha: { status: "pendente" },
  },
  c3: {
    xml_vendas: { status: "ajuste", files: 3, total: 31870.2, note: "Três notas vieram duplicadas no envio. Reenvie só as do mês." },
    xml_compras: { status: "pendente" },
    extrato: { status: "enviado", files: 1 },
    folha: { status: "enviado", files: 1 },
  },
  c4: {
    xml_vendas: { status: "aprovado", files: 4, total: 27500.0, kind: "nfse" },
    xml_compras: { status: "aprovado", files: 2, total: 3120.4 },
    extrato: { status: "aprovado", files: 1 },
  },
  c5: {
    xml_vendas: { status: "pendente" },
    xml_compras: { status: "pendente" },
    extrato: { status: "pendente" },
    folha: { status: "pendente" },
  },
  c6: {
    xml_vendas: { status: "aprovado", files: 5, total: 18420.75 },
    xml_compras: { status: "aprovado", files: 3, total: 9210.1 },
    extrato: { status: "enviado", files: 1 },
    folha: { status: "aprovado", files: 1 },
  },
};

function mkFiles(type: DocType, count: number, total: number | undefined, kind: "nfe" | "nfse" = "nfe", competencia: string): UploadedFile[] {
  const isXml = type === "xml_vendas" || type === "xml_compras";
  const ext = isXml ? "xml" : type === "extrato" ? "ofx" : "pdf";
  const each = isXml && total ? total / count : undefined;
  return Array.from({ length: count }, (_, i) => ({
    name: isXml ? `${kind === "nfse" ? "NFSe" : "NFe"}_${2100 + i * 7}.${ext}` : `${type}_${competencia}.${ext}`,
    size: 3000 + i * 411,
    uploadedAt: new Date(Date.now() - (i + 1) * 3600_000 * 5).toISOString(),
    kind: isXml ? kind : "outro",
    total: each ? Math.round(each * 100) / 100 : undefined,
  }));
}

export function buildSeed(): State {
  const competencia = previousCompetencia();
  const docs: DocRequest[] = [];
  for (const c of CLIENTS) {
    const plan = PLAN[c.id];
    (Object.keys(plan) as DocType[]).forEach((type) => {
      const p = plan[type]!;
      docs.push({
        id: `${c.id}-${type}`,
        clientId: c.id,
        competencia,
        type,
        status: p.status,
        files: p.files ? mkFiles(type, p.files, p.total, p.kind, competencia) : [],
        note: p.note,
      });
    });
  }
  const now = Date.now();
  const activity: Activity[] = [
    { id: "a1", ts: new Date(now - 2 * 3600_000).toISOString(), text: "Padaria Pão Quente enviou o extrato bancário" },
    { id: "a2", ts: new Date(now - 5 * 3600_000).toISOString(), text: "Farmácia Vida Plena enviou 2 XMLs de compras" },
    { id: "a3", ts: new Date(now - 26 * 3600_000).toISOString(), text: "Você pediu ajuste: Mercadinho Bom Preço (XMLs de vendas)" },
  ];
  return { competencia, clients: CLIENTS, docs, activity, role: null, activeClientId: null };
}
