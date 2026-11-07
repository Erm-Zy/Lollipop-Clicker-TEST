# Prestígio, pontos e capacidade das fábricas

> Relato histórico da atualização de Prestígio. O schema atual é 6: [Pets & Eggs](PETS_UPDATE.md) e [Balanceamento](BALANCE_REWORK.md) preservam a curva histórica, acrescentam PP de pets com ledger e capacidade equipada, e encerram a exceção antiga de reset automático. Novos legados incompatíveis ficam protegidos para exportação, sem apagar o primário.

Atualização na branch compartilhada `dev`, em 6 de novembro de 2026. A versão do **save** passa a 4; isso é independente da versão do jogo/APK. Não foram acrescentados pets, fábricas, chefes, moedas além dos PP ou novas mecânicas de Arena.

## Regras atuais que estendem o relato histórico

No schema6, `getPrestigeGain` continua retornando níveis base. `getPrestigeReward` expõe base/extra/total: extra = floor(base × min(25%, bônus PP equipados)), com orçamento seguro. `prestigeBonusEarned` acumula apenas extras efetivamente resgatados; o orçamento permanente considera nível histórico + ledger − gastos. UI, confirmação, reload, import/export e rollback usam a mesma contabilidade. Fábricas extras compradas com pets ficam possuídas mas inativas sem a capacidade equipada. [Fórmulas completas, matriz, migração e testes](BALANCE_REWORK.md). As tabelas e exemplos seguintes descrevem o lançamento original de Prestígio, sem pets equipados.

## Níveis e Pontos de Prestígio

A curva cumulativa continua:

```text
níveis conquistáveis = floor(cbrt(totalEarned / 1.000.000))
ganho = níveis conquistáveis − marcos já resgatados
```

O primeiro marco é 1 milhão; depois 8 milhões, 27 milhões, 64 milhões etc. O cálculo corrige arredondamento da raiz em marcos exatos. Só o ganho ainda não resgatado é concedido. Renascer com +3 níveis credita **3 PP** disponíveis, aumenta o nível histórico em três e registra os novos marcos como resgatados.

**Gastar PP não reduz nível histórico nem marcos resgatados.** Fábricas, sabores e cosméticos continuam custando doces; os PP só compram as melhorias permanentes do Santuário. Renascimento e compras em PP exigem uma escrita persistida pelo runtime; falhas de escrita revertem a transação, e outra aba fica em consulta.

Há um teto técnico de `Number.MAX_SAFE_INTEGER` para níveis, pontos e marcos, para manter débitos inteiros confiáveis. Valores de produção continuam limitados pelo `MAX_VALUE` existente. No teto técnico não se oferecem mais níveis nem uma porcentagem inválida.

## Ímpeto Estelar

| Nível atual | Custo do próximo nível | Multiplicador próprio |
| --- | --- | --- |
| 0 | 1 PP | ×1 |
| 1 | 2 PP | ×1,05 |
| 2 | 3 PP | ×1,10 |
| 5 | 6 PP | ×1,25 |
| 10 | 11 PP | ×1,50 |
| 20 | MAX | ×2 |

São vinte níveis de +5% cada, com custo total **210 PP**. A combinação é multiplicativa:

```text
base = 1 + nível histórico × 0,15
Ímpeto = 1 + nível de Ímpeto × 0,05
multiplicador permanente = base × Ímpeto
```

No nível histórico 3 e Ímpeto 1: `1,45 × 1,05 = 1,5225`, ou +52,25%. A mesma função alimenta clique, PPS, estatísticas, prévias de sabores, contribuição da Loja, produção offline, dano e recompensas que já dependiam desses valores. Não existe uma segunda aplicação do bônus na UI. Comprar Ímpeto integra a produção passada com a taxa antiga antes de aumentar o multiplicador.

## Capacidades e expansões

