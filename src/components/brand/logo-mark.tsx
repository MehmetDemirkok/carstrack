import { useId } from "react";

type LogoMarkProps = {
  size?: number;
  className?: string;
  /** Render only the inner mark (gauge + pin + node) without the gradient badge. */
  bare?: boolean;
  title?: string;
};

/**
 * CarsTrack brand mark — an open gauge ring (fleet health / monitoring) wrapping a
 * location pin (tracking) with a live green pulse node on the dial (online tracking).
 * Self-contained inline SVG with per-instance gradient ids so multiple copies on a
 * page never collide.
 */
export function LogoMark({ size = 40, className, bare = false, title = "CarsTrack" }: LogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const bg = `ct-bg-${uid}`;
  const glow = `ct-glow-${uid}`;
  const white = `ct-white-${uid}`;
  const node = `ct-node-${uid}`;
  const shadow = `ct-shadow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={bg} x1="48" y1="32" x2="464" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="0.45" stopColor="#6366f1" />
          <stop offset="1" stopColor="#15b8c5" />
        </linearGradient>
        <radialGradient
          id={glow}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(150 110) rotate(58) scale(360)"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={white} x1="256" y1="120" x2="256" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6ebff" />
        </linearGradient>
        <radialGradient
          id={node}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(351 143) scale(46)"
        >
          <stop offset="0" stopColor="#bbf7d0" />
          <stop offset="0.55" stopColor="#4ade80" />
          <stop offset="1" stopColor="#22c55e" />
        </radialGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="#0b1220" floodOpacity="0.30" />
        </filter>
      </defs>

      {!bare && (
        <>
          <rect x="16" y="16" width="480" height="480" rx="116" fill={`url(#${bg})`} />
          <rect x="16" y="16" width="480" height="480" rx="116" fill={`url(#${glow})`} />
          <rect
            x="16.75"
            y="16.75"
            width="478.5"
            height="478.5"
            rx="115.25"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        </>
      )}

      <g filter={bare ? undefined : `url(#${shadow})`}>
        <circle
          cx="256"
          cy="256"
          r="148"
          fill="none"
          stroke={bare ? "currentColor" : `url(#${white})`}
          strokeWidth="40"
          strokeLinecap="round"
          strokeDasharray="749 181"
          transform="rotate(125 256 256)"
        />
        <path
          d="M256 356 C 230 322 172 308 172 244 A 84 84 0 1 1 340 244 C 340 308 282 322 256 356 Z"
          fill={bare ? "currentColor" : `url(#${white})`}
        />
        <circle cx="256" cy="240" r="34" fill={bare ? "var(--background)" : `url(#${bg})`} />
        {!bare && <circle cx="351" cy="143" r="34" fill="#22c55e" opacity="0.28" />}
        <circle cx="351" cy="143" r="21" fill={bare ? "#22c55e" : `url(#${node})`} />
        <circle cx="351" cy="143" r="7" fill={bare ? "var(--background)" : "#ffffff"} />
      </g>
    </svg>
  );
}

export default LogoMark;
