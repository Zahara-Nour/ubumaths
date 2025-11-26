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
- ✅ **Partial Credit** - `unoptimal_form` status for 'check' mode constraints

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

### Recommendation: Convert to Range/Condition Type

Instead of arbitrary expressions, create explicit types:

```typescript
// NEW: Explicit range validation
type RangeValidation = {
	type: 'range';
	min?: number;
	max?: number;
	inclusive?: boolean;
};

// NEW: Predicate validation
type PredicateValidation = {
	type: 'predicate';
	predicate: 'even' | 'odd' | 'prime' | 'multiple_of' | 'divisible_by';
	param?: number;
};

// NEW: Expression validation (for rare cases)
type ExpressionValidation = {
	type: 'expression';
	condition: string; // "{{answer}} > {{min}} && {{answer}} < {{max}}"
};
```

**Why?**

1. **Type-safe**: Predefined predicates are safer than arbitrary expressions
2. **Easier to migrate**: Most testAnswers are simple ranges
3. **Backwards compatible**: Expression type handles complex cases
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
- ✅ `ConstraintMode` type: `'require' | 'no-penalty' | 'check'`
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
- ✅ Constraint modes: `require` → `bad_form`, `check` → `unoptimal_form`, `no-penalty` → skip
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
