# HMS (Hours-Minutes-Seconds) Time Format

Handling time values in the familiar hours-minutes-seconds format.

## Overview

The HMS system provides parsing, formatting, conversion, and arithmetic operations for time values expressed in hours, minutes, and seconds. This is commonly used in physics problems involving duration, speed-distance-time calculations, and everyday time operations.

## Type Definition

```typescript
interface HMSValue {
	hours: number;
	minutes: number;
	seconds?: number;
	milliseconds?: number;
}
```

| Property       | Type     | Description                         |
| -------------- | -------- | ----------------------------------- |
| `hours`        | `number` | Hours component (non-negative)      |
| `minutes`      | `number` | Minutes component (0-59 normalized) |
| `seconds`      | `number` | Seconds component (0-59 normalized) |
| `milliseconds` | `number` | Milliseconds (0-999 normalized)     |

**Examples:**

```typescript
// 3h30min45s
{ hours: 3, minutes: 30, seconds: 45 }

// 2h15min (no seconds)
{ hours: 2, minutes: 15 }

// 45min30s (no hours)
{ hours: 0, minutes: 45, seconds: 30 }

// Precise timing
{ hours: 1, minutes: 23, seconds: 45, milliseconds: 678 }
```

## Parsing

### `parseHMS(input)`

Parse an HMS time string into an HMSValue object.

```typescript
import { parseHMS } from '$lib/questions/units';

function parseHMS(input: string): HMSValue | null;
```

**Supported formats:**

| Format              | Example        | Result                                   |
| ------------------- | -------------- | ---------------------------------------- |
| Full HMS            | `3h30min45s`   | `{ hours: 3, minutes: 30, seconds: 45 }` |
| Hours and minutes   | `2h15min`      | `{ hours: 2, minutes: 15 }`              |
| Minutes and seconds | `45min30s`     | `{ hours: 0, minutes: 45, seconds: 30 }` |
| Hours only          | `5h`           | `{ hours: 5, minutes: 0 }`               |
| Minutes only        | `90min`        | `{ hours: 0, minutes: 90 }`              |
| With spaces         | `1h 23min 45s` | `{ hours: 1, minutes: 23, seconds: 45 }` |

**Examples:**

```typescript
parseHMS('3h30min45s');
// { hours: 3, minutes: 30, seconds: 45 }

parseHMS('2h15min');
// { hours: 2, minutes: 15, seconds: 0 }

parseHMS('45min30s');
// { hours: 0, minutes: 45, seconds: 30 }

parseHMS('1h 23min 45s');
// { hours: 1, minutes: 23, seconds: 45 }

parseHMS('invalid');
// null
```

## Formatting

### `formatHMS(hms)`

Format an HMSValue as a compact string.

```typescript
import { formatHMS } from '$lib/questions/units';

function formatHMS(hms: HMSValue): string;
```

**Examples:**

```typescript
formatHMS({ hours: 3, minutes: 30, seconds: 45 });
// '3h30min45s'

formatHMS({ hours: 2, minutes: 15 });
// '2h15min'

formatHMS({ hours: 0, minutes: 45, seconds: 30 });
// '45min30s'

formatHMS({ hours: 5, minutes: 0, seconds: 0 });
// '5h'
```

### `formatHMSLatex(hms)`

Format an HMSValue as LaTeX.

```typescript
import { formatHMSLatex } from '$lib/questions/units';

function formatHMSLatex(hms: HMSValue): string;
```

**Examples:**

```typescript
formatHMSLatex({ hours: 3, minutes: 30, seconds: 45 });
// '3~\\text{h}~30~\\text{min}~45~\\text{s}'

formatHMSLatex({ hours: 2, minutes: 15 });
// '2~\\text{h}~15~\\text{min}'
```

## Conversion

### `hmsToSeconds(hms)`

Convert HMS value to total seconds.

```typescript
import { hmsToSeconds } from '$lib/questions/units';

function hmsToSeconds(hms: HMSValue): number;
```

**Formula:** `seconds = hours × 3600 + minutes × 60 + seconds + milliseconds / 1000`

**Examples:**

```typescript
hmsToSeconds({ hours: 1, minutes: 0, seconds: 0 });
// 3600

hmsToSeconds({ hours: 2, minutes: 30, seconds: 45 });
// 9045

hmsToSeconds({ hours: 0, minutes: 90, seconds: 0 });
// 5400
```

