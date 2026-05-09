# Vue par élève cross-exos — progression

Route `/python-exercises/students/[student_id]` qui donne au prof une vue d'ensemble des exos qui le concernent à propos d'un élève donné. Suite logique du drill-down et du Bloc C.

## Phase 1 — Server load (TDD) ✅

**Fichiers créés :**

- `src/routes/(public)/python-exercises/students/[student_id]/+page.server.ts` (~190 lignes)
- `+page.server.test.ts` (8 tests)

**Comportements :**

- Auth : redirect non-auth, redirect non-prof, 404 si profil élève introuvable.
- **Scope check** : l'élève doit être dans une de mes classes actives OU avoir au moins une assignment directe par moi (sur n'importe quel exo). Sinon 403 — on ne révèle pas qu'un élève existe en dehors du périmètre du prof.
- **Set des exos affichés** = (exos `author_id = me` ∩ exos sur lesquels l'élève a soumis) ∪ (exos que j'ai assignés directement à cet élève) ∪ (exos que j'ai assignés à l'une des classes contenant cet élève).
- Chaque ligne : exercise summary (id, title, level, author_id) + mastery_status (mastered/in_progress/not_started, même mapping que Bloc C) + total_attempts + last_attempt_at + last_attempt_correct.

**Exos exclus** :

- Exos d'autres profs sur lesquels l'élève a soumis librement → invisibles. C'est leur pédagogie, pas la mienne.
- Exos assignés par d'autres profs aux classes dont je suis aussi le teacher → invisibles (probable collision rare ; à revoir si besoin).

**Tests** : 3 auth + 1 scope + 4 composition (authored, assigned, dedupe, empty).

## Phase 2 — UI ✅

**Fichier créé :**

- `+page.svelte` (~330 lignes)

**Layout :**

- Header : back link vers `/python-exercises/mine` + nom élève + email.
- 4 cards stats globales : Exercices concernés (+ % maîtrisé), Maîtrisé, En cours, Dernière activité.
- Filtre niveau (MySelect : Tous / Collège / Lycée / NSI / Étudiant).
- Table par exercice : titre (lien drill-down) · niveau · badge mastery · tentatives · dernière activité · ✓/✗.
- Tri colonnes cliquables : titre / tentatives / dernière activité.
- État vide explicite quand `rows.length === 0`.

## Phase 3 — Lien depuis drill-down ✅

Modification de `/python-exercises/[id]/results/[student_id]/+page.svelte` : ajout d'un bouton outline "Voir tous ses exos" (icône LayoutGrid) dans le header, à droite du nom de l'élève. Permet le pivot drill-down → vue d'ensemble en un clic.

## Quality finale ✅

- ESLint : 0 problème sur les 4 fichiers (3 nouveaux + 1 modifié).
- Tests serveur : 31/31 verts (14 results + 9 drill-down + 8 per-student).
- `pnpm check:incremental` : 9 ERRORS (baseline préservée).
- Svelte autofixer : 0 issue (1 fix : inline du `href` template au lieu de l'extraire en helper, l'autofixer flagait `Unexpected href link without resolve()`).

## Vérification UI manuelle (à faire utilisateur)

1. Connecté comme prof, sur `/python-exercises/<id>/results/<student_id>` → cliquer "Voir tous ses exos" → arrive sur `/students/[student_id]`.
2. Page affiche la liste des exos pertinents : ceux qu'on a assignés à cet élève + ceux qu'on a écrits sur lesquels il a soumis.
3. Cliquer sur un titre d'exo → drill-down `/python-exercises/[exoId]/results/[studentId]`.
4. Filtrer par niveau (lycée par exemple) → filtre côté client appliqué.
5. Tri colonnes : nom asc/desc, tentatives asc/desc, dernière activité asc/desc.
6. Tenter `student_id` valide hors-scope → 403.
7. Tenter `student_id` malformé → 400.

## Documents produits

- `docs/wip/python-exercises-per-student-progress.md` (ce document).
