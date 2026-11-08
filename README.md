# Lollipop Clicker 3.0 — Um mundo vivo de doces

Clique em um pirulito, invente engenhocas e transforme uma colina de açúcar em um reino. A versão 3.0 troca o painel da versão anterior por um jogo de fantasia com ilustrações SVG originais, produção visível, animações leves e páginas HTML independentes. Todo o conteúdo para jogadores é em português brasileiro.

O jogo continua sendo uma aplicação estática de HTML, CSS e JavaScript puro: sem framework, dependência de execução ou servidor de contas. Um build leve em Node gera o artefato web e o identificador determinístico das atualizações PWA.

## Jogar e desenvolver

```sh
npm run serve
# abra http://127.0.0.1:8000
```

Use Node 24+; `npm run serve` gera `dist/` antes de servir. O servidor de desenvolvimento usa Python 3 e escuta somente no localhost. Sirva por HTTP; abrir arquivos diretamente por `file://` não permite módulos ES, persistência por origem ou service worker de maneira confiável.

Publique **`dist/`**, gerado por `npm run pwa:build`, como pasta estática pelo workflow de GitHub Actions. Caminhos relativos e URLs derivadas de `import.meta.url` funcionam no subdiretório do GitHub Pages, inclusive ao entrar diretamente em `pages/arena.html`. `.nojekyll`, ícones, música e configurações de hospedagem existentes foram preservados.

## Um mundo para explorar

| Documento real | O que acontece nele |
| --- | --- |
| `index.html` | Pirulito interativo, saldo, clique, produção, bônus, mundo ilustrado e compra rápida |
| `pages/shop.html` | Oito engenhocas originais, níveis, contribuição e lotes ×1/×10/×100/MAX |
| `pages/pets.html` | Três ovos, 18 espécies, equipe de três pets, inventário de 500, fusões e álbum permanente |
| `pages/collection.html` | Inventário de 11 sabores e sete coleções; pirulito, fundo e partículas independentes |
| `pages/arena.html` | Três guardiões ilustrados alternados, dano por toque, prazo, vitória e recarga |
| `pages/prestige.html` | Progresso da jornada, renascimento, Pontos de Prestígio, Ímpeto Estelar e expansões permanentes |
| `pages/achievements.html` | Álbum das 13 conquistas, categorias, progresso e estado de desbloqueio |
| `pages/statistics.html` | Diário da aventura com as estatísticas de produção e progresso |
| `pages/rewards.html` | Roleta persistente e bônus grátis de produção/clique |
| `pages/settings.html` | Música, efeitos, partículas, movimento do mundo e recuperação de saves |

Os locais são links reais, com URLs e histórico do navegador. Não são seções escondidas de um único HTML. No celular, Mundo, Loja, Coleção e Arena ficam na barra inferior; **Mais** abre os outros locais.

O pirulito reage a mouse, toque e Espaço/Enter. As ilustrações mudam conforme o sabor e a aparência equipada. As máquinas têm identidade própria, engrenagens animadas e detalhes adicionais a partir de dez e cem unidades. O cenário avança em quatro capítulos conforme a coleção de máquinas cresce (0, 5, 25 e 100 unidades). Cristais de açúcar dourado aparecem em janelas curtas durante o jogo; precisam ser coletados, não são uma recompensa automática.

## Regras e economia

