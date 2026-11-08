# Smoke Android: evidência e investigação

O job `android-smoke` é isolado, sem secrets de distribuição e sem artifact APK. API35/x86_64/google_apis; Wi-Fi/dados desativados antes de abrir o app. São três testes independentes: dez documentos offline através dos links/More visíveis; Voltar Android de Loja para Mundo; cliques com delta exato persistido após navegação, background/resume e relançamento da Activity. Relançamento de Activity não simula morte forçada do processo.

## Evidência inicial

Execução 42433588369, job 128587561097, commit 33a89ac: console do emulador falhou às 01:20:22Z; instrumentação iniciou às 01:20:27Z; teste marcado como falho às 01:21:12Z; dispositivo indisponível na limpeza às 01:21:22Z. O log não contém a exceção original. Download do artifact antigo pela sessão retornou 403; não foi possível recuperar mais evidência. Push e PR são invocações separadas do mesmo commit, não prova de duas causas.

**Causa original ainda não comprovada.** Sumiço do dispositivo é confirmado; não se concluiu se ocorreu antes de uma asserção ou depois dela. Fragilidades verificadas do teste antigo: `ready()` aceitava qualquer documento writable, sleeps fixos e scripts sem tratamento contextual. Nenhum defeito de produção foi confirmado; gameplay/runtime, UI, assinatura e versão não foram alterados.

## Mudanças e limites

Esperas agora verificam WebView existente, documento esperado, readyState completo, bootstrap/writable e HUD, até 30 s. Callback JS tem limite 5 s, distingue exceção/selector/callback; erro não é aceito como sucesso. Navegação abre More quando necessário e usa âncoras reais; não injeta `location` como atalho. Marcadores `LollipopSmoke STAGE/READY` contêm só rota/estado/HUD, nunca save bruto.

Pré-compilação ocorre antes de iniciar o emulador, reduzindo competição durante o teste. Boot sem snapshots, dois cores/RAM 2048 explícitos; Gradle limitado a dois workers. Não há retries de asserções nem supressão de crashes. Esses são controles de reprodutibilidade/recursos, não uma causa comprovada de queda do emulador.

## Artifact sempre enviado

`android-webview-test-report` inclui:

- `reports/androidTests/`: HTML.
- `outputs/androidTest-results/`: XML JUnit e outputs disponíveis.
- `android-smoke/gradle.txt`: saída/asserção original sem progress bars.
- `live-logcat.txt`: tags de etapas, AndroidRuntime, chromium, erros Capacitor, crash/lmkd, capturados durante o teste para sobreviver ao desaparecimento do dispositivo.
- `logcat.txt`, `devices.txt`, `devices-after-runner.txt`: snapshots antes/depois da limpeza, com indicação de indisponibilidade.
- `processes.txt`, `memory*.txt`, `result.txt`: processos por nome/uso de memória, sem argumentos/env; fase e exit code preservado.

A coleta usa trap dentro do runner, antes do teardown. Falhas de diagnóstico não substituem o exit code original. Se nem o script iniciou, `phase=emulator-runner-not-entered` permanece. Não há dump de localStorage, UI completa, dados pessoais, keystore ou env. Todos os dados são do sandbox descartável de teste.

## Próxima execução / triagem

Faça push para `dev` ou synchronize do PR existente; compare execuções `push` e `pull_request` do **mesmo SHA**. O job valida APK/instrumentação antes de iniciar API35. Não execute distribuição manual para testar smoke.

Em falha, baixe o artifact do job correto. Primeiro leia XML/Gradle e último `STAGE/READY`, depois `live-logcat.txt`: JavaScript/selector/timeout aponta à etapa do teste; AndroidRuntime/FATAL ou tombstone aponta a crash; `lmkd`/processo qemu ausente/ADB morto sem falha de app exige investigar infraestrutura. `result.txt` sem início de instrumentação aponta a setup/boot. Ausência de logcat com device morto é indisponibilidade, não evidência de sucesso.

Ambiente local sem emulador/KVM: compilação de APKs e testes host não comprovam execução WebView. A conclusão da correção depende de instrumentação API35 no CI. Nunca declare o problema resolvido apenas porque o build passou.

Primeira revisão de CI (5b4dbc4): push/PR interromperam no setup, antes de iniciar emulador, com `sdkmanager: command not found`. A pré-compilação movida para fora do emulator-runner precisa de `setup-android` explícito; ordem corrigida. Isso não é uma nova evidência sobre a queda original do dispositivo.

## Evidência recuperada na execução API35

