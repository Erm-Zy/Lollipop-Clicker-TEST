# Atualizações da web e PWA

O site e a PWA instalada usam o mesmo mecanismo. Nenhum save foi migrado ou apagado nesta mudança. O progresso continua em `localStorage`; o Cache Storage contém apenas arquivos do aplicativo.

## Publicação

1. Trabalhe em `dev`, execute os testes e revise o PR para `main`.
2. **Na primeira publicação desta mudança:** depois de integrar o workflow em `main`, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. O repositório anteriormente publicava os arquivos brutos de `main`; essa modalidade precisa ser substituída. Execute **Web PWA / GitHub Pages** em `main` se necessário. Não altere a origem antes de o workflow estar disponível em `main`.
3. O workflow `.github/workflows/pages.yml` testa e gera `dist/`, depois publica somente esse artefato. Execuções em `dev` e PRs validam o build, sem publicar. Não publique a raiz do repositório: `sw.js` nela é um template deliberadamente não instalável.
4. Confira o deployment e `<URL-do-jogo>/pwa-release.json`. Compare seu `id` com o artefato da execução. A CDN do GitHub Pages pode levar alguns minutos para propagar os arquivos; uma tentativa incompleta é rejeitada e pode ser repetida ao voltar ao jogo após um minuto.

O build `npm run pwa:build` usa apenas APIs nativas do Node 24+. O ID SHA-256 depende dos bytes e nomes dos assets publicados, do template SW e do próprio gerador, sem timestamps. Alterações em HTML/JS/CSS, ícones, fontes, áudio ou imagens mudam a release automaticamente. Documentação/testes/Android não mudam o ID. Não incremente nomes de cache manualmente, nem edite `dist/`. O gerador inclui meta de release nos nove HTMLs e hashes dos bytes finais no worker. `dist/` é ignorado no Git. Um build repetido com os mesmos arquivos gera o mesmo ID.

## Experiência do jogador

- Ao abrir o jogo, voltar ao primeiro plano ou recuperar a conexão, a página verifica o worker; chamadas de rede explícitas têm intervalo mínimo de 60 segundos e nunca rodam em polling. Registro usa `updateViaCache: "none"` e `registration.update()`.
- Uma release completa em espera mostra um aviso em português com **Atualizar agora** e **Depois**. Não toma o foco, possui região de status e botões acessíveis por teclado. Depois adia o mesmo aviso por 15 minutos naquela sessão, inclusive ao navegar; a próxima abertura/volta ao jogo pode reapresentá-lo após esse prazo.
- Atualizar agora pede confirmação técnica de todas as páginas abertas do jogo, inclusive janelas da PWA. Só o escritor atual salva; as outras páginas não escrevem snapshots antigos. A fábrica fica brevemente suspensa, mantendo a reserva de escritor. O tempo decorrido é integrado ao retomar/carregar normalmente.
- Todas as janelas precisam confirmar a preparação e depois armar o reload. Apenas então o worker chama `skipWaiting()`. Cada janela recarrega após `controllerchange` confirmar o ID esperado, com proteção contra loops. Uma nova janela durante a preparação faz a tentativa ser cancelada. Outra janela pode assumir o controle após o reload, respeitando a regra existente de um escritor.
- Falha de save, save protegido/armazenamento bloqueado ou janela sem resposta cancela a troca. Exporte seu progresso em **Ajustes** quando o armazenamento falhar. Janelas suspensas pelo sistema podem precisar ser abertas ou fechadas antes de tentar novamente. Não há reload forçado de uma janela sem resposta.
- Uma página antiga restaurada pelo histórico que já encontra o novo worker ativo recebe um aviso e só recarrega após salvar e confirmar. A primeira instalação não causa reload automático.

## Cache e offline

O worker baixa e verifica os hashes de todo o shell obrigatório antes de concluir a instalação: nove documentos, módulos, CSS, ícones, manifesto, fontes e trilha original. Downloads usam a rede sem cache HTTP e rejeitam arquivos de outra release, inclusive respostas HTTP 200 com conteúdo antigo da CDN. Instalação com erro não substitui o worker funcional. HTML/JS de uma release são servidos em conjunto, sem misturar um HTML antigo com módulos novos. Um arquivo obrigatório perdido do cache só pode ser reparado com bytes do mesmo hash.

O worker não intercepta `sw.js` nem `pwa-release.json`. O navegador pode buscar o novo worker pela rede, mesmo quando o shell atual funciona offline. Imagens opcionais e músicas extras continuam em cache sob demanda, preservando os fallbacks existentes. Após atualizar, mídias opcionais precisam ser aquecidas novamente online.

Na ativação, o worker confirma o cache e chama `clients.claim()`. Só remove caches anteriores de **seu próprio escopo** depois que todas as páginas atuais informam ter carregado o novo documento. A lista de caches antigos já ativados é capturada na ativação e persistida; caches de candidatos em instalação são preservados: um worker antigo nunca apaga o cache de uma instalação futura. Caches alheios, de subaplicações e saves não são removidos. A limpeza é adiada enquanto houver outro worker instalando/em espera e pode ser adiada por uma janela antiga/suspensa e retomada ao voltar ao jogo.

