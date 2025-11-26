# OLD Question System Analysis - Complete Documentation Index

**Analysis Date**: 2025-11-26  
**Status**: COMPLETE  
**Source Files Analyzed**:

- `extern/new-tinymath/apps/ubumaths/src/lib/questions/correction.ts` (867 lines)
- `extern/new-tinymath/apps/ubumaths/src/lib/questions/correctionItem.ts` (482 lines)
- `extern/new-tinymath/apps/ubumaths/src/types/type.ts` (567 lines)
- `extern/new-tinymath/packages/tinycas/src/math/node.ts` (1000+ lines)

---

## Documentation Files

### 1. EXECUTIVE SUMMARY (START HERE)

**File**: `/docs/wip/old-question-system-summary.md` (388 lines)

**Contents**:

- Key statistics (6 statuses, 10 constraints, 38 flags, 26 messages)
- Validation workflow overview (6 stages)
- Quick reference tables for all constraints
- All 38 option flags organized by category
- Status hierarchy and meaning
- Test answers processing
- Cleanup chain
- TinyCAS essential methods
- Question types identification
- Migration priorities
- Critical implementation notes

**Best For**: Getting oriented, finding quick facts, understanding priorities

---

### 2. COMPLETE DETAILED ANALYSIS (REFERENCE)

**File**: `/docs/wip/old-question-system-analysis.md` (1092 lines)

**Contents**:

#### Part 1: Validation & Correction Workflow

- 6-stage validation workflow with flowchart
- Step-by-step explanation of each stage

#### Part 2: All Validation Functions

- `checkSpaces()` - Multi-digit number spacing rules
- `checkProducts()` - Implicit vs explicit multiplication
- `checkBrackets()` - Unnecessary parentheses detection
- `checkZeros()` - Leading/trailing zero detection
- `checkSigns()` - Double sign simplification
- `checkFactorsOne()` - Factor of 1 removal
- `checkFactorsZero()` - Null product simplification
- `checkNullTerms()` - +0/-0 removal
- `checkFractions()` - Fraction reduction verification
- `checkUnits()` - Unit specification validation
- `checkTermsAndFactors()` - Ordering verification (3 modes)
- `checkForm()` - Format verification (3 strategies)

#### Part 3: Constraint Options & Flags

- All 38 option flags with descriptions
- Option logic and behavior
- Require vs no-penalty vs none behavior

#### Part 4: Test Answers Processing

- Purpose and use cases
- Processing logic with pseudocode
- Placeholder system
- Operator support

#### Part 5: TinyCAS Math Object Methods

- 80+ methods categorized:
  - Classification methods (30+)
  - Transformation methods (25+)
  - Evaluation methods
  - Output formatting
  - Property access

#### Part 6: Special Cases & Edge Handling

- Fill-in-the-blanks validation
- Result/rewrite questions
- Multiple choice (single & multiple)
- Answer field questions
- Solutions order independence
- Time (HMS) unit handling

#### Part 7: Feedback Messages

- All 26 unique messages
- Message variants (single vs multiple answers)
- Message selection logic
- Color coding

#### Part 8: Correction Output Generation

- Simple correction generation
- Detailed correction generation
- Format templates
- Placeholder system

#### Part 9: Data Structures

- GeneratedQuestion type
- AnsweredQuestion type
- CorrectedQuestion type
- Supporting types (Option, CorrectionStatus, etc.)

#### Part 10: Summary - Features to Migrate

- Core features (must implement)
- Math processing features
- All 38 option flags
- Edge cases (must handle)
- Migration checklist
- Key insights for new system

**Best For**: Deep understanding, implementation reference, technical details

---

## How to Use These Documents

### For Quick Orientation

1. Read `/docs/wip/old-question-system-summary.md` first
2. Focus on "Key Statistics", "Validation Workflow", "All 10 Constraint Checks"
3. Review "Migration Priorities"

### For Implementation

1. Start with summary for overview
2. Use detailed analysis as reference for each feature
3. Cross-reference with actual code in `correction.ts`
4. Use "Data Structures" section for type definitions
5. Check "Critical Implementation Notes" frequently

### For Code Review

1. Reference "Validation Workflow" for flow logic
2. Check each constraint in "All Validation Functions"
3. Verify all 38 flags in "Constraint Options & Flags"
4. Validate feedback messages in "Feedback Messages"
5. Ensure special cases are handled in "Special Cases & Edge Handling"

### For Testing

1. Reference "All 10 Constraint Checks" for test cases
2. Review "Test Answers Processing" for custom validation
3. Check "Question Types & Identification" for type-specific tests
4. Use "Status Hierarchy" to verify status assignments
5. Reference special cases for edge case tests

