---
couvre:
  - 'src/lib/mathAST/**'
---

# mathAST — le moteur de calcul symbolique

> Code : `src/lib/mathAST/` · Agent spécialisé : `mathast-expert` (`.claude/agents/mathast-expert.md`).
> Cette page remplace la vue d'ensemble de juin 2026 et le `README.md` de `src/lib/mathAST/`
> (janvier), écrits avant `tidy`, la réécriture de `simplify()` (#378 → #389) et l'ADR 0007.
> **Vérifié contre le code le 2026-10-10.**

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

| Dossier                                                                                                                             | Rôle                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lire et écrire**                                                                                                                  |                                                                                                                                                                                                                                     |
| `parser/`                                                                                                                           | `parseLatex`/`parseLatexSafe` (`latex/` : Pratt par défaut, `rd` en option) ; `custom/` : syntaxe maison (`parseCustom`), motifs (`parsePattern`), règles (`parseRule`), contraintes ; `security.ts` (plafonds)                     |
| `cache/`                                                                                                                            | `ParseCache`, LRU exporté mais **branché nulle part**                                                                                                                                                                               |
| **Mettre au propre, comparer**                                                                                                      |                                                                                                                                                                                                                                     |
| `tidy/`                                                                                                                             | `tidy` : mise au propre **sans jamais développer** ; raconte ses gestes (`TidyStepRecorder`) ; grandeurs (`unitChoice`)                                                                                                             |
| `simplify/`                                                                                                                         | `simplify` : `tidy` + règles + « développer seulement si moins cher » (`computeCost`, `costFunction` injectable)                                                                                                                    |
| `normal/`                                                                                                                           | `normalize` → `NormalForm` (forme normale rationnelle), `denormalize`, `equivalenceForm`, `hashMathNode`, `nodesEqual`                                                                                                              |
| `pattern/`                                                                                                                          | motifs (`P`, `tryMatch`), règles, jeux de règles, `verifyForm` — voir [pattern-matching.md](pattern-matching.md)                                                                                                                    |
| `transform/`                                                                                                                        | identités algébriques/trigo/hyperboliques en fonctions (`factorAlgebraic`…) — **aucun import hors de ses tests**                                                                                                                    |
| `common/`                                                                                                                           | moteur de réécriture `rewrite`, `numericNode`, interruption (`AbortError`), bases des enregistreurs et rendus d'étapes, constructeurs simplifiants (`common/simplify.ts`), refus de `e` comme variable (`common/euler-variable.ts`) |
| `numtype/`                                                                                                                          | inférence du type numérique (entier, rationnel, réel…) et `TypeContext`                                                                                                                                                             |
| **Calculer**                                                                                                                        |                                                                                                                                                                                                                                     |
| `eval/`                                                                                                                             | `substitute`, `evaluate`, `evaluateWithUnits`, `compile`/`createSafeEvaluator` (seule génération de code)                                                                                                                           |
| `differentiation/`                                                                                                                  | `differentiate`                                                                                                                                                                                                                     |
| `integration/`                                                                                                                      | `integrate` (primitives, intégrales définies, numérique)                                                                                                                                                                            |
| `limits/`                                                                                                                           | limites (dont `analyzeSign` unilatéral de `limits/one-sided.ts`)                                                                                                                                                                    |
| `solve/`                                                                                                                            | `solve`, `solveEquation`                                                                                                                                                                                                            |
| `domain/`                                                                                                                           | `computeDomain`, `findZeros`, intervalles                                                                                                                                                                                           |
| `sign/`                                                                                                                             | `analyzeSign` (tableaux de signes)                                                                                                                                                                                                  |
| `variations/`                                                                                                                       | `computeVariations`                                                                                                                                                                                                                 |
| `taylor/`                                                                                                                           | développements de Taylor                                                                                                                                                                                                            |
| `analysis/`                                                                                                                         | continuité (`analyzeContinuity`), périodicité, symétrie, polynômes, classification                                                                                                                                                  |
| `piecewise/`                                                                                                                        | `extractPiecewiseBoundaries` : ruptures d'une fonction par morceaux (consommé par `geometry-core`)                                                                                                                                  |
| `matrix/`                                                                                                                           | opérations matricielles                                                                                                                                                                                                             |
| `units/`                                                                                                                            | unités physiques (`parse`, `format`, conversions, `selectBestUnit`) — doc : `units/README.md`, notation : [notation-unites.md](../../pratiques/notation-unites.md)                                                                  |
| `dimensional/`                                                                                                                      | analyse dimensionnelle                                                                                                                                                                                                              |
| **Raconter**                                                                                                                        |                                                                                                                                                                                                                                     |
| `pedagogical-simplify/`                                                                                                             | `generatePedagogicalSimplifySteps` : quatre intentions (`SimplifyIntent`)                                                                                                                                                           |
| `pedagogical-solve/`                                                                                                                | `generateEquationSteps`, `generateInequalitySteps` ; paliers par tables `STRATEGIES*`                                                                                                                                               |
| `pedagogical-arithmetic/`, `pedagogical-differentiation/`, `pedagogical-integration/`, `pedagogical-limits/`, `pedagogical-domain/` | `generatePedagogical…Steps` du domaine                                                                                                                                                                                              |
| `pedagogical-evaluate/`                                                                                                             | types seuls, aucune logique                                                                                                                                                                                                         |
| `step-generator/`                                                                                                                   | `generateSteps`, `canGenerateSteps`, `suggestLevel` (calcul arithmétique)                                                                                                                                                           |
| **Outils**                                                                                                                          |                                                                                                                                                                                                                                     |
| `cli/`                                                                                                                              | `pnpm math` (`cli/cli.ts`) : REPL et complétion — doc : `cli/README.md`, `cli/web/README.md`                                                                                                                                        |
| `__tests__/`                                                                                                                        | tests transverses (garde-fous, panel)                                                                                                                                                                                               |

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
  en facteur du contenu et `tidy`. Il a **le vocabulaire** (les étapes nommées).

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
     parseur le relisent), `toCustom` écrit `e`. Calculer « par rapport à `e` » (intégrer,
     dériver, résoudre, limite, Taylor, variations, `; e` en CLI) est **refusé** : « e est la
     constante d'Euler, pas une variable » (`refusesEulerVariable`, `common/euler-variable.ts`),
     sauf si l'arbre contient une variable `e` (base indicée `e_1`) ;
   - `i` reste une **variable** en LaTeX (`\imaginaryI` donne `complex(0, 1)`) ;
   - `\sin^2 x` est une `function` avec `power`, `(\sin x)^2` un `superscript` ;
   - la virgule : MathLive écrit `3{,}14` (lu `3.14`) ; la virgule nue passe par
     `decimal-comma.ts`.
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

