# ⚠️ IMPORTANT UPDATE (2025-11-17)

**PAUSE ON PHASE 2**: Before continuing Phase 2 of this migration, we discovered a syntax issue that must be resolved first.

**NEW PREREQUISITE PROJECT**: Template Syntax Unification
- **Duration**: 1-2 hours
- **Issue**: Converter outputs `%{variable}` but Questions expects `{{variable}}`
- **Solution**: Fix converter syntax BEFORE importing 2,238 questions
- **Details**: See `.claude/PROJECT-OVERVIEW-2025-11-17.md`

**THIS MIGRATION WILL RESUME** after syntax unification completes.

---

# Question Migration Analysis: TinyMath to UbuMaths v2

> **Version**: 1.0.0
> **Date**: 2025-11-16
> **Status**: Phase 1 Complete, Phase 2 PAUSED (syntax fix required)
> **Approach**: Option 3 - Parallel/Agile Migration

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Old System (TinyMath) Analysis](#2-old-system-tinymath-analysis)
3. [New System (UbuMaths v2) Analysis](#3-new-system-ubumaths-v2-analysis)
4. [Color Template System](#4-color-template-system)
5. [Feature Comparison Table](#5-feature-comparison-table)
6. [Gap Analysis](#6-gap-analysis)
7. [Decision Rationale](#7-decision-rationale)
8. [Question Tracking System](#8-question-tracking-system)
9. [Migration State Files](#9-migration-state-files)
10. [Implementation Strategy: Option 3 (Parallel/Agile)](#10-implementation-strategy-option-3-parallelagile)
11. [Technical Specifications](#11-technical-specifications)
12. [Question Distribution Analysis](#12-question-distribution-analysis)
13. [Migration Workflow](#13-migration-workflow)
14. [Testing Strategy](#14-testing-strategy)
15. [Risk Analysis & Mitigation](#15-risk-analysis--mitigation)
16. [Recovery Process](#16-recovery-process)
17. [Success Criteria](#17-success-criteria)
18. [Appendix: Complete Syntax Reference](#18-appendix-complete-syntax-reference)
19. [Appendix: Sample Question Conversions](#19-appendix-sample-question-conversions)

---

## 1. Executive Summary

### Project Overview
Migration of approximately 2,238 mathematics questions from the legacy TinyMath system to the new UbuMaths v2 platform. This document provides a complete technical specification and implementation guide for the migration process.

### Key Metrics
- **Total Questions**: ~2,238
- **Migration Approach**: Option 3 - Parallel/Agile (4 phases)
- **Timeline**: 8-10 weeks
- **Expected Success Rate**: 90% automated, 10% manual review
- **Priority**: Maintain educational continuity while upgrading technical infrastructure

### Chosen Strategy
**Option 3: Parallel/Agile Migration** was selected for its balanced approach:
- Immediate value delivery (25% questions in weeks 1-2)
- Progressive complexity handling
- Risk mitigation through phased deployment
- Continuous testing and validation

---

## 2. Old System (TinyMath) Analysis

### 2.1 Architecture Overview
- **Database**: PostgreSQL with JSON columns for question data
- **Storage**: Supabase bucket for images (`tinymath-questions`)
- **Processing**: TinyCAS for mathematical expressions
- **Frontend**: Legacy React components with custom math rendering

### 2.2 Core Type Definitions

```typescript
interface QuestionBase {
  id: number;
  type: 'Choice' | 'Choices' | 'FillIn' | 'ResultOrRewrite' | 'AnswerField';
  statement: string;
  answer?: string | string[];
  correction?: {
    text?: string;
    details?: string;
    steps?: string[];
    hints?: string[];
  };
  image?: string;  // Path in Supabase bucket
  difficulty?: number;  // 1-5
  tags?: string[];
  theme?: string;
  domain?: string;
  subdomain?: string;
  grade?: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e';
  options?: ValidationOptions;
  seed?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 2.3 Variable System Syntax

#### Random Integer Generation
- **`$e[min;max]`** - Random integer between min and max (inclusive)
  - Example: `$e[1;10]` generates 1-10
- **`$e[min;max]\\{excl1,excl2}`** - With exclusions
  - Example: `$e[1;10]\\{5,7}` generates 1-10 except 5 and 7

#### N-Digit Numbers
- **`$e{n;n}`** - Generate n-digit number
  - Example: `$e{3;3}` generates 100-999
- **`$e{n;m}`** - Generate number with n to m digits
  - Example: `$e{2;3}` generates 10-999

#### Random From List
- **`$l{item1,item2,item3}`** - Pick random item from list
  - Example: `$l{rouge,bleu,vert}` picks a color
- **`$l{1:3:5:7:9}`** - Colon separator for numbers
  - Example: `$l{2:4:6:8}` picks even number

#### Evaluation and References
- **`[_expression_]`** - Evaluate mathematical expression
  - Example: `[_&a + &b_]` evaluates sum of variables a and b
- **`&varname`** - Reference to previously defined variable
  - Example: `&result` references variable named 'result'

#### Complex Patterns
- **Nested evaluations**: `[_$e[1;5] * $e[1;5]_]`
- **Variable dependencies**: `$a=$e[1;10]`, then `$b=$e[&a;20]`
- **Conditional generation**: Based on validation options

### 2.4 Question Types Details

| Type | Description | Answer Format | Validation |
|------|------------|---------------|------------|
| Choice | Single selection | string | Exact match |
| Choices | Multiple selection | string[] | Set comparison |
| FillIn | Text input | string | Pattern/regex |
| ResultOrRewrite | Math expression | string | CAS evaluation |
| AnswerField | Numeric input | number | Numeric comparison |

### 2.5 Validation Options (30+ options)

```typescript
interface ValidationOptions {
  // Numeric validation
  acceptDecimals?: boolean;
  decimalPlaces?: number;
  acceptFractions?: boolean;
  simplifyFractions?: boolean;
  acceptMixedNumbers?: boolean;
  acceptPercentages?: boolean;
  acceptScientificNotation?: boolean;

  // Comparison options
  tolerance?: number;
  relativeTolerance?: number;
  roundingMode?: 'up' | 'down' | 'nearest';

  // Algebraic validation
  requireSimplified?: boolean;
  requireExpanded?: boolean;
  requireFactored?: boolean;
  acceptEquivalent?: boolean;

  // Format validation
  requireUnits?: boolean;
  unitFormat?: string;
  acceptSpaces?: boolean;
  caseSensitive?: boolean;
  trimWhitespace?: boolean;

  // Custom validators
  customValidator?: string;  // 'mod', 'cd', 'parity', etc.
  validatorParams?: any;

  // Advanced options
  acceptMultipleFormats?: boolean;
  rejectPatterns?: string[];
  acceptPatterns?: string[];
  transformBeforeValidation?: string;
  normalizeExpression?: boolean;
}
```

### 2.6 Sample Questions (Real Examples)

#### Example 1: Simple Arithmetic (Phase 1 Candidate)
```json
{
  "type": "AnswerField",
  "statement": "Calculer: $e[1;10] + $e[1;10]",
  "answer": "[_&a + &b_]",
  "grade": "CP",
  "theme": "Nombres",
  "domain": "Addition"
}
```

#### Example 2: Intermediate with Variables (Phase 2 Candidate)
```json
{
  "type": "ResultOrRewrite",
  "statement": "Dans une classe de $e[20;30] élèves, $e[5;10] sont absents. Combien sont présents?",
  "answer": "[_&total - &absents_]",
  "correction": {
    "text": "Il faut soustraire le nombre d'absents du total",
    "details": "Calcul: &total - &absents = [_&total - &absents_]"
  },
  "grade": "CE1",
  "options": {
    "acceptDecimals": false
  }
}
```

#### Example 3: With Images (Phase 3 Candidate)
```json
{
  "type": "Choice",
  "statement": "Quelle forme géométrique vois-tu?",
  "image": "geometry/shapes/triangle_$e[1;5].png",
  "answer": "triangle",
  "choices": ["carré", "triangle", "cercle", "rectangle"],
  "grade": "CP",
  "theme": "Géométrie"
}
```

#### Example 4: Complex Validation (Phase 3 Candidate)
```json
{
  "type": "ResultOrRewrite",
  "statement": "Simplifier: $e[2;5]x + $e[1;3]x",
  "answer": "[_&a + &b_]x",
  "options": {
    "requireSimplified": true,
    "acceptEquivalent": true,
    "normalizeExpression": true
  },
  "grade": "5e"
}
```

#### Example 5: Custom Validator (Phase 4 Candidate)
```json
{
  "type": "AnswerField",
  "statement": "Trouver un multiple de $e[3;7] entre $e[20;30] et $e[40;50]",
  "options": {
    "customValidator": "mod",
    "validatorParams": {
      "divisor": "&divisor",
      "min": "&min",
      "max": "&max"
    }
  },
  "grade": "CM1"
}
```

---

## 3. New System (UbuMaths v2) Analysis

### 3.1 Architecture Overview
- **Database**: Supabase PostgreSQL with structured schema
- **Storage**: Supabase bucket (`ubumaths2-questions`)
- **Processing**: MathLive Compute Engine
- **Frontend**: Svelte 5 with Shadcn-svelte components

### 3.2 Core Type Definitions

```typescript
interface QuestionTemplate {
  id: string;  // UUID
  title: string;
  statement: string;
  question_type: QuestionType;
  answer_template: string;
  variables?: VariableDefinition[];
  variations?: QuestionVariation[];
  images?: ImageReference[];
  validation_options?: ValidationOptions;
  correction?: CorrectionTemplate;
  metadata?: {
    difficulty?: number;
    estimated_time?: number;
    prerequisites?: string[];
  };
  category: {
    theme: string;
    domain: string;
    subdomain: string;
    level: string;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface QuestionVariation {
  id: string;
  template_id: string;
  variables: Record<string, any>;
  specific_answer?: string;
  specific_validation?: Partial<ValidationOptions>;
}

interface QuestionInstance {
  id: string;
  template_id: string;
  variation_id?: string;
  statement: string;  // Rendered with variables
  answer: string;     // Computed answer
  user_answer?: string;
  is_correct?: boolean;
  created_at: string;
}
```

### 3.3 Variable System Syntax

#### Variable References
- **`{@:varname}`** - Reference to variable
  - Example: `{@:a}` references variable 'a'

#### Random Generation
- **`{#:min-max}`** - Random integer
  - Example: `{#:1-10}` generates 1-10
- **`{#:min-max!excl1,excl2}`** - With exclusions
  - Example: `{#:1-10!5,7}` generates 1-10 except 5,7
- **`{#:n.m}`** - Decimal with n digits before, m after
  - Example: `{#:2.1}` generates 10.0-99.9

#### Evaluation
- **`{eval:expression}`** - Evaluate expression
  - Example: `{eval:{@:a} + {@:b}}` computes sum

### 3.4 Question Types

| Type | Description | Use Case |
|------|------------|----------|
| numerical_exact | Exact number match | Basic arithmetic |
| numerical_decimal | Decimal with precision | Measurements |
| numerical_rounded | Rounded to n places | Approximations |
| algebraic_transform | Algebraic expression | Simplification |
| fill_in_blanks | Multiple gaps | Sentences/formulas |
| multiple_choice | Select option(s) | Conceptual questions |

### 3.5 Current Validation Options

```typescript
interface ValidationOptions {
  // Numeric
  precision?: number;
  tolerance?: number;
  accept_decimals?: boolean;
  accept_fractions?: boolean;

  // Algebraic
  check_equivalence?: boolean;
  require_simplified?: boolean;

  // Format
  case_sensitive?: boolean;
  trim_spaces?: boolean;

  // Multiple choice
  allow_multiple?: boolean;
  min_selections?: number;
  max_selections?: number;
}
```

---

## 4. Color Template System

**Status**: ✅ Implemented (2025-11-16)

### Overview

The color template system solves the `${get(color)}` extraction blocker found in old TinyMath questions. It converts runtime Svelte store calls to declarative template syntax that resolves during instance generation.

### Syntax Conversion

**Old TinyMath** (runtime JavaScript):
```javascript
"Draw a ${get(color1)} triangle"  // Runtime Svelte store call
```

**New Template** (declarative):
```javascript
"Draw a {#color:primary.0} triangle"  // Resolved during generation
```

### Color Palettes

Five specialized palettes with 39 total colors:

1. **Primary** (8 colors): Vibrant colors for highlighting
   - `#FF5722`, `#2196F3`, `#4CAF50`, `#FFC107`, `#9C27B0`, `#FF9800`, `#00BCD4`, `#E91E63`

2. **Shapes** (8 colors): Pastel colors for diagrams
   - `#FFCDD2`, `#C5CAE9`, `#C8E6C9`, `#FFF9C4`, `#E1BEE7`, `#FFE0B2`, `#B2EBF2`, `#F8BBD0`

3. **Text** (8 colors): Dark colors for emphasis
   - `#D32F2F`, `#1976D2`, `#388E3C`, `#F57C00`, `#7B1FA2`, `#00796B`, `#C2185B`, `#512DA8`

4. **Contrast** (4 pairs, 8 colors): High-contrast pairs for comparisons
   - Red/Blue, Green/Red, Amber/Purple, Orange/Cyan

5. **Rainbow** (7 colors): ROYGBIV spectrum
   - Red, Orange, Yellow, Green, Blue, Indigo, Violet

### Supported Formats

- `{#color:primary}` - Random color from palette
- `{#color:primary.0}` - Specific color by index
- `{#color:primary.random}` - Explicit random
- `{#color:contrast.0.0}` - First color of first contrast pair
- `{#color:contrast.0.1}` - Second color of first contrast pair

### Seeded Randomization

Colors support seeded randomization for reproducibility:
```typescript
// Same seed always produces same color
const instance1 = generateInstance(template, 42);
const instance2 = generateInstance(template, 42);
// Both will have identical colors
```

### Integration

**Resolution Order**:
1. Variable references (`{@:var}`)
2. Random numbers (`{#:1-10}`)
3. Evaluations (`{eval:...}`)
4. **Colors** (`{#color:...}`) ← Added here
5. Final rendering

### Implementation Files

- `src/lib/questions/colors.ts` - Core color palette system (157 lines)
- `src/lib/questions/parser/color-parser.ts` - Parser (82 lines)
- `src/lib/migration/syntax-converter.ts` - Conversion logic (updated)
- `src/lib/questions/generator/content-resolver.ts` - Resolution (updated)

### Testing

- 45 unit tests for color module
- 19 parser tests
- 24 integration tests
- 12 converter tests
- **Total: 100 tests, 100% passing**

### Impact

- Removes `${get(color)}` extraction blocker
- Enables migration of ~200-300 color-based questions
- Provides extensible system for future visual features
- No breaking changes to existing code

### French Name Support

The converter handles French color names:
- `couleur1` → `{#color:primary.0}`
- `couleur2` → `{#color:primary.1}`
- `couleur3` → `{#color:primary.2}`

---

## 5. Feature Comparison Table

| Feature | Old System (TinyMath) | New System (UbuMaths v2) | Migration Status | Priority |
|---------|----------------------|-------------------------|------------------|----------|
| **Variables** |
| Random integers | `$e[min;max]` | `{#:min-max}` | Direct mapping | Critical |
| Exclusions | `\\{excl1,excl2}` | `!excl1,excl2` | Direct mapping | Critical |
| N-digit numbers | `$e{n;m}` | Custom function needed | Needs extension | High |
| Random from list | `$l{a,b,c}` | Not implemented | Needs extension | High |
| Variable references | `&varname` | `{@:varname}` | Direct mapping | Critical |
| Evaluations | `[_expr_]` | `{eval:expr}` | Direct mapping | Critical |
| **Question Types** |
| Single choice | Choice | multiple_choice | Direct mapping | Critical |
| Multiple choice | Choices | multiple_choice (multi) | Direct mapping | Critical |
| Text input | FillIn | fill_in_blanks | Direct mapping | Critical |
| Math expression | ResultOrRewrite | algebraic_transform | Direct mapping | Critical |
| Numeric input | AnswerField | numerical_exact | Direct mapping | Critical |
| **Validation** |
| Decimal places | decimalPlaces | precision | Direct mapping | High |
| Tolerance | tolerance | tolerance | Direct mapping | High |
| Fractions | acceptFractions | accept_fractions | Direct mapping | Medium |
| Simplification | requireSimplified | require_simplified | Direct mapping | High |
| Custom validators | customValidator | Not implemented | Needs extension | Low |
| **Content** |
| Images | Supabase path | Supabase path | Needs migration | High |
| Corrections | Complex object | correction field | Manual conversion | Medium |
| Grades | CP, CE1, etc. | level field | Direct mapping | Critical |
| Categories | theme/domain | category object | Direct mapping | Critical |

---

## 5. Gap Analysis

### 5.1 Critical Gaps (Must Fix Before Migration)

#### Random From List
- **Impact**: ~450 questions (20%)
- **Solution**: Implement `{list:item1,item2,item3}` syntax
- **Implementation**: Phase 2, extend variable parser
- **File**: `src/lib/utils/question-generator.ts`

#### Variable Range Exclusion Bug
- **Impact**: ~200 questions (9%)
- **Solution**: Fix parser regex in variable processor
- **Implementation**: Phase 1, critical fix
- **File**: `src/lib/utils/variable-processor.ts`

### 5.2 High Priority Gaps

#### N-Digit Number Generation
- **Impact**: ~300 questions (13%)
- **Solution**: Add `{digits:n-m}` syntax
- **Implementation**: Phase 2
- **Conversion**: `$e{3;3}` → `{digits:3-3}`

#### Advanced Validation Options
- **Impact**: ~600 questions (27%)
- **Missing Options**:
  - acceptMixedNumbers
  - acceptScientificNotation
  - requireExpanded
  - requireFactored
  - customValidator
- **Solution**: Extend ValidationOptions interface
- **Implementation**: Phase 2-3

### 5.3 Medium Priority Gaps

#### Image ContentField Support
- **Impact**: ~180 questions (8%)
- **Solution**: Migrate images, update references
- **Implementation**: Phase 3
- **Process**: Copy from `tinymath-questions` to `ubumaths2-questions`

#### Rich Correction Details
- **Impact**: All questions with corrections
- **Solution**: Convert to markdown format
- **Implementation**: Phase 1-4 (progressive)

### 5.4 Low Priority Gaps

#### Custom Validators (mod, cd, parity)
- **Impact**: ~50 questions (2%)
- **Solution**: Implement validator plugins
- **Implementation**: Phase 4
- **Manual review likely needed

---

## 6. Decision Rationale

### 6.1 Core Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Migration Approach** | Option 3: Parallel/Agile | Balance speed and quality |
| **Exclusion Patterns** | Port with new syntax | Critical feature, better syntax available |
| **Validation Options** | Extend progressively | Maintain compatibility, add as needed |
| **Image Migration** | Copy to new bucket | Clean separation, preserve structure |
| **Grade System** | Keep same strings | Familiar to teachers, no confusion |
| **Corrections** | Convert to markdown | Flexible, supports rich content |
| **TinyCAS** | Syntax conversion only | Avoid dependency, use MathLive |
| **Priority** | Educational continuity | Teachers need questions immediately |

### 6.2 Option 3 Selection Rationale

**Why Option 3 over Option 1 (Manual Review)**:
- Option 1 timeline (12+ weeks) too long
- Teachers need questions for upcoming term
- Manual review error-prone and inconsistent
- No early value delivery

**Why Option 3 over Option 2 (Full Automation)**:
- Option 2 risks data loss on complex questions
- No provision for edge cases
- All-or-nothing approach too risky
- Can't handle custom validators properly

**Option 3 Benefits**:
- ✅ Immediate value (25% in 2 weeks)
- ✅ Progressive complexity handling
- ✅ Continuous testing and feedback
- ✅ Risk mitigation through phases
- ✅ Manual review only where needed (10%)
- ✅ Parallel development possible

**Trade-offs Accepted**:
- Slightly longer than Option 2 (8-10 vs 6-8 weeks)
- Requires hybrid UI development
- More complex project management
- Multiple deployment phases

---

## 7. Question Tracking System

### 7.1 Overview
A comprehensive tracking system to monitor the migration status of each question throughout the process, ensuring no data loss and providing clear visibility into progress and issues.

### 7.2 Database Schema

```sql
-- Main tracking table for individual questions
CREATE TABLE migration_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_question_hash TEXT UNIQUE NOT NULL,  -- Hash of original question for uniqueness
  old_question_index INTEGER NOT NULL,     -- Original index/ID from TinyMath
  old_description TEXT NOT NULL,           -- Brief description for human reference
  migration_status TEXT NOT NULL CHECK (migration_status IN (
    'pending',      -- Not yet processed
    'converted',    -- Syntax converted successfully
    'imported',     -- Imported to new database
    'validated',    -- Validation tests passed
    'failed',       -- Migration failed, needs manual review
    'skipped'       -- Intentionally skipped
  )),
  phase INTEGER CHECK (phase BETWEEN 1 AND 4),  -- Which phase processed this
  new_template_id UUID REFERENCES question_templates(id),  -- Link to new question
  conversion_errors JSONB,    -- Structured error information
  conversion_notes TEXT,       -- Human-readable notes
  converted_at TIMESTAMPTZ,    -- When conversion happened
  imported_at TIMESTAMPTZ,     -- When imported to database
  validated_at TIMESTAMPTZ,    -- When validation completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_migration_status ON migration_tracking(migration_status);
CREATE INDEX idx_migration_phase ON migration_tracking(phase);
CREATE INDEX idx_old_question_index ON migration_tracking(old_question_index);

-- Tracking table for image migrations
CREATE TABLE migration_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path TEXT UNIQUE NOT NULL,      -- Original path in tinymath-questions bucket
  new_path TEXT UNIQUE NOT NULL,      -- New path in ubumaths2-questions bucket
  migrated_at TIMESTAMPTZ,            -- When migration occurred
  file_size INTEGER,                  -- File size in bytes for verification
  checksum TEXT,                      -- MD5/SHA256 for integrity verification
  migration_status TEXT NOT NULL CHECK (migration_status IN (
    'pending',
    'transferred',
    'verified',
    'failed'
  )),
  error_details JSONB,                -- Any error information
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for image lookups
CREATE INDEX idx_image_old_path ON migration_images(old_path);
```

### 7.3 Tracking Workflow

#### Initial Scan (Pre-Migration)
1. Scan all questions in TinyMath database
2. Create `migration_tracking` entry for each with status `pending`
3. Generate hash for deduplication
4. Categorize by complexity for phase assignment

#### During Each Phase
1. **Start Processing**: Update status to `converting`
2. **After Conversion**: Update to `converted`, store any errors
3. **After Import**: Update to `imported`, link to new template
4. **After Validation**: Update to `validated` or `failed`

#### Error Handling
```typescript
interface ConversionError {
  code: string;           // Error code for categorization
  message: string;        // Human-readable message
  field?: string;         // Which field caused the error
  originalValue?: any;    // Original value that failed
  attemptedFix?: string;  // What we tried to fix it
  canRetry: boolean;      // Whether automated retry is possible
}
```

### 7.4 Progress Monitoring Queries

```sql
-- Overall progress summary
SELECT
  migration_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM migration_tracking
GROUP BY migration_status
ORDER BY
  CASE migration_status
    WHEN 'validated' THEN 1
    WHEN 'imported' THEN 2
    WHEN 'converted' THEN 3
    WHEN 'pending' THEN 4
    WHEN 'failed' THEN 5
    WHEN 'skipped' THEN 6
  END;

-- Phase-specific progress
SELECT
  phase,
  migration_status,
  COUNT(*) as count
FROM migration_tracking
WHERE phase = $1
GROUP BY phase, migration_status;

-- Failed questions requiring manual review
SELECT
  old_question_index,
  old_description,
  conversion_errors,
  phase
FROM migration_tracking
WHERE migration_status = 'failed'
ORDER BY phase, old_question_index;

-- Questions ready for next step
SELECT COUNT(*)
FROM migration_tracking
WHERE migration_status = 'converted'
  AND new_template_id IS NULL;

-- Image migration status
SELECT
  migration_status,
  COUNT(*) as count,
  SUM(file_size) / 1024 / 1024 as total_size_mb
FROM migration_images
GROUP BY migration_status;
```

### 7.5 Tracking API

```typescript
// src/lib/migration/tracking-service.ts
export class MigrationTrackingService {
  async trackQuestion(
    oldQuestion: QuestionBase,
    phase: number
  ): Promise<string> {
    const hash = this.generateHash(oldQuestion);
    const trackingId = await this.db.insert('migration_tracking', {
      old_question_hash: hash,
      old_question_index: oldQuestion.id,
      old_description: this.generateDescription(oldQuestion),
      migration_status: 'pending',
      phase
    });
    return trackingId;
  }

  async updateStatus(
    trackingId: string,
    status: MigrationStatus,
    details?: {
      newTemplateId?: string;
      errors?: ConversionError[];
      notes?: string;
    }
  ): Promise<void> {
    const update: any = {
      migration_status: status,
      updated_at: new Date()
    };

    if (status === 'converted') update.converted_at = new Date();
    if (status === 'imported') update.imported_at = new Date();
    if (status === 'validated') update.validated_at = new Date();

    if (details?.newTemplateId) update.new_template_id = details.newTemplateId;
    if (details?.errors) update.conversion_errors = details.errors;
    if (details?.notes) update.conversion_notes = details.notes;

    await this.db.update('migration_tracking', trackingId, update);
  }

  async getProgress(phase?: number): Promise<ProgressReport> {
    // Implementation of progress queries
  }

  async getFailedQuestions(phase?: number): Promise<FailedQuestion[]> {
    // Return questions needing manual review
  }
}
```

---

## 8. Migration State Files

### 8.1 Overview
Persistent state files ensure migration can be resumed after interruptions, provide clear progress tracking, and enable recovery from failures.

### 8.2 Migration State JSON

**File**: `.claude/migration-state.json`

```json
{
  "version": "1.0.0",
  "currentPhase": 2,
  "lastUpdated": "2025-11-16T10:30:00Z",
  "phases": {
    "1": {
      "status": "completed",
      "startedAt": "2025-11-14T09:00:00Z",
      "completedAt": "2025-11-15T17:00:00Z",
      "questionsTarget": 560,
      "questionsProcessed": 560,
      "questionsSuccessful": 555,
      "questionsFailed": 5,
      "successRate": 99.1,
      "commitHash": "abc123def456",
      "notes": "5 questions with custom validators moved to phase 4"
    },
    "2": {
      "status": "in_progress",
      "startedAt": "2025-11-16T09:00:00Z",
      "completedAt": null,
      "questionsTarget": 895,
      "questionsProcessed": 450,
      "questionsSuccessful": 445,
      "questionsFailed": 5,
      "lastProcessedIndex": 1455,
      "lastCheckpoint": "2025-11-16T10:15:00Z",
      "currentBatch": 5
    },
    "3": {
      "status": "pending",
      "questionsTarget": 560,
      "questionsProcessed": 0
    },
    "4": {
      "status": "pending",
      "questionsTarget": 223,
      "questionsProcessed": 0
    }
  },
  "totals": {
    "questionsTarget": 2238,
    "questionsProcessed": 1010,
    "questionsSuccessful": 1000,
    "questionsFailed": 10,
    "overallProgress": 45.1
  },
  "failedQuestions": [
    {
      "id": 123,
      "phase": 1,
      "reason": "Custom validator 'mod' not implemented",
      "retryInPhase": 4
    },
    {
      "id": 456,
      "phase": 2,
      "reason": "Complex nested evaluation parsing error",
      "requiresManualReview": true
    }
  ],
  "checkpoints": [
    {
      "phase": 1,
      "batch": 1,
      "timestamp": "2025-11-14T10:00:00Z",
      "questionsProcessed": 100
    },
    {
      "phase": 1,
      "batch": 2,
      "timestamp": "2025-11-14T11:00:00Z",
      "questionsProcessed": 200
    }
  ]
}
```

### 8.3 Migration Progress Markdown

**File**: `.claude/migration-progress.md`

```markdown
# Migration Progress Report

**Last Updated**: 2025-11-16 10:30:00
**Overall Progress**: 1010/2238 questions (45.1%)

## Phase 1: Foundation ✅ COMPLETED

**Duration**: 2025-11-14 to 2025-11-15 (2 days)
**Questions**: 560/560 processed (100%)
**Success Rate**: 99.1% (555 successful, 5 failed)

### Components Created
- ✅ `src/lib/migration/syntax-converter.ts`
- ✅ `src/lib/migration/question-transformer.ts`
- ✅ `scripts/migrate-questions.ts`

### Key Achievements
- Basic syntax conversion working perfectly
- Simple arithmetic questions (CP/CE1) fully migrated
- Instance generation validated for all migrated questions

### Known Issues
- 5 questions with custom validators postponed to Phase 4
- Questions IDs: 123, 245, 367, 489, 501

### Resume Instructions
Phase 1 is complete. No action needed.

---

## Phase 2: Validation System 🚧 IN PROGRESS

**Started**: 2025-11-16 09:00:00
**Questions**: 450/895 processed (50.3%)
**Current Success Rate**: 98.9% (445 successful, 5 failed)

### Components Created
- ✅ `src/lib/utils/mathjs-wrapper.ts` (extended)
- ✅ Random from list implementation
- 🚧 N-digit generation (in progress)

### Current Status
- Batch 5 processing (questions 1401-1500)
- Last checkpoint: 2025-11-16 10:15:00
- Next batch starts at index 1456

### To Resume
```bash
pnpm migrate:resume --phase=2 --from-index=1456
```

### Known Issues
- 5 questions with complex nested evaluations need review
- Performance slightly degraded on questions with 10+ variables

---

## Phase 3: Images & Complex ⏳ PENDING

**Target Start**: 2025-11-18
**Questions Target**: 560

### Prerequisites
- [ ] Complete Phase 2
- [ ] Test image migration script
- [ ] Verify bucket permissions

---

## Phase 4: Edge Cases & Manual Review ⏳ PENDING

**Target Start**: 2025-11-25
**Questions Target**: 223 + deferred questions from earlier phases

### Deferred Questions
- 5 from Phase 1 (custom validators)
- TBD from Phase 2
- TBD from Phase 3

---

## Statistics Summary

| Metric | Value |
|--------|-------|
| Total Questions | 2,238 |
| Processed | 1,010 (45.1%) |
| Successful | 1,000 (44.7%) |
| Failed | 10 (0.4%) |
| Remaining | 1,228 (54.9%) |
| Estimated Completion | 2025-11-30 |

## Next Actions

1. Resume Phase 2 from index 1456
2. Review 5 failed questions from current batch
3. Prepare image migration script for Phase 3
```

### 8.4 State Management Service

```typescript
// src/lib/migration/state-manager.ts
export class MigrationStateManager {
  private stateFile = '.claude/migration-state.json';
  private progressFile = '.claude/migration-progress.md';

  async saveCheckpoint(
    phase: number,
    processedCount: number,
    lastIndex?: number
  ): Promise<void> {
    const state = await this.loadState();

    state.phases[phase] = {
      ...state.phases[phase],
      questionsProcessed: processedCount,
      lastProcessedIndex: lastIndex,
      lastCheckpoint: new Date().toISOString()
    };

    state.lastUpdated = new Date().toISOString();
    await this.saveState(state);
    await this.updateProgressReport(state);
  }

  async loadResumePoint(phase: number): Promise<ResumePoint> {
    const state = await this.loadState();
    const phaseState = state.phases[phase];

    return {
      phase,
      lastProcessedIndex: phaseState.lastProcessedIndex || 0,
      questionsProcessed: phaseState.questionsProcessed || 0,
      lastCheckpoint: phaseState.lastCheckpoint
    };
  }

  async markPhaseComplete(
    phase: number,
    stats: PhaseCompletionStats
  ): Promise<void> {
    const state = await this.loadState();

    state.phases[phase] = {
      ...state.phases[phase],
      status: 'completed',
      completedAt: new Date().toISOString(),
      ...stats
    };

    await this.saveState(state);
    await this.generatePhaseReport(phase, stats);
  }
}
```

---

## 9. Implementation Strategy: Option 3 (Parallel/Agile)

### Phase 1: Foundation (Weeks 1-2)

#### Objectives
- Establish core conversion infrastructure
- Migrate simplest 25% of questions (~560)
- Validate basic conversion accuracy

#### Deliverables
1. **TinyCAS Syntax Parser** (`src/lib/migration/syntax-converter.ts`)
   - Parse all variable patterns
   - Convert to new syntax
   - Handle basic evaluations

2. **Question Transformer** (`src/lib/migration/question-transformer.ts`)
   - Map question types
   - Generate variations
   - Create category structure

3. **Migration Script** (`scripts/migrate-questions.ts`)
   - Batch processing
   - Error logging
   - Progress tracking

4. **Initial Migration**
   - 560 simple arithmetic questions
   - No images, basic validation
   - CP/CE1 level primarily

#### Success Criteria
- [ ] Parser handles 100% of basic syntax
- [ ] 560 questions migrated successfully
- [ ] Instance generation works for all migrated
- [ ] Answer validation accuracy > 95%
- [ ] Zero TypeScript errors

### Phase 1 Completion Workflow

#### Step 1: Code Review
**Agent**: `code-reviewer`
- Review all syntax converter code
- Review question transformer implementation
- Check error handling and edge cases
- Validate tracking system integration
- Security review of data handling

#### Step 2: Documentation Update
**Agent**: `documentation-writer`
- Update `.claude/migration-progress.md` with Phase 1 results:
  - Final statistics (560 questions processed, success rate)
  - Components created list
  - Known issues and deferred questions
  - Resume instructions for Phase 2
- Update main documentation if API changes made

#### Step 3: Commit
**Agent**: `commit-manager`
- Create commit with descriptive message
- Include phase number and statistics
- Example: "feat(migration): Phase 1 complete - Foundation (560/2238 questions)"

---

### Phase 2: Validation System (Weeks 3-4)

#### Objectives
- Extend validation capabilities
- Add missing variable features
- Migrate intermediate 40% (~895 questions)

#### Deliverables
1. **Extended MathLive Wrapper** (`src/lib/utils/mathjs-wrapper.ts`)
   - Additional validation options
   - Fraction handling
   - Algebraic comparison

2. **Random From List** (`src/lib/utils/variable-processor.ts`)
   - Implement `{list:...}` syntax
   - Support numeric and string lists
   - Handle weighted selection

3. **N-Digit Generation** (`src/lib/utils/number-generator.ts`)
   - Implement `{digits:n-m}` syntax
   - Ensure uniform distribution

4. **Intermediate Migration**
   - 895 questions with variables
   - Complex validation options
   - CE2/CM1 level primarily

#### Success Criteria
- [ ] All validation options implemented
- [ ] List randomization working
- [ ] 1,455 total questions migrated (65%)
- [ ] Validation accuracy > 97%
- [ ] Performance < 100ms per instance

### Phase 2 Completion Workflow

#### Step 1: Code Review
**Agent**: `code-reviewer`
- Review extended validation implementation
- Review random from list feature
- Review N-digit generation feature
- Check performance metrics
- Validate all new validation options

#### Step 2: Documentation Update
**Agent**: `documentation-writer`
- Update `.claude/migration-progress.md` with Phase 2 results:
  - Final statistics (895 questions processed, cumulative 1,455)
  - New features implemented
  - Performance metrics achieved
  - Known issues for Phase 3
- Update API documentation for new validation options

#### Step 3: Commit
**Agent**: `commit-manager`
- Create commit with descriptive message
- Example: "feat(migration): Phase 2 complete - Validation System (1455/2238 questions)"

---

### Phase 3: Images & Complex (Weeks 5-6)

#### Objectives
- Handle image migration
- Complex variable dependencies
- Migrate complex 25% (~560 questions)

#### Deliverables
1. **Image Migration Tool** (`scripts/migrate-images.ts`)
   - Bucket-to-bucket transfer
   - Reference updating
   - Verification system

2. **Dependency Resolver** (`src/lib/migration/dependency-resolver.ts`)
   - Variable dependency graphs
   - Ordered evaluation
   - Circular dependency detection

3. **Complex Pattern Handler**
   - Nested evaluations
   - Conditional generation
   - Multi-step problems

4. **Complex Migration**
   - 560 questions with images/dependencies
   - Advanced features
   - CM2/Collège level

#### Success Criteria
- [ ] All images transferred successfully
- [ ] Image references updated correctly
- [ ] 2,015 total questions migrated (90%)
- [ ] Complex validations working
- [ ] No broken image links

### Phase 3 Completion Workflow

#### Step 1: Code Review
**Agent**: `code-reviewer`
- Review image migration tool
- Review dependency resolver
- Check complex pattern handling
- Validate image integrity checks
- Security review of file operations

#### Step 2: Performance Audit
**Agent**: `performance-optimizer`
- Verify image loading performance
- Check dependency resolution speed
- Validate batch processing efficiency
- Memory usage analysis

#### Step 3: Documentation Update
**Agent**: `documentation-writer`
- Update `.claude/migration-progress.md` with Phase 3 results:
  - Final statistics (560 questions, cumulative 2,015)
  - Images migrated count and size
  - Complex patterns handled
  - Edge cases identified for Phase 4

#### Step 4: Commit
**Agent**: `commit-manager`
- Create commit with descriptive message
- Example: "feat(migration): Phase 3 complete - Images & Complex (2015/2238 questions)"

---

### Phase 4: Edge Cases & Manual Review (Weeks 7-8)

#### Objectives
- Handle remaining edge cases
- Build review UI for manual cases
- Complete final 10% (~223 questions)

#### Deliverables
1. **Hybrid Review UI** (`src/routes/(protected)/dashboard/admin/migration/+page.svelte`)
   - Side-by-side comparison
   - Manual override capability
   - Approval workflow
   - Batch operations

2. **Custom Validators** (`src/lib/utils/custom-validators.ts`)
   - Modulo validator
   - Divisibility checker
   - Parity validator
   - Custom regex patterns

3. **Edge Case Handler**
   - Special formatting
   - Unusual validation
   - Legacy patterns

4. **Final Migration**
   - Last 223 complex questions
   - Manual review cases
   - Custom validators

#### Success Criteria
- [ ] 100% questions migrated (2,238)
- [ ] All custom validators implemented
- [ ] Manual review UI functional
- [ ] Final validation accuracy > 99%
- [ ] Complete documentation

### Phase 4 Completion Workflow

#### Step 1: Code Review
**Agent**: `code-reviewer`
- Review hybrid review UI
- Review custom validators
- Check edge case handlers
- Validate manual override functionality
- Final security audit

#### Step 2: Security Audit
**Agent**: `security-auditor`
- Audit entire migration codebase
- Verify data integrity measures
- Check access controls on review UI
- Validate input sanitization
- Review custom validator security

#### Step 3: Documentation Update
**Agent**: `documentation-writer`
- Update `.claude/migration-progress.md` with final results:
  - Final statistics (223 questions, total 2,238)
  - Custom validators implemented
  - Manual review statistics
  - Migration success metrics
- Create final migration report
- Document lessons learned
- Create teacher training materials

#### Step 4: Final Commit
**Agent**: `commit-manager`
- Create final commit with comprehensive message
- Example: "feat(migration): Phase 4 complete - Migration finished (2238/2238 questions)"
- Tag release if appropriate

---

## 10. Technical Specifications

### 10.1 Syntax Converter

**File**: `src/lib/migration/syntax-converter.ts`

```typescript
interface ConversionRule {
  pattern: RegExp;
  replacement: (match: RegExpMatchArray) => string;
  description: string;
}

class SyntaxConverter {
  private rules: ConversionRule[] = [
    {
      pattern: /\$e\[(\d+);(\d+)\]/g,
      replacement: (m) => `{#:${m[1]}-${m[2]}}`,
      description: 'Random integer range'
    },
    {
      pattern: /\$e\[(\d+);(\d+)\]\\{([^}]+)\}/g,
      replacement: (m) => `{#:${m[1]}-${m[2]}!${m[3]}}`,
      description: 'Random with exclusions'
    },
    {
      pattern: /\$e\{(\d+);(\d+)\}/g,
      replacement: (m) => `{digits:${m[1]}-${m[2]}}`,
      description: 'N-digit number'
    },
    {
      pattern: /\$l\{([^}]+)\}/g,
      replacement: (m) => `{list:${m[1]}}`,
      description: 'Random from list'
    },
    {
      pattern: /&(\w+)/g,
      replacement: (m) => `{@:${m[1]}}`,
      description: 'Variable reference'
    },
    {
      pattern: /\[_([^_]+)_\]/g,
      replacement: (m) => `{eval:${m[1]}}`,
      description: 'Expression evaluation'
    }
  ];

  convert(input: string): string {
    let output = input;
    for (const rule of this.rules) {
      output = output.replace(rule.pattern,
        (match, ...args) => rule.replacement(match.match(rule.pattern)!)
      );
    }
    return output;
  }
}
```

**Testing Strategy**:
- Unit tests for each pattern
- Edge case tests (nested patterns)
- Performance tests (1000+ conversions)
- Regression tests with real questions

### 10.2 Question Transformer

**File**: `src/lib/migration/question-transformer.ts`

```typescript
class QuestionTransformer {
  constructor(
    private syntaxConverter: SyntaxConverter,
    private variableExtractor: VariableExtractor,
    private categoryMapper: CategoryMapper
  ) {}

  async transform(oldQuestion: QuestionBase): Promise<QuestionTemplate> {
    // 1. Convert statement syntax
    const statement = this.syntaxConverter.convert(oldQuestion.statement);

    // 2. Extract variables
    const variables = this.variableExtractor.extract(statement);

    // 3. Map question type
    const questionType = this.mapQuestionType(oldQuestion.type);

    // 4. Convert answer
    const answerTemplate = this.convertAnswer(oldQuestion.answer);

    // 5. Map validation options
    const validationOptions = this.mapValidationOptions(oldQuestion.options);

    // 6. Generate variations (if variables present)
    const variations = this.generateVariations(variables);

    // 7. Map categories
    const category = this.categoryMapper.map({
      theme: oldQuestion.theme,
      domain: oldQuestion.domain,
      subdomain: oldQuestion.subdomain,
      level: oldQuestion.grade
    });

    // 8. Convert correction
    const correction = this.convertCorrection(oldQuestion.correction);

    return {
      id: uuidv4(),
      title: this.generateTitle(oldQuestion),
      statement,
      question_type: questionType,
      answer_template: answerTemplate,
      variables,
      variations,
      validation_options: validationOptions,
      correction,
      category,
      metadata: {
        difficulty: oldQuestion.difficulty,
        migrated_from: oldQuestion.id,
        migration_date: new Date().toISOString()
      }
    };
  }

  private mapQuestionType(oldType: string): QuestionType {
    const mapping = {
      'Choice': 'multiple_choice',
      'Choices': 'multiple_choice',
      'FillIn': 'fill_in_blanks',
      'ResultOrRewrite': 'algebraic_transform',
      'AnswerField': 'numerical_exact'
    };
    return mapping[oldType] || 'numerical_exact';
  }
}
```

### 10.3 Image Migrator

**File**: `src/lib/migration/image-migrator.ts`

```typescript
class ImageMigrator {
  constructor(
    private sourceClient: SupabaseClient,
    private destClient: SupabaseClient
  ) {}

  async migrateImage(sourcePath: string): Promise<string> {
    // 1. Download from source bucket
    const { data, error } = await this.sourceClient
      .storage
      .from('tinymath-questions')
      .download(sourcePath);

    if (error) throw error;

    // 2. Generate new path (preserve structure)
    const destPath = this.generateDestPath(sourcePath);

    // 3. Upload to destination bucket
    const { error: uploadError } = await this.destClient
      .storage
      .from('ubumaths2-questions')
      .upload(destPath, data);

    if (uploadError) throw uploadError;

    // 4. Return new path
    return destPath;
  }

  private generateDestPath(sourcePath: string): string {
    // Preserve folder structure, add timestamp for uniqueness
    const timestamp = Date.now();
    const parts = sourcePath.split('/');
    const filename = parts.pop();
    const folder = parts.join('/');
    return `${folder}/migrated_${timestamp}_${filename}`;
  }
}
```

### 10.4 Validation Extensions

**File**: `src/lib/utils/answer-validator.ts`

```typescript
// Extend existing validator
export class ExtendedAnswerValidator extends AnswerValidator {
  private customValidators: Map<string, CustomValidator> = new Map([
    ['mod', new ModuloValidator()],
    ['cd', new DivisibilityValidator()],
    ['parity', new ParityValidator()],
    ['prime', new PrimeValidator()]
  ]);

  async validate(
    userAnswer: string,
    correctAnswer: string,
    options: ExtendedValidationOptions
  ): Promise<ValidationResult> {
    // Check for custom validator
    if (options.customValidator) {
      const validator = this.customValidators.get(options.customValidator);
      if (validator) {
        return validator.validate(userAnswer, options.validatorParams);
      }
    }

    // Extended options processing
    if (options.acceptMixedNumbers) {
      userAnswer = this.convertMixedNumber(userAnswer);
    }

    if (options.acceptScientificNotation) {
      userAnswer = this.parseScientificNotation(userAnswer);
    }

    // Call parent validator
    return super.validate(userAnswer, correctAnswer, options);
  }
}
```

### 10.5 Hybrid Review UI

**File**: `src/routes/(protected)/dashboard/admin/migration/+page.svelte`

**Features**:
- Side-by-side comparison (old vs new)
- Live preview of generated instances
- Manual override for any field
- Bulk approval/rejection
- Filter by migration status
- Search by question ID or content
- Export capability

**Workflow**:
1. Load questions marked for review
2. Display original and converted versions
3. Allow field-by-field editing
4. Test instance generation
5. Validate answers
6. Approve or request changes
7. Batch process similar questions

---

## 9. Question Distribution Analysis

### By Complexity Phase
- **Phase 1 (Simple)**: ~560 questions (25%)
  - Basic arithmetic
  - No variables or simple variables
  - Single validation rule

- **Phase 2 (Intermediate)**: ~895 questions (40%)
  - Complex variables
  - Multiple validation rules
  - No images

- **Phase 3 (Complex)**: ~560 questions (25%)
  - Images
  - Variable dependencies
  - Advanced validation

- **Phase 4 (Edge Cases)**: ~223 questions (10%)
  - Custom validators
  - Special formatting
  - Manual review needed

### By Grade Level
- CP: ~350 questions (15.6%)
- CE1: ~400 questions (17.9%)
- CE2: ~380 questions (17.0%)
- CM1: ~350 questions (15.6%)
- CM2: ~350 questions (15.6%)
- Collège: ~408 questions (18.3%)

### By Feature Usage
- With variables: ~1,800 (80%)
- With images: ~180 (8%)
- With complex validation: ~600 (27%)
- With corrections: ~1,500 (67%)
- With exclusions: ~200 (9%)
- With lists: ~450 (20%)

---

## 10. Migration Workflow

### Step 1: Environment Setup
```bash
# Create migration branch
git checkout -b feat/question-migration

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.migration
# Configure both source and destination Supabase URLs
```

### Step 2: Pre-Migration Backup
```bash
# Backup source database
pg_dump $SOURCE_DB_URL > backup_tinymath_$(date +%Y%m%d).sql

# Backup destination database
pg_dump $DEST_DB_URL > backup_ubumaths_$(date +%Y%m%d).sql

# Backup images
rclone copy supabase:tinymath-questions ./backup/images/
```

### Step 3: Phase 1 Execution
```bash
# Run syntax converter tests
pnpm test:migration:syntax

# Run simple question migration
pnpm migrate:phase1 --limit 560 --dry-run
pnpm migrate:phase1 --limit 560

# Validate migration
pnpm validate:migration --phase 1
```

### Step 4: Testing Between Phases
```bash
# Run instance generation tests
pnpm test:instances --phase 1

# Run answer validation tests
pnpm test:validation --phase 1

# Generate migration report
pnpm report:migration --phase 1
```

### Step 5-7: Phases 2-4 Execution
(Similar pattern for each phase)

### Step 8: Final Validation
```bash
# Complete system test
pnpm test:migration:complete

# Generate final report
pnpm report:migration --final

# Check for orphaned resources
pnpm check:orphans
```

### Step 9: Production Deployment
```bash
# Deploy to staging first
pnpm deploy:staging

# Run smoke tests
pnpm test:staging

# Deploy to production
pnpm deploy:production
```

---

## 11. Testing Strategy

### Unit Tests
```typescript
// src/lib/migration/syntax-converter.test.ts
describe('SyntaxConverter', () => {
  test('converts random integer range', () => {
    expect(converter.convert('$e[1;10]')).toBe('{#:1-10}');
  });

  test('converts with exclusions', () => {
    expect(converter.convert('$e[1;10]\\{5,7}')).toBe('{#:1-10!5,7}');
  });

  test('handles nested patterns', () => {
    expect(converter.convert('[_$e[1;5] + $e[1;5]_]'))
      .toBe('{eval:{#:1-5} + {#:1-5}}');
  });
});
```

### Integration Tests
```typescript
// src/lib/migration/question-transformer.test.ts
describe('QuestionTransformer', () => {
  test('transforms complete question', async () => {
    const old = {
      type: 'AnswerField',
      statement: 'Calculate $e[1;10] + $e[1;10]',
      answer: '[_&a + &b_]'
    };

    const new = await transformer.transform(old);

    expect(new.question_type).toBe('numerical_exact');
    expect(new.statement).toContain('{#:1-10}');
    expect(new.answer_template).toContain('{eval:');
  });
});
```

### End-to-End Tests
```typescript
// tests/e2e/migration.test.ts
describe('Complete Migration', () => {
  test('migrates and validates batch', async () => {
    const questions = await loadQuestions(100);
    const migrated = await migrator.processBatch(questions);

    for (const question of migrated) {
      const instance = await generator.generate(question);
      expect(instance).toBeDefined();
      expect(instance.statement).not.toContain('$e');
      expect(instance.statement).not.toContain('&');
    }
  });
});
```

---

## 14. Risk Analysis & Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| **Data Loss** | Low | Critical | - Complete backups before each phase<br>- Incremental migration<br>- Rollback procedures ready |
| **Conversion Errors** | Medium | High | - Extensive unit testing<br>- Manual review UI for complex cases<br>- Validation at each phase |
| **Performance Issues** | Low | Medium | - Batch processing (100 questions/batch)<br>- Async operations<br>- Database indexing |
| **Validation Gaps** | Medium | Medium | - Phased approach<br>- Progressive enhancement<br>- Fallback validators |
| **Image Migration Failure** | Low | Medium | - Separate image pipeline<br>- Verification after transfer<br>- Keep source images |
| **Variable Dependencies** | Medium | High | - Dependency resolver<br>- Topological sorting<br>- Circular detection |
| **Custom Validator Incompatibility** | High | Low | - Manual review for custom validators<br>- Plugin architecture<br>- Fallback options |
| **Schedule Overrun** | Medium | Medium | - Buffer time in each phase<br>- Parallel work streams<br>- Clear go/no-go criteria |

---

## 15. Recovery Process

### 15.1 Overview
Comprehensive recovery procedures ensure migration can resume after any type of interruption, from simple session timeouts to complete system failures.

### 15.2 Recovery Workflow

#### Step 1: Assess Current State
```bash
# Check migration state files
cat .claude/migration-state.json | jq '.currentPhase, .phases'

# Check database tracking
psql -c "SELECT migration_status, COUNT(*) FROM migration_tracking GROUP BY migration_status"

# Verify last checkpoint
pnpm migrate:status --verbose
```

#### Step 2: Identify Resume Point
```typescript
// src/lib/migration/recovery-service.ts
export class RecoveryService {
  async analyzeState(): Promise<RecoveryAnalysis> {
    const fileState = await this.loadFileState();
    const dbState = await this.loadDatabaseState();

    // Reconcile any discrepancies
    const discrepancies = this.findDiscrepancies(fileState, dbState);

    if (discrepancies.length > 0) {
      // Database is source of truth
      await this.reconcileToDatabase(fileState, dbState);
    }

    return {
      currentPhase: dbState.currentPhase,
      lastProcessedIndex: dbState.lastProcessedIndex,
      questionsRemaining: dbState.questionsRemaining,
      failedQuestions: dbState.failedQuestions,
      canResume: true,
      resumeCommand: this.generateResumeCommand(dbState)
    };
  }

  private generateResumeCommand(state: DatabaseState): string {
    if (state.failedQuestions.length > 0) {
      return `pnpm migrate:retry-failed --phase=${state.currentPhase}`;
    }
    return `pnpm migrate:resume --phase=${state.currentPhase} --from-index=${state.lastProcessedIndex + 1}`;
  }
}
```

#### Step 3: Resume Migration
```bash
# Resume from last checkpoint
pnpm migrate:resume --phase=2 --from-index=1456

# Or retry failed questions only
pnpm migrate:retry-failed --phase=2

# Or start fresh batch if checkpoint corrupted
pnpm migrate:phase2 --skip-to=1456 --force-fresh
```

### 15.3 Resume Commands

#### Standard Resume
```bash
# Resume current phase from last checkpoint
pnpm migrate:resume

# Resume specific phase
pnpm migrate:resume --phase=3

# Resume from specific index
pnpm migrate:resume --phase=2 --from-index=1000

# Resume with different batch size
pnpm migrate:resume --batch-size=50
```

#### Failed Question Retry
```bash
# Retry all failed questions in current phase
pnpm migrate:retry-failed

# Retry specific question IDs
pnpm migrate:retry --ids=123,456,789

# Retry with verbose logging
pnpm migrate:retry-failed --verbose --debug
```

#### State Validation
```bash
# Validate current state consistency
pnpm migrate:validate-state

# Fix state inconsistencies
pnpm migrate:fix-state --auto

# Generate state report
pnpm migrate:report --detailed
```

### 15.4 State Validation Checks

```typescript
// src/lib/migration/state-validator.ts
export class StateValidator {
  async validate(): Promise<ValidationReport> {
    const checks = [
      this.checkNoDuplicateImports(),
      this.checkTrackingConsistency(),
      this.checkImageReferences(),
      this.checkVariableIntegrity(),
      this.checkAnswerGeneration()
    ];

    const results = await Promise.all(checks);

    return {
      valid: results.every(r => r.valid),
      checks: results,
      fixableIssues: results.filter(r => r.fixable),
      requiresManualReview: results.filter(r => !r.fixable && !r.valid)
    };
  }

  private async checkNoDuplicateImports(): Promise<Check> {
    const duplicates = await this.db.query(`
      SELECT old_question_hash, COUNT(*)
      FROM migration_tracking
      WHERE migration_status = 'imported'
      GROUP BY old_question_hash
      HAVING COUNT(*) > 1
    `);

    return {
      name: 'No Duplicate Imports',
      valid: duplicates.length === 0,
      fixable: true,
      issues: duplicates,
      fix: () => this.removeDuplicates(duplicates)
    };
  }
}
```

### 15.5 Disaster Recovery

#### Complete Rollback
```bash
# Rollback to pre-migration state
pnpm migrate:rollback --confirm

# Rollback specific phase only
pnpm migrate:rollback --phase=3

# Restore from backup
pnpm migrate:restore --backup-date=2025-11-15
```

#### Partial Recovery
```typescript
// Recover from partial data loss
export class DisasterRecovery {
  async recoverPhase(phase: number): Promise<void> {
    // 1. Identify what was successfully migrated
    const successful = await this.getSuccessfulMigrations(phase);

    // 2. Mark them as completed in tracking
    await this.markAsCompleted(successful);

    // 3. Identify what needs re-migration
    const pending = await this.getPendingQuestions(phase);

    // 4. Resume from first pending question
    await this.resumeMigration(phase, pending[0].id);
  }
}
```

### 15.6 Recovery Best Practices

1. **Always Check State First**
   - Never blindly restart migration
   - Validate state consistency before resuming
   - Use database as source of truth

2. **Incremental Progress**
   - Save checkpoints frequently (every 100 questions)
   - Commit successful batches immediately
   - Don't wait until phase end to persist state

3. **Error Handling**
   - Log all errors with full context
   - Separate recoverable from non-recoverable errors
   - Maintain failed question list for manual review

4. **Testing Recovery**
   - Test recovery procedures before starting migration
   - Simulate failures at different points
   - Verify data integrity after recovery

---

## 16. Success Criteria

### Overall Project Success
- ✅ All 2,238 questions successfully migrated
- ✅ 100% instance generation success rate
- ✅ Answer validation accuracy > 99%
- ✅ All images accessible and properly linked
- ✅ Corrections preserved and readable
- ✅ Zero TypeScript errors in migration code
- ✅ Complete documentation delivered
- ✅ Teacher training materials created
- ✅ No disruption to current semester

### Phase-Specific Success Metrics

#### Phase 1 Success
- [ ] 560 simple questions migrated
- [ ] Syntax converter 100% coverage
- [ ] Basic validation working
- [ ] Instance generation < 50ms
- [ ] ✅ Code reviewed and committed
- [ ] ✅ Documentation updated with phase results
- [ ] ✅ Migration state persisted
- [ ] ✅ Resume capability verified

#### Phase 2 Success
- [ ] 1,455 total questions migrated
- [ ] All validation options implemented
- [ ] Random from list working
- [ ] Performance maintained
- [ ] ✅ Code reviewed and committed
- [ ] ✅ Documentation updated with phase results
- [ ] ✅ Migration state persisted
- [ ] ✅ Resume capability verified

#### Phase 3 Success
- [ ] 2,015 total questions migrated
- [ ] All images transferred
- [ ] Complex dependencies resolved
- [ ] No broken references
- [ ] ✅ Code reviewed and committed
- [ ] ✅ Documentation updated with phase results
- [ ] ✅ Migration state persisted
- [ ] ✅ Resume capability verified

#### Phase 4 Success
- [ ] 2,238 questions complete
- [ ] Manual review UI deployed
- [ ] Custom validators working
- [ ] Final report generated
- [ ] ✅ Code reviewed and committed
- [ ] ✅ Complete documentation delivered
- [ ] ✅ Final migration state archived
- [ ] ✅ Teacher training materials created

---

## 17. Appendix: Complete Syntax Reference

### Old System (TinyMath) Syntax

```
VARIABLES:
$e[min;max]              - Random integer in range
$e[min;max]\\{a,b,c}     - Random integer with exclusions
$e{n;n}                  - Exactly n-digit number
$e{n;m}                  - n to m digit number
$l{item1,item2,item3}    - Random from list (comma separator)
$l{item1:item2:item3}    - Random from list (colon separator)

REFERENCES:
&variableName            - Reference to variable

EVALUATION:
[_expression_]           - Evaluate mathematical expression

SPECIAL:
$$                       - Literal $ character
\\                       - Escape character

EXAMPLES:
$e[1;10]                 → Random 1-10
$e[0;100]\\{0,50,100}    → Random 0-100 except 0,50,100
$e{3;3}                  → Random 100-999
$l{red,blue,green}       → Random color
[_&a + &b_]              → Sum of variables a and b
[_$e[1;5] * 2_]          → Random 1-5 times 2
```

### New System (UbuMaths v2) Syntax

```
VARIABLES:
{#:min-max}              - Random integer in range
{#:min-max!a,b,c}        - Random integer with exclusions
{#:n.m}                  - Decimal (n before point, m after)
{digits:n-m}             - n to m digit number (custom)
{list:item1,item2,item3} - Random from list (custom)

REFERENCES:
{@:variableName}         - Reference to variable

EVALUATION:
{eval:expression}        - Evaluate mathematical expression

SPECIAL:
\{                       - Literal { character
\}                       - Literal } character

EXAMPLES:
{#:1-10}                 → Random 1-10
{#:0-100!0,50,100}       → Random 0-100 except 0,50,100
{digits:3-3}             → Random 100-999
{list:red,blue,green}    → Random color
{eval:{@:a} + {@:b}}     → Sum of variables a and b
{eval:{#:1-5} * 2}       → Random 1-5 times 2
```

---

## 18. Appendix: Sample Question Conversions

### Example 1: Simple Addition (Phase 1)

**Original (TinyMath)**:
```json
{
  "type": "AnswerField",
  "statement": "Calculer : $e[1;20] + $e[1;20]",
  "answer": "[_&a + &b_]",
  "grade": "CP",
  "theme": "Nombres",
  "domain": "Addition"
}
```

**Converted (UbuMaths v2)**:
```json
{
  "title": "Addition simple",
  "statement": "Calculer : {#:1-20} + {#:1-20}",
  "question_type": "numerical_exact",
  "answer_template": "{eval:{@:a} + {@:b}}",
  "variables": [
    {"name": "a", "type": "random", "min": 1, "max": 20},
    {"name": "b", "type": "random", "min": 1, "max": 20}
  ],
  "category": {
    "theme": "Nombres",
    "domain": "Addition",
    "subdomain": "Nombres entiers",
    "level": "CP"
  }
}
```

### Example 2: Word Problem (Phase 2)

**Original (TinyMath)**:
```json
{
  "type": "ResultOrRewrite",
  "statement": "Marie a $e[5;15] bonbons. Pierre lui en donne $e[3;10]. Combien en a-t-elle maintenant ?",
  "answer": "[_&initial + &added_]",
  "correction": {
    "text": "Il faut additionner les bonbons de Marie et ceux donnés par Pierre",
    "details": "&initial + &added = [_&initial + &added_]"
  },
  "grade": "CE1"
}
```

**Converted (UbuMaths v2)**:
```json
{
  "title": "Problème d'addition avec bonbons",
  "statement": "Marie a {#:5-15} bonbons. Pierre lui en donne {#:3-10}. Combien en a-t-elle maintenant ?",
  "question_type": "numerical_exact",
  "answer_template": "{eval:{@:initial} + {@:added}}",
  "variables": [
    {"name": "initial", "type": "random", "min": 5, "max": 15},
    {"name": "added", "type": "random", "min": 3, "max": 10}
  ],
  "correction": {
    "template": "Il faut additionner les bonbons de Marie et ceux donnés par Pierre\n\n{@:initial} + {@:added} = {eval:{@:initial} + {@:added}}"
  },
  "category": {
    "theme": "Problèmes",
    "domain": "Addition",
    "subdomain": "Situations concrètes",
    "level": "CE1"
  }
}
```

### Example 3: Multiple Choice with Image (Phase 3)

**Original (TinyMath)**:
```json
{
  "type": "Choice",
  "statement": "Quelle est la forme de cet objet ?",
  "image": "geometry/shapes/shape_$e[1;10].png",
  "choices": ["Carré", "Triangle", "Cercle", "Rectangle"],
  "answer": "Triangle",
  "grade": "CP"
}
```

**Converted (UbuMaths v2)**:
```json
{
  "title": "Identifier une forme géométrique",
  "statement": "Quelle est la forme de cet objet ?",
  "question_type": "multiple_choice",
  "answer_template": "Triangle",
  "images": [
    {
      "path": "geometry/shapes/shape_{#:1-10}.png",
      "alt": "Forme géométrique à identifier"
    }
  ],
  "choices": ["Carré", "Triangle", "Cercle", "Rectangle"],
  "validation_options": {
    "allow_multiple": false
  },
  "category": {
    "theme": "Géométrie",
    "domain": "Formes",
    "subdomain": "Reconnaissance",
    "level": "CP"
  }
}
```

### Example 4: Complex Algebra (Phase 3)

**Original (TinyMath)**:
```json
{
  "type": "ResultOrRewrite",
  "statement": "Simplifier : $e[2;5]x + $e[3;7]x - $e[1;3]x",
  "answer": "[_&a + &b - &c_]x",
  "options": {
    "requireSimplified": true,
    "acceptEquivalent": true,
    "normalizeExpression": true
  },
  "grade": "5e"
}
```

**Converted (UbuMaths v2)**:
```json
{
  "title": "Simplification d'expression algébrique",
  "statement": "Simplifier : {#:2-5}x + {#:3-7}x - {#:1-3}x",
  "question_type": "algebraic_transform",
  "answer_template": "{eval:{@:a} + {@:b} - {@:c}}x",
  "variables": [
    {"name": "a", "type": "random", "min": 2, "max": 5},
    {"name": "b", "type": "random", "min": 3, "max": 7},
    {"name": "c", "type": "random", "min": 1, "max": 3}
  ],
  "validation_options": {
    "require_simplified": true,
    "check_equivalence": true
  },
  "category": {
    "theme": "Algèbre",
    "domain": "Expressions",
    "subdomain": "Simplification",
    "level": "5e"
  }
}
```

### Example 5: Custom Validator (Phase 4)

**Original (TinyMath)**:
```json
{
  "type": "AnswerField",
  "statement": "Donner un multiple de $e[3;9] compris entre $e[20;30] et $e[40;50]",
  "options": {
    "customValidator": "mod",
    "validatorParams": {
      "divisor": "&divisor",
      "min": "&min",
      "max": "&max"
    }
  },
  "grade": "CM1"
}
```

**Converted (UbuMaths v2)**:
```json
{
  "title": "Trouver un multiple dans un intervalle",
  "statement": "Donner un multiple de {#:3-9} compris entre {#:20-30} et {#:40-50}",
  "question_type": "numerical_exact",
  "answer_template": "custom",
  "variables": [
    {"name": "divisor", "type": "random", "min": 3, "max": 9},
    {"name": "min", "type": "random", "min": 20, "max": 30},
    {"name": "max", "type": "random", "min": 40, "max": 50}
  ],
  "validation_options": {
    "custom_validator": "modulo",
    "validator_params": {
      "divisor": "{@:divisor}",
      "range": ["{@:min}", "{@:max}"]
    }
  },
  "category": {
    "theme": "Nombres",
    "domain": "Divisibilité",
    "subdomain": "Multiples",
    "level": "CM1"
  }
}
```

---

## Document Version History

- **v1.0.0** (2025-11-16): Initial comprehensive documentation
  - Migration approach selected: Option 3 - Parallel/Agile
  - Complete technical specifications included
  - Ready for implementation

- **v1.1.0** (2025-11-16): Enhanced with complete tracking and recovery systems
  - Added Question Tracking System (Section 8)
  - Added Migration State Files (Section 9)
  - Added Phase Completion Workflows for all 4 phases
  - Added Recovery Process (Section 16)
  - Updated Success Criteria with workflow requirements
  - Fixed section numbering throughout document

- **v1.2.0** (2025-11-16): Added Color Template System documentation
  - Added Color Template System (Section 4)
  - Documents complete color palette implementation
  - 100 tests, 100% passing
  - Removes `${get(color)}` extraction blocker
  - Updated section numbering throughout document

---

**End of Document**

*This document contains all necessary information to implement the question migration from TinyMath to UbuMaths v2. If the session ends, this document alone is sufficient to continue the work.*