## Verificar uma instalação existente sem apagar dados

1. Na release A, jogue, anote cliques/saldo e deixe o jogo aberto; abra também uma segunda aba de consulta.
2. Publique a release B com o workflow. Volte ao jogo online; após a propagação da CDN e o próximo check, aguarde o aviso. A versão A deve continuar jogável enquanto B espera.
3. Escolha **Depois**: o jogo deve permanecer em A e preservar o progresso, inclusive navegando entre as páginas.
4. Escolha **Atualizar agora** quando o aviso reaparecer. Todas as janelas preparadas devem carregar B uma vez. Confira progresso em Diário/Ajustes e o ID em DevTools (`document.querySelector('meta[name="lollipop-release"]').content`) ou compare o worker com `pwa-release.json` online.
5. Feche e reabra sem rede. Visite Mundo, Loja, Coleção e as demais páginas. O shell e o save devem continuar disponíveis.
6. Para reproduzir falhas/múltiplas releases sem publicar, execute `npm run test:pwa`. Não use “Clear site data”, desregistro manual do SW ou limpeza de localStorage como procedimento de atualização.

**Primeira migração do worker antigo:** páginas antigas ainda não contêm o novo aviso. Abra a instalação online para permitir baixar o worker, depois feche **todas** as abas e janelas/PWAs daquele jogo e reabra. Pode ser preciso aguardar a propagação da CDN e repetir a visita online. Essa etapa única permite a ativação natural, sem limpar dados. A partir daí, releases futuras usam o aviso. Não é possível inserir com segurança listeners novos no JavaScript que uma página antiga já executou.

## Plataformas e limites

- Desktop, navegadores móveis e PWAs instaladas usam as mesmas APIs padrão, em HTTPS ou localhost. Sistemas móveis podem suspender/encerrar workers e janelas; a verificação acontece quando a página volta a executar. Não existe atualização garantida enquanto o aplicativo está encerrado ou sem rede. A política do navegador/OS ainda pode remover armazenamento; mantenha backups exportados.
- **Capacitor Android:** não registra esse worker nem mostra aviso de update web. O APK embarca seus próprios arquivos, atualizados pela instalação de um novo APK com o mesmo ID e assinatura compatível. O SW não atualiza assets nativos. O build Android continua usando os fontes via `android:prepare`, independentemente de `dist/`.
- Os testes automatizados usam Chromium real (incluindo viewport móvel), localhost e subdiretório equivalente ao Pages. Não comprovam execução em Safari/iOS, Firefox, instalação pelo sistema operacional ou aparelho Android físico; verifique essas plataformas antes de declarar suporte validado nelas.

## Reproduzir os testes

```sh
npm ci
npm run check
npm test
npm run pwa:build
# Python 3.12, playwright==1.62.0 e Chromium são ferramentas apenas de testes.
npm run test:pwa                 # servidor temporário, releases A/B/C e worker legado
python3 tests/artwork_browser.py # servidor temporário com arte opcional
npm run serve                   # build + servidor dist em localhost:8000
# Em outro terminal, mantendo esse servidor aberto:
npm run test:browser
python3 tests/qol_browser.py
python3 tests/music_browser.py
python3 tests/prestige_browser.py
```

Use `CHROMIUM_PATH` para escolher o executável. Para testar outro subdiretório manualmente, gere um artefato com `node scripts/build-pwa.mjs --out <pasta-vazia>/Lollipop-Clicker-TEST` e sirva a pasta pai. Os testes de PWA fazem isso automaticamente, simulando também HTTP cache de 600 segundos, respostas inconsistentes da CDN e falhas de save/download.

## Resultado desta implementação

Validação local em 7 de novembro de 2026: `npm ci`, verificação de sintaxe dos 40 arquivos JS e nove documentos, **113 testes Node**, build determinístico e sintaxe do worker gerado concluídos. Em Chromium real passaram **32 cenários PWA**, **107 verificações gerais**, **122 de QoL**, **62 de música**, **60 de prestígio** e **13 de arte opcional** (396 verificações de navegador). Incluem a migração do worker legado, instalação inicial sem reload, adiamento, save com quota bloqueada, confirmação simultânea, janela sem resposta, ativação em duas abas, cache com 404/conteúdo obsoleto, nova tentativa, offline, ausência de loops e isolamento de caches/Capacitor.

`npm run android:sync` e `node scripts/check-android.mjs` também passaram para os nove documentos e assets locais. Isso valida preparação/sincronização do pacote; **não houve compilação de APK nem teste em emulador/aparelho localmente nesta tarefa**. Os testes locais não publicam nem alteram a configuração do Pages; confira a execução do workflow do PR antes da release e realize a troca de Source descrita acima após o merge.
