# Lollipop Clicker

Jogo incremental independente em português brasileiro, feito com HTML, CSS e JavaScript simples. O jogador clica, compra máquinas, coleciona sabores/cosméticos e avança por arena, conquistas e prestígio. Há uma versão web/PWA e uma beta Android Capacitor, com o mesmo jogo embarcado.

## Mapa rápido

- `index.html` e `pages/*.html`: nove documentos reais; seus controladores ficam em `js/pages/`. Navegação usa links normais, não abas ocultas de uma SPA.
- `js/data.js`: IDs, preços e constantes da economia. `js/progression.js`: marcos, progresso da jornada, multiplicadores, custos em PP e capacidades. `js/gameplay.js`: ações/transações e produção.
- `js/storage.js`: schema 4, validação, migração e backups de `lollipopSave`. Saves antigos dentro das capacidades migram com pontos históricos; quantidades antigas incompatíveis têm reset único autorizado nesta atualização, com backup `lollipopSave.pre-prestige-v4`. Consulte `docs/PRESTIGE_BALANCE.md`. `js/core/runtime.js`: relógio, ownership entre abas, autosave e lifecycle compartilhados.
- `js/ui/art.js`: ilustrações SVG atuais. `js/ui/assets.js`: registro opcional de PNG/WebP locais e fallback. Leia `docs/ART_GUIDE.md` antes de integrar desenhos.
- `js/ui/shared.js`: HUD/navegação/notificações. `css/`: paleta, temas, layout e animações atuais. Fundo, partículas e aparência são escolhas independentes; sabores dão bônus.
- `js/world.js`: capítulos e identidade dos guardiões compartilhados com a cena e a música; não duplique os limites 0/5/25/100.
- `js/music/`: catálogo local, preferências/descobertas e player de um único elemento. `js/audio.js` preserva os efeitos sintetizados; Jukebox nos Ajustes. Leia `docs/MUSIC_GUIDE.md` para adicionar faixas reais.
- `assets/images/`: desenhos futuros; não renomeie imagens existentes. Ícones atuais também existem na raiz. Áudio em `assets/audio/`.
- `sw.js`: cache offline da web. `scripts/android-web.mjs`: copia páginas/JS/CSS/assets para `www/`; `android/` usa esse diretório após `npm run android:sync`. Não edite os assets gerados para fazer uma mudança permanente.

## Regras de desenvolvimento

1. Preserve mecânicas, IDs de conteúdo, progresso e saves. Nunca zere dados para simplificar uma alteração. A exceção de reset para saves beta incompatíveis com as capacidades do schema 4 foi autorizada somente para esta atualização; futuros resets continuam exigindo autorização explícita.
2. Mantenha o desenho visual atual, salvo pedido explícito de mudança.
3. Prefira JS, HTML e CSS simples; evite frameworks/dependências desnecessários.
4. Preserve compatibilidade com navegador, Android, GitHub Pages em subdiretório e uso offline.
5. Mantenha textos do jogador em pt-BR e não altere arquivos sem relação com a tarefa.
6. Arte só é ativada quando configurada no registro. Preserve proporção e SVG de fallback; nunca crie requisições automáticas para nomes de arquivos imaginados.
7. Nunca registre músicas inexistentes nem altere o schema de progresso por preferências musicais. Preserve o ownership da aba e o cache de áudio sob demanda.
8. Verifique alterações com os testes existentes. Ao mudar módulos/arte do shell, ajuste o cache PWA quando necessário; não altere pacote/assinatura Android sem motivo.

## Validação

- `npm run check` e `npm test` sempre. `node scripts/simulate-prestige.mjs` reproduz os cenários de balanceamento; não altere custos/multiplicadores na UI.
- `python3 tests/prestige_browser.py` (servidor local aberto): PP, melhorias, capacidades, rollback, migração/reset e layouts. Gastos em PP e renascimento usam `runtime.act(..., { requireSave: true })`.
- `npm run serve` + `npm run test:browser` para mudanças de UI, navegação ou runtime (Python Playwright + Chromium; confira o cabeçalho do teste).
- `python3 tests/music_browser.py` e `python3 tests/qol_browser.py` (servidor local aberto) para música, filtros, comparação e Loja. O teste musical usa mocks e decodificação Chromium real; não prova saída de som/aparelho Android.
- `python3 tests/artwork_browser.py` (inicia um servidor localhost temporário) para o fallback de imagens opcionais.
- `npm ci`, `npm run android:sync` e `node scripts/check-android.mjs` para conferir o pacote Android; com JDK21/SDK instalado, `cd android && ./gradlew :app:assembleDebug`.
- Declare somente os testes que executou. Não confunda Chromium, compilação de APK e execução em aparelho/emulador.

## Git Branch Policy

- `main` é a produção estável. **`dev` é a única branch compartilhada de desenvolvimento.**
- Antes de editar, confira `git status`, branch atual e mudanças remotas. Sincronize com segurança (`git fetch origin`; em `dev`, `git pull --ff-only` se estiver limpa).
- Se `dev` não existir, crie-a uma única vez a partir da `main` remota atual. Se existir, reutilize-a.
- Não crie uma branch para cada tarefa, feature, bug ou sessão. Alterações futuras devem ir para `dev` por padrão.
- Preserve o trabalho de outros contribuidores. Nunca faça force-push, reset ou sobrescrita; se houver divergência/edições locais, examine-as antes de integrar.
- Leve mudanças testadas de `dev` para `main` somente quando estiverem prontas para uma release; não faça merge/publicação sem autorização.
- Se a plataforma impuser branches isoladas, não contorne restrições: reutilize ou direcione o trabalho a `dev` onde permitido e explique a limitação.
