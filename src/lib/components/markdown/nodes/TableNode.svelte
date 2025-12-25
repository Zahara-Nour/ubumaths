<!--
	TableNode Component
	===================

	Renders a GFM-style table with:
	- Header row (vertical) or header column (horizontal)
	- Column alignments (left, center, right) for vertical tables
	- All cells centered for horizontal tables
	- Consistent Tailwind styling
	- XSS protection via HTML escaping
	- Responsive overflow handling

	Horizontal tables (:table-h directive):
	- First column contains headers (th elements)
	- Remaining columns contain data (td elements)
	- All cells are centered

	@see ExerciseDisplay.svelte for original renderTable() implementation
-->
<script lang="ts">
	import type { TableCellNode } from '$lib/ubumark';
	import { escapeHtml } from '../utils';

	interface Props {
		header: TableCellNode[];
		rows: TableCellNode[][];
		alignments: ('left' | 'center' | 'right')[];
		orientation?: 'vertical' | 'horizontal';
		class?: string;
	}

	let {
		header,
		rows,
		alignments,
		orientation = 'vertical',
		class: className = ''
	}: Props = $props();

	/**
	 * For horizontal tables, transpose the data so each source column becomes a row.
	 * The first cell of each row (from header) becomes a th, rest become td.
	 *
	 * Original (source):
	 *   header = [H1, H2, H3]
	 *   rows = [[R1C1, R1C2, R1C3], [R2C1, R2C2, R2C3]]
	 *
	 * Transposed (output rows):
	 *   [[H1, R1C1, R2C1], [H2, R1C2, R2C2], [H3, R1C3, R2C3]]
	 */
	const transposedRows = $derived.by(() => {
		if (orientation !== 'horizontal') return null;

		const numColumns = header.length;
		const result: TableCellNode[][] = [];

		for (let col = 0; col < numColumns; col++) {
			const row: TableCellNode[] = [
				header[col], // First cell is the header
				...rows.map((r) => r[col] || { content: '', align: 'center' })
			];
			result.push(row);
		}

		return result;
	});

	/**
	 * Get CSS class for column alignment
	 */
	function getAlignmentClass(alignment: 'left' | 'center' | 'right'): string {
		switch (alignment) {
			case 'center':
				return 'text-center';
			case 'right':
				return 'text-right';
			case 'left':
			default:
				return 'text-left';
		}
	}
</script>

<div class="my-6 overflow-x-auto {className}">
	<table class="min-w-full border-collapse border border-border">
		{#if orientation === 'horizontal' && transposedRows}
			<!-- Horizontal table: no thead, first column is th -->
			<tbody>
				{#each transposedRows as row, rowIndex (rowIndex)}
					<tr class="border-b border-border">
						{#each row as cell, cellIndex (cellIndex)}
							{#if cellIndex === 0}
								<!-- First column: header cell with same styling as thead -->
								<th
									class="border-r-2 border-border bg-muted/50 px-4 py-2 text-center font-semibold text-foreground"
								>
									{@html escapeHtml(cell.content)}
								</th>
							{:else}
								<td class="px-4 py-2 text-center text-foreground">
									{@html escapeHtml(cell.content)}
								</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		{:else}
			<!-- Standard vertical table -->
			<colgroup>
				{#each alignments as alignment, index (index)}
					<col class={getAlignmentClass(alignment)} />
				{/each}
			</colgroup>
			<thead class="border-b-2 border-border bg-muted/50">
				<tr>
					{#each header as cell, index (index)}
						<th
							class="px-4 py-2 font-semibold text-foreground {getAlignmentClass(
								alignments[index] || 'left'
							)}"
						>
							{@html escapeHtml(cell.content)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, rowIndex (rowIndex)}
					<tr class="border-b border-border">
						{#each row as cell, cellIndex (cellIndex)}
							<td
								class="px-4 py-2 text-foreground {getAlignmentClass(
									alignments[cellIndex] || 'left'
								)}"
							>
								{@html escapeHtml(cell.content)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>
