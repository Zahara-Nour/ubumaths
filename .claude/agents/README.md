# Agents UbuMaths — guide de sélection

17 agents spécialisés, organisés en 5 familles. Cette page sert à **choisir vite** le bon agent. Pour le détail de chaque agent, ouvrir son `.md`.

## Famille 1 — Modules métier UbuMaths (priorité haute pour ces zones)

| Agent | Zone | Quand l'utiliser |
|---|---|---|
| `mathast-expert` | `src/lib/mathAST/**` | Parser LaTeX, pattern matching (`P`, `tryMatch`), normalize, differentiate, solve, pedagogical-solve, cosmetic-transforms |
| `geometry-expert` | `src/lib/geometry-core/**`, `src/lib/constructions-v2/**` | DSL géométrie (`courbe`, `tangente`, `point_sur`, `intersection`, `lieu`, vecteurs, transformations), GeometryCanvas, constructions, instruments |
| `pedagogy-expert` | `src/lib/questions/**`, `src/lib/exercises/**`, `src/lib/ubumark/**`, `mathAST/pedagogical-*` | Templates, variations, blanks, QCM, validation pipeline, paliers, rendu pédagogique |

**Règle d'or** : pour ces trois zones, l'agent dédié bat tous les agents génériques (frontend/backend/typescript) — il connaît les invariants non-évidents.

## Famille 2 — Implémentation par couche

| Agent | Quand |
|---|---|
| `fullstack-developer` | Feature end-to-end DB + API + UI en une fois |
| `backend-developer` | `+server.ts`, `+page.server.ts`, form actions, query optimization |
| `frontend-developer` | Composants UI, layouts, Shadcn-svelte, Tailwind, UX |
| `svelte-expert` | Question sémantique runes (`$derived` vs `$effect`, `$bindable`, snippets, untrack, migration Svelte 4→5) |
| `supabase-expert` | Schéma DB, migrations, RLS, Supabase Auth (Opus) |
| `api-designer` | Design *contrat* REST (URLs, statuts, pagination, Zod) avant implémentation |
| `typescript-expert` | Types avancés (generics, conditional, mapped, template literal), tsconfig |

## Famille 3 — Qualité (proactif après code)

| Agent | Quand | Modèle |
|---|---|---|
| `code-reviewer` | **Proactif** après chaque morceau de code écrit | Opus |
| `security-auditor` | **Proactif** après auth, API sensible, file upload, dépendance nouvelle | Opus |
| `debugger` | Erreur runtime, TS, build, test fail — diagnostic root-cause | Opus |
| `test-automator` | Créer/réparer tests Vitest, Playwright |
| `performance-optimizer` | Lenteur prouvée, avant deploy d'une grosse feature |
| `accessibility-tester` | Audit a11y formulaires/navigation/modals (cf. dette SVG documentée — ne pas re-flagger les `svelte-ignore` existants) |

## Famille 4 — Process

| Agent | Quand |
|---|---|
| `commit-manager` | Commits complexes multi-fichiers. **Jamais auto-push, jamais auto-release, jamais Co-Authored-By** |
| `documentation-writer` | **Proactif** après features importantes |

## Famille 5 — Recherche

`Explore` (built-in) — exploration de code multi-fichiers. Préférer `find`/`grep` direct si < 3 requêtes (CLAUDE.md).

---

## Anti-patterns à éviter

- **Lancer un agent pour un bug ciblé dans 1-2 fichiers connus** → travail direct (CLAUDE.md "Quand NE PAS utiliser d'agent")
- **Lancer un agent pour < 20 lignes de code** → travail direct
- **Faire tourner un agent pour exécuter `pnpm check`, `pnpm build`, `pnpm lint`, `pnpm test:triggers`** → INTERDIT (memory : saturation mémoire, faux positifs, ou setup Docker cassé)
- **Choisir `frontend-developer` pour un composant dans `geometry-core/`** → utiliser `geometry-expert` (connaît les invariants Canvas et le système réactif)
- **Choisir `typescript-expert` pour un fichier mathAST** → utiliser `mathast-expert` (invariants nodes immutables, no-negative-number-literal, pattern module obligatoire)

## Modèles

Opus : `code-reviewer`, `security-auditor`, `debugger`, `supabase-expert`, `mathast-expert`, `geometry-expert`, `pedagogy-expert`.
Sonnet : tous les autres.

## Conventions partagées (toutes familles)

Tous les agents respectent :

1. **CLAUDE.md règle #0** : ne JAMAIS supprimer de fichiers non-trackés sans demander
2. **CLAUDE.md règle #1** : Zod sur tout `request.json()` / query param
3. **CLAUDE.md règle #2** : `MySelect`/`MyCheckbox` (jamais Shadcn Select/Checkbox ni `<select>` natif)
4. **CLAUDE.md règle #3** : Svelte 5 runes uniquement, `$effect` réservé aux side-effects
5. **CLAUDE.md règle #5** : `mcp__svelte__svelte-autofixer` obligatoire après chaque `.svelte`
6. **CLAUDE.md règle #6** : types custom dans `database-helpers.ts`, jamais dans `database.ts` auto-généré
7. **Commandes interdites** : `pnpm check`, `pnpm check:fast`, `svelte-check` sans `--incremental`, `pnpm build` pour vérifier, `pnpm test:triggers`, runs multiples de `pnpm check:incremental`
8. **Pas de Co-Authored-By Claude** dans les commits ; pas d'auto-push, pas d'auto-release
