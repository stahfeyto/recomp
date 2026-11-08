# RECOMP

Tracker pessoal de **recomposição corporal** (um único utilizador): medidas semanais e pesagens diárias, gráficos de evolução, metas de calorias e macros com um assistente de check-in, e o plano de treino de segunda a domingo.

**Stack:** Next.js 16 (App Router, TypeScript) · Postgres na Neon + Drizzle ORM · Tailwind CSS v4 · motion · Recharts · three.js / React Three Fiber · Vitest. Alojado na Vercel.

---

## Índice

1. [Arranque local](#1-arranque-local)
2. [Variáveis de ambiente](#2-variáveis-de-ambiente)
3. [Deploy na Vercel (passo a passo)](#3-deploy-na-vercel-passo-a-passo)
4. [Instalar no telemóvel](#4-instalar-no-telemóvel)
5. [Scripts](#5-scripts)
6. [Testes e qualidade](#6-testes-e-qualidade)
7. [Estrutura](#7-estrutura)
8. [Resolução de problemas](#8-resolução-de-problemas)

---

## 1. Arranque local

Requisitos: **Node.js 22 ou mais recente**.

```bash
npm install
```

Cria o ficheiro `.env.local` na raiz (copia o `.env.example`) e preenche-o (ver a [secção 2](#2-variáveis-de-ambiente)). Para experimentar sem a Neon, usa a base de dados local:

```
DATABASE_URL="pglite:.pglite"
```

Depois:

```bash
npm run db:migrate   # cria as tabelas
npm run db:seed      # perfil, medição inicial, metas e plano de treino (não duplica)
npm run dev          # http://localhost:3000
```

**No telemóvel, na mesma rede Wi-Fi:** abre o endereço que o `npm run dev` mostra na linha `Network` (ex.: `http://192.168.1.72:3000`). Se o Windows perguntar, deixa o Node.js aceitar ligações em redes privadas.

---

## 2. Variáveis de ambiente

| Variável | O que é |
|---|---|
| `DATABASE_URL` | Connection string da Neon (a **pooled**, com `-pooler` no endereço). Localmente pode ser `pglite:.pglite`. |
| `AUTH_SECRET` | Texto aleatório com 32+ caracteres, para assinar a sessão. Gera com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Usa um **diferente** em produção. |
| `ADMIN_USERNAME` | `Helder Valente` (comparação exata). |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt da palavra-passe. **Nunca** a palavra-passe em texto. |

### Gerar o hash da palavra-passe

```bash
npm run hash-password
```

Pede a palavra-passe duas vezes (não aparece no ecrã nem fica no histórico do terminal) e mostra **duas versões**:

1. **Para o `.env.local`**, com os `$` escapados (`\$2b\$12\$…`). O Next.js trata `$` como variável nos ficheiros `.env`; sem o `\` o valor fica estragado.
2. **Para a Vercel**, o valor tal e qual (`$2b$12$…`).

> **Nunca** escrevas a palavra-passe no `.env.example`: esse ficheiro vai para o GitHub.

---

## 3. Deploy na Vercel (passo a passo)

### 3.1 Base de dados na Neon

1. Entra na Vercel → o teu projeto (ou a equipa) → **Storage** → **Create Database** → **Neon** (Postgres serverless, plano gratuito).
2. Região: **Frankfurt (eu-central-1)**, a mais próxima de Portugal.
3. Quando a base estiver criada, abre-a e copia a connection string **pooled** (`postgres://…-pooler…neon.tech/neondb?sslmode=require`). Ao ligá-la ao projeto, a Vercel cria a variável `DATABASE_URL` sozinha.

### 3.2 Criar as tabelas e os dados iniciais na Neon

No teu PC, na pasta do projeto, aponta o terminal para a Neon **só nesta janela** e corre as migrações e o seed:

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgres://…-pooler…neon.tech/neondb?sslmode=require"
npm run db:migrate
npm run db:seed
Remove-Item Env:DATABASE_URL
```

**Git Bash / macOS / Linux:**

```bash
DATABASE_URL="postgres://…-pooler…neon.tech/neondb?sslmode=require" npm run db:migrate
DATABASE_URL="postgres://…-pooler…neon.tech/neondb?sslmode=require" npm run db:seed
```

A variável do terminal tem prioridade sobre a do `.env.local`, por isso o `.env.local` não precisa de mudar. O seed pode correr várias vezes sem duplicar. A data da medição inicial é a do dia em que o corres (podes editá-la depois em Medidas).

### 3.3 Código no GitHub

Opção A — **VS Code**: painel *Source Control* → **Publish Branch** → *Publish to GitHub private repository*.

Opção B — **github.com**: cria um repositório **privado** vazio e depois, no terminal do projeto:

```bash
git remote add origin https://github.com/<o-teu-utilizador>/recomp.git
git push -u origin main
```

### 3.4 Importar na Vercel

1. Vercel → **Add New… → Project** → escolhe o repositório.
2. *Framework*: **Next.js** (detetado sozinho). Não mudes os comandos de build.
3. **Environment Variables** (para *Production* e *Preview*):
   - `DATABASE_URL` — já criada pela integração da Neon (se não, cola a connection string *pooled*).
   - `AUTH_SECRET` — um valor novo, só para produção.
   - `ADMIN_USERNAME` — `Helder Valente` (sem aspas na Vercel).
   - `ADMIN_PASSWORD_HASH` — a **segunda** linha do `npm run hash-password` (sem `\`, sem aspas).
4. **Deploy**. No fim, a Vercel dá-te o link (`https://….vercel.app`).

A partir daqui, cada `git push` para `main` publica uma nova versão.

### 3.5 Verificar

- Abre o link, entra com `Helder Valente` e a tua palavra-passe.
- Regista uma pesagem e confirma que aparece no Painel.
- Se algo falhar, vê a [secção 8](#8-resolução-de-problemas) e os *Logs* do deploy na Vercel.

---

## 4. Instalar no telemóvel

A app é uma PWA (precisa de HTTPS, ou seja, do link da Vercel):

- **Android (Chrome):** menu ⋮ → **Instalar app** / *Adicionar ao ecrã principal*.
- **iPhone (Safari):** botão Partilhar → **Adicionar ao ecrã principal**.

Abre em ecrã inteiro, com o ícone RECOMP. A sessão dura 30 dias com "Manter sessão iniciada".

---

## 5. Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção / servir o build |
| `npm run lint` | ESLint |
| `npm test` | Testes (Vitest) |
| `npm run test:watch` | Testes em modo contínuo |
| `npm run db:generate` | Gera uma migração nova a partir de `db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações à base do `DATABASE_URL` |
| `npm run db:seed` | Dados iniciais (idempotente) |
| `npm run db:studio` | Drizzle Studio: ver e editar os dados no browser |
| `npm run hash-password` | Hash bcrypt da palavra-passe |

---

## 6. Testes e qualidade

```bash
npm test
```

- `tests/recomp-rules.test.ts` — todas as linhas da tabela do assistente de check-in (secção 7.6), os casos não cobertos e os limites (±0,3 cm, 0,5 cm, 21 dias).
- `tests/calculations.test.ts` — média semanal e móvel, rácios, recordes, check-in, macros (4/4/9 e redistribuição), números com vírgula.
- `tests/login.test.ts` — o fluxo de login a correr contra um Postgres em memória: credenciais certas e erradas, bloqueio ao fim de 5 falhas, desbloqueio, redirecionamento só para caminhos internos.

**Lighthouse (mobile, build de produção):** acessibilidade 100 e boas práticas 100 em todas as páginas; desempenho entre 88 e 95 no login, Painel, Medidas, Metas e Treino. A Evolução fica abaixo de 85 no laboratório por causa do primeiro desenho dos gráficos do Recharts (ver o relatório da fase 10).

**Acessibilidade e movimento:** tudo funciona com teclado; com *reduzir movimento* ligado no sistema não há 3D, transições de página nem animações grandes.

---

## 7. Estrutura

```
app/
  (auth)/login/          ecrã de login (cena 3D) e ação de login
  (app)/                 páginas autenticadas: layout com dock, cabeçalho, paleta de comandos
    page.tsx             Painel
    medidas/ evolucao/ metas/ treino/
  manifest.ts, icon-*.png/, apple-touch-icon.png/   PWA
components/
  3d/ charts/ forms/ layout/ ui/
db/
  schema.ts  index.ts  seed.ts
drizzle/                 migrações SQL
lib/
  auth.ts session.ts jwt.ts rate-limit.ts      autenticação
  recomp-rules.ts                              regras do assistente de check-in
  calculations.ts macros.ts                    cálculos puros (testados)
  data/                                        leituras da base de dados (validam a sessão)
proxy.ts                 protege todas as rotas (Next 16: o antigo middleware.ts)
tests/                   Vitest
```

---

## 8. Resolução de problemas

| Sintoma | Causa provável |
|---|---|
| "Credenciais inválidas" com a palavra-passe certa | O hash está mal colado. No `.env.local` usa a versão com `\$`; na Vercel a versão sem `\`. Volta a correr `npm run hash-password`. |
| "Não foi possível iniciar sessão" | A base de dados não responde ou as tabelas não existem: corre `npm run db:migrate` contra essa base. |
| "Demasiadas tentativas" | 5 falhas seguidas bloqueiam esse IP durante 1 minuto. Espera e tenta de novo. |
| No telemóvel a página abre mas os botões não funcionam | Reinicia o `npm run dev` (o IP da rede local é lido no arranque). |
| `DATABASE_URL não está definida` | Falta a variável no `.env.local` ou na Vercel. |
| Sem cena 3D no login | Normal com *reduzir movimento*, poupança de dados, aparelhos fracos ou sem WebGL: fica o arco de luz estático. |
