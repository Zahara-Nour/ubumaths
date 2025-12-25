# Accessibility Audit: Grade Selection Components

**Date**: 2025-11-22
**Auditor**: Claude Code - Accessibility Expert
**Status**: IN PROGRESS

---

## Executive Summary

Grade selection components across the application have **mixed accessibility compliance**:

- **GradeMultiSelect** (native multi-select): CRITICAL issues with label association
- **MySelect** in AssessmentConfigForm: GOOD - proper Label component usage
- **Native selects** in questions page: CRITICAL issues with missing label associations

**Priority**: Fix GradeMultiSelect label association immediately (blocks screen reader users)

---

## Detailed Findings

### Component 1: GradeMultiSelect.svelte

**File**: `/Users/david/Coding/js/ubumaths/src/lib/components/GradeMultiSelect.svelte`

#### Summary

Native HTML `<select multiple>` component used for selecting grade levels. Has good focus styling but critical accessibility gaps.

#### Issues Found

**1. CRITICAL: Missing Label Association**

- **Issue**: The `<select>` element has no associated `<label>` element or `for` attribute
- **WCAG**: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- **Impact**: Screen reader users cannot understand what the select control is for. Context is provided only through visual proximity
- **Current Code** (line 36-48):

  ```svelte
  <div class="relative">
    <select multiple onchange={handleChange} class="...">
      {#each grades as grade (grade.value)}
        <option value={grade.value} selected={selectedGradesList.includes(grade.value)}>
          {grade.label}
        </option>
      {/each}
    </select>
  ```

- **Solution**: Add `id` to select and expose as prop, or add `aria-label`:

  ```svelte
  <script lang="ts">
    interface Props {
      selectedGrades: string[];
      grades: { value: string; label: string }[];
      label?: string; // NEW
      id?: string;   // NEW
    }

    let { selectedGrades = $bindable(), grades, label, id = generateId() }: Props = $props();
  </script>

  <div class="space-y-2">
    {#if label}
      <label for={id} class="text-sm font-medium">{label}</label>
    {/if}
    <select
      {id}
      multiple
      onchange={handleChange}
      aria-label={label || 'Grade selection'}
      class="..."
    >
  ```

**2. CRITICAL: Missing `aria-label` for Unlabeled Usage**

- **Issue**: When used without a label (like in the questions page filter), the select has no accessible name
- **WCAG**: 4.1.2 Name, Role, Value
- **Impact**: Screen readers announce "select" with no purpose
- **Severity**: CRITICAL in questions page usage (line 508 of +page.svelte)

**3. IMPORTANT: No `aria-describedby` for Helper Text**

- **Issue**: The description text "X niveaux sélectionnés" (line 50-56) is not associated with the select
- **WCAG**: 3.3.2 Labels or Instructions
- **Impact**: Screen reader users won't hear the count of selected grades
- **Solution**:
  ```svelte
  {#if selectedGrades.length > 0}
  	<div id={`${id}-description`} class="mt-1 text-xs text-muted-foreground">
  		{selectedGrades.length} niveau{selectedGrades.length > 1 ? 'x' : ''} sélectionné{selectedGrades.length >
  		1
  			? 's'
  			: ''}
  	</div>
  {/if}
  ```
  Then add to select: `aria-describedby={selectedGrades.length > 0 ? `${id}-description` : ''}`

**4. IMPORTANT: Keyboard Navigation - Multiple Select UI Issue**

- **Issue**: Native `<select multiple>` requires holding Ctrl/Cmd to select multiple items - not intuitive
- **UX Pattern**: Expected on some platforms but can be confusing
- **Note**: This is less of an accessibility violation than UX concern, but worth noting
- **Not Critical**: Modern screen readers help users understand this

#### Focus Management

- **Status**: GOOD - Has `focus-visible:ring-2` which provides visible focus indicator
- **Contrast**: Would need verification, but ring is typically visible

---

### Component 2: AssessmentConfigForm.svelte (Grade field)

**File**: `/Users/david/Coding/js/ubumaths/src/lib/components/assessments/AssessmentConfigForm.svelte`

#### Summary

Uses MySelect (custom select component) for grade selection with proper Label component usage.

#### Accessibility Assessment

**GOOD PRACTICES**:

