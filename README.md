# Contazoom Backend

Sistema de gestão de vendas e finanças para marketplaces (Mercado Livre, Shopee, Bling).

## 🚀 Tecnologias

- **Next.js 15** - Framework React com API Routes
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados principal
- **NextAuth** - Autenticação
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

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"

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

## 🚀 Deploy no Render

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

### Banco de Dados
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