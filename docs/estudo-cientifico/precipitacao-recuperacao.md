# Precipitação: estados de disponibilidade e extração dos originais

Implementação em 15/11/2026 dos itens 1, 3 e 4 do [plano de ataque](disponibilidade-sons.md).
Os filtros não foram afrouxados. Nenhuma ausência foi preenchida com zero,
interpolação temporal, valor de outro país ou valor global.

## Estados claros e recuperação de erros

A seleção regional agora distingue:

- **Loading…**: aguardando a tabela regional, com o áudio dessa seleção em espera.
- **Load failed**: falha HTTP, JSON inválido, tabela incompatível ou limite de
  espera de 15 segundos atingido. O botão **Retry regional data** permite tentar novamente.
- **No recognized pixels**: a tabela carregou corretamente, mas o frame não
  contém pixels que passaram pelos filtros. A concentração/quantidade continua desconhecida.
- **No regional data**: falta uma linha regional, em vez de ausência de cores.
- Nota/ritmo válido: dados disponíveis; controles de áudio desligado, volume
  zero e pausa são tratados separadamente.

A nova tentativa revalida o arquivo, sem usar silenciosamente uma tabela
desatualizada do cache. Pedidos antigos são cancelados e suas respostas são
descartadas antes de validar ou atualizar a seleção atual. Carregamento e erro
também aparecem nas leituras, no texto anunciado e na tabela temporal; o modo
combinado identifica sua espera inicial. Essas mudanças se aplicam às variáveis,
não só à precipitação.

O [teste de navegador](../../pipeline/test_regional_availability_browser.mjs)
simula espera e HTTP 503, verifica a apresentação do erro, clica em Retry e
confirma a volta dos valores. Depois verifica um frame sem cor aceita no Chade.
A [evidência anterior à troca de fonte](dados/precipitacao-resolucao/browser-before-native.json)
registra os estados observados sem erro de console. São testes da interface,
não testes perceptivos de audição.

A [verificação após usar os originais](dados/precipitacao-resolucao/browser-after-native.json)
também confirma que uma resposta antiga de precipitação não sobrescreve a
seleção posterior de ozônio, e que um pedido pendurado termina em erro de
timeout com recuperação por Retry. Não houve erro de console nesses testes.

## Originais em 2048×1024, sem recompressão para análise

