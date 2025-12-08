<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		triggerClass?: string;
		variant?: 'default' | 'invisible';
		class?: string;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		variant = 'default',
		triggerClass,
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(
		value !== undefined && value !== null
			? (items.find((item) => item.value === value)?.label ?? placeholder ?? 'Select...')
			: (placeholder ?? 'Select...')
	);

	// Compute trigger class based on variant (if not explicitly provided)
	const computedTriggerClass = $derived(
		triggerClass ||
			(variant === 'invisible'
				? 'h-9 px-0 text-sm inline-flex items-center justify-between bg-transparent border-none min-w-[150px] [&>svg]:opacity-0 hover:[&>svg]:opacity-100 [&>svg]:transition-opacity'
				: 'h-9 w-32 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between')
	);
</script>

<!--
TypeScript Discriminated Unions + destructuring (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root bind:value={value as never} {...restProps}>
	<Select.Trigger class={computedTriggerClass} aria-label={placeholder}>
		{selectedLabel}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content
			class="z-50 max-h-96 w-[var(--bits-select-anchor-width)] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
			sideOffset={4}
			{...contentProps}
		>
			<Select.Viewport class="p-1">
				{#each items as { value, label, disabled } (value)}
					<Select.Item
						{value}
						{label}
						{disabled}
						class="relative flex h-9 w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
					>
						{#snippet children({ selected })}
							<span class="font-medium">{label}</span>
							{#if selected}
								<span class="ml-auto">✓</span>
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
		</Select.Content>
	</Select.Portal>
</Select.Root>
