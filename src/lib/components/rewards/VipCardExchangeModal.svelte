<!--
	VipCardExchangeModal Component
	===============================
	Modal for exchanging VIP cards with adaptive UI based on exchange mode.

	Modes:
	- replace_random: Random replacement of N cards
	- rarity_points: Point-based rarity exchange
	- discard_for_specific: Exchange N cards for specific card

	Props:
	- studentId: string - Student UUID
	- exchange: ExchangeCardAction - Exchange configuration
	- studentName?: string - Student name for display
	- classId?: string - For cache optimistic updates
	- onComplete?: () => void - Callback on success

	Flow:
	1. Load student's VIP cards
	2. Display UI based on exchange mode
	3. User selects cards (or automatic)
	4. API call with optimistic update
	5. Success → Show result → Return
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import VipCard from '$lib/components/VipCard.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getRarityPoints } from '$lib/types/vip-card';
	import type {
		ExchangeCardAction,
		StudentVipCards,
		VipCard as VipCardType,
		VipCardInstance,
		VipCardRarity
	} from '$lib/types/vip-card';
	import {
		vipCardTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		studentId: string;
		exchange: ExchangeCardAction;
		studentName?: string;
		classId?: string;
	}

	let { studentId, exchange, studentName, classId }: Props = $props();

	// State
	let loading = $state(true);
	let submitting = $state(false);
	let availableCards = $state<
		Array<{ instance: VipCardInstance; card: VipCardType; instanceId: string }>
	>([]);
	let selectedCards = $state<Set<string>>(new Set());
	let error = $state<string | null>(null);
	let result = $state<{
		cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }>;
		cardsReceived: Array<{ cardId: string; name: string; instanceId: string; earnedAt: string }>;
	} | null>(null);

	// Derived state
	const mode = $derived(exchange.mode);
	const requiredCount = $derived(
		exchange.mode === 'replace_random'
			? exchange.count
			: exchange.mode === 'discard_for_specific'
				? exchange.discardCount
				: 0 // rarity_points: variable
	);

	const selectedPoints = $derived.by(() => {
		if (exchange.mode !== 'rarity_points') return 0;
		let points = 0;
		for (const instanceId of selectedCards) {
			const card = availableCards.find((c) => c.instanceId === instanceId);
			if (card) {
				points += getRarityPoints(card.card.rarity);
			}
		}
		return points;
	});

	const targetPoints = $derived.by(() => {
		if (exchange.mode === 'rarity_points') {
			return getRarityPoints(exchange.targetRarity);
		}
		return 0;
	});

	const canExchange = $derived.by(() => {
		if (exchange.mode === 'replace_random') return selectedCards.size === requiredCount;
		if (exchange.mode === 'discard_for_specific') return selectedCards.size === requiredCount;
		if (exchange.mode === 'rarity_points') return selectedPoints >= targetPoints;
		return false;
	});

	const targetCard = $derived.by(() => {
		if (exchange.mode !== 'discard_for_specific') return null;
		const template = getTemplateById(exchange.targetCardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	});

	// Helper to get card by ID from store
	const getCardById = (cardId: string) => {
		const template = getTemplateById(cardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	};

	/**
	 * Load student's VIP cards
	 */
	async function loadCards() {
		loading = true;
		error = null;

		try {
			// Try cache first
			if (classId) {
				const currentRewards = teacherCache.getRewardsSync(classId);
				const studentRewards = currentRewards?.get(studentId);

				if (studentRewards) {
					const vipCards = studentRewards.vip_cards as StudentVipCards;
					availableCards = Object.entries(vipCards)
						.filter(([_, instance]) => instance.usedAt === null)
						.map(([instanceId, instance]) => {
							const template = getTemplateById(instance.cardId, $vipCardTemplates);
							if (!template) return null;
							const card = templateToVipCard(template);
							return { instance, card, instanceId };
						})
						.filter(
							(c): c is { instance: VipCardInstance; card: VipCardType; instanceId: string } =>
								c !== null
						);

					loading = false;
					return;
				}
			}

			// Fallback: fetch from API
			const response = await fetch(`/api/students/${studentId}/vip-cards`);
			if (!response.ok) throw new Error('Failed to load cards');

			const data = await response.json();
			const vipCards = data.vipCards as StudentVipCards;

			availableCards = Object.entries(vipCards)
				.filter(([_, instance]) => instance.usedAt === null)
				.map(([instanceId, instance]) => {
					const template = getTemplateById(instance.cardId, $vipCardTemplates);
					if (!template) return null;
					const card = templateToVipCard(template);
					return { instance, card, instanceId };
				})
				.filter(
					(c): c is { instance: VipCardInstance; card: VipCardType; instanceId: string } =>
						c !== null
				);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur de chargement';
			toaster.error(error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Toggle card selection
	 */
	function toggleCard(instanceId: string) {
		if (selectedCards.has(instanceId)) {
			selectedCards.delete(instanceId);
		} else {
			// For fixed count modes, replace last selection
			if (requiredCount > 0 && selectedCards.size >= requiredCount) {
				const first = Array.from(selectedCards)[0];
				selectedCards.delete(first);
			}
			selectedCards.add(instanceId);
		}
		selectedCards = new Set(selectedCards); // Trigger reactivity
	}

	/**
	 * Auto-select random cards
	 */
	function autoSelect() {
		selectedCards.clear();
		const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
		const toSelect = shuffled.slice(0, requiredCount);
		toSelect.forEach((c) => selectedCards.add(c.instanceId));
		selectedCards = new Set(selectedCards);
	}

	/**
	 * Handle exchange submission
	 */
	async function handleExchange() {
		if (!canExchange) return;

		submitting = true;
		error = null;

		try {
			const body: {
				studentId: string;
				mode: string;
				cardsToDiscard: string[];
				targetRarity?: VipCardRarity;
				targetCardId?: string;
			} = {
				studentId,
				mode: exchange.mode,
				cardsToDiscard: Array.from(selectedCards)
			};

			if (exchange.mode === 'rarity_points') {
				body.targetRarity = exchange.targetRarity;
			} else if (exchange.mode === 'discard_for_specific') {
				body.targetCardId = exchange.targetCardId;
			} else if (exchange.mode === 'replace_random') {
				// No additional fields needed for replace_random
			}

			const response = await fetch('/api/vip-cards/exchange', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Échec de l'échange");
			}

			result = await response.json();

			// Update cache if classId provided
			if (classId && result) {
				const currentRewards = teacherCache.getRewardsSync(classId);
				const studentRewards = currentRewards?.get(studentId);

				if (studentRewards) {
					const updatedVipCards = { ...studentRewards.vip_cards } as StudentVipCards;

					// Mark discarded cards as used
					const now = new Date().toISOString();
					for (const card of result.cardsDiscarded) {
						if (updatedVipCards[card.instanceId]) {
							updatedVipCards[card.instanceId] = {
								...updatedVipCards[card.instanceId],
								usedAt: now
							};
						}
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

			toaster.success('Échange réussi !');

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

	// Load cards on mount
	$effect(() => {
		loadCards();
	});
</script>

<Dialog.Root open={true} onOpenChange={handleClose}>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-bold">
				{#if mode === 'replace_random'}
					🔄 Remplacer {requiredCount} carte{requiredCount > 1 ? 's' : ''}
				{:else if mode === 'rarity_points'}
					⭐ Échanger contre carte {exchange.mode === 'rarity_points' ? exchange.targetRarity : ''}
				{:else if mode === 'discard_for_specific'}
					🎯 Obtenir {targetCard?.name}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{studentName ? `Pour ${studentName}` : 'Sélectionnez les cartes à échanger'}
			</Dialog.Description>
		</Dialog.Header>

		{#if loading}
			<!-- Loading State -->
			<div class="flex justify-center py-8">
				<div
					class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="flex flex-col items-center gap-4 py-8">
				<div class="text-6xl">❌</div>
				<p class="text-lg text-destructive">{error}</p>
			</div>
		{:else if result}
			<!-- Success State -->
			<div class="py-6">
				<div class="mb-6">
					<h3 class="mb-4 text-lg font-semibold">Cartes données :</h3>
					<div class="grid grid-cols-3 gap-4">
						{#each result.cardsDiscarded as card (card.instanceId)}
							<div class="text-center opacity-50">
								<VipCard card={getCardById(card.cardId)!} size="sm" />
								<p class="mt-2 text-sm">{card.name}</p>
							</div>
						{/each}
					</div>
				</div>

				<div>
					<h3 class="mb-4 text-lg font-semibold">Cartes reçues :</h3>
					<div class="grid grid-cols-3 gap-4">
						{#each result.cardsReceived as card (card.instanceId)}
							<div class="text-center">
								<VipCard card={getCardById(card.cardId)!} size="sm" />
								<p class="mt-2 text-sm font-bold">{card.name}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<!-- Selection State -->
			<div class="py-4">
				<!-- Mode-specific instructions -->
				<div class="mb-4 rounded-lg bg-muted p-4">
					{#if mode === 'replace_random'}
						<p class="text-sm">
							Sélectionnez {requiredCount} carte{requiredCount > 1 ? 's' : ''} à échanger contre {requiredCount}
							nouvelle{requiredCount > 1 ? 's' : ''} carte{requiredCount > 1 ? 's' : ''} aléatoire{requiredCount >
							1
								? 's'
								: ''}.
						</p>
						<Button variant="outline" size="sm" onclick={autoSelect} class="mt-2">
							Sélection aléatoire
						</Button>
					{:else if mode === 'rarity_points'}
						<p class="text-sm">
							Points requis : <span class="font-bold">{targetPoints}</span>
						</p>
						<p class="text-sm">
							Points sélectionnés : <span
								class="font-bold"
								class:text-green-600={selectedPoints >= targetPoints}>{selectedPoints}</span
							>
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							(commune=1, rare=3, épique=9, légendaire=27)
						</p>
					{:else if mode === 'discard_for_specific' && targetCard}
						<div class="flex items-center gap-4">
							<div class="w-32">
								<VipCard card={targetCard} size="sm" />
							</div>
							<div>
								<p class="text-sm">
									Échangez {requiredCount} carte{requiredCount > 1 ? 's' : ''} contre
									<span class="font-bold">{targetCard.name}</span>.
								</p>
								<Button variant="outline" size="sm" onclick={autoSelect} class="mt-2">
									Sélection aléatoire
								</Button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Available cards grid -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
					{#each availableCards as { card, instanceId } (instanceId)}
						<button
							type="button"
							onclick={() => toggleCard(instanceId)}
							class={cn(
								'relative rounded-lg border-2 p-2 transition-all',
								selectedCards.has(instanceId)
									? 'border-primary bg-primary/10'
									: 'border-transparent hover:border-muted-foreground/30'
							)}
						>
							<VipCard {card} size="sm" clickable={false} />
							{#if selectedCards.has(instanceId)}
								<div
									class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
								>
									✓
								</div>
							{/if}
							<p class="mt-1 line-clamp-1 text-center text-xs">{card.name}</p>
							{#if mode === 'rarity_points'}
								<p class="text-center text-xs text-muted-foreground">
									{getRarityPoints(card.rarity)} pts
								</p>
							{/if}
						</button>
					{/each}
				</div>

				{#if availableCards.length === 0}
					<p class="py-8 text-center text-muted-foreground">Aucune carte disponible</p>
				{/if}
			</div>
		{/if}

		{#if !loading && !error && !result}
			<Dialog.Footer>
				<Button variant="outline" onclick={handleClose} disabled={submitting}>Annuler</Button>
				<Button onclick={handleExchange} disabled={!canExchange || submitting}>
					{#if submitting}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></div>
					{/if}
					Échanger ({selectedCards.size} sélectionnée{selectedCards.size > 1 ? 's' : ''})
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
