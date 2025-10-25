<!--
	Grade Multi-Select Component
	============================

	Simplified multi-select for grade levels using native HTML select with multiple attribute.

	Features:
	- Native multi-select dropdown
	- Shows count of selected grades
	- Compact design for filter rows

	Props:
	- selectedGrades: string[] (bindable) - Array of selected grade values
	- grades: { value: string, label: string }[] - Available grades
	- placeholder?: string - Placeholder text when none selected
-->

<script lang="ts">
	interface Props {
		selectedGrades: string[];
		grades: { value: string; label: string }[];
	}

	let { selectedGrades = $bindable(), grades }: Props = $props();

	/**
	 * Handle change event from native select
	 */
	function handleChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const selected = Array.from(select.selectedOptions).map((option) => option.value);
		selectedGrades = selected;
	}
</script>

<div class="relative">
	<select
		multiple
		onchange={handleChange}
		class="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
		style="height: auto; max-height: 200px;"
	>
		{#each grades as grade (grade.value)}
			<option value={grade.value} selected={selectedGrades.includes(grade.value)}>
				{grade.label}
			</option>
		{/each}
	</select>
	{#if selectedGrades.length > 0}
		<div class="mt-1 text-xs text-muted-foreground">
			{selectedGrades.length} niveau{selectedGrades.length > 1 ? 'x' : ''} sélectionné{selectedGrades.length >
			1
				? 's'
				: ''}
		</div>
	{/if}
</div>
