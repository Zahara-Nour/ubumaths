---
title: SRS — Audit sécurité
date: 2026-06-10
version: 1.0
audience: security review, ops
posture: acceptable
---

# Audit sécurité

Audit security-auditor 2026-06-10 sur la surface du chantier SRS / FSRS / Référentiel famille A. **3 findings P2 corrigés**, **2 findings P1 documentés pour V2** (analogues Anki self-graded et risque préexistant amplifié).

> Audit complet détaillé dans `docs/wip/srs-fsrs-security-audit-findings.md` (avec spec V2 anti-fraud).

---

## 1. Verdict global

**Posture** : **Acceptable**.

Périmètre globalement solide :

- Validation Zod sur tous les endpoints.
- Tous utilisent `locals.supabase` (session élève) — pas d'évasion service-role détectée.
- RLS étendu correctement à `is_auto_managed` pour `srs_decks` / `srs_cards` / `srs_deck_sections`.
- `SECURITY DEFINER` `update_student_skill_state_a` reçoit `student_id` mais est appelé uniquement par le trigger `AFTER INSERT skill_attempts`, où `NEW.student_id` vient d'une row déjà filtrée par la RLS `WITH CHECK (student_id = auth.uid())`.
- `student_skill_state_a_v` correctement en `security_invoker=on` (vérifié migration L1).
- Famille B bien isolée (CHECK XOR + policy `code IS NULL` côté self-insert élève).

---

## 2. Findings P2 corrigés en session

### 2.1 Ownership explicite sur endpoints sections

**Sévérité** : Medium (defense in depth)
**Fichiers** :

- `src/routes/api/srs/decks/[id]/sections/+server.ts:23-32` (GET)
- `src/routes/api/srs/decks/[id]/sections/[sectionId]/+server.ts` (PATCH, DELETE)

