# Balanceamento da economia e especializações de Pets

Implementação na `dev`, sem merge/publicação. Regras do save **6**, compatíveis com v5. A proposta por espécie foi registrada antes da calibração em [BALANCE_DESIGN.md](BALANCE_DESIGN.md). IDs, espécies, probabilidades, inventário de 500, três slots, cinco fontes por fusão e intervalo auto de 2,4 s permanecem.

## Auditoria, em ordem de gravidade

| Gravidade | Causa e evidência | Decisão |
|---|---|---|
| CRITICAL | PP extra sem ledger perderia autorização no carregamento; remover validação permitiria gastos sem lastro | `prestigeBonusEarned`, limite cumulativo e orçamento integrado |
| CRITICAL | Capacidade só no limite de compra permitiria comprar com pet e produzir sem ele; normalização antiga apagaria excedentes | separar possuídas/ativas/permanentes/efetivas; preservar propriedade |
| HIGH | Celestial de 10M a 42,1M PPS: 0,2375 s; lote 30M recebe 101,04M no intervalo de auto | preço fixo 5B e convite ligado a instalações reais; nenhuma cobrança retroativa |
| HIGH | Fator ×35 deixava Marshmelinho Gigante +87,5% PPS superar muitos Normais avançados indiferenciados | canais especializados; ×1/2/4/8 em renda/combate; escalas próprias para PP/espaços |
| HIGH | HP ×1,6 por toda vitória cresce indefinidamente; no estado do jogador ataque antigo ~14,85 não acompanha fábricas | preservar primeiras dez potências e histórico, depois crescimento linear; preparo fabril contribui para ataque |
| HIGH | Percentual sem limite da roleta rende 1/6 do saldo em expectativa a cada 5 min, antes de demais efeitos (~6,36× saldo/h de giros, em expectativa) | novos giros limitados a 600 s de PPS sem boost; antigos pendentes honrados |
| MEDIUM | 31 operações individuais por Gigante e inventário cheio | prévia atômica de fusão em lote, encadeamento opcional, reserva, liberação deliberada |
| MEDIUM | Arena/recompensas/produção com a mesma equipe; três slots cheios exigiam retirada | seis estratégias, quatro conjuntos e troca direta |

A roleta conserva seis resultados equiprováveis, mínimo 100, boost e +100/clique nesta jornada. O limite novo não reescreve giros comprometidos. O bônus de clique da roleta continua poderoso e temporário à jornada; avaliar frequência em sessões humanas antes de outra mudança. Nenhum saldo, bônus existente ou estatística histórica é confiscado.

## Modelo reproduzível

`npm run balance` e `node scripts/simulate-pets.mjs` reutilizam preços, getters e transações reais. `tests/fixtures/balance-v5.json` foi produzido pelo mesmo harness contra o código original `db03583` (`git archive` em diretório temporário, `BALANCE_ROOT=... node scripts/balance-report.mjs`), antes de alterar a economia. O relatório atual é calculado novamente, não uma fórmula paralela.

Fixtures de comparação são **controladas e financiadas explicitamente**, não tempo de jogo medido: prestígio e melhorias comprados com ações reais; todas as fábricas/sabores também comprados pelo motor. A alocação do jogador é legítima sob os limites: 40/25/25/15/15/15/13/19 unidades, Morango, nível histórico 30, Ímpeto 7 (28 PP), sem pets/boost; produz 41.987.038,50 PPS, próximo do relato. O cálculo exato a 42,1M é mostrado separadamente. Não alteramos saves de jogadores.

Perfis: fresco (zero PPS com zero cliques permanece parado), entrada dos ovos, jogador e progresso permanente rico (nível 1090, Ímpeto20, dez expansões por tipo, custos reais 1090 PP). Políticas: fábricas primeiro, colecionador, prestígio com compra de um time Cristalizado, especialista de Arena e casual em check-ins de dez minutos; 0 ou 2 cliques/s. A política 0/s dá apenas cliques manuais suficientes para iniciar uma máquina em cada renascimento; não inventa produção do nada. Casual recebe no máximo 30 s de cliques por visita e usa `advance(...,{offline:true})`. Jornadas excluem roleta, boost e eventos; a política Arena executa combates explícitos e desconta o tempo sem renda de cliques comuns. As demais excluem Arena para não atribuir benefícios combinados a pets. Estados instantâneos com boost ficam separados.

