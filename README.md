# laudo-gi

Máscara de laudo GI endoscópico/colonoscópico pediátrico — app single-file (HTML/CSS/JS, offline).

- **Uso:** https://haunei.github.io/laudo-gi/ (ou abra `index.html` localmente).
- **Fonte única:** este repositório. Cada push em `main` publica no GitHub Pages.
- **Versões:** a biblioteca (diagnósticos, critérios, notas, referências) vem pronta no código; cada alteração = nova versão (`APP_VERSION` no `index.html` + tag `vX.Y.Z` + `CHANGELOG.md`). Não há edição da biblioteca no app nem sync.
- **Armazenamento:** só o rascunho do laudo em montagem fica no navegador (localStorage). Nenhum dado pessoal vai a este repositório ou host.
- **Testes:** `node tests/laudo.test.mjs`.
