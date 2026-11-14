# Tarefas por fase e papel

Fonte: plano de ataque v4. Cada tarefa também é uma **Issue** no GitHub (label `area:*` + milestone da fase).
Pegue a issue (assign em você) antes de começar. Detalhes do fluxo em [CONTRIBUTING.md](../CONTRIBUTING.md).

## Quem mexe em quê

| Papel | Pastas |
|---|---|
| Dados | `pipeline/`, `public/data/` |
| Front | `public/index.html`, `public/src/ui/`, `engine/audio.js`, `engine/speech.js`, `.github/workflows/` |
| Som | `engine/mapping.js`, `engine/mood.js`, `engine/presets.js`, `public/sounds/`, `docs/MAPPINGS.md` |
| Narr. | `README.md`, `CREDITS.md`, `docs/TESTS.md`, `docs/PITCH.md`, `public/how-it-works.html`, `src/i18n/` |

> Time de 2 pessoas? Pessoa A = Dados + Front; Pessoa B = Som + Narr. Escopo: faixas 1, 3 e 5.

## Fase 0 — Preparação (sáb 08h30–09h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 0.1 | sáb 08:30 | Confirmar todos inscritos no mesmo evento e time no site | Todos | Todos aparecem na página do time |  |
| 0.2 | sáb 08:30 | Ler Project Submission Guide e Judging & Awards Guide | Narr. | Regras anotadas no grupo do time |  |
| 0.4 | sáb 08:35 | Criar pasta compartilhada (Drive) para frames, áudios e vídeo | Dados | Link no grupo |  |
| 0.5 | sáb 08:40 | Instalar Python 3.11+, ffmpeg, Node 20, Git e leitor de tela | Todos | python, ffmpeg e node respondem |  |
| 0.6 | sáb 08:45 | Resgatar Global Offers (Miro; opcional GoDaddy) | Narr. | Quadro do Miro criado |  |
| 0.7 | sáb 08:50 | Recrutar 1–2 testadores cegos/baixa visão e 8–10 voluntários olhos fechados | Narr. | Mensagens enviadas |  |

