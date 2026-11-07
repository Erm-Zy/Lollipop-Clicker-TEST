# Um cantinho para os desenhos do Lollipop Clicker

Este é um joguinho independente, feito por hobby. Você pode desenhar o que der vontade: um pirulito, uma maquininha, um monstrinho ou só uma estrelinha. Não há prazo, lista de tarefas ou obrigação de completar conjuntos. Um desenho de cada vez já é bem-vindo!

O jogo já tem sua própria cara: doces coloridos, traços suaves, rosa/roxo, verde-menta e creme. A ideia é acrescentar desenhos à identidade que existe hoje, não mudar a paleta ou refazer a interface. As imagens atuais são SVGs montados em `js/ui/art.js`; elas continuam disponíveis enquanto não houver desenho novo, ou se uma imagem falhar.

## O que dá para desenhar

As medidas abaixo são pontos de partida, não regras. PNG e WebP são bem-vindos. Para objetos soltos, fundo transparente ajuda bastante. Vale guardar o arquivo de trabalho em alta resolução com você e entregar uma versão leve para o jogo.

| Desenho | Onde aparece / o que representa | Tamanho sugerido e dicas |
| --- | --- | --- |
| Pirulito principal | O grande botão clicável no Mundo e os previews do inventário | 1024×1024 como ponto de partida; **1024×1280** também encaixa bem: o SVG atual usa proporção 310×390, incluindo cabo/laço. Transparência, desenho central e uma margem de respiro. |
| Sabores | As 11 receitas da coleção; o sabor equipado muda bônus e cor do pirulito | Mesmo tamanho do pirulito, com transparência. Não é preciso fazer todos ou desenhar cada combinação com skin. |
| Skins | Sete aparências cosméticas do pirulito | Mesmo tamanho/proporção do pirulito. Uma skin pode ter sua própria cor e detalhe; não muda poder, preço ou bônus. |
| Máquinas | Loja rápida, oficina e pequenos espaços de produção no Mundo | 512×512 transparente; o espaço atual é horizontal (120×100), então 600×500 também é útil. Silhueta reconhecível em tamanho pequeno, sem escrever preços ou números na imagem. |
| Guardiões | Personagens clicáveis na Arena | 1024×1024 transparente; o espaço atual usa 330×290. Deixe mãos/pés dentro da margem e mantenha o rosto legível pequeno. Barra de vida e textos são desenhados pela interface. |
| Mundos | Paisagem central que evolui com a produção | 1920×1080 é uma boa base para paisagens. O recorte atual é mais alto (640×650), com enquadramento diferente no celular: concentre elementos importantes no centro; uma versão quase quadrada pode encaixar melhor. Fundo opaco costuma funcionar bem. |
| Fundos de locais | Possíveis desenhos para Arena, santuário e outras páginas existentes | Paisagem de 1920×1080, com margem para corte móvel. Evite detalhes essenciais sob botões/textos. Esta pasta é preparada para futuras integrações, não troca os fundos atuais automaticamente. |
| Conquistas | Álbum com 13 conquistas; hoje os emblemas SVG são por categoria | Ícones de 256×256 transparentes, simples e reconhecíveis. Categorias atuais: Cliques, Produção, Coleção e Aventura. Não precisa desenhar um prêmio para cada conquista. |
| Santuário de prestígio | Ilustração do santuário em `pages/prestige.html` | 1024×1024 transparente como base; a ilustração atual usa 240×220. Pode pensar em uma estrela/orbe açucarado, sem incorporar os números de progresso. |
| Roleta | Decoração da tenda e entorno da roda em `pages/rewards.html` | Enfeites em 512×512 transparentes; ícones em 256×256. A roda é desenhada em canvas e seu ponteiro precisa continuar ligado ao prêmio; não desenhe textos/prêmios fixos sobre as fatias. |
| Partículas e efeitos | Açúcar, brilhos e feedback de cliques | 128×128 transparente. Formas pequenas e simples; sem grandes áreas vazias. O canvas atual usa efeitos leves e limitados, não imagens externas. |
| Interface e decoração | Pequenos ornamentos, emblemas e detalhes | 256×256 transparente para ícones; 512×512 para enfeites maiores. A interface continua responsável pelos textos. |
| Ícone do app | Identidade no Android e na instalação PWA | 1024×1024 quadrado como original de trabalho. Mantenha a figura importante no centro para recortes redondos/adaptativos; versões finais dependem das ferramentas Android. Os ícones atuais não são substituídos só por colocar um arquivo na pasta. |

Fundo, partículas e aparência do pirulito são equipados **separadamente** na Coleção. O sabor é outra escolha, com bônus próprios. Isso não exige que você desenhe todas as combinações possíveis.

## Os nomes que o jogo já usa

### Sabores (11)

| ID no código | Nome |
| --- | --- |
| `morango` | Morango |
| `limao` | Limão |
| `blueberry` | Blueberry |
| `uva` | Uva |
| `laranja` | Laranja |
| `melancia` | Melancia |
| `abacaxi` | Abacaxi |
| `chocolate` | Chocolate |
| `algodao` | Algodão-Doce |
| `arcoiris` | Arco-Íris |
| `lendario` | Sabor Lendário |

### Coleções visuais (7)

`classic` — Clássico; `neon` — Neon; `rainbow` — Arco-Íris; `gold` — Dourado; `cosmic` — Cósmico; `fire` — Fogo; `ice` — Gelo.

