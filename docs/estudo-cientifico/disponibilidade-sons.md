# Sons indisponíveis: inventário, causas e plano de ataque

**Nota sobre ozônio:** a observação de E5 repetido abaixo descreve a escala
anterior. A [nova curva de sensibilidade](ozonio-sensibilidade.md) mantém os
dados e a disponibilidade, mas passa a usar cinco notas na América do Norte.

**Atualização:** os itens 1, 3 e 4 solicitados pelo usuário foram tratados na
[recuperação de precipitação](precipitacao-recuperacao.md): estados separados,
retry, limite de espera, análise dos PNGs originais e semântica explícita de
ausência. A tabela abaixo preserva o inventário anterior à implementação;
as ausências territoriais de precipitação passaram de 53,62% para 40,68%.

Auditoria em 15/11/2026, base `45e9be3`. Escopo: 7 variáveis, 124 horários,
177 entidades territoriais e 8 grupos do GeoJSON. Verificados os JSONs locais
com os validadores e o mapeamento sonoro reais do front-end, além de uma
reprodução no Firefox. Esta etapa é uma análise; não alterou sons, filtros,
dados de produção ou o comportamento da interface.

## América do Norte e ozônio

**Não há ausência persistente de dados para o grupo América do Norte.**
Os 124 horários têm concentração e nota válidas. A cobertura varia de 78,0%
a 84,4% dos pixels analisáveis, média de 82,5%. Todos mapeiam para **E5** na
escala atual. Canadá também tem 124 notas válidas; Estados Unidos, 124.
Repetir a mesma nota é efeito dos degraus da escala, não indisponibilidade.

O usuário informou que o episódio desapareceu ao testar novamente. No Firefox,
a seleção carregada mostrou 43,44 ppbv e E5 no primeiro frame, inclusive na
linha de ozônio do modo combinado, sem erros de console. **O episódio original
não foi reproduzido e sua causa específica não foi determinada.**

Foi reproduzido um estado transitório confuso: ao selecionar a região, antes
de terminar o carregamento de `regions.json`, a leitura mostra `Unavailable`
e a mensagem “no regional value is available”, embora o status separado diga
que está carregando. Quando o carregamento termina, aparece E5. Esse fluxo
explica uma possibilidade concreta para o sintoma; não prova a causa do caso
original. Falha de rede, cache com versões incompatíveis ou seleção durante
uma troca de faixa são outras possibilidades, ainda não demonstradas naquele caso.

## Inventário completo dos dados publicados

Cada linha abaixo considera **177 territórios × 124 horários = 21.948
combinações**, com todas as regiões recebendo o mesmo peso na contagem.
As porcentagens não representam área da Terra, tempo global sem dados,
precisão ou probabilidade de falha da aplicação.

| Variável | País/horário sem som mapeável | Fração | Territórios afetados | Quadro global indisponível |
|---|---:|---:|---:|---:|
| Temperatura | 0 | 0% | 0 | 0/124 |
| Vento | 8.133 | 37,06% | 146 | 0/124 |
| Precipitação | 11.769 | 53,62% | 166 | 0/124 |
| Umidade específica | 437 | 1,99% | 21 | 0/124 |
| PM2.5 | 805 | 3,67% | 15 | 0/124 |
| CO | 1.379 | 6,28% | 19 | 0/124 |
| Ozônio | 2.451 | 11,17% | 62 | 0/124 |

Somando territórios e grupos, há **25.518 ausências de mapeamento**. Em todas,
a linha publicada tem **cobertura zero e estatísticas nulas: nenhum pixel
aceito pelos filtros**. Nenhum caso atual foi causado por rejeitar um valor
numérico válido ao convertê-lo em nota. Todos os JSONs passaram pela validação;
nenhum arquivo de frame referenciado estava ausente localmente.

Nos grupos, as ausências se concentram em:

| Grupo | Vento | Precipitação | Umidade | PM2.5 | CO | O3 |
|---|---:|---:|---:|---:|---:|---:|
| Territórios insulares oceânicos, somente terra | 87/124 | 98/124 | 0/124 | 41/124 | 124/124 | 124/124 |
| Antártida | 0/124 | 2/124 | 0/124 | 0/124 | 0/124 | 68/124 |
| Demais 6 grupos | 0/124 | 0/124 | 0/124 | 0/124 | 0/124 | 0/124 |

O primeiro grupo é `continent:Seven seas (open ocean)`, formado por territórios
terrestres do GeoJSON; não é uma média do oceano. Há sobreposição entre essa
linha e territórios individuais, portanto essas contagens não são observações
independentes. Temperatura não tem ausências, mas não usa filtro de aceitação:
qualquer pixel analisável recebe a cor de legenda mais próxima. Disponibilidade
total não comprova melhor qualidade científica.

