<script lang="ts">
	/**
	 * PlayerControls - Playback controls for construction animations
	 *
	 * Provides play/pause, step forward/backward, and reset controls
	 * for the construction timeline.
	 */

	import type { Timeline } from '../core/timeline.svelte';
	import type { ConstructionEngine } from '../core/engine.svelte';
	import { Button } from '$lib/components/ui/button';
	import Play from 'lucide-svelte/icons/play';
	import Pause from 'lucide-svelte/icons/pause';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import SkipBack from 'lucide-svelte/icons/skip-back';
	import SkipForward from 'lucide-svelte/icons/skip-forward';

	// Types
	interface Props {
		timeline: Timeline;
		engine?: ConstructionEngine;
		class?: string;
	}

	// Props
	let { timeline, engine, class: className = '' }: Props = $props();

	// Derived state from timeline
	let isPlaying = $derived(timeline.isPlaying);
	let hasPrev = $derived(timeline.hasPrev);
	let hasNext = $derived(timeline.hasNext);

	// Handlers
	function handleReset() {
		// Use engine.reset() to clear objects, or fall back to timeline.reset()
		if (engine) {
			engine.reset();
		} else {
			timeline.reset();
		}
	}

	function handleStepBackward() {
		timeline.stepBackward();
	}

	function handleToggle() {
		timeline.toggle();
	}

	function handleStepForward() {
		timeline.stepForward();
	}
</script>

<div class="player-controls flex items-center gap-1 {className}">
	<Button
		variant="ghost"
		size="icon-sm"
		onclick={handleReset}
		title="Reinitialiser"
		aria-label="Reinitialiser la construction"
	>
		<RotateCcw class="h-4 w-4" />
	</Button>

	<Button
		variant="ghost"
		size="icon-sm"
		onclick={handleStepBackward}
		disabled={!hasPrev}
		title="Etape precedente"
		aria-label="Aller a l'etape precedente"
	>
		<SkipBack class="h-4 w-4" />
	</Button>

	<Button
		variant="default"
		size="icon"
		onclick={handleToggle}
		title={isPlaying ? 'Pause' : 'Lecture'}
		aria-label={isPlaying ? 'Mettre en pause' : 'Lancer la lecture'}
	>
		{#if isPlaying}
			<Pause class="h-5 w-5" />
		{:else}
			<Play class="h-5 w-5" />
		{/if}
	</Button>

	<Button
		variant="ghost"
		size="icon-sm"
		onclick={handleStepForward}
		disabled={!hasNext}
		title="Etape suivante"
		aria-label="Aller a l'etape suivante"
	>
		<SkipForward class="h-4 w-4" />
	</Button>
</div>
