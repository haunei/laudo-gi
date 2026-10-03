# Changelog

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