1. **Proper Label Association** (line 139-141):

   ```svelte
   <Label for="grade">Niveau *</Label>
   <MySelect
     type="single"
     bind:value={grade}
     items={gradeItems}
   ```

   - Label has `for` attribute
   - MySelect needs to accept and pass through `id` prop

2. **Error Message Association** (line 150-152):

   ```svelte
   {#if errors.grade}
   	<p class="text-sm text-red-500">{errors.grade}</p>
   {/if}
   ```

   - Error text visible but not programmatically linked to select
   - Should have `aria-describedby` or `aria-invalid="true"`

#### Issues Found

**1. IMPORTANT: MySelect Missing `id` Prop Support**

- **Issue**: MySelect component doesn't accept or forward `id` prop
- **WCAG**: 1.3.1 Info and Relationships
- **Impact**: Label's `for="grade"` attribute doesn't properly connect to select
- **Solution**: Update MySelect to accept and forward `id`:

  ```typescript
  type Props = WithoutChildren<Select.RootProps> & {
    id?: string;  // NEW
    placeholder?: string;
    items: { value: string; label: string; disabled?: boolean }[];
    // ...
  };

  let { value = $bindable(), id, items, ... }: Props = $props();
  ```

  Then: `<Select.Root {id} bind:value={value as never} {...restProps}>`

**2. IMPORTANT: Error Message Not Linked to Form Control**

- **Issue**: Error messages lack `aria-describedby` or `aria-invalid` attributes
- **WCAG**: 3.3.1 Error Identification, 3.3.3 Error Suggestion
- **Impact**: Screen readers don't announce that there's an error on this field
- **Solution**:
  ```svelte
  <div class="space-y-2">
  	<Label for="grade">Niveau *</Label>
  	<MySelect
  		id="grade"
  		type="single"
  		bind:value={grade}
  		items={gradeItems}
  		aria-invalid={!!errors.grade}
  		aria-describedby={errors.grade ? 'grade-error' : undefined}
  	/>
  	{#if errors.grade}
  		<p id="grade-error" class="text-sm text-red-500">{errors.grade}</p>
  	{/if}
  </div>
  ```

**3. IMPORTANT: Required Field Indicator**

- **Issue**: Asterisk (\*) indicates required field visually but not programmatically
- **WCAG**: 3.3.2 Labels or Instructions
- **Impact**: Screen reader users don't know field is required
- **Solution**: Add `aria-required="true"` to select, or use `required` attribute
- **Better**: Add `aria-label="Niveau (requis)"` to provide context

#### Focus Indicators

- **Status**: GOOD - MySelect (via Bits UI) provides visible focus ring

---

### Component 3: Questions Admin Page Filters

**File**: `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/admin/questions/+page.svelte`

#### Summary

Uses GradeMultiSelect in filter row with Label component nearby but not associated.

#### Issues Found

**1. CRITICAL: Label Not Associated with GradeMultiSelect**

- **Issue** (line 506-509):

  ```svelte
  <div class="space-y-2">
  	<Label class="text-sm font-medium">Niveaux scolaires</Label>
  	<GradeMultiSelect bind:selectedGrades={selectedGradesList} grades={gradeLevels} />
  </div>
  ```

  - Label is generic `<label>` component, not an HTML `<label>` with `for` attribute
  - GradeMultiSelect has no `id` and cannot receive one
  - Screen readers won't associate label with select

- **WCAG**: 1.3.1 Info and Relationships
- **Impact**: CRITICAL - Filter interface is confusing for screen reader users

**2. CRITICAL: Other Native Selects Missing Labels**

- **Type filter** (line 495-502):

  ```svelte
  <div class="space-y-2">
    <Label class="text-sm font-medium">Type de question</Label>
    <select bind:value={selectedType} class="...">
  ```

  - No `id`, `for`, or `aria-label`

- **Theme, Domain, Subdomain, Level filters** (line 536-594):

  - Same issue repeated across all filter selects

- **Sort filter** (line 603-610):

  ```svelte
  <select bind:value={sortField} class="...">
  ```

  - Missing all label associations

- **WCAG**: 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **Impact**: CRITICAL - All filter controls are inaccessible to screen reader users

**3. IMPORTANT: Search Input Missing Label Association**

- **Issue** (line 521-526):

  ```svelte
  <Label class="text-sm font-medium">Recherche</Label>
  <Input
    value={searchTerm}
    oninput={(e) => handleSearchInput(e.currentTarget.value)}
    placeholder="Rechercher dans les énoncés..."
  ```

  - Input has `placeholder` but should have `id` and associated `<label for>`

