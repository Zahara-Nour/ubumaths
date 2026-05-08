# Comparateur Python custom (special judge) — progression

Ajout d'une 4e variante au discriminated union `OutputComparison` : `{ kind: 'custom', code: string, timeout_ms?: number }`. Le prof écrit une fonction Python `compare(expected, actual, stdin) -> bool | dict` qui décide à la place des comparaisons standard. Débloque les cas d'usage où plusieurs solutions sont valides (ordre libre, sortie probabiliste, vérification structurelle, etc.).

Décisions :

- **Niveau de garantie : honneur** (le code custom voyage côté élève dans le payload mais n'est pas affiché dans l'UI ; strippé par l'API pour les non-auteurs). Cohérent avec les tests cachés.
- **Bouton "Tester le comparateur"** dans l'éditeur : V1 ; exécute `compare(expected, expected, input)` sur chaque test case (tous doivent passer).
- **`unit_test`** : reporté en V2.
- **Timeout dédié** : 2 s par défaut, configurable jusqu'à 10 s.

## Phase 1 — Types + Zod ✅

**Fichiers modifiés :**

- `src/lib/types/python-exercises.ts` — `CustomComparison` ajouté à l'union `OutputComparison`.
- `src/lib/shared/python/types.ts` — pareil (copie worker).
- `src/lib/server/validation/python-exercises.ts` — `customComparisonSchema` Zod (code 1-10k chars, timeout_ms 100-10000ms default 2000), ajouté au discriminated union.
- `src/lib/shared/python/worker/messages.ts` — pareil côté worker.
- `src/lib/shared/python/index.ts` — barrel exports.

## Phase 2 — Worker custom comparator ⏳

## Phase 3 — Strip API du code custom ⏳

## Phase 4 — UI auteur ⏳

## Phase 5 — Quality checks ⏳