### `secondsToHMS(seconds)`

Convert total seconds to normalized HMS value.

```typescript
import { secondsToHMS } from '$lib/questions/units';

function secondsToHMS(seconds: number): HMSValue;
```

**Examples:**

```typescript
secondsToHMS(3600);
// { hours: 1, minutes: 0, seconds: 0 }

secondsToHMS(9045);
// { hours: 2, minutes: 30, seconds: 45 }

secondsToHMS(5430);
// { hours: 1, minutes: 30, seconds: 30 }
```

### `minutesToHMS(minutes)`

Convert total minutes to HMS value.

```typescript
import { minutesToHMS } from '$lib/questions/units';

function minutesToHMS(minutes: number): HMSValue;
```

**Examples:**

```typescript
minutesToHMS(90);
// { hours: 1, minutes: 30, seconds: 0 }

minutesToHMS(150.5);
// { hours: 2, minutes: 30, seconds: 30 }
```

## Arithmetic

### `addHMS(a, b)`

Add two HMS values.

```typescript
import { addHMS } from '$lib/questions/units';

function addHMS(a: HMSValue, b: HMSValue): HMSValue;
```

**Examples:**

```typescript
const time1 = { hours: 2, minutes: 45, seconds: 30 };
const time2 = { hours: 1, minutes: 30, seconds: 45 };

addHMS(time1, time2);
// { hours: 4, minutes: 16, seconds: 15 }

// With carry
const time3 = { hours: 1, minutes: 50, seconds: 0 };
const time4 = { hours: 0, minutes: 20, seconds: 0 };

addHMS(time3, time4);
// { hours: 2, minutes: 10, seconds: 0 }
```

### `subtractHMS(a, b)`

Subtract HMS values (a - b).

```typescript
import { subtractHMS } from '$lib/questions/units';

function subtractHMS(a: HMSValue, b: HMSValue): HMSValue;
```

**Examples:**

```typescript
const time1 = { hours: 3, minutes: 30, seconds: 0 };
const time2 = { hours: 1, minutes: 45, seconds: 0 };

subtractHMS(time1, time2);
// { hours: 1, minutes: 45, seconds: 0 }

// With borrow
const time3 = { hours: 2, minutes: 10, seconds: 0 };
const time4 = { hours: 0, minutes: 30, seconds: 0 };

subtractHMS(time3, time4);
// { hours: 1, minutes: 40, seconds: 0 }
```

### `compareHMS(a, b)`

Compare two HMS values.

```typescript
import { compareHMS } from '$lib/questions/units';

function compareHMS(a: HMSValue, b: HMSValue): -1 | 0 | 1;
```

**Returns:**

- `-1` if a < b
- `0` if a = b
- `1` if a > b

**Examples:**

```typescript
const time1 = { hours: 2, minutes: 30, seconds: 0 };
const time2 = { hours: 1, minutes: 45, seconds: 0 };
const time3 = { hours: 2, minutes: 30, seconds: 0 };

compareHMS(time1, time2); // 1 (time1 > time2)
compareHMS(time2, time1); // -1 (time2 < time1)
compareHMS(time1, time3); // 0 (equal)
```

### `normalizeHMS(hms)`

Normalize an HMS value so minutes and seconds are in valid ranges.

```typescript
import { normalizeHMS } from '$lib/questions/units';

function normalizeHMS(hms: HMSValue): HMSValue;
```

**Examples:**

```typescript
// 90 minutes -> 1h30min
normalizeHMS({ hours: 0, minutes: 90, seconds: 0 });
// { hours: 1, minutes: 30, seconds: 0 }

// 75 seconds -> 1min15s
normalizeHMS({ hours: 0, minutes: 0, seconds: 75 });
// { hours: 0, minutes: 1, seconds: 15 }

// Combined overflow
normalizeHMS({ hours: 1, minutes: 75, seconds: 90 });
// { hours: 2, minutes: 16, seconds: 30 }
```

## Use Cases

### Speed-Distance-Time Problem

