# French Decimal Formatting in Typst

Documentation for displaying French-formatted numbers in Typst-generated PDFs.

## Overview

French number notation uses:

- **Comma** as decimal separator: `3,14` (not `3.14`)
- **Thin spaces** for digit grouping: `1 234 567` (not `1,234,567`)

## Conversion Flow

```
Source (Markdown)  →  LaTeX (intermediate)  →  Typst (final)  →  PDF
     3.14          →      3{,}14            →    3","14       →  3,14
     1234          →      1\,234            →    1 thin 234   →  1 234
```

### Step-by-step

1. **Source**: Author writes math in markdown using either syntax:
   - LaTeX syntax: `$3.14$` or `$$3.14$$`
   - Custom syntax: `~3.14~` or `~~3.14~~`
2. **LaTeX conversion** (`french-math.ts`):
   - Decimal point → `{,}` (LaTeX grouped comma)
   - Thin spaces → `\,` (LaTeX thin space)
3. **Typst conversion** (`typst-generator.ts`):
   - `{,}` → `","` (Typst string for literal comma)
   - `\,` → `thin` (Typst thin space keyword)
4. **PDF output**: Displays `3,14` with proper formatting

## Why Use `","` (String) for Decimal Comma

In Typst math mode, a bare comma is treated as an **argument separator** with automatic spacing:

```typst
// Bare comma = separator (adds space)
$frac(1, 2)$    // → displays as "½" (comma separates arguments)
$(a, b, c)$     // → displays as "(a, b, c)" with spaces after commas

// String comma = literal (no extra space)
$3","14$        // → displays as "3,14" (comma is literal)
```

If we used a bare comma for decimals, Typst would add unwanted spacing around it.

## Implementation Files

| File                                              | Role                                              |
| ------------------------------------------------- | ------------------------------------------------- |
| `src/lib/utils/french-math.ts`                    | Converts numbers to French LaTeX notation         |
| `src/lib/components/markdown/utils/math-utils.ts` | Applies French formatting via `toFrenchDecimal()` |
| `src/lib/ubumark/generators/typst-generator.ts`   | Converts French LaTeX to Typst syntax             |

## Typst Syntax Reference

### Thin Space (`thin`)

```typst
$1 thin 234 thin 567$  // → 1 234 567 (thin spaces between groups)
```

### String for Literal Comma

```typst
$3","14$  // → 3,14 (no separator spacing)
```

### In Fractions

```typst
$frac(3","14, 2)$  // → (3,14)/2 - comma is literal, not separator
```

## Example Test File

Create a test file to verify formatting:

```typst
// test-french-decimals.typ
#set page(paper: "a4", margin: 2cm)
#set text(font: "New Computer Modern", size: 11pt, lang: "fr")

= Test des nombres décimaux français

== Nombres décimaux
- Pi : $3","14159$ (attendu: 3,14159)
- Demi : $0","5$ (attendu: 0,5)

== Avec espaces fines
- Grand entier : $1 thin 234 thin 567$ (attendu: 1 234 567)
- Décimal complet : $1 thin 234","567 thin 8$ (attendu: 1 234,567 8)

== Séparateurs d'arguments (doivent avoir des espaces)
- Coordonnées : $(a, b, c)$ -- virgule normale = espacement

== Dans les fractions
- $frac(1","5, 2) = 0","75$
```

Compile with:

```bash
typst compile test-french-decimals.typ
```

## References

- [Typst GitHub Issue #5272](https://github.com/typst/typst/issues/5272) - Comma as decimal separator discussion
- [Typst Documentation - Math Mode](https://typst.app/docs/reference/math/)