Cada coleção libera aparência, tema e partículas. Hoje os temas são estilos CSS e as partículas são desenhadas em canvas. Preparar um desenho não altera essas escolhas nem as vincula umas às outras.

### Máquinas (nomes exatos de `js/data.js`)

| ID | Nome |
| --- | --- |
| `maquina` | Máquina de Pirulitos |
| `calda` | Calda Açucarada |
| `fabrica` | Fábrica de Doces |
| `misturador` | Misturador de Sabores |
| `embaladora` | Embaladora Automática |
| `laboratorio` | Laboratório de Açúcar |
| `linha` | Linha de Produção |
| `superfabrica` | Super Fábrica de Pirulitos |

### Arena e mundo

O código da Arena recebe o número de vitórias e alterna três tipos (`level % 3`). Por isso o registro usa números, não IDs inventados:

| Chave em `bosses` | Personagem |
| --- | --- |
| `0` | Geleião do Pomar |
| `1` | Capitão Caramelo |
| `2` | Dragão de Suspiro |

Os estágios usados pelo controlador do Mundo são:

| Chave em `worlds` | Local |
| --- | --- |
| `0` | Colina de Açúcar |
| `1` | Vila Caramelada |
| `2` | Vale das Engenhocas |
| `3` | Reino dos Pirulitos |

## Onde colocar os arquivos

```text
assets/images/
├── lollipops/
│   ├── main/
│   ├── flavors/
│   └── skins/
├── buildings/
├── bosses/
├── backgrounds/
│   ├── world/
│   └── locations/
├── effects/
├── ui/
└── app/
```

As pastas vazias têm `.gitkeep`, não imagens falsas. `bg-purple.png` e os outros assets existentes foram preservados onde estavam. Use nomes em minúsculas e com hífen, por exemplo `maquina-pirulitos.png`. Não há necessidade de separar por artista, etapa de aprovação ou data.

## Seu primeiro PNG no jogo

Por exemplo, se você desenhar a Máquina de Pirulitos:

1. Coloque o arquivo real em `assets/images/buildings/maquina-pirulitos.png`.
2. Abra `js/ui/assets.js` e, dentro de `ARTWORK.buildings`, troque apenas:

```js
maquina: null,
```

por:

```js
maquina: "assets/images/buildings/maquina-pirulitos.png",
```

3. Execute `npm run check` e `npm test`. Com `npm run serve`, abra o Mundo e a Loja. A máquina também aparece onde for usada como parte do cenário.

Para o pirulito inicial, use `ARTWORK.main = "assets/images/lollipops/main/pirulito-principal.png"`. Ele vale para **Morango + Clássico**. Um caminho em `flavors.uva`, por exemplo, vale para Uva + Clássico. Uma imagem em `skins.neon` vale quando Neon está equipado. Combinações sem imagem própria continuam usando o SVG dinâmico; não é necessário preparar um arquivo para cada combinação. Para remover uma arte personalizada, volte a entrada para `null`; não precisa apagar o arquivo. Ao publicar/atualizar desenhos ou mudar o registro, gere `dist/` com `npm run pwa:build`; a release muda automaticamente pelos arquivos (não é preciso listar o PNG no worker). Veja [atualizações PWA](PWA_UPDATES.md).

O registro aceita somente PNG/WebP locais dentro de `assets/images/`. Não use URL de CDN, link de Drive, caminho absoluto do computador ou arquivo que ainda não exista. Um arquivo colocado na pasta **sem ser associado ao registro não muda o jogo**.

## O que a integração faz — e o que fica para depois

O adaptador mantém o SVG externo, sua proporção, classes CSS e área clicável. O SVG original aparece durante o carregamento e volta a ser a apresentação usada se a imagem falhar. A imagem só assume o lugar quando carrega, sem esticar. Os botões, animações do contêiner, feedback de clique e regras continuam funcionando.

Um PNG estático não ganha, sozinho, as engrenagens ou partículas internas que eram desenhadas em SVG/canvas. Os temas CSS continuam podendo filtrar a paisagem, como já fazem hoje. Não se alterou essa regra para preparar desenhos hipotéticos.

A ligação automática cobre pirulitos/sabores/skins, máquinas, tipos de chefes e estágios do mundo. Previews de fundo/partículas da Coleção, efeitos de canvas, emblemas de conquistas, santuário, decoração da roleta e ícones de instalação ainda usam seus renderizadores atuais. Quando houver um desenho real para eles, dá para integrar pontualmente com o helper `withArtwork(svg, caminho)` onde já houver SVG, ou preparar uma mudança específica para canvas/ícones. Não precisa reescrever componentes antes de existir arte para eles.

## Web, offline e Android

O Android já copia `assets/` e `js/` inteiros: depois de adicionar uma arte, rode `npm run android:sync` e `node scripts/check-android.mjs`. Não precisa mudar ID do app, assinatura ou workflow.

Na PWA, o service worker guarda as imagens locais configuradas quando a página está online e o worker ativo; também guarda imagens carregadas depois. Acesse online uma vez após publicar artes novas para aquecer o cache. Se uma imagem não estiver disponível offline, o SVG continua funcionando. Use o aviso “Atualizar agora” para receber a nova release; no primeiro rollout do worker antigo, feche todas as janelas uma vez e reabra. Não é preciso editar uma lista no service worker a cada PNG.

Os testes de fallback estão em `tests/artwork.test.js` e `tests/artwork_browser.py`. O primeiro também avisa se um caminho configurado não existe. Nunca se apaga o save para testar um desenho.
