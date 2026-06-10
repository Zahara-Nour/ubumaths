# Architecture cible — SRS / FSRS / Référentiel famille A

> Statut : document d'architecture — ne pose aucun code.
> Date : 2026-06-10
> Remplace : `docs/wip/srs-auto-from-skills-study.md` (étude initiale obsolète).
> Auteur : conversation Claude Code, validation utilisateur point par point.

---

## 0. TL;DR

Refonte du couplage entre 3 mondes existants (Questions, SRS, Référentiel) pour qu'ils partagent **une seule source de vérité des faits** (`skill_attempts`), que **FSRS pilote tout le timing de révision** (sans seuil arbitraire 30j/60j), et que les badges du Référentiel famille A soient **dérivés de l'état FSRS agrégé**, tout en conservant les règles §6.1 pour le verdict BO formel.

Décisions structurantes :

- Toute interaction (Monde 1 quiz **ou** Monde 2 SRS) écrit dans `skill_attempts`.
- `skill_attempts` famille A devient **per-template** (1 attempt = 1 row, indifféremment du nombre de skills tagués).
- Le grain FSRS reste le **template**. Le grain Référentiel reste la **capacité**.
- Un deck "Programme" est auto-géré pour chaque élève (contient les templates tagués famille A qu'il a rencontrés).
- Les statuts par template viennent intégralement de FSRS : 🆘 À remédier / 🔁 À renforcer / ⏳ En apprentissage / ✅ Acquise (en mémoire).
- Les badges par capacité sont une **agrégation montante** des statuts FSRS des templates qui la taguent.
- `is_acquired` §6.1 est **conservé** — il cohabite avec les badges FSRS et reste le verdict BO formel (LSU, bulletin).
- La famille B reste **totalement indépendante** (pas de FSRS, pas de SRS, règles §6.1bis + §6.4 inchangées).
- Casser l'existant est **acceptable** si la cible est plus propre.

---

## 1. Les 3 mondes (rappel)

```
                     ┌───────────────────────┐
                     │   question_templates  │ ← le PIVOT (Monde 1)
                     │   "Addition de frac"  │
                     └───────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   MONDE 1    │        │   MONDE 2    │        │   MONDE 3    │
│   Question   │        │     SRS      │        │  Référentiel │
│ (interactif) │        │ (self-grade) │        │ (capacité BO)│
└──────────────┘        └──────────────┘        └──────────────┘
```

Chaque monde a son grain naturel :

- Monde 1 : `question_template` → `question_instance` (validation auto).
- Monde 2 : `srs_card` (par template) avec FSRS au grain `(user, template)`.
- Monde 3 : `skill` (= capacité famille A ou observable famille B).

Hiérarchie famille A : `thème > objectif > capacité > variation (=template) > instance`.
Hiérarchie famille B : `compétence > sous-dimension > observable` — sans variation, observée sur tâches d'évaluation.

---

## 2. Principes architecturaux fondamentaux

### 2.1 — Source unique des faits

`skill_attempts` est **l'unique log primaire** des interactions élève. Toute autre table (`srs_card_stats`, `student_skill_state_a`, `student_observable_state`, `student_competence_level`) est un **cache dérivé** recomputable depuis `skill_attempts`.

Conséquence : aucune écriture côté FSRS ou côté Référentiel ne contourne ce log. Si demain on veut recomputer le cache FSRS depuis zéro, on rejoue les attempts dans l'ordre.

### 2.2 — FSRS pilote tout le timing de révision

Aucun seuil arbitraire (30 jours, 60 jours, fenêtre de 3 attempts) ne survit dans la **partie planification**. Tout ce qui détermine "quand retravailler" est calculé par FSRS-6 sur les colonnes `D` / `S` / `R` / `next_review`.

Les seuils §6.1 (`distinct_template_successes >= 2`, fenêtre 3 derniers) ne disparaissent **pas** — ils restent pour le calcul du verdict BO `is_acquired`, mais **ne pilotent plus** la décision "à retravailler".

### 2.3 — Asymétrie de cardinalité explicitement traitée

`1 capacité = N variations canoniques (templates) = N cartes FSRS`. Cette asymétrie n'est plus un bug — c'est explicitement câblée :

- FSRS travaille au grain template (1 carte FSRS par template par élève).
- Référentiel travaille au grain capacité (1 verdict par capacité par élève).
- Le badge capacité agrège **montée** : il dérive de l'état des N cartes FSRS taguant cette capacité.

### 2.4 — Le Référentiel n'écrit pas dans FSRS

Pas de pilotage descendant `Référentiel → FSRS`. Quand le Référentiel passe en `needs_remediation`, **il ne force pas** `next_review = NOW()`. Pas la peine : si l'élève a échoué, FSRS a déjà rapproché la prochaine review via son algo natif.

### 2.5 — Cohabitation `is_acquired` §6.1 / badges FSRS

Deux verdicts coexistent côté capacité, **avec des sémantiques différentes** :

- `is_acquired` (BO §6.1) — verdict pédagogique formel : "la capacité a été démontrée selon les critères BO". Utile pour LSU, bulletin, communication parent.
- Badge FSRS agrégé — verdict dynamique : "l'élève doit y retoucher maintenant / bientôt / pas urgent". Utile pour l'auto-pilotage de la révision.

Les deux peuvent diverger sans contradiction. Exemple : un élève peut être `is_acquired = true` ET avoir un badge "🔁 À renforcer" sur la même capacité (oubli en cours malgré le seuil BO atteint).

---

## 3. Schéma de données cible

### 3.1 — `skill_attempts` (refonte per-template famille A)

```sql
skill_attempts (
    id                UUID PRIMARY KEY,
    student_id        UUID NOT NULL,
    template_id       UUID,                   -- Famille A : la variation jouée
    skill_id          UUID,                   -- Famille B : l'observable
    task_id           UUID,                   -- Famille B : la tâche d'observation
    success           BOOLEAN,                -- Famille A : dérivé du grade ou validation auto
    grade             SMALLINT,               -- Famille A : 1-4 (NULL si Monde 1 sans info, ou conservé pour SRS)
    code              TEXT,                   -- Famille B : 'plus' | 'minus'
    source            TEXT NOT NULL,          -- 'auto' | 'srs' | 'teacher' | 'student_self'
    with_help         BOOLEAN NOT NULL DEFAULT FALSE,
    phase_blocage     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- CHECK XOR famille A / B
    CONSTRAINT chk_attempt_family_regime CHECK (
        -- Régime A : template_id NOT NULL, skill_id NULL, task_id NULL
        (template_id IS NOT NULL AND skill_id IS NULL AND task_id IS NULL
         AND success IS NOT NULL AND code IS NULL)
        OR
        -- Régime B : skill_id NOT NULL, task_id NOT NULL, template_id NULL
        (template_id IS NULL AND skill_id IS NOT NULL AND task_id IS NOT NULL
         AND success IS NULL AND code IS NOT NULL)
    ),

    CONSTRAINT chk_attempt_grade_range CHECK (
        grade IS NULL OR grade BETWEEN 1 AND 4
    ),

    CONSTRAINT chk_attempt_source CHECK (
        source IN ('auto', 'srs', 'teacher', 'student_self')
    ),

    CONSTRAINT chk_attempt_code CHECK (
        code IS NULL OR code IN ('plus', 'minus')
    )
);
```

**Changements clés vs aujourd'hui** :

- `template_id` devient le pivot famille A (était une simple FK, devient l'identifiant naturel).
- `skill_id` devient nullable (était NOT NULL) — utilisé uniquement par la famille B.
- Ajout colonne `grade SMALLINT NULL` — conserve la richesse FSRS.
- Ajout valeur `'srs'` dans `source`.
- 1 attempt famille A = **1 row** (au lieu de N rows = nb skills tagués).

**Mapping grade ↔ success** (à appliquer côté application/trigger) :

- Monde 1 (validation auto) : `success=true → grade=3 (Good)` ; `success=false → grade=1 (Again)`.
- Monde 2 (self-grade SRS) : `success = (grade >= 2)`. Hard reste considéré comme succès car la réponse était correcte.

**Indexes** :

- `(student_id, template_id, created_at DESC)` — Famille A : pour FSRS recompute et Référentiel join
- `(student_id, skill_id, created_at DESC)` — Famille B : conservé
- `(template_id, created_at DESC)` — analytics
- `(created_at DESC)` — purge / archivage

### 3.2 — `srs_card_stats` (FSRS, inchangé sauf déclencheur d'écriture)

Schéma conservé tel quel (cf. `migration 080_create_srs_tables.sql:95-145`) :

- `UNIQUE(user_id, card_reference_type, card_reference_id)` → partage global entre tous les decks.
- Colonnes FSRS-6 : `difficulty`, `stability`, `state`, `last_review`, `next_review`, `total_reviews`, `review_history` JSONB.

**Changement** : `srs_card_stats` n'est **plus écrit directement** par `/api/srs/review/submit`. Il est écrit par le trigger `skill_attempts_after_insert` pour les rows famille A (peu importe le `source`).

Conséquence directe : un attempt Monde 1 (quiz interactif) **alimente FSRS** au même titre qu'un attempt Monde 2 (SRS review). C'est ce qui permet au deck Programme de se peupler automatiquement.

### 3.3 — `student_skill_state_a` (Référentiel famille A, étendu)

Schéma actuel conservé (`is_acquired`, `total_successes`, `distinct_template_successes`, `last_success_at`, `last_attempt_at`, `needs_remediation`). Pas d'ajout de colonnes FSRS ici — la décision est que **FSRS reste au grain template** dans `srs_card_stats` et les badges capacité sont **calculés à la lecture** par agrégation montante.

**Maintien des règles §6.1** : `is_acquired` calculé par règle BO ; `needs_remediation` calculé par fenêtre récente. Inchangé.

**VIEW `student_skill_state_a_v`** : le flag `to_review` (basé sur le seuil 30j) **disparaît**. Il est remplacé par le badge FSRS agrégé calculé à la lecture côté serveur ou côté requête.

### 3.4 — `srs_decks` (conservé + 1 deck spécial "Programme")

Schéma actuel conservé. Ajout :

- 1 deck `name = 'Programme'`, `deck_type = 'personal'`, `is_assigned = false` créé automatiquement par élève à la 1ʳᵉ interaction famille A.
- Marquage spécial via un flag `is_auto_managed BOOLEAN NOT NULL DEFAULT FALSE` (nouveau, pour éviter modification manuelle des cartes par l'élève).
- Le deck Programme n'a **pas** de sous-sections manuelles. Il affiche les sections automatiques calculées à la lecture.

### 3.5 — `srs_cards` (conservé + lien optionnel vers section)

Schéma actuel conservé. Ajout :

- Colonne `section_id UUID NULL` FK vers `srs_deck_sections.id` (sous-section manuelle dans un deck personnel).
- Dans le deck Programme : `section_id` reste toujours NULL (sections automatiques).
- Dans un deck personnel ou official : `section_id` optionnel, l'élève / prof range les cartes par section.

### 3.6 — `srs_deck_sections` (NOUVEAU, pour decks manuels)

```sql
srs_deck_sections (
    id              UUID PRIMARY KEY,
    deck_id         UUID NOT NULL REFERENCES srs_decks(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_deck_section_name UNIQUE (deck_id, name)
);
```

Indexes : `(deck_id, display_order)`.

RLS : alignée avec `srs_decks` (un user gère les sections de ses propres decks non assignés).

### 3.7 — Famille B (rappel : indépendante)

Tables conservées **strictement à l'identique** :

- `student_observable_state` — règle §6.1bis (count_plus / count_minus / is_acquis)
- `student_competence_level` — règles §6.4 + 6 fonctions `compute_<competence>_level`
- `evaluation_tasks` + `evaluation_task_perimeter`

Les attempts famille B continuent à passer par le régime `skill_id + task_id + code` dans `skill_attempts`. Le trigger `skill_attempts_after_insert` route vers `update_student_observable_state` comme aujourd'hui.

Pas de FSRS, pas de SRS, pas de deck Programme côté famille B.

---

## 4. Flux d'écriture

### 4.1 — Monde 1 : élève répond à une question interactive

```
┌─────────────────────────────────────────────────────────────┐
│ FlashCard.svelte (mode interactif)                          │
│   validateAnswer() → isCorrect                              │
│   trackSkillAttempt(template_id, success=isCorrect)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/skill-attempts
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/skill-attempts (refactoré)                             │
│   1. Vérifie l'existence du template_id                     │
│   2. Insère 1 row dans skill_attempts :                     │
│        template_id, success, grade (3 si succès, 1 sinon),  │
│        source='auto'                                        │
│   (PAS de boucle sur les skills tagués — c'est le trigger   │
│    qui le fera côté Référentiel)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ trigger AFTER INSERT
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ skill_attempts_after_insert() (refactoré)                   │
│   IF NEW.template_id IS NOT NULL THEN                       │
│     -- Famille A                                            │
│     a) Boucle sur question_template_skills :                │
│        FOR v_skill_id : update_student_skill_state_a()      │
│     b) FSRS update sur (NEW.student_id, NEW.template_id) :  │
│        - upsert srs_card_stats                              │
│        - calcul FSRS via reviewCard(grade)                  │
│     c) Auto-ajout au deck Programme si template tagué :     │
│        - crée srs_cards si pas déjà présent                 │
│   ELSIF NEW.skill_id IS NOT NULL THEN                       │
│     -- Famille B (inchangé)                                 │
│     update_student_observable_state()                       │
│   END IF                                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 — Monde 2 : élève fait une review SRS

```
┌─────────────────────────────────────────────────────────────┐
│ ReviewSession.svelte (mode non-interactif)                  │
│   Display question (front) → flip → display answer (back)   │
│   FSRSButtons → grade ∈ {1, 2, 3, 4}                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/srs/review/submit
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/srs/review/submit (refactoré)                          │
│   1. Vérifie carte / deck / ownership                       │
│   2. Détermine cardReferenceType + cardReferenceId          │
│   3. SI template-based :                                    │
│      Insère 1 row dans skill_attempts :                     │
│        template_id, grade, success=(grade>=2),              │
│        source='srs'                                         │
│      → trigger fait le reste (Référentiel + FSRS + ajout    │
│        Programme s'il faut).                                │
│   4. SI custom-based (front/back libre) :                   │
│      Pas de skill_attempts (pas de template).               │
│      Met à jour srs_card_stats directement                  │
│      (cardReferenceType='custom').                          │
└─────────────────────────────────────────────────────────────┘
```

⚠️ La carte custom (`CustomFlashCard.svelte`) reste un chemin parallèle qui n'alimente pas `skill_attempts`. C'est cohérent : elle n'est pas liée à une capacité du référentiel, c'est juste de la révision libre.

### 4.3 — Cas particulier : template non tagué

Élève répond à un template qui n'a aucune ligne dans `question_template_skills` (cycle 4, lycée, ou template pédagogique libre) :

- ✅ Row `skill_attempts` créée (même schéma : template_id, success, grade, source).
- ✅ Trigger fire, boucle sur skills tagués → **0 itération**, aucun `student_skill_state_a` mis à jour (silencieux).
- ✅ Trigger met à jour `srs_card_stats` (FSRS suit l'attempt sur ce template).
- ❌ **Pas** d'auto-ajout au deck Programme (réservé aux templates tagués).
- L'élève voit l'état FSRS de cette carte uniquement s'il la met manuellement dans un deck personnel.

C'est la cohabitation propre : suivi FSRS pour tout, visibilité Programme uniquement pour les tagués.

### 4.4 — Famille B : prof saisit une observation

Inchangé. Le trigger route vers `update_student_observable_state` (cf. migration 1.2 actuelle).

---

## 5. Flux de lecture

### 5.1 — Page `/dashboard/student/objectifs/[id]` : badge capacité

Pour chaque capacité d'un objectif, on calcule **deux** verdicts indépendants :

1. **Verdict BO formel** (`is_acquired`) — lu depuis `student_skill_state_a.is_acquired`. Inchangé.
2. **Badge dynamique FSRS-agrégé** — calculé à la lecture par requête joignant :

```sql
-- Pseudo-SQL pour calculer le badge agrégé sur une capacité
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
      WHEN EXISTS(SELECT 1 FROM fsrs_state_par_template
                   WHERE next_review <= NOW()
                     AND state IN ('learning', 'relearning'))
        THEN 'a_remedier'
      WHEN EXISTS(SELECT 1 FROM fsrs_state_par_template
                   WHERE next_review <= NOW()
                     AND state = 'review')
        THEN 'a_renforcer'
      WHEN EXISTS(SELECT 1 FROM fsrs_state_par_template
                   WHERE next_review > NOW()
                     AND state = 'review')
        THEN 'acquise_en_memoire'
      WHEN EXISTS(SELECT 1 FROM fsrs_state_par_template
                   WHERE next_review > NOW()
                     AND state IN ('learning', 'relearning'))
        THEN 'en_apprentissage'
      ELSE 'non_commencee'  -- pas affichée selon décision §6
    END AS badge_fsrs;
```

UI affiche **les deux** :

- Le verdict BO (✅ acquise / 🚧 en cours / ◯ non commencée) — sur fond clair, formel.
- Le badge FSRS — sur fond chaud, dynamique (🆘 / 🔁 / ✅ / ⏳).

Cohabitation : un élève peut avoir "✅ Acquise BO" + "🔁 À renforcer FSRS" — c'est lisible et pédagogiquement riche.

### 5.2 — Page `/dashboard/revisions/decks/programme` : sections automatiques

```
Programme (auto-géré)                                Total : 23 cartes
═══════════════════════════════════════════════════════════════════
🆘 À remédier (3)                              [ Lancer session ]
   ┌─────────────────────────────────────────────────────────────┐
   │ Addition de fractions                              il y a 2j│
   │ Capacité : Fractions — rang 4                               │
   │ FSRS : relearning, due maintenant                           │
   ├─────────────────────────────────────────────────────────────┤
   │ ...                                                         │
   └─────────────────────────────────────────────────────────────┘

🔁 À renforcer (5)                             [ Lancer session ]
   ...

⏳ En apprentissage (4)
   (pas due — programmées pour plus tard)

✅ Acquise en mémoire (11)
   (FSRS dort dessus — prochaine review dans 14-90 jours)
```

Le clic sur "Lancer session" pour une section appelle `/api/srs/review/due` avec un filtre `state IN (...)`. Au moment de la review, le template est tiré, une instance générée (`generateSRSInstance`), FlashCard non-interactif, self-grade.

### 5.3 — Page deck personnel : sections manuelles

```
Mon deck "Géométrie 6ᵉ" (personnel)                  Total : 12 cartes
═══════════════════════════════════════════════════════════════════
Section "Symétries" (4 cartes)
   ┌─────────────────────────────────────────────────────────────┐
   │ Reconnaître une symétrie axiale          ⏳ apprentissage   │
   │ Tracer une symétrie centrale             🆘 à remédier       │
   │ ...                                                         │
   └─────────────────────────────────────────────────────────────┘

Section "Triangles" (5 cartes)
   ...

Non rangées (3 cartes)
   ...

[ + Nouvelle section ]
```

Les **badges FSRS** sont affichés par carte (info utile à l'élève), mais l'organisation principale du deck est **par section manuelle** (pas de sections auto en plus).

### 5.4 — Tableau de bord élève (page d'accueil)

Trois compteurs prioritaires (tous calculés depuis FSRS) :

- 🆘 N cartes à remédier (toutes capacités confondues)
- 🔁 N cartes à renforcer
- Total cartes dues aujourd'hui

Clic → page Programme avec section ouverte.

Les capacités jamais commencées ne sont **pas** affichées (cf. décision validée).

---

## 6. Cycle de vie d'une carte (point de vue FSRS)

```
   Premier attempt en Monde 1 (élève répond à un quiz)
      │
      │ Succès (grade=3)           Échec (grade=1)
      ▼                             ▼
   ┌──────────┐                  ┌──────────┐
   │ learning │                  │ learning │
   └────┬─────┘                  └────┬─────┘
        │ self-grade Good                │ self-grade Again
        ▼                                ▼
   ┌──────────┐                  ┌──────────┐
   │  review  │                  │relearning│
   └────┬─────┘                  └────┬─────┘
        │ stability croît                │ self-grade Good
        ▼                                ▼
   next_review +14j, +30j, ...      ┌──────────┐
                                    │  review  │
                                    └──────────┘
```

État `new` n'est jamais persisté dans la nouvelle archi (la 1ʳᵉ interaction crée déjà une review → l'état initial est `learning`).

---

## 7. Migration depuis l'existant

### 7.1 — Migration des données

- `skill_attempts` actuels (3 lignes potentielles dans les seeds, peu en prod) : **conservés tels quels**. Les rows avec `skill_id NOT NULL AND template_id IS NOT NULL` (régime A actuel) sont **dupliquées** vers le nouveau régime per-template — dedup par `(student_id, template_id, created_at)`. Les rows famille B inchangées.
- `srs_card_stats` actuels : **conservés tels quels**. Pas de migration nécessaire car le schéma ne change pas.
- `srs_decks` : auto-création du deck Programme pour chaque élève actif (script idempotent à passer).
- `srs_cards` : auto-ajout des templates déjà rencontrés (basé sur l'union de `skill_attempts.template_id` historiques) au deck Programme de chaque élève.

### 7.2 — Migration du code

- `/api/skill-attempts` : enlever la boucle "1 row par skill tagué", remplacer par 1 row per-template.
- `/api/srs/review/submit` : insérer aussi `skill_attempts` (en plus de la mise à jour `srs_card_stats`).
- `skill_attempts_after_insert` (trigger PG) : routage refondu (cf. §4.1).
- `student_skill_state_a_v` (VIEW) : retirer la colonne `to_review` (remplacée par badge FSRS calculé à la lecture).
- Composants UI :
  - `FlashCard.svelte` : conserver `trackSkillAttempt` en mode interactif.
  - `ReviewSession.svelte` : ajouter l'écriture `skill_attempts` côté submit (déjà dans /api/srs/review/submit).
  - Page `/dashboard/revisions/decks/programme` : nouvelle vue avec sections automatiques.
  - Page deck personnel : nouvelle UI sections manuelles + CRUD `srs_deck_sections`.
  - Page objectifs : ajouter badge FSRS dynamique à côté du verdict BO.

### 7.3 — Compatibilité ascendante

- L'élève qui avait des decks personnels avec cartes manuelles → **conservés**, juste l'ajout du nouveau champ `section_id` (par défaut NULL = non rangées).
- Cartes custom (`CustomFlashCard`) → **conservées telles quelles** dans le sous-système parallèle. Aucune liaison Référentiel.
- Decks officiels assignés par le prof → **conservés**, copie au moment de l'assignation comme aujourd'hui.

---

## 8. Risques et points d'attention

### 8.1 — Performance du trigger

À chaque INSERT dans `skill_attempts`, le trigger fait :

- Famille A : 1 lookup `question_template_skills` + N updates `student_skill_state_a` + 1 update `srs_card_stats` (calcul FSRS) + éventuel INSERT `srs_cards`.
- Estimation : <50ms par INSERT pour des templates taguant 1-3 skills. Acceptable.

Si la fréquence devient trop élevée (un élève qui fait 100 questions/h), batch possible côté `/api/skill-attempts` (insertion groupée). Pas prioritaire V1.

### 8.2 — Calcul FSRS dans un trigger PG ?

L'algo FSRS est aujourd'hui en TypeScript (`src/lib/srs/fsrs.ts`). Le porter en PL/pgSQL est non trivial (formules avec exponentielles, 21 paramètres).

**Décision pragmatique** : le trigger PG ne calcule pas FSRS lui-même. Il déclenche un **side-effect côté application** :

- Option A : le trigger NOTIFY → un worker side-effect met à jour `srs_card_stats`. Complexité supplémentaire.
- Option B : `/api/skill-attempts` (et `/api/srs/review/submit`) appellent FSRS côté Node, puis font un seul UPDATE explicite sur `srs_card_stats` avant l'INSERT `skill_attempts`. Synchrone, simple.
- ✅ Recommandation : **Option B**. Le trigger PG ne s'occupe que du Référentiel famille A (recompute `student_skill_state_a`). FSRS est mis à jour côté API en TypeScript.

Conséquence : si quelqu'un INSERT dans `skill_attempts` en bypassant l'API (ex. service role script), FSRS ne sera pas mis à jour. C'est acceptable — c'est un cas exotique.

### 8.3 — Pool de templates tagués trop maigre

Aujourd'hui : 3 templates tagués sur ~72 capacités 6ᵉ. Sans extension du tagging, le deck Programme reste très clairsemé.

**Pré-requis hors-chantier** : étendre le tagging à 30-50 templates 6ᵉ avant que le deck Programme prenne du sens. C'est un travail pédagogique parallèle à cette refonte technique.

### 8.4 — Famille B non concernée

Aucun risque de régression famille B : la table `skill_attempts` est partagée mais le régime famille B (skill*id + task_id + code) est isolé par CHECK. Le trigger fait un routage simple. Les fonctions `update_student_observable_state` / `compute*\*\_level` sont inchangées.

### 8.5 — Cartes custom (front/back libre)

Hors Référentiel par construction. Pas de migration nécessaire. Restent dans le sous-système actuel `cardReferenceType='custom'`. À documenter explicitement dans la doc utilisateur que ces cartes ne contribuent à aucun badge.

### 8.6 — `is_acquired` versus badge FSRS : risque de confusion utilisateur

Les deux signaux affichés peuvent paraître contradictoires à l'élève novice ("acquis mais à renforcer ?"). À traiter en UX :

- Tooltip explicatif sur les badges.
- Hiérarchie visuelle : badge BO plus discret (état formel), badge FSRS plus actionnable (call to action).

---

## 9. Décomposition en lots

Effort total grossier : **2-3 semaines** (à raffiner par chaque lot).

| Lot | Tâche                                                                                                                                                  | Effort | Agent suggéré                    | Bloque |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------- | ------ |
| L1  | Migration SQL : refonte `skill_attempts` (per-template), nullable skill_id, colonne grade, source='srs', VIEW `student_skill_state_a_v` sans to_review | 1 j    | supabase-expert (Opus)           | L2..L8 |
| L2  | Refonte trigger `skill_attempts_after_insert` : routage famille A/B, boucle sur skills tagués                                                          | 0.5 j  | supabase-expert                  | L4     |
| L3  | Migration SQL : table `srs_deck_sections`, colonne `srs_cards.section_id`, flag `srs_decks.is_auto_managed`                                            | 0.5 j  | supabase-expert                  | L7     |
| L4  | Refonte `/api/skill-attempts` : 1 row per-template + appel FSRS pour update `srs_card_stats` + auto-ajout deck Programme                               | 1 j    | backend-developer                | L5, L6 |
| L5  | Refonte `/api/srs/review/submit` : insertion `skill_attempts` + appel FSRS + source='srs'                                                              | 0.5 j  | backend-developer                | L6     |
| L6  | Auto-création deck Programme à la 1ʳᵉ interaction famille A (côté API ou trigger)                                                                      | 0.5 j  | backend-developer                | L7     |
| L7  | UI page Programme : sections automatiques calculées à la lecture                                                                                       | 1.5 j  | frontend-developer               | L9     |
| L8  | UI deck personnel : CRUD sections manuelles + UI drag&drop optionnel                                                                                   | 1 j    | frontend-developer               | L9     |
| L9  | UI page objectif : badge FSRS dynamique à côté du verdict BO                                                                                           | 1 j    | frontend-developer               | —      |
| L10 | Mise à jour types TS (`SkillSource`, `Section`, `BadgeFsrs`), helpers, validation Zod                                                                  | 0.5 j  | typescript-expert                | L4-L9  |
| L11 | Migration de données : auto-création Programme + auto-ajout templates rencontrés pour chaque élève                                                     | 0.5 j  | supabase-expert                  | —      |
| L12 | Tests : nouveau régime per-template (Famille A + B), trigger, agrégation FSRS, sections manuelles                                                      | 1.5 j  | test-automator                   | —      |
| L13 | Documentation : schéma DB, README architecture, doc utilisateur badges                                                                                 | 0.5 j  | documentation-writer             | —      |
| L14 | Code review + security audit                                                                                                                           | 0.5 j  | code-reviewer + security-auditor | —      |

Total : **~11 jours-équivalent**, raisonnablement parallélisable à 2-3 agents → **~5-7 jours calendaires**.

---

## 10. Questions encore ouvertes (à trancher avant L1)

1. **Préférence élève "désactiver auto-ajout Programme"** : on autorise un toggle utilisateur ou c'est imposé ?
2. **Suppression manuelle d'une carte du Programme** : autorisée ? Si oui, comment éviter qu'elle revienne à la prochaine interaction ? (flag d'exclusion par élève×template ?)
3. **Stats d'un même template partagées entre 2 decks personnels** : conséquence acceptée (un élève qui veut "un deck froid + un deck chaud" sur le même template ne peut pas — un seul état FSRS par (user, template)). Confirmer.
4. **FSRS pour cartes custom** : actuellement OK (cardReferenceType='custom'). Conservé tel quel ?
5. **Politique de purge** des `srs_card_stats` pour cartes "Acquise en mémoire" depuis > 1 an → conserver ou archiver ?
6. **VIEW de compatibilité ascendante** : faut-il créer `student_skill_state_a_v_compat` qui simule l'ancien `to_review` pendant la phase de transition ?
7. **Prof : intervention sur le deck Programme d'un élève** : peut-il ajouter des templates ? Le marquer "ne plus réviser cette capacité, j'estime acquise" ?
8. **Initialisation FSRS sur attempts historiques** : à la migration L11, rejoue-t-on les `skill_attempts` historiques pour reconstruire `srs_card_stats` ? Ou démarrage à froid ?

---

## 11. Décisions actées (récap final)

Liste des décisions validées en conversation 2026-06-09 / 2026-06-10 :

- ✅ `skill_attempts` devient la source unique des faits, écrite par les 2 mondes.
- ✅ Refonte per-template (1 row par attempt indifféremment du tagging).
- ✅ Famille A : ajout colonne `grade SMALLINT NULL` + valeur `source='srs'`.
- ✅ FSRS reste au grain template ; pilote tout le timing de révision (zéro seuil arbitraire).
- ✅ Badges capacité = agrégation montante des états FSRS des templates tagueurs.
- ✅ `is_acquired` §6.1 conservé — cohabite avec les badges FSRS (verdict BO formel pour LSU).
- ✅ Mapping Monde 1 : success=true → grade=3 ; success=false → grade=1.
- ✅ Mapping SRS → success : success = grade >= 2 (Mapping B).
- ✅ Deck Programme auto-géré, contient **uniquement** les templates tagués famille A.
- ✅ Sections automatiques UNIQUEMENT dans le deck Programme.
- ✅ Sections manuelles disponibles dans les decks personnels (nouvelle table `srs_deck_sections`).
- ✅ `srs_card_stats` partagés entre tous les decks contenant le même template (UNIQUE user×template).
- ✅ Templates non tagués : suivis par FSRS (srs_card_stats), invisibles du deck Programme.
- ✅ Capacités jamais commencées : pas affichées sur le dashboard.
- ✅ Famille B : totalement indépendante (pas de FSRS/SRS, règles §6.1bis + §6.4 conservées).
- ✅ Decks existants conservés en parallèle (personnel, official assigné, custom).
- ✅ Casser l'existant SRS est acceptable si la cible est plus propre.

---

## 12. Hors-scope explicite (V2+)

- Famille B intégrée au SRS — non, par construction.
- Notification push à l'élève quand une carte devient à remédier — V2.
- Algorithme alternatif (SM-17, FSRS-v7) — V2+.
- Synchronisation cross-device des stats FSRS — déjà géré par le backend Supabase, rien à faire.
- Statistiques avancées pour le prof (heatmap, courbes) sur la base des nouvelles données — V2.
- Export Anki / import depuis Anki — V3+.

---

## 13. Références

- Étude initiale obsolète : `docs/wip/srs-auto-from-skills-study.md` (à archiver après livraison).
- Spec compétences : `docs/wip/skills-referentiel-design.md`.
- Schéma actuel : `supabase/migrations/080_create_srs_tables.sql`, `20260609120000_competence_referentiel_schema.sql`, `20260609120001_competence_referentiel_functions.sql`.
- Algo FSRS : `src/lib/srs/fsrs.ts`, `src/lib/srs/config.ts`.
- Types : `src/lib/srs/types.ts`, `src/lib/types/skills.ts`.
- Composants : `src/lib/components/srs/`, `src/lib/components/questions/FlashCard.svelte`.
