<!--
	Student - Create Personal SRS Deck
	===================================

	Student page to create a personal SRS deck for self-study.

	Features:
	- Create personal deck
	- Add custom cards
	- Configure FSRS settings
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import CustomCardEditor from '$lib/components/srs/CustomCardEditor.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Save, Plus, Trash2, ArrowLeft, BookOpen } from 'lucide-svelte';
	import { RETENTION_PROFILES } from '$lib/srs/config';
	import type { CreateDeckRequest, CreateCardRequest } from '$lib/srs/types';
	import type { TemplateMarkdown } from '$lib/custom-markdown';

	// State
	let deckName = $state('');
	let deckDescription = $state('');
	let retentionProfile = $state<keyof typeof RETENTION_PROFILES>('balanced');

	let isSaving = $state(false);
	let showCustomCardEditor = $state(false);

	// Cards to add
	let pendingCards = $state<
		Array<{
			type: 'custom';
			data: {
				frontContent: TemplateMarkdown;
				backContent: TemplateMarkdown;
			};
		}>
	>([]);

	// Form validation
	const canSave = $derived(deckName.trim().length > 0);

	/**
	 * Create deck
	 */
	async function createDeck() {
		if (!canSave || isSaving) return;

		isSaving = true;

		try {
			// Create deck
			const deckRequest: CreateDeckRequest = {
				name: deckName.trim(),
				description: deckDescription.trim() || undefined,
				deckType: 'personal',
				config: {
					desiredRetention: RETENTION_PROFILES[retentionProfile]
				}
			};

			const deckResponse = await fetch('/api/srs/decks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(deckRequest)
			});

			if (!deckResponse.ok) {
				throw new Error('Failed to create deck');
			}

			const { deck } = await deckResponse.json();

			// Add pending cards
			for (const card of pendingCards) {
				try {
					const cardRequest: CreateCardRequest = {
						deckId: deck.id,
						cardType: 'custom',
						frontContent: card.data.frontContent,
						backContent: card.data.backContent
					};

					const cardResponse = await fetch('/api/srs/cards', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(cardRequest)
					});

					if (!cardResponse.ok) {
						console.error('Failed to add card:', await cardResponse.text());
					}
				} catch (error) {
					console.error('Error adding card:', error);
				}
			}

			toaster.success(`Deck "${deck.name}" créé avec succès !`);
			goto('/dashboard/revisions').then(() => {});
		} catch (error) {
			console.error('Error creating deck:', error);
			toaster.error('Erreur lors de la création du deck');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Add custom card
	 */
	async function handleSaveCustomCard(
		frontContent: TemplateMarkdown,
		backContent: TemplateMarkdown
	) {
		pendingCards.push({
			type: 'custom',
			data: { frontContent, backContent }
		});

		showCustomCardEditor = false;
		toaster.success('Carte ajoutée');
	}

	/**
	 * Remove card from pending list
	 */
	function removeCard(index: number) {
		pendingCards.splice(index, 1);
	}

	/**
	 * Navigate back
	 */
	function goBack() {
		goto('/dashboard/revisions').then(() => {});
	}
</script>

<svelte:head>
	<title>Créer un deck - UbuMaths</title>
</svelte:head>

<div class="create-deck-page">
	<!-- Header -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour
		</Button>

		<h1 class="mb-2 text-3xl font-bold">Créer un deck personnel</h1>
		<p class="text-muted-foreground">
			Créez votre propre deck de révision avec des cartes personnalisées
		</p>
	</div>

	<!-- Deck Configuration -->
	<div class="mb-6 grid gap-6 lg:grid-cols-3">
		<!-- Main Form -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Informations du deck</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Deck Name -->
					<div class="space-y-2">
						<Label for="deck-name">Nom du deck *</Label>
						<Input
							id="deck-name"
							bind:value={deckName}
							placeholder="Ex: Mes formules de physique"
						/>
					</div>

					<!-- Description -->
					<div class="space-y-2">
						<Label for="deck-description">Description (optionnel)</Label>
						<Textarea
							id="deck-description"
							bind:value={deckDescription}
							placeholder="Décrivez le contenu du deck..."
							rows={3}
						/>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Settings -->
		<div>
			<Card.Root>
				<Card.Header>
					<Card.Title>Paramètres</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="retention-profile">Intensité de révision</Label>
						<MySelect
							type="single"
							bind:value={retentionProfile}
							items={[
								{ value: 'relaxed', label: 'Détendu (80%)' },
								{ value: 'balanced', label: 'Équilibré (90%)' },
								{ value: 'high', label: 'Élevé (95%)' },
								{ value: 'expert', label: 'Expert (97%)' }
							]}
							placeholder="Sélectionnez"
							triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
						<p class="text-xs text-muted-foreground">
							Plus le taux est élevé, plus vous aurez de révisions
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Cards Management -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Cartes du deck</Card.Title>
					<Card.Description>
						{pendingCards.length} carte{pendingCards.length > 1 ? 's' : ''} ajoutée{pendingCards.length >
						1
							? 's'
							: ''}
					</Card.Description>
				</div>

				<Button onclick={() => (showCustomCardEditor = true)} size="sm">
					<Plus class="mr-2 h-4 w-4" />
					Ajouter une carte
				</Button>
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Custom Card Editor -->
			{#if showCustomCardEditor}
				<div class="mb-6 rounded-lg border-2 border-primary p-4">
					<h3 class="mb-4 text-lg font-semibold">Nouvelle carte</h3>
					<CustomCardEditor
						onSave={handleSaveCustomCard}
						onCancel={() => (showCustomCardEditor = false)}
					/>
				</div>
			{/if}

			<!-- Pending Cards List -->
			{#if pendingCards.length === 0}
				<div class="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
					<BookOpen class="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
					<p class="text-muted-foreground">Aucune carte ajoutée</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Cliquez sur "Ajouter une carte" pour commencer
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each pendingCards as _card, i (i)}
						<div class="flex items-center justify-between rounded-lg border bg-card p-3">
							<div class="flex items-center gap-3">
								<Badge variant="secondary">Personnalisée</Badge>
								<span class="text-sm">Carte #{i + 1}</span>
							</div>

							<Button onclick={() => removeCard(i)} variant="ghost" size="sm">
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<div class="mt-6 flex items-center justify-between">
		<Button onclick={goBack} variant="outline">Annuler</Button>

		<Button onclick={createDeck} disabled={!canSave || isSaving} size="lg">
			<Save class="mr-2 h-5 w-5" />
			{isSaving ? 'Création...' : 'Créer le deck'}
		</Button>
	</div>
</div>

<style>
	.create-deck-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
