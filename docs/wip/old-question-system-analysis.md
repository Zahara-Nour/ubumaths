# OLD Question System (TinyMath/TinyCAS) - Complete Feature Analysis

**Analysis Date**: 2025-11-26  
**Source Files**:

- `extern/new-tinymath/apps/ubumaths/src/lib/questions/correction.ts`
- `extern/new-tinymath/apps/ubumaths/src/lib/questions/correctionItem.ts`
- `extern/new-tinymath/apps/ubumaths/src/types/type.ts`
- `extern/new-tinymath/packages/tinycas/src/math/node.ts`

---

## PART 1: VALIDATION & CORRECTION WORKFLOW

### 1.1 Overall Workflow

The validation workflow has 6 sequential stages:

```
1. CHECK IF EMPTY
   ├─ Status: STATUS_EMPTY
   └─ Message: EMPTY_ANSWER / EMPTY_MULTIPLE_ANSWERS

2. CHECK IF MATHEMATICALLY VALID
   ├─ Parse and validate syntax
   ├─ Status: STATUS_INCORRECT (if parsing fails)
   └─ Message: MATH_INCORRECT / MATH_GLOBALLY_INCORRECT

3. COMPARE WITH SOLUTIONS
   ├─ Use math.equals() for equivalence
   ├─ For testAnswers: Execute test expressions
   ├─ Status: STATUS_INCORRECT (if not equal)
   └─ Options: solutions-order-not-important

4. VERIFY FORM CONSTRAINTS
   ├─ Check spaces, products, brackets, zeros, signs
   ├─ Check fractions, units, terms/factors order
   ├─ Status: STATUS_UNOPTIMAL_FORM or STATUS_BAD_FORM
   └─ NO PENALTY vs REQUIRE flags control behavior

5. VERIFY TERMS & FACTORS ORDER
   ├─ After cleanup: sortTermsAndFactors()
   ├─ Compare strictly: strictlyEquals()
   ├─ Status: STATUS_UNOPTIMAL_FORM or STATUS_BAD_FORM
   └─ Options: disallow-* or penalty-for-* control behavior

6. FINAL STATUS CONSOLIDATION
   ├─ Aggregate all statuses
   ├─ Apply partial credit rules
   └─ Final: EMPTY → UNOPTIMAL → CORRECT → BAD_FORM → INCORRECT
```

---

## PART 2: ALL VALIDATION FUNCTIONS

### 2.1 Status Constants

```typescript
export const STATUS_EMPTY = 'empty'; // No answer provided
export const STATUS_CORRECT = 'correct'; // Correct answer
export const STATUS_INCORRECT = 'incorrect'; // Wrong answer
export const STATUS_UNOPTIMAL_FORM = 'unoptimal form'; // Correct but not optimal form
export const STATUS_BAD_FORM = 'bad form'; // Correct mathematically, wrong form
export const STATUS_BAD_UNIT = 'bad unit'; // Wrong unit
```

### 2.2 Constraint Check Functions

#### `checkSpaces(item: CorrectedQuestion): number[]`

**Purpose**: Verify correct spacing in multi-digit numbers  
**Input**: Answer from LaTeX (`answers_latex` field)  
**Process**:

- Extracts all multi-digit numbers
- Checks for correct spacing rules based on integer vs decimal part
- Integer part: rejects 4+ consecutive digits, spaces before end, spacing patterns like " 2 "
- Decimal part: rejects 4+ consecutive digits, space at start, spacing patterns
- Special handling for comma vs period as decimal separator

**Returns**: Array of indices of answers with spacing issues  
**Example**: `"1234"` → spacing issue | `"1 234"` → OK | `"1,234"` → OK

---

#### `checkProducts(item: CorrectedQuestion): number[]`

**Purpose**: Verify use of implicit multiplication  
**Constraint**: `no-penalty-for-explicit-products` vs `require-implicit-products`  
**Process**: `expression.removeMultOperator() !== original`  
**Returns**: Indices where `*` operator is explicitly written instead of implicit  
**Example**: `2*x` → flagged | `2x` → OK

---

#### `checkBrackets(item: CorrectedQuestion): number[]`

**Purpose**: Verify unnecessary brackets are removed  
**Constraint**: `no-penalty-for-extraneous-brackets` vs `require-no-extraneaous-brackets`  
**Special Flag**: `no-penalty-for-extraneous-brackets-in-first-negative-term`  
**Process**: `expression.removeUnecessaryBrackets(allowBracketsInFirstNegativeTerm) !== original`  
**Fill-in Special**: For `fill in` questions with expression template, checks the entire resulting expression  
**Returns**: Indices where unnecessary brackets exist, or `-1` for entire fill-in expression  
**Example**: `(5+3)+2` → flagged | `5+3+2` → OK | `-(5+3)` allowed if flag set

---

#### `checkZeros(item: CorrectedQuestion): number[]`

**Purpose**: Detect unnecessary leading zeros and trailing zeros in decimals  
**Process**: `expression.searchUnecessaryZeros()` checks input string for:

