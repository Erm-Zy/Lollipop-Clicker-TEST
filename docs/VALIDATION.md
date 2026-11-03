# Validação do Lollipop Clicker 3.0

Executada em 3 de novembro de 2026, com Node 24.22.1 e Chromium headless real, usando Playwright Python. Não há novas dependências de execução do jogo.

## Resultado final

- `npm run check`: **22 arquivos JavaScript e nove documentos HTML** verificados.
- `npm test`: **52 verificações de regras, economia e armazenamento passaram**, incluindo os seis resultados da roleta.
- `npm run test:browser`: **107 verificações passaram**, sem exceções JavaScript nem respostas de erro de assets capturadas.
- `git diff --check`: sem erros de whitespace.

O teste de navegador foi executado com `LOLLIPOP_BASE_URL=http://127.0.0.1:8002/Lollipop-Clicker-TEST/`, servindo a pasta superior ao repositório. Isso exercita os caminhos reais de um projeto hospedado em subdiretório no GitHub Pages.

## Regras e persistência

Os testes puros verificam os catálogos originais, preços por unidade, lotes completos ×10 e ×100, MAX exato, débito atômico, tentativa de compra repetida, produção pelo tempo decorrido, divisão na expiração do boost, limite offline, progresso de conquistas, recompensa única da roleta, persistência de giro, anti-repetição de prestígio, vida/prazo/recarga da arena e açúcar dourado que exige coleta explícita.

Também verificam formatos antigos, campos inválidos, versões futuras, backups, armazenamento bloqueado, erro de quota e migração do schema 2 para o 3 com aparência, tema, partículas e prestígio independentes. A fixture realista anterior está em `tests/fixtures/v2-save.json`.

## Navegador real

- Os nove documentos foram carregados por links reais, com Back, Forward, reload e conservação de progresso.
- A produção entre documentos foi comparada com o tempo efetivamente decorrido, sem duplicar o relógio.
- Foram exercitados teclado, compras rápidas e em lote, sabores, três categorias de cosméticos, confirmação/cancelamento de prestígio, vitória e expiração de chefe, cooldown e giro da roleta atravessando outras páginas.
- Trinta toques rápidos em um contexto de touchscreen móvel renderam exatamente trinta cliques.
- Foram testadas exportação, importação confirmada, reset cancelado, save bruto corrompido preservado e restauração explícita de backup.
- Uma segunda aba permaneceu em consulta enquanto a primeira mantinha o controle. Após fechar a primeira, a segunda retomou o save atual.
- O fallback sem Web Locks também foi exercitado. Quando a gravação do lease falha, as abas só jogam em memória e não podem sobrescrever o save principal.
- Mesmo com o getter de localStorage bloqueado, o progresso temporário pôde ser exportado diretamente da página principal.
- A roleta com movimento reduzido foi verificada com um giro pendente: o canvas exibe uma ilustração estática, sem ficar vazio.
- O aviso de ganhos offline aparece após uma ausência real; a navegação normal não gera spam desse aviso.
- Após a instalação do service worker, Mundo, Loja, Coleção e Arena foram reabertos offline e o clique continuou funcionando.

## Inspeção visual

Todas as nove páginas foram verificadas sem overflow horizontal em **1440 × 900, 390 × 844, 360 × 800 e 768 × 1024**. Mundo, Loja e Arena foram capturados e inspecionados em desktop e celular. Durante a inspeção foram corrigidos o preenchimento da barra de vida, o espaçamento do HUD/resumo da loja, os controles da arena móvel e a área de toque do açúcar dourado, que permanece estável enquanto o símbolo interno anima.

As [seis capturas da revisão](SCREENSHOTS.md) mostram um save anterior migrado. Preferência de movimento reduzido foi usada para fotografar; notificações transitórias foram ocultadas apenas no momento da captura. As demais asserções funcionais não dependem de imagens.

## Limites da validação

A automação foi executada em Chromium, incluindo contexto móvel com toque. Safari/iOS, Firefox e aparelhos físicos antigos não foram executados nesta sessão. Os caminhos da música e imagens existentes foram verificados, mas não houve avaliação auditiva humana da trilha. O jogo continua local ao navegador, sem anti-cheat ou autoridade de servidor. O pull request entrega o código para revisão; não faz merge nem publica a nova versão na main automaticamente.
