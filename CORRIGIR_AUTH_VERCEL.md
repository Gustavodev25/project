# 🔧 Corrigir Autenticação 401 no Vercel

## Problema
O frontend no Vercel está tentando acessar o backend Render diretamente, mas o cookie de sessão não é enviado porque são domínios diferentes.

## Solução

### Opção 1: Remover NEXT_PUBLIC_API_URL (RECOMENDADO)

1. Acesse: https://vercel.com/gustavodev25s-projects/project/settings/environment-variables

2. **Remova** a variável `NEXT_PUBLIC_API_URL`

3. **Mantenha** apenas `API_URL` (para uso interno do servidor)

4. Faça redeploy:
   - Vá em: https://vercel.com/gustavodev25s-projects/project
   - Clique em "Deployments"
   - No último deploy, clique nos "..." e "Redeploy"

### Opção 2: Usar API Routes como Proxy

Se precisar manter o backend externo, configure assim:

**No Vercel:**
- `API_URL` = `https://project-backend-rjoh.onrender.com` (servidor apenas)
- **REMOVA** `NEXT_PUBLIC_API_URL` (não deve ser público)

**No código:** As rotas `/api/*` do Next.js farão proxy para o backend automaticamente.

## Verificação

Após o redeploy:

1. Abra o console do navegador (F12)
2. Vá em Network
3. Tente conectar uma conta do Mercado Livre
4. As requisições devem ir para `project-livid-tau.vercel.app/api/meli/accounts`
5. **NÃO** deve ir direto para `project-backend-rjoh.onrender.com`

## Como funciona

```
Frontend (Vercel)  →  API Routes Next.js (mesma origem, envia cookie)
                   →  Backend Render (chamada servidor-lado)
```

Ao invés de:

```
Frontend (Vercel)  →  Backend Render (domínio diferente, sem cookie) ❌
```

## Comandos Git (se quiser forçar localmente)

```bash
# No .env.local (desenvolvimento)
# NEXT_PUBLIC_API_URL= (deixar vazio ou comentar)
API_URL=http://localhost:3000

# No Vercel (produção)
# Remover NEXT_PUBLIC_API_URL completamente
API_URL=https://project-backend-rjoh.onrender.com
```
