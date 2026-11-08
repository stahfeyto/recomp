import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * IPs da rede local deste PC (ex.: 192.168.1.72). Em desenvolvimento, o Next.js bloqueia
 * pedidos vindos de outro endereço que não "localhost"; com isto o telemóvel na mesma
 * rede Wi-Fi consegue abrir http://<ip-do-pc>:3000. Lido no arranque, por isso continua
 * a funcionar se o IP mudar (basta reiniciar o `npm run dev`).
 */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Só em desenvolvimento; em produção a lista fica vazia.
  allowedDevOrigins: process.env.NODE_ENV === "production" ? [] : lanAddresses(),
  // PGlite só é usado em desenvolvimento local (DATABASE_URL=pglite:…): fica fora do bundle
  // e fora das funções da Vercel.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
