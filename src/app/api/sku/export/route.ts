import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySessionToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

// GET /api/sku/export - Exportar Excel
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const session = await verifySessionToken(sessionCookie);

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || '';
    const ativo = searchParams.get('ativo');

    // Construir filtros
    const where: any = {
      userId: session.sub,
    };

    if (tipo) {
      where.tipo = tipo;
    }

    if (ativo !== null) {
      where.ativo = ativo === 'true';
    }

    // Buscar SKUs
    const skus = await prisma.sKU.findMany({
      where,
      orderBy: [
        { tipo: 'desc' },
        { sku: 'asc' },
      ],
      include: {
        custoHistorico: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Preparar dados para Excel
    const excelData = skus.map(sku => ({
      'SKU': sku.sku,
      'Produto': sku.produto,
      'Tipo': sku.tipo === 'pai' ? 'Kit' : 'Individual',
      'SKU Pai': sku.skuPai || '',
      'Custo Unitário': sku.custoUnitario.toString(),
      'Quantidade': sku.quantidade.toString(),
      'Hierarquia 1': sku.hierarquia1 || '',
      'Hierarquia 2': sku.hierarquia2 || '',
      'Ativo': sku.ativo ? 'Sim' : 'Não',
      'Tem Estoque': sku.temEstoque ? 'Sim' : 'Não',
      'SKUs Filhos': sku.skusFilhos ? JSON.parse(sku.skusFilhos as string).join(', ') : '',
      'Observações': sku.observacoes || '',
      'Tags': sku.tags ? JSON.parse(sku.tags as string).join(', ') : '',
      'Data Criação': sku.createdAt.toISOString().split('T')[0],
      'Última Atualização': sku.updatedAt.toISOString().split('T')[0],
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 15 }, // SKU
      { wch: 30 }, // Produto
      { wch: 12 }, // Tipo
      { wch: 15 }, // SKU Pai
      { wch: 15 }, // Custo Unitário
      { wch: 12 }, // Quantidade
      { wch: 20 }, // Hierarquia 1
      { wch: 20 }, // Hierarquia 2
      { wch: 8 },  // Ativo
      { wch: 12 }, // Tem Estoque
      { wch: 30 }, // SKUs Filhos
      { wch: 30 }, // Observações
      { wch: 20 }, // Tags
      { wch: 12 }, // Data Criação
      { wch: 15 }, // Última Atualização
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'SKUs');

    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Retornar arquivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="skus_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Erro ao exportar SKUs:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/sku/import - Importar Excel
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const session = await verifySessionToken(token);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Formato de arquivo não suportado. Use .xlsx ou .xls' },
        { status: 400 }
      );
    }

    // Ler arquivo
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      errors: [] as string[],
      skipped: 0,
    };

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        // Validar campos obrigatórios
        if (!row.SKU || !row.Produto || !row['Custo Unitário']) {
          results.errors.push(`Linha ${i + 2}: SKU, Produto e Custo Unitário são obrigatórios`);
          continue;
        }

        // Verificar se SKU já existe
        const existingSku = await prisma.sKU.findFirst({
          where: {
            userId: session.sub,
            sku: row.SKU,
          },
        });

        if (existingSku) {
          results.skipped++;
          continue;
        }

        // Criar SKU
        const skuData = {
          userId: session.sub,
          sku: row.SKU,
          produto: row.Produto,
          tipo: row.Tipo === 'Kit' ? 'pai' : 'filho',
          skuPai: row['SKU Pai'] || null,
          custoUnitario: parseFloat(row['Custo Unitário']) || 0,
          quantidade: parseInt(row.Quantidade) || 0,
          hierarquia1: row['Hierarquia 1'] || null,
          hierarquia2: row['Hierarquia 2'] || null,
          ativo: row.Ativo === 'Sim' || row.Ativo === true,
          temEstoque: row['Tem Estoque'] === 'Sim' || row['Tem Estoque'] === true,
          skusFilhos: row['SKUs Filhos'] ? JSON.stringify(row['SKUs Filhos'].split(',').map((s: string) => s.trim())) : null,
          observacoes: row.Observações || null,
          tags: row.Tags ? JSON.stringify(row.Tags.split(',').map((s: string) => s.trim())) : null,
        };

        const newSku = await prisma.sKU.create({
          data: skuData,
        });

        // Criar histórico de custo
        await prisma.sKUCustoHistorico.create({
          data: {
            skuId: newSku.id,
            userId: session.sub,
            custoNovo: skuData.custoUnitario,
            quantidade: skuData.quantidade,
            motivo: 'Importação via Excel',
            tipoAlteracao: 'importacao',
            alteradoPor: session.sub,
          },
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    return NextResponse.json({
      message: 'Importação concluída',
      results,
    });
  } catch (error) {
    console.error('Erro ao importar SKUs:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
