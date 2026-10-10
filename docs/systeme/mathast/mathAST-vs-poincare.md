# mathAST (UbuMaths) vs Poincaré (Upsilon/NumWorks)

> **Statut** : analyse rédigée à partir de la lecture du code source des deux moteurs et de tests empiriques exécutés sur mathAST. Pour Poincaré, l'exécution n'a pas été tentée — les comportements sont confirmés par lecture des sources C++ et des fichiers de tests `extern/Upsilon/poincare/test/*.cpp`.
>
> **Date** : 2026-05-03 — état mathAST `main` à `7b3ef0d43`, 14926 tests verts dans `mathAST + math/intervals + geometry-core`.
>
> **Convention de citation** : `chemin:ligne` pour les emplacements vérifiés en lecture, `[empirique]` pour ce qui a été testé, `[non vérifié]` pour les hypothèses qu'on n'a pas pu trancher.

---

## 1. Cadrage

Les deux moteurs partagent un même objectif macro : transformer un texte mathématique en AST, le simplifier, et le réafficher proprement. Mais ils sont conçus pour des contraintes radicalement différentes.

| Aspect                | mathAST                                                                                                              | Poincaré                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Langage hôte          | TypeScript strict                                                                                                    | C++ (≥ C++11)                                                                           |
| Cible runtime         | navigateurs + Node.js                                                                                                | NumWorks N0100/N0110 (256 Ko RAM) + simulateur                                          |
| Allocation            | GC du runtime JS (V8/JSC/SpiderMonkey)                                                                               | `TreePool` maison, no `malloc` (`extern/Upsilon/CLAUDE.md:206`)                         |
| Taille du module      | ~125 396 lignes TS (294 fichiers, hors tests) [1]                                                                    | ~26 959 lignes `.cpp` + 11 823 lignes `.h` (167+154 fichiers)                           |
| Tests                 | ~14 926 tests verts dans `mathAST + intervals + geometry-core` [2]                                                   | tests `quiz/` C++ — `simplification.cpp` 1500+ assertions, `expression_order.cpp`, etc. |
| Couverture symbolique | parsing → AST → normal form → simplify → différentiation → intégration → limites → variations → solveurs → géométrie | parsing → AST → reduce → beautify → approximation → layout 2D → solveur numérique borné |

[1] `find src/lib/mathAST -name '*.ts' -not -name '*.test.ts' | xargs wc -l`
[2] `pnpm test:server src/lib/mathAST src/lib/math/intervals src/lib/geometry-core`

mathAST couvre un périmètre nettement plus large (calcul différentiel et intégral symbolique, taylor, géométrie analytique). Poincaré reste centré sur ce qu'une calculatrice graphique propose en cours de lycée : reduce + beautify + approximation, plus un solveur numérique pour `nextRoot/nextMinimum/nextMaximum/nextIntersection` (`extern/Upsilon/poincare/include/poincare/expression.h:294-297`).

---

## 2. Forme de l'AST

### 2.1 Binaire vs N-aire

C'est probablement la différence structurelle la plus profonde.

**mathAST** : `+`, `−`, `×`, `/` sont **binaires**. `1+2+3+4` est un arbre `add(add(add(1,2),3),4)`. Vérification : `src/lib/mathAST/types.ts:232-281` — `AdditionNode/SubtractionNode/MultiplicationNode` ont chacun `readonly left: MathNode; readonly right: MathNode;`.

**Poincaré** : `Addition` et `Multiplication` sont **N-aires**. La même expression est un seul nœud avec 4 enfants. Vérification : `extern/Upsilon/poincare/src/parsing/parser.cpp:170-180` — quand `parsePlus` rencontre une addition à gauche, il ajoute le nouvel opérande à la liste existante (`addChildAtIndexInPlace(rightHandSide, …)`) plutôt que de construire un nouvel addition binaire.

Conséquences :

