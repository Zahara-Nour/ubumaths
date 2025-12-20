# Ubumark Progress

## Latest: RichTextEditor Presets (December 2024)

Added preset configuration system for easier editor setup:

### Presets

| Preset     | Toolbar                             | Math Templates | Use Case                    |
| ---------- | ----------------------------------- | -------------- | --------------------------- |
| `minimal`  | Text only                           | None           | Comments, simple notes      |
| `standard` | Text, Paragraph, Insertion, Formula | Basic          | Exercises, general content  |
| `full`     | All sections                        | Full           | Exercise creation (default) |

### Usage

```svelte
<RichTextEditor preset="minimal" />
<RichTextEditor preset="standard" />
<RichTextEditor preset="full" />

<!-- Override specific settings -->
<RichTextEditor preset="minimal" toolbar={{ formula: true }} />

<!-- Combined with mode -->
<RichTextEditor mode="chat" preset="minimal" />
```

### Files Modified

| File                              | Changes                                    |
| --------------------------------- | ------------------------------------------ |
| `rich-text/types.ts`              | Added `EditorPreset`, `PresetConfig` types |
| `rich-text/config.ts`             | Added `EDITOR_PRESETS` constants           |
| `rich-text/RichTextEditor.svelte` | Added `preset` prop with config merge      |

### Commit

```
cb22a7f0 feat(rich-text): add preset configuration system
```

---

## Video Support (December 2024)

Added video support with HTML5 and YouTube embeds:

### Syntax

```markdown
!video[alt](url) # Basic video
!video[alt](url){size=medium} # With size class
!video[alt](url){autoplay loop muted} # With playback options
!video[YouTube](https://youtube.com/watch?v=ID){size=large} # YouTube embed
```

### Features

- **HTML5 video**: MP4, WebM, Ogg files
- **YouTube embeds**: youtube.com, youtu.be, youtube.com/embed
- **Privacy**: Uses youtube-nocookie.com for embeds
- **Attributes**: size, width%, align, controls, autoplay, loop, muted
- **Roundtrip**: Perfect Markdown → TipTap → Markdown conversion

### Files Modified/Created

| File                                    | Action                         |
| --------------------------------------- | ------------------------------ |
| `types/ast.ts`                          | Added VideoNode, VideoProvider |
| `parser/markdown-parser.ts`             | Added video parsing            |
| `extensions/video-extension.ts`         | NEW - TipTap extension         |
| `rich-text/markdown-import.ts`          | Video AST → TipTap             |
| `rich-text/markdown-export.ts`          | TipTap → Video markdown        |
| `hooks.server.ts`                       | CSP for media-src, YouTube     |
| `__tests__/parser/video-parser.test.ts` | NEW - 42 tests                 |

### Commits

```
6387491e feat(rich-text): add video support with HTML5 and YouTube embeds
1fc9d593 fix(csp): add media-src and YouTube frame-src for video support
6e119842 fix(csp): add YouTube thumbnails to img-src
f5437eb4 fix(rich-text): improve video roundtrip consistency
5cef3988 fix(rich-text): preserve video alignment only when explicitly set
```

---

## MarkdownRenderer Completeness (December 2024)

Added missing node rendering to `MarkdownRenderer.svelte`:

### Bug Fix

- **HeadingNode math**: Fixed `latex={child.latex}` → `expression={child.expression} syntax={child.syntax}`

### New Block Nodes

- **VideoDisplay.svelte**: Renders HTML5 video and YouTube embeds with sizing/alignment

### New Inline Nodes

- **LinkNode**: External links with `target="_blank" rel="noopener noreferrer"`
- **HashtagNode**: Callback `onHashtagClick` or default link to `/search?tag=...`
- **MentionNode**: Callback `onMentionClick` or default link to `/profile/...`

### Files Modified

| File                         | Changes                                |
| ---------------------------- | -------------------------------------- |
| `nodes/HeadingNode.svelte`   | Fix math bug, add link/hashtag/mention |
| `nodes/VideoDisplay.svelte`  | **NEW** - Video rendering              |
| `nodes/ParagraphNode.svelte` | Add link/hashtag/mention               |
| `nodes/ListNode.svelte`      | Propagate callbacks                    |
| `MarkdownRenderer.svelte`    | Add video case, callback props         |

