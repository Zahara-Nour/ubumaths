<script lang="ts">
	import { DIFFICULTY_CONFIGS } from '$lib/types/minesweeper';
	import type { Difficulty } from '$lib/types/minesweeper';
	import { cn } from '$lib/utils';

	// Props
	let {
		selected,
		onSelect,
		disabled = false
	}: {
		selected: Difficulty;
		onSelect: (difficulty: Difficulty) => void;
		disabled?: boolean;
	} = $props();

	// Difficulty cards configuration with icons and details
	const difficulties: Array<{
		value: Difficulty;
		label: string;
		icon: string;
		iconColor: string;
		borderColor: string;
		bgColor: string;
	}> = [
		{
			value: 'beginner',
			label: 'Débutant',
			icon: '🌱',
			iconColor: 'text-green-600',
			borderColor: 'border-green-500',
			bgColor: 'bg-green-50 dark:bg-green-950/20'
		},
		{
			value: 'intermediate',
			label: 'Intermédiaire',
			icon: '⚡',
			iconColor: 'text-yellow-600',
			borderColor: 'border-yellow-500',
			bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
		},
		{
			value: 'expert',
			label: 'Expert',
			icon: '🔥',
			iconColor: 'text-red-600',
			borderColor: 'border-red-500',
			bgColor: 'bg-red-50 dark:bg-red-950/20'
		}
	];

	// Handle difficulty card click
	function handleSelect(difficulty: Difficulty) {
		if (!disabled) {
			onSelect(difficulty);
		}
	}
</script>

<div class="space-y-3">
	<h3 class="text-sm font-medium text-foreground">Choisir la difficulté</h3>

	<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
		{#each difficulties as diff (diff.value)}
			{@const config = DIFFICULTY_CONFIGS[diff.value]}
			{@const isSelected = selected === diff.value}

			<button
				type="button"
				onclick={() => handleSelect(diff.value)}
				{disabled}
				class={cn(
					'group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all',
					'hover:shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-50',
					isSelected
						? `${diff.borderColor} ${diff.bgColor} shadow-md`
						: 'border-border bg-card hover:border-primary/50'
				)}
			>
				<!-- Icon -->
				<div class="mb-3 flex items-center justify-center">
					<span class={cn('text-4xl transition-transform group-hover:scale-110', diff.iconColor)}>
						{diff.icon}
					</span>
				</div>

				<!-- Difficulty name -->
				<h4 class="mb-2 text-center text-lg font-bold text-foreground">
					{diff.label}
				</h4>

				<!-- Grid details -->
				<div class="space-y-1 text-center text-sm text-muted-foreground">
					<p class="font-medium">
						Grille : {config.rows}×{config.cols}
					</p>
					<p>Mines : {config.mines}</p>
					<p class="font-semibold text-primary">
						Récompense : {config.baseGidouilles} gidouilles
					</p>
				</div>

				<!-- Selected indicator -->
				{#if isSelected}
					<div
						class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
					>
						✓
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>
