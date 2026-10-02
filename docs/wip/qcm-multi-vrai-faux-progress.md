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

## Lot unique — fait (2026-10-02, non commité)

### Fait

- **Barème unique** : `statusFromChoices` déplacé dans `questions/choices.ts` (ré-exporté par
  `grading.ts`) ; `validateChoice` s'en sert → ½ = `unoptimal_form`, `isCorrect` faux,
  « Il manque des réponses. » (`MISSING_CHOICES_FEEDBACK`). Vide → `empty`.
- **V1** : `questions/validators/choice-answer-count.ts` (`choiceAnswerCountErrors`), appelé par
  `validateTemplate` (publication), par POST / PUT des modèles (brouillon : seul l'excès est
  refusé) et par `QuestionTemplateForm` (brouillon : toaster ; publication : liste d'erreurs).
  Avertissement en ligne dans `AnswerEditor` (`role="alert"`).
- **Bug corrigé en passant** : la case « plusieurs réponses » ne remontait pas au formulaire
  (`{multipleAnswers}` sans `bind:`) → `bind:multipleAnswers` dans le formulaire et
  `SharedFieldsEditor`. Groupe radio des bonnes réponses : nom unique par éditeur (`$props.id()`).
- **V2** : consigne « Coche toutes les bonnes réponses. » en tête de `MultipleChoiceInput`
  (entraînement, flash-cards, en classe, après correction).
- **V5** : Zod de l'envoi : choix sans doublon ; `toSubmission` déduplique. Intégration :
  bloc « QCM à plusieurs réponses » dans `evaluation-notee-serveur.test.ts` (1 / ½ / 0, SRS).
- **V6 / V8** : tests de génération ; le générateur **respecte maintenant**
  `options.shuffleChoices === false` (il mélangeait toujours : option morte).
- **V7** : bouton « Vrai / Faux » dans `AnswerEditor` (ConfirmDialog si des choix sont écrits),
  coupe « plusieurs réponses » et le mélange (`bind:shuffleChoices`), aucune bonne cochée.

- **Q109 a (indicateur rond / case)** : chaque choix de `MultipleChoiceInput` reste un bouton,
  avec un indicateur décoratif lucide (`Circle`/`CircleDot` une réponse, `Square`/`SquareCheck`
  plusieurs, `aria-hidden`) ; le bouton porte `role="radio"` (dans un `radiogroup`) ou
  `role="checkbox"` + `aria-checked` ; flèches pour passer d'un choix à l'autre. Couleurs :
  `hsl(var(--x))` (invalide, bordures invisibles) remplacé par `var(--color-*)`. Résultat
  attendu : ligne `choices` porte `multiple`, même indicateur dans `ExpectedResultView`.
  Captures jetables : `src/lib/components/question-inputs/__tests__/zz-captures-qcm/`.

### Reste

- Commit, PR, CI (session principale).
- Pas de test composant de `QuestionTemplateForm` (V1 testé dans `AnswerEditor`, les routes et
  le validateur).

### Doutes (à trancher par David)

- **Mélange en prod** : 49 QCM portent `shuffleChoices: false` (32 publiés : Oui/Non,
  positif/négatif…) et étaient pourtant mélangés. Ils ne le seront plus. Une tentative
  d'évaluation démarrée avant le déploiement SANS instance figée (repli sur la graine) verrait
  ses choix réordonnés.
- **Brouillon sans bonne réponse** accepté (refusé seulement à la publication) ; brouillon avec
  trop de bonnes réponses refusé. Lecture de « enregistrement refusé si incohérent ».
- (Tranché Q109 a : boutons + indicateur rond / case.) Capture jetable
  `zz-capture-qcm.svelte.test.ts` + `zz-captures-qcm/` : à supprimer avant commit.

## Décisions complémentaires de David (2026-10-02)

- **Q108 oui** : `options.shuffleChoices: false` est respecté par le générateur (il ne l'était nulle part).
  32 QCM publiés concernés (Oui/Non, Vrai/Faux, positif/négatif, « On ne peut pas savoir » en dernier,
  limites +∞/−∞/1/−1…) : ordre de l'auteur affiché. Motif : convention et confort de lecture (pas la
  justesse). Effet de bord accepté : une séance d'entraînement commencée juste avant la mise en ligne peut
  voir l'ordre changer au rechargement ; évaluations notées non concernées (instances figées).
- **Q109 a** : boutons de choix conservés, avec un indicateur rond ○/● (une réponse) ou case ☐/☑
  (plusieurs réponses) ; accessibilité radio / checkbox.
