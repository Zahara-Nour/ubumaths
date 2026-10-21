<!--
	BuddyAvatar
	=============
	Displays the Palotin image with the appropriate expression.
	Falls back to a colored circle with initial if image not found.
	Le SVG s'anime seul au repos ; la réaction (bond, tressaut, affaissement)
	se joue quand une expression arrive.
-->

<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import type { PalotinType } from '$lib/config/buddy-messages';
	import type { BuddyExpression } from '$lib/types/buddy';

	// Extension des images des Palotins : SVG animés, produits par scripts/palotins-svg/
	const IMAGE_EXTENSION = 'svg';
	// Réaction du Palotin quand l'expression arrive (aucune pour les autres)
	const REACTION: Partial<Record<BuddyExpression, string>> = {
		happy: 'reaction-bond',
		excited: 'reaction-tressaut',
		determined: 'reaction-affaisse'
	};

	interface Props {
		palotin: PalotinType;
		expression?: BuddyExpression;
		size?: 'sm' | 'md';
	}

	let { palotin, expression = 'neutral', size = 'md' }: Props = $props();

	const sizeClass = $derived(
		size === 'sm' ? 'h-[60px] w-[60px]' : 'h-[80px] w-[80px] md:h-[100px] md:w-[100px]'
	);
	// Moins d'animations : version fixe, car une <img> ne transmet pas la préférence au SVG
	const reduceMotion = $derived(prefersReducedMotion.current);
	const imagePath = $derived(
		`/images/buddies/${palotin}-${expression}${reduceMotion ? '-fixe' : ''}.${IMAGE_EXTENSION}`
	);
	const reactionClass = $derived(reduceMotion ? '' : (REACTION[expression] ?? ''));
	// Image en échec : le repli ne vaut que pour elle, une autre expression retente
	let failedPath = $state<string | null>(null);
	const imageError = $derived(failedPath === imagePath);

	const palotinColors: Record<PalotinType, string> = {
		giron: 'bg-red-400',
		pile: 'bg-blue-400',
		cotice: 'bg-green-400'
	};

	const palotinInitials: Record<PalotinType, string> = {
		giron: 'G',
		pile: 'P',
		cotice: 'C'
	};
</script>

<div class="relative {sizeClass} shrink-0">
	{#if !imageError}
		<!-- {#key} recrée l'image à chaque expression : la réaction se rejoue -->
		{#key imagePath}
			<img
				src={imagePath}
				alt="Palotin {palotin}"
				class="{sizeClass} rounded-full object-cover {reactionClass}"
				onerror={() => (failedPath = imagePath)}
			/>
		{/key}
	{:else}
		<!-- Fallback: colored circle with initial -->
		<div
			class="{sizeClass} {palotinColors[
				palotin
			]} flex items-center justify-center rounded-full font-bold text-white shadow-md"
			class:text-lg={size === 'sm'}
			class:text-2xl={size === 'md'}
		>
			{palotinInitials[palotin]}
		</div>
	{/if}
</div>

<style>
	.reaction-bond {
		animation: bond 0.7s cubic-bezier(0.3, 0.7, 0.4, 1);
	}
	.reaction-tressaut {
		animation: tressaut 0.9s ease-in-out;
	}
	.reaction-affaisse {
		animation: affaisse 1.1s ease-in-out;
	}
	@keyframes bond {
		0%,
		100% {
			transform: translateY(0);
		}
		35% {
			transform: translateY(-14%) scale(1.03, 0.97);
		}
		55% {
			transform: translateY(0) scale(1.04, 0.95);
		}
		75% {
			transform: translateY(-4%);
		}
	}
	@keyframes tressaut {
		0%,
		100% {
			transform: scale(1) rotate(0);
		}
		25% {
			transform: scale(1.12) rotate(-6deg);
		}
		50% {
			transform: scale(1.12) rotate(6deg);
		}
		75% {
			transform: scale(1.06) rotate(-3deg);
		}
	}
	@keyframes affaisse {
		0%,
		100% {
			transform: translateY(0) rotate(0);
		}
		30%,
		65% {
			transform: translateY(5%) rotate(-5deg) scale(0.97);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reaction-bond,
		.reaction-tressaut,
		.reaction-affaisse {
			animation: none;
		}
	}
</style>
