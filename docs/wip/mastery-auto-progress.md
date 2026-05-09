# Mastery automatique Python (Bloc B) — progression

Ajout d'une table `python_exercise_mastery` et d'un trigger qui dérive automatiquement le statut (`mastered` / `needs_review`) à partir des soumissions persistées (Bloc A). Sticky-mastered : une fois acquis, ne se dégrade pas (la dégradation temporelle viendra avec V3 SRS).

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Migration DB ✅

**Fichier créé :** `supabase/migrations/20260509091440_create_python_exercise_mastery.sql`.

Contenu :

- Table `python_exercise_mastery (id, student_id, exercise_id, status, updated_at)` avec UNIQUE(student_id, exercise_id), CHECK status ∈ ('mastered', 'needs_review'), FK CASCADE.
- 3 indexes (student_id, exercise_id, (student_id, status)).
- RLS : `pem_select_own` (élève) + `pem_select_teacher` (via `is_teacher_of_student`). Pas de policy INSERT/UPDATE/DELETE — le trigger seul modifie.
- Trigger BEFORE UPDATE → rafraîchit `updated_at`.
- Trigger AFTER INSERT sur `python_exercise_submissions` → upsert sticky-mastered :
  - `is_correct=true` : INSERT 'mastered' OU upgrade 'needs_review' → 'mastered' (WHERE status != 'mastered' → no-op si déjà mastered).
  - `is_correct=false` : INSERT 'needs_review' SI absent ; ON CONFLICT DO NOTHING préserve un 'mastered' existant.

Les 4 comportements (B2-B5) sont commentés explicitement dans le SQL pour qu'un futur lecteur sache l'intention.

**Vérification manuelle après `pnpm db:migrate`** : voir la section "Vérification end-to-end" du plan.

## Phase 2+3 — Types + Zod + endpoints API ✅

**Fichiers modifiés/créés :**

- `src/lib/types/python-exercises.ts` — types `PythonMasteryStatus` et `PythonExerciseMastery`.
- `src/lib/server/validation/python-exercises.ts` — schemas Zod `pythonMasteryQuerySchema` (limit 1-500 default 100, student_id UUID optional) et `pythonMasterySingleQuerySchema`.
- `src/routes/api/python-exercises/mastery/+server.ts` — endpoint GLOBAL : retourne `[{exercise_id, status, updated_at}]`. RLS filtre par défaut sur le caller, ou sur `?student_id=X` si fourni.
- `src/routes/api/python-exercises/mastery/server.test.ts` — 6 tests (401, 400 limit out of range, élève own, prof RLS-pass, prof RLS-filtré, 500).
- `src/routes/api/python-exercises/[id]/mastery/+server.ts` — endpoint MONO : retourne `{status: 'mastered' | 'needs_review' | null}` pour cet exo. `null` = absence de row = `not_worked` implicite.
- `src/routes/api/python-exercises/[id]/mastery/server.test.ts` — 6 tests (401, 400 UUID exercice, 400 UUID student_id, statut existant, statut absent, 500).

**Vérifié :** 12/12 tests verts (6 global + 6 mono).

**Décisions :**

- Pas de `?exercise_id=` sur l'endpoint global — pour ce filtrage, utiliser le mono-endpoint (plus efficace côté DB et plus explicite).
- Le `targetStudent = student_id ?? user.id` couvre les deux cas : élève voit son propre statut sans paramètre, prof passe `?student_id=X`. La RLS empêche un élève de fouiller chez les autres (ligne `pem_select_own` filtre sur `auth.uid() = student_id`).

## Phase 4 — UI badge ⏳

## Phase 5 — Quality checks ⏳
