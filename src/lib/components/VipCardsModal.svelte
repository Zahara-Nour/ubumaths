<!--
	VipCardsModal Component
	========================
	Modal dialog displaying all VIP cards owned by a student.

	Features:
	- Responsive grid layout of all cards (max 3 columns)
	- Count badges on cards (e.g., ×3 for 3 instances)
	- Click to view holographic card detail
	- Empty state for no cards
	- Progress statistics
	- Teacher-only removal feature with optimistic UI

	TEACHER REMOVAL FEATURE (teacherView=true):
	-------------------------------------------
	When teacherView prop is true, trash buttons appear on each card allowing
	teachers to remove individual card instances from students' collections.

	OPTIMISTIC UI IMPLEMENTATION:
	------------------------------
	The removal feature uses optimistic updates for instant UI feedback:

	1. INSTANT FEEDBACK (Optimistic Update)
	   - When trash button clicked, count decrements immediately
	   - If count was ×3 → becomes ×2, if ×1 → card disappears
	   - No waiting for server response - feels instant

	2. BACKGROUND SYNC
	   - Request sent to server to remove card from database
	   - Server validates permissions and removes oldest unused instance
	   - Success: Data refreshed, success toast shown
	   - Error: Optimistic update rolled back, error toast shown

	3. STATE PERSISTENCE
	   - Optimistic state persists throughout the modal session
	   - Prevents flickering when server data refreshes
	   - Automatically cleared when modal closes

	4. COUNT TRACKING
	   - optimisticRemovedCounts: Record<cardId, number of removals>
	   - Example: { "bonus": 2 } means 2 bonus cards removed this session
	   - Derived cardsWithCounts subtracts removals from server counts
	   - Cards with adjusted count ≤ 0 are filtered out (hidden)

	TECHNICAL DETAILS:
	------------------
	- Uses Svelte 5 runes ($state, $derived, $effect)
	- Immutable updates for proper reactivity (spread operator)
	- No gidouilles refund when cards removed
	- Only affects unused cards (usedAt: null)
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import VipCard from './VipCard.svelte';
	import VipCardHoloModal from './VipCardHoloModal.svelte';
	import {
		getStudentCardsWithCounts,
		getUniqueCardTypesCount,
		getTotalUnusedCards,
		sortCardsByPriority
	} from '$lib/utils/vip-cards';
	import { getTotalVipCards, type VipCard as VipCardType } from '$lib/types/vip-card';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { Sparkles } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		studentName: string;
		studentId?: string;
		vipCards: StudentVipCards;
		teacherView?: boolean;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		studentName,
		studentId,
		vipCards,
		teacherView = false
	}: Props = $props();

	// Holographic modal state
	let holoModalVisible = $state(false);
	let selectedCardForHolo = $state<{ card: VipCardType; count: number } | null>(null);

	// OPTIMISTIC REMOVAL STATE
	// Tracks how many instances of each card have been removed this session
	// Key: cardId (e.g., "bonus"), Value: number of instances removed
	// Example: { "bonus": 2, "captain": 1 } = 2 bonus + 1 captain removed
	// This state persists until modal closes to prevent UI flicker during data refresh
	let optimisticRemovedCounts = $state<Record<string, number>>({});

	// OPTIMISTIC USE STATE
	// Tracks how many instances of each card have been used this session
	// Similar to optimisticRemovedCounts but for card usage
	let optimisticUsedCounts = $state<Record<string, number>>({});

	// DERIVED CARDS WITH ADJUSTED COUNTS
	// Get cards sorted by rarity, adjust counts based on optimistic removals AND uses, hide cards with 0 count
	// Example: Server says ×3, optimistic says -1 removed -1 used → Display shows ×1
	const cardsWithCounts = $derived(
		sortCardsByPriority(getStudentCardsWithCounts(vipCards))
			.map((card) => {
				const removedCount = optimisticRemovedCounts[card.id] || 0;
				const usedCount = optimisticUsedCounts[card.id] || 0;
				return {
					...card,
					count: Math.max(0, card.count - removedCount - usedCount)
				};
			})
			.filter((card) => card.count > 0) // Hide cards with 0 count
	);

	// CLEANUP EFFECT
	// Reset optimistic state when modal closes to start fresh next time
	$effect(() => {
		if (!open) {
			optimisticRemovedCounts = {};
			optimisticUsedCounts = {};
		}
	});

	// Statistics
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const uniqueCardsCount = $derived(getUniqueCardTypesCount(vipCards)); // For future stats display
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const totalCardsCount = $derived(getTotalUnusedCards(vipCards)); // For future stats display
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const totalAvailableCards = getTotalVipCards(); // Total cards in the game

	// Handle dialog open/close
	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		onOpenChange?.(newOpen);
	}

	// Handle card click - open holographic modal
	function handleCardClick(
		card: {
			id: string;
			name: string;
			description: string;
			imagePath: string;
			category: string;
			rarity?: 'common' | 'rare' | 'epic' | 'legendary';
		},
		count: number
	) {
		// Convert to VipCardType for the holographic modal
		const vipCard: VipCardType = {
			id: card.id,
			name: card.name,
			description: card.description,
			imagePath: card.imagePath,
			category: card.category as VipCardType['category'],
			rarity: card.rarity
		};
		selectedCardForHolo = { card: vipCard, count };
		holoModalVisible = true;
	}

	// Close holographic modal
	function closeHoloModal() {
		holoModalVisible = false;
		// Clear selection after animation completes
		setTimeout(() => {
			selectedCardForHolo = null;
		}, 300);
	}

	/**
	 * Check if a card has a pending activation request
	 */
	function cardHasPendingRequest(cardId: string): boolean {
		return Object.values(vipCards).some(
			(inst) => inst.cardId === cardId && inst.activationRequestedAt && !inst.usedAt
		);
	}

	/**
	 * Find instance to use (prefer instances with pending requests)
	 */
	function findInstanceToUse(cardId: string): string | null {
		const entries = Object.entries(vipCards);

		// Priorité 1: Instance avec demande
		const withRequest = entries.find(
			([_, inst]) => inst.cardId === cardId && !inst.usedAt && inst.activationRequestedAt
		);
		if (withRequest) return withRequest[0];

		// Priorité 2: Première instance disponible
		const available = entries.find(([_, inst]) => inst.cardId === cardId && !inst.usedAt);
		return available?.[0] || null;
	}

	/**
	 * Handle use card with optimistic UI
	 * Similar to handleRemoveCard but for card usage
	 */
	async function handleUseCard(card: { id: string; name: string }) {
		if (!teacherView || !studentId) return;

		// Trouver instance
		const instanceId = findInstanceToUse(card.id);
		if (!instanceId) {
			toaster.error('Aucune instance disponible');
			return;
		}

		// STEP 1: Apply optimistic update
		optimisticUsedCounts = {
			...optimisticUsedCounts,
			[card.id]: (optimisticUsedCounts[card.id] || 0) + 1
		};

		try {
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) throw new Error(result.message);

			// STEP 2: SUCCESS
			toaster.success(`Carte ${card.name} utilisée !`);
			await invalidateAll();
		} catch (error) {
			// STEP 3: ERROR - Rollback optimistic update
			const newCount = Math.max(0, (optimisticUsedCounts[card.id] || 0) - 1);
			if (newCount === 0) {
				const { [card.id]: _, ...rest } = optimisticUsedCounts;
				optimisticUsedCounts = rest;
			} else {
				optimisticUsedCounts = { ...optimisticUsedCounts, [card.id]: newCount };
			}
			toaster.error("Échec de l'utilisation");
		}
	}

	/**
	 * Handle card removal with optimistic UI
	 *
	 * FLOW:
	 * 1. Immediately increment removal count (optimistic) → UI updates instantly
	 * 2. Send removal request to server in background
	 * 3. On success: Refresh data and show success toast (keep optimistic state active)
	 * 4. On error: Rollback optimistic update and show error toast
	 *
	 * IMPORTANT: Optimistic state is NOT cleared after success to prevent UI flicker.
	 * It persists until the modal is closed, then gets reset by the $effect cleanup.
	 *
	 * @param card - The VIP card to remove
	 */
	async function handleRemoveCard(card: {
		id: string;
		name: string;
		description: string;
		imagePath: string;
		category: string;
		rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	}) {
		if (!teacherView || !studentId) return;

		// STEP 1: Apply optimistic update (instant UI feedback)
		// Use immutable update (spread operator) to trigger Svelte 5 reactivity
		optimisticRemovedCounts = {
			...optimisticRemovedCounts,
			[card.id]: (optimisticRemovedCounts[card.id] || 0) + 1
		};

		// STEP 2: Prepare and send server request
		const formData = new FormData();
		formData.set('studentId', studentId);
		formData.set('cardId', card.id);

		try {
			const response = await fetch('?/removeVipCard', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				// STEP 3: SUCCESS - Refresh data and notify user
				// NOTE: We KEEP optimistic state active to prevent flicker
				// The derived cardsWithCounts will continue showing adjusted counts
				// until the modal is closed (which triggers the cleanup $effect)
				await invalidateAll();
				toaster.success(`Carte ${card.name} retirée avec succès`);
			} else {
				// STEP 4a: ERROR - Rollback optimistic update
				const newCount = Math.max(0, (optimisticRemovedCounts[card.id] || 0) - 1);
				if (newCount === 0) {
					// Remove key if count is 0 (use immutable update)
					const newCounts = { ...optimisticRemovedCounts };
					delete newCounts[card.id];
					optimisticRemovedCounts = newCounts;
				} else {
					// Decrement count (use immutable update)
					optimisticRemovedCounts = {
						...optimisticRemovedCounts,
						[card.id]: newCount
					};
				}
				toaster.error('Échec de la suppression de la carte');
			}
		} catch {
			// STEP 4b: NETWORK ERROR - Rollback optimistic update
			const newCount = Math.max(0, (optimisticRemovedCounts[card.id] || 0) - 1);
			if (newCount === 0) {
				const newCounts = { ...optimisticRemovedCounts };
				delete newCounts[card.id];
				optimisticRemovedCounts = newCounts;
			} else {
				optimisticRemovedCounts = {
					...optimisticRemovedCounts,
					[card.id]: newCount
				};
			}
			toaster.error('Erreur réseau');
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-h-[90vh] max-w-7xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-2xl font-bold">
				<Sparkles class="h-6 w-6 text-amber-500" />
				Cartes VIP de {studentName}
			</Dialog.Title>
		</Dialog.Header>

		<!-- Cards Display -->
		{#if cardsWithCounts.length === 0}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
				<div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
					<Sparkles class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold text-foreground">Aucune carte VIP pour le moment</h3>
				<p class="max-w-md text-muted-foreground">
					{studentName} n'a pas encore de cartes VIP. Il faut dépenser 3 gidouilles pour obtenir une
					carte aléatoire.
				</p>
			</div>
		{:else}
			<!-- All Cards Grid - Sorted by Rarity -->
			<div class="grid grid-cols-2 gap-8 p-6 sm:grid-cols-3 xl:grid-cols-3">
				{#each cardsWithCounts as card (card.id)}
					<div
						class="transform cursor-pointer transition-transform hover:scale-105"
						onclick={() => handleCardClick(card, card.count)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleCardClick(card, card.count);
							}
						}}
						role="button"
						tabindex="0"
						aria-label="Voir {card.name} en grand"
					>
						<VipCard
							card={card as VipCardType}
							count={card.count}
							size="sm"
							clickable={false}
							showRemoveButton={teacherView}
							onRemove={() => handleRemoveCard(card)}
							showUseButton={teacherView}
							hasPendingRequest={cardHasPendingRequest(card.id)}
							onUse={() => handleUseCard(card)}
						/>
					</div>
				{/each}
			</div>
		{/if}

		<Dialog.Footer class="mt-6">
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Holographic Card Modal -->
{#if selectedCardForHolo}
	<VipCardHoloModal
		card={selectedCardForHolo.card}
		count={selectedCardForHolo.count}
		visible={holoModalVisible}
		onClose={closeHoloModal}
	/>
{/if}
