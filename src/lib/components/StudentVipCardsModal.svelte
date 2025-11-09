<!--
	StudentVipCardsModal Component
	================================
	Modal dialog displaying VIP cards owned by a student (student view).

	This is a simpler version of VipCardsModal designed specifically for students.

	KEY DIFFERENCES FROM VipCardsModal (TEACHER VIEW):
	- VipCardsModal: Teacher view with teacherCache, can remove/use cards directly
	- StudentVipCardsModal: Student view with props, uses two-step activation flow

	THREE-STATE ACTIVATION FLOW FOR ACTION CARDS:
	----------------------------------------------
	1. NOT REQUESTED: "Demander l'activation" button (student can request)
	2. PENDING APPROVAL: "En attente d'approbation" badge (waiting for teacher)
	3. APPROVED: "Activer" button (green, student can activate)

	Features:
	- Responsive grid layout of owned cards (2-3 columns)
	- Count badges on cards (×N for multiple instances)
	- Click card to view holographic detail modal
	- Request activation button for action cards (if not already pending)
	- "Pending" badge if activation already requested
	- "Activate" button if approved by teacher (opens appropriate action modal)
	- Empty state for no cards
	- Clean, student-friendly UI

	NOT INCLUDED:
	- Remove button (students cannot remove cards)
	- Direct "Use" button without approval (students must request approval from teacher)
	- Teacher-only features
	- Card history or locked cards (that's for collection page)

	Props:
	- vipCards: StudentVipCards - Currently owned cards from profile
	- studentId: string - UUID for activation requests
	- classId?: string - Optional, needed for remove_warnings action
	- periodId?: string - Optional, needed for remove_warnings action
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X } from 'lucide-svelte';
	import VipCard from './VipCard.svelte';
	import VipCardHoloModal from './VipCardHoloModal.svelte';
	import {
		getStudentCardsWithCounts,
		sortCardsByPriority,
		getTotalUnusedCards
	} from '$lib/utils/vip-cards';
	import type { VipCard as VipCardType, StudentVipCards } from '$lib/types/vip-card';
	import { Sparkles } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import {
		openVipCardDrawModal,
		openVipCardExchangeModal,
		openVipCardChooseModal,
		openRemoveWarningsModal
	} from '$lib/utils/vip-card-modals';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { syncVipCards } from '$lib/utils/cache-sync';

	interface Props {
		studentId: string;
		classId?: string; // Optional: needed for remove_warnings action
		periodId?: string; // Optional: needed for remove_warnings action
	}

	let { studentId, classId, periodId }: Props = $props();

	// Local state for VIP cards (enables reactive updates)
	let vipCards = $state<StudentVipCards>({});

	// Sync with cache (reactive to cache changes)
	$effect(() => {
		const rewards = studentCache.getRewardsSync();
		if (rewards) {
			vipCards = rewards.vip_cards;
		}
	});

	// Holographic modal state
	let holoModalVisible = $state(false);
	let selectedCardForHolo = $state<{ card: VipCardType; count: number } | null>(null);

	/**
	 * Get cards with counts, sorted and filtered
	 * Using $derived to be reactive to both vipCards AND template store
	 */
	const cardsWithCounts = $derived.by(() => {
		const templates = $vipCardTemplates;
		const cards = getStudentCardsWithCounts(vipCards, templates);
		return sortCardsByPriority(cards).filter((card) => card.count > 0);
	});

	// Statistics
	const totalCardsCount = $derived(getTotalUnusedCards(vipCards));

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
		return Object.values(vipCards).some(
			(inst) =>
				inst.cardId === cardId &&
				inst.activationRequestedAt &&
				!inst.activationApprovedAt &&
				!inst.usedAt
		);
	}

	/**
	 * Check if a card has been approved and is ready to activate
	 */
	function cardIsApproved(cardId: string): boolean {
		return Object.values(vipCards).some(
			(inst) => inst.cardId === cardId && inst.activationApprovedAt && !inst.usedAt
		);
	}

	/**
	 * Find an unused instance of a card (preferably one without pending request)
	 */
	function findInstanceToRequest(cardId: string): string | null {
		const entries = Object.entries(vipCards);

		// Find an unused instance without pending request
		const available = entries.find(
			([_, inst]) => inst.cardId === cardId && !inst.usedAt && !inst.activationRequestedAt
		);
		if (available) return available[0];

		// If all have pending requests, return null (shouldn't happen normally)
		return null;
	}

	/**
	 * Find the approved instance of a card
	 */
	function findApprovedInstance(cardId: string): string | null {
		const entries = Object.entries(vipCards);
		const approved = entries.find(
			([_, inst]) => inst.cardId === cardId && inst.activationApprovedAt && !inst.usedAt
		);
		return approved ? approved[0] : null;
	}

	/**
	 * Activate an approved card
	 * Opens the appropriate action modal based on the card's action type
	 */
	async function handleActivateCard(card: {
		id: string;
		name: string;
		action?: VipCardType['action'];
	}) {
		// Verify card has an action
		if (!card.action) {
			toaster.error("Cette carte n'a pas d'action activable");
			return;
		}

		// Find the approved instance
		const instanceId = findApprovedInstance(card.id);
		if (!instanceId) {
			toaster.error('Aucune carte approuvée trouvée');
			return;
		}

		/**
		 * Callback after action completes successfully
		 *
		 * PATTERN: Server-confirmed optimistic update
		 * The action endpoint marks the card as used on the server.
		 * We refetch from cache to get the updated state.
		 *
		 * FIX: Force immediate local state update after cache refetch
		 * to avoid race condition with $effect() reactivity.
		 */
		const onComplete = async () => {
			try {
				// CRITICAL: Invalidate cache FIRST to force fresh fetch from API
				// Without this, getRewards() returns stale data if cache < 10min old
				studentCache.invalidateRewards();

				// Now fetch fresh data from API (cache is empty, so it will fetch)
				await studentCache.getRewards();

				// Force immediate UI update by directly updating local state
				// This ensures the UI updates right away, avoiding race condition
				const rewards = studentCache.getRewardsSync();
				if (rewards) {
					vipCards = rewards.vip_cards;
				}

				toaster.success(`${card.name} activée avec succès !`);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Erreur inconnue';
				toaster.error(message);
				// Even if refetch fails, the card was successfully used on the server
			}
		};

		// Open the appropriate modal based on action type
		const action = card.action;

		switch (action.type) {
			case 'draw_cards':
				openVipCardDrawModal({
					studentId,
					count: action.count,
					paymentMethod: 'vip_card',
					vipCardInstanceId: instanceId,
					usedCardInstanceId: instanceId,
					filters: action.filters,
					onComplete
				});
				break;

			case 'exchange_cards':
				openVipCardExchangeModal({
					studentId,
					exchange: action.exchange,
					actionCardInstanceId: instanceId,
					onComplete
				});
				break;

			case 'choose_card':
				openVipCardChooseModal({
					studentId,
					action: action,
					actionCardInstanceId: instanceId,
					onComplete
				});
				break;

			case 'remove_warnings':
				if (!classId || !periodId) {
					toaster.error(
						"Cette action nécessite un contexte de classe. Veuillez l'activer depuis votre tableau de bord de classe."
					);
					return;
				}
				openRemoveWarningsModal({
					studentId,
					classId,
					periodId,
					count: action.count,
					warningType: action.warningType,
					onComplete
				});
				break;

			case 'add_gidouilles':
				// For add_gidouilles, we just mark it as used and the backend handles the gidouille addition
				await onComplete();
				break;

			default:
				toaster.error("Type d'action non supporté");
				break;
		}
	}

	/**
	 * Request activation for a card
	 * Students cannot use cards directly - must request teacher approval
	 *
	 * PATTERN: Optimistic update BEFORE API call
	 * 1. Update cache immediately (activationRequestedAt = now)
	 * 2. Make API call
	 * 3. Success: Cache already correct ✅
	 * 4. Error: Rollback cache update ❌
	 */
	async function handleRequestActivation(card: {
		id: string;
		name: string;
		action?: VipCardType['action'];
	}) {
		// Verify card has an action
		if (!card.action) {
			toaster.error("Cette carte n'a pas d'action activable");
			return;
		}

		// Check if already has pending request
		if (cardHasPendingRequest(card.id)) {
			toaster.warning("Demande d'activation déjà en attente");
			return;
		}

		// Find instance to request activation for
		const instanceId = findInstanceToRequest(card.id);
		if (!instanceId) {
			toaster.error('Aucune carte disponible');
			return;
		}

		// Save current state for potential rollback
		const currentVipCards = { ...vipCards };
		const now = new Date().toISOString();

		// 1. OPTIMISTIC UPDATE (instant UI feedback)
		const optimisticCards: StudentVipCards = {
			...vipCards,
			[instanceId]: {
				...vipCards[instanceId],
				activationRequestedAt: now,
				activationRequestedBy: studentId
			}
		};

		// Update cache (vipCards derived will update automatically)
		syncVipCards({ type: 'student' }, optimisticCards);

		try {
			// 2. API CALL
			const response = await fetch('/api/vip-cards/request-activation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Échec de la demande d'activation");
			}

			// 3. SUCCESS: Cache already correct ✅
			toaster.success(`Demande d'activation envoyée pour ${card.name} !`);
		} catch (err) {
			// 4. ERROR: Rollback optimistic update ❌
			// Rollback cache (vipCards derived will update automatically)
			syncVipCards({ type: 'student' }, currentVipCards);

			const message = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(message);
		}
	}
