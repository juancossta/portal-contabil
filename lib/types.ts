export type Regime = "simples" | "presumido";
export type Role = "escritorio" | "cliente";

export type Client = {
  id: string;
  name: string;
  cnpj: string;
  regime: Regime;
  segment: string;
  contact: string;
  phone: string; // DDI+DDD+número
  hasEmployees: boolean;
};

export type DocType = "xml_vendas" | "xml_compras" | "extrato" | "folha";
export type DocStatus = "pendente" | "enviado" | "aprovado" | "ajuste";

export type UploadedFile = {
  name: string;
  size: number;
  uploadedAt: string; // ISO
  kind?: "nfe" | "nfce" | "nfse" | "outro";
  total?: number;
  cancelled?: boolean;
  number?: string;
};

export type DocRequest = {
  id: string;
  clientId: string;
  competencia: string; // YYYY-MM
  type: DocType;
  status: DocStatus;
  files: UploadedFile[];
  note?: string; // motivo do pedido de ajuste
};

export type Activity = {
  id: string;
  ts: string; // ISO
  text: string;
};

export type State = {
  competencia: string;
  clients: Client[];
  docs: DocRequest[];
  activity: Activity[];
  role: Role | null;
  activeClientId: string | null;
};

export const DOC_LABEL: Record<DocType, string> = {
  xml_vendas: "XMLs de vendas",
  xml_compras: "XMLs de compras",
  extrato: "Extrato bancário",
  folha: "Folha de pagamento",
};

export const DOC_HINT: Record<DocType, string> = {
  xml_vendas: "NF-e, NFC-e ou NFS-e emitidas no mês (arquivos .xml)",
  xml_compras: "NF-e de entrada / notas de fornecedores (arquivos .xml)",
  extrato: "Extrato do mês em OFX ou PDF",
  folha: "Resumo da folha e eventos do eSocial (PDF ou planilha)",
};
