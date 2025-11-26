interface HeaderCupomProps {
  onNew: () => void;
}

export default function HeaderCupom({ onNew }: HeaderCupomProps) {
  return (
    <div className="mb-6 text-left">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Cupons</h1>
        <button
          onClick={onNew}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 h-10 rounded-md bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 active:bg-orange-800 transition-colors"
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
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 5l0 14" />
            <path d="M5 12l14 0" />
          </svg>
          Criar cupom
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Gerencie e crie cupons válidos para compras de créditos.
      </p>
    </div>
  );
}

