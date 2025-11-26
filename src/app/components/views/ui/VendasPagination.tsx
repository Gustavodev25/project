"use client";

interface VendasPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  resumoPorConta?: Array<{ conta: string; total: number }>;
}

export default function VendasPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  resumoPorConta
}: VendasPaginationProps) {
  const formatNumber = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        <div>
          Mostrando
          <span className="font-medium text-gray-900 ml-1">
            {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </span>
          <span className="mx-1">-</span>
          <span className="font-medium text-gray-900">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>
          <span className="ml-1">de</span>
          <span className="font-medium text-gray-900 ml-1">{totalItems}</span>
        </div>
        {Array.isArray(resumoPorConta) && resumoPorConta.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {resumoPorConta.map((item) => (
              <span
                key={item.conta || "sem-conta"}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                title={`${item.conta || "Sem conta"} - ${formatNumber(item.total)} vendas`}
              >
                <span className="font-medium">{item.conta || "Sem conta"}</span>
                <span>-</span>
                <span>{formatNumber(item.total)} vendas</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs text-gray-800">
              <span className="font-semibold">Total</span>
              <span>-</span>
              <span>{formatNumber(totalItems)} vendas</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          className="px-3 py-2 text-sm font-medium rounded border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        <div className="flex items-center gap-1">
          {(() => {
            const maxVisiblePages = 10;
            const currentGroup = Math.ceil(currentPage / maxVisiblePages);
            const startPage = (currentGroup - 1) * maxVisiblePages + 1;
            const endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
            
            const pages = [];
            for (let i = startPage; i <= endPage; i++) {
              pages.push(i);
            }
            
            return pages.map((pageNumber) => {
              const isActive = pageNumber === currentPage;
              return (
                <button
                  key={pageNumber}
                  onClick={() => onPageChange(pageNumber)}
                  className={`h-8 w-8 rounded-full text-sm font-medium flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            });
          })()}
        </div>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          className="px-3 py-2 text-sm font-medium rounded border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={currentPage === totalPages}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
