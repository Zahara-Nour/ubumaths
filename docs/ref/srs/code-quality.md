---
title: SRS — Qualité de code et dette technique
date: 2026-06-10
version: 1.0
audience: mainteneurs
severity_globale: Major
---

# Qualité de code et dette technique

Audit qualité post-chantier 2026-06-10. Le module est livré (release v0.9.9) mais embarque une dette critique côté tests et plusieurs incohérences de docs intra-fichiers.

---

## 1. Findings critiques

### 1.1 ~~Tests intégration `skill-attempts-endpoint.test.ts` désynchronisés avec l'API refondue~~ ✅ RÉSOLU

**Sévérité** : ~~Critical~~ Resolved (réécrits en même session 2026-06-10)
**Fichier** : `tests/integration/skill-attempts-endpoint.test.ts` (avant 28 tests → après 34 tests / 8 describe blocs)

**Fix appliqué** :

- Toutes les assertions `expect(data.inserted).toBe(0)` (4 occurrences) corrigées en `toBe(1)` — l'API renvoie maintenant 1 row toujours.
- Header doc-comment mis à jour (refonte 2026-06-10 explicitement documentée).
- Liste des migrations required étendue avec `20260610100000` + `20260610100100` + `20260610150000`.
- 6 nouveaux tests ajoutés dans bloc « Refonte chantier 2026-06-10 — Comportements per-template » :
  1. 1 attempt sur template tagué N skills → 1 row inséré + N rows `student_skill_state_a` mises à jour
  2. Mapping success → grade (3 si true, 1 si false)
  3. Auto-création deck Programme à la 1ʳᵉ interaction famille A
  4. Idempotence : 2 appels même template → 1 seule carte Programme
  5. Template non tagué famille A → pas ajout Programme mais row OK
  6. FSRS `srs_card_stats` créé automatiquement avec state=`learning`

ESLint propre, 34 `it()` / 8 `describe()`. **Détail historique préservé ci-dessous.**

**Détail historique (résolu)** :

L'API `POST /api/skill-attempts` a été refondue per-template (1 row INSERT au lieu de N). Le test contient encore des assertions vérifiant l'ancien comportement :

| Ligne                       | Assertion problématique                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 192                         | `expect(data.inserted).toBe(0)` — pour template untagged. L'API renvoie maintenant `inserted: 1`.                                                                                       |
| 300                         | `expect(data.inserted).toBe(0)` — idem                                                                                                                                                  |
| 609                         | `expect(data.inserted).toBe(0)` — idem                                                                                                                                                  |
| 24 (doc-comment)            | "200 with inserted=0 / inserted=1" — doc inexacte                                                                                                                                       |
| 28-32 (migrations required) | Migrations citées : `20260609120000`, `20260609120001`, `20260609120002`, `20260609130000`. Manque `20260610100000_refonte_skill_attempts_per_template.sql` qui change le comportement. |

**Impact** : à la prochaine exécution CI ou locale, les 4+ assertions cassent. Cache la régression sur les vrais cas (par exemple : 2 skills tagués → maintenant 1 row au lieu de 2). Aucun test ne valide la nouvelle boucle PG sur `question_template_skills`.

**Fix recommandé** :

