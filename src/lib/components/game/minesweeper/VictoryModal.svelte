<!--
	VictoryModal Component
	======================

	Displays a detailed victory screen with gidouilles breakdown.
	Uses Strategy D formula visualization.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import VictoryModal from '$lib/components/game/minesweeper/VictoryModal.svelte';

	modalStack.push({
		component: VictoryModal,
		props: {
			gidouilles: 1.18,
			points: 65,
			breakdown: { ... },
			difficulty: 'beginner',
			achievements: [],
			onPlayAgain: () => { ... },
			onClose: () => modalStack.pop()
		}
	});
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { X, RotateCcw, Trophy } from 'lucide-svelte';
	import type { Difficulty, RewardBreakdown } from '$lib/types/minesweeper';
	import { DIFFICULTY_LABELS } from '$lib/types/minesweeper';
	import { formatDuration } from '$lib/utils/format';
	import type { UnlockedAchievement } from '$lib/stores/minesweeper.svelte';

	interface Props {
		gidouilles: number;
		points: number;
		breakdown: RewardBreakdown;
		difficulty: Difficulty;
		achievements?: UnlockedAchievement[];
		isPublicUser?: boolean;
		onPlayAgain: () => void;
		onClose: () => void;
	}

	let {
		gidouilles,
		points,
		breakdown,
		difficulty,
		achievements = [],
		isPublicUser = false,
		onPlayAgain,
		onClose
	}: Props = $props();

	// Time performance assessment
	const timePerformance = $derived.by(() => {
		const ratio = breakdown.time_seconds / breakdown.reference_time;
		if (ratio <= 0.33) return { label: 'Éclair', emoji: '⚡', color: 'text-yellow-500' };
		if (ratio <= 0.66) return { label: 'Rapide', emoji: '🚀', color: 'text-green-500' };
		if (ratio <= 1.0) return { label: 'Normal', emoji: '👍', color: 'text-blue-500' };
		return { label: 'Tranquille', emoji: '🐢', color: 'text-orange-500' };
	});

	// Hint assessment
	const hintStatus = $derived.by(() => {
		if (breakdown.hints_used === 0) {
			return { label: 'Sans indice', emoji: '✓', color: 'text-green-500', detail: '' };
		}
		const fromItems = breakdown.hints_from_items;
		const fromGidouilles = breakdown.hints_used - fromItems;

		let detail = '';
		if (fromItems > 0 && fromGidouilles > 0) {
			detail = `(${fromGidouilles} gidouilles + ${fromItems} item${fromItems > 1 ? 's' : ''})`;
		} else if (fromItems > 0) {
			detail = `(${fromItems} item${fromItems > 1 ? 's' : ''} - pénalité réduite)`;
		} else {
			detail = `(${fromGidouilles} gidouilles)`;
		}

		return {
			label: `${breakdown.hints_used} indice${breakdown.hints_used > 1 ? 's' : ''}`,
			emoji: '💡',
			color: 'text-yellow-600',
			detail
		};
	});

	// Daily status
	const dailyStatus = $derived.by(() => {
		const winsToday = breakdown.wins_today;
		if (winsToday === 0) {
			return { label: '1ère victoire du jour', emoji: '🌟', color: 'text-green-500' };
		}
		const position = winsToday + 1;
		if (position <= 3) {
			return { label: `${position}e victoire du jour`, emoji: '✓', color: 'text-blue-500' };
		}
		return { label: `${position}e victoire du jour`, emoji: '📉', color: 'text-orange-500' };
	});

	// Format multiplier with sign
	function formatMult(mult: number): string {
		if (mult >= 1.0) return `×${mult.toFixed(2)}`;
		return `×${mult.toFixed(2)}`;
	}

	// Get multiplier color
	function getMultColor(mult: number): string {
		if (mult > 1.0) return 'text-green-600 dark:text-green-400';
		if (mult < 1.0) return 'text-orange-600 dark:text-orange-400';
		return 'text-muted-foreground';
	}

	// Handle play again - delegate entirely to callback
	// The callback is responsible for closing the modal and starting a new game
	function handlePlayAgain() {
		onPlayAgain();
	}
</script>

