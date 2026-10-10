# Changelog

## v3.3.1 — 2026-10-09
- Hirschsprung: os textos prontos também aparecem só para o tipo de espécime escolhido.

## v3.3.0 — 2026-10-09
- Novo sítio "Hirschsprung", com quatro tipos de espécime (biópsia retal, congelação/nivelamento, peça de abaixamento, rebiopsia/reoperação): o título da biópsia e o da peça são calculados dos achados (células ganglionares, adequação, calretinina com controle interno, nervos, margem proximal); notas, referências numeradas e alertas próprios (amostragem, idade, trissomia 21, biópsia baixa, anastomose).
- Em Hirschsprung, os achados aparecem só para o tipo de espécime escolhido. Enterocolite na peça: presente ou não identificada, sem grau (artigo de Teitelbaum 1989 não localizado).
- Chave "Referências: com / sem" no laudo: em "sem", saem os números do texto e a lista de referências; valores de referência e notas continuam. A escolha fica gravada no rascunho e pode ser desfeita a qualquer momento.

## v3.2.0 — 2026-10-09
- Layout: três colunas no desktop (amostra e textos prontos · achados · editor e laudo), cada uma rolando por dentro; editor ao lado dos achados; lista de amostras salvas no fim; bloco DECH recolhível (estado lembrado).
- Tema: seletor Escuro/Claro com escolha gravada no navegador (não segue o sistema); tema claro em azul-claro.
- Eosinófilos: a frase ("não sendo identificada eosinofilia" / "com presença de eosinófilos" / "com presença de eosinofilia") segue a contagem pelas faixas do sítio, ao inserir e ao editar o número; novo grupo de achados associados (degranulação, microabscessos eosinofílicos).
- Duodeno: linfocitose intraepitelial com um campo só; a frase (não identificada, limítrofe, presente) segue o número.
- Vínculo título ↔ atividade nos dois sentidos em todos os sítios; H. pylori positiva entra no título e alinha a linha de atividade ao grau; metaplasia intestinal e displasia atualizam o trecho correspondente do título.
- Esôfago: lâmina própria superficial (representada / não representada) e infiltrado inflamatório (presente / ausente) em campos independentes.
- Estômago: mucosa de transição corpo-antro (segmento e amostragem).
- Alertas novos: Marsh-Oberhuber × linfócitos; OLGIM × metaplasia; OLGA × atrofia.
- Notas novas: granulomas e displasia em linhas separadas.
- Corretor de concordância (número e gênero) no editor e nas notas livres, por regras e com o vocabulário do laudo: substantivo + adjetivo vizinho, "foi/foram/sendo + particípio", "Rótulo: Presente/Ausente/Identificado" e "1 eosinófilo × 2 eosinófilos"; avisa o que trocou. Ortografia pelo corretor do navegador.
- *H. pylori* sempre em itálico, em títulos e itens, em qualquer grafia (H. PYLORI, H.pylori, Helicobacter pylori), na prévia, na cópia e na interface.

## v3.1.0 — 2026-10-04
- Saída: negrito só no título do diagnóstico (cabeçalho "A) …:" sem negrito); referências numeradas, com o número entre colchetes no texto e a lista completa em "REFERÊNCIAS BIBLIOGRÁFICAS:".
- Contagens: toda linha com contagem de eosinófilos ou de linfócitos (texto pronto ou achado) entra com o valor de referência do sítio e a referência; a nota de conclusão (compatível, desfavorece ou duvidoso) é gerada a partir do texto da amostra.
- Achados: linha nova troca a linha do mesmo assunto; arquitetura do cólon em pilha ("Arquitetura glandular alterada: …"); metaplasia intestinal com tipo e grau, com a atrofia acompanhando no estômago; hiperplasia da camada basal com grau e modificador papilar; plasmocitose em base de glândulas.
- Atividade em íleo, cólon e reto pela fração de criptas (escala de Geboes); o título é ajustado e há alerta quando título e linha divergem.
- Graus (leve, moderada, acentuada) só onde há referência: mantidos no estômago (Sydney atualizado), na hiperplasia foveolar (Dixon 1986) e em íleo, cólon e reto (Geboes); removidos no esôfago (cronicidade e atividade), no duodeno (atividade) e na celularidade de duodeno e íleo; espongiose do esôfago por espaços pequenos ou grandes (Mastracci 2020).
- Textos prontos: toda "crônica" com as variantes de atividade; reto com todos os textos do cólon como retite; novo sítio Pólipo; cárdia nos segmentos do estômago.
- Bloco DECH por sítio: esôfago (Youssef 2025), estômago (Mostafa 2020) e intestino (corpos apoptóticos por 10 criptas, critério das criptas escrito no laudo); ação viral com duas opções e nota de imuno-histoquímica; categoria NIH 2014 no título.
- Materiais: início da frase em texto livre com sugestões; nomes de material com sugestões e memória dos mais usados.
- Notas e referências com o texto inteiro visível; mais referências para escolher.
- Visual novo (tema escuro, ícones por área); prévia do laudo ampliada para leitura, cópia continua em Arial 8. Botão "Regenerar" removido.

## v3.0.2 — 2026-10-03
- Painel "Limiares de eosinófilos por sítio": limiares trocados pelos da Tabela 6 do guideline ESPGHAN/NASPGHAN 2024 (estômago ≥30, duodeno ≥50, íleo terminal ≥60, ceco/ascendente ≥100, transverso/descendente ≥80, sigmoide/reto ≥60 por 0,27 mm²), com o equivalente por mm² e no campo de 40× com ocular FN 22. Esôfago: ≥15 por 0,3 mm².

## v3.0.1 — 2026-10-02
- Correção: o aviso de customizações da v2 aparecia para todos (o atributo `hidden` era anulado pelo `display:flex` de `.banner`), com os botões "Baixar customizações antigas" e "Dispensar" sem ação. Agora só aparece quando há customização antiga no navegador.

## v3.0.0 — 2026-09-29
Redesenho: biblioteca em versões prontas, publicadas pelo mantenedor.
- Removidos: sync Google Drive + guia OAuth, backup/restauração JSON, edição da biblioteca no app (sítios, segmentos, diagnósticos, critérios, notas, referências), modelo DB v2.
- Rascunho: só o laudo em montagem fica salvo no navegador; botão "Limpar laudo".
- Saída segue a máscara EDA (Arial 8pt, preto, justificado, entrelinha 1.15):
  - "A) …:" e "- TÍTULO:" em negrito; demais linhas normais (inclusive NOTAS e REFERÊNCIAS);
  - itens com "- " (antes ". ");
  - Materiais separados por vírgula;
  - linha "-----" entre amostras;
  - gênero/espécie em itálico (ex.: *H. pylori*).
- Legado v2: na 1ª abertura importa o laudo que estava em montagem; se houver customizações da biblioteca v2, um aviso oferece baixá-las em JSON (a chave antiga não é apagada).
- Versão exibida no cabeçalho.
- Harness de teste: `tests/laudo.test.mjs`.

## v2 — 2026-07-05
DB editável + CRUD, notas/refs com tags e busca, backup JSON, sync Google Drive, deploy no GitHub Pages.
