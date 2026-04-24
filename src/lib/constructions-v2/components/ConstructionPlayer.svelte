<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { parseDsl } from '$lib/geometry-core/dsl';
	import { ConstructionExecutor } from '../core/executor';
	import { Timeline, createInitialTimelineState } from '../core/timeline.svelte';
	import type { TimelineState } from '../core/timeline.svelte';
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

	// Reactive state owned by this component
	let tl = $state<TimelineState>(createInitialTimelineState());
	let figureVersion = $state(0);
	let currentInstruction = $state<string | null>(null);

	// Plain JS objects (not reactive)
	const executor = new ConstructionExecutor();
	let timeline: Timeline | null = null;

	// Parse script — $derived for pure computation
	let parseResult = $derived.by(() => {
		try {
			parseDsl(script);
			return { valid: true as const, error: null };
		} catch (e) {
			return { valid: false as const, error: e instanceof Error ? e.message : String(e) };
		}
	});

	// ─── Event handlers (UI event → handler → update $state → DOM) ───

	function handleStepChange(stepIndex: number) {
		executor.reset();
		for (let i = 0; i <= stepIndex; i++) {
			executor.step();
		}
		figureVersion++;
		currentInstruction = executor.currentInstruction;
	}

	function handleTimelineUpdate(state: TimelineState) {
		tl = state;
	}

	function handleToggle() {
		timeline?.toggle();
	}

	function handleStepForward() {
		timeline?.stepForward();
	}

	function handleStepBackward() {
		timeline?.stepBackward();
	}

	function handleReset() {
		executor.reset();
		timeline?.reset();
		figureVersion++;
		currentInstruction = null;
	}

	function handleScrub(progress: number) {
		timeline?.scrubByProgress(progress);
	}

	function handleSetPlaybackRate(rate: number) {
		timeline?.setPlaybackRate(rate);
	}

	function handleSpeedUp() {
		timeline?.speedUp();
	}

	function handleSlowDown() {
		timeline?.slowDown();
	}

	function handleResetSpeed() {
		timeline?.resetSpeed();
	}

	function loadScript(scriptText: string) {
		executor.load(scriptText);
		timeline?.destroy();
		timeline = new Timeline(handleTimelineUpdate, handleStepChange);
		timeline.load(executor.stepDurations);
	}

	// Initialize on mount
	onMount(() => {
		if (parseResult.valid) {
			loadScript(script);
			if (autoPlay) {
				timeline?.play();
			}
		}
	});

	// React to script prop changes after mount
	let prevScript = script;
	$effect(() => {
		if (script !== prevScript) {
			prevScript = script;
			if (parseResult.valid) {
				loadScript(script);
			}
		}
	});

	onDestroy(() => {
		timeline?.destroy();
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

		{#if currentInstruction}
			<div class="mt-2 rounded-md bg-muted p-2 text-sm text-muted-foreground">
				{currentInstruction}
			</div>
		{/if}

		{#if showControls}
			<div class="mt-2 flex items-center gap-2">
				<PlayerControls
					{tl}
					onToggle={handleToggle}
					onStepForward={handleStepForward}
					onStepBackward={handleStepBackward}
					onReset={handleReset}
				/>
				<TimelineSlider {tl} onScrub={handleScrub} class="flex-1" />
				<SpeedControl
					{tl}
					onSetRate={handleSetPlaybackRate}
					onSpeedUp={handleSpeedUp}
					onSlowDown={handleSlowDown}
					onResetSpeed={handleResetSpeed}
					mode="compact"
				/>
			</div>
			<div class="mt-1 text-center text-xs text-muted-foreground">
				Etape {tl.currentStepIndex + 1} / {tl.stepCount}
			</div>
		{/if}
	{/if}
</div>
