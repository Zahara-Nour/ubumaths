<script lang="ts">
	/**
	 * TimelineSlider - Interactive timeline scrubber for construction animations
	 *
	 * Displays the timeline progress as a slider and allows interactive
	 * scrubbing. Shows current time and total duration.
	 */

	import type { Timeline } from '../core/timeline.svelte';
	import { formatTime } from '../core/timeline.svelte';
	import { cn } from '$lib/utils';

	// Types
	interface Props {
		/** The timeline instance to control */
		timeline: Timeline;
		/** Additional CSS classes */
		class?: string;
		/** Whether to show time display */
		showTime?: boolean;
		/** Whether the slider is disabled */
		disabled?: boolean;
	}

	// Props
	let { timeline, class: className = '', showTime = true, disabled = false }: Props = $props();

	// Local state for tracking drag operations
	let isDragging = $state(false);
	let sliderContainer: HTMLDivElement | null = $state(null);

	// Derived state from timeline
	let progress = $derived(timeline.progress);
	let currentTime = $derived(timeline.currentTime);
	let totalDuration = $derived(timeline.totalDuration);

	// Formatted time strings
	let currentTimeStr = $derived(formatTime(currentTime));
	let totalDurationStr = $derived(formatTime(totalDuration));

	// Calculate progress percentage for styling
	let progressPercent = $derived(Math.max(0, Math.min(100, progress * 100)));

	/**
	 * Get the progress value from a pointer event
	 */
	function getProgressFromEvent(event: PointerEvent): number {
		if (!sliderContainer) return 0;

		const rect = sliderContainer.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const width = rect.width;

		return Math.max(0, Math.min(1, x / width));
	}

	/**
	 * Handle pointer down on the slider track
	 */
	function handlePointerDown(event: PointerEvent) {
		if (disabled) return;

		isDragging = true;
		sliderContainer?.setPointerCapture(event.pointerId);

		const newProgress = getProgressFromEvent(event);
		timeline.scrubByProgress(newProgress);
	}

	/**
	 * Handle pointer move while dragging
	 */
	function handlePointerMove(event: PointerEvent) {
		if (!isDragging || disabled) return;

		const newProgress = getProgressFromEvent(event);
		timeline.scrubByProgress(newProgress);
	}

	/**
	 * Handle pointer up to end dragging
	 */
	function handlePointerUp(event: PointerEvent) {
		if (!isDragging) return;

		isDragging = false;
		sliderContainer?.releasePointerCapture(event.pointerId);
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;

		const step = event.shiftKey ? 0.1 : 0.01; // Shift for larger steps

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				event.preventDefault();
				timeline.scrubByProgress(Math.max(0, progress - step));
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault();
				timeline.scrubByProgress(Math.min(1, progress + step));
				break;
			case 'Home':
				event.preventDefault();
				timeline.scrubByProgress(0);
				break;
			case 'End':
				event.preventDefault();
				timeline.scrubByProgress(1);
				break;
		}
	}
</script>

<div
	class={cn('timeline-slider flex items-center gap-3', className)}
	class:opacity-50={disabled}
	class:cursor-not-allowed={disabled}
>
	{#if showTime}
		<span
			class="time-display min-w-14 text-right font-mono text-xs text-muted-foreground"
			aria-label="Temps actuel"
		>
			{currentTimeStr}
		</span>
	{/if}

	<div
		bind:this={sliderContainer}
		class={cn(
			'slider-track relative h-6 flex-1 cursor-pointer select-none',
			'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
			disabled && 'pointer-events-none'
		)}
		role="slider"
		tabindex={disabled ? -1 : 0}
		aria-label="Timeline de l'animation"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(progressPercent)}
		aria-valuetext="{currentTimeStr} sur {totalDurationStr}"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<!-- Track background -->
		<div
			class="track-bg absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-muted"
		></div>

		<!-- Filled progress -->
		<div
			class="track-fill absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-primary transition-[width]"
			class:transition-none={isDragging}
			style="width: {progressPercent}%"
		></div>

		<!-- Thumb -->
		<div
			class={cn(
				'thumb absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full',
				'border border-primary bg-background shadow-sm',
				'ring-ring/50 transition-shadow',
				isDragging && 'ring-4',
				!isDragging && 'hover:ring-4'
			)}
			style="left: {progressPercent}%"
		></div>
	</div>

	{#if showTime}
		<span
			class="time-display min-w-14 font-mono text-xs text-muted-foreground"
			aria-label="Duree totale"
		>
			{totalDurationStr}
		</span>
	{/if}
</div>
