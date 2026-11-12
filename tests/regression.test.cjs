const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// Run the project's TypeScript with Node's test runner, without a second toolchain.
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    });
    module._compile(result.outputText, filename);
  };
}
const { buildSeed } = require("../lib/seed.ts");
const { reducer, revenueOf, docsOf } = require("../lib/store.tsx");
const { isState } = require("../lib/state-validation.ts");
const { sampleFiles, parseUpload, validateUpload } = require("../lib/xml.ts");
const { validateBatch } = require("../lib/upload-validation.ts");

function clientState() {
  return { ...buildSeed(), role: "cliente", activeClientId: "c5" };
}
const uploaded = { name: "nota.xml", fingerprint: "hash1", fiscalKey: "note1", size: 200, uploadedAt: new Date().toISOString(), total: 125.50, kind: "nfe" };

test("state recovery rejects invalid nested data, unknown clients and non-finite amounts", () => {
  const state = clientState();
  assert.equal(isState(state), true);
  for (const mutate of [s => s.docs[0].files = [null], s => s.docs[0].clientId = "missing", s => s.docs[0].files[0].total = NaN, s => s.activeClientId = "missing"]) {
    const broken = structuredClone(state);
    mutate(broken);
    assert.equal(isState(broken), false);
    assert.equal(reducer(state, { type: "load", state: broken }), state);
  }
});

test("repeated uploads and renamed copies do not inflate revenue", () => {
  let state = clientState();
  const docId = docsOf(state, "c5").find(d => d.type === "xml_vendas").id;
  state = reducer(state, { type: "upload", docId, files: [uploaded, uploaded] });
  state = reducer(state, { type: "upload", docId, files: [{ ...uploaded, name: "renamed.xml" }, { ...uploaded, fingerprint: "different-content" }] });
  assert.equal(revenueOf(state, "c5"), 125.50);
  assert.equal(state.docs.find(d => d.id === docId).files.length, 1);
});

test("client can remove a duplicate, resubmit and receive approval", () => {
  let state = { ...buildSeed(), role: "cliente", activeClientId: "c3" };
  const docId = docsOf(state, "c3").find(d => d.type === "xml_vendas").id;
  state = reducer(state, { type: "removeFile", docId, index: 0 });
  state = reducer(state, { type: "resubmit", docId });
  assert.equal(state.docs.find(d => d.id === docId).status, "enviado");
  state = reducer(state, { type: "setRole", role: "escritorio" });
  state = reducer(state, { type: "review", docId, result: "aprovado" });
  assert.equal(state.docs.find(d => d.id === docId).status, "aprovado");
  state = reducer(state, { type: "setRole", role: "cliente", clientId: "c3" });
  assert.equal(reducer(state, { type: "removeFile", docId, index: 0 }), state);
});

test("demo actions reject other clients and client reviews", () => {
  const state = clientState();
  const docId = state.docs.find(d => d.clientId === "c2" && d.status === "enviado").id;
  assert.equal(reducer(state, { type: "upload", docId, files: [uploaded] }), state);
  assert.equal(reducer(state, { type: "review", docId, result: "aprovado" }), state);
});

test("switching month preserves history and creates pending requests only once", () => {
  const original = clientState();
  const changed = reducer(original, { type: "setCompetencia", competencia: "2027-01" });
  assert.equal(docsOf(changed, "c5").length, 4);
  assert.ok(docsOf(changed, "c5").every(d => d.status === "pendente"));
  const repeated = reducer(changed, { type: "setCompetencia", competencia: "2027-01" });
  assert.equal(repeated.docs.length, changed.docs.length);
  const restored = reducer(changed, { type: "setCompetencia", competencia: original.competencia });
  assert.deepEqual(docsOf(restored, "c1"), docsOf(original, "c1"));
  assert.equal(isState(changed), true);
});

test("generated XMLs have positive values, correct month and company", async () => {
  for (const seed of [0, 1, 1731370000000, Date.now(), 2147483648]) {
    const files = sampleFiles("xml_vendas", seed, "2026-10", "12.345.678/0001-90");
    for (const file of files) {
      const text = await file.text();
      assert.ok(Number(text.match(/<vNF>([^<]+)/)[1]) > 0);
      assert.ok(text.includes("2026-10-01"));
      assert.ok(text.includes("12345678000190"));
    }
  }
});

test("uploads reject empty, oversized and disguised PDF files", async () => {
  await assert.rejects(parseUpload(new File([], "empty.xml")), /10 MB/);
  await assert.rejects(parseUpload(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.xml")), /10 MB/);
  await assert.rejects(parseUpload(new File(["not a PDF"], "statement.pdf")), /incompatível/);
  assert.throws(() => validateUpload(new File(["x"], "script.exe"), "extrato"), /formato/);
  assert.throws(() => validateUpload(new File(["x"], "sheet.xlsx"), "extrato"), /formato/);
});

test("sample statements and payroll pass content checks and retain stable fingerprints", async () => {
  for (const type of ["extrato", "folha"]) {
    const [file] = sampleFiles(type);
    validateUpload(file, type);
    const parsed = await parseUpload(file);
    assert.equal(parsed.fingerprint.length, 64);
    const renamed = await parseUpload(new File([await file.arrayBuffer()], `copy.${file.name.split('.').pop()}`));
    assert.equal(parsed.fingerprint, renamed.fingerprint);
  }
});

test("fiscal validation checks competence, sales issuer, purchase recipient and duplicates", () => {
  const state = clientState();
  const client = state.clients.find(c => c.id === "c5");
  const sales = docsOf(state, "c5").find(d => d.type === "xml_vendas");
  const purchases = docsOf(state, "c5").find(d => d.type === "xml_compras");
  const file = { ...uploaded, issuedMonth: state.competencia, issuerCnpj: client.cnpj.replace(/\D/g, ""), recipientCnpj: client.cnpj.replace(/\D/g, "") };
  assert.doesNotThrow(() => validateBatch([file], sales, client));
  assert.doesNotThrow(() => validateBatch([file], purchases, client));
  assert.throws(() => validateBatch([{ ...file, issuedMonth: "2000-01" }], sales, client), /competência/);
  assert.throws(() => validateBatch([{ ...file, issuerCnpj: "wrong" }], sales, client), /emitente/);
  assert.throws(() => validateBatch([{ ...file, recipientCnpj: "wrong" }], purchases, client), /destinatário/);
  assert.throws(() => validateBatch([file, { ...file, fingerprint: "different" }], sales, client), /já enviado/);
});

test("seed revenue preserves totals to the cent", () => {
  const state = buildSeed();
  assert.equal(Math.round(revenueOf(state, "c2") * 100), 934090);
  assert.equal(Math.round(revenueOf(state, "c3") * 100), 3187020);
});
