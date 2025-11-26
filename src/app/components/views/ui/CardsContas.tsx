"use client";

import {
  useEffect,
  useRef,
  memo,
  useId,
  forwardRef,
  ReactNode,
} from "react";
import gsap from "gsap";
import { motion, LazyMotion, domAnimation } from "framer-motion";

// Interfaces para TypeScript
interface IconContainerProps {
  children: ReactNode;
  variant: "left" | "center" | "right";
  className?: string;
  theme?: "light" | "dark" | "neutral";
}

interface MultiIconDisplayProps {
  icons: ReactNode[];
  theme?: "light" | "dark" | "neutral";
}

interface BackgroundProps {
  theme?: "light" | "dark" | "neutral";
}

interface ActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icons?: ReactNode[];
  action?: ActionProps;
  footer?: ReactNode;
  variant?: "default" | "subtle" | "error";
  size?: "sm" | "default" | "lg";
  theme?: "light" | "dark" | "neutral";
  isIconAnimated?: boolean;
  className?: string;
}

// Componente Skeleton para usar quando necessário
export function CardsContasSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-gray-200 p-4 h-28 flex items-center space-x-4"
        >
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Constantes para animações do EmptyState
const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      rotate: -6,
      transition: { duration: 0.4, delay: 0.1 },
    },
    hover: {
      x: -22,
      y: -5,
      rotate: -15,
      scale: 1.1,
      transition: { duration: 0.2 },
    },
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, delay: 0.2 },
    },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } },
  },
  right: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 6,
      transition: { duration: 0.4, delay: 0.3 },
    },
    hover: {
      x: 22,
      y: -5,
      rotate: 15,
      scale: 1.1,
      transition: { duration: 0.2 },
    },
  },
};

const CONTENT_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
};

const BUTTON_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
};

// Função utilitária para classes CSS
export const cn = (
  ...classes: (string | undefined | null | boolean)[]
): string => classes.filter(Boolean).join(" ");

// Componente IconContainer
const IconContainer = memo(
  ({ children, variant, className = "", theme }: IconContainerProps) => (
    <motion.div
      variants={ICON_VARIANTS[variant]}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center relative shadow-lg transition-all duration-300",
        theme === "dark" &&
          "bg-neutral-800 border border-neutral-700 group-hover:shadow-xl group-hover:border-neutral-600",
        theme === "neutral" &&
          "bg-stone-100 border border-stone-200 group-hover:shadow-xl group-hover:border-stone-300",
        (!theme || theme === "light") &&
          "bg-white border border-gray-200 group-hover:shadow-xl group-hover:border-gray-300",
        className,
      )}
    >
      <div
        className={cn(
          "text-sm transition-colors duration-300",
          theme === "dark" && "text-neutral-400 group-hover:text-neutral-200",
          theme === "neutral" && "text-stone-500 group-hover:text-stone-700",
          (!theme || theme === "light") &&
            "text-gray-500 group-hover:text-gray-700",
        )}
      >
        {children}
      </div>
    </motion.div>
  ),
);
IconContainer.displayName = "IconContainer";

// Componente MultiIconDisplay
const MultiIconDisplay = memo(({ icons, theme }: MultiIconDisplayProps) => {
  if (!icons || icons.length < 3) return null;

  return (
    <div className="flex justify-center isolate relative">
      <IconContainer variant="left" className="left-2 top-1 z-10" theme={theme}>
        {icons[0]}
      </IconContainer>
      <IconContainer variant="center" className="z-20" theme={theme}>
        {icons[1]}
      </IconContainer>
      <IconContainer
        variant="right"
        className="right-2 top-1 z-10"
        theme={theme}
      >
        {icons[2]}
      </IconContainer>
    </div>
  );
});
MultiIconDisplay.displayName = "MultiIconDisplay";

