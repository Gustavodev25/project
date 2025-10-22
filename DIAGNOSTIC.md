# 🔍 Diagnóstico: Discrepância Localhost vs Produção

## Problema Reportado
- **Localhost:** R$ 9.708,32 (ontem)
- **Vercel:** R$ 10.785,61 (ontem)
- **Diferença:** R$ 1.077,29

---

## Possíveis Causas

### 1. 🌍 Timezone Diferente (MAIS PROVÁVEL)

**Problema:**
- Localhost: UTC-3 (Brasil)
- Vercel: UTC (padrão)
- Diferença de 3 horas pode incluir vendas de períodos diferentes

**Como a diferença de timezone afeta:**
```
Venda às 22:00 do dia 20 (UTC-3) = 01:00 do dia 21 (UTC)
- Localhost: conta como dia 20
- Vercel: conta como dia 21
```

### 2. 💾 Bancos de Dados Diferentes

Localhost e produção podem estar apontando para bancos distintos.

### 3. 📊 Sincronização Desatualizada

Uma das bases pode ter vendas que a outra não tem.

---

## 🛠️ Como Diagnosticar

### Passo 1: Endpoint de Diagnóstico de Ambiente

**Localhost:**
```
GET http://localhost:3000/api/debug/ambiente?accountId=ID_CONTA_MOSCOU
```

**Vercel:**
```
GET https://seu-dominio.vercel.app/api/debug/ambiente?accountId=ID_CONTA_MOSCOU
```

**O que o endpoint retorna:**
```json
{
  "ambiente": {
    "NODE_ENV": "production",
    "VERCEL": "1",
    "TZ": "UTC",
    "isProduction": true,
    "isVercel": true
  },
  "datas": {
    "serverNow": "2025-10-22T13:07:00.000Z",
    "serverTimezone": "UTC",
    "serverTimezoneOffset": 0,
    "periodoOntem": {
      "start": "2025-10-21T00:00:00.000Z",
      "end": "2025-10-21T23:59:59.999Z"
    }
  },
  "vendas": {
    "total": 45,
    "mercadoLivre": 40,
    "shopee": 5
  },
  "valores": {
    "totalGeral": "10785.61",
    "totalPagas": "10785.61",
    "totalCanceladas": "0.00"
  }
}
```

### Passo 2: Comparar Logs

Acesse o dashboard em AMBOS ambientes e compare os logs:

**Localhost (terminal):**
```bash
[Dashboard Stats] 📅 Calculando ONTEM: {
  serverNow: "2025-10-22T13:07:00-03:00",
  serverTimezone: "America/Sao_Paulo",
  timezoneOffset: 180,
  periodo: {
    start: "2025-10-21T00:00:00-03:00",
    end: "2025-10-21T23:59:59-03:00"
  }
}

[Dashboard Stats] 💰 Valores calculados: {
  vendasProcessadas: 42,
  faturamentoTotal: "9708.32",
  vendasRealizadas: 42
}
```

**Vercel (Vercel Dashboard → Functions → /api/dashboard/stats):**
```bash
[Dashboard Stats] 📅 Calculando ONTEM: {
  serverNow: "2025-10-22T16:07:00.000Z",  // 3 horas de diferença!
  serverTimezone: "UTC",
  timezoneOffset: 0,
  periodo: {
    start: "2025-10-21T00:00:00.000Z",
    end: "2025-10-21T23:59:59.999Z"
  }
}

[Dashboard Stats] 💰 Valores calculados: {
  vendasProcessadas: 45,  // 3 vendas a mais!
  faturamentoTotal: "10785.61",
  vendasRealizadas: 45
}
```

### Passo 3: Verificar DATABASE_URL

**Localhost (.env.local):**
```bash
cat .env.local | grep DATABASE_URL
```

**Vercel:**
1. Acesse Vercel Dashboard
2. Projeto → Settings → Environment Variables
3. Verifique `DATABASE_URL`

Se os databases são diferentes, essa é a causa!

---

## ✅ Soluções

### Solução 1: Forçar UTC em Ambos Ambientes (RECOMENDADO)

**No código** (`src/app/api/dashboard/stats/route.ts`):

Substituir:
```typescript
const now = new Date();
```

Por:
```typescript
const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
```

Ou melhor ainda, sempre trabalhar em UTC e ajustar no frontend.

### Solução 2: Configurar TZ na Vercel

**Vercel Dashboard → Settings → Environment Variables:**
```
TZ=America/Sao_Paulo
```

**⚠️ Atenção:** Isso afeta todas as funções serverless.

### Solução 3: Usar o Mesmo Banco em Ambos

Se os bancos são diferentes, sincronize ou aponte para o mesmo.

---

## 🧪 Testes para Confirmar

### Teste 1: Listar vendas de ontem com hora exata

**Endpoint:**
```
GET /api/debug/ambiente?accountId=ID_CONTA
```

Compare:
- Primeira venda: hora exata
- Última venda: hora exata
- Se há vendas entre 21:00-23:59 do dia 20 ou 00:00-02:59 do dia 21

### Teste 2: Query Manual no Banco

```sql
-- Timezone UTC-3 (localhost)
SELECT COUNT(*), SUM(valor_total)
FROM meli_venda
WHERE data_venda >= '2025-10-21 00:00:00'
  AND data_venda <= '2025-10-21 23:59:59'
  AND status LIKE '%paid%';

-- Timezone UTC (Vercel)
SELECT COUNT(*), SUM(valor_total)
FROM meli_venda
WHERE data_venda >= '2025-10-21 00:00:00+00'
  AND data_venda <= '2025-10-21 23:59:59+00'
  AND status LIKE '%paid%';
```

---

## 📊 Resultado Esperado

Se a causa for **timezone**, você verá:
- ✅ Vercel tem 3-5 vendas a mais
- ✅ Essas vendas estão entre 21:00-23:59 do dia anterior (horário Brasil)
- ✅ Diferença de ~R$ 1.000 é plausível (3-5 vendas × R$ 300 média)

Se a causa for **banco diferente**, você verá:
- ✅ DATABASE_URL diferentes
- ✅ Número total de vendas muito diferente em qualquer período

---

## 🚀 Próximos Passos

1. ✅ Deploy já feito com logs detalhados
2. 🔄 Acesse dashboard na Vercel
3. 📋 Compare logs do console (localhost vs Vercel)
4. 🎯 Use endpoint `/api/debug/ambiente` em ambos
5. 💡 Identifique a causa exata
6. ✏️ Aplique a solução apropriada