| Fábrica / ID | Base | Após dez expansões |
| --- | ---: | ---: |
| Máquina de Pirulitos / `maquina` | 40 | 140 |
| Calda Açucarada / `calda` | 25 | 125 |
| Fábrica de Doces / `fabrica` | 25 | 125 |
| Misturador de Sabores / `misturador` | 15 | 115 |
| Embaladora Automática / `embaladora` | 15 | 115 |
| Laboratório de Açúcar / `laboratorio` | 15 | 115 |
| Linha de Produção / `linha` | 20 | 120 |
| Super Fábrica de Pirulitos / `superfabrica` | 20 | 120 |

Cada fábrica possui seu próprio nível de expansão, de 0 a 10. Cada nível libera **dez espaços**, por **2, 4, 6, …, 20 PP**, totalizando **110 PP por fábrica**. A capacidade é derivada de base + nível × 10; não há outro campo persistido de capacidade. Os oito máximos custam 880 PP; todos os permanentes juntos custam **1.090 PP**.

**Espaços não são unidades grátis.** Depois de expandir, compre as fábricas normalmente na Loja. Preços base, PPS base e multiplicador de preço **1,15** não mudaram. ×1/×10/×100 continuam lotes inteiros: com cinco espaços livres, ×10 falha sem comprar cinco. MAX compra apenas o prefixo acessível que caiba no saldo e na capacidade. O último espaço pode ser comprado; depois, aparece “Limite atingido”, sem previsão de tempo enganosa. Um lote grande demais explica quantos espaços restam.

O jogador pode guardar pontos para uma expansão, investir em clique/produção com Ímpeto ou equilibrar os dois. A soma das capacidades base é **175**, portanto o capítulo final, que pede cem fábricas no total, continua alcançável sem expansão.

## O que o renascimento muda

**Reinicia:** saldo, quantidades possuídas, batalha ativa, bônus temporário, bônus raro de clique da roleta e evento de açúcar ativo. O próximo evento é reagendado como antes.

**Preserva:** nível histórico, PP disponíveis, Ímpeto, expansões, total histórico produzido, sabores, três visuais independentes, conquistas, estatísticas e cooldowns. As descobertas musicais continuam no registro independente. Uma Máquina expandida para cinquenta começa a próxima jornada em **0 / 50**. Um giro pendente precisa terminar antes de renascer.

## A barra da jornada

O novo campo `prestigeBaseline` registra `totalEarned` no instante do renascimento. O histórico não é zerado.

```text
produzido nesta jornada = max(0, totalEarned − prestigeBaseline)
marco a resgatar = (prestigeClaimed + 1)³ × 1.000.000
necessário na jornada = max(0, marco − prestigeBaseline)
restante = max(0, marco − totalEarned)
```

Sem ganho disponível, a barra é produzido/necessário, limitada a 0–100%. Com um ou vários níveis disponíveis, mostra 100%. Depois de renascer, a baseline coincide com o histórico e a barra volta imediatamente a **0%**, inclusive após refresh. Rótulo acessível e `aria-valuenow` descrevem a jornada atual.

A regressão dos **215,2 bilhões** foi reproduzida: ao resgatar o nível 59, o histórico permanece 215,2 bi, o novo marco é 216 bi, a barra é 0% e faltam **800 milhões**. Mais 400 milhões levam a 50%; outros 400 milhões, a 100%.

## Simulações e decisões

Reproduza com:

```sh
node scripts/simulate-prestige.mjs
```

Modelo determinístico de taxa esperada: **dois cliques por segundo**, compras por retorno marginal, seleção entre sabores livres já desbloqueados e compra de sabores pagos quando competitivos. Usa os getters, produção, preços e ações reais do jogo. Integra cliques como taxa contínua esperada entre eventos. Não inclui Arena, roleta, boosts, eventos coletados, ausência gratuita ou atraso humano. Os tempos são comparações do modelo, não promessa de duração de uma partida real ou prova de uma política ótima.

As capacidades sugeridas inicialmente (**100/85/70/60/50/40/30/20**) não limitaram nenhuma fábrica nos cenários até nível 30; a primeira expansão da política só ocorreu no 60. Por isso, reduzi os limites iniciais/intermediários para trazer a escolha ao começo, mantendo Super Fábrica em vinte e sem alterar preços/PPS.

