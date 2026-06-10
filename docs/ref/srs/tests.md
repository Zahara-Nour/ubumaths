---
title: SRS — Couverture des tests et angles morts
date: 2026-06-10
version: 1.0
audience: contributors, test-automator
couverture_globale: moyenne_inegale
---

# Couverture des tests et angles morts

Audit tests post-chantier 2026-06-10. L'algo FSRS lui-même est bien couvert (héritage), mais **tout le code livré dans le chantier est à 0 % de couverture**.

---

## 1. Vue d'ensemble

> **MAJ 2026-06-10 (même session)** : le fichier `skill-attempts-endpoint.test.ts` a été réécrit (28 → 34 tests, **0 assertion désynchronisée restante**). Cf. §1.1 et §3.1 sprint critique J1 ✅.

### 1.1 Comptage par fichier de test (247 tests SRS-related)

| Fichier                                             | Tests     | Surface couverte                                                                                                                                                  |
| --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/srs/fsrs.test.ts`                          | 60        | Algo FSRS-6 (calculateRetrievability, reviewCard, calculateInterval, edge cases)                                                                                  |
| `src/lib/srs/config.test.ts`                        | 39        | DEFAULT_FSRS_PARAMS validation, instanciation FSRS avec configs                                                                                                   |
| `src/lib/srs/generator.test.ts`                     | 25        | generateSRSInstance (seed aléatoire), generateSRSPreviewInstances                                                                                                 |
| `src/lib/server/validation/srs.test.ts`             | 66        | Schémas Zod : createDeckSchema, submitReviewSchema, updateCardSchema, fsrsConfigSchema. **Ne couvre PAS** createSectionSchema, updateSectionSchema, states filter |
| `src/routes/api/srs/api-routes.test.ts`             | 23        | Smoke des endpoints SRS (deck/card auth happy paths). **Ne couvre PAS** sections, ne propage pas les changements chantier                                         |
| `tests/integration/skill-attempts-endpoint.test.ts` | **34** ✅ | Intégration POST /api/skill-attempts post-chantier (réécrits 2026-06-10) : assertions per-template + 6 nouveaux tests pour deck Programme + FSRS + mapping grade  |

**Total** : 247 tests utilisables (28 → 34 grâce à la réécriture du fichier d'intégration).

### 1.2 Estimation de couverture

L'algo FSRS pur (`fsrs.ts:37-345`) est très bien couvert (60 tests dont edge cases du modèle DSR, transitions d'état, calculs d'intervalle). Le générateur (`generator.ts:110 L`) est testé sur 25 cas. Les validations Zod sont solides sur les anciens schémas.

**Mais** la surface du chantier est **0 %** :

| Fichier chantier                                                                | Lignes | Tests             | Couverture            |
| ------------------------------------------------------------------------------- | ------ | ----------------- | --------------------- |
| `src/lib/server/srs/capacity-badge.ts`                                          | 192    | 0                 | **0 %**               |
| `src/lib/server/srs/programme-deck.ts`                                          | 141    | 0                 | **0 %**               |
| `src/lib/components/srs/CapacityFsrsBadge.svelte`                               | 71     | 0                 | **0 %**               |
| `src/routes/api/srs/decks/[id]/sections/+server.ts`                             | 105    | 0                 | **0 %**               |
| `src/routes/api/srs/decks/[id]/sections/[sectionId]/+server.ts`                 | 107    | 0                 | **0 %**               |
| `src/routes/api/skill-attempts/+server.ts` (refactor)                           | 204    | 28 désynchronisés | **0 % usable**        |
| `src/routes/api/srs/review/submit/+server.ts` (extension skill_attempts insert) | 229    | partiel (ancien)  | non vérifié           |
| `src/routes/api/srs/review/due/+server.ts` (filtre states)                      | 212    | smoke seul        | **0 %** sur le filtre |
| `src/routes/(protected)/dashboard/revisions/decks/programme/+page.server.ts`    | 248    | 0                 | **0 %**               |
| `src/routes/(protected)/dashboard/revisions/decks/[id]/+page.server.ts`         | 110    | 0                 | **0 %**               |

**Lignes non couvertes** : ~1 770 L de code livrées sans test. **Dette critique.**

---

## 2. Angles morts critiques

### 2.1 `capacity-badge.ts` — 4 fonctions exportées, 0 test

**Fonctions exportées sans test** (toutes pures, idéales pour le testing) :

- `templateToBadge(state, nextReview, nowMs): CapacityBadge` — règle de mapping (5 sorties possibles).
- `worstBadge(badges: CapacityBadge[]): CapacityBadge` — agrégation par priorité.
- `aggregateBadge(states, nowMs): CapacityBadge` — composition templateToBadge + worstBadge.
- `computeCapacityBadges(supabase, studentId, skillIds): Promise<Map>` — 2 round-trips DB + agrégation.

**Cas de test prioritaires** (templateToBadge — 5 catégories × cas) :

```ts
describe('templateToBadge', () => {
  // a_remedier : due + learning/relearning
  it('returns a_remedier for due + learning', () => { ... });
  it('returns a_remedier for due + relearning', () => { ... });

  // a_renforcer : due + review
  it('returns a_renforcer for due + review', () => { ... });

  // acquise_en_memoire : not due + review
  it('returns acquise_en_memoire for not-due + review', () => { ... });

  // en_apprentissage : not due + learning/relearning OU state='new' OU nextReview=null
  it('returns en_apprentissage for not-due + learning', () => { ... });
  it('returns en_apprentissage for state=new regardless of nextReview', () => { ... });
  it('returns en_apprentissage when nextReview is null', () => { ... });

  // Edge cases
  it('treats nextReview=NOW (équivalence) comme due', () => { ... });
  it('handles invalid nextReview gracefully', () => { ... });
});
```

**Cas de test prioritaires (worstBadge)** :

```ts
describe('worstBadge', () => {
  it('returns non_commencee for empty array', () => { ... });
  it('returns the badge with highest priority', () => {
    expect(worstBadge(['acquise_en_memoire', 'a_remedier', 'en_apprentissage'])).toBe('a_remedier');
  });
  it('handles single-element arrays', () => { ... });
  it('handles duplicates', () => { ... });
  it('respects priority order: a_remedier > a_renforcer > en_apprentissage > acquise_en_memoire > non_commencee', () => { ... });
});
```

**Effort** : 0.5 jour pour ~30 tests sur les 3 fonctions pures + 5-10 tests intégration pour `computeCapacityBadges` (mock Supabase).

### 2.2 `programme-deck.ts` — 3 fonctions exportées, 0 test

**Fonctions exportées** :

- `ensureProgrammeDeck(supabase, userId): Promise<string>` — lookup-then-insert avec race condition handling.
- `ensureProgrammeDeckCard(supabase, userId, templateId): Promise<void>` — idempotent via UNIQUE.
- `isTemplateTaggedFamilyA(supabase, templateId): Promise<boolean>` — query simple.

**Scénarios critiques à tester (avec mock Supabase ou test integration)** :

```ts
describe('ensureProgrammeDeck', () => {
  it('returns existing deck id when one already exists', () => { ... });
  it('creates a new deck when none exists', () => { ... });
  it('retries on 23505 (race) and returns the deck created by other thread', () => { ... });
  it('throws on non-23505 errors', () => { ... });
  it('logs and throws when 23505 raised but no row found after refresh', () => { ... });
});

