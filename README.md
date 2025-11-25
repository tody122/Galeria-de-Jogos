# 🎮 Galeria de Jogos HTML

Galeria web de jogos HTML autorais com suporte multiplayer em tempo real usando Next.js e Socket.io.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com SSR
- **TypeScript** - Tipagem estática
- **Socket.io** - Comunicação em tempo real
- **Canvas API** - Renderização de jogos HTML5

## 📦 Instalação

1. Instale as dependências:
```bash
npm install
```

2. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse [http://localhost:3000](http://localhost:3000)

## 🎯 Estrutura do Projeto

```
projeto/
├── pages/
│   ├── index.tsx          # Galeria de jogos
│   ├── game/[id].tsx      # Página do jogo
│   └── api/
│       └── socket.ts      # Servidor Socket.io
├── components/
│   ├── GameCard.tsx       # Card do jogo na galeria
│   ├── GameLoader.tsx     # Carregador de jogos
│   └── RoomControls.tsx   # Controles de sala multiplayer
├── games/
│   ├── codenames/         # Jogo Codenames
│   ├── gartic/            # Jogo Gartic (desenho colaborativo)
│   └── exemplo-single/    # Exemplo de jogo single player
├── hooks/
│   └── useSocket.ts       # Hook para Socket.io
├── types/
│   └── game.ts            # Tipos TypeScript
└── data/
    └── games.ts           # Lista de jogos
```

## 🎮 Como Adicionar um Novo Jogo

1. Crie uma pasta em `games/` com o nome do seu jogo
2. Crie um arquivo `index.ts` que exporta uma classe padrão:

```typescript
import { Socket } from 'socket.io-client';

interface GameConfig {
  container: HTMLElement;
  socket: Socket | null;
  roomId?: string;
}

export default class MeuJogo {
  private container: HTMLElement;
  private socket: Socket | null;
  private roomId?: string;

  constructor(config: GameConfig) {
    this.container = config.container;
    this.socket = config.socket;
    this.roomId = config.roomId;
    this.init();
  }

  private init() {
    // Seu código do jogo aqui
  }

  public setRoomId(roomId: string) {
    this.roomId = roomId;
  }

  public destroy() {
    // Limpeza quando o jogo for fechado
  }
}
```

3. Adicione o jogo em `data/games.ts`:

```typescript
{
  id: 'meu-jogo',
  name: 'Meu Jogo',
  description: 'Descrição do jogo',
  multiplayer: true, // ou false
}
```

## 🔌 Sistema Multiplayer

O sistema usa Socket.io para comunicação em tempo real:

- **join-room**: Entrar em uma sala
- **leave-room**: Sair de uma sala
- **game-message**: Enviar mensagem para outros jogadores
- **game-broadcast**: Broadcast para todos na sala

### Exemplo de uso no jogo:

```typescript
// Enviar evento
this.socket?.emit('game-broadcast', {
  roomId: this.roomId,
  event: 'meu-evento',
  payload: { dados: 'aqui' },
});

// Receber eventos
this.socket?.on('game-message', (data) => {
  if (data.event === 'meu-evento') {
    // Processar dados
  }
});
```

## 🎨 Jogos Incluídos

### Gartic (Multiplayer)
Jogo de desenho colaborativo em tempo real. Múltiplos jogadores podem desenhar simultaneamente no mesmo canvas.

### Codenames (Multiplayer)
Jogo de palavras (em desenvolvimento).

### Exemplo Single Player
Jogo simples de exemplo para um jogador.

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm start` - Inicia servidor de produção
- `npm run lint` - Executa linter

## 🔧 Configuração

O projeto está configurado para:
- TypeScript com tipos estritos
- Next.js com API Routes
- Socket.io com suporte a WebSockets e polling
- CSS global com estilos modernos

## 📄 Licença

Este projeto é de código aberto e está disponível para uso pessoal e comercial.

