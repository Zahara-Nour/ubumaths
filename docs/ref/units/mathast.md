# MathAST Units Integration

How units integrate with the MathAST (Mathematical Abstract Syntax Tree) system.

## Overview

Units in MathAST are represented as `UnitNode` wrappers around expressions. This allows expressions to carry their physical units through parsing, manipulation, and evaluation.

## UnitNode

### Structure

```typescript
interface UnitNode {
	type: 'Unit';
	expression: MathNode; // The wrapped expression
	unit: Unit; // The physical unit
}
```

**Example AST:**

```
UnitNode
├── expression: NumberNode('150')
└── unit: { components: Map{'m'=>1}, coefficient: 1000 } // km
```

### Creating UnitNodes

```typescript
import { MathAST, toLatex } from '$lib/mathAST';
import { createUnit, divideUnits } from '$lib/questions/units';

// Wrap any expression with a unit
const distance = MathAST.withUnit(MathAST.number('150'), createUnit('km'));
console.log(toLatex(distance)); // '150~\unit{km}'

// Variable with unit
const velocity = MathAST.withUnit(
	MathAST.variable('v'),
	divideUnits(createUnit('m'), createUnit('s'))
);
console.log(toLatex(velocity)); // 'v~\unit{m/s}'

// Expression with unit
const area = MathAST.withUnit(
	MathAST.multiply(MathAST.number('5'), MathAST.number('3')),
	powerUnit(createUnit('m'), 2)
);
console.log(toLatex(area)); // '5 \times 3~\unit{m^2}'
```

### Convenience Factories

```typescript
import { MathAST } from '$lib/mathAST';

// Quantity: number with unit string
const speed = MathAST.quantity(MathAST.number('90'), 'km/h');
// UnitNode(number('90'), parse('km/h'))

// Variable with unit
const mass = MathAST.quantityVar('m', 'kg');
// UnitNode(variable('m'), parse('kg'))
```

## Syntax Representations

### LaTeX Syntax

Units in LaTeX use the `\unit{}` command:

```latex
150~\unit{km}
90~\unit{km/h}
9.8~\unit{m/s^2}
\frac{1}{2}~\unit{kg.m^2}
```

**Parsing:**

```typescript
import { parseLatex, toLatex } from '$lib/mathAST';

const expr = parseLatex('150~\\unit{km}');
// UnitNode(number('150'), km)

console.log(toLatex(expr)); // '150~\unit{km}'
```

### Custom Syntax

Units in custom syntax use bracket notation `[unit]`:

```
150 [km]
90 [km/h]
9.8 [m/s^2]
1/2 [kg.m^2]
```

**Parsing:**

```typescript
import { parseCustom, toCustom } from '$lib/mathAST';

const expr = parseCustom('150 [km]');
// UnitNode(number('150'), km)

console.log(toCustom(expr)); // '150 [km]'
```

### Comparison

| Format | Example         | Use Case           |
| ------ | --------------- | ------------------ |
| LaTeX  | `150~\unit{km}` | Display, rendering |
| Custom | `150 [km]`      | Internal, input    |

## Parsing

### LaTeX Quantities

```typescript
import { parseLatexQuantity } from '$lib/questions/units';

const result = parseLatexQuantity('150~\\unit{km/h}');

if (result.success) {
	console.log(result.quantity.value); // 150
	console.log(result.quantity.unit); // Unit object
}
```

### Unit Expressions

```typescript
import { parseUnitExpression } from '$lib/questions/units';

const unit = parseUnitExpression('kg.m/s^2');
// { components: Map{'g'=>1, 'm'=>1, 's'=>-2}, coefficient: 1000 }
```

### Extracting Units

```typescript
import { extractUnitFromLatex } from '$lib/questions/units';

const unit = extractUnitFromLatex('90~\\unit{km/h}');
// Unit object for km/h
```

## AST Traversal

### Finding UnitNodes

```typescript
import { traverse } from '$lib/mathAST';
import type { Unit } from '$lib/questions/units';

function collectUnits(ast: MathNode): Unit[] {
	const units: Unit[] = [];

	traverse(ast, {
		Unit: (node) => {
			units.push(node.unit);
		}
	});

	return units;
}
```

### Transforming Units

```typescript
import { transform } from '$lib/mathAST';
import { getConversionFactor } from '$lib/questions/units';

// Convert all km to m
function convertToMeters(ast: MathNode): MathNode {
	return transform(ast, {
		Unit: (node) => {
			const targetUnit = createUnit('m');

			if (unitsAreCompatible(node.unit, targetUnit)) {
				const factor = getConversionFactor(node.unit, targetUnit);

				return {
					type: 'Unit',
					expression: MathAST.multiply(node.expression, MathAST.number(String(factor))),
					unit: targetUnit
				};
			}

			return node;
		}
	});
}
```

