# Physical Units System

Type-safe representation and manipulation of physical units.

## Overview

The units system provides:

- **Immutable Unit representation** with SI prefixes
- **Arithmetic operations**: multiply, divide, power, invert
- **Unit conversion** with dimensional analysis
- **Flexible parsing**: `m/s`, `km.h^-1`, `kg*m*s^-2`
- **Multiple output formats**: dot, fraction, original

## Quick Start

```typescript
import { unit, parse, multiply, divide, getConversionFactor, format } from '$lib/mathAST/units';

// Create units
const meter = unit('m');
const second = unit('s');
const velocity = divide(meter, second); // m/s

// Parse unit strings
const kmh = parse('km/h');

// Convert between units
const factor = getConversionFactor(kmh, velocity);
// 100 km/h * factor = 27.78 m/s

// Format for display
format(kmh, 'original'); // "km/h"
format(kmh, 'fraction'); // "km/h"
format(velocity, 'dot'); // "m·s^-1"
```

## Unit Type

```typescript
interface Unit {
	readonly components: ReadonlyMap<string, number>;
	readonly coefficient: number;
	readonly original?: string;
}

// Example: km/h
// components: Map { 'm' => 1, 's' => -1 }
// coefficient: 1000 / 3600 = 0.277...
// original: 'km/h'
```

## Factory Functions

### Basic Creation

```typescript
import { unit, unitWithPower, dimensionless, fromComponents } from '$lib/mathAST/units';

// Simple unit
unit('m'); // meter
unit('kg'); // kilogram
unit('s'); // second

// Unit with power
unitWithPower('m', 2); // m^2
unitWithPower('s', -1); // s^-1

// Dimensionless
dimensionless(); // no dimension

// From components map
fromComponents(
	new Map([
		['m', 1],
		['s', -2]
	]),
	1.0
); // m/s^2
```

### Parsing

```typescript
import { parse, parseOrThrow } from '$lib/mathAST/units';

// Returns Unit | null
parse('m/s'); // velocity
parse('km/h'); // velocity (different scale)
parse('kg*m/s^2'); // force (Newton)
parse('invalid'); // null

// Throws on error
parseOrThrow('m/s'); // velocity
parseOrThrow('???'); // throws Error
```

### Supported Syntax

| Format   | Example               | Notes       |
| -------- | --------------------- | ----------- |
| Simple   | `m`, `kg`, `s`        | Base units  |
| Prefixed | `km`, `mg`, `ns`      | SI prefixes |
| Power    | `m^2`, `s^-1`         | Exponents   |
| Multiply | `m.s`, `m*s`, `m·s`   | Products    |
| Divide   | `m/s`, `km/h`         | Quotients   |
| Mixed    | `kg.m/s^2`, `km.h^-1` | Combined    |

## Supported Units

### Base Units

| Dimension | Base | Aliases |
| --------- | ---- | ------- |
| Length    | m    | -       |
| Mass      | g    | -       |
| Time      | s    | -       |
| Volume    | L    | -       |
| Angle     | rad  | -       |
| Currency  | -    | -       |

### Derived Units

| Quantity     | Symbol | Base Units    |
| ------------ | ------ | ------------- |
| Area         | m^2    | length^2      |
| Volume       | m^3    | length^3      |
| Speed        | m/s    | length/time   |
| Acceleration | m/s^2  | length/time^2 |
| Force        | N      | kg\*m/s^2     |
| Energy       | J      | kg\*m^2/s^2   |
| Power        | W      | kg\*m^2/s^3   |

### SI Prefixes

| Prefix | Symbol | Factor |
| ------ | ------ | ------ |
| giga   | G      | 10^9   |
| mega   | M      | 10^6   |
| kilo   | k      | 10^3   |
| hecto  | h      | 10^2   |
| deca   | da     | 10^1   |
| deci   | d      | 10^-1  |
| centi  | c      | 10^-2  |
| milli  | m      | 10^-3  |
| micro  | u, mu  | 10^-6  |
| nano   | n      | 10^-9  |
| pico   | p      | 10^-12 |

### Special Units

| Category | Units                           |
| -------- | ------------------------------- |
| Time     | min (minute), h (hour), j (day) |
| Mass     | t (tonne), q (quintal)          |
| Angle    | ° (degree), deg                 |
| Currency | EUR, $                          |

## Operations

### Arithmetic

```typescript
import { multiply, divide, power, invert, simplify } from '$lib/mathAST/units';

const m = unit('m');
const s = unit('s');
const kg = unit('kg');

// Multiply: m * s
multiply(m, s);
// components: { m: 1, s: 1 }

// Divide: m / s
divide(m, s);
// components: { m: 1, s: -1 }

// Power: m^2
power(m, 2);
// components: { m: 2 }

// Invert: 1/s = s^-1
invert(s);
// components: { s: -1 }

// Simplify: remove zero exponents
const complex = multiply(m, invert(m));
simplify(complex); // dimensionless
```

### Comparison

```typescript
import { unitsEqual, unitsEquivalent } from '$lib/mathAST/units';

const ms1 = parse('m/s');
const ms2 = divide(unit('m'), unit('s'));

// Strict equality (same components and coefficient)
unitsEqual(ms1, ms2); // true

// Equivalent dimension (compatible for conversion)
unitsEquivalent(parse('km/h'), parse('m/s')); // true
unitsEquivalent(parse('m'), parse('s')); // false
```

## Conversion

### Compatibility Check

