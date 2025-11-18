# Configuração Backend Render - Instruções

## 🎯 Duas Formas de Usar

Você pode escolher entre **duas configurações**:

### ✅ Opção 1: Backend LOCAL (Recomendado para desenvolvimento)
- **Quando usar:** Desenvolvendo localmente, testando features
- **Configuração:** `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=false`
- **Como funciona:**
  - Frontend: `http://localhost:3000`
  - Backend API: `http://localhost:3000/api/*` (mesma origem)
  - Callbacks OAuth: `https://project-backend-rjoh.onrender.com/api/*/callback`
- **Vantagens:**
  - ✅ Mais rápido (sem latência de rede)
  - ✅ Funciona offline
  - ✅ Não precisa esperar "cold start" do Render
  - ✅ Cookies funcionam automaticamente (mesma origem)

### 🌐 Opção 2: Backend RENDER (Para simular produção)
- **Quando usar:** Testando integração com backend remoto, simulando produção
- **Configuração:** `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true`
- **Como funciona:**
  - Frontend: `http://localhost:3000`
  - Backend API: `https://project-backend-rjoh.onrender.com/api/*`
  - Callbacks OAuth: `https://project-backend-rjoh.onrender.com/api/*/callback`
- **Requisitos:**
  - ⚠️ Backend Render deve estar online e atualizado
  - ⚠️ CORS deve estar configurado corretamente
  - ⚠️ Pode ter "cold start" (30s-2min na primeira requisição)

---

## 🔧 Mudanças Realizadas

Configurei o projeto para suportar ambas as opções acima:

### Arquivos Modificados:

1. **[.env.local](.env.local)** - Atualizado redirect URIs:
   - `MELI_REDIRECT_URI="https://project-backend-rjoh.onrender.com/api/meli/callback"`
   - `SHOPEE_REDIRECT_URI="https://project-backend-rjoh.onrender.com/api/shopee/callback"`
   - `BLING_REDIRECT_URI="https://project-backend-rjoh.onrender.com/api/bling/callback"`
   - Adicionado `MELI_REDIRECT_ORIGIN="http://localhost:3000"`
   - Adicionado `SHOPEE_REDIRECT_ORIGIN="http://localhost:3000"`

2. **[src/lib/cors.ts](src/lib/cors.ts)** - Adicionado `127.0.0.1:3000` às origens permitidas

3. **[src/hooks/useAuth.ts](src/hooks/useAuth.ts)** - Atualizado para usar `API_CONFIG.fetch` na rota `/api/auth/me`

4. **[src/app/api/auth/me/route.ts](src/app/api/auth/me/route.ts)** - Adicionado handler `OPTIONS` para CORS

## ⚠️ IMPORTANTE: Configurar no Mercado Livre

Você **PRECISA** atualizar a URL de callback no painel de desenvolvedores do Mercado Livre:

### Passo a passo:

1. Acesse: https://developers.mercadolivre.com.br/devcenter
2. Entre com suas credenciais
3. Vá em "Minhas aplicações"
4. Selecione sua aplicação (ID: `4762241412857004`)
5. Em "Redirect URI" ou "URLs de redirecionamento", **ADICIONE** (não substitua):
   ```
   https://project-backend-rjoh.onrender.com/api/meli/callback
   ```
6. Salve as alterações

**ATENÇÃO:** Mantenha também a URL antiga (`http://localhost:3000/api/meli/callback`) caso queira testar localmente no futuro.

## 🔄 Mesma configuração para Shopee e Bling

Se você usar Shopee e Bling, precisará fazer o mesmo:

### Shopee:
- Painel: https://partner.shopeemobile.com/
- Adicionar: `https://project-backend-rjoh.onrender.com/api/shopee/callback`

### Bling:
- Painel: https://developer.bling.com.br/
- Adicionar: `https://project-backend-rjoh.onrender.com/api/bling/callback`

## 🧪 Como Testar

### Configuração Atual (Backend Local):

Atualmente, o projeto está configurado com `NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=false` para usar o **backend local**.

1. **Reinicie o servidor local:**
   ```bash
   npm run dev
   ```

2. **Limpe o cache do navegador** ou use Ctrl+Shift+R para forçar reload

3. **Faça login** no sistema
   - Login será feito localmente em `http://localhost:3000/api/auth/login`
   - Cookie `session` será criado para `localhost:3000`

4. **Tente carregar vendas:**
   - Vá em `/vendas/mercado-livre`
   - As vendas devem carregar normalmente (sem erro 401)
   - Todas as chamadas de API vão para `http://localhost:3000/api/*`

5. **Para conectar uma conta do Mercado Livre:**
   - Vá em `/contas` ou `/vendas/mercado-livre`
   - Clique em "Conectar Conta"
   - Você será redirecionado para o Mercado Livre
   - Após autorizar, você será redirecionado para o **Render** (`https://project-backend-rjoh.onrender.com/api/meli/callback`)
   - O Render salvará a conta no banco e redirecionará de volta para `http://localhost:3000/contas`
   - ⚠️ **Importante:** Configure o callback no Mercado Livre primeiro (veja seção abaixo)

