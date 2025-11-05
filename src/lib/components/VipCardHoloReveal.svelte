<!--
	VipCardHoloReveal Component
	============================
	Pure card display component with flip animation.

	Animation Flow:
	1. Card back visible with shaking animation (loading state)
	2. On confirmation: shake stops, dramatic pause
	3. Card flips to reveal holographic front
	4. Pop animation
	5. Card details display (title, description)
	6. Callback on animation complete

	Props:
	- card: VipCard (required) - The card to reveal
	- loading: boolean (default: true) - Shows shake animation
	- confirmed: boolean (default: false) - Triggers flip when true
	- delay: number (default: 0) - Delay before starting animation (for multi-reveal)
	- onflipComplete: () => void (optional) - Callback when flip animation completes

	Technical Details:
	- Uses VipCardHolo component with showBack prop for flip
	- Physical shake animation (2deg rotation)
	- No modal wrapper (parent handles modal)
	- No celebration effects (parent handles sparkles/confetti)
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import VipCardHolo from './VipCardHolo.svelte';
	import type { VipCard as VipCardType } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';

	interface Props {
		card: VipCardType;
		loading?: boolean;
		confirmed?: boolean;
		delay?: number;
		onflipComplete?: () => void;
		holo?: boolean;
	}

	let {
		card,
		loading = true,
		confirmed = false,
		delay = 0,
		onflipComplete,
		holo = true
	}: Props = $props();

	// Animation states
	let cardVisible = $state(false);
	let showCardBack = $state(true); // Start with back
	let cardFlipped = $state(false);
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

		// Step 4: Call completion callback (when flip is fully visible)
		setTimeout(() => {
			onflipComplete?.();
		}, 1000 + delay);
	}

	onMount(() => {
		// Show card immediately
		setTimeout(() => {
			cardVisible = true;
		}, 200);
	});
</script>

<!-- Card Container with shake or pop animation -->
<div
	class={cn(
		'w-full transition-all duration-400',
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
		enableHoloEffect={holo && cardFlipped}
	/>
</div>

<!-- Card Name and Description (after flip) -->
{#if cardFlipped}
	<div
		class={cn(
			'mt-4 max-w-2xl px-4 text-center transition-all delay-500 duration-700',
			cardFlipped ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
		)}
	>
		<h3 class="mb-2 text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
			{card.name}
		</h3>
		<p class="text-base text-white/90 drop-shadow-md md:text-lg">
			{card.description}
		</p>
	</div>
{/if}

<style>
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
</style>
