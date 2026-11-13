type BuildPlan = {
  reason: string
  start?: number
  boots?: number
  core?: number[]
  situational?: { item: number; condition: string }
}

const plans = {
  armor: {
    reason: 'Priorize Cutelo Negro quando o oponente acumular armadura cedo.',
    core: [3071, 2517, 6610],
  },
  burst: {
    reason:
      'Comece por Céu Dividido para ganhar vida e recuperar parte da troca no primeiro ataque.',
    core: [6610, 2517, 6333],
    boots: 3047,
  },
  ranged: {
    reason: 'Escudo de Doran ajuda a aguentar o poke até encontrar uma abertura.',
    start: 1054,
    core: [6610, 2517, 6333],
  },
  magic: {
    reason: 'Antecipe resistência mágica se o dano inimigo estiver decidindo as trocas.',
    core: [2517, 6610, 3156],
    situational: { item: 3111, condition: 'Se também houver controle que a tenacidade reduza.' },
  },
  pokeMagic: {
    reason:
      'Use Escudo de Doran para aguentar o poke. O escudo do Limiar ajuda a entrar contra controle de longo alcance.',
    start: 1054,
    core: [6610, 2517, 3814],
    situational: { item: 3156, condition: 'Se o dano mágico estiver impedindo sua entrada.' },
  },
  healing: {
    reason:
      'Priorize vida e trocas curtas. Encaixe o Chamado do Carrasco cedo se a cura estiver decidindo o duelo.',
    core: [6610, 2517, 3071],
    situational: { item: 3123, condition: 'Quando você precisar aplicar Feridas Dolorosas.' },
  },
} satisfies Record<string, BuildPlan>

const opponentsByPlan: Record<keyof typeof plans, string[]> = {
  armor: [
    'Chogath',
    'DrMundo',
    'KSante',
    'Malphite',
    'Ornn',
    'Poppy',
    'Rammus',
    'Sejuani',
    'Shen',
    'Sion',
    'Skarner',
    'TahmKench',
    'Taric',
  ],
  burst: [
    'Ambessa',
    'Camille',
    'Darius',
    'Fiora',
    'Garen',
    'Irelia',
    'Jax',
    'Kled',
    'MonkeyKing',
    'Naafiri',
    'Nocturne',
    'Pantheon',
    'Qiyana',
    'Rengar',
    'Renekton',
    'Sett',
    'Talon',
    'Trundle',
    'Tryndamere',
    'Urgot',
    'Yasuo',
    'Yone',
    'Yorick',
    'Zed',
  ],
  ranged: [
    'Akshan',
    'Ashe',
    'Caitlyn',
    'Corki',
    'Draven',
    'Ezreal',
    'Gangplank',
    'Gnar',
    'Graves',
    'Jayce',
    'Jhin',
    'Lucian',
    'Quinn',
    'Sivir',
    'Smolder',
    'Tristana',
    'Varus',
    'Vayne',
  ],
  magic: [
    'Akali',
    'Diana',
    'Ekko',
    'Evelynn',
    'Fizz',
    'Galio',
    'Gwen',
    'Kassadin',
    'Katarina',
    'Kayle',
    'Leblanc',
    'Lissandra',
    'Mordekaiser',
    'Rumble',
    'Ryze',
    'Sylas',
    'Veigar',
    'Volibear',
  ],
  pokeMagic: [
    'Ahri',
    'Anivia',
    'Annie',
    'AurelionSol',
    'Aurora',
    'Azir',
    'Brand',
    'Cassiopeia',
    'Heimerdinger',
    'Hwei',
    'Karma',
    'Kennen',
    'Lux',
    'Malzahar',
    'Mel',
    'Neeko',
    'Orianna',
    'Seraphine',
    'Syndra',
    'Taliyah',
    'Teemo',
    'TwistedFate',
    'Velkoz',
    'Vex',
    'Viktor',
    'Xerath',
    'Ziggs',
    'Zoe',
    'Zyra',
  ],
  healing: [
    'Aatrox',
    'Briar',
    'Gragas',
    'Illaoi',
    'Nasus',
    'Olaf',
    'Soraka',
    'Swain',
    'Vladimir',
    'Warwick',
    'Zaahen',
  ],
}

const planByOpponent = new Map(
  (Object.keys(opponentsByPlan) as (keyof typeof plans)[]).flatMap((plan) =>
    opponentsByPlan[plan].map((id) => [id, plans[plan]] as const),
  ),
)

const overrides: Record<string, BuildPlan> = {
  Renekton: {
    ...plans.burst,
    reason:
      'Céu Dividido dá vida para aguentar a resposta do W fortalecido. Use o primeiro ataque para recuperar vida nas trocas curtas.',
  },
  Jax: {
    ...plans.burst,
    reason:
      'Galvanizadas ajudam contra os ataques do Jax. Faça trocas curtas e volte depois que o Contra-Ataque acabar.',
    core: [6610, 3071, 2517],
  },
  Malphite: {
    ...plans.armor,
    reason:
      'Se ele fechar armadura cedo, antecipe Cutelo. Escudo de Doran ajuda a segurar o poke do Q.',
    start: 1054,
  },
  Teemo: {
    ...plans.pokeMagic,
    reason:
      'Escudo de Doran ajuda a segurar o poke. Limiar pode bloquear a cegueira quando você entrar com o escudo intacto.',
  },
  Vayne: {
    ...plans.ranged,
    reason:
      'Use Escudo de Doran para atravessar o poke. Limiar ajuda a entrar sem perder a janela para o primeiro Condenar.',
    core: [2517, 3814, 6610],
  },
  Poppy: {
    ...plans.armor,
    reason:
      'Considere Cutelo cedo se ela fechar armadura. Céu Dividido ajuda nas trocas curtas depois que o W da Poppy acabar.',
    core: [6610, 3071, 2517],
  },
}

export function recommendBuild(opponent: string) {
  const plan: BuildPlan | undefined = overrides[opponent] ?? planByOpponent.get(opponent)
  return {
    isBase: !plan,
    reason:
      plan?.reason ??
      'Fome Eterna acelera os ciclos de habilidade. Céu Dividido dá margem para repetir trocas na lateral.',
    start: plan?.start ?? 1055,
    core: plan?.core ?? [2517, 6610, 6333],
    boots: plan?.boots ?? 3158,
    situational: plan?.situational,
  }
}
