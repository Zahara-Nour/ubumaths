# Question Bank System - UI Testing Guide

Complete guide for testing the Question Bank System UI components.

## Table of Contents

1. [Admin Interface Testing](#admin-interface-testing)
2. [QuestionDisplay Component Testing](#questiondisplay-component-testing)
3. [Preview Demo Page Testing](#preview-demo-page-testing)
4. [Test Scenarios by Question Type](#test-scenarios-by-question-type)
5. [End-to-End Testing Workflow](#end-to-end-testing-workflow)

---

## Admin Interface Testing

### Questions List Page

**URL:** `/dashboard/admin/questions`

#### Features to Test:

1. **List Display**
   - ✅ All templates display with correct type labels
   - ✅ Pagination works (< 10 items per page)
   - ✅ Search filters templates by statement content
   - ✅ Type filter works (dropdown)
   - ✅ Grade filter works

2. **Actions**
   - ✅ **Preview** (👁️ Eye icon) - Opens preview demo page
   - ✅ **Edit** (✏️ Pencil icon) - Opens edit page
   - ✅ **Duplicate** (📋 Copy icon) - Creates duplicate template
   - ✅ **Delete** (🗑️ Trash icon) - Shows confirmation dialog

3. **Create Button**
   - ✅ "Créer une question" button navigates to create page

#### Manual Test Steps:

```bash
1. Navigate to http://localhost:5174/dashboard/admin/questions
2. Verify templates display in table
3. Click Preview (eye icon) on first template
4. Verify navigation to /dashboard/admin/questions/[id]/preview
5. Click Back, then click Edit (pencil icon)
6. Verify navigation to /dashboard/admin/questions/[id]/edit
7. Click Back, then click Duplicate (copy icon)
8. Verify success toast appears
9. Verify new template appears in list
10. Click Delete (trash icon)
11. Confirm deletion in modal
12. Verify template removed from list
```

---

## QuestionDisplay Component Testing

### Component Location

**File:** `src/lib/components/questions/QuestionDisplay.svelte`

### Props Interface

```typescript
interface Props {
	instance: QuestionInstance;
	onSubmit?: (answer: any) => Promise<{ correct: boolean; feedback?: string }>;
	showCorrection?: boolean;
	readonly?: boolean;
	timer?: number;
}
```

### Features to Test

#### 1. Visual Display

- ✅ Statement renders with LaTeX (if applicable)
- ✅ Question type badge displays correctly
- ✅ Grade level badges display
- ✅ Timer displays and counts down (if enabled)
- ✅ Card layout is responsive

#### 2. Input Controls by Type

**Numerical Questions:**

- ✅ Text input accepts numbers
- ✅ Precision hint displays correctly
- ✅ Placeholder shows example format

**Algebraic Questions:**

- ✅ Textarea accepts algebraic expressions
- ✅ Monospace font for better readability
- ✅ Transform type displays

**Fill-in-Blanks:**

- ✅ Multiple numbered inputs render
- ✅ Each input has correct label
- ✅ Inputs bind to array correctly

**QCM Single Answer:**

- ✅ Radio buttons render for each choice
- ✅ Choices display with letter badges (A, B, C, D)
- ✅ Only one choice selectable
- ✅ Hover effects work

**QCM Multiple Answers:**

- ✅ Checkboxes render for each choice
- ✅ Multiple choices selectable
- ✅ Instructional text displays
- ✅ Selection state updates correctly

#### 3. Submit Button

- ✅ Disabled when answer is empty
- ✅ Shows loading state during submission
- ✅ Calls onSubmit handler with answer
- ✅ Updates to feedback state after submission

#### 4. Feedback Display

- ✅ **Correct:**
  - Green border and background
  - Check icon displays
  - Success message shows
  - Custom feedback (if provided)

- ✅ **Incorrect:**
  - Red border and background
  - X icon displays
  - Error message shows
  - Correction displays (if `showCorrection={true}`)

#### 5. Timer Functionality

- ✅ Timer counts down from initial value
- ✅ Time displays in MM:SS format
- ✅ Timer turns red when < 30 seconds
- ✅ Auto-submits when timer reaches 0
- ✅ Timer stops after submission
- ✅ Timer cleanup on component unmount

#### 6. Readonly Mode

- ✅ Input controls hidden
- ✅ Correct answer displays in gray box
- ✅ No submit button
- ✅ "Réponse attendue" label displays

---

## Preview Demo Page Testing

### URL Structure

**Pattern:** `/dashboard/admin/questions/[id]/preview`

**Example:** `http://localhost:5174/dashboard/admin/questions/abc123/preview`

### Features to Test

#### 1. Generation Controls

**Seed Input:**

- ✅ Optional number input
- ✅ Same seed produces same instance
- ✅ Empty seed generates random instance
- ✅ "Générer" button fetches new instance

**Regenerate Button:**

- ✅ Generates random seed automatically
- ✅ Updates seed input field
- ✅ Creates new instance

#### 2. Display Options

**Show Correction Toggle:**

- ✅ When ON: Correction displays on wrong answer
- ✅ When OFF: No correction shown

**Readonly Mode Toggle:**

- ✅ When ON: QuestionDisplay shows answer without inputs
- ✅ When OFF: Normal interactive mode

**Timer Toggle:**

- ✅ When ON: Shows timer seconds input
- ✅ When OFF: Hides timer input
- ✅ Timer seconds input respects min (10) and max (600)

#### 3. Debug Info Card

- ✅ Question type displays
- ✅ Expected answer displays (truncated if long)
- ✅ Resolved variables display (if any)
- ✅ All values in monospace font

#### 4. Loading States

- ✅ Spinner shows during generation
- ✅ "Génération de l'instance..." message
- ✅ Controls disabled during loading

#### 5. Error Handling

- ✅ Toast error on generation failure
- ✅ Empty state when no instance
- ✅ Helpful error messages

---

## Test Scenarios by Question Type

### 1. Numerical Exact

**Template Example:**

```json
{
	"type": "numerical_exact",
	"statement": [{ "type": "text", "content": "Calculate {@:a} + {@:b}" }],
	"variables": [
		{ "name": "a", "expression": "{#:1-10}" },
		{ "name": "b", "expression": "{#:1-10}" }
	],
	"answer": "{eval:{@:a} + {@:b}}",
	"precision": { "type": "none" },
	"grades": ["6"]
}
```

**Test Steps:**

1. Create template via `/dashboard/admin/questions/create`
2. Click Preview on template
3. Verify numbers are different each time (random variables)
4. Enter correct answer (sum of displayed numbers)
5. Submit and verify green success feedback
6. Regenerate with same seed twice
7. Verify same numbers appear both times

### 2. Numerical Decimal

**Template Example:**

```json
{
	"type": "numerical_decimal",
	"statement": [{ "type": "text", "content": "Round {@:x} to 2 decimal places" }],
	"variables": [{ "name": "x", "expression": "{#:1.0-10.0}" }],
	"answer": "{eval:round({@:x}, 2)}",
	"precision": { "type": "decimal", "digits": 2 },
	"grades": ["5"]
}
```

**Test Steps:**

1. Verify precision hint displays "Précision: 2 décimales"
2. Enter answer with wrong decimal places
3. Verify validation (mock)
4. Enter correct answer
5. Verify success

### 3. Algebraic Transform

**Template Example:**

```json
{
	"type": "algebraic_transform",
	"statement": [{ "type": "text", "content": "Factor: {@:a}x² + {@:b}x" }],
	"variables": [
		{ "name": "a", "expression": "{#:1-5}" },
		{ "name": "b", "expression": "{#:1-10}" }
	],
	"answer": "x({@:a}x + {@:b})",
	"transform_type": "factorization",
	"grades": ["4"]
}
```

**Test Steps:**

1. Verify textarea renders (not input)
2. Verify monospace font for math expressions
3. Verify "Type: factorization" displays
4. Enter algebraic expression
5. Submit and check feedback

### 4. Fill in the Blanks

**Template Example:**

```json
{
	"type": "fill_in_blanks",
	"statement": [{ "type": "text", "content": "The square root of 16 is __, and 5² = __" }],
	"answer": ["4", "25"],
	"blanks": 2,
	"grades": ["6"]
}
```

**Test Steps:**

1. Verify 2 numbered inputs render
2. Verify badge labels "1" and "2"
3. Fill in first blank only
4. Verify submit button still disabled
5. Fill in second blank
6. Verify submit button enabled
7. Submit and check validation

### 5. Multiple Choice (Single Answer)

**Template Example:**

```json
{
	"type": "multiple_choice",
	"statement": [{ "type": "text", "content": "Which is the correct answer?" }],
	"choices": [
		{ "content": "Option A", "isCorrect": false },
		{ "content": "Option B", "isCorrect": true },
		{ "content": "Option C", "isCorrect": false },
		{ "content": "Option D", "isCorrect": false }
	],
	"multiple_answers": false,
	"grades": ["3"]
}
```

**Test Steps:**

1. Verify radio buttons render
2. Verify letter badges (A, B, C, D)
3. Verify only one selectable
4. Select wrong answer, submit
5. Verify red feedback
6. If showCorrection=true, verify correct answer revealed
7. Regenerate to test choice shuffling

### 6. Multiple Choice (Multiple Answers)

**Template Example:**

```json
{
	"type": "multiple_choice",
	"statement": [{ "type": "text", "content": "Select all prime numbers:" }],
	"choices": [
		{ "content": "2", "isCorrect": true },
		{ "content": "3", "isCorrect": true },
		{ "content": "4", "isCorrect": false },
		{ "content": "5", "isCorrect": true }
	],
	"multiple_answers": true,
	"grades": ["6"]
}
```

**Test Steps:**

1. Verify checkboxes render
2. Verify instructional text: "Sélectionnez toutes les bonnes réponses"
3. Select only correct answers (2, 3, 5)
4. Submit and verify success
5. Try with only partial correct answers
6. Verify failure feedback
7. Test "select all" then deselect

---

## End-to-End Testing Workflow

### Complete Flow: Create → Preview → Test

#### Step 1: Create Template

```bash
1. Navigate to /dashboard/admin/questions/create
2. Fill Statement tab: "Calculate {@:a} × {@:b}"
3. Fill Variables tab:
   - Variable 1: name="a", expression="{#:2-9}"
   - Variable 2: name="b", expression="{#:2-9}"
4. Fill Answer tab:
   - Type: numerical_exact
   - Answer: "{eval:{@:a} * {@:b}}"
   - Precision: none
5. Fill Preview tab: Generate and verify
6. Save template
```

#### Step 2: Preview from List

```bash
7. Click eye icon on newly created template
8. Verify preview page loads
9. Check debug info shows variables a and b
10. Verify answer matches a × b
```

#### Step 3: Test Interactive Features

```bash
11. Toggle "Afficher la correction" ON
12. Toggle "Activer le timer" ON
13. Set timer to 30 seconds
14. Click "Régénérer"
15. Verify timer starts counting down
16. Wait for timer to reach 28 seconds (turns red)
17. Enter correct answer before timer expires
18. Submit
19. Verify green success feedback
```

#### Step 4: Test Readonly Mode

```bash
20. Toggle "Mode lecture seule" ON
21. Verify input disappears
22. Verify correct answer displays in gray box
23. Toggle back OFF
24. Verify interactive mode returns
```

#### Step 5: Test Seed Reproducibility

```bash
25. Note current seed value in debug info
26. Copy seed number
27. Click "Régénérer" 5 times
28. Paste copied seed into seed input
29. Click "Générer"
30. Verify same instance appears (same a, b, answer)
```

---

## Browser Testing Checklist

Test on multiple browsers:

- ✅ **Chrome/Edge** (Chromium)
- ✅ **Firefox**
- ✅ **Safari** (macOS/iOS)

### Responsive Design Testing

Test on multiple screen sizes:

- ✅ **Desktop** (1920×1080)
- ✅ **Tablet** (768×1024)
- ✅ **Mobile** (375×667)

### Specific Mobile Tests:

1. Timer visibility on small screens
2. Radio button tap targets (minimum 44×44px)
3. Textarea resize on mobile keyboards
4. Feedback cards don't overflow
5. Navigation buttons accessible

---

## Accessibility Testing

### Keyboard Navigation

- ✅ Tab through all interactive elements
- ✅ Enter submits form
- ✅ Space toggles checkboxes/radio buttons
- ✅ Escape closes modals

### Screen Reader Testing

- ✅ Statement reads correctly
- ✅ Input labels announced
- ✅ Button purposes clear
- ✅ Feedback status announced

### Color Contrast

- ✅ Green success passes WCAG AA (4.5:1)
- ✅ Red error passes WCAG AA
- ✅ Timer red warning visible
- ✅ Disabled buttons distinguishable

---

## Performance Testing

### Metrics to Check:

1. **Initial Load Time**
   - Preview page should load in < 1 second
   - Instance generation < 500ms

2. **Interaction Response**
   - Radio button selection instant
   - Submit button click < 100ms to feedback
   - Timer countdown smooth (no jank)

3. **Memory Usage**
   - No memory leaks on repeated regeneration
   - Timer cleanup verified in DevTools

### DevTools Checks:

```bash
1. Open Chrome DevTools → Performance
2. Record while:
   - Clicking regenerate 10 times
   - Toggling all options
   - Submitting multiple answers
3. Check for:
   - Long tasks (> 50ms)
   - Memory heap growth
   - Dropped frames
```

---

## Known Issues & Limitations

### Current Limitations:

1. **Answer Validation**
   - Mock validation only (not server-side)
   - Simple string/number comparison
   - No algebraic equivalence checking

2. **LaTeX Rendering**
   - Requires MathLive integration
   - Currently renders as plain text in some contexts

3. **Timer**
   - Uses setInterval (not perfect accuracy)
   - May drift by ~1 second over long durations
   - Auto-submit on timeout is final (no undo)

### Future Improvements:

- Server-side answer validation endpoint
- Real-time answer feedback (as you type)
- Hint system integration
- Student attempt history
- Assignment integration

---

## Automated Testing (Future)

### Unit Tests (Vitest)

```bash
pnpm test:unit QuestionDisplay
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e questions
```

**Test scenarios to automate:**

- Template CRUD operations
- Instance generation with seeds
- Answer submission flow
- Timer functionality
- Responsive layout

---

## Troubleshooting

### Preview Page Not Loading

**Problem:** Blank page or error

**Solutions:**

1. Check template ID is valid
2. Verify API endpoint returns 200
3. Check browser console for errors
4. Verify instance generation succeeded

### Timer Not Working

**Problem:** Timer doesn't count down

**Solutions:**

1. Check `timer` prop is number > 0
2. Verify `setInterval` not blocked
3. Check console for errors
4. Try disabling browser extensions

### Answer Validation Incorrect

**Problem:** Correct answer marked wrong

**Solutions:**

1. This is expected - mock validation only
2. Check `checkAnswer()` function logic
3. Verify answer type matches expected (string vs number)
4. Real validation requires server-side implementation

### Choices Not Shuffling

**Problem:** Same order every time

**Solutions:**

1. Verify seed is changing on regenerate
2. Check `shuffledChoices` exists in instance
3. Check Fisher-Yates implementation
4. Try different seed values

---

## Testing Checklist Summary

Quick reference checklist for each release:

### Pre-Release Testing

- [ ] All question types render correctly
- [ ] Preview page loads without errors
- [ ] Timer functionality works
- [ ] Submit and feedback work
- [ ] Readonly mode displays answer
- [ ] Seed reproducibility verified
- [ ] Mobile responsive layout
- [ ] Browser compatibility (Chrome, Firefox, Safari)
- [ ] Keyboard navigation works
- [ ] No console errors

### Regression Testing

- [ ] Existing templates still load
- [ ] API endpoints return correct data
- [ ] Edit page still works
- [ ] Duplicate and delete work
- [ ] Search and filters functional

---

## Next Steps

After completing UI testing, proceed to:

1. **Answer Validation Logic** - Implement server-side validation
2. **Assignment System** - Create assignments with question sets
3. **Student Interface** - Student-facing pages for completing assignments
4. **Analytics** - Track student performance and question statistics

---

**Last Updated:** 2025-10-19
**Dev Server:** http://localhost:5174
**Test Account:** Admin user required for `/dashboard/admin/questions`
