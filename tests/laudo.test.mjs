// Harness: roda o <script> do index.html num DOM falso (node:vm) e confere as regras de saída da máscara EDA.
// Uso: node tests/laudo.test.mjs
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPOSE = "\n;globalThis.__t={get WORK(){return WORK;},LIB,SEED_SITES,NOTAS_PADRAO,APP_VERSION,presetText,buildLaudo,lineKind,laudoToRichHTML,laudoToPreviewHTML,v2Customizations,saveNow,CITE,EOS_VR,eosKey,eosEval,comVR,eosNota,lieEval,lieNota,linfEval,contagens,ativGrade,ativLine,titleSetAtiv,dechTipo,dechCat,dechCatEso,dechCatGas,dechLines,dechLinesEso,dechLinesGas,titleSetDech,resolveCites,fmtNums,autoNotas,alertas,fraseEos,fraseLie,grauDoTitulo,grauDaLinha,tituloComAtiv,linhaAtiv,titleSetHp,titleSetMetaplasia,titleSetDisplasia,appendLine,concorda,HS_L,HS_NOTA,hsEstado,hsAchados,hsTitMucosa,hsTitGang,hsNotas,hsAlertas,hsGrupos,hsTextos,MUC_SITIO,notaEosConsenso,titleSetAmostra,amostraMod,marcaSel,fmtMarcas,tiraMarcas,adaptaGas,gasTextos,GAS_SEG,titleSetGrauDuo,notaCeliaca,NOTA_CELIACA,NOTA_LINF_DUO,LINHA_ATIV,titleSetEos,eosEstado,PREFIXOS,MATS_PADRAO,edsEstado,titleSetEds,isTEG,inserePorcao,amostraMod,toSub,fromSub,grauDuoDaLinha,formataAmostra,porcaoAtivaSet:(p)=>{porcaoAtiva=p;}};";

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
const alertasSemEos = (t) => t.alertas().filter(a => !/padrão eosinofílico/.test(a.msg));

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
eq(t.lineKind("- MUCOSA ESOFÁGICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:"), "b", "título em negrito");
eq(t.lineKind("- " + gHp.titulo + ":"), "b", "título com H. pylori em negrito");
eq(t.lineKind("- Ausência de hiperplasia da camada basal."), "", "item normal");
eq(t.lineKind("- Hiperplasia foveolar: Não identificada."), "", "par rótulo: valor normal");
eq(t.lineKind("NOTAS:"), "", "NOTAS: normal");
eq(t.lineKind("- " + t.LIB.notas[0].texto), "", "item de nota normal");
eq(t.lineKind("REFERÊNCIAS BIBLIOGRÁFICAS:"), "", "cabeçalho refs normal");
eq(t.lineKind("-".repeat(100)), "", "separador normal");
ok(laudo.includes("NOTAS:\n- " + t.LIB.notas[0].texto), "nota no laudo");
ok(laudo.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n1. " + t.CITE.sydney + "\n2. " + t.LIB.refs[0].texto), "ref numerada no laudo (citada no texto e depois a escolhida)");

// 5. HTML rico (clipboard)
const rich = t.laudoToRichHTML(laudo);
ok(rich.includes("font-size:8pt") && rich.includes("Arial"), "Arial 8pt");
ok(rich.includes("text-align:justify") && rich.includes("line-height:1.15") && rich.includes("color:#000000"), "justificado, 1.15, preto");
ok(rich.includes("<i>H. pylori</i>"), "H. pylori em itálico");
const nBold = (rich.match(/font-weight:bold/g) || []).length;
eq(nBold, lines.filter(l => t.lineKind(l) === "b" || (/^- .*\.$/.test(l) && !/[a-zà-ÿ]/.test(l.replace(/H\. pylori/g, "")))).length, "negrito só nos títulos");
eq(nBold, 4, "os 2 títulos (fechados em '.') e os 2 '- MICROSCOPIA:'");

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
eq(t.alertas().filter(a => /DECH/.test(a.msg)).length, 1, "alerta de categoria DECH divergente"); ok(t.alertas().some(a => /Amostra B: há contagem de eosinófilos acima do limiar/.test(a.msg)), "v3.7: cólon com 95 e título sem padrão eosinofílico gera alerta");
t.WORK.samples.push({ nome: "Reto", corpo: "- RETITE CRÔNICA INATIVA:\n- Presença de criptite neutrofílica (3 de 60 criptas avaliadas; 5%)." });
eq(alertasSemEos(t).length, 2, "alerta de título INATIVA com criptite");
t.WORK.samples.push({ nome: "Sigmoide", corpo: "- COLITE CRÔNICA EM ATIVIDADE MODERADA:\n- " + t.SEED_SITES.colon.criterios.find(c => c.g === "Infiltrado neutrofílico").opt[3][1].slice(2) });
eq(alertasSemEos(t).length, 3, "alerta de grau do título diferente do grau da linha");
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
eq(t.tituloComAtiv("- MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "INATIVA"), "- MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "título não inflamatório não muda");
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
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:") && els.corpo.value.includes(gNeutro[2][1]), "editor: o grau no título volta ao grau da linha (o grau vem do achado)");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("EM ATIVIDADE MODERADA", "INATIVA");
els.corpo.onchange();
ok(els.corpo.value.includes(gNeutro[0][1]) && !els.corpo.value.includes(gNeutro[2][1]), "editor: título INATIVA muda a linha para ausência");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("INATIVA", "EM ATIVIDADE");
els.corpo.onchange();
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA INATIVA, ASSOCIADA A H. pylori:") && els.corpo.value.includes(gNeutro[0][1]), "editor: título EM ATIVIDADE com linha de ausência no estômago é desfeito");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace(gNeutro[0][1], gNeutro[1][1]);
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
  ok(a && a.stack.itens.some(i => /degranulação/.test(i[1])) && a.stack.itens.some(i => /microabscessos eosinofílicos|abscesso eosinofílico/.test(i[1])), k + ": degranulação e microabscessos/abscesso eosinofílico");
}
ok(!t.SEED_SITES.polipo.criterios.some(c => /achados associados/.test(c.g)), "pólipo sem grupo de eosinófilos");
const lp = t.SEED_SITES.esofago.criterios.filter(c => /^Lâmina própria superficial$|^Infiltrado inflamatório na lâmina própria$/.test(c.g));
eq(lp.length, 2, "esôfago: dois campos independentes de lâmina própria");
eq(lp[0].opt.length + lp[1].opt.length, 5, "representada (com ou sem glândulas tipo cárdia)/não representada e presente/ausente");
ok(!t.SEED_SITES.gastrica.criterios.some(c => /^Lâmina própria superficial$/.test(c.g)), "só no esôfago");
const nG = t.LIB.notas.find(x => x.texto === "Não foram identificados granulomas em nenhuma das amostras examinadas."), nD = t.LIB.notas.find(x => x.texto === "Não foi identificada displasia em nenhuma das amostras examinadas.");
ok(nG && nD, "notas novas de granulomas e de displasia");
t.WORK.samples.push({ nome: "Ceco", corpo: "- COLITE CRÔNICA INATIVA:" }); t.WORK.notasSel.push(nG.id, nD.id);
ok(t.buildLaudo().includes("NOTAS:\n- " + nG.texto + "\n- " + nD.texto), "notas em linhas separadas com '- '");
t.WORK.samples.push({ nome: "Duodeno", corpo: "- DUODENITE:\n- Linfocitose intraepitelial: Não identificada (exocitose de até 5 linfócitos/100 enterócitos).\n- Classificação de Marsh-Oberhuber (1999): 3A." },
  { nome: "Antro", corpo: "- GASTRITE:\n- Metaplasia intestinal: Presente, completa, leve.\n- Atrofia: Presente, leve.\n- Classificação OLGIM: Estágio 0.\n- Classificação OLGA: Estágio 0." });
eq(alertasSemEos(t).length, 3, "alertas de Marsh, OLGIM e OLGA incoerentes");
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

// 15. Hirschsprung: título descritivo em dois itens (mucosa + pesquisa de células ganglionares), texto <-> título, notas, alertas
({ t, els } = boot({}));
const HL = t.HS_L, PQ = "PESQUISA PARA CÉLULAS GANGLIONARES: ", PN = " NO PLEXO NEURAL ", PN2 = " NOS PLEXOS NEURAIS ";
const HE = (o) => t.hsEstado(Object.assign({ adeq: "ok", gang: null, nerv: false, cal: null, ctrl: false }, o));
eq(HE({ adeq: "inad", gang: "nao" }), "inad", "linha 1: inadequada");
eq(HE({ adeq: "inad", gang: "nao", cal: "pres" }), "inad", "linha 1: inadequada com calretinina preservada");
eq(HE({ adeq: "inad", gang: "nao", cal: "aus" }), "inadCal", "linha 2: inadequada com calretinina ausente");
eq(HE({ gang: "pres", cal: "pres" }), "gang", "linha 3: células ganglionares presentes");
eq(HE({ gang: "pres" }), "gang", "linha 3: presentes sem calretinina");
eq(HE({ gang: "pres", cal: "aus" }), "gangCorr", "linha 4: presentes + calretinina ausente");
eq(HE({ gang: "pres", cal: "esp" }), "gangCorr", "linha 4: presentes + calretinina esparsa");
eq(HE({ gang: "pres", cal: "pres", nerv: true }), "gangCorr", "linha 4: presentes + nervos hipertróficos");
eq(HE({ gang: "duv", cal: "aus", ctrl: true }), "duv", "linha 5: duvidosas");
eq(HE({ gang: "nao", cal: "aus", ctrl: true }), "agang", "linha 6: ausentes + calretinina ausente com controle");
eq(HE({ gang: "nao", cal: "pres" }), "inconc", "linha 7: calretinina preservada");
eq(HE({ gang: "nao", cal: "esp" }), "inconc", "linha 7: calretinina esparsa");
eq(HE({ gang: "nao", cal: "sub" }), "inconc", "linha 7: só em nervos submucosos");
eq(HE({ gang: "nao" }), "pend", "linha 8: calretinina não realizada");
eq(HE({ gang: "nao", cal: "aus", ctrl: false }), "pend", "linha 8: calretinina ausente sem controle interno");
eq(HE({ gang: "misto" }), "misto", "plexos divergentes");
eq(HE({}), null, "sem dado de células ganglionares não há interpretação");
// título, item 1: mucosa
const B = (...ls) => ls.map(l => "- " + l).join("\n");
eq(t.hsTitMucosa(B(HL.muc)), "MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS", "mucosa retal de praxe");
eq(t.hsTitMucosa(B("Mucosa de cólon sigmoide: Sem particularidades histológicas significativas.")), "MUCOSA DE CÓLON SIGMOIDE SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS", "mucosa de cólon sigmoide");
eq(t.hsTitMucosa(B("Mucosa de cólon proximal: Com colite ativa.")), "MUCOSA DE CÓLON PROXIMAL COM COLITE ATIVA", "linha editada muda o título");
eq(t.hsTitMucosa(B("Amostra inadequada: Mucosa escamosa.")), null, "sem linha de mucosa não há item 1");
eq(t.hsTitMucosa(B(HL.adeqT)), "MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS", "biópsia: item 1 pela linha de adequação");
eq(t.hsTitMucosa(B("Amostra adequada: Mucosa com arquitetura glandular preservada e hiperplasia folicular linfoide, submucosa representada [@ernica] apresentando vasocongestão, camada muscular própria representada.")), "MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS", "modelo do Pedro: arquitetura preservada dá sem particularidades");
eq(t.hsTitMucosa(B("Amostra adequada: Mucosa de cólon sigmoide com colite ativa, submucosa representada [@ernica].")), "MUCOSA DE CÓLON SIGMOIDE COM COLITE ATIVA", "adequação com topografia e alteração");
// título, item 2: presentes/ausentes e em que plexo
const cal = B(HL.calA, HL.ctrlP);
eq(t.hsTitGang(B(HL.subP)), PQ + "PRESENTES" + PN + "DA SUBMUCOSA", "submucosa presentes");
eq(t.hsTitGang(B(HL.subP, HL.mpP)), PQ + "PRESENTES" + PN2 + "DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA", "os dois plexos presentes");
eq(t.hsTitGang(B(HL.subA, HL.mpA) + "\n" + cal), PQ + "AUSENTES" + PN2 + "DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA", "os dois plexos ausentes, calretinina ausente com controle: sem ressalva");
eq(t.hsTitGang(B(HL.subA) + "\n" + cal), PQ + "AUSENTES" + PN + "DA SUBMUCOSA", "submucosa ausentes");
eq(t.hsTitGang(B(HL.mpP, HL.mpN.replace("camada muscular própria", "submucosa"))), PQ + "PRESENTES" + PN + "DA CAMADA MUSCULAR PRÓPRIA", "só muscular própria");
eq(t.hsTitGang(B(HL.subA, HL.mpP)), PQ + "AUSENTES" + PN + "DA SUBMUCOSA E PRESENTES NO PLEXO NEURAL DA CAMADA MUSCULAR PRÓPRIA (VIDE NOTAS)", "plexos divergentes");
eq(t.hsTitGang(B(HL.subD)), PQ + "DUVIDOSA" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "duvidosas");
eq(t.hsTitGang(B(HL.subA)), PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "ausentes sem calretinina: ressalva");
eq(t.hsTitGang(B(HL.subA, HL.calP)), PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "ausentes com calretinina preservada: ressalva");
eq(t.hsTitGang(B(HL.subP, HL.nervP)), PQ + "PRESENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "presentes com nervos hipertróficos: ressalva");
eq(t.hsTitGang(B("Amostra inadequada: Submucosa insuficiente.", HL.subA)), PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "amostra inadequada: ressalva");
eq(t.hsTitGang(B(HL.mpN)), null, "plexo não amostrado não gera título");
eq(t.hsTitGang(B(HL.mpCong), true), "PESQUISA PARA CÉLULAS GANGLIONARES (EXAME INTRAOPERATÓRIO POR CONGELAÇÃO): PRESENTES" + PN + "DA CAMADA MUSCULAR PRÓPRIA", "congelação presentes");
eq(t.hsTitGang(B(HL.mpA), true), "PESQUISA PARA CÉLULAS GANGLIONARES (EXAME INTRAOPERATÓRIO POR CONGELAÇÃO): AUSENTES" + PN + "DA CAMADA MUSCULAR PRÓPRIA", "congelação ausentes, sem ressalva");
eq(t.hsTitGang(B("Nível da amostra: Acima da anastomose.", HL.subA)), PQ + "AUSENTES" + PN + "DA SUBMUCOSA", "rebiopsia: sem ressalva automática");
eq(t.hsTitGang(B("Células ganglionares submucosas: Não identificadas.", "Gânglios mioentéricos: Presentes.")), PQ + "AUSENTES" + PN + "DA SUBMUCOSA E PRESENTES NO PLEXO NEURAL DA CAMADA MUSCULAR PRÓPRIA (VIDE NOTAS)", "linhas da v3.3 continuam lidas");
const PC = PQ + "AUSENTES" + PN2 + "DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA NO SEGMENTO DISTAL DE ";
const peca = "- Segmento aganglionar: 8 cm.\n";
eq(t.hsTitGang(peca + "- " + HL.margS), PC + "8 CM; PRESENTES NA MARGEM PROXIMAL", "peça com margem livre");
eq(t.hsTitGang(peca + "- Margem proximal: Achados de zona de transição presentes: Hipoganglionose mioentérica (1/8 ou mais da circunferência)."), PC + "PELO MENOS 8 CM; MARGEM PROXIMAL COM ACHADOS DE ZONA DE TRANSIÇÃO (VIDE NOTAS)", "peça com zona de transição na margem");
eq(t.hsTitGang(peca + "- Margem proximal: Aganglionar."), PC + "PELO MENOS 8 CM; AUSENTES NA MARGEM PROXIMAL (VIDE NOTAS)", "peça com margem aganglionar");
eq(t.hsTitGang(peca), null, "peça sem dado de margem: sem título automático");
// textos prontos
const hsSite = t.SEED_SITES.hirschsprung;
eq(hsSite.segmentos.length, 5, "tipos de espécime");
for (const p of hsSite.presets) {
  const corpo = t.presetText(p), tl = corpo.split("\n").filter(l => t.lineKind(l) === "b");
  ok(p.rot && tl.length >= 1 && tl.length <= 3 && tl.every(l => /^- (MUCOSA |PESQUISA PARA CÉLULAS GANGLIONARES|FILETES NEURAIS SUBMUCOSOS HIPERTRÓFICOS)/.test(l)), "texto pronto com título descritivo: " + p.rot);
  ok(/^- (PESQUISA PARA CÉLULAS GANGLIONARES|FILETES NEURAIS)/.test(tl[tl.length - 1]) && corpo.startsWith(tl.join("\n") + "\n- "), "pesquisa (ou filetes) por último no título, com os subitens abaixo: " + p.rot);
  ok(!/^- (Biópsia retal por sucção|Mucosa retal: )/m.test(corpo) || p.esp[0] >= 3, "biópsia sem a linha do tipo e sem a linha da mucosa: " + p.rot);
  eq(t.concorda(corpo).trocas.length, 0, "corretor de concordância não mexe: " + p.rot);
  ok(!/DOENÇA DE HIRSCHSPRUNG|AGANGLIONOSE|INCONCLUSIVA|INADEQUADA/.test(tl.join(" ")), "título sem diagnóstico: " + p.rot);
}
ok(hsSite.presets.filter(p => p.esp[0] !== 2 && !/inadequada/.test(p.rot)).every(p => t.presetText(p).startsWith("- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:\n- PESQUISA")), "mucosa é o primeiro item (menos congelação e inadequada)");
const pPeca = t.presetText(hsSite.presets.find(p => p.esp[0] === 3));
ok([HL.muc, HL.camSub, HL.camMp, HL.camSer].every(l => pPeca.includes("\n- " + l)), "peça: as quatro camadas, uma por linha, preservadas");
ok(pPeca.includes(PC + "8 CM; PRESENTES NA MARGEM PROXIMAL:"), "peça: título pelo segmento e pela margem");
// editor: texto -> título
els.fSitio.value = "hirschsprung"; els.fSeg.value = "Biópsia retal por sucção"; els.corpo.value = "";
const hc = (g, i) => hsSite.criterios.find(c => c.g === g).opt[i][1];
const tit = () => els.corpo.value.split("\n").filter(l => t.lineKind(l) === "b");
const mucFx = i => hsSite.criterios.find(c => c.g === "Mucosa").fx[i][1]();
t.appendLine(hc("Biópsia: adequação", 0));
eq(tit().join("|"), "- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "linha de adequação cria o item 1");
t.appendLine(hc("Células ganglionares — plexo da submucosa", 2));
eq(tit().join("|"), "- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:|- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS):", "item 2 entra depois do 1");
ok(els.corpo.value.startsWith(tit().join("\n") + "\n- Amostra adequada"), "os dois itens no topo, subitens abaixo");
t.appendLine(hc("Calretinina", 3)); t.appendLine(hc("Calretinina: controle interno positivo", 0));
eq(tit()[1], "- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA:", "calretinina ausente com controle: sai a ressalva");
t.appendLine(hc("Calretinina", 0));
eq(tit()[1], "- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS):", "calretinina preservada: volta a ressalva");
eq(els.corpo.value.split("\n").filter(l => /^- Calretinina: /.test(l)).length, 1, "linha da calretinina é trocada, não duplicada");
t.appendLine(hc("Células ganglionares — plexo da submucosa", 0));
eq(tit()[1], "- " + PQ + "PRESENTES" + PN + "DA SUBMUCOSA:", "presentes");
eq(els.corpo.value.split("\n").filter(l => /^- Plexo da submucosa: /.test(l)).length, 1, "linha do plexo é trocada, não duplicada");
mucFx(1);
eq(tit()[0], "- MUCOSA DE CÓLON SIGMOIDE SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "trocar o tipo de mucosa troca o item 1");
ok(els.corpo.value.split("\n").filter(l => /^- Amostra adequada: Mucosa de cólon sigmoide com /.test(l)).length === 1 && !/^- Mucosa /m.test(els.corpo.value), "topografia entra na linha de adequação, sem linha de mucosa");
eq(tit().length, 2, "continuam dois itens de título");
// editor: linha editada à mão -> título
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("Mucosa de cólon sigmoide com arquitetura glandular preservada", "Mucosa de cólon sigmoide com colite ativa").replace(HL.subP, HL.subA);
els.corpo.onchange();
eq(tit().join("|"), "- MUCOSA DE CÓLON SIGMOIDE COM COLITE ATIVA:|- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS):", "linhas editadas à mão mudam os dois itens");
// editor: título editado à mão -> linhas
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("MUCOSA DE CÓLON SIGMOIDE COM COLITE ATIVA", "MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS").replace("AUSENTES" + PN + "DA SUBMUCOSA (VIDE NOTAS)", "PRESENTES" + PN2 + "DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA");
els.corpo.onchange();
ok(els.corpo.value.includes("\n- " + HL.adeqS) && !/cólon sigmoide/.test(els.corpo.value), "título da mucosa editado ajusta a linha de adequação");
ok(els.corpo.value.includes("\n- " + HL.subP) && els.corpo.value.includes("\n- " + HL.mpP), "título da pesquisa editado ajusta e cria as linhas dos plexos");
eq(tit().join("|"), "- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:|- " + PQ + "PRESENTES" + PN2 + "DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA:", "título fica como foi digitado");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace(" E DA CAMADA MUSCULAR PRÓPRIA:", ":");
els.corpo.onchange();
ok(!/Plexo da camada muscular própria/.test(els.corpo.value) && tit()[1] === "- " + PQ + "PRESENTES" + PN + "DA SUBMUCOSA:", "tirar o plexo do título tira a linha");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("PRESENTES" + PN, "NEGATIVA" + PN);
els.corpo.onchange();
ok(els.corpo.value.includes("\n- " + HL.subA) && /AUSENTES NO PLEXO NEURAL DA SUBMUCOSA/.test(tit()[1]), "\"negativa\" digitada no título vira ausentes na linha e no título");
// título antigo (v3.3) é convertido ao editar
els.corpo.value = "- AGANGLIONOSE EM BIÓPSIA RETAL, COMPATÍVEL COM DOENÇA DE HIRSCHSPRUNG:\n- Células ganglionares submucosas: Não identificadas.\n- " + HL.calA + "\n- " + HL.ctrlP;
els.corpo.onfocus(); els.corpo.onchange();
eq(tit().join("|"), "- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA:", "título da v3.3 convertido");
els.corpo.value = "- OUTRO TÍTULO DIGITADO:\n- " + HL.subP;
els.corpo.onfocus(); els.corpo.onchange();
eq(tit().join("|"), "- OUTRO TÍTULO DIGITADO:", "título com outra redação não é trocado");
// peça e congelação no editor
els.fSeg.value = "Peça de abaixamento"; els.corpo.value = pPeca;
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("- Segmento aganglionar: 8 cm.", "- Segmento aganglionar: 11 cm.");
els.corpo.onchange();
ok(tit()[1].includes("SEGMENTO DISTAL DE 11 CM; PRESENTES NA MARGEM PROXIMAL"), "peça: comprimento editado na linha vai para o título");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("DISTAL DE 11 CM", "DISTAL DE 6 CM");
els.corpo.onchange();
ok(els.corpo.value.includes("\n- Segmento aganglionar: 6 cm."), "peça: comprimento editado no título vai para a linha");
els.fSeg.value = "Congelação / nivelamento"; els.corpo.value = "";
t.appendLine(hc("Congelação: biópsia de nivelamento", 1));
eq(tit().join("|"), "- PESQUISA PARA CÉLULAS GANGLIONARES (EXAME INTRAOPERATÓRIO POR CONGELAÇÃO): AUSENTES" + PN + "DA CAMADA MUSCULAR PRÓPRIA:", "congelação: um item, sem mucosa");
for (const l of tit().concat(["- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:"])) eq(t.lineKind(l), "b", "título em negrito");
// notas, referências e alertas no laudo
const pr = (rot) => t.presetText(hsSite.presets.find(p => p.rot === rot));
const laudoDe = (corpo, seg) => { t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "Biópsia retal", corpo, site: "hirschsprung", seg: seg || "Biópsia retal por sucção" }); return t.buildLaudo(); };
let lh = laudoDe(pr("Células ganglionares presentes"));
ok(lh.includes("- Amostra A: a presença de células ganglionares desfavorece doença de Hirschsprung no nível biopsiado"), "nota: presentes desfavorece");
ok(!/exclui doença/.test(lh), "nota não diz que exclui a doença");
eq(t.alertas().length, 0, "presentes: sem alerta");
const agCorpo = pr("Células ganglionares ausentes, calretinina ausente");
lh = laudoDe(agCorpo);
ok(lh.includes("- Amostra A: a ausência de células ganglionares, com ausência de inervação mucosa à calretinina, favorece doença de Hirschsprung;"), "nota: ausentes + calretinina ausente favorece");
ok(lh.includes(t.CITE.ernica) && lh.includes(t.CITE.veras) && !/\[@/.test(lh), "referências de Hirschsprung numeradas (Veras pelo critério dos filetes)");
ok(!/COMPATÍVEL COM DOENÇA DE HIRSCHSPRUNG|AGANGLIONOSE EM BIÓPSIA/.test(lh), "laudo sem título diagnóstico");
eq(t.alertas().length, 0, "ausentes com amostragem informada: sem alerta");
t.WORK.samples[0].corpo = agCorpo.split("\n").filter(l => !/níveis de corte/.test(l)).join("\n") + "\n- Contexto informado: trissomia 21.\n- Contexto informado: idade maior que 1 ano.\n- Nível informado: 1 cm acima da linha pectínea.";
eq(t.alertas().length, 4, "alertas: amostragem incompleta, trissomia 21, nervo após 1 ano, biópsia baixa");
t.WORK.samples[0].corpo = agCorpo.replace(HL.calA, HL.calP);
ok(t.alertas().some(a => /não corresponde aos achados/.test(a.msg)), "alerta quando o título salvo diverge dos achados");
lh = laudoDe(pr("Células ganglionares ausentes, calretinina preservada"));
ok(/calretinina: achados conflitantes, que não excluem aganglionose de segmento muito curto/.test(lh) && lh.includes(t.CITE.kapur14), "nota e referência do achado conflitante");
ok(/recomenda-se estudo complementar por calretinina/.test(laudoDe(pr("Células ganglionares ausentes, calretinina não realizada"))), "nota do estudo pendente");
ok(/podem corresponder a zona de transição/.test(laudoDe(pr("Células ganglionares presentes, com achados a correlacionar"))), "nota dos achados a correlacionar");
ok(/amostra inadequada para pesquisa de células ganglionares/.test(laudoDe(pr("Amostra inadequada"))), "nota da amostra inadequada");
ok(/apenas um dos plexos avaliados/.test(laudoDe(B("X:", HL.subA, HL.mpP).replace("- X:", "- " + PQ + "AUSENTES" + PN + "DA SUBMUCOSA E PRESENTES NO PLEXO NEURAL DA CAMADA MUSCULAR PRÓPRIA (VIDE NOTAS):"))), "nota dos plexos divergentes");
for (const p of hsSite.presets.filter(p => p.esp[0] < 2)) { const l = laudoDe(t.presetText(p)); eq(/\(VIDE NOTAS\)/.test(l), p.rot !== "Células ganglionares presentes", "\"vide notas\" só quando há ressalva ou filetes hipertróficos: " + p.rot); ok(/\nNOTAS:\n- Amostra A: /.test(l), "toda biópsia tem nota de interpretação: " + p.rot); eq(t.alertas().length, 0, "texto pronto sem alerta: " + p.rot); }
lh = laudoDe(pPeca, "Peça de abaixamento");
ok(lh.includes("- Amostra A: os achados são compatíveis com doença de Hirschsprung, com segmento aganglionar de 8 cm e margem proximal sem achados de zona de transição"), "peça: doença de Hirschsprung vai para a nota");
eq(t.alertas().length, 0, "peça de praxe: sem alerta");
t.WORK.samples[0].corpo = pPeca.replace(HL.camMp, "Muscular própria: Hipertrofia da camada circular.");
ok(t.alertas().some(a => /camada da parede com alteração/.test(a.msg)), "peça: camada alterada gera alerta para conferir o título");
lh = laudoDe(pPeca.replace("- " + HL.margS, "- Margem proximal: Achados de zona de transição presentes: Hipoganglionose mioentérica (1/8 ou mais da circunferência).").replace("DE 8 CM; PRESENTES NA MARGEM PROXIMAL", "DE PELO MENOS 8 CM; MARGEM PROXIMAL COM ACHADOS DE ZONA DE TRANSIÇÃO (VIDE NOTAS)"), "Peça de abaixamento");
ok(/o comprimento informado do segmento aganglionar é um mínimo/.test(lh) && lh.includes(t.CITE.kapur25), "nota da margem com zona de transição");
eq(t.alertas().length, 0, "peça com zona de transição e título coerente: sem alerta");
ok(!/\nNOTAS:/.test(laudoDe(t.presetText(hsSite.presets.find(p => p.esp[0] === 2)), "Congelação / nivelamento")) && t.alertas().length === 0, "congelação: sem nota automática e sem alerta");
ok(!/\nNOTAS:/.test(laudoDe(t.presetText(hsSite.presets.find(p => p.esp[0] === 4)), "Rebiopsia / reoperação")) && t.alertas().length === 0, "rebiopsia: sem nota automática e sem alerta");
ok(!JSON.stringify(hsSite).match(/Teitelbaum|grau [IV]+/), "enterocolite sem graus (artigo ainda não conferido)");
ok(!/exclui doença/.test(JSON.stringify(hsSite) + JSON.stringify(t.HS_NOTA)), "nenhum texto diz que exclui a doença");
// nome padrão e filtros por tipo de espécime
els.fSitio.value = "hirschsprung"; els.fSeg.value = "Peça de abaixamento"; els.fSeg.onchange();
eq(els.fNome.value, "Produto de abaixamento de retossigmoide", "nome padrão da peça");
els.fSeg.value = "Biópsia retal por sucção"; els.fSeg.onchange();
eq(els.fNome.value, "Biópsia retal", "nome padrão da biópsia");
const tx = (seg) => t.hsTextos(hsSite, seg).map(p => p.rot);
eq(tx("").length, hsSite.presets.length, "sem tipo escolhido: todos os textos prontos");
eq(tx("Biópsia retal por sucção").length, 6, "sucção: 6 textos da biópsia"); eq(tx("Biópsia retal incisional (espessura total)").join(), tx("Biópsia retal por sucção").join(), "incisional: os mesmos da biópsia");
ok(tx("Congelação / nivelamento").length === 1 && /^Congelação/.test(tx("Congelação / nivelamento")[0]), "congelação: 1 texto");
ok(tx("Peça de abaixamento").length === 1 && /^Peça/.test(tx("Peça de abaixamento")[0]), "peça: 1 texto");
ok(tx("Rebiopsia / reoperação").length === 1 && /^Rebiopsia/.test(tx("Rebiopsia / reoperação")[0]), "rebiopsia: 1 texto");
eq(hsSite.segmentos.reduce((n2, sg) => n2 + (sg === "Biópsia retal incisional (espessura total)" ? 0 : tx(sg).length), 0), hsSite.presets.length, "nenhum texto fica de fora");
const gr = (seg) => t.hsGrupos(hsSite, seg).map(c => c.g);
ok(hsSite.criterios.every(c => Array.isArray(c.esp) && c.esp.length), "todo grupo tem tipo de espécime");
eq(gr("").length, hsSite.criterios.length, "sem tipo escolhido: todos os grupos");
ok(gr("Biópsia retal por sucção").every(g => !/^(Peça|Reoperação|Congelação|Margem|Biópsia: tipo)/.test(g)) && gr("Biópsia retal por sucção").includes("Células ganglionares — plexo da camada muscular própria") && gr("Biópsia retal por sucção").some(g => /^Calretinina$/.test(g)) && gr("Biópsia retal por sucção").includes("Mucosa"), "sucção: só grupos da biópsia, com mucosa e plexo da submucosa");
ok(gr("Biópsia retal incisional (espessura total)").includes("Células ganglionares — plexo da camada muscular própria"), "incisional: inclui plexo da camada muscular própria");
eq(gr("Congelação / nivelamento").join(" | "), hsSite.criterios.filter(c => /^(Congelação|Margem proximal)/.test(c.g)).map(c => c.g).join(" | "), "congelação: nivelamento e margem");
ok(gr("Peça de abaixamento").every(g => /^(Peça|Margem proximal|Outras alterações|Mucosa)/.test(g)) && gr("Peça de abaixamento").includes("Peça: camadas da parede") && gr("Peça de abaixamento").some(g => /segmento aganglionar/.test(g)), "peça: grupos da peça, com camadas");
ok(gr("Rebiopsia / reoperação").some(g => /^Reoperação: técnica prévia/.test(g)) && gr("Rebiopsia / reoperação").some(g => /^Células ganglionares/.test(g)) && !gr("Rebiopsia / reoperação").some(g => /^Peça/.test(g)), "rebiopsia: grupos próprios");

// 16. v3.5: nota de consenso por segmento, duodeno, amostra exígua/superficial, barra do editor
({ t, els } = boot({}));
const duoCorpo = "- MUCOSA DUODENAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:\n" + t.comVR("- Celularidade preservada de leucócitos mononucleares em lâmina própria, não sendo identificada eosinofilia (até 7 eosinófilos/campo de grande aumento).", "duodeno", "2ª porção");
t.WORK.samples.push({ nome: "Mucosa duodenal (2ª porção)", corpo: duoCorpo, site: "duodeno", seg: "2ª porção" });
let l16 = t.buildLaudo();
ok(l16.includes("- Não há consenso sobre o número normal de eosinófilos na mucosa do duodeno; os valores variam"), "duodeno: nota de consenso fala do duodeno");
ok(!/do íleo|do cólon/.test(l16), "duodeno: nota não fala de íleo nem cólon");
t.WORK.samples.push({ nome: "Ceco", corpo: corpoCeco, site: "colon", seg: "Ceco" }, { nome: "Íleo", corpo: "- X:\n" + t.comVR("- Presença de eosinófilos (até 10 eosinófilos/campo de grande aumento).", "ileo", ""), site: "ileo", seg: "" });
ok(t.buildLaudo().includes("na mucosa do duodeno, do íleo e do cólon;"), "vários segmentos: todos nomeados, em ordem");
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Esôfago", corpo: "- X:\n" + t.comVR("- Exocitose de eosinófilos (até 2 eosinófilos/campo de grande aumento).", "esofago", ""), site: "esofago", seg: "" });
ok(!/Não há consenso sobre o número normal/.test(t.buildLaudo()), "esôfago: sem nota de consenso");
eq(t.SEED_SITES.duodeno.segmentos.join(), "Bulbo,2ª porção,Distal", "duodeno sem \"descendente\"");
els.fSitio.value = "duodeno"; els.fSeg.value = "2ª porção"; els.fSeg.onchange();
eq(els.fNome.value, "Mucosa duodenal (2ª porção)", "nome da amostra do duodeno");
// textos prontos de amostra exígua
for (const k of ["esofago", "gastrica", "duodeno", "ileo", "colon", "reto"]) {
  const ex = t.SEED_SITES[k].presets.filter(p => /^EXÍGUO FRAGMENTO DE MUCOSA .* SEM (ALTERAÇÕES|PARTICULARIDADES) HISTO(PATO)?LÓGICAS SIGNIFICATIVAS$/.test(p.titulo));
  ok(ex.length >= 1, "texto pronto exíguo: " + k);
  for (const p of ex) {
    eq(p.bullets[0], "Amostra exígua, pouco representativa.", "linha de amostragem primeiro: " + p.titulo);
    ok(p.titulo.startsWith("EXÍGUO FRAGMENTO DE " + t.MUC_SITIO[k]), "mucosa do próprio sítio: " + p.titulo);
    eq(t.concorda(t.presetText(p)).trocas.length, 0, "concordância sem troca: " + p.titulo);
  }
}
eq(t.SEED_SITES.gastrica.presets.filter(p => /^EXÍGUO/.test(p.titulo)).length, 3, "estômago: antral, oxíntico e cárdia");
const ilN = t.SEED_SITES.ileo.presets.filter(p => /^(EXÍGUO FRAGMENTO DE )?MUCOSA DE ÍLEO (SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS|APRESENTANDO)$/.test(p.titulo));
eq(ilN.map(p => p.titulo).join(" | "), "MUCOSA DE ÍLEO SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS | MUCOSA DE ÍLEO APRESENTANDO | EXÍGUO FRAGMENTO DE MUCOSA DE ÍLEO SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS", "íleo: dois cabeçalhos de normalidade e o exíguo");
eq(ilN[0].bullets.join("|"), ilN[1].bullets.join("|"), "íleo: os dois cabeçalhos com os mesmos achados");
eq(ilN[2].bullets.slice(1).join("|"), ilN[0].bullets.join("|"), "íleo exíguo: mesmos achados + linha de amostragem");
for (const [sg, nm] of [["Íleo terminal", "Mucosa de íleo terminal"], ["Íleo (neoterminal)", "Mucosa de íleo neoterminal"], ["Bolsa ileal", "Mucosa de bolsa ileal"], ["", "Mucosa de íleo terminal"]]) {
  els.fSitio.value = "ileo"; els.fSeg.value = sg; els.fSeg.onchange(); eq(els.fNome.value, nm, "nome do íleo sem repetição: " + (sg || "sem segmento")); }
// modificador
const TA = t.titleSetAmostra;
eq(TA("- MUCOSA ESOFÁGICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "exigua", "esofago"), "- EXÍGUO FRAGMENTO DE MUCOSA ESOFÁGICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "título MUCOSA: só prefixo");
eq(TA("- COLITE CRÔNICA INATIVA:", "exigua", "colon"), "- EXÍGUO FRAGMENTO DE MUCOSA COLÔNICA APRESENTANDO COLITE CRÔNICA INATIVA:", "outro título: mucosa do sítio + apresentando");
eq(TA("- EXÍGUO FRAGMENTO DE MUCOSA COLÔNICA APRESENTANDO COLITE CRÔNICA INATIVA:", "superficial", "colon"), "- FRAGMENTO SUPERFICIAL DE MUCOSA COLÔNICA APRESENTANDO COLITE CRÔNICA INATIVA:", "exígua -> superficial");
eq(TA("- FRAGMENTO SUPERFICIAL DE MUCOSA COLÔNICA APRESENTANDO COLITE CRÔNICA INATIVA:", null, "colon"), "- COLITE CRÔNICA INATIVA:", "adequada desfaz");
eq(TA("- GASTRITE CRÔNICA INATIVA:", "superficial", "gastrica"), "- FRAGMENTO SUPERFICIAL DE MUCOSA GÁSTRICA APRESENTANDO GASTRITE CRÔNICA INATIVA:", "superficial no estômago");
eq(t.lineKind(TA("- RETITE CRÔNICA INATIVA:", "exigua", "reto")), "b", "título com prefixo segue em negrito");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco"; els.corpo.value = "- COLITE CRÔNICA INATIVA:\n- Arquitetura glandular preservada.";
t.amostraMod("exigua");
eq(els.corpo.value, "- EXÍGUO FRAGMENTO DE MUCOSA COLÔNICA APRESENTANDO COLITE CRÔNICA INATIVA:\n- Arquitetura glandular preservada.\n- Amostra exígua, pouco representativa.", "editor: exígua põe linha e prefixo");
t.amostraMod("superficial");
ok(/^- FRAGMENTO SUPERFICIAL DE MUCOSA COLÔNICA APRESENTANDO/.test(els.corpo.value) && els.corpo.value.split("\n").filter(l => /^- Amostra (exígua|superficial)/.test(l)).length === 1 && els.corpo.value.includes("- Amostra superficial, pouco representativa."), "editor: superficial substitui exígua");
t.amostraMod(null);
eq(els.corpo.value, "- COLITE CRÔNICA INATIVA:\n- Arquitetura glandular preservada.", "editor: adequada volta ao original");
// notas e alertas
t.WORK.samples.length = 0;
const pEx = (k) => t.presetText(t.SEED_SITES[k].presets.find(p => /^EXÍGUO/.test(p.titulo)));
t.WORK.samples.push({ nome: "Esôfago", corpo: pEx("esofago"), site: "esofago", seg: "" }, { nome: "Reto", corpo: pEx("reto"), site: "reto", seg: "Reto" },
  { nome: "Antro", corpo: "- FRAGMENTO SUPERFICIAL DE MUCOSA GÁSTRICA APRESENTANDO GASTRITE CRÔNICA INATIVA:\n- Amostra superficial, pouco representativa.", site: "gastrica", seg: "Antro" });
l16 = t.buildLaudo();
ok(l16.includes("- Amostras A e B: o exame histopatológico foi prejudicado pela exiguidade da amostra. Considerar viés amostral."), "nota de exiguidade, amostras juntas");
ok(l16.includes("- Amostra C: o exame histopatológico foi prejudicado pela representação superficial da amostra. Considerar viés amostral."), "nota de amostra superficial");
eq(t.alertas().length, 0, "título e linha coerentes: sem alerta");
t.WORK.samples[2].corpo = "- GASTRITE CRÔNICA INATIVA:\n- Amostra superficial, pouco representativa.";
ok(t.alertas().some(a => /amostra superficial não batem/.test(a.msg)), "linha sem prefixo no título: alerta");
// barra do editor
const M = t.marcaSel;
eq(M("abc def", 4, 7, "up").text, "abc DEF", "caixa alta");
eq(M("ABC DEF", 0, 3, "low").text, "abc DEF", "caixa baixa");
let r = M("abc def", 4, 7, "b");
eq(r.text, "abc **def**", "negrito"); eq(M(r.text, r.a, r.b, "b").text, "abc def", "negrito de novo desfaz");
r = M("abc def", 0, 3, "i"); eq(r.text, "*abc* def", "itálico"); eq(M(r.text, r.a, r.b, "i").text, "abc def", "itálico desfaz");
r = M("abc def", 0, 7, "u"); eq(r.text, "__abc def__", "sublinhado"); eq(M(r.text, 0, r.text.length, "u").text, "abc def", "sublinhado desfaz com as marcas selecionadas");
eq(M("abc", 1, 1, "b"), null, "sem seleção: nada");
eq(t.fmtMarcas("a **b** *c* __d__"), "a <b>b</b> <i>c</i> <u>d</u>", "marcas viram formatação");
eq(t.tiraMarcas("a **b** *c* __d__"), "a b c d", "texto simples sem marcas");
ok(t.laudoToRichHTML("Materiais: x.\n \nA) X:\n- Linha com **destaque** e __sublinhado__.").includes("Linha com <b>destaque</b> e <u>sublinhado</u>."), "cópia formatada para o MV");
ok(t.laudoToPreviewHTML("Materiais: x.\n \nA) X:\n- Linha com *itálico*.").includes("<i>itálico</i>"), "prévia formatada");
ok(t.laudoToRichHTML("Materiais: x.\n \nA) X:\n- GASTRITE ASSOCIADA A H. PYLORI:").includes("<i>H. PYLORI</i>"), "itálico do H. pylori continua");

// 17. v3.5.1: duodeno, cólon e reto com os dois cabeçalhos de normalidade (como o íleo)
for (const [k, muc] of [["duodeno", "MUCOSA DUODENAL"], ["colon", "MUCOSA COLÔNICA"], ["reto", "MUCOSA RETAL"], ["ileo", "MUCOSA DE ÍLEO"], ["esofago", "MUCOSA ESOFÁGICA"], ["gastrica", "MUCOSA GÁSTRICA DE PADRÃO ANTRAL"], ["gastrica", "MUCOSA GÁSTRICA DE PADRÃO OXÍNTICO"]]) {
  const ps = t.SEED_SITES[k].presets, achar = (tt) => ps.filter(p => p.titulo === tt);
  const sem = achar(muc + " SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS"), apr = achar(muc + " APRESENTANDO"), ex = achar("EXÍGUO FRAGMENTO DE " + muc + " SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS");
  ok(sem.length === 1 && apr.length === 1 && ex.length === 1, k + ": dois cabeçalhos e um exíguo");
  eq(apr[0].bullets.join("|"), sem[0].bullets.join("|"), k + ": mesmos achados nos dois cabeçalhos");
  eq(ex[0].bullets.join("|"), ["Amostra exígua, pouco representativa."].concat(sem[0].bullets).join("|"), k + ": exíguo com os mesmos achados");
  ok(!ps.some(p => /SEM (ALTERAÇÕES|PARTICULARIDADES) HISTOPATOLÓGICAS/.test(p.titulo)), k + ": sem a redação antiga");
  for (const p of [sem[0], apr[0], ex[0]]) { eq(t.lineKind("- " + p.titulo + ":"), "b", "negrito: " + p.titulo); eq(t.concorda(t.presetText(p)).trocas.length, 0, "concordância: " + p.titulo); }
  eq(ps.indexOf(apr[0]), ps.indexOf(sem[0]) + 1, k + ": \"apresentando\" logo depois");
}

// 18. v3.6: estômago conforme o segmento, celíaca, duodeno (criptite, título, Whitehead), agregados, metaplasia foveolar, atrofia vilositária
({ t, els } = boot({}));
const G = t.SEED_SITES.gastrica, D = t.SEED_SITES.duodeno, I = t.SEED_SITES.ileo;
const hp = t.presetText(G.presets.find(p => /PYLORI POSITIVA/i.test(p.titulo)));
let a = t.adaptaGas(hp, "Antro");
ok(a.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, EM MUCOSA DE ANTRO, COM PESQUISA PARA H. pylori POSITIVA (+2/+3):"), "H. pylori: título vai para antro");
ok(a.includes("\n- Amostragem: Mucosa gástrica de padrão antral.\n") && !/oxíntico/i.test(a), "H. pylori: linha de amostragem vai para antro");
eq(t.adaptaGas(a, "Corpo/fundo (oxíntico)").split("\n")[0], "- GASTRITE CRÔNICA EM ATIVIDADE LEVE, EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO), COM PESQUISA PARA H. pylori POSITIVA (+2/+3):", "volta para corpo/fundo");
ok(t.adaptaGas(hp, "Transição corpo-antro").includes("EM MUCOSA DE TRANSIÇÃO CORPO-ANTRO") && t.adaptaGas(hp, "Misto oxíntico/mucinoso").includes("- Amostragem: Mucosa gástrica de padrão misto oxíntico/mucinoso."), "transição e misto");
ok(t.adaptaGas(hp, "Cárdia").startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, EM MUCOSA DE PADRÃO CÁRDIA,") && t.adaptaGas(hp, "Cárdia").includes("- Amostragem: Mucosa gástrica de padrão cárdia (glândulas mucinosas)."), "cárdia: agora adapta título e linha (v3.9)"); eq(t.adaptaGas(hp, "Incisura"), hp, "incisura: sem adaptação");
eq(t.adaptaGas("- MUCOSA GÁSTRICA DE PADRÃO OXÍNTICO SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "Antro"), "- MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "normalidade");
eq(t.adaptaGas("- GASTROPATIA REATIVA EM MUCOSA OXÍNTICA (PADRÃO CORPO/FUNDO):", "Antro"), "- GASTROPATIA REATIVA EM MUCOSA DE ANTRO:", "gastropatia reativa");
const linfG = t.presetText(G.presets.find(p => /LINFOCITÁRIO/.test(p.titulo)));
ok(t.adaptaGas(linfG, "Antro").includes("Amostragem: Mucosa gástrica de padrão oxíntico (corpo/fundo) e padrão misto"), "linha combinada não é tocada");
for (const seg of ["Antro", "Corpo/fundo (oxíntico)"]) {
  const tx = t.gasTextos(G, seg).map(p => p.titulo);
  eq(new Set(tx).size, tx.length, "textos do estômago sem repetição: " + seg);
  ok(!tx.some(x => (seg === "Antro" ? /OXÍNTIC|CORPO\/FUNDO/ : /ANTRO|ANTRAL/).test(x)), "textos só do segmento: " + seg);
}
const normAntro = t.gasTextos(G, "Antro").find(p => p.titulo === "MUCOSA GÁSTRICA DE PADRÃO ANTRAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS");
ok(normAntro.bullets.includes("Classificação OLGA: Estágio 0."), "antro: fica o texto nativo do antro (com OLGA)");
// editor: segmento, botão de amostragem e título editado
els.fSitio.value = "gastrica"; els.fSeg.value = "Corpo/fundo (oxíntico)"; els.corpo.value = hp;
els.fSeg.value = "Antro"; els.fSeg.onchange();
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, EM MUCOSA DE ANTRO,") && els.corpo.value.includes("- Amostragem: Mucosa gástrica de padrão antral."), "trocar o segmento adapta o editor");
t.appendLine("- Amostragem: Mucosa gástrica de padrão oxíntico (corpo/fundo).");
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA EM ATIVIDADE LEVE, EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO),") && els.corpo.value.split("\n").filter(l => /^- Amostragem:/.test(l)).length === 1, "botão de amostragem ajusta o título, sem duplicar a linha");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO)", "EM MUCOSA DE ANTRO");
els.corpo.onchange();
ok(els.corpo.value.includes("- Amostragem: Mucosa gástrica de padrão antral."), "título editado ajusta a linha de amostragem");
// estômago: grau do título = grau da linha
for (const p of G.presets) { const m = p.titulo.match(/EM ATIVIDADE (LEVE|MODERADA|ACENTUADA)/), l = p.bullets.find(b => /infiltrado inflamatório neutrofílico/.test(b));
  if (m && l) eq(t.grauDaLinha("- " + l), "EM ATIVIDADE " + m[1], "estômago: linha no grau do título: " + p.titulo.slice(0, 50)); }
ok(G.presets.find(p => /LINFOCITÁRIO/.test(p.titulo)).bullets.some(b => /moderado em lâmina própria, com criptite/.test(b)), "gastropatia linfocitária: linha moderada como o título");
// duodeno: criptite, título linfocítico e variante inativa
eq(t.LINHA_ATIV.duodeno.length, 3, "duodeno: ausente, sem criptite, com criptite");
ok(D.criterios.find(c => c.g === "Infiltrado neutrofílico").opt.map(o => o[0]).join() === "Ausente,Presente, sem criptite,Presente, com criptite", "achados de neutrófilos do duodeno");
const dL = D.presets.find(p => p.titulo === "DUODENITE CRÔNICA MODERADA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), EM ATIVIDADE (VIDE NOTAS)"), dLi = D.presets.find(p => p.titulo === "DUODENITE CRÔNICA MODERADA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), INATIVA (VIDE NOTAS)");
ok(dL && dLi, "duodenite linfocítica em atividade e inativa");
ok(!D.presets.some(p => /DUODENITE.*(VILOSIDADES|CRIPTAS)/.test(p.titulo)), "sem vilosidades e criptas no título");
ok(dL.bullets.some(b => /neutrofílico em lâmina própria, sem criptite/.test(b)) && dLi.bullets.some(b => /^Ausência de infiltrado inflamatório neutrofílico/.test(b)), "linhas de atividade dos dois");
for (const k of Object.keys(t.SEED_SITES)) if (k !== "esofago") for (const p of t.SEED_SITES[k].presets) for (const b of p.bullets)
  if (/^Presença de infiltrado inflamatório neutrofílico/.test(b)) ok(/criptite/.test(b), "linha de neutrófilos diz se há criptite: " + k + " / " + p.titulo.slice(0, 40));
els.fSitio.value = "duodeno"; els.fSeg.value = "2ª porção"; els.corpo.value = t.presetText(dLi);
t.appendLine(t.LINHA_ATIV.duodeno.map(x => "- " + x)[2]);
ok(els.corpo.value.startsWith("- DUODENITE CRÔNICA MODERADA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), EM ATIVIDADE (VIDE NOTAS):"), "criptite presente: em atividade (grau Whitehead embutido)");
// grau Whitehead
const wh = D.criterios.find(c => /Whitehead/.test(c.g));
ok(wh && wh.opt.every(o => /\[@whitehead\]/.test(o[1])), "grupo Whitehead com critério e referência");
t.appendLine(wh.opt[1][1]);
ok(els.corpo.value.startsWith("- DUODENITE CRÔNICA MODERADA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), EM ATIVIDADE (VIDE NOTAS):"), "grau Whitehead entra no título");
t.appendLine(wh.opt[2][1]);
ok(els.corpo.value.startsWith("- DUODENITE CRÔNICA ACENTUADA DE PADRÃO LINFOCÍTICO,") && els.corpo.value.split("\n").filter(l => /^- Grau da duodenite/.test(l)).length === 1, "troca de grau sem duplicar");
els.corpo.onfocus(); els.corpo.value = els.corpo.value.split("\n").filter(l => !/^- Grau da duodenite/.test(l)).join("\n"); els.corpo.onchange();
ok(els.corpo.value.startsWith("- DUODENITE CRÔNICA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), EM ATIVIDADE (VIDE NOTAS):"), "linha retirada: grau sai do título");
eq(t.titleSetGrauDuo("- DUODENITE CRÔNICA INATIVA:", "LEVE"), "- DUODENITE CRÔNICA LEVE, INATIVA:", "grau antes da atividade, com vírgula");
eq(t.titleSetGrauDuo("- DUODENITE CRÔNICA LEVE, INATIVA:", null), "- DUODENITE CRÔNICA INATIVA:", "e sai sem deixar vírgula");
eq(t.titleSetGrauDuo("- GASTRITE CRÔNICA INATIVA:", "LEVE"), "- GASTRITE CRÔNICA INATIVA:", "só em duodenite");
// notas de celíaca
const celCorpo = t.presetText(dL);
eq(t.notaCeliaca(celCorpo), t.NOTA_CELIACA, "linfocitose + Marsh 3B: favorece celíaca");
eq(t.notaCeliaca("- DUODENITE CRÔNICA DE PADRÃO LINFOCÍTICO, INATIVA (VIDE NOTAS):\n- Linfocitose intraepitelial: Presente (exocitose de aproximadamente 35 linfócitos/100 enterócitos nas pontas das vilosidades).\n- Classificação de Marsh-Oberhuber (1999): 1."), t.NOTA_LINF_DUO, "linfocitose sem atrofia: padrão linfocítico inespecífico");
eq(t.notaCeliaca(t.presetText(D.presets[0])), null, "duodeno normal: sem nota");
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "Mucosa duodenal (2ª porção)", corpo: celCorpo, site: "duodeno", seg: "2ª porção" });
let lc = t.buildLaudo();
ok(/favorece doença celíaca, embora não seja específica: outras causas de atrofia vilositária, .* devem ser afastadas \[\d+(?:,\d+)?\]; a confirmação requer correlação com sorologia/.test(lc) && lc.includes(t.CITE.smyrk17) && lc.includes(t.CITE.husby20) && !/\[@/.test(lc), "nota de celíaca no laudo, com referências numeradas");
ok(t.LIB.notas.some(n => n.tag === "Celíaca") && t.LIB.notas.some(n => n.tag === "Duodenite linfocítica"), "notas de celíaca na biblioteca");
// agregados, metaplasia foveolar e atrofia vilositária
for (const [nome, site] of [["estômago", G], ["íleo", I]]) ok(site.criterios.some(c => c.g === "Agregados linfoides"), "agregados linfoides: " + nome);
{ const mf = I.criterios.find(c => c.g === "Metaplasia foveolar gástrica"), av = I.criterios.find(c => c.g === "Atrofia vilositária");
  ok(mf && mf.opt.length === 4 && av && av.opt.length === 4, "metaplasia foveolar e atrofia vilositária: íleo");
  ok(av.opt.slice(1).every(o => /Marsh-Oberhuber 3[ABC] \[@oberhuber\]/.test(o[1])), "atrofia com Marsh-Oberhuber e referência: íleo"); }
const avD = D.criterios.find(c => c.g === "Atrofia vilositária (Marsh-Oberhuber / Corazza-Villanacci)");
ok(D.criterios.find(c => c.g === "Metaplasia foveolar gástrica").opt.length === 4 && avD && avD.opt.length === 6, "duodeno: metaplasia foveolar e linha única de atrofia");
els.fSitio.value = "duodeno"; els.corpo.value = "- DUODENITE CRÔNICA INATIVA:";
const mfo = D.criterios.find(c => c.g === "Metaplasia foveolar gástrica").opt, avo = avD.opt;
t.appendLine(mfo[1][1]); t.appendLine(mfo[3][1]); t.appendLine(avo[4][1]);
ok(els.corpo.value.startsWith("- DUODENITE CRÔNICA, COM ATROFIA VILOSITÁRIA MODERADA, INATIVA:"), "atrofia sem Marsh: título só com a atrofia");
t.appendLine(avo[0][1]);
eq(els.corpo.value, "- DUODENITE CRÔNICA INATIVA:\n" + avo[0][1] + "\n" + mfo[3][1], "metaplasia foveolar e atrofia trocam sem duplicar; atrofia logo abaixo do título");
for (const k of ["gastrica", "duodeno", "ileo"]) for (const p of t.SEED_SITES[k].presets) eq(t.concorda(t.presetText(p)).trocas.length, 0, "concordância: " + p.titulo.slice(0, 40));

// 19. v3.6 (validado): Oberhuber, notas revistas, Marsh 1, orientação, relação vilosidade/cripta, Corazza-Villanacci
({ t, els } = boot({}));
const D2 = t.SEED_SITES.duodeno;
const av2 = t.SEED_SITES.ileo.criterios.find(c => c.g === "Atrofia vilositária").opt;
ok(!JSON.stringify(av2).includes("subtotal") && /mucosa plana, sem vilosidades; Marsh-Oberhuber 3C/.test(av2[3][1]) && /apenas restos curtos de vilosidades; Marsh-Oberhuber 3B/.test(av2[2][1]), "atrofia nos termos de Oberhuber, sem subtotal");
ok(/10% a 20% dos casos de linfocitose intraepitelial sem atrofia vilositária \[@smyrk17\]/.test(t.NOTA_LINF_DUO) && /giardíase, hipersensibilidade alimentar, doenças autoimunes, imunodeficiências e doença inflamatória intestinal \[@lauwers15\]/.test(t.NOTA_LINF_DUO), "nota do padrão linfocítico revista");
ok(/imunodeficiência comum variável, enteropatia autoimune e medicamentos \(anti-inflamatórios não esteroides, olmesartana\), devem ser afastadas \[@smyrk17,villanacci20\]/.test(t.NOTA_CELIACA), "nota de celíaca com diferenciais");
ok(t.LIB.notas.find(n => n.tag === "Celíaca").texto.includes("olmesartana") && t.LIB.notas.find(n => n.tag === "Duodenite linfocítica").texto.includes("10% a 20%"), "biblioteca igual às notas automáticas");
ok(D2.criterios.some(c => c.g === "Orientação dos fragmentos") && !D2.criterios.some(c => /^(Relação vilosidade\/cripta|Arquitetura vilositária)$/.test(c.g)), "orientação; relação V/C e arquitetura entram na linha única de atrofia");
ok(/Marsh 1 .* não é específico/.test(D2.criterios.find(c => c.g === "Marsh-Oberhuber (1999)").dica), "dica do Marsh 1");
// Corazza-Villanacci pelo Marsh
const mo = D2.criterios.find(c => c.g === "Marsh-Oberhuber (1999)").opt;
els.fSitio.value = "duodeno"; els.fSeg.value = "2ª porção"; els.corpo.value = "- DUODENITE CRÔNICA INATIVA:\n- Agregados linfoides: Presentes.";
const cz = () => els.corpo.value.split("\n").filter(l => /Corazza-Villanacci/.test(l));
t.appendLine(mo[5][1]);
eq(cz().join(), "- Classificação de Corazza-Villanacci (2007): B2 (atrófica, vilosidades não identificáveis) [@corazza07].", "3C -> B2");
eq(els.corpo.value.split("\n")[0], "- DUODENITE CRÔNICA, COM ATROFIA VILOSITÁRIA ACENTUADA (MARSH-OBERHUBER 3C; CORAZZA-VILLANACCI B2), INATIVA:", "3C -> título com atrofia e classificações");
ok(els.corpo.value.indexOf("Corazza") > els.corpo.value.indexOf("Marsh-Oberhuber"), "Corazza logo depois do Marsh");
t.appendLine(mo[3][1]); eq(cz().length, 1, "troca sem duplicar"); ok(/: B1 /.test(cz()[0]), "3A -> B1");
t.appendLine(mo[4][1]); ok(/: B1 /.test(cz()[0]), "3B -> B1");
t.appendLine(mo[2][1]); ok(/: A \(não atrófica\)/.test(cz()[0]), "2 -> A");
t.appendLine(mo[1][1]); ok(/: A \(não atrófica\)/.test(cz()[0]), "1 -> A");
t.appendLine(mo[0][1]); eq(cz().length, 0, "0 -> sem Corazza");
ok(!/CORAZZA|MARSH|ATROFIA/.test(els.corpo.value.split("\n")[0]), "Marsh 0: título sem atrofia nem classificações");
els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace("(1999): 0.", "(1999): 3C (tipo destrutivo)."); els.corpo.onchange();
ok(cz().length === 1 && /: B2 /.test(cz()[0]), "Marsh editado à mão atualiza Corazza");
const dLp = D2.presets.find(p => /PADRÃO LINFOCÍTICO.*EM ATIVIDADE/.test(p.titulo));
ok(dLp.bullets.some(b => /^Classificação de Corazza-Villanacci \(2007\): B1/.test(b)), "texto pronto com Corazza");
ok(!D2.presets.filter(p => p.bullets.some(b => /Marsh-Oberhuber \(1999\): 0\./.test(b))).some(p => p.bullets.some(b => /Corazza/.test(b))), "Marsh 0 sem Corazza nos textos prontos");
// alertas
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Duodeno", site: "duodeno", seg: "2ª porção", corpo: "- DUODENITE CRÔNICA INATIVA:\n- Classificação de Marsh-Oberhuber (1999): 1.\n- Classificação de Corazza-Villanacci (2007): A (não atrófica) [@corazza07].\n- Orientação dos fragmentos: Inadequada (avaliação da arquitetura e graduação de Marsh-Oberhuber prejudicadas [@husby20])." });
const al = t.alertas().map(a => a.msg).join(" | ");
ok(/Marsh 1 não é específico/.test(al) && /orientação inadequada/.test(al), "alertas: Marsh 1 e orientação inadequada");
const lz = t.buildLaudo();
ok(lz.includes(t.CITE.corazza07) && lz.includes(t.CITE.husby20) && !/\[@/.test(lz), "refs de Corazza e Husby numeradas");
for (const p of D2.presets) eq(t.concorda(t.presetText(p)).trocas.length, 0, "concordância: " + p.titulo.slice(0, 40));

// 20. v3.6.1: botão ⟳ (vindo da v3.5.3 do vault) roda a sincronia título <-> linhas
({ t, els } = boot({}));
els.fSitio.value = "duodeno"; els.fSeg.value = "2ª porção";
els.corpo.value = "- DUODENITE CRÔNICA INATIVA:\n- Classificação de Marsh-Oberhuber (1999): 3C (tipo destrutivo).";
els.tb_sync.onclick();
ok(/Corazza-Villanacci \(2007\): B2/.test(els.corpo.value), "⟳ sincroniza (Corazza a partir do Marsh)");
ok(html.includes('id="tb_sync"'), "botão ⟳ na barra do editor");

// 21. v3.7: achados eosinofílicos associados integrados (achados por sítio, título, notas, alertas, referências)
({ t, els } = boot({}));
const grupoAss = (k) => t.SEED_SITES[k].criterios.find(c => c.g === "Eosinófilos: achados associados");
eq(grupoAss("esofago").stack.pos, " [@gio]", "esôfago: referência Giordano");
for (const k of ["gastrica", "duodeno", "ileo", "colon", "reto"]) eq(grupoAss(k).stack.pos, " [@campora22]", k + ": referência Campora");
ok(grupoAss("esofago").stack.itens.some(i => /4 ou mais eosinófilos, sem epitélio entre eles/.test(i[1])) && grupoAss("esofago").stack.itens.some(i => /3 ou mais alinhados no terço superior/.test(i[1])), "esôfago: critérios de microabscesso e camada superficial");
ok(grupoAss("gastrica").stack.itens.some(i => /muscular da mucosa/.test(i[1])) && grupoAss("gastrica").stack.itens.some(i => /destruição glandular/.test(i[1])), "estômago: muscular da mucosa e destruição glandular");
ok(grupoAss("duodeno").stack.itens.some(i => /camadas profundas/.test(i[1])) && grupoAss("duodeno").stack.itens.some(i => /epitélio de superfície e nas criptas/.test(i[1])), "duodeno: epitélio/criptas e camadas profundas");
ok(grupoAss("colon").stack.itens.some(i => /criptite eosinofílica/.test(i[1])) && grupoAss("colon").stack.itens.some(i => /lençóis/.test(i[1])), "cólon: criptite e lençóis");
ok(grupoAss("colon") === grupoAss("reto"), "reto usa o grupo do cólon");
for (const k of ["esofago", "gastrica", "duodeno", "colon"]) ok(/\[@(gio|campora22)\]\)\.$/.test(grupoAss(k).opt[0][1]), k + ": \"Ausentes\" com referência");
// título
const TE = (tt, est) => t.titleSetEos(tt, est);
eq(TE("- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO:", "padrao"), "- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):", "padrão eosinofílico entra no título");
eq(TE("- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):", null), "- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO (VIDE NOTAS):", "e sai quando não há padrão");
eq(TE("- ESOFAGITE CRÔNICA INATIVA:", "eoe"), "- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):", "esôfago com 15 ou mais: título só diz padrão eosinofílico");
eq(TE("- ESOFAGITE CRÔNICA INATIVA, COMPATÍVEL COM ESOFAGITE EOSINOFÍLICA (VIDE NOTAS):", "padrao"), "- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):", "esôfago: título antigo (compatível) troca para padrão");
eq(TE("- MUCOSA COLÔNICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "padrao"), "- MUCOSA COLÔNICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "normalidade não muda");
eq(TE("- COLITE CRÔNICA INATIVA:", undefined), "- COLITE CRÔNICA INATIVA:", "sem dado de eosinófilos não mexe");
eq(TE("- COLITE CRÔNICA INATIVA (DECH POSSÍVEL – NIH/2014):", "padrao"), "- COLITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (DECH POSSÍVEL – NIH/2014) (VIDE NOTAS):", "preserva o sufixo DECH");
eq(t.eosEstado("- Presença de eosinófilos (até 44 eosinófilos/campo de grande aumento).", "duodeno", "2ª porção"), "padrao", "duodeno 44: compatível");
eq(t.eosEstado("- Presença de eosinófilos (até 30 eosinófilos/campo de grande aumento).", "duodeno", "2ª porção"), null, "duodeno 30: sem padrão");
eq(t.eosEstado("- Presença de eosinófilos (até 88 eosinófilos/campo de grande aumento).", "colon", "Ceco"), "padrao", "ceco 88: compatível");
eq(t.eosEstado("- Exocitose de eosinófilos (até 12 eosinófilos/campo de grande aumento).", "esofago", ""), "eoe", "esôfago 12: EoE");
eq(t.eosEstado("- Exocitose de eosinófilos (até 11 eosinófilos/campo de grande aumento).", "esofago", ""), null, "esôfago 11: sem padrão");
eq(t.eosEstado("- Exocitose de eosinófilos (até 5 eosinófilos/campo de grande aumento).\n- Achados eosinofílicos associados: Microabscessos eosinofílicos [@gio].", "esofago", ""), "padrao", "esôfago abaixo do limiar com achado: padrão");
eq(t.eosEstado("- Arquitetura glandular preservada.", "colon", "Ceco"), undefined, "sem dado: indefinido");
// editor
const hcE = (k, g, i) => t.SEED_SITES[k].criterios.find(c => c.g === g).opt[i][1];
els.fSitio.value = "gastrica"; els.fSeg.value = "Antro"; els.corpo.value = "- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO:\n- Amostragem: Mucosa gástrica de padrão antral.";
const ga = grupoAss("gastrica"), linhaGa = ga.stack.pre + "Eosinófilos em muscular da mucosa" + ga.stack.pos + ".";
t.appendLine(linhaGa);
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):"), "editor: achado associado ajusta o título");
t.appendLine(ga.opt[0][1]);
ok(els.corpo.value.startsWith("- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO (VIDE NOTAS):") && els.corpo.value.split("\n").filter(l => /^- Achados eosinofílicos associados/.test(l)).length === 1, "editor: \"Ausentes\" troca a linha e tira o padrão");
els.fSitio.value = "esofago"; els.fSeg.value = ""; els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA:";
t.appendLine("- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).");
ok(els.corpo.value.startsWith("- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):"), "editor: esôfago 21 vira padrão eosinofílico no título");
els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace("até 21 eosinófilos", "até 3 eosinófilos"); els.corpo.onchange();
ok(!/EOSINOF/.test(els.corpo.value.split("\n")[0]), "editor: contagem editada à mão abaixo do limiar tira o trecho");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco"; els.corpo.value = "- COLITE CRÔNICA INATIVA:\n- Presença de eosinófilos (até 90 eosinófilos/campo de grande aumento).";
els.corpo.onfocus(); els.tb_sync.onclick();
ok(/^- COLITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO \(VIDE NOTAS\):/.test(els.corpo.value), "botão ⟳: cólon 90 ganha padrão eosinofílico");
// texto pronto da EoE e notas
const eoeP = t.SEED_SITES.esofago.presets.find(p => /^ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO/.test(p.titulo));
ok(eoeP && eoeP.bullets.some(b => /^Achados eosinofílicos associados: Não identificados/.test(b)) && !t.SEED_SITES.esofago.presets.some(p => /COMPATÍVEL COM ESOFAGITE EOSINOFÍLICA/.test(p.titulo)), "texto pronto da EoE coerente com a regra");
eq(t.eosEstado(t.presetText(eoeP), "esofago", ""), "eoe", "texto pronto da EoE: estado eoe");
t.WORK.samples.length = 0;
const eoeMicro = t.presetText(eoeP).replace(/- Achados eosinofílicos associados: .*/, "- Achados eosinofílicos associados: Microabscessos eosinofílicos (agrupamentos de 4 ou mais eosinófilos, sem epitélio entre eles) [@gio].");
t.WORK.samples.push({ nome: "Esôfago distal", corpo: eoeMicro, site: "esofago", seg: "Terço distal" }, { nome: "Esôfago proximal", corpo: eoeMicro, site: "esofago", seg: "Terço proximal" },
  { nome: "Antro", corpo: "- GASTRITE CRÔNICA LEVE, INATIVA, EM MUCOSA DE ANTRO, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):\n" + linhaGa, site: "gastrica", seg: "Antro" });
const l21 = t.buildLaudo();
ok(/- Amostras A e B: microabscessos eosinofílicos e eosinófilos em camada superficial são característicos de esofagite eosinofílica e raros em outras esofagites \[\d+\]\./.test(l21), "nota da EoE com microabscesso, amostras juntas");
ok(/- Amostras A, B e C: os achados eosinofílicos associados descritos reforçam o padrão eosinofílico; a densidade isolada não é suficiente/.test(l21), "nota dos achados qualitativos, amostras juntas");
ok(/achado histológico compatível com esofagite eosinofílica em atividade; imprescindível correlação clínica-laboratorial-endoscópica e exclusão de causas secundárias \[\d+\]/.test(l21), "nota de contagem do esôfago revista (v3.8.1)");
ok(l21.includes(t.CITE.campora22) && l21.includes(t.CITE.gio) && !/\[@/.test(l21), "referências Campora e Giordano numeradas");
ok(!t.alertas().some(a => /padrão eosinofílico/.test(a.msg)), "títulos coerentes: sem alerta de padrão eosinofílico");
t.WORK.samples.push({ nome: "Ceco", corpo: "- MUCOSA COLÔNICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:\n- Achados eosinofílicos associados: Criptite eosinofílica [@campora22].", site: "colon", seg: "Ceco" });
ok(t.alertas().some(a => /Amostra D: há achados eosinofílicos associados e o título não indica o padrão eosinofílico/.test(a.msg)), "normalidade com achado: alerta");
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Ceco", corpo: "- COLITE CRÔNICA INATIVA:\n- Achados eosinofílicos associados: Não identificados (sem agregados) [@campora22].", site: "colon", seg: "Ceco" });
ok(!/reforçam o padrão eosinofílico/.test(t.buildLaudo()), "achados ausentes: sem nota nova");
for (const k of ["esofago", "gastrica", "duodeno", "colon"]) { const g = grupoAss(k); const linha = g.stack.pre + g.stack.itens.map(i => i[1]).join(", ") + g.stack.pos + ".";
  eq(t.concorda(linha).trocas.length, 0, "concordância da linha de achados: " + k); eq(t.concorda(g.opt[0][1]).trocas.length, 0, "concordância de \"ausentes\": " + k); }
ok(html.includes("Campora M, et al. Pathologica. 2022;114(1):79-88") && html.includes("grupo \"Eosinófilos: achados associados\""), "painel com fonte e indicação do grupo");

// 22. v3.8: Materiais (lista visível), nome da amostra do esôfago, esofagite dissecante superficial
({ t, els } = boot({}));
const selHtml = html.match(/<select id="fPrefixoSel">([\s\S]*?)<\/select>/)[1];
eq((selHtml.match(/<option/g) || []).length, 7, "Materiais: 6 opções + Outro…");
for (const p of t.PREFIXOS) ok(selHtml.includes(">" + p + "<"), "opção visível: " + p);
ok(!/<datalist id="prefixList"/.test(html), "sem datalist que escondia as opções");
els.fPrefixoSel.value = "Biópsias colonoscópicas de:"; els.fPrefixoSel.onchange();
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "Reto", corpo: "- RETITE CRÔNICA INATIVA:", site: "reto", seg: "Reto" });
ok(t.buildLaudo().startsWith("Materiais: Biópsias colonoscópicas de: A) Reto."), "opção da lista vai para o laudo");
els.fPrefixoSel.value = "__outro"; els.fPrefixo.value = "Fragmentos de:"; els.fPrefixoSel.onchange();
ok(!els.fPrefixo.hidden && t.buildLaudo().startsWith("Materiais: Fragmentos de: A) Reto."), "Outro… com texto livre");
const st22 = {}; ({ t, els } = boot(st22)); t.WORK.prefixo = "Peças cirúrgicas de:"; t.saveNow();
({ t, els } = boot(st22));
ok(els.fPrefixoSel.value === "__outro" && els.fPrefixo.value === "Peças cirúrgicas de:" && !els.fPrefixo.hidden, "rascunho com prefixo fora da lista abre em Outro…");
// nome da amostra no esôfago
({ t, els } = boot({}));
for (const [sg, nm] of [["", "Esôfago"], ["Terço proximal", "Esôfago proximal"], ["Terço distal", "Esôfago distal"], ["Terço médio", "Mucosa esofágica (terço médio)"], ["Transição esôfago-gástrica", "Transição esofagogástrica"]]) {
  els.fSitio.value = "esofago"; els.fSeg.value = sg; els.fSeg.onchange(); eq(els.fNome.value, nm, "nome do esôfago: " + (sg || "sem segmento")); }
ok(!els.nomeBtns.hidden, "botões de nome visíveis no esôfago");
els.nb_esodist.onclick(); eq(els.fNome.value, "Esôfago distal", "botão Esôfago distal");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco"; els.fSeg.onchange(); ok(els.nomeBtns.hidden, "botões escondidos fora do esôfago");
ok(t.MATS_PADRAO.includes("Esôfago proximal") && t.MATS_PADRAO.includes("Esôfago distal"), "nomes no autocompletar");
// EDS
const gE = t.SEED_SITES.esofago.criterios.find(c => /^Descamação superficial/.test(c.g));
ok(gE && gE.stack.pos === " [@carmack09,hart15,rubrecht25]", "grupo de descamação com referências");
const L3 = "- Achados de descamação superficial: Aspecto em dois tons (núcleos picnóticos e necróticos na zona superficial, sobre zona basal de aspecto normal), descamação e flaking da camada superficial em lâminas, com clivagem intraepitelial e paraqueratose proeminente (de várias camadas celulares) [@carmack09,hart15,rubrecht25].";
const L1 = "- Achados de descamação superficial: Paraqueratose [@carmack09,hart15,rubrecht25].";
eq(t.edsEstado(L3), "suficiente", "3 critérios: suficiente");
eq(t.edsEstado(L1), "inesp", "1 critério: inespecífico");
eq(t.edsEstado("- Achados de descamação superficial: Aspecto em dois tons (x) e paraqueratose [@carmack09]."), "inesp", "2 critérios: inespecífico");
eq(t.edsEstado("- Achados de descamação superficial: Não identificados."), null, "ausentes");
eq(t.edsEstado("- Ausência de hiperplasia da camada basal."), undefined, "sem linha");
eq(t.titleSetEds("- MUCOSA ESOFÁGICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "suficiente"), "- ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):", "normalidade vira título de EDS");
eq(t.titleSetEds("- MUCOSA ESOFÁGICA APRESENTANDO:", "suficiente"), "- ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):", "\"apresentando\" vira título de EDS");
const tEoE = "- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):";
const tEoEeds = t.titleSetEds(tEoE, "suficiente");
eq(tEoEeds, "- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO, COM ACHADOS HISTOLÓGICOS DE ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):", "esofagite ganha o trecho de EDS");
eq(t.titleSetEds(tEoEeds, "inesp"), tEoE, "trecho sai quando os critérios caem");
eq(t.titleSetEds(tEoE, "inesp"), tEoE, "inespecífico não muda o título");
eq(t.lineKind(tEoEeds), "b", "título em negrito");
// editor
els.fSitio.value = "esofago"; els.fSeg.value = "Terço distal"; els.corpo.value = "- MUCOSA ESOFÁGICA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:\n- Ausência de hiperplasia da camada basal.";
t.appendLine(L3);
ok(els.corpo.value.startsWith("- ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):"), "editor: 3 critérios mudam o título");
t.appendLine(L1);
ok(els.corpo.value.split("\n").filter(l => /^- Achados de descamação/.test(l)).length === 1, "linha de descamação troca, não duplica");
els.corpo.value = tEoE + "\n- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).";
els.corpo.onfocus(); els.corpo.value += "\n" + L3; els.corpo.onchange();
ok(els.corpo.value.startsWith("- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO, COM ACHADOS HISTOLÓGICOS DE ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):"), "edição à mão: EoE ganha o trecho de EDS");
// texto pronto, notas, alertas
const pEds = t.SEED_SITES.esofago.presets.find(p => /^ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE/.test(p.titulo));
ok(pEds && t.edsEstado(t.presetText(pEds)) === "suficiente", "texto pronto de EDS coerente com a regra");
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Esôfago distal", corpo: t.presetText(pEds), site: "esofago", seg: "Terço distal" }, { nome: "Esôfago proximal", corpo: t.presetText(pEds), site: "esofago", seg: "Terço proximal" },
  { nome: "Esôfago", corpo: "- ESOFAGITE CRÔNICA INATIVA:\n" + L1, site: "esofago", seg: "" });
const l22 = t.buildLaudo();
ok(/- Amostras A e B: os achados histológicos \(aspecto em dois tons, descamação superficial com clivagem intraepitelial e paraqueratose\) são compatíveis com esofagite dissecante superficial \[[\d,-]+\]; o diagnóstico requer correlação com o achado endoscópico/.test(l22), "nota de EDS, amostras juntas");
ok(/- Amostra C: os achados de descamação superficial descritos são inespecíficos e podem ocorrer em diversas esofagites \[\d+,\d+\]\./.test(l22), "nota de achado inespecífico");
ok(["carmack09", "hart15", "rubrecht25", "ebigbo21"].every(k => l22.includes(t.CITE[k])) && !/\[@/.test(l22), "4 referências de EDS numeradas");
ok(!t.alertas().some(a => /dissecante/.test(a.msg)), "títulos coerentes: sem alerta");
t.WORK.samples[2].corpo = "- ESOFAGITE CRÔNICA INATIVA, COM ACHADOS HISTOLÓGICOS DE ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS):\n" + L1;
ok(t.alertas().some(a => /Amostra C: o título fala em esofagite dissecante superficial, mas a linha de descamação não tem os 3 critérios/.test(a.msg)), "alerta: título de EDS sem critérios");
t.WORK.samples[2].corpo = "- ESOFAGITE CRÔNICA INATIVA:\n" + L3;
ok(t.alertas().some(a => /Amostra C: a linha de descamação tem os critérios de esofagite dissecante superficial e o título não os menciona/.test(a.msg)), "alerta: critérios sem título de EDS");
ok(t.LIB.notas.some(n => n.tag === "EDS") && t.LIB.notas.some(n => n.tag === "Descamação inespecífica"), "notas de EDS na biblioteca");
eq(t.concorda(t.presetText(pEds)).trocas.length, 0, "concordância do texto pronto de EDS");
eq(t.concorda(gE.stack.pre + gE.stack.itens.map(i => i[1]).join(", ") + gE.stack.pos + ".").trocas.length, 0, "concordância da linha de descamação");

// 22b. EDS revisto com os textos completos (Carmack 2009, Hart 2015, Rubrecht 2025)
({ t, els } = boot({}));
const pEoE2 = t.SEED_SITES.esofago.presets.find(p => /^ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO/.test(p.titulo));
ok(!pEoE2.bullets.some(b => /^Presença de áreas de descamação superficial/.test(b)) && t.edsEstado(t.presetText(pEoE2)) === "inesp", "EoE: frase livre trocada pela linha padronizada (achado inespecífico)");
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Esôfago", corpo: t.presetText(pEoE2), site: "esofago", seg: "" });
let l22b = t.buildLaudo();
ok(/inespecíficos e podem ocorrer em diversas esofagites/.test(l22b), "nota inespecífica na redação do Pedro");
const pEds2 = t.SEED_SITES.esofago.presets.find(p => /^ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE/.test(p.titulo));
ok(/núcleos picnóticos e necróticos na zona superficial/.test(pEds2.bullets[0]) && /paraqueratose proeminente/.test(pEds2.bullets[0]), "texto pronto com as definições dos artigos");
t.WORK.samples[0] = { nome: "Esôfago", corpo: t.presetText(pEds2).replace("paraqueratose proeminente", "bolhas intraepiteliais, paraqueratose proeminente"), site: "esofago", seg: "" };
l22b = t.buildLaudo();
ok(/sem achado endoscópico característico, o diagnóstico deve permanecer descritivo/.test(l22b) && /o achado endoscópico clássico nem sempre está presente/.test(l22b), "nota de EDS: diagnóstico descritivo sem endoscopia e ressalva pediátrica");
ok(/dermatoses vesicobolhosas \(síndrome de Stevens-Johnson, pênfigo, penfigoide\), por imunofluorescência/.test(l22b), "bolhas: nota de dermatoses vesicobolhosas");

// 23. v3.8.1: notas na redação validada pelo Pedro
({ t, els } = boot({}));
ok(/desfavorece esofagite eosinofílica em atividade\.$/.test(t.eosNota("esofago", 2)), "esôfago abaixo: em atividade");
ok(/achado histológico compatível com esofagite eosinofílica em atividade; imprescindível correlação clínica-laboratorial-endoscópica e exclusão de causas secundárias \[@gio\]\.$/.test(t.eosNota("esofago", 20)), "esôfago atinge: redação validada");
ok(/desfavorece doença gastrointestinal eosinofílica em atividade neste sítio\.$/.test(t.eosNota("duodeno", 4)), "duodeno abaixo: em atividade");
ok(/achado histológico compatível com doença gastrointestinal eosinofílica em atividade neste sítio; imprescindível correlação clínica-laboratorial-endoscópica e exclusão de causas secundárias \[@pap\]\.$/.test(t.eosNota("duodeno", 60)), "duodeno atinge: redação validada");
eq(t.LIB.notas.find(n => n.tag === "Descamação inespecífica").texto, "Os achados de descamação superficial descritos são inespecíficos e podem ocorrer em diversas esofagites [@carmack09,rubrecht25].", "biblioteca: descamação na redação dele");
ok(/síndrome de Stevens-Johnson, pênfigo, penfigoide/.test(html) && /olmesartana/.test(html) && /giardíase/.test(html), "notas não validadas ficaram como antes (bolhas, celíaca, padrão linfocítico)");

// 24. v3.9: transição esofagogástrica (porções), cárdia, achados novos do esôfago, Whitehead embutido
({ t, els } = boot({}));
const ES = t.SEED_SITES.esofago, GS = t.SEED_SITES.gastrica;
els.fSitio.value = "esofago"; els.fSeg.value = "Transição esôfago-gástrica"; els.fSeg.onchange();
eq(els.fNome.value, "Transição esofagogástrica", "nome da transição");
ok(t.isTEG(), "modo transição");
els.corpo.value = "";
const pEsoT = ES.presets.find(p => p.titulo === "ESOFAGITE CRÔNICA INATIVA"), pGasN = GS.presets.find(p => p.titulo === "MUCOSA GÁSTRICA DE PADRÃO CÁRDIA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS");
t.inserePorcao("eso", pEsoT); t.inserePorcao("gas", pGasN);
let lsT = els.corpo.value.split("\n");
eq(lsT[0], "- MUCOSA DE TRANSIÇÃO ESOFAGOGÁSTRICA APRESENTANDO:", "título-mãe");
eq(t.formataAmostra("- MUCOSA DE TRANSIÇÃO ESÔFAGO-GÁSTRICA APRESENTANDO:\n- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA:\n- Parasitos: x.").split("\n")[0], "- MUCOSA DE TRANSIÇÃO ESOFAGOGÁSTRICA APRESENTANDO:", "grafia antiga do título-mãe sai na nova no laudo");
eq(lsT.filter(l => /^- MUCOSA DE TRANSIÇÃO/.test(l)).length, 1, "título-mãe uma vez só");
eq(lsT[1], "- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA:", "subtítulo esofágico");
ok(lsT.includes("- MUCOSA GÁSTRICA: PADRÃO CÁRDIA, SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:"), "subtítulo gástrico normal de cárdia");
ok(lsT.findIndex(l => /^- MUCOSA ESOFÁGICA/.test(l)) < lsT.findIndex(l => /^- MUCOSA GÁSTRICA/.test(l)), "esofágica antes da gástrica");
ok(els.corpo.value.includes("valor de referência: limiar a partir de 110/mm²"), "VR do estômago na porção gástrica");
ok(/eosinófilos\/campo de grande aumento; valor de referência: a partir de 15 por 0,3 mm²/.test(els.corpo.value), "VR do esôfago na porção esofágica");
// achados na porção certa
t.porcaoAtivaSet("eso");
t.appendLine("- Exocitose de eosinófilos (até 21 eosinófilos/campo de grande aumento).");
lsT = els.corpo.value.split("\n");
ok(/^- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO \(VIDE NOTAS\):/.test(lsT[1]), "achado esofágico muda só o subtítulo esofágico");
ok(lsT.includes("- MUCOSA GÁSTRICA: PADRÃO CÁRDIA, SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:"), "subtítulo gástrico intacto");
eq(lsT.filter(l => /eosinófilos\/campo/.test(l) && /Exocitose/.test(l)).length, 1, "linha esofágica trocada, não duplicada");
t.porcaoAtivaSet("gas");
t.appendLine("- Pesquisa para H. pylori: Positiva (+1).");
lsT = els.corpo.value.split("\n");
const iG = lsT.findIndex(l => /^- MUCOSA GÁSTRICA/.test(l));
ok(lsT.slice(iG).includes("- Pesquisa para H. pylori: Positiva (+1).") && !lsT.slice(iG).includes("- Pesquisa para H. pylori: Negativa."), "H. pylori trocado só na porção gástrica");
ok(/^- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO/.test(lsT[1]), "porção esofágica intacta");
// exígua e superficial na porção gástrica
t.amostraMod("exsup");
lsT = els.corpo.value.split("\n");
ok(lsT.includes("- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA E SUPERFICIAL, APRESENTANDO OS SEGUINTES ACHADOS HISTOLÓGICOS (VIDE NOTAS):"), "subtítulo exíguo e superficial do modelo");
ok(lsT.includes("- Amostragem: Mucosa gástrica superficial, com representação mínima de glândulas foveolares e presença de glândulas mucinosas (padrão cárdia)."), "linha de amostragem do modelo");
eq(lsT.filter(l => /^- Amostragem:/.test(l)).length, 1, "amostragem trocada, não duplicada");
// notas por porção
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "Transição esofagogástrica", corpo: els.corpo.value, site: "esofago", seg: "Transição esôfago-gástrica" });
const lT = t.buildLaudo();
ok(/- Amostra A \(porção esofágica\): a contagem de eosinófilos atinge o critério histológico de 15 por 0,3 mm²/.test(lT), "nota esofágica identificada");
ok(/- Amostra A \(porção gástrica\): a contagem de eosinófilos está abaixo do limiar de consenso para o estômago/.test(lT), "nota gástrica identificada, com VR do estômago");
ok(/- Amostra A \(porção gástrica\): o exame histopatológico foi prejudicado pela exiguidade da amostra/.test(lT) && /- Amostra A \(porção gástrica\): o exame histopatológico foi prejudicado pela representação superficial da amostra/.test(lT), "notas de viés amostral na porção gástrica");
ok(/mucosa do estômago;/.test(lT) && !/\[@/.test(lT), "consenso cita o estômago; referências numeradas");
ok(!t.alertas().some(a => /não batem/.test(a.msg)), "transição: sem alerta falso de exígua");
// substituir a porção
t.porcaoAtivaSet("eso");
t.inserePorcao("eso", ES.presets.find(p => /^MUCOSA ESOFÁGICA SEM PARTICULARIDADES/.test(p.titulo)));
lsT = els.corpo.value.split("\n");
ok(lsT[1] === "- MUCOSA ESOFÁGICA: SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:" && lsT.filter(l => /^- MUCOSA ESOFÁGICA/.test(l)).length === 1 && lsT.some(l => /^- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA/.test(l)), "novo texto esofágico substitui só a porção esofágica");
eq(t.fromSub("- MUCOSA GÁSTRICA: PADRÃO CÁRDIA, SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "gas"), "- MUCOSA GÁSTRICA DE PADRÃO CÁRDIA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:", "subtítulo -> título normal");
eq(t.toSub("- MUCOSA GÁSTRICA DE PADRÃO CÁRDIA APRESENTANDO:", "gas"), "- MUCOSA GÁSTRICA: PADRÃO CÁRDIA, APRESENTANDO:", "título normal -> subtítulo");
// fora da transição, nada muda
els.fSeg.value = "Terço distal"; els.fSeg.onchange(); ok(!t.isTEG(), "fora da transição");
// cárdia, achados novos, Whitehead
ok(GS.criterios.find(c => /^Amostragem/.test(c.g)).opt.some(o => /padrão cárdia \(glândulas mucinosas\)/.test(o[1])), "amostragem de cárdia");
ok(t.gasTextos(GS, "Cárdia").some(p => p.titulo === "MUCOSA GÁSTRICA DE PADRÃO CÁRDIA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS"), "texto pronto de cárdia");
ok(ES.criterios.find(c => c.g === "Lâmina própria superficial").opt.some(o => /glândulas mucinosas tipo cárdia/.test(o[1])), "lâmina própria com glândulas tipo cárdia");
ok(ES.criterios.find(c => c.g === "Metaplasia intestinal").opt.some(o => /Alcian blue pH 2,5\/PAS sem diastase/.test(o[1])), "metaplasia com Alcian blue/PAS");
ok(ES.criterios.some(c => c.g === "Fibrose de lâmina própria"), "fibrose de lâmina própria");
for (const p of t.SEED_SITES.duodeno.presets.filter(p => /^DUODENITE CRÔNICA/.test(p.titulo))) {
  const g = p.bullets.find(b => /^Grau da duodenite/.test(b)); ok(!!g, "Whitehead embutido: " + p.titulo.slice(0, 50));
  eq(t.titleSetGrauDuo("- " + p.titulo + ":", t.grauDuoDaLinha("- " + g)), "- " + p.titulo + ":", "grau do título coerente: " + p.titulo.slice(0, 50)); }

// 25. v3.10: título editado à mão -> achados; achados -> título; Marsh <-> arquitetura/atrofia
({ t, els } = boot({}));
const edita = (de, para) => { els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace(de, para); els.corpo.onchange(); };
const GS10 = t.SEED_SITES.gastrica, gN = GS10.criterios.find(c => c.g === "Infiltrado neutrofílico").opt;
const pHp = GS10.presets.find(p => /COM PESQUISA PARA H\. pylori POSITIVA/.test(p.titulo));
els.fSitio.value = "gastrica"; els.fSeg.value = ""; els.corpo.value = t.presetText(pHp); els.corpo.onfocus();
// 1. atividade: presença pelo título, grau pelo achado
edita("EM ATIVIDADE LEVE", "INATIVA");
ok(els.corpo.value.includes(gN[0][1]) && !els.corpo.value.includes(gN[1][1]), "título INATIVA -> linha de ausência");
edita("INATIVA", "EM ATIVIDADE MODERADA");
ok(/^- GASTRITE CRÔNICA INATIVA,/.test(els.corpo.value) && els.corpo.value.includes(gN[0][1]), "estômago: título em atividade com linha de ausência é desfeito");
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "x", corpo: els.corpo.value.replace("INATIVA", "EM ATIVIDADE"), site: "gastrica", seg: "" });
ok(t.alertas().some(a => /o título diz EM ATIVIDADE, mas a linha de neutrófilos diz ausência/.test(a.msg)), "alerta: título em atividade com linha de ausência");
t.appendLine(gN[2][1]);
ok(/^- GASTRITE CRÔNICA EM ATIVIDADE MODERADA,/.test(els.corpo.value), "grau escolhido nos achados vai ao título");
// 2. H. pylori pelo título; antral/oxíntica pelos achados
edita(/,? COM PESQUISA PARA H\. pylori POSITIVA \(\+2\/\+3\)/, "");
ok(els.corpo.value.includes("- Pesquisa para H. pylori: Negativa.") && !/Positiva/.test(els.corpo.value), "título sem H. pylori -> pesquisa negativa");
edita("EM ATIVIDADE MODERADA", "EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori");
ok(els.corpo.value.includes("- Pesquisa para H. pylori: Positiva.") && els.corpo.value.split("\n").filter(l => /^- Pesquisa para H\. pylori/.test(l)).length === 1, "título com H. pylori -> pesquisa positiva, sem duplicar");
t.appendLine("- Amostragem: Mucosa gástrica de padrão antral.");
ok(/EM MUCOSA DE ANTRO/.test(els.corpo.value.split("\n")[0]) && !/OXÍNTICA/.test(els.corpo.value.split("\n")[0]), "achado antral -> título antral");
t.appendLine("- Amostragem: Mucosa gástrica de padrão oxíntico (corpo/fundo).");
ok(/EM MUCOSA DE PADRÃO OXÍNTICO \(CORPO\/FUNDO\)/.test(els.corpo.value.split("\n")[0]), "achado oxíntico -> título oxíntico");
edita("EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO)", "EM MUCOSA DE ANTRO");
ok(els.corpo.value.includes("- Amostragem: Mucosa gástrica de padrão antral."), "título antral -> achado antral");
// 3. metaplasia e displasia pelo título
edita("ASSOCIADA A H. pylori", "ASSOCIADA A H. pylori, COM METAPLASIA INTESTINAL INCOMPLETA E MODERADA, SEM DISPLASIA");
ok(els.corpo.value.includes("- Metaplasia intestinal: Presente, incompleta, moderada.") && !/Ausência de metaplasia intestinal/.test(els.corpo.value), "título com metaplasia -> linha de metaplasia");
ok(els.corpo.value.includes("- Displasia: Não identificada."), "título sem displasia -> linha de displasia");
edita("SEM DISPLASIA", "COM DISPLASIA DE BAIXO GRAU");
ok(els.corpo.value.includes("- Displasia: Presente, de baixo grau.") && els.corpo.value.split("\n").filter(l => /^- Displasia/.test(l)).length === 1, "título com displasia de baixo grau -> linha");
edita(", COM METAPLASIA INTESTINAL INCOMPLETA E MODERADA", "");
ok(els.corpo.value.includes("- Metaplasia intestinal: Não identificada."), "metaplasia tirada do título -> não identificada");
// 6. amostra exígua pelo título
edita("- GASTRITE CRÔNICA", "- EXÍGUO FRAGMENTO DE MUCOSA GÁSTRICA APRESENTANDO GASTRITE CRÔNICA");
ok(els.corpo.value.includes("- Amostra exígua, pouco representativa."), "título exíguo -> linha de amostra exígua");
edita("- EXÍGUO FRAGMENTO DE MUCOSA GÁSTRICA APRESENTANDO GASTRITE CRÔNICA", "- GASTRITE CRÔNICA");
ok(!/Amostra exígua/.test(els.corpo.value), "prefixo tirado -> linha sai");
// edição de linha à mão continua levando ao título
edita(gN[2][1], gN[3][1]);
ok(/^- GASTRITE CRÔNICA EM ATIVIDADE ACENTUADA,/.test(els.corpo.value), "linha editada à mão -> grau do título");
// 4/5. esôfago: presença/ausência, EDS
els.fSitio.value = "esofago"; els.fSeg.value = "Terço distal";
els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA:\n- Não foi evidenciada exocitose de neutrófilos, erosão ou ulceração."; els.corpo.onfocus();
edita("INATIVA", "EM ATIVIDADE");
ok(els.corpo.value.includes("- Presença de exocitose de neutrófilos, sem erosão ou ulceração."), "esôfago: título em atividade -> linha presente");
edita("EM ATIVIDADE", "EM ATIVIDADE, COM ACHADOS HISTOLÓGICOS DE ESOFAGITE DISSECANTE SUPERFICIAL");
ok(t.edsEstado(els.corpo.value) === "suficiente" && els.corpo.value.split("\n").filter(l => /^- Achados de descamação/.test(l)).length === 1, "título com EDS -> linha completa de descamação");
// 7. eosinófilos: título sempre "DE PADRÃO EOSINOFÍLICO"; alerta quando não sustentado
els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):\n- Exocitose de eosinófilos (até 3 eosinófilos/campo de grande aumento).";
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "x", corpo: els.corpo.value, site: "esofago", seg: "Terço distal" });
ok(t.alertas().some(a => /o título indica padrão eosinofílico, mas a contagem/.test(a.msg)), "alerta: padrão eosinofílico sem contagem que sustente");
els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA:"; els.corpo.onfocus();
t.appendLine("- Exocitose de eosinófilos (até 40 eosinófilos/campo de grande aumento).");
ok(/^- ESOFAGITE CRÔNICA INATIVA, DE PADRÃO EOSINOFÍLICO \(VIDE NOTAS\):/.test(els.corpo.value), "esôfago com 40: título diz padrão eosinofílico");
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "x", corpo: els.corpo.value, site: "esofago", seg: "Terço distal" });
ok(/achado histológico compatível com esofagite eosinofílica em atividade/.test(t.buildLaudo()), "nota diz compatível com EoE em atividade");
// 8. duodeno: Whitehead pelo título (e a linha leve sem falar de arquitetura)
const DU = t.SEED_SITES.duodeno, pDu = DU.presets.find(p => /^DUODENITE CRÔNICA LEVE, INATIVA$/.test(p.titulo)) || DU.presets.find(p => /^DUODENITE CRÔNICA LEVE/.test(p.titulo));
els.fSitio.value = "duodeno"; els.fSeg.value = ""; els.corpo.value = t.presetText(pDu); els.corpo.onfocus();
ok(els.corpo.value.includes("Grau da duodenite: Leve (aumento da celularidade da lâmina própria, sem alteração do epitélio superficial nem erosão"), "Whitehead leve: celularidade, epitélio e erosão");
edita("DUODENITE CRÔNICA LEVE", "DUODENITE CRÔNICA MODERADA");
ok(els.corpo.value.includes("- Grau da duodenite: Moderado") && els.corpo.value.split("\n").filter(l => /^- Grau da duodenite/.test(l)).length === 1, "título moderada -> linha de Whitehead moderada");
edita("DUODENITE CRÔNICA MODERADA", "DUODENITE CRÔNICA");
ok(!/Grau da duodenite/.test(els.corpo.value), "grau tirado do título -> linha sai");
edita("INATIVA", "EM ATIVIDADE");
ok(els.corpo.value.includes("- " + t.linhaAtiv("duodeno", "EM ATIVIDADE")), "duodeno: título em atividade -> linha presente");
// Marsh <-> arquitetura e atrofia vilositária
const marsh = g => DU.criterios.find(c => c.g === "Marsh-Oberhuber (1999)").opt.find(o => o[0] === g)[1];
t.appendLine(marsh("3B"));
const ATR = DU.criterios.find(c => c.g === "Atrofia vilositária (Marsh-Oberhuber / Corazza-Villanacci)").opt;
ok(els.corpo.value.includes(ATR[4][1]) && !/^- Arquitetura/m.test(els.corpo.value), "Marsh 3B -> linha única de atrofia moderada");
ok(/Corazza-Villanacci \(2007\): B1/.test(els.corpo.value), "Marsh 3B -> Corazza B1");
eq(els.corpo.value.split("\n").filter(l => /^- (Atrofia vilositária|Arquitetura)/.test(l)).length, 1, "uma linha de atrofia só");
t.appendLine(ATR[5][1]);
ok(els.corpo.value.includes(marsh("3C")), "atrofia acentuada -> Marsh 3C");
t.appendLine(marsh("2"));
ok(els.corpo.value.includes(ATR[1][1]), "Marsh 2 -> hiperplasia de criptas sem atrofia");
t.appendLine(ATR[0][1]);
ok(els.corpo.value.includes(marsh(/Linfocitose intraepitelial: Presente/.test(els.corpo.value) ? "1" : "0")), "arquitetura preservada -> Marsh 0/1 pela linfocitose");
// transição: título de cada porção -> achados da própria porção
({ t, els } = boot({}));
els.fSitio.value = "esofago"; els.fSeg.value = "Transição esôfago-gástrica"; els.fSeg.onchange(); els.corpo.value = "";
t.inserePorcao("eso", t.SEED_SITES.esofago.presets.find(p => p.titulo === "ESOFAGITE CRÔNICA INATIVA"));
t.inserePorcao("gas", t.SEED_SITES.gastrica.presets.find(p => p.titulo === "MUCOSA GÁSTRICA DE PADRÃO CÁRDIA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS"));
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace("- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA:", "- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA EM ATIVIDADE:"); els.corpo.onchange();
let ls10 = els.corpo.value.split("\n"), iG10 = ls10.findIndex(l => /^- MUCOSA GÁSTRICA/.test(l));
ok(ls10.slice(1, iG10).includes("- Presença de exocitose de neutrófilos, sem erosão ou ulceração."), "transição: subtítulo esofágico -> achado esofágico");
ok(!ls10.slice(iG10).some(l => /exocitose de neutrófilos, sem erosão/.test(l)), "transição: porção gástrica intacta");
els.corpo.onfocus();
els.corpo.value = els.corpo.value.replace(/- MUCOSA GÁSTRICA: [^\n]*/, "- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA E SUPERFICIAL, APRESENTANDO OS SEGUINTES ACHADOS HISTOLÓGICOS (VIDE NOTAS):"); els.corpo.onchange();
ls10 = els.corpo.value.split("\n"); iG10 = ls10.findIndex(l => /^- MUCOSA GÁSTRICA/.test(l));
ok(ls10.slice(iG10).includes("- Amostragem: Mucosa gástrica superficial, com representação mínima de glândulas foveolares e presença de glândulas mucinosas (padrão cárdia)."), "transição: subtítulo gástrico exíguo e superficial -> linha de amostragem");
eq(ls10.filter(l => /^- Amostragem:/.test(l)).length, 1, "transição: amostragem trocada, não duplicada");
ok(/^- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA EM ATIVIDADE:/.test(ls10[1]), "transição: subtítulo esofágico intacto");

