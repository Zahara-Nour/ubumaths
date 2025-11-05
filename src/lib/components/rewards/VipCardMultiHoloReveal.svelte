<!--
	VipCardMultiHoloReveal Component
	=================================
	Renders 1-3 cards simultaneously with staggered holographic reveal animations
	and celebration effects when ALL cards are revealed.

	Features:
	- Displays multiple VipCardHoloReveal components side by side
	- Staggered animation delays (0ms, 300ms, 600ms)
	- Tracks when ALL cards have flipped
	- Triggers sparkles and confetti effects when all cards are revealed
	- Responsive layout (stacks on mobile)
	- Calls oncomplete when all animations complete

	Props:
	- cards: Array of card objects with card, instanceId, earnedAt
	- studentName?: string - Student name for display
	- oncomplete?: () => void - Callback when all animations complete

	Layout:
	- Horizontal flex layout on desktop
	- Stacked on mobile (sm breakpoint)
	- Gap between cards
	- Celebration effects overlay entire container
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
		oncomplete?: () => void;
	}

	let { cards, oncomplete }: Props = $props();

	// Track completion of each card flip
	let flippedCount = $state(0);
	let allCardsRevealed = $state(false);
	let confettiActive = $state(false);

	// Stagger delays for each card (0ms, 300ms, 600ms)
	const delays = [0, 300, 600];

	// Generate random sparkles
	function generateSparkles() {
		const sparkles: Array<{ left: number; top: number; delay: number; duration: number }> = [];
		for (let i = 0; i < 30; i++) {
			sparkles.push({
				left: Math.random() * 100,
				top: Math.random() * 100,
				delay: Math.random() * 1000,
				duration: 1000 + Math.random() * 1500
			});
		}
		return sparkles;
	}

	const sparkles = generateSparkles();

	// Generate confetti pieces
	function generateConfetti() {
		const confetti: Array<{
			left: number;
			color: string;
			delay: number;
			duration: number;
			rotation: number;
		}> = [];
		const colors = [
			'#FFD700',
			'#FF6B6B',
			'#4ECDC4',
			'#45B7D1',
			'#FFA07A',
			'#98D8C8',
			'#F7B731',
			'#EE5A6F',
			'#C56CF0',
			'#17C0EB'
		];

		for (let i = 0; i < 60; i++) {
			confetti.push({
				left: 15 + Math.random() * 70,
				color: colors[Math.floor(Math.random() * colors.length)],
				delay: Math.random() * 600,
				duration: 2000 + Math.random() * 1500,
				rotation: Math.random() * 360
			});
		}
		return confetti;
	}

	const confetti = generateConfetti();

	/**
	 * Handle individual card flip completion
	 */
	function handleCardFlipComplete() {
		flippedCount++;

		// When ALL cards are flipped, trigger celebration effects
		if (flippedCount === cards.length) {
			allCardsRevealed = true;

			// Trigger confetti after a short delay
			setTimeout(() => {
				confettiActive = true;
			}, 300);

			// Call parent callback after celebration starts
			setTimeout(() => {
				oncomplete?.();
			}, 2000);
		}
	}
</script>

<!-- Container with relative positioning for absolute effects -->
<div class="relative flex h-full w-full items-center justify-center p-6">
	<!-- Sparkles Background (visible when all cards revealed) -->
	{#if allCardsRevealed}
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			{#each sparkles as sparkle, i (i)}
				<div
					class="animate-sparkle absolute h-2 w-2 rounded-full bg-yellow-300"
					style="
						left: {sparkle.left}%;
						top: {sparkle.top}%;
						animation-delay: {sparkle.delay}ms;
						animation-duration: {sparkle.duration}ms;
					"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Confetti (visible when triggered) -->
	{#if confettiActive}
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			{#each confetti as piece, i (i)}
				<div
					class="animate-confetti absolute h-3 w-3 rounded-sm"
					style="
						left: {piece.left}%;
						top: -10%;
						background-color: {piece.color};
						animation-delay: {piece.delay}ms;
						animation-duration: {piece.duration}ms;
						transform: rotate({piece.rotation}deg);
					"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Cards Grid -->
	<div
		class="relative z-10 flex flex-col items-center justify-center gap-16 sm:flex-row sm:gap-16 md:gap-24 lg:gap-32"
	>
		{#each cards as cardData, index (cardData.instanceId)}
			<div class="flex w-full max-w-xs flex-col items-center sm:max-w-sm">
				<VipCardHoloReveal
					card={cardData.card}
					loading={true}
					confirmed={true}
					delay={delays[index] || 0}
					onflipComplete={handleCardFlipComplete}
					holo={cards.length === 1}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	/* Sparkle Animation */
	@keyframes sparkle {
		0%,
		100% {
			opacity: 0;
			transform: scale(0);
		}
		50% {
			opacity: 1;
			transform: scale(1.2);
		}
	}

	.animate-sparkle {
		animation: sparkle 2s ease-in-out infinite;
	}

	/* Confetti Animation */
	@keyframes confetti {
		0% {
			transform: translateY(0) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(110vh) rotate(720deg);
			opacity: 0;
		}
	}

	.animate-confetti {
		animation: confetti 3s linear forwards;
	}

	/* Title Fade In */
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
