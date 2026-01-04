<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';

	// MySelect supports both single and multiple select modes
	// Using discriminated union for type safety based on `type` prop
	type BaseProps = {
		disabled?: boolean;
		name?: string;
		required?: boolean;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		triggerClass?: string;
		variant?: 'default' | 'invisible';
		class?: string;
		id?: string;
		/** If true, the trigger width adapts to the widest item label */
		fitContent?: boolean;
	};

	type SingleSelectProps = BaseProps & {
		type?: 'single';
		value?: string;
		onValueChange?: (value: string) => void;
		/** Alias for onValueChange - kept for backward compatibility */
		onchange?: (value: string) => void;
	};

	type MultipleSelectProps = BaseProps & {
		type: 'multiple';
		value?: string[];
		onValueChange?: (value: string[]) => void;
		/** Alias for onValueChange - kept for backward compatibility */
		onchange?: (value: string[]) => void;
	};

	type Props = SingleSelectProps | MultipleSelectProps;

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		variant = 'default',
		triggerClass,
		onValueChange,
		onchange,
		type = 'single',
		fitContent = false,
		...restProps
	}: Props = $props();

	// Combine onValueChange and onchange - prefer onValueChange
	function handleSingleValueChange(newValue: string) {
		const cb = onValueChange as ((value: string) => void) | undefined;
		const cbAlias = onchange as ((value: string) => void) | undefined;
		if (cb) cb(newValue);
		if (cbAlias) cbAlias(newValue);
	}

	function handleMultipleValueChange(newValue: string[]) {
		const cb = onValueChange as ((value: string[]) => void) | undefined;
		const cbAlias = onchange as ((value: string[]) => void) | undefined;
		if (cb) cb(newValue);
		if (cbAlias) cbAlias(newValue);
	}

	// Compute displayed label based on mode
	const selectedLabel = $derived.by(() => {
		if (value === undefined || value === null) return placeholder ?? 'Select...';
		if (type === 'multiple') {
			const arr = value as string[] | undefined;
			if (!arr || arr.length === 0) return placeholder ?? 'Select...';
			if (arr.length === 1) {
				return items.find((item) => item.value === arr[0])?.label ?? placeholder ?? 'Select...';
			}
			return `${arr.length} selected`;
		}
		return items.find((item) => item.value === value)?.label ?? placeholder ?? 'Select...';
	});

	// Compute trigger class based on variant (if not explicitly provided)
	// Note: height stays h-9 on desktop, touch devices get 44px via @media (pointer: coarse)
	// When fitContent is true, we use w-auto instead of w-full
	const computedTriggerClass = $derived(
		triggerClass ||
			(variant === 'invisible'
				? 'select-trigger h-9 px-0 text-sm inline-flex items-center justify-between bg-transparent border-none min-w-[150px] [&>svg]:opacity-0 hover:[&>svg]:opacity-100 [&>svg]:transition-opacity'
				: `select-trigger h-9 ${fitContent ? 'w-auto' : 'w-full'} rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between`)
	);

	// For fitContent mode: class for the invisible measuring elements
	const measureClass = 'invisible h-0 px-3 text-sm whitespace-nowrap col-start-1 row-start-1';
</script>

{#snippet selectContent()}
	<Select.Portal>
		<Select.Content
			class="z-50 max-h-96 w-[var(--bits-select-anchor-width)] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
			sideOffset={4}
			{...contentProps}
		>
			<Select.Viewport class="p-1">
				{#each items as item (item.value)}
					<Select.Item
						value={item.value}
						label={item.label}
						disabled={item.disabled}
						class="select-item relative flex h-9 w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
					>
						{#snippet children({ selected })}
							<span class="font-medium">{item.label}</span>
							{#if selected}
								<span class="ml-auto">✓</span>
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
{/snippet}

{#if fitContent}
	<!-- Grid layout to measure width from all labels -->
	<div class="inline-grid">
		<!-- Invisible labels for width measurement -->
		{#each items as item (item.value)}
			<span class={measureClass} aria-hidden="true">{item.label}</span>
		{/each}
		{#if placeholder}
			<span class={measureClass} aria-hidden="true">{placeholder}</span>
		{/if}

		<!-- Actual select in same grid cell -->
		{#if type === 'multiple'}
			<Select.Root
				type="multiple"
				bind:value={value as string[]}
				onValueChange={handleMultipleValueChange}
				{...restProps}
			>
				<Select.Trigger
					class="{computedTriggerClass} col-start-1 row-start-1"
					aria-label={placeholder}
				>
					{selectedLabel}
				</Select.Trigger>
				{@render selectContent()}
			</Select.Root>
		{:else}
			<Select.Root
				type="single"
				bind:value={value as string}
				onValueChange={handleSingleValueChange}
				{...restProps}
			>
				<Select.Trigger
					class="{computedTriggerClass} col-start-1 row-start-1"
					aria-label={placeholder}
				>
					{selectedLabel}
				</Select.Trigger>
				{@render selectContent()}
			</Select.Root>
		{/if}
	</div>
{:else}
	<!-- Standard layout -->
	{#if type === 'multiple'}
		<Select.Root
			type="multiple"
			bind:value={value as string[]}
			onValueChange={handleMultipleValueChange}
			{...restProps}
		>
			<Select.Trigger class={computedTriggerClass} aria-label={placeholder}>
				{selectedLabel}
			</Select.Trigger>
			{@render selectContent()}
		</Select.Root>
	{:else}
		<Select.Root
			type="single"
			bind:value={value as string}
			onValueChange={handleSingleValueChange}
			{...restProps}
		>
			<Select.Trigger class={computedTriggerClass} aria-label={placeholder}>
				{selectedLabel}
			</Select.Trigger>
			{@render selectContent()}
		</Select.Root>
	{/if}
{/if}

<style>
	/* Touch-friendly sizing for select trigger and items */
	@media (pointer: coarse) {
		:global(.select-trigger) {
			min-height: var(--min-touch-target, 44px);
		}

		/* Larger touch targets for select items */
		:global(.select-item) {
			min-height: var(--min-touch-target, 44px);
			padding-block: 0.75rem;
		}
	}
</style>
