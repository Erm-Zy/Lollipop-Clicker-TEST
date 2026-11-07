# Pets & Eggs — guia e relatório da expansão

A expansão adiciona três ovos, 18 espécies, quatro evoluções e um álbum de 72 descobertas. Não muda a fórmula de prestígio, os custos em PP, capacidades das fábricas, mundos, probabilidades da roleta ou o atualizador PWA. Todos os gastos de ovos usam **pirulitos**, nunca PP.

## Ovos, desbloqueios e chances

| Ovo / ID | Preço unitário | Desbloqueio permanente |
| --- | ---: | --- |
| Ovo Açucarado / `acucarado` | 1.500 | Desde o começo |
| Ovo Cristalizado / `cristalizado` | 100.000 | Alcançar 25 fábricas em uma jornada |
| Ovo Celestial / `celestial` | 10.000.000 | Alcançar 100 fábricas em uma jornada |

A contagem e os marcos são os mesmos dos mundos existentes (`getTotalUpgradesCount` e `WORLD_CHAPTERS`), sem criar novos mundos. O desbloqueio é salvo ao comprar fábricas/avançar e antes de renascer. Na primeira migração, marcos da jornada atual são reconhecidos; não inventamos uma maior quantidade histórica de fábricas que o schema 4 nunca registrou.

Cada ovo totaliza exatamente 200 unidades de peso, equivalentes a 100%. A raridade é dividida igualmente entre suas espécies. O mesmo sorteador recebe RNG injetável nos testes e faz **um sorteio independente por ovo**. Nenhum pet, evolução, boost ou prestígio altera as chances.

### Ovo Açucarado

Comum: 60% · Incomum: 30% · Raro: 9% · Épico: 1%. Demais raridades: **0%**.

| Espécie / ID estável | Raridade | Chance individual | Clique Normal | PPS Normal |
| --- | --- | ---: | ---: | ---: |
| Balinha Saltitante / `balinha` | Comum | 30% | +2,5% | +1% |
| Marshmelinho / `marshmelinho` | Comum | 30% | +1% | +2,5% |
| Ursinho de Goma / `goma` | Incomum | 30% | +2,5% | +3% |
| Raposa de Morango / `raposa_morango` | Raro | 9% | +4,5% | +2,5% |
| Guardião Pirulito / `guardiao_pirulito` | Épico | 1% | +5% | +6% |

### Ovo Cristalizado

Incomum: 50% · Raro: 35% · Épico: 12% · Lendário: 3%. Demais raridades: **0%**.

| Espécie / ID estável | Raridade | Chance individual | Clique Normal | PPS Normal |
| --- | --- | ---: | ---: | ---: |
| Cubinho Gelado / `cubinho` | Incomum | 25% | +2,5% | +4% |
| Gotinha de Cristal / `gotinha` | Incomum | 25% | +1,5% | +5% |
| Coelho de Quartzo / `coelho_quartzo` | Raro | 17,5% | +4% | +5,5% |
| Raposa de Geada / `raposa_geada` | Raro | 17,5% | +6,5% | +4% |
| Coruja Prismática / `coruja_prismatica` | Épico | 12% | +5% | +8% |
| Dragão Cristalino / `dragao_cristalino` | Lendário | 3% | +9% | +9% |

### Ovo Celestial

Raro: 65% · Épico: 25% · Lendário: 9% · Mítico: 1%. Demais raridades: **0%**.

| Espécie / ID estável | Raridade | Chance individual | Clique Normal | PPS Normal |
| --- | --- | ---: | ---: | ---: |
| Estrelinha Doce / `estrelinha` | Raro | 32,5% | +5,5% | +6,5% |
| Cometinha / `cometinha` | Raro | 32,5% | +8,5% | +3,5% |
| Coelho Lunar / `coelho_lunar` | Épico | 12,5% | +6,5% | +8,5% |
| Raposa Nebulosa / `raposa_nebulosa` | Épico | 12,5% | +9,5% | +5,5% |
| Fênix Açucarada / `fenix` | Lendário | 4,5% | +11,5% | +10% |
| Guardião da Aurora / `guardiao_aurora` | Lendário | 4,5% | +8% | +14% |
| Dragão Galáctico / `dragao_galactico` | Mítico | 1% | +16% | +16% |

## Bônus, equipe e evolução

Cada instância tem ID local próprio, espécie, estágio (0–3), aquisição, favorito e bloqueio. O inventário aceita duplicatas. São **três espaços** de equipamento; a mesma instância não pode ocupar dois.

