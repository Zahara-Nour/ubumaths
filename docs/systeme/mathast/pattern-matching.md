# Module `pattern` — motifs, règles, vérification de forme

> Source : `src/lib/mathAST/pattern/` (tests : `pattern/__tests__/`, `pattern/rule-sets/__tests__/`).
> Parseurs de chaînes : `src/lib/mathAST/parser/custom/pattern-parser.ts`, `constraint-parser.ts`,
> `rule-parser.ts`. Vue d'ensemble du moteur : [README.md](README.md).
> Fusion de `pattern/README.md` (janvier) et de l'ancien `pattern-matching.md` (juin).
> **Vérifié contre le code le 2026-10-10.**

## À quoi ça sert

Décrire **une forme** d'expression et la chercher dans un `MathNode` : vérifier une forme
(« la réponse est-elle `ax + b` ? »), extraire des sous-expressions (le coefficient de
`sin`), écrire des **règles de réécriture** (`x + 0 → x`). C'est le vocabulaire de
`pedagogical-simplify` et une partie de `simplify` (cf. [README §Pipeline](README.md#le-pipeline)).

**Règle de la maison** : quand on cherche une forme dans un arbre, on écrit un motif
(`P.sum`, `tryMatch`), on ne réécrit pas un parcours à la main. Une session a déjà réécrit
180 lignes de `flattenSumShallow` manuel là où `P.sum()` + `tryMatch()` suffisaient.

Un **motif** (`Pattern`, `pattern/types.ts`) n'est pas un `MathNode` : il décrit ce qu'on
cherche (jokers, contraintes). Les deux types sont séparés pour qu'on ne puisse pas passer
l'un pour l'autre.

## Fichiers

| Fichier          | Rôle                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `types.ts`       | motifs, contraintes, liaisons (`MatchBindings`), `Rule`, `RuleStep` |
| `builder.ts`     | l'espace de noms `P` (et les mêmes fonctions exportées une à une)   |
| `match.ts`       | `match`, `tryMatch`, `matches` ; ré-exporte `nodesEqual`            |
| `constraints.ts` | `checkConstraint`, `containsVariable`, `isFreeOfVariables`          |
| `rule.ts`        | `createRule`, `instantiate`, `applyRule*`                           |
| `verify.ts`      | `verifyForm`, `matchesForm`, `extractBindings` (entrée : chaînes)   |
| `rule-sets/`     | jeux de règles prêts à l'emploi (voir plus bas)                     |
| `index.ts`       | point d'entrée `$lib/mathAST/pattern`                               |

```
motif + MathNode ──match()──► { success, bindings }
Rule { pattern, replacement } ──instantiate(bindings)──► nouveau MathNode
```

## Construire un motif : `P`

`import { P } from '$lib/mathAST/pattern'`. Chaque constructeur existe aussi en export
individuel (`wildcard`, `seqWildcard`, `optSeqWildcard`, `num`, `varPat`, `lit`, `add`…).

### Jokers et littéraux

| Constructeur                                 | Capture                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `P._('x')` (alias `P.wildcard`)              | n'importe quel sous-arbre, lié au nom `x`                                                |
| `P._('n', contrainte)`                       | idem, si la contrainte est vraie                                                         |
| `P.__('rest')` (alias `P.seqWildcard`)       | séquence de 1 terme/facteur ou plus (dans une somme/produit)                             |
| `P.___('extras')` (alias `P.optSeqWildcard`) | séquence de 0 ou plus                                                                    |
| `P.num(3)`                                   | le nombre exact ; **`P.num(-1)` vise `opposite(number('1'))`** (passe par `numericNode`) |
| `P.var('x')`                                 | la variable `x` exactement                                                               |
| `P.lit(node)`                                | ce nœud exactement (égalité structurelle)                                                |

Un même nom employé deux fois impose **la même valeur** : `P.mul(P._('x'), P._('x'))`
accepte `a·a`, refuse `a·b`.

### Motifs de structure

| Constructeur                 | Filtre                       | Ordre des opérandes     |
| ---------------------------- | ---------------------------- | ----------------------- |
| `P.add(g, d)`                | `addition` binaire           | essaie les deux ordres  |
| `P.mul(g, d)`                | `multiplication` binaire     | essaie les deux ordres  |
| `P.sub(g, d)`                | `subtraction`                | fixe                    |
| `P.div(n, d)`                | `division`                   | fixe                    |
| `P.pow(base, exp)`           | `superscript`                | fixe                    |
| `P.neg(x)` / `P.pos(x)`      | `opposite` / `positive`      | —                       |
| `P.paren(x)`                 | `delimiter` (contenu filtré) | —                       |
| `P.subscript(base, ind)`     | `subscript`                  | fixe                    |
| `P.rel(type, g, d)`          | `relation`                   | fixe                    |
| `P.func(nom, args, opts?)`   | `function` (`sin`, `sin²`…)  | arguments dans l'ordre  |
| `P.sum(...)` / `P.prod(...)` | somme / produit **aplatis**  | toutes les affectations |

- `P.add`/`P.mul` filtrent **un nœud binaire** : sur `a+b+c` (arbre `(a+b)+c`),
  `P.add(P._('x'), P._('y'))` lie `x = a+b`, `y = c`. Pour raisonner terme à terme,
  utiliser `P.sum`/`P.prod`. Exception : si un opérande de `P.add` est une séquence
  (`a + __rest`), le motif est traité comme `P.sum`.
- **Les parenthèses sont une frontière.** `P.sum` aplatit avec `flattenSumShallow`, qui
  s'arrête aux `delimiter` : sur `a+(b+c)`, les termes sont `a` et `(b+c)`. Et `P.add`
  ne filtre pas `(a+b)` (c'est un `delimiter`) : il faut `P.paren(P.add(…))`.
- `P.sum`/`P.prod` admettent **une seule** séquence. Liaison d'une séquence :
  `{ kind: 'sum-sequence', terms: SignedTerm[] }` dans une somme,
  `{ kind: 'product-sequence', factors }` dans un produit.

### Contraintes (second argument de `P._`)

| Famille        | Constructeurs                                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nature         | `P.isNumber()`, `P.isVariable()`, `P.isType('addition', 'variable')`                                                                                                                                                                               |
| valeur         | `P.isPositive()`, `P.isNegative()`, `P.isNonzero()`, `P.isNonone()`, `P.isInteger()`, `P.isEven()`, `P.isOdd()`, `P.isMultipleOf(n)`                                                                                                               |
| comparaison    | `P.gt(n)`, `P.lt(n)`, `P.gte(n)`, `P.lte(n)`, `P.eq(n)`, `P.ne(n)`                                                                                                                                                                                 |
| type numérique | `P.isIntegerType()`, `P.isRationalType()`, `P.isAlgebraicType()`, `P.isRealType()`, `P.isTranscendentalType()`, `P.isComplexType()`, `P.isNumType(type, strict?)` — inférence `numtype/`, inclusive par défaut (un entier est rationnel)           |
| structure      | `P.isFreeOf('x', 'y')`                                                                                                                                                                                                                             |
| ensembles      | `P.inR()`, `P.inRplus()`, `P.inRplusStar()`, `P.inRstar()`, `P.inRminus()`, `P.inRminusStar()`, `P.inN()`, `P.inNstar()`, `P.inZ()`, `P.inZstar()`, `P.inPositiveReals()`, `P.inNonNegativeReals()`, `P.inUnitInterval()`, `P.inInterval(domaine)` |
| logique        | `P.and(…)`, `P.or(…)`, `P.not(c)`, `P.custom(fn, label?)`                                                                                                                                                                                          |

Un `TypeContext` optionnel (dernier argument de `match`/`tryMatch`/`applyRule*`) rend les
contraintes sensibles aux hypothèses (« x > 0 ») : c'est ainsi que tirent `abs-positive`,
`abs-negative` (cf. `assumptions.ts`, ADR 0012).

## Filtrer

| Fonction                              | Rend                                             |
| ------------------------------------- | ------------------------------------------------ |
| `match(motif, nœud, liaisons?, ctx?)` | `{ success, bindings }`                          |
| `tryMatch(motif, nœud, ctx?)`         | `MatchBindings` ou `undefined` — l'usage courant |
| `matches(motif, nœud, ctx?)`          | `boolean`                                        |
| `nodesEqual(a, b)`                    | égalité structurelle (`normal/hash.ts`)          |

⚠️ L'ordre est **motif d'abord, nœud ensuite** (l'ancien glossaire disait l'inverse).

```typescript
import { P, tryMatch } from '$lib/mathAST/pattern';

const b = tryMatch(P.prod(P._('coeff', P.isFreeOf('x')), P.func('sin', [P._('arg')])), node);
if (b) {
	const coeff = b.get('coeff');
}
```

Côté `Exp` (`exp.ts`) : `Exp.parse(latex).matches(motif)`, `.extract(motif)` (liaisons ou
`null`), `.simplifyWith(règles, maxIterations?)`.

### Algorithme (`match.ts`)

1. **Aiguillage** sur `pattern.type` (joker, littéral, binaire, fonction, somme/produit…),
   avec contrôle d'exhaustivité `never`.
2. **Joker** : contrainte d'abord, puis cohérence avec une liaison déjà posée.
3. **Littéral** : égalité structurelle.
4. **Binaire commutatif** : ordre écrit, puis ordre inversé.
5. **Somme/produit** : aplatissement, puis choix de k termes parmi n pour les k jokers
   simples, dans tous les ordres ; le reste va à la séquence. Coût au pire
   C(n,k)·k!, sans mémoïsation ; les générateurs s'arrêtent au premier succès.

## Règles

```typescript
import { P, createRule } from '$lib/mathAST/pattern';

createRule(P.add(P._('x'), P.num(0)), P._('x'), { name: 'add-zero-right' });
// remplacement calculé :
createRule(P.sub(P.num(0), P._('x')), (b) => opposite(b.get('x') as MathNode), {
	name: 'zero-sub'
});
// raccourci, avec condition :
P.rule(P.div(P._('x'), P._('x')), P.num(1), {
	name: 'div-self',
	condition: (b) => {
		const x = b.get('x');
		return x?.type !== 'number' || x.value !== '0';
	}
});
```

`RuleOptions` : `name`, `condition(bindings)`, `priority` (plus haut = essayé d'abord),
`group`. `instantiate(motif, liaisons)` reconstruit l'arbre (une séquence passe par
`unflattenSum`/`unflattenProduct`).

| Application                                               | Comportement                                           |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `applyRule(règle, nœud, ctx?)`                            | racine seulement ; `MathNode \| null`                  |
| `applyRuleDeep(règle, nœud, ctx?)`                        | une règle, parcours ascendant (`mapNode`)              |
| `applyRules(règles, nœud, maxIterations = 100, ctx?)`     | jusqu'au point fixe, règles triées par priorité        |
| `applyRulesDeepOnce(règles, nœud, ctx?)`                  | une passe ascendante, première règle qui tire par nœud |
| `applyRulesDeepOnceTracked(…)`                            | idem, avec les étapes                                  |
| `applyRulesWithSteps(règles, nœud, maxIterations?, ctx?)` | point fixe + `{ result, changed, steps: RuleStep[] }`  |

`RuleStep = { ruleName, before, after }` : c'est la matière des étapes pédagogiques.

### Syntaxe chaîne : `parsePattern`, `P.parse`, `parseRule`

```typescript
parsePattern('x + 0'); // P.add(P._('x'), P.num(0))
parsePattern('n:number * $x'); // P.mul(P._('n', P.isNumber()), P.var('x'))
parsePattern('a + __rest'); // somme avec séquence
parsePattern('k:inN*'); // P._('k', …entier > 0)
parseRule('x / x -> 1 ; x:nonzero');
```

- Toute lettre est un joker ; `$x` = la variable `x` littérale ; `__r` séquence 1+, `___r`
  séquence 0+ (pas de `_x`).
- Opérateurs `+ - * / ^`, moins unaire, parenthèses, fonctions `sin(x)`, `sqrt(x)`…
- Contraintes après `:` — atomes `number`, `variable`, `integer`, `even`, `odd`,
  `positive`, `negative`, `nonzero`, `nonone` ; types `integerType`, `rationalType`,
  `algebraicType`, `realType`, `transcendentalType`, `complexType` ; ensembles `inR`,
  `inR+`, `inR+*`, `inR*`, `inR-`, `inR-*`, `inN`, `inN*`, `inZ`, `inZ*` ; fonctions
  `type(addition|variable)`, `freeOf(x,y)`, `gt(0)` `lt` `gte` `lte` `eq` `ne`,
  `multipleOf(10)` ; intervalle à la française `in]0,+inf[`, `in[0,10[`.
- Logique, du plus au moins prioritaire : `!`, `&`, `|` — `n:integer & positive`.
- `parseRule` : `motif -> remplacement [; x:contrainte, …]`.

## Vérification de forme (`verify.ts`)

Entrée LaTeX, motif en chaîne :

```typescript
verifyForm('2x+3', 'a * $x + b'); // { matches: true, bindings: { a: '2', b: '3' }, rawBindings: Map }
matchesForm(réponse, motif); // boolean
extractBindings(réponse, motif); // Record<string, string> | null
```

## Jeux de règles (`rule-sets/`)

Exportés par `$lib/mathAST/pattern` : `arithmeticRules`, `powerRules`, `absRules`,
`allPatternRules`, `simplifyRules`. Les autres s'importent de `pattern/rule-sets`.

| Jeu                                                                              | Fichier                    | Règles (noms réels)                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arithmeticRules`                                                                | `arithmetic.ts`            | `add-zero-left/right`, `sub-zero`, `zero-sub`, `sub-self`, `mul-one-*`, `mul-zero-*`, `div-one`, `zero-div`, `div-self`, `double-neg`, `positive-identity`                                                                                                                                                                                                                                                           |
| `powerRules`                                                                     | `powers.ts`                | `pow-one`, `pow-zero`, `one-pow`, `zero-pow`, `neg-one-pow-even/odd`, `neg-base-pow-even/odd`, `sqrt-square`, `square-sqrt`, `pow-of-pow`, `same-base-mul`, `pow-of-quotient`, `pow-neg-one`                                                                                                                                                                                                                         |
| `absRules`, `absSimplifyRules`                                                   | `abs.ts`                   | `abs-negation`, `abs-idempotent`, `abs-product`, `abs-quotient`, `abs-even-pow`, `abs-pow-even`, `abs-positive`, `abs-negative`                                                                                                                                                                                                                                                                                      |
| `logExpRules`                                                                    | `log-exp.ts`               | `ln-exp`, `exp-ln`, `ln-one`, `ln-e`, `ln-pow`, `ln-product`, `ln-quotient`                                                                                                                                                                                                                                                                                                                                          |
| `sqrtRules`                                                                      | `sqrt.ts`                  | `sqrt-zero`, `sqrt-one`, `sqrt`, `sqrt-product`, `sqrt-quotient`                                                                                                                                                                                                                                                                                                                                                     |
| `trigRules`                                                                      | `trig.ts`                  | `sin-remarkable`, `cos-remarkable`, `tan-remarkable`                                                                                                                                                                                                                                                                                                                                                                 |
| `functionParityRules`                                                            | `function-parity.ts`       | `<fonction>-even` / `<fonction>-odd` (`f(-x)`)                                                                                                                                                                                                                                                                                                                                                                       |
| `commonFactorRules`, `commonContentFactorRules`                                  | `common-factor.ts`         | `common-factor-products`, `common-factor-bare-term`                                                                                                                                                                                                                                                                                                                                                                  |
| `algebraicFactoringRules` / `algebraicExpandingRules` / `algebraicSimplifyRules` | `algebraic-identities.ts`  | `diff-squares-*`, `perfect-square-trinomial`, `sum-cubes-*`, `diff-cubes-*` / `product-to-diff-squares`, `expand-sum-squared`, `expand-diff-squared`                                                                                                                                                                                                                                                                 |
| identités trigonométriques                                                       | `trig-identities.ts`       | `trigPythagoreanRules`, `trigDoubleAngleRules`, `trigDoubleAngleExpansionRules`, `trigAdditionRules`, `trigLinearizationRules`, `trigFactorizationRules`, `trigPowerReductionRules`, `trigHigherPowerRules`, `trigNegativeAngleRules`, `trigPeriodicRules`, `trigCofunctionRules`, `trigSupplementaryRules`, `trigHalfAngleRules`, `trigQuotientRules`, `trigShiftPiOver2Rules`, `trigSimplifyRules`, `allTrigRules` |
| identités hyperboliques                                                          | `hyperbolic-identities.ts` | mêmes familles préfixées `hyp…`, `hypSimplifyRules`, `allHyperbolicRules`                                                                                                                                                                                                                                                                                                                                            |

`allPatternRules` = arithmétique + puissances + abs + log/exp + racines + trig + parité.

**Qui utilise quoi** (c'est l'écart que l'ADR 0007 veut résorber) :

- `simplify()` (`simplify/simplify.ts`, `buildSimplifyRules`) : `absSimplifyRules`,
  `trigSimplifyRules`, `hypSimplifyRules`, `algebraicSimplifyRules` — l'arithmétique et les
  puissances y sont faites par `tidy`/`normalize`, pas par ces règles.
- `pedagogical-simplify` (`intent-rules.ts`, `selectRulesForIntent`) : un mélange par
  intention — `factoriser` = `commonFactorRules` + `algebraicFactoringRules` + identités ;
  `developper` = `algebraicExpandingRules` + `distributeBinomialProduct` + identités ;
  `reduire` = identités + `powerRules` + `sqrtRules` ; `auto` = `reduire` + factorisations
  symboliques. Les identités (trig, log/exp, abs, hyperboliques) sont coupées selon le
  niveau scolaire.

## Pièges connus

- **Une règle ne voit que la représentation que le parseur produit.** `ln-exp`, `exp-ln`
  et `ln-e` filtrent `P.lit(euler())` (un `MathConstantNode`) ; or `parseLatex('e^x')`
  rend une **variable** `e`. Mesuré le 2026-10-10 : `applyRules(logExpRules,
parseLatex('\ln(e^{x})'))` rend `x\ln(e)` (seule `ln-pow` tire). Même famille d'angle
  mort : `-3y` se lit `opposite(3)·y` (cf. [README §Invariants](README.md#invariants-structurels-non-évidents)),
  l'indice d'une racine est dans `function.base`, `\sin^2 x` est une `function` avec
  `power`. **Tester une règle sur une entrée parsée, pas sur un arbre fabriqué.**
- Coût combinatoire de `P.sum`/`P.prod` sur de longues sommes (pas de mémoïsation).
- `applyRules` s'arrête à 100 itérations : deux règles inverses bouclent sans erreur.
