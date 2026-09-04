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

	let { sequence }: { sequence: SequencePlottable } = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Rows listed at once — the panel scrolls rather than growing. */
	const MAX_ROWS = 50;

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

	const terms = $derived.by(() => {
		const spec = toComputeSpec(sequence);
		if (!spec) return [];

		return computeSequenceTerms(spec, sequence.firstIndex + MAX_ROWS - 1);
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
							{sequence.name}<sub>n</sub>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each terms as term (term.n)}
						<tr class="border-t border-border/40">
							<td class="px-2 py-1 text-muted-foreground">{term.n}</td>
							<td class="px-2 py-1 text-right font-mono">{formatValue(term.value)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
