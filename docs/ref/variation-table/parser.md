# Parser des Tableaux de Variation

Documentation du parser pour les blocs `variation`.

**Fichier source** : `src/lib/ubumark/parser/variation-table-parser.ts`

## Vue d'ensemble

Le parser analyse les blocs de code markdown avec le langage `variation` et produit un noeud AST `VariationTableNode`.

## Fonctions principales

### isVariationBlockStart

Detecte le debut d'un bloc variation.

````typescript
function isVariationBlockStart(line: string): boolean;

// Exemples
isVariationBlockStart('```variation'); // true
isVariationBlockStart('```typescript'); // false
isVariationBlockStart('```variation  '); // true (espaces ignores)
````

### isBlockEnd

Detecte la fin d'un bloc de code.

````typescript
function isBlockEnd(line: string): boolean;

// Exemples
isBlockEnd('```'); // true
isBlockEnd('```  '); // true (espaces ignores)
isBlockEnd('``` js'); // false
````

### findVariationBlocks

Trouve tous les blocs variation dans un document.

```typescript
interface VariationBlockRange {
	startIndex: number;
	endIndex: number;
}

function findVariationBlocks(lines: string[]): VariationBlockRange[];
```

**Exemple** :

````typescript
const lines = [
	'Some text',
	'```variation',
	'variable: x',
	'domain: -inf, +inf',
	'```',
	'More text'
];

const blocks = findVariationBlocks(lines);
// Retourne: [{ startIndex: 1, endIndex: 4 }]
````

### parseVariationTable

Parse un bloc variation complet.

```typescript
function parseVariationTable(
	lines: string[],
	startIndex: number,
	endIndex: number
): VariationTableParseResult;
```

**Parametres** :

- `lines` : Toutes les lignes du document
- `startIndex` : Index de la ligne ` ```variation `
- `endIndex` : Index de la ligne ` ``` ` fermante

**Retour** :

```typescript
interface VariationTableParseResult {
	node: VariationTableNode | null; // null si erreurs critiques
	errors: VariationTableParseError[];
}
```

### parseVariationTableContent

Parse le contenu interne (sans les delimiteurs).

```typescript
function parseVariationTableContent(lines: string[]): VariationTableParseResult;

// Exemple
const content = [
	'variable: x',
	'domain: -inf, 0, +inf',
	'',
	'sign: f(x)',
	'  -inf,0: +',
	'  0: z',
	'  0,+inf: -'
];

const result = parseVariationTableContent(content);
```

## Processus de parsing

### 1. Detection des blocs

Le parser markdown principal (`markdown-parser.ts`) detecte les blocs variation avec une priorite elevee (PRIORITY 1a), avant les blocs de code reguliers.

```typescript
// Dans markdown-parser.ts
const variationBlocks = findVariationBlocks(originalLines);
```

### 2. Parsing du contenu

Le contenu est parse ligne par ligne :

1. **Variable** : Ligne `variable: nom`
2. **Domaine** : Ligne `domain: points`
3. **Lignes de signe** : `sign: label` + entrees indentees
4. **Lignes de variation** : `variation: label` + entrees indentees

### 3. Parsing du domaine

Deux formats supportes :

```typescript
// Format simple
parseDomainContent('-inf, -1, 0, 1, +inf');
// -> [{ expression: '-inf' }, { expression: '-1' }, ...]

// Format avec bornes
parseDomainContent(']-inf, 0[, ]0, +inf[');
// -> [{ expression: '-inf', open: true }, { expression: '0', open: true }, ...]
```

### 4. Parsing des valeurs de signe

```typescript
const SIGN_SYMBOL_MAP = {
	'+': { type: 'sign', value: '+' },
	'-': { type: 'sign', value: '-' },
	z: { type: 'marker', marker: 'zero' },
	'0': { type: 'marker', marker: 'zero' },
	'||': { type: 'marker', marker: 'asymptote' },
	'|h|': { type: 'marker', marker: 'forbidden' },
	d: { type: 'marker', marker: 'discontinuity' }
};
```

### 5. Parsing des valeurs de variation

Format : `expression, position` ou `||, limite_gauche, limite_droite`

```typescript
// Valeur simple
parseVariationValue(['3', 'top']);
// -> { expression: '3', position: 'top' }

// Asymptote avec limites
parseVariationValue(['||', '-inf', '+inf']);
// -> { expression: '', position: 'center', marker: 'asymptote', limits: ['-inf', '+inf'] }
```

## Gestion des erreurs

Le parser accumule les erreurs sans s'arreter :

```typescript
interface VariationTableParseError {
	message: string;
	line?: number; // Numero de ligne (1-indexed)
	content?: string; // Contenu de la ligne
}
```

**Erreurs critiques** (retournent `node: null`) :

- Variable manquante
- Domaine manquant

**Erreurs non-critiques** :

- Format de ligne invalide
- Valeur de signe non reconnue
- Position invalide

## Regex utilisees

````typescript
// Debut de bloc
const VARIATION_BLOCK_START_REGEX = /^```variation\s*$/;

// Fin de bloc
const BLOCK_END_REGEX = /^```\s*$/;

// Variable
const VARIABLE_REGEX = /^\s*variable\s*:\s*(.+?)\s*$/;

// Domaine
const DOMAIN_REGEX = /^\s*domain\s*:\s*(.+?)\s*$/;

// En-tete de ligne de signe
const SIGN_HEADER_REGEX = /^\s*sign\s*:\s*(.+?)\s*$/;

// En-tete de ligne de variation
const VARIATION_HEADER_REGEX = /^\s*variation\s*:\s*(.+?)\s*$/;

// Entree de ligne (2+ espaces d'indentation)
const ROW_ENTRY_REGEX = /^\s{2,}(.+?)\s*:\s*(.+?)\s*$/;
````

## Integration avec le parser principal

Dans `markdown-parser.ts` :

```typescript
import { findVariationBlocks, parseVariationTable } from './variation-table-parser';

// Detection prioritaire des blocs variation
const variationBlocks = findVariationBlocks(originalLines);

// Pour chaque bloc trouve
for (const { startIndex, endIndex } of variationBlocks) {
	const result = parseVariationTable(originalLines, startIndex, endIndex);
	if (result.node) {
		blocks.push(result.node);
	}
}
```

## Fonctions utilitaires exportees

```typescript
// Verifie si le tableau a des lignes de signe
function hasSignRows(node: VariationTableNode): boolean;

// Verifie si le tableau a des lignes de variation
function hasVariationRows(node: VariationTableNode): boolean;

// Recupere toutes les lignes de signe
function getSignRows(node: VariationTableNode): SignRow[];

// Recupere toutes les lignes de variation
function getVariationRows(node: VariationTableNode): VariationRow[];

// Compte les points du domaine
function getDomainPointCount(node: VariationTableNode): number;
```

## Tests

```bash
# Tests du parser
pnpm test:server src/lib/ubumark/__tests__/parser/variation-table-parser.test.ts

# Tests d'integration
pnpm test:server src/lib/ubumark/__tests__/parser/variation-table-integration.test.ts
```

**Couverture des tests** :

- Detection de blocs (debut, fin, multiples, non fermes)
- Parsing de variables et domaines
- Parsing de lignes de signe avec tous les marqueurs
- Parsing de lignes de variation avec positions
- Asymptotes avec limites
- Gestion des erreurs