- **Catálogos preservados:** oito upgrades, onze sabores, sete coleções visuais e treze conquistas, com IDs, custos base, bônus e condições originais. Saves anteriores mantêm o conteúdo comprado.
- **Preço:** cada unidade custa `floor(custoBase × 1,15 ^ quantidadePossuída)`. Um lote é a soma dos preços individuais, cada um arredondado separadamente. ×10 e ×100 exigem saldo para o lote inteiro. MAX compra exatamente o maior prefixo acessível. O débito e o aumento de quantidade acontecem juntos.
- **Produção:** a soma das máquinas recebe o bônus do sabor ativo, do prestígio e de boost. Toda compra ou troca integra o ganho anterior antes de alterar a taxa. Os bônus de prestígio e Ímpeto são aplicados uma única vez a cliques, produção, prévias e ausência.
- **Ausência:** até oito horas de produção por intervalo offline, dividindo o cálculo no vencimento de boosts. Uma aba oculta também usa tempo decorrido. Tempo fora da página não conta como tempo jogado. Saves sem timestamp não recebem duração inventada.
- **Prestígio:** `floor(cbrt(totalHistórico / 1.000.000))` é o total de níveis conquistáveis. Só níveis ainda não resgatados são concedidos. Cada nível mantém +15% de produção/clique e concede 1 Ponto de Prestígio gastável. Ímpeto Estelar multiplica o bônus base; expansões aumentam a capacidade individual. Gastar pontos não reduz nível nem marcos resgatados. Reinicia saldo, máquinas, batalha e bônus temporários; preserva pontos, melhorias, sabores, cosméticos, conquistas, estatísticas e cooldowns. Um giro pendente precisa terminar primeiro.
- **Arena:** HP inicial 100, multiplicado por 1,6 a cada vitória; trinta segundos reais para vencer. Apenas cliques dentro do prazo causam dano. Vitória concede 15× HP máximo. Há trinta segundos de descanso após vitória ou fim do prazo; o cooldown persiste em outras páginas e no reload.
- **Roleta:** seis resultados igualmente prováveis, um giro grátis a cada cinco minutos, como na versão 2.0. Percentuais usam o saldo no início do giro, com mínimo de cem pirulitos. O raro acrescenta cem ao clique até o próximo prestígio. O resultado e o cooldown são salvos antes da animação, cujo ponteiro indica esse mesmo resultado. Navegar ou recarregar não permite sortear novamente ou receber duas vezes.
- **Bônus grátis:** produção e cliques 2× por trinta segundos, com recarga de cinco minutos. É um bônus do jogo, sem anúncio fictício ou SDK publicitário. Boosts da roleta podem estender um bônus ativo.
- **Açúcar dourado:** uma oportunidade a cada sessenta segundos, com janela de doze segundos. Coletar concede `max(25, PPS base × 30)`. Eventos expirados ou perdidos offline não acumulam nem pagam sozinhos.

A área “Nova Dimensão” da versão 2.0 era somente um aviso de desenvolvimento. A versão 3.0 dá lugar a um mundo de produção que de fato evolui; nenhuma mecânica funcional foi retirada para simplificar a navegação.

## Arquitetura

```text
index.html / pages/*.html   Documentos independentes com estrutura específica
css/global.css             Tipografia, paleta, temas e controles comuns
css/navigation.css         Navegação do mundo e barra inferior
css/game.css                Cena principal e compra rápida
css/pages.css               Inventário, arena, santuário, álbum e diário
css/animations.css          Movimento opcional e redução de movimento
css/responsive.css          Layouts específicos para desktop/tablet/celular
js/data.js                  Catálogos, constantes e versão do save
js/gameplay.js              Ações, tempo, compras, eventos e produção
js/progression.js           Jornada, PP, multiplicadores permanentes, capacidades e contagem de fábricas
js/pets/*.js                Catálogo, IDs, bônus, hatches, inventário, fusões, auto e SVGs
js/storage.js               Validação, migração, backups e recuperação
js/core/runtime.js          Único relógio, escritor, lifecycle, áudio e eventos
js/ui/shared.js             Navegação, HUD, avisos e bootstrap compartilhado
js/ui/art.js                Pirulitos, máquinas, cenários e chefes SVG originais
js/ui/shop.js               Componente reutilizável de compra e lotes
js/ui/qol.js                Prévias e estimativas de interface sem mutar progresso
js/pages/*.js               Somente o controlador do documento visitado
js/world.js                Capítulos/guardiões compartilhados pela cena e pela música
js/music/*.js              Catálogo, descobertas, preferências e player musical
js/ui/jukebox.js            Biblioteca musical dentro dos Ajustes
js/audio.js / effects.js    Som e partículas sob demanda
sw.js / js/pwa/update.js    Instalação verificada e atualização coordenada entre janelas
scripts/build-pwa.mjs       Release por hash e artefato web dist/
```

O runtime recebe regras sem DOM e coordena o estado de cada documento. Cada página cria apenas seu próprio controlador. Um tick de 200 ms atualiza o HUD visível; ele não define o valor da produção. Animações visuais usam CSS ou `requestAnimationFrame`, sem manter um loop de canvas vazio. Partículas têm limite de sessenta e resolução em pixels CSS. Desative partículas e movimento do mundo separadamente nos Ajustes; `prefers-reduced-motion` também é respeitado. A música original `assets/audio/bmg1.ogg` começa após interação e pausa em segundo plano; efeitos usam Web Audio com limpeza dos nós.

## Continuidade do save

