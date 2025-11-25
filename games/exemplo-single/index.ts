interface GameConfig {
  container: HTMLElement;
  socket?: any;
  roomId?: string;
}

export default class ExemploSingleGame {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private x = 0;
  private y = 0;
  private vx = 2;
  private vy = 2;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.init();
  }

  private init() {
    // Criar canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.canvas.style.border = '2px solid #333';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.backgroundColor = '#1a1a2e';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Iniciar animação
    this.animate();

    this.container.appendChild(this.canvas);
  }

  private animate = () => {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Atualizar posição
    this.x += this.vx;
    this.y += this.vy;

    // Colisão com bordas
    if (this.x <= 20 || this.x >= this.canvas.width - 20) {
      this.vx = -this.vx;
    }
    if (this.y <= 20 || this.y >= this.canvas.height - 20) {
      this.vy = -this.vy;
    }

    // Desenhar bola
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 3;
    ctx.stroke();

    this.animationId = requestAnimationFrame(this.animate);
  };

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

