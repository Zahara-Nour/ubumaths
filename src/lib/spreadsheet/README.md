# Spreadsheet Module

Module pour le tableur 20x20 avec formules, formatage et persistance.

## Structure

```
spreadsheet/
├── types.ts                 # Types principaux (CellData, SpreadsheetData, etc.)
├── cell-reference.ts        # Utilitaires pour references de cellules
├── store.svelte.ts          # Store Svelte 5 avec runes
├── dependency-graph.ts      # Graphe de dependances des formules
├── format.ts                # Formatage des valeurs
├── csv.ts                   # Import/Export CSV
├── parser/
│   ├── ast.ts               # AST pour le parser de formules
│   ├── lexer.ts             # Tokenizer
│   ├── parser.ts            # Parser recursive descent
│   └── evaluator.ts         # Evaluation des formules
├── functions/
│   ├── index.ts             # Registre des fonctions
│   ├── math.ts              # SOMME, MOYENNE, MIN, MAX, etc.
│   ├── logic.ts             # SI, ET, OU, NON, etc.
│   ├── text.ts              # CONCAT, GAUCHE, DROITE, etc.
│   └── aliases.ts           # Alias francais/anglais
└── __tests__/               # 415 tests
```

## Usage

### Composant Svelte

```svelte
<script>
	import Spreadsheet from '$lib/components/spreadsheet/Spreadsheet.svelte';
</script>

<Spreadsheet />
```

### Store

```typescript
import { spreadsheetStore } from '$lib/spreadsheet/store.svelte';

// Gestion des cellules
spreadsheetStore.setCellValue('A1', '=SOMME(B1:B10)');
spreadsheetStore.getCellValue('A1'); // "=SOMME(B1:B10)"
spreadsheetStore.getComputedValue('A1'); // { type: 'number', value: 55 }

// Formatage
spreadsheetStore.setCellFormat('A1', { bold: true, textColor: '#ff0000' });

// Navigation
spreadsheetStore.selectCell('B2');
spreadsheetStore.navigate('right'); // -> C2

// Persistance
const data = spreadsheetStore.exportData();
spreadsheetStore.importData(loadedData);
```

## Types Principaux

### `CellData`

Donnees d'une cellule avec valeur et formatage optionnel.

```typescript
interface CellData {
	value: string; // "42" ou "=A1+B1"
	format?: CellFormat;
}
```

### `CellFormat`

Formatage visuel d'une cellule.

```typescript
interface CellFormat {
	bold?: boolean;
	italic?: boolean;
	textColor?: string; // hex: #ff0000
	bgColor?: string;
	align?: 'left' | 'center' | 'right';
	numberFormat?: 'number' | 'percent' | 'currency';
}
```

### `ComputedValue`

Resultat d'evaluation d'une cellule (discriminated union).

```typescript
type ComputedValue =
	| { type: 'number'; value: number }
	| { type: 'string'; value: string }
	| { type: 'boolean'; value: boolean }
	| { type: 'error'; code: ErrorCode; message: string }
	| { type: 'empty' };
```

### `ErrorCode`

Codes d'erreur standard des tableurs.

```typescript
type ErrorCode = '#REF!' | '#DIV/0!' | '#VALUE!' | '#NAME?' | '#CIRC!' | '#NUM!';
```

## Fonctions Supportees

### Mathematiques

| Francais          | Anglais     | Description          |
| ----------------- | ----------- | -------------------- |
| SOMME             | SUM         | Somme des valeurs    |
| MOYENNE           | AVERAGE     | Moyenne              |
| MIN               | MIN         | Minimum              |
| MAX               | MAX         | Maximum              |
| NB                | COUNT       | Compte les nombres   |
| ABS               | ABS         | Valeur absolue       |
| ARRONDI           | ROUND       | Arrondi              |
| ENT               | INT         | Partie entiere       |
| TRONQUE           | TRUNC       | Troncature           |
| MOD               | MOD         | Reste de la division |
| PUISSANCE         | POWER       | Puissance            |
| RACINE            | SQRT        | Racine carree        |
| LOG               | LOG         | Logarithme           |
| LOG10             | LOG10       | Logarithme base 10   |
| LN                | LN          | Logarithme naturel   |
| EXP               | EXP         | Exponentielle        |
| SIN/COS/TAN       | SIN/COS/TAN | Trigonometrie        |
| PI                | PI          | Constante Pi         |
| ALEA              | RAND        | Nombre aleatoire 0-1 |
| ALEA.ENTRE.BORNES | RANDBETWEEN | Entier aleatoire     |

### Logique

| Francais  | Anglais  | Description       |
| --------- | -------- | ----------------- |
| SI        | IF       | Condition         |
| ET        | AND      | ET logique        |
| OU        | OR       | OU logique        |
| NON       | NOT      | Negation          |
| OUX       | XOR      | OU exclusif       |
| SIERREUR  | IFERROR  | Valeur si erreur  |
| ESTERREUR | ISERROR  | Test d'erreur     |
| ESTVIDE   | ISBLANK  | Test cellule vide |
| ESTNUM    | ISNUMBER | Test nombre       |
| ESTTEXTE  | ISTEXT   | Test texte        |
| VRAI      | TRUE     | Constante vraie   |
| FAUX      | FALSE    | Constante fausse  |

