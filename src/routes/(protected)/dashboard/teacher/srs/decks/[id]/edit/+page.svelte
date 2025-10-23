<!--
	Teacher - Edit SRS Deck
	=======================

	Teacher page to edit an existing SRS deck.

	Features:
	- Edit deck name, description, config
	- Add/remove cards
	- Save changes
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import CustomCardEditor from '$lib/components/srs/CustomCardEditor.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Save, Plus, Trash2, ArrowLeft, Sparkles, BookOpen } from 'lucide-svelte';
	import { RETENTION_PROFILES } from '$lib/srs/config';
	import type { ContentField } from '$lib/questions/types';

	interface Props {
		data: {
			deck: any;
			cards: any[];
		};
	}

	let { data }: Props = $props();

	// State
	let deckName = $state(data.deck.name);
	let deckDescription = $state(data.deck.description || '');
	let deckType = $state<'official' | 'personal'>(data.deck.deckType);
	let retentionProfile = $state<keyof typeof RETENTION_PROFILES>(
		getRetentionProfile(data.deck.config?.desiredRetention || 0.9)
	);

	let isSaving = $state(false);
	let showCustomCardEditor = $state(false);
	let cards = $state([...data.cards]);

	// Form validation
	const canSave = $derived(deckName.trim().length > 0);
	const hasChanges = $derived(
		deckName !== data.deck.name ||
			deckDescription !== (data.deck.description || '') ||
			deckType !== data.deck.deckType ||
			RETENTION_PROFILES[retentionProfile] !== (data.deck.config?.desiredRetention || 0.9) ||
			cards.length !== data.cards.length
	);

	/**
	 * Get retention profile from value
	 */
	function getRetentionProfile(value: number): keyof typeof RETENTION_PROFILES {
		const entries = Object.entries(RETENTION_PROFILES) as [
			keyof typeof RETENTION_PROFILES,
			number
		][];
		const found = entries.find(([_, v]) => Math.abs(v - value) < 0.01);
		return found ? found[0] : 'balanced';
	}

	/**
	 * Save deck changes
	 */
	async function saveDeck() {
		if (!canSave || isSaving) return;

		isSaving = true;

		try {
			// Update deck metadata
			const updateResponse = await fetch(`/api/srs/decks/${data.deck.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: deckName.trim(),
					description: deckDescription.trim() || undefined,
					config: {
						desiredRetention: RETENTION_PROFILES[retentionProfile]
					}
				})
			});

			if (!updateResponse.ok) {
				throw new Error('Failed to update deck');
			}

			toaster.success('Deck mis à jour avec succès');
			await invalidate('app:data');
			goto('/dashboard/teacher/srs/decks');
		} catch (error) {
			console.error('Error saving deck:', error);
			toaster.error('Erreur lors de la mise à jour du deck');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Add custom card
	 */
	async function handleSaveCustomCard(frontContent: ContentField[], backContent: ContentField[]) {
		try {
			const response = await fetch('/api/srs/cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					deckId: data.deck.id,
					cardType: 'custom',
					frontContent,
					backContent
				})
			});

			if (!response.ok) {
				throw new Error('Failed to add card');
			}

			const { card } = await response.json();
			cards.push(card);
			showCustomCardEditor = false;
			toaster.success('Carte ajoutée avec succès');
		} catch (error) {
			console.error('Error adding card:', error);
			toaster.error("Erreur lors de l'ajout de la carte");
		}
	}

	/**
	 * Delete card
	 */
	async function deleteCard(cardId: string, index: number) {
		if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
			return;
		}

		try {
			const response = await fetch(`/api/srs/cards/${cardId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete card');
			}

			cards.splice(index, 1);
			toaster.success('Carte supprimée avec succès');
		} catch (error) {
			console.error('Error deleting card:', error);
			toaster.error('Erreur lors de la suppression de la carte');
		}
	}

	/**
	 * Navigate back
	 */
	function goBack() {
		if (hasChanges) {
			if (
				!confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?')
			) {
				return;
			}
		}
		goto('/dashboard/teacher/srs/decks');
	}
</script>

<svelte:head>
	<title>Éditer deck SRS - UbuMaths</title>
</svelte:head>

<div class="edit-deck-page">
	<!-- Header -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour
		</Button>

		<h1 class="mb-2 text-3xl font-bold">Éditer le deck</h1>
		<p class="text-muted-foreground">Modifiez les informations et le contenu du deck</p>
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

					<!-- Deck Type (read-only for editing) -->
					<div class="space-y-2">
						<Label>Type de deck</Label>
						<div class="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
							{#if deckType === 'official'}
								<Sparkles class="h-4 w-4" />
								<span>Officiel</span>
							{:else}
								<BookOpen class="h-4 w-4" />
								<span>Personnel</span>
							{/if}
							<Badge variant="outline" class="ml-auto">Non modifiable</Badge>
						</div>
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
						<Select.Root bind:selected={retentionProfile}>
							<Select.Trigger id="retention-profile">
								<Select.Value placeholder="Sélectionnez un profil" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="relaxed">Détendu (80%)</Select.Item>
								<Select.Item value="balanced">Équilibré (90%)</Select.Item>
								<Select.Item value="high">Élevé (95%)</Select.Item>
								<Select.Item value="expert">Expert (97%)</Select.Item>
							</Select.Content>
						</Select.Root>
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
						{cards.length} carte{cards.length > 1 ? 's' : ''}
					</Card.Description>
				</div>

				<Button onclick={() => (showCustomCardEditor = true)} size="sm">
					<Plus class="mr-2 h-4 w-4" />
					Carte personnalisée
				</Button>
			</div>
		</Card.Header>

		<Card.Content>
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

			<!-- Cards List -->
			{#if cards.length === 0}
				<div class="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
					<BookOpen class="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
					<p class="text-muted-foreground">Aucune carte dans ce deck</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Ajoutez des cartes personnalisées ou depuis la banque de questions
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each cards as card, i (card.id)}
						<div class="flex items-center justify-between rounded-lg border bg-card p-3">
							<div class="flex items-center gap-3">
								<Badge variant={card.card_type === 'template' ? 'default' : 'secondary'}>
									{card.card_type === 'template' ? 'Template' : 'Personnalisée'}
								</Badge>
								<span class="text-sm">
									{#if card.card_type === 'template'}
										Template ID: {card.template_id}
									{:else}
										Carte personnalisée
									{/if}
								</span>
							</div>

							<Button onclick={() => deleteCard(card.id, i)} variant="ghost" size="sm">
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

		<Button onclick={saveDeck} disabled={!canSave || isSaving || !hasChanges} size="lg">
			<Save class="mr-2 h-5 w-5" />
			{isSaving
				? 'Enregistrement...'
				: hasChanges
					? 'Enregistrer les modifications'
					: 'Aucune modification'}
		</Button>
	</div>
</div>

<style>
	.edit-deck-page {
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
