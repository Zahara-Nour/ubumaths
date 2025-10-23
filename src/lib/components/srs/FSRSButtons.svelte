<!--
	FSRSButtons Component
	=====================

	The 4-button FSRS grading interface for spaced repetition reviews.

	Grades:
	- 1 (Again): Complete blackout, wrong response - card will be shown again soon
	- 2 (Hard): Correct response with serious difficulty - shorter interval
	- 3 (Good): Correct response with some hesitation - standard interval
	- 4 (Easy): Perfect response - longer interval

	Props:
	- onGrade: Callback when a grade is selected
	- disabled: Disable all buttons
	- showIntervals: Display estimated next review intervals
	- intervals: Optional array of 4 numbers (in days) for each grade
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	interface Props {
		onGrade: (grade: 1 | 2 | 3 | 4) => void;
		disabled?: boolean;
		showIntervals?: boolean;
		intervals?: [number, number, number, number]; // Days for [Again, Hard, Good, Easy]
	}

	let { onGrade, disabled = false, showIntervals = false, intervals }: Props = $props();

	/**
	 * Handle keyboard shortcuts (1-4)
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		const key = event.key;
		if (['1', '2', '3', '4'].includes(key)) {
			event.preventDefault();
			const grade = parseInt(key) as 1 | 2 | 3 | 4;
			onGrade(grade);
		}
	}

	/**
	 * Format interval for display
	 */
	function formatInterval(days: number): string {
		if (days < 1) {
			const minutes = Math.round(days * 24 * 60);
			return `${minutes}min`;
		}
		if (days < 30) {
			return `${Math.round(days)}j`;
		}
		if (days < 365) {
			const months = Math.round(days / 30);
			return `${months}mois`;
		}
		const years = Math.round(days / 365);
		return `${years}an${years > 1 ? 's' : ''}`;
	}

	const buttons = $derived([
		{
			grade: 1 as const,
			label: 'Encore',
			color: 'bg-red-600 hover:bg-red-700 text-white',
			description: 'Mauvaise réponse',
			interval: intervals?.[0]
		},
		{
			grade: 2 as const,
			label: 'Difficile',
			color: 'bg-orange-600 hover:bg-orange-700 text-white',
			description: 'Réponse avec difficulté',
			interval: intervals?.[1]
		},
		{
			grade: 3 as const,
			label: 'Bien',
			color: 'bg-green-600 hover:bg-green-700 text-white',
			description: 'Bonne réponse',
			interval: intervals?.[2]
		},
		{
			grade: 4 as const,
			label: 'Facile',
			color: 'bg-blue-600 hover:bg-blue-700 text-white',
			description: 'Réponse parfaite',
			interval: intervals?.[3]
		}
	]);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fsrs-buttons-container">
	<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
		{#each buttons as btn}
			<button
				class={cn(
					'fsrs-button group relative flex flex-col items-center justify-center gap-2 rounded-lg px-4 py-6 font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
					btn.color,
					!disabled && 'hover:scale-105 hover:shadow-lg active:scale-95'
				)}
				onclick={() => !disabled && onGrade(btn.grade)}
				{disabled}
				type="button"
			>
				<!-- Label -->
				<span class="text-lg">{btn.label}</span>

				<!-- Interval (if enabled) -->
				{#if showIntervals && btn.interval !== undefined}
					<span class="text-xs opacity-80">{formatInterval(btn.interval)}</span>
				{/if}

				<!-- Keyboard shortcut hint -->
				<span
					class="absolute top-2 right-2 rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100"
				>
					{btn.grade}
				</span>
			</button>
		{/each}
	</div>

	<!-- Help text -->
	<div class="mt-4 text-center text-sm text-muted-foreground">
		<p>Évaluez la difficulté de votre réponse (1-4 sur votre clavier)</p>
	</div>
</div>

<style>
	.fsrs-buttons-container {
		width: 100%;
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fsrs-button {
		min-height: 100px;
	}

	@media (max-width: 640px) {
		.fsrs-button {
			min-height: 80px;
		}
	}
</style>
