# Refonte du référentiel — état du chantier

> **Branche** : `feat/refonte-referentiel` · **Rien n'est poussé, aucune PR, aucune migration appliquée en prod.** > **Dernière mise à jour** : 2026-08-29.
> Ce document est la trace écrite du chantier. Il remplace la spec Phase 0 initiale, dont les décisions sont reprises ci-dessous.

---

## 1. Pourquoi ce chantier

Les contenus à travailler/évaluer étaient décrits par **deux arbres parallèles sans aucune clé étrangère entre eux** :

|                      | Arbre « programme »                  | Arbre « évaluation » famille A             |
| -------------------- | ------------------------------------ | ------------------------------------------ |
| Tables               | `curriculum_themes / items / points` | `skill_themes / skill_objectives / skills` |
| Grain                | Thème → Item → **Point**             | Thème → Objectif → **Capacité**            |
| Cardinalité niveau 3 | libre                                | **exactement 4, ordonnées**                |
| Servait à            | couverture classe (prof)             | acquisition (élève)                        |
| Ressource taguable   | `exercises`                          | `question_templates`                       |

Plus un troisième jeu d'étiquettes libres (`question_templates.theme/domain/subdomain/level`).

**Cause racine** : la décision 57 du design doc imposait « exactement 4 capacités ordonnées par objectif ». Douze jours plus tard, le suivi du programme avait besoin d'un niveau 3 à cardinalité libre ; famille A ne pouvait pas l'absorber ; d'où un second arbre, avec un vocabulaire neuf parce que le dictionnaire des « termes bannis » interdisait de réutiliser objectif/capacité/observable. Le vocabulaire divergent était un **symptôme**, pas la cause.

**Coût de la fusion au moment où elle a été faite : nul.** Les trois arbres totalisaient ~300 lignes seedées et **zéro ligne d'usage**.

---

## 2. Décisions structurantes (actées par David)

1. **Un seul arbre de contenus par niveau.** `curriculum_*` absorbe famille A.
2. **`rang` facultatif** (NULL ou 1-4) — geste central : l'échelle descriptive style référentiel 2016 reste possible sans être imposée par le schéma.
3. **Famille B (6 compétences math) intacte** — transversale, pas de découpage par niveau. `skills` → `observables`.
4. **Taguer l'atomique, dériver les conteneurs** — exercice / template / exo Python / document tagués ; fiche, chapitre, évaluation = union **calculée**.
5. **Jonctions distinctes par type de ressource** (cohérent décision 71, pas de polymorphisme manuel).
6. **Pas de collège en 2026-27** → premier niveau rempli = **`1_SPE`**.
7. **Contenu 6ᵉ famille A non migré** — reste dans `docs/wip/referentiel/6e-savoirs.md`.
8. `curriculum_items` → `curriculum_objectives` (+ `item_id` → `objective_id`).
9. **`kind` à 3 valeurs** : `connaissance` · `savoir_faire` · `demonstration` — les trois rubriques du BO lycée.
10. **`exigence`** : `attendu` · `approfondissement`.
11. **Séparation `regime_acquisition` / listes d'automatismes** (cf. §5) — un champ confondait _comment on mesure_ et _d'où vient le point_.
12. **Pas de thème « Automatismes »** dans l'arbre de 1ʳᵉ : ses points sont des acquis des années antérieures. Ils vivront dans l'arbre du niveau où ils sont introduits, reliés par `curriculum_point_automatismes`.

---

## 3. Schéma cible (atteint)

