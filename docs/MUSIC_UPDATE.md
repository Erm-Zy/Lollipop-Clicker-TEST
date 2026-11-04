# Música dinâmica, Jukebox e conforto no celular

Implementado na branch compartilhada `dev`, em 4 de novembro de 2026. A `main` não foi alterada por esta tarefa. O jogo mantém suas ilustrações, identidade, conteúdo e regras.

## Entrega

- **Um player local de um único elemento:** quatro modos (Original, Aleatório, Mundo dinâmico e Manual), volume próprio, alternância de playlists, fallback de arquivo com falha e fades curtos em sequência. Não há crossfade com duas músicas tocando juntas, biblioteca de áudio adicional ou timer musical permanente.
- **Catálogo expansível:** registra somente a trilha original real. IDs/caminhos/configurações são validados; temas futuros ficam como exemplos no [guia de música](MUSIC_GUIDE.md). Categorias gerais, mundos, guardiões e especiais estão preparadas, sem entradas fictícias.
- **Jukebox Açucarada nos Ajustes:** lista compacta com título, créditos opcionais, atribuição, descoberta e seleção Manual; modo, volume, botão de reprodução, próxima faixa e status. Os botões antigos de música e efeitos continuam funcionando. Com apenas uma música, Próxima fica indisponível e os demais modos usam a original.
- **Descobertas:** o maior capítulo e os IDs musicais ficam em preferência independente, permanecendo após prestígio. O primeiro carregamento reconhece silenciosamente o capítulo atual; novos capítulos produzem um aviso único. Sem histórico prévio, capítulos anteriores a um prestígio antigo não são inventados.
- **Continuidade e propriedade:** modo, seleção e posição aproximada via preferências/sessionStorage; uma breve pausa entre documentos é esperada. A música acompanha o escritor do runtime, pausa com segundo plano/lifecycle nativo e não tenta `play()` a cada tick. Rejeições de autoplay/interrupção exibem instrução de interação e aguardam nova tentativa; não impedem o jogo.
- **Arena:** uma atribuição configurada usa a identidade e o combate reais, com retorno à playlist normal ao terminar. No modo Manual só interfere com a opção explícita de batalha. Nenhuma música de chefe inexistente foi registrada.
- **Coleção:** filtros Todos/Desbloqueados/Bloqueados/Posso comprar, preservando categoria e cosméticos; preço/saldo reais, estado vazio e reaproveitamento das cartas. Comparação em `dialog` sobre a tela, com painel inferior no celular, sem pular para o topo; fecha por botão, Escape ou fundo e devolve o foco ao acionador. O adaptador Android fecha o diálogo antes de navegar pelo botão Voltar.
- **Loja compacta:** preço e produção dividem a linha, com quantidade, status e alvo de toque mantidos; introdução mais curta. A altura total da lista caiu **32,0%** no cenário de teste em 390 × 844. A vista Normal e os lotes ×1/×10/×100/MAX foram preservados.
- **Offline/Android:** cache versionado inclui os módulos; original no shell, futuras faixas sob demanda. Respostas `Range` permitem áudio do cache offline. A preparação Android copia módulos/áudio locais e mantém ID, assinatura e pipeline existentes.

## Arquivos e diretórios

| Área | Arquivos |
| --- | --- |
| Música (novos) | `js/music/catalog.js`, `preferences.js`, `selection.js`, `player.js` |
| Apresentação compartilhada (novo) | `js/world.js`, com os mesmos limites de capítulos e identidades de guardiões |
| Áudio/runtime | `js/audio.js`, `js/core/runtime.js` |
| Ajustes/Jukebox | `js/ui/jukebox.js` (novo), `js/pages/settings.js`, `pages/settings.html` |
| Coleção/Loja | `js/pages/collection.js`, `pages/collection.html`, `js/ui/qol.js`, `js/ui/shop.js` |
| Cena/Arena | `js/pages/home.js`, `js/pages/arena.js` reutilizam capítulos/identidades compartilhados |
| Layout/PWA/nativo | `css/pages.css`, `css/responsive.css`, `sw.js`, `js/native/android.js` |
| Testes (novos) | `tests/music.test.js`, `tests/music_browser.py` |
| Documentação | `AGENTS.md`, `README.md`, `docs/MUSIC_GUIDE.md`, este relatório, `docs/SCREENSHOTS.md` e quatro capturas |

Pastas criadas com `.gitkeep`: `assets/audio/music/general/`, `worlds/`, `bosses/` e `special/`. **Nenhum áudio novo foi gerado ou baixado.** `assets/audio/bmg1.ogg` permanece inalterado. O script `scripts/android-web.mjs` já copiava esses caminhos recursivamente e não precisou mudar.

## Validação executada

Node **24.22.1**, Python Playwright e Chromium headless, servindo `/Lollipop-Clicker-TEST/` para reproduzir os caminhos do GitHub Pages.

