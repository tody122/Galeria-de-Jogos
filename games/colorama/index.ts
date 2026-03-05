type Socket = any;

interface GameConfig {
  container: HTMLElement;
  socket: Socket | null;
  roomId?: string;
  playerName?: string;
}

interface PlayerInfo {
  id: string;
  name: string;
  photo?: string;
  isAdmin?: boolean;
}

type Phase = 'lobby' | 'clue-input' | 'guessing' | 'scoring' | 'game-over';

interface Guess {
  row: number;
  col: number;
  timestamp?: number;
}

interface GameState {
  phase: Phase;
  round: number;
  scores: Map<string, number>;
  players: PlayerInfo[];
  adminId: string | null;
  secretCell: { row: number; col: number } | null;
  clueText: string;
  guesses: Record<string, Guess>;
  roundScores: Record<string, number>;
  clueGiverPoints: number;
  maxPoints: number | null;
  roundTimeSeconds: number | null;
  roundStartTime: number;
  gameEnded: boolean;
  winner: { id: string; name: string; score: number } | null;
}

import {
  GRID_ROWS,
  GRID_COLS,
  getColorAt,
  getSecretCellForRound,
  pointsForGuess,
  isIn3x3Area,
} from './colors';

/** Cor da célula secreta (sempre igual à do tabuleiro). */
function getSecretColor(secret: { row: number; col: number }): string {
  return getColorAt(secret.row, secret.col);
}

