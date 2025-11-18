#!/bin/bash

# Script para fazer push para backend e frontend simultaneamente
# Uso: ./scripts/push-to-production.sh "mensagem de commit"

set -e  # Sair se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se mensagem de commit foi fornecida
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Mensagem de commit necessária${NC}"
    echo "Uso: ./scripts/push-to-production.sh \"mensagem de commit\""
    exit 1
fi

COMMIT_MSG="$1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Deploy para Produção${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se há mudanças para commitar
if [[ -z $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Nenhuma mudança detectada${NC}"
    read -p "Deseja fazer push das mudanças já commitadas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo -e "${GREEN}📝 Commitando mudanças...${NC}"
    git add .
    git commit -m "$COMMIT_MSG"
fi

echo ""
echo -e "${GREEN}🔍 Verificando remotes configurados...${NC}"

# Verificar se remotes existem
if ! git remote get-url backend > /dev/null 2>&1; then
    echo -e "${RED}❌ Remote 'backend' não encontrado${NC}"
    echo -e "${YELLOW}Adicione com: git remote add backend https://github.com/Gustavodev25/project-backend.git${NC}"
    exit 1
fi

if ! git remote get-url frontend > /dev/null 2>&1; then
    echo -e "${RED}❌ Remote 'frontend' não encontrado${NC}"
    echo -e "${YELLOW}Adicione com: git remote add frontend https://github.com/Gustavodev25/project.git${NC}"
    exit 1
fi

BACKEND_URL=$(git remote get-url backend)
FRONTEND_URL=$(git remote get-url frontend)

echo -e "${GREEN}✅ Backend: ${NC}$BACKEND_URL"
echo -e "${GREEN}✅ Frontend: ${NC}$FRONTEND_URL"
echo ""

# Push para backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 Fazendo push para BACKEND (Render)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if git push backend main; then
    echo ""
    echo -e "${GREEN}✅ Backend push concluído!${NC}"
else
    echo ""
    echo -e "${RED}❌ Erro ao fazer push para backend${NC}"
    exit 1
fi

echo ""

# Push para frontend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 Fazendo push para FRONTEND (Vercel)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if git push frontend main; then
    echo ""
    echo -e "${GREEN}✅ Frontend push concluído!${NC}"
else
    echo ""
    echo -e "${RED}❌ Erro ao fazer push para frontend${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Deploy iniciado com sucesso!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 Próximos passos:${NC}"
echo ""
echo -e "1. ${BLUE}Render:${NC}   https://dashboard.render.com"
echo -e "   → Aguarde build completar (~5-10 min)"
echo ""
echo -e "2. ${BLUE}Vercel:${NC}   https://vercel.com/dashboard"
echo -e "   → Aguarde build completar (~2-5 min)"
echo ""
echo -e "3. ${BLUE}Testar:${NC}   Abra seu frontend e teste o login"
echo ""
echo -e "${GREEN}🎉 Pronto para monitorar os deploys!${NC}"
echo ""
