# Questions de cours (chantier 3)

Décisions : `docs/wip/correction-trois-niveaux-et-questions-de-cours.md` (Q95–Q99), puis David le
2026-10-02 (Q110–Q117, « je suis tes recommandations ») :

- **Q110 (b)** Marqueur d'intention `options.courseQuestion` (à côté de `options.courseCard`). Une carte de
  cours est toujours une question de cours.
- **Q111 (a)** Table « questions du chapitre » (publiée comme les autres contenus du chapitre, ADR 0005) —
  étape 2, avec migration et question d'accès : les élèves de la classe voient les questions de cours
  publiées de leurs chapitres visibles, rien de plus.
- **Q112 (b)** Paquet de révision du chapitre **calculé** (pas de copie par élève, fiches FSRS par
  `template_id`) — étape 3.
- **Q113 non** Les questions de cours n'entrent pas dans le paquet « Programme » (corriger
  `api/srs/review/submit/+server.ts` qui les y ajouterait).
- **Q114 (a)** Les 4 cartes : Fonctions › Étude de fonction › **Méthode** (au lieu de « Flash »).
- **Q115** Étapes : 1) marqueur + filtre catalogue ; 2) questions du chapitre ; 3) paquet calculé.
- **Q116 (b)** Marquer « question de cours » le vrai / faux sur les polynômes du second degré (pas celui
  des racines, plutôt automatisme).
- **Q117 (a)** Sous-domaine « Vrai ou Faux » (polynômes) renommé **« Propriétés »**.

Hors chantier, noté : faire écrire le paquet Programme par le serveur, puis retirer la policy large
« Users can create cards in decks » (sécurité, chantier séparé). Glossaire : `class_chapters`.

## Constat (exploration 2026-10-02)

- Chapitres `class_chapters` (1 en prod), contenus `chapter_documents|exercises|checklist_items|worksheets|
decks` + `chapter_sections` ; aucun lien vers `question_templates`.
- `chapter_decks` sans consommateur (0 ligne) ; assignation de paquet = copie figée.
- Paquet Programme alimenté via `question_template_points` (3 endroits ; `srs/review/submit` sans
  exclusion des cartes).
- 4 cartes `course_card` publiées, 0 point du programme ; 0 série ne pointe sur « Flash ».

## Étape 1 — code fait, non commité (2026-10-02)

- **Marqueur** : `options.courseQuestion` (types, `optionsSchema` + schéma strict, `migration-review`) ;
  `isCourseQuestion()` dans `questions/types.ts` (= marqueur OU carte de cours) ; recopié sur l'instance
  (le générateur copie déjà `options`).
- **Éditeur** : `CourseQuestionToggle.svelte` (MyCheckbox + aide) sous le type ; carte de cours → cochée,
  désactivée, et `courseQuestion: true` écrit à l'enregistrement (`questions/course-question.ts`).
- **Catalogue admin** : case « Questions de cours » (`?courseQuestion=1`, filtre serveur
  `type = course_card OU options->>courseQuestion = true`, deux onglets) ; badge « Cours » sur
  `QuestionTemplateCard` et dans les deux tableaux. Le catalogue des séries n'a pas de filtre par type :
  rien ajouté.
- **Q113** : règle unique `entersProgrammeDeck()` (`server/srs/programme-deck-rule.ts`) = modèle lu ET
  publié ET pas question de cours ; appliquée à `api/skill-attempts`, `recordSeriesReviews` (lit
  `question_templates(options, status)` avec le lien) et `api/srs/review/submit` (idem, dans la jointure
  de la carte). Effet de bord voulu : un brouillon n'entre plus dans le paquet par `tests/save` ni par
  `srs/review/submit` (comme `skill-attempts` déjà).
- **Glossaire** : `class_chapters`, `options.courseQuestion`.
- À faire par la session principale : test d'intégration de la jointure
  `question_template_points → question_templates` sous RLS élève (non lancé : `db:*` interdit ici).

### Revue de la PR #663 (2026-10-02)

- Jointure réelle `question_template_points → question_templates(options, status)` testée en élève
  (`question-de-cours-filtre.test.ts`) : publié lisible, brouillon invisible.
- Nettoyage des paquets inutile : `srs_cards` = 0 ligne en prod (aucune question de cours dans un paquet).
- Deux sources pour « carte de cours » : la colonne `type` (filtre du catalogue) et `options.courseCard`
  (`isCourseQuestion`) — cohérentes car `type` est dérivé à l'enregistrement.

## Étape 2 — séries de chapitre (décisions de David, 2026-10-02)

**Changement de conception (lecture « a »)** : on ne rattache pas des questions une à une ; le chapitre est
relié à une **série** (composée au panier, ex. catégorie Fonctions › Étude de fonction › Méthode). Q111 (table
« questions du chapitre ») est remplacée par une table **« séries du chapitre »**. L'étape 3 (paquet calculé)
partira des questions de la série.

**Accès (Q123 corrigée, validée)** : les élèves d'une classe peuvent lire les rattachements publiés des chapitres
**visibles** de leur classe **et les séries elles-mêmes** (titre, niveau, catégories) ; pas les séries programmées
ou masquées, ni celles d'une autre classe, ni les séries non rattachées du professeur. `student_can_read_series`
passe de « série d'une évaluation assignée » à « … **ou** rattachée à un chapitre visible et publié de sa classe ».
Anon : rien. Personne ne perd d'accès. (Correction : avant, l'élève ne lisait une série enregistrée QUE via une
évaluation assignée ; le lien sans connexion porte les catégories dans l'URL.)

**Spécification (validée)**

- S1 Prof : « Ajouter une série » (séries enregistrées : titre, nombre de questions ; ou composer au panier).
- S2 Publication : immédiate / programmée / masquée (comme les autres contenus, ADR 0005).
- S3 Place dans le plan (section, `section_id` / `section_order`), déplaçable.
- S4 Retirer = détacher (la série reste).
- S5 / Q124 (a) Forme choisie au rattachement : flash-cards par défaut, ou entraînement.
- S6 Élève : lien au titre de la série, lancé dans la forme choisie, sans note ni évaluation.
- S7 Programmée / masquée : invisible.
- S8–S10 Accès testé en intégration AVANT la migration (rouge sans elle) : lecture élève restreinte ; élève sans
  écriture (vérifié par le nombre de lignes) ; prof / admin tout ; anon rien ; non-régression des séries
  d'évaluation.
- Q125 oui : le lien suit la série (modification visible ; une série est retirée à chaque usage).
