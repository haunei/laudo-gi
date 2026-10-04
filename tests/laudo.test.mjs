// Harness: roda o <script> do index.html num DOM falso (node:vm) e confere as regras de saída da máscara EDA.
// Uso: node tests/laudo.test.mjs
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPOSE = "\n;globalThis.__t={get WORK(){return WORK;},LIB,SEED_SITES,NOTAS_PADRAO,APP_VERSION,presetText,buildLaudo,lineKind,laudoToRichHTML,laudoToPreviewHTML,v2Customizations,saveNow,CITE,EOS_VR,eosKey,eosEval,eosLine,eosNote,lieEval,lieNote,linfEval,ativGrade,ativLine,titleSetAtiv,dechCat,dechLines,titleSetDech,resolveCites,fmtNums,autoNotas,alertas};";

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
eq(t.lineKind("A) Mucosa esofágica:"), "", "cabeçalho da amostra sem negrito");
eq(t.lineKind("- MUCOSA ESOFÁGICA SEM ALTERAÇÕES HISTOPATOLÓGICAS SIGNIFICATIVAS:"), "b", "título em negrito");
eq(t.lineKind("- " + gHp.titulo + ":"), "b", "título com H. pylori em negrito");
eq(t.lineKind("- Ausência de hiperplasia da camada basal."), "", "item normal");
eq(t.lineKind("- Hiperplasia foveolar: Não identificada."), "", "par rótulo: valor normal");
eq(t.lineKind("NOTAS:"), "", "NOTAS: normal");
eq(t.lineKind("- " + t.LIB.notas[0].texto), "", "item de nota normal");
eq(t.lineKind("REFERÊNCIAS BIBLIOGRÁFICAS:"), "", "cabeçalho refs normal");
eq(t.lineKind("-".repeat(100)), "", "separador normal");
ok(laudo.includes("NOTAS:\n- " + t.LIB.notas[0].texto), "nota no laudo");
ok(laudo.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n1. " + t.LIB.refs[0].texto), "ref numerada no laudo");

// 5. HTML rico (clipboard)
const rich = t.laudoToRichHTML(laudo);
ok(rich.includes("font-size:8pt") && rich.includes("Arial"), "Arial 8pt");
ok(rich.includes("text-align:justify") && rich.includes("line-height:1.15") && rich.includes("color:#000000"), "justificado, 1.15, preto");
ok(rich.includes("<i>H. pylori</i>"), "H. pylori em itálico");
const nBold = (rich.match(/font-weight:bold/g) || []).length;
eq(nBold, lines.filter(l => t.lineKind(l) === "b").length, "negrito só nas linhas b");
eq(nBold, 2, "só os 2 títulos");

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

// 8. Contagens com valor de referência, nota de conclusão e referências numeradas
({ t } = boot({}));
eq(t.eosKey("colon", "Ceco"), "cecoasc", "ceco → ceco/ascendente");
eq(t.eosKey("colon", "Cólon descendente"), "transdesc", "descendente");
eq(t.eosKey("colon", ""), null, "cólon sem segmento não tem VR");
eq(t.eosKey("reto", ""), "sigreto", "reto");
for (const [k, c, m] of [["estomago", 26, 110], ["duodeno", 44, 185], ["ileo", 52, 220], ["cecoasc", 88, 370], ["transdesc", 71, 300], ["sigreto", 52, 220]]) {
  eq(t.EOS_VR[k].campo, c, "limiar por campo " + k); eq(t.EOS_VR[k].mm2, m, "limiar por mm² " + k);
  eq(t.eosEval(k, c), "compat", k + " no limiar = compatível"); eq(t.eosEval(k, t.EOS_VR[k].teto), "desf", k + " no teto normal = desfavorece");
  eq(t.eosEval(k, t.EOS_VR[k].teto + 1), "duv", k + " acima do normal = duvidoso");
}
eq(t.eosEval("esofago", 12), "compat", "esôfago 12 por campo"); eq(t.eosEval("esofago", 11), "desf", "esôfago 11 por campo");
ok(t.eosLine("cecoasc", 38).includes("até 38 por campo de grande aumento (160/mm²; valor de referência: limiar a partir de 370/mm² [@pap]"), "linha de eos com VR");
ok(/desfavorece/.test(t.eosNote("E", "cecoasc", 38)) && /compatível/.test(t.eosNote("E", "cecoasc", 90)) && /não é possível afirmar/.test(t.eosNote("E", "cecoasc", 60)), "3 conclusões");
eq(t.lieEval(30), "compat", "LIE 30"); eq(t.lieEval(27), "duv", "LIE 27"); eq(t.lieEval(24), "desf", "LIE 24");
eq(t.linfEval(46, 47), "compat", "linfócitos acima do limite"); eq(t.linfEval(46, 46), "desf", "linfócitos no limite");
eq(t.fmtNums([3, 1, 2]), "1-3", "faixa"); eq(t.fmtNums([2, 1]), "1,2", "par"); eq(t.fmtNums([1, 3]), "1,3", "salto");
const rc = t.resolveCites("a [@deb] b [@pap,deb] c [@xyz]");
eq(rc.txt, "a [1] b [1,2] c [@xyz]", "citações numeradas na ordem; chave desconhecida fica"); eq(rc.order.join(), "deb,pap", "ordem");
t.WORK.samples.push({ nome: "Ceco", corpo: "- COLITE CRÔNICA INATIVA:\n" + t.eosLine("cecoasc", 38), counts: [{ t: "eos", key: "cecoasc", n: 38 }] });
t.WORK.refsSel.push(t.LIB.refs[0].id);
const l8 = t.buildLaudo();
ok(l8.includes("limiar a partir de 370/mm² [1]; normal 20,3 ± 8,2 [2] e 49,5 ± 22,4 [3] por campo)."), "VR com números na linha");
ok(l8.includes("NOTAS:\n- Amostra A: a contagem de eosinófilos está abaixo do limiar"), "nota de conclusão automática com '- '");
ok(l8.includes("- Não há consenso sobre o número normal de eosinófilos") && l8.includes("[1-3]."), "nota fixa de falta de consenso");
ok(l8.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n1. " + t.CITE.pap + "\n2. " + t.CITE.deb + "\n3. " + t.CITE.iwa + "\n4. " + t.LIB.refs[0].texto), "refs numeradas: citadas e depois as escolhidas");
ok(!/\[@/.test(l8), "nenhuma marca [@] sobra no laudo");
eq(l8.split("\n").filter(x => t.lineKind(x) === "b").length, 1, "só o título em negrito");

// 9. Atividade e DECH
eq(t.ativGrade(0, 60), "INATIVA", "sem criptite"); eq(t.ativGrade(3, 60), "EM ATIVIDADE LEVE", "5%"); eq(t.ativGrade(4, 60), "EM ATIVIDADE MODERADA", ">5%");
eq(t.ativGrade(30, 60), "EM ATIVIDADE MODERADA", "50%"); eq(t.ativGrade(31, 60), "EM ATIVIDADE ACENTUADA", ">50%"); eq(t.ativGrade(5, 0), null, "sem denominador");
eq(t.ativLine(3, 60), "- Presença de criptite neutrofílica (3 de 60 criptas avaliadas; 5%).", "linha de criptite");
eq(t.titleSetAtiv("- COLITE CRÔNICA INATIVA:", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA EM ATIVIDADE LEVE:", "troca INATIVA");
eq(t.titleSetAtiv("- COLITE CRÔNICA MODERADA:", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA MODERADA, EM ATIVIDADE LEVE:", "acrescenta");
eq(t.titleSetAtiv("- COLITE CRÔNICA INATIVA (DECH POSSÍVEL – NIH/2014):", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA EM ATIVIDADE LEVE (DECH POSSÍVEL – NIH/2014):", "preserva DECH");
eq(t.dechCat(0, "sem", false), "NÃO IDENTIFICADA", "DECH 0"); eq(t.dechCat(4, "sem", false), "POSSÍVEL", "DECH 4"); eq(t.dechCat(7, "sem", false), "PROVÁVEL", "DECH 7");
eq(t.dechCat(2, "isolada", false), "PROVÁVEL", "destruição de cripta"); eq(t.dechCat(9, "contigua", true), "POSSÍVEL", "viral segura em possível");
eq(t.titleSetDech("- MUCOSA DE ÍLEO INATIVA:", "POSSÍVEL"), "- MUCOSA DE ÍLEO INATIVA (DECH POSSÍVEL – NIH/2014):", "sufixo DECH");
eq(t.titleSetDech("- MUCOSA DE ÍLEO INATIVA (DECH POSSÍVEL – NIH/2014):", "PROVÁVEL"), "- MUCOSA DE ÍLEO INATIVA (DECH PROVÁVEL – NIH/2014):", "troca categoria");
eq(t.lineKind("- MUCOSA DE ÍLEO INATIVA (DECH POSSÍVEL – NIH/2014):"), "b", "título com DECH em negrito");
const dl = t.dechLines(4, "sem", true);
ok(dl[0].includes("4 por 10 criptas contíguas") && dl[0].includes("grau 1 de Lerner [@lerner]"), "critério da cripta escrito");
eq(dl[1], "- Presença de alterações citopáticas sugestivas de ação viral (VIDE NOTA).", "ação viral");
ok(t.dechLines(8, "contigua", false).some(x => x.includes("perda de 2 ou mais criptas vizinhas; grau 3 de Lerner")), "perda contígua com critério");
t.WORK.samples.push({ nome: "Íleo", corpo: "- MUCOSA DE ÍLEO INATIVA (DECH POSSÍVEL – NIH/2014):\n" + dl.join("\n"), dech: { viral: true, sug: "POSSÍVEL", manual: "PROVÁVEL" } });
const l9 = t.buildLaudo();
ok(l9.includes("- As alterações citopáticas descritas são sugestivas de ação viral; é necessária pesquisa imuno-histoquímica"), "nota viral automática");
ok(/Categorias conforme o consenso NIH 2014 \[\d+\]\./.test(l9) && l9.includes(t.CITE.shulman), "nota e ref de DECH");
eq(t.alertas().length, 1, "alerta de categoria DECH divergente");
t.WORK.samples.push({ nome: "Reto", corpo: "- RETITE CRÔNICA INATIVA:\n- Presença de criptite neutrofílica (3 de 60 criptas avaliadas; 5%)." });
eq(t.alertas().length, 2, "alerta de título INATIVA com criptite");

// 10. Materiais: início da frase livre
t.WORK.prefixo = "Biópsia endoscópica de:";
ok(t.buildLaudo().startsWith("Materiais: Biópsia endoscópica de: A) Ceco, B) Íleo, C) Reto."), "prefixo livre e letras em ordem");

console.log(`OK — ${n} asserts`);

