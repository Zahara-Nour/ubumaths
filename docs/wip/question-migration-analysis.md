# Question System Migration Analysis

> **RESUME INSTRUCTIONS**: To continue this analysis in a new session, ask Claude to:
>
> 1. "Read docs/wip/question-migration-analysis.md" (copy this file there first)
> 2. "Continue the question migration analysis"
>
> **Key files to reference**:
>
> - `extern/new-tinymath/apps/ubumaths/src/lib/questions/correction.ts` - Old validation logic
> - `extern/new-tinymath/apps/ubumaths/src/types/type.ts` - Old type definitions
> - `src/lib/questions/types.ts` - New type definitions
> - `src/lib/migration/question-transformer.ts` - Current migration code

## Executive Summary

This document analyzes the migration from TinyMath/TinyCAS to the new Markdown-based question system, with a focus on validation capabilities.

**Latest Updates (v2.4.0 - 2025-11-26):**

- ✅ **Relative integers** (`$er[min;max]` → `{{±min..max}}`) - Fully supported
- ✅ **Decimal by digits** (`$d{n;m}` → `{{n.m}}`) - Fully supported
- ✅ **Double-dot ranges** (`..`) for clearer negative ranges
- ✅ **Auto-step inference** for decimal ranges without explicit step
- ✅ **Ternary operators** (`condition ?? trueVal :: falseVal` → `{{if:condition|trueVal|falseVal}}`)
- ✅ **Mini/maxi functions** (`mini(a;b)` → `min(a,b)`, `maxi(a;b)` → `max(a,b)`)
- ✅ **Constraint Validators** - 5 validators implemented with 133 tests (spaces, products, brackets, zeros, form)
- ✅ **Feedback System** - French feedback messages for constraint violations
- ✅ **Partial Credit** - `unoptimal_form` status for 'warn' mode constraints

**Migration Coverage:** 🎉 **100% of 633 questions** now have fully convertible syntax!

**Validation System:** ✅ Constraint validators implemented! Only **unit validation** (~200 lines) remains for full parity.

---

## 1. Compute Engine Capabilities (Updated)