---

## Key Findings

### Critical Path Items

1. **Status System** - 6 statuses, strict hierarchy (EMPTY → INCORRECT → UNOPTIMAL → CORRECT → BAD_FORM → BAD_UNIT)
2. **Constraint Checks** - 10 independent checks, each produces array of indices
3. **Option Flags** - 38 flags in require/no-penalty pairs, control severity of violations
4. **Cleanup Chain** - Exact 9-step sequence that CANNOT be modified or reordered
5. **TinyCAS Methods** - 80+ methods, immutable pattern, chainable

### High-Complexity Areas

1. **Test Answers** - Custom validation with full math expression evaluation
2. **Terms & Factors Ordering** - 3 different modes with different sorting strategies
3. **Form Verification** - 3 different strategies (templates, single-form, normal)
4. **Fill-in-the-Blanks** - Global validation after substitution
5. **Status Consolidation** - Complex logic aggregating all checks

### Most Frequently Used Operations

1. `expression.equals(other)` - Equivalence checking (normalized)
2. `expression.strictlyEquals(other)` - String comparison
3. Cleanup chain operations - Used in 5+ places
4. Type checking methods - `.isSum()`, `.isProduct()`, etc.
5. Sorting methods - `.sortTerms()`, `.sortFactors()`

---

## Migration Checklist

### Phase 1: Status System & Messages (Critical)

- [ ] Implement 6 status constants
- [ ] Implement 26 feedback messages (with variants)
- [ ] Implement status hierarchy logic
- [ ] Test status assignment logic

### Phase 2: Constraint Checks (Critical)

- [ ] Implement `checkSpaces()`
- [ ] Implement `checkProducts()`
- [ ] Implement `checkBrackets()`
- [ ] Implement `checkZeros()`
- [ ] Implement `checkSigns()`
- [ ] Implement `checkFactorsOne()`
- [ ] Implement `checkFactorsZero()`
- [ ] Implement `checkNullTerms()`
- [ ] Implement `checkFractions()`
- [ ] Implement `checkUnits()`
- [ ] Test each constraint independently
- [ ] Test constraint interaction

### Phase 3: Form Verification (Critical)

- [ ] Implement `checkTermsAndFactors()` (3 modes)
- [ ] Implement `checkForm()` (3 strategies)
- [ ] Implement cleanup chain (exact 9-step sequence)
- [ ] Test form verification logic

### Phase 4: Option Flags (High Priority)

- [ ] Implement all 38 option flags
- [ ] Test require-\* behavior
- [ ] Test no-penalty-\* behavior
- [ ] Test default (no flag) behavior
- [ ] Test mutual exclusivity

### Phase 5: Test Answers (High Priority)

- [ ] Implement testAnswers processing
- [ ] Support &answer placeholder
- [ ] Support &1, &2, etc. placeholders
- [ ] Support && operator (AND)
- [ ] Support all math operations
- [ ] Test substitution and evaluation

### Phase 6: Validation Workflow (High Priority)

- [ ] Implement 6-stage validation
- [ ] Implement status consolidation
- [ ] Test with all question types
- [ ] Test edge cases

### Phase 7: Question Type Handling (Medium Priority)

- [ ] Implement Choice question validation
- [ ] Implement Choices (multiple) validation
- [ ] Implement Fill-in validation (with global check)
- [ ] Implement Result/Rewrite validation
- [ ] Implement Answer Field validation
- [ ] Test type detection

### Phase 8: Correction Output (Medium Priority)

- [ ] Implement simple correction generation
- [ ] Implement detailed correction generation
- [ ] Implement format template system
- [ ] Implement placeholder system

### Phase 9: TinyCAS Replacement (Medium Priority)

- [ ] Implement/replace all classification methods
- [ ] Implement/replace all transformation methods
- [ ] Implement/replace evaluation methods
- [ ] Implement unit system
- [ ] Test cleanup chain equivalence

### Phase 10: Edge Cases (Lower Priority)

- [ ] Handle solutions order independence
- [ ] Handle time (HMS) units
- [ ] Handle multiple choice partial credit
- [ ] Handle first negative term brackets
- [ ] Handle format templates
- [ ] Test all special cases

---

## Code Locations (Reference)

### Source Files Analyzed

