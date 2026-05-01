# `toCustom` — fix multiplication implicite non-reparseable

## Statut : ✅ implémenté, testé, prêt à commiter

## Problème

`toCustom(node)` sérialise un `MathNode` vers la syntaxe DSL custom. Sur certaines
multiplications avec `displayStyle: 'implicit'`, la juxtaposition des opérandes
produit une chaîne que `parseCustom` refuse de relire.

**Cas reproductible** :

```ts
const f = parseCustom('x^x');
const fPrime = differentiate(f, { variable: 'x', simplify: true });
const out = toCustom(fPrime);
// out === "x^x(ln(x)+x1/x)"   ← `x` et `1` collés
parseCustom(out); // throws: "courbe(): erreur de syntaxe..."
```

L'AST issu de `differentiate(x^x)` contient `multiply(x, divide(1, x, 'fraction'), 'implicit')`.
Sans fix, sérialisation : `x1/x` — le parser refuse car NUMBER ne peut pas démarrer une
multiplication implicite (`parser-pratt.ts:1214`).

## Décision retenue : Option C (hybride)

Trois options ont été évaluées :

- **A** — fix uniquement dans `toCustom` ; producteurs (`differentiate`, etc.) restent naïfs.
- **B** — fix dans chaque producteur ; `toCustom` reste fidèle au `displayStyle`.
- **C** — filet de sécurité dans `toCustom` (= A), mais les producteurs **peuvent** opter
  pour `'star'`/`'dot'`/`'cross'` quand ils veulent forcer un opérateur visible.

**Option C choisie** :

- Pour la PR actuelle, comportement identique à A (aucune modif des producteurs).
- L'AST conserve une sémantique riche : `displayStyle` reste source de vérité pour LaTeX
  et autres consommateurs futurs.
- Le filet protège tout producteur (présent ou à venir) contre l'ambiguïté de juxtaposition.

## Règle d'émission

Dans `generateMultiplication` et la branche `'multiplication'` de `visitWithSpans`,
si `node.displayStyle === 'implicit'` ET le RHS sérialisé commence par un caractère qui
ouvre un token NUMBER (`[0-9.,]`), émettre `*` à la place de la juxtaposition.

Exemples :

| AST input                                         | Avant         | Après                    |
| ------------------------------------------------- | ------------- | ------------------------ |
| `multiply(x, 2, 'implicit')`                      | `x2` ❌       | `x*2` ✅                 |
| `multiply(x, divide(1,x,'fraction'), 'implicit')` | `x1/x` ❌     | `x*1/x` ✅               |
| `multiply(parens(a+b), 2, 'implicit')`            | `(a+b)2` ❌   | `(a+b)*2` ✅             |
| `multiply(sin(x), 2, 'implicit')`                 | `sin(x)2` ❌  | `sin(x)*2` ✅            |
| `multiply(2, x, 'implicit')`                      | `2x` ✅       | `2x` ✅ (inchangé)       |
| `multiply(x, y, 'implicit')`                      | `xy` ✅       | `xy` ✅ (inchangé)       |
| `multiply(div(1,2,'fraction'), pi, 'implicit')`   | `{1/2}\pi` ✅ | `{1/2}\pi` ✅ (inchangé) |

## Fichiers modifiés

- `src/lib/mathAST/custom-generator.ts` :
  - Helper `startsWithNumberToken(s)` (regex `/^[0-9.,]/`)
  - Modif `generateMultiplication` (mode simple, ligne ~1066)
  - Modif branche `'multiplication'` de `visitWithSpans` (mode coalescent, ligne ~423)
- `src/lib/mathAST/__tests__/custom-generator-implicit-mul.test.ts` (nouveau, 40 tests)
- `src/lib/geometry-core/dsl/__tests__/interpreter-derivee.test.ts` (1 test ajouté pour `derivee(x^x)`)

## Cas particulier mode coalescent (`renderMetadata: true`)

