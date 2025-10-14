<!--
	VipCardReveal Component
	========================
	Magical animation sequence when a student earns a new VIP card.

	Animation Flow (Default):
	1. Sparkles/particles appear
	2. Card flies in from off-screen with rotation
	3. Card automatically flips to reveal front
	4. Confetti celebration effect
	5. Auto-dismiss after duration or manual click

	Animation Flow (After Loading):
	1. Card is already visible (from loading state)
	2. Card stops shaking (dramatic pause)
	3. Card flips to reveal front
	4. Confetti celebration
	5. Auto-dismiss
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import VipCardHolo from './VipCardHolo.svelte';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

	interface Props {
		card: VipCardType;
		onComplete?: () => void;
		autoDismiss?: boolean;
		dismissDelay?: number; // milliseconds
		fromLoadingState?: boolean; // If true, skip fly-in animation
	}

	let {
		card,
		onComplete,
		autoDismiss = true,
		dismissDelay = 5000,
		fromLoadingState = false
	}: Props = $props();

	// Animation states
	let visible = $state(false);
	let cardVisible = $state(false);
	let cardFlipped = $state(false);
	let confettiActive = $state(false);
	let shakeStop = $state(false); // For dramatic pause when coming from loading
	let showCardBack = $state(true); // Start with back, then flip to front
	let cardPopped = $state(false); // Trigger pop animation after flip

	onMount(() => {
		if (fromLoadingState) {
			// Coming from loading state - card is already visible
			// Start with shake-stop animation and card showing BACK
			visible = true;
			cardVisible = true;
			showCardBack = true; // Start with BACK showing

			// Dramatic pause (shake stops)
			setTimeout(() => {
				shakeStop = true;
			}, 200);

			// Then flip the card to FRONT
			setTimeout(() => {
				showCardBack = false; // Flip to FRONT
				cardFlipped = true; // Mark as flipped for other animations
			}, 600);

			// Trigger pop animation after flip
			setTimeout(() => {
				cardPopped = true;
			}, 800);

			// Confetti
			setTimeout(() => {
				confettiActive = true;
			}, 900);

			// Auto-dismiss
			if (autoDismiss) {
				setTimeout(() => {
					handleDismiss();
				}, dismissDelay);
			}
		} else {
			// Default animation sequence (original behavior)
			setTimeout(() => {
				visible = true;
			}, 50);

			setTimeout(() => {
				cardVisible = true;
				showCardBack = true; // Start with back
			}, 300);

			setTimeout(() => {
				showCardBack = false; // Flip to front
				cardFlipped = true;
			}, 1200);

			// Trigger pop animation after flip
			setTimeout(() => {
				cardPopped = true;
			}, 1400);

			setTimeout(() => {
				confettiActive = true;
			}, 1500);

			// Auto-dismiss
			if (autoDismiss) {
				setTimeout(() => {
					handleDismiss();
				}, dismissDelay);
			}
		}
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
		for (let i = 0; i < 20; i++) {
			sparkles.push({
				left: Math.random() * 100,
				top: Math.random() * 100,
				delay: Math.random() * 1000,
				duration: 1000 + Math.random() * 1000
			});
		}
		return sparkles;
	}

	const sparkles = generateSparkles();

	// Generate confetti pieces
	function generateConfetti() {
		const confetti: Array<{ left: number; color: string; delay: number; duration: number; rotation: number }> = [];
		const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7B731', '#EE5A6F'];

		for (let i = 0; i < 40; i++) {
			confetti.push({
				left: 20 + Math.random() * 60,
				color: colors[Math.floor(Math.random() * colors.length)],
				delay: Math.random() * 500,
				duration: 2000 + Math.random() * 1000,
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
		'fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500',
		visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
	<div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

	<!-- Content Container -->
	<div class="relative z-10 flex flex-col items-center gap-6">
		<!-- Sparkles Background -->
		<div class="absolute inset-0 pointer-events-none overflow-hidden">
			{#each sparkles as sparkle}
				<div
					class="absolute w-2 h-2 bg-yellow-300 rounded-full animate-sparkle"
					style="
						left: {sparkle.left}%;
						top: {sparkle.top}%;
						animation-delay: {sparkle.delay}ms;
						animation-duration: {sparkle.duration}ms;
					"
				></div>
			{/each}
		</div>

		<!-- Title -->
		<h2
			id="reveal-title"
			class={cn(
				'text-4xl font-black text-white text-center transition-all duration-700',
				'drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]',
				visible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
			)}
		>
			🎉 Nouvelle Carte VIP ! 🎉
		</h2>

		<!-- Card Container with fly-in animation or shake-stop -->
		<div
			class={cn(
				'transition-all ease-out',
				fromLoadingState ? 'duration-400' : 'duration-1000',
				cardVisible
					? 'translate-y-0 opacity-100 rotate-0'
					: fromLoadingState
					? 'translate-y-0 opacity-100 rotate-2'
					: 'translate-y-[200px] opacity-0 rotate-[-15deg]',
				fromLoadingState && !shakeStop && 'animate-final-shake',
				fromLoadingState && shakeStop && 'animate-shake-stop',
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

		<!-- Card Name and Description -->
		<div
			class={cn(
				'text-center max-w-md transition-all duration-700 delay-1000',
				cardFlipped ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
			)}
		>
			<h3 class="text-3xl font-bold text-white mb-2 drop-shadow-lg">
				{card.name}
			</h3>
			<p class="text-lg text-white/90 drop-shadow-md">
				{card.description}
			</p>
		</div>

		<!-- Dismiss Hint -->
		<p
			class={cn(
				'text-sm text-white/60 mt-4 transition-all duration-700 delay-1500',
				cardFlipped ? 'opacity-100' : 'opacity-0'
			)}
		>
			Cliquez n'importe où pour continuer
		</p>

		<!-- Confetti -->
		{#if confettiActive}
			<div class="absolute inset-0 pointer-events-none overflow-hidden">
				{#each confetti as piece}
					<div
						class="absolute w-3 h-3 animate-confetti"
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
		0%, 100% {
			opacity: 0;
			transform: scale(0);
		}
		50% {
			opacity: 1;
			transform: scale(1);
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
			transform: translateY(100vh) rotate(720deg);
			opacity: 0;
		}
	}

	.animate-confetti {
		animation: confetti 3s linear forwards;
	}

	/* Pulsing glow animation for title */
	@keyframes glow {
		0%, 100% {
			text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
		}
		50% {
			text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6);
		}
	}

	h2 {
		animation: glow 2s ease-in-out infinite;
	}

	/* Final shake before stopping (when coming from loading) */
	@keyframes final-shake {
		0%, 100% {
			transform: rotate(2deg);
		}
		50% {
			transform: rotate(-2deg);
		}
	}

	.animate-final-shake {
		animation: final-shake 0.3s ease-in-out;
	}

	/* Shake stop animation - dramatic pause */
	@keyframes shake-stop {
		0% {
			transform: rotate(2deg) scale(1.01);
		}
		100% {
			transform: rotate(0deg) scale(1);
		}
	}

	.animate-shake-stop {
		animation: shake-stop 0.4s ease-out forwards;
	}

	/* Card pop animation - subtle scale bounce */
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
</style>
