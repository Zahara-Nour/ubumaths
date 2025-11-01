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
	<button
		type="button"
		class={cn(
			'fixed inset-0 z-[100] flex items-center justify-center border-0 bg-transparent p-4 transition-all duration-300',
			mounted ? 'opacity-100' : 'opacity-0'
		)}
		onclick={handleDismiss}
		onkeydown={handleKeydown}
		aria-label="Fermer la carte VIP"
	>
		<!-- Backdrop -->
		<span class="absolute inset-0 bg-black/90 backdrop-blur-md"></span>

		<!-- Content Container -->
		<div role="presentation"
			class={cn(
				'relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 transition-all duration-500',
				mounted ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'
			)}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Card Name and Badges -->
			<div class="space-y-3 text-center">
				<div class="flex flex-wrap items-center justify-center gap-3">
					<!-- Rarity Badge -->
					<Badge
						class={cn('px-4 py-1 text-base font-semibold shadow-lg', getRarityColor(card.rarity))}
					>
						{getRarityLabel(card.rarity)}
					</Badge>

					<!-- Count Badge (if > 1) -->
					{#if count > 1}
						<Badge
							class="bg-primary px-4 py-1 text-base font-bold text-primary-foreground shadow-lg"
						>
							×{count}
						</Badge>
					{/if}
				</div>

				<h2
					id="holo-card-title"
					class="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] md:text-5xl"
				>
					{card.name}
				</h2>

				<p class="max-w-2xl text-lg text-white/90 drop-shadow-md md:text-xl">
					{card.description}
				</p>
			</div>

			<!-- Holographic Card -->
			<div class="flex-shrink-0">
				<VipCardHolo {card} {count} showcase={true} />
			</div>

			<!-- Category Badge -->
			<div class="flex items-center gap-2">
				<Badge variant="outline" class="border-white/30 px-3 py-1 text-sm text-white">
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
			<p class="mt-4 text-sm text-white/60">Cliquez n'importe où pour fermer</p>
		</div>
	</button>
{/if}
