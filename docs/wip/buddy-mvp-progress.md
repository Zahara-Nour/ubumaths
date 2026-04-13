# Buddy MVP — Document de progression

> Suivi d'implementation du MVP du systeme Palotin.
> Plan : `~/.claude/plans/nifty-giggling-lecun.md`
> Spec : `docs/wip/buddy-palotins-spec.md`

## Etat actuel

**Phase en cours** : Phase 4 (widget UI)

## Phases

### Phase 1 — Database + Types ✅

**Fichiers crees** :

- `supabase/migrations/20260413120000_create_buddy_system.sql`
  - Table `student_buddies` (PK student_id, xp, level, streak, themes_explored, change_count)
  - Table `buddy_skins` (18 skins seed : 6 niveaux x 3 palotins)
  - RLS : student own row, teacher via class_members, admin via is_teacher_or_admin()
  - RPC `add_buddy_xp(p_student_id, p_xp, p_is_milestone)` — cap 100/jour, calcul niveau, SELECT FOR UPDATE
  - Trigger updated_at
  - Indexes sur palotin_type, level, unlock_method
- `src/lib/types/buddy.ts` — BuddyState, BuddyExpression, BuddyXpGainResult, BuddyQuizAnswer, BuddyQuizResult

**Fichiers modifies** :

- `src/lib/types/database-helpers.ts` — ajout aliases StudentBuddy, BuddySkin

**Non verifie** : migration non pushee (attente `pnpm db:migrate` par l'utilisateur)

### Phase 2 — Logique serveur ✅

**Fichiers crees** :

- `src/lib/server/buddy-xp.ts` — fonctions pures : XP_TABLE, calculateLevel, calculateXpGain, calculateStreakBonus, scoreQuiz, xpProgress
- `src/lib/server/buddy-queries.ts` — queries DB : getStudentBuddy, createStudentBuddy, changeStudentPalotin, addBuddyXp, updateStreak, resetStreak, addExploredTheme, getClassBuddies
- `src/lib/server/buddy-xp-service.ts` — orchestration : addBuddyXpFromExercise, addBuddyXpFromTest
- `src/lib/server/validation/buddy.ts` — schemas Zod

### Phase 3 — Cache + API endpoints ✅

**Fichiers modifies** :

- `src/lib/types/student-cache.ts` — ajout `CachedBuddy` interface
- `src/lib/stores/studentDashboardCache.svelte.ts` — 4e cache buddy : getBuddySync, hydrateBuddy, invalidateBuddy, updateBuddyXpOptimistic
- `src/routes/(protected)/dashboard/student/+layout.server.ts` — fetch buddy + streak loss detection + reset
- `src/routes/(protected)/dashboard/student/+layout.svelte` — hydratation buddy cache

**Fichiers crees** :

- `src/routes/api/student/buddy/+server.ts` — GET (fetch) + POST (create after quiz)
- `src/routes/api/student/buddy/xp/+server.ts` — POST (add XP from exercise)
- `src/routes/api/student/buddy/change/+server.ts` — POST (change palotin, 1er gratuit puis 50 gidouilles)

### Phase 4 — Widget UI ⬜

### Phase 5 — Quiz selection ⬜

### Phase 6 — Hook XP (tests/riddles/quiz) ⬜

### Phase 7 — Streak ⬜

### Phase 8 — Dashboard enseignant ⬜

### Phase 9 — Changement palotin + quality checks ⬜

## Decisions prises pendant l'implementation

- XP hook sur 3 systemes interactifs (pas exercise-mastery qui est manuel) :
  - Tests interactifs (`/api/tests/save`)
  - Enigmes (`/api/riddles/[id]/submit`)
  - Quiz chapitre (`/api/student/chapters/[id]/quiz/submit`)

## Fichiers existants avant implementation

- `src/lib/config/buddy-messages.ts` — 396 messages pre-ecrits (3 palotins x contextes + anecdotes + idle lore)
- `docs/wip/buddy-palotins-spec.md` — spec complete
