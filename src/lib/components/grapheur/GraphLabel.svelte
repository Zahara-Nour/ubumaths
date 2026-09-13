<script lang="ts">
	/**
	 * GraphLabel Component
	 *
	 * The little dark box that names a point on the graph: the coordinates of a
	 * hovered point, the value of a term. Shared by the ephemeral hover label
	 * and the ones a click leaves behind, so the two cannot drift apart.
	 *
	 * @component
	 */

	import { convertLatexToMarkup } from 'mathlive';

	/** A label: plain text always, plus LaTeX when the value is worth rendering. */
	export interface GraphLabelContent {
		/** Text form, used for width estimation and as the fallback rendering. */
		readonly text: string;
		/** LaTeX form, rendered when present. */
		readonly latex: string | null;
	}

	let {
		x,
		y,
		content,
		canvasWidth,
		canvasHeight
	}: {
		/** Point being labelled, in SVG coordinates. */
		x: number;
		y: number;
		content: GraphLabelContent;
		/** Canvas size, so the box stays inside it. */
		canvasWidth: number;
		canvasHeight: number;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Height of a single-line label, in pixels. */
	const LINE_HEIGHT = 20;

	/**
	 * Height of a label holding a two-storey formula.
	 *
	 * A fraction is two storeys tall: rendered inside a 20 pixel box with
	 * hidden overflow, `-3/8` loses its denominator.
	 */
	const STACKED_HEIGHT = 36;

	/** Distance kept between the point and its label. */
	const MARGIN = 12;

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/**
	 * Height the rendered content needs.
	 *
	 * Estimated from the LaTeX rather than measured, which would mean a second
	 * render pass for a label that lives as long as a mouse move.
	 */
	const height = $derived(
		content.latex && /\\[dt]?frac/.test(content.latex) ? STACKED_HEIGHT : LINE_HEIGHT
	);

	const width = $derived(Math.max(105, content.text.length * 7));

	/** Position of the box, kept inside the canvas. */
	const position = $derived.by(() => {
		let boxX = x + MARGIN;
		let anchor: 'start' | 'end' = 'start';

		// Too close to the right edge: flip to the left of the point.
		if (x + width + MARGIN > canvasWidth) {
			boxX = x - MARGIN;
			anchor = 'end';
		}

		// Above the point, unless that would leave the canvas.
		let boxY = y - MARGIN - 8;
		if (boxY < MARGIN + height) {
			boxY = y + MARGIN + height;
			if (boxY + height > canvasHeight - MARGIN) {
				boxY = canvasHeight - height - MARGIN;
			}
		}

		return { x: boxX, y: boxY, anchor };
	});

	const boxX = $derived(position.anchor === 'start' ? position.x : position.x - width);
</script>

<rect x={boxX} y={position.y - height / 2} {width} {height} rx={4} class="label-bg" />

{#if content.latex}
	<foreignObject x={boxX} y={position.y - height / 2} {width} {height}>
		<div class="label-math" data-anchor={position.anchor} style="height: {height}px">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html convertLatexToMarkup(content.latex, { defaultMode: 'inline-math' })}
		</div>
	</foreignObject>
{:else}
	<text
		x={position.anchor === 'start' ? position.x + 6 : position.x - 6}
		y={position.y + 4}
		text-anchor={position.anchor}
		class="label-text"
	>
		{content.text}
	</text>
{/if}

<style>
	.label-bg {
		fill: var(--graph-tooltip-bg, #1f2937);
		opacity: 0.95;
	}

	.label-math {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 6px;
		font-size: 11px;
		color: white;
		white-space: nowrap;
		overflow: hidden;
	}

	.label-math[data-anchor='end'] {
		justify-content: flex-end;
	}

	.label-text {
		font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
		font-size: 11px;
		fill: white;
		user-select: none;
	}

	:global(.dark) .label-bg {
		fill: var(--graph-tooltip-bg-dark, #374151);
	}
</style>
