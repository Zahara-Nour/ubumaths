# Chantier verdicts-flashcard — couleur des cases au recto de la FlashCard

## Reprendre ici

_Mis à jour le 2026-10-21, PR ouverte._

- **État** : correctif codé, tests verts, PR ouverte ; revue `code-reviewer` (opus) sur la PR.
- **Prochaine action** : CI verte + revue → merge, puis note dans `verifications-manuelles.md`, journal archivé.
- **En attente de David** : rien.
- **Pièges en cours** : ambre = couleur déjà choisie pour les cases sans unité (`InputState.unoptimal`).
- **Worktree / branche** : `../ubumaths-wt-verdicts-flashcard` · `fix/verdicts-flashcard`.

## Historique

### 2026-10-21 — origine

Écart laissé par la revue de #1574 (chantier correction-cases-unite) : `blank-verdicts.ts` comparait
le texte. David : « fais les corrections » (avec les commentaires « Compute Engine » périmés).

### 2026-10-21 — mesure (sonde jetable, supprimée)

Recto (`computeBlankVerdicts`) contre verdict détaillé du verso, sur les 25 modèles publiés à unité
(saisies de l'oracle) : **842 réponses justes ou perfectibles en rouge, 0 en vert** (texte `6\,m` contre
l'attendu `6[m]`). Hors unité : `3.1` pour `3{,}1`, `\dfrac{1}{2}`, `\frac12` rouges ; `(3{,}1)`,
`\frac{2}{4}` (perfectibles) rouges. Aucun cas vert au recto et faux au verso.

### 2026-10-21 — décision de David

Perfectible → « la couleur qu'on a choisie pour les cases sans unité » = ambre (`BlankInput`,
`MathPrompt`, `ExpectedResultView` : « forme à améliorer »). Vert = juste, rouge = faux, mauvaise
forme ou vide.

### 2026-10-21 — code

- `computeBlankColors` (`blank-verdicts.ts`) : statuts de `validateAnswerDetailed` ; `computeBlankVerdicts`
  garde sa forme `boolean[]` (8 fichiers de tests l'utilisent).
- `applyValidationToInputStates(…, unoptimalResults)`, prop `unoptimalResults` de `FillBlanksInput`.
- Preuves rouges sur l'ancien code : 8 tests (`blank-verdicts.test.ts`), 2 tests de rendu
  (`FlashCard-couleurs-cases.svelte.test.ts`).
- Commentaires « Compute Engine » → mathAST (`answer-validator.ts`, `validation-rule-evaluator.ts`,
  `questions/index.ts`, `types.ts`, `feedback.ts`).
