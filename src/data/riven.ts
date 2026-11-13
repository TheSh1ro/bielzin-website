export const rivenSkillOrder = [
  'Q',
  'E',
  'W',
  'Q',
  'Q',
  'R',
  'Q',
  'E',
  'Q',
  'E',
  'R',
  'E',
  'E',
  'W',
  'W',
  'R',
  'W',
  'W',
] as const

export const rivenLessons = [
  {
    name: 'Lâmina Rúnica',
    image: 'RivenRunicBlades.png',
    description:
      'Habilidades geram até 3 cargas. Cada ataque básico gasta uma para causar dano físico extra.',
    tip: 'Faça Q → AA → Q → AA → Q → AA. Cada auto (AA) consome uma carga da passiva.',
  },
  {
    name: 'Asas Quebradas',
    image: 'RivenTriCleave.png',
    description: 'Três golpes físicos. O terceiro arremessa os inimigos ao ar por 0,75 s.',
    tip: 'Dê um auto entre cada Q para consumir a passiva. Não gaste os três Qs seguidos sem dar AA.',
  },
  {
    name: 'Explosão de Ki',
    image: 'RivenMartyr.png',
    description: 'Causa dano físico e atordoa inimigos ao redor.',
    tip: 'Use W para interromper um auto ou uma skill canalizada do inimigo. Antes de soltar o R2, dê o stun para ele não conseguir usar Flash.',
  },
  {
    name: 'Valentia',
    image: 'RivenFeint.png',
    description: 'Avança e recebe um escudo por 1,5 s.',
    tip: 'Use E na hora de tomar dano para aproveitar o escudo. Não gaste o dash antes e fique sem escudo quando o dano chegar.',
  },
  {
    name: 'Lâmina do Exílio',
    image: 'RivenFengShuiEngine.png',
    description:
      'R1 aumenta o dano de ataque e o alcance. R2 causa mais dano quanto menor a vida do alvo.',
    tip: 'Ative R1 antes de dar o combo do all-in para aproveitar o AD extra. Guarde R2 para finalizar: ele dá mais dano quanto menos HP o alvo tiver.',
  },
]
