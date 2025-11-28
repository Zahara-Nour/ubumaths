# Question Bank System - Testing Guide

**Status**: Development server running on http://localhost:5174/
**Date**: January 19, 2025

---

## ✅ Pre-Testing Checklist

- ✅ Database migrations applied (070, 071)
- ✅ 8 seed templates inserted
- ✅ TypeScript compilation clean
- ✅ Dev server running (port 5174)
- ✅ All components created
- ✅ Navigation link added to admin sidebar

---

## 🧪 Manual Testing Checklist

### 1. Access Admin Interface

**Steps**:

1. Navigate to http://localhost:5174/
2. Log in as admin user
3. Look for "Questions" link in admin sidebar (BookOpen icon)
4. Click "Questions" to access `/dashboard/admin/questions`

**Expected**:

- ✅ "Questions" link visible in admin sidebar
- ✅ Link positioned after "Classes", before "Debug"
- ✅ BookOpen icon displayed
- ✅ Click navigates to questions list page

---

### 2. Test Questions List Page

**URL**: `/dashboard/admin/questions`

**Expected Elements**:

- ✅ Page title: "Questions"
- ✅ "Créer une question" button (top-right)
- ✅ Type filter dropdown
- ✅ Search input field
- ✅ Table with columns: Type, Énoncé, Niveaux, Créé le, Actions
- ✅ 8 seed templates displayed (if seeded correctly)
- ✅ Pagination controls (if > 50 items)

**Actions to Test**:

1. **Filter by Type**:
   - Select "Numérique (exact)" from dropdown
   - Verify only numerical_exact questions shown
   - Reset filter to "Tous"

2. **Search**:
   - Type "fraction" in search box
   - Verify filtering works (client-side)
   - Clear search

3. **View Seed Templates**:
   - Scroll through the 8 seed examples
   - Verify each has:
     - Type badge with color
     - Statement preview
     - Grade level badges
     - Creation date
     - Action buttons (Edit, Duplicate, Delete)

---

### 3. Test Question Creation

**Steps**:

1. Click "Créer une question" button
2. Navigate to `/dashboard/admin/questions/create`

**Expected**:

- ✅ Page title: "Créer une Question"
- ✅ "Retour" button
- ✅ Main form card with tabs

**Test Simple Numerical Question**:

1. **Type & Grades Tab** (always visible):
   - Select type: "Numérique (exact)"
   - Click grade badges: "6", "5"
   - Verify selected badges change color

2. **Statement Tab**:
   - Click "Statement" tab
   - Should see ContentFieldEditor
   - Default: 1 text field
   - Enter: `Calculer : $$2 + 3$$`
   - Click "Ajouter du texte" to add another field
   - Click up/down arrows to reorder
   - Click trash icon to remove extra field

3. **Variables Tab** (skip for simple question):
   - Click "Variables" tab
   - Should show "Aucune variable définie"
   - Leave empty for now

4. **Answer Tab**:
   - Click "Answer" tab
   - Should see AnswerEditor with numerical fields
   - Enter answer: `5`
   - Precision should default to "Aucune (valeur exacte)"

5. **Preview Tab**:
   - Click "Preview" tab
   - Should see QuestionPreview component
   - Verify:
     - ✅ "Génération en cours..." appears briefly
     - ✅ "Instance générée avec succès" message
     - ✅ Statement displays: "Calculer : $$2 + 3$$"
     - ✅ Answer displays: "5"
     - ✅ Seed number shown
   - Click "Régénérer" button
   - Verify seed changes and instance regenerates

6. **JSON Tab**:
   - Click "JSON" tab
   - Verify JSON structure displayed
   - Check for:
     - `"type": "numerical_exact"`
     - `"statement": [{"type": "text", "content": "..."}]`
     - `"answer": "5"`
     - `"grades": ["6", "5"]`
   - Click "Copier" button
   - Verify "Copié" message appears

7. **Save**:
   - Click "Enregistrer" button
   - Verify:
     - ✅ Toast: "Question créée avec succès"
     - ✅ Redirect to `/dashboard/admin/questions`
     - ✅ New question appears in list

---

### 4. Test Question with Variables

**Steps**:

1. Click "Créer une question"
2. Select type: "Numérique (exact)"
3. Select grades: "6", "5"

**Statement**:

```
Calculer : $${{a}} + {{b}}$$
```

**Variables Tab**:

1. Click "Ajouter une variable"
2. Variable 1:
   - Name: `a`
   - Expression: `{{1..10}}`
