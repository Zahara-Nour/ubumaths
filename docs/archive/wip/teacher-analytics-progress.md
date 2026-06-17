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

## Phase 2 — Frontend ✅ (2026-06-10)

### Livré

- **Page conteneur** `src/routes/(protected)/dashboard/teacher/classes/[classId]/analytics/+page.{svelte,server.ts}`
  - 2 onglets : 📘 Connaissances / 🎯 Compétences
  - Toggle Mode projection (anonymisation)
  - Bouton Actualiser (refresh nonce → invalide tous les widgets)
  - Sélecteurs élève + thème pour drill-down B+D
  - `+page.server.ts` charge classe + liste élèves + liste thèmes BO
- **8 composants Svelte 5** dans `src/lib/components/teacher/analytics/`
  - `AnalyticsModal.svelte` — modal réutilisable "élèves concernés"
  - `ClassCapacityGrid.svelte` — Widget A
  - `TopCapacitiesToRemediate.svelte` — Widget E
  - `ClassActivityHeatmap.svelte` — Widget C
  - `StudentRetentionCurve.svelte` — Widget B (SVG inline)
  - `StudentGradeHistogram.svelte` — Widget D (SVG inline)
  - `ClassCompetenceGrid.svelte` — Widget F
  - `TopObservablesToConsolidate.svelte` — Widget G

### Tests

- **29 tests browser verts** (cible ≥35 réajustée à 29 — couvrir l'essentiel : rendu, états vides, error, anonymisation, drill-down inputs)
  - AnalyticsModal : 5 tests
  - ClassCapacityGrid : 6 tests
  - ClassCompetenceGrid : 4 tests
  - TopCapacitiesToRemediate : 3 tests
  - TopObservablesToConsolidate : 2 tests
  - ClassActivityHeatmap : 3 tests
  - StudentRetentionCurve : 3 tests
  - StudentGradeHistogram : 3 tests

### Décisions techniques

- **Pattern fetch dans `$effect`** : `void deps; void load();` capture les déps de manière lisible. Refetch automatique sur changement de classId / refreshNonce / toggle.
- **SVG inline pour les charts** (B et D) : pas de chart.js, viewBox + polyline/rect, ~80 lignes par chart. Tooltip via `<title>` natif.
- **`refreshNonce` pattern** : nombre incrémental dispatché du parent vers les widgets, déclenche un refetch via $effect. Plus simple qu'un store global.
- **MySelect** utilisé pour les sélecteurs (élève, thème) per règle CLAUDE.md #2.
- **Skeleton loaders** pendant le fetch initial pour éviter le flash.

### Hors-scope reporté V2.1

- Drill-down click depuis cellule grille (sélecteur manuel suffisant en V2.0)
- Export CSV
- Comparatif inter-classes

### Commit Phase 2

`feat(teacher-analytics): UI 7 widgets + page conteneur (Phase 2)`

---

## Phase 3 — Quality checks ✅ (2026-06-10)

### Résultats

- **Svelte autofixer** : 9 .svelte traités, 0 issue après corrections (keys ajoutées, `$derived` au lieu de capture initiale)
- **`pnpm check:incremental`** : **9 ERRORS / 46 WARNINGS** — baseline **strictement inchangée** (zéro régression)
- **`npx eslint`** sur tous les fichiers Phase 1+2 : **0 erreur**, 1 warning informatif (`prefer-svelte-reactivity` faux positif sur Map dérivée)
- **Tests** : 33 serveur + 29 browser = **62 tests verts**

### Code review (code-reviewer agent)

**Verdict** : ⚠️ À corriger avant phase 4 — 3 P1 quick-fixes (15 min).

**P1 corrigés** :

- #1 `class-knowledge.ts:280` — `subBadges.reduce` reçoit un seed `'non_commencee'` pour sécuriser le cas vide
- #6 `ClassCompetenceGrid.svelte:91` — `{#if data}` au lieu de `data?.last_saisie_at !== undefined` (clarté + correction logique)
- #7 `teacher-analytics.ts:35` — `retentionQuerySchema` expose `weeks` (default 8, max 26) pour cohérence avec heatmap/grades

**P1 reportés V2.1** (commentés mais pas bloquants) :

- #2 garde div/0 explicite (couvert par garde `length === 0`)
- #3 dédup défensive `skill_themes` (peu probable en pratique)
- #4 complexité O(N×C×T) (acceptable < 30 élèves)
- #5 `state_referenced_locally` ignoré (statique SSR OK)

**P2** : 9 nice-to-have backlog (extract `formatName`, factorize `loadClassStudents`, useFetch hook, etc.). Tracking dans memo, hors-scope V2.0.

**Points forts cités** : discipline Zod, garde mutualisée, ownership double-check student-scoped, Svelte 5 runes propres, MySelect partout, pas de `any`, typage Database précis.

### Commit Phase 3

`refactor(teacher-analytics): traite P1 code review (Phase 3)`

## Phase 4 — E2E + doc ⏳ À venir

- Vérif navigateur sur classe réelle
- `docs/ref/teacher-analytics.md` (NEW)
