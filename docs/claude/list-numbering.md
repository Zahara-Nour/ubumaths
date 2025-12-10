# List Numbering Schemes

Configuration des schemas de numerotation pour les listes ordonnees dans les exercices.

## Overview

Le systeme permet de configurer comment les listes ordonnees (enumerate) sont numerotees dans les exercices, avec detection automatique ou schema fixe.

## Schemas disponibles

| Schema ID | Exemple        | Usage                                               |
| --------- | -------------- | --------------------------------------------------- |
| `1-a-i`   | 1) a) i)       | Style academique francais (defaut avec imbrication) |
| `a-i`     | a) i)          | Exercices simples (defaut sans imbrication)         |
| `1.a.i`   | 1. a. i.       | Style avec points                                   |
| `I.A.1`   | I. A. 1.       | Style formel/juridique                              |
| `decimal` | 1. 1.1. 1.1.1. | Numerotation hierarchique                           |

## Mode Auto

En mode `auto` (defaut), le schema est choisi automatiquement selon la structure de l'exercice :

- **Avec imbrication** (listes ordonnees imbriquees) : utilise `schemeWithNesting` (defaut: `1-a-i`)
- **Sans imbrication** (liste plate) : utilise `schemeWithoutNesting` (defaut: `a-i`)

### Detection de l'imbrication

La fonction `getMaxEnumerateDepth()` analyse l'AST pour determiner la profondeur maximale des listes ordonnees. Les listes non ordonnees (itemize/bullet) sont **transparentes** - elles ne comptent pas dans la hierarchie de numerotation.

```
enumerate (depth 1)
  ├── enumerate (depth 2)
  │     └── itemize (transparent, still depth 2)
  │           └── enumerate (depth 3)
  └── itemize (transparent, still depth 1)
        └── enumerate (depth 2)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  listNumberingStore (global config)                     │
│  - scheme: 'auto' | '1-a-i' | 'a-i' | ...              │
│  - schemeWithNesting: '1-a-i'                          │
│  - schemeWithoutNesting: 'a-i'                         │
│  - Persisted in localStorage                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  MarkdownRenderer.svelte                                │
│  - Computes effectiveListScheme based on AST analysis   │
│  - Passes scheme to all ListNode components             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  ListNode.svelte                                        │
│  - Tracks enumerateDepth (ordered lists increment)      │
│  - Applies CSS classes: scheme-{id} enumerate-depth-{n} │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  CSS (list-numbering.css)                               │
│  - CSS counters for each scheme                         │
│  - ::before pseudo-elements for numbering               │
└─────────────────────────────────────────────────────────┘
```

## Usage

### Configuration globale (Admin)

Accessible via `/dashboard/admin/settings` :

```svelte
<script>
	import { listNumberingStore } from '$lib/stores/listNumbering.svelte';

	// Lire la config
	const config = listNumberingStore.config;

	// Modifier
	listNumberingStore.setScheme('1-a-i'); // ou 'auto'
	listNumberingStore.setSchemeWithNesting('1-a-i');
	listNumberingStore.setSchemeWithoutNesting('a-i');
	listNumberingStore.reset(); // Reinitialiser
</script>
```

### Override par rendu

```svelte
<MarkdownRenderer content={markdown} listNumberingOverride={{ scheme: '1-a-i' }} />
```

### Types

```typescript
import type {
	SchemeId, // '1-a-i' | 'a-i' | '1.a.i' | 'I.A.1' | 'decimal'
	ListNumberingConfig,
	NumberingScheme
} from '$lib/types/list-numbering';

import { NUMBERING_SCHEMES } from '$lib/types/list-numbering';
```

## Fichiers

| Fichier                                               | Description                      |
| ----------------------------------------------------- | -------------------------------- |
| `src/lib/types/list-numbering.ts`                     | Types et definitions des schemas |
| `src/lib/stores/listNumbering.svelte.ts`              | Store de configuration           |
| `src/lib/custom-markdown/utils/list-depth.ts`         | Analyse AST pour profondeur      |
| `src/lib/styles/list-numbering.css`                   | CSS counters                     |
| `src/lib/components/markdown/nodes/ListNode.svelte`   | Composant liste                  |
| `src/lib/components/markdown/MarkdownRenderer.svelte` | Orchestrateur                    |

## CSS Classes

Les listes ordonnees avec schema actif recoivent :

- `.scheme-{id}` : Le schema de numerotation (ex: `scheme-1-a-i`)
- `.enumerate-depth-{n}` : La profondeur (1, 2, 3, ...)

```html
<ol class="scheme-1-a-i enumerate-depth-1">
	<li>
		Question 1
		<ol class="scheme-1-a-i enumerate-depth-2">
			<li>Sous-question a</li>
		</ol>
	</li>
</ol>
```

## Tests

```bash
pnpm test:server src/lib/custom-markdown/utils/__tests__/list-depth.test.ts
```

---

**Navigation** : [Back to Index](./README.md)