<Card.Root class="animate-in zoom-in-95 mx-4 w-full max-w-md duration-200">
	<Card.Header class="pb-2">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-2">
				<span class="text-3xl">🎉</span>
				<Card.Title class="text-2xl font-bold">Victoire !</Card.Title>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Fermer">
				<X class="h-4 w-4" />
			</Button>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Main reward display -->
		{#if !isPublicUser && gidouilles > 0}
			<div class="py-2 text-center">
				<div class="text-4xl font-bold text-primary">
					+{gidouilles.toFixed(2)}
				</div>
				<div class="text-sm text-muted-foreground">gidouilles</div>
			</div>

			<!-- Breakdown section -->
			<div class="space-y-2 rounded-lg bg-muted/50 p-3">
				<div class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Décomposition
				</div>

				<!-- Base reward -->
				<div class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2">
						<span>🎯</span>
						<span>Base ({DIFFICULTY_LABELS[difficulty]})</span>
					</span>
					<span class="font-mono font-medium">×{breakdown.base_reward.toFixed(1)}</span>
				</div>

				<!-- Time multiplier -->
				<div class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2">
						<span class={timePerformance.color}>{timePerformance.emoji}</span>
						<span>Temps ({formatDuration(breakdown.time_seconds)})</span>
					</span>
					<span class={`font-mono font-medium ${getMultColor(breakdown.time_mult)}`}>
						{formatMult(breakdown.time_mult)}
					</span>
				</div>

				<!-- Hint penalty -->
				<div class="flex items-center justify-between text-sm">
					<div class="flex items-center gap-2">
						<span class={hintStatus.color}>{hintStatus.emoji}</span>
						<span>{hintStatus.label}</span>
						{#if hintStatus.detail}
							<span class="text-xs text-muted-foreground">{hintStatus.detail}</span>
						{/if}
					</div>
					<span class={`font-mono font-medium ${getMultColor(1 - breakdown.hint_penalty)}`}>
						{formatMult(1 - breakdown.hint_penalty)}
					</span>
				</div>

				<!-- Daily multiplier -->
				<div class="flex items-center justify-between text-sm">
					<span class="flex items-center gap-2">
						<span class={dailyStatus.color}>{dailyStatus.emoji}</span>
						<span>{dailyStatus.label}</span>
					</span>
					<span class={`font-mono font-medium ${getMultColor(breakdown.daily_mult)}`}>
						{formatMult(breakdown.daily_mult)}
					</span>
				</div>

				<!-- Divider -->
				<div class="my-2 border-t border-border"></div>

				<!-- Formula result -->
				<div class="flex items-center justify-between text-sm font-medium">
					<span>Total</span>
					<span class="font-mono text-primary">
						= {gidouilles.toFixed(2)} gidouilles
					</span>
				</div>
			</div>
		{:else if isPublicUser}
			<!-- Public user - no gidouilles, just congratulations -->
			<div class="py-4 text-center">
				<div class="text-lg text-muted-foreground">
					Bravo ! Grille {DIFFICULTY_LABELS[difficulty]} complétée en {formatDuration(
						breakdown.time_seconds
					)}.
				</div>
				<div class="mt-2 text-sm text-muted-foreground">
					Connectez-vous pour gagner des gidouilles !
				</div>
			</div>
		{/if}

		<!-- Points display -->
		{#if points > 0}
			<div class="flex items-center justify-center gap-2 text-muted-foreground">
				<Trophy class="h-4 w-4" />
				<span>+{points} points classement</span>
			</div>
		{/if}

		<!-- Achievements -->
		{#if achievements && achievements.length > 0}
			<div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
				<div
					class="mb-2 text-xs font-medium tracking-wide text-amber-700 uppercase dark:text-amber-300"
				>
					Succès débloqués
				</div>
				<div class="space-y-1">
					{#each achievements as achievement (achievement.achievement_id)}
						<div class="flex items-center gap-2">
							<span class="text-xl">{achievement.icon}</span>
							<span class="font-medium">{achievement.name}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</Card.Content>

	<Card.Footer class="flex justify-center gap-3 pt-2">
		<Button variant="default" onclick={handlePlayAgain} class="gap-2">
			<RotateCcw class="h-4 w-4" />
			Rejouer
		</Button>
	</Card.Footer>
</Card.Root>