A chave principal permanece **`lollipopSave`**. O schema **6** mantém o progresso v5, acrescenta o ledger de PP extras, reserva e conjuntos de pets. O primeiro v5 bruto fica em **`lollipopSave.legacy-v5`**, com confirmação de escrita obrigatória; o backup v4 continua preservado. Não há reset nem cobrança retroativa. Fábricas extras possuídas ficam inativas ao retirar capacidade equipada e não são apagadas. [Regras, migração e resultados do balanceamento](docs/BALANCE_REWORK.md).

- O primeiro save original é preservado em `lollipopSave.legacy-v1`; o primeiro schema 2 em `lollipopSave.legacy-v2`. O schema 3 usa `lollipopSave.legacy-v3`; um reset autorizado preserva o original em `lollipopSave.pre-prestige-v4`. São backups brutos imutáveis da migração.
- `lollipopSave.backup` guarda a escrita completa anterior. Escritas são feitas a cada cinco segundos, ao ocultar/sair da página, antes de navegar e após transações importantes.
- O runtime usa **Web Locks**, quando disponível, para permitir um único escritor entre os documentos e abas da origem. O fallback usa uma concessão curta em localStorage, conferida antes de ações e saves. A página antiga libera o controle em `pagehide`; ao voltar pelo histórico/BFCache, recarrega o estado atual antes de retomar.
- Uma segunda aba fica em consulta. Pode navegar e exportar, mas não compra, clica ou recebe recompensas. Para assumir o jogo, feche a aba ativa e recarregue. Mudanças externas também impedem que um escritor desatualizado sobrescreva progresso.
- JSON inválido, formato desconhecido, versão futura e erros de armazenamento não apagam dados. Se houver backup válido, ele pode ser consultado com autosave bloqueado. Use Ajustes para exportar o conteúdo bruto ou restaurar explicitamente um backup.
- Importação e restauração exigem confirmação e preservam o conteúdo anterior em `lollipopSave.recovery`. Começar do zero exige duas confirmações.
- Armazenamento completamente bloqueado permite jogar temporariamente e exportar o estado em memória; giros que exigem uma reserva persistida ficam indisponíveis.

O save continua local ao navegador/origem, sem conta online. Não há autoridade de servidor ou proteção contra edição manual do relógio e do localStorage. Exporte backups para trocar de aparelho. Não compartilhe o mesmo save simultaneamente com uma versão antiga aberta em outra aba.

## Testes e revisão

```sh
npm run check          # sintaxe de todos os módulos e verificação dos HTMLs
npm run test:pets       # cenários completos Pets/PWA/bundle Android com servidor temporário
npm test               # regressões de regras, economia e armazenamento (Node24+)
npm run test:browser   # Chromium real; mantenha o servidor aberto em outro terminal
```

O teste de navegador usa Python3, `playwright` e Chromium instalado. O jogo não depende dessas ferramentas. Configure `CHROMIUM_PATH` se o executável não for `/usr/bin/chromium`. Para repetir o teste em subdiretório, gere o artefato em uma pasta `Lollipop-Clicker-TEST`, sirva a pasta pai por HTTP e configure `LOLLIPOP_BASE_URL` com o caminho completo (por exemplo, `http://127.0.0.1:8001/Lollipop-Clicker-TEST/`). Veja também o cabeçalho de `tests/browser_smoke.py`. Capturas de Mundo, Loja e Arena em desktop e celular ficam em `test-results/v3/` (ignorado no Git).

A fixture `tests/fixtures/v2-save.json` representa o schema real anterior, incluindo pirulito/fundo/partículas distintos e prestígio resgatado. Os testes cobrem esse save, todos os prêmios, preços de lotes, produção, deadlines, recuperação, múltiplas abas, navegação e histórico, páginas offline e caminhos sob um subdiretório de GitHub Pages. [Resultados e limites da validação](docs/VALIDATION.md). Veja também as [capturas de Mundo, Loja e Arena](docs/SCREENSHOTS.md). A [auditoria original](docs/AUDIT.md) registra os problemas encontrados antes da versão 2.0.

## Atualização do PWA

O build identifica automaticamente cada release pelos assets publicados. O worker só instala um shell completo com hashes verificados. Um aviso acessível oferece **Atualizar agora** e **Depois**; o jogo salva com segurança e coordena as janelas antes de ativar e recarregar. Offline e saves são preservados.