- **Aplatir une chaîne d'addition** est gratuit en Poincaré (les enfants sont déjà à plat) ; en mathAST il faut explicitement parcourir l'arbre. C'est le rôle de `src/lib/mathAST/flatten.ts` (`flattenSumShallow`, `flattenProductShallow`).
- **Combiner les termes semblables** est une boucle linéaire en Poincaré : `Addition::shallowReduce` fait un balayage gauche-à-droite en factorisant les voisins (`extern/Upsilon/poincare/src/addition.cpp:255-274`). En mathAST, c'est encapsulé dans la conversion vers la `NormalForm` (`src/lib/mathAST/normal/polynomial.ts`, `src/lib/mathAST/normal/term.ts`) qui agrège les monômes par hash.
- **Tri canonique** : Poincaré trie en place les enfants d'une addition/multiplication (`extern/Upsilon/poincare/src/addition.cpp:199`, `multiplication.cpp:651`). mathAST n'a pas ce besoin direct sur l'AST de surface — la `NormalForm` est déjà triée par construction (`src/lib/mathAST/normal/term.ts:259`).

### 2.2 Nœuds différents

- mathAST a des nœuds **dédiés** que Poincaré n'a pas : `PiecewiseNode`, `LimitNode`, `InfinityNode` avec signe explicite, `SignedZeroNode`, `MatrixNode`, `LogicalNode`, `LogicalNotNode`, `BooleanNode`, `CompositionNode` (cf. `types.ts:601-712`).
- Poincaré a des nœuds que mathAST n'a pas : `Undefined`, `Unreal`, `Decimal` (distinct de `Rational`), `Float`, `BasedInteger`, `Sequence`, `Store`, `UnitConvert`, beaucoup de fonctions statistiques (`BinomCDF`, `NormPDF`, etc.), opérateurs binaires bit-à-bit, `Random`/`Randint`, `ConfidenceInterval`. Liste exhaustive : `extern/Upsilon/poincare/include/poincare/expression_node.h:28-146`.

### 2.3 Représentation des décimaux

**Poincaré** distingue `Decimal` et `Rational` au parsing (`extern/Upsilon/poincare/src/parsing/tokenizer.cpp:99-124`). Au reduce, `Decimal::shallowReduce` les convertit toujours en `Rational` exact. Vérifié dans le test `simplification.cpp:11-17` : `assert_parsed_expression_simplify_to("-2.3", "-23/10")` passe.

**mathAST** n'a qu'un `NumberNode` (`types.ts:160-163`) avec un `value: string`. La distinction décimal/entier est dans la chaîne. Le comportement à la simplification est plus subtil :

- `normalizeExtended` convertit bien `0.1234` en `617/5000` [empirique : `/tmp/test-decimals.ts`].
- Mais `simplify()` peut **revenir à la forme décimale** si la fonction de coût (`src/lib/mathAST/simplify/cost.ts`) la juge moins chère. Mesuré : `simplify(parse('-2.3'))` retourne `-2.3` (pas `-23/10`).
- `simplify(parse('1+0.5'))` retourne `1 + 0.5` (la normalisation aurait donné `3/2`, mais la simplification finale conserve l'addition d'origine — la normal form est moins "courte" en représentation latex, semble-t-il).

C'est une divergence comportementale **délibérée** côté mathAST : la stratégie n'est pas "tout en rationnel" mais "meilleure forme par coût". Conséquence directe : `1.7/2.3` simplifie bien en `17/23` (empirique), parce que la fraction décimale est explicitement réduite par `reduceFractionsAST` (`src/lib/mathAST/cosmetic-transforms.ts:163`) dont le coût est plus avantageux.

[non vérifié] : la fonction de coût exacte qui décide de garder `-2.3` plutôt que `-23/10` n'a pas été inspectée en détail. Probablement `src/lib/mathAST/simplify/cost.ts` mais je ne l'ai pas relue.

### 2.4 Pas de nœud `Undefined`

[empirique]

```
0/0     → simplify('0 / 0')    [reste tel quel]
1/0     → simplify('1 / 0')
\frac{0}{0} → simplify('\dfrac{0}{0}')
0^0     → simplify('1')
```

Côté Poincaré (`simplification.cpp:57, 66-69`) :

```
0/0     → Undefined
inf/0   → Undefined
0×inf   → Undefined
0^0     → Undefined
```

