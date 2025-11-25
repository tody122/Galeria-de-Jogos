export interface Question {
  question: string; // Pergunta completa (EXATAMENTE 10 palavras)
  words: string[]; // Array com exatamente 10 palavras
  answer: string; // Resposta correta (em minúsculas)
}

export const questions: Question[] = [
  // --- Opções 1 a 10 (Adaptadas) ---
  {
    question: 'Qual o nome do cientista que criou a vacina da poliomielite?',
    words: ['Qual', 'o', 'nome', 'do', 'cientista', 'que', 'criou', 'a', 'vacina', 'da'],
    answer: 'jonas salk',
  },
  {
    question: 'Que animal é o mais rápido em terra do planeta todo?',
    words: ['Que', 'animal', 'é', 'o', 'mais', 'rápido', 'em', 'terra', 'do', 'planeta'],
    answer: 'guepardo',
  },
  {
    question: 'Qual o oceano que banha a costa leste do Brasil inteiro?',
    words: ['Qual', 'o', 'oceano', 'que', 'banha', 'a', 'costa', 'leste', 'do', 'Brasil'],
    answer: 'atlântico',
  },
  {
    question: 'Que tipo de profissional trabalha combatendo incêndios perigosos todos os dias?',
    words: ['Que', 'tipo', 'de', 'profissional', 'trabalha', 'combatendo', 'incêndios', 'perigosos', 'todos', 'os'],
    answer: 'bombeiro',
  },
  {
    question: 'Qual o nome do famoso monumento de Paris chamado Torre Eiffel?',
    words: ['Qual', 'o', 'nome', 'do', 'famoso', 'monumento', 'de', 'Paris', 'chamado', 'Eiffel'],
    answer: 'torre eiffel',
  },
  {
    question: 'Que famoso escritor brasileiro escreveu o livro Dom Casmurro e outros?',
    words: ['Que', 'famoso', 'escritor', 'brasileiro', 'escreveu', 'o', 'livro', 'Dom', 'Casmurro', 'e'],
    answer: 'machado de assis',
  },
  {
    question: 'Qual é a principal fonte natural de vitamina C do nosso corpo?',
    words: ['Qual', 'é', 'a', 'principal', 'fonte', 'natural', 'de', 'vitamina', 'C', 'do'],
    answer: 'laranja',
  },
  {
    question: 'Que instrumento musical é tocado com um arco e tem cordas?',
    words: ['Que', 'instrumento', 'musical', 'é', 'tocado', 'com', 'um', 'arco', 'e', 'cordas'],
    answer: 'violino',
  },
  {
    question: 'Qual a capital do país vizinho Portugal que é a Espanha?',
    words: ['Qual', 'a', 'capital', 'do', 'país', 'vizinho', 'Portugal', 'que', 'é', 'Espanha'],
    answer: 'madrid',
  },
  {
    question: 'Que processo transforma a água líquida em vapor de forma natural?',
    words: ['Que', 'processo', 'transforma', 'a', 'água', 'líquida', 'em', 'vapor', 'de', 'forma'],
    answer: 'evaporação',
  },
  // --- Opções 11 a 20 ---
  {
    question: 'Qual o nome do osso que fica no antebraço e conecta?',
    words: ['Qual', 'o', 'nome', 'do', 'osso', 'que', 'fica', 'no', 'antebraço', 'e'],
    answer: 'rádio',
  },
  {
    question: 'Que fruta é usada para fazer a famosa sobremesa guacamole que todos?',
    words: ['Que', 'fruta', 'é', 'usada', 'para', 'fazer', 'a', 'famosa', 'guacamole', 'que'],
    answer: 'abacate',
  },
  {
    question: 'Qual o planeta conhecido por ser o Gigante Gasoso do nosso sistema?',
    words: ['Qual', 'o', 'planeta', 'conhecido', 'por', 'ser', 'o', 'Gigante', 'Gasoso', 'do'],
    answer: 'júpiter',
  },
  {
    question: 'Que famosa obra de arte mostra um céu estrelado e cores?',
    words: ['Que', 'famosa', 'obra', 'de', 'arte', 'mostra', 'um', 'céu', 'estrelado', 'e'],
    answer: 'noite estrelada',
  },
  {
    question: 'Que objeto é usado para medir o tempo numa corrida rápida?',
    words: ['Que', 'objeto', 'é', 'usado', 'para', 'medir', 'o', 'tempo', 'numa', 'corrida'],
    answer: 'cronómetro',
  },
  {
    question: 'Qual o nome da estrutura fina que tece as aranhas para caçar?',
    words: ['Qual', 'o', 'nome', 'da', 'estrutura', 'fina', 'que', 'tece', 'as', 'aranhas'],
    answer: 'teia',
  },
  {
    question: 'Que famoso cientista formulou a teoria da relatividade geral e tudo?',
    words: ['Que', 'famoso', 'cientista', 'formulou', 'a', 'teoria', 'da', 'relatividade', 'geral', 'e'],
    answer: 'albert einstein',
  },
  {
    question: 'Qual o nome da língua falada pela maioria na China hoje?',
    words: ['Qual', 'o', 'nome', 'da', 'língua', 'falada', 'pela', 'maioria', 'na', 'China'],
    answer: 'mandarim',
  },
  {
    question: 'Que profissional cuida da saúde dos animais de estimação e outros?',
    words: ['Que', 'profissional', 'cuida', 'da', 'saúde', 'dos', 'animais', 'de', 'estimação', 'e'],
    answer: 'veterinário',
  },
  {
    question: 'Qual o nome do ponto mais alto do planeta Terra todo?',
    words: ['Qual', 'o', 'nome', 'do', 'ponto', 'mais', 'alto', 'do', 'planeta', 'Terra'],
    answer: 'monte evereste',
  },
  // --- Opções 21 a 30 ---
  {
    question: 'Que parte do corpo usamos para sentir os diferentes cheiros todos?',
    words: ['Que', 'parte', 'do', 'corpo', 'usamos', 'para', 'sentir', 'os', 'diferentes', 'cheiros'],
    answer: 'nariz',
  },
  {
    question: 'Qual a menor unidade básica de toda a matéria e tudo?',
    words: ['Qual', 'a', 'menor', 'unidade', 'básica', 'de', 'toda', 'a', 'matéria', 'e'],
    answer: 'átomo',
  },
  {
    question: 'Que tipo de metal é usado para fazer moedas de pouco valor?',
    words: ['Que', 'tipo', 'de', 'metal', 'é', 'usado', 'para', 'fazer', 'moedas', 'de'],
    answer: 'cobre',
  },
  {
    question: 'Que fenómeno natural causa um arco colorido no céu e chuva?',
    words: ['Que', 'fenómeno', 'natural', 'causa', 'um', 'arco', 'colorido', 'no', 'céu', 'e'],
    answer: 'arco-íris',
  },
  {
    question: 'Qual o nome do estado brasileiro famoso por ter carnaval gigante?',
    words: ['Qual', 'o', 'nome', 'do', 'estado', 'brasileiro', 'famoso', 'por', 'ter', 'carnaval'],
    answer: 'bahia',
  },
  {
    question: 'Que é o principal componente do ar que respiramos e existe?',
    words: ['Que', 'é', 'o', 'principal', 'componente', 'do', 'ar', 'que', 'respiramos', 'e'],
    answer: 'nitrogénio',
  },
  {
    question: 'Qual o nome da fruta que é uma baga roxa ou verde?',
    words: ['Qual', 'o', 'nome', 'da', 'fruta', 'que', 'é', 'uma', 'baga', 'roxa'],
    answer: 'uva',
  },
  {
    question: 'Que famoso inventor criou a lâmpada elétrica incandescente e a luz?',
    words: ['Que', 'famoso', 'inventor', 'criou', 'a', 'lâmpada', 'elétrica', 'incandescente', 'e', 'a'],
    answer: 'thomas edison',
  },
  {
    question: 'Qual a capital do nosso vizinho sul-americano chamado Argentina e tudo?',
    words: ['Qual', 'a', 'capital', 'do', 'nosso', 'vizinho', 'sul-americano', 'chamado', 'Argentina', 'e'],
    answer: 'buenos aires',
  },
  {
    question: 'Que tipo de alimento é transformado em pão depois de moído muito?',
    words: ['Que', 'tipo', 'de', 'alimento', 'é', 'transformado', 'em', 'pão', 'depois', 'de'],
    answer: 'trigo',
  },
  // --- Opções 31 a 40 ---
  {
    question: 'Qual o nome do animal que se transforma em borboleta colorida linda?',
    words: ['Qual', 'o', 'nome', 'do', 'animal', 'que', 'se', 'transforma', 'em', 'borboleta'],
    answer: 'lagarta',
  },
  {
    question: 'Que profissional trabalha desenhando plantas de casas e edifícios altos?',
    words: ['Que', 'profissional', 'trabalha', 'desenhando', 'plantas', 'de', 'casas', 'e', 'edifícios', 'e'],
    answer: 'arquiteto',
  },
  {
    question: 'Qual o nome da ciência que estuda os astros e o universo todo?',
    words: ['Qual', 'o', 'nome', 'da', 'ciência', 'que', 'estuda', 'os', 'astros', 'e'],
    answer: 'astronomia',
  },
  {
    question: 'Que bebida popular é feita com folhas secas e água quente sempre?',
    words: ['Que', 'bebida', 'popular', 'é', 'feita', 'com', 'folhas', 'secas', 'e', 'água'],
    answer: 'chá',
  },
  {
    question: 'Qual o nome do continente que engloba países como Canadá e outros?',
    words: ['Qual', 'o', 'nome', 'do', 'continente', 'que', 'engloba', 'países', 'como', 'Canadá'],
    answer: 'américa do norte',
  },
  {
    question: 'Que tipo de clima é caracterizado por calor extremo e pouca chuva no?',
    words: ['Que', 'tipo', 'de', 'clima', 'é', 'caracterizado', 'por', 'calor', 'extremo', 'e'],
    answer: 'desértico',
  },
  {
    question: 'Qual o número de minutos que tem exatamente uma hora grande?',
    words: ['Qual', 'o', 'número', 'de', 'minutos', 'que', 'tem', 'exatamente', 'uma', 'hora'],
    answer: 'sessenta',
  },
  {
    question: 'Que elemento químico tem o símbolo H na tabela e é leve?',
    words: ['Que', 'elemento', 'químico', 'tem', 'o', 'símbolo', 'H', 'na', 'tabela', 'e'],
    answer: 'hidrogénio',
  },
  {
    question: 'Qual o nome do desporto jogado numa piscina com rede e água?',
    words: ['Qual', 'o', 'nome', 'do', 'desporto', 'jogado', 'numa', 'piscina', 'com', 'rede'],
    answer: 'polo aquático',
  },
  {
    question: 'Que é a parte da planta que contém a semente dentro dela?',
    words: ['Que', 'é', 'a', 'parte', 'da', 'planta', 'que', 'contém', 'a', 'semente'],
    answer: 'fruto',
  },
  // --- Opções 41 a 50 ---
  {
    question: 'Qual o nome dado ao filhote do cão pequeno e fofo?',
    words: ['Qual', 'o', 'nome', 'dado', 'ao', 'filhote', 'do', 'cão', 'pequeno', 'e'],
    answer: 'cachorrinho',
  },
  {
    question: 'Que tipo de bolo é feito com cenoura e tem uma cobertura doce no?',
    words: ['Que', 'tipo', 'de', 'bolo', 'é', 'feito', 'com', 'cenoura', 'e', 'doce'],
    answer: 'bolo de cenoura',
  },
  {
    question: 'Qual o nome do instrumento usado para medir a pressão atmosférica do ar hoje?',
    words: ['Qual', 'o', 'nome', 'do', 'instrumento', 'usado', 'para', 'medir', 'a', 'pressão'],
    answer: 'barómetro',
  },
  {
    question: 'Que famoso pintor holandês cortou sua própria orelha esquerda e deu?',
    words: ['Que', 'famoso', 'pintor', 'holandês', 'cortou', 'sua', 'própria', 'orelha', 'esquerda', 'e'],
    answer: 'vincent van gogh',
  },
  {
    question: 'Qual o nome do metal que é líquido na temperatura ambiente normal?',
    words: ['Qual', 'o', 'nome', 'do', 'metal', 'que', 'é', 'líquido', 'na', 'temperatura'],
    answer: 'mercúrio',
  },
  {
    question: 'Que tipo de roupa é feita de lã de ovelha macia?',
    words: ['Que', 'tipo', 'de', 'roupa', 'é', 'feita', 'de', 'lã', 'de', 'ovelha'],
    answer: 'camisola',
  },
  {
    question: 'Qual a cor que se obtém misturando amarelo e azul claro juntos?',
    words: ['Qual', 'a', 'cor', 'que', 'se', 'obtém', 'misturando', 'amarelo', 'e', 'azul'],
    answer: 'verde',
  },
  {
    question: 'Que famoso monumento fica na capital da Índia e é lindo?',
    words: ['Que', 'famoso', 'monumento', 'fica', 'na', 'capital', 'da', 'Índia', 'e', 'é'],
    answer: 'taj mahal',
  },
  {
    question: 'Qual o nome do gás usado para encher balões leves de festa?',
    words: ['Qual', 'o', 'nome', 'do', 'gás', 'usado', 'para', 'encher', 'balões', 'leves'],
    answer: 'hélio',
  },
  {
    question: 'Que animal marinho é famoso por mudar de cor e camuflar?',
    words: ['Que', 'animal', 'marinho', 'é', 'famoso', 'por', 'mudar', 'de', 'cor', 'e'],
    answer: 'polvo',
  },
  // --- Opções 51 a 60 (Novas) ---
  {
    question: 'Que parte do corpo produz os sons da nossa voz e canta?',
    words: ['Que', 'parte', 'do', 'corpo', 'produz', 'os', 'sons', 'da', 'nossa', 'voz'],
    answer: 'laringe',
  },
  {
    question: 'Qual o nome da fruta com casca peluda e interior verde brilhante?',
    words: ['Qual', 'o', 'nome', 'da', 'fruta', 'com', 'casca', 'peluda', 'e', 'verde'],
    answer: 'kiwi',
  },
  {
    question: 'Que planeta é conhecido por ser o planeta vermelho e gigante?',
    words: ['Que', 'planeta', 'é', 'conhecido', 'por', 'ser', 'o', 'planeta', 'vermelho', 'e'],
    answer: 'marte',
  },
  {
    question: 'Qual a principal função das folhas de uma planta na vida dela?',
    words: ['Qual', 'a', 'principal', 'função', 'das', 'folhas', 'de', 'uma', 'planta', 'é'],
    answer: 'fotossíntese',
  },
  {
    question: 'Que profissional cria programas de computador usando códigos e lógica?',
    words: ['Que', 'profissional', 'cria', 'programas', 'de', 'computador', 'usando', 'códigos', 'e', 'lógica'],
    answer: 'programador',
  },
  {
    question: 'Qual a capital do país insular chamado de Islândia do Norte hoje?',
    words: ['Qual', 'a', 'capital', 'do', 'país', 'insular', 'chamado', 'de', 'Islândia', 'é'],
    answer: 'reykjavik',
  },
  {
    question: 'Que parte do corpo humano permite-nos ver e observar o mundo todo?',
    words: ['Que', 'parte', 'do', 'corpo', 'humano', 'permite-nos', 'ver', 'e', 'observar', 'o'],
    answer: 'olhos',
  },
  {
    question: 'Qual o nome dado ao processo de fazer gelo a partir de água fria?',
    words: ['Qual', 'o', 'nome', 'dado', 'ao', 'processo', 'de', 'fazer', 'gelo', 'e'],
    answer: 'congelamento',
  },
  {
    question: 'Que famoso quadro mostra um fazendeiro e a sua esposa em casa?',
    words: ['Que', 'famoso', 'quadro', 'mostra', 'um', 'fazendeiro', 'e', 'a', 'sua', 'esposa'],
    answer: 'american gothic',
  },
  {
    question: 'Qual a cor obtida quando misturamos o vermelho e o amarelo forte muito?',
    words: ['Qual', 'a', 'cor', 'obtida', 'quando', 'misturamos', 'o', 'vermelho', 'e', 'amarelo'],
    answer: 'laranja',
  },
  // --- Opções 61 a 70 ---
  {
    question: 'Que tipo de energia é gerada pela força do vento forte e gira?',
    words: ['Que', 'tipo', 'de', 'energia', 'é', 'gerada', 'pela', 'força', 'do', 'vento'],
    answer: 'eólica',
  },
  {
    question: 'Qual o nome do gás incolor e inodoro que respiramos para viver bem?',
    words: ['Qual', 'o', 'nome', 'do', 'gás', 'incolor', 'e', 'inodoro', 'que', 'respiramos'],
    answer: 'oxigénio',
  },
  {
    question: 'Que instrumento de medição tem ponteiros para indicar as horas cheias sempre?',
    words: ['Que', 'instrumento', 'de', 'medição', 'tem', 'ponteiros', 'para', 'indicar', 'as', 'horas'],
    answer: 'relógio',
  },
  {
    question: 'Qual a maior cadeia de montanhas do mundo localizada na Ásia grande?',
    words: ['Qual', 'a', 'maior', 'cadeia', 'de', 'montanhas', 'do', 'mundo', 'na', 'Ásia'],
    answer: 'himalaias',
  },
  {
    question: 'Que animal selvagem é famoso por ter listras pretas e brancas no?',
    words: ['Que', 'animal', 'selvagem', 'é', 'famoso', 'por', 'ter', 'listras', 'pretas', 'e'],
    answer: 'zebra',
  },
  {
    question: 'Qual o nome do elemento químico com o símbolo Fe na tabela toda?',
    words: ['Qual', 'o', 'nome', 'do', 'elemento', 'químico', 'com', 'o', 'símbolo', 'Fe'],
    answer: 'ferro',
  },
  {
    question: 'Que famoso imperador chinês construiu a Muralha da China inteira?',
    words: ['Que', 'famoso', 'imperador', 'chinês', 'construiu', 'a', 'Muralha', 'da', 'China', 'e'],
    answer: 'qin shi huang',
  },
  {
    question: 'Qual o nome do animal que se transforma em sapo adulto e anda?',
    words: ['Qual', 'o', 'nome', 'do', 'animal', 'que', 'se', 'transforma', 'em', 'sapo'],
    answer: 'girino',
  },
  {
    question: 'Que profissional trabalha criando e editando vídeos para as redes hoje?',
    words: ['Que', 'profissional', 'trabalha', 'criando', 'e', 'editando', 'vídeos', 'para', 'as', 'redes'],
    answer: 'editor de vídeo',
  },
  {
    question: 'Qual a capital do país conhecido por ter a cidade de Cancún e lá?',
    words: ['Qual', 'a', 'capital', 'do', 'país', 'conhecido', 'por', 'ter', 'Cancún', 'e'],
    answer: 'cidade do méxico',
  },
  // --- Opções 71 a 80 ---
  {
    question: 'Que tipo de fenómeno natural são as fortes chuvas de granizo muito?',
    words: ['Que', 'tipo', 'de', 'fenómeno', 'natural', 'são', 'as', 'fortes', 'chuvas', 'de'],
    answer: 'tempestade',
  },
  {
    question: 'Qual o nome dado ao líquido que circula dentro das plantas verdes todas?',
    words: ['Qual', 'o', 'nome', 'dado', 'ao', 'líquido', 'que', 'circula', 'nas', 'plantas'],
    answer: 'seiva',
  },
  {
    question: 'Que eletrodoméstico usamos para limpar o chão sugando a poeira toda?',
    words: ['Que', 'eletrodoméstico', 'usamos', 'para', 'limpar', 'o', 'chão', 'sugando', 'a', 'poeira'],
    answer: 'aspirador de pó',
  },
  {
    question: 'Qual o número de lados que tem um hexágono regular e inteiro?',
    words: ['Qual', 'o', 'número', 'de', 'lados', 'que', 'tem', 'um', 'hexágono', 'e'],
    answer: 'seis',
  },
  {
    question: 'Que famoso explorador descobriu a América em 1492 no mar azul?',
    words: ['Que', 'famoso', 'explorador', 'descobriu', 'a', 'América', 'em', '1492', 'no', 'mar'],
    answer: 'cristóvão colombo',
  },
  {
    question: 'Qual o nome da fruta pequena e vermelha para fazer geleia doce?',
    words: ['Qual', 'o', 'nome', 'da', 'fruta', 'pequena', 'e', 'vermelha', 'para', 'geleia'],
    answer: 'framboesa',
  },
  {
    question: 'Que tipo de veículo é movido por um motor a vapor quente muito?',
    words: ['Que', 'tipo', 'de', 'veículo', 'é', 'movido', 'por', 'um', 'motor', 'a'],
    answer: 'locomotiva',
  },
  {
    question: 'Qual a parte do corpo humano responsável pela audição e equilíbrio total?',
    words: ['Qual', 'a', 'parte', 'do', 'corpo', 'responsável', 'pela', 'audição', 'e', 'equilíbrio'],
    answer: 'orelha',
  },
  {
    question: 'Que planeta é conhecido por ser o planeta mais próximo do Sol grande?',
    words: ['Que', 'planeta', 'é', 'conhecido', 'por', 'ser', 'o', 'planeta', 'próximo', 'do'],
    answer: 'mercúrio',
  },
  {
    question: 'Qual o nome do animal que tem o pescoço muito longo e bonito?',
    words: ['Qual', 'o', 'nome', 'do', 'animal', 'que', 'tem', 'o', 'pescoço', 'longo'],
    answer: 'girafa',
  },
  // --- Opções 81 a 90 ---
  {
    question: 'Que cidade italiana famosa tem muitos canais em vez de ruas e pontes?',
    words: ['Que', 'cidade', 'italiana', 'famosa', 'tem', 'muitos', 'canais', 'em', 'vez', 'de'],
    answer: 'veneza',
  },
  {
    question: 'Qual o nome dado ao açúcar natural encontrado nas frutas doces todas?',
    words: ['Qual', 'o', 'nome', 'dado', 'ao', 'açúcar', 'natural', 'encontrado', 'nas', 'frutas'],
    answer: 'frutose',
  },
  {
    question: 'Que profissional trabalha criando as roupas para desfiles de moda alta?',
    words: ['Que', 'profissional', 'trabalha', 'criando', 'as', 'roupas', 'para', 'desfiles', 'de', 'moda'],
    answer: 'estilista',
  },
  {
    question: 'Qual o nome da menor ave voadora do planeta Terra toda e leve?',
    words: ['Qual', 'o', 'nome', 'da', 'menor', 'ave', 'voadora', 'do', 'planeta', 'e'],
    answer: 'beija-flor',
  },
  {
    question: 'Que objeto usamos para ver objetos pequenos através da lente potente?',
    words: ['Que', 'objeto', 'usamos', 'para', 'ver', 'objetos', 'pequenos', 'através', 'da', 'lente'],
    answer: 'microscópio',
  },
  {
    question: 'Qual o nome do processo de transformação de luz em energia solar?',
    words: ['Qual', 'o', 'nome', 'do', 'processo', 'de', 'transformação', 'de', 'luz', 'e'],
    answer: 'fotossíntese',
  },
  {
    question: 'Que animal de estimação é conhecido por miar e caçar ratos sempre?',
    words: ['Que', 'animal', 'de', 'estimação', 'é', 'conhecido', 'por', 'miar', 'e', 'caçar'],
    answer: 'gato',
  },
  {
    question: 'Qual a capital do país conhecido por ser chamado de Holanda hoje?',
    words: ['Qual', 'a', 'capital', 'do', 'país', 'conhecido', 'por', 'ser', 'a', 'Holanda'],
    answer: 'amsterdão',
  },
  {
    question: 'Que instrumento de sopro tem muitas teclas brancas e pretas em linha?',
    words: ['Que', 'instrumento', 'de', 'sopro', 'tem', 'muitas', 'teclas', 'brancas', 'e', 'pretas'],
    answer: 'acordeão',
  },
  {
    question: 'Qual o nome do mineral mais duro de toda a natureza toda?',
    words: ['Qual', 'o', 'nome', 'do', 'mineral', 'mais', 'duro', 'de', 'toda', 'a'],
    answer: 'diamante',
  },
  // --- Opções 91 a 100 ---
  {
    question: 'Que objeto usamos para nos proteger da chuva forte na rua toda?',
    words: ['Que', 'objeto', 'usamos', 'para', 'nos', 'proteger', 'da', 'chuva', 'forte', 'na'],
    answer: 'guarda-chuva',
  },
  {
    question: 'Qual o nome da ciência que estuda os diferentes animais do mundo todo?',
    words: ['Qual', 'o', 'nome', 'da', 'ciência', 'que', 'estuda', 'os', 'diferentes', 'animais'],
    answer: 'zoologia',
  },
  {
    question: 'Que é o nome dado à força que move os planetas no espaço todo?',
    words: ['Que', 'é', 'o', 'nome', 'dado', 'à', 'força', 'que', 'move', 'os'],
    answer: 'gravidade',
  },
  {
    question: 'Qual o nome da fruta com casca espinhosa e interior doce e forte?',
    words: ['Qual', 'o', 'nome', 'da', 'fruta', 'com', 'casca', 'espinhosa', 'e', 'doce'],
    answer: 'durian',
  },
  {
    question: 'Que famoso rio atravessa o Egito e desagua no Mar Mediterrâneo inteiro?',
    words: ['Que', 'famoso', 'rio', 'atravessa', 'o', 'Egito', 'e', 'desagua', 'no', 'mar'],
    answer: 'nilo',
  },
  {
    question: 'Qual a cor obtida quando misturamos o branco e o preto puro juntos?',
    words: ['Qual', 'a', 'cor', 'obtida', 'quando', 'misturamos', 'o', 'branco', 'e', 'preto'],
    answer: 'cinzento',
  },
  {
    question: 'Que tipo de profissional trabalha criando arte em forma de escultura linda?',
    words: ['Que', 'tipo', 'de', 'profissional', 'trabalha', 'criando', 'arte', 'em', 'forma', 'de'],
    answer: 'escultor',
  },
  {
    question: 'Qual o nome do maior osso da bacia humana de uma pessoa grande?',
    words: ['Qual', 'o', 'nome', 'do', 'maior', 'osso', 'da', 'bacia', 'humana', 'e'],
    answer: 'ílio',
  },
  {
    question: 'Que parte da planta armazena comida para o inverno frio e guarda?',
    words: ['Que', 'parte', 'da', 'planta', 'armazena', 'comida', 'para', 'o', 'inverno', 'e'],
    answer: 'tubérculo',
  },
  {
    question: 'Qual o nome do famoso rato que é amigo do Pato Donald e fala?',
    words: ['Qual', 'o', 'nome', 'do', 'famoso', 'rato', 'que', 'é', 'amigo', 'do'],
    answer: 'mickey mouse',
  },
];