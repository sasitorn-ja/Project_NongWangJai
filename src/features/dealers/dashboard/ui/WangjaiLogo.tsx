import mascotImage from "@/assets/mascot/nong-wangjai.png";
import mascotLogo from "@/assets/mascot/nong-wangjai-logo.png";
import mascotBanner from "@/assets/mascot/banner-mascot-cut.png";
import { cn } from "@/lib/cn";

export function WangjaiLogo({
  className,
  imageClassName,
  showText = false,
  variant = "avatar"
}: {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  variant?: "avatar" | "full" | "bust";
}) {
  if (variant === "full" || variant === "bust") {
    return (
      <img
        alt="น้องวางใจ"
        className={cn("object-contain object-bottom", className, imageClassName)}
        src={variant === "bust" ? mascotBanner : mascotImage}
      />
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        <img
          alt="น้องวางใจ"
          className={cn("h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(14,116,214,0.16)]", imageClassName)}
          src={mascotLogo}
        />
      </div>
      {showText ? (
        <div className="min-w-0">
          <div className="truncate text-[17px] font-extrabold leading-tight text-sky-600 dark:text-sky-100">NongWangJai</div>
          <div className="truncate text-[11px] font-semibold leading-tight text-slate-500 dark:text-sky-300">Dealer Intelligence</div>
        </div>
      ) : null}
    </div>
  );
}
