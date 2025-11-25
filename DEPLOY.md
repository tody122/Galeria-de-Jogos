# 🚀 Guia de Deploy no Railway

Este guia explica como fazer o deploy do projeto no Railway.

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Projeto no GitHub (recomendado) ou pode fazer deploy direto

## 🔧 Passo a Passo

### 1. Preparar o Projeto

O projeto já está configurado para o Railway. Não é necessário fazer alterações.

### 2. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub (recomendado)
3. Clique em **"New Project"**
4. Selecione **"Deploy from GitHub repo"** (se o projeto estiver no GitHub)
   - OU selecione **"Empty Project"** e depois **"Deploy from GitHub repo"**

### 3. Configurar o Deploy

1. Selecione o repositório do projeto
2. O Railway detectará automaticamente que é um projeto Next.js
3. Clique em **"Deploy"**

### 4. Variáveis de Ambiente (se necessário)

Normalmente não é necessário configurar variáveis de ambiente para este projeto, mas se precisar:

1. No projeto Railway, vá em **"Variables"**
2. Adicione as variáveis necessárias

### 5. Aguardar o Deploy

- O Railway irá:
  - Instalar dependências (`npm install`)
  - Fazer build do projeto (`npm run build`)
  - Iniciar o servidor (`npm start`)

### 6. Obter a URL

1. Após o deploy, o Railway gerará uma URL automática
2. Você pode personalizar o domínio em **"Settings" > "Domains"**
3. A URL será algo como: `seu-projeto.up.railway.app`

## ⚙️ Configurações Importantes

### Porta

O Railway define automaticamente a variável `PORT`. O Next.js detecta isso automaticamente.

### WebSockets

O Railway suporta WebSockets nativamente, então o Socket.io funcionará perfeitamente!

## 💰 Custos

- **Plano Gratuito**: $1/mês de crédito
- Para um projeto pequeno/médio, geralmente fica dentro do crédito gratuito
- Se ultrapassar, você paga apenas a diferença

## 🔍 Verificar se Está Funcionando

1. Acesse a URL do projeto
2. Teste criar uma sala
3. Teste conectar com outro navegador/aba
4. Verifique se o Socket.io está funcionando (veja o console do navegador)

## 🐛 Troubleshooting

### Problema: Deploy falha
- Verifique os logs no Railway
- Certifique-se de que todas as dependências estão no `package.json`

### Problema: Socket.io não conecta
- Verifique se a URL está correta
- Verifique os logs do servidor no Railway
- Certifique-se de que o CORS está configurado corretamente

### Problema: Erro de build
- Verifique se o TypeScript está compilando corretamente
- Execute `npm run build` localmente para testar

## 📚 Recursos

- [Documentação do Railway](https://docs.railway.app)
- [Next.js no Railway](https://docs.railway.app/guides/nextjs)

