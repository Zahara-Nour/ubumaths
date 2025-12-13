# Rich Text Editor Refactoring - Progress Document

## Overview

Refactoring RichTextEditor components to extract shared code into separate modules and create a unified component.

**Status**: Phase 1 Complete ✅

---

## Phase 1: Extract Shared Code (COMPLETED)

### Created Files

#### 1. `/src/lib/components/rich-text/types.ts`

**Purpose**: TypeScript type definitions for rich text editor components

**Exports**:

- `RichTextMode`: 'chat' | 'form'
- `MathTemplateLevel`: 'full' | 'basic' | 'none'
- `RichTextEditorProps`: Unified props interface
- `TextColor`: Color definition with name and value
- `HighlightColor`: Highlight color definition (value can be null)
- `MathTemplate`: Math template definition
- `EmojiCategory`: Emoji category definition

**Status**: ✅ Created, compiles without errors

---

#### 2. `/src/lib/components/rich-text/config.ts`

**Purpose**: Shared configuration constants (colors, emojis, math templates)

**Exports**:

- `TEXT_COLORS`: 8 text colors with names (merged from both components)
- `HIGHLIGHT_COLORS`: 7 highlight colors including "Aucun" (null)
- `EMOJI_CATEGORIES`: 8 emoji categories (200+ emojis)
- `MATH_TEMPLATES_FULL`: 9 math templates (full set)
- `MATH_TEMPLATES_BASIC`: 4 basic math templates (fraction, sqrt, power, subscript)

**Merge Decisions**:

- Used FormRichTextEditor's color format (with names) as it's more descriptive
- Unified emoji categories (both components had 8 categories but slightly different emojis)
- Kept all 9 math templates from RichTextEditor for FULL set
- Created BASIC set with 4 templates for simplified UI

**Status**: ✅ Created, compiles without errors

---

#### 3. `/src/lib/components/rich-text/editor-config.ts`

**Purpose**: Factory functions for TipTap editor configuration

**Exports**:

- `createEditorExtensions(options)`: Creates TipTap extensions array
  - Options: `{ headingLevels?: number }` (default: 6)
  - Returns all required extensions in correct order
  - Includes: StarterKit, Underline, TextAlign, Color, Highlight, Link, Subscript, Superscript, TaskList, TaskItem, MathInline, MathBlock

- `getEditorProps(options)`: Returns editor props object
  - Options: `{ minHeight?: string }` (default: '100px')
  - Returns props with proper CSS classes

**Status**: ✅ Created, compiles without errors

---

## Next Phases

### Phase 2: Create Unified Component (PENDING)

Create `/src/lib/components/rich-text/UnifiedRichTextEditor.svelte` that:

- Uses the extracted config and types
- Supports both 'chat' and 'form' modes
- Has conditional UI based on mode
- Implements all toolbar features from both components

### Phase 3: Migrate Existing Components (PENDING)

- Update `RichTextEditor.svelte` to use new unified component (mode='chat')
- Update `FormRichTextEditor.svelte` to use new unified component (mode='form')
- Ensure backward compatibility (same props, same behavior)

### Phase 4: Testing & Validation (PENDING)

- Run type checks
- Run unit tests
- Manual testing of both components
- Verify no regressions

---

## Key Differences Between Components

### RichTextEditor.svelte

- **Mode**: Chat/messaging
- **Features**: Send button, clear button, collapsible sections
- **Math Templates**: Full set (9 templates)
- **Heading Levels**: 1-6
- **Min Height**: 100px

### FormRichTextEditor.svelte

- **Mode**: Form field
- **Features**: Bidirectional binding, persistent content, no send button
- **Math Templates**: Basic set (4 templates)
- **Heading Levels**: 1-3
- **Min Height**: 150px

---

## Files Modified

None yet (extraction phase only creates new files)

---

## Files To Be Modified (Phase 3)

- `/src/lib/components/rich-text/RichTextEditor.svelte`
- `/src/lib/components/rich-text/FormRichTextEditor.svelte`

---

## Notes

- All new files follow project conventions (English comments, proper TypeScript)
- No breaking changes to existing components yet
- Type checking passes (no new errors introduced)
- Ready for Phase 2: unified component creation

---

**Last Updated**: 2025-12-13 09:52 UTC
**Phase**: 1 of 4
