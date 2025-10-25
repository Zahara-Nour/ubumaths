<!--
	DeckCard Component
	==================

	Display a deck with statistics for the deck list.

	Features:
	- Deck name and description
	- Statistics (total cards, due count, new cards, etc.)
	- Visual indicators for deck type (official/personal) and assignment status
	- Click to study or manage

	Props:
	- deck: Deck object with stats
	- onclick: Callback when card is clicked
	- showAssignmentBadge: Show "Attribué" badge for assigned decks
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { BookOpen, Clock, Sparkles, Lock } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { Deck } from '$lib/srs/types';

	interface Props {
		deck: Deck & { stats?: { new: number; learning: number; due: number } };
		onclick?: () => void;
		showActions?: boolean;
	}

	let { deck, onclick, showActions = true }: Props = $props();

	const stats = $derived(deck.stats || {});
	const dueCount = $derived(stats.due_count || 0);
	const totalCards = $derived(stats.total_cards || 0);
	const newCount = $derived(stats.new_count || 0);
	const learningCount = $derived(stats.learning_count || 0);

	const hasDueCards = $derived(dueCount > 0);
	const isEmpty = $derived(totalCards === 0);
</script>

<Card.Root
	class={cn(
		'deck-card group relative transition-all duration-200 hover:shadow-lg',
		onclick && 'cursor-pointer',
		hasDueCards && 'border-primary/50',
		deck.isAssigned && 'bg-muted/30'
	)}
	{onclick}
>
	<Card.Header>
		<div class="flex items-start justify-between gap-3">
			<div class="flex-1">
				<Card.Title class="mb-2 flex items-center gap-2">
					{deck.name}

					<!-- Deck Type Badge -->
					{#if deck.deckType === 'official'}
						<Badge variant="secondary" class="gap-1">
							<Sparkles class="h-3 w-3" />
							Officiel
						</Badge>
					{/if}

					<!-- Assignment Badge -->
					{#if deck.isAssigned}
						<Badge variant="outline" class="gap-1">
							<Lock class="h-3 w-3" />
							Attribué
						</Badge>
					{/if}
				</Card.Title>

				{#if deck.description}
					<Card.Description class="line-clamp-2">{deck.description}</Card.Description>
				{/if}
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		<!-- Statistics Grid -->
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<!-- Total Cards -->
			<div class="stat-item">
				<div class="flex items-center gap-2 text-muted-foreground">
					<BookOpen class="h-4 w-4" />
					<span class="text-sm">Total</span>
				</div>
				<p class="mt-1 text-2xl font-bold">{totalCards}</p>
			</div>

			<!-- Due Cards -->
			<div class="stat-item">
				<div class="flex items-center gap-2 text-muted-foreground">
					<Clock class="h-4 w-4" />
					<span class="text-sm">À réviser</span>
				</div>
				<p
					class={cn(
						'mt-1 text-2xl font-bold',
						hasDueCards && 'text-primary',
						dueCount === 0 && 'text-muted-foreground'
					)}
				>
					{dueCount}
				</p>
			</div>

			<!-- New Cards -->
			<div class="stat-item">
				<div class="flex items-center gap-2 text-muted-foreground">
					<span class="text-sm">Nouvelles</span>
				</div>
				<p class="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{newCount}</p>
			</div>

			<!-- Learning Cards -->
			<div class="stat-item">
				<div class="flex items-center gap-2 text-muted-foreground">
					<span class="text-sm">En cours</span>
				</div>
				<p class="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
					{learningCount}
				</p>
			</div>
		</div>

		<!-- Empty State -->
		{#if isEmpty}
			<div class="mt-4 rounded-lg border-2 border-dashed border-muted bg-muted/20 p-4 text-center">
				<p class="text-sm text-muted-foreground">Aucune carte dans ce deck</p>
			</div>
		{/if}

		<!-- Action Button -->
		{#if showActions && !isEmpty}
			<div class="mt-4 flex gap-2">
				{#if hasDueCards}
					<Button class="flex-1" size="lg">
						Réviser maintenant ({dueCount})
					</Button>
				{:else}
					<Button variant="outline" class="flex-1" disabled>Aucune carte à réviser</Button>
				{/if}
			</div>
		{/if}
	</Card.Content>

	<!-- Due Cards Indicator (visual accent) -->
	{#if hasDueCards}
		<div
			class="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-primary transition-all duration-300 group-hover:w-2"
		></div>
	{/if}
</Card.Root>

<style>
	.deck-card {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.stat-item {
		display: flex;
		flex-direction: column;
	}
</style>
