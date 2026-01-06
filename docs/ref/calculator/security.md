# Calculator Security

## Overview

The calculator implements defense-in-depth security measures to protect against XSS, DoS, and injection attacks while handling user-provided mathematical expressions.

---

## Threat Model

| Threat    | Vector                 | Mitigation                             |
| --------- | ---------------------- | -------------------------------------- |
| XSS       | Malicious localStorage | No HTML stored, Zod validation         |
| XSS       | Shared URL payload     | Character whitelist, pattern blacklist |
| DoS       | CPU exhaustion         | Depth limits, value count limits       |
| DoS       | Memory exhaustion      | Size limits on all inputs              |
| Injection | Command injection      | Prefix blocking, validation            |

---

## Input Validation

### Expression Input

**File**: `src/lib/stores/calculator.svelte.ts`

```typescript
const CalculatorInputSchema = z.object({
	type: z.enum(['expression', 'command']),
	command: z.string().max(50).optional(),
	expression: z.string().max(1000) // MAX_EXPRESSION_LENGTH
});
```

**Limits**:

- Expression: 1000 characters max
- Command: 50 characters max

### URL Sharing

**File**: `src/lib/components/calculator/CalculatorContainer.svelte`

```typescript
// Character whitelist for math expressions
const SAFE_MATH_CHARS = /^[\d\w\s+\-*/^=<>()[\]{}.,;:|!?\\πΠ√∫∑∏∞°′″αβγδεθλμσφωΩ]+$/u;

// Dangerous patterns blacklist
const DANGEROUS_PATTERNS = [
	/<script/i, // Script injection
	/javascript:/i, // JavaScript protocol
	/on\w+=/i, // Event handlers
	/data:/i, // Data URIs
	/eval\s*\(/i, // Eval calls
	/function\s*\(/i, // Function definitions
	/=>\s*{/i, // Arrow functions
	/import\s*\(/i, // Dynamic imports
	/require\s*\(/i // CommonJS require
];

const SharedCalcSchema = z.object({
	expr: z
		.string()
		.max(200)
		.refine((s) => !s.trim().startsWith('.'), 'Commands not allowed')
		.refine((s) => SAFE_MATH_CHARS.test(s), 'Invalid characters')
		.refine((s) => !DANGEROUS_PATTERNS.some((p) => p.test(s)), 'Forbidden patterns')
		.refine((s) => {
			// Validate balanced parentheses
			let depth = 0;
			for (const char of s) {
				if ('([{'.includes(char)) depth++;
				if (')]}'.includes(char)) depth--;
				if (depth < 0) return false;
			}
			return depth === 0;
		}, 'Unbalanced parentheses'),
	result: z
		.string()
		.max(200)
		.refine((s) => SAFE_MATH_CHARS.test(s), 'Invalid characters')
		.optional()
});
```

**Protections**:

- Max 200 characters per field
- Character whitelist (math symbols only)
- Dangerous pattern detection
- Balanced parentheses validation
- Command prefix blocking (no `.` start)

---

## localStorage Security

### History Validation

**File**: `src/lib/stores/calculator.svelte.ts`

```typescript
const HistoryEntrySchema = z.object({
	id: z.string().max(50),
	input: z.string().max(1000),
	output: z.string().max(1000),
	outputHtml: z.string().max(2000).optional(), // Ignored on load
	isError: z.boolean(),
	errorMessage: z.string().max(500).optional(),
	timestamp: z.number().int().positive()
});
```

### XSS Prevention

**Critical**: `outputHtml` is NOT loaded from localStorage.

```typescript
private loadHistory(): void {
  // ...
  for (const entry of parsed) {
    const validation = HistoryEntrySchema.safeParse(entry);
    if (validation.success) {
      validatedHistory.push({
        id: validation.data.id,
        input: validation.data.input,
        output: validation.data.output,
        // outputHtml intentionally NOT loaded (XSS prevention)
        isError: validation.data.isError,
        errorMessage: validation.data.errorMessage,
        timestamp: validation.data.timestamp
      });
    }
  }
}
```

### Size Limits

```typescript
// Max storage size
if (stored.length > 100000) {
	// 100KB
	console.warn('localStorage too large, clearing');
	localStorage.removeItem(STORAGE_KEY);
	return;
}

// Max entries
this.history = validatedHistory.slice(0, MAX_HISTORY); // 100
```

### Quota Handling

```typescript
catch (error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    // Try with reduced history
    const reducedHistory = this.history.slice(0, 50);
    // If still fails, clear history
  }
}
```

---

## DoS Prevention

### Evaluation Depth Limit

**File**: `src/lib/mathAST/eval/evaluate.ts`

```typescript
const MAX_EVAL_DEPTH = 100;

function evaluateNode(node: MathNode, exactMode: boolean, depth = 0): IntermediateValue {
	if (depth > MAX_EVAL_DEPTH) {
		throw new Error(`Expression too deeply nested (max depth: ${MAX_EVAL_DEPTH})`);
	}

	// Recursive calls pass depth + 1
	if (isAddition(node)) {
		const left = evaluateNode(node.left, exactMode, depth + 1);
		const right = evaluateNode(node.right, exactMode, depth + 1);
		// ...
	}
}
```

