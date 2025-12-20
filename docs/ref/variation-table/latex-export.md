# Export LaTeX (tkz-tab)

Documentation du generateur LaTeX pour les tableaux de variation.

**Fichier source** : `src/lib/ubumark/generators/variation-table-latex.ts`

## Vue d'ensemble

Le generateur produit du code LaTeX utilisant le package **tkz-tab** pour creer des tableaux de signe et de variation professionnels.

## Fonction principale

```typescript
function generateVariationTableLatex(
	node: VariationTableNode,
	options?: VariationTableLatexOptions
): string;
```

### Options

```typescript
interface VariationTableLatexOptions {
	/** Hauteur des lignes (parametre lgt) - default: 3 */
	lineHeight?: number;
	/** Espacement des colonnes (parametre espcl) - default: 1.5 */
	columnSpacing?: number;
}
```

## Format de sortie

### Structure generale

```latex
\begin{tikzpicture}
\tkzTabInit[lgt=3,espcl=1.5]{header}{domain}
\tkzTabLine{...}
\tkzTabVar{...}
\end{tikzpicture}
```

### Exemple complet

**Entree** :

````
```variation
variable: x
domain: -inf, -1, 0, 1, +inf

sign: f'(x)
  -inf,-1: +
  -1: z
  -1,0: -
  0: z
  0,1: +
  1: z
  1,+inf: -

variation: f(x)
  -inf: -inf, bottom
  -1: 3, top
  0: 0, center
  1: -2, bottom
  +inf: -inf, bottom
````

````

**Sortie** :

```latex
\begin{tikzpicture}
\tkzTabInit[lgt=3,espcl=1.5]{$x$/1,$f'(x)$/1,$f(x)$/2}{$-\infty$,$-1$,$0$,$1$,$+\infty$}
\tkzTabLine{,+,z,-,z,+,z,-}
\tkzTabVar{-/$-\infty$,+/$3$,-/$0$,+/$-2$,-/$-\infty$}
\end{tikzpicture}
````

## Composants du format

### En-tete (Header)

Format : `$variable$/height,$label1$/height,...`

- Variable : toujours hauteur 1
- Lignes de signe : hauteur 1
- Lignes de variation : hauteur 2

```typescript
generateHeader(node, options);
// -> "$x$/1,$f'(x)$/1,$f(x)$/2"
```

### Domaine

Format : `$point1$,$point2$,...`

```typescript
generateDomain(node.domain);
// -> "$-\infty$,$-1$,$0$,$1$,$+\infty$"
```

**Conversion des infinites** :

- `-inf` -> `-\infty`
- `+inf` ou `inf` -> `+\infty`

**Bornes ouvertes** :

- Premier point ouvert : `]$expr$`
- Dernier point ouvert : `$expr$[`
- Point intermediaire ouvert : `]$expr$[`

### Ligne de signe (tkzTabLine)

Format : `\tkzTabLine{,val1,val2,...}`

**Valeurs** :

| Marqueur      | LaTeX |
| ------------- | ----- | --- | --- |
| `+`           | `+`   |
| `-`           | `-`   |
| zero          | `z`   |
| asymptote     | `     |     | `   |
| forbidden     | `h`   |
| discontinuity | `t`   |

```typescript
generateSignLine(row, domain);
// -> "\\tkzTabLine{,+,z,-,z,+,z,-}"
```

### Ligne de variation (tkzTabVar)

Format : `\tkzTabVar{dir1/val1,dir2/val2,...}`

**Directions** :

- `+` : croissant (position monte)
- `-` : decroissant (position descend)

**Premier point** : pas de direction

```typescript
generateVariationLine(row, domain);
// -> "\\tkzTabVar{-/$-\infty$,+/$3$,-/$0$,+/$-2$,-/$-\infty$}"
```

### Asymptotes avec limites

Format special pour asymptotes avec limites differentes :

```latex
-D+/$limite_gauche$/$limite_droite$
```

Exemples :

- Limite gauche `-inf`, limite droite `+inf` : `-D+/$-\infty$/$+\infty$`
- Limite gauche `+inf`, limite droite `-inf` : `+D-/$+\infty$/$-\infty$`

## Utilisation

### Dans un generateur

```typescript
import { generateVariationTableLatex } from '$lib/ubumark/generators/variation-table-latex';

const latexCode = generateVariationTableLatex(variationNode, {
	lineHeight: 2.5,
	columnSpacing: 2
});
```

### Integration avec le generateur LaTeX principal

Dans `latex-generator.ts` :

```typescript
import { generateVariationTableLatex } from './variation-table-latex';

function generateNode(node: ASTNode): string {
	switch (node.type) {
		case 'variation-table':
			return generateVariationTableLatex(node);
		// ...
	}
}
```

## Dependances LaTeX

Le document LaTeX doit inclure :

```latex
\usepackage{tikz}
\usepackage{tkz-tab}
```

## Gestion des erreurs

```typescript
// Tableau sans lignes
generateVariationTableLatex({ rows: [], ... })
// -> "% Error: Variation table has no rows"

// Tableau sans domaine
generateVariationTableLatex({ domain: [], ... })
// -> "% Error: Variation table has no domain points"
```

## Tests

```bash
pnpm test:server src/lib/ubumark/__tests__/generators/variation-table-latex.test.ts
```

**Couverture** :

- Structure de base (tikzpicture, tkzTabInit)
- Generation de l'en-tete
- Generation du domaine
- Options personnalisees
- Lignes de signe avec marqueurs
- Lignes de variation avec positions
- Asymptotes avec limites
- Gestion des erreurs

## Reference tkz-tab

### Commandes principales

| Commande                               | Description           |
| -------------------------------------- | --------------------- |
| `\tkzTabInit[options]{header}{domain}` | Initialise le tableau |
| `\tkzTabLine{values}`                  | Ligne de signe        |
| `\tkzTabVar{values}`                   | Ligne de variation    |

### Marqueurs de signe

| Symbole  | Description               |
| -------- | ------------------------- | --- | ------------------- |
| `+`, `-` | Signe positif/negatif     |
| `z`      | Zero                      |
| `        |                           | `   | Asymptote verticale |
| `h`      | Zone interdite (hachures) |
| `t`      | Discontinuite             |

### Directions de variation

| Symbole          | Description                      |
| ---------------- | -------------------------------- |
| `+/val`          | Valeur en position haute         |
| `-/val`          | Valeur en position basse         |
| `-D+/left/right` | Asymptote avec limites (monte)   |
| `+D-/left/right` | Asymptote avec limites (descend) |
