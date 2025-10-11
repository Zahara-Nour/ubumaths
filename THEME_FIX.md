# Theme System Fix - Light/Dark Mode

## Problem

The light/dark mode toggle was not working correctly. Only dark mode was functioning, and the switch between modes didn't work properly.

## Root Cause

The application had **three conflicting systems** trying to manage the theme:

1. **Tailwind CSS 4 `light-dark()` function** in `app.css` - Uses CSS color-scheme property
2. **Custom theme store** in `theme.svelte.ts` - Was only managing `.dark` class
3. **mode-watcher package** - Also managing `.dark` class

### The Critical Issue

Tailwind CSS 4's `light-dark()` function requires the `color-scheme` CSS property to be set dynamically. The function syntax:

```css
--color-background: light-dark(#FAFAFA, #0F0F0F);
```

This returns:
- **First value** (`#FAFAFA`) when `color-scheme: light`
- **Second value** (`#0F0F0F`) when `color-scheme: dark`

**The `.dark` class alone does NOT trigger `light-dark()` to switch** - it only responds to the `color-scheme` CSS property.

## Solution

### 1. Updated `theme.svelte.ts`

Modified the theme store to:
- Watch for `.dark` class changes (set by mode-watcher)
- **Sync the `color-scheme` CSS property** whenever `.dark` class changes
- Use mode-watcher's `toggleMode()` function for consistency

```typescript
function syncColorScheme() {
  const isDark = document.documentElement.classList.contains('dark');
  // This line is CRITICAL - it triggers light-dark() to update
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  dark = isDark;
}
```

### 2. Updated `app.css`

Removed the static `color-scheme: light dark;` declaration:

```css
/* BEFORE - Caused conflict */
html {
  color-scheme: light dark;
}

/* AFTER - Now controlled by JavaScript */
/* color-scheme is set dynamically via theme.svelte.ts */
```

The static declaration was telling the browser to always respect system preferences, which conflicted with manual control.

### 3. Configured `ModeWatcher` in `+layout.svelte`

Set proper configuration:

```svelte
<ModeWatcher track={true} defaultMode="system" />
```

This allows mode-watcher to:
- Track system preference changes
- Start with system default
- Respect user's manual overrides via localStorage

## How It Works Now

1. **On page load:**
   - ModeWatcher initializes and reads from localStorage
   - Sets/removes `.dark` class on `<html>`
   - Theme store observes class change
   - Sets `color-scheme` CSS property
   - `light-dark()` function returns correct colors

2. **On toggle:**
   - User clicks theme toggle button
   - `theme.toggle()` calls `toggleMode()` from mode-watcher
   - mode-watcher updates `.dark` class and localStorage
   - MutationObserver detects class change
   - Theme store syncs `color-scheme` property
   - `light-dark()` immediately switches colors

## Key Concepts

### CSS `light-dark()` Function

- Modern CSS function (browser support ~80%+)
- Requires `color-scheme` property to be set
- More efficient than duplicate CSS rules
- Automatic color switching

### `color-scheme` Property

- Valid values: `light`, `dark`, `light dark`, `normal`
- Affects UI elements like form controls, scrollbars
- Can be set via CSS or JavaScript
- **Must be set to a single value** (`light` or `dark`) for manual control

### mode-watcher Package

- Manages `.dark` class on `<html>`
- Handles localStorage persistence
- Tracks system preference changes
- Provides `toggleMode()`, `setMode()` functions

## Testing

To test the theme system:

1. Visit http://localhost:5175/theme-test
2. Click "Basculer le thème" button
3. Verify:
   - Background color changes immediately
   - All color tokens (primary, card, muted, etc.) change
   - Theme persists across page refreshes
   - System preference syncing works (if enabled)

## Browser Compatibility

The `light-dark()` CSS function is supported in:
- Chrome/Edge 123+
- Firefox 120+
- Safari 17.5+

For older browsers, colors will default to the first (light) value. Consider adding fallbacks if needed.

## References

- [CSS light-dark() function - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
- [color-scheme property - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
- [mode-watcher package](https://github.com/svecosystem/mode-watcher)
- [Tailwind CSS 4 docs](https://tailwindcss.com/docs)