| Comando | Resultado |
| --- | --- |
| `npm run check` | **34 arquivos JavaScript e nove documentos HTML** verificados |
| `npm test` | **85 verificações passaram**; 18 novas cobrem catálogo/arquivos, playlists, capítulos, Arena/Manual, preferências, discovery/prestígio, falhas, autoplay, ownership, continuidade e filtros |
| `LOLLIPOP_BASE_URL=http://127.0.0.1:8015/Lollipop-Clicker-TEST/ python3 tests/browser_smoke.py` | **107 verificações passaram**, incluindo saves antigos, economia, navegação/lifecycle, Arena, roleta, prestígio, múltiplas abas, armazenamento e PWA |
| `LOLLIPOP_BASE_URL=http://127.0.0.1:8015/Lollipop-Clicker-TEST/ python3 tests/qol_browser.py` | **122 verificações passaram**, incluindo compras nas duas vistas, quantidades, prévias/boosts, layouts de 280 a 1440 px e offline |
| `python3 tests/artwork_browser.py` | **13 verificações passaram**, incluindo SVG padrão, imagem local válida/ausente/corrompida, cache e offline |
| `LOLLIPOP_BASE_URL=http://127.0.0.1:8015/Lollipop-Clicker-TEST/ python3 tests/music_browser.py` | **62 verificações passaram**, incluindo Jukebox, autoplay/falhas simuladas, capítulos/prestígio, prioridade de batalha/Manual, propriedade entre abas, filtros, comparação sem salto, redução de lista e áudio real em Chromium |
| `npm run android:prepare && node scripts/check-android.mjs` | Nove documentos, módulos/assets locais e ID estável verificados; áudio original e player conferidos no bundle gerado |

O teste musical usa **duas formas de validação**. Mocks de `Audio` e entradas de catálogo injetadas somente no teste exercitam bloqueios/falhas e futuras playlists sem gerar arquivos. Separadamente, o OGG original real foi decodificado no Chromium, avançou seu relógio de mídia, retomou posição aproximada após navegação e reproduziu no PWA offline. As faixas futuras não existem no catálogo de produção e não foram ouvidas/testadas como arquivos reais.

As requisições offline `bytes=0-31` e `bytes=-8` retornaram os dados corretos com HTTP 206; uma faixa de bytes impossível retornou HTTP 416. Não houve erros JavaScript não tratados. Os testes de migração preservaram os três cosméticos independentes e os saves anteriores.

## Limites e preservação

Não houve teste de alto-falantes, aparelhos Android, emulador, Safari ou Firefox; não foi compilado APK nesta tarefa. O evento nativo de pausa/retomada foi exercitado no navegador, não em hardware. O botão Voltar para o novo diálogo tem suporte no adaptador JS e precisa de validação no dispositivo. Também não houve medição de bateria/FPS em hardware antigo.

A biblioteca real tem uma faixa. As alternativas por capítulo/guardião, randomização entre várias músicas e falhas foram verificadas com configurações de teste/mocks; o arquivo novo de cada música futura precisa ser validado quando for acrescentado. A reprodução depende da permissão de áudio do navegador e não é ininterrupta entre páginas. Música opcional precisa ser ouvida online para entrar no cache; ausências offline usam fallback. Preferências bloqueadas/corrompidas não sobrescrevem o save e podem ficar temporárias; exportar o save não exporta preferências musicais.

`js/gameplay.js`, `js/data.js` e `js/storage.js` não foram alterados. Custos, PPS, clique, prestígio, recompensas/HP/recarga da Arena, probabilidades da roleta, IDs, chave/schema do save e arte/registro opcional permanecem iguais. O código nativo Android, package ID, assinatura e workflow de build não mudaram; somente o adaptador JavaScript ganhou fechamento do diálogo ao voltar. Não há compras musicais, moedas, anúncios, tracking ou novas permissões.

## Primeira faixa e capturas

O [guia em português](MUSIC_GUIDE.md) mostra como colocar um arquivo real em `assets/audio/music/worlds/vale-das-engenhocas.ogg`, registrá-lo em `js/music/catalog.js` com `worlds: [2]` e, se desejado, `discovery: { chapter: 2 }`, para o capítulo 3. Não registre o exemplo antes de ter o arquivo.

- [Jukebox Açucarada](screenshots/music/mobile-jukebox.png)
- [Loja compacta](screenshots/music/mobile-shop-compact.png)
- [Coleção com filtros](screenshots/music/mobile-collection-filters.png)
- [Comparação em painel inferior](screenshots/music/mobile-comparison-sheet.png)

Capturas reais de Chromium, 390 × 844, catálogo de produção com uma faixa, movimento reduzido e notificações transitórias ocultas. A navegação fixa aparece na posição da viewport nas capturas de página inteira. O script grava também suas capturas reproduzíveis em `test-results/music/`, ignorado pelo Git.
