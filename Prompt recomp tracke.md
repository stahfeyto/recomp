# PROMPT PARA O CLAUDE CODE — "RECOMP" · Tracker de Recomposição Corporal

> Lê este ficheiro inteiro antes de escrever código. Implementa por fases (secção 12), faz commit no fim de cada fase e confirma que `npm run build` passa antes de avançar.

---

## 1. Contexto e objetivo

Quero uma aplicação web pessoal (um único utilizador) para acompanhar a minha **recomposição corporal**: perder gordura (sobretudo cintura/abdómen e zona lombar lateral) sem perder massa muscular nem força, e continuar a ganhar braço, peito e ombros.

Todas as semanas registo medidas corporais e peso, vejo gráficos de evolução, edito as minhas metas de calorias/macros e guardo o meu plano de treino de segunda a domingo.

O site tem de **deslumbrar**: visual 3D, moderno, com as animações e micro-interações de um produto de 2026. Mas também tem de ser **rápido, simples de usar no telemóvel** (é onde vou registar as medidas) e fácil de alojar na **Vercel**.

Idioma da interface: **Português de Portugal** (ex.: "registo", "ecrã", "utilizador", "guardar").

---

## 2. Stack técnica (obrigatória)

Pedi React + Node.js com alojamento na Vercel. A forma mais simples e nativa de cumprir isso é:

- **Next.js (App Router) + TypeScript** — React no frontend, Node.js no backend (Route Handlers / Server Actions), deploy direto na Vercel.
- **Base de dados:** Postgres serverless da **Neon** (integração gratuita disponível no Marketplace da Vercel). Ligação via `DATABASE_URL`.
- **ORM:** Drizzle ORM + drizzle-kit (migrações). Driver `@neondatabase/serverless`.
- **Estilos:** Tailwind CSS v4 + componentes próprios (podes usar shadcn/ui como base, mas personaliza tudo ao design system abaixo — nada de aspeto "template").
- **Animação:** `motion` (antigo Framer Motion) para transições e micro-interações; **Lenis** para smooth scroll.
- **3D:** `three` + `@react-three/fiber` + `@react-three/drei`, carregados com `next/dynamic` (`ssr: false`) e lazy load, para não pesar no primeiro carregamento.
- **Gráficos:** Recharts (ou visx se precisares de mais controlo), com gradientes, tooltips personalizados e animação de entrada.
- **Validação:** Zod (formulários e API).
- **Formulários:** React Hook Form.
- **Auth:** sessão própria simples (ver secção 4) com `jose` (JWT em cookie httpOnly) e `bcryptjs`.
- **Datas:** `date-fns` com locale `pt`.

Usa versões estáveis atuais de cada pacote. Não adiciones dependências desnecessárias.

---

## 3. Variáveis de ambiente

Criar `.env.example` (commitado) e `.env.local` (NÃO commitado, já no `.gitignore`):

```
DATABASE_URL=postgres://...
AUTH_SECRET=            # string aleatória com 32+ caracteres
ADMIN_USERNAME=Helder Valente
ADMIN_PASSWORD_HASH=    # hash bcrypt da password
```

- Criar o script `npm run hash-password -- "<password>"` que imprime o hash bcrypt para eu colar no `.env.local` e nas Environment Variables da Vercel.
- **A password nunca pode aparecer em texto simples no código nem no repositório.** Só o hash, e só em variáveis de ambiente.
- Vou fornecer-te a password diretamente no terminal quando for preciso gerar o hash.

---

## 4. Autenticação (utilizador único)

- Página `/login` com campos **Nome de utilizador** e **Palavra-passe**.
- Utilizador: `Helder Valente` (comparação exata com `ADMIN_USERNAME`).
- Password verificada com `bcrypt.compare` contra `ADMIN_PASSWORD_HASH`.
- Sessão: JWT assinado com `AUTH_SECRET`, cookie `httpOnly`, `secure`, `sameSite=lax`, validade 30 dias, opção "Manter sessão iniciada".
- `middleware.ts` protege todas as rotas exceto `/login` e assets; redireciona para `/login` se não houver sessão válida.
- Todas as Route Handlers / Server Actions verificam a sessão.
- Limitar tentativas de login (ex.: 5 falhadas → espera de 1 minuto; um contador simples na BD chega).
- Mensagem de erro genérica ("Credenciais inválidas"), com animação de "shake" no cartão.
- Botão "Terminar sessão" no menu.

