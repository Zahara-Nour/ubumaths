<!--
	VipCard Component
	=================
	A 3D flip card component for displaying VIP cards with magical animations.

	Features:
	- 3D flip animation on click or hover
	- Front: card image + description overlay + rarity gem indicator
	- Back: luxury gold design
	- Count badge when multiple instances owned (e.g., ×3)
	- Size variants: sm, md, lg
	- Rarity gem with color-coded glow effects (top-left corner)
	- Optional removal button for teachers (bottom-right, red trash icon)

	REMOVAL BUTTON (Teacher-Only):
	-------------------------------
	When showRemoveButton=true, a trash button appears in the bottom-right corner.
	- Red destructive styling with hover scale effect
	- Stops event propagation to prevent card flip when clicked
	- Calls onRemove callback function
	- Used in teacher dashboard to remove cards from students

	Props:
	- card: VipCard data (name, description, image, rarity)
	- count: Number of instances (shows ×N badge if > 1)
	- isFlipped: Two-way binding for flip state
	- size: 'sm' | 'md' | 'lg'
	- clickable: Enable/disable flip on click
	- onclick: Custom click handler
	- showRemoveButton: Show trash button (teacher view)
	- onRemove: Callback when trash button clicked
-->

<script lang="ts">
	import type { VipCard } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Trash2 } from 'lucide-svelte';

	interface Props {
		card: VipCard;
		count?: number;
		isFlipped?: boolean;
		size?: 'sm' | 'md' | 'lg';
		clickable?: boolean;
		onclick?: () => void;
		showRemoveButton?: boolean;
		onRemove?: () => void;
	}

	let {
		card,
		count = 1,
		isFlipped = $bindable(false),
		size = 'md',
		clickable = true,
		onclick,
		showRemoveButton = false,
		onRemove
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

	/**
	 * Handle card click - flip the card if clickable
	 */
	function handleClick() {
		if (clickable) {
			isFlipped = !isFlipped;
			onclick?.();
		}
	}

	/**
	 * Handle remove button click
	 * IMPORTANT: Stops event propagation to prevent card flip animation
	 * @param e - MouseEvent from trash button click
	 */
	function handleRemove(e: MouseEvent) {
		e.stopPropagation();
		onRemove?.();
	}

	// Rarity gem color system
	const rarityGemColors = {
		common: { color: '#9ca3af', glow: false },
		rare: { color: '#3b82f6', glow: true },
		epic: { color: '#a855f7', glow: true },
		legendary: { color: '#f59e0b', glow: true }
	};

	// Get rarity gem info for this card
	const rarityGemInfo = $derived(
		card.rarity ? rarityGemColors[card.rarity] : rarityGemColors.common
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class={cn('vip-card-container relative', sizeClasses[size], clickable && 'cursor-pointer')}
	onclick={clickable ? handleClick : undefined}
	role={clickable ? 'button' : undefined}
	tabindex={clickable ? 0 : undefined}
	aria-label={!clickable ? card.name : undefined}
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
			'vip-card-flipper relative h-full w-full transition-transform duration-700',
			'[transform-style:preserve-3d]',
			isFlipped && '[transform:rotateY(180deg)]'
		)}
	>
		<!-- FRONT FACE -->
		<div
			class="vip-card-face vip-card-front absolute h-full w-full overflow-hidden rounded-xl border-4 border-amber-400/50 shadow-2xl [backface-visibility:hidden]"
		>
			<!-- Card Image -->
			<img src={card.imagePath} alt={card.name} class="h-full w-full object-cover" loading="lazy" />

			<!-- Description Overlay (appears on hover) -->
			<div
				class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 transition-opacity duration-300 hover:opacity-100"
			>
				<h3
					class={cn(
						'mb-1 font-bold text-white',
						size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
					)}
				>
					{card.name}
				</h3>
				<p class={cn('text-white/90', size === 'sm' ? 'text-xs' : 'text-sm')}>
					{card.description}
				</p>
			</div>

			<!-- Rarity Gem (Top Left) -->
			{#if card.rarity}
				<div class="absolute top-2 left-2 z-10">
					<div
						class={cn(
							'rounded-full bg-white/60 p-1.5 shadow-lg backdrop-blur-sm',
							size === 'sm' ? 'h-6 w-6 p-1' : size === 'md' ? 'h-8 w-8 p-1.5' : 'h-10 w-10 p-2'
						)}
						style="color: {rarityGemInfo.color}; {rarityGemInfo.glow
							? 'filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 10px currentColor);'
							: ''}"
					>
						<svg
							class="h-full w-full"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M12 2L4 8L2 12L12 22L22 12L20 8L12 2Z"
								fill="currentColor"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linejoin="round"
							/>
							<path d="M12 2L8 8H16L12 2Z" fill="white" opacity="0.3" />
							<path d="M4 8L8 8L12 22L4 8Z" fill="black" opacity="0.2" />
							<path d="M20 8L16 8L12 22L20 8Z" fill="black" opacity="0.2" />
						</svg>
					</div>
				</div>
			{/if}

			<!-- Count Badge (Top Right) - Only show if count > 1 -->
			{#if count > 1}
				<div class="absolute top-2 right-2">
					<Badge
						class={cn(
							'bg-primary font-bold text-primary-foreground shadow-lg',
							badgeSizeClasses[size]
						)}
					>
						×{count}
					</Badge>
				</div>
			{/if}

			<!-- Remove Button (Bottom Right) - Only show if showRemoveButton is true -->
			{#if showRemoveButton}
				<button
					type="button"
					class={cn(
						'absolute right-2 bottom-2 rounded-full bg-destructive p-2 text-destructive-foreground shadow-lg transition-all hover:scale-110 hover:bg-destructive/90 active:scale-95',
						size === 'sm' ? 'p-1.5' : size === 'md' ? 'p-2' : 'p-2.5'
					)}
					onclick={handleRemove}
					aria-label="Retirer cette carte"
				>
					<Trash2 class={cn(size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5')} />
				</button>
			{/if}
		</div>

		<!-- BACK FACE (Luxury Gold Design) -->
		<div
			class="vip-card-face vip-card-back absolute h-full w-full [transform:rotateY(180deg)] overflow-hidden rounded-xl border-4 border-amber-400 shadow-2xl [backface-visibility:hidden]"
		>
			<!-- Luxury Background -->
			<div
				class="relative h-full w-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600"
			>
				<!-- Geometric Pattern Overlay -->
				<div
					class="absolute inset-0 opacity-20"
					style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.3) 35px, rgba(255,255,255,.3) 70px);"
				></div>

				<!-- Radial Gradient Shine -->
				<div
					class="bg-gradient-radial absolute inset-0 from-white/30 via-transparent to-transparent"
				></div>

				<!-- Center VIP Logo -->
				<div class="absolute inset-0 flex flex-col items-center justify-center text-white">
					<div class="text-center">
						<div
							class={cn(
								'mb-2 font-black tracking-wider',
								size === 'sm' ? 'text-4xl' : size === 'md' ? 'text-6xl' : 'text-8xl'
							)}
							style="text-shadow: 2px 2px 8px rgba(0,0,0,0.3);"
						>
							VIP
						</div>
						<div
							class={cn(
								'font-bold tracking-widest',
								size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
							)}
							style="text-shadow: 1px 1px 4px rgba(0,0,0,0.3);"
						>
							CARTE PRIVILÈGE
						</div>
						<div class="mx-auto mt-4 h-1 w-16 rounded-full bg-white/50"></div>
					</div>
				</div>

				<!-- Corner Decorations -->
				<div
					class="absolute top-4 left-4 h-8 w-8 rounded-tl-lg border-t-2 border-l-2 border-white/60"
				></div>
				<div
					class="absolute top-4 right-4 h-8 w-8 rounded-tr-lg border-t-2 border-r-2 border-white/60"
				></div>
				<div
					class="absolute bottom-4 left-4 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-white/60"
				></div>
				<div
					class="absolute right-4 bottom-4 h-8 w-8 rounded-br-lg border-r-2 border-b-2 border-white/60"
				></div>
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
		background: radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
	}

	/* Hover effect for clickable cards */
	.vip-card-container:hover .vip-card-flipper {
		transform: scale(1.02);
	}

	.vip-card-container:active .vip-card-flipper {
		transform: scale(0.98);
	}
</style>
