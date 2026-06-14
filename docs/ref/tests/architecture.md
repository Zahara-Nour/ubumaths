# Architecture des tests — référence

Source de vérité unique pour l'organisation des tests d'UbuMaths : où ranger un test,
comment le nommer, quel runner l'exécute, et ce qui tourne en CI.

> Voir aussi : [scripts pnpm](../pnpm-scripts.md). Le workflow TDD collaboratif est décrit dans CLAUDE.md
> (le doc dédié `docs/ref/tests/tdd.md` reste à créer — cf. nettoyage des docs de tests).

---

## 🧭 Principe directeur — deux axes orthogonaux

L'organisation repose sur **deux axes indépendants** qu'il ne faut jamais confondre :

| Axe               | Question                                              | Détermine                                         |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------- |
| **TYPE**          | Qu'est-ce qu'on teste, avec quel niveau d'isolation ? | **Où** vit le fichier                             |
| **ENVIRONNEMENT** | Le test a-t-il besoin d'un DOM/navigateur ?           | **Quel projet vitest** l'exécute (via le suffixe) |

- L'axe **TYPE** = `unit` / `integration` / `e2e`.
- L'axe **ENVIRONNEMENT** = `node` vs `browser` — signalé **uniquement par le suffixe du fichier**.

### Règle d'or

> **Un test unitaire vit À CÔTÉ de son code, dans un dossier `__tests__/`.** > **Le répertoire `tests/` est réservé à ce qui ne PEUT PAS être co-localisé** :
> besoin d'une vraie base de données, d'un navigateur piloté, ou de plusieurs modules réels assemblés.

---

## 📁 Arborescence cible

```
src/
└── <module>/
    ├── foo.ts
    └── __tests__/
        ├── foo.test.ts            → unitaire node   (projet vitest "server")
        └── Bar.svelte.test.ts     → unitaire browser (projet vitest "client")

tests/                              ← UNIQUEMENT ce qui ne peut pas être co-localisé
├── integration/                   ← nécessite Supabase local (port 54321)
│   ├── <domaine>/                 (vip-cards/, marketplace/, kanban/, …)
│   │   └── *.test.ts
│   └── database/                  ← triggers / RLS / fonctions PL/pgSQL
│       └── *.test.ts
├── helpers/                       ← infra de test partagée
│   ├── supabase/                  (mock-client, mock-locals, mock-request, …)
│   └── fixtures/                  (factories : profiles, marketplace, game, …)
└── fixtures/                      (données de seed réutilisables)

e2e/                               ← parcours navigateur (Playwright)
└── <rôle>/                        (auth/, teacher/, student/, public/, navadra/)
    └── *.spec.ts

eslint-rules/
└── *.test.js                      ← tests des règles ESLint custom
```

---

## 🏷️ Convention de nommage (routage par suffixe)

Le **suffixe** est la seule chose qui route un test vers le bon runner. À respecter strictement.

| Suffixe                            | Type                                      | Environnement      | Runner                                                        |
| ---------------------------------- | ----------------------------------------- | ------------------ | ------------------------------------------------------------- |
| `*.test.ts`                        | unitaire / intégration                    | node               | vitest (projet `server` ou config intégration)                |
| `*.svelte.test.ts`                 | unitaire (composant, store rune)          | browser (chromium) | vitest projet `client`                                        |
| `*-real.svelte.test.ts`            | unitaire browser **lourd** (Pyodide réel) | browser            | vitest `client`, **exclu de la CI normale**, lancé en nightly |
| `*.spec.ts`                        | e2e                                       | navigateur complet | Playwright                                                    |
| `*.test.js` (dans `eslint-rules/`) | règle de lint                             | node               | `pnpm test:lint-rules`                                        |

---

## ⚙️ Runners & configs

