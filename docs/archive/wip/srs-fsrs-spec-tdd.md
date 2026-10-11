# Spec TDD — Refonte SRS / FSRS / Référentiel famille A

> Document préalable à toute implémentation. Décrit les comportements attendus en français.
> Référence : `docs/wip/srs-fsrs-architecture-cible.md` (architecture détaillée).
> Plan d'exécution : `~/.claude/plans/immutable-painting-cake.md`.
> Date : 2026-06-10.

---

## 0. Décisions actées (Phase 0)

| #   | Décision                                         | Valeur                                |
| --- | ------------------------------------------------ | ------------------------------------- |
| 1   | Toggle élève "désactiver auto-ajout Programme"   | ❌ Non — auto-ajout imposé            |
| 2   | Suppression d'une carte du Programme par l'élève | ❌ Interdite (deck `is_auto_managed`) |
| 3   | Partage `srs_card_stats` entre decks             | ✅ Conservé (UNIQUE user × template)  |
| 4   | Cartes custom : FSRS conservé tel quel           | ✅ Sous-système parallèle inchangé    |
| 5   | Purge `srs_card_stats` après inactivité          | ❌ Pas V1                             |
| 6   | VIEW de compatibilité ascendante `to_review`     | ❌ Pas de VIEW de compat              |
| 7   | Intervention prof sur deck Programme d'un élève  | ❌ Pas V1                             |
| 8   | Replay FSRS sur attempts historiques             | ❌ Cold start (FSRS démarre vide)     |

Conséquences techniques directes :

- `to_review` disparaît de `student_skill_state_a_v` et de toute UI.
- Le deck Programme est marqué `is_auto_managed=true` → RLS bloque DELETE/UPDATE par l'élève.
- Aucune préférence utilisateur ajoutée sur `profiles`.
- Aucun replay : `srs_card_stats` reste vide pour les attempts historiques jusqu'à la prochaine interaction.

---

## 1. Comportements — POST `/api/skill-attempts`

### 1.1 — Cas nominal : élève répond à un template tagué famille A

**Entrée** : `{ template_id, success: true|false, with_help: false }` + JWT auth élève.

**Effets attendus** (transaction logique) :

1. Exactement **1 row** insérée dans `skill_attempts` : `student_id = auth.uid()`, `template_id`, `success`, `grade = 3 si success=true sinon 1`, `source='auto'`, `skill_id=NULL`, `task_id=NULL`, `code=NULL`.
2. `srs_card_stats` UPSERT pour `(user_id, card_reference_type='template', card_reference_id=template_id)` :
   - Si pas existant : INSERT avec stats FSRS initialisés via `FSRS.reviewCard(initialStats, grade)`.
   - Si existant : UPDATE via `FSRS.reviewCard(currentStats, grade)`.
3. Auto-création du deck Programme si pas déjà existant pour cet élève.
4. Ajout d'une carte `srs_cards (deck_id=programme, card_type='template', template_id)` si pas déjà présente (idempotent).
5. Trigger PG `skill_attempts_after_insert` boucle sur `question_template_skills WHERE template_id=$1` et appelle `update_student_skill_state_a` pour chaque `skill_id` tagué.

**Sortie** : `200 { inserted: 1, skill_ids: [...skill_ids tagués...] }`.

### 1.2 — Cas template non tagué famille A

Identique au cas nominal sauf :

- Aucune row dans `srs_cards` pour le deck Programme (filtre : ne PAS ajouter si template non tagué).
- Trigger PG boucle sur 0 itération → aucun `student_skill_state_a` mis à jour.

**Sortie** : `200 { inserted: 1, skill_ids: [] }`.

Le template est tout de même suivi par FSRS via `srs_card_stats`. Visible uniquement si l'élève l'ajoute manuellement à un deck personnel.

### 1.3 — Cas d'erreur

| Cas                                    | Code | Détail                       |
| -------------------------------------- | ---- | ---------------------------- |
| JSON body invalide                     | 400  | "Invalid JSON body"          |
| Validation Zod échoue                  | 400  | message Zod du premier issue |
| Non authentifié                        | 401  | thrown par `requireAuth`     |
| Template inexistant                    | 404  | "template_not_found"         |
| INSERT échoue (RLS, contraint, réseau) | 500  | "insert_failed" + détail     |

### 1.4 — Cas race condition deck Programme

