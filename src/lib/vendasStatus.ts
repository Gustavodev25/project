// Vendas Status utilities for frontend

export function isStatusCancelado(status: string): boolean {
  if (!status) return false;
  const statusLower = status.toLowerCase();
  return statusLower.includes('cancelad') ||
         statusLower.includes('cancel') ||
         statusLower === 'cancelled';
}

export function isStatusPago(status: string): boolean {
  if (!status) return false;
  const statusLower = status.toLowerCase();
  return statusLower.includes('pag') ||
         statusLower.includes('paid') ||
         statusLower === 'completed';
}