O artifact 13600385644 da execução PR 42436654720 (2378a47) foi recuperado pelo conector GitHub, apesar do 403 do download direto. `live-logcat.txt` registra READY home às 02:05:14Z, READY shop às 02:05:16Z e STAGE navigate home. O processo QEMU não aparece no snapshot antes do teardown; ADB sem dispositivo. Não foi registrado FATAL EXCEPTION do app. JUnit contém failure vazio por perda da instrumentação. Isso confirma desaparecimento do emulador, mas não estabelece o motivo da saída. O push 42436650129 também falhou nessa rodada.

Há avisos Chromium de limites de memória de tiles antes da navegação. Desativar Vulkan é um experimento isolado de backend gráfico (mesmo API35, imagem e asserções), não diagnóstico definitivo; coleta host-kernel procura indícios de crash/OOM. Nenhum código do jogo foi alterado para esconder o problema. Se continuar falhando, comparar última etapa, versão/backend do emulador, host-kernel e saída do QEMU, mantendo a validação pendente.

## Resultado do experimento e verificações

Commit `f06614e`: tanto [push 42437262170](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437262170) quanto [PR 42437267816](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437267816) falharam na instrumentação; validate passou e distribute foi ignorado. Desativar Vulkan não resolveu: o artifact 13599997137 do push mostra READY home, READY shop e STAGE navigate home, seguido por ausência de QEMU/ADB. Não há FATAL EXCEPTION do app no log capturado. O kernel ficou indisponível ou sem entradas correspondentes. A opção experimental foi removida; a coleta agora tenta `sudo -n dmesg` no runner Ubuntu antes do fallback sem privilégios, com timeout e filtro. A causa da saída do processo continua pendente.

Verificações locais: `npm run check` (54 JS/10 HTML), `npm test` (253/253), `bash -n scripts/android-smoke.sh`, parse YAML, `npm run android:sync`, `node scripts/check-android.mjs` e Gradle `:app:assembleDebug :app:assembleDebugAndroidTest` passaram com JDK21/SDK35. Não há emulador/KVM local. Testes browser não foram repetidos: código de produção, navegação e runtime não mudaram. Compilar não prova execução WebView.

Próxima evidência específica: `host-kernel.txt` com saída de QEMU/segfault/OOM e último marcador de `live-logcat.txt`, comparados ao log do emulator-runner (emulador 37.2.13.0 observado). Se o kernel também não registrar o motivo, investigar crash report/exit do emulador em ambiente controlado; não atribuir os avisos de tiles à causa sem evidência. Manter a instrumentação obrigatória e sem retries até os três testes realmente concluírem.

Rodada final da implementação `8eb631d`: [push 42437759658](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437759658) e [PR 42437764811](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437764811) tiveram validate aprovado, android-smoke falho e distribute ignorado. Artifacts 13599989476/13600890040 recuperados e inspecionados: os dois param em STAGE navigate home após READY shop; QEMU ausente, exit da instrumentação 1 e kernel indisponível ou sem entradas correspondentes mesmo com a tentativa privilegiada. Não há exceção de app capturada. Os três cenários não concluíram: correção da queda/validação Android continua **pendente**, sem retries, testes ignorados ou alterações especulativas de produção. Próximo passo: recuperar o motivo de saída/crash report do emulador em ambiente controlado, extraindo apenas sinal/stack nativa e evitando dumps de memória que possam conter saves. A compilação local e os 253 testes host não substituem esse resultado.

## Investigação controlada com observação do processo

A perda de QEMU torna uma falha apenas de ADB pouco provável. Hipóteses, por evidência: (1) falha nativa de emulação/renderização ao trocar documento ou condição do launcher/stdio; (2) morte por recursos/sinal no host, ainda sem observação de pico; (3) crash nativo de WebView/Activity que exponha problema do emulador; (4) gerenciamento apenas do ADB. A navegação é um gatilho reproduzido, não uma causa demonstrada. Não haver AndroidRuntime/FATAL não exclui falha nativa.

O código da action v2 (`src/emulator-manager.ts`, `launchEmulator`) lança `sh -c '.../emulator ... &'`. O status desse shell não é o status do QEMU; os snapshots antigos tampouco o capturavam. O hook oficial `pre-emulator-launch-script` instala um wrapper local ao SDK descartável, supervisionado por `scripts/android-emulator-observer.py`. A action continua criando, iniciando, aguardando boot e encerrando o AVD. O wrapper mantém o binário original ao lado, observa o filho real com `Popen.wait()` e registra o último executável em `/proc`: só é status de QEMU se o launcher tiver feito exec dele. Se houver fork não observado, não inferir status do neto.