- Leading zeros: `0\d+` pattern (e.g., `01`, `001`)
- Trailing zeros after decimal: `[.,]\d*0$` pattern (e.g., `1.0`, `1.20`)
  **Returns**: Indices with extraneous zeros  
  **Example**: `01` → flagged | `1` → OK | `1.0` → flagged | `1` → OK

---

#### `checkSigns(item: CorrectedQuestion): number[]`

**Purpose**: Detect unnecessary sign simplifications  
**Process**:

1. Simplify signs: `removeSigns()`
2. Compare: `e1.string !== e2.string` (with vs without sign simplification)
   **Returns**: Indices where signs can be simplified  
   **Example**: `--5` → flagged | `5` → OK | `+-3` → flagged

---

#### `checkFactorsOne(item: CorrectedQuestion): number[]`

**Purpose**: Detect factors of 1 that can be removed  
**Constraint**: `no-penalty-for-factor-one` vs `require-no-factor-one`  
**Process**: `expression.removeFactorsOne() !== original`  
**Returns**: Indices where `1 *` or `* 1` exists  
**Example**: `1*5*x` → flagged | `5*x` → OK

---

#### `checkFactorsZero(item: CorrectedQuestion): number[]`

**Purpose**: Detect null products (product with 0) that can be simplified  
**Constraint**: `no-penalty-for-factor-zero` vs `require-no-factor-zero`  
**Process**: `expression.simplifyNullProducts() !== original`  
**Returns**: Indices where `0 * expression` exists  
**Example**: `0*5*x` → flagged | `0` → OK

---

#### `checkNullTerms(item: CorrectedQuestion): number[]`

**Purpose**: Detect null terms (+ 0, - 0) that can be removed  
**Constraint**: `no-penalty-for-null-terms` vs `require-no-null-terms`  
**Process**: `expression.removeNullTerms() !== original`  
**Returns**: Indices where `+ 0` or `- 0` exists  
**Example**: `5 + 0 + x` → flagged | `5 + x` → OK

---

#### `checkFractions(item: CorrectedQuestion): number[]`

**Purpose**: Verify fractions are fully reduced  
**Constraint**: `no-penalty-for-non-reduced-fractions` vs `require-reduced-fractions`  
**Process**: `expression.reduceFractions() !== original`  
**Returns**: Indices where `2/4` instead of `1/2` exists  
**Example**: `4/8` → flagged | `1/2` → OK | `5/3` → OK

---

#### `checkUnits(item: CorrectedQuestion): number[]`

**Purpose**: Verify correct unit specification  
**Constraint**: `no-penalty-for-not-respected-unit` vs `require-specific-unit`  
**Special Cases**:

- `unit === 'HMS'`: Time format (check with `expression.isTime()`)
- Other units: Check `expression.unit.string === expectedUnit`
  **Process**:

```typescript
if (item.unit) {
  if (item.unit === 'HMS' && !expression.isTime()) → FLAGGED
  if (item.unit !== 'HMS' && !expression.unit) → FLAGGED
  if (item.unit !== 'HMS' && expression.unit.string !== item.unit) → FLAGGED
}
```

**Returns**: Indices with wrong or missing units  
**Example**: `5 m` when expecting `5 cm` → flagged | `5 m` when expecting `5 m` → OK

---

### 2.3 Form Verification Functions

#### `checkTermsAndFactors(item: CorrectedQuestion): void`

**Purpose**: Verify terms and factors are in correct order  
**Process**:

1. Normalize solution and answer using cleanup chain
2. Based on options, apply different sorting:
   - `disallow-terms-and-factors-permutation`: No sorting, strict comparison
   - `penalty-for-terms-and-factors-permutation`: Allows unordered, gives STATUS_UNOPTIMAL_FORM
   - `disallow-terms-permutation`: Sort only factors (`.sortFactors()`)
   - `penalty-for-terms-permutation`: Sort factors, gives STATUS_UNOPTIMAL_FORM
   - `disallow-factors-permutation`: Sort only terms (`.sortTerms()`)
   - `penalty-for-factors-permutation`: Sort terms, gives STATUS_UNOPTIMAL_FORM
3. Compare with `strictlyEquals()`
   **Modifies**: `item.statuss[i]` and `item.unoptimals`

---

#### `checkForm(item: CorrectedQuestion): void`

**Purpose**: Verify answer matches required format  
**Process** (3 branches):

**Branch 1: Custom formats**

```typescript
if (item.formats) {
  // Check if answer matches ANY format template
  const matchFormat = item.formats.some((format) =>
    math(answer).matchTemplate(math(format))
  )
  if (!matchFormat) → STATUS_BAD_FORM
}
```

**Branch 2: One single form required**

```typescript
if (item.options.includes('one-single-form-solution')) {
  const solution = math(solutions[indexSolution])
  if (!answer.unit && !answer.strictlyEquals(solution))
    → STATUS_BAD_FORM
}
```