mathAST n'a pas d'équivalent du nœud `Undefined`. La division par zéro reste explicite dans l'arbre, et `0^0` est simplifié à `1` (convention combinatoire courante mais pas universelle). Attention : `\frac{1}{0}` en passant par `normalizeExtended` directement provoque `throw new Error('normalize: division by zero')` (`src/lib/mathAST/normal/normalize.ts:4044`), mais `simplify()` est protégé par try/catch quelque part [non vérifié exactement où] — il a retourné `1/0` plutôt que de planter dans mes tests.

C'est probablement une dette de conception. Si le projet veut tracer rigoureusement les domaines d'indéfinition (utile pour générer des messages d'erreur précis), un nœud `Undefined` (ou un statut sur les nœuds existants) serait à ajouter. Pas une recommandation forte — mathAST a déjà un module `domain/` qui peut prendre en charge cette responsabilité au niveau supérieur.

---

## 3. Les nombres négatifs

C'est l'axe sur lequel mathAST a explicitement convergé vers Poincaré. Le travail est documenté dans `docs/wip/migrate-negative-numbers-progress.md` (10 commits, mai 2026).

### 3.1 Au parsing

**Identique des deux côtés** : le parser construit un nœud `Opposite` pour le `−` unaire.

- Poincaré : `extern/Upsilon/poincare/src/parsing/parser.cpp:190-204`. `parseMinus` quand `leftHandSide.isUninitialized()` retourne `Opposite::Builder(rightHandSide)`.
- mathAST : `src/lib/mathAST/parser/latex/parser-pratt.ts:1049-1053`. `parsePrefixMinus` retourne `MathAST.opposite(operand)`.

### 3.2 Pendant le reduce

Là, les deux moteurs **divergent**.

**Poincaré** : `Opposite::shallowReduce` (`extern/Upsilon/poincare/src/opposite.cpp:76-85`) **réécrit immédiatement** `Opposite(x)` en `Multiplication(Rational(-1), x)` puis appelle `shallowReduce` à nouveau. Pendant la phase reduce, l'AST contient en pratique **des `Rational` négatifs directs** (le bit `m_negative` de `RationalNode`, cf. `extern/Upsilon/poincare/src/rational.cpp:18-29`). Une expression comme `−2x` est, après reduce, `Multiplication(Rational(-2), x)`.

**mathAST** : depuis la migration `factory.number()` rejette runtime tout littéral signé (`src/lib/mathAST/factory.ts` cf. progress doc). La forme canonique est invariablement `Opposite(NumberNode positif)` — ou bien le rationnel est porté par `NormalForm` (où `Rational.n` peut être négatif, `src/lib/mathAST/normal/types.ts:42-45` : "Sign stored in numerator only"). L'AST de surface n'a jamais `NumberNode('-1')`.

### 3.3 Au beautify / sérialisation

Là les deux **convergent**.

- Poincaré : `Rational::shallowBeautify` (`extern/Upsilon/poincare/src/rational.cpp:256-265`) — si la valeur est négative, replace par `Opposite(setSign(Positive))`.
- mathAST : la forme canonique est déjà `Opposite(positif)`, donc le générateur LaTeX traite cette forme directement (`src/lib/mathAST/latex-generator.ts`, helpers `isNegOne`, `isNegative` cf. progress doc Phase 5).

L'effet est le même : les négatifs sont rendus comme `−x` à l'affichage.

### 3.4 Bug Poincaré-aligné corrigé : parenthèses dans `-(...)`

Documenté dans `docs/wip/cosmetic-bracket-opposite-progress.md` (commit `3119e991b`).

Avant le fix, mathAST gardait inutilement les parenthèses dans `-(3x)` parce que `stripBracketsInternal` (`src/lib/mathAST/transforms.ts`) ne traitait pas le cas `parent = opposite`. Empiriquement `−(3x)` ne se simplifiait pas en `−3x` (`bad_form`).

Le fix s'inspire directement de `OppositeNode::childAtIndexNeedsUserParentheses` (`extern/Upsilon/poincare/src/opposite.cpp:34-44`) : garder les parenthèses **uniquement** si le contenu est `addition`, `subtraction` ou `opposite` (ou un `Number` négatif côté Poincaré, mais ce cas n'existe plus côté mathAST grâce à la migration). 8 nouveaux tests, 0 régression.