Nos limites adotados, o Misturador atinge quinze no cenário do nível 3: os dois PP acumulados podem comprar Ímpeto 2 **ou** dez espaços no Misturador. A primeira jornada permanece em **473 segundos** nos dois conjuntos de limites.

Cada linha abaixo é o tempo da jornada entre o marco anterior listado e o marco-alvo; não é tempo cumulativo. Após o resgate, “Ímpeto primeiro” compra os níveis acessíveis do boost; “Capacidade primeiro” compra uma expansão da fábrica cheia com maior PPS base, quando possível, e usa o restante em Ímpeto.

| Marco-alvo | Ímpeto primeiro | Capacidade primeiro |
| --- | ---: | ---: |
| 1 | 473 s | 473 s |
| 2 | 594 s | 594 s |
| 3 | 609 s | 609 s |
| 5 | 803 s | 840 s |
| 10 | 1.036 s | 1.034 s |
| 30 | 1.348 s | 1.401 s |
| 60 | 1.251 s | 1.238 s |
| 100 | 2.213 s | 1.640 s |

Expandir cedo tem custo de oportunidade: no marco 5 a política de expansão ficou mais lenta; no cenário do marco 100 ela ficou cerca de **26% mais rápida**. As capacidades pressionam a diversificação, e as expansões das fábricas avançadas ganham valor quando elas enchem. Os dois caminhos chegaram aos marcos sem estagnação. Mantive os +5%, custos e máximos sugeridos para os permanentes; Ímpeto limita-se a ×2 e não substitui o bônus histórico.

Um estado tardio representativo com nível histórico **1.090**, sabor Lendário, todos os permanentes pagos com exatamente 1.090 PP e nenhuma fábrica inicial alcançou o nível **1.091 em 201 s** no modelo, terminando com aproximadamente **21,69 bilhões PPS**, sem valores não finitos. Esse cenário é inicializado como estado tardio, não uma simulação de todas as 1.090 jornadas. Com os permanentes no máximo, o catálogo atual de gastos em PP se esgota; não foram criados novos sumidouros ou conteúdo fora do escopo.

Ainda faltam sessões humanas para avaliar ritmo, preferências de investimento e contribuição real da Arena/roleta. A prioridade por retorno marginal não demonstra que todas as oito expansões são igualmente eficientes.

## Save 4: migração e reset autorizado

Campos novos: `prestigePoints`, `stellarBoostLevel`, `factoryExpansions` e `prestigeBaseline`. `prestigeLevel`, `prestigeClaimed`, `totalEarned` e a chave principal `lollipopSave` continuam com seus significados.

1. **Saves antigos dentro das capacidades base:** são migrados. Como as melhorias permanentes não existiam antes, cada nível histórico vira um PP ainda não gasto; novos upgrades começam em zero. A baseline começa no histórico salvo, pois o instante real do último renascimento não existia no formato antigo. Ganhos históricos ainda não resgatados continuam disponíveis. A migração é persistida como versão 4; reload não recredita os pontos.
2. **Saves antigos com fábrica acima da base:** têm o reset único de beta explicitamente autorizado pelo proprietário. Preservar quantidades acima dos limites ou dar expansões gratuitas criaria outro sistema de exceções e pontos sem custo; optei pelo estado novo coerente. O original é guardado em **`lollipopSave.pre-prestige-v4`**, sem apagar outras chaves, antes de escrever o novo save. Há aviso persistente em português e botão de exportar o backup nos Ajustes. Se backup/escrita não funcionar, o original não é sobrescrito e o salvamento permanece protegido.
3. **Dados corrompidos ou versão futura:** continuam protegidos pelas regras de recuperação. Não são classificados como reset de beta. Backups incompatíveis não são restaurados automaticamente. Importar um save antigo acima das capacidades é recusado; saves compatíveis e versão 4 continuam importáveis.

