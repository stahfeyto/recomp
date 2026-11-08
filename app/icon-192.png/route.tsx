import { appIcon } from "@/lib/app-icon";

/** Ícone 192×192 da PWA (gerado no build). */
export function GET() {
  return appIcon(192);
}
