# Um pouco de música para o vale

A **Jukebox Açucarada** fica em **Ajustes**, junto dos controles de áudio. Ela já toca a música original `bmg1.ogg`. Você pode acrescentar suas próprias faixas aos poucos: uma música nova já é suficiente, sem preencher todos os capítulos ou chefes.

Nenhum arquivo musical novo foi criado nesta atualização. O catálogo ativo registra somente a trilha que já existe.

## Onde colocar uma música

```text
assets/audio/
├── bmg1.ogg                 ← trilha original: mantenha este arquivo
└── music/
    ├── general/             ← músicas para acompanhar qualquer capítulo
    ├── worlds/              ← temas dos capítulos
    ├── bosses/              ← batalhas dos guardiões
    └── special/             ← faixas especiais, selecionáveis na Jukebox
```

As pastas vazias têm `.gitkeep`. Quando colocar uma música, ele pode continuar ali. Prefira nomes simples em minúsculas, sem espaços ou acentos, como `vale-das-engenhocas.ogg`.

## Exemplo completo: uma música para o capítulo 3

**Este exemplo só deve entrar no catálogo depois que o arquivo real existir.**

1. Coloque a nova música em `assets/audio/music/worlds/vale-das-engenhocas.ogg`.
2. Abra `js/music/catalog.js`.
3. Dentro de `MUSIC_TRACKS`, acrescente o objeto abaixo, separado dos outros por vírgula. Mantenha a entrada `original`.

```js
{
  id: "vale-das-engenhocas",
  title: "Vale das Engenhocas",
  file: "assets/audio/music/worlds/vale-das-engenhocas.ogg",
  artist: "", // Se quiser, escreva aqui os créditos da música.
  categories: ["world"],
  worlds: [2], // Índice 2 = capítulo 3.
  bosses: [],
  randomEligible: false,
  discovery: { chapter: 2 },
},
```

4. Rode `npm run check` e `npm test`. A validação verifica se cada arquivo do catálogo existe; não publique uma entrada sem seu áudio.
5. No jogo, escolha **Mundo dinâmico** na Jukebox. Com **25 engenhocas compradas**, o mundo já está no capítulo 3 e esse tema pode tocar.

Não é preciso editar produção, preços, saves ou regras do mundo. Os limites continuam em um único lugar, `js/world.js`: **0, 5, 25 e 100 engenhocas**.

| Índice em `worlds` / `discovery.chapter` | Capítulo | Engenhocas |
| --- | --- | --- |
| `0` | Colina de Açúcar | 0–4 |
| `1` | Vila Caramelada | 5–24 |
| `2` | Vale das Engenhocas | 25–99 |
| `3` | Reino dos Pirulitos | 100+ |

## O que significa cada campo

- `id`: identificador único, em minúsculas com hífens. Evite mudar o ID de uma faixa já publicada, pois a seleção e as descobertas usam esse nome.
- `title`: nome que aparece para quem joga.
- `file`: caminho local a partir da raiz do projeto. Aceita `.ogg`, `.mp3`, `.m4a`, `.aac`, `.wav` e `.webm`; o navegador precisa suportar o codec. Não use URL de streaming.
- `artist`: crédito opcional; pode ficar vazio quando você não souber.
- `categories`: uma ou mais de `general`, `world`, `boss`, `special`. As músicas `general` servem também como alternativa quando um capítulo não tem tema.
- `worlds`: índices dos capítulos aos quais a faixa pertence. Pode atribuir a mesma música a mais de um capítulo.
- `bosses`: índices dos guardiões, descritos abaixo.
- `randomEligible`: coloque `true` para permitir a faixa no modo Aleatório. Isso também pode ser usado em um tema de capítulo, depois de descoberto.
- `discovery: { chapter: 2 }`: opcional; exige alcançar o capítulo de índice 2. Sem esse campo, a faixa já fica disponível desde o início. A atribuição `worlds` escolhe onde ela toca; `discovery` escolhe quando ela aparece como descoberta.

Campos `worlds`, `bosses`, `artist` e `discovery` podem ser omitidos. Use um ID por faixa e caminhos reais. Os exemplos de músicas futuras ficam neste guia, fora do catálogo ativo.

## Os quatro modos

| Modo | Comportamento |
| --- | --- |
| **Original** | Toca `bmg1.ogg` em loop. É o padrão; o botão de música desligada dos saves antigos continua respeitado. |
| **Aleatório** | Escolhe entre faixas descobertas com `randomEligible: true`. Ao terminar, escolhe outra, evitando repetir a anterior quando possível. Com uma só faixa, ela fica em loop. |
| **Mundo dinâmico** | Usa os temas do capítulo atual. Se houver vários, alterna entre eles; sem tema específico, usa músicas gerais ou a original. Um tema de batalha configurado tem prioridade enquanto há combate ativo. |
| **Manual** | O botão Selecionar escolhe uma música descoberta e mantém essa escolha. Ela não é trocada por batalha, a menos que você marque a opção que permite isso. |

**Próxima faixa** só fica disponível quando a playlist atual tem mais de uma opção. Como o repositório tem apenas uma música agora, Aleatório e Mundo dinâmico usam a original até você adicionar outras.

## Um tema para o guardião

Coloque primeiro o áudio real em `assets/audio/music/bosses/`. Registre-o com `categories: ["boss"]`, `bosses: [0]` e, normalmente, `randomEligible: false`.

