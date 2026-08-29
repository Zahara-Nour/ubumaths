# Refonte du référentiel — Spec Phase 0 (TDD)

> **Statut** : Phase 0 **VALIDÉE par David le 2026-08-29** (Q1 à Q4 tranchées, Q5 en attente du PDF). Phase 1 en cours sur la branche `feat/refonte-referentiel`.
> **Créé le** : 2026-08-28
> **Objet** : fusionner les deux référentiels de contenus rivaux en un seul arbre par niveau, laisser les compétences transversales intactes, et cibler la **1ʳᵉ spécialité mathématiques** comme premier niveau rempli.

---

## 1. Pourquoi

Aujourd'hui les contenus à travailler/évaluer sont décrits par **deux arbres parallèles sans lien**, plus un troisième jeu d'étiquettes libres :

|                      | Arbre « programme »                   | Arbre « évaluation » famille A                      |
| -------------------- | ------------------------------------- | --------------------------------------------------- |
| Tables               | `curriculum_themes / items / points`  | `skill_themes / skill_objectives / skills`          |
| Grain                | Thème → Item → **Point**              | Thème → Objectif → **Capacité**                     |
| Cardinalité niveau 3 | libre                                 | **exactement 4, ordonnées**                         |
| Axe de typage        | `kind` = connaissance \| savoir_faire | `knowledge_type` = automatisme \| capacite_attendue |
| Sert à               | couverture classe (prof)              | acquisition (élève)                                 |
| Ressource taguable   | `exercises`                           | `question_templates`                                |
| Lien entre les deux  | **aucune FK**                         |                                                     |

Plus : `question_templates.theme / domain / subdomain / level` — étiquettes libres conservées « en cohabitation » par la décision 61 du design doc. Troisième système de classement.

**Cause racine** (documentée) : la décision 57 impose _exactement 4 capacités ordonnées par objectif_. Douze jours plus tard, le suivi du programme avait besoin d'un niveau 3 à cardinalité libre — famille A ne pouvait pas l'absorber. La spec suivi-programme acte alors « nouvelles tables, propre nomenclature », et le dictionnaire de noms du design doc (« termes bannis ») interdit de réutiliser objectif / capacité / observable. D'où deux arbres et deux vocabulaires.

**Conséquence fonctionnelle** : l'axe connaissance/savoir-faire est sur l'arbre qui n'évalue rien, l'axe opérationnel est sur l'arbre qui ne suit pas le programme. On ne peut pas répondre à « quelles connaissances mes élèves maîtrisent-ils ? ».

**Coût du statu quo** : il augmente chaque semaine d'usage. Aujourd'hui il est nul (cf. §3).

---

## 2. Décisions actées (David, 2026-08-28)

1. **Un seul arbre de contenus par niveau.** `curriculum_*` absorbe famille A ; `skill_themes` / `skill_objectives` disparaissent.
2. **`rang` devient facultatif** (`NULL` ou 1-4). C'est le geste qui débloque tout : l'échelle descriptive style référentiel 2016 reste possible là où on la veut, sans être imposée par le schéma.
3. **Les compétences (famille B) ne bougent pas structurellement.** Elles sont transversales, le découpage par niveau ne les concerne pas.
4. **Taguer l'atomique, dériver les conteneurs.** On tague exercice / template de question / exercice Python / document ; la couverture d'une fiche, d'un chapitre ou d'une évaluation est **calculée** comme l'union de son contenu. Jamais stockée.
5. **Jonctions distinctes par type de ressource**, pas de polymorphisme manuel — cohérent avec la décision 71 (`evaluation_tasks` → 3 FK nullables plutôt que `source_type` + `source_ref`).
6. **Premier niveau ciblé : `1_SPE`** (1ʳᵉ spécialité mathématiques). Pas de collège cette année.
7. **Le contenu 6ᵉ n'est pas migré.** Il reste dans les markdown (source de vérité) et sera réintégré si une 6ᵉ revient. Voir §3.

**Complément validé le 2026-08-29 :**

