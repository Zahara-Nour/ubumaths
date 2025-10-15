# Rich Text Editor with Math Support

A comprehensive rich text editor built with **TipTap** and **MathLive** for the UbuMaths educational platform. Features an organized collapsible toolbar, extensive formatting options, emoji picker, and interactive mathematical formulas.

## Components

### 1. RichTextEditor.svelte
The main editable rich text editor component with complete formatting and math support.

**Features:**

**Organized Collapsible Toolbar:**
- **Texte** section (default: open) - Text formatting
- **Paragraphe** section - Headings and alignment
- **Insertion** section - Lists, colors, links, emojis
- **Formule** section - Math templates with icon buttons
- **Plus** dropdown - Advanced block formatting

**Text Formatting:**
- Bold, Italic, Underline, Strikethrough
- Inline code
- Subscript and Superscript

**Paragraph Formatting:**
- Headings (H1-H6) with dropdown selector
- Text alignment (left, center, right, justify)

**Lists:**
- Bullet lists
- Ordered (numbered) lists
- Task lists with checkboxes

**Colors:**
- Text color picker (8 preset colors)
- Text highlighting (6 preset colors)

**Media & Links:**
- Hyperlinks with inline URL dialog
- Emoji picker (200+ curated emojis in 8 categories)

**Math Formulas:**
- Inline math formulas (within text)
- Block math formulas (centered, larger)
- 9 common templates with icon buttons
- Automatic `$$...$$` LaTeX detection

**Advanced Formatting:**
- Blockquotes (citations)
- Code blocks (multi-line)
- Horizontal rules

**Usage:**
```svelte
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';

  function handleSend(content) {
    console.log('Content:', content);
    // Save to database, send to API, etc.
  }
</script>

<RichTextEditor
  onSend={handleSend}
  placeholder="Écrivez votre réponse..."
/>
```

**Props:**
- `onSend?: (content: any) => void` - Callback when user clicks "Envoyer"
- `placeholder?: string` - Placeholder text (default: "Écrivez votre message...")

### 2. RichTextDisplay.svelte
Read-only component for displaying rich text content with math formulas.

**Features:**
- Displays all formatted text (colors, styles, alignment)
- Renders math formulas (non-editable)
- Automatically updates when content changes
- Uses same styling as editor
- Supports emojis and special characters

**Usage:**
```svelte
<script>
  import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

  let messageContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'La formule est : ' },
          { type: 'mathInline', attrs: { latex: 'x^2 + y^2 = z^2' } }
        ]
      }
    ]
  };
</script>

<RichTextDisplay content={messageContent} />
```

**Props:**
- `content: any` - TipTap JSON content to display
- `class?: string` - Additional CSS classes

### 3. Math Extensions (math-extension.ts)
Custom TipTap extensions for math support.

**Exports:**
- `MathInline` - Inline math node extension
- `MathBlock` - Block math node extension

Both extensions:
- Create interactive MathLive fields
- Support LaTeX input
- Automatic `$$...$$` pattern detection (inline only)
- Read-only mode for display components

## Toolbar Organization

### Main Toolbar Row (Always Visible)
```
[Texte ▼] [Paragraphe ▶] [Insertion ▶] [Formule ▶] | [Plus ▼] | [Effacer] [Envoyer]
```

### Collapsible Sections

#### 📝 Texte Section (Default: Open)
```
[B] [I] [U] [S] [code] | [sub] [sup]
```
- Bold, Italic, Underline, Strikethrough, Code
- Subscript, Superscript

#### ¶ Paragraphe Section
```
[Titre ▼] | [Left] [Center] [Right] [Justify]
```
- Heading levels (H1-H6) or Paragraph
- Text alignment (4 options)

#### ➕ Insertion Section
```
[•] [1.] [☐] | [🎨] [🖍️] | [🔗] | [😊]
```
- Lists: Bullet, Ordered, Task
- Color pickers: Text color, Highlight
- Link insertion
- Emoji picker (8 categories)

#### Σ Formule Section
```
[∅] | [ᵃ⁄ᵦ] [√x] [xⁿ] [xᵢ] [∫] [∑] [lim] [f'] [±] | [⬚]
```
- Empty formula, 9 templates, Block formula
- Icon-based buttons for visual recognition

#### ⋯ Plus Dropdown
```
- Citation (blockquote)
- Bloc de code (code block)
- Ligne horizontale (horizontal rule)
```

## Emoji Picker

### 8 Curated Categories (200+ emojis)

1. **Smileys** (37 emojis)
   - Emotions and expressions
   - Example: 😊 😀 😃 😄 🤓 🧐 🤔 😢 😭 😱

2. **Feedback** (17 emojis)
   - Hand gestures for interaction
   - Example: 👍 👎 👏 🙌 👌 ✌️ 🤞 🙏 💪

