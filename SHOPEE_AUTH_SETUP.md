# Configuração de Autenticação Shopee

## Problema Identificado

O erro HTTP 500 ao acessar `/api/shopee/auth?popup=1` ocorre porque o sistema não consegue determinar a URL de redirect correta para o Shopee.

## Solução

### 1. Configurar Variável de Ambiente no Vercel

Você **DEVE** adicionar a seguinte variável de ambiente no painel da Vercel:

```
SHOPEE_REDIRECT_ORIGIN=https://project-livid-tau.vercel.app
```

**Passos:**

1. Acesse o dashboard da Vercel: https://vercel.com/dashboard
2. Vá em **Settings** > **Environment Variables**
3. Adicione:
   - **Name:** `SHOPEE_REDIRECT_ORIGIN`
   - **Value:** `https://project-livid-tau.vercel.app`
   - **Environment:** Marque `Production`, `Preview`, e `Development`
4. Clique em **Save**
5. **IMPORTANTE:** Faça um novo deploy para aplicar as mudanças

### 2. Verificar Configuração no Painel Shopee

No painel do Shopee Partner, verifique que está configurado:

```
Live Redirect URL Domain: https://project-livid-tau.vercel.app
```

**NOTA:** Não adicione barra `/` no final, conforme você já configurou corretamente.

### 3. URLs Utilizadas

Quando configurado corretamente, o sistema usará:

- **Redirect URL:** `https://project-livid-tau.vercel.app/api/shopee/callback`
- **Auth URL:** `https://project-livid-tau.vercel.app/api/shopee/auth?popup=1`

## Verificação

Após configurar a variável de ambiente e fazer o deploy:

1. Acesse: `https://project-livid-tau.vercel.app/api/shopee/auth?popup=1`
2. Deve redirecionar para a página de autorização do Shopee
3. Após autorizar, deve retornar para `/api/shopee/callback`

## Logs de Debug

Os logs agora mostram informações úteis no console da Vercel:

```
[Shopee Auth] Iniciando autenticação: {
  hasPartnerId: true,
  hasPartnerKey: true,
  redirectOrigin: 'https://project-livid-tau.vercel.app',
  host: 'project-livid-tau.vercel.app'
}
[Shopee Auth] URL de autorização gerada: https://partner.shopeemobile.com/api/...
```

Se `redirectOrigin` aparecer como `NÃO DEFINIDO`, a variável de ambiente não está configurada.

## Erro Comum

Se você ver este erro:

```json
{
  "error": "Erro ao iniciar autenticação Shopee",
  "details": "Não foi possível determinar o host público atual para Shopee.",
  "suggestion": "Verifique se a variável SHOPEE_REDIRECT_ORIGIN está configurada corretamente no .env"
}
```

**Causa:** Variável `SHOPEE_REDIRECT_ORIGIN` não configurada no ambiente.

**Solução:** Siga os passos acima para adicionar a variável no Vercel.
