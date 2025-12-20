# Export Typst (vartable)

Documentation du generateur Typst pour les tableaux de variation.

**Fichier source** : `src/lib/ubumark/generators/variation-table-typst.ts`

## Vue d'ensemble

Le generateur produit du code Typst utilisant le package **vartable** pour creer des tableaux de signe et de variation.

## Fonction principale

```typescript
function generateVariationTableTypst(
	node: VariationTableNode,
	options?: VariationTableTypstOptions
): string;
```

### Options

```typescript
interface VariationTableTypstOptions {
	/** Options supplementaires (reserve pour usage futur) */
	extraOptions?: string;
}
```

## Format de sortie

### Structure generale

```typst
#import "@preview/vartable:0.2.3": tabvar

#tabvar(
  variable: $x$,
  domain: ($-infinity$, $0$, $+infinity$),
  label: ($f'(x)$, $f(x)$),
  content: (
    ($+$, "z", $-$),
    ((bottom, $-infinity$), (top, $3$), (bottom, $-infinity$))
  )
)
```

### Exemple complet

**Entree** :

````
```variation
variable: x
domain: -inf, -1, 0, +inf

sign: f'(x)
  -inf,-1: +
  -1: z
  -1,0: -
  0: z
  0,+inf: +

variation: f(x)
  -inf: -inf, bottom
  -1: 3, top
  0: 0, center
  +inf: +inf, top
````

````

**Sortie** :

```typst
#import "@preview/vartable:0.2.3": tabvar

#tabvar(
  variable: $x$,
  domain: ($-infinity$, $-1$, $0$, $+infinity$),
  label: ($f'(x)$, $f(x)$),
  content: (
    ($+$, "z", $-$, "z", $+$),
    ((bottom, $-infinity$), (top, $3$), $0$, (top, $+infinity$))
  )
)
````

## Composants du format

### Variable

```typescript
formatVariable(node.variable);
// "x" -> "$x$"
```

### Domaine

Format : `($point1$, $point2$, ...)`

```typescript
generateDomain(node.domain);
// -> "($-infinity$, $-1$, $0$, $+infinity$)"
```

**Conversion des infinites** :

- `-inf` -> `-infinity`
- `+inf` ou `inf` -> `+infinity`

> Note : vartable ne supporte pas directement la notation des bornes ouvertes `]a[`.

### Labels

Format : `($label1$, $label2$, ...)`

```typescript
generateLabels(node.rows);
// -> "($f'(x)$, $f(x)$)"
```

### Contenu (lignes)

Chaque ligne est un tuple dans le tableau `content`.

#### Ligne de signe

Format : `($+$, "z", $-$, ...)`

```typescript
generateSignRow(row, domain);
// -> "($+$, \"z\", $-$, \"z\", $+$)"
```

**Valeurs** :

| Marqueur      | Typst |
| ------------- | ----- | --- | --- |
| `+`           | `$+$` |
| `-`           | `$-$` |
| zero          | `"z"` |
| asymptote     | `"    |     | "`  |
| forbidden     | `"    |     | "`  |
| discontinuity | `"    |     | "`  |

#### Ligne de variation

Format : `((position, $value$), ...)`

```typescript
generateVariationRow(row, domain);
// -> "((bottom, $-infinity$), (top, $3$), $0$, (top, $+infinity$))"
```

**Positions** :

| Position AST             | Typst                        |
| ------------------------ | ---------------------------- |
| `top`, `limit-top`       | `top`                        |
| `bottom`, `limit-bottom` | `bottom`                     |
| `center`                 | (omis - position par defaut) |

**Exemples** :

- Position haute : `(top, $3$)`
- Position basse : `(bottom, $-infinity$)`
- Position centrale : `$0$` (pas de tuple)
- Asymptote : `"||"`

## Utilisation

### Dans un generateur

```typescript
import { generateVariationTableTypst } from '$lib/ubumark/generators/variation-table-typst';

const typstCode = generateVariationTableTypst(variationNode);
```

### Integration avec le generateur Typst principal

Dans `typst-generator.ts` :

```typescript
import { generateVariationTableTypst } from './variation-table-typst';

function generateNode(node: ASTNode): string {
	switch (node.type) {
		case 'variation-table':
			return generateVariationTableTypst(node as VariationTableNode);
		// ...
	}
}
```

## Conversion LaTeX vers Typst

Le module utilise `convertLatexToTypstMath` pour convertir les expressions :

```typescript
import { convertLatexToTypstMath } from './typst-generator';

// LaTeX -> Typst
convertLatexToTypstMath('\\frac{1}{2}'); // -> "1/2"
convertLatexToTypstMath('\\sqrt{x}'); // -> "sqrt(x)"
```

## Gestion des erreurs

```typescript
// Tableau sans lignes
generateVariationTableTypst({ rows: [], ... })
// -> "// Error: Variation table has no rows"

// Tableau sans domaine
generateVariationTableTypst({ domain: [], ... })
// -> "// Error: Variation table has no domain points"
```

## Tests

```bash
pnpm test:server src/lib/ubumark/__tests__/generators/variation-table-typst.test.ts
```

**Couverture** :

- Formatage de la variable
- Generation du domaine
- Generation des labels
- Lignes de signe avec marqueurs
- Lignes de variation avec positions
- Conversion des positions
- Gestion des erreurs

## Reference vartable

### Import

```typst
#import "@preview/vartable:0.2.3": tabvar
```

### Parametres tabvar

| Parametre  | Description                             |
| ---------- | --------------------------------------- |
| `variable` | Variable du tableau (en math)           |
| `domain`   | Tuple des points du domaine             |
| `label`    | Tuple des labels de lignes              |
| `content`  | Tuple de tuples (une ligne par element) |

### Structure de contenu

```typst
content: (
  // Ligne de signe
  ($+$, "z", $-$),

  // Ligne de variation
  ((bottom, $val1$), (top, $val2$), $val3$)
)
```

### Marqueurs

| Symbole | Description |
| ------- | ----------- | --- | ----------------------- |
| `"z"`   | Zero        |
| `"      |             | "`  | Asymptote/discontinuite |

### Positions

| Position | Description      |
| -------- | ---------------- |
| `top`    | Valeur en haut   |
| `bottom` | Valeur en bas    |
| (defaut) | Valeur au centre |

## Limitations

1. **Bornes ouvertes** : vartable ne supporte pas directement la notation `]a[` pour les bornes ouvertes
2. **Zones interdites** : Pas de support natif pour les hachures, utilise `"||"` comme approximation
3. **Limites d'asymptote** : Les limites gauche/droite sont gerees implicitement par les valeurs environnantes

## Comparaison LaTeX vs Typst

| Fonctionnalite  | LaTeX (tkz-tab) | Typst (vartable) |
| --------------- | --------------- | ---------------- | --- | --- | --- | --- |
| Signe +         | `+`             | `$+$`            |
| Zero            | `z`             | `"z"`            |
| Asymptote       | `               |                  | `   | `"  |     | "`  |
| Zone interdite  | `h` (hachures)  | `"               |     | "`  |
| Position haute  | `+/val`         | `(top, val)`     |
| Position basse  | `-/val`         | `(bottom, val)`  |
| Bornes ouvertes | `]point[`       | Non supporte     |
