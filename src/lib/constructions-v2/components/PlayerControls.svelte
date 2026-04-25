<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw, SkipBack, Play, Pause, SkipForward, StepForward } from 'lucide-svelte';
	import type { TimelineState } from '../core/timeline.svelte';

	interface Props {
		tl: TimelineState;
		onToggle: () => void;
		onStepForward: () => void;
		onPlayOneStep: () => void;
		onStepBackward: () => void;
		onReset: () => void;
		class?: string;
	}

	let {
		tl,
		onToggle,
		onStepForward,
		onPlayOneStep,
		onStepBackward,
		onReset,
		class: className = ''
	}: Props = $props();
</script>

<div class="flex items-center gap-1 {className}">
	<Button variant="ghost" size="icon" class="h-8 w-8" onclick={onReset} title="Recommencer">
		<RotateCcw class="h-4 w-4" />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8"
		onclick={onStepBackward}
		disabled={!tl.hasPrev}
		title="Etape precedente"
	>
		<SkipBack class="h-4 w-4" />
	</Button>
	<Button
		variant="default"
		size="icon"
		class="h-9 w-9"
		onclick={onToggle}
		title={tl.isPlaying ? 'Pause' : 'Lecture'}
	>
		{#if tl.isPlaying}
			<Pause class="h-4 w-4" />
		{:else}
			<Play class="h-4 w-4" />
		{/if}
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8"
		onclick={onPlayOneStep}
		disabled={!tl.hasNext}
		title="Animer l'etape suivante"
	>
		<StepForward class="h-4 w-4" />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8"
		onclick={onStepForward}
		disabled={!tl.hasNext}
		title="Etape suivante (instantane)"
	>
		<SkipForward class="h-4 w-4" />
	</Button>
</div>
