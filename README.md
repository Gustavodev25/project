# ContaZoom Backend API

Backend API em Next.js para gestão de vendas e financeiro com integração Mercado Livre, Shopee e Bling.

## 🚀 Stack Tecnológica

- **Framework**: Next.js 15.5.4
- **Runtime**: Node.js 20+
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: JWT + bcryptjs
- **Linguagem**: TypeScript

## 📋 Pré-requisitos

- Node.js 20.x ou superior
- PostgreSQL 13+
- npm ou yarn

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/Gustavodev25/project-backend.git
cd project-backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha com suas credenciais:

```bash
cp env.example .env.local
```

Edite o arquivo `.env.local` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/contazoom?schema=public"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this"

# API URL
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Mercado Livre OAuth
MELI_CLIENT_ID="your-meli-client-id"
MELI_CLIENT_SECRET="your-meli-client-secret"

# Shopee OAuth
SHOPEE_CLIENT_ID="your-shopee-client-id"
SHOPEE_CLIENT_SECRET="your-shopee-client-secret"

# Bling OAuth
BLING_CLIENT_ID="your-bling-client-id"
BLING_CLIENT_SECRET="your-bling-client-secret"

# Cron Security
CRON_SECRET="your-cron-secret-key"

# Environment
NODE_ENV="development"
```

### 4. Configure o banco de dados

Execute as migrações do Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

A API estará disponível em `http://localhost:3000`

## 📚 Estrutura do Projeto

```
project-backend/
├── src/
│   ├── app/
│   │   ├── api/              # Rotas da API
│   │   │   ├── auth/         # Autenticação
│   │   │   ├── meli/         # Mercado Livre
│   │   │   ├── shopee/       # Shopee
│   │   │   ├── bling/        # Bling
│   │   │   ├── financeiro/   # Financeiro
│   │   │   ├── dashboard/    # Dashboard
│   │   │   ├── vendas/       # Vendas
│   │   │   ├── sku/          # Produtos
│   │   │   └── cron/         # Jobs agendados
│   │   └── layout.tsx        # Layout raiz
│   ├── lib/                  # Bibliotecas
│   │   ├── auth.ts           # JWT Auth
│   │   ├── prisma.ts         # Prisma Client
│   │   ├── meli.ts           # Integração Meli
│   │   ├── shopee.ts         # Integração Shopee
│   │   └── bling.ts          # Integração Bling
│   └── config/               # Configurações
├── prisma/
│   ├── schema.prisma         # Schema do banco
│   └── migrations/           # Migrações
├── scripts/                  # Scripts utilitários
├── middleware.ts             # Middleware de auth
├── instrumentation.ts        # Server startup
└── package.json
```

## 🔐 Autenticação

### Registrar novo usuário

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "senha123"
}
```

### Verificar sessão

```bash
GET /api/auth/me
Cookie: session=<jwt-token>
```

## 📡 Principais Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/series` - Séries temporais
- `GET /api/dashboard/faturamento-por-origem` - Faturamento por origem

### Vendas
- `GET /api/vendas` - Listar vendas
- `GET /api/meli/vendas` - Vendas Mercado Livre
- `GET /api/shopee/vendas` - Vendas Shopee
- `POST /api/meli/vendas/sync` - Sincronizar vendas Meli

### Financeiro
- `GET /api/financeiro/contas-pagar` - Contas a pagar
- `GET /api/financeiro/contas-receber` - Contas a receber
- `POST /api/financeiro/contas-pagar/sync` - Sincronizar com Bling

### SKU (Produtos)
- `GET /api/sku` - Listar SKUs
- `POST /api/sku` - Criar SKU
- `PUT /api/sku/:id` - Atualizar SKU
- `DELETE /api/sku/:id` - Deletar SKU

## 🚀 Deploy no Render

### 1. Crie um novo Web Service no Render

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `Node`

### 2. Adicione um PostgreSQL Database

Crie um banco PostgreSQL no Render e copie a Internal Database URL.

### 3. Configure as variáveis de ambiente

Adicione todas as variáveis do `.env.example` no painel do Render.

### 4. Execute as migrações

Após o primeiro deploy, execute no Shell do Render:

```bash
npx prisma migrate deploy
```

### 5. Crie o primeiro usuário (opcional)

Use o endpoint `/api/auth/register` para criar o primeiro usuário.

## 🔄 Jobs Agendados (Cron)

O projeto possui jobs de sincronização automática:

- **Auto Sync Meli**: A cada 2 horas (`/api/cron/meli-sync`)
- **Refresh Tokens**: A cada 6 horas (`/api/cron/refresh-tokens`)

Para configurar no Render, use o Render Crons ou configure um serviço externo (cron-job.org).

## 📝 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm start            # Inicia servidor de produção
npm run lint         # Executa linter
```

## 🛠️ Desenvolvimento

### Verificar banco de dados

```bash
npx prisma studio
```

### Criar nova migração

```bash
npx prisma migrate dev --name nome-da-migracao
```

### Reset do banco de dados

```bash
npx prisma migrate reset
```

## 📄 Licença

Privado - Todos os direitos reservados.

## 👥 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.
