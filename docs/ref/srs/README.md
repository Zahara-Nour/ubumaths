---
title: Module SRS / FSRS / Référentiel famille A — Documentation de référence
date: 2026-06-10
version: 1.0
status: vivant
audience: développeurs UbuMaths (nouveaux et mainteneurs)
scope: src/lib/srs/, src/lib/server/srs/, src/lib/components/srs/, src/routes/api/srs/, src/routes/api/skill-attempts/, src/routes/(protected)/dashboard/revisions/
---

# Module SRS / FSRS / Référentiel famille A — Documentation de référence

Système de révision espacée (SRS) basé sur l'algorithme FSRS-6, couplé au
Référentiel BO famille A via `skill_attempts` comme source unique des faits.
Trois mondes cohabitent autour de `question_templates` (Quiz interactif,
SRS self-graded, Référentiel BO). Refonte 2026-06-10 (livrée v0.9.9).

---

## Chiffres clés (2026-06-10, post-livraison v0.9.9)

| Indicateur                   | Valeur                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Fichiers source (hors tests) | 22                                                                              |
| Lignes source TS (cœur SRS)  | 4 667                                                                           |
| Lignes source API SRS        | 2 055                                                                           |
| Fichiers de test             | 6                                                                               |
| Tests Vitest                 | 241 (139 unit + 28 intégration + 66 validation + 8 helpers FSRS divers)         |
| Migrations DB                | 11 (dont 4 livrées en session : refonte + sections + follow-up P0 + seed rétro) |
| Endpoints API                | 11 (`/api/skill-attempts` + 10 sous `/api/srs/*`)                               |
| Composants Svelte            | 7                                                                               |
| Pages route                  | 6                                                                               |
| Élèves Programme rétroactif  | 101 (cold start)                                                                |
| Templates 6ᵉ taggés          | 3 / 72 (4 %) — pré-requis pédagogique majeur                                    |
| Posture sécurité globale     | **Acceptable** (3 P2 fixés, 2 P1 V2 documentés)                                 |
| Severité dette critique      | **Major** (tests désynchronisés + 0 test nouveau code)                          |
| Hot paths optimisés          | 3/5 (2 P0 + 1 P1 perf traités)                                                  |

> Chiffres vérifiés via `find src/lib/srs src/lib/server/srs src/lib/components/srs -name "*.ts" -o -name "*.svelte"`, `wc -l`, `grep -cE "^\s*(it|test)\("` (cf. journal).

---

## Les 5 documents de référence

### 1. [architecture.md](./architecture.md) — Vue d'ensemble

> **Audience** : nouveaux développeurs, onboarding
> **Longueur** : ~250 lignes

Les 3 mondes (Quiz / SRS / Référentiel), les 5 principes fondamentaux (source unique des faits, FSRS pilote timing, TS only, fail-loud, cohabitation `is_acquired` BO + badge FSRS), modèle de données (refonte per-template, deck Programme auto-géré, sections manuelles), flux d'écriture (Monde 1 + Monde 2 + Famille B), flux de lecture (page Programme + badges objectifs), inventaire des fichiers clés.

**À lire en premier** si tu découvres le module.

### 2. [code-quality.md](./code-quality.md) — Qualité & dette technique

> **Audience** : mainteneurs, avant refactor
> **Sévérité globale** : **Major**

Top issues identifiées :

- **Critique** : `tests/integration/skill-attempts-endpoint.test.ts` désynchronisé avec l'API refondue (assertions `inserted=0` pour templates non tagués, alors que l'API renvoie maintenant `inserted=1`). 28 tests potentiellement cassés.
- **Critique** : zéro test unitaire sur les nouveaux helpers (`capacity-badge.ts` 192 L, `programme-deck.ts` 141 L) malgré des fonctions pures parfaites pour le testing.
- **Major** : 5 fichiers source référencent `docs/wip/srs-fsrs-architecture-cible.md` (supprimé en commit `f766ab9c6`). Liens morts dans les en-têtes de doc.
- **Major** : duplication code de boucle/lookup entre `/api/skill-attempts` et `/api/srs/review/submit` (init FSRS, ensureProgrammeDeckCard).

