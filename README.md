# bielzin

## Tracker de League of Legends

A aba Jogos lê o snapshot real em `src/data/lol-tracker.json`. O site não faz chamadas à Riot e não recebe a chave. Os ícones da coleta ficam em `public/media/lol/`.

Para atualizar localmente no PowerShell:

```powershell
$env:RIOT_API_KEY = 'sua-chave'
npm run snapshot:lol
Remove-Item Env:RIOT_API_KEY
```

O padrão é `bielzin#sh1ro`, servidor BR. Para adicionar outra conta BR ao mesmo JSON: `npm run snapshot:lol -- "Nome" "TAG"`. O seletor de contas aparece quando houver mais de uma conta coletada. A chave é usada somente no processo local; não use variáveis `VITE_*` para ela.

Cada coleta busca até 40 partidas ranqueadas recentes e guarda a última leitura de elo e LP de cada dia por fila, no horário de Brasília. O histórico também inclui registros importados do LeagueOfGraphs. Campeões, KDA e vitórias recentes são calculados a partir das partidas da coleta, com remakes excluídos. Os totais por fila vêm da Riot. Gere e publique o site novamente após atualizar o JSON.

Perfil pessoal feito em Vue. Use `npm install` para instalar as dependências, `npm run dev` para abrir a prévia e `npm run build` para gerar o site.

Para rodar os testes localmente, instale o Chromium com `npx playwright install chromium` e execute `npm test`. O GitHub Actions roda os testes, o lint, a checagem de formatação e o build.

Edite `src/profile.ts` para atualizar a bio, as conexões, os jogos, o projeto e as cores. Coloque arquivos próprios em `public/media/` e use caminhos como `/media/trilha.mp3`.

- `music.src` define um arquivo de áudio direto. Para uma faixa do YouTube, preencha `music.youtubeUrl` e ative `music.embedYouTube` se o vídeo permitir reprodução incorporada. O arquivo direto tem prioridade. `music.volume` define o volume inicial entre 0 e 1. O título no card da trilha aponta para `music.spotifyUrl` ou, se estiver vazio, para `music.youtubeUrl`.
- `music.startAt` define o ponto inicial do MP3 em segundos. Por exemplo, `32.5` inicia em 32,5 segundos. O padrão é `0`. Valores inválidos ou além da duração começam em zero. A barra do player continua permitindo avançar e voltar pela faixa inteira.
- `theme.backgroundVideo` aceita um MP4 em loop silencioso. `theme.backgroundGif` aceita um GIF se não houver vídeo. `theme.backgroundStill` define a imagem estática usada quando o dispositivo solicita movimento reduzido.
- O fundo atual usa `public/media/mikey_linktree_preview_animado.gif`, animado desde a entrada. Uma imagem estática do primeiro quadro aparece quando o dispositivo solicita movimento reduzido.
- `avatar` configura a foto do perfil. A entrada abre ao clicar em qualquer região; o áudio começa após esse clique.
- O player do MP3 tem controles próprios de reprodução, progresso, reinício e volume.

Os ícones das marcas vêm do [Simple Icons](https://github.com/simple-icons/simple-icons). A imagem da Reyna vem do [VALORANT Media](https://playvalorant.com/en-us/media/).

Capa do osu!: [Twitch](https://static-cdn.jtvnw.net/ttv-boxart/osu%21-285x380.jpg).
