# Agents Chiphre — guide de sélection

14 agents du projet, en 3 familles (plus les agents intégrés à Claude Code). Cette page sert à **choisir vite** le bon agent ; le détail est dans chaque `.md`. Les règles communes ne sont **pas** recopiées dans les agents : elles vivent dans [CLAUDE.md](../../CLAUDE.md) et [docs/pratiques/](../../docs/pratiques/) ; chaque agent n'y renvoie qu'avec ses 3 à 5 règles critiques.

## Famille 1 — Modules métier (priorité haute pour ces zones)

| Agent             | Zone                                                                                 | Doc système à lire d'abord                                                     |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `mathast-expert`  | `src/lib/mathAST/**`                                                                 | [mathast/README.md](../../docs/systeme/mathast/README.md) (+ pattern-matching, panel-simplifications, convention-equivalence, tidy-spec) |
| `geometry-expert` | `src/lib/geometry-core/**`, `src/lib/constructions-v2/**`                            | [geometrie/README.md](../../docs/systeme/geometrie/README.md), [dsl-builtins.md](../../docs/systeme/geometrie/dsl-builtins.md) |
| `pedagogy-expert` | `src/lib/questions/**`, `src/lib/exercises/**`, `src/lib/ubumark/**`, `mathAST/pedagogical-*` | [questions.md](../../docs/systeme/questions.md), [ubumark.md](../../docs/systeme/ubumark.md) |

**Règle d'or** : pour ces trois zones, l'agent dédié bat tous les agents génériques — il connaît les invariants non évidents.

## Famille 2 — Implémentation par couche

| Agent                 | Quand                                                                        | Doc                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `fullstack-developer` | Feature de bout en bout (DB + API + UI)                                      | [architecture-generale.md](../../docs/systeme/architecture-generale.md)                                   |
| `backend-developer`   | `+server.ts`, `+page.server.ts`, form actions, requêtes                      | [serveur.md](../../docs/systeme/serveur.md), [auth.md](../../docs/systeme/auth.md)                        |
| `frontend-developer`  | Composants UI, layouts, Shadcn-svelte, Tailwind, UX                          | [composants-ui.md](../../docs/pratiques/composants-ui.md)                                                 |
| `svelte-expert`       | Sémantique des runes (`$derived` vs `$effect`, `$bindable`, snippets, `untrack`) | [svelte-typescript.md](../../docs/pratiques/svelte-typescript.md)                                     |
| `supabase-expert`     | Schéma, migrations, RLS, Supabase Auth                                       | [base-de-donnees.md](../../docs/pratiques/base-de-donnees.md), [systeme/base-de-donnees.md](../../docs/systeme/base-de-donnees.md) |

## Famille 3 — Qualité (proactif après code)

| Agent                  | Quand                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `code-reviewer`        | **Proactif** après chaque morceau de code écrit (fin de phase)      |
| `security-auditor`     | **Proactif** après auth, RLS, API sensible, upload, dépendance ; condition 3 de `db:migrate` |
| `debugger`             | Erreur runtime, TS, build, test rouge — cause racine               |
| `test-automator`       | Créer / réparer des tests vitest, intégration, Playwright          |
| `performance-optimizer`| Lenteur prouvée, requêtes lourdes                                  |
| `accessibility-tester` | Audit a11y formulaires / navigation / modales (dette SVG : ne pas re-signaler les `svelte-ignore` de [warning-svelte.md](../../docs/pratiques/warning-svelte.md)) |

Modèles : Opus pour `code-reviewer`, `security-auditor`, `debugger`, `supabase-expert`, `mathast-expert`, `geometry-expert`, `pedagogy-expert` ; Sonnet pour les autres.

## Agents intégrés

`Explore` — exploration multi-fichiers ; préférer `grep` direct si < 3 requêtes. `Plan` — plan d'implémentation.

## Anti-patterns

- Agent pour un bug ciblé dans 1-2 fichiers connus, ou < 20 lignes → travail direct (CLAUDE.md §Quand utiliser un agent).
- Agent qui lance `pnpm check`, `pnpm build`, `pnpm lint` complets → réservés à la session principale (CLAUDE.md).
- `frontend-developer` pour un composant de `geometry-core/` → `geometry-expert`.
- Agent générique pour un fichier `mathAST` → `mathast-expert`.

## Socle commun (renvois, pas de copie)

Tous les agents suivent **CLAUDE.md §Règles de code** (règles 0 à 6 : fichiers non suivis, Zod, MySelect/MyCheckbox, runes, pas d'`any`, `pnpm svelte:autofix`, types dérivés dans `database-helpers.ts`) et **§Gros process** (typecheck = `pnpm check:incremental`, 0 erreur ; tests ciblés). Git, commits et mise en prod : CLAUDE.md §Git Workflow et [git-workflow.md](../../docs/pratiques/git-workflow.md). Commandes : [commandes.md](../../docs/pratiques/commandes.md).