## Fase 1 — Abertura e decisões (sáb 09h00–09h45)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 1.1 | sáb 09:00 | Leitura conjunta: resumo e princípios do som (seções 1, 6.1, 6.2) | Todos | Todos entenderam a tese |  |
| 1.2 | sáb 09:10 | Preencher o Data Sonification Canvas no Miro | Todos | Canvas preenchido |  |
| 1.3 | sáb 09:20 | Escolher as faixas finais (mínimo 3) | Todos | Lista de faixas fechada | DECISIONS.md |
| 1.4 | sáb 09:30 | Fechar tabela variável → som → justificativa | Som | Tabela aprovada pelo time | docs/MAPPINGS.md |
| 1.5 | sáb 09:35 | Registrar decisões em DECISIONS.md e criar presets iniciais em public/tracks/ | Front | Arquivos commitados | DECISIONS.md, public/tracks/*.json |
| 1.6 | sáb 09:40 | Confirmar papéis, canais e checkpoints na agenda | Todos | Agenda criada |  |

## Fase 2 — Dados e esqueleto (sáb 09h45–12h30)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 2.1 | sáb 09:45 | download.py: baixar frames/MP4 de 5147, 5148, 5149, 5150, 5011, 5313, 5046, 5113 e copiar para o Drive | Dados | Arquivos no Drive (backup) | pipeline/download.py |
| 2.2 | sáb 10:15 | extract_frames.py: reduzir para 1024 px, webp, 2–4 frames/s | Dados | public/data/<faixa>/frames prontas | pipeline/extract_frames.py, public/data/** |
| 2.3 | sáb 10:45 | calibrate_colorbar.py: legenda da temperatura (5147) → colorbar.json | Dados | Erro aceitável em 3 pixels de teste | pipeline/calibrate_colorbar.py |
| 2.4 | sáb 11:15 | Criar máscara para excluir texto, logos e data | Dados | mask.png por faixa | public/data/*/mask.png |
| 2.5 | sáb 11:30 | features.py: média, p90, área acima do limiar, diferença entre frames, grade 64×32 | Dados | features.json da temperatura | pipeline/features.py |
| 2.6 | sáb 09:45 | Esqueleto do app: carregar frames, player com play, pausa e barra de tempo | Front | Frames passam na tela | public/index.html, public/src/ui/player.js |
| 2.7 | sáb 10:30 | Botão ativar som com Tone.start(); limitador de volume no master | Front | Som só após clique; volume limitado | public/src/engine/audio.js |
| 2.8 | sáb 11:00 | Separar mapping.js (dado → som) de mood.js (emoção) | Front + Som | Dois módulos independentes | public/src/engine/mapping.js, mood.js |
| 2.9 | sáb 09:45 | Escolher escala e timbres por família (geofonia, biofonia, antropofonia); preparar sons naturais | Som | Banco de sons pronto | public/sounds/**, presets.js |
| 2.10 | sáb 11:00 | Criar a legenda sonora de cada família (~10 s cada) | Som | 3 áudios curtos de legenda | public/sounds/** |
| 2.11 | sáb 09:45 | Iniciar CREDITS.md com ID, título e link de cada visualização | Narr. | Lista inicial | CREDITS.md |
| 2.12 | sáb 10:30 | Rascunho em inglês do High-Level Summary | Narr. | Texto de 1 parágrafo | docs/PITCH.md |
| 2.13 | sáb 11:30 | Confirmar dia e hora com testadores | Narr. | Horários marcados |  |
| 2.14 | sáb 12:30 | CHECKPOINT 1: faixa da temperatura toca de ponta a ponta (frame → valor → nota) | Todos | Demo interna funcionando |  |

## Fase 3 — MVP (sáb 13h30–18h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 3.1 | sáb 13:30 | Faixa 1 completa: 4 vozes, timbres distintos, entradas defasadas ~300 ms, silenciar/isolar | Front + Som | Quarteto audível e separável | public/src/engine/*, public/tracks/clima-*.json |
| 3.2 | sáb 14:30 | Marcos falados (pt-BR e en-US) e legenda sonora antes de tocar | Front | Datas narradas durante a faixa | public/src/engine/speech.js, ui/legend.js |
| 3.3 | sáb 15:00 | Explorador tátil: grade → valor; voz com região e valor; setas | Front | Funciona com mouse, toque e teclado | public/src/ui/explorer.js |
| 3.4 | sáb 16:00 | Acessibilidade básica: aria-labels, ARIA live, foco visível, alvos 44 px | Front + Narr. | Navegável com leitor de tela | public/src/ui/a11y.js, styles.css |
| 3.5 | sáb 13:30 | Faixa 5: detecção de manchas em 5011 (raios) e 5113 (fogo) → eventos | Dados | features.json com eventos | pipeline/features.py, public/data/fogo-raios/ |
| 3.6 | sáb 15:30 | Faixa 3: área branca do gelo (5046) por frame | Dados | features.json do gelo | public/data/gelo/ |
| 3.7 | sáb 11:00+ | Se usar modo ao vivo: perguntar no fórum sobre uso do GIBS | Narr. | Pergunta postada |  |
| 3.8 | sáb 17:00 | Publicar no GitHub Pages; testar em Android e iPhone | Front | Link público abre e toca | .github/workflows/pages.yml |
| 3.9 | sáb 18:00 | CHECKPOINT 2: MVP ponta a ponta publicado | Todos | Link funcionando para todos |  |

## Fase 4 — Noite de sábado (19h00–23h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 4.1 | sáb 19:00 | Teste rápido com 2–3 pessoas de olhos fechados | Narr. | Lista de ajustes | docs/TESTS.md |
| 4.2 | sáb 19:30 | Faixa 5 no app: cada evento → batida sincronizada com o frame | Front + Som | Raios e fogo tocam no frame certo | public/tracks/fogo-raios.json |
| 4.3 | sáb 20:30 | Faixa 3 no app: área do gelo → sininhos e volume do pad | Front + Som | Gelo diminuindo é audível | public/tracks/gelo.json |
| 4.4 | sáb 21:30 | Aplicar ajustes do teste 4.1 | Front + Som | Ajustes feitos |  |
| 4.5 | sáb 22:00 | Opcional: faixa luzes noturnas (5313) com dois timbres | Front + Som | Faixa toca | public/tracks/luzes-noturnas.json |
| 4.6 | sáb 22:00 | Opcional: modo A Terra hoje com GIBS | Front | Imagem do dia toca |  |
| 4.7 | sáb 22:45 | Commit, push, backup no Drive; publicar de novo | Front | Versão estável publicada |  |

## Fase 5 — Domingo de manhã (09h00–13h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 5.1 | dom 09:00 | Faixa 2 (quando você nasceu): frames + validação contra GISTEMP; entrada do ano | Dados + Front | Erro de validação documentado | public/data/quando-voce-nasceu/ |
| 5.2 | dom 09:00 | Teste com pessoa cega (20–30 min); 3 problemas e 3 ajustes; autorização | Narr. | Notas e autorização | docs/TESTS.md |
| 5.3 | dom 10:00 | Teste de olhos fechados com 8–10 pessoas; calcular acertos | Narr. | X de Y pessoas calculado | docs/TESTS.md |
| 5.4 | dom 10:30 | Opcional: faixa 4 (NDVI + CO2, tom de Shepard); opcional POWER e EONET | Front + Som | Faixa toca | public/tracks/terra-respirando.json |
| 5.5 | dom 11:30 | Aplicar ajustes dos testes 5.2 e 5.3 | Todos | Ajustes feitos |  |
| 5.6 | dom 12:30 | Rodar checklist completo de acessibilidade | Narr. | Todos os itens marcados |  |
| 5.7 | dom 13:00 | CHECKPOINT 3: congelar funcionalidades | Todos | Nada novo entra |  |

## Fase 6 — Domingo à tarde (14h00–18h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 6.1 | dom 14:00 | Correção de bugs e polimento da mixagem | Front + Som | Lista de bugs zerada |  |
| 6.2 | dom 14:00 | Interface e textos em inglês (i18n) | Front | Site funciona em EN | public/src/i18n/* |
| 6.3 | dom 14:30 | Página How it works: mapeamentos, justificativas e resultados dos testes | Narr. | Página publicada | public/how-it-works.html |
| 6.4 | dom 15:00 | README e CREDITS.md completos | Narr. + Front | Arquivos revisados | README.md, CREDITS.md |
| 6.5 | dom 15:00 | Gravar e editar vídeo de 30 s com legenda em inglês; YouTube não listado | Narr. | Vídeo ≤ 30 s publicado |  |
| 6.6 | dom 17:00 | Identificar uso de IA: comentários, README, metadados em áudios | Todos | Tudo marcado |  |
| 6.7 | dom 17:30 | Publicar versão final no Pages | Front | Link final estável |  |

## Fase 7 — Submissão (dom 18h00–21h00)

| # | Quando | Tarefa | Papel | Pronto quando… | Arquivos |
|---|---|---|---|---|---|
| 7.1 | dom 18:00 | Preencher formulário em inglês (todos os campos, Save Progress) | Narr. | Todos os campos salvos | docs/PITCH.md |
| 7.2 | dom 18:45 | Campo NASA Data: listar 5011, 5313 e demais com ID e link | Narr. | Lista completa |  |
| 7.3 | dom 19:00 | Campo References: todas as fontes, libs, sons e artigos com licença | Narr. | Igual ao CREDITS.md |  |
| 7.4 | dom 19:30 | Testar todos os links em janela anônima e outra rede | Todos | Todos abrem sem login |  |
| 7.5 | dom 20:00 | Revisão final cruzada | Todos | Checklist assinado |  |
| 7.6 | dom 20:30 | Submit for Judging e salvar captura | Narr. | Banner de confirmação |  |

## Versão mínima aceitável (se tudo atrasar no dom 13h)

- Faixa 1 (temperatura, mesmo com 1–2 vozes) + faixa 5 com raios do ISS (5011)
- Legenda sonora + marcos falados + navegação por teclado
- Resultado de pelo menos um teste de olhos fechados
- README, CREDITS e página How it works
- Vídeo de 30 s e formulário enviado até 21h
