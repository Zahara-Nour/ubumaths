# Drill-down soumissions élève — progression

Route `/python-exercises/[id]/results/[student_id]` pour qu'un prof inspecte les soumissions d'un élève sur un exo donné (code soumis + verdict détaillé). Suite logique du Bloc C.

## Phase 1 — Server load (TDD) ✅

**Fichiers créés :**

- `src/routes/(public)/python-exercises/[id]/results/[student_id]/+page.server.ts` (~145 lignes)
- `+page.server.test.ts` (9 tests)

**Comportements :**

- Auth/access mêmes garde-fous que `/results` parent : redirect non-auth, redirect non-prof, 404 exo absent, 403 si ni auteur ni prof ayant assigné.
- **Scope check additionnel** : l'élève demandé doit être dans une classe active du prof OU avoir été assigné directement par lui sur cet exo. Sinon 403 — on ne leak pas les soumissions d'élèves arbitraires à un prof qui se trouverait être l'auteur de l'exo.
- Submissions complètes (`*` avec `code` + `validation_result`), `LIMIT 50`, ordre desc by `created_at`.
- Profile élève fetché en plus (firstname, lastname, email).

**Tests** : 4 auth + 3 scope + 2 data (sort desc + LIMIT 50).

## Phase 2 — UI ✅

**Fichier créé :**

- `+page.svelte` (~150 lignes)

**Layout :**

- Header : back link vers `/results` + titre exo + nom élève + email.
- Card "Tentatives" avec liste expandable. Première tentative ouverte par défaut, autres fermées (mount lazy du PythonEditor au clic).
- Chaque entrée fermée : icône ✓/✗ + #attempt + date relative + badge "Libre" si free practice + temps d'exécution.
- Chaque entrée ouverte : header "Code soumis" + bouton Copier + `PythonEditor` read-only (via `disabled`) + verdict via `ExerciseValidationResult` existant.
- État vide : message "Aucune tentative pour cet élève sur cet exercice".

## Phase 3 — Lien depuis table résultats ✅

Modification de `+page.svelte` parent (`/results`) : le nom de l'élève dans chaque ligne devient un `<a href="/results/[student_id]">` avec hover underline. Pas de bouton dédié, le nom suffit.

## Quality finale ✅

- ESLint : 0 problème sur les 3 fichiers nouveaux + 1 modifié.
- Tests serveur : 23/23 verts (14 parent + 9 drill-down).
- `pnpm check:incremental` : 9 ERRORS (baseline préservée).
- Svelte autofixer : 0 issue (1 suggestion `state_referenced_locally` résolue en déplaçant le snapshot dans une fonction locale).

## Vérification UI manuelle (à faire utilisateur)

1. Connecté comme prof auteur d'un exo avec assignment + classes peuplées + soumissions :
   - `/python-exercises/<id>/results` → cliquer un nom d'élève → drill-down chargée.
   - Première tentative ouverte par défaut, code visible avec syntax highlight Python.
   - Cliquer ✗/✓ d'autres tentatives → ouverture/fermeture.
   - Bouton Copier → toast "Code copié".
   - Back link ← → retour à `/results`.
2. Tenter un `student_id` valide mais hors-scope (ex: élève d'une autre classe que les tiennes) → 403.
3. Tenter `student_id` malformé → 400.

## Documents produits

- `docs/wip/python-exercises-drill-down-progress.md` (ce document).
