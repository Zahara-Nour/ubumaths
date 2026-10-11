---
couvre:
  - 'src/lib/mathAST/**'
---

# mathAST — le moteur de calcul symbolique

> Code : `src/lib/mathAST/` · Agent spécialisé : `mathast-expert` (`.claude/agents/mathast-expert.md`).
> Cette page remplace la vue d'ensemble de juin 2026 et le `README.md` de `src/lib/mathAST/`
> (janvier), écrits avant `tidy`, la réécriture de `simplify()` (#378 → #389) et l'ADR 0007.
> **Vérifié contre le code le 2026-10-11.**

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
`src/lib/components/markdown/`, `src/lib/components/cas/`, `src/lib/ubumark/`,
`src/lib/grapheur/`.

Taille au 2026-10-10 : 502 fichiers `.ts` hors tests (~188 000 lignes), 445 fichiers de
test, ~14 000 cas (`it(`/`test(`).

## Carte du code

### Fichiers racine

| Fichier                                 | Rôle                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                              | l'union `MathNode` (29 variantes), `NodeMetadata`, styles d'affichage                                                                                                  |
| `factory.ts`                            | constructeurs de nœuds, regroupés dans l'espace de noms `MathAST`                                                                                                      |
| `guards.ts`                             | prédicats de type (`isAddition`, `isDelimiter`, `isFraction`, `isMinusOne`…)                                                                                           |
| `transforms.ts`                         | `mapNode`, `mapNodeTopDown`, `findNodes`, `findFirst`, `replaceNode`, `withMetadata`, `getChildren`, `cloneNode`, `countNodes`, `getDepth`, `stripUnnecessaryBrackets` |
| `visitor.ts`                            | `visitAST`, `transformAST`                                                                                                                                             |
| `flatten.ts`                            | `flattenSumShallow/Deep`, `flattenProductShallow/Deep`, `unflattenSum`, `unflattenProduct`, `unflattenRelationChain`, `flipSign`                                       |
| `exp.ts`                                | `Exp` : enveloppe chaînable (`Exp.parse(…)`, `.latex`, `.matches`, `.simplifyWith`…)                                                                                   |
| `equivalence.ts`, `equivalence-core.ts` | `areEquivalent` : le **décideur** de la correction                                                                                                                     |
| `assumptions.ts`                        | hypothèses de l'énoncé (« x > 0 », « n entier », ADR 0012) traduites pour le décideur                                                                                  |
| `cosmetic-transforms.ts`                | `checkForm` et ses transformations (contraintes de forme de la correction)                                                                                             |
| `decimal-comma.ts`                      | la virgule décimale nue (`3,14`) : nombre ou séparateur                                                                                                                |
| `latex-generator.ts`                    | `toLatex`, `LatexGenerator` (options `renderMetadata`, `preserveHoles`)                                                                                                |
| `custom-generator.ts`                   | `toCustom`, `CustomGenerator` (syntaxe maison)                                                                                                                         |
| `pretty-print.ts`                       | `prettyPrint` (débogage)                                                                                                                                               |
| `index.ts`                              | point d'entrée `$lib/mathAST`                                                                                                                                          |

### Sous-dossiers

| Dossier                                                                                                                             | Rôle                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lire et écrire**                                                                                                                  |                                                                                                                                                                                                                                                                                                                                                                                               |
| `parser/`                                                                                                                           | `parseLatex`/`parseLatexSafe` (`latex/` : Pratt par défaut, `rd` en option) ; `custom/` : syntaxe maison (`parseCustom`), motifs (`parsePattern`), règles (`parseRule`), contraintes ; `security.ts` (plafonds)                                                                                                                                                                               |
| `cache/`                                                                                                                            | `ParseCache`, LRU exporté mais **branché nulle part**                                                                                                                                                                                                                                                                                                                                         |
| **Mettre au propre, comparer**                                                                                                      |                                                                                                                                                                                                                                                                                                                                                                                               |
| `tidy/`                                                                                                                             | `tidy` : mise au propre **sans jamais développer** ; raconte ses gestes (`TidyStepRecorder`) ; grandeurs (`unitChoice`)                                                                                                                                                                                                                                                                       |
| `simplify/`                                                                                                                         | `simplify` : `tidy` + règles + « développer seulement si moins cher » (`computeCost`, `costFunction` injectable)                                                                                                                                                                                                                                                                              |
| `normal/`                                                                                                                           | `normalize` → `NormalForm` (forme normale rationnelle), `denormalize`, `equivalenceForm`, `hashMathNode`, `nodesEqual`                                                                                                                                                                                                                                                                        |
| `pattern/`                                                                                                                          | motifs (`P`, `tryMatch`), règles, jeux de règles, `verifyForm` — voir [pattern-matching.md](pattern-matching.md)                                                                                                                                                                                                                                                                              |
| `common/`                                                                                                                           | moteur de réécriture `rewrite`, `numericNode`, interruption (`AbortError`), bases des enregistreurs et rendus d'étapes, constructeurs simplifiants (`common/simplify.ts`), `e`, `i` jamais variables (`common/reserved-letters.ts`)                                                                                                                                                           |
| `numtype/`                                                                                                                          | inférence du type numérique (entier, rationnel, réel…) et `TypeContext`                                                                                                                                                                                                                                                                                                                       |
| **Calculer**                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                               |
| `eval/`                                                                                                                             | `substitute`, `evaluate`, `evaluateWithModifiers` (`{{eval}}`, grandeurs comprises), `compile`/`createSafeEvaluator`                                                                                                                                                                                                                                                                          |
| `differentiation/`                                                                                                                  | `differentiate`                                                                                                                                                                                                                                                                                                                                                                               |
| `integration/`                                                                                                                      | `integrate` (primitives, intégrales définies, numérique)                                                                                                                                                                                                                                                                                                                                      |
| `limits/`                                                                                                                           | limites (dont `analyzeSign` unilatéral de `limits/one-sided.ts`)                                                                                                                                                                                                                                                                                                                              |
| `solve/`                                                                                                                            | `solve`, `solveEquation`                                                                                                                                                                                                                                                                                                                                                                      |
| `domain/`                                                                                                                           | `computeDomain`, `findZeros`, intervalles                                                                                                                                                                                                                                                                                                                                                     |
| `factor/`                                                                                                                           | noyau exact de factorisation (ADR 0024) : `factorPolynomial`, `factorizationToNode` ; lecture exacte des polynômes, racines ±p/q et Δ partagées avec `domain/` — voir [§ factor/](#factor--le-moteur-commun-de-factorisation)                                                                                                                                                                 |
| `sign/`                                                                                                                             | `analyzeSign` (tableaux de signes)                                                                                                                                                                                                                                                                                                                                                            |
| `variations/`                                                                                                                       | `computeVariations`                                                                                                                                                                                                                                                                                                                                                                           |
| `taylor/`                                                                                                                           | développements de Taylor                                                                                                                                                                                                                                                                                                                                                                      |
| `analysis/`                                                                                                                         | continuité (`analyzeContinuity`), périodicité, symétrie, classification, détecteurs d'identités (`structures.ts`, lus par `algebraicFactoringRules`)                                                                                                                                                                                                                                          |
| `piecewise/`                                                                                                                        | `extractPiecewiseBoundaries` : ruptures d'une fonction par morceaux (consommé par `geometry-core`)                                                                                                                                                                                                                                                                                            |
| `matrix/`                                                                                                                           | opérations matricielles                                                                                                                                                                                                                                                                                                                                                                       |
| `units/`                                                                                                                            | unités physiques (`parse`, `format`, conversions, `selectBestUnit`) — doc : `units/README.md`, notation : [notation-unites.md](../../pratiques/notation-unites.md)                                                                                                                                                                                                                            |
| `dimensional/`                                                                                                                      | analyse dimensionnelle                                                                                                                                                                                                                                                                                                                                                                        |
| **Raconter**                                                                                                                        |                                                                                                                                                                                                                                                                                                                                                                                               |
| `pedagogical-simplify/`                                                                                                             | `generatePedagogicalSimplifySteps` : quatre intentions (`SimplifyIntent`)                                                                                                                                                                                                                                                                                                                     |
| `pedagogical-solve/`                                                                                                                | `generateEquationSteps`, `generateInequalitySteps` ; paliers par tables `STRATEGIES*`                                                                                                                                                                                                                                                                                                         |
| `pedagogical-arithmetic/`, `pedagogical-differentiation/`, `pedagogical-integration/`, `pedagogical-limits/`, `pedagogical-domain/` | `generatePedagogical…Steps` du domaine                                                                                                                                                                                                                                                                                                                                                        |
| `pedagogical-evaluate/`                                                                                                             | types seuls, aucune logique                                                                                                                                                                                                                                                                                                                                                                   |
| `step-generator/`                                                                                                                   | `generateSteps`, `canGenerateSteps`, `suggestLevel` (calcul arithmétique)                                                                                                                                                                                                                                                                                                                     |
| `structure/`                                                                                                                        | `structureFromLatex`, `buildStructure` : arbre des sous-expressions vu par l'élève (sommes et produits aplatis, signe « − » à la somme, `signs` gardés pour la lecture) et LaTeX marqué `\class{ubs-n<id>}{…}` au rendu identique à `toLatex` ; lecture en français (`readingOf`) et message « 6e ou avant » (`parenthesesAdvice`) ; outil « Structure d'une expression » (`/test-structure`) |
| **Outils**                                                                                                                          |                                                                                                                                                                                                                                                                                                                                                                                               |
| `cli/`                                                                                                                              | `pnpm math` (`cli/cli.ts`) : REPL et complétion ; grandeurs de la console (`cli/quantities.ts`) — doc : `cli/README.md`, `cli/web/README.md`                                                                                                                                                                                                                                                  |
| `__tests__/`                                                                                                                        | tests transverses (garde-fous, panel)                                                                                                                                                                                                                                                                                                                                                         |

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

| Fonction          | Rend         | Développe ? | Sert à                                                                                     |
| ----------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------ |
| `tidy`            | `MathNode`   | jamais      | écrire proprement : `2x+3x−x → 4x`, `(x+1)²` reste. Spec : [tidy-spec.md](tidy-spec.md) §A |
| `normalize`       | `NormalForm` | toujours    | calcul exact, forme canonique (`denormalize` pour revenir à un arbre)                      |
| `equivalenceForm` | `NormalForm` | toujours    | **comparer seulement** : y vivent les réductions trigonométriques (ADR 0006)               |

**`simplify(node, options)`** (`simplify/simplify.ts`) tourne sur le moteur `rewrite`
(`common/rewriting-engine.ts`), stratégie `cost-fixpoint`. Par itération : `tidy` →
règles de motif (`absSimplifyRules`, `trigSimplifyRules`, `hypSimplifyRules`,
`algebraicSimplifyRules`, coupables par `enableAbs`/`enableTrig`/`enableHyperbolic`/
`enableAlgebraic`) → `tidy`, puis le candidat `tidy(normalize(…))` ne remplace la forme que
s'il est **strictement moins cher**. C'est la seule place de `normalize` dans `simplify`.
Mesuré : `simplify((x+1)²)` garde `(x+1)²`, `simplify((x+1)²−x²)` rend `2x+1`.

**`areEquivalent(a, b, options?)`** : `equivalenceForms` puis `normalFormsEquivalent` ;
repli numérique (`evaluate` en mode décimal) si la normalisation échoue. Sens exact
(domaines, intervalles, équations, vecteurs…) : [convention-equivalence.md](convention-equivalence.md).
Ni `simplify` ni `pedagogical-simplify` ne sont sur ce chemin.

**`checkForm(réponse, attendu, contraintes, options?)`** (`cosmetic-transforms.ts`) :

1. chaîne : `removeZeros` (contrainte `zeros`), `checkSpacesViolation` (`spaces`),
   `removeSpaces`, `normalizeDecimalComma` ;
2. `parseLatexSafe` ;
3. arbre, dans cet ordre (`buildASTPipeline`) : unifications de notation sans contrainte
   (`e` : forme unique `euler()`, `\exp(u)` lu `e^{u}` ; `∞`, angles en π, complexes, fractions de monômes, `|x|` sous hypothèse) →
   `reduceRadicalsAST` (`reducedRadicals`) → `reduceFractionsAST` (`reducedFractions`) →
   `simplifyNullProductsAST` (`factorZero`) → `removeNullTermsAST` (`nullTerms`) →
   `stripUnnecessaryBrackets` (`brackets`) → `removeSignsAST` (`signs`) →
   `removeFactorsOneAST` (`factorOne`) → `removeMultOperatorAST` (`products`) →
   notations log/exponentielle → `sortTermsAndFactorsAST` ;
4. comparaison des `toLatex` (le signe `*` et `×` sont confondus) ; cas du pourcentage.

Chaque étape qui modifie la réponse lève sa contrainte (`strict`, `warn` ou `off`, défaut
`warn`). L'ordre est testé par `__tests__/cosmetic-transforms.test.ts` : ne pas le changer
sans relancer ce fichier.

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

**État au 2026-10-10 : décidé, pas fait.** Seule l'étape « donner une voix à `tidy` » est
livrée (#396, #397). Dans le code, `auto` passe toujours par `runNormalizePass`
(inconditionnel) et inclut les factorisations symboliques. Mesuré :
`auto` et `reduire` rendent `x²+2x+1` pour `(x+1)²`, là où `simplify` garde `(x+1)²`.
Le tableau des écarts, pinné par un test : [panel-simplifications.md](panel-simplifications.md).
Spec d'`auto` (colonne « attendu ») : [tidy-spec.md](tidy-spec.md) §C.

## factor/ — le moteur commun de factorisation

L'[ADR 0024](../../adr/0024-moteur-commun-de-factorisation.md) (2026-10-11) remplace la dizaine de
lieux qui factorisent chacun à sa façon par un module en deux couches : un **noyau exact sur ℚ**,
sans étapes, et des **stratégies qui racontent** (facteur commun, identités, racines du trinôme,
racine évidente) branchées sur l'intention `factoriser`. Livraison par lots : noyau → stratégies →
migration des appelants internes (`limits`, `integration`, `domain`, `normalize`) et suppression
du code mort → écriture des primitives (V18).

**État au 2026-10-11 : lot 1 (le noyau), lot 2 (les stratégies, branchées sur l'intention
`factoriser`, donc sur l'atelier), lot 3a (limites et intégration, voir
[§ Les appelants](#les-appelants-migrés-lot-3a)) et lot 3b (le ménage, voir
[§ Le ménage](#le-ménage-lot-3b)) écrits.** `normalize` et `solve` factorisent encore comme
avant (ADR 0006 : `normalize` est sur le chemin du décideur).

### Carte du code

| Fichier              | Rôle                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | point d'entrée du module                                                                                                                                                                                                                                       |
| `factor.ts`          | `factorPolynomial` et ses types (`Factorization`, `IntegerFactor`, `SurdFactor`), les bornes                                                                                                                                                                   |
| `render.ts`          | `factorizationToNode` : la factorisation en `MathNode`                                                                                                                                                                                                         |
| `polynomial.ts`      | `Poly` (coefficients `Rational` par degré croissant), arithmétique, `deflate`, lecteur `toRationalFunction` — repris de `domain/exact-roots.ts` ; `toPolynomial` (dénominateur constant exigé), `divideOutRoot` (division par (x − r) avec multiplicité)       |
| `rational-roots.ts`  | `extractRationalRoots` : x = 0 puis ±p/q, avec multiplicités — repris de `domain/exact-roots.ts`                                                                                                                                                               |
| `quadratic.ts`       | `discriminant` (Δ exact, partagé avec les stratégies) ; `quadraticRootParts` : racine double, racines rationnelles ou `centre ± écart·√m` — repris de `domain/exact-roots.ts`                                                                                  |
| `polynomial-node.ts` | `polynomialNode`, `monomialNode`, `integerNode` : un polynôme entier en nœud, négatifs en soustractions — repris de `normal/rules/trig-multiple-arcs.ts` ; `rationalPolynomialNode` (coefficients rationnels), `linearFactorNode` (`x - r`, `x + 3` si r = −3) |

`factor.ts` exporte aussi `compareFactors` (l'ordre des facteurs, réutilisé par les stratégies) et
`primitivePart` (contenu et partie primitive entière).

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

## Les nœuds

29 variantes dans `types.ts`, discriminées par `type` :

| Famille    | `type`                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| feuilles   | `number`, `variable`, `greek`, `symbol`, `constant` (`euler`, `pi`), `hole` (trou d'exercice)             |
| opérations | `addition`, `subtraction`, `multiplication`, `division`, `opposite`, `positive`                           |
| structure  | `delimiter`, `subscript`, `superscript`, `function`                                                       |
| relations  | `relation`, `boolean`, `logical`, `logical-not`                                                           |
| domaines   | `unit`, `percentage`, `matrix`, `composition`, `complex`, `infinity`, `signed-zero`, `limit`, `piecewise` |

- `multiplication.displayStyle` : `'implicit' | 'dot' | 'cross' | 'star'` ;
  `division.displayStyle` : `'fraction' | 'inline' | 'ratio'`. Le style ne change pas la
  valeur, il change l'écriture (et donc `checkForm`).
- `NodeMetadata` (couleur, style, annotation) : indications de rendu, jamais de sens
  mathématique ; rendues par `LatexGenerator` avec `renderMetadata: true`.
- `function` porte `name`, `args`, et en option `power` (`\sin^2 x`) et `base`
  (indice de racine `\sqrt[3]{x}`, base de logarithme).

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
    ⚠️ Ne pas relever ce plafond tant que le pgcd est celui d'Euclide : à 10 000, e et π (fractions
    de 16 chiffres) donnaient des fractions de centaines de milliers de bits, puis des pgcd de
    plusieurs secondes (`.variations e^{-2x^2}` : 5,7 s ; mesuré le 2026-10-12). Le pgcd de deux
    entiers de 40 000 chiffres coûte 1,5 s : `normalize` (puissance par multiplications réduites),
    `tidy` et `rational()` en calculent sur les grandes fractions. `powRational` calcule `nᵏ / dᵏ`
    par la puissance native de BigInt : une fraction irréductible élevée à une puissance le reste
    ((101/100)¹⁰⁰⁰⁰⁰ : 194 s avant, 2 ms). Les pôles de tan, sec, csc, cot sont refusés (le
    flottant de π/2 donnait tan = 1,6331 × 10¹⁶).

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
- La résolution d'équation pédagogique ne rejoue **pas** le solveur algorithmique : elle
  suit ce que l'élève fait sur papier (`pedagogical-solve/`). Paliers : 1 (équation du
  1er degré), 2a (inéquation du 1er degré), 2b (inéquation du 2nd degré), 3 (inéquation
  rationnelle) ; granularité par les tables `STRATEGIES`, `STRATEGIES_QUADRATIC`,
  `STRATEGIES_RATIONAL`. `generateEquationSteps` relève le niveau insuffisant
  (`primaire` → `college` pour le 1er degré, jusqu'à `lycee` pour le 2nd).
- **Dérivées et primitives finissent par « On simplifie ».** Les règles laissent le
  résultat brut (la méthode, qu'on garde visible) ; une dernière étape l'écrit avec
  `tidyTerms` (`tidy/terms.ts`). Dérivées : `withTidyStep`
  (`pedagogical-differentiation/tidy-step.ts`), ajouté par l'appelant. Primitives :
  `pushSimplifyStep` (`pedagogical-integration/pipeline.ts`) émet l'étape
  `simplify-result` avant le `+ C` (ou avant le théorème fondamental), **sauf** quand la
  primitive est un seul terme « coefficient en chiffres × une seule fonction » sous un `-`
  éventuel (`singleCoefficientTerm` : `\dfrac{1}{2}e^{2x}`, `-\dfrac{1}{3}\cos(3x+1)`),
  gardé tel quel si le coefficient est réduit (un `\dfrac{2}{4}e^x` devient
  `\dfrac{1}{2}e^x` par l'étape) ; un coefficient pas encore calculé
  (`\dfrac{1}{4}\dfrac{x^2}{2}`) passe par `tidy`. L'étape d'IPP écrit `uv - \int v\,du`,
  l'intégrale restante en toutes lettres, avant sa valeur (pas de « = » faux). Le facteur 1/u′ des formes composées est un rationnel exact
  (`findProportionalityRatio`), et l'exponentielle s'écrit `e^{u}`
  (`superscript(euler(), u)`), jamais `\exp(u)` (décisions de David du 2026-10-11).
- ⚠️ Les étapes de `normalize` sont du calcul interne, pas une leçon : elles arrivent
  pourtant dans `auto`/`reduire`/`developper` via `runNormalizePass` (ADR 0007 veut les
  retirer du chemin élève).

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
  `toPolynomial`, (x − a)^k sorti par `divideOutRoot`, k la plus petite des deux multiplicités ;
  le point d'approche est un **rationnel exact** (`extractExactRational`), donc négatif compris
  (`opposite`, invariant 1) ou fractionnaire. Tout polynôme de degré ≤ 8 qui a la racine, plus
  seulement `x² − a²`.
- **`pedagogical-limits`** (stratégies factorisation et rationalisation, `divideByCommonRoot`) :
  une racine par passe, comme avant (mêmes étapes, mêmes titres) ; quotients exacts écrits en
  soustractions (`x - 3`, plus `x + (-3)`), plus de `/1`, de `(x - 2)·1` ni de `1·(√x + 2)`. La
  substitution directe, les limites à un côté et les gendarmes acceptent aussi un point négatif
  ou fractionnaire.
- **`integration/integrators/quadratic-denominator.ts` `factorQuadratic`** : trinôme lu par
  `toPolynomial` (toute écriture : `x(x-5)+6`, `(2x-1)(2x+1)` passent), racines par
  `quadraticRootParts`. L'écriture du dénominateur factorisé reste unitaire,
  `a(x - r₁)(x - r₂)` : la décomposition en éléments simples (`partial-fractions.ts`) ne lit que
  des facteurs `x ± a`. Le littéral `x² − a²` garde sa lecture par `extractQuadraticCoefficients`.
- **`pedagogical-integration/_helpers.ts` `tryDetectPartialFractions`** : racines et
  coefficients A, B exacts (`Rational`) au lieu de flottants « rationnels » ; la décomposition
  s'écrit `\frac{3}{2(x - 1)} + \frac{1}{2(x + 1)}` (plus `\frac{1.5}{x - 1}`), le signe dehors.

Tests : `limits/__tests__/factorisation-noyau.test.ts`,
`pedagogical-limits/__tests__/factorisation-noyau.test.ts`,
`integration/__tests__/denominateur-trinome-noyau.test.ts` (F′ = f par `areEquivalent`),
`pedagogical-integration/__tests__/elements-simples-exacts.test.ts`.

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
  `asPolynomial` (`pedagogical-limits/helpers.ts`, **flottants**, degré non borné, pour la
  comparaison des termes dominants en ±∞ : passer au noyau changerait le degré lisible et
  l'écriture du quotient) ; `toUnivariateView` (`normal/`) ;
  `extract{Quadratic,Cubic,Quartic}Coefficients` (`solve/`, coefficients `MathNode`).
- **Δ** : un seul calcul exact sur ℚ, `discriminant` (`factor/quadratic.ts`). Les autres
  calculent en `MathNode` pour l'afficher (`pedagogical-solve/quadratic.ts`, `solve/`) ou en
  flottants sur des coefficients décimaux (`domain/preimage.ts`, solveurs de degré 3-4 de
  `solve/`).

## Points ouverts connus (mesurés le 2026-10-10)

- Fusion des deux moteurs : voir plus haut ; `auto ≡ reduire` sur `(x+1)²`.
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
- Les filtres de noms qui écartent `e` et `i` de `getVariables` (`atelier/solve-steps.ts`,
  `questions/calculus/calculus-reading.ts`, `CONSTANT_NAMES` de `cli/core/variable-argument.ts`)
  ne servent plus que pour `e_1`, `i_1`, `u_i`, qu'ils traitent à tort comme des constantes.

## Décisions

| Décision                                                   | Où                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Correction côté client                                     | [ADR 0001](../../adr/0001-correction-cote-client.md)                             |
| Réduire pour comparer (`equivalenceForm`), pas pour écrire | [ADR 0006](../../adr/0006-reduire-pour-comparer-pas-pour-ecrire.md)              |
| Un moteur, quatre intentions                               | [ADR 0007](../../adr/0007-un-moteur-quatre-intentions.md)                        |
| Les hypothèses de l'énoncé restreignent la comparaison     | [ADR 0012](../../adr/0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) |
| Un moteur commun de factorisation (amende 0007)            | [ADR 0024](../../adr/0024-moteur-commun-de-factorisation.md)                     |

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
- [notation-unites.md](../../pratiques/notation-unites.md) — écrire une grandeur.

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
