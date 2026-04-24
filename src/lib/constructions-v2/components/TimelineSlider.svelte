<script lang="ts">
	import { cn } from '$lib/utils';
	import { formatTime } from '../core/timeline.svelte';
	import type { SimpleTimeline } from '../core/timeline.svelte';

	interface Props {
		timeline: SimpleTimeline;
		class?: string;
		showTime?: boolean;
		disabled?: boolean;
	}

	let { timeline, class: className = '', showTime = true, disabled = false }: Props = $props();

	let isDragging = $state(false);
	let trackEl: HTMLDivElement | undefined = $state();

	function handlePointerDown(e: PointerEvent) {
		if (disabled) return;
		isDragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		scrubFromEvent(e);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;
		scrubFromEvent(e);
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function scrubFromEvent(e: PointerEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();
		const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		timeline.scrubByProgress(progress);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;
		switch (e.key) {
			case 'ArrowRight':
				timeline.scrubByProgress(timeline.progress + (e.shiftKey ? 0.1 : 0.01));
				break;
			case 'ArrowLeft':
				timeline.scrubByProgress(timeline.progress - (e.shiftKey ? 0.1 : 0.01));
				break;
			case 'Home':
				timeline.scrubByProgress(0);
				break;
			case 'End':
				timeline.scrubByProgress(1);
				break;
		}
	}
</script>

<div class={cn('flex items-center gap-2', className)}>
	{#if showTime}
		<span class="min-w-[3rem] text-right text-xs text-muted-foreground">
			{formatTime(timeline.currentTime)}
		</span>
	{/if}

	<div
		bind:this={trackEl}
		class="relative h-2 flex-1 cursor-pointer rounded-full bg-muted"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onkeydown={handleKeyDown}
		role="slider"
		tabindex="0"
		aria-label="Timeline"
		aria-valuenow={Math.round(timeline.progress * 100)}
		aria-valuemin={0}
		aria-valuemax={100}
	>
		<div
			class="absolute top-0 left-0 h-full rounded-full bg-primary transition-[width] duration-75"
			style:width="{timeline.progress * 100}%"
		></div>
		<div
			class="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm"
			style:left="{timeline.progress * 100}%"
		></div>
	</div>

	{#if showTime}
		<span class="min-w-[3rem] text-xs text-muted-foreground">
			{formatTime(timeline.totalDuration)}
		</span>
	{/if}
</div>
