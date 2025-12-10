# SRS Integration - Chapter Quiz System

Documentation for how chapter quiz answers integrate with the FSRS (Free Spaced Repetition Scheduler) algorithm to enhance long-term learning.

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Grade Mapping](#grade-mapping)
4. [Data Flow](#data-flow)
5. [Implementation Details](#implementation-details)
6. [Benefits](#benefits)

---

## Overview

### What is SRS Integration?

When students answer chapter quiz questions, the system automatically updates their spaced repetition card statistics if the question exists in their SRS deck. This creates a seamless connection between:

- **Chapter-based learning**: Structured content organized by topic
- **Spaced repetition**: Optimized review scheduling based on memory science

### Key Principle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  CHAPTER QUIZ                           SRS DECK                            │
│  ────────────                           ────────                            │
│                                                                              │
│  ┌─────────────────┐                   ┌─────────────────┐                  │
│  │ Quiz Question   │                   │ Card (same      │                  │
│  │                 │                   │ question_       │                  │
│  │ question_       │───────────────────│ template_id)    │                  │
│  │ template_id     │  Same Question    │                 │                  │
│  └────────┬────────┘                   └────────┬────────┘                  │
│           │                                     │                            │
│           │ Student Answers                     │                            │
│           ▼                                     │                            │
│  ┌─────────────────┐                            │                            │
│  │ quiz_result     │──────────updates───────────▼                            │
│  │                 │                   ┌─────────────────┐                  │
│  │ is_correct:     │                   │ srs_card_stats  │                  │
│  │ true/false      │                   │                 │                  │
│  │                 │                   │ Updated via     │                  │
│  └─────────────────┘                   │ FSRS algorithm  │                  │
│                                        └─────────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Trigger Conditions

SRS card update occurs when ALL of these conditions are met:

1. Student submits a chapter quiz answer
2. The `question_template_id` exists in the student's `srs_card_stats` table
3. The card has a valid state (not suspended)

### Non-Trigger Scenarios

The SRS card is NOT updated when:

- Question is not in student's SRS deck (quiz-only question)
- Card is suspended
- Card belongs to a different student

### Behavior

```
Student answers chapter quiz question
         │
         ▼
┌───────────────────────────┐
│ Check: Does question      │
│ exist in student's SRS?   │
└───────────┬───────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌───────┐       ┌───────┐
│  YES  │       │  NO   │
└───┬───┘       └───┬───┘
    │               │
    │               │
    ▼               ▼
┌───────────┐   ┌───────────┐
│ Update    │   │ Record    │
│ SRS card  │   │ quiz      │
│ + Record  │   │ result    │
│ quiz      │   │ only      │
│ result    │   │           │
└───────────┘   └───────────┘
```

---

## Grade Mapping

### Quiz Answer to FSRS Grade

The system maps boolean quiz results to FSRS grades:

| Quiz Result   | FSRS Grade    | Value | Description            |
| ------------- | ------------- | ----- | ---------------------- |
| **Correct**   | `Grade.GOOD`  | 3     | Remembered with effort |
| **Incorrect** | `Grade.AGAIN` | 1     | Complete blackout      |

### FSRS Grade Scale Reference

| Grade   | Value | Meaning                            |
| ------- | ----- | ---------------------------------- |
| `AGAIN` | 1     | Complete blackout, need to relearn |
| `HARD`  | 2     | Significant difficulty             |
| `GOOD`  | 3     | Correct with effort                |
| `EASY`  | 4     | Perfect, effortless recall         |

### Why GOOD and AGAIN?

The chapter quiz system uses binary correct/incorrect, which maps naturally to:

- **Correct = GOOD**: The student knew the answer, deserving positive reinforcement
- **Incorrect = AGAIN**: The student didn't know it, scheduling immediate review

More nuanced grades (HARD, EASY) would require:

- Confidence indicators
- Response time analysis
- Multiple attempt patterns

These may be added in future versions.

---

## Data Flow

### Complete Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  1. STUDENT SUBMITS QUIZ ANSWER                                             │
│     ────────────────────────────                                            │
│                                                                              │
│     submitQuizAnswer(studentId, quizQuestionId, isCorrect, timeSpent)       │
│                                                                              │
│                           │                                                  │
│                           ▼                                                  │
│                                                                              │
│  2. LOOK UP QUESTION TEMPLATE                                               │
│     ────────────────────────                                                │
│                                                                              │
│     chapter_quiz_questions.question_template_id                             │
│                                                                              │
│                           │                                                  │
│                           ▼                                                  │
│                                                                              │
│  3. CHECK FOR SRS CARD                                                      │
│     ──────────────────────                                                  │
│                                                                              │
│     SELECT * FROM srs_card_stats                                            │
│     WHERE student_id = $1                                                   │
│       AND question_template_id = $2                                         │
│                                                                              │
│                           │                                                  │
│               ┌───────────┴───────────┐                                      │
│               │                       │                                      │
│               ▼                       ▼                                      │
│                                                                              │
│  4a. CARD EXISTS                  4b. NO CARD                               │
│      ───────────                      ───────                               │
│                                                                              │
│      Compute new stats                Skip SRS update                       │
│      via FSRS algorithm                                                     │
│                                                                              │
│               │                       │                                      │
│               ▼                       │                                      │
│                                       │                                      │
│  5a. UPDATE srs_card_stats            │                                      │
│      ─────────────────────            │                                      │
│                                       │                                      │
│      - difficulty                     │                                      │
│      - stability                      │                                      │
│      - state                          │                                      │
│      - reps                           │                                      │
│      - lapses                         │                                      │
│      - due_date                       │                                      │
│      - last_review_at                 │                                      │
│                                       │                                      │
│               │                       │                                      │
│               └───────────┬───────────┘                                      │
│                           │                                                  │
│                           ▼                                                  │
│                                                                              │
│  6. RECORD QUIZ RESULT                                                      │
│     ──────────────────                                                      │
│                                                                              │
│     INSERT INTO chapter_quiz_results (...)                                  │
│                                                                              │
│                           │                                                  │
│                           ▼                                                  │
│                                                                              │
│  7. RETURN RESULT                                                           │
│     ─────────────                                                           │
│                                                                              │
│     { data: ChapterQuizResult, error: null }                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Affected Tables

| Table                  | Operation | Condition                   |
| ---------------------- | --------- | --------------------------- |
| `chapter_quiz_results` | INSERT    | Always                      |
| `srs_card_stats`       | UPDATE    | If card exists for question |

---

## Implementation Details

### Server Function

**Location**: `src/lib/server/chapters.ts`

```typescript
/**
 * Submit a quiz answer. Integrates with SRS if question is in student's deck.
 */
export async function submitQuizAnswer(
	studentId: string,
	quizQuestionId: string,
	isCorrect: boolean,
	timeSpentSeconds: number,
	supabase: SupabaseClient<Database>,
	submittedAnswer: string = ''
): Promise<OperationResult<ChapterQuizResult>> {
	// 1. Get the question template ID
	const { data: quizQuestion } = await supabase
		.from('chapter_quiz_questions')
		.select('question_template_id, points_override')
		.eq('id', quizQuestionId)
		.single();

	if (!quizQuestion) {
		return { data: null, error: new Error('Question not found') };
	}

	// 2. Check for existing SRS card
	const { data: existingCard } = await supabase
		.from('srs_card_stats')
		.select('*')
		.eq('student_id', studentId)
		.eq('question_template_id', quizQuestion.question_template_id)
		.single();

	// 3. Update SRS card if exists
	if (existingCard) {
		const grade = isCorrect ? Grade.GOOD : Grade.AGAIN;
		const newStats = computeNextReview(existingCard, grade);

		await supabase
			.from('srs_card_stats')
			.update({
				difficulty: newStats.difficulty,
				stability: newStats.stability,
				state: newStats.state,
				reps: newStats.reps,
				lapses: newStats.lapses,
				due_date: newStats.dueDate,
				last_review_at: new Date().toISOString()
			})
			.eq('id', existingCard.id);
	}

	// 4. Get attempt number
	const { count } = await supabase
		.from('chapter_quiz_results')
		.select('*', { count: 'exact', head: true })
		.eq('chapter_quiz_question_id', quizQuestionId)
		.eq('student_id', studentId);

	// 5. Insert quiz result
	const { data: result, error } = await supabase
		.from('chapter_quiz_results')
		.insert({
			chapter_quiz_question_id: quizQuestionId,
			student_id: studentId,
			submitted_answer: submittedAnswer,
			is_correct: isCorrect,
			points_earned: isCorrect ? (quizQuestion.points_override ?? 1) : 0,
			time_spent_seconds: timeSpentSeconds,
			attempt_number: (count ?? 0) + 1
		})
		.select()
		.single();

	return { data: result, error };
}
```

### FSRS Integration

The system uses the existing FSRS implementation:

```typescript
import { Grade, computeNextReview } from '$lib/srs/fsrs';

// Grade enum
enum Grade {
	AGAIN = 1,
	HARD = 2,
	GOOD = 3,
	EASY = 4
}

// Compute next review based on current card state and grade
function computeNextReview(card: CardStats, grade: Grade): NewCardStats;
```

---

## Benefits

### For Students

1. **Seamless learning**: Quiz practice automatically reinforces SRS deck
2. **No double work**: Answering in chapter quiz counts as SRS review
3. **Better retention**: Spaced repetition optimizes long-term memory
4. **Unified progress**: See improvement across both systems

### For Teachers

1. **Automatic reinforcement**: Questions practiced in context
2. **Better engagement**: Students benefit from both structured lessons and SRS
3. **Comprehensive data**: Track both chapter progress and SRS stats

### For the System

1. **Single source of truth**: Question templates used everywhere
2. **Consistent behavior**: Same question = same learning effect
3. **Scalable design**: Adding new quiz contexts is straightforward

---

## Future Enhancements

### Potential Improvements

| Enhancement              | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| **Confidence indicator** | Let students rate confidence for HARD/GOOD/EASY mapping |
| **Time-based grading**   | Use response time to infer difficulty                   |
| **Partial credit**       | Map numeric scores to grade range                       |
| **Reverse integration**  | SRS reviews update chapter progress                     |
| **Auto-add to deck**     | Option to add quiz questions to SRS deck                |

### Not Planned

| Feature                          | Reason                                    |
| -------------------------------- | ----------------------------------------- |
| Override SRS scheduling          | Would break the algorithm's effectiveness |
| Separate SRS configs per chapter | Adds complexity without clear benefit     |
| Quiz-specific retention rates    | FSRS handles this automatically           |
