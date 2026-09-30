// Harness: roda o <script> do index.html num DOM falso (node:vm) e confere as regras de saída da máscara EDA.
// Uso: node tests/laudo.test.mjs
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPOSE = "\n;globalThis.__t={get WORK(){return WORK;},LIB,SEED_SITES,NOTAS_PADRAO,APP_VERSION,presetText,buildLaudo,lineKind,laudoToRichHTML,laudoToPreviewHTML,v2Customizations,saveNow};";

class El {
  constructor(tag = "div", id = "") { this.tagName = tag.toUpperCase(); this.id = id; this.value = ""; this.textContent = "";
    this.style = {}; this.hidden = false; this.children = []; this._html = ""; this._opts = []; this._sel = 0;
    this.classList = { add() {}, remove() {} }; }
  set innerHTML(v) { this._html = v; this.children = [];
    if (this.tagName === "SELECT") { this._opts = [...v.matchAll(/<option value="([^"]*)"/g)].map(m => m[1]); this._sel = 0; this.value = this._opts[0] ?? ""; } }
  get innerHTML() { return this._html; }
  set selectedIndex(i) { this._sel = i; this.value = this._opts[i] ?? ""; }
  get selectedIndex() { return this._sel; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute() {} focus() {} click() {} remove() {}
  querySelector() { return null; }
}

function boot(storage) {
  const els = {};
  const document = {
    getElementById: id => els[id] || (els[id] = new El(id === "fSitio" || id === "fSeg" ? "select" : "div", id)),
    createElement: t => new El(t),
    body: new El("body"),
  };
  const localStorage = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; },
  };
  const ctx = { document, localStorage, window: { scrollTo() {}, print() {} }, navigator: {}, console,
    confirm: () => true, setTimeout: (f) => 0, clearTimeout() {}, URL: { createObjectURL: () => "", revokeObjectURL() {} }, Blob: class {} };
  vm.createContext(ctx);
  vm.runInContext(src + EXPOSE, ctx);
  return { t: ctx.__t, els };
}

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.equal(a, b, m); n++; };

// 1. Primeira abertura, navegador limpo
let st = {};
let { t, els } = boot(st);
ok(/^\d+\.\d+\.\d+$/.test(t.APP_VERSION), "APP_VERSION semver");
eq(els.appVer.textContent, "v" + t.APP_VERSION, "versão no cabeçalho");
eq(t.WORK.samples.length, 0, "rascunho vazio");
ok(els.legacyBanner.hidden, "sem banner sem v2");

// 2. Nada de Drive/backup/CRUD/DB v2 sobrou no código
for (const bad of ["accounts.google.com", "drive.appdata", "appDataFolder", "modalOpen", "btnBackup", "addPreset", "deleteSite", "DB.library", "cfgClientId"])
  ok(!html.includes(bad), "sem resíduo: " + bad);

// 3. Prefixo dos itens = "- " (preset e critérios)
const esoPreset = t.SEED_SITES.esofago.presets[0];
const txt = t.presetText(esoPreset);
ok(txt.split("\n").slice(1).every(l => l.startsWith("- ")), "bullets do preset com '- '");
for (const k of Object.keys(t.SEED_SITES)) for (const c of t.SEED_SITES[k].criterios || []) {
  for (const [, s] of c.opt || []) ok(s.startsWith("- "), `critério ${k}/${c.g} com '- '`);
  if (c.num) ok(c.num.tpl.startsWith("- "), `num ${k}/${c.g} com '- '`);
}

