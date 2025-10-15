# Sistema de Alíquotas de Impostos sobre Faturamento

## 📋 Visão Geral

Sistema completo para cadastro e gerenciamento de alíquotas de impostos sobre faturamento por conta e período. O cálculo é aplicado automaticamente no Dashboard, exibindo o valor de impostos no card "Impostos s/ Faturamento".

## 🎯 Funcionalidades Implementadas

### 1. **Banco de Dados**
- ✅ Novo modelo `AliquotaImposto` no Prisma schema
- ✅ Migration SQL criada em `prisma/migrations/add_aliquota_imposto.sql`
- ✅ Campos: conta, alíquota (%), período (dataInicio/dataFim), descrição, status ativo

### 2. **APIs REST**
- ✅ `GET /api/financeiro/aliquotas` - Listar alíquotas do usuário
- ✅ `POST /api/financeiro/aliquotas` - Criar nova alíquota
- ✅ `PUT /api/financeiro/aliquotas/[id]` - Atualizar alíquota
- ✅ `DELETE /api/financeiro/aliquotas/[id]` - Excluir alíquota
- ✅ `GET /api/financeiro/aliquotas/contas` - Listar contas disponíveis (ML/Shopee)

### 3. **Interface de Gerenciamento**
- ✅ Página `/financeiro/aliquotas` com tabela completa
- ✅ Modal de cadastro com validações
- ✅ Edição e exclusão de alíquotas
- ✅ Filtros e status visual (Ativo/Inativo)
- ✅ Integração com sidebar no menu Financeiro

### 4. **Cálculo Automático**
- ✅ Lógica implementada em `/api/dashboard/stats`
- ✅ Cálculo por conta e período
- ✅ Exibição no card do Dashboard
- ✅ Percentual sobre faturamento

## 🚀 Como Usar

### Passo 1: Executar a Migration

```bash
# Execute o SQL de migration no banco de dados
psql -h [host] -U [user] -d [database] -f prisma/migrations/add_aliquota_imposto.sql

# OU execute via Prisma (após resolver drift)
npx prisma migrate deploy
```

### Passo 2: Regenerar Prisma Client

```bash
npx prisma generate
```

### Passo 3: Acessar o Sistema

1. Navegue até **Financeiro → Alíquotas de Impostos** no sidebar
2. Clique em **"Adicionar Alíquota"**
3. Preencha os dados:
   - **Conta**: Selecione a conta (Mercado Livre ou Shopee)
   - **Alíquota**: Digite o percentual (ex: 5.00 para 5%)
   - **Mês/Ano**: Selecione o mês e ano (a alíquota vale para o mês todo)
   - **Descrição**: Opcional (ex: "Simples Nacional", "Lucro Presumido")

### Exemplo de Uso

**Cenário**: Conta Moscou no Mercado Livre com 5% de imposto em setembro/2025

```
Conta: Mercado Livre - Moscou
Alíquota: 5.00%
Mês/Ano: Setembro/2025
Descrição: Simples Nacional
```

**Resultado**: Todo faturamento da conta Moscou em setembro será multiplicado por 5% e o valor aparecerá no card "Impostos s/ Faturamento" do Dashboard.

## 📊 Como Funciona o Cálculo

1. **Agrupamento**: Sistema agrupa vendas por conta (plataforma)
2. **Match de Alíquota**: Busca alíquota cadastrada para aquela conta
3. **Validação de Período**: Verifica se o período do filtro se sobrepõe ao período da alíquota
4. **Cálculo**: `Imposto = Faturamento da Conta × (Alíquota / 100)`
5. **Totalização**: Soma impostos de todas as contas

### Exemplo de Cálculo

```
Alíquota cadastrada: Setembro/2025 - 5%
Período filtrado no Dashboard: Setembro/2025

Vendas em Setembro:
- Faturamento Total: R$ 100.000,00

Cálculo:
- Impostos: R$ 100.000 × 0.05 = R$ 5.000,00

Dashboard exibe: -R$ 5.000,00 (5.0% do faturamento)
```

**Importante:** 
- A alíquota se aplica ao **faturamento total** do período
- Não importa a quantidade de contas, a alíquota cadastrada será aplicada se o período coincidir
- Selecione sempre um **período específico** no dashboard (não use "Todos")

## 🎨 Interface Visual

### Tela Principal
- Tabela responsiva com todas as alíquotas
- Colunas: Conta, Alíquota, Período, Descrição, Status, Ações
- Botões de edição e exclusão por linha
- Empty state quando não há alíquotas

### Card no Dashboard
- Antes: "Valor não calculado"
- Depois: Valor calculado + percentual do faturamento
- Tooltip: "Configure alíquotas" quando não houver cálculo

## ⚙️ Configurações Técnicas

### Validações
- Alíquota entre 0% e 100%
- Data Fim >= Data Início
- Campos obrigatórios: conta, alíquota, datas
- Autenticação via session token

### Modelo de Dados
```prisma
model AliquotaImposto {
  id         String   @id @default(cuid())
  userId     String
  conta      String
  aliquota   Decimal  @db.Decimal(5, 2)
  dataInicio DateTime // Automaticamente: 1º dia do mês
  dataFim    DateTime // Automaticamente: último dia do mês
  descricao  String?
  ativo      Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(...)
}
```

**Nota:** Ao cadastrar, você seleciona apenas o **Mês/Ano**. O sistema automaticamente:
- Define `dataInicio` como o primeiro dia do mês selecionado
- Define `dataFim` como o último dia do mês selecionado

## 🔧 Manutenção

### Adicionar Nova Conta
As contas são carregadas automaticamente de:
- `MeliAccount` (nickname)
- `ShopeeAccount` (shop_name)

### Desativar Alíquota
1. Edite a alíquota
2. Desmarque "Ativo"
3. Salve

A alíquota inativa não será considerada nos cálculos.

### Match de Contas
O sistema faz match parcial entre:
- Nome da conta cadastrada na alíquota
- Nome da plataforma/conta nas vendas

Exemplo: alíquota com "Moscou" fará match com vendas da conta "Mercado Livre - Moscou"

## 📝 Notas Importantes

1. **Período Sobreposto**: Se houver múltiplas alíquotas para a mesma conta em períodos sobrepostos, apenas a primeira encontrada será aplicada
2. **Sem Alíquota**: Se não houver alíquota cadastrada para uma conta, o imposto será R$ 0,00
3. **Filtros do Dashboard**: O cálculo respeita todos os filtros aplicados no dashboard (período, canal, status, etc.)
4. **Performance**: O cálculo é feito em tempo real a cada carregamento do dashboard

## 🎯 Próximas Melhorias (Sugeridas)

- [ ] Múltiplas alíquotas simultâneas por conta (priorização)
- [ ] Histórico de alterações de alíquotas
- [ ] Relatório de impostos por período
- [ ] Exportação de dados para contabilidade
- [ ] Integração com sistemas fiscais
- [ ] Alíquotas variáveis por faixa de faturamento

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique se a migration foi executada
2. Confirme que o Prisma Client foi regenerado
3. Valide que há alíquotas cadastradas e ativas
4. Confira se o período da alíquota coincide com o filtro do dashboard