3. **Math & Science** (17 emojis)
   - Educational tools and symbols
   - Example: 📐 📏 📊 📈 🔬 🔭 ⚗️ 🧮 ⚛️ ➕ ➖ ✖️ ➗

4. **School** (23 emojis)
   - Study materials and supplies
   - Example: 📚 📖 📝 ✏️ 🖊️ 🎓 🎒 🏫 💡 🧠

5. **Stars & Symbols** (21 emojis)
   - Achievement and feedback markers
   - Example: ⭐ 🌟 ✨ 🔥 💥 ✅ ❌ ⚠️ 💯 🎯 🏆 🥇

6. **Shapes** (26 emojis)
   - Geometric shapes and colors
   - Example: 🔴 🟠 🟡 🟢 🔵 🟣 🔶 🔷 🔺 🔻

7. **Arrows** (19 emojis)
   - Direction indicators
   - Example: ⬆️ ➡️ ⬇️ ⬅️ ↔️ ↕️ 🔃 🔄

8. **Nature** (22 emojis)
   - Weather and natural elements
   - Example: 🌞 🌈 ☀️ ⛅ ☁️ 🌧️ ⚡ ❄️ 🔥 💧

**UI Features:**
- Category tabs for easy navigation
- 8-column grid layout
- Large emoji size (2xl) for easy clicking
- Hover effects for visual feedback
- Searchable by category

## Math Templates

### Icon-Based Math Buttons

All math templates use visual icons for instant recognition:

| Icon | Name | LaTeX Template | Use Case |
|------|------|----------------|----------|
| **∅** | Formule vide | (empty) | Start from scratch |
| **ᵃ⁄ᵦ** | Fraction | `\frac{a}{b}` | Fractions and ratios |
| **√x** | Racine carrée | `\sqrt{x}` | Square roots |
| **xⁿ** | Puissance | `x^{n}` | Exponents and powers |
| **xᵢ** | Indice | `x_{i}` | Subscripts and indices |
| **∫** | Intégrale | `\int_{a}^{b} f(x) dx` | Integrals (calculus) |
| **∑** | Somme | `\sum_{i=1}^{n} x_i` | Summations (series) |
| **lim** | Limite | `\lim_{x \to \infty} f(x)` | Limits (calculus) |
| **f'** | Dérivée | `\frac{d}{dx} f(x)` | Derivatives (calculus) |
| **±** | Équation du 2nd degré | `\frac{-b \pm \sqrt{b^2-4ac}}{2a}` | Quadratic formula |
| **⬚** | Bloc de formule | (centered block) | Large centered equations |

**Design Philosophy:**
- Icons use mathematical symbols (universal understanding)
- Hover tooltips show full French names
- Monospace font for clarity
- Visual grouping with separators

## Content Format

Content is stored in TipTap's JSON format:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Texte normal " },
        { "type": "text", "marks": [{"type": "bold"}], "text": "en gras" },
        {
          "type": "mathInline",
          "attrs": { "latex": "\\frac{a}{b}" }
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [
        { "type": "text", "text": "Titre de section" }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Premier élément" }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "mathBlock",
      "attrs": {
        "latex": "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}"
      }
    }
  ]
}
```

## Automatic LaTeX Detection

The editor automatically detects `$$...$$` patterns and converts them to interactive math fields.

**Examples:**
- Type: `$$x^2+y^2$$` → Converts to inline math field
- Type: `$$\frac{a}{b}$$` → Converts to fraction
- Type: `$$\sum_{i=1}^{n} x_i$$` → Converts to summation

**How it works:**
1. User types `$$formula$$`
2. InputRule regex detects the pattern: `/\$\$([^\$]+)\$\$$/`
3. Formula is extracted and replaced with MathInline node
4. MathLive field renders with the LaTeX formula

## Integration Examples

### Homework Submission Form
```svelte
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
  import { enhance } from '$app/forms';

  let content = $state(null);

  function handleSend(editorContent) {
    content = editorContent;
  }
</script>

<form method="POST" action="?/submitHomework" use:enhance>
  <input type="hidden" name="content" value={JSON.stringify(content)} />
  <RichTextEditor onSend={handleSend} placeholder="Écrivez votre réponse..." />
  <button type="submit">Envoyer le devoir</button>
</form>
```

### Teacher Feedback with Emojis
```svelte
<script>
  import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

  let { homework } = $props();
</script>

<h3>Réponse de l'élève :</h3>
<RichTextDisplay content={homework.student_answer} />

<h3>Commentaire du professeur :</h3>
<!-- May include: "Excellent travail! 👏 Continue! ⭐" -->
<RichTextDisplay content={homework.teacher_feedback} />
```

### Chat Messages with Rich Formatting
```svelte
<script>
  import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
  import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

  let messages = $state([]);

  async function handleSendMessage(content) {
    const newMessage = {
      id: crypto.randomUUID(),
      author: 'Current User',
      content: content,
      timestamp: new Date()
    };
    messages = [...messages, newMessage];
  }
