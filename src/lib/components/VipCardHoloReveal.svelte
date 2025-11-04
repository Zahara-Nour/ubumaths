<!--
	VipCardHoloReveal Component
	============================
	Dramatic holographic card reveal sequence for VIP card rewards.

	Animation Flow:
	1. Card back visible with shaking animation (loading state)
	2. Database sync happens in background
	3. On confirmation: shake stops, dramatic pause
	4. Card flips to reveal holographic front
	5. Confetti and sparkles celebration
	6. Click anywhere to dismiss

	Props:
	- card: VipCard (required) - The card to reveal
	- studentName: string (optional) - Student name for display
	- loading: boolean (default: true) - Shows shake animation
	- confirmed: boolean (default: false) - Triggers flip when true
	- onComplete: () => void (optional) - Callback on dismiss

	Technical Details:
	- Uses VipCardHolo component with showBack prop for flip
	- Physical shake animation (2deg rotation)
	- Confetti system with 60 pieces
	- Sparkles background effect
	- Fullscreen modal overlay
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import VipCardHolo from './VipCardHolo.svelte';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

	interface Props {
		card: VipCardType;
		studentName?: string;
		loading?: boolean;
		confirmed?: boolean;
		onComplete?: () => void;
		oncomplete?: () => void; // Alias for onComplete (lowercase)
		delay?: number; // Delay before starting animation (for multi-reveal)
	}

	let {
		card,
		studentName = 'Élève', // eslint-disable-line @typescript-eslint/no-unused-vars
		loading = true,
		confirmed = false,
		onComplete,
		oncomplete,
		delay = 0
	}: Props = $props();

	// Animation states
	let visible = $state(false);
	let cardVisible = $state(false);
	let showCardBack = $state(true); // Start with back
	let cardFlipped = $state(false);
	let confettiActive = $state(false);
	let shakeStopped = $state(false);
	let cardPopped = $state(false);

	// Watch for confirmation to trigger flip
	$effect(() => {
		if (confirmed && !cardFlipped && cardVisible) {
			// Confirmation received - stop shake and flip
			triggerFlip();
		}
	});

	// Watch for card changes (when real card arrives after loading)
	// This updates the displayed card without remounting the component
	$effect(() => {
		// React to card prop changes - this ensures smooth transition
		// when the temporary card is replaced with the real one
		void card;
	});

	function triggerFlip() {
		// Step 1: Stop shake (dramatic pause)
		shakeStopped = true;

		// Step 2: Flip card to front
		setTimeout(() => {
			showCardBack = false; // Flip to FRONT
			cardFlipped = true;
		}, 400 + delay);

		// Step 3: Pop animation
		setTimeout(() => {
			cardPopped = true;
		}, 600 + delay);

		// Step 4: Confetti
		setTimeout(() => {
			confettiActive = true;
		}, 700 + delay);

		// Step 5: Call completion callback
		setTimeout(() => {
			if (oncomplete) {
				oncomplete();
			} else if (onComplete) {
				onComplete();
			}
		}, 3000 + delay);
	}

	onMount(() => {
		// Show overlay and card immediately
		setTimeout(() => {
			visible = true;
		}, 50);

		setTimeout(() => {
			cardVisible = true;
		}, 200);
	});

	function handleDismiss() {
		visible = false;
		setTimeout(() => {
			onComplete?.();
		}, 500);
	}

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
</script>

<!-- Fullscreen Overlay -->
<div
	class={cn(
		'fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500',
		visible ? 'opacity-100' : 'pointer-events-none opacity-0'
	)}
	onclick={handleDismiss}
	onkeydown={(e) => {
		if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
			handleDismiss();
		}
	}}
	role="dialog"
	aria-modal="true"
	aria-labelledby="reveal-title"
	tabindex="0"
>
	<!-- Backdrop -->
	<div class="absolute inset-0 bg-black/85 backdrop-blur-sm"></div>

	<!-- Content Container -->
	<div class="relative z-10 flex w-full max-w-7xl flex-col items-center gap-6">
		<!-- Sparkles Background -->
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

		<!-- Card Container with shake or pop animation -->
		<div
			class={cn(
				'w-full max-w-xs transition-all duration-400 sm:max-w-sm',
				cardVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0',
				loading && !shakeStopped && 'animate-card-shake',
				shakeStopped && !cardFlipped && 'animate-shake-stop',
				cardPopped && 'animate-card-pop'
			)}
		>
			<VipCardHolo
				{card}
				showBack={showCardBack}
				showcase={cardFlipped}
				enable3d={cardFlipped}
				enablePopover={false}
				enableGyroscope={false}
				enableHoloEffect={cardFlipped}
			/>
		</div>

		<!-- Card Name and Description (after flip) -->
		{#if cardFlipped}
			<div
				class={cn(
					'max-w-2xl px-4 text-center transition-all delay-500 duration-700',
					cardFlipped ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
				)}
			>
				<h3 class="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
					{card.name}
				</h3>
				<p class="mb-2 text-lg text-white/90 drop-shadow-md md:text-xl">
					{card.description}
				</p>
			</div>
		{/if}

		<!-- Dismiss Hint (after flip) -->
		{#if cardFlipped}
			<p
				class={cn(
					'mt-2 text-sm text-white/60 transition-all delay-1000 duration-700',
					cardFlipped ? 'opacity-100' : 'opacity-0'
				)}
			>
				Cliquez n'importe où pour continuer
			</p>
		{/if}

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

	/* Card Shake Animation (continuous while loading) */
	@keyframes card-shake {
		0%,
		100% {
			transform: rotate(-2deg) scale(1.02);
		}
		50% {
			transform: rotate(2deg) scale(1.02);
		}
	}

	.animate-card-shake {
		animation: card-shake 0.4s ease-in-out infinite;
	}

	/* Shake Stop Animation (dramatic pause) */
	@keyframes shake-stop {
		0% {
			transform: rotate(2deg) scale(1.02);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	.animate-shake-stop {
		animation: shake-stop 0.4s ease-out forwards;
	}

	/* Card Pop Animation (after flip) */
	@keyframes card-pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1.1);
		}
	}

	.animate-card-pop {
		animation: card-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	/* Title glow pulse */
	@keyframes glow {
		0%,
		100% {
			text-shadow: 0 0 15px rgba(255, 215, 0, 0.6);
		}
		50% {
			text-shadow:
				0 0 25px rgba(255, 215, 0, 0.9),
				0 0 35px rgba(255, 215, 0, 0.7);
		}
	}
</style>
