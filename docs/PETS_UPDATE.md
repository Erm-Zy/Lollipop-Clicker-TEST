# Pets & Eggs — guia atual (save 6)

A expansão original foi integrada pelo PR#9. A revisão atual mantém o conteúdo e acrescenta especializações, contabilidade de PP e operações em lote. O relatório completo, com desenho por espécie, coeficientes exatos, antes/depois, simulações, migração e limites, está em **[BALANCE_REWORK.md](BALANCE_REWORK.md)**. As regras abaixo substituem os preços/fatores do lançamento original.

| Ovo | Preço fixo em pirulitos | Novo convite | Raridades/chances reais |
|---|---:|---|---|
| Açucarado | 1.500 | Início | Comum60%, Incomum30%, Raro9%, Épico1% |
| Cristalizado | 1.000.000 | 25 fábricas + 1 Laboratório | Incomum50%, Raro35%, Épico12%, Lendário3% |
| Celestial | 5.000.000.000 | 100 fábricas + 10 Super Fábricas + nível histórico10 | Raro65%, Épico25%, Lendário9%, Mítico1% |

Espécies da mesma raridade dividem a chance igualmente. A interface mostra cada chance individual. Permanecem exatamente5+6+7 espécies, mesmos IDs/nomes/raridades. Todos os ovos legitimamente desbloqueados em v5 ficam disponíveis, inclusive os marcos antigos de25/100 ainda refletidos na jornada migrada. Não há nova cobrança sobre ovos já abertos.

## Bônus e equipamento

Três equipados válidos dão bônus aditivos separados: clique, PPS, dano de chefe, PP futuro e espaços de fábrica. Candy não dá PP/espaços; Cristalizado não dá espaços; apenas espécies Celestiais selecionadas dão capacidade. Renda e combate usam fatores1/2/4/8; PP usa1/1,5/2/3 e teto conjunto25%; espaços usam1/2/3/4 por tipo indicado. Cinco iguais da evolução atual formam a próxima; Gigante equivale125 Normais. Coeficientes são regras globais, não mudam instância, ID ou espécie existente.

PPS/clique/Arena/Prestígio/Loja mostram os efeitos dos mesmos getters do jogo. Ganho PP mostra base + extra + total, arredondamento e saldo existente, só concedido em prestígio efetivo. Capacidade permanente e equipada são diferentes: posse acima do limite atual é retida, porém as unidades excedentes ficam inativas. Reequipar ou expandir restaura a atividade sem renda retroativa.

Equipar Melhores oferece Equilibrado, Produção, Cliques, Combate, Prestígio e Construção, com objetivos e empates documentados. Quatro conjuntos guardam IDs; não recriam pets consumidos. Substituir abre a escolha de quem sai quando os três slots estão ocupados. Toda troca integra a produção antiga antes.

## Abertura e inventário

Lotes×1/×2/×3 debitam e salvam o resultado inteiro antes da revelação. Sem saldo/espaço para todo o lote, não há compra parcial. IDs monotônicos, proteção contra pedido repetido e mínimo350ms preservados. Animação curta/skip/reduced motion não decide recompensa.

Auto permanece gratuito, uma abertura por2,4s, no máximo um timer. Para com Parar, navegação, ocultação, blur, pausa nativa, perda de ownership, atualização PWA, falha de save, estoque ou dinheiro. Nunca volta sozinho nem abre ovos na ausência. Offline ativo continua jogável; apenas a fábrica acumula produção ausente, até8h e com expiração correta do boost.

Inventário500, paginação48, filtros e catálogo72. Import acima500 preserva instâncias válidas e bloqueia novas compras. Favoritos/bloqueios independentes protegem fusões/liberação. Reserva configurável0–125 Normais por espécie sobrevive ao save/Prestígio. Não há fusão ou exclusão automática obrigatória.

Fusão individual lista cinco IDs. Fusão em lote escolhe espécie/evolução; mostra fontes, operações e resultados antes de confirmar. Encadear é desmarcado por padrão e requer consentimento para reutilizar intermediários. Equipados são excluídos por padrão e exigem confirmação adicional quando incluídos. As operações usam IDs distintos e transação única com rollback. Descobertas dos intermediários e contagem de fusões permanecem.

Para evitar deadlock de inventário cheio de Gigantes, liberação deliberada dos selecionados lista IDs, exige duas confirmações e não dá recompensa. Nunca libera favoritos/bloqueados/equipados/reserva. Prefira fusão.

## Save e preservação

Mesmo `lollipopSave`, schema6. v5 original preservado em `lollipopSave.legacy-v5` antes da migração; v4 em `lollipopSave.legacy-v4` continua intocado. Backup obrigatório com readback: falha bloqueia reescrita, sem reset. Ajustes permite exportar original/atual/bruto. Dados inválidos de pets/flags/reserva protegem o primário e podem ser copiados para a quarentena existente `lollipopSave.pets-v5-quarantine`; dados futuros não são sobrescritos.

PP extra usa `prestigeBonusEarned`, validado junto ao orçamento histórico de gastos. Ledger v5 inicia0. Presets/reserva recebem defaults seguros. Todos os pets/IDs/estágios/flags/equipe/estatísticas de gasto antigo, álbum, ovos, PP, expansões, Ímpeto, cosméticos, música e histórico permanecem. Migração não repete o reset histórico da beta. Legados incompatíveis ficam protegidos para exportação.

## Arquitetura, arte e testes

`js/pets/catalog.js`: conteúdo/coeficientes; `bonuses.js`: poderes/equipes; `actions.js`: transações; `evolution.js`: prévias individuais/em lote; `state.js`: validação/IDs/desbloqueios; `inventory.js`: paginação; `auto.js`: lifecycle; `view.js`/`art.js`: apresentação. `js/pages/pets.js` usa o runtime compartilhado e `requireSave:true`, sem outro escritor.

SVGs originais leves continuam. Artistas podem configurar PNG/WebP em `ARTWORK.pets`/`ARTWORK.eggs` (`js/ui/assets.js`); sem configuração, nenhum arquivo imaginado é solicitado. Consulte [ART_GUIDE.md](ART_GUIDE.md).

`npm test`, `npm run test:pets`, `npm run test:pwa`, suites gerais/Prestígio/QoL/música/arte, `npm run balance`, os simuladores existentes e `npm run android:sync` validam integração. O hash de release PWA é automático, updater preservado. Android inclui os mesmos assets locais e exige novo APK; Service Worker não troca assets nativos. Resultados e limitações reais são declarados na entrega, sem confundir Chromium, build e execução em dispositivo.