After deeper research ([MathLive docs](https://mathlive.io/compute-engine/)), ComputeEngine has **more capabilities** than initially assessed:

### What ComputeEngine CAN Do

| Capability                                                          | Method                          | TinyCAS Equivalent  |
| ------------------------------------------------------------------- | ------------------------------- | ------------------- |
| **Canonical form** (auto-reduce fractions, sort args, remove zeros) | `ce.parse()` / `expr.canonical` | Manual methods      |
| **Structural equality** (after canonicalization)                    | `expr.isSame(other)`            | `strictlyEquals()`  |
| **Mathematical equality**                                           | `expr.isEqual(other)`           | `equals()`          |
| **Simplification** (expand, factor, combine)                        | `expr.simplify()`               | Multiple methods    |
| **Numeric evaluation**                                              | `expr.evaluate()` / `expr.N()`  | `eval()`            |
| **Pattern matching with wildcards**                                 | `expr.match(pattern)`           | `matchTemplate()`   |
| **Rewrite rules**                                                   | `expr.replace(rules)`           | N/A                 |
| **Boolean conditions**                                              | Parse & evaluate `x > 5`        | `math(test).eval()` |
| **Validity check**                                                  | `expr.isValid`, `expr.errors`   | `isIncorrect()`     |

### Canonical Form Transformations (Automatic!)

ComputeEngine automatically applies these when parsing:

- **Rationals reduced**: `6/4` → `3/2`
- **Arguments sorted**: `b + a` → `a + b` (commutative functions)
- **Zero literals removed**: `x + 0` → `x`
- **Unity factors removed**: `1 * x` → `x`
- **Sign simplification**: `(-x)(-y)` → `xy`
- **Power simplification**: `x^1` → `x`, `x^0` → `1`
- **Associative flattening**: Removes unnecessary grouping

### What ComputeEngine Cannot Do Directly

| Need                                          | Solution                              |
| --------------------------------------------- | ------------------------------------- |
| Check spacing in numbers                      | Custom regex check                    |
| Require implicit products (no `*`)            | Check LaTeX string directly           |
| Enforce specific form (factored vs expanded)  | Use `match()` with pattern            |
| Check term/factor ordering when order matters | Compare with `{exact: true}` in match |
| Unit handling                                 | Limited - may need custom code        |

---

## 2. Validation Options Migration Strategy

### Tier 1: Handled by Canonical Form (No code needed)

These happen automatically when parsing:

- `require-reduced-fractions` ✅ (canonical reduces fractions)
- `require-no-extraneaous-zeros` ✅ (canonical removes them)
- `require-no-factor-one` ✅ (canonical removes factor 1)
- `require-no-factor-zero` ✅ (canonical simplifies)
- `require-no-null-terms` ✅ (canonical removes +0)
- `require-no-extraneaous-signs` ✅ (canonical simplifies --)

### Tier 2: Use Pattern Matching

- `one-single-form-solution` → Use `match()` with exact pattern
- `disallow-terms-permutation` → `match()` with `{exact: true}`
- `disallow-factors-permutation` → Same approach

### Tier 3: Custom Validators Needed

- `require-implicit-products` → Check LaTeX for `\times` or `\cdot`
- `require-correct-spaces` → Regex on LaTeX string
- `no-penalty-for-extraneous-brackets` → Compare canonical forms

### Tier 4: Display/Generation Only (Not validation)

- `shuffle-terms`, `shuffle-factors` → Handle in generation, not validation
- `no-shuffle-choices` → UI concern

---

## 3. testAnswerss Analysis & Recommendation

### Current Usage

`testAnswerss` allows boolean expressions like:

```javascript
'&answer > 0 && &answer < 10';
'&answer % 2 == 0'; // Even number
```

### Can ComputeEngine Do This?

**YES**, but differently:

```javascript
const ce = new ComputeEngine();
const expr = ce.parse('x > 5'); // Parse inequality
const result = expr.subs({ x: 7 }).evaluate(); // Substitute & evaluate
// result represents True/False
```

### Recommendation: Convert to Range/Condition Type ✅ IMPLEMENTED

> **Status (2025-11-27):** Types and evaluator are **IMPLEMENTED** in:
>
> - `src/lib/questions/types.ts` (lines 580-685) - ValidationRule discriminated union
> - `src/lib/questions/validation-rule-evaluator.ts` (665 lines, 71 tests)
>
> **Remaining:** Add `validationRules` field to `QuestionVariation` type, integrate in answer-validator, and add transformer conversion. See Section 23.

The typed ValidationRule system is implemented with 7 rule types:

```typescript
// IMPLEMENTED in src/lib/questions/types.ts
export type ValidationRule =
	| DivisorRule // { type: 'divisor', dividend: '{{n}}' }
	| MultipleRule // { type: 'multiple', base: '{{a}}' }
	| RangeRule // { type: 'range', min: '1', max: '{{max}}' }
	| EquationRootRule // { type: 'equation_root', equation: 'x^2 - {{sum}}*x + {{product}} = 0' }
	| EquivalenceRule // { type: 'equivalent', expression: '{{a}}/{{b}}' }
	| PredicateRule // { type: 'predicate', predicate: 'isPrime' | 'isEven' | ... }
	| CustomExpressionRule; // { type: 'custom', expression: 'gcd(answer, {{n}}) > 1' }
```

**Why?**

1. **Type-safe**: Predefined predicates are safer than arbitrary expressions
2. **Easier to migrate**: Most testAnswers are simple ranges
3. **Backwards compatible**: CustomExpressionRule handles complex cases
4. **Better UX**: Teachers can select from dropdown instead of writing expressions

---

## 4. Eval Syntax - Proposed New Format

### Requirements

- Support all modifiers: decimal `.`, positive `+`, bracket `(`, derivative `'`
- Combinable modifiers
- Clean markdown-friendly syntax

### Proposed Syntax

```
{{eval:expression}}          // Basic evaluation
{{eval:expression|modifiers}} // With modifiers
```

**Modifiers (can be combined)**:

- `d` or `decimal` → Decimal evaluation
- `+` or `positive` → Add + sign if positive
- `()` or `bracket` → Wrap in parentheses if negative
- `'` or `derivative` → Take derivative

**Examples**:

```markdown
{{eval:{{a}}+{{b}}}} // Basic: 3+5 → 8
{{eval:1/3|decimal}} // Decimal: → 0.333...
{{eval:{{x}}-5|+}} // Positive: if x=8 → +3
{{eval:{{x}}|()}} // Bracket: if x=-5 → (-5)
{{eval:{{a}}\*{{b}}|decimal,+}} // Combined: decimal + positive sign
{{eval:x^2|'}} // Derivative: → 2x
```

### Implementation

```typescript
function parseEvalModifiers(modifierString: string): EvalOptions {
	const opts: EvalOptions = {};
	for (const mod of modifierString.split(',')) {
		switch (mod.trim()) {
			case 'd':
			case 'decimal':
				opts.decimal = true;
				break;
			case '+':
			case 'positive':
				opts.addPositive = true;
				break;
			case '()':
			case 'bracket':
				opts.bracketNegative = true;
				break;
			case "'":
			case 'derivative':
				opts.derivative = true;
				break;
		}
	}
	return opts;
}
```

---

## 5. correctionDetailss vs correctionFormats - Migration

### Recommendation: Merge into Single Field

**New Structure**:

```typescript
interface QuestionVariation {
	// ... existing fields ...

	correction?: TemplateMarkdown; // Already exists - step-by-step explanation

	// NEW: Simple correction display template (optional)
	correctionDisplay?: {
		correct?: string; // Template when answer is correct
		incorrect?: string; // Template when answer is wrong
		showAnswer?: boolean; // Whether to show user's answer
	};
}
```

**Placeholders** (kept from old system):

- `{{expression}}` → The math expression
- `{{solution}}` → The correct answer
- `{{answer}}` → User's answer
- `{{solution:N}}` → N-th solution (for multi-answer)

---

## 6. Fields Conversion Summary

| Old Field              | New Equivalent                   | Notes                  |
| ---------------------- | -------------------------------- | ---------------------- |
| `description`          | `title`                          | Direct mapping         |
| `subdescription`       | `description`                    | Direct mapping         |
| `enounces[]`           | `variations[].statement`         | As TemplateMarkdown    |
| `expressions[]`        | Merged into statement            | Wrap in `$$...$$`      |
| `variabless[]`         | `variations[].variables`         | Convert `&N` → `{{N}}` |
| `solutionss[]`         | `variations[].answer`            | Convert syntax         |
| `choicess[]`           | `variations[].choices`           | With isCorrect flag    |
| `correctionDetailss[]` | `variations[].correction`        | As TemplateMarkdown    |
| `correctionFormats[]`  | `variations[].correctionDisplay` | New structure          |
| `answerFields[]`       | Convert to fill_in_blanks type   | `...` → `{{blank:N}}`  |
| `testAnswerss[]`       | `validation.condition`           | New predicate system   |
| `options[]`            | `options` object                 | Map to new structure   |
| `defaultDelay`         | `delay`                          | Direct mapping         |
| `grade`                | `grades[]`                       | Map old→new codes      |
| `prefilleds[]`         | TBD                              | May not be needed      |
| `units[]`              | Include in answer validation     |                        |
| `images[]`             | Markdown images in statement     | `![](url)`             |

### Random Syntax Conversion (v2.2.0)

| Old TinyCAS Pattern | New UbuMaths v2     | Converter Status | Notes                          |
| ------------------- | ------------------- | ---------------- | ------------------------------ |
| `$e[min;max]`       | `{{min-max}}`       | ✅ Supported     | Basic integer range            |
| `$e{n;m}`           | `{{n.m}}`           | ✅ Supported     | Decimal by digits              |
| `$er[min;max]`      | `{{±min..max}}`     | ✅ Supported     | Relative integers (v2.2.0)     |
| `$er{n}`            | `{{±n..n}}`         | ✅ Supported     | Single relative value (v2.2.0) |
| `$d{n;m}`           | `{{n.m}}`           | ✅ Supported     | Decimal by digits (v2.2.0)     |
| `$l{a;b;c}`         | `{{list:a,b,c}}`    | ✅ Supported     | List selection                 |
| `&varName`          | `{{varName}}`       | ✅ Supported     | Variable references            |
| `[_color_]`         | `{{color:name}}`    | ✅ Supported     | Color markers                  |
| `cond ?? t :: f`    | `{{if:cond\|t\|f}}` | ✅ Supported     | Ternary operators (v2.3.0)     |
| `mini(a;b)`         | `min(a,b)`          | ✅ Supported     | Minimum function (v2.3.0)      |
| `maxi(a;b)`         | `max(a,b)`          | ✅ Supported     | Maximum function (v2.3.0)      |
| `mod(a;b)`          | `mod(a,b)`          | ✅ Supported     | Modulo in ternary conditions   |

**Key Improvements in v2.3.0:**

- **Ternary operators** (`condition ?? trueVal :: falseVal`) now converted to `{{if:condition|trueVal|falseVal}}`
- **Mini/maxi functions** (`mini(a;b)`, `maxi(a;b)`) converted to standard `min(a,b)`, `max(a,b)`
- **Modulo in conditions** (`mod(a;b)`) converted to `mod(a,b)` inside ternary conditions
- **100% syntax coverage** achieved for all 633 questions!

---

## 7. Validation Implementation Plan

### Phase 1: Core Validation (ComputeEngine)

1. Wrap ComputeEngine with helper functions
2. Implement `validateEquivalent(userAnswer, expected)` using `isEqual()`
3. Implement `validateExact(userAnswer, expected)` using `isSame()` on canonical forms
4. Implement `validatePattern(userAnswer, pattern)` using `match()`

### Phase 2: Form Validation

1. Create validator for `require-implicit-products` (check LaTeX string)
2. Create validator for spacing (regex on LaTeX)
3. Create validator for custom predicates (even, odd, range, etc.)

### Phase 3: testAnswers Migration

1. Analyze actual testAnswerss usage in old questions
2. Convert common patterns to predefined predicates
3. Implement expression evaluator for complex cases

### Phase 4: Integration

1. Update answer-validator.ts to use new validators
2. Add options handling to validation pipeline
3. Test with migrated questions

---

## 8. Key Files to Modify

1. `src/lib/questions/compute-engine/wrapper.ts` - Extend with new methods
2. `src/lib/utils/answer-validator.ts` - New validation pipeline
3. `src/lib/questions/types.ts` - Add validation types
4. `src/lib/migration/question-transformer.ts` - Map old options
5. `src/lib/shared/parameterization/` - Add eval modifiers support

---

## 9. Unit Handling Strategy

**Problem**: ComputeEngine doesn't manage units, but TinyCAS does. Units are important for physics/measurement questions.

### Proposed Solution: Hybrid Approach

**Step 1**: Parse answer to separate value and unit

```typescript
// Input: "5.2 m" or "5.2m" or "5,2 m"
function parseValueWithUnit(answer: string): { value: string; unit: string | null } {
	// Regex to extract numeric part and unit
	const match = answer.match(/^([\d.,\s]+)\s*([a-zA-Z²³]+)?$/);
	return {
		value: match?.[1]?.trim() || answer,
		unit: match?.[2] || null
	};
}
```

**Step 2**: Validate value with ComputeEngine, validate unit separately

```typescript
function validateWithUnit(
	userAnswer: string,
	expectedValue: string,
	expectedUnit: string | null,
	options: { requireUnit: boolean; unitFlexible: boolean }
): ValidationResult {
	const parsed = parseValueWithUnit(userAnswer);

	// Validate numeric value
	const valueValid = areEquivalent(parsed.value, expectedValue);

	// Validate unit
	const unitValid = !expectedUnit || normalizeUnit(parsed.unit) === normalizeUnit(expectedUnit);

	return {
		isCorrect: valueValid && unitValid,
		feedback: !unitValid ? "L'unité n'est pas correcte" : undefined
	};
}
```

**Step 3**: Unit normalization table

```typescript
const UNIT_ALIASES: Record<string, string> = {
	m: 'm',
	metre: 'm',
	mètre: 'm',
	meters: 'm',
	km: 'km',
	kilometre: 'km',
	kilomètre: 'km',
	cm: 'cm',
	mm: 'mm',
	kg: 'kg',
	kilogramme: 'kg'
	// ... etc
};
```

**Template Syntax for Units**:

```markdown
answer: "42"
expectedUnit: "m" // Optional unit
unitRequired: true // Must include unit
unitFlexible: false // Accept only exact unit (not km for m)
```

---

## 10. Resolved Decisions

| Question              | Decision                                          | Rationale                             |
| --------------------- | ------------------------------------------------- | ------------------------------------- |
| Unit handling         | Hybrid: parse separately, custom unit validation  | CE doesn't support, important feature |
| Ordering (a+b vs b+a) | Rare - default to commutative equivalence         | User confirmed rarely needed          |
| Eval syntax           | `{{eval:expr\|modifiers}}` approved               | Clean, extensible                     |
| testAnswerss          | Convert to typed predicates + fallback expression | Type-safety + backwards compat        |

---

## 11. COMPREHENSIVE GAP ANALYSIS (Full Audit - 2025-11-26)

### Database Statistics

| Metric                  | Count | Notes                             |
| ----------------------- | ----- | --------------------------------- |
| Total questions         | 633   | Across 12 grades (CP to Terminal) |
| With variabless         | 623   | 98.4% use parameterization        |
| With solutions          | 391   | 61.8% have explicit solutions     |
| With multiple choice    | 47    | 7.4% are MCQ                      |
| With validation options | 138   | 21.8% have custom validation      |
| With correction details | 326   | 51.5% have step-by-step           |
| With images             | 12    | 1.9% - 157 total images           |
| With testAnswerss       | 8     | 1.3% - custom validation          |
| With conditions         | 29    | 4.6% - variable constraints       |
| With units              | 7     | HMS, €, km, m, dm, kg, L          |

### Feature Migration Matrix

| Feature                 | Old System                                              | New System                                                          | Status     | Gap                                 |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- | ---------- | ----------------------------------- |
| **Type System**         | 5 types (Choice, Choices, Fill-in, Result, AnswerField) | 6 types (numerical\_\*, algebraic, fill_in_blanks, multiple_choice) | ✅ Done    | Type mapping in transformer         |
| **Variable Syntax**     | `$e`, `$er`, `$d`, `$l`, `&var`                         | `{{}}` markdown syntax                                              | ✅ Done    | syntax-converter.ts                 |
| **Random Integers**     | `$e[1;9]`                                               | `{{1-9}}`                                                           | ✅ Done    | 1,703 occurrences                   |
| **Relative Integers**   | `$er[1;9]`                                              | `{{±1..9}}`                                                         | ✅ Done    | 212 occurrences                     |
| **Decimal by Digits**   | `$d{n;m}`                                               | `{{n.m}}`                                                           | ✅ Done    | 36 occurrences                      |
| **Lists**               | `$l{a;b;c}`                                             | `{{list:a,b,c}}`                                                    | ✅ Done    | 185 occurrences                     |
| **Computed Values**     | `[_expr_]`                                              | `{{eval:expr}}`                                                     | ✅ Done    | 93 occurrences                      |
| **Exclusions**          | `\\{val}`                                               | `{{1-10!5}}`                                                        | ✅ Done    |                                     |
| **Variable Bounds**     | `$e[&1;&2]`                                             | `{{{{a}}-{{b}}}}`                                                   | ✅ Done    |                                     |
| **Answer Validation**   | TinyCAS `.equals()`                                     | MathLive `areEquivalent()`                                          | ✅ Done    | answer-validator.ts                 |
| **Template Validation** | N/A                                                     | Zod schemas                                                         | ✅ Done    | template-validator.ts               |
| **Circular Dependency** | N/A (runtime error)                                     | DFS detection                                                       | ✅ Done    | circular-dependency.ts              |
| **Precision Types**     | Limited                                                 | 5 types (none, decimal, significant, magnitude, tolerance)          | ✅ Done    |                                     |
| **Multiple Choice**     | `choicess` array                                        | `choices[]` with `isCorrect`                                        | ✅ Done    | Shuffling preserved                 |
| **Fill-in-Blanks**      | `?` markers in expression                               | `blanks[]` array                                                    | ✅ Done    |                                     |
| **Colors**              | `${get(color1)}`                                        | `{{color:palette}}`                                                 | ⚠️ Partial | Resolution works, tracking not done |
| **Grade Mapping**       | Old codes (SPE_1, STMG)                                 | New codes (1_SPE, T_STMG)                                           | ✅ Done    | transformer                         |
| **Category Assignment** | Manual                                                  | theme/domain/subdomain/level                                        | ✅ Done    |                                     |

### Validation Options Gap Analysis

#### OLD System: 38 Option Flags

**Status Mapping:**
| Old Status | Old Code | Mapped To | Implementation |
|------------|----------|-----------|----------------|
| EMPTY | `STATUS_EMPTY` | `{ isCorrect: false, message: "..." }` | ✅ Done |
| INCORRECT | `STATUS_INCORRECT` | `{ isCorrect: false }` | ✅ Done |
| UNOPTIMAL_FORM | `STATUS_UNOPTIMAL_FORM` | `{ isCorrect: true, feedback: "..." }` | ⚠️ Framework only |
| CORRECT | `STATUS_CORRECT` | `{ isCorrect: true }` | ✅ Done |
| BAD_FORM | `STATUS_BAD_FORM` | `{ isCorrect: false, feedback: "..." }` | ⚠️ Framework only |
| BAD_UNIT | `STATUS_BAD_UNIT` | `{ isCorrect: false, feedback: "..." }` | ❌ Not started |

**Constraint Check Implementation:**

| Constraint   | Old Function             | New Implementation          | Status         |
| ------------ | ------------------------ | --------------------------- | -------------- |
| Spaces       | `checkSpaces()`          | Check LaTeX string          | ❌ Not started |
| Products     | `checkProducts()`        | Check for `\times`, `\cdot` | ❌ Not started |
| Brackets     | `checkBrackets()`        | Compare canonical forms     | ❌ Not started |
| Zeros        | `checkZeros()`           | Regex on LaTeX              | ❌ Not started |
| Signs        | `checkSigns()`           | CE canonical handles        | ⚠️ CE auto     |
| Factors One  | `checkFactorsOne()`      | CE canonical handles        | ⚠️ CE auto     |
| Factors Zero | `checkFactorsZero()`     | CE canonical handles        | ⚠️ CE auto     |
| Null Terms   | `checkNullTerms()`       | CE canonical handles        | ⚠️ CE auto     |
| Fractions    | `checkFractions()`       | CE canonical handles        | ⚠️ CE auto     |
| Units        | `checkUnits()`           | Custom unit parser          | ❌ Not started |
| Terms Order  | `checkTermsAndFactors()` | `match()` with exact        | ❌ Not started |
| Form         | `checkForm()`            | Pattern matching            | ❌ Not started |

**Option Flags Usage in Database:**

| Option Flag                            | Count | Priority | Status                   |
| -------------------------------------- | ----- | -------- | ------------------------ |
| `no-shuffle-choices`                   | 32    | High     | ✅ Handled in generator  |
| `penalty-for-factors-permutation`      | 24    | Medium   | ❌ Not implemented       |
| `no-penalty-for-extraneous-brackets`   | 23    | Low      | ⚠️ CE canonical handles  |
| `remove-null-terms`                    | 11    | Display  | ✅ Display only          |
| `no-penalty-for-non-reduced-fractions` | 10    | Low      | ⚠️ CE canonical handles  |
| `no-penalty-for-extraneous-zeros`      | 8     | Low      | ⚠️ CE canonical handles  |
| `require-no-extraneaous-zeros`         | 6     | Medium   | ❌ Need LaTeX check      |
| `no-penalty-for-factor-one`            | 6     | Low      | ⚠️ CE canonical handles  |
| `no-penalty-for-not-respected-unit`    | 6     | Medium   | ❌ Need unit system      |
| `solutions-order-not-important`        | 5     | High     | ✅ `allowDifferentForms` |
| `exp-remove-unecessary-brackets`       | 5     | Display  | ✅ Display only          |
| `exhaust`                              | 3     | Low      | ❌ Not implemented       |
| `shuffle-terms`                        | 3     | Display  | ✅ Display only          |
| `require-correct-spaces`               | 3     | Low      | ❌ Not implemented       |
| `exp-no-spaces`                        | 3     | Display  | ✅ Display only          |
| `require-implicit-products`            | 2     | Low      | ❌ Not implemented       |

---

## 12. testAnswerss Actual Patterns (8 Questions)

### Patterns Found in Database

```javascript
// Pattern 1: Divisor validation (most common)
'&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0';
// Usage: Find divisors excluding 1 and the number itself

// Pattern 2: Simple equality
'&answer=1/&1';
'&answer=0';
'&answer=1/2';
// Usage: Exact value match

// Pattern 3: Boolean with arithmetic
'mod(&1; &answer)=0 && &answer!=1';
// Usage: Must be a divisor, not 1
```

### Migration Strategy

| Pattern            | Occurrences | New System                  | Implementation    |
| ------------------ | ----------- | --------------------------- | ----------------- |
| `&answer=value`    | 3           | Standard answer match       | ✅ Already works  |
| `mod(a;&answer)=0` | 4           | `predicate: 'divisible_by'` | ❌ Need predicate |
| `&answer!=value`   | 4           | `exclusions: [value]`       | ❌ Need exclusion |
| `&&` combinations  | 5           | Expression evaluator        | ❌ Need evaluator |

### Recommended Implementation

```typescript
// New validation types for testAnswers patterns
interface CustomValidation {
	type: 'custom';

	// For divisor problems
	divisorOf?: string; // "{{a}}*{{b}}" - answer must divide this
	excludeValues?: string[]; // ["1", "{{a}}*{{b}}"] - values to reject

	// For general expressions (fallback)
	expression?: string; // Full expression like old testAnswers
}
```

---

## 13. Correction System Gap Analysis

### Old System Capabilities

| Feature           | Old Implementation                | Count                       |
| ----------------- | --------------------------------- | --------------------------- |
| Simple Correction | `createCorrection()`              | All questions               |
| Detailed Steps    | `correctionDetailss[]`            | 326 questions (811 entries) |
| Format Templates  | `correctionFormats[]`             | 15 questions                |
| Dynamic Colors    | `\textcolor{${get(color1)}}{...}` | ~50 questions               |
| Conditional Text  | `@@ condition ?? text @@`         | ~20 questions               |
| Placeholders      | `&sol`, `&answer`, `&expression`  | All corrections             |

### New System Status

| Feature                | Status         | Notes                         |
| ---------------------- | -------------- | ----------------------------- |
| Basic correction field | ✅ Done        | `variation.correction`        |
| Variable substitution  | ✅ Done        | `{{var}}` syntax              |
| LaTeX support          | ✅ Done        | `$...$` and `$$...$$`         |
| Color references       | ⚠️ Partial     | Resolution works, not tracked |
| Conditional text       | ❌ Not started | Need new syntax               |
| Multiple formats       | ❌ Not started | `correctionDisplay` proposed  |
| Feedback messages      | ❌ Not started | 26 messages need porting      |

### Feedback Messages to Port

```typescript
const FEEDBACK_MESSAGES = {
	EMPTY_ANSWER: "Tu n'as rien répondu.",
	EMPTY_MULTIPLE: "Tu n'as pas tout complété.",
	SPACES: 'Les chiffres sont mal espacés.',
	PRODUCTS: 'Tu peux simplifier certains symboles de multiplication.',
	BRACKETS: 'Il y a des parenthèses inutiles.',
	ZEROS: 'Il y a un ou des zéros inutiles.',
	SIGNS: 'Tu peux faire des simplifications de signes.',
	FACTOR_ONE: 'Tu peux simplifier le ou les facteurs 1.',
	FACTOR_ZERO: 'Tu peux simplifier un ou des facteurs nuls.',
	NULL_TERMS: 'Il y a un ou des termes nuls que tu peux enlever.',
	FRACTIONS: 'Il y a une ou des fractions non simplifiées.',
	BAD_UNIT: "Ta réponse n'est pas écrite avec l'unité demandée.",
	TERMS_ORDER: 'Les termes doivent être écrits dans un certain ordre.',
	FACTORS_ORDER: 'Les facteurs doivent être écrits dans un certain ordre.',
	MATH_INCORRECT: "Ta réponse n'est pas écrite correctement.",
	BAD_FORM: "Ta réponse n'est pas écrite sous la forme demandée.",
	INCOMPLETE_CHOICES: "Tu n'as pas choisi toutes les bonnes réponses."
	// ... 9 more variants for multiple answers
};
```

---

## 14. Special Features Gap Analysis

### Images (12 questions, 157 images)

| Aspect                       | Status         | Notes                  |
| ---------------------------- | -------------- | ---------------------- |
| Image reference in statement | ❌ Not started | Need `![](url)` syntax |
| Image path conversion        | ❌ Not started | Old paths need mapping |
| Correction images            | ❌ Not started | 5 questions use these  |
| Skip flag in transformer     | ✅ Done        | `skipImages` option    |

### Units (7 questions)

| Unit Type          | Count | Status                     |
| ------------------ | ----- | -------------------------- |
| HMS (time)         | 4     | ❌ Special handling needed |
| Currency (€)       | 1     | ❌ Need unit parser        |
| Length (km, m, dm) | 2     | ❌ Need unit parser        |
| Mass (kg)          | 1     | ❌ Need unit parser        |
| Volume (L)         | 1     | ❌ Need unit parser        |

### Conditions (29 questions)

| Pattern              | Example                  | Status               |
| -------------------- | ------------------------ | -------------------- |
| Not equal            | `&2*&3!=0`               | ✅ Exclusions handle |
| Multiple constraints | `&7!=&8 && &7!=&9`       | ⚠️ Partial           |
| Dynamic range        | `$e[2;mini(10-&1;&1-1)]` | ❌ Complex parsing   |

### Prefilleds (5 questions)

| Feature                  | Status         | Notes                 |
| ------------------------ | -------------- | --------------------- |
| Pre-filled answer fields | ❌ Not started | Low priority (only 5) |

### Letterss (4 questions)

| Feature                    | Status         | Notes                 |
| -------------------------- | -------------- | --------------------- |
| Symbol-to-variable mapping | ❌ Not started | Low priority (only 4) |

---

## 15. Implementation Priority List

### CRITICAL (Block Migration)

| Item                   | Effort | Impact      | Dependencies             |
| ---------------------- | ------ | ----------- | ------------------------ |
| Unit validation system | High   | 7 questions | Unit parser + normalizer |
| Derivative evaluation  | Medium | Unknown     | CE API research          |

### HIGH PRIORITY (Core Functionality)

| Item                         | Effort | Impact        | Dependencies        |
| ---------------------------- | ------ | ------------- | ------------------- |
| Feedback messages (26)       | Low    | All questions | Constants + i18n    |
| Form validation (require-\*) | Medium | 138 questions | LaTeX string checks |
| testAnswers evaluator        | Medium | 8 questions   | Expression parser   |
| Color tracking               | Low    | ~50 questions | Generator update    |

### MEDIUM PRIORITY (Enhanced Validation)

| Item                    | Effort | Impact        | Dependencies         |
| ----------------------- | ------ | ------------- | -------------------- |
| Constraint checks (10)  | High   | 138 questions | Per-check validators |
| Ordering validation     | Medium | 24 questions  | Pattern matching     |
| Conditional corrections | Medium | ~20 questions | New syntax design    |

### LOW PRIORITY (Edge Cases)

| Item           | Effort | Impact       | Dependencies   |
| -------------- | ------ | ------------ | -------------- |
| Image support  | Medium | 12 questions | Path mapping   |
| Prefilleds     | Low    | 5 questions  | UI changes     |
| Letterss       | Low    | 4 questions  | Symbol mapping |
| HMS time units | Low    | 4 questions  | Time parser    |

---

## 16. Current Migration Test Results (v2.3.0)

### Transformer Success Rate

Based on 633 questions:

- **Syntax conversion**: ✅ **100% pass** (syntax-converter.ts)
- **Type detection**: ✅ 100% pass (all 5 types recognized)
- **Grade mapping**: ✅ 100% pass
- **Variable conversion**: ✅ 100% pass (all patterns now supported)
- **Answer conversion**: ~90% pass (testAnswers still need runtime evaluation)

### Previously Failing Patterns - NOW FIXED (v2.3.0)

```javascript
// ✅ FIXED: Ternary in solutions
"&5<&6 ?? 0 :: 1"          → "{{if:{{5}}<{{6}}|0|1}}"

// ✅ FIXED: mini/maxi functions
"$e[2;[_mini(10-&1;&1-1)_]]" → "{{2-{{eval:min(10-{{1}},{{1}}-1)}}}}"

// ✅ FIXED: mod() in conditions
"mod(&1;2)=0 ?? 0 :: 1"    → "{{if:mod({{1}},2)=0|0|1}}"
```

### Remaining Runtime Considerations

```javascript
// testAnswerss patterns - syntax converts, needs runtime evaluator
'&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0';
// → Converted but needs expression evaluation at runtime
```

---

## 17. Recommended Next Steps

### Phase 1: Core Gaps (Week 1-2)

1. **Port feedback messages** - Create `src/lib/questions/feedback.ts`
2. **Implement unit parser** - Create `src/lib/questions/units.ts`
3. **Add LaTeX-level checks** - Extend `answer-validator.ts`

### Phase 2: Validation Enhancement (Week 3-4)

4. **Implement constraint checks** - 10 validators
5. **Add testAnswers evaluator** - Expression parser
6. **Fix derivative support** - CE wrapper update

### Phase 3: Polish (Week 5-6)

7. **Image support** - Path mapping + markdown syntax
8. **Conditional corrections** - New syntax design
9. **Edge cases** - HMS, letterss, prefilleds

### Files to Create/Modify

| File                                          | Action         | Priority |
| --------------------------------------------- | -------------- | -------- |
| `src/lib/questions/feedback.ts`               | Create         | High     |
| `src/lib/questions/units.ts`                  | Create         | High     |
| `src/lib/questions/constraint-validators.ts`  | Create         | High     |
| `src/lib/utils/answer-validator.ts`           | Extend         | High     |
| `src/lib/questions/compute-engine/wrapper.ts` | Fix derivative | Medium   |
| `src/lib/migration/question-transformer.ts`   | Add ternary    | Medium   |

---

## 18. DEEP CODE ANALYSIS - Validation System Status (v2.4.0 - 2025-11-26)

This section tracks the implementation progress towards full validation parity with the old TinyCAS system.

### 18.1 Current Implementation Status

#### answer-validator.ts - Updated with Constraint Checking ✅

```typescript
// Now includes constraint validation pipeline:
export function validateAnswer(
	userAnswer: string | string[] | number | number[],
	instance: QuestionInstance,
	userAnswerLatex?: string | string[] // NEW: for constraint checking
): ValidationResult {
	// 1. Type-specific validation (numerical, algebraic, blanks, choice)
	// 2. If correct AND constraints configured AND LaTeX provided:
	//    → applyConstraints() checks spaces, products, brackets, zeros, form
	//    → Returns status: 'correct', 'unoptimal_form', or 'bad_form'
}
```

**Implemented:** ✅ Constraint checking, ✅ Feedback messages, ✅ Form validation
**Remaining:** ❌ Unit validation only

#### correction.ts (Old System) - Complete Validation Pipeline

```typescript
// Old system: Full validation pipeline
// 1. STATUS_EMPTY check
// 2. Mathematical validity check (isIncorrect())
// 3. Equivalence check (equals())
// 4. Constraint checks (10 validators)
// 5. testAnswers custom validation
// 6. Form validation (strictlyEquals, matchTemplate)
```

### 18.2 Feedback Messages Inventory (26 messages)

**Single Answer Messages:**
| Key | French Message | Priority |
|-----|----------------|----------|
| `EMPTY_ANSWER` | "Tu n'as rien répondu." | High |
| `ZEROS` | "Il y a un ou des zéros inutiles." | Medium |
| `FACTOR_ONE` | "Tu peux simplifier le ou les facteurs 1." | Medium |
| `FACTOR_ZERO` | "Tu peux simplifier un ou des facteurs nuls." | Medium |
| `NULL_TERMS` | "Il y a un ou des termes nuls que tu peux enlever." | Medium |
| `BRACKETS` | "Il y a des parenthèses inutiles." | Medium |
| `BRACKETS_FIRST_TERM` | "Il y a des parenthèses inutiles en début de somme." | Low |
| `SPACES` | "Les chiffres sont mal espacés." | Low |
| `SIGNS` | "Tu peux faire des simplifications de signes." | Medium |
| `MATH_INCORRECT` | "Ta réponse n'est pas écrite correctement." | High |
| `MATH_GLOBALLY_INCORRECT` | "L'expression obtenue n'est pas mathématiquement correcte." | High |
| `PRODUCTS` | "Tu peux simplifier certains symboles de multiplication." | Medium |
| `FRACTIONS` | "Il y a une ou des fractions non simplifiées." | Medium |
| `BAD_FORM` | "Ta réponse n'est pas écrite sous la forme demandée." | High |
| `BAD_UNIT` | "Ta réponse n'est pas écrite avec l'unité demandée." | High |
| `TERMS_PERMUTATION` | "Les termes doivent être écrits dans un certain ordre." | Low |
| `FACTORS_PERMUTATION` | "Les facteurs doivent être écrits dans un certain ordre." | Low |
| `TERMS_FACTORS_PERMUTATION` | "Les termes et facteurs doivent être écrits dans un certain ordre." | Low |
| `INCOMPLETE_CHOICES` | "Tu n'as pas choisi toutes les bonnes réponses." | High |

**Multiple Answers Messages:** (13 additional variants - same content, different phrasing)

### 18.3 Constraint Validators to Implement

The old system has 10 constraint check functions. Analysis of each:

#### CE Auto-Handles (5 checks - Tier 1)

These are automatically handled by ComputeEngine canonical form:

| Check             | Old Function         | CE Behavior        | Action Needed       |
| ----------------- | -------------------- | ------------------ | ------------------- |
| Reduced fractions | `checkFractions()`   | `6/4` → `3/2` auto | None (CE canonical) |
| Factor one        | `checkFactorsOne()`  | `1*x` → `x` auto   | None (CE canonical) |
| Factor zero       | `checkFactorsZero()` | `0*x` → `0` auto   | None (CE canonical) |
| Null terms        | `checkNullTerms()`   | `x+0` → `x` auto   | None (CE canonical) |
| Signs             | `checkSigns()`       | `--x` → `x` auto   | None (CE canonical) |

#### Custom Implementation Status (5 checks - Tier 2/3)

| Check    | Old Function      | Implementation                   | Status                         |
| -------- | ----------------- | -------------------------------- | ------------------------------ |
| Spaces   | `checkSpaces()`   | Regex on LaTeX string            | ✅ DONE (20 tests)             |
| Products | `checkProducts()` | Check for `\times`, `\cdot`      | ✅ DONE (20 tests)             |
| Brackets | `checkBrackets()` | Check raw student LaTeX          | ✅ DONE (23 tests)             |
| Zeros    | `checkZeros()`    | Regex for leading/trailing zeros | ✅ DONE (18 tests)             |
| Form     | `checkForm()`     | Strict form matching             | ✅ DONE (17 tests)             |
| Units    | `checkUnits()`    | Custom unit parser               | ❌ TODO (7 questions affected) |

### 18.4 Unit Validation System Design

**Units in Database (7 questions):**

- `HMS` - Hours:Minutes:Seconds (4 questions)
- `€` - Currency (1 question)
- `km`, `m`, `dm` - Length (2 questions)
- `kg` - Mass (1 question)
- `L` - Volume (1 question)

**Proposed Implementation:**

```typescript
// src/lib/questions/units.ts

interface UnitValidationResult {
	isValid: boolean;
	value: number | null;
	unit: string | null;
	normalizedUnit: string | null;
	feedback?: string;
}

const UNIT_ALIASES: Record<string, string> = {
	// Length
	m: 'm',
	metre: 'm',
	mètre: 'm',
	meters: 'm',
	km: 'km',
	kilometre: 'km',
	kilomètre: 'km',
	cm: 'cm',
	centimetre: 'cm',
	centimètre: 'cm',
	mm: 'mm',
	dm: 'dm',
	// Mass
	kg: 'kg',
	kilogramme: 'kg',
	g: 'g',
	gramme: 'g',
	// Volume
	L: 'L',
	l: 'L',
	litre: 'L',
	// Currency
	'€': '€',
	EUR: '€',
	euro: '€',
	euros: '€'
};

// HMS requires special parsing
function parseHMS(input: string): { hours: number; minutes: number; seconds: number } | null {
	// Parse formats like "2h30min15s", "2:30:15", "2 h 30 min"
}

function parseValueWithUnit(answer: string): UnitValidationResult {
	// 1. Try HMS parsing first
	// 2. Extract numeric value and unit suffix
	// 3. Normalize unit using UNIT_ALIASES
	// 4. Return structured result
}

export function validateWithUnit(
	userAnswer: string,
	expectedValue: string,
	expectedUnit: string | null,
	options: { requireUnit: boolean; strictUnit: boolean }
): ValidationResult {
	// Implementation
}
```

### 18.5 Status Codes Mapping

| Old Status | Old Constant            | New Mapping                                         | Use Case             |
| ---------- | ----------------------- | --------------------------------------------------- | -------------------- |
| Empty      | `STATUS_EMPTY`          | `{ isCorrect: false, status: 'empty' }`             | No answer            |
| Incorrect  | `STATUS_INCORRECT`      | `{ isCorrect: false }`                              | Wrong answer         |
| Unoptimal  | `STATUS_UNOPTIMAL_FORM` | `{ isCorrect: true, partialCredit: 0.5, feedback }` | Right but suboptimal |
| Bad Form   | `STATUS_BAD_FORM`       | `{ isCorrect: false, feedback }`                    | Wrong form required  |
| Bad Unit   | `STATUS_BAD_UNIT`       | `{ isCorrect: false, feedback }`                    | Unit mismatch        |
| Correct    | `STATUS_CORRECT`        | `{ isCorrect: true }`                               | Perfect answer       |

### 18.6 Extended ValidationResult Type

```typescript
// New type for extended validation results
export interface ExtendedValidationResult extends ValidationResult {
	status: 'correct' | 'incorrect' | 'empty' | 'unoptimal' | 'bad_form' | 'bad_unit';
	partialCredit?: number; // 0-1 for partial answers
	unoptimals?: string[]; // List of unoptimal aspects
	feedback?: string; // User-facing message
	technicalDetails?: {
		// For debugging
		constraintsFailed?: string[];
		userParsed?: unknown;
		expectedParsed?: unknown;
	};
}
```

### 18.7 Implementation Roadmap

#### Phase 1: Feedback & Status System ✅ COMPLETED

**File: `src/lib/questions/feedback.ts`** - Created

- ✅ French feedback messages for 5 constraint types (single/multiple variants)
- ✅ `CONSTRAINT_FEEDBACK` constant exported

**File: `src/lib/questions/types.ts`** - Extended

- ✅ `ValidationStatus` type: `'correct' | 'unoptimal_form' | 'bad_form' | 'incorrect' | 'empty'`
- ✅ `ConstraintId` type: `'spaces' | 'products' | 'brackets' | 'zeros' | 'form'`
- ✅ `ConstraintMode` type: `'strict' | 'warn' | 'off'`
- ✅ `ConstraintOptions` interface

**Commit:** `5daf44d9`

#### Phase 2: Unit Validation ❌ TODO (Est. 2-3 days)

**File: `src/lib/questions/units.ts`** - To create

- Unit parsing (value + unit extraction)
- Unit normalization (UNIT_ALIASES)
- HMS time parsing
- Unit comparison functions

**File: `src/lib/utils/answer-validator.ts`**

- Integrate unit validation
- Add `validateWithUnit()` function

#### Phase 3: Constraint Validators ✅ COMPLETED

**File: `src/lib/questions/constraint-validators.ts`** - Created (~300 lines)

```typescript
// All validators implemented and tested (101 tests total):
export function checkSpaces(answersLatex: string[]): number[]; // 20 tests
export function checkProducts(answersLatex: string[]): number[]; // 20 tests
export function checkBrackets(answersLatex: string[], options?): number[]; // 23 tests
export function checkZeros(answers: string[]): number[]; // 18 tests
export function checkForm(answers: string[], expected: string[], options?): number[]; // 17 tests
```

**Commit:** `d83f6613`

#### Phase 4: Options Handling ✅ COMPLETED

**File: `src/lib/utils/answer-validator.ts`** - Extended

- ✅ `applyConstraints()` function integrates all validators
- ✅ `validateAnswer()` accepts optional `userAnswerLatex` parameter
- ✅ Constraint modes: `strict` → `bad_form`, `warn` → `unoptimal_form`, `off` → skip
- ✅ 32 integration tests

**Commit:** `87367ccf`

### 18.8 Remaining Work

Only **unit validation** remains to be implemented:

1. **units.ts creation** - Unit parser with HMS support (~200 lines)
2. **Integration** - Add `validateWithUnit()` to answer-validator.ts

### 18.9 Files Summary

| File                                         | Status      | Action                      | Lines    |
| -------------------------------------------- | ----------- | --------------------------- | -------- |
| `src/lib/questions/feedback.ts`              | ✅ Created  | French feedback messages    | ~30      |
| `src/lib/questions/units.ts`                 | ❌ TODO     | Unit parser + validator     | ~200 est |
| `src/lib/questions/constraint-validators.ts` | ✅ Created  | 5 constraint validators     | ~300     |
| `src/lib/questions/types.ts`                 | ✅ Extended | Status/constraint types     | +50      |
| `src/lib/utils/answer-validator.ts`          | ✅ Extended | applyConstraints integrated | +70      |
| `src/lib/types/question-display.ts`          | ✅ Extended | ValidationResult extended   | +10      |

**Test Coverage:** 133 tests (101 constraint-validators + 32 answer-validator integration)

**Remaining work:** ~200 lines for unit validation

---

## 19. Unit Validation - DÉJÀ IMPLÉMENTÉ ✅

### Découverte Majeure

Le système d'unités est **déjà entièrement implémenté** dans le codebase !

**Localisation:** `src/lib/questions/units/` (~150KB, 11 fichiers)
**Documentation:** `docs/claude/units.md` (862 lignes)
**Commit initial:** `78681c9403f7d75eb3681b3ff0eb6dcc4d535fb5`

### Structure du Système

| Fichier             | Taille | Rôle                                 |
| ------------------- | ------ | ------------------------------------ |
| `definitions.ts`    | 14KB   | Définitions des unités SI + préfixes |
| `operations.ts`     | 22KB   | Opérations sur unités                |
| `parser.ts`         | 22KB   | Parser LaTeX vers unités             |
| `hms.ts`            | 15KB   | Gestion temps HMS                    |
| `dimensional.ts`    | 16KB   | Analyse dimensionnelle               |
| `validator.ts`      | 13KB   | Logique de validation                |
| `ce-integration.ts` | 16KB   | Intégration ComputeEngine            |
| `types.ts`          | 16KB   | Types TypeScript                     |
| `tokenizer.ts`      | 11KB   | Tokenization LaTeX                   |
| `index.ts`          | 5KB    | API publique                         |

### Fonctionnalités Complètes

**Unités supportées:**

- Unités SI de base (m, kg, s, A, K, mol, cd)
- Préfixes SI (nano à giga)
- Unités dérivées (N, J, W, Pa, Hz, etc.)
- Unités composées (m/s, km/h, kg·m²/s²)
- Unités non-SI (min, h, L, t, ha)

**Opérations:**

- Parsing LaTeX depuis MathLive (`\mathrm{m}`, `\text{kg}`, etc.)
- Conversion entre unités compatibles
- Multiplication/division d'unités
- Simplification automatique
- Analyse dimensionnelle (vérifier cohérence)

**Format HMS (Heures:Minutes:Secondes):**

- Parsing depuis LaTeX (`2\text{h}30\text{min}15\text{s}`)
- Formatage vers LaTeX
- Arithmétique sur durées
- Conversion en secondes et vice-versa

**Messages d'erreur (en français):**

```typescript
'Unité manquante';
'Unité incompatible (attendu: {expected}, reçu: {actual})';
'Analyse dimensionnelle échouée';
'Format HMS invalide';
```

### Intégration avec ComputeEngine

Le système est intégré avec ComputeEngine via `ce-integration.ts`:

- Extraction d'unités depuis expressions CE
- Création d'expressions CE avec unités
- Validation de cohérence dimensionnelle
- Conversion automatique entre unités compatibles

### Travail Restant

**Très minime** - Intégration finale avec `answer-validator.ts`:

1. Appeler `validateUnitAnswer()` pour questions avec unités
2. Mapper `UnitValidationResult` vers `ValidationResult`
3. Ajouter tests d'intégration (~50 lignes)

**Impact:** Les 7 questions avec unités (HMS, €, km, m, dm, kg, L) sont **déjà supportées** par le système existant. Il suffit de brancher la validation dans le pipeline principal.

---

## 20. Typed ValidationRule Proposal (testAnswerss) ✅ TYPES IMPLEMENTED

> **Status (2025-11-27):** Types and evaluator **IMPLEMENTED** in `src/lib/questions/types.ts` and `validation-rule-evaluator.ts` (71 tests).
> **Remaining:** Wire up to QuestionVariation type + answer-validator + transformer. See Section 23.

### Problème Actuel

Les `testAnswerss` dans l'ancien système utilisent des expressions arbitraires sans typage:

```javascript
// 8 questions utilisent des patterns comme:
'&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0';
'&answer > 0 && &answer < 10';
'mod(&1; &answer)=0 && &answer!=1';
```

Cela pose des problèmes de:

- **Type-safety**: Pas de validation statique
- **Maintenabilité**: Expressions opaques
- **Migration**: Difficile à analyser automatiquement
- **UI**: Impossible de créer interface graphique

### Proposition: Discriminated Union

Créer des types explicites pour les patterns courants:

```typescript
type ValidationRule =
	| DivisorRule
	| MultipleRule
	| RangeRule
	| EquationRootRule
	| EquivalenceRule
	| PredicateRule
	| CustomExpressionRule;

interface DivisorRule {
	type: 'divisor';
	of: string; // Expression template: "{{a}}*{{b}}"
	exclude?: string[]; // Valeurs interdites: ["1", "{{a}}*{{b}}"]
}

interface MultipleRule {
	type: 'multiple';
	of: string; // Doit être multiple de...
}

interface RangeRule {
	type: 'range';
	min?: string; // Peut référencer variables: "{{min}}"
	max?: string;
	inclusive?: boolean;
}

interface EquationRootRule {
	type: 'equation_root';
	equation: string; // "x^2 - 5x + 6 = 0"
	// Vérifie que {{answer}} est racine
}

interface EquivalenceRule {
	type: 'equivalent';
	expression: string; // Doit être équivalent à...
	strictForm?: boolean; // Forme exacte ou équivalence mathématique
}

interface PredicateRule {
	type: 'predicate';
	check: 'prime' | 'even' | 'odd' | 'positive' | 'negative' | 'integer';
}

interface CustomExpressionRule {
	type: 'custom';
	expression: string; // Escape hatch pour cas complexes legacy
}
```

### Exemples de Migration

| Ancien Pattern                                          | Nouveau Type                                                                     | Type Rule          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| `&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0` | `{ type: 'divisor', of: '{{a}}*{{b}}', exclude: ['1', '{{a}}*{{b}}'] }`          | `DivisorRule`      |
| `mod(&1; &answer)=0 && &answer!=1`                      | `{ type: 'divisor', of: '{{a}}', exclude: ['1'] }`                               | `DivisorRule`      |
| `&answer > 0 && &answer < 10`                           | `{ type: 'range', min: '0', max: '10', inclusive: false }`                       | `RangeRule`        |
| `&answer=1/&1`                                          | `{ type: 'equivalent', expression: '1/{{a}}' }`                                  | `EquivalenceRule`  |
| `(&answer)^2-(&1+(&2))*(&answer)+(&1)*(&2)=0`           | `{ type: 'equation_root', equation: 'x^2 - ({{a}}+{{b}})*x + {{a}}*{{b}} = 0' }` | `EquationRootRule` |

### Patterns Identifiés (8 questions analysées)

| Pattern Type       | Occurrences | Implementation Effort |
| ------------------ | ----------- | --------------------- |
| Divisor validation | 4           | Medium (mod check)    |
| Exact equality     | 3           | Low (already works)   |
| Range check        | 1           | Low (simple compare)  |
| Equation root      | 1           | Medium (substitution) |
| Custom expression  | 0           | N/A (fallback)        |

### Bénéfices

1. **Type-safe**: TypeScript vérifie la structure
2. **UI-friendly**: Peut générer formulaires automatiquement
3. **Migration-friendly**: Patterns courants identifiables
4. **Backwards compatible**: `CustomExpressionRule` pour cas complexes
5. **Testable**: Chaque rule type peut avoir ses propres tests unitaires
6. **Documentable**: Types explicites servent de documentation

### Implémentation

```typescript
// src/lib/questions/validation-rules.ts
export function evaluateRule(
	rule: ValidationRule,
	userAnswer: string,
	variables: Record<string, string>
): boolean {
	switch (rule.type) {
		case 'divisor':
			return checkDivisor(userAnswer, rule.of, rule.exclude, variables);
		case 'range':
			return checkRange(userAnswer, rule.min, rule.max, rule.inclusive, variables);
		case 'equation_root':
			return checkEquationRoot(userAnswer, rule.equation, variables);
		// ... autres types
		case 'custom':
			return evaluateExpression(rule.expression, { answer: userAnswer, ...variables });
	}
}
```

---

## 21. Correction System Unification

### État Actuel: Deux Systèmes Parallèles

L'analyse de la base de données révèle une duplication:

| Aspect            | `correctionFormats` | `correctionDetailss`             |
| ----------------- | ------------------- | -------------------------------- |
| **Usage**         | 11 questions (3%)   | 328 questions (97%)              |
| **But**           | Feedback rapide     | Explication détaillée pas-à-pas  |
| **Per-variant**   | Non (global)        | Oui (par variation)              |
| **Conditionnels** | Non                 | Oui (`@@...??...@@`)             |
| **Placeholders**  | `&sol`, `&answer`   | `&sol`, `&answer`, `&expression` |
| **Complexité**    | Templates simples   | Markdown avec LaTeX              |

### Problème

- **Redondance**: Deux champs pour des cas d'usage qui se recoupent
- **Confusion**: Quelle donnée utiliser en priorité ?
- **Maintenance**: Deux systèmes à maintenir
- **Migration**: Deux logiques de conversion différentes

### Décision: Unifier en un Seul Champ

Fusionner les deux systèmes en un seul champ `correction` plus structuré:

```typescript
interface QuestionCorrection {
	// Feedback rapide (remplace correctionFormats)
	feedback?: {
		correct?: TemplateMarkdown; // Affiché si réponse correcte
		incorrect?: TemplateMarkdown; // Affiché si réponse incorrecte
		partial?: TemplateMarkdown; // Affiché si réponse partielle (unoptimal_form)
	};

	// Explication détaillée (remplace correctionDetailss)
	steps?: TemplateMarkdown[]; // Array de strings markdown (pas d'objets type: 'image')
}
```

### Note Importante: Pas de Champ `type`

Notre système markdown gère déjà nativement **texte ET images** via la syntaxe:

```markdown
Étape 1: Calculer ${{a}} + {{b}} = {{eval:{{a}}+{{b}}}}$

![Droite graduée]({{imageBase}}/graduee.webp){size=medium}

Conclusion: La réponse est ${{solution}}$.
```

**Donc pas besoin de** `{ type: 'image', url: '...' }` - le markdown suffit !

### Migration des Placeholders

Harmoniser la syntaxe entre anciens et nouveaux placeholders:

| Ancien Placeholder  | Nouveau Placeholder | Contexte                     |
| ------------------- | ------------------- | ---------------------------- |
| `&sol`              | `{{solution}}`      | Réponse attendue             |
| `&answer`           | `{{answer}}`        | Réponse de l'utilisateur     |
| `&expression`       | `{{expression}}`    | Expression mathématique      |
| `&solution[0]`      | `{{solution:0}}`    | Première solution (multi)    |
| `&solution[1]`      | `{{solution:1}}`    | Deuxième solution (multi)    |
| `@@cond ?? text @@` | `{{if:cond\|text}}` | Conditionnel (déjà supporté) |

### Exemples de Migration

**Cas 1: correctionFormats simple**

```javascript
// ANCIEN (correctionFormats)
{
	correctionFormats: ['La bonne réponse est &sol'];
}

// NOUVEAU
{
	correction: {
		feedback: {
			incorrect: 'La bonne réponse est {{solution}}';
		}
	}
}
```

**Cas 2: correctionDetailss avec étapes**

```javascript
// ANCIEN (correctionDetailss)
{
	correctionDetailss: [
		[
			'Étape 1: On calcule &1 + &2 = [_&1+&2_]',
			'Étape 2: On multiplie par 3: [_(&1+&2)*3_] = &sol',
			'Conclusion: La réponse est &sol'
		]
	];
}

// NOUVEAU
{
	correction: {
		steps: [
			'Étape 1: On calcule ${{a}} + {{b}} = {{eval:{{a}}+{{b}}}}$',
			'Étape 2: On multiplie par 3: ${{eval:({{a}}+{{b}})*3}} = {{solution}}$',
			'Conclusion: La réponse est ${{solution}}$'
		];
	}
}
```

**Cas 3: Avec conditions et feedback**

```javascript
// ANCIEN
{
  correctionFormats: ['Bravo, la réponse est &sol'],
  correctionDetailss: [
    [
      '@@&1 > 0 ?? On commence avec un nombre positif: &1 @@',
      'La réponse finale est &sol'
    ]
  ]
}

// NOUVEAU
{
  correction: {
    feedback: {
      correct: 'Bravo, la réponse est {{solution}}'
    },
    steps: [
      '{{if:{{a}}>0|On commence avec un nombre positif: {{a}}}}',
      'La réponse finale est {{solution}}'
    ]
  }
}
```

### Bénéfices de l'Unification

1. **Simplicité**: Un seul champ à comprendre
2. **Flexibilité**: Peut avoir feedback ET étapes
3. **Cohérence**: Même syntaxe de templates partout
4. **Type-safety**: Structure TypeScript claire
5. **Migration simple**: Conversion mécanique possible
6. **Pas de duplication**: Markdown gère texte + images nativement

### Migration Script

Le transformer peut détecter et convertir automatiquement:

```typescript
function migrateCorrectionSystem(oldQuestion: OldQuestion): QuestionCorrection | undefined {
	const correction: QuestionCorrection = {};

	// Migrer correctionFormats → feedback
	if (oldQuestion.correctionFormats?.length > 0) {
		correction.feedback = {
			incorrect: convertPlaceholders(oldQuestion.correctionFormats[0])
		};
	}

	// Migrer correctionDetailss → steps
	if (oldQuestion.correctionDetailss?.length > 0) {
		correction.steps = oldQuestion.correctionDetailss[0].map(convertPlaceholders);
	}

	return Object.keys(correction).length > 0 ? correction : undefined;
}

function convertPlaceholders(text: string): string {
	return text
		.replace(/&sol/g, '{{solution}}')
		.replace(/&answer/g, '{{answer}}')
		.replace(/&expression/g, '{{expression}}')
		.replace(/&(\d+)/g, '{{$1}}') // &1 → {{1}}
		.replace(/\[_(.*?)_\]/g, '{{eval:$1}}') // [_expr_] → {{eval:expr}}
		.replace(/@@(.*?)\?\?(.*?)@@/g, '{{if:$1|$2}}'); // @@cond??text@@ → {{if:cond|text}}
}
```

---

## 22. Image Migration - WebP Simple Strategy

### Contexte: Volume Modeste

Analyse de la base de données:

- **12 questions** avec images (1.9% du total)
- **157 images** au total
- Formats actuels: Principalement PNG
- Tailles variées: petites icônes à diagrammes moyens

### Décision: Pas de CDN, Utiliser Système Existant

**Pourquoi ?**

1. **Volume trop faible** pour justifier un CDN externe (Cloudinary, Imgix)
2. **Système existant fonctionnel** dans Supabase Storage
3. **Performance suffisante** pour 197 images (impact minimal)
4. **Simplicité** - pas de dépendance externe supplémentaire

### Format Choisi: WebP

**Avantages:**

- **Compression ~3x meilleure** que PNG (sans perte visible)
- **Support navigateur 97%+** (tous navigateurs modernes)
- **Qualité préservée** pour diagrammes et textes
- **Intégration native** dans notre système markdown

**Comparaison:**

| Format | Taille moyenne | Support | Qualité diagrammes |
| ------ | -------------- | ------- | ------------------ |
| PNG    | 100% (base)    | 100%    | Parfaite           |
| WebP   | ~30%           | 97%     | Parfaite           |
| AVIF   | ~20%           | 80%     | Parfaite           |
| JPEG   | ~50%           | 100%    | Mauvaise (texte)   |

**Verdict:** WebP = meilleur ratio qualité/compatibilité/compression

### Architecture de Migration

**Stockage:** Supabase Storage (bucket existant: `question-images`)

**Organisation:**

```
question-images/
├── CE1/
│   ├── addition-001.webp
│   └── soustraction-002.webp
├── CE2/
│   └── multiplication-003.webp
└── ...
```

**Syntaxe Markdown:** (déjà supportée)

```markdown
![Description]({{imageBase}}/CE1/addition-001.webp){size=medium}
```

Tailles disponibles: `small`, `medium`, `large`, `full`

### Script de Migration

```typescript
// scripts/migrate-question-images.ts
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { glob } from 'glob';
import path from 'path';

interface ImageMigrationResult {
	oldPath: string;
	newPath: string;
	oldSize: number;
	newSize: number;
	reduction: number; // Percentage
}

async function migrateQuestionImages(sourceDir: string): Promise<ImageMigrationResult[]> {
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	const results: ImageMigrationResult[] = [];

	// 1. Trouver toutes les images PNG
	const imagePaths = await glob(`${sourceDir}/**/*.png`);

	for (const imagePath of imagePaths) {
		const oldSize = (await fs.stat(imagePath)).size;

		// 2. Convertir en WebP
		const webpBuffer = await sharp(imagePath)
			.webp({
				quality: 85, // Bon équilibre qualité/taille
				effort: 6 // Compression optimale
			})
			.toBuffer();

		// 3. Générer nouveau chemin
		const relativePath = path.relative(sourceDir, imagePath);
		const newPath = relativePath.replace(/\.png$/, '.webp');

		// 4. Upload vers Supabase Storage
		const { error } = await supabase.storage.from('question-images').upload(newPath, webpBuffer, {
			contentType: 'image/webp',
			cacheControl: '31536000' // 1 an (images statiques)
		});

		if (error) throw error;

		// 5. Tracker résultats
		results.push({
			oldPath: imagePath,
			newPath,
			oldSize,
			newSize: webpBuffer.length,
			reduction: ((oldSize - webpBuffer.length) / oldSize) * 100
		});
	}

	return results;
}

// Utilisation:
const results = await migrateQuestionImages('extern/new-tinymath/apps/ubumaths/public/images');
console.log(`Migrated ${results.length} images`);
console.log(
	`Average reduction: ${results.reduce((sum, r) => sum + r.reduction, 0) / results.length}%`
);
```

### Mise à Jour des Questions

Les références d'images dans l'ancien système sont stockées dans `images[]`:

```javascript
// ANCIEN
{
  images: ['/images/CE1/addition-001.png']
}

// Migration automatique dans transformer:
function migrateImagePath(oldPath: string): string {
  return oldPath.replace(/\.png$/, '.webp').replace(/^\/images\//, '');
}

// NOUVEAU (injecté dans statement)
statement: `Observe le diagramme:\n\n![Diagramme]({{imageBase}}/CE1/addition-001.webp){size=medium}`
```

### Gestion des Tailles d'Images

Notre système markdown supporte déjà les attributs de taille via `image-renderer.ts`:

```markdown
{size=small} → max-width: 300px
{size=medium} → max-width: 600px (défaut)
{size=large} → max-width: 900px
{size=full} → max-width: 100%
```

### Performance

**Avant (PNG):**

- 157 images × ~50KB moyenne = ~7.85 MB total

**Après (WebP @ 85% quality):**

- 157 images × ~15KB moyenne = ~2.36 MB total
- **Économie: ~5.5 MB (70% réduction)**

**Impact utilisateur:**

- Chargement 3× plus rapide
- Moins de bande passante mobile
- Meilleure expérience sur connexions lentes

### Migration Status: ✅ COMPLETED (2025-11-27)

**Migration effectuée avec succès:**

1. ✅ **Audit images existantes** - 214 images identifiées (via `extract-question-image-refs.ts`)
2. ✅ **Download source images** - Téléchargées depuis ancien projet Supabase (`download-old-images.ts`)
3. ✅ **Convertir en WebP** - Script sharp avec quality 85, effort 6
4. ✅ **Upload Supabase** - Bucket `question-images` (retry logic + batch size 3)
5. ✅ **Generate URL mapping** - 856 mappings dans `scripts/image-url-mapping.json`
6. 🔄 **Update transformer** - TODO: Utiliser mapping pour convertir paths

**Résultats:**

- 214/214 images migrées (100%)
- Original: 11.17 MB → WebP: 7.51 MB
- Réduction: 3.65 MB (34.6% moyenne)

**Scripts créés:**

- `scripts/download-old-images.ts` - Download depuis ancien Supabase
- `scripts/migrate-question-images.ts` - Conversion WebP + upload
- `scripts/image-url-mapping.json` - Mapping ancien→nouveau paths

---

## 23. IMPLEMENTATION STATUS UPDATE (2025-11-27)

### Complete Implementation Review

After thorough code analysis, here's the **actual** implementation status:

#### ✅ FULLY IMPLEMENTED (100%)

| Component                 | Location                       | Tests     | Notes                                     |
| ------------------------- | ------------------------------ | --------- | ----------------------------------------- |
| **Syntax Conversion**     | `syntax-converter.ts`          | 35 tests  | All 633 questions convertible             |
| **Constraint Validators** | `constraint-validators.ts`     | 101 tests | spaces, products, brackets, zeros, form   |
| **Feedback Messages**     | `feedback.ts`                  | -         | French feedback for all constraint types  |
| **Unit Validation**       | `units/` (~150KB)              | Extensive | Full SI units, HMS, conversions           |
| **Typed ValidationRule**  | `validation-rule-evaluator.ts` | 71 tests  | Types + evaluator complete (see ⚠️ below) |
| **Image Migration**       | `migrate-question-images.ts`   | -         | 214/214 images migrated to WebP           |
| **Answer Validator**      | `answer-validator.ts`          | 32+ tests | Integrated with units + constraints       |

#### ⚠️ PARTIALLY IMPLEMENTED

| Component                      | Status                 | Remaining Work                                                                                                                    |
| ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Image URL Mapping**          | Mapping exists         | Transformer currently skips images - need to integrate `scripts/image-url-mapping.json` (856 mappings)                            |
| **Correction Transform**       | Tests exist            | `correction-integration.test.ts` - needs review                                                                                   |
| **ValidationRule Integration** | Types + evaluator done | Need: 1) Add `validationRules` field to `QuestionVariation`, 2) Integrate in `answer-validator.ts`, 3) Add transformer conversion |

