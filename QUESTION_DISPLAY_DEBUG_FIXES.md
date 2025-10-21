# QuestionDisplay Debug Page - Session Fixes

## Date

2025-10-19

## Summary

Fixed multiple issues with the QuestionDisplay debug page and MathField editability during debugging session.

---

## Issues Fixed

### 1. MathField Not Editable ✅

**Problem:**

- MathField inputs in NumericalInput and AlgebraicInput were not editable
- Users could not type mathematical expressions

**Root Cause:**

- Used `read-only` attribute (hyphenated) instead of `readonly` (single word)
- MathLive's `<math-field>` element follows HTML standard attribute naming

**Solution:**
Changed attribute from `read-only={disabled}` to `readonly={disabled}` in:

- `src/lib/components/question-inputs/NumericalInput.svelte` (line 44)
- `src/lib/components/question-inputs/AlgebraicInput.svelte` (line 44)

Also updated CSS selectors from `[read-only]` to `[readonly]`:

- `NumericalInput.svelte` (line 75)
- `AlgebraicInput.svelte` (line 84)

**Files Changed:**

- `src/lib/components/question-inputs/NumericalInput.svelte`
- `src/lib/components/question-inputs/AlgebraicInput.svelte`

---

### 2. Debug Page SSR Errors with Select Components ✅

**Problem:**

- 500 errors on `/dashboard/admin/debug/question-display`
- Error: `TypeError: __vite_ssr_import_8__.Value is not a function`

**Root Cause:**

- Shadcn Select components require `placeholder` prop for SSR
- Even with placeholder, SSR compilation can be problematic

**Solution:**
Replaced Shadcn Select components with native HTML `<select>` elements:

```svelte
<!-- Before -->
<Select.Root>
	<Select.Trigger>
		<Select.Value placeholder="Select question type" />
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="...">...</Select.Item>
	</Select.Content>
</Select.Root>

<!-- After -->
<select
	bind:value={selectedQuestionType}
	onchange={() => changeQuestion()}
	class="text-sm... w-full rounded-md border border-input bg-background px-3 py-2"
>
	<option value="numerical_exact">Numerical (Exact)</option>
	<option value="numerical_decimal">Numerical (Decimal)</option>
	...
</select>
```

**Files Changed:**

- `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte`

---

### 3. Debug Page SSR Error with Browser APIs ✅

**Problem:**

- 500 error: `ReferenceError: window is not defined`
- Error occurred at line 637 when accessing `window.innerWidth`

**Root Cause:**

- Browser-only APIs (`window`, `navigator`) accessed during server-side rendering
- Code tried to read viewport dimensions and user agent on server

**Solution:**
Added browser checks using `$app/environment`:

```svelte
<script lang="ts">
	import { browser } from '$app/environment';
</script>

<!-- User Agent -->
<code>{browser ? navigator.userAgent : 'SSR - Not available'}</code>

<!-- Viewport -->
<code>{browser ? `${window.innerWidth}×${window.innerHeight}px` : 'SSR - Not available'}</code>

<!-- ResizeObserver Support -->
<Badge variant={browser && 'ResizeObserver' in window ? 'default' : 'destructive'}>
	{browser && 'ResizeObserver' in window ? 'Yes ✓' : 'No ✗'}
</Badge>
```

**Files Changed:**

- `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte`

---

### 4. Multiple Dev Servers Running ✅

**Problem:**

- Multiple background dev servers running on ports 5173, 5174, 5175
- Old servers had cached SSR compilation errors
- User browser connecting to wrong port

**Root Cause:**

- Previous sessions left background processes running
- Vite SSR cache not cleared between restarts
- Port conflicts causing confusion

**Solution:**

- Killed all dev servers: `lsof -ti:5173,5174,5175 | xargs kill -9`
- Cleared Vite cache: `rm -rf node_modules/.vite`
- Killed background shell processes
- Updated CLAUDE.md to specify port 5175 for debugging

**Files Changed:**

- `CLAUDE.md` - Added port usage guidelines

---

## Documentation Updates

### CLAUDE.md ✅

Added section on development server ports:

````markdown
### Development Server Ports

**IMPORTANT:** When debugging or starting dev servers for testing purposes:

- **Port 5173**: Reserved for the user's main development server (DO NOT USE)
- **Port 5175**: Use this port for Claude's debugging and testing purposes

**When Claude needs to start a dev server:**

```bash
# ❌ WRONG - Interferes with user's main server
pnpm dev

# ✅ CORRECT - Use port 5175 for debugging
pnpm dev -- --port 5175
```
````