```typescript
import {
	createUnit,
	divideUnits,
	getConversionFactor,
	secondsToHMS,
	formatHMS
} from '$lib/questions/units';

// Problem: How long to travel 240 km at 80 km/h?

const distance = 240; // km
const speed = 80; // km/h

// Calculate time in hours
const timeHours = distance / speed; // 3 h

// Convert to seconds, then to HMS
const h = createUnit('h');
const s = createUnit('s');
const timeSeconds = timeHours * getConversionFactor(h, s); // 10800 s

const timeHMS = secondsToHMS(timeSeconds);
console.log(`Travel time: ${formatHMS(timeHMS)}`);
// 'Travel time: 3h'
```

### Adding Travel Times

```typescript
import { parseHMS, addHMS, formatHMS } from '$lib/questions/units';

// Trip 1: 2h45min, Trip 2: 1h30min
const trip1 = parseHMS('2h45min')!;
const trip2 = parseHMS('1h30min')!;

const totalTime = addHMS(trip1, trip2);
console.log(`Total travel time: ${formatHMS(totalTime)}`);
// 'Total travel time: 4h15min'
```

### Time Difference

```typescript
import { parseHMS, subtractHMS, formatHMS } from '$lib/questions/units';

// Start: 9h15min, End: 12h45min
const start = parseHMS('9h15min')!;
const end = parseHMS('12h45min')!;

const duration = subtractHMS(end, start);
console.log(`Duration: ${formatHMS(duration)}`);
// 'Duration: 3h30min'
```

### Converting Decimal Hours

```typescript
import { secondsToHMS, formatHMS } from '$lib/questions/units';

// Convert 2.75 hours to HMS
const decimalHours = 2.75;
const totalSeconds = decimalHours * 3600; // 9900 s

const hms = secondsToHMS(totalSeconds);
console.log(`${decimalHours} h = ${formatHMS(hms)}`);
// '2.75 h = 2h45min'
```

### Validating HMS Answers

```typescript
import { parseHMS, hmsToSeconds, compareHMS } from '$lib/questions/units';

// Expected: 2h30min
const expected = parseHMS('2h30min')!;

// Student answer: "150min"
const studentInput = parseHMS('150min');

if (studentInput) {
	const comparison = compareHMS(studentInput, expected);
	if (comparison === 0) {
		console.log('Correct!');
	} else {
		console.log('Incorrect');
	}
}
// Note: 150min = 2h30min, so this is correct
```

## Integration with Unit System

HMS values can be converted to/from the standard time units:

```typescript
import {
	createUnit,
	getConversionFactor,
	hmsToSeconds,
	secondsToHMS,
	formatHMS
} from '$lib/questions/units';

// Convert HMS to minutes
const hms = { hours: 2, minutes: 30, seconds: 0 };
const totalSeconds = hmsToSeconds(hms); // 9000 s

const s = createUnit('s');
const min = createUnit('min');
const totalMinutes = totalSeconds * getConversionFactor(s, min);
console.log(`${formatHMS(hms)} = ${totalMinutes} min`);
// '2h30min = 150 min'

// Convert from hours unit
const h = createUnit('h');
const timeInHours = 3.5;
const timeInSeconds = timeInHours * getConversionFactor(h, s);
const hmsResult = secondsToHMS(timeInSeconds);
console.log(`${timeInHours} h = ${formatHMS(hmsResult)}`);
// '3.5 h = 3h30min'
```

## Edge Cases

### Zero Values

```typescript
import { formatHMS, hmsToSeconds } from '$lib/questions/units';

// All zeros
formatHMS({ hours: 0, minutes: 0, seconds: 0 });
// '0s' or similar minimal representation

hmsToSeconds({ hours: 0, minutes: 0, seconds: 0 });
// 0
```

### Large Values

```typescript
import { normalizeHMS, formatHMS } from '$lib/questions/units';

// Unnormalized large minutes
const largeMinutes = { hours: 0, minutes: 150, seconds: 0 };
const normalized = normalizeHMS(largeMinutes);
console.log(formatHMS(normalized));
// '2h30min'
```

### Fractional Seconds

```typescript
import { secondsToHMS, formatHMS } from '$lib/questions/units';

// Fractional seconds become milliseconds
const hms = secondsToHMS(3661.5);
// { hours: 1, minutes: 1, seconds: 1, milliseconds: 500 }
```

## See Also

- [API Reference](./api-reference.md#hms-operations)
- [Examples](./examples.md#hms-time-problems)
- [Architecture](./architecture.md)
