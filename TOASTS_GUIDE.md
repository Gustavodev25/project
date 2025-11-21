# 📱 Guia de Notificações Toast - Sincronização

## 🎯 Objetivo

Sistema de toasts em tempo real que mostra **exatamente** o que está acontecendo durante a sincronização em background, mantendo o usuário informado a cada passo.

---

## 🔔 Tipos de Toast

### 1. **Início da Sincronização**

```
┌────────────────────────────────────────┐
│ 🔄 Sincronizando vendas                │
│                                        │
│ Iniciando sincronização de vendas...  │
│                                        │
│ [Este toast NÃO fecha automaticamente] │
└────────────────────────────────────────┘
```

**Quando aparece:** Ao clicar em "Sincronizar"
**Duração:** Infinito (fica visível até completar)
**Ação:** Mostra que a sincronização começou

---

### 2. **Progresso da Sincronização**

```
┌────────────────────────────────────────┐
│ 🔄 Sincronizando vendas                │
│                                        │
│ Conta: tokyo                           │
│ 2.450 de 12.450 vendas                │
│ sincronizadas (20%)                    │
│                                        │
│ [Este toast NÃO fecha automaticamente] │
└────────────────────────────────────────┘
```

**Quando aparece:** Durante a sincronização, a cada lote de vendas processado
**Duração:** Infinito (atualiza constantemente)
**Informações mostradas:**
- Conta sendo sincronizada
- Vendas sincronizadas vs total
- Percentual de progresso
**Frequência:** Atualiza a cada 50-100 vendas processadas

---

### 3. **Continuação Automática em Background** ⭐

```
┌────────────────────────────────────────┐
│ 🔄 Sincronização em Background         │
│                                        │
│ Sincronizando vendas restantes...     │
│ 5.120/12.450 (41%)                    │
│                                        │
│ 🔄 Rodando em background...            │
│ Não feche esta página!                 │
│                                        │
│ [Este toast NÃO fecha automaticamente] │
└────────────────────────────────────────┘
```

**Quando aparece:** Quando o sistema continua automaticamente após primeira execução
**Duração:** Infinito (fica visível durante toda sincronização em background)
**Ação:** Informa que está rodando em background e não deve fechar a página
**Importância:** ⭐⭐⭐ **CRÍTICO** - Mostra que está sincronizando automaticamente

---

### 4. **Sincronização Concluída**

```
┌────────────────────────────────────────┐
│ ✅ Sincronização Concluída!            │
│                                        │
│ ✅ Sincronização completa!             │
│                                        │
│ 12.450 de 12.450 vendas               │
│ sincronizadas (100%)                   │
│                                        │
│ [Fecha automaticamente em 8 segundos]  │
└────────────────────────────────────────┘
```

**Quando aparece:** Ao completar 100% da sincronização
**Duração:** 8 segundos (fecha automaticamente)
**Informações mostradas:**
- Mensagem de sucesso
- Total de vendas sincronizadas
- Confirmação de 100%

---

### 5. **Erro na Sincronização**

```
┌────────────────────────────────────────┐
│ ❌ Erro na Sincronização               │
│                                        │
│ ❌ Falha ao conectar com Mercado Livre│
│                                        │
│ Conta: tokyo                           │
│                                        │
│ [Fecha automaticamente em 10 segundos] │
└────────────────────────────────────────┘
```

**Quando aparece:** Quando há um erro durante a sincronização
**Duração:** 10 segundos (tempo para ler)
**Informações mostradas:**
- Descrição do erro
- Conta afetada (se aplicável)

---

### 6. **Aviso**

```
┌────────────────────────────────────────┐
│ ⚠️ Aviso                               │
│                                        │
│ ⚠️ Token da conta expirado             │
│                                        │
│ Conta: tokyo                           │
│                                        │
│ [Fecha automaticamente em 8 segundos]  │
└────────────────────────────────────────┘
```

**Quando aparece:** Avisos não-críticos durante a sincronização
**Duração:** 8 segundos
**Informações mostradas:**
- Descrição do aviso
- Conta afetada (se aplicável)

---

## 📊 Exemplo de Fluxo Completo (12k Vendas)

### **Passo 1: Início (0s)**

```
🔄 Sincronizando vendas
Iniciando sincronização de vendas...
```

---

### **Passo 2: Primeira leva (30s)**

```
🔄 Sincronizando vendas
Conta: tokyo
2.450 de 12.450 vendas sincronizadas (20%)
```

---

### **Passo 3: Continuação automática (45s)**

```
🔄 Sincronização em Background
Sincronizando vendas restantes...
2.450/12.450 (20%)

🔄 Rodando em background...
Não feche esta página!
```

---

### **Passo 4: Progresso em background (2min)**

```
🔄 Sincronização em Background
Sincronizando vendas restantes...
5.120/12.450 (41%)

🔄 Rodando em background...
Não feche esta página!
```

