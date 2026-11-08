# Smoke Android: evidência e investigação

O job `android-smoke` é isolado, sem secrets de distribuição e sem artifact APK. API35/x86_64/google_apis; Wi-Fi/dados desativados antes de abrir o app. São três testes independentes: dez documentos offline através dos links/More visíveis; Voltar Android de Loja para Mundo; cliques com delta exato persistido após navegação, background/resume e relançamento da Activity. Relançamento de Activity não simula morte forçada do processo.

## Evidência inicial

Execução42433588369, job128587561097, commit33a89ac: console do emulador falhou às01:20:22Z; instrumentação iniciou às01:20:27Z; teste marcado como falho às01:21:12Z; dispositivo indisponível na limpeza às01:21:22Z. O log não contém a exceção original. Download do artifact antigo pela sessão retornou403; não foi possível recuperar mais evidência. Push e PR são invocações separadas do mesmo commit, não prova de duas causas.

**Causa original ainda não comprovada.** Sumiço do dispositivo é confirmado; não se concluiu se ocorreu antes de uma asserção ou depois dela. Fragilidades verificadas do teste antigo: `ready()` aceitava qualquer documento writable, sleeps fixos e scripts sem tratamento contextual. Nenhum defeito de produção foi confirmado; gameplay/runtime, UI, assinatura e versão não foram alterados.

## Mudanças e limites

Esperas agora verificam WebView existente, documento esperado, readyState completo, bootstrap/writable e HUD, até30s. Callback JS tem limite5s, distingue exceção/selector/callback; erro não é aceito como sucesso. Navegação abre More quando necessário e usa âncoras reais; não injeta `location` como atalho. Marcadores `LollipopSmoke STAGE/READY` contêm só rota/estado/HUD, nunca save bruto.

Pré-compilação ocorre antes de iniciar o emulador, reduzindo competição durante o teste. Boot sem snapshots, dois cores/RAM2048 explícitos; Gradle limitado a dois workers. Não há retries de asserções nem supressão de crashes. Esses são controles de reprodutibilidade/recursos, não uma causa comprovada de queda do emulador.

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
