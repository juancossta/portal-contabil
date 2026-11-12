import type { Client, DocRequest, UploadedFile } from "./types";

export function validateBatch(files: UploadedFile[], doc: DocRequest, client: Client): void {
  if (!files.length || files.length > 30) throw new Error("Envie de 1 a 30 arquivos por vez.");
  const fingerprints = new Set(doc.files.map(f => f.fingerprint).filter(Boolean));
  const keys = new Set(doc.files.map(f => f.fiscalKey).filter(Boolean));
  const cnpj = client.cnpj.replace(/\D/g, "");
  for (const file of files) {
    if (!file.fingerprint || !file.size || file.size > 10 * 1024 * 1024 || (file.total !== undefined && (!Number.isFinite(file.total) || file.total < 0))) throw new Error(`${file.name}: arquivo inválido.`);
    if (fingerprints.has(file.fingerprint) || (file.fiscalKey && keys.has(file.fiscalKey))) throw new Error(`${file.name}: arquivo ou nota já enviado. Remova a versão anterior para substituir.`);
    fingerprints.add(file.fingerprint);
    if (file.fiscalKey) keys.add(file.fiscalKey);
    if (doc.type.startsWith("xml_")) {
      if (!file.fiscalKey || !["nfe", "nfce", "nfse"].includes(file.kind ?? "") || file.total === undefined) throw new Error(`${file.name}: nota fiscal não reconhecida.`);
      if (file.issuedMonth !== doc.competencia) throw new Error(`${file.name}: data de emissão ausente ou diferente da competência selecionada.`);
      const owner = doc.type === "xml_vendas" ? file.issuerCnpj : file.recipientCnpj;
      if (owner !== cnpj) throw new Error(`${file.name}: CNPJ do ${doc.type === "xml_vendas" ? "emitente" : "destinatário"} ausente ou diferente deste cliente.`);
    }
  }
}
