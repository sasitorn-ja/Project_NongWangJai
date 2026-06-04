import { cn } from "@/lib/cn";

/**
 * Crisp vector version of the น้องวางใจ chibi mascot (blue CPAC hard-hat robot
 * giving two thumbs up). Rendered as SVG so it stays sharp at any size — used as
 * the sidebar / menu logo avatar.
 */
export function MascotAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="น้องวางใจ"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nwjBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#37a6e6" />
          <stop offset="1" stopColor="#1f6fc4" />
        </linearGradient>
        <linearGradient id="nwjHat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#46b2ef" />
          <stop offset="1" stopColor="#2089d6" />
        </linearGradient>
      </defs>

      {/* arms + thumbs up */}
      <g fill="#2f93dd">
        <path d="M14 40c-3 0-5 2-5 5 0 2 1 4 4 5l6 2 3-9-8-3z" />
        <path d="M50 40c3 0 5 2 5 5 0 2-1 4-4 5l-6 2-3-9 8-3z" />
      </g>
      {/* hands */}
      <g fill="#bfe3fb" stroke="#2f93dd" strokeWidth="1">
        <path d="M9 41c-2-1-4 0-4 2 0 1 0 2 1 3 0 1-1 3 1 4 1 1 3 1 5 0l3-2-2-7-4 0z" />
        <path d="M55 41c2-1 4 0 4 2 0 1 0 2-1 3 0 1 1 3-1 4-1 1-3 1-5 0l-3-2 2-7 4 0z" />
      </g>

      {/* body */}
      <rect x="21" y="38" width="22" height="20" rx="9" fill="url(#nwjBody)" />
      {/* chest badge */}
      <rect x="28" y="44" width="8" height="7" rx="1.5" fill="#ffffff" />
      <text x="32" y="49.5" textAnchor="middle" fontSize="3.6" fontWeight="700" fill="#1f6fc4" fontFamily="Arial, sans-serif">CPAC</text>

      {/* side ear pods */}
      <circle cx="17" cy="28" r="4.2" fill="#2089d6" />
      <circle cx="17" cy="28" r="1.8" fill="#ffd24a" />
      <circle cx="47" cy="28" r="4.2" fill="#2089d6" />
      <circle cx="47" cy="28" r="1.8" fill="#ffd24a" />

      {/* head */}
      <rect x="18" y="18" width="28" height="24" rx="11" fill="#eef6fc" stroke="#cfe5f6" strokeWidth="1" />

      {/* hard hat */}
      <path d="M16 26c0-9 7-15 16-15s16 6 16 15c0 1-1 2-2 2H18c-1 0-2-1-2-2z" fill="url(#nwjHat)" />
      <rect x="14" y="25" width="36" height="3.4" rx="1.7" fill="#1f7ec9" />
      <path d="M30 11.4c1.3-.3 2.7-.3 4 0v4h-4z" fill="#1f7ec9" />
      <text x="32" y="22" textAnchor="middle" fontSize="5" fontWeight="800" fill="#ffffff" fontFamily="Arial, sans-serif">CPAC</text>

      {/* eyes */}
      <ellipse cx="27" cy="31.5" rx="2.6" ry="3.4" fill="#1b2a4a" />
      <ellipse cx="37" cy="31.5" rx="2.6" ry="3.4" fill="#1b2a4a" />
      <circle cx="28" cy="30.4" r="0.9" fill="#ffffff" />
      <circle cx="38" cy="30.4" r="0.9" fill="#ffffff" />

      {/* cheeks */}
      <circle cx="23.5" cy="35" r="1.6" fill="#9fd2f4" opacity="0.7" />
      <circle cx="40.5" cy="35" r="1.6" fill="#9fd2f4" opacity="0.7" />

      {/* smile */}
      <path d="M29 35.5c1.2 1.6 4.8 1.6 6 0" fill="none" stroke="#1b2a4a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