## Preços, requisitos e metas

| Ovo | Preço atual fixo | Novo desbloqueio permanente |
|---|---:|---|
| Açucarado | 1.500 | Início |
| Cristalizado | 1.000.000 | Marco existente de 25 fábricas + 1 Laboratório |
| Celestial | 5.000.000.000 | Marco existente de 100 fábricas + 10 Super Fábricas + nível histórico 10 |

Saves anteriores mantêm todos os ovos já registrados e os marcos antigos de 25/100 da jornada salva, mesmo sem as instalações novas. Descobertas também comprovam o desbloqueio. Regras futuras usam **possuídas**, incluindo inativas; nunca relockam depois de desequipar/prestigiar. Não há classes de jogador, novos mundos, preço escalonado, espera paga ou bloqueio novo de auto.

Metas testadas: Açucarado <20 s no estado de 25 fábricas; Cristalizado 60–180 s no estado com primeiro laboratório; Celestial 180–900 s no estado de entrada avançado; a 42,1M PPS, >100 s e auto ×3 insustentável; estado permanente rico consegue sustentar auto.

| Cenário/ovo relevante | PPS sem pets/boost | Antes: s/ovo | Agora: s/ovo | Agora: s/×3 | Auto ×3 sustentável? |
|---|---:|---:|---:|---:|---|
| starter / acucarado | 103,50 | 14,49 | 14,49 | 43,48 | Não |
| crystal / cristalizado | 11.610,11 | 8,61 | 86,13 | 258,40 | Não |
| celestial / celestial | 9.548.460,00 | 1,05 | 523,64 | 1.570,93 | Não |
| player / celestial | 41.987.038,50 | 0,24 | 119,08 | 357,25 | Não |
| late / celestial | 49.445.370.520,00 | 0,00 | 0,10 | 0,30 | Sim |
| Relato exato / Celestial | 42.100.000 | 0,24 | 118,76 | 356,29 | Não |

Auto ×3 exige `3*preço/2,4` PPS sustentados: 1.875 / 1.250.000 / **6.250.000.000** respectivamente. Saldo grande permite um lote finito, não prova sustentabilidade. Boost 2× dura 30 s e não foi tratado como produção permanente.

O próximo investimento no estado Cristalizado é um Misturador de 12.000 com ganho 376,74 PPS (retorno ~31,85 s); abrir um ovo custa ~83 desses preços, sem prometer retorno monetário imediato. No estado Celestial, a próxima Linha custa 80.911.154, ganho132.000 PPS (~613 s de retorno), enquanto um ovo custa ~61,8 dessas unidades. No estado do jogador, próxima Linha custa123.055.752, ganho326.700 PPS (~377 s), e o ovo custa~40,6 dessas compras. Fábricas continuam sendo uma alternativa econômica forte; escolher especialistas tem custo de oportunidade real. O relatório inclui as oito fábricas e capacidades, não preços fictícios de planilha.

### Jornadas antes/depois (segundos até nível histórico 100, múltiplos ciclos)

| Política | Antes | Agora | Convite Cristalizado atual | Convite Celestial atual |
|---|---:|---:|---:|---:|
| factories-first-0cps | 19.665,31 | 19.665,31 | 1.330,97 | 6.971,99 |
| collector-0cps | 8.457,32 | 8.272,39 | 1.249,80 | 4.827,59 |
| prestige-0cps | 9.032,70 | 7.741,52 | 1.299,17 | 4.734,88 |
| arena-0cps | 8.408,61 | 8.058,03 | 966,50 | 4.593,13 |
| casual-0cps | 365.400,00 | 365.400,00 | 107.400,00 | não atingido nesta política |
| factories-first-2cps | 18.864,82 | 18.864,82 | 981,89 | 6.202,50 |
| collector-2cps | 7.788,04 | 7.615,63 | 919,02 | 4.185,12 |
| prestige-2cps | 8.325,81 | 7.070,24 | 959,40 | 4.075,49 |
| arena-2cps | 8.196,77 | 7.583,93 | 821,77 | 4.134,48 |
| casual-2cps | 367.800,00 | 367.800,00 | 114.600,00 | não atingido nesta política |