8. **`curriculum_items` → `curriculum_objectives`**, et `curriculum_points.item_id` → `objective_id`. « Objectif » est le mot que voit l'élève ; la collision de vocabulaire qui avait imposé « Item » disparaît avec famille A.
9. **`kind` passe à 3 valeurs** : `connaissance` · `savoir_faire` · **`demonstration`**. Le BO lycée liste explicitement les démonstrations exigibles par chapitre, et l'élève doit pouvoir répondre à « qu'est-ce que je dois savoir démontrer ? ». Les trois valeurs collent aux trois rubriques du BO (Contenus / Capacités attendues / Démonstrations).
10. **Nouveau champ `exigence`** : `attendu` · `approfondissement`, défaut `attendu`. Sépare ce qui est au programme du DS de ce qui va au-delà, et évite qu'un approfondissement pèse comme un attendu dans le pourcentage de couverture.
11. **Les sections transversales du programme lycée** (algorithmique et programmation ; vocabulaire ensembliste et logique) sont des **thèmes à part entière** de l'arbre, pas un mécanisme transversal dédié. Elles deviennent ainsi taguables et suivies comme le reste.

---

## 3. Ce qu'on perd — inventaire vérifié en prod (2026-08-28)

| Objet                                                        | Lignes en base | Lignes d'usage |
| ------------------------------------------------------------ | -------------- | -------------- |
| Famille A — 6 thèmes / 18 objectifs / 72 capacités           | 96             | **0**          |
| Famille B — 6 compétences / 22 sous-dim / 56 observables     | 84             | **0**          |
| Programme 6ᵉ — 6 thèmes / 20 items / 95 points               | 121            | **0**          |
| `question_template_skills`                                   | 0              | 0              |
| `exercise_curriculum_points`                                 | 0              | 0              |
| `skill_attempts`, `evaluation_tasks`, `journal_entry_points` | 0              | 0              |
| Caches `student_*`                                           | 0              | 0              |

**Le contenu n'est pas en base, il est en markdown.** Les seeds famille A + B sont générés par `scripts/generate-competence-seeds.ts` depuis `6e-savoirs.md` et `college-competences.md` ; le seed programme documente `6e-programme-curriculum.md` comme source de vérité. Repartir propre coûte **un re-seed, pas une re-rédaction**.

Donnée réelle non concernée : `student_exercise_mastery` (117 lignes, 16 élèves) est indexée sur `exercise_id`, aucun lien avec les référentiels.

---

## 4. Schéma cible

### 4.1 Arbre des contenus (par niveau)

```
curriculum_themes          grade ∈ GRADE_CODES · name · display_order
  └─ curriculum_objectives   theme_id · name · display_order        ← vu par l'élève   (ex-curriculum_items)
       └─ curriculum_points    objective_id · name · display_order   (ex-item_id)
            · kind            'connaissance' | 'savoir_faire' | 'demonstration'   NOT NULL   (était nullable, 2 valeurs)
            · knowledge_type  'automatisme' | 'capacite_attendue'    NOT NULL DEFAULT 'capacite_attendue'   (repris de skills)
            · exigence        'attendu' | 'approfondissement'        NOT NULL DEFAULT 'attendu'             (nouveau)
            · rang            smallint NULL CHECK (rang BETWEEN 1 AND 4)          (repris de skills.display_order famille A)
            · archived_at     timestamptz NULL                                    (existe déjà)
```

- `UNIQUE (objective_id, rang) WHERE rang IS NOT NULL` — deux points d'un même objectif ne peuvent pas partager un rang.
- Un objectif dont les points sont tous rangés 1-4 s'affiche en tableau 4 colonnes (modèle 2016). Un objectif à points non rangés s'affiche en liste. **Même schéma, deux rendus.**
- `kind` devient obligatoire : c'est ce qui garantit que « la liste des connaissances de 1ʳᵉ spé » est toujours complète.
- `kind` et `knowledge_type` sont **orthogonaux** et le restent : le premier dit ce que c'est (lecture élève), le second comment on le valide (algorithme §6.1 du design doc). Un savoir-faire peut être un automatisme ou une capacité attendue.

Le CHECK `curriculum_themes_valid_grade` accepte déjà `1_SPE` — aucune migration nécessaire de ce côté.

### 4.2 Compétences (inchangées, nettoyées)

`skills` ne contient plus que des observables une fois famille A partie. Nettoyage mécanique :

- `skills` → renommée `observables`
- suppression de `family` (GENERATED), `objective_id`, `knowledge_type`, et du CHECK XOR `chk_skill_family` — tous sans objet
- `niveau_scolaire = 'college'` → portée par cycle, à trancher (cf. §8 Q3)

