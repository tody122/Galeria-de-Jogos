type Socket = any;

interface GameConfig {
  container: HTMLElement;
  socket: Socket | null;
  roomId?: string;
  playerName?: string;
}

interface Player {
  id: string;
  name: string;
  team: 'team1' | 'team2' | 'spectator' | null;
  isAdmin?: boolean;
}

interface Question {
  question: string;
  words: string[]; // 10 palavras
  answer: string;
}

interface RoundState {
  currentTeam: 'team1' | 'team2' | null;
  currentPlayerId: string | null;
  question: Question | null;
  visibleWords: boolean[]; // Array de 10 booleanos indicando quais palavras estão visíveis
  guess: string;
  points: number; // Pontos baseados em quantas palavras foram ocultadas
  roundStarted: boolean;
  roundEnded: boolean;
}

interface GameState {
  players: Player[];
  team1: Player[];
  team2: Player[];
  spectators: Player[];
  isGameActive: boolean;
  team1Score: number;
  team2Score: number;
  roundState: RoundState;
  currentRound: number;
}

import { questions } from './questions';

export default class ContextoGame {
  private container: HTMLElement;
  private socket: Socket | null;
  private roomId?: string;
  private playerName: string;
  private gameState: GameState;
  private gameElement: HTMLElement | null = null;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.playerName = config.playerName || 'Jogador';
    
    this.gameState = {
      players: [],
      team1: [],
      team2: [],
      spectators: [],
      isGameActive: false,
      team1Score: 0,
      team2Score: 0,
      roundState: {
        currentTeam: null,
        currentPlayerId: null,
        question: null,
        visibleWords: [],
        guess: '',
        points: 0,
        roundStarted: false,
        roundEnded: false,
      },
      currentRound: 0,
    };