C'est un cas net où Poincaré sert de spec : la règle est compacte, mature, vérifiée sur calculatrice. mathAST a copié la règle, l'a adaptée à son AST, et le bug a disparu.

### 3.5 Bug Poincaré-aligné corrigé : précision exacte des fractions

Commit `4af331b65` (`docs/wip/cosmetic-fraction-precision-progress.md`).

Avant : `reduceFractionsAST` parsait via `parseFloat + Math.round + BigInt` — `1.7/2.3` se réduisait silencieusement à `1` à cause de la perte de précision flottante. Après : passage par `Rational` exact (le même type que Poincaré utilise — un quotient de deux `Integer` BigNum). Bug confirmé empiriquement avant le fix [empirique] :

- `1.7/2.3` → `17/23` (correct désormais, `1` avant)
- `\frac{1.7}{2.3}` → `17/23` (idem)
- `\frac{123456789012345678}{2}` → `61728394506172839` exact

C'est moins une "inspiration Poincaré" qu'une convergence forcée : dès qu'on veut des résultats **exacts** sur des décimaux, on tombe sur la même solution (Integer arbitraire + GCD). Poincaré utilise `Integer::Multiplication` et `Arithmetic::GCD` (`rational.cpp:160-165`) ; mathAST utilise `BigInt` natif et son propre `gcd` (`src/lib/mathAST/normal/rational.ts`).

---

## 4. Pipeline de simplification

### 4.1 Architectures fondamentalement différentes

**Poincaré** : pipeline en deux passes, dispatché par type de nœud.

```
text → Parse → AST → reduce(deep) → beautify(deep) → serialize / approximate / layout
                       │                  │
                       │                  └─ shallowBeautify per node type
                       └─ shallowReduce per node type (recursive bottom-up)
```

`shallowReduce` et `shallowBeautify` sont des **méthodes virtuelles** sur `ExpressionNode` (`extern/Upsilon/poincare/include/poincare/expression_node.h:312-321`). Chaque type d'expression a sa propre logique. C'est essentiellement du **double dispatch** par type. La granularité est fine : `Addition::shallowReduce` (~190 lignes), `Multiplication::shallowReduce` (~310 lignes), `Power::shallowReduce` (~plusieurs centaines de lignes).

Le `ReductionContext` porte trois leviers (`expression_node.h:152-163`) :

- `ReductionTarget` : `SystemForApproximation` (minimal), `SystemForAnalysis` (expansion newtonienne pour identifier les polynômes), `User` (mise sur dénominateur commun, expansion en `a + ib`, identification de tangentes).
- `ComplexFormat`, `AngleUnit`, `UnitFormat`, `SymbolicComputation`, `UnitConversion`.

**mathAST** : pipeline en orchestrateur avec moteurs séparés.

```
text → Parse → AST → simplify(node) loop:
                       1. preprocess (rewrite rules avant normalize)
                       2. normalizeExtended → NormalForm
                       3. denormalizeExtended → AST
                       4. applyRulesDeepOnceTracked(allRules) → AST
                       5. cost(AST) — keep best
                       … fixpoint or maxIterations
```

Vérification : `src/lib/mathAST/simplify/simplify.ts:69-100`.

Trois engines distincts :

1. **`normal/`** (`src/lib/mathAST/normal/`) — convertit l'AST vers une `NormalForm` qui est une fraction de polynômes (`numerator: Polynomial / denominator: Polynomial`), où chaque `Polynomial` est un tableau trié de `NormalTerm`, et chaque `NormalTerm` a un `AlgebraicCoefficient` (somme d'`AlgebraicTerm` = rationnel × radicaux) et un `Monomial` (produit de `SymbolicFactor` = base × exposant rationnel). Voir `src/lib/mathAST/normal/types.ts:42-200`. La normalisation est **structurale**, pas par règle : addition, multiplication, élévation à la puissance, etc., sont implémentées en termes de structure.

