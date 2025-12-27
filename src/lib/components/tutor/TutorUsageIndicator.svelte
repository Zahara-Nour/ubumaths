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
	import {
		TUTOR_MAX_PER_EXERCISE,
		TUTOR_MAX_PER_HOUR,
		TUTOR_MAX_PER_DAY
	} from '$lib/config/tutor-limits';

	interface Props {
		remaining: {
			exercise: number | null;
			hour: number;
			day: number;
		};
		isLoading?: boolean;
	}

	let { remaining, isLoading = false }: Props = $props();

	// Derived values for percentage calculations (for future visual bars if needed)
	const exercisePercent = $derived(
		remaining.exercise !== null ? (remaining.exercise / TUTOR_MAX_PER_EXERCISE) * 100 : null
	);
	const hourPercent = $derived((remaining.hour / TUTOR_MAX_PER_HOUR) * 100);
	const dayPercent = $derived((remaining.day / TUTOR_MAX_PER_DAY) * 100);

	// Color coding based on remaining percentage
	function getColorClass(percent: number): string {
		if (percent > 50) return 'text-green-600 dark:text-green-500';
		if (percent > 25) return 'text-yellow-600 dark:text-yellow-500';
		return 'text-red-600 dark:text-red-500';
	}
</script>

<div
	class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
	style="font-size: calc(0.75rem * var(--font-scale)); line-height: calc(1rem * var(--font-scale));"
	role="status"
	aria-label="Quotas de messages restants"
>
	{#if isLoading}
		<!-- Loading state with skeleton -->
		<span class="flex items-center gap-1 text-muted-foreground" title="Chargement des quotas...">
			<span class="text-sm">📝</span>
			<span class="h-4 w-8 animate-pulse rounded bg-muted-foreground/20"></span>
		</span>
		<span class="flex items-center gap-1 text-muted-foreground">
			<span class="text-sm">⏱️</span>
			<span class="h-4 w-10 animate-pulse rounded bg-muted-foreground/20"></span>
		</span>
		<span class="flex items-center gap-1 text-muted-foreground">
			<span class="text-sm">📅</span>
			<span class="h-4 w-12 animate-pulse rounded bg-muted-foreground/20"></span>
		</span>
	{:else}
		<!-- Loaded state -->
		{#if remaining.exercise !== null}
			<span
				class="flex items-center gap-1 {getColorClass(exercisePercent ?? 0)}"
				title="Messages restants sur cet exercice ({TUTOR_MAX_PER_EXERCISE} max)"
			>
				<span class="text-sm">📝</span>
				<span class="font-medium">{remaining.exercise}/{TUTOR_MAX_PER_EXERCISE}</span>
			</span>
		{/if}
		<span
			class="flex items-center gap-1 {getColorClass(hourPercent)}"
			title="Messages restants cette heure ({TUTOR_MAX_PER_HOUR} max)"
		>
			<span class="text-sm">⏱️</span>
			<span class="font-medium">{remaining.hour}/{TUTOR_MAX_PER_HOUR}</span>
		</span>
		<span
			class="flex items-center gap-1 {getColorClass(dayPercent)}"
			title="Messages restants aujourd'hui ({TUTOR_MAX_PER_DAY} max)"
		>
			<span class="text-sm">📅</span>
			<span class="font-medium">{remaining.day}/{TUTOR_MAX_PER_DAY}</span>
		</span>
	{/if}
</div>
