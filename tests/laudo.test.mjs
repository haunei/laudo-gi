// Harness: roda o <script> do index.html num DOM falso (node:vm) e confere as regras de saída da máscara EDA.
// Uso: node tests/laudo.test.mjs
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPOSE = "\n;globalThis.__t={get WORK(){return WORK;},LIB,SEED_SITES,NOTAS_PADRAO,APP_VERSION,presetText,buildLaudo,lineKind,laudoToRichHTML,laudoToPreviewHTML,v2Customizations,saveNow,CITE,EOS_VR,eosKey,eosEval,comVR,eosNota,lieEval,lieNota,linfEval,contagens,ativGrade,ativLine,titleSetAtiv,dechTipo,dechCat,dechCatEso,dechCatGas,dechLines,dechLinesEso,dechLinesGas,titleSetDech,resolveCites,fmtNums,autoNotas,alertas,fraseEos,fraseLie,grauDoTitulo,grauDaLinha,tituloComAtiv,linhaAtiv,titleSetHp,titleSetMetaplasia,titleSetDisplasia,appendLine,concorda,HS_T,HS_L,hsTitulo,hsAchados,hsTituloPeca,hsNotas,hsAlertas,hsGrupos,hsTextos};";

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

// 8. Contagens: valor de referência dentro da linha, nota de conclusão lida do texto, referências numeradas
({ t } = boot({}));
eq(t.eosKey("colon", "Ceco"), "cecoasc", "ceco → ceco/ascendente");
eq(t.eosKey("colon", "Cólon descendente"), "transdesc", "descendente");
eq(t.eosKey("colon", ""), null, "cólon sem segmento não tem VR");
eq(t.eosKey("reto", ""), "sigreto", "reto");
eq(t.eosKey("polipo", "Cólon"), null, "pólipo sem VR");
for (const [k, c, m] of [["estomago", 26, 110], ["duodeno", 44, 185], ["ileo", 52, 220], ["cecoasc", 88, 370], ["transdesc", 71, 300], ["sigreto", 52, 220]]) {
  eq(t.EOS_VR[k].campo, c, "limiar por campo " + k); eq(t.EOS_VR[k].mm2, m, "limiar por mm² " + k);
  eq(t.eosEval(k, c), "compat", k + " no limiar = compatível"); eq(t.eosEval(k, t.EOS_VR[k].teto), "desf", k + " no teto normal = desfavorece");
  eq(t.eosEval(k, t.EOS_VR[k].teto + 1), "duv", k + " acima do normal = duvidoso");
}
eq(t.eosEval("esofago", 12), "compat", "esôfago 12 por campo"); eq(t.eosEval("esofago", 11), "desf", "esôfago 11 por campo");
const colPre = t.SEED_SITES.colon.presets.find(p => p.titulo === "COLITE CRÔNICA INATIVA");
const linhaEos = "- " + colPre.bullets.find(b => /eosinófilos\/campo/.test(b));
const comVr = t.comVR(linhaEos, "colon", "Ceco");
ok(comVr.includes("(até 7 eosinófilos/campo de grande aumento; 30/mm²; valor de referência: limiar a partir de 370/mm² [@pap]; normal 20,3 ± 8,2 [@deb] e 49,5 ± 22,4 [@iwa] por campo)."), "texto pronto de cólon ganha VR");
eq(t.comVR(comVr, "colon", "Ceco"), comVr, "não duplica o VR");
eq(t.comVR(linhaEos, "colon", ""), linhaEos, "cólon sem segmento: linha fica como está");
ok(t.comVR("- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).", "esofago", "").includes("valor de referência: a partir de 15 por 0,3 mm², cerca de 12 por campo [@agree,gio])"), "VR no esôfago");
ok(t.comVR("- Exocitose de linfócitos pequenos (até 20 linfócitos/campo de grande aumento).", "esofago", "Terço distal").includes("limite normal de 46 por campo neste nível [@putra])"), "VR de linfócitos por nível");
ok(t.comVR("- Linfocitose intraepitelial: Não identificada (exocitose de até 5 linfócitos/100 enterócitos nas pontas das vilosidades).", "duodeno", "").endsWith("nas pontas das vilosidades; valor de referência: normal até 25 [@hayat], aumentado a partir de 30)."), "VR de linfócitos no duodeno, antes do parêntese");
for (const k of Object.keys(t.SEED_SITES)) for (const p of t.SEED_SITES[k].presets) for (const b of p.bullets)
  if (/\d+ eosinófilos?\/campo/.test(b) && k !== "polipo") ok(t.comVR("- " + b, k, k === "colon" ? "Ceco" : "").includes("valor de referência"), "contagem com VR: " + k + " / " + p.titulo);