**Branch 3: Normal form (cleanup chain)**

```typescript
else {
  // Apply full cleanup chain:
  answer = answer
    .removeZerosAndSpaces()
    .reduceFractions()
    .simplifyNullProducts()
    .removeNullTerms()
    .removeFactorsOne()
    .removeUnecessaryBrackets()
    .removeMultOperator()
    .sortTermsAndFactors()

  solution = solution (same cleanup)

  if (!answer.unit && !answer.strictlyEquals(solution))
    → STATUS_BAD_FORM
}
```

---

## PART 3: CONSTRAINT OPTIONS & FLAGS

### 3.1 All Option Flags (38 total)

```typescript
// SPACES (2 options)
'require-correct-spaces'; // Spaces must be present/correct
'no-penalty-for-incorrect-spaces'; // Spaces are optional

// PRODUCTS (2 options)
'require-implicit-products'; // 2x not 2*x
'no-penalty-for-explicit-products'; // 2*x is acceptable

// BRACKETS (3 options)
'require-no-extraneaous-brackets'; // Remove all unnecessary brackets
'no-penalty-for-extraneous-brackets'; // Brackets are optional
'no-penalty-for-extraneous-brackets-in-first-negative-term'; // Special case

// ZEROS (2 options)
'require-no-extraneaous-zeros'; // Remove leading/trailing zeros
'no-penalty-for-extraneous-zeros'; // Zeros are optional
'exp-allow-unecessary-zeros'; // Expression rendering allows zeros

// SIGNS (2 options)
'require-no-extraneaous-signs'; // Simplify double signs
'no-penalty-for-extraneous-signs'; // Multiple signs acceptable

// FACTORS (2 options)
'require-no-factor-one'; // Remove 1* and *1
'no-penalty-for-factor-one'; // Factor of 1 is optional

// FACTORS ZERO (2 options)
'require-no-factor-zero'; // Simplify 0*x to 0
'no-penalty-for-factor-zero'; // 0*x is acceptable

// NULL TERMS (2 options)
'require-no-null-terms'; // Remove +0 and -0
'no-penalty-for-null-terms'; // +0/-0 acceptable

// FRACTIONS (2 options)
'require-reduced-fractions'; // Reduce all fractions
'no-penalty-for-non-reduced-fractions'; // Non-reduced acceptable

// UNITS (2 options)
'require-specific-unit'; // Must have exact unit
'no-penalty-for-not-respected-unit'; // Unit optional

// TERM PERMUTATION (2 options)
'disallow-terms-permutation'; // Strict order
'penalty-for-terms-permutation'; // Unordered = STATUS_UNOPTIMAL_FORM

// FACTOR PERMUTATION (2 options)
'disallow-factors-permutation'; // Strict order
'penalty-for-factors-permutation'; // Unordered = STATUS_UNOPTIMAL_FORM

// TERMS & FACTORS PERMUTATION (2 options)
'disallow-terms-and-factors-permutation'; // Strict order
'penalty-for-terms-and-factors-permutation'; // Unordered = STATUS_UNOPTIMAL_FORM

// SHUFFLING (7 options)
'shuffle-terms'; // Randomly shuffle terms
'shuffle-factors'; // Randomly shuffle factors
'shuffle-terms-and-factors'; // Shuffle both
'shallow-shuffle-terms'; // Shallow shuffle
'shallow-shuffle-factors'; // Shallow shuffle
'exp-remove-unecessary-brackets'; // Remove brackets from expression
'no-shuffle-choices'; // Don't shuffle MCQ choices

// OTHER (5 options)
'allow-same-expression'; // Allow same expression twice
'allow-same-enounce'; // Allow same enounce twice
'remove-null-terms'; // Remove null terms from solution
'exhaust'; // Exhaust all combinations
'solutions-order-not-important'; // Accept answers in any order
'multiples'; // Handle multiple answer fields
'one-single-form-solution'; // Require single specific form
'enounce-no-spaces'; // Expression has no spaces
'exp-no-spaces'; // Expression rendering has no spaces
```

**Option Logic**:

- Each constraint has a "require" and "no-penalty" pair
- Only ONE can be set (checked in `checkConstraints`)
- If neither is set: `no-penalty` behavior (default permissive)
- If `require` is set: Check constraint, mark violation
- Violation status depends on `require` flag:
  - If `require-*`: STATUS_BAD_FORM
  - If `penalty-*`: STATUS_UNOPTIMAL_FORM

---

## PART 4: TEST ANSWERS PROCESSING

### 4.1 testAnswers Purpose

**Purpose**: Custom validation logic using math expressions  
**When**: When solution cannot be expressed explicitly, use testAnswers to validate

**Example**:

```typescript
// Find divisors of 15
// Can't express as formula, use test:
testAnswers: ['&answer!=1 && &answer!=15 && mod(15; &answer)=0'];
// Validates: answer ≠ 1 AND answer ≠ 15 AND 15 mod answer = 0
```

