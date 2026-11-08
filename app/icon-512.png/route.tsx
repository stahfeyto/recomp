import { appIcon } from "@/lib/app-icon";

/** Ícone 512×512 da PWA (gerado no build). */
export function GET() {
  return appIcon(512);
}
