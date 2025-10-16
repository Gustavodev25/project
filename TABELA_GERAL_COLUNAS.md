# 📊 Configuração de Colunas - Tabela Geral

## Mudanças Implementadas

Ajustada a **Tabela Geral** (que une Mercado Livre e Shopee) para exibir por padrão apenas as **colunas comuns** aos dois marketplaces.

---

## Colunas por Plataforma

### ✅ Colunas Comuns (Todas as Plataformas)
**Marcadas por padrão em TODAS as tabelas:**

1. **Data** - Data e hora da venda
2. **Canal** - Origem da venda
3. **Conta** - Conta conectada
4. **Id venda** - Número do pedido
5. **Produto** - Nome do produto
6. **SKU** - Código do produto
7. **Quantidade** - Qtd de itens
8. **Unitário** - Preço unitário
9. **Valor total** - Valor total da venda
10. **Taxa plataforma** - Taxa cobrada
11. **Frete** - Valor/custo do frete
12. **CMV** - Custo da Mercadoria Vendida
13. **Margem contribuição** - Lucro da venda

---

### 🔶 Colunas Específicas do Mercado Livre

Disponíveis apenas em vendas do **Mercado Livre**:

- **ADS** - Se a venda veio de anúncio patrocinado
- **Exposição** - Premium ou Clássico
- **Tipo de anúncio** - Catálogo ou Próprio

---

## Comportamento por Tabela

### 📘 Mercado Livre
```
✅ Todas as 16 colunas MARCADAS por padrão
   (incluindo ADS, Exposição, Tipo de anúncio)
```

### 🟠 Shopee
```
✅ Apenas 13 colunas MARCADAS por padrão
   (ADS, Exposição, Tipo de anúncio NÃO aparecem no dropdown)
```

### 🌐 Tabela Geral (NOVO)
```
✅ Apenas 13 colunas MARCADAS por padrão
   (colunas comuns aos dois marketplaces)

☑️ Colunas do ML disponíveis no dropdown
   (DESMARCADAS por padrão, usuário pode ativar)
```

---

## Como Funciona na Tabela Geral

### Por Padrão (Primeira vez que acessa)

**Colunas Visíveis (13):**
- ✅ Data
- ✅ Canal  
- ✅ Conta
- ✅ Id venda
- ✅ Produto
- ✅ SKU
- ✅ Quantidade
- ✅ Unitário
- ✅ Valor total
- ✅ Taxa plataforma
- ✅ Frete
- ✅ CMV
- ✅ Margem contribuição

**Colunas Ocultas (3):**
- ⬜ ADS (específico do ML)
- ⬜ Exposição (específico do ML)
- ⬜ Tipo de anúncio (específico do ML)

---

### Como Ativar Colunas do ML

1. Clique no botão **"Colunas"** no topo da tabela
2. No dropdown, você verá **16 opções** de colunas
3. As 3 colunas do ML estarão **desmarcadas**
4. Marque as que desejar ver:
   - ☑️ ADS
   - ☑️ Exposição
   - ☑️ Tipo de anúncio
5. As colunas aparecerão na tabela

**Nota:** Essas colunas mostrarão:
- ✅ Dados corretos para vendas do **Mercado Livre**
- ❌ "N/A" para vendas do **Shopee** (não aplicável)

---

## Exemplo Visual

### Antes (Problema)
```
Tabela Geral com 16 colunas marcadas
┌────┬────┬────┬────┬────┬──────┬─────────┬─────┬─────┬──────┬────────┬─────┬────┬─────┬────┬────────┐
│ ... │ ... │ ... │ ... │ ADS │ Expos. │ Tipo An.│ ... │ ... │ ...  │  ...   │ ... │... │ ... │... │ ...    │
├────┼────┼────┼────┼────┼──────┼─────────┼─────┼─────┼──────┼────────┼─────┼────┼─────┼────┼────────┤
│ML  │... │... │... │ADS │Prem. │Catálogo │ ... │ ... │ ...  │  ...   │ ... │... │ ... │... │ ...    │
│Shp │... │... │... │N/A │ N/A  │  N/A    │ ... │ ... │ ...  │  ...   │ ... │... │ ... │... │ ...    │
│ML  │... │... │... │ -  │Clás. │Próprio  │ ... │ ... │ ...  │  ...   │ ... │... │ ... │... │ ...    │
└────┴────┴────┴────┴────┴──────┴─────────┴─────┴─────┴──────┴────────┴─────┴────┴─────┴────┴────────┘
           ❌ Muitas colunas N/A para vendas Shopee
           ❌ Informação não relevante misturada
```

