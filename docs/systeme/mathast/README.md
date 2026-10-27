---
couvre:
  - 'src/lib/mathAST/**'
---

# mathAST — le moteur de calcul symbolique

> Code : `src/lib/mathAST/` · Agent spécialisé : `mathast-expert` (`.claude/agents/mathast-expert.md`).
> Cette page remplace la vue d'ensemble de juin 2026 et le `README.md` de `src/lib/mathAST/`
> (janvier), écrits avant `tidy`, la réécriture de `simplify()` (#378 → #389) et l'ADR 0007.
> **Vérifié contre le code le 2026-10-11** (domaine : zéros transcendants, 2026-10-15 ; unité × terme, durées juxtaposées, 2026-10-20 ; virgule et point-virgule, 2026-10-21 ; symétrie et égalité de la console, 2026-10-22 ; `tidy` `order` et ordre des facteurs, `\times` devant `3^x`, 2026-10-23 ; espaces de groupement (règle du BIPM, réglage « Espaces dès 4 chiffres »), 2026-10-23 ; registre des règles de superflu, 2026-10-23 ; forme finale de f′, `(eˣ)²` regroupé avec `e^{2x}` par `auto`, racines n-ièmes dans `sqrt-square`/`square-sqrt`/`sqrt-quotient`, 2026-10-23 ; f′ factorisée de l'étude des variations, 2026-10-23 ; valeur exacte à afficher commune, 2026-10-24 ; une fonction en un nombre rangée comme un coefficient, Q30, 2026-10-24 ; `eˣ·eˣ → e^{2x}`, Q29, 2026-10-24 ; des termes à domaine restreint ne s'annulent pas, S3, 2026-10-24 ; forme demandée par l'énoncé, D4, 2026-10-24 ; sommes sous-entendues de f′ ouvertes, lot 5f-1, 2026-10-24 ; étapes de limite : décimaux gardés, développé et factorisé montrés, lot 5f-3, 2026-10-25 ; valeur d'une intégrale bornée à décimaux, Q49, 2026-10-25 ; étapes du solveur écrites comme la réponse, lot 5f-4, 2026-10-25 ; inéquations aussi, Q50, 2026-10-25 ; inconnue divisée multipliée, membre factorisé défait, Q51-Q52, 2026-10-25 ; puissance d'exposant n/2 écrite avec une racine carrée par `tidy`, quotient et produit de puissances de même base dans `.simplifier`, lot 5f-5, 2026-10-25 ; évaluateur flottant unique des limites (`sin²`, `cos⁻¹`, `∛`), lot 6a, 2026-10-25 ; conditions de `tidyWithConditions` écrites aux points irrationnels, `tan`/`arcsin` (tidy-conditions § 5, 2026-10-26) ; limites en −∞ de (−∞)ⁿ, u^{p/q} hors du domaine, inverse d'une somme à conjuguer, V67-V69, 2026-10-26 ; eᵘ d'une forme indéterminée, polynôme × exponentielle, V68, 2026-10-27 ; u^{−n} en un point où u s'annule lu 1/uⁿ, zéro sans signe d'un facteur sin / cos d'argument non borné, V70-V71, 2026-10-27 ; signe inconnu d'un paramètre jamais lu positif par `normalizeExtended`, coefficient littéral du terme dominant, limites-parametres, 2026-10-27 ; valeurs remarquables de sin, cos, tan dans `reduire`, `auto`, `.développer`, `.résoudre`, 2026-10-27).

## À quoi ça sert

C'est le moteur mathématique de Chiphre : il **lit** une expression (LaTeX de MathLive ou
syntaxe maison des gabarits), la **représente** en arbre immuable (`MathNode`), **calcule**
dessus (mise au propre, simplification, équivalence, dérivée, primitive, limite, signe,
variations, résolution, domaine, unités) et **écrit** le résultat (LaTeX, syntaxe maison),
avec au besoin les **étapes pédagogiques** en français, adaptées au niveau scolaire.

Deux usages portent tout le reste :

- **la correction des réponses d'élèves** : `areEquivalent` (la valeur est-elle juste ?)
  puis `checkForm` (l'écriture est-elle acceptable ?). Elle tourne **dans le navigateur**
  (ADR 0001) ;
- **la génération et l'affichage** : gabarits de questions, corrections détaillées,
  atelier, grapheur et géométrie.

Bibliothèque pure : ni base de données, ni réseau, ni `eval` JavaScript. Consommateurs
principaux (imports de `$lib/mathAST` hors du module) : `src/lib/atelier/`,
`src/lib/questions/`, `src/lib/geometry-core/`, `src/lib/math/`,
`src/lib/components/markdown/`, `src/lib/ubumark/`,
`src/lib/grapheur/`.

Taille au 2026-10-10 : 502 fichiers `.ts` hors tests (~188 000 lignes), 445 fichiers de
test, ~14 000 cas (`it(`/`test(`).

## Carte du code

### Fichiers racine

| Fichier                                 | Rôle                                                                                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                              | l'union `MathNode` (29 variantes), `NodeMetadata`, styles d'affichage                                                                                                                                                                                                |
| `factory.ts`                            | constructeurs de nœuds, regroupés dans l'espace de noms `MathAST`                                                                                                                                                                                                    |
| `guards.ts`                             | prédicats de type (`isAddition`, `isDelimiter`, `isFraction`, `isMinusOne`…)                                                                                                                                                                                         |
| `transforms.ts`                         | `mapNode`, `mapNodeTopDown`, `findNodes`, `findFirst`, `replaceNode`, `withMetadata`, `getChildren`, `cloneNode`, `countNodes`, `getDepth`, `stripUnnecessaryBrackets`                                                                                               |
| `visitor.ts`                            | `visitAST`, `transformAST`                                                                                                                                                                                                                                           |
| `flatten.ts`                            | `flattenSumShallow/Deep`, `flattenProductShallow/Deep`, `unflattenSum`, `unflattenProduct`, `unflattenRelationChain`, `flipSign`                                                                                                                                     |
| `equivalence.ts`, `equivalence-core.ts` | `areEquivalent` : le **décideur** de la correction                                                                                                                                                                                                                   |
| `assumptions.ts`                        | hypothèses de l'énoncé (« x > 0 », « n entier », ADR 0012) traduites pour le décideur                                                                                                                                                                                |
| `digit-grouping.ts`                     | **la** règle des espaces de groupement (BIPM : facultative jusqu'à 4 chiffres, exigée dès 5, chaque côté de la virgule à part ; `SCHOOL_MIN_DIGITS_FOR_GROUPING` = 4 pour un modèle « Espaces dès 4 chiffres »), partagée par le juge, `french-math.ts` et l'atelier |
| `cosmetic-transforms.ts`                | `checkForm` et ses transformations (contraintes de forme de la correction) ; tests d'écriture d'un nombre (`isSimpleNumberLatex`, `isNumberOrNumberFractionLatex`, `isQuantityValueLatex` : fraction écrite `\frac` seulement, `6\div2` est un calcul)               |
| `superflu/`                             | Registre des règles de superflu (`rules.ts` : identifiant, libellé, message, transformation) et leurs transformations (`transforms.ts`), lus par `checkForm`, l'éditeur de modèles, les messages et le schéma Zod                                                    |
| `decimal-comma.ts`                      | la virgule décimale nue (`3,14`) : nombre ou séparateur                                                                                                                                                                                                              |
| `latex-generator.ts`                    | `toLatex`, `LatexGenerator` (options `renderMetadata`, `preserveHoles`) ; `\times` d'un produit implicite qui ne se relirait pas (`3 \times 3x^2`, `x \times 3^x`, `juxtaposesDigits`)                                                                               |
| `custom-generator.ts`                   | `toCustom`, `CustomGenerator` (syntaxe maison)                                                                                                                                                                                                                       |
| `pretty-print.ts`                       | `prettyPrint` (débogage)                                                                                                                                                                                                                                             |
| `index.ts`                              | point d'entrée `$lib/mathAST`                                                                                                                                                                                                                                        |

### Sous-dossiers

| Dossier                                                                                                                             | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Lire et écrire**                                                                                                                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `parser/`                                                                                                                           | `parseLatex`/`parseLatexSafe` (`latex/` : Pratt par défaut, `rd` en option) ; `custom/` : syntaxe maison (`parseCustom`), motifs (`parsePattern`), règles (`parseRule`), contraintes ; `security.ts` (plafonds)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `cache/`                                                                                                                            | `ParseCache`, LRU exporté mais **branché nulle part**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Mettre au propre, comparer**                                                                                                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `tidy/`                                                                                                                             | `tidy` : mise au propre **sans jamais développer** ; raconte ses gestes (`TidyStepRecorder`) ; grandeurs (`unitChoice`) ; ordre des termes rangé ou écrit (`order`, `tidyTerms`) ; domaine gardé (S3 : `x/x` et `ln(x) − ln(x)` restent, `tidy/sign.ts`) ; ordre des facteurs : valeurs (`√2`, `ln 2` : comme un coefficient, Q30), lettres, parenthèses (ordre écrit), fonctions, exponentielles (Q13, `tidy/order.ts`, [tidy-spec.md](tidy-spec.md) étape 8) ; ordre des termes : le degré ne compte que les inconnues, une constante est de degré 0 (`x + √2`, `x² + 2x + √5`, `x + 1 + √2`, Q14)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `simplify/`                                                                                                                         | `simplify` : `tidy` + règles + « développer seulement si moins cher » (`computeCost`, `costFunction` injectable)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `normal/`                                                                                                                           | `normalize` → `NormalForm` (forme normale rationnelle ; la racine d'une fraction numérique y est rationalisée, `√(1/3) = √3/3` — [convention](convention-equivalence.md#racine-dune-fraction-numérique--même-valeur-que-sa-forme-rationalisée)), `denormalize`, `canonicalForm` / `exactRational` / `polynomialCoefficients` (`canonical-form.ts` : la forme normale réécrite en arbre et ce qu'on y lit, usage interne), `equivalenceForm`, `hashMathNode`, `nodesEqual`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pattern/`                                                                                                                          | motifs (`P`, `tryMatch`), règles, jeux de règles, `verifyForm` — voir [pattern-matching.md](pattern-matching.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `common/`                                                                                                                           | moteur de réécriture `rewrite`, `numericNode`, interruption (`AbortError`), bases des enregistreurs et rendus d'étapes, constructeurs simplifiants (`common/simplify.ts`), `e`, `i` jamais variables (`common/reserved-letters.ts`), signe d'une constante sur sa valeur (`constantSign`, `common/constant-sign.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `numtype/`                                                                                                                          | inférence du type numérique (entier, rationnel, réel…) et `TypeContext`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Calculer**                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `eval/`                                                                                                                             | `substitute`, `evaluate`, `evaluateAstWithModifiers` (`{{eval}}`, grandeurs comprises), `exactValueToShow` (`exact-value.ts`, la valeur exacte à afficher commune, voir ci-dessous), `compile`/`createSafeEvaluator` ; `forbiddenValue` (`forbidden-value.ts`, `.eval`) : la cause, la plus intérieure, qui prive un calcul sans lettre de valeur réelle (dénominateur nul, racine d'indice pair d'un négatif, logarithme ⩽ 0, 0 à une puissance négative, exposant non entier d'un négatif, tangente où cos s'annule, arcsin/arccos hors de [−1 ; 1]), lue exactement — à ne pas confondre avec `integration/forbidden-value.ts` ; `root(a, n)` (forme du solveur et de `denormalize`) s'évalue et se compile comme `\sqrt[n]{a}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `differentiation/`                                                                                                                  | `differentiate`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `integration/`                                                                                                                      | `integrate` (primitives, intégrales définies, numérique)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `limits/`                                                                                                                           | limites (dont `analyzeSign` unilatéral de `limits/one-sided.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `solve/`                                                                                                                            | `solve`, `solveEquation`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `reciprocal/`                                                                                                                       | `computeReciprocal` : f⁻¹ sur un intervalle, ensembles de départ et d'arrivée, étapes, refus (non bijective — sin, cos, tan : arcsin… nommée, sans commande —, constante, ne sait pas) — voir [reciproque.md](reciproque.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `domain/`                                                                                                                           | `computeDomain`, `findZeros`, intervalles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `factor/`                                                                                                                           | noyau exact de factorisation (ADR 0024) : `factorPolynomial`, `factorizationToNode` ; lecture exacte des polynômes, racines ±p/q et Δ partagées avec `domain/` — voir [§ factor/](#factor--le-moteur-commun-de-factorisation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `sign/`                                                                                                                             | `analyzeSign` (tableaux de signes)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `variations/`                                                                                                                       | `computeVariations`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `taylor/`                                                                                                                           | développements de Taylor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `analysis/`                                                                                                                         | continuité (`analyzeContinuity`), périodicité, symétrie (f(−x) comparé à ±f(x) par la forme d'équivalence, ADR 0006), classification, détecteurs d'identités (`structures.ts`, lus par `algebraicFactoringRules`) ; zéros hybrides exact + balayage (`roots.ts`, `critical-points.ts`), où un échantillon presque nul ne compte que si \|f\| y est un minimum local (`touchesZero`, `near-zero.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `piecewise/`                                                                                                                        | `extractPiecewiseBoundaries` : ruptures d'une fonction par morceaux (consommé par `geometry-core`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `matrix/`                                                                                                                           | opérations matricielles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `units/`                                                                                                                            | unités physiques (`parse`, `format`, conversions, `selectBestUnit`) ; dimension `information` (octet, bit, multiples nommés un à un, 2026-10-13 ; `Ko` accepté pour `ko`, 2026-10-18) — doc : `units/README.md`, notation : [notation-unites.md](../../pratiques/notation-unites.md), contrat : [grandeurs.md](../grandeurs.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `dimensional/`                                                                                                                      | analyse dimensionnelle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Raconter**                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pedagogical-simplify/`                                                                                                             | `generatePedagogicalSimplifySteps` : quatre intentions (`SimplifyIntent`) ; `explainExpansion` (`expand-explained.ts`) : la seule rédaction montrée de `developper` (atelier, corrections, démo), par `writeExpandSteps` (`expand-steps.ts`, ordre du manuel `expand-order.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `pedagogical-solve/`                                                                                                                | `generateEquationSteps`, `generateInequalitySteps` ; paliers par tables `STRATEGIES*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pedagogical-arithmetic/`, `pedagogical-differentiation/`, `pedagogical-integration/`, `pedagogical-limits/`, `pedagogical-domain/` | `generatePedagogical…Steps` du domaine                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pedagogical-evaluate/`                                                                                                             | types seuls, aucune logique                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `structure/`                                                                                                                        | `structureFromLatex`, `buildStructure` : arbre des sous-expressions vu par l'élève (sommes et produits aplatis, signe « − » à la somme, `signs` gardés pour la lecture) et LaTeX marqué `\class{ubs-n<id>}{…}` au rendu identique à `toLatex` ; lecture en français (`readingOf`) et message « 6e ou avant » (`parenthesesAdvice`) ; déplacer une partie dans son groupe, glisser-déposer (`rearrange.ts` : `movableGroupOf`, `movedLatex`, `expressionLatex` pour la formule redessinée pendant le glisser) ; outil « Structure d'une expression » (`/dev/structure`), voir [structure-expression.md](structure-expression.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Outils**                                                                                                                          |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `cli/`                                                                                                                              | `pnpm math` (`cli/cli.ts`) : REPL ; moteur web de Calcul (`cli/web/`, allégé de ce que seule `/cas` lisait le 2026-10-13, puis de sa sortie HTML `outputHtml` au retrait de `/calc` le 2026-10-25) ; grandeurs de la console (`cli/quantities.ts`, contrat : [grandeurs.md](../grandeurs.md)) ; arguments à mots-clés des commandes (`cli/core/variable-argument.ts`, `readCommandArguments` → `CommandArguments`) : pour `.eval`, `assignments`, la liste des lettres et valeurs dans l'ordre tapé — `en x=3`, plusieurs lettres séparées par « ; » (`en a=1,5 ; b=2`, E6, 2026-10-14), virgule décimale lue en point ; refus de la lecture : virgule entre deux valeurs (« Sépare les valeurs avec « ; » … »), lettre donnée deux fois, « ; » final sans valeur (« Il manque la valeur de b : … », « x a déjà sa valeur … ») ; refus de `cli/commands/eval.command.ts` : lettre absente de l'expression, valeur qui n'est pas un nombre, lettre sans valeur (« Il manque la valeur de b : … ; b=3, par exemple. »), valeur interdite citant toutes les valeurs (« Pour $a = 1$ et $b = 0$, ce calcul n'a pas de valeur : … ») ; fonction usuelle sans parenthèses (`sin x`, lu s·i·n·x) : `bareFunctionName` (refus des commandes du CLI, « Écris sin(x) avec des parenthèses. ») et `bareFunctionRefusal` (refus de l'atelier, qui cite le fragment tapé : « « ln 2x » : écris ln(2x) avec des parenthèses. », V59 ; refuse aussi le nom collé, `lnx`, `cost`, `ln2x` : `GLUED_FUNCTION`, que `bareFunctionName` ignore) — doc : `cli/README.md`, `cli/web/README.md` |
| `__tests__/`                                                                                                                        | tests transverses (garde-fous, panel)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Le pipeline

```
LaTeX (MathLive) ── parseLatex ──┐
syntaxe maison ──── parseCustom ─┤
                                 ▼
                          MathNode (immuable)
     ┌───────────────┬───────────┼──────────────────┬───────────────────────┐
     ▼               ▼           ▼                  ▼                       ▼
   tidy          simplify    areEquivalent      checkForm          differentiate / solve /
 (au propre,   (tidy+règles  (equivalenceForm   (forme de la       limits / sign / …
 sans dévelop.) +coût+tidy)   + repli numérique) réponse)          + pedagogical-*
     └───────────────┴───────────┴──────────────────┴───────────────────────┘
                                 ▼
                     toLatex / toCustom / prettyPrint
```

**Trois formes, trois rôles** (ne pas les confondre) :

| Fonction          | Rend         | Développe ? | Sert à                                                                                                                                   |
| ----------------- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tidy`            | `MathNode`   | jamais      | écrire proprement : `2x+3x−x → 4x`, `(x+1)²` reste, un décimal reste décimal (`0,5+0,25 → 0,75`). Spec : [tidy-spec.md](tidy-spec.md) §A |
| `normalize`       | `NormalForm` | toujours    | calcul exact, forme canonique (`denormalize` pour revenir à un arbre)                                                                    |
| `equivalenceForm` | `NormalForm` | toujours    | **comparer seulement** : y vivent les réductions trigonométriques (ADR 0006)                                                             |

### Quelle fonction pour quel besoin

Carte dressée par le chantier simplify-carte (2026-10-22 → 2026-10-25, lots 1 à 7,
[ADR 0032](../../adr/0032-la-forme-affichee-se-choisit-par-le-but.md)). On part du **besoin** de
l'appelant, jamais du nom d'une fonction qui « a l'air de convenir ».

| Besoin                                                                                | Appeler                                                                                                                                                                                            | Ne pas faire                                                                                                                      |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Comparer** deux expressions (égalité, nullité, dédoublonner, parité)                | `areEquivalent` (ne lève jamais, repli flottant) ; `equivalenceForms` + `normalFormsEquivalent` quand l'échec doit se voir (égalité `a = b` de la console, coordonnées de vecteurs et de matrices) | `normalize` + égalité (rate `sin²+cos²`, `2^{x+1} = 2·2^x`) ; `tidy` + égalité d'écriture (dépend de l'ordre des facteurs)        |
| **Juger** la réponse d'un élève                                                       | la chaîne de `validateAnswer` : valeur (`areEquivalent`), puis forme (`checkForm`, règles du registre `superflu/`, [questions.md](../questions.md))                                                | `tidy` comme juge : il range (`3+x` serait une faute), calcule (`400+80`) et ne nomme pas la faute                                |
| **Écrire** une expression avec variable                                               | la **forme cible** du contexte (table ci-dessous), puis `tidy` ; `tidy({ order: 'kept' })` / `tidyTerms` quand l'ordre écrit compte                                                                | `denormalize(normalize())` à l'écran : développe, met au même dénominateur, réécrit les décimaux, simplifie en perdant le domaine |
| **Écrire** une valeur exacte (sans variable)                                          | `evaluate` puis `exactValueToShow` (§ ci-dessous)                                                                                                                                                  | une mise au propre locale avec ses propres gardes (il y en avait 7, aux gardes divergentes)                                       |
| **Appliquer une consigne**, avec étapes (réduire, développer, factoriser, simplifier) | `generatePedagogicalSimplifySteps` avec son intention (ADR 0007) ; « développer » est rédigé par `writeExpandSteps` / `explainExpansion`                                                           | `simplify` : pas d'étapes                                                                                                         |
| **Calculer en interne** (coefficients, degré, discriminant)                           | `canonicalForm` (`denormalize ∘ normalize`), `exactRational`, `polynomialCoefficients` (`normal/canonical-form.ts` ; le nom est juste : une forme normale ; David, 2026-10-22)                     | montrer sa sortie à l'élève quand l'expression a une variable                                                                     |
| **Une valeur approchée**                                                              | `computeNumericValue` (fini ou `null`), `computeNumericValueOrInfinity` (±∞ permis : bornes, images de la réciproque), `compile` dans les boucles (tracé, échantillonnage) ; invariant 11          | un `try/catch` + `isFinite` local ; une décision « vaut 0 » sur un flottant (le juge et `isZeroTerm` restent sur les rationnels)  |

**La forme cible se choisit par le but, déclaré par l'appelant** ; le moteur ne le devine jamais.
La même dérivée est réduite pour répondre à « calculer f′(x) » et factorisée pour lire son signe.
`auto` ne sert que là où il n'y a pas de but (`.simplifier`).

| Contexte                                                                                         | Forme cible                                                                   | Où                                                                     |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Valeur exacte : Atelier, `.eval`, `{{eval}}`, limite, solutions, tableau de variations, grapheur | la plus calculée, décimal gardé (S1)                                          | `exactValueToShow`                                                     |
| Expression littérale tapée dans l'Atelier                                                        | `tidy`, ordre de l'élève, ni identité ni développement (D3)                   | `resultToShow` (`atelier/render.ts`), [atelier.md](../atelier.md)      |
| Dérivée, étapes                                                                                  | la règle telle quelle, puis « On simplifie »                                  | `withTidyStep`                                                         |
| Dérivée, réponse finale                                                                          | réduite, exponentielle commune en facteur, rien d'autre de factorisé (D1)     | `finalDerivative` (`final-form.ts`)                                    |
| f′ dans l'étude des variations                                                                   | factorisée pour lire le signe, numérateur d'un quotient seul (D2)             | `displayedDerivatives` (`variations/display.ts`)                       |
| Primitive                                                                                        | ordre de la règle, exponentielle commune en facteur, un seul registre décimal | `tidyTerms`, `developAndFactor`, `withUniformCoefficients`             |
| Dérivée ou primitive dont l'énoncé demande une forme                                             | la forme demandée (D4)                                                        | `finalForm` du modèle, `requested-form.ts`                             |
| Étapes d'une limite                                                                              | décimaux gardés, développé et factorisé montrés                               | lot 5f-3, § Le moteur de réécriture                                    |
| Étapes du solveur                                                                                | écrites comme la réponse                                                      | `stepsAsShown`                                                         |
| `.développer`, `.factoriser`, corrections « réduire / développer / factoriser »                  | l'intention de la consigne                                                    | `generatePedagogicalSimplifySteps`, `tidyEachFactor` pour `factoriser` |
| `.simplifier` (calcul libre)                                                                     | la plus propre (`auto`)                                                       | seul contexte sans but                                                 |

**`simplify(node, options)`** (`simplify/simplify.ts`) tourne sur le moteur `rewrite`
(`common/rewriting-engine.ts`), stratégie `cost-fixpoint`. Par itération : `tidy` →
règles de motif (`absSimplifyRules`, `trigSimplifyRules`, `hypSimplifyRules`, coupables par
`enableAbs`/`enableTrig`/`enableHyperbolic` ; plus d'identités remarquables depuis le
2026-10-23 : `simplify` ne factorise jamais, ADR 0007) → `tidy`, puis le candidat `tidy(normalize(…))` ne remplace la forme que
s'il est **strictement moins cher**. C'est la seule place de `normalize` dans `simplify`.
Mesuré : `simplify((x+1)²)` garde `(x+1)²`, `simplify((x+1)²−x²)` rend `2x+1`.

**`areEquivalent(a, b, options?)`** : `equivalenceForms` puis `normalFormsEquivalent` ;
repli numérique (`evaluate` en mode décimal) si la normalisation échoue. Sens exact
(domaines, intervalles, équations, vecteurs…) : [convention-equivalence.md](convention-equivalence.md).
Ni `simplify` ni `pedagogical-simplify` ne sont sur ce chemin.

**`checkForm(réponse, attendu, contraintes, options?)`** (`cosmetic-transforms.ts`) :

1. chaîne : `removeZeros` (contrainte `zeros`), `checkSpacesViolation` (`spaces` : espace
   exigée dès 5 chiffres, dès 4 avec l'option `spacesFromFourDigits` ; une espace mal placée,
   `10 24`, est toujours une faute — `digit-grouping.ts`), `removeSpaces`, `normalizeDecimalComma` ;
2. `parseLatexSafe` ;
3. arbre, dans cet ordre (`buildASTPipeline`) : unifications de notation sans contrainte
   (`e` : forme unique `euler()`, `\exp(u)` lu `e^{u}` ; `∞`, angles en π, complexes, fractions de monômes, `|x|` sous hypothèse) →
   les règles de superflu, dans l'ordre de leur registre (`superflu/rules.ts`, transformations
   dans `superflu/transforms.ts`) : `reduceRadicalsAST` (`reducedRadicals`, extraction des
   carrés par `extractPerfectPower`, comme `tidy`) → `reduceFractionsAST` (`reducedFractions`) →
   `simplifyNullProductsAST` (`factorZero`) → `removeNullTermsAST` (`nullTerms`) →
   `stripUnnecessaryBrackets` (`brackets`) → `removeSignsAST` (`signs`) →
   `removeFactorsOneAST` (`factorOne`) → `removeMultOperatorAST` (`products`) →
   notations log/exponentielle → `sortTermsAndFactorsAST` ;
4. comparaison des `toLatex` (le signe `*` et `×` sont confondus) ; cas du pourcentage.

Chaque étape qui modifie la réponse lève sa contrainte (`strict`, `warn` ou `off`, défaut
`warn`). L'ordre est testé par `__tests__/cosmetic-transforms.test.ts` et
`superflu/__tests__/registre.test.ts` : ne pas le changer sans relancer ces fichiers.

`tidy` n'appelle pas ces règles : il réécrit l'expression entière. L'accord entre écrire et
juger est gardé par `tidy/__tests__/tidy-passe-le-juge.test.ts` : pour chaque règle du
registre, au moins un cas fautif, que le juge nomme et dont la sortie de `tidy` passe le juge.

### Deux moteurs de simplification, et leur fusion (ADR 0007)

Il y a aujourd'hui **deux moteurs** qui ne partagent pas leurs règles :

- `simplify` — `tidy` + quelques jeux de règles + `normalize` sous barrière de coût.
  Il a **le juge** (la fonction de coût).
- `generatePedagogicalSimplifySteps` (`pedagogical-simplify/pipeline.ts`) — une boucle de
  règles de motifs choisies par intention (`selectRulesForIntent`), puis une passe
  `normalize` enregistrée (`runNormalizePass`), sauf pour `factoriser` qui finit par la mise
  en facteur du contenu, puis les **stratégies qui racontent** de l'ADR 0024 (voir
  [§ Les stratégies](#les-stratégies-de-factoriser-lot-2)) et `tidy`. Le contenu est numérique,
  monôme **ou non polynomial** depuis le 2026-10-11 (`xe^x - e^x` → `(x-1)e^x`,
  `(x+1)^2-(x+1)` → `x(x+1)` ; le facteur non polynomial s'écrit après la parenthèse). Il a
  **le vocabulaire** (les étapes nommées).

L'ADR 0007 (acceptée le 2026-09-21) décide **un seul moteur, quatre politiques sur
« faut-il développer ? »** : `réduire` jamais (= `tidy`), `développer` toujours, `auto`
seulement si moins cher, `factoriser` jamais et factoriser. Nom envisagé en dernier :
`rewrite(node, { toward: … })`.

**État au 2026-10-23 : `reduire` et `auto` faits** (chantier simplify-carte § 33). Ni l'un
ni l'autre ne passe plus par `normalize` (`reduce-steps.ts`) : `reduire` = règles puis `tidy`
raconté (`2(x+3)`, `(x+1)²` restent) ; `auto` = `reduire`, puis les fractions de polynômes
simplifiées en montrant la factorisation et la condition (`(x²−1)/(x+1) = (x−1)(x+1)/(x+1) =
x−1`, pour `x ≠ −1`), puis le développement **s'il est plus court** (règle de `simplify`),
rédigé comme `.développer` ; jamais de factorisation dans le résultat. Mesuré : `auto` rend
ce que rend `simplify` sur tout le panel, sauf 3 écarts de capacité.

**État au 2026-10-25 : `developper` fait** (chantier normalize-usages, § 23 de simplify-carte).
Son résultat est `expand` (`pedagogical-simplify/expand.ts`), plus `normalize` : distribuer un
facteur et le signe −, multiplier les parenthèses, puissance entière d'une somme ; une division
par un nombre se distribue (`(x+1)/2 → ½x + ½`, étape « On distribue ½ ») ; un quotient à
dénominateur littéral garde sa barre, son numérateur développé (`1/(x+1) + 1` et `(x²−1)/(x+1)` :
rien à développer) ; l'argument d'une fonction et un exposant se développent sur place. Chaque
terme calculé et la somme réduite par `tidy` (décimaux gardés), coefficient devant (`½x²`),
puissances de e regroupées (`eˣ·e^{−x} = 1`, `(eˣ)³ = e^{3x}`). Aucune identité qui perd le
domaine : `e^{ln x}` reste, `(√u)² → u` seulement si un `√u` reste écrit dans le résultat
(`√x(√x+1) → x + √x`). Pas de phase A : une seule étape `expand` dit qu'il s'est passé quelque
chose. `expandedForm` (même module) calcule les termes des étapes (`expand-steps.ts`).
**Valeurs remarquables (2026-10-27, chantier valeurs-remarquables, S4 de l'ADR 0032).**
`reduire` et `auto` calculent sin, cos, tan aux multiples de π/6, π/4, π/3 (et 0), avec une étape
nommée : « On utilise une valeur remarquable : cos(π/3) = 1/2 », au pluriel quand plusieurs
valeurs tombent dans le même passage (`withValuesTogether`, `pipeline.ts`). Règles
`trigRemarkableStepRules` (`pattern/rule-sets/trig.ts`) : la période d'abord (`cos(7π/3)` →
« cos est 2π-périodique »), puis la valeur ; la parité (`sin(−π/6)`) passe par
`trigNegativeAngleRules`. Les trois familles forment `TRIG_REDUCTION_RULES` (`intent-rules.ts`),
actives avec `enableTrig` (lycée par défaut). Un angle en degrés est lu tel quel (`cos(60°)`,
`cos(−60°)`, `cos(420°)` → 60°) ; hors table (`cos(π/5)`, `cos(20°)`) ou non défini (`tan(π/2)`),
il reste écrit. `tidy` ne calcule aucune valeur (une ligne tapée seule garde `cos(π/3)`).
`developper` n'a pas de phase A : `explainExpansion` calcule d'abord les valeurs
(`generateRemarkableValueSteps`, `pipeline.ts`, qui ne garde rien si aucune valeur n'est
atteinte), puis développe — `(x + cos(π/3))²` → étape de valeur, puis `x² + x + 1/4` ; l'atelier
fait de même avant `.résoudre` (`atelier/solve-steps.ts`). Le rendu d'une étape sur une équation
n'enchaîne pas par « = » (`renderer.ts`).

Le tableau des écarts, pinné par un test : [panel-simplifications.md](panel-simplifications.md).
Spec d'`auto` (colonne « attendu ») : [tidy-spec.md](tidy-spec.md) §C.

### La valeur exacte à afficher (`eval/exact-value.ts`, lot 5c)

`evaluate` rend une forme de **calcul** (`⅓ π`, `½ √2`) ; `exactValueToShow(valeur, { source?, decimal? })`
en fait la forme de **lecture**, la même pour tous les affichages d'une valeur calculée : ligne de
l'Atelier (`resultToShow`, `render.ts`), `.eval`, `{{eval}}` (`formatExact`), valeurs du tableau de
variations (`exactImageToShow`, `abscissaToShow`), ordonnées du grapheur (`simplifyExact`),
limites (`writeLimitValue`) et solutions (`solve-latex.ts`, `solve.command.ts`, ligne `S = …` de
l'Atelier). `evaluate` reste inchangé pour les calculs internes.

- **Registre décimal** (S1) : avec une `source` décimale, la règle de `tidy` sur la source
  (`0,1+0,2 → 0,3`, `1/4+0,5 → 3/4`, `1,5/3 → 1/2`) ; ce que `tidy` ne calcule pas
  (`max(2,5 ; 1)`) ou `decimal: true` sans source (équation à décimaux) : décimal si l'écriture est
  finie. Un irrationnel n'a pas d'écriture décimale finie (`0,5√2 → √2/2`, Q22), y compris dans
  `{{eval}}` : une coordonnée de figure s'écrit `{{eval:x;d}}`, le langage des figures ne lisant pas
  le LaTeX.
- **Notation scientifique tapée** (`a × 10ⁿ`, 1 ≤ |a| < 10, n ≠ 0) gardée avec `keepScientific` — la saisie
  de l'Atelier seulement : dans `{{eval}}` la forme dépendrait du tirage — écrite avec ×, sans zéro final à
  la mantisse (Q24). Un nombre seul (valeur approchée du mode décimal) est rendu tel quel.
- **Choix de l'écriture** : un rationnel s'écrit depuis la valeur seule ; sinon, entre la valeur, la
  forme normale de la source et la source (chacune passée par `tidy`, `exp(u)` réécrit `e^{u}`, puis
  regroupée sur un dénominateur commun), la plus calculée — le moins d'appels de fonction sans variable
  hors radicaux (`cos(π/6)` calculé), puis le moins de puissances entières d'une somme (`(1+√2)^{100}`
  développée), puis le moins de radicaux au dénominateur (`1/(√3 − 1) → (1 + √3)/2`) —, puis la moins
  chère (`computeCost`, la plus tardive gagne à 20 % près).
- **Logarithmes** (décision de David, 2026-10-24, « B ») : le logarithme d'une puissance d'un seul
  entier s'écrit `n ln p` (`ln 8 → 3 ln 2`, `ln 1000 → 3 ln 10`, `ln(1/8) → −3 ln 2`, `ln 4 + ln 2 → 3 ln 2`) ;
  sinon il reste tel quel (`ln 6`, `ln 2 + ln 3`), aucune décomposition en facteurs premiers. Un
  décimal écrit reste (`ln(0,1)`), et un quotient de deux logarithmes — la borne d'un seuil — garde
  l'écriture de l'énoncé (« b » : `n > ln 1000 / ln 2`).
- **Dénominateur commun** (Q23) : une somme dont tous les termes sont des fractions de même
  dénominateur s'écrit en une seule (`1/2 + √5/2 → (1 + √5)/2`).

Tests : `eval/__tests__/exact-value.test.ts`, et un test par appelant (Atelier `valeur-exacte`,
`resoudre-valeur-exacte`, `variations/valeur-exacte-affichee`, grapheur `analysis-inputs`, limites
`valeur-ecrite`, `evaluate-with-modifiers`).

## factor/ — le moteur commun de factorisation

L'[ADR 0024](../../adr/0024-moteur-commun-de-factorisation.md) (2026-10-11) remplace la dizaine de
lieux qui factorisent chacun à sa façon par un module en deux couches : un **noyau exact sur ℚ**,
sans étapes, et des **stratégies qui racontent** (facteur commun, identités, racines du trinôme,
racine évidente) branchées sur l'intention `factoriser`. Livraison par lots : noyau → stratégies →
migration des appelants internes (`limits`, `integration`, `domain`, `normalize`) et suppression
du code mort → écriture des primitives (V18).

**État au 2026-10-12 : chantier clos.** Lot 1, le noyau (#1127) ; lot 2, les stratégies branchées
sur l'intention `factoriser`, donc sur l'atelier (#1134) ; lot 3a, limites et intégration (#1136,
[§ Les appelants](#les-appelants-migrés-lot-3a)) ; lot 3b, le ménage (#1141,
[§ Le ménage](#le-ménage-lot-3b)) ; lot 4, l'exponentielle commune d'une primitive mise en facteur
(#1143, voir « Dérivées et primitives finissent par « On simplifie » » plus bas). `normalize` et
`solve` factorisent encore comme avant (ADR 0006 : `normalize` est sur le chemin du décideur) :
leurs doublons sont rattachés à K3. Journal :
[moteur-factorisation-progress.md](../../archive/wip/mathAST/moteur-factorisation-progress.md).

Suites (K21, 2026-10-12) : `solve` ne rend plus la racine 0 en double (`4x³ − 2x² = 0` →
`{0 ; 1/2}`, « On factorise par x^2 », `solvers/polynomial.ts`), et résout en repli une
**différence de deux carrés** NON polynomiale (un polynôme garde ses étapes : `(x − 1)² − x² = 0` reste du premier degré), de même coefficient (`sin²x − cos²x = 0`, `2sin²x = 2cos²x` →
`(a + b)(a − b) = 0`, puis produit nul : π/4 + kπ/2), règle `difference-of-squares` de
`solve.ts`, motifs `P.*` construits à l'appel (cycle d'imports). Tests :
`solve/__tests__/{racine-nulle-sans-doublon,difference-de-carres}.test.ts`.

Écart V37 (2026-10-12) : `solve` résout en repli **P/c = 0, c constante sans lettre et non nulle**
(π, e, π + 1, √2/π) comme P = 0 (`tryConstantDenominator`, `solve.ts`). `solveInequality` ramène
`x < 2/π` à `(πx − 2)/π < 0` ; ni la décomposition rationnelle (dénominateurs en x seulement) ni
le solveur affine (division par 5 oui, par π non) ne le lisaient : zéros non résolus, signe
inconnu, ensemble ∅ (statut `partial`). Tests :
`solve/inequality/__tests__/denominateur-constant.test.ts` (bornes et échantillonnage de points).

Écart V38 (2026-10-12) : **une fonction dont l'argument ne contient pas l'inconnue est une
constante pour le classement**. `containsTranscendental` et `getTranscendentalType`
(`analysis/expression-classify.ts`) prennent une inconnue facultative : avec elle, `\ln 3`,
`\cos(1)`, `\log_{10}2` ne comptent plus, et `getPolynomialDegree` lit une puissance sans
l'inconnue (`2^π`) comme une constante (degré 0). `classifyEquation` et le solveur transcendant
passent l'inconnue ; sans elle, le comportement public est inchangé. Avant, `x = \ln 3`,
`x\ln 2 = 1`, `x^2 = \ln 5`, `\frac{1}{x} = \ln 2` répondaient « transcendante non supporte » et
`x < \frac{1}{\ln 2}` rendait ∅. Tests : `solve/__tests__/fonction-de-constante.test.ts`
(forme exacte, vérification numérique, échantillonnage des inéquations, témoins `\ln x = 2`,
`\cos x = \frac12`, `e^x = 3`).

Écart V41 (2026-10-12) : **un coefficient littéral devant ln, exp, sin, cos n'est plus remplacé
par 1**. `extractTranscendentalEquation` (`solve/solvers/transcendental.ts`) évaluait le
coefficient et, faute d'y arriver, le prenait pour 1 : `a\ln x = 1` rendait e, `k e^x = 2`
rendait ln 2, `a\cos x = 1` rendait 0. Désormais c = −b/a reste symbolique et `constantNumeric`
vaut `null` quand le coefficient porte une lettre. Convention suivie, celle de `ax = 1` → 1/a :
**la valeur porte le paramètre, sans condition sur lui** (aucun solveur n'écrit de condition ; le
champ `Solution.condition` n'est jamais rempli). ln et log en tirent une valeur juste pour tout
paramètre non nul (`a\ln x = 1` → e^{1/a}, `-a\ln x = 1` → e^{−1/a}, signe hors de la fraction
comme e^{−1/3}, `a\ln(2x + 1) = 3`), sans `approximate` ; tan aussi (`a\tan x = 1` → arctan(1/a),
période π) ; exp, sin, cos et les décompositions récursives **refusent** (le signe ou la taille de c décide de
l'existence) et le CLI répond « La solution dépend de a : je ne sais pas encore résoudre avec un
paramètre ». Un second membre littéral (`\ln x = a`) reste refusé : il peut venir du
développement `\ln(ax)` → ln a + ln x, valable pour a > 0 seulement. `filterSolutionsByDomain`
(`solve.ts`) garde une solution à paramètre sans la comparer au domaine (l'évaluation levait).
Tests : `solve/__tests__/parametre-litteral.test.ts` (vérification numérique pour plusieurs
valeurs du paramètre). ⚠️ Dépassé en partie le 2026-10-13, voir le paragraphe suivant :
`e^x = 1/a`, `\ln x = a` et `\ln(ax) = 1` sont résolues, avec condition quand il en faut une.

Second membre littéral (2026-10-13, lot 1 « réciproque ») : **`y = f(x)` résolue en x, la
solution porte sa condition** (`Solution.condition`, désormais rempli). `tryLiteralParameter`
(`solve/literal-parameter.ts`), repli après la classification et avant le changement de
variable, seulement si l'équation a un paramètre : isole l'unique terme en x (k·T = c, k
numérique non nul ; littéral → refus), ôte UNE couche (eᵘ = c → u = ln c si c > 0 ; aᵘ = c →
u = ln c / ln a si c > 0 ; ln u = c → u = eᶜ ; log_b u = c → u = bᶜ (b = 10 sans base) ;
ⁿ√u = c → u = cⁿ, si c ≥ 0 quand n est pair) et rend `u = k` à `solve`, k lettre neuve remplacée ensuite par f⁻¹(c) (la
normalisation développerait ln(−y/(y − 1)) en ln(−y) − ln(y − 1), indéfini pour 0 < y < 1). Les
conditions des couches se cumulent ; `parameterCondition` les résout en la lettre quand il n'y
en a qu'une (`solveInequality`) : `(y + 1)/3 > 0` → `y > −1`, ensemble vide → la solution
tombe (aucune : `no-real-solution`, démontré). c doit être défini pour toute valeur du
paramètre, sauf si la condition de la couche, à une lettre, en tient compte. Le second degré
écrit `Δ ≥ 0` quand Δ porte un paramètre (`x² = y` → ±√y si y ≥ 0 ; toujours négatif →
`no-real-solution`) ; le changement de variable laisse passer une racine en u paramétrée
(`y = eˣ/(eˣ + 1)` → x = ln(−y/(y − 1)) si 0 < y < 1) et lit alors une équation en u
rationnelle. Le CLI affiche la condition (« x = ln(a)/2 − 1/2, si a > 0 », `\quad \text{si }
a > 0`, une seule fois si toutes les solutions la partagent) et ne conclut plus « Δ < 0 » sur un
Δ littéral (`parseFloat` rendait NaN). ⚠️ `P.func` ignore `base` (indice de racine, base de log) : `peel` et
`extractTranscendentalEquation` la lisent (`logarithmBase`) — `\log_2(x) = 3` rendait 1000 sur
main. Chaque solution doit aussi être DÉFINIE : `\ln(ax) = 1` → e/a si a ≠ 0. Dans le changement
de variable, une racine en u paramétrée ne doit annuler aucun dénominateur en u
(`y = (e^{2x} − 1)/(e^x − 1)` → ln(y − 1) si y > 1 et y ≠ 2). Restent refusés : coefficient littéral devant ln
(`a\ln x + b = 1`), cos, sin ; plusieurs termes en x (`y = xe^x`). Tests :
`solve/__tests__/second-membre-litteral.test.ts`, `cli/commands/__tests__/condition-sur-parametre.test.ts`.

Inconnue non précisée (V65, 2026-10-20) : `detectVariable` ne choisit l'inconnue que s'il n'y a
qu'**une** lettre. Appelée sans `variable`, une équation à plusieurs lettres (`|x| = a`, `ax = 1`,
`a\cos x = 1`) était jugée **constante** : « contradiction », `no-solution` **sans** `error`, un ∅
affirmé. Elle rend désormais un échec (`isSolverFailure`) : « Plusieurs lettres (a, x) : précise
l'inconnue à chercher. » Seule une identité (`a + b = b + a`) se conclut encore sans inconnue.
Rappel du contrat (`types.ts`) : un échec du solveur vaut `no-solution` + `error`, sans
`conclusive` ; tout appelant teste `isSolverFailure` avant le statut. Tests :
`solve/__tests__/inconnue-non-precisee.test.ts`.

Écart V40 (2026-10-13) : **valeur absolue d'une expression affine**. `tryAbsoluteValue`
(`solve/absolute-value.ts`), premier repli après la classification, remplace la valeur absolue
par une lettre neuve t, résout en t (premier degré, sans autre lettre : `2\left|x\right| = 6`,
`|x + 1| − 2 = 0`, `5 − |x| = 2` isolent |u| = c), lit le signe de c avec `constantSign`
(c < 0 → ∅, c = 0 → u = 0, c > 0 → u = c ou u = −c) ; |u| = |v| (forme a(|u| − |v|) = 0) donne
u = v ou u = −v, identité comprise (`|x − 1| = |1 − x|` → tout réel). Avant, `|x| = 3`,
`|x| = \pi`, `|x| = \ln 2` répondaient « Type d'equation non supporte: unknown ». Refusés
(rend la main) : u non affine (`|x^2 − 1| = 3`), l'inconnue hors de la valeur absolue
(`|x| = x + 1`), un paramètre (`|x| = a`), deux valeurs absolues hors de |u| = |v|. Effet de
bord juste : les décompositions qui rappellent `solve` (`\ln|x| = 1`, `\sqrt{|x|} = 2`) et les
inéquations affines (`|x| < 3`, tableau de signes de |u| − c une fois ses zéros trouvés) se
concluent. Un facteur collé à une barre se lit en produit implicite (2026-10-13 :
`2|x|`, `x|x|`, `|x||y|`, `\frac12|x|`). Règle des barres nues (`parser-pratt.ts`,
`inBareAbs`) : dans un groupe (parenthèses, accolades, `\left…\right`, contenu d'une valeur
absolue), une barre qui suit un facteur ferme la valeur absolue ouverte s'il y en a une, en
ouvre une sinon ; après un opérateur ou au début, elle ouvre. Une barre ouvrante par produit
implicite après `|…|` suivi d'un facteur est refusée comme ambiguë (`|2|x|-1|`, `|x|y|z|` :
« écris \left| … \right| ») ; une relation lève l'ambiguïté (`|x|y=2|x|` se lit). Tests :
`parser/latex/__tests__/abs-implicit-multiply.test.ts`. Tests : `solve/__tests__/valeur-absolue.test.ts`.
`\vert`, `\lvert`, `\rvert` sont lus par le tokenizer comme la barre `|` (2026-10-13) : la touche
« valeur absolue » du clavier virtuel de MathLive rend `\left\vert2x+1\right\vert`, refusé
auparavant. `\mid` (divisibilité) et `\Vert`, `\|` (norme) restent refusés. Tests :
`parser/latex/__tests__/vert-commands.test.ts`, `utils/__tests__/answer-validator-vert.test.ts`.

Le parseur maison lit `×`, `·` et `⋅` tapés tels quels comme le `*` du produit (2026-10-20,
chantier lecture-grandeurs) : `2×3`, `2[m]·3[m]`. Ils étaient pris pour une lettre (`2×3` refusé,
`2×` lu « 2 fois la lettre × »). Entre crochets d'unité, `·` et `⋅` valent le point (`3[m·s^-1]` =
`3[m.s^-1]`), `×` vaut `*` (`unit-writing.ts`) ; le portier de l'atelier (`cli/core/input-detector.ts`)
reconnaît ces unités comme de la syntaxe maison. Le parseur LaTeX ne change pas : il lit `\times`,
`\cdot` et refuse le symbole Unicode (MathLive ne l'écrit jamais). Tests :
`parser/custom/__tests__/multiplication-symbols.test.ts`, `cli/__tests__/input-detector-units.test.ts`.

Exposants (2026-10-20, chantier lecture-grandeurs, `parser/exponent-rules.ts`). Le parseur maison lit
un signe suivi d'UN nombre ou d'UNE lettre comme l'exposant : `10^-3` = `10^{-3}`, `10^+3` = `10^{+3}`,
`10^-3+4` = `10^{-3}+4`, `10^-3[m]` = `10^{-3}[m]`. Avant, il exigeait les accolades (« Negative exponent
requires braces »), et l'atelier relisait `x^-1` en `x^(-1)` après ce refus (rattrapage retiré). Un signe
devant un groupe est refusé, `NEGATIVE_EXPONENT_BEFORE_GROUP` (`2^-sin(x)`, `2^-(x+1)`, `2^-f(x)` d'une
fonction générique : jusqu'où va l'exposant ?) ; `2^-x y` reste refusé comme `2^x y`. Sur une fonction
générique, `f^-1(x)` est la réciproque, comme `f^{-1}(x)` (`parseGenericFunction`). Deux exposants à la suite sont refusés par les
QUATRE parseurs, `STACKED_EXPONENTS` (`2^3^2`, `e^x^2`, `2^{3}^{2}`) : le maison lisait (2³)², le LaTeX
2^(3²). On écrit `2^{3^2}` ou `(2^3)^2` ; `toLatex` et `toCustom` n'ont jamais écrit d'empilement, et
MathLive met toujours les accolades. Le RD maison lit aussi `x^(…)` comme Pratt (il le refusait). Tests :
`parser/custom/__tests__/exponent-sign-stacked.test.ts`.

Codes précis des refus (2026-10-20, chantier lecture-grandeurs, `parser/refusal-codes.ts`, partagé
par les quatre parseurs). La lecture ne change pas ; seul le code change, et le texte anglais reste
celui que traduit l'atelier (`cli/web/french-errors.ts`). `INVALID_UNIT` n'existe plus :
`UNKNOWN_UNIT` (`5[xyz]`), `EMPTY_UNIT` (`5[]`), `AMBIGUOUS_UNIT` (`3[kg/m.s]`), `SPACE_IN_UNIT`
(`3[m s]`), `UNIT_EXPONENT_OUTSIDE` (`10[m]^3`). `MISSING_DELIMITER` : l'écriture s'arrête avant le
`)`, `]` ou `}` attendu (`(1+2`, `5[m`). `MISSING_OPERATOR` : un nombre juste après un facteur, même périmètre dans le maison et le LaTeX
(refus « nombre après un facteur ») : lettre, nombre, `)`, `]`, `}`, `|` (`x2`, `x 2`, `(1+x)2`, `x^2 3`,
`|x|2`, `2[m] 3`, `\sqrt{2}3`).
`LEADING_DECIMAL_POINT` (maison seul ; le LaTeX lit `.5` ; un `.` collé à un facteur, `1.2.3`, `x.5`,
n'en est pas un) a un texte nouveau, « Missing zero before the
decimal point (write 0.5) », traduit par l'atelier. `UNEXPECTED_TOKEN` reste en dernier recours.
Tests : `parser/__tests__/codes-des-refus.test.ts`.

Virgule et point-virgule (2026-10-21, chantier lecture-grandeurs, PR 6). Le parseur maison est la
langue interne du moteur : **point décimal seul, virgule toujours séparatrice** (arguments d'une
fonction, éléments d'une matrice), pas de point-virgule. Le tokenizer (`parser/custom/tokenizer.ts`)
ne lit plus jamais la virgule comme décimale (`3,14` = `3` `,` `14`) et fait de `;` un jeton
`SEMICOLON` (il était une lettre : `x;y` se lisait x·;·y). Le refus naît au jeton refusé
(`refusal-codes.ts`) : `DECIMAL_COMMA` quand la virgule est collée entre deux entiers (`2,5`, `(1,2)`,
`[1,2]`, `max((2,5),3)`, `√2,5`), texte « Decimal comma: the decimal separator is '.' (write 2.5) »
avec le nombre tapé ; `UNEXPECTED_COMMA` pour toute autre virgule hors fonction et matrice (`1, 2`,
`,5`, `x,2`) ; `SEMICOLON` (`max(2;5)`, `f(x;y)`, `(1;2)`). `f(1,5)` est un appel à deux arguments
(il valait f(1.5)). Le français (virgule décimale, « ; ») est traduit AVANT le parseur : l'atelier
(`decimalCommaInput`), la lecture LaTeX (MathLive écrit `{,}`), les bornes des domaines d'élève.
Pour relire à l'identique un texte écrit avant, `parser/custom/legacy-decimal-commas.ts`
(`legacyDecimalCommas`) applique la règle de l'ancien tokenizer — virgule collée entre deux entiers
décimale, sauf directement dans un appel de fonction connue ou une matrice : l'atelier pour ses
définitions rangées sans provenance (lien, stockage : `0,3` d'un curseur), la DSL géométrie pour
`sur ]0,5 ; 1,5[` et ses autres chaînes (`courbe("y = 0,5x")`). Les trois refus sont traduits par
`cli/web/french-errors.ts` (textes de la page virgule). Contenus de la base au point : `scripts/reecrire-virgule-decimale-base.ts`
(avant le `deploy:prod`). Tests : `parser/__tests__/virgule-point-virgule.test.ts`,
`atelier/__tests__/virgule-rangee.test.ts`.

Durées juxtaposées (2026-10-20, chantier lecture-grandeurs, PR 5 ; `parser/juxtaposed-quantities.ts`,
partagé par les quatre parseurs). `2[h] 30[min]`, `2[h]30[min]`, `{2[h]}{30[min]}`,
`2~\unit{h}~30~\unit{min}` se lisent comme UNE durée : la somme 2 h + 30 min, marquée
`displayStyle: 'juxtaposed'` (`AdditionNode`, `juxtaposedSum`, `isJuxtaposedSum`). Un bloc face à
`+` et `−` (`3[h] - 1[h] 30[min]` = 1 h 30 min ; signe en tête sur tout le bloc : `-2[h] 30[min]` =
−(2 h 30 min)) ; collé à `*`, `/`, `:`, d'un côté comme de l'autre, il est refusé
(`JUXTAPOSED_QUANTITIES`, « écris 2*(1 h 30 min) pour 3 h, ou 2*1 h + 30 min pour 2 h 30 min ») ;
entre parenthèses ou en `\frac`, il se lit. Seules les durées : `2[m] 30[cm]`, `2[m]3[m]`,
`2[h] 30[°]` et `2[h] 30` sont refusés (`JUXTAPOSED_QUANTITIES`), `2[m] 30` garde `MISSING_OPERATOR` ;
entre accolades, deux grandeurs qui ne sont pas des durées restent un produit (`{2[m]}{3[m]}`, que
`toLatex` écrit avec `\times`). Les angles attendent les unités ′ et ″, absentes. L'ordre et les unités
répétées ne sont pas jugés (`30[min] 2[h]` est lu). Écriture : `toCustom` `2[h] 30[min]`, `toLatex`
`2~\unit{h}~30~\unit{min}`, sans parenthèses après un signe ou un `−` (`juxtaposedTerms`,
`common/sign-parentheses.ts`) ; la structure en fait un bloc. Les recopies d'arbre (`mapNode`,
`mapNodeTopDown`, `cloneNode`, `stripUnnecessaryBrackets`, `transformAST`) gardent la marque ; un terme
changé (valeur négative, expression) fait retomber l'écriture sur la somme avec `+`, valeur juste.
Tests et garde (toute recopie `case 'addition' → add(…)` passe `displayStyle`) :
`parser/__tests__/juxtaposed-quantities.test.ts`.

L'unité multiplie tout le terme qui la précède (2026-10-20, chantier lecture-grandeurs, PR 4,
`parser/custom/unit-term.ts`, partagé par Pratt et RD) : `1/2[m]` = (1/2) m (avant 1/(2 m) = 0,5 m⁻¹),
`-5[m]` = (−5) m, `2*3[m]` = (2×3) m, `x:/2[m]` = (x:/2) m. Le terme s'arrête au `+`/`-` d'addition, à une
grandeur déjà formée (`6[m]/2[s]`), à des parenthèses ou des accolades (`2/{7[km]}`, valeur de `braceWrap`).
Après une grandeur, un terme de plusieurs nombres est refusé, `AMBIGUOUS_TERM` (`6[m]/2*3[s]`) ; une unité
seule en tête, `MISSING_NUMBER_BEFORE_UNIT` (`[m]` ; `[x]` reste un crochet de calcul). Espaces entre
chiffres ignorés (`12 500` = 12500), sauf en exposant ou en indice (`x^2 3` refusé). `π` tapé tel quel est la
constante (comme `\pi`) ; `pi` reste p × i, et un calcul de modèle (`{{eval}}`, `conditions`) qui l'écrit
nu est refusé (« écris \pi », `barePiRefusal` ; la tolérance `BARE_PI` est retirée). `toCustom` ne
parenthèse plus un signe (`-5[m]`) et ferme d'accolades l'opérande droit qui se relirait autrement
(`x:/{2[m]}`, `{6[m]}/2*{3[s]}`, `needsClosedRightOperand`). Calcul (`cli/quantities.ts`) : une unité sur un
terme qui porte déjà une grandeur le multiplie (`unitsOverQuantities`) ; `2*20[°C]` refusé, `-20[°C]` est
−20 °C (Q-T1, Q-T2). Les deux refus sont traduits par l'atelier. Tests :
`parser/custom/__tests__/unite-terme.test.ts`.

Les arguments d'une fonction connue entre `\left( … \right)` se lisent comme entre `( … )`
(2026-10-13, `parseFunctionArguments` de `parser-pratt.ts`) : `\max\left(2,x\right)`, la forme
qu'écrit MathLive et que rend `toLatex`, ne se relisait pas (« Expected \right to close
delimiter »). Tests : `parser/latex/__tests__/parser-pratt.test.ts` (« inside \left( \right) »).

**Ce que voit l'élève (2026-10-13, atelier seulement).** `generateEquationSteps` envoie toute
équation où l'inconnue paraît sous une valeur absolue vers `pedagogical-solve/absolute-value.ts`
(`equationType: 'absolute-value'`, rendu par `AbsoluteValueEquationRenderer`). La forme est lue
par `analyzeAbsoluteValue`, la même analyse que `tryAbsoluteValue` : même périmètre, refus
(`UnsupportedAbsoluteValueEquation`) ailleurs, et l'ensemble conclu est celui de `solve`.
Rédaction validée par David : « Équation avec une valeur absolue » → « On isole la valeur
absolue » si besoin (`3\left|x-1\right| = 6` ⇒ `|x − 1| = 2`) → « Deux nombres ont pour valeur
absolue $5$ : $5$ et $-5$ » (`|2x + 1| = 5 ⇔ 2x + 1 = 5 ou 2x + 1 = −5`), « Seul $0$ a pour
valeur absolue $0$ », ou « Une valeur absolue est positive ou nulle » (c < 0, puis `S = ∅`) ;
|u| = |v| : « Deux nombres ont la même valeur absolue s'ils sont égaux ou opposés ». Chaque
équation du premier degré est résolue À PLAT (« On résout $2x + 1 = 5$ » puis les étapes du
pipeline linéaire, sans son titre ni son `S`), une branche dégénérée se conclut (`0 = 4` sans
solution, `0 = 0` tout réel), puis `S = {…}` ou `S = ℝ` (`read-all-reals`). L'atelier choisit le
renderer par un `switch` exhaustif (`rendererFor`, `atelier/solve-steps.ts`) — l'ancien
`linear ? Linear : Quadratic` annonçait `|2x+1|=5` « Équation du second degré » — et son
garde-fou vérifie `S = ℝ` contre le moteur (`solve-steps-check.ts`, qui ne prend plus un échec
du moteur, statut `no-solution` + `error`, pour un ∅). Les modèles de questions n'ont pas encore
de `generatedSteps.kind` pour la valeur absolue (PR suivante). Tests :
`pedagogical-solve/__tests__/valeur-absolue.test.ts`, `atelier/__tests__/resoudre-valeur-absolue.test.ts`.

Écart V43 (2026-10-13) : **une identité résolue « dans » un intervalle** rendait tout
l'intervalle, valeurs interdites comprises (`.résoudre \frac{|x|-2}{|x|-2}=1 dans [-5;5]` →
`[-5 ; 5]`, `\frac{3x}{3x}=1 dans [-1;1]` → `[-1 ; 1]`). Le domaine de `solve` était exact
(`ℝ \ {−2 ; 2}`, zéros de |u| − c lus par `invertMonotone` dans `domain/compute.ts`) : c'est la
branche « identité » de `solveInInterval` (`cli/commands/solve.command.ts`) qui ne le lisait pas.
Elle rend maintenant le domaine de `solve` intersecté avec l'intervalle, mis en forme par
`normalizeExcludedPoints` (exporté de `domain/compute.ts` : point hors de l'intervalle effacé,
point sur une borne qui l'ouvre — `\frac{2x}{2x}=1 dans [0;1]` → `]0 ; 1]`), et refuse
(« Je ne sais pas encore résoudre ») un domaine à exclusion périodique, qu'`intersect` perdait
(`\frac{\sin x}{\sin x}=1 dans [-1;3]` gardait 0 ; depuis le 2026-10-19, `intersect` garde ces
valeurs interdites sur un ensemble borné, voir « Variations et valeurs interdites » plus bas). Tests :
`cli/commands/__tests__/identite-dans-intervalle.test.ts`.

**Zéros transcendants d'un dénominateur** (2026-10-15). `nonZeroSet` (`domain/compute.ts`) lit
u ≠ 0 comme u > 0 ∪ u < 0, et `invertMonotone` remonte ces inéquations à travers A ± k, k·A, A/k,
−A, √, |·|, ln et exp. Il n'inversait `ln u ⊳ c` que pour c = 0 et `e^u ⊳ c` que pour c = 1 (la
borne devait rester rationnelle) : `\frac{1}{e^x-2}` avait pour domaine ℝ, `\frac{1}{\ln x-1}`
oubliait e (contrainte `unresolved`, qu'`analyzeContinuity` ne lit pas). Désormais, quand la borne
devient irrationnelle, `ln u ⊳ c` donne u ⊳ e^c et `e^u ⊳ c` (c > 0) donne u ⊳ ln c, et
`solveAffineAgainstConstant` reporte cette borne EXACTE sur x quand u = ax + b (coefficients
rationnels) : ln 2, e, e^{-2}, e², (ln 3 − 1)/2, −ln 3, 2e. Même mécanisme pour les inéquations de
domaine (`\sqrt{\ln x - 1}` → [e ; +∞[, `\ln(e^x-2)` → ]ln 2 ; +∞[). Sans solution réelle
(eˣ + 2) : rien d'exclu. Non couvert : u non affine (`\ln(x^2)-1` reste `unresolved`),
`log`, `log10`, `log2` avec c ≠ 0 (refus, comme avant), écriture non simplifiée de ln(1/2). Tests :
`domain/__tests__/denominateurs-transcendants.test.ts`,
`analysis/__tests__/continuity-denominateurs-transcendants.test.ts` (discontinuité `infinite` à
la valeur exacte) ; oracle : `comp-16` (1/(1 − ln x)) n'est plus un refus connu.

Écart V45 (2026-10-13, en partie) : quand `computeDomain` ne résout pas une contrainte
(`unresolved` : `x^5 − x + 1 ≠ 0`, deux exclusions périodiques croisées), `solve` le dit dans
`SolveResult.domainUnresolved` (absent si le domaine est exact) et la console refuse une
identité sur un tel domaine, avec ou sans `dans`, au lieu de « S = ℝ » ou de tout l'intervalle.
Reste (V45) : les solutions finies ne sont pas vérifiées contre ces contraintes, et les autres
lecteurs de `solve` ignorent le champ.
Écart V47 (2026-10-13) : **les inéquations lisent le domaine de définition sur l'inéquation
écrite**. `solveInequality` étudie le signe de la forme canonique de f − g, où `normalize`
simplifie `\frac{3x}{3x}` en 1 et `\ln x − \ln x` en 0 ; le domaine se calculait sur cette forme
(`\frac{3x}{3x}\geq 1` → S = ℝ, `\frac{2x^2-2}{x+1}\leq 0` → `]-∞ ; 1]`, −1 compris). Il se calcule
maintenant par `computeDomain` sur f − g avant simplification, intersecté avec le domaine imposé
(qui remplaçait le domaine de définition au lieu de le restreindre), et passé à `analyzeSign`
après `normalizeExcludedPoints`. Statut `all-real` lu sur le découpage (chaque morceau convient),
`difference` ne voyant pas « tout ℝ \ {0} ». Contrainte non résolue (`x^5 − x + 1 ≠ 0`) →
`InequalityNotSolvable` ; exclusion périodique (`\frac{\sin x}{\sin x}`), que le découpage du
signe lit comme ℝ → statut `partial`, sauf si aucun pôle ne tombe dans le domaine imposé
(`\tan x \geq 0` sur [-1 ; 1] reste `complete`). La console (avec ou sans `dans`) en hérite. Le pipeline
pédagogique du premier degré, dont la conclusion est une forme résolue (`x ≥ 0`), refuse une
inéquation à valeur interdite (`rejectForbiddenValues`, `pedagogical-solve/_helpers.ts`) ; le
second degré refuse aussi depuis V48 (`\frac{2x^3}{x}<2` se rédigeait 2x² − 2 < 0 sans exclure 0) :
l'appelant (atelier, `correction-generator`) se replie sur la réponse du moteur. Tests : `solve/inequality/__tests__/domaine-de-definition.test.ts`,
`pedagogical-solve/__tests__/inequation-valeurs-interdites.test.ts`.
**`dans` lit tout ensemble d'élève** (2026-10-13, lot 2 de l'intervalle de l'atelier) : hors d'un
intervalle borné à la française, `solveInInterval` (`readSolvingDomain`) et `.variations` lisent
l'ensemble par `parseStudentDomain` — borne infinie (`[0 ; +∞[`), réunion, `ℝ \ {0}` ; l'intersection
`∩` seulement sur option (`{ intersections: true }`, `avec`/`dans` de l'atelier, 2026-10-26 : une
réponse d'élève ne l'accepte pas). Pour
`.variations`, `studyDomain` (`domain/study.ts`) le croise avec le domaine de l'expression avant
`computeVariations`, qui depuis le 2026-10-19 fait aussi ce croisement lui-même. `writeCommandArguments` écrit `dans` en
dernier : un intervalle semi-ouvert ne referme pas ses crochets, et un `pour t` placé après y
restait collé (et `dans [0;+∞[ pour t` tapé se relit). Une famille périodique sur un ensemble non borné est refusée (« Une infinité de solutions »), `findZeros` n'en rendant que les premiers termes. Tests : `atelier/__tests__/intervalle-calculs.test.ts`.
**Signe d'une fonction à zéros périodiques** (2026-10-19, PR « 60° » de l'atelier). Sur un domaine
non borné, le solveur ne rend que les zéros d'une période, et l'échantillonnage (5 points dans
[−100 ; 100]) ne voyait pas les autres : `cos(πx/180)` était « négatif sur ]90 ; +∞[ », et
`.variations cos(x°)` annonçait un maximum local en 0 ; `eˣ·cos x`, `e⁻ˣ·sin x` recevaient de même un
signe constant faux. Trois règles (`sign/analyze.ts`, `sign/helpers/zeros.ts`,
`sign/helpers/periodic-sign.ts`) :

1. sur un intervalle **non borné**, le signe ne s'échantillonne plus : quand f est elle-même
   périodique (`detectPeriodicity`, prouvée, continue), il se lit entre les zéros consécutifs d'**une
   période** — un même signe partout vaut pour tout le domaine (`1 + cos x`, `sin²x` positifs ;
   f′ = 1 − cos x ≥ 0, donc x − sin x croissante) ; sinon il reste **inconnu** (`cos x` au-delà de
   ±π/2, `eˣ·cos x`), et aucun extremum ne s'en déduit ;
2. `findZerosWithStatus` ajoute les membres de la famille compris **entre** les zéros connus et la
   borne finie du domaine (`(x − 20)·sin x` : 2π … 6π entre π et 20) et rend la famille
   (`periodicFamily`) ;
3. une énumération tronquée (plafond de 500 zéros, ou plus de 1000 périodes) rend
   `resolved: false` au lieu d'une liste incomplète tenue pour complète (`sin 2x` sur [0 ; 360]).

Les domaines bornés ne changent pas. Tests : `sign/__tests__/periodique-non-borne.test.ts`,
`variations/__tests__/periodique-non-borne.test.ts`.

**Extrema périodiques et valeurs interdites** (2026-10-19). Quatre défauts de `computeVariations`,
corrigés à la cause :

1. **les points critiques sont les zéros du tableau de signes de f′** (`findZerosWithStatus`),
   plus une résolution à part : le solveur ne rend que les zéros d'une période (`cos x = 0` → π/2),
   et `critical-points.ts` s'en contentait. `sin x` sur [0 ; 2π] perdait son minimum −1 en 3π/2 et
   annonçait 0 et 2π « minimum global » (valeur 0) ; même chose pour `sin 2x`, `3 cos 2x`,
   `sin x + cos x`, `eˣ cos x`… Le tableau, lui, coupait bien en 3π/2. Effet de bord voulu :
   `computeRange` de `sin x` sur [0 ; 10] rend [−1 ; 1] (il rendait `null`) ;
2. **le domaine fourni est restreint au domaine de f** (`restrictToNaturalDomain`, comme
   `studyDomain`) : `tan x` sur [0 ; π] était étudiée sur [0 ; π] entier, « croissante » à travers
   π/2 ; `\frac{2x-1}{x+3}` sur [−10 ; 10] annonçait des extrema globaux ; `ln x` sur [−3 ; 3] un
   « minimum local en 0 ». Intersection vide (`ln x` sur [−3 ; −1]) : `VariationError` « f n'est pas
   définie sur l'intervalle d'étude ». Domaine de f non résolu ou conditionnel : le domaine fourni
   est gardé ;
3. **`intersect` garde les valeurs interdites périodiques sur un ensemble borné**
   (`restrictPeriodicExclusion`, `domain/algebra.ts`) : il rendait l'ensemble tel quel. Une valeur
   sur une borne l'ouvre (`tan ∩ ]−π/2 ; π/2[` reste `]−π/2 ; π/2[`), les autres sont exclues, écrites
   mises au propre (`tidyPeriodicMember` : 3π/2, pas 3/2·π). Sur un ensemble non borné il le rend
   encore tel quel (une infinité de points, que `interval_set` ne sait pas écrire). Conséquence :
   une inéquation à exclusion périodique sur un domaine imposé BORNÉ est `complete`
   (`\tan x > 0` sur [0 ; π] → ]0 ; π/2[), `partial` seulement sur un domaine non borné ;
4. **le sens ne traverse pas une valeur interdite périodique** (`cutAtPeriodicExclusions`,
   `variations/monotonicity.ts`) : 1/cos²x est positive partout où elle est définie, et `tan x` était
   « croissante sur ℝ ». Un intervalle borné est coupé en chaque valeur interdite ; un intervalle non
   borné garde son sens sur l'intervalle de définition voisin de sa borne finie (ou de 0 sur ℝ :
   `tan x` croissante sur ]−π/2 ; π/2[), **inconnu** au-delà, avec un avertissement (« le sens de
   variation ne se conclut que sur chaque intervalle de définition, jamais sur leur réunion »).

Côté réciproque (`reciprocal/index.ts`, décision (5) de David) : quand aucun morceau listé n'a de
formule et que la commande proposée échouerait (`tan` sur ]−1 ; 4[, `sin` sur ]−1 ; 4[), aucune
commande n'est proposée — refus périodique honnête (« Sa réciproque y est la fonction arctan… »)
si f est périodique, conseil sans commande sinon.

Et : **un sens inconnu quelque part interdit tout extremum global** (`e^{−x} sin x` sur [0 ; +∞[
annonçait f(0) = 0 minimum ET maximum global). Le membre a + kT s'écrit par `periodicMember`
(`common/periodic-member.ts`, partagé avec l'énumération des zéros). Reste connu : un maximum
global atteint à la fois en un point intérieur et en une borne n'est donné qu'au point intérieur
(`3 cos 2x` sur [0 ; 2π] : π, pas 0 ni 2π). Tests : `variations/__tests__/periodique-non-borne.test.ts`
— oracle numérique, 55 fonctions × 7 domaines plus 4 domaines contenant une valeur interdite : tout
signe et tout sens affirmés vérifiés sur une grille, aucun sens à travers une valeur interdite,
chaque extremum vérifié (valeur, position, nature locale et globale), aucun extremum de la grille
manquant quand le tableau se conclut sur un domaine borné.

**Zéros périodiques d'un quotient, quartiques** (2026-10-19, suite). Quatre défauts, corrigés à la
cause :

1. **la famille périodique du numérateur traverse la décomposition rationnelle**
   (`solve/rational.ts`) : `N/D = 0` rendait les zéros d'une période de N (±π/2) sans
   `periodicSolutions`. Sur un domaine borné, 3π/2, 5π/2… manquaient : `cos x/(x² + 1)` restait de
   signe « inconnu » sur ]π/2 ; 2π], `1/sin x` et `ln(2 + sin x)` (f′ = cos x/(2 + sin x)) de sens
   « inconnu » sur [0 ; 2π] ; `cos x/eˣ` était « positive sur ]π/2 ; +∞[ » et « croissante sur
   [0 ; +∞[ » (faux). La famille n'est propagée que si numérateur et dénominateurs sont définis
   sur ℝ (`definedEverywhere` : sinon `cos x/√x` affichait des zéros en −π/2, −3π/2 et
   `cos x/tan x = 0` rendait « aucune solution » ET une famille) et qu'AUCUN membre n'annule un
   dénominateur, démontré en résolvant D = 0 (`familyAvoidsDenominators`) : pas de solution
   réelle (`x² + 1`, `2 + sin x`), solutions isolées hors famille, ou famille disjointe de périodes
   commensurables (`sin²x` : kπ). Sinon la famille est rendue à part,
   `droppedPeriodicSolutions` — jamais affichée comme ensemble de solutions — et le tableau de
   signes l'énumère membre à membre en ne gardant que ceux où l'expression est définie
   (`definedMemberFilter`, `sign/helpers/zeros.ts`) : `sin x/x` sur [0 ; 2π] a pour zéros π et
   2π (pas 0), `cos x/√x` sur [−5 ; 5] π/2 et 3π/2. Domaine de l'expression non déterminé : zéros
   non résolus, rien ne se conclut. Un contrôle numérique (« finie au membre et de part et
   d'autre ») a été essayé puis retiré : il gardait des membres où f n'est pas définie (0/0 de
   `sin 2x/(sin x·√(2 + sin x))` en π et 2π, `cos x/ln(sin x + 1)` en 3π/2). `2√(sin x)` sur
   ]0 ; π[ reste donc inconnu ;
2. **le premier membre de la famille au-delà d'une borne finie compte** (`familyBetweenKnownZeros`,
   `sign/helpers/zeros.ts`) : `ln(2 + sin x)` sur [0 ; +∞[ était « positif » sans aucun zéro (le
   solveur rend −π/2, hors du domaine), au lieu de 0 en 3π/2 ; `cos x/eˣ` sur [0 ; +∞[ se lit
   maintenant « décroissante sur [0 ; 3π/4[ », inconnu au-delà ;
3. **Ferrari** (`common/quartic-roots.ts`, `realQuarticRoots`, désormais partagé par
   `solve/solvers/quartic.ts` et `domain/preimage.ts`, qui en avaient chacun une copie) : la
   résolvante est écrite pour y = m/2, la factorisation employait y au lieu de m = 2y. Toute
   quartique non bicarrée une fois dépréciée (B ≠ 0) avait des racines fausses
   (x⁴ + x³ − 7x² − x + 6 = 0 rendait −3,13 ; −0,29 ; 0,15 ; 2,26), d'où les points critiques faux
   de `(x−1)²(x+2)³` : le tableau a maintenant un maximum en −1/5, un minimum en 1, rien en −2
   (zéro double de f′). Aucun discriminant n'est arrondi à zéro : une tolérance relative fondait
   deux racines proches (3 et 3,002) en une seule, ensuite écartée — « aucune racine réelle ». Un
   discriminant légèrement négatif (racine double à ~1e-8 près) donne deux candidats de part et
   d'autre du sommet ; chacun est poli par Newton sans s'éloigner (un pas pouvait sauter sur une
   autre racine) ; on ne fusionne qu'après, deux racines entre lesquelles P reste au niveau du
   bruit de calcul — la borne de Horner Σ|cₖ|·|x|ᵏ·ε, pas Σ|cₖ|·max(1, |x|)⁴, qui fondait
   1000 et 1001 et acceptait 7500 pour (x − 3)(x − 5000)(x − 10⁴)(x + 2·10⁴) — et une racine multiple est affinée comme racine simple d'une dérivée (5/3,
   triple, sortait doublée). Testé sur 200 quartiques tirées à graine fixe (racines simples,
   doubles, triples, proches en valeur relative, jusqu'à ±2·10⁴, facteur x² + 1) ;
4. **domaine de f non déterminé** (`ln(sin x)` : le domaine fourni est gardé tel quel) : un sens
   n'est affirmé que là où f est numériquement définie (`withoutClaimsWhereUndefined`,
   `variations/compute.ts`), et le signe de f′ s'étudie sur le domaine de f′ quand il est
   déterminé (`withinDerivativeDomain` : coupure en 0 pour cos x/sin x) ; `ln(sin x)` sur
   [0 ; 2π] était « décroissante sur ]3π/2 ; 2π] », où f n'existe pas. `ln(x + sin x)` sur
   [1 ; +∞[ reste inconnu : main concluait « croissante » par échantillonnage, non démontré.

Reste connu : `ln(2 + sin x)`, `1/(2 + cos x)`, `√(2 + cos x)` sur ℝ sont refusées (domaine
2 + sin x > 0 non déterminé) ; `1/sin x` sur ℝ a un signe « inconnu » partout (pôles périodiques non
découpés) ; sur un domaine fourni BRUT qui déborde l'ensemble de définition, le tableau de signes
ne coupe pas aux valeurs interdites non périodiques (`cos x/ln x` sur [−π ; π] : pas de coupure
en 1) ni ne retire ce qui sort du domaine (`ln(sin x)` « négatif » sur ]π ; 2π[) — déjà le cas
sur main, les appelants passent l'ensemble d'étude restreint ; `cos x/(x² + 1)` a des variations non résolues (tan x = −2x/(x² + 1), honnête). Tests :
`solve/__tests__/rational.test.ts`, `solve/__tests__/quartic.test.ts`,
`domain/__tests__/preimage-quartic.test.ts`, `variations/__tests__/periodique-non-borne.test.ts`.

### Carte du code

| Fichier              | Rôle                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | point d'entrée du module                                                                                                                                                                                                                                          |
| `factor.ts`          | `factorPolynomial` et ses types (`Factorization`, `IntegerFactor`, `SurdFactor`), les bornes                                                                                                                                                                      |
| `render.ts`          | `factorizationToNode` : la factorisation en `MathNode`                                                                                                                                                                                                            |
| `polynomial.ts`      | `Poly` (coefficients `Rational` par degré croissant), arithmétique, `deflate`, lecteur `toRationalFunction` — repris de `domain/exact-roots.ts` ; `toPolynomial` (dénominateur constant exigé), `divideOutRoot` (division par (x − r) avec multiplicité)          |
| `rational-roots.ts`  | `extractRationalRoots` : x = 0 puis ±p/q, avec multiplicités — repris de `domain/exact-roots.ts`                                                                                                                                                                  |
| `quadratic.ts`       | `discriminant` (Δ exact, partagé avec les stratégies) ; `quadraticRootParts` : racine double, racines rationnelles ou `centre ± écart·√m` — repris de `domain/exact-roots.ts`                                                                                     |
| `polynomial-node.ts` | `polynomialNode`, `monomialNode`, `integerNode` : un polynôme entier en nœud, négatifs en soustractions — repris de `normal/rules/trig-multiple-arcs.ts` ; `rationalPolynomialNode` (coefficients rationnels)                                                     |
| `common-root.ts`     | `divideOutCommonRoot` : sortir de N et D le facteur **entier** `q·x − p` de la racine p/q (`2x − 1`, pas `x − 1/2`), fraction restante réduite de son contenu (`(2x + 2)/2` → `x + 1`) ; `linearFactorText` (`(2x − 1)`, `(x − 1)²`, texte sans LaTeX) — K21, V23 |

`factor.ts` exporte aussi `compareFactors` (l'ordre des facteurs, réutilisé par les stratégies) et
`primitivePart` (contenu et partie primitive entière). `common-root.ts` exporte aussi
`integerLinearFactorNode`, le facteur entier `q·x − p` en nœud (`2x - 1`), lu par les éléments
simples de l'intégration.

`domain/exact-roots.ts` et `normal/rules/trig-multiple-arcs.ts` importent désormais ces pièces de
`factor/` : aucune copie n'a été ajoutée. Comportement inchangé (877 tests de `domain/` et de
`trig-normal-form` verts avant et après ; ancien / nouveau `exactRealRoots` comparés sur 4 000
polynômes : 0 différence).

### Le noyau

`factorPolynomial(node, variable, { field?: 'Q' | 'R' })` lit `node` comme un polynôme en
`variable` à coefficients rationnels exacts (la forme d'entrée n'importe pas :
`(2x+1)^2-(x-3)^2` est lu `3x² + 10x − 8`) et rend `P = constant × Π factors^multiplicité × rest` :

- `constant` : le contenu, avec son signe (`Rational`) ;
- `factors` : irréductibles dans le corps demandé, à coefficients **entiers primitifs**,
  dominant > 0 (`IntegerFactor`, coefficients par degré croissant), ou, dans ℝ, `x − (c ± e√m)`
  (`SurdFactor`) ;
- `rest` : la partie de degré ≥ 3 non décomposée, ou `null` ; **sans racine rationnelle quand `complete` vaut `true`** ;
- `complete` : `false` quand une borne a coupé le travail (le produit reste exact). `true` ne veut pas dire « irréductible » : `rest` est sans racine rationnelle, mais peut encore se factoriser (`x^8-1` laisse `x^6+x^4+x^2+1`).

Corps : `Q` (défaut), racines rationnelles seulement ; `R`, un facteur de degré 2 à Δ > 0 non
carré se scinde (`x^2-2x-1` → `(x-1-√2)(x-1+√2)`, le dominant `a` en constante) ; Δ < 0 reste
irréductible dans les deux.

`factorizationToNode` écrit le produit par la fabrique, coefficients entiers dès que possible
(`2x^2+x-3` → `(x-1)(2x+3)`, jamais `2(x+3/2)(x-1)`), sans littéral négatif, les sommes entre
parenthèses de regroupement, la constante −1 en signe (`-(x-3)(x+3)`). Ordre des facteurs,
déterministe et sans valeur de produit : premier degré par |racine| croissante, la racine
positive d'abord (donc `x` en tête) ; puis les facteurs irrationnels ; puis le degré 2 ; le reste
en dernier.

**Hors champ → `null`, sans lever** : pas un polynôme en la variable (`xe^x-e^x`, `\sin x`,
`\frac{1}{x}`), coefficient non rationnel ou symbolique (`\sqrt2 x`, `ax+ay` en x), degré au-delà
de la borne. Ces cas relèvent de la passe de motifs de `factoriser` (facteur commun non
polynomial, plusieurs lettres).

**Bornes** (constantes exportées) :

| Borne                          | Valeur | Au-delà                                                                                              |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `MAX_FACTOR_DEGREE`            | 8      | `null` (borne du lecteur `toRationalFunction`, `domain` aussi)                                       |
| `MAX_DIVISOR_SEARCH`           | 10⁶    | \|a₀\| ou \|aₙ\| plus grand : pas de recherche ±p/q, `complete = false` si le reste est de degré ≥ 3 |
| `MAX_RATIONAL_ROOT_CANDIDATES` | 1 000  | candidats rangés par hauteur, les suivants pas essayés, `complete = false`                           |
| `MAX_RADICAND`                 | 10¹⁰   | ℝ seulement : le facteur de degré 2 n'est pas scindé, `complete = false`                             |

Un reste de degré 2 est toujours tranché exactement par Δ (racine carrée entière de Newton),
même au-delà de ces bornes : `10^{12}x^2-1` → `(10^6x-1)(10^6x+1)`.

**Limites assumées du lot 1** : pas de recherche de facteur de degré 2 dans un reste de degré ≥ 3
(`x^8-1` → `(x-1)(x+1)(x^6+x^4+x^2+1)`, `x^4+4` reste) ; pas de décomposition sans carré
(`(x^2+1)^2` développé reste entier) ; dans ℝ, seul le degré 2 se scinde (ni `x^3-2`, ni le
bicarré `x^4-5x^2+6`, que `domain` sait pourtant résoudre).

Tests : `factor/__tests__/factor-core.test.ts` (panel de l'ADR, ℝ, hors champ, bornes ; chaque
rendu comparé à l'entrée par `areEquivalent`).

### Les stratégies de `factoriser` (lot 2)

Le noyau trouve, la stratégie **raconte** : chaque étape porte un nom de règle, un titre français
(`pedagogical-simplify/descriptions-fr.ts`) et l'expression avant / après. Deux fichiers :

| Fichier (`pedagogical-simplify/`)            | Rôle                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `factor-strategies.ts`                       | `runFactoriserStrategies` : l'enchaînement, le produit en cours (`ProductView`), la réduction des facteurs, Δ (`analyzeTrinomial`), la racine évidente (`evidentRoot`), la stratégie 6                                                                                                                       |
| `pedagogical-rules/polynomial-identities.ts` | lecture d'un polynôme **tel qu'écrit** (`readWrittenPolynomial` : réduit ? développable ?), identités par coefficients (`polynomialIdentity`), et `factoriserIdentityRules` : les quatre règles numériques de `algebraicFactoringRules` relues par coefficients, **mêmes noms**, pour `factoriser` seulement |

**Enchaînement**, la suivante si la précédente ne factorise pas :

- **1 · facteur commun**, **2 · identité remarquable** (coefficients compris : `4x^2-25` →
  « On reconnaît a² − b² avec a = 2x et b = 5 » → `(2x-5)(2x+5)`), **3 · facteur commun puis
  identité** (`2x^2-8` → `2(x^2-4)` → `2(x-2)(x+2)`) : d'abord sur l'expression telle
  qu'écrite, par la passe de motifs (`commonFactorRules`, `factoriserIdentityRules`, contenu des
  sommes maximales) ; puis sur chaque facteur polynomial du produit obtenu, **réduit** s'il le
  faut (étape `reduce-factors`, « On réduit chaque facteur » : `(2x+1)^2-(x-3)^2` →
  `(3x-2)(x+4)`) ;
- **4 · racines du trinôme** (lycée) : « On calcule Δ = 25 : deux racines, x₁ = 1 et x₂ = −3/2 »
  → `2(x-1)(x+3/2)` (`trinomial-roots`), puis `(x-1)(2x+3)` (`trinomial-integer-form`) ; une
  seule ligne si les racines sont entières ; racines irrationnelles comprises
  (`x^2-2x-1` → `(x-1-√2)(x-1+√2)`) ;
- **5 · racine évidente** (lycée, degré ≥ 3, essais ±1, ±2, ±3) puis division
  (`evident-root`) : `x^3-6x^2+11x-6` → `(x-1)(x^2-5x+6)` → `(x-1)(x-2)(x-3)` ;
- **6 · développer pour refactoriser**, en dernier recours, sur une somme qui contient un produit
  de sommes : le développement tient en **une** étape (`develop-to-factor`, « On développe et
  on réduit »), jetée si rien ne factorise ensuite (l'expression rendue est alors l'entrée). Au
  collège, seules 1 à 3 peuvent conclure (`x(x+1)-6` reste inchangé ; `x(4x+4)+1` →
  `(2x+1)^2`).

a² − b² se lit aussi écrit constante devant, aux deux niveaux et avant Δ : `9-x^2` → « a = 3 et
b = x » → `(3-x)(3+x)` ; `-x^3+x` → `x(1-x)(1+x)`. **Chaque étape part exactement de la ligne
précédente**, et la dernière ligne est le résultat (test d'invariant) : la réduction d'un facteur
(`(x+3)-x` → 3) est une étape, la mise au propre finale (ordre du noyau, `tidy` des facteurs
écrits) se fait dans la dernière étape, les parenthèses doubles `3((2x-1)(2x+1))` sont retirées
(`flattenGroupedProducts`). `x-x` → `0`.

**Niveau** : `college` → 1, 2, 3, 6 ; `lycee` et `superieur` → toutes (pas de distinction 1re /
terminale). **Ordre des facteurs** : celui du noyau (`compareFactors`) partout où le produit
n'a que des facteurs polynomiaux réduits ; les facteurs non polynomiaux suivent, dans l'ordre
écrit (`x^2e^x-4e^x` → `(x-2)(x+2)e^x`). Une entrée déjà produit sans étape n'est pas réordonnée
(`(x+1)(x-1)` reste tel quel).

**Champ** : un polynôme d'**une** lettre (`soleVariable` ; `e` est une constante). Plusieurs
lettres (`x^2-y^2`, `ax+ay`) : la seule passe de motifs, comme avant. « Factorisé » veut dire une
étape de factorisation **et** un résultat qui n'est plus une somme. Aucune stratégie ne conclut
« ne se factorise pas » : rien ne bouge, sans phrase.

**Limites** : la stratégie 6 ne s'applique qu'à l'expression entière (`2x(x+1)-12` → `2(x(x+1)-6)`,
pas développé dans la parenthèse) ; un facteur à coefficients non entiers (`x/2 - 1/4`) n'est pas
repris par les stratégies ; une identité ne se lit que sur une partie primitive (`4x^2-16` passe
d'abord par `4(x^2-4)`).

Tests : `pedagogical-simplify/__tests__/factoriser-strategies.test.ts` (rendu, `areEquivalent` de
chaque étape avec l'entrée, suite des règles, titres, collège et lycée, atelier).

### Les étapes de « développer » (`expand-steps.ts`)

**Une intention, une seule rédaction** (décision de David du 2026-10-14, option B) : tout chemin qui
montre à un élève les étapes de l'intention `developper` passe par `explainExpansion`
(`expand-explained.ts`) — le « Comment ? » de `.développer` (atelier), les corrections d'exercices
générées (`generatedSteps: { kind: 'simplify', intent: 'developper' }`, `correction-generator.ts`)
et la démo du module (`demo-helpers.ts`, script `pedagogical-simplify-demo`). Son chemin : résultat
du pipeline (`-(x+1)` écrit `-1(x+1)`, parenthèses de tête retirées) → `orderExpanded` → décimaux
(un décimal écrit dans l'expression, ou `decimal: true` pour le mode décimal de l'atelier ; sinon
des fractions) → `writeExpandSteps` → rendu détaillé et résumé au niveau demandé. Trois issues :
`expanded` (réponse, étapes ou `null`), `unchanged` (rien à développer), `unfinished` (réponse que
le pipeline n'a pas su finir, `2 x 1`). Les exceptions du pipeline remontent à l'appelant. Le
générateur de corrections retombe en silence sur le mode A pour une relation, `unchanged`,
`unfinished` ou des étapes `null` — jamais sur la trace.

L'ancienne trace (passe `normalize`) répétait la même ligne, collait les produits (`2 x 1`) et
cachait la distribution ; depuis normalize-usages, le pipeline ne rend plus qu'une étape `expand`.
Ce n'est pas un moteur de plus (ADR 0007) : `writeExpandSteps(node, answer, { format })` **reçoit**
la réponse — le résultat de `developper` (`expand`), que l'intégration et la stratégie 6 emploient
tel quel, rangé par
`orderExpanded` (`expand-order.ts`, l'ordre du manuel : puissances décroissantes de x, sinon
alphabétique, lettres indicées comprises — pour une somme de **monômes** seulement ; un terme sans
degré, `eˣ`, `√x`, garde l'ordre du module) — et rédige le chemin jusqu'à elle.

Chaque terme de la somme principale se lit comme un produit (`readChunk` : signe, facteurs simples,
sommes entre parenthèses et leur puissance). Puis des phases, la première qui s'applique faisant la
ligne, pour tous les termes où elle vaut : cube → carré × parenthèse ; identités remarquables (une
seule : ligne à ×, puis « On calcule chaque terme ») ; réduction d'une parenthèse d'un produit ;
double distribution (ligne à ×, puis « On calcule chaque produit ») ; facteur et signe − devant une
parenthèse ; enfin la ligne jusqu'à la réponse (`closingOf`) : « On réduit » si des termes se
regroupent, « On ordonne les termes » si seul l'ordre change dans une somme de monômes, l'ordre du
module fondu dans la ligne précédente, « On écrit chaque terme avec son coefficient » ou « On
calcule chaque terme » si un terme change d'écriture. Exposant ≥ 4 : une seule ligne. Une division
par un nombre se lit comme un facteur `1/n` (« On distribue ½ »). Chaque terme
est calculé par `expandedForm` (`expand.ts`, le moteur de la réponse) ; chaque image est vérifiée par `areEquivalent` ; jamais deux images
identiques de suite ; `format` (les décimaux de l'atelier) s'applique à chaque image, la dernière
comprise. La version résumée fond chaque ligne à × dans le calcul qui la suit. Ce qui ne se lit pas
(somme sous une fonction, une racine, dans un exposant ou une fraction à dénominateur littéral ; plus de `MAX_PRODUCTS`
produits sur une ligne) rend `null` : pas d'étapes, la réponse reste. Titres : la `description` de
chaque étape ; « pourquoi » : règles `expand-*` de `descriptions-fr.ts`.

Les deux instantanés qui figeaient l'ancienne trace (`pedagogical-simplify-demo`,
`questions/generated-steps-demo`) figent la rédaction.

Tests : `pedagogical-simplify/__tests__/expand-steps.test.ts` (équivalence de chaque image),
`expand-explained.test.ts` (trois issues, réponse = résultat rangé, décimaux, niveau),
`atelier/__tests__/developper-commande.test.ts` (titres et images rendus, résumé),
`questions/generator/__tests__/correction-developper.test.ts` (la correction d'exercice montre la
même rédaction que l'atelier ; repli au mode A), `__tests__/prose-maths-delimitees.test.ts` (titres
à maths entre `$…$`), `developper-sans-normalize.test.ts` (Q1-Q3 de normalize-usages : fractions,
division par un nombre, identités).

## Les nœuds

31 variantes dans `types.ts`, discriminées par `type` :

| Famille    | `type`                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| feuilles   | `number`, `variable`, `greek`, `symbol`, `constant` (`euler`, `pi`), `hole` (trou d'exercice), `segmentLength` (`AB`), `figureName` (`ABC`) |
| opérations | `addition`, `subtraction`, `multiplication`, `division`, `opposite`, `positive`                                                             |
| structure  | `delimiter`, `subscript`, `superscript`, `function`                                                                                         |
| relations  | `relation`, `boolean`, `logical`, `logical-not`                                                                                             |
| domaines   | `unit`, `percentage`, `matrix`, `composition`, `complex`, `infinity`, `signed-zero`, `limit`, `piecewise`                                   |

- `multiplication.displayStyle` : `'implicit' | 'dot' | 'cross' | 'star'` ;
  `division.displayStyle` : `'fraction' | 'inline' | 'ratio'`. Le style ne change pas la
  valeur, il change l'écriture (et donc `checkForm`).
- `NodeMetadata` (couleur, style, annotation) : indications de rendu, jamais de sens
  mathématique ; rendues par `LatexGenerator` avec `renderMetadata: true`.
- `function` porte `name`, `args`, et en option `power` (`\sin^2 x`) et `base`
  (indice de racine `\sqrt[3]{x}`, base de logarithme).
- **Longueurs de segments** (2026-10-12, chantier clos : [journal](../../archive/wip/longueurs-segments-progress.md)) :
  `segmentLength` porte deux `PointName` (`{ letter, primes, index? }` : `A`, `A'`, `A_1`) dans
  l'ordre écrit ; `figureName` (`ABC`, trois points ou plus) s'affiche tel quel et ne se calcule
  pas. Le parseur LaTeX (Pratt et rd) les lit selon l'option **`capitalPairs`**, transmise aussi
  par `areEquivalent` (`math/index.ts`) et `checkForm` : `'product'` (défaut,
  `DEFAULT_CAPITAL_PAIRS`, décision Q-M : seuls les questions et `/dev/structure` demandent la
  longueur) — l'arbre d'avant, à l'identique ; `'length'` — deux majuscules **collées dans la source**, primes
  et indices compris (`AB`, `A'B'`, `A^{\prime}B^{\prime}`, `A_1B_1`) ; `A B` (espace), `x_{AB}`
  (indice) et les minuscules restent des produits (empreinte de 4 122 chaînes, dont environ 2 400 formules, `parser/latex/__tests__/capital-pairs-empreinte.test.ts`). Lecture
  sur les jetons : `parser/latex/point-names.ts`, qui fournit aussi `separateSpacedCapitals` :
  `stripLatexSpacing` et `removeSpaces` gardent une espace entre deux majuscules (`A\,B` reste
  un produit). `toLatex` écrit `AB`, `A'_{1}B` (relu à
  l'identique). **Calcul** (lot 2, toujours en mode `'length'`) : la longueur
  est un facteur symbolique de `normalize` dont l'identité est la paire de points triée
  (`hashMathNode`) — `AB` = `BA`, `3AB+2BA` → `5AB` (ordre de la première écriture gardé) ;
  `getVariables` la nomme une fois, comme sa première écriture ; `substitute`/`containsVariable`/
  `differentiate` l'acceptent sous `AB` ou `BA` ; `solve` change toutes les longueurs en variables
  (paire triée) puis les rend écrites comme l'élève (Thalès, Pythagore littéraux) ; sans valeur, `evaluate()` la dit
  `unevaluable` en français ; `checkForm` laisse libre l'ordre des points, les parenthèses
  autour d'une longueur seule et le `×` entre deux longueurs (`unifySegmentNotationAST`). Un nom de figure (`ABC`) n'est équivalent qu'à la même
  écriture et est refusé par `evaluate()` et `checkForm`, avec le message de `figureNameRefusal`
  (`common/segment-names.ts`). **Positivité** (lot Q-F, 2026-10-12) : une longueur entre deux
  points distincts est **strictement positive** par défaut — `numtype` la type en réel positif
  (`inferSegmentLengthType`, `numtype/rules/literals.ts`), sauf hypothèse déclarée sur `AB`/`BA`
  (priorité) ou points identiques (`AA` vaut 0 : rien n'est supposé, `isDegenerateSegment`).
  `areEquivalent` et `simplify` posent l'oracle des hypothèses (`assumptionOracle(…, [a, b])`,
  `segmentLengthOracle`) dès qu'une longueur est mentionnée : `√(AB²)` → `AB`, `|AB|` → `AB` ;
  `solve` ne garde que les valeurs positives d'une longueur inconnue (domaine ]0 ; +∞[, sauf
  domaine passé par l'appelant) et écrit `√(−c/a)` pour `a·L² + c = 0` (Pythagore littéral →
  `√(AC² + BC²)`, aucune solution si `−c/a` est négatif ou nul : `AB² = −CD²`) ; les quatre
  intentions pédagogiques commencent par l'étape `length-radical` (`√(9AB²)` → `3AB`). Non-régression : 3 327 saisies du corpus en produit et 3 143 sans longueur
  en mode longueur, `simplify`/`solve`/`areEquivalent` identiques avant/après.
  **Lecture** (lot 4) : `structureFromLatex(latex, { capitalPairs })`
  (sans option : le parseur par défaut, produit) ; une longueur est une feuille de genre `length`
  (un bloc, comme une lettre), lue « la longueur AB » (mot du dictionnaire `longueur`) ; un nom
  de figure rend `{ status: 'figureName', message }` (message de `figureNameRefusal`), sans
  lecture. En mode produit, lectures identiques à avant (empreinte des 200 saisies du corpus,
  `structure/__tests__/reading-mode-produit.test.ts`). **Syntaxe maison** (lot 5) : `parseCustom`
  et ses variantes (Pratt et rd) prennent la même option `capitalPairs` (défaut `'product'`), avec
  les mêmes règles et le même scanner de jetons (`scanPointNames`, réglage
  `bareMultiDigitIndex` : `A_12B` a l'indice 12, comme `x_12`) ; `toCustom` relu en mode longueur
  rend le même arbre. Non-régression : empreinte de 1 299 saisies (dont les 678 formules `~…~` à
  majuscules des exercices de prod, 355 à majuscules collées) identique sans option et en
  produit, et aucune saisie lisible en produit ne devient une erreur en longueur
  (`parser/custom/__tests__/capital-pairs-empreinte.test.ts`).
- **Noms indicés** (2026-10-19, relevé de l'atelier) : `a_1`, `a_{12}`, `\alpha_1` — une lettre
  latine (`variable`) ou grecque (`greek`, nommée `alpha_1`) munie d'un indice ENTIER — sont UN nom
  (`indexedNameOf`, `common/indexed-names.ts`). L'indice reste tel qu'écrit : `a_{01}` et `a_1`
  sont deux noms. L'arbre reste un `subscript` ; `substitute` le remplace en entier par la liaison
  `a_1`, et la liaison `a` ne touche plus sa base (avant : `a = 10` faisait `10_1`, que rien ne
  lisait). Un seul masquage, `hideIndexedNames` / `revealIndexedNames` (avec un filtre : l'atelier
  y laisse `u_3`, terme d'une suite), sert `substitute`, `hasAllBindings`, `getMissingBindings`,
  la liste « (variables: a_1, x) » du REPL web et `variablesOf` (`atelier/parse.ts`). Un indice non
  entier (`x_n`, `u_{n+1}`) n'est pas un nom : sa base se remplace comme avant. ⚠️ `getVariables`
  rend toujours la base (`a`) : ses ~80 appelants (solveur, validation des réponses…) n'ont pas été
  revus pour un changement de sens. **Le pipeline de la console** (`cli/core/pipeline.ts`, `parse`,
  2026-10-19) lit chaque nom indicé LATIN comme une variable entière `x_1` (`hideIndexedNames`) :
  dans le REPL et les commandes (`.variations`, `.résoudre`, `.intégrer`, `.évaluer`, `.diff`…),
  `x_1` est donc une autre lettre que x, comme `a` (avant : `.variations x^2 - x_1 x` ne savait pas
  résoudre f'(x) = 0, `.intégrer x_1 de 0 à 1` rendait 1). Le grec indicé reste un `subscript`.
  `toLatex` écrit une telle variable `x_1`, `a_{12}` (`indexedVariableLatex`), plus `\mathit{x_1}`.
  `.variations` ne conclut pas sur un sens indéterminé : tous les intervalles « ? » → « Signe …
  et sens de variation : non déterminés » et « Extrema : non déterminés » ; un seul « ? » sans
  extremum trouvé → « Extrema : non déterminés », jamais « aucun ».

## Invariants structurels non évidents

1. **Pas de nombre négatif littéral.** `number('-5')` **lève une exception** (`factory.ts`) ;
   écrire `opposite(number('5'))`, ou `numericNode(-5)` (`common/numeric.ts`) quand la
   valeur vient d'un calcul. `isMinusOne` ne reconnaît que `opposite(number('1'))`. Garde :
   `__tests__/no-negative-number-node.test.ts`. Dans `NormalForm`, en revanche, le signe
   vit dans le numérateur rationnel.
2. **Les nombres sont des chaînes** (`NumberNode.value: string`) : l'écriture de l'élève
   est conservée, pas de dérive flottante. `number(3)` accepte un nombre et le convertit.
3. **Nœuds immuables, par convention.** Champs `readonly`, aucun `Object.freeze` :
   toute transformation rend un nouvel arbre (`mapNode`, constructeurs). Des littéraux
   `{ type: … }` construits à la main existent hors de `factory.ts` : ils contournent la
   garde de `number()`, ne pas en ajouter.
4. **Les parenthèses sont une frontière.** `flattenSumShallow`/`flattenProductShallow`
   s'arrêtent aux `delimiter` : `a+(b+c)` a deux termes. Donc les motifs `P.sum`/`P.prod`
   ne voient pas à travers une parenthèse, et `P.add` ne filtre pas `(a+b)`.
5. **Arbres binaires, aplatis à la demande.** `unflattenSum` reconstruit à gauche
   (`((a−b)+c)`) ; dans un produit aplati, chaque facteur garde le style de son `×`.
   Une chaîne `a < b < c` est une `relation` imbriquée à gauche.
6. **Une valeur, plusieurs représentations** — la source n° 1 des règles mortes :
   - `-3y` se lit `opposite(3)·y`, **pas** `opposite(3·y)`. Ne pas « corriger » le parseur
     sans étude d'impact large : concevoir l'analyse pour les deux formes ;
   - la lettre `e` est la **constante** `euler` dans les quatre parseurs (LaTeX et custom,
     pratt et rd), comme `\pi` est `constant` — **sauf suivie d'un indice** : `e_1`, `e_n`
     restent des variables indicées. `toLatex(euler())` écrit `\exponentialE` (MathLive et le
     parseur le relisent), `toCustom` écrit `e` ;
   - la lettre `i` est l'**unité imaginaire** `complex(0, 1)` (`imaginaryUnit()`,
     `isImaginaryUnit`) dans les quatre parseurs, comme `\imaginaryI` et `\mathrm{i}` —
     **sauf dans un indice** (`u_i`, `x_{i+1}`, `x_{2i}` : un rang) **ou suivie d'un indice**
     (`i_1`, `i_{n}`) : là, une variable. `toLatex` écrit `\imaginaryI`, `toCustom` écrit `i`.
     Une `variable('i')` est donc toujours une vraie variable : rien ne la lit comme l'imaginaire
     (ni `normalize`, ni `evaluate`) ; `tidy` range `i` comme π et `e`, devant les lettres
     (`x i` → `i x`, `\pi i` → `i\pi`). Le parseur LaTeX rd ne lit pas `\imaginaryI` (écart
     connu) ;
   - calculer « par rapport à `e` » ou « à `i` » (intégrer, dériver, résoudre, limite, Taylor,
     variations, `; e` / `pour i` en CLI) est **refusé** : « e est la constante d'Euler, pas une
     variable », « i est l'unité imaginaire, pas une variable » (`reservedVariableRefusal`,
     `common/reserved-letters.ts`), sauf si l'arbre contient une variable de ce nom (base
     indicée `e_1`, `i_1`, ou `i` dans un indice) ;
   - **le signe d'une constante se lit sur sa valeur, pas sur son type** : `-\frac23` est
     `opposite(division)`, `\frac{-3}{4}` une division, `-0.5` devient `-\dfrac12` après
     `canonicalForm`, `-\sqrt2` un opposé de racine. `literalNumberValue` ne voit que `number` et
     `opposite(number)` : pour décider d'un signe (sens d'une inéquation, tableau de signes),
     `constantSign` (`common/constant-sign.ts` : rationnel exact, sinon valeur approchée hors
     d'une marge de 10⁻⁹, `null` si indécidable). Écart V36 : `-\dfrac{2}{3}x+1<5` concluait
     x < −6 ;
   - `\sin^2 x` est une `function` avec `power`, `(\sin x)^2` un `superscript` ;
   - la virgule : MathLive écrit `3{,}14` (lu `3.14`) ; la virgule nue passe par
     `decimal-comma.ts` ;
   - **pas de notation scientifique en LaTeX** (pratt et rd, tokenizer commun
     `parser/latex/tokenizer.ts`) : `3e-2` se lit 3e − 2, `3E-2` 3E − 2 (variable `E`), et
     `2e3` est refusé comme `2e 3` (« nombre écrit après un facteur »). La syntaxe custom la
     garde : `parseCustom('1e5')` = 100 000. En sens inverse, `toLatex` d'un `number` dont la
     chaîne est en notation scientifique JS (`String(1e-7)` = `'1e-7'`, `'1e+21'`) écrit
     `10^{-7}`, `1.5 \times 10^{-7}` (réécriture avant rendu dans `latex-generator.ts`, les
     parenthèses se décident sur la forme écrite : `\left( 10^{-7} \right)^2`, plus deux cas
     posés par la passe — facteur de droite d'un produit implicite, `\pi \left( 10^{-7} \right)`,
     et dénominateur d'une division en ligne, `\pi / \left( 1.5 \times 10^{-7} \right)`) ;
     `toCustom` garde `1e-7`. `{{eval:…}}` (`evaluateAstWithModifiers`) n'écrit pas non plus la
     notation JS : voir [ubumark.md](../ubumark.md#paramétrage-modèles-de-question).
     Toujours tester une règle ou une analyse **sur une entrée parsée**.
7. **Plafonds du parseur** (`parser/security.ts`) : 10 000 caractères **avant** l'analyse ;
   profondeur d'AST 100 et 10 000 nœuds **après**. Une imbrication de quelques milliers de
   niveaux (parenthèses, `-` répétés, `\sqrt`, `\sin`, valeurs absolues) fait déborder la pile
   du parseur récursif avant le contrôle d'AST : aux huit entrées des quatre parseurs,
   `guardStackDepth` convertit ce `RangeError` (« call stack ») en
   `SecurityError('…', 'AST_TOO_DEEP')`. Compter les délimiteurs avant l'analyse ne couvrait
   que `( [ {` et refusait à tort les unions d'intervalles à la française (`[0;1[`).
8. **`compile()` est la seule génération de code** (`eval/compile.ts`) : jamais `eval`
   ni `new Function`.
9. **Ne pas ré-exporter `rewriting-engine.ts` ni `technical-renderer.ts` depuis
   `common/index.ts`** : un ordre de chargement casse des dizaines de tests de continuité.
   Les importer par leur chemin (commentaire en tête de `common/index.ts`).
10. **Le mode décimal calcule en fractions exactes, pas en flottants.** `evaluateToRational`
    (`eval/evaluate.ts`, derrière `evaluate` en mode décimal, `evaluateNodeToApproximatedNumber` et
    `evaluateNodeToRational`) rend un `Rational` en BigInt : `0.1 + 0.2` vaut exactement 3/10. π, e,
    les fonctions transcendantes et les puissances non entières y entrent **par leur flottant**
    (`floatToRational`, environ 16 chiffres significatifs : π = 3141592653589793/10¹⁵) ; le
    résultat n'est exact que si aucun d'eux n'est entré. Les termes peuvent être géants pour une
    valeur ordinaire ((1001/1000)¹⁰⁰⁰ : 3001 chiffres en haut et en bas, pour 2,7169) : **jamais
    `Number(n) / Number(d)`** (NaN dès que les termes dépassent 10³⁰⁸), toujours `rationalToNumber`
    (`normal/rational.ts`), qui calcule alors le quotient en entiers (mesuré le 2026-10-11 : la
    suite qui tend vers e, les intérêts composés et π²⁰ rendaient NaN ou Infinity).
    Une puissance entière est exacte jusqu'à l'exposant 1000 (`MAX_EXACT_INTEGER_EXPONENT`,
    `eval/evaluate.ts`) ; au-delà, par le flottant, et une valeur qui en sort (0 pour une base
    non nulle, ±Infinity) est refusée (« Valeur hors d'échelle… ») plutôt que rendue comme 0.
    ⚠️ Ne pas relever ce plafond : à 10 000, e et π (fractions de 16 chiffres) donnaient des
    fractions de centaines de milliers de bits, puis des pgcd de plusieurs secondes
    (`.variations e^{-2x^2}` : 5,7 s ; mesuré le 2026-10-12, pgcd d'Euclide). Le pgcd (`gcd`,
    `normal/rational.ts`) est celui de **Lehmer** au-delà de 64 bits (Knuth, algorithme L) : 1,7 s
    → 0,4 s pour deux entiers de 40 000 chiffres, toujours quadratique. `normalize`, `tidy` et
    `rational()` en calculent sur les grandes fractions. Le calcul en fractions d'`evaluate`
    (`evaluateToRational`) additionne et multiplie par `addReduced`, `mulReduced`… (Henrici, Knuth
    4.5.1 : le pgcd porte sur les termes, pas sur le résultat) — ⚠️ **seulement sur des fractions
    déjà réduites** : le dépôt construit des rationnels à la main sans les réduire, et
    `addRational` & co. gardent leur réduction complète. Une somme de cinq fractions de 9 000
    chiffres : 4,1 s → 71 ms. `powRational` calcule `nᵏ / dᵏ`
    par la puissance native de BigInt : une fraction irréductible élevée à une puissance le reste
    ((101/100)¹⁰⁰⁰⁰⁰ : 194 s avant, 2 ms). Les pôles de tan, sec, csc, cot sont refusés (le
    flottant de π/2 donnait tan = 1,6331 × 10¹⁶).
    **Budget de taille** (2026-10-12) : pendant `evaluateNodeToRational` seulement (la lecture de
    l'arrondi), une puissance au-delà de l'exposant 1000 reste exacte si le plus petit terme du
    résultat fait au plus 30 000 bits et le plus grand 500 000 (`1.5^{2000}`, `2^{100000}` ; e et π
    n'en profitent pas, leurs fractions font 16 chiffres) ; une factorielle ou un coefficient
    binomial dépasse alors la borne 2⁵³ dans le même budget (`1000!`). Le calcul décimal général
    (`evaluate`, `evaluateNodeToApproximatedNumber`) garde ses bornes. La taille d'un résultat
    exact se **prévoit** sans le calculer : `cli/exact-size.ts` (`estimatedExactDigits`, une borne
    qui ignore les simplifications ; la console n'en tire que son plafond de calcul,
    `isTooLongToCompute`, et mesure la longueur réelle par `exactCharacters`). Au-delà du
    plafond, un produit ou quotient de puissances se calcule sur ses facteurs premiers compensés
    (`productValue`) : le moteur, lui, calcule chaque puissance avant de compenser
    (`(1+1/100000)^{100000}×(1+1/100000)^{-100000}` : 305 s). Une comparaison passe par le même
    plafond membre par membre (`cli/bounded-comparison.ts`) : produit de puissances par ses
    facteurs, sinon encadrements rigoureux (`cli/interval.ts` : binaires à 256 bits arrondis
    vers l'extérieur, `+ − × ÷` et puissances entières), refus s'ils se recouvrent. ⚠️ Jamais
    la valeur approchée du bouton ≈ pour trancher : elle a donné des sens faux. Une chaîne `a < b < c` est
    vraie si chaque maillon l'est (`evaluateToBoolean`), et passe par le plafond maillon par
    maillon. La console réécrit les opérateurs logiques et d'égalité (`&&`, `and`, `!=`, `==`…) dans la notation du parseur (`cli/core/pipeline.ts`, `withLogicOperators`) — au plus près : mots et « non » seulement s'il y a une comparaison ou un opérateur logique, `||` hors d'une valeur absolue, un « non » sans parenthèses enveloppant toute la comparaison qui le suit ; `.def` ne dérive pas une définition booléenne. Les messages d'erreur de la console sont traduits à sa sortie (`cli/web/french-errors.ts`, `withFrenchErrors` dans `execute`) : le message seul, remplacé dans la sortie (`knownFrench` : la table seule, sans formule générique, pour l'aide qu'une carte de l'atelier ajoute à son refus) — les parseurs gardent leurs messages anglais (leurs tests les vérifient), et
    lit en entier une entrée à plusieurs `=` ou dont un membre est une comparaison.
    Chaque lecture de la console reçoit son état (`parseOptions` de `web-repl-engine.ts`) : les
    fonctions liées (`.def k(x) = …`, `createFunctionBinding`) s'ajoutent aux noms par défaut
    du parseur (f, g, h, u, v, w, F, G, H), en texte comme en LaTeX (`genericFunctionsOf`,
    `cli/core/pipeline.ts`). Avant le 2026-10-13, `k(0)` restait `k(0)`.
    Un nom déclaré peut porter un indice entier (`f_1`, `g_12`, noms de l'atelier) : les deux
    parseurs pratt lisent `f_1(3)`, `f_{1}\left(3\right)`, `f_1'(2)`, `f_1^{-1}(x)` comme un appel
    de la fonction `f_1` (`indexedGenericFunctionName`) ; non déclaré, ou sans appel (`f_1`,
    `f_1^2`), il reste la variable indicée. `toLatex` écrit `f_{12}` (sans accolades, KaTeX
    afficherait f₁2). Les parseurs rd ne connaissent pas les fonctions génériques.
11. **Une valeur approchée « ou rien » passe par `computeNumericValue`** (`eval/numeric-value.ts`,
    lot 6b du chantier simplify-carte, 2026-10-25) : fini, ou `null` si le nœud contient une
    variable, si l'évaluation lève ou si la valeur n'est pas finie. `computeNumericValueOrInfinity`
    laisse passer ±∞ (bornes d'inéquations, images de la réciproque) et rend `null` pour NaN. Ne
    plus écrire de `try { evaluateNodeToApproximatedNumber(…) } catch` + `isFinite` local. Restent
    sur l'appel brut, à dessein : les sites qui laissent passer NaN ou ±∞, ceux où l'exception
    remonte, `outOfDomainNear` (lit le message), `differentiability` (±∞/NaN = branches),
    `transcendental` (repli 0), et les `try` qui protègent aussi `substitute`, `normalize`…

## Le moteur de réécriture et les étapes

- `rewrite(node, config)` (`common/rewriting-engine.ts`) : boucle jusqu'au point fixe
  (`nodesEqual`) avec `preProcess`, règles, `postProcess`, `maxIterations`, interruption
  (`signal`, `timeoutMs`) et `onStep`. Stratégies : `cost-fixpoint` (garde la forme la
  moins chère rencontrée) ou `deterministic`.
- **Un enregistreur, deux rendus.** Un calcul enregistre ses pas une fois
  (`<Domaine>StepRecorder` qui étend `StepRecorderBase`) ; `GenericTechnicalRenderer`
  les montre au développeur, un rendu pédagogique les montre à l'élève selon
  `SchoolLevel` (`'primaire' | 'college' | 'lycee' | 'superieur'`). Référence :
  `pedagogical-solve/linear-renderer.ts` (titres par niveau, repli sur `lycee` puis sur la
  description du pas).
- **Les maths de la prose entre `$…$`** (V25, 2026-10-12). `GeneratedStepsCorrection.svelte`
  rend le titre et l'explication d'une étape par `InlineMarkdown` (ubumark) : une formule entre
  `$…$` s'affiche en maths, le reste en texte. L'intégration, la dérivation et le premier degré
  (équations et inéquations) y écrivent donc leurs formules : « On pose $u = 2 x$ et
  $dv = \exponentialE^{3 x}$ », « On divise les deux membres par $\dfrac{2}{3}$ », un titre du
  supérieur qui n'est qu'une formule en entier (`$\int u\,dv = uv - \int v\,du$`),
  `$S = \{ 6 \}$`. Hors des `$`, ni `\`, `^`, `_`, `{`, `}`, ni `*` (italique d'ubumark) ni
  `~` (syntaxe maison), jamais `$$` (bloc) ; les descriptions par défaut restent du texte simple.
  Garde-fou sur les 11 pipelines que `generateCorrection` appelle (listes et cas de démo, à
  chaque niveau) : `__tests__/prose-maths-delimitees.test.ts` — il refuse aussi un texte qui
  commencerait par un marqueur de bloc ubumark (`+`, `-`, `1.`, `#`, `>` : les titres « + » de
  l'arithmétique s'écrivent `$+$`). Second degré : ensembles de solutions par
  `domainDescriptionLatex` (`pedagogical-solve/_helpers.ts`), forme standard en `$…$` (plus de
  backticks) ; domaine : gabarits de `domain/step-descriptions.ts` en `$…$` ; simplification : les
  propriétés de l'exponentielle et des radicaux de `normal/` réécrites dans
  `pedagogical-simplify/descriptions-fr.ts`. Les **limites** aussi depuis le 2026-10-14
  (`inlineMath`, `approachMath`, `formMath` de `pedagogical-limits/helpers.ts`) : « La limite vaut
  $-\infty$ », « Forme indéterminée $\frac{\infty}{\infty}$ », « Simplification par $x^2$ » ;
  pour elles le garde-fou refuse en plus toute maths en clair hors des `$…$` (Unicode `+∞`, `x²`,
  `0⁺`, `−`, `×`, ni `lim`, `=`, `0/0`). Sous ∫, une constante négative s'écrit entre parenthèses
  (`\int \left( -3 \right) f(x)\,dx = -3 \int f(x)\,dx`).
  Côté atelier, `decimalCommaProse` écrit `{,}` dans les `$…$` et `historyToUbumark` garde ces
  formules (`$…$`, pas `\$`).
- **Étapes d'ensemble de définition** (`pedagogical-domain/`, 2026-10-13). Chaque étape de
  contrainte montre l'ensemble de **sa** contrainte (`intermediateDomain` posé par
  `domain/compute.ts`) : `\frac{\ln x}{x-2}` → « $x - 2 \neq 0$ » : ℝ ∖ {2} ;
  `\frac{1}{\sqrt{x-1}}` → « $\sqrt{x-1} \neq 0$ » : ℝ ∖ {1} (la racine a son étape [1 ; +∞[) ;
  le domaine se lit à l'étape d'intersection (ajoutée par `dispatch.ts` au-delà d'une contrainte
  si le moteur ne l'a pas émise). **Les étapes doivent prouver le domaine** : `dispatch.ts` refuse
  (`PedagogicalDomainNotImplemented`, donc pas d'étapes côté `correction-generator`) quand
  l'intersection des ensembles affichés diffère, par valeur, du domaine du moteur (contrainte
  appliquée sans être écrite : `\sqrt{x}+x^{-1/2}`), quand une contrainte n'est pas résolue
  (`result.unresolved` : `\sqrt{\sin x}`, `\frac{1}{x^5+x+1}`) et quand une valeur n'est connue
  qu'en décimal (plus de 6 décimales : `\frac{1}{x^3-2}`). Ensembles écrits par `domainToLatex`
  (`renderer.ts`, depuis la structure du domaine et non plus depuis `formatInterval`) :
  `\left\{0\right\}`, `\sqrt{2}`, `\frac{1}{2}` (pas 0.5), `]a ; b[ ∪ ]b ; c[` écrit `]a ; c[ ∖ {b}`,
  `\frac{\pi}{4}+\frac{k\pi}{2},\ k\in\mathbb{Z}`, `1+2k`. Racine d'indice pair autre que 2 →
  `even_root_constraint` ; argument constant (`\sqrt{2}`) → pas d'étape. Dénominateur sans zéro
  réel, somme de puissances paires de polynômes et d'une constante > 0 (`x^2+1`) → étape
  « division » justifiée (« somme d'un carré et d'un nombre strictement positif ») ; autre forme
  (`x^2+x+1`, `e^x`, `(\frac1x)^2+1`) → pas de justification.
  Tests : `pedagogical-domain/__tests__/redaction-etapes.test.ts`. Côté atelier, `.domaine`
  répond `D = …` écrit par ce même `domainToLatex`, et branche ces étapes derrière sa propre garde
  (`src/lib/atelier/domain-steps.ts`, voir [atelier.md](../atelier.md)) ; l'oracle du domaine
  (`domain/__tests__/oracle/oracle.test.ts`) lit cette réponse texte, `D = ℝ \ {1/2}`.
- **Calcul numérique : une opération par étape au collège** (`pedagogical-arithmetic/`,
  décisions de David du 2026-10-14). Plus aucun sous-calcul avalé sous « On calcule »
  (`evaluate-final`) quand une règle existe : `(-3)^2 = (-3) \times (-3) = 9`
  (`expand-small-power` accepte une base négative, et passe avant les multiplications : priorité 105) ; `5 - (-3) = 5 + 3` (`subtract-negative`) ; `-(-3) = 3` (`opposite-of-opposite`) ;
  `1 \pm \frac34 = \frac44 \pm \frac34` (`integer-to-fraction`, puis `subtract-same-denominator` pour la différence) ; `\frac12 \times 2 = \frac22`
  (`multiply-fraction-by-integer`, aussi au lycée). Une fraction littérale (`\frac34`) n'est pas
  un calcul : le regroupement « multiplications d'abord » ne la compte ni ne la colore
  (`isGroupableMulDivTerm`). `\sqrt{9}` se titre « $9 = 3^2$, donc $\sqrt{9} = 3$ » (plus
  « on extrait le facteur carré parfait »). Le pipeline retire d'entrée les parenthèses autour
  d'un nombre (les règles ne voient pas au travers) et écrit le produit `\times` (plus
  d'astérisque `3*(-2)`) ; le renderer écrit **les deux lignes** de l'étape par le même
  parcours, qui parenthèse un facteur ou un diviseur négatif (`12 : (-3)`) des deux côtés (`(-3) \times (-3)`) et remplace
  la juxtaposition devant un nombre (`2 \times 1`, pas `2 1`). Un **dénominateur nul** lève
  `PedagogicalArithmeticDivisionByZero` (message en français) au lieu d'un arrêt silencieux ;
  `generateCorrection` l'attrape comme toute erreur et laisse la question sans étapes. Le lycée
  garde son niveau de détail (règles nouvelles au collège seulement, sauf le produit
  fraction × entier). Tests : `pedagogical-arithmetic/__tests__/college-une-operation-par-etape.test.ts`.
- La résolution d'équation pédagogique ne rejoue **pas** le solveur algorithmique : elle
  suit ce que l'élève fait sur papier (`pedagogical-solve/`). Paliers : 1 (équation du
  1er degré), 2a (inéquation du 1er degré), 2b (inéquation du 2nd degré), 3 (inéquation
  rationnelle) ; granularité par les tables `STRATEGIES`, `STRATEGIES_QUADRATIC`,
  `STRATEGIES_RATIONAL`. `generateEquationSteps` relève le niveau insuffisant
  (`primaire` → `college` pour le 1er degré, jusqu'à `lycee` pour le 2nd).
  **Les étapes d'une équation s'écrivent comme sa réponse** (lot 5f-4 de `simplify-carte`, Q46,
  2026-10-25) : `stepsAsShown` (`pedagogical-solve/shown-steps.ts`), appelée avant le rendu par
  `.résoudre` et par `generateCorrection` (`linear-equation`, `quadratic-equation`,
  `quadratic-inequality`, `rational-inequality`). Quand
  l'équation tape un décimal, chaque nœud des étapes (membres, opérandes, coefficients, branches)
  passe par `inDecimalRegister` (`pedagogical-limits/decimal-register.ts`) : `x = 0,3`,
  `0,5x = 1`, « On divise les deux membres par 0,5 », `a = 0,5`, `2 × 0,5`, et la racine d'un
  nombre (`√0,16`, réglage `roots`) ; une fraction sans écriture décimale finie reste
  (`x = 10/3`) ; l'écriture tapée reste, jusque dans les branches d'une valeur absolue
  (`\dfrac{x}{2} − 0,5 = 1` ; réglage `keep` : les nœuds de l'équation tapée). Les
  valeurs lues (`read-solution`, `read-solutions`, `simplify-solutions`, `solve-each-factor`)
  passent par `exactValueToShow` : `S = {−√2/2 ; √2/2}`, `x₁ = (1 − √5)/2` ; les solutions
  brutes de la formule restent non calculées. **Inéquations comprises** (Q50, 2026-10-25) : mêmes
  règles pour les étapes (`x² − 0,5 < 0`, `x < 0,3`), et les racines des tableaux de signes
  (`quadratic-sign-table`, `rational-domain-restriction`, `rational-locate-roots`,
  `rational-sign-table`) passent par `exactValueToShow`, comme la borne de la forme résolue
  d'une inéquation du 1er degré, qui ne conclut pas (`2x < √2` → `x < √2/2`). L'ensemble solution, chaîne écrite par
  le pipeline (`describeDomain`, `_helpers.ts`), écrit ses bornes par `exactValueToShow`, en
  décimal si l'inéquation tape un décimal : `]−√2/2 ; √2/2[`, `](1 − √5)/2 ; (1 + √5)/2[`,
  `]1/2 ; +∞[` en vraie fraction (avant : `1 / 2` en texte), `[−0,5 ; 0,5]`. Tests :
  `atelier/__tests__/resoudre-etapes-5f4.test.ts`, `resoudre-inequations-q50.test.ts`,
  `questions/generator/__tests__/correction-solveur-5f4.test.ts`.
  **L'inconnue divisée se défait en multipliant** (Q51, 2026-10-25) : un coefficient écrit en
  fraction d'entiers se défait par son inverse (`x/4 = 0,5` → « On multiplie les deux membres
  par 4 », `\frac{2}{3}x = 1` → par 3/2, `-\frac{x}{4} < 1` → par −4, sens retourné) ;
  un coefficient décimal ou entier, en divisant (`0,5x = 1` → « On divise par 0,5 »). `canonicalForm`
  récrit `0,25x` en `\frac{1}{4}x` : l'écriture se lit sur les termes en x tapés
  (`inverseFactor`, `_helpers.ts`), aucun ne portant de décimal. Au lycée, l'étape compacte
  (« On termine en simplifiant le coefficient ») ne change pas. Le rendu de « On multiplie »
  ne met entre parenthèses qu'un membre somme ou négatif (`2 × 3`, `-2 × (−\frac{x}{2})`).
  **Un membre non développé se défait avant les étapes** (Q52, 2026-10-25 ;
  `pedagogical-solve/linear-unwrap.ts`, appelé par `linear.ts` et `linear-inequality.ts`) :
  x des deux côtés ou plusieurs termes en x → « On développe » (`3(x−1) = 2x + 1`) ;
  parenthèses après un + → « On supprime les parenthèses » (`3 + (x−1) = 5`) ; terme constant
  ôté d'abord (`2(x+1) + 3 = 7` → `2(x+1) = 4`) ; puis `k(…)` divisé par k (ou multiplié par
  l'inverse d'une fraction : `\frac{1}{2}(x+1)` → × 2), `−(…)` multiplié par −1, `(…)/d`
  multiplié par d, sens retourné pour un facteur négatif (`-2(x+1) ≤ 4` → `x + 1 ≥ −2`) ; on
  recommence jusqu'à ce que les termes en x soient `a·x` (`2(3(x−1)+1) = 8`). Le membre obtenu
  reprend les nœuds tapés, sans `canonicalForm` (qui le développerait). Avant : aucune étape
  (`UndevelopedLinearForm`, posé le 2026-10-08 pour ne plus montrer d'étapes fausses), qui
  reste levée pour une forme qu'on ne sait pas défaire. Opérations `expand` et
  `remove-parentheses` (`types.ts`). Tests : `atelier/__tests__/resoudre-q51-q52.test.ts`,
  `pedagogical-solve/__tests__/membres-non-developpes.test.ts`.
  **Une inéquation du 2nd degré garde son opérateur à chaque ligne** (2026-10-13) : la forme
  standard s'écrit `2x^2 - 2 < 0`, pas `= 0` (`buildStandardizeStep` reprend l'opérateur de
  départ), et les blocs alignés du rendu passent par `RELATION_MAP` (`\leqslant`, `\geqslant`,
  comme `toLatex`) au lieu de l'opérateur brut `>=`. Tests :
  `pedagogical-solve/__tests__/inequation-second-degre-relation.test.ts`. L'explication de
  « On isole le carré » nomme alors le diviseur `a` (champ `divisor` de l'opération) et dit si le
  sens est préservé ou retourné, comme le 1er degré ; une équation garde « x² = −c / a ». `≠` n'a
  pas de sens à retourner : diviser ou multiplier par un nombre non nul le garde (« $-3$ n'est pas
  nul, donc la relation $\neq$ est préservée », 1er et 2nd degré). Les textes de la forme standard
  et de « b = 0 » / « c = 0 » écrivent la vraie relation (`$f(x) - g(x) \geqslant 0$`), plus de `⊻`. Le 1er
  degré écrit aussi ses blocs alignés par `RELATION_MAP` (`\leqslant`/`\geqslant`, plus de
  `\leq`/`\geq`) : `inequation-premier-degre-symboles.test.ts`. Typst les lit (`lt.eq.slant`).
  **Un terme déplacé s'écrit sans signe moins** (V50, 2026-10-13) : déplacer `-2x` se dit « On
  soustrait $2x$ », `\textcolor{blue}{- 2x}`, plus « On ajoute −2x » / `+ -2x`. Le signe se lit
  sur le facteur de tête (`-2x`, `-\dfrac{1}{2}x`, `-5`) par `negativeTermMagnitude` et
  `chooseAddOrSubtract` (`pedagogical-solve/_helpers.ts`), au collège (équation et inéquation)
  comme dans le transfert du lycée ; un coefficient somme (irrationnel) se lit sur sa valeur
  (`constantSign`) : `5x+1=(1+\sqrt{2})x+7` → « On soustrait $(1+\sqrt2)x$ ». `movedTerm` écrit
  le terme déplacé factorisé et rangé par `tidy` (`\left(4 - \pi\right)x`, `\left(\sqrt{2} - 1\right)x`),
  et l'omet s'il est nul (`5x-0=x+1` : plus d'« On ajoute 0 »). Tests : `terme-negatif-deplace.test.ts`.
- **Dérivées et primitives finissent par « On simplifie ».** Les règles laissent le
  résultat brut (la méthode, qu'on garde visible) ; une dernière étape l'écrit au propre.
  Primitives : `tidyTerms` (`tidy/terms.ts`, l'ordre de la règle gardé : `tidy({ order: 'kept' })`).
  Dérivées : `withTidyStep` (`pedagogical-differentiation/tidy-step.ts`), ajouté par l'appelant
  (corrections, `.dériver`, bouton), écrit la **forme finale** `finalDerivative` (`final-form.ts`,
  simplify-carte lot 5a). La carte f′ (`derivativeAstOf`) la calcule UNE fois sur f déjà
  substituée (`finalDerivativeOf` : étapes pédagogiques, repli sur `differentiate`), même rendu
  que le bouton. Les sommes que la dérivée brute porte sans parenthèse écrite sont d'abord
  ouvertes (`1 − (eˣ + xeˣ)` → `1 − eˣ − xeˣ`, `withImpliedSumsOpened`) : `tidy` les garde depuis
  Q40 (lot 5f-1), la forme finale réduit. Quotient → division par la puissance commune permise par le domaine de f,
  cherchée sur le numérateur BRUT (`(2x − x²)/x⁴ → (2 − x)/x³`, `(1 − x)eˣ/(eˣ)² → (1 − x)/eˣ`,
  `(x²/(x−1)²)′ = −2x/(x−1)³`), puis numérateur `auto`, dénominateur gardé, et le quotient entier
  par `auto` s'il raccourcit (`((x²−1)/(x+1))′ = 1`, `−2/(4x²) → −1/(2x²)`), signe de la barre selon
  `tidy` (« Le signe d'une fraction », [tidy-spec.md](tidy-spec.md) : `−7/(x−3)²`,
  `−(2x² + 18)/(x² − 9)²`, David 2026-10-23) ; exponentielle commune (`eᵘ` ou `\exp(u)`) → elle seule en
  facteur, le reste développé réduit (`xeˣ → (x + 1)eˣ`, jamais `x(2 − x)e^{−x}`) ;
  sinon `auto` (`((2x+1)²)′ = 8x + 4`). Un − devant le quotient entre au numérateur avant
  tout (`(−x²/(x+2))′ = −(x² + 4x)/(x+2)²`, numérateur jusque-là non réduit, revue du lot 5b). Un simple réordonnement de `tidyTerms` garde l'ordre de la
  règle (`sin x + x cos x`). La console `.diff` (`pnpm math`) reste sur `tidyTerms` (`/calc`, son
  autre lecteur, est retirée depuis le 2026-10-25) ; avant lui, la dérivée brute
  replie ses sous-arbres numériques par `tidy` (`foldNumericSubtrees`), donc un décimal tapé reste
  décimal (`(0,5x² − 1,5x)′ = x − 1,5`, simplify-carte Q19). **Étude des variations**
  (`variations/display.ts`, `displayedDerivatives`, simplify-carte lot 5b, D2) : deux écritures de
  f′, la forme finale ci-dessus (étape « Dérivée ») puis la forme où se lit le signe (étape « On
  factorise pour étudier le signe » et ligne de réponse) — politique `factoriser` lycée sur le
  numérateur d'un quotient (dénominateur gardé), sur l'expression entière sinon :
  `x(x + 2)/(x + 1)²`, `x(2 − x)e^{−x}`, `(x − √2)(x + √2)`, `−2(x² + 9)/(x² − 9)²`. Rien ne se
  factorise (`x² + 1`), reste une somme, nombre seul devant une somme qui n'est pas un polynôme de
  degré ≥ 2 (`2(e^{2x} − 2eˣ)`, `4(x − 2)`), exponentielle ou exposant changé (`e^{x²−1}` reste),
  fraction là où un décimal était tapé (S1 : `x(3x − 4,8)` ; `\dfrac{3x}{10}` redevient `0,3x`,
  `withDecimalCoefficients`, qui ne descend ni dans un exposant ni dans un argument et laisse
  `π/4`), facteur mêlant racine et fraction (`x − √2/2` :
  `(1 − 2x²)e^{−x²}` reste, David 2026-10-24 ; `x − 2√3` passe), ou budget dépassé (1 s) → la forme finale. `reducedDerivative`
  (CLI) rend la forme factorisée ; le signe se calcule toujours sur `result.derivative`.
  Polynôme à décimaux de coefficient de tête décimal (`decimalLeadFactored`, R6/Q44 a et
  Q44-bis) : ce coefficient sort devant, le polynôme divisé est factorisé par la politique
  (`1,5x² − 3x → 1,5x(x − 2)`, `0,3x² − 0,3 → 0,3(x − 1)(x + 1)`, `0,2x³ − 0,6x → 0,2x(x − √3)(x + √3)`,
  `0,3x² + 0,1x → 0,1x(3x + 1)`) ; refusé par les mêmes règles, la politique seule ensuite. Vaut
  aussi pour la forme demandée (D4).
  **Forme demandée par l'énoncé** (`requested-form.ts`, `requestedForm`, simplify-carte lot 5e, D4) :
  `finalForm` d'une correction automatique ajoute « On factorise » / « On développe » après la
  forme par défaut (`withRequestedFormStep` de `tidy-step.ts` pour f′ ; option `finalForm` de
  `generatePedagogicalIntegrationSteps`, étape `factor-result` / `expand-result` avant `+ C`, ignorée
  avec des bornes). Factorisée : `factoredForm` de `variations/display.ts`, la règle du tableau plus
  un nombre devant une somme (`8x − 8 → 8(x − 1)`, Q39) ; pour une primitive, un facteur qui porte
  une fraction est refusé (`x³/3 + x` reste, Q34). Développée : terme à terme, d'un quotient le
  numérateur seul (dénominateur gardé, `−7/(x − 3)²` reste), dénominateur numérique distribué
  (`(x + 1)³/3 → x³/3 + x² + x + 1/3`), jamais de même dénominateur (`2x − 4 + 1/x` reste), − d'un terme distribué
  (`−(x + 1)e^{−x} → −xe^{−x} − e^{−x}`), décimal tapé gardé (S1 : `3x²/2` redevient `1,5x²`, sinon
  la forme par défaut reste), simple réordonnement ignoré. Primitives :
  `pushSimplifyStep` (`pedagogical-integration/pipeline.ts`) émet l'étape
  `simplify-result` avant le `+ C` (ou avant le théorème fondamental), **sauf** quand la
  primitive est un seul terme « coefficient en chiffres × une seule fonction » sous un `-`
  éventuel (`singleCoefficientTerm` : `\dfrac{1}{2}e^{2x}`, `-\dfrac{1}{3}\cos(3x+1)`),
  gardé tel quel si le coefficient est réduit (un `\dfrac{2}{4}e^x` devient
  `\dfrac{1}{2}e^x` par l'étape) ; un coefficient pas encore calculé
  (`\dfrac{1}{4}\dfrac{x^2}{2}`) passe par `tidy`. **Exponentielle commune** (lot 4 de
  l'ADR 0024, `developAndFactor`) : l'étape développe (intention `developper`), puis met en
  facteur, par `factoriser`, la `e^{u}` que portent au moins deux termes (exposants comparés par
  `areEquivalent`, écrits partout comme dans la primitive brute) : ∫x²eˣ → `(x^2-2x+2)e^x`,
  ∫xe^{-x} → `-(x+1)e^{-x}`, ∫xe^{2x} → `\left(\dfrac{x}{2}-\dfrac{1}{4}\right)e^{2x}` (accepté
  pour l'instant), ∫eˣ sin x → `\left(\dfrac{\sin x}{2}-\dfrac{\cos x}{2}\right)e^x`, ∫x²e^{2x}+x →
  `(…)e^{2x}+\dfrac{x^2}{2}`. Le rendu montre brute = développée = factorisée, la ligne
  développée omise (et le texte réduit à « On met eᵘ en facteur ») si elle égale la brute.
  Des termes qui portaient la même `e^{u}` s'annulent au développement : la forme développée
  (∫(x+1)eˣ → `(x+1)e^x - e^x = xe^x`, simplify-carte R4/Q43). **Décimal tapé dans
  l'intégrande** (`withUniformCoefficients`, `integration/coefficient-register.ts`, R5/Q42 b) : la
  primitive s'écrit dans un seul registre — tous ses coefficients en décimal si chacun a une
  écriture finie (`0,3x² + 1,2x`, `0,3e^{2x}`, `0,5\ln|x|`), sinon tous en fraction (`x³/3 + x/2`) ;
  sont lus les coefficients devant les termes (`-\dfrac{3}{10}x^2` compris) et ceux d'UNE somme
  facteur (∫0,5xeˣ → `(0,5x − 0,5)e^x`) ; un nombre non entier ailleurs (exposant, argument)
  laisse la primitive telle quelle. La VALEUR d'une intégrale bornée suit le même registre quand
  elle est calculée exactement (Q49, `withValueInRegister` : ∫₀¹ 0,5x → `0,25`, ∫₀¹ 0,5x² →
  `1/6`) ; une valeur irrationnelle n'a pas d'écriture décimale finie : `exactValueToShow` l'écrit
  (∫₀^π 0,5x → `π²/4`, ∫₀¹ 0,5eˣ → `(e − 1)/2`, jamais `0,25π²`, Q22) ; une valeur à paramètre
  suit la primitive (`0,25a`). Même règle pour `.intégrer` de l'atelier, primitive et valeur.
  Sans exponentielle partagée, une parenthèse de `- ∫ v du` est développée puis rangée par `tidy`
  (∫x² sin x) ; sinon `tidy` seul (∫x cos x, ∫ln x, la parenthèse de u dans ∫(2x+1) sin x). Seul
  `PedagogicalSimplifyNotImplemented` fait revenir à `tidy` ; les autres erreurs remontent. L'IPP accepte `e^{ax+b}`
  (`isAffineOf`, `_helpers.ts`), plus seulement `e^x`. L'étape d'IPP écrit `uv - \int v\,du`,
  l'intégrale restante en toutes lettres, avant sa valeur (pas de « = » faux). Le facteur 1/u′ des formes composées est un rationnel exact
  (`findProportionalityRatio`), et l'exponentielle s'écrit `e^{u}`
  (`superscript(euler(), u)`), jamais `\exp(u)` (décisions de David du 2026-10-11).
- **Composées : le coefficient s'explique** (décisions de David du 2026-10-13). Quand
  l'intégrande n'est pas exactement u′·g(u), `integrateComposite` émet d'abord
  `reveal-derivative` (« On fait apparaître $u'$ ») : `e^{2x} = \dfrac12 \times 2e^{2x}`, ∫ = ½∫2e^{2x}
  (signe : `e^{-x} = -(-e^{-x})`), puis la forme
  composée sur `revealed` = u′g(u), qui rend k·G(u) (bindings `k`, `scaled`). **Quand u′ = 1**
  (`\frac3x`, `3(x+1)^2`, `\frac{-2}{x}`), il n'y a pas de u′ à faire apparaître : la même règle
  s'intitule « On sort la constante $3$ » (« On sort le signe $-$ » pour k = −1), aux deux niveaux,
  explication `\int \dfrac3x\,dx = 3\int \dfrac1x\,dx`, sans la ligne `k × …` du calcul
  (`onlyConstantOut`, `descriptions-fr.ts` ; décision de David du 2026-10-13). La réécriture est un
  calcul : elle reste en version résumée. **Le signe − devant l'intégrande** (`-e^x`,
  `-\frac{1}{x+1}`, `-(x+1)^3`, étape `extract-constant` avec c = −1) se rédige comme
  `\frac{-1}{x}` : « On sort le signe $-$ », explication
  `\int \left( -f(x) \right)\,dx = -\int f(x)\,dx`, sans $(-1)$ ni $-1 \times$, aux deux niveaux ;
  les autres constantes gardent « On sort la constante $k$ ». Une seule définition de k = −1 pour
  les deux étapes (`isMinusOneCoefficient(bindings, 'k' | 'c')`, lu sur la valeur : `(-1)x^2` compris ; décision
  de David du 2026-10-13). Avec u′ ≠ 1 et k = −1 (`e^{-x}`), la réécriture finit « puis on sort le
  signe $-$ » (k = −½ reste « la constante »).
  Les étapes s'enchaînent (`after` de la réécriture =
  `before` de la forme). Dans une IPP, v = ∫dv avec réécriture vient en sous-étapes de
  `choose-u-dv`. u′ s'écrit propre (`cleanDerivative` : constante exacte, sinon `tidyTerms`).
- **IPP : notation selon le niveau** (décision de David du 2026-10-13). Au **lycée**, notation de
  terminale (`descriptions-fr.ts`) : « On pose $u(x) = …$ et $v'(x) = …$, donc $u'(x) = …$ et
  $v(x) = …$ », formule $\int u(x)v'(x)\,dx = u(x)v(x) - \int u'(x)v(x)\,dx$ ; dans une intégrale
  définie, l'annonce `identify-parts` énonce d'abord la version avec bornes
  ($\int_a^b … = \left[u(x)v(x)\right]_a^b - …$, bindings `lower`/`upper` tirés de
  `ctx.definite`), puis la version primitive, celle des lignes de calcul (le pipeline cherche une
  primitive avant le théorème fondamental). Les intégrales imbriquées d'une IPP (v, ∫u′v) se
  calculent sans bornes (`primitiveInsideParts`). Au **supérieur**, inchangé : u, dv, du
  (`SUPERIEUR_EXPLANATIONS`). L'IPP cyclique suit la même notation.
- **ln|u| ou ln u.** Les étapes écrivent `\ln\left| u \right|` (`latex.ts`, `collapseLnAbs` ;
  la réponse du moteur garde `\ln\left( \left| u \right| \right)`), et `\ln u` sans valeur absolue
  quand u > 0 est **certain** (`positivity.ts`, `isCertainlyPositive` par `analyzeSign` : domaine
  ℝ, zéros résolus) — pour tout réel (`x^2+1`), ou sur [a ; b] d'une intégrale définie bornée par
  des nombres et sans valeur interdite (`ctx.interval` ; `\frac1x` de 1 à e). Couvert : forme
  u′/u et 1/x ; les éléments simples gardent |…|. L'évaluation aux bornes dit
  « $F(b) - F(a)$ » (juste quand a > b), ou les bornes elles-mêmes si l'une s'appelle a ou b.
- **Intégrale définie : aucune valeur à travers une valeur interdite.** Version pédagogique
  (V28, 2026-10-12) : avant tout calcul, **primitive comprise**, `forbiddenValueOnInterval`
  (`integration/forbidden-value.ts`) lit le domaine exact de f (`computeDomain` : points exclus,
  extrémités des intervalles, premier point d'une exclusion périodique, écrit `\dfrac{3\pi}{2}`)
  et rend la première valeur interdite de [a ; b], **bornes comprises**. Si elle existe, les
  étapes s'arrêtent à `integrand-undefined-on-interval` (« La fonction n'est pas définie en
  x = 3/2, qui appartient à [1 ; 2] : l'intégrale n'est pas définie sur cet intervalle. », mots en
  `\text{}` ; une valeur que le domaine ne rend qu'en décimal, racine de x³ − 2, s'écrit à 3
  chiffres significatifs, « x ≈ 1.26 », « x ≈ 0.000412 » (jamais « ≈ 0 »), par `forbiddenPointLatex`, le binding `point` gardant la valeur
  complète), sans `value` ni `antiderivative` (type `PedagogicalDefiniteIntegrationResult`) ;
  `result.undefinedAt` porte la valeur. Le refus s'affiche donc même pour une primitive que le
  pipeline ne sait pas écrire (∫₀¹ 4/(3x − 2)²). Bornes littérales : pas de contrôle, valeur
  symbolique comme avant. **Domaine non résolu** (`unresolved`, par exemple un dénominateur
  `x^5+x+1`) avec des bornes numériques : `PedagogicalIntegrationNotImplemented`, aucun nombre
  publié, et `correction-generator` se replie sur le mode A. Depuis le 2026-10-15, `e^x - 2`
  n'en est plus un : ln 2 est exclu exactement, et ∫₀¹ eˣ/(eˣ − 2) reçoit le refus
  `integrand-undefined-on-interval` en ln 2 ∈ [0 ; 1]. Sous ∫, une somme ou un opposé s'écrit entre
  parenthèses dans toutes les étapes (`integralLatex`, `renderer.ts`). Moteur
  (`integrateDefinite`) : contrôle **numérique** de la continuité de F sur [a ; b]
  (`integration/singularity.ts`, revue de #947) — saut par bissection, divergence logarithmique
  par zoom vers le minimum puis le maximum de F (V53 : viser l'écart à la moyenne des extrémités
  laissait filer ln|x³ − 2| sur [1 ; 2]) — et second filet sur f, `denominatorPole` : un
  dénominateur qui change de signe dans [a ; b] (racine localisée par bissection, ∛2 ou ln 3
  jamais calculés exactement) est un pôle quand |f| y croît d'un ordre
  ≳ 0,85 (`singularityKind` : |f| multiplié par plus de 50 entre les distances h et h/100 ; un
  pôle simple donne 100, l'ordre 1/2 donne 10). Prolongeable, 1/∛x, 1/√(2 − x) en 2,
  x/√(1 − x²) en 1 : acceptés ; un côté où f n'est pas définie (1/x^0,4 pour x < 0) ne compte
  pas si l'autre est mesuré. Repli numérique : une singularité de f d'ordre < 0,85
  (1/√|x³ − 2|) garde sa valeur approchée ; refus = `status: 'unsupported'`,
  `value: null`, `error` en français (∫₀¹ eˣ/(eˣ − 2) compris). Il accepte une intégrale impropre
  convergente (∫₀¹ 1/√x = 2) que la version pédagogique refuserait (borne interdite) si elle
  savait calculer la primitive.
  Les messages de refus nomment le point dans la variable de l'intégrale (`t ≈ 0` pour
  `\int \frac1t\,dt`, plus `x ≈ 0`) et écrivent les bornes lisibles (`boundText` : `1/2`, plus
  la division en ligne `1:/2` de `toCustom`), mesurés le 2026-10-14.
- **Intégrales à paramètre** (V61, 2026-10-14) : la règle arctan (`isArctanPattern`,
  `integrators/basic.ts`) déballe les parenthèses du dénominateur — `1/(x^2+a^2)` tapé en
  notation maison arrive en `delimiter` et n'était pas reconnu (« Unable to factor
  denominator ») ; numérateur 1 seulement (`3/(x^2+a^2)`, `1/(x^2+a^2+1)` restent refusés).
  La valeur symbolique de `integrateDefinite` réduit `1^u` en 1 (`withoutPowersOfOne` :
  `x^a` de 1 à 2 → (2^{a+1} − 1)/(a + 1)). Les refus des intégrateurs sont écrits en français
  à la source (partial-fractions, trig-substitution, basic), comme le reste du module :
  `integrateDefinite` les recopie dans `error`, que l'atelier montre à l'élève ;
  `integrate.command.ts` dit « Je ne sais pas calculer cette intégrale » et nomme la technique
  tentée en français (`TECHNIQUE_LABELS`).
- ⚠️ Les étapes de `normalize` sont du calcul interne, pas une leçon : `auto` et `reduire`
  ne les montrent plus (2026-10-23), `developper` n'y passe plus (2026-10-25, `expand.ts`).

## Comment étendre

**Un nouveau nœud.** Modèle à suivre : le commit `2c6398faf` (nœud `percentage`).
Ajouter la variante à `types.ts`, son constructeur à `factory.ts` (et à `MathAST`), son
prédicat à `guards.ts`, puis compiler : les `switch` exhaustifs (`const _exhaustive:
never`) désignent les oublis. Fichiers touchés par `percentage` : `transforms.ts`,
`visitor.ts`, `latex-generator.ts`, `custom-generator.ts`, `pretty-print.ts`,
`normal/hash.ts`, `normal/normalize.ts`, `eval/evaluate.ts`, `eval/compile.ts`,
`numtype/infer.ts`, `simplify/cost.ts`, les tokeniseurs et parseurs Pratt, et quelques
analyses (`dimensional/`, `integration/`, `limits/`). Écrire les tests de lecture,
d'écriture et d'aller-retour.

**Une nouvelle règle.** L'écrire avec `createRule`/`P.rule` dans le fichier de
`pattern/rule-sets/` de sa famille, avec un `name` unique ; l'ajouter au jeu exporté.
Décider qui la verra : `simplify` (`buildSimplifyRules`) et/ou une intention de
`pedagogical-simplify` (`selectRulesForIntent`), et donner sa catégorie
(`categorizeRule`, `RULE_CATEGORY_MAP`) et sa phrase française. La tester sur une entrée
**parsée** (invariant 6), avec un coefficient ≠ 1.

**Un nouveau motif d'analyse.** Utiliser `P.sum`/`P.prod` + `tryMatch` plutôt qu'un
parcours écrit à la main ; vérifier après coup que les imports `P`/`tryMatch` sont bien
là. Référence : [pattern-matching.md](pattern-matching.md).

**Une nouvelle équivalence de comparaison** : dans `equivalenceForm`, pas dans
`normalize` (ADR 0006), avec son cas dans [convention-equivalence.md](convention-equivalence.md).

**Un nouveau palier pédagogique.** TDD collaboratif : proposer les comportements en
français, attendre la validation, tests rouges, puis code ; une entrée de table
`STRATEGIES*` par niveau.

## Tests

- À côté du code : `src/lib/mathAST/<dossier>/__tests__/` ; transverses dans
  `src/lib/mathAST/__tests__/`.
- Lancer un fichier ou un dossier : `pnpm test:server src/lib/mathAST/<chemin>` — jamais
  toute la suite pour comprendre un bug.
- **Panels pinnés** (un écart rougit, le document se met à jour dans le même commit) :
  `__tests__/panel-simplifications.test.ts` ↔ [panel-simplifications.md](panel-simplifications.md).
- Garde-fous : `__tests__/no-negative-number-node.test.ts` (invariant 1),
  `__tests__/cosmetic-transforms.test.ts` (ordre de `checkForm`), `tidy/__tests__/`
  (contrat de `tidy`).
- Cas de démonstration de `pedagogical-simplify` par catégorie :
  `pedagogical-simplify/demo-cases/`.
- Méthode générale (TDD, intégration) : [docs/pratiques/tests.md](../../pratiques/tests.md).

### Les appelants migrés (lot 3a)

Le noyau fournit les nombres, l'appelant garde son écriture et ses étapes :

- **`limits/algebraic.ts` `tryFactorization`** (stratégie 4, après L'Hôpital) : N et D lus par
  `toPolynomial`, (q·x − p)^k sorti par `divideOutCommonRoot`, k la plus petite des deux
  multiplicités ; le point d'approche est un **rationnel exact** (`extractExactRational`), donc
  négatif compris (`opposite`, invariant 1) ou fractionnaire. Tout polynôme de degré ≤ 8 qui a la
  racine, plus seulement `x² − a²`. Description en texte, sans LaTeX : « Factorisation par
  (2x − 1) » (K21, V23).
- **`pedagogical-limits`** : la stratégie factorisation sort une racine par passe par
  `divideOutCommonRoot` (K21, V23) : facteur entier comme un élève (`(2x - 1)(x + 1)`, pas
  `(x - 1/2)(2x + 2)`), constante écrite DEVANT la parenthèse (`3(2x - 1)`), fraction restante
  réduite (`x + 1`, plus `\dfrac{2x+2}{2}`). La rationalisation garde `divideByCommonRoot`
  (`helpers.ts`). Quotients exacts écrits en soustractions (`x - 3`, plus `x + (-3)`), plus de
  `/1`, de `(x - 2)·1` ni de `1·(√x + 2)`. La substitution directe, les limites à un côté et les
  gendarmes acceptent aussi un point négatif ou fractionnaire. La **substitution directe rend la
  valeur exacte** de `limits/exact-evaluation.ts` (`tryEvaluateLimitExact`, réduite par
  `normalize`) quand elle retombe sur la valeur flottante : `\dfrac{3}{2}`, `3\sqrt{2}`, plus
  `1.5` (K21, V21) ; titres en LaTeX entre `$…$` (« La limite vaut $\dfrac{3}{2}$ », « $3 \sqrt{2}$ »).
  Un numérateur ou un dénominateur qui EST déjà le facteur (`x - 1` en 1) n'a pas de sous-étape
  (plus de « x − 1 = x − 1 ») ; une fraction simplifiée en constante (`\dfrac{x+1}{x+1}` → 1)
  conclut sur l'expression de départ, sans « \lim 1 = 1 » (2026-10-14). **« Simplification du
  facteur commun » montre le calcul** (lot 5f-3, Q45, 2026-10-25) : champ `chain` de l'étape,
  une ligne `= \lim …` par écriture intermédiaire (`factorisationChain`) — le quotient développé
  quand l'écriture tapée ne l'est pas, puis factorisé : `((x+1)² − 1)/x = (x² + 2x)/x =
x(x + 2)/x = x + 2`, `(x² − 1)/(x − 1) = (x − 1)(x + 1)/(x − 1) = x + 1` ; un quotient tapé
  déjà factorisé n'a pas de ligne répétée. **Décimaux tapés gardés** (même lot) :
  `stepsInRegister` (`decimal-register.ts`) récrit les étapes finies quand l'expression tape un
  décimal — un nombre ou un coefficient à écriture décimale finie en décimal (`x²(0,5 + 1/x²)`,
  « La limite vaut 0,5 », `0,5(x − 1)(x + 1)`), sinon en fraction (`1/3` reste) ; ni exposant,
  ni argument de fonction (la racine d'un nombre, seulement avec le réglage `roots` du solveur,
  lot 5f-4), ni constante ni racine (`π/4`, `√2/2` restent)
  (`π/4`), et l'expression tapée reste telle quelle. La
  valeur rendue (`value`) ne change pas. Tests : `atelier/__tests__/limite-etapes-5f3.test.ts`.
  **Limites de référence** (`tryKnownLimit`) : `e^u` est lu comme `\exp(u)` pour la table
  `KNOWN_LIMITS`, et la parenthèse autour de la base d'une puissance ôtée
  (`toKnownLimitShape`) — `\dfrac{e^x}{x}`, `x e^{-x}`, `\dfrac{x^3}{e^x}` en +∞ (croissances
  comparées), `\left(1+\dfrac{1}{x}\right)^x` ; l'étape garde l'écriture de l'élève, la valeur
  `\exp(1)` s'écrit e (`withEulerPowers`) ; titre : la famille (« Croissance comparée », « Limite
  fondamentale », « Limite de référence »), la formule est dans le bloc. **Composée e^u**
  (`tryExponentialComposition`) : limite de l'exposant (par le pipeline, même côté), puis de
  l'exponentielle — `e^{1/x}` en 0⁺ : +∞, en 0⁻ : 0. **Pôle** (`tryOneSided`) : chaque côté a
  sa limite (±∞ lue au signe, sinon calculée par le pipeline sur ce côté) ; en un pôle d'un
  quotient, l'explication donne le signe du dénominateur (« Le numérateur tend vers $1$ et
  $x - 2 \to 0^+$ ») ; sans côté demandé, comparaison puis **conclusion** : la valeur commune, ou
  `conclude-does-not-exist` (`\dfrac{1}{x}` en 0), à tous les niveaux. **Côté implicite**
  (`tryImplicitSide`) : sans côté demandé, une expression définie d'un seul côté du point
  (`\ln x` en 0) est étudiée de ce côté, une étape le dit (« L'expression n'est définie qu'à
  droite de $0$ »).
  **En ±∞** (`tryInfinityAnalysis`, K21, V26, 2026-10-12) : la **factorisation du terme
  prépondérant**, seule méthode au programme (BO 2019, Tle spé, capacités attendues ; la règle
  « quotient des termes de plus haut degré » et l'étape `identify-dominant-term` ont disparu). Au
  lycée, en mode détaillé : forme indéterminée (`∞/∞` pour un quotient de degrés ≥ 1, `∞ − ∞`
  quand des termes ÉCRITS de la somme, développés ou non, tendent vers +∞ et −∞ :
  `(x+1)^2 - x^2`) → `expand` (« On développe », si
  l'expression n'est pas une somme de monômes de degrés distincts : `\dfrac{(x+1)^2}{2x^2}`) →
  `factor-dominant-term` (chaque somme factorisée par xⁿ, jamais par c·xⁿ :
  `x\left(3 + \dfrac{1}{x}\right)`, termes négatifs en soustractions) →
  `simplify-common-factor` (« Simplification par x² », liaison `dominant`) → `limits-of-terms`
  (bloc `\lim \dfrac{1}{x} = 0`, `\text{donc } \lim (3 + \dfrac{1}{x}) = 3`, champ
  `termLimits` de l'étape) → `apply-quotient` ou `apply-product` (explication : « Le facteur x³
  tend vers −∞ et l'autre facteur tend vers −2 : par produit, (−∞) × (−2) = +∞ », « 2 divisé
  par une quantité qui tend vers +∞ » ; le facteur restant nommé en mots, « le quotient restant », « la parenthèse » ; formules en LaTeX entre `$…$`, rendues par `InlineMarkdown`) → conclusion. Mode
  résumé : développement, factorisation, simplification, conclusion. Deux monômes
  (`\dfrac{2x^2}{3x^2}`) : pas de factorisation, « On simplifie par x² ». **Sans forme
  indéterminée** (`\dfrac{1}{x+1}`, `x^2+1`, `(x+1)^2`, `-x^4+x` en −∞), pas de factorisation :
  une étape `apply-sum` / `apply-product` / `apply-quotient` (limites des opérandes, « donc »
  celle du tout), puis la conclusion. Supérieur : la même factorisation sans les limites des termes ni
  le produit / quotient. Un monôme seul (`\pi x`, `-3x^2`) ou une constante : une seule étape ;
  deux monômes de même degré (`\dfrac{-3x}{2x}`) : la simplification donne la valeur. Les
  coefficients se lisent par `toPolynomial` (sur ℚ) et, à défaut, dans la forme normale pour une
  constante irrationnelle (π, √2) ; la VALEUR ne dépend pas de la rédaction : quotient exact des
  coefficients dominants (`\dfrac{3}{2}`, plus `1.5` ; un quotient irrationnel réduit par
  `normalize`, réécrit par `tryEvaluateLimitExact` puis `writeLimitValue`, comme le moteur :
  `\dfrac{\pi}{2}`, `2\sqrt{2}`, `-\dfrac{\sqrt{2}}{2}`), 0, ou ±∞ selon signe et parité.
  Une constante (`5`, `\pi`) : « La fonction est constante : sa limite vaut 5. » Le signe d'un
  coefficient à plusieurs termes (π − 4, √2 − 1) se lit par évaluation numérique, retenu si
  |valeur| > 1e-9 ; sinon refus, jamais un décimal — et seulement quand il décide du résultat
  (n > m) : `\dfrac{x}{(\pi-4)x^2} = 0`. La borne
  d'un `\lim` parsé (`positive(∞)`) est
  traduite en nœud `infinity` par `normalizeApproach` de `limits/evaluate.ts`, comme dans le
  moteur. **Écriture des étapes** (`renderer.ts`, 2026-10-12) : tant que le membre de droite
  dépend de la variable, il reste une limite — `\lim_{x\to 2} \dfrac{3x^2-12}{x-2} = \lim_{x\to 2}
(3x + 6)`, jamais `= 3x + 6` ; une valeur (nombre, ±∞) s'écrit seule. Les sous-étapes de
  fragment (`factor-numerator`, `factor-denominator`) n'ont `\lim` d'aucun côté. Une étape
  d'annonce, dont le membre de droite égale le gauche (identification, forme indéterminée,
  encadrement, comparaison des côtés), s'écrit `\lim_{x\to a} f(x)` seul, sans « = ».
- **Valeur rendue par `limits/`** (`writeLimitValue`, `limits/exact-evaluation.ts`, 2026-10-12) :
  la valeur de `evaluateLimit` et le quotient dominant pédagogique passent par `tidy` — signe
  devant la fraction (`-\dfrac{\sqrt{2}}{2}`, plus `\dfrac{-\sqrt{2}}{2}` de `denormalize`),
  radical au numérateur (`\dfrac{\sqrt{3}}{2}`, plus `\dfrac{1}{2}\sqrt{3}`), ordre canonique
  (somme sans variable : le rationnel en tête, `1 + \sqrt{2}`, depuis le 2026-10-12). `exp(1)` s'écrit
  e et `exp(k)` s'écrit e^k (constante `euler`, 2026-10-14 : `(1+\frac{1}{x})^x` en +∞ rendait
  `\exp(1)`). Une valeur qui contient un décimal reste telle quelle (`0.5`, jamais
  `\dfrac{1}{2}`) : décimal de l'énoncé (`writeLikeInput`) ou des flottants du suivi de signe.
  **Un flottant n'est jamais
  `exact`** (2026-10-14) : à la sortie de `evaluateLimit`, `withApproximateStatus` passe en
  `approximate` toute valeur où `containsFloatArtifact` voit un nombre non entier absent de
  l'énoncé (et, si l'énoncé a des décimaux, d'au moins dix chiffres significatifs). La
  **stratégie 2.45** (`tryContinuousOfExactLimit`, avant la composition)
  calcule f(u), f continue (√, ⁿ√, exp, a^u, u^p — u^{p/q} écrit en radical, `(2 - \frac{1}{x})^{\frac{1}{2}}` en +∞ = `\sqrt{2}`), sur la limite EXACTE de u, sans le
  flottant du suivi de signe —
  `\sqrt{\frac{x^2+1}{4x^2}}` en −∞ = `\dfrac{1}{2}`, `e^{\frac{3x+1}{x}}` en −∞ = e³,
  `(\frac{2x+1}{x})^3` en −∞ = 8. `resultToFiniteNode` rend la forme dénormalisée exacte au lieu
  d'un arrondi à dix chiffres. Les calculs intermédiaires
  gardent la forme de `resultToNode` ; `analyzeDiscontinuity` (`limits/one-sided.ts`) compare la
  valeur au point et la limite numériquement (repli : `tidy` des deux côtés, ou leur différence
  mise au propre nulle, `tidy` gardant l'ordre écrit entre deux sommes : `(a-1)(a+1)` et
  `(a+1)(a-1)`, lot 4c-bis, 2026-10-23) — `|x| + 0.5` en 0
  a pour limite `0.5` et pour valeur `\dfrac{1}{2}`, continue. La **stratégie 2.46**
  (`tryPowerOfUnboundedLimit`, V66, 2026-10-26) prend le relais quand la limite de u est
  infinie : uⁿ, n entier, par composition — limite de u par le moteur entier (formes
  indéterminées levées : `(x^2-x)^3` en +∞), puis `powerSign` (`limits/sign-tracking.ts`) :
  u → ±∞ donne ±∞ (n > 0, signe selon la parité) ou 0 (n < 0). u → 0 avec n < 0 n'y est PAS
  traité : `classifyWithSign` suppose un signe constant près du point et rendait −∞ pour
  `(\frac{\sin x}{x})^{-1}` en +∞ (revue de #1839) ; les pôles `(x-3)^{-n}` passent par
  d'autres stratégies. Avant elle, `(x-3)^2` en +∞ sortait « non supportée » (la
  composition ne connaît que xⁿ, variable nue) et `.variations (x-3)^2` n'avait pas de
  tableau. **En −∞** (V67, V69, 2026-10-26) : `powExtended` (`normal/normalize-extended.ts`)
  calcule (−∞)ⁿ, n entier non nul, signe selon la parité — sans lui l'évaluation exacte levait
  dès `x^2`, et `\frac{(x-3)^2}{x^2}` en −∞ n'était pas vu ∞/∞ (non supportée ; 1 en +∞). Un
  exposant non entier y reste refusé : `undefinedTowardInfinity` sonde aussi la base de u^a, a
  constant non entier hors du cas p/q de dénominateur impair (`nonIntegerPowerBase`, convention
  de `computePowerDomain`) — `(x-3)^{\frac{3}{2}}` en −∞ n'existe pas, hors du domaine, comme
  `\sqrt{x-3}`. Conséquence : x² + x en −∞ est désormais la forme exacte +∞ − ∞, que
  `classifyWithSign` dit « inconnue » ; `isPositiveNear` demande alors la limite au moteur entier
  (+∞ ou réel > 0 démontrés) — `\ln(x^2)-\ln(x^2-x)` en +∞, sans valeur avant, vaut 0. La
  **stratégie 2.85** (`tryReciprocalByConjugate`, après 2.8, en ±∞ seulement) réécrit
  l'inverse d'une somme à conjuguer par `reciprocalByConjugate` (`limits/sum-reduction.ts`) :
  N/(√A − B) = N(√A + B)/(A − B²), (√A − B)^{−n} = ((√A + B)/(A − B²))ⁿ —
  `\frac{1}{\sqrt{x+1}-\sqrt{x}}` en +∞ = +∞, forme 1/0 dont le signe n'était pas suivi.
  `findConjugate` (`limits/algebraic.ts`) connaît √A − √B (conjugué √A + √B, produit A − B).
  **Exponentielles** (V68, 2026-10-27) : la **stratégie 2.47** (`tryExponentialOfUnboundedLimit`,
  après 2.46) traite a^u (a > 0 constant, a ≠ 1, e compris) et `\exp u` quand u → ±∞ selon le
  moteur entier : +∞ ou 0 selon le signe et a > 1 ou a < 1 — `e^{x^2-x}` en +∞ (+∞),
  `e^{x-x^2}` (0) sortaient « non supportée », la composition classant u en arithmétique exacte,
  qui ne lève pas +∞ − ∞. Le produit (2.56) sous la forme 0 × ∞ sans facteur quotient réécrit
  un facteur a^u de limite nulle en dénominateur, f·a^u = f/a^{−u} (`productOverExponential`) :
  `(x-3)^2e^{-x}` = `\frac{(x-3)^2}{e^{x}}` en +∞, conclu par L'Hôpital (seule la limite connue
  xⁿe^{−x} concluait). Enfin `detectIndeterminateForm` (`limits/indeterminate.ts`) tranche une
  somme exacte +∞ − ∞ en ±∞ par le terme dominant (`limitByGeneralizedDegree`, cas infini
  seulement) : le repli numérique classait `x^2-6x+9` « fini » (10²⁰), et
  `\frac{x^2-6x+9}{e^x}` n'était pas vu ∞/∞. Reste refusé (pas faux) : `x^3e^{-x^2+x}` et
  `x^2e^{-\sqrt{x}}` en +∞.
  Les étapes « limite à gauche /
  à droite » d'une limite bilatérale s'écrivent en `a^-` / `a^+` (côté étudié, pas celui de la
  limite).
- **Fonctions en escalier** (`limits/piecewise.ts`, `evaluatePiecewiseLimit`, V60,
  2026-10-14) : `floor`, `ceil`, `round`, `sign`/`sgn` dépendant de la variable sont tranchées
  par `evaluateLimit` AVANT toute stratégie (la substitution directe ne voit pas les sauts :
  `floor(x)` en 1 rendait 1). Chaque appel g(u) devient la constante qu'il vaut au voisinage, du
  côté demandé : L = lim u (moteur) ; L hors d'un saut → g(L) (exact sur un rationnel, flottant
  sur un irrationnel loin du saut, refus à moins de 10⁻⁹) ; L sur un saut (entier, demi-entier
  pour `round`, 0 pour `sign`) → le côté lu sur la limite de 1/(u − L) (±∞), **confirmé** sur
  u − L en a ± 10⁻³, 10⁻⁴, 10⁻⁶ (en ±∞ : ±10³, 10⁴, 10⁶), non nul et du signe annoncé — le moteur
  rend +∞ même quand u − L ≡ 0 de ce côté (`sign(x+|x|)` en 0⁻), d'où un refus ; π tapé `π`
  (variable du parseur) vaut la constante dans ces évaluations ; u → ±∞ → `sign`
  vaut ±1, `floor`/`ceil`/`round` tendent vers cet infini **seulement si l'appel est toute
  l'expression**. Le reste se calcule par le moteur. Sans côté, en un point fini : les deux
  côtés, différents → `does-not-exist` / `sides-differ` (`floor(x)` en 1 : 0 et 1 ;
  `floor(sin x)` en 0 : −1 et 0), égaux → leur valeur (`floor(x^2)` en 0 = 0). **Refus**
  (`unsupported`) : appels imbriqués, argument sans limite ou côté illisible, `floor(x)/x` ou
  `x − floor(x)` en ±∞, `mod`/`gcd` appliqués à la variable (fonctions des entiers). Les étapes
  du résultat sont vidées (elles parleraient du reste). Remplace l'ancienne évaluation en
  a ± 10⁻⁸. Tests : `limits/__tests__/step-functions.test.ts`.
- **Domaine d'un côté, raison du « pas de limite », oscillation** (`limits/evaluate.ts`,
  2026-10-14). Deux champs optionnels de `LimitResult` (`limits/types.ts`) :
  `definedSide: 'left' | 'right'` — limite bilatérale en un point fini où f n'est définie que
  d'un côté au voisinage (`\ln x`, `\sqrt{x}` en 0 → `'right'`, `\sqrt{-x}` → `'left'`) : la
  valeur est celle de ce côté (convention lycée, x → 0⁺), `direction` reste `'both'` ; absent si
  un côté est demandé, en ±∞, ou si l'étude du domaine n'a pas montré de côté unique
  (`\sqrt{\cos x}` en π/2 n'est pas vu). `noLimitReason`
  (`NoLimitReason`) sur un `does-not-exist` : `'outside-domain'` (f non définie au voisinage du
  côté demandé : `\sqrt{x}` en −1, `\ln x` en −∞), `'sides-differ'` (gauche ≠ droite : `1/x` en
  0, `x^{-1/3}` en 0), `'oscillation'`. L'analyse côté par côté (stratégie 6) se déclenche aussi
  en un **point exclu** du domaine (`isOnDomainBoundary`, `limits/one-sided.ts` : `2 + 1/x` en 0),
  et ne conclut « pas de limite » que si les DEUX côtés ont une limite exacte ou infinie
  différente — un côté non conclu laisse la main aux stratégies suivantes. **Oscillation** (`oscillatesWithoutLimit`, stratégie
  6.5, en dernier recours) : `a\sin(u) + b`, `a\cos(u) + b` (a ≠ 0 et b constants ; somme à un
  seul terme variable, facteur ou diviseur constant, opposé) avec u → ±∞ du côté demandé — en
  bilatéral en un point fini, des deux côtés (`\sin\frac{1}{x}` en 0). Les limites trouvées
  avant restent (`\frac{\sin x}{x}` en +∞ = 0, `x\sin\frac{1}{x}` en 0 = 0) ; `x\sin x`,
  `\sin x + \cos x` restent `unsupported`. Un facteur qui oscille ne déclenche pas l'analyse
  côté par côté du produit (`tryProductOfLimits`). Tests :
  `limits/__tests__/domaine-oscillation-exactitude.test.ts`.
- **`integration/integrators/quadratic-denominator.ts` `factorQuadratic`** : trinôme lu par
  `toPolynomial` (toute écriture : `x(x-5)+6`, `(2x-1)(2x+1)` passent), racines par
  `quadraticRootParts`. Le littéral `x² − a²` garde sa lecture par `extractQuadraticCoefficients`.
  **`factoredDenominator`** écrit le dénominateur à facteurs entiers (décision de David du
  2026-10-12), plus d'exception : `k(q₁x − p₁)(q₂x − p₂)`, rᵢ = pᵢ/qᵢ, `k = a/(q₁q₂)`, par
  `integerLinearFactorNode` (`factor/common-root.ts`) — `4x² − 1` devient `(2x - 1)(2x + 1)`,
  `2x² − 2` reste `2(x - 1)(x + 1)`. La décomposition (`partial-fractions.ts`, `factorDenominator`
  cas 7 `integerLinearPower`) lit `px + q` et `(px + q)^n` à coefficients rationnels par
  `toPolynomial` : les coefficients restent calculés sur la base 1/(x − r)ʲ, la primitive écrit le
  facteur entier, A/(x − p/q) donnant A ln|qx − p| (et A·q^(j−1)/(1 − j)·(qx − p)^(1−j) pour
  j ≥ 2). Primitive de 1/(4x² − 1) : `\dfrac{1}{4}\ln|2x - 1| - \dfrac{1}{4}\ln|2x + 1|`, plus
  `\ln|x - \dfrac{1}{2}|`. Coefficient dominant 1 : rendu inchangé.
- **`pedagogical-integration/_helpers.ts` `tryDetectPartialFractions`** : racines et
  coefficients A, B exacts (`Rational`) au lieu de flottants « rationnels » ; la décomposition
  s'écrit `\frac{3}{2(x - 1)} + \frac{1}{2(x + 1)}` (plus `\frac{1.5}{x - 1}`), le signe dehors.
  L'explication de `decompose-rational` écrit le dénominateur factorisé par
  `factorizationToNode` : `4x^2 - 1 = (2x - 1)(2x + 1)`, une égalité vraie (K21, V22 : elle
  annonçait `(x − r₁)(x − r₂)` sans le coefficient dominant). Depuis le 2026-10-12, la
  décomposition elle-même porte sur ces facteurs entiers (`integratePartialFractions`,
  `pipeline.ts`) : `\frac{1}{2(2x - 1)} - \frac{1}{2(2x + 1)}` (A′ = A·q), primitive
  `\frac{\ln|2x - 1|}{4} - \frac{\ln|2x + 1|}{4}` ; les facteurs annoncés (`factor1`,
  `factor2`) sont ceux du dénominateur factorisé. Un facteur `px + q`, p ≠ 1, ajoute la liaison
  `p`, qui fait écrire les formules en `$\int \dfrac{A}{px+q}\,dx = \dfrac{A}{p}\ln|px+q|$`. Un coefficient nul
  (P et Q ont un facteur commun, `(3x + 1)/(6x² − x − 1)`) laisse un seul terme
  (`\frac{1}{2x - 1}`) au lieu du refus d'avant.

Tests : `limits/__tests__/factorisation-noyau.test.ts`,
`pedagogical-limits/__tests__/factorisation-noyau.test.ts`,
`integration/__tests__/denominateur-trinome-noyau.test.ts` (F′ = f par `areEquivalent`),
`pedagogical-integration/__tests__/elements-simples-exacts.test.ts`, facteurs entiers :
`{integration,pedagogical-integration}/__tests__/elements-simples-entiers.test.ts` ; K21 :
`pedagogical-limits/__tests__/{valeur-exacte,point-fractionnaire,terme-preponderant}.test.ts`,
`pedagogical-integration/__tests__/explications-exactes.test.ts`.

### Le ménage (lot 3b)

Supprimés, faute d'appelant hors de leurs tests (grep sur `src/`, `scripts/`, `tests/`, chaînes
comprises) : `transform/` entier (`factorAlgebraic`, `factorize`, `factorizeH`…) ; les formules
somme → produit `trigFactorizationRules`, `hypFactorizationRules` et les agrégats
`allTrigRules`, `allHyperbolicRules`, lus par `transform/` seul ; dans `analysis/structures.ts`,
`isQuadraticForm`, `isFactoredForm`, `hasCommonFactor`, `detectStructure` ; avec eux
`analysis/polynomial-analysis.ts` (`analyzePolynomial`, `getPolynomialCoefficients`…, dont
`isQuadraticForm` était le seul lecteur) ; `analyzePolynomial` de `sign/helpers/interval-sign.ts` ;
`isRootAt` de `pedagogical-limits/helpers.ts`.

Doublons qui restent, chacun pour un autre besoin :

- **Carré parfait** : `isPerfectSquareTrinomial` (`analysis/structures.ts`) lit des termes
  **symboliques** (`sin²x + 2 sin x cos x + cos²x`, plusieurs lettres) pour `simplify` et `auto` ;
  `polynomialIdentity` (stratégies) des coefficients entiers d'un polynôme d'une lettre ;
  `tryFactorPerfectSquareTrinomial` (`normal/normalize.ts`) une `NormalForm`, sur le chemin du
  décideur (ADR 0006).
- **PGCD de monômes** : le contenu de `common-factor.ts` lit l'écriture sans développer deux
  sommes, avec des facteurs non polynomiaux (`eˣ`, `(x+1)`) et une politique « PGCD entier
  seulement » ; `gcdMonomials` (`normal/monomial.ts`) travaille sur la forme normale (chemin du
  décideur, et `solve`).
- **Division de polynômes** : `deflate` / `divideOutRoot` (noyau, ℚ, par x − r) ;
  `divideUnivariate` (coefficients algébriques, utilisée aussi par `partial-fractions.ts` et le
  grapheur) et `exactDividePolynomials` (multivariée), toutes deux dans `normal/`.
- **Extracteurs de coefficients** : `toPolynomial` / `toRationalFunction` (noyau, exacts) ;
  `toUnivariateView` (`normal/`) ; (`asPolynomial` et `polyToNode`, lecteur en flottants de
  `pedagogical-limits/helpers.ts`, supprimés après V26 : le terme dominant en ±∞ passe au noyau) ;
  `extract{Quadratic,Cubic,Quartic}Coefficients` (`solve/`, coefficients `MathNode`).
- **Δ** : un seul calcul exact sur ℚ, `discriminant` (`factor/quadratic.ts`). Les autres
  calculent en `MathNode` pour l'afficher (`pedagogical-solve/quadratic.ts`, `solve/`) ou en
  flottants sur des coefficients décimaux (`domain/preimage.ts`, solveurs de degré 3-4 de
  `solve/`).

## Points ouverts connus (mesurés le 2026-10-10, mis à jour le 2026-10-27)

- Fusion des deux moteurs : `reduire` et `auto` ne passent plus par `normalize` (2026-10-23),
  `developper` non plus (2026-10-25, chantier normalize-usages). Les copies locales de
  `denormalize(normalize())` passent par `canonicalForm` (lot b) ; restent ~75 appels écrits en
  ligne, internes (valeurs exactes, comparaisons), voulus (§ 23 de simplify-carte). **78 le
  2026-10-27** (3 nouveaux depuis, rien ne l'empêche) : à passer tous par `canonicalForm`, sans
  rien changer à l'écran, avec une garde qui refuse un nouvel appel en ligne — à faire avec la
  fin de la fusion ci-dessous.
  **Futur chantier (David, 2026-10-27) : finir la fusion.** `simplify()` sert encore au repli de
  l'atelier (`atelier/calcul.ts` : sans étape de `pedagogical-simplify`, `.simplifier` montre
  la sortie de `simplify()`, calculée en silence — `cos(π/3)/x → 1/(2x)` passait par là avant le
  chantier valeurs-remarquables), à la commande `simplify` du REPL (`simplify.command.ts`) et à
  Taylor (`taylor/expand.ts`). Les 3 écarts du panel sont tous en faveur d'`auto` (il sait,
  `simplify()` non) : ils ne bloquent rien. Question à trancher, après un relevé des entrées
  qui tombent dans le repli : sans étape, l'atelier garde-t-il l'expression telle quelle
  (« ce qu'on ne sait pas expliquer, on ne le fait pas », ADR 0007) ou montre-t-il le résultat
  sans étape, comme aujourd'hui ?
- Restes de simplify-carte jamais versés ici (relevés le 2026-10-27 dans
  `docs/archive/wip/simplify-carte-progress.md`) :
  - **bascule des modèles existants** vers la correction automatique (correction écrite →
    `generatedSteps`) : « plus tard » (David, § 67-68, Q38) ;
  - **`pnpm math` à brancher sur l'atelier** (console Calcul en ligne de commande) : futur
    chantier (§ 68) ; aujourd'hui les deux divergent ;
  - **conventions d'échec des évaluateurs** (lot 6, § 100) : des évaluateurs laissent passer NaN,
    d'autres lèvent une exception qui remonte ; le lot « 6c » (une convention, un test rouge par
    site) n'a pas été fait ; le signe d'un pôle (`1/(−x)` en 0 : signe du numérateur ou −0 de
    `compile`) reste non tranché, ancienne règle par défaut ;
  - **`tidy` dans `evaluate`** (§ 13, option B) : A choisie (une fonction « valeur exacte à
    afficher »), « B reste possible plus tard » ;
  - **Q29** (§ 62) : `eˣ·eˣ → e^{2x}` fait ; un `(eˣ)²` tapé devait rester tel quel, ce que `tidy`
    ne distinguait pas — à vérifier.
- Laissés par le chantier normalize-usages (2026-10-26), écritures de `developper`, aucune
  valeur fausse : `(x+1)/π → x/π + 1/π` et `(x+1)/√2` en deux écritures (le coefficient ne
  passe devant que pour un dénominateur entier) ; `√8` seul reste écrit (`√8(x+1) → 2√2x +
2√2`) ; ordre d'une somme d'exponentielles ; `x(1/x − 1) → −x + x/x` (dans l'atelier, le
  bouton « Simplifier pour x ≠ 0 » donne `−x + 1`, chantier tidy-conditions). `√x√x` → rien
  à développer (produit sans parenthèse), mais `√x³√x → (√x)⁴` (une puissance de racine déjà
  écrite) et `∛x∛x → (∛x)²` se regroupent encore.
- Laissés par le § 4.2 de tidy-conditions (2026-10-26, `domainChanges` par ensembles), aucune
  valeur fausse : à plusieurs lettres, une réécriture qui rétrécit le domaine n'a ni bouton
  ni simplification quand une condition d'après porte sur deux lettres (`ln((x+y)z)` ; depuis
  le § 5, L5, `ln(xy) → ln x + ln y` a son bouton « pour x > 0 et y > 0 ») ; à plusieurs
  lettres encore, `√x √y → √(xy)` (élargit) n'a pas de note ; `.simplifier ln(6x) − ln(2x)`
  s'arrête sur `ln 6 + ln x − (ln 2 + ln x)` (le développement, plus long, n'est pas retenu ; `ln 3`
  attendu) — corrigé en PR D : `ln(xy) − ln(xy)`, `ln(2x) − ln(2x)`, `ln(x(x+1)) − ln(x(x+1))`
  ont leur bouton `0` (parenthèses implicites écrites après la phase A, et dans `engineAlternative`
  la réponse de `tidy` seul quand elle est plus courte) ; une condition dont les points
  exclus n'ont pas d'écriture exacte reste entière (`x³ − 2 ≠ 0` ; les irrationnels exacts
  s'écrivent depuis le § 5, `x ≠ √2`) ; le bouton d'un calcul qui passe par
  une étape plus étroite que sa condition n'a pas d'étapes (`e^{ln(x²)}` → `x²`, pour x ≠ 0,
  sans le détour par `2 ln x`). Corrigé ensuite : `e^{k ln a + c}` (k et a > 0 rationnels)
  se réduit en `aᵏ e^{c}` dans `normalize` (`e^{2 ln 3}` → `9`, `e^{1 + ln 2}` → `2e`, § 5,
  L6 ; `e^{2 ln x}` garde son écriture) ; `e^{ln a}` pour un nombre `a ≤ 0`
  (`e^{ln(−3)}` donnait −3, `e^{ln(−1/2)}` était équivalent à −1/2) n'est plus réduit, ni par
  `normalize` ni par le moteur pédagogique (`isNonPositiveConstant`).
- Laissés à la clôture de tidy-conditions (2026-10-26, journal archivé
  `docs/archive/wip/tidy-conditions-progress.md`), aucune valeur fausse :
  - conditions : `cot`, `sec`, `csc`, `arccosh` n'ont pas de condition écrivable (la
    simplification n'a pas lieu) ; `computeDomain(1/(sin x cos x))` rend kπ au lieu de kπ/2
    (`domain/compute`, d'où `avoidsPeriodicPoints` limité à `cos u` / `sin u` seuls) ;
    libellés bruts (« pour x^2y > 0 », « 2xy > 0 ») et conditions redondantes (« xy > 0 et
    x > 0 et y > 0 », « x/y > 0 et y ≠ 0 ») ; condition écrite sur le facteur
    (`ln(ln(x) y)` → « pour ln(x) > 0 et y > 0 », sans `avec` proposé) ; `ln(xy) − ln y` sans
    bouton ; `engineAlternative` ne vérifie pas chaque étape sur l'ensemble annoncé quand le
    domaine rétrécit ;
  - différences de ln : `.factoriser ln(xy) − ln(xy)` (bouton `ln x + ln y − (ln x + ln y)`) ;
    `.simplifier ln x + ln y − ln(xy)` (bouton « pour xy > 0 » non réduit) ; `.simplifier
ln(2x) − ln(2x)` garde `ln x − ln x` sur la ligne ;
  - `tidy` : deux termes gardés sous une barre ne se regroupent pas (`1/(1/x) + 1/(1/x)`) ;
  - `normalize` : `e^{k ln a}` plafonné à |k| ≤ 1000, mais `exp(10000000 ln 2)` n'a pas de
    plafond (antérieur) ; `e^{ln 1 + x}`, `e^{2 ln e}`, `e^{2 ln √2}` gardent leur écriture ;
    `2^{1/3}` et `∛2` ont des formes normales différentes ;
  - Q14 : entre constantes, le rationnel d'abord, donc `√2 − √3 − 1` s'écrit `√2 − 1 − √3`.
- Laissés par le chantier valeurs-remarquables (2026-10-27) :
  - **`.domaine 1/(x − cos(π/3))` → `ℝ \ {1/2}` voulu plus tard** (David, 2026-10-27) ;
    aujourd'hui `ℝ \ {cos(π/3)}`, juste ;
  - les corrections d'exercices de résolution (`correction-generator.ts`, `pedagogical-solve`)
    n'ont pas l'étape de valeur : seul `.résoudre` de l'atelier la fait (les corrections de
    développement l'ont, par `explainExpansion`) ;
  - `.simplifier cos(0.5π)x` → `0` sans étape (repli du moteur, décimal) ;
    `cos(\frac{-\pi}{3})` est refusé comme écriture mélangée ;
  - revue de la PR (aucune valeur fausse) : `sin(−(π/6))` garde sa parenthèse et n'atteint pas
    la valeur (`extractPiCoefficient`) ; l'étape réunie de `withValuesTogether` montre la ligne
    entière, une période du même passage y passe sans être nommée
    (`sin(π/3) + cos(π/6) + tan(7π/3)`) ; `cos(30° + 30°)` devient `cos(60°)` « au propre » sans
    que la valeur suive ;
  - `.résoudre cos(π/5)x = 1` titre « On divise par $\cos(\frac{1}{5}π)$ » (écriture du
    solveur, antérieur).
- Laissés par le chantier simplify-carte (2026-10-25), **à trancher par David**, aucun ne donne
  une valeur fausse :
  - `.intégrer` à bornes : une borne décimale dans une exponentielle mêle les registres
    (`∫₀^{0,5} 0,5eˣ = \dfrac{1}{2}e^{0,5} − \dfrac{1}{2}`) ; paramètre au dénominateur laissé en
    fraction (`0,5e^{ax}` de 0 à 1 → `(e^a − 1)/(2a)`) ; `0,5x²` de 0 à a → `\dfrac{1}{6}a³` ;
  - `.simplifier` : `x(−eˣ)e` non regroupé ; `\frac{e^{2x}x}{eˣx} → \frac{x eˣ}{x}` ;
  - `factoriser` sur `(a+b)(a−b)/((a−b)(a+b))` rend `(a+b)·1/(a+b)` ; facteurs opposés non
    reconnus (`(x²−1)/(1−x)` reste) ; `MAX_FRACTIONS = 8` coupe en silence ;
  - `tidy` : `reduceFractionOfSums` ignore `domain` (`(2x−2)/(x−1)` reste) ;
  - `detectSymmetry` conclut « aucune, prouvé » pour `∛x`, `x^{1/3}`, `x^{2/3}`,
    `ln(x+√(x²+1))` (sans appelant en production) ;
  - `toCustom` écrit `(1/2)^xe^x`, illisible en syntaxe maison.
- Solveur du second degré à paramètre (relevé le 2026-10-26, revue de #1797, visible aussi au
  degré 3 par `x(ax² + bx + c) = 0`) : `x² − ab = 0` → `±√a·√b` si `4ab ≥ 0` (faux pour a, b < 0,
  il faut `√(ab)`) ; `ax² − 1 = 0` → condition `a ≥ 0` au lieu de `a > 0` ; conditions non
  réduites (`4α ≥ 0`, `4a + 4b ≥ 0`), racines peu lisibles (`½√(−4a)`) ; une condition réduite à
  un point écrite `0 ≤ a ≤ 0`, ses racines gardées : `x³ + a²x = 0` → 0, puis deux racines nulles
  si a = 0 (redondant, pas faux) ; étapes détaillées en double, coefficient « a » homonyme du
  paramètre.
- Solveur pédagogique, écritures perfectibles (simplify-carte § 87, § 89), **à trancher par
  David** : x à droite (`4 < 2(x−1)` → `2 < x − 1`, puis − x, − 2, ÷ (−1) ; échanger les
  membres ?) ; `\frac{2}{3}x = 0,5` → « On multiplie par 1,5 » ; `0,5x = \frac{x}{3} + 1` → « On
  divise par 1/6 » ; correction de question d'une inéquation sans `stepsAsShown`
  (`-0,25(x−2) ≥ 1` → « On divise par −1/4 », l'Atelier dit −0,25) ; le pipeline rationnel
  multiplie la fraction tapée pour n'avoir que des entiers (`(x − 0,5)/(x + 1) > 0` annonce
  `P(x) = 2x − 1`) ; `(x − 1)/(x² − 1) ≥ 0` raisonne sur la fraction simplifiée (le 1 interdit
  disparaît des étapes, réponse juste) ; `x² < −1` sans étapes.
- `ParseCache` exporté, jamais branché ; `pedagogical-evaluate/` réduit à des types.
- Cycle dans `runPatternLoop` (`pedagogical-simplify/pipeline.ts`) : sur `x(1+1)` et
  `x(1-1)`, `sum-cubes-numeric` (et `diff-squares-numeric`) tirait jusqu'à la limite de
  20 itérations sans point fixe. **Corrigé pour `factoriser` le 2026-10-11** : ses règles
  d'identité ne touchent plus un nombre seul (`factoriserIdentityRules`, mesuré : `x(1-1)` →
  0 étape). Les règles d'origine gardent ce défaut là où elles servent encore (`simplify`, sous
  barrière de coût) ; la boucle s'arrête toujours sans le signaler.
- `solve` ne gère pas les inconnues indicées : `x_1+1=3` répond « pas de solution »
  (`getVariables` rend la base `x`) ; `e_1+1=3` et `i_1+1=3` aussi (le refus « constante
  d'Euler » / « unité imaginaire » ne s'applique pas quand l'arbre contient une variable `e`
  ou `i`, base d'une variable indicée : `reservedVariableRefusal`).
- Domaine (`domain/compute.ts`, relevé le 2026-10-15) : `shiftedLinearRoot` construit un nœud
  `{ type: 'opposite', … }` à la main, hors `factory.ts` (invariant 2) ; l'inversion exacte de
  `ln u ⊳ c` / `e^u ⊳ c` ne couvre ni u non affine (`\ln(x^2)-1`) ni `log`, `log10`, `log2`
  avec c ≠ 0 (contrainte `unresolved`).
- Les filtres de noms qui écartent `e` et `i` de `getVariables` (`atelier/solve-steps.ts`,
  `questions/calculus/calculus-reading.ts`, `CONSTANT_NAMES` de `cli/core/variable-argument.ts`)
  ne servent plus que pour `e_1`, `i_1`, `u_i`, qu'ils traitent à tort comme des constantes.
- Limites, évaluation flottante (relevé le 2026-10-25, simplify-carte lot 6a) : `evaluateNumeric`
  (`common/numeric.ts`), seul évaluateur flottant de `limits/` et de `evaluateAtPoint` des limites
  pédagogiques (réglage `'undefined'`), **n'évalue ni π ni e** (`null`). Le moteur compte sur ce
  `null` pour prendre le chemin exact : les évaluer (ou passer par `compile`) ferait de
  `lim_{x→+∞} (x+1)/(πx)` le décimal `0,3183…` au lieu de `1/π`. À reprendre en rendant le choix
  « exact ou numérique » explicite dans le moteur, pas en dépendant d'une lacune de l'évaluateur.
- Limites, laissés par le chantier limites-ecarts (2026-10-27, journal archivé
  `docs/archive/wip/limites-ecarts-progress.md`) :
  - **valeur fausse, antérieure** : `\frac{1}{e^{-1/x}\sin\frac{1}{x}}` en 0⁺ rend +∞ — sur la
    fenêtre dense de `oscillatesUnboundedNear` (`limits/sign-tracking.ts`), e^{−1/x} vaut 0 en
    flottant, aucun changement de signe n'est vu ;
  - refus (pas faux) : u^{−p/q} non entier (`(1-\cos x)^{-1/2}` en 0, +∞ attendu) ; produit
    f·u^{−n} jamais réécrit en quotient (`x^{-1}\sin x`, `(1-x)^{-1}\ln x`, `x^2(\cos x-1)^{-1}`,
    alors que `\frac{\ln x}{1-x}` conclut) ; `x^3e^{-x^2+x}`, `x^2e^{-\sqrt{x}}` en +∞,
    `x^{\frac{4}{2}}` en −∞ ;
  - approché : `\frac{x^2}{x\sin\frac1x}` en 0⁺ « ≈ 0 » ;
  - paramètre de signe inconnu (`e^{kx}` en +∞ rendait +∞) : refusé depuis le chantier
    `limites-parametres` (choix A) ; la discussion selon le signe de k (choix C) est pour plus tard.

## Décisions

| Décision                                                   | Où                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Correction côté client                                     | [ADR 0001](../../adr/0001-correction-cote-client.md)                             |
| Réduire pour comparer (`equivalenceForm`), pas pour écrire | [ADR 0006](../../adr/0006-reduire-pour-comparer-pas-pour-ecrire.md)              |
| Un moteur, quatre intentions                               | [ADR 0007](../../adr/0007-un-moteur-quatre-intentions.md)                        |
| Les hypothèses de l'énoncé restreignent la comparaison     | [ADR 0012](../../adr/0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) |
| Un moteur commun de factorisation (amende 0007)            | [ADR 0024](../../adr/0024-moteur-commun-de-factorisation.md)                     |
| La forme affichée se choisit par le but                    | [ADR 0032](../../adr/0032-la-forme-affichee-se-choisit-par-le-but.md)            |

Décisions de module, toujours en vigueur (ex-`decisions.md` de juin, revérifiées) :

- **AST maison en TypeScript**, union discriminée, nœuds binaires aplatis à la demande,
  plutôt que mathjs (mutable, sans forme normale) ou un portage de Poincaré (C++).
- **Forme normale séparée** (`NormalForm` : polynômes de termes à coefficients
  algébriques) pour le calcul exact et l'égalité par hachage.
- **Pas de nœud `Undefined`** : `simplify(1/0)` rend `1/0`, `normalize(1/0)` lève
  `normalize: division by zero` ; `0^0` se simplifie en `1`. Le domaine relève de
  `domain/`.
- **Immuabilité par convention** (`readonly`, pas de `Object.freeze`, pour le coût).
- **Négatifs = `opposite(positif)`**, garde dans `number()` (invariant 1).

## Documents liés

- [tidy-spec.md](tidy-spec.md) — contrat de `tidy` (§A), `simplify` avec `tidy` (§B),
  attendus case par case d'`auto` (§C).
- [panel-simplifications.md](panel-simplifications.md) — ce que rendent `simplify` et les
  quatre intentions, pinné par un test.
- [convention-equivalence.md](convention-equivalence.md) — ce que `areEquivalent` veut dire.
- [pattern-matching.md](pattern-matching.md) — le module `pattern`.
- [reciproque.md](reciproque.md) — la réciproque calculée (`reciprocal/`).
- [notation-unites.md](../../pratiques/notation-unites.md) — écrire une grandeur.
- [grandeurs.md](../grandeurs.md) — lire, calculer, écrire une grandeur : le contrat unique.

## Glossaire technique

- **AST / `MathNode`** — l'arbre d'une expression ; union de 29 variantes (`types.ts`).
- **constructeur (factory)** — fonction de `factory.ts` qui fabrique un nœud ; seule voie
  sûre (gardes).
- **`delimiter`** — nœud de parenthèses ; frontière d'aplatissement et de motif.
- **aplatir** — passer d'un arbre binaire à une liste de termes signés (`FlatSum`,
  `SignedTerm`) ou de facteurs (`FlatProduct`, `StyledFactor`).
- **`tidy` / mise au propre** — réécriture sans développer ni factoriser.
- **`NormalForm` / forme normale** — représentation canonique développée de `normalize`.
- **décideur** — `areEquivalent`, qui dit si une réponse a la bonne valeur.
- **contrainte de forme** — exigence d'écriture vérifiée par `checkForm` (`strict`/`warn`/`off`).
- **motif (`Pattern`)** — description d'une forme ; **joker** — partie du motif qui capture
  (`P._`) ; **règle** — motif + remplacement.
- **intention** — `reduire`, `developper`, `factoriser`, `auto` (`SimplifyIntent`).
- **palier** — niveau de détail d'une résolution pédagogique (1, 2a, 2b, 3).
- **`SchoolLevel`** — `'primaire' | 'college' | 'lycee' | 'superieur'`.
- **enregistreur (recorder)** — collecte les pas d'un calcul pour les rendre en étapes.
- **coût** — mesure de la complexité d'une écriture (`computeCost`), juge de `simplify`.