---

## 5. Os meus dados iniciais (seed)

Perfil:
- Sexo masculino, 22 anos, altura **1,71 m**
- Trabalho de escritório, média de **~12 000 passos/dia**, ~800–900 kcal gastas em atividade por dia (incluindo musculação)
- Treino natural

Medidas iniciais (data = data do primeiro deploy, editável):

| Medida | Valor |
|---|---|
| Peso | 65,4 kg |
| Braço direito (contraído) | 35,5 cm |
| Braço esquerdo (contraído) | 34,5 cm |
| Cintura | 83,5 cm |
| Peito | 95 cm |
| Ombros (perímetro) | 114 cm |

Metas atuais de nutrição (recomposição):

| Meta | Valor | Intervalo aceitável |
|---|---|---|
| Calorias | 2200 kcal | 2150–2250 |
| Proteína | 160 g | 150–160 |
| Hidratos | 250 g | 240–260 |
| Gordura | 62 g | 60–65 |

(Verificação: 160×4 + 250×4 + 62×9 ≈ 2198 kcal.)

Histórico para referência (guardar como metas antigas no histórico):
- Fase de cut anterior: 100 g hidratos / 200 g proteína / 70 g gordura.
- Início da recomposição: 210 g hidratos / 160 g proteína / 60 g gordura.

Plano de treino inicial:

| Dia | Tipo | Notas |
|---|---|---|
| Segunda | Treino | — |
| Terça | Treino | — |
| Quarta | Treino | — |
| Quinta | Descanso **ou** músculos pequenos | Antebraço, trapézio, gémeos |
| Sexta | Treino | — |
| Sábado | Opcional | "Às vezes treino" |
| Domingo | Descanso | — |

Os exercícios de cada dia ficam vazios no seed; eu preencho-os na app.

Criar `npm run db:seed` que insere tudo isto (idempotente — não duplica se já existir).

---

## 6. Modelo de dados (Drizzle / Postgres)

Sugestão (podes ajustar se tiveres razões, mas mantém simples):

- **`measurements`** — `id`, `date` (date, único), `weight_kg` (numeric), `waist_cm`, `chest_cm`, `shoulders_cm`, `arm_right_cm`, `arm_left_cm`, campos opcionais `thigh_cm`, `calf_cm`, `neck_cm`, `notes` (text), `created_at`, `updated_at`. Todas as medidas exceto data são opcionais (há semanas em que só meço cintura).
- **`daily_weights`** — `id`, `date` (único), `weight_kg`. Pesagem diária de manhã, para calcular a **média semanal** (mais fiável que um único valor).
- **`nutrition_goals`** — `id`, `effective_from` (date), `calories`, `protein_g`, `carbs_g`, `fat_g`, `label` (ex.: "Recomposição", "Cut"), `notes`. A meta ativa é a mais recente com `effective_from <= hoje`. Guardar sempre histórico, nunca sobrescrever.
- **`training_days`** — `id`, `weekday` (0–6, segunda = 0), `title` (ex.: "Push", "Costas + Bíceps"), `type` (`treino` | `descanso` | `acessórios` | `opcional`), `notes`.
- **`exercises`** — `id`, `training_day_id`, `order`, `name`, `sets`, `reps` (texto, ex.: "8–12"), `rest_seconds`, `to_failure` (bool), `notes`.
- **`habits_log`** (opcional, fase final) — `date`, `creatine` (bool), `sleep_hours` (numeric), `steps` (int).
- **`login_attempts`** — para o rate limiting.

---

## 7. Páginas e funcionalidades

Navegação principal (dock flutuante em vidro, em baixo no telemóvel, lateral/topo no desktop): **Painel · Medidas · Evolução · Metas · Treino**.

