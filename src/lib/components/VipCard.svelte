<!--
	VipCard Component
	=================
	A 3D flip card component for displaying VIP cards with magical animations.

	Features:
	- 3D flip animation on click or hover
	- Front: card image + description overlay
	- Back: luxury gold design
	- Count badge when multiple instances owned
	- Size variants: sm, md, lg
-->

<script lang="ts">
	import type { VipCard } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Props {
		card: VipCard;
		count?: number;
		isFlipped?: boolean;
		size?: 'sm' | 'md' | 'lg';
		clickable?: boolean;
		onclick?: () => void;
	}

	let {
		card,
		count = 1,
		isFlipped = $bindable(false),
		size = 'md',
		clickable = true,
		onclick
	}: Props = $props();

	// Size classes
	const sizeClasses = {
		sm: 'w-32 h-48',
		md: 'w-48 h-72',
		lg: 'w-64 h-96'
	};

	// Badge size classes
	const badgeSizeClasses = {
		sm: 'text-xs',
		md: 'text-sm',
		lg: 'text-base'
	};

	function handleClick() {
		if (clickable) {
			isFlipped = !isFlipped;
			onclick?.();
		}
	}

	// Get rarity color for badge
	function getRarityColor(rarity?: string): string {
		switch (rarity) {
			case 'legendary':
				return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white';
			case 'epic':
				return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
			case 'rare':
				return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
			case 'common':
			default:
				return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
		}
	}
</script>

<div
	class={cn(
		'vip-card-container relative',
		sizeClasses[size],
		clickable && 'cursor-pointer'
	)}
	onclick={handleClick}
	role={clickable ? 'button' : 'img'}
	tabindex={clickable ? 0 : undefined}
	onkeydown={(e) => {
		if (clickable && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			handleClick();
		}
	}}
>
	<!-- 3D Flip Container -->
	<div
		class={cn(
			'vip-card-flipper relative w-full h-full transition-transform duration-700',
			'[transform-style:preserve-3d]',
			isFlipped && '[transform:rotateY(180deg)]'
		)}
	>
		<!-- FRONT FACE -->
		<div
			class="vip-card-face vip-card-front absolute w-full h-full rounded-xl shadow-2xl overflow-hidden [backface-visibility:hidden] border-4 border-amber-400/50"
		>
			<!-- Card Image -->
			<img
				src={card.imagePath}
				alt={card.name}
				class="w-full h-full object-cover"
			/>

			<!-- Description Overlay (appears on hover) -->
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4"
			>
				<h3 class={cn('font-bold text-white mb-1', size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl')}>
					{card.name}
				</h3>
				<p class={cn('text-white/90', size === 'sm' ? 'text-xs' : 'text-sm')}>
					{card.description}
				</p>
			</div>

			<!-- Rarity Badge (Top Left) -->
			<div class="absolute top-2 left-2">
				<Badge class={cn('font-semibold shadow-lg', badgeSizeClasses[size], getRarityColor(card.rarity))}>
					{card.rarity === 'legendary' ? '✨ Légendaire' :
					 card.rarity === 'epic' ? '💎 Épique' :
					 card.rarity === 'rare' ? '⭐ Rare' :
					 '🎴 Commune'}
				</Badge>
			</div>

			<!-- Count Badge (Top Right) - Only show if count > 1 -->
			{#if count > 1}
				<div class="absolute top-2 right-2">
					<Badge class={cn('font-bold shadow-lg bg-primary text-primary-foreground', badgeSizeClasses[size])}>
						×{count}
					</Badge>
				</div>
			{/if}
		</div>

		<!-- BACK FACE (Luxury Gold Design) -->
		<div
			class="vip-card-face vip-card-back absolute w-full h-full rounded-xl shadow-2xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] border-4 border-amber-400"
		>
			<!-- Luxury Background -->
			<div class="w-full h-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 relative">
				<!-- Geometric Pattern Overlay -->
				<div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.3) 35px, rgba(255,255,255,.3) 70px);"></div>

				<!-- Radial Gradient Shine -->
				<div class="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent"></div>

				<!-- Center VIP Logo -->
				<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
					<div class="text-center">
						<div class={cn('font-black tracking-wider mb-2', size === 'sm' ? 'text-4xl' : size === 'md' ? 'text-6xl' : 'text-8xl')} style="text-shadow: 2px 2px 8px rgba(0,0,0,0.3);">
							VIP
						</div>
						<div class={cn('font-bold tracking-widest', size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base')} style="text-shadow: 1px 1px 4px rgba(0,0,0,0.3);">
							CARTE PRIVILÈGE
						</div>
						<div class="mt-4 w-16 h-1 bg-white/50 mx-auto rounded-full"></div>
					</div>
				</div>

				<!-- Corner Decorations -->
				<div class="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg"></div>
				<div class="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg"></div>
				<div class="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg"></div>
				<div class="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-lg"></div>
			</div>
		</div>
	</div>
</div>

<style>
	/* 3D Flip Animation Styles */
	.vip-card-container {
		perspective: 1000px;
	}

	.vip-card-flipper {
		transform-style: preserve-3d;
	}

	.vip-card-face {
		backface-visibility: hidden;
	}

	/* Radial gradient utility */
	.bg-gradient-radial {
		background: radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%);
	}

	/* Hover effect for clickable cards */
	.vip-card-container:hover .vip-card-flipper {
		transform: scale(1.02);
	}

	.vip-card-container:active .vip-card-flipper {
		transform: scale(0.98);
	}
</style>
