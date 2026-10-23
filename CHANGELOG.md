# Changelog

## v3.11.0 — 2026-10-22
- Correção no editor: ao salvar, os achados mandam no título (atividade, H. pylori, metaplasia, displasia, segmento gástrico, Whitehead, amostra exígua/superficial, padrão eosinofílico, EDS, Marsh/Corazza, Hirschsprung), porção por porção na transição. Inconsistência que não se resolve sozinha não salva: o aviso fica acima do botão Salvar e nada inconsistente chega ao laudo (a categoria de DECH escolhida à mão continua permitida). O subtítulo gástrico "REPRESENTAÇÃO …" ganha ", DE PADRÃO EOSINOFÍLICO".
- Duodeno: "Arquitetura", "Atrofia vilositária" e "Relação vilosidade/cripta" viram uma linha só, logo abaixo do título, com 6 opções que dão o Marsh-Oberhuber e o Corazza-Villanacci ao mesmo tempo. Título com ", COM ATROFIA VILOSITÁRIA X (MARSH-OBERHUBER m; CORAZZA-VILLANACCI k)" antes da atividade (Marsh 1–2: só os parênteses; Marsh 0: nada). Linha, Marsh, Corazza, linfocitose e título sincronizados nos dois sentidos, clicando ou editando à mão; Marsh e Corazza por último no bloco. Texto pronto de padrão linfocítico no modelo do Pedro (3B, B1). Linhas antigas convertidas no ⟳ e ao salvar.
- Colinha Marsh-Oberhuber + Corazza-Villanacci logo abaixo dos limiares de eosinófilos (Oberhuber 1999, conferido no PDF; Corazza 2007, conferido no PubMed).
- Hirschsprung no formato do modelo do Pedro: até 3 títulos (mucosa, pesquisa de células ganglionares pela topografia — "no plexo neural da submucosa" ou "nos plexos neurais da submucosa e da camada muscular própria" — e filetes neurais submucosos hipertróficos), "(VIDE NOTAS)". Na biópsia, a mucosa entra na linha de adequação (que dá o 1º título) e saem as linhas do tipo de biópsia e da mucosa; "Plexo da camada muscular própria", "Filetes neurais submucosos hipertróficos: Presentes (mais de 2 filetes com mais de 40 µm de espessura em um mesmo campo de grande aumento [Veras])", com o critério de Veras 2019 conferido no texto completo. Plexo da camada muscular própria também na biópsia por sucção. Nota nova: "A amostra será encaminhada para exame de imunohistoquímica para complementação diagnóstica (calretinina)."
- Formato novo do laudo, em todas as máscaras (só na montagem do laudo; o editor fica igual): diagnósticos no topo terminados em ".", linha em branco, "- MICROSCOPIA:" e os achados; "APRESENTANDO" vira "APRESENTANDO OS ACHADOS DESCRITOS NA MICROSCOPIA". Transição: título-mãe ("MUCOSA DE TRANSIÇÃO ESOFAGOGÁSTRICA APRESENTANDO:"; a grafia antiga "ESÔFAGO-GÁSTRICA" continua lida e sai na nova) + os dois subtítulos no topo, e na microscopia os achados sob "MUCOSA ESOFÁGICA:" e "MUCOSA GÁSTRICA:".

## v3.10.0 — 2026-10-22
- Sincronia título ↔ achados nos dois sentidos, em todos os sítios (e em cada porção da transição): editar o título à mão leva aos achados só o item que mudou; marcar ou editar um achado continua levando ao título.
  - Atividade: o título decide presença/ausência; o grau vem sempre do achado. INATIVA → linha de ausência; EM ATIVIDADE com linha de ausência → esôfago e duodeno ganham a linha "presente"; no estômago, íleo, cólon e reto a edição do título é desfeita, com aviso para escolher o grau nos achados. Grau diferente no título volta ao grau da linha. Título EM ATIVIDADE sem nenhuma linha de neutrófilos no trecho: a edição do título é desfeita, com aviso. Em ambos os casos, título que já chega inconsistente (texto colado, amostra antiga) fica com alerta no painel até o achado ser incluído.
  - H. pylori (positiva/negativa), metaplasia intestinal (tipo e grau), displasia, grau de Whitehead, amostra exígua/superficial (inclusive "REPRESENTAÇÃO EXÍGUA E SUPERFICIAL" da porção gástrica) e esofagite dissecante superficial (linha completa de descamação) pelo título. Antral/oxíntica: o achado de amostragem muda o título e o título muda o achado.
