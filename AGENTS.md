# Lollipop Clicker

Jogo incremental independente em português brasileiro, feito com HTML, CSS e JavaScript simples. O jogador clica, compra máquinas, coleciona sabores/cosméticos e avança por arena, conquistas e prestígio. Há uma versão web/PWA e uma beta Android Capacitor, com o mesmo jogo embarcado.

## Mapa rápido

- `index.html` e `pages/*.html`: dez documentos reais; seus controladores ficam em `js/pages/`. Navegação usa links normais, não abas ocultas de uma SPA.
- `js/data.js`: IDs, preços e constantes da economia. `js/progression.js`: marcos, progresso da jornada, multiplicadores, custos em PP e capacidades. `js/gameplay.js`: ações/transações e produção.
- `js/storage.js`: schema 6, validação e backups de `lollipopSave`; v5 bruto em `lollipopSave.legacy-v5` e v4 em `lollipopSave.legacy-v4`. Migração nunca repete o reset histórico de beta: legados incompatíveis/dados de pets desconhecidos ficam protegidos para exportação. Leia `docs/PETS_UPDATE.md`. `js/core/runtime.js`: relógio, ownership, autosave e lifecycle compartilhados.
- `js/pets/`: catálogo de três ovos/18 espécies, IDs, bônus, ações transacionais, inventário paginado, fusão explícita/em lote com reserva, quatro conjuntos e auto apenas em primeiro plano. `pages/pets.html` / `js/pages/pets.js` usam o mesmo bootstrap; não adicione um segundo escritor.

- `css/ui-system.css`: sistema de interface compartilhado (HUD, navegação, painéis, estados e responsividade). Leia `docs/GAME_HUD_REDESIGN.md` e `docs/UI_SYSTEM_UPDATE.md`; `python3 tests/ui_system_browser.py` valida resoluções, menus, temas e subpath/offline. Pets usa quatro áreas, com Equipe separada.
- `js/ui/art.js`: ilustrações SVG atuais. `js/ui/assets.js`: registro opcional de PNG/WebP locais e fallback. Leia `docs/ART_GUIDE.md` antes de integrar desenhos.
- `js/ui/shared.js`: HUD/navegação/notificações. `js/ui/panels.js` controla dialogs/histórico no Mundo; `js/ui/wheel.js` recebe o runtime existente, nunca cria outro. `js/format.js` é a política canônica de apresentação (custos com arredondamento para cima e aria exata); não use abreviações no motor. Receitas mantém a rota técnica `collection`. `css/`: paleta, temas, layout e animações atuais. Fundo, partículas e aparência são escolhas independentes; sabores dão bônus.
- `js/world.js`: capítulos e identidade dos guardiões compartilhados com a cena e a música; não duplique os limites 0/5/25/100.
- `js/music/`: catálogo local, preferências/descobertas e player de um único elemento. `js/audio.js` preserva os efeitos sintetizados; Jukebox nos Ajustes. Leia `docs/MUSIC_GUIDE.md` para adicionar faixas reais.
- `assets/images/`: desenhos futuros; não renomeie imagens existentes. Ícones atuais também existem na raiz. Áudio em `assets/audio/`.
- `sw.js`: template do worker; `js/pwa/update.js`: aviso e coordenação de updates. `scripts/build-pwa.mjs` gera `dist/` com release automática; leia `docs/PWA_UPDATES.md`. `scripts/android-web.mjs`: copia páginas/JS/CSS/assets para `www/`; `android/` usa esse diretório após `npm run android:sync`. Não edite os assets gerados para fazer uma mudança permanente.

## Regras de desenvolvimento

1. Preserve mecânicas, IDs de conteúdo, progresso e saves. Nunca zere dados para simplificar uma alteração. O reset histórico de beta não se aplica às migrações atuais. Preserve originais e bloqueie escritas quando a validação/backup falhar; novos resets exigem autorização explícita.
2. Mantenha o desenho visual atual, salvo pedido explícito de mudança.
3. Prefira JS, HTML e CSS simples; evite frameworks/dependências desnecessários.
4. Preserve compatibilidade com navegador, Android, GitHub Pages em subdiretório e uso offline.
5. Mantenha textos do jogador em pt-BR e não altere arquivos sem relação com a tarefa.
6. Arte só é ativada quando configurada no registro. Preserve proporção e SVG de fallback; nunca crie requisições automáticas para nomes de arquivos imaginados.
7. Nunca registre músicas inexistentes nem altere o schema de progresso por preferências musicais. Preserve o ownership da aba e o cache de áudio sob demanda.
8. Pets usam cinco canais aditivos centralizados nos getters; PP extra tem ledger validado, capacidade equipada só ativa unidades enquanto equipada (não apague excedentes). Leia `docs/BALANCE_REWORK.md`. Alterações de equipe/fusão integram a produção antiga antes. Operações de valor usam `runtime.act(..., { requireSave: true })`; preserve favoritos/bloqueios, cinco fontes distintas, consentimento para equipados e progressão após prestígio. Auto deve parar com pausa/ocultação/ownership/update e nunca simular hatches offline.
9. Verifique alterações com os testes existentes. Ao mudar assets, gere e teste `dist/`; o hash de release é automático, nunca incremente cache manualmente; não altere pacote/assinatura Android sem motivo.

## Validação

- `npm run check` e `npm test` sempre. `npm run test:pets` inicia servidor temporário e testa a expansão inteira, incluindo PWA/rollback/bundle Android. `npm run balance` e `node scripts/simulate-pets.mjs` reproduzem o antes/depois com fixture v5, políticas e Monte Carlo. `npm run test:pwa` testa instalação, espera, falhas, offline e coordenação de janelas com workers reais. `npm run serve` gera e serve `dist/`; não publique o template SW bruto. `node scripts/simulate-prestige.mjs` reproduz os cenários de balanceamento; não altere custos/multiplicadores na UI.
- `python3 tests/prestige_browser.py` (servidor local aberto): PP, melhorias, capacidades, rollback, migração/reset e layouts. Gastos em PP e renascimento usam `runtime.act(..., { requireSave: true })`.
- `python3 tests/game_hud_browser.py` inicia seu servidor e valida o HUD, painéis, foco, compras, roleta, proteção e subpath/offline. `python3 tests/game_hud_capture.py after` gera métricas em 216 estados de layout e screenshots; não sobrescreva o diretório `before` em mudanças futuras.
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