Le mode coalescent émet des **spans** (texte + couleur). Pour décider si on émet `*`,
il faut connaître le premier caractère du RHS **avant** de l'émettre. Approche choisie :
instancier un `CustomGenerator` jeté avec `renderMetadata: false` et appeler `generate(node.right)`
pour obtenir le texte brut sans wrapping `@color{...}`.

Sans cette précaution, un nœud coloré comme `multiply(x, withMetadata(num('2'), {color: 'red'}), 'implicit')`
serait sérialisé en `@red{2}` au peek (ne commence pas par chiffre) → safety net désactivé →
sortie cassée `x@red{2}` au lieu de `x*@red{2}`. Test de régression dédié dans `coalescent mode`.

## Tests

- 40 tests dans `custom-generator-implicit-mul.test.ts` :
  - Property test round-trip via `differentiate` sur 10 expressions
  - Cas explicite du bug (`differentiate(x^x)`)
  - Cas ambigus (variable\*number, parens\*number, sin\*number, var\*1/x, decimal, greek\*number)
  - Cas non-ambigus préservés (number\*var, var\*var, sin\*cos, fraction\*pi, etc.)
  - Cas explicites (`'star'`, `'dot'`, `'cross'`) inchangés
  - Mode coalescent (incluant nœud coloré)
  - Multiplications imbriquées
  - Round-trip parsé→généré
- 1 test ajouté dans `interpreter-derivee.test.ts` : round-trip `derivee(x^x)`
- Régression complète : 1482/1482 (mathAST), 1027/1027 (geometry-core/dsl)

## Extension (sign variant) — commit follow-up

Sondage post-commit a révélé une seconde forme du bug, **plus grave** : silencieuse.
`differentiate(x*cos(x))` produit `cos(x) + x*(-sin(x))` ; sans fix la sérialisation
`cos(x)+x-sin(x)` se reparse comme **somme à 3 termes** au lieu de la dérivée
correcte. Round-trip "réussit" mais avec une AST sémantiquement différente — vraie
corruption silencieuse de fonctions dérivées dans le DSL geometry-core.

**Fix** : étendre la regex à `/^[0-9.,+-]/` (ajout `+` et `-`). Renommé
`startsWithNumberToken` → `startsWithAmbiguousLeading` pour refléter la couverture.
Mêmes 2 call sites, JSDoc enrichie pour documenter les deux modes d'échec
(hard reject NUMBER vs silent reparse `+`/`-`).

| AST input                                        | Avant ext.    | Après ext.     |
| ------------------------------------------------ | ------------- | -------------- |
| `multiply(x, opposite(num('2')), 'implicit')`    | `x-2` ❌      | `x*-2` ✅      |
| `multiply(x, opposite(sin(x)), 'implicit')`      | `x-sin(x)` ❌ | `x*-sin(x)` ✅ |
| `multiply(x, positive(num('2')), 'implicit')`    | `x+2` ❌      | `x*+2` ✅      |
| `multiply(opposite(x), opposite(y), 'implicit')` | `-x-y` ❌     | `-x*-y` ✅     |

**Tests ajoutés** :

- 5 cas dans `custom-generator-implicit-mul.test.ts` (45 tests au total)
- 1 test sémantique dans `interpreter-derivee.test.ts` : round-trip de
  `derivee(courbe("y = x^2 * cos(x)"))` avec évaluation numérique en x=0, π/2, π

**Limitation résiduelle** (documentée en JSDoc) : si le RHS d'une mul implicite
est `add(opposite(a), b)` (somme dont premier terme est unaire négatif), le `*`
n'enveloppe que le premier facteur. `multiply(x, add(opposite(a), b), 'implicit')`
produit `x*-a+b` lu comme `add(mul(x, opposite(a)), b)`, pas
`mul(x, add(opposite(a), b))`. En pratique, `differentiate` ne produit jamais cette
forme (les sommes sont toujours en couche externe).

## Code review

Code review faite par l'agent `code-reviewer`. Issue importante détectée et corrigée :
fuite de wrapping `@color{...}` dans le peek du mode coalescent (cf. section ci-dessus).
