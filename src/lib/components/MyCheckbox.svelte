<script lang="ts">
	/**
	 * MyCheckbox - Custom Checkbox Component
	 *
	 * Wrapper around Shadcn-svelte Checkbox for consistent usage across the app.
	 * Provides a labeled checkbox with optional label text.
	 *
	 * @example
	 * <MyCheckbox bind:checked={isEnabled} label="Enable notifications" />
	 * <MyCheckbox bind:checked={isTest} disabled />
	 * <MyCheckbox bind:checked={agree} required onCheckedChange={(v) => console.log(v)} />
	 */

	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { useId, type WithoutChildrenOrChild } from 'bits-ui';
	import type { Checkbox as CheckboxPrimitive } from 'bits-ui';

	let {
		id = useId(),
		checked = $bindable(false),
		disabled = false,
		required = false,
		label,
		labelClass = '',
		checkboxRef = $bindable(null),
		labelRef = $bindable(null),
		onCheckedChange,
		onchange,
		class: className = '',
		...restProps
	}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> & {
		label?: string;
		labelClass?: string;
		checkboxRef?: HTMLButtonElement | null;
		labelRef?: HTMLLabelElement | null;
		onCheckedChange?: (checked: boolean | 'indeterminate') => void;
		/** Alias for onCheckedChange - simpler signature with just boolean */
		onchange?: (checked: boolean) => void;
	} = $props();

	function handleChange(value: boolean | 'indeterminate') {
		// Only assign boolean values to checked, not 'indeterminate'
		if (value !== 'indeterminate') {
			checked = value;
			// Call onchange alias with boolean value
			if (onchange) {
				onchange(value);
			}
		}
		if (onCheckedChange) {
			onCheckedChange(value);
		}
	}
</script>

<div class="checkbox-wrapper flex items-center gap-2">
	<Checkbox
		{id}
		bind:checked
		bind:ref={checkboxRef}
		{disabled}
		{required}
		onCheckedChange={handleChange}
		class={className}
		{...restProps}
	/>
	{#if label}
		<Label
			for={id}
			bind:ref={labelRef}
			class="cursor-pointer text-sm leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70 {labelClass}"
		>
			{label}
		</Label>
	{/if}
</div>

<style>
	/* Touch-friendly: extend clickable area on touch devices */
	.checkbox-wrapper {
		position: relative;
	}

	@media (pointer: coarse) {
		.checkbox-wrapper {
			min-height: var(--min-touch-target, 44px);
			padding-block: 0.5rem;
		}

		/* Extend the clickable area with pseudo-element */
		.checkbox-wrapper::before {
			content: '';
			position: absolute;
			inset: -0.5rem;
			z-index: -1;
		}
	}
</style>
