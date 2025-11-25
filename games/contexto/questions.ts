export interface Question {
  question: string; // Pergunta completa
  words: string[]; // Array com exatamente 10 palavras
  answer: string; // Resposta correta
}

export const questions: Question[] = [
  {
    question: 'Que animal dorme de cabeça para baixo e consegue voar?',
    words: ['Que', 'animal', 'dorme', 'de', 'cabeça', 'para', 'baixo', 'e', 'consegue', 'voar'],
    answer: 'morcego',
  },
  {
    question: 'Qual fruta é conhecida como a rainha das frutas tropicais?',
    words: ['Qual', 'fruta', 'é', 'conhecida', 'como', 'a', 'rainha', 'das', 'frutas', 'tropicais'],
    answer: 'manga',
  },
  {
    question: 'Que instrumento musical tem 88 teclas?',
    words: ['Que', 'instrumento', 'musical', 'tem', '88', 'teclas', 'e', 'é', 'tocado', 'com'],
    answer: 'piano',
  },
  {
    question: 'Qual é o maior planeta do sistema solar?',
    words: ['Qual', 'é', 'o', 'maior', 'planeta', 'do', 'sistema', 'solar', 'e', 'tem'],
    answer: 'júpiter',
  },
  {
    question: 'Que animal é conhecido como o rei da selva?',
    words: ['Que', 'animal', 'é', 'conhecido', 'como', 'o', 'rei', 'da', 'selva', 'e'],
    answer: 'leão',
  },
  {
    question: 'Qual é a capital do Brasil?',
    words: ['Qual', 'é', 'a', 'capital', 'do', 'Brasil', 'localizada', 'no', 'centro', 'oeste'],
    answer: 'brasília',
  },
  {
    question: 'Que bebida é feita de grãos de café torrados?',
    words: ['Que', 'bebida', 'é', 'feita', 'de', 'grãos', 'de', 'café', 'torrados', 'e'],
    answer: 'café',
  },
  {
    question: 'Qual é o menor país do mundo?',
    words: ['Qual', 'é', 'o', 'menor', 'país', 'do', 'mundo', 'localizado', 'na', 'Europa'],
    answer: 'vaticano',
  },
  {
    question: 'Que animal marinho tem oito tentáculos?',
    words: ['Que', 'animal', 'marinho', 'tem', 'oito', 'tentáculos', 'e', 'é', 'muito', 'inteligente'],
    answer: 'polvo',
  },
  {
    question: 'Qual é o oceano mais profundo do mundo?',
    words: ['Qual', 'é', 'o', 'oceano', 'mais', 'profundo', 'do', 'mundo', 'localizado', 'no'],
    answer: 'pacífico',
  },
];

