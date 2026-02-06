# Refactor: Add displayStyle to FlatProduct

> **Status: DONE** — Implemented in commit `45dae904`

## Contexte

`FlatSum` preserve le signe de chaque terme via `SignedTerm = { sign, term }`.
`FlatProduct` est un simple `MathNode[]` qui perd le `displayStyle` de chaque multiplication.

Cela pose probleme quand on a besoin de savoir si un `x` entre deux facteurs
est implicite, cross, dot ou star (ex: constraint `checkProducts`).

## Objectif

Aligner `FlatProduct` sur le pattern de `FlatSum` en ajoutant le `displayStyle`.

## Design

### Nouveau type

```typescript
// Avant
type FlatProduct = readonly MathNode[];

// Apres
type StyledFactor = {
	readonly style: MultiplicationDisplayStyle; // 'implicit' | 'cross' | 'dot' | 'star'
	readonly factor: MathNode;
};
type FlatProduct = readonly StyledFactor[];
```

Convention : le premier facteur porte un style par defaut (`'implicit'`),
comme le premier terme de `FlatSum` porte un sign (`'+'` ou `'-'`).
Les styles suivants representent le `x` AVANT le facteur correspondant.

### Fonctions a modifier

#### 1. `flattenProductShallow` (flatten.ts:157)

```typescript
// Avant
export function flattenProductShallow(node: MathNode): FlatProduct {
	switch (node.type) {
		case 'multiplication':
			return [...flattenProductShallow(node.left), ...flattenProductShallow(node.right)];
		case 'delimiter':
			return [node];
		default:
			return [node];
	}
}

// Apres : propager le style
function flattenProductShallowInternal(
	node: MathNode,
	style: MultiplicationDisplayStyle
): FlatProduct {
	switch (node.type) {
		case 'multiplication':
			return [
				...flattenProductShallowInternal(node.left, style),
				...flattenProductShallowInternal(node.right, node.displayStyle)
			];
		case 'delimiter':
			return [{ style, factor: node }];
		default:
			return [{ style, factor: node }];
	}
}

export function flattenProductShallow(node: MathNode): FlatProduct {
	return flattenProductShallowInternal(node, 'implicit');
}
```

Note : `node.displayStyle` est passe au facteur DROIT (le style s'applique
a la multiplication qui precede ce facteur). Le facteur gauche herite du
style du parent.

#### 2. `unflattenProduct` (flatten.ts:567)

```typescript
// Avant : un seul style pour tout
export function unflattenProduct(
	factors: FlatProduct,
	style?: MultiplicationDisplayStyle
): MathNode | null;

// Apres : utilise le style de chaque facteur
export function unflattenProduct(factors: FlatProduct): MathNode | null {
	if (factors.length === 0) return null;
	if (factors.length === 1) return factors[0].factor;

	let result: MathNode = factors[0].factor;
	for (let i = 1; i < factors.length; i++) {
		result = multiply(result, factors[i].factor, factors[i].style);
	}
	return result;
}
```

Le parametre `style` global disparait car chaque facteur porte son propre style.

#### 3. `flattenProductDeep` (flatten.ts:339)

Meme logique : utilise `flattenProductShallow` (qui retourne maintenant des
`StyledFactor[]`), et adapte l'iteration sur les facteurs.

### Fichiers consommateurs a adapter

| Fichier                                                     | Usage                                                      | Adaptation                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mathAST/index.ts`                                  | Re-export `StyledFactor`                                   | Ajouter export                                                                                                        |
| `src/lib/ubumark/parameterization/expression-transforms.ts` | `shuffleFactors` (l91-93), `shuffleTermsAndFactors` (l103) | `factors.map(f => f.factor)` pour shuffle, puis reconstruire avec styles. Ou shuffler les `StyledFactor` directement. |
| `src/lib/questions/required-form-validator.ts`              | Utilise `flattenProductShallow`                            | Adapter pour acceder a `.factor`                                                                                      |
| `src/lib/mathAST/pattern/match.ts`                          | `flattenProductShallow` dans pattern matching              | Adapter pour acceder a `.factor`                                                                                      |
| `src/lib/mathAST/pattern/rule.ts`                           | Utilise `unflattenProduct`                                 | Adapter - ne plus passer `style` en argument                                                                          |
| `src/lib/mathAST/analysis/structures.ts`                    | Utilise `flattenProductShallow`                            | Adapter pour acceder a `.factor`                                                                                      |
| `src/lib/questions/constraint-validators.ts`                | `checkProducts` - PRINCIPAL BENEFICIAIRE                   | Utiliser `.style` pour verifier chaque `x` individuellement                                                           |
| `src/lib/mathAST/__tests__/flatten.test.ts`                 | Tests                                                      | Adapter assertions                                                                                                    |

### Benefice pour checkProducts

Apres refactor, `checkProducts` pourra utiliser directement le flatten :

```typescript
const factors = flattenProductShallow(ast);
for (let i = 1; i < factors.length; i++) {
	if (factors[i].style === 'implicit') continue; // pas un x explicite
	// Explicit x : violation sauf si nombre x nombre
	if (!(isPureNumber(factors[i - 1].factor) && isPureNumber(factors[i].factor))) {
		return true;
	}
}
```

Plus besoin de `findNodes` + `rightmostAtom`/`leftmostAtom`.

## Tests

- Adapter tous les tests existants dans `flatten.test.ts`
- Verifier que `shuffleFactors` preserve les styles
- Verifier que `unflattenProduct` reconstruit avec les bons styles
- Verifier que `checkProducts` fonctionne avec le nouveau flatten
- Lancer `pnpm test:server src/lib/mathAST` et `pnpm test:server src/lib/questions/constraint-validators.test.ts`

## Risques

- Changement de type `FlatProduct` impacte ~8 fichiers
- `unflattenProduct` perd son parametre `style` global : verifier que tous les appels fournissent des styles corrects dans les facteurs
- Les shuffles de facteurs doivent preserver les styles (ou les reassigner)
