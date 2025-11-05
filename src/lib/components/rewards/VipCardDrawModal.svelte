<!--
	VipCardDrawModal Component
	===========================
	Modal that handles the VIP card drawing flow with animations.

	Features:
	- Automatic API call on mount (with guard to prevent re-execution)
	- Optimistic UI updates for gidouilles
	- Error handling with rollback
	- Smart animation selection (multi-holo for ≤3 cards, batch for 4+)
	- Auto-close on error after 3 seconds
	- Button label changes based on modal stack depth

	Props:
	- studentId: string - Student UUID
	- count: number - Number of cards to draw
	- paymentMethod: 'gidouilles' | 'vip_card' - Payment type
	- gidouillesCost?: number - Cost if paying with gidouilles
	- vipCardInstanceId?: string - Card instance ID if paying with VIP card
	- studentName?: string - Student name for display

	Flow:
	1. Mount → handleDraw() → API call
	2. Loading → Show spinner
	3. Success → Populate cards → Animate
	4. Animation complete → Show click hint → Click anywhere to continue
	5. Error → Show message → Auto-close after 3s
-->

<script lang="ts">
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getVipCardById } from '$lib/types/vip-card';
	import type { VipCard } from '$lib/types/vip-card';
	import VipCardMultiHoloReveal from './VipCardMultiHoloReveal.svelte';
	import VipCardBatchReveal from './VipCardBatchReveal.svelte';
	import { onMount } from 'svelte';

	interface Props {
		studentId: string;
		count: number;
		paymentMethod: 'gidouilles' | 'vip_card';
		gidouillesCost?: number;
		vipCardInstanceId?: string;
		studentName?: string;
		classId?: string; // Optional: for cache optimistic updates
	}

	let {
		studentId,
		count,
		paymentMethod,
		gidouillesCost,
		vipCardInstanceId,
		studentName,
		classId
	}: Props = $props();

	// State
	let loading = $state(true);
	let cards = $state<Array<{ card: VipCard; instanceId: string; earnedAt: string }>>([]);
	let error = $state<string | null>(null);
	let animationComplete = $state(false);

	// Derived state
	let useMultiHolo = $derived(cards.length > 0 && cards.length <= 3);
	let useBatch = $derived(cards.length > 3);

	/**
	 * Handle card drawing with optimistic updates
	 */
	async function handleDraw() {
		loading = true;
		error = null;

		// Optimistic update (if gidouilles payment and classId provided)
		if (paymentMethod === 'gidouilles' && gidouillesCost && classId) {
			teacherCache.updateGidouillesOptimistic(classId, studentId, -gidouillesCost);
		}

		try {
			const response = await fetch('/api/rewards/draw-vip-cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					count,
					paymentMethod,
					...(paymentMethod === 'gidouilles' ? { gidouillesCost } : { vipCardInstanceId })
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Échec du tirage de cartes');
			}

			const result = await response.json();

			// Map to full card objects
			cards = result.cards
				.map((c: { cardId: string; instanceId: string; earnedAt: string }) => {
					const card = getVipCardById(c.cardId);
					if (!card) {
						console.error(`Card not found: ${c.cardId}`);
						return null;
					}
					return {
						card,
						instanceId: c.instanceId,
						earnedAt: c.earnedAt
					};
				})
				.filter(
					(
						c: { card: VipCard; instanceId: string; earnedAt: string } | null
					): c is {
						card: VipCard;
						instanceId: string;
						earnedAt: string;
					} => c !== null
				);

			// Update cache with new cards (if classId provided)
			if (classId) {
				// Get current VIP cards from cache
				const currentRewards = teacherCache.getRewardsSync(classId);
				const studentRewards = currentRewards?.get(studentId);

				if (studentRewards) {
					// Merge new cards with existing cards
					const updatedVipCards = { ...studentRewards.vip_cards };

					for (const c of result.cards) {
						updatedVipCards[c.instanceId] = {
							cardId: c.cardId,
							earnedAt: c.earnedAt,
							usedAt: null
						};
					}

					teacherCache.updateVipCardsOptimistic(classId, studentId, updatedVipCards);
				}
			}

			toaster.success(`${count} carte${count > 1 ? 's' : ''} VIP tirée${count > 1 ? 's' : ''} !`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(error);

			// Rollback optimistic update (if classId provided)
			if (paymentMethod === 'gidouilles' && gidouillesCost && classId) {
				teacherCache.updateGidouillesOptimistic(classId, studentId, gidouillesCost);
			}

			// Auto-close after showing error
			setTimeout(() => {
				modalStack.pop();
			}, 3000);
		} finally {
			loading = false;
		}
	}

	/**
	 * Handle continue action (click anywhere or keyboard)
	 */
	function handleContinue() {
		// Only allow continue when animation is complete
		if (!animationComplete) return;

		modalStack.pop();
		// onReturn callback will be called automatically by modalStack
	}

	/**
	 * Handle keyboard events for accessibility
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (!animationComplete) return;

		if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
			event.preventDefault();
			handleContinue();
		}
	}

	/**
	 * Animation complete callback
	 */
	function handleAnimationComplete() {
		animationComplete = true;
	}

	onMount(() => {
		handleDraw();
	});
</script>

<!-- Fullscreen overlay -->
<div
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
	class:cursor-pointer={animationComplete}
	role="dialog"
	aria-modal="true"
	aria-labelledby="draw-modal-title"
	onclick={handleContinue}
	onkeydown={handleKeydown}
	tabindex={animationComplete ? 0 : -1}
>
	{#if loading}
		<!-- Loading State -->
		<div class="flex flex-col items-center gap-4">
			<div
				class="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
			<p class="text-lg text-white">Tirage en cours...</p>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="flex flex-col items-center gap-4 text-center">
			<div class="text-6xl">❌</div>
			<h2 class="text-2xl font-bold text-white">Erreur</h2>
			<p class="text-lg text-red-400">{error}</p>
			<p class="text-sm text-white/60">Fermeture automatique...</p>
		</div>
	{:else if useMultiHolo}
		<!-- Multi-Holo Reveal (1-3 cards) -->
		<div class="relative w-full">
			<VipCardMultiHoloReveal {cards} oncomplete={handleAnimationComplete} />
		</div>
	{:else if useBatch}
		<!-- Batch Reveal (4+ cards) -->
		<div class="relative w-full">
			<VipCardBatchReveal {cards} {studentName} oncomplete={handleAnimationComplete} />
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in-pulse {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(10px);
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.8;
			transform: translateX(-50%) translateY(0);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-fade-in-pulse {
		animation:
			fade-in-pulse 0.8s ease-out,
			pulse 2s ease-in-out 0.8s infinite;
	}
</style>