// 26. v3.10: título EM ATIVIDADE sem linha de neutrófilos é bloqueado; Marsh/atrofia/arquitetura editadas à mão sincronizam no ⟳
({ t, els } = boot({}));
const edita2 = (de, para) => { els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace(de, para); els.corpo.onchange(); };
els.fSitio.value = "colon"; els.fSeg.value = "Ceco";
els.corpo.value = "- COLITE CRÔNICA INATIVA:\n- Arquitetura das criptas preservada."; els.corpo.onfocus();
edita2("INATIVA", "EM ATIVIDADE LEVE");
ok(els.corpo.value.startsWith("- COLITE CRÔNICA INATIVA:"), "sem linha de neutrófilos: título EM ATIVIDADE é desfeito");
els.fSitio.value = "ileo"; els.fSeg.value = "";
els.corpo.value = "- ILEÍTE CRÔNICA INATIVA:\n" + t.SEED_SITES.ileo.criterios.find(c => c.g === "Infiltrado neutrofílico").opt[0][1]; els.corpo.onfocus();
edita2("INATIVA", "EM ATIVIDADE MODERADA");
ok(els.corpo.value.startsWith("- ILEÍTE CRÔNICA INATIVA:"), "íleo: título EM ATIVIDADE com linha de ausência é desfeito");
els.fSitio.value = "esofago"; els.fSeg.value = "Terço distal";
els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA:\n- Não foi evidenciada exocitose de neutrófilos, erosão ou ulceração."; els.corpo.onfocus();
edita2("INATIVA", "EM ATIVIDADE");
ok(els.corpo.value.startsWith("- ESOFAGITE CRÔNICA EM ATIVIDADE:") && els.corpo.value.includes("- Presença de exocitose de neutrófilos, sem erosão ou ulceração."), "esôfago (só presença) não bloqueia: a linha passa a presente");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco"; els.corpo.value = "- COLITE CRÔNICA INATIVA:\n- Arquitetura das criptas preservada."; els.corpo.onfocus();
t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "x", corpo: "- COLITE CRÔNICA EM ATIVIDADE LEVE:\n- Arquitetura das criptas preservada.", site: "colon", seg: "Ceco" });
ok(t.alertas().some(a => /o título diz EM ATIVIDADE, mas não há linha de neutrófilos/.test(a.msg)), "alerta: título em atividade sem linha de neutrófilos");
t.appendLine(t.SEED_SITES.colon.criterios.find(c => c.g === "Infiltrado neutrofílico").opt[1][1]);
ok(/^- COLITE CRÔNICA EM ATIVIDADE LEVE:/.test(els.corpo.value), "com a linha incluída, o título passa a EM ATIVIDADE pelo achado");
// Marsh à mão -> arquitetura e atrofia; atrofia à mão -> Marsh
const DU2 = t.SEED_SITES.duodeno, mar2 = g => DU2.criterios.find(c => c.g === "Marsh-Oberhuber (1999)").opt.find(o => o[0] === g)[1];
els.fSitio.value = "duodeno"; els.fSeg.value = "";
els.corpo.value = t.presetText(DU2.presets.find(p => /PADRÃO LINFOCÍTICO/.test(p.titulo))); els.corpo.onfocus();
t.appendLine(mar2("3A"));
els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace(mar2("3A"), "- Classificação de Marsh-Oberhuber (1999): 3C."); els.tb_sync.onclick();
ok(els.corpo.value.includes("- Atrofia vilositária: Presente, acentuada (mucosa plana, sem vilosidades identificáveis), acompanhada de criptas hipertróficas."), "Marsh editado à mão + ⟳ -> linha de atrofia");
ok(/Corazza-Villanacci \(2007\): B2/.test(els.corpo.value), "Marsh editado à mão + ⟳ -> Corazza B2");
els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace(/- Atrofia vilositária: [^\n]*/, DU2.criterios.find(c => c.g === "Atrofia vilositária (Marsh-Oberhuber / Corazza-Villanacci)").opt[4][1]); els.tb_sync.onclick();
ok(els.corpo.value.includes(mar2("3B")) && !els.corpo.value.includes("Marsh-Oberhuber (1999): 3C"), "atrofia editada à mão + ⟳ -> Marsh 3B");

