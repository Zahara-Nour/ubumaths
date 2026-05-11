<!--
	WorkInboxSection
	================
	A titled section of the student work inbox. Renders a header
	`{title} ({N})` followed by the list of `WorkItem` rows.

	Two modes:
	- Always-open (default): just a header + list, no toggle.
	- Collapsible: header is a button that toggles a Collapsible.Content.

	Visual variants:
	- `default`: standard section header.
	- `destructive`: red accent — used for "En retard".
	- `muted`: subdued items — used for "Fait cette semaine" (apply opacity
	  to the item list).
-->

<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible';
	import WorkItemCard from './WorkItemCard.svelte';
	import { ChevronDown, AlertTriangle } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { WorkItem } from '$lib/types/student-inbox';

	type SectionVariant = 'default' | 'destructive' | 'muted';

	interface Props {
		title: string;
		items: WorkItem[];
		variant?: SectionVariant;
		collapsible?: boolean;
		defaultOpen?: boolean;
	}

	let {
		title,
		items,
		variant = 'default',
		collapsible = false,
		defaultOpen = true
	}: Props = $props();

	// `defaultOpen` is read once at mount; subsequent changes from the parent
	// are intentionally ignored (matches the natural UX of "set the initial
	// open state, then let the user control it from inside").
	// svelte-ignore state_referenced_locally
	let open = $state(defaultOpen);

	// Tailwind classes applied to the section header. Destructive variant
	// pulls the eye with a colored border + icon; muted is reserved for
	// "Fait cette semaine".
	const headerClass = $derived.by(() => {
		if (variant === 'destructive') {
			return 'border-l-4 border-destructive pl-3 text-destructive';
		}
		if (variant === 'muted') {
			return 'text-muted-foreground';
		}
		return 'text-foreground';
	});

	const listClass = $derived(variant === 'muted' ? 'space-y-2 opacity-60' : 'space-y-2');
</script>

<section class="mb-8">
	{#if collapsible}
		<Collapsible.Root bind:open>
			<Collapsible.Trigger
				class={cn(
					'flex w-full items-center justify-between rounded-md py-2 text-left',
					'transition-colors hover:bg-muted/30',
					headerClass
				)}
			>
				<h2 class="flex items-center gap-2 text-lg font-semibold">
					{#if variant === 'destructive'}
						<AlertTriangle class="h-5 w-5 flex-shrink-0" />
					{/if}
					<span>{title} ({items.length})</span>
				</h2>
				<ChevronDown
					class="h-4 w-4 flex-shrink-0 transition-transform duration-200"
					style={open ? 'transform: rotate(180deg);' : ''}
				/>
			</Collapsible.Trigger>
			<Collapsible.Content class="pt-3">
				<div class={listClass}>
					{#each items as item (`${item.source}:${item.itemId}`)}
						<WorkItemCard {item} />
					{/each}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	{:else}
		<header class={cn('mb-3 py-2', headerClass)}>
			<h2 class="flex items-center gap-2 text-lg font-semibold">
				{#if variant === 'destructive'}
					<AlertTriangle class="h-5 w-5 flex-shrink-0" />
				{/if}
				<span>{title} ({items.length})</span>
			</h2>
		</header>
		<div class={listClass}>
			{#each items as item (`${item.source}:${item.itemId}`)}
				<WorkItemCard {item} />
			{/each}
		</div>
	{/if}
</section>
