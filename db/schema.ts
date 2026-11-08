import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Medida corporal: numeric(5,2) lido como número em JS. */
const cm = (name: string) =>
  numeric(name, { precision: 5, scale: 2, mode: "number" });

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Perfil do único utilizador (uma linha, id = 1). */
export const profile = pgTable("profile", {
  id: smallint("id").primaryKey().default(1),
  displayName: text("display_name").notNull(),
  sex: text("sex", { enum: ["masculino", "feminino"] }).notNull(),
  birthYear: smallint("birth_year"),
  heightCm: cm("height_cm").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Registo semanal. Tudo opcional exceto a data (há semanas só com cintura). */
export const measurements = pgTable(
  "measurements",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    weightKg: cm("weight_kg"),
    waistCm: cm("waist_cm"),
    chestCm: cm("chest_cm"),
    shouldersCm: cm("shoulders_cm"),
    armRightCm: cm("arm_right_cm"),
    armLeftCm: cm("arm_left_cm"),
    thighCm: cm("thigh_cm"),
    calfCm: cm("calf_cm"),
    neckCm: cm("neck_cm"),
    /** "A força está a cair?" — usado pelo assistente de check-in. */
    strengthDropping: boolean("strength_dropping"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("measurements_date_uq").on(t.date)],
);

/** Pesagem diária de manhã (para a média semanal). */
export const dailyWeights = pgTable(
  "daily_weights",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    weightKg: cm("weight_kg").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("daily_weights_date_uq").on(t.date)],
);

/** Histórico de metas: nunca se sobrescreve. A ativa é a mais recente com effective_from <= hoje. */
export const nutritionGoals = pgTable(
  "nutrition_goals",
  {
    id: serial("id").primaryKey(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    calories: integer("calories").notNull(),
    proteinG: integer("protein_g").notNull(),
    carbsG: integer("carbs_g").notNull(),
    fatG: integer("fat_g").notNull(),
    label: text("label").notNull(),
    notes: text("notes"),
    source: text("source", { enum: ["manual", "assistente", "seed"] })
      .notNull()
      .default("manual"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("nutrition_goals_effective_label_uq").on(
      t.effectiveFrom,
      t.label,
    ),
    index("nutrition_goals_effective_idx").on(t.effectiveFrom),
  ],
);

export const trainingDayType = pgEnum("training_day_type", [
  "treino",
  "descanso",
  "acessorios",
  "opcional",
]);

/** Plano semanal: weekday 0 = segunda … 6 = domingo. */
export const trainingDays = pgTable(
  "training_days",
  {
    id: serial("id").primaryKey(),
    weekday: smallint("weekday").notNull(),
    title: text("title").notNull(),
    type: trainingDayType("type").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("training_days_weekday_uq").on(t.weekday)],
);

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    trainingDayId: integer("training_day_id")
      .notNull()
      .references(() => trainingDays.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    name: text("name").notNull(),
    sets: smallint("sets"),
    /** Texto livre, ex.: "8–12". */
    reps: text("reps"),
    restSeconds: smallint("rest_seconds"),
    toFailure: boolean("to_failure").notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("exercises_day_position_idx").on(t.trainingDayId, t.position)],
);

/** Rate limiting do login (chave = IP). */
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Measurement = typeof measurements.$inferSelect;
export type NewMeasurement = typeof measurements.$inferInsert;
export type DailyWeight = typeof dailyWeights.$inferSelect;
export type NutritionGoal = typeof nutritionGoals.$inferSelect;
export type TrainingDay = typeof trainingDays.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Profile = typeof profile.$inferSelect;
