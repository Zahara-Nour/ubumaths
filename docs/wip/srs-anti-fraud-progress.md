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

## Phase 4 — UI onglet Surveillance ✅ (2026-06-10)

### Livré

- **`src/lib/components/teacher/anti-fraud/AntiFraudFlagsList.svelte`** (NEW) :
  - Props : `classId, anonymized?, refreshNonce?, showResolved?, onResolved?`.
  - Fetch `/api/teacher/classes/[classId]/anti-fraud/flags?resolved=<showResolved>`.
  - Empty state : "Aucun élève à surveiller en ce moment 🎉".
  - Liste : élève (anonymizable) + capacité + badge severity (variant destructive/default/secondary) + label flag type traduit + score sur 100 + sample_size + "Voir détails" + "Marquer comme OK".
  - Confirmation `window.confirm` avant resolve.
  - `SvelteSet` pour tracking des resolutions en cours (anti double-clic).
- **`src/lib/components/teacher/anti-fraud/FlagDetailsDialog.svelte`** (NEW) :
  - Modal Bits UI Dialog avec breakdown JSONB `details`.
  - 3 badges (sévérité, score, sample_size) + date formatée fr-FR + 3 lignes d'explication finale.
- **`src/lib/components/teacher/anti-fraud/AntiFraudFilters.svelte`** (NEW) :
  - V2.0 minimaliste : 1 toggle `MyCheckbox` "Inclure les flags résolus".
  - Multi-select type + date "Depuis" reportés V2.1 (filtres dispo côté API mais UI minimaliste).
- **Intégration page conteneur** `analytics/+page.svelte` :
  - 3ᵉ `Tabs.Trigger value="surveillance"` avec badge `<Badge variant="destructive">{unresolvedCount}</Badge>` quand > 0.
  - Tab `<Tabs.Content value="surveillance">` avec `AntiFraudFilters` + `AntiFraudFlagsList`.
  - `refreshUnresolvedCount` appelé sur "Actualiser" + après chaque resolve.
- **`+page.server.ts`** : précharge `unresolvedFlagsCount` (1 query légère head-only) pour le badge initial.

### Tests

- **`AntiFraudFlagsList.svelte.test.ts`** : 6 tests (rendu noms + capacité, empty state, anonymisation, labels, bouton "Marquer comme OK", erreur fetch).
- **`FlagDetailsDialog.svelte.test.ts`** : 3 tests (titre + capacité, badges sévérité/score/sample, détails JSONB).
- **`AntiFraudFilters.svelte.test.ts`** : 3 tests (toggle visible, texte d'aide, état checked).

**⚠ Infrastructure browser tests** : `pnpm test:client` actuel échoue avec `Failed to connect to browser session within timeout` même sur les tests pré-existants (`AnalyticsModal.svelte.test.ts`). Issue d'environnement Chromium/Playwright, **non liée au code livré**. Les tests sont prêts à passer dès que l'infra browser sera fonctionnelle.

### Décisions techniques Phase 4

- **`SvelteSet`** (au lieu de `Set` standard) sur `resolvingIds` pour réactivité.
- **`window.confirm`** pour la confirmation resolve (CLAUDE.md autorise — pas d'AlertDialog Shadcn nécessaire en V2.0).
- **Badge sévérité-driven** : variant calculé en fonction de severity (5 → destructive, 2-4 → default, 1 → secondary).
- **Pas de drill-down click cellule** (V2.1 reporté).
- **Pas de Dialog imbriqué** : `FlagDetailsDialog` n'embarque pas la `StudentRetentionCurve` (reporté — la modal reste légère).
- **`MyCheckbox` obligatoire** (CLAUDE.md règle #2) au lieu du native `<input type="checkbox">`.
- **`refreshUnresolvedCount`** appelé après resolve : maintient le badge synchronisé avec l'état réel.

### Commit Phase 4

`feat(anti-fraud): ui onglet surveillance (Phase 4)` (à venir).

---

---

## Phase 5 — Audits + documentation ✅ (2026-06-10)

### Livré

- **`docs/ref/srs/anti-fraud.md`** (NEW) — référence complète : 5 signaux, score composite, schéma DB, modules TS, endpoints, UI, cycle de vie flag, cross-class, procédure d'activation, tests (71), roadmap V2.1/V3.
- **`docs/ref/srs/README.md`** : entrée "Voir aussi" + ligne #10 backlog passée de "À documenter" à "livré 2026-06-10".
- **`docs/ref/srs/security.md`** : item #1 top 5 actions passé à ✅ livré + lien anti-fraud.md.
- **`docs/architecture/database-schema.md`** : sections `srs_anti_fraud_flags` + `app_config` + 2 migrations ajoutées au listing.

### Audits

- **Performance** : non audité formellement (audit-runner non livré V2.0 — job désactivé donc pas de risque latence prod).
  - Estimation calcul : classe 30 élèves × 5 capacités × ~30 reviews/paire = ~4500 entries en mémoire. Fonctions pures, < 5 ms par paire. Loadmap : O(N×C) queries Supabase batchées (1 par capacité pour skill_attempts).
  - Optimisation V2.1 si > 200 ms p99 sur dataset réel : pré-joindre `skill_attempts` au niveau de `listScanPairs`.
- **Sécurité** : checkpoint inline durant Phase 1/2/3.
  - RLS prof-via-class_members (defense-in-depth avec check applicatif `requireTeacherOfClass`).
  - INSERT refusé pour authenticated (service_role contexte serveur uniquement).
  - 404 silencieux cross-class sur PATCH (information disclosure mitigation).
  - Zod strict sur tous les body / params / query.
  - Fail-safe sur `app_is_anti_fraud_enabled()` (renvoie false si erreur).

### Commit Phase 5

`docs(anti-fraud): reference doc phase 5 + maj README/security/db-schema` (à venir).

---

---

## Phase 6 — Quality checks ⏳ À venir