#### ❌ NOT YET INTEGRATED

| Component                              | Description                                          | Estimated Effort                      |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Transformer Image Support**          | Use image-url-mapping.json in transformer            | ~50 lines                             |
| **testAnswerss → ValidationRule**      | Convert 8 questions' custom validation patterns      | ~100 lines (transformer + type field) |
| **ValidationRule in answer-validator** | Call `evaluateRule()` when `validationRules` present | ~30 lines                             |

### Test Summary

```
✅ validation-rule-evaluator.test.ts: 71 tests PASS
✅ constraint-validators.test.ts: 101 tests PASS
✅ syntax-converter.test.ts: 35 tests PASS
✅ answer-validator.test.ts: 32+ tests PASS
✅ Build: PASS
```

### Remaining Work Priority

#### HIGH PRIORITY (Blocks full migration)

1. **Image Path Integration** - Update transformer to use `image-url-mapping.json`
   - File: `src/lib/migration/question-transformer.ts`
   - Lines 830-833 currently skip images

#### MEDIUM PRIORITY

2. **testAnswerss to ValidationRule Migration** - 8 questions need conversion
   - Types fully defined in `src/lib/questions/types.ts` (lines 580-650)
   - Evaluator implemented in `validation-rule-evaluator.ts`
   - Just need to update transformer to convert patterns

