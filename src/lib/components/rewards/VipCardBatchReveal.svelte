<!--
	VipCardBatchReveal Component
	=============================
	Simplified reveal animation for 4+ cards (no individual flip animations).

	Features:
	- Displays cards in a responsive grid (3-4 per row)
	- Fade-in animation with staggered delay per card
	- Confetti celebration
	- Shows card image, name, and rarity badge
	- Calls oncomplete after 2 seconds

	Props:
	- cards: Array of card objects with card, instanceId, earnedAt
	- studentName?: string - Student name for display
	- oncomplete?: () => void - Callback after animation

	Layout:
	- Grid: 3 columns on mobile, 4 on desktop
	- Each card shows image, name, rarity
	- Staggered fade-in (50ms per card)
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import type { VipCard } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

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

	// Animation state
	let visible = $state(false);
	let confettiActive = $state(false);

	// Rarity colors for badges
	const rarityColors: Record<string, string> = {
		common: 'bg-gray-500',
		rare: 'bg-blue-500',
		epic: 'bg-purple-500',
		legendary: 'bg-amber-500'
	};

	// Rarity labels in French
	const rarityLabels: Record<string, string> = {
		common: 'Commune',
		rare: 'Rare',
		epic: 'Épique',
		legendary: 'Légendaire'
	};

	onMount(() => {
		// Show grid with fade-in
		setTimeout(() => {
			visible = true;
		}, 100);

		// Start confetti
		setTimeout(() => {
			confettiActive = true;
		}, 300);

		// Call oncomplete after 2 seconds
		setTimeout(() => {
			if (oncomplete) {
				oncomplete();
			}
		}, 2000);
	});

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
</script>

<!-- Container -->
<div class="flex h-full w-full items-center justify-center p-6">
	<div class="relative w-full max-w-6xl">
		<!-- Title -->
		<div
			class={cn(
				'mb-8 text-center transition-all duration-500',
				visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
			)}
		>
			<h2 class="mb-2 text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
				✨ {cards.length} Cartes VIP Gagnées !
			</h2>
			{#if studentName}
				<p class="text-xl text-white/90 drop-shadow-md md:text-2xl">
					Pour {studentName}
				</p>
			{/if}
		</div>

		<!-- Cards Grid -->
		<div class="grid grid-cols-3 gap-4 md:grid-cols-4 md:gap-6">
			{#each cards as cardData, index (cardData.instanceId)}
				<div
					class={cn(
						'card-item flex flex-col items-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:bg-white/15',
						visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
					)}
					style="--delay: {index * 50}ms"
				>
					<!-- Card Image -->
					<div class="aspect-[2/3] w-full overflow-hidden rounded-md shadow-lg">
						<img
							src={cardData.card.imagePath}
							alt={cardData.card.name}
							class="h-full w-full object-cover"
						/>
					</div>

					<!-- Card Name -->
					<p class="line-clamp-2 text-center text-sm font-semibold text-white">
						{cardData.card.name}
					</p>

					<!-- Rarity Badge -->
					<div
						class={cn(
							'rounded-full px-3 py-1 text-xs font-medium text-white',
							rarityColors[cardData.card.rarity] || 'bg-gray-500'
						)}
					>
						{rarityLabels[cardData.card.rarity] || cardData.card.rarity}
					</div>
				</div>
			{/each}
		</div>

		<!-- Confetti -->
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
	</div>
</div>

<style>
	/* Card fade-in with stagger */
	.card-item {
		animation-delay: var(--delay);
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
</style>
