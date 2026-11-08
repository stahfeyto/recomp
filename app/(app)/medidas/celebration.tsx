import type { CSSProperties } from "react";

const PARTICLES = 16;

/**
 * Celebração discreta de recorde: brilho + partículas a sair do botão.
 * Montada com uma `key` nova a cada recorde; a animação CSS corre uma vez e
 * termina invisível. Com "reduzir movimento" não aparece (fica o toast).
 */
export function Celebration() {
  return (
    <span className="celebration" aria-hidden="true">
      <span className="celebration__glow" />
      {Array.from({ length: PARTICLES }, (_, i) => {
        const angle = (i / PARTICLES) * Math.PI * 2;
        const dist = 70 + (i % 3) * 22;
        return (
          <span
            key={i}
            className="celebration__dot"
            style={
              {
                "--x": `${Math.round(Math.cos(angle) * dist)}px`,
                "--y": `${Math.round(Math.sin(angle) * dist * 0.6)}px`,
                "--c":
                  i % 3 === 0
                    ? "var(--acid-400)"
                    : i % 3 === 1
                      ? "var(--cobalt-400)"
                      : "var(--ice-100)",
                animationDelay: `${(i % 4) * 30}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}
