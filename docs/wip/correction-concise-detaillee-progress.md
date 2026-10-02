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

## Lot 1 — en cours
