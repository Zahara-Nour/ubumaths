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

## Phase 2 — Détecteurs + runner + endpoint admin ⏳ À venir

---

## Phase 3 — Endpoints prof ⏳ À venir

---

## Phase 4 — UI onglet Surveillance ⏳ À venir

---

## Phase 5 — Audits + documentation ⏳ À venir

---

## Phase 6 — Quality checks ⏳ À venir
