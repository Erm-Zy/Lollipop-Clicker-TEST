# Auditoria da versão original

Base inspecionada antes das alterações: `72a4ed7cf286a2274f2337e5f300f79628dd76e1`.

## Arquitetura e conteúdo encontrados

O jogo é uma aplicação estática, em português, sem dependências de execução. O `index.html` original tem três áreas e oito abas. `script.js` concentra catálogo, estado global, cálculos, persistência, áudio, efeitos, renderização e listeners em 951 linhas. `style.css` tem 757 linhas, com apresentação baseada em uma tela fixa e um painel inferior. Não foram encontrados testes automatizados ou instruções `AGENTS.md` no repositório.

| Sistema | Comportamento original preservado como referência |
| --- | --- |
| Clique | Base 1, bônus do sabor, multiplicador de prestígio e boost 2× |
| Produção | Oito upgrades, de Máquina de Pirulitos até Super Fábrica; preços geométricos com fator 1,15 |
| Sabores | 11 sabores; Morango, Limão e Blueberry gratuitos; oito compras permanentes |
| Personalização | Sete conjuntos: Clássico, Neon, Arco-Íris, Dourado, Cósmico, Fogo e Gelo |
| Conquistas | 13 conquistas por cliques, produção, coleção, compras, roleta, chefe e tempo |
| Prestígio | Raiz cúbica da produção histórica em milhões; +15% por nível |
| Roleta | Seis resultados; intervalo real de cinco minutos, apesar do título “diária” |
| Boost | Bônus 2× por 30 segundos; anúncio de demonstração, sem verificação real |
| Arena | Chefe com 100 HP iniciais, crescimento 1,6×, batalha de 30 segundos e recompensa de 15× HP |
| Estatísticas | Saldo, produção histórica, cliques, tempo, coleções, compras, recordes e recompensas |
| Áudio/efeitos | Música Ogg local, sons sintetizados e partículas em canvas |
| Área futura | “Nova Dimensão” é explicitamente um aviso de conteúdo em desenvolvimento |

## Defeitos confirmados por leitura do código

- **Prestígio repetível:** a recompensa é calculada a partir de `totalEarned`, que não é consumido nem marcado como já resgatado. O mesmo histórico permite reinícios sucessivos sem nova produção.
- **Roleta desconectada do ponteiro:** o índice premiado é aleatório, mas não participa da rotação final. A imagem pode indicar outro prêmio. O resultado e o cooldown só são registrados após uma animação por `setInterval`, permitindo abandonar/recarregar um giro sem compromisso persistido. O resultado “Raro (+Clique)” entrega moeda em vez de bônus de clique.
- **Boost sem condição ou cooldown:** cada clique no anúncio fictício renova o bônus e incrementa a estatística. O texto anuncia uma conclusão de anúncio que não ocorreu. Um prêmio de boost também pode reduzir um prazo já ativo.
- **Tempo dependente de callbacks:** a produção soma exatamente `PPS / 10` e o tempo soma `0.1` a cada callback. Throttling, aba em segundo plano ou travamento reduzem o ganho. Não há cálculo de produção offline ou timestamp de salvamento, apesar da descrição do README.
- **Chefe sem prazo absoluto:** a batalha reduz um contador por callback; uma aba suspensa prolonga o tempo disponível. A batalha não integra a persistência. Resetar ou fazer prestígio não cancela o estado transitório da batalha, deixando possível resgatar uma recompensa em uma sessão de progressão diferente.
- **Save sem validação:** `Object.assign` aceita números negativos, strings, arrays inválidos, IDs desconhecidos e tipos incorretos. Uma coleção ausente tem default, mas uma coleção explícita inválida quebra chamadas como `.includes` e `.length`. Não há versão do formato ou backup.
- **Risco de apagar progresso após erro:** JSON inválido causa apenas `console.error`; o autosave seguinte substitui os dados ilegíveis pelo estado inicial. `localStorage.getItem` e `setItem` não têm proteção para bloqueio de armazenamento ou falta de espaço.
- **Perda ao fechar:** autosave somente a cada cinco segundos; não há salvamento em `visibilitychange` ou `pagehide`.
- **Personalização acoplada:** `activeSkin` determina aparência, fundo e partículas juntos. Aplicar a skin substitui todas as classes do `body`, prejudicando qualquer classe de estado adicionada depois.
- **Áudio quebrado:** o código solicita `assets/audio/bgm1.ogg`, mas o arquivo real é `assets/audio/bmg1.ogg`.
- **Excesso de trabalho visual:** a árvore de estatísticas e todos os upgrades são atualizados dez vezes por segundo, mesmo em abas ocultas. O canvas anima continuamente mesmo vazio, não limita partículas, usa velocidade por frame e não respeita redução de movimento.
- **Acessibilidade/layout:** clique principal, chefe e cartões são `div` com listener de mouse; faltam foco e ativação por teclado. Zoom é desabilitado. A página trava o scroll global e não tem media queries, layout dedicado a desktop ou preferência por movimento reduzido. A barra de abas esconde o indicador de rolagem.
- **PWA incompleta:** há manifest e service worker, mas não há link para o manifest nem registro do worker. O cache-first do worker pode manter HTML/JS antigos; a ativação apaga todos os caches da origem, inclusive de outras aplicações. A música, imagem e ícones não entram no precache.
- **Dependência externa desnecessária:** o HTML carrega AdSense de teste embora o boost seja inteiramente simulado. Essa requisição não valida nenhuma recompensa.

