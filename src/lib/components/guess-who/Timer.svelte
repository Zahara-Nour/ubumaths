<script lang="ts">
	/**
	 * Timer - Countdown timer with visual feedback
	 *
	 * Shows remaining seconds with color changes and pulse animation
	 * when time is running low.
	 */

	import { cn } from '$lib/utils';

	interface Props {
		seconds: number;
		isActive: boolean;
		class?: string;
	}

	let { seconds, isActive, class: className = '' }: Props = $props();

	// Format seconds as MM:SS
	const formattedTime = $derived.by(() => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	});

	// Determine color based on remaining time
	const colorClass = $derived.by(() => {
		if (seconds > 30) return 'text-green-600 border-green-600';
		if (seconds > 10) return 'text-yellow-600 border-yellow-600';
		return 'text-destructive border-destructive';
	});

	// Progress percentage (out of 60 seconds)
	const progressPercentage = $derived(Math.max(0, (seconds / 60) * 100));

	// Pulse animation when < 10s
	const shouldPulse = $derived(seconds < 10 && isActive);
</script>

<div class="timer {className}">
	<div
		class={cn(
			'timer-display relative flex h-24 w-24 items-center justify-center rounded-full border-4 transition-all',
			colorClass,
			shouldPulse && 'timer-pulse',
			!isActive && 'opacity-50'
		)}
		role="timer"
		aria-label={`Temps restant: ${formattedTime}`}
	>
		<!-- Circular progress background -->
		<svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
			<circle
				cx="50"
				cy="50"
				r="45"
				fill="none"
				stroke="currentColor"
				stroke-width="4"
				opacity="0.1"
			/>
			<circle
				cx="50"
				cy="50"
				r="45"
				fill="none"
				stroke="currentColor"
				stroke-width="4"
				stroke-dasharray={`${progressPercentage * 2.827} 282.7`}
				class="transition-all duration-1000"
			/>
		</svg>

		<!-- Time display -->
		<span class="relative z-10 font-mono text-2xl font-bold">{formattedTime}</span>
	</div>

	{#if !isActive}
		<p class="mt-2 text-center text-xs text-muted-foreground">En pause</p>
	{/if}
</div>

<style>
	.timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* Pulse animation for low time */
	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
	}

	.timer-pulse {
		animation: pulse 1s ease-in-out infinite;
	}
</style>