// 4. Laudo com 2 amostras + nota + ref
const gHp = t.SEED_SITES.gastrica.presets.find(p => /pylori/.test(p.titulo));
t.WORK.samples.push({ nome: "Mucosa esofágica", corpo: txt }, { nome: "Mucosa gástrica", corpo: t.presetText(gHp) });
t.WORK.notasSel.push(t.LIB.notas[0].id); t.WORK.refsSel.push(t.LIB.refs[0].id);
const laudo = t.buildLaudo();
const lines = laudo.split("\n");
eq(lines[0], "Materiais: Biópsias endoscópicas/colonoscópicas de: A) Mucosa esofágica, B) Mucosa gástrica.", "Materiais com ', '");
ok(lines.some(l => /^-{100}$/.test(l)), "separador ----- entre amostras");
eq(lines.filter(l => /^-{5,}$/.test(l)).length, 1, "1 separador para 2 amostras");
eq(t.lineKind("A) Mucosa esofágica:"), "b", "cabeçalho da amostra em negrito");
eq(t.lineKind("- MUCOSA ESOFÁGICA SEM ALTERAÇÕES HISTOPATOLÓGICAS SIGNIFICATIVAS:"), "b", "título em negrito");
eq(t.lineKind("- " + gHp.titulo + ":"), "b", "título com H. pylori em negrito");
eq(t.lineKind("- Ausência de hiperplasia da camada basal."), "", "item normal");
eq(t.lineKind("- Hiperplasia foveolar: Não identificada."), "", "par rótulo: valor normal");
eq(t.lineKind("NOTAS:"), "", "NOTAS: normal");
eq(t.lineKind("- " + t.LIB.notas[0].texto), "", "item de nota normal");
eq(t.lineKind("REFERÊNCIAS BIBLIOGRÁFICAS:"), "", "cabeçalho refs normal");
eq(t.lineKind("-".repeat(100)), "", "separador normal");
ok(laudo.includes("NOTAS:\n- " + t.LIB.notas[0].texto), "nota no laudo");
ok(laudo.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n- " + t.LIB.refs[0].texto), "ref no laudo");

// 5. HTML rico (clipboard)
const rich = t.laudoToRichHTML(laudo);
ok(rich.includes("font-size:8pt") && rich.includes("Arial"), "Arial 8pt");
ok(rich.includes("text-align:justify") && rich.includes("line-height:1.15") && rich.includes("color:#000000"), "justificado, 1.15, preto");
ok(rich.includes("<i>H. pylori</i>"), "H. pylori em itálico");
const nBold = (rich.match(/font-weight:bold/g) || []).length;
eq(nBold, lines.filter(l => t.lineKind(l) === "b").length, "negrito só nas linhas b");
eq(nBold, 4, "A), B) e os 2 títulos");

// 6. Rascunho sobrevive ao reload
t.saveNow();
({ t } = boot(st));
eq(t.WORK.samples.length, 2, "rascunho restaurado após reload");
eq(t.WORK.notasSel.length, 1, "nota selecionada restaurada");

// 7. Legado v2: importa laudo em montagem e detecta customizações
st = { laudoGI_db_v2: JSON.stringify({ v: 2, library: {
  siteOrder: ["esofago"], sites: { esofago: { id: "esofago", nome: "Esôfago", segmentos: ["Terço proximal", "Meu segmento"],
    presets: [{ id: "x", titulo: "MEU DIAGNÓSTICO NOVO", bullets: ["Item novo."] }], criterios: [] } },
  notas: [{ id: "a", tag: "Inespecífico", texto: t.NOTAS_PADRAO[0].texto }, { id: "b", tag: "Minha", texto: "Nota criada por mim." }],
  refs: [] },
  work: { samples: [{ nome: "Mucosa esofágica", corpo: ". item v2" }], notasSel: ["a", "b"], refsSel: [], notasFree: "livre", refsFree: "" } }) };
({ t, els } = boot(st));
eq(t.WORK.samples.length, 1, "amostra v2 importada");
eq(t.WORK.notasSel.length, 1, "nota v2 do SEED remapeada por texto");
eq(t.WORK.notasFree, "livre", "nota livre v2 importada");
const cust = t.v2Customizations();
ok(cust && cust.sites[0].presets[0].titulo === "MEU DIAGNÓSTICO NOVO", "preset custom detectado");
ok(cust.sites[0].segmentos.includes("Meu segmento") && !cust.sites[0].segmentos.includes("Terço proximal"), "só segmento custom");
eq(cust.notas.length, 1, "só a nota custom");
ok(!els.legacyBanner.hidden, "banner aparece com customização v2");
ok(st.laudoGI_db_v2, "chave v2 não é apagada");

console.log(`OK — ${n} asserts`);
