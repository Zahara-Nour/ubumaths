# Spreadsheet Types & AST - Progress Document

**Created:** 2025-12-04
**Status:** ✅ Complete
**Branch:** migration/questions

## Objectif

Créer les types TypeScript et définitions AST pour le module spreadsheet d'UbuMaths (tableur 20x20 avec formules, formatage et persistance).

## Fichiers Créés

### 1. `src/lib/spreadsheet/types.ts` ✅

Types principaux pour le spreadsheet :

- **CellData** : données d'une cellule (valeur + format optionnel)
- **CellFormat** : formatage visuel (bold, italic, colors, align, numberFormat)
- **ComputedValue** : résultat d'évaluation (discriminated union)
- **ErrorCode** : codes d'erreur standard (`#REF!`, `#DIV/0!`, `#VALUE!`, etc.)
- **CellRef** : référence de cellule parsée (col, row)
- **CellRange** : plage de cellules (start, end)
- **SpreadsheetData** : structure complète pour persistance
- **SpreadsheetMetadata** : métadonnées (name, rows, cols, description)

**Constantes exportées :**

- `MAX_ROWS = 20`
- `MAX_COLS = 20`
- `MAX_CELL_VALUE_LENGTH = 5000`
- `SPREADSHEET_VERSION = 1`

**Schemas Zod exportés :**

- `cellFormatSchema`
- `cellDataSchema`
- `cellRefStringSchema` (validation "A1"-"T20")
- `rangeRefStringSchema` (validation "A1:B10")
- `spreadsheetMetadataSchema`
- `spreadsheetDataSchema`

### 2. `src/lib/spreadsheet/parser/ast.ts` ✅

AST pour le parser de formules (indépendant de MathAST) :

**Noeuds Littéraux :**

- `NumberNode` : 42, 3.14
- `StringNode` : "Hello"
- `BooleanNode` : TRUE, FALSE

**Noeuds de Références :**

- `CellRefNode` : A1, B2 (avec col/row parsés)
- `RangeRefNode` : A1:B10 (avec start/end CellRefNode)

**Noeuds d'Opérations :**

- `BinaryOpNode` : +, -, \*, /, ^
- `UnaryOpNode` : -, +
- `ComparisonNode` : =, <>, <, >, <=, >=

**Noeuds de Fonctions :**

- `FunctionCallNode` : SOMME(A1:A10), MOYENNE(A1,A2,A3)
  - Le nom est normalisé en uppercase et converti FR→EN

**Type Guards exportés :**

- `isNumberNode`, `isStringNode`, `isBooleanNode`
- `isCellRefNode`, `isRangeRefNode`
- `isBinaryOpNode`, `isUnaryOpNode`
- `isFunctionCallNode`, `isComparisonNode`

**Types Utilitaires :**

- `ParseError` : { message, position, token? }
- `ParseResult` : success avec AST ou error

### 3. `src/lib/spreadsheet/cell-reference.ts` ✅

Utilitaires pour manipulation de références de cellules :

**Regex Patterns :**

- `CELL_REF_PATTERN` : `/^[A-Z]{1,2}[1-9][0-9]?$/`
- `RANGE_PATTERN` : `/^[A-Z]{1,2}[1-9][0-9]?:[A-Z]{1,2}[1-9][0-9]?$/`

**Conversion Colonne ↔ Lettre :**

- `colToLetter(col: number): string` : 0→"A", 19→"T"
- `letterToCol(letter: string): number` : "A"→0, "T"→19

**Parsing :**

- `parseCellRef(ref: string): CellRef | null` : "A1"→{col:0, row:0}
- `parseRange(range: string): CellRange | null` : "A1:B10"→{start, end}

**Formatage :**

- `formatCellRef(ref: CellRef): string` : {col:0, row:0}→"A1"
- `formatRange(range: CellRange): string` : {start, end}→"A1:B10"

**Validation :**

- `isValidCellRef(ref: CellRef, maxRows?, maxCols?): boolean`
- `isValidRange(range: CellRange, maxRows?, maxCols?): boolean`

**Expansion de Plages :**

- `expandRange(range: CellRange): CellRef[]` : convertit A1:B2 en [A1, B1, A2, B2]
- `getRangeSize(range: CellRange): number` : compte les cellules
- `isCellInRange(cell: CellRef, range: CellRange): boolean`

**Utilitaires de Validation :**

- `isCellRefString(str: string): boolean`
- `isRangeString(str: string): boolean`

### 4. `src/lib/spreadsheet/index.ts` ✅

Point d'entrée principal qui ré-exporte tous les types, schemas et utilitaires.

### 5. `src/lib/spreadsheet/__tests__/types-import.test.ts` ✅

Tests complets validant :