    this.init();
  }

  private init() {
    // Criar elemento do jogo
    this.gameElement = document.createElement('div');
    this.gameElement.className = 'contexto-game';
    this.gameElement.innerHTML = this.getGameHTML();
    this.container.appendChild(this.gameElement);

    // Configurar eventos
    this.setupEventListeners();

    // Configurar Socket.io se multiplayer
    if (this.socket && this.roomId) {
      this.setupSocketListeners();
      // Adicionar este jogador à lista
      this.addPlayer(this.socket.id || '1', this.playerName);
    } else {
      // Modo single player
      this.addPlayer('1', this.playerName);
    }

    this.updateDisplay();
  }

  private getGameHTML(): string {
    console.log('getGameHTML - isGameActive:', this.gameState.isGameActive);
    if (!this.gameState.isGameActive) {
      console.log('Retornando lobby HTML');
      return this.getLobbyHTML();
    }
    console.log('Retornando gameplay HTML');
    return this.getGameplayHTML();
  }

  private getLobbyHTML(): string {
    return `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Contexto</h2>
          <p class="game-subtitle">Escolha seu time e comece a jogar!</p>
        </div>

        <div class="contexto-teams-section">
          <div class="team-panel team1-panel">
            <h3>Azul 🔵</h3>
            <div class="team-players" id="team1-players">
              ${this.getTeamPlayersHTML('team1')}
            </div>
            <button class="join-team-btn" id="join-team1-btn" data-team="team1">
              Entrar no Azul
            </button>
          </div>

          <div class="team-panel team2-panel">
            <h3>Vermelho 🔴</h3>
            <div class="team-players" id="team2-players">
              ${this.getTeamPlayersHTML('team2')}
            </div>
            <button class="join-team-btn" id="join-team2-btn" data-team="team2">
              Entrar no Vermelho
            </button>
          </div>
        </div>

        <div class="players-waiting" id="players-waiting">
          <h3>Jogadores sem time</h3>
          <div class="waiting-players-list" id="waiting-players-list">
            ${this.getWaitingPlayersHTML()}
          </div>
        </div>

        <div class="spectators-section" id="spectators-section">
          <h3>👁️ Telespectadores</h3>
          <div class="spectators-list" id="spectators-list">
            ${this.getSpectatorsHTML()}
          </div>
          <button class="join-spectator-btn" id="join-spectator-btn">
            Tornar-se Telespectador
          </button>
        </div>

        ${this.getGameControlsHTML()}
      </div>
    `;
  }

  private getGameControlsHTML(): string {
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isAdmin = currentPlayer?.isAdmin || false;
    
    if (!isAdmin) {
      return `
        <div class="game-controls" id="game-controls">
          <p class="start-game-hint">Aguardando o administrador iniciar o jogo...</p>
        </div>
      `;
    }

    return `
      <div class="game-controls" id="game-controls">
        <button class="start-game-btn" id="start-game-btn" disabled>
          Iniciar Jogo
        </button>
        <p class="start-game-hint">Precisa de pelo menos 2 jogadores em cada time para começar</p>
      </div>
    `;
  }

  private getGameplayHTML(): string {
    const _currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isCurrentPlayer = this.gameState.roundState.currentPlayerId === _currentPlayer?.id;
    const isInCurrentTeam = _currentPlayer?.team === this.gameState.roundState.currentTeam;
    const isSpectator = _currentPlayer?.team === 'spectator';

    console.log('getGameplayHTML - isCurrentPlayer:', isCurrentPlayer);
    console.log('getGameplayHTML - isInCurrentTeam:', isInCurrentTeam);
    console.log('getGameplayHTML - roundEnded:', this.gameState.roundState.roundEnded);
    console.log('getGameplayHTML - roundStarted:', this.gameState.roundState.roundStarted);
    console.log('getGameplayHTML - currentPlayerId:', this.gameState.roundState.currentPlayerId);
    console.log('getGameplayHTML - _currentPlayer?.id:', _currentPlayer?.id);

    if (this.gameState.roundState.roundEnded) {
      console.log('Retornando roundEndHTML');
      return this.getRoundEndHTML();
    }

    // Se é o jogador atual e o round ainda não começou (ele precisa selecionar palavras)
    if (isCurrentPlayer && !this.gameState.roundState.roundStarted) {
      console.log('Retornando questionSelectorHTML');
      return this.getQuestionSelectorHTML();
    }

    // Se é do time atual mas não é o jogador atual e o round ainda não começou (mostrar aviso)
    if (isInCurrentTeam && !isCurrentPlayer && !this.gameState.roundState.roundStarted) {
      console.log('Retornando waitingForWordsHTML');
      return this.getWaitingForWordsHTML();
    }

    // Se é do time atual mas não é o jogador atual e o round já começou (ele precisa adivinhar)
    if (isInCurrentTeam && !isCurrentPlayer && this.gameState.roundState.roundStarted) {
      console.log('Retornando guesserHTML');
      return this.getGuesserHTML();
    }

    // Se é do outro time ou telespectador e o round já começou (pode ver palavras mas não responder)
    if (this.gameState.roundState.roundStarted && (!isInCurrentTeam || isSpectator)) {
      console.log('Retornando spectatorWordsHTML');
      return this.getSpectatorWordsHTML();
    }

    if (isSpectator || (!isInCurrentTeam && !isCurrentPlayer)) {
      console.log('Retornando waitingHTML');
      return this.getWaitingHTML();
    }

    console.log('Retornando lobbyHTML (fallback)');
    return this.getLobbyHTML();
  }

  private getScoreboardHTML(): string {
    return `
      <div class="scoreboard-panel">
        <div class="scoreboard-teams">
          <div class="scoreboard-team team1-scoreboard">
            <h3>Azul 🔵</h3>
            <div class="score-value">${this.gameState.team1Score}</div>
            <div class="team-players-list">
              ${this.gameState.team1.map(player => `
                <span class="scoreboard-player ${player.name === this.playerName ? 'you' : ''}">
                  ${player.name}${player.name === this.playerName ? ' (você)' : ''}
                </span>
              `).join('')}
            </div>
          </div>
          <div class="scoreboard-team team2-scoreboard">
            <h3>Vermelho 🔴</h3>
            <div class="score-value">${this.gameState.team2Score}</div>
            <div class="team-players-list">
              ${this.gameState.team2.map(player => `
                <span class="scoreboard-player ${player.name === this.playerName ? 'you' : ''}">
                  ${player.name}${player.name === this.playerName ? ' (você)' : ''}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getQuestionSelectorHTML(): string {
    const { question, visibleWords } = this.gameState.roundState;
    if (!question) return '';

    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Sua Vez!</h2>
          <p class="game-subtitle">Oculte as palavras que desejar</p>
        </div>

        <div class="question-selector">
          <div class="question-info">
            <p class="answer-hint">Resposta: <strong>${question.answer}</strong></p>
            <p class="words-hint">Clique nas palavras para ocultá-las. Quanto mais ocultar, mais pontos seu time ganha!</p>
          </div>

          <div class="words-grid" id="words-grid">
            ${question.words.map((word, index) => `
              <button 
                class="word-btn ${visibleWords[index] ? 'visible' : 'hidden'}" 
                data-index="${index}"
                id="word-${index}"
              >
                ${word}
              </button>
            `).join('')}
          </div>

          <div class="selector-actions">
            <p class="hidden-count">Palavras ocultadas: <span id="hidden-count">${visibleWords.filter(v => !v).length}</span> / 10</p>
            <p class="points-preview">Pontos possíveis: <span id="points-preview">${this.calculatePoints(visibleWords)}</span></p>
            <button class="submit-words-btn" id="submit-words-btn">
              Enviar Palavras
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private getWaitingForWordsHTML(): string {
    const { currentPlayerId, currentTeam } = this.gameState.roundState;
    const currentPlayer = this.gameState.players.find((p) => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || 'Jogador';
    const teamName = currentTeam === 'team1' ? 'Azul' : 'Vermelho';

    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Contexto</h2>
          <p class="game-subtitle">Aguardando seleção de palavras...</p>
        </div>
        
        <div class="waiting-message">
          <div class="player-selecting-warning">
            <p>⏳ <strong>${playerName}</strong> do ${teamName} está escolhendo as palavras...</p>
          </div>
          <p>Aguarde enquanto as palavras são selecionadas!</p>
        </div>
      </div>
    `;
  }

  private getSpectatorWordsHTML(): string {
    const { question, visibleWords, currentPlayerId, currentTeam } = this.gameState.roundState;
    if (!question) return '';

    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);
    const currentPlayer = this.gameState.players.find((p) => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || 'Jogador';
    const teamName = currentTeam === 'team1' ? 'Azul' : 'Vermelho';

    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Contexto</h2>
          <p class="game-subtitle">${teamName} está tentando adivinhar!</p>
        </div>

        <div class="spectator-words-section">
          <div class="spectator-info">
            <p><strong>${playerName}</strong> do ${teamName} escolheu estas palavras:</p>
          </div>
          
          <div class="formatted-question">
            <h3>Frase:</h3>
            <div class="question-display">
              <p class="formatted-question-text">${formattedQuestion}</p>
            </div>
          </div>

          <div class="spectator-note">
            <p>👁️ Você pode ver as palavras, mas apenas o ${teamName} pode responder!</p>
          </div>
        </div>
      </div>
    `;
  }

  private getGuesserHTML(): string {
    const { question, visibleWords } = this.gameState.roundState;
    if (!question) return '';

    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);

    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Adivinhe a Palavra!</h2>
          <p class="game-subtitle">Use as palavras visíveis para adivinhar</p>
        </div>

        <div class="guesser-section">
          <div class="formatted-question">
            <h3>Frase:</h3>
            <div class="question-display">
              <p class="formatted-question-text">${formattedQuestion}</p>
            </div>
          </div>

          <div class="guess-input-section">
            <input 
              type="text" 
              id="guess-input" 
              class="guess-input" 
              placeholder="Digite sua resposta..."
              autocomplete="off"
            />
            <button class="submit-guess-btn" id="submit-guess-btn">
              Enviar Resposta
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private getWaitingHTML(): string {
    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Contexto</h2>
          <p class="game-subtitle">Aguardando sua vez...</p>
        </div>
        <div class="waiting-message">
          <p>O jogo está em andamento. Aguarde sua vez!</p>
        </div>
      </div>
    `;
  }

  private getRoundEndHTML(): string {
    const { question, guess, points } = this.gameState.roundState;
    const normalizedGuess = this.normalizeWord(guess.trim());
    const normalizedAnswer = this.normalizeWord(question?.answer.trim() || '');
    const isCorrect = normalizedGuess === normalizedAnswer;
    const currentTeam = this.gameState.roundState.currentTeam;

    return `
      <div class="contexto-container">
        ${this.getScoreboardHTML()}
        <div class="contexto-header">
          <h2>🎯 Resultado da Rodada</h2>
        </div>

        <div class="round-result">
          <div class="result-info">
            <p class="answer-reveal">Resposta correta: <strong>${question?.answer}</strong></p>
            <p class="guess-result ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? '✅ Acertou!' : '❌ Errou!'}
            </p>
            ${isCorrect ? `<p class="points-earned">+${points} pontos para o ${currentTeam === 'team1' ? 'Azul' : 'Vermelho'}!</p>` : ''}
          </div>

          <button class="next-round-btn" id="next-round-btn">
            Próxima Rodada
          </button>
        </div>
      </div>
    `;
  }

  private calculatePoints(visibleWords: boolean[]): number {
    const hiddenCount = visibleWords.filter(v => !v).length;
    // Mais palavras ocultadas = mais pontos
    // 0 ocultadas = 1 ponto, 10 ocultadas = 10 pontos
    return hiddenCount;
  }

  private normalizeWord(word: string): string {
    // Remover acentos e caracteres especiais, converter para minúscula
    return word
      .normalize('NFD') // Decompõe caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
      .replace(/[^\w]/g, '') // Remove caracteres não alfanuméricos
      .toLowerCase();
  }

  private formatQuestionWithBlanks(question: Question, visibleWords: boolean[]): string {
    // Criar um array de índices para rastrear qual palavra do array words já foi usada
    const usedIndices = new Set<number>();
    
    // Dividir a frase preservando espaços e pontuação
    // Usar regex que captura palavras (incluindo acentos), espaços e pontuação
    const parts = question.question.split(/(\s+|[\p{P}\p{S}])/u);
    
    // Formatar cada parte
    const formattedParts = parts.map(part => {
      // Se for apenas espaços, manter como está
      if (/^\s+$/.test(part)) {
        return part;
      }
      
      // Se for apenas pontuação ou símbolos, manter como está
      if (/^[\p{P}\p{S}]+$/u.test(part)) {
        return part;
      }
      
      // É uma palavra - extrair a palavra sem pontuação para comparação
      const wordOnly = part.replace(/[\p{P}\p{S}]/gu, '');
      const normalizedWord = this.normalizeWord(wordOnly);
      
      if (!normalizedWord) {
        // Não é uma palavra válida, manter como está
        return part;
      }
      
      // Procurar a palavra no array words (na ordem)
      // Usar o primeiro índice disponível que corresponda
      let foundIndex = -1;
      for (let i = 0; i < question.words.length; i++) {
        if (!usedIndices.has(i)) {
          const wordNormalized = this.normalizeWord(question.words[i]);
          if (wordNormalized === normalizedWord) {
            foundIndex = i;
            usedIndices.add(i);
            break;
          }
        }
      }
      
      if (foundIndex !== -1) {
        // Palavra encontrada no array - verificar se está visível
        const isVisible = visibleWords[foundIndex];
        
        if (isVisible) {
          // Manter a palavra original com capitalização e pontuação
          return part;
        } else {
          // Substituir a palavra por underscore, mantendo pontuação se houver
          // Extrair apenas a pontuação (tudo que não é letra)
          const punctuation = part.replace(/[\p{L}\p{N}]/gu, '');
          return '_' + punctuation;
        }
      } else {
        // Palavra não encontrada no array (pode ser pontuação ou palavra extra)
        // Se tem caracteres alfanuméricos (incluindo acentos), substituir por underscore
        if (/[\p{L}\p{N}]/u.test(part)) {
          const punctuation = part.replace(/[\p{L}\p{N}]/gu, '');
          return '_' + punctuation;
        }
        // Caso contrário, manter como está (pontuação pura)
        return part;
      }
    });
    
    return formattedParts.join('');
  }

  private getTeamPlayersHTML(team: 'team1' | 'team2'): string {
    const teamPlayers = this.gameState[team];
    if (teamPlayers.length === 0) {
      return '<p class="no-players">Nenhum jogador</p>';
    }
    return teamPlayers
      .map(
        (player) => `
        <div class="team-player ${player.name === this.playerName ? 'you' : ''}">
          <span class="player-name">${player.name}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
        </div>
      `
      )
      .join('');
  }

  private getWaitingPlayersHTML(): string {
    const waitingPlayers = this.gameState.players.filter((p) => !p.team || p.team === null);
    if (waitingPlayers.length === 0) {
      return '<p class="no-players">Todos os jogadores estão em times ou são telespectadores</p>';
    }
    return waitingPlayers
      .map(
        (player) => `
        <div class="waiting-player ${player.name === this.playerName ? 'you' : ''}">
          <span class="player-name">${player.name}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
        </div>
      `
      )
      .join('');
  }

  private getSpectatorsHTML(): string {
    const spectators = this.gameState.spectators;
    if (spectators.length === 0) {
      return '<p class="no-players">Nenhum telespectador</p>';
    }
    return spectators
      .map(
        (player) => `
        <div class="spectator-player ${player.name === this.playerName ? 'you' : ''}">
          <span class="player-name">${player.name}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
        </div>
      `
      )
      .join('');
  }

  private setupEventListeners() {
    if (!this.gameElement) return;

    // Botões de time
    const joinTeam1Btn = this.gameElement.querySelector('#join-team1-btn');
    const joinTeam2Btn = this.gameElement.querySelector('#join-team2-btn');
    const joinSpectatorBtn = this.gameElement.querySelector('#join-spectator-btn');
    const startGameBtn = this.gameElement.querySelector('#start-game-btn');

    joinTeam1Btn?.addEventListener('click', () => {
      this.joinTeam('team1');
    });

    joinTeam2Btn?.addEventListener('click', () => {
      this.joinTeam('team2');
    });

    joinSpectatorBtn?.addEventListener('click', () => {
      this.joinSpectator();
    });

    startGameBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Botão iniciar jogo clicado');
      this.startGame();
    });

    // Event listeners dinâmicos para o jogo
    this.setupGameplayListeners();
  }

  private setupGameplayListeners() {
    if (!this.gameElement) return;

    // Listener para palavras (question selector)
    const wordsGrid = this.gameElement.querySelector('#words-grid');
    if (wordsGrid) {
      wordsGrid.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('word-btn')) {
          const index = parseInt(target.getAttribute('data-index') || '0');
          this.toggleWord(index);
        }
      });
    }

    // Listener para enviar palavras
    const submitWordsBtn = this.gameElement.querySelector('#submit-words-btn');
    submitWordsBtn?.addEventListener('click', () => {
      this.submitWords();
    });

    // Listener para enviar resposta
    const submitGuessBtn = this.gameElement.querySelector('#submit-guess-btn');
    const guessInput = this.gameElement.querySelector('#guess-input') as HTMLInputElement;
    
    submitGuessBtn?.addEventListener('click', () => {
      this.submitGuess();
    });

    guessInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitGuess();
      }
    });

    // Listener para próxima rodada
    const nextRoundBtn = this.gameElement.querySelector('#next-round-btn');
    nextRoundBtn?.addEventListener('click', () => {
      this.nextRound();
    });
  }

  private toggleWord(index: number) {
    if (!this.gameState.roundState.question) return;
    
    const visibleWords = [...this.gameState.roundState.visibleWords];
    visibleWords[index] = !visibleWords[index];
    
    this.gameState.roundState.visibleWords = visibleWords;
    this.updateQuestionSelector();
  }

  private updateQuestionSelector() {
    if (!this.gameElement || !this.gameState.roundState.question) return;

    const { question, visibleWords } = this.gameState.roundState;

    // Atualizar botões de palavras
    question.words.forEach((word, index) => {
      const wordBtn = this.gameElement?.querySelector(`#word-${index}`) as HTMLButtonElement;
      if (wordBtn) {
        wordBtn.classList.toggle('visible', visibleWords[index]);
        wordBtn.classList.toggle('hidden', !visibleWords[index]);
      }
    });

    // Atualizar contadores
    const hiddenCount = this.gameElement.querySelector('#hidden-count');
    const pointsPreview = this.gameElement.querySelector('#points-preview');
    
    if (hiddenCount) {
      hiddenCount.textContent = visibleWords.filter(v => !v).length.toString();
    }
    if (pointsPreview) {
      pointsPreview.textContent = this.calculatePoints(visibleWords).toString();
    }
  }

  private submitWords() {
    if (!this.gameState.roundState.question) return;

    const visibleWords = this.gameState.roundState.visibleWords;
    const points = this.calculatePoints(visibleWords);

    this.gameState.roundState.points = points;

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'words-submitted',
        payload: {
          visibleWords: visibleWords,
          points: points,
        },
      });
    }

    // Atualizar display para outros jogadores do time
    this.gameState.roundState.roundStarted = true;
    this.updateDisplay();
  }

  private submitGuess() {
    const guessInput = this.gameElement?.querySelector('#guess-input') as HTMLInputElement;
    if (!guessInput) return;

    const guess = guessInput.value.trim();
    if (!guess) return;

    this.gameState.roundState.guess = guess;

    const { question } = this.gameState.roundState;
    const normalizedGuess = this.normalizeWord(guess.trim());
    const normalizedAnswer = this.normalizeWord(question?.answer.trim() || '');
    const isCorrect = normalizedGuess === normalizedAnswer;
    const currentTeam = this.gameState.roundState.currentTeam;

    if (isCorrect && currentTeam) {
      if (currentTeam === 'team1') {
        this.gameState.team1Score += this.gameState.roundState.points;
      } else {
        this.gameState.team2Score += this.gameState.roundState.points;
      }
    }

    // Enviar resultado
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'guess-submitted',
        payload: {
          guess: guess,
          isCorrect: isCorrect,
          points: isCorrect ? this.gameState.roundState.points : 0,
          team: currentTeam,
        },
      });
    }

    this.gameState.roundState.roundEnded = true;
    this.updateDisplay();
  }

  private nextRound() {
    this.gameState.currentRound++;
    
    // Alternar time
    const nextTeam = this.gameState.roundState.currentTeam === 'team1' ? 'team2' : 'team1';
    const nextTeamPlayers = this.gameState[nextTeam];
    
    if (nextTeamPlayers.length === 0) {
      // Se não há jogadores no time, voltar ao lobby
      this.gameState.isGameActive = false;
      this.updateDisplay();
      return;
    }

    // Próximo jogador do time (rotação)
    const currentPlayerIndex = nextTeamPlayers.findIndex(
      (p) => p.id === this.gameState.roundState.currentPlayerId
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % nextTeamPlayers.length;
    const nextPlayer = nextTeamPlayers[nextPlayerIndex];

    // Nova pergunta aleatória
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    this.gameState.roundState = {
      currentTeam: nextTeam,
      currentPlayerId: nextPlayer.id,
      question: randomQuestion,
      visibleWords: Array.from({ length: 10 }, () => true), // Todas visíveis inicialmente
      guess: '',
      points: 0,
      roundStarted: false,
      roundEnded: false,
    };

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'round-started',
        payload: {
          currentTeam: nextTeam,
          currentPlayerId: nextPlayer.id,
          question: randomQuestion,
        },
      });
    }

    this.updateDisplay();
  }

  private startGame() {
    console.log('startGame chamado');
    console.log('Team1 length:', this.gameState.team1.length);
    console.log('Team2 length:', this.gameState.team2.length);
    
    // Verificar se o jogador atual é admin
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isAdmin = currentPlayer?.isAdmin || false;
    
    if (!isAdmin) {
      alert('Apenas o administrador pode iniciar o jogo!');
      return;
    }
    
    // Verificar se há pelo menos 2 jogadores em cada time
    if (this.gameState.team1.length < 2 || this.gameState.team2.length < 2) {
      alert('Precisa de pelo menos 2 jogadores em cada time para começar!');
      return;
    }

    console.log('Iniciando jogo...');
    this.gameState.isGameActive = true;
    this.gameState.currentRound = 1;

    // Começar com Azul, primeiro jogador
    const firstPlayer = this.gameState.team1[0];
    if (!firstPlayer) {
      console.error('Nenhum jogador no Azul!');
      return;
    }
    
    console.log('Primeiro jogador:', firstPlayer);
    console.log('ID do primeiro jogador:', firstPlayer.id);
    console.log('Socket ID atual:', this.socket?.id);
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    console.log('Pergunta selecionada:', randomQuestion);

    this.gameState.roundState = {
      currentTeam: 'team1',
      currentPlayerId: firstPlayer.id,
      question: randomQuestion,
      visibleWords: Array.from({ length: 10 }, () => true),
      guess: '',
      points: 0,
      roundStarted: false,
      roundEnded: false,
    };
    
    console.log('Round state criado:', this.gameState.roundState);

    console.log('Estado do jogo atualizado:', this.gameState.roundState);

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'game-started',
        payload: {
          currentTeam: 'team1',
          currentPlayerId: firstPlayer.id,
          question: randomQuestion,
        },
      });
    }

    console.log('Chamando updateDisplay...');
    this.updateDisplay();
    console.log('Display atualizado');
  }

  private joinTeam(team: 'team1' | 'team2') {
    const player = this.gameState.players.find((p) => p.name === this.playerName);
    if (!player) return;

    if (this.gameState.isGameActive) {
      alert('Não é possível mudar de time durante o jogo!');
      return;
    }

    // Remover de qualquer time/status anterior
    if (player.team === 'spectator') {
      const index = this.gameState.spectators.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        this.gameState.spectators.splice(index, 1);
      }
    } else if (player.team) {
      const previousTeam = this.gameState[player.team];
      const index = previousTeam.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        previousTeam.splice(index, 1);
      }
    }

    // Adicionar ao novo time
    player.team = team;
    const newTeam = this.gameState[team];
    if (!newTeam.find((p) => p.id === player.id)) {
      newTeam.push(player);
    }

    this.updateDisplay();
    this.updateStartButton();

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'player-joined-team',
        payload: {
          playerId: player.id,
          playerName: player.name,
          team: team,
        },
      });
    }
  }

  private joinSpectator() {
    const player = this.gameState.players.find((p) => p.name === this.playerName);
    if (!player) return;

    if (this.gameState.isGameActive) {
      alert('Não é possível mudar de time durante o jogo!');
      return;
    }

    // Remover de qualquer time anterior
    if (player.team && player.team !== 'spectator') {
      const previousTeam = this.gameState[player.team];
      const index = previousTeam.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        previousTeam.splice(index, 1);
      }
    }

    // Adicionar como telespectador
    player.team = 'spectator';
    if (!this.gameState.spectators.find((p) => p.id === player.id)) {
      this.gameState.spectators.push(player);
    }

    this.updateDisplay();
    this.updateStartButton();

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'player-joined-spectator',
        payload: {
          playerId: player.id,
          playerName: player.name,
        },
      });
    }
  }

  private updateStartButton() {
    if (!this.gameElement) return;
    const startGameBtn = this.gameElement.querySelector('#start-game-btn') as HTMLButtonElement;
    if (startGameBtn) {
      const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
      const isAdmin = currentPlayer?.isAdmin || false;
      const canStart = isAdmin && this.gameState.team1.length >= 2 && this.gameState.team2.length >= 2;
      startGameBtn.disabled = !canStart;
    }
  }

  private addPlayer(id: string, name: string) {
    // Verificar se já existe
    if (this.gameState.players.find((p) => p.id === id || p.name === name)) {
      return;
    }

    // Verificar se já existe um admin
    const hasAdmin = this.gameState.players.some((p) => p.isAdmin);
    
    const newPlayer: Player = {
      id,
      name,
      team: null,
      isAdmin: !hasAdmin, // Primeiro jogador vira admin
    };

    this.gameState.players.push(newPlayer);
  }

  private updateDisplay() {
    if (!this.gameElement) return;

    // Recriar HTML completo
    this.gameElement.innerHTML = this.getGameHTML();
    
    // Reconfigurar listeners
    this.setupEventListeners();

    // Atualizar botão de iniciar
    if (!this.gameState.isGameActive) {
      this.updateStartButton();
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Listener para quando jogadores entram/saem da sala
    this.socket.on('player-joined', (data: { playerId: string; playerName: string }) => {
      this.addPlayer(data.playerId, data.playerName);
      this.updateDisplay();
    });

    this.socket.on('player-left', (data: { playerId: string }) => {
      // Verificar se o jogador que saiu era admin
      const leavingPlayer = this.gameState.players.find((p) => p.id === data.playerId);
      const wasAdmin = leavingPlayer?.isAdmin || false;
      
      // Remover jogador
      this.gameState.players = this.gameState.players.filter((p) => p.id !== data.playerId);
      this.gameState.team1 = this.gameState.team1.filter((p) => p.id !== data.playerId);
      this.gameState.team2 = this.gameState.team2.filter((p) => p.id !== data.playerId);
      this.gameState.spectators = this.gameState.spectators.filter((p) => p.id !== data.playerId);
      
      // Se o admin saiu, transferir admin para o primeiro jogador restante
      if (wasAdmin && this.gameState.players.length > 0) {
        this.gameState.players[0].isAdmin = true;
      }
      
      this.updateDisplay();
    });

    this.socket.on('room-players', (data: { players: Array<{ id: string; name: string }> }) => {
      if (data.players && Array.isArray(data.players)) {
        // Limpar jogadores existentes (exceto o atual) para evitar duplicatas
        const currentPlayerId = this.socket?.id || '1';
        this.gameState.players = this.gameState.players.filter((p) => p.id === currentPlayerId);
        
        // Adicionar jogadores da sala
        data.players.forEach((roomPlayer) => {
          this.addPlayer(roomPlayer.id, roomPlayer.name);
        });
        
        // Garantir que este jogador está na lista
        this.addPlayer(currentPlayerId, this.playerName);
        
        // Garantir que há um admin (primeiro jogador)
        const hasAdmin = this.gameState.players.some((p) => p.isAdmin);
        if (!hasAdmin && this.gameState.players.length > 0) {
          this.gameState.players[0].isAdmin = true;
        }
        
        this.updateDisplay();
      }
    });

    this.socket.on('game-message', (data: { event: string; payload: any; from: string; fromName?: string }) => {
      if (data.from === this.socket?.id) return;

      const playerName = data.fromName || 'Jogador';

      switch (data.event) {
        case 'player-joined-team':
          const { playerId, team } = data.payload;
          const player = this.gameState.players.find((p) => p.id === playerId || p.name === playerName);
          if (player && (team === 'team1' || team === 'team2')) {
            // Remover de qualquer time/status anterior
            if (player.team === 'spectator') {
              const index = this.gameState.spectators.findIndex((p) => p.id === player.id);
              if (index !== -1) {
                this.gameState.spectators.splice(index, 1);
              }
            } else if (player.team === 'team1' || player.team === 'team2') {
              const previousTeam = this.gameState[player.team];
              const index = previousTeam.findIndex((p: Player) => p.id === player.id);
              if (index !== -1) {
                previousTeam.splice(index, 1);
              }
            }
            // Adicionar ao novo time
            player.team = team;
            if (team === 'team1') {
              if (!this.gameState.team1.find((p: Player) => p.id === player.id)) {
                this.gameState.team1.push(player);
              }
            } else if (team === 'team2') {
              if (!this.gameState.team2.find((p: Player) => p.id === player.id)) {
                this.gameState.team2.push(player);
              }
            }
            this.updateDisplay();
            this.updateStartButton();
          }
          break;
        case 'player-joined-spectator':
          const { playerId: spectatorId } = data.payload;
          const spectatorPlayer = this.gameState.players.find((p) => p.id === spectatorId || p.name === playerName);
          if (spectatorPlayer) {
            // Remover de qualquer time anterior
            if (spectatorPlayer.team && spectatorPlayer.team !== 'spectator') {
              const previousTeam = this.gameState[spectatorPlayer.team];
              const index = previousTeam.findIndex((p) => p.id === spectatorPlayer.id);
              if (index !== -1) {
                previousTeam.splice(index, 1);
              }
            }
            // Adicionar como telespectador
            spectatorPlayer.team = 'spectator';
            if (!this.gameState.spectators.find((p) => p.id === spectatorPlayer.id)) {
              this.gameState.spectators.push(spectatorPlayer);
            }
            this.updateDisplay();
            this.updateStartButton();
          }
          break;
        case 'game-started':
        case 'round-started':
          const { currentTeam, currentPlayerId, question } = data.payload;
          this.gameState.isGameActive = true;
          this.gameState.roundState = {
            currentTeam,
            currentPlayerId,
            question,
            visibleWords: Array.from({ length: 10 }, () => true),
            guess: '',
            points: 0,
            roundStarted: false,
            roundEnded: false,
          };
          this.updateDisplay();
          break;
        case 'words-submitted':
          const { visibleWords, points } = data.payload;
          this.gameState.roundState.visibleWords = visibleWords;
          this.gameState.roundState.points = points;
          this.gameState.roundState.roundStarted = true;
          this.updateDisplay();
          break;
        case 'guess-submitted':
          const { guess, isCorrect, points: earnedPoints, team: guessTeam } = data.payload;
          this.gameState.roundState.guess = guess;
          this.gameState.roundState.roundEnded = true;
          
          if (isCorrect && guessTeam) {
            if (guessTeam === 'team1') {
              this.gameState.team1Score += earnedPoints;
            } else {
              this.gameState.team2Score += earnedPoints;
            }
          }
          this.updateDisplay();
          break;
      }
    });
  }

  public setRoomId(roomId: string) {
    this.roomId = roomId;
    if (this.socket) {
      this.setupSocketListeners();
    }
  }

  public setPlayerName(playerName: string) {
    this.playerName = playerName;
    // Atualizar nome na lista de jogadores
    const player = this.gameState.players.find((p) => p.id === this.socket?.id);
    if (player) {
      player.name = playerName;
      this.updateDisplay();
    }
  }

  public destroy() {
    if (this.gameElement && this.gameElement.parentNode) {
      this.gameElement.parentNode.removeChild(this.gameElement);
    }
    if (this.socket) {
      this.socket.off('game-message');
      this.socket.off('player-joined');
      this.socket.off('player-left');
      this.socket.off('room-players');
    }
  }
}
