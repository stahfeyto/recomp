"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import type { SceneVariant } from "./recomp-scene";

// three + R3F só são descarregados quando a cena vai mesmo aparecer.
const RecompScene = dynamic(() => import("./recomp-scene"), { ssr: false, loading: () => null });

/**
 * Decide se o aparelho aguenta a cena 3D. Fica o fallback estático (o arco em CSS)
 * com "reduzir movimento", poupança de dados, aparelhos fracos ou sem WebGL.
 */
function canRun3D(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) <= 2) return false;
  if ((nav.deviceMemory ?? 8) < 2) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Scene3D({ variant }: { variant: SceneVariant }) {
  const hydrated = useHydrated();
  const capable = useMemo(
    () =>
      hydrated &&
      canRun3D() &&
      // O nó do Painel é decorativo: só em ecrãs largos (no telemóvel nem se descarrega).
      (variant !== "orb" || window.matchMedia("(min-width: 1024px)").matches),
    [hydrated, variant],
  );
  if (!capable) return null;
  return <RecompScene variant={variant} />;
}