### Depois (Solução) ✅
```
Tabela Geral com 13 colunas (apenas comuns)
┌────┬────┬────┬────┬────┬─────┬──────┬────────┬─────┬────┬─────┬────┬────────┐
│Data│Can.│Conta│Ped.│Prod│ SKU │ Qtd. │Unitário│Valor│Taxa│Frete│CMV │ Margem │
├────┼────┼────┼────┼────┼─────┼──────┼────────┼─────┼────┼─────┼────┼────────┤
│... │ML  │Tok. │123 │... │ A1  │  1   │ 100,00 │100  │-10 │ +5  │-50 │  45,00 │
│... │Shp │Tok. │456 │... │ B2  │  2   │  50,00 │100  │-8  │ +3  │-40 │  55,00 │
│... │ML  │Mosc│789 │... │ C3  │  1   │ 150,00 │150  │-15 │  0  │-70 │  65,00 │
└────┴────┴────┴────┴────┴─────┴──────┴────────┴─────┴────┴─────┴────┴────────┘
✅ Apenas dados relevantes
✅ Limpo e organizado
✅ Fácil comparar ML e Shopee
```

---

## Arquivos Modificados

### 1. `src/app/components/views/VendasGeral.tsx`
**Mudança:** Estado inicial de colunas visíveis

```typescript
// ANTES
const [colunasVisiveis, setColunasVisiveis] = useState<ColunasVisiveis>({
  // ...
  ads: true,         // ❌
  exposicao: true,   // ❌  
  tipo: true,        // ❌
  // ...
});

// DEPOIS
const [colunasVisiveis, setColunasVisiveis] = useState<ColunasVisiveis>({
  // ...
  ads: false,        // ✅ Desmarcado por padrão
  exposicao: false,  // ✅ Desmarcado por padrão
  tipo: false,       // ✅ Desmarcado por padrão
  // ...
});
```

### 2. `src/app/components/views/ui/FiltrosVendas.tsx`
**Mudança:** Filtro do dropdown de colunas

```typescript
// ANTES
if ((platform === "Shopee" || platform === "Geral") && 
    (coluna.id === "ads" || coluna.id === "exposicao" || coluna.id === "tipo")) {
  return false; // ❌ Escondia na tabela Geral também
}

// DEPOIS
if (platform === "Shopee" && 
    (coluna.id === "ads" || coluna.id === "exposicao" || coluna.id === "tipo")) {
  return false; // ✅ Só esconde no Shopee, aparece na Geral
}
```

---

## Testando

### Teste 1: Colunas Padrão
1. Acesse **Vendas > Geral**
2. ✅ Deve mostrar **13 colunas** (sem ADS, Exposição, Tipo)
3. ✅ Todas as vendas (ML e Shopee) devem ter dados preenchidos

### Teste 2: Ativar Colunas do ML
1. Clique em **"Colunas"**
2. ✅ Deve ver **16 opções** no dropdown
3. ✅ ADS, Exposição e Tipo devem estar **desmarcados**
4. Marque **"ADS"**
5. ✅ Coluna ADS aparece na tabela
6. ✅ Vendas do ML mostram "ADS" ou "-"
7. ✅ Vendas do Shopee mostram "N/A"

### Teste 3: Botão "Todas"
1. Clique em **"Colunas"** → **"Todas"**
2. ✅ Todas as 16 colunas ficam marcadas
3. ✅ Tabela mostra todas as colunas (incluindo do ML)

### Teste 4: Comparação com Outras Tabelas
1. **Mercado Livre:** 16 colunas marcadas por padrão
2. **Shopee:** 13 colunas marcadas (sem ADS/Exposição/Tipo)
3. **Geral:** 13 colunas marcadas (mas pode ativar as do ML)

---

## Benefícios

### 🎯 Foco no Essencial
- Apenas informações comuns aos dois marketplaces
- Facilita comparação entre ML e Shopee
- Menos poluição visual

### 🔧 Flexibilidade
- Usuário pode ativar colunas do ML se precisar
- Personalização mantida
- Não perde funcionalidade

### 📊 Melhor UX
- Tabela mais limpa e organizada
- Menos "N/A" desnecessários
- Foco nas métricas que importam

---

## Status: ✅ IMPLEMENTADO

A configuração está ativa e funcionando em:
- ✅ Tabela Geral (VendasGeral.tsx)
- ✅ Dropdown de Colunas (FiltrosVendas.tsx)
- ✅ Renderização da Tabela (VendasTable.tsx)