describe('ensureProgrammeDeckCard', () => {
  it('inserts a new card silently on first call', () => { ... });
  it('no-ops on 23505 (carte déjà présente)', () => { ... });
  it('throws on non-23505 errors', () => { ... });
});

describe('isTemplateTaggedFamilyA', () => {
  it('returns true when at least one knowledge skill is tagged', () => { ... });
  it('returns false when only competence skills are tagged', () => { ... });
  it('returns false when no skills are tagged', () => { ... });
  it('returns false on DB error (degraded mode)', () => { ... });
});
```

**Effort** : 0.5 jour avec mock Supabase via `vi.fn()` + matchers de chaîne fluent.

### 2.3 `CapacityFsrsBadge.svelte` — composant Svelte 5, 0 test

Composant simple mais critique (affiché sur la page objectifs). Tests : `@testing-library/svelte`.

```ts
describe('CapacityFsrsBadge', () => {
  it('renders nothing for non_commencee', () => { ... });
  it('renders icon + label when showLabel=true', () => { ... });
  it('uses correct color for a_remedier (red)', () => { ... });
  it('applies size sm by default', () => { ... });
});
```

**Effort** : 1 heure pour 5-10 tests.

### 2.4 Endpoints sections — 4 méthodes (POST/GET/PATCH/DELETE), 0 test

Critiques pour la sécurité (cf. P2#1 audit : ownership explicite ajouté). Tests intégration nécessaires :

```ts
describe('POST /api/srs/decks/[id]/sections', () => {
  it('creates a section in a personal deck', () => { ... });
  it('returns 403 on deck is_assigned=true', () => { ... });
  it('returns 403 on deck is_auto_managed=true (Programme)', () => { ... });
  it('returns 409 on duplicate name (UNIQUE deck_id, name)', () => { ... });
  it('returns 401 anon, 404 if deck not owned', () => { ... });
});

