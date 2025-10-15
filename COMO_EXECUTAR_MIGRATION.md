# 🚀 Como Executar a Migration de Alíquotas

## ⚠️ PROBLEMA
Erro ao criar alíquota porque a tabela `aliquota_imposto` não existe no banco de dados.

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: Script Automático (Recomendado)

1. **Execute o arquivo `executar-migration-aliquotas.bat`** 
   - Clique duas vezes no arquivo
   - OU execute no PowerShell: `.\executar-migration-aliquotas.bat`

2. **Aguarde a conclusão** (deve aparecer "Migration executada com sucesso!")

3. **Reinicie o servidor Next.js**
   - Pare o servidor (Ctrl+C)
   - Inicie novamente: `npm run dev`

---

### Opção 2: Comando Manual

Se o script automático não funcionar, execute manualmente:

```bash
# 1. Executar a migration
npx prisma db execute --file prisma/migrations/add_aliquota_imposto.sql

# 2. Regenerar Prisma Client
npx prisma generate

# 3. Reiniciar o servidor
# (Pare com Ctrl+C e rode novamente: npm run dev)
```

---

### Opção 3: SQL Direto no Banco

Se preferir executar direto no PostgreSQL:

1. Acesse o banco de dados Render ou seu cliente PostgreSQL
2. Execute o SQL do arquivo `prisma/migrations/add_aliquota_imposto.sql`
3. Execute `npx prisma generate` no terminal
4. Reinicie o servidor

---

## 🔍 Verificar se Funcionou

Após executar a migration, tente:

1. Acessar **Financeiro → Alíquotas de Impostos**
2. Clicar em **"Adicionar Alíquota"**
3. Preencher o formulário
4. Se salvar com sucesso ✅ - Migration funcionou!

---

## 📝 O que a Migration Cria

- ✅ Tabela `aliquota_imposto`
- ✅ Índices para otimização de queries
- ✅ Foreign key com tabela `usuario`
- ✅ Campos: id, user_id, conta, aliquota, data_inicio, data_fim, descricao, ativo, timestamps

---

## ❓ Problemas Comuns

### Erro: "DATABASE_URL não encontrada"
- Certifique-se que o arquivo `.env` existe na raiz do projeto
- Verifique se a variável `DATABASE_URL` está configurada

### Erro: "relation already exists"
- A tabela já foi criada anteriormente
- Execute apenas: `npx prisma generate`
- Reinicie o servidor

### Erro de autenticação no banco
- Verifique as credenciais em `.env`
- Confirme que o IP está liberado no Render (se aplicável)

---

## 🆘 Suporte

Se continuar com erro:
1. Copie a mensagem de erro completa
2. Verifique se `.env` está configurado corretamente
3. Tente executar `npx prisma db pull` para verificar conexão com o banco
