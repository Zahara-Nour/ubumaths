# Units System Architecture

This document describes the two-layer architecture of the units system.

## Design Principles

### 1. Single Source of Truth

The `mathAST/units/` module is the **source of truth** for:

- Type definitions (`Unit`, `Dimension`, `BaseUnitDef`)
- Unit definitions (SI prefixes, base units, special units)
- Core operations (multiply, divide, power, invert)
- Conversion logic (dimensional analysis, conversion factors)

### 2. Immutability

The core layer uses **immutable data structures**:

```typescript
// mathAST/units/types.ts
interface Unit {
	readonly components: ReadonlyMap<string, number>;
	readonly coefficient: number;
	readonly original?: string;
}
```

- `ReadonlyMap` prevents accidental mutations
- All operations return new `Unit` objects
- Enables predictable, functional programming patterns

### 3. Backward Compatibility

The `questions/units/` module provides **backward-compatible aliases**:

```typescript
// questions/units/operations.ts
export const multiplyUnits = multiply;
export const divideUnits = divide;
export const powerUnit = power;
export const invertUnit = invert;
```

Existing code using the old naming convention continues to work.

## Core Layer: `mathAST/units/`

Location: `src/lib/mathAST/units/`

### Purpose

Provides the foundational unit handling for the entire application:

- MathAST nodes with units
- CAS (Computer Algebra System) operations
- General mathematical expressions

### Modules

#### `types.ts`

Core type definitions:

```typescript
// Physical dimensions
type Dimension =
	| 'length'
	| 'mass'
	| 'time'
	| 'volume'
	| 'electric_current'
	| 'temperature'
	| 'amount'
	| 'luminous_intensity'
	| 'angle'
	| 'currency'
	| 'dimensionless';

// Unit representation
interface Unit {
	readonly components: ReadonlyMap<string, number>; // base symbol → exponent
	readonly coefficient: number; // conversion factor to base
	readonly original?: string; // original input string
}

// Unit definition
interface BaseUnitDef {
	symbol: string;
	baseSymbol: string;
	coefficient: number;
	dimension: Dimension;
	name: string;
}
```

#### `definitions.ts`

Unit catalog:

```typescript
// SI prefixes: symbol → factor
SI_PREFIXES: ReadonlyMap<string, number>;
// 'G' → 1e9, 'M' → 1e6, 'k' → 1e3, ...

// Base units: symbol → { dimension, name }
BASE_UNITS: ReadonlyMap<string, { dimension: Dimension; name: string }>;
// 'm' → { dimension: 'length', name: 'mètre' }

// Special units with custom conversion
SPECIAL_UNITS: ReadonlyMap<string, BaseUnitDef>;
// 'h' → { baseSymbol: 's', coefficient: 3600, ... }

// Aliases for flexible input
UNIT_ALIASES: ReadonlyMap<string, string>;
// 'euro' → '€', 'litre' → 'L', ...

// Resolve any symbol to full definition
function resolveUnit(symbol: string): BaseUnitDef | null;
```

#### `factory.ts`

Unit creation:

```typescript
function unit(symbol: string): Unit | null;
function unitWithPower(symbol: string, power: number): Unit | null;
function dimensionless(): Unit;
function fromComponents(components: ReadonlyMap<string, number>, coefficient?: number): Unit;
```

#### `operations.ts`

Algebraic operations:

```typescript
function multiply(a: Unit, b: Unit): Unit;
function divide(a: Unit, b: Unit): Unit;
function power(u: Unit, n: number): Unit;
function invert(u: Unit): Unit;
function simplify(u: Unit): Unit;
function unitsEqual(a: Unit, b: Unit): boolean;
function unitsEquivalent(a: Unit, b: Unit): boolean;
```

#### `conversion.ts`

Unit conversion:

```typescript
function unitsAreCompatible(a: Unit, b: Unit): boolean;
function getConversionFactor(from: Unit, to: Unit): number | null;
function getDimensionalSignature(u: Unit): Partial<Record<Dimension, number>>;
function normalizeToBase(u: Unit): Unit;
```

#### `parser.ts`

String parsing:

```typescript
function parse(input: string): Unit | null;
function parseOrThrow(input: string): Unit;

// Supported syntax:
// - Simple: 'm', 'kg', 's'
// - Powers: 'm^2', 's^-1'
// - Products: 'm.s', 'm*s', 'm·s'
// - Quotients: 'm/s', 'km/h'
// - Mixed: 'kg.m/s^2'
```

#### `formatter.ts`

Output formatting:

