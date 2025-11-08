<!--
	VipCardChooseModal Component
	=============================
	Modal for choosing specific VIP cards using a choose_card action.

	Features:
	- Displays all available cards based on action filters
	- Allows selection of exactly N cards (defined by action.count)
	- Validates selection against filters (all/maxRarity/possibleCardIds)
	- Optimistic UI updates for instant feedback
	- Shows selection result

	Props:
	- studentId: string - Student UUID
	- action: ChooseCardAction - Choose card action configuration
	- actionCardInstanceId: string - Instance ID of action card being consumed
	- studentName?: string - Student name for display
	- classId?: string - For cache optimistic updates

	Flow:
	1. Display grid of available cards (filtered by action)
	2. User selects exactly N cards
	3. API call with optimistic update
	4. Success → Show result → Auto-close
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import VipCard from '$lib/components/VipCard.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getRarityPoints } from '$lib/types/vip-card';
	import type { VipCardRarity, StudentVipCards } from '$lib/types/vip-card';
	import {
		vipCardTemplates,
		getEnabledTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		studentId: string;
		action: {
			count: number;
			maxRarity?: VipCardRarity;
			possibleCardIds?: string[];
		};
		actionCardInstanceId: string;
		studentName?: string;
		classId?: string;
	}

	let { studentId, action, actionCardInstanceId, studentName, classId }: Props = $props();

	// State
	let selectedCardIds = $state<Set<string>>(new Set());
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let result = $state<{
		actionCardUsed: { cardId: string; name: string; instanceId: string };
		cardsReceived: Array<{ cardId: string; name: string; instanceId: string; earnedAt: string }>;
	} | null>(null);

	// Get available cards based on action filters
	const availableCards = $derived.by(() => {
		const allCards = getEnabledTemplates($vipCardTemplates).map((t) => templateToVipCard(t));

		// Mode 3: Specific list
		if (action.possibleCardIds && action.possibleCardIds.length > 0) {
			return allCards.filter((card) => action.possibleCardIds!.includes(card.id));
		}

		// Mode 2: Max rarity
		if (action.maxRarity) {
			const maxRarityValue = getRarityPoints(action.maxRarity);
			return allCards.filter((card) => getRarityPoints(card.rarity) <= maxRarityValue);
		}

		// Mode 1: All cards (default)
		return allCards;
	});

	// Helper to get card by ID from store
	const getCardById = (cardId: string) => {
		const template = getTemplateById(cardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	};

	const canConfirm = $derived(selectedCardIds.size === action.count);

	const selectionStatus = $derived(
		`${selectedCardIds.size} / ${action.count} carte${action.count > 1 ? 's' : ''} sélectionnée${selectedCardIds.size > 1 ? 's' : ''}`
	);

	/**
	 * Toggle card selection
	 */
	function toggleCard(cardId: string) {
		if (selectedCardIds.has(cardId)) {
			selectedCardIds.delete(cardId);
		} else {
			// If already at max, remove first selection
			if (selectedCardIds.size >= action.count) {
				const first = Array.from(selectedCardIds)[0];
				selectedCardIds.delete(first);
			}
			selectedCardIds.add(cardId);
		}
		selectedCardIds = new Set(selectedCardIds); // Trigger reactivity
	}

	/**
	 * Handle choose submission
	 */
	async function handleChoose() {
		if (!canConfirm) return;

		submitting = true;
		error = null;

		try {
			const response = await fetch('/api/vip-cards/choose', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					actionCardInstanceId,
					chosenCardIds: Array.from(selectedCardIds)
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Échec de la sélection');
			}

			result = await response.json();

			// Update cache if classId provided
			if (classId && result) {
				const currentRewards = teacherCache.getRewardsSync(classId);
				const studentRewards = currentRewards?.get(studentId);

				if (studentRewards) {
					const updatedVipCards = { ...studentRewards.vip_cards } as StudentVipCards;

					// Mark action card as used
					const now = new Date().toISOString();
					if (updatedVipCards[result.actionCardUsed.instanceId]) {
						updatedVipCards[result.actionCardUsed.instanceId] = {
							...updatedVipCards[result.actionCardUsed.instanceId],
							usedAt: now
						};
					}

					// Add received cards
					for (const card of result.cardsReceived) {
						updatedVipCards[card.instanceId] = {
							cardId: card.cardId,
							earnedAt: card.earnedAt,
							usedAt: null
						};
					}

					teacherCache.updateVipCardsOptimistic(classId, studentId, updatedVipCards);
				}
			}

			toaster.success('Cartes choisies avec succès !');

			// Close after showing result
			setTimeout(() => {
				modalStack.pop();
			}, 2000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(error);
		} finally {
			submitting = false;
		}
	}

	/**
	 * Close modal
	 */
	function handleClose() {
		modalStack.pop();
	}

	/**
	 * Get filter description for UI
	 */
	const filterDescription = $derived.by(() => {
		if (action.possibleCardIds && action.possibleCardIds.length > 0) {
			return `Cartes disponibles : ${action.possibleCardIds.length}`;
		}
		if (action.maxRarity) {
			return `Rareté max : ${action.maxRarity}`;
		}
		return 'Toutes les cartes disponibles';
	});
</script>

<Dialog.Root open={true} onOpenChange={handleClose}>
	<Dialog.Content class="max-h-[90vh] max-w-5xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-bold">
				🎯 Choisir {action.count} carte{action.count > 1 ? 's' : ''} VIP
			</Dialog.Title>
			<Dialog.Description>
				{studentName ? `Pour ${studentName}` : 'Sélectionnez les cartes à recevoir'}
			</Dialog.Description>
		</Dialog.Header>

		{#if error && !result}
			<!-- Error State -->
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="text-6xl">❌</div>
				<p class="text-lg text-destructive">{error}</p>
			</div>
		{:else if result}
			<!-- Success State -->
			<div class="py-6">
				<div class="mb-6">
					<h3 class="mb-4 text-lg font-semibold">Carte d'action utilisée :</h3>
					<div class="flex justify-center">
						<div class="w-48 text-center opacity-50">
							<VipCard card={getCardById(result.actionCardUsed.cardId)!} size="md" />
							<p class="mt-2 text-sm">{result.actionCardUsed.name}</p>
						</div>
					</div>
				</div>

				<div>
					<h3 class="mb-4 text-lg font-semibold">Cartes reçues :</h3>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
						{#each result.cardsReceived as card (card.instanceId)}
							<div class="text-center">
								<VipCard card={getCardById(card.cardId)!} size="md" />
								<p class="mt-2 text-sm font-bold">{card.name}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<!-- Selection State -->
			<div class="py-4">
				<!-- Instructions -->
				<div class="mb-6 rounded-lg bg-muted p-4">
					<p class="mb-1 text-sm font-semibold">{selectionStatus}</p>
					<p class="text-xs text-muted-foreground">{filterDescription}</p>
				</div>

				<!-- Available cards grid -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{#each availableCards as card (card.id)}
						<button
							type="button"
							onclick={() => toggleCard(card.id)}
							class={cn(
								'relative rounded-lg border-2 p-2 transition-all',
								selectedCardIds.has(card.id)
									? 'border-primary bg-primary/10 shadow-lg'
									: 'border-transparent hover:border-muted-foreground/30'
							)}
							disabled={submitting}
						>
							<VipCard {card} size="sm" clickable={false} />
							{#if selectedCardIds.has(card.id)}
								<div
									class="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md"
								>
									✓
								</div>
							{/if}
							<p class="mt-1 line-clamp-2 text-center text-xs font-medium">{card.name}</p>
							<p class="text-center text-xs text-muted-foreground capitalize">{card.rarity}</p>
						</button>
					{/each}
				</div>

				{#if availableCards.length === 0}
					<p class="py-8 text-center text-muted-foreground">Aucune carte disponible</p>
				{/if}
			</div>
		{/if}

		{#if !error && !result}
			<Dialog.Footer>
				<Button variant="outline" onclick={handleClose} disabled={submitting}>Annuler</Button>
				<Button onclick={handleChoose} disabled={!canConfirm || submitting}>
					{#if submitting}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></div>
					{/if}
					Confirmer ({selectionStatus})
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