**Protects against**: Deeply nested expressions like `(((((...)))))`

### Statistical Value Limits

**File**: `src/lib/mathAST/cli/web/web-repl-engine.ts`

```typescript
// .stats command
const MAX_STATS_VALUES = 1000;
if (rawValues.length > MAX_STATS_VALUES) {
	return {
		success: false,
		output: `Erreur: trop de valeurs (max: ${MAX_STATS_VALUES})`
		// ...
	};
}

// .linreg command
const MAX_LINREG_VALUES = 1000;
if (xRaw.length > MAX_LINREG_VALUES || yRaw.length > MAX_LINREG_VALUES) {
	return {
		success: false,
		output: `Erreur: trop de valeurs (max: ${MAX_LINREG_VALUES})`
		// ...
	};
}
```

**Protects against**: CPU exhaustion from processing millions of values.

---

## URL Sharing Security

### Encoding

```typescript
// Encode
const encoded = btoa(encodeURIComponent(JSON.stringify(data)));

// Decode with size check
const shareParam = page.url.searchParams.get('share');
if (!shareParam || shareParam.length > 500) return;

const decoded = JSON.parse(decodeURIComponent(atob(shareParam)));
```

### Size Limits

| Limit           | Value         |
| --------------- | ------------- |
| Share parameter | 500 chars max |
| Encoded data    | 400 chars max |
| Expression      | 200 chars max |
| Result          | 200 chars max |

### Command Blocking

```typescript
.refine((s) => !s.trim().startsWith('.'), 'Commands not allowed')
```

Prevents execution of CAS commands via shared URLs.

---

## Secure Patterns

### No HTML Rendering

The calculator does NOT use `{@html}` or `innerHTML` for user content:

```svelte
<!-- SAFE: Text content only -->
<span class="font-mono text-lg">{result.output}</span>

<!-- NOT USED: Dangerous -->
{@html result.outputHtml}
```

### No HTML Storage

```typescript
// When saving to localStorage, outputHtml is excluded
const serialized = this.history.map((entry) => ({
	id: entry.id,
	input: entry.input,
	output: entry.output,
	// outputHtml intentionally excluded
	isError: entry.isError,
	errorMessage: entry.errorMessage,
	timestamp: entry.timestamp
}));
```

### Error Message Sanitization

Error messages are displayed as text, never as HTML:

```svelte
<span class="font-medium">{result.errorMessage || 'Erreur de calcul'}</span>
```

---

## Security Checklist

### Input Validation

- [x] Zod schema on all `execute()` inputs
- [x] Max expression length (1000 chars)
- [x] Max command length (50 chars)
- [x] Character whitelist for shared URLs
- [x] Dangerous pattern blacklist
- [x] Balanced parentheses validation

### localStorage

- [x] Full Zod validation on load
- [x] Size limits (100KB total, 100 entries)
- [x] `outputHtml` NOT loaded (XSS prevention)
- [x] Corrupted data handling
- [x] Quota exceeded handling

### DoS Prevention

- [x] Evaluation depth limit (100)
- [x] Stats value limit (1000)
- [x] Linreg value limit (1000)
- [x] Expression length limit (1000)

### URL Security

- [x] Share parameter size limit (500)
- [x] Command prefix blocking
- [x] JSON parse in try-catch
- [x] Invalid share URL handling

---

## Testing Security

### Manual Tests

```typescript
// Test XSS via localStorage
localStorage.setItem(
	'ubumaths-calc-history',
	JSON.stringify([
		{
			id: 'xss',
			input: '<script>alert(1)</script>',
			output: '<img onerror=alert(1)>',
			outputHtml: '<script>steal()</script>',
			isError: false,
			timestamp: Date.now()
		}
	])
);
// Expected: Entry loaded without outputHtml, no script execution

// Test DoS via deep nesting
engine.execute('(('.repeat(200) + '1' + '))'.repeat(200));
// Expected: Error "Expression too deeply nested"

// Test stats DoS
engine.execute('.stats ' + Array(10000).fill('1').join(','));
// Expected: Error "trop de valeurs"
```

### URL Injection Test

```javascript
// Malicious URL
const payload = { expr: '<script>alert(1)</script>' };
const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
const url = `/calc?share=${encoded}`;
// Expected: Validation error "Invalid characters in expression"
```

---

## Incident Response

### If XSS is Discovered

1. Clear user's localStorage: `localStorage.removeItem('ubumaths-calc-history')`
2. Identify attack vector
3. Add pattern to `DANGEROUS_PATTERNS`
4. Deploy fix immediately

### If DoS is Reported

1. Identify the input pattern
2. Add appropriate limit
3. Consider rate limiting if external API

---

## Security Updates

| Date       | Change                                         |
| ---------- | ---------------------------------------------- |
| 2026-01-06 | Initial security implementation                |
| 2026-01-06 | Added `outputHtml` exclusion from localStorage |
| 2026-01-06 | Added character whitelist for shared URLs      |
| 2026-01-06 | Added evaluation depth limit (100)             |
| 2026-01-06 | Added stats/linreg value limits (1000)         |
