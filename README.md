# bielzin

Perfil pessoal feito em Vue. Use `npm install` para instalar as dependências, `npm run dev` para abrir a prévia e `npm run build` para gerar o site.

## Supabase

Copie `.env.example` para `.env.local` e informe a URL e a chave **publicável** do projeto. Configure essas mesmas variáveis no Vercel para produção. O repositório `bielzin-tracker` contém o backend e o procedimento de implantação.

- `/admin` aceita a conta cadastrada no Supabase Auth e autorizada no banco. Cada salvamento fica disponível imediatamente no guia público. Reabra o guia ou volte à aba para ler a atualização.
- Após entrar em `/admin`, volte ao perfil para abrir **Contas**. A aba privada mostra nível e ranques com atualização diária e permite cadastrar contas, editar o Riot ID e revelar ou copiar credenciais sob demanda.
- A seção League of Legends atualiza o perfil, as últimas 40 partidas ranqueadas e o histórico de elo pelo Supabase. O site carrega os ícones no Data Dragon.
- O total abaixo de **Conexões** conta um navegador uma vez por dia de Brasília enquanto o armazenamento for preservado. O registro é disparado no carregamento de qualquer página pública do app, inclusive em acessos diretos ao guia da Riven. Os detalhes das novas entradas aparecem em **Visitas** no painel. A função Vercel usa `VISIT_INGEST_TOKEN` no servidor e envia ao Supabase a estimativa de cidade e estado disponível na requisição.

## Perfil de osu!

Em Jogos, a seção de osu! usa uma captura do perfil público de TKShadow no modo osu!standard. Rode `npm run snapshot:osu` para atualizar os dados e as capas em destaque a partir do site oficial. A coleta dispensa credenciais. Gere o site novamente após atualizar a captura.

## Xadrez

A seção de xadrez reúne os totais de dois perfis no Lichess e de dois perfis no arquivo público do Chess.com. O tempo registrado soma o total informado pelo Lichess à duração das partidas ao vivo do Chess.com com horários disponíveis. As partidas sem horários e as partidas diárias do Chess.com entram nas estatísticas de resultados. Rode `npm run snapshot:chess` para atualizar os números sem credenciais.

Para rodar os testes localmente, instale o Chromium com `npx playwright install chromium` e execute `npm test`. O GitHub Actions roda os testes, o lint, a checagem de formatação e o build.

Edite `src/profile.ts` para atualizar a bio, as conexões, os jogos, o projeto e as cores. Coloque arquivos próprios em `public/media/` e use caminhos como `/media/trilha.mp3`.

- `music.src` define um arquivo de áudio direto. Para uma faixa do YouTube, preencha `music.youtubeUrl` e ative `music.embedYouTube` se o vídeo permitir reprodução incorporada. O arquivo direto tem prioridade. `music.volume` define o volume inicial entre 0 e 1. Quando o perfil usa o card da trilha, o título aponta para `music.spotifyUrl` ou, se estiver vazio, para `music.youtubeUrl`.
- `music.startAt` define o ponto inicial do MP3 em segundos. Por exemplo, `32.5` inicia em 32,5 segundos. O padrão é `0`. Valores inválidos ou além da duração começam em zero.
- `theme.backgroundVideo` aceita um MP4 em loop silencioso. `theme.backgroundGif` aceita um GIF se não houver vídeo. `theme.backgroundStill` define a imagem estática usada quando o dispositivo solicita movimento reduzido.
- O fundo atual usa `public/media/mikey_linktree_preview_animado.gif`, animado desde a entrada. Uma imagem estática do primeiro quadro aparece quando o dispositivo solicita movimento reduzido.
- `avatar` configura a foto do perfil. A trilha começa ao entrar, se estiver ativada.
- O controle do MP3 fica no canto superior esquerdo. O ícone permite entrar sem música e, dentro do perfil, pausar ou retomar. A barra ajusta o volume.

Os ícones das marcas vêm do [Simple Icons](https://github.com/simple-icons/simple-icons). A imagem da Reyna vem do [VALORANT Media](https://playvalorant.com/en-us/media/).

Capa do osu!: [Twitch](https://static-cdn.jtvnw.net/ttv-boxart/osu%21-285x380.jpg).

Arte do banner de osu! por Senkoru, publicada no [concurso de Halloween de 2026](https://osu.ppy.sh/home/news/2026-10-20-halloween-2026-fanart-contest-results).
