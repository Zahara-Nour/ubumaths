# QCM à plusieurs réponses et préréglage Vrai / Faux (chantier 2)

Décisions : `docs/wip/correction-trois-niveaux-et-questions-de-cours.md` (Q100, Q101). Spécification
validée par David le 2026-10-02.

## Constat (2026-10-02)

- Notation serveur (`grading.ts` `statusFromChoices`) : barème Q101 déjà en place.
- Éditeur : case « plusieurs réponses » + bonnes réponses multiples (`AnswerEditor.svelte`,
  `SharedFieldsEditor.svelte`, `QuestionTemplateForm.svelte`, colonne `multiple_answers`).
- Saisie : cases à cocher (`MultipleChoiceInput.svelte`). Option `options.shuffleChoices`.
- Manque : validation client en tout-ou-rien (`validateChoice`, `answer-validator.ts`), aucune
  consigne pour l'élève, pas de préréglage Vrai / Faux, aucun test de bout en bout ; 0 modèle publié
  n'utilise `multipleAnswers`.

## Spécification

- **V1** Éditeur : « plusieurs réponses » → au moins une bonne réponse ; sinon exactement une ;
  enregistrement refusé si incohérent, message en français.
- **V2** Élève : consigne « Coche toutes les bonnes réponses. » (Q107 b) sous l'énoncé ; cases à
  cocher ; réponse unique inchangée (boutons ronds).
- **V3** Barème identique partout (entraînement, évaluation, flash-cards, en classe) : toutes et
  aucune mauvaise = juste ; une partie sans mauvaise = ½ ambre « Il manque des réponses. » ; une
  mauvaise = faux ; rien = vide.
- **V4** Validation navigateur = même statut que le serveur (½ compris) ; SRS / statistiques : ½ =
  « à revoir » (Q40).
- **V5** Évaluation notée : envoi de plusieurs choix accepté (Zod borné), note serveur selon V3 ;
  test de bout en bout.
- **V6** Mélange : bonnes réponses conservées quel que soit l'ordre ; résultat attendu (bon coché,
  coché à tort, oublié) déjà livré.
- **V7** Bouton « Vrai / Faux » dans l'éditeur des choix : remplace par « Vrai », « Faux »
  (confirmation si des choix existent), désactive « plusieurs réponses », règle « ne pas mélanger »
  (Q106 : jamais mélangé), l'auteur coche la bonne.
- **V8** Vrai / Faux = QCM ordinaire, même notation, pas de nouveau type.

## Lot unique — en cours
