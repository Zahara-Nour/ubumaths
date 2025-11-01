<!--
	SRS Revisions - Deck List
	=========================

	Student page to view and access their SRS decks for review.

	Features:
	- List all decks (assigned + personal)
	- Filter by deck type
	- Quick access to study sessions
	- Create new personal decks
	- Statistics overview
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import DeckCard from '$lib/components/srs/DeckCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Plus, BookOpen, Trophy, Target } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { Deck } from '$lib/srs/types';

	interface Props {
		data: {
			decks: (Deck & { stats: { total_cards: number; due_cards: number; new_cards: number } })[];
		};
	}

	let { data }: Props = $props();

	// Transform decks to match DeckCard expected format
	const transformedDecks = $derived(
		data.decks.map((deck) => ({
			...deck,
			stats: {
				due_count: deck.stats.due_cards,
				total_cards: deck.stats.total_cards,
				new_count: deck.stats.new_cards,
				learning_count: 0 // Not available in old format
			}
		}))
	);

	// Derived state
	const assignedDecks = $derived(transformedDecks.filter((d) => d.isAssigned));
	const personalDecks = $derived(transformedDecks.filter((d) => !d.isAssigned));

	const totalDueCards = $derived(
		transformedDecks.reduce((sum, deck) => sum + (deck.stats?.due_count || 0), 0)
	);

	const totalCards = $derived(
		transformedDecks.reduce((sum, deck) => sum + (deck.stats?.total_cards || 0), 0)
	);

	/**
	 * Navigate to study session
	 */
	function startStudy(deckId: string) {
		goto(`/dashboard/revisions/decks/${deckId}/study`).then(() => {});
	}

	/**
	 * Navigate to create deck page
	 */
	function createDeck() {
		// TODO: Navigate to deck creation page
		goto('/dashboard/revisions/create').then(() => {});
	}
</script>

<svelte:head>
	<title>Révisions SRS - UbuMaths</title>
</svelte:head>

<div class="revisions-page">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold">Mes Révisions</h1>
				<p class="text-muted-foreground">Système de révision espacée pour mémoriser durablement</p>
			</div>

			<Button onclick={createDeck} size="lg">
				<Plus class="mr-2 h-5 w-5" />
				Nouveau deck
			</Button>
		</div>
	</div>

	<!-- Statistics Overview -->
	<div class="mb-8 grid gap-4 md:grid-cols-3">
		<!-- Total Decks -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Decks</Card.Title>
				<BookOpen class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.decks.length}</div>
				<p class="text-xs text-muted-foreground">
					{assignedDecks.length} attribué{assignedDecks.length > 1 ? 's' : ''}, {personalDecks.length}
					personnel{personalDecks.length > 1 ? 's' : ''}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Total Cards -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Cartes</Card.Title>
				<Target class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalCards}</div>
				<p class="text-xs text-muted-foreground">Dans tous vos decks</p>
			</Card.Content>
		</Card.Root>

		<!-- Due Today -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">À Réviser</Card.Title>
				<Trophy class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class={cn('text-2xl font-bold', totalDueCards > 0 && 'text-primary')}>
					{totalDueCards}
				</div>
				<p class="text-xs text-muted-foreground">
					{totalDueCards > 0 ? 'Commencez maintenant !' : 'Tout est à jour !'}
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Decks List with Tabs -->
	<Tabs defaultValue="all" class="w-full">
		<TabsList class="mb-6">
			<TabsTrigger value="all">Tous ({data.decks.length})</TabsTrigger>
			<TabsTrigger value="assigned">Attribués ({assignedDecks.length})</TabsTrigger>
			<TabsTrigger value="personal">Personnels ({personalDecks.length})</TabsTrigger>
		</TabsList>

		<!-- All Decks -->
		<TabsContent value="all">
			{#if data.decks.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-semibold">Aucun deck</h3>
						<p class="mb-4 text-muted-foreground">
							Commencez par créer votre premier deck de révision.
						</p>
						<Button onclick={createDeck}>
							<Plus class="mr-2 h-4 w-4" />
							Créer un deck
						</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each transformedDecks as deck (deck.id)}
						<DeckCard {deck} onclick={() => startStudy(deck.id)} />
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- Assigned Decks -->
		<TabsContent value="assigned">
			{#if assignedDecks.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<p class="text-muted-foreground">Aucun deck attribué par vos professeurs.</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each assignedDecks as deck (deck.id)}
						<DeckCard {deck} onclick={() => startStudy(deck.id)} />
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- Personal Decks -->
		<TabsContent value="personal">
			{#if personalDecks.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<p class="mb-4 text-muted-foreground">Vous n'avez pas encore créé de deck personnel.</p>
						<Button onclick={createDeck}>
							<Plus class="mr-2 h-4 w-4" />
							Créer un deck
						</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each personalDecks as deck (deck.id)}
						<DeckCard {deck} onclick={() => startStudy(deck.id)} />
					{/each}
				</div>
			{/if}
		</TabsContent>
	</Tabs>
</div>

<style>
	.revisions-page {
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
</style>
