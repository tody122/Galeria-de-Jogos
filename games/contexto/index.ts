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
  photo?: string;
  team: 'team1' | 'team2' | 'spectator' | null;
  isAdmin?: boolean;
}

interface Question {
  question: string;
  words: string[]; // 10 palavras
  answer: string;
}

interface Guess {
  playerId: string;
  playerName: string;
  guess: string;
  timestamp: number;
  isCorrect?: boolean;
  points?: number;
  order?: number; // Ordem de acerto (1 = primeiro, 2 = segundo, etc)
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
  revealedWordsCount?: number; // Para modo todos contra todos - quantas palavras foram reveladas
  nextRevealPlayerId?: string | null; // Próximo jogador que pode revelar uma palavra
  // Campos específicos para modo Caos
  chaosGuesses?: Guess[]; // Array de palpites no modo Caos
  autoRevealTimer?: number | null; // ID do timer de revelação automática
  lastRevealTime?: number; // Timestamp da última revelação automática
  revealedWordsIndices?: number[]; // Índices das palavras já reveladas automaticamente
  correctGuesses?: Guess[]; // Palpites corretos em ordem de acerto
  nextRevealIndex?: number; // Próximo índice de palavra a ser revelado
}

type GameMode = 'classic' | 'freeForAll' | 'chaos';

interface GameModeConfig {
  name: string;
  description: string;
  maxWords: number;
  pointMultiplier: number;
  hasTimer: boolean;
  timerSeconds?: number;
}

interface GameState {
  players: Player[];
  team1: Player[];
  team2: Player[];
  spectators: Player[];
  isGameActive: boolean;
  gameMode: GameMode | null;
  team1Score: number;
  team2Score: number;
  playerScores: Map<string, number>; // Pontuação individual para modo todos contra todos
  roundState: RoundState;
  currentRound: number;
  scoreLimit?: number; // Pontuação limite para modo Caos
  gameEnded?: boolean; // Indica se o jogo terminou (por pontuação limite)
  winner?: { id: string; name: string; score: number }; // Vencedor do jogo
}

import { questions } from './questions';

const GAME_MODES: Record<GameMode, GameModeConfig> = {
  classic: {
    name: 'Clássico',
    description: 'Modo tradicional com times. Um jogador oculta palavras e o time adivinha!',
    maxWords: 10,
    pointMultiplier: 1,
    hasTimer: false,
  },
  freeForAll: {
    name: 'Todos Contra Todos',
    description: 'Modo individual! Todos jogam sozinhos e revelam palavras uma por vez.',
    maxWords: 10,
    pointMultiplier: 1,
    hasTimer: false,
  },
  chaos: {
    name: 'Caos',
    description: 'Modo caótico! Todos adivinham simultaneamente no chat. Palavras são reveladas automaticamente a cada 5 segundos. Quem acertar primeiro ganha mais pontos!',
    maxWords: 10,
    pointMultiplier: 1.5,
    hasTimer: false,
  },
};


