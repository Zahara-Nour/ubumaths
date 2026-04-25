<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { parseDsl } from '$lib/geometry-core/dsl';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import { ConstructionExecutor } from '../core/executor';
	import type {
		InstrumentType,
		InstrumentState,
		InstrumentMove,
		DrawAnimationState
	} from '../types';
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
		/** Seek to end on load (show final figure without animation). */
		seekToEnd?: boolean;
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
		seekToEnd = false,
		showGrid = true,
		showControls = true,
		class: className = ''
	}: Props = $props();

	// Reactive state owned by this component
	let tl = $state<TimelineState>(createInitialTimelineState());
	let figureVersion = $state(0);
	let currentInstruction = $state<string | null>(null);
	let currentFigure = $state<Figure>(new Figure());
	let currentInstrumentStates = $state(new Map<string, InstrumentState>());
	let animatingIds = $state<string[]>([]);
	let autoInstruments = $state(new Set<InstrumentType>());
	let instrumentMoves = $state(new Map<InstrumentType, InstrumentMove>());

	// Pre-compute the Set once when animatingIds changes (not every frame)
	const EMPTY_IDS = new Set<string>();
	let animatingIdsSet = $derived(animatingIds.length > 0 ? new Set(animatingIds) : EMPTY_IDS);

	// Derived animation state — only drawProgress changes every RAF frame.
	// animatingIds are cleared at progress=1 (element fully drawn, GeometryCanvas takes over).
	// autoInstruments and instrumentMoves stay until the NEXT step changes them.
	let animation = $derived<DrawAnimationState>({
		animatingIds: tl.stepProgress < 1 ? animatingIdsSet : EMPTY_IDS,
		drawProgress: tl.stepProgress,
		autoInstruments,
		instrumentMoves
	});

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

	function syncState() {
		currentFigure = executor.figure;
		currentInstrumentStates = new Map(executor.instrumentStates);
		currentInstruction = executor.currentInstruction;
		figureVersion++;
	}

	function handleStepChange(stepIndex: number) {
		try {
			executor.reset();
			for (let i = 0; i <= stepIndex; i++) {
				executor.step();
			}
			animatingIds = executor.lastStepNewElementIds;
			autoInstruments = new Set(executor.autoInstruments);
			instrumentMoves = new Map(executor.instrumentMoves);
			syncState();
		} catch {
			// Script may be invalid during editing — ignore runtime errors
		}
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
		animatingIds = [];
		syncState();
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

	function loadScript(scriptText: string): boolean {
		try {
			executor.load(scriptText);
		} catch {
			return false;
		}
		syncState();
		timeline?.destroy();
		timeline = new Timeline(handleTimelineUpdate, handleStepChange);
		timeline.load(executor.stepDurations);
		return true;
	}

	// Reload when script changes. $effect tracks only `script` (prop) and
	// `parseResult` (derived). untrack prevents loadScript's state writes
	// from being tracked as dependencies (side effect, not reactive derivation).
	$effect(() => {
		if (parseResult.valid) {
			untrack(() => {
				if (!loadScript(script)) return;
				if (seekToEnd) {
					timeline?.scrubByProgress(1);
					// Hide auto-instruments so the final figure shows clean
					executor.hideAutoInstruments();
					syncState();
				} else if (autoPlay) {
					timeline?.play();
				}
			});
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
			figure={currentFigure}
			instrumentStates={currentInstrumentStates}
			{animation}
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