```
/Users/david/Coding/js/ubumaths/
├── extern/new-tinymath/apps/ubumaths/src/
│   ├── lib/questions/
│   │   ├── correction.ts (867 lines) - MAIN VALIDATION LOGIC
│   │   ├── correctionItem.ts (482 lines) - CORRECTION OUTPUT
│   │   └── generateQuestion.ts - Question generation
│   ├── types/
│   │   └── type.ts (567 lines) - TYPE DEFINITIONS
│   └── lib/
│       └── questions/
│           └── questions.ts - Question definitions with testAnswers examples
├── extern/new-tinymath/packages/tinycas/src/
│   └── math/
│       ├── node.ts (1000+) - TinyCAS methods
│       └── parser.ts - Expression parsing
└── docs/wip/
    ├── old-question-system-index.md (THIS FILE)
    ├── old-question-system-summary.md (388 lines)
    └── old-question-system-analysis.md (1092 lines)
```

### Key Function in correction.ts

- `assessItem(item: AnsweredQuestion)` - Main entry point (line 626)
  - Calls `prepareCorrectedQuestion()` to initialize
  - Calls constraint checks via `checkConstraints()`
  - Calls `checkTermsAndFactors()`
  - Calls `checkForm()`
  - Returns CorrectedQuestion

### Key Functions in correctionItem.ts

- `createCorrection(item)` - Simple correction (line 36)
- `createDetailedCorrection(item)` - Step-by-step correction (line 269)

---

## Critical Implementation Notes

### 1. Cleanup Chain (DO NOT MODIFY)

```
EXACT SEQUENCE (9 steps):
1. removeZerosAndSpaces()
2. reduceFractions()
3. simplifyNullProducts()
4. removeNullTerms()
5. removeFactorsOne()
6. removeSigns()
7. removeUnecessaryBrackets()
8. removeMultOperator()
9. sortTermsAndFactors()
```

### 2. Status Assignment Logic

```
require-*:     violation → STATUS_BAD_FORM
penalty-for-*: violation → STATUS_UNOPTIMAL_FORM
(neither):     no penalty (permissive)
```

### 3. Option Pairs (Mutual Exclusivity)

- Only ONE can be set per constraint
- If neither: default permissive behavior
- If `require-*`: strict enforcement
- If `penalty-for-*`: warning-level enforcement

### 4. TestAnswers Pattern

```
Replace &answer → actual answer
Replace &1, &2 → generated variables
Split by && → multiple tests
ALL must pass for STATUS_CORRECT
ANY fails → STATUS_INCORRECT
```

### 5. Message Variants

- Every message has 2 versions
- Check `item.answers.length === 1` to pick variant
- Accumulate messages in `item.coms[]`

### 6. Fill-in Special Case

```
Replace ? with answer values
Validate ENTIRE resulting expression
Also validate individual answers
Both must be correct for STATUS_CORRECT
```

### 7. Type Detection

```
isQuestionChoice()     → choicess && !multipleAnswers
isQuestionChoices()    → choicess && multipleAnswers
isQuestionFillIn()     → expression.includes('?')
isQuestionResultOrRewrite() → answerFormat exists
isQuestionAnswerField() → answerField exists
```

---

## Quick Reference Tables

### Status Constants

| Status         | Meaning                 | Color  |
| -------------- | ----------------------- | ------ |
| EMPTY          | No answer               | Gray   |
| INCORRECT      | Wrong answer            | Red    |
| UNOPTIMAL_FORM | Correct but not optimal | Orange |
| CORRECT        | Perfect answer          | Green  |
| BAD_FORM       | Wrong format            | Red    |
| BAD_UNIT       | Wrong unit              | Red    |

### Constraint Types

| Check      | Function           | Returns                  |
| ---------- | ------------------ | ------------------------ |
| Spaces     | checkSpaces()      | number[] (indices)       |
| Products   | checkProducts()    | number[] (indices)       |
| Brackets   | checkBrackets()    | number[] (indices or -1) |
| Zeros      | checkZeros()       | number[] (indices)       |
| Signs      | checkSigns()       | number[] (indices)       |
| Factors 1  | checkFactorsOne()  | number[] (indices)       |
| Factors 0  | checkFactorsZero() | number[] (indices)       |
| Null Terms | checkNullTerms()   | number[] (indices)       |
| Fractions  | checkFractions()   | number[] (indices)       |
| Units      | checkUnits()       | number[] (indices)       |

---

## Next Steps

1. **Review**: Start with `/docs/wip/old-question-system-summary.md`
2. **Deep Dive**: Use `/docs/wip/old-question-system-analysis.md` for details
3. **Implementation**: Follow migration checklist phase by phase
4. **Testing**: Create test cases for each constraint
5. **Validation**: Verify against actual questions in the database

---

**Analysis Complete**: 2025-11-26  
**Total Documentation**: 1,480 lines (summary + analysis + index)  
**Files Produced**: 3 documents in `/docs/wip/`
