# Anti-fraud SRS — Progress

Chantier B + C (anti-fraud pattern detection + UI prof "Élèves à surveiller").

Plan complet : `/Users/david/.claude/plans/immutable-painting-cake.md`
Spec TDD : `docs/wip/srs-anti-fraud-spec-tdd.md`

---

## Phase 0 — Spec TDD ✅ (2026-06-10)

### Livré

- `docs/wip/srs-anti-fraud-spec-tdd.md` (NEW) — 12 comportements (B1..B12) + cas limites + cas d'erreur + vérif e2e + métriques validation.

### Commit Phase 0

`docs(anti-fraud): spec TDD phase 0 — 12 comportements + critères validation` (`10579d181`).

---

## Phase 1 — Migration DB + types ✅ (2026-06-10)

### Livré

- **`supabase/migrations/20260610220000_app_config_table.sql`** (NEW) :
  - Table `app_config` (key, value, description, updated_at, updated_by).
  - Seed `anti_fraud_enabled = 'false'`.
  - Helper SQL `app_is_anti_fraud_enabled()` SECURITY DEFINER (lecture rapide + fail-safe).
  - RLS : SELECT tout authenticated, écriture admin uniquement.
- **`supabase/migrations/20260610220100_srs_anti_fraud_flags.sql`** (NEW) :
  - Table avec CHECK strictes : `severity 1-5`, `score 0..1`, `flag_type IN (…)`, cohérence `resolved/resolved_by/resolved_at`.
  - 3 indexes : `(student_id, resolved, created_at DESC)`, partial `WHERE resolved=false` pour dédoublonnage, partial pour count badge.
  - RLS :
    - SELECT prof : flag visible si élève appartient à classe du prof (jointure `class_members` + `classes.teacher_id`).
    - SELECT admin : full read.
    - INSERT : refusé sauf admin (service_role bypass pour le runner).
    - UPDATE prof : sur flags de ses élèves (la restriction colonne est applicative).
    - DELETE : admin only (soft delete via `resolved=true` côté app).
- **`src/lib/types/database-helpers.ts`** (extend) :
  - `AntiFraudFlag = Tables<'srs_anti_fraud_flags'>`
  - `AntiFraudFlagType` (union 6 valeurs).
  - `AntiFraudSeverity = 1|2|3|4|5`.
  - `AntiFraudFlagWithStudent` (composite avec student + capacity).
  - `AppConfig = Tables<'app_config'>`.

### Décisions techniques Phase 1

- **`app_config` générique** plutôt que dédiée anti-fraud : prépare le terrain pour d'autres feature flags futurs (ex: `vip_cards_enabled`, `multiplayer_enabled`).
- **Helper `app_is_anti_fraud_enabled()`** SECURITY DEFINER plutôt que SELECT direct dans le runner : 1 ligne PL/pgSQL fail-safe (renvoie `false` si table absente ou erreur), évite la duplication.
- **CHECK `chk_srs_anti_fraud_resolved_coherent`** : garantit que `resolved=true ⟺ resolved_by ET resolved_at non-NULL`. Empêche les états incohérents au niveau DB.
- **Pas de jointure inline avec `is_class_teacher()`** : le helper existant prend `class_id`, pas `student_id`. RLS utilise un EXISTS inline ; simple et lisible.
- **Cross-class par design** : pas de colonne `class_id` sur le flag. Un élève multi-classes a un seul flag visible des deux profs, résoudre d'un côté masque l'autre.

### À faire après push migrations (par l'utilisateur)

1. `pnpm db:migrate` — push les 2 migrations.
2. `pnpm db:types` — régénère `src/lib/types/database.ts`.
3. Les types `Tables<'srs_anti_fraud_flags'>` et `Tables<'app_config'>` résolvent.

### Commit Phase 1

`feat(anti-fraud): migration db + types helpers (Phase 1)` (à venir).

---

## Phase 2 — Détecteurs + runner + endpoint admin ✅ (2026-06-10)

### Livré

- **`src/lib/server/anti-fraud/types.ts`** (NEW) — `ReviewEntry`, `AttemptEntry`, `SignalResult`, `CompositeResult`, `JobReport`.
- **`src/lib/server/anti-fraud/detectors.ts`** (NEW) — 5 fonctions pures :
  - `detectHighEasyRatio` (B1)
  - `detectNoAgain` (B2, séquence post-dernière-Again)
  - `detectFastTimeSpent` (B3, médiane sans pad pair)
  - `detectBurst` (B4, two-pointer fenêtre glissante 60 s)
  - `detectSrsVsQuizGap` (B5)
  - `composeSignals` (B6, score plafonné à 1, ≥ 2 signaux, > 0.7)
- **`src/lib/server/anti-fraud/runner.ts`** (NEW) — `runAntiFraudJob` orchestrateur :
  - Check `app_config.anti_fraud_enabled` (case-insensitive, fail-safe).
  - Liste paires (élève × capacité) via batch `srs_card_stats` + `question_template_skills` (famille knowledge).
  - Filtre reviews sur fenêtre 7 j glissante.
  - Applique 5 détecteurs + composite. Skip dédoublonnage si flag identique non-résolu < 7 j.
  - Support `dry_run` (compte sans INSERT).
