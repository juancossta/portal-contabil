import type { DocType, UploadedFile } from "./types";

function tag(doc: Document, name: string): string | null {
  const el = doc.getElementsByTagNameNS("*", name)[0];
  return el?.textContent?.trim() || null;
}

// Lê um arquivo enviado pelo cliente. Para XMLs fiscais, extrai número e valor total.
export async function parseUpload(file: File): Promise<UploadedFile> {
  const base: UploadedFile = {
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    kind: "outro",
  };
  if (!file.name.toLowerCase().endsWith(".xml")) return base;

  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return base;

    const vNF = tag(doc, "vNF");
    if (vNF) {
      const mod = tag(doc, "mod");
      const stats = Array.from(doc.getElementsByTagNameNS("*", "cStat")).map(
        (e) => e.textContent?.trim()
      );
      return {
        ...base,
        kind: mod === "65" ? "nfce" : "nfe",
        total: parseFloat(vNF),
        number: tag(doc, "nNF") ?? undefined,
        cancelled: stats.includes("101") || stats.includes("151"),
      };
    }

    const serv = tag(doc, "vServ") ?? tag(doc, "ValorServicos") ?? tag(doc, "vLiq");
    if (serv) {
      return {
        ...base,
        kind: "nfse",
        total: parseFloat(serv.replace(",", ".")),
        number: tag(doc, "nNFSe") ?? tag(doc, "Numero") ?? undefined,
      };
    }
  } catch {
    /* arquivo ilegível: segue como "outro" */
  }
  return base;
}

// Gera um XML de NF-e simplificado para a demo (visitantes testam sem ter arquivo).
export function sampleFiles(type: DocType, seed = Date.now()): File[] {
  if (type !== "xml_vendas" && type !== "xml_compras") {
    return [new File(["demo"], "documento_demo.pdf", { type: "application/pdf" })];
  }
  const out: File[] = [];
  for (let i = 0; i < 3; i++) {
    const n = 1000 + ((seed + i * 37) % 9000);
    const valor = (((seed >> (i + 1)) % 4800) + 350 + i * 120.35).toFixed(2);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe${n}">
    <ide><mod>55</mod><nNF>${n}</nNF></ide>
    <total><ICMSTot><vNF>${valor}</vNF></ICMSTot></total>
  </infNFe></NFe>
  <protNFe><infProt><cStat>100</cStat></infProt></protNFe>
</nfeProc>`;
    out.push(new File([xml], `NFe_${n}.xml`, { type: "application/xml" }));
  }
  return out;
}
