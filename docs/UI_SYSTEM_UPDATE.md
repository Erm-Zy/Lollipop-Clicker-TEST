# Interface — um mundo de doces para jogar

Implementação na branch compartilhada `dev`; sem merge/publicação. Multipage HTML e runtime único preservados. Nenhuma alteração nas fórmulas, preços, probabilidades, save6, assinatura ou versionCode.

## Mapa de experiência: auditoria e resultado

| Tela | Antes | Agora |
|---|---|---|
| Compartilhado | Dez destinos comprimidos no desktop; Coleção no atalho principal, Pets no Mais; HUD e títulos extensos | Mundo/Loja/Pets/Arena + Mais nas duas navegações; seção secundária indicada; Escape/fora fecham menu, foco volta ao summary. HUD sticky, carteira e estado de save/receita visíveis, sem esconder alertas |
| Mundo | Estágio, cenário e loja visualmente contínuos, ornamentação disputando espaço | Três painéis delimitados, herói compacto no celular, atalhos Loja/Prestígio e Coleção pelo sabor. Cenário e compra rápida continuam completos abaixo; compra rápida usa disclosure no celular |
| Loja | Cartões muito altos, controles de quantidade perdidos no scroll | Lista de compras compacta, quantidade sticky só na Loja, Normal/Compacta preservados, preço/status/capacidade legíveis e botões de44px |
| Pets | Equipe grande antes de qualquer aba | Resumo expansível leve; Ovos/Inventário/Equipe/Descobertas. Equipe, seis estratégias e quatro presets na área própria, com atalho direto; ovos em três tiles e lotes lado a lado. Sair de Ovos conserva a parada do auto |
| Prestígio | Renascer e longas seções sequenciais de melhorias | Resumo/resgate ao lado da galeria das nove categorias reais. Em celular empilha; expansões em grid, sem arestas/pré-requisitos fictícios. PP base/extra/total continuam visíveis; arredondamento em disclosure. Resumo do reset fica junto à ação e explicação completa permanece |
| Arena | Cena com estado implícito nos controles | Guardião central, painel de combate, badge textual pronto/combate/intervalo, dano/HP/prêmio existentes |
| Coleção | Categorias/grade sem visão integrada do conjunto | Quatro slots de aparência/sabor com efeitos reais, grade uniforme, filtros e comparação originais. Save protegido agora desabilita mutações também nesta UI |
| Roleta | Introdução extensa antes da ação | Introdução acessível em disclosure, roda central e superfícies/controles consistentes; chances e regras permanecem |
| Conquistas | Cards altos e letras importantes pequenas | Tiles compactos, rótulos/progresso maiores, estados textuais e filtros originais |
| Diário | Lista única longa | Estatísticas em tiles/duas colunas no desktop e uma no celular, papel creme e contraste corrigido |
| Ajustes | Som e visuais misturados, reset próximo às ações comuns | Grupos separados Som/Música, Visuais/Desempenho, Save/Backup, Jukebox preservada; zona de reset explícita. Exports/recuperação continuam acessíveis |

## Componentes e decisões

- `css/ui-system.css`: tokens de raio/outline/sombra curta e regras responsivas compartilhadas, usando `--ink`, `--violet`, `--cream`, `--gold`, `--mint`, `--accent` existentes. Integra estilos legados sem substituí-los em massa; HTML de todas as páginas opta explicitamente no sistema.
- `js/ui/shared.js`: mesmos `hrefFor`, bootstrap, formatação e subscriptions; menu agrupado reutilizado no desktop/mobile, expansão aria e eventos discretos sem polling. A preferência de movimento reduzido salva também desliga transições CSS, além da preferência do sistema. Um ResizeObserver acompanha a altura do HUD/avisos e evita sobreposição dos controles sticky da Loja, sem listener de scroll.
- Reutilizados: `game-button`, `item-preview`, `item-tile`, `upgrade-row`, arte SVG/fallback, galeria de expansões, dialogs nativos, paginação, canvas de feedback e filtros. Novos: `team-strip`, `page-intro`, `sanctuary-layout`, `upgrade-gallery`, `loadout-panel`, `mode-badge`, `danger-zone`.
- Descrições introdutórias continuam em disclosures acessíveis; avisos de save, ownership e update ficam no fluxo, não dentro de menus. Sem dependências, downloads externos ou animações contínuas novas.
- Android Voltar prioriza Mais antes de fechar disclosures secundários; dialogs continuam tendo prioridade. Apenas esse seletor UI mudou na ponte nativa.
- Resumo da Coleção só reconstrói os quatro slots quando a seleção muda. Galeria/Pets preservam caches e handlers; não há renderer econômico novo. CSS não calcula progresso nem preço.

## Regressões verificadas e ajustes

Os testes antigos passaram a abrir a área Equipe e os bônus expansíveis antes de operar/ler esses controles; nenhuma asserção transacional foi removida. A navegação smoke abre o Mais visível também no desktop. A regressão de compra na Coleção detectou uma referência inválida introduzida no resumo; corrigida sem mexer no motor. Corrigidos texto dos tabs sobreposto, abertura de ovos apertada e contraste das estatísticas. Fixtures de tema são isoladas por contexto, sem escrever por trás de um runtime ativo.

## Validação