1. Mettre à jour le doc-comment ligne 24 : "200 with inserted=1 (always for valid templates), skill_ids varies".
2. Réécrire les assertions : `expect(data.inserted).toBe(1)` partout (succès → 1 row).
3. Ajouter test "template tagué N skills → 1 row skill_attempts insérée → trigger met à jour N rows student_skill_state_a".
4. Ajouter test "FSRS UPSERT échoue → 500 et pas d'INSERT skill_attempts" (test fail-loud P0#1).
5. Ajouter migration `20260610100000_refonte_skill_attempts_per_template.sql` à la liste required.

**Effort** : 1 jour.

### 1.2 Zéro test unitaire sur le nouveau code

**Sévérité** : Critical
**Fichiers** :

- `src/lib/server/srs/capacity-badge.ts` (192 L, 4 fonctions exportées) — 0 test
- `src/lib/server/srs/programme-deck.ts` (141 L, 3 fonctions exportées) — 0 test
- `src/lib/components/srs/CapacityFsrsBadge.svelte` (71 L) — 0 test

Les fonctions `templateToBadge`, `worstBadge`, `aggregateBadge` (lignes 122-170 de `capacity-badge.ts`) sont **pures**, idéales pour des tests unitaires triviaux et rapides à écrire. Le fait qu'elles soient non testées laisse les règles d'agrégation (qui font partie du contrat pédagogique) sans filet de sécurité contre les régressions.

**Fix recommandé** : voir `tests.md` §3.

---

## 2. Findings majeurs

### 2.1 ~~Références mortes vers `docs/wip/srs-fsrs-architecture-cible.md` (supprimé)~~ ✅ RÉSOLU

**Sévérité** : ~~Major~~ Resolved (corrigé en même session 2026-06-10)
**Fichiers concernés (avant correction, 5 occurrences)** :

```
src/lib/server/srs/programme-deck.ts:12
src/lib/server/srs/capacity-badge.ts:13
src/lib/components/srs/CapacityFsrsBadge.svelte:8
src/routes/(protected)/dashboard/revisions/decks/programme/+page.server.ts:7-8
src/routes/(protected)/dashboard/revisions/decks/programme/+page.svelte:8
```

Le doc `docs/wip/srs-fsrs-architecture-cible.md` a été renommé puis supprimé dans le commit `f766ab9c6`. Les 5 fichiers gardent des références pointant vers le document supprimé. Pour un nouveau développeur qui ouvre `capacity-badge.ts` et lit l'en-tête, le lien ne marche pas.

**Fix appliqué en session** : sed sur les 5 fichiers, remplacement par `docs/ref/srs/architecture.md`. Vérifié `grep -rn` retourne 0 occurrence après patch.

### 2.2 Duplication code init FSRS entre 2 endpoints

**Sévérité** : Major
**Fichiers** :

- `src/routes/api/skill-attempts/+server.ts:147-203` (`applyFsrsUpdate`)
- `src/routes/api/srs/review/submit/+server.ts:72-127` (logique inline)

Les deux fonctions font :

1. SELECT srs_card_stats existant
2. Map row vers `CardStats` (15 champs)
3. Init via `FSRS.initCard` si non existant
4. UPSERT srs_card_stats

Variations mineures : le submit accepte un `timeSpent` que le skill-attempts n'a pas. Mais la majorité du code est identique. Si la table `srs_card_stats` ajoute une colonne, on doit modifier les deux.

**Fix recommandé** : extraire `loadOrInitCardStats(supabase, userId, templateId, fsrs)` + `applyFsrsReview(supabase, stats, grade, timeSpent?)` dans `src/lib/server/srs/fsrs-actions.ts`. Les deux endpoints appellent les helpers, économie nette ~50 lignes.

**Effort** : 2 heures.

### 2.3 Duplication `ensureProgrammeDeckCard` appelée 2 fois avec garde différente

**Sévérité** : Major
**Fichiers** :

- `skill-attempts/+server.ts:116-124` — garde : `if (skillIds.length > 0)`
- `srs/review/submit/+server.ts:164-172` — garde : `if (tagged = await isTemplateTaggedFamilyA(...))`

Les deux endpoints veulent ajouter la carte au Programme si le template est tagué famille A. Le premier a déjà les skill_ids en mémoire (via la query fusionnée). Le second fait une query supplémentaire `isTemplateTaggedFamilyA`.

Le second est sous-optimal : si l'INSERT skill_attempts précédent a fait fire le trigger qui lui-même lit `question_template_skills`, on a fait 3 lectures de la même table en 1 hot path.

**Fix recommandé** : extraire un helper `getTaggedSkillIds(supabase, templateId): Promise<string[]>` et le mémoriser en cache local pour la durée de la requête (Map dans `locals` ou simple variable).

**Effort** : 30 minutes.

### 2.4 `applyFsrsUpdate` ne respecte pas la config FSRS du deck (skill-attempts)

**Sévérité** : Major
**Fichier** : `src/routes/api/skill-attempts/+server.ts:147-153`

```ts
async function applyFsrsUpdate(supabase, userId, templateId, grade) {
	const fsrs = new FSRS(); // ← Pas de config !
	// ...
}
```

Le constructeur sans args utilise `DEFAULT_FSRS_PARAMS`, `0.9`, `36500`. Mais `srs_card_stats` est partagé entre tous les decks via UNIQUE `(user_id, card_reference_type, card_reference_id)`. Si l'élève a un deck personnel avec `desiredRetention=0.95`, ses reviews Monde 1 vont silencieusement utiliser 0.9 et désaligner ses next_review attendus.

**Comparaison** : `srs/review/submit/+server.ts:73-77` lit `deck.config.parameters/desiredRetention/maximumInterval`. Comportement différent entre les 2 endpoints pour la même carte.

**Fix recommandé** : décider lequel des comportements est canonique. Option A : Monde 1 utilise toujours la config par défaut (rationale : ce n'est pas une review SRS, c'est un quiz). Option B : Monde 1 cherche le deck Programme (config par défaut) et l'utilise. Documenter le choix.

**Effort** : Décision PO + 1 heure.

---

## 3. Findings mineurs

### 3.1 `capacity-badge.ts` : top-comment dit "non_commencee — aucun template avec srs_card_stats" mais la fonction range aussi `state='new'` → `en_apprentissage`

**Sévérité** : Minor
**Fichier** : `src/lib/server/srs/capacity-badge.ts:5-11` (commentaire) vs `:122-128` (code)

Le commentaire en haut du fichier dit :

```
1. 🆘 a_remedier        — ≥ 1 template due ET state ∈ {learning, relearning}
...
5. ◯ non_commencee      — aucun template avec srs_card_stats
```

Mais `templateToBadge` classe `state='new'` → `en_apprentissage` au lieu de `non_commencee`. La règle réelle est plus subtile :

- `non_commencee` = aucun template tagué OU aucune skill_attempt sur les templates tagués.
- `state='new'` (cas exotique où une carte existe mais aucun skill_attempt) = `en_apprentissage`.

**Fix recommandé** : aligner le commentaire avec le code (documenter le cas `state='new'` exotique).

### 3.2 `programme-deck.ts:30` : commentaire désactualisé sur l'absence de UNIQUE

```
30: * Idempotent grâce à l'index UNIQUE `uq_srs_decks_one_programme_per_owner`
31: * (migration 20260610150000) + retry explicite sur code 23505.
```

Bonne : c'est à jour. Vérifié.

### 3.3 Pages dashboard avec `as never` Supabase pour `order` nested

**Sévérité** : Minor
**Fichier** : `src/routes/(protected)/dashboard/revisions/decks/programme/+page.server.ts:171`

```ts
.order('skill_objectives(display_order)' as never, { ascending: true })
```

Le typage Supabase JS ne supporte pas la syntaxe d'ordre sur jointure nested. Le cast `as never` est légitime mais documenté en commentaire.

**Note** : c'est un trait du Supabase JS client, pas un bug de notre code. À surveiller lors d'une montée de version Supabase JS (potentiel fix upstream).

### 3.4 `BADGE_PRIORITY` exposé indirectement via `worstBadge` mais pas typé exposable

**Sévérité** : Minor
**Fichier** : `src/lib/server/srs/capacity-badge.ts:145-151`

```ts
const BADGE_PRIORITY: Record<CapacityBadge, number> = {
  a_remedier: 5,
  a_renforcer: 4,
  ...
};
```

Non exporté. Si un consommateur externe veut implémenter sa propre logique d'ordre (par exemple pour trier la liste affichée), il doit dupliquer le mapping (cf. P2#10 du code review, traité).

**Fix recommandé** : exporter `BADGE_PRIORITY` ou ajouter un helper `comparBadges(a, b): number`.

---

## 4. Composants Svelte — observations

### 4.1 `CapacityFsrsBadge.svelte` (71 L) — sain

Composant pur (props in, JSX out). 5 configurations via objet `config` `$derived`. Rendu conditionnel `{#if badge !== 'non_commencee'}` évite d'afficher les capacités non commencées.

Un seul **manque** : pas de test (cf. §1.2).

### 4.2 `ReviewSession.svelte` (356 L) — saine après modification

La modification chantier ajoute la prop `states?: string` + propagation à `/api/srs/review/due` ligne 87-90. Le code reste cohérent avec le pattern original. Aucune dette ajoutée.

### 4.3 Page deck detail `/dashboard/revisions/decks/[id]/+page.svelte` (~350 L) — code lisible mais sans test

Composant complexe (CRUD sections, dialog modal, MySelect par carte). Pas de test E2E ni unit. Cf. §2.3 dans `tests.md`.

---

## 5. SQL / migrations — observations

### 5.1 Migrations chantier — bien structurées

Les 4 migrations livrées chantier ont :

- Header descriptif (date, plan, depends on).
- `IF NOT EXISTS` / `IF EXISTS` partout.
- Comments métier sur les CHECK / RLS.
- RAISE NOTICE structurés pour le seed (cf. `20260610200000`).

### 5.2 Trigger `skill_attempts_after_insert` — robuste

Boucle `FOR v_skill_id IN ... LOOP` avec garde `s.family = 'knowledge'`. Famille B routée séparément. 0 itération silencieuse si template non tagué.

### 5.3 VIEW `student_skill_state_a_v` — `security_invoker = on` correctement défini

Vérifié dans `20260610100000_refonte_skill_attempts_per_template.sql`. Respecte la RLS de la table sous-jacente.

---

## 6. Top 7 refactors prioritaires

| #   | Item                                                                                         | Sévérité | Effort         | Fichier(s)                                          |
| --- | -------------------------------------------------------------------------------------------- | -------- | -------------- | --------------------------------------------------- |
| 1   | Réécrire `skill-attempts-endpoint.test.ts` pour per-template                                 | Critical | 1 j            | `tests/integration/skill-attempts-endpoint.test.ts` |
| 2   | Tests unitaires `capacity-badge.test.ts` (`templateToBadge`, `worstBadge`, `aggregateBadge`) | Critical | 0.5 j          | `src/lib/server/srs/capacity-badge.test.ts` (NEW)   |
| 3   | Tests unitaires `programme-deck.test.ts` (race conditions)                                   | Critical | 0.5 j          | `src/lib/server/srs/programme-deck.test.ts` (NEW)   |
| 4   | Patcher les 5 références mortes vers archive supprimée                                       | Major    | 15 min         | sed sur 5 fichiers                                  |
| 5   | Factoriser init FSRS entre `/api/skill-attempts` et `/api/srs/review/submit`                 | Major    | 2 h            | NEW `src/lib/server/srs/fsrs-actions.ts`            |
| 6   | Trancher la divergence config FSRS Monde 1 vs Monde 2 + documenter                           | Major    | 1 h (+ déc PO) | `/api/skill-attempts/+server.ts:147`                |
| 7   | Aligner commentaire `capacity-badge.ts` avec la règle `state='new'`                          | Minor    | 5 min          | `src/lib/server/srs/capacity-badge.ts:5-11`         |

---

## 7. Voir aussi

- [`tests.md`](./tests.md) — Plan détaillé des tests à ajouter.
- [`README.md`](./README.md) — Action items cross-cutting + chiffres clés.
- [`docs/wip/srs-fsrs-progress.md`](../../wip/srs-fsrs-progress.md) — Historique exécution chantier.
