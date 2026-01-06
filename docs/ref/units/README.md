# Units System

Comprehensive physical units system for mathematical expressions in UbuMaths.

## Overview

The units system provides type-safe handling of physical units throughout the application. It supports SI units, composite units, unit conversions, dimensional analysis, and validation of student answers involving quantities.

**Key Features:**

- SI base units and prefixes (pico to giga)
- Composite units with arbitrary powers (`m/s`, `kg.m.s^-2`)
- HMS (Hours-Minutes-Seconds) time format
- LaTeX parsing and rendering
- Answer validation with tolerance
- Integration with Compute Engine

## Architecture

The system is organized into two layers:

```
mathAST/units/        Source of truth (immutable, functional)
       │
       ▼
questions/units/      Consumer layer (backward-compatible, question-specific)
```

### Core Layer: `mathAST/units/`

Location: `src/lib/mathAST/units/`

The **immutable core** providing:

- Unit type definitions with `ReadonlyMap`
- SI prefixes and base unit definitions
- Pure arithmetic operations (multiply, divide, power, invert)
- Unit conversion with dimensional analysis
- String parsing and formatting

[Detailed architecture](./architecture.md#core-layer)

### Question Layer: `questions/units/`

Location: `src/lib/questions/units/`

The **question-specific layer** providing:

- Backward-compatible aliases (`multiplyUnits`, `divideUnits`)
- Quantity type (value + unit)
- HMS time handling
- LaTeX quantity parsing
- Answer validation
- Compute Engine integration

[Detailed architecture](./architecture.md#question-layer)

## Quick Start

### Creating Units

```typescript
import { createUnit, divideUnits, formatUnit } from '$lib/questions/units';

// Simple units
const m = createUnit('m');
const s = createUnit('s');
const km = createUnit('km');

// Composite unit
const velocity = divideUnits(m, s); // m/s

// Format for display
formatUnit(velocity); // 'm/s'
formatUnit(velocity, 'powers'); // 'm.s^-1'
```

### Checking Compatibility

```typescript
import { unitsAreCompatible, getConversionFactor } from '$lib/questions/units';

const km = createUnit('km');
const m = createUnit('m');
const s = createUnit('s');

unitsAreCompatible(km, m); // true (both length)
unitsAreCompatible(km, s); // false (length vs time)

getConversionFactor(km, m); // 1000 (1 km = 1000 m)
```

### Parsing Quantities

```typescript
import { parseLatexQuantity } from '$lib/questions/units';

const result = parseLatexQuantity('150~\\unit{km/h}');
if (result.success) {
	console.log(result.quantity.value); // 150
	console.log(result.quantity.unit); // { components: Map{'m'=>1,'s'=>-1}, coefficient: 0.277... }
}
```

### Validating Answers

```typescript
import { validateQuantityAnswer } from '$lib/questions/units';

const expected = { value: 150, unit: createUnit('km') };
const studentAnswer = '150~\\unit{km}';

const result = validateQuantityAnswer(studentAnswer, expected);
// { status: 'correct', message: 'Correct!' }
```

## Documentation Index

| Document                            | Description                     |
| ----------------------------------- | ------------------------------- |
| [Architecture](./architecture.md)   | Two-layer system design         |
| [API Reference](./api-reference.md) | Complete function documentation |
| [Examples](./examples.md)           | Practical use cases             |
| [HMS Time](./hms.md)                | Hours-Minutes-Seconds handling  |
| [mathAST Integration](./mathast.md) | Unit nodes in AST               |

## Supported Units

### Base Units

| Dimension           | Symbol | Name (FR) |
| ------------------- | ------ | --------- |
| Length              | m      | mètre     |
| Mass                | g      | gramme    |
| Time                | s      | seconde   |
| Volume              | L      | litre     |
| Angle               | rad    | radian    |
| Electric current    | A      | ampère    |
| Temperature         | K      | kelvin    |
| Amount of substance | mol    | mole      |
| Luminous intensity  | cd     | candela   |

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
| micro  | μ      | 10^-6  |
| nano   | n      | 10^-9  |
| pico   | p      | 10^-12 |

### Special Units

| Category | Units                                   |
| -------- | --------------------------------------- |
| Time     | ms, min, h, j (jour), semaine, mois, an |
| Mass     | t (tonne), q (quintal)                  |
| Angle    | ° (degree), deg                         |
| Currency | € (euro), $ (dollar)                    |

## Testing

```bash
# All unit tests
pnpm test:server src/lib/questions/units --run

# mathAST unit tests
pnpm test:server src/lib/mathAST/units --run
```

Combined: **1,100+ tests** covering all modules.

## File Structure

```
src/lib/
├── mathAST/units/           # Core layer (source of truth)
│   ├── types.ts             # Unit, Dimension, BaseUnitDef
│   ├── definitions.ts       # SI_PREFIXES, BASE_UNITS, resolveUnit
│   ├── factory.ts           # unit(), dimensionless(), fromComponents()
│   ├── operations.ts        # multiply, divide, power, invert
│   ├── conversion.ts        # unitsAreCompatible, getConversionFactor
│   ├── parser.ts            # parse(), parseOrThrow()
│   ├── formatter.ts         # format()
│   └── index.ts             # Public exports
│
└── questions/units/         # Question layer (consumer)
    ├── types.ts             # Re-exports + Quantity, HMS, ValidationResult
    ├── definitions.ts       # Re-exports + whitelist generation
    ├── operations.ts        # Re-exports + aliases + helpers
    ├── parser.ts            # LaTeX quantity parsing
    ├── dimensional.ts       # Expression dimensional analysis
    ├── validator.ts         # Answer validation
    ├── ce-integration.ts    # Compute Engine integration
    ├── hms.ts               # HMS time operations
    ├── tokenizer.ts         # Unit string tokenization
    └── index.ts             # Public exports
```

## See Also

- [mathAST Documentation](../mathAST/index.md)
- [mathAST Units](../mathAST/units.md)
- [Questions System](../questions/)
