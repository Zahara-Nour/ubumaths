# Rich Text Editor - Technical Guide

> Documentation technique complète du système d'édition de texte riche avec support mathématique.

## Table des matières

- [Architecture](#architecture)
- [Composants](#composants)
- [Configuration](#configuration)
- [Types](#types)
- [Utilisation](#utilisation)
- [Intégration MathLive](#intégration-mathlive)
- [Extensions Templates](#extensions-templates)
- [Import/Export Markdown](#importexport-markdown)
- [Copier-Coller Markdown](#copier-coller-markdown)
- [Stockage des données](#stockage-des-données)
- [Tests](#tests)
- [Debug Page](#debug-page)

---

## Architecture

### Vue d'ensemble

```
src/lib/components/rich-text/
├── RichTextEditor.svelte        # Composant principal (édition)
├── RichTextDisplay.svelte       # Composant d'affichage (lecture seule)
├── RichTextEditor.test.ts       # Tests unitaires (45 tests)
├── config.ts                    # Configuration (couleurs, emojis, templates)
├── editor-config.ts             # Factory TipTap
├── types.ts                     # Types TypeScript
├── markdown-import.ts           # Markdown → TipTap JSON conversion
├── markdown-export.ts           # TipTap JSON → Markdown conversion
├── markdown-detection.ts        # Détection syntaxe Markdown (pour paste)
├── markdown-paste-extension.ts  # Extension TipTap pour paste Markdown
├── __tests__/
│   ├── markdown-import.test.ts  # 46 tests
│   ├── markdown-export.test.ts  # 60 tests
│   └── markdown-paste.test.ts   # 30 tests
├── markdown-detection.test.ts   # 31 tests
└── README.md                    # Documentation composant

src/lib/extensions/
├── math-extension.ts         # Extensions TipTap pour MathLive
├── template-extensions.ts    # Extensions pour templates {{...}}
├── blank-extension.ts        # Extension pour blanks {{blank:N}}
└── __tests__/
    ├── math-extension.svelte.test.ts      # 34 tests
    ├── template-extensions.svelte.test.ts # 33 tests
    └── blank-extension.svelte.test.ts     # 14 tests
```

### Stack technique

| Technologie | Version  | Rôle                                       |
| ----------- | -------- | ------------------------------------------ |
| TipTap      | ^3.7.0   | Framework d'édition (basé sur ProseMirror) |
| MathLive    | ^0.108.2 | Édition de formules mathématiques          |
| Svelte 5    | -        | Framework UI avec runes                    |
| TypeScript  | strict   | Typage statique                            |

### Flux de données

```
┌─────────────────────────────────────────────────────────────┐
│                    RichTextEditor                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Toolbar   │───▶│   TipTap    │───▶│   Output    │     │
│  │  (actions)  │    │   Editor    │    │ (HTML/JSON) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Config    │    │ Extensions  │    │   Props     │     │
│  │  (config.ts)│    │(math-ext.ts)│    │(bind:value) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Composants

### RichTextEditor

Composant principal unifié supportant deux modes d'utilisation.

#### Props

```typescript
interface Props {
	// Mode d'utilisation
	mode?: 'chat' | 'form'; // default: 'form'

	// Binding (mode form)
	htmlValue?: string; // HTML content (bindable)
	jsonValue?: unknown; // TipTap JSON (bindable, optional)
	markdownValue?: string; // Markdown content (bindable, optional)

	// Callback (mode chat)
	onSend?: (content: unknown) => void;

	// Configuration
	mathTemplates?: 'full' | 'basic' | 'none'; // default: 'full'
	toolbar?: ToolbarConfig; // Toolbar sections visibility (default: all visible)
	showSendButton?: boolean; // default: mode === 'chat'
	showClearButton?: boolean; // default: true
	minHeight?: string; // default: '100px'
	disabled?: boolean; // default: false
}

// Méthode exposée via bind:this
export function getMarkdown(): string; // Retourne le markdown actuel

interface ToolbarConfig {
	text?: boolean; // Gras, Italique, Souligné, Barré, Code, Indice, Exposant
	paragraph?: boolean; // Titres H1-H6, Alignement
	insertion?: boolean; // Listes, Couleurs, Surlignage, Liens, Emojis
	formula?: boolean; // Templates math, Formule vide, Bloc formule
	templates?: boolean; // Variable, Aléatoire, Expression, Blanc
	more?: boolean; // Citation, Bloc de code, Ligne horizontale
}
```

#### Modes

| Mode   | Description                      | Output                               | Bouton Envoyer   |
| ------ | -------------------------------- | ------------------------------------ | ---------------- |
| `form` | Formulaires, édition persistante | HTML, JSON, ou Markdown via bindings | Non (par défaut) |
| `chat` | Messagerie temps réel            | JSON via `onSend` callback           | Oui              |

#### Priorité des bindings (initialisation)

Quand plusieurs props sont fournies au montage : `markdownValue` > `jsonValue` > `htmlValue`

#### Exemples d'utilisation

```svelte
<!-- Mode Form (défaut) - Édition simple avec HTML -->
<script lang="ts">
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
  let content = $state('');
</script>

<RichTextEditor bind:htmlValue={content} />

<!-- Mode Form - Avec JSON -->
<script lang="ts">
  let htmlContent = $state('');
  let jsonContent = $state<unknown>(null);
</script>

<RichTextEditor
  bind:htmlValue={htmlContent}
  bind:jsonValue={jsonContent}
/>

<!-- Mode Form - Avec Markdown (two-way binding) -->
<script lang="ts">
  let markdown = $state('# Titre\n\nTexte avec **gras** et ~formule~');
</script>

<RichTextEditor bind:markdownValue={markdown} />

<!-- Mode Form - getMarkdown() on-demand (via bind:this) -->
<script lang="ts">
  import type RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
  let editorRef: RichTextEditor;

  function handleExport() {
    const md = editorRef.getMarkdown();
    console.log('Markdown:', md);
  }
</script>

<RichTextEditor bind:this={editorRef} />
<button onclick={handleExport}>Exporter en Markdown</button>

<!-- Mode Chat -->
<script lang="ts">
  function handleSend(content: unknown) {
    console.log('Message envoyé:', content);
    // content est un objet JSON TipTap
  }
</script>

<RichTextEditor mode="chat" onSend={handleSend} />

<!-- Configuration avancée -->
<RichTextEditor
  mathTemplates="basic"      // 4 templates au lieu de 9
  showClearButton={false}    // Masquer le bouton "Effacer"
  minHeight="200px"          // Hauteur minimum
  disabled={isLoading}       // Désactiver pendant le chargement
/>

<!-- Toolbar personnalisée -->
<RichTextEditor
  toolbar={{
    text: true,        // Garder le formatage texte
    paragraph: false,  // Masquer titres et alignement
    insertion: true,   // Garder listes, couleurs, liens, emojis
    formula: true,     // Garder les formules math
    more: false        // Masquer citations, blocs de code, lignes
  }}
/>
```

### RichTextDisplay

Composant de lecture seule pour afficher du contenu TipTap JSON.

```svelte
<script lang="ts">
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

	// content est un objet JSON TipTap
	let { content } = $props();
</script>

<RichTextDisplay {content} />
```

---

## Configuration

### config.ts

#### Couleurs de texte

```typescript
export const TEXT_COLORS: TextColor[] = [
	{ name: 'Noir', value: '#000000' },
	{ name: 'Rouge', value: '#ef4444' },
	{ name: 'Orange', value: '#f97316' },
	{ name: 'Jaune', value: '#eab308' },
	{ name: 'Vert', value: '#22c55e' },
	{ name: 'Bleu', value: '#3b82f6' },
	{ name: 'Violet', value: '#8b5cf6' },
	{ name: 'Rose', value: '#ec4899' }
];
```

#### Couleurs de surlignage

```typescript
export const HIGHLIGHT_COLORS: HighlightColor[] = [
	{ name: 'Aucun', value: null },
	{ name: 'Jaune', value: '#fef3c7' },
	{ name: 'Rouge', value: '#fecaca' },
	{ name: 'Vert', value: '#d9f99d' },
	{ name: 'Bleu', value: '#bfdbfe' },
	{ name: 'Violet', value: '#e9d5ff' },
	{ name: 'Rose', value: '#fbcfe8' }
];
```

#### Templates mathématiques

```typescript
// MATH_TEMPLATES_FULL - 9 templates
export const MATH_TEMPLATES_FULL: MathTemplate[] = [
	{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ', title: 'Fraction' },
	{ label: 'Racine carrée', latex: '\\sqrt{x}', icon: '√x', title: 'Racine carrée' },
	{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ', title: 'Puissance' },
	{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ', title: 'Indice' },
	{ label: 'Intégrale', latex: '\\int_{a}^{b} f(x) dx', icon: '∫', title: 'Intégrale' },
	{ label: 'Somme', latex: '\\sum_{i=1}^{n} x_i', icon: '∑', title: 'Somme' },
	{ label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)', icon: 'lim', title: 'Limite' },
	{ label: 'Dérivée', latex: '\\frac{d}{dx} f(x)', icon: "f'", title: 'Dérivée' },
	{
		label: 'Équation du 2nd degré',
		latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
		icon: '±',
		title: 'Équation du 2nd degré'
	}
];

// MATH_TEMPLATES_BASIC - 4 templates essentiels
export const MATH_TEMPLATES_BASIC: MathTemplate[] = [
	{ label: 'Fraction', latex: '\\frac{a}{b}', icon: 'ᵃ⁄ᵦ', title: 'Fraction' },
	{ label: 'Racine carrée', latex: '\\sqrt{x}', icon: '√x', title: 'Racine carrée' },
	{ label: 'Puissance', latex: 'x^{n}', icon: 'xⁿ', title: 'Puissance' },
	{ label: 'Indice', latex: 'x_{i}', icon: 'xᵢ', title: 'Indice' }
];
```

#### Catégories d'emojis

8 catégories avec 200+ emojis sélectionnés pour un contexte éducatif :

| Catégorie       | Nombre | Usage                     |
| --------------- | ------ | ------------------------- |
| Smileys         | 37     | Expressions               |
| Feedback        | 17     | Réponses rapides          |
| Math & Science  | 17     | Symboles éducatifs        |
| School          | 23     | Matériel scolaire         |
| Stars & Symbols | 21     | Récompenses               |
| Shapes          | 26     | Formes géométriques       |
| Arrows          | 19     | Indicateurs directionnels |
| Nature          | 22     | Symboles universels       |

### editor-config.ts

#### createEditorExtensions

Factory pour créer les extensions TipTap.

```typescript
import { createEditorExtensions } from '$lib/components/rich-text/editor-config';

const extensions = createEditorExtensions({
	headingLevels: 6 // H1-H6 (défaut: 6)
});
```

Extensions incluses :

- StarterKit (base TipTap)
- Underline, TextStyle, Color, Highlight
- TextAlign, Link, Subscript, Superscript
- TaskList, TaskItem
- MathInline, MathBlock (custom)

#### getEditorProps

Props pour l'éditeur TipTap.

```typescript
import { getEditorProps } from '$lib/components/rich-text/editor-config';

const editorProps = getEditorProps({
	minHeight: '150px' // défaut: '100px'
});
```

---

## Types

### types.ts

```typescript
// Modes d'utilisation
export type RichTextMode = 'chat' | 'form';

// Niveaux de templates math
export type MathTemplateLevel = 'full' | 'basic' | 'none';

// Configuration des sections de la toolbar
export interface ToolbarConfig {
	text?: boolean; // Formatage texte (Gras, Italique, etc.)
	paragraph?: boolean; // Paragraphe (Titres, Alignement)
	insertion?: boolean; // Insertion (Listes, Couleurs, Liens, Emojis)
	formula?: boolean; // Formules mathématiques
	templates?: boolean; // Templates custom markdown
	more?: boolean; // Blocs spéciaux (Citation, Code, Ligne)
}

// Props du composant
export interface RichTextEditorProps {
	mode?: RichTextMode;
	value?: string;
	jsonValue?: unknown;
	onSend?: (content: unknown) => void;
	mathTemplates?: MathTemplateLevel;
	toolbar?: ToolbarConfig;
	showSendButton?: boolean;
	showClearButton?: boolean;
	minHeight?: string;
	disabled?: boolean;
}

// Types de données
export interface TextColor {
	name: string;
	value: string;
}

export interface HighlightColor {
	name: string;
	value: string | null;
}

export interface MathTemplate {
	label: string;
	latex: string;
	icon: string;
	title: string;
}

export interface EmojiCategory {
	name: string;
	emojis: string[];
}
```

---

## Intégration MathLive

### math-extension.ts

Deux extensions TipTap custom pour les formules mathématiques.

#### MathInline

Formules inline (dans le texte).

```typescript
// Insertion programmatique
editor.commands.insertMathInline('\\frac{a}{b}');

// Détection automatique
// Taper: $$x^2 + y^2$$
// → Convertit automatiquement en champ MathLive
```

Structure HTML :

```html
<span data-math-inline>
	<math-field value="x^2 + y^2"></math-field>
</span>
```

#### MathBlock

Formules en bloc (centrées, plus grandes).

```typescript
editor.commands.insertMathBlock('\\int_0^\\infty e^{-x^2} dx');
```

Structure HTML :

```html
<div data-math-block>
	<math-field value="..."></math-field>
</div>
```

### Sérialisation

| Format | MathInline                                        | MathBlock                                        |
| ------ | ------------------------------------------------- | ------------------------------------------------ |
| HTML   | `<span data-math-inline>`                         | `<div data-math-block>`                          |
| JSON   | `{ type: 'mathInline', attrs: { latex: '...' } }` | `{ type: 'mathBlock', attrs: { latex: '...' } }` |

### Syntaxe Custom (~...~)

En plus de la syntaxe LaTeX standard (`$...$`), une syntaxe custom est supportée :

| Syntaxe    | Type       | Description               |
| ---------- | ---------- | ------------------------- |
| `~expr~`   | MathInline | Expression custom inline  |
| `~~expr~~` | MathBlock  | Expression custom en bloc |

L'attribut `syntax` distingue les deux formats :

```typescript
// LaTeX standard
{ type: 'mathInline', attrs: { latex: 'x^2', syntax: 'latex' } }

// Custom syntax (préservé pour round-trip)
{ type: 'mathInline', attrs: { latex: 'x^2', syntax: 'custom', originalExpression: '2x+3' } }
```

---

## Extensions Templates

Extensions TipTap pour le custom markdown UbuMaths.

### TemplateVariable

Variables de template : `{{var}}`

```typescript
// Insertion
editor.commands.insertTemplateVariable('a');

// HTML output
<span data-template-variable="a" class="template-chip template-variable">{{a}}</span>
```

**Chip** : Bleu avec icône variable

### TemplateRandom

Valeurs aléatoires : `{{1..10}}` ou `{{random:dice,coin}}`

```typescript
// Range
editor.commands.insertTemplateRandom('1..10');

// List
editor.commands.insertTemplateRandom('random:option1,option2');

// HTML output
<span data-template-random="1..10" class="template-chip template-random">{{1..10}}</span>
```

**Chip** : Vert avec icône dé

### TemplateEval

Expressions évaluées : `{{eval:a+b}}`

```typescript
// Insertion
editor.commands.insertTemplateEval('a * b + 1');

// HTML output
<span data-template-eval="a * b + 1" class="template-chip template-eval">{{eval:a * b + 1}}</span>
```

**Chip** : Violet avec icône calculatrice

### BlankField

Champs de réponse vides : `{{blank:N}}`

```typescript
// Insertion
editor.commands.insertBlankField(1);

// HTML output
<span data-template-blank="1" class="template-chip template-blank">[Blank #1]</span>
```

**Chip** : Orange avec numéro

### InputRules (auto-détection)

| Pattern          | Extension        | Exemple                      |
| ---------------- | ---------------- | ---------------------------- |
| `{{nom}}`        | TemplateVariable | `{{x}}` → chip bleu          |
| `{{N..M}}`       | TemplateRandom   | `{{1..10}}` → chip vert      |
| `{{random:...}}` | TemplateRandom   | `{{random:a,b}}` → chip vert |
| `{{eval:...}}`   | TemplateEval     | `{{eval:x+1}}` → chip violet |
| `{{blank:N}}`    | BlankField       | `{{blank:1}}` → chip orange  |

### Validation

```typescript
import { validateBlankNumber } from '$lib/extensions/blank-extension';

validateBlankNumber('1'); // true
validateBlankNumber('0'); // false (must be positive)
validateBlankNumber('abc'); // false
```

---

## Import/Export Markdown

Conversion bidirectionnelle entre Markdown custom et TipTap JSON.

### markdownToTipTap

Convertit du Markdown vers TipTap JSON.

```typescript
import { markdownToTipTap } from '$lib/components/rich-text/markdown-import';

const markdown = `# Title

Some text with **bold** and ~math~.

{{a}} + {{b}} = {{eval:a+b}}`;

const tipTapJson = markdownToTipTap(markdown);
```

#### Syntaxes supportées

| Markdown       | TipTap Node                 |
| -------------- | --------------------------- |
| `# Title`      | heading (level 1-6)         |
| `**bold**`     | text (marks: bold)          |
| `*italic*`     | text (marks: italic)        |
| `` `code` ``   | text (marks: code)          |
| `$latex$`      | mathInline (syntax: latex)  |
| `~expr~`       | mathInline (syntax: custom) |
| `~~expr~~`     | mathBlock (syntax: custom)  |
| `{{var}}`      | templateVariable            |
| `{{1..10}}`    | templateRandom              |
| `{{eval:...}}` | templateEval                |
| `{{blank:N}}`  | blankField                  |
| `> quote`      | blockquote                  |
| `- item`       | bulletList                  |
| `1. item`      | orderedList                 |
| ` `code` `     | codeBlock                   |

### tipTapToMarkdown

Convertit du TipTap JSON vers Markdown.

```typescript
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

const markdown = tipTapToMarkdown(tipTapJson);
// Round-trip preserves original syntax
```

#### Préservation de la syntaxe

L'attribut `syntax` et `originalExpression` permettent de préserver la syntaxe originale :

```typescript
// Input markdown: ~2x+3~
// After import → export: ~2x+3~ (not $2x+3$)
```

---

## Copier-Coller Markdown

Le RichTextEditor supporte le copier-coller de contenu Markdown. Le texte Markdown collé est automatiquement converti en contenu riche.

### Fonctionnement

1. **Détection** : Le texte collé est analysé pour détecter la syntaxe Markdown
2. **Normalisation** : L'indentation commune est supprimée (préserve l'indentation relative pour les listes imbriquées)
3. **Conversion** : Le Markdown est converti en TipTap JSON via `markdownToTipTap()`
4. **Insertion** : Le contenu riche est inséré dans l'éditeur

### Syntaxes supportées

| Markdown        | Résultat                     |
| --------------- | ---------------------------- |
| `# Titre`       | Heading niveau 1-6           |
| `**gras**`      | Texte en gras                |
| `*italique*`    | Texte en italique            |
| `` `code` ``    | Code inline                  |
| `- item`        | Liste à puces                |
| `1. item`       | Liste numérotée              |
| `  - sous-item` | Liste imbriquée (2 espaces)  |
| `> citation`    | Blockquote                   |
| `$x^2$`         | Formule math inline (LaTeX)  |
| `~2x+3~`        | Formule math inline (custom) |
| `{{var}}`       | Template variable            |
| `{{1..10}}`     | Template random              |
| `{{eval:a+b}}`  | Template eval                |
| `{{blank:1}}`   | Champ à remplir              |

### Exemple

Coller ce texte :

```markdown
# Titre

Texte **gras** et _italique_.

- Item 1
- Item 2
  - Sous-item 2.1

Math: $x^2 + y^2$

Template: {{variable}}
```

Produit un document riche avec :

- Un heading H1
- Un paragraphe avec formatage bold/italic
- Une liste à puces avec sous-liste
- Une formule mathématique MathLive
- Un chip template variable

### Gestion de l'indentation

Le système normalise automatiquement l'indentation :

```
Texte copié (avec indentation) :     Après normalisation :
  # Titre                            # Titre
  - Item 1                           - Item 1
    - Sous-item                        - Sous-item
  - Item 2                           - Item 2
```

L'indentation **commune** (minimum) est supprimée, mais l'indentation **relative** est préservée pour les listes imbriquées.

### Fichiers

| Fichier                       | Rôle                                       |
| ----------------------------- | ------------------------------------------ |
| `markdown-detection.ts`       | Détection de syntaxe Markdown (scoring)    |
| `markdown-paste-extension.ts` | Extension TipTap pour intercepter le paste |

---

## Stockage des données

### Format JSON (recommandé pour le chat)

```json
{
	"type": "doc",
	"content": [
		{
			"type": "paragraph",
			"content": [
				{ "type": "text", "text": "Calculer " },
				{ "type": "mathInline", "attrs": { "latex": "x^2 + y^2" } },
				{ "type": "text", "text": " pour x=3." }
			]
		}
	]
}
```

### Format HTML (pour les formulaires)

```html
<p>Calculer <span data-math-inline>x^2 + y^2</span> pour x=3.</p>
```

### Tables Supabase utilisant le rich text

| Table              | Colonne                   | Format              |
| ------------------ | ------------------------- | ------------------- |
| `messages`         | `content`                 | JSONB (TipTap JSON) |
| `private_messages` | `content`                 | JSONB (TipTap JSON) |
| `message_drafts`   | `content`                 | JSONB (TipTap JSON) |
| `riddles`          | `statement`, `correction` | TEXT (HTML)         |

---

## Toolbar

### Organisation

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [Texte ▼] [Paragraphe ▼] [Insertion ▼] [Formule ▼] [Templates ▼] [Plus ▼] [Effacer] │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Sections collapsibles

| Section        | Contenu                                                                |
| -------------- | ---------------------------------------------------------------------- |
| **Texte**      | Gras, Italique, Souligné, Barré, Code, Indice, Exposant                |
| **Paragraphe** | Titres H1-H6, Alignement (gauche, centre, droite, justifié)            |
| **Insertion**  | Listes (puces, numérotée, tâches), Couleurs, Surlignage, Liens, Emojis |
| **Formule**    | Templates math, Formule vide, Bloc formule                             |
| **Templates**  | Variable, Aléatoire, Expression, Blanc (pour custom markdown)          |
| **Plus**       | Citation, Bloc de code, Ligne horizontale                              |

### Raccourcis clavier

| Action   | Raccourci    |
| -------- | ------------ |
| Gras     | Ctrl/Cmd + B |
| Italique | Ctrl/Cmd + I |
| Souligné | Ctrl/Cmd + U |
| Lien     | Ctrl/Cmd + K |

---

## Tests

### Couverture

293 tests unitaires au total :

| Fichier                              | Tests | Description                                    |
| ------------------------------------ | ----- | ---------------------------------------------- |
| `RichTextEditor.test.ts`             | 45    | Configuration, modes, props                    |
| `math-extension.svelte.test.ts`      | 34    | MathInline, MathBlock, syntaxe custom          |
| `template-extensions.svelte.test.ts` | 33    | TemplateVariable, TemplateRandom, TemplateEval |
| `blank-extension.svelte.test.ts`     | 14    | BlankField validation, serialization           |
| `markdown-import.test.ts`            | 46    | Markdown → TipTap conversion                   |
| `markdown-export.test.ts`            | 60    | TipTap → Markdown conversion                   |
| `markdown-detection.test.ts`         | 31    | Détection syntaxe Markdown (scoring)           |
| `markdown-paste.test.ts`             | 30    | Extension paste et trivial HTML detection      |

### Exécution

```bash
# Tous les tests rich-text
pnpm test:server src/lib/components/rich-text/

# Tests extensions
pnpm test:client src/lib/extensions/

# Tests spécifiques
pnpm test:server src/lib/components/rich-text/RichTextEditor.test.ts
pnpm test:client src/lib/extensions/math-extension.svelte.test.ts
```

---

## Migration depuis les anciens composants

### Avant (2 composants)

```svelte
<!-- Chat -->
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
</script>
<RichTextEditor onSend={handleSend} />

<!-- Form -->
<script>
  import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
</script>
<FormRichTextEditor bind:value={content} />
```

### Après (1 composant unifié)

```svelte
<!-- Chat -->
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
</script>
<RichTextEditor mode="chat" onSend={handleSend} />

<!-- Form -->
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
</script>
<RichTextEditor bind:value={content} />
```

---

## Bonnes pratiques

### Performance

1. **Lazy loading** : Pour les formulaires avec plusieurs éditeurs, utiliser l'import dynamique :

   ```typescript
   const RichTextEditor = (await import('$lib/components/rich-text/RichTextEditor.svelte')).default;
   ```

2. **Synchronisation TipTap** : `$effect` est utilisé uniquement pour synchroniser
   l'état Svelte avec l'API impérative TipTap (side effects légitimes).

### Accessibilité

- Tous les boutons ont `type="button"` pour éviter la soumission de formulaire
- Les boutons de couleur ont des `aria-label` avec les noms en français
- Les emojis sont organisés en catégories navigables

### Sécurité

- Le contenu HTML est généré par TipTap (sanitization intégrée)
- Pas d'injection de HTML brut depuis l'utilisateur
- Validation côté serveur recommandée pour le contenu stocké

---

## Debug Page

Page de développement pour tester les fonctionnalités du RichTextEditor.

**URL** : `/dashboard/admin/debug/rich-text`

### Onglets

| Onglet            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| **Test Editor**   | Test général du RichTextEditor avec output HTML/JSON |
| **Import/Export** | Test du round-trip Markdown ↔ TipTap                |

### Import/Export Tab

Interface de test pour la conversion Markdown :

```
┌─────────────────────────────────────────────────┐
│ [Import Markdown ▼]          (CodeMirror)       │
│ # Title                                         │
│ Text with **bold** and ~math~                   │
│ {{a}} + {{b}} = {{eval:a+b}}                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ [RichTextEditor Result ▼]                       │
│ WYSIWYG editor with chips and math              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ [Export Markdown ▼]          (CodeMirror)       │
│ # Title                                         │
│ Text with **bold** and ~math~                   │
│ {{a}} + {{b}} = {{eval:a+b}}                    │
└─────────────────────────────────────────────────┘
```

### Chaîne de réactivité

1. **Import modifié** → mise à jour automatique RichTextEditor + Export
2. **RichTextEditor modifié** → mise à jour automatique Export uniquement

---

## Fichiers de référence

| Fichier                                                    | Description                |
| ---------------------------------------------------------- | -------------------------- |
| `src/lib/components/rich-text/RichTextEditor.svelte`       | Composant principal        |
| `src/lib/components/rich-text/RichTextDisplay.svelte`      | Affichage lecture seule    |
| `src/lib/components/rich-text/config.ts`                   | Configuration              |
| `src/lib/components/rich-text/editor-config.ts`            | Factory TipTap             |
| `src/lib/components/rich-text/types.ts`                    | Types TypeScript           |
| `src/lib/components/rich-text/markdown-import.ts`          | Markdown → TipTap          |
| `src/lib/components/rich-text/markdown-export.ts`          | TipTap → Markdown          |
| `src/lib/components/rich-text/markdown-detection.ts`       | Détection syntaxe Markdown |
| `src/lib/components/rich-text/markdown-paste-extension.ts` | Extension paste Markdown   |
| `src/lib/extensions/math-extension.ts`                     | Extensions math            |
| `src/lib/extensions/template-extensions.ts`                | Extensions templates       |
| `src/lib/extensions/blank-extension.ts`                    | Extension blank            |