3. Click "Ajouter une variable"
4. Variable 2:
   - Name: `b`
   - Expression: `{{1..10}}`

**Test Syntax Helpers**:

- Click in expression field for variable 2
- Click "Aléatoire" button
- Verify `{{1..10}}` inserted at cursor

**Answer**:

```
{{eval:{{a}}+{{b}}}}
```

**Preview**:

- Should show resolved variables (e.g., a=5, b=7)
- Statement should show: "Calculer : $$5 + 7$$"
- Answer should show: "12"
- Click "Régénérer" to see different values

**Save and Verify**:

- Click "Enregistrer"
- Verify success toast
- Verify question in list

---

### 5. Test Advanced Features

**Test Exclusions**:

1. Create question with variables:
   - `a`: `{{1..10}}`
   - `b`: `{{1..10!{{a}}}}`
2. Preview multiple times
3. Verify `b` is never equal to `a`

**Test Circular Dependency Detection**:

1. Create question with:
   - `a`: `{{b}}`
   - `b`: `{{a}}`
2. Preview tab should show error:
   - "Circular reference detected: a -> b -> a"

**Test Decimal Generation**:

1. Create variable: `{{0.5..9.99:0.01}}`
2. Preview and verify decimal values

**Test Evaluation**:

1. Create variable: `a = {{2..9}}`
2. Create variable: `square = {{eval:{{a}}^2}}`
3. Preview and verify square is correct

---

### 6. Test Question Types

**Algebraic Transform**:

1. Create question type: "Transformation algébrique"
2. Select transform type: "Factorisation"
3. Statement: `Factoriser : $$x^2 - 9$$`
4. Answer: `(x-3)(x+3)`
5. Preview and save

**Fill-in-Blanks**:

1. Create question type: "Texte à trous"
2. Statement: `L'hypoténuse mesure ____ cm. Théorème de ____.`
3. Answer tab:
   - Click "Ajouter un trou"
   - Trou 1: `5`
   - Click "Ajouter un trou"
   - Trou 2: `Pythagore`
4. Preview shows blanks array `[0, 1]`
5. Save

**Multiple Choice**:

1. Create question type: "QCM"
2. Statement: `Quelle est la capitale de la France ?`
3. Answer tab:
   - Choice 1: `Paris` (select radio button)
   - Choice 2: `Londres`
   - Choice 3: `Berlin`
   - Click "Ajouter un choix"
   - Choice 4: `Madrid`
4. Verify radio selection for correct answer
5. Preview shows shuffled choices with correct indicator
6. Save

**Multiple Choice with Multiple Answers**:

1. Create QCM question
2. Check "Autoriser plusieurs réponses correctes"
3. Verify radio buttons change to checkboxes
4. Select multiple correct answers
5. Preview and save

---

### 7. Test Precision Types

**Decimal Precision**:

1. Create numerical_decimal question
2. Answer: `{eval:22/7}` (approximation of π)
3. Precision: Type = "Décimales", Digits = 2
4. Preview shows answer with 2 decimals

**Significant Figures**:

1. Create numerical_rounded question
2. Precision: Type = "Chiffres significatifs", Digits = 3
3. Verify configuration saved

**Tolerance**:

1. Create numerical question
2. Precision: Type = "Tolérance"
3. Mode: "Absolue"
4. Valeur: 0.1
5. Verify saves correctly

---

### 8. Test Edit Functionality

**Steps**:

1. From questions list, click Edit (pencil icon) on a seed question
2. Verify form pre-populated with existing data
3. Change statement text
4. Add a variable
5. Preview shows updated instance
6. Click "Enregistrer"
7. Verify toast: "Question mise à jour avec succès"
8. Verify changes in list

---

### 9. Test Duplicate Functionality

**Steps**:

1. Click Duplicate (copy icon) on a question
2. Wait for operation to complete
3. Verify toast message
4. Refresh page
5. Verify duplicate appears in list (with new ID)
6. Edit duplicate to confirm it's independent

---

### 10. Test Delete Functionality

**Steps**:

1. Click Delete (trash icon) on a question
2. Verify confirmation dialog appears
3. Click "Annuler" to cancel
4. Verify question still in list
5. Click Delete again
6. Click "Supprimer" to confirm
7. Verify toast: "Question supprimée avec succès"
8. Verify question removed from list

---

### 11. Test Pagination

**Steps** (if you have > 50 templates):

