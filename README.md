# 🍭 Lollipop Clicker 2.0

Uma pequena fábrica, infinitas possibilidades. Atualização do jogo original em HTML, CSS e JavaScript puro: nova interface responsiva, progressão preservada e regras separadas da apresentação. Não há framework, build ou dependência de execução.

## Jogar e desenvolver

Sirva a pasta por HTTP; módulos ES e o service worker não funcionam ao abrir `index.html` por `file://`.

```sh
npm run serve
# abra http://127.0.0.1:8000
```

Requer Python 3 para o servidor de desenvolvimento. O deploy continua sendo uma pasta estática, compatível com GitHub Pages e `.nojekyll`. O idioma do jogo é português. A interface funciona com mouse, toque e teclado; use Tab e Espaço/Enter, ou as setas na navegação. O jogo respeita `prefers-reduced-motion` e permite desativar partículas, música e efeitos separadamente.

## Sistemas e regras

- **Produção:** oito melhorias originais, com os mesmos custos base, produção e crescimento de preço de 1,15×. A fórmula de preço continua `floor(custoBase × 1,15 ^ nível)`. Cliques e produção recebem os bônus do sabor ativo, prestígio e boost.
- **Sabores:** os 11 sabores originais, incluindo três gratuitos, com seus preços e bônus preservados. Compras permanecem após prestígio.
- **Personalização:** sete coleções originais. Comprar uma coleção desbloqueia pirulito, fundo e partículas; cada categoria pode ser equipada independentemente, sem pagar de novo.
- **Conquistas:** as 13 originais e suas condições, com notificação sem interromper o jogo. Nenhuma conquista antiga é retirada.
- **Prestígio:** o total de níveis disponíveis é `floor(cbrt(total histórico / 1.000.000))`. Apenas níveis ainda não resgatados são concedidos. Cada nível mantém +15% em produção e clique. Renascer zera saldo, melhorias, batalha e bônus transitórios, preservando coleção, conquistas, estatísticas e cooldowns. Um giro pendente deve terminar antes do renascimento.
- **Roleta:** preserva o intervalo original de **5 minutos** (o antigo título “diária” era inconsistente). Os seis resultados têm chances iguais. Prêmios percentuais usam o saldo no início do giro, com mínimo de 100. O raro agora entrega o anunciado **+100 ao clique**, até o próximo prestígio. O resultado fica salvo antes da animação, o ponteiro indica esse resultado e recarregar não sorteia nem paga novamente.
- **Bônus grátis:** o anúncio fictício foi convertido em um bônus de demonstração claramente identificado: produção e clique 2× por 30 segundos, com recarga de 5 minutos. Não há anúncio real, SDK publicitário ou alegação de visualização verificada. Bônus da roleta podem estender um boost existente.
- **Arena:** 100 HP iniciais, crescimento de 1,6× por vitória, prazo real de 30 segundos e recompensa de 15× HP. A batalha é persistida e ataques após o prazo não concedem vitória. Não há produção automática causando dano ao chefe.
- **Dimensão:** mantém o aviso original de conteúdo em desenvolvimento; não apresenta um minijogo inexistente como concluído.
- **Áudio:** reutiliza `assets/audio/bmg1.ogg` e efeitos leves sintetizados por Web Audio, iniciados após interação. Música pausa quando a página fica oculta.

A [auditoria inicial](docs/AUDIT.md) descreve os problemas do commit original e o inventário preservado. A referência a pirulitos dourados no README antigo não correspondia a um sistema implementado no código auditado.

## Arquitetura

```text
index.html                 Estrutura semântica, navegação e SVG do pirulito
css/main.css               Identidade visual e layout principal
css/components.css         Cards, coleções, arena, roleta e configurações
css/responsive.css         Celular, tablet e movimento reduzido
js/data.js                 Catálogos originais e constantes de balanceamento
js/gameplay.js             Estado e transições puras, cálculo e progressão
js/storage.js              Validação, migração, backups e ganhos offline
js/app.js                  Integração DOM, eventos, navegação e ciclo de vida
js/audio.js                Música e efeitos sintetizados
js/effects.js              Partículas limitadas e animação sob demanda
assets/                    Áudio, imagem e diretórios existentes preservados
sw.js + manifest.json      Instalação PWA e aplicação offline
tests/                    Regressões de regras, persistência e navegador
```

