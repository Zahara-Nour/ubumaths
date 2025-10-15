# Rich Text Editor with Math Support

A powerful rich text editor built with **TipTap** and **MathLive** for the UbuMaths educational platform. Allows students and teachers to write formatted text with interactive mathematical formulas.

## Components

### 1. RichTextEditor.svelte
The main editable rich text editor component with math support.

**Features:**
- Text formatting (bold, italic)
- Inline math formulas (within text)
- Block math formulas (centered, larger)
- Automatic `$$...$$ ` LaTeX detection
- Dropdown with 9 common math templates
- Clear and Send buttons

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
- Displays formatted text
- Renders math formulas (non-editable)
- Automatically updates when content changes
- Uses same styling as editor

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
- Automatic `$$...$$ ` pattern detection (inline only)
- Read-only mode for display components

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
        {
          "type": "mathInline",
          "attrs": { "latex": "\\frac{a}{b}" }
        },
        { "type": "text", "text": " suite du texte" }
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

The editor automatically detects `$$...$$ ` patterns and converts them to interactive math fields.

**Examples:**
- Type: `$$x^2+y^2$$` → Converts to inline math field
- Type: `$$\frac{a}{b}$$` → Converts to fraction
- Type: `$$\sum_{i=1}^{n} x_i$$` → Converts to summation

**How it works:**
1. User types `$$formula$$ `
2. InputRule regex detects the pattern: `/\$\$([^\$]+)\$\$$/`
3. Formula is extracted and replaced with MathInline node
4. MathLive field renders with the LaTeX formula

## Math Templates

The editor includes 9 common math templates:

1. **Fraction:** `\frac{a}{b}`
2. **Racine carrée:** `\sqrt{x}`
3. **Puissance:** `x^{n}`
4. **Indice:** `x_{i}`
5. **Intégrale:** `\int_{a}^{b} f(x) dx`
6. **Somme:** `\sum_{i=1}^{n} x_i`
7. **Limite:** `\lim_{x \to \infty} f(x)`
8. **Dérivée:** `\frac{d}{dx} f(x)`
9. **Équation du 2nd degré:** `\frac{-b \pm \sqrt{b^2-4ac}}{2a}`

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

### Teacher Feedback
```svelte
<script>
  import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';

  let { homework } = $props();
</script>

<h3>Réponse de l'élève :</h3>
<RichTextDisplay content={homework.student_answer} />

<h3>Commentaire du professeur :</h3>
<RichTextDisplay content={homework.teacher_feedback} />
```

### Chat Messages
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
  /* ... */
}

/* TipTap editor text color */
.ProseMirror {
  color: var(--color-foreground) !important;
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

## Dependencies

- `@tiptap/core` - Core editor framework
- `@tiptap/starter-kit` - Basic text editing (bold, italic, lists, etc.)
- `mathlive` - Mathematical input and rendering
- `@tailwindcss/typography` - Prose styling

## Technical Notes

### Svelte 5 Compatibility
- Uses `$state`, `$props`, `$effect` runes
- Proper cleanup in `onMount` return function
- No use of deprecated `asChild let:builder` pattern

### MathLive Integration
- Creates custom `<math-field>` elements in TipTap node views
- Syncs LaTeX value with node attributes
- Automatic read-only mode when editor is not editable
- Event listeners for real-time formula updates

### Performance
- Math fields use native web components (MathLive)
- TipTap uses ProseMirror (efficient document model)
- No unnecessary re-renders (atomic math nodes)

## Troubleshooting

**Text color too dark:**
Fixed with `color: var(--color-foreground) !important` in `.ProseMirror` styles.

**DropdownMenu errors:**
Don't use `asChild let:builder` - apply button classes directly to `DropdownMenu.Trigger`.

**Math formulas not interactive:**
Ensure `editable: false` is set on Editor for display-only components.

**Auto-detection not working:**
The pattern requires closing `$$` - make sure to type both opening and closing markers.

## Future Enhancements

Possible improvements:
- [ ] Support for `$single$` delimiter (single dollar signs)
- [ ] Image upload support
- [ ] Collaborative editing (real-time)
- [ ] Equation numbering for block math
- [ ] Export to PDF/LaTeX
- [ ] Undo/redo shortcuts display
- [ ] Accessibility improvements (ARIA labels)
- [ ] Mobile keyboard optimization

## License

Part of the UbuMaths educational platform.
