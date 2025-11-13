#!/bin/bash
# Script para fazer merge e push para produção (main)

echo "🚀 Fazendo merge para produção (main)..."
echo ""

# Checkout para main
echo "📌 Checkout para main..."
git checkout main

# Pull das últimas mudanças
echo "⬇️ Baixando últimas mudanças..."
git pull origin main

# Merge da branch feature
echo "🔀 Fazendo merge da branch feature..."
git merge claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi --no-edit

# Verificar se houve conflitos
if [ $? -ne 0 ]; then
  echo "❌ Erro no merge! Resolva os conflitos e execute 'git push origin main'"
  exit 1
fi

# Mostrar commits que serão enviados
echo ""
echo "📊 Commits que serão enviados para produção:"
git log origin/main..main --oneline

echo ""
echo "🚀 Fazendo push para produção..."

# Tentar push
if git push origin main; then
  echo ""
  echo "✅ SUCESSO! Deploy para produção realizado!"
  echo ""
  echo "🌐 Aguarde 2-3 minutos para o Vercel fazer o deploy"
  echo "🔍 Acompanhe em: https://vercel.com/dashboard"
  echo ""
else
  echo ""
  echo "❌ Erro ao fazer push!"
  echo ""
  echo "💡 Solução alternativa:"
  echo "1. Acesse: https://vercel.com/dashboard"
  echo "2. Vá em: Deployments"
  echo "3. Encontre o deploy da branch: claude/fix-mercado-livre-sync-011CV6CD9AC8nWRCoTX9EiKi"
  echo "4. Clique em '...' → 'Promote to Production'"
  echo ""
  exit 1
fi
