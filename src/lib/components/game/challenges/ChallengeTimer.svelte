<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		timeRemaining: number; // milliseconds
		totalTime: number; // milliseconds
		active?: boolean;
		ontimeout?: () => void;
	}

	let { timeRemaining = $bindable(), totalTime, active = true, ontimeout }: Props = $props();

	let intervalId: number | null = null;

	// Derived values
	const seconds = $derived(Math.ceil(timeRemaining / 1000));
	const percentage = $derived((timeRemaining / totalTime) * 100);
	const isWarning = $derived(percentage < 30);
	const isCritical = $derived(percentage < 10);

	// Start/stop timer
	$effect(() => {
		if (active && timeRemaining > 0) {
			intervalId = setInterval(() => {
				timeRemaining = Math.max(0, timeRemaining - 100);

				if (timeRemaining === 0 && ontimeout) {
					ontimeout();
				}
			}, 100) as unknown as number;
		} else {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}

		return () => {
			if (intervalId !== null) {
				clearInterval(intervalId);
			}
		};
	});

	// Format time display
	const timeDisplay = $derived.by(() => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
	});

	// Get color class based on remaining time
	const colorClass = $derived.by(() => {
		if (isCritical) return 'bg-destructive';
		if (isWarning) return 'bg-yellow-500';
		return 'bg-primary';
	});

	const textColorClass = $derived.by(() => {
		if (isCritical) return 'text-destructive';
		if (isWarning) return 'text-yellow-600';
		return 'text-primary';
	});
</script>

<div class="challenge-timer">
	<!-- Time Display -->
	<div class="mb-2 text-center">
		<span class="text-2xl font-bold {textColorClass}">{timeDisplay}</span>
	</div>

	<!-- Progress Bar -->
	<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
		<div
			class="h-full transition-all duration-100 {colorClass}"
			style="width: {percentage}%"
			class:animate-pulse={isCritical}
		></div>
	</div>

	{#if isCritical}
		<p class="mt-2 text-center text-sm font-medium text-destructive">Dépêche-toi !</p>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.animate-pulse {
		animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