```text
bônus de clique da equipe = soma(coeficiente de clique de cada equipado × poder do estágio)
bônus de PPS da equipe    = soma(coeficiente de PPS de cada equipado × poder do estágio)
clique final = clique anterior aos pets × (1 + bônus de clique da equipe)
PPS final    = PPS anterior aos pets × (1 + bônus de PPS da equipe)
```

A multiplicação entra **uma vez** nos getters autoritativos `getClickPower` e `getPps`. Sabores, roleta rara, prestígio, Ímpeto e boosts continuam combinados pelas regras existentes. Loja, comparação de sabores, estatísticas, produção offline e dano da Arena usam esses mesmos getters. Pets não produzem PPS sem fábricas nem concedem saldo/fábricas grátis. Antes de mudar a equipe ou consumir um equipado, a produção decorrida é integrada com a equipe antiga.

Os bônus dos três pets se somam, sem multiplicação entre eles. Pelo catálogo atual, cada multiplicador da equipe fica entre **×1 e ×17,8** (três Dragões Galácticos Gigantes); os tetos numéricos existentes continuam valendo. Um pet Normal Mítico dá +16% por atributo; três dão +48%, não ×35 no jogo inteiro.

| Estágio | Poder do bônus próprio | Cópias Normais representadas |
| --- | ---: | ---: |
| Normal | ×1 | 1 |
| Médio | ×3 | 5 |
| Grande | ×10 | 25 |
| Gigante | ×35 | 125 |

Uma fusão consome **exatamente cinco instâncias distintas**, da mesma espécie e estágio, e cria uma do próximo. Gigante é final; não há taxa. O diálogo lista os cinco IDs, evolução resultante e bônus. Favoritos/bloqueados precisam ser desbloqueados primeiro; equipados exigem confirmação separada. O novo pet entra no inventário, sem equipar automaticamente. A ação é explícita, atômica e revertida se não for salva. Nunca há fusão automática ou consumo silencioso de duplicatas.

**Equipar melhores** maximiza os coeficientes reais: Equilibrado soma clique + PPS; Produção prioriza PPS; Cliques prioriza clique. Em empate, usa o outro atributo (ou menor componente no Equilibrado), aquisição e ID. Como os bônus são aditivos, os três maiores escores maximizam esse objetivo. Não usa o rótulo de raridade, não funde nem apaga nada; favoritos podem integrar a equipe normalmente.

## Inventário, abertura e desempenho

- Limite inicial: **500 instâncias**, não 500 espécies. Filtros por raridade/ovo/evolução, busca sem distinção de acentos, quatro ordenações e páginas de 48 cartões.
- A lista só é reconstruída quando os pets/equipamentos/filtros mudam. Ticks de 200 ms não reordenam nem recriam centenas de cartões. A equipe consulta um índice de propriedade em cache; SVGs são estáticos fora da revelação curta de até três ovos.
- ×1/×2/×3 custam exatamente 1/2/3 vezes o preço. Sem saldo ou espaço para o lote inteiro, não há compra parcial. Resultado, IDs, débito e estatísticas são salvos antes da animação.
- O diálogo mostra todos os resultados juntos. Há **Pular animação** e preferência persistida separadamente em `lollipopPets.skipAnimation`, respeitando movimento reduzido e animações do jogo. Esc fecha e devolve foco ao botão disponível ou ao ovo selecionado se houver recarga.
- A interface bloqueia submissões simultâneas; o modelo também verifica ID do pedido repetido e intervalo mínimo de 350 ms. Nenhuma recompensa depende de callbacks da animação.
- Abertura automática é gratuita, com lote fixo ×1/×2/×3 a cada **2,4 s**. Um único timeout existe enquanto ativa. **Parar**, falta de saldo/espaço, falha de save, perda de ownership, janela sem foco, página oculta, navegação, pausa nativa e preparação de update PWA interrompem a sessão. Trocar de ovo ou sair do painel de ovos também para.
- Auto funciona sem internet enquanto o aplicativo está ativo, mas **não roda com o jogo fechado**, não é persistido e não recomeça ao voltar. Não existe cálculo de ovos offline. A produção offline comum continua intacta.
- O álbum registra espécies/estágios já descobertos e não perde registros na fusão ou no prestígio. Não é uma lista de propriedade atual.

## Save 5, backups e integridade

A chave continua **`lollipopSave`**. O schema 5 acrescenta `pets` com inventário, equipe, descobertas, ovos permanentes, próximo ID, estratégia, último pedido e estatísticas de hatches/fusões/gastos por ovo. Não guarda desenhos nem bônus derivados no save.

