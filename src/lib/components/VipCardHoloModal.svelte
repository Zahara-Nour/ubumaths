<!--
	VipCardHoloModal Component
	===========================
	Full-screen modal for viewing a VIP card with holographic effects.

	Features:
	- Full-screen overlay with backdrop
	- VipCardHolo component in showcase mode (auto-rotation)
	- Card name and description
	- Count badge
	- Click/ESC to dismiss
	- Smooth enter/exit animations
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import VipCardHolo from './VipCardHolo.svelte';
	import type { VipCard } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	interface Props {
		card: VipCard;
		count?: number;
		visible?: boolean;
		onClose?: () => void;
	}

	let { card, count = 1, visible = false, onClose }: Props = $props();

	// Animation state
	let mounted = $state(false);

	onMount(() => {
		// Delay mount animation slightly for smoother entrance
		setTimeout(() => {
			mounted = true;
		}, 50);
	});

	function handleDismiss() {
		mounted = false;
		setTimeout(() => {
			onClose?.();
		}, 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleDismiss();
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

	// Get rarity label in French
	function getRarityLabel(rarity?: string): string {
		switch (rarity) {
			case 'legendary':
				return '✨ Légendaire';
			case 'epic':
				return '💎 Épique';
			case 'rare':
				return '⭐ Rare';
			case 'common':
			default:
				return '🎴 Commune';
		}
	}
</script>

{#if visible}
	<!-- Fullscreen Overlay -->
	<div
		class={cn(
			'fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300',
			mounted ? 'opacity-100' : 'opacity-0'
		)}
		onclick={handleDismiss}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="holo-card-title"
		tabindex="0"
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/90 backdrop-blur-md"></div>

		<!-- Content Container -->
		<div
			class={cn(
				'relative z-10 flex flex-col items-center gap-6 max-w-4xl w-full transition-all duration-500',
				mounted ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'
			)}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Card Name and Badges -->
			<div class="text-center space-y-3">
				<div class="flex items-center justify-center gap-3 flex-wrap">
					<!-- Rarity Badge -->
					<Badge class={cn('font-semibold shadow-lg text-base px-4 py-1', getRarityColor(card.rarity))}>
						{getRarityLabel(card.rarity)}
					</Badge>

					<!-- Count Badge (if > 1) -->
					{#if count > 1}
						<Badge class="font-bold shadow-lg bg-primary text-primary-foreground text-base px-4 py-1">
							×{count}
						</Badge>
					{/if}
				</div>

				<h2
					id="holo-card-title"
					class="text-4xl md:text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
				>
					{card.name}
				</h2>

				<p class="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-md">
					{card.description}
				</p>
			</div>

			<!-- Holographic Card -->
			<div class="flex-shrink-0">
				<VipCardHolo {card} {count} showcase={true} />
			</div>

			<!-- Category Badge -->
			<div class="flex items-center gap-2">
				<Badge variant="outline" class="text-white border-white/30 text-sm px-3 py-1">
					{#if card.category === 'bonus'}
						🎁 Bonus
					{:else if card.category === 'privilege'}
						👑 Privilège
					{:else if card.category === 'social'}
						👥 Social
					{:else if card.category === 'power'}
						⚡ Pouvoir
					{/if}
				</Badge>
			</div>

			<!-- Dismiss Hint -->
			<p class="text-sm text-white/60 mt-4">
				Cliquez n'importe où pour fermer
			</p>
		</div>
	</div>
{/if}
