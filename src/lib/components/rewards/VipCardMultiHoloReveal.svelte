<!--
	VipCardMultiHoloReveal Component
	=================================
	Renders 1-3 cards simultaneously with staggered holographic reveal animations.

	Features:
	- Displays multiple VipCardHoloReveal components side by side
	- Staggered animation delays (0ms, 300ms, 600ms)
	- Tracks completion of all card animations
	- Responsive layout (stacks on mobile)
	- Calls oncomplete when ALL cards finish animating

	Props:
	- cards: Array of card objects with card, instanceId, earnedAt
	- studentName?: string - Student name for display
	- oncomplete?: () => void - Callback when all animations complete

	Layout:
	- Horizontal flex layout on desktop
	- Stacked on mobile (sm breakpoint)
	- Gap between cards
-->

<script lang="ts">
	import VipCardHoloReveal from '$lib/components/VipCardHoloReveal.svelte';
	import type { VipCard } from '$lib/types/vip-card';

	interface Props {
		cards: Array<{
			card: VipCard;
			instanceId: string;
			earnedAt: string;
		}>;
		studentName?: string;
		oncomplete?: () => void;
	}

	let { cards, studentName, oncomplete }: Props = $props();

	// Track completion of each card
	let completedCount = $state(0);

	// Stagger delays for each card (0ms, 300ms, 600ms)
	const delays = [0, 300, 600];

	/**
	 * Handle individual card animation completion
	 */
	function handleCardComplete() {
		completedCount++;

		// If all cards are done, call parent callback
		if (completedCount === cards.length && oncomplete) {
			oncomplete();
		}
	}
</script>

<!-- Container -->
<div class="flex h-full w-full items-center justify-center p-6">
	<!-- Title -->
	{#if studentName}
		<div class="animate-fade-in absolute top-12 left-1/2 -translate-x-1/2 text-center">
			<h2 class="text-3xl font-bold text-white drop-shadow-lg">
				✨ {cards.length} Carte{cards.length > 1 ? 's' : ''} VIP pour {studentName} !
			</h2>
		</div>
	{/if}

	<!-- Cards Grid -->
	<div class="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-6 md:gap-8">
		{#each cards as cardData, index (cardData.instanceId)}
			<div class="w-full max-w-xs sm:max-w-sm">
				<VipCardHoloReveal
					card={cardData.card}
					{studentName}
					loading={true}
					confirmed={true}
					delay={delays[index] || 0}
					oncomplete={handleCardComplete}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translate(-50%, -10px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.6s ease-out;
	}
</style>