1. **v4 válido → v5:** mantém o progresso anterior, PP, Ímpeto, expansões, coleções, cosméticos, estatísticas e cooldowns. Pets começam com valores seguros; ovos da jornada atual são reconhecidos.
2. Antes da escrita migrada, o primeiro original v4 bruto fica em **`lollipopSave.legacy-v4`**, sem confundir com `legacy-v3`. A gravação do backup é conferida por leitura. Se falhar (inclusive rejeição silenciosa), o original continua no primário e autosave/transações ficam protegidos. O primeiro backup é imutável; o backup normal também guarda a escrita completa anterior.
3. `saveGame` verifica a leitura do primário depois de escrever. Compras, fusões, equipamento e flags passam pelo escritor existente com `runtime.act(..., {requireSave:true})`, mantendo rollback de saldo, IDs, inventário e equipe. Não existe segundo escritor.
4. Dados de propriedade desconhecidos/inválidos não apagam progresso: o primário é preservado e o estado fica protegido para exportação. Uma cópia bruta pode ficar em **`lollipopSave.pets-v5-quarantine`**. A visualização mantém os pets reconhecidos e demais campos legítimos; importação inválida é recusada. Ajustes oferece exportação do original v4, da cópia protegida e do save atual/bruto.
5. IDs inválidos/duplicados são reparados sem descartar instâncias reconhecidas; referências de equipamento são normalizadas. Um import acima de 500 pets preserva todos os válidos e bloqueia novos hatches até liberar espaço por fusão — não corta o inventário.
6. Saves futuros/JSON corrompido continuam protegidos. Importação/restauração/substituição exigem confirmação e preservam a cópia anterior em `lollipopSave.recovery`. Export/import retém o sistema de pets inteiro.
7. **Nenhum reset automático nesta expansão.** A exceção antiga de reset beta não é repetida. Legados anteriores ao v4 que excedem capacidades ficam protegidos para exportação; a prévia aplica os limites de visualização e não sobrescreve o original. Backups históricos `pre-prestige-v4` continuam exportáveis.

O prestígio preserva todas as instâncias/IDs/estágios/flags, equipe, álbum, ovos e estatísticas. Reinicia somente os temporários de antes; os bônus equipados continuam válidos na jornada seguinte. A confirmação informa isso explicitamente.

IDs são únicos no fluxo local válido e não são reutilizados após fusões; **não provam autenticidade**. Este jogo offline não impede edição/duplicação de arquivos de save. Trocas futuras precisarão de propriedade validada por servidor; não há backend, comércio, conta, tracking ou nova moeda nesta implementação.

## Balanceamento reproduzível

Os preços propostos foram mantidos: **1.500 / 100.000 / 10.000.000 pirulitos**. Rode `node scripts/simulate-pets.mjs`. O modelo reutiliza a simulação de fábricas/sabores e getters reais: dois cliques/s esperados, compras por retorno marginal, sem Arena, roleta, boosts ou coleta de eventos. O colecionador compra até um lote ×3 acessível do ovo mais avançado no fim de cada marco listado, antes de renascer, equipa Equilibrado e mantém a mesma política de PP do cenário base. RNG fixo apenas no simulador; não promete sorte média de uma partida.

| Marco-alvo | Jornada sem pets | Jornada do colecionador | Pets acumulados |
| --- | ---: | ---: | ---: |
| 1 | 473 s | 473 s | 3 |
| 2 | 594 s | 558 s | 6 |
| 3 | 609 s | 569 s | 9 |
| 5 | 803 s | 708 s | 12 |
| 10 | 1036 s | 890 s | 15 |

A primeira jornada permanece em 473 s; depois a equipe acelera a progressão sem alterar a curva ou inventar PP. No marco 10 deste modelo, a jornada foi cerca de 14% menor. O saldo usado no fim da jornada seria reiniciado pelo prestígio: não é uma política ótima nem um teste do custo de oportunidade de comprar ovos cedo.

Em um snapshot com 25 fábricas (15 máquinas, oito caldas, duas fábricas, Morango, sem prestígio), a taxa real é 103,5 PPS: o Cristalizado custa cerca de 966 s de renda passiva nesse ponto. Com 100 fábricas distribuídas e prestígio 3/Ímpeto 1, o snapshot produz cerca de 87.749 PPS: o Celestial custa cerca de 114 s. São comparações de estados documentados, não garantia de tempo para desbloquear. Um Dragão Galáctico Gigante exige 125 cópias Míticas: a 1%, são **12.500 ovos em expectativa**, com grande variância, nunca uma garantia/pity oculto. O objetivo é uma coleção de longo prazo.

