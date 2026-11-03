# Polimento de Loja, Coleção e Arena

Atualização de qualidade de vida de 3 de novembro de 2026, implementada na branch compartilhada `dev`. Não acrescenta conteúdo nem altera balanceamento.

## O que mudou

- **Loja:** botão Normal/Compacta na página da oficina. A vista normal mantém as ilustrações; a compacta concentra nome, quantidade, contribuição, preço e disponibilidade em linhas menores. A preferência fica em `lollipopUI.shopView`, independente do save, e falhas de armazenamento não interrompem o jogo.
- **Compras:** ×1, ×10, ×100 e MAX continuam usando `getBulkQuote`/`buyBulk`. A interface mostra o lote, os doces que faltam e a quantidade real do MAX. MAX sem saldo mostra zero unidades e o preço da próxima unidade; não anuncia compra grátis. Os rótulos acessíveis incluem preço completo e quantidade.
- **Estimativa:** considera somente o PPS atual e o vencimento do boost já ativo. Não prevê cliques, novas máquinas, trocas de sabor ou boosts futuros. É omitida com PPS zero, roleta pendente, preço não finito ou espera superior a sete dias. Os valores são aproximados e arredondados para cima.
- **Coleção:** cada sabor apresenta bônus de clique e multiplicador/percentual de produção derivados de `FLAVORS_DATA`, além de um perfil de uso. O perfil descreve os tipos de bônus, sem prometer superioridade. Algodão-Doce e Arco-Íris agora mostram os bônus de clique que suas antigas descrições omitiam; Abacaxi mostra também seu bônus passivo.
- **Comparação:** botão próprio, inclusive em sabores ainda inacessíveis. Exibe clique e PPS do sabor equipado e da prévia com as mesmas fórmulas do jogo, prestígio e boost atuais. Não chama uma ação de jogo, não equipa, não desbloqueia nem desconta doces. O painel acompanha o vencimento do boost sem reconstruir as cartas. Equipar/desbloquear continua uma ação explícita separada.
- **Arena:** recompensa de vitória destacada antes da luta, HP e relógio maiores no celular, instruções adequadas ao combate/descanso. A transição observa prazo e número de vitórias para não confundir vitória com derrota. O resultado permanece visível e só o aviso compartilhado o anuncia, evitando duas regiões ao vivo com a mesma mensagem.
- **Interação:** estados equipado/desbloqueado/não adquirido, mensagens de saldo insuficiente, botões com tamanho de toque adequado e retorno de foco da comparação. Animações de compra/impacto respeitam movimento reduzido e os ajustes existentes.
- **Offline:** nova versão de cache do PWA e inclusão do módulo de apresentação. Não há dependências ou requisições externas novas. Para receber a atualização após publicá-la, feche as abas antigas e reabra o jogo.

## Arquivos

| Área | Arquivos |
| --- | --- |
| Apresentação e cálculos sem mutação | `js/ui/qol.js` (novo), `js/ui/shop.js`, `js/ui/shared.js` |
| Controladores | `js/pages/shop.js`, `js/pages/collection.js`, `js/pages/arena.js` |
| Documentos | `pages/shop.html`, `pages/collection.html`, `pages/arena.html` |
| Estilos | `css/pages.css`, `css/responsive.css` |
| PWA | `sw.js` |
| Validação | `tests/qol.test.js`, `tests/qol_browser.py` (novos) |
| Documentação | `README.md`, `docs/SCREENSHOTS.md`, este relatório e três capturas em `docs/screenshots/qol/` |

As telas afetadas são Loja, Coleção e Arena. A compra rápida no Mundo reutiliza o componente da Loja e recebe as mensagens de disponibilidade; o seletor de vista fica na oficina.

## Validação executada

Ambiente: Node **24.22.1**, Python Playwright e Chromium real headless. O servidor serviu o jogo em `/Lollipop-Clicker-TEST/`, reproduzindo o subdiretório do GitHub Pages.