`math_competences`, `math_competence_subdimensions`, les 6 fonctions `compute_*_level`, la règle conjonctive et le cœur d'excellence : **strictement inchangés**.

### 4.3 Tentatives et caches

`skill_attempts` garde son double régime, avec deux FK distinctes au lieu d'une :

| Colonne                          | Régime contenus | Régime compétences |
| -------------------------------- | --------------- | ------------------ |
| `point_id` → `curriculum_points` | renseigné       | NULL               |
| `observable_id` → `observables`  | NULL            | renseigné          |
| `success` (bool)                 | renseigné       | NULL               |
| `code` (`'plus'`\|`'minus'`)     | NULL            | renseigné          |
| `template_id`                    | renseigné       | NULL               |
| `task_id`                        | NULL            | renseigné          |

CHECK XOR : `(point_id IS NOT NULL) <> (observable_id IS NOT NULL)`.

- `student_skill_state_a` → `student_point_state`, clé `(student_id, point_id)`, mêmes colonnes.
- `student_observable_state` / `student_competence_level` : FK `skill_id` → `observable_id`, sinon inchangés.

### 4.4 Jonctions de tagging

| Ressource                       | Table                        | Statut                              |
| ------------------------------- | ---------------------------- | ----------------------------------- |
| Exercice                        | `exercise_curriculum_points` | ✅ existe                           |
| Template de question            | `question_template_points`   | remplace `question_template_skills` |
| Séance de cahier de texte       | `journal_entry_points`       | ✅ existe                           |
| Exercice Python                 | `python_exercise_points`     | phase ultérieure                    |
| Document de cours               | `chapter_document_points`    | phase ultérieure                    |
| **Fiche, chapitre, évaluation** | —                            | **dérivés**, jamais stockés         |

### 4.5 Suppressions

**En phase 1 :**

- `skill_themes`, `skill_objectives` (et les 72 lignes famille A de `skills`)
- `docs/wip/referentiel/6e-competences.md` — brouillon du 30 mai commité le 26 août, périmé par `college-competences.md` (qui est la version seedée)

**⚠️ Reporté en phase 4 — correction du 2026-08-29 :**

`question_templates.theme / domain / subdomain / level` devait être supprimé en phase 1 comme « troisième système de classement ». **Mesure faite : 55 fichiers en dépendent**, et pas des périphériques — c'est la colonne vertébrale de la navigation d'automaths (parcours par catégorie), du panier, du constructeur d'évaluations, de l'outil de revue de migration, du navigateur de decks SRS et du CRUD des questions.

Les supprimer en phase 1 casserait automaths **sans rien pour le remplacer** : l'arbre des contenus est vide jusqu'à la phase 3, et les questions ne sont taguées qu'en phase 4. La suppression n'est donc possible qu'**après** la phase 4, quand la navigation pourra basculer sur Thème → Objectif → Point. Jusque-là, cohabitation assumée (comme le prévoyait la décision 61).

---

## 5. Phases

| #     | Contenu                                                 | Bloque quoi           | Ordre        |
| ----- | ------------------------------------------------------- | --------------------- | ------------ |
| **1** | Fusion du schéma + mise à jour du code dépendant        | tout le reste         | d'abord      |
| **2** | Réparation du câblage cassé                             | l'alimentation réelle | après 1      |
| **3** | Référentiel 1ʳᵉ spé (contenu markdown → seed)           | le remplissage        | // de 2      |
| **4** | Banque de questions (import des 633 + tagging 1ʳᵉ spé)  | l'acquisition auto    | après 1 et 3 |
| **5** | Devoirs typés dans le cahier de texte → « Mon travail » | —                     | après 2      |

Phases 2 et 3 sont indépendantes l'une de l'autre.

### Détail phase 2 — le câblage cassé (vérifié)

1. **`/api/tests/save` n'écrit aucune tentative.** Passer une évaluation ou un entraînement ne valide rien. Seule la révision SRS alimente le référentiel (via `FlashCard.svelte`, non utilisé par `TestInteractive`). **Correctif à plus fort levier de toute la refonte.**
2. **Lien « Mon travail » → évaluation en 404** : `href` pointe `/dashboard/student/assessments/<assessment_id>`, route inexistante ; le vrai point d'entrée est `/automaths/test?assignment=<assignment_id>&mode=interactive` — mauvaise route _et_ mauvais identifiant.
3. **Une fiche assignée ne quitte jamais « à faire »** : `student-inbox.ts` force `status: 'todo'` pour la source `worksheet` ; le comportement S4 de la spec inbox (`worksheet_instances.submitted_at`) n'a jamais été implémenté, la colonne n'existe pas.
4. **`student_exercise_mastery` invisible au prof** : 117 auto-évaluations réelles, aucune page enseignante ne lit la table.
5. **3 routes orphelines** (aucun lien entrant) : `teacher/classes/[classId]/analytics`, `teacher/assessments`, `teacher/competences/export`.
6. **RPC non branchées** : `get_teacher_assignment_stats`, `get_assignment_completion_stats`.

