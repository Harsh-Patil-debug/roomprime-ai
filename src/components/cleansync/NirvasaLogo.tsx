interface NirvasaLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function NirvasaLogo({ className = "", showText = true, size = "md" }: NirvasaLogoProps) {
  const iconSizeClass = size === "sm" ? "h-7" : size === "lg" ? "h-14" : "h-10";

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/nirvasa-logo.png"
        alt="NIRVASA Smart Hotel Turnaround"
        className={`${iconSizeClass} w-auto object-contain rounded-full border border-[#B5652F]/30 shadow-sm`}
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
