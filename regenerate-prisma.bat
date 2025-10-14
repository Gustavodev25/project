@echo off
echo Executando regeneracao do cliente Prisma...
echo.

REM Tentar fechar qualquer processo que possa estar usando o arquivo
taskkill /f /im node.exe 2>nul
taskkill /f /im "Next.js" 2>nul

REM Aguardar um pouco
timeout /t 2 /nobreak >nul

REM Tentar regenerar o cliente
echo Tentando regenerar cliente Prisma...
npx prisma generate

if %errorlevel% neq 0 (
    echo.
    echo Erro ao regenerar cliente. Tentando alternativa...
    echo.
    
    REM Tentar deletar o arquivo problemático
    if exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
        echo Deletando arquivo problemático...
        del /f "node_modules\.prisma\client\query_engine-windows.dll.node" 2>nul
    )
    
    REM Tentar novamente
    echo Tentando novamente...
    npx prisma generate
    
    if %errorlevel% neq 0 (
        echo.
        echo Ainda com erro. Execute manualmente:
        echo 1. Feche todos os processos Node.js
        echo 2. Execute: npx prisma generate
        echo 3. Ou reinicie o computador e tente novamente
    ) else (
        echo.
        echo Sucesso! Cliente Prisma regenerado.
    )
) else (
    echo.
    echo Sucesso! Cliente Prisma regenerado.
)

echo.
echo Pressione qualquer tecla para continuar...
pause >nul
