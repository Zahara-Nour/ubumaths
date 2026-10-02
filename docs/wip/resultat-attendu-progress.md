# Carte de correction à trois niveaux — résultat attendu (chantier 1)

Décisions : `docs/wip/correction-trois-niveaux-et-questions-de-cours.md` (Q91–Q101), ADR 0017,
glossaire `CONTEXT.md` (Résultat attendu, Correction concise / détaillée).

## Spécification validée par David (2026-10-02)

### A. Construction du résultat attendu (fonction pure, testée)

- **R1** Une case = tout le membre de droite (convention « expression » `$${{expression}}$$` et
  `$… = ?$`) : faux → `3 + 5 ≠ 9` (≠ et 9 rouges) puis `= 8` encadré vert ; juste → `3 + 5 = 8`
  encadré vert ; vide → `= 8` + « Tu n'as rien répondu. ».
- **R2** Forme non optimale : réponse en ambre dans la ligne, remarque dessous, puis `= 8` encadré vert.
- **R3** Trou au milieu, plusieurs cases, case dans le texte, format multi-cases (`?+5=10`, `?<c<?`,
  `?\times 10^{?}`, « … s'appelle un [_] ») : énoncé complet, solutions en vert dans les trous, puis
  « Ta réponse : » avec chaque case de l'élève colorée selon son statut.
- **R4** Relation autre que `=`, ou case qui n'est pas tout le membre de droite : présentation R3 ;
  `≠` seulement quand il est mathématiquement juste.
- **R5** QCM : bons choix encadrés vert, choix coché à tort rouge, bon choix oublié ambre (multi).
- **R6** Unités, intervalles, virgule : réponse de l'élève rendue en maths, jamais en texte brut.
- **R7** `rulesSuffice` : juste → sa réponse en vert (pas l'exemple) ; faux → « Une réponse possible : ».
- **R8** Case graphique (droite graduée) : réponse attendue seule + réponse de l'élève en texte.
- **R9** Sans réponse d'élève (flash-cards, révision, en classe) : énoncé rempli en vert.
- **R10** Case introuvable : réponse attendue sur une ligne à part ; jamais d'exception.

### B. Statuts case par case

- **R11** Statut par case (juste / forme non optimale / faux / vide) + remarques de forme rattachées.
- **R12** Couleur ambre dans MathPrompt (formule) et BlankInput (texte).

### C. Affichage

- **R13** Résultats d'entraînement et d'évaluation (`CorrectionCard`) : recto = énoncé + résultat
  attendu + statut global ; verso = `CorrectionView` (concise → détaillée). Remplace « Votre réponse »
  / « Réponse correcte ».
- **R14** Flash-cards, révision SRS, en classe (`FlashCard`) : verso = résultat attendu (R9) en haut,
  `CorrectionView` en bas.
- **R15** Même présentation téléphone / grand écran ; verso accessible au clavier.

### Décisions

- **Q102 (a)** Évaluations notées : statuts par case **recalculés** côté serveur à l'affichage
  (graine + réponses), pas de migration.
- **Q103** Lots : 1) fonction pure + statuts par case + tests (aucun affichage modifié) ; 2) résultats d'entraînement et d'évaluation ; 3) flash-cards, révision, en classe.

## Base technique (exploration du 2026-10-02)

- Cases : `?` dans `$…$` → `\placeholder[N]{}` ; `[_]` → `{{blank:N}}` ; convention expression
  `<<expr:name>>` + `instance.expressions[i].answerFormat` (défaut `\placeholder[0]{}`), ` = answerFormat`
  ajouté au rendu (`fill-blanks-utils.ts`, `augmentASTForExpressions`). `assign-blank-indices.ts`.
- Notation : `ValidationStatus` (`types.ts`), `validateAnswer` (`answer-validator.ts`, statut global,
  `blankFeedback` seulement des cases fausses, `constraintViolations` sans indice de case),
  `validateBlanksDetailed` → `statuses[]` ; serveur : `grading.ts` `gradeQuestion` → `QuestionVerdict`.
- Remplissage existant : `replacePromptsWithValues` (`math-utils.ts`), `buildInputStatesForCorrection`,
  `FillBlanksInput showCorrectAnswers`, `serie-automatismes.ts figer` (échoue sur `<<expr>>`).
- Messages de forme : `src/lib/questions/feedback.ts` (`CONSTRAINT_FEEDBACK`).

## Lot 1 — fait (2026-10-02, non commité)

### Fait

- **R11** `validateAnswerDetailed(instance, { values?, latex?, choiceIndexes? })`
  (`src/lib/utils/answer-validator.ts`) → `{ status, blanks: [{ index, status, remarks }], choices?, feedback? }`.
  Cœur commun `detailBlanks` (aussi derrière `validateBlanksDetailed`, API inchangée) : aucune
  notation dupliquée. Statut global = `validateAnswer` (`status ?? juste/faux`), vérifié sur les
  fixtures réelles. QCM : issue par choix `checked-correct | checked-wrong | missed | unchecked`.
- **R1-R10** `buildExpectedResult(instance, answer?, verdict?)` + `fillMarkdown(markdown, fills, decorate)`
  (`src/lib/questions/expected-result.ts`). Lignes : `comparison`, `solution`, `filled-statement`,
  `your-answer`, `choices`, `remark`, `expected-only`, `empty`. Statuts sémantiques
  `correct | unoptimal | incorrect | empty | solution | neutral`. Les cases restent sous leurs
  marqueurs (`\placeholder[N]{}`, `{{blank:N}}`) ; `fillMarkdown` les remplace avec le décor de l'appelant.
- **R12** `InputState.unoptimal?` ; `BlankInput` (`unoptimal`, `data-state`, `border-warning`) ;
  `MathPrompt` (`data-unoptimal-prompts`, classe `math-prompt-unoptimal` → `--correct-color: var(--color-warning)`) ;
  `ParagraphNode` transmet `unoptimal`.
- Tests : `answer-validator-detailed.test.ts` (31), `expected-result.test.ts` (34),
  `etat-ambre.svelte.test.ts` (5, 4 rouges sans le changement).

### Reste (lots 2-3)

- Brancher `buildExpectedResult` dans `CorrectionCard` (lot 2) et `FlashCard` (lot 3) ; écrire le
  décor (`fillMarkdown` → `\textcolor`/`\boxed` à l'écran, Typst au PDF).
- Personne ne pose encore `InputState.unoptimal` : à faire au lot 2.

### Doutes (à trancher par David)

- **MathPrompt ambre** : MathLive ne connaît que `correct` / `incorrect` par case ; l'ambre passe par
  `--correct-color` de TOUTE la formule. Formule mêlant une case juste et une non optimale : reste
  verte (la case est signalée par `data-unoptimal-prompts`, sans couleur propre).
- **« Ta réponse »** = l'énoncé entier rempli par les cases de l'élève (les `fills` portent aussi
  l'indice, une liste reste possible). Long énoncé → répétition : à juger à l'écran.
- **Tout juste en R3** : une seule ligne, l'énoncé rempli par SES réponses (pas de « Ta réponse »).
- **Remarques** : messages de forme + message propre d'une case fausse (unité, % oublié…).
- **R9 + rulesSuffice** : `possible: true` (la solution montrée n'est qu'un exemple).
- **QCM rien coché** : statut global = `validateAnswer` (`incorrect`), mais ligne « Tu n'as rien répondu. ».
- `figer` (`serie-automatismes.ts`) laissé intact : pas factorisé (marqueur `<<expr>>` toujours refusé).