## Dimensional Analysis

### Checking Consistency

```typescript
import { checkDimensionalConsistency } from '$lib/questions/units';

const expr = parseCustom('3 [m] + 5 [m]');
const result = checkDimensionalConsistency(expr);
console.log(result.valid); // true

const invalid = parseCustom('3 [m] + 5 [s]');
const result2 = checkDimensionalConsistency(invalid);
console.log(result2.valid); // false
console.log(result2.error); // 'Cannot add m and s'
```

### Analyzing Terms

```typescript
import { analyzeExpression } from '$lib/questions/units';

const expr = parseCustom('3 [m/s] * 2 [s]');
const terms = analyzeExpression(expr);

// terms[0]: { node: ..., unit: m/s }
// terms[1]: { node: ..., unit: s }
// Result unit: m (velocity × time = distance)
```

## Evaluation

### With Units

```typescript
import { evaluate } from '$lib/mathAST';
import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();
const expr = parseCustom('150 [km] / 2 [h]');

// Evaluate numeric part
const numericResult = evaluate(expr, ce);
// 75

// Result unit: km/h
```

### Converting During Evaluation

```typescript
import { evaluateQuantityValue, convertQuantity } from '$lib/questions/units';

const quantity = {
	value: '150',
	unit: createUnit('km')
};

// Evaluate value
const numericValue = evaluateQuantityValue(quantity, ce);
// 150

// Convert to meters
const inMeters = convertQuantity(quantity, createUnit('m'));
// { value: 150000, unit: m }
```

## Validation Pipeline

```
Student Input (LaTeX)
        │
        ▼
parseLatexQuantity()
        │
        ▼
    Quantity
   { value, unit }
        │
        ▼
validateQuantityAnswer()
        │
    ┌───┴───┐
    ▼       ▼
 correct  wrong_*
```

**Example:**

```typescript
import { parseLatexQuantity, validateQuantityAnswer, createUnit } from '$lib/questions/units';

// Student input
const studentLatex = '150~\\unit{km}';

// Parse
const parsed = parseLatexQuantity(studentLatex);
if (!parsed.success) {
	return { status: 'parse_error' };
}

// Expected answer
const expected = { value: 150, unit: createUnit('km') };

// Validate
const result = validateQuantityAnswer(studentLatex, expected);
// { status: 'correct' }
```

## Best Practices

### 1. Parse Early, Validate Late

```typescript
// Good: Parse once, validate multiple ways
const parsed = parseLatexQuantity(input);
if (parsed.success) {
	// Check dimensionality
	// Compare values
	// Check unit compatibility
}

// Avoid: Re-parsing repeatedly
```

### 2. Use Appropriate Tolerance

```typescript
// For exact calculations
validateQuantityAnswer(answer, expected, { tolerance: 1e-9 });

// For student answers with rounding
validateQuantityAnswer(answer, expected, { tolerance: 0.01 });
```

### 3. Handle Unit Equivalence

```typescript
// Allow equivalent units (default)
validateQuantityAnswer('1500~\\unit{m}', { value: 1.5, unit: createUnit('km') });
// correct (1500 m = 1.5 km)

// Require exact unit
validateQuantityAnswer('1500~\\unit{m}', expected, { requireExactUnit: true });
// wrong_unit
```

### 4. Preserve Original Format

```typescript
import { format } from '$lib/mathAST/units';

const unit = parse('km/h');
console.log(format(unit, 'original')); // 'km/h' (preserves input)
console.log(format(unit, 'dot')); // 'km·h^-1' (normalized)
```

## Error Handling

### Parse Errors

```typescript
const result = parseLatexQuantity('invalid input');
if (!result.success) {
	console.log(result.error); // Descriptive error message
	// Handle gracefully
}
```

### Incompatible Units

```typescript
const m = createUnit('m');
const s = createUnit('s');

const factor = getConversionFactor(m, s);
if (factor === null) {
	console.log('Units are incompatible');
}
```

### Dimensional Errors

```typescript
const result = checkDimensionalConsistency(expr);
if (!result.valid) {
	console.log(result.error);
	// e.g., 'Cannot add length (m) and time (s)'
}
```

## See Also

- [Architecture](./architecture.md)
- [API Reference](./api-reference.md)
- [mathAST Documentation](../mathAST/index.md)
- [mathAST Units](../mathAST/units.md)
