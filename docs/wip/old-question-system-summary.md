# OLD Question System - Executive Summary

**Complete Analysis Available**: `/docs/wip/old-question-system-analysis.md` (1092 lines)

---

## Key Statistics

| Category                | Count | Details                                                                              |
| ----------------------- | ----- | ------------------------------------------------------------------------------------ |
| **Validation Statuses** | 6     | EMPTY, CORRECT, INCORRECT, UNOPTIMAL_FORM, BAD_FORM, BAD_UNIT                        |
| **Constraint Checks**   | 10    | Spaces, products, brackets, zeros, signs, factors(1,0), null terms, fractions, units |
| **Option Flags**        | 38    | Grouped in require/no-penalty pairs                                                  |
| **Feedback Messages**   | 26    | Unique messages, with single/multiple answer variants                                |
| **Question Types**      | 5     | Choice, Choices, Fill-in, Result/Rewrite, Answer Field                               |
| **TinyCAS Methods**     | 80+   | Classification, transformation, evaluation methods                                   |

---

## Validation Workflow (6 Stages)

```
1. EMPTY CHECK         → STATUS_EMPTY / CORRECT
2. SYNTAX CHECK        → STATUS_INCORRECT if parse fails
3. EQUIVALENCE CHECK   → Compare with solution using .equals()
4. CONSTRAINT CHECK    → 10 format constraints (spaces, brackets, etc.)
5. ORDERING CHECK      → Terms/factors order (if required)
6. CONSOLIDATION       → Final status based on all checks
```

---

## All 10 Constraint Checks

1. **Spaces** (checkSpaces)
   - Input: LaTeX version of answer
   - Checks: Multi-digit number spacing rules
   - Example: `1234` vs `1 234` vs `1,234`

2. **Products** (checkProducts)
   - Checks: Implicit vs explicit multiplication
   - Example: `2*x` vs `2x`

3. **Brackets** (checkBrackets)
   - Checks: Unnecessary parentheses
   - Special: Allow brackets around first negative term
   - Example: `(5+3)+2` vs `5+3+2`

4. **Zeros** (checkZeros)
   - Checks: Leading and trailing zeros
   - Example: `01` vs `1`, `1.0` vs `1`

5. **Signs** (checkSigns)
   - Checks: Double sign simplification
   - Example: `--5` vs `5`, `+-3` simplification

6. **Factors One** (checkFactorsOne)
   - Checks: 1 _ expression or expression _ 1
   - Example: `1*5*x` vs `5*x`

7. **Factors Zero** (checkFactorsZero)
   - Checks: 0 \* expression simplification
   - Example: `0*5*x` vs `0`

8. **Null Terms** (checkNullTerms)
   - Checks: +0 or -0 in sums
   - Example: `5 + 0 + x` vs `5 + x`

9. **Fractions** (checkFractions)
   - Checks: Fraction reduction
   - Example: `4/8` vs `1/2`

10. **Units** (checkUnits)
    - Checks: Correct unit specification
    - Special: HMS (time) format
    - Example: `5 m` vs `5 cm`

---

## All 38 Option Flags (Organized by Type)

### Paired Options (require/no-penalty)

| Constraint | Require                           | No Penalty                             | Default    |
| ---------- | --------------------------------- | -------------------------------------- | ---------- |
| Spaces     | `require-correct-spaces`          | `no-penalty-for-incorrect-spaces`      | Permissive |
| Products   | `require-implicit-products`       | `no-penalty-for-explicit-products`     | Permissive |
| Brackets   | `require-no-extraneaous-brackets` | `no-penalty-for-extraneous-brackets`   | Permissive |
| Zeros      | `require-no-extraneaous-zeros`    | `no-penalty-for-extraneous-zeros`      | Permissive |
| Signs      | `require-no-extraneaous-signs`    | `no-penalty-for-extraneous-signs`      | Permissive |
| Factors 1  | `require-no-factor-one`           | `no-penalty-for-factor-one`            | Permissive |
| Factors 0  | `require-no-factor-zero`          | `no-penalty-for-factor-zero`           | Permissive |
| Null Terms | `require-no-null-terms`           | `no-penalty-for-null-terms`            | Permissive |
| Fractions  | `require-reduced-fractions`       | `no-penalty-for-non-reduced-fractions` | Permissive |
| Units      | `require-specific-unit`           | `no-penalty-for-not-respected-unit`    | Permissive |

### Ordering Options (disallow/penalty)

| Constraint          | Disallow                                 | Penalty                                     |
| ------------------- | ---------------------------------------- | ------------------------------------------- |
| Terms Permutation   | `disallow-terms-permutation`             | `penalty-for-terms-permutation`             |
| Factors Permutation | `disallow-factors-permutation`           | `penalty-for-factors-permutation`           |
| Terms+Factors       | `disallow-terms-and-factors-permutation` | `penalty-for-terms-and-factors-permutation` |

### Other Options