### 4.2 testAnswers Processing Logic

Located in `assessItem()` function (lines 745-768):

```typescript
if (correctedItem.testAnswers.length) {
	correctedItem.answers.forEach((answer, i) => {
		if (testAnswers[i] || testAnswers[0]) {
			// Per-answer or global test
			const t = testAnswers[i] || testAnswers[0];

			// Replace &answer with actual answer value
			const tests = t
				.replace(/&answer/g, answer as string)
				.replace(/,/g, '.') // Comma to period
				.split('&&'); // Multiple tests joined by &&

			const failed = tests.some((test) => {
				// Evaluate each test expression
				const testResult = math(test).eval() as Bool;

				// Expression is INVALID or evaluates to FALSE
				const failure = math(test).isIncorrect() || testResult.isFalse();
				return failure;
			});

			if (failed) {
				item.statuss[i] = STATUS_INCORRECT;
				item.status = STATUS_INCORRECT;
			}
		}
	});
}
```

### 4.3 testAnswers Placeholders

- `&answer` (or `&answer1`): Current answer value
- `&answer2`, `&answer3`, etc.: Other answer field values
- `&1`, `&2`, etc.: Generated variables
- Variables are substituted before evaluation

### 4.4 testAnswers Operators

Standard math operations:

- Comparison: `=`, `!=`, `<`, `<=`, `>`, `>=`
- Arithmetic: `+`, `-`, `*`, `/`, `mod`
- Logical: `&&` (AND), separate expressions
- Functions: `mod(a; b)`, `gcd(a; b)`, etc.

---

## PART 5: TINYCAS MATH OBJECT METHODS

### 5.1 Classification Methods

```typescript
// Type checking
.isCorrect()              // type !== TYPE_ERROR
.isIncorrect()            // type === TYPE_ERROR
.isNumber()               // TYPE_NUMBER
.isSymbol()               // TYPE_SYMBOL
.isHole()                 // TYPE_HOLE (placeholder)
.isBracket()              // TYPE_BRACKET
.isTime()                 // TIME format
.isTemplate()             // Template placeholder ($1, $2, etc.)

// Structure checking
.isSum()                  // Addition (a + b)
.isDifference()           // Subtraction (a - b)
.isProduct()              // Multiplication (a * b, a·b, ab)
.isDivision()             // Division (a ÷ b)
.isQuotient()             // Fraction (a/b)
.isPower()                // Power (a^b)
.isRadical()              // Root (√a, ∛a)
.isOpposite()             // Unary minus (-a)
.isPositive()             // Unary plus (+a)

// Function checking
.isFunction()             // Any function
.isAbs()                  // |a|
.isFloor()                // ⌊a⌋
.isCos(), .isSin(), .isTan()  // Trig functions
.isLn(), .isLog(), .isExp()   // Log/exp functions
.isPGCD()                 // GCD
.isMin(), .isMax()        // Min/max
.isMinP(), .isMaxP()      // Positional min/max

// Unit checking
.isLength()               // Has length unit (m, cm, etc.)
.isMass()                 // Has mass unit (g, kg, etc.)
.isVolume()               // Has volume unit (m³, L, etc.)
.isDuration()             // Has time unit (s, h, etc.)

// Equality checking
.equals(other)            // Mathematical equivalence (normalized)
.strictlyEquals(other)    // String representation equivalence
.compareTo(other)         // -1, 0, 1 comparison result
.isLowerThan(other)       // Numeric comparison
.isGreaterThan(other)
.isLowerOrEqual(other)
.isGreaterOrEqual(other)

// Special values
.isZero()                 // Evaluates to 0
.isOne()                  // String === '1'
.isMinusOne()             // String === '-1'
.isInt()                  // Is integer
.isEven()                 // Is even integer
.isOdd()                  // Is odd integer
.isNumeric()              // All children are numeric
```

### 5.2 Transformation Methods