```typescript
type FormatStyle = 'original' | 'dot' | 'fraction';

function format(u: Unit, style?: FormatStyle): string;

// Examples:
// format(km_h, 'original') → 'km/h'
// format(km_h, 'dot')      → 'km·h^-1'
// format(km_h, 'fraction') → 'km/h'
```

## Question Layer: `questions/units/`

Location: `src/lib/questions/units/`

### Purpose

Provides question-specific functionality:

- Answer validation
- LaTeX parsing
- HMS time format
- Compute Engine integration

### Re-export Strategy

The question layer re-exports from mathAST with adaptations:

```typescript
// types.ts - Re-export base types
export type { Unit, Dimension, BaseUnitDef } from '$lib/mathAST/units/types';

// Add question-specific types
export interface Quantity {
	value: number | string;
	unit: Unit;
}

// definitions.ts - Convert ReadonlyMap to Record for compatibility
import { SI_PREFIXES as MATHAST_SI_PREFIXES } from '$lib/mathAST/units/definitions';
export const SI_PREFIXES: Record<string, number> = Object.fromEntries(MATHAST_SI_PREFIXES);
```

### Modules

#### `types.ts`

Extended types for questions:

```typescript
// Re-exports from mathAST
export type { Unit, Dimension, BaseUnitDef } from '$lib/mathAST/units/types';

// Question-specific types
interface Quantity {
	value: number | string; // Can be LaTeX expression
	unit: Unit;
}

interface HMSValue {
	hours: number;
	minutes: number;
	seconds?: number;
	milliseconds?: number;
}

type ParseResult =
	| { success: true; quantity: Quantity }
	| { success: true; hms: HMSValue }
	| { success: false; error: string };

interface QuantityValidationResult {
	status: 'correct' | 'wrong_value' | 'wrong_unit' | 'incompatible_units' | 'parse_error';
	message?: string;
	feedback?: string;
}
```

#### `definitions.ts`

Extended definitions:

```typescript
// Re-exports with Record conversion
export const SI_PREFIXES: Record<string, number>;
export const BASE_UNIT_DEFS: Record<string, { dimension: Dimension; name: string }>;
export const SPECIAL_UNITS: Record<string, BaseUnitDef>;

// Question-specific
export const UNIT_WHITELIST: Set<string>; // For tokenizer
export const BASE_SYMBOL_BY_DIMENSION: Map<Dimension, string>;
export function generateUnitWhitelist(): Set<string>;
```

#### `operations.ts`

Extended operations with aliases:

```typescript
// Backward-compatible aliases
export const multiplyUnits = multiply;
export const divideUnits = divide;
export const powerUnit = power;
export const invertUnit = invert;

// Question-specific creation
export function createUnit(symbol: string): Unit;
export function dimensionlessUnit(): Unit;

// Dimensional type checks
export function isLength(u: Unit): boolean;
export function isMass(u: Unit): boolean;
export function isDuration(u: Unit): boolean;
export function isVolume(u: Unit): boolean;
export function isSpeed(u: Unit): boolean;
export function isArea(u: Unit): boolean;

// Formatting
export function formatUnit(u: Unit, style?: 'fraction' | 'powers'): string;
export function formatUnitUnicode(u: Unit, style?: 'fraction' | 'powers'): string;
```

#### `parser.ts`

LaTeX quantity parsing:

```typescript
// Parse LaTeX quantity (e.g., '150~\unit{km/h}')
export function parseLatexQuantity(latex: string): ParseResult;

// Parse unit expression
export function parseUnitExpression(expr: string): Unit | null;

// Extract unit from LaTeX
export function extractUnitFromLatex(latex: string): Unit | null;

// Normalize unit string
export function normalizeUnitString(str: string): string;
```

#### `dimensional.ts`

Expression dimensional analysis:

```typescript
interface DimensionalError {
	type: 'incompatible_addition' | 'incompatible_comparison' | 'missing_unit';
	message: string;
	left?: Unit;
	right?: Unit;
}

// Check expression consistency
export function checkDimensionalConsistency(expr: MathNode): DimensionalCheckResult;

// Analyze terms in expression
export function analyzeExpression(expr: MathNode): AnalyzedTerm[];

// Convenience functions
export function isDimensionallyConsistent(expr: MathNode): boolean;
export function getDimensionalError(expr: MathNode): DimensionalError | null;
```

#### `validator.ts`

Answer validation:

```typescript
interface ValidationOptions {
	tolerance?: number; // Default: 1e-9
	requireExactUnit?: boolean;
	allowEquivalentUnits?: boolean;
}

interface ValidationResult {
	status: 'correct' | 'wrong_value' | 'wrong_unit' | 'incompatible_units' | 'parse_error';
	message?: string;
	feedback?: string;
}

export function validateQuantityAnswer(
	studentAnswer: string,
	expected: Quantity,
	options?: ValidationOptions
): ValidationResult;
```

#### `ce-integration.ts`

Compute Engine integration:

```typescript
import { ComputeEngine } from '@cortex-js/compute-engine';

// Evaluate quantity value using CE
export function evaluateQuantityValue(quantity: Quantity, ce: ComputeEngine): number | null;

// Compare quantities with tolerance
export function compareQuantities(
	a: Quantity,
	b: Quantity,
	tolerance?: Tolerance
): ComparisonResult;

// Convert quantity to different unit
export function convertQuantity(quantity: Quantity, targetUnit: Unit): Quantity | null;
```

#### `hms.ts`

HMS time operations:

```typescript
// Parsing
export function parseHMS(input: string): HMSValue | null;

// Formatting
export function formatHMS(hms: HMSValue): string;
export function formatHMSLatex(hms: HMSValue): string;

// Conversion
export function hmsToSeconds(hms: HMSValue): number;
export function secondsToHMS(seconds: number): HMSValue;

// Arithmetic
export function addHMS(a: HMSValue, b: HMSValue): HMSValue;
export function subtractHMS(a: HMSValue, b: HMSValue): HMSValue;
export function compareHMS(a: HMSValue, b: HMSValue): -1 | 0 | 1;
```

## Data Flow

### Unit Creation

```
User input: 'km/h'
     │
     ▼
questions/units/createUnit('km/h')
     │
     ▼
mathAST/units/factory/unit('km')  ─────┐
                                       │
mathAST/units/definitions/resolveUnit  │
     │                                 │
     ▼                                 ▼
{ components: Map{'m'=>1},        { components: Map{'s'=>1},
  coefficient: 1000 }               coefficient: 3600 }
     │                                 │
     └────────────┬────────────────────┘
                  │
                  ▼
     mathAST/units/operations/divide
                  │
                  ▼
     { components: Map{'m'=>1, 's'=>-1},
       coefficient: 1000/3600 }
```

### Answer Validation

```
Student answer: '150~\unit{km}'
     │
     ▼
questions/units/parser/parseLatexQuantity
     │
     ▼
{ value: 150, unit: { components: Map{'m'=>1}, coefficient: 1000 } }
     │
     ▼
questions/units/validator/validateQuantityAnswer
     │
     ├──► mathAST/units/conversion/unitsAreCompatible
     │
     ├──► mathAST/units/conversion/getConversionFactor
     │
     └──► Compare normalized values
                  │
                  ▼
     { status: 'correct', message: 'Correct!' }
```

## Import Recommendations

### For Question Authors

Use the question layer for all question-related code:

```typescript
import {
	createUnit,
	multiplyUnits,
	divideUnits,
	formatUnit,
	parseLatexQuantity,
	validateQuantityAnswer
} from '$lib/questions/units';
```

### For AST Operations

Use the mathAST layer for AST manipulation:

```typescript
import { unit, multiply, divide, parse, format } from '$lib/mathAST/units';
```

### For CAS Integration

Both layers can be used:

```typescript
// Using questions/units (recommended for questions)
import { evaluateQuantityValue, compareQuantities } from '$lib/questions/units';

// Using mathAST/units directly (for AST operations)
import { unitsAreCompatible, getConversionFactor } from '$lib/mathAST/units';
```

## Migration Notes

### From Old questions/units

The migration maintains full backward compatibility:

```typescript
// Old code (still works)
import { multiplyUnits, divideUnits } from '$lib/questions/units';

// New code (equivalent)
import { multiply, divide } from '$lib/mathAST/units';
```

### ReadonlyMap vs Map

The core layer uses `ReadonlyMap` for immutability:

```typescript
// mathAST layer
const unit: Unit = {
	components: new Map([['m', 1]]) as ReadonlyMap<string, number>,
	coefficient: 1
};

// Cannot mutate
unit.components.set('s', 1); // TypeScript error!

// questions layer provides mutable helpers if needed
import { toMutableUnit, toImmutableUnit } from '$lib/questions/units/types';
const mutable = toMutableUnit(unit);
mutable.components.set('s', 1); // OK
const immutable = toImmutableUnit(mutable);
```

## See Also

- [API Reference](./api-reference.md)
- [Examples](./examples.md)
- [mathAST Units](../mathAST/units.md)
