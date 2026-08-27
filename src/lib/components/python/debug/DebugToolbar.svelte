<script lang="ts">
	/**
	 * Debug Toolbar — record-then-replay navigation (Python Tutor-style).
	 *
	 * There is a single debug model: the main Run button records the whole
	 * execution into an immutable trace; this toolbar navigates that recording.
	 *
	 * Row 1 — Prev/Next step, jump to previous/next breakpoint (when a breakpoint
	 * matches a recorded step), stop, and a status indicator.
	 * Row 2 — Scrubber: play/pause autoplay, a slider over the whole trace with
	 * colored event markers (call / return / exception), a "pas i/N" counter, a
	 * legend, and a truncation notice.
	 *
	 * Only rendered when debug mode is active.
	 */

	import { debugStore } from '$lib/stores/pythonDebug.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
	import SkipBack from '@lucide/svelte/icons/skip-back';
	import SkipForward from '@lucide/svelte/icons/skip-forward';

	interface Props {
		/** Whether controls are disabled (e.g., during code edit / loading) */
		disabled?: boolean;
	}

	let { disabled = false }: Props = $props();

	// Milliseconds between steps during autoplay.
	const PLAY_INTERVAL_MS = 350;

	// Derived state (chronological: 0 = first step, N-1 = last)
	let isRunning = $derived(debugStore.isRunning);
	let stepCount = $derived(debugStore.stepCount);
	let stepIndex = $derived(debugStore.stepIndex);
	let hasTrace = $derived(stepCount > 0);
	let scrubbable = $derived(stepCount > 1);
	let canStepBack = $derived(debugStore.canStepBack);
	let canStepForward = $derived(debugStore.canStepForward);
	let eventMarkers = $derived(debugStore.eventMarkers);
	let traceTruncated = $derived(debugStore.traceTruncated);
	let hasBreakpointInTrace = $derived(debugStore.hasBreakpointInTrace);
	// Navigation is unavailable while recording or before a trace exists.
	let navDisabled = $derived(disabled || isRunning || !hasTrace);

	// Autoplay
	let isPlaying = $state(false);
	let playTimer: ReturnType<typeof setInterval> | null = null;

	function stopPlay(): void {
		isPlaying = false;
		if (playTimer !== null) {
			clearInterval(playTimer);
			playTimer = null;
		}
	}

	function tick(): void {
		const next = debugStore.stepIndex + 1;
		if (next >= debugStore.stepCount) {
			stopPlay();
			return;
		}
		debugStore.goToStep(next);
	}

	function startPlay(): void {
		if (!scrubbable) return;
		// Restart from the beginning when parked at the end.
		if (debugStore.stepIndex >= debugStore.stepCount - 1) debugStore.goToStep(0);
		isPlaying = true;
		playTimer = setInterval(tick, PLAY_INTERVAL_MS);
	}

	function togglePlay(): void {
		if (isPlaying) stopPlay();
		else startPlay();
	}

	// Stop autoplay when a fresh session starts (new recording)...
	$effect(() => {
		if (debugStore.sessionState === 'running') stopPlay();
	});
	// ...and when the component is torn down.
	$effect(() => () => stopPlay());

	// Colored marker per event kind on the scrubber track.
	function markerColor(event: string): string {
		if (event === 'call') return 'bg-emerald-500';
		if (event === 'return') return 'bg-blue-500';
		return 'bg-red-500'; // exception
	}

	function handleScrub(values: number[]) {
		if (values.length > 0) debugStore.goToStep(values[0]);
	}
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
	<!-- Row 1: step & breakpoint navigation + stop + status -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Step ±1 through the recorded trace -->
		<div class="flex items-center gap-1">
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => debugStore.stepBack()}
				disabled={navDisabled || !canStepBack}
				aria-label="Pas précédent"
				title="Pas précédent"
			>
				<ChevronLeft class="size-4" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => debugStore.stepForward()}
				disabled={navDisabled || !canStepForward}
				aria-label="Pas suivant"
				title="Pas suivant (entre dans les fonctions)"
			>
				<ChevronRight class="size-4" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				onclick={() => debugStore.goToStepOver()}
				disabled={navDisabled || !canStepForward}
				aria-label="Enjamber la fonction (pas suivant sans y entrer)"
				title="Enjamber la fonction"
			>
				<ChevronsRight class="size-4" />
			</Button>
		</div>

		<!-- Jump to previous/next breakpoint (only when one matches a step) -->
		{#if hasBreakpointInTrace}
			<div class="h-6 w-px bg-border" aria-hidden="true"></div>
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => debugStore.goToPrevBreakpointStep()}
					disabled={navDisabled}
					aria-label="Point d'arrêt précédent"
					title="Point d'arrêt précédent"
				>
					<SkipBack class="size-4 text-red-500" />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => debugStore.goToNextBreakpointStep()}
					disabled={navDisabled}
					aria-label="Point d'arrêt suivant"
					title="Point d'arrêt suivant"
				>
					<SkipForward class="size-4 text-red-500" />
				</Button>
			</div>
		{/if}

		<!-- Status indicator -->
		{#if isRunning}
			<div class="ml-auto flex items-center gap-2">
				<div class="size-2 animate-pulse rounded-full bg-yellow-500" aria-hidden="true"></div>
				<span class="text-xs text-muted-foreground">Enregistrement...</span>
			</div>
		{:else if hasTrace}
			<div class="ml-auto flex items-center gap-2">
				<div class="size-2 rounded-full bg-green-500" aria-hidden="true"></div>
				<span class="text-xs text-muted-foreground">Enregistré</span>
			</div>
		{:else}
			<span class="ml-auto text-xs text-muted-foreground italic">
				Écrivez du code — l'exécution est enregistrée automatiquement.
			</span>
		{/if}
	</div>

	<!-- Row 2: scrubber (only once a trace exists) -->
	{#if hasTrace}
		<div class="flex items-center gap-3">
			<!-- Play / pause -->
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={togglePlay}
				disabled={disabled || !scrubbable}
				aria-label={isPlaying ? 'Mettre en pause la lecture' : 'Lire la trace'}
				title={isPlaying ? 'Pause' : 'Lecture'}
			>
				{#if isPlaying}
					<Pause class="size-4" />
				{:else}
					<Play class="size-4" />
				{/if}
			</Button>

			<!-- Slider + event markers overlaid on the track -->
			<div class="relative flex-1">
				<Slider
					type="single"
					min={0}
					max={Math.max(0, stepCount - 1)}
					step={1}
					value={[stepIndex]}
					onValueChange={handleScrub}
					disabled={disabled || !scrubbable}
					aria-label="Position dans la trace d'exécution"
				/>
				{#each eventMarkers as marker (marker.index)}
					<span
						class="pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full {markerColor(
							marker.event
						)}"
						style="left: {scrubbable ? (marker.index / (stepCount - 1)) * 100 : 0}%"
						aria-hidden="true"
					></span>
				{/each}
			</div>

			<!-- Counter -->
			<span class="min-w-[5rem] text-center text-xs text-muted-foreground tabular-nums">
				Pas {stepIndex + 1}/{stepCount}
			</span>
		</div>

		<!-- Legend + truncation notice -->
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
			{#if eventMarkers.length > 0}
				<div class="flex items-center gap-3 text-[10px] text-muted-foreground">
					<span class="flex items-center gap-1">
						<span class="h-2 w-0.5 rounded-full bg-emerald-500" aria-hidden="true"></span>appel
					</span>
					<span class="flex items-center gap-1">
						<span class="h-2 w-0.5 rounded-full bg-blue-500" aria-hidden="true"></span>retour
					</span>
					<span class="flex items-center gap-1">
						<span class="h-2 w-0.5 rounded-full bg-red-500" aria-hidden="true"></span>exception
					</span>
				</div>
			{/if}
			{#if traceTruncated}
				<p class="text-xs text-amber-600 dark:text-amber-400">
					Trace tronquée à {stepCount} pas (programme trop long).
				</p>
			{/if}
		</div>
	{/if}
</div>
