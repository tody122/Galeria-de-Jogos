/**
 * Exemplo de jogo usando Phaser.js
 * Para usar este exemplo, descomente Phaser no package.json
 * 
 * npm install phaser
 */

import { Socket } from 'socket.io-client';

interface GameConfig {
  container: HTMLElement;
  socket: Socket | null;
  roomId?: string;
}

export default class ExemploPhaserGame {
  private container: HTMLElement;
  private socket: Socket | null;
  private roomId?: string;
  private game: any = null; // Phaser.Game

  constructor(config: GameConfig) {
    this.container = config.container;
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.init();
  }

  private async init() {
    // Carregar Phaser dinamicamente
    try {
      const Phaser = await import('phaser');
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: this.container,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 200 },
            debug: false,
          },
        },
        scene: {
          preload: this.preload.bind(this),
          create: this.create.bind(this),
          update: this.update.bind(this),
        },
      };

      this.game = new Phaser.Game(config);
    } catch (error) {
      console.error('Erro ao carregar Phaser:', error);
      // Fallback: criar canvas simples
      this.createFallback();
    }
  }

  private preload(this: Phaser.Scene) {
    // Carregar assets aqui
    // this.load.image('logo', 'path/to/logo.png');
  }

  private create(this: Phaser.Scene) {
    // Criar objetos do jogo
    // const logo = this.add.image(400, 300, 'logo');
    
    // Exemplo: criar um sprite simples
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(400, 300, 50);
    
    // Exemplo com física
    const ball = this.physics.add.sprite(400, 100, '');
    ball.setBounce(0.7);
    ball.setCollideWorldBounds(true);
    
    // Configurar Socket.io se multiplayer
    if (this.socket && this.roomId) {
      this.setupSocketListeners();
    }
  }

  private update(this: Phaser.Scene) {
    // Loop de atualização do jogo
  }

  private createFallback() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.border = '2px solid #333';
    canvas.style.borderRadius = '8px';
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Phaser.js não está instalado', canvas.width / 2, canvas.height / 2);
      ctx.fillText('Execute: npm install phaser', canvas.width / 2, canvas.height / 2 + 30);
    }
    
    this.container.appendChild(canvas);
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('game-message', (data: { event: string; payload: any }) => {
      // Processar eventos multiplayer
      if (this.game && this.game.scene) {
        // Enviar para a cena atual
        const scene = this.game.scene.getScenes()[0];
        if (scene && typeof (scene as any).onGameMessage === 'function') {
          (scene as any).onGameMessage(data);
        }
      }
    });
  }

  public setRoomId(roomId: string) {
    this.roomId = roomId;
    if (this.socket) {
      this.setupSocketListeners();
    }
  }

  public destroy() {
    if (this.game) {
      this.game.destroy(true);
    }
    if (this.socket) {
      this.socket.off('game-message');
    }
  }
}

