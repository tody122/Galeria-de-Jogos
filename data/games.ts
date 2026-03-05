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
    description: 'Baseado em Hues and Cues: dê dicas de uma cor secreta no gradiente; os outros apostam. Pontos por proximidade!',
    multiplayer: true,
  },
  {
    id: 'segue-o-fluxo',
    name: 'Segue o Fluxo',
    description: 'Jogo de fluxo e ritmo. Em breve!',
    multiplayer: true,
  },
];