2. **`pattern/`** (`src/lib/mathAST/pattern/`) — moteur de pattern matching avec rules (`Rule = { lhs, rhs, condition }`). Plusieurs rule sets prédéfinis : `arithmeticRules`, `powerRules`, `absRules`, `logExpRules`, `sqrtRules`, `trigRules`, `functionParityRules`, `algebraicSimplifyRules`, `trigSimplifyRules`, `hypSimplifyRules`. Un seul passage bottom-up sur l'arbre via `applyRulesDeepOnceTracked`.

3. **`simplify/`** — orchestrateur qui boucle (max 10 itérations par défaut), garde le meilleur résultat selon `cost(node)` (`src/lib/mathAST/simplify/cost.ts`).

### 4.2 Implications pratiques

- **Granularité** : Poincaré factorise tout dans le nœud, mathAST factorise dans le pipeline. Pour ajouter une simplification dans Poincaré, on touche `<typename>::shallowReduce`. Dans mathAST, on ajoute une `Rule` à un rule set ou une opération à `normal/`.
- **Coût** : la `NormalForm` mathAST construit une représentation parallèle ; chaque simplification fait 2 conversions AST↔NormalForm, plus pattern. Poincaré modifie l'arbre en place. Pour un seul `simplify('1 + x')`, mathAST mesure 64 µs/appel, normalize seul 9 µs/appel, parse 3 µs/appel [empirique : `/tmp/test-perf.ts`]. Je ne peux pas comparer directement à Poincaré car je n'ai pas exécuté le projet upstream.
- **Boucle de simplification** : mathAST loope jusqu'à `maxIterations=10` ou point fixe avec choix par coût ; Poincaré fait un seul passage bottom-up (plus quelques `shallowReduce` ré-appelés en place sur les enfants). La protection mathAST est moins risquée pour des cas pathologiques mais plus coûteuse.
- **Variantes par cible** : Poincaré a `ReductionTarget::SystemForApproximation/SystemForAnalysis/User` qui débrayent par exemple la mise sur dénominateur commun. mathAST a un seul `simplify` avec options booléennes (`enableTrig`, `enableHyperbolic`, `enableAlgebraic`, `enableAbs` cf. `simplify.ts:74-78`).

### 4.3 Ordre canonique : convergent mais distinct

Poincaré (`extern/Upsilon/poincare/src/expression_node.cpp:54-80`) trie par `ExpressionNode::Type` (enum `uint8_t`), avec des règles spécifiques par type :

- Pour Addition, on trie **descendant** (cf. `addition.cpp:199` qui passe `false` à `SimplificationOrder`).
- Pour Multiplication, **ascendant** (cf. `multiplication.cpp:651`).
- Symbol/Variable triés en sens **inverse de l'ASCII** ([empirique via test] `expression_order.cpp:57` : `assert_greater(Symbol::Builder('a'), Symbol::Builder('b'))` — donc `a > b` dans l'ordre de simplification).
- Constants : `e > π > i` (`expression_order.cpp:20-24`).
- Combiné, les termes de **même base** se retrouvent groupés (`expression_order.cpp:128-143` : `c + b^2 + a^2 + a → a^2 + a + b^2 + c` — les `a` ensemble, puis les `b`, puis `c`).

mathAST (`src/lib/mathAST/normal/monomial.ts:35-55, 137-175, 288-311`) trie par :

1. Type priority (`constant=0`, `greek=0`, `variable=1`, `function=2`, `number=3`, `symbol=4`, …).
2. À type égal, par nom **ascendant** (`'A' < 'B'`, `'a' < 'b'`).
3. Pour les monômes, par **degré total décroissant** d'abord, puis par lex ascendant des bases.

Conséquences observées [empirique : `/tmp/test-grouping.ts`] :

| Entrée               | mathAST             | Poincaré (test cpp)       |
| -------------------- | ------------------- | ------------------------- |
| `1 + x`              | `x + 1`             | `x + 1` ([1])             |
| `1 + x + x^2`        | `x^2 + x + 1`       | `x^2 + x + 1` ([2])       |
| `1 + A + 2 + B + 3`  | `A + B + 6`         | `A + B + 6` ([3])         |
| `3x^2 + 2x^3`        | `2x^3 + 3x^2`       | `2x^3 + 3x^2` ([4])       |
| `c + b^2 + a^2 + a`  | `a^2 + b^2 + a + c` | `a^2 + a + b^2 + c` ([5]) |
| `1 + x + 4 - i - 2x` | `-x + 5 - i` ([6])  | `-i - x + 5` ([7])        |

