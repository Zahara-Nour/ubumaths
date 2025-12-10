# Exercises System - User Guide

> **Last Updated**: 2025-12-10
>
> **Audience**: Teachers and Students
>
> **Related**: [Index](./index.md) | [Parameterization](./parameterization.md)

---

## Table of Contents

- [Introduction](#introduction)
- [Teacher Guide](#teacher-guide)
  - [Accessing the Exercise Manager](#accessing-the-exercise-manager)
  - [Creating an Exercise](#creating-an-exercise)
  - [Writing Mathematical Content](#writing-mathematical-content)
  - [Creating Parameterized Exercises](#creating-parameterized-exercises)
  - [Managing Exercises](#managing-exercises)
  - [Assigning Exercises](#assigning-exercises)
  - [Tracking Progress](#tracking-progress)
  - [Import and Export](#import-and-export)
- [Student Guide](#student-guide)
  - [Viewing Assigned Exercises](#viewing-assigned-exercises)
  - [Working on an Exercise](#working-on-an-exercise)
  - [Marking Completion](#marking-completion)
- [Tips and Best Practices](#tips-and-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Introduction

The Exercises System in UbuMaths allows teachers to create, manage, and assign mathematical exercises to students. Unlike the Questions system (flashcard-style drills with automated validation), exercises are designed for traditional problem-solving where students work through problems and self-assess their completion.

### Key Features

| Feature                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| **Rich Content**        | Write exercises with Markdown formatting and LaTeX math |
| **Parameterization**    | Create dynamic exercises with random values             |
| **Flexible Assignment** | Assign to individual students, classes, or make public  |
| **Progress Tracking**   | Monitor student views and completion status             |
| **Import/Export**       | Share exercises in JSON or Markdown format              |

### Exercises vs Questions

| Aspect                | Exercises                     | Questions                |
| --------------------- | ----------------------------- | ------------------------ |
| **Purpose**           | Homework, practice worksheets | Interactive drills       |
| **Answer Validation** | Self-assessed                 | Automated checking       |
| **Format**            | Free-form problem solving     | MCQ, fill-in-blank, etc. |

---

## Teacher Guide

### Accessing the Exercise Manager

1. Log in to UbuMaths with your teacher account
2. Navigate to **Dashboard** > **Exercices** in the sidebar
3. You'll see your exercise list with filtering and management options

### Creating an Exercise

#### Step 1: Start a New Exercise

1. Click **"Nouvel exercice"** button in the top right
2. You'll be taken to the exercise creation form

#### Step 2: Fill in Basic Information

| Field          | Required | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| **Titre**      | No       | Display title (e.g., "Equations du premier degre") |
| **Source**     | No       | Reference source (e.g., "Livre de 3eme, p. 42")    |
| **Difficulte** | Yes      | Select 1 (Facile), 2 (Moyen), or 3 (Difficile)     |
| **Theme**      | No       | Topic category (e.g., "Algebre", "Geometrie")      |
| **Tags**       | No       | Keywords for filtering (max 20)                    |
| **Niveaux**    | No       | Target grade levels                                |

#### Step 3: Write the Statement (Enonce)

Write your exercise statement in the **Enonce** field using Markdown:

```markdown
Resoudre l'equation suivante:

$$2x + 5 = 13$$

Donner la valeur de $x$.
```

#### Step 4: Write the Solution

Write the complete solution in the **Solution** field:

```markdown
On resout l'equation:

$$2x + 5 = 13$$
$$2x = 13 - 5$$
$$2x = 8$$
$$x = 4$$

La solution est $x = 4$.
```

#### Step 5: Preview and Save

1. Use the **eye icon** in the editor to toggle live preview
2. Check that math formulas render correctly
3. Click **"Creer l'exercice"** to save

---

### Writing Mathematical Content

The editor supports Markdown with LaTeX math notation.

#### Inline Math

Use single dollar signs for math within text:

```markdown
La formule $a^2 + b^2 = c^2$ est le theoreme de Pythagore.
```

**Result**: La formule $a^2 + b^2 = c^2$ est le theoreme de Pythagore.

#### Block Math

Use double dollar signs for centered equations:

```markdown
$$\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

#### Common Math Symbols

| Symbol        | LaTeX                | Result             |
| ------------- | -------------------- | ------------------ |
| Fraction      | `\frac{a}{b}`        | a/b                |
| Square root   | `\sqrt{x}`           | sqrt(x)            |
| Power         | `x^{n}`              | x^n                |
| Subscript     | `x_{i}`              | x_i                |
| Sum           | `\sum_{i=1}^{n}`     | Sum notation       |
| Integral      | `\int_{a}^{b}`       | Integral notation  |
| Greek letters | `\alpha, \beta, \pi` | Greek letters      |
| Inequality    | `\leq, \geq, \neq`   | Comparison symbols |

#### Editor Toolbar

The toolbar provides quick insertion buttons:

- **Text**: Bold, Italic, Code
- **Math**: Inline math, Block math, Templates (fractions, roots, etc.)
- **Structure**: Headings, Lists, Tables, Images
- **Variables**: Variable syntax helpers (for parameterized exercises)

#### Adding Images

1. Click the **Image** button in the toolbar
2. Upload an image or enter a URL
3. Set alt text (required for accessibility)
4. Choose size and alignment
5. Click **"Inserer dans l'editeur"**

---

### Creating Parameterized Exercises

Parameterized exercises generate unique values for each instance, enabling infinite practice or personalized homework.

#### Understanding Variables

Variables allow you to:

- Generate random numbers within a range
- Calculate derived values
- Create unique problem instances for each student

#### Step 1: Add Variables

In the exercise form, scroll to the **Variables** section:

1. Click **"Ajouter une variable"**
2. Enter a **Name** (e.g., `a`, `coefficient`, `x1`)
3. Enter an **Expression** defining how to generate the value

#### Variable Expression Syntax

| Type            | Syntax                  | Example        | Description                    |
| --------------- | ----------------------- | -------------- | ------------------------------ |
| Random integer  | `{{min..max}}`          | `{{1..10}}`    | Random integer 1-10            |
| Random decimal  | `{{min..max:step}}`     | `{{0..1:0.1}}` | Random: 0, 0.1, 0.2, ..., 1.0  |
| With exclusions | `{{min..max!excluded}}` | `{{1..10!5}}`  | Random 1-10, excluding 5       |
| Calculated      | `{{eval:expression}}`   | `{{eval:a+b}}` | Calculate from other variables |

#### Step 2: Use Variables in Content

Reference variables using `{{variableName}}`:

**Statement**:

```markdown
Calculer ${{a}} + {{b}}$
```

**Solution**:

```markdown
${{a}} + {{b}} = {{sum}}$
```

#### Complete Example

**Variables**:
| Name | Expression |
|------|------------|
| `a` | `{{5..15}}` |
| `b` | `{{1..10}}` |
| `sum` | `{{eval:a+b}}` |

**Statement**:

```markdown
Calculer la somme:
$${{a}} + {{b}} = ?$$
```

**Solution**:

```markdown
$${{a}} + {{b}} = {{sum}}$$
```

**Result**: Each instance shows different numbers (e.g., "12 + 7 = 19").

#### Distribution Modes

Choose how instances are generated:

| Mode             | Description                  | Use Case              |
| ---------------- | ---------------------------- | --------------------- |
| **A la demande** | New random values each time  | Unlimited practice    |
| **Par eleve**    | Same values for each student | Personalized homework |
| **Par groupe**   | Same values for entire class | Class work            |

#### Advanced Examples

**Pythagorean Theorem**:

```
Variables:
- a: {{3..12}}
- b: {{4..15}}
- c: {{eval:Math.sqrt(a*a + b*b).toFixed(2)}}

Statement:
Dans un triangle rectangle, les cotes de l'angle droit mesurent ${{a}}$ cm et ${{b}}$ cm.
Calculer l'hypotenuse.

Solution:
$c = \sqrt{{{a}}^2 + {{b}}^2} = \sqrt{{{eval:a*a}} + {{eval:b*b}}} = {{c}}$ cm
```

**Avoiding Division by Zero**:

```
Variables:
- a: {{1..20}}
- b: {{1..10!0}}  <-- Exclude 0!
- quotient: {{eval:(a/b).toFixed(2)}}
```

---

### Managing Exercises

#### Exercise List Features

The exercise list provides:

- **Search**: Filter by title or source
- **Difficulty Filter**: Show only easy/medium/hard
- **Grade Level Filter**: Filter by target grades
- **Sorting**: Sort by title or modification date
- **Bulk Selection**: Select multiple for export

#### Actions on Exercises

| Action            | Icon   | Description                         |
| ----------------- | ------ | ----------------------------------- |
| **Previsualiser** | Eye    | Preview exercise with sample values |
| **Assigner**      | Send   | Assign to students or classes       |
| **Modifier**      | Pencil | Edit exercise content               |
| **Supprimer**     | Trash  | Delete exercise (irreversible)      |

#### Previewing Parameterized Exercises

1. Click the **Eye** icon to preview
2. For parameterized exercises, see the **"Autres valeurs"** button
3. Click to regenerate with different random values
4. Expand **Variables** to see resolved values

---

### Assigning Exercises

#### Step 1: Access Assignment Page

1. Click the **Send** icon on an exercise, OR
2. From the edit page, click **"Assigner"**

#### Step 2: Choose Assignment Type

**Tab: Eleves** (Individual Students)

1. Check the students to assign to
2. Optionally set a deadline
3. Add notes/instructions if needed
4. Click **"Assigner a X eleve(s)"**

**Tab: Classes** (Entire Classes)

1. Check the classes to assign to
2. All students in selected classes will receive the assignment
3. Set deadline and notes
4. Click **"Assigner a X classe(s)"**

**Tab: Public**

1. Makes the exercise available to all students
2. Useful for optional practice material
3. Click **"Rendre public"**

#### Assignment Options

| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| **Echeance** | Optional deadline (informational, not enforced) |
| **Notes**    | Instructions or remarks visible to students     |

#### Managing Existing Assignments

The right panel shows current assignments:

- See who the exercise is assigned to
- View deadlines and notes
- Delete assignments (click X icon)

---

### Tracking Progress

#### Exercise Statistics

For each exercise, you can view:

- **Total assigned**: Number of students with access
- **Views**: How many students have viewed it
- **Completions**: How many marked as complete
- **Completion rate**: Percentage completed

#### Viewing Assignment Details

From the assignment page:

- See all current assignments
- Check individual student progress
- Monitor deadline compliance

---

### Import and Export

#### Exporting Exercises

1. Select exercises using checkboxes
2. Click **"Exporter"** button
3. Choose format:
   - **JSON**: Structured format, easy to reimport
   - **Markdown**: Human-readable with YAML frontmatter
4. Click **"Exporter"** to download

#### Importing Exercises

1. Click **"Importer"** button
2. Drag and drop files (.json, .md, .markdown)
3. Choose duplicate handling:
   - **Ignorer**: Skip duplicates (recommended)
   - **Creer une copie**: Import as new exercise
   - **Remplacer**: Overwrite existing
4. Review import results

#### Importing from LaTeX

1. Click **"Import LaTeX"** in the exercise form
2. Paste LaTeX content or upload .tex file
3. Choose split mode (statement only, auto-detect, solution only)
4. Preview conversion results
5. Review warnings for unsupported commands
6. Click **"Importer"**

---

## Student Guide

### Viewing Assigned Exercises

#### Accessing Your Exercises

1. Log in to UbuMaths with your student account
2. Navigate to **Dashboard** > **Exercices**
3. See all exercises assigned to you

#### Understanding the Exercise List

Each exercise card shows:

- **Title and Tags**: Exercise identification
- **Status Badge**:
  - Green "Completed": You've marked it complete
  - Blue "En cours (X vue(s))": You've viewed it X times
- **Deadline Badge** (if set):
  - Red: Deadline passed
  - Orange: Deadline approaching
  - Blue: Deadline in future
- **Teacher Notes**: Special instructions (if any)
- **Difficulty**: 1/3, 2/3, or 3/3

#### Filtering Exercises

Use filters to find specific exercises:

| Filter                  | Description                        |
| ----------------------- | ---------------------------------- |
| **Search**              | Find by title or tags              |
| **Afficher completes**  | Show/hide completed exercises      |
| **Assignes uniquement** | Hide public exercises              |
| **Avec echeance**       | Show only exercises with deadlines |

#### Sorting

Exercises are automatically sorted:

1. Exercises with approaching deadlines first
2. Then by assignment date (newest first)

---

### Working on an Exercise

#### Step 1: Open the Exercise

Click **"Commencer"** (or **"Revoir"** if already completed) on an exercise card.

#### Step 2: Read the Statement

- The exercise statement appears with all math formulas rendered
- For parameterized exercises, values are specific to you

#### Step 3: Work Through the Problem

- Work on paper or your preferred method
- This is not an online quiz - there's no answer submission

#### Step 4: Check the Solution

1. Click **"Afficher la solution"** to reveal the answer
2. Compare with your work
3. Click **"Masquer la solution"** to hide it again

#### Regenerating Problems (On-Demand Mode)

If the exercise is set to "A la demande" (on-demand):

- Click **"Nouveau probleme"** to get new random values
- Practice as many times as you want

---

### Marking Completion

#### When to Mark Complete

Mark an exercise as complete when you:

- Have worked through the problem
- Understand the solution
- Feel confident with the material

#### How to Mark Complete

1. Click **"Marquer comme complete"** button
2. The button changes to green "Completed"
3. The exercise moves to "completed" in your list

#### Unmarking Completion

If you want to revisit an exercise:

1. Open the exercise
2. Click the "Completed" button to unmark
3. You can now mark it complete again later

---

## Tips and Best Practices

### For Teachers

#### Creating Effective Exercises

1. **Clear Statements**: Write unambiguous problem statements
2. **Complete Solutions**: Provide step-by-step solutions, not just answers
3. **Appropriate Difficulty**: Match difficulty to student level
4. **Good Tags**: Use consistent tags for easy filtering

#### Parameterization Best Practices

1. **Variable Order**: Define variables before using them in expressions
2. **Avoid Edge Cases**: Exclude values that cause problems (e.g., division by zero)
3. **Test Values**: Preview with different values to ensure sensible results
4. **Reasonable Ranges**: Keep number ranges appropriate for the problem

#### Assignment Strategies

| Mode            | Best For                                 |
| --------------- | ---------------------------------------- |
| **Per Student** | Homework (prevents copying)              |
| **Per Group**   | Class work (same problem for discussion) |
| **On Demand**   | Practice/review (unlimited attempts)     |

#### Deadline Tips

- Deadlines are informational - students can still access after deadline
- Use notes to clarify expectations
- Set reasonable deadlines accounting for student workload

### For Students

#### Effective Practice

1. **Try First**: Attempt the problem before viewing the solution
2. **Understand, Don't Memorize**: Focus on the method, not just the answer
3. **Use Regeneration**: For on-demand exercises, practice multiple variations
4. **Track Progress**: Mark exercises complete to track your work

#### Managing Deadlines

1. **Check Regularly**: Visit the exercises page frequently
2. **Prioritize**: Sort by deadline to focus on urgent work
3. **Plan Ahead**: Don't wait until the last minute

---

## Troubleshooting

### Common Issues

#### Math Not Rendering

**Symptom**: You see raw LaTeX code instead of formatted math

**Solutions**:

- Ensure dollar signs are correct: `$...$` for inline, `$$...$$` for block
- Check for missing closing dollar signs
- Refresh the page

#### Variables Not Replaced

**Symptom**: You see `{{variableName}}` instead of values

**Solutions**:

- Check variable name spelling matches exactly
- Ensure variable is defined in the Variables section
- Variables are case-sensitive

#### Assignment Not Visible to Student

**Symptom**: Student doesn't see the assigned exercise

**Causes & Solutions**:

- Check assignment is active (not deleted)
- Verify student is in the assigned class
- Student may need to refresh their page

#### Import Failures

**Symptom**: Import shows errors

**Solutions**:

- Check file format matches selection (JSON/Markdown)
- Verify required fields: statement_md, solution_md, difficulty
- Difficulty must be 1, 2, or 3

### Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting Guide](./troubleshooting.md) for technical details
2. Contact your administrator
3. Report bugs at [GitHub Issues](https://github.com/anthropics/claude-code/issues)

---

## Quick Reference

### Keyboard Shortcuts (Editor)

| Shortcut | Action |
| -------- | ------ |
| `Ctrl+B` | Bold   |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Link   |

### Variable Syntax Cheat Sheet

```
{{a}}              - Reference variable 'a'
{{1..10}}          - Random integer 1-10
{{0..1:0.1}}       - Random decimal with step
{{1..10!5}}        - Random 1-10, exclude 5
{{eval:a+b}}       - Calculate expression
{{eval:Math.sqrt(a)}} - Use Math functions
```

### Distribution Modes

| Mode          | French Name  | Behavior                |
| ------------- | ------------ | ----------------------- |
| `on_demand`   | A la demande | New values each time    |
| `per_student` | Par eleve    | Same values per student |
| `per_group`   | Par groupe   | Same values for class   |