## Arquitetura e arte substituível

Novos arquivos:

```text
pages/pets.html
css/pets.css
js/pages/pets.js           DOM, painéis e diálogos
js/pets/catalog.js        3 ovos, 18 espécies, estágios e sorteio único
js/pets/state.js          defaults, IDs, validação e desbloqueios
js/pets/actions.js        hatches, equipe, flags e fusão transacionais
js/pets/bonuses.js         cálculo puro e Equipar melhores
js/pets/evolution.js       validação/prévia das cinco fontes
js/pets/inventory.js       filtros, ordenação e paginação
js/pets/auto.js            sessão de auto com um timer e lifecycle
js/pets/art.js             SVGs de ovos e pets, com fallback
js/pets/view.js            cartões de resultado/inventário
scripts/simulate-pets.mjs
tests/pets.test.js
tests/pets_browser.py
assets/images/pets/.gitkeep
assets/images/eggs/.gitkeep
docs/PETS_UPDATE.md
```

Integrações modificadas: `js/data.js`, `js/gameplay.js`, `js/progression.js`, `js/world.js`, `js/storage.js`, `js/core/runtime.js`, `js/ui/shared.js`, `js/ui/assets.js`, controladores/HTML de Coleção, Prestígio, Ajustes e Estatísticas, scripts Android, `package.json`, workflow web, regressões de schema/PWA/prestígio e a lista de páginas do teste Android. `README.md`/`AGENTS.md` e guias de arte/Android/PWA foram atualizados. A contagem única de fábricas foi movida para `progression.js`, mantendo o reexport anterior; o cálculo é o mesmo.

Para a artista, consulte também `ART_GUIDE.md`. Coloque PNG/WebP locais em `assets/images/pets/` ou `assets/images/eggs/` e preencha `ARTWORK.pets.<id>` / `ARTWORK.eggs.<id>` em `js/ui/assets.js`. `null`, caminho inválido ou falha de imagem mantém o SVG. Um desenho por espécie funciona nos quatro estágios; o selo de evolução e os bônus permanecem independentes. Nada é requisitado por nomes inventados e não há serviços de imagem remotos. O build inclui os arquivos; a PWA aquece mídias opcionais sob demanda e o APK as embarca. Não é o Art Overhaul planejado.

Extensões futuras devem usar os IDs estáveis e o cálculo central de espaços/coeficientes, com migração explícita. Novos mundos, usos alternativos de duplicatas e trocas não foram simulados como funcionalidades prontas.

## PWA e Android

O build existente gera automaticamente nova release por conteúdo, incluindo os **dez HTMLs**, novos módulos e CSS. O `sw.js` fonte e o protocolo de atualização não foram substituídos nem receberam versão manual. Abertura automática para quando o runtime prepara a troca de controlador; o teste faz uma atualização real A → B com auto ativa, confere o último lote e reabre Pets offline no subdiretório `/Lollipop-Clicker-TEST/`.

O preparador Android agora relata/valida dez documentos, incluindo Pets. ID, permissões, assinatura, versão de pacote e configuração Capacitor foram preservados. O app continua embarcando todos os arquivos; um SW não atualiza o APK. A atualização nativa exige novo APK com assinatura compatível. Não desinstale uma instalação com progresso para contornar assinatura; exporte backups e use o canal de assinatura consistente descrito em `android/BETA.md`.

## Validação executada

| Verificação | Resultado local |
| --- | --- |
| `npm ci` | Dependências fixadas instaladas |
| `npm run check` | 51 JS e dez HTMLs verificados |
| `npm test` | **183 testes passaram**, 70 novos de pets |
| `node scripts/simulate-pets.mjs` | Cenários acima, sem valores não finitos |
| `npm run pwa:build` | Artefato com dez páginas e hashes verificados |
| `npm run test:pets` | **70 verificações Chromium passaram** |
| `npm run test:pwa` | **32 verificações de lifecycle passaram** |
| `npm run test:browser` | **112 verificações gerais passaram** |
| `python3 tests/prestige_browser.py` | **60 verificações passaram** |
| `python3 tests/music_browser.py` | **62 verificações passaram** |
| `python3 tests/qol_browser.py` | **122 verificações passaram** |
| `python3 tests/artwork_browser.py` | **13 verificações passaram** |
| `npm run android:sync` + `node scripts/check-android.mjs` | Dez documentos e assets locais conferidos |
| Gradle `:app:assembleDebug --offline` com SDK35/JDK21 | **APK debug compilado com sucesso** |