</script>

<!-- Modal Content (ModalStackRenderer provides backdrop and click-to-close) -->
<div
	class="relative max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
	role="dialog"
	aria-modal="true"
	aria-labelledby="student-vip-cards-title"
>
	<!-- Header with close button -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 id="student-vip-cards-title" class="flex items-center gap-2 text-2xl font-bold">
				<Sparkles class="h-6 w-6 text-amber-500" />
				Mes Cartes VIP
			</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				{totalCardsCount} carte{totalCardsCount > 1 ? 's' : ''} en ta possession
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

	<!-- Cards Display -->
	{#if cardsWithCounts.length === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
			<div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
				<Sparkles class="h-12 w-12 text-muted-foreground" />
			</div>
			<h3 class="mb-2 text-xl font-semibold text-foreground">Aucune carte VIP pour le moment</h3>
			<p class="max-w-md text-muted-foreground">
				Tu n'as pas encore de cartes VIP. Dépense 3 gidouilles pour obtenir une carte aléatoire !
			</p>
		</div>
	{:else}
		<!-- All Cards Grid - Sorted by Rarity -->
		<div class="grid grid-cols-2 gap-8 p-6 sm:grid-cols-3 xl:grid-cols-3">
			{#each cardsWithCounts as card (card.id)}
				<div class="flex flex-col items-center gap-3">
					<!-- Card -->
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
						<VipCard card={card as VipCardType} count={card.count} size="sm" clickable={false} />
					</div>

					<!-- Request Activation / Activate Button (only for action cards) -->
					{#if card.action}
						{#if cardIsApproved(card.id)}
							<!-- Activate Button (approved, ready to use) -->
							<Button
								size="sm"
								variant="default"
								class="bg-gradient-to-r from-green-500 to-emerald-500 text-xs text-white hover:from-green-600 hover:to-emerald-600"
								onclick={() => handleActivateCard(card)}
							>
								<Sparkles class="mr-1 h-3 w-3" />
								Activer
							</Button>
						{:else if cardHasPendingRequest(card.id)}
							<!-- Pending Badge (requested, awaiting approval) -->
							<div
								class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900 dark:text-orange-300"
							>
								En attente d'approbation
							</div>
						{:else}
							<!-- Request Button (not yet requested) -->
							<Button
								size="sm"
								variant="outline"
								class="text-xs"
								onclick={() => handleRequestActivation(card)}
							>
								Demander l'activation
							</Button>
						{/if}
					{/if}
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
