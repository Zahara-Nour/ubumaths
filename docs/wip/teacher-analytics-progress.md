# Teacher Analytics V2.0 — Progress

Chantier "Stats prof sur les nouvelles données SRS/FSRS + famille B".
Plan complet : voir conversation `2026-06-10` + memory.

---

## Phase 1 — Backend ✅ (2026-06-10)

### Livré

- **`src/lib/server/stats/class-knowledge.ts`** (NEW)
  - `getClassCapacityGrid(supabase, classId, opts)` — Widget A
  - `getClassTopCapacitiesToRemediate(supabase, classId, topN)` — Widget E
  - `getStudentRetentionCurve(supabase, studentId, themeBoReference, weeks)` — Widget B (retrievability_avg par semaine, parse review_history JSONB)
  - `getClassActivityHeatmap(supabase, classId, days, alertThresholdDays)` — Widget C
  - `getStudentGradeHistogram(supabase, studentId, days)` — Widget D
- **`src/lib/server/stats/class-competence.ts`** (NEW)
  - `getClassCompetenceGrid(supabase, classId)` — Widget F
  - `getClassTopObservablesToConsolidate(supabase, classId, topN)` — Widget G
- **`src/lib/server/stats/index.ts`** (NEW) — barrel
- **`src/lib/server/stats/teacher-class-auth.ts`** (NEW) — garde `requireTeacherOfClass` (404 si classe inconnue, 403 si pas owner/admin)
- **`src/lib/server/validation/teacher-analytics.ts`** (NEW) — 6 schemas Zod
- **7 endpoints REST** sous `/api/teacher/classes/[classId]/analytics/`
  - `knowledge-grid/` (Widget A)
  - `knowledge-top-remediate/` (Widget E)
  - `knowledge-retention/[studentId]/` (Widget B, `?theme=`)
  - `knowledge-heatmap/` (Widget C)
  - `knowledge-grades/[studentId]/` (Widget D)
  - `competence-grid/` (Widget F)
  - `competence-top-consolidate/` (Widget G)

### Tests

- `class-knowledge.test.ts` : **21 tests** (cible 15) — empty class, agrégation badge worst-priority, sort alphabetic, fallback nom vide, top filtre 0%, retrievability_avg, heatmap alert, histogramme proxy stability
- `class-competence.test.ts` : **12 tests** (cible 10) — empty, null cells, niveau mapping, % satisfait+, MAX last_recalc_at, sort alphabetic, observed-only filter, sort minus_pct desc, students_concerned sort
- **Total Phase 1 : 33 tests verts**

### Décisions techniques

- **Approche batchée** : 2-3 queries par fonction de classe (pas N×queries). Ex: grille capacité = `class_members` + `skill_attempts` + `question_template_skills` + `srs_card_stats`.
- **`templateToBadge` réutilisé** depuis `src/lib/server/srs/capacity-badge.ts` (DRY).
- **`BADGE_PRIORITY` réutilisé** pour l'agrégation worst-of dans la grille classe.
- **Widget B** : `review_history` JSONB parsé en mémoire (pas de `srs_review_history` table). Métrique = `retrievability` moyenne par semaine (interprétable pédagogiquement).
- **Widget D** : `avg_stability_after` calculé via `srs_card_stats.stability` courante en proxy (parsing review_history pour stability_after exact serait plus coûteux et apporte peu).
- **Auth** : `requireRoles(['teacher', 'admin'])` + check `classes.teacher_id = user.id || profile.role === 'admin'`. Pas de co_teacher (n'existe pas dans le schema).

### Hors-scope rappel (V2.1+)

- Export CSV
- Comparatif inter-classes
- Vue matérialisée
- Drag&drop sections decks personnels

### Commit Phase 1

`feat(teacher-analytics): helpers + endpoints + 33 tests (Phase 1)`

---

## Phase 2 — Frontend ⏳ À venir

- Page conteneur `/dashboard/teacher/classes/[classId]/analytics`
- 7 widgets Svelte 5
- Modal "élèves concernés"
- Tests browser (≥35 tests cible)
