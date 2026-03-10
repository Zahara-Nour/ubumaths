<!--
	NumberLineInput Component
	=========================

	Interactive number line for student input.

	Modes:
	- read-value: Student types a value in a MathLive field for hidden labels or points
	- place-point: Student drags a point to place it on the line (with snap to graduations)

	The response is serialized as a numeric string (e.g., "2.5") for validation.

	@module components/question-inputs/NumberLineInput
-->
<script lang="ts">
	import 'mathlive';
	import type { NumberLineValue } from '$lib/ubumark/types/number-line';
	import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';
	import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';

	interface Props {
		/** The number line configuration block (raw text lines) */
		configBlock: string;
		/** Fixed points string (parsed from config) */
		fixedPoints?: string;
		/** Fixed segments string (parsed from config) */
		fixedSegments?: string;
		/** Interaction mode */
		task: 'read-value' | 'place-point';
		/** Snap to graduations */
		snap: boolean;
		/** Current value (bindable) */
		value: string;
		/** Whether input is disabled */
		disabled?: boolean;
		/** Validation state */
		isCorrect?: boolean | null;
		/** Callback on value change */
		onchange?: (value: string) => void;
	}

	let {
		configBlock,
		fixedPoints,
		fixedSegments,
		task,
		snap,
		value = $bindable(''),
		disabled = false,
		isCorrect = null,
		onchange
	}: Props = $props();

	// =========================================================================
	// PARSE CONFIG
	// =========================================================================

	let parsedNode = $derived.by(() => {
		const lines = configBlock.split('\n');
		// Add fixed points/segments if provided
		const allLines = [...lines];
		if (fixedPoints) allLines.push(`points: ${fixedPoints}`);
		if (fixedSegments) allLines.push(`segments: ${fixedSegments}`);
		const result = parseNumberLineContent(allLines);
		return result.node;
	});

	// =========================================================================
	// LAYOUT
	// =========================================================================

	const MARGIN_LEFT = 40;
	const MARGIN_RIGHT = 40;
	const SVG_WIDTH = 600;
	const SVG_HEIGHT = 140;
	const LINE_Y = 50;
	const MINOR_TICK_HEIGHT = 6;
	const MAJOR_TICK_HEIGHT = 12;
	const LABEL_Y_OFFSET = 20;
	const POINT_RADIUS = 6;
	const POINT_Y_OFFSET = -18;
	const ARROW_SIZE = 8;
	const LINE_WIDTH = SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

	// =========================================================================
	// VALUE HELPERS
	// =========================================================================

	function numVal(v: NumberLineValue): number {
		return evaluateNodeToApproximatedNumber(v.ast);
	}

	function valLatex(v: NumberLineValue): string {
		return toLatex(v.ast);
	}

	// =========================================================================
	// COORDINATE MAPPING
	// =========================================================================

	function valueToX(val: number, startN: number, endN: number): number {
		return MARGIN_LEFT + ((val - startN) / (endN - startN)) * LINE_WIDTH;
	}

	function xToValue(x: number, startN: number, endN: number): number {
		return startN + ((x - MARGIN_LEFT) / LINE_WIDTH) * (endN - startN);
	}

	function snapToStep(val: number, startN: number, stepN: number): number {
		const steps = Math.round((val - startN) / stepN);
		return startN + steps * stepN;
	}

	// =========================================================================
	// PLACE-POINT INTERACTION
	// =========================================================================

	let isDragging = $state(false);
	let dragValue = $state<number | null>(null);
	let svgEl: SVGSVGElement | undefined = $state();

	// placedValue: from drag interaction, or from existing value prop
	let placedValue = $derived(
		dragValue !== null ? dragValue : value && !isNaN(parseFloat(value)) ? parseFloat(value) : null
	);

	function handlePointerDown(e: PointerEvent) {
		if (disabled || task !== 'place-point' || !parsedNode) return;
		isDragging = true;
		updatePlacedPoint(e);
		(e.target as SVGSVGElement).setPointerCapture?.(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || !parsedNode) return;
		updatePlacedPoint(e);
	}

	function handlePointerUp() {
		isDragging = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled || task !== 'place-point' || !parsedNode) return;

		const startN = numVal(parsedNode.config.start);
		const endN = numVal(parsedNode.config.end);
		const stepN = numVal(parsedNode.config.step);
		const current = placedValue ?? startN;

		let newVal: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			newVal = Math.min(endN, current + stepN);
			e.preventDefault();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			newVal = Math.max(startN, current - stepN);
			e.preventDefault();
		} else if (e.key === 'Home') {
			newVal = startN;
			e.preventDefault();
		} else if (e.key === 'End') {
			newVal = endN;
			e.preventDefault();
		}

		if (newVal !== null) {
			if (snap) {
				newVal = snapToStep(newVal, startN, stepN);
				newVal = Math.max(startN, Math.min(endN, newVal));
			}
			dragValue = newVal;
			const newValueStr = cleanNumericString(newVal);
			if (newValueStr !== value) {
				value = newValueStr;
				onchange?.(value);
			}
		}
	}

	function updatePlacedPoint(e: PointerEvent) {
		if (!svgEl || !parsedNode) return;

		const rect = svgEl.getBoundingClientRect();
		const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;

		const startN = numVal(parsedNode.config.start);
		const endN = numVal(parsedNode.config.end);
		const stepN = numVal(parsedNode.config.step);

		let val = xToValue(svgX, startN, endN);

		// Clamp to bounds
		val = Math.max(startN, Math.min(endN, val));

		// Snap
		if (snap) {
			val = snapToStep(val, startN, stepN);
			val = Math.max(startN, Math.min(endN, val));
		}

		dragValue = val;

		// Serialize to string
		const newValue = cleanNumericString(val);
		if (newValue !== value) {
			value = newValue;
			onchange?.(value);
		}
	}

	function cleanNumericString(val: number): string {
		// Round to avoid floating point artifacts
		const rounded = Math.round(val * 1e10) / 1e10;
		return String(rounded);
	}

	// =========================================================================
	// READ-VALUE MODE
	// =========================================================================

	function handleMathInput(e: Event) {
		const target = e.target as HTMLElement & { value: string };
		const newValue = target.value?.trim() ?? '';
		if (newValue !== value) {
			value = newValue;
			onchange?.(value);
		}
	}

	// =========================================================================
	// GRADUATIONS (same logic as static NumberLine)
	// =========================================================================

	interface Graduation {
		x: number;
		value: number;
		isMajor: boolean;
		label: string | null;
		hidden: boolean;
	}

	let graduations = $derived.by(() => {
		if (!parsedNode) return [];

		const grads: Graduation[] = [];
		const config = parsedNode.config;
		const startN = numVal(config.start);
		const endN = numVal(config.end);
		const stepN = numVal(config.step);
		const major = config.major;
		const hasExplicitLabels = config.labels.length > 0;
		const tolerance = stepN * 0.001;

		let tickIndex = 0;
		for (let val = startN; val <= endN + tolerance; val += stepN) {
			const isMajor = tickIndex % major === 0;
			const x = valueToX(val, startN, endN);

			let label: string | null = null;
			let hidden = false;

			if (hasExplicitLabels) {
				const matchingLabel = config.labels.find((lv) => Math.abs(numVal(lv) - val) < tolerance);
				if (matchingLabel) {
					const isHidden = config.hidden.some(
						(h) => compareNumericNodes(h.ast, matchingLabel.ast) === 0
					);
					hidden = isHidden;
					label = hidden ? '?' : valLatex(matchingLabel);
				}
			} else if (isMajor) {
				label = formatAutoLabel(val);
				const matchingHidden = config.hidden.find((hv) => Math.abs(numVal(hv) - val) < tolerance);
				if (matchingHidden) {
					hidden = true;
					label = '?';
				}
			}

			grads.push({ x, value: val, isMajor, label, hidden });
			tickIndex++;
		}

		return grads;
	});

	function formatAutoLabel(val: number): string {
		if (Math.abs(val - Math.round(val)) < 1e-9) {
			return String(Math.round(val));
		}
		for (const denom of [2, 3, 4, 5, 6, 8, 10]) {
			const numer = val * denom;
			if (Math.abs(numer - Math.round(numer)) < 1e-9) {
				return `\\frac{${Math.round(numer)}}{${denom}}`;
			}
		}
		return val.toFixed(2).replace(/\.?0+$/, '');
	}

	// =========================================================================
	// FIXED POINTS
	// =========================================================================

	let renderedFixedPoints = $derived.by(() => {
		if (!parsedNode) return [];
		const startN = numVal(parsedNode.config.start);
		const endN = numVal(parsedNode.config.end);

		return parsedNode.points.map((p) => ({
			x: valueToX(numVal(p.value), startN, endN),
			y: LINE_Y + POINT_Y_OFFSET,
			label: p.label,
			color: p.color || 'var(--number-line-point, #e74c3c)'
		}));
	});

	// =========================================================================
	// BORDER COLOR FOR FEEDBACK
	// =========================================================================

	let feedbackColor = $derived(
		isCorrect === true ? '#22c55e' : isCorrect === false ? '#ef4444' : '#3498db'
	);
