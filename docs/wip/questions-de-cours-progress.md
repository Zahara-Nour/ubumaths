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

## Étape 1 — en cours
