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
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { RefreshCw } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import 'mathlive'; // Required for math rendering in instructions

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
		/** Show reload button */
		showReload?: boolean;
		/** Default color for objects (used if not set in script's canvas config) */
		defaultColor?: string;
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
		showReload = false,
		defaultColor,
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

	// Cross-fade state for instructions
	let displayedInstruction = $state<string | null>(null);
	let fadingOutInstruction = $state<string | null>(null);

	// React to instruction changes for cross-fade animation
	$effect(() => {
		const newInstruction = engine.currentInstruction?.text ?? null;
		if (newInstruction !== displayedInstruction) {
			// Start cross-fade
			fadingOutInstruction = displayedInstruction;
			displayedInstruction = newInstruction;

			// Clear fading out after animation completes
			if (fadingOutInstruction) {
				const timeoutId = setTimeout(() => {
					fadingOutInstruction = null;
				}, 300); // Match CSS transition duration

				// Cleanup: clear timeout if effect re-runs or component unmounts
				return () => clearTimeout(timeoutId);
			}
		}
	});

	/**
	 * Load or reload the construction script
	 */
	function reload(): void {
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
	}

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
		<!-- Canvas container with instruction overlay -->
		<div class="canvas-container">
			<ConstructionCanvas
				{engine}
				width={canvasWidth}
				height={canvasHeight}
				{showGrid}
				{defaultColor}
			/>

			<!-- Instruction Overlay -->
			{#if displayedInstruction || fadingOutInstruction}
				<div class="instruction-overlay">
					{#if fadingOutInstruction && fadingOutInstruction !== displayedInstruction}
						<div class="instruction-content fading-out">
							<MarkdownRenderer content={fadingOutInstruction} />
						</div>
					{/if}
					{#if displayedInstruction}
						<div class="instruction-content fading-in">
							<MarkdownRenderer content={displayedInstruction} />
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Controls bar -->
		{#if showControls}
			<div class="controls-bar flex items-center justify-between rounded-lg bg-muted px-4 py-2">
				<div class="flex items-center gap-2">
					<PlayerControls timeline={engine.timeline} {engine} />
					{#if showReload}
						<Button variant="ghost" size="icon" onclick={reload} title="Recharger">
							<RefreshCw class="h-4 w-4" />
						</Button>
					{/if}
				</div>

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
		<!-- No construction loaded - show reload button -->
		<div
			class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/50 p-8"
		>
			<p class="text-muted-foreground">Aucune construction chargee</p>
			{#if script || scriptJson}
				<Button variant="outline" onclick={reload}>
					<RefreshCw class="mr-2 h-4 w-4" />
					Charger la construction
				</Button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.construction-player {
		max-width: fit-content;
	}

	.canvas-container {
		position: relative;
	}

	.instruction-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.95);
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		z-index: 10;
	}

	.instruction-content {
		transition: opacity 300ms ease-in-out;
	}

	.instruction-content.fading-in {
		animation: fadeIn 300ms ease-in-out;
	}

	.instruction-content.fading-out {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 0.75rem 1rem;
		animation: fadeOut 300ms ease-in-out forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
</style>
