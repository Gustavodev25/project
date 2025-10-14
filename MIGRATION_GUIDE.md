# Guia de Migração para PostgreSQL no Render

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Projeto Contazoom configurado localmente
3. Git configurado

## 🚀 Passo a Passo

### 1. Criar Banco PostgreSQL no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `contazoom-db`
   - **Database**: `contazoom` (ou deixe padrão)
   - **User**: `contazoom_user` (ou deixe padrão)
   - **Region**: `Oregon (US West)` (recomendado)
   - **PostgreSQL Version**: `17`
   - **Plan**: `Basic-256mb` ($6/mês) para começar

4. Clique em **"Create Database"**

### 2. Obter String de Conexão

Após criar o banco:

1. Vá para a página do banco no Render
2. Na aba **"Connect"**, copie a **"External Database URL"**
3. Formato: `postgresql://username:password@hostname:port/database`

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Database - Substitua pela URL do Render
DATABASE_URL="postgresql://username:password@hostname:port/database"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# APIs (configure conforme necessário)
MELI_CLIENT_ID="seu-client-id"
MELI_CLIENT_SECRET="seu-client-secret"
MELI_REDIRECT_URI="http://localhost:3000/api/meli/callback"

SHOPEE_CLIENT_ID="seu-client-id"
SHOPEE_CLIENT_SECRET="seu-client-secret"
SHOPEE_REDIRECT_URI="http://localhost:3000/api/shopee/callback"

BLING_CLIENT_ID="seu-client-id"
BLING_CLIENT_SECRET="seu-client-secret"
BLING_REDIRECT_URI="http://localhost:3000/api/bling/callback"

CRON_SECRET="sua-chave-cron"
```

### 4. Executar Migrações

```bash
# Resetar banco e aplicar migrações
npx prisma migrate reset

# Ou apenas aplicar migrações
npx prisma migrate dev
```

### 5. Verificar Conexão

```bash
# Testar conexão
npx prisma db pull

# Gerar cliente Prisma
npx prisma generate
```

### 6. Testar Aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000` e verifique se tudo funciona.

## 🔧 Para Produção

### Deploy no Render (Web Service)

1. Conecte seu repositório GitHub ao Render
2. Configure as variáveis de ambiente no Render Dashboard
3. Use o mesmo `DATABASE_URL` do banco PostgreSQL
4. Configure `NEXTAUTH_URL` para sua URL de produção

### Variáveis de Ambiente no Render

No dashboard do seu Web Service:

- `DATABASE_URL`: URL do PostgreSQL
- `NEXTAUTH_SECRET`: Chave secreta forte
- `NEXTAUTH_URL`: URL de produção
- Outras variáveis conforme necessário

## 📊 Migração de Dados (Opcional)

Se você tem dados no SQLite local que quer migrar:

1. **Exportar dados do SQLite**:
```bash
# Instalar sqlite3 se necessário
npm install sqlite3

# Exportar dados (exemplo)
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./prisma/dev.db');
// Script de exportação personalizado
"
```

2. **Importar para PostgreSQL**:
```bash
# Usar Prisma para importar
npx prisma db seed
```

## ⚠️ Observações Importantes

- **Backup**: Sempre faça backup antes de migrar
- **Teste**: Teste primeiro em ambiente de desenvolvimento
- **Performance**: PostgreSQL é mais robusto que SQLite para produção
- **Custos**: Render PostgreSQL tem plano gratuito limitado

## 🆘 Troubleshooting

### Erro de Conexão
- Verifique se a URL está correta
- Confirme se o banco está ativo no Render
- Teste conectividade de rede

### Erro de Migração
- Execute `npx prisma migrate reset` se necessário
- Verifique se o schema está atualizado
- Confirme permissões do usuário do banco

### Erro de Prisma Client
- Execute `npx prisma generate` após mudanças
- Verifique se as dependências estão instaladas

## 📞 Suporte

Para dúvidas específicas:
- [Documentação Render](https://render.com/docs)
- [Documentação Prisma](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