- Marsh-Oberhuber → arquitetura e atrofia vilositária (0/1 preservada; 2 hiperplasia de criptas; 3A/3B/3C atrofia leve/moderada/total); atrofia ou arquitetura clicadas → Marsh (0 ou 1 pela linfocitose presente), com Corazza-Villanacci junto. Vale também para a linha editada à mão (no ⟳ ou ao sair do editor).
- Eosinófilos: o título diz sempre "DE PADRÃO EOSINOFÍLICO" (também no esôfago com 15/0,3 mm² ou mais); "compatível com esofagite eosinofílica em atividade" fica na nota. Texto pronto da EoE renomeado. Alerta novo quando o título indica padrão eosinofílico e contagem/achados não sustentam.
- Whitehead leve: "aumento da celularidade da lâmina própria, sem alteração do epitélio superficial nem erosão".

## v3.9.0 — 2026-10-22
- Transição esofagogástrica com porções separadas: "MUCOSA DE TRANSIÇÃO ESÔFAGO-GÁSTRICA APRESENTANDO:" + "MUCOSA ESOFÁGICA: …" e "MUCOSA GÁSTRICA: …", cada uma com seus achados. Na coluna Amostra, textos prontos do esôfago e do estômago por porção (o clique substitui a porção); na coluna Achados, seletor de porção; valores de referência, vínculos título↔achados, notas ("Amostra A (porção gástrica): …") e alertas por porção.
- Porção gástrica exígua e superficial (subtítulo e amostragem do modelo do Pedro), exígua ou superficial isoladas, com as notas de viés amostral.
- Estômago: padrão cárdia (amostragem, textos prontos de normalidade, segmento "Cárdia" ajusta título e linha).
- Esôfago: lâmina própria com glândulas mucinosas tipo cárdia, metaplasia intestinal não identificada confirmada por Alcian blue pH 2,5/PAS sem diastase, fibrose de lâmina própria. Nome padrão "Transição esofagogástrica".
- Duodeno: grau de Whitehead embutido nos textos prontos de duodenite (inespecífica leve; padrão linfocítico moderado) e no título.

## v3.8.1 — 2026-10-22
- Notas na redação validada pelo Pedro: "em atividade" nas notas de contagem de eosinófilos (esôfago e demais sítios); acima do limiar, "achado histológico compatível com … em atividade; imprescindível correlação clínica-laboratorial-endoscópica e exclusão de causas secundárias"; descamação inespecífica curta ("…são inespecíficos e podem ocorrer em diversas esofagites"); Hirschsprung (calretinina preservada sem gânglios e calretinina ausente) mais curtas. As notas de EDS, bolhas, achados eosinofílicos associados, padrão linfocítico duodenal e celíaca ficaram como estavam (não validadas).

## v3.8.0 — 2026-10-19
- Materiais: o início da frase vira uma lista com todas as opções visíveis (antes o navegador escondia as que não batiam com o texto já escrito), com "Biópsia colonoscópica de:" nova e "Outro…" para texto livre; rascunho com texto fora da lista abre em "Outro…".
- Esôfago: nome padrão pelo segmento ("Esôfago", "Esôfago proximal", "Esôfago distal"; médio e transição esôfago-gástrica como antes) e três botões rápidos sob o nome; os três nomes também no autocompletar.
- Esofagite dissecante superficial: grupo "Descamação superficial" (dois tons, descamação/flaking com clivagem intraepitelial, paraqueratose, bolhas, clivagem do conjuntivo, inflamação mínima; Carmack 2009, Hart 2015, Rubrecht 2025). Com os 3 critérios (dois tons + descamação + paraqueratose), o título vira "ACHADOS HISTOLÓGICOS COMPATÍVEIS COM ESOFAGITE DISSECANTE SUPERFICIAL (VIDE NOTAS)" — ou, numa esofagite, ganha ", COM ACHADOS HISTOLÓGICOS DE ESOFAGITE DISSECANTE SUPERFICIAL" — e sai nota pedindo correlação endoscópica e exclusão de fungos (associações pediátricas: Ebigbo 2021). Com menos itens, a linha fica como achado inespecífico em qualquer título, com nota própria. Texto pronto, notas na biblioteca e alertas nos dois sentidos. Revisto com os textos completos de Carmack 2009, Hart 2015 e Rubrecht 2025: "dois tons" pela definição de Rubrecht (núcleos picnóticos na zona superficial sobre zona basal normal); paraqueratose proeminente; sem achado endoscópico, diagnóstico descritivo; epitélio destacado isolado pode ser artefato; bolhas proeminentes pedem exclusão de dermatoses vesicobolhosas. No texto pronto da EoE, a frase livre de descamação virou a linha padronizada.