// 27. v3.11: correção no editor ao salvar, duodeno sincronizado (atrofia <-> Marsh <-> Corazza <-> título), Hirschsprung no modelo do Pedro, formato novo do laudo
({ t, els } = boot({}));
const salva = () => { const n0 = t.WORK.samples.length; els.btnSalvar.onclick(); return t.WORK.samples.length > n0; };
// duodeno: o texto pronto de padrão linfocítico é o modelo do Pedro
const DUO = t.SEED_SITES.duodeno, pLin = DUO.presets.find(p => /PADRÃO LINFOCÍTICO.*EM ATIVIDADE/.test(p.titulo));
const corpoLin = t.presetText(pLin), lsLin = corpoLin.split("\n");
eq(lsLin[0], "- DUODENITE CRÔNICA MODERADA DE PADRÃO LINFOCÍTICO, COM ATROFIA VILOSITÁRIA MODERADA (MARSH-OBERHUBER 3B; CORAZZA-VILLANACCI B1), EM ATIVIDADE (VIDE NOTAS):", "modelo: título com atrofia e as duas classificações");
eq(lsLin[1], "- Atrofia vilositária: Presente, moderada (apenas restos curtos de vilosidades, ainda identificáveis; relação vilosidade/cripta menor que 3:1), acompanhada de criptas hipertróficas.", "modelo: linha de atrofia logo abaixo do título");
ok(/^- Grau da duodenite: Moderado/.test(lsLin[2]) && lsLin.includes("- Hiperplasia folicular linfoide: Presente."), "modelo: Whitehead depois da atrofia; hiperplasia folicular linfoide");
eq(lsLin.slice(-2).join("|"), "- Classificação de Marsh-Oberhuber (1999): 3B.|- Classificação de Corazza-Villanacci (2007): B1 (atrófica, relação vilosidade/cripta menor que 3:1, vilosidades ainda identificáveis) [@corazza07].", "modelo: Marsh e Corazza por último");
ok(!/^- (Arquitetura|Relação vilosidade)/m.test(DUO.presets.map(t.presetText).join("\n")), "textos prontos do duodeno sem as linhas antigas");
// título editado -> linha, Marsh, Corazza
els.fSitio.value = "duodeno"; els.fSeg.value = "2ª porção"; els.corpo.value = corpoLin; els.corpo.onfocus();
const ed27 = (de, para) => { els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace(de, para); els.corpo.onchange(); };
const linha0 = () => els.corpo.value.split("\n")[0];
ed27("COM ATROFIA VILOSITÁRIA MODERADA", "COM ATROFIA VILOSITÁRIA ACENTUADA");
ok(/COM ATROFIA VILOSITÁRIA ACENTUADA \(MARSH-OBERHUBER 3C; CORAZZA-VILLANACCI B2\)/.test(linha0()) && els.corpo.value.includes("- Atrofia vilositária: Presente, acentuada") && els.corpo.value.includes("Marsh-Oberhuber (1999): 3C") && /Corazza-Villanacci \(2007\): B2/.test(els.corpo.value), "atrofia no título -> linha, Marsh e Corazza");
ed27("MARSH-OBERHUBER 3C", "MARSH-OBERHUBER 2");
ok(/LINFOCÍTICO \(MARSH-OBERHUBER 2; CORAZZA-VILLANACCI A\), EM ATIVIDADE/.test(linha0()) && els.corpo.value.includes("- Atrofia vilositária: Não identificada (vilosidades preservadas), com hiperplasia das criptas.") && /Corazza-Villanacci \(2007\): A /.test(els.corpo.value), "Marsh no título -> sem atrofia por extenso, linha e Corazza");
ed27("CORAZZA-VILLANACCI A", "CORAZZA-VILLANACCI B2");
ok(els.corpo.value.includes("Marsh-Oberhuber (1999): 3C") && /ATROFIA VILOSITÁRIA ACENTUADA/.test(linha0()), "Corazza no título -> Marsh e atrofia");
ok(/^- Atrofia vilositária: /.test(els.corpo.value.split("\n")[1]) && /Corazza-Villanacci/.test(els.corpo.value.trim().split("\n").pop()), "ordem mantida: atrofia em cima, Corazza por último");
// linhas antigas são convertidas
els.corpo.value = "- DUODENITE CRÔNICA INATIVA:\n- Arquitetura alterada: Atrofia global e severa de vilosidades, acompanhada de criptas hipertróficas.\n- Classificação de Marsh-Oberhuber (1999): 3C (tipo destrutivo)."; els.corpo.onfocus(); els.tb_sync.onclick();
ok(!/Arquitetura alterada/.test(els.corpo.value) && els.corpo.value.includes("- Atrofia vilositária: Presente, acentuada (mucosa plana, sem vilosidades identificáveis)") && /CORAZZA-VILLANACCI B2/.test(linha0()), "linha antiga de arquitetura convertida no ⟳");