```typescript
// Simplification chain (used throughout validation)
.removeZerosAndSpaces()   // Remove 01, 1.0 (leading/trailing zeros)
.reduceFractions()        // 4/8 → 1/2
.simplifyNullProducts()   // 0*x → 0
.removeNullTerms()        // x+0 → x
.removeFactorsOne()       // 1*x → x
.removeSigns()            // --x → x
.removeUnecessaryBrackets(allowFirstNegativeTerm?)  // (x) → x
.removeMultOperator()     // 2*x → 2x
.sortTermsAndFactors()    // Normalize order

// Sorting
.sortTerms()              // Sort addition terms
.sortFactors()            // Sort multiplication factors
.shallowSortTerms()       // Sort only immediate terms
.shallowSortFactors()     // Sort only immediate factors

// Shuffling (for generating variations)
.shuffleTerms()           // Random term order
.shuffleFactors()         // Random factor order
.shuffleTermsAndFactors() // Random of both
.shallowShuffleTerms()    // Shallow shuffle
.shallowShuffleFactors()  // Shallow shuffle

// Space/zero handling
.searchUnecessaryZeros()  // Detect 01 or 1.0
.searchMisplacedSpaces()  // Detect spacing issues in numbers

// Arithmetic operations
.add(exp)                 // a + exp
.sub(exp)                 // a - exp
.mult(exp, type?)         // a * exp (TYPE_PRODUCT, TYPE_PRODUCT_IMPLICIT, TYPE_PRODUCT_POINT)
.div(exp)                 // a ÷ exp
.frac(exp)                // a/exp (fraction)
.oppose()                 // -a
.inverse()                // 1/a

// Function operations
.pow(exp)                 // a^exp
.radical()                // √a
.abs()                    // |a|
.floor()                  // ⌊a⌋
.sin(), .cos(), .tan()    // Trig
.ln(), .log(), .exp()     // Log/exp
.mod(exp)                 // a mod exp
.positive()               // +a (unary plus)
.bracket()                // (a)

// Structural access
.first                    // First operand (child 0)
.last                     // Last operand (child 1 or highest)
.children                 // All children array
.parent                   // Parent node
.root                     // Root of tree
.terms                    // Recursively get sum terms with signs
.factors                  // Recursively get product factors

// Evaluation
.eval(params?)            // Evaluate expression
  // params: { values?: {}, decimal?: bool, precision?: number, unit?: string }
.substitute(values)       // Replace symbols with values
.derive(variable?)        // Symbolic derivative
.compose(g, variable?)    // Function composition f(g(x))
.generate()               // Generate template values
.normal                   // Get normalized form

// Comparison & matching
.matchTemplate(template)  // Check if matches format template
.reduce()                 // Reduce numeric fraction

// Output formatting
.string                   // ASCII string representation
.latex                    // LaTeX format
.texmacs                  // TeXmacs format
.toString(params?)        // Custom ASCII output
.toLatex(params?)         // Custom LaTeX output
.toTexmacs(params?)       // Custom TeXmacs output

// Properties
.type                     // TYPE_* constant
.value                    // Decimal value (for numbers)
.unit                     // Unit object
.input                    // Original input string
.parent                   // Parent node reference
.pos                      // Position in parent
.isChild()                // Has parent?
.isFirst()                // First child?
.isLast()                 // Last child?
```

### 5.3 Critical TinyCAS Behavior

**Immutability**: All transformation methods return NEW nodes, don't modify in place

**Chaining**: Methods can be chained:

```typescript
expression.removeZerosAndSpaces().reduceFractions().removeNullTerms().sortTermsAndFactors();
```

**Normalization**: `.normal` property caches normalized form:

```typescript
expression.normal.node; // Get normalized expression
expression.normal.string; // Get normalized string
expression.normal.isSameQuantityType(other); // Compare units
```

**Error Handling**: Invalid expressions return IncorrectExp type:

```typescript
if (expression.isIncorrect()) {
	// expression.error contains error message
}
```

---

## PART 6: SPECIAL CASES & EDGE HANDLING

### 6.1 Fill-in-the-Blanks Questions (`isQuestionFillIn`)

**Identified by**: `question.expression.includes('?')`

**Validation**:

1. Each answer replaces `?` in expression
2. After substitution, entire expression is validated
3. Individual answers checked for correctness
4. Global expression checked for mathematical correctness

**Code**:

```typescript
let i = -1;
const putAnswers = () => {
	i++;
	return `{${correctedItem.answers[i]}}`; // Wrap in braces
};
const exp = math(correctedItem.expression.replace(/\?/g, putAnswers));
if (exp.isIncorrect()) {
	correctedItem.status = STATUS_INCORRECT;
	if (!incorrectForm) correctedItem.coms.push(MATH_GLOBALLY_INCORRECT);
}
```

### 6.2 Result/Rewrite Questions (`isQuestionResultOrRewrite`)

**Identified by**: Has `answerFormat` field

**Validation**: Similar to fill-in but uses `answerFormat` instead of `expression`

```typescript
const exp = math(correctedItem.answerFormat.replace(/\?/g, putAnswers));
if (exp.isIncorrect()) {
	correctedItem.status = STATUS_INCORRECT;
}
```

### 6.3 Multiple Choice Questions (`isQuestionChoice` / `isQuestionChoices`)

**Single choice**: `isQuestionChoice` - exactly one answer required  
**Multiple choice**: `isQuestionChoices` - multiple answers (multipleAnswers: true)

**Validation**:

```typescript
// Simple index matching
if (solutions.toString() !== answers.toString()) {
	// Check each answer
	answers.forEach((answer, i) => {
		if (!solutions.includes(answer)) {
			statuss[i] = STATUS_INCORRECT;
			status = STATUS_INCORRECT;
		}
	});

	// Partial credit for multiple choice
	if (!incorrect && answers.length >= solutions.length / 2) {
		status = STATUS_UNOPTIMAL_FORM; // Awarded partial points
	}
}
```

### 6.4 Answer Field Questions (`isQuestionAnswerField`)

**Identified by**: Has `answerField` field