#### LOW PRIORITY (Polish)

3. **Correction System Enhancement** - Full unification of correctionFormats/correctionDetailss
4. **HMS Time Edge Cases** - Already supported, may need additional testing

### File Summary

| File                                             | Lines       | Role                     | Status                     |
| ------------------------------------------------ | ----------- | ------------------------ | -------------------------- |
| `src/lib/questions/validation-rule-evaluator.ts` | 665         | Typed rule evaluation    | ✅ Complete                |
| `src/lib/questions/constraint-validators.ts`     | ~300        | 5 constraint validators  | ✅ Complete                |
| `src/lib/questions/feedback.ts`                  | ~30         | French feedback messages | ✅ Complete                |
| `src/lib/questions/units/`                       | ~150KB      | Unit validation system   | ✅ Complete                |
| `src/lib/utils/answer-validator.ts`              | ~500        | Main validation pipeline | ✅ Complete                |
| `src/lib/migration/question-transformer.ts`      | ~1000       | Migration transformer    | ⚠️ Needs image integration |
| `scripts/image-url-mapping.json`                 | 856 entries | Image path mapping       | ✅ Ready to use            |

### Next Steps

1. **Integrate image URL mapping** in transformer (~30 mins)
2. **Complete ValidationRule integration**:
   - Add `validationRules?: ValidationRule[]` field to `QuestionVariation` type
   - Add transformer logic to convert `testAnswerss` patterns to typed rules
   - Integrate `evaluateRule()` call in `answer-validator.ts`
