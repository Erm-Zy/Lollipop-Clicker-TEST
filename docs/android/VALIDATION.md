# Validação Android — 3.0.0-beta.1

## Executado nesta sessão

- `npm ci`/instalação com package-lock e versões exatas do Capacitor7.4.3.
- `npm run check`: 23 arquivos JavaScript e nove HTMLs verificados.
- `npm test`: 52 testes de regras/armazenamento passaram.
- `npm run android:sync` e `node scripts/check-android.mjs`: nove páginas com assets locais e configuração sem server.url remoto.
- Gradle `:app:assembleDebug`: APK debug compilado com JDK21 completo, Android SDK35 e Gradle8.11.1.
- Gradle `:app:assembleDebugAndroidTest`: código de testes instrumentados compilado.
- `apksigner verify`: assinatura debug válida. ID `com.ermzy.lollipopclicker`, versionName `3.0.0-beta.1`, versionCode local `3000001`, minSDK23, targetSDK35.
- Inspeção do ZIP do APK confirmou nove HTMLs, módulos, CSS, imagens, áudio e bundle nativo embarcados. Não há URL remota de inicialização.

## Execução Android

Este executor não disponibiliza aparelho ou `/dev/kvm` para executar o emulador acelerado. **Compilação e inspeção do APK não equivalem a teste em aparelho.** Não foram verificados localmente áudio audível, recortes físicos, gestos reais de dois dedos ou navegação em WebView Android.

O workflow inclui um job `android-smoke` com emulador API35, Wi-Fi e dados desativados, que executa `GameOfflineTest`: carregamento dos nove documentos, cliques, Voltar, background/foreground e continuidade após recriar a Activity. O job Android smoke foi executado com sucesso no GitHub em 3 de novembro de 2026: https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/41704329868/job/126155523300 . Esse run inicial teve falha separada no setup do job APK (pacote SDK tools obsoleto); o setup foi corrigido e o job APK da nova execução passou: https://github.com/Erm-Zy/Lollipop-Clicker-TEST/actions/runs/41704609811 . Os dois jobs da execução corrigida (APK e Android smoke) concluíram com sucesso. A aprovação do smoke não substitui teste auditivo/físico de recortes e gestos por testadores.

O build web original continua na raiz. O adaptador e CSS Android são injetados somente no diretório gerado `www/`; as duas alterações compartilhadas são a integração de pausa/retomada nativa e a desativação de service worker dentro do Capacitor. Os 107 testes Chromium documentados na versão3.0 anterior não foram confundidos com testes Android nesta conversão.

Veja BETA.md para roteiro de teste em aparelho, exportação/importação, limitações da assinatura debug e uso de secrets para assinatura persistente.