- **`src/lib/server/anti-fraud/index.ts`** (NEW) — barrel.
- **`src/lib/server/validation/anti-fraud.ts`** (NEW) — Zod : `runJobOptionsSchema`, `flagsListQuerySchema`, `flagIdParamSchema`, `markResolvedBodySchema`.
- **`src/routes/api/admin/anti-fraud/run/+server.ts`** (NEW) — POST admin only, body optionnel.

### Tests

- **`detectors.test.ts`** : **30 tests** (cible ≥ 25) ✅
  - B1 high_easy_ratio : 5 tests (sample < 20, ratio > 90 %, seuil strict 0.90, aucune Easy, frontière 95 %)
  - B2 no_again : 5 tests (sample < 30, streak 30, post-Again, streak court, Again réparties)
  - B3 fast_timeSpent : 5 tests (sample timeSpent < 10, median < 2, strict 2.0, ignore null, parité)
  - B4 burst : 5 tests (< 16, 20/30 s, strict 15/60 s, dispersé, max sur sliding window)
  - B5 srs_vs_quiz_gap : 5 tests (< 10 SRS, < 10 quiz, gap > 50, strict 0.50, gap négatif)
  - B6 composite : 5 tests (< 2 signaux, composite ≥ 0.7, signaux faibles, plafond, sample max)
- **`runner.test.ts`** : **11 tests** (cible ≥ 10) ✅
  - Désactivé : 3 (false, row absente fail-safe, "TRUE" case-insensitive)
  - Vide : 3 (pas de stats, templates non-tagués, reviews hors fenêtre)
  - Nominal : 3 (high_easy_ratio créé, composite ≥ 2 signaux, filtre student_id)
  - Dédoublonnage : 1 (skip si flag existant non-résolu)
  - dry_run : 1 (compte sans INSERT)

**Total Phase 2 : 41 tests verts**.

### Décisions techniques Phase 2

- **Pas de PL/pgSQL** : détecteurs en TS pur, runner orchestrateur côté serveur. Plus testable, plus lisible, contournement de la limite « pas de FSRS en PG » du chantier précédent.
- **`burst` seul à ne pas exiger `sample_size >= 20` global** : un pic de 16+ reviews en 60 s est suspect par lui-même.
- **Composite plafonné à 1** + filtre `≥ 2 signaux ET score > 0.7` (cf. spec §B6).
- **Dédoublonnage fenêtre 7 j roulante** : skip insert si flag identique non-résolu < 7 j (`hasRecentFlag`).
- **`dry_run`** : utile pour audit + tests sans pollution.

### Commit Phase 2

`feat(anti-fraud): détecteurs + runner + endpoint admin (Phase 2)` (à venir).

---

---

## Phase 3 — Endpoints prof ✅ (2026-06-10)

### Livré

- **`src/routes/api/teacher/classes/[classId]/anti-fraud/flags/+server.ts`** (NEW) :
  - GET liste flags des élèves de la classe, jointure `profiles` + `skills`.
  - Filtres : `?resolved=`, `?since=`, `?type=`, `?capacity=`.
  - Tri `score DESC, created_at DESC`, limit 100.
  - Retour : `{ flags, total, resolved_count }`.
- **`src/routes/api/teacher/classes/[classId]/anti-fraud/flags/[flagId]/+server.ts`** (NEW) :
  - PATCH idempotent (set `resolved=true, resolved_by, resolved_at`).
  - Vérif ownership : flag.student_id ∈ classe du prof (via class_members).
  - 404 (pas 403) si flag d'élève d'autre classe (ne révèle pas l'existence).
- **`src/routes/api/teacher/classes/[classId]/anti-fraud/count/+server.ts`** (NEW) :
  - GET `{ count }` non-résolus de la classe. SELECT COUNT(\*) head only.

### Tests

- **`src/lib/server/validation/anti-fraud.test.ts`** : **18 tests** sur les 4 schemas Zod (runJobOptions, flagsListQuery, flagIdParam, markResolvedBody).
- Pas de tests d'intégration end-to-end : ils nécessitent une instance Supabase locale + migrations pushed. À écrire si besoin lors du QA manuel (cf. §B9-B12 spec TDD).

### Décisions techniques Phase 3

- **404 silencieux** sur cross-class plutôt que 403 : ne révèle pas l'existence d'un flag d'autre classe (information disclosure mitigation).
- **Idempotence PATCH** : si flag déjà résolu → 200 avec `{ already_resolved: true }`. Pas d'erreur.
- **Pas d'unresolve V1** : `markResolvedBodySchema = { resolved: z.literal(true) }` strict.
- **Pattern endpoint reproduit** depuis `/api/teacher/classes/[classId]/analytics/*` (cascade Zod params + query + requireTeacherOfClass + handler).
- **`limit(100)`** anti-DoS sur GET flags.

### Commit Phase 3

`feat(anti-fraud): endpoints prof (Phase 3)` (à venir).

---

---

## Phase 4 — UI onglet Surveillance ⏳ À venir

---

## Phase 5 — Audits + documentation ⏳ À venir

---

## Phase 6 — Quality checks ⏳ À venir
