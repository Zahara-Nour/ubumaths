<!--
	TutorUsageIndicator Component
	=============================

	Displays remaining quotas for tutor usage with visual indicators.
	Shows exercise-specific, hourly, and daily limits.

	FEATURES:
	- Three-tier quota display (exercise, hour, day)
	- Visual indicators with emojis and counts
	- Tooltips for context
	- Responsive text sizing with font-scale

	PROPS:
	- remaining: { exercise, hour, day } - Remaining counts for each quota tier

	USAGE:
	```svelte
	<TutorUsageIndicator remaining={{ exercise: 10, hour: 25, day: 85 }} />
	```

	@component
-->

<script lang="ts">
	interface Props {
		remaining: {
			exercise: number | null;
			hour: number;
			day: number;
		};
	}

	let { remaining }: Props = $props();

	// Derived values for percentage calculations (for future visual bars if needed)
	const exercisePercent = $derived(
		remaining.exercise !== null ? (remaining.exercise / 15) * 100 : null
	);
	const hourPercent = $derived((remaining.hour / 30) * 100);
	const dayPercent = $derived((remaining.day / 100) * 100);

	// Color coding based on remaining percentage
	function getColorClass(percent: number): string {
		if (percent > 50) return 'text-green-600 dark:text-green-500';
		if (percent > 25) return 'text-yellow-600 dark:text-yellow-500';
		return 'text-red-600 dark:text-red-500';
	}
</script>

<div
	class="flex flex-wrap gap-3 text-xs text-muted-foreground"
	style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
>
	{#if remaining.exercise !== null}
		<span
			class="flex items-center gap-1 {getColorClass(exercisePercent ?? 0)}"
			title="Messages restants sur cet exercice (15 max)"
		>
			<span class="text-sm">📝</span>
			<span class="font-medium">{remaining.exercise}/15</span>
		</span>
	{/if}
	<span
		class="flex items-center gap-1 {getColorClass(hourPercent)}"
		title="Messages restants cette heure (30 max)"
	>
		<span class="text-sm">⏱️</span>
		<span class="font-medium">{remaining.hour}/30</span>
	</span>
	<span
		class="flex items-center gap-1 {getColorClass(dayPercent)}"
		title="Messages restants aujourd'hui (100 max)"
	>
		<span class="text-sm">📅</span>
		<span class="font-medium">{remaining.day}/100</span>
	</span>
</div>
