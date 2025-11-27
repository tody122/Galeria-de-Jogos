import { Game } from '@/types/game';

export const gamesList: Game[] = [
  {
    id: 'contexto',
    name: 'Contexto',
    description: 'Adivinhe a palavra secreta usando dicas! Quanto mais próximo, menor a distância.',
    multiplayer: true,
  },
  {
    id: 'sintonia',
    name: 'Sintonia',
    description: 'Jogo de sintonia e conexão. Em breve!',
    multiplayer: true,
  },
  {
    id: 'a-faixa',
    name: 'Meio Termo',
    description: 'Jogo de meio termo e estratégia. Em breve!',
    multiplayer: true,
  },
  {
    id: 'exemplo-single',
    name: 'Jogo Single Player',
    description: 'Exemplo de jogo para um jogador',
    multiplayer: false,
  },
  {
    id: 'colorama',
    name: 'Colorama',
    description: 'Jogo de cores e estratégia. Em desenvolvimento!',
    multiplayer: true,
  },
];

