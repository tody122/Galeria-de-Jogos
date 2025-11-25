# 🎮 Guia de Teste Multiplayer

## Métodos de Teste

### 1. Múltiplas Abas (Mais Simples) ⭐

1. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Abra 2-3 abas no navegador:**
   - Aba 1: `http://localhost:3000`
   - Aba 2: `http://localhost:3000` (nova aba)
   - Aba 3: `http://localhost:3000` (opcional)

3. **Configure nomes diferentes:**
   - Aba 1: Clique no botão 👤 e escolha "Jogador1"
   - Aba 2: Clique no botão 👤 e escolha "Jogador2"
   - Aba 3: Clique no botão 👤 e escolha "Jogador3"

4. **Entre no jogo Contexto:**
   - Em todas as abas, clique em "Contexto"

5. **Crie/Entre na mesma sala:**
   - **Aba 1 (Host):** Clique em "Criar Sala"
   - **Aba 2 e 3:** Copie o ID da sala da Aba 1 e cole no campo "ID da Sala", depois clique em "Entrar"

6. **Teste a sincronização:**
   - ✅ Verifique se todos os jogadores aparecem na lista
   - ✅ Envie um palpite em uma aba e veja se aparece nas outras
   - ✅ Teste se os pontos são atualizados em todas as abas

### 2. Navegadores Diferentes

1. Abra **Chrome** e acesse `http://localhost:3000`
2. Abra **Firefox** e acesse `http://localhost:3000`
3. Configure nomes diferentes em cada navegador
4. Entre na mesma sala
5. Teste a sincronização

### 3. Dispositivos na Mesma Rede

1. **Descubra seu IP local:**
   - **Windows:** Abra CMD e digite `ipconfig`
   - **Mac/Linux:** Abra Terminal e digite `ifconfig` ou `ip addr`
   - Procure por "IPv4 Address" (ex: `192.168.1.100`)

2. **Inicie o servidor:**
   ```bash
   npm run dev
   ```

3. **No celular/tablet:**
   - Conecte-se à mesma rede Wi-Fi
   - Abra o navegador e acesse: `http://SEU_IP:3000`
   - Exemplo: `http://192.168.1.100:3000`

4. **Teste entre computador e celular**

### 4. Usando DevTools

1. **Abra o Console (F12) em cada aba**
2. **Verifique os logs:**
   ```
   Conectado ao servidor Socket.io
   Entrando na sala: room-xxxxx
   Cliente xxx entrou na sala room-xxxxx
   ```

3. **Monitore a aba Network:**
   - Filtre por "WS" (WebSocket)
   - Veja as mensagens sendo enviadas/recebidas

## Checklist de Teste

### ✅ Conexão
- [ ] Socket.io conecta corretamente
- [ ] Nome do jogador é salvo e exibido
- [ ] Botão "Criar Sala" funciona
- [ ] Botão "Entrar" funciona

### ✅ Sincronização de Jogadores
- [ ] Todos os jogadores aparecem na lista
- [ ] Nome "você" está destacado
- [ ] Quando um jogador entra, aparece em todas as abas
- [ ] Quando um jogador sai, desaparece de todas as abas
- [ ] Mudança de nome é sincronizada

### ✅ Sincronização do Jogo
- [ ] Palpites aparecem em todas as abas
- [ ] Pontuação é atualizada em tempo real
- [ ] Quando alguém acerta, todos veem a mensagem
- [ ] Nova rodada inicia para todos simultaneamente

### ✅ Casos Especiais
- [ ] Host pode gerar nova palavra
- [ ] Jogadores não-host não veem botão "Nova Palavra"
- [ ] Se o host sair, outro jogador pode continuar
- [ ] Reconexão após desconexão temporária

## Problemas Comuns

### ❌ "Aguardando conexão..."
- **Solução:** Aguarde alguns segundos para o Socket.io conectar
- Verifique se o servidor está rodando
- Verifique o console para erros

### ❌ Jogadores não aparecem
- **Solução:** Verifique se todos estão na mesma sala
- Verifique o console para erros de Socket.io
- Tente sair e entrar novamente na sala

### ❌ Ações não sincronizam
- **Solução:** Verifique a conexão WebSocket na aba Network
- Verifique se há erros no console
- Tente recarregar a página

## Dicas de Debug

1. **Console do Navegador:**
   - Pressione F12
   - Vá na aba "Console"
   - Procure por mensagens de erro ou logs do Socket.io

2. **Network Tab:**
   - Pressione F12
   - Vá na aba "Network"
   - Filtre por "WS" para ver conexões WebSocket
   - Clique em uma conexão para ver mensagens

3. **Application Tab:**
   - Pressione F12
   - Vá na aba "Application" > "Local Storage"
   - Verifique se o nome do jogador está salvo

4. **Terminal do Servidor:**
   - Veja os logs do servidor Next.js
   - Procure por mensagens de conexão/desconexão

## Testando com Mais Jogadores

Para testar com mais de 3 jogadores:
- Use combinação de abas + navegadores diferentes
- Ou peça ajuda de amigos na mesma rede
- Ou use ferramentas como BrowserStack (pago)

## Exemplo de Fluxo Completo

1. **Aba 1:** Criar sala "room-abc123"
2. **Aba 2:** Entrar na sala "room-abc123"
3. **Aba 1:** Enviar palpite "gato"
4. **Aba 2:** Ver palpite "gato" aparecer
5. **Aba 2:** Enviar palpite "cachorro"
6. **Aba 1:** Ver palpite "cachorro" aparecer
7. **Aba 1:** Acertar a palavra secreta
8. **Aba 2:** Ver mensagem de vitória e nova rodada iniciar

---

**Boa sorte com os testes! 🎮**

