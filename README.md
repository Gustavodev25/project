# Contazoom Backend

Sistema de gestão de vendas e finanças para marketplaces (Mercado Livre, Shopee, Bling).

## 🚀 Tecnologias

- **Next.js 15** - Framework React com API Routes
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados principal
- **JWT Custom** - Autenticação
- **Tailwind CSS** - Estilização

## 📋 Funcionalidades

### Integrações
- **Mercado Livre** - Sincronização de vendas e produtos
- **Shopee** - Gestão de vendas e produtos
- **Bling** - Contas a pagar/receber e categorias

### Módulos
- **Dashboard** - Relatórios e métricas
- **Gestão de SKUs** - Controle de produtos
- **Financeiro** - DRE, contas e categorias
- **Vendas** - Sincronização e análise

## 🛠️ Configuração

### Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://username:password@hostname:port/database"

# JWT Authentication
JWT_SECRET="your-jwt-secret-key"

# Mercado Livre API
MELI_CLIENT_ID="your-client-id"
MELI_CLIENT_SECRET="your-client-secret"
MELI_REDIRECT_URI="https://your-domain.com/api/meli/callback"

# Shopee API
SHOPEE_CLIENT_ID="your-client-id"
SHOPEE_CLIENT_SECRET="your-client-secret"
SHOPEE_REDIRECT_URI="https://your-domain.com/api/shopee/callback"

# Bling API
BLING_CLIENT_ID="your-client-id"
BLING_CLIENT_SECRET="your-client-secret"
BLING_REDIRECT_URI="https://your-domain.com/api/bling/callback"

# Cron Jobs
CRON_SECRET="your-cron-secret"
```

### Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma migrate dev

# Gerar cliente Prisma
npx prisma generate

# Executar em desenvolvimento
npm run dev
```

## 🚀 Deploy no Vercel

### Passo a Passo

1. **Conectar Repositório**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Importe o repositório do GitHub

2. **Configurar Variáveis de Ambiente**
   - Na aba "Environment Variables", adicione todas as variáveis do `.env.local`
   - Variáveis obrigatórias:
     - `DATABASE_URL` - PostgreSQL (use Vercel Postgres ou Neon)
     - `JWT_SECRET` - Chave secreta para autenticação
     - `MELI_CLIENT_ID` / `MELI_CLIENT_SECRET` - Credenciais Mercado Livre
     - `SHOPEE_CLIENT_ID` / `SHOPEE_CLIENT_SECRET` - Credenciais Shopee
     - `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` - Credenciais Bling
     - `CRON_SECRET` - Segredo para cron jobs

3. **Configurar Banco de Dados**
   - Opção 1: Usar Vercel Postgres (recomendado)
   - Opção 2: Usar [Neon](https://neon.tech) (gratuito)
   - Após criar o banco, copie a `DATABASE_URL`

4. **Deploy Automático**
   - Vercel detecta Next.js automaticamente
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **Executar Migrações**
   ```bash
   # Localmente, após configurar DATABASE_URL de produção
   npx prisma migrate deploy
   ```

### Configurações Importantes

#### Timeouts (maxDuration)
O projeto já está configurado com `maxDuration: 300` (5 minutos) nas rotas de sincronização:
- `/api/meli/vendas/sync/route.ts`
- `/api/shopee/vendas/sync/route.ts`

Isso garante tempo suficiente para sincronizar TODAS as vendas.

#### Sincronização Completa do Mercado Livre
A nova implementação busca **TODAS as vendas sem limite**:
- **Sincronização Assíncrona**: Usa `/api/meli/vendas/sync-async` que retorna imediatamente
- Processamento continua em background, evitando timeouts
- Busca até 9.950 vendas por paginação direta
- Automaticamente divide por períodos mensais se necessário
- Respeita limite de offset da API (evita erro 400)
- Progresso em tempo real via Server-Sent Events (SSE)
- **Não para no meio**: Funciona mesmo em planos com limite de tempo

### Deploy Alternativo no Render

Se preferir usar Render ao invés de Vercel:

#### Build Command
```bash
npm run build
```

#### Start Command
```bash
npm start
```

#### Banco de Dados
- Use PostgreSQL no Render
- Configure a variável `DATABASE_URL`
- Execute as migrações após o deploy

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/           # Rotas da API
│   ├── components/    # Componentes React
│   └── globals.css    # Estilos globais
├── lib/               # Utilitários e configurações
├── hooks/             # Hooks customizados
├── contexts/          # Contextos React
└── styles/            # Arquivos CSS

prisma/
├── schema.prisma      # Schema do banco
└── migrations/        # Migrações
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Desenvolvimento
- `npm run build` - Build para produção
- `npm start` - Executar em produção
- `npm run lint` - Linting

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação ou entre em contato.