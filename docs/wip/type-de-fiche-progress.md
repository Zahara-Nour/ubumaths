# Chantier — le type de fiche décide de la forme du PDF (ADR 0030)

Worktree : `../ubumaths-wt-type-fiche`, branche `feat/type-de-fiche`. Décision :
[ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md).

## Décisions de David (2026-10-15)

- Quatre types : Fiche d'exercices, Évaluation écrite, Devoir maison, Examen blanc ; Quiz retiré
  (aucune fiche de ce type en base, 32 fiches toutes `worksheet`).
- Devoir maison : pas de points, une date de rendu.
- Évaluation écrite : points en option ; calculatrice autorisée / interdite ; réponses sur le sujet
  en option.
- Examen blanc : points toujours (comme au bac) ; durée ; calculatrice ; réponses sur le sujet en
  option.
- Cadres : après chaque question ou après l'exercice ; hauteur estimée d'après le corrigé, réglable
  par question dans la fiche.
- Options d'affichage supprimées ; corrigé PDF toujours détaillé.

## Décisions de la phase 0 (2026-10-15, David : « je suis tes recos »)

- Spécification des lots 1 à 4 validée (ci-dessous).
- Format : toujours A4, même en anglais (ADR 0030 corrigé sur main).
- Lot 4 : taille des cadres dans une **colonne de `worksheet_exercises`** (migration additive).
  Question d'accès tranchée : lisible par le prof et par l'élève à qui la fiche est affectée, comme
  le reste de la ligne ; aucun nouvel accès.

## Données mesurées en prod (2026-10-15)

- 32 fiches, toutes `type = worksheet` ; `numbering_style` toujours `numeric` ou absent ;
  `correction_detail` jamais posé ; aucune fiche sur les styles 02-05 (Contrôle, Examen, Devoirs,
  Quiz).
- Cinq fiches publiées affichent le nom (quatre aussi les points) : « Automatismes : dérivation »
  `cdd4f90f`, « … (2) » `3bf0cab0`, « … forme canonique » `b55b6426`, « … racines et
  discriminant » `abd15ee7`, « Evaluation : Produit scalaire » `8443f4b7` (sans points). Devenues
  fiches d'exercices, elles perdraient nom et points : à montrer à David (changer leur type ?).

## Lot 1 — le type décide de l'en-tête (spécification)

- Amendement de David (2026-10-15) : la fiche d'exercices a UNE option, « Nom de l'élève »
  (`show_student_name`, non cochée par défaut) : le nom seul, ni classe ni date (groupes de
  niveaux).

- Types proposés : `worksheet` Fiche d'exercices, `assessment` Évaluation écrite, `homework`
  Devoir maison, `exam` Examen blanc (EN : Worksheet, Written test, Homework, Mock exam). `quiz`
  retiré du code (la contrainte CHECK en base l'accepte encore ; aucune ligne).
- Options par type (dans `worksheets.config`) : évaluation écrite → `show_points` (oui/non),
  `calculator` (`allowed` | `forbidden`), `answers_on_sheet` ; examen blanc → `calculator`,
  durée (`estimated_duration_minutes` existant), `answers_on_sheet`, points TOUJOURS ; devoir
  maison → `due_date` ; fiche d'exercices → rien. « Mélanger les exercices » reste.
- En-tête (tous styles, FR et EN) : titre toujours ; nom + classe : évaluation, devoir, examen ;
  date : ligne à remplir pour évaluation et examen, date de rendu pour le devoir ; points par
  exercice et total : évaluation (option), examen (toujours), jamais ailleurs — le type l'emporte
  sur le style (« Fiche élève » n'imprimait jamais les points, ADR 0028 D8) ; calculatrice :
  évaluation et examen ; durée : examen.
- Panneau « Options d'affichage » retiré (création et page de la fiche) ; format A4 partout ;
  numérotation numérique ; corrigé PDF toujours détaillé (`correction_detail` ignoré).
- Le cadre unique actuel (`hasAnswerSpace`) : seulement si `answers_on_sheet` (lot 3 le
  remplacera par les cadres par question).

## Lots suivants

- Lot 2 : retirer les styles 02-05 de la liste.
- Lot 3 : cadres automatiques (découpage par question, taille estimée d'après le corrigé, après
  chaque question ou après l'exercice).
- Lot 4 : taille réglable par question (colonne `worksheet_exercises`, migration additive).

## État

- [x] Phase 0 : cartographie + spécification + question d'accès → validée
- [x] Lot 1 (2026-10-15) : règle pure `worksheetHeader` (prof et élève), 4 types (quiz refusé
      par Zod), options du type dans `WorksheetTypeOptions` (création + fiche), « Nom de l'élève »
      en option de la fiche d'exercices (amendement de David), corrigé toujours détaillé, chiffres
      arabes, cadre unique si « réponses sur le sujet ». 12 styles × 4 types × FR/EN compilés par
      le compilateur de prod. Reste : CONTEXT.md (entrées de l'ADR), tests d'intégration à lancer.
- [x] Lot 2 — styles Contrôle, Examen, Devoirs, Quiz retirés du menu (`BUILT_IN_STYLE_OPTIONS`),
      toujours résolus ; aucune fiche ne les désignait
- [x] Lot 3 — cadres automatiques (`answer-frames.ts`) : après chaque question (élément de 1er
      niveau des listes numérotées de 1er niveau, `afterQuestion` du générateur) ou après l'exercice
      (`answer_frames`) ; taille petit/moyen/grand (2,5/4,5/7 cm) d'après le corrigé ; l'élève
      reçoit les tailles du serveur (`answer_frame_estimate`), même correction masquée
- [ ] Lot 4