| Comando | Resultado |
| --- | --- |
| `npm run check` | 27 arquivos JavaScript e nove HTMLs verificados |
| `npm test` | **67 verificações passaram**, incluindo nove novas de prévias, cotações, ETA e armazenamento da preferência |
| `LOLLIPOP_BASE_URL=http://127.0.0.1:8014/Lollipop-Clicker-TEST/ python3 tests/browser_smoke.py` | **107 verificações passaram**: gameplay, migração de saves, navegação, lifecycle, roleta, prestígio, Arena, armazenamento e PWA offline |
| `LOLLIPOP_BASE_URL=http://127.0.0.1:8014/Lollipop-Clicker-TEST/ python3 tests/qol_browser.py` | **122 verificações passaram**: compras exatas em ambas as vistas, teclado/toque, preferência, previews, expiração do boost, vitória/derrota, notificação única, cache e layouts |
| `python3 tests/artwork_browser.py` | **13 verificações passaram**: SVG padrão, PNG válido, ausente/corrompido, cache, offline e interação |
| `npm run android:prepare && node scripts/check-android.mjs` | Nove documentos e assets locais preparados; caminhos e ID estável verificados |

Os layouts de Loja, Coleção e Arena foram exercitados em **280, 320, 390, 640, 768 e 1440 px**, com saldo grande: sem overflow horizontal e com o último conteúdo alcançável acima da navegação inferior. Não houve erros JavaScript não tratados. A regressão existente confirmou migração do save 2 e preservação das três categorias visuais independentes.

O Node instalado suporta `--test-isolation=none`; não foi necessário mudar o comando de testes.

## Preservação e limites

`js/gameplay.js`, `js/data.js`, `js/storage.js`, IDs, preços, fórmulas, probabilidades, schema/chaves de progresso, arte SVG/registro de imagens e configurações Android/assinatura permaneceram sem alterações. Nenhum dado é resetado pela preferência de interface.

Não foi compilado um APK nesta tarefa; não era necessário para validar alterações de apresentação. Não houve execução em aparelho Android, emulador, Safari ou Firefox, nem medição de bateria/FPS em hardware antigo. O teste em Chromium móvel simula viewport e entrada de toque; não equivale a execução no Android WebView. O pacote web Android foi preparado e verificado, sem mudanças nativas. Capturas usam movimento reduzido e ocultam somente notificações transitórias; a barra inferior fixa aparece na posição da viewport nas imagens de página inteira.

A estimativa é uma previsão de curto prazo sob o estado atual; fica desatualizada se o jogador gastar/equipar itens ou ativar outro bônus e é recalculada no próximo render. O perfil misto não atribui uma frequência ideal de cliques. Não são feitas alegações de desempenho em aparelhos que não foram testados.

## Balanceamento para uma revisão futura

- Com uma Fábrica de Doces, sem prestígio/boost/bônus da roleta e dois cliques por segundo: Blueberry rende **35,2 PPS + 8 por segundo em cliques = 43,2**, enquanto Uva rende **40 PPS + 2 em cliques = 42**. É uma troca entre produção passiva e cliques; nenhuma taxa/preço foi alterada.
- O primeiro guardião continua concedendo **1.500 doces** por vitória. Pode acelerar bastante o começo, mas sua recompensa, disponibilidade, dano, HP e prazos foram preservados. Uma eventual mudança de balanceamento exige avaliação e tarefa próprias.

## Capturas

- [Loja normal no celular](screenshots/qol/mobile-shop-normal.png)
- [Loja compacta no celular](screenshots/qol/mobile-shop-compact.png)
- [Coleção com comparação no celular](screenshots/qol/mobile-collection-comparison.png)

Para reproduzir as verificações de navegador, mantenha um servidor local aberto e use `LOLLIPOP_BASE_URL` com o endereço da raiz do jogo. O teste QoL grava capturas de desktop e celular em `test-results/qol/`, ignorado no Git.
