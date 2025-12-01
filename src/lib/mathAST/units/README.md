# Unit AST System

Type-safe representation and manipulation of physical units for the MathAST.

## Overview

The Unit AST system provides immutable, type-safe tools for working with physical units. It supports parsing, arithmetic operations, conversions, and formatting.

**Key Features:**

- Immutable `Unit` interface with `ReadonlyMap` components
- SI prefix support (pico to giga)
- Arithmetic: multiply, divide, power, invert
- Unit conversion with dimensional analysis
- Flexible parsing (`m/s`, `km.h^-1`, `kg*m*s^-2`)
- Multiple output formats (dot, fraction, original)

## Quick Start

```typescript
import { unit, parse, multiply, divide, getConversionFactor, format } from '$lib/mathAST/units';

// Create units
const m = unit('m');
const s = unit('s');
const km_h = parse('km/h');

// Operations
const velocity = divide(m, s); // m/s
const acceleration = parse('m.s^-2'); // m/s²

// Conversion
const factor = getConversionFactor(km_h, velocity);
// 100 km/h * factor = 27.78 m/s

// Format
format(km_h, 'original'); // 'km/h'
format(km_h, 'fraction'); // 'm/s'
```

## API Reference

### Factory Functions

```typescript
unit('km'); // Unit from symbol
unitWithPower('m', 2); // m²
dimensionless(); // Dimensionless unit
fromComponents(map, coeff); // Direct creation
```

### Parsing

```typescript
parse('m/s'); // Unit | null
parseOrThrow('m/s'); // Unit (throws on error)
```

**Supported syntax:**

- Simple: `m`, `km`, `h`, `°`, `€`
- Powers: `m^2`, `s^-1`
- Multiplication: `m.s`, `m*s`, `m·s`
- Division: `m/s`, `km/h`
- Mixed: `kg.m/s^2`

### Operations

```typescript
multiply(a, b); // a × b
divide(a, b); // a / b
power(u, n); // u^n
invert(u); // u^-1
simplify(u); // Remove zero exponents
unitsEqual(a, b); // Strict equality
unitsEquivalent(a, b); // Same dimension
```

### Conversion

```typescript
unitsAreCompatible(a, b); // Same dimension?
getConversionFactor(from, to); // Conversion multiplier
getDimensionalSignature(u); // { length: 1, time: -1 }
normalizeToBase(u); // Normalize to SI base
```

### Formatting

```typescript
format(u, 'original'); // Preserve input (e.g., 'km/h')
format(u, 'dot'); // Normalized (e.g., 'm.s^-1')
format(u, 'fraction'); // Fraction (e.g., 'm/s')
```

## Types

### `Unit`

```typescript
interface Unit {
	readonly components: ReadonlyMap<string, number>;
	readonly coefficient: number;
	readonly original?: string;
}
```

### `Dimension`

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

## Supported Units

| Category | Base | Prefixed           | Special   |
| -------- | ---- | ------------------ | --------- |
| Length   | m    | km, cm, mm, μm, nm | -         |
| Mass     | g    | kg, mg, μg         | t, q      |
| Time     | s    | ms, ns             | min, h, j |
| Volume   | L    | mL, cL             | -         |
| Angle    | rad  | -                  | °, deg    |
| Currency | -    | -                  | €, $      |

**SI Prefixes:** G, M, k, h, da, d, c, m, μ, n, p

## Testing

```bash
pnpm test:server src/lib/mathAST/units/
```

336 tests covering all modules.

## Files

- `types.ts` - Type definitions
- `definitions.ts` - Unit catalog, resolveUnit()
- `factory.ts` - Unit creation functions
- `operations.ts` - Arithmetic operations
- `conversion.ts` - Unit conversion
- `parser.ts` - String parsing
- `formatter.ts` - Output formatting
- `index.ts` - Public exports
