<!--
	ChecklistSection Component
	==========================

	Checklist for student self-assessment.
	Shows list of items with MyCheckbox,
	strikethrough when completed, progress indicator at top.

	@module components/cours/ChecklistSection
-->
<script lang="ts">
	import type { ChapterChecklistItem, ChapterProgress } from '$lib/types/chapters';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import { CheckCircle2, Circle, Target } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	// Item with progress included
	type ChecklistItemWithProgress = ChapterChecklistItem & {
		isCompleted: boolean;
		completedAt: string | null;
	};

	// Props
	interface Props {
		items: ChecklistItemWithProgress[];
		progress: ChapterProgress;
	}

	let { items, progress: _progress }: Props = $props();

	// Calculate completion statistics
	const completedCount = $derived(items.filter((item) => item.isCompleted).length);
	const totalCount = $derived(items.length);
	const progressPercent = $derived(
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
	);

	// Sort items by display order
	const sortedItems = $derived([...items].sort((a, b) => a.displayOrder - b.displayOrder));

	// Optimistic update state
	let optimisticUpdates = $state<Record<string, boolean>>({});

	// Check if an item is completed (with optimistic updates)
	function isItemCompleted(item: ChecklistItemWithProgress): boolean {
		if (item.id in optimisticUpdates) {
			return optimisticUpdates[item.id];
		}
		return item.isCompleted;
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Target class="h-5 w-5 text-primary" />
				<Card.Title>Objectifs du chapitre</Card.Title>
			</div>
			<span class="text-sm text-muted-foreground">
				{completedCount}/{totalCount} complete{completedCount > 1 ? 's' : ''}
			</span>
		</div>

		<!-- Progress bar -->
		<div class="mt-4 space-y-2">
			<div class="flex items-center justify-between text-sm">
				<span class="text-muted-foreground">Progression</span>
				<span
					class={cn(
						'font-medium',
						progressPercent >= 80
							? 'text-green-600 dark:text-green-400'
							: progressPercent >= 50
								? 'text-orange-600 dark:text-orange-400'
								: 'text-muted-foreground'
					)}
				>
					{progressPercent}%
				</span>
			</div>
			<Progress value={progressPercent} max={100} class="h-2" />
		</div>
	</Card.Header>

	<Card.Content class="pt-0">
		{#if sortedItems.length === 0}
			<p class="py-4 text-center text-sm text-muted-foreground">
				Aucun objectif defini pour ce chapitre.
			</p>
		{:else}
			<ul class="space-y-3">
				{#each sortedItems as item (item.id)}
					{@const completed = isItemCompleted(item)}
					<li
						class={cn(
							'flex items-start gap-3 rounded-lg p-3 transition-all',
							completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/50 hover:bg-muted'
						)}
					>
						<form
							method="POST"
							action="?/toggleChecklist"
							use:enhance={() => {
								// Optimistic update
								optimisticUpdates[item.id] = !completed;
								return async ({ update }) => {
									await update();
									// Clear optimistic state after server response
									delete optimisticUpdates[item.id];
								};
							}}
						>
							<input type="hidden" name="checklistItemId" value={item.id} />
							<input type="hidden" name="isCompleted" value={!completed} />
							<MyCheckbox
								checked={completed}
								onCheckedChange={() => {
									// Trigger form submission
									const form = document
										.querySelector(`form[action="?/toggleChecklist"] input[value="${item.id}"]`)
										?.closest('form');
									form?.requestSubmit();
								}}
								class="mt-0.5"
							/>
						</form>

						<div class="min-w-0 flex-1">
							<p
								class={cn(
									'text-sm font-medium transition-all',
									completed && 'text-muted-foreground line-through'
								)}
							>
								{item.content}
							</p>

							{#if item.description}
								<p class={cn('mt-1 text-xs text-muted-foreground', completed && 'line-through')}>
									{item.description}
								</p>
							{/if}
						</div>

						<!-- Status icon -->
						<div class="flex-shrink-0">
							{#if completed}
								<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
							{:else}
								<Circle class="h-5 w-5 text-muted-foreground/50" />
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card.Content>

	<!-- Summary footer when all complete -->
	{#if completedCount === totalCount && totalCount > 0}
		<Card.Footer class="rounded-b-xl bg-green-50 dark:bg-green-900/20">
			<div class="flex items-center gap-2 text-green-700 dark:text-green-300">
				<CheckCircle2 class="h-5 w-5" />
				<span class="font-medium">Tous les objectifs sont atteints !</span>
			</div>
		</Card.Footer>
	{/if}
</Card.Root>