### Détail phase 3 — le contenu 1ʳᵉ spé

**Entrée requise de David** : le programme officiel (arrêté du 17 janvier 2019, BO spécial n°1 du 22 janvier 2019). Aucune source lycée n'est présente dans le repo — pour la 6ᵉ, le PDF du BO avait été fourni depuis `~/Downloads`. Même procédé attendu, sinon je rédige depuis ma connaissance du programme et **tout doit être relu**.

Corpus déjà disponible pour le tagging : **68 exercices** `1_SPE` en base, dont 63 déjà posés dans une fiche (Calcul 44, Géométrie 11, Fonctions 7, Suites 2, divers 4).

---

## 6. Comportements attendus — Phase 1 (TDD)

### 6.1 Arbre des contenus

- **Nominal** — créer un thème pour `1_SPE`, un objectif dessous, un point avec `kind='savoir_faire'` : les trois apparaissent dans l'arbre de la 1ʳᵉ spé, `display_order` en fin de liste.
- **Nominal** — un objectif dont les 4 points portent `rang` 1 à 4 est lisible comme une échelle descriptive ; un objectif dont les points ont `rang = NULL` est lisible comme une liste. Les deux coexistent dans le même thème.
- **Limite** — créer un 5ᵉ point avec `rang` déjà utilisé sous le même objectif → **409** (violation de l'unicité partielle).
- **Limite** — `rang` hors 1-4 → **400**.
- **Limite** — point sans `kind` → **400** (le champ est désormais obligatoire).
- **Limite** — supprimer un point déjà couvert par une séance → **archivage** (`archived_at`), pas de suppression dure.
- **Erreur** — grade hors `GRADE_CODES` → 400. Nom vide ou > 200 caractères → 400.
- **Sécurité** — seul `is_teacher_or_admin()` écrit ; élève en lecture seule.

### 6.2 Tentatives et état

- **Nominal** — répondre à une question taguée sur un point insère **une** tentative `point_id` + `success`, et le trigger recalcule `student_point_state` pour ce point.
- **Nominal** — la règle d'acquisition reste celle du design doc §6.1, sélectionnée par `knowledge_type` : `capacite_attendue` = ≥ 1 réussite sur ≥ 2 templates distincts **et** aucun échec dans les 3 dernières ; `automatisme` = ≥ 5 réussites **et** ≥ 3 sur les 5 dernières. Décroissance à 30 jours inchangée.
- **Nominal** — le niveau d'un objectif reste `max(rang des points acquis)` **quand les points sont rangés** ; quand ils ne le sont pas, l'objectif affiche `n acquis / m`.
- **Limite** — une tentative avec `point_id` **et** `observable_id` → rejetée par le CHECK XOR.
- **Limite** — une tentative sans ni l'un ni l'autre → rejetée.
- **Régression** — les 6 fonctions `compute_*_level` et la règle conjonctive famille B produisent **exactement les mêmes résultats qu'avant** sur le même jeu d'observables (test de non-régression sur les fixtures existantes).

### 6.3 Tagging

- **Nominal** — taguer un exercice avec 2 points, puis le référencer dans une séance : les 2 points passent en couverture `auto`. Comportement inchangé (`reconcileAutoCoverage`).
- **Nominal** — taguer un template de question avec un point : répondre à une instance de ce template alimente l'état de ce point.
- **Nominal** — la couverture d'une fiche est l'union des points de ses exercices, **calculée à la lecture**. Ajouter un exercice à la fiche change la couverture sans écriture.
- **Limite** — taguer avec un point archivé → 400.
- **Limite** — un exercice sans tag n'apporte aucune couverture (pas d'erreur).

### 6.4 Migration elle-même

