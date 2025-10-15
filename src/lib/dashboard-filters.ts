/**
 * Helper functions para filtros do dashboard
 * Centraliza a lógica de filtros para garantir consistência entre todos os endpoints
 */

export type StatusFilter = 'pagos' | 'cancelados' | 'todos';

/**
 * Cria filtro de status que funciona tanto para Mercado Livre quanto Shopee
 * - Mercado Livre: 'paid' para pagos, 'cancelled' para cancelados
 * - Shopee: 'COMPLETED' para pagos, 'CANCELLED' para cancelados
 */
export function getStatusWhere(statusParam?: string | null) {
  if (statusParam === 'cancelados') {
    return {
      OR: [
        { status: { contains: 'cancel', mode: 'insensitive' as const } },
        { status: { contains: 'cancelled', mode: 'insensitive' as const } }
      ]
    };
  }

  if (statusParam === 'todos') {
    return {};
  }

  // Padrão: apenas vendas pagas/completas
  return {
    OR: [
      { status: { contains: 'paid', mode: 'insensitive' as const } }, // Mercado Livre
      { status: { contains: 'completed', mode: 'insensitive' as const } } // Shopee
    ]
  };
}

/**
 * Cria filtro de canal/plataforma
 */
export function getCanalWhere(canalParam?: string | null) {
  if (canalParam === 'shopee') {
    return { plataforma: { contains: 'shopee', mode: 'insensitive' as const } };
  }

  if (canalParam === 'mercado_livre') {
    return { plataforma: { contains: 'mercado', mode: 'insensitive' as const } };
  }

  return {};
}

/**
 * Cria filtro de tipo de anúncio (apenas Mercado Livre)
 */
export function getTipoAnuncioWhere(tipoParam?: string | null) {
  if (tipoParam === 'catalogo') {
    return {
      OR: [
        { tipoAnuncio: { contains: 'catalog', mode: 'insensitive' as const } },
        { tipoAnuncio: { contains: 'catálogo', mode: 'insensitive' as const } }
      ]
    };
  }

  if (tipoParam === 'proprio') {
    return {
      OR: [
        { tipoAnuncio: { contains: 'proprio', mode: 'insensitive' as const } },
        { tipoAnuncio: { contains: 'próprio', mode: 'insensitive' as const } }
      ]
    };
  }

  return {};
}

/**
 * Cria filtro de modalidade de envio (apenas Mercado Livre)
 */
export function getModalidadeWhere(modalidadeParam?: string | null) {
  if (modalidadeParam === 'full') {
    return { logisticType: { contains: 'fulfill', mode: 'insensitive' as const } };
  }

  if (modalidadeParam === 'flex') {
    return { logisticType: { contains: 'flex', mode: 'insensitive' as const } };
  }

  if (modalidadeParam === 'me') {
    return {
      NOT: [
        { logisticType: { contains: 'fulfill', mode: 'insensitive' as const } },
        { logisticType: { contains: 'flex', mode: 'insensitive' as const } }
      ]
    };
  }

  return {};
}
