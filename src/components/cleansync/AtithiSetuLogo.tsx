interface AtithiSetuLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AtithiSetuEmblemSvg({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
      {/* Outer circle badge */}
      <circle cx="50" cy="50" r="46" fill="#FDFBF7" stroke="#B5652F" strokeWidth="3.5" />
      {/* Dome Top cap */}
      <path d="M26 44 C26 28 74 28 74 44 Z" fill="#B5652F" />
      {/* Arch door outline */}
      <path d="M38 72 V50 C38 43 62 43 62 50 V72 Z" fill="none" stroke="#B5652F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Center dot */}
      <circle cx="50" cy="61" r="4" fill="#B5652F" />
    </svg>
  );
}

export function AtithiSetuLogo({ className = "", showText = true, size = "md" }: AtithiSetuLogoProps) {
  const iconSizeClass = size === "sm" ? "size-7" : size === "lg" ? "size-12" : "size-9";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <AtithiSetuEmblemSvg className={iconSizeClass} />
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-black text-sm tracking-widest text-[#2A2620] uppercase font-sans leading-none">
            ATITHISETU
          </span>
          <span className="text-[8px] font-extrabold tracking-widest text-[#B5652F] uppercase leading-tight mt-0.5">
            Smart Hotel Turnaround
          </span>
        </div>
      )}
    </div>
  );
}
