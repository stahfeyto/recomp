/**
 * Definição única das medidas: rótulos, unidades, limites, passo do formulário
 * no telemóvel e o sentido que é "bom" para a recomposição.
 */

export type MeasureKey =
  | "weightKg"
  | "waistCm"
  | "armRightCm"
  | "armLeftCm"
  | "chestCm"
  | "shouldersCm"
  | "thighCm"
  | "calfCm"
  | "neckCm";

/** "up" = subir é bom, "down" = descer é bom, "neutral" = sem juízo (ex.: peso). */
export type GoodDirection = "up" | "down" | "neutral";

export type MeasureDef = {
  key: MeasureKey;
  label: string;
  short: string;
  unit: "kg" | "cm";
  good: GoodDirection;
  min: number;
  max: number;
  /** Passo do formulário no telemóvel (0-based). */
  step: number;
  optional?: boolean;
};

export const MEASURES: readonly MeasureDef[] = [
  { key: "weightKg", label: "Peso", short: "Peso", unit: "kg", good: "neutral", min: 30, max: 250, step: 0 },
  { key: "waistCm", label: "Cintura", short: "Cintura", unit: "cm", good: "down", min: 40, max: 200, step: 1 },
  { key: "armRightCm", label: "Braço direito (contraído)", short: "Braço D", unit: "cm", good: "up", min: 15, max: 80, step: 2 },
  { key: "armLeftCm", label: "Braço esquerdo (contraído)", short: "Braço E", unit: "cm", good: "up", min: 15, max: 80, step: 2 },
  { key: "chestCm", label: "Peito", short: "Peito", unit: "cm", good: "up", min: 50, max: 200, step: 3 },
  { key: "shouldersCm", label: "Ombros (perímetro)", short: "Ombros", unit: "cm", good: "up", min: 60, max: 220, step: 3 },
  { key: "thighCm", label: "Coxa", short: "Coxa", unit: "cm", good: "up", min: 30, max: 120, step: 4, optional: true },
  { key: "calfCm", label: "Gémeo", short: "Gémeo", unit: "cm", good: "up", min: 20, max: 80, step: 4, optional: true },
  { key: "neckCm", label: "Pescoço", short: "Pescoço", unit: "cm", good: "neutral", min: 20, max: 70, step: 4, optional: true },
];

export const MEASURE_KEYS = MEASURES.map((m) => m.key);

export const MEASURE_BY_KEY = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<
  MeasureKey,
  MeasureDef
>;

/** Passos do registo semanal no telemóvel. */
export const FORM_STEPS = [
  { title: "Data e peso" },
  { title: "Cintura" },
  { title: "Braços" },
  { title: "Peito e ombros" },
  { title: "Extras e notas" },
] as const;

/** Variação inferior a isto (em cm) conta como "igual": erro de medição. */
export const EQUAL_THRESHOLD_CM = 0.3;
