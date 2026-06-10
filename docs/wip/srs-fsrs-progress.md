# Progress — Refonte SRS / FSRS / Référentiel famille A

> Plan : `~/.claude/plans/immutable-painting-cake.md`
> Spec TDD : `docs/wip/srs-fsrs-spec-tdd.md`
> Architecture cible : `docs/wip/srs-fsrs-architecture-cible.md`
> Démarrage : 2026-06-10

---

## État global

| Phase                              | Statut            | Date       | Notes                                                                                                                |
| ---------------------------------- | ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 0 — Spec TDD + décisions           | ✅ Terminée       | 2026-06-10 | Spec TDD rédigée, décisions par défaut actées (cf. §0 du spec).                                                      |
| 1 — Schéma DB                      | ✅ Code écrit     | 2026-06-10 | Migrations L1 + L3 écrites. SkillSource étendu. ⚠️ Attente push utilisateur (`pnpm db:migrate` + `pnpm db:types`).   |
| 2 — Backend (trigger + APIs)       | ✅ Code écrit     | 2026-06-10 | Helper programme-deck + refonte /api/skill-attempts + /api/srs/review/submit. Tests à valider après push migrations. |
| 3 — UI Programme + badge objectifs | ✅ Code écrit     | 2026-06-10 | Page Programme + badge FSRS sur objectifs + filtre states sur /api/srs/review/due.                                   |
| 4 — UI decks personnels + sections | ✅ Code écrit     | 2026-06-10 | CRUD sections API + page deck detail + extension PUT card pour section_id.                                           |
| 5 — Migration données rétro        | ✅ Pushée en prod | 2026-06-10 | 101 decks Programme créés, 0 cartes (aucun skill_attempts éligible pré-existant — attendu).                          |
| 6 — Quality checks                 | ✅ Terminée       | 2026-06-10 | Svelte autofixer OK, ESLint 0 erreur, check:incremental baseline stable 9/46, perf P0#2 + P1 appliqués.              |
| 7 — Documentation + commit         | ✅ Terminée       | 2026-06-10 | `docs/architecture/database-schema.md` MAJ + nouveau `docs/ref/srs/architecture.md` + archive de la doc cible.       |

---

## Phase 0 — Spec TDD + décisions (terminée 2026-06-10)

**Livrables** :

- `docs/wip/srs-fsrs-spec-tdd.md` — comportements attendus pour chaque API, trigger, helper, UI.
- Décisions par défaut actées (8 questions résolues, cf. §0).

**Décisions clés validées** :

- Pas de toggle élève (auto-ajout imposé).
- Suppression carte Programme interdite (RLS via `is_auto_managed`).
- Cold start FSRS (pas de replay des attempts historiques).
- `to_review` disparaît totalement de l'UI et de la VIEW.

---

## Phase 1 — Schéma DB (terminée côté code 2026-06-10)

**Lots** :

- [x] L1 — Migration `supabase/migrations/20260610100000_refonte_skill_attempts_per_template.sql`
- [x] L3 — Migration `supabase/migrations/20260610100100_srs_deck_sections.sql`
- [x] L10a partiel — `src/lib/types/skills.ts` : `SkillSource` étendu avec `'srs'`.
- [ ] L10a final — `src/lib/types/database.ts` régénéré : **bloqué sur action utilisateur** (`pnpm db:migrate` + `pnpm db:types`).

**Points clés de la migration L1** :

- `skill_attempts.skill_id` devient nullable (famille A : skill_id NULL, lien via M2M).
- Colonne `grade SMALLINT NULL` ajoutée.
- `chk_attempt_source_values` accepte `'srs'`.
- `chk_attempt_family_regime` refondu (régime A per-template).
- VIEW `student_skill_state_a_v` : colonne `to_review` supprimée.
- Trigger `skill_attempts_after_insert` : famille A boucle sur `question_template_skills`.
- Fonction `update_student_skill_state_a` : query refondue avec JOIN sur `question_template_skills`.
- Recompute idempotent des caches `student_skill_state_a` post-migration.

**Points clés de la migration L3** :

- Table `srs_deck_sections` créée avec RLS calquée sur `srs_cards`.
- `srs_decks.is_auto_managed BOOLEAN` ajouté (default false).
- `srs_cards.section_id UUID NULL` ajouté (FK → srs_deck_sections, ON DELETE SET NULL).
- UNIQUE `(deck_id, template_id) WHERE template_id IS NOT NULL` ajouté pour ON CONFLICT.
- Policies RLS de `srs_decks` et `srs_cards` étendues pour bloquer modif sur deck `is_auto_managed=true`.

**Actions utilisateur requises avant Phase 2 finale** :

1. `pnpm db:migrate` (push des 2 migrations)
2. `pnpm db:types` (régénération database.ts)

Code Phase 2 écrit en attendant — utilise des type-cast `as never` sur les nouveaux champs jusqu'à régénération de `database.ts`.

---

## Décisions / corrections rencontrées en cours

(à compléter au fil du chantier)

---

## Documents produits

**Référence canonique (post-livraison)** :

- `docs/ref/srs/architecture.md` — doc de référence stable (Phase 7).
- `docs/architecture/database-schema.md` — section "SRS / FSRS" ajoutée + `Compétences` mise à jour (Phase 7).

**Archive de la doc de design** :

- ~~`docs/ref/srs/architecture-cible-2026-06.md`~~ — supprimée (historique via `git log --follow`).

**WIP (chantier — peuvent être nettoyés ultérieurement)** :

- `docs/wip/srs-fsrs-spec-tdd.md` (Phase 0, spec TDD originale).
- `docs/wip/srs-fsrs-progress.md` (ce document — historique d'exécution).
- `docs/wip/srs-fsrs-security-audit-findings.md` (audit sécurité + spec V2 anti-fraud + risques préexistants).

**Plan d'exécution** :

- `~/.claude/plans/immutable-painting-cake.md` (plan validé en début de chantier).

## Bilan final

- **15 commits** sur main entre `63f6192e4` (phase 0) et le commit final phase 7.
- **4 migrations DB** poussées en prod (refonte skill_attempts + sections + follow-up P0 + seed rétroactif).
- **2 audits** : code-reviewer (10 findings, 4 P0 + 4 P1 traités) + performance-optimizer (5 findings, 3 traités) + security-auditor (5 findings, 3 P2 traités, 2 P1 documentés V2).
- **101 decks Programme** auto-créés rétroactivement, 0 cartes (cold start FSRS).
- **0 régression** sur la baseline `pnpm check:incremental` (9 erreurs / 46 warnings stable).
- **2 risques V2 documentés** : anti-fraud pattern detection + RPC SECURITY DEFINER pour `srs_card_stats` (préexistant).