3. **Run full migration test** on all 633 questions
4. **Update documentation** to reflect final state

### ValidationRule Integration Details

The evaluator (`validation-rule-evaluator.ts`) is **complete and tested** but not wired up:

```typescript
// 1. Add to QuestionVariation (types.ts line ~204)
export interface QuestionVariation {
	// ... existing fields ...
	validationRules?: ValidationRule[]; // ADD THIS
}

// 2. In answer-validator.ts, add check:
if (instance.validationRules?.length) {
	const ctx = createEvaluationContext(resolvedVariables, userAnswer);
	const result = evaluateRules(instance.validationRules, ctx);
	if (!result.valid) return { isCorrect: false, feedback: result.reason };
}

// 3. In transformer, convert patterns like:
// "&answer!=1 && mod(&1*&2; &answer)=0"
// → { type: 'divisor', dividend: '{{a}}*{{b}}' } + exclusions
```

---

## 24. VERIFIED IMPLEMENTATION STATUS (2025-11-27 Session)

### Deep Code Analysis Summary

This section documents a thorough code-level verification of what's actually implemented vs what's claimed in earlier sections.

### ✅ FULLY IMPLEMENTED & TESTED

| Component                    | File                             | Lines       | Tests     | Status                                  |
| ---------------------------- | -------------------------------- | ----------- | --------- | --------------------------------------- |
| **ValidationRule Types**     | `types.ts`                       | 580-685     | -         | 7 rule types defined                    |
| **ValidationRule Evaluator** | `validation-rule-evaluator.ts`   | ~400        | 71 tests  | All rule types implemented              |
| **Constraint Validators**    | `constraint-validators.ts`       | ~300        | 101 tests | spaces, products, brackets, zeros, form |
| **Syntax Converter**         | `syntax-converter.ts`            | ~500        | 35 tests  | 100% pattern coverage                   |
| **Unit Validation**          | `units/`                         | ~150KB      | Extensive | Full SI units, HMS, conversions         |
| **Image Migration**          | Script completed                 | -           | -         | 214/214 → 34.6% reduction               |
| **URL Mappings**             | `scripts/image-url-mapping.json` | 856 entries | -         | 4 key formats per image                 |