O site publica o artefato pelo workflow de GitHub Actions. A configuração inicial e a migração de instalações com worker legado estão no [guia de PWA](docs/PWA_UPDATES.md); instalações antigas podem precisar fechar todas as janelas uma vez, sem limpar dados. A expansão de Pets usa esse mesmo mecanismo, sem substituir o worker. O APK Capacitor continua sendo atualizado por novo APK; o service worker não atualiza seus arquivos embarcados.

## Beta Android

O suporte Android usa Capacitor7, com ID `com.ermzy.lollipopclicker`, assets embarcados e versão inicial `3.0.0-beta.1`. O site continua funcionando sem instalar dependências nativas. Veja [instalação, migração de saves, assinatura e build](docs/android/BETA.md). O workflow `.github/workflows/android-apk.yml` valida PRs sem distribuir APK e gera betas oficiais somente por execução manual na `dev`, com os quatro secrets obrigatórios e versionCode reservado em tags internas. Não publica na Google Play.

## Desenhos feitos à mão

Artes futuras em PNG/WebP ficam em `assets/images/`, organizadas por pirulitos, máquinas, chefes, fundos, efeitos, interface e app. A ativação é opcional e centralizada em `js/ui/assets.js`; sem imagem configurada, os SVGs atuais continuam iguais. Veja o [guia para a artista](docs/ART_GUIDE.md) e as [instruções de desenvolvimento e política da branch dev](AGENTS.md).

## Qualidade de vida no celular

A oficina oferece vista normal ou compacta, mantendo ×1/×10/×100/MAX e mostrando disponibilidade e estimativas passivas quando confiáveis. Na Coleção, consulte todos os bônus e compare um sabor sem comprar ou equipar; na Arena, confira a recompensa antes de lutar. A preferência `lollipopUI.shopView` fica separada do progresso. [Mudanças, testes e limites](docs/QOL_UPDATE.md) · [Capturas](docs/SCREENSHOTS.md).


## Jukebox Açucarada

Em Ajustes, escolha **Original**, **Aleatório**, **Mundo dinâmico** ou **Manual**, ajuste o volume e selecione músicas descobertas. O catálogo registra apenas `assets/audio/bmg1.ogg` por enquanto; os outros modos têm fallback para ela. Novas faixas locais podem ser atribuídas a capítulos e guardiões, com descobertas preservadas após o prestígio, separadas do save. A música pausa em segundo plano e respeita a aba ativa; a navegação restaura a posição aproximada quando o navegador permite.

A Coleção agora tem filtros e comparação em painel sobre a tela, sem pular para o topo. A Loja compacta concentra preço/produção e reduz a introdução; a vista normal foi mantida. [Como acrescentar músicas e um tema ao capítulo 3](docs/MUSIC_GUIDE.md) · [Resultados e capturas desta atualização](docs/MUSIC_UPDATE.md).


## Prestígio estratégico

O Santuário oferece Ímpeto Estelar (20 níveis, +5% por nível, custos 1–20 PP) e expansões individuais (+10 espaços, custos 2/4/…/20 PP, dez níveis). Capacidades base: **40/25/25/15/15/15/20/20**, na ordem das oito fábricas. A Loja mostra quantidade/capacidade e mantém lotes inteiros; MAX respeita saldo e espaço. A barra mede a produção desde o último renascimento e volta a 0%, preservando o total histórico. [Balanceamento, migração, simulações e testes](docs/PRESTIGE_BALANCE.md).

## Pets e ovos

No **Ninho açucarado**, abra lotes ×1/×2/×3 do Ovo Açucarado (1.500), Cristalizado (1.000.000) e Celestial (5.000.000.000 pirulitos), com chances transparentes. As mesmas 18 espécies oferecem clique, PPS, combate, PP futuro e capacidade equipada conforme seu ovo. Três slots, 500 instâncias e 72 descobertas permanecem. Fusão em lote com reserva e prévia, substituição direta, seis estratégias e quatro conjuntos reduzem o atrito. Auto gratuito apenas em primeiro plano, sem hatches offline. Pets e desbloqueios sobrevivem ao prestígio. [Guia](docs/PETS_UPDATE.md) · [Balanceamento e métricas](docs/BALANCE_REWORK.md). Rode `npm run balance` para o relatório reproduzível.

## Interface do mundo de doces

HUD compacto, navegação Mundo/Loja/Pets/Arena + Mais, Equipe separada no Ninho e galeria das melhorias reais de Prestígio. [Mapa de UX, componentes, screenshots e limites](docs/UI_SYSTEM_UPDATE.md). Teste dedicado: `python3 tests/ui_system_browser.py` após `npm run pwa:build`.
