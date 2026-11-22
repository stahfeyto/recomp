import { ImageResponse } from "next/og";

/**
 * Ícone da app (PWA / ecrã principal): a marca ("R" com a perna em lima) sobre
 * ameixa escura com um brilho violeta. O desenho fica na zona segura (~60%
 * central), por isso serve também como ícone "maskable".
 */
export function appIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 35% 28%, #5B2BC4 0%, #2A1559 38%, #0E0B17 78%)",
        }}
      >
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path
            d="M21 16v33M21 16h13a9.5 9.5 0 0 1 0 19H21"
            fill="none"
            stroke="#F3F0FF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M32 35l13 14" fill="none" stroke="#C6FF33" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