Deux requêtes concurrentes peuvent essayer de créer le deck Programme. Le helper `ensureProgrammeDeck` doit :

1. SELECT le deck existant.
2. Si pas existant, INSERT avec gestion d'erreur 23505 (unique violation).
3. Sur erreur unique : re-SELECT et retourner le deck créé par l'autre requête.

Le pattern s'inspire de `src/lib/server/tags-resolution.ts` (`resolveTagsToIds`).

---

## 2. Comportements — POST `/api/srs/review/submit`

### 2.1 — Cas nominal : review d'une carte template-based

**Entrée** : `{ cardId, deckId, grade ∈ {1,2,3,4}, timeSpent? }` + JWT auth élève propriétaire du deck.

**Effets attendus** :

1. **NOUVEAU** : 1 row insérée dans `skill_attempts` : `student_id = auth.uid()`, `template_id` (depuis `srs_cards.template_id`), `grade`, `success = (grade >= 2)`, `source='srs'`.
2. `srs_card_stats` UPSERT comme aujourd'hui (calcul FSRS via `reviewCard(grade, timeSpent)`).
3. `srs_review_sessions` UPSERT (analytics, inchangé).
4. Trigger PG boucle sur `question_template_skills` et appelle `update_student_skill_state_a` pour chaque skill tagué.
5. Si template tagué et **pas** dans le deck Programme : ajout idempotent (cas où l'élève a manuellement ajouté la carte à un deck personnel sans passer par le quiz Monde 1).

**Sortie** : `200 { success: true, stats: {...} }`.

### 2.2 — Cas carte custom (front/back libre)

**Entrée** : carte avec `card_type='custom'`, pas de `template_id`.

**Effets attendus** :

- **PAS** de skill_attempts inséré (pas de template, pas de skill).
- `srs_card_stats` UPSERT avec `card_reference_type='custom'`, `card_reference_id=card.id`.
- `srs_review_sessions` UPSERT.
- Pas d'ajout au deck Programme (carte custom n'a pas de tagging famille A).

### 2.3 — Cas template non tagué

Identique à 2.1 mais avec `inserted skill_ids = []`. La carte reste dans son deck d'origine, **pas** ajoutée au Programme.

### 2.4 — Cas d'erreur

| Cas                                | Code | Détail                                   |
| ---------------------------------- | ---- | ---------------------------------------- |
| Validation Zod                     | 400  | message Zod                              |
| Non authentifié                    | 401  | `requireAuth`                            |
| Card non trouvée                   | 404  | "Card not found"                         |
| Card ≠ deck spécifié               | 400  | "Card does not belong to specified deck" |
| Deck non possédé par l'utilisateur | 404  | "Deck not found or access denied"        |
| Référence carte invalide           | 400  | "Invalid card reference"                 |
| UPSERT srs_card_stats échoue       | 500  | "Failed to update card statistics"       |
| INSERT skill_attempts échoue       | 500  | "Failed to insert skill_attempts"        |

---

## 3. Comportements — Trigger `skill_attempts_after_insert`

### 3.1 — Famille A (refonte)

**Déclenchement** : INSERT row avec `template_id NOT NULL AND skill_id IS NULL`.

**Logique** :

```sql
FOR v_skill_id IN
    SELECT skill_id
      FROM question_template_skills qts
      JOIN skills s ON s.id = qts.skill_id
     WHERE qts.template_id = NEW.template_id
       AND s.family = 'knowledge'
LOOP
    PERFORM update_student_skill_state_a(NEW.student_id, v_skill_id);
END LOOP;
```

Cas particuliers :

- 0 skill tagué → 0 itération, retour silencieux.
- N skills tagués → N appels indépendants à `update_student_skill_state_a`.

### 3.2 — Famille B (inchangé)

**Déclenchement** : INSERT row avec `skill_id NOT NULL AND template_id IS NULL`.

**Logique** : appel `update_student_observable_state(NEW.student_id, NEW.skill_id)` exactement comme aujourd'hui.

### 3.3 — Côté FSRS

**Le trigger ne touche pas `srs_card_stats`**. La mise à jour FSRS se fait côté API (TypeScript), avant l'INSERT `skill_attempts`. Justification : FSRS est implémenté en TS (`src/lib/srs/fsrs.ts`), pas de portage en PL/pgSQL.

Conséquence : un INSERT direct dans `skill_attempts` via service role ne met pas à jour FSRS. C'est documenté comme exotique et acceptable.