export default class ColoramaGame {
  private container: HTMLElement;
  private socket: Socket | null;
  private roomId: string | undefined;
  private playerName: string;
  private gameElement: HTMLElement | null = null;
  private gameState: GameState;
  private roundTimerId: number | null = null;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.playerName = config.playerName || 'Jogador';
    this.gameState = {
      phase: 'lobby',
      round: 0,
      scores: new Map(),
      players: [],
      adminId: null,
      secretCell: null,
      clueText: '',
      guesses: {},
      roundScores: {},
      clueGiverPoints: 0,
      maxPoints: null,
      roundTimeSeconds: null,
      roundStartTime: 0,
      gameEnded: false,
      winner: null,
    };
    this.init();
  }

  private init() {
    this.gameElement = document.createElement('div');
    this.gameElement.className = 'colorama-game';
    this.container.appendChild(this.gameElement);

    if (this.socket && this.roomId) {
      this.setupSocketListeners();
      this.socket.emit('join-room', this.roomId, this.playerName);
    } else {
      this.gameState.players = [{ id: 'local', name: this.playerName, isAdmin: true }];
      this.gameState.adminId = 'local';
      this.gameState.phase = 'lobby';
    }

    this.updateDisplay();
  }

  private addPlayer(id: string, name: string, isAdmin: boolean = false, photo?: string) {
    const existing = this.gameState.players.find((p) => p.id === id || p.name === name);
    if (existing) {
      existing.name = name;
      existing.isAdmin = isAdmin;
      if (photo !== undefined) existing.photo = photo;
      return;
    }
    this.gameState.players.push({ id, name, photo, isAdmin });
  }

  private processRoomPlayers(data: { players: PlayerInfo[]; adminId?: string | null }) {
    const players = data.players || [];
    const adminIdStr = data.adminId ? String(data.adminId).trim() : '';
    this.gameState.players = [];
    players.forEach((p) => {
      this.addPlayer(p.id, p.name, adminIdStr !== '' && String(p.id) === adminIdStr, p.photo);
    });
    this.gameState.adminId = data.adminId ?? null;
    const me = this.socket?.id;
    if (me && !this.gameState.players.some((p) => p.id === me)) {
      this.addPlayer(me, this.playerName, me === this.gameState.adminId);
    }
    if (!this.gameState.players.some((p) => p.isAdmin) && this.gameState.players.length > 0) {
      this.gameState.players[0].isAdmin = true;
      this.gameState.adminId = this.gameState.players[0].id;
    }
    this.updateDisplay();
  }

  private getClueGiverId(): string | null {
    if (this.gameState.players.length === 0) return null;
    const index = this.gameState.round % this.gameState.players.length;
    return this.gameState.players[index].id;
  }

  private getClueGiverName(): string {
    const id = this.getClueGiverId();
    const p = this.gameState.players.find((x) => x.id === id);
    return p?.name || 'Jogador';
  }

  private isClueGiver(): boolean {
    if (!this.socket) return this.getClueGiverId() === 'local';
    return this.socket.id === this.getClueGiverId();
  }

  private countGuessesFromNonClueGivers(): number {
    const clueGiverId = this.getClueGiverId();
    return Object.keys(this.gameState.guesses).filter((id) => id !== clueGiverId).length;
  }

  private allHaveGuessed(): boolean {
    const clueGiverId = this.getClueGiverId();
    const guessers = this.gameState.players.filter((p) => p.id !== clueGiverId);
    return guessers.length > 0 && guessers.every((p) => this.gameState.guesses[p.id] != null);
  }

  private computeScoring() {
    const secret = this.gameState.secretCell;
    if (!secret) return;
    this.gameState.roundScores = {};
    this.gameState.clueGiverPoints = 0;
    const clueGiverId = this.getClueGiverId();

    const pointsForClueGiverByOrder = [5, 4, 3, 2, 1];

    const in3x3 = Object.entries(this.gameState.guesses)
      .filter(([pid, g]) => pid !== clueGiverId && isIn3x3Area(g.row, g.col, secret.row, secret.col))
      .sort(([, a], [, b]) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    let clueGiverPts = 0;
    in3x3.forEach((_, index) => {
      clueGiverPts += index < pointsForClueGiverByOrder.length
        ? pointsForClueGiverByOrder[index]
        : 1;
    });
    this.gameState.clueGiverPoints = clueGiverPts;

    for (const [playerId, guess] of Object.entries(this.gameState.guesses)) {
      if (playerId === clueGiverId) continue;
      const pts = pointsForGuess(guess.row, guess.col, secret.row, secret.col);
      this.gameState.roundScores[playerId] = pts;
      const prev = this.gameState.scores.get(playerId) || 0;
      this.gameState.scores.set(playerId, prev + pts);
    }

    const prevClue = this.gameState.scores.get(clueGiverId || '') || 0;
    this.gameState.scores.set(clueGiverId || '', prevClue + this.gameState.clueGiverPoints);
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('room-players', (data: { players: PlayerInfo[]; adminId?: string }) => {
      if (!this.socket?.id) {
        setTimeout(() => this.processRoomPlayers(data), 150);
        return;
      }
      this.processRoomPlayers(data);
    });

    this.socket.on('player-joined', (data: { playerId: string; playerName: string; playerPhoto?: string; isAdmin?: boolean }) => {
      this.addPlayer(data.playerId, data.playerName, data.isAdmin || false, data.playerPhoto);
      this.updateDisplay();
    });

    this.socket.on('player-left', (data: { playerId: string }) => {
      this.gameState.players = this.gameState.players.filter((p) => p.id !== data.playerId);
      this.updateDisplay();
    });

    this.socket.on('admin-changed', (data: { newAdminId: string; newAdminName: string }) => {
      this.gameState.adminId = data.newAdminId;
      this.gameState.players.forEach((p) => { p.isAdmin = p.id === data.newAdminId; });
      this.updateDisplay();
    });

    this.socket.on('game-message', (data: { event: string; payload: any; from: string; fromName?: string }) => {
      const fromName = data.fromName || 'Jogador';
      switch (data.event) {
        case 'start-game':
          this.gameState.phase = 'clue-input';
          this.gameState.round = 0;
          this.gameState.scores = new Map();
          this.gameState.secretCell = getSecretCellForRound(0);
          this.gameState.clueText = '';
          this.gameState.guesses = {};
          this.gameState.gameEnded = false;
          this.gameState.winner = null;
          const mp = data.payload?.maxPoints;
          const rt = data.payload?.roundTimeSeconds;
          this.gameState.maxPoints = typeof mp === 'number' && mp >= 1 && mp <= 300 ? mp : 80;
          this.gameState.roundTimeSeconds = typeof rt === 'number' && rt >= 10 ? rt : null;
          this.updateDisplay();
          break;
        case 'clue-submitted':
          this.gameState.clueText = data.payload?.clueText ?? '';
          this.gameState.phase = 'guessing';
          this.gameState.roundStartTime = Date.now();
          this.clearRoundTimer();
          if (this.gameState.roundTimeSeconds != null) this.startRoundTimer();
          this.updateDisplay();
          break;
        case 'guess':
          const { playerId, row, col, timestamp } = data.payload || {};
          if (playerId != null && typeof row === 'number' && typeof col === 'number') {
            this.gameState.guesses[playerId] = { row, col, timestamp: typeof timestamp === 'number' ? timestamp : Date.now() };
            if (this.allHaveGuessed()) {
              this.clearRoundTimer();
              this.gameState.phase = 'scoring';
              this.computeScoring();
              this.checkGameEnd();
            }
            this.updateDisplay();
          }
          break;
        case 'time-up':
          if (this.gameState.phase === 'guessing') {
            this.clearRoundTimer();
            this.gameState.phase = 'scoring';
            this.computeScoring();
            this.checkGameEnd();
            this.updateDisplay();
          }
          break;
        case 'game-ended':
          this.gameState.phase = 'game-over';
          this.gameState.gameEnded = true;
          this.gameState.winner = data.payload?.winner ?? null;
          this.updateDisplay();
          break;
        case 'next-round':
          const nextRound = data.payload?.round;
          if (typeof nextRound !== 'number' || nextRound !== this.gameState.round + 1) return;
          this.clearRoundTimer();
          this.gameState.round = nextRound;
          this.gameState.secretCell = getSecretCellForRound(nextRound);
          this.gameState.clueText = '';
          this.gameState.guesses = {};
          this.gameState.phase = 'clue-input';
          this.updateDisplay();
          break;
      }
    });
  }

  private isAdmin(): boolean {
    if (!this.socket) return this.gameState.adminId === 'local';
    return this.socket.id === this.gameState.adminId;
  }

  private clearRoundTimer() {
    if (this.roundTimerId != null) {
      clearInterval(this.roundTimerId);
      this.roundTimerId = null;
    }
  }

  private startRoundTimer() {
    const sec = this.gameState.roundTimeSeconds;
    if (sec == null) return;
    this.roundTimerId = window.setInterval(() => {
      const elapsed = (Date.now() - this.gameState.roundStartTime) / 1000;
      if (elapsed >= sec) {
        this.clearRoundTimer();
        if (this.socket && this.roomId && this.gameState.phase === 'guessing') {
          this.socket.emit('game-broadcast', { roomId: this.roomId, event: 'time-up', payload: {} });
        }
      } else {
        this.updateDisplay();
      }
    }, 1000);
  }

  private checkGameEnd() {
    const max = this.gameState.maxPoints;
    if (max == null) return;
    for (const p of this.gameState.players) {
      const score = this.gameState.scores.get(p.id) || 0;
      if (score >= max) {
        this.gameState.gameEnded = true;
        this.gameState.winner = { id: p.id, name: p.name, score };
        this.gameState.phase = 'game-over';
        if (this.socket && this.roomId) {
          this.socket.emit('game-broadcast', {
            roomId: this.roomId,
            event: 'game-ended',
            payload: { winner: this.gameState.winner },
          });
        }
        return;
      }
    }
  }

  private getGameHTML(): string {
    if (this.gameState.phase === 'lobby') return this.getLobbyHTML();
    if (this.gameState.phase === 'game-over') return this.getGameOverHTML();
    if (this.gameState.phase === 'clue-input') return this.getClueInputHTML();
    if (this.gameState.phase === 'guessing') return this.getGuessingHTML();
    if (this.gameState.phase === 'scoring') return this.getScoringHTML();
    return this.getLobbyHTML();
  }

  private getLobbyHTML(): string {
    const canStart = this.isAdmin() && this.gameState.players.length >= 2;
    const isAdmin = this.isAdmin();
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="colorama-subtitle">Baseado em Hues and Cues. Um jogador recebe uma cor e dá uma dica; os outros apostam no gradiente. Pontos por proximidade!</p>
        </div>
        <div class="colorama-lobby">
          <p class="colorama-players-count">Jogadores na sala: ${this.gameState.players.length} (mínimo 2)</p>
          <ul class="colorama-players-list">
            ${this.gameState.players.map((p) => `<li>${escapeHtml(p.name)}${p.isAdmin ? ' 👑' : ''}</li>`).join('')}
          </ul>
          ${isAdmin ? `
          <div class="colorama-lobby-options">
            <div class="colorama-option-row">
              <label class="colorama-option-label">Pontos máximos (quem atingir termina o jogo)</label>
              <div class="colorama-option-inputs">
                <input type="number" id="colorama-max-points" class="colorama-input-num" min="1" max="300" value="80" />
                <span class="colorama-option-unit">pts</span>
              </div>
            </div>
            <div class="colorama-option-row">
              <label class="colorama-option-label">Tempo por rodada (fase de palpite)</label>
              <div class="colorama-option-inputs">
                <input type="number" id="colorama-round-time" class="colorama-input-num" min="10" max="300" placeholder="segundos" value="90" />
                <span class="colorama-option-unit">segundos</span>
                <label class="colorama-check-label"><input type="checkbox" id="colorama-round-time-disabled" /> Desabilitar tempo</label>
              </div>
            </div>
          </div>
          ` : ''}
          ${canStart ? '<button type="button" class="colorama-btn colorama-btn-primary" id="colorama-start-btn">Iniciar jogo</button>' : this.gameState.players.length < 2 ? '<p class="colorama-waiting">Aguarde mais jogadores para começar (mín. 2).</p>' : '<p class="colorama-waiting">Aguardando o administrador iniciar o jogo...</p>'}
        </div>
      </div>
    `;
  }

  private getGameOverHTML(): string {
    const w = this.gameState.winner;
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="colorama-round">Fim de jogo!</p>
        </div>
        <div class="colorama-game-over">
          <p class="colorama-winner-msg">🏆 <strong>${w ? escapeHtml(w.name) : '—'}</strong> venceu com <strong>${w?.score ?? 0}</strong> pontos!</p>
          <div class="colorama-scoreboard">
            <h3>Placar final</h3>
            <ul class="colorama-scores-list">
              ${this.gameState.players.map((p) => `<li>${escapeHtml(p.name)}: <strong>${this.gameState.scores.get(p.id) || 0}</strong> pts</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  private getClueInputHTML(): string {
    const secret = this.gameState.secretCell;
    if (!secret) return '<div class="colorama-container"><p>Carregando...</p></div>';
    const hex = getSecretColor(secret);
    const isCueGiver = this.isClueGiver();
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="colorama-round">Rodada ${this.gameState.round + 1} ${isCueGiver ? '— Sua vez de dar a dica!' : ''}</p>
        </div>
        <div class="colorama-clue-phase">
          ${isCueGiver
      ? `
            <p class="colorama-prompt">Esta é a cor secreta. Digite uma dica para os outros jogadores (ex.: "céu ao entardecer", "folha seca"):</p>
            <div class="colorama-swatch colorama-secret-swatch" style="background-color: ${hex};"></div>
            <div class="colorama-clue-input-wrap">
              <input type="text" id="colorama-clue-input" class="colorama-clue-input" placeholder="Sua dica..." maxlength="80" />
              <button type="button" class="colorama-btn colorama-btn-primary" id="colorama-clue-submit">Enviar dica</button>
            </div>`
      : `<p class="colorama-waiting">Aguardando <strong>${escapeHtml(this.getClueGiverName())}</strong> dar a dica...</p>`}
        </div>
        <div class="colorama-scoreboard">
          <h3>Placar</h3>
          <ul class="colorama-scores-list">
            ${this.gameState.players.map((p) => `<li>${escapeHtml(p.name)}: <strong>${this.gameState.scores.get(p.id) || 0}</strong> pts</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  private getGridHTML(clickable: boolean, highlightSecret?: { row: number; col: number }, showGuesses?: Record<string, Guess>): string {
    let html = `<div class="colorama-grid-wrap" style="--colorama-cols: ${GRID_COLS}; --colorama-rows: ${GRID_ROWS};"><table class="colorama-grid"><tbody>`;
    for (let r = 0; r < GRID_ROWS; r++) {
      html += '<tr>';
      for (let c = 0; c < GRID_COLS; c++) {
        const hex = getColorAt(r, c);
        const isSecret = highlightSecret && highlightSecret.row === r && highlightSecret.col === c;
        const guessersHere = showGuesses
          ? Object.entries(showGuesses)
              .filter(([, g]) => g.row === r && g.col === c)
              .map(([pid]) => this.gameState.players.find((p) => p.id === pid)?.name || 'Jogador')
              .filter(Boolean)
          : [];
        const title = guessersHere.length ? guessersHere.join(', ') : '';
        html += `<td class="colorama-cell ${clickable ? 'colorama-cell-clickable' : ''} ${isSecret ? 'colorama-cell-secret' : ''}" 
          style="background-color:${hex};" 
          data-row="${r}" data-col="${c}"
          title="${escapeHtml(title)}">`;
        if (showGuesses && guessersHere.length) {
          html += `<span class="colorama-cell-pins">${guessersHere.map((name) => `<span class="colorama-pin-name">📌 ${escapeHtml(name)}</span>`).join('')}</span>`;
        }
        html += '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  private getGuessingHTML(): string {
    const isCueGiver = this.isClueGiver();
    const alreadyGuessed = this.socket ? this.gameState.guesses[this.socket.id] : this.gameState.guesses['local'];
    const rt = this.gameState.roundTimeSeconds;
    const remaining = rt != null ? Math.max(0, rt - Math.floor((Date.now() - this.gameState.roundStartTime) / 1000)) : null;
    const timerHtml = rt != null
      ? `<p class="colorama-timer">⏱️ Tempo: <strong>${remaining}s</strong>${remaining === 0 ? ' (encerrando...)' : ''}</p>`
      : '';
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="colorama-round">Rodada ${this.gameState.round + 1}</p>
        </div>
        <div class="colorama-clue-highlight">
          <span class="colorama-clue-label">💡 Dica</span>
          <p class="colorama-clue-display">${escapeHtml(this.gameState.clueText || '—')}</p>
          <span class="colorama-clue-author">por ${escapeHtml(this.getClueGiverName())}</span>
        </div>
        ${timerHtml}
        ${isCueGiver
      ? '<p class="colorama-waiting">Aguardando os outros jogadores colocarem seus palpites no gradiente...</p>'
      : alreadyGuessed
        ? '<p class="colorama-prompt">Você já colocou seu palpite. Aguardando os demais.</p>'
        : '<p class="colorama-prompt">Clique em uma cor do gradiente para seu palpite:</p>'}
        ${this.getGridHTML(!isCueGiver && !alreadyGuessed)}
        <p class="colorama-guess-status">Palpites: ${this.countGuessesFromNonClueGivers()} / ${Math.max(0, this.gameState.players.length - 1)}</p>
        <div class="colorama-scoreboard">
          <h3>Placar</h3>
          <ul class="colorama-scores-list">
            ${this.gameState.players.map((p) => `<li>${escapeHtml(p.name)}: <strong>${this.gameState.scores.get(p.id) || 0}</strong> pts</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  private getScoringHTML(): string {
    const secret = this.gameState.secretCell;
    if (!secret) return '<div class="colorama-container"><p>Carregando...</p></div>';
    const hex = getSecretColor(secret);
    const clueGiverId = this.getClueGiverId();
    const roundBreakdown = this.gameState.players
      .filter((p) => p.id !== clueGiverId)
      .map((p) => {
        const pts = this.gameState.roundScores[p.id] ?? 0;
        return `<li>${escapeHtml(p.name)}: ${pts} pts (esta rodada)</li>`;
      })
      .join('');
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="colorama-round">Rodada ${this.gameState.round + 1} — Resultado</p>
        </div>
        <div class="colorama-result">
          <p class="colorama-result-label">Cor secreta:</p>
          <div class="colorama-swatch colorama-swatch-result" style="background-color: ${hex};"></div>
          <p class="colorama-result-detail">${escapeHtml(this.getClueGiverName())} ganhou <strong>${this.gameState.clueGiverPoints} pt(s)</strong> (5 pts pelo 1º na área 3×3, 4 pelo 2º, 3 pelo 3º, 2 pelo 4º, 1 pelo 5º e seguintes).</p>
          <ul class="colorama-round-scores">${roundBreakdown}</ul>
          <button type="button" class="colorama-btn colorama-btn-primary" id="colorama-next-btn">Próxima rodada</button>
        </div>
        <p class="colorama-grid-caption">Onde cada um apostou:</p>
        ${this.getGridHTML(false, secret, this.gameState.guesses)}
        <div class="colorama-scoreboard">
          <h3>Placar total</h3>
          <ul class="colorama-scores-list">
            ${this.gameState.players.map((p) => `<li>${escapeHtml(p.name)}: <strong>${this.gameState.scores.get(p.id) || 0}</strong> pts</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    if (!this.gameElement) return;

    const startBtn = this.gameElement.querySelector('#colorama-start-btn');
    startBtn?.addEventListener('click', () => {
      const maxPointsInput = this.gameElement?.querySelector('#colorama-max-points') as HTMLInputElement;
      const roundTimeDisabled = this.gameElement?.querySelector('#colorama-round-time-disabled') as HTMLInputElement;
      const roundTimeInput = this.gameElement?.querySelector('#colorama-round-time') as HTMLInputElement;
      let maxPoints = 80;
      if (maxPointsInput) {
        const v = parseInt(maxPointsInput.value, 10);
        if (v >= 1 && v <= 300) maxPoints = v;
      }
      let roundTimeSeconds: number | null = 90;
      if (roundTimeInput && !roundTimeDisabled?.checked) {
        const v = parseInt(roundTimeInput.value, 10);
        if (v >= 10 && v <= 300) roundTimeSeconds = v;
      } else if (roundTimeDisabled?.checked) {
        roundTimeSeconds = null;
      }
      const payload: { maxPoints: number; roundTimeSeconds?: number | null } = { maxPoints };
      if (roundTimeSeconds != null) payload.roundTimeSeconds = roundTimeSeconds;
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'start-game',
          payload,
        });
      }
      this.gameState.maxPoints = maxPoints;
      this.gameState.roundTimeSeconds = roundTimeSeconds;
      this.gameState.phase = 'clue-input';
      this.gameState.round = 0;
      this.gameState.scores = new Map();
      this.gameState.secretCell = getSecretCellForRound(0);
      this.gameState.clueText = '';
      this.gameState.guesses = {};
      this.gameState.gameEnded = false;
      this.gameState.winner = null;
      this.updateDisplay();
    });

    const clueSubmit = this.gameElement.querySelector('#colorama-clue-submit');
    const clueInput = this.gameElement.querySelector('#colorama-clue-input') as HTMLInputElement;
    clueSubmit?.addEventListener('click', () => {
      const text = clueInput?.value?.trim() || '';
      if (!text) return;
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'clue-submitted',
          payload: { clueText: text },
        });
      }
      this.gameState.clueText = text;
      this.gameState.phase = 'guessing';
      this.gameState.roundStartTime = Date.now();
      this.clearRoundTimer();
      if (this.gameState.roundTimeSeconds != null) this.startRoundTimer();
      this.updateDisplay();
    });

    clueInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') (this.gameElement?.querySelector('#colorama-clue-submit') as HTMLElement)?.click();
    });

    const nextBtn = this.gameElement.querySelector('#colorama-next-btn');
    nextBtn?.addEventListener('click', () => {
      const nextRound = this.gameState.round + 1;
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'next-round',
          payload: { round: nextRound },
        });
      }
      this.gameState.round = nextRound;
      this.gameState.secretCell = getSecretCellForRound(nextRound);
      this.gameState.clueText = '';
      this.gameState.guesses = {};
      this.gameState.phase = 'clue-input';
      this.updateDisplay();
    });

    const grid = this.gameElement.querySelector('.colorama-grid');
    grid?.addEventListener('click', (e) => {
      const cell = (e.target as HTMLElement).closest('.colorama-cell-clickable');
      if (!cell || this.gameState.phase !== 'guessing') return;
      if (this.isClueGiver()) return;
      const row = parseInt((cell as HTMLElement).getAttribute('data-row') ?? '', 10);
      const col = parseInt((cell as HTMLElement).getAttribute('data-col') ?? '', 10);
      if (isNaN(row) || isNaN(col)) return;
      const myId = this.socket?.id ?? 'local';
      if (this.gameState.guesses[myId]) return;
      const ts = Date.now();
      if (this.socket && this.roomId) {
        this.socket.emit('game-broadcast', {
          roomId: this.roomId,
          event: 'guess',
          payload: { playerId: myId, playerName: this.playerName, row, col, timestamp: ts },
        });
      }
      this.gameState.guesses[myId] = { row, col, timestamp: ts };
      this.updateDisplay();
    });
  }

  private updateDisplay() {
    if (!this.gameElement) return;
    this.gameElement.innerHTML = this.getGameHTML();
    this.bindEvents();
  }

  public setRoomId(roomId: string) {
    this.roomId = roomId;
    if (this.socket && roomId) {
      this.socket.emit('join-room', roomId, this.playerName);
    }
  }

  public setPlayerName(playerName: string) {
    this.playerName = playerName;
  }

  public destroy() {
    this.clearRoundTimer();
    if (this.socket) {
      this.socket.off('room-players');
      this.socket.off('player-joined');
      this.socket.off('player-left');
      this.socket.off('admin-changed');
      this.socket.off('game-message');
    }
    if (this.gameElement?.parentNode) {
      this.gameElement.parentNode.removeChild(this.gameElement);
    }
    this.gameElement = null;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