// salvar: achados mandam no título; o que não se resolve bloqueia
els.fSitio.value = "gastrica"; els.fSeg.value = ""; els.fNome.value = "Mucosa gástrica"; els.fLetra.value = "A";
const gN27 = t.SEED_SITES.gastrica.criterios.find(c => c.g === "Infiltrado neutrofílico").opt;
els.corpo.value = "- GASTRITE CRÔNICA INATIVA:\n" + gN27[2][1] + "\n- Pesquisa para H. pylori: Positiva (+1)."; els.corpo.onfocus();
ok(salva(), "inconsistência resolvível: salva");
eq(t.WORK.samples[t.WORK.samples.length - 1].corpo.split("\n")[0], "- GASTRITE CRÔNICA EM ATIVIDADE MODERADA, ASSOCIADA A H. pylori:", "ao salvar, atividade e H. pylori vão ao título pelos achados");
eq(t.alertas().length, 0, "nada inconsistente chega ao laudo");
els.fSitio.value = "colon"; els.fSeg.value = "Ceco"; els.fNome.value = "Ceco"; els.fLetra.value = "B";
els.corpo.value = "- COLITE CRÔNICA EM ATIVIDADE LEVE:\n- Arquitetura das criptas preservada."; els.corpo.onfocus();
ok(!salva(), "título em atividade sem linha de neutrófilos: não salva");
ok(/não há linha de neutrófilos/.test(els.alertEditor.innerHTML), "o aviso fica acima do botão Salvar");
// transição: subtítulo gástrico exíguo ganha o padrão eosinofílico
({ t, els } = boot({}));
els.fSitio.value = "esofago"; els.fSeg.value = "Transição esôfago-gástrica"; els.fSeg.onchange(); els.corpo.value = ""; els.fNome.value = "Transição esofagogástrica"; els.fLetra.value = "A";
t.inserePorcao("eso", t.SEED_SITES.esofago.presets.find(p => p.titulo === "ESOFAGITE CRÔNICA INATIVA"));
t.inserePorcao("gas", t.SEED_SITES.gastrica.presets.find(p => p.titulo === "MUCOSA GÁSTRICA DE PADRÃO CÁRDIA SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS"));
t.porcaoAtivaSet("gas"); t.amostraMod("exigua");
t.appendLine("- Achados eosinofílicos associados: Degranulação de eosinófilos (grânulos extracelulares).");
ok(salva(), "transição salva");
const cT = t.WORK.samples[0].corpo;
ok(cT.includes("- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA, APRESENTANDO OS SEGUINTES ACHADOS HISTOLÓGICOS, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS):"), "subtítulo gástrico exíguo ganha o padrão eosinofílico");
ok(!t.alertas().some(a => /não indica o padrão eosinofílico/.test(a.msg)), "sem o alerta da foto 1");
// formato novo da transição no laudo
const lT27 = t.buildLaudo().split("\n"), iA = lT27.indexOf("A) Transição esofagogástrica:");
eq(lT27.slice(iA + 1, iA + 6).join("|"), "- MUCOSA DE TRANSIÇÃO ESOFAGOGÁSTRICA APRESENTANDO:|- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA.|- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA, APRESENTANDO OS ACHADOS DESCRITOS NA MICROSCOPIA, DE PADRÃO EOSINOFÍLICO (VIDE NOTAS).| |- MICROSCOPIA:", "transição: diagnósticos no topo e microscopia");
ok(lT27[iA + 6] === "- MUCOSA ESOFÁGICA:" && lT27.includes("- MUCOSA GÁSTRICA:") && lT27.indexOf("- MUCOSA GÁSTRICA:") > lT27.indexOf("- MUCOSA ESOFÁGICA:"), "transição: achados sob cada porção");
ok(/^- MUCOSA GÁSTRICA: REPRESENTAÇÃO EXÍGUA, APRESENTANDO OS SEGUINTES ACHADOS HISTOLÓGICOS/m.test(t.WORK.samples[0].corpo), "o editor (amostra salva) continua no formato de edição");
// formato novo: título "APRESENTANDO"
t.WORK.samples.length = 0;
t.WORK.samples.push({ nome: "Mucosa duodenal", site: "duodeno", seg: "", corpo: "- MUCOSA DUODENAL APRESENTANDO:\n- Parasitos: Não identificados." });
const lD27 = t.buildLaudo();
ok(lD27.includes("A) Mucosa duodenal:\n- MUCOSA DUODENAL APRESENTANDO OS ACHADOS DESCRITOS NA MICROSCOPIA.\n \n- MICROSCOPIA:\n- Parasitos: Não identificados."), "APRESENTANDO aponta para a microscopia");
ok(/font-weight:bold;">- MUCOSA DUODENAL APRESENTANDO OS ACHADOS DESCRITOS NA MICROSCOPIA\./.test(t.laudoToRichHTML(lD27)), "título fechado em '.' continua em negrito");

// Hirschsprung: o modelo do Pedro, montado pelo editor
({ t, els } = boot({}));
const HS27 = t.SEED_SITES.hirschsprung, HL27 = t.HS_L;
els.fSitio.value = "hirschsprung"; els.fSeg.value = "Biópsia retal incisional (espessura total)"; els.fNome.value = "Biópsia retal"; els.fLetra.value = "A"; els.corpo.value = "";
["- Amostra adequada: Mucosa com arquitetura glandular preservada e hiperplasia folicular linfoide, submucosa representada [@ernica] apresentando vasocongestão, camada muscular própria representada.",
 "- Fragmentos examinados: 1.", "- Examinados 3 níveis de corte.", "- Bloco esgotado: Não.", "- " + HL27.subP, "- " + HL27.mpP, "- " + HL27.nervP].forEach(l => t.appendLine(l));
const tit27 = els.corpo.value.split("\n").filter(l => t.lineKind(l) === "b");
eq(tit27.join("|"), "- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS:|- PESQUISA PARA CÉLULAS GANGLIONARES: PRESENTES NOS PLEXOS NEURAIS DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA (VIDE NOTAS):|- FILETES NEURAIS SUBMUCOSOS HIPERTRÓFICOS (VIDE NOTAS):", "os 3 títulos do modelo saem dos achados");
ok(salva(), "modelo salvo");
const lH27 = t.buildLaudo();
ok(lH27.includes("A) Biópsia retal:\n- MUCOSA RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS.\n- PESQUISA PARA CÉLULAS GANGLIONARES: PRESENTES NOS PLEXOS NEURAIS DA SUBMUCOSA E DA CAMADA MUSCULAR PRÓPRIA (VIDE NOTAS).\n- FILETES NEURAIS SUBMUCOSOS HIPERTRÓFICOS (VIDE NOTAS).\n \n- MICROSCOPIA:\n- Amostra adequada: Mucosa com arquitetura glandular preservada e hiperplasia folicular linfoide, submucosa representada [1] apresentando vasocongestão, camada muscular própria representada.\n- Fragmentos examinados: 1.\n- Examinados 3 níveis de corte.\n- Bloco esgotado: Não.\n- Plexo da submucosa: Células ganglionares presentes.\n- Plexo da camada muscular própria: Células ganglionares presentes.\n- Filetes neurais submucosos hipertróficos: Presentes (mais de 2 filetes com mais de 40 µm de espessura em um mesmo campo de grande aumento [2])."), "laudo do modelo: formato e ordem, critério de Veras nos filetes");
ok(/\nNOTAS:\n- Amostra A: células ganglionares presentes, com inervação mucosa reduzida à calretinina e\/ou nervos submucosos hipertróficos: os achados podem corresponder a zona de transição e pedem correlação clínica e radiológica \[2\]\.\n- A amostra será encaminhada para exame de imunohistoquímica para complementação diagnóstica \(calretinina\)\./.test(lH27), "notas: zona de transição (original) e imuno-histoquímica");
ok(lH27.includes("REFERÊNCIAS BIBLIOGRÁFICAS:\n1. " + t.CITE.ernica + "\n2. " + t.CITE.veras), "referências do modelo");
// topografia: um plexo
eq(t.hsTitGang("- " + HL27.subP), "PESQUISA PARA CÉLULAS GANGLIONARES: PRESENTES NO PLEXO NEURAL DA SUBMUCOSA", "um plexo: no plexo neural da submucosa");
ok(!/encaminhada para exame de imunohistoquímica/.test((() => { t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "Biópsia retal", site: "hirschsprung", seg: "Biópsia retal por sucção", corpo: t.presetText(HS27.presets.find(p => p.rot === "Células ganglionares presentes")) }); return t.buildLaudo(); })()), "com calretinina feita, sem a nota de imuno-histoquímica");