Colecionador a 2/s: primeiro time de três em **202,85 s**; seu primeiro prestígio leva cerca de oito minutos. O casual compra uma unidade por visita, uma política deliberadamente conservadora, não previsão de tempo humano. O caminho por retorno não prova estratégia ótima. O relatório guarda ganho de PP e tempo de cada ciclo (1/2/3/5/10/30/60/100), alocações completas, sabores, expansão, dano e alternativas.

## Matriz final de espécies (Normal)

Coeficientes percentuais são somados por canal nos **três equipados válidos**. IDs/raridades/chances originais preservados. Nenhum pet oferece todos os papéis.

| ID / espécie | Ovo | Clique | PPS | Dano de chefe | PP futuro | Espaços por tipo |
|---|---|---:|---:|---:|---:|---|
| `balinha` / Balinha Saltitante | acucarado | 6,00% | 0,00% | 0,00% | 0,00% | — |
| `marshmelinho` / Marshmelinho | acucarado | 0,00% | 4,00% | 0,00% | 0,00% | — |
| `goma` / Ursinho de Goma | acucarado | 0,00% | 2,00% | 25,00% | 0,00% | — |
| `raposa_morango` / Raposa de Morango | acucarado | 9,00% | 2,00% | 0,00% | 0,00% | — |
| `guardiao_pirulito` / Guardião Pirulito | acucarado | 0,00% | 3,00% | 60,00% | 0,00% | — |
| `cubinho` / Cubinho Gelado | cristalizado | 0,00% | 12,00% | 15,00% | 0,00% | — |
| `gotinha` / Gotinha de Cristal | cristalizado | 0,00% | 8,00% | 0,00% | 2,00% | — |
| `coelho_quartzo` / Coelho de Quartzo | cristalizado | 16,00% | 6,00% | 0,00% | 0,00% | — |
| `raposa_geada` / Raposa de Geada | cristalizado | 5,00% | 0,00% | 100,00% | 0,00% | — |
| `coruja_prismatica` / Coruja Prismática | cristalizado | 0,00% | 14,00% | 0,00% | 4,00% | — |
| `dragao_cristalino` / Dragão Cristalino | cristalizado | 0,00% | 18,00% | 150,00% | 0,00% | — |
| `estrelinha` / Estrelinha Doce | celestial | 0,00% | 30,00% | 0,00% | 0,00% | — |
| `cometinha` / Cometinha | celestial | 35,00% | 0,00% | 40,00% | 0,00% | — |
| `coelho_lunar` / Coelho Lunar | celestial | 0,00% | 12,00% | 0,00% | 0,00% | misturador: +1, embaladora: +1, laboratorio: +1 |
| `raposa_nebulosa` / Raposa Nebulosa | celestial | 10,00% | 0,00% | 0,00% | 6,00% | — |
| `fenix` / Fênix Açucarada | celestial | 0,00% | 20,00% | 300,00% | 0,00% | — |
| `guardiao_aurora` / Guardião da Aurora | celestial | 0,00% | 16,00% | 0,00% | 0,00% | linha: +1, superfabrica: +1 |
| `dragao_galactico` / Dragão Galáctico | celestial | 0,00% | 60,00% | 100,00% | 5,00% | — |

| Evolução | Normais equivalentes | Renda/combate | PP | Espaços |
|---|---:|---:|---:|---:|
| Normal | 1 | ×1 | ×1 | ×1 |
| Médio | 5 | ×2 | ×1,5 | ×2 |
| Grande | 25 | ×4 | ×2 | ×3 |
| Gigante | 125 | ×8 | ×3 | ×4 |

Marshmelinho: +4/8/16/32% PPS; Estrelinha: +30/60/120/240%; Dragão Galáctico: +60/120/240/480%. Marsh Gigante ainda supera Estrelinha Normal por 2 pontos, mas o Normal avançado preserva excelente valor de slot sem 31 operações de fusão; isso não impõe uma ordem artificial por raridade. Guardião Pirulito Gigante dá +480% combate contra Fênix Normal +300%, preservando especialização acessível. Máximos matemáticos da equipe: clique ×9,4, PPS ×15,4, combate ×73, PP +25%, até12 espaços por categoria elegível. Não se multiplicam pets entre si.