- `shuffle-terms`, `shuffle-factors`, `shuffle-terms-and-factors`
- `shallow-shuffle-terms`, `shallow-shuffle-factors`
- `no-shuffle-choices`, `exp-remove-unecessary-brackets`
- `allow-same-expression`, `allow-same-enounce`
- `remove-null-terms`, `exhaust`
- `solutions-order-not-important`
- `one-single-form-solution`
- `enounce-no-spaces`, `exp-no-spaces`
- `exp-allow-unecessary-zeros`
- `no-penalty-for-extraneous-brackets-in-first-negative-term`

---

## Status Hierarchy & Meaning

```
STATUS_EMPTY
  ↓ (answer provided)
STATUS_INCORRECT
  ↓ (answer mathematically valid & equals solution)
STATUS_UNOPTIMAL_FORM
  ↓ (answer fully simplified, form checked)
STATUS_CORRECT
  ↓ (answer has form issues)
STATUS_BAD_FORM
  ↓ (unit incorrect)
STATUS_BAD_UNIT
```

**Assignment Logic**:

- `require-*`: Violation → `STATUS_BAD_FORM`
- `penalty-for-*`: Violation → `STATUS_UNOPTIMAL_FORM`
- Default (neither set): No penalty (permissive)

---

## Test Answers Processing

**Purpose**: Custom validation when solution cannot be expressed explicitly

**Pattern**:

```
&answer!=1 && &answer!=15 && mod(15; &answer)=0
```

**Features**:

- Replace `&answer` with actual user answer
- Replace `&1`, `&2`, etc. with generated variables
- Split by `&&` for multiple tests (all must pass)
- Evaluate each as math expression
- Status = INCORRECT if ANY test fails

**Example** (find divisors of 15):

```typescript
testAnswers: ['&answer!=1 && &answer!=15 && mod(15; &answer)=0'];
```

---

## Cleanup Chain (Order Matters!)

Critical simplification sequence used throughout:

```typescript
1. removeZerosAndSpaces()    // 01 → 1, 1.0 → 1
2. reduceFractions()         // 4/8 → 1/2
3. simplifyNullProducts()    // 0*x → 0
4. removeNullTerms()         // x+0 → x
5. removeFactorsOne()        // 1*x → x
6. removeSigns()             // --x → x
7. removeUnecessaryBrackets()// (x) → x
8. removeMultOperator()      // 2*x → 2x
9. sortTermsAndFactors()     // Normalize order
```

**Critical**: Use exact order, chain methods, don't skip steps.

---

## TinyCAS Math Object - Essential Methods

### Validation

- `.isCorrect()`, `.isIncorrect()`
- `.isNumber()`, `.isSymbol()`, `.isTime()`
- `.isSum()`, `.isProduct()`, `.isQuotient()`, `.isPower()`, etc.

### Comparison

- `.equals(other)` - Normalized comparison (accounts for reordering, simplification)
- `.strictlyEquals(other)` - String-exact comparison
- `.isZero()`, `.isOne()`, `.isInt()`, etc.

### Transformation (all return new node, don't modify)

- `.removeZerosAndSpaces()`
- `.reduceFractions()`
- `.removeNullTerms()`
- `.removeFactorsOne()`
- `.removeSigns()`
- `.removeUnecessaryBrackets(allowFirstNegativeTerm?)`
- `.removeMultOperator()`
- `.sortTerms()`, `.sortFactors()`, `.sortTermsAndFactors()`
- `.shuffleTerms()`, `.shuffleFactors()`

### Evaluation

- `.eval(params?)` - Numeric evaluation
- `.substitute(values)` - Symbol replacement
- `.matchTemplate(template)` - Format matching

### Output

- `.string`, `.latex`, `.texmacs`
- `.toString(params?)`, `.toLatex(params?)`, `.toTexmacs(params?)`

### Units

- `.unit` - Unit object
- `.isLength()`, `.isMass()`, `.isVolume()`, `.isDuration()`

---

## Question Types & Identification

| Type               | Identified By                  | Key Property           | Validation                           |
| ------------------ | ------------------------------ | ---------------------- | ------------------------------------ |
| **Choice**         | `choicess` && !multipleAnswers | `solutions: number[]`  | Index matching                       |
| **Choices**        | `choicess` && multipleAnswers  | `solutions: number[]`  | All selected correctly               |
| **Fill-in**        | `expression.includes('?')`     | `expression: string`   | Global validation after substitution |
| **Result/Rewrite** | `answerFormat` exists          | `answerFormat: string` | Like fill-in but uses answerFormat   |
| **Answer Field**   | `answerField` exists           | `answerField: string`  | Like fill-in but replaces `...`      |

---

## Feedback Messages (26 Total)

### Empty Answers

- `EMPTY_ANSWER`: "Tu n'as rien répondu."
- `EMPTY_MULTIPLE_ANSWERS`: "Tu n'as pas tout complété."

### Format Issues

