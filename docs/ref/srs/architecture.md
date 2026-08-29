---
title: SRS / FSRS / Référentiel famille A — Architecture
date: 2026-06-10
version: 1.0
status: vivant
audience: nouveaux développeurs, onboarding
---

# Architecture

Vue d'ensemble du module SRS / FSRS / Référentiel famille A après la refonte de juin 2026 (release v0.9.9).

---

## 1. Vue d'ensemble — les 3 mondes

Trois sous-systèmes cohabitent autour de `question_templates` comme pivot :

```
                     ┌───────────────────────┐
                     │   question_templates  │ ← le PIVOT
                     └───────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
   MONDE 1                  MONDE 2                  MONDE 3
   Questions               SRS / FSRS              Référentiel BO
   (interactif)           (self-graded)            famille A + B
```

| Monde       | Rôle                                                                                                    | Endpoint                                 | Source `skill_attempts` |
| ----------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------- |
| **Monde 1** | Quiz interactif. Validation auto via `FlashCard.svelte` mode interactif.                                | `POST /api/skill-attempts`               | `source='auto'`         |
| **Monde 2** | SRS avec FSRS-6. Reviews self-graded (Again/Hard/Good/Easy).                                            | `POST /api/srs/review/submit`            | `source='srs'`          |
| **Monde 3** | Référentiel BO. Calcule `is_acquired` (verdict formel) sur règles §6.1. Famille B isolée (pas de FSRS). | Trigger PG `skill_attempts_after_insert` | (lecteur)               |

---

## 2. Les 5 principes fondamentaux

### 2.1 `skill_attempts` est la source unique des faits

Toute interaction (Mondes 1 et 2) écrit dans `skill_attempts`. Les tables `srs_card_stats`, `student_point_state`, `student_observable_state`, `student_competence_level` sont des **caches dérivés** — recomputables depuis `skill_attempts`.

### 2.2 FSRS pilote le timing de révision

Aucun seuil arbitraire (30j, 60j) ne survit. Tout `next_review` est calculé par FSRS-6 (`difficulty`, `stability`, `retrievability`) — algorithme open source basé sur des millions de reviews Anki.

Les règles §6.1 du Référentiel (`distinct_template_successes >= 2`, fenêtre 3 derniers) ne disparaissent **pas** — elles restent pour `is_acquired` BO formel, mais ne pilotent plus la décision "à retravailler" (qui devient FSRS-derived).

### 2.3 FSRS reste en TypeScript

L'algo FSRS n'est **pas** porté en PL/pgSQL. Il vit dans `src/lib/srs/fsrs.ts:37-345` (classe `FSRS` avec `initCard`, `reviewCard`, `calculateRetrievability`, etc.). Les endpoints API appellent FSRS côté Node avant l'INSERT `skill_attempts`. Conséquence : un INSERT direct via service-role bypasse FSRS — accepté comme cas exotique.

### 2.4 Stratégie fail-loud côté FSRS

Si l'UPSERT `srs_card_stats` échoue, l'INSERT `skill_attempts` n'a pas lieu (HTTP 500). Évite la désynchro durable `srs_card_stats` ↔ `student_point_state`.

Cf. `src/routes/api/skill-attempts/+server.ts:86-96`.

### 2.5 Cohabitation `is_acquired` BO + badge FSRS

Deux verdicts coexistent sur chaque capacité :

- **`is_acquired`** — verdict BO formel (LSU, bulletin). Calculé par règles §6.1 sur `skill_attempts`.
- **Badge FSRS** — verdict dynamique (à remédier / à renforcer / acquise / apprentissage). Agrégé depuis l'état FSRS des templates tagués sur la capacité.

Les deux peuvent diverger sans contradiction. Exemple : `is_acquired=true` + badge `🔁 à renforcer` = capacité validée BO mais FSRS détecte un oubli en cours.

---

## 3. Sous-dossiers du module

### 3.1 `src/lib/srs/` (algo FSRS — 4 fichiers, 1 255 L)