- **WCAG**: 1.3.1, 4.1.2
- **Impact**: IMPORTANT - Search functionality not discoverable by screen readers

**4. IMPORTANT: Difficulty Level Range Inputs**

- **Issue** (line 579-593):

  ```svelte
  <Label class="text-sm font-medium">Niveau de difficulté</Label>
  <div class="flex gap-2">
  	<Input type="number" min="1" bind:value={minLevel} placeholder="Min" />
  	<Input type="number" min="1" bind:value={maxLevel} placeholder="Max" />
  </div>
  ```

  - Two inputs share one label (confusing)
  - No individual labels like "Minimum" / "Maximum"
  - Placeholders alone are insufficient for screen readers

---

## Summary of WCAG Issues

| Component                | Issue                                               | Severity  | WCAG         | Count |
| ------------------------ | --------------------------------------------------- | --------- | ------------ | ----- |
| **GradeMultiSelect**     | No label/aria-label                                 | CRITICAL  | 1.3.1, 4.1.2 | 1     |
|                          | No aria-describedby                                 | IMPORTANT | 3.3.2        | 1     |
| **AssessmentConfigForm** | MySelect missing id prop                            | IMPORTANT | 1.3.1        | 1     |
|                          | Error not linked to select                          | IMPORTANT | 3.3.1        | 1     |
|                          | Required not indicated                              | IMPORTANT | 3.3.2        | 1     |
| **Questions Page**       | GradeMultiSelect not labeled                        | CRITICAL  | 1.3.1        | 1     |
|                          | Type/Theme/Domain/Subdomain/Level selects unlabeled | CRITICAL  | 1.3.1, 4.1.2 | 5     |
|                          | Search input missing label                          | IMPORTANT | 1.3.1        | 1     |
|                          | Difficulty inputs ambiguous label                   | IMPORTANT | 3.3.2        | 1     |

**Total**: 13 issues (4 CRITICAL, 9 IMPORTANT)

---

## Testing Recommendations

### Screen Reader Testing (NVDA, JAWS, VoiceOver)

- [ ] Navigate to Questions admin page with screen reader
- [ ] Verify each filter label is announced with select
- [ ] Confirm error messages are announced when validation fails
- [ ] Test GradeMultiSelect with multiple selection

### Keyboard Navigation Testing

- [ ] Tab through all filters - verify logical tab order
- [ ] Select native select elements - check if ARROW keys work
- [ ] Multi-select usage - verify Ctrl/Cmd+Click works
- [ ] Escape key - verify closes any open dropdowns

### Voice Control Testing

- [ ] Say "Click [Label]" for each filter - verify focus moves to correct control
- [ ] Navigate with "Next field" - verify order is correct

### Color Contrast Testing

- [ ] Measure contrast ratio of focus ring against background
- [ ] Verify visible focus indicator in both light and dark modes

---

## Recommended Fix Priority

### Phase 1 (CRITICAL - Fix Immediately)

1. Add `id` and `aria-label` to GradeMultiSelect
2. Add `id` and `aria-label` to all native selects in questions page
3. Add `id` and associated `<label for>` to search input
4. Verify MySelect forwards id properly

### Phase 2 (IMPORTANT - Fix This Sprint)

1. Add `aria-invalid` and `aria-describedby` to form error messages
2. Update difficulty level inputs with separate labels ("Minimum", "Maximum")
3. Add `aria-required="true"` to required form fields
4. Test all label associations with screen readers

### Phase 3 (NICE TO HAVE - Future Enhancement)

1. Consider replacing native multi-select with better UX (combobox or custom component)
2. Add aria-live regions for dynamic filter results
3. Add loading announcements for search debounce
4. Implement form validation with automatic error focus

---

## Critical Files to Modify

1. `/Users/david/Coding/js/ubumaths/src/lib/components/GradeMultiSelect.svelte`
2. `/Users/david/Coding/js/ubumaths/src/lib/components/MySelect.svelte`
3. `/Users/david/Coding/js/ubumaths/src/lib/components/assessments/AssessmentConfigForm.svelte`
4. `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/admin/questions/+page.svelte`

---

**Next Steps**: Await approval to proceed with fixes