ok(/desfavorece/.test(t.eosNota("cecoasc", 38)) && /compatível/.test(t.eosNota("cecoasc", 90)) && /não é possível afirmar/.test(t.eosNota("cecoasc", 60)), "3 conclusões");
eq(t.lieEval(30), "compat", "LIE 30"); eq(t.lieEval(27), "duv", "LIE 27"); eq(t.lieEval(24), "desf", "LIE 24");
eq(t.linfEval(46, 47), "compat", "linfócitos acima do limite"); eq(t.linfEval(46, 46), "desf", "linfócitos no limite"); eq(t.linfEval(undefined, 50), "duv", "sem nível: faixa duvidosa");
eq(t.fmtNums([3, 1, 2]), "1-3", "faixa"); eq(t.fmtNums([2, 1]), "1,2", "par"); eq(t.fmtNums([1, 3]), "1,3", "salto");
const rc = t.resolveCites("a [@deb] b [@pap,deb] c [@xyz]");
eq(rc.txt, "a [1] b [1,2] c [@xyz]", "citações numeradas na ordem; chave desconhecida fica"); eq(rc.order.join(), "deb,pap", "ordem");
const corpoCeco = "- COLITE CRÔNICA INATIVA:\n" + t.comVR("- Presença de eosinófilos (até 38 eosinófilos/campo de grande aumento).", "colon", "Ceco");
t.WORK.samples.push({ nome: "Ceco", corpo: corpoCeco, site: "colon", seg: "Ceco" }, { nome: "Cólon ascendente", corpo: corpoCeco, site: "colon", seg: "Cólon ascendente" });
t.WORK.refsSel.push(t.LIB.refs[0].id);
const l8 = t.buildLaudo();
ok(l8.includes("(até 38 eosinófilos/campo de grande aumento; 160/mm²; valor de referência: limiar a partir de 370/mm² [1]; normal 20,3 ± 8,2 [2] e 49,5 ± 22,4 [3] por campo)."), "VR com números na linha");
ok(l8.includes("NOTAS:\n- Amostras A e B: a contagem de eosinófilos está abaixo do limiar"), "nota de conclusão automática, amostras iguais juntas");
ok(l8.includes("- Não há consenso sobre o número normal de eosinófilos") && l8.includes("[1-3]."), "nota fixa de falta de consenso");
ok(l8.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n1. " + t.CITE.pap + "\n2. " + t.CITE.deb + "\n3. " + t.CITE.iwa + "\n4. " + t.LIB.refs[0].texto), "refs numeradas: citadas e depois as escolhidas");
ok(!/\[@/.test(l8), "nenhuma marca [@] sobra no laudo");
eq(l8.split("\n").filter(x => t.lineKind(x) === "b").length, 2, "só os títulos em negrito");
t.WORK.samples[1].corpo = corpoCeco.replace("até 38", "até 95").replace("160/mm²", "401/mm²");
ok(/Amostra B: a contagem de eosinófilos atinge o limiar/.test(t.buildLaudo()), "nota acompanha o número editado no texto");
t.WORK.refsSel.push(t.LIB.refs.find(r => r.texto === t.CITE.pap).id);
eq(t.buildLaudo().split(t.CITE.pap).length, 2, "referência escolhida que já foi citada não duplica");
ok(t.LIB.refs.length >= 14, "mais referências para escolher");

// 9. Atividade, DECH por sítio e variantes de atividade
eq(t.ativGrade(0, 60), "INATIVA", "sem criptite"); eq(t.ativGrade(3, 60), "EM ATIVIDADE LEVE", "5%"); eq(t.ativGrade(4, 60), "EM ATIVIDADE MODERADA", ">5%");
eq(t.ativGrade(30, 60), "EM ATIVIDADE MODERADA", "50%"); eq(t.ativGrade(31, 60), "EM ATIVIDADE ACENTUADA", ">50%"); eq(t.ativGrade(5, 0), null, "sem denominador");
eq(t.ativLine(3, 60), "- Presença de infiltrado inflamatório neutrofílico leve em lâmina própria, com criptite ocasional (3 de 60 criptas avaliadas; 5%), não sendo identificados microabscessos, erosão ou ulceração (graduação pela escala de Geboes [@geboes]).", "linha de atividade leve");
ok(t.ativLine(40, 60).includes("com criptite em 40 de 60 criptas avaliadas (66,7%)"), "linha de atividade acentuada");
ok(t.ativLine(0, 60).startsWith("- Ausência de infiltrado inflamatório neutrofílico"), "sem criptite: linha de ausência");
eq(t.titleSetAtiv("- COLITE CRÔNICA INATIVA:", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA EM ATIVIDADE LEVE:", "troca INATIVA");
eq(t.titleSetAtiv("- COLITE CRÔNICA MODERADA:", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA MODERADA, EM ATIVIDADE LEVE:", "acrescenta");
eq(t.titleSetAtiv("- COLITE CRÔNICA INATIVA (DECH POSSÍVEL – NIH/2014):", "EM ATIVIDADE LEVE"), "- COLITE CRÔNICA EM ATIVIDADE LEVE (DECH POSSÍVEL – NIH/2014):", "preserva DECH");
eq(t.dechTipo("esofago"), "eso", "DECH esôfago"); eq(t.dechTipo("gastrica"), "gas", "DECH estômago"); eq(t.dechTipo("ileo"), "cripta", "DECH intestino");
eq(t.dechCat(0, "sem", false), "NÃO IDENTIFICADA", "DECH 0"); eq(t.dechCat(4, "sem", false), "POSSÍVEL", "DECH 4"); eq(t.dechCat(7, "sem", false), "PROVÁVEL", "DECH 7");
eq(t.dechCat(2, "isolada", false), "PROVÁVEL", "destruição de cripta"); eq(t.dechCat(9, "contigua", true), "POSSÍVEL", "viral segura em possível");
eq(t.dechCatEso("aus", false, false), "NÃO IDENTIFICADA", "esôfago sem achado"); eq(t.dechCatEso("foc", false, false), "POSSÍVEL", "esôfago só apoptose");
eq(t.dechCatEso("foc", true, false), "PROVÁVEL", "esôfago com disqueratóticas"); eq(t.dechCatEso("freq", true, true), "POSSÍVEL", "esôfago com ação viral");
eq(t.dechCatEso("aus", false, false, true), "POSSÍVEL", "esôfago só com úlcera");
eq(t.dechCatGas(0, false, false), "NÃO IDENTIFICADA", "estômago sem achado"); eq(t.dechCatGas(1, false, false), "POSSÍVEL", "estômago abaixo do limiar");
eq(t.dechCatGas(2, false, false), "PROVÁVEL", "estômago no limiar"); eq(t.dechCatGas(1, true, false), "PROVÁVEL", "estômago com perda glandular"); eq(t.dechCatGas(5, false, true), "POSSÍVEL", "estômago com ação viral");
ok(t.dechLinesEso("foc", true, false, false).some(x => x.includes("células disqueratóticas")), "linhas do esôfago");
ok(t.dechLinesGas(3, true, false)[0].includes("3 por 10 fovéolas contíguas; limiar: 2 ou mais [@mostafa]"), "linhas do estômago");
ok(t.dechLinesEso("aus", false, false, false, true).includes("- Presença de área de ulceração."), "úlcera no esôfago");
ok(!html.includes("btnRegenerar"), "botão Regenerar removido");
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
t.WORK.samples.push({ nome: "Sigmoide", corpo: "- COLITE CRÔNICA EM ATIVIDADE MODERADA:\n- " + t.SEED_SITES.colon.criterios.find(c => c.g === "Infiltrado neutrofílico").opt[3][1].slice(2) });
eq(t.alertas().length, 3, "alerta de grau do título diferente do grau da linha");
t.WORK.samples.pop();
for (const [k, base] of [["esofago", "ESOFAGITE CRÔNICA"], ["gastrica", "GASTRITE CRÔNICA"], ["duodeno", "DUODENITE CRÔNICA"], ["ileo", "ILEÍTE CRÔNICA"], ["colon", "COLITE CRÔNICA"], ["reto", "RETITE CRÔNICA"]])
  for (const g of (k === "esofago" ? ["INATIVA", "EM ATIVIDADE", "EM ATIVIDADE, EROSIVA"] : k === "duodeno" ? ["INATIVA", "EM ATIVIDADE"] : ["INATIVA", "EM ATIVIDADE LEVE", "EM ATIVIDADE MODERADA", "EM ATIVIDADE ACENTUADA"]))
    ok(t.SEED_SITES[k].presets.some(p => p.titulo.startsWith(base) && p.titulo.includes(g)), k + ": " + base + " " + g);
ok(!t.SEED_SITES.esofago.presets.some(p => /EM ATIVIDADE (LEVE|MODERADA|ACENTUADA)/.test(p.titulo)), "esôfago sem graus de atividade");
ok(!t.SEED_SITES.esofago.presets.some(p => /CRÔNICA (LEVE|MODERADA|ACENTUADA)/.test(p.titulo)), "esôfago sem grau de cronicidade");
ok(!/ATIVIDADE (LEVE|MODERADA|ACENTUADA)|neutrofílico (leve|moderado|acentuado)/.test(JSON.stringify(t.SEED_SITES.duodeno)), "duodeno sem grau de atividade");
for (const k of ["ileo", "colon", "reto"]) for (const p of t.SEED_SITES[k].presets) {
  const m = p.titulo.match(/ATIV(?:IDADE|A) (LEVE|MODERADA|ACENTUADA)/), nl = p.bullets.find(b => /infiltrado inflamatório neutrofílico/.test(b));
  if (m) ok(nl.includes("neutrofílico " + { LEVE: "leve", MODERADA: "moderado", ACENTUADA: "acentuado" }[m[1]] + " em") && nl.includes("[@geboes]"), k + ": linha de neutrófilos segue o título: " + p.titulo);
  else if (nl) ok(nl.startsWith("Ausência"), k + ": sem atividade no título, linha de ausência: " + p.titulo);
}
ok(!/neutrofílico leve\/moderado/.test(JSON.stringify(t.SEED_SITES)), "sem 'leve/moderado' fora da escala");
eq(t.SEED_SITES.colon.criterios.find(c => c.g === "Infiltrado neutrofílico").opt.length, 4, "achados de neutrófilos nos quatro níveis da escala");
ok(t.SEED_SITES.gastrica.criterios.find(c => c.g === "Hiperplasia foveolar").opt[1][1].includes("[@dixon86]"), "hiperplasia foveolar graduada cita a referência");
for (const k of ["duodeno", "ileo"]) ok(!/levemente|moderadamente|severamente|linfoplasmocitário leve/.test(JSON.stringify(t.SEED_SITES[k])), k + " sem grau de celularidade");
ok(!/Espongiose (leve|moderada|acentuada)/.test(JSON.stringify(t.SEED_SITES.esofago)), "espongiose sem três graus");
eq(t.SEED_SITES.esofago.presets.filter(p => p.titulo === "ESOFAGITE CRÔNICA INATIVA").length, 1, "sem título duplicado");
ok(t.SEED_SITES.gastrica.presets.find(p => p.titulo === "GASTRITE CRÔNICA EM ATIVIDADE MODERADA").bullets.some(b => b.includes("[@sydney]")), "atividade gástrica cita o Sydney");
ok(!t.SEED_SITES.gastrica.presets.find(p => p.titulo === "GASTRITE CRÔNICA INATIVA").bullets.some(b => b.includes("[@sydney]")), "inativa não cita");
ok(!t.SEED_SITES.reto.presets.some(p => /COLITE|COLÔNICA|COLOPATIA|RETOPATIA/.test(p.titulo)), "reto sem títulos de cólon");
ok(t.SEED_SITES.reto.presets.some(p => p.titulo.startsWith("RETITE DE PADRÃO LINFOCITÁRIO")), "retite de padrão linfocitário");
eq(t.SEED_SITES.reto.presets.length, t.SEED_SITES.colon.presets.length + 1, "reto tem todas as opções do cólon");
ok(t.SEED_SITES.gastrica.segmentos.includes("Cárdia"), "cárdia nos segmentos do estômago");
ok(t.SEED_SITES.polipo.presets.length >= 7, "pólipos presentes");
ok(!JSON.stringify(t.SEED_SITES.colon).includes("Arquitetura alterada"), "cólon usa 'Arquitetura glandular alterada'");
const arq = t.SEED_SITES.colon.criterios.find(c => c.stack);
ok(arq && arq.stack.pre === "- Arquitetura glandular alterada: " && arq.stack.itens.length >= 8, "arquitetura em pilha");
ok(t.SEED_SITES.colon.criterios.some(c => /Plasmocitose em base/.test(c.g)), "plasmocitose basal nos achados");
const mi = t.SEED_SITES.gastrica.criterios.find(c => c.combo);
eq(mi.combo.monta(["completa", "acentuada"]), "- Metaplasia intestinal: Presente, completa, acentuada.", "metaplasia com tipo e grau");
eq(mi.combo.depois(["completa", "acentuada"]), "- Atrofia: Presente, acentuada.", "atrofia acompanha o grau da metaplasia");
const hb = t.SEED_SITES.esofago.criterios.find(c => c.combo && /basal/.test(c.g));
ok(hb.combo.monta(["leve (x)", "papilar"]).startsWith("- Hiperplasia papilar da camada basal leve"), "hiperplasia basal com modificador papilar");

// 10. Materiais: início da frase livre
t.WORK.prefixo = "Biópsia endoscópica de:";
ok(t.buildLaudo().startsWith("Materiais: Biópsia endoscópica de: A) Ceco, B) Cólon ascendente, C) Íleo, D) Reto."), "prefixo livre e letras em ordem");

// 11. v3.2: sincronização número/grau/critério -> frase e título
({ t, els } = boot({}));
const E = (n) => "- Celularidade aumentada de leucócitos mononucleares em lâmina própria, não sendo identificada eosinofilia (até " + n + " eosinófilos/campo de grande aumento).";
for (const [site, seg, k] of [["gastrica", "", "estomago"], ["duodeno", "", "duodeno"], ["ileo", "", "ileo"], ["colon", "Ceco", "cecoasc"], ["colon", "Cólon transverso", "transdesc"], ["reto", "", "sigreto"]]) {
  const v = t.EOS_VR[k];
  ok(t.fraseEos(E(v.teto), site, seg).includes(", não sendo identificada eosinofilia (até " + v.teto), k + ": até o máximo normal");
  ok(t.fraseEos(E(v.teto + 1), site, seg).includes(", com presença de eosinófilos (até " + (v.teto + 1)), k + ": acima do normal");
  ok(t.fraseEos(E(v.campo), site, seg).includes(", com presença de eosinofilia (até " + v.campo), k + ": no limiar");
}
eq(t.fraseEos("- Não sendo identificada eosinofilia (até 60 eosinófilos/campo de grande aumento).", "duodeno", ""), "- Presença de eosinofilia (até 60 eosinófilos/campo de grande aumento).", "linha isolada do duodeno");
eq(t.fraseEos("- Presença de eosinófilos (até 3 eosinófilos/campo de grande aumento).", "colon", "Ceco"), "- Não foi identificada eosinofilia (até 3 eosinófilos/campo de grande aumento).", "linha isolada do cólon");
eq(t.fraseEos(E(90), "colon", ""), E(90), "cólon sem segmento não muda");
eq(t.fraseEos("- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).", "esofago", ""), "- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).", "esôfago não usa essas frases");
ok(t.fraseEos(", e presença de eosinófilos (até 95 eosinófilos/campo de grande aumento; 84/mm²; valor de referência: x)", "colon", "Ceco").includes(", com presença de eosinofilia (até 95 eosinófilos/campo de grande aumento; 401/mm²;"), "frase e mm² acompanham o número editado");
for (const k of Object.keys(t.SEED_SITES)) for (const p of t.SEED_SITES[k].presets) for (const b of p.bullets) {
  const m = /(\d+) eosinófilos?\/campo/.exec(b), key = t.eosKey(k, k === "colon" ? "Ceco" : "");
  if (m && key && key !== "esofago" && /eosinofilia|presença de eosinófilos/i.test(b)) {
    const st = t.eosEval(key, +m[1]), r = t.fraseEos("- " + b, k, k === "colon" ? "Ceco" : "");
    ok({ desf: /identificada eosinofilia/, duv: /presença de eosinófilos/i, compat: /presença de eosinofilia/i }[st].test(r), "texto pronto coerente com a contagem: " + k + " / " + p.titulo);
  }
}
const L = (w, n) => "- Linfocitose intraepitelial: " + w + n + " linfócitos/100 enterócitos nas pontas das vilosidades).";
ok(t.fraseLie(L("Presente (exocitose de aproximadamente ", 12), "duodeno").startsWith("- Linfocitose intraepitelial: Não identificada (exocitose de até 12"), "LIE 12");
ok(t.fraseLie(L("Presente (exocitose de aproximadamente ", 27), "duodeno").startsWith("- Linfocitose intraepitelial: Limítrofe (exocitose de aproximadamente 27"), "LIE 27");
ok(t.fraseLie(L("Não identificada (exocitose de até ", 40), "duodeno").startsWith("- Linfocitose intraepitelial: Presente (exocitose de aproximadamente 40"), "LIE 40");
eq(t.fraseLie(L("Presente (exocitose de aproximadamente ", 12), "ileo"), L("Presente (exocitose de aproximadamente ", 12), "LIE só no duodeno");
ok(!t.SEED_SITES.duodeno.criterios.find(c => /Linfocitose intraepitelial/.test(c.g)).num.alt, "LIE com um campo só");
eq(t.grauDoTitulo("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA:"), "EM ATIVIDADE MODERADA", "grau do título");
eq(t.grauDoTitulo("- RETITE ATIVA LEVE:"), "EM ATIVIDADE LEVE", "grau em 'ativa leve'");
eq(t.grauDoTitulo("- ESOFAGITE CRÔNICA EM ATIVIDADE, EROSIVA:"), "EM ATIVIDADE", "atividade sem grau");
eq(t.grauDoTitulo("- MUCOSA GÁSTRICA SEM ALTERAÇÕES:"), null, "título sem atividade");
const gNeutro = t.SEED_SITES.gastrica.criterios.find(c => c.g === "Infiltrado neutrofílico").opt;
eq(t.grauDaLinha(gNeutro[0][1]), "INATIVA", "linha ausente"); eq(t.grauDaLinha(gNeutro[2][1]), "EM ATIVIDADE MODERADA", "linha moderada");
eq(t.tituloComAtiv("- GASTRITE CRÔNICA INATIVA:", "EM ATIVIDADE MODERADA"), "- GASTRITE CRÔNICA EM ATIVIDADE MODERADA:", "critério -> título");
eq(t.tituloComAtiv("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:", "INATIVA"), "- GASTRITE CRÔNICA INATIVA, ASSOCIADA A H. pylori:", "critério ausente -> título");
eq(t.tituloComAtiv("- MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM ALTERAÇÕES HISTOPATOLÓGICAS SIGNIFICATIVAS:", "INATIVA"), "- MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM ALTERAÇÕES HISTOPATOLÓGICAS SIGNIFICATIVAS:", "título não inflamatório não muda");
eq(t.tituloComAtiv("- RETITE ATIVA LEVE:", "EM ATIVIDADE ACENTUADA"), "- RETITE ATIVA ACENTUADA:", "convenção 'ativa' preservada");
eq(t.linhaAtiv("gastrica", "EM ATIVIDADE MODERADA"), gNeutro[2][1].slice(2), "título -> linha (estômago)");
ok(t.linhaAtiv("colon", "EM ATIVIDADE LEVE").includes("criptite ocasional"), "título -> linha (cólon)");
ok(t.linhaAtiv("esofago", "EM ATIVIDADE", "- ESOFAGITE CRÔNICA EM ATIVIDADE, EROSIVA:").includes("erosão (necrose"), "título -> linha (esôfago erosiva)");
eq(t.linhaAtiv("duodeno", "EM ATIVIDADE"), t.SEED_SITES.duodeno.criterios.find(c => c.g === "Infiltrado neutrofílico").opt[1][1].slice(2), "título -> linha (duodeno)");
eq(t.titleSetHp("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA:", true), "- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:", "H. pylori no título");
eq(t.titleSetHp("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori (DECH POSSÍVEL – NIH/2014):", false), "- GASTRITE CRÔNICA EM ATIVIDADE MODERADA (DECH POSSÍVEL – NIH/2014):", "H. pylori negativa tira o trecho e preserva DECH");
eq(t.titleSetHp("- GASTRITE CRÔNICA INATIVA, ASSOCIADA A H. pylori:", true), "- GASTRITE CRÔNICA INATIVA, ASSOCIADA A H. pylori:", "não duplica");
eq(t.titleSetHp("- MUCOSA GÁSTRICA SEM ALTERAÇÕES:", true), "- MUCOSA GÁSTRICA SEM ALTERAÇÕES:", "só em gastrite");
eq(t.lineKind("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:"), "b", "título com H. pylori segue em negrito");
eq(t.titleSetMetaplasia("- GASTRITE CRÔNICA INATIVA:", "- Metaplasia intestinal: Presente, incompleta, moderada."), "- GASTRITE CRÔNICA INATIVA, COM METAPLASIA INTESTINAL INCOMPLETA E MODERADA:", "metaplasia entra no título");
eq(t.titleSetMetaplasia("- GASTRITE CRÔNICA COM METAPLASIA INTESTINAL COMPLETA E ACENTUADA, SEM DISPLASIA, INATIVA (VIDE NOTAS):", "- Metaplasia intestinal: Presente, incompleta, leve."), "- GASTRITE CRÔNICA COM METAPLASIA INTESTINAL INCOMPLETA E LEVE, SEM DISPLASIA, INATIVA (VIDE NOTAS):", "metaplasia troca no título");
eq(t.titleSetMetaplasia("- GASTRITE CRÔNICA COM METAPLASIA INTESTINAL COMPLETA E ACENTUADA, SEM DISPLASIA, INATIVA (VIDE NOTAS):", "- Metaplasia intestinal: Não identificada."), "- GASTRITE CRÔNICA, SEM DISPLASIA, INATIVA (VIDE NOTAS):", "metaplasia sai do título");
eq(t.titleSetDisplasia("- PÓLIPO JUVENIL, SEM DISPLASIA:", "- Displasia: Presente, de baixo grau."), "- PÓLIPO JUVENIL, COM DISPLASIA DE BAIXO GRAU:", "displasia troca no título");
eq(t.titleSetDisplasia("- ADENOMA TUBULAR COM DISPLASIA DE BAIXO GRAU:", "- Displasia: Presente, de alto grau."), "- ADENOMA TUBULAR COM DISPLASIA DE ALTO GRAU:", "displasia de alto grau");
eq(t.titleSetDisplasia("- GASTRITE CRÔNICA INATIVA:", "- Displasia: Não identificada."), "- GASTRITE CRÔNICA INATIVA:", "displasia só troca trecho existente");
// editor: critério -> título, H. pylori, e título -> critério
els.fSitio.value = "gastrica"; els.fSeg.value = "";
els.corpo.value = "- GASTRITE CRÔNICA INATIVA:\n" + gNeutro[0][1];
t.appendLine(gNeutro[2][1]);
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA:"), "editor: marcar atividade moderada muda o título");
eq(els.corpo.value.split("\n").filter(l => /neutrof/.test(l)).length, 1, "editor: uma linha de neutrófilos só");
t.appendLine("- Pesquisa para H. pylori: Positiva (+2/+3).");
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:"), "editor: H. pylori positiva entra no título com o grau");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("EM ATIVIDADE MODERADA", "EM ATIVIDADE ACENTUADA");
els.corpo.onchange();
ok(els.corpo.value.includes(gNeutro[3][1]) && !els.corpo.value.includes(gNeutro[2][1]), "editor: mudar o título muda a linha de neutrófilos");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace(gNeutro[3][1], gNeutro[1][1]);
els.corpo.onchange();
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, ASSOCIADA A H. pylori:"), "editor: mudar a linha à mão muda o título");
t.appendLine("- Pesquisa para H. pylori: Negativa.");
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE:"), "editor: H. pylori negativa tira o trecho");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco";
els.corpo.value = "- COLITE CRÔNICA INATIVA:";
t.appendLine("- Presença de eosinófilos (até 7 eosinófilos/campo de grande aumento).");
ok(els.corpo.value.includes("- Não foi identificada eosinofilia (até 7 eosinófilos/campo de grande aumento; 30/mm²;"), "editor: frase pela contagem ao inserir");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("até 7 eos", "até 95 eos");
els.corpo.onchange();
ok(els.corpo.value.includes("- Presença de eosinofilia (até 95 eosinófilos/campo de grande aumento; 401/mm²;"), "editor: mudar a contagem muda o descritivo e o mm²");
els.corpo.value = "";
// dados novos
ok(t.SEED_SITES.gastrica.segmentos.includes("Transição corpo-antro"), "segmento de transição corpo-antro");
ok(t.SEED_SITES.gastrica.criterios.find(c => /Amostragem/.test(c.g)).opt.some(o => o[1] === "- Amostragem: Mucosa gástrica de transição corpo-antro."), "amostragem de transição corpo-antro");
for (const k of ["esofago", "gastrica", "duodeno", "ileo", "colon", "reto"]) {
  const a = t.SEED_SITES[k].criterios.find(c => c.g === "Eosinófilos: achados associados");
  ok(a && a.stack.itens.some(i => /degranulação/.test(i[1])) && a.stack.itens.some(i => /microabscessos eosinofílicos/.test(i[1])), k + ": degranulação e microabscessos eosinofílicos");
}
ok(!t.SEED_SITES.polipo.criterios.some(c => /achados associados/.test(c.g)), "pólipo sem grupo de eosinófilos");
const lp = t.SEED_SITES.esofago.criterios.filter(c => /^Lâmina própria superficial$|^Infiltrado inflamatório na lâmina própria$/.test(c.g));
eq(lp.length, 2, "esôfago: dois campos independentes de lâmina própria");
eq(lp[0].opt.length + lp[1].opt.length, 4, "representada/não representada e presente/ausente");
ok(!t.SEED_SITES.gastrica.criterios.some(c => /^Lâmina própria superficial$/.test(c.g)), "só no esôfago");
const nG = t.LIB.notas.find(x => x.texto === "Não foram identificados granulomas em nenhuma das amostras examinadas."), nD = t.LIB.notas.find(x => x.texto === "Não foi identificada displasia em nenhuma das amostras examinadas.");
ok(nG && nD, "notas novas de granulomas e de displasia");
t.WORK.samples.push({ nome: "Ceco", corpo: "- COLITE CRÔNICA INATIVA:" }); t.WORK.notasSel.push(nG.id, nD.id);
ok(t.buildLaudo().includes("NOTAS:\n- " + nG.texto + "\n- " + nD.texto), "notas em linhas separadas com '- '");
t.WORK.samples.push({ nome: "Duodeno", corpo: "- DUODENITE:\n- Linfocitose intraepitelial: Não identificada (exocitose de até 5 linfócitos/100 enterócitos).\n- Classificação de Marsh-Oberhuber (1999): 3A." },
  { nome: "Antro", corpo: "- GASTRITE:\n- Metaplasia intestinal: Presente, completa, leve.\n- Atrofia: Presente, leve.\n- Classificação OLGIM: Estágio 0.\n- Classificação OLGA: Estágio 0." });
eq(t.alertas().length, 3, "alertas de Marsh, OLGIM e OLGA incoerentes");
// tema e DECH recolhível
ok(!/prefers-color-scheme/.test(html), "tema não segue o sistema");
ok(html.includes(':root[data-tema="claro"]') && html.includes('id="temaSel"'), "tema claro e seletor");
const st2 = {}; ({ t, els } = boot(st2));
eq(els.temaSel.value, "escuro", "tema padrão escuro");
els.temaSel.value = "claro"; els.temaSel.onchange();
eq(st2.laudoGI_tema, '"claro"', "escolha do tema gravada");
els.dechDet.open = true; els.dechDet.ontoggle();
({ t, els } = boot(st2));
eq(els.temaSel.value, "claro", "tema persiste ao recarregar");
eq(els.dechDet.open, true, "DECH aberto é lembrado");
ok(html.indexOf('id="sampleList"') > html.indexOf('id="refsFree"'), "pilha de amostras no fim, depois das referências");
ok(html.indexOf('id="critBox"') < html.indexOf('id="corpo"') && html.includes('<details class="subpanel dech" id="dechDet">'), "achados antes do editor; DECH recolhível");

// 12. H. pylori sempre em itálico (título e itens, qualquer grafia)
({ t, els } = boot({}));
const hpTxt = "Materiais: x.\n \nA) Antro:\n- GASTRITE CRÔNICA EM ATIVIDADE LEVE, ASSOCIADA A H. PYLORI:\n- Pesquisa para H. pylori: Positiva (+1).\n- Bacilos compatíveis com Helicobacter pylori.\n- Pesquisa para H.pylori: Negativa.";
const hpRich = t.laudoToRichHTML(hpTxt), hpPrev = t.laudoToPreviewHTML(hpTxt);
for (const h of [hpRich, hpPrev]) {
  ok(h.includes("ASSOCIADA A <i>H. PYLORI</i>:"), "título em maiúsculas com itálico");
  ok(h.includes("Pesquisa para <i>H. pylori</i>: Positiva"), "item com itálico");
  ok(h.includes("<i>Helicobacter pylori</i>") && h.includes("<i>H.pylori</i>"), "outras grafias com itálico");
  ok(!h.includes("<i><i>"), "sem itálico duplicado");
  eq((h.match(/<i>/g) || []).length, 4, "as 4 ocorrências em itálico");
}
eq(t.lineKind("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, ASSOCIADA A H. PYLORI:"), "b", "título com H. PYLORI segue título");
for (const k of Object.keys(t.SEED_SITES)) for (const p of t.SEED_SITES[k].presets)
  if (/pylori/i.test(p.titulo + p.bullets.join(" "))) {
    const h = t.laudoToRichHTML(t.presetText(p));
    eq((h.match(/<i>H\. ?pylori<\/i>/gi) || []).length, (t.presetText(p).match(/H\. ?pylori/gi) || []).length, "todo H. pylori do texto pronto em itálico: " + p.titulo);
  }

// 13. Concordância de número e gênero
({ t, els } = boot({}));
for (const [antes, depois] of [
  ["- Agregado linfoides: Presente.", "- Agregado linfoide: Presente."],
  ["- Agregados linfoide: Presente.", "- Agregados linfoides: Presentes."],
  ["- Não foi identificados granulomas.", "- Não foram identificados granulomas."],
  ["- Não foram evidenciado displasia.", "- Não foi evidenciada displasia."],
  ["- Presença de corpo apoptóticos.", "- Presença de corpo apoptótico."],
  ["- Criptas hipertrófico e glândulas dilatado.", "- Criptas hipertróficas e glândulas dilatadas."],
  ["- Linfangiectasias: Não identificado.", "- Linfangiectasias: Não identificadas."],
  ["- Não sendo identificados eosinofilia.", "- Não sendo identificada eosinofilia."],
  ["- Exocitose de eosinófilos (até 1 eosinófilos/campo de grande aumento).", "- Exocitose de eosinófilos (até 1 eosinófilo/campo de grande aumento)."],
  ["- Presença de eosinófilos (até 2 eosinófilo/campo de grande aumento).", "- Presença de eosinófilos (até 2 eosinófilos/campo de grande aumento)."],
  ["- AGREGADOS LINFOIDE, EM MUCOSA RETAL:", "- AGREGADOS LINFOIDES, EM MUCOSA RETAL:"],
  ["- Alterações citopático sugestivas de ação viral.", "- Alterações citopáticas sugestivas de ação viral."],
]) eq(t.concorda(antes).text, depois, "concordância: " + antes);
eq(t.concorda("- Hiperplasia de células caliciformes focal.").trocas.length, 0, "adjetivo distante não é tocado");
eq(t.concorda("- Texto livre com palavras fora do vocabulário: mucosas edemaciado.").trocas.length, 0, "fora do vocabulário não mexe");
const libCG = new Set();
for (const k of Object.keys(t.SEED_SITES)) { const st3 = t.SEED_SITES[k];
  st3.presets.forEach(p => t.presetText(p).split("\n").forEach(l => libCG.add(l)));
  (st3.criterios || []).forEach(c => { (c.opt || []).forEach(o => libCG.add(o[1])); if (c.num) libCG.add(c.num.tpl.replace("{n}", "5")); }); }
t.NOTAS_PADRAO.forEach(x => libCG.add("- " + x.texto));
for (const l of libCG) eq(t.concorda(l).trocas.join(), "", "biblioteca já concorda: " + l.slice(0, 60));
els.fSitio.value = "colon"; els.fSeg.value = "Ceco";
els.corpo.value = "- COLITE CRÔNICA INATIVA:\n- Agregado linfoides: Presente.";
els.corpo.onfocus(); els.corpo.onchange();
ok(els.corpo.value.endsWith("- Agregado linfoide: Presente."), "editor corrige a concordância ao sair do campo");
ok(/Concordância: Agregado linfoides → Agregado linfoide/.test(els.toast.textContent), "aviso mostra o que foi trocado");
ok(html.includes('id="corpo" rows="10" spellcheck="true" lang="pt-BR"'), "ortografia do navegador ligada no editor");

// 14. Chave "Referências: com / sem"
const st4 = {}; ({ t, els } = boot(st4));
const corpoRef = "- COLITE CRÔNICA INATIVA:\n" + t.comVR("- Presença de eosinófilos (até 38 eosinófilos/campo de grande aumento).", "colon", "Ceco");
t.WORK.samples.push({ nome: "Ceco", corpo: corpoRef, site: "colon", seg: "Ceco" });
t.WORK.refsSel.push(t.LIB.refs[0].id); t.WORK.refsFree = "Ref livre.";
const comRefs = t.buildLaudo();
ok(/\[1\]/.test(comRefs) && comRefs.includes("REFERÊNCIAS BIBLIOGRÁFICAS:") && comRefs.includes("Ref livre."), "com referências: números e lista");
eq(els.btnRefs.textContent, "Referências: com", "rótulo da chave");
els.btnRefs.onclick();
const semRefs = t.buildLaudo();
ok(!/\[\d+(?:[-,]\d+)*\]/.test(semRefs) && !/\[@/.test(semRefs), "sem referências: nenhum número ou marca no texto");
ok(!semRefs.includes("REFERÊNCIAS BIBLIOGRÁFICAS:") && !semRefs.includes(t.CITE.pap) && !semRefs.includes("Ref livre."), "sem referências: sem lista (citadas, escolhidas ou livres)");
ok(semRefs.includes("valor de referência: limiar a partir de 370/mm²; normal 20,3 ± 8,2 e 49,5 ± 22,4 por campo)."), "valor de referência continua, sem os números");
ok(semRefs.includes("NOTAS:\n- Amostra A: a contagem de eosinófilos está abaixo do limiar de consenso para o ceco/cólon ascendente e dentro da faixa descrita em crianças sem doença: o achado desfavorece"), "nota de conclusão continua, sem os números");
ok(!/ [.,;:)]| {2}/.test(semRefs.split("\n").filter(l => l.trim()).join("\n")), "sem espaço sobrando onde havia número");
eq(els.btnRefs.textContent, "Referências: sem", "rótulo muda");
ok(!els.refsAviso.hidden, "aviso no painel de referências");
({ t, els } = boot(st4));
ok(t.WORK.semRefs === true && els.btnRefs.textContent === "Referências: sem", "escolha persiste ao recarregar");
eq(t.buildLaudo(), semRefs, "mesma saída após recarregar");
els.btnRefs.onclick();
eq(t.buildLaudo(), comRefs, "religar devolve o laudo original");
t.WORK.notasSel.push(t.LIB.notas.find(x => /Vide referências bibliográficas/.test(x.texto)).id);
eq(t.alertas().length, 0, "com referências: sem alerta");
els.btnRefs.onclick();
eq(t.alertas().length, 1, "sem referências: alerta para nota que manda ver as referências");

// 15. Hirschsprung: título pelos achados, notas, alertas
({ t, els } = boot({}));
const H = t.HS_T, A = (o) => t.hsTitulo(Object.assign({ adeq: "ok", gang: null, nerv: false, cal: null, ctrl: false }, o));
eq(A({ adeq: "inad", gang: "nao" }), H.inad, "linha 1: inadequada");
eq(A({ adeq: "inad", gang: "nao", cal: "pres" }), H.inad, "linha 1: inadequada com calretinina preservada");
eq(A({ adeq: "inad", gang: "nao", cal: "aus" }), H.inadCal, "linha 2: inadequada com calretinina ausente");
eq(A({ gang: "pres", cal: "pres" }), H.gang, "linha 3: gânglios presentes");
eq(A({ gang: "pres" }), H.gang, "linha 3: gânglios presentes sem calretinina");
eq(A({ gang: "pres", cal: "aus" }), H.gangCorr, "linha 4: gânglios + calretinina ausente");
eq(A({ gang: "pres", cal: "esp" }), H.gangCorr, "linha 4: gânglios + calretinina esparsa");
eq(A({ gang: "pres", cal: "pres", nerv: true }), H.gangCorr, "linha 4: gânglios + nervos hipertróficos");
eq(A({ gang: "duv", cal: "aus", ctrl: true }), H.duv, "linha 5: gânglios duvidosos");
eq(A({ gang: "nao", cal: "aus", ctrl: true }), H.agang, "linha 6: aganglionose");
eq(A({ gang: "nao", cal: "aus", ctrl: true, nerv: true }), H.agang, "linha 6: aganglionose com nervos");
eq(A({ gang: "nao", cal: "pres" }), H.inconc, "linha 7: calretinina preservada");
eq(A({ gang: "nao", cal: "esp" }), H.inconc, "linha 7: calretinina esparsa");
eq(A({ gang: "nao", cal: "sub" }), H.inconc, "linha 7: só em nervos submucosos");
eq(A({ gang: "nao" }), H.pend, "linha 8: calretinina não realizada");
eq(A({ gang: "nao", cal: "aus", ctrl: false }), H.pend, "linha 8: calretinina ausente sem controle interno");
eq(A({}), null, "sem dado de células ganglionares não há título");
for (const k of Object.keys(H)) eq(t.lineKind("- " + H[k] + ":"), "b", "título reconhecido: " + k);
const hsSite = t.SEED_SITES.hirschsprung;
eq(hsSite.segmentos.length, 5, "tipos de espécime");
for (const p of hsSite.presets) {
  const corpo = t.presetText(p), esp = t.hsTitulo(t.hsAchados(corpo)) || t.hsTituloPeca(corpo);
  if (esp && /^(BIÓPSIA RETAL|CÉLULAS GANGLIONARES PRESENTES|AGANGLIONOSE EM BIÓPSIA RETAL|DOENÇA DE HIRSCHSPRUNG:)/.test(p.titulo)) eq(p.titulo, esp, "texto pronto coerente com a regra: " + p.titulo.slice(0, 40));
  eq(t.lineKind("- " + p.titulo + ":"), "b", "título do texto pronto em negrito: " + p.titulo.slice(0, 40));
}
ok(hsSite.presets.filter(p => t.hsTitulo(t.hsAchados(t.presetText(p)))).length >= 6, "textos prontos da biópsia cobertos pela regra");
const peca = "- X:\n- Segmento aganglionar: 8 cm.\n";
eq(t.hsTituloPeca(peca + "- " + t.HS_L.margS), "DOENÇA DE HIRSCHSPRUNG: SEGMENTO AGANGLIONAR DE 8 CM; MARGEM PROXIMAL SEM ACHADOS DE ZONA DE TRANSIÇÃO", "peça com margem livre");
eq(t.hsTituloPeca(peca + "- Margem proximal: Achados de zona de transição presentes: Hipoganglionose mioentérica (1/8 ou mais da circunferência)."), "DOENÇA DE HIRSCHSPRUNG: SEGMENTO AGANGLIONAR DE PELO MENOS 8 CM; MARGEM PROXIMAL COM ACHADOS DE ZONA DE TRANSIÇÃO (VIDE NOTA)", "peça com zona de transição na margem");
eq(t.hsTituloPeca(peca), null, "peça sem dado de margem: sem título automático");
// editor: título nasce e acompanha os achados
els.fSitio.value = "hirschsprung"; els.fSeg.value = "Biópsia retal por sucção"; els.corpo.value = "";
const hc = (g, i) => hsSite.criterios.find(c => c.g === g).opt[i][1];
t.appendLine(hc("Biópsia: adequação", 0));
eq(els.corpo.value.split("\n").filter(l => t.lineKind(l) === "b").length, 0, "sem células ganglionares informadas ainda não há título");
t.appendLine(hc("Células ganglionares submucosas", 2));
ok(els.corpo.value.startsWith("- " + H.pend + ":"), "sem calretinina: estudo complementar pendente");
t.appendLine(hc("Calretinina", 3));
ok(els.corpo.value.startsWith("- " + H.pend + ":"), "calretinina ausente sem controle: continua pendente");
t.appendLine(hc("Calretinina: controle interno positivo", 0));
ok(els.corpo.value.startsWith("- " + H.agang + ":"), "com controle interno: aganglionose");
t.appendLine(hc("Calretinina", 0));
ok(els.corpo.value.startsWith("- " + H.inconc + ":"), "calretinina preservada: inconclusiva");
eq(els.corpo.value.split("\n").filter(l => /^- Calretinina: /.test(l)).length, 1, "linha da calretinina é trocada, não duplicada");
t.appendLine(hc("Células ganglionares submucosas", 0));
ok(els.corpo.value.startsWith("- " + H.gang + ":"), "gânglios presentes");
t.appendLine(hc("Nervos submucosos hipertróficos", 1));
ok(els.corpo.value.startsWith("- " + H.gangCorr + ":"), "gânglios + nervos hipertróficos: a correlacionar");
// notas, referências e alertas no laudo
const agCorpo = t.presetText(hsSite.presets.find(p => p.titulo === H.agang));
t.WORK.samples.push({ nome: "Biópsia retal", corpo: agCorpo, site: "hirschsprung", seg: "Biópsia retal por sucção" });
const lh = t.buildLaudo();
ok(lh.includes("- Amostra A: o diagnóstico de doença de Hirschsprung e a extensão do segmento aganglionar dependem"), "nota automática da aganglionose");
ok(lh.includes(t.CITE.ernica) && lh.includes(t.CITE.veras) && !/\[@/.test(lh), "referências de Hirschsprung numeradas");
eq(t.alertas().length, 0, "aganglionose com amostragem informada: sem alerta");
t.WORK.samples[0].corpo = agCorpo.split("\n").filter(l => !/níveis de corte/.test(l)).join("\n") + "\n- Contexto informado: trissomia 21.\n- Contexto informado: idade maior que 1 ano.\n- Nível informado: 1 cm acima da linha pectínea.";
eq(t.alertas().length, 4, "alertas: amostragem incompleta, trissomia 21, nervo após 1 ano, biópsia baixa");
t.WORK.samples[0].corpo = agCorpo.replace(t.HS_L.calA, t.HS_L.calP);
ok(t.alertas().some(a => /não corresponde aos achados/.test(a.msg)), "alerta quando o título salvo diverge dos achados");
t.WORK.samples[0].corpo = t.presetText(hsSite.presets.find(p => p.titulo === H.inconc));
ok(/calretinina: achados conflitantes/.test(t.buildLaudo()) && t.buildLaudo().includes(t.CITE.kapur14), "nota e referência da inconclusiva");
t.WORK.samples[0] = { nome: "Retossigmoide", corpo: "- DOENÇA DE HIRSCHSPRUNG: SEGMENTO AGANGLIONAR DE PELO MENOS 8 CM; MARGEM PROXIMAL COM ACHADOS DE ZONA DE TRANSIÇÃO (VIDE NOTA):\n- Segmento aganglionar: 8 cm.", site: "hirschsprung", seg: "Peça de abaixamento" };
ok(/o comprimento informado do segmento aganglionar é um mínimo/.test(t.buildLaudo()) && t.buildLaudo().includes(t.CITE.kapur25), "nota da margem com zona de transição");
ok(!JSON.stringify(hsSite).match(/Teitelbaum|grau [IV]+/), "enterocolite sem graus (artigo ainda não conferido)");
els.fSitio.value = "hirschsprung"; els.fSeg.value = "Peça de abaixamento"; els.fSeg.onchange();
eq(els.fNome.value, "Produto de abaixamento de retossigmoide", "nome padrão da peça");
els.fSeg.value = "Biópsia retal por sucção"; els.fSeg.onchange();
eq(els.fNome.value, "Biópsia retal", "nome padrão da biópsia");
const tx = (seg) => t.hsTextos(hsSite, seg).map(p => p.titulo);
eq(tx("").length, hsSite.presets.length, "sem tipo escolhido: todos os textos prontos");
eq(tx("Biópsia retal por sucção").length, 6, "sucção: 6 textos da biópsia"); eq(tx("Biópsia retal incisional (espessura total)").join(), tx("Biópsia retal por sucção").join(), "incisional: os mesmos da biópsia");
ok(tx("Biópsia retal por sucção").every(x => /^(BIÓPSIA RETAL|CÉLULAS GANGLIONARES|AGANGLIONOSE)/.test(x)), "sucção: só títulos de biópsia");
eq(tx("Congelação / nivelamento").join(), "EXAME INTRAOPERATÓRIO POR CONGELAÇÃO (NIVELAMENTO)", "congelação: 1 texto");
ok(tx("Peça de abaixamento").length === 1 && /^DOENÇA DE HIRSCHSPRUNG:/.test(tx("Peça de abaixamento")[0]), "peça: 1 texto");
ok(tx("Rebiopsia / reoperação").length === 1 && /^REBIOPSIA/.test(tx("Rebiopsia / reoperação")[0]), "rebiopsia: 1 texto");
eq(hsSite.segmentos.reduce((n2, sg) => n2 + (sg === "Biópsia retal incisional (espessura total)" ? 0 : tx(sg).length), 0), hsSite.presets.length, "nenhum texto fica de fora");
const gr = (seg) => t.hsGrupos(hsSite, seg).map(c => c.g);
ok(hsSite.criterios.every(c => Array.isArray(c.esp) && c.esp.length), "todo grupo tem tipo de espécime");
eq(gr("").length, hsSite.criterios.length, "sem tipo escolhido: todos os grupos");
ok(gr("Biópsia retal por sucção").every(g => !/^(Peça|Reoperação|Congelação|Biópsia incisional|Margem)/.test(g)) && gr("Biópsia retal por sucção").some(g => /^Calretinina$/.test(g)), "sucção: só grupos da biópsia");
ok(gr("Biópsia retal incisional (espessura total)").some(g => /^Biópsia incisional: gânglios mioentéricos/.test(g)), "incisional: inclui plexo mioentérico");
eq(gr("Congelação / nivelamento").join(" | "), hsSite.criterios.filter(c => /^(Congelação|Margem proximal)/.test(c.g)).map(c => c.g).join(" | "), "congelação: nivelamento e margem");
ok(gr("Peça de abaixamento").every(g => /^(Peça|Margem proximal|Outras alterações)/.test(g)) && gr("Peça de abaixamento").some(g => /segmento aganglionar/.test(g)), "peça: grupos da peça");
ok(gr("Rebiopsia / reoperação").some(g => /^Reoperação: técnica prévia/.test(g)) && gr("Rebiopsia / reoperação").some(g => /^Células ganglionares/.test(g)) && !gr("Rebiopsia / reoperação").some(g => /^Peça/.test(g)), "rebiopsia: grupos próprios");

console.log(`OK — ${n} asserts`);