| Fichier        | Lignes | Rôle                                                                                                                                                                       |
| -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | 575    | Types métier : `Deck`, `Card`, `CardStats`, `Grade`, `ReviewCard`, `DeckSummary`, etc.                                                                                     |
| `fsrs.ts`      | 355    | Classe `FSRS` (FSRS-6). 21 paramètres `w[0..20]`. Méthodes : `initCard`, `reviewCard`, `calculateRetrievability`, `calculatePostLapseStability`, `calculateInterval`, etc. |
| `config.ts`    | 215    | `DEFAULT_FSRS_PARAMS`, `DEFAULT_DESIRED_RETENTION = 0.9`, `DEFAULT_MAXIMUM_INTERVAL = 36500` (100 ans).                                                                    |
| `generator.ts` | 110    | `generateSRSInstance(template)` : seed aléatoire pour chaque review (variation auto).                                                                                      |

### 3.2 `src/lib/server/srs/` (helpers serveur — 2 fichiers, 333 L)

| Fichier             | Lignes | Rôle                                                                                                                                                    |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `programme-deck.ts` | 141    | `ensureProgrammeDeck`, `ensureProgrammeDeckCard`, `isTemplateTaggedFamilyA`. Pattern lookup-then-insert avec retry sur 23505.                           |
| `capacity-badge.ts` | 192    | `templateToBadge` (pure), `worstBadge` (pure), `aggregateBadge` (pure), `computeCapacityBadges` (queries DB). Constants `BADGE_LABEL` + `BADGE_VISUAL`. |

### 3.3 `src/lib/components/srs/` (UI — 7 fichiers, 1 565 L)

| Fichier                    | Lignes | Rôle                                                                                                                                     |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ReviewSession.svelte`     | 356    | Session de review (fetch due cards, flip, self-grade via FSRSButtons, submit). Accepte filtre `states` propagé depuis la page Programme. |
| `CustomFlashCard.svelte`   | 290    | Carte front/back libre (hors templates).                                                                                                 |
| `TemplateSelector.svelte`  | 292    | Choisir un template pour l'ajouter à un deck.                                                                                            |
| `CustomCardEditor.svelte`  | 203    | Création/édition carte custom.                                                                                                           |
| `DeckCard.svelte`          | 189    | Card UI pour la liste des decks.                                                                                                         |
| `FSRSButtons.svelte`       | 162    | 4 boutons Again/Hard/Good/Easy.                                                                                                          |
| `CapacityFsrsBadge.svelte` | 71     | Badge inline 🆘/🔁/✅/⏳/◯ (NEW chantier 2026-06-10).                                                                                    |

### 3.4 `src/routes/api/skill-attempts/` (1 endpoint, 204 L)

`POST /api/skill-attempts` — Monde 1. Refondu : 1 row INSERT au lieu de N (per-template). FSRS update synchrone fail-loud, auto-ajout au deck Programme.

### 3.5 `src/routes/api/srs/` (10 endpoints, 1 851 L)

| Endpoint                           | Méthodes           | Lignes | Rôle                                                     |
| ---------------------------------- | ------------------ | ------ | -------------------------------------------------------- |
| `/decks`                           | GET, POST          | 186    | Liste/créer deck                                         |
| `/decks/[id]`                      | GET, PATCH, DELETE | 235    | Lire/MAJ/supprimer deck                                  |
| `/decks/[id]/assign`               | POST               | 293    | Assigner deck (prof → élève/classe)                      |
| `/decks/[id]/sections`             | GET, POST          | 105    | **NEW** Liste/créer section                              |
| `/decks/[id]/sections/[sectionId]` | PATCH, DELETE      | 107    | **NEW** MAJ/supprimer section                            |
| `/cards`                           | GET, POST          | 220    | Liste/créer carte                                        |
| `/cards/[id]`                      | GET, PUT, DELETE   | 264    | Lire/MAJ (étendu pour `section_id`)/supprimer carte      |
| `/review/due`                      | GET                | 212    | Cards due. Filtre `?states=`                             |
| `/review/submit`                   | POST               | 229    | Monde 2. INSERT `skill_attempts` + UPSERT srs_card_stats |

### 3.6 Pages route (5 fichiers principaux)

| Route                                    | Rôle                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `/dashboard/revisions/`                  | Liste des decks de l'élève                                              |
| `/dashboard/revisions/create/`           | Créer un deck personnel                                                 |
| `/dashboard/revisions/decks/[id]/`       | **NEW** Vue détail deck personnel (sections manuelles + cartes)         |
| `/dashboard/revisions/decks/[id]/study/` | Session de review                                                       |
| `/dashboard/revisions/decks/programme/`  | **NEW** Deck Programme auto-géré (4 sections automatiques FSRS-derived) |

---

## 4. Modèle de données

### 4.1 `skill_attempts` — double régime

CHECK XOR strict (`chk_attempt_family_regime`) :

```sql
-- Famille A (Monde 1 + Monde 2)
(template_id IS NOT NULL AND success IS NOT NULL
 AND skill_id IS NULL AND code IS NULL AND task_id IS NULL)
