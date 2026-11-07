# Lollipop Clicker — Android 3.0.0-beta.1

ID permanente: `com.ermzy.lollipopclicker`. O APK contém o jogo completo; não carrega o site do GitHub Pages. A versão web permanece disponível e independente.

## Instalar e testar

1. Baixe o APK fornecido ou abra Actions → Android beta APK → execução concluída → artifact oficial `lollipop-3.0.0-beta.1-debug-<versionCode>` (execução manual na `dev`). Extraia o ZIP do artifact.
2. No celular, toque no `.apk` e permita instalação por aquela origem (navegador/gerenciador de arquivos) quando o Android solicitar. Não exige root. Após instalar, você pode desativar essa autorização.
3. Abra Lollipop Clicker. Recomendamos Android e Android System WebView/Chrome atualizados. O mínimo técnico do projeto é Android 6/API23; aparelhos antigos específicos ainda precisam de teste.
4. Ative modo avião e confira Mundo, Loja, Coleção, Arena, Prestígio, Conquistas, Diário, Roleta e Ajustes. O jogo deve continuar produzindo e salvando.
5. Faça alguns cliques e compras, minimize, reabra e depois feche/abra o aplicativo. Confirme que o progresso continua. Teste som, dois dedos, recortes da tela, seletor de arquivos e botão Voltar.
6. Em Ajustes, consulte a versão e use **Relatar um problema**. O navegador abre um formulário no GitHub; requer internet e uma conta para enviar. Descreva aparelho, Android, passos e resultado esperado. Nenhum save, dado pessoal ou diagnóstico é enviado automaticamente.

## Progresso e atualizações

O save do navegador NÃO aparece automaticamente no APK: são armazenamentos/origens distintos. Antes de migrar, exporte o JSON nos Ajustes do site, transfira-o para o celular e importe-o nos Ajustes do app. A importação exige confirmação e guarda backup. O seletor do Android permite exportar JSON sem permissões amplas de armazenamento.

Para atualizar sem perder progresso, mantenha o mesmo ID, **o mesmo certificado de assinatura** e um versionCode estritamente maior. Instale por cima; **não desinstale** nem limpe dados. Faça um backup JSON antes de atualizar. O app não usa conta nem sincronização em nuvem.

Builds locais/PR/emulador sem configuração usam uma chave debug descartável **somente para validação**, sem artifact de APK distribuível. Não compartilhe essas builds como beta oficial. Toda distribuição manual, debug ou release, exige os quatro secrets; um secret ausente, chave inválida, alias/senha errados ou falha ao reservar versão bloqueia a entrega. Debug e release oficiais usam `signingConfigs.beta` e o mesmo certificado.

**Uma chave nova não atualiza um APK assinado com outra chave.** Isso inclui APKs antigos de runners diferentes. Antes de uma reinstalação necessária, exporte o JSON nos Ajustes do app antigo e guarde-o fora do app. Só depois desinstale, instale a beta persistente e importe o JSON. Desinstalar antes de exportar apaga o armazenamento local. Se houver uma chave original utilizável, prefira preservá-la em vez de gerar outra.

## Configurar assinatura persistente (proprietário)

1. Em uma máquina confiável, fora do repositório, gere uma vez (não em cada beta):

   ```sh
   keytool -genkeypair -v -storetype JKS -keystore lollipop-beta.jks -alias lollipop -keyalg RSA -keysize 3072 -validity 10000
   ```

   As senhas são pedidas interativamente; não as coloque em argumentos salvos no histórico. Para uma chave existente, use seu arquivo/alias originais. Confira e registre o fingerprint público com `keytool -list -v -keystore lollipop-beta.jks`.

2. Converta o arquivo para base64 localmente, sem imprimir o conteúdo em logs:

   Linux/macOS: `base64 < lollipop-beta.jks > lollipop-beta.base64` (quebras de linha são aceitas).

   PowerShell: `[IO.File]::WriteAllText('lollipop-beta.base64', [Convert]::ToBase64String([IO.File]::ReadAllBytes('lollipop-beta.jks')))`.

3. GitHub → Settings → Secrets and variables → Actions → New repository secret. Cadastre:

   - `ANDROID_KEYSTORE_BASE64`: conteúdo do arquivo base64, não seu caminho.
   - `ANDROID_KEYSTORE_PASSWORD`: senha do keystore.
   - `ANDROID_KEY_ALIAS`: alias original, por exemplo `lollipop`.
   - `ANDROID_KEY_PASSWORD`: senha da entrada privada.

4. Guarde o **keystore original** em pelo menos duas cópias privadas criptografadas, uma fora da máquina de desenvolvimento. Guarde senhas em gerenciador seguro e teste uma restauração. Base64 não é criptografia. Apague a cópia base64 intermediária após cadastrar; não envie chave/senhas por issues, PRs ou chat. A perda da chave impede atualizações compatíveis. Não rotacione os secrets sem planejar a migração de dados dos testers.

5. Actions → Android beta APK → Run workflow → branch **dev** → `debug` ou `release`. Ambos exigem a mesma chave. O artifact contém um `.apk` cujo nome usa a versão do `package.json`, variante e versionCode, um SHA-256 e `certificate.txt`. Compare o fingerprint com o certificado original. Keystore temporário tem acesso restrito e é removido ao final. Nenhum arquivo privado vai ao artifact.

PRs/pushes na dev fazem validação isolada e testes de emulador, sem ler secrets e sem publicar APK. O relatório de testes pode ser enviado; um APK de teste não é uma beta oficial. Permissão `contents: write` existe apenas no job manual para reservar versões; não há criação de GitHub Release nem publicação na Play Store.