### 7.1 `/login`
- Ecrã inteiro escuro com cena 3D: um anel/arco de luz azul elétrica (inspirado na referência — o halo azul que envolve o título), partículas subtis e uma forma abstrata em vidro/metal (ex.: torus knot ou esfera "liquid chrome") que reage ao movimento do rato / giroscópio do telemóvel.
- Cartão de login em glassmorphism a flutuar sobre a cena, com entrada animada (fade + blur + scale).
- Logótipo/wordmark "RECOMP" com tipografia display larga e espaçada.
- Depois do login: transição cinematográfica para o painel (a luz expande-se e "abre" o ecrã).

### 7.2 `/` — Painel
- Saudação ("Boa noite, Helder") com data.
- **Cartões KPI** com números animados (count-up) e variação face à última medição e ao início:
  - Peso (média dos últimos 7 dias, se houver pesagens diárias; senão última medição)
  - Cintura
  - Braço (média dos dois + diferença D/E)
  - Peito, Ombros
  - **Índice de proporção ombros/cintura** (114 / 83,5 = 1,37 hoje), com barra de progresso até ao ideal estético de ~1,6
  - **Rácio cintura/altura** (83,5 / 171 = 0,49), com indicação da zona saudável (< 0,5)
- **Anéis de macros** (estilo Apple Watch, animados) com as metas ativas: kcal, proteína, hidratos, gordura.
- **Treino de hoje**: cartão com o plano do dia da semana atual e lista de exercícios.
- **Próximo check-in**: contagem decrescente até à próxima avaliação (ver 7.6) e lembrete do que medir esta semana.
- Mini-gráfico (sparkline) de cintura e peso das últimas 8 semanas.
- Botão de ação flutuante "+ Registar" sempre visível.

### 7.3 `/medidas`
- Formulário de registo semanal em passos (stepper animado no telemóvel, formulário único no desktop): data (por defeito hoje), peso, cintura, peito, ombros, braço D, braço E, opcionais, notas.
- Inputs numéricos grandes, com teclado decimal no telemóvel (`inputMode="decimal"`), aceitar vírgula ou ponto.
- Pré-preencher com os valores da última medição como placeholder, e mostrar a diferença em tempo real enquanto escrevo (verde/vermelho conforme for bom ou mau para o objetivo — ex.: cintura a descer = bom, braço a descer = mau).
- Registo rápido de **pesagem diária** (só peso) num modal curto.
- Histórico em tabela/timeline com editar e apagar (com confirmação e "anular" via toast).
- Celebração subtil (confetti discreto / brilho) quando bato um recorde: menor cintura, maior braço.

### 7.4 `/evolucao`
- Gráficos de linha com área em gradiente para cada medida, com seletor de período (4 semanas · 3 meses · 6 meses · tudo).
- Gráfico combinado **Cintura vs Braço** (dois eixos) — é o gráfico mais importante para a recomposição.
- Peso: pontos das pesagens diárias + linha da média móvel de 7 dias.
- Evolução do índice ombros/cintura.
- Linhas verticais a marcar quando mudei de metas de nutrição (a partir de `nutrition_goals`).
- Comparador "Antes / Agora": escolho duas datas e vejo lado a lado todas as medidas com as diferenças.
- Tooltips personalizados, animação de desenho da linha ao entrar no ecrã.

### 7.5 `/metas`
- Editar calorias e macros com sliders + input numérico.
- Calorias calculadas automaticamente a partir dos macros (4/4/9) com aviso se o valor manual não bater certo; opção de bloquear calorias e redistribuir os macros.
- Visualização da distribuição (donut animado) e proteína em g/kg de peso corporal.
- Guardar cria uma nova entrada no histórico com data de início; mostrar a timeline de metas anteriores.

### 7.6 Assistente de check-in (no Painel e/ou `/evolucao`)
Implementar as regras abaixo como lógica pura e testável (`lib/recomp-rules.ts`), comparando a média das medições atuais com as de há 3 semanas (ou desde o último ajuste de metas):

| Situação | Recomendação |
|---|---|
| Cintura a descer, braço igual ou a subir | Perfeito — não mexer em nada |
| Cintura igual, braço a subir | Recomposição a funcionar — não mexer em nada |
| Cintura igual, braço igual | Retirar 100–150 kcal |
| Cintura a subir ≥ 0,5 cm (com ou sem braço a subir) | Retirar 150 kcal, tirando à gordura |
| Cintura a descer, mas braço e força a cair | Subir 100–150 kcal |