### ❌ NOT YET INTEGRATED (Verified Missing)

#### 1. QuestionVariation Type - Missing `validationRules` field

**Location:** `src/lib/questions/types.ts` lines 172-204

**Current State:**

```typescript
export interface QuestionVariation {
	statement: TemplateMarkdown;
	variables?: QuestionVariable[];
	answer: string | string[];
	correction?: TemplateMarkdown;
	blanks?: { position: number; expectedAnswer: string }[];
	choices?: { content: TemplateMarkdown; isCorrect: boolean }[];
	// ❌ MISSING: validationRules?: ValidationRule[];
}
```

**Action Required:** Add `validationRules?: ValidationRule[];` to `QuestionVariation` interface.

#### 2. Image URL Mapping - Transformer skips images

**Location:** `src/lib/migration/question-transformer.ts` lines 829-833

**Current State:**

```typescript
if (options?.skipImages) {
	// Currently skipping images entirely
}
```

**Action Required:**

- Load `scripts/image-url-mapping.json`
- Replace old paths with new WebP URLs
- Inject `![description]({{imageBase}}/path.webp){size=medium}` into statement

#### 3. ValidationRule in answer-validator - Not wired up

**Location:** `src/lib/utils/answer-validator.ts`

**Current State:** No import of `evaluateRule`, no call to validation-rule-evaluator