### Sequência permanente de versionCode

O job manual é serializado (sem cancelar o build em andamento). Antes de compilar, reserva uma tag interna imutável `android-beta-version/<código>` apontando para o commit. Isso é um registro de números, não uma release. Não apague/regrave essas tags. O próximo código é o maior entre: último reservado + 1, piso configurado + 1 e segundos desde 01/01/2020 UTC. Falhas consomem o número; retries reservam outro. Troca de runner/workflow, relógio atrasado e reruns não reduzem nem reutilizam o código. Push de reserva rejeitado ou teto Android (2.100.000.000) aborta antes de distribuir.

Antes da primeira distribuição, confira o maior versionCode **já entregue**, inclusive builds locais/antigas. Se ele for superior ao esquema antigo `3000000 + run_number`, configure a variável de repositório `ANDROID_VERSION_CODE_FLOOR` com esse maior número. O bootstrap por timestamp supera os códigos antigos usuais; não consegue descobrir APKs privados construídos fora do repositório. Ao migrar/clonar o repositório, preserve as tags do registro e configure o piso histórico; políticas de proteção devem permitir criar as tags internas, sem permitir sobrescrevê-las. Não substitua isso por cache descartável.

`versionName` vem diretamente do `package.json` no Gradle; a versão atual permanece `3.0.0-beta.1`. Não é necessário alterar a versão nominal a cada build, apenas o versionCode crescente. Builds locais de validação usam 3000001 por padrão e não devem ser instaladas como atualização de beta.

**Privacidade da distribuição:** este repositório é público. Artifacts do Actions não fornecem, por si só, uma lista privada de testadores. Para confidencialidade real, execute o workflow em uma cópia privada com acesso restrito ou distribua o APK diretamente por um canal privado. Não crie uma GitHub Release pública para a beta privada.

## Compilar localmente

Requisitos: Node24, JDK21 completo (com javac), Android SDK com plataforma35 e Build Tools34/35. Instale pelo Android Studio ou sdkmanager. Configure `ANDROID_HOME`/`ANDROID_SDK_ROOT` para o SDK instalado ou um `android/local.properties` local (não comitado).

```sh
npm ci
npm run check
npm test
npm run android:sync
node scripts/check-android.mjs
cd android
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

No Windows use `gradlew.bat`. O Gradle Wrapper, Capacitor e npm lockfile estão versionados; não precisa de Capacitor global. Não adicione `server.url` apontando para o site. `www/` e os assets copiados para Android são gerados pelo sync.

Para debug distribuível local, reserve um código pelo mesmo processo do CI antes da distribuição (prefira o workflow manual), defina `ANDROID_DISTRIBUTION=true` e `ANDROID_VERSION_CODE` com o código reservado. Para release local, também defina `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` em um ambiente privado e execute `assembleRelease` (ou `assembleDebug` para a beta debug persistente). Nunca coloque as credenciais no Gradle/README. Os APKs e keystores ficam fora do Git.

## Permissões e runtime

A única permissão normal é INTERNET, mantida pelo runtime WebView/Capacitor com origem local `https://localhost`; nenhum conteúdo de jogo remoto ou SDK publicitário/analytics é carregado. Não há permissões de contatos, localização, câmera, microfone ou armazenamento amplo. Exportação usa Storage Access Framework. O botão de relatório abre o navegador externo por escolha do testador.

A orientação padrão é retrato. Barras do sistema ficam ocultas e podem reaparecer por gesto; recortes da tela recebem padding nativo. Eventos de background suspendem áudio/timers e salvam o estado; foreground retoma o relógio com a produção decorrida. Service worker é usado apenas na web, não como dependência offline do APK.


## Save atual e histórico do Prestígio

Antes de atualizar, exporte seu save. O schema atual é **6**, incluindo [Pets & Eggs](../PETS_UPDATE.md), e mantém PP, capacidades, Ímpeto e todo o progresso v4, com backup bruto v5 em `lollipopSave.legacy-v5` e backup v4 preservado. A exceção histórica de reset do Prestígio não é repetida: legados incompatíveis ficam protegidos para exportação. O pacote agora inclui dez páginas, inclusive Pets, com abertura/fusão/equipe sem backend. ID e assinatura não foram alterados; atualizações sobre uma instalação existente exigem assinatura compatível. Veja o [relato histórico de Prestígio](../PRESTIGE_BALANCE.md).

## Validação da assinatura

`npm run check` e `npm test` cobrem os quatro secrets ausentes, base64 inválido, limites de versão, relógio atrasado, retries e reservas reais em Git temporário. Esses testes usam apenas fixtures, nunca a chave oficial. Valide uma primeira beta manual e compare `certificate.txt` com seu keystore original antes de entregar aos testers. A instalação sobre um APK anterior deve ser testada em aparelho com backup do save; compilar e verificar certificado não prova essa atualização em hardware.

Verificação desta mudança: sintaxe de 53 JS/10 HTML; 252 testes Node passaram; YAML validado; sync/check das dez páginas Android passou. Gradle rejeitou distribuição sem assinatura, release sem assinatura, tarefa agregada incluindo release e senha incorreta. Debug isolado, debug assinado e release assinado compilaram; `apksigner` confirmou certificado idêntico nas duas variantes assinadas com uma chave descartável de teste. Chave e APKs descartáveis foram apagados. Não foi executada distribuição oficial com os secrets do proprietário nem instalação em aparelho/emulador nesta validação.
