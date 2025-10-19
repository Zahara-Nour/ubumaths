# Question Bank System - Quick Start Guide

Fast-track guide to creating and testing questions in the Question Bank System.

## 🚀 Quick Links

- **Questions List:** http://localhost:5174/dashboard/admin/questions
- **Create New:** http://localhost:5174/dashboard/admin/questions/create
- **API Docs:** [QUESTIONS_API_COMPLETE.md](QUESTIONS_API_COMPLETE.md)
- **Testing Guide:** [QUESTIONS_UI_TESTING.md](QUESTIONS_UI_TESTING.md)

---

## 📝 Create Your First Question (5 minutes)

### Step 1: Navigate to Create Page
```
http://localhost:5174/dashboard/admin/questions/create
```

### Step 2: Fill in the Statement Tab
```
Question text: "Calculate {@:a} + {@:b}"
```

- `{@:a}` and `{@:b}` are variable references
- They will be replaced with random numbers

### Step 3: Define Variables
```
Variable 1:
  - Name: a
  - Expression: {#:1-10}

Variable 2:
  - Name: b
  - Expression: {#:1-10}
```

**Syntax:** `{#:min-max}` generates random integer from min to max

### Step 4: Set Answer
```
Type: numerical_exact
Answer: {eval:{@:a} + {@:b}}
Precision: none
Grades: ["6"]
```

**Syntax:** `{eval:expression}` evaluates mathematical expression

### Step 5: Preview & Save
1. Click **Preview** tab
2. Click **Générer** to test
3. Verify different numbers appear
4. Click **Enregistrer**

✅ **Done!** Your first question is created.

---

## 🧪 Test Your Question (2 minutes)

### Method 1: Preview Demo Page

1. Go to questions list: `/dashboard/admin/questions`
2. Find your question
3. Click **👁️ Preview** (eye icon)
4. Test with different settings:
   - Toggle correction ON/OFF
   - Enable timer
   - Try different seeds

### Method 2: Direct Preview

```
http://localhost:5174/dashboard/admin/questions/[your-id]/preview
```

Replace `[your-id]` with your template's ID.

---

## 📚 Common Question Templates

### 1. Simple Addition
```json
{
  "type": "numerical_exact",
  "statement": [{ "type": "text", "content": "{@:a} + {@:b} = ?" }],
  "variables": [
    { "name": "a", "expression": "{#:1-20}" },
    { "name": "b", "expression": "{#:1-20}" }
  ],
  "answer": "{eval:{@:a} + {@:b}}",
  "grades": ["CP", "CE1"]
}
```

### 2. Multiplication Table
```json
{
  "type": "numerical_exact",
  "statement": [{ "type": "text", "content": "{@:a} × {@:b} = ?" }],
  "variables": [
    { "name": "a", "expression": "{#:2-9}" },
    { "name": "b", "expression": "{#:2-9}" }
  ],
  "answer": "{eval:{@:a} * {@:b}}",
  "grades": ["CE2", "CM1"]
}
```

### 3. Division with Remainder
```json
{
  "type": "numerical_exact",
  "statement": [{ "type": "text", "content": "What is the remainder of {@:dividend} ÷ {@:divisor}?" }],
  "variables": [
    { "name": "divisor", "expression": "{#:2-9}" },
    { "name": "dividend", "expression": "{#:10-99}" }
  ],
  "answer": "{eval:{@:dividend} % {@:divisor}}",
  "grades": ["CM1", "CM2"]
}
```

### 4. Decimal Rounding
```json
{
  "type": "numerical_decimal",
  "statement": [{ "type": "text", "content": "Round {@:x} to 2 decimal places" }],
  "variables": [
    { "name": "x", "expression": "{#:1.0-100.0}" }
  ],
  "answer": "{eval:round({@:x}, 2)}",
  "precision": { "type": "decimal", "digits": 2 },
  "grades": ["5", "4"]
}
```

### 5. Algebraic Factorization
```json
{
  "type": "algebraic_transform",
  "statement": [{ "type": "text", "content": "Factor: {@:a}x + {@:a}y" }],
  "variables": [
    { "name": "a", "expression": "{#:2-9}" }
  ],
  "answer": "{@:a}(x + y)",
  "transform_type": "factorization",
  "grades": ["4", "3"]
}
```

### 6. Multiple Choice (Single Answer)
```json
{
  "type": "multiple_choice",
  "statement": [{ "type": "text", "content": "Which is the square root of 16?" }],
  "choices": [
    { "content": "2", "isCorrect": false },
    { "content": "4", "isCorrect": true },
    { "content": "8", "isCorrect": false },
    { "content": "16", "isCorrect": false }
  ],
  "multiple_answers": false,
  "grades": ["6"]
}
```

### 7. Fill in the Blanks
```json
{
  "type": "fill_in_blanks",
  "statement": [{
    "type": "text",
    "content": "The formula for area of a rectangle is: A = __ × __"
  }],
  "answer": ["length", "width"],
  "blanks": 2,
  "grades": ["CM2", "6"]
}
```

---

## 🎯 Variable Expressions Reference