As regras recebem um estado e um timestamp explícitos; não dependem do DOM. Toda ação integra a produção anterior antes de mudar multiplicadores ou comprar melhorias. A UI atualiza textos somente quando mudam, evita renderizar painéis ocultos e mantém os listeners principais registrados uma vez. O tick de interface ocorre a cada 200 ms, mas o ganho usa tempo decorrido, dividido na expiração de boosts. O canvas usa `requestAnimationFrame` apenas enquanto há partículas, com limite de 60 e resolução em pixels CSS.

## Saves e recuperação

A chave principal continua **`lollipopSave`**. A versão 2 adiciona `version`, timestamps, personalização independente, níveis de prestígio já resgatados, resultados pendentes da roleta e estado da arena. Números, listas, IDs e objetos aninhados são validados; campos ausentes recebem defaults seguros.

- Antes da primeira migração, o conteúdo bruto antigo é preservado em `lollipopSave.legacy-v1`. A aparência antiga é mantida nas três categorias. Níveis de prestígio e recompensas já obtidos continuam com o jogador.
- Saves antigos sem timestamp não recebem ganhos offline inventados. Saves novos recebem até **8 horas** de produção por ausência, respeitando o tempo efetivo de boost. Tempo offline não conta como tempo jogado.
- Autosave a cada 5 segundos, após transações importantes e ao ocultar/sair da página. Uma cópia da escrita anterior fica em `lollipopSave.backup`.
- JSON inválido, formato desconhecido, versão futura, armazenamento bloqueado ou falta de espaço não apagam o save original. Se houver backup válido, ele pode ser carregado para consulta, com autosave bloqueado até recuperação explícita.
- Em **Configurações**, exporte o progresso, importe um arquivo ou use **Restaurar backup local**. A restauração exige confirmação e preserva o conteúdo substituído em `lollipopSave.recovery`. Em modo de proteção, a exportação entrega o save bruto original para recuperação.
- Apagar todo o progresso exige duas confirmações. Importação e reset também guardam backups do conteúdo anterior. Esses backups não são enviados a um servidor.
- Uma mudança de save em outra aba bloqueia a aba antiga; recarregue para continuar usando o estado mais recente. Isso evita que abas desatualizadas sobrescrevam progresso e recompensas.

O progresso é local ao navegador/origem. Não há sincronização de conta, anti-cheat de servidor ou garantia contra edição manual do relógio/localStorage. Use exportação para mover progresso entre dispositivos ou fazer backup fora do navegador.

## Validação

```sh
npm run check          # sintaxe dos módulos e service worker
npm test               # 39 verificações de regras e armazenamento; Node 24+
npm run serve          # em um terminal separado
npm run test:browser   # integração real no Chromium
```

O teste de navegador requer o pacote Python `playwright` e um Chromium instalado (não são dependências do jogo). Por exemplo, instale Playwright no ambiente de testes com `python3 -m pip install playwright`. O executável padrão é `/usr/bin/chromium`; configure `CHROMIUM_PATH` para outro caminho, e `LOLLIPOP_BASE_URL` para outro servidor. Não precisa baixar os browsers do Playwright se já houver Chromium.

Os testes unitários cobrem compras, todos os seis prêmios, cooldown, reload, prestígio repetido, boss expirado, produção offline/boost, números inválidos, saves antigos/corrompidos/futuros, backups e falhas de armazenamento. O teste de navegador cobre navegação, cliques e teclado, compras, personalização, prestígio, arena, importação/exportação, proteção e restauração de save, várias abas, assets e modo offline; verifica layouts em 360, 390 e 768 px, além do desktop em 1440 px. Capturas locais ficam em `test-results/` (ignorado no Git).

## Atualização do PWA

O service worker armazena o shell completo, incluindo CSS, módulos, áudio e ícones. Cada versão usa um cache próprio e consistente; não mistura arquivos individuais de releases diferentes. Ao alterar qualquer asset do shell, **incremente `CACHE_NAME` em `sw.js`**. A atualização aguarda o fechamento das abas antigas para ativar; feche todas as abas do jogo e reabra após atualizar. Só caches com prefixo `lollipop-clicker-` são removidos. Nenhum cache contém o save do jogador.
