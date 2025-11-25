export interface Question {
  question: string; // Pergunta completa (EXATAMENTE 10 palavras)
  words: string[]; // Array com exatamente 10 palavras
  answer: string; // Resposta correta (em minúsculas)
}

export const questions: Question[] = [
  {
    question: 'Qual o condimento que é feito de ovos e óleo?',
    words: ['Qual','o','condimento','que','é','feito','de','ovos','e','óleo'],
    answer: 'maionese',
  },
  {
    question: 'Qual a fruta que é amarela, doce e tropical?',
    words: ['Qual','a','fruta','que','é','amarela,','doce','e','tropical','?'],
    answer: 'banana',
  },
  {
    question: 'Qual o animal que mia, gosta de leite e caça ratos?',
    words: ['Qual','o','animal','que','mia,','gosta','de','leite','e','caça'],
    answer: 'gato',
  },
  {
    question: 'Qual o líquido transparente que bebemos todos os dias sempre?',
    words: ['Qual','o','líquido','transparente','que','bebemos','todos','os','dias','sempre'],
    answer: 'água',
  },
  {
    question: 'Qual o planeta vermelho conhecido como vizinho da Terra inteira?',
    words: ['Qual','o','planeta','vermelho','conhecido','como','vizinho','da','Terra','inteira'],
    answer: 'marte',
  },
  {
    question: 'Qual o metal usado em moedas, jóias e eletrônicos modernos hoje?',
    words: ['Qual','o','metal','usado','em','moedas,','jóias','e','eletrônicos','modernos'],
    answer: 'ouro',
  },
  {
    question: 'Qual o doce feito com leite, açúcar e cacau delicioso?',
    words: ['Qual','o','doce','feito','com','leite,','açúcar','e','cacau','delicioso'],
    answer: 'chocolate',
  },
  {
    question: 'Qual o animal que late, abana o rabo e é fiel?',
    words: ['Qual','o','animal','que','late,','abana','o','rabo','e','é'],
    answer: 'cachorro',
  },
  {
    question: 'Qual o objeto usado para escrever em cadernos e papéis sempre?',
    words: ['Qual','o','objeto','usado','para','escrever','em','cadernos','e','papéis'],
    answer: 'caneta',
  },
  {
    question: 'Qual o astro que ilumina a Terra durante o dia inteiro?',
    words: ['Qual','o','astro','que','ilumina','a','Terra','durante','o','dia'],
    answer: 'sol',
  },
];