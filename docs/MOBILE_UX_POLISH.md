# Mundo, cabeçalho e fábrica no mobile

Baseline: `3ed0c40931d77dbd9ce2ade117c9d664d519c159` em dev; main já continha o merge #16 (`9928194`). Dev foi avançada por fast-forward até esse merge, sem mudar main. Nenhum ZIP substituiu fontes. Capturas usam fixtures fresh/mid/late validadas pelo jogo, nunca saves de jogadores.

## Causas verificadas

- **Fábrica invisível:** em 390×844, os oito filhos de `#buildingLots` existiam, mas a regra mobile global de `css/responsive.css` calculava `display:none` no contêiner. Não era falta de conteúdo ou erro JS. O dialog tinha 828px de altura fixa, ampliando o vazio. A regra antiga agora se restringe ao cenário legado; o painel usa grade explícita e altura limitada pelo conteúdo/viewport.
- **Marca incompleta:** o seletor mobile `body:not([data-page="home"]) .brand > span:last-child` escondia deliberadamente o wordmark. A marca mantém agora texto e doce, com tamanho adaptativo e espaço próprio ao lado da carteira. Os quatro elementos do HUD não se sobrepõem nas medições. O status normal ficou mais discreto; ownership e falha de save continuam visíveis e podem ampliar o cabeçalho.
- **Scroll:** nas oito dimensões solicitadas, o baseline do Mundo já tinha scrollHeight igual à viewport. Portanto, não se atribui toda a foto a rolagem DOM. Entretanto, não havia contenção de overscroll na raiz; palco misturava svh, mínimo400/440px e máximo1050px com body mínimo em dvh. Removidos os limites fixos e usado dvh com a altura real do cabeçalho. A raiz ganha contenção; apenas Mundo e fundo de modal são bloqueados. Páginas secundárias continuam rolando. Não há preventDefault global de touchmove nem body fixo.

## Resultado

Minha fábrica permanece útil: **Minhas engenhocas**, oito tiles com ilustração existente, posse, atividade e contribuição real via `buildingContribution`/getters existentes. Não há fórmula nova de produção. Cada tile reutiliza `data-game-panel="shop"` e `data-focus-upgrade`, no mesmo runtime. Unidades ainda não compradas continuam consultáveis. Último capítulo e álbum completo recebem textos coerentes. Feedback de compra não é apagado pelos ticks.

Em 390×844 mid, o painel passou de828px vazio para cerca de695px com as oito engenhocas. O cabeçalho passou de77,59px para cerca de70px, com wordmark visível nas páginas secundárias. Revisão visual: grade de duas colunas no telefone e quatro no desktop; painel rola internamente em telas curtas, botão Fechar permanece sticky. O atalho de fábrica tem alvo mínimo44px. Não foram criadas imagens, dependências, moedas, timers ou outro runtime.

## Evidências e reprodução

[Antes/depois](screenshots/mobile-polish/INDEX.md). São288 superfícies por fase: oito viewports × três saves ×12 superfícies. Mundo, fábrica, Loja/Roleta em modal, Prestígio, Pets, Conquistas, Arena, Receitas, Ajustes, Diário e Loja-documento. Métricas JSON registram scrollHeight/clientHeight/scrollWidth/scrollY, visualViewport, palco, HUD/dock, dialog e geometria/display dos oito tiles. PNGs representam o mesmo save mid e dimensões, incluindo fim de Ajustes.

Tamanhos:320×568,360×740,390×844,430×932,740×360,768×1024,1280×720,1600×900. A suíte nova testa wheel, PageDown/Space, scrollTo e gesto touch nativo CDP; Mundo permanece em scrollY0. Testa wordmark sem sobreposição, controles dentro da tela, fábrica visível, última engenhoca alcançável e abertura da Loja correspondente. Ajustes chega ao último botão acima do dock. Histórico, Escape, Back/Forward, foco, fundo inerte, quota e offline são cobertos também pela suíte HUD existente, inclusive a regressão de close atrasado, preservada.

`npm run pwa:build` e `python3 tests/mobile_polish_browser.py` reproduzem regressões em subpath (saída operacional em test-results). Argumento `after` captura deliberadamente docs; não executar `before` sobre o baseline arquivado. A suíte foi adicionada ao workflow Web antes de publicação. Release/cache continuam automáticas pelo hash dos assets.

## Verificações e limites

Baseline: npm ci/check,307 unitários e build passaram;288 renderizações sem pageerrors. Após a implementação:307 unitários; HUD110, UI379, cartoon155, PWA33, Prestígio60 e regressão mobile1248 checks passaram. Os logs finais/CI e SHA são registrados no PR. Android sync/check passaram; não havia SDK Android local para compilar APK nesta sessão. Compilação, emulador e aparelho físico são resultados distintos.

Chromium headless mede geometria e gestos DOM, não a elasticidade do compositor Safari/iOS nem barras do navegador/OS. Não houve aparelho físico, Safari/Firefox, teclado/notch real ou medição de bateria/FPS. A CSS oferece a contenção suportada; não se promete impedir todos os efeitos nativos de overscroll. Os mesmos viewports retrato/paisagem foram usados; isso não simula completamente transições de barra/IME do sistema.

Preservados schema7/backups, compras/ownership, Pets/auto-fusão, preços25/75PP, progressão, conquistas, música, temas e opções de movimento. App ID, versões, assinatura e `-gpu swangle` intactos. Sem merge, deployment, release ou distribuição de APK.

## Arquivos

- `css/global.css`: limite de overscroll da raiz.
- `css/responsive.css`: seletor legado da grade de fábrica.
- `css/ui-system.css`: palco dvh, fronteiras de modal, HUD e tiles de fábrica.
- `js/ui/shared.js`: classe de palco na raiz, no bootstrap existente.
- `js/ui/panels.js`: título do painel; histórico/foco continuam no controlador original.
- `js/pages/home.js`: informações reais dos oito tiles e textos de marcos.
- `tests/mobile_polish_browser.py`: captura e regressões.
- `.github/workflows/pages.yml`: execução da regressão.
- `docs/MOBILE_UX_POLISH.md` e `docs/screenshots/mobile-polish/`: relatório, índice,24 PNGs e dois JSONs de métricas.