// Componente Background
const Background = ({}: BackgroundProps) => (
  <div
    aria-hidden="true"
    className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500"
    style={{
      backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 1px)`,
      backgroundSize: "24px 24px",
    }}
  />
);

// Componente EmptyState principal
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(
  (
    {
      title,
      description,
      icons,
      action,
      footer,
      variant = "default",
      size = "default",
      theme = "light",
      isIconAnimated = true,
      className = "",
      ...props
    },
    ref,
  ) => {
    const titleId = useId();
    const descriptionId = useId();

    const baseClasses =
      "group transition-all duration-300 rounded-lg relative overflow-hidden text-center flex flex-col items-center justify-center";

    const sizeClasses = {
      sm: "p-6",
      default: "p-8",
      lg: "p-12",
    };

    const getVariantClasses = (variant: string, theme: string) => {
      const variants = {
        default: {
          light:
            "bg-white border-dashed border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50/50",
          dark: "bg-neutral-900 border-dashed border-2 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50",
          neutral:
            "bg-stone-50 border-dashed border-2 border-stone-300 hover:border-stone-400 hover:bg-stone-100/50",
        },
        subtle: {
          light: "bg-white border border-transparent hover:bg-gray-50/30",
          dark: "bg-neutral-900 border border-transparent hover:bg-neutral-800/30",
          neutral:
            "bg-stone-50 border border-transparent hover:bg-stone-100/30",
        },
        error: {
          light:
            "bg-white border border-red-200 bg-red-50/50 hover:bg-red-50/80",
          dark: "bg-neutral-900 border border-red-800 bg-red-950/50 hover:bg-red-950/80",
          neutral:
            "bg-stone-50 border border-red-300 bg-red-50/50 hover:bg-red-50/80",
        },
      };
      return (
        (variants as Record<string, Record<string, string>>)[variant]?.[
          theme
        ] || variants.default.light
      );
    };

    const getTextClasses = (type: string, size: string, theme: string) => {
      const sizes = {
        title: {
          sm: "text-base",
          default: "text-lg",
          lg: "text-xl",
        },
        description: {
          sm: "text-xs",
          default: "text-sm",
          lg: "text-base",
        },
      };

      const colors = {
        title: {
          light: "text-gray-900",
          dark: "text-neutral-100",
          neutral: "text-stone-900",
        },
        description: {
          light: "text-gray-600",
          dark: "text-neutral-400",
          neutral: "text-stone-600",
        },
      };

      return cn(
        (sizes as Record<string, Record<string, string>>)[type]?.[size],
        (colors as Record<string, Record<string, string>>)[type]?.[theme],
        "font-semibold transition-colors duration-200",
      );
    };

    const getButtonClasses = (size: string, theme: string) => {
      const sizeClasses = {
        sm: "text-xs px-3 py-1.5",
        default: "text-sm px-4 py-2",
        lg: "text-base px-6 py-3",
      };

      const themeClasses = {
        light: "border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
        dark: "border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-neutral-200",
        neutral:
          "border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700",
      };

      return cn(
        "inline-flex items-center gap-2 border rounded-md font-medium shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group/button disabled:opacity-50 disabled:cursor-not-allowed",
        (sizeClasses as Record<string, string>)[size],
        (themeClasses as Record<string, string>)[theme],
      );
    };

    return (
      <LazyMotion features={domAnimation}>
        <motion.section
          ref={ref}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            baseClasses,
            (sizeClasses as Record<string, string>)[size],
            getVariantClasses(variant, theme),
            className,
          )}
          initial="initial"
          animate="animate"
          whileHover={isIconAnimated ? "hover" : "animate"}
          {...props}
        >
          <Background theme={theme} />
          <div className="relative z-10 flex flex-col items-center w-full">
            {icons && (
              <div className="mb-6">
                <MultiIconDisplay icons={icons} theme={theme} />
              </div>
            )}

            <motion.div variants={CONTENT_VARIANTS} className="space-y-2 mb-6">
              <h2 id={titleId} className={getTextClasses("title", size, theme)}>
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className={cn(
                    getTextClasses("description", size, theme).replace(
                      "font-semibold",
                      "",
                    ),
                    "max-w-md leading-relaxed",
                  )}
                >
                  {description}
                </p>
              )}
            </motion.div>

            {action && (
              <motion.div variants={BUTTON_VARIANTS}>
                <motion.button
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={getButtonClasses(size, theme)}
                  whileTap={{ scale: 0.98 }}
                >
                  {action.icon && (
                    <motion.div
                      className="transition-transform group-hover/button:rotate-90"
                      whileHover={{ rotate: 90 }}
                    >
                      {action.icon}
                    </motion.div>
                  )}
                  <span className="relative z-10">{action.label}</span>
                </motion.button>
              </motion.div>
            )}

            {footer && (
              <div className="mt-6 w-full max-w-md">
                {footer}
              </div>
            )}
          </div>
        </motion.section>
      </LazyMotion>
    );
  },
);
EmptyState.displayName = "EmptyState";

interface CardsContasProps {
  isLoading?: boolean;
  onCardClick?: (platform: string) => void;
}

export default function CardsContas({
  isLoading = false,
  onCardClick,
}: CardsContasProps) {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".card-item");

      // Define estado inicial dos cards (invisível e com blur)
      gsap.set(cards, {
        opacity: 0,
        filter: "blur(10px)",
        y: 30,
        scale: 0.9,
      });

      // Anima os cards aparecendo
      gsap.to(cards, {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
      });
    }
  }, [isLoading]);

  if (isLoading) {
    return <CardsContasSkeleton />;
  }

  return (
    <div
      ref={cardsRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl"
    >
      {/* Mercado Livre Card */}
      <div
        className="card-item bg-white rounded-lg border border-gray-200 p-4 transition-all duration-300 h-28 flex items-center space-x-4 hover:border-orange-400 cursor-pointer"
        onClick={() => onCardClick?.("Mercado Livre")}
      >
        <div className="flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFE135"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
            <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Mercado Livre
          </h3>
          <p className="text-sm text-gray-600">
            Marketplace líder na América Latina
          </p>
        </div>
      </div>

      {/* Shopee Card */}
      <div
        className="card-item bg-white rounded-lg border border-gray-200 p-4 transition-all duration-300 h-28 flex items-center space-x-4 hover:border-orange-400 cursor-pointer"
        onClick={() => onCardClick?.("Shopee")}
      >
        <div className="flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
            <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Shopee</h3>
          <p className="text-sm text-gray-600">
            Plataforma de e-commerce em crescimento
          </p>
        </div>
      </div>

      {/* Bling Card */}
      <div
        className="card-item bg-white rounded-lg border border-gray-200 p-4 transition-all duration-300 h-28 flex items-center space-x-4 hover:border-orange-400 cursor-pointer"
        onClick={() => onCardClick?.("Bling")}
      >
        <div className="flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304z" />
            <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Bling</h3>
          <p className="text-sm text-gray-600">Sistema de gestão empresarial</p>
        </div>
      </div>
    </div>
  );
}
