# Soumissions persistées (Bloc A) — progression

Permettre la soumission persistée des exos Python pour tous les étudiants : exos assignés (existant) ET exos publics en libre accès (nouveau). Bouton "Soumettre" séparé du "Vérifier", panneau historique sur la page consultation, tout traçable côté prof.

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Migration RLS + endpoints API ✅

**Fichiers créés / modifiés :**

- `supabase/migrations/20260509002840_allow_public_python_submissions.sql` — nouvelle policy `python_exercise_submissions_insert_public` qui autorise un élève à insérer une soumission sans assignment quand l'exercice est `is_public = TRUE`. La policy historique (qui exige une assignment) reste en place ; PostgreSQL OR-combine les deux.
- `src/routes/api/python-exercises/[id]/submit/+server.ts` — relâché : si pas d'assignment, on vérifie que l'exo est public, sinon 403. Les checks `max_attempts` et `due_date` sont entourés d'un `if (assignment)` pour ne s'appliquer qu'aux soumissions assignées. Le body de l'INSERT met `assignment_id: assignment?.id ?? null`.
- `src/routes/api/python-exercises/[id]/my-submissions/+server.ts` — nouveau GET. Lit les soumissions sur cet exo (RLS filtre élève vs prof), supporte `?limit=N` (défaut 10, max 50).
- `src/routes/api/python-exercises/[id]/my-submissions/server.test.ts` — 6 tests : élève authentifié reçoit ses soumissions, prof reçoit la vue RLS-élargie, anon reçoit 401, RLS-filtré → tableau vide, erreur Supabase → 500, limit clampé à 50.

**Vérifié :** 6/6 tests verts.

**Décisions :**

- La logique d'autorisation en lecture est déléguée à RLS — le handler ne fait qu'auth + pagination. Plus simple, moins de duplication, garanties uniformes pour student / teacher / anon.
- En écriture (`/submit`), la décision "pas d'assignment + exo non public → 403" reste applicative pour retourner une erreur explicite plutôt que laisser RLS échouer avec un message générique.
- Idempotence migration : `DROP POLICY IF EXISTS` + `CREATE POLICY` (au cas où).

## Phase 2 — UI page consultation ⏳

## Phase 3 — Quality checks ⏳
