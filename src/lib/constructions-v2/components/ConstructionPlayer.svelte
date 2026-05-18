<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { parseDsl } from '$lib/geometry-core/dsl';
	import { DslRuntimeError } from '$lib/geometry-core/dsl/errors';
	import type { DslRuntimeErrorDetails } from '$lib/geometry-core/dsl/errors';
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

	interface RuntimeErrorInfo {
		message: string;
		line: number | null;
		stepIndex: number | null;
		details: DslRuntimeErrorDetails | null;
	}

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
		/** Notified when a runtime error occurs (or null when cleared). */
		onRuntimeError?: (err: RuntimeErrorInfo | null) => void;
		/**
		 * Allow dragging points / labels on the canvas. Disabled by default
		 * (player is in playback mode). Drag is auto-suspended while the
		 * timeline is playing, even when this is true.
		 */
		interactive?: boolean;
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
		class: className = '',
		onRuntimeError,
		interactive = false
	}: Props = $props();

	// Reactive state owned by this component
	let tl = $state<TimelineState>(createInitialTimelineState());
	let figureVersion = $state(0);
	let currentInstruction = $state<string | null>(null);
	let currentFigure = $state<Figure>(new Figure());
	let currentInstrumentStates = $state(new Map<string, InstrumentState>());
	let animatingIds = $state<string[]>([]);
	let animatingPointIds = $state<string[]>([]);
	let autoInstruments = $state(new Set<InstrumentType>());
	let instrumentMoves = $state(new Map<InstrumentType, InstrumentMove>());
	let movePhaseEnd = $state(0);
	let drawPhaseStart = $state(0);
	let drawPhaseEnd = $state(1);
	let pausePhaseStart = $state(1);
	let moveDurationMs = $state(0);
	let compassPrevRadius = $state(0);
	let compassCurRadius = $state(0);

	// Pre-compute Sets once when arrays change (not every frame)
	const EMPTY_IDS = new Set<string>();
	let animatingIdsSet = $derived(animatingIds.length > 0 ? new Set(animatingIds) : EMPTY_IDS);
	let animatingPointIdsSet = $derived(
		animatingPointIds.length > 0 ? new Set(animatingPointIds) : EMPTY_IDS
	);

	// Derived animation state — only drawProgress changes every RAF frame.
	let animation = $derived<DrawAnimationState>({
		animatingIds: tl.stepProgress < 1 ? animatingIdsSet : EMPTY_IDS,
		animatingPointIds: tl.stepProgress < 1 ? animatingPointIdsSet : EMPTY_IDS,
		drawProgress: tl.stepProgress,
		autoInstruments,
		instrumentMoves,
		movePhaseEnd,
		drawPhaseStart,
		drawPhaseEnd,
		pausePhaseStart,
		moveDurationMs,
		compassPrevRadius,
		compassCurRadius
	});

	// Plain JS objects (not reactive)
	const executor = new ConstructionExecutor();
	let timeline: Timeline | null = null;

	// Runtime errors raised during executor.load() or .step()
	let runtimeError = $state<RuntimeErrorInfo | null>(null);

	// Parse script — $derived for pure computation
	let parseResult = $derived.by(() => {
		try {
			parseDsl(script);
			return { valid: true as const, error: null };
		} catch (e) {
			return { valid: false as const, error: e instanceof Error ? e.message : String(e) };
		}
	});

	function extractLineNumber(msg: string): number | null {
		const m = msg.match(/Ligne\s+(\d+)/i);
		return m ? parseInt(m[1], 10) : null;
	}

	function setRuntimeError(err: RuntimeErrorInfo | null) {
		runtimeError = err;
		onRuntimeError?.(err);
	}

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
			animatingPointIds = executor.lastStepNewPointIds;
			autoInstruments = new Set(executor.autoInstruments);
			instrumentMoves = new Map(executor.instrumentMoves);
			movePhaseEnd = executor.movePhaseEnd;
			drawPhaseStart = executor.drawPhaseStart;
			drawPhaseEnd = executor.drawPhaseEnd;
			pausePhaseStart = executor.pausePhaseStart;
			moveDurationMs = executor.moveDurationMs;
			compassPrevRadius = executor.compassPrevRadius;
			compassCurRadius = executor.compassCurRadius;
			syncState();
			// Preserve the runtime error if it was captured at load() time
			// (the timeline only contains valid steps, so this branch always succeeds
			// even when the script as a whole is broken).
			if (!executor.loadError) {
				setRuntimeError(null);
			}
		} catch (e) {
			// Show the partial figure (everything built before the failing step).
			animatingIds = [];
			animatingPointIds = [];
			syncState();
			const message = e instanceof Error ? e.message : String(e);
			const details = e instanceof DslRuntimeError ? e.details : null;
			setRuntimeError({
				message,
				line: extractLineNumber(message),
				stepIndex,
				details
			});
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

	function handlePlayOneStep() {
		timeline?.playOneStep();
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
		} catch (e) {
			// parseDsl threw (syntactic error). The timeline cannot be built at all.
			const message = e instanceof Error ? e.message : String(e);
			const details = e instanceof DslRuntimeError ? e.details : null;
			setRuntimeError({
				message,
				line: extractLineNumber(message),
				stepIndex: null,
				details
			});
			return false;
		}
		// executor.load() succeeded structurally, but the pre-execution pass may have
		// caught a runtime error mid-way. The timeline still has the durations of all
		// the steps that DID succeed before the failure.
		const loadErr = executor.loadError;
		if (loadErr) {
			setRuntimeError({
				message: loadErr.message,
				line: loadErr.line,
				stepIndex: loadErr.stepIndex,
				details: loadErr.details
			});
		} else {
			setRuntimeError(null);
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
		<!-- Parse errors are fatal: the script is unparsable, we cannot show anything. -->
		<div
			class="flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive/70"
			style="width: {width}px; height: {height}px"
		>
			<div class="px-4 text-center">
				<p class="font-medium">Script non parsable</p>
				<p class="mt-1 text-xs opacity-80">Voir le détail sous l'éditeur.</p>
			</div>
		</div>
	{:else}
		{#if title}
			<h3 class="mb-2 text-sm font-medium">{title}</h3>
		{/if}

		<div class="relative">
			<ConstructionCanvas
				figure={currentFigure}
				instrumentStates={currentInstrumentStates}
				{animation}
				{figureVersion}
				{width}
				{height}
				{showGrid}
				interactive={interactive && !tl.isPlaying}
			/>

			{#if runtimeError}
				<!-- Subtle in-canvas badge: signals the figure is partial without hiding it. -->
				<div
					class="pointer-events-none absolute top-2 right-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive backdrop-blur-sm"
				>
					⚠ Exécution interrompue
				</div>
			{/if}
		</div>

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
					onPlayOneStep={handlePlayOneStep}
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