// 28. v3.12: corpus CAP (Barrett, displasia do esôfago, polipectomia) + gastrite autoimune
({ t, els } = boot({}));
const laudo28 = (corpo, site, seg) => { t.WORK.samples.length = 0; t.WORK.samples.push({ nome: "x", corpo, site, seg: seg || "" }); return t.buildLaudo(); };
// Barrett
const lB = laudo28("- ESOFAGITE CRÔNICA INATIVA:\n- Metaplasia intestinal: Presente, incompleta.", "esofago", "Terço distal");
ok(/Amostra A: a metaplasia intestinal \(epitélio colunar com células caliciformes\) é o critério histológico de esôfago de Barrett adotado pelo CAP, com controvérsia sobre incluir epitélio colunar sem células caliciformes \[\d+\]; imprescindível correlação endoscópica\./.test(lB) && lB.includes(t.CITE.capeso), "esôfago com metaplasia: nota de Barrett e referência do CAP");
ok(!/Barrett/.test(laudo28("- ESOFAGITE CRÔNICA INATIVA:\n- Metaplasia intestinal: Não identificada.", "esofago", "Terço distal")), "sem metaplasia: sem nota de Barrett");
ok(!/Barrett/.test(laudo28("- MUCOSA DE TRANSIÇÃO ESOFAGOGÁSTRICA APRESENTANDO:\n- MUCOSA ESOFÁGICA: ESOFAGITE CRÔNICA INATIVA:\n- Metaplasia intestinal: Não identificada.\n- MUCOSA GÁSTRICA: PADRÃO CÁRDIA, APRESENTANDO:\n- Metaplasia intestinal: Presente, completa.", "esofago", "Transição esôfago-gástrica")), "metaplasia na porção gástrica da transição: sem nota de Barrett");
ok(!/Barrett/.test(laudo28("- GASTRITE CRÔNICA INATIVA:\n- Metaplasia intestinal: Presente, completa.", "gastrica")), "estômago: sem nota de Barrett");
// displasia do esôfago
const dE = t.SEED_SITES.esofago.criterios.find(c => c.g === "Displasia").opt;
eq(dE.map(o => o[0]).join("|"), "Não identificada|Escamosa de baixo grau|Escamosa de alto grau|Glandular de baixo grau|Glandular de alto grau", "esôfago: 5 opções de displasia");
els.fSitio.value = "esofago"; els.fSeg.value = "Terço distal"; els.corpo.value = "- ESOFAGITE CRÔNICA INATIVA:"; els.corpo.onfocus();
t.appendLine(dE[3][1]);
eq(els.corpo.value.split("\n")[0], "- ESOFAGITE CRÔNICA INATIVA, COM DISPLASIA GLANDULAR DE BAIXO GRAU:", "displasia glandular entra no título");
t.appendLine(dE[2][1]);
eq(els.corpo.value.split("\n")[0], "- ESOFAGITE CRÔNICA INATIVA, COM DISPLASIA ESCAMOSA DE ALTO GRAU:", "troca para escamosa de alto grau");
t.appendLine(dE[0][1]);
eq(els.corpo.value.split("\n")[0], "- ESOFAGITE CRÔNICA INATIVA, SEM DISPLASIA:", "não identificada: sem displasia");
els.corpo.onfocus(); els.corpo.value = els.corpo.value.replace("SEM DISPLASIA", "COM DISPLASIA GLANDULAR DE ALTO GRAU"); els.corpo.onchange();
ok(els.corpo.value.includes("- Displasia: Presente, glandular de alto grau.") && els.corpo.value.split("\n").filter(l => /^- Displasia/.test(l)).length === 1, "título editado -> linha de displasia com o tipo");
eq(t.titleSetDisplasia("- GASTRITE CRÔNICA INATIVA:", "- Displasia: Presente, de baixo grau."), "- GASTRITE CRÔNICA INATIVA:", "estômago: displasia continua só trocando trecho existente");
eq(t.titleSetDisplasia("- PÓLIPO JUVENIL, SEM DISPLASIA:", "- Displasia: Presente, de alto grau."), "- PÓLIPO JUVENIL, COM DISPLASIA DE ALTO GRAU:", "pólipo: como antes");
// pólipo
const PO = t.SEED_SITES.polipo.criterios, gp = g => PO.find(c => c.g === g);
ok(!gp("Base / pedículo") && ["Procedimento", "Integridade", "Tamanho do pólipo (maior dimensão, cm)", "Configuração", "Margem"].every(gp), "pólipo: 5 grupos de polipectomia, sem 'Base / pedículo'");
els.fSitio.value = "polipo"; els.fSeg.value = "Cólon"; els.corpo.value = "- PÓLIPO JUVENIL, SEM DISPLASIA:"; els.corpo.onfocus();
t.appendLine(gp("Integridade").opt[0][1]); t.appendLine(gp("Integridade").num.tpl.replace("{n}", "3"));
t.appendLine(gp("Configuração").num.tpl.replace("{n}", "1,2")); t.appendLine(gp("Tamanho do pólipo (maior dimensão, cm)").num.tpl.replace("{n}", "1,5"));
t.appendLine(gp("Margem").opt[0][1]); t.appendLine(gp("Procedimento").opt[0][1]);
ok(els.corpo.value.includes("- Integridade: Fragmentado (3 fragmentos).") && !/Integridade: Íntegro/.test(els.corpo.value), "integridade trocada, não duplicada");
ok(["- Configuração: Pedunculado (pedículo de 1,2 cm).", "- Tamanho do pólipo: 1,5 cm (maior dimensão).", "- Margem: Livre de lesão.", "- Procedimento: Polipectomia."].every(l => els.corpo.value.includes(l)), "linhas de polipectomia");
// gastrite autoimune
const GA = t.SEED_SITES.gastrica, pAI = GA.presets.find(p => /DE PADRÃO AUTOIMUNE/.test(p.titulo));
eq(pAI.titulo, "GASTRITE CRÔNICA ATRÓFICA DE PADRÃO AUTOIMUNE, INATIVA, EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO) (VIDE NOTAS)", "texto pronto: título validado");
eq(pAI.bullets.filter(b => /^(Atrofia|Metaplasia pseudopilórica|Metaplasia intestinal|Hiperplasia de células enterocromafins-símile|Pesquisa para H\. pylori):/.test(b)).join("|"), "Atrofia: Presente, com redução de células parietais.|Metaplasia pseudopilórica: Presente.|Metaplasia intestinal: Não identificada.|Hiperplasia de células enterocromafins-símile: Presente (imuno-histoquímica para cromogranina A).|Pesquisa para H. pylori: Negativa.", "texto pronto: achados validados");
ok(GA.criterios.some(c => c.g === "Metaplasia pseudopilórica") && GA.criterios.find(c => c.g === "Hiperplasia de células enterocromafins-símile").opt.length === 3 && GA.criterios.find(c => c.g === "Atrofia").opt.some(o => /com redução de células parietais/.test(o[1])), "estômago: grupos novos e opção de atrofia");
const lA = laudo28(t.presetText(pAI), "gastrica", "Corpo/fundo (oxíntico)");
ok(/Amostra A: o padrão de gastrite atrófica do corpo\/fundo, com metaplasia pseudopilórica e hiperplasia de células enterocromafins-símile, sem H\. pylori, favorece gastrite autoimune \[\d+\]; em crianças, pode haver atrofia também no antro \[\d+\] e associação com outras doenças autoimunes e anemia ferropriva \[\d+\]; imprescindível correlação clínica-laboratorial/.test(lA), "nota da gastrite autoimune");
ok([t.CITE.hall19, t.CITE.kulak21, t.CITE.pogoriler15].every(r => lA.includes(r)) && !/\[@/.test(lA), "3 referências numeradas");
ok(lA.includes("- GASTRITE CRÔNICA ATRÓFICA DE PADRÃO AUTOIMUNE, INATIVA, EM MUCOSA DE PADRÃO OXÍNTICO (CORPO/FUNDO) (VIDE NOTAS).\n \n- MICROSCOPIA:"), "formato novo do laudo");
eq(t.alertas().length, 0, "texto pronto sem alerta");
els.fSitio.value = "gastrica"; els.fSeg.value = ""; els.corpo.value = t.presetText(pAI); els.corpo.onfocus();
t.appendLine(GA.criterios.find(c => c.g === "Metaplasia pseudopilórica").opt[0][1]);
eq(els.corpo.value.split("\n").filter(l => /^- Metaplasia pseudopilórica/.test(l)).join(), "- Metaplasia pseudopilórica: Não identificada.", "metaplasia pseudopilórica trocada, não duplicada");
ok(t.LIB.notas.some(n => n.tag === "Barrett") && t.LIB.notas.some(n => n.tag === "Gastrite autoimune"), "notas novas na biblioteca");
eq(t.concorda(t.presetText(pAI)).trocas.length, 0, "concordância: gastrite autoimune");

console.log(`OK — ${n} asserts`);





