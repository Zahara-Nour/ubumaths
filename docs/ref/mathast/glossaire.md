# mathAST : glossaire

> Documentation de reference UbuMaths. Date : 2026-06-18.
> A lire avec [`architecture.md`](./architecture.md) (structure du module)
> et [`api.md`](./api.md) (surface publique).

---

## Termes (ordre alphabetique)

**`BaseNode`** — Interface racine de tous les noeuds AST. Deux champs : `readonly
type: string` (discriminant de l'union) et `readonly metadata?: NodeMetadata`
(couleur, style, annotation — hints de rendu). Jamais instanciee directement.

**delimiter** — Noeud structurel (`type: 'delimiter'`) representant du contenu
entoure de parentheses. Champ `semantic` : `'grouping' | 'interval' | 'set' |
'matrix' | 'vector'`. Role critique dans flatten : les noeuds `delimiter` sont
des **frontieres intangibles** — `flattenSumShallow` et `flattenProductShallow`
ne penetrent jamais leur contenu. C'est ce qui distingue `a+(b+c)` de `a+b+c`
dans l'analyse structurelle.

**factory** — Famille de fonctions pures construisant des noeuds `MathNode`
(source : `factory.ts`). Forment la seule voie legitime de creation. Le namespace
`MathAST` les regroupe toutes ; les exports individuels permettent le
tree-shaking. Voir [`api.md §1`](./api.md).

**flatten / unflatten** — Operations sur les sommes et produits.
`flattenSumShallow(node)` transforme une chaine `a - b + c` en `FlatSum`
(tableau de `SignedTerm`). `unflattenSum(terms)` reconstruit en associativite
gauche : `((a-b)+c)`. Le round-trip est idempotent. `flattenProductShallow` fait
de meme pour la multiplication (resultat : `FlatProduct`). Voir invariants dans
[`architecture.md`](./architecture.md).

**`FlatProduct`** — Tableau `readonly StyledFactor[]`. Produit aplati d'une
expression multiplicative. Cf. `StyledFactor`.

**`FlatSum`** — Tableau `readonly SignedTerm[]`. Somme aplatie d'une expression
additive. Chaque `SignedTerm = { sign: '+' | '-', term: MathNode }`.

**forme normale** (`NormalForm`) — Representation canonique interne calculee
par `normalize`. Encode les expressions sous forme de somme de monomes
rationnels. Permet la comparaison semantique (`areEquivalent`), le calcul
exact et la simplification par remplacement. Distinct de `simplify` qui opere
sur les `MathNode` directement (voir _normalize vs simplify_).

**`HoleNode`** — Noeud `type: 'hole'` representant un blanc a remplir dans un
exercice. Champs : `index: number` (identifiant du blank), `placeholder?:
string`. Utilise par le generateur de questions pour les exercices a trous.

**`MathNode`** — Le type central du module. Union discriminee de 28 variantes
(source : `types.ts:720`). Chaque variante possede un `type` litteral unique
qui permet la discrimination TypeScript exhaustive. Immutable par convention
(`readonly` fields) mais **non gele au runtime**.

**`MathConstantNode`** — Noeud `type: 'constant'` pour les constantes
mathematiques `'euler'` (e ≈ 2.718…) et `'pi'` (π ≈ 3.14159…). L'unite
imaginaire i n'est PAS une constante — elle est representee comme
`ComplexNode(0, 1)`.

**`MathNodeType`** — Union litterale de tous les discriminants :
`'number' | 'variable' | 'addition' | ...` (28 valeurs). Type :
`MathNode['type']`. Utile pour les comparaisons de type sans type guard.

**`NodeMetadata`** — Objet optionnel attachable a tout noeud :
`{ color?: string, style?: 'normal'|'bold'|'italic', annotation?: string }`.
Porte des informations de rendu (coloration de termes, mise en gras), jamais
de semantique mathematique.

**`normalize` vs `simplify`** — Deux operations distinctes.
`normalize(node)` calcule la forme normale rationnelle (`NormalForm`) — utile
pour tester l'equivalence et le calcul exact. `simplify(node)` applique un jeu
de 171 regles de remplacement sur le `MathNode` pour produire une expression
plus courte (`SimplifyResult`). L'une n'implique pas l'autre : une expression
simplifiee n'est pas necessairement normalisee, et vice versa.

**`numericNode`** — Factory safe pour les valeurs numeriques potentiellement
negatives (`common/numeric.ts`). `numericNode(-3)` produit
`opposite(number('3'))`. A utiliser a la place de `number()` quand la valeur
vient d'un calcul ou d'une entree utilisateur.

**opposite / convention de signe** — Les valeurs negatives ne s'encodent PAS
comme `number('-3')` (interdit, `factory.ts:255` throw) mais comme
`opposite(number('3'))`. `isMinusOne` ne reconnait que
`opposite(number('1'))`. Le guard `isNegativeType` releve du systeme de types
numeriques (`numtype/`), pas du signe syntaxique.

**`P` (pattern builder)** — Namespace exporte depuis `pattern/`. Fournit des
constructeurs de `Pattern` : `P.wildcard('x')`, `P.num()`, `P.add(p1, p2)`,
`P.mul(...)`, `P.func('sin', [P.wildcard('x')])`, etc. Les patterns sont des
objets distincts des `MathNode` — ils decrivent ce qu'on cherche, pas une
expression mathematique. Voir [`pattern-matching.md`](./pattern-matching.md).

**palier** (1 / 2a / 2b / 3) — Niveau de correction affiche a l'eleve dans le
systeme de questions UbuMaths. Pilote la granularite des etapes generees par
les modules `pedagogical-*`. Mappe sur `SchoolLevel` :
`'primaire' | 'college' | 'lycee' | 'superieur'`. Le dispatcher
`generateEquationSteps` bumpe automatiquement les niveaux insuffisants
(`'primaire'` → `'college'` pour lineaire ; `'primaire'|'college'` → `'lycee'`
pour quadratique). Voir `step-generator/types.ts`.

**`ParseCache`** — Cache LRU exporte depuis `cache/`. **Non cable aux parsers
par defaut** — opt-in. A utiliser dans les boucles de generation de questions.
Promotion LRU : delete + set a chaque lecture (chaque hit = ecriture).

**`Pattern`** — Type distinct de `MathNode`. Decrit une forme structurelle a
rechercher (wildcards, contraintes). Construit via `P.*` ou `parsePattern(str)`.
Ne s'evalue jamais numeriquement.

**`parsePattern`** — Variante du parser LaTeX qui produit un `Pattern` plutot
qu'un `MathNode`. Permet d'ecrire des patterns sous forme de chaine LaTeX avec
une syntaxe de wildcard dediee. Voir [`pattern-matching.md`](./pattern-matching.md).

**`SchoolLevel`** — `'primaire' | 'college' | 'lycee' | 'superieur'` (source :
`common/step-renderer-base.ts:38`). Adapte le vocabulaire et la granularite
des etapes pedagogiques.

**`SecurityError`** — Classe d'erreur (source : `parser/security.ts`) lancee
quand un des caps de securite est depasse lors du parsing. Champ
`code: 'INPUT_TOO_LONG' | 'AST_TOO_DEEP' | 'AST_TOO_MANY_NODES'`. Distinct
de `PrattParseException` / `RDParseException` (erreurs de syntaxe). Caps par
defaut : 10 000 chars, profondeur 100, 10 000 noeuds.

**step-generator** — Module `step-generator/` (3 fichiers) qui definit les
types `CalculationStep`, `StepGenerationResult` et `StepGeneratorConfig`.
Socle de tous les modules `pedagogical-*`. Un `CalculationStep` porte :
`index`, `description` (FR), `expression` (LaTeX), `explanation?`, `ast?`,
`subSteps?`.

**`StyledFactor`** — Element d'un `FlatProduct` :
`{ style: MultiplicationDisplayStyle, factor: MathNode }`.
`style` vaut `'implicit'` pour le premier facteur (pas d'operateur precede),
et `'dot' | 'cross' | 'star'` pour les suivants (portent le `×` qui les
precede). Contrat : `style` est la seule memoire de l'operateur original apres
le flatten.

**`tryMatch`** — Fonction principale du module pattern :
`tryMatch(node: MathNode, pattern: Pattern): MatchResult | null`. Renvoie
`null` si le pattern ne correspond pas, sinon
`{ bindings: MatchBindings }` ou les wildcards sont lies a leurs noeuds.
`matches(node, pattern): boolean` est l'alias qui ne retourne que le booleeen.

**type guard** — Fonction `isXxx(node: MathNode): node is XxxNode`.
Environ 50 guards exportes depuis `guards.ts`. La plupart ont la forme
`node.type === 'xxx'`. Les cas complexes (ex. `isFraction`, qui teste
`isDivision(node) && node.displayStyle === 'fraction'`) sont des predicats
derives. L'exhaustivite est verifiee via le pattern
`const _exhaustive: never = node` dans les switch de `guards.ts:672`.

**wildcard** — Element d'un `Pattern` qui capture n'importe quel sous-arbre.
`P.wildcard('x')` capture le noeud et le lie au nom `'x'` dans les bindings.
`P.wildcard()` (sans nom) capture sans lier. Les wildcards peuvent porter des
contraintes (`P.wildcard('a', P.isPositive())`).
