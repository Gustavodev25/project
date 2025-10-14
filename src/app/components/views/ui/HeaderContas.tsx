interface HeaderContasProps {
  selectedPlatform?: string;
  onBackClick?: () => void;
}

export default function HeaderContas({ selectedPlatform, onBackClick }: HeaderContasProps) {
  if (selectedPlatform) {
    return (
      <div className="mb-6 text-left">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Contas {selectedPlatform}
          </h1>
          <button
            onClick={onBackClick}
            className="text-orange-600 hover:text-orange-800 text-sm font-medium flex items-center justify-center gap-2 px-3 py-2 rounded-md hover:bg-orange-50 transition-colors h-10"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l14 0" />
              <path d="M5 12l4 4" />
              <path d="M5 12l4 -4" />
            </svg>
            Voltar
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600 text-left">
          Gerencie suas contas da plataforma {selectedPlatform}.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 text-left">
      <h1 className="text-2xl font-semibold text-gray-900 text-left">Contas de Plataforma</h1>
      <p className="mt-1 text-sm text-gray-600 text-left">
        Gerencie suas contas de plataformas de e-commerce.
      </p>
    </div>
  );
}