Equipar Melhores: Produção usa PPS **real com ativação** de unidades; Cliques usa renda por clique; Combate usa o getter de dano real, incluindo ativação por capacidade; Prestígio maximiza o PP inteiro do próximo resgate (ou a taxa futura quando não há marco), considerando o teto e arredondamento; coeficiente PPS desempata; Construção usa soma de espaços ponderados pelo PPS base dos tipos; Equilibrado soma variação relativa de produção real e clique. Não depende de raridade. Busca exata de combinações para efeitos conjuntos; agrupa cópias equivalentes e elimina apenas candidatos com três dominadores, preservando IDs estáveis por aquisição. Não roda por tick. Quatro conjuntos guardam IDs; cópias indisponíveis são ignoradas, nunca recriadas. Trocas integram produção anterior uma vez; Equipar Melhores resolve também renda e giros pendentes antes de pontuar o novo time, inclusive se um marco de PP foi cruzado entre frames.

### Equipes Normais no estado do jogador

| Estratégia | PPS | Dano/toque sem boost | PP próximo resgate: bônus/total |
|---|---:|---:|---|
| no-pet | 41.987.038,50 | 3.239,87 | 0/31 |
| clicks | 44.506.260,81 | 4.535,82 | 1/32 |
| production | 88.172.780,85 | 16.199,35 | 1/32 |
| combat | 83.134.336,23 | 21.059,16 | 1/32 |
| prestige | 73.057.446,99 | 6.479,74 | 4/35 |
| capacity | 78.935.632,38 | 6.479,74 | 1/32 |
| observed-boosted | 161.230.227,84 | 12.959,48 | 1/32 |

O snapshot antigo com Dragão + dois Guardiões e boost rende `1,44 × 2 = 2,88` do PPS base, não um bônus de pets de 4×. O relato169,6M não é derivável somente de42,1M com essa equipe; possivelmente há diferença de configuração/instante. O harness não inventa um save para forçar esse número. Após o rebalanceamento a mesma propriedade recebe as novas habilidades globais, sem reroll ou perda de instâncias.

## Prestígio: fórmula e contabilidade

`base = getPrestigeGain()` mantém exatamente a curva cúbica e os marcos reivindicados. `taxa = min(25%, soma dos coeficientes PP equipados na evolução própria)`. `extra = floor(base*taxa)` (pontos-base inteiros e divisão BigInt, sem erro de arredondamento próximo de2^53), limitado ao espaço seguro em `MAX_SAFE_INTEGER - nívelHistórico - bônusAcumulado - base`. Ganho base zero implica extra zero. Não há fração guardada, PP retroativo ou bônus ao saldo antigo; a UI mostra explicitamente zero quando arredonda.

No resgate único confirmado: `prestigeLevel += base`, `prestigeClaimed = target`, `prestigePoints += base + extra`, `prestigeBonusEarned += extra`. O ledger cumulativo precisa ser inteiro seguro, não negativo, <=floor(nívelHistórico*25%), com soma segura. O ganho base também respeita o espaço conjunto restante entre nível histórico e ledger; no teto, a jornada anuncia o limite em vez de criar orçamento inseguro. Dados inválidos protegem o save; não autorizam gastos. Orçamento permanente = nível histórico + ledger − custos triangulares de Ímpeto/expansões. Gastos mantêm o ledger, inclusive após reload/import/export. A validação anterior continua aplicada a todos os gastos. Ledger local não é assinatura antifraude contra edição deliberada de JSON.

Prévia e confirmação mostram base/extra/total e saldo existente; a ação revalida a mesma oferta para evitar troca de bônus durante a confirmação. `runtime.act(...,{requireSave:true})` engloba resgate e gastos; falha de persistência reverte também o ledger. Tentativas repetidas/reload não criam novo marco. Níveis, multiplicador base, custos e curva do prestígio não foram reescritos.

## Capacidade equipada e produção

Permanente = base + expansões em PP. Efetiva = permanente + espaços dos pets equipados. Ativas = `min(possuídas, efetiva)` por tipo. As demais permanecem **inativas**, sem reembolso/exclusão/renda, retomando quando a equipe ou expansão suporta. Remover Guardião de24 Super Fábricas com limite permanente20 mantém24 possuídas e só20 produzindo. Preço continua baseado na quantidade possuída; ×1/×10/×100/MAX respeitam espaço efetivo, sem lotes parciais fixos.

