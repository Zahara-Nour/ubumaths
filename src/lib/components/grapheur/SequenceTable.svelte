<script lang="ts">
	/**
	 * SequenceTable Component
	 *
	 * Table of values of a sequence, starting at its first index. Used to read
	 * terms precisely and to look for a threshold (« calcul de seuil »).
	 *
	 * @component
	 */

	import type { SequencePlottable } from '$lib/grapheur/types';
	import { computeSequenceTerms, toComputeSpec } from '$lib/grapheur/sequence';
	import { exactTermValues } from '$lib/grapheur/exact';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import { convertLatexToMarkup } from 'mathlive';
	import { Button } from '$lib/components/ui/button';

	let {
		sequence,
		bindings = {}
	}: {
		sequence: SequencePlottable;
		/** Parameter values to bind while iterating — `a`, `b`, … */
		bindings?: Readonly<Record<string, number>>;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Rows listed at once — the panel scrolls rather than growing. */
	const MAX_ROWS = 50;

	// ==========================================================================
	// State
	// ==========================================================================

	/**
	 * Exact values first, as everywhere else on the graph.
	 *
	 * The switch drives the whole column: comparing terms means reading them
	 * the same way, and flipping them one by one would be a lot of clicks for
	 * nothing.
	 */
	let showsExact = $state(true);

	/** Significant digits used for non-integer terms. */
	const DISPLAY_PRECISION = 6;

	// ==========================================================================
	// Functions
	// ==========================================================================

	/** Render a term compactly: integers stay exact, others are rounded. */
	function formatValue(value: number): string {
		if (Number.isInteger(value)) return String(value);

		const rounded = Number(value.toPrecision(DISPLAY_PRECISION));
		return String(rounded);
	}

	// ==========================================================================
	// Derived State
	// ==========================================================================

	const lastIndex = $derived(sequence.firstIndex + MAX_ROWS - 1);

	const terms = $derived.by(() => {
		const spec = toComputeSpec(sequence, bindings);
		if (!spec) return [];

		return computeSequenceTerms(spec, lastIndex);
	});

	/**
	 * Rendered exact value of each rank, computed in one pass.
	 *
	 * The MathLive markup is built here rather than in the rows: a parameter
	 * slider changes `bindings` at every step, and rendering fifty formulas per
	 * step inside the `{#each}` would be felt.
	 *
	 * Empty while the column shows decimals: unrolling a recurrence exactly is
	 * work nobody asked for then.
	 */
	const exactMarkup = $derived.by(() => {
		if (!showsExact) return new Map<number, string>();

		const spec = toComputeSpec(sequence, bindings);
		if (!spec) return new Map<number, string>();

		return new Map(
			[...exactTermValues(spec, lastIndex)].map(([rank, node]) => [
				rank,
				convertLatexToMarkup(toLatex(node), { defaultMode: 'inline-math' })
			])
		);
	});
</script>

<div class="sequence-table rounded border border-border/60 bg-background">
	{#if terms.length === 0}
		<p class="p-2 text-xs text-muted-foreground">Aucun terme à afficher.</p>
	{:else}
		<div class="max-h-56 overflow-y-auto">
			<table class="w-full text-xs">
				<caption class="sr-only">
					Tableau des valeurs de la suite {sequence.name}
				</caption>
				<thead class="sticky top-0 bg-muted">
					<tr>
						<th scope="col" class="px-2 py-1 text-left font-medium">n</th>
						<th scope="col" class="px-2 py-1 text-right font-medium">
							<span class="flex items-center justify-end gap-1">
								<span class="font-serif">{sequence.name}<sub>n</sub></span>
								<Button
									variant="ghost"
									size="sm"
									class="h-6 px-1.5 text-[10px] font-normal"
									onclick={() => (showsExact = !showsExact)}
									aria-pressed={showsExact}
									title={showsExact
										? 'Afficher les valeurs décimales'
										: 'Afficher les valeurs exactes'}
								>
									{showsExact ? 'exact' : 'décimal'}
								</Button>
							</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each terms as term (term.n)}
						{@const exact = exactMarkup.get(term.n)}
						<tr class="border-t border-border/40">
							<td class="px-2 py-1 text-muted-foreground">{term.n}</td>
							<td class="px-2 py-1 text-right {exact ? '' : 'font-mono'}">
								{#if exact}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html exact}
								{:else}
									{formatValue(term.value)}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
