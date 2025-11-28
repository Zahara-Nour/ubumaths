# Migration Syntaxe Modifiers - COMPLETE

**Date**: 2025-11-28
**Status**: Terminee

## Resume

Migration reussie du separateur de modifiers de `|` vers `;` pour eval et random.

## Changements effectues

### 1. Eval Parser (Phase 1)

- Separateur: `|` → `;`
- Exemple: `{{eval:a+b|d}}` → `{{eval:a+b;d}}`
- Avantage: Plus de conflit avec LaTeX `|x|`

### 2. Random Parser (Phase 2)

- Syntaxe relative: prefixe `{{±2..9}}` → suffixe `{{2..9;±}}`
- Alias ASCII: `{{2..9;+-}}`
- Ordre parsing: `baseSpec;modifier!exclusions`

### 3. Syntax Converter (Phase 3)

- Legacy `$er[2;9]` → `{{2..9;±}}`

### 4. Documentation (Phase 4)

- docs/ref/markdown.md
- docs/architecture/parameterization-system.md
- docs/features/exercises/parameterization-guide.md
- docs/wip/question-migration-analysis.md

## Commits

1. `5b6ba314` - refactor(eval-parser): change modifier separator from | to ;
2. `156fb581` - refactor(random-parser): change relative integer from ±prefix to ;± suffix modifier
3. `e6631a80` - docs: update syntax documentation for ; modifier separator

## Tests

- Eval parser: 51/51
- Random parser: 70/70
- Syntax converter: 118/118
- Integration: 35/35
- Total parameterization: 376/376

## Nouvelle syntaxe

```
# Eval modifiers
{{eval:a+b;d}}      → decimal
{{eval:5;+}}        → +5
{{eval:-3;()}}      → (-3)
{{eval:a+b;d,+}}    → combined

# Relative integers
{{2..9;±}}          → {-9..-2} ∪ {2..9}
{{2..9;+-}}         → ASCII alias
{{2..9;±!5}}        → exclut 5
{{2..9;±!5,-5}}     → exclut 5 et -5
```
