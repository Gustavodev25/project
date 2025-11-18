# Configurar Git Remotes

## 📋 Visão Geral

Você precisa configurar 2 remotes Git:

1. **backend** → Aponta para `https://github.com/Gustavodev25/project-backend.git` (Render)
2. **frontend** → Aponta para `https://github.com/Gustavodev25/project.git` (Vercel)

## 🔧 Configuração Inicial

### 1. Verificar remotes atuais

```bash
git remote -v
```

Você verá algo como:
```
origin  https://github.com/... (fetch)
origin  https://github.com/... (push)
```

### 2. Adicionar remote do backend

```bash
git remote add backend https://github.com/Gustavodev25/project-backend.git
```

### 3. Adicionar remote do frontend

```bash
git remote add frontend https://github.com/Gustavodev25/project.git
```

### 4. Verificar configuração

```bash
git remote -v
```

Agora deve mostrar:
```
backend   https://github.com/Gustavodev25/project-backend.git (fetch)
backend   https://github.com/Gustavodev25/project-backend.git (push)
frontend  https://github.com/Gustavodev25/project.git (fetch)
frontend  https://github.com/Gustavodev25/project.git (push)
origin    https://github.com/... (fetch)
origin    https://github.com/... (push)
```

## 🚀 Como Usar

### Fazer push para backend (Render)
```bash
git push backend main
```
ou
```bash
npm run deploy:backend
```

### Fazer push para frontend (Vercel)
```bash
git push frontend main
```
ou
```bash
npm run deploy:frontend
```

### Fazer push para ambos
```bash
git push backend main && git push frontend main
```
ou
```bash
npm run deploy:all
```

### Usando o script PowerShell (Windows)
```powershell
.\scripts\push-to-production.ps1 "mensagem de commit"
```

### Usando o script Bash (Linux/Mac)
```bash
chmod +x scripts/push-to-production.sh
./scripts/push-to-production.sh "mensagem de commit"
```

## 🔄 Workflow Recomendado

### Desenvolvimento local
```bash
# 1. Fazer mudanças no código
# 2. Testar localmente
npm run dev

# 3. Verificar ambiente
npm run verify:env

# 4. Commitar mudanças
git add .
git commit -m "feat: nova funcionalidade"
```

### Deploy para produção
```bash
# Opção 1: Push manual
git push backend main
git push frontend main

# Opção 2: Usando npm scripts
npm run deploy:all

# Opção 3: Usando script helper (Windows)
.\scripts\push-to-production.ps1 "feat: nova funcionalidade"
```

## 📝 Estrutura Recomendada

### Se você quiser manter origin como frontend:
```bash
git remote rename origin frontend
git remote add backend https://github.com/Gustavodev25/project-backend.git
```

Resultado:
```
backend   → project-backend (Render)
frontend  → project (Vercel) [também é o origin]
```

### Se você quiser origin separado:
```bash
# Manter origin como está
git remote add backend https://github.com/Gustavodev25/project-backend.git
git remote add frontend https://github.com/Gustavodev25/project.git
```

Resultado:
```
origin    → seu repositório principal
backend   → project-backend (Render)
frontend  → project (Vercel)
```

## 🔍 Comandos Úteis

### Ver todos os remotes
```bash
git remote -v
```

### Ver detalhes de um remote
```bash
git remote show backend
git remote show frontend
```

### Remover um remote
```bash
git remote remove backend
git remote remove frontend
```

### Renomear um remote
```bash
git remote rename old-name new-name
```

### Mudar URL de um remote
```bash
git remote set-url backend https://nova-url.git
```

### Fetch de um remote específico
```bash
git fetch backend
git fetch frontend
```

### Ver branches remotas
```bash
git branch -r
```

## ⚠️ Importante

### 1. Branches
- Certifique-se de estar na branch `main`:
```bash
git branch
# Deve mostrar * main
```

- Se não estiver, mude para main:
```bash
git checkout main
```

### 2. Primeira vez
Na primeira vez, você pode precisar configurar upstream:
```bash
git push -u backend main
git push -u frontend main
```

Depois disso, pode usar apenas:
```bash
git push backend main
git push frontend main
```

### 3. Conflitos
Se houver conflitos, você precisará resolver antes de fazer push:
```bash
# Pull do remote
git pull backend main

# Resolver conflitos
# ... editar arquivos ...

# Commitar merge
git add .
git commit -m "merge: resolver conflitos"

# Push
git push backend main
```

## 🎯 Checklist de Configuração

- [ ] Remote `backend` adicionado
- [ ] Remote `frontend` adicionado
- [ ] `git remote -v` mostra ambos corretamente
- [ ] Teste de push para backend: `git push backend main`
- [ ] Teste de push para frontend: `git push frontend main`
- [ ] Scripts npm funcionando: `npm run deploy:all`

## 🆘 Troubleshooting

### "fatal: remote backend already exists"
```bash
# Remover e adicionar novamente
git remote remove backend
git remote add backend https://github.com/Gustavodev25/project-backend.git
```

### "Permission denied (publickey)"
```bash
# Verificar se está autenticado no GitHub
gh auth status

# Ou configurar credenciais
git config --global credential.helper store
```

### "Updates were rejected because the remote contains work"
```bash
# Pull primeiro, depois push
git pull backend main --rebase
git push backend main
```

### "You have not concluded your merge"
```bash
# Completar ou abortar merge pendente
git merge --abort  # ou
git merge --continue
```

## 📚 Links Úteis

- [Git Remotes - Documentação Oficial](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)
- [GitHub - Managing Remotes](https://docs.github.com/en/get-started/getting-started-with-git/managing-remote-repositories)
- [Quick Deploy Guide](./QUICK_DEPLOY_GUIDE.md)

---

**Próximo passo:** Depois de configurar os remotes, siga o [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)