| Config                                 | Cible (glob)              | Env.                  | Lancement               |
| -------------------------------------- | ------------------------- | --------------------- | ----------------------- |
| `vite.config.ts` → projet **`server`** | `src/**/*.test.ts`        | node                  | `pnpm test:server`      |
| `vite.config.ts` → projet **`client`** | `src/**/*.svelte.test.ts` | browser               | `pnpm test:client`      |
| `vitest.integration.config.ts`         | `tests/integration/**`    | node + Supabase local | `pnpm test:integration` |
| `playwright.config.ts`                 | `e2e/**`                  | 3 navigateurs         | `pnpm test:e2e`         |

> Coverage (`provider: v8`) est configuré dans `vite.config.ts`, scope `src/**/*.{ts,svelte}`.

### Décisions de config actées

- **Plus de config Docker triggers.** `vitest.triggers.config.ts` et les scripts `test:triggers*` sont supprimés. Les tests de base de données sont des **tests d'intégration** sous `tests/integration/database/`, exécutés par le runner d'intégration contre le Supabase local.
- **`tests/unit/` n'existe plus.** Tout test unitaire est co-localisé sous `src/**/__tests__/`. Le projet `server` ne cible donc que `src/**`.

---

## 🤖 Ce qui tourne en CI

| Job (workflow)                       | Tests                                           | Déclenchement |
| ------------------------------------ | ----------------------------------------------- | ------------- |
| `test-server` (`quality.yml`)        | projet `server`, **4 shards**                   | push + PR     |
| `test-client` (`quality.yml`)        | projet `client` (hors `*-real`)                 | push + PR     |
| Real-Pyodide (`nightly-pyodide.yml`) | `*-real.svelte.test.ts` (`RUN_PYODIDE_REAL=1`)  | nightly       |
| **Intégration (nightly)**            | `tests/integration/**` (démarre Supabase local) | nightly       |

- **e2e** : lancé localement / à la demande (build + preview), pas dans la boucle de push.
- Le **gate de régression réel** = `test-server` (rapide, déterministe, node).

---

## 🚀 Commandes utiles

```bash
# Unitaires
pnpm test:server <path>     # tests node (rapide)
pnpm test:client <path>     # tests browser (*.svelte.test.ts)
pnpm test:changed           # uniquement les tests impactés par le diff

# Intégration (nécessite Supabase local)
pnpm db:start
pnpm test:integration

# E2E (build + preview Playwright)
pnpm test:e2e
pnpm test:e2e --headed e2e/auth/login.spec.ts

# Règles ESLint custom
pnpm test:lint-rules
```

---

## 🧩 Où ranger un nouveau test ? (arbre de décision)

1. **Pilote un navigateur sur l'app complète** (parcours utilisateur) → `e2e/<rôle>/*.spec.ts`.
2. **A besoin d'une vraie base Supabase** (RLS, triggers, RPC, race conditions) → `tests/integration/<domaine>/*.test.ts` (ou `tests/integration/database/` pour les triggers).
3. **Teste un composant Svelte ou un store rune** (besoin d'un DOM) → `src/<module>/__tests__/*.svelte.test.ts`.
4. **Teste de la logique pure / une fonction serveur** → `src/<module>/__tests__/*.test.ts`.
5. **Teste une règle ESLint custom** → `eslint-rules/*.test.js`.

Tout le reste se co-localise dans le `__tests__/` du module concerné. Si tu hésites à mettre
un fichier dans `tests/`, demande-toi : « est-ce que ça peut vivre à côté de son code ? ». Si oui,
ça va dans `__tests__/`.

---

## 🧪 Types de tests optionnels (backlog)

Non encore systématisés, à introduire au besoin :

- **Accessibilité** : `axe-core` dans les specs e2e (agent `accessibility-tester` disponible).
- **Régression visuelle** : snapshots Playwright pour `GeometryCanvas` / whiteboard.
- **Benchmarks** : `vitest bench` pour les suites lourdes (`mathAST`, `geometry-core`).

---

## 📌 État de la migration

L'architecture ci-dessus est la **cible**. La migration depuis l'organisation historique
(tests à plat, `tests/unit/` dupliqué, triggers Docker cassés) est suivie dans
`docs/wip/test-architecture-progress.md`.
