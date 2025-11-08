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
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
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
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import {
		openVipCardDrawModal,
		openVipCardExchangeModal,
		openVipCardChooseModal,
		openRemoveWarningsModal
	} from '$lib/utils/vip-card-modals';

	interface Props {
		studentName: string;
		classId: string;
		periodId: string;
		studentId: string;
		teacherView?: boolean;
	}

	let { studentName, classId, periodId, studentId, teacherView = false }: Props = $props();

	// Removed: drawResultOpen and drawnCards (now handled by modal stack)

	// Holographic modal state
	let holoModalVisible = $state(false);
	let selectedCardForHolo = $state<{ card: VipCardType; count: number } | null>(null);

	/**
	 * Get VIP cards from cache (reactive function)
	 * Called directly in template - Svelte tracks the .get() call automatically
	 */
	function getVipCards() {
		const rewards = teacherCache.getRewardsSync(classId);
		return rewards?.get(studentId)?.vip_cards || {};
	}

	/**
	 * Get cards with counts, sorted and filtered
	 * Called directly in template - reactive to cache changes
	 */
	function getCardsWithCounts() {
		const vipCards = getVipCards();
		return sortCardsByPriority(getStudentCardsWithCounts(vipCards)).filter(
			(card) => card.count > 0
		);
	}

	// Statistics (using reactive functions)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const uniqueCardsCount = $derived(getUniqueCardTypesCount(getVipCards())); // For future stats display
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const totalCardsCount = $derived(getTotalUnusedCards(getVipCards())); // For future stats display
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const totalAvailableCards = getTotalVipCards(); // Total cards in the game

	// Handle modal close
	function handleClose() {
		modalStack.pop();
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
		const vipCards = getVipCards();
		return Object.values(vipCards).some(
			(inst) => inst.cardId === cardId && inst.activationRequestedAt && !inst.usedAt
		);
	}

	/**
	 * Find instance to use (prefer instances with pending requests)
	 */
	function findInstanceToUse(cardId: string): string | null {
		const vipCards = getVipCards();
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
	 * Handle card usage with action dispatch
	 *
	 * NEW ARCHITECTURE:
	 * - Detects action type from card definition
	 * - Opens appropriate specialized modal
	 * - Modal handles UI interaction + API call
	 * - After success, marks card as used via /api/vip-cards/use-card
	 *
	 * @param card - The VIP card to use
	 */
	async function handleUseCard(card: { id: string; name: string; action?: VipCardType['action'] }) {
		if (!teacherView) return;

		// Find instance to use
		const instanceId = findInstanceToUse(card.id);
		if (!instanceId) {
			toaster.error('Aucune instance disponible');
			return;
		}

		// If no action, just mark as used directly
		if (!card.action) {
			await markCardAsUsed(instanceId, card.name);
			return;
		}

		// Dispatch to appropriate handler based on action type
		switch (card.action.type) {
			case 'draw_cards':
				await handleDrawCards(card.action, instanceId, card.name);
				break;

			case 'exchange_cards':
				await handleExchangeCards(card.action, instanceId, card.name);
				break;

			case 'choose_card':
				await handleChooseCard(card.action, instanceId, card.name);
				break;

			case 'remove_warnings':
				await handleRemoveWarnings(card.action, instanceId, card.name);
				break;

			case 'add_gidouilles':
				await handleAddGidouilles(card.action, instanceId, card.name);
				break;

			default:
				toaster.error('Action inconnue');
		}
	}

	/**
	 * Handle draw_cards action
	 */
	async function handleDrawCards(
		action: Extract<VipCardType['action'], { type: 'draw_cards' }>,
		instanceId: string,
		_cardName: string
	) {
		openVipCardDrawModal({
			studentId,
			count: action.count,
			filters: action.filters,
			paymentMethod: 'vip_card',
			vipCardInstanceId: instanceId,
			usedCardInstanceId: instanceId, // Pass the card instance to be marked as used in cache
			studentName,
			classId
			// NOTE: No onComplete callback needed - the draw-cards API already marks the VIP card as used
		});
	}

	/**
	 * Handle exchange_cards action
	 */
	async function handleExchangeCards(
		action: Extract<VipCardType['action'], { type: 'exchange_cards' }>,
		_instanceId: string,
		_cardName: string
	) {
		openVipCardExchangeModal({
			studentId,
			exchange: action.exchange,
			studentName,
			classId
			// NOTE: No onComplete callback needed - the exchange API already marks the VIP card as used
		});
	}

	/**
	 * Handle choose_card action
	 */
	async function handleChooseCard(
		action: Extract<VipCardType['action'], { type: 'choose_card' }>,
		instanceId: string,
		_cardName: string
	) {
		openVipCardChooseModal({
			studentId,
			action,
			actionCardInstanceId: instanceId,
			studentName,
			classId
			// NOTE: No onComplete callback needed - the choose API already marks the VIP card as used
		});
	}

	/**
	 * Handle remove_warnings action
	 */
	async function handleRemoveWarnings(
		action: Extract<VipCardType['action'], { type: 'remove_warnings' }>,
		instanceId: string,
		_cardName: string
	) {
		openRemoveWarningsModal({
			studentId,
			classId,
			periodId,
			count: action.count,
			warningType: action.warningType,
			studentName,
			onComplete: async () => {
				// Mark VIP card as used after successful warnings removal
				// (markCardAsUsed already handles optimistic UI + API call + rollback)
				const vipCards = getVipCards();
				const previousVipCards = { ...vipCards };

				try {
					// Optimistic update
					const instance = vipCards[instanceId];
					const newVipCards = {
						...vipCards,
						[instanceId]: {
							...instance,
							usedAt: new Date().toISOString(),
							activationRequestedAt: null,
							activationRequestedBy: null
						}
					};

					teacherCache.updateVipCardsOptimistic(classId, studentId, newVipCards);

					// API call
					const response = await fetch('/api/vip-cards/use-card', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ instanceId, studentId })
					});

					const result = await response.json();

					if (!response.ok) {
						throw new Error(result.message || 'Échec marquage carte utilisée');
					}

					// Success - no toast here, the warnings removal already showed success
				} catch (err) {
					// Rollback on error
					teacherCache.updateVipCardsOptimistic(classId, studentId, previousVipCards);
					const message = err instanceof Error ? err.message : 'Erreur inconnue';
					toaster.error(`Erreur carte VIP : ${message}`);
					throw err; // Re-throw to let RemoveWarningsModal know there was an error
				}
			}
		});
	}

	/**
	 * Handle add_gidouilles action
	 */
	async function handleAddGidouilles(
		action: Extract<VipCardType['action'], { type: 'add_gidouilles' }>,
		instanceId: string,
		cardName: string
	) {
		try {
			const response = await fetch('/api/teacher/rewards/update-student', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					gidouilles: action.amount,
					operation: 'add'
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Échec ajout gidouilles');
			}

			// Optimistic update cache
			teacherCache.updateGidouillesOptimistic(classId, studentId, action.amount);

			// Mark card as used
			await markCardAsUsed(instanceId, cardName);

			toaster.success(`${action.amount} gidouilles ajoutées !`);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(message);
		}
	}

	/**
	 * Mark a VIP card instance as used
	 */
	async function markCardAsUsed(instanceId: string, cardName: string) {
		// Get current VIP cards
		const vipCards = getVipCards();

		// Save current state for rollback
		const previousVipCards = { ...vipCards };

		try {
			// Optimistic update
			const instance = vipCards[instanceId];
			const newVipCards = {
				...vipCards,
				[instanceId]: {
					...instance,
					usedAt: new Date().toISOString(),
					activationRequestedAt: null,
					activationRequestedBy: null
				}
			};

			teacherCache.updateVipCardsOptimistic(classId, studentId, newVipCards);

			// API call
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Échec marquage carte utilisée');
			}

			toaster.success(`Carte ${cardName} utilisée !`);
		} catch (err) {
			// Rollback on error
			teacherCache.updateVipCardsOptimistic(classId, studentId, previousVipCards);
			const message = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(message);
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
		category?: string;
		rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	}) {
		if (!teacherView) return;

		// Get current VIP cards
		const vipCards = getVipCards();

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

<!-- Modal Content (ModalStackRenderer provides backdrop and click-to-close) -->
<div
	class="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="vip-cards-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<h2 id="vip-cards-title" class="flex items-center gap-2 text-2xl font-bold">
			<Sparkles class="h-6 w-6 text-amber-500" />
			Cartes VIP de {studentName}
		</h2>
		<button
			onclick={handleClose}
			class="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
			aria-label="Fermer"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	<!-- Cards Display -->
	{#if getCardsWithCounts().length === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
			<div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
				<Sparkles class="h-12 w-12 text-muted-foreground" />
			</div>
			<h3 class="mb-2 text-xl font-semibold text-foreground">Aucune carte VIP pour le moment</h3>
			<p class="max-w-md text-muted-foreground">
				{studentName} n'a pas encore de cartes VIP. Il faut dépenser 3 gidouilles pour obtenir une carte
				aléatoire.
			</p>
		</div>
	{:else}
		<!-- All Cards Grid - Sorted by Rarity -->
		<div class="grid grid-cols-2 gap-8 p-6 sm:grid-cols-3 xl:grid-cols-3">
			{#each getCardsWithCounts() as card (card.id)}
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

	<!-- Footer -->
	<div class="mt-6 flex justify-end">
		<Button variant="outline" onclick={handleClose}>Fermer</Button>
	</div>
</div>

<!-- Holographic Card Modal -->
{#if selectedCardForHolo}
	<VipCardHoloModal
		card={selectedCardForHolo.card}
		count={selectedCardForHolo.count}
		visible={holoModalVisible}
		onClose={closeHoloModal}
	/>
{/if}

<!-- VipCardDrawResultModal removed: now using VipCardDrawModal via modal stack -->