export default class ContextoGame {
  private container: HTMLElement;
  private socket: Socket | null;
  private roomId?: string;
  private playerName: string;
  private gameState: GameState;
  private gameElement: HTMLElement | null = null;
  private readonly STORAGE_KEY = 'contexto-game-state';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private chaosAutoRevealInterval: number | null = null; // Timer para revelação automática no modo Caos

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
      gameMode: null,
      team1Score: 0,
      team2Score: 0,
      playerScores: new Map(),
      roundState: {
        currentTeam: null,
        currentPlayerId: null,
        question: null,
        visibleWords: [],
        guess: '',
        points: 0,
        roundStarted: false,
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: null,
      },
      currentRound: 0,
    };

    this.init();
  }

  private init() {
    // Criar elemento do jogo
    this.gameElement = document.createElement('div');
    const themeClass = this.getThemeClass();
    this.gameElement.className = `contexto-game ${themeClass}`.trim();
    this.gameElement.innerHTML = this.getGameHTML();
    this.container.appendChild(this.gameElement);

    // Configurar eventos
    this.setupEventListeners();

    // Configurar Socket.io se multiplayer
    if (this.socket && this.roomId) {
      this.setupSocketListeners();
      // Não adicionar o jogador aqui - o servidor enviará via room-players
      // Isso garante que o admin seja determinado corretamente pelo servidor
    } else {
      // Modo single player - é admin por padrão
      this.addPlayer('1', this.playerName, true);
    }

    this.updateDisplay();
  }

  private getThemeClass(): string {
    if (!this.gameState.isGameActive) {
      return '';
    }
    const currentTeam = this.gameState.roundState.currentTeam;
    if (currentTeam === 'team1') {
      return 'team-blue-theme';
    } else if (currentTeam === 'team2') {
      return 'team-red-theme';
    }
    return '';
  }

  private getGameHTML(): string {
    console.log('getGameHTML - isGameActive:', this.gameState.isGameActive);
    console.log('getGameHTML - gameEnded:', this.gameState.gameEnded);
    
    // Se o jogo terminou (por pontuação limite), mostrar tela de fim de jogo
    if (this.gameState.gameEnded && this.gameState.gameMode === 'chaos') {
      return this.getGameEndHTML();
    }
    
    if (!this.gameState.isGameActive) {
      console.log('Retornando lobby HTML');
      return this.getLobbyHTML();
    }
    console.log('Retornando gameplay HTML');
    return this.getGameplayHTML();
  }

  private getGameModeBadgeHTML(): string {
    if (!this.gameState.gameMode) return '';
    const modeConfig = GAME_MODES[this.gameState.gameMode];
    if (!modeConfig) return '';
    
    // Ícone e classe específica por modo
    const modeIcon = this.gameState.gameMode === 'classic' ? '⚔️' : this.gameState.gameMode === 'freeForAll' ? '🎯' : '💥';
    const modeClass = this.gameState.gameMode === 'classic' ? 'mode-classic' : this.gameState.gameMode === 'freeForAll' ? 'mode-free-for-all' : 'mode-chaos';
    
    return `
      <div class="game-mode-badge ${modeClass}">
        <span class="mode-badge-icon">${modeIcon}</span>
        <span class="mode-badge-text">${modeConfig.name}</span>
      </div>
    `;
  }

  private getLobbyHTML(): string {
    return `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Contexto ${this.getGameModeBadgeHTML()}</h2>
          <p class="game-subtitle">${this.gameState.gameMode === 'freeForAll' || this.gameState.gameMode === 'chaos' ? 'Aguarde o administrador iniciar o jogo!' : 'Escolha seu time e comece a jogar!'}</p>
        </div>

        ${this.gameState.gameMode !== 'freeForAll' && this.gameState.gameMode !== 'chaos' ? `
        <div class="contexto-teams-section">
          <div class="team-panel team1-panel">
            <h3>Azul 🔵</h3>
            <div class="team-players" id="team1-players">
              ${this.getTeamPlayersHTML('team1')}
            </div>
            ${this.getJoinTeamButtonHTML('team1')}
          </div>

          <div class="team-panel team2-panel">
            <h3>Vermelho 🔴</h3>
            <div class="team-players" id="team2-players">
              ${this.getTeamPlayersHTML('team2')}
            </div>
            ${this.getJoinTeamButtonHTML('team2')}
          </div>
        </div>
        ` : ''}

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

  private getJoinTeamButtonHTML(team: 'team1' | 'team2'): string {
    const teamPlayers = this.gameState[team];
    const isFull = teamPlayers.length >= 2;
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isInThisTeam = currentPlayer?.team === team;
    const teamName = team === 'team1' ? 'Azul' : 'Vermelho';
    const teamId = team === 'team1' ? 'team1' : 'team2';
    
    if (isFull && !isInThisTeam) {
      return `
        <button class="join-team-btn" id="join-${teamId}-btn" data-team="${teamId}" disabled>
          Time Cheio (2/2)
        </button>
      `;
    }
    
    if (isInThisTeam) {
      return `
        <button class="join-team-btn" id="join-${teamId}-btn" data-team="${teamId}" disabled>
          Você está no ${teamName}
        </button>
      `;
    }
    
    return `
      <button class="join-team-btn" id="join-${teamId}-btn" data-team="${teamId}">
        Entrar no ${teamName} (${teamPlayers.length}/2)
      </button>
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

    const selectedMode = this.gameState.gameMode || 'classic';
    let canStart = false;
    let startHint = '';
    
    if (selectedMode === 'classic') {
      canStart = this.gameState.team1.length === 2 && this.gameState.team2.length === 2;
      startHint = 'Precisa de exatamente 2 jogadores em cada time para começar';
    } else if (selectedMode === 'freeForAll') {
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      canStart = availablePlayers.length >= 2;
      startHint = `Modo Todos Contra Todos: precisa de pelo menos 2 jogadores (${availablePlayers.length} disponíveis). Times não são necessários!`;
    } else if (selectedMode === 'chaos') {
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      canStart = availablePlayers.length >= 2;
      startHint = `Modo Caos: precisa de pelo menos 2 jogadores (${availablePlayers.length} disponíveis). Todos podem revelar e adivinhar simultaneamente!`;
    }

    return `
      <div class="game-controls" id="game-controls">
        <div class="game-mode-selection">
          <h3>Escolha o Modo de Jogo</h3>
          <div class="game-modes-grid" id="game-modes-grid">
            ${Object.entries(GAME_MODES).map(([modeKey, modeConfig]) => `
              <div class="game-mode-card ${selectedMode === modeKey ? 'selected' : ''}" 
                   data-mode="${modeKey}" 
                   id="mode-${modeKey}">
                <h4>${modeConfig.name}</h4>
                <p class="mode-description">${modeConfig.description}</p>
                <div class="mode-stats">
                  <span>📝 ${modeConfig.maxWords} palavras</span>
                  <span>⭐ ${modeConfig.pointMultiplier}x pontos</span>
                  ${modeConfig.hasTimer ? `<span>⏱️ ${modeConfig.timerSeconds}s</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ${selectedMode === 'classic' ? `
        <div class="admin-controls">
          <button class="randomize-teams-btn" id="randomize-teams-btn">
            🎲 Aleatorizar Times
          </button>
          <p class="randomize-hint">Distribui todos os jogadores aleatoriamente entre os times</p>
        </div>
        ` : ''}
        ${selectedMode === 'chaos' ? `
        <div class="admin-controls">
          <div class="score-limit-control">
            <label for="score-limit-slider">🎯 Pontuação Limite: <span id="score-limit-value">${this.gameState.scoreLimit || 50}</span></label>
            <div class="slider-container">
              <input 
                type="range" 
                id="score-limit-slider" 
                class="score-limit-slider" 
                min="1" 
                max="300" 
                value="${this.gameState.scoreLimit || 50}"
              />
              <div class="slider-labels">
                <span>1</span>
                <span>300</span>
              </div>
            </div>
            <p class="score-limit-hint">O jogo termina quando um jogador atingir esta pontuação</p>
          </div>
        </div>
        ` : ''}
        <button class="start-game-btn" id="start-game-btn" ${canStart ? '' : 'disabled'}>
          Iniciar Jogo
        </button>
        <p class="start-game-hint">${startHint}</p>
      </div>
    `;
  }

  private getGameplayHTML(): string {
    // Modo Caos tem lógica diferente
    if (this.gameState.gameMode === 'chaos') {
      console.log('Retornando getChaosHTML');
      return this.getChaosHTML();
    }
    
    // Modo todos contra todos tem lógica diferente
    if (this.gameState.gameMode === 'freeForAll') {
      return this.getFreeForAllHTML();
    }

    // Modo clássico (lógica original)
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

  private getFreeForAllHTML(): string {
    const { question, visibleWords, nextRevealPlayerId, revealedWordsCount } = this.gameState.roundState;
    if (!question) return '';

    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isSpectator = currentPlayer?.team === 'spectator';
    const canReveal = currentPlayer?.id === nextRevealPlayerId && !isSpectator;
    const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
    const nextPlayer = availablePlayers.find(p => p.id === nextRevealPlayerId);
    
    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);

    if (this.gameState.roundState.roundEnded) {
      return this.getFreeForAllRoundEndHTML();
    }

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>Todos Contra Todos${this.getGameModeBadgeHTML()}</h2>
          <p class="game-subtitle">Revele palavras uma por vez e adivinhe!</p>
        </div>

        <div class="free-for-all-game">
          <div class="reveal-section">
            ${canReveal ? `
              <div class="reveal-controls">
                <p class="reveal-hint">🎲 É sua vez! Escolha uma palavra para revelar:</p>
                <div class="words-grid" id="reveal-words-grid">
                  ${question.words.map((word, index) => `
                    <button 
                      class="word-btn reveal-btn ${visibleWords[index] ? 'revealed' : 'hidden'}" 
                      data-index="${index}"
                      id="reveal-word-${index}"
                      ${visibleWords[index] ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                    >
                      ${visibleWords[index] ? word : '?'}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="waiting-reveal">
                <p>⏳ Aguardando <strong>${nextPlayer?.name || 'outro jogador'}</strong> revelar uma palavra...</p>
                <p class="revealed-count">Palavras reveladas: ${revealedWordsCount || 0} / ${question.words.length}</p>
              </div>
            `}
          </div>

          <div class="formatted-question">
            <h3>Frase Atual:</h3>
            <div class="question-display">
              <p class="formatted-question-text">${formattedQuestion}</p>
            </div>
          </div>

          ${!isSpectator ? `
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
          ` : `
            <div class="spectator-note">
              <p>👁️ Você é telespectador e não pode participar</p>
            </div>
          `}
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getFreeForAllRoundEndHTML(): string {
    const { question, guess } = this.gameState.roundState;
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const playerScore = this.gameState.playerScores.get(currentPlayer?.id || '') || 0;
    const normalizedGuess = this.normalizeWord(guess.trim());
    const normalizedAnswer = this.normalizeWord(question?.answer.trim() || '');
    const isCorrect = normalizedGuess === normalizedAnswer;

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Resultado da Rodada ${this.getGameModeBadgeHTML()}</h2>
        </div>

        <div class="round-result">
          <div class="result-info">
            <p class="answer-reveal">Resposta correta: <strong>${question?.answer}</strong></p>
            <p class="guess-result ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? '✅ Você acertou!' : '❌ Você errou!'}
            </p>
            ${isCorrect ? `<p class="points-earned">+${this.gameState.roundState.points} pontos!</p>` : `<p class="points-lost">-5 pontos!</p>`}
            <p class="your-score">Sua pontuação total: <strong>${playerScore}</strong> pontos</p>
          </div>

          <button class="next-round-btn" id="next-round-btn">
            Próxima Rodada
          </button>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getChaosHTML(): string {
    const { question, visibleWords, chaosGuesses = [], lastRevealTime = Date.now(), revealedWordsIndices = [] } = this.gameState.roundState;
    if (!question) return '';

    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isSpectator = currentPlayer?.team === 'spectator';
    
    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);
    
    // Calcular tempo até próxima revelação (5 segundos)
    const timeSinceLastReveal = Date.now() - lastRevealTime;
    const timeUntilNextReveal = Math.max(0, 5000 - timeSinceLastReveal);
    const secondsUntilNext = Math.ceil(timeUntilNextReveal / 1000);

    if (this.gameState.roundState.roundEnded) {
      return this.getChaosRoundEndHTML();
    }

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>💥 Caos${this.getGameModeBadgeHTML()}</h2>
          <p class="game-subtitle">Adivinhe primeiro! Uma palavra será revelada a cada 5 segundos.</p>
        </div>

        <div class="chaos-game">
          <div class="chaos-main-section">
            <div class="formatted-question">
              <h3>Frase Atual:</h3>
              <div class="question-display">
                <p class="formatted-question-text">${formattedQuestion}</p>
              </div>
            </div>

            <div class="chaos-timer-section">
              <div class="auto-reveal-timer">
                <p class="timer-label">⏱️ Próxima palavra em:</p>
                <p class="timer-value" id="chaos-timer">${secondsUntilNext}s</p>
              </div>
              <p class="revealed-count">Palavras reveladas: ${revealedWordsIndices.length} / ${question.words.length}</p>
            </div>
          </div>

          <div class="chaos-chat-section">
            <h3>💬 Chat de Palpites</h3>
            <div class="chaos-chat-messages" id="chaos-chat-messages">
              ${chaosGuesses.map(guess => {
                const guessPlayer = this.gameState.players.find(p => p.id === guess.playerId);
                const photoHTML = guessPlayer?.photo 
                  ? `<img src="${guessPlayer.photo}" alt="${guess.playerName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 0.5rem;" />`
                  : '<span style="margin-right: 0.5rem;">👤</span>';
                // Se acertou, não mostrar o palpite, apenas indicar que acertou
                const guessDisplay = guess.isCorrect ? '<span class="chat-guess-correct">✅ Acertou!</span>' : `<span class="chat-guess">${guess.guess}</span>`;
                const correctBadge = guess.isCorrect ? `<span class="correct-badge">${guess.points}pts (${guess.order}º)</span>` : '';
                return `
                  <div class="chat-message ${guess.isCorrect ? 'correct' : ''}">
                    ${photoHTML}
                    <span class="chat-player-name">${guess.playerName}:</span>
                    ${guessDisplay}
                    ${correctBadge}
                  </div>
                `;
              }).join('')}
              ${chaosGuesses.length === 0 ? '<p class="no-guesses">Nenhum palpite ainda. Seja o primeiro a adivinhar!</p>' : ''}
            </div>
            ${!isSpectator ? `
              <div class="chaos-chat-input">
                <input 
                  type="text" 
                  id="chaos-guess-input" 
                  class="chaos-guess-input" 
                  placeholder="Digite seu palpite..."
                  ${this.gameState.roundState.roundEnded ? 'disabled' : ''}
                />
                <button 
                  class="submit-chaos-guess-btn" 
                  id="submit-chaos-guess-btn"
                  ${this.gameState.roundState.roundEnded ? 'disabled' : ''}
                >
                  Enviar
                </button>
              </div>
            ` : `
              <div class="spectator-note">
                <p>👁️ Você é telespectador e não pode participar</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getChaosRoundEndHTML(): string {
    const { question, correctGuesses = [] } = this.gameState.roundState;
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const playerScore = this.gameState.playerScores.get(currentPlayer?.id || '') || 0;
    
    // Verificar se o jogador atual acertou
    const playerCorrectGuess = correctGuesses.find(g => g.playerId === currentPlayer?.id);
    const isCorrect = !!playerCorrectGuess;

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>💥 Resultado da Rodada ${this.getGameModeBadgeHTML()}</h2>
        </div>

        <div class="round-result">
          <div class="result-info">
            <p class="guess-result ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? `✅ Você acertou em ${playerCorrectGuess?.order}º lugar!` : '❌ Você não acertou nesta rodada'}
            </p>
            ${isCorrect ? `<p class="points-earned">+${playerCorrectGuess?.points} pontos!</p>` : '<p class="points-lost">0 pontos</p>'}
            <p class="your-score">Sua pontuação total: <strong>${playerScore}</strong> pontos</p>
          </div>

          <div class="chaos-winners-list">
            <h3>🏆 Ranking de Acertos:</h3>
            <div class="winners-ranking">
              ${correctGuesses.length > 0 
                ? correctGuesses
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(guess => {
                      const guessPlayer = this.gameState.players.find(p => p.id === guess.playerId);
                      const photoHTML = guessPlayer?.photo 
                        ? `<img src="${guessPlayer.photo}" alt="${guess.playerName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 0.5rem;" />`
                        : '<span style="margin-right: 0.5rem;">👤</span>';
                      return `
                        <div class="winner-item ${guess.playerId === currentPlayer?.id ? 'you' : ''}">
                          ${photoHTML}
                          <span class="winner-position">${guess.order}º</span>
                          <span class="winner-name">${guess.playerName}</span>
                          <span class="winner-points">+${guess.points}pts</span>
                        </div>
                      `;
                    }).join('')
                : '<p class="no-winners">Ninguém acertou nesta rodada</p>'
              }
            </div>
          </div>

          <button class="next-round-btn" id="next-round-btn">
            Próxima Rodada
          </button>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getGameEndHTML(): string {
    const winner = this.gameState.winner;
    if (!winner) return this.getLobbyHTML();
    
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isWinner = currentPlayer?.id === winner.id;
    
    // Ordenar todos os jogadores por pontuação
    const allPlayersScores = Array.from(this.gameState.playerScores.entries())
      .map(([playerId, score]) => {
        const player = this.gameState.players.find(p => p.id === playerId);
        return {
          id: playerId,
          name: player?.name || 'Desconhecido',
          photo: player?.photo,
          score: score
        };
      })
      .sort((a, b) => b.score - a.score);
    
    const winnerPlayer = this.gameState.players.find(p => p.id === winner.id);
    
    const content = `
      <div class="contexto-container game-end-container">
        <div class="game-end-header">
          <div class="celebration-icons">
            <span class="celebration-icon">🎉</span>
            <span class="celebration-icon">🏆</span>
            <span class="celebration-icon">🎊</span>
          </div>
          <h2 class="game-end-title">Fim de Jogo! ${this.getGameModeBadgeHTML()}</h2>
          <p class="game-end-subtitle">Pontuação limite atingida!</p>
        </div>

        <div class="game-end-result">
          <div class="winner-announcement ${isWinner ? 'you-winner' : ''}">
            <div class="winner-badge">
              <span class="crown-icon">👑</span>
              <span class="winner-label">${isWinner ? 'Você Venceu!' : 'Vencedor'}</span>
            </div>
            <div class="winner-card">
              <div class="winner-avatar-wrapper">
                ${winnerPlayer?.photo 
                  ? `<img src="${winnerPlayer.photo}" alt="${winner.name}" class="winner-avatar" />`
                  : '<div class="winner-avatar-placeholder">👤</div>'}
                <div class="winner-glow"></div>
              </div>
              <h3 class="winner-name">${winner.name}</h3>
              <div class="winner-score-display">
                <span class="score-icon">⭐</span>
                <span class="score-value">${winner.score}</span>
                <span class="score-label">pontos</span>
              </div>
            </div>
          </div>

          <div class="final-ranking">
            <div class="ranking-header">
              <span class="ranking-icon">📊</span>
              <h3>Classificação Final</h3>
            </div>
            <div class="ranking-list">
              ${allPlayersScores.length > 0
                ? allPlayersScores.map((player, index) => {
                    const photoHTML = player.photo 
                      ? `<img src="${player.photo}" alt="${player.name}" class="ranking-avatar" />`
                      : '<div class="ranking-avatar-placeholder">👤</div>';
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const isCurrentPlayer = player.id === currentPlayer?.id;
                    return `
                      <div class="ranking-item ${isCurrentPlayer ? 'you' : ''} ${index === 0 ? 'first' : ''} ${index === 1 ? 'second' : ''} ${index === 2 ? 'third' : ''}">
                        <div class="ranking-position-wrapper">
                          <span class="ranking-medal">${medal}</span>
                          <span class="ranking-position">${index + 1}º</span>
                        </div>
                        <div class="ranking-player-info">
                          ${photoHTML}
                          <span class="ranking-name">${player.name}${isCurrentPlayer ? ' <span class="you-badge-small">(você)</span>' : ''}</span>
                        </div>
                        <span class="ranking-score">${player.score} pts</span>
                      </div>
                    `;
                  }).join('')
                : '<p class="no-scores">Nenhuma pontuação registrada</p>'
              }
            </div>
          </div>

          <button class="back-to-lobby-btn" id="back-to-lobby-btn">
            <span>🏠</span>
            <span>Voltar ao Lobby</span>
          </button>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getPlayersListHTML(): string {
    return `
      <div class="game-sidebar players-sidebar">
        <h3>👥 Jogadores</h3>
        <div class="all-players-list">
          ${this.gameState.players.map(player => {
            // No modo todos contra todos e caos, não mostrar badges de times
            const showTeamBadge = this.gameState.gameMode !== 'freeForAll' && this.gameState.gameMode !== 'chaos';
            const teamBadge = showTeamBadge ? (player.team === 'team1' ? '🔵' : player.team === 'team2' ? '🔴' : player.team === 'spectator' ? '👁️' : '') : (player.team === 'spectator' ? '👁️' : '');
            const teamName = showTeamBadge ? (player.team === 'team1' ? 'Azul' : player.team === 'team2' ? 'Vermelho' : player.team === 'spectator' ? 'Telespectador' : 'Sem time') : (player.team === 'spectator' ? 'Telespectador' : '');
            const photoHTML = player.photo 
              ? `<img src="${player.photo}" alt="${player.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
              : '<span style="font-size: 1.5rem; flex-shrink: 0;">👤</span>';
            return `
              <div class="player-list-item ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
                <span class="player-name">
                  ${photoHTML}
                  <span>${player.isAdmin ? '👑 ' : ''}${player.name}${player.name === this.playerName ? ' (você)' : ''}</span>
                </span>
                ${teamBadge && showTeamBadge ? `<span class="player-team-badge">${teamBadge} ${teamName}</span>` : (player.team === 'spectator' ? '<span class="player-team-badge">👁️ Telespectador</span>' : '')}
                ${player.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private getScoreboardHTML(): string {
    // No modo todos contra todos e caos, mostrar pontuação individual
    if (this.gameState.gameMode === 'freeForAll' || this.gameState.gameMode === 'chaos') {
      const sortedPlayers = [...this.gameState.players]
        .filter(p => p.team !== 'spectator')
        .sort((a, b) => {
          const scoreA = this.gameState.playerScores.get(a.id) || 0;
          const scoreB = this.gameState.playerScores.get(b.id) || 0;
          return scoreB - scoreA;
        });

      return `
        <div class="scoreboard-panel">
          <h3>📊 Pontuação Individual</h3>
          <div class="individual-scores">
            ${sortedPlayers.map((player, index) => {
              const score = this.gameState.playerScores.get(player.id) || 0;
              const isYou = player.name === this.playerName;
              const photoHTML = player.photo 
                ? `<img src="${player.photo}" alt="${player.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
                : '<span style="font-size: 1.2rem; flex-shrink: 0;">👤</span>';
              return `
                <div class="score-item ${isYou ? 'you' : ''} ${index === 0 ? 'first-place' : ''}">
                  <span class="player-name">
                    ${photoHTML}
                    <span>${player.name}${isYou ? ' (você)' : ''}</span>
                  </span>
                  <span class="score-value">${score} pts</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Modo clássico: mostrar pontuação por times
    return `
      <div class="scoreboard-panel">
        <div class="scoreboard-teams">
          <div class="scoreboard-team team1-scoreboard">
            <h3>Azul 🔵</h3>
            <div class="score-value">${this.gameState.team1Score}</div>
            <div class="team-players-list">
              ${this.gameState.team1.map(player => {
                const photoHTML = player.photo 
                  ? `<img src="${player.photo}" alt="${player.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
                  : '<span style="font-size: 1.2rem; flex-shrink: 0;">👤</span>';
                return `
                <span class="scoreboard-player ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
                  ${photoHTML}
                  <span>${player.isAdmin ? '👑 ' : ''}${player.name}${player.name === this.playerName ? ' (você)' : ''}</span>
                </span>
              `;
              }).join('')}
            </div>
          </div>
          <div class="scoreboard-team team2-scoreboard">
            <h3>Vermelho 🔴</h3>
            <div class="score-value">${this.gameState.team2Score}</div>
            <div class="team-players-list">
              ${this.gameState.team2.map(player => {
                const photoHTML = player.photo 
                  ? `<img src="${player.photo}" alt="${player.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
                  : '<span style="font-size: 1.2rem; flex-shrink: 0;">👤</span>';
                return `
                <span class="scoreboard-player ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
                  ${photoHTML}
                  <span>${player.isAdmin ? '👑 ' : ''}${player.name}${player.name === this.playerName ? ' (você)' : ''}</span>
                </span>
              `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getScoreboardSidebarHTML(): string {
    // No modo todos contra todos e caos, mostrar pontuação individual
    if ((this.gameState.gameMode === 'freeForAll' || this.gameState.gameMode === 'chaos') && this.gameState.isGameActive) {
      const sortedPlayers = [...this.gameState.players]
        .filter(p => p.team !== 'spectator')
        .sort((a, b) => {
          const scoreA = this.gameState.playerScores.get(a.id) || 0;
          const scoreB = this.gameState.playerScores.get(b.id) || 0;
          return scoreB - scoreA;
        });
      
      return `
        <div class="game-sidebar scoreboard-sidebar">
          <div class="scoreboard-panel">
            <h3>📊 Pontuação</h3>
            <div class="individual-scores">
              ${sortedPlayers.map((player, index) => {
                const score = this.gameState.playerScores.get(player.id) || 0;
                const isYou = player.name === this.playerName;
                const photoHTML = player.photo 
                  ? `<img src="${player.photo}" alt="${player.name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`
                  : '<span style="font-size: 1.2rem; flex-shrink: 0;">👤</span>';
                return `
                  <div class="score-item ${isYou ? 'you' : ''} ${index === 0 ? 'first-place' : ''}">
                    <span class="player-name">
                      ${photoHTML}
                      <span>${player.name}${isYou ? ' (você)' : ''}</span>
                    </span>
                    <span class="score-value">${score} pts</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="game-sidebar scoreboard-sidebar">
        ${this.getScoreboardHTML()}
      </div>
    `;
  }

  private getGameplayWrapper(content: string): string {
    return `
      <div class="gameplay-layout">
        ${this.getPlayersListHTML()}
        <div class="game-main-content">
          ${content}
        </div>
        ${this.getScoreboardSidebarHTML()}
      </div>
    `;
  }

  private getQuestionSelectorHTML(): string {
    const { question, visibleWords } = this.gameState.roundState;
    if (!question) return '';

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Sua Vez! ${this.getGameModeBadgeHTML()}</h2>
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
            ${(() => {
              const modeConfig = this.gameState.gameMode ? GAME_MODES[this.gameState.gameMode] : GAME_MODES.classic;
              const maxWords = modeConfig.maxWords;
              return `<p class="hidden-count">Palavras ocultadas: <span id="hidden-count">${visibleWords.filter(v => !v).length}</span> / ${maxWords}</p>`;
            })()}
            <p class="points-preview">Pontos possíveis: <span id="points-preview">${this.calculatePoints(visibleWords)}</span></p>
            <button class="submit-words-btn" id="submit-words-btn">
              Enviar Palavras
            </button>
          </div>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getWaitingForWordsHTML(): string {
    const { currentPlayerId, currentTeam } = this.gameState.roundState;
    const currentPlayer = this.gameState.players.find((p) => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || 'Jogador';
    const teamName = currentTeam === 'team1' ? 'Azul' : 'Vermelho';

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Contexto ${this.getGameModeBadgeHTML()}</h2>
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
    
    return this.getGameplayWrapper(content);
  }

  private getSpectatorWordsHTML(): string {
    const { question, visibleWords, currentPlayerId, currentTeam } = this.gameState.roundState;
    if (!question) return '';

    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);
    const currentPlayer = this.gameState.players.find((p) => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || 'Jogador';
    const teamName = currentTeam === 'team1' ? 'Azul' : 'Vermelho';

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Contexto ${this.getGameModeBadgeHTML()}</h2>
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
    
    return this.getGameplayWrapper(content);
  }

  private getGuesserHTML(): string {
    const { question, visibleWords } = this.gameState.roundState;
    if (!question) return '';

    const formattedQuestion = this.formatQuestionWithBlanks(question, visibleWords);

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Adivinhe a Palavra! ${this.getGameModeBadgeHTML()}</h2>
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
    
    return this.getGameplayWrapper(content);
  }

  private getWaitingHTML(): string {
    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Contexto ${this.getGameModeBadgeHTML()}</h2>
          <p class="game-subtitle">Aguardando sua vez...</p>
        </div>
        <div class="waiting-message">
          <p>O jogo está em andamento. Aguarde sua vez!</p>
        </div>
      </div>
    `;
    
    return this.getGameplayWrapper(content);
  }

  private getRoundEndHTML(): string {
    const { question, guess, points } = this.gameState.roundState;
    const normalizedGuess = this.normalizeWord(guess.trim());
    const normalizedAnswer = this.normalizeWord(question?.answer.trim() || '');
    const isCorrect = normalizedGuess === normalizedAnswer;
    const currentTeam = this.gameState.roundState.currentTeam;

    const content = `
      <div class="contexto-container">
        <div class="contexto-header">
          <h2>🎯 Resultado da Rodada ${this.getGameModeBadgeHTML()}</h2>
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
    
    return this.getGameplayWrapper(content);
  }

  private calculatePoints(visibleWords: boolean[]): number {
    const hiddenCount = visibleWords.filter(v => !v).length;
    // Mais palavras ocultadas = mais pontos
    // Aplicar multiplicador do modo
    const modeConfig = this.gameState.gameMode ? GAME_MODES[this.gameState.gameMode] : GAME_MODES.classic;
    return Math.floor(hiddenCount * modeConfig.pointMultiplier);
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
        <div class="team-player ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
          <span class="player-name">${player.name}${player.isAdmin ? ' 👑' : ''}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
          ${player.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
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
        <div class="waiting-player ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
          <span class="player-name">${player.name}${player.isAdmin ? ' 👑' : ''}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
          ${player.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
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
        <div class="spectator-player ${player.name === this.playerName ? 'you' : ''} ${player.isAdmin ? 'admin' : ''}">
          <span class="player-name">${player.name}${player.isAdmin ? ' 👑' : ''}</span>
          ${player.name === this.playerName ? '<span class="you-badge">você</span>' : ''}
          ${player.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
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

    // Só adicionar listeners de times se não estiver no modo todos contra todos ou caos
    if (this.gameState.gameMode !== 'freeForAll' && this.gameState.gameMode !== 'chaos') {
      joinTeam1Btn?.addEventListener('click', () => {
        this.joinTeam('team1');
      });

      joinTeam2Btn?.addEventListener('click', () => {
        this.joinTeam('team2');
      });
    }

    joinSpectatorBtn?.addEventListener('click', () => {
      this.joinSpectator();
    });

    // Botão de aleatorizar times (apenas admin)
    const randomizeTeamsBtn = this.gameElement.querySelector('#randomize-teams-btn');
    randomizeTeamsBtn?.addEventListener('click', () => {
      this.randomizeTeams();
    });

    // Listener para pontuação limite (modo Caos) - slider
    const scoreLimitSlider = this.gameElement.querySelector('#score-limit-slider') as HTMLInputElement;
    const scoreLimitValue = this.gameElement.querySelector('#score-limit-value');
    if (scoreLimitSlider) {
      // Atualizar valor exibido enquanto arrasta
      scoreLimitSlider.addEventListener('input', () => {
        const value = parseInt(scoreLimitSlider.value, 10);
        if (scoreLimitValue) {
          scoreLimitValue.textContent = value.toString();
        }
      });
      
      // Salvar valor quando soltar o slider
      scoreLimitSlider.addEventListener('change', () => {
        const value = parseInt(scoreLimitSlider.value, 10);
        if (!isNaN(value) && value > 0 && value <= 300) {
          this.gameState.scoreLimit = value;
          this.saveGameState();
          
          // Enviar para outros jogadores
          if (this.socket && this.roomId) {
            this.socket.emit('game-broadcast', {
              roomId: this.roomId,
              event: 'score-limit-changed',
              payload: {
                scoreLimit: value,
              },
            });
          }
        }
      });
    }

    // Listener para seleção de modo
    const gameModesGrid = this.gameElement.querySelector('#game-modes-grid');
    if (gameModesGrid) {
      gameModesGrid.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const modeCard = target.closest('.game-mode-card') as HTMLElement;
        if (modeCard) {
          const mode = modeCard.getAttribute('data-mode') as GameMode;
          if (mode) {
            this.selectGameMode(mode);
          }
        }
      });
    }

    startGameBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Botão iniciar jogo clicado');
      this.startGame();
    });

    // Botão de voltar ao lobby (fim de jogo)
    const backToLobbyBtn = this.gameElement.querySelector('#back-to-lobby-btn');
    backToLobbyBtn?.addEventListener('click', () => {
      this.gameState.isGameActive = false;
      this.gameState.gameEnded = false;
      this.gameState.winner = undefined;
      this.saveGameState();
      this.updateDisplay();
    });

    // Event listeners dinâmicos para o jogo
    this.setupGameplayListeners();
  }

  private setupGameplayListeners() {
    if (!this.gameElement) return;

    // Listener para palavras (question selector) - modo clássico
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

    // Listener para revelar palavras - modo todos contra todos
    const revealWordsGrid = this.gameElement.querySelector('#reveal-words-grid');
    if (revealWordsGrid) {
      revealWordsGrid.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('reveal-btn')) {
          const btn = target as HTMLButtonElement;
          if (btn.disabled) return;
          const index = parseInt(target.getAttribute('data-index') || '0');
          this.revealWord(index);
        }
      });
    }

    // Listener para enviar palavras
    const submitWordsBtn = this.gameElement.querySelector('#submit-words-btn');
    submitWordsBtn?.addEventListener('click', () => {
      this.submitWords();
    });

    // Listener para enviar resposta (modo clássico e todos contra todos)
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

    // Listener para chat do modo Caos (será reconfigurado em setupChaosListeners após updateDisplay)
    // Não configurar aqui porque o HTML será recriado em updateDisplay

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
      const modeConfig = this.gameState.gameMode ? GAME_MODES[this.gameState.gameMode] : GAME_MODES.classic;
      const hidden = visibleWords.filter(v => !v).length;
      hiddenCount.textContent = `${hidden} / ${modeConfig.maxWords}`;
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
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);

    if (this.gameState.gameMode === 'freeForAll') {
      // Modo todos contra todos: pontuação individual
      if (currentPlayer) {
        const currentScore = this.gameState.playerScores.get(currentPlayer.id) || 0;
        
        if (isCorrect) {
          // Pontos baseados em quantas palavras ainda estão ocultas
          const hiddenCount = this.gameState.roundState.visibleWords.filter(v => !v).length;
          const points = hiddenCount;
          this.gameState.playerScores.set(currentPlayer.id, currentScore + points);
          this.gameState.roundState.points = points;
        } else {
          // Errou: perde 5 pontos
          const penalty = -5;
          const newScore = Math.max(0, currentScore + penalty); // Não permite pontuação negativa
          this.gameState.playerScores.set(currentPlayer.id, newScore);
          this.gameState.roundState.points = penalty;
        }
      }

      // Enviar resultado
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'free-for-all-guess',
          payload: {
            playerId: currentPlayer?.id,
            playerName: this.playerName,
            guess: guess,
            isCorrect: isCorrect,
            points: this.gameState.roundState.points,
            playerScores: Array.from(this.gameState.playerScores.entries()),
          },
        });
      }

      this.gameState.roundState.roundEnded = true;
    } else {
      // Modo clássico: pontuação por time
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
    }

    this.saveGameState();
    this.updateDisplay();
  }

  private submitChaosGuess() {
    console.log('📝 submitChaosGuess chamado');
    const guessInput = this.gameElement?.querySelector('#chaos-guess-input') as HTMLInputElement;
    if (!guessInput) {
      console.log('⚠️ Input de palpite não encontrado');
      return;
    }

    const guess = guessInput.value.trim();
    if (!guess) {
      console.log('⚠️ Palpite vazio');
      return;
    }
    
    console.log('💬 Processando palpite:', guess);

    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    if (!currentPlayer) return;

    // Verificar se já acertou
    const alreadyCorrect = this.gameState.roundState.correctGuesses?.some(
      g => g.playerId === currentPlayer.id && g.isCorrect
    );
    if (alreadyCorrect) {
      alert('Você já acertou! Aguarde a próxima rodada.');
      return;
    }

    // Adicionar palpite ao chat
    const newGuess: Guess = {
      playerId: currentPlayer.id,
      playerName: this.playerName,
      guess: guess,
      timestamp: Date.now(),
    };

    if (!this.gameState.roundState.chaosGuesses) {
      this.gameState.roundState.chaosGuesses = [];
    }
    this.gameState.roundState.chaosGuesses.push(newGuess);

    // Verificar se está correto
    const { question } = this.gameState.roundState;
    const normalizedGuess = this.normalizeWord(guess.trim());
    const normalizedAnswer = this.normalizeWord(question?.answer.trim() || '');
    const isCorrect = normalizedGuess === normalizedAnswer;

    if (isCorrect) {
      // Processar acerto (isso atualiza newGuess com order, points, isCorrect)
      this.processChaosCorrectGuess(newGuess);
    }

    // Limpar input
    guessInput.value = '';

    // Enviar para outros jogadores (após processamento, se correto)
    if (this.socket && this.roomId) {
      // Se foi correto, buscar o palpite atualizado com order e points
      const guessToSend = isCorrect 
        ? (this.gameState.roundState.chaosGuesses?.find(g => g.playerId === newGuess.playerId && g.timestamp === newGuess.timestamp) || newGuess)
        : newGuess;
      
      console.log('📤 Enviando palpite via socket:', {
        guess: guessToSend.guess,
        isCorrect: isCorrect,
        hasOrder: !!guessToSend.order,
        hasPoints: !!guessToSend.points
      });
      
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'chaos-guess',
        payload: {
          guess: guessToSend,
          isCorrect: isCorrect,
        },
      });
    } else {
      console.log('⚠️ Socket ou roomId não disponível');
    }

    this.saveGameState();
    this.updateDisplay();
    
    // Fazer scroll do chat para a última mensagem
    setTimeout(() => {
      const chatMessages = this.gameElement?.querySelector('#chaos-chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }

  private processChaosCorrectGuess(guess: Guess) {
    console.log('🎯 Processando acerto no modo Caos:', guess);
    
    if (!this.gameState.roundState.correctGuesses) {
      this.gameState.roundState.correctGuesses = [];
    }

    // Verificar se já acertou
    const alreadyInList = this.gameState.roundState.correctGuesses.some(
      g => g.playerId === guess.playerId
    );
    if (alreadyInList) {
      console.log('⚠️ Jogador já está na lista de acertos');
      return; // Já está na lista
    }

    // Adicionar à lista de acertos
    const order = this.gameState.roundState.correctGuesses.length + 1;
    const points = 11 - order; // 10 pontos para 1º, 9 para 2º, etc.
    
    console.log('🏆 Novo acerto!', {
      player: guess.playerName,
      order: order,
      points: points
    });
    
    guess.isCorrect = true;
    guess.order = order;
    guess.points = points;

    this.gameState.roundState.correctGuesses.push(guess);

    // Atualizar pontuação do jogador
    const currentScore = this.gameState.playerScores.get(guess.playerId) || 0;
    const newScore = currentScore + points;
    this.gameState.playerScores.set(guess.playerId, newScore);
    
    console.log('📊 Pontuação atualizada:', {
      player: guess.playerName,
      oldScore: currentScore,
      pointsEarned: points,
      newScore: newScore
    });

    // Atualizar o palpite no array de palpites
    const guessIndex = this.gameState.roundState.chaosGuesses?.findIndex(
      g => g.playerId === guess.playerId && g.timestamp === guess.timestamp
    );
    if (guessIndex !== undefined && guessIndex !== -1 && this.gameState.roundState.chaosGuesses) {
      this.gameState.roundState.chaosGuesses[guessIndex] = guess;
      console.log('✅ Palpite atualizado no array de palpites');
    }

    // Verificar se algum jogador atingiu a pontuação limite
    if (this.gameState.scoreLimit && newScore >= this.gameState.scoreLimit) {
      console.log('🏆 Pontuação limite atingida!', {
        playerId: guess.playerId,
        playerName: guess.playerName,
        score: newScore,
        limit: this.gameState.scoreLimit
      });
      // Terminar o jogo (mas manter isGameActive para mostrar tela de fim de jogo)
      this.gameState.gameEnded = true;
      this.gameState.winner = {
        id: guess.playerId,
        name: guess.playerName,
        score: newScore
      };
      this.saveGameState();
      this.updateDisplay();
      
      // Enviar para outros jogadores
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'game-ended',
          payload: {
            winnerId: guess.playerId,
            winnerName: guess.playerName,
            winnerScore: newScore,
            reason: 'score-limit',
          },
        });
      }
      return;
    }

    // Verificar se a rodada deve terminar
    this.checkChaosRoundEnd();
  }
  
  private checkChaosRoundEnd() {
    const { question, correctGuesses = [], revealedWordsIndices = [] } = this.gameState.roundState;
    if (!question) return;
    
    // Contar jogadores que podem jogar (não telespectadores)
    const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
    const totalPlayers = availablePlayers.length;
    const playersWhoGuessed = correctGuesses.length;
    
    // Verificar se todas as palavras foram reveladas
    const allWordsRevealed = revealedWordsIndices.length >= question.words.length;
    
    // Verificar se todos os jogadores acertaram
    const allPlayersGuessed = playersWhoGuessed >= totalPlayers;
    
    // A rodada termina se: todos acertaram OU todas as palavras foram reveladas
    if (allPlayersGuessed || allWordsRevealed) {
      console.log('🏁 Terminando rodada:', {
        allPlayersGuessed,
        allWordsRevealed,
        playersWhoGuessed,
        totalPlayers,
        wordsRevealed: revealedWordsIndices.length,
        totalWords: question.words.length
      });
      
      setTimeout(() => {
        this.gameState.roundState.roundEnded = true;
        this.stopChaosAutoReveal();
        this.updateDisplay();
      }, 2000);
    }
  }

  private startChaosAutoReveal() {
    // Limpar timer anterior se existir
    this.stopChaosAutoReveal();

    console.log('🔄 Iniciando timer de revelação automática do modo Caos');
    
    // Garantir que lastRevealTime está definido
    if (!this.gameState.roundState.lastRevealTime) {
      this.gameState.roundState.lastRevealTime = Date.now();
    }

    // NÃO revelar primeira palavra imediatamente - começar com timer de 5 segundos
    // Configurar timer para revelar a cada 5 segundos
    this.chaosAutoRevealInterval = window.setInterval(() => {
      console.log('⏰ Timer do Caos executado', {
        gameMode: this.gameState.gameMode,
        isGameActive: this.gameState.isGameActive,
        roundEnded: this.gameState.roundState.roundEnded
      });
      
      if (this.gameState.gameMode === 'chaos' && this.gameState.isGameActive && !this.gameState.roundState.roundEnded) {
        this.revealChaosWord();
      } else {
        console.log('🛑 Parando timer do Caos');
        this.stopChaosAutoReveal();
      }
    }, 5000) as unknown as number;
    
    // Atualizar o timer na tela
    setTimeout(() => {
      this.updateChaosTimer();
    }, 100);
  }

  private stopChaosAutoReveal() {
    if (this.chaosAutoRevealInterval !== null) {
      clearInterval(this.chaosAutoRevealInterval);
      this.chaosAutoRevealInterval = null;
    }
  }

  private revealChaosWord() {
    console.log('🔓 revealChaosWord chamado');
    const { question, visibleWords, revealedWordsIndices = [] } = this.gameState.roundState;
    if (!question) {
      console.log('⚠️ Nenhuma pergunta disponível');
      return;
    }
    
    console.log('📊 Estado atual:', {
      revealedCount: revealedWordsIndices.length,
      totalWords: question.words.length,
      visibleWords: visibleWords.filter(v => v).length
    });

    // Verificar se todas as palavras já foram reveladas
    if (revealedWordsIndices.length >= question.words.length) {
      this.stopChaosAutoReveal();
      return;
    }

    // Encontrar índices de palavras ainda não reveladas
    const availableIndices: number[] = [];
    for (let i = 0; i < question.words.length; i++) {
      if (!visibleWords[i] && !revealedWordsIndices.includes(i)) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      this.stopChaosAutoReveal();
      return;
    }

    // Escolher índice aleatório
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    
    console.log('🎲 Revelando palavra no índice:', randomIndex, 'Palavra:', question.words[randomIndex]);

    // Revelar a palavra
    this.gameState.roundState.visibleWords[randomIndex] = true;
    if (!this.gameState.roundState.revealedWordsIndices) {
      this.gameState.roundState.revealedWordsIndices = [];
    }
    this.gameState.roundState.revealedWordsIndices.push(randomIndex);
    this.gameState.roundState.revealedWordsCount = this.gameState.roundState.revealedWordsIndices.length;
    this.gameState.roundState.lastRevealTime = Date.now();
    
    console.log('✅ Palavra revelada. Total reveladas:', this.gameState.roundState.revealedWordsIndices.length);

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'chaos-word-revealed',
        payload: {
          wordIndex: randomIndex,
          visibleWords: this.gameState.roundState.visibleWords,
          revealedWordsIndices: this.gameState.roundState.revealedWordsIndices,
          lastRevealTime: this.gameState.roundState.lastRevealTime,
        },
      });
    }

    this.saveGameState();
    this.updateDisplay();
    
    // Verificar se a rodada deve terminar após revelar palavra
    this.checkChaosRoundEnd();
  }

  private updateChaosTimer() {
    if (this.gameState.gameMode !== 'chaos' || !this.gameState.isGameActive || this.gameState.roundState.roundEnded) return;

    const updateTimer = () => {
      if (this.gameState.gameMode !== 'chaos' || !this.gameState.isGameActive || this.gameState.roundState.roundEnded) return;
      
      const timerElement = this.gameElement?.querySelector('#chaos-timer');
      if (!timerElement) {
        // Tentar novamente após um pequeno delay se o elemento ainda não existir
        setTimeout(updateTimer, 100);
        return;
      }
      
      const { lastRevealTime = Date.now() } = this.gameState.roundState;
      const timeSinceLastReveal = Date.now() - lastRevealTime;
      const timeUntilNextReveal = Math.max(0, 5000 - timeSinceLastReveal);
      const secondsUntilNext = Math.ceil(timeUntilNextReveal / 1000);

      timerElement.textContent = `${secondsUntilNext}s`;

      if (timeUntilNextReveal > 0 && !this.gameState.roundState.roundEnded) {
        setTimeout(updateTimer, 100);
      } else if (timeUntilNextReveal <= 0 && !this.gameState.roundState.roundEnded) {
        // Resetar para 5 segundos quando uma palavra for revelada
        setTimeout(updateTimer, 100);
      }
    };

    updateTimer();
  }

  private setupChaosListeners() {
    if (!this.gameElement) {
      console.log('⚠️ gameElement não existe para setupChaosListeners');
      return;
    }
    
    // Listener para chat do modo Caos
    const submitChaosGuessBtn = this.gameElement.querySelector('#submit-chaos-guess-btn');
    const chaosGuessInput = this.gameElement.querySelector('#chaos-guess-input') as HTMLInputElement;
    
    console.log('🔧 Configurando listeners do Caos', {
      hasButton: !!submitChaosGuessBtn,
      hasInput: !!chaosGuessInput
    });
    
    if (submitChaosGuessBtn) {
      // Remover listener anterior se existir
      const newBtn = submitChaosGuessBtn.cloneNode(true);
      submitChaosGuessBtn.parentNode?.replaceChild(newBtn, submitChaosGuessBtn);
      
      newBtn.addEventListener('click', () => {
        console.log('💬 Botão de palpite clicado');
        this.submitChaosGuess();
      });
    } else {
      console.log('⚠️ Botão submit-chaos-guess-btn não encontrado');
    }
    
    if (chaosGuessInput) {
      chaosGuessInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('💬 Enter pressionado no input de palpite');
          this.submitChaosGuess();
        }
      });
    } else {
      console.log('⚠️ Input chaos-guess-input não encontrado');
    }
  }

  private revealWord(index: number) {
    // No modo Caos, palavras são reveladas automaticamente
    if (this.gameState.gameMode === 'chaos') return;
    if (this.gameState.gameMode !== 'freeForAll') return;
    
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    
    // No modo freeForAll, precisa ser a vez do jogador
    const canReveal = currentPlayer?.id === this.gameState.roundState.nextRevealPlayerId;
    if (!canReveal) {
      alert('Não é sua vez de revelar uma palavra!');
      return;
    }

    if (this.gameState.roundState.visibleWords[index]) {
      alert('Esta palavra já foi revelada!');
      return;
    }

    // Revelar a palavra
    this.gameState.roundState.visibleWords[index] = true;
    this.gameState.roundState.revealedWordsCount = (this.gameState.roundState.revealedWordsCount || 0) + 1;

    // Rotacionar para o próximo jogador
    const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
    const currentIndex = availablePlayers.findIndex(p => p.id === currentPlayer?.id);
    const nextIndex = (currentIndex + 1) % availablePlayers.length;
    this.gameState.roundState.nextRevealPlayerId = availablePlayers[nextIndex]?.id || null;

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: eventName,
        payload: {
          wordIndex: index,
          visibleWords: this.gameState.roundState.visibleWords,
          revealedWordsCount: this.gameState.roundState.revealedWordsCount,
          nextRevealPlayerId: this.gameState.roundState.nextRevealPlayerId,
          gameMode: this.gameState.gameMode,
        },
      });
    }

    this.saveGameState();
    this.updateDisplay();
  }

  private nextRound() {
    this.gameState.currentRound++;
    
    // Nova pergunta aleatória
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    // Aplicar número de palavras do modo
    const modeConfig = this.gameState.gameMode ? GAME_MODES[this.gameState.gameMode] : GAME_MODES.classic;
    const questionWords = randomQuestion.words.slice(0, modeConfig.maxWords);
    const adaptedQuestion = {
      ...randomQuestion,
      words: questionWords,
    };

    if (this.gameState.gameMode === 'freeForAll') {
      // Modo todos contra todos: nova rodada com todas as palavras ocultas
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      const firstPlayer = availablePlayers[0];
      
      this.gameState.roundState = {
        currentTeam: null,
        currentPlayerId: null,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: modeConfig.maxWords }, () => false), // Todas ocultas
        guess: '',
        points: 0,
        roundStarted: true,
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: firstPlayer?.id || null,
      };
    } else if (this.gameState.gameMode === 'chaos') {
      // Parar timer anterior
      this.stopChaosAutoReveal();
      
      // Modo caos: nova rodada com todas as palavras ocultas
      // Revelação automática a cada 5 segundos
      this.gameState.roundState = {
        currentTeam: null,
        currentPlayerId: null,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: modeConfig.maxWords }, () => false), // Todas ocultas
        guess: '',
        points: 0,
        roundStarted: true,
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: null,
        // Reinicializar campos do modo Caos
        chaosGuesses: [],
        autoRevealTimer: null,
        lastRevealTime: Date.now(),
        revealedWordsIndices: [],
        correctGuesses: [],
        nextRevealIndex: 0,
      };
      
      // Iniciar timer de revelação automática
      this.startChaosAutoReveal();
    } else {
      // Modo clássico: alternar time
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

      this.gameState.roundState = {
        currentTeam: nextTeam,
        currentPlayerId: nextPlayer.id,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: modeConfig.maxWords }, () => true), // Todas visíveis inicialmente
        guess: '',
        points: 0,
        roundStarted: false,
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: null,
      };
    }

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      const payload: any = {
        question: adaptedQuestion,
        gameMode: this.gameState.gameMode,
      };
      
      if (this.gameState.gameMode === 'classic') {
        payload.currentTeam = this.gameState.roundState.currentTeam;
        payload.currentPlayerId = this.gameState.roundState.currentPlayerId;
      } else if (this.gameState.gameMode === 'freeForAll') {
        payload.visibleWords = this.gameState.roundState.visibleWords;
        payload.nextRevealPlayerId = this.gameState.roundState.nextRevealPlayerId;
        payload.revealedWordsCount = this.gameState.roundState.revealedWordsCount;
      }
      
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'round-started',
        payload,
      });
    }

    this.saveGameState();
    this.updateDisplay();
  }

  private selectGameMode(mode: GameMode) {
    this.gameState.gameMode = mode;
    this.updateDisplay();
    
    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'game-mode-selected',
        payload: {
          mode: mode,
        },
      });
    }
  }

  private randomizeTeams() {
    // Verificar se é admin
    const currentPlayer = this.gameState.players.find((p) => p.name === this.playerName);
    const isAdmin = currentPlayer?.isAdmin || false;
    
    if (!isAdmin) {
      alert('Apenas o administrador pode aleatorizar os times!');
      return;
    }

    if (this.gameState.isGameActive) {
      alert('Não é possível aleatorizar times durante o jogo!');
      return;
    }

    // Pegar todos os jogadores que não são telespectadores
    // Incluir jogadores em times E jogadores sem time (team === null)
    const playersToRandomize = this.gameState.players.filter(
      (p) => p.team !== 'spectator'
    );

    // Se não há jogadores suficientes
    if (playersToRandomize.length === 0) {
      alert('Não há jogadores para aleatorizar! Os jogadores precisam estar disponíveis (não podem ser telespectadores).');
      return;
    }

    // Limpar todos os times
    this.gameState.team1 = [];
    this.gameState.team2 = [];
    
    // Remover times de todos os jogadores
    playersToRandomize.forEach((player) => {
      player.team = null;
    });

    // Embaralhar os jogadores aleatoriamente
    const shuffledPlayers = [...playersToRandomize].sort(() => Math.random() - 0.5);

    // Distribuir os jogadores entre os times
    // Tentar manter os times balanceados (máximo 2 por time)
    shuffledPlayers.forEach((player) => {
      if (this.gameState.team1.length < 2 && (this.gameState.team1.length <= this.gameState.team2.length || this.gameState.team2.length >= 2)) {
        player.team = 'team1';
        this.gameState.team1.push(player);
      } else if (this.gameState.team2.length < 2) {
        player.team = 'team2';
        this.gameState.team2.push(player);
      } else {
        // Se ambos os times estão cheios, colocar no time com menos jogadores
        if (this.gameState.team1.length <= this.gameState.team2.length) {
          player.team = 'team1';
          this.gameState.team1.push(player);
        } else {
          player.team = 'team2';
          this.gameState.team2.push(player);
        }
      }
    });

    console.log('🎲 Times aleatorizados:', {
      team1: this.gameState.team1.map(p => p.name),
      team2: this.gameState.team2.map(p => p.name),
    });

    this.saveGameState();
    this.updateDisplay();
    this.updateStartButton();

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'teams-randomized',
        payload: {
          team1: this.gameState.team1.map(p => ({ id: p.id, name: p.name })),
          team2: this.gameState.team2.map(p => ({ id: p.id, name: p.name })),
        },
      });
    }
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
    
    // Verificar se um modo foi selecionado
    if (!this.gameState.gameMode) {
      alert('Por favor, selecione um modo de jogo antes de iniciar!');
      return;
    }

    const gameModeConfig = GAME_MODES[this.gameState.gameMode];
    console.log('Iniciando jogo no modo:', this.gameState.gameMode, gameModeConfig);
    
    // Validações específicas por modo
    if (this.gameState.gameMode === 'classic') {
      // Modo clássico: precisa de exatamente 2 jogadores em cada time
      if (this.gameState.team1.length !== 2 || this.gameState.team2.length !== 2) {
        alert('Precisa de exatamente 2 jogadores em cada time para começar!');
        return;
      }
    } else if (this.gameState.gameMode === 'freeForAll') {
      // Modo todos contra todos: precisa de pelo menos 2 jogadores (não telespectadores)
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      if (availablePlayers.length < 2) {
        alert('Precisa de pelo menos 2 jogadores para começar!');
        return;
      }
      // Inicializar pontuação individual
      availablePlayers.forEach(player => {
        this.gameState.playerScores.set(player.id, 0);
      });
    } else if (this.gameState.gameMode === 'chaos') {
      // Modo caos: precisa de pelo menos 2 jogadores (não telespectadores)
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      if (availablePlayers.length < 2) {
        alert('Precisa de pelo menos 2 jogadores para começar!');
        return;
      }
      // Inicializar pontuação individual
      availablePlayers.forEach(player => {
        this.gameState.playerScores.set(player.id, 0);
      });
    }

    this.gameState.isGameActive = true;
    this.gameState.currentRound = 1;

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    // Aplicar número de palavras do modo
    const questionWords = randomQuestion.words.slice(0, gameModeConfig.maxWords);
    const adaptedQuestion = {
      ...randomQuestion,
      words: questionWords,
    };
    console.log('Pergunta selecionada:', adaptedQuestion);

    // Inicializar roundState baseado no modo
    if (this.gameState.gameMode === 'classic') {
      // Modo clássico: começar com Azul, primeiro jogador
      const firstPlayer = this.gameState.team1[0];
      if (!firstPlayer) {
        console.error('Nenhum jogador no Azul!');
        return;
      }
      
      this.gameState.roundState = {
        currentTeam: 'team1',
        currentPlayerId: firstPlayer.id,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: gameModeConfig.maxWords }, () => true),
        guess: '',
        points: 0,
        roundStarted: false,
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: null,
      };
    } else if (this.gameState.gameMode === 'freeForAll') {
      // Modo todos contra todos: todos começam com todas as palavras ocultas
      // Primeiro jogador pode revelar uma palavra
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      const firstPlayer = availablePlayers[0];
      
      this.gameState.roundState = {
        currentTeam: null,
        currentPlayerId: null,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: gameModeConfig.maxWords }, () => false), // Todas ocultas
        guess: '',
        points: 0,
        roundStarted: true, // Jogo já começa ativo
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: firstPlayer?.id || null,
      };
    } else if (this.gameState.gameMode === 'chaos') {
      // Modo caos: todos começam com todas as palavras ocultas
      // Revelação automática a cada 5 segundos
      // Todos podem adivinhar simultaneamente via chat
      const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
      
      this.gameState.roundState = {
        currentTeam: null,
        currentPlayerId: null,
        question: adaptedQuestion,
        visibleWords: Array.from({ length: gameModeConfig.maxWords }, () => false), // Todas ocultas
        guess: '',
        points: 0,
        roundStarted: true, // Jogo já começa ativo
        roundEnded: false,
        revealedWordsCount: 0,
        nextRevealPlayerId: null,
        // Inicializar campos do modo Caos
        chaosGuesses: [],
        autoRevealTimer: null,
        lastRevealTime: Date.now(), // Começar o timer agora
        revealedWordsIndices: [],
        correctGuesses: [],
        nextRevealIndex: 0,
      };
      
      // Iniciar timer de revelação automática (a cada 5 segundos)
      // A primeira palavra será revelada após 5 segundos
      this.startChaosAutoReveal();
    }
    
    console.log('Round state criado:', this.gameState.roundState);

    console.log('Estado do jogo atualizado:', this.gameState.roundState);

    // Enviar para outros jogadores
    if (this.socket && this.roomId) {
      const payload: any = {
        question: adaptedQuestion,
        gameMode: this.gameState.gameMode,
      };
      
      if (this.gameState.gameMode === 'classic') {
        payload.currentTeam = 'team1';
        payload.currentPlayerId = this.gameState.roundState.currentPlayerId;
      } else if (this.gameState.gameMode === 'freeForAll') {
        payload.nextRevealPlayerId = this.gameState.roundState.nextRevealPlayerId;
        payload.visibleWords = this.gameState.roundState.visibleWords;
        payload.revealedWordsCount = this.gameState.roundState.revealedWordsCount;
      } else if (this.gameState.gameMode === 'chaos') {
        // Modo caos: não precisa de payload especial, todos podem agir
        payload.visibleWords = this.gameState.roundState.visibleWords;
        payload.revealedWordsCount = this.gameState.roundState.revealedWordsCount;
      }
      
      this.socket.emit('game-broadcast', {
        roomId: this.roomId,
        event: 'game-started',
        payload,
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

    // Verificar se o jogador já está no time (permitir sair e entrar novamente)
    const isAlreadyInTeam = player.team === team;
    
    // Verificar se o time está cheio (máximo 2 jogadores)
    const targetTeam = this.gameState[team];
    if (!isAlreadyInTeam && targetTeam.length >= 2) {
      const teamName = team === 'team1' ? 'Azul' : 'Vermelho';
      alert(`O time ${teamName} está cheio! Máximo de 2 jogadores por time.`);
      return;
    }

    // Remover de qualquer time/status anterior
    if (player.team === 'spectator') {
      const index = this.gameState.spectators.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        this.gameState.spectators.splice(index, 1);
      }
    } else if (player.team && player.team !== team) {
      const previousTeam = this.gameState[player.team];
      const index = previousTeam.findIndex((p) => p.id === player.id);
      if (index !== -1) {
        previousTeam.splice(index, 1);
      }
    }

    // Adicionar ao novo time (se ainda não estiver)
    player.team = team;
    if (!targetTeam.find((p) => p.id === player.id)) {
      targetTeam.push(player);
    }

    this.saveGameState(); // Salvar após mudanças
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

    this.saveGameState(); // Salvar após mudanças
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
      
      let canStart = false;
      if (this.gameState.gameMode === 'classic') {
        canStart = isAdmin && this.gameState.team1.length === 2 && this.gameState.team2.length === 2;
      } else if (this.gameState.gameMode === 'freeForAll') {
        const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
        canStart = isAdmin && availablePlayers.length >= 2;
      } else if (this.gameState.gameMode === 'chaos') {
        const availablePlayers = this.gameState.players.filter(p => p.team !== 'spectator');
        canStart = isAdmin && availablePlayers.length >= 2;
      }
      
      startGameBtn.disabled = !canStart;
    }
  }

  private addPlayer(id: string, name: string, isAdmin: boolean = false, photo?: string) {
    // Verificar se já existe
    const existingPlayer = this.gameState.players.find((p) => p.id === id || p.name === name);
    if (existingPlayer) {
      // Atualizar informações do jogador existente
      existingPlayer.name = name;
      existingPlayer.isAdmin = isAdmin;
      if (photo !== undefined) {
        existingPlayer.photo = photo;
      }
      return;
    }
    
    const newPlayer: Player = {
      id,
      name,
      photo: photo,
      team: null,
      isAdmin: isAdmin,
    };

    this.gameState.players.push(newPlayer);
  }

  private updateDisplay() {
    if (!this.gameElement) return;

    // Salvar o foco atual no input do Caos antes de atualizar
    const chaosInput = this.gameElement.querySelector('#chaos-guess-input') as HTMLInputElement;
    const hadFocus = document.activeElement === chaosInput;
    const savedInputValue = chaosInput?.value || '';

    // Aplicar classe do tema
    const themeClass = this.getThemeClass();
    this.gameElement.className = `contexto-game ${themeClass}`.trim();

    // Recriar HTML completo
    this.gameElement.innerHTML = this.getGameHTML();
    
    // Reconfigurar listeners
    this.setupEventListeners();
    
    // Reconfigurar listeners do modo Caos após atualizar o display
    // Usar setTimeout para garantir que o HTML foi completamente renderizado
    if (this.gameState.gameMode === 'chaos' && this.gameState.isGameActive && !this.gameState.roundState.roundEnded) {
      setTimeout(() => {
        this.setupChaosListeners();
        this.updateChaosTimer();
        
        // Restaurar foco e valor do input se estava focado antes
        if (hadFocus) {
          const newChaosInput = this.gameElement?.querySelector('#chaos-guess-input') as HTMLInputElement;
          if (newChaosInput) {
            newChaosInput.value = savedInputValue;
            newChaosInput.focus();
          }
        }
      }, 50);
    }

    // Atualizar botão de iniciar
    if (!this.gameState.isGameActive) {
      this.updateStartButton();
    }
  }

  private processRoomPlayers(data: { players: Array<{ id: string; name: string; photo?: string; isAdmin?: boolean }>; adminId?: string | null }) {
    console.log('📥 Processando room-players:', data);
    console.log('📦 Payload completo:', JSON.stringify(data, null, 2));
    console.log('🔍 Tipo de adminId:', typeof data.adminId);
    console.log('🔍 Valor de adminId:', data.adminId);
    
    // Aguardar um pouco se socket.id não estiver disponível
    let currentPlayerId = this.socket?.id;
    if (!currentPlayerId) {
      console.warn('⚠️ socket.id não disponível imediatamente, aguardando...');
      // Tentar novamente após um pequeno delay
      setTimeout(() => {
        currentPlayerId = this.socket?.id;
        if (currentPlayerId) {
          console.log('✅ socket.id agora disponível:', currentPlayerId);
          this.processRoomPlayers(data); // Processar novamente
        } else {
          console.error('❌ socket.id ainda não disponível após aguardar');
        }
      }, 100);
      return;
    }
    
    console.log('🆔 ID do jogador atual:', currentPlayerId);
    console.log('👑 AdminId recebido:', data.adminId);
    console.log('✅ É admin?', String(currentPlayerId) === String(data.adminId));
    
    // Sempre processar, mesmo se players for undefined ou vazio
    const players = data.players || [];
    
    // Limpar TODOS os jogadores - vamos reconstruir a lista do zero
    this.gameState.players = [];
    this.gameState.team1 = [];
    this.gameState.team2 = [];
    this.gameState.spectators = [];
    
    // Adicionar jogadores da sala com informação de admin do servidor
    players.forEach((roomPlayer) => {
      const isAdmin = Boolean(roomPlayer.isAdmin || (data.adminId && String(roomPlayer.id) === String(data.adminId)));
      console.log(`➕ Adicionando jogador: ${roomPlayer.name} (${roomPlayer.id}), admin: ${isAdmin}`);
      this.addPlayer(roomPlayer.id, roomPlayer.name, isAdmin, roomPlayer.photo);
    });
    
    // Adicionar este jogador - verificar se é admin
    // Garantir que adminId seja processado corretamente
    const adminIdStr = data.adminId ? String(data.adminId).trim() : '';
    const currentPlayerIdStr = String(currentPlayerId).trim();
    const currentPlayerIsAdmin = adminIdStr !== '' && currentPlayerIdStr === adminIdStr;
    
    console.log(`➕ Adicionando jogador atual: ${this.playerName} (${currentPlayerIdStr})`);
    console.log(`🔍 AdminId recebido: "${adminIdStr}"`);
    console.log(`🔍 Comparação: "${currentPlayerIdStr}" === "${adminIdStr}" = ${currentPlayerIsAdmin}`);
    console.log(`👑 Este jogador é admin? ${currentPlayerIsAdmin}`);
    
    // Obter foto do jogador atual do localStorage
    let currentPlayerPhoto: string | undefined;
    try {
      const savedPhoto = localStorage.getItem('playerPhoto');
      if (savedPhoto) {
        currentPlayerPhoto = savedPhoto;
      }
    } catch (error) {
      console.warn('Erro ao obter foto do localStorage:', error);
    }
    
    this.addPlayer(currentPlayerId, this.playerName, currentPlayerIsAdmin, currentPlayerPhoto);
    
    // Verificar se há admin após adicionar todos
    let hasAdmin = this.gameState.players.some((p) => p.isAdmin);
    console.log('👑 Há admin na lista?', hasAdmin);
    
    // Se não há admin e há jogadores, definir o primeiro como admin (fallback)
    if (!hasAdmin && this.gameState.players.length > 0) {
      console.warn('⚠️ Nenhum admin encontrado! Definindo o primeiro jogador como admin (fallback)');
      this.gameState.players[0].isAdmin = true;
      hasAdmin = true;
      console.log(`✅ ${this.gameState.players[0].name} (${this.gameState.players[0].id}) agora é admin`);
    }
    
    console.log('📋 Lista de jogadores:', this.gameState.players.map(p => ({ name: p.name, id: p.id, isAdmin: p.isAdmin })));
    
    this.updateDisplay();
  }

  private saveGameState() {
    if (!this.roomId) return; // Só salvar se estiver em uma sala
    
    try {
      const stateToSave = {
        roomId: this.roomId,
        playerName: this.playerName,
        gameState: {
          ...this.gameState,
          // Não salvar referências de objetos complexos que não podem ser serializados
          roundState: {
            ...this.gameState.roundState,
            question: this.gameState.roundState.question ? {
              question: this.gameState.roundState.question.question,
              words: this.gameState.roundState.question.words,
              answer: this.gameState.roundState.question.answer,
            } : null,
          },
        },
        timestamp: Date.now(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('💾 Estado do jogo salvo no localStorage');
    } catch (error) {
      console.error('❌ Erro ao salvar estado do jogo:', error);
    }
  }

  private loadGameState(): { roomId: string; playerName: string; gameState: GameState } | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;
      
      const state = JSON.parse(saved);
      
      // Verificar se o estado não é muito antigo (mais de 1 hora)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        console.log('⏰ Estado salvo muito antigo, ignorando');
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      
      console.log('📂 Estado do jogo carregado do localStorage');
      return state;
    } catch (error) {
      console.error('❌ Erro ao carregar estado do jogo:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  private clearSavedState() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Estado salvo removido');
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Detectar desconexão
    this.socket.on('disconnect', (reason: string) => {
      console.log('⚠️ Desconectado do servidor:', reason);
      this.saveGameState(); // Salvar estado antes de desconectar
      this.showReconnectionMessage();
    });

    // Detectar reconexão
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('✅ Reconectado ao servidor após', attemptNumber, 'tentativas');
      this.reconnectAttempts = 0;
      this.hideReconnectionMessage();
      this.handleReconnection();
    });

    // Detectar tentativas de reconexão
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 Tentando reconectar... Tentativa', attemptNumber);
      this.reconnectAttempts = attemptNumber;
      this.showReconnectionMessage(attemptNumber);
    });

    // Detectar falha na reconexão
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Falha ao reconectar após várias tentativas');
      this.showReconnectionError();
    });

    // Listener para quando jogadores entram/saem da sala
    this.socket.on('player-joined', (data: { playerId: string; playerName: string; playerPhoto?: string; isAdmin?: boolean }) => {
      this.addPlayer(data.playerId, data.playerName, data.isAdmin || false, data.playerPhoto);
      this.saveGameState(); // Salvar após mudanças
      this.updateDisplay();
    });

    this.socket.on('player-left', (data: { playerId: string }) => {
      // Remover jogador
      this.gameState.players = this.gameState.players.filter((p) => p.id !== data.playerId);
      this.gameState.team1 = this.gameState.team1.filter((p) => p.id !== data.playerId);
      this.gameState.team2 = this.gameState.team2.filter((p) => p.id !== data.playerId);
      this.gameState.spectators = this.gameState.spectators.filter((p) => p.id !== data.playerId);
      
      this.saveGameState(); // Salvar após mudanças
      this.saveGameState(); // Salvar após mudanças
      this.updateDisplay();
    });

    this.socket.on('admin-changed', (data: { newAdminId: string; newAdminName: string }) => {
      // Remover admin de todos os jogadores
      this.gameState.players.forEach((p) => {
        p.isAdmin = p.id === data.newAdminId;
      });
      // Atualizar também nos times
      this.gameState.team1.forEach((p) => {
        p.isAdmin = p.id === data.newAdminId;
      });
      this.gameState.team2.forEach((p) => {
        p.isAdmin = p.id === data.newAdminId;
      });
      this.gameState.spectators.forEach((p) => {
        p.isAdmin = p.id === data.newAdminId;
      });
      
      this.updateDisplay();
    });

    this.socket.on('room-players', (data: { players: Array<{ id: string; name: string; photo?: string; isAdmin?: boolean }>; adminId?: string }) => {
      this.processRoomPlayers(data);
    });

    // Listener para atualização de nome/foto do jogador
    this.socket.on('player-name-updated', (data: { playerId: string; oldName: string; newName: string; newPhoto?: string }) => {
      const player = this.gameState.players.find((p) => p.id === data.playerId);
      if (player) {
        player.name = data.newName;
        if (data.newPhoto !== undefined) {
          player.photo = data.newPhoto;
        }
        // Atualizar também nos times
        const team1Player = this.gameState.team1.find((p) => p.id === data.playerId);
        if (team1Player) {
          team1Player.name = data.newName;
          if (data.newPhoto !== undefined) {
            team1Player.photo = data.newPhoto;
          }
        }
        const team2Player = this.gameState.team2.find((p) => p.id === data.playerId);
        if (team2Player) {
          team2Player.name = data.newName;
          if (data.newPhoto !== undefined) {
            team2Player.photo = data.newPhoto;
          }
        }
        const spectatorPlayer = this.gameState.spectators.find((p) => p.id === data.playerId);
        if (spectatorPlayer) {
          spectatorPlayer.name = data.newName;
          if (data.newPhoto !== undefined) {
            spectatorPlayer.photo = data.newPhoto;
          }
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
        case 'game-mode-selected':
          const { mode } = data.payload;
          if (mode && (mode === 'classic' || mode === 'freeForAll' || mode === 'chaos')) {
            this.gameState.gameMode = mode;
            this.updateDisplay();
            this.updateStartButton();
          }
          break;
        case 'score-limit-changed':
          const { scoreLimit } = data.payload;
          if (scoreLimit && scoreLimit > 0) {
            this.gameState.scoreLimit = scoreLimit;
            this.saveGameState();
            this.updateDisplay();
          }
          break;
        case 'game-ended':
          const { winnerId, winnerName, winnerScore, reason } = data.payload;
          if (reason === 'score-limit') {
            this.gameState.gameEnded = true;
            this.gameState.winner = {
              id: winnerId,
              name: winnerName,
              score: winnerScore
            };
            this.saveGameState();
            this.updateDisplay();
          }
          break;
        case 'teams-randomized':
          const { team1: randomizedTeam1, team2: randomizedTeam2 } = data.payload;
          
          // Limpar times atuais
          this.gameState.team1 = [];
          this.gameState.team2 = [];
          
          // Atualizar times dos jogadores
          randomizedTeam1.forEach((teamPlayer: { id: string; name: string }) => {
            const player = this.gameState.players.find((p) => p.id === teamPlayer.id || p.name === teamPlayer.name);
            if (player) {
              player.team = 'team1';
              if (!this.gameState.team1.find((p) => p.id === player.id)) {
                this.gameState.team1.push(player);
              }
            }
          });
          
          randomizedTeam2.forEach((teamPlayer: { id: string; name: string }) => {
            const player = this.gameState.players.find((p) => p.id === teamPlayer.id || p.name === teamPlayer.name);
            if (player) {
              player.team = 'team2';
              if (!this.gameState.team2.find((p) => p.id === player.id)) {
                this.gameState.team2.push(player);
              }
            }
          });
          
          // Remover jogadores que não estão mais em times
          this.gameState.players.forEach((player) => {
            if (player.team !== 'team1' && player.team !== 'team2' && player.team !== 'spectator') {
              player.team = null;
            }
          });
          
          this.saveGameState();
          this.updateDisplay();
          this.updateStartButton();
          break;
        case 'game-started':
        case 'round-started':
          const { currentTeam, currentPlayerId, question, gameMode, visibleWords: ffaVisibleWords, nextRevealPlayerId: ffaNextRevealId, revealedWordsCount: ffaRevealedCount, playerScores } = data.payload;
          this.gameState.isGameActive = true;
          if (gameMode) {
            this.gameState.gameMode = gameMode;
          }
          const modeConfig = this.gameState.gameMode ? GAME_MODES[this.gameState.gameMode] : GAME_MODES.classic;
          
          if (gameMode === 'freeForAll') {
            // Modo todos contra todos
            this.gameState.roundState = {
              currentTeam: null,
              currentPlayerId: null,
              question,
              visibleWords: ffaVisibleWords || Array.from({ length: modeConfig.maxWords }, () => false),
              guess: '',
              points: 0,
              roundStarted: true,
              roundEnded: false,
              revealedWordsCount: ffaRevealedCount || 0,
              nextRevealPlayerId: ffaNextRevealId || null,
            };
            // Atualizar pontuações individuais
            if (playerScores) {
              playerScores.forEach(([id, score]: [string, number]) => {
                this.gameState.playerScores.set(id, score);
              });
            }
          } else {
            // Modo clássico
            this.gameState.roundState = {
              currentTeam,
              currentPlayerId,
              question,
              visibleWords: Array.from({ length: modeConfig.maxWords }, () => true),
              guess: '',
              points: 0,
              roundStarted: false,
              roundEnded: false,
              revealedWordsCount: 0,
              nextRevealPlayerId: null,
            };
          }
          this.saveGameState();
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
          this.saveGameState();
          this.updateDisplay();
          break;
        case 'word-revealed':
          const { wordIndex: _wordIndex, visibleWords: newVisibleWords, revealedWordsCount, nextRevealPlayerId } = data.payload;
          this.gameState.roundState.visibleWords = newVisibleWords;
          this.gameState.roundState.revealedWordsCount = revealedWordsCount;
          this.gameState.roundState.nextRevealPlayerId = nextRevealPlayerId;
          this.saveGameState();
          this.updateDisplay();
          break;
        case 'chaos-word-revealed':
          const { wordIndex: chaosWordIndex, visibleWords: chaosVisibleWords, revealedWordsIndices, lastRevealTime: chaosLastRevealTime } = data.payload;
          this.gameState.roundState.visibleWords = chaosVisibleWords;
          this.gameState.roundState.revealedWordsIndices = revealedWordsIndices;
          this.gameState.roundState.revealedWordsCount = revealedWordsIndices?.length || 0;
          this.gameState.roundState.lastRevealTime = chaosLastRevealTime;
          this.saveGameState();
          this.updateDisplay();
          this.updateChaosTimer();
          break;
        case 'free-for-all-guess':
          const { playerId: _guessPlayerId, playerName: _guessPlayerName, guess: ffaGuess, isCorrect: _ffaIsCorrect, points: ffaPoints, playerScores: newPlayerScores } = data.payload;
          this.gameState.roundState.guess = ffaGuess;
          this.gameState.roundState.roundEnded = true;
          // Atualizar pontuações individuais (tanto para acerto quanto erro)
          if (newPlayerScores) {
            newPlayerScores.forEach(([id, score]: [string, number]) => {
              this.gameState.playerScores.set(id, score);
            });
          }
          this.gameState.roundState.points = ffaPoints;
          this.saveGameState();
          this.updateDisplay();
          break;
        case 'chaos-guess':
          const { guess: chaosGuessData, isCorrect: chaosIsCorrect } = data.payload;
          if (chaosGuessData) {
            if (!this.gameState.roundState.chaosGuesses) {
              this.gameState.roundState.chaosGuesses = [];
            }
            // Verificar se já existe
            const exists = this.gameState.roundState.chaosGuesses.some(
              g => g.playerId === chaosGuessData.playerId && g.timestamp === chaosGuessData.timestamp
            );
            if (!exists) {
              this.gameState.roundState.chaosGuesses.push(chaosGuessData);
            }
            
            // Se está correto e tem order/points, significa que já foi processado pelo jogador que acertou
            if (chaosIsCorrect && chaosGuessData.isCorrect && chaosGuessData.order) {
              // Já foi processado pelo jogador que acertou, apenas atualizar pontuações localmente
              if (!this.gameState.roundState.correctGuesses) {
                this.gameState.roundState.correctGuesses = [];
              }
              const alreadyInList = this.gameState.roundState.correctGuesses.some(
                g => g.playerId === chaosGuessData.playerId
              );
              if (!alreadyInList) {
                this.gameState.roundState.correctGuesses.push(chaosGuessData);
              // Atualizar pontuação
              const currentScore = this.gameState.playerScores.get(chaosGuessData.playerId) || 0;
                const newScore = currentScore + (chaosGuessData.points || 0);
                this.gameState.playerScores.set(chaosGuessData.playerId, newScore);
                
                // Verificar se atingiu a pontuação limite
                if (this.gameState.scoreLimit && newScore >= this.gameState.scoreLimit) {
                  this.gameState.gameEnded = true;
                  this.gameState.winner = {
                    id: chaosGuessData.playerId,
                    name: chaosGuessData.playerName,
                    score: newScore
                  };
                  this.saveGameState();
                  this.updateDisplay();
                  return;
                }
            }
            
            // Verificar se a rodada deve terminar (todos acertaram ou todas palavras reveladas)
              if (this.gameState.gameMode === 'chaos' && !this.gameState.roundState.roundEnded) {
                this.checkChaosRoundEnd();
              }
            }
          }
          this.saveGameState();
          this.updateDisplay();
          
          // Fazer scroll do chat
          setTimeout(() => {
            const chatMessages = this.gameElement?.querySelector('#chaos-chat-messages');
            if (chatMessages) {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          }, 100);
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

  private showReconnectionMessage(attemptNumber?: number) {
    if (!this.gameElement) return;
    
    let message = '🔄 Reconectando...';
    if (attemptNumber) {
      message = `🔄 Reconectando... (Tentativa ${attemptNumber})`;
    }
    
    // Remover mensagem anterior se existir
    const existingMsg = this.gameElement.querySelector('.reconnection-message');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'reconnection-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff9800;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      animation: pulse 1.5s infinite;
    `;
    
    // Adicionar animação CSS
    if (!document.querySelector('#reconnection-styles')) {
      const style = document.createElement('style');
      style.id = 'reconnection-styles';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
  }

  private hideReconnectionMessage() {
    const message = document.querySelector('.reconnection-message');
    if (message) {
      message.remove();
    }
  }

  private showReconnectionError() {
    if (!this.gameElement) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'reconnection-error';
    messageDiv.innerHTML = `
      <div style="text-align: center;">
        <p style="margin-bottom: 1rem;">❌ Falha ao reconectar</p>
        <button id="reconnect-manual-btn" style="
          padding: 0.5rem 1.5rem;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">Tentar Novamente</button>
      </div>
    `;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #f44336;
      color: white;
      padding: 1.5rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      min-width: 300px;
    `;
    
    document.body.appendChild(messageDiv);
    
    // Botão de reconexão manual
    const reconnectBtn = messageDiv.querySelector('#reconnect-manual-btn');
    reconnectBtn?.addEventListener('click', () => {
      if (this.socket) {
        this.socket.connect();
        messageDiv.remove();
      }
    });
  }

  private handleReconnection() {
    if (!this.socket || !this.roomId) return;
    
    console.log('🔄 Processando reconexão...');
    
    // Carregar estado salvo
    const savedState = this.loadGameState();
    
    if (savedState && savedState.roomId === this.roomId) {
      console.log('📂 Restaurando estado salvo...');
      
      // Restaurar estado do jogo (mas não sobrescrever com dados antigos se o jogo já está ativo)
      if (!this.gameState.isGameActive && savedState.gameState.isGameActive) {
        // Se o jogo estava ativo quando desconectou, restaurar
        this.gameState = savedState.gameState;
        console.log('✅ Estado do jogo restaurado');
      }
      
      // Reentrar na sala
      console.log(`🚪 Reentrando na sala ${this.roomId}...`);
      this.socket.emit('join-room', this.roomId, this.playerName);
      
      // Aguardar um pouco e então sincronizar com o servidor
      setTimeout(() => {
        // O servidor enviará room-players automaticamente
        // Mas podemos também solicitar sincronização se necessário
        console.log('✅ Reconexão completa');
      }, 500);
    } else {
      // Se não há estado salvo ou a sala mudou, apenas reentrar
      console.log(`🚪 Reentrando na sala ${this.roomId}...`);
      this.socket.emit('join-room', this.roomId, this.playerName);
    }
    
    // Salvar estado após reconexão
    this.saveGameState();
  }

  public destroy() {
    // Parar timer do modo Caos
    this.stopChaosAutoReveal();
    // Salvar estado antes de destruir
    this.saveGameState();
    
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
