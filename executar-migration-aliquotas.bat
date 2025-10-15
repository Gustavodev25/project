@echo off
echo ====================================
echo Executando Migration de Aliquotas
echo ====================================
echo.

REM Le a DATABASE_URL do arquivo .env
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DATABASE_URL=%%a

if "%DATABASE_URL%"=="" (
    echo ERRO: DATABASE_URL nao encontrada no arquivo .env
    pause
    exit /b 1
)

echo Conectando ao banco de dados...
echo.

REM Executa a migration usando Prisma
npx prisma db execute --file prisma/migrations/add_aliquota_imposto.sql --schema prisma/schema.prisma

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo Migration executada com sucesso!
    echo ====================================
    echo.
    echo Agora executando prisma generate...
    npx prisma generate
    echo.
    echo Pronto! Reinicie o servidor Next.js
) else (
    echo.
    echo ERRO ao executar migration!
    echo Verifique as credenciais do banco de dados
)

echo.
pause