- ✅ Exports corrects des constantes
- ✅ Exports corrects des schemas Zod
- ✅ Validation avec `cellFormatSchema`
- ✅ Validation avec `cellDataSchema`
- ✅ Exports des opérateurs AST
- ✅ Type guards AST
- ✅ Regex patterns
- ✅ Conversion colonne ↔ lettre
- ✅ Parsing de références
- ✅ Formatage de références
- ✅ Validation de références
- ✅ Expansion de plages

**Résultat :** 14/14 tests passent ✅

### 6. `src/lib/spreadsheet/README.md` ✅

Documentation complète du module avec exemples d'usage.

## Décisions de Design

### Grille 20x20

- Colonnes : A-T (indices 0-19)
- Lignes : 1-20 (indices 0-19)
- `MAX_ROWS = 20`, `MAX_COLS = 20`

### Formules Bilingues (FR + EN)

- Parser accepte SOMME et SUM
- Parser accepte MOYENNE et AVERAGE
- Normalisation interne en anglais (uppercase)

### Parser Dédié (non MathAST)

- AST séparé de MathAST pour éviter les dépendances
- Parser simple adapté au contexte spreadsheet
- Support des ranges (A1:B10) natif

### Validation Zod Complète

- Tous les inputs validés avec Zod
- Schemas exportés pour réutilisation
- Messages d'erreur en anglais (standards Zod)

### Storage Sparse

- `SpreadsheetData.cells` est un `Record<string, CellData>`
- Seules les cellules non-vides sont stockées
- Clé = référence de cellule ("A1", "B2", etc.)

### ComputedValue comme Discriminated Union

- Type-safe avec TypeScript
- Pattern matching facile avec `type` field
- Support des 5 types : number, string, boolean, error, empty

## TypeScript Check

✅ Tous les nouveaux fichiers compilent sans erreur :

```bash
pnpm exec tsc --noEmit src/lib/spreadsheet/index.ts
# No errors
```

✅ Les erreurs existantes du projet (constructions, mathAST, documents) ne sont pas affectées.

## Tests

```bash
pnpm test:server src/lib/spreadsheet/__tests__/types-import.test.ts
# ✓ 14 tests passed
```

## Prochaines Étapes

Les types et l'AST sont prêts. Les prochaines étapes pour compléter le module spreadsheet :

1. **Parser** (`src/lib/spreadsheet/parser/parse.ts`)

   - Lexer pour tokenization
   - Parser pour construire l'AST
   - Support FR + EN pour fonctions
   - Gestion des erreurs avec position

2. **Evaluator** (`src/lib/spreadsheet/eval.ts`)

   - Évaluation des formules
   - Détection de références circulaires
   - Gestion des plages dans les fonctions
   - Error handling (#REF!, #DIV/0!, etc.)

3. **Functions Library** (`src/lib/spreadsheet/functions.ts`)

   - SOMME/SUM, MOYENNE/AVERAGE
   - MIN, MAX, COUNT, COUNTA
   - SI/IF, ET/AND, OU/OR
   - Extensions futures

4. **Spreadsheet Store** (`src/lib/spreadsheet/store.svelte.ts`)

   - State management Svelte 5
   - Réactivité sur changements de cellules
   - Persistence localStorage
   - Undo/Redo

5. **UI Components**

   - SpreadsheetGrid.svelte (grid 20x20)
   - CellEditor.svelte (edit formulas)
   - FormatToolbar.svelte (bold, colors, etc.)
   - FormulaBar.svelte (display/edit active cell)

6. **Database Integration**
   - Migration Supabase
   - API endpoints
   - Sharing & collaboration
   - Version history

## Notes Techniques

### Pattern de Référence Cellule

- Regex: `/^[A-Z]{1,2}[1-9][0-9]?$/`
- Accepte A1-T20 (20 colonnes, 20 lignes)
- Ne pas accepter A0, 0A, ou références invalides

### Hex Color Validation

- Pattern: `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`
- Accepte #RGB et #RRGGBB
- Utilisé pour textColor et bgColor

### Cell Value Max Length

- 5000 caractères max
- Permet formules complexes
- Prévient abus storage

## Fichiers de Référence Utilisés

- `/Users/david/Coding/js/ubumaths/src/lib/grapheur/types.ts`
  - Pattern pour types avec Zod schemas
  - Documentation style
  - Structure des exports

## Standards Respectés

✅ TypeScript strict (zéro `any`)
✅ Types explicites pour tous les exports
✅ Named exports (pas de default)
✅ Comments en anglais
✅ Readonly pour immutabilité
✅ Discriminated unions pour ComputedValue
✅ Type guards avec prédicat de type
✅ Zod schemas avec messages d'erreur clairs
✅ Constants en SCREAMING_SNAKE_CASE
✅ Tests complets avec coverage des cas limites

## Commande de Validation Finale

```bash
# Type check
pnpm check:fast  # ✅ 0 errors dans spreadsheet files

# Tests
pnpm test:server src/lib/spreadsheet/__tests__/types-import.test.ts
# ✅ 14/14 tests passed
```

---

**Status:** ✅ Types et AST complets et testés
**Next:** Parser implementation
