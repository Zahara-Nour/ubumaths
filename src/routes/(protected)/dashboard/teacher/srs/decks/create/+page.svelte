<!--
	Teacher - Create SRS Deck
	=========================

	Teacher page to create a new SRS deck and add cards.

	Features:
	- Create deck with name/description
	- Add template cards from question bank
	- Add custom cards
	- Configure FSRS settings
	- Save and assign to students
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import CustomCardEditor from '$lib/components/srs/CustomCardEditor.svelte';
	import TemplateSelector from '$lib/components/srs/TemplateSelector.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Save, Plus, Trash2, BookOpen, ArrowLeft } from 'lucide-svelte';
	import { RETENTION_PROFILES } from '$lib/srs/config';
	import type { CreateDeckRequest, CreateCardRequest } from '$lib/srs/types';
	import type { TemplateMarkdown } from '$lib/ubumark';

	// Card data types
	type TemplateCardData = {
		templateId: string;
		title: string;
	};

	type CustomCardData = {
		frontContent: TemplateMarkdown;
		backContent: TemplateMarkdown;
		title: string;
	};

	type PendingCard =
		| {
				type: 'template';
				data: TemplateCardData;
		  }
		| {
				type: 'custom';
				data: CustomCardData;
		  };

	// State
	let deckName = $state('');
	let deckDescription = $state('');
	let deckType = $state<'official' | 'personal'>('official');
	let retentionProfile = $state<keyof typeof RETENTION_PROFILES>('balanced');

	let isSaving = $state(false);
	let showCustomCardEditor = $state(false);
	let showTemplateSelector = $state(false);

	// Cards to add
	let pendingCards = $state<PendingCard[]>([]);

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
				deckType,
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
						cardType: card.type,
						...(card.type === 'template'
							? { templateId: card.data.templateId }
							: {
									frontContent: card.data.frontContent,
									backContent: card.data.backContent
								})
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
			goto(`/dashboard/teacher/srs/decks/${deck.id}/assign`).then(() => {});
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
			data: { frontContent, backContent, title: 'Carte personnalisée' }
		});

		showCustomCardEditor = false;
		toaster.success('Carte personnalisée ajoutée');
	}

	/**
	 * Add template cards from question bank
	 */
	async function handleSelectTemplates(templateIds: string[]) {
		try {
			// Fetch template details for display
			const response = await fetch('/api/questions/templates?limit=100');
			const data = await response.json();
			const templates = data.templates || [];

			// Add each template to pending cards
			templateIds.forEach((templateId) => {
				const template = templates.find((t: { id: string; title?: string }) => t.id === templateId);
				pendingCards.push({
					type: 'template',
					data: {
						templateId,
						title: template?.title || `Template ${templateId.slice(0, 8)}`
					}
				});
			});

			showTemplateSelector = false;
			toaster.success(
				`${templateIds.length} question${templateIds.length > 1 ? 's' : ''} ajoutée${templateIds.length > 1 ? 's' : ''}`
			);
		} catch (error) {
			console.error('Error fetching template details:', error);
			// Fallback: add with generic titles
			templateIds.forEach((templateId) => {
				pendingCards.push({
					type: 'template',
					data: { templateId, title: `Template ${templateId.slice(0, 8)}` }
				});
			});
			showTemplateSelector = false;
		}
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
		goto('/dashboard/teacher/srs/decks').then(() => {});
	}
</script>

<svelte:head>
	<title>Créer un deck SRS - UbuMaths</title>
</svelte:head>

<div class="create-deck-page">
	<!-- Header -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour
		</Button>

		<h1 class="mb-2 text-3xl font-bold">Créer un deck SRS</h1>
		<p class="text-muted-foreground">Créez un deck de révision espacée pour vos élèves</p>
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
							placeholder="Ex: Équations du second degré"
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

					<!-- Deck Type -->
					<div class="space-y-2">
						<Label for="deck-type">Type de deck</Label>
						<select
							id="deck-type"
							bind:value={deckType}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							<option value="official">Officiel</option>
							<option value="personal">Personnel</option>
						</select>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Settings -->
		<div>
			<Card.Root>
				<Card.Header>
					<Card.Title>Paramètres FSRS</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="retention-profile">Profil de rétention</Label>
						<select
							id="retention-profile"
							bind:value={retentionProfile}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						>
							<option value="relaxed">Détendu (80%)</option>
							<option value="balanced">Équilibré (90%)</option>
							<option value="high">Élevé (95%)</option>
							<option value="expert">Expert (97%)</option>
						</select>
						<p class="text-xs text-muted-foreground">
							Taux de rétention souhaité : {RETENTION_PROFILES[retentionProfile] * 100}%
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

				<div class="flex gap-2">
					<Button onclick={() => (showTemplateSelector = true)} size="sm" variant="default">
						<Plus class="mr-2 h-4 w-4" />
						Depuis la banque
					</Button>
					<Button onclick={() => (showCustomCardEditor = true)} size="sm" variant="outline">
						<Plus class="mr-2 h-4 w-4" />
						Carte personnalisée
					</Button>
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Template Selector -->
			{#if showTemplateSelector}
				<div class="mb-6 rounded-lg border-2 border-primary p-4">
					<TemplateSelector
						onSelect={handleSelectTemplates}
						onCancel={() => (showTemplateSelector = false)}
					/>
				</div>
			{/if}

			<!-- Custom Card Editor -->
			{#if showCustomCardEditor}
				<div class="mb-6 rounded-lg border-2 border-primary p-4">
					<h3 class="mb-4 text-lg font-semibold">Nouvelle carte personnalisée</h3>
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
						Utilisez les boutons ci-dessus pour ajouter des questions de la banque ou créer des
						cartes personnalisées
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each pendingCards as card, i (i)}
						<div class="flex items-center justify-between rounded-lg border bg-card p-3">
							<div class="flex items-center gap-3">
								<Badge variant={card.type === 'template' ? 'default' : 'secondary'}>
									{card.type === 'template' ? 'Banque' : 'Personnalisée'}
								</Badge>
								<span class="text-sm">
									{#if card.type === 'template'}
										{card.data.title}
									{:else}
										Carte personnalisée
									{/if}
								</span>
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
