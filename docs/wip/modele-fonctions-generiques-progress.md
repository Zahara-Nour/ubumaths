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
| Validation : attendu `P'(2)`, élève `P'\left(2\right)`                    | juste avec l'option                                                    |
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

- (en cours)