Saves antigos compatíveis também mantêm backup bruto nas chaves `legacy-v1`, `legacy-v2` ou **`legacy-v3`**. A validação atual limita PP ao nível histórico menos os custos das melhorias, remove IDs inválidos, limita níveis e normaliza a baseline. Se melhorias malformadas não couberem no orçamento histórico, são reduzidas em ordem determinística (Ímpeto e depois ordem das fábricas). Campos ausentes em um save já versão 4 não recriam PP a partir do nível.

Essa autorização de reset é exclusiva desta atualização; não relaxa a proteção normal de saves futuros. A segunda aba não recebe permissão de escrita para migrar/resetar. Preferências da Jukebox e da interface são independentes e não são apagadas.

## Arquivos e validação

- Regras/dados: `js/data.js`, `js/gameplay.js`, novo `js/progression.js`, `js/storage.js`.
- Telas: `js/pages/prestige.js`, `pages/prestige.html`; Loja em `js/ui/shop.js`/`qol.js`; estatísticas em `js/pages/statistics.js` e HTML correspondente.
- Transações: `js/core/runtime.js` adia anúncios de conquistas/recompensas até confirmar uma ação que exige save.
- Recuperação: `js/pages/settings.js`, `pages/settings.html`, aviso em `js/ui/shared.js`.
- Layout/cache: `css/pages.css`, `css/responsive.css`, `sw.js`.
- Testes/simulação: novos `tests/prestige.test.js`, `tests/prestige_browser.py`, `scripts/simulate-prestige.mjs`; regressões existentes ajustadas para schema 4 e lotes com capacidade expandida.
- Referências: `AGENTS.md`, `README.md`, `docs/android/BETA.md` e capturas. Nenhuma dependência foi acrescentada.

| Comando executado | Resultado |
| --- | --- |
| `npm run check` | 36 JS e nove HTMLs verificados |
| `npm test` | **112 verificações passaram**, incluindo 27 novas de prestígio/capacidades/migração/atomicidade/simulação |
| `node scripts/simulate-prestige.mjs` | Cenários determinísticos completos acima, sem estagnação ou valores não finitos |
| `python3 tests/browser_smoke.py` | **107 verificações passaram** |
| `python3 tests/qol_browser.py` | **122 verificações passaram** |
| `python3 tests/music_browser.py` | **62 verificações passaram**, incluindo OGG real e PWA offline |
| `python3 tests/artwork_browser.py` | **13 verificações passaram** |
| `python3 tests/prestige_browser.py` | **60 verificações passaram** |
| `npm run android:prepare && node scripts/check-android.mjs` | Nove documentos, assets/módulos locais e ID estável verificados |

Navegadores testados com `LOLLIPOP_BASE_URL=http://127.0.0.1:8016/Lollipop-Clicker-TEST/`, reproduzindo subdiretório do GitHub Pages. Node 24.22.1 e Chromium headless com Playwright. O Santuário e a Loja foram verificados de **280 a 1440 px**, sem overflow e com conteúdo final alcançável acima da barra inferior. Os testes cobriram cancelamento/confirmação, refresh, PP em duas abas, rollback por quota, reset único e exportação do backup bruto.

Não houve compilação de APK, teste em aparelho/emulador, Safari/Firefox ou medição de FPS/bateria nesta tarefa. A preparação web Android passou; ID, assinatura e workflow não foram alterados. Arena, probabilidades de recompensas, conteúdo, arte opcional, Jukebox e músicas foram preservados; taxas que usam clique/PPS recebem o novo multiplicador, como previsto.

## Capturas

Capturas reais do Chromium, com movimento reduzido e notificações transitórias ocultas; nas imagens de página inteira, a barra fixa fica na posição da viewport.

- [Santuário no desktop](screenshots/prestige/desktop-sanctuary.png)
- [Santuário no celular, Ímpeto e expansões](screenshots/prestige/mobile-sanctuary.png)
- [Loja compacta com capacidades](screenshots/prestige/mobile-shop-capacity.png)