**Risque initial** : la RLS filtrait bien (subquery sur `srs_decks` avec `owner_id`), donc un deck étranger renvoyait silencieusement `[]` ou 404 muet. Pas une faille effective (élève ne voit rien d'un autre), mais masque les bugs côté client et complique le debug.

**Fix appliqué** (commit `f8f263688`) :

```ts
const { data: deck } = await locals.supabase
	.from('srs_decks')
	.select('id')
	.eq('id', params.id)
	.eq('owner_id', user.id)
	.maybeSingle();
if (!deck) {
	return json({ error: 'Deck not found or access denied' }, { status: 404 });
}
```

Ajouté en début de chaque handler (GET sections, PATCH section, DELETE section).

### 2.2 Garde-fou `is_auto_managed` global sur PUT `/api/srs/cards/[id]`

**Sévérité** : Medium (defense in depth)
**Fichier** : `src/routes/api/srs/cards/[id]/+server.ts:127-133`

**Risque initial** : le check `is_auto_managed` n'était fait que dans la branche `section_id`. Un futur ajout de champ modifiable pourrait oublier le check. RLS protégeait, mais erreur applicative imprécise.

**Fix appliqué** :

```ts
if (deck.is_auto_managed) {
	return json({ error: 'Cannot modify cards in auto-managed deck (Programme).' }, { status: 403 });
}
```

Remonté avant tout dispatch front/back content / section_id.

### 2.3 Validation Zod de `deck.config` avant `new FSRS(...)`

**Sévérité** : Medium (defense in depth)
**Fichier** : `src/routes/api/srs/review/submit/+server.ts:72-80`

**Risque initial** : `deck.config` (JSONB côté DB) passé tel quel à `new FSRS()`. Un payload futur malformé (params NaN, longueur ≠ 21) briserait le moteur silencieusement (`Math.exp(NaN) = NaN`, propagation).

**Fix appliqué** :

```ts
const configValidation = fsrsConfigSchema.safeParse(deck.config);
const safeConfig = configValidation.success ? configValidation.data : null;
const fsrs = new FSRS(
	safeConfig?.parameters || DEFAULT_FSRS_PARAMS,
	safeConfig?.desiredRetention || 0.9,
	safeConfig?.maximumInterval || 36500
);
```

Fallback `DEFAULT_FSRS_PARAMS` si invalide.

---

## 3. Findings P1 documentés (risques V1 acceptés)

### 3.1 P1 #1 — Grade abuse via review SRS sur deck Programme

**Sévérité** : High (statistique)
**Endpoint** : `POST /api/srs/review/submit`

**Risque** : Un élève peut POSTer `/api/srs/review/submit` avec `grade=4` sur n'importe quelle carte de son deck Programme sans avoir réellement résolu la question. Le serveur écrit `skill_attempts source='srs', success=(grade>=2)=true`, qui via le trigger force `is_acquired=true` au BO sur cumul.

**Pourquoi accepté V1** :

- Analogue Anki / RemNote / Mnemosyne : tout SRS self-graded permet à l'élève de se mentir. Caractéristique du modèle, pas un bug.
- L'élève ne fait du mal qu'à lui-même (apprend mal).
- Le verdict BO `is_acquired` exige `distinct_template_successes >= 2` : pour tricher, l'élève doit avoir DEUX templates différents tagués sur la capacité. **3 templates 6ᵉ tagués actuellement**, peu de capacités multi-templates.
- Le prof voit AUSSI les résultats Monde 1 (interactif, non trichables). La triche SRS est détectable par contraste.

**Mitigations V2** (spec complète dans `docs/wip/srs-fsrs-security-audit-findings.md`) :

- Anti-fraud pattern detection (6 signaux, score composite, table `srs_anti_fraud_flags`).
- À activer dès **≥ 20 templates 6ᵉ tagués + ≥ 5 capacités multi-templates**.
- Effort estimé : 3-5 jours.

### 3.2 P1 #2 — `srs_card_stats` directement writable par l'élève (préexistant, amplifié)

**Sévérité** : High
**Fichier** : `supabase/migrations/080_create_srs_tables.sql:322-339` (RLS originale)

**Risque** : Les policies INSERT/UPDATE/DELETE de `srs_card_stats` (migration 080 d'octobre 2025) autorisent l'élève à écrire arbitrairement `state='review', stability=99999, next_review='2099-01-01'` pour n'importe quelle carte. Le chantier amplifie l'impact : `templateToBadge` (`src/lib/server/srs/capacity-badge.ts:122`) dérive le badge directement de ces colonnes → un élève peut self-déclarer `acquise_en_memoire` sans aucun `skill_attempts`.

**Pourquoi accepté V1** :

- Risque **préexistant** (introduit en migration 080), non créé par ce chantier.
- Le verdict BO `is_acquired` reste basé sur `skill_attempts` (non trichable par cette voie).
- Le badge FSRS dynamique est un signal **complémentaire** au verdict BO, pas un substitut. Un élève qui falsifie son badge n'affecte pas son LSU / bulletin.

**Fix V2 recommandé** :

1. Migration follow-up : `REVOKE INSERT, UPDATE, DELETE ON srs_card_stats FROM authenticated`.
2. Créer RPC `upsert_srs_card_stats_self(p_grade INT, p_template_id UUID, ...)` `SECURITY DEFINER` qui :
   - Vérifie `auth.uid()` = student.
   - Lit l'état courant.
   - Soit : implémente FSRS en PL/pgSQL (cf. spec TDD §3.3 : décision actée NON pour V1).
   - Soit : continue d'accepter les paramètres pré-calculés côté TS, mais avec un nonce/HMAC signé par le serveur (anti-tamper).
3. Refactor les 2 endpoints (`/api/skill-attempts` + `/api/srs/review/submit`) pour appeler la RPC.

**Effort V2** : 2-3 jours.

---

## 4. Surface d'attaque

### 4.1 Endpoints publics (12 au total dans le périmètre)

| Endpoint                                   | Méthode            | Auth requise                                         | Validation                | Risque résiduel           |
| ------------------------------------------ | ------------------ | ---------------------------------------------------- | ------------------------- | ------------------------- |
| `/api/skill-attempts`                      | POST               | ✅ requireAuth                                       | ✅ Zod                    | Faible (Zod + RLS)        |
| `/api/srs/decks`                           | GET, POST          | ✅ requireAuth                                       | ✅ Zod                    | Faible                    |
| `/api/srs/decks/[id]`                      | GET, PATCH, DELETE | ✅ requireAuth                                       | ✅ Zod                    | Faible                    |
| `/api/srs/decks/[id]/assign`               | POST               | ✅ requireAuth + `is_teacher_or_admin`               | ✅ Zod                    | Faible                    |
| `/api/srs/decks/[id]/sections`             | GET, POST          | ✅ requireAuth + ownership explicite                 | ✅ Zod                    | Faible                    |
| `/api/srs/decks/[id]/sections/[sectionId]` | PATCH, DELETE      | ✅ requireAuth + ownership explicite                 | ✅ Zod                    | Faible                    |
| `/api/srs/cards`                           | GET, POST          | ✅ requireAuth                                       | ✅ Zod                    | Faible                    |
| `/api/srs/cards/[id]`                      | GET, PUT, DELETE   | ✅ requireAuth + ownership + `is_auto_managed` check | ✅ Zod                    | Faible                    |
| `/api/srs/review/due`                      | GET                | ✅ requireAuth                                       | ✅ Zod (incl. `?states=`) | Faible                    |
| `/api/srs/review/submit`                   | POST               | ✅ requireAuth + requireConsent                      | ✅ Zod                    | P1 grade abuse (cf. §3.1) |

Aucun endpoint en `anon`. Aucun bypass service-role détecté dans les flows audités.

### 4.2 Tables sensibles

| Table                            | RLS active                   | Auteur write                                            | Risque résiduel                 |
| -------------------------------- | ---------------------------- | ------------------------------------------------------- | ------------------------------- |
| `skill_attempts`                 | ✅                           | Élève (`auto`/`srs`/`student_self`) OU prof (`teacher`) | Famille A : grade abuse (P1 #1) |
| `srs_decks`                      | ✅ étendue `is_auto_managed` | Élève                                                   | Aucun                           |
| `srs_cards`                      | ✅ étendue `is_auto_managed` | Élève                                                   | Aucun                           |
| `srs_card_stats`                 | ⚠️ permissive (préexistant)  | Élève **direct**                                        | **P1 #2 — write arbitraire**    |
| `srs_deck_sections`              | ✅                           | Élève (deck non-assigné + non-auto-managé)              | Aucun                           |
| `student_skill_state_a`          | ✅ read-only                 | Trigger uniquement                                      | Aucun                           |
| `student_skill_state_a_v` (VIEW) | ✅ `security_invoker=on`     | (read-only)                                             | Aucun                           |

### 4.3 Fonctions PL/pgSQL critiques

| Fonction                          | SECURITY | Vecteur d'attaque                                                | Mitigation                                                                  |
| --------------------------------- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `update_student_skill_state_a`    | DEFINER  | Si appelée hors trigger avec student_id forgé → cross-user write | Appelée uniquement par trigger ; `NEW.student_id` validé par RLS WITH CHECK |
| `update_student_observable_state` | DEFINER  | Idem                                                             | Idem trigger                                                                |
| `update_student_competence_level` | DEFINER  | Cascade depuis observable_state                                  | Hérité                                                                      |
| `skill_attempts_after_insert`     | DEFINER  | Dispatcher trigger — boucle interne sur skills tagués            | Sûr (NEW déjà validé)                                                       |

Toutes les fonctions ont `SET search_path = public, pg_temp` (anti schema-hijacking, décision 72).

---

## 5. Vérifications saines (non-findings)

L'audit a explicitement vérifié et trouvé **sains** :

- **Famille B isolation** : policy `skill_attempts_insert_own_student` (L1:370-374) interdit `code IS NOT NULL` côté self-insert élève → pas d'auto-déclaration famille B possible.
- **section_id cross-deck** : check `eq('deck_id', card.deck_id)` dans `cards/[id]/+server.ts:160-164` empêche d'assigner une carte à la section d'un autre deck.
- **`update_student_skill_state_a` SECURITY DEFINER scope** : appelée uniquement par trigger sur INSERT, `student_id` provient de `NEW` (déjà validé par WITH CHECK RLS) → pas d'escalation cross-user.
- **VIEW `student_skill_state_a_v`** : `security_invoker=on` (migration L1) → RLS de la table sous-jacente respectée.
- **Pas de service-role usage** dans les endpoints audités. Tous utilisent `locals.supabase` (session élève).
- **`computeCapacityBadges`** : lit via `locals.supabase` filtré par `user_id` (RLS `srs_card_stats`) — pas de cross-user.
- **Pas d'injection SQL** : Zod + transform sur `?states=`, Supabase JS échappe les paramètres.

---

## 6. Top 5 actions prioritaires

| #   | Item                                                                                                              | Sévérité | Effort   | Quand activer                                            |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------- |
| 1   | ~~Spec V2 anti-fraud pattern detection~~ → **livré 2026-06-10**, voir [`anti-fraud.md`](./anti-fraud.md)          | High     | ✅ livré | ≥ 20 templates 6ᵉ tagués + ≥ 5 capacités multi-templates |
| 2   | RPC SECURITY DEFINER pour `srs_card_stats` writes (P1 #2 fix)                                                     | High     | 2-3 j    | Avant croissance significative de la base élèves         |
| 3   | Ajouter rate-limiting sur `/api/srs/review/submit` (anti-spam grade=4)                                            | Medium   | 4 h      | Quand on remarque des comportements suspects             |
| 4   | Migration de durcissement `chk_skill_attempts_grade_only_with_srs_or_auto` (interdire grade NULL si source='srs') | Low      | 1 h      | Quand le tagging dépasse 30 templates                    |
| 5   | Audit Zod des futurs schémas (createSectionSchema déjà OK, mais maintenir la rigueur)                             | Low      | continu  | Continue                                                 |

---

## 7. Voir aussi

- [`anti-fraud.md`](./anti-fraud.md) — Système anti-cheat livré 2026-06-10 (5 signaux + composite + UI prof).
- [`docs/wip/srs-fsrs-security-audit-findings.md`](../../wip/srs-fsrs-security-audit-findings.md) — Audit détaillé + spec V2 anti-fraud (6 signaux + table + UI prof).
- [`code-quality.md`](./code-quality.md) — Refactor structure (ne pas confondre avec audit sécu).
- [`README.md`](./README.md) — Action items cross-cutting prioritaires.
