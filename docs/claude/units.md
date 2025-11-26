# Units System

Comprehensive guide to the physical units system in UbuMaths for creating questions with numerical answers requiring specific units.

---

## Overview

The UbuMaths unit system provides complete support for physical quantities (value + unit) in mathematical questions. It handles simple units (m, kg, s), composite units (m/s, kg·m²/s²), SI prefixes (km, mg, μL), unit conversions, dimensional analysis, and HMS time notation.

**Location**: `src/lib/questions/units/`

**Key Features**:

- Simple and composite units (m, m^2, m/s, kg·m²/s²)
- SI prefixes from nano to giga (nm, μm, mm, cm, m, km, etc.)
- Special units (h, min, €, $, °, rad, t, q)
- HMS time format (2h30min, 3:25:10)
- Unit arithmetic (multiply, divide, power)
- Unit conversion with tolerance-based comparison
- Dimensional analysis for detecting invalid expressions
- LaTeX parsing from MathLive input
- ComputeEngine integration for expression evaluation

---

## Quick Start

### Basic Question with Unit

```typescript
import { validateQuantityAnswer } from '$lib/questions/units';

// Validate student answer "5000\text{ m }" against expected "5\text{ km }"
const result = validateQuantityAnswer(
	userAnswer, // From MathLive
	expectedAnswer, // Template definition
	{
		tolerance: { absolute: 0.01 } // Optional tolerance
	}
);

if (result.isCorrect) {
	// Answer correct (automatically handles unit conversion)
}
```

### Creating Questions

Use the `numerical_with_unit` question type in your question template:

```typescript
const questionTemplate = {
	type: 'numerical_with_unit' as const,
	question: 'Quelle est la distance en kilomètres ?',
	answer: '5\\text{ km }', // Expected answer with LaTeX unit
	options: {
		tolerance: { relative: 0.01 }, // Allow ±1% error
		requireExactUnit: false // Allow unit conversion (5 km = 5000 m)
	}
};
```

---

## Supported Units

### SI Base Units

Units that can be combined with SI prefixes:

| Unit  | Dimension           | Examples                  |
| ----- | ------------------- | ------------------------- |
| `m`   | Length              | nm, μm, mm, cm, dm, m, km |
| `g`   | Mass                | ng, μg, mg, cg, g, kg     |
| `s`   | Time                | ns, μs, ms, s             |
| `L`   | Volume              | nL, μL, mL, cL, L         |
| `A`   | Electric current    | nA, μA, mA, A             |
| `K`   | Temperature         | K                         |
| `mol` | Amount of substance | nmol, μmol, mmol, mol     |
| `cd`  | Luminous intensity  | cd                        |

### SI Prefixes

| Prefix | Symbol | Factor |
| ------ | ------ | ------ |
| giga   | G      | 10⁹    |
| mega   | M      | 10⁶    |
| kilo   | k      | 10³    |
| hecto  | h      | 10²    |
| deca   | da     | 10¹    |
| (none) | -      | 10⁰    |
| deci   | d      | 10⁻¹   |
| centi  | c      | 10⁻²   |
| milli  | m      | 10⁻³   |
| micro  | μ      | 10⁻⁶   |
| nano   | n      | 10⁻⁹   |
| pico   | p      | 10⁻¹²  |

### Special Units (No Standard Prefixes)

**Time**:

- `ms` - millisecond (0.001 s)
- `min` - minute (60 s)
- `h` - hour (3600 s)
- `j` - day (86400 s)
- `semaine` - week
- `mois` - month (30 days)
- `an` - year (365 days)

**Angle**:

- `rad` - radian (base)
- `°` or `deg` - degree (π/180 rad)

**Mass**:

- `t` - metric ton (1,000,000 g)
- `q` - quintal (100,000 g)

**Currency**:

- `€` or `euro` - euro
- `$` - dollar

### Composite Units

Units can be combined using multiplication and division:

**Syntax**:

- Multiplication: `*`, `.`, `·` (e.g., `kg*m`, `kg.m`, `kg·m`)
- Division: `/` (e.g., `m/s`, `kg/m^3`)
- Powers: `^` (e.g., `m^2`, `s^-1`)

**Common Examples**:

| Unit         | Meaning        | Dimension                   |
| ------------ | -------------- | --------------------------- |
| `m^2`        | Area           | length²                     |
| `m^3`        | Volume         | length³                     |
| `m/s`        | Velocity       | length·time⁻¹               |
| `m/s^2`      | Acceleration   | length·time⁻²               |
| `kg·m/s^2`   | Force (Newton) | mass·length·time⁻²          |
| `kg·m^2/s^2` | Energy (Joule) | mass·length²·time⁻²         |
| `km/h`       | Speed          | length·time⁻¹ (with prefix) |

---

## Question Type: numerical_with_unit

### Basic Configuration

```typescript
{
	type: 'numerical_with_unit',
	question: 'Quelle est la vitesse en m/s ?',
	answer: '25\\text{ m/s }',
	options: {
		tolerance: { absolute: 0.1 }, // ±0.1 m/s tolerance
		requireExactUnit: false,      // Allow unit conversion
		requireSameSymbol: false      // Don't require exact unit symbol
	}
}
```

### Validation Options

**`tolerance`** (optional)

Define how much numeric error is acceptable:

```typescript
// Absolute tolerance
tolerance: { absolute: 0.01 }  // Accept ±0.01 difference

// Relative tolerance
tolerance: { relative: 0.01 }  // Accept ±1% difference

// Both (accepts if either is satisfied)
tolerance: { absolute: 0.1, relative: 0.02 }
```

**`requireExactUnit`** (optional, default: `false`)

When `true`, student must provide the exact same unit (no conversion):

```typescript
// With requireExactUnit: true
// Expected: 5 km
// "5000 m" -> INCORRECT (even though equivalent)
// "5 km"   -> CORRECT
requireExactUnit: true;
```

**`requireSameSymbol`** (optional, default: `false`)

When `true`, student must use the same unit symbol representation:

```typescript
// With requireSameSymbol: true
// Expected: m/s
// "m·s^-1" -> INCORRECT (different notation)
// "m/s"    -> CORRECT
requireSameSymbol: true;
```

### Example: Speed Conversion

```typescript
{
	type: 'numerical_with_unit',
	question: 'Un véhicule roule à 90 km/h. Convertir en m/s.',
	answer: '25\\text{ m/s }',
	options: {
		tolerance: { relative: 0.01 },
		requireExactUnit: false // Allow "25 m/s" or "0.025 km/s"
	}
}
```

### Example: Exact Unit Required

```typescript
{
	type: 'numerical_with_unit',
	question: 'Convertir 2500 m en kilomètres.',
	answer: '2.5\\text{ km }',
	options: {
		requireExactUnit: true // Student MUST answer in km
	}
}
```

---

## HMS Time Support

HMS (Hours-Minutes-Seconds) provides special formatting for time values.

### Parsing HMS

```typescript
import { parseHMS, hmsToSeconds } from '$lib/questions/units';

// Unit notation
parseHMS('2h30min'); // { hours: 2, minutes: 30, seconds: 0 }
parseHMS('1h 45min 30s'); // { hours: 1, minutes: 45, seconds: 30 }
parseHMS('45min'); // { hours: 0, minutes: 45, seconds: 0 }

// Colon notation
parseHMS('3:25'); // { hours: 3, minutes: 25, seconds: 0 }
parseHMS('3:25:10'); // { hours: 3, minutes: 25, seconds: 10 }
parseHMS('00:45:30'); // { hours: 0, minutes: 45, seconds: 30 }
```

### Formatting HMS

```typescript
import { formatHMS, formatHMSLatex } from '$lib/questions/units';

const hms = { hours: 2, minutes: 30, seconds: 45 };

formatHMS(hms, 'units'); // "2h 30min 45s"
formatHMS(hms, 'colon'); // "2:30:45"
formatHMS(hms, 'short'); // "2h30min45s" (no spaces)

formatHMSLatex(hms); // "2\\text{h} 30\\text{min} 45\\text{s}"
```