Normalização schema6 retém propriedade acima do limite equipado atual (teto técnico conservador10.000 por tipo, muito acima do máximo legítimo atual de140); schema5 migra usando seus limites permanentes válidos. Bônus/capacidades são reconstruídos dos IDs equipados, não salvos como números derivados. Equipe, preset, fusão e compras integram primeiro a taxa antiga; offline usa a equipe salva e separa fim de boost. Não há renda retroativa ao reequipar. Prestígio remove unidades da jornada, preserva permanentes/pets/conjuntos; marcos de mundo/conquista usam possuídas e ovos são monotônicos.

## Arena e economia paralela

`baseAtaque = max(clique sem pets/boost, sqrt(PPS sem bônus de produção dos pets/boost)/2)`; slots ativos contam como preparo. `dano = baseAtaque × (1+soma combate) × boost temporário`. O getter é único na prévia e em `hitBoss`. Bônus de clique/PPS não entram novamente no dano. Baselines são calculados diretamente, sem dividir valores já limitados em1e100.

`HP = floor(100 × 1,6^min(vitórias,10) × (1 + 0,15×max(0,vitórias−10)))`; duração30s/cooldown30s preservados. Histórico e boss ativo anterior preservados. Novas vitórias continuam escalando linearmente depois da décima. Recompensa = menor entre15HP e `max(1500, PPS sem boost×60 + dano sem boost×60)`, limitada ao espaço no saldo. Reduzir HP dos próximos bosses não altera vitórias passadas.

| Vitórias anteriores | HP antigo | HP atual | Tempo 2 toques/s sem pets | Recompensa atual |
|---|---:|---:|---:|---:|
| 0 | 100 | 100 | 0,02 s | 1500 |
| 5 | 1.05e+03 | 1048 | 0,16 s | 15720 |
| 10 | 1.1e+04 | 10995 | 1,70 s | 164925 |
| 20 | 1.21e+06 | 27487 | 4,24 s | 412305 |
| 40 | 1.46e+10 | 60473 | 9,33 s | 907095 |
| 100 | 2.58e+22 | 159429 | 24,60 s | 2391435 |
| 1000 | 1e+100 | 1643769 | 253,68 s | 24656535 |

A 42M PPS, vitória100 agora é viável sem pets (~24,6s); vitória1000 requer preparo: equipe Normal de combate ganha em~19,5s, enquanto sem pets não vence no limite. A recompensa100 é só~0,057s de produção passiva do jogador, tornando combate uma atividade paralela e coleção, não uma impressora infinita de ovos. O harness executa `startBoss/hitBoss` em60 ataques para cada índice, com equipes Normal/Gigante/boost separadas, além das estimativas contínuas. Primeiros bosses ainda premiam preparo novo (mínimo1500).

Sem alteração arbitrária: oito fábricas (custos/PPS, crescimento1,15, capacidades), sabores, escala1M de prestígio, Ímpeto, expansões emPP, conquistas, boost30s/5min, evento30sPPS/minuto, offline8h e integração da expiração. Foram auditados nos cenários e mantêm alternativas úteis. A roleta deixa de crescer com hoarding ilimitado; boost e evento adicionam respectivamente até~10% e50% ao PPS em uso perfeito, separados da linha de base. Fábricas extras de pets entram na produção offline apenas se equipadas, nunca hatches offline.

Sabores grátis/econômicos têm escolhas dominadas (Blueberry supera Morango em renda; Uva só amortiza sua diferença para Limão após crescer), e +100/clique da roleta pode superar compra de sabor focado em clique. Classificação MEDIUM: rever após coleta de playtests de sabor/cliques; mudar tudo junto não é necessário para corrigir a economia dos ovos. Custos altos de expansões adicionais só fazem sentido ao saturar a categoria; não inflacionamos PP ou barateamos fábrica para esconder isso. Sem telemetria ou promessas de otimização humana.

## Probabilidades, tempo de coleção e atrito

Sem mudança de chances: Açucarado60/30/9/1%, Cristalizado50/35/12/3%, Celestial65/25/9/1% nas mesmas raridades elegíveis; espécies da mesma raridade dividem a chance. O harness mostra preço/probabilidade por espécie e por estágio (`cópias/chance`). Normal→Médio→Grande→Gigante equivale1/5/25/125 Normais. Custos esperados são expectativa, não garantia de sorte.

