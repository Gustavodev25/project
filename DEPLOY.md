# Guia de Deploy - Frontend e Backend Separados

Este projeto está configurado para rodar com **frontend na Vercel** e **backend no Render**.

## Arquitetura

- **Frontend (Vercel)**: https://github.com/Gustavodev25/project.git
  - Interface Next.js hospedada na Vercel
  - Faz chamadas para a API do backend no Render

- **Backend (Render)**: https://project-backend-rjoh.onrender.com
  - API Next.js com todas as rotas `/api/*`
  - Banco de dados PostgreSQL
  - Integrações com Mercado Livre, Shopee e Bling

## Configuração do Frontend (Vercel)

### Variáveis de Ambiente na Vercel

Configure as seguintes variáveis de ambiente no painel da Vercel:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://project-backend-rjoh.onrender.com

# JWT (mesmo valor do backend)
JWT_SECRET=your-jwt-secret-key-here

# Cron Secret (mesmo valor do backend)
CRON_SECRET=your-cron-secret-key
```

### Deploy na Vercel

1. Conecte o repositório: https://github.com/Gustavodev25/project.git
2. Configure as variáveis de ambiente acima
3. O deploy será automático a cada push na branch `main`

## Configuração do Backend (Render)

### Variáveis de Ambiente no Render

Configure todas as variáveis do arquivo `.env.local` no painel do Render:

```bash
# Database
DATABASE_URL=postgresql://contazoom_user:password@host/database

# JWT Authentication
JWT_SECRET=your-jwt-secret-key-here

# Mercado Livre API
MELI_APP_ID=your-meli-app-id
MELI_CLIENT_SECRET=your-meli-client-secret
MELI_REDIRECT_URI=https://project-backend-rjoh.onrender.com/api/meli/callback
MELI_AUTH_BASE=https://auth.mercadolibre.com
MELI_API_BASE=https://api.mercadolibre.com

# Shopee API
SHOPEE_PARTNER_ID=your-shopee-partner-id
SHOPEE_PARTNER_KEY=your-shopee-partner-key
SHOPEE_REDIRECT_URI=https://project-backend-rjoh.onrender.com/api/shopee/callback
SHOPEE_REDIRECT_ORIGIN=https://project-backend-rjoh.onrender.com
SHOPEE_API_BASE=https://partner.shopeemobile.com

# Bling API
BLING_CLIENT_ID=your-bling-client-id
BLING_CLIENT_SECRET=your-bling-client-secret
BLING_REDIRECT_URI=https://project-backend-rjoh.onrender.com/api/bling/callback
BLING_TIPO_INTEGRACAO=API
BLING_ID_LOJA=

# Cron Jobs
CRON_SECRET=your-cron-secret-key
```

## Como Funciona

### 1. Chamadas de API

O frontend usa o helper `src/lib/api-config.ts` para fazer chamadas:

```typescript
import { API_CONFIG } from '@/lib/api-config';

// Automaticamente usa o backend correto
const response = await API_CONFIG.fetch('/api/meli/orders');
```

### 2. Desenvolvimento Local

Para desenvolvimento local, deixe `NEXT_PUBLIC_API_URL` vazio:

```bash
# .env.local (desenvolvimento)
NEXT_PUBLIC_API_URL=
```

Isso fará o frontend usar `localhost:3000` para as APIs.

### 3. Produção

Em produção, configure `NEXT_PUBLIC_API_URL` na Vercel:

```bash
# Vercel Environment Variables
NEXT_PUBLIC_API_URL=https://project-backend-rjoh.onrender.com
```

## Callbacks de OAuth

As integrações OAuth (Mercado Livre, Shopee, Bling) estão configuradas para redirecionar para o backend no Render:

- Mercado Livre: https://project-backend-rjoh.onrender.com/api/meli/callback
- Shopee: https://project-backend-rjoh.onrender.com/api/shopee/callback
- Bling: https://project-backend-rjoh.onrender.com/api/bling/callback

**IMPORTANTE**: Você precisa atualizar essas URLs nos painéis de desenvolvedor de cada plataforma.

## Cron Jobs

O frontend na Vercel está configurado para executar cron jobs que chamam o backend:

```json
{
  "crons": [
    {
      "path": "/api/cron/meli-sync",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

Certifique-se de que o `CRON_SECRET` seja o mesmo em ambos os ambientes.

## Checklist de Deploy

### Backend (Render)
- [ ] Criar serviço Web no Render
- [ ] Conectar repositório do backend
- [ ] Configurar todas as variáveis de ambiente
- [ ] Configurar banco de dados PostgreSQL
- [ ] Verificar que o build foi bem-sucedido
- [ ] Testar endpoints: https://project-backend-rjoh.onrender.com/api/test

### Frontend (Vercel)
- [ ] Conectar repositório: https://github.com/Gustavodev25/project.git
- [ ] Configurar variáveis de ambiente (NEXT_PUBLIC_API_URL, JWT_SECRET, CRON_SECRET)
- [ ] Verificar que o build foi bem-sucedido
- [ ] Testar a aplicação no domínio da Vercel

### Integrações
- [ ] Atualizar redirect URI do Mercado Livre
- [ ] Atualizar redirect URI da Shopee
- [ ] Atualizar redirect URI do Bling
- [ ] Testar fluxo de autenticação de cada integração

## Troubleshooting

### Erro de CORS
Se encontrar erros de CORS, adicione no backend ([middleware.ts](middleware.ts)):

```typescript
// Adicionar domínio da Vercel aos allowed origins
const allowedOrigins = [
  'https://your-frontend.vercel.app',
  'https://project-backend-rjoh.onrender.com',
];
```

### Backend não responde
- Verifique se o serviço está ativo no Render
- Verifique os logs do Render
- Teste diretamente: https://project-backend-rjoh.onrender.com/api/test

### Callbacks OAuth não funcionam
- Verifique se os redirect URIs foram atualizados nos painéis das plataformas
- Verifique se as variáveis de ambiente estão corretas no Render
- Teste os endpoints de callback diretamente

## Suporte

Para mais informações, consulte:
- [README.md](README.md) - Documentação geral do projeto
- [CRON_SYNC_README.md](CRON_SYNC_README.md) - Documentação de sincronização
