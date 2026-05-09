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

## Phase 2+3 — Types + Zod + endpoints API ⏳

## Phase 4 — UI badge ⏳

## Phase 5 — Quality checks ⏳