[1, 2, 3, 4] — comportement convergent, observable par lecture du test `simplification.cpp:108-118` côté Poincaré.
[5] — divergence : mathAST groupe par degré (a², b² puis a, c) ; Poincaré groupe par base (a², a puis b² puis c). Test source `expression_order.cpp:128-143`.
[6, 7] — divergence : place de `i`. Pour Poincaré, `i` est `Constant` (Type 14), classé après les `Rational` mais avec une priorité haute en mode descendant ; mathAST traite `i` spécialement (`normalize.ts:1496-1504` — la variable `'i'` devient `ALGEBRAIC_IMAGINARY`).

Aucune des deux conventions n'est "fausse". Poincaré aligne mieux sur l'écriture mathématique standard où les termes même-base sont visuellement regroupés. mathAST est plus simple à expliquer (degré décroissant strict). Pour un changement, il faudrait évaluer l'impact sur les tests pédagogiques d'UbuMaths — probablement non négligeable.

---

## 5. Tokenizer/parser

### 5.1 Approche

- Poincaré : **precedence-climbing** récursif (`extern/Upsilon/poincare/src/parsing/parser.h:1-7` : "A precedence-climbing parser is implemented hereafter").
- mathAST : **deux parsers LaTeX** sont fournis (`parsePratt`, `parseRD`, cf. `src/lib/mathAST/parser/index.ts:46-69`). Pratt est le défaut, RD est un descendant récursif "tolérant".

Les deux familles (precedence-climbing, Pratt, recursive descent) sont équivalentes en pouvoir d'expression — c'est plus une question de style.

### 5.2 Surface couverte

mathAST consomme du LaTeX (commandes `\sin`, `\frac`, `\sqrt`, environnements matrix, etc.). Poincaré consomme une syntaxe textuelle compacte propre à NumWorks (`sin(...)`, `√(...)`, `[[...,...]]`, `inf`, `ℯ`, `π`). Les deux supportent les nombres décimaux, les puissances, les fonctions usuelles, les matrices, les unités.

### 5.3 Sécurité

mathAST a un module de sécurité parser explicite (`src/lib/mathAST/parser/security.ts`, surface `ParserSecurityOptions`) — limite de taille d'entrée, profondeur d'AST, nombre de nœuds. C'est utile dans un contexte web où l'entrée vient d'élèves potentiellement malveillants.

Poincaré n'a pas d'équivalent direct ; les protections sont structurales (TreePool fixed-size, `ExceptionCheckpoint` setjmp/longjmp en cas de saturation mémoire — `extern/Upsilon/CLAUDE.md:248`). Modèle de menace différent : un élève qui plante sa calculatrice n'expose personne d'autre.

### 5.4 Le `,` français

Commit `7b3ef0d43` (`docs/wip/parser-french-comma-progress.md`) : ajout du support `{,}` en LaTeX comme séparateur décimal pour le français. Poincaré n'a pas de variante locale — il accepte `.` uniquement (`tokenizer.cpp:99`). C'est une spécificité d'UbuMaths cohérente avec sa cible (élèves francophones).

---

## 6. Layout / sérialisation

Poincaré a une **2e structure d'arbre parallèle** : `Layout` (~167 fichiers `*_layout.h/cpp`). C'est ce qui permet l'affichage 2D façon manuel scolaire (fractions empilées, racines avec barre, exposants, intégrales, sommes, matrices…) sur l'écran 320×240 de la NumWorks. Un `ExpressionNode` sait produire son `Layout` via `createLayout(printMode, sigDigits)` (`expression_node.h:302`).

mathAST n'a pas d'équivalent direct — il sérialise vers du LaTeX (`src/lib/mathAST/latex-generator.ts`) ou du "custom" (syntaxe compacte UbuMaths, `custom-generator.ts`), et délègue le rendu 2D à **MathLive** (côté front Svelte). C'est cohérent avec l'écosystème : les navigateurs ont déjà le moteur de rendu LaTeX.

