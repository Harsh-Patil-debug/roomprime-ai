interface NirvasaLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function NirvasaLogo({ className = "", showText = true, size = "md" }: NirvasaLogoProps) {
  const iconSizeClass = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-12 w-12" : "h-9 w-9";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/nirvasa-logo.png"
        alt="NIRVASA Emblem"
        className={`${iconSizeClass} object-contain rounded-full shadow-xs hover:scale-105 transition-transform duration-200`}
      />
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-black text-sm tracking-widest text-[#2A2620] uppercase font-sans leading-none">
            NIRVASA
          </span>
          <span className="text-[8px] font-extrabold tracking-widest text-[#B5652F] uppercase leading-tight mt-0.5">
            Smart Hotel Turnaround
          </span>
        </div>
      )}
    </div>
  );
}
