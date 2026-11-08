/**
 * Seed idempotente: `npm run db:seed`.
 * Corre quantas vezes quiseres — chaves únicas + ON CONFLICT DO NOTHING impedem duplicados.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { count } from "drizzle-orm";
import { getDb, schema } from "./index";
import { monthsAgoISO, todayISO } from "../lib/dates";

async function main() {
  const db = getDb();
  const today = todayISO();

  // Perfil
  await db
    .insert(schema.profile)
    .values({
      id: 1,
      displayName: "Helder",
      sex: "masculino",
      birthYear: 2004, // 22 anos em 2026
      heightCm: 171,
    })
    .onConflictDoNothing();

  // Medição inicial — só se ainda não houver nenhuma (a data é a do dia do seed, editável depois)
  const [{ n }] = await db.select({ n: count() }).from(schema.measurements);
  if (n === 0) {
    await db.insert(schema.measurements).values({
      date: today,
      weightKg: 65.4,
      armRightCm: 35.5,
      armLeftCm: 34.5,
      waistCm: 83.5,
      chestCm: 95,
      shouldersCm: 114,
      notes: "Medição inicial",
    });
  }

  // Metas: histórico (datas aproximadas) + meta atual
  await db
    .insert(schema.nutritionGoals)
    .values([
      {
        effectiveFrom: monthsAgoISO(6),
        label: "Cut",
        calories: 100 * 4 + 200 * 4 + 70 * 9, // 1830
        proteinG: 200,
        carbsG: 100,
        fatG: 70,
        notes: "Fase de cut anterior. Data aproximada — edita se souberes a certa.",
        source: "seed",
      },
      {
        effectiveFrom: monthsAgoISO(3),
        label: "Início da recomposição",
        calories: 210 * 4 + 160 * 4 + 60 * 9, // 2020
        proteinG: 160,
        carbsG: 210,
        fatG: 60,
        notes: "Data aproximada — edita se souberes a certa.",
        source: "seed",
      },
      {
        effectiveFrom: today,
        label: "Recomposição",
        calories: 2200,
        proteinG: 160,
        carbsG: 250,
        fatG: 62,
        notes:
          "Intervalos aceitáveis: 2150–2250 kcal · proteína 150–160 g · hidratos 240–260 g · gordura 60–65 g.",
        source: "seed",
      },
    ])
    .onConflictDoNothing();

  // Plano de treino (segunda = 0)
  await db
    .insert(schema.trainingDays)
    .values([
      { weekday: 0, title: "Treino", type: "treino" },
      { weekday: 1, title: "Treino", type: "treino" },
      { weekday: 2, title: "Treino", type: "treino" },
      {
        weekday: 3,
        title: "Descanso ou músculos pequenos",
        type: "acessorios",
        notes: "Antebraço, trapézio, gémeos",
      },
      { weekday: 4, title: "Treino", type: "treino" },
      { weekday: 5, title: "Opcional", type: "opcional", notes: "Às vezes treino" },
      { weekday: 6, title: "Descanso", type: "descanso" },
    ])
    .onConflictDoNothing();

  console.log("Seed concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
