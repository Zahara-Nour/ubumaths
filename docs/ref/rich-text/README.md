# Rich Text Editor - Technical Guide

> Documentation technique complète du système d'édition de texte riche avec support mathématique.

## Table des matières

- [Architecture](#architecture)
- [Composants](#composants)
- [Configuration](#configuration)
- [Types](#types)
- [Utilisation](#utilisation)
- [Intégration MathLive](#intégration-mathlive)
- [Stockage des données](#stockage-des-données)
- [Tests](#tests)

---

## Architecture

### Vue d'ensemble

```
src/lib/components/rich-text/
├── RichTextEditor.svelte     # Composant principal (édition)
├── RichTextDisplay.svelte    # Composant d'affichage (lecture seule)
├── RichTextEditor.test.ts    # Tests unitaires (45 tests)
├── config.ts                 # Configuration (couleurs, emojis, templates)
├── editor-config.ts          # Factory TipTap
├── types.ts                  # Types TypeScript
└── README.md                 # Documentation composant

src/lib/extensions/
└── math-extension.ts         # Extensions TipTap pour MathLive
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
	value?: string; // HTML content (bindable)
	jsonValue?: unknown; // TipTap JSON (bindable, optional)

	// Callback (mode chat)
	onSend?: (content: unknown) => void;

	// Configuration
	mathTemplates?: 'full' | 'basic' | 'none'; // default: 'full'
	showSendButton?: boolean; // default: mode === 'chat'
	showClearButton?: boolean; // default: true
	minHeight?: string; // default: '100px'
	disabled?: boolean; // default: false
}
```

#### Modes

| Mode   | Description                      | Output                     | Bouton Envoyer   |
| ------ | -------------------------------- | -------------------------- | ---------------- |
| `form` | Formulaires, édition persistante | HTML via `bind:value`      | Non (par défaut) |
| `chat` | Messagerie temps réel            | JSON via `onSend` callback | Oui              |

#### Exemples d'utilisation

```svelte
<!-- Mode Form (défaut) - Édition simple -->
<script lang="ts">
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
  let content = $state('');
</script>

<RichTextEditor bind:value={content} />

<!-- Mode Form - Avec JSON -->
<script lang="ts">
  let htmlContent = $state('');
  let jsonContent = $state<unknown>(null);
</script>

<RichTextEditor
  bind:value={htmlContent}
  bind:jsonValue={jsonContent}
/>

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

// Props du composant
export interface RichTextEditorProps {
	mode?: RichTextMode;
	value?: string;
	jsonValue?: unknown;
	onSend?: (content: unknown) => void;
	mathTemplates?: MathTemplateLevel;
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
┌─────────────────────────────────────────────────────────────────┐
│ [Texte ▼] [Paragraphe ▼] [Insertion ▼] [Formule ▼] [Plus ▼] [Effacer] [Envoyer] │
└─────────────────────────────────────────────────────────────────┘
```

### Sections collapsibles

| Section        | Contenu                                                                |
| -------------- | ---------------------------------------------------------------------- |
| **Texte**      | Gras, Italique, Souligné, Barré, Code, Indice, Exposant                |
| **Paragraphe** | Titres H1-H6, Alignement (gauche, centre, droite, justifié)            |
| **Insertion**  | Listes (puces, numérotée, tâches), Couleurs, Surlignage, Liens, Emojis |
| **Formule**    | Templates math, Formule vide, Bloc formule                             |
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

45 tests unitaires couvrant :

| Catégorie               | Tests |
| ----------------------- | ----- |
| Configuration des modes | 7     |
| Templates mathématiques | 12    |
| Détection contenu vide  | 6     |
| Props par défaut        | 5     |
| Cas limites             | 9     |
| Type safety             | 2     |
| Intégration config      | 4     |

### Exécution

```bash
# Tous les tests rich-text
pnpm test:server src/lib/components/rich-text/RichTextEditor.test.ts

# Mode watch
pnpm test:server src/lib/components/rich-text/RichTextEditor.test.ts -- --watch
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

## Fichiers de référence

| Fichier                                               | Description             |
| ----------------------------------------------------- | ----------------------- |
| `src/lib/components/rich-text/RichTextEditor.svelte`  | Composant principal     |
| `src/lib/components/rich-text/RichTextDisplay.svelte` | Affichage lecture seule |
| `src/lib/components/rich-text/config.ts`              | Configuration           |
| `src/lib/components/rich-text/editor-config.ts`       | Factory TipTap          |
| `src/lib/components/rich-text/types.ts`               | Types TypeScript        |
| `src/lib/extensions/math-extension.ts`                | Extensions math         |