## Por que os dados regionais desaparecem

**Vento:** a visualização tem cores fracas transparentes e sobreposição com o
mapa-base. O extrator rejeita baixa saturação, cores distantes da legenda e
valores acima do teto configurado. Pode sobrar nenhum pixel, especialmente
onde o sinal é fraco. Exemplos com ausência nos 124 frames: Guatemala,
Serra Leoa, Burundi e Ruanda. O índice visual já melhorou a ordenação onde
há cores aceitas; ele deliberadamente continua nulo quando não há nenhuma.
Trocar a média por um índice não recupera informação que não foi detectada.

**Precipitação:** a camada se mistura com nuvens e mapa-base. Sem cor aceita
podemos ter precipitação pequena/ausente ou precipitação encoberta/não
reconhecida; o código não distingue esses casos. Chade, Níger e Emirados
Árabes Unidos estão ausentes nos 124 frames. Não é correto afirmar que
todos esses casos são falhas do extrator ou que todos são chuva zero.
O intervalo da quantidade em mm também continua sem confirmação.

**Ozônio:** a ponta inferior da legenda é quase branca e o filtro exige
saturação ≥40 e distância RGB ≤30. Aplicando o critério de saturação às
próprias cores amostradas da legenda publicada, a menor concentração aceita
é aproximadamente **26,19 ppbv**, embora a legenda comece em 5 ppbv. Isso
mostra uma perda importante de sensibilidade a cores de baixas concentrações.
Não é um corte físico rígido: pixels comprimidos/misturados podem ser
atribuídos a cores próximas com saturação diferente. A contribuição exata de
cada causa por pixel não foi medida nesta auditoria.

Exemplos de ozônio indisponível: Papua-Nova Guiné **103/124**, Porto Rico
**120/124**, Belize **86/124**, Costa Rica **56/124**; Antártida **68/124**.
Fiji, Falklands/Malvinas, Terras Austrais e Antárticas Francesas, Vanuatu,
Luxemburgo, Ilhas Salomão, Brunei e Trinidad e Tobago ficam sem dados nos
124 frames. A combinação de regiões pequenas, cores claras, compressão e
contornos é uma hipótese consistente para parte desses casos; não atribuímos
uma causa única a cada território sem inspecionar seus pixels.

**PM2.5, CO e umidade:** têm menos lacunas, concentradas sobretudo em
territórios pequenos ou insulares. A resolução de 1024 × 512 deixa poucos
pixels sobre algumas áreas, e rejeitar esses pixels elimina toda a amostra.
Filtros de cor, mistura com costas/mapa-base e cores claras também contribuem.
CO e O3 estão integralmente ausentes no grupo de territórios insulares.
Usar resolução maior pode ajudar, mas aumentar artificialmente a imagem
atual por interpolação não cria informação nova.

**Disponível não significa amostra suficiente:** existem, entre países e
horários com mapeamento válido, 1.210 casos de vento, 1.136 de precipitação,
52 de O3 e 2 de umidade com menos de 1% dos pixels analisáveis aceitos.
O som pode tocar com poucos pixels e representar mal a região inteira.
Esse é outro problema de qualidade; não deve ser confundido com `Unavailable`.

## Outros caminhos para silêncio ou indisponibilidade

| Situação | Comportamento atual | Diagnóstico |
|---|---|---|
| Região carregando | Série temporariamente vazia; leitura `Unavailable` | Reproduzido; apresentação confunde espera com ausência científica |
| Falha de fetch, JSON inválido ou tabela desatualizada | Validador rejeita; região permanece silenciosa e mostra erro | Caminho presente no código; nenhum erro desse tipo nos arquivos atuais |
| Região sem linha ou horário sem correspondência no combinado | Camada recebe campos nulos e fica silenciosa | Zero chaves ausentes e zero horários sem par na coleção atual |
| Uma das 7 fontes do combinado falha ao carregar/validar | `Promise.all` rejeita o conjunto e retorna ao modo individual | Falha de uma fonte pode indisponibilizar toda a combinação; não reproduzida como incidente real nesta análise |
| `norm` inválido, índice visual ausente, unidade/identidade incompatível | Mapeamento retorna null; silêncio | Barreiras de validação; não ocorreram fora das linhas sem pixels aceitos nesta coleção |
| Áudio desabilitado, mute, volume zero, camada desligada | Dados/nota podem estar válidos, mas o instrumento não toca | Silêncio por controle, não ausência de dados |
| Contexto Web Audio suspenso ou Tone.js não carregou | Instrumentos não iniciam; interface pode manter a nota calculada | Dependência de interação/permissão do navegador e do CDN de Tone.js; caminho de falha existe, sem ocorrência comprovada no episódio original |
| Pausa, troca de faixa, aba oculta ou navegação | Sons são liberados intencionalmente | Comportamento de controle; não corrigir preenchendo dados |
| Precipitação numérica exatamente zero | Taxa de golpes zero, silêncio intencional | Diferente de cobertura zero: aqui existe valor válido zero; nenhum caso desse tipo apareceu nas linhas publicadas auditadas |
| Voz dedilhada de O3 entre ataques | Nota curta e cauda; não é som sustentado | Pode parecer ausência durante a espera pelo próximo frame |
| Variação pequena, mesma nota da escala | Concentrações diferentes podem mapear para E5 repetidamente | Não é indisponibilidade; O3 da América do Norte repete E5 em 124/124 |
| Mix e narração | Ganho compartilhado e redução de volume durante a fala | Pode mascarar camadas; estudo perceptivo separado da disponibilidade numérica |

Os atuais arquivos passam no alinhamento do combinado em todos os horários e
regiões. Portanto, as lacunas persistentes atuais são herdadas dos dados de
pixels, não criadas por um desalinhamento de índices. A auditoria não simula
todos os estados possíveis de rede, cache, dispositivo ou permissão de áudio.

## Plano de ataque proposto

Estas são propostas; salvo os índices de vento/PM2.5 e as mensagens de erro já
existentes, não foram implementadas nesta etapa.

| Prioridade | Trabalho | Critério para verificar o resultado |
|---|---|---|
| P0 | Separar `carregando`, `falha de carregamento`, `sem pixels reconhecidos`, `áudio desligado` e `silêncio por valor zero`; apresentar a causa junto à leitura | Rede lenta deixa de afirmar que a região não tem dados; mensagens e áudio mudam juntos quando a série termina de carregar |
| P0 | Botão de tentar novamente para erro regional, diagnóstico com faixa/região/frame e proteção contra resposta antiga sobrescrever nova seleção | Testes com resposta atrasada, erro HTTP, troca rápida de faixa e cache incompatível; nenhuma nota global usada como substituto regional |
| P1 | Investigar recuperação das cores claras de O3, primeiro em amostras com referência numérica; comparar filtros e separação do mapa-base | Medir lacunas recuperadas, falsos reconhecimentos, cobertura, ordenação e direção temporal em dados de checagem não usados para escolher o filtro |
| P1 | Reprocessar amostras pequenas/insulares a partir dos frames originais em maior resolução e rever máscaras de costas, fronteiras e textos | Comparar com os pixels atuais; divulgar número de pixels analisáveis/aceitos, sem tratar imagem interpolada como informação nova |
| P1 | Confirmar a semântica de transparência e o período de precipitação com a fonte; avaliar o vento fraco no campo numérico | Só declarar zero quando a fonte o sustentar. Confirmar unidades, camada, horário e intervalo antes de uma possível faixa numérica separada |
| P2 | Permitir carregamento parcial do modo combinado, isolando a fonte que falhou | Uma camada com HTTP/JSON inválido não derruba as outras seis; conservar a falha explícita e permitir nova tentativa |
| P2 | Mostrar suporte amostral baixo mesmo quando existe uma nota | Diferenciar “sem dado” de “poucos pixels”; escolher qualquer limiar após avaliar estabilidade, e não como confiança arbitrária |
| P2 | Testes perceptivos de camada isolada versus mix, notas repetidas e sons curtos | Medir se a pessoa identifica presença e direção de mudança; evitar inventar variação ou aumentar volume para disfarçar lacunas |

Afrouxar todos os filtros ou preencher ausências com zero faria tocar mais
sons, mas poderia inverter mais/menos e aumentou/diminuiu. O critério de
sucesso é recuperar informação correta e comunicar os limites. Para regiões
sem informação visual recuperável, uma eventual fonte numérica deve ser uma
alternativa explicitamente identificada, não uma correção invisível dos pixels.

## Artefatos e reprodução

- [Inventário completo por faixa, região e intervalos de frames](dados/disponibilidade-sons/disponibilidade-sons.json).
- [Tabela CSV](dados/disponibilidade-sons/disponibilidade-sons.csv).
- [Estados reproduzidos no navegador e erros de console](dados/disponibilidade-sons/navegador.json).

Na raiz do projeto:

```bash
node pipeline/audit_sound_availability.mjs --output-dir /tmp/disponibilidade-sons
```

O script importa os validadores e mapeamentos reais, verifica os arquivos de
frame, audita todas as linhas, testa o alinhamento do combinado e registra
hashes dos insumos. Não baixa dados nem modifica produção. Os intervalos de
frames no inventário são 1-based. A consulta à revisão Git precisa de permissão
para iniciar um subprocesso em ambientes restritos.

Análise e documentação assistidas por OpenAI Codex. Visualizações: NASA SVS;
dados e regras de extração são os já arquivados neste projeto.
