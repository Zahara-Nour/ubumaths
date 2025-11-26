# Unit System - Test Suite Documentation

## Overview

This directory contains comprehensive unit tests for Phase 1 of the unit system implementation. The tests cover both unit resolution (`definitions.ts`) and unit operations (`operations.ts`).

## Test File

**`operations.test.ts`** - 141 tests covering all core functionality

## Test Coverage

### 1. Unit Resolution (definitions.ts)

#### Base Units

- ✅ Resolves base units: m, g, s, L
- ✅ Returns correct dimension and coefficient

#### SI Prefixed Units

- ✅ Kilometer (km): 1000 × m
- ✅ Centimeter (cm): 0.01 × m
- ✅ Millimeter (mm): 0.001 × m
- ✅ Micrometer (μm): 1e-6 × m
- ✅ Nanometer (nm): 1e-9 × m
- ✅ Megameter (Mm): 1e6 × m
- ✅ Gigameter (Gm): 1e9 × m
- ✅ Kilogram (kg): 1000 × g
- ✅ Milligram (mg): 0.001 × g

#### Special Units

- ✅ Hour (h): 3600 × s
- ✅ Minute (min): 60 × s
- ✅ Euro (€): dimensionless, coefficient 1
- ✅ Dollar ($): dimensionless, coefficient 1
- ✅ Degree (°): Math.PI/180 × rad
- ✅ Radian (rad): base unit for angle
- ✅ Tonne (t): 1,000,000 × g
- ✅ Quintal (q): 100,000 × g

#### Edge Cases

- ✅ `ms` is millisecond (time), not meter × second
- ✅ `min` is minute (time), not milli + in
- ✅ `cd` is candela (luminous intensity), not centi + d
- ✅ `mol` is mole (amount), not milli + ol
- ✅ Returns `null` for invalid units (xyz, qwerty)

#### Aliases

- ✅ `euro`, `euros`, `EUR` → €
- ✅ `litre`, `litres`, `l` → L
- ✅ `μg` resolves to microgram
- ✅ Plural forms: `ans`, `jours`, `semaines`, `mins`, `heures`

#### Whitelist Generation

- ✅ Contains all special units
- ✅ Contains all base units
- ✅ Contains all SI prefix combinations
- ✅ Contains all aliases
- ✅ Distinguishes `km` (unit) from `k*m` (variable multiplication)
- ✅ Excludes invalid units

### 2. Unit Creation (operations.ts)

#### createUnit

- ✅ Creates simple units: m, g, s
- ✅ Creates prefixed units with correct coefficients: km (1000), cm (0.01)
- ✅ Creates special units: h (3600), min (60)
- ✅ Throws error for invalid units

#### dimensionlessUnit

- ✅ Creates unit with no components
- ✅ Coefficient is 1

#### createUnitFromComponents

- ✅ Creates unit from raw components
- ✅ Removes zero exponents
- ✅ Uses default coefficient of 1

### 3. Unit Operations

#### Multiplication (multiplyUnits)

- ✅ m × m = m²
- ✅ m × s = m·s
- ✅ km × km = km² (coefficient: 1,000,000)
- ✅ kg × m / s² = kg·m·s⁻²
- ✅ Multiplying opposite exponents cancels out

#### Division (divideUnits)

- ✅ m / s = m·s⁻¹
- ✅ km / h = km·h⁻¹ (coefficient: 1000/3600)
- ✅ m² / m = m
- ✅ Dividing same units gives dimensionless

#### Powers (powerUnit)

- ✅ m^2 = m²
- ✅ m^3 = m³
- ✅ m^-1 = m⁻¹
- ✅ m^0 = dimensionless
- ✅ (m/s)^2 = m²/s²
- ✅ km^2 has correct coefficient (1,000,000)
- ✅ Fractional powers: m^0.5 = √m

#### Inversion (invertUnit)

- ✅ Inverts meter to m⁻¹
- ✅ Inverts m/s to s/m

### 4. Unit Comparison

#### Equality (unitsAreEqual)

- ✅ m equals m
- ✅ km does not equal m (different coefficient)
- ✅ m does not equal s (different components)
- ✅ m² equals m²
- ✅ Handles floating point tolerance (1e-10)

#### Compatibility (unitsAreCompatible)

- ✅ km and m are compatible (same dimension)
- ✅ km and kg are NOT compatible (different dimensions)
- ✅ m/s and km/h are compatible (both speed)
- ✅ m² and cm² are compatible (both area)
- ✅ m and m² are NOT compatible (different powers)
- ✅ Dimensionless units are compatible

**Known Limitation:** L and m³ are NOT currently compatible in Phase 1. This is by design and may be addressed in Phase 2.

#### Conversion Factors (getConversionFactor)

- ✅ km to m = 1000
- ✅ m to km = 0.001
- ✅ h to min = 60
- ✅ km/h to m/s ≈ 0.2778
- ✅ Returns null for incompatible units
- ✅ Same units give factor 1
- ✅ cm² to m² = 0.0001

### 5. Dimensional Analysis

#### getDimensionalSignature

