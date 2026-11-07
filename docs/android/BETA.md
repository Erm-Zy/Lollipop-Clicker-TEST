# Lollipop Clicker — Android 3.0.0-beta.1

ID permanente: `com.ermzy.lollipopclicker`. O APK contém o jogo completo; não carrega o site do GitHub Pages. A versão web permanece disponível e independente.

## Instalar e testar

1. Baixe o APK fornecido ou abra Actions → Android beta APK → execução concluída → artifact `lollipop-3.0.0-beta.1-debug-...`. Extraia o ZIP do artifact.
2. No celular, toque no `.apk` e permita instalação por aquela origem (navegador/gerenciador de arquivos) quando o Android solicitar. Não exige root. Após instalar, você pode desativar essa autorização.
3. Abra Lollipop Clicker. Recomendamos Android e Android System WebView/Chrome atualizados. O mínimo técnico do projeto é Android 6/API23; aparelhos antigos específicos ainda precisam de teste.
4. Ative modo avião e confira Mundo, Loja, Coleção, Arena, Prestígio, Conquistas, Diário, Roleta e Ajustes. O jogo deve continuar produzindo e salvando.
5. Faça alguns cliques e compras, minimize, reabra e depois feche/abra o aplicativo. Confirme que o progresso continua. Teste som, dois dedos, recortes da tela, seletor de arquivos e botão Voltar.
6. Em Ajustes, consulte a versão e use **Relatar um problema**. O navegador abre um formulário no GitHub; requer internet e uma conta para enviar. Descreva aparelho, Android, passos e resultado esperado. Nenhum save, dado pessoal ou diagnóstico é enviado automaticamente.

## Progresso e atualizações

O save do navegador NÃO aparece automaticamente no APK: são armazenamentos/origens distintos. Antes de migrar, exporte o JSON nos Ajustes do site, transfira-o para o celular e importe-o nos Ajustes do app. A importação exige confirmação e guarda backup. O seletor do Android permite exportar JSON sem permissões amplas de armazenamento.

Para atualizar sem perder progresso, mantenha o mesmo ID, **o mesmo certificado de assinatura** e um versionCode igual ou maior (preferencialmente maior). Instale por cima; **não desinstale** nem limpe dados. Faça um backup JSON antes de atualizar. O app não usa conta nem sincronização em nuvem.

O primeiro APK debug local é para teste pessoal. A chave debug local não é a mesma chave efêmera de um runner novo do GitHub. APKs debug de execuções diferentes podem ser incompatíveis para atualização. Se o Android disser “app não instalado”/assinatura incompatível, primeiro exporte o progresso no app antigo; somente então desinstale, instale a nova cópia e importe o JSON. Nunca desinstale antes do backup.

Para uma sequência de betas externas, configure uma chave persistente nos secrets **antes de começar a distribuição continuada**. O workflow usa a mesma chave configurada tanto no debug quanto no release. Ao migrar da chave debug inicial para uma chave persistente diferente, é necessária uma transferência de save por exportação/importação. Debug não é estratégia permanente de distribuição.

## Assinatura persistente e releases futuras

Crie uma chave privada fora do repositório, em uma máquina sob seu controle:

```sh
keytool -genkeypair -v -keystore lollipop-beta.jks -alias lollipop -keyalg RSA -keysize 3072 -validity 10000
```

O comando pede as senhas interativamente. Guarde o arquivo e as senhas em backup privado. Nunca os comite. Cadastre em Settings → Secrets and variables → Actions:

- `ANDROID_KEYSTORE_BASE64`: conteúdo base64 do arquivo `.jks` (não a localização).
- `ANDROID_KEYSTORE_PASSWORD`: senha do arquivo.
- `ANDROID_KEY_ALIAS`: alias, por exemplo `lollipop`.
- `ANDROID_KEY_PASSWORD`: senha da chave.

Em Actions → Android beta APK → Run workflow, escolha `release`. Sem os quatro secrets o release deve falhar, sem produzir um APK release sem assinatura. O arquivo temporário da chave é removido ao final. Nenhuma chave ou senha foi incluída no código ou no APK como recurso.

O versionCode do CI é `3000000 + github.run_number`; aumente o patamar se mudar de workflow/repositório com uma contagem menor. O padrão local é `3000001`; para atualizações locais defina `ANDROID_VERSION_CODE` com valor maior que o instalado. Atualize também versionName/versão do app em futuras betas. Não há publicação na Google Play nem criação de release pública automática.

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

Para release local, defina `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` em um ambiente privado e execute `assembleRelease`. Nunca coloque as credenciais no Gradle/README. Os APKs e keystores ficam fora do Git.

## Permissões e runtime

A única permissão normal é INTERNET, mantida pelo runtime WebView/Capacitor com origem local `https://localhost`; nenhum conteúdo de jogo remoto ou SDK publicitário/analytics é carregado. Não há permissões de contatos, localização, câmera, microfone ou armazenamento amplo. Exportação usa Storage Access Framework. O botão de relatório abre o navegador externo por escolha do testador.

A orientação padrão é retrato. Barras do sistema ficam ocultas e podem reaparecer por gesto; recortes da tela recebem padding nativo. Eventos de background suspendem áudio/timers e salvam o estado; foreground retoma o relógio com a produção decorrida. Service worker é usado apenas na web, não como dependência offline do APK.


## Atualização da progressão de Prestígio (schema 4)

Antes de atualizar, exporte seu save. Dados antigos dentro das capacidades migram com os níveis históricos convertidos em PP. Saves beta antigos com quantidades acima dos novos limites têm o reset único autorizado, com aviso e backup bruto exportável nos Ajustes. Importar um desses saves incompatíveis é recusado para não reintroduzir a progressão antiga; arquivos compatíveis e schema 4 continuam importáveis. O ID/assinatura não mudam. Confira os [limites, migração e novos sistemas](../PRESTIGE_BALANCE.md).