- **Nominal** — après migration, `skill_themes` / `skill_objectives` n'existent plus, `observables` contient les 56 observables, `curriculum_points` contient les 95 points 6ᵉ avec `kind` renseigné et `rang = NULL`.
- **Limite** — la migration est **rejouable** (`db:reset` puis re-migrate donne le même état).
- **Régression** — les pages élève « Mes compétences math », la saisie famille B et l'export CSV compétences fonctionnent à l'identique.

---

## 7. Surface à migrer (relevé du 2026-08-28)

**Objets Postgres** — fonctions `update_student_skill_state_a`, `skill_attempts_after_insert` · trigger `trg_skill_attempts_after_insert` · VIEW `student_skill_state_a_v` · policies RLS sur `skill_themes` (2), `skill_objectives` (2), `skills` (2), `question_template_skills` (2), `student_skill_state_a` (3).

**Code applicatif** (hors `database.ts` régénéré et tests) :

- `src/lib/types/skills.ts`, `src/lib/types/database-helpers.ts`
- `src/lib/server/srs/capacity-badge.ts`, `src/lib/server/srs/programme-deck.ts`
- `src/lib/server/stats/class-knowledge.ts`
- `src/lib/server/anti-fraud/runner.ts`, `.../types.ts`
- `src/lib/server/validation/skill-attempts.ts`
- `src/lib/components/questions/FlashCard.svelte`
- `src/routes/api/skill-attempts/+server.ts`, `src/routes/api/srs/review/submit/+server.ts`, `src/routes/api/account/export/+server.ts`
- `src/routes/(protected)/dashboard/+page.server.ts`
- `.../student/objectifs/+page.server.ts` et `[id]/` (server + svelte)
- `.../teacher/classes/[classId]/analytics/+page.server.ts`
- `.../teacher/evaluation-tasks/[id]/saisie/+page.server.ts`
- `.../revisions/decks/programme/+page.server.ts`

**Tests** — `tests/helpers/competence-referentiel.helpers.ts`, `tests/integration/competence-referentiel.test.ts`, `tests/integration/skill-attempts-endpoint.test.ts`, `src/lib/server/srs/__tests__/capacity-badge.test.ts`, `src/lib/server/stats/__tests__/class-knowledge.test.ts`, `src/lib/server/anti-fraud/__tests__/runner.test.ts`, `src/routes/api/srs/__tests__/api-routes.test.ts`, `src/lib/components/teacher/analytics/__tests__/ClassCapacityGrid.svelte.test.ts`, `src/routes/api/account/export/__tests__/export.test.ts`.

---

## 7bis. Plan d'exécution de la migration (relevé exact, 2026-08-29)

Ordre imposé par les dépendances de clés étrangères.

**1 — Arbre des contenus**

- `curriculum_items` → `curriculum_objectives` ; contraintes `curriculum_items_name_not_blank`, `curriculum_items_theme_name_unique` et index `idx_curriculum_items_theme` renommés en cohérence.
- `curriculum_points.item_id` → `objective_id` ; `curriculum_points_item_name_unique` et `idx_curriculum_points_item` renommés.
- `curriculum_points_valid_kind` remplacée (3 valeurs) ; `kind` passe NOT NULL (les 95 lignes existantes sont toutes renseignées : 27 connaissance / 68 savoir_faire).
- Ajout `knowledge_type`, `exigence`, `rang` + leurs CHECK ; index unique partiel `(objective_id, rang) WHERE rang IS NOT NULL`.

**2 — `skills` → `observables`**

- Suppression des 72 lignes famille A **avant** de toucher aux colonnes (les FK `skill_attempts`, `question_template_skills`, `srs_anti_fraud_flags` sont en `ON DELETE RESTRICT` mais toutes ces tables sont vides).
- Drop `chk_skill_family`, `chk_skill_knowledge_rang`, `chk_skill_knowledge_type_values`, index `uq_skill_knowledge_rang_under_objective`, `idx_skills_objective_id`, `idx_skills_family`.
- Drop colonnes `objective_id`, `family`, `knowledge_type`, `niveau_scolaire` ; `subdimension_id` passe NOT NULL.
- Rename table + `skills_pkey`, `chk_skill_competence_code`, `uq_skill_competence_observable_code`, `idx_skills_subdimension_id`, et les 2 policies RLS.
- Drop `skill_themes`, `skill_objectives`.

**3 — Tentatives et caches**

