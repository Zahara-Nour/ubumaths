<script lang="ts">
	/**
	 * PinnedLabels Component
	 *
	 * The labels a click left on the graph. Each one names a term of a
	 * sequence — exact value first, decimal value after a second click.
	 *
	 * A label stores only what was clicked: the value is recomputed here, so a
	 * parameter slider moves the label instead of leaving a stale number.
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { isCobwebEnabled, isSequence } from '$lib/grapheur/types';
	import { computeSequenceTerms, toComputeSpec } from '$lib/grapheur/sequence';
	import { exactTermValue } from '$lib/grapheur/exact';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { formatGraphValue } from '$lib/grapheur/format';
	import GraphLabel, { type GraphLabelContent } from './GraphLabel.svelte';

	let {
		transformer,
		width,
		height
	}: {
		transformer: CoordinateTransformer;
		width: number;
		height: number;
	} = $props();

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/**
	 * Everything needed to draw each label, or nothing when its term is gone.
	 *
	 * A rank can stop existing — the sequence became invalid, its first rank
	 * moved past it, a recurrence stops at an undefined term. The label then
	 * draws nothing rather than a value that is no longer true.
	 */
	const drawable = $derived.by(() =>
		grapheurStore.pinnedLabels.flatMap((pinned) => {
			const sequence = grapheurStore.functions.find((f) => f.id === pinned.functionId);
			if (!sequence || !isSequence(sequence) || !sequence.visible) return [];

			// The staircase plots (u_n, u_{n+1}): there is no point of rank n to
			// label there.
			if (isCobwebEnabled(sequence)) return [];

			const spec = toComputeSpec(sequence, grapheurStore.parameterBindings);
			if (!spec) return [];

			const term = computeSequenceTerms(spec, pinned.rank).find((t) => t.n === pinned.rank);
			if (!term) return [];

			const exact = pinned.showsExact ? exactTermValue(spec, pinned.rank) : null;
			const value = exact ? toLatex(exact) : formatGraphValue(term.value);

			const content: GraphLabelContent = {
				text: `${sequence.name}${pinned.rank} = ${formatGraphValue(term.value)}`,
				latex: `${sequence.name}_{${pinned.rank}} = ${value}`
			};

			return [
				{
					key: `${pinned.functionId}:${pinned.rank}`,
					color: sequence.color,
					svg: transformer.mathToSvg(term.n, term.value),
					content
				}
			];
		})
	);
</script>

<g class="pinned-labels" pointer-events="none">
	{#each drawable as label (label.key)}
		<circle
			cx={label.svg.x}
			cy={label.svg.y}
			r={6}
			fill={label.color}
			stroke="white"
			stroke-width={2}
			class="pinned-marker"
		/>

		<GraphLabel
			x={label.svg.x}
			y={label.svg.y}
			content={label.content}
			canvasWidth={width}
			canvasHeight={height}
		/>
	{/each}
</g>

<style>
	.pinned-marker {
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
	}
</style>
