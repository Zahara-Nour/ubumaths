# Variation Study (Monotonicity Analysis)

> Technical documentation for the sign analysis and variation study modules

## Overview

The variation study system analyzes mathematical functions to determine:

1. **Sign of expressions** - Where f(x) > 0, < 0, or = 0
2. **Monotonicity** - Where f is increasing, decreasing, or constant
3. **Critical points** - Where f'(x) = 0 or undefined
4. **Extrema** - Local and global minima/maxima
5. **Boundary limits** - Behavior at domain boundaries

## Architecture

```
src/lib/mathAST/
├── sign/                    # Sign analysis module
│   ├── types.ts             # Sign, SignedInterval, ZeroInfo, etc.
│   ├── analyze.ts           # Main analyzeSign() function
│   ├── rules/               # Sign determination rules
│   │   ├── product.ts       # Sign of products
│   │   ├── quotient.ts      # Sign of quotients
│   │   ├── sum.ts           # Sign of sums
│   │   ├── power.ts         # Sign of powers
│   │   └── function.ts      # Sign of builtin functions
│   ├── helpers/             # Utility functions
│   │   ├── zeros.ts         # Zero finding (uses solve/)
│   │   ├── interval-sign.ts # Sign on intervals
│   │   └── sampling.ts      # Numeric fallback
│   └── format.ts            # French formatting
│
├── variations/              # Variation study module
│   ├── types.ts             # Monotonicity, ExtremumInfo, etc.
│   ├── compute.ts           # Main computeVariations()
│   ├── critical-points.ts   # Critical point detection
│   ├── monotonicity.ts      # Monotonicity analysis
│   ├── extrema.ts           # Extrema classification
│   ├── boundary-limits.ts   # Boundary limit computation
│   └── format.ts            # Variation table formatting
│
└── cli/commands/
    └── variations.command.ts # .variations CLI command
```

## Usage

### Sign Analysis

```typescript
import { analyzeSign, formatSignAnalysis } from '$lib/mathAST';

// Analyze sign of x^2 - 4
const expr = parseCustom('x^2 - 4');
const result = analyzeSign(expr, { variable: 'x' });

// Result contains:
// - zeros: [{value: -2}, {value: 2}]
// - signedIntervals: [
//     {interval: ]-inf, -2[, sign: 'positive'},
//     {interval: ]-2, 2[, sign: 'negative'},
//     {interval: ]2, +inf[, sign: 'positive'}
//   ]

console.log(formatSignAnalysis(result));
```

### Variation Study

```typescript
import { computeVariations, formatVariationTable } from '$lib/mathAST';

// Study variations of x^2 - 4
const expr = parseCustom('x^2 - 4');
const result = computeVariations(expr, { variable: 'x' });

// Result contains:
// - derivative: 2x
// - criticalPoints: [{x: 0, nature: 'derivative_zero'}]
// - monotonicIntervals: [
//     {interval: ]-inf, 0[, monotonicity: 'decreasing'},
//     {interval: ]0, +inf[, monotonicity: 'increasing'}
//   ]
// - extrema: [{x: 0, y: -4, type: 'local_minimum'}]

console.log(formatVariationTable(result));
```

### CLI Command

```bash
# In MathAST REPL
> .variations x^2 - 4

Expression : x^2 - 4
Derivee : f'(x) = 2*x

Domaine : R

Points critiques :
  x = 0

Signe de f'(x) et monotonie :
  ]-inf, 0[ : -    (f decroissante)
  {0}       : 0
  ]0, +inf[ : +    (f croissante)

Extrema :
  Minimum local : f(0) = -4
```

## Sign Analysis Rules

### Product Rule

For a product a \* b:

| Sign of a | Sign of b | Sign of a\*b |
| --------- | --------- | ------------ |
| positive  | positive  | positive     |
| positive  | negative  | negative     |
| negative  | positive  | negative     |
| negative  | negative  | positive     |
| zero      | any       | zero         |

### Quotient Rule

For a quotient a / b (where b != 0):

- Same rules as product
- Domain excludes zeros of denominator

### Sum Rule

- Sum of all positive terms: positive
- Sum of all negative terms: negative
- Mixed signs: analyze algebraically or use numeric sampling

### Power Rule

For a^n where n is integer:

- Even n: |a|^n >= 0 (positive except at zeros of a)
- Odd n: preserves sign of a

### Builtin Functions

| Function | Domain | Sign on domain                          |
| -------- | ------ | --------------------------------------- |
| exp(x)   | R      | always positive                         |
| ln(x)    | x > 0  | negative on (0,1), positive on (1,+inf) |
| sqrt(x)  | x >= 0 | positive                                |
| abs(x)   | R      | positive (0 at x=0)                     |
| sin(x)   | R      | varies periodically                     |
| cos(x)   | R      | varies periodically                     |

## Variation Study Algorithm

1. **Compute domain** - Using the domain/ module
2. **Compute derivative** - Using differentiation/
3. **Find critical points** - Solve f'(x) = 0 using solve/
4. **Analyze sign of f'** - Using sign/ module
5. **Determine monotonicity**:
   - f'(x) > 0 → increasing
   - f'(x) < 0 → decreasing
   - f'(x) = 0 → constant
6. **Classify extrema**:
   - f' changes from - to + → local minimum
   - f' changes from + to - → local maximum
7. **Compute boundary limits** - Using limits/ module

## Options

### Sign Analysis Options

```typescript
interface SignAnalysisOptions {
	variable?: string; // Default: 'x'
	domain?: Domain; // Restrict analysis domain
	numericFallback?: boolean; // Allow numeric sampling (default: true)
	tolerance?: number; // Numeric tolerance (default: 1e-10)
	strictMode?: boolean; // Throw on indeterminate (default: false)
	verbosity?: Verbosity; // Step recording level
}
```

### Variation Options

```typescript
interface VariationOptions {
	variable?: string; // Default: 'x'
	domain?: Domain; // Restrict study domain
	includeBoundaryLimits?: boolean; // Compute limits (default: true)
	numericFallback?: boolean; // Allow sampling (default: true)
	tolerance?: number; // Numeric tolerance (default: 1e-10)
	strictMode?: boolean; // Throw on errors (default: false)
	verbosity?: Verbosity; // Step recording level
}
```

## Handling Undetermined Cases

The system uses a hybrid approach:

1. **Algebraic analysis first** - Try to determine sign algebraically
2. **Numeric fallback** - Sample points if algebraic analysis fails
3. **Unknown status** - Return 'unknown' if both methods fail

In strict mode (`strictMode: true`), errors are thrown instead of returning 'unknown'.

## Types

### Sign Type

```typescript
type Sign = 'positive' | 'negative' | 'zero' | 'unknown';
```

### Monotonicity Type

```typescript
type Monotonicity = 'increasing' | 'decreasing' | 'constant' | 'unknown';
```

### Extremum Type

```typescript
type ExtremumType = 'local_minimum' | 'local_maximum' | 'global_minimum' | 'global_maximum';
```

## French Output Format

All formatting functions produce French pedagogical output:

- "croissante" (increasing)
- "decroissante" (decreasing)
- "constante" (constant)
- "Minimum local" (local minimum)
- "Maximum global" (global maximum)

## Integration with Other Modules

- **differentiation/** - Computes derivatives
- **solve/** - Finds zeros of derivatives
- **domain/** - Determines expression domains
- **limits/** - Computes boundary limits
- **normal/** - Simplifies expressions

## Test Coverage

- sign/: 142 tests
- variations/: 78 tests
- CLI: 53 tests
- Integration: 21 tests
- **Total: 294 tests**