- `skill_attempts` : `skill_id` → `observable_id` (FK repointée), ajout `point_id` → `curriculum_points`, `chk_attempt_family_regime` remplacée par le XOR `point_id`/`observable_id`, index `idx_skill_attempts_skill_time` et `idx_skill_attempts_student_skill_time` renommés.
- `student_skill_state_a` → `student_point_state` ; `skill_id` → `point_id`, FK repointée vers `curriculum_points` ; PK, 2 index et 3 policies renommés.
- `student_observable_state.skill_id` → `observable_id` (FK, PK, index).
- `srs_anti_fraud_flags.capacity_skill_id` → `capacity_point_id`, FK repointée.
- VIEW `student_skill_state_a_v` → `student_point_state_v`.

**4 — Jonction de tagging**

- `question_template_skills` → `question_template_points`, `skill_id` → `point_id`, FK repointée vers `curriculum_points`, PK + index + 2 policies renommés.

**5 — Fonctions PL/pgSQL — ⚠️ point de vigilance**

Onze fonctions référencent `skills`. Relevé de ce qu'elles contiennent :

| Fonction                                                                      | Réfère `family` / `knowledge_type` ? | Taille  | Traitement                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `update_student_skill_state_a`                                                | oui                                  | 4,0 ko  | **réécrite** → `update_student_point_state`, lit `curriculum_points.knowledge_type`, joint `question_template_points` |
| `skill_attempts_after_insert`                                                 | oui                                  | 0,8 ko  | **réécrite** — branche contenus sur `point_id`, branche compétences sur `observable_id`                               |
| `check_perimeter_skill_is_competence`                                         | oui                                  | 0,4 ko  | **supprimée** — tautologique une fois famille A partie (tout `observable` est une compétence)                         |
| `update_student_observable_state`                                             | oui (`family`)                       | 2,6 ko  | **réécrite** — le filtre `family = 'competence'` disparaît                                                            |
| `compute_chercher/calculer/raisonner/communiquer/modeliser/representer_level` | **non**                              | 21,5 ko | **substitution mécanique** `public.skills` → `public.observables`, aucune autre modification                          |
| `update_student_competence_level`                                             | **non**                              | 2,9 ko  | idem                                                                                                                  |

Les 7 dernières portent la règle conjonctive et les cœurs d'excellence — **leur logique ne doit pas être touchée**. Elles ne référencent ni `family`, ni `knowledge_type`, ni `niveau_scolaire` : le renommage de la table est la _seule_ raison de les rouvrir. Elles seront donc régénérées par **substitution textuelle depuis `pg_get_functiondef()`**, pas réécrites à la main, et couvertes par le test de non-régression du §6.2.

**6 — RLS** : les policies suivent automatiquement les renommages de table (elles sont attachées à l'OID), mais leurs _noms_ deviennent trompeurs → renommés en cohérence. Aucune règle d'accès modifiée.

---

## 8. Questions ouvertes (à trancher avant de coder)

| #   | Question                                                    | Décision                                                                                                                |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Q1  | Renommer `curriculum_items` → `curriculum_objectives` ?     | ✅ **Tranchée 2026-08-29 : oui.** 28 occurrences dans 9 fichiers + le dossier de route `api/teacher/curriculum/items/`. |
| Q2  | Que fait-on du contenu 6ᵉ famille A (72 capacités) ?        | ✅ **Tranchée : ne pas migrer.** Les markdown restent, réintégration si une 6ᵉ revient.                                 |
| Q3  | Portée des observables famille B : `'college'` aujourd'hui. | ✅ **Tranchée : supprimer la colonne `niveau_scolaire`.** Les 6 compétences valent de la 6ᵉ à la terminale.             |
| Q4  | Rythme de saisie famille B visé en 1ʳᵉ spé ?                | ✅ **Tranchée : 2-3 tâches d'évaluation par trimestre et par classe** (la consolidation demande ≥ 2 `+`).               |
| Q5  | Source du programme 1ʳᵉ spé (§5, phase 3).                  | ⏳ **En attente** — PDF officiel à fournir par David (arrêté du 17 janvier 2019). Ne bloque pas la phase 1.             |

---

## 9. Ce que je ne fais pas sans accord explicite

Conformément au workflow du projet : aucune migration poussée en prod, aucun commit, aucune PR, aucun merge sans validation. Chaque phase = une branche → PR → CI verte → merge après ton accord.