OR
-- Famille B (observation prof)
(skill_id IS NOT NULL AND code IS NOT NULL AND task_id IS NOT NULL
 AND template_id IS NULL AND success IS NULL AND grade IS NULL)
```

Mapping (success ↔ grade) :

- Monde 1 : `success=true → grade=3 (Good)` ; `success=false → grade=1 (Again)`.
- Monde 2 : `success = (grade >= 2)` (Hard compte comme succès).

Index notable : `idx_skill_attempts_student_template_time(student_id, template_id, created_at DESC) WHERE template_id IS NOT NULL` — couvre les queries de `update_student_point_state` (JOIN `question_template_points` à la lecture).

### 4.2 Deck "Programme" auto-géré

Table : `srs_decks`. Flag : `is_auto_managed BOOLEAN` (refonte chantier).

1 par élève (index UNIQUE partiel `uq_srs_decks_one_programme_per_owner ON (owner_id) WHERE is_auto_managed = TRUE`). Auto-créé à la première interaction Famille A via `ensureProgrammeDeck`. Auto-rempli par `ensureProgrammeDeckCard`. UPDATE/DELETE refusés côté élève (RLS).

### 4.3 Sections manuelles

Table : `srs_deck_sections` (nouvelle chantier). Schéma :

| Column                     | Type        | Notes                               |
| -------------------------- | ----------- | ----------------------------------- |
| `id`                       | UUID PK     | gen_random_uuid()                   |
| `deck_id`                  | UUID FK     | → `srs_decks(id)` ON DELETE CASCADE |
| `name`                     | TEXT        | NOT NULL, char_length 1-50          |
| `description`              | TEXT        | NULLable                            |
| `display_order`            | INTEGER     | NOT NULL DEFAULT 0                  |
| `created_at`, `updated_at` | TIMESTAMPTZ |                                     |

UNIQUE `(deck_id, name)`. Index `(deck_id, display_order)`. RLS : owner du deck + deck non-assigné + deck non-auto-managé.

Cartes pointent vers leur section via `srs_cards.section_id` (NULL = "Non rangées"). FK ON DELETE SET NULL.

Le Programme **n'accepte pas** de sections manuelles (RLS refuse INSERT/UPDATE/DELETE) — ses sections sont automatiques (calculées à la lecture depuis l'état FSRS).

### 4.4 Migrations DB

L'état actuel résulte de **11 migrations** (séquentielles dans `supabase/migrations/`) :

| Migration                                                | Rôle                                                                 | Date       |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| `080_create_srs_tables.sql`                              | Tables SRS initiales (Anki-style)                                    | 2025-10-22 |
| `083_mark_assigned_decks.sql`                            | Mark deck assigné                                                    | 2025-11    |
| `084_recreate_missing_deck_copies.sql`                   | Récup copies manquantes                                              | 2025-11    |
| `085-088`                                                | Fix RLS + recursion                                                  | 2025-11    |
| `089_create_missing_card_stats.sql`                      | Backfill stats                                                       | 2025-11    |
| `20251031000000_create_deck_stats_view.sql`              | VIEW stats deck                                                      | 2025-10    |
| `20260609120000_competence_referentiel_schema.sql`       | Schéma Référentiel                                                   | 2026-06-09 |
| `20260609120001_competence_referentiel_functions.sql`    | Fonctions PL/pgSQL + trigger initial                                 | 2026-06-09 |
| `20260610100000_refonte_skill_attempts_per_template.sql` | **Chantier L1** : refonte per-template                               | 2026-06-10 |
| `20260610100100_srs_deck_sections.sql`                   | **Chantier L3** : sections + `is_auto_managed` + `section_id`        | 2026-06-10 |
| `20260610150000_followup_p0_uniques_and_checks.sql`      | **Chantier follow-up P0** : UNIQUE Programme + CHECK grade famille B | 2026-06-10 |
| `20260610200000_seed_programme_decks.sql`                | **Chantier L11** : seed rétroactif (101 decks)                       | 2026-06-10 |

---

## 5. Flux d'écriture

### 5.1 Monde 1 — Quiz interactif

`POST /api/skill-attempts` reçoit `{ template_id, success, with_help?, phase_blocage? }`.

```
1. Auth check (requireAuth).
2. Validation Zod (skillAttemptInputSchema).
3. SELECT question_templates + question_template_points + skills(family) en 1 round-trip.
   (Optim P0#2 — économise 1 SELECT vs 2 séparés.)
4. Extract skill_ids famille knowledge depuis les nested rows.
5. Mapping success→grade : true→3 (Good), false→1 (Again).
6. FSRS update synchrone (applyFsrsUpdate) :
   - Lire srs_card_stats existant (ou init via FSRS.initCard).
   - FSRS.reviewCard(grade).
   - UPSERT srs_card_stats.
   - FAIL-LOUD : si erreur → 500, pas d'INSERT skill_attempts.
7. INSERT 1 row skill_attempts (per-template, source='auto').
8. Trigger PG skill_attempts_after_insert :
   - Boucle FOR v_point_id IN question_template_points WHERE template_id = NEW.template_id
     AND s.family = 'knowledge'.
   - PERFORM update_student_point_state(NEW.student_id, v_point_id).
9. Si skill_ids non vide : ensureProgrammeDeckCard(supabase, user.id, template_id).
   (Idempotent via UNIQUE deck_id, template_id.)
10. Return { inserted: 1, skill_ids }.
```

### 5.2 Monde 2 — Review SRS

`POST /api/srs/review/submit` reçoit `{ cardId, deckId, grade, timeSpent? }`.

```
1. Auth + consent (requireAuth + requireConsent).
2. Validation Zod (submitReviewSchema).
3. Vérifier ownership card + deck.
4. Build FSRS avec config validée (fsrsConfigSchema.safeParse(deck.config),
   fallback DEFAULT_FSRS_PARAMS).
5. Lire srs_card_stats existant (ou init via FSRS.initCard avec stability=0).
6. FSRS.reviewCard(grade, timeSpent).
7. UPSERT srs_card_stats.
8. Si carte template-based :
   - INSERT skill_attempts (template_id, grade, success=grade>=2, source='srs').
   - Trigger PG recompute Référentiel (cf. §5.1 step 8).
   - Si template tagué famille A : ensureProgrammeDeckCard.
9. Maintenir srs_review_sessions (analytics).
10. Return { success: true, stats: {...} }.
```

### 5.3 Famille B (inchangé — observation prof)

Prof saisit via endpoints `/api/teacher/...` (hors scope chantier). Le trigger PG `skill_attempts_after_insert` route :

```
IF NEW.template_id IS NOT NULL AND NEW.success IS NOT NULL THEN
  -- Famille A
  FOR v_point_id IN ... LOOP PERFORM update_student_point_state(...); END LOOP;
ELSIF NEW.skill_id IS NOT NULL AND NEW.code IS NOT NULL THEN
  -- Famille B
  PERFORM update_student_observable_state(NEW.student_id, NEW.skill_id);
  -- cascade vers update_student_competence_level via la fonction
END IF;
```

---

## 6. Flux de lecture

### 6.1 Page Programme (`/dashboard/revisions/decks/programme`)

Server load (`+page.server.ts`, 248 L) :

```
1. requireAuth.
2. Lookup deck Programme (is_auto_managed=true).
3. Si pas trouvé : return emptyResult avec 4 sections vides.
4. SELECT srs_cards (id, template_id) WHERE deck_id.
5. SELECT srs_card_stats + question_templates + question_template_points
   EN PARALLÈLE via Promise.all (optim P1 — économise 2 RTT, ~90-180 ms p95).
6. Pour chaque card :
   - Lookup state + next_review depuis statsByTemplate.
   - badge = toProgrammeBadge(templateToBadge(state, nextReview, nowMs)).
   - Lookup objective via objectiveByTemplate (déterministe, tri par display_order — optim P1#7).
   - Push dans sectionMap[badge].
7. Tri intra-section : nextReview ascendant.
8. Return ProgrammeData { sections × ProgrammeSection { badge, title, cards[] } }.
```

UI (`+page.svelte`) : 4 sections déroulantes avec bouton "Lancer une session" pour les 2 actionables (`a_remedier`, `a_renforcer`). Filtre via `?states=learning,relearning` ou `?states=review`.

### 6.2 Page objectifs (`/dashboard/student/objectifs/[id]`)

Server load récupère pour chaque capacité :

- Verdict BO (`is_acquired`, `needs_remediation`) depuis `student_point_state_v`.
- Badge FSRS (`templateToBadge` agrégé via `computeCapacityBadges`).

UI affiche les deux côte à côte (composant `CapacityFsrsBadge.svelte` pour le badge dynamique).

---

## 7. Conventions de nommage

### 7.1 Badge

- 5 valeurs : `a_remedier`, `a_renforcer`, `acquise_en_memoire`, `en_apprentissage`, `non_commencee`.
- Type exporté `CapacityBadge` dans `capacity-badge.ts:21-26`.
- Sous-type `ProgrammeBadge` dans `programme/+page.server.ts:20-24` (sans `non_commencee`, garde-fou `toProgrammeBadge`).

### 7.2 Sources des attempts

- `SkillSource = 'auto' | 'srs' | 'teacher' | 'student_self'` dans `src/lib/types/skills.ts:85`.
- Chantier 2026-06-10 a ajouté `'srs'`.

### 7.3 Sections automatiques vs manuelles

- **Automatiques** : calculées à la lecture (filtre sur état FSRS). Uniquement dans deck Programme. Pas de persistance.
- **Manuelles** : persistées dans `srs_deck_sections`. Uniquement dans decks personnels (non-assigné + non-auto-managé). `srs_cards.section_id` pointe dessus.

---

## 8. Guide : ajouter une nouvelle fonctionnalité

### 8.1 Ajouter un nouveau type de carte

1. Étendre l'enum `CardType` dans `src/lib/srs/types.ts`.
2. Mettre à jour `srs_cards.card_type` CHECK constraint (migration).
3. Adapter `/api/srs/review/submit` pour le nouveau type.
4. Composant Svelte dédié dans `src/lib/components/srs/`.
5. Tests dans `tests/integration/`.

### 8.2 Ajouter un nouvel état FSRS / badge

1. Étendre `CapacityBadge` dans `src/lib/server/srs/capacity-badge.ts:21-26`.
2. Mettre à jour `BADGE_PRIORITY`, `BADGE_LABEL`, `BADGE_VISUAL`.
3. Étendre `templateToBadge` avec la nouvelle règle.
4. Adapter `CapacityFsrsBadge.svelte` (icon + color).
5. Adapter `ProgrammeBadge` dans `programme/+page.server.ts` si concerné.

### 8.3 Ajouter un endpoint API

1. Créer le `+server.ts` sous `src/routes/api/srs/.../`.
2. `requireAuth` + validation Zod (schéma dans `src/lib/server/validation/srs.ts`).
3. Vérification d'ownership explicite (defense in depth — RLS ne suffit pas pour les codes 404 sémantiques).
4. Codes erreur clairs : 400 Zod, 401 auth, 403 RLS (`42501`), 404 not found, 409 unique violation (`23505`), 500 autre.

### 8.4 Ajouter une migration

1. Format `YYYYMMDDHHmmss_snake_case_description.sql`.
2. Header doc (date, plan, spec, depends on).
3. Idempotente via `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`.
4. RLS sur toute nouvelle table.
5. Tester localement avant `pnpm db:migrate`.
6. Après push : `pnpm db:types` pour régénérer `database.ts`.

---

## 9. Voir aussi

- [`code-quality.md`](./code-quality.md) — Dette technique, tests désynchronisés.
- [`tests.md`](./tests.md) — Couverture des tests + angles morts.
- [`performance.md`](./performance.md) — Hot paths, optimisations.
- [`security.md`](./security.md) — Audit sécurité, findings V2.
- [`docs/architecture/database-schema.md`](../../architecture/database-schema.md) — Schéma DB global.
- [`docs/wip/srs-fsrs-spec-tdd.md`](../../wip/srs-fsrs-spec-tdd.md) — Spec TDD avec comportements attendus détaillés.
