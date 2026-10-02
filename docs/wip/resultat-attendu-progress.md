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

## Revue de la PR #643 — corrigée (2026-10-02, non commitée)

- **Sécurité** : `src/lib/questions/student-answer-safety.ts` — `neutralizeStudentLatex` (retire
  `\href`, `\url`, `\html*`, `\class`, `\cssId`, `\includegraphics`, `\def`…, `\placeholder`, tout `$`,
  sauts de ligne ; jusqu'au point fixe) et `escapeStudentText` (caractères de syntaxe → sosies pleine
  chasse, `==` cassé). Appliqués DANS `buildExpectedResult` (fills, comparaison, `expected-only`).
- **R1** : membre gauche sans AUCUNE relation (liste fermée de commandes + toute flèche + symboles
  Unicode + second `=`) ; texte non ponctué après la formule (`$x = ?$ cm`) → R3.
- **A11y R12** : libellé `sr-only` relié par `aria-describedby` (« réponse juste / juste, forme à
  améliorer / fausse » ; MathPrompt : « Case N : … »).
- **Mineurs** : QCM → LaTeX transmis, choix jugés par les `validationRules` s'il y en a ;
  `orderIndependent` → message propre d'une réponse non appariée (s'il est unique parmi les cases
  libres) ; `BlankVerdict.answer` = réponse sans « x = » / « ° » recopiés ; `ExpectedFill.value: null`
  = case vide ; `fillMarkdown` en une passe ; formule « expression » rendue avec `displayLatex`.
- Doutes : sosies pleine chasse visibles si l'élève tape `(`, `*`… dans une case texte ; une
  réponse non appariée ne reçoit un message que si les cases libres n’en donnent qu’un seul.

## Lot 2 — fait (2026-10-02, non commité, branche `feat/resultat-attendu-affichage`)

### Fait

- **Décor écran** `src/lib/questions/expected-result-markdown.ts` (pur) : statut → couleur par
  variables `--expected-*` (`\textcolor{var(…)}`), solution / juste encadrés par
  `\bbox[border:1px solid …]` (`\boxed` reste noir ; `0.06em` deviendrait `0{,}06` en locale fr).
  **Sécurité** : toute valeur math dans `$…$`, valeur texte en `\text{}` après `escapeStudentText`,
  accolades équilibrées (`balanceBraces`), remarques découpées texte / formule (texte jamais en
  markdown). Test verrou : la charge `[clic](https://…)` n'apparaît jamais hors formule.
- **`ExpectedResultView.svelte`** : une ligne par `ExpectedLine` (`data-kind`, `data-status`),
  libellé en toutes lettres (« juste », « forme à améliorer », « faux », « coché à tort »,
  « bonne réponse oubliée »), lettre du QCM dans l'ordre affiché. Couleurs : palette Tailwind
  (`--color-green-700`…, repli hexadécimal) en `light-dark`.
- **`CorrectionCard`** : recto = statut global (Juste / ½ point / Faux, icône + texte) + énoncé
  (seulement s'il n'est pas déjà rempli dans le résultat attendu) + `ExpectedResultView` ; verso =
  `CorrectionView` (concise ↔ détaillée), mode B inchangé ; faces `inert` quand cachées. Prop
  `verdict?` (serveur) ; sans elle, `validateAnswerDetailed` côté client (entraînement), réponse
  relue par `studentAnswerFromAnswerData` (`correction-card-verdict.ts`).
- **Q102 a** : `src/lib/server/corrected-detail.ts` recalcule le verdict détaillé à chaque
  service de copie (`submitEvaluationAttempt` et `readSubmittedCopy`, élève seul), statut servi =
  statut enregistré, divergence journalisée sans donnée d'élève, budget de temps (Q59) et pas de
  recalcul d'une question « budget épuisé ». `CorrectedQuestion.detail?` ; `EvaluationResults` le
  passe à la carte. Aucune migration. La page résultats du professeur ne montre pas les copies :
  inchangée.
- Tests : `expected-result-markdown` (10), `correction-card-verdict` (4), `corrected-detail` (11),
  `ExpectedResultView` (11), `CorrectionCard` (6, réécrit), `EvaluationResults` (+1), intégration
  `evaluation-notee-serveur` (+2 et C10 étendu ; rouge vérifié en neutralisant le branchement).

### Décisions Q104 / Q105 (David, 2026-10-02) — faites

