type Link = {
  label: string
  detail: string
  href: string
  icon: 'twitch' | 'youtube' | 'spotify' | 'x' | 'discord' | 'github' | 'link'
}
type Game = { name: string; cover?: string; mark?: string; color?: string }

export const profile = {
  name: 'bielzin',
  handle: '@thesh1ro',
  avatar: '/media/avatar.jpg',
  role: 'Desenvolvedor',
  bio: 'Planejo, desenho e desenvolvo produtos digitais',
  entryLabel: 'Entrar no perfil',
  theme: {
    accent: '#e4e4e7',
    background: '#070708',
    surface: '#111113',
    text: '#f4f4f5',
    muted: '#a1a1aa',
    backgroundVideo: '',
    backgroundGif: '/media/mikey_linktree_preview_animado.gif',
    backgroundStill: '/media/mikey-fundo.png',
  },
  music: {
    src: '/media/cant-sleep.mp3',
    youtubeUrl: 'https://www.youtube.com/watch?v=QNm7nudU6bI',
    embedYouTube: false,
    title: 'inoqx - cant sleep',
    artist: '',
    // Ponto inicial da música em segundos. Exemplo: 32.5 começa em 0:32,5.
    startAt: 0,
    volume: 0.05,
  },
  links: [
    {
      label: 'Twitch',
      detail: 'bielzinlr',
      href: 'https://www.twitch.tv/bielzinlr',
      icon: 'twitch',
    },
    {
      label: 'YouTube',
      detail: '@BielzinLR',
      href: 'https://www.youtube.com/@BielzinLR',
      icon: 'youtube',
    },
    {
      label: 'Spotify',
      detail: 'Perfil',
      href: 'https://open.spotify.com/user/6mzi33jmxdxx3t6hd4w6ty4f3',
      icon: 'spotify',
    },
    { label: 'X', detail: '@thesh1ro_', href: 'https://x.com/thesh1ro_', icon: 'x' },
    {
      label: 'Discord',
      detail: 'Perfil',
      href: 'https://discord.com/users/650180750871756826',
      icon: 'discord',
    },
    { label: 'GitHub', detail: '@TheSh1ro', href: 'https://github.com/TheSh1ro', icon: 'github' },
    { label: 'Linktree', detail: '@thesh1ro', href: 'https://linktr.ee/thesh1ro', icon: 'link' },
  ] satisfies Link[],
  favoriteGame: {
    name: 'League of Legends',
    cover: '/media/riven.jpg',
    guide: 'https://www.canva.com/design/DAGO4iMzYcM/b25o5mj_BhH2WvXUZOIkoA/view',
  },
  games: [
    { name: 'VALORANT', cover: '/media/valorant-reyna.jpg' },
    { name: 'osu!', cover: '/media/osu-cover.jpg' },
    { name: 'Palworld', cover: '/media/palworld.jpg' },
    { name: 'Sea of Thieves', cover: '/media/sea-of-thieves.jpg' },
    { name: 'Stardew Valley', cover: '/media/stardew.jpg' },
    { name: 'DayZ', cover: '/media/dayz.jpg' },
    { name: 'Brawlhalla', cover: '/media/brawlhalla.jpg' },
  ] as Game[],
  project: {
    name: 'Plataforma de EloJob',
    description:
      'Um site para contratar serviços de LoL, com um app para a equipe pegar e acompanhar os pedidos.',
    tech: ['Vue', 'Django', 'PostgreSQL'],
    href: 'https://newelo.vercel.app/',
    cover: '/media/newelo.png',
  },
  development: {
    about:
      'Meu interesse por programação começou nos jogos. Quando era mais novo, gostava de brincar com Cheat Engine no Transformice, tentando entender como as coisas funcionavam e criando meus próprios cheats.',
    story: [
      'Também gostava de automatizar o que dava: scripts DOS no Windows, macros com AutoHotkey e scripts de Elfbot no Tibia. Boa parte da diversão era fazer algo funcionar, ajustar e testar de novo.',
      'Foi nessa época que comecei a brincar com C++ e, pouco depois, fui para JavaScript. A vontade de criar automações continuou. Hoje ela aparece nos sites, aplicativos e ferramentas para jogos que faço, incluindo os projetos abaixo.',
    ],
    background: {
      courses: ['Técnico em Informática para Internet', 'Curso de manutenção de TI'],
      foundations: [
        'Redes e TCP/IP',
        'Instalação e configuração de servidores',
        'Banco de dados, backup e restauração',
        'Desenvolvimento e integração web',
        'Versionamento e testes de software',
        'Fundamentos de segurança da informação',
      ],
      practice: ['Infraestrutura · prática em projetos'],
      note: 'Minha experiência com infraestrutura veio colocando projetos no ar e cuidando do ambiente em que eles rodam.',
    },
    connectedProjects: [
      {
        name: 'Celerity',
        category: 'Site & painel',
        description:
          'O site onde os usuários gerenciam e renovam suas licenças pagas do DayZ Bot, compram créditos e baixam o aplicativo. Eu cuido das contas e licenças pelo painel de administração.',
        features: [
          'Permite comprar créditos e renovar a licença',
          'Mostra o prazo da licença e disponibiliza o download do app',
          'Conta com painel admin para gerenciar usuários e licenças',
        ],
        tech: ['Vue', 'Supabase', 'PostgreSQL'],
        repo: 'https://github.com/TheSh1ro/celerity-website',
      },
      {
        name: 'DayZ Bot',
        category: 'Aplicativo desktop',
        description:
          'Um app para automatizar pesca, esfolar animais e mover itens no DayZ. Ele acompanha o jogo pela imagem da tela e mostra o andamento em um overlay. O uso exige uma licença paga, gerenciada pelo Celerity.',
        features: [
          'Permite alternar entre pesca, esfolar e mover itens',
          'Permite ajustar a sensibilidade da detecção por imagem',
          'Mostra peixes, tempo médio e status no overlay',
          'Conta com atalhos para iniciar, pausar e encerrar',
          'Permite definir a origem e o destino dos itens',
        ],
        tech: ['Python', 'OpenCV', 'PyQt5', 'Código privado'],
        repo: '',
      },
    ],
    projects: [
      {
        name: 'Versus',
        category: 'Thumbnails de LoL',
        description:
          'Um editor de thumbnails de LoL que permite combinar campeões e skins, ajustar as imagens e baixar a composição.',
        features: [
          'Permite escolher um campeão e uma skin de cada lado',
          'Permite ajustar o enquadramento arrastando as imagens',
          'Exporta a imagem em 1280 × 768',
        ],
        tech: ['Vue', 'TypeScript', 'Canvas', 'Data Dragon'],
        repo: 'https://github.com/TheSh1ro/thumbcreator-website',
      },
      {
        name: 'DayZ Map',
        category: 'DayZ',
        description:
          'Um mapa de Chernarus para encontrar loot e marcar as bases do clã, sem ficar perdido entre coordenadas.',
        features: [
          'Permite filtrar os pontos de interesse no mapa',
          'Permite buscar cidades e marcar bases',
          'Salva as marcações localmente no navegador',
        ],
        tech: ['Vue', 'TypeScript', 'Leaflet', 'Pinia'],
        repo: 'https://github.com/TheSh1ro/dayz-map',
      },
      {
        name: 'RAG Q&A',
        category: 'Teste com IA',
        description:
          'Um teste de chat que consulta documentos para responder perguntas. Ele mostra de onde tirou a resposta.',
        features: [
          'Aceita documentos PDF, DOCX e TXT',
          'Procura os trechos relacionados à pergunta',
          'Mostra as fontes e a confiança na resposta',
        ],
        tech: ['Python', 'FastAPI', 'ChromaDB', 'Groq'],
        repo: 'https://github.com/TheSh1ro/rag-experiment',
      },
    ],
    areas: [
      {
        name: 'Interfaces',
        detail: 'Para fazer as telas dos sites e aplicativos.',
        tech: ['TypeScript', 'Vue', 'React', 'Electron'],
      },
      {
        name: 'Backend & dados',
        detail: 'Para cuidar dos dados e do que acontece por trás das telas.',
        tech: ['Python', 'Django', 'PostgreSQL', 'MongoDB'],
      },
      {
        name: 'O que ando testando',
        detail: 'Alguns assuntos que aparecem nos meus projetos.',
        tech: ['Automação', 'IA', 'Busca semântica', 'Mapas'],
      },
    ],
  },
}
