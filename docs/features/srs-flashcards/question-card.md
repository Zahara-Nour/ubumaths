# QuestionCard Component - Documentation

## Overview

**QuestionCard** is a simplified question display component designed for test scenarios where visual feedback on answer correctness should not be shown immediately. It's a streamlined alternative to FlashCard without the flip mechanism and validation feedback.

**Location**: `src/lib/components/questions/QuestionCard.svelte`

---

## Key Differences from FlashCard

| Feature                | FlashCard                                                                                | QuestionCard                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Flip mechanism**     | ✅ Yes (front/back with 3D animation)                                                    | ❌ No (single-sided card)                                                             |
| **Visual feedback**    | ✅ Green/red borders, ✓/✗ icons                                                          | ❌ None (silent validation)                                                           |
| **Correction display** | ✅ Shows on backside after flip                                                          | ❌ No built-in correction                                                             |
| **Props**              | `maxAttempts`, `showCorrectionOnWrong`, `showValidationFeedback`, `onFlip`, `onComplete` | Only essential: `interactive`, `instance`, `onAnswerSubmit`, `onAnswerChange`, `size` |
| **Use case**           | Study/review with immediate feedback                                                     | Tests/exams where feedback is delayed                                                 |
| **Complexity**         | ~750 lines (flip logic, ResizeObserver, feedback)                                        | ~340 lines (simplified)                                                               |

---

## Features

### ✅ Two Operation Modes

**Read-only Mode (`interactive={false}`):**

- Display question statement only
- No answer input
- No submit button
- Perfect for review/correction display

**Interactive Mode (`interactive={true}`):**

- Question statement + answer input
- Submit button (disappears after submission)
- Silent validation (no visual feedback)
- Input disabled after submission
- Statistics tracked (time, attempts)
- Results emitted via `onAnswerSubmit` callback

### ✅ Type-Specific Answer Inputs

Reuses all input components from FlashCard:

| Question Type         | Input Component     | Features                                  |
| --------------------- | ------------------- | ----------------------------------------- |
| `numerical_exact`     | NumericalInput      | MathField for numbers                     |
| `numerical_decimal`   | NumericalInput      | Precision validation                      |
| `numerical_rounded`   | NumericalInput      | Rounding validation                       |
| `algebraic_transform` | AlgebraicInput      | MathField with equivalence checking       |
| `fill_in_blanks`      | FillBlanksInput     | Inline MathFields at blank positions      |
| `multiple_choice`     | MultipleChoiceInput | Buttons/images, single/multiple selection |
| `ordering`            | Placeholder         | Not yet implemented                       |

### ✅ Silent Validation

- Validates answer internally using `validateAnswer()` utility
- Determines `isCorrect` boolean
- Emits result via `onAnswerSubmit` callback
- **No visual feedback** displayed to user
- Parent component decides what to do with the result

### ✅ Statistics Tracking

Automatically tracks:

- **Time spent** (seconds from mount to submission)
- **Attempts count** (always 1 in current implementation)
- **Submission timestamp** (ISO 8601 format)

Emitted via `AnswerData` object:

```typescript
interface AnswerData {
	value: string | string[] | number | number[];
	isCorrect: boolean;
	timeSpent: number;
	attempts: number;
	submittedAt: string;
}
```

---

## Component Props

```typescript
interface QuestionCardProps {
	// Required
	instance: QuestionInstance;

	// Optional
	interactive?: boolean; // Default: false (read-only)
	onAnswerSubmit?: (answer: AnswerData) => void;
	onAnswerChange?: (value: string | string[]) => void;
	size?: 'sm' | 'md' | 'lg'; // Default: 'md'
}
```

### Prop Details

**`instance`** (required)

- Pre-generated question instance from `generateInstance()`
- Contains statement, answer, correction, and type-specific data

**`interactive`** (optional, default: `false`)

- `false`: Display question only (no input)
- `true`: Display question + input + submit button

**`onAnswerSubmit`** (optional)

- Called when user submits answer (interactive mode only)
- Receives `AnswerData` with validation result
- Parent component should handle this to track answers

**`onAnswerChange`** (optional)

- Called in real-time as user types/selects answer
- Receives current answer value
- Useful for auto-save or live validation

**`size`** (optional, default: `'md'`)

- `'sm'`: max-width 448px (28rem)
- `'md'`: max-width 672px (42rem)
- `'lg'`: max-width 896px (56rem)

---

## Usage Examples

### Example 1: Read-only Mode (Display Only)

```svelte
<script>
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import { generateInstance } from '$lib/questions/generator/instance-generator';

	const template = {
		/* QuestionTemplate */
	};
	const instance = generateInstance(template, 12345).instance;
</script>

<QuestionCard interactive={false} {instance} />
```

### Example 2: Interactive Mode (Test Scenario)

