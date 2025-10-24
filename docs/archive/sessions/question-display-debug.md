# QuestionDisplay Component Debug Page

Comprehensive debugging interface for the QuestionDisplay component with real-time state inspection and event logging.

## Access

**URL:** `/dashboard/admin/debug/question-display`
**Access Level:** Admin only
**Navigation:** Admin Dashboard → Debug Tools → QuestionDisplay tab

## Overview

The debug page provides:

- ✅ **Live component preview** with configurable props
- ✅ **Real-time event logging** (submissions, changes, flips)
- ✅ **State inspection** (instance data, validation results, statistics)
- ✅ **5 sample questions** covering all question types
- ✅ **One-click JSON copying** for all data structures
- ✅ **Environment information** (browser, ResizeObserver support)

## Features

### 1. Configuration Panel

**Question Type Selector:**

- Numerical (Exact) - Simple fraction division
- Numerical (Decimal) - Division with 2 decimal precision
- Algebraic Transform - Factorization example
- Fill-in-Blanks - Pythagorean theorem
- Multiple Choice (QCM) - Linear equation solving

**Mode Toggle:**

- **Flashcard:** View-only, flip button always active
- **Interactive:** Answer required, validation on submit

**Size Options:**

- Small (`max-w-md`)
- Medium (`max-w-2xl`) - Default
- Large (`max-w-4xl`)

**Behavior Toggles:**

- Auto-flip on wrong answer
- Show confetti on correct answer
- Allow multiple attempts
- Max attempts (0 = unlimited)

**Actions:**

- Reset Logs - Clear all event logs

### 2. Component Preview

Live QuestionDisplay component with all configured props applied. Fully functional and interactive.

### 3. Debug Information Tabs

#### Tab 1: Instance

**Question Instance JSON:**

- Complete `QuestionInstance` object
- Copy to clipboard button
- Syntax-highlighted pre-formatted JSON

**Instance Metadata:**

- Template ID
- Question Type
- Grade Levels
- Answer Type (Array vs String)

#### Tab 2: Submissions

**Answer Submission Log:**

- Chronological list of all submitted answers
- For each submission:
  - Attempt number
  - Timestamp (ISO 8601)
  - Answer value (as JSON)
  - Correct/Incorrect status
  - Time spent (seconds)
  - Attempt count
- Empty state when no submissions yet
- Copy all submissions to clipboard

#### Tab 3: Changes

**Real-time Answer Change Log:**

- Every keystroke/change captured
- Format: `[timestamp] "value"`
- Scrollable pre-formatted output
- Useful for debugging input components
- Empty state when no changes yet

#### Tab 4: Flips

**Flip Event Log:**

- Each flip event with:
  - Flip number
  - Timestamp (ISO 8601)
  - Direction: Front → / Back ↻
- Visual badge indicating current face
- Empty state when no flips yet

#### Tab 5: Statistics

**Completion Statistics:**

- Appears after question completion (correct answer or max attempts)
- Four metric cards:
  - **Time Spent:** Total seconds
  - **Total Attempts:** Number of submissions
  - **Final Result:** Correct ✓ / Incorrect ✗
  - **First Attempt:** Whether first submission was correct
- Full statistics object as JSON
- Copy to clipboard button
- Empty state before completion

### 4. Environment Information

**Browser & Runtime Details:**

- User Agent string
- Viewport dimensions (width×height)
- ResizeObserver support status (✓/✗)
- Current timestamp (ISO 8601)

## Sample Questions

### 1. Numerical (Exact)

```
Calculate: 15/3
Answer: 5
Correction: To divide 15 by 3, we find how many times 3 goes into 15. The answer is 5 because 3 × 5 = 15.
```

### 2. Numerical (Decimal)

```
Calculate with 2 decimals: 22/7
Answer: 3.14
Precision: 2 decimal places
Correction: The division 22 ÷ 7 ≈ 3.142857... Rounded to 2 decimals, the answer is 3.14.
```

### 3. Algebraic Transform

```
Factor: x² - 9
Answer: (x-3)(x+3)
Transform Type: factor
Correction: We recognize a difference of squares: a² - b² = (a-b)(a+b). Here, x² - 9 = x² - 3² = (x-3)(x+3).
```

### 4. Fill-in-Blanks

```
If the sides are 3 and 4, the hypotenuse is ____ according to the ____ theorem.
Answers: ["5", "Pythagore"]
Blanks: 2 positions
Correction: The Pythagorean theorem states that c² = a² + b². So c = √(3² + 4²) = √(9 + 16) = √25 = 5.
```

### 5. Multiple Choice (QCM)

```
Solve: 2x + 5 = 13
Choices:
  A) x = 4 ✓ (correct)
  B) x = 9
  C) x = 6.5
Answer: 0 (index of correct choice)
Correction: We solve: 2x + 5 = 13 ⇒ 2x = 13 - 5 ⇒ 2x = 8 ⇒ x = 4.
```

## Usage Scenarios

### Scenario 1: Testing New Question Types

1. Navigate to `/dashboard/admin/debug/question-display`
2. Select question type from dropdown
3. Set mode to "Interactive"
4. Try submitting various answers
5. Check "Submissions" tab for validation results
6. Verify feedback messages are correct
7. Check "Instance" tab for data structure

