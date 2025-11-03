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
	import { Sparkles } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		studentName: string;
		classId: string;
		studentId: string;
		teacherView?: boolean;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		studentName,
		classId,
		studentId,
		teacherView = false
	}: Props = $props();

	// Holographic modal state
	let holoModalVisible = $state(false);
	let selectedCardForHolo = $state<{ card: VipCardType; count: number } | null>(null);

	// READ VIP CARDS FROM CACHE (reactive)
	// Automatically updates when cache changes
	const vipCards = $derived.by(() => {
		const rewards = teacherCache.getRewardsSync(classId);
		return rewards?.get(studentId)?.vip_cards || {};
	});

	// DERIVED CARDS WITH COUNTS
	// Get cards sorted by rarity, filter out cards with 0 count
	// Optimistic updates are handled by the cache itself
	const cardsWithCounts = $derived(
		sortCardsByPriority(getStudentCardsWithCounts(vipCards)).filter((card) => card.count > 0)
	);

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
			category?: string;
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
			category: (card.category || 'action') as VipCardType['category'],
			rarity: card.rarity || 'common'
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
	 * Handle card usage with optimistic UI via cache
	 *
	 * FLOW:
	 * 1. Save current VIP cards state (for rollback)
	 * 2. Find instance to use (priority: pending request > first available)
	 * 3. Mark instance as used (usedAt: now)
	 * 4. Update cache optimistically → UI updates instantly via $derived
	 * 5. Send request to server
	 * 6. On success: Cache already correct, just show toast
	 * 7. On error: Rollback by restoring previous state to cache
	 *
	 * @param card - The VIP card to use
	 */
	async function handleUseCard(card: { id: string; name: string }) {
		if (!teacherView) return;

		// STEP 1: Save current state for rollback
		const previousVipCards = { ...vipCards };

		// STEP 2: Find instance to use
		const instanceId = findInstanceToUse(card.id);
		if (!instanceId) {
			toaster.error('Aucune instance disponible');
			return;
		}

		// STEP 3: Mark instance as used
		const instance = vipCards[instanceId];
		const newVipCards = {
			...vipCards,
			[instanceId]: {
				...instance,
				usedAt: new Date().toISOString(),
				// Clear activation request fields
				activationRequestedAt: null,
				activationRequestedBy: null
			}
		};

		// STEP 4: Apply optimistic update to cache (instant UI feedback)
		teacherCache.updateVipCardsOptimistic(classId, studentId, newVipCards);

		// STEP 5: Send server request
		try {
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) throw new Error(result.message);

			// STEP 6: SUCCESS - Cache already correct, just notify
			toaster.success(`Carte ${card.name} utilisée !`);
		} catch (_error) {
			// STEP 7: ERROR - Rollback by restoring previous state
			teacherCache.updateVipCardsOptimistic(classId, studentId, previousVipCards);
			toaster.error("Échec de l'utilisation");
		}
	}

	/**
	 * Handle card removal with optimistic UI via cache
	 *
	 * FLOW:
	 * 1. Save current VIP cards state (for rollback)
	 * 2. Find oldest unused instance of the card to remove
	 * 3. Create new vipCards object without that instance
	 * 4. Update cache optimistically → UI updates instantly via $derived
	 * 5. Send request to server
	 * 6. On success: Cache already correct, just show toast
	 * 7. On error: Rollback by restoring previous state to cache
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
		if (!teacherView) return;

		// STEP 1: Save current state for rollback
		const previousVipCards = { ...vipCards };

		// STEP 2: Find oldest unused instance to remove
		const entries = Object.entries(vipCards);
		const matchingInstances = entries
			.filter(([_, inst]) => inst.cardId === card.id && !inst.usedAt)
			.sort((a, b) => new Date(a[1].earnedAt).getTime() - new Date(b[1].earnedAt).getTime());

		if (matchingInstances.length === 0) {
			toaster.error('Aucune carte disponible');
			return;
		}

		const [instanceIdToRemove] = matchingInstances[0];

		// STEP 3: Create new vipCards without removed instance
		const newVipCards = { ...vipCards };
		delete newVipCards[instanceIdToRemove];

		// STEP 4: Apply optimistic update to cache (instant UI feedback)
		teacherCache.updateVipCardsOptimistic(classId, studentId, newVipCards);

		// STEP 5: Send server request
		try {
			const response = await fetch('/api/vip-cards/remove', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					cardId: card.id
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to remove card');
			}

			// STEP 6: SUCCESS - Cache already correct, just notify
			toaster.success(`Carte ${card.name} retirée avec succès`);
		} catch (_error) {
			// STEP 7: ERROR - Rollback by restoring previous state
			teacherCache.updateVipCardsOptimistic(classId, studentId, previousVipCards);
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
