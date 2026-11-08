import { ImageResponse } from "next/og";

/**
 * Ícone da app (PWA / ecrã principal): "R" dentro do anel de luz azul, sobre o
 * fundo quase preto. O desenho fica dentro da zona segura (~60% central), por isso
 * serve também como ícone "maskable" (Android recorta-o em círculo ou squircle).
 */
export function appIcon(size: number): ImageResponse {
  const ring = Math.round(size * 0.58);
  const stroke = Math.max(2, Math.round(size * 0.05));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 40%, #121735 0%, #05060D 70%)",
        }}
      >
        <div
          style={{
            width: ring,
            height: ring,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: `${stroke}px solid #4B63FF`,
            boxShadow: `0 0 ${Math.round(size * 0.08)}px #4B63FF`,
            color: "#DCE6FF",
            fontSize: Math.round(size * 0.3),
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          R
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