### Converting HMS

```typescript
import { hmsToSeconds, secondsToHMS } from '$lib/questions/units';

// To seconds
hmsToSeconds({ hours: 1, minutes: 30, seconds: 45 }); // 5445

// From seconds
secondsToHMS(5445); // { hours: 1, minutes: 30, seconds: 45 }
secondsToHMS(150); // { hours: 0, minutes: 2, seconds: 30 }
```

### HMS Arithmetic

```typescript
import { addHMS, subtractHMS, normalizeHMS } from '$lib/questions/units';

// Addition
const a = { hours: 1, minutes: 30 };
const b = { hours: 0, minutes: 45 };
addHMS(a, b); // { hours: 2, minutes: 15, seconds: 0 }

// Subtraction
subtractHMS(a, b); // { hours: 0, minutes: 45, seconds: 0 }

// Normalization (60s -> 1min, 60min -> 1h)
normalizeHMS({ hours: 0, minutes: 0, seconds: 90 });
// { hours: 0, minutes: 1, seconds: 30 }
```

---

## Dimensional Analysis

Prevent students from adding incompatible dimensions (e.g., meters + kilograms).

### Checking Consistency

```typescript
import { checkDimensionalConsistency } from '$lib/questions/units';

// Valid expression
const result1 = checkDimensionalConsistency('5\\text{ m } + 3\\text{ km }');
// { isConsistent: true, errors: [], terms: [...] }

// Invalid expression (different dimensions)
const result2 = checkDimensionalConsistency('5\\text{ m } + 3\\text{ kg }');
// {
//   isConsistent: false,
//   errors: [{
//     type: 'addition_mismatch',
//     message: "Impossible d'additionner longueur et masse.",
//     terms: ['5\\text{ m }', '3\\text{ kg }'],
//     dimensions: [{ length: 1 }, { mass: 1 }]
//   }],
//   terms: [...]
// }
```

### Quick Check

```typescript
import { isDimensionallyConsistent, getDimensionalError } from '$lib/questions/units';

// Boolean check
isDimensionallyConsistent('5\\text{ m } + 3\\text{ km }'); // true
isDimensionallyConsistent('5\\text{ m } + 3\\text{ kg }'); // false

// Get error message
getDimensionalError('5\\text{ m } + 3\\text{ kg }');
// "Impossible d'additionner longueur et masse."
```

### Dimension Names

```typescript
import { getDimensionName } from '$lib/questions/units';

// Simple dimensions
getDimensionName({ length: 1 }); // "longueur"
getDimensionName({ mass: 1 }); // "masse"
getDimensionName({ time: 1 }); // "temps"

// Composite dimensions
getDimensionName({ length: 1, time: -1 }); // "vitesse"
getDimensionName({ length: 2 }); // "surface"
getDimensionName({ mass: 1, length: 2, time: -2 }); // "energie"

// Unknown dimensions
getDimensionName({ length: 4 }); // "dimension inconnue (L^4)"
```

---

## API Reference

### Core Functions

**`createUnit(symbol: string): Unit`**

Create a unit from a symbol.

```typescript
import { createUnit } from '$lib/questions/units';

const km = createUnit('km');
// { components: Map{'m' => 1}, coefficient: 1000 }
```

**`parseLatexQuantity(latex: string): Quantity | null`**

Parse a LaTeX quantity string (value + unit).

```typescript
import { parseLatexQuantity } from '$lib/questions/units';

const quantity = parseLatexQuantity('5\\text{ km }');
// {
//   value: 5,
//   unit: { components: Map{'m' => 1}, coefficient: 1000 }
// }
```

**`validateQuantityAnswer(userAnswer: string, expectedAnswer: string, options?: ValidationOptions): ValidationResult`**

Main validation function for checking student answers.