- `SPACES`: "Les chiffres sont mal espacés."
- `PRODUCTS`: "Tu peux simplifier certains symboles de multiplication."
- `BRACKETS`: "Il y a des parenthèses inutiles."
- `ZEROS`: "Il y a un ou des zéros inutiles."
- `SIGNS`: "Tu peux faire des simplifications de signes."
- `FACTORE_ONE`: "Tu peux simplifier le ou les facteurs 1."
- `FACTORE_ZERO`: "Tu peux simplifier un ou des facteurs nuls."
- `NULL_TERMS`: "Il y a un ou des termes nuls que tu peux enlever."
- `FRACTIONS`: "Il y a une ou des fractions non simplifiées."
- `BAD_UNIT`: "Ta réponse n'est pas écrite avec l'unité demandée."

### Ordering Issues

- `TERMS_PERMUTATION`: "Les termes doivent être écrits dans un certain ordre."
- `FACTORS_PERMUTATION`: "Les facteurs doivent être écrits dans un certain ordre."
- `TERMS_FACTORS_PERMUTATION`: "Les termes et facteurs doivent être écrits dans un certain ordre."

### Math Correctness

- `MATH_INCORRECT`: "Ta réponse n'est pas écrite correctement."
- `MATH_GLOBALLY_INCORRECT`: "L'expression obtenue n'est pas mathématiquement correcte."
- `BAD_FORM`: "Ta réponse n'est pas écrite sous la forme demandée."
- `INCOMPLETE_CHOICES`: "Tu n'as pas choisi toutes les bonnes réponses."

**Each message has a single-answer and multiple-answer variant**

---

## Special Cases

### 1. Fill-in-the-Blanks

- Answers substitute into `expression` at `?` locations
- Global expression validity checked
- Individual answer validation + whole expression validation

### 2. Solutions Order Independence

- Option: `solutions-order-not-important`
- Finds first matching solution for each answer (allows reordering)
- Used for multi-answer questions where order doesn't matter

### 3. Time (HMS) Unit

- Special unit type for time values
- Validation: `expression.isTime()`
- Different evaluation rules

### 4. Multiple Choice Partial Credit

- If 50%+ correct choices selected (no wrong ones)
- Status: `STATUS_UNOPTIMAL_FORM` (partial points)

### 5. Format Templates

- Optional `formats` array
- Answer matched with `expression.matchTemplate(format)`
- For defining allowed answer formats

### 6. First Negative Term Brackets

- Option: `no-penalty-for-extraneous-brackets-in-first-negative-term`
- Allows: `-(5+3)` as acceptable form
- Used in checkBrackets

---

## Correction Output

### Simple Correction (`createCorrection`)

- Array of `Line` objects (text, latex, html, texmacs, choices)
- Uses `correctionFormat` templates if available
- Otherwise generates based on question type
- Includes user's answer comment
- Color-coded by status (green/orange/red)

### Detailed Correction (`createDetailedCorrection`)

- Step-by-step explanation
- From `correctionDetails` array (prepared during generation)
- Can include images or text
- Supports same placeholder system

### Placeholders

- `&expression`, `&exp` → Expression
- `&expression2`, `&exp2` → Second expression
- `&solution1`, `&sol1`, `&solution` → Solutions
- `&answer1`, `&ans` → User's answers

---

## Data Flow Summary

```
GeneratedQuestion (question parameters)
    ↓
AnsweredQuestion (add user answers)
    ↓
assessItem() [VALIDATION CORE]
    ├─ Stage 1: Check if empty
    ├─ Stage 2: Check syntax
    ├─ Stage 3: Compare with solution
    ├─ Stage 4: Verify form constraints
    ├─ Stage 5: Verify term/factor order
    └─ Stage 6: Consolidate status
    ↓
CorrectedQuestion
    ├─ status & statuss (validation results)
    ├─ coms (feedback messages)
    ├─ unoptimals (what needs improvement)
    └─ [prepared for display]
    ↓
createCorrection() & createDetailedCorrection()
    ↓
simpleCorrection[] & detailedCorrection[] (Display ready)
```

---

## Migration Priorities

### HIGH PRIORITY (Core Validation)

1. All 6 status constants
2. All 10 constraint checks
3. testAnswers processing
4. Status consolidation logic
5. All 26 feedback messages

### MEDIUM PRIORITY (Math Processing)

6. TinyCAS method replacements (cleanup chain is critical)
7. Equivalence checking (.equals, .strictlyEquals)
8. Type detection methods
9. All 38 option flags

### LOWER PRIORITY (Output & Edge Cases)

10. Correction generation
11. Question type handling
12. Special cases (fill-in, time, etc.)

---

## Critical Implementation Notes

1. **Cleanup Chain Order**: Cannot be changed, all steps required, exact sequence
2. **Immutability**: TinyCAS methods return new nodes, don't modify in place
3. **Option Pairs**: Exactly one of (require-_, no-penalty-_, none) must be true
4. **Status Hierarchy**: Used in consolidation to determine final status
5. **Test Expression**: Must support full math syntax with proper substitution
6. **Unit Handling**: Special cases for HMS (time format)
7. **Message Variants**: Every message has single/multiple answer versions

---

**Full Details**: See `/docs/wip/old-question-system-analysis.md`