Total: **471 verificações de navegador**, com layouts desktop/celular, teclado, probabilidades, lotes, auto/parada/pausa/update, fusão e rollback, favoritos/bloqueios, equipamento, 500 pets sem reconstrução por tick, filtros, save v4, export, prestígio, readonly e offline. A validação do bundle Android por HTTP local não equivale a executar o APK em Android WebView.

O ambiente tinha apenas JRE21; a compilação foi concluída com JDK21 Temurin isolado, obtido da fonte oficial e validado por SHA-256, usando o cache Gradle existente. O APK em `android/app/build/outputs/apk/debug/app-debug.apk` contém os bytes finais de Pets conferidos contra `www/`. Não houve emulador/aparelho físico disponível; Safari/Firefox e medição de FPS/bateria não foram executados. O teste Android instrumentado passou a incluir a rota Pets, mas não foi executado em dispositivo nesta tarefa.

## Roteiro de revisão manual

1. Exporte um save v4 real antes de testar. Carregue a atualização e compare PP, Ímpeto, capacidades, coleções, histórico e o backup original v4 nos Ajustes.
2. Abra **Pets** pelo Mais ou pelo atalho da Coleção. Confira os três preços/requisitos e abra as probabilidades; teste ×1/×2/×3 e a opção sem animação.
3. Equipe/retire pets e use as três estratégias. Observe clique, PPS, comparações de sabores e dano da Arena; sem fábricas, pets não criam PPS sozinhos.
4. Marque favoritos/bloqueados. Selecione cinco iguais, revise IDs, cancele; depois confirme. Repita até Gigante. Equipados exigem consentimento adicional; o álbum deve preservar todos os estágios descobertos.
5. Ative auto, pressione Parar e aguarde. Repita ocultando o app ou saindo da página; retornar não pode reiniciar. Confira estoque cheio e saldo insuficiente, sem compras parciais.
6. Faça prestígio e confira a mesma equipe/IDs/estágios/flags, ovos e descobertas, com fábricas/saldo reiniciados pelas regras anteriores.
7. Recarregue e teste sem rede na PWA. Abra uma segunda aba de consulta e confira controles bloqueados. Valide o update sem limpar dados conforme `PWA_UPDATES.md`.
8. Em Android real, instale uma build de assinatura compatível, desative a rede, teste Pets, auto, som, voltar/diálogos, background, reinício, export/import e atualização sobre uma versão anterior com progresso. Não tratar o APK local debug como canal permanente de assinatura.

## Entrega e limites

Implementação na branch compartilhada **`dev`**, com commits focados; hashes e PR constam no relatório de entrega. Não há merge para `main`, alteração das configurações de produção ou publicação automática desta expansão. O workflow publica somente após uma futura integração autorizada em `main`.

Não há login, servidor, troca, leaderboard, mercado, premium, anúncios, nova moeda, novo mundo, auto-fusão ou redesign geral. O comportamento no hardware real e o ritmo de coleta/evolução ainda precisam de sessões humanas; a simulação não prova uma política ótima nem garante a sorte de cada jogador.

### Lista final de arquivos

Arquivos criados:

```text
assets/images/eggs/.gitkeep
assets/images/pets/.gitkeep
css/pets.css
docs/PETS_UPDATE.md
js/pages/pets.js
js/pets/actions.js
js/pets/art.js
js/pets/auto.js
js/pets/bonuses.js
js/pets/catalog.js
js/pets/evolution.js
js/pets/inventory.js
js/pets/state.js
js/pets/view.js
pages/pets.html
scripts/simulate-pets.mjs
tests/pets.test.js
tests/pets_browser.py
```

Arquivos existentes modificados:

```text
.github/workflows/pages.yml
AGENTS.md
README.md
android/app/src/androidTest/java/com/ermzy/lollipopclicker/GameOfflineTest.java
docs/ART_GUIDE.md
docs/PRESTIGE_BALANCE.md
docs/PWA_UPDATES.md
docs/android/BETA.md
js/core/runtime.js
js/data.js
js/gameplay.js
js/pages/prestige.js
js/pages/settings.js
js/pages/statistics.js
js/progression.js
js/storage.js
js/ui/assets.js
js/ui/shared.js
js/world.js
package.json
pages/collection.html
pages/prestige.html
pages/settings.html
pages/statistics.html
scripts/android-web.mjs
scripts/check-android.mjs
tests/browser_smoke.py
tests/economy.test.js
tests/music_browser.py
tests/prestige.test.js
tests/prestige_browser.py
tests/pwa-build.test.js
```