```svelte
<script>
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import type { AnswerData } from '$lib/types/question-display';

	let userAnswers = new Map<number, AnswerData>();
	let currentIndex = 0;

	function handleAnswerSubmit(answer: AnswerData) {
		// Store answer silently (no feedback to user)
		userAnswers.set(currentIndex, answer);

		// Advance to next question
		currentIndex++;
	}
</script>

<QuestionCard
	interactive={true}
	instance={questions[currentIndex]}
	onAnswerSubmit={handleAnswerSubmit}
	size="lg"
/>
```

### Example 3: With Real-time Change Tracking

```svelte
<script>
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';

	let currentAnswer = '';

	function handleAnswerChange(value: string | string[]) {
		currentAnswer = String(value);
		console.log('User is typing:', currentAnswer);

		// Could trigger auto-save here
		saveToLocalStorage(currentAnswer);
	}

	function handleAnswerSubmit(answer: AnswerData) {
		console.log('Final answer submitted:', answer);
		if (answer.isCorrect) {
			console.log('✓ Correct!');
		} else {
			console.log('✗ Incorrect');
		}
	}
</script>

<QuestionCard
	interactive={true}
	{instance}
	onAnswerChange={handleAnswerChange}
	onAnswerSubmit={handleAnswerSubmit}
/>
```

---

## Integration with Test System

QuestionCard is used in all three test modes:

### TestInteractive.svelte (Quiz Mode)

```svelte
<QuestionCard
	interactive={true}
	instance={currentInstance}
	onAnswerSubmit={handleAnswerSubmit}
	size="lg"
/>
```

- One question at a time
- User answers, validation happens silently
- Answer stored for later review
- Auto-advance to next question

### TestCourse.svelte (Course aux nombres)

```svelte
<QuestionCard
	interactive={true}
	{instance}
	onAnswerSubmit={(answerData) => handleAnswerSubmit(index, answerData)}
	size="sm"
/>
```

- All questions displayed in grid
- User can answer in any order
- Each submission stored with question index
- Results shown at end

### TestDisplay.svelte (Revision Mode)

```svelte
<!-- Display mode: show questions -->
<QuestionCard interactive={false} instance={currentInstance} size="lg" />

<!-- Review all mode: list all questions -->
{#each session.instances as instance, index}
	<QuestionCard interactive={false} {instance} size="md" />
{/each}

<!-- Corrections mode: questions + answers + explanations -->
{#each session.instances as instance, index}
	<QuestionCard interactive={false} {instance} size="md" />
	<!-- Separate cards for answer and correction -->
{/each}
```

- No interaction, display only
- Used for slideshow, review, and corrections
- Combined with separate answer/correction display

---

## Architecture

### State Management

```typescript
// Answer state
let userAnswer = $state<string | string[] | number | number[]>('');
let isSubmitted = $state(false);
let isSubmitting = $state(false);

// Statistics tracking
let startTime = $state<number | null>(null);
let attempts = $state(0);

// Type-specific state
let selectedChoices = $state<number[]>([]);
let fillBlankValues = $state<string[]>([]);
```

### Validation Flow

```
1. User fills input
   ↓
2. hasValidInput() checks if answer is complete
   ↓
3. User clicks "Valider" button
   ↓
4. handleSubmit() validates answer using validateAnswer()
   ↓
5. Create AnswerData object with isCorrect + stats
   ↓
6. Emit via onAnswerSubmit callback
   ↓
7. Disable input, hide submit button
   ↓
8. NO visual feedback shown
```

### Helper Functions

**`hasValidInput(): boolean`**

- Checks if user has entered a valid answer (not empty)
- Returns `true` if answer can be submitted

**`getTimeSpent(): number`**

- Calculates seconds elapsed since component mount
- Used for statistics tracking

**`prepareAnswerValue()`**

- Formats answer based on question type
- Returns proper type for validation

---

## Styling

### CSS Classes

```css
.question-card-wrapper {
	font-size: calc(1rem * var(--font-scale, 1));
}

.statement-section,
.answer-section {
	animation: fadeIn 0.3s ease-in-out;
}
```

### Theme Support

- Uses Shadcn semantic color variables
- Supports light and dark mode automatically
- Respects `--font-scale` CSS variable for accessibility

---

## Comparison with Original Implementation

### What was removed from FlashCard

**Flip Mechanism:**

```diff
- let isFlipped = $state(false);
- let frontHeight = $state(0);
- let backHeight = $state(0);
- let maxViewportHeight = $state(0);
- let frontElement: HTMLElement | null = null;
- let backElement: HTMLElement | null = null;
-
- $effect(() => {
-   const observer = new ResizeObserver(...);
-   // Height measurement logic
- });
```

**Visual Feedback:**