**Process**: Like fill-in but uses `answerField` and replaces `...` instead of `?`

### 6.5 Solutions Order Independence

**Option**: `solutions-order-not-important`

**Behavior**:

```typescript
if (option.includes('solutions-order-not-important')) {
  // Find first unused solution matching answer
  const index = solutions.findIndex(
    (solution, j) =>
      !solutionsUsed.includes(j) && math(answer).equals(math(solution))
  )
  if (index === -1) → STATUS_INCORRECT
  else → mark solution as used
} else {
  // Match by index
  if (!math(answer).equals(math(solutions[i]))) → STATUS_INCORRECT
}
```

### 6.6 Time (HMS) Unit Handling

**Special unit**: `unit === 'HMS'` (Hours:Minutes:Seconds)

**Validation**:

```typescript
if (unit === 'HMS' && !expression.isTime()) {
	// Invalid time format
}
```

---

## PART 7: FEEDBACK MESSAGES

### 7.1 All Feedback Messages (26 unique messages)

```typescript
// Empty answer
EMPTY_ANSWER = "Tu n'as rien répondu. ";
EMPTY_MULTIPLE_ANSWERS = "Tu n'as pas tout complété. ";

// Format validation
SPACES = 'Les chiffres sont mal espacés. ';
SPACES_MULTIPLE_ANSWERS = 'Les chiffres sont mal espacés. ';

PRODUCTS = 'Tu peux simplifier certains symboles de multiplication. ';
PRODUCTS_MULTIPLE_ANSWERS = 'Tu peux simplifier certains symboles de multiplication. ';

BRACKETS = 'Il y a des parenthèses inutiles. ';
BRACKETS_MULTIPLE_ANSWERS = 'Il y a des parenthèses inutiles. ';
BRACKETS_FIRST_TERM = 'Il y a des parenthèses inutiles en début de somme. ';

ZEROS = 'Il y a un ou des zéros inutiles. ';
ZEROS_MULTIPLE_ANSWERS = 'Il y a un ou des zéros inutiles. ';

SIGNS = 'Tu peux faire des simplifications de signes. ';
SIGNS_MULTIPLE_ANSWERS = 'Tu peux faire des simplifications de signes dans tes réponses. ';

FACTORE_ONE = 'Tu peux simplifier le ou les facteurs 1. ';
FACTORE_ONE_MULTIPLE_ANSWERS = 'Tu peux simplifier le ou les facteurs 1. ';

FACTORE_ZERO = 'Tu peux simplifier un ou des facteurs nuls. ';
FACTORE_ZERO_MULTIPLE_ANSWERS = 'Tu peux simplifier un ou des facteurs nuls. ';

NULL_TERMS = 'Il y a un ou des termes nuls que tu peux enlever. ';
NULL_TERMS_MULTIPLE_ANSWERS = 'Il y a un ou des termes nuls que tu peux enlever. ';

FRACTIONS = 'Il y a une ou des fractions non simplifiées. ';
FRACTIONS_MULTIPLE_ANSWERS = 'Il y a une ou des fractions non simplifiées. ';

BAD_UNIT = "Ta réponse n'est pas écrite avec l'unité demandée. ";
BAD_UNIT_MULTIPLE_ANSWERS = "Ta réponse n'est pas écrite avec l'unité demandée. ";

// Permutation
TERMS_PERMUTATION = 'Les termes doivent être écrits dans un certain ordre. ';
TERMS_PERMUTATION_MULTIPLE_ANSWERS = 'Les termes doivent être écrits dans un certain ordre. ';

FACTORS_PERMUTATION = 'Les facteurs doivent être écrits dans un certain ordre. ';
FACTORS_PERMUTATION_MULTIPLE_ANSWERS = 'Les facteurs doivent être écrits dans un certain ordre. ';

TERMS_FACTORS_PERMUTATION = 'Les termes et facteurs doivent être écrits dans un certain ordre. ';
TERMS_FACTORS_PERMUTATION_MULTIPLE_ANSWERS =
	'Les termes et facteurs doivent être écrits dans un certain ordre. ';

// Math correctness
MATH_INCORRECT = "Ta réponse n'est pas écrite correctement. ";
MATH_INCORRECT_MULTIPLE_ANSWERS = "Ta réponse n'est pas écrite correctement. ";
MATH_GLOBALLY_INCORRECT = "L'expression obtenue n'est pas mathématiquement correcte. ";

BAD_FORM = "Ta réponse n'est pas écrite sous la forme demandée. ";
BAD_FORM_MULTIPLE_ANSWERS = "Ta réponse n'est pas écrite sous la forme demandée. ";

INCOMPLETE_CHOICES = "Tu n'as pas choisi toutes les bonnes réponses. ";
```

### 7.2 Message Selection Logic