O observador drena stdout/stderr para logs rotativos (2 x 256 KiB, linhas limitadas a 8 KiB), omite metadados de autenticação, grava PID/executável e timeline ADB a cada ~2 s (máximo 600 entradas) e `emulator-exit.json` com código/sinal, início/fim UTC. Cada comando ADB tem timeout de 2 s; o observador tem limite explícito de 20 minutos. Não copia crash dumps ou memória. **Essa observação muda o destino de stdio; se o problema desaparecer, isso sozinho não prova uma falha de pipe do launcher.**

`api-34/` e `api-35/` dentro do artifact contêm `INDEX.txt` (última etapa + relógio UTC + status disponível antes do teardown), `device-timeline.txt`, `emulator.log[.1]`, `emulator-version.txt`, `emulator-exit.json`, os logs anteriores e cópias dos relatórios. O JSON pode ser finalizado durante o teardown, depois do INDEX; consultar o JSON final junto ao último NAV/READY de `live-logcat.txt`. NAV/DOCUMENT registra wall_ms, identidade local da Activity/WebView, página, pathname e timeOrigin; não contém progresso.

O reprodutor `NavigationReproTest.homeShopHome` usa os mesmos helpers/links/esperas da suíte. No API 35 ele deve passar antes da suíte obrigatória `GameOfflineTest` (os três cenários e deltas de save continuam intactos). Falha do reprodutor mantém o job vermelho; não é um retry. Relatórios do reprodutor são preservados antes de Gradle escrever o relatório da suíte. A comparação API 34 é opt-in, apenas num push cujo commit contenha `[android-compare-api34]`; não reduz o targetSDK nem substitui API 35. Uma falha comparativa não impede a observação do controle API 35 e permanece como falha do job. Para poupar recursos, a invocação duplicada de PR desse mesmo SHA foi cancelada antes do emulador.

A tentativa de configurar uma variável temporária via API retornou 403; nenhuma variável foi criada. O marcador de commit dispensa essa permissão e não habilita novas comparações em commits posteriores.

| SHA / execução | API / imagem / ABI | Emulador / flags | Última etapa | Processo / ADB | Resultado |
| --- | --- | --- | --- | --- | --- |
| `8eb631d` / [push 42437759658](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437759658) e [PR 42437764811](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42437764811) | 35 / google_apis / x86_64 | 37.2.13.0; headless, sem snapshot, swiftshader_indirect | navigate home após READY shop | QEMU ausente, exit não observável; ADB sem dispositivo | falhou, três cenários não concluídos |
| `88a27e1` / [push 42439854251](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42439854251) | 34 / google_apis / x86_64 | 37.2.13.0; mesmas flags e recursos | READY home após shop | QEMU saiu 0 no teardown; ADB device | reprodutor passou; suíte de três não executada nesta comparação |
| `88a27e1` / mesmo push | 35 / google_apis / x86_64 | 37.2.13.0; mesmas flags e recursos | DOCUMENT before home, ainda shop | QEMU SIGSEGV (-11), ADB perdido | reprodutor falhou; suíte de três não iniciou |
| `88a27e1` / [PR 42439858343](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42439858343) | não iniciado | não executado | não executado | não observado | cancelado para evitar duplicação |


O artifact 13601646779 de `88a27e1` confirma o novo fato: QEMU (mesmo PID, exec observado) terminou por SIGSEGV às 02:52:46Z, antes do teardown às 02:53:11Z. API 34 terminou normalmente (0) após o teste. Na troca home → shop, Activity 81709485/WebView 44438368 permaneceram os mesmos e timeOrigin mudou: troca de documento, sem recriação nativa observada. O último marcador é DOCUMENT before home às 02:52:04Z. O intervalo até o exit inclui o tratamento de crash do emulador; não indica um teste ainda saudável. Só esse dado não localiza a instrução defeituosa. As imagens diferem também no WebView embarcado: API 34 usa 113.0.5672.136; API 35 usa 124.0.6367.219. Essa diferença é uma variável ambiental correlacionada, não prova de defeito em nenhuma dessas versões.

Esse SIGSEGV novo justifica um terceiro emulador, focado em obter a stack nativa no API 35. O opt-in `[android-native-trace]` instala GDB somente nesse diagnóstico, mantém flags e imagens, e usa `android-native-trace.gdb`: backtrace limitado, sem argumentos/locais/dump de memória. Sinais são entregues normalmente até a saída real; sinais tratados pelo QEMU/JIT não são automaticamente classificados como crash. Nesse modo o processo supervisionado é GDB, não QEMU: consultar o sinal/stack nativos no log e `debugger_parent` no JSON, sem confundir o código do debugger com o de seu inferior. `b4c65b4` push 42440580312 e PR 42440584748 foram cancelados ainda em pré-compilação para corrigir esse tratamento; não são experimentos de emulador. O PR duplicado 42440654861 também foi cancelado antes do emulador.