| Índice em `bosses` | Guardião |
| --- | --- |
| `0` | Geleião do Pomar |
| `1` | Capitão Caramelo |
| `2` | Dragão de Suspiro |

Os guardiões alternam com as vitórias, usando a mesma identidade da Arena. O tema acompanha o combate ativo, inclusive se você abrir outra página durante a batalha; volta à trilha normal quando a luta termina. Sem música atribuída àquele guardião, a trilha normal continua. Isso não muda dano, HP, recompensa ou recarga.

No modo Manual, a opção **Permitir temas de batalha no modo Manual** precisa estar marcada. A seleção manual é lembrada e retorna ao fim da batalha. Faixas `special` ficam disponíveis na Jukebox conforme suas regras; não acrescentam eventos automáticos ao jogo.

## Descobertas, preferências e continuidade

A trilha original nunca é bloqueada. Faixas com requisito de capítulo ficam disponíveis conforme o maior capítulo já alcançado e continuam descobertas depois do prestígio.

Na primeira execução desta atualização, o jogo reconhece silenciosamente seu capítulo atual e os anteriores. Capítulos anteriores a um prestígio feito antes desta atualização não têm histórico próprio no save, então não são presumidos. Depois disso, um capítulo novo recebe um aviso curto, uma única vez. Não há sequência de notificações a cada reload.

As informações ficam separadas:

- `lollipopSave`: progresso e os botões já existentes de música/efeitos, sem mudança de schema.
- `lollipopMusic.preferences.v1`: modo, volume, seleção manual, opção de batalha e descobertas musicais.
- `lollipopMusic.session.v1`, em `sessionStorage`: faixa e posição aproximada para navegar entre os documentos HTML.

Exportar o save do jogo não exporta essas preferências musicais. Elas pertencem ao navegador/aplicativo atual. Se o armazenamento estiver bloqueado, os controles continuam funcionando na sessão, mas não há garantia de reter preferências/descobertas ao fechar. Dados inválidos ou de versão desconhecida não são sobrescritos automaticamente.

A navegação pode ter uma pequena pausa: são páginas HTML diferentes. A retomada é aproximada e depende da permissão do navegador. Uma única aba escreve progresso e toca música; a outra fica em consulta. Segundo plano e pausa nativa suspendem o áudio.

## Como testar

1. Rode `npm run serve` e abra `http://127.0.0.1:8000`.
2. Abra Ajustes → Jukebox, ligue Música do vale e toque em **Reproduzir / retomar**. O navegador pode exigir essa interação.
3. Ajuste o volume. Teste Original, Aleatório, Mundo dinâmico e uma escolha Manual.
4. Com uma faixa atribuída ao capítulo 3, confira a descoberta e a seleção ao alcançar 25 engenhocas. Para uma faixa de batalha, inicie o guardião correspondente.
5. Navegue para outra página, volte e confira a retomada. O mesmo som não deve reiniciar a cada clique/tick.
6. Feche ou oculte a aba; confirme a pausa. Teste também uma segunda aba em consulta.
7. Teste sem rede depois de ouvir a faixa ao menos uma vez e aguardar o cache da PWA.

```sh
npm run check
npm test
# Com o servidor aberto e Python Playwright + Chromium instalados:
python3 tests/music_browser.py
```

Para subdiretórios como GitHub Pages, use `LOLLIPOP_BASE_URL` com o endereço completo da raiz do jogo. O teste mistura verificações com áudio simulado e decodificação do OGG real em Chromium; não comprova som nos alto-falantes nem teste em aparelho Android.

## Offline e Android

A trilha original continua no cache inicial da PWA. Faixas adicionais são guardadas **quando pedidas pelo player**, sem baixar todo o futuro catálogo ao abrir o jogo. Ouça cada música online antes de depender dela offline. Se uma faixa opcional não estiver no cache ou não abrir, o player tenta outra opção e a original; o jogo continua funcionando. Uma faixa com falha não é pedida de novo a cada tick; reabra o jogo para uma nova tentativa.

O service worker atende também requisições parciais de áudio (`Range`), usadas por navegadores e WebViews. Ao publicar músicas ou alterar o catálogo, incremente `CACHE_NAME` em `sw.js`, como nas outras atualizações. **Não coloque músicas opcionais na lista de instalação obrigatória**: isso poderia quebrar o offline por um arquivo ausente.

Para Android, `npm run android:prepare` copia todos os arquivos locais de `assets/audio/` e os módulos musicais para `www/`. Rode `node scripts/check-android.mjs` e depois use o fluxo de build já existente quando quiser gerar outro APK. Não é necessário alterar ID do aplicativo, assinatura ou permissões. O APK tem seus próprios dados locais, separados do navegador.

## Formatos e tamanho

Para começar, **OGG/Vorbis ou MP3**, em torno de **96–128 kbps**, costuma ser suficiente para música de fundo. Prefira arquivos comprimidos de poucos megabytes, com volume confortável e início/fim que combinem se forem usados em loop. WAV sem compressão ocupa muito mais espaço; evite para faixas longas. M4A/AAC e WebM dependem do codec aceito no aparelho, então confira no dispositivo que vai usar.

Não há conversão de áudio automática no projeto. Acrescente apenas o arquivo que pretende usar, registre seus créditos quando conhecidos e teste essa música antes de publicar. Você não precisa preparar todas as trilhas de uma vez.