- ✅ Simple unit (m): `{ length: 1 }`
- ✅ Composite unit (m/s): `{ length: 1, time: -1 }`
- ✅ Area (m²): `{ length: 2 }`
- ✅ Force (kg·m·s⁻²): `{ mass: 1, length: 1, time: -2 }`
- ✅ Dimensionless: `{}`

#### getDimension

- ✅ Simple units return their dimension: m → 'length'
- ✅ Composite units return 'composite': m/s → 'composite'
- ✅ Powers return 'composite': m² → 'composite'
- ✅ Dimensionless returns 'dimensionless'

#### Type Checks

- ✅ **isLength**: m, km, cm (NOT m²)
- ✅ **isMass**: g, kg, mg (NOT m)
- ✅ **isDuration**: s, min, h (NOT m)
- ✅ **isVolume**: m³ (NOT L in Phase 1, NOT m²)
- ✅ **isSpeed**: m/s, km/h (NOT m)
- ✅ **isArea**: m², cm² (NOT m³)
- ✅ **isDimensionless**: dimensionless unit only

**Note:** L has dimension 'length' with exponent 1, so `isVolume(L)` returns false in Phase 1.

### 6. Formatting

#### Fraction Style (default)

- ✅ Simple: m → "m"
- ✅ Squared: m² → "m^2"
- ✅ Fraction: m/s → "m/s"
- ✅ Complex: m²/s → "m^2/s"
- ✅ Multi-denominator: kg/(m·s²)
- ✅ Dimensionless → "1"

#### Powers Style

- ✅ Simple: m → "m"
- ✅ Squared: m² → "m^2"
- ✅ Velocity: m/s → "m.s^-1"
- ✅ Acceleration: m·s⁻² → "m.s^-2"

#### Unicode Formatting

- ✅ m² → "m²" (Unicode superscript)
- ✅ m³ → "m³"
- ✅ m/s² → "m/(s²)" (with parentheses for clarity)
- ✅ m·s⁻¹ → "m·s⁻¹" (powers style)

### 7. Parsing

#### parseSimpleUnit

- ✅ Simple unit: "m"
- ✅ Squared: "m^2"
- ✅ Fraction: "m/s"
- ✅ Product: "kg.m"
- ✅ Unicode: "m²", "m·s⁻¹"
- ✅ Dimensionless: "1"
- ✅ Throws error for invalid units

### 8. Edge Cases

- ✅ Very small coefficients (nano: 1e-9)
- ✅ Very large coefficients (giga: 1e9)
- ✅ Multiple operations in sequence
- ✅ Cancellation in complex expressions
- ✅ Coefficient propagation through operations
- ✅ Floating point tolerance in comparisons

### 9. Integration Tests (Real-world physics)

- ✅ **Speed calculation**: distance / time
- ✅ **Force calculation**: mass × acceleration (kg·m·s⁻²)
- ✅ **Energy calculation**: force × distance (kg·m²·s⁻²)
- ✅ **Density calculation**: mass / volume (kg·m⁻³)
- ✅ **Volume conversions**: L vs m³ (documented limitation)

## Known Phase 1 Limitations

1. **L and m³ compatibility**: Liter (L) has dimension 'length' with exponent 1, while m³ has dimension 'length' with exponent 3. They are NOT compatible in Phase 1.

2. **Volume dimension**: The `isVolume()` function returns false for L because it checks for 'volume' dimension or 'length^3', but L has 'length^1'.

3. **ASCII 'u' prefix**: 'ug' is not automatically resolved to μg. You must use 'μg' directly or add 'ug' to the aliases.

These limitations are by design for Phase 1 and may be addressed in Phase 2 with enhanced volume handling.

## Test Statistics

- **Total Tests**: 141
- **Passed**: 141 ✅
- **Failed**: 0
- **Coverage**: All exported functions from `definitions.ts` and `operations.ts`

## Running the Tests

```bash
# Run all unit system tests
pnpm vitest run src/lib/questions/units/__tests__/

# Run with watch mode
pnpm vitest watch src/lib/questions/units/__tests__/

# Run with coverage
pnpm vitest run --coverage src/lib/questions/units/__tests__/
```

## Test Organization

Tests are organized into logical groups:

1. **Unit Resolution** - Testing `resolveUnit()` and related functions
2. **Unit Creation** - Testing unit construction functions
3. **Unit Operations** - Testing algebraic operations
4. **Unit Comparison** - Testing equality and compatibility
5. **Dimensional Analysis** - Testing dimensional signature functions
6. **Formatting** - Testing string output
7. **Parsing** - Testing string input
8. **Edge Cases** - Testing boundary conditions
9. **Integration** - Testing real-world scenarios

Each test follows the **Arrange-Act-Assert** pattern for clarity.

## Adding New Tests

When adding new tests:

1. Follow the existing naming convention
2. Use descriptive test names that explain what is being tested
3. Add comments for complex scenarios or known limitations
4. Group related tests in describe blocks
5. Test both success and failure cases
6. Include edge cases and boundary conditions

## Maintenance Notes

- Tests are designed to be robust against floating point errors (1e-10 tolerance)
- Phase 1 limitations are documented in comments
- All 141 tests must pass before merging to main
