/** Tipos de dia de treino: rótulo e cor (usado no Painel e em /treino). */
export const TRAINING_TYPES = {
  treino: { label: "Treino", tone: "cobalt" },
  acessorios: { label: "Músculos pequenos", tone: "acid" },
  opcional: { label: "Opcional", tone: "ice" },
  descanso: { label: "Descanso", tone: "muted" },
} as const;

export type TrainingType = keyof typeof TRAINING_TYPES;

export const WEEKDAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;