---

### **Passo 5: Mais progresso (5min)**

```
🔄 Sincronização em Background
Sincronizando vendas restantes...
8.300/12.450 (67%)

🔄 Rodando em background...
Não feche esta página!
```

---

### **Passo 6: Quase completo (8min)**

```
🔄 Sincronização em Background
Sincronizando vendas restantes...
11.100/12.450 (89%)

🔄 Rodando em background...
Não feche esta página!
```

---

### **Passo 7: Conclusão (10min)**

```
✅ Sincronização Concluída!
✅ Sincronização completa!

12.450 de 12.450 vendas sincronizadas (100%)

[Fecha em 8s]
```

---

## 🎨 Características dos Toasts

### **Persistência**
- ✅ Toasts de progresso: **Não fecham** durante sincronização
- ✅ Toasts de conclusão: **8 segundos**
- ✅ Toasts de erro: **10 segundos** (tempo para ler)
- ✅ Toasts de aviso: **8 segundos**

### **Atualização em Tempo Real**
- ✅ Toasts são **atualizados** (não criados novos)
- ✅ Mesmo toast mostra progresso de 0% → 100%
- ✅ Evita poluir a tela com múltiplos toasts

### **Informações Mostradas**
- ✅ **Conta** sendo processada
- ✅ **Progresso** numérico (ex: 2.450/12.450)
- ✅ **Percentual** (ex: 20%)
- ✅ **Status** (sincronizando, em background, concluído)

### **Feedback Visual**
- 🔄 **Azul** (default): Sincronização em andamento
- ✅ **Verde** (success): Concluído com sucesso
- ❌ **Vermelho** (destructive): Erro
- ⚠️ **Amarelo** (warning): Aviso

---

## 🔧 Implementação Técnica

### **Arquivo:**
[src/hooks/useVendasSyncProgress.ts](src/hooks/useVendasSyncProgress.ts)

### **Como Funciona:**

1. **Hook conecta ao SSE** (`/api/meli/vendas/sync-progress`)
2. **Recebe eventos** em tempo real do backend
3. **Cria/atualiza toasts** baseado no tipo de evento
4. **Mantém referência** ao toast ativo (`toastRef`)
5. **Atualiza mesmo toast** durante toda a sincronização

### **Tipos de Eventos SSE:**
- `sync_start` → Cria toast inicial
- `sync_progress` → Atualiza com progresso
- `sync_continue` → Mostra continuação em background
- `sync_complete` → Mostra conclusão
- `sync_error` → Mostra erro
- `sync_warning` → Mostra aviso

---

## 🚀 Como Testar

### **1. Sincronização Simples (poucas vendas)**

1. Acesse a página de vendas
2. Clique em "Sincronizar"
3. Observe:
   - Toast inicial aparece
   - Toast atualiza com progresso
   - Toast de conclusão aparece

**Tempo:** ~30 segundos

---

### **2. Sincronização Completa (12k vendas)**

1. Acesse a página de vendas
2. Clique em "Sincronizar"
3. Observe a sequência:
   - 🔄 Toast: "Sincronizando vendas..."
   - 🔄 Toast: "2.450/12.450 (20%)"
   - 🔄 Toast: "Sincronização em Background" ⭐
   - 🔄 Toast: "5.120/12.450 (41%)"
   - 🔄 Toast: "8.300/12.450 (67%)"
   - ✅ Toast: "Sincronização Concluída!"

**Tempo:** 15-30 minutos
**IMPORTANTE:** Toast "Sincronização em Background" mostra que está rodando automaticamente!

---

## ✅ Checklist de Funcionalidades

- [x] **Toast persiste** durante toda sincronização
- [x] **Toast atualiza** com progresso (%)
- [x] **Toast mostra** continuação em background
- [x] **Toast mostra** nome da conta
- [x] **Toast mostra** vendas sincronizadas/total
- [x] **Toast fecha** automaticamente ao concluir
- [x] **Toast de erro** persiste por 10s
- [x] **Toast de aviso** persiste por 8s
- [x] **Logs detalhados** no console

---

## 📚 Documentação Relacionada

- **[RESUMO_FINAL.md](RESUMO_FINAL.md)** - Resumo de todas as melhorias
- **[SYNC_FULL_GUIDE.md](SYNC_FULL_GUIDE.md)** - Guia de sincronização
- **[WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)** - Configuração de webhooks

---

**Versão:** 2.3.0
**Data:** 2025-11-19
**Status:** ✅ Implementado e testado
**Cobertura:** Todos os eventos de sincronização

---

## 🎉 Resultado

Agora o usuário vê **EXATAMENTE** o que está acontecendo durante a sincronização em background, com toasts persistentes, informativos e atualizados em tempo real!

**Nenhuma sincronização será invisível!** 👁️✨