O conjunto oficial [NASA SVS 5149](https://svs.gsfc.nasa.gov/5149/) fornece PNGs
em 2048×1024. Os arquivos utilizados antes eram prévias WebP de 1024×512,
com redução espacial e compressão com perdas. Para separar os efeitos,
comparamos cinco horários com três versões:

| Fonte, mesmos filtros | País/horário sem pixels aceitos, em 885 casos | Recuperados frente à prévia | Perdidos frente à prévia |
|---|---:|---:|---:|
| WebP publicado em 1024×512 | 489 | — | — |
| PNG original reduzido para 1024×512 sem nova compressão | 405 | 86 | 2 |
| PNG original nativo em 2048×1024 | **377** | **112** | **0** |

Assim, parte da perda vem da cadeia de compressão/codificação da prévia e
parte da resolução. O teste não isola a compressão WebP da compressão do
vídeo que deu origem à prévia. Ganhar disponibilidade não demonstra exatidão
física; o método continua condicionado à seleção de pixels reconhecidos.

Os horários amostrados são os frames 1, 32, 63, 100 e 120. A [montagem dos
rótulos originais](dados/precipitacao-resolucao/rotulos-originais.png) permite
conferir suas datas. A comparação numérica completa, incluindo médias,
contagens e filtros, está em [comparacao-resolucao.json](dados/precipitacao-resolucao/comparacao-resolucao.json).

Para a faixa completa, foram obtidos os 124 PNGs correspondentes aos mesmos
horários publicados. O script verifica cada data impressa com OCR, incluindo
EDT/EST, e só produz o manifesto após todas corresponderem. Aceita a ausência
de espaço antes do fuso no texto do OCR; não aceita divergência de data,
hora, minuto, segundo ou fuso. Arquivos com data ilegível não são promovidos.

O processamento regional permite usar os originais como fonte de análise e
manter as prévias leves na tela. Não se ampliam artificialmente as prévias.
O manifesto publicado registra URL, índice de origem, rótulo verificado e
SHA-256 de cada original. O pipeline verifica hashes, datas, dimensões e
igualdade dos filtros antes de calcular qualquer tabela. JSONs geral e
regional declaram `analysisSource`; o front rejeita tabelas de análise e
prévia incompatíveis. A interface identifica que os valores vieram dos PNGs
originais e que o mapa exibido é uma prévia menor.

Os originais ficam em `raw/`, ignorados pelo Git; somente manifesto,
estatísticas, testes e evidências compactas são publicados. Os dados anteriores
foram preservados em `dados/precipitacao-resolucao/baseline/*.json.gz`.

## Resultado dos 124 horários

Os JSONs de produção foram regenerados a partir dos originais verificados,
mantendo os mesmos 124 nomes e datas de prévia, a legenda, os filtros e a
curva percussiva. Resultado completo, contabilizando ganhos e perdas:

| Escopo | Casos sem pixels aceitos antes | Depois | Recuperados | Perdidos |
|---|---:|---:|---:|---:|
| 177 territórios × 124 horários | 11.769/21.948 (**53,62%**) | 8.928/21.948 (**40,68%**) | **2.862** | **21** |
| 8 grupos × 124 horários | 100/992 | 69/992 | **31** | **0** |

O saldo é de 2.841 lacunas territoriais a menos, redução de aproximadamente
24,1% nas ausências anteriores. Nos grupos, as duas ausências da Antártida
foram recuperadas; os territórios insulares passaram de 98 para 69 ausências.

Os 21 casos perdidos usavam somente **1 ou 2 pixels** da prévia antiga.
Nos originais, nenhum pixel dentro da máscara correspondente passou pelo
mesmo filtro. Não se concluiu que todos os valores anteriores fossem falsos;
resolução, compressão e posicionamento dos centros dos pixels podem afetar
bordas. Essas perdas foram preservadas como desconhecidas, em vez de criar
um fallback oportunista que misture fontes para maximizar a disponibilidade.

O [resultado completo](dados/precipitacao-resolucao/resultado-completo.json)
lista todos os territórios, frames recuperados e perdidos, suporte dos casos
perdidos e hashes de antes/depois. A disponibilidade melhorou; valores absolutos
e direção de mudança não foram validados fisicamente neste experimento de
resolução. Pixels ainda ocultos ou rejeitados continuam desconhecidos.

## O que a fonte permite afirmar

A [descrição oficial SVS 5149](https://svs.gsfc.nasa.gov/5149/) identifica
precipitação total, incluindo chuva e neve, sobre nuvens simuladas. A
[especificação GEOS-FP](https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf)
identifica `PRECTOT` como fluxo em kg/m²/s e descreve os centros das médias
horárias. **Isso não estabelece o intervalo em mm usado pelo renderizador
SVS.** A documentação consultada não identifica de forma suficiente sua
fórmula de acumulação nem prova que transparência seja precipitação zero.

Por isso, a faixa continua rotulada em mm derivados da imagem, sem inventar
mm/h ou um acumulado de três horas. O metadado `dataSemantics` registra
`accumulationInterval: null` e `zeroFromMissingPixels: false`. Não foi
substituída por `PRECTOT` numérico nem houve mudança na curva percussiva.

Para vento, a [fonte oficial](https://svs.gsfc.nasa.gov/5148/) confirma a
velocidade a 10 m, mas não oferece uma regra que permita tratar todo pixel
rejeitado como calmaria. O índice e os dados de vento permanecem como estavam;
as mensagens de ausência agora deixam explícito que o valor físico é desconhecido.

## Reprodução

Dependências numéricas: `pipeline/requirements.txt`. Para aquisição com OCR,
também são necessários Tesseract e o modelo de inglês, disponível no
[repositório oficial tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast).
O modelo é ferramenta de verificação, não dependência do site publicado.

```bash
# Baixa e verifica cada original. Publica o manifesto somente após sucesso total.
python pipeline/fetch_native_rain.py --output raw/5149/native --manifest raw/5149/analysis-source.json --tessdata-dir /caminho/para/tessdata

# Com o manifesto verificado em public/data/clima-chuva/analysis-source.json:
python pipeline/regions.py --update-features --track clima-chuva --analysis-frames-dir raw/5149/native --analysis-manifest public/data/clima-chuva/analysis-source.json

# Reproduz o experimento inicial, preservando a referência da prévia antiga.
python pipeline/compare_rain_resolution.py --native-dir raw/5149/native --baseline-dir docs/estudo-cientifico/dados/precipitacao-resolucao/baseline --output-dir /tmp/rain-resolution

# Contabiliza ganhos e perdas em toda a série publicada.
python pipeline/summarize_rain_recovery.py --baseline-dir docs/estudo-cientifico/dados/precipitacao-resolucao/baseline --output /tmp/rain-recovery.json

python -m unittest discover -s pipeline -p 'test_*.py'
node --test public/src/tests/*.test.mjs
```

O teste de navegador usa uma sessão exclusiva de Firefox WebDriver BiDi e um
servidor local. Exemplo, com Firefox em modo headless e porta 9338:

```bash
node pipeline/test_regional_availability_browser.mjs --webdriver ws://127.0.0.1:9338/session --site http://127.0.0.1:8000/ --output /tmp/rain-ui-validation.json
```

Pesquisa, implementação e documentação assistidas por OpenAI Codex. Originais:
NASA SVS/GMAO. A melhoria de disponibilidade não elimina a transparência,
as regiões muito pequenas nem a incerteza do intervalo de precipitação.
