<!--
	TestTimer Component
	===================
	Circular timer with smooth progress visualization and warning effects

	Modes:
	- countdown: Count down from duration to 0 (with warning effects)
	- stopwatch: Count up from 0 (no limit, blue color)

	Features:
	- Circular SVG progress indicator with thick stroke
	- Time display in seconds (using Pacifico font, black text on white background)
	- Countdown mode: Continuous color gradient based on progress (green → yellow → orange → red)
	- Stopwatch mode: Static blue/primary color
	- Smooth millisecond-precision animation (60fps via requestAnimationFrame)
	- Warning effects (countdown only) when ≤5 seconds remaining:
	  * Progress bar pulse animation (scale 1.08) at each second
	  * Ripple effect with thick fading border emanating from progress bar
	- White circular background fill
	- Pause support
	- Auto-completes when time reaches 0 (countdown only)
	- Dynamic duration adjustment: Add/subtract time from running timer without reset

	Props:
	- mode: 'countdown' | 'stopwatch' - Timer mode (default: 'countdown')
	- duration: number - Total duration in seconds (countdown only)
	- isPaused: boolean - Pause state (default: false)
	- size: 'sm' | 'md' | 'lg' - Timer size (default: 'md')
	- onComplete: () => void - Callback when timer reaches 0 (countdown only)
	- onTick: (value: number) => void - Optional callback every second (remaining for countdown, elapsed for stopwatch)
	- durationAdjustment: number - Delta to add/subtract from remaining time (countdown only, default: 0)

	Technical Details:
	- Display uses Math.ceil() for countdown, Math.floor() for stopwatch
	- Progress bar uses raw time for smooth animation
	- Stopwatch mode shows elapsed time with format: <60s shows seconds, ≥60s shows MM:SS
	- Ripple starts at exact edge of pulsed progress bar (calculated dynamically)
	- Each ripple is uniquely keyed to ensure full animation completion
	- High z-index (50) ensures visibility over other elements
