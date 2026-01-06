# Calculator Technical Reference

> Comprehensive technical documentation for the UbuMaths Scientific Calculator.

## Overview

The calculator is a full-featured scientific calculator with CAS (Computer Algebra System) capabilities, built for educational purposes. It integrates with the existing MathAST infrastructure for expression parsing, evaluation, and symbolic manipulation.

**Route**: `/calc`

**Key Features**:

- MathLive visual input with LaTeX rendering
- CAS commands (differentiation, simplification, Taylor series)
- Unit-aware calculations with dimensional analysis
- Statistical functions (mean, stdev, linear regression)
- Pedagogical step-by-step explanations
- Grapheur integration for function plotting
- URL sharing and export (LaTeX, text)
- PWA with offline support

## Table of Contents

1. [Architecture](./architecture.md) - System design and component structure
2. [Components](./components.md) - Svelte component reference
3. [Store API](./store-api.md) - Calculator store and state management
4. [WebReplEngine](./web-repl-engine.md) - Expression evaluation engine
5. [Commands](./commands.md) - CAS command reference
6. [Step Generator](./step-generator.md) - Pedagogical step generation
7. [Security](./security.md) - Security measures and validation

## Quick Start

### Basic Usage

```svelte
<script>
	import { calculatorStore } from '$lib/stores/calculator.svelte';

	async function calculate() {
		await calculatorStore.execute({
			type: 'expression',
			expression: '2 + 3 * 4'
		});
		// Result: 14
	}
</script>
```

### Using Commands

```typescript
// Differentiate
await calculatorStore.execute({
	type: 'command',
	command: '.diff',
	expression: 'x^2'
});
// Result: 2*x

// Simplify
await calculatorStore.execute({
	type: 'command',
	command: '.simplify',
	expression: '(x+1)^2 - x^2 - 2*x'
});
// Result: 1
```

### Direct Engine Access

```typescript
import { WebReplEngine } from '$lib/mathAST/cli/web';

const engine = new WebReplEngine();

// Execute expression
const result = engine.execute('sin(pi/2)');
console.log(result.output); // "1"

// Execute command
const diffResult = engine.execute('.diff x^3');
console.log(diffResult.output); // "3*x^2"
```

## File Structure

```
src/
├── routes/(public)/calc/
│   ├── +page.svelte          # Route page
│   └── +page.ts              # Page load
├── lib/
│   ├── components/calculator/
│   │   ├── CalculatorContainer.svelte  # Main container
│   │   ├── UnifiedInput.svelte         # MathLive + command input
│   │   ├── ResultDisplay.svelte        # Result with steps
│   │   ├── StepsDisplay.svelte         # Step-by-step view
│   │   └── CalculatorKeyboard.svelte   # Virtual keyboard
│   ├── stores/
│   │   └── calculator.svelte.ts        # Calculator store
│   └── mathAST/
│       ├── cli/web/
│       │   ├── web-repl-engine.ts      # Evaluation engine
│       │   ├── types.ts                # Type definitions
│       │   └── output-formatter-web.ts # HTML formatting
│       ├── step-generator/
│       │   ├── index.ts                # Main entry point
│       │   ├── types.ts                # Type definitions
│       │   └── arithmetic-steps.ts     # Step generation logic
│       └── commands/                   # CAS commands
└── static/
    └── service-worker.js               # PWA caching
```

## Dependencies

| Package         | Purpose                 |
| --------------- | ----------------------- |
| `mathlive`      | Visual math input field |
| `zod`           | Input validation        |
| `lucide-svelte` | Icons                   |

## Related Documentation

- [MathAST Parser](../mathast/parser.md)
- [MathAST Evaluator](../mathast/evaluator.md)
- [Grapheur](../grapheur/README.md)
