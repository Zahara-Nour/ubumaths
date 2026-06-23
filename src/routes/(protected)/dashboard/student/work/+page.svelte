<!--
	Student Work Inbox — Page
	==========================
	Single unified surface aggregating assigned work across the four delivery
	systems (assessments, exercises a l'unite, worksheets, python). Data is
	pre-bucketed server-side by `getStudentWorkInbox` into 5 sections; this
	page just chooses which to render and how to style them.

	Section visibility rules (from spec):
	- Each section is hidden when its bucket is empty.
	- "Sans échéance" is collapsed by default, but auto-expands when it's the
	  only populated section (E2).
	- "Fait cette semaine" is always collapsed (default).
	- When ALL 5 sections are empty: dedicated empty state with practice CTAs.
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Inbox, BookOpen, Code } from '@lucide/svelte';
	import WorkInboxSection from '$lib/components/student-inbox/WorkInboxSection.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const inbox = $derived(data.inbox);

	// Section emptiness flags. Re-computed reactively when the inbox changes
	// (today only after a navigation reload, but cheap to keep reactive).
	const hasLate = $derived(inbox.late.length > 0);
	const hasThisWeek = $derived(inbox.thisWeek.length > 0);
	const hasLater = $derived(inbox.later.length > 0);
	const hasNoDeadline = $derived(inbox.noDeadline.length > 0);
	const hasDoneRecently = $derived(inbox.doneRecently.length > 0);

	const totalCount = $derived(
		inbox.late.length +
			inbox.thisWeek.length +
			inbox.later.length +
			inbox.noDeadline.length +
			inbox.doneRecently.length
	);

	// E2: when the inbox only contains "Sans échéance" items, auto-expand
	// that section so the user sees their work without having to click.
	const isOnlyNoDeadline = $derived(
		hasNoDeadline && !hasLate && !hasThisWeek && !hasLater && !hasDoneRecently
	);

	const isEmpty = $derived(totalCount === 0);
</script>

<svelte:head>
	<title>Mon travail | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Mon travail</h1>
		{#if !isEmpty}
			<p class="mt-2 text-muted-foreground">
				{totalCount} élément{totalCount > 1 ? 's' : ''} au total
			</p>
		{/if}
	</div>

	{#if isEmpty}
		<!-- E1: empty state — centered card with practice suggestions -->
		<Card.Root class="border-dashed">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<Inbox class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
					<h2 class="text-xl font-semibold text-foreground">Rien d'assigné pour le moment</h2>
					<p class="mt-2 text-sm text-muted-foreground">Profitez-en pour vous entraîner !</p>
					<div class="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Button href="/dashboard/student/exercises" variant="default">
							<BookOpen class="mr-2 h-4 w-4" />
							Pratique d'exercices
						</Button>
						<Button href="/python-exercises" variant="outline">
							<Code class="mr-2 h-4 w-4" />
							Exercices Python
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Section 1: En retard (red accent, hidden when empty) -->
		{#if hasLate}
			<WorkInboxSection title="En retard" items={inbox.late} variant="destructive" />
		{/if}

		<!-- Section 2: Cette semaine -->
		{#if hasThisWeek}
			<WorkInboxSection title="Cette semaine" items={inbox.thisWeek} />
		{/if}

		<!-- Section 3: Plus tard -->
		{#if hasLater}
			<WorkInboxSection title="Plus tard" items={inbox.later} />
		{/if}

		<!-- Section 4: Sans échéance (collapsed by default, auto-expand if only section) -->
		{#if hasNoDeadline}
			<WorkInboxSection
				title="Sans échéance"
				items={inbox.noDeadline}
				collapsible
				defaultOpen={isOnlyNoDeadline}
			/>
		{/if}

		<!-- Section 5: Fait cette semaine (collapsed, muted) -->
		{#if hasDoneRecently}
			<WorkInboxSection
				title="Fait cette semaine"
				items={inbox.doneRecently}
				variant="muted"
				collapsible
				defaultOpen={false}
			/>
		{/if}
	{/if}
</div>
