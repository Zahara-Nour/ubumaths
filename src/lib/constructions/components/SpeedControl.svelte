<script lang="ts">
	/**
	 * SpeedControl - Playback speed control for construction animations
	 *
	 * Provides buttons or a selector for changing the playback speed
	 * of the construction timeline.
	 */

	import type { Timeline } from '../core/timeline.svelte';
	import { formatPlaybackRate } from '../core/timeline.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	// Types
	interface Props {
		/** The timeline instance to control */
		timeline: Timeline;
		/** Additional CSS classes */
		class?: string;
		/** Display mode: 'buttons' for preset buttons, 'compact' for minimal display */
		mode?: 'buttons' | 'compact';
		/** Whether the control is disabled */
		disabled?: boolean;
	}

	// Preset speed values
	const SPEED_PRESETS = [0.5, 1, 1.5, 2] as const;

	// Props
	let { timeline, class: className = '', mode = 'buttons', disabled = false }: Props = $props();

	// Derived state from timeline
	let currentRate = $derived(timeline.playbackRate);
	let rateDisplay = $derived(formatPlaybackRate(currentRate));

	/**
	 * Set the playback rate to a preset value
	 */
	function setRate(rate: number) {
		if (disabled) return;
		timeline.setPlaybackRate(rate);
	}

	/**
	 * Decrease speed
	 */
	function handleSlowDown() {
		if (disabled) return;
		timeline.slowDown();
	}

	/**
	 * Increase speed
	 */
	function handleSpeedUp() {
		if (disabled) return;
		timeline.speedUp();
	}

	/**
	 * Reset to normal speed
	 */
	function handleResetSpeed() {
		if (disabled) return;
		timeline.resetSpeed();
	}

	/**
	 * Check if a rate is currently active (with tolerance for floating point)
	 */
	function isActiveRate(rate: number): boolean {
		return Math.abs(currentRate - rate) < 0.01;
	}
</script>

{#if mode === 'buttons'}
	<div
		class={cn('speed-control flex items-center gap-1', disabled && 'opacity-50', className)}
		role="group"
		aria-label="Controle de vitesse de lecture"
	>
		{#each SPEED_PRESETS as rate (rate)}
			<Button
				variant={isActiveRate(rate) ? 'default' : 'ghost'}
				size="sm"
				onclick={() => setRate(rate)}
				{disabled}
				title="Vitesse {formatPlaybackRate(rate)}"
				aria-label="Vitesse {formatPlaybackRate(rate)}"
				aria-pressed={isActiveRate(rate)}
				class="min-w-12 px-2 font-mono text-xs"
			>
				{formatPlaybackRate(rate)}
			</Button>
		{/each}
	</div>
{:else}
	<!-- Compact mode with +/- buttons -->
	<div
		class={cn('speed-control-compact flex items-center gap-1', disabled && 'opacity-50', className)}
		role="group"
		aria-label="Controle de vitesse de lecture"
	>
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={handleSlowDown}
			{disabled}
			title="Ralentir"
			aria-label="Ralentir la lecture"
			class="h-7 w-7"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M5 12h14" />
			</svg>
		</Button>

		<button
			type="button"
			onclick={handleResetSpeed}
			{disabled}
			title="Reinitialiser la vitesse a 1x"
			aria-label="Vitesse actuelle: {rateDisplay}. Cliquer pour reinitialiser a 1x"
			class={cn(
				'speed-display min-w-12 px-2 py-1 font-mono text-xs',
				'rounded-md transition-colors',
				'hover:bg-accent hover:text-accent-foreground',
				'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
				disabled && 'pointer-events-none'
			)}
		>
			{rateDisplay}
		</button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={handleSpeedUp}
			{disabled}
			title="Accelerer"
			aria-label="Accelerer la lecture"
			class="h-7 w-7"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M5 12h14" />
				<path d="M12 5v14" />
			</svg>
		</Button>
	</div>
{/if}
