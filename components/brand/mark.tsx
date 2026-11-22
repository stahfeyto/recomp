import { cn } from "@/lib/cn";

/**
 * Marca do RECOMP: um "R" em traço grosso, com a perna em lima (a ação, a vitória).
 * `draw`: os traços desenham-se ao aparecer (login); parado com "reduzir movimento".
 */
export function Mark({ size = 28, draw = false, className }: { size?: number; draw?: boolean; className?: string }) {
  return (
    <svg
      className={cn("mark", draw && "mark--draw", className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="mark-bg" cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#5b2bc4" />
          <stop offset="1" stopColor="#0e0b17" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#mark-bg)" />
      <path
        className="mark__r"
        d="M21 16v33M21 16h13a9.5 9.5 0 0 1 0 19H21"
        pathLength={1}
        fill="none"
        stroke="#f3f0ff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path className="mark__leg" d="M32 35l13 14" pathLength={1} fill="none" stroke="#c6ff33" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** Marca + nome, para o cabeçalho e o login. */
export function Wordmark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("wordmark", className)}>
      <Mark size={size} />
      <span className="wordmark__text">RECOMP</span>
    </span>
  );
}
