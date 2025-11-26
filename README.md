# ContaZoom Backend

Backend API para o sistema ContaZoom - Gestão de vendas de marketplaces.

## Stack

- **Runtime**: Node.js
- **Framework**: Next.js 15 (API Routes)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (jose)

## Estrutura

```
project-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/api/          # API Routes
│   │   ├── auth/         # Autenticação
│   │   ├── meli/         # Mercado Livre
│   │   ├── shopee/       # Shopee
│   │   ├── dashboard/    # Dashboard stats
│   │   └── vendas/       # Vendas
│   └── lib/              # Utilidades
│       ├── prisma.ts     # Prisma client
│       ├── auth.ts       # JWT helpers
│       └── cache.ts      # Cache helpers
├── package.json
└── .env
```

## Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@host/database"

# Auth
AUTH_SECRET="your-secret-key"
JWT_SECRET="your-jwt-secret"

# Mercado Livre
MELI_APP_ID=
MELI_CLIENT_SECRET=
MELI_REDIRECT_URI=
MELI_REDIRECT_ORIGIN=

# Shopee
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URI=
SHOPEE_REDIRECT_ORIGIN=

# Cron
CRON_SECRET=
```

## Deploy (Render)

1. Conectar repositório ao Render
2. Configurar build command: `npm install && npm run build`
3. Configurar start command: `npm start`
4. Adicionar variáveis de ambiente
5. Adicionar PostgreSQL addon

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar migrations
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Build
npm run build

# Start
npm start
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - User info

### Mercado Livre
- `GET /api/meli/auth` - Iniciar OAuth
- `GET /api/meli/callback` - OAuth callback
- `GET /api/meli/accounts` - Listar contas
- `POST /api/meli/vendas/sync` - Sincronizar vendas
- `GET /api/meli/vendas` - Listar vendas

### Shopee
- `GET /api/shopee/auth` - Iniciar OAuth
- `GET /api/shopee/callback` - OAuth callback
- `GET /api/shopee/accounts` - Listar contas
- `POST /api/shopee/vendas/sync` - Sincronizar vendas
- `GET /api/shopee/vendas` - Listar vendas

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/series` - Séries temporais
- `GET /api/dashboard/faturamento-por-origem` - Faturamento por origem
- `GET /api/dashboard/top-produtos-faturamento` - Top produtos
- `GET /api/dashboard/top-produtos-margem` - Top margens

### Vendas
- `GET /api/vendas` - Listar todas vendas

## Licença

Privado
