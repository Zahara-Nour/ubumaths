# Tableaux de Variation - Guide Technique

Documentation technique pour le systeme de tableaux de variation (sign and variation tables).

## Vue d'ensemble

Les tableaux de variation sont utilises en analyse mathematique pour visualiser le signe et les variations d'une fonction. L'implementation supporte :

- **Lignes de signe** : Affichent le signe (+/-) d'une fonction sur des intervalles
- **Lignes de variation** : Affichent les valeurs de la fonction avec fleches de croissance/decroissance
- **Marqueurs speciaux** : Zero, asymptotes, zones interdites, discontinuites
- **Export multi-format** : HTML (Svelte), LaTeX (tkz-tab), Typst (vartable)

## Architecture

````
src/lib/ubumark/
├── types/
│   └── variation-table.ts          # Definitions de types TypeScript
├── parser/
│   └── variation-table-parser.ts   # Parser des blocs ```variation
├── generators/
│   ├── variation-table-latex.ts    # Export LaTeX (tkz-tab)
│   └── variation-table-typst.ts    # Export Typst (vartable)
└── __tests__/
    ├── parser/
    │   ├── variation-table-parser.test.ts
    │   └── variation-table-integration.test.ts
    └── generators/
        ├── variation-table-latex.test.ts
        └── variation-table-typst.test.ts

src/lib/components/markdown/nodes/
└── VariationTable.svelte           # Composant de rendu HTML
````

## Documentation

| Document                          | Description                    |
| --------------------------------- | ------------------------------ |
| [Syntaxe](./syntax.md)            | Syntaxe markdown complete      |
| [Types](./types.md)               | Reference des types TypeScript |
| [Parser](./parser.md)             | Fonctionnement du parser       |
| [Rendu HTML](./rendering.md)      | Composant Svelte               |
| [Export LaTeX](./latex-export.md) | Generation tkz-tab             |
| [Export Typst](./typst-export.md) | Generation vartable            |

## Exemple rapide

````markdown
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
```
````

````

## Fichiers source

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `types/variation-table.ts` | 234 | Types AST complets |
| `parser/variation-table-parser.ts` | 746 | Parser avec validation |
| `generators/variation-table-latex.ts` | 480 | Export LaTeX |
| `generators/variation-table-typst.ts` | 383 | Export Typst |
| `VariationTable.svelte` | 673 | Rendu HTML/CSS |

## Tests

```bash
# Parser
pnpm test:server src/lib/ubumark/__tests__/parser/variation-table-parser.test.ts

# Integration
pnpm test:server src/lib/ubumark/__tests__/parser/variation-table-integration.test.ts

# Generateurs
pnpm test:server src/lib/ubumark/__tests__/generators/variation-table-latex.test.ts
pnpm test:server src/lib/ubumark/__tests__/generators/variation-table-typst.test.ts

# Composant Svelte
pnpm test:client src/lib/components/markdown/__tests__/VariationTable.svelte.test.ts
````
