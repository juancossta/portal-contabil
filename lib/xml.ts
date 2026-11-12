import type { DocType, UploadedFile } from "./types";

function tag(doc: Document, name: string): string | null {
  const el = doc.getElementsByTagNameNS("*", name)[0];
  return el?.textContent?.trim() || null;
}

// Lê um arquivo enviado pelo cliente. Para XMLs fiscais, extrai número e valor total.
export async function parseUpload(file: File): Promise<UploadedFile> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: envie um arquivo de até 10 MB, não vazio.`);
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const base: UploadedFile = {
    fingerprint: Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join(""),
    name: file.name,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    kind: "outro",
  };
  if (!file.name.toLowerCase().endsWith(".xml")) {
    const ext = file.name.toLowerCase().split(".").pop();
    const header = new TextDecoder().decode(bytes.slice(0, 2048));
    const signature = Array.from(new Uint8Array(bytes.slice(0, 8)), n => n.toString(16).padStart(2, "0")).join("");
    if ((ext === "pdf" && !header.startsWith("%PDF-")) || (ext === "ofx" && !/<OFX[\s>]/i.test(header)) || (ext === "xlsx" && !signature.startsWith("504b0304")) || (ext === "xls" && signature !== "d0cf11e0a1b11ae1") || (ext === "csv" && header.includes("\0"))) throw new Error(`${file.name}: conteúdo incompatível com o formato informado.`);
    return base;
  }

  try {
    const text = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML com declaração não permitida.");
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagNameNS("*", "parsererror").length) throw new Error("XML malformado.");
    const issued = tag(doc, "dhEmi") ?? tag(doc, "dEmi") ?? tag(doc, "DataEmissao") ?? tag(doc, "Competencia");
    base.issuedMonth = issued?.match(/^\d{4}-(?:0[1-9]|1[0-2])/)?.[0];
    const inf = doc.getElementsByTagNameNS("*", "infNFe")[0];
    base.fiscalKey = tag(doc, "chNFe") ?? inf?.getAttribute("Id")?.replace(/^NFe/, "") ?? undefined;
    const issuer = doc.getElementsByTagNameNS("*", "emit")[0] ?? doc.getElementsByTagNameNS("*", "PrestadorServico")[0];
    base.issuerCnpj = issuer?.getElementsByTagNameNS("*", "CNPJ")[0]?.textContent?.replace(/\D/g, "");
    const recipient = doc.getElementsByTagNameNS("*", "dest")[0] ?? doc.getElementsByTagNameNS("*", "TomadorServico")[0];
    base.recipientCnpj = recipient?.getElementsByTagNameNS("*", "CNPJ")[0]?.textContent?.replace(/\D/g, "");
    if (!base.fiscalKey && base.issuerCnpj) {
      const number = tag(doc, "nNFSe") ?? tag(doc, "Numero");
      if (number) base.fiscalKey = `nfse:${base.issuerCnpj}:${tag(doc, "Serie") ?? ""}:${number}`;
    }
    if (!base.fiscalKey) throw new Error("Nota sem identificação fiscal reconhecida.");

    const vNF = tag(doc, "vNF");
    if (vNF) {
      const mod = tag(doc, "mod");
      const stats = Array.from(doc.getElementsByTagNameNS("*", "cStat")).map(
        (e) => e.textContent?.trim()
      );
      return {
        ...base,
        kind: mod === "65" ? "nfce" : "nfe",
        total: fiscalAmount(vNF),
        number: tag(doc, "nNF") ?? undefined,
        cancelled: stats.includes("101") || stats.includes("151"),
      };
    }

    const serv = tag(doc, "vServ") ?? tag(doc, "ValorServicos") ?? tag(doc, "vLiq");
    if (serv) {
      return {
        ...base,
        kind: "nfse",
        total: fiscalAmount(serv),
        number: tag(doc, "nNFSe") ?? tag(doc, "Numero") ?? undefined,
      };
    }
  } catch (error) {
    throw new Error(`${file.name}: ${error instanceof Error ? error.message : "não foi possível ler o XML."}`);
  }
  throw new Error(`${file.name}: XML fiscal não reconhecido.`);
}

function fiscalAmount(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Valor fiscal inválido.");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Valor fiscal inválido.");
  return amount;
}

export function validateUpload(file: File, type: DocType) {
  const extension = file.name.toLowerCase().split(".").pop();
  const allowed = type.startsWith("xml_") ? ["xml"] : type === "extrato" ? ["pdf", "ofx"] : ["pdf", "csv", "xlsx", "xls"];
  if (!allowed.includes(extension ?? "")) throw new Error(`${file.name}: formato permitido: ${allowed.join(", ")}.`);
}

// Gera um XML de NF-e simplificado para a demo (visitantes testam sem ter arquivo).
export function sampleFiles(type: DocType, seed = Date.now(), competencia?: string, cnpj?: string, recipientCnpj?: string): File[] {
  if (type !== "xml_vendas" && type !== "xml_compras") {
    return type === "extrato"
      ? [new File(["OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><SIGNONMSGSRSV1></SIGNONMSGSRSV1></OFX>"], "extrato_demo.ofx", { type: "application/x-ofx" })]
      : [new File(["evento;valor\nSalario;2500.00\n"], "folha_demo.csv", { type: "text/csv" })];
  }
  const out: File[] = [];
  for (let i = 0; i < 3; i++) {
    const n = 1000 + ((seed + i * 37) % 9000);
    const valor = ((Math.abs(Math.floor(seed / (2 ** (i + 1)))) % 4800) + 350 + i * 120.35).toFixed(2);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe${Math.abs(seed)}${i}">
    <ide><mod>55</mod><nNF>${n}</nNF>${competencia ? `<dhEmi>${competencia}-01T12:00:00-03:00</dhEmi>` : ""}</ide>
    ${cnpj ? `<emit><CNPJ>${cnpj.replace(/\D/g, "")}</CNPJ></emit>` : ""}
    ${recipientCnpj ? `<dest><CNPJ>${recipientCnpj.replace(/\D/g, "")}</CNPJ></dest>` : ""}
    <total><ICMSTot><vNF>${valor}</vNF></ICMSTot></total>
  </infNFe></NFe>
  <protNFe><infProt><cStat>100</cStat></infProt></protNFe>
</nfeProc>`;
    out.push(new File([xml], `NFe_${n}.xml`, { type: "application/xml" }));
  }
  return out;
}
