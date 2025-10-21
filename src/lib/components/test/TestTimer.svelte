<!--
	TestTimer Component
	===================
	Circular countdown timer with progress visualization

	Features:
	- Circular SVG progress indicator
	- Time display (MM:SS format)
	- Color changes based on remaining time (green → yellow → red)
	- Pause support
	- Auto-completes when time reaches 0

	Props:
	- duration: number - Total duration in seconds
	- isPaused: boolean - Pause state
	- size: 'sm' | 'md' | 'lg' - Timer size
	- onComplete: () => void - Callback when timer reaches 0
	- onTick: (remaining: number) => void - Optional callback every second
-->

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		duration: number;
		isPaused?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onComplete?: () => void;
		onTick?: (remaining: number) => void;
	}

	let { duration, isPaused = false, size = 'md', onComplete, onTick }: Props = $props();

	// State
	let remaining = $state(duration);
	let initialDuration = $state(duration); // Store initial duration for progress calculation
	let animationFrame = $state<number | null>(null);
	let hasCompleted = $state(false);
	let lastTimestamp = $state<number | null>(null);

	// Derived values
	let progress = $derived((remaining / initialDuration) * 100);
	let minutes = $derived(Math.floor(remaining / 60));
	let seconds = $derived(Math.floor(remaining % 60));
	let timeDisplay = $derived(
		`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
	);

	// Color based on remaining time percentage
	let colorClass = $derived(
		progress > 50
			? 'text-green-600 dark:text-green-500'
			: progress > 20
				? 'text-yellow-600 dark:text-yellow-500'
				: 'text-red-600 dark:text-red-500'
	);

	let strokeColor = $derived(
		progress > 50
			? 'stroke-green-600 dark:stroke-green-500'
			: progress > 20
				? 'stroke-yellow-600 dark:stroke-yellow-500'
				: 'stroke-red-600 dark:stroke-red-500'
	);

	// Size configurations
	const sizeConfigs = {
		sm: {
			containerSize: 'h-16 w-16',
			svgSize: 64,
			strokeWidth: 4,
			textSize: 'text-xs',
			radius: 28
		},
		md: {
			containerSize: 'h-32 w-32',
			svgSize: 128,
			strokeWidth: 8,
			textSize: 'text-xl',
			radius: 56
		},
		lg: {
			containerSize: 'h-48 w-48',
			svgSize: 192,
			strokeWidth: 12,
			textSize: 'text-3xl',
			radius: 84
		}
	};

	const config = $derived(sizeConfigs[size]);
	const circumference = $derived(2 * Math.PI * config.radius);
	const strokeDashoffset = $derived(circumference - (progress / 100) * circumference);

	/**
	 * Update timer
	 */
	function updateTimer(timestamp: number) {
		// Skip if paused or completed
		if (isPaused || hasCompleted) {
			lastTimestamp = null;
			return;
		}

		// Calculate delta time
		const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
		lastTimestamp = timestamp;

		// Update remaining time
		const newRemaining = Math.max(0, remaining - deltaTime);

		// Check if we crossed a second boundary
		if (Math.floor(newRemaining) < Math.floor(remaining)) {
			onTick?.(Math.floor(newRemaining));
		}

		remaining = newRemaining;

		// Check completion
		if (remaining <= 0 && !hasCompleted) {
			hasCompleted = true;
			lastTimestamp = null;
			onComplete?.();
			return;
		}

		// Continue animation
		animationFrame = requestAnimationFrame(updateTimer);
	}

	/**
	 * Start timer
	 */
	function startTimer() {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
		animationFrame = requestAnimationFrame(updateTimer);
	}

	/**
	 * Reset timer when duration changes
	 */
	$effect(() => {
		// Track duration changes
		duration;

		// Update state without tracking
		untrack(() => {
			// Stop current timer
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
				animationFrame = null;
			}

			// Reset state
			initialDuration = duration; // Update initial duration for new timer
			remaining = duration;
			lastTimestamp = null;
			hasCompleted = false;

			// Restart if not paused
			if (!isPaused) {
				startTimer();
			}
		});
	});

	/**
	 * Handle pause/resume
	 */
	$effect(() => {
		// Track pause state
		const paused = isPaused;

		// Handle pause/resume without tracking other state
		untrack(() => {
			if (paused) {
				// Stop timer and reset lastTimestamp so we don't count pause time
				if (animationFrame) {
					cancelAnimationFrame(animationFrame);
					animationFrame = null;
				}
				lastTimestamp = null;
			} else if (!hasCompleted) {
				// Resume timer
				lastTimestamp = null; // Reset so first frame doesn't count elapsed time during pause
				startTimer();
			}
		});
	});

	/**
	 * Cleanup on unmount
	 */
	onMount(() => {
		// Start timer initially if not paused
		untrack(() => {
			if (!isPaused) {
				startTimer();
			}
		});

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});
</script>

<div class="timer-container flex flex-col items-center justify-center">
	<!-- SVG Circular Progress -->
	<div class={cn('relative', config.containerSize)}>
		<svg
			class="-rotate-90 transform"
			width={config.svgSize}
			height={config.svgSize}
			viewBox="0 0 {config.svgSize} {config.svgSize}"
		>
			<!-- Background circle -->
			<circle
				cx={config.svgSize / 2}
				cy={config.svgSize / 2}
				r={config.radius}
				stroke="currentColor"
				stroke-width={config.strokeWidth}
				fill="none"
				class="text-muted opacity-20"
			/>

			<!-- Progress circle -->
			<circle
				cx={config.svgSize / 2}
				cy={config.svgSize / 2}
				r={config.radius}
				stroke="currentColor"
				stroke-width={config.strokeWidth}
				fill="none"
				stroke-linecap="round"
				class={cn('transition-all duration-300', strokeColor)}
				style="stroke-dasharray: {circumference}; stroke-dashoffset: {strokeDashoffset};"
			/>
		</svg>

		<!-- Time display (centered) -->
		<div class="absolute inset-0 flex items-center justify-center">
			<span class={cn('font-mono font-bold tabular-nums', config.textSize, colorClass)}>
				{timeDisplay}
			</span>
		</div>
	</div>

	<!-- Pause indicator -->
	{#if isPaused}
		<div class="mt-2 text-xs font-medium text-muted-foreground">En pause</div>
	{/if}
</div>

<style>
	.timer-container {
		user-select: none;
	}
</style>