- **Single vs Multiple**: Check `item.answers.length === 1` to pick message variant
- **Context**: Messages concatenated based on violations found
- **Color coding**: In correction display:
  - Green (correct_color): STATUS_CORRECT
  - Orange (unoptimal_color): STATUS_UNOPTIMAL_FORM
  - Red (incorrect_color): STATUS_INCORRECT or STATUS_BAD_FORM or STATUS_BAD_UNIT

---

## PART 8: CORRECTION OUTPUT GENERATION

### 8.1 Simple Correction (`createCorrection` function)

Generates `item.simpleCorrection` array of `Line` objects:

**Process**:

1. If `correctionFormat` defined: Use custom format templates
2. Else if choice question: Show choices with badges (correct/incorrect)
3. Else if fill-in: Replace `\ldots` with solutions or answers
4. Else if result/rewrite: Show equation with solution boxed
5. Else if answer field: Show field with answers filled

**Format Templates** (from `correctionFormat`):

```typescript
if (status === STATUS_CORRECT) {
	// Show .correct[] templates
} else {
	// Show .uncorrect[] templates
	// Add answer comment if not empty
}
```

**Placeholders** in templates:

```
&expression     → Full expression
&exp            → Expression (in LaTeX context)
&expression2    → Second expression
&exp2           → Second expression (in LaTeX context)
&solution1      → First solution
&sol1, &solution → Solution placeholder
&answer1, &ans  → Answer placeholder
```

### 8.2 Detailed Correction (`createDetailedCorrection` function)

Generates `item.detailedCorrection` with step-by-step explanation

**Sources**:

- `item.correctionDetails` array (prepared during question generation)
- Each detail can be: type='image' or type='text'
- Text supports same placeholders as simple correction

**Process**:

```typescript
correctionDetails.forEach((detail) => {
  if (detail.type === 'image') {
    line = { html: `<img src="${detail.base64}">` }
  } else {
    line = { text: detail.text }
    // Replace all placeholders
    .replace(/&expression/, ...)
    .replace(/&solution/, ...)
    // etc.
  }
  lines.push(line)
})
```

---

## PART 9: DATA STRUCTURES

### 9.1 GeneratedQuestion (Input to assessItem)

```typescript
type GeneratedQuestion = QuestionWithID & {
	answerField?: string; // For answer field type
	answerFormat?: string; // For result/rewrite type
	answerFormat_latex?: string;
	choices?: Choice[]; // For choice questions
	correctionDetails?: CorrectionDetail[];
	correctionFormat?: CorrectionFormat;
	delay: number;
	enounce: string;
	enounce2?: string;
	expression_latex?: string; // For fill-in type
	expression?: string;
	expression2_latex?: string;
	expression2?: string;
	generatedVariables: Variables; // Generated variable values
	i: number;
	image?: string;
	imageBase64P?: Promise<string>;
	imageCorrection?: string;
	imageCorrectionBase64P?: Promise<string>;
	order_elements: string[];
	points: number;
	solutions?: (string | number)[];
	prefilled?: string[];
	testAnswers?: string[]; // Custom validation logic
	unit?: string;
};
```

### 9.2 AnsweredQuestion

Extends GeneratedQuestion with:

```typescript
type AnsweredQuestion = {
	answers: string[] | number[]; // User's answers
	answers_latex: string[]; // LaTeX version
	options: Option[]; // Validation options
	time?: number;
	prefilled: string[];
};
```

### 9.3 CorrectedQuestion

Extends AnsweredQuestion with:

```typescript
type CorrectedQuestion = {
	// Status tracking
	status: CorrectionStatus; // Overall status
	statuss: CorrectionStatus[]; // Per-answer status

	// Feedback
	coms: string[]; // Comment messages
	unoptimals: string[]; // What needs improvement

	// Solution info
	solutions: (string | number)[];
	solutionsIndexs: Record<number, number>; // For reordering
	solutionsUsed: number[];
	testAnswers: string[];

	// Correction output
	choices: Choice[];
	correctionDetails: CorrectionDetail[];
	simpleCorrection: Line[]; // Simple explanation
	detailedCorrection: Line[]; // Step-by-step
};
```

### 9.4 Type Definitions

```typescript
type Option = 'require-correct-spaces' | 'no-penalty-for-incorrect-spaces' | ...
              // (38 total options listed in section 3.1)

type CorrectionStatus =
  | 'empty'
  | 'correct'
  | 'incorrect'
  | 'unoptimal form'
  | 'bad form'
  | 'bad unit'

type Choice = {
  text?: string
  image?: string
  imageBase64?: string
}

type CorrectionDetail = {
  text: string
  type?: string              // 'image' or undefined
  base64?: string           // For images
}

type CorrectionFormat = {
  correct: string[]         // Templates for correct answers
  uncorrect?: string[]      // Templates for incorrect answers
  answer?: string           // How to display user's answer
}

type Line = {
  text?: string
  latex?: string
  html?: string
  texmacs?: string
  choices?: LineChoice[]    // For MCQ
}
```

---

## PART 10: SUMMARY - FEATURES TO MIGRATE

### 10.1 Core Features (MUST IMPLEMENT)