- Considerar "igual" uma variação inferior a ±0,3 cm (erro de medição).
- Lembrar que é a **cintura que decide**, não o braço (o braço também sobe com gordura e água; músculo natural no braço cresce no máximo ~0,5 cm/mês).
- Mostrar a recomendação num cartão destacado com botão **"Aplicar às metas"** que cria a nova meta já ajustada (para retirar kcal à gordura: 150 kcal ≈ −17 g de gordura).
- Depois de qualquer ajuste, o próximo check-in volta a ser daqui a 2–3 semanas.
- Campo opcional "A força está a cair?" (sim/não) no registo semanal, usado nesta regra.

### 7.7 `/treino`
- Vista semanal de segunda a domingo em cartões (carrossel com swipe no telemóvel, grelha no desktop), dia atual em destaque.
- Cada dia: título, tipo (cor/ícone diferente para treino, descanso, acessórios, opcional), notas e lista de exercícios.
- Adicionar/editar/apagar exercícios; reordenar por drag & drop; marcar "até à falha".
- Modal de edição com animação de "shared layout" a partir do cartão.

### 7.8 Lembretes fixos (pequeno cartão "Rotina" no Painel)
- Pesar todas as manhãs (a app faz a média semanal).
- Cintura 1× por semana, braços a cada 2 semanas.
- Treino intenso, última série dos isolados até à falha.
- Creatina todos os dias; dormir 7–9 horas.
- (Fase final) checklist diária de creatina/sono/passos ligada a `habits_log`.

---

## 8. Design system

### 8.1 Direção visual
Referência: o hero da **Paleta 4** — fundo quase preto, um enorme arco de luz azul elétrico/branco a envolver o conteúdo, navbar em vidro, tipografia display larga, tudo com profundidade e brilho. Quero esse ambiente "produto tech premium" aplicado a fitness: escuro, luminoso, 3D, com glassmorphism e bento grid.

### 8.2 Paleta escolhida
Base da Paleta 4 (azul cobalto + preto), com um acento quente da Paleta 3 (vermillion) e um ácido da Paleta 2 para dados — o contraste entre frio e quente é ótimo para distinguir macros e boas/más tendências.

| Token | Hex | Uso |
|---|---|---|
| `--ink-950` | `#05060D` | Fundo principal |
| `--ink-900` | `#0A0D1F` | Superfícies |
| `--ink-800` | `#121735` | Cartões elevados |
| `--cobalt-600` | `#1B2CFF` | Cor primária, botões |
| `--cobalt-400` | `#4B63FF` | Hover, glows, linhas de gráfico |
| `--ice-100` | `#DCE6FF` | Texto principal, brilho do arco |
| `--ice-300` | `#9FB3E8` | Texto secundário |
| `--vermillion-500` | `#FF4A2B` | Gordura, alertas, tendências negativas |
| `--acid-400` | `#D7FF3A` | Hidratos, recordes, destaques positivos |
| `--success` | `#3DF5A6` | Tendências positivas |

Macros: **Proteína = cobalto**, **Hidratos = acid**, **Gordura = vermillion**.

Modo claro opcional (secundário): fundo `#F2F4FB`, mesmos acentos. O modo escuro é o principal.

### 8.3 Tipografia
- Display: fonte larga/geométrica (ex.: "Unbounded", "Clash Display" ou "Space Grotesk" em peso alto) para títulos e números grandes.
- Texto: "Inter" ou "Geist".
- Números sempre com `font-variant-numeric: tabular-nums`.
- Carregar com `next/font`.

### 8.4 Superfícies e efeitos
- Cartões em vidro: fundo translúcido, `backdrop-blur`, borda de 1px com gradiente subtil, brilho que segue o cursor (spotlight hover).
- Layout em **bento grid** no painel.
- Ruído/grain muito subtil por cima do fundo; gradientes radiais azuis desfocados ao fundo que se movem lentamente.
- Inclinação 3D leve (tilt) nos cartões KPI no hover (desktop).