| SHA / execução adicional | API / backend | Observação | Resultado |
| --- | --- | --- | --- |
| `47eaee5` / [push 42440651942](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42440651942) | 35 / swiftshader_indirect, GDB opt-in | 03:01:23Z SIGSEGV em RenderThread do QEMU, logo após NAV before home; frames sem símbolos, unwind sem função confiável. GDB relatou depois perda de registradores/processo e saiu 1: esse 1 é do debugger, não um novo exit status do QEMU. | reprodutor falhou; suíte de três não iniciou; artifact 13601601866 recuperado |
| `4a31f91` / [push 42441152785](https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/42441152785) | 35 / swangle, sem GDB | reprodutor e 3/3 cenários aprovados; QEMU retornou 0 após teardown | passou; artifact 13601513979 inspecionado |

A stack em RenderThread é o fato novo que justifica a quarta e última execução de emulador desta investigação (API 34 + controle API 35 + stack API 35 + verificação API 35). Não são tentativas até ficar verde: cada uma responde uma pergunta diferente; as duplicatas de PR foram canceladas. Preparações canceladas em pré-compilação não chegaram a executar emulador.

A [documentação oficial de aceleração](https://developer.android.com/studio/run/emulator-acceleration) marca swiftshader_indirect como obsoleto desde 36.4.9 e oferece swangle (SwiftShader com ANGLE). A mitigação altera apenas `-gpu swiftshader_indirect` para `-gpu swangle`; não desabilita renderização do app, WebView, animações do jogo, testes ou recursos. O binário, API/ABI, host e asserções permanecem. Não foi identificada a instrução/função exata na stack sem símbolos; não se deve inventar um bug específico de alocação/decodificação.


## Conclusão e validação final

**Falha de infraestrutura confirmada e mitigação validada:** o QEMU 37.2.13.0, com API 35 e o caminho GLES legado `swiftshader_indirect` (SwiftShader 4.0.0.1), sofre SIGSEGV na sua RenderThread ao voltar da Loja ao Mundo. Não é somente perda de ADB nem falha de limpeza. Com o mesmo app, testes, imagem API 35, binário e recursos, `swangle` selecionou ANGLE + SwiftShader 5.0.0: o reprodutor e os três testes passaram, e o processo terminou 0 normalmente. A função/instrução defeituosa e o mecanismo interno não foram identificados no binário sem símbolos; não se afirma que o código interno do QEMU foi corrigido. A correção aplicada é usar o backend de software suportado no CI, sem alterar o jogo ou o APK.

Verificação real no SHA `4a31f914b2ecad465fe0095a725cb3eae9562f0f`, execução 42441152785: validate e android-smoke aprovados; distribute ignorado. Artifact 13601513979 baixado e XMLs conferidos:

| Teste API 35 | Resultado |
| --- | --- |
| NavigationReproTest.homeShopHome | passou (1 teste, 0 falhas/erros/ignorados) |
| GameOfflineTest.lifecycleAndActivityRelaunchRetainExactClickDelta | passou |
| GameOfflineTest.offlineBundledNavigation | passou |
| GameOfflineTest.androidBackReturnsToPreviousDocument | passou |

XML da suíte obrigatória: 3 testes, 0 falhas, 0 erros, 0 ignorados. `emulator-exit.json`: debugger_parent false, último executável qemu-system-x86_64-headless, returncode 0, signal null. O JSON final mostra início 03:06:56Z/fim 03:08:45Z. A aprovação é de uma execução completa observada, não uma garantia estatística de ausência de qualquer flakiness futura.

Comandos locais desta investigação: `npm run check` passou (54 JS/10 HTML); `npm test` passou (255/255, incluindo sinal real em fixture, redaction, hook sequencial e preservação de falha); `npm run android:sync` e `node scripts/check-android.mjs` passaram; `bash -n scripts/android-smoke.sh` e parse YAML passaram; Gradle `:app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline --max-workers=2` com JDK21/SDK35 passou (125 tarefas). Não houve execução de emulador local (sem KVM), browser suite repetida ou teste em telefone nesta investigação. Nenhum arquivo de produção do jogo, versão/assinatura, targetSDK, save, PWA ou distribuição foi alterado. GDB/API 34 são opt-ins de diagnóstico, não custos adicionados a toda execução.

Antes do merge: revisar a alteração de CI e a evidência acima, conferir os checks exigidos pelo repositório na revisão final. As invocações Android de PR duplicadas foram deliberadamente canceladas para limitar o consumo; não foram aprovadas ficticiamente. O commit posterior de documentação não muda a implementação testada; suas invocações duplicadas também devem ser canceladas antes de iniciar emulador, mantendo os quatro experimentos descritos. Nunca fazer merge ou distribuir APK automaticamente.