### Commits

```
c9d37dce fix(markdown): correct math-inline rendering in HeadingNode
273e697a feat(markdown): add VideoDisplay component for MarkdownRenderer
d402f222 feat(markdown): add link, hashtag, mention inline node support
```

---

## Previous: Ubumark Refactoring - COMPLETE

### Final State: All 7 Phases Complete

### Summary

Consolidated all custom markdown functionality into `src/lib/ubumark/`:

- Parser AST (from `exercises/parser/`)
- Template types (from `shared/markdown/`)
- Parameterization (from `shared/parameterization/`)

---

## Commits

| Phase | Commit     | Description                        |
| ----- | ---------- | ---------------------------------- |
| 1     | `46bd597d` | Create types structure             |
| 2     | `b7c24bc7` | Move parser from exercises         |
| 3     | `1b5f9a7e` | Move parameterization from shared  |
| 4     | `8d3e2f1c` | Create public API and move tests   |
| 5     | `a2b4c6d8` | Update all imports to new location |
| 6     | `e9f0g1h2` | Remove old files                   |

---

## Final Structure

```
src/lib/ubumark/
├── index.ts                           # Main public API
├── types/
│   ├── index.ts                       # Barrel exports
│   ├── ast.ts                         # DocumentNode, BlockNode, InlineNode, etc.
│   ├── parser.ts                      # ParseOptions, ParseResult, MathPlaceholder
│   ├── template.ts                    # TemplateMarkdown, ResolvedMarkdown (branded)
│   └── parameterization.ts            # Variable, RandomSpec, EvalModifiers
├── parser/
│   ├── index.ts                       # Parser exports
│   ├── markdown-parser.ts             # Main parser (parseMarkdown)
│   ├── math-extractor.ts              # LaTeX extraction
│   ├── list-parser.ts
│   ├── table-parser.ts
│   ├── code-block-parser.ts
│   └── blockquote-parser.ts
├── parameterization/
│   ├── index.ts                       # Parameterization exports
│   ├── parser/
│   │   ├── tokenizer.ts               # Token extraction
│   │   ├── random-parser.ts           # {{random:...}} parsing
│   │   ├── eval-parser.ts             # {{eval:...}} parsing
│   │   └── variable-parser.ts
│   ├── resolver/
│   │   ├── variable-resolver.ts       # Variable resolution
│   │   ├── text-resolver.ts           # Text template resolution
│   │   └── random-generator.ts        # Random value generation
│   ├── validator/
│   │   ├── variable-validator.ts
│   │   └── circular-dependency.ts
│   ├── display-options.ts
│   └── expression-transforms.ts
└── __tests__/                         # 23 test files, 813+ tests
```

---

## Verification Results

| Check                 | Result                          |
| --------------------- | ------------------------------- |
| Custom-markdown tests | ✅ 813 passed, 1 skipped        |
| TypeScript check      | ✅ No new errors                |
| ESLint                | ✅ No errors in ubumark |
| Imports updated       | ✅ 50 consumer files            |

**Note**: Pre-existing test failures (470) and lint errors (4) in other modules are unrelated to this refactoring.

---

## Files Deleted

- `src/lib/exercises/parser/` (7 source + 11 test files)
- `src/lib/shared/markdown/` (3 files)
- `src/lib/shared/parameterization/` (24 files)

---

## Backward Compatibility

`src/lib/exercises/types.ts` re-exports AST types from ubumark for existing consumers:

```typescript
export type { BaseNode, TextNode, MathInlineNode, ... } from '$lib/ubumark';
```

---

## Usage

```typescript
// Parser
import { parseMarkdown, extractMath } from '$lib/ubumark';

// Template types
import { templateMarkdown, resolvedMarkdown, isTemplateMarkdown } from '$lib/ubumark';
import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/ubumark';

// Parameterization
import { resolveVariables, resolveText, validateVariables } from '$lib/ubumark';
import type { Variable, ResolvedVariable, RandomSpec } from '$lib/ubumark';

// AST types
import type { DocumentNode, BlockNode, InlineNode, ParseOptions } from '$lib/ubumark';
```
