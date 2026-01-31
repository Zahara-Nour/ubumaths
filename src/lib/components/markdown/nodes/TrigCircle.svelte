<!--
	TrigCircle Component
	====================

	Renders an interactive trigonometric circle with SVG.

	Features:
	- Unit circle with axes
	- Angle points with labels (MathLive)
	- Projection lines to axes
	- Arcs for equation solutions
	- Optional interactive mode (drag angle)
	- Optional cos/sin value table
	- Dark mode support via CSS variables

	@module components/markdown/nodes/TrigCircle
-->
<script lang="ts">
	import 'mathlive';
	import type { TrigCircleNode, TrigAngle, TrigArc } from '$lib/ubumark/types/trig-circle';
	import { REMARKABLE_ANGLES } from '$lib/ubumark/types/trig-circle';

	interface Props {
		node: TrigCircleNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	// =========================================================================
	// LAYOUT CONSTANTS
	// =========================================================================

	const SVG_SIZE = 320;
	const CENTER = SVG_SIZE / 2;
	const RADIUS = 120;
	const POINT_RADIUS = 4;
	const LABEL_OFFSET = 20;
	const AXIS_EXTENSION = 20;
	const TICK_SIZE = 5;
	const TABLE_WIDTH = 200;

	// =========================================================================
	// STATE
	// =========================================================================

	let hoveredAngle = $state<TrigAngle | null>(null);
	let interactiveAngle = $state<number | null>(null);
	let isDragging = $state(false);

	// =========================================================================
	// COMPUTED VALUES
	// =========================================================================

	let showTable = $derived(
		node.config.display === 'table' || node.config.display === 'circle+table'
	);
	let showCircle = $derived(
		node.config.display === 'circle' || node.config.display === 'circle+table'
	);

	let _totalWidth = $derived(
		showCircle && showTable ? SVG_SIZE + TABLE_WIDTH + 20 : showCircle ? SVG_SIZE : TABLE_WIDTH
	);

	// Get the primary color from config or default
	let primaryColor = $derived(getColorValue(node.config.color));

	// =========================================================================
	// COLOR UTILITIES
	// =========================================================================

	function getColorValue(color: string): string {
		const colorMap: Record<string, string> = {
			blue: 'var(--primary, #3b82f6)',
			red: '#ef4444',
			green: '#22c55e',
			orange: '#f97316',
			purple: '#a855f7',
			pink: '#ec4899',
			cyan: '#06b6d4',
			yellow: '#eab308'
		};
		return colorMap[color.toLowerCase()] || color;
	}

	// =========================================================================
	// COORDINATE UTILITIES
	// =========================================================================

	function angleToPoint(radians: number): { x: number; y: number } {
		return {
			x: CENTER + RADIUS * Math.cos(radians),
			y: CENTER - RADIUS * Math.sin(radians) // SVG y is inverted
		};
	}

	function pointToAngle(x: number, y: number): number {
		const dx = x - CENTER;
		const dy = CENTER - y; // SVG y is inverted
		let angle = Math.atan2(dy, dx);
		if (angle < 0) angle += 2 * Math.PI;
		return angle;
	}

	// =========================================================================
	// ARC PATH UTILITIES
	// =========================================================================

	function createArcPath(arc: TrigArc): string {
		const start = angleToPoint(arc.startAngle);
		const end = angleToPoint(arc.endAngle);

		// Determine if arc is large (> 180 degrees)
		let angleDiff = arc.endAngle - arc.startAngle;
		if (angleDiff < 0) angleDiff += 2 * Math.PI;
		const largeArc = angleDiff > Math.PI ? 1 : 0;

		// SVG arc: sweep direction is 0 for counterclockwise (which corresponds to increasing angle)
		// But SVG y is inverted, so we need sweep = 0 for mathematical counterclockwise
		const sweepFlag = 0;

		return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
	}

	// =========================================================================
	// LABEL POSITIONING
	// =========================================================================

	function getLabelPosition(radians: number): { x: number; y: number; anchor: string } {
		const point = angleToPoint(radians);
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);

		// Position label outside the circle
		const labelX = point.x + LABEL_OFFSET * cos;
		const labelY = point.y - LABEL_OFFSET * sin;

		// Determine text anchor based on position
		let anchor = 'middle';
		if (cos > 0.3) anchor = 'start';
		else if (cos < -0.3) anchor = 'end';

		return { x: labelX, y: labelY, anchor };
	}

	// =========================================================================
	// VALUE TABLE
	// =========================================================================

	function getCosValue(radians: number): string {
		// Try to find a remarkable angle match
		for (const [_key, value] of Object.entries(REMARKABLE_ANGLES)) {
			if (Math.abs(radians - value.radians) < 1e-10) {
				return value.cos;
			}
		}
		// Fallback to numeric
		const cos = Math.cos(radians);
		return Math.abs(cos) < 1e-10 ? '0' : cos.toFixed(4);
	}

	function getSinValue(radians: number): string {
		// Try to find a remarkable angle match
		for (const [_key, value] of Object.entries(REMARKABLE_ANGLES)) {
			if (Math.abs(radians - value.radians) < 1e-10) {
				return value.sin;
			}
		}
		// Fallback to numeric
		const sin = Math.sin(radians);
		return Math.abs(sin) < 1e-10 ? '0' : sin.toFixed(4);
	}

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || node.config.mode !== 'interactive') return;

		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		interactiveAngle = pointToAngle(x, y);
	}

	function handleMouseDown(event: MouseEvent) {
		if (node.config.mode !== 'interactive') return;

		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Check if click is near the circle
		const dx = x - CENTER;
		const dy = y - CENTER;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (Math.abs(distance - RADIUS) < 20) {
			isDragging = true;
			interactiveAngle = pointToAngle(x, y);
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleAngleHover(angle: TrigAngle) {
		hoveredAngle = angle;
	}

	function handleAngleLeave() {
		hoveredAngle = null;
	}

	// =========================================================================
	// RENDER DATA
	// =========================================================================

	// Angles to display (including interactive angle if present)
	let displayAngles = $derived.by(() => {
		const angles = [...node.angles];

		if (node.config.mode === 'interactive' && interactiveAngle !== null) {
			// Add interactive angle if it doesn't match an existing one
			const exists = angles.some((a) => Math.abs(a.radians - interactiveAngle!) < 0.01);
			if (!exists) {
				angles.push({
					expression: `${((interactiveAngle * 180) / Math.PI).toFixed(1)}°`,
					radians: interactiveAngle,
					latex: `${((interactiveAngle * 180) / Math.PI).toFixed(1)}^\\circ`
				});
			}
		}

		return angles;
	});

	// Arcs to display (from solution)
	let displayArcs = $derived(node.solution?.arcs || []);

	// Table angles (for the value table)
	let tableAngles = $derived.by(() => {
		if (node.config.mode === 'interactive' && interactiveAngle !== null) {
			return [
				{
					expression: `${((interactiveAngle * 180) / Math.PI).toFixed(1)}°`,
					radians: interactiveAngle,
					latex: `${((interactiveAngle * 180) / Math.PI).toFixed(1)}^\\circ`
				}
			];
		}
		return displayAngles;
	});
</script>

<div class="trig-circle-container {className}" style="--primary-color: {primaryColor}">
	{#if showCircle}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<svg
			width={SVG_SIZE}
			height={SVG_SIZE}
			viewBox="0 0 {SVG_SIZE} {SVG_SIZE}"
			class="trig-circle-svg"
			role="img"
			aria-label="Cercle trigonométrique"
			onmousemove={handleMouseMove}
			onmousedown={handleMouseDown}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
		>
			<!-- Grid (optional) -->
			{#if node.config.showGrid}
				<g class="trig-grid">
					{#each [-0.5, 0.5] as val (val)}
						<line
							x1={CENTER + val * RADIUS}
							y1={CENTER - RADIUS - AXIS_EXTENSION}
							x2={CENTER + val * RADIUS}
							y2={CENTER + RADIUS + AXIS_EXTENSION}
							class="trig-grid-line"
						/>
						<line
							x1={CENTER - RADIUS - AXIS_EXTENSION}
							y1={CENTER - val * RADIUS}
							x2={CENTER + RADIUS + AXIS_EXTENSION}
							y2={CENTER - val * RADIUS}
							class="trig-grid-line"
						/>
					{/each}
				</g>
			{/if}

			<!-- Axes -->
			{#if node.config.showAxes}
				<g class="trig-axes">
					<!-- X axis -->
					<line
						x1={CENTER - RADIUS - AXIS_EXTENSION}
						y1={CENTER}
						x2={CENTER + RADIUS + AXIS_EXTENSION}
						y2={CENTER}
						class="trig-axis"
					/>
					<!-- X axis arrow -->
					<polygon
						points="{CENTER + RADIUS + AXIS_EXTENSION},{CENTER} {CENTER +
							RADIUS +
							AXIS_EXTENSION -
							8},{CENTER - 4} {CENTER + RADIUS + AXIS_EXTENSION - 8},{CENTER + 4}"
						class="trig-axis-arrow"
					/>

					<!-- Y axis -->
					<line
						x1={CENTER}
						y1={CENTER + RADIUS + AXIS_EXTENSION}
						x2={CENTER}
						y2={CENTER - RADIUS - AXIS_EXTENSION}
						class="trig-axis"
					/>
					<!-- Y axis arrow -->
					<polygon
						points="{CENTER},{CENTER - RADIUS - AXIS_EXTENSION} {CENTER - 4},{CENTER -
							RADIUS -
							AXIS_EXTENSION +
							8} {CENTER + 4},{CENTER - RADIUS - AXIS_EXTENSION + 8}"
						class="trig-axis-arrow"
					/>

					<!-- Axis ticks -->
					{#if node.config.showAxisValues}
						{#each [-1, 1] as val (val)}
							<!-- X axis ticks -->
							<line
								x1={CENTER + val * RADIUS}
								y1={CENTER - TICK_SIZE}
								x2={CENTER + val * RADIUS}
								y2={CENTER + TICK_SIZE}
								class="trig-axis-tick"
							/>
							<text x={CENTER + val * RADIUS} y={CENTER + TICK_SIZE + 14} class="trig-axis-label">
								{val}
							</text>

							<!-- Y axis ticks -->
							<line
								x1={CENTER - TICK_SIZE}
								y1={CENTER - val * RADIUS}
								x2={CENTER + TICK_SIZE}
								y2={CENTER - val * RADIUS}
								class="trig-axis-tick"
							/>
							<text
								x={CENTER - TICK_SIZE - 8}
								y={CENTER - val * RADIUS + 4}
								class="trig-axis-label"
							>
								{val}
							</text>
						{/each}
					{/if}
				</g>
			{/if}

			<!-- Unit circle -->
			<circle cx={CENTER} cy={CENTER} r={RADIUS} class="trig-unit-circle" />

			<!-- Solution arcs (for inequations) -->
			{#if node.config.mode === 'arc' && displayArcs.length > 0}
				<g class="trig-arcs">
					{#each displayArcs as arc, i (i)}
						<path d={createArcPath(arc)} class="trig-solution-arc" />
						<!-- Endpoint markers -->
						{@const startPoint = angleToPoint(arc.startAngle)}
						{@const endPoint = angleToPoint(arc.endAngle)}
						<circle
							cx={startPoint.x}
							cy={startPoint.y}
							r={POINT_RADIUS}
							class="trig-arc-endpoint"
							class:trig-endpoint-open={!arc.includeStart}
							class:trig-endpoint-closed={arc.includeStart}
						/>
						<circle
							cx={endPoint.x}
							cy={endPoint.y}
							r={POINT_RADIUS}
							class="trig-arc-endpoint"
							class:trig-endpoint-open={!arc.includeEnd}
							class:trig-endpoint-closed={arc.includeEnd}
						/>
					{/each}
				</g>
			{/if}

			<!-- Projection lines (optional) -->
			{#if node.config.showProjections}
				<g class="trig-projections">
					{#each displayAngles as angle (angle.radians)}
						{@const point = angleToPoint(angle.radians)}
						{@const isHovered = hoveredAngle?.radians === angle.radians}
						<line
							x1={point.x}
							y1={point.y}
							x2={point.x}
							y2={CENTER}
							class="trig-projection-line"
							class:trig-projection-highlighted={isHovered}
						/>
						<line
							x1={point.x}
							y1={point.y}
							x2={CENTER}
							y2={point.y}
							class="trig-projection-line"
							class:trig-projection-highlighted={isHovered}
						/>
					{/each}
				</g>
			{/if}

			<!-- Angle points -->
			<g class="trig-points">
				{#each displayAngles as angle (angle.radians)}
					{@const point = angleToPoint(angle.radians)}
					{@const isHovered = hoveredAngle?.radians === angle.radians}
					{@const isInteractive =
						node.config.mode === 'interactive' &&
						interactiveAngle !== null &&
						Math.abs(angle.radians - interactiveAngle) < 0.01}

					<!-- Radius line (from center to point) -->
					<line
						x1={CENTER}
						y1={CENTER}
						x2={point.x}
						y2={point.y}
						class="trig-radius-line"
						class:trig-radius-highlighted={isHovered || isInteractive}
					/>

					<!-- Point on circle -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						cx={point.x}
						cy={point.y}
						r={POINT_RADIUS}
						class="trig-angle-point"
						class:trig-point-highlighted={isHovered || isInteractive}
						onmouseenter={() => handleAngleHover(angle)}
						onmouseleave={handleAngleLeave}
					/>
				{/each}
			</g>

			<!-- Angle labels -->
			{#if node.config.showLabels}
				<g class="trig-labels">
					{#each displayAngles as angle (angle.radians)}
						{@const pos = getLabelPosition(angle.radians)}
						{@const isHovered = hoveredAngle?.radians === angle.radians}
						<foreignObject x={pos.x - 30} y={pos.y - 12} width="60" height="24">
							<div
								class="trig-label"
								class:trig-label-highlighted={isHovered}
								style="text-align: {pos.anchor === 'start'
									? 'left'
									: pos.anchor === 'end'
										? 'right'
										: 'center'}"
							>
								<math-span>{angle.latex || angle.expression}</math-span>
							</div>
						</foreignObject>
					{/each}
				</g>
			{/if}

			<!-- Interactive hint -->
			{#if node.config.mode === 'interactive'}
				<text x={CENTER} y={SVG_SIZE - 10} class="trig-interactive-hint">
					Cliquez et glissez sur le cercle
				</text>
			{/if}
		</svg>
	{/if}

	<!-- Value table -->
	{#if showTable}
		<div class="trig-table-container">
			<table class="trig-table">
				<thead>
					<tr>
						<th><math-span>\theta</math-span></th>
						<th><math-span>\cos\theta</math-span></th>
						<th><math-span>\sin\theta</math-span></th>
					</tr>
				</thead>
				<tbody>
					{#each tableAngles as angle (angle.radians)}
						{@const isHovered = hoveredAngle?.radians === angle.radians}
						<tr
							class:trig-row-highlighted={isHovered}
							onmouseenter={() => handleAngleHover(angle)}
							onmouseleave={handleAngleLeave}
						>
							<td><math-span>{angle.latex || angle.expression}</math-span></td>
							<td><math-span>{getCosValue(angle.radians)}</math-span></td>
							<td><math-span>{getSinValue(angle.radians)}</math-span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	/* Container */
	.trig-circle-container {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 1rem 0;
		font-size: inherit;
	}

	/* SVG */
	.trig-circle-svg {
		display: block;
		cursor: default;
	}

	/* Grid */
	.trig-grid-line {
		stroke: var(--muted, #e5e7eb);
		stroke-width: 0.5;
		stroke-dasharray: 2 2;
	}

	/* Axes */
	.trig-axis {
		stroke: var(--foreground, #1f2937);
		stroke-width: 1;
	}

	.trig-axis-arrow {
		fill: var(--foreground, #1f2937);
	}

	.trig-axis-tick {
		stroke: var(--foreground, #1f2937);
		stroke-width: 1;
	}

	.trig-axis-label {
		font-size: 0.75rem;
		fill: var(--muted-foreground, #6b7280);
		text-anchor: middle;
	}

	/* Unit circle */
	.trig-unit-circle {
		fill: none;
		stroke: var(--foreground, #1f2937);
		stroke-width: 1.5;
	}

	/* Solution arcs */
	.trig-solution-arc {
		fill: none;
		stroke: var(--primary-color);
		stroke-width: 4;
		stroke-linecap: round;
		opacity: 0.7;
	}

	.trig-arc-endpoint {
		stroke-width: 2;
	}

	.trig-endpoint-open {
		fill: var(--background, white);
		stroke: var(--primary-color);
	}

	.trig-endpoint-closed {
		fill: var(--primary-color);
		stroke: var(--primary-color);
	}

	/* Projection lines */
	.trig-projection-line {
		stroke: var(--muted-foreground, #9ca3af);
		stroke-width: 1;
		stroke-dasharray: 4 2;
		opacity: 0.5;
		transition: opacity 0.2s ease;
	}

	.trig-projection-highlighted {
		stroke: var(--primary-color);
		opacity: 1;
	}

	/* Radius line */
	.trig-radius-line {
		stroke: var(--muted-foreground, #9ca3af);
		stroke-width: 1;
		opacity: 0.3;
		transition:
			opacity 0.2s ease,
			stroke 0.2s ease;
	}

	.trig-radius-highlighted {
		stroke: var(--primary-color);
		opacity: 1;
	}

	/* Angle points */
	.trig-angle-point {
		fill: var(--primary-color);
		stroke: var(--background, white);
		stroke-width: 2;
		cursor: pointer;
		transition: r 0.2s ease;
	}

	.trig-angle-point:hover,
	.trig-point-highlighted {
		r: 6;
	}

	/* Labels */
	.trig-label {
		font-size: 0.8rem;
		color: var(--foreground, #1f2937);
		transition: color 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.trig-label-highlighted {
		color: var(--primary-color);
		font-weight: 500;
	}

	/* Interactive hint */
	.trig-interactive-hint {
		font-size: 0.7rem;
		fill: var(--muted-foreground, #9ca3af);
		text-anchor: middle;
	}

	/* Table */
	.trig-table-container {
		overflow-x: auto;
	}

	.trig-table {
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.trig-table th,
	.trig-table td {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border, #e5e7eb);
		text-align: center;
	}

	.trig-table th {
		background: var(--muted, #f3f4f6);
		font-weight: 500;
	}

	.trig-table tbody tr {
		transition: background-color 0.2s ease;
	}

	.trig-table tbody tr:hover,
	.trig-row-highlighted {
		background: var(--accent, #f3f4f6);
	}

	/* Math elements */
	.trig-circle-container :global(math-span) {
		font-size: inherit;
	}

	/* Dark mode */
	:global(.dark) .trig-circle-container {
		--primary-color: var(--primary, #60a5fa);
	}

	:global(.dark) .trig-grid-line {
		stroke: var(--muted, #374151);
	}

	:global(.dark) .trig-axis,
	:global(.dark) .trig-axis-arrow,
	:global(.dark) .trig-unit-circle {
		stroke: var(--foreground, #f3f4f6);
	}

	:global(.dark) .trig-axis-arrow {
		fill: var(--foreground, #f3f4f6);
	}

	:global(.dark) .trig-endpoint-open {
		fill: var(--background, #1f2937);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.trig-circle-container {
			flex-direction: column;
			align-items: center;
		}

		.trig-table {
			font-size: 0.8rem;
		}
	}
</style>
