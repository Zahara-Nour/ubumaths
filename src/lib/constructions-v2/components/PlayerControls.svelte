<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw, SkipBack, Play, Pause, SkipForward } from 'lucide-svelte';
	import type { SimpleTimeline } from '../core/timeline.svelte';

	interface Props {
		timeline: SimpleTimeline;
		onReset?: () => void;
		class?: string;
	}

	let { timeline, onReset, class: className = '' }: Props = $props();

	function handleReset() {
		if (onReset) {
			onReset();
		} else {
			timeline.reset();
		}
	}
</script>

<div class="flex items-center gap-1 {className}">
	<Button variant="ghost" size="icon" class="h-8 w-8" onclick={handleReset} title="Recommencer">
		<RotateCcw class="h-4 w-4" />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8"
		onclick={() => timeline.stepBackward()}
		disabled={!timeline.hasPrev}
		title="Etape precedente"
	>
		<SkipBack class="h-4 w-4" />
	</Button>
	<Button
		variant="default"
		size="icon"
		class="h-9 w-9"
		onclick={() => timeline.toggle()}
		title={timeline.isPlaying ? 'Pause' : 'Lecture'}
	>
		{#if timeline.isPlaying}
			<Pause class="h-4 w-4" />
		{:else}
			<Play class="h-4 w-4" />
		{/if}
	</Button>
	<Button
		variant="ghost"
		size="icon"
		class="h-8 w-8"
		onclick={() => timeline.stepForward()}
		disabled={!timeline.hasNext}
		title="Etape suivante"
	>
		<SkipForward class="h-4 w-4" />
	</Button>
</div>
