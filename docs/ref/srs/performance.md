---
title: SRS — Performance
date: 2026-06-10
version: 1.0
audience: optimisation backend
posture: acceptable
---

# Performance

Audit performance post-chantier 2026-06-10. **3 quick wins livrés** (2 P0, 1 P1) ; 2 items reportés V2 (refonte PL/pgSQL et `INSERT ON CONFLICT` helper).

L'audit a été réalisé par lecture statique (pas de profiling réel). Les estimations en ms sont basées sur la latence Vercel EU ↔ Supabase EU (30-60 ms par round-trip).

---

## 1. Quick wins livrés en session

### 1.1 P0#2 — Fusion SELECT template + skills tagués dans `/api/skill-attempts`

**Fichier** : `src/routes/api/skill-attempts/+server.ts:57-77`
**Commit** : `9389de4bc`

**Avant** :

```
1. SELECT id FROM question_templates WHERE id = ?
2. ... (FSRS update + INSERT skill_attempts)
3. SELECT skill_id, family FROM question_template_skills + skills WHERE template_id = ?
```

→ 2 RTT séparés pour des données toutes deux liées à `template_id`.

**Après** :

```ts
.select('id, question_template_skills(skill_id, skills(family))')
.eq('id', template_id)
.maybeSingle();
```

→ 1 RTT via nested join Supabase JS.

**Gain estimé** : -1 RTT par attempt (~30-60 ms réseau Vercel EU → Supabase EU).
**Coût** : aucun.

### 1.2 P1 — `Promise.all` sur 3 SELECT indépendants page Programme

**Fichier** : `src/routes/(protected)/dashboard/revisions/decks/programme/+page.server.ts:118-145`
**Commit** : `9389de4bc`

**Avant** : 5 SELECT séquentiels (deck, cards, stats, templates, links). Steps 3+4+5 (stats, templates, links) indépendants une fois `templateIds` connu mais lancés séquentiellement.

**Après** :

```ts
const [statsRes, templatesRes, linksRes] = await Promise.all([
  locals.supabase.from('srs_card_stats').select(...).in(...),
  locals.supabase.from('question_templates').select(...).in(...),
  locals.supabase.from('question_template_skills').select(...).in(...)
]);
```

**Gain estimé** : -2 RTT (~90-180 ms p95) sur la page Programme.
**Coût** : aucun (les 3 requêtes restent indépendantes).

### 1.3 P2#9 — Suppression des casts `as never` traînants

**Commits** : `c5c9a14a0`, `9389de4bc`

`database.ts` régénéré post-migrations. Tous les casts `as never` introduits temporairement pour `is_auto_managed`, `grade`, etc. ont été retirés (un seul subsiste dans la syntaxe `order('skill_objectives(display_order)' as never)` — limitation Supabase JS, documentée).

**Gain** : type safety renforcée, pas de gain perf direct mais évite des bugs silencieux futurs.

---

## 2. Inventaire des hot paths

### 2.1 Hot path #1 : `POST /api/skill-attempts` (Monde 1)

Fréquence estimée : 1-5 appels/élève/minute en pic scolaire. ~100 élèves × ~3 appels = 300/min = 5/s à plein régime.

**Séquence** (post optim) :

```
1. requireAuth                                 (~5 ms session lookup)
2. Validation Zod                              (~0.1 ms)
3. SELECT template + tagged skills [FUSIONNÉ]  (~30 ms RTT)
4. FSRS apply (SELECT + UPSERT srs_card_stats) (~60 ms = 2 RTT)
5. INSERT skill_attempts                       (~30 ms RTT)
6. Trigger PG : N appels update_student_skill_state_a (séquentiels en PL/pgSQL)
   - N = nombre de skills tagués (typique 1-2)
   - update_student_skill_state_a = 2 queries séquentielles (cf. §3.1)
   - Coût : 2 × N × ~5 ms PG = 10-20 ms pour N=1, jusqu'à 40 ms pour N=4
7. ensureProgrammeDeckCard                     (~30 ms RTT lookup + 30 ms INSERT si nouveau)
                                               (~30 ms lookup seul si carte existe)
```

**Estimation latence end-to-end** :

- Cas nominal (carte existe déjà, 1 skill tagué) : ~5 + 0 + 30 + 60 + 30 + 15 + 30 = **~170 ms**.
- Cas premier attempt sur un template (1 skill) : +30 ms ensureProgrammeDeckCard INSERT = **~200 ms**.
- Cas pathologique (4 skills tagués + premier attempt) : +20 ms PG trigger + INSERT carte = **~220 ms**.