**Action Required:**

```typescript
import { evaluateRule, type EvaluationContext } from '$lib/questions/validation-rule-evaluator';

// In validateAnswer():
if (instance.validationRules?.length) {
	const ctx: EvaluationContext = {
		variables: resolvedVariables,
		answer: userAnswer.toString(),
		numericAnswer: Number(userAnswer)
	};
	for (const rule of instance.validationRules) {
		const result = evaluateRule(rule, ctx);
		if (!result.valid) return { isCorrect: false, feedback: result.reason };
	}
}
```

#### 4. testAnswerss → ValidationRule Conversion

**Location:** Transformer needs new conversion logic

**Current State:** `testAnswerss` patterns not being converted

**8 Question Patterns to Convert:**

```javascript
// Pattern 1: Divisor validation (4 questions)
"&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0"
→ { type: 'divisor', dividend: '{{a}}*{{b}}', excludeValues: ['1', '{{a}}*{{b}}'] }

// Pattern 2: Exact equality (3 questions)
"&answer=1/&1"
→ { type: 'equivalent', expression: '1/{{a}}' }

// Pattern 3: Equation root (1 question)
"(&answer)^2-(&1+(&2))*(&answer)+(&1)*(&2)=0"
→ { type: 'equation_root', equation: 'x^2-({{a}}+{{b}})*x+{{a}}*{{b}}=0' }
```