### Random Integers
```
{#:1-10}          → Random integer from 1 to 10
{#:0-100}         → Random integer from 0 to 100
{#:1-10!5}        → Random from 1-10, excluding 5
{#:1-10!3,5,7}    → Random from 1-10, excluding 3, 5, 7
```

### Random Decimals
```
{#:0.0-10.0}      → Random decimal from 0.0 to 10.0
{#:1.5-9.5}       → Random decimal from 1.5 to 9.5
```

### Variable References
```
{@:a}             → Reference variable 'a'
{@:myVar}         → Reference variable 'myVar'
```

### Evaluations
```
{eval:2 + 3}               → 5
{eval:{@:a} * 2}           → Variable 'a' multiplied by 2
{eval:round({@:x}, 2)}     → Round variable 'x' to 2 decimals
{eval:sqrt(16)}            → 4
{eval:{@:a} + {@:b}}       → Sum of variables
```

---

## 🔧 Testing Features

### Seed Testing
**Use same seed → Get same question**

```
Seed: 12345
Generate → Question: "Calculate 7 + 3"

Seed: 12345 (again)
Generate → Question: "Calculate 7 + 3" (same numbers!)
```

### Timer Testing
1. Enable timer: Toggle ON
2. Set seconds: 30
3. Generate question
4. Timer counts down
5. Auto-submits at 0

### Correction Testing
1. Enable correction: Toggle ON
2. Generate question
3. Submit wrong answer
4. Correction appears below feedback

### Readonly Testing
1. Enable readonly: Toggle ON
2. Generate question
3. No input fields shown
4. Correct answer displayed

---

## 🛠️ Troubleshooting

### Problem: Template won't save
**Solution:** Check validation errors in console
- Missing required fields?
- Invalid variable syntax?
- Circular dependencies?

### Problem: Preview shows "Aucune instance générée"
**Solution:** Click "Générer" button to create instance

### Problem: Variables not resolving
**Solution:** Check variable expressions
- Use correct syntax: `{#:min-max}`
- Ensure variables defined before use
- No circular references (a depends on b, b depends on a)

### Problem: Answer always incorrect
**Solution:** This is expected (mock validation)
- Real validation requires server implementation
- See [QUESTIONS_API_COMPLETE.md](QUESTIONS_API_COMPLETE.md)

---

## 📖 Advanced Features

### Dependent Variables
```javascript
variables: [
  { name: "a", expression: "{#:1-10}" },
  { name: "b", expression: "{#:1-10}" },
  { name: "sum", expression: "{eval:{@:a} + {@:b}}" }
]
```

### Complex Expressions
```javascript
{
  name: "hypotenuse",
  expression: "{eval:sqrt({@:a}^2 + {@:b}^2)}"
}
```

### Precision Types
```javascript
// Decimal places
{ type: "decimal", digits: 2 }

// Significant figures
{ type: "significant", digits: 3 }

// Absolute tolerance
{ type: "tolerance", tolerance: 0.01, mode: "absolute" }

// Relative tolerance
{ type: "tolerance", tolerance: 0.05, mode: "relative" }

// No precision
{ type: "none" }
```

---

## 🎓 Best Practices

### ✅ DO:
- Use descriptive variable names (`radius`, `height`, not `x`, `y`)
- Test with multiple seeds before saving
- Add correction text for complex problems
- Use appropriate grade levels
- Preview on mobile before publishing

### ❌ DON'T:
- Create circular variable dependencies
- Use variables before defining them
- Forget to set precision for decimal answers
- Skip the preview step
- Use overly complex expressions

---

## 📊 Question Type Comparison

| Type | Use Case | Input Type | Example |
|------|----------|------------|---------|
| `numerical_exact` | Exact integer answers | Text input | `5 + 3 = ?` |
| `numerical_decimal` | Decimal answers | Text input | `π ≈ ?` |
| `numerical_rounded` | Rounded answers | Text input | `√2 ≈ ?` (2 decimals) |
| `algebraic_transform` | Algebraic expressions | Textarea | `Factor: 2x + 2y` |
| `fill_in_blanks` | Multiple short answers | Multiple inputs | `A = __ × __` |
| `multiple_choice` | Single/multiple choice | Radio/Checkbox | `Which is prime?` |

---

## 🚦 Next Steps

After creating your first question:

1. **Create 5-10 Questions** - Practice different types
2. **Test on Mobile** - Responsive design
3. **Read Full Docs** - [QUESTIONS_API_COMPLETE.md](QUESTIONS_API_COMPLETE.md)
4. **Implement Validation** - Server-side answer checking
5. **Build Assignment System** - Group questions into assignments

---

## 📞 Support

**Dev Server:** http://localhost:5174
**Questions List:** http://localhost:5174/dashboard/admin/questions
**API Endpoint:** http://localhost:5174/api/questions/templates

**Documentation:**
- [Complete API Reference](QUESTIONS_API_COMPLETE.md)
- [Testing Guide](QUESTIONS_UI_TESTING.md)
- [API Testing](QUESTIONS_API_TESTING.md)

---

**Quick Start Version:** 1.0
**Last Updated:** 2025-10-19
**Estimated Time to First Question:** 5 minutes