</script>

{#each messages as message}
  <div class="message">
    <strong>{message.author}</strong>
    <RichTextDisplay content={message.content} />
  </div>
{/each}

<RichTextEditor onSend={handleSendMessage} />
```

## Styling

Global styles are defined in `src/app.css`:

```css
/* Base math-field styling */
math-field {
  border: 1px solid var(--color-border);
  background: var(--color-muted);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 1rem;
}

/* TipTap editor text color */
.ProseMirror {
  color: var(--color-foreground) !important;
}

/* Placeholder styling */
.ProseMirror p.is-editor-empty:first-child::before {
  color: var(--color-muted-foreground);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
```

All styles use semantic color variables from the app theme, ensuring automatic dark/light mode support.

## Demo

View the full interactive demo at: `/rich-text-editor-demo`

The demo includes:
- Live editor with all features
- Chat-style message display
- Example messages with math formulas
- Interactive instructions
- All formatting options showcased

## Dependencies

### Core TipTap Extensions
- `@tiptap/core` - Core editor framework
- `@tiptap/starter-kit` - Basic text editing (bold, italic, lists, etc.)
- `@tiptap/extension-underline` - Underline text
- `@tiptap/extension-text-align` - Text alignment
- `@tiptap/extension-text-style` - Text styling foundation
- `@tiptap/extension-color` - Text color
- `@tiptap/extension-highlight` - Text highlighting
- `@tiptap/extension-link` - Hyperlinks
- `@tiptap/extension-subscript` - Subscript text
- `@tiptap/extension-superscript` - Superscript text
- `@tiptap/extension-task-list` - Task lists
- `@tiptap/extension-task-item` - Task list items

### Other Dependencies
- `mathlive` - Mathematical input and rendering
- `@tailwindcss/typography` - Prose styling
- `lucide-svelte` - Icons for toolbar buttons

## Technical Notes

### Svelte 5 Compatibility
- Uses `$state`, `$props`, `$effect` runes (no deprecated `$:` syntax)
- Proper cleanup in `onMount` return function
- No use of deprecated `asChild let:builder` pattern
- Named imports for TipTap extensions

### Reactive State Management
- All toolbar buttons track active state reactively
- `updateFormattingState()` function called on selection changes
- Collapsible sections persist state during editing
- Link dialog state managed with `$state` rune

### MathLive Integration
- Creates custom `<math-field>` elements in TipTap node views
- Syncs LaTeX value with node attributes
- Automatic read-only mode when editor is not editable
- Event listeners for real-time formula updates

### Emoji Integration
- No external emoji libraries (zero dependencies)
- 200+ carefully curated emojis for education
- Native emoji rendering (uses system fonts)
- Category-based organization
- Direct text insertion (no image processing)

### Performance Optimizations
- Math fields use native web components (MathLive)
- TipTap uses ProseMirror (efficient document model)
- No unnecessary re-renders (atomic math nodes)
- Collapsible sections reduce toolbar complexity
- Lightweight emoji picker (no heavy libraries)

## Troubleshooting

**Text color too dark:**
Fixed with `color: var(--color-foreground) !important` in `.ProseMirror` styles.

**DropdownMenu errors:**
Don't use `asChild let:builder` - apply button classes directly to `DropdownMenu.Trigger`.

**Math formulas not interactive:**
Ensure `editable: false` is set on Editor for display-only components.

**Auto-detection not working:**
The pattern requires closing `$$` - make sure to type both opening and closing markers.

**Emojis not displaying:**
System must support Unicode emojis. All modern browsers support them.

**TextStyle import error:**
Use named import: `import { TextStyle } from '@tiptap/extension-text-style'`

**Toolbar too crowded on mobile:**
Sections are collapsible - close unused sections for better mobile experience.

## Accessibility

- All toolbar buttons have descriptive `title` attributes
- Keyboard shortcuts work for common formatting
- Semantic HTML (lists, headings, blockquotes)
- Color contrast follows WCAG guidelines
- Focus management maintained throughout editor

## Future Enhancements

Possible improvements:
- [ ] Support for `$single$` delimiter (single dollar signs)
- [ ] Image upload support with Supabase Storage
- [ ] Table insertion and editing
- [ ] Collaborative editing (real-time)
- [ ] Equation numbering for block math
- [ ] Export to PDF/LaTeX
- [ ] Undo/redo buttons in toolbar
- [ ] Custom color picker (beyond presets)
- [ ] Search and replace functionality
- [ ] Character/word count display
- [ ] Mobile keyboard optimization
- [ ] Markdown import/export
- [ ] Mentions (@username) support

## License

Part of the UbuMaths educational platform.