-->

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { cn } from '$lib/utils';

	interface Props {
		mode?: 'countdown' | 'stopwatch';
		duration?: number;
		isPaused?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onComplete?: () => void;
		onTick?: (value: number) => void;
		durationAdjustment?: number; // Delta to add/subtract from remaining time (countdown only)
		startTime?: number; // Start timestamp for stopwatch mode
	}

	let {
		mode = 'countdown',
		duration = 0,
		isPaused = false,
		size = 'md',
		onComplete,
		onTick,
		durationAdjustment = 0,
		startTime
	}: Props = $props();

	// State
	let remaining = $state(duration);
	let elapsed = $state(0); // For stopwatch mode
	let initialDuration = $state(duration); // Store initial duration for progress calculation
	let animationFrame = $state<number | null>(null);
	let hasCompleted = $state(false);
	let lastTimestamp = $state<number | null>(null);
	let triggerPulse = $state(false); // Trigger pulse animation once per second (countdown only)
	let rippleKey = $state(0); // Unique key for each ripple to force re-animation

	// Derived values
	let displayValue = $derived.by(() => {
		if (mode === 'countdown') {
			return Math.ceil(remaining); // Rounds up so timer shows 1 second until truly at 0
		} else {
			const elapsedSeconds = Math.floor(elapsed);
			return elapsedSeconds;
		}
	});

	let progress = $derived.by(() => {
		if (mode === 'countdown') {
			return Math.max(0, Math.min(100, (remaining / initialDuration) * 100));
		} else {
			// Stopwatch shows 25% progress (static)
			return 25;
		}
	});

	let timeDisplay = $derived.by(() => {
		if (mode === 'countdown') {
			return displayValue.toString();
		} else {
			// Format: <60s shows seconds, ≥60s shows MM:SS
			const seconds = displayValue;
			if (seconds < 60) {
				return seconds.toString();
			}
			const mins = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return `${mins}:${secs.toString().padStart(2, '0')}`;
		}
	});

	// Color: countdown uses gradient, stopwatch uses primary color
	let hueValue = $derived(Math.max(0, Math.min(120, (progress / 100) * 120)));
	let strokeColorStyle = $derived(
		mode === 'countdown' ? `hsl(${hueValue}, 80%, 50%)` : 'hsl(var(--primary))'
	);

	// Size configurations
	const sizeConfigs = {
		sm: {
			containerSize: 'h-16 w-16',
			svgSize: 64,
			strokeWidth: 6,
			textSize: 'text-lg',
			radius: 28
		},
		md: {
			containerSize: 'h-32 w-32',
			svgSize: 128,
			strokeWidth: 16,
			textSize: 'text-4xl',
			radius: 48
		},
		lg: {
			containerSize: 'h-48 w-48',
			svgSize: 192,
			strokeWidth: 18,
			textSize: 'text-6xl',
			radius: 84
		}
	};

	const config = $derived(sizeConfigs[size]);
	const circumference = $derived(2 * Math.PI * config.radius);
	const strokeDashoffset = $derived(circumference - (progress / 100) * circumference);

	// Calculate ripple initial scale to start exactly at the pulsed progress bar edge
	// Outer radius of progress bar = radius + strokeWidth/2
	// When pulsed at 1.08, outer radius = (radius + strokeWidth/2) * 1.08
	// Ripple container radius = svgSize / 2
	const rippleInitialScale = $derived(
		((config.radius + config.strokeWidth / 2) * 1.08) / (config.svgSize / 2)
	);

	/**
	 * Update timer
	 */
	function updateTimer(timestamp: number) {
		// Skip if paused or completed
		if (isPaused || (mode === 'countdown' && hasCompleted)) {
			lastTimestamp = null;
			return;
		}

		// Initialize lastTimestamp on first frame
		if (!lastTimestamp) {
			lastTimestamp = timestamp;
			animationFrame = requestAnimationFrame(updateTimer);
			return;
		}

		// Calculate delta time
		const deltaTime = (timestamp - lastTimestamp) / 1000;
		lastTimestamp = timestamp;

		if (mode === 'countdown') {
			// Update remaining time
			const newRemaining = Math.max(0, remaining - deltaTime);

			// Check if we crossed a second boundary
			if (Math.floor(newRemaining) < Math.floor(remaining)) {
				onTick?.(Math.floor(newRemaining));
				// Trigger pulse effect when 5 seconds or less
				if (newRemaining <= 5 && newRemaining > 0) {
					triggerPulse = true;
					rippleKey++; // Increment key to force new ripple animation
				}
			}

			// Stop pulse effect when no longer in warning zone
			if (newRemaining > 5 || newRemaining <= 0) {
				triggerPulse = false;
			}

			remaining = newRemaining;

			// Check completion
			if (remaining <= 0) {
				if (!hasCompleted) {
					hasCompleted = true;
					lastTimestamp = null;
					onComplete?.();
				}
				return;
			}
		} else {
			// Stopwatch mode: count up
			const newElapsed = elapsed + deltaTime;

			// Check if we crossed a second boundary
			if (Math.floor(newElapsed) > Math.floor(elapsed)) {
				onTick?.(Math.floor(newElapsed));
			}

			elapsed = newElapsed;
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
	 * Reset timer when duration or startTime changes
	 */
	$effect(() => {
		// Track changes
		if (mode === 'countdown') {
			duration;
		} else {
			startTime;
		}

		// Update state without tracking
		untrack(() => {
			// Stop current timer
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
				animationFrame = null;
			}

			if (mode === 'countdown') {
				// Reset countdown state
				const adjustedDuration = Math.max(1, duration + durationAdjustment);
				initialDuration = adjustedDuration;
				remaining = adjustedDuration;
				lastTimestamp = null;
				hasCompleted = false;
				lastAdjustment = durationAdjustment;
			} else {
				// Reset stopwatch state
				elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
				lastTimestamp = null;
			}

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
	 * Handle duration adjustment (add/subtract time from current remaining) - countdown only
	 */
	let lastAdjustment = $state(0);
	$effect(() => {
		if (mode !== 'countdown') return;

		// Track adjustment changes
		const currentAdjustment = durationAdjustment;

		untrack(() => {
			// Calculate delta from last adjustment
			const delta = currentAdjustment - lastAdjustment;

			if (delta !== 0 && !hasCompleted) {
				// Add delta to remaining time (can be negative)
				remaining = Math.max(0, remaining + delta);

				// Also update initial duration proportionally to maintain progress accuracy
				initialDuration = Math.max(1, initialDuration + delta);

				// If we went to 0, complete the timer
				if (remaining <= 0 && !hasCompleted) {
					hasCompleted = true;
					onComplete?.();
				}
			}

			lastAdjustment = currentAdjustment;
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

<div class="timer-container flex flex-col items-center justify-center" style="z-index: 50;">
	<!-- SVG Circular Progress -->
	<div class={cn('relative', config.containerSize)} style="overflow: visible;">
		<!-- Ripple effect (countdown only, triggers once per second when <= 5s) -->
		{#if mode === 'countdown' && triggerPulse}
			{#key rippleKey}
				<div class="ripple-container absolute inset-0 flex items-center justify-center">
					<div class="ripple" style="--ripple-initial-scale: {rippleInitialScale};"></div>
				</div>
			{/key}
		{/if}

		<svg
			class="-rotate-90 transform"
			width={config.svgSize}
			height={config.svgSize}
			viewBox="0 0 {config.svgSize} {config.svgSize}"
			style="overflow: visible;"
		>
			{#key mode === 'countdown' && triggerPulse ? rippleKey : 0}
				<!-- White background fill -->
				<circle
					cx={config.svgSize / 2}
					cy={config.svgSize / 2}
					r={config.radius + config.strokeWidth / 2}
					fill="white"
					class={mode === 'countdown' && triggerPulse ? 'progress-pulse' : ''}
				/>

				<!-- Background circle -->
				<circle
					cx={config.svgSize / 2}
					cy={config.svgSize / 2}
					r={config.radius}
					stroke="currentColor"
					stroke-width={config.strokeWidth}
					fill="none"
					class={cn(
						'text-muted opacity-20',
						mode === 'countdown' && triggerPulse ? 'progress-pulse' : ''
					)}
				/>

				<!-- Progress circle -->
				<circle
					cx={config.svgSize / 2}
					cy={config.svgSize / 2}
					r={config.radius}
					stroke={strokeColorStyle}
					stroke-width={config.strokeWidth}
					fill="none"
					stroke-linecap="round"
					class={mode === 'countdown' && triggerPulse ? 'progress-pulse' : ''}
					style="stroke-dasharray: {circumference}; stroke-dashoffset: {strokeDashoffset}; transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;"
				/>
			{/key}
		</svg>

		<!-- Time display (centered) -->
		<div class="absolute inset-0 z-10 flex items-center justify-center">
			<span
				class={cn('font-bold', config.textSize)}
				style="color: black; font-family: 'Pacifico', cursive;"
			>
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

	/* Ripple effect container */
	.ripple-container {
		pointer-events: none;
		z-index: 0;
	}

	/* Ripple circle with thick fading border */
	.ripple {
		position: absolute;
		border-radius: 50%;
		width: 100%;
		height: 100%;
		/* Thick border with gradient fade using box-shadow */
		box-shadow:
			0 0 0 3px rgba(239, 68, 68, 0.9),
			0 0 0 6px rgba(239, 68, 68, 0.7),
			0 0 0 10px rgba(239, 68, 68, 0.5),
			0 0 0 14px rgba(239, 68, 68, 0.3),
			0 0 0 18px rgba(239, 68, 68, 0.15),
			0 0 0 22px rgba(239, 68, 68, 0.05);
		animation: ripple 1.5s ease-out;
	}

	@keyframes ripple {
		0% {
			transform: scale(var(--ripple-initial-scale, 1.08));
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		85% {
			opacity: 0.6;
		}
		100% {
			transform: scale(1.6);
			opacity: 0;
		}
	}

	/* Pulse animation for progress circle - scale only, no glow */
	.progress-pulse {
		animation: progressPulse 0.4s ease-out;
		transform-origin: center;
		transform-box: fill-box;
	}

	@keyframes progressPulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.08);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
