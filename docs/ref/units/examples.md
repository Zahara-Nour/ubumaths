# Units System Examples

Practical examples for using the units system in questions.

## Table of Contents

- [Basic Unit Operations](#basic-unit-operations)
- [Speed-Distance-Time Problems](#speed-distance-time-problems)
- [Unit Conversion Questions](#unit-conversion-questions)
- [Physics Problems](#physics-problems)
- [Answer Validation](#answer-validation)
- [HMS Time Problems](#hms-time-problems)
- [Custom Syntax Integration](#custom-syntax-integration)

---

## Basic Unit Operations

### Creating and Combining Units

```typescript
import {
	createUnit,
	multiplyUnits,
	divideUnits,
	powerUnit,
	formatUnit
} from '$lib/questions/units';

// Simple units
const m = createUnit('m');
const s = createUnit('s');
const kg = createUnit('kg');

// Velocity: m/s
const velocity = divideUnits(m, s);
console.log(formatUnit(velocity)); // 'm/s'

// Area: m²
const area = powerUnit(m, 2);
console.log(formatUnit(area)); // 'm^2'

// Volume: m³
const volume = powerUnit(m, 3);
console.log(formatUnit(volume)); // 'm^3'

// Force: kg·m·s⁻² (Newton)
const force = divideUnits(multiplyUnits(kg, m), powerUnit(s, 2));
console.log(formatUnit(force)); // 'g.m/s^2' (uses base unit g)
console.log(formatUnit(force, 'powers')); // 'g.m.s^-2'
```

### Working with Prefixed Units

```typescript
import { createUnit, getConversionFactor, formatUnit } from '$lib/questions/units';

// Prefixed length units
const km = createUnit('km'); // kilometer (1000 m)
const cm = createUnit('cm'); // centimeter (0.01 m)
const mm = createUnit('mm'); // millimeter (0.001 m)

// Check coefficients
console.log(km.coefficient); // 1000
console.log(cm.coefficient); // 0.01
console.log(mm.coefficient); // 0.001

// Conversion factors
console.log(getConversionFactor(km, createUnit('m'))); // 1000
console.log(getConversionFactor(createUnit('m'), km)); // 0.001
```

---

## Speed-Distance-Time Problems

### Basic Speed Calculation

```typescript
import {
	createUnit,
	divideUnits,
	multiplyUnits,
	getConversionFactor,
	unitsAreCompatible
} from '$lib/questions/units';

// Problem: A car travels 150 km in 2 hours. What is its speed?

const distance = 150; // km
const time = 2; // h

// Create units
const km = createUnit('km');
const h = createUnit('h');

// Calculate speed in km/h
const speedValue = distance / time; // 75
const speedUnit = divideUnits(km, h);

console.log(`Speed: ${speedValue} ${formatUnit(speedUnit)}`); // 'Speed: 75 km/h'

// Convert to m/s
const ms = divideUnits(createUnit('m'), createUnit('s'));
const factor = getConversionFactor(speedUnit, ms);
const speedMs = speedValue * factor;

console.log(`Speed: ${speedMs.toFixed(2)} m/s`); // 'Speed: 20.83 m/s'
```

### Travel Time Calculation

```typescript
import { createUnit, divideUnits, multiplyUnits, getConversionFactor } from '$lib/questions/units';

// Problem: How long to travel 240 km at 80 km/h?

const distance = 240; // km
const speed = 80; // km/h

// time = distance / speed
const timeHours = distance / speed; // 3 hours

// Convert to minutes
const h = createUnit('h');
const min = createUnit('min');
const factor = getConversionFactor(h, min);
const timeMinutes = timeHours * factor;

console.log(`Time: ${timeHours} h = ${timeMinutes} min`); // 'Time: 3 h = 180 min'
```

### Distance Calculation with Mixed Units

```typescript
import { createUnit, divideUnits, getConversionFactor } from '$lib/questions/units';

// Problem: A cyclist travels at 25 km/h for 45 minutes. Distance?

const speed = 25; // km/h
const timeMinutes = 45; // min

// Convert time to hours
const min = createUnit('min');
const h = createUnit('h');
const timeHours = timeMinutes * getConversionFactor(min, h); // 0.75 h

// Calculate distance
const distance = speed * timeHours; // 18.75 km

console.log(`Distance: ${distance} km`);
```

---

## Unit Conversion Questions

### Length Conversions

```typescript
import { createUnit, getConversionFactor } from '$lib/questions/units';

// Convert 3.5 km to meters
const km = createUnit('km');
const m = createUnit('m');
const valueKm = 3.5;
const valueM = valueKm * getConversionFactor(km, m);
console.log(`${valueKm} km = ${valueM} m`); // '3.5 km = 3500 m'

// Convert 250 cm to meters
const cm = createUnit('cm');
const valueCm = 250;
const valueMFromCm = valueCm * getConversionFactor(cm, m);
console.log(`${valueCm} cm = ${valueMFromCm} m`); // '250 cm = 2.5 m'
```

### Area Conversions

```typescript
import { createUnit, powerUnit, getConversionFactor } from '$lib/questions/units';

// Convert 2.5 m² to cm²
const m2 = powerUnit(createUnit('m'), 2);
const cm2 = powerUnit(createUnit('cm'), 2);

const areaM2 = 2.5;
const areaCm2 = areaM2 * getConversionFactor(m2, cm2);
console.log(`${areaM2} m² = ${areaCm2} cm²`); // '2.5 m² = 25000 cm²'
```

### Volume Conversions

```typescript
import { createUnit, powerUnit, getConversionFactor } from '$lib/questions/units';

// Convert 2 L to mL
const L = createUnit('L');
const mL = createUnit('mL');

const volumeL = 2;
const volumeML = volumeL * getConversionFactor(L, mL);
console.log(`${volumeL} L = ${volumeML} mL`); // '2 L = 2000 mL'

// Note: m³ and L are not directly compatible in dimensional analysis
// (different base dimensions), but you can use the known conversion
// 1 L = 0.001 m³ = 1 dm³
```

### Time Conversions

```typescript
import { createUnit, getConversionFactor } from '$lib/questions/units';

// Convert 2.5 hours to minutes
const h = createUnit('h');
const min = createUnit('min');
const s = createUnit('s');

const timeH = 2.5;
const timeMin = timeH * getConversionFactor(h, min);
const timeS = timeH * getConversionFactor(h, s);

console.log(`${timeH} h = ${timeMin} min = ${timeS} s`);
// '2.5 h = 150 min = 9000 s'
```

---

## Physics Problems

### Force Calculation (F = ma)

```typescript
import {
	createUnit,
	multiplyUnits,
	divideUnits,
	powerUnit,
	getDimensionalSignature,
	unitsAreCompatible
} from '$lib/questions/units';

// Problem: Calculate force for m = 5 kg, a = 2 m/s²

const mass = 5; // kg
const acceleration = 2; // m/s²

// Create units
const kg = createUnit('kg');
const m = createUnit('m');
const s = createUnit('s');

// Acceleration unit: m/s²
const accelUnit = divideUnits(m, powerUnit(s, 2));

// Force unit: kg·m/s²
const forceUnit = multiplyUnits(kg, accelUnit);

// Calculate force
const force = mass * acceleration; // 10 N

console.log(`Force: ${force} ${formatUnit(forceUnit)}`);
// 'Force: 10 g.m/s^2' (shows base unit g)

// Verify dimensional signature
const sig = getDimensionalSignature(forceUnit);
console.log(sig); // { mass: 1, length: 1, time: -2 }
```

### Kinetic Energy (KE = ½mv²)

```typescript
import {
	createUnit,
	multiplyUnits,
	powerUnit,
	getConversionFactor,
	getDimensionalSignature
} from '$lib/questions/units';

// Problem: Calculate KE for m = 2 kg, v = 36 km/h

const mass = 2; // kg
const speedKmh = 36; // km/h

// Convert speed to m/s
const kmh = divideUnits(createUnit('km'), createUnit('h'));
const ms = divideUnits(createUnit('m'), createUnit('s'));
const speedMs = speedKmh * getConversionFactor(kmh, ms); // 10 m/s

// Calculate KE
const ke = 0.5 * mass * speedMs ** 2; // 100 J

// Energy unit: kg·m²/s²
const kg = createUnit('kg');
const m = createUnit('m');
const s = createUnit('s');
const energyUnit = divideUnits(multiplyUnits(kg, powerUnit(m, 2)), powerUnit(s, 2));

console.log(`KE: ${ke} ${formatUnit(energyUnit)}`);

// Verify: mass × velocity² gives energy dimensions
const sig = getDimensionalSignature(energyUnit);
console.log(sig); // { mass: 1, length: 2, time: -2 }
```

### Density Calculation

```typescript
import { createUnit, divideUnits, powerUnit, getConversionFactor } from '$lib/questions/units';

// Problem: An object has mass 500 g and volume 200 cm³. Calculate density.

const mass = 500; // g
const volume = 200; // cm³

// Density = mass / volume
const density = mass / volume; // 2.5 g/cm³

// Units
const g = createUnit('g');
const cm3 = powerUnit(createUnit('cm'), 3);
const densityUnit = divideUnits(g, cm3);

console.log(`Density: ${density} ${formatUnit(densityUnit)}`);
// 'Density: 2.5 g/(cm^3)'

// Convert to kg/m³
const kg = createUnit('kg');
const m3 = powerUnit(createUnit('m'), 3);
const densityUnitSI = divideUnits(kg, m3);

const factor = getConversionFactor(densityUnit, densityUnitSI);
const densitySI = density * factor;
console.log(`Density: ${densitySI} kg/m³`); // '2500 kg/m³'
```

---

## Answer Validation

### Simple Quantity Validation

```typescript
import { createUnit, validateQuantityAnswer } from '$lib/questions/units';

// Expected answer: 150 km
const expected = {
	value: 150,
	unit: createUnit('km')
};

// Student answers
const correct = '150~\\unit{km}';
const wrongValue = '160~\\unit{km}';
const equivalent = '150000~\\unit{m}';
const wrongUnit = '150~\\unit{kg}';

console.log(validateQuantityAnswer(correct, expected));
// { status: 'correct' }

console.log(validateQuantityAnswer(wrongValue, expected));
// { status: 'wrong_value', message: 'Incorrect value' }

console.log(validateQuantityAnswer(equivalent, expected));
// { status: 'correct' } (units are compatible, values match)

console.log(validateQuantityAnswer(wrongUnit, expected));
// { status: 'incompatible_units', message: 'Cannot compare...' }
```

### Validation with Tolerance

```typescript
import { createUnit, validateQuantityAnswer } from '$lib/questions/units';

const expected = {
	value: 3.14159,
	unit: createUnit('m')
};

// With default tolerance (1e-9)
console.log(validateQuantityAnswer('3.14159~\\unit{m}', expected));
// { status: 'correct' }

// Student rounds to 3.14
console.log(validateQuantityAnswer('3.14~\\unit{m}', expected));
// { status: 'wrong_value' } (outside tolerance)

// With custom tolerance
console.log(validateQuantityAnswer('3.14~\\unit{m}', expected, { tolerance: 0.01 }));
// { status: 'correct' } (within 1% tolerance)
```

### Requiring Exact Units

```typescript
import { createUnit, validateQuantityAnswer } from '$lib/questions/units';

const expected = {
	value: 1500,
	unit: createUnit('m')
};

// By default, equivalent units are accepted
console.log(validateQuantityAnswer('1.5~\\unit{km}', expected));
// { status: 'correct' }

// Requiring exact unit
console.log(
	validateQuantityAnswer('1.5~\\unit{km}', expected, {
		requireExactUnit: true
	})
);
// { status: 'wrong_unit', message: 'Expected answer in m' }
```

---

## HMS Time Problems

### Parsing HMS Input

```typescript
import { parseHMS, formatHMS, hmsToSeconds, secondsToHMS } from '$lib/questions/units';

// Parse various formats
console.log(parseHMS('3h30min45s'));
// { hours: 3, minutes: 30, seconds: 45 }

console.log(parseHMS('2h15min'));
// { hours: 2, minutes: 15, seconds: 0 }

console.log(parseHMS('45min30s'));
// { hours: 0, minutes: 45, seconds: 30 }
```

### HMS Arithmetic

```typescript
import { parseHMS, addHMS, subtractHMS, formatHMS } from '$lib/questions/units';

// Add times
const time1 = parseHMS('2h45min')!;
const time2 = parseHMS('1h30min')!;

const sum = addHMS(time1, time2);
console.log(formatHMS(sum)); // '4h15min'

// Subtract times
const diff = subtractHMS(time1, time2);
console.log(formatHMS(diff)); // '1h15min'
```

### Converting Between HMS and Seconds

```typescript
import { hmsToSeconds, secondsToHMS, formatHMS } from '$lib/questions/units';

// HMS to seconds
const hms = { hours: 2, minutes: 30, seconds: 45 };
const seconds = hmsToSeconds(hms);
console.log(`${formatHMS(hms)} = ${seconds} s`);
// '2h30min45s = 9045 s'

// Seconds to HMS
const hmsFromSeconds = secondsToHMS(5430);
console.log(formatHMS(hmsFromSeconds)); // '1h30min30s'
```

### Travel Time Problem with HMS

```typescript
import {
	createUnit,
	divideUnits,
	getConversionFactor,
	secondsToHMS,
	formatHMS
} from '$lib/questions/units';

// Problem: How long to travel 180 km at 60 km/h?

const distance = 180; // km
const speed = 60; // km/h

// Time in hours
const timeH = distance / speed; // 3 h

// Convert to HMS
const h = createUnit('h');
const s = createUnit('s');
const timeSeconds = timeH * getConversionFactor(h, s);
const timeHMS = secondsToHMS(timeSeconds);

console.log(`Travel time: ${formatHMS(timeHMS)}`);
// 'Travel time: 3h0min0s'
```

---

## Custom Syntax Integration

### Using Units in Custom Syntax

```typescript
import { parseCustom, toCustom } from '$lib/mathAST';
import { createUnit } from '$lib/questions/units';

// Parse expression with unit notation [unit]
const expr = parseCustom('150 [km/h]');
// Creates: UnitNode(number('150'), km/h)

// Generate custom syntax
const output = toCustom(expr);
console.log(output); // '150 [km/h]'
```

### Creating Quantity Expressions

```typescript
import { MathAST, toLatex } from '$lib/mathAST';
import { createUnit, divideUnits } from '$lib/questions/units';

// Create velocity expression
const velocity = MathAST.withUnit(
	MathAST.number('90'),
	divideUnits(createUnit('km'), createUnit('h'))
);

console.log(toLatex(velocity)); // '90~\unit{km/h}'
```

### Dimensional Analysis on Expressions

```typescript
import { parseCustom } from '$lib/mathAST';
import { checkDimensionalConsistency } from '$lib/questions/units';

// Valid: adding compatible units
const validExpr = parseCustom('3 [m] + 5 [m]');
const result1 = checkDimensionalConsistency(validExpr);
console.log(result1.valid); // true

// Invalid: adding incompatible units
const invalidExpr = parseCustom('3 [m] + 5 [s]');
const result2 = checkDimensionalConsistency(invalidExpr);
console.log(result2.valid); // false
console.log(result2.error); // 'Cannot add m and s: incompatible dimensions'
```

---

## Complete Question Example

Here's a complete example of a physics question with unit handling:

```typescript
import {
	createUnit,
	divideUnits,
	multiplyUnits,
	powerUnit,
	getConversionFactor,
	validateQuantityAnswer,
	formatUnit,
	parseLatexQuantity
} from '$lib/questions/units';

// Question: A 1500 kg car accelerates from 0 to 72 km/h in 8 seconds.
// Calculate: (a) acceleration, (b) force

// Given values
const mass = 1500; // kg
const initialSpeed = 0; // m/s
const finalSpeedKmh = 72; // km/h
const time = 8; // s

// Convert final speed to m/s
const kmh = divideUnits(createUnit('km'), createUnit('h'));
const ms = divideUnits(createUnit('m'), createUnit('s'));
const finalSpeedMs = finalSpeedKmh * getConversionFactor(kmh, ms); // 20 m/s

// (a) Calculate acceleration: a = (v - v0) / t
const acceleration = (finalSpeedMs - initialSpeed) / time; // 2.5 m/s²
const accelUnit = divideUnits(createUnit('m'), powerUnit(createUnit('s'), 2));

console.log(`Acceleration: ${acceleration} ${formatUnit(accelUnit)}`);
// 'Acceleration: 2.5 m/s^2'

// (b) Calculate force: F = ma
const force = mass * acceleration; // 3750 N
const forceUnit = multiplyUnits(createUnit('kg'), accelUnit);

console.log(`Force: ${force} ${formatUnit(forceUnit)}`);
// 'Force: 3750 g.m/s^2' (base unit is g)

// Validate student answers
const expectedAccel = { value: 2.5, unit: accelUnit };
const expectedForce = { value: 3750, unit: forceUnit };

// Student answer for acceleration
const studentAccel = '2,5~\\unit{m/s^2}';
console.log(validateQuantityAnswer(studentAccel, expectedAccel));
// { status: 'correct' }

// Student gives force in kN
const studentForce = '3,75~\\unit{kN}';
// Note: Would need to create kN unit properly
const kN = multiplyUnits(createUnit('kg'), accelUnit);
// ... validation logic
```

---

## See Also

- [API Reference](./api-reference.md)
- [HMS Time](./hms.md)
- [Architecture](./architecture.md)