describe('PATCH /api/srs/decks/[id]/sections/[sectionId]', () => {
  it('updates name + display_order', () => { ... });
  it('returns 404 if section not in deck', () => { ... });
  // ... ownership refusal cases
});

describe('DELETE /api/srs/decks/[id]/sections/[sectionId]', () => {
  it('deletes section + sets cards.section_id to NULL (FK ON DELETE SET NULL)', () => { ... });
  // ... ownership refusal cases
});
```

**Effort** : 1 jour pour 15-20 tests d'intégration.

### 2.5 Filtre `?states=` sur `/api/srs/review/due` — 0 test

Le filtre est validé via Zod transform (cf. P1#8 du code review). Tests :

```ts
describe('GET /api/srs/review/due?states=', () => {
  it('returns all due cards when states param absent', () => { ... });
  it('returns only learning+relearning when states=learning,relearning', () => { ... });
  it('returns 0 cards when filter eliminates all (returns [])', () => { ... });
  it('ignores invalid states values silently (no filter)', () => { ... });
  it('returns empty when states param empty (?states=)', () => { ... });
});
```

**Effort** : 2 heures.

### 2.6 Auto-création deck Programme — pas de test d'intégration E2E

Le flow critique :

1. Élève répond à 1 question Famille A taguée.
2. `/api/skill-attempts` : INSERT + FSRS + ensureProgrammeDeckCard.
3. Vérifier que le deck Programme apparaît dans `srs_decks` avec `is_auto_managed=true`.
4. Vérifier que la carte apparaît dans `srs_cards` avec `card_type='template'`.
5. Vérifier qu'un 2ᵉ appel sur le même template ne duplique pas la carte (idempotence).

**Effort** : 0.5 jour pour 4-5 tests.

---

## 3. Plan de remédiation prioritaire

### 3.1 Sprint test critique (4 jours-équivalent)

| Jour | Fichier de test à créer ou réécrire                              | Tests cibles                                                                                    |
| ---- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| J1   | `tests/integration/skill-attempts-endpoint.test.ts` (réécriture) | 28 tests refondus per-template + tests trigger PG + fail-loud FSRS                              |
| J2   | `src/lib/server/srs/capacity-badge.test.ts` (NEW)                | 30+ tests sur templateToBadge / worstBadge / aggregateBadge + integration computeCapacityBadges |
| J3   | `src/lib/server/srs/programme-deck.test.ts` (NEW)                | 15+ tests avec mock Supabase (race, ownership)                                                  |
| J4   | `tests/integration/sections-crud.test.ts` (NEW)                  | 15-20 tests sur 4 endpoints sections                                                            |

**Total** : 4 jours, ~80-100 nouveaux tests.

### 3.2 Sprint test important (2 jours-équivalent)

| Jour | Test                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| J5   | Tests filtre `?states=` sur `/api/srs/review/due` (5 tests)                                |
| J5   | Tests composant `CapacityFsrsBadge.svelte` (5-10 tests via @testing-library/svelte)        |
| J5   | Tests E2E auto-création deck Programme (5 tests)                                           |
| J6   | Tests page Programme — `+page.server.ts` (mock Supabase, 10 tests sections groupage badge) |
| J6   | Tests page deck detail — composant CRUD + drag&drop (10 tests)                             |

**Total** : 2 jours, ~30-40 nouveaux tests.

### 3.3 Tests à ne PAS écrire (couverture suffisante héritée)

- `fsrs.ts` (60 tests existants couvrent l'algo)
- `config.ts` (39 tests)
- `generator.ts` (25 tests)

### 3.4 Convention de mocking Supabase

Pour les helpers serveur (`capacity-badge.ts`, `programme-deck.ts`), utiliser un mock fluent :

```ts
const supabaseMock = {
	from: vi.fn().mockReturnThis(),
	select: vi.fn().mockReturnThis(),
	eq: vi.fn().mockReturnThis(),
	in: vi.fn().mockReturnThis(),
	maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
	insert: vi.fn().mockReturnThis(),
	single: vi.fn().mockResolvedValue({ data: { id: 'deck-uuid' }, error: null })
};
```

Pour tester un code 23505 :

```ts
supabaseMock.single.mockResolvedValueOnce({
	data: null,
	error: { code: '23505', message: 'unique_violation' }
});
```

Pour les tests d'intégration, utiliser `createServiceRoleClient()` + `TestData` du framework existant (cf. `tests/integration/skill-attempts-endpoint.test.ts:44-50`).

---

## 4. Tests fragiles à surveiller

### 4.1 `skill-attempts-endpoint.test.ts` — déjà signalé désynchronisé

Sera réécrit en J1. En attendant : **ne pas relancer en CI** sans patch des assertions.

### 4.2 `api-routes.test.ts` (23 tests) — smoke seul

Les tests sont rapides mais ne couvrent que les happy paths d'auth. Ne valident pas :

- Le comportement après refonte chantier (nouvelles colonnes : `grade`, `section_id`, `is_auto_managed`).
- Les RLS contre ownership cross-user.
- Les codes erreur précis (23505 sur sections, 42501 sur deck auto-managé).

**Action** : ne pas considérer comme suffisant. Compléter avec tests d'intégration ciblés (J4).

---

## 5. Outils

### 5.1 Vitest config

`vitest.config.ts` du projet utilise :

- `pnpm test:server <path>` pour les tests serveur (helper, endpoint, integration).
- `pnpm test:client <path>` pour les tests Svelte (`.svelte.test.ts`).
- `pnpm test:triggers` désactivé localement (cf. mémoire `feedback_no-trigger-tests`).

### 5.2 Tester un trigger PG

Comme `pnpm test:triggers` est indisponible, valider les triggers via :

- Tests d'intégration sur l'endpoint (qui déclenche le trigger).
- Polling synchrone sur la table cache (`student_skill_state_a`) avec timeout 4s (pattern existant dans `skill-attempts-endpoint.test.ts:108-128`).

---

## 6. Top 10 tests à écrire en priorité

| #   | Test                                                    | Fichier                            | Effort |
| --- | ------------------------------------------------------- | ---------------------------------- | ------ |
| 1   | `inserted=1` toujours, peu importe tagging              | `skill-attempts-endpoint.test.ts`  | 1 h    |
| 2   | Trigger PG fire N fois après 1 INSERT (N=skills tagués) | `skill-attempts-endpoint.test.ts`  | 1 h    |
| 3   | `templateToBadge` règle complète (9 cas)                | `capacity-badge.test.ts` (NEW)     | 2 h    |
| 4   | `worstBadge` priorité (5 cas + edge)                    | `capacity-badge.test.ts` (NEW)     | 1 h    |
| 5   | `ensureProgrammeDeck` race 23505 → re-lookup            | `programme-deck.test.ts` (NEW)     | 1 h    |
| 6   | POST sections : 403 sur deck `is_auto_managed=true`     | `sections-crud.test.ts` (NEW)      | 1 h    |
| 7   | DELETE section : cards.section_id → NULL                | `sections-crud.test.ts` (NEW)      | 1 h    |
| 8   | Filtre `?states=` ignore invalides                      | `due-endpoint.test.ts` (NEW)       | 1 h    |
| 9   | `CapacityFsrsBadge` rend rien pour `non_commencee`      | `CapacityFsrsBadge.test.ts` (NEW)  | 30 min |
| 10  | E2E auto-création Programme à la 1ʳᵉ interaction        | `programme-deck-e2e.test.ts` (NEW) | 2 h    |

**Effort total top 10** : ~12 heures (1.5 jour).

---

## 7. Voir aussi

- [`code-quality.md`](./code-quality.md) — Dette technique liée aux tests.
- [`README.md`](./README.md) — Action items cross-cutting.
- [`docs/wip/srs-fsrs-spec-tdd.md`](../../wip/srs-fsrs-spec-tdd.md) — Comportements attendus (utile pour écrire les assertions).
