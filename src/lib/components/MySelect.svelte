<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items: { value: string; label: string; disabled?: boolean }[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		triggerClass?: string;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		triggerClass = 'h-9 w-32 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between',
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(
		value ? items.find((item) => item.value === value)?.label : placeholder || 'Select...'
	);
</script>

<!--
TypeScript Discriminated Unions + destructuring (required for "bindable") do not
get along, so we shut typescript up by casting `value` to `never`, however,
from the perspective of the consumer of this component, it will be typed appropriately.
-->
<Select.Root bind:value={value as never} {...restProps}>
	<Select.Trigger class={triggerClass} aria-label={placeholder}>
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