Não foi encontrada duplicação de listeners causada pela navegação: os listeners principais são registrados uma vez. O problema principal é o acoplamento entre renderização, cálculo, efeitos e mutação de estado. Não há evidência de que o recurso de pirulitos dourados anunciado no README estivesse implementado neste commit; ele não deve ser confundido com uma funcionalidade removida.

## Assets inspecionados

- `assets/audio/bmg1.ogg`: arquivo Ogg/Vorbis válido, estéreo, 44,1 kHz; reutilizável com referência corrigida.
- `assets/images/bg-purple.png`: bytes JPEG progressivos, 899 × 1599; o navegador consegue decodificar a imagem, mas a extensão não corresponde ao formato. O arquivo é preservado para evitar quebrar referências externas.
- `icon-192.png` e `icon-512.png`: PNGs válidos nas dimensões declaradas no manifest.
- `.well-known/assetlinks.json` e `.nojekyll`: configuração de hospedagem existente; preservada.

## Estratégia de compatibilidade e refatoração

Reutilizar os IDs, nomes, custos, produção, multiplicadores, coleções e conquistas existentes. Separar o catálogo e regras puras dos adaptadores de armazenamento, UI, áudio e efeitos. Conservar `lollipopSave` como chave principal, mantendo um backup do conteúdo original antes da migração; validar estruturas e oferecer defaults seguros. Saves sem timestamp não podem receber uma duração offline inventada. Um save inválido deve permanecer recuperável e impedir sobrescrita automática.

Separar aparência, tema e partículas sem cobrar novamente por conjuntos já desbloqueados. Migrar o `activeSkin` antigo para as três categorias para preservar a aparência equipada. Não remover conquistas, sabores ou prestígio já obtidos, mesmo quando originados dos bugs antigos; somente impedir resgates repetidos daqui em diante.

Integrar produção pelo tempo decorrido, dividindo intervalos na expiração de boost, com limite documentado de ausência offline. Usar prazos absolutos para chefes e cooldowns. Comprometer um resultado da roleta antes de animar e pagar uma única vez; a imagem deve apontar para esse mesmo resultado. O bônus de demonstração deve ter texto honesto e condição explícita. Preservar a área futura como aviso, sem apresentá-la como sistema concluído.

Os testes de regras devem cobrir principalmente transições que envolvem dinheiro, persistência ou tempo. A validação em navegador complementa esses testes com navegação, teclado, áudio, assets, layouts e instalação offline.