[non vérifié] : si UbuMaths a besoin un jour d'un mode "édition pas-à-pas avec curseur" sur l'AST (comme Poincaré le fait dans son éditeur d'expression), il faudra peut-être extraire un module similaire à `Layout`. Pas urgent.

---

## 7. Points où mathAST pourrait gagner à s'inspirer de Poincaré

Avec la précaution d'usage : "pourrait" ≠ "devrait". J'évalue ici à coût/bénéfice. Si je ne peux pas justifier, je le dis.

### 7.1 Nœud `Undefined` — coût modéré, bénéfice clair

Coût : ajouter un nouveau type de nœud (`types.ts`), adapter le parser (déjà fait pour les autres types), adapter normalize/simplify pour produire `Undefined` au lieu de `throw`/garder tel quel sur `0/0`, `0×∞`, `inf − inf`, `0^0`. Estimation : 2-3 jours.

Bénéfice : sémantique correcte au lieu de garder `0/0` dans l'arbre, génération de messages d'erreur pédagogiques (déjà la mission du module `domain/`), pas de panique runtime sur `1/0` au cœur de `normalizeExtended`.

À discuter avec l'utilisateur — c'est un changement structurant.

### 7.2 Groupement par base dans le tri de l'addition — coût élevé, bénéfice douteux

Pour aligner sur `c + b^2 + a^2 + a → a^2 + a + b^2 + c`, il faudrait modifier `compareMonomials` ou ajouter une post-passe de réordonnancement dans le pipeline.

Coût : estimer impact sur ~14 900 tests (sort change ⇒ outputs LaTeX changent ⇒ snapshot tests à mettre à jour). Probablement 1-2 jours d'implémentation + 2-5 jours d'adaptation tests/exo.

Bénéfice : alignement sur la convention NumWorks (et celle des manuels français), donc lisibilité pédagogique. **Mais** la question "lequel est plus pédagogique" reste ouverte. Le degré décroissant strict de mathAST est l'autre convention courante (manuels américains). À ne pas faire sans demande utilisateur explicite.

### 7.3 `sqrt(8) → 2*sqrt(2)` par défaut — bénéfice conditionnel

mathAST a déjà tout l'arsenal (`SimplifiedRadical` dans `normal/types.ts:67-70`, `simplifyRadical` dans `normal/radical.ts`). Pourtant `simplify(parse('\\sqrt{8}'))` retourne `\sqrt{8}` [empirique]. Probablement parce que la fonction de coût juge `\sqrt{8}` plus court que `2\sqrt{2}` (c'est vrai en LaTeX). Poincaré simplifie : `assert_parsed_expression_simplify_to("√(8)", "2*√(2)")` ([non vérifié dans le test source, mais la logique de `SquareRoot::shallowReduce` le fait]).

Bénéfice douteux : la "forme simplifiée" d'un radical est **convention** ; en classe française, `2\sqrt{2}` est attendu, mais `\sqrt{8}` est plus court.

Coût : ajuster `cost.ts` pour pénaliser les radicaux composés. À évaluer empiriquement. Pas urgent.

### 7.4 Distribution `(x+1)^2 → x^2+2x+1` selon ReductionTarget — pertinent

Poincaré a `ReductionTarget::SystemForAnalysis` qui développe systématiquement les puissances pour identifier les polynômes (`extern/Upsilon/poincare/include/poincare/expression_node.h:155-157`). mathAST garde `(x+1)^2` non développé par défaut [empirique].

Pour les exercices "développer" / "factoriser", UbuMaths a besoin de pouvoir faire les deux. Vérifier si `algebraicExpandingRules` (`pattern/rule-sets/index.ts:67`) couvre ce besoin et si l'API expose la bascule. [non vérifié].

---

## 8. Surprises principales

Trois cas où la réalité du code n'a pas correspondu à ce que je pensais :

1. **mathAST `0^0 = 1`** (et non `Undefined`). C'est un choix actif (il existe une règle qui produit `1` pour `x^0` quel que soit `x`). Différent de Poincaré.

