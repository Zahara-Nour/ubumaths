<!--
	InboxWidget
	===========
	Home-dashboard widget that surfaces the most-urgent work items for a student.
	Shows up to `maxItems` items drawn first from `inbox.late`, then `inbox.thisWeek`.

	The widget intentionally shows only urgent items (late + this week). Students who
	only have later/noDeadline items get a calm "nothing urgent" message to avoid
	anxiety. The "Voir tout" link always reveals the full inbox.
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ListTodo, Inbox } from '@lucide/svelte';
	import WorkItemCard from './WorkItemCard.svelte';
	import { resolve } from '$app/paths';
	import type { StudentWorkInbox } from '$lib/types/student-inbox';

	interface Props {
		inbox: StudentWorkInbox;
		maxItems?: number;
	}

	let { inbox, maxItems = 5 }: Props = $props();

	// Late items take priority; fill remaining slots from this week
	const urgentItems = $derived([...inbox.late, ...inbox.thisWeek].slice(0, maxItems));

	const totalCount = $derived(
		inbox.late.length +
			inbox.thisWeek.length +
			inbox.later.length +
			inbox.noDeadline.length +
			inbox.doneRecently.length
	);

	// Non-urgent means the student has work but nothing pressing
	const hasNonUrgentOnly = $derived(urgentItems.length === 0 && totalCount > 0);

	// Pre-computed to avoid a multi-expression text node — prettier was breaking
	// `{totalCount} {ternary}` interpolations across multiple lines, which made
	// the rendered DOM text contain a literal newline between number and noun.
	const nonUrgentMessage = $derived(
		`Rien d'urgent ! Tu as ${totalCount} ${totalCount > 1 ? 'éléments' : 'élément'} en cours.`
	);
</script>

<Card.Root>
	<!-- Widget header with total count badge and "see all" link -->
	<Card.Header class="pb-3">
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<ListTodo class="h-5 w-5 text-muted-foreground" />
				<Card.Title class="text-base">Mon travail</Card.Title>
			</div>
			{#if totalCount > 0}
				<Button
					href={resolve('/dashboard/student/work' as '/')}
					variant="ghost"
					size="sm"
					class="text-xs text-muted-foreground hover:text-foreground"
				>
					Voir tout ({totalCount})
				</Button>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="pt-0">
		{#if urgentItems.length > 0}
			<!-- Urgent items: late first, then this week -->
			<div class="flex flex-col gap-2">
				{#each urgentItems as item (item.source + ':' + item.itemId)}
					<WorkItemCard {item} />
				{/each}
			</div>
		{:else if hasNonUrgentOnly}
			<!-- Has work, but nothing with an imminent deadline -->
			<p class="py-4 text-sm text-muted-foreground">
				<span>{nonUrgentMessage}</span>
				<a
					href={resolve('/dashboard/student/work' as '/')}
					class="font-medium text-foreground underline underline-offset-2 hover:no-underline"
				>
					Voir tout
				</a>
			</p>
		{:else}
			<!-- Completely empty inbox -->
			<div class="flex items-center gap-3 py-4 text-sm text-muted-foreground">
				<Inbox class="h-5 w-5 shrink-0 opacity-50" />
				<span>Rien d'assigné pour le moment.</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