### Implementation Effort Estimate

| Task                                       | Files       | Lines          | Priority |
| ------------------------------------------ | ----------- | -------------- | -------- |
| Add `validationRules` to QuestionVariation | 1           | 3              | High     |
| Wire up evaluateRule in answer-validator   | 1           | ~30            | High     |
| Image URL mapping in transformer           | 1           | ~50            | Medium   |
| testAnswerss pattern conversion            | 1           | ~100           | Medium   |
| **Total**                                  | **3 files** | **~180 lines** |          |

### Quick Win Checklist

```bash
# 1. Add validationRules field to QuestionVariation (types.ts:204)
validationRules?: ValidationRule[];

# 2. Add validationRules field to QuestionInstance (types.ts:381)
validationRules?: ValidationRule[];

# 3. Import and wire up in answer-validator.ts
# See code snippet above

# 4. Test with:
pnpm test:unit -- validation-rule-evaluator
pnpm check
pnpm build
```

### Remaining Test Coverage

| Component                         | Tests | Status     |
| --------------------------------- | ----- | ---------- |
| validation-rule-evaluator.test.ts | 71    | ✅ Passing |
| constraint-validators.test.ts     | 101   | ✅ Passing |
| syntax-converter.test.ts          | 35    | ✅ Passing |
| answer-validator.test.ts          | 32+   | ✅ Passing |
| Build                             | -     | ✅ Passing |

---

## 25. Implementation Completed (2025-11-27)

> **Session Summary:** All remaining integration work from Section 24 has been completed.

### Completed Tasks

#### 1. ValidationRules Field Added to Types ✅

**File:** `src/lib/questions/types.ts`

```typescript
// Line 213 - QuestionVariation interface
validationRules?: ValidationRule[];

// Line 435 - QuestionInstance interface
validationRules?: ValidationRule[];
```

#### 2. evaluateRule Wired Up in answer-validator ✅

**File:** `src/lib/utils/answer-validator.ts`

- Added imports for `ValidationRule`, `evaluateRule`, `EvaluationContext`
- Added `evaluateValidationRules()` helper function (lines 26-52)
- Integrated at start of `validateAnswer()` function (lines 183-199)
- Fixed type error: `String(userAnswer[0])` for array access

#### 3. Image URL Mapping Integration ✅

**File:** `src/lib/migration/question-transformer.ts`

Added:

- `ImageUrlMapping` type (line 77)
- `lookupImageUrl()` function - tries multiple path formats
- `convertImageToMarkdown()` function
- Updated `convertStatement()` to accept images + mapping
- Updated `convertChoices()` to use image mapping
- Updated `createVariations()` to pass image mapping
- Updated `transformQuestion()` options to accept `imageUrlMapping`
- Updated `transformQuestionBatch()` options and summary stats
- Added `imagesConverted` and `imagesMissing` to `TransformStats`

#### 4. testAnswerss to ValidationRule Conversion ✅

**File:** `src/lib/migration/question-transformer.ts`

Added (lines 743-928):

- `convertTestAnswers()` - converts array of test answer expressions
- `parseTestAnswerExpression()` - parses individual expressions to ValidationRule
- `convertTestAnswerSyntax()` - converts old syntax to new format
- `convertVariableReference()` - converts `&1` → `{{var1}}`

**Pattern Recognition:**
| Old Pattern | Converted To |
|-------------|--------------|
| `&answer>0` | `PredicateRule { predicate: 'isPositive' }` |
| `&answer>=0` | `RangeRule { min: '0', max: 'Infinity' }` |
| `&answer<0` | `PredicateRule { predicate: 'isNegative' }` |
| `mod(&1;&answer)=0` | `DivisorRule { dividend: '{{var1}}' }` |
| Complex expressions | `CustomExpressionRule { expression: '...' }` |

### Files Modified

| File                                               | Changes                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/lib/questions/types.ts`                       | Added `validationRules` to QuestionVariation (line 213) and QuestionInstance (line 435) |
| `src/lib/utils/answer-validator.ts`                | Added imports, `evaluateValidationRules()`, integration in `validateAnswer()`           |
| `src/lib/migration/question-transformer.ts`        | Added image URL mapping support + testAnswerss conversion (~190 lines)                  |
| `src/lib/migration/correction-integration.test.ts` | Added `imagesConverted`, `imagesMissing` to mock stats                                  |

### Test Status

All tests passing:

- `validation-rule-evaluator.test.ts`: 71 tests ✅
- `constraint-validators.test.ts`: 101 tests ✅
- `answer-validator.test.ts`: 32+ tests ✅
- `correction-integration.test.ts`: all tests ✅
- Migration tests: all passing ✅
- TypeScript check: No errors in transformer/validator files ✅

### Usage Examples

**Using Image URL Mapping in Batch Transform:**

```typescript
import imageMapping from 'scripts/image-url-mapping.json';

const { results, summary } = transformQuestionBatch(oldQuestions, {
	imageUrlMapping: imageMapping as ImageUrlMapping
});

console.log(`Images converted: ${summary.imagesConverted}`);
console.log(`Images missing: ${summary.imagesMissing}`);
```

**How ValidationRules Work at Runtime:**

```typescript
// In answer-validator.ts validateAnswer():
if (instance.validationRules?.length > 0) {
	const ctx = {
		variables: buildVariablesFromResolved(instance.resolvedVariables),
		answer: userAnswerStr,
		numericAnswer: Number(userAnswerStr)
	};

	for (const rule of instance.validationRules) {
		const result = evaluateRule(rule, ctx);
		if (!result.valid) {
			return { isCorrect: false, feedback: result.reason };
		}
	}
	return { isCorrect: true };
}
```

### What Remains

1. **Full migration run** - Run transformer on all 633 questions with image mapping
2. **Database import** - Import transformed questions to Supabase
3. **UI integration** - Ensure question display handles new image URLs
4. **Manual review** - Review questions with custom validation rules

---

## Sources

- [Canonical Form Guide](https://mathlive.io/compute-engine/guides/canonical-form/)
- [Patterns and Rules](https://mathlive.io/compute-engine/guides/patterns-and-rules/)
- [Simplification Guide](https://mathlive.io/compute-engine/guides/simplify/)
- [Evaluation Guide](https://mathlive.io/compute-engine/guides/evaluate/)

---

## Related Documentation

- `/docs/wip/old-question-system-summary.md` - Old system executive summary
- `/docs/wip/old-question-system-analysis.md` - Complete old system reference (1092 lines)
- `/docs/wip/old-question-system-index.md` - Navigation index