</script>

{#if parsedNode}
	{@const startN = numVal(parsedNode.config.start)}
	{@const endN = numVal(parsedNode.config.end)}
	{@const lineStartX = MARGIN_LEFT - (parsedNode.config.arrows ? ARROW_SIZE + 2 : 0)}
	{@const lineEndX = MARGIN_LEFT + LINE_WIDTH + (parsedNode.config.arrows ? ARROW_SIZE + 2 : 0)}

	<div class="number-line-input" class:disabled>
		<svg
			bind:this={svgEl}
			viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}"
			width="100%"
			preserveAspectRatio="xMidYMid meet"
			class="number-line-svg"
			class:interactive={task === 'place-point' && !disabled}
			role={task === 'place-point' ? 'slider' : 'img'}
			aria-label="Droite graduée interactive"
			aria-valuemin={parsedNode ? numVal(parsedNode.config.start) : undefined}
			aria-valuemax={parsedNode ? numVal(parsedNode.config.end) : undefined}
			aria-valuenow={placedValue ?? undefined}
			onpointerdown={task === 'place-point' ? handlePointerDown : undefined}
			onpointermove={task === 'place-point' ? handlePointerMove : undefined}
			onpointerup={task === 'place-point' ? handlePointerUp : undefined}
			onpointercancel={task === 'place-point' ? handlePointerUp : undefined}
			onkeydown={task === 'place-point' ? handleKeyDown : undefined}
			tabindex={task === 'place-point' && !disabled ? 0 : undefined}
		>
			<!-- Main line -->
			<line
				x1={lineStartX}
				y1={LINE_Y}
				x2={lineEndX}
				y2={LINE_Y}
				stroke="currentColor"
				stroke-width="1.5"
			/>

			<!-- Arrows -->
			{#if parsedNode.config.arrows}
				<path
					d="M {lineStartX} {LINE_Y} L {lineStartX + ARROW_SIZE} {LINE_Y -
						ARROW_SIZE / 2} L {lineStartX + ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
					fill="currentColor"
				/>
				<path
					d="M {lineEndX} {LINE_Y} L {lineEndX - ARROW_SIZE} {LINE_Y - ARROW_SIZE / 2} L {lineEndX -
						ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
					fill="currentColor"
				/>
			{/if}

			<!-- Graduations -->
			{#each graduations as grad (grad.x)}
				{@const tickH = grad.isMajor ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT}
				<line
					x1={grad.x}
					y1={LINE_Y - tickH / 2}
					x2={grad.x}
					y2={LINE_Y + tickH / 2}
					stroke="currentColor"
					stroke-width={grad.isMajor ? 1.5 : 1}
				/>
				{#if grad.label !== null}
					<foreignObject x={grad.x - 30} y={LINE_Y + LABEL_Y_OFFSET - 5} width="60" height="30">
						<div class="grad-label" class:hidden-label={grad.hidden}>
							{#if grad.hidden}
								<span class="hidden-mark">?</span>
							{:else}
								<math-field
									read-only
									style="font-size: 0.75rem; display: inline-block; border: none; background: transparent; min-width: 0; padding: 0;"
								>
									{grad.label}
								</math-field>
							{/if}
						</div>
					</foreignObject>
				{/if}
			{/each}

			<!-- Fixed points -->
			{#each renderedFixedPoints as point (point.label)}
				<circle
					cx={point.x}
					cy={point.y}
					r={POINT_RADIUS - 1}
					fill={point.color}
					stroke="var(--number-line-bg, white)"
					stroke-width="1.5"
				/>
				<foreignObject x={point.x - 20} y={point.y - 22} width="40" height="18">
					<div class="point-label" style="color: {point.color}">{point.label}</div>
				</foreignObject>
			{/each}

			<!-- Placed point (place-point mode) -->
			{#if task === 'place-point' && placedValue !== null}
				{@const px = valueToX(placedValue, startN, endN)}
				<circle
					cx={px}
					cy={LINE_Y + POINT_Y_OFFSET}
					r={POINT_RADIUS}
					fill={feedbackColor}
					stroke="var(--number-line-bg, white)"
					stroke-width="2"
					class="placed-point"
				/>
				<foreignObject x={px - 25} y={LINE_Y + POINT_Y_OFFSET - 25} width="50" height="20">
					<div class="placed-label" style="color: {feedbackColor}">
						{cleanNumericString(placedValue)}
					</div>
				</foreignObject>
			{/if}
		</svg>

		<!-- Read-value input field -->
		{#if task === 'read-value'}
			<div class="read-value-input">
				<math-field
					{disabled}
					style="font-size: 1rem; max-width: 120px; border: 2px solid {feedbackColor}; border-radius: 4px; padding: 2px 6px;"
					oninput={handleMathInput}
					{value}
				></math-field>
			</div>
		{/if}
	</div>
{:else}
	<p class="text-sm text-muted-foreground">Erreur de configuration de la droite graduée</p>
{/if}

<style>
	.number-line-input {
		width: 100%;
		max-width: 700px;
		margin: 0.5rem auto;
	}

	.number-line-svg {
		overflow: visible;
		user-select: none;
	}

	.number-line-svg.interactive {
		cursor: crosshair;
	}

	.disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.grad-label {
		text-align: center;
		font-size: 0.75rem;
		line-height: 1;
	}

	.hidden-mark {
		font-weight: bold;
		color: var(--number-line-hidden, #e74c3c);
		font-size: 0.85rem;
	}

	.point-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.75rem;
		line-height: 1;
	}

	.placed-point {
		transition: cx 0.05s ease-out;
	}

	.placed-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.75rem;
		line-height: 1;
	}

	.read-value-input {
		display: flex;
		justify-content: center;
		margin-top: 0.5rem;
	}

	/* Dark mode */
	:global(.dark) .number-line-input {
		--number-line-bg: hsl(var(--background));
		--number-line-point: #e74c3c;
		--number-line-hidden: #e74c3c;
	}
</style>
