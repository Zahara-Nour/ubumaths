# Correction concise / détaillée — progression

Décision : [ADR 0017](../adr/0017-correction-concise-et-detaillee.md) · glossaire : `CONTEXT.md` (Correction
concise, Correction détaillée, Détail).

## Spécification validée par David (2026-10-02)

- **D1** Transformation en version concise / détaillée :
  `\detail{X}` → rien / `X` ; `> [!méthode|rappel|attention] …` → rien / encadré typé ;
  `[X]{.rappel|.méthode|.attention|.calcul}` → rien / `X` mis en valeur.
- **D2** Accolades imbriquées respectées (`\detail{&= \dfrac{1}{2} \\}`).
- **D3** Variables `{{a}}` intactes (remplacées comme aujourd'hui).
- **D4** Sans marqueur : versions identiques, **pas d'interrupteur**.
- **D5** Marqueur mal formé : l'élève voit la version détaillée telle quelle ; le prof voit un message
  d'auteur (comme courbe / figure).
- **D6** Étape entièrement « détail » : disparaît en concis ; si tout est détail, la vue concise montre
  la réponse attendue (jamais de correction vide).
- **D7** Composant commun, ouvre en concis, interrupteur unique « Voir le détail / Masquer le détail ».
- **D8** Places : calcul dans le calcul ; méthode encadré avant ; rappel en marge (grand écran) /
  encadré dessous (téléphone) ; attention encadré d'alerte.
- **D9** Interrupteur accessible (clavier, `aria-expanded`).
- **D10** Aperçu de l'éditeur : voir les deux vues.
- **D11** Fiches PDF : mêmes marqueurs, réglage concise / détaillée du corrigé, transformation avant Typst.
- **D12** Mode B : concise = `summarized`, détaillée = `detailed`.
- **Q88** Interrupteur mémorisé sur l'appareil (localStorage, try/catch). **Q89** En classe : concise
  par défaut. **Q90** Lots : 1) transformation + composant + flash-cards / cartes de cours ; 2) autres affichages + aperçu prof ; 3) fiches PDF ; 4) mode B.

## Constats techniques

- Rendu maths = **MathLive** (`<math-span>`, `<math-div>`), pas KaTeX. Une macro MathLive `\detail`
  échoue en vue détaillée (`&` / `\\` dans l'argument) → transformation de texte **avant** le rendu.
- Les corrections sont des chaînes markdown (`correction.steps`) jointes puis rendues par
  `MarkdownRenderer` (FlashCard, CourseCardBack, CorrectionCard…).
- ubumark n'a ni encadré typé `> [!type]` ni attributs sur du texte `[…]{.x}` : à ajouter.

## Lot 1 — implémenté, NON commité (2026-10-02)

Fait :

- **Transformation** `src/lib/questions/correction-detail.ts` → `splitCorrectionDetail(md)` :
  `{ concise, detailed, hasDetails, conciseEmpty, errors }`. Blocs de code ```jamais touchés.
Appliquée APRÈS résolution des variables (dans le composant, sur l'instance) ; marche aussi avant
(accolades de`{{a}}`équilibrées, testé). Ménage du concis :`\\`avant`\end{…}`retiré,
formule`$\detail{x}$`retirée avec ses délimiteurs, lignes vides compactées.
Erreur (D5) →`concise = detailed`, `hasDetails = false`.
- **Types partagés** `src/lib/ubumark/utils/detail-kinds.ts` : `DetailKind`
  (`calculation | reminder | method | warning`), `CalloutKind`, libellés français, mots d'auteur
  insensibles à la casse et aux accents.
- **ubumark** : `BlockquoteNode.callout`, `TextNode.detail` / `MathInlineNode.detail` ; parseur de
  citations (premier niveau et dans les listes) et parseur en ligne.
- **Rendu** : `Blockquote.svelte` (encadré `role="note"` + libellé), `TextNode` / `ParagraphNode` /
  `InlineRenderer` (détail en ligne), `MarkdownRenderer` (rappel en marge par grille, seulement
  si le document a un rappel ; seuil revu, cf. revue #636), styles dans `components/markdown/detail-styles.ts`.
- **Composant** `src/lib/components/questions/CorrectionView.svelte` (+ `correction-view-preference.ts`,
  clé `chiphre:correction-detail`), branché dans `FlashCard` (verso) et `CourseCardBack`.
- Tests : `questions/__tests__/correction-detail.test.ts` (29), `ubumark/__tests__/parser/detail-callouts.test.ts`
  (10), `components/questions/__tests__/CorrectionView.svelte.test.ts` (10), +1 FlashCard, +1 CourseCard.

### Revue de la PR #636 — corrigé, NON commité

- **Intervalles** : formules `$…$` / `$$…$$` et code en ligne masqués (même longueur) avant de chercher
  `[texte]{.type}` ; `$]0;1[$` dans ou hors d'un détail ne casse plus rien. Le parseur masque aussi le
  code en ligne avant l'étape 0 (`maskSpans`, `INLINE_CODE_REGEX` dans `detail-kinds.ts`).
- **Affichages pas encore branchés** : version détaillée (`detailedCorrection`) dans `CorrectionCard`,
  `QuestionPreview`, `QuestionPreviewBaseCard`, `QuestionCompareView` (texte brut) et
  `worksheets/serie-automatismes.ts` (PDF). `student-worksheet-typst.ts` lit `exercise.correction`
  (exercices, pas les modèles de questions) : non touché.
- **Rappel en marge** : container query `@container (min-width: 40rem)` sur la zone de correction
  de `CorrectionView` (classe Tailwind `@container`) ; ailleurs (sans conteneur), rappel dessous.
- **Ménage concis** : formule devenue vide retirée (`conciseEmpty` juste) ; ménage segment par segment,
  hors blocs de code ; code en ligne jamais transformé ; `( )` vidées retirées ; `A \detail{B} C` → `A C`.
- **Coût linéaire** : accolades appariées en une passe, espaces de tête cherchées à rebours (bornées),
  formule ouverte suivie au fil des ajouts. Écart à la demande : on ne s'arrête pas au premier
  `\detail{` non fermé (le test D5 exige que les suivants, bien fermés, soient quand même déballés) ;
  l'appariement en une passe tient le budget (50 000 espaces / 20 000 `\detail{` < 200 ms). Messages
  d'erreur dédoublonnés.

### Écart à faire valider par David (D6)

Tout est détail ET aucune réponse attendue (carte de cours) : la vue « concise » montre la version
**détaillée**, sans interrupteur (jamais de correction vide). FlashCard ne passe pas de réponse
attendue (déjà affichée au-dessus). Comportement conservé tel quel en attendant sa décision.

Reste :

- Commit, PR (session principale).
- Aucune vérification visuelle réelle (marge, couleurs clair/sombre) : à regarder dans le navigateur.
- Hors lot 1 : interrupteur dans CorrectionCard et autres affichages + aperçu prof (lot 2), réglage
  concise / détaillée du PDF (lot 3 — le générateur Typst ignore pour l'instant `callout` / `detail`),
  mode B (lot 4).
