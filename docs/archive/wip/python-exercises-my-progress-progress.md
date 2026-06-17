# Dashboard "Ma progression" élève — progression

Route `/python-exercises/my-progress` qui donne à l'élève une vue d'ensemble de tous les exos sur lesquels il a une trace (submission, mastery row, ou assignment touchant lui). Pendant côté élève des vues prof Bloc C / drill-down / per-student.

## Phase 1 — Server load (TDD) ✅

**Fichiers créés :**

- `src/routes/(public)/python-exercises/my-progress/+page.server.ts` (~152 lignes)
- `+page.server.test.ts` (7 tests)

**Comportements :**

- Auth : redirect non-auth → /auth/signin ; redirect prof → /python-exercises/mine (le prof a ses propres outils).
- Compose 4 sources DB :
  - `class_members` du student (mes classes actives)
  - `python_exercise_assignments` touchant l'élève (direct OR via mes classes)
  - `python_exercise_submissions` du student (toutes, groupées par exo)
  - `python_exercise_mastery` du student
- Union des exos d'intérêt = `assigned ∪ submitted ∪ mastery`. Détails fetchés en 1 round-trip via `.in('id', unionIds)`.
- Mapping mastery : 3 statuts alignés DB (`mastered` / `needs_review` / `not_started`), même règle que les pages prof.
- Short-circuit : union vide → `rows: []`.

**Tests** : 2 auth + 5 composition (submitted, assigned-via-class, dedupe, needs_review, empty).

## Phase 2 — UI ✅

**Fichier créé :**

- `+page.svelte` (~330 lignes)

**Layout :**

- Header simple : "Ma progression" + sous-titre.
- 4 cards stats : Exercices · Maîtrisé · À retravailler · Pas commencé (+ % maîtrise).
- Filtres : niveau (MySelect) + statut (MySelect).
- Table par exo : titre cliquable (lien `resolve(\`/python-exercises/${id}\`)` pour aller travailler) · niveau · badge mastery · tentatives · dernière activité · ✓/✗.
- Tri colonnes : titre / tentatives / dernière activité.
- État vide différencié : "Pas encore travaillé d'exo" (catalogue link) vs "Aucun ne correspond aux filtres".

**Détail technique** : `resolve()` utilisé pour les hrefs (cohérence avec le pattern repo, validé par svelte-autofixer).

## Phase 3 — Lien depuis page exo ✅

Modification de `/python-exercises/[id]/+page.svelte` : header gagne un bouton outline "Ma progression" (icône LineChart) visible aux élèves (`canSubmit`). Sit à côté de "Voir les résultats" (bouton prof). Le header branche désormais par rôle : prof → mes résultats, élève → ma progression.

## Quality finale ✅

- ESLint : 0 problème sur les 4 fichiers (3 nouveaux + 1 modifié).
- Tests serveur : 38/38 verts (14 results + 9 drill-down + 8 per-student + 7 my-progress).
- `pnpm check:incremental` : 9 ERRORS (baseline préservée).
- Svelte autofixer : 0 issue (2 hrefs ajustés vers `resolve()` au passage).

## Vérification UI manuelle (à faire utilisateur)

1. Connecté comme élève qui a fait au moins 1 submission Python et qui est dans une classe avec assignments :
   - Ouvrir `/python-exercises/[id]` → bouton "Ma progression" en haut → arrive sur `/my-progress`.
   - Page affiche les exos pertinents (assignés + soumis + mastery).
   - Cliquer sur un titre → revient sur la page consultation pour bosser dessus.
2. Filtres niveau + statut : cumulatifs.
3. Tri colonnes cliquables.
4. Élève sans activité → message "Tu n'as pas encore travaillé d'exercice Python" + lien vers la liste.
5. Connecté comme prof → `/my-progress` → redirect vers `/python-exercises/mine`.

## Documents produits

- `docs/wip/python-exercises-my-progress-progress.md` (ce document).