Monte Carlo determinístico, seed20261107,4000 amostras; esperas geométricas independentes equivalentes aos sorteios Bernoulli de uma espécie. Checagem analítica E[N]=cópias/chance. Coleção de todas as espécies por ovo usa500 amostras de sorteios ponderados reais (tabelas do catálogo), tanto Normal quanto125 cópias por espécie.

| Meta Mítica (1%) | E[ovos] | P10 | P50 | P90 | P99 |
|---|---:|---:|---:|---:|---:|
| Primeiro Normal | 100,00 | 11 | 69 | 225 | 453 |
| Primeiro Médio | 500,00 | 244 | 468 | 795 | 1209 |
| Primeiro Gigante | 12.500,00 | 11117 | 12490 | 13927 | 15167 |

Mítico Gigante espera62,5T de doces e12.500 ovos: no snapshot42,1M isso equivale17,2dias de produção contínua; na economia rica49,45B PPS, ~21min de moeda, mas **mínimo2h46min de auto ×3 em primeiro plano**. P90 são13.927 ovos (~3h06min de auto), não um objetivo inicial/obrigatório. É um objetivo de coleção após desenvolver fábricas/permanentes, sem exigir horas para o primeiro Normal. Marsh Gigante espera416,67 ovos (~625mil doces); a equipe inicial dá benefício em minutos, fusão avançada vem depois. Nenhuma promessa de sorte, offline ilimitado ou Giant garantido.

Fusão em lote escolhe espécie/evolução, preserva favoritos/bloqueios, reserva0–125 Normais por espécie, exclui equipados por padrão e oferece encadeamento desmarcado. Prévia lista IDs de cada operação e resultados finais. Encadeamento só consome intermediários com opção explícita;5→1 é aplicado a IDs distintos, uma vez. Confirmar usa assinatura da prévia e revalida a propriedade; falha de save reverte fontes/resultados/counter/equipe.31 operações criam um Gigante sem31 diálogos. Descobertas de intermediários e estatística de fusões são preservadas. Para inventário cheio de Gigantes sem fusão possível, liberação manual por IDs exige duas confirmações e não dá moeda; protege equipados, favoritos, bloqueios e reserva. Não existe auto-descarte/auto-fusão obrigatório.

Auto permanece grátis e apenas em primeiro plano, mesmo ciclo2,4s; página/ocultação/blur/pausa nativa/ownership/update/falha param a sessão. Não reinicia ao voltar ou simula hatches offline. Mantém RNG independente e limite500. Conjuntos/substituição e listas paginadas48 não adicionam loops persistentes.

## Save, backups e plataformas

Mesmo `lollipopSave`, schema6 pois há ledger, conjuntos e reserva. v5 bruto é preservado primeiro em **`lollipopSave.legacy-v5`**, com readback obrigatório; não substitui o primeiro original. Falha de backup impede reescrita, sem reset. Backup v4 e quarentena já existentes permanecem. Ajustes exporta v5/v4/bruto e recupera backup válido. Ledger v5 inicia0, novos campos de pets recebem defaults; flags inválidas, ledger malformado, saves futuros/corrompidos ficam protegidos. PP gastos, propriedade, IDs, fusions/discoveries/unlocks, estatísticas antigas de gasto, cosméticos, música e histórico são preservados. Regras novas alteram coeficientes globais, não instâncias ou preço histórico pago.

PWA usa o mesmo updater e hash automático; nenhum cache versionado manualmente. `dist`/`www` incluem os módulos/páginas existentes; Android usa assets locais, o SW não atualiza APK. AppID, assinatura e permissões mantidos. Não há login/backend/moeda nova ou SDK.

## Validação e revisão manual

Resultados finais de comandos e CI constam no relatório da entrega; somente checks realmente executados são relatados. Testes específicos em `tests/balance.test.js` e `tests/pets_browser.py` incluem orçamento/reload, novos canais, capacidade sem exploit, fusão em lote e rollback, reservas, preset/troca e migração v5. As regressões existentes continuam obrigatórias.

