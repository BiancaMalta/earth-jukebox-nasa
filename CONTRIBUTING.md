# Como trabalhar em grupo sem um atrapalhar o outro

## 1. Cada papel tem a sua pasta ("dono")

A regra principal: **cada pessoa só edita os arquivos do seu papel**. Arquivos compartilhados têm um dono que faz o merge.

| Papel | Label | Pastas / arquivos que você edita |
|---|---|---|
| **Dados** (pipeline) | `area:dados` | `pipeline/**`, `public/data/**` |
| **Front** (front-end e áudio) | `area:front` | `public/index.html`, `public/src/ui/**`, `public/src/engine/audio.js`, `public/src/engine/speech.js`, `public/styles.css`, `.github/workflows/**` |
| **Som** (música) | `area:som` | `public/src/engine/mapping.js`, `public/src/engine/mood.js`, `public/src/engine/presets.js`, `public/sounds/**`, `docs/MAPPINGS.md` |
| **Narr.** (acessibilidade, narrativa, pitch) | `area:narr` | `README.md`, `CREDITS.md`, `docs/TESTS.md`, `docs/PITCH.md`, `public/how-it-works.html`, `public/src/i18n/**` |
| **Todos** | `area:todos` | `DECISIONS.md` (só adicionar linhas no fim) |

Arquivos de configuração de faixa: **um arquivo por faixa** em `public/tracks/<id>.json`. Quem cria a faixa é dono do arquivo dela. O `public/tracks/index.json` só ganha uma linha por faixa (conflito mínimo).

i18n: as chaves são prefixadas pelo papel (`ui.*`, `sound.*`, `track.<id>.*`). Cada um mexe só no seu prefixo.

## 2. Fluxo de branches

- `main` = sempre funcionando e publicado no GitHub Pages. **Ninguém dá push direto na `main`.**
- Uma branch por issue: `<area>/<numero>-descricao-curta`
  - ex.: `dados/12-download-svs`, `front/18-player`, `som/21-escala-timbres`, `narr/25-credits`
- Commits pequenos, mensagem no formato `tipo(area): descrição (#issue)`
  - ex.: `feat(dados): baixa frames do SVS 5147 (#12)`
  - tipos: `feat`, `fix`, `docs`, `chore`, `data`, `test`

```bash
git checkout main
git pull
git checkout -b dados/12-download-svs
# ... trabalho ...
git add pipeline/download.py
git commit -m "feat(dados): baixa frames do SVS 5147 (#12)"
git push -u origin dados/12-download-svs
gh pr create --fill
```

## 3. Pull Request

- Abra o PR assim que tiver algo funcionando (pode ser rascunho: `gh pr create --draft`).
- Escreva `Closes #<numero>` na descrição para fechar a issue.
- Outra pessoa do time revisa e faz o merge (**squash merge**).
- Antes de abrir: `git pull origin main` na sua branch para trazer o que mudou.

## 4. Issues = tarefas

- Todas as tarefas do plano estão nas **Issues**, com label de papel e milestone de fase.
- Pegue uma issue: atribua a você (`gh issue edit <n> --add-assignee @me`) antes de começar, para ninguém pegar a mesma.
- Uma issue por vez por pessoa, sempre que possível.
- Checkpoints (12h30, 18h, dom 13h, 21h) estão como issues `area:todos`.

## 5. Arquivos grandes

- Frames em `public/data/<faixa>/frames/` em **webp, 1024 px**, no máximo ~150 frames por faixa.
- Originais (PNG/MP4 grandes) ficam no **Drive**, nunca no Git (`.gitignore` já bloqueia `raw/`).

## 6. Regras do desafio que valem no código

- Todo código ou áudio gerado por IA leva um comentário `// AI-assisted: <ferramenta>` (ou metadado no áudio) e entra em `CREDITS.md`.
- Toda biblioteca, som ou dado usado entra em `CREDITS.md` no mesmo PR.
- Decisões do time (faixas, mapeamentos) vão em `DECISIONS.md` com quem decidiu e por quê.
