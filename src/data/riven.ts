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
      'Usar uma skill dá um stack da passiva, até 3. Cada AA gasta um stack e dá dano físico extra.',
    tip: 'Intercale os Qs com AA: Q → AA → Q → AA → Q → AA. Assim você usa a passiva em cada auto.',
  },
  {
    name: 'Asas Quebradas',
    image: 'RivenTriCleave.png',
    description: 'Você pode usar Q três vezes. O Q3 dá knock-up por 0,75 s.',
    tip: 'Dê AA entre os Qs para usar a passiva. Evite gastar os três Qs sem bater entre eles.',
  },
  {
    name: 'Explosão de Ki',
    image: 'RivenMartyr.png',
    description: 'Dá dano físico e stun em quem estiver perto.',
    tip: 'Use W para interromper um auto ou uma skill canalizada do inimigo. Antes de soltar o R2, dê o stun para ele não conseguir usar Flash.',
  },
  {
    name: 'Valentia',
    image: 'RivenFeint.png',
    description: 'Dá um dash e ganha um shield por 1,5 s.',
    tip: 'Use E quando o dano for entrar. Se gastar o dash cedo demais, o shield acaba antes de segurar o hit.',
  },
  {
    name: 'Lâmina do Exílio',
    image: 'RivenFengShuiEngine.png',
    description: 'R1 dá AD e mais range. R2 dá mais dano quanto menos HP o alvo tiver.',
    tip: 'Ative R1 antes do all-in para combar com o AD extra. Guarde R2 para finalizar quando o alvo estiver com pouco HP.',
  },
]