```typescript
import { validateQuantityAnswer } from '$lib/questions/units';

const result = validateQuantityAnswer('5000\\text{ m }', '5\\text{ km }', {
	tolerance: { absolute: 0.1 },
	requireExactUnit: false
});

// {
//   isCorrect: true,
//   feedback: null,
//   errorType: undefined,
//   parsed: { value: 5000, unit: 'm' },
//   expected: { value: 5, unit: 'km' }
// }
```

### Unit Operations

**`multiplyUnits(a: Unit, b: Unit): Unit`**

Multiply two units.

```typescript
import { createUnit, multiplyUnits } from '$lib/questions/units';

const kg = createUnit('kg');
const m = createUnit('m');
const s = createUnit('s');

const force = multiplyUnits(kg, divideUnits(m, powerUnit(s, 2)));
// kg·m/s^2 (Newton)
```

**`divideUnits(a: Unit, b: Unit): Unit`**

Divide two units.

```typescript
import { createUnit, divideUnits } from '$lib/questions/units';

const m = createUnit('m');
const s = createUnit('s');

const velocity = divideUnits(m, s);
// m/s
```

**`powerUnit(u: Unit, exponent: number): Unit`**

Raise a unit to a power.

```typescript
import { createUnit, powerUnit } from '$lib/questions/units';

const m = createUnit('m');
const area = powerUnit(m, 2);
// m^2
```

### Unit Comparison

**`unitsAreCompatible(a: Unit, b: Unit): boolean`**

Check if two units have compatible dimensions (can be converted).

```typescript
import { createUnit, unitsAreCompatible } from '$lib/questions/units';

const km = createUnit('km');
const m = createUnit('m');
const s = createUnit('s');

unitsAreCompatible(km, m); // true (both length)
unitsAreCompatible(km, s); // false (length vs time)
```

**`getConversionFactor(from: Unit, to: Unit): number | null`**

Get the factor to convert from one unit to another.

```typescript
import { createUnit, getConversionFactor } from '$lib/questions/units';

const km = createUnit('km');
const m = createUnit('m');

getConversionFactor(km, m); // 1000 (1 km = 1000 m)
getConversionFactor(m, km); // 0.001 (1 m = 0.001 km)
```

### Unit Formatting

**`formatUnit(u: Unit, style?: 'fraction' | 'powers'): string`**

Format a unit as a string.

```typescript
import { createUnit, divideUnits, formatUnit } from '$lib/questions/units';

const m = createUnit('m');
const s = createUnit('s');
const velocity = divideUnits(m, s);

formatUnit(velocity, 'fraction'); // "m/s"
formatUnit(velocity, 'powers'); // "m·s^-1"
```

**`formatUnitUnicode(u: Unit, style?: 'fraction' | 'powers'): string`**

Format unit with Unicode superscripts.

```typescript
import { createUnit, powerUnit, formatUnitUnicode } from '$lib/questions/units';

const m = createUnit('m');
const area = powerUnit(m, 2);

formatUnitUnicode(area); // "m²" (Unicode superscript)
```

### ComputeEngine Integration

**`compareQuantities(userAnswer: string, expected: string, tolerance?: Tolerance): ComparisonResult`**

Compare two quantities with automatic unit conversion.

```typescript
import { compareQuantities } from '$lib/questions/units';

const result = compareQuantities('5\\text{ km }', '5000\\text{ m }', { absolute: 0.1 });

// {
//   isEqual: true,
//   userValue: 5,
//   expectedValue: 5000,
//   userUnit: 'km',
//   expectedUnit: 'm'
// }
```

**`convertQuantity(quantity: string, targetUnit: string): Quantity | null`**

Convert a quantity to a different unit.

```typescript
import { convertQuantity } from '$lib/questions/units';

const converted = convertQuantity('5\\text{ km }', 'm');
// { value: 5000, unit: { components: Map{'m' => 1}, coefficient: 1 } }
```

**`normalizeToBaseUnits(latex: string): Quantity | null`**

Normalize to SI base units (removes prefixes).

