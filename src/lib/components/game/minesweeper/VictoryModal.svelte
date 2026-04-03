<!--
	VictoryModal Component
	======================

	Displays a detailed victory screen with illustration and gidouilles breakdown.

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
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw, Trophy } from 'lucide-svelte';
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
	}

	let {
		gidouilles,
		points,
		breakdown,
		difficulty,
		achievements = [],
		isPublicUser = false,
		onPlayAgain
	}: Props = $props();

	// Hint assessment
	const hintStatus = $derived.by(() => {
		if (breakdown.hints_used === 0) {
			return { label: 'Sans indice', detail: '' };
		}
		const fromCards = breakdown.reduced_penalty_hints;
		const fromGidouilles = breakdown.hints_used - fromCards;

		let detail = '';
		if (fromCards > 0 && fromGidouilles > 0) {
			detail = `(${fromGidouilles} gidouilles + ${fromCards} carte${fromCards > 1 ? 's' : ''})`;
		} else if (fromCards > 0) {
			detail = `(${fromCards} carte${fromCards > 1 ? 's' : ''} - pénalité réduite)`;
		} else {
			detail = `(${fromGidouilles} gidouilles)`;
		}

		return {
			label: `${breakdown.hints_used} indice${breakdown.hints_used > 1 ? 's' : ''}`,
			detail
		};
	});

	function formatMult(mult: number): string {
		return `×${mult.toFixed(2)}`;
	}

	function getMultColor(mult: number): string {
		if (mult > 1.0) return 'text-green-600 dark:text-green-400';
		if (mult < 1.0) return 'text-orange-600 dark:text-orange-400';
		return 'text-muted-foreground';
	}
</script>

<div
	class="animate-in zoom-in-95 mx-4 w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm duration-200 sm:max-w-3xl"
>
	<div class="flex flex-col sm:flex-row">
		<!-- Hero image -->
		<img
			src="/images/games/minesweeper-victory.webp"
			alt="Victoire"
			class="w-full sm:w-80 sm:self-center sm:p-4"
		/>

		<div class="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
			<!-- Main reward display -->
			{#if !isPublicUser}
				{#if breakdown.is_first_win_of_day}
					<div class="text-center">
						<div class="text-3xl font-bold text-primary sm:text-4xl">
							+{gidouilles.toFixed(2)}
						</div>
						<div class="text-sm text-muted-foreground">gidouilles</div>
					</div>
				{/if}

				<!-- Breakdown section -->
				<div class="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					<!-- Base reward -->
					<div class="flex items-center justify-between">
						<span>{DIFFICULTY_LABELS[difficulty]}</span>
						<span class="font-mono font-medium">{breakdown.base_reward.toFixed(1)}</span>
					</div>

					<!-- Time multiplier -->
					<div class="flex items-center justify-between">
						<span
							>Temps ({formatDuration(breakdown.time_seconds)} / {formatDuration(
								breakdown.reference_time
							)})</span
						>
						<span class={`font-mono font-medium ${getMultColor(breakdown.time_mult)}`}>
							{formatMult(breakdown.time_mult)}
						</span>
					</div>

					<!-- Hint penalty (only show if hints were used) -->
					{#if breakdown.hints_used > 0}
						<div class="flex items-center justify-between">
							<div>
								<span>{hintStatus.label}</span>
								{#if hintStatus.detail}
									<span class="text-xs text-muted-foreground"> {hintStatus.detail}</span>
								{/if}
							</div>
							<span class={`font-mono font-medium ${getMultColor(1 - breakdown.hint_penalty)}`}>
								{formatMult(1 - breakdown.hint_penalty)}
							</span>
						</div>
					{/if}

					<div class="border-t border-border"></div>

					<!-- Theoretical total -->
					<div class="flex items-center justify-between font-medium">
						<span>Gidouilles</span>
						<span class="font-mono text-primary">
							{breakdown.theoretical_reward.toFixed(2)}
						</span>
					</div>

					<!-- Week best reward -->
					<div class="mt-1 flex items-center justify-between rounded bg-primary/10 p-2">
						<span>Meilleur cette semaine</span>
						<span class="font-mono font-medium text-primary">
							{breakdown.week_best_reward.toFixed(2)}
						</span>
					</div>
				</div>
			{:else if isPublicUser}
				<div class="py-2 text-center">
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
				<div class="flex flex-col items-center gap-1 text-sm text-muted-foreground">
					<div class="flex items-center gap-2">
						<Trophy class="h-4 w-4" />
						<span>Score : {points} points</span>
					</div>
					{#if breakdown.old_avg_top10 != null && breakdown.new_avg_top10 != null}
						<div class="text-xs">
							Classement : {breakdown.old_avg_top10}
							→
							<span
								class={breakdown.new_avg_top10 > breakdown.old_avg_top10
									? 'font-medium text-green-600 dark:text-green-400'
									: ''}>{breakdown.new_avg_top10}</span
							>
						</div>
					{/if}
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

			<!-- Actions -->
			<div class="flex justify-center pt-2">
				<Button onclick={onPlayAgain} class="gap-2">
					<RotateCcw class="h-4 w-4" />
					Rejouer
				</Button>
			</div>
		</div>
	</div>
</div>
