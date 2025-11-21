<!--
	AchievementToast Component
	==========================
	Celebratory notification displayed when an achievement is unlocked.

	Props:
	- achievement: Achievement object with name, icon, metadata
	- points: Number of points earned
	- onClose: Callback function to close the toast

	Features:
	- Animated entry (fly + scale)
	- Rarity-based styling
	- Auto-close after 5 seconds
	- Manual close button
	- Confetti-like particle effect (CSS)
-->

<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { X, Trophy, Star, Sparkles, Crown, Gem } from 'lucide-svelte';
	import type { Achievement, AchievementRarity } from '$lib/types/achievements';
	import { cn } from '$lib/utils';

	interface Props {
		achievement: Achievement;
		points: number;
		gidouilles?: number;
		onClose: () => void;
	}

	let { achievement, points, gidouilles = 0, onClose }: Props = $props();

	// Rarity-based styling configuration
	const rarityConfig: Record<
		AchievementRarity,
		{
			bgGradient: string;
			borderColor: string;
			textColor: string;
			iconColor: string;
			particleColor: string;
			label: string;
			icon: typeof Trophy;
		}
	> = {
		common: {
			bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
			borderColor: 'border-gray-300 dark:border-gray-600',
			textColor: 'text-gray-700 dark:text-gray-300',
			iconColor: 'text-gray-500 dark:text-gray-400',
			particleColor: '#9ca3af',
			label: 'Commun',
			icon: Trophy
		},
		uncommon: {
			bgGradient: 'from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40',
			borderColor: 'border-green-400 dark:border-green-500',
			textColor: 'text-green-700 dark:text-green-300',
			iconColor: 'text-green-500 dark:text-green-400',
			particleColor: '#22c55e',
			label: 'Peu commun',
			icon: Star
		},
		rare: {
			bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40',
			borderColor: 'border-blue-400 dark:border-blue-500',
			textColor: 'text-blue-700 dark:text-blue-300',
			iconColor: 'text-blue-500 dark:text-blue-400',
			particleColor: '#3b82f6',
			label: 'Rare',
			icon: Sparkles
		},
		epic: {
			bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/40',
			borderColor: 'border-purple-400 dark:border-purple-500',
			textColor: 'text-purple-700 dark:text-purple-300',
			iconColor: 'text-purple-500 dark:text-purple-400',
			particleColor: '#9333ea',
			label: 'Epique',
			icon: Crown
		},
		legendary: {
			bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40',
			borderColor: 'border-amber-400 dark:border-amber-500',
			textColor: 'text-amber-700 dark:text-amber-300',
			iconColor: 'text-amber-500 dark:text-amber-400',
			particleColor: '#f59e0b',
			label: 'Legendaire',
			icon: Gem
		}
	};

	// Get rarity from metadata or default to 'common'
	let rarity = $derived<AchievementRarity>(achievement.metadata?.rarity ?? 'common');
	let config = $derived(rarityConfig[rarity]);
	let RarityIcon = $derived(config.icon);

	// Auto-close after 5 seconds
	let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		autoCloseTimer = setTimeout(() => {
			onClose();
		}, 5000);

		return () => {
			if (autoCloseTimer) {
				clearTimeout(autoCloseTimer);
			}
		};
	});

	// Handle manual close
	function handleClose() {
		if (autoCloseTimer) {
			clearTimeout(autoCloseTimer);
		}
		onClose();
	}

	// Handle keyboard events for accessibility
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed top-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]"
	role="alert"
	aria-live="polite"
	in:fly={{ x: 100, duration: 400, easing: backOut }}
	out:fly={{ x: 100, duration: 200 }}
>
	<div
		class={cn(
			'relative overflow-hidden rounded-xl border-2 bg-gradient-to-br shadow-xl',
			config.bgGradient,
			config.borderColor
		)}
		in:scale={{ start: 0.9, duration: 300, delay: 100, easing: backOut }}
	>
		<!-- Particle effect overlay -->
		<div
			class="particle-container pointer-events-none absolute inset-0 overflow-hidden"
			aria-hidden="true"
		>
			{#each Array(12) as _, i (i)}
				<div
					class="particle"
					style="
						--delay: {i * 0.1}s;
						--x: {Math.random() * 100}%;
						--color: {config.particleColor};
					"
				></div>
			{/each}
		</div>

		<!-- Close button -->
		<button
			type="button"
			class={cn(
				'absolute top-2 right-2 rounded-full p-1 transition-colors',
				'hover:bg-black/10 dark:hover:bg-white/10',
				'focus:ring-2 focus:ring-offset-2 focus:outline-none',
				config.iconColor
			)}
			onclick={handleClose}
			aria-label="Fermer la notification"
		>
			<X class="h-4 w-4" />
		</button>

		<!-- Content -->
		<div class="relative p-4">
			<!-- Header with rarity icon -->
			<div class="mb-3 flex items-center gap-2">
				<RarityIcon class={cn('h-4 w-4', config.iconColor)} />
				<span class={cn('text-xs font-semibold tracking-wider uppercase', config.textColor)}>
					Achievement debloquer!
				</span>
			</div>

			<!-- Achievement info -->
			<div class="flex items-center gap-4">
				<!-- Icon -->
				<div
					class={cn(
						'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl',
						'bg-white/50 dark:bg-black/20',
						'ring-2 ring-white/50 dark:ring-white/20',
						'animate-bounce-subtle'
					)}
					role="img"
					aria-label={`Icone: ${achievement.icon}`}
				>
					{achievement.icon}
				</div>

				<!-- Name and points -->
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-lg font-bold text-foreground">
						{achievement.name}
					</h3>
					<div class="mt-1 flex items-center gap-2">
						<span class={cn('text-sm font-semibold', config.textColor)}>
							+{points} points
						</span>
						{#if gidouilles > 0}
							<span class={cn('text-sm font-semibold', config.textColor)}>
								+{gidouilles} gidouilles
							</span>
						{/if}
						<span class="text-lg" aria-hidden="true">🎉</span>
					</div>
				</div>
			</div>

			<!-- Rarity badge -->
			<div class="mt-3 flex items-center justify-between">
				<span
					class={cn(
						'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
						'bg-white/50 dark:bg-black/20',
						config.textColor
					)}
				>
					<RarityIcon class="h-3 w-3" />
					{config.label}
				</span>

				<!-- Progress bar for auto-close -->
				<div class="h-1 w-20 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
					<div
						class={cn('h-full rounded-full', config.iconColor.replace('text-', 'bg-'))}
						style="animation: shrink 5s linear forwards;"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Subtle bounce animation for icon */
	@keyframes bounce-subtle {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	.animate-bounce-subtle {
		animation: bounce-subtle 1s ease-in-out infinite;
	}

	/* Progress bar shrink animation */
	@keyframes shrink {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	/* Particle/confetti effect */
	.particle {
		position: absolute;
		width: 6px;
		height: 6px;
		background: var(--color);
		border-radius: 50%;
		left: var(--x);
		bottom: 0;
		opacity: 0;
		animation: float-up 2s ease-out var(--delay) forwards;
	}

	@keyframes float-up {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0deg);
		}
		50% {
			opacity: 0.8;
		}
		100% {
			opacity: 0;
			transform: translateY(-120px) scale(0.5) rotate(180deg);
		}
	}

	/* Add some variety to particles */
	.particle:nth-child(odd) {
		width: 4px;
		height: 4px;
		animation-duration: 2.5s;
	}

	.particle:nth-child(3n) {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		animation-duration: 1.8s;
	}
</style>
