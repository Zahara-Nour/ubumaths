<script lang="ts">
	import { untrack } from 'svelte';
	import { parseDsl } from '$lib/geometry-core/dsl';
	import { ConstructionExecutor } from '../core/executor';
	import { SimpleTimeline } from '../core/timeline.svelte';
	import ConstructionCanvas from './ConstructionCanvas.svelte';
	import PlayerControls from './PlayerControls.svelte';
	import TimelineSlider from './TimelineSlider.svelte';
	import SpeedControl from './SpeedControl.svelte';

	interface Props {
		script: string;
		title?: string;
		width?: number;
		height?: number;
		autoPlay?: boolean;
		showGrid?: boolean;
		showControls?: boolean;
		class?: string;
	}

	let {
		script,
		title = '',
		width = 800,
		height = 600,
		autoPlay = false,
		showGrid = true,
		showControls = true,
		class: className = ''
	}: Props = $props();

	const executor = new ConstructionExecutor();
	const timeline = new SimpleTimeline({
		onStepChange(stepIndex) {
			executeUpTo(stepIndex);
		}
	});

	let figureVersion = $state(0);

	// Parse script — $derived for pure computation (can fail)
	let parseResult = $derived.by(() => {
		try {
			parseDsl(script); // validate syntax
			return { valid: true as const, error: null };
		} catch (e) {
			return { valid: false as const, error: e instanceof Error ? e.message : String(e) };
		}
	});

	// Load into executor/timeline — $effect for side effects only
	// untrack prevents writes to timeline's $state from re-triggering this effect
	$effect(() => {
		if (!parseResult.valid) return;
		const currentScript = script;
		const shouldAutoPlay = autoPlay;
		untrack(() => {
			executor.load(currentScript);
			timeline.load(executor.stepDurations);
			if (shouldAutoPlay) {
				timeline.play();
			}
		});
	});

	function executeUpTo(stepIndex: number) {
		executor.reset();
		for (let i = 0; i <= stepIndex; i++) {
			executor.step();
		}
		figureVersion++;
	}

	function handleReset() {
		executor.reset();
		timeline.reset();
		figureVersion++;
	}

	// Cleanup
	$effect(() => {
		return () => timeline.destroy();
	});
</script>

<div class="construction-player {className}">
	{#if parseResult.error}
		<div
			class="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
		>
			<p class="font-medium">Erreur dans le script</p>
			<p class="mt-1 font-mono text-xs">{parseResult.error}</p>
		</div>
	{:else}
		{#if title}
			<h3 class="mb-2 text-sm font-medium">{title}</h3>
		{/if}

		<ConstructionCanvas
			figure={executor.figure}
			instrumentStates={executor.instrumentStates}
			{figureVersion}
			{width}
			{height}
			{showGrid}
		/>

		{#if executor.currentInstruction}
			<div class="mt-2 rounded-md bg-muted p-2 text-sm text-muted-foreground">
				{executor.currentInstruction}
			</div>
		{/if}

		{#if showControls}
			<div class="mt-2 flex items-center gap-2">
				<PlayerControls {timeline} onReset={handleReset} />
				<TimelineSlider {timeline} class="flex-1" />
				<SpeedControl {timeline} mode="compact" />
			</div>
			<div class="mt-1 text-center text-xs text-muted-foreground">
				Etape {timeline.currentStepIndex + 1} / {timeline.stepCount}
			</div>
		{/if}
	{/if}
</div>
