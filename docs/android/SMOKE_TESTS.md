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
