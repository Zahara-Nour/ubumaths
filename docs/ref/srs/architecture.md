# SRS / FSRS / Référentiel famille A — Architecture

> Document de référence canonique (post-chantier 2026-06-10).
> Audit sécurité + spec V2 : `docs/wip/srs-fsrs-security-audit-findings.md`.
> Historique du raisonnement de design : `git log --follow` sur ce fichier ou les commits du chantier (`63f6192e4..a1767b882`).

---

## Vue d'ensemble

Trois sous-systèmes cohabitent autour de `question_templates` comme pivot :

```
                     ┌───────────────────────┐
                     │   question_templates  │ ← le PIVOT
                     └───────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
   MONDE 1                  MONDE 2                  MONDE 3
   Questions               SRS / FSRS              Référentiel
   (interactif)           (self-graded)            (famille A BO)
```

- **Monde 1** : quiz interactif (`FlashCard.svelte` mode interactif). Validation auto. Source des `skill_attempts` avec `source='auto'`.
- **Monde 2** : SRS avec algo FSRS-6. Reviews self-graded (Again/Hard/Good/Easy). Source des `skill_attempts` avec `source='srs'`.
- **Monde 3** : Référentiel BO famille A. Calcule `is_acquired` (verdict BO formel) selon règles §6.1. Famille B isolée (pas de SRS, pas de FSRS).

## Principes fondamentaux

### 1. `skill_attempts` est la source unique des faits

Toute interaction (Mondes 1 et 2) écrit dans `skill_attempts`. Toute autre table (`srs_card_stats`, `student_skill_state_a`, `student_observable_state`, `student_competence_level`) est un cache dérivé.

### 2. FSRS pilote le timing de révision

Aucun seuil arbitraire (30j, 60j) ne survit dans la planification. Tout `next_review` est calculé par FSRS-6 (`difficulty`, `stability`, `retrievability`).

Les règles §6.1 du Référentiel (`distinct_template_successes >= 2`, fenêtre 3 derniers) **ne disparaissent pas** — elles restent pour `is_acquired` BO formel, mais ne pilotent plus la décision "à retravailler" (qui devient FSRS-driven).

### 3. FSRS reste en TypeScript

L'algo FSRS n'est **pas** porté en PL/pgSQL. Il vit dans `src/lib/srs/fsrs.ts`. Les endpoints API appellent FSRS côté Node avant l'INSERT `skill_attempts`. Conséquence : un INSERT direct via service-role bypasse FSRS — accepté, cas exotique.

### 4. Stratégie fail-loud côté FSRS

Si FSRS UPSERT échoue, l'INSERT `skill_attempts` n'a pas lieu (HTTP 500). Évite la désynchro durable `srs_card_stats` ↔ `student_skill_state_a`.

### 5. Cohabitation `is_acquired` BO + badge FSRS

Deux verdicts coexistent sur chaque capacité :

- **`is_acquired`** — verdict BO formel (LSU, bulletin). Calculé par règles §6.1 sur `skill_attempts`.
- **Badge FSRS** — verdict dynamique (à remédier / à renforcer / acquise / apprentissage). Agrégé depuis l'état FSRS des templates tagués sur la capacité.

Les deux peuvent diverger sans contradiction. Exemple : `is_acquired=true` + badge `🔁 à renforcer` = capacité validée BO mais FSRS détecte un oubli en cours.

## Modèle de données

### `skill_attempts` (per-template famille A, per-skill+task famille B)

CHECK XOR strict :

- Famille A : `template_id NOT NULL`, `success NOT NULL`, `skill_id NULL`, `code NULL`, `task_id NULL`, `grade` libre (1-4 ou NULL).
- Famille B : `skill_id NOT NULL`, `code NOT NULL`, `task_id NOT NULL`, `template_id NULL`, `success NULL`, `grade NULL`.

Mapping (success ↔ grade) :

- Monde 1 : `success=true → grade=3` ; `success=false → grade=1`.
- Monde 2 : `success = (grade >= 2)` (Hard compte comme succès).

### Deck "Programme" auto-géré (`srs_decks.is_auto_managed=true`)

1 par élève (index UNIQUE partiel). Auto-créé à la première interaction Famille A. Auto-rempli par `ensureProgrammeDeckCard` quand un template tagué est rencontré. UPDATE/DELETE refusés côté élève (RLS).

### Sections manuelles (`srs_deck_sections`)

Disponibles uniquement sur decks personnels (non-assigné, non-auto-managé). Cartes pointent vers leur section via `srs_cards.section_id` (NULL = "Non rangées").

