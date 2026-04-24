<script lang="ts">
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
			// Execute steps up to stepIndex
			executeUpTo(stepIndex);
		},
		onComplete() {
			// Animation finished
		}
	});

	let error = $state<string | null>(null);
	let figureVersion = $state(0);

	// Load script — use tick() to bump version outside the effect's dependency tracking
	$effect(() => {
		try {
			error = null;
			executor.load(script);
			timeline.load(executor.stepDurations);
			// Don't use figureVersion++ here (read+write causes infinite loop)
			// The version is bumped by executeUpTo/handleReset on user interaction
			if (autoPlay) {
				timeline.play();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
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
	{#if error}
		<div
			class="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
		>
			<p class="font-medium">Erreur dans le script</p>
			<p class="mt-1 font-mono text-xs">{error}</p>
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
