interface GameConfig {
  container: HTMLElement;
  socket?: any;
  roomId?: string;
  playerName?: string;
}

export default class ColoramaGame {
  private container: HTMLElement;
  private gameElement: HTMLElement | null = null;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.init();
  }

  private init() {
    // Criar elemento do jogo
    this.gameElement = document.createElement('div');
    this.gameElement.className = 'colorama-game';
    this.gameElement.innerHTML = this.getGameHTML();
    this.container.appendChild(this.gameElement);
  }

  private getGameHTML(): string {
    return `
      <div class="colorama-container">
        <div class="colorama-header">
          <h1>🎨 Colorama</h1>
          <p class="coming-soon">Em desenvolvimento...</p>
        </div>
        <div class="colorama-content">
          <p>Este jogo está sendo desenvolvido e estará disponível em breve!</p>
          <p>Fique atento para atualizações.</p>
        </div>
      </div>
    `;
  }

  public setRoomId(roomId: string) {
    // Implementar quando necessário
  }

  public setPlayerName(playerName: string) {
    // Implementar quando necessário
  }

  public destroy() {
    if (this.gameElement && this.gameElement.parentNode) {
      this.gameElement.parentNode.removeChild(this.gameElement);
    }
    this.gameElement = null;
  }
}




