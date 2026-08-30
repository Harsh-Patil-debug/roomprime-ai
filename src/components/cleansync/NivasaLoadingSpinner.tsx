import { NivasaEmblemSvg } from "./NivasaLogo";

interface NivasaLoadingSpinnerProps {
  text?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function NivasaLoadingSpinner({
  text = "Loading NIVASA...",
  subtext = "Smart Hotel Turnaround",
  size = "md",
  fullScreen = false,
}: NivasaLoadingSpinnerProps) {
  const emblemSize = size === "sm" ? "size-10" : size === "lg" ? "size-20" : "size-14";

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 select-none text-center p-6">
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow ring around NIVASA Emblem */}
        <div className="absolute inset-0 rounded-full bg-[#B5652F]/20 animate-ping" />
        <div className="relative z-10 animate-bounce duration-1000">
          <NivasaEmblemSvg className={emblemSize} />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-extrabold text-sm text-[#2A2620] tracking-widest uppercase font-sans">
          {text}
        </h3>
        {subtext && (
          <p className="text-[10px] font-extrabold text-[#B5652F] uppercase tracking-widest">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#2A2620] flex flex-col items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
