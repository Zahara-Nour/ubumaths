# Notebook PDF export — progression

> Plan validé le 2026-06-04, exécution auto-mode (CLAUDE.md auto-mode-progress-docs).

## Décisions techniques

1. **HTML output (pandas)** → fallback `text/plain`, mention « (HTML non rendu) » si rien d'utile
2. **Troncature outputs** → 50 lignes max, head/tail comme `foldOutput`
3. **Filename** → `{title_sanitized}_{YYYY-MM-DD}.pdf`
4. **MarkdownCell upgrade** → `MarkdownEditor` sans bucket upload, images URL OK gratuitement
5. **Defaults dialog** → dérivés `previewMode`, `includeHints` désactivé pour élèves (UI + générateur)

## Infrastructure réutilisée

- `BaseTypstGenerator` (`src/lib/typst/generators/base-generator.ts`)
- `generatePdfFromTypst` (`src/lib/typst/pdf-generator.ts`) — service init + fetch externals + compile + cleanup
- `parseMarkdown` + `generateTypst` (`$lib/ubumark`) — gère LaTeX `$..$`, `$$..$$`, custom `~..~`, `~~..~~`
- `escapeTypst` (`$lib/ubumark/generators`)
- `service.mapShadow(path, bytes)` pour images inline PNG base64
- `MarkdownEditor` (`$lib/components/markdown`)
- `MarkdownRenderer` (déjà utilisé par `MarkdownCell`)

## Phases

| Phase                                        | Statut   | Fichiers                                             | Tests     |
| -------------------------------------------- | -------- | ---------------------------------------------------- | --------- |
| 1 — NotebookGenerator core                   | ✅       | `notebook-generator.ts`                              | 37 vitest |
| 2 — Outputs + shadow FS images               | ✅       | idem + `extractInlineImages`                         | inclus    |
| 3 — Template + page de garde + escape        | ✅       | idem                                                 | inclus    |
| 4 — Dialog UI + bouton toolbar               | ✅       | `NotebookPdfDialog.svelte`, `NotebookToolbar.svelte` | manuel    |
| 5 — MarkdownCell upgrade vers MarkdownEditor | ✅       | `MarkdownCell.svelte`                                | manuel    |
| 6 — Code review global + fixes sécurité      | ✅       | code-reviewer agent                                  | —         |
| 7 — Commit + quality checks finaux           | en cours | —                                                    | —         |

## Code review — fixes appliqués

Le code-reviewer a relevé 3 issues critiques/importantes :

1. **Bracket injection** (CRITIQUE) — `escapeTypst` ne gère pas `[` `]`, donc un `]` dans un titre/hint/ename pouvait casser un bloc Typst `[...]` et émettre des directives arbitraires. Fix : remplacer par `escapeTypstBrackets` sur tous les sites interpolés à l'intérieur de `[...]` (cover, checkpoint title, hint, error ename/evalue, code cell label).
2. **Triple-backtick breakout** (IMPORTANT) — utilisation d'un fence ` ```python ... ``` ` cassable par triple-backticks dans la source. Fix : migration vers `#raw(block: true, lang: "python", "...")` avec `escapeRawTypst` (qui gère `\\` et `\"`).
3. **ANSI stripping** : le reviewer a flaggé le regex comme manquant `\x1b` mais c'est un faux positif (vérifié via `od -c` que le byte ESC 033 est bien présent dans la source).

Tests ajoutés pour les deux fixes critiques (`escapes \] in checkpoint title` + `contains a crafted backtick payload inside a Typst string literal`).

## Quality checks finaux

- `pnpm check:incremental` : 1638 fichiers, 9 ERRORS / 46 WARNINGS — **baseline maintenue**
- `npx eslint` sur 8 fichiers modifiés : OK après suppression d'un import inutilisé (`escapeTypst`)
- `svelte-autofixer` sur 3 .svelte : 0 issues, quelques suggestions $effect/derived non-actionables (sync ponctuel sur ouverture dialog + focus DOM)
- Tests : 58/58 verts (37 generator + 7 filename + 14 schema notebooks Zod)

## Comportements TDD validés

42 comportements listés dans la conversation. Tests vitest pour 1-24 (générateur), tests manuels pour 25-42 (UI).

## Fichiers attendus à la fin

```
src/lib/typst/generators/
  notebook-generator.ts       (nouveau)
  notebook-generator.test.ts  (nouveau)
  index.ts                    (export ajouté)

src/lib/components/notebook/
  NotebookPdfDialog.svelte    (nouveau)
  NotebookToolbar.svelte      (modifié — bouton PDF)
  MarkdownCell.svelte         (modifié — MarkdownEditor)
```