1. Exporte v5 real nos Ajustes antes de atualizar. Compare saldo/PP, permanentes, fábricas, pets/IDs, álbum/flags e backup original v5 após migração.
2. Confira preços, condições e chances; abra×1/2/3, compare custo contra próxima fábrica. Ovo antigo desbloqueado deve continuar disponível.
3. Em Android Chrome/PWA, teste Produção/Combate/Prestígio/Construção e conjuntos; substitua uma equipe cheia. Observe PPS/clique/dano e prévia PP com zero e com bônus inteiro.
4. Com capacidade equipada compre excedentes; retire o pet e recarregue offline: posse permanece, PPS das inativas não. Reequpe/expanda para retomar.
5. Reserve Normais, marque favoritos/bloqueios. Revise lote, teste cancelar e encadear; equipados só após consentimento, sem duplicar fonte ou recompensar falha de save.
6. Abra auto e oculte/troque página/atualize PWA: não deve continuar nem reiniciar. Teste inventário cheio e saldo insuficiente.
7. Faça prestígio com oferta base/extra/total, gaste PP e recarregue/import/export. Não deve haver resgate duplicado nem perda de PP ou pets.
8. Jogue Arena com e sem combate; roleta respeita limite anunciado. Em aparelho Android, teste background/reinício/offline/APK com assinatura compatível. Testes Chromium e compilação não comprovam som/FPS/bateria em hardware real.

## Comandos executados e limites desta validação

- `npm ci`: dependências fixadas instaladas; nenhum pacote novo adicionado.
- `npm run check` e `npm test`: sintaxe de52 JS/10 HTML;241 testes Node passaram.
- `npm run balance`, `node scripts/simulate-pets.mjs` e `node scripts/simulate-prestige.mjs`: cenários, políticas e Monte Carlo concluídos; baseline v5 versionado.
- `npm run pwa:build`, `npm run test:pwa`: build offline gerado pelo hash automático;32 verificações PWA em Chromium passaram.
- `npm run test:pets`: hatches, migração, rollback, banco PP, capacidade, auto/update, presets/fusão, layouts e bundle nativo em Chromium. 89 verificações passaram, incluindo rollback do ledger de PP com quota de armazenamento.
- Suítes gerais112, Prestígio60, QoL122 e arte13 verificações passaram; música validada por62 verificações após atualizar a expectativa de schema, com mocks e decodificação real.
- `npm run android:sync`, `node scripts/check-android.mjs`: dez páginas e dependências locais verificadas.
- Gradle `:app:assembleDebug --offline`, JDK21/SDK35: APK debug compilado; assinatura validada (`apksigner`, v1/v2), bytes de54 arquivos JS/CSS/páginas conferidos contra `www/`. Nenhum aparelho/emulador conectado (`adb devices` vazio); nenhum teste físico Android foi executado.

Não foram testados Safari/Firefox, instalação pelo sistema operacional, FPS/bateria, saída física de som ou sessões humanas longas. O ritmo de fusões raras é uma projeção probabilística, não garantia de sorte. O teto de8h continua limitando produção ausente. Assinatura debug local não garante atualização sobre APKs com outra chave; siga o guia beta e exporte backup, sem desinstalar para contornar assinaturas. O SW nunca atualiza APK.

### Arquivos desta revisão

Criados:

```text
docs/BALANCE_DESIGN.md
docs/BALANCE_REWORK.md
scripts/balance-report.mjs
tests/balance.test.js
tests/fixtures/balance-v5.json
```

Modificados:

```text
.github/workflows/pages.yml
AGENTS.md
README.md
css/pets.css
docs/PETS_UPDATE.md
docs/PRESTIGE_BALANCE.md
js/core/runtime.js
js/data.js
js/gameplay.js
js/pages/arena.js
js/pages/pets.js
js/pages/prestige.js
js/pages/settings.js
js/pages/statistics.js
js/pets/actions.js
js/pets/bonuses.js
js/pets/catalog.js
js/pets/evolution.js
js/pets/state.js
js/pets/view.js
js/progression.js
js/storage.js
js/ui/shop.js
package.json
pages/pets.html
pages/rewards.html
pages/settings.html
scripts/simulate-pets.mjs
tests/browser_smoke.py
tests/economy.test.js
tests/gameplay.test.js
tests/music_browser.py
tests/pets.test.js
tests/pets_browser.py
tests/prestige_browser.py
tests/storage.test.js
```