```typescript
import { unitsAreCompatible, getDimensionalSignature } from '$lib/mathAST/units';

// Check if convertible
unitsAreCompatible(parse('km'), parse('m')); // true
unitsAreCompatible(parse('km'), parse('kg')); // false

// Get dimensional signature
getDimensionalSignature(parse('m/s'));
// { length: 1, time: -1 }

getDimensionalSignature(parse('kg*m/s^2'));
// { mass: 1, length: 1, time: -2 }
```

### Conversion Factor

```typescript
import { getConversionFactor, normalizeToBase } from '$lib/mathAST/units';

// Get conversion multiplier
getConversionFactor(parse('km'), parse('m'));
// 1000 (1 km = 1000 m)

getConversionFactor(parse('h'), parse('s'));
// 3600 (1 h = 3600 s)

getConversionFactor(parse('km/h'), parse('m/s'));
// 0.277... (1 km/h = 0.277... m/s)

// Convert value
const speedKmh = 100; // 100 km/h
const factor = getConversionFactor(parse('km/h'), parse('m/s'));
const speedMs = speedKmh * factor; // 27.78 m/s

// Normalize to SI base units
normalizeToBase(parse('km'));
// { components: { m: 1 }, coefficient: 1000 }
```

## Formatting

```typescript
import { format } from '$lib/mathAST/units';

const unit = parse('km/h');

// Original format (preserves input)
format(unit, 'original'); // "km/h"

// Dot notation (normalized)
format(unit, 'dot'); // "km·h^-1"

// Fraction notation
format(unit, 'fraction'); // "km/h"
```

## Integration with MathAST

### UnitNode

```typescript
import { MathAST, parseLatex, toLatex } from '$lib/mathAST';
import { parse as parseUnit } from '$lib/mathAST/units';

// Create expression with unit
const expr = MathAST.withUnit(MathAST.number('10'), parseUnit('m/s'));

toLatex(expr); // "10~\unit{m/s}"

// Using quantity shorthand
const velocity = MathAST.quantity(MathAST.variable('v'), 'm/s');
toLatex(velocity); // "v~\unit{m/s}"

// Variable with unit
const mass = MathAST.quantityVar('m', 'kg');
toLatex(mass); // "m~\unit{kg}"
```

### Custom Syntax

```typescript
import { parseCustom, toCustom } from '$lib/mathAST';

// Parse with unit notation
const expr = parseCustom('10 [m/s]');
// Creates: UnitNode(number('10'), m/s)

// Generate custom syntax
toCustom(expr); // "10 [m/s]"
```

## Dimensional Analysis

```typescript
import { getDimensionalSignature, unitsAreCompatible } from '$lib/mathAST/units';

// Check dimensional consistency
function checkDimensional(leftUnit: Unit, rightUnit: Unit): boolean {
	return unitsAreCompatible(leftUnit, rightUnit);
}

// Velocity = Distance / Time
const v = parse('m/s');
const d = parse('m');
const t = parse('s');

// v * t should equal d
const result = multiply(v, t);
unitsAreCompatible(result, d); // true

// Physical equation checking
// F = m * a  =>  kg*m/s^2 = kg * m/s^2
const force = parse('kg*m/s^2');
const massUnit = parse('kg');
const accel = parse('m/s^2');

unitsAreCompatible(force, multiply(massUnit, accel)); // true
```

## Type Definitions

### Dimension

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

### Dimensional Signature

```typescript
type DimensionalSignature = Partial<Record<Dimension, number>>;

// Example: m/s^2
// { length: 1, time: -2 }

// Example: kg*m^2/s^3 (power)
// { mass: 1, length: 2, time: -3 }
```

## Error Handling

```typescript
import { parse, parseOrThrow } from '$lib/mathAST/units';

// Safe parsing
const unit = parse('invalid_unit');
if (unit === null) {
	console.error('Invalid unit');
}

// Throwing version
try {
	parseOrThrow('invalid_unit');
} catch (e) {
	console.error('Parse error:', e.message);
}

// Conversion error
const m = parse('m');
const s = parse('s');
try {
	getConversionFactor(m, s); // throws: incompatible dimensions
} catch (e) {
	console.error('Cannot convert:', e.message);
}
```

## Complete Example

```typescript
import {
	parse,
	unit,
	multiply,
	divide,
	power,
	getConversionFactor,
	format,
	unitsAreCompatible
} from '$lib/mathAST/units';
import { MathAST, evaluate, parseLatex } from '$lib/mathAST';

// Physics problem: Calculate kinetic energy
// KE = 0.5 * m * v^2

const mass = 5; // kg
const velocity = 36; // km/h

// Convert velocity to m/s
const vUnit = parse('km/h');
const targetUnit = parse('m/s');
const vMs = velocity * getConversionFactor(vUnit, targetUnit);
// 36 km/h * 0.277... = 10 m/s

// Calculate kinetic energy
const ke = 0.5 * mass * vMs ** 2;
// 0.5 * 5 * 100 = 250 J

// Verify unit: kg * (m/s)^2 = kg*m^2/s^2 = J
const keUnit = multiply(unit('kg'), power(parse('m/s'), 2));
const joule = parse('kg*m^2/s^2');
unitsAreCompatible(keUnit, joule); // true

// Create MathAST expression
const keExpr = MathAST.withUnit(MathAST.number(String(ke)), joule);
// "250 kg*m^2/s^2" or "250 J"
```

## See Also

- [Types & Nodes](./types.md) - UnitNode definition
- [Parsing](./parsing.md) - Unit syntax in expressions
- [Evaluation](./evaluation.md) - Numeric computation with units