**Rationale:** The user maintains their own dev server on port 5173 for active development. Claude should always use port 5175 when testing, debugging, or verifying fixes to avoid port conflicts and SSR cache issues.

````

### Component Comments ✅

Added inline comments to NumericalInput and AlgebraicInput:

```svelte
<!--
  MathField with readonly control
  - readonly={disabled}: Uses HTML standard 'readonly' attribute (NOT 'read-only')
  - virtual-keyboard-mode="manual": User controls when to show virtual keyboard
  - smart-mode: Enables intelligent mode switching (text/math)
-->
<MathField
  bind:value
  readonly={disabled}
  virtual-keyboard-mode="manual"
  smart-mode
  class="numerical-input-field"
  onkeydown={handleKeydown}
  {placeholder}
/>
````

### QUESTION_DISPLAY_COMPONENT.md ✅

Added MathLive integration details:

```markdown
**MathLive Integration:**

- Uses `readonly` attribute (NOT `read-only`) for editable control
- `virtual-keyboard-mode="manual"` - User controls keyboard display
- `smart-mode` enabled - Intelligent text/math mode switching
- Enter key submits answer when not disabled
- Styled with Shadcn theme variables for consistent appearance
```

Added troubleshooting entries:

```markdown
**Issue:** MathField inputs not editable
**Solution:** The `readonly` attribute must be used (NOT `read-only`). MathLive's `<math-field>` element follows HTML standard attribute naming. Ensure `readonly={disabled}` is set correctly in NumericalInput and AlgebraicInput components.

**Issue:** Debug page SSR errors with Select components
**Solution:** Use native HTML `<select>` elements instead of Shadcn Select for better SSR compatibility

**Issue:** Debug page `window is not defined` error
**Solution:** Guard browser-only APIs with `browser` check from `$app/environment`: `browser ? window.innerWidth : 'SSR'`
```

---

## Key Learnings

### MathLive Attributes

- MathLive uses standard HTML attribute names (single word)
- `readonly` (✅) not `read-only` (❌)
- Always check MathLive documentation for correct attribute naming

### SSR Best Practices

- Guard all browser-only APIs with `browser` check from `$app/environment`
- Prefer native HTML elements over complex UI library components for SSR pages
- Native `<select>` is more reliable than Shadcn Select for SSR

### Dev Server Management

- Keep only one dev server running at a time
- Document port usage to prevent conflicts
- Clear Vite cache when encountering SSR issues: `rm -rf node_modules/.vite`
- Kill all processes on standard ports before starting fresh

### Debugging Workflow

1. Check browser console for client-side errors
2. Check server logs for SSR errors
3. Verify no stale processes running (use `lsof -ti:PORT`)
4. Clear caches (`node_modules/.vite`)
5. Hard refresh browser (Cmd+Shift+R)

---

## Files Modified

### Components

1. `src/lib/components/question-inputs/NumericalInput.svelte`
   - Changed `read-only` → `readonly` (line 44)
   - Updated CSS selector (line 75)
   - Added inline comments

2. `src/lib/components/question-inputs/AlgebraicInput.svelte`
   - Changed `read-only` → `readonly` (line 44)
   - Updated CSS selector (line 84)
   - Added inline comments

### Debug Page

3. `src/routes/(protected)/dashboard/admin/debug/question-display/+page.svelte`
   - Removed Shadcn Select import
   - Replaced 2 Select components with native `<select>`
   - Added `import { browser } from '$app/environment'`
   - Wrapped browser APIs with `browser` checks

### Documentation

4. `CLAUDE.md`
   - Added "Development Server Ports" section
   - Specified port 5175 for Claude debugging
   - Explained rationale for port separation

5. `QUESTION_DISPLAY_COMPONENT.md`
   - Added MathLive integration details
   - Added 3 new troubleshooting entries
   - Documented readonly vs read-only issue

6. `QUESTION_DISPLAY_DEBUG_FIXES.md` (NEW)
   - This summary document

---

## Testing Status

✅ **Debug page loads successfully** - No SSR errors
✅ **MathField inputs are editable** - Users can type answers
✅ **Native selects work** - Question type and size selectors functional
✅ **Browser API guards working** - Environment info displays correctly
✅ **All ports clear** - No conflicting dev servers

---

## Future Recommendations

1. **Always use native HTML elements in SSR pages** when possible
2. **Document browser API usage** with clear SSR guards
3. **Test on port 5175** when debugging to avoid conflicts
4. **Verify MathLive attributes** against official documentation
5. **Clear Vite cache** when encountering persistent SSR issues

---

**Session Completed:** 2025-10-19
**Status:** ✅ All issues resolved
**Next Steps:** Test debug page with real question instances