Le Programme ne supporte **pas** de sections manuelles — ses sections sont automatiques (calculées à la lecture depuis l'état FSRS).

## Flux d'écriture

### Monde 1 — Quiz interactif (`POST /api/skill-attempts`)

1. Vérifier existence template + récupérer skills tagués (1 round-trip via nested join).
2. FSRS update synchrone (`FSRS.reviewCard(grade)` où `grade=3` si success, `1` sinon) → UPSERT `srs_card_stats`. Fail-loud.
3. INSERT 1 row `skill_attempts` per-template avec `source='auto'`.
4. Trigger PG boucle sur `question_template_skills` → `update_student_skill_state_a` par skill.
5. Si skills tagués famille A : `ensureProgrammeDeckCard`.

### Monde 2 — Review SRS (`POST /api/srs/review/submit`)

1. Vérifier ownership card + deck.
2. FSRS init/load + `reviewCard(grade)` → UPSERT `srs_card_stats`.
3. Si carte template-based : INSERT `skill_attempts` avec `source='srs'`, `grade` brut, `success = grade >= 2`. Trigger PG fait le reste.
4. Si carte template tagué : `ensureProgrammeDeckCard` (utile quand carte vient d'un deck personnel).
5. Si carte custom : pas de `skill_attempts` (pas de template).

### Famille B (inchangé — observation prof)

Prof saisit via `/teacher/...` (hors scope chantier). Trigger PG appelle `update_student_observable_state` → cascade vers `update_student_competence_level`.

## Flux de lecture

### Page Programme (`/dashboard/revisions/decks/programme`)

4 sections automatiques calculées à la lecture côté serveur :

- 🆘 À remédier — `next_review <= NOW AND state IN ('learning', 'relearning')`
- 🔁 À renforcer — `next_review <= NOW AND state = 'review'`
- ⏳ En apprentissage — `next_review > NOW AND state IN ('learning', 'relearning', 'new')`
- ✅ Acquise en mémoire — `next_review > NOW AND state = 'review'`

Bouton "Lancer une session" filtre par `?states=...` via `/api/srs/review/due`.

### Page objectifs (`/dashboard/student/objectifs/[id]`)

Pour chaque capacité, deux verdicts :

- Verdict BO (`is_acquired`) — visuel `getObjectiveLevelVisual()` (◯/🟠/🟢/✨).
- Badge FSRS dynamique — composant `CapacityFsrsBadge.svelte`, calculé par `computeCapacityBadges` (agrégation montante sur templates tagués).

## Sécurité

Audit sécurité 2026-06-10 (cf. `docs/wip/srs-fsrs-security-audit-findings.md`) :

- 3 findings P2 traités (defense in depth)
- 2 findings P1 documentés pour V2 (grade abuse + `srs_card_stats` writable préexistant)
- Verdict BO `is_acquired` reste protégé par règle `distinct_template_successes >= 2` tant que peu de capacités ont multi-templates tagués

**À surveiller** : dès que ≥ 20 templates 6ᵉ taggés + ≥ 5 capacités multi-templates, activer la détection anti-fraud pattern (spec dans le doc d'audit).

## Performance

Audit perf 2026-06-10 :

- 2 P0 + 1 P1 traités (économie estimée 90-180 ms p95 page Programme, -1 RTT par attempt)
- 2 reportés V2 (refonte CTE `update_student_skill_state_a` + `INSERT ON CONFLICT` dans `ensureProgrammeDeck`)

## Fichiers clés

### Backend (TypeScript)

| Fichier                                                                        | Rôle                                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/lib/srs/fsrs.ts`                                                          | Algorithme FSRS-6 (réutilisé tel quel)                                      |
| `src/lib/srs/types.ts`                                                         | Types `CardStats`, `Grade`, `CardState`                                     |
| `src/lib/server/srs/programme-deck.ts`                                         | `ensureProgrammeDeck`, `ensureProgrammeDeckCard`, `isTemplateTaggedFamilyA` |
| `src/lib/server/srs/capacity-badge.ts`                                         | `templateToBadge`, `worstBadge`, `aggregateBadge`, `computeCapacityBadges`  |
| `src/routes/api/skill-attempts/+server.ts`                                     | Endpoint Monde 1                                                            |
| `src/routes/api/srs/review/submit/+server.ts`                                  | Endpoint Monde 2                                                            |
| `src/routes/api/srs/review/due/+server.ts`                                     | GET cards due (filtre `?states=`)                                           |
| `src/routes/api/srs/decks/[id]/sections/+server.ts` + `[sectionId]/+server.ts` | CRUD sections                                                               |

### Frontend (Svelte 5)

| Fichier                                                                   | Rôle                                  |
| ------------------------------------------------------------------------- | ------------------------------------- |
| `src/lib/components/srs/CapacityFsrsBadge.svelte`                         | Badge inline 🆘/🔁/✅/⏳/◯            |
| `src/routes/(protected)/dashboard/revisions/decks/programme/+page.svelte` | Vue deck Programme avec sections auto |
| `src/routes/(protected)/dashboard/revisions/decks/[id]/+page.svelte`      | Vue deck personnel + CRUD sections    |
| `src/routes/(protected)/dashboard/student/objectifs/[id]/+page.svelte`    | Détail capacité avec badge FSRS       |

### Migrations

| Fichier                                                                      | Rôle                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `supabase/migrations/20260610100000_refonte_skill_attempts_per_template.sql` | Schéma refonte per-template, trigger, fonction recompute         |
| `supabase/migrations/20260610100100_srs_deck_sections.sql`                   | Nouvelle table sections + `is_auto_managed` + `section_id` + RLS |
| `supabase/migrations/20260610150000_followup_p0_uniques_and_checks.sql`      | UNIQUE index Programme + CHECK grade famille B                   |
| `supabase/migrations/20260610200000_seed_programme_decks.sql`                | Seed rétroactif pour élèves existants (cold start)               |