2. **`b * i` simplifie à `b`** (perte de l'unité imaginaire dans la sortie LaTeX) [empirique : `/tmp/test-i-parsing.ts`]. La normalisation traite bien `i` comme imaginaire (`normalize.ts:1496-1504`) mais quelque chose dans la chaîne denormalize/latex perd l'information. Probablement un bug, pas observé dans des cas où `i` est précédé d'un coefficient explicite (`2i`, `1+2i` fonctionnent). À investiguer.

3. **`ln(e)` n'est pas simplifié à `1`** par `simplify()` [empirique]. Il existe pourtant des `logExpRules` (`pattern/rule-sets/log-exp.ts`). Soit la règle n'est pas activée, soit le pattern ne matche pas exactement parce que `e` est un `MathConstantNode('euler')` et non une `VariableNode('e')`. À investiguer.

---

## 9. Questions ouvertes / non vérifiées

1. **Fonction de coût `cost.ts`** : je n'ai pas lu en détail le scoring. Concrètement, quels sont les poids relatifs entre "nombre de nœuds", "longueur LaTeX", "présence de fractions" ? Sans ça, je ne peux qu'observer le résultat (`-2.3` gagne contre `-23/10`) sans expliquer **pourquoi**. À lire si on veut tuner.

2. **`simplify()` sur `1/0`** : empiriquement, ça retourne `1/0` plutôt que de propager le `throw 'normalize: division by zero'`. Donc il y a un try/catch quelque part, mais je n'ai pas trouvé la ligne exacte. À localiser si on veut comprendre la résilience.

3. **Performance Poincaré** : je n'ai pas exécuté le projet C++ donc impossible de comparer directement. Sur du Cortex-M4F embarqué, l'AST est manipulé in-place dans `TreePool` — coût mémoire faible mais opérations non-vectorisables. Sur du V8, mathAST bénéficie du JIT mais alloue beaucoup (chaque transformation crée de nouveaux nœuds immutables). Mes mesures sur mathAST (3 µs parse, 9 µs normalize, 64 µs simplify pour `1+x`) sont raisonnables pour un usage interactif, mais je n'ai pas de point de comparaison Poincaré.

4. **`Decimal` vs `Rational` distinction conservée** : Poincaré garde `Decimal` comme type distinct **avant** reduce. À quoi ça sert exactement ? Pour préserver le format d'affichage en mode "approximation" peut-être (`PrintFloatMode::Decimal/Scientific/Engineering`). À creuser si on veut un mode "tableau de valeurs" qui garde les décimaux.

5. **mathAST `solve/`, `integration/`, `taylor/`, `variations/`, `analysis/`** : je n'ai pas exploré ces modules en détail. Poincaré a `Derivative::shallowReduce`, `Integral::shallowReduce` et un solveur numérique (`nextRoot`), mais **pas** d'intégration symbolique, **pas** d'analyse de variations, **pas** de Taylor symbolique. Le périmètre mathAST est plus large. Comparer un par un déborderait du scope de cette session.

---

## 10. Synthèse exécutive

mathAST et Poincaré partagent les mêmes briques conceptuelles (parser, AST, simplifier, sérialiseur) mais diffèrent profondément sur :

- **Forme de l'AST** (binaire vs N-aire).
- **Représentation des décimaux** (toujours-rationnel vs cost-driven).
- **Stratégie de réduction** (méthodes virtuelles par type vs pipeline avec `NormalForm` séparée).
- **Périmètre** (mathAST couvre plus largement le calcul symbolique ; Poincaré a un layout 2D et un solveur numérique embarqué).

**Le rapprochement récent** est documenté commit par commit : 4 fixs majeurs sur la canonicalisation des nombres négatifs (10 commits, mai 2026), un fix sur le strip de parenthèses dans `Opposite(...)`, un fix sur la précision des fractions décimales. Ces fixs s'inspirent directement de Poincaré, après lecture et adaptation à l'AST mathAST. Le pattern est bon : Poincaré sert de spec mature, mathAST adapte à son contexte (TS, immutable, Web).

**Pas de changement structurant recommandé** dans l'immédiat sans validation utilisateur. Les divergences observées (sort, undefined, `0^0`) sont des choix actifs ou des conventions concurrentes, pas des bugs structurels. Les bugs réels potentiels (`b*i → b`, `ln(e)` non simplifié) méritent investigation séparée.
