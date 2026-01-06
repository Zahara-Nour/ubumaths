# Units API Reference

Complete API documentation for the units system.

## Table of Contents

- [Types](#types)
- [Unit Creation](#unit-creation)
- [Unit Operations](#unit-operations)
- [Unit Comparison](#unit-comparison)
- [Unit Conversion](#unit-conversion)
- [Dimensional Analysis](#dimensional-analysis)
- [Formatting](#formatting)
- [Parsing](#parsing)
- [Validation](#validation)
- [HMS Operations](#hms-operations)
- [Compute Engine Integration](#compute-engine-integration)
- [Definitions](#definitions)

---

## Types

### `Unit`

Represents a physical unit.

```typescript
interface Unit {
	readonly components: ReadonlyMap<string, number>;
	readonly coefficient: number;
	readonly original?: string;
}
```

| Property      | Type                          | Description                       |
| ------------- | ----------------------------- | --------------------------------- |
| `components`  | `ReadonlyMap<string, number>` | Base symbol → exponent mapping    |
| `coefficient` | `number`                      | Conversion factor to SI base      |
| `original`    | `string` (optional)           | Original input string (if parsed) |

**Example:**

```typescript
// km/h
{
  components: Map { 'm' => 1, 's' => -1 },
  coefficient: 0.2777..., // 1000/3600
  original: 'km/h'
}
```

### `Dimension`

Physical dimension type.

```typescript
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
```

### `Quantity`

Value with unit.

```typescript
interface Quantity {
	value: number | string; // Can be LaTeX expression
	unit: Unit;
}
```

### `HMSValue`

Hours-Minutes-Seconds time value.

```typescript
interface HMSValue {
	hours: number;
	minutes: number;
	seconds?: number;
	milliseconds?: number;
}
```

### `ParseResult`

Result of parsing a quantity.

```typescript
type ParseResult =
	| { success: true; quantity: Quantity }
	| { success: true; hms: HMSValue }
	| { success: false; error: string };
```

### `ValidationResult`

Result of answer validation.

```typescript
interface ValidationResult {
	status: 'correct' | 'wrong_value' | 'wrong_unit' | 'incompatible_units' | 'parse_error';
	message?: string;
	feedback?: string;
}
```

---

## Unit Creation

### `createUnit(symbol)`

Create a unit from a symbol string.

```typescript
import { createUnit } from '$lib/questions/units';

function createUnit(symbol: string): Unit;
```

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `symbol`  | `string` | Unit symbol |

**Returns:** `Unit` object

**Throws:** `Error` if symbol is not recognized

**Examples:**

```typescript
createUnit('m'); // meter
createUnit('km'); // kilometer (coefficient: 1000)
createUnit('h'); // hour (coefficient: 3600)
createUnit('€'); // euro
```

### `dimensionlessUnit()`

Create a dimensionless unit (for pure numbers).

```typescript
import { dimensionlessUnit } from '$lib/questions/units';

function dimensionlessUnit(): Unit;
```

**Returns:** `Unit` with empty components and coefficient 1

### `createUnitFromComponents(components, coefficient?)`

Create a unit from raw components.

```typescript
import { createUnitFromComponents } from '$lib/questions/units';

function createUnitFromComponents(components: Map<string, number>, coefficient?: number): Unit;
```

| Parameter     | Type                  | Description         |
| ------------- | --------------------- | ------------------- |
| `components`  | `Map<string, number>` | Base symbol → power |
| `coefficient` | `number` (default: 1) | Conversion factor   |

**Example:**

```typescript
// Create m/s^2
createUnitFromComponents(
	new Map([
		['m', 1],
		['s', -2]
	]),
	1
);
```

---

## Unit Operations

### `multiplyUnits(a, b)` / `multiply(a, b)`

Multiply two units.

```typescript
import { multiplyUnits } from '$lib/questions/units';
// or
import { multiply } from '$lib/mathAST/units';

function multiplyUnits(a: Unit, b: Unit): Unit;
```

**Examples:**

```typescript
const m = createUnit('m');
const s = createUnit('s');

multiplyUnits(m, s); // m·s
multiplyUnits(m, m); // m^2
```

### `divideUnits(a, b)` / `divide(a, b)`

Divide two units.

```typescript
import { divideUnits } from '$lib/questions/units';

function divideUnits(a: Unit, b: Unit): Unit;
```

**Examples:**

```typescript
const m = createUnit('m');
const s = createUnit('s');

divideUnits(m, s); // m/s (velocity)
divideUnits(m, m); // dimensionless
```

### `powerUnit(u, n)` / `power(u, n)`

Raise unit to a power.

```typescript
import { powerUnit } from '$lib/questions/units';

function powerUnit(u: Unit, n: number): Unit;
```

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `u`       | `Unit`   | Base unit   |
| `n`       | `number` | Exponent    |

**Examples:**

```typescript
powerUnit(createUnit('m'), 2); // m^2 (area)
powerUnit(createUnit('m'), 3); // m^3 (volume)
powerUnit(createUnit('s'), -1); // s^-1 (frequency)
powerUnit(createUnit('m'), 0); // dimensionless
```

### `invertUnit(u)` / `invert(u)`

Invert a unit (u^-1).

```typescript
import { invertUnit } from '$lib/questions/units';

function invertUnit(u: Unit): Unit;
```

**Example:**

```typescript
invertUnit(createUnit('s')); // s^-1 (frequency)
```

---

## Unit Comparison

### `unitsAreEqual(a, b)`

Check if two units are exactly equal.

```typescript
import { unitsAreEqual } from '$lib/questions/units';

function unitsAreEqual(a: Unit, b: Unit): boolean;
```

Checks both components and coefficients with tolerance `1e-10`.

**Examples:**

```typescript
unitsAreEqual(createUnit('m'), createUnit('m')); // true
unitsAreEqual(createUnit('km'), createUnit('m')); // false (different coefficient)
```

### `unitsAreCompatible(a, b)`

Check if two units have the same dimension (can be converted).

```typescript
import { unitsAreCompatible } from '$lib/questions/units';

function unitsAreCompatible(a: Unit, b: Unit): boolean;
```

**Examples:**

```typescript
unitsAreCompatible(createUnit('km'), createUnit('m')); // true
unitsAreCompatible(createUnit('m'), createUnit('s')); // false
unitsAreCompatible(
	divideUnits(createUnit('km'), createUnit('h')),
	divideUnits(createUnit('m'), createUnit('s'))
); // true (both velocity)
```

---

## Unit Conversion

### `getConversionFactor(from, to)`

Get the conversion factor between compatible units.

```typescript
import { getConversionFactor } from '$lib/questions/units';

function getConversionFactor(from: Unit, to: Unit): number | null;
```

**Returns:** Conversion factor or `null` if incompatible

**Examples:**

```typescript
getConversionFactor(createUnit('km'), createUnit('m')); // 1000
getConversionFactor(createUnit('h'), createUnit('min')); // 60
getConversionFactor(createUnit('h'), createUnit('s')); // 3600

// km/h to m/s
const kmh = divideUnits(createUnit('km'), createUnit('h'));
const ms = divideUnits(createUnit('m'), createUnit('s'));
getConversionFactor(kmh, ms); // 0.2777... (1000/3600)
```

### `getDimensionalSignature(u)`

Get the dimensional signature of a unit.

```typescript
import { getDimensionalSignature } from '$lib/questions/units';

function getDimensionalSignature(u: Unit): Partial<Record<Dimension, number>>;
```

**Examples:**

```typescript
getDimensionalSignature(createUnit('m'));
// { length: 1 }

getDimensionalSignature(divideUnits(createUnit('m'), createUnit('s')));
// { length: 1, time: -1 }

getDimensionalSignature(powerUnit(createUnit('m'), 2));
// { length: 2 }
```

### `normalizeUnit(u)`

Create a normalized copy of a unit.

```typescript
import { normalizeUnit } from '$lib/questions/units';

function normalizeUnit(u: Unit): Unit;
```

---

## Dimensional Analysis

### `getDimension(u)`

Get the primary dimension of a unit.

```typescript
import { getDimension } from '$lib/questions/units';

function getDimension(u: Unit): Dimension | 'composite';
```

**Examples:**

```typescript
getDimension(createUnit('m')); // 'length'
getDimension(createUnit('kg')); // 'mass'
getDimension(createUnit('s')); // 'time'
getDimension(powerUnit(createUnit('m'), 2)); // 'composite'
getDimension(divideUnits(createUnit('m'), createUnit('s'))); // 'composite'
```

### Type Check Functions

```typescript
import {
	isLength,
	isMass,
	isDuration,
	isVolume,
	isSpeed,
	isArea,
	isDimensionless
} from '$lib/questions/units';

function isLength(u: Unit): boolean;
function isMass(u: Unit): boolean;
function isDuration(u: Unit): boolean;
function isVolume(u: Unit): boolean;
function isSpeed(u: Unit): boolean;
function isArea(u: Unit): boolean;
function isDimensionless(u: Unit): boolean;
```

**Examples:**

```typescript
isLength(createUnit('m')); // true
isLength(createUnit('km')); // true
isLength(powerUnit(createUnit('m'), 2)); // false

isMass(createUnit('kg')); // true
isDuration(createUnit('h')); // true
isVolume(createUnit('L')); // true
isVolume(powerUnit(createUnit('m'), 3)); // true

isSpeed(divideUnits(createUnit('m'), createUnit('s'))); // true
isArea(powerUnit(createUnit('m'), 2)); // true
```

### `checkDimensionalConsistency(expr)`

Check if a math expression is dimensionally consistent.

```typescript
import { checkDimensionalConsistency } from '$lib/questions/units';

interface DimensionalCheckResult {
	valid: boolean;
	error?: string;
}

function checkDimensionalConsistency(expr: MathNode): DimensionalCheckResult;
```

---

## Formatting

### `formatUnit(u, style?)`

Format a unit as a string.

```typescript
import { formatUnit } from '$lib/questions/units';

type UnitFormatStyle = 'fraction' | 'powers';

function formatUnit(u: Unit, style?: UnitFormatStyle): string;
```

| Parameter | Type                                 | Description    |
| --------- | ------------------------------------ | -------------- |
| `u`       | `Unit`                               | Unit to format |
| `style`   | `'fraction'` (default) or `'powers'` | Output style   |

**Examples:**

```typescript
const velocity = divideUnits(createUnit('m'), createUnit('s'));

formatUnit(velocity, 'fraction'); // 'm/s'
formatUnit(velocity, 'powers'); // 'm.s^-1'

formatUnit(powerUnit(createUnit('m'), 2), 'fraction'); // 'm^2'
formatUnit(dimensionlessUnit(), 'fraction'); // '1'
```

### `formatUnitUnicode(u, style?)`

Format with Unicode superscripts.

```typescript
import { formatUnitUnicode } from '$lib/questions/units';

function formatUnitUnicode(u: Unit, style?: UnitFormatStyle): string;
```

**Examples:**

```typescript
formatUnitUnicode(powerUnit(createUnit('m'), 2)); // 'm²'
formatUnitUnicode(powerUnit(createUnit('m'), 3)); // 'm³'
formatUnitUnicode(divideUnits(createUnit('m'), createUnit('s')), 'powers'); // 'm·s⁻¹'
```

---

## Parsing

### `parseLatexQuantity(latex)`

Parse a LaTeX quantity string.

```typescript
import { parseLatexQuantity } from '$lib/questions/units';

function parseLatexQuantity(latex: string): ParseResult;
```

**Supported formats:**

- `150~\unit{km/h}`
- `3,5~\unit{m}`
- `\frac{1}{2}~\unit{L}`

**Examples:**

```typescript
const result = parseLatexQuantity('150~\\unit{km/h}');
if (result.success) {
	console.log(result.quantity.value); // 150
	console.log(result.quantity.unit); // Unit object for km/h
}

const error = parseLatexQuantity('invalid');
if (!error.success) {
	console.log(error.error); // Error message
}
```

### `parseUnitExpression(expr)`

Parse a unit expression string.

```typescript
import { parseUnitExpression } from '$lib/questions/units';

function parseUnitExpression(expr: string): Unit | null;
```

**Supported syntax:**

- Simple: `m`, `km`, `s`
- Powers: `m^2`, `s^-1`
- Products: `m.s`, `m*s`, `m·s`
- Quotients: `m/s`, `km/h`
- Unicode: `m²`, `m·s⁻¹`

### `parseSimpleUnit(str)`

Parse a simple unit string.

```typescript
import { parseSimpleUnit } from '$lib/questions/units';

function parseSimpleUnit(str: string): Unit;
```

**Throws:** Error if parsing fails

---

## Validation

### `validateQuantityAnswer(studentAnswer, expected, options?)`

Validate a student's quantity answer.

```typescript
import { validateQuantityAnswer } from '$lib/questions/units';

interface ValidationOptions {
	tolerance?: number; // Default: 1e-9
	requireExactUnit?: boolean; // Default: false
	allowEquivalentUnits?: boolean; // Default: true
}

function validateQuantityAnswer(
	studentAnswer: string,
	expected: Quantity,
	options?: ValidationOptions
): ValidationResult;
```

**Status values:**

| Status               | Description                        |
| -------------------- | ---------------------------------- |
| `correct`            | Value and unit are both correct    |
| `wrong_value`        | Unit is correct but value is wrong |
| `wrong_unit`         | Value is correct but unit is wrong |
| `incompatible_units` | Units have different dimensions    |
| `parse_error`        | Could not parse student answer     |

**Examples:**

```typescript
const expected = { value: 150, unit: createUnit('km') };

validateQuantityAnswer('150~\\unit{km}', expected);
// { status: 'correct' }

validateQuantityAnswer('150000~\\unit{m}', expected);
// { status: 'correct' } (equivalent)

validateQuantityAnswer('160~\\unit{km}', expected);
// { status: 'wrong_value' }

validateQuantityAnswer('150~\\unit{kg}', expected);
// { status: 'incompatible_units' }
```

---

## HMS Operations

### `parseHMS(input)`

Parse an HMS time string.

```typescript
import { parseHMS } from '$lib/questions/units';

function parseHMS(input: string): HMSValue | null;
```

**Supported formats:**

- `3h30min45s`
- `2h15min`
- `45min30s`
- `1h 23min 45s`

### `formatHMS(hms)` / `formatHMSLatex(hms)`

Format an HMS value.

```typescript
import { formatHMS, formatHMSLatex } from '$lib/questions/units';

function formatHMS(hms: HMSValue): string;
function formatHMSLatex(hms: HMSValue): string;
```

**Examples:**

```typescript
formatHMS({ hours: 3, minutes: 30, seconds: 45 }); // '3h30min45s'
formatHMSLatex({ hours: 3, minutes: 30, seconds: 45 }); // '3~\text{h}~30~\text{min}~45~\text{s}'
```

### Conversion

```typescript
import { hmsToSeconds, secondsToHMS, minutesToHMS } from '$lib/questions/units';

function hmsToSeconds(hms: HMSValue): number;
function secondsToHMS(seconds: number): HMSValue;
function minutesToHMS(minutes: number): HMSValue;
```

### Arithmetic

```typescript
import { addHMS, subtractHMS, compareHMS, normalizeHMS } from '$lib/questions/units';

function addHMS(a: HMSValue, b: HMSValue): HMSValue;
function subtractHMS(a: HMSValue, b: HMSValue): HMSValue;
function compareHMS(a: HMSValue, b: HMSValue): -1 | 0 | 1;
function normalizeHMS(hms: HMSValue): HMSValue;
```

---

## Compute Engine Integration

### `evaluateQuantityValue(quantity, ce)`

Evaluate a quantity's value using Compute Engine.

```typescript
import { evaluateQuantityValue } from '$lib/questions/units';
import { ComputeEngine } from '@cortex-js/compute-engine';

function evaluateQuantityValue(quantity: Quantity, ce: ComputeEngine): number | null;
```

### `compareQuantities(a, b, tolerance?)`

Compare two quantities.

```typescript
import { compareQuantities } from '$lib/questions/units';

interface Tolerance {
	relative?: number;
	absolute?: number;
}

type ComparisonResult = 'equal' | 'different' | 'incompatible';

function compareQuantities(a: Quantity, b: Quantity, tolerance?: Tolerance): ComparisonResult;
```

### `convertQuantity(quantity, targetUnit)`

Convert a quantity to a different unit.

```typescript
import { convertQuantity } from '$lib/questions/units';

function convertQuantity(quantity: Quantity, targetUnit: Unit): Quantity | null;
```

---

## Definitions

### Constants

```typescript
import {
	SI_PREFIXES,
	BASE_UNIT_DEFS,
	SPECIAL_UNITS,
	UNIT_ALIASES,
	UNIT_WHITELIST,
	BASE_SYMBOL_BY_DIMENSION
} from '$lib/questions/units';
```

| Constant                   | Type                                | Description              |
| -------------------------- | ----------------------------------- | ------------------------ |
| `SI_PREFIXES`              | `Record<string, number>`            | Prefix → factor          |
| `BASE_UNIT_DEFS`           | `Record<string, {dimension, name}>` | Base unit definitions    |
| `SPECIAL_UNITS`            | `Record<string, BaseUnitDef>`       | Special unit definitions |
| `UNIT_ALIASES`             | `Record<string, string>`            | Alias → canonical symbol |
| `UNIT_WHITELIST`           | `Set<string>`                       | All valid unit symbols   |
| `BASE_SYMBOL_BY_DIMENSION` | `Map<Dimension, string>`            | Dimension → base symbol  |

### `resolveUnit(symbol)`

Resolve a unit symbol to its full definition.

```typescript
import { resolveUnit } from '$lib/questions/units';

function resolveUnit(symbol: string): BaseUnitDef | null;
```

**Example:**

```typescript
resolveUnit('km');
// {
//   symbol: 'km',
//   baseSymbol: 'm',
//   coefficient: 1000,
//   dimension: 'length',
//   name: 'kilomètre'
// }
```

### `isValidUnit(symbol)`

Check if a symbol is a valid unit.

```typescript
import { isValidUnit } from '$lib/questions/units';

function isValidUnit(symbol: string): boolean;
```

---

## See Also

- [Architecture](./architecture.md)
- [Examples](./examples.md)
- [HMS Time](./hms.md)