## Points ouverts connus (mesurés le 2026-10-10)

- Fusion des deux moteurs : voir plus haut ; `auto ≡ reduire` sur `(x+1)²`.
- `ParseCache` exporté, jamais branché ; `transform/` sans consommateur ;
  `pedagogical-evaluate/` réduit à des types.
- Cycle dans `runPatternLoop` (`pedagogical-simplify/pipeline.ts`) : sur `x(1+1)` et
  `x(1-1)`, `sum-cubes-numeric` (et `diff-squares-numeric`) tire jusqu'à la limite de
  20 itérations sans point fixe (mesuré par instrumentation sur la suite serveur, cas du
  panel). La boucle s'arrête sans le signaler ; `applyRules`, lui, lève
  `RuleIterationLimitError`.
- `solve` ne gère pas les inconnues indicées : `x_1+1=3` répond « pas de solution »
  (`getVariables` rend la base `x`) ; `e_1+1=3` aussi (le refus « constante d'Euler » ne
  s'applique pas quand l'arbre contient une variable `e`, base d'une variable indicée :
  `refusesEulerVariable`).

## Décisions

| Décision                                                   | Où                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Correction côté client                                     | [ADR 0001](../../adr/0001-correction-cote-client.md)                             |
| Réduire pour comparer (`equivalenceForm`), pas pour écrire | [ADR 0006](../../adr/0006-reduire-pour-comparer-pas-pour-ecrire.md)              |
| Un moteur, quatre intentions                               | [ADR 0007](../../adr/0007-un-moteur-quatre-intentions.md)                        |
| Les hypothèses de l'énoncé restreignent la comparaison     | [ADR 0012](../../adr/0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) |

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
