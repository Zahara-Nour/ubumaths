# Défauts d'affichage élève / prof (branche `fix/affichage-eleve`)

Worktree : `../ubumaths-wt-g1-affichage`. Trois défauts visibles, aucune migration, aucune RLS.

## 1. Message d'une règle de validation jamais montré (`rulesSuffice`)

- **Cause** : `validateSingleBlank` (`src/lib/utils/answer-validator.ts`) jette le message de la règle
  échouée en mode `rulesSuffice` (`return { isCorrect: false }`). Motif d'origine (b7b1f1bc4, 2026-09-26) :
  les messages génériques étaient en anglais et « répéteraient la consigne » (« 5 n'est pas un diviseur
  de 12 »). La `description` écrite par l'auteur d'une règle `custom` était perdue avec eux.
- **Correction** : en `rulesSuffice`, seule la `description` d'auteur d'une règle `custom` remonte, et
  seulement si la réponse a été lue comme un nombre et la règle effectivement évaluée. Les messages
  génériques (diviseur, intervalle…) restent tus (décision du 2026-09-26 inchangée) ; une réponse non
  numérique / illisible garde son retour actuel. Le plumbing existant fait le reste : `feedback` (une
  case) / `blankFeedback` (plusieurs cases) → FlashCard / FillBlanksInput ; serveur : `gradeBlanks`
  (`grading.ts`) recopie les mêmes champs, donc écran et serveur disent la même chose.

## 2. Consigne « Coche toutes les bonnes réponses. »

- Consigne = décision de David (Q107 b, `docs/wip/qcm-multi-vrai-faux-progress.md` V2). Seul le TEXTE
  change : « Coche la ou les bonnes réponses. » — vraie avec une seule bonne réponse, ne révèle pas leur
  nombre.

## 3. Fonctions déclarées d'un exercice non transmises au rendu

- `exercises.generic_functions` n'atteignait pas `MarkdownRenderer` dans `student/worksheets/ExerciseModal`,
  `student/worksheets/ExerciseDisplay` (sans importeur) et la page d'aperçu prof d'une affectation.
  Les données arrivent déjà (API élève et API d'aperçu lisent la colonne).
- Config construite par `genericFunctionsConfig()` (`markdown/utils/math-utils.ts`), source unique déjà
  utilisée par `exercises/ExerciseDisplay` et le PDF ; la page d'édition prof la réutilise.

## État

- [ ] Tests rouges (validateur, barème, FlashCard, consigne QCM, rendu `P(x)`)
- [ ] Corrections
- [ ] Non-régression + mesure prod `test_specs`
