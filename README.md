# ContaZoom Frontend

Frontend Next.js do sistema ContaZoom - Interface de gestão de vendas de marketplaces.

## Stack

- **Framework**: Next.js 15
- **UI**: React 19, Tailwind CSS 4
- **Charts**: Recharts, ECharts
- **Maps**: Leaflet
- **Forms**: React Hook Form, Zod

## Arquitetura

Este é o frontend que se conecta ao backend via middleware proxy.

```
Frontend (Vercel)  →  Middleware Proxy  →  Backend API (Render)
```

### Como funciona:
1. Usuário acessa o frontend no Vercel
2. Requisições para `/api/*` são interceptadas pelo middleware
3. Middleware faz proxy para o backend no Render
4. Resposta retorna para o usuário

## Estrutura

```
project/
├── src/
│   ├── app/
│   │   ├── components/        # Componentes React
│   │   ├── dashboard/         # Páginas do dashboard
│   │   ├── vendas/            # Páginas de vendas
│   │   ├── contas/            # Gestão de contas
│   │   └── login/             # Autenticação
│   ├── contexts/              # React Contexts
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilidades
│   └── middleware.ts          # Proxy para backend
├── public/                    # Assets estáticos
└── package.json
```

## Variáveis de Ambiente (Vercel)

```env
BACKEND_URL=https://project-backend-rjoh.onrender.com
```

## Deploy no Vercel

1. Conectar repositório no Vercel
2. Framework: Next.js
3. Adicionar variável de ambiente `BACKEND_URL`
4. Deploy automático

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Criar .env.local
echo "BACKEND_URL=https://project-backend-rjoh.onrender.com" > .env.local

# Rodar dev server
npm run dev
```

Acesse: http://localhost:3000

## Páginas

- `/login` - Login
- `/dashboard` - Dashboard principal
- `/vendas/mercado-livre` - Vendas Mercado Livre
- `/vendas/shopee` - Vendas Shopee
- `/vendas/geral` - Todas as vendas
- `/contas` - Gestão de contas
- `/sku` - Gestão de SKUs
- `/financeiro/*` - Módulo financeiro

## Licença

Privado