```typescript
import { normalizeToBaseUnits } from '$lib/questions/units';

normalizeToBaseUnits('5\\text{ km }');
// { value: 5000, unit: { components: Map{'m' => 1}, coefficient: 1 } }

normalizeToBaseUnits('90\\text{ km/h }');
// { value: 25, unit: { components: Map{'m' => 1, 's' => -1}, coefficient: 1 } }
```

---

## Dimensional Checking Utilities

**`isLength(u: Unit): boolean`**

Check if unit is a length.

```typescript
import { createUnit, isLength } from '$lib/questions/units';

isLength(createUnit('m')); // true
isLength(createUnit('km')); // true
isLength(createUnit('m^2')); // false (area)
```

**`isMass(u: Unit): boolean`**

Check if unit is a mass.

**`isDuration(u: Unit): boolean`**

Check if unit is a time duration.

**`isVolume(u: Unit): boolean`**

Check if unit is a volume (L or m^3).

```typescript
import { createUnit, isVolume } from '$lib/questions/units';

isVolume(createUnit('L')); // true
isVolume(createUnit('mL')); // true
isVolume(createUnit('m^3')); // true (cubic length)
isVolume(createUnit('cm^3')); // true
```

**`isSpeed(u: Unit): boolean`**

Check if unit represents speed (length/time).

**`isArea(u: Unit): boolean`**

Check if unit is an area (length^2).

**`isDimensionless(u: Unit): boolean`**

Check if unit has no physical dimension.

---

## LaTeX Parsing Patterns

The parser recognizes units in various LaTeX formats from MathLive:

**Text Mode**:

```latex
5\text{ km }     → 5 km
3.14\text{m}     → 3.14 m
```

**Math Roman**:

```latex
5\mathrm{km}     → 5 km
```

**Operator Name**:

```latex
5\operatorname{km}  → 5 km
```

**Tilde Separator**:

```latex
5~km             → 5 km
25~€             → 25 €
```

**Backslash Space**:

```latex
5\ km            → 5 km
```

**Composite Units**:

```latex
90\text{ km/h }               → 90 km/h
25\text{ m/s }                → 25 m/s
9.8\text{ m/s}^{2}            → 9.8 m/s²
1.5\text{ kg}\cdot\text{m}^{2}/\text{s}^{2}  → 1.5 kg·m²/s²
```

---

## Common Patterns

### Speed-Distance-Time Problems

```typescript
{
	type: 'numerical_with_unit',
	question: 'Une voiture parcourt 180 km en 2 heures. Quelle est sa vitesse moyenne en km/h ?',
	answer: '90\\text{ km/h }',
	options: {
		tolerance: { absolute: 0.1 },
		requireExactUnit: false // Accept "25 m/s" as equivalent
	}
}
```

### Unit Conversion

```typescript
{
	type: 'numerical_with_unit',
	question: 'Convertir 2.5 kg en grammes.',
	answer: '2500\\text{ g }',
	options: {
		requireExactUnit: true // Must answer in grams
	}
}
```

### Area/Volume

```typescript
{
	type: 'numerical_with_unit',
	question: 'Calculer l\'aire d\'un carré de côté 5 m.',
	answer: '25\\text{ m}^{2}',
	options: {
		tolerance: { absolute: 0.01 }
	}
}
```

### Physics (Force, Energy)

```typescript
{
	type: 'numerical_with_unit',
	question: 'Quelle force faut-il appliquer pour accélérer une masse de 2 kg à 5 m/s² ?',
	answer: '10\\text{ kg}\\cdot\\text{m}/\\text{s}^{2}', // 10 N
	options: {
		tolerance: { relative: 0.01 }
	}
}
```

---

## Best Practices

### 1. Always Use Tolerance for Real-World Values

```typescript
// ✅ Good - accounts for rounding
tolerance: {
	absolute: 0.01;
}

// ❌ Bad - requires exact match (often fails due to float precision)
tolerance: undefined;
```

### 2. Choose Appropriate Tolerance Mode

