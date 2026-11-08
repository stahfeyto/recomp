# RECOMP

Tracker pessoal de recomposição corporal — Next.js (App Router) + Neon Postgres + Drizzle, alojado na Vercel.

> O guia completo de deploy chega na fase 10. Para já, o arranque local:

## Arranque local

1. `npm install`
2. Copia `.env.example` para `.env.local` e preenche `DATABASE_URL` (connection string *pooled* da Neon).
   Sem Neon, para experimentar localmente: `DATABASE_URL="pglite:.pglite"` (Postgres em WebAssembly guardado na pasta `.pglite/`, só para desenvolvimento).
3. `npm run db:migrate` — cria as tabelas.
4. `npm run db:seed` — insere o perfil, a medição inicial, as metas e o plano de treino (pode correr várias vezes sem duplicar).
5. `npm run dev` → http://localhost:3000

## Scripts

| Script | O que faz |
|---|---|
| `dev` / `build` / `start` / `lint` | Next.js |
| `db:generate` | Gera uma nova migração a partir de `db/schema.ts` |
| `db:migrate` | Aplica as migrações em `drizzle/` à base de dados do `DATABASE_URL` |
| `db:seed` | Seed idempotente |
| `db:studio` | Drizzle Studio (ver/editar dados no browser) |