### Se quiser testar com Backend Render:

1. Altere no [.env.local](.env.local):
   ```env
   NEXT_PUBLIC_FORCE_EXTERNAL_BACKEND=true
   ```

2. Reinicie o servidor: `npm run dev`

3. Aguarde o "cold start" do Render (primeira requisição pode demorar 30s-2min)

4. Faça login novamente (novo cookie será criado)

## 🔍 Verificando se está funcionando

### Como saber qual backend está sendo usado:

Abra o console do navegador (F12) e veja as mensagens de log. Exemplo:

**Backend Local:**
```
[useVendas] 🔗 Usando backend: local
```

**Backend Render:**
```
[useVendas] 🔗 Usando backend: https://project-backend-rjoh.onrender.com
```

Você também pode verificar a aba Network (F12 → Network) e ver para onde as requisições estão indo:
- Local: `http://localhost:3000/api/...`
- Render: `https://project-backend-rjoh.onrender.com/api/...`

### Sinais de sucesso:
- ✅ Login funciona normalmente
- ✅ Ao conectar conta do Mercado Livre, você é redirecionado para o Render
- ✅ Após callback, você volta para `/contas` com mensagem de sucesso
- ✅ As vendas são carregadas sem erro 401

### Se ainda der erro 401:

1. **Verifique se o backend Render está online:**
   ```bash
   curl https://project-backend-rjoh.onrender.com/api/auth/me
   ```
   Deve retornar 401 (é normal sem cookie)

2. **Verifique se os cookies estão sendo enviados:**
   - Abra DevTools (F12)
   - Vá em Network
   - Faça login
   - Verifique se o cookie `session` está sendo definido
   - Verifique se as próximas requisições estão enviando o cookie

3. **Verifique se o CORS está funcionando:**
   - No console do navegador, não deve haver erros de CORS
   - Os headers `Access-Control-Allow-Origin` devem estar presentes

## 🚀 Próximos Passos

Se tudo funcionar localmente, você pode fazer deploy do frontend para Vercel:

1. No Vercel, adicione as mesmas variáveis de ambiente do `.env.local`
2. Adicione a URL do Vercel nas configurações de callback das plataformas
3. Faça deploy!

## 📝 Notas Técnicas

### Por que usar Render para callbacks?

Os callbacks OAuth precisam de um endpoint HTTPS publicamente acessível. Como você está desenvolvendo em `localhost:3000`, as plataformas (Mercado Livre, Shopee, Bling) não conseguem redirecionar para seu computador.

A solução é usar o backend no Render para receber o callback, criar a sessão lá, e então redirecionar de volta para o frontend.

### Fluxo de autenticação:

1. Usuário clica em "Conectar Conta" no frontend (`localhost:3000`)
2. Frontend redireciona para `/api/meli/auth` (que pode ser local ou Render)
3. API redireciona para Mercado Livre com `redirect_uri=https://project-backend-rjoh.onrender.com/api/meli/callback`
4. Usuário autoriza no Mercado Livre
5. Mercado Livre redireciona para `https://project-backend-rjoh.onrender.com/api/meli/callback?code=...`
6. Backend Render:
   - Troca o code por access_token
   - Salva no banco de dados
   - Redireciona para `http://localhost:3000/contas?meli_connected=true`
7. Frontend mostra mensagem de sucesso

### Como os cookies funcionam entre domínios?

O backend Render define o cookie `session` com `SameSite=None; Secure`, permitindo que seja enviado em requisições cross-origin (de `localhost:3000` para `project-backend-rjoh.onrender.com`).

Todas as chamadas de API usam `credentials: "include"` para enviar os cookies.

## ❓ Troubleshooting

### "Erro 401" ao carregar vendas:
- Verifique se você está logado
- Limpe os cookies e faça login novamente
- Verifique se o backend Render está online

### "CORS error" no console:
- Verifique se `localhost:3000` está em `ALLOWED_ORIGINS` no arquivo [src/lib/cors.ts](src/lib/cors.ts)
- Verifique se as rotas têm o handler `OPTIONS` com `withCors`

### "Invalid redirect_uri" no Mercado Livre:
- Verifique se você adicionou `https://project-backend-rjoh.onrender.com/api/meli/callback` no painel de desenvolvedores
- Verifique se a URL está exatamente igual (sem barra no final)

### Callback redireciona mas não conecta a conta:
- Verifique se o cookie `session` existe no navegador
- Verifique se a variável `DATABASE_URL` está correta no Render
- Verifique os logs do Render para ver se houve erro ao salvar no banco

## 📞 Ajuda

Se precisar de ajuda, verifique:
1. Logs do navegador (F12 → Console)
2. Logs do servidor local (terminal onde rodou `npm run dev`)
3. Logs do Render (https://dashboard.render.com)

---

**Data de criação:** 2025-11-18
**Autor:** Claude Code