```diff
- {#if isSubmitted && showValidationFeedback}
-   <div class={cn(
-     'border-2 p-4',
-     isCorrect
-       ? 'border-green-600 bg-green-100'
-       : 'border-red-600 bg-red-100'
-   )}>
-     {#if isCorrect}
-       <Check class="h-6 w-6" />
-     {:else}
-       <X class="h-6 w-6" />
-     {/if}
-     <p>{validationMessage}</p>
-   </div>
- {/if}
```

**Backside/Correction:**

```diff
- <div class="flip-face flip-back">
-   <Card.Root>
-     <!-- User answer comparison -->
-     <!-- Correct answer display -->
-     <!-- Detailed correction -->
-   </Card.Root>
- </div>
```

**Props:**

```diff
- maxAttempts?: number;
- showCorrectionOnWrong?: boolean;
- showValidationFeedback?: boolean;
- onFlip?: (isFlipped: boolean) => void;
- onComplete?: (stats: QuestionStats) => void;
```

### What was kept

- ✅ All input components (NumericalInput, AlgebraicInput, etc.)
- ✅ Validation logic (`validateAnswer()`)
- ✅ Statistics tracking (time, attempts)
- ✅ Type-specific state management
- ✅ MathDisplay for statement rendering
- ✅ Callbacks (`onAnswerSubmit`, `onAnswerChange`)
- ✅ Size variants (`sm`, `md`, `lg`)
- ✅ Theme support and accessibility

---

## Performance

**Optimizations:**

- No ResizeObserver (simpler rendering)
- No 3D transforms (lighter DOM)
- No backside rendering (half the markup)
- Minimal re-renders with Svelte 5 runes

**Bundle Size:**

- QuestionCard: ~340 lines (~45% smaller than FlashCard)
- Shares input components (no duplication)

---

## Accessibility

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter)
- ✅ Screen reader support for math content
- ✅ Font scaling support (`--font-scale`)
- ✅ High contrast mode compatible

---

## Testing

### Manual Testing Checklist

- [ ] Read-only mode shows question only
- [ ] Interactive mode shows input + submit button
- [ ] Submit button activates when answer is complete
- [ ] Validation happens silently (no visual feedback)
- [ ] Input disables after submission
- [ ] Submit button disappears after submission
- [ ] `onAnswerSubmit` emits correct data
- [ ] Time tracking works correctly
- [ ] All question types work (numerical, algebraic, QCM, etc.)
- [ ] Size variants render correctly
- [ ] Theme switching works (light/dark)

### Where to Test

1. **TestInteractive**: `/automaths/test?mode=interactive`
   - Select questions in panier
   - Choose "Quiz" mode
   - Verify questions display correctly
   - Verify answers submit without visual feedback

2. **TestCourse**: `/automaths/test?mode=course`
   - Select questions in panier
   - Choose "Course aux nombres" mode
   - Verify grid layout works
   - Verify multiple questions can be answered

3. **TestDisplay**: `/automaths/test?mode=display`
   - Select questions in panier
   - Choose "Révision" mode
   - Verify slideshow displays questions
   - Verify "Revoir tout" and "Corrections" modes work

---

## Troubleshooting

### Issue: Input not showing

**Cause**: `interactive` prop is `false`

**Solution**: Set `interactive={true}`

```diff
- <QuestionCard {instance} />
+ <QuestionCard interactive={true} {instance} />
```

### Issue: Submit button not activating

**Cause**: Answer is empty or invalid

**Solution**: Check `hasValidInput()` logic for your question type

```typescript
// For debugging:
console.log('User answer:', userAnswer);
console.log('Has valid input:', hasValidInput());
```

### Issue: Validation result not received

**Cause**: `onAnswerSubmit` callback not provided

**Solution**: Add callback to handle submission

```diff
- <QuestionCard interactive={true} {instance} />
+ <QuestionCard
+   interactive={true}
+   {instance}
+   onAnswerSubmit={(answer) => console.log('Answer:', answer)}
+ />
```

---

## Future Enhancements

Potential improvements:

1. **Multiple attempts support**
   - Add `maxAttempts` prop back (currently always 1 attempt)
   - Track attempt history

2. **Partial feedback modes**
   - `feedbackMode: 'none' | 'basic' | 'full'`
   - Allow some visual feedback without full correction

3. **Hint system**
   - Progressive hints with penalty
   - Configurable via props

4. **Answer review mode**
   - Show user's answer after submission (without correction)
   - Useful for self-assessment

---

## Related Documentation

- **FlashCard Component**: `FLASHCARD_COMPONENT.md`
- **Test Feature**: `TEST_FEATURE_DOCUMENTATION.md`
- **Question Bank System**: `CLAUDE_FEATURES_QUESTION_BANK.md`
- **Answer Validation**: `src/lib/utils/answer-validator.ts`

---

**Created**: 2025-10-21
**Version**: 1.0.0
**Status**: ✅ Production Ready
**Component Path**: `src/lib/components/questions/QuestionCard.svelte`
