# Earth Jukebox: gabinete retrô

O checkpoint de acessibilidade e UX é `99ee962`, na branch
`feat/accessible-player-navigation`. A aparência retrô começa depois desse
commit, na branch `feat/earth-retro-jukebox`.

A direção visual proposta pelo usuário transforma as sete variáveis em uma
coleção de discos. O gabinete usa madeira escura, arco verde e dourado, letreiro
em tipografia serifada e um visor central para as imagens NASA. As ilustrações
dos discos, o acabamento e a grade do alto-falante são CSS; não há nova fonte,
biblioteca ou serviço externo. `public/jukebox.css` concentra a nova aparência.

## Interação preservada

- One variable e Combine variables continuam alcançáveis por Tab.
- A coleção usa radios nativos: Tab entra na seleção; setas mudam de disco.
  Cada opção tem nome acessível com variável e instrumento. O seletor anterior
  permanece interno para integrar o fluxo existente, sem duplicar controles
  visíveis. O guia aponta para o disco selecionado.
- Play, progresso, seleção de região e tabela mantêm sua ordem. Os discos não
  iniciam reprodução automática.
- A legenda mantém voz e exemplos musicais separados. As regras de dados,
  notas, ausência e seleção regional não foram alteradas nesta etapa visual.
- Há foco visível, indicação de seleção além da cor, layout móvel, tratamento
  de cores forçadas e respeito a `prefers-reduced-motion`.

## Verificação

As sete suítes JavaScript passaram. Uma inspeção com Firefox em viewport
1360×1100 e 390×844 não encontrou transbordamento horizontal. A seleção por
seta mudou Temperature para Wind e manteve o seletor interno e o título
sincronizados. Foram inspecionadas capturas desktop e móvel. Isso não equivale
a um novo teste com usuários cegos, leitores de tela ou validação completa WCAG.

Design e implementação assistidos por OpenAI Codex, a partir da proposta do usuário.

## Nomes na interface

Os controles usam o mesmo vocabulário nos rótulos, estados e guia falado:

| Antes | Agora | Motivo |
|---|---|---|
| Single visualization | One variable | Explicita que se explora uma variável, seu mapa e som. |
| Combination preview | Combine variables | Explicita que se combinam variáveis para comparar mapas e ouvir sons juntos. |
| Country group | Region | Encurta o seletor sem repetir o termo em cada opção. |
| Europe country group (includes all Russia) | Europe | Mantém a explicação de limites em About these boundaries. |
| Oceanic island territories (land only) | Oceanic island territories | Mantém o caráter insular; a nota de limites explica que só cobre terra. |
| Play sound legend | Hear sound examples | Descreve a ação sem depender do termo técnico legend. |
| Frame position | Timeline | Identifica a navegação temporal. |
| View values by time | Values over time | Nome curto para a tabela recolhida. |
| Read current frame row | Read this frame | Ação explícita de leitura, sem terminologia de tabela. |

As chaves de região e de variável, os nomes científicos nas leituras e a
definição dos grupos permanecem iguais. O site continua em inglês; esta etapa
não adiciona tradução parcial. As ressalvas científicas ficam nos textos de
método e limites, em vez de serem repetidas no nome de cada opção.

One record / Mix records foram reconsiderados por dependerem da metáfora
visual para explicar uma função. As abas agora usam termos funcionais e
descrições curtas, visíveis e associadas a cada aba para a navegação falada.

## Métodos e velocidade

About the values and methods fica aberto por padrão, abaixo do guia sonoro
na coluna lateral. A explicação detalhada dos cálculos continua recolhível.
Playback speed, junto à linha do tempo, oferece 0,25×, 0,5×, 1×, 1,5× e 2×.
O controle ajusta o intervalo do relógio do player, inclusive durante reprodução,
sem mudar timestamps, valores ou mapeamentos sonoros. Os tempos da legenda
sonora continuam independentes dessa velocidade.