Acceptable pour un quiz interactif (l'élève ne sent rien sous 250 ms).

### 2.2 Hot path #2 : `POST /api/srs/review/submit` (Monde 2)

Fréquence estimée : ~1 appel/élève/seconde lors d'une session SRS active. ~30 reviews/élève/jour en moyenne.

**Séquence** :

```
1. requireAuth + requireConsent                (~5 ms)
2. Validation Zod                              (~0.1 ms)
3. SELECT srs_cards WHERE id=cardId            (~30 ms)
4. SELECT srs_decks WHERE id=deckId AND owner  (~30 ms)
5. SELECT srs_card_stats existant              (~30 ms)
6. FSRS reviewCard (TS, pas de RTT)            (~1 ms)
7. UPSERT srs_card_stats                       (~30 ms)
8. INSERT skill_attempts (template-based only) (~30 ms)
9. Trigger PG update_student_skill_state_a × N (~10 ms pour N=1)
10. (SI template tagué) isTemplateTaggedFamilyA (~30 ms) — DOUBLE check vs ce que la query 8 nous dit
11. (SI tagué) ensureProgrammeDeckCard         (~30 ms)
12. UPSERT srs_review_sessions                 (~30 ms)
```

**Estimation latence** :

- Cas nominal carte template + 1 skill tagué : ~5 + 30 + 30 + 30 + 30 + 30 + 10 + 30 + 30 + 30 = **~255 ms**.
- Cas carte custom : -90 ms (steps 8-11 skip) = **~165 ms**.

L'étape 10 (`isTemplateTaggedFamilyA`) est un round-trip **inutile** quand on a déjà l'info de `srs_cards.template_id` + le résultat de l'INSERT skill_attempts (cf. `code-quality.md` §2.3).

### 2.3 Hot path #3 : Page Programme load

Fréquence : ~10 visites/élève/jour. Pas un hot path à proprement parler, mais le UX est sensible (page d'entrée).

**Séquence** (post optim P1) :

```
1. requireAuth                                 (~5 ms)
2. SELECT srs_decks WHERE owner + auto_managed (~30 ms)
3. SELECT srs_cards WHERE deck_id              (~30 ms)
4. Promise.all [
     SELECT srs_card_stats WHERE user + templates,
     SELECT question_templates WHERE id IN (...),
     SELECT question_template_skills + skills + objectives WHERE template_id IN (...)
   ]                                            (~30 ms — RTT max des 3)
5. Map/agrégation TS                            (~5 ms)
```

**Estimation latence** : **~100 ms** post optim.

**Avant optim** : ~30 + 30 + 30 + 30 + 30 + 5 = ~155 ms (3 RTT séquentiels au lieu de 1).

Gain p95 : ~55 ms. Conforme à l'estimation P1.

### 2.4 Hot path #4 : Trigger PG `skill_attempts_after_insert`

**Code** : `update_student_skill_state_a` (cf. `20260610100000_refonte_skill_attempts_per_template.sql:130-220`).

**Séquence par appel** :

```
1. SELECT knowledge_type FROM skills WHERE id=p_skill_id      (~1 ms cache PG)
2. SELECT COUNT(*) + ... FROM skill_attempts JOIN question_template_skills WHERE student_id AND skill_id   (~2-5 ms selon volume)
3. WITH recent AS (SELECT ... ORDER BY created_at DESC LIMIT v_window) SELECT counts FROM recent  (~2-5 ms — MÊME JOIN qu'étape 2)
4. UPSERT student_skill_state_a                                (~1 ms)
```

**Estimation latence par appel** : ~5-15 ms PG-side. Pour N skills tagués, le trigger lance N appels séquentiels (FOR LOOP), soit ~5-60 ms total.

**Le problème** : steps 2 et 3 font le **même JOIN** sur skill_attempts × question_template_skills. PostgreSQL peut éventuellement optimiser le plan mais ce n'est pas garanti — surtout sous charge (cache buffer + lock contention).

---

## 3. Items perf reportés V2

### 3.1 P0#1 — Refonte CTE `update_student_skill_state_a` (~25 ms vs ~50 ms)

**Fichier** : `supabase/migrations/20260610100000_refonte_skill_attempts_per_template.sql:130-220`

**Problème** : la fonction fait 2 scans séquentiels sur la même jointure `skill_attempts × question_template_skills` (cf. §2.4).

**Solution proposée** : fusionner en 1 CTE avec `ROW_NUMBER()` :

```sql
WITH ranked AS (
    SELECT sa.success,
           sa.template_id,
           sa.created_at,
           ROW_NUMBER() OVER (ORDER BY sa.created_at DESC) AS rn
      FROM public.skill_attempts sa
      JOIN public.question_template_skills qts ON qts.template_id = sa.template_id
     WHERE sa.student_id = p_student_id
       AND qts.skill_id  = p_skill_id
       AND sa.template_id IS NOT NULL
       AND sa.success IS NOT NULL
)
SELECT COUNT(*)                                            AS total_attempts,
       COUNT(*) FILTER (WHERE success = TRUE)              AS total_successes,
       COUNT(DISTINCT template_id) FILTER (WHERE success = TRUE) AS distinct_tpl,
       MAX(created_at) FILTER (WHERE success = TRUE)        AS last_success_at,
       MAX(created_at)                                      AS last_attempt_at,
       COUNT(*) FILTER (WHERE rn <= v_window AND success = TRUE)  AS recent_successes,
       COUNT(*) FILTER (WHERE rn <= v_window AND success = FALSE) AS recent_failures
  INTO v_total_attempts, v_total_successes, v_distinct_tpl,
       v_last_success_at, v_last_attempt_at,
       v_recent_successes, v_recent_failures
  FROM ranked;
```

**Gain estimé** : ~25 ms vs ~50 ms par appel à `update_student_skill_state_a` (divisé par 2).

**Pré-requis avant fix** :

1. Tests d'intégration PG dédiés (le scénario actuel `tests/integration/skill-attempts-endpoint.test.ts` polle juste le résultat — pas assez fin pour détecter une régression sur les counts).
2. Tester avec données représentatives (élève avec 100+ attempts).
3. Vérifier le déterminisme du `ROW_NUMBER() OVER (ORDER BY created_at DESC)` quand 2 attempts ont le même `created_at` (ajouter `, id` comme tie-breaker).

**Risque** : refondre une fonction critique de SECURITY DEFINER qui pilote le verdict BO — si bug, tous les `is_acquired` deviennent faux.

**Effort estimé** : 1 jour (refonte + tests d'intégration PG dédiés).

### 3.2 P2 — `ensureProgrammeDeck` en `INSERT ON CONFLICT DO UPDATE RETURNING`

**Fichier** : `src/lib/server/srs/programme-deck.ts:32-90`

**Problème** : fait toujours un SELECT avant chaque INSERT, même quand le deck existe depuis longtemps. Chaque call coûte 1 SELECT inutile dans le nominal path (~30 ms RTT).

**Solution proposée** :

```ts
const { data, error } = await supabase
	.from('srs_decks')
	.upsert(
		{
			owner_id: userId,
			name: 'Programme',
			deck_type: 'personal',
			is_assigned: false,
			is_auto_managed: true,
			description: PROGRAMME_DECK_DESCRIPTION
		},
		{ onConflict: 'owner_id', ignoreDuplicates: false }
	)
	.select('id')
	.single();
```

Mais l'index UNIQUE actuel est partiel (`WHERE is_auto_managed = TRUE`), or Supabase JS `onConflict` ne supporte pas la spécification du predicate. Soit :

- Option A : utiliser une RPC SQL qui sait exprimer le `ON CONFLICT (owner_id) WHERE is_auto_managed = TRUE`.
- Option B : ajouter un index UNIQUE non partiel sur (owner_id, is_auto_managed) — mais alors un élève ne peut plus avoir 2 decks (Programme + personnel) → impossible.

**Risque** : déclenche le trigger `update_updated_at_column` sur chaque appel (UPDATE même si pas de changement de données). Polue `srs_decks.updated_at`.

**Bénéfice marginal** : économie d'1 RTT (~30 ms) seulement dans le hot path nominal. Si le SELECT préalable lit en cache PG, c'est invisible. **ROI moyen**.

**Recommandation** : ne pas faire ce fix tant qu'on n'a pas mesuré que le SELECT préalable est un vrai bottleneck (profiling réel).

---

## 4. Indexes vérifiés (santé DB)

Inventaire des indexes pertinents pour les hot paths SRS :

| Index                                         | Colonne(s)                                                                        | Usage                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| `idx_skill_attempts_student_template_time`    | `(student_id, template_id, created_at DESC) WHERE template_id IS NOT NULL`        | `update_student_skill_state_a` |
| `uq_srs_decks_one_programme_per_owner`        | `(owner_id) WHERE is_auto_managed = TRUE`                                         | `ensureProgrammeDeck`          |
| `uq_srs_cards_deck_template`                  | `(deck_id, template_id) WHERE template_id IS NOT NULL AND card_type = 'template'` | `ensureProgrammeDeckCard`      |
| `unique_user_card_reference` (srs_card_stats) | `(user_id, card_reference_type, card_reference_id)`                               | FSRS upsert                    |
| PK `question_template_skills`                 | `(template_id, skill_id)`                                                         | Trigger PG loop                |
| PK `srs_deck_sections`                        | `(id)`                                                                            | CRUD sections                  |
| `idx_srs_deck_sections_deck_order`            | `(deck_id, display_order)`                                                        | Liste sections triée           |
| `idx_srs_cards_section_id`                    | `(section_id) WHERE section_id IS NOT NULL`                                       | Liste cartes par section       |

**Conclusion** : toutes les colonnes filtrées dans les queries fréquentes sont indexées. Pas d'index manquant identifié dans le périmètre chantier.

---

## 5. Recommandations de profiling

Avant de re-optimiser, **mesurer**. Le code chantier est livrable mais sans profiling réel ; les estimations en ms sont théoriques.

### 5.1 Profiling à faire

| Cible                                 | Outil                                 | Métrique cible     |
| ------------------------------------- | ------------------------------------- | ------------------ |
| `/api/skill-attempts` end-to-end      | Vercel Analytics + Sentry tracing     | p95 < 300 ms       |
| Trigger `skill_attempts_after_insert` | `EXPLAIN ANALYZE` sur Supabase Studio | < 20 ms par appel  |
| Page Programme TTFB                   | Vercel Analytics                      | p95 < 500 ms       |
| Sur 100+ attempts/élève               | Test charge custom                    | Pas de dégradation |

### 5.2 Quand profiler

- **Sous 10 attempts/élève en moyenne** : pas la peine, latence largement sous le seuil de perception (250 ms).
- **À partir de 50+ templates 6ᵉ taggés** : le trigger devient critique (N skills par template peut atteindre 3-4).
- **À partir de 500 élèves actifs** : pic concurrence sur `srs_card_stats` UPSERT, contention possible.

---

## 6. Items différés (non rentables seuls)

- **Cache TS local** sur `isTemplateTaggedFamilyA` dans `/api/srs/review/submit` : économie d'1 RTT, mais minoritaire dans le hot path (le RTT principal est sur skill_attempts INSERT). ROI faible.
- **Batch INSERT skill_attempts** : si un élève répond à plusieurs questions en burst. Non scénario actuel (FlashCard.svelte traite 1 question à la fois).
- **Server-side rendering du badge** : déjà fait (page Programme côté server load + UI affichage). Pas d'opportunité côté client.

---

## 7. Top 5 actions prioritaires

| #   | Item                                                                                                  | Sévérité | Effort | ROI                                      |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ------ | ---------------------------------------- |
| 1   | Profiler avec Vercel Analytics avant tout autre travail                                               | High     | 1 h    | Critical (sans, on optimise à l'aveugle) |
| 2   | P0#1 refonte CTE `update_student_skill_state_a`                                                       | High     | 1 j    | Élevé si trigger fréquent                |
| 3   | Supprimer `isTemplateTaggedFamilyA` redondant dans review/submit (passer le résultat via cache local) | Medium   | 1 h    | Moyen                                    |
| 4   | Profiler page Programme avec 50+ cards                                                                | Medium   | 2 h    | Vérifie le gain P1                       |
| 5   | `EXPLAIN ANALYZE` sur les 2 queries de `update_student_skill_state_a`                                 | Low      | 30 min | Diagnostic préalable à P0#1              |

---

## 8. Voir aussi

- [`code-quality.md`](./code-quality.md) — Refactor structure (factorisation FSRS + isTemplateTaggedFamilyA).
- [`README.md`](./README.md) — Action items cross-cutting.
- `docs/wip/srs-fsrs-security-audit-findings.md` — Audit sécu qui mentionne aussi des risques perf indirects.