---

## 4. Comportements — Helper `ensureProgrammeDeckCard`

Localisation cible : `src/lib/server/srs/programme-deck.ts` (NEW).

### 4.1 — `ensureProgrammeDeck(supabase, userId): Promise<string>`

Retourne l'ID du deck Programme de l'élève. Crée si nécessaire.

**Logique** :

1. SELECT `srs_decks WHERE owner_id=userId AND is_auto_managed=true AND deck_type='personal' LIMIT 1`.
2. Si existant : retourner son ID.
3. Sinon : INSERT avec `name='Programme'`, `deck_type='personal'`, `is_assigned=false`, `is_auto_managed=true`.
4. Sur erreur 23505 (race) : re-SELECT et retourner.
5. Retourner l'ID créé.

### 4.2 — `ensureProgrammeDeckCard(supabase, userId, templateId): Promise<void>`

Idempotent. Ajoute la carte au deck Programme si pas déjà présente.

**Pré-condition** : le `template_id` doit être tagué famille A (au moins un `question_template_skills` avec `skill.family='knowledge'`). Cette vérification se fait côté caller (l'helper assume que le caller a déjà filtré).

**Logique** :

1. `deckId = await ensureProgrammeDeck(supabase, userId)`.
2. INSERT `srs_cards (deck_id, card_type='template', template_id)` avec gestion d'erreur 23505.
   - Note : nécessite un index UNIQUE sur `(deck_id, template_id)` côté DB (à ajouter en migration L3).
3. Sur erreur 23505 : exit silencieux (carte déjà ajoutée par une autre requête concurrente).

### 4.3 — Cas d'erreur

Les erreurs autres que 23505 (constraint violations) sont propagées à l'appelant. Le caller (`/api/skill-attempts`) les logge et retourne 500.

---

## 5. Comportements — Calcul du badge FSRS agrégé sur une capacité

Logique côté `+page.server.ts` (Référentiel famille A).

### 5.1 — Cas de calcul

Pour un `skill_id` (capacité famille A) :

```sql
WITH templates_de_la_capacite AS (
    SELECT template_id
      FROM question_template_skills
     WHERE skill_id = $skill_id
),
fsrs_state_par_template AS (
    SELECT t.template_id,
           s.state,
           s.next_review
      FROM templates_de_la_capacite t
      LEFT JOIN srs_card_stats s
        ON s.user_id = $user_id
       AND s.card_reference_type = 'template'
       AND s.card_reference_id   = t.template_id
)
SELECT
    CASE
      WHEN COUNT(state) = 0 THEN 'non_commencee'
      WHEN COUNT(*) FILTER (WHERE next_review <= NOW() AND state IN ('learning','relearning')) > 0
        THEN 'a_remedier'
      WHEN COUNT(*) FILTER (WHERE next_review <= NOW() AND state = 'review') > 0
        THEN 'a_renforcer'
      WHEN COUNT(*) FILTER (WHERE next_review > NOW() AND state = 'review') > 0
        THEN 'acquise_en_memoire'
      ELSE 'en_apprentissage'
    END AS badge
FROM fsrs_state_par_template;
```

Priorité d'agrégation (du plus prioritaire au moins) :

1. `a_remedier` — au moins 1 template due en state learning/relearning.
2. `a_renforcer` — au moins 1 template due en state review.
3. `acquise_en_memoire` — au moins 1 template pas due en state review.
4. `en_apprentissage` — au moins 1 template pas due en state learning/relearning.
5. `non_commencee` — aucun template avec srs_card_stats.

### 5.2 — Cohabitation avec `is_acquired` (BO formel)

Les deux verdicts sont affichés côte à côte :

- Verdict BO (`is_acquired`) : 🟠/🟢/✨ — visuel formel BO.
- Badge FSRS dynamique : 🆘/🔁/⏳/✅ — call to action.

Cas non contradictoires :

- `is_acquired=true` + badge `a_renforcer` ✅ : la capacité est validée BO mais FSRS détecte un oubli en cours.
- `is_acquired=false` + badge `a_remedier` ✅ : capacité non encore acquise + échec récent.
- `is_acquired=true` + badge `acquise_en_memoire` ✅ : tout va bien.
- `is_acquired=false` + badge `en_apprentissage` ✅ : en cours d'acquisition.

---

## 6. Comportements — CRUD sections manuelles

### 6.1 — POST `/api/srs/decks/[id]/sections`

**Entrée** : `{ name (1-50 chars), description? (≤200), display_order: int >= 0 }`.

**Effets** : INSERT `srs_deck_sections (deck_id=[id], name, description, display_order)`.

**Erreurs** :

- 401 non auth.
- 403 si deck pas owné par l'élève.
- 403 si deck `is_auto_managed=true` (Programme refuse les sections manuelles).
- 403 si deck `is_assigned=true` (assigné par prof, RO côté élève).
- 400 si validation Zod fail.
- 409 si name duplicate (UNIQUE deck_id + name).

### 6.2 — PATCH `/api/srs/decks/[id]/sections/[sectionId]`

**Entrée** : `{ name?, description?, display_order? }`.

**Effets** : UPDATE des champs fournis.

**Erreurs** : idem POST.

### 6.3 — DELETE `/api/srs/decks/[id]/sections/[sectionId]`

**Effets** :

- DELETE `srs_deck_sections WHERE id=[sectionId]`.
- Les cartes qui référençaient cette section (`srs_cards.section_id`) se retrouvent avec `section_id=NULL` (RLS gère automatiquement avec FK ON DELETE SET NULL).

**Erreurs** : idem POST.

### 6.4 — PATCH `/api/srs/cards/[id]` (étendu)

Ajout : champ optionnel `section_id` dans le body.

**Effets** : UPDATE `srs_cards SET section_id=[nouveau]`.

**Erreurs** :

- 403 si carte dans un deck `is_auto_managed=true` (Programme refuse modification).
- 400 si la section appartient à un autre deck que la carte (vérif côté SQL).

---

## 7. Comportements — Migration de données existantes

### 7.1 — `skill_attempts` famille A actuelles

État actuel : ~0 à 5 rows en prod (3 templates tagués, peu d'élèves les ayant pratiqués).

Stratégie :

1. Backup des rows existantes (`CREATE TABLE skill_attempts_backup AS SELECT * FROM skill_attempts`).
2. Recréer la table avec nouveau schéma (migration L1).
3. Re-INSERT depuis le backup en dédoublonnant par `(student_id, template_id, created_at)` (les anciennes rows dupliquaient par skill_id).
4. Le `grade` reste NULL pour ces rows historiques (cold start).
5. Les caches `student_skill_state_a` se recalculent au passage du trigger (en réalité non — le trigger ne fire que sur INSERT. Il faudra forcer une recompute via un script complémentaire).

### 7.2 — Recompute `student_skill_state_a` après migration

Script SQL idempotent :

```sql
SELECT update_student_skill_state_a(student_id, skill_id)
  FROM (SELECT DISTINCT s.id AS skill_id, sa.student_id
          FROM skill_attempts sa
          JOIN question_template_skills qts ON qts.template_id = sa.template_id
          JOIN skills s ON s.id = qts.skill_id
         WHERE sa.template_id IS NOT NULL) t;
```

Exécuté une seule fois en fin de migration L1.

### 7.3 — `srs_card_stats` historiques

Conservées telles quelles. Pas de modification.

### 7.4 — Auto-création decks Programme rétroactive (Phase 5)

Pour chaque profile élève :

1. Vérifier si Programme deck existe (`is_auto_managed=true`).
2. Sinon créer.
3. Pour chaque template tagué famille A déjà rencontré (`skill_attempts.template_id`), ajouter au deck Programme (idempotent).

---

## 8. Comportements — UI Programme `/dashboard/revisions/decks/programme`

### 8.1 — Cas nominal : élève avec deck Programme peuplé

Affichage :

- Titre "Programme" + total cartes.
- 4 sections automatiques calculées côté serveur :
  1. 🆘 À remédier (N cartes) — bouton "Lancer session"
  2. 🔁 À renforcer (N cartes) — bouton "Lancer session"
  3. ⏳ En apprentissage (N cartes) — pas de bouton (cartes pas due)
  4. ✅ Acquise en mémoire (N cartes) — pas de bouton
- Chaque carte affiche : titre du template, capacité associée (lien vers objectif).

### 8.2 — Cas deck Programme vide

Affichage : "Tu n'as pas encore rencontré de capacités à réviser. Va t'entraîner sur tes objectifs !" + bouton vers `/dashboard/student/objectifs`.

### 8.3 — Cas deck Programme inexistant

Si pour une raison quelconque le deck Programme n'existe pas (élève qui n'a jamais répondu à un quiz famille A), redirection ou affichage identique au cas vide.

### 8.4 — Bouton "Lancer session"

Lance une session de review avec un filtre `states=learning,relearning` (À remédier) ou `states=review` (À renforcer). Tirage random parmi les cartes due de cette section.

---

## 9. Tests d'intégration cibles

### 9.1 — `tests/integration/skill-attempts-endpoint.test.ts` (refactor)

Adapter les tests existants :

- Vérifier 1 row INSERT au lieu de N (per-template).
- Vérifier auto-création Programme deck.
- Vérifier ajout idempotent de la carte.
- Vérifier mise à jour `srs_card_stats`.
- Test cas template non tagué.

### 9.2 — `tests/integration/srs-review-submit.test.ts` (nouveau ou extension)

- Vérifier insertion skill_attempts source='srs' après review.
- Vérifier grade conservé.
- Vérifier mise à jour `student_skill_state_a` via trigger.
- Test cas carte custom (pas de skill_attempts).

### 9.3 — `tests/integration/programme-deck.test.ts` (NEW)

- Test auto-création deck à la 1ʳᵉ interaction.
- Test idempotence (2 requêtes concurrentes ne créent pas 2 decks).
- Test refus suppression carte par RLS sur deck auto-managed.
- Test agrégation badge FSRS sur capacité (mock state + next_review).

### 9.4 — `tests/integration/sections-crud.test.ts` (NEW)

- Test CRUD sections sur deck personnel.
- Test refus création section sur deck Programme.
- Test refus création section sur deck assigned.
- Test cascade section_id=NULL au delete section.

---

## 10. Critères d'acceptation par phase

| Phase | Critères                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Migrations passent en local. `pnpm db:types` régénère sans erreur. `SkillSource` étendu. 0 régression CHECK constraints.       |
| 2     | Tests d'intégration passent. `skill_attempts` 1 row per-template. `srs_card_stats` mis à jour. Deck Programme créé idempotent. |
| 3     | Page Programme affiche les 4 sections. Badge FSRS visible sur page objectifs. `to_review` supprimé de l'UI.                    |
| 4     | CRUD sections fonctionne sur deck personnel. UI affiche sections + cartes non rangées.                                         |
| 5     | Script migration data idempotent. Tous les élèves existants ont leur deck Programme.                                           |
| 6     | Baseline `pnpm check:incremental` inchangée (≈9/46). 0 erreur eslint sur fichiers chantier. Audit perf trigger < 50ms p99.     |
| 7     | Docs à jour. Commit final. Tag mineur.                                                                                         |

---

## 11. Vocabulaire final (définitions stables)

| Mot                        | Sens dans ce chantier                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Capacité**               | `skills` row de famille `knowledge` (rang 1..4 sous un objectif). Unité d'évaluation BO.                           |
| **Variation**              | Synonyme de `question_template` du point de vue du Référentiel.                                                    |
| **Carte SRS**              | `srs_cards` row : lien `(deck, template)` ou `(deck, custom content)`.                                             |
| **Stats FSRS**             | `srs_card_stats` row : état D/S/R + next_review par `(user, template)`.                                            |
| **Deck Programme**         | Deck `srs_decks` avec `is_auto_managed=true`, contient tous les templates tagués famille A rencontrés par l'élève. |
| **Section manuelle**       | `srs_deck_sections` row : regroupement de cartes défini par l'utilisateur dans un deck personnel.                  |
| **Section automatique**    | Vue calculée à la lecture (À remédier / À renforcer / etc.), uniquement dans le deck Programme.                    |
| **Badge FSRS de capacité** | Statut dérivé par agrégation montante des templates taguant la capacité (cf. §5.1).                                |
| **Verdict BO**             | `is_acquired` calculé par règles §6.1 (`distinct_template_successes >= 2`, etc.).                                  |
| **À remédier**             | Statut FSRS : carte due ET state ∈ {learning, relearning}.                                                         |
| **À renforcer**            | Statut FSRS : carte due ET state = review.                                                                         |
| **En apprentissage**       | Statut FSRS : carte pas due ET state ∈ {learning, relearning}.                                                     |
| **Acquise en mémoire**     | Statut FSRS : carte pas due ET state = review.                                                                     |