### 3. [tests.md](./tests.md) — Couverture & robustesse

> **Audience** : contributors, test-automator
> **Couverture globale** : **moyenne inégale** — algo FSRS bien couvert, tout le nouveau code à 0 %

Répartition (241 tests SRS-related) :

- `fsrs.test.ts` : 60 tests (algo FSRS-6 unit)
- `config.test.ts` : 39 tests (constants + parametre)
- `generator.test.ts` : 25 tests (génération instances)
- `validation/srs.test.ts` : 66 tests (Zod schemas — ne couvre pas les nouveaux `createSectionSchema` / `updateSectionSchema`)
- `api-routes.test.ts` : 23 tests (smoke API routes)
- `skill-attempts-endpoint.test.ts` : 28 tests (intégration — **désynchronisés** avec l'API per-template)

Angles morts critiques :

- 0 test pour `capacity-badge.ts` (4 fonctions exportées, dont `templateToBadge` et `worstBadge` qui sont pures + idéales)
- 0 test pour `programme-deck.ts` (3 fonctions exportées avec race condition handling)
- 0 test pour les endpoints sections (POST/GET/PATCH/DELETE)
- 0 test sur le filtrage `?states=` du endpoint `/api/srs/review/due`
- 0 test sur l'auto-création du deck Programme dans `/api/skill-attempts`
- 0 test composant Svelte `CapacityFsrsBadge.svelte`

### 4. [performance.md](./performance.md) — Analyse de performance

> **Audience** : optimisation backend
> **Posture** : **acceptable** (audit fait, 3 P0/P1 traités, 2 V2 documentés)

**Session 2026-06-10 : 3 quick wins livrés** :

- P0#2 — Fusion SELECT template + skills tagués dans `/api/skill-attempts` : -1 RTT par attempt (~30-60 ms).
- P1 — `Promise.all` sur 3 SELECT indépendants page Programme : -2 RTT (~90-180 ms p95).
- P2#9 — Suppression de tous les casts `as never` traînants (post régénération database.ts).

Restants — **documentés V2** (non rentables sans tests d'intégration PG) :

- ⏳ **P0#1 — Refonte CTE `update_student_skill_state_a`** : 1 CTE avec `ROW_NUMBER()` au lieu de 2 scans séquentiels. Gain trigger ~25 ms vs ~50 ms. Risque élevé sans tests PG dédiés.
- ⏳ **P2 — `ensureProgrammeDeck` en `INSERT ON CONFLICT DO UPDATE RETURNING`** : -1 SELECT hot path nominal. Bémol : déclenche le trigger `update_updated_at`.

### 5. [security.md](./security.md) — Audit sécurité

> **Audience** : security review, ops
> **Posture globale** : **Acceptable**

3 findings P2 traités (defense in depth) ; 2 findings P1 documentés pour V2.

**Findings P2 corrigés en session** :

- Ownership explicite sur endpoints sections (GET/PATCH/DELETE) — RLS filtrait déjà mais retournait silencieusement `[]` ou 404 sans contexte.
- Garde-fou `is_auto_managed` global sur PUT card (avant : check uniquement dans branche `section_id`).
- Validation Zod de `deck.config` avant instantiation FSRS (fallback `DEFAULT_FSRS_PARAMS`).

**Findings P1 documentés V2** :

- **Grade abuse** sur review SRS du deck Programme — analogue au modèle Anki self-graded. Verdict BO `is_acquired` protégé par règle `distinct_template_successes >= 2` tant que peu de capacités multi-templates.
- **`srs_card_stats` writable directement par l'élève** (préexistant migration 080) — amplifié par chantier via `templateToBadge`. Fix V2 = REVOKE + RPC `SECURITY DEFINER`.

**Spec V2 anti-fraud pattern detection** détaillée dans `docs/wip/srs-fsrs-security-audit-findings.md` (6 signaux + score composite + table `srs_anti_fraud_flags`).

---

## Index thématique par sous-dossier

Pour chaque cluster du module, les documents qui en parlent :

| Cluster                            | Architecture | Qualité | Tests | Perf | Sécurité |
| ---------------------------------- | :----------: | :-----: | :---: | :--: | :------: |
| `src/lib/srs/` (algo FSRS)         |     §2.1     |   §3    | §1.1  |  §4  |    —     |
| `src/lib/server/srs/` (helpers)    |     §2.2     | §1, §2  | §2.1  | §3.1 |   §2.3   |
| `src/lib/components/srs/` (UI)     |     §2.3     |   §4    | §2.3  |  —   |    —     |
| `/api/skill-attempts` (Monde 1)    |     §3.1     |  §1.1   | §2.2  | §3.1 |   §2.1   |
| `/api/srs/review/submit` (Monde 2) |     §3.2     |  §1.1   | §2.2  | §3.1 |   §2.1   |
| `/api/srs/decks/[id]/sections`     |     §3.3     |   §2    | §2.4  |  —   |   §2.2   |
| Pages dashboard revisions          |      §4      |   §4    | §2.3  | §3.2 |    —     |
| Migrations DB                      |     §2.4     |  §1.2   |   —   | §3.3 |   §2.3   |

---

## Action items prioritaires (cross-cutting)

> **Session 2026-06-10 close — bilan final.**
>
> **17 commits livrés**, **release v0.9.9** publiée. Tous les findings P0 (4/4 code review + 2 perf) et P2 (3/3 sécurité) sont résolus. Le chantier est livrable mais avec **2 dettes critiques côté tests** qu'il faut traiter rapidement pour stabiliser.
>
> **Code review** : 4 P0 + 4 P1 traités (10 findings, 0 P0 restant). Spec V2 anti-fraud documentée.
>
> **Performance** : 3/5 quick wins livrés, 2 reportés V2 (ROI moyen, refonte PL/pgSQL risquée).
>
> **Sécurité** : posture **Acceptable** confirmée. 3 fixes P2 livrés. 2 fixes V2 documentés (anti-fraud + RPC `srs_card_stats`).

### Priorités immédiates (bloquantes V1)

1. **[QUALITÉ CRITIQUE]** Réécrire `tests/integration/skill-attempts-endpoint.test.ts` pour l'API per-template (assertions `inserted: 1` au lieu de `inserted: 0`). Sans ça, le test crash en CI dès qu'il sera relancé.
2. **[TESTS CRITIQUE]** Ajouter tests unitaires `capacity-badge.test.ts` : `templateToBadge`, `worstBadge`, `aggregateBadge` sont pures et idéales pour le testing. ~30 tests minimum (4 états × 2 due/notDue + special cases).
3. **[TESTS CRITIQUE]** Ajouter tests intégration sections : POST/GET/PATCH/DELETE + ownership + interdiction sur deck `is_auto_managed`.
4. **[QUALITÉ MAJEURE]** Mettre à jour les 5 références à `docs/wip/srs-fsrs-architecture-cible.md` (supprimé) dans les en-têtes de fichiers vers `docs/ref/srs/architecture.md`.

### Suite logique V1.x

5. **[PRÉ-REQUIS PÉDAGOGIQUE]** Étendre le tagging `question_template_skills` à ≥ 20-30 templates 6ᵉ. Sans ça, le deck Programme reste quasi-vide en pratique et la triche P1 #1 reste limitée mais inutile.
6. **[QUALITÉ MAJEURE]** Factoriser duplication entre `/api/skill-attempts` et `/api/srs/review/submit` (init FSRS + ensureProgrammeDeckCard) dans un helper partagé.
7. **[TESTS MAJEURE]** Ajouter tests `programme-deck.test.ts` avec mock Supabase : race condition handling (23505), ownership, idempotence.

### V2 (effort significatif)

8. **[PERF P0]** Refonte CTE `update_student_skill_state_a` — ~25 ms vs ~50 ms. **Pré-requis** : suite tests d'intégration PG pour fonction critique.
9. **[SÉCURITÉ P1]** RPC `SECURITY DEFINER` pour `srs_card_stats` writes — fix le risque préexistant amplifié par badges FSRS.
10. **[SÉCURITÉ P1]** Détection anti-fraud pattern — à activer dès tagging étendu. Spec complète dans `docs/wip/srs-fsrs-security-audit-findings.md`.

---

## Convention d'organisation

Ce répertoire suit la convention `docs/ref/<module-name>/` héritée de `docs/ref/geometry/` :

```
docs/ref/srs/
├── README.md          # Index (ce fichier) — synthèse, chiffres clés, action items
├── architecture.md    # Vue d'ensemble, modèle de données, flux
├── code-quality.md    # Dette technique, code smells, top refactors
├── tests.md           # Couverture, angles morts, tests prioritaires
├── performance.md     # Hotspots, optimisations prioritaires
└── security.md        # Surface d'attaque, findings, mitigations
```

### Règles pour les documents enfants

- **Header YAML** obligatoire : `title`, `date`, `audience`, optionnellement `severity_globale` / `posture` / `version`.
- **Chemins de fichiers avec lignes précises** (ex: `src/lib/server/srs/capacity-badge.ts:122-139`).
- **Sévérité explicite** pour chaque finding : `Critical` / `Major` / `Minor` (qualité) ; `High` / `Medium` / `Low` (perf et sécurité).
- **Recommandations concrètes** : pas "améliorer X" mais "extraire la fonction Y des lignes 100-150 vers un nouveau fichier Z".
- **Top N prioritaires** en fin de chaque document (top 5 ou top 10).

### Rythme de mise à jour

- **README maître** : à chaque livraison de feature significative dans le module.
- **architecture.md** : à chaque ajout/suppression de table, helper, endpoint ou composant fondamental.
- **code-quality.md / tests.md / performance.md / security.md** : audit complet recommandé **tous les 3-6 mois** ou avant une release majeure.

---

## Journal de session 2026-06-10

Refonte SRS / FSRS / Référentiel famille A en 17 commits, livrée en release v0.9.9.

### Phase 0-1 — Étude + Schéma DB (3 commits)

| Hash        | Sujet                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `63f6192e4` | docs : étude + spec TDD + architecture cible (3 docs `docs/wip/`)                                |
| `235243d72` | feat : phase 1 — schéma `skill_attempts` per-template + table `srs_deck_sections` + UNIQUE + RLS |
| `adf30e8f5` | chore : régénération `database.ts` post-migrations                                               |

### Phase 2 — Backend APIs unifiées (1 commit)

| Hash        | Sujet                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `38f5532c3` | feat : `/api/skill-attempts` (per-template + FSRS sync + auto Programme) + `/api/srs/review/submit` (insert skill_attempts + source srs) + helpers `programme-deck.ts` |

### Phase 3 — UI Programme + badges (1 commit)

| Hash        | Sujet                                                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c089f972a` | feat : page `/dashboard/revisions/decks/programme` (4 sections auto) + composant `CapacityFsrsBadge` + helpers `capacity-badge.ts` + page objectifs (suppression `to_review`, badge FSRS) + filtre `?states=` sur `/api/srs/review/due` |

### Phase 4 — Sections manuelles (1 commit)

| Hash        | Sujet                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `4222fed6e` | feat : 4 endpoints CRUD sections + page deck detail `/dashboard/revisions/decks/[id]/` + extension PUT card pour `section_id` |

### Phase 5 — Seed rétroactif (2 commits)

| Hash        | Sujet                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| `cd35a3ab8` | feat : migration `20260610200000_seed_programme_decks.sql` (101 decks créés en prod) |
| `dfc948dc9` | docs : MAJ progress doc phase 5                                                      |

### Phase 6 — Quality checks (1 commit)

| Hash        | Sujet                                                             |
| ----------- | ----------------------------------------------------------------- |
| `9389de4bc` | perf : P0#2 fusion SELECT + P1 Promise.all + nettoyage `as never` |

### Audits + corrections P0/P1 (3 commits)

| Hash        | Sujet                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `40c6c6f39` | fix : 4 P0 code review (FSRS fail-loud, stability=0.1 → initCard, UNIQUE Programme, grade NULL famille B)                              |
| `e72390df5` | fix : P1#5 (templateToBadge unifié), P1#7 (mapping objectif déterministe), P1#8 (validation `?states=`) + P2#10 (`worstBadge` exporté) |
| `c5c9a14a0` | chore : nettoyage `as never` traînants page Programme                                                                                  |
| `f8f263688` | fix : 3 P2 sécurité (ownership sections, is_auto_managed global, deck.config validation)                                               |
| `e386b624e` | docs : spec V2 anti-fraud pattern detection                                                                                            |

### Phase 7 — Documentation finale + release (4 commits)

| Hash         | Sujet                                                            |
| ------------ | ---------------------------------------------------------------- |
| `a1767b882`  | docs : phase 7 finale — doc référence canonique + archive design |
| `629fe332a`  | docs : ajustement phrase-clé lore Chiphres (1 ligne)             |
| `f766ab9c6`  | docs : supprime archive design initial (drift vs implémentation) |
| Tag `v0.9.9` | Release standard-version (bump 0.9.8 → 0.9.9)                    |

### Bilan chiffré

| Avant chantier                                                | Après chantier                                |
| ------------------------------------------------------------- | --------------------------------------------- | --------------------------------- |
| `skill_attempts` : 1 row par skill tagué (N rows par attempt) | 1 row par attempt (per-template)              |
| `skill_id` NOT NULL                                           | nullable (NULL en famille A)                  |
| `to_review` calculé (seuil 30j arbitraire)                    | Supprimé, remplacé par badge FSRS-derived     |
| Trigger PG : recompute via `skill_id`                         | recompute via JOIN `question_template_skills` |
| `srs_card_stats` : seulement Monde 2                          | Maintenu aussi par Monde 1                    |
| Deck Programme                                                | N/A → auto-géré (1 par élève)                 |
| Sections manuelles                                            | N/A → table `srs_deck_sections` + CRUD        |
| Pages dashboard revisions                                     | 3 (revisions/, create/, study/)               | 5 (+ programme/, decks/[id]/)     |
| Audits                                                        | 0                                             | 3 (code review + perf + sécurité) |
| Tests sur nouveau code                                        | N/A                                           | **0 (dette critique)**            |
| Documents `docs/ref/srs/`                                     | 0                                             | 6 (README + 5 docs)               |

### Recommandation prochaine session

**Stabilisation tests avant tout autre feature.** Le module est livrable mais la dette tests est critique :

1. Réécrire `skill-attempts-endpoint.test.ts` pour l'API per-template (1 jour).
2. Écrire `capacity-badge.test.ts` (30 tests pour 4 fonctions pures, 0.5 jour).
3. Écrire `programme-deck.test.ts` avec mock Supabase (race conditions, 0.5 jour).
4. Écrire tests intégration sections CRUD (1 jour).

Puis suite logique : **étendre le tagging des templates 6ᵉ** (chantier pédagogique pur, 3-5 jours selon volume).

---

## Voir aussi

- [`docs/wip/srs-fsrs-spec-tdd.md`](../../wip/srs-fsrs-spec-tdd.md) — spec TDD originale (comportements attendus).
- [`docs/wip/srs-fsrs-progress.md`](../../wip/srs-fsrs-progress.md) — historique d'exécution du chantier.
- [`docs/wip/srs-fsrs-security-audit-findings.md`](../../wip/srs-fsrs-security-audit-findings.md) — audit sécurité + spec V2 anti-fraud + backlog V2.
- [`docs/architecture/database-schema.md`](../../architecture/database-schema.md) — schéma DB global (sections « Compétences » + « SRS / FSRS »).
- [`CLAUDE.md`](../../../CLAUDE.md) — instructions projet pour Claude Code.
- [`MEMORY.md`](../../../../.claude/projects/-Users-david-Coding-js-ubumaths/memory/MEMORY.md) — mémoire persistante.
