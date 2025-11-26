"use client";

// Tipos para as contas conectadas
interface ContaConectada {
  id: string;
  nickname: string | null;
  ml_user_id: number;
  expires_at: string;
}

// Componente de Avatar da Conta
interface AvatarContaProps {
  conta: ContaConectada;
}

export default function AvatarConta({ conta }: AvatarContaProps) {
  const nomeExibicao = conta.nickname || `Usuário ${conta.ml_user_id}`;
  const inicial = nomeExibicao.charAt(0).toUpperCase();
  
  return (
    <div className="group relative inline-flex items-center">
      {/* Círculo com inicial - tamanho reduzido */}
      <div className="relative bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ease-out group-hover:rounded-lg group-hover:shadow-lg cursor-default backdrop-blur-sm overflow-hidden w-6 h-6 group-hover:w-auto group-hover:h-6 group-hover:px-2 group-hover:min-w-[1.5rem]">
        <span className="transition-all duration-300 ease-out group-hover:opacity-0 group-hover:blur-sm group-hover:scale-90 absolute">
          {inicial}
        </span>
        <span className="opacity-0 blur-sm scale-110 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:blur-none group-hover:scale-100 whitespace-nowrap text-xs px-1">
          {nomeExibicao}
        </span>
      </div>
      
      {/* Tooltip para telas menores */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out pointer-events-none whitespace-nowrap z-10 md:hidden backdrop-blur-sm">
        {nomeExibicao}
      </div>
    </div>
  );
}

export type { ContaConectada, AvatarContaProps };
