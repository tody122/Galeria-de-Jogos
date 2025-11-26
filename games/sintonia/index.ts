// Sintonia - Em desenvolvimento
// Este jogo será desenvolvido no futuro

interface GameConfig {
  container: HTMLElement;
  socket?: any;
  roomId?: string;
  playerName: string;
}

export default class SintoniaGame {
  private container: HTMLElement;
  private socket?: any;
  private roomId?: string;
  private playerName: string;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.playerName = config.playerName;
    
    this.init();
  }

  private init() {
    this.container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: var(--text-primary);">
        <h2>Sintonia</h2>
        <p>Este jogo está em desenvolvimento e será lançado em breve!</p>
        <p style="margin-top: 1rem; opacity: 0.7;">Jogo de sintonia e conexão</p>
      </div>
    `;
  }

  setRoomId(roomId: string) {
    this.roomId = roomId;
  }

  setPlayerName(playerName: string) {
    this.playerName = playerName;
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

