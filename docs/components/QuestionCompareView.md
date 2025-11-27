# QuestionCompareView Component

## Overview

`QuestionCompareView` is a comprehensive comparison component for reviewing question transformations during the migration process. It provides a side-by-side view of the original and transformed question formats, displays warnings and errors, and allows reviewers to approve or reject transformations.

## Location

- **Component**: `src/lib/components/migration/QuestionCompareView.svelte`
- **Supporting Component**: `src/lib/components/migration/ReviewActions.svelte`
- **Example**: `src/lib/components/migration/QuestionCompareView.example.svelte`

## Features

### Visual Features

- **Two-column layout**: Side-by-side comparison (responsive: stacks on mobile)
- **Syntax highlighting**: JSON formatting with monospace font for complex data
- **Color-coded sections**:
  - Warnings: amber/yellow background
  - Errors: red background
  - Success: green indicator
- **Dark mode support**: Full theme compatibility
- **Responsive design**: Works on mobile, tablet, and desktop

### Data Display

- **Old format fields**:
  - description
  - subdescription
  - grade
  - enounces (array)
  - solutionss (array)
  - options (array)

- **New format fields**:
  - name
  - description
  - grade_level
  - enounce_template
  - solution_template
  - validation_rules (array)

### Review Actions

- **Approve button**: Green button to approve transformation
- **Reject button**: Red button with modal for rejection reason
- **Disabled state**: Automatically disables approve when errors exist
- **Validation**: Requires rejection reason before submitting

## Props

```typescript
interface Props {
	original: Record<string, unknown>; // Old question format
	transformed: Record<string, unknown> | null; // New format (null if failed)
	warnings: string[]; // Array of warning messages
	errors: string[]; // Array of error messages
	onApprove?: () => void; // Callback for approve action
	onReject?: (reason: string) => void; // Callback for reject action
	class?: string; // Additional CSS classes
}
```

## Usage

### Basic Usage

```svelte
<script>
	import { QuestionCompareView } from '$lib/components/migration';

	const original = {
		description: 'Addition simple',
		enounces: ['$a+$b='],
		solutionss: [['$a+$b']],
		options: [['MAX=10', 'MIN=1']]
	};

	const transformed = {
		name: 'Addition simple',
		enounce_template: '{{a}} + {{b}} = ?',
		solution_template: '{{a + b}}',
		validation_rules: [{ type: 'numeric_range', variable: 'a', min: 1, max: 10 }]
	};

	const warnings = ['Option "MAX" converted to validation_rules.max'];
	const errors = [];

	function handleApprove() {
		console.log('Approved!');
	}

	function handleReject(reason) {
		console.log('Rejected:', reason);
	}
</script>

<QuestionCompareView
	{original}
	{transformed}
	{warnings}
	{errors}
	onApprove={handleApprove}
	onReject={handleReject}
/>
```

### With Failed Transformation

```svelte
<QuestionCompareView
	{original}
	transformed={null}
	warnings={[]}
	errors={['Failed to parse enounce template', 'Invalid validation rule']}
	onReject={handleReject}
/>
```

### Without Review Actions

```svelte
<!-- Read-only comparison, no approve/reject buttons -->
<QuestionCompareView {original} {transformed} {warnings} {errors} />
```

## Components Used

- **shadcn-svelte**:
  - `Card` - Container for comparison sections
  - `Badge` - Status indicators
  - `Button` - Action buttons
  - `Dialog` - Reject reason modal
  - `Label` - Form label
  - `Textarea` - Rejection reason input

- **Icons** (lucide-svelte):
  - `AlertCircle` - Error indicator
  - `AlertTriangle` - Warning indicator
  - `CheckCircle2` - Success indicator
  - `XCircle` - Reject button

## Styling

### Layout

- **Desktop** (lg+): Two-column grid
- **Mobile/Tablet**: Stacked single column
- **Gap**: 6 spacing units (1.5rem)

### Color Scheme

- **Warnings**: `border-warning/50 bg-warning/5`
- **Errors**: `border-destructive/50 bg-destructive/5`
- **Success**: `border-success/50 bg-success/5`

### Code Blocks

```
font-mono text-xs
bg-muted p-3 rounded-md
overflow-x-auto
```

## Responsive Behavior

| Breakpoint | Layout       | Description                                |
| ---------- | ------------ | ------------------------------------------ |
| < 1024px   | Stacked      | Single column, old format above new format |
| >= 1024px  | Side-by-side | Two equal columns                          |

## Accessibility

- **Keyboard navigation**: Full keyboard support for buttons and dialog
- **ARIA labels**: Proper semantic HTML and ARIA attributes
- **Focus management**: Dialog traps focus when open
- **Screen readers**: Descriptive text for icons and status indicators

## State Management

Uses Svelte 5 runes:

- `$props()` - Component props
- `$derived` - Computed values (hasErrors, hasWarnings, isClean, etc.)
- `$state` - Local state for dialog and rejection reason

## Error Handling

- **No transformation**: Shows error icon and message
- **Has errors**: Displays error list and disables approve button
- **Has warnings**: Shows warning list, approve still enabled
- **Clean**: Shows success indicator

## Best Practices

1. **Always provide errors array**: Even if empty, for proper status display
2. **Validate rejection reason**: Component ensures non-empty reason
3. **Handle null transformed**: Component gracefully handles failed transformations
4. **Use semantic data**: Pass properly structured old/new format objects
5. **Provide callbacks**: Implement onApprove and onReject for actionable reviews

## Example Integration

```svelte
<script>
	import { QuestionCompareView } from '$lib/components/migration';
	import { toaster } from '$lib/stores/toaster.svelte';

	async function handleApprove() {
		try {
			await approveTransformation(questionId);
			toaster.success('Question approuvée');
		} catch (error) {
			toaster.error("Échec de l'approbation");
		}
	}

	async function handleReject(reason) {
		try {
			await rejectTransformation(questionId, reason);
			toaster.info('Question rejetée');
		} catch (error) {
			toaster.error('Échec du rejet');
		}
	}
</script>

<QuestionCompareView
	original={question.old_format}
	transformed={question.new_format}
	warnings={question.warnings}
	errors={question.errors}
	onApprove={handleApprove}
	onReject={handleReject}
/>
```

## Testing Considerations

When testing this component:

1. **Null transformation**: Test with `transformed={null}`
2. **Empty arrays**: Test with `warnings={[]}` and `errors={[]}`
3. **Long content**: Test with large arrays and long strings
4. **Mobile**: Test responsive behavior on narrow viewports
5. **Dark mode**: Verify color scheme in both themes
6. **Dialog**: Test reject flow with empty and valid reasons

## Related Components

- **QuestionCard**: Preview card for question list
- **ReviewActions**: Standalone approve/reject buttons
- **MigrationTree**: Tree view of migration structure
- **CategoryProgress**: Progress indicator for categories

## Future Enhancements

Potential improvements:

- [ ] Diff highlighting (show exact changes)
- [ ] Expandable/collapsible sections
- [ ] Copy to clipboard buttons
- [ ] Export comparison as PDF
- [ ] History of reviews (previous approvals/rejections)
- [ ] Bulk approve/reject actions
- [ ] Preview rendered question (with templates evaluated)