```
curriculum_themes          grade · name · code · display_order
  └─ curriculum_objectives   theme_id · name · description · display_order
       └─ curriculum_points    objective_id · name · display_order
            · kind               'connaissance' | 'savoir_faire' | 'demonstration'   NOT NULL
            · regime_acquisition 'fluence' | 'diversite'      NOT NULL DEFAULT 'diversite'
            · exigence           'attendu' | 'approfondissement'  NOT NULL DEFAULT 'attendu'
            · rang               smallint NULL  (1-4, UNIQUE par objectif)
            · archived_at        timestamptz NULL

curriculum_point_automatismes   point_id · grade      (liste d'automatismes d'un programme)
question_template_points        template_id · point_id  (ex-question_template_skills)
exercise_curriculum_points      exercise_id · point_id
journal_entry_points            entry_id · point_id · source

observables (ex-`skills`)     subdimension_id · observable_code · name · teacher_grid_text
skill_attempts                point via template_id (régime contenus) | observable_id (compétences)
student_point_state           (ex-student_skill_state_a)
```

**Supprimées** : `skill_themes`, `skill_objectives`, `curriculum_items`, `question_template_skills`, `student_skill_state_a`, `skills` (renommée).

**Lecture publique authentifiée** ajoutée sur l'arbre : il porte désormais l'acquisition élève, sans quoi « Mes objectifs » serait vide.

---

## 4. Ce qui est commité

| Commit      | Contenu                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| `6d5b79657` | **Phase 1** — fusion des deux arbres (45 fichiers)                                      |
| `bccb1f87a` | **Phase 2a** — rebranchement de 4 fils cassés (6 fichiers)                              |
| `fead34fd8` | **Phase 2b** — auto-évaluation visible au prof + complétion d'assignation (11 fichiers) |
| `21932c4ad` | **Phase 3** — seed 1ʳᵉ spé (7 fichiers)                                                 |

### Phase 2 — les fils qui étaient débranchés