- **Q104 (a)** : comparaison R1 (lignes `comparison` / `solution`) → le recto ne montre plus
  l'énoncé à case vide, seulement sa consigne : `instructionOf` (`correction-card-verdict.ts`)
  retire la formule qui porte la case (`\placeholder` ou `<<expr:`) ; rien s'il ne reste ni
  lettre ni chiffre. R3, QCM, attendu seul : inchangés.
- **Q105 (oui)** : en entraînement, statut global = barème de l'évaluation, par `gradeQuestion`
  lui-même (`trainingStatus` : indices d'origine d'un QCM ramenés aux positions affichées, ordre
  d'origine si la question n'est pas mélangée). ½ point aussi pour un partiel (case vide, QCM
  incomplet). Une case juste + une fausse = 0 (barème A2), donc « Faux ».
- Tests : `correction-card-verdict` (+4), `CorrectionCard` (+4 ; 3 rouges avant — le cas « une
  case vide » était déjà ½ par `validateAnswer`).

### Doutes

- `≠` mal dessiné dans les captures de test (polices MathLive non chargées en test) : à vérifier
  dans l'application.
- Remarques perdues pour une case « attendu seul » (R10) : `build()` ne les émet pas (lot 1).
- R1 vide : solution affichée `3 + 5 = 8` (avec le membre gauche), pas `= 8` seul.
- `security-auditor` à repasser sur le lot 2 (exigence de l'audit #643).

## Audit de sécurité de la PR #643 (2026-10-02) — exigences pour le lot 2

- Corrigé : `\style` (alias de `\htmlStyle`), `\bbox`, couleurs et dimensions sans borne (`\rule`,
  `\kern`, `\raisebox`…) neutralisés ; test sur la **sortie réelle de MathLive**
  (`student-answer-safety.render.test.ts`).
- ⚠️ **Lot 2 (bloquant si oublié)** : toute valeur `context: 'math'` doit être rendue **comme formule**
  (jamais en texte markdown sans `$…$`), sinon `[clic](https://…)` redeviendrait un lien. À verrouiller
  par un test au branchement de l'affichage, et repasser `security-auditor`.
- Envisager une **liste blanche** de commandes LaTeX plutôt que la liste noire actuelle (un alias a
  déjà été manqué).
- Mineur : `escapeStudentText` ne neutralise pas le barré `-/-…-/-` (cosmétique).

## Audit du lot 2 (2026-10-02) — liste blanche et mineurs

- **Liste BLANCHE** (`student-answer-safety.ts`, `ALLOWED_COMMANDS`) : la liste noire avait manqué
  `\style` puis `\enclose` (qui recopie `mathbackground` / `padding` dans `style=`). Une commande
  hors liste perd son nom et ses options `[…]` (y compris après un argument :
  `\enclose{box}[…]{3}` → `{box}{3}`), ses arguments `{…}` restent en texte inerte ; point fixe
  conservé (un retrait peut accoler `\text` et `color`). Échappements admis : `\, \; \: \! \  \{ \}
\% \|` ; tout autre `\` isolé est retiré.
- **Mesurée** : 33 241 réponses attendues réelles (modèles, instances × 6 tirages, LaTeX, specs ;
  `docs/relecture`, `scripts/questions`, fixtures de prod) → commandes rencontrées : `alpha beta
cdot circ cos cup dfrac div emptyset exp exponentialE frac infty left leqslant ln mathbb mathrm
min operatorname pi right setminus sin sqrt text times unit varnothing` + `\{ \} \, \%`. Plus
  `toLatex` / `unitWritingToLatex` (`\mathrm{km}\cdot\mathrm{h}^{-1}`, `{}^{\circ}`, `\text{€}`)
  et tout ce qu'insèrent le clavier virtuel par défaut et les raccourcis de MathLive 0.110 (lu dans
  `mathlive.mjs`). Rien de légitime refusé ; le test « corpus » le rejoue (rouge si MathLive change).
- `decorateFill(fill, inFormula)` : une case hors formule (`{{blank:N}}`, ou `\placeholder` égaré
  hors `$…$`) est TOUJOURS enveloppée en `$…$`, quel que soit son contexte ; `fillMarkdown` passe
  la position du marqueur.
- Envoi : `gradeWithinBudget` rend `remainingMs` ; le recalcul détaillé de la copie servie reçoit ce
  RESTE (plus un nouveau budget de 5 s). Relecture d'une copie notée : budget entier.
- Doutes : environnements (`\begin…\end`, matrices) et `\N \Z \Q \R \C` absents du corpus → hors
  liste (rendus en texte inerte) ; intégration `evaluation-notee-serveur` non rejouée (Supabase).

## Lot 3 — fait (2026-10-02, non commité, branche `feat/resultat-attendu-cartes`)

### Fait

- **`FlashCard` verso (R14, Q91)** : statut global (après « Valider » seulement), consigne (Q104,
  `instructionOf`, si comparaison / solution R1), `ExpectedResultView`, puis `CorrectionView`
  (concise ↔ détaillée). Remplace la grande réponse seule, `FillBlanksInput showCorrectAnswers
onlyBlanks` et la liste des bons choix. Repli « pas de réponse structurée » conservé (aucune
  ligne). Taille du résultat : `text-base` (sm), `text-lg` (md), `text-xl` (lg) ; zone
  `overflow-x: auto` (une longue formule défile, la tuile ne s'élargit pas). Carte de cours inchangée.
- **Avec réponse** (`interactive`) : réponse figée à « Valider » (`$state.raw`, rattachée à SON
  instance — un proxy profond ne serait jamais égal à l'instance reçue), verdict
  `validateAnswerDetailed` + statut `trainingStatus` (Q105), badge Juste / ½ point / Faux.
- **R9 d'un calcul R1** (`buildExpectedResult` sans réponse) : ligne `solution` `3 + 5 = 8`
  encadrée au lieu de l'énoncé rempli (cohérent avec R1 vide) ; `CorrectionCard`
  (`expectedAnswerMarkdown`) la rend aussi. Trou au milieu, plusieurs cases : énoncé rempli inchangé.
- **R7 sur l'attendu seul** : `expected-only.possible` → « Une réponse possible : » (le verso
  disait « Une réponse possible » pour toute case `rulesSuffice`, y compris introuvable dans l'énoncé).
- Tests : `FlashCard-resultat-attendu` (11 ; 10 rouges avant, la carte de cours passait déjà),
  `expected-result` R9 réécrits (+1 trou au milieu), `FlashCard` (2 tests « grande réponse
  seule » adaptés), `ClassroomSeries` (sélecteur `expected-result`).
- Pas de « quiz de chapitre » : supprimé le 2026-09-15 (CONTEXT.md). FlashCard `interactive` ne
  sert plus qu'à `QuestionPreview` (aperçu), la page debug et la démo.

### Ajustements (coordinateur, 2026-10-02)

- Verso : en-tête « Réponse » (résultat attendu), puis filet (`hr`, bord haut seul) et intitulé
  « Correction » au-dessus de `CorrectionView` ; sans correction, ni filet ni intitulé. Carte de
  cours : « Verso » inchangé. `CorrectionCard` non modifiée (son verso ne porte que la correction).
- Recto `interactive` : le bandeau affiche le statut global du barème (`globalVerdict`, Juste /
  ½ point / Faux), le même que le badge du verso ; le message `validateAnswer` (« Correct ! » /
  « Incorrect ») n'est plus affiché, son `feedback` reste dessous. `isCorrect` transmis à
  `onAnswerSubmit` inchangé.
- Tests : +4 (`FlashCard-resultat-attendu`, rouges avant), titre adapté dans `FlashCard.svelte.test`.

### Doutes

- QCM sans réponse : cases ☐ affichées devant chaque choix (rendu de `ExpectedResultView`).
- Case graphique : aucun composant ne dessine la droite graduée (`GraphicalInput` n'est importé
  nulle part) ; le verso montre « Réponse attendue : 2,5 » (R8), comme avant en substance.

### Alignement sur la relation (demande de David, 2026-10-02)

- R1 faux / forme non optimale : comparaison + solution en UN bloc
  `\begin{aligned} lhs &\mathrel{\neq} réponse \\ &= solution \end{aligned}` (façon TinyMath),
  `alignedComparisonMarkdown` (`expected-result-markdown.ts`). Le `=` tombe sous le `≠`.
- Sécurité : réponse déjà neutralisée en amont ; dans le bloc, `&` → `\&`, `\\` → espace, `$`
  retiré (défense), accolades rééquilibrées. Toujours dans une formule.
- `ExpectedResultView` : la ligne `solution` d'une comparaison n'est plus rendue à part ; statut
  en toutes lettres à côté du bloc, remarque R2 dessous ; R7 → « La réponse encadrée n'est
  qu'une réponse possible. » sous le bloc. Bloc `overflow-x: auto` (formule longue défilable).
  R1 juste et R1 sans réponse : une ligne, inchangés.
- Tests : `expected-result-markdown` (+3), `ExpectedResultView` (faux et R2 réécrits sur la
  structure alignée, + `&`/`\\` hostiles, + formule longue), `FlashCard-resultat-attendu` adapté.