### Texte

| Francais    | Anglais    | Description                |
| ----------- | ---------- | -------------------------- |
| CONCATENER  | CONCAT     | Concatenation              |
| GAUCHE      | LEFT       | Caracteres a gauche        |
| DROITE      | RIGHT      | Caracteres a droite        |
| STXT        | MID        | Sous-chaine                |
| NBCAR       | LEN        | Longueur                   |
| MAJUSCULE   | UPPER      | Majuscules                 |
| MINUSCULE   | LOWER      | Minuscules                 |
| NOMPROPRE   | PROPER     | Premiere lettre majuscule  |
| SUPPRESPACE | TRIM       | Supprime espaces           |
| TROUVE      | FIND       | Recherche sensible casse   |
| CHERCHE     | SEARCH     | Recherche insensible casse |
| SUBSTITUE   | SUBSTITUTE | Remplacement               |
| REMPLACER   | REPLACE    | Remplacement par position  |
| TEXTE       | TEXT       | Conversion en texte        |
| REPT        | REPT       | Repetition                 |

## Operateurs

- Arithmetiques: `+`, `-`, `*`, `/`, `^` (puissance)
- Comparaison: `=`, `<>`, `<`, `>`, `<=`, `>=`
- Unaires: `-A1` (negation), `+A1`

## Import/Export CSV

```typescript
import { parseCsv, generateCsv, downloadCsv, readCsvFile } from '$lib/spreadsheet/csv';

// Import
const file = inputElement.files[0];
const content = await readCsvFile(file);
const result = parseCsv(content, {
	delimiter: 'auto', // ou ',', ';', '\t'
	hasHeaders: false,
	skipEmptyRows: true
});

if (result.success) {
	spreadsheetStore.importData(result.data);
}

// Export
downloadCsv(spreadsheetStore.exportData(), computedValues, 'fichier.csv', {
	delimiter: ';', // Pour Excel francais
	exportFormulas: false,
	encoding: 'utf-8-bom' // Pour Excel
});
```

## Utilitaires pour References de Cellules

### Conversion Colonne ↔ Lettre

```typescript
colToLetter(0); // → "A"
colToLetter(19); // → "T"
letterToCol('A'); // → 0
letterToCol('T'); // → 19
```

### Parsing

```typescript
parseCellRef('A1'); // → { col: 0, row: 0 }
parseRange('A1:B10'); // → { start: {...}, end: {...} }
```

### Formatage

```typescript
formatCellRef({ col: 0, row: 0 }); // → "A1"
formatRange(range); // → "A1:B10"
```

### Validation

```typescript
isValidCellRef({ col: 0, row: 0 }); // → true
isValidCellRef({ col: 20, row: 0 }); // → false (MAX_COLS = 20)
```

### Expansion de Plages

```typescript
expandRange({ start: { col: 0, row: 0 }, end: { col: 1, row: 1 } });
// → [
//     { col: 0, row: 0 },  // A1
//     { col: 1, row: 0 },  // B1
//     { col: 0, row: 1 },  // A2
//     { col: 1, row: 1 }   // B2
//   ]
```

## Raccourcis Clavier

| Raccourci        | Action                        |
| ---------------- | ----------------------------- |
| Fleches          | Navigation                    |
| Enter            | Editer / Valider et descendre |
| Tab              | Valider et aller a droite     |
| Shift+Tab        | Valider et aller a gauche     |
| Escape           | Annuler edition               |
| F2               | Commencer edition             |
| Delete/Backspace | Effacer cellule               |
| Ctrl/Cmd+B       | Gras                          |
| Ctrl/Cmd+I       | Italique                      |

## Contraintes

- **20x20 grid** : colonnes A-T (0-19), lignes 1-20
- **Formules FR + EN** : SOMME/SUM, MOYENNE/AVERAGE
- **Parser dedie** : separe de MathAST
- **Validation Zod** : tous les schemas exportes

## Tests

```bash
# Tous les tests du spreadsheet
pnpm test:server src/lib/spreadsheet

# Tests specifiques
pnpm test:server src/lib/spreadsheet/__tests__/csv.test.ts
pnpm test:server src/lib/spreadsheet/__tests__/parser.test.ts
pnpm test:server src/lib/spreadsheet/__tests__/functions.test.ts
```

## API REST

### Liste des tableurs

```
GET /api/spreadsheets
Response: { spreadsheets: [...] }
```

### Creer un tableur

```
POST /api/spreadsheets
Body: { name: string }
Response: { spreadsheet: {...} }
```

### Recuperer un tableur

```
GET /api/spreadsheets/:id
Response: { spreadsheet: {...} }
```

### Mettre a jour

```
PUT /api/spreadsheets/:id
Body: { name?, data? }
Response: { spreadsheet: {...} }
```

### Supprimer

```
DELETE /api/spreadsheets/:id
Response: { success: true }
```