`npm run check`, `npm test`, `npm run pwa:build`, `npm run test:pets`, `npm run test:pwa`, `npm run test:browser`, `python3 tests/prestige_browser.py`, `python3 tests/qol_browser.py`, `python3 tests/music_browser.py`, `python3 tests/artwork_browser.py`, `python3 tests/ui_system_browser.py`, `npm run android:sync` e `node scripts/check-android.mjs`. Resultados finais e compilação na entrega. Dependências já instaladas, sem alteração de lockfile.

O teste novo percorre dez documentos em320×568,360×740,390×844,430×932,768×1024,1280×720,1600×900 e740×360; menus, foco, ownership inicial, temas, fluxo Equipe, Coleção real e navegação offline sob `/Lollipop-Clicker-TEST/`. Screenshots reais mobile/desktop em [screenshots/ui-system](screenshots/ui-system), comparação anterior em [SCREENSHOTS.md](SCREENSHOTS.md). Capturas usam Chromium com reduced motion e save isolado; não são mockups.

## Limites e próximos passos

Galeria responsiva de categorias reais, não uma árvore conectada nem um editor de nós. Filtragem, receitas, confirmação e dados extensos continuam disponíveis; não houve overhaul de ilustrações. A tela320×568 exige algum scroll nos controles dos ovos; equipe não bloqueia mais a entrada. A loja rápida continua oferecendo oito tipos; futuras melhorias podem permitir escolher favoritos sem alterar compras. Consolidar estilos legados por componente e refinar uma folha de detalhes selecionados de Prestígio são etapas futuras, não implementadas aqui.

Sem promessa de FPS/bateria, áudio físico, Safari/Firefox, instalação OS da PWA ou teste em aparelho Android a partir de Chromium. Zoom do browser reduz a área útil e usa os mesmos breakpoints; ampliação extrema ainda merece playtest assistivo. Não foram alterados updater, pipeline de assinatura, package ID, versões ou conteúdo de save. Não há APK oficial distribuído por esta tarefa.

## Resultados executados

| Comando / suíte | Resultado |
|---|---|
| `npm run check` | 53 JS / 10 HTML verificados |
| `npm test` | 252 testes passaram |
| `npm run pwa:build` | 61 arquivos obrigatórios / 62 assets, hash automático |
| `python3 tests/ui_system_browser.py` | 360 verificações passaram, oito viewports/sete temas |
| `npm run test:pets` | 89 verificações passaram |
| `npm run test:pwa` | 32 verificações passaram |
| `npm run test:browser` / `python3 tests/browser_smoke.py` | 112 verificações passaram |
| `python3 tests/prestige_browser.py` | 60 verificações passaram |
| `python3 tests/qol_browser.py` | 122 verificações passaram |
| `python3 tests/music_browser.py` | 62 verificações passaram |
| `python3 tests/artwork_browser.py` | 13 verificações passaram |
| `npm run android:sync` + `node scripts/check-android.mjs` | Dez documentos locais e ID estável verificados |
| Gradle `:app:assembleDebug --offline` (JDK21/SDK35) | Build isolado de validação compilado; não é APK oficial de distribuição |

Total850 checks de navegador; nenhum erro JavaScript não tratado nas suítes concluídas. Testes foram executados com Chromium em contextos isolados, sem tocar no save vivo do jogador. Os55 arquivos JS/CSS/páginas do bundle foram conferidos dentro do APK gerado. Não houve execução em Android real/emulador nesta tarefa.

## Revisão manual sugerida

1. Exporte um save real antes de atualizar. Abra `dev` localmente com `npm run serve` (dist gerado); não publique o template SW bruto.
2. Clique/toque no pirulito, navegue pelo sabor e abra a compra rápida no celular; compre na Loja usando×1/×10/×100/MAX e alterne Compacta.
3. Abra Pets, confira Ovos antes da equipe, gerencie presets na área Equipe, volte ao Inventário e teste confirmação/cancelamento de fusão/substituição. Auto deve parar ao sair de Ovos.
4. Revise PP base/extra/total, leia o resumo de reset e cancele/execute um renascimento válido. Confira as nove categorias reais, Arena, comparação de sabor e aparência independente.
5. Abra Mais em paisagem curta, use Escape/Voltar, aumente texto e teste os temas. Confira exports em estado protegido e navegação offline/PWA sem limpar dados. Valide teclado/notches/background em Android real antes de distribuir nova beta assinada pelo workflow existente.

## Arquivos alterados

```text
.github/workflows/pages.yml
AGENTS.md
README.md
css/ui-system.css
docs/UI_SYSTEM_UPDATE.md
docs/screenshots/ui-system/1280-arena.png
docs/screenshots/ui-system/1280-home.png
docs/screenshots/ui-system/1280-pets.png
docs/screenshots/ui-system/1280-prestige.png
docs/screenshots/ui-system/1280-shop.png
docs/screenshots/ui-system/390-arena.png
docs/screenshots/ui-system/390-home.png
docs/screenshots/ui-system/390-pets.png
docs/screenshots/ui-system/390-prestige.png
docs/screenshots/ui-system/390-shop.png
index.html
js/native/android.js
js/pages/arena.js
js/pages/collection.js
js/pages/pets.js
js/pages/prestige.js
js/ui/shared.js
pages/achievements.html
pages/arena.html
pages/collection.html
pages/pets.html
pages/prestige.html
pages/rewards.html
pages/settings.html
pages/shop.html
pages/statistics.html
tests/browser_smoke.py
tests/pets_browser.py
tests/ui_system_browser.py
```
