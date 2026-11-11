# bielzin

Perfil pessoal feito em Vue. Use `npm install` para instalar as dependências, `npm run dev` para abrir a prévia e `npm run build` para gerar o site.

Edite `src/profile.ts` para atualizar a bio, as conexões, os jogos, o projeto e as cores. Coloque arquivos próprios em `public/media/` e use caminhos como `/media/trilha.mp3`.

- `music.src` define um arquivo de áudio direto. Para uma faixa do YouTube, preencha `music.youtubeUrl` e ative `music.embedYouTube` se o vídeo permitir reprodução incorporada. O arquivo direto tem prioridade. `music.volume` define o volume inicial entre 0 e 1. O link para o YouTube fica disponível no card da trilha.
- `music.startAt` define o ponto inicial do MP3 em segundos. Por exemplo, `32.5` inicia em 32,5 segundos. O padrão é `0`. Valores inválidos ou além da duração começam em zero. A barra do player continua permitindo avançar e voltar pela faixa inteira.
- `theme.backgroundVideo` aceita um MP4 em loop silencioso. `theme.backgroundGif` aceita um GIF se não houver vídeo. `theme.backgroundStill` define a imagem estática usada quando o dispositivo solicita movimento reduzido.
- O fundo atual usa `public/media/mikey_linktree_preview_animado.gif`, animado desde a entrada. Uma imagem estática do primeiro quadro aparece quando o dispositivo solicita movimento reduzido.
- `avatar` configura a foto do perfil. A entrada abre ao clicar em qualquer região; o áudio começa após esse clique.
- O player do MP3 tem controles próprios de reprodução, progresso, reinício e volume.

Assets de marcas: [Simple Icons](https://github.com/simple-icons/simple-icons). Imagens: [VALORANT Media](https://playvalorant.com/en-us/media/) e [osu!](https://assets.ppy.sh/logo-with-background.png), guardadas localmente em `public/`.

Capa do osu!: [Twitch](https://static-cdn.jtvnw.net/ttv-boxart/osu%21-285x380.jpg).

Capa do VALORANT: [3DJuegos](https://i.3djuegos.com/juegos/16932/fotos/ficha/-5203988.jpg).
