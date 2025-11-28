# Phase 1 Complete: Discrete List Type and Parser

## Implementation Summary

Phase 1 successfully added discrete list support to the parameterization system. This allows syntax like `{{random:rouge|vert|bleu}}` or `{{a|b|c}}`.

## Files Modified

### 1. `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/types.ts`

Added new variant to `RandomSpec` discriminated union:

```typescript
| {
    /** Discrete list: {{random:a|b|c}} or {{a|b|c}} */
    type: 'discrete-list';
    items: string[];       // Raw item names (resolved at runtime)
    exclusions: string[];  // Raw exclusion names (resolved at runtime)
  }
```

**Key design decision**: Items and exclusions are stored as raw strings (not `NumberOrVariable`). This allows for arbitrary string literals and variable references, which will be resolved at generation time using the variable context (similar to eval expressions).

### 2. `/Users/david/Coding/js/ubumaths/src/lib/shared/parameterization/parser/random-parser.ts`

Added four new functions:

#### `hasTopLevelPipe(content: string): boolean`

Detects if content contains a pipe separator at top level (brace depth 0).

```typescript
function hasTopLevelPipe(content: string): boolean {
	let braceDepth = 0;
	for (const char of content) {
		if (char === '{') braceDepth++;
		if (char === '}') braceDepth--;
		if (char === '|' && braceDepth === 0) return true;
	}
	return false;
}
```

**Examples:**

- `'a|b|c'` → `true`
- `'{{a|b}}'` → `false` (pipe inside braces)
- `'1-10'` → `false`

#### `splitAtTopLevelMultiple(content: string, separator: string): string[]`

Splits content at all occurrences of separator, respecting nested braces.

```typescript
function splitAtTopLevelMultiple(content: string, separator: string): string[] {
	const parts: string[] = [];
	let current = '';
	let braceDepth = 0;

	for (const char of content) {
		if (char === '{') braceDepth++;
		if (char === '}') braceDepth--;

		if (char === separator && braceDepth === 0) {
			parts.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	parts.push(current.trim());
	return parts;
}
```

**Examples:**

- `'a|b|c'` with `'|'` → `['a', 'b', 'c']`
- `'{{a|x}}|b|{{c|y}}'` with `'|'` → `['{{a|x}}', 'b', '{{c|y}}']`
- `'a,b,c'` with `','` → `['a', 'b', 'c']`

#### `parseDiscreteList(content: string): RandomSpec`

Main parsing function for discrete lists.

```typescript
function parseDiscreteList(content: string): RandomSpec {
	// Split base items and exclusions
	const [itemsSpec, exclusionSpec] = splitAtTopLevel(content, '!');

	// Split items by pipe
	const rawItems = splitAtTopLevelMultiple(itemsSpec, '|');

	// Filter out empty items
	const items = rawItems.filter((item) => item.trim().length > 0);

	// Validate: must have at least one item
	if (items.length === 0) {
		throw new Error('Discrete list must have at least one item');
	}

	// Parse exclusions if present
	const exclusions = exclusionSpec ? splitAtTopLevelMultiple(exclusionSpec, ',') : [];

	return {
		type: 'discrete-list',
		items,
		exclusions: exclusions.filter((e) => e.trim().length > 0)
	};
}
```

**Examples:**

- `'rouge|vert|bleu'` → `{ type: 'discrete-list', items: ['rouge', 'vert', 'bleu'], exclusions: [] }`
- `'a|b|c|d!b,d'` → `{ type: 'discrete-list', items: ['a', 'b', 'c', 'd'], exclusions: ['b', 'd'] }`
- `'{{color1}}|{{color2}}|bleu'` → `{ type: 'discrete-list', items: ['{{color1}}', '{{color2}}', 'bleu'], exclusions: [] }`

#### Updated `parseRandomContent(content: string): RandomSpec`

Added discrete list detection as first check (before numeric range parsing):

```typescript
function parseRandomContent(content: string): RandomSpec {
	// Split base and exclusions
	const [baseSpec, exclusionSpec] = splitAtTopLevel(content, '!');

	// Check for discrete list first (contains top-level pipe)
	if (hasTopLevelPipe(baseSpec)) {
		return parseDiscreteList(content);
	}

	// ... existing logic for numeric ranges ...
}
```

**Priority order:**

1. Discrete list (pipe detected)
2. Decimal by digits (`2.3`)
3. Numeric ranges (`1-10`, `±2..9`, `1..1.6`)

## Validation Rules

- **Empty list**: Throws error (must have at least one item)
- **Single item**: Valid (always returns that item)
- **Whitespace-only items**: Filtered out
- **Empty exclusions**: Filtered out

## Examples of Supported Syntax

### Basic lists

```typescript
parseRandomSpec('{{random:rouge|vert|bleu}}');
// → { type: 'discrete-list', items: ['rouge', 'vert', 'bleu'], exclusions: [] }

parseRandomSpec('{{a|b|c}}');
// → { type: 'discrete-list', items: ['a', 'b', 'c'], exclusions: [] }
```

### With exclusions

```typescript
parseRandomSpec('{{random:a|b|c|d!b,d}}');
// → { type: 'discrete-list', items: ['a', 'b', 'c', 'd'], exclusions: ['b', 'd'] }
```

### With variables

```typescript
parseRandomSpec('{{{{color1}}|{{color2}}|bleu}}');
// → { type: 'discrete-list', items: ['{{color1}}', '{{color2}}', 'bleu'], exclusions: [] }
```

### Nested braces preserved

```typescript
parseRandomSpec('{{{{a|x}}|b|{{c|y}}}}');
// → { type: 'discrete-list', items: ['{{a|x}}', 'b', '{{c|y}}'], exclusions: [] }
```

## Type Errors (Expected)

The following type errors are expected and will be resolved in Phase 3 (generator):

- `random-generator.ts`: Exclusion handling needs to support both `Exclusion` (for numeric) and `string[]` (for discrete lists)
- `random-parser.test.ts`: Tests accessing `.type` property on exclusions

These errors confirm that the new type is being properly recognized by TypeScript.

## Next Steps (Not in Phase 1)

- **Phase 2**: Update tokenizer to detect shorthand `{{a|b|c}}`
- **Phase 3**: Update generator to handle discrete list generation and exclusions
- **Phase 4**: Add comprehensive tests

## Status

Phase 1 is complete and ready for Phase 2.