1. Create enough questions to exceed 50
2. Verify pagination controls appear
3. Click "Suivant" button
4. Verify page 2 loads
5. Click "Précédent" button
6. Verify page 1 loads

---

### 12. Test Error Handling

**Invalid Variable Name**:

1. Create variable with name: `123abc`
2. Verify error message: "Le nom doit commencer par une lettre..."

**Duplicate Variable Name**:

1. Create two variables both named `a`
2. Verify error: "Ce nom est déjà utilisé..."

**Empty Statement**:

1. Leave statement empty
2. Try to save
3. Verify save button disabled or error shown

**No Grades Selected**:

1. Deselect all grades
2. Verify error message or disabled save

---

## 🐛 Common Issues & Fixes

### Issue: "Questions" link not in sidebar

**Check**:

1. Verify you're logged in as admin
2. Check `/dashboard/+layout.svelte` line 98
3. Ensure `profile.role === 'admin'`

**Fix**: Already implemented in navigation

---

### Issue: Seed templates not showing

**Check**:

```bash
# Verify migration ran
pnpm db:migrate

# Check database
supabase db pull
```

**Fix**: Run migration 071 again if needed

---

### Issue: Preview shows errors

**Common Causes**:

1. **Circular dependency** - Check variable references
2. **Invalid syntax** - Check for matching braces `{}`
3. **Undefined variable** - Check declaration order
4. **Invalid range** - min must be < max after resolution

**Fix**: Review error message in preview, fix template

---

### Issue: TypeScript errors

**Check**:

```bash
pnpm check
```

**Expected**: No errors in Question Bank code (existing errors in geometry/UI okay)

---

## 📊 Testing Checklist Summary

Use this checklist to track testing progress:

- [ ] Access admin interface (sidebar link)
- [ ] View questions list page
- [ ] Filter by type
- [ ] Search functionality
- [ ] Create simple numerical question
- [ ] Create question with variables
- [ ] Test random number generation
- [ ] Test exclusions
- [ ] Test circular dependency detection
- [ ] Test evaluation expressions
- [ ] Test all precision types
- [ ] Test algebraic transform
- [ ] Test fill-in-blanks
- [ ] Test multiple choice (single answer)
- [ ] Test multiple choice (multiple answers)
- [ ] Edit existing question
- [ ] Duplicate question
- [ ] Delete question
- [ ] Test pagination (if applicable)
- [ ] Test error validation
- [ ] Preview with multiple seeds
- [ ] JSON viewer and copy
- [ ] All 6 question types working

---

## 🎯 Success Criteria

**System is working correctly if**:

✅ All navigation works smoothly
✅ List page displays seed templates
✅ Filter and search work
✅ Can create all 6 question types
✅ Variables resolve correctly
✅ Random generation works with exclusions
✅ Circular dependencies detected
✅ Preview shows correct instances
✅ Edit updates templates
✅ Duplicate creates independent copies
✅ Delete removes templates
✅ Toast notifications appear
✅ No console errors
✅ TypeScript compilation clean

---

## 📝 Test Results Log

**Date**: **\*\***\_**\*\***

**Tester**: **\*\***\_**\*\***

| Feature               | Status            | Notes |
| --------------------- | ----------------- | ----- |
| Navigation            | ⬜ Pass / ⬜ Fail |       |
| List Page             | ⬜ Pass / ⬜ Fail |       |
| Create Simple         | ⬜ Pass / ⬜ Fail |       |
| Create with Variables | ⬜ Pass / ⬜ Fail |       |
| Edit                  | ⬜ Pass / ⬜ Fail |       |
| Duplicate             | ⬜ Pass / ⬜ Fail |       |
| Delete                | ⬜ Pass / ⬜ Fail |       |
| Preview               | ⬜ Pass / ⬜ Fail |       |
| Validation            | ⬜ Pass / ⬜ Fail |       |
| All Question Types    | ⬜ Pass / ⬜ Fail |       |

**Overall Status**: ⬜ Pass / ⬜ Fail

**Issues Found**:

---

---

---

---

## 🚀 Next Steps After Testing

If all tests pass:

1. ✅ Mark system as production-ready
2. ✅ Create more example templates
3. ✅ Train other admins on usage
4. ⏳ Write automated tests (Phase 4)
5. ⏳ Implement student interface

If issues found:

1. Document issues clearly
2. Prioritize by severity
3. Fix critical bugs
4. Re-test
5. Deploy when stable

---

**Happy Testing! 🧪**
