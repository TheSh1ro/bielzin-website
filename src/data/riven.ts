import { riotCdn } from '@/lib/data-dragon'

const runeIconBase = riotCdn + '/cdn/img/perk-images/'

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

export const rivenRuneGroups = [
  {
    name: 'Precisão',
    runes: [
      ['Conquistador', runeIconBase + 'Styles/Precision/Conqueror/Conqueror.png'],
      ['Triunfo', runeIconBase + 'Styles/Precision/Triumph.png'],
      ['Lenda: Aceleração', runeIconBase + 'Styles/Precision/LegendHaste/LegendHaste.png'],
      ['Até a Morte', runeIconBase + 'Styles/Sorcery/LastStand/LastStand.png'],
    ],
  },
  {
    name: 'Inspiração',
    runes: [
      ['Reembolso', runeIconBase + 'Styles/Inspiration/CashBack/CashBack2.png'],
      ['Quebra-galho', '/media/riven/jack-of-all-trades.png'],
    ],
  },
  {
    name: 'Fragmentos',
    runes: [
      ['Aceleração de Habilidade', runeIconBase + 'StatMods/StatModsCDRScalingIcon.png'],
      ['Força Adaptativa', runeIconBase + 'StatMods/StatModsAdaptiveForceIcon.png'],
      ['Vida Escalável', runeIconBase + 'StatMods/StatModsHealthScalingIcon.png'],
    ],
  },
] as const

export const rivenLessons = [
  {
    name: 'Lâmina Rúnica',
    image: 'RivenRunicBlades.png',
    description:
      'Habilidades geram até 3 cargas. Cada ataque básico gasta uma para causar dano físico extra.',
    tip: 'Faça Q → ataque básico → Q → ataque básico → Q → ataque básico para gastar uma carga a cada golpe.',
  },
  {
    name: 'Asas Quebradas',
    image: 'RivenTriCleave.png',
    description: 'Três golpes físicos. O terceiro arremessa os inimigos ao ar por 0,75 s.',
    tip: 'Alterne cada Q com um ataque básico para aproveitar as cargas da passiva.',
  },
  {
    name: 'Explosão de Ki',
    image: 'RivenMartyr.png',
    description: 'Causa dano físico e atordoa inimigos ao redor.',
    tip: 'Use o W para interromper a animação de um ataque básico ou uma habilidade canalizada. Antes do R2, atordoe o alvo para impedir que ele use Flash.',
  },
  {
    name: 'Valentia',
    image: 'RivenFeint.png',
    description: 'Avança e recebe um escudo por 1,5 s.',
    tip: 'Use o E pouco antes de tomar dano para bloquear parte do golpe e sair na vantagem na troca.',
  },
  {
    name: 'Lâmina do Exílio',
    image: 'RivenFengShuiEngine.png',
    description:
      'R1 aumenta o dano de ataque e o alcance. R2 causa mais dano quanto menor a vida do alvo.',
    tip: 'O R é sua principal ferramenta para iniciar uma jogada. Ative o R1 quando decidir entrar de vez na luta.',
  },
]
