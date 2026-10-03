# Modèles de questions : fonctions génériques déclarées (`shared.genericFunctions`)

Branche `feat/modele-fonctions-generiques` — worktree `ubumaths-wt-fonctions-modele`.
Validé par David le 2026-10-03.

## Problème

Les exercices ont `generic_functions` ; les modèles de questions n'ont que la liste
par défaut du parseur (f, g, h, u, v, w, F, G, H). Dans un modèle, `P(x)`, `C(q)` sont
lus comme des PRODUITS, et `P'(2)`, `C'(x)` ne se lisent pas du tout.

## Spécification

- Option `shared.genericFunctions: string[]` (ex. `["P", "C"]`).
- Elle COMPLÈTE la liste par défaut (union) — différence voulue avec les exercices, dont
  la liste remplace les défauts. Dérivées (`P'`, `P''`) et réciproque (`P^{-1}`) permises.
- Règle des noms (schéma Zod) : UNE lettre ASCII (`A`–`Z`, `a`–`z`), sauf `e` et `i`
  (constantes d'Euler et imaginaire : `e(x)` changerait le sens de `e^x`… et de toute
  réponse). Pas de doublon, au plus 10 noms. Pas d'indice (`C_1`) : le parseur ne
  reconnaît une fonction générique que sur une lettre seule.
- Copiée telle quelle sur l'instance (`instance.genericFunctions`), absente sans l'option.
  C'est l'instance qui porte l'option jusqu'à la validation, l'affichage et le PDF.
- Sans l'option : comportement strictement inchangé (aucun appel ne reçoit de config).

## Cas (tests d'abord)

| Cas                                                                       | Attendu                                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Schéma : `["P","C"]`                                                      | accepté                                                                |
| Schéma : `"PQ"`, `"P1"`, `""`, `"e"`, `"i"`, doublon, 11 noms, non-chaîne | refusé (strict ET route serveur)                                       |
| Génération, énoncé `$P(x)$` et `$P'(1)$` avec `["P"]`                     | LaTeX d'un nœud `function` (`P\left( x \right)`, `P'\left( 1 \right)`) |
| Même énoncé sans l'option                                                 | inchangé (`P \left( x \right)` produit ; `P'(1)` laissé brut)          |
| Validation : attendu `P'(2)`, élève `P'(1+1)` (`form: off`)               | juste avec l'option ; faux sans (comparaison texte, inchangé)          |
| Barème (`gradeQuestion`) et `runTestSpec`                                 | même verdict que `validateAnswer`                                      |
| Instance publique (évaluation)                                            | transporte `genericFunctions` (affichage), rien d'autre                |

## Points de branchement

- `src/lib/questions/generic-functions.ts` — schéma des noms + `templateGenericFunctions()`
  (union avec les défauts) : source unique.
- Génération : `content-resolver` (zones `$…$`, formats de réponse, `expectedAnswerLatex`),
  `correction-resolver`, `correction-generator` (étapes Mode B), `instance-generator`.
- Validation : `src/lib/math` (`areEquivalent`), `answer-validator` (valeur).
- Affichage : composants de `src/lib/components/questions` (prop `genericFunctions` de
  `MarkdownRenderer`), question publique d'évaluation.
- Éditeur : champ « Fonctions » du formulaire de modèle.

## Point ouvert (hors périmètre autorisé)

`checkForm` (`mathAST/cosmetic-transforms.ts`, interdit dans ce chantier) relit la réponse
et l'attendu avec les défauts : une réponse `P'(2)` juste en valeur y échoue (« Parse
error ») → mauvaise forme. Correctif additif : `CheckFormOptions.genericFunctions` passé à
ses `parseLatexSafe`. Test `it.fails` posé pour le signaler.

## Journal

- `b76b31b2b` tests rouges (19 rouges, sortie gardée hors dépôt).
- `4526d9fec` option, génération, validation, barème, specs, schémas (strict + route serveur).
- `14509afe5` écran (QuestionCard, FlashCard, CorrectionCard, CorrectionView, CourseCardView,
  CourseCardBack, MultipleChoiceInput, FillBlanksInput, aperçus admin), champ « Fonctions » de
  l'éditeur, séries d'automatismes (`buildSerie` → `generic_functions` de l'exercice figé).
  Test navigateur `fonctions-declarees.svelte.test.ts` rouge prouvé en remettant les
  composants d'origine (copie, pas `git checkout`).
- Non-régression : suites serveur questions/utils/math/worksheets/server/api (627 fichiers),
  client questions + question-inputs (21 fichiers) vertes ; `question:specs --file` sur les 195
  JSON de `scripts/questions` : sortie identique main / branche (3156/3156 specs) ; PRODUCTION
  lecture seule : 801 modèles, 7075 specs, verdicts identiques octet pour octet (aucun modèle
  n'utilise encore l'option : cette mesure prouve la non-régression, pas la fonctionnalité).
- `check:incremental` 0 erreur, `lint:fast` propre.

## Restes

- `checkForm` (cf. point ouvert) — `it.fails` dans `generic-functions-template.test.ts`.
- Relire en LaTeX `P\left( x \right)` comme une fonction dépend du chantier parallèle du
  parseur (`f\left(1\right)`) : la réponse MathLive `P'\left(2\right)` en dépend aussi.
- Non branchés (pas de cas réel) : `required-form-validator` (formes product/sum…),
  `{{eval:…}}` et conditions (une fonction déclarée n'y a pas de valeur), `evaluateExpression`.
