<!--
	PomodoroDisplay
	===============

	Shows the big timer (MM:SS), a circular progress ring, the current phase
	label, the today counter, and the cycle position indicator.

	The progress ring is drawn as an SVG circle with a stroke-dashoffset
	trick. No custom CSS needed beyond Tailwind utilities for the container.
-->

<script lang="ts">
	import { pomodoroStore } from '$lib/stores/pomodoro/pomodoro.svelte';
	import type { PomodoroPhase } from '$lib/stores/pomodoro/logic';

	// ---------------------------------------------------------------------------
	// Derived display values
	// ---------------------------------------------------------------------------

	/** Format epoch-ms remainder as "MM:SS". */
	function formatTime(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	const PHASE_LABELS: Record<PomodoroPhase, string> = {
		work: 'Travail',
		short_break: 'Pause courte',
		long_break: 'Pause longue'
	};

	/** Human-readable label for the current phase. */
	let phaseLabel = $derived(PHASE_LABELS[pomodoroStore.state.phase]);

	let timeDisplay = $derived(formatTime(pomodoroStore.remainingMs));

	// Progress ring geometry
	const RING_RADIUS = 88; // px, inner radius of the stroke
	const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

	/** Stroke offset that animates the ring as the phase progresses. */
	let strokeOffset = $derived(RING_CIRCUMFERENCE * (1 - pomodoroStore.progress));

	// Today counter: show up to 10 tomatoes, then "🍅 × N"
	let todayCount = $derived(pomodoroStore.state.todayCount);
	let tomatoDisplay = $derived.by(() => {
		if (todayCount === 0) return null;
		if (todayCount <= 10) return '🍅'.repeat(todayCount);
		return `🍅 × ${todayCount}`;
	});

	// Cycle indicator: shown when not ready AND in work phase
	let showCycleIndicator = $derived(
		pomodoroStore.state.status !== 'ready' && pomodoroStore.state.phase === 'work'
	);
	let cyclePosition = $derived(pomodoroStore.state.workCompletedInCycle + 1);
	let cycleTotal = $derived(pomodoroStore.settings.pomodorosUntilLongBreak);

	// Color accent changes per phase
	let ringColor = $derived.by(() => {
		switch (pomodoroStore.state.phase) {
			case 'work':
				return 'text-primary';
			case 'short_break':
				return 'text-green-500';
			case 'long_break':
				return 'text-blue-500';
		}
	});
</script>

<div class="flex flex-col items-center gap-6">
	<!-- Phase label -->
	<p class="text-sm font-medium tracking-widest text-muted-foreground uppercase">
		{phaseLabel}
	</p>

	<!-- Progress ring + timer -->
	<div class="relative flex items-center justify-center">
		<!-- SVG ring -->
		<svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" class="rotate-[-90deg]">
			<!-- Track ring (background) -->
			<circle
				cx="110"
				cy="110"
				r={RING_RADIUS}
				fill="none"
				stroke="currentColor"
				stroke-width="10"
				class="text-muted/30"
			/>
			<!--
				Progress ring. No CSS transition: ticks fire every 250ms, a
				300ms transition would chase a target it never reaches and
				visibly stutter. 4 stepped updates per second reads as
				intentional precision on a timer.
			-->
			<circle
				cx="110"
				cy="110"
				r={RING_RADIUS}
				fill="none"
				stroke="currentColor"
				stroke-width="10"
				stroke-linecap="round"
				stroke-dasharray={RING_CIRCUMFERENCE}
				stroke-dashoffset={strokeOffset}
				class={ringColor}
			/>
		</svg>

		<!-- Timer text centered in the ring -->
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
			{#if pomodoroStore.hydrated}
				<span class="font-mono text-5xl font-semibold tracking-tight tabular-nums" aria-live="off">
					{timeDisplay}
				</span>
				{#if showCycleIndicator}
					<span class="text-xs text-muted-foreground">
						Pomodoro {cyclePosition} / {cycleTotal}
					</span>
				{/if}
			{:else}
				<!-- Skeleton placeholder while hydrating to avoid FOUC -->
				<span class="font-mono text-5xl font-semibold tracking-tight tabular-nums opacity-0">
					00:00
				</span>
			{/if}
		</div>
	</div>

	<!-- Today counter -->
	{#if tomatoDisplay !== null}
		<p class="text-base" aria-label="{todayCount} pomodoro{todayCount > 1 ? 's' : ''} aujourd'hui">
			{tomatoDisplay}
		</p>
	{/if}
</div>