## v3.7.0 — 2026-10-19
- Achados eosinofílicos associados integrados ao laudo (antes só no painel de limiares): grupo próprio por sítio, com critério e referência — esôfago (microabscessos ≥4, camada superficial ≥3, degranulação, alteração epitelial superficial, fibrose de lâmina própria; Giordano 2026), estômago (agrupamentos, intraepiteliais, abscesso intraluminal, destruição glandular, muscular da mucosa, degranulação), duodeno/íleo (epitélio de superfície e criptas, degranulação, microabscessos, camadas profundas) e cólon/reto (agregados/lençóis, intraepiteliais, criptite eosinofílica, microabscessos, degranulação, muscular da mucosa) (Campora 2022).
- Título automático: achado associado ou contagem acima do limiar acrescenta "DE PADRÃO EOSINOFÍLICO (VIDE NOTAS)"; no esôfago, com 15/0,3 mm² ou mais, "COMPATÍVEL COM ESOFAGITE EOSINOFÍLICA (VIDE NOTAS)". Sai quando os dados deixam de sustentar. Títulos de normalidade não mudam: geram alerta.
- Notas automáticas: achados qualitativos (densidade isolada não basta; exclusão de causas secundárias) e, no esôfago, microabscesso/camada superficial como característicos de EoE. Nota de contagem do esôfago passa a "compatível com esofagite eosinofílica".
- Texto pronto da EoE renomeado e com a linha padronizada de achados associados; painel de limiares com as fontes e a indicação do grupo.

## v3.6.1 — 2026-10-19
- Barra do editor: botão ⟳ "Atualizar título e achados", que roda a sincronia título ↔ linhas sob demanda (trazido da cópia v3.5.3 do vault).

## v3.6.0 — 2026-10-18
- Estômago conforme o segmento: escolher Antro, Corpo/fundo, transição corpo-antro ou misto adapta os textos prontos (título "EM MUCOSA DE …" e linha "Amostragem") e o bloco que está no editor; o botão "Amostragem (padrão)" ajusta o título e o título editado ajusta a linha. Cárdia, incisura e transição esôfago-gástrica ficam como estão.
- Estômago: a linha de neutrófilos dos textos prontos segue o grau do título (Sistema Sydney atualizado); a gastropatia linfocitária "em atividade moderada" passa a ter a linha moderada.
- Doença celíaca: notas automáticas no duodeno — padrão linfocítico inespecífico (linfocitose sem atrofia) e linfocitose com atrofia vilositária favorecendo doença celíaca — com referências (ESPGHAN 2020, Lauwers 2015, Smyrk 2017); as duas também na biblioteca de notas.
- Duodeno: linha de neutrófilos sempre diz se há criptite (ausente / presente sem criptite / presente com criptite); atividade segue presente ou ausente, como em Whitehead 1975. Título "DUODENITE CRÔNICA DE PADRÃO LINFOCÍTICO, EM ATIVIDADE / INATIVA (VIDE NOTAS)", sem vilosidades e criptas no título. Novo grau da duodenite (Whitehead 1975: leve, moderada, acentuada), que entra no título.
- Doença celíaca (validado com Oberhuber 1999, Husby 2020, Lauwers 2015, Smyrk 2017, Villanacci 2020, ESsCD 2019 e AGA 2018): atrofia vilositária nos termos de Oberhuber (leve 3A, moderada com restos curtos 3B, acentuada com mucosa plana 3C; sem "subtotal"); nota do padrão linfocítico com a proporção de celíaca (10% a 20%) e as demais causas; nota "favorece celíaca" com os diferenciais de atrofia vilositária; dica e alerta de que Marsh 1 só se aplica com doença celíaca comprovada; grupos "Orientação dos fragmentos" e "Relação vilosidade/cripta", com alerta para Marsh com orientação inadequada; classificação de Corazza-Villanacci (2007: A, B1, B2) preenchida sozinha a partir do Marsh-Oberhuber, só na linha. O corte de linfocitose intraepitelial continua 30/100 (Hayat). A linha do Marsh passa a ser trocada, e não duplicada, ao clicar em outro grau.
- Agregados linfoides (presentes / não identificados) no estômago e no íleo. Metaplasia foveolar gástrica (grau qualitativo, sem escala publicada) e atrofia vilositária (parcial, subtotal, total = Marsh-Oberhuber 3A, 3B, 3C) no duodeno e no íleo.

