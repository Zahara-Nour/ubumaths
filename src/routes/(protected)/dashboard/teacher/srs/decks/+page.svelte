<!--
	Teacher - SRS Decks Management
	===============================

	Teacher page to view and manage SRS decks.

	Features:
	- List all created decks
	- Filter by type (official/personal)
	- Quick actions (edit, assign, delete)
	- Create new deck button
	- Statistics overview
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Plus,
		BookOpen,
		MoreVertical,
		Edit,
		Send,
		Trash2,
		Sparkles,
		Lock,
		Users
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { Deck } from '$lib/srs/types';

	interface Props {
		data: {
			decks: (Deck & { stats: any })[];
		};
	}

	let { data }: Props = $props();

	// Derived state
	const officialDecks = $derived(data.decks.filter((d) => d.deckType === 'official'));
	const personalDecks = $derived(data.decks.filter((d) => d.deckType === 'personal'));
	const assignedDecks = $derived(data.decks.filter((d) => d.isAssigned));

	const totalDecks = $derived(data.decks.length);
	const totalCards = $derived(
		data.decks.reduce((sum, deck) => sum + (deck.stats?.total_cards || 0), 0)
	);

	/**
	 * Navigate to create deck
	 */
	function createDeck() {
		goto('/dashboard/teacher/srs/decks/create');
	}

	/**
	 * Navigate to assign deck
	 */
	function assignDeck(deckId: string) {
		goto(`/dashboard/teacher/srs/decks/${deckId}/assign`);
	}

	/**
	 * Navigate to edit deck
	 */
	function editDeck(deckId: string) {
		goto(`/dashboard/teacher/srs/decks/${deckId}/edit`);
	}

	/**
	 * Delete deck
	 */
	async function deleteDeck(deckId: string, deckName: string) {
		if (!confirm(`Êtes-vous sûr de vouloir supprimer le deck "${deckName}" ?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/srs/decks/${deckId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete deck');
			}

			toaster.success('Deck supprimé avec succès');
			await invalidate('app:data');
		} catch (error) {
			console.error('Error deleting deck:', error);
			toaster.error('Erreur lors de la suppression du deck');
		}
	}
</script>

<svelte:head>
	<title>Gestion des decks SRS - UbuMaths</title>
</svelte:head>

<div class="teacher-srs-decks-page">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold">Gestion des decks SRS</h1>
				<p class="text-muted-foreground">
					Créez et gérez vos decks de révision espacée pour vos élèves
				</p>
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
				<div class="text-2xl font-bold">{totalDecks}</div>
				<p class="text-xs text-muted-foreground">
					{officialDecks.length} officiel{officialDecks.length > 1 ? 's' : ''}, {personalDecks.length}
					personnel{personalDecks.length > 1 ? 's' : ''}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Total Cards -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Cartes</Card.Title>
				<Sparkles class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalCards}</div>
				<p class="text-xs text-muted-foreground">Dans tous vos decks</p>
			</Card.Content>
		</Card.Root>

		<!-- Assigned Decks -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Decks Attribués</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{assignedDecks.length}</div>
				<p class="text-xs text-muted-foreground">Envoyés à vos élèves</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Decks List with Tabs -->
	<Tabs defaultValue="all" class="w-full">
		<TabsList class="mb-6">
			<TabsTrigger value="all">Tous ({totalDecks})</TabsTrigger>
			<TabsTrigger value="official">Officiels ({officialDecks.length})</TabsTrigger>
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
					{#each data.decks as deck (deck.id)}
						<Card.Root class="relative transition-all duration-200 hover:shadow-lg">
							<Card.Header>
								<div class="flex items-start justify-between gap-3">
									<div class="flex-1">
										<Card.Title class="mb-2 flex items-center gap-2">
											{deck.name}

											{#if deck.deckType === 'official'}
												<Badge variant="secondary" class="gap-1">
													<Sparkles class="h-3 w-3" />
													Officiel
												</Badge>
											{/if}

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

									<!-- Actions Menu -->
									<DropdownMenu.Root>
										<DropdownMenu.Trigger asChild>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="sm">
													<MoreVertical class="h-4 w-4" />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											{#if deck.isAssigned}
												<DropdownMenu.Item onclick={() => goto(`/dashboard/teacher/srs/decks/${deck.id}/assignments`)}>
													<Users class="mr-2 h-4 w-4" />
													Voir les attributions
												</DropdownMenu.Item>

												<DropdownMenu.Separator />
											{/if}

											<DropdownMenu.Item onclick={() => assignDeck(deck.id)}>
												<Send class="mr-2 h-4 w-4" />
												{deck.isAssigned ? 'Attribuer à nouveau' : 'Attribuer'}
											</DropdownMenu.Item>

											{#if !deck.isAssigned}
												<DropdownMenu.Item onclick={() => editDeck(deck.id)}>
													<Edit class="mr-2 h-4 w-4" />
													Modifier
												</DropdownMenu.Item>

												<DropdownMenu.Separator />

												<DropdownMenu.Item
													onclick={() => deleteDeck(deck.id, deck.name)}
													class="text-destructive focus:text-destructive"
												>
													<Trash2 class="mr-2 h-4 w-4" />
													Supprimer
												</DropdownMenu.Item>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</div>
							</Card.Header>

							<Card.Content>
								<!-- Statistics -->
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-sm text-muted-foreground">Cartes</p>
										<p class="text-2xl font-bold">{deck.stats?.total_cards || 0}</p>
									</div>
									<div>
										<p class="text-sm text-muted-foreground">Rétention</p>
										<p class="text-2xl font-bold">
											{Math.round((deck.config?.desiredRetention || 0.9) * 100)}%
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- Official Decks -->
		<TabsContent value="official">
			{#if officialDecks.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<p class="text-muted-foreground">Aucun deck officiel créé.</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each officialDecks as deck (deck.id)}
						<Card.Root class="relative transition-all duration-200 hover:shadow-lg">
							<Card.Header>
								<Card.Title class="mb-2">{deck.name}</Card.Title>
								{#if deck.description}
									<Card.Description class="line-clamp-2">{deck.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content>
								<p class="text-sm text-muted-foreground">
									{deck.stats?.total_cards || 0} cartes
								</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</TabsContent>

		<!-- Personal Decks -->
		<TabsContent value="personal">
			{#if personalDecks.length === 0}
				<Card.Root>
					<Card.Content class="py-12 text-center">
						<p class="text-muted-foreground">Aucun deck personnel créé.</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each personalDecks as deck (deck.id)}
						<Card.Root class="relative transition-all duration-200 hover:shadow-lg">
							<Card.Header>
								<Card.Title class="mb-2">{deck.name}</Card.Title>
								{#if deck.description}
									<Card.Description class="line-clamp-2">{deck.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content>
								<p class="text-sm text-muted-foreground">
									{deck.stats?.total_cards || 0} cartes
								</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</TabsContent>
	</Tabs>
</div>

<style>
	.teacher-srs-decks-page {
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
