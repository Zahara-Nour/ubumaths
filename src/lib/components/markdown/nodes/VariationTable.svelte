<!--
	VariationTable Component
	========================

	Renders a sign/variation table used in mathematical analysis.
	Displays:
	- Variable header row with domain points
	- Sign rows showing +/- values with markers (zero, asymptote, etc.)
	- Variation rows showing function values with arrows indicating increase/decrease

	Features:
	- Responsive sizing using em/rem units
	- SVG arrows for variations (ascending/descending)
	- Double bars for asymptotes (||)
	- Diagonal hatches for forbidden zones (|h|)
	- MathLive rendering for mathematical expressions
	- Dark mode support via CSS variables

	@module components/markdown/nodes/VariationTable
-->
<script lang="ts">
	import 'mathlive';
	import type {
		VariationTableNode,
		SignRow,
		VariationRow,
		SignValue,
		VariationValue,
		DomainPoint,
		VariationMarker
	} from '$lib/ubumark/types/variation-table';

	interface Props {
		node: VariationTableNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	/**
	 * Convert expression to proper LaTeX for MathLive rendering
	 * Handles infinity symbols and other common patterns
	 */
	function toLatex(expr: string): string {
		return expr
			.replace(/\+inf/g, '+\\infty')
			.replace(/-inf/g, '-\\infty')
			.replace(/^inf$/g, '\\infty');
	}

	// Separate sign rows from variation rows
	let signRows = $derived(node.rows.filter((row): row is SignRow => row.type === 'sign'));
	let variationRows = $derived(
		node.rows.filter((row): row is VariationRow => row.type === 'variation')
	);

	/**
	 * Generate interval key for sign row lookups
	 * Intervals are stored as "point1,point2" in the Map
	 */
	function getIntervalKey(point1: DomainPoint, point2: DomainPoint): string {
		return `${point1.expression},${point2.expression}`;
	}

	/**
	 * Get sign value for a specific point or interval
	 */
	function getSignValue(row: SignRow, key: string): SignValue | undefined {
		return row.values.get(key);
	}

	/**
	 * Get variation value at a specific domain point
	 */
	function getVariationValue(row: VariationRow, point: DomainPoint): VariationValue | undefined {
		return row.values.get(point.expression);
	}

	/**
	 * Get the order (vertical position) for a value or limit expression
	 * +inf = top (3), -inf = bottom (1), other = center (2)
	 */
	function getExpressionOrder(expr: string): number {
		if (expr.includes('+inf') || expr === 'inf') return 3;
		if (expr.includes('-inf')) return 1;
		return 2;
	}

	/**
	 * Determine arrow direction between two variation values
	 * Returns 'up' for ascending, 'down' for descending, or null if undetermined
	 */
	function getArrowDirection(
		row: VariationRow,
		fromPoint: DomainPoint,
		toPoint: DomainPoint
	): 'up' | 'down' | null {
		const fromValue = getVariationValue(row, fromPoint);
		const toValue = getVariationValue(row, toPoint);

		if (!fromValue || !toValue) return null;

		// Position order: top > center > bottom
		const positionOrder: Record<string, number> = {
			top: 3,
			'limit-top': 3,
			center: 2,
			bottom: 1,
			'limit-bottom': 1
		};

		// Determine the "from" order
		let fromOrder: number;
		if (fromValue.marker === 'asymptote' && fromValue.limits) {
			// Leaving an asymptote: use the RIGHT limit (limits[1])
			fromOrder = getExpressionOrder(fromValue.limits[1]);
		} else {
			fromOrder = positionOrder[fromValue.position];
		}

		// Determine the "to" order
		let toOrder: number;
		if (toValue.marker === 'asymptote' && toValue.limits) {
			// Approaching an asymptote: use the LEFT limit (limits[0])
			toOrder = getExpressionOrder(toValue.limits[0]);
		} else {
			toOrder = positionOrder[toValue.position];
		}

		if (toOrder > fromOrder) return 'up';
		if (toOrder < fromOrder) return 'down';
		return null; // Same level - no arrow
	}

	/**
	 * Check if a marker indicates a forbidden zone (no arrow should be drawn)
	 * Asymptotes with limits still allow arrows - only pure forbidden zones block arrows
	 */
	function isForbiddenZone(value: VariationValue | undefined): boolean {
		if (!value) return false;
		if (value.marker === 'forbidden') return true;
		// Asymptote without limits is a forbidden zone
		if (value.marker === 'asymptote' && !value.limits) return true;
		return false;
	}

	/**
	 * Get CSS class for marker rendering
	 */
	function getMarkerClass(marker: VariationMarker): string {
		switch (marker) {
			case 'zero':
				return 'vt-marker-zero';
			case 'asymptote':
				return 'vt-marker-asymptote';
			case 'forbidden':
				return 'vt-marker-forbidden';
			case 'discontinuity':
				return 'vt-marker-discontinuity';
			default:
				return '';
		}
	}

	/**
	 * Get CSS class for variation value position
	 */
	function getPositionClass(position: string): string {
		switch (position) {
			case 'top':
			case 'limit-top':
				return 'vt-pos-top';
			case 'bottom':
			case 'limit-bottom':
				return 'vt-pos-bottom';
			case 'center':
			default:
				return 'vt-pos-center';
		}
	}

	/**
	 * Render sign point cell content
	 */
	function renderSignPointValue(row: SignRow, point: DomainPoint): SignValue | undefined {
		return getSignValue(row, point.expression);
	}

	/**
	 * Get data for interval cell
	 */
	function getIntervalData(row: SignRow, point: DomainPoint, idx: number) {
		if (idx >= node.domain.length - 1) return null;
		const nextPoint = node.domain[idx + 1];
		const intervalKey = getIntervalKey(point, nextPoint);
		const intervalValue = getSignValue(row, intervalKey);
		return { nextPoint, intervalKey, intervalValue };
	}

	/**
	 * Get data for arrow cell
	 */
	function getArrowData(row: VariationRow, point: DomainPoint, idx: number) {
		if (idx >= node.domain.length - 1) return null;
		const nextPoint = node.domain[idx + 1];
		const currentValue = getVariationValue(row, point);
		const nextValue = getVariationValue(row, nextPoint);
		const arrowDir = getArrowDirection(row, point, nextPoint);
		return { nextPoint, currentValue, nextValue, arrowDir };
	}
</script>

<div class="variation-table {className}">
	<table class="vt-grid" role="table" aria-label="Tableau de variations de {node.variable}">
		<caption class="sr-only">Tableau de variations de la fonction {node.variable}</caption>
		<!-- Header row with variable and domain points -->
		<thead class="vt-header">
			<tr>
				<!-- Variable column -->
				<th class="vt-variable-cell">
					<math-span>{node.variable}</math-span>
				</th>
				<!-- Domain points - each point gets its own column -->
				{#each node.domain as point, idx (idx)}
					<th class="vt-domain-cell">
						<span class="vt-domain-point" class:vt-open={point.open}>
							<math-span>{toLatex(point.expression)}</math-span>
						</span>
					</th>
					<!-- Interval columns between domain points -->
					{#if idx < node.domain.length - 1}
						<th class="vt-interval-header"></th>
					{/if}
				{/each}
			</tr>
		</thead>

		<tbody>
			<!-- Sign rows -->
			{#each signRows as row, rowIdx (`sign-${rowIdx}`)}
				<tr class="vt-sign-row">
					<!-- Label column -->
					<td class="vt-label-cell">
						<math-span>{row.label}</math-span>
					</td>
					<!-- Value cells - alternating between point and interval -->
					{#each node.domain as point, idx (idx)}
						{@const pointValue = renderSignPointValue(row, point)}
						{@const intervalData = getIntervalData(row, point, idx)}
						<!-- Point cell (for markers like zero, asymptote) -->
						<td class="vt-sign-point-cell">
							{#if pointValue}
								{#if pointValue.type === 'marker'}
									<span class="vt-sign-marker {getMarkerClass(pointValue.marker)}">
										{#if pointValue.marker === 'zero'}
											<span class="vt-zero">0</span>
										{:else if pointValue.marker === 'asymptote'}
											<span class="vt-asymptote-bar vt-asymptote-bar-sign"></span>
										{:else if pointValue.marker === 'forbidden'}
											<span class="vt-hatch"></span>
										{:else if pointValue.marker === 'discontinuity'}
											<span class="vt-discontinuity">d</span>
										{/if}
									</span>
								{:else}
									<span class="vt-sign-value vt-sign-{pointValue.value === '+' ? 'plus' : 'minus'}">
										{pointValue.value}
									</span>
								{/if}
							{/if}
						</td>
						<!-- Interval cell (for signs between points) -->
						{#if intervalData}
							<td class="vt-sign-interval-cell">
								{#if intervalData.intervalValue}
									{#if intervalData.intervalValue.type === 'sign'}
										<span
											class="vt-sign-value vt-sign-{intervalData.intervalValue.value === '+'
												? 'plus'
												: 'minus'}"
										>
											{intervalData.intervalValue.value}
										</span>
									{:else if intervalData.intervalValue.type === 'marker'}
										{#if intervalData.intervalValue.marker === 'forbidden'}
											<span class="vt-hatch vt-hatch-wide"></span>
										{/if}
									{/if}
								{/if}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}

			<!-- Variation rows -->
			{#each variationRows as row, rowIdx (`var-${rowIdx}`)}
				<tr class="vt-variation-row">
					<!-- Label column -->
					<td class="vt-label-cell">
						<math-span>{row.label}</math-span>
					</td>
					<!-- Value cells with arrows -->
					{#each node.domain as point, idx (idx)}
						{@const value = getVariationValue(row, point)}
						{@const arrowData = getArrowData(row, point, idx)}
						<!-- Value cell at domain point -->
						<td class="vt-variation-value-cell">
							{#if value}
								{#if value.marker === 'asymptote' && value.limits}
									<!-- Asymptote with limits -->
									<div class="vt-asymptote-limits">
										<span class="vt-limit vt-limit-left {getPositionClass('top')}">
											<math-span>{toLatex(value.limits[0])}</math-span>
										</span>
										<span class="vt-asymptote-bar"></span>
										<span class="vt-limit vt-limit-right {getPositionClass('bottom')}">
											<math-span>{toLatex(value.limits[1])}</math-span>
										</span>
									</div>
								{:else if value.marker === 'forbidden'}
									<div class="vt-forbidden-cell">
										<span class="vt-hatch vt-hatch-tall"></span>
									</div>
								{:else}
									<div class="vt-value-container {getPositionClass(value.position)}">
										<math-span>{toLatex(value.expression)}</math-span>
									</div>
								{/if}
							{/if}
						</td>
						<!-- Arrow cell between points -->
						{#if arrowData}
							<td class="vt-arrow-cell">
								{#if !isForbiddenZone(arrowData.currentValue) && !isForbiddenZone(arrowData.nextValue) && arrowData.arrowDir}
									<svg
										class="vt-arrow vt-arrow-{arrowData.arrowDir}"
										viewBox="0 0 100 60"
										preserveAspectRatio="xMidYMid meet"
										role="img"
										aria-label={arrowData.arrowDir === 'up'
											? 'Fonction croissante'
											: 'Fonction décroissante'}
									>
										<defs>
											<marker
												id="vt-arrowhead-{arrowData.arrowDir}"
												viewBox="0 0 10 10"
												refX="10"
												refY="5"
												markerWidth="8"
												markerHeight="8"
												orient="auto"
											>
												<path d="M 0 0 L 10 5 L 0 10 z" class="vt-arrow-head" />
											</marker>
										</defs>
										{#if arrowData.arrowDir === 'up'}
											<!-- Ascending arrow (bottom-left to top-right) -->
											<line
												x1="5"
												y1="55"
												x2="95"
												y2="5"
												class="vt-arrow-line"
												marker-end="url(#vt-arrowhead-up)"
											/>
										{:else if arrowData.arrowDir === 'down'}
											<!-- Descending arrow (top-left to bottom-right) -->
											<line
												x1="5"
												y1="5"
												x2="95"
												y2="55"
												class="vt-arrow-line"
												marker-end="url(#vt-arrowhead-down)"
											/>
										{/if}
									</svg>
								{:else if isForbiddenZone(arrowData.currentValue) || isForbiddenZone(arrowData.nextValue)}
									<!-- No arrow for forbidden zones -->
									<span class="vt-hatch vt-hatch-arrow"></span>
								{/if}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	/* Screen reader only - visually hidden but accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* CSS Variables for customization */
	.variation-table {
		--vt-border-color: var(--border, #e5e7eb);
		--vt-header-bg: var(--muted, #f3f4f6);
		--vt-text-color: var(--foreground, #1f2937);
		--vt-plus-color: #16a34a;
		--vt-minus-color: #dc2626;
		--vt-arrow-color: var(--foreground, #1f2937);
		--vt-hatch-color: var(--muted-foreground, #6b7280);
		--vt-cell-padding: 0.5em;
		--vt-row-height: 3em;
		--vt-variation-row-height: 4em;
	}

	/* Main container */
	.variation-table {
		margin: 1rem 0;
		overflow-x: auto;
		font-size: inherit;
	}

	/* Table grid */
	.vt-grid {
		border-collapse: collapse;
		border: 1px solid var(--vt-border-color);
		width: auto;
		min-width: 100%;
	}

	/* Header row */
	.vt-header {
		background-color: var(--vt-header-bg);
	}

	.vt-header th {
		border: 1px solid var(--vt-border-color);
		padding: var(--vt-cell-padding);
		text-align: center;
		font-weight: normal;
		white-space: nowrap;
	}

	/* Variable cell (first column header) */
	.vt-variable-cell {
		min-width: 3em;
	}

	/* Domain point cells */
	.vt-domain-cell {
		min-width: 3em;
	}

	.vt-domain-point {
		display: inline-block;
	}

	.vt-domain-point.vt-open {
		/* Visual indicator for open bounds - could add parentheses styling */
		opacity: 0.85;
	}

	/* Interval header (empty, just for spacing) */
	.vt-interval-header {
		min-width: 3em;
		border-left: none !important;
		border-right: none !important;
	}

	/* Body rows */
	.vt-sign-row td,
	.vt-variation-row td {
		border: 1px solid var(--vt-border-color);
		padding: var(--vt-cell-padding);
		text-align: center;
		vertical-align: middle;
	}

	/* Label cell (first column) */
	.vt-label-cell {
		background-color: var(--vt-header-bg);
		font-weight: normal;
		white-space: nowrap;
		min-width: 4em;
	}

	/* Sign row styling */
	.vt-sign-row {
		height: var(--vt-row-height);
	}

	.vt-sign-point-cell {
		min-width: 2em;
	}

	.vt-sign-interval-cell {
		min-width: 3em;
		border-left: none !important;
		border-right: none !important;
	}

	/* Sign values */
	.vt-sign-value {
		font-weight: bold;
		font-size: 1.2em;
	}

	.vt-sign-plus,
	.vt-sign-minus {
		color: inherit;
	}

	/* Zero marker */
	.vt-zero {
		font-weight: normal;
	}

	/* Discontinuity marker */
	.vt-discontinuity {
		font-style: italic;
		font-weight: bold;
	}

	/* Hatched pattern for forbidden zones */
	.vt-hatch {
		display: inline-block;
		width: 1.5em;
		height: 1.5em;
		background: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 2px,
			var(--vt-hatch-color) 2px,
			var(--vt-hatch-color) 4px
		);
	}

	.vt-hatch-wide {
		width: 100%;
		min-width: 2em;
		height: 1em;
	}

	.vt-hatch-tall {
		width: 1.5em;
		height: 100%;
		min-height: 2em;
	}

	.vt-hatch-arrow {
		width: 100%;
		height: 100%;
		min-height: 2em;
	}

	/* Variation row styling */
	.vt-variation-row {
		height: var(--vt-variation-row-height);
	}

	.vt-variation-value-cell {
		min-width: 3em;
		position: relative;
	}

	/* Value container with position */
	.vt-value-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 3em;
	}

	.vt-pos-top {
		align-items: flex-start;
		padding-top: 0.25em;
	}

	.vt-pos-bottom {
		align-items: flex-end;
		padding-bottom: 0.25em;
	}

	.vt-pos-center {
		align-items: center;
	}

	/* Asymptote with limits */
	.vt-asymptote-limits {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		justify-content: center;
		height: 100%;
		min-height: 3em;
		gap: 0.25em;
	}

	.vt-limit {
		display: flex;
		align-items: center;
	}

	.vt-limit-left {
		align-items: flex-start;
	}

	.vt-limit-right {
		align-items: flex-end;
	}

	.vt-asymptote-bar {
		width: 5px;
		margin: 0 0.25em;
		background: linear-gradient(
			to right,
			var(--vt-text-color) 0px,
			var(--vt-text-color) 1px,
			transparent 1px,
			transparent 4px,
			var(--vt-text-color) 4px,
			var(--vt-text-color) 5px
		);
	}

	.vt-asymptote-bar-sign {
		display: inline-block;
		height: 1.5em;
		vertical-align: middle;
	}

	/* Forbidden cell */
	.vt-forbidden-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 3em;
	}

	/* Arrow cells */
	.vt-arrow-cell {
		min-width: 4em;
		padding: 0.25em !important;
		border-left: none !important;
		border-right: none !important;
	}

	.vt-arrow {
		width: 100%;
		height: 2.5em;
		color: var(--vt-arrow-color);
	}

	/* SVG arrow styling - use stroke and fill with currentColor */
	.variation-table :global(.vt-arrow-line) {
		stroke: currentColor;
		stroke-width: 2;
	}

	.variation-table :global(.vt-arrow-head) {
		fill: currentColor;
	}

	/* Math element styling */
	.variation-table :global(math-span) {
		font-size: inherit;
	}

	/* Dark mode support */
	:global(.dark) .variation-table {
		--vt-border-color: var(--border, #374151);
		--vt-header-bg: var(--muted, #1f2937);
		--vt-text-color: var(--foreground, #f3f4f6);
		--vt-plus-color: #22c55e;
		--vt-minus-color: #f87171;
		--vt-arrow-color: var(--foreground, #f3f4f6);
		--vt-hatch-color: var(--muted-foreground, #9ca3af);
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.variation-table {
			font-size: 0.9em;
		}

		.vt-arrow-cell {
			min-width: 3em;
		}
	}
</style>