```typescript
// For small absolute values (e.g., 0.001 to 10)
tolerance: {
	absolute: 0.001;
}

// For large values or percentages (e.g., 1000, 1000000)
tolerance: {
	relative: 0.01;
} // 1% tolerance
```

### 3. Use requireExactUnit for Conversion Practice

```typescript
// When testing conversion skills
{
	question: 'Convertir 5000 m en kilomètres.',
	answer: '5\\text{ km }',
	options: {
		requireExactUnit: true  // Student must use km, not m
	}
}
```

### 4. Allow Unit Conversion for Applied Problems

```typescript
// When testing problem-solving (not conversion)
{
	question: 'Quelle est la vitesse ?',
	answer: '25\\text{ m/s }',
	options: {
		requireExactUnit: false  // Allow km/h, m/s, etc.
	}
}
```

### 5. Use Dimensional Analysis for Complex Expressions

```typescript
import { checkDimensionalConsistency } from '$lib/questions/units';

// Before validating answer, check if expression is dimensionally valid
const check = checkDimensionalConsistency(userExpression);

if (!check.isConsistent) {
	// Show dimensional error to student
	return {
		isCorrect: false,
		feedback: check.errors[0].message
	};
}
```

---

## Error Messages (French)

The system provides French error messages for common mistakes:

| Error Type           | Message                                 | When It Occurs                              |
| -------------------- | --------------------------------------- | ------------------------------------------- |
| `invalid_input`      | "Réponse invalide. Vérifiez le format." | Cannot parse answer                         |
| `incompatible_units` | "Les unités ne sont pas compatibles."   | Different dimensions (m vs kg)              |
| `wrong_unit`         | "Unité incorrecte."                     | requireExactUnit or requireSameSymbol fails |
| `wrong_value`        | "Valeur incorrecte."                    | Value wrong, unit correct                   |
| `wrong_both`         | "Valeur et unité incorrectes."          | Both wrong                                  |

Custom messages can be provided via `ValidationOptions`:

```typescript
validateQuantityAnswer(userAnswer, expected, {
	messages: {
		incorrectUnit: 'Vous devez répondre en kilomètres.',
		incorrectValue: 'La valeur numérique est incorrecte.',
		incompatibleUnit: "L'unité n'est pas compatible avec la question."
	}
});
```

---

## Testing

All unit system functions are thoroughly tested. See:

- **Types & Definitions**: `src/lib/questions/units/definitions.test.ts`
- **Operations**: `src/lib/questions/units/operations.test.ts`
- **Parser**: `src/lib/questions/units/parser.test.ts`
- **HMS**: `src/lib/questions/units/hms.test.ts`
- **Validator**: `src/lib/questions/units/validator.test.ts`
- **Dimensional Analysis**: `src/lib/questions/units/dimensional.test.ts`
- **ComputeEngine Integration**: `src/lib/questions/units/ce-integration.test.ts`

---

## Migration from TinyCAS

The unit system was inspired by TinyCAS unit handling but provides:

- **Better TypeScript Support**: Full type safety with discriminated unions
- **Svelte Integration**: Works seamlessly with MathLive and ComputeEngine
- **Dimensional Analysis**: Prevents invalid expressions (m + kg)
- **HMS Support**: Native time format parsing and formatting
- **Comprehensive Validation**: Detailed error feedback for students
- **SI Prefix System**: Automatic resolution of prefixed units (km, mg, μL)

---

## Summary Checklist

When creating questions with units:

- [ ] Use `numerical_with_unit` question type
- [ ] Include unit in answer with LaTeX syntax (e.g., `\text{ km }`)
- [ ] Specify tolerance if approximate answers acceptable
- [ ] Use `requireExactUnit: true` for conversion practice
- [ ] Use `requireExactUnit: false` for applied problems
- [ ] Test with common variations (different prefixes, notations)
- [ ] Verify dimensional consistency for complex expressions
- [ ] Provide clear French error messages when needed

---

[← Back to Claude Docs](./README.md)