## v3.5.2 — 2026-10-15
- Esôfago e estômago no mesmo esquema de título de duodeno, íleo, cólon e reto: "MUCOSA ESOFÁGICA / GÁSTRICA DE PADRÃO ANTRAL / GÁSTRICA DE PADRÃO OXÍNTICO SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS" (antes "…SEM ALTERAÇÕES HISTOPATOLÓGICAS…") e "… APRESENTANDO", cada um com os achados do próprio sítio; os exíguos acompanham.

## v3.5.1 — 2026-10-15
- Duodeno, cólon e reto, como o íleo: dois cabeçalhos de normalidade para os mesmos achados, "MUCOSA DUODENAL/COLÔNICA/RETAL SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS" (antes "…SEM PARTICULARIDADES HISTOPATOLÓGICAS…" no duodeno e "…SEM ALTERAÇÕES HISTOPATOLÓGICAS…" no cólon/reto) e "MUCOSA … APRESENTANDO"; o exíguo de cada sítio acompanha o primeiro.

## v3.5.0 — 2026-10-15
- Duodeno: a nota de falta de consenso sobre o número normal de eosinófilos passa a nomear só os segmentos com contagem no laudo (estômago, duodeno, íleo, cólon, reto); antes saía sempre "do íleo e do cólon". Segmento "2ª porção (descendente)" vira "2ª porção" (amostra "Mucosa duodenal (2ª porção)").
- Amostra exígua: texto pronto em esôfago, estômago (antral e oxíntico), duodeno, íleo, cólon e reto ("EXÍGUO FRAGMENTO DE MUCOSA … SEM ALTERAÇÕES/PARTICULARIDADES HISTOPATOLÓGICAS SIGNIFICATIVAS"), com a linha "Amostra exígua, pouco representativa.".
- Modificador "Amostra" nesses sítios: exígua, superficial ou adequada; insere a linha e ajusta o início do título ("EXÍGUO FRAGMENTO DE …" / "FRAGMENTO SUPERFICIAL DE …"; título que não começa por "MUCOSA" ganha "… DE MUCOSA <sítio> APRESENTANDO …"). Nota automática de viés amostral; alerta quando título e linha não batem.
- Íleo: dois cabeçalhos de normalidade com os mesmos achados ("MUCOSA DE ÍLEO SEM PARTICULARIDADES HISTOLÓGICAS SIGNIFICATIVAS" e "MUCOSA DE ÍLEO APRESENTANDO"); o exíguo segue o primeiro, com os mesmos achados. Nome padrão sem repetição: "Mucosa de íleo terminal", "Mucosa de íleo neoterminal", "Mucosa de bolsa ileal".
- Editor da amostra: barra com caixa alta, caixa baixa, negrito, itálico e sublinhado no trecho selecionado (clicar de novo desfaz). Negrito, itálico e sublinhado saem formatados na prévia e na cópia para o MV; na cópia em texto simples, as marcas saem.

## v3.4.0 — 2026-10-10
- Hirschsprung: o título passa a ser descritivo, em dois itens: mucosa (retal, de cólon sigmoide ou de cólon proximal; "sem particularidades histológicas significativas" de praxe) e pesquisa para células ganglionares (presentes ou ausentes, e em que plexo: da submucosa e/ou da muscular própria). Vale para biópsias, congelação, peça e rebiopsia; saem os títulos diagnósticos ("aganglionose… compatível com doença de Hirschsprung", "inconclusiva", "inadequada", "doença de Hirschsprung: segmento…").
- Texto e título andam juntos nos dois sentidos: editar a linha da mucosa, de um plexo ou do segmento aganglionar muda o título; editar o título muda as linhas.
- A interpretação vai para a nota, pelos achados: presença de células ganglionares "desfavorece" (não mais "exclui") doença de Hirschsprung no nível biopsiado; ausência com calretinina ausente e controle interno "favorece"; na peça, "achados compatíveis com doença de Hirschsprung". O título ganha "(vide nota)" só quando há ressalva.
- Peça de abaixamento: seção com as camadas da parede, uma por linha (mucosa, submucosa, muscular própria, serosa/adventícia), preservadas de praxe e editáveis; alerta para conferir o título quando alguma camada é alterada.
- Laudos salvos com os títulos e as linhas da v3.3 continuam lidos e são convertidos ao editar.

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
