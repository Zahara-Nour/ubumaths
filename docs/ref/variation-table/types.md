# Types TypeScript

Reference des types pour les tableaux de variation.

**Fichier source** : `src/lib/ubumark/types/variation-table.ts`

## Types principaux

### VariationTableNode

Noeud AST representant un tableau de variation complet.

```typescript
interface VariationTableNode extends BaseNode {
	type: 'variation-table';
	/** Nom de la variable (ex: "x", "t") */
	variable: string;
	/** Points du domaine dans l'ordre */
	domain: DomainPoint[];
	/** Lignes du tableau (signe et/ou variation) */
	rows: (SignRow | VariationRow)[];
}
```

### DomainPoint

Point dans la definition du domaine.

```typescript
interface DomainPoint {
	/** Expression mathematique (ex: "-inf", "0", "\frac{\pi}{2}") */
	expression: string;
	/** True si borne ouverte (parenthese), false si fermee (crochet) */
	open?: boolean;
}
```

## Types pour les lignes de signe

### SignRow

Ligne affichant le signe d'une fonction sur des intervalles.

```typescript
interface SignRow {
	type: 'sign';
	/** Label de la ligne (ex: "f'(x)", "f''(x)") */
	label: string;
	/** Valeurs pour chaque point ou intervalle */
	values: Map<string, SignValue>;
}
```

**Format des cles dans `values`** :

- Point simple : `"0"`, `"-1"`, `"+inf"`
- Intervalle : `"-inf,-1"`, `"0,1"`

### SignValue

Union discriminee pour les valeurs de signe.

```typescript
type SignValue = SignValueSign | SignValueMarker;

interface SignValueSign {
	type: 'sign';
	value: '+' | '-';
}

interface SignValueMarker {
	type: 'marker';
	marker: VariationMarker;
}
```

**Utilisation avec type guard** :

```typescript
function processSignValue(value: SignValue) {
	if (value.type === 'sign') {
		// TypeScript sait que value.value est '+' | '-'
		console.log(`Signe: ${value.value}`);
	} else {
		// TypeScript sait que value.marker est VariationMarker
		console.log(`Marqueur: ${value.marker}`);
	}
}
```

## Types pour les lignes de variation

### VariationRow

Ligne affichant les variations d'une fonction.

```typescript
interface VariationRow {
	type: 'variation';
	/** Label de la ligne (ex: "f(x)", "g(x)") */
	label: string;
	/** Valeurs a chaque point du domaine */
	values: Map<string, VariationValue>;
}
```

### VariationValue

Valeur dans une ligne de variation.

```typescript
interface VariationValue {
	/** Expression mathematique (ex: "3", "-inf", "\frac{1}{2}") */
	expression: string;
	/** Position verticale dans la cellule */
	position: VariationPosition;
	/** Marqueur optionnel (asymptotes, discontinuites) */
	marker?: VariationMarker;
	/** Limites pour asymptotes: [limite gauche, limite droite] */
	limits?: [string, string];
}
```

### VariationPosition

Position verticale d'une valeur.

```typescript
type VariationPosition =
	| 'top' // Maximum/position haute
	| 'bottom' // Minimum/position basse
	| 'center' // Position centrale
	| 'limit-top' // Approche par le haut (limites)
	| 'limit-bottom'; // Approche par le bas (limites)
```

## Types de marqueurs

### VariationMarker

Marqueurs speciaux pour les cellules.

```typescript
type VariationMarker =
	| 'zero' // Passage par zero
	| 'asymptote' // Asymptote verticale (||)
	| 'forbidden' // Valeur interdite, fonction non definie (|h|)
	| 'discontinuity'; // Point de discontinuite (d)
```

| Marqueur        | Syntaxe    | Rendu HTML   | LaTeX |
| --------------- | ---------- | ------------ | ----- | ------------ | --- | --- | --- |
| `zero`          | `z` ou `0` | "0"          | `z`   |
| `asymptote`     | `          |              | `     | Double barre | `   |     | `   |
| `forbidden`     | `          | h            | `     | Hachures     | `h` |
| `discontinuity` | `d`        | "d" italique | `t`   |

## Types utilitaires

### TableRow

Union de tous les types de ligne.

```typescript
type TableRow = SignRow | VariationRow;
```

### VariationTableParseError

Information d'erreur de parsing.

```typescript
interface VariationTableParseError {
	/** Message d'erreur */
	message: string;
	/** Numero de ligne (1-indexed) */
	line?: number;
	/** Contenu de la ligne problematique */
	content?: string;
}
```

### VariationTableParseResult

Resultat du parsing d'un bloc.

```typescript
interface VariationTableParseResult {
	/** Noeud parse, null si echec */
	node: VariationTableNode | null;
	/** Erreurs rencontrees */
	errors: VariationTableParseError[];
}
```

## Exemple de structure AST

Pour ce markdown :

````
```variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 3, top
  +inf: -inf, bottom
````

````

L'AST genere est :

```typescript
const node: VariationTableNode = {
  type: 'variation-table',
  variable: 'x',
  domain: [
    { expression: '-inf' },
    { expression: '0' },
    { expression: '+inf' }
  ],
  rows: [
    {
      type: 'sign',
      label: "f'(x)",
      values: new Map([
        ['-inf,0', { type: 'sign', value: '+' }],
        ['0', { type: 'marker', marker: 'zero' }],
        ['0,+inf', { type: 'sign', value: '-' }]
      ])
    },
    {
      type: 'variation',
      label: 'f(x)',
      values: new Map([
        ['-inf', { expression: '-inf', position: 'bottom' }],
        ['0', { expression: '3', position: 'top' }],
        ['+inf', { expression: '-inf', position: 'bottom' }]
      ])
    }
  ]
};
````

## Fonctions utilitaires

Le module exporte des fonctions pour travailler avec les noeuds :

```typescript
import {
	hasSignRows, // Verifie si le tableau a des lignes de signe
	hasVariationRows, // Verifie si le tableau a des lignes de variation
	getSignRows, // Recupere toutes les lignes de signe
	getVariationRows, // Recupere toutes les lignes de variation
	getDomainPointCount // Compte les points du domaine
} from '$lib/ubumark/parser/variation-table-parser';

// Exemple
if (hasVariationRows(node)) {
	const rows = getVariationRows(node);
	console.log(`${rows.length} lignes de variation`);
}
```
