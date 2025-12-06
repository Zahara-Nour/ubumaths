<script lang="ts">
	/**
	 * ConstructionPlayer - Main player component for geometric constructions
	 *
	 * Integrates the canvas, player controls, and parameter controls into
	 * a complete construction player component.
	 */

	import type { ConstructionScript } from '../types';
	import { ConstructionEngine } from '../core/engine.svelte';
	import ConstructionCanvas from './ConstructionCanvas.svelte';
	import PlayerControls from './PlayerControls.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import { onMount, onDestroy } from 'svelte';

	// Types
	interface Props {
		/** Construction script object */
		script?: ConstructionScript;
		/** Construction script as JSON string */
		scriptJson?: string;
		/** Start playback automatically */
		autoPlay?: boolean;
		/** Show grid on canvas */
		showGrid?: boolean;
		/** Show parameter controls */
		showParameters?: boolean;
		/** Show player controls */
		showControls?: boolean;
		/** Custom class for the container */
		class?: string;
	}

	// Props
	let {
		script,
		scriptJson,
		autoPlay = false,
		showGrid = true,
		showParameters = true,
		showControls = true,
		class: className = ''
	}: Props = $props();

	// Create engine instance
	const engine = new ConstructionEngine();

	// Derived state
	let canvasWidth = $derived(engine.canvasConfig?.width ?? 800);
	let canvasHeight = $derived(engine.canvasConfig?.height ?? 600);
	let currentStepDisplay = $derived(engine.timeline.currentStepIndex + 1);
	let totalSteps = $derived(engine.stepCount);
	let isLoading = $derived(engine.isLoading);
	let error = $derived(engine.error);
	let isLoaded = $derived(engine.isLoaded);

	// Load script on mount
	onMount(() => {
		try {
			if (script) {
				engine.load(script);
			} else if (scriptJson) {
				engine.loadFromJson(scriptJson);
			}

			if (autoPlay && engine.isLoaded) {
				engine.timeline.play();
			}
		} catch (err) {
			// Error is already captured in engine.error
			console.error('Failed to load construction:', err);
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		engine.destroy();
	});
</script>

<div class="construction-player flex flex-col gap-4 {className}">
	{#if error}
		<div class="rounded-lg bg-destructive/10 p-4 text-destructive" role="alert">
			<p class="font-medium">Erreur de chargement</p>
			<p class="mt-1 text-sm">{error}</p>
		</div>
	{:else if isLoading}
		<div class="flex items-center justify-center rounded-lg bg-muted p-8">
			<div class="flex items-center gap-3 text-muted-foreground">
				<svg
					class="h-5 w-5 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
				<span>Chargement de la construction...</span>
			</div>
		</div>
	{:else if isLoaded}
		<!-- Canvas -->
		<ConstructionCanvas {engine} width={canvasWidth} height={canvasHeight} {showGrid} />

		<!-- Controls bar -->
		{#if showControls}
			<div class="controls-bar flex items-center justify-between rounded-lg bg-muted px-4 py-2">
				<PlayerControls timeline={engine.timeline} />

				<div class="progress text-sm text-muted-foreground">
					Etape {currentStepDisplay} / {totalSteps}
				</div>
			</div>
		{/if}

		<!-- Parameter controls -->
		{#if showParameters}
			<ParameterControls {engine} />
		{/if}
	{:else}
		<div
			class="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-8"
		>
			<p class="text-muted-foreground">Aucune construction chargee</p>
		</div>
	{/if}
</div>

<style>
	.construction-player {
		max-width: fit-content;
	}
</style>