1. **Validation Status System** (6 statuses)
   - STATUS_EMPTY, STATUS_CORRECT, STATUS_INCORRECT
   - STATUS_UNOPTIMAL_FORM, STATUS_BAD_FORM, STATUS_BAD_UNIT

2. **Constraint Validation** (10 constraint types)
   - Spaces, products, brackets, zeros, signs
   - Factors (one, zero), null terms, fractions, units

3. **Form Checking** (3 strategies)
   - Custom format templates
   - One-form solution
   - Normal form after cleanup

4. **Terms & Factors Ordering** (3 modes)
   - Disallow (strict)
   - Penalty (unoptimal)
   - Allow any (no check)

5. **Test Answers** (Custom validation)
   - Pattern: `&answer` with `&&` joining
   - Supports all math operations
   - Must evaluate to boolean

6. **Multiple Question Types**
   - Single choice, multiple choice
   - Fill-in-the-blanks
   - Result/rewrite
   - Answer field
   - Free-form math

7. **Feedback Messages** (26 unique messages)
   - Per-constraint messages
   - Single vs multiple answer variants

8. **Correction Output**
   - Simple correction (single explanation)
   - Detailed correction (step-by-step)
   - Template-based formatting
   - Placeholder system (&expression, &solution, etc.)

### 10.2 Math Processing Features (MUST MIGRATE)

1. **Expression Validation**
   - `isCorrect()`, `isIncorrect()`
   - Parse and detect errors

2. **Equivalence Checking**
   - `equals()` - normalized comparison
   - `strictlyEquals()` - string comparison

3. **Simplification Chain** (must preserve order)
   - `removeZerosAndSpaces()`
   - `reduceFractions()`
   - `simplifyNullProducts()`
   - `removeNullTerms()`
   - `removeFactorsOne()`
   - `removeSigns()`
   - `removeUnecessaryBrackets()`
   - `removeMultOperator()`

4. **Sorting**
   - `sortTerms()`, `sortFactors()`, `sortTermsAndFactors()`
   - Shallow variants for limited scope

5. **Space & Zero Detection**
   - `searchUnecessaryZeros()` - regex patterns
   - `searchMisplacedSpaces()` - spacing rules

6. **Type Detection**
   - Structure: `isSum()`, `isProduct()`, `isQuotient()`, etc.
   - Units: `isLength()`, `isMass()`, `isVolume()`, `isDuration()`
   - Special: `isTime()`, `isTemplate()`, `isHole()`

7. **Evaluation**
   - `eval(params)` - numeric evaluation
   - `substitute(values)` - symbol replacement
   - Support for decimal precision

8. **Template Matching**
   - `matchTemplate(template)` - format validation
   - Used in format verification

9. **Unit Handling**
   - Unit detection and compatibility
   - Time (HMS) special case
   - Unit conversion support

### 10.3 Option Flags (38 total)

All 38 flags must be implemented with proper precedence:

- Each constraint has `require-*` and `no-penalty-*` variants
- Can't have both set simultaneously
- Default behavior when neither set

### 10.4 Edge Cases (MUST HANDLE)

1. Fill-in-the-blanks with global validation
2. Result/rewrite equations
3. Multiple answer fields
4. Solutions that can be reordered
5. Time (HMS) units
6. Partial credit for MCQ (50% of solutions selected)
7. Empty forms in multiple-answer scenarios
8. First negative term bracket exception

---

## MIGRATION CHECKLIST

- [ ] Implement all 6 status constants
- [ ] Implement all 10 constraint check functions
- [ ] Implement form verification (3 strategies)
- [ ] Implement terms/factors ordering (3 modes)
- [ ] Implement testAnswers processing
- [ ] Implement all 26 feedback messages
- [ ] Implement question type detection
- [ ] Implement all 38 option flags
- [ ] Implement edge cases (fill-in, result/rewrite, etc.)
- [ ] Implement simple correction generation
- [ ] Implement detailed correction generation
- [ ] Replace TinyCAS method calls with equivalent functions
- [ ] Migrate from `math()` syntax to new evaluation system
- [ ] Test all validation paths
- [ ] Test all correction output formats

---

## KEY INSIGHTS FOR NEW SYSTEM

1. **Composable Validation**: Validation is modular - each constraint independent
2. **Status Cascading**: `UNOPTIMAL_FORM` < `CORRECT` < `BAD_FORM` < `INCORRECT`
3. **Cleanup Chain**: Order matters - simplifications must apply in exact sequence
4. **Option Pairs**: Every behavioral option has `require-*` and `no-penalty-*` variants
5. **Type-Specific Logic**: Different question types require different validation
6. **Flexible Correction**: Simple and detailed corrections generated from templates
7. **Test Expressions**: Custom validation for non-explicit solutions
8. **Multi-Answer Support**: Handle multiple answer fields with individual/global checks
9. **Unit System**: Dedicated unit validation with HMS special case
10. **Normalization**: Critical for equivalence - use normal form before comparison
