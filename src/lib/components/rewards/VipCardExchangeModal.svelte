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
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
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
		actionCardInstanceId: string;
		studentName?: string;
		classId?: string;
	}

	let { studentId, exchange, actionCardInstanceId, studentName, classId }: Props = $props();

	// State
	let loading = $state(true);
	let submitting = $state(false);
	let availableCards = $state<
		Array<{ instance: VipCardInstance; card: VipCardType; instanceId: string }>
	>([]);
	let selectedCards = $state<Set<string>>(new Set());
	let error = $state<string | null>(null);
	let result = $state<{
		actionCardUsed: { cardId: string; name: string; instanceId: string };
		cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }>;
		cardsReceived: Array<{ cardId: string; name: string; instanceId: string; earnedAt: string }>;
	} | null>(null);

	// Derived state
	const mode = $derived(exchange.mode);
	const requiredCount = $derived(
		exchange.mode === 'replace_random'
			? (exchange.count ?? 0) // 0 means flexible (any number 1-10)
			: exchange.mode === 'discard_for_specific'
				? exchange.discardCount
				: 0 // rarity_points: variable
	);
	const isFlexibleCount = $derived(exchange.mode === 'replace_random' && !exchange.count);

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
		if (exchange.mode === 'replace_random') {
			// Flexible mode: at least 1 card. Fixed mode: exact count
			return isFlexibleCount
				? selectedCards.size >= 1 && selectedCards.size <= 10
				: selectedCards.size === requiredCount;
		}
		if (exchange.mode === 'discard_for_specific') return selectedCards.size === requiredCount;
		if (exchange.mode === 'rarity_points') return selectedPoints >= targetPoints;
		return false;
	});

	const targetCard = $derived.by(() => {
		if (exchange.mode !== 'discard_for_specific') return null;
		const template = getTemplateById(exchange.targetCardId, $vipCardTemplates);
		return template ? templateToVipCard(template) : null;
	});

	// Group cards by template
	const groupedCards = $derived.by(() => {
		const groups = new Map<
			string,
			{
				cardId: string;
				card: VipCardType;
				instances: Array<{ instanceId: string; instance: VipCardInstance }>;
				totalCount: number;
				selectedCount: number;
			}
		>();

		// Group by cardId
		for (const { card, instance, instanceId } of availableCards) {
			if (!groups.has(card.id)) {
				groups.set(card.id, {
					cardId: card.id,
					card,
					instances: [],
					totalCount: 0,
					selectedCount: 0
				});
			}
			const group = groups.get(card.id)!;
			group.instances.push({ instanceId, instance });
			group.totalCount++;
			if (selectedCards.has(instanceId)) {
				group.selectedCount++;
			}
		}

		// Convert to array and sort by rarity
		return Array.from(groups.values()).sort(
			(a, b) => getRarityPoints(a.card.rarity) - getRarityPoints(b.card.rarity)
		);
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
						)
						.sort((a, b) => getRarityPoints(a.card.rarity) - getRarityPoints(b.card.rarity));

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
				)
				.sort((a, b) => getRarityPoints(a.card.rarity) - getRarityPoints(b.card.rarity));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur de chargement';
			toaster.error(error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Toggle card selection for a group
	 * - If no instances selected, select first available
	 * - If some instances selected, select next available
	 * - If all instances selected, deselect all
	 */
	function toggleCardGroup(cardId: string) {
		const group = groupedCards.find((g) => g.cardId === cardId);
		if (!group) return;

		// Find first unselected instance
		const unselectedInstance = group.instances.find((i) => !selectedCards.has(i.instanceId));

		if (unselectedInstance) {
			// Select next unselected instance
			// For fixed count modes, remove oldest selection if at limit
			// For flexible mode, enforce max of 10 cards
			if (requiredCount > 0 && selectedCards.size >= requiredCount) {
				const first = Array.from(selectedCards)[0];
				selectedCards.delete(first);
			} else if (isFlexibleCount && selectedCards.size >= 10) {
				// Flexible mode: max 10 cards
				return; // Don't add if already at max
			}
			selectedCards.add(unselectedInstance.instanceId);
		} else {
			// All selected, deselect all instances of this group
			for (const { instanceId } of group.instances) {
				selectedCards.delete(instanceId);
			}
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
				actionCardInstanceId: string;
				targetRarity?: VipCardRarity;
				targetCardId?: string;
			} = {
				studentId,
				mode: exchange.mode,
				cardsToDiscard: Array.from(selectedCards),
				actionCardInstanceId
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
					const now = new Date().toISOString();

					// Mark action card as used
					if (updatedVipCards[result.actionCardUsed.instanceId]) {
						updatedVipCards[result.actionCardUsed.instanceId] = {
							...updatedVipCards[result.actionCardUsed.instanceId],
							usedAt: now
						};
					}

					// Mark discarded cards as used
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

<!-- Modal Content (ModalStackRenderer provides backdrop and click-to-close) -->
<div
	class="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="exchange-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 id="exchange-title" class="text-2xl font-bold">
				{#if mode === 'replace_random'}
					{#if isFlexibleCount}
						🔄 Échanger des cartes
					{:else}
						🔄 Remplacer {requiredCount} carte{requiredCount > 1 ? 's' : ''}
					{/if}
				{:else if mode === 'rarity_points'}
					⭐ Échanger contre carte {exchange.mode === 'rarity_points' ? exchange.targetRarity : ''}
				{:else if mode === 'discard_for_specific'}
					🎯 Obtenir {targetCard?.name}
				{/if}
			</h2>
			<p class="text-sm text-muted-foreground">
				{studentName ? `Pour ${studentName}` : 'Sélectionnez les cartes à échanger'}
			</p>
		</div>
		<button
			onclick={handleClose}
			class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			aria-label="Fermer"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

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
		<div class="cursor-pointer py-6" onclick={handleClose} role="button" tabindex="0">
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

			<!-- Click anywhere hint -->
			<p class="mt-6 text-center text-sm text-muted-foreground">
				Cliquez n'importe où pour continuer
			</p>
		</div>
	{:else}
		<!-- Selection State -->
		<div class="py-4">
			<!-- Mode-specific instructions -->
			<div class="mb-4 rounded-lg bg-muted p-4">
				{#if mode === 'replace_random'}
					{#if isFlexibleCount}
						<p class="text-sm">
							Sélectionnez entre 1 et 10 cartes à échanger contre le même nombre de nouvelles cartes
							aléatoires.
						</p>
						<p class="mt-2 text-sm">
							Cartes sélectionnées : <span class="font-bold">{selectedCards.size} / 10 max</span>
						</p>
					{:else}
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
					{/if}
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

			<!-- Available cards grid (grouped by template) -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
				{#each groupedCards as group (group.cardId)}
					<button
						type="button"
						onclick={() => toggleCardGroup(group.cardId)}
						class={cn(
							'relative rounded-lg border-2 p-2 transition-all',
							group.selectedCount > 0
								? 'border-primary bg-primary/10'
								: 'border-transparent hover:border-muted-foreground/30'
						)}
					>
						<VipCard card={group.card} size="sm" clickable={false} />

						<!-- Selection badge (top right) -->
						{#if group.totalCount > 1}
							<div
								class={cn(
									'absolute -top-2 -right-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-md',
									group.selectedCount > 0
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'
								)}
							>
								{group.selectedCount}/{group.totalCount}
							</div>
						{:else if group.selectedCount > 0}
							<div
								class="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md"
							>
								✓
							</div>
						{/if}

						<p class="mt-1 line-clamp-1 text-center text-xs">{group.card.name}</p>
						{#if mode === 'rarity_points'}
							<p class="text-center text-xs text-muted-foreground">
								{getRarityPoints(group.card.rarity)} pts
							</p>
						{/if}
					</button>
				{/each}
			</div>

			{#if groupedCards.length === 0}
				<p class="py-8 text-center text-muted-foreground">Aucune carte disponible</p>
			{/if}
		</div>
	{/if}

	<!-- Footer with action buttons -->
	{#if !loading && !error && !result}
		<div class="mt-6 flex justify-end gap-2">
			<Button variant="outline" onclick={handleClose} disabled={submitting}>Annuler</Button>
			<Button onclick={handleExchange} disabled={!canExchange || submitting}>
				{#if submitting}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					></div>
				{/if}
				Échanger ({selectedCards.size} sélectionnée{selectedCards.size > 1 ? 's' : ''})
			</Button>
		</div>
	{/if}
</div>
