# \textcolor Transparency Implementation

**Date**: 2025-12-02
**Status**: ✅ Completed

## Problem

The LaTeX `\textcolor{color}{content}` command was being parsed as a complete expression unit, causing incorrect AST structure when used with operators.

### Example Issue

```latex
5 \textcolor{red}{+3}
```

**Previous behavior** (INCORRECT):

- Parsed as: `Multiplication(5, Positive(3))`
- The `\textcolor` triggered implicit multiplication
- The `+` was treated as a prefix operator (positive)

**Expected behavior** (CORRECT):

- Parse as: `Addition(5, 3)`
- The `+` should be an infix operator
- Both the `+` operator and `3` should have red color metadata

## Solution

Modified both parsers (Pratt and Recursive Descent) to treat `\textcolor` as a transparent wrapper that only applies color metadata without changing AST structure.

### Key Changes

#### 1. Removed `\textcolor` from Implicit Multiplication Triggers

**File**: `parser-pratt.ts` and `parser-rd.ts`

Removed `\textcolor` from the list of commands that trigger implicit multiplication. This prevents `5 \textcolor{red}{+3}` from being treated as `5 * \textcolor{red}{+3}`.

```typescript
// Before
token.value === 'textcolor'; // was in the implicit mult list

// After
if (token.value === 'textcolor') {
	return false; // explicitly excluded
}
```

#### 2. Added Transparent Color Scope Handling

**File**: `parser-pratt.ts` - `handleTextColorInLED()` method
**File**: `parser-rd.ts` - `handleTextColorTransparent()` method

Created special handling for `\textcolor` when it appears after an operand (in LED/infix position):

1. Consume `\textcolor` command
2. Parse and validate the color argument
3. Push color onto the color stack
4. Consume the opening `{` for content
5. Mark as a transparent color scope (push to `colorScopeStack`)
6. **Do NOT parse the content** - let the normal expression parsing continue

```typescript
private handleTextColorInLED(): void {
    this.advance(); // consume \textcolor

    // Parse color argument
    this.expect('LBRACE', "Expected '{' for \\textcolor color");
    const colorStr = this.parseColorString();
    this.expect('RBRACE', "Expected '}' after \\textcolor color");

    const color = normalizeColor(colorStr);
    this.colorStack.push(color);

    // Consume opening brace and mark transparent scope
    this.expect('LBRACE', "Expected '{' for \\textcolor content");
    this.colorScopeStack.push(1);
}
```

#### 3. Modified Expression Parsing Loop

**File**: `parser-pratt.ts` - `parseExpression()` method

Added check for `\textcolor` at the start of the LED loop:

```typescript
while (true) {
	// Handle \textcolor transparently
	if (this.checkCommand('textcolor')) {
		this.handleTextColorInLED();
		continue; // currentToken is now the operator inside {}
	}

	// ... rest of parsing logic
}
```

#### 4. Delayed Color Scope Closing

**File**: `parser-pratt.ts` - `parseExpression()` method
**File**: `parser-rd.ts` - `parseMultiplicative()`, `parseAdditive()`, `parseRelation()`, `parsePower()` methods

Added logic to close color scopes **AFTER** parsing operators, ensuring the operator node gets the color applied before the color is popped from the stack:

```typescript
// After parsing an operator (e.g., in parseAddition)
left = this.applyColor(MathAST.add(left, right));

// Then check for closing brace
while (this.check('RBRACE') && this.colorScopeStack.length > 0) {
	this.advance(); // consume }
	this.colorScopeStack.pop();
	this.colorStack.pop();
}
```

**Critical timing**:

1. Parse operator token (e.g., `+`)
2. Parse right operand (e.g., `3`) - has color from stack
3. Create operator node (e.g., `Addition`) - gets color from stack via `applyColor()`
4. See closing `}` and pop color from stack
5. Color was on the stack during steps 2-3, so both get colored correctly

#### 5. Added Color Scope Stack

**File**: `parser-pratt.ts` and `parser-rd.ts`

Added `colorScopeStack` to track transparent color scopes:

```typescript
class PrattParser {
	// ... other fields
	private readonly colorScopeStack: number[] = [];
}
```

This stack tracks when we're inside a `\textcolor{}` scope that was opened via `handleTextColorInLED()`, allowing us to know when a `}` should pop a color vs. close a regular brace group.

## Testing

Created comprehensive test suite: `/src/lib/mathAST/parser/__tests__/textcolor-transparent.test.ts`

### Test Coverage

- ✅ Infix operators: `5 \textcolor{red}{+3}`, `5 \textcolor{red}{-3}`, `5 \textcolor{red}{*3}`
- ✅ Superscripts: `x \textcolor{blue}{^2}`
- ✅ Complex expressions: `\textcolor{blue}{2}\textcolor{red}{+3}`
- ✅ Multiple operators: `5 \textcolor{red}{+3-2}`
- ✅ Nested colors: `\textcolor{red}{x + \textcolor{blue}{y}}`
- ✅ Relations: `x \textcolor{red}{= 5}`
- ✅ Division: `a \textcolor{green}{/ b}`
- ✅ Operator color metadata: color applied to both operator and operand nodes

### Test Results

```
✓ 30 new tests (textcolor-transparent.test.ts)
✓ 137 existing Pratt parser tests
✓ 137 existing RD parser tests
✓ 737 total parser tests - all passing
```

## Examples

### Basic Infix Operator

```latex
Input:  5 \textcolor{red}{+3}
Output: Addition(5, 3)
        - left: Number(5) [no color]
        - right: Number(3) [color: red]
        - metadata: { color: "red" }
```

### Nested Colors

```latex
Input:  \textcolor{red}{a + \textcolor{blue}{b} + c}
Output: Addition(Addition(a, b), c)
        - a: Variable(a) [color: red]
        - b: Variable(b) [color: blue]
        - c: Variable(c) [color: red]
        - inner +: [color: red]
        - outer +: [color: red]
```

### Multiple Colors

```latex
Input:  \textcolor{blue}{2}\textcolor{red}{+3}
Output: Addition(2, 3)
        - left: Number(2) [color: blue]
        - right: Number(3) [color: red]
        - metadata: { color: "red" }
```

## Architecture Decision

### Why This Approach?

1. **Minimal Changes**: Modifies parsing flow without restructuring the entire parser
2. **Consistent Behavior**: Works the same way in both Pratt and RD parsers
3. **Backward Compatible**: Existing `\textcolor{red}{x+y}` (NUD position) still works correctly
4. **Correct Semantics**: Color is truly transparent - doesn't affect AST structure

### Alternative Approaches Considered

1. **Parse and unwrap**: Parse `\textcolor{}{...}` fully, then extract content
   - ❌ Would still require special handling for operators
   - ❌ More complex unwrapping logic needed

2. **Token-level color injection**: Apply colors at tokenizer level
   - ❌ Tokenizer doesn't understand expression structure
   - ❌ Would require significant tokenizer changes

3. **Post-parse color application**: Parse normally, apply colors after
   - ❌ Loses information about which nodes should be colored
   - ❌ Requires maintaining color scope information separately

## Files Modified

### Core Parser Files

- `/src/lib/mathAST/parser/parser-pratt.ts`
- `/src/lib/mathAST/parser/parser-rd.ts`

### New Test File

- `/src/lib/mathAST/parser/__tests__/textcolor-transparent.test.ts`

### Documentation

- `/docs/wip/textcolor-transparency-implementation.md` (this file)

## Impact

- **Breaking Changes**: None - only fixes incorrect behavior
- **Performance**: Negligible - adds one extra check per parse loop iteration
- **Test Coverage**: +30 tests specifically for this feature
- **Backward Compatibility**: ✅ All existing tests still pass

## Future Considerations

This implementation establishes a pattern for other "transparent" LaTeX commands that should only apply metadata without changing AST structure:

- `\mathbf{...}` - bold (could add `style: 'bold'` metadata)
- `\mathit{...}` - italic (could add `style: 'italic'` metadata)
- `\underline{...}` - underline (could add `decoration: 'underline'` metadata)

The same transparent scope pattern could be reused for these commands.