1. **`/api/tests/save` n'écrivait aucune tentative** : répondre à une évaluation ou à un entraînement ne validait **aucun** point ; seule la révision SRS alimentait le référentiel. Correctif à plus fort levier de tout le chantier.
2. **Lien « Mon travail » → évaluation en 404** : route inexistante _et_ mauvais identifiant (évaluation au lieu d'assignation).
3. **Une fiche ne quittait jamais « à faire »** : la détection prévue (`worksheet_instances.submitted_at`) n'avait jamais été implémentée, la colonne n'existe pas. Désormais : une fiche est « faite » quand l'élève a auto-évalué **tous** ses exercices (`student_exercise_mastery`). Choix sémantique assumé — les fiches sont view-only, c'est le seul signal disponible.
4. **Trois routes livrées sans lien entrant** : « Évaluations en ligne » au menu prof, bouton « Acquisition » sur chaque carte de classe, « Exporter les compétences » dans l'en-tête de la page analytics.
5. **Page d'avancement d'une fiche** (nouvelle) : `worksheets/[id]/assignments/[assignmentId]/progress`. Rend visible au prof l'auto-évaluation des élèves — 117 marquages réels que **aucune page enseignante ne lisait**. Périmètre = classe ciblée ∪ élèves assignés individuellement.
6. **`get_assignment_completion_stats`** existait en base sans aucun appelant : wrapper ajouté + affichage terminés/ouverts par assignation.

### Bugs pré-existants corrigés en chemin

- `class-knowledge.ts` filtrait `skills.niveau_scolaire = classes.grade`, soit `'6e'` comparé à `'6'` : **le filtre ne matchait jamais**.
- `class-knowledge.ts`, `class-competence.ts` et le loader analytics lisaient `profiles.first_name` / `last_name` — colonnes inexistantes (`firstname` / `lastname` / `full_name`). **Tous les élèves s'affichaient « Élève sans nom »** dans les grilles.
- Les tests curriculum purgeaient **tous** les thèmes (`.not('id','is',null)`), seed compris → fixtures déplacées sur `TEST_GRADE='5'` / `TEST_GRADE_ALT='4'`.

---

## 5. Ce qui est EN COURS (non commité)

⚠️ **17 fichiers modifiés + 1 migration non suivie.** Typecheck vert, 31 865 tests unitaires serveur verts. **La dernière passe d'intégration n'a pas été relancée après le dernier correctif** (voir §7).

### 5a. `knowledge_type` → `regime_acquisition`

Migration `20260830080000_regime_acquisition_et_listes_automatismes.sql`.

Un seul champ confondait deux choses : **comment on mesure** la maîtrise, et **d'où vient** le point. Les valeurs `automatisme` / `capacite_attendue` sont des mots du BO qui désignent une provenance, alors que le champ pilotait une mesure — d'où une frontière qui paraissait arbitraire.

| `regime_acquisition` | Règle (seuils inchangés, design doc §6.1)                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `fluence`            | ≥ 5 réussites **et** ≥ 3 sur les 5 dernières → le geste doit être rapide, fiable, et le **rester**            |
| `diversite`          | ≥ 2 templates distincts **et** aucun échec sur les 3 dernières → la maîtrise se prouve sur des cas **variés** |

Le critère est : _qu'est-ce qui prouve la maîtrise de CE point ?_ Il ne recoupe pas la partie « Automatismes » du BO — il la traverse. « Déterminer l'équation de la tangente en un point » n'y figure pas et gagne pourtant à être mesuré en `fluence`.

### 5b. Table `curriculum_point_automatismes`

« Automatisme » n'est pas une propriété du point : c'est **une liste publiée par un programme donné**. Un point de seconde peut être dans la liste de 1ʳᵉ _et_ dans celle de terminale. Un booléen ne saurait ni l'exprimer, ni dire pour quel examen. D'où une liaison `(point_id, grade)`.

« Les automatismes attendus à l'examen de 1ʳᵉ » = une requête sur `grade = '1_SPE'`.

### 5c. Suppression du thème « Automatismes »

Ses 17 points ne sont pas des contenus de 1ʳᵉ : ce sont des acquis des années antérieures (seconde pour l'essentiel) que le programme demande d'entretenir. Les créer dans l'arbre de 1ʳᵉ en dupliquerait la définition — l'erreur même que ce chantier corrige.

**Vérifié** avant de supprimer : ces 17 points n'existaient nulle part ailleurs dans l'arbre de 1ʳᵉ (similarité maximale 0,44 avec un point existant — voisins, pas doublons).

Le seed passe donc de **7 thèmes / 19 objectifs / 170 points** à **6 / 14 / 153**.

⏳ **Conséquence à traiter plus tard** : la couverture du cahier de texte est filtrée sur le niveau de la classe (`getCurriculumTree(grade)`). Une fois l'arbre de seconde créé, cocher un automatisme de seconde depuis une classe de 1ʳᵉ demandera d'étendre cette vue aux points tagués des niveaux antérieurs.

---

## 6. Référentiel 1ʳᵉ spé

**Source** : PDF fourni par David le 2026-08-29. ⚠️ **Ce n'est PAS l'arrêté du 17 janvier 2019** — c'est le programme en vigueur, avec une partie transversale « Automatismes ».

**Source de vérité** : `docs/wip/referentiel/1re-spe-programme.md` (170 points à l'origine, 153 après retrait des automatismes).
**Générateur** : `scripts/generate-curriculum-1re-spe-seed.ts` → `supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql`.
Corriger le markdown, relancer `pnpm tsx scripts/generate-curriculum-1re-spe-seed.ts`, le seed est régénéré. Le script refuse d'écrire s'il détecte un doublon violant l'une des trois contraintes UNIQUE.

| Thème                              | Obj.   | Points  |
| ---------------------------------- | ------ | ------- |
| Vocabulaire ensembliste et logique | 2      | 17      |
| Algorithmique et programmation     | 1      | 5       |
| Algèbre                            | 2      | 32      |
| Analyse                            | 4      | 48      |
| Géométrie                          | 2      | 22      |
| Probabilités et statistiques       | 3      | 29      |
| **Total**                          | **14** | **153** |

49 connaissances · 65 savoir-faire attendus · 11 démonstrations · 28 approfondissements. `rang` NULL partout (le programme ne propose aucune échelle).

**Trois écarts assumés avec le texte**, documentés dans le markdown : les 11 « Exemples d'algorithmes » comptés comme approfondissements · trois puces du BO coupées en deux là où un élève peut réussir un geste sans l'autre · typage interprétatif du thème « Vocabulaire ensembliste et logique » (rédigé en prose continue, sans rubriques).

---

## 7. Reprise — à faire en premier

1. **Relancer l'intégration après un `db:reset` propre.** Le dernier correctif (isolation : `svcTheme(grade = TEST_GRADE)` dans `curriculum-api.test.ts` et `overrides.grade ?? TEST_GRADE` dans `curriculum-tracking-rls.test.ts`) n'a pas été vérifié. Il corrige deux fixtures qui créaient encore des thèmes sur le **grade 6 réel**, polluant le seed (11 thèmes au lieu de 6 après la suite).
2. Si vert → commiter le lot en cours (§5).
3. Décider quoi faire de la 6ᵉ : son arbre a encore un `kind` hérité sur 95 points, et les 72 capacités famille A n'ont pas été réintégrées.

---

## 8. Reste du chantier

**Phase 4 — banque de questions.** ⚠️ **Le stock legacy ne résout pas la 1ʳᵉ spé** : sur les 633 questions converties, **31 seulement sont de niveau 1ʳᵉ spé** (27 seconde, 1 terminale, 574 primaire/collège). Le pipeline d'import (`scripts/import-questions-to-db.ts` + UI de revue admin) existe et n'a jamais tourné en prod (2 templates en base).

Dimensionnement : la convention « 1 template = 1 variation canonique, 2-3 par point » donne 150 à 270 templates pour les ~70-90 points réellement « drillables ». Les autres (« résoudre un problème d'optimisation », « utiliser le produit scalaire pour résoudre un problème géométrique ») ne sont pas du matériau à question — ils se suivent par le cahier de texte et le jugement du prof.

**Phase 5 — devoirs typés** du cahier de texte vers « Mon travail » (aujourd'hui `homework_content` est du texte libre, invisible de l'inbox).

**Hors phases** : les classes 2026-27 ne sont pas créées. Les 7 classes en base sont celles de l'an dernier, toutes désactivées sauf une classe de test.

---

## 9. Pièges de vérification (appris à la dure)

- **`pnpm db:types` vise la PROD** (`--project-id`), pas le local. En dev local-first, utiliser `npx supabase gen types typescript --local`, sinon on écrase les bons types par les anciens.
- **`check:incremental` exclut les tests** (`tsconfig.check.json`) et **`test:integration` ne couvre pas les unitaires**. Des tests unitaires serveur sont restés cassés une phase entière sans être vus. **Toujours lancer `pnpm test:server`** (825 fichiers, ~31 900 tests, ~2 min, pas d'OOM).
- **`FRESH=1 pnpm check:incremental` obligatoire après un `git mv`** — le cache incrémental périmé produit des erreurs fantômes (24 erreurs inexistantes observées).
- **Un `db:reset` interrompu** (502 transitoire) laisse la base incohérente et produit des dizaines d'échecs trompeurs dans des tests sans rapport. **Toujours vérifier `Finished supabase db reset`** avant de conclure quoi que ce soit d'une suite de tests.
- **2 échecs d'intégration sont pré-existants** : `admin-elevation.test.ts` (`invalid JWT`), vérifiés en remisant les modifications et en testant sur le schéma de `main`. Probablement la dérive de version gotrue signalée par le CLI au démarrage.
- `skills.family` était une colonne GENERATED depuis `objective_id` → la droper **avant** sa source.
- `supabase/seed.sql` est un dump prod restreint aux tables de référence : tout renommage de table s'y répercute.
