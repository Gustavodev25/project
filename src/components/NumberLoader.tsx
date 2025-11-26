"use client";

interface NumberLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: "currency" | "number" | "percentage";
}

export default function NumberLoader({ 
  className = "", 
  width = "w-24", 
  height = "h-6",
  variant = "currency"
}: NumberLoaderProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "currency":
        return {
          container: "bg-gradient-to-r from-gray-100 to-gray-200",
          shimmer: "from-transparent via-white/40 to-transparent",
          bars: [
            { width: "w-2", height: "h-3", delay: "0ms" },
            { width: "w-1.5", height: "h-4", delay: "100ms" },
            { width: "w-2", height: "h-3", delay: "200ms" },
            { width: "w-1", height: "h-2", delay: "300ms" },
            { width: "w-1.5", height: "h-3", delay: "400ms" },
            { width: "w-1", height: "h-2", delay: "500ms" },
          ]
        };
      case "number":
        return {
          container: "bg-gradient-to-r from-gray-100 to-gray-200",
          shimmer: "from-transparent via-white/40 to-transparent",
          bars: [
            { width: "w-1.5", height: "h-3", delay: "0ms" },
            { width: "w-1.5", height: "h-4", delay: "100ms" },
            { width: "w-1.5", height: "h-3", delay: "200ms" },
            { width: "w-1.5", height: "h-2", delay: "300ms" },
          ]
        };
      case "percentage":
        return {
          container: "bg-gradient-to-r from-gray-100 to-gray-200",
          shimmer: "from-transparent via-white/40 to-transparent",
          bars: [
            { width: "w-1", height: "h-2", delay: "0ms" },
            { width: "w-1", height: "h-3", delay: "100ms" },
            { width: "w-1", height: "h-2", delay: "200ms" },
          ]
        };
      default:
        return {
          container: "bg-gradient-to-r from-gray-100 to-gray-200",
          shimmer: "from-transparent via-white/40 to-transparent",
          bars: [
            { width: "w-1.5", height: "h-3", delay: "0ms" },
            { width: "w-1.5", height: "h-4", delay: "100ms" },
            { width: "w-1.5", height: "h-3", delay: "200ms" },
          ]
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`${width} ${height} ${className}`}>
      <div className={`relative w-full h-full ${styles.container} rounded-md overflow-hidden`}>
        {/* Efeito shimmer principal */}
        <div className={`absolute inset-0 bg-gradient-to-r ${styles.shimmer} animate-pulse`}></div>
        
        {/* Efeito shimmer secundário com delay */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r ${styles.shimmer} animate-pulse`}
          style={{ animationDelay: "0.5s" }}
        ></div>
        
        {/* Barras simulando números */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end space-x-0.5">
            {styles.bars.map((bar, index) => (
              <div
                key={index}
                className={`${bar.width} ${bar.height} bg-gray-300 rounded-sm animate-pulse`}
                style={{ 
                  animationDelay: bar.delay,
                  animationDuration: "1.2s"
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Efeito de brilho sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse opacity-50"></div>
      </div>
    </div>
  );
}