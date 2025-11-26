"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Inicia a transição de saída
    setIsTransitioning(true);

    // Aguarda a animação de saída completar
    const exitTimer = setTimeout(() => {
      // Atualiza o conteúdo
      setDisplayChildren(children);

      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        // Inicia a animação de entrada
        setIsTransitioning(false);
      }, 50);
    }, 300); // Duração da animação de saída

    return () => clearTimeout(exitTimer);
  }, [pathname, children]);

  return (
    <div
      className={`page-transition-wrapper ${
        isTransitioning ? "page-transition-exit" : "page-transition-enter"
      }`}
    >
      {displayChildren}
    </div>
  );
}
