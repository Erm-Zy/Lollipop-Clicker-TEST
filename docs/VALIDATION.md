# Validação da atualização 2.0

Executada em 3 de novembro de 2026, com Node 24.22.1 e Chromium headless real, usando Playwright Python. Não há dependências de execução novas.

- `npm run check`: sintaxe válida em todos os módulos e no service worker.
- `npm test`: **39 verificações passaram**, incluindo subcasos dos seis resultados da roleta.
- `npm run test:browser`: **68 verificações passaram**. Nenhuma exceção JavaScript ou resposta HTTP de erro capturada.
- `git diff --check`: sem erros de whitespace.

## Fluxos exercitados no navegador

Clique principal e teclado, compra com débito de saldo, produção fracionária, oito abas, três áreas, sabor gratuito e pago, três categorias de personalização, boost e bloqueio de repetição, prestígio e bloqueio de resgate duplicado, vitória no chefe, configuração de partículas, refresh, migração, exportação, importação confirmada, cancelamento de reset, roleta persistida durante giro e resgate único, cooldown, proteção de save inválido, exportação do save bruto, restauração explícita do backup, múltiplas abas e reabertura offline após instalação do service worker.

## Layouts

Desktop 1440 × 1000; celular 360 × 800 e 390 × 844; tablet 768 × 1024. Todas as oito seções foram verificadas sem overflow horizontal. Verificação visual adicional da roleta em 320 px. O fluxo com redução de movimento também foi exercitado. Capturas reproduzíveis são gravadas localmente em `test-results/` pelo teste de navegador.

## Limites

Os testes de navegador usam Chromium; Safari/iOS e Firefox não foram executados nesta sessão. A URL da música foi verificada e seu arquivo original foi validado, mas não houve avaliação auditiva humana da trilha. O comportamento foi verificado localmente como aplicação estática; o pull request não publica nem altera automaticamente a branch principal.