### 8.5 Animações e interações (nível 2026)
- Transições entre páginas (View Transitions API onde suportado, com fallback em `motion`).
- Entradas escalonadas (stagger) dos elementos, reveals ao fazer scroll.
- Contadores animados nos números, anéis de progresso a preencher, linhas de gráficos a desenhar.
- Botões magnéticos, estados de hover/press com spring.
- Feedback háptico no telemóvel (`navigator.vibrate`) ao guardar.
- Skeletons com shimmer enquanto carrega.
- Toasts animados para sucesso/erro/anular.
- Cursor personalizado subtil apenas no desktop.
- Command palette (`Ctrl/Cmd + K`) para ações rápidas: registar medida, pesagem, ir para página.

### 8.6 Regras obrigatórias de qualidade
- **Respeitar `prefers-reduced-motion`**: desligar 3D animado, parallax e transições grandes.
- Cena 3D só onde acrescenta (login e um elemento no topo do painel); limitar DPR a 1,5, pausar quando fora do ecrã, fallback estático em dispositivos fracos.
- Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 95.
- Contraste WCAG AA em todo o texto.
- Mobile-first; testar em 375px de largura.
- Navegação por teclado e foco visível.
- **PWA**: manifest + ícones, para instalar no ecrã inicial do telemóvel.

---

## 9. Estrutura de pastas sugerida

```
/app
  /(auth)/login/page.tsx
  /(app)/layout.tsx          # dock, fundo, providers
  /(app)/page.tsx            # Painel
  /(app)/medidas/page.tsx
  /(app)/evolucao/page.tsx
  /(app)/metas/page.tsx
  /(app)/treino/page.tsx
  /api/...                   # se precisares de route handlers
/components
  /3d                        # cenas R3F
  /charts
  /ui
/db
  schema.ts
  index.ts
  seed.ts
/lib
  auth.ts
  recomp-rules.ts            # + testes
  calculations.ts            # médias, rácios, deltas
middleware.ts
drizzle.config.ts
```

---

## 10. Testes

- Testes unitários (Vitest) para `recomp-rules.ts` (todas as linhas da tabela 7.6 e casos-limite) e `calculations.ts` (média semanal, rácios, conversão de macros em kcal).
- Teste simples do fluxo de login (credenciais certas, erradas, rate limit).

---

## 11. Deploy na Vercel

Escreve um `README.md` em português com o passo a passo:
1. Criar repositório no GitHub e importar na Vercel.
2. Adicionar a integração Neon (Marketplace da Vercel) → `DATABASE_URL` fica configurada.
3. Adicionar `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` nas Environment Variables.
4. Correr migrações (`npm run db:migrate`) e seed (`npm run db:seed`) — explica como fazer localmente apontando para a BD de produção.
5. Como gerar o hash da password.

Scripts no `package.json`: `dev`, `build`, `start`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `hash-password`.

---

## 12. Fases de implementação

1. **Fundação** — Next.js + TS + Tailwind + Drizzle + Neon, schema, migrações, seed, `.env.example`.
2. **Auth** — login, middleware, sessão, rate limit, logout.
3. **Design system** — tokens, fontes, componentes base (cartão vidro, botão, input, dock, toasts, skeleton), layout com fundo animado.
4. **Medidas** — registo semanal, pesagem diária, histórico com editar/apagar.
5. **Painel** — KPIs, rácios, anéis de macros, treino de hoje, sparklines.
6. **Evolução** — todos os gráficos e comparador Antes/Agora.
7. **Metas** — editor com histórico + assistente de check-in com "Aplicar às metas".
8. **Treino** — plano semanal editável com drag & drop.
9. **3D e polimento** — cena do login, transições, micro-interações, command palette, PWA, reduced motion.
10. **Qualidade e deploy** — testes, Lighthouse, README, verificação final do build.

No fim de cada fase: resumo curto do que foi feito e do que falta.

---

## 13. Critérios de aceitação

- Faço login com o meu utilizador e só eu acedo aos dados.
- Registo uma medição semanal no telemóvel em menos de 30 segundos.
- Vejo a evolução de cintura vs braço num gráfico claro.
- Altero as metas e o histórico fica guardado.
- O assistente diz-me o que fazer ao fim de 3 semanas segundo as regras da secção 7.6.
- Edito o plano de treino de segunda a domingo.
- O site corre na Vercel com base de dados real, carrega rápido e impressiona visualmente.