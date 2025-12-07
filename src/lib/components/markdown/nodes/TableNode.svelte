<!--
	TableNode Component
	===================

	Renders a GFM-style table with:
	- Header row
	- Column alignments (left, center, right)
	- Consistent Tailwind styling
	- XSS protection via HTML escaping
	- Responsive overflow handling

	@see ExerciseDisplay.svelte for original renderTable() implementation
-->
<script lang="ts">
	import type { TableCellNode } from '$lib/custom-markdown';
	import { escapeHtml } from '../utils';

	interface Props {
		header: TableCellNode[];
		rows: TableCellNode[][];
		alignments: ('left' | 'center' | 'right')[];
		class?: string;
	}

	let { header, rows, alignments, class: className = '' }: Props = $props();

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
		<colgroup>
			{#each alignments as alignment, index (index)}
				<col class={getAlignmentClass(alignment)} />
			{/each}
		</colgroup>
		<thead class="border-b-2 border-border">
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
							class="px-4 py-2 text-foreground {getAlignmentClass(alignments[cellIndex] || 'left')}"
						>
							{@html escapeHtml(cell.content)}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