### Scenario 2: Debugging Validation Logic

1. Select a question type with complex validation (e.g., Algebraic)
2. Submit various answers (correct, incorrect, edge cases)
3. Monitor "Submissions" tab for `isCorrect` status
4. Copy submission JSON for detailed analysis
5. Check validation messages and feedback

### Scenario 3: Testing Flip Mechanics

1. Select any question
2. Set mode to "Flashcard" (flip always active)
3. Click flip button multiple times
4. Monitor "Flips" tab for event logging
5. Verify flip animation is smooth
6. Check component height remains consistent

### Scenario 4: Performance Testing

1. Open browser DevTools (F12)
2. Monitor "Performance" tab
3. Interact with component (typing, flipping, submitting)
4. Check for layout thrashing or performance issues
5. Verify ResizeObserver is working (Environment Info)
6. Monitor console for errors or warnings

### Scenario 5: Confetti & Visual Feedback

1. Set "Show confetti on correct" to enabled
2. Submit correct answer
3. Verify confetti fires from center
4. Try with "Auto-flip on wrong answer" enabled
5. Submit wrong answer and verify auto-flip works
6. Check timing and animation smoothness

## Debugging Tips

### Component Not Visible

**Check:**

- Environment Info shows ResizeObserver support: Yes ✓
- Browser console for errors
- Viewport dimensions are reasonable (not 0×0)

**Try:**

- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Check different size settings (sm/md/lg)

### Height Not Equalizing

**Check:**

- "Instance" tab → Copy JSON → Verify statement and correction are not empty
- Monitor browser DevTools → Elements → Inspect `.flip-face` elements
- Check both front and back have rendered content

**Try:**

- Switch between questions to trigger re-measurement
- Resize browser window to trigger ResizeObserver

### Validation Always Incorrect

**Check:**

- "Instance" tab → Answer format (String vs Array)
- "Submissions" tab → Compare submitted value with expected answer
- Copy submission JSON and manually compare values

**Try:**

- Different question types to isolate issue
- Check precision settings for numerical questions
- Verify algebraic equivalence (e.g., "x+3" vs "3+x")

### Confetti Not Showing

**Check:**

- "Show confetti on correct" is enabled
- Browser console for `canvas-confetti` errors
- Answer is actually correct (check "Submissions" tab)

**Try:**

- Submit correct answer again
- Check browser blocks canvas rendering
- Disable browser extensions

### Events Not Logging

**Check:**

- Browser console for errors
- Callbacks are firing (add console.log in component)
- Not accidentally clicking "Reset Logs"

**Try:**

- Switch question type to reset state
- Hard refresh page
- Check browser console for JavaScript errors

## JSON Structures

### QuestionInstance (Instance Tab)

```typescript
{
  templateId: string;
  type: 'numerical_exact' | 'numerical_decimal' | 'algebraic_transform' | ...;
  statement: Array<{ type: 'text' | 'image'; content?: string; url?: string; }>;
  answer: string | string[];
  precision?: { type: 'none' | 'decimal' | ...; digits?: number; };
  correction: Array<{ type: 'text' | 'image'; content: string; }>;
  grades: string[];
  // Type-specific fields...
}
```

### AnswerData (Submissions Tab)

```typescript
{
  value: string | string[] | number | number[];
  isCorrect: boolean;
  timeSpent: number; // seconds
  attempts: number;
  submittedAt: string; // ISO 8601
}
```

### QuestionStats (Statistics Tab)

```typescript
{
  templateId: string;
  timeSpent: number; // total seconds
  attempts: number; // total attempts
  isCorrect: boolean; // final result
  firstAttemptCorrect: boolean;
  answeredAt: string; // ISO 8601
  answerHistory: AnswerData[];
}
```

## Browser Compatibility

**Fully Supported:**

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Required Features:**

- ResizeObserver API (auto-height measurement)
- CSS 3D Transforms (flip animation)
- Canvas API (confetti)
- ES2020+ JavaScript (for Svelte 5 runes)

**Fallback Behavior:**

- If ResizeObserver not supported: Component uses auto height (may not equalize perfectly)
- If canvas-confetti fails: No confetti, but functionality intact

## Related Documentation

- [QuestionDisplay Component Documentation](QUESTION_DISPLAY_COMPONENT.md)
- [Question Bank System](CLAUDE.md#question-bank-system)
- [MathLive Integration](https://cortexjs.io/mathlive/)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$state)

## Troubleshooting Checklist

Before reporting issues, verify:

- ✅ ResizeObserver support in Environment Info
- ✅ No JavaScript errors in browser console
- ✅ Dev server running without errors
- ✅ Hard refresh after code changes (Ctrl+Shift+R)
- ✅ Sample questions render correctly
- ✅ Mode toggle works (flashcard ↔ interactive)
- ✅ Size selector changes component width
- ✅ Reset Logs button clears all tabs
- ✅ Copy JSON buttons work
- ✅ Flip animation is smooth (no jank)

If all checks pass but issue persists, capture:

1. Screenshot of component preview
2. JSON from "Instance" tab
3. JSON from "Submissions" tab (if relevant)
4. Browser console errors (if any)
5. User Agent from Environment Info
