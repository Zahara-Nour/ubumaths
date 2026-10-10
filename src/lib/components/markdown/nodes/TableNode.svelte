<!--
	TableNode Component
	===================

	Renders a GFM-style table with:
	- Header row (normal) or header column (transposed)
	- Column alignments (left, center, right) for normal tables
	- All cells centered for transposed tables
	- Consistent Tailwind styling
	- XSS protection via HTML escaping
	- Responsive overflow handling
	- Inline math rendering via <math-span>
	- Rendu de cellule personnalisable (`customCell`) : l'énoncé d'une question à
	  trous y place ses champs de saisie ; sans lui, rendu inchangé

	Transposed tables (:table-h directive):
	- Table is written normally in markdown (headers in first row)
	- Displayed transposed: rows become columns, columns become rows
	- First column (original headers) displayed as th elements
	- All cells are centered

	@see ExerciseDisplay.svelte for original renderTable() implementation
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TableCellNode } from '$lib/ubumark';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import { escapeHtml } from '../utils';
	import MathInline from './MathInline.svelte';

	interface Props {
		header: TableCellNode[];
		rows: TableCellNode[][];
		alignments: ('left' | 'center' | 'right')[];
		transpose?: boolean;
		cross?: boolean;
		genericFunctions?: GenericFunctionConfig | null;
		class?: string;
		/**
		 * Rendu d'une cellule, à la place du rendu par défaut. Reçoit la cellule et le
		 * rendu par défaut (texte + formules), à appeler pour les cellules ordinaires.
		 */
		customCell?: Snippet<[TableCellNode, Snippet<[string]>]>;
	}

	let {
		header,
		rows,
		alignments,
		transpose = false,
		cross = false,
		genericFunctions,
		class: className = '',
		customCell
	}: Props = $props();

	/**
	 * Parse cell content for inline math expressions.
	 * Returns an array of segments: texte, ou formule avec sa syntaxe
	 */
	type CellSegment =
		| { type: 'text'; content: string }
		| { type: 'math'; content: string; syntax: 'latex' | 'custom' };

	function parseCellContent(content: string): CellSegment[] {
		const segments: CellSegment[] = [];
		// `$…$` (pas `$$…$$`) ou `~…~` (V10, 2026-10-10), lus de gauche à droite :
		// le `~` d'espace insécable dans un `$…$` n'ouvre pas de formule ; `\~` reste du texte
		const mathRegex = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)|(?<![\\~])~(?!~)([^~\n]+)~(?!~)/g;

		let lastIndex = 0;
		let match;

		while ((match = mathRegex.exec(content)) !== null) {
			// Add text before the math
			if (match.index > lastIndex) {
				segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
			}
			// Add the math expression (without its delimiters)
			segments.push(
				match[2] !== undefined
					? { type: 'math', content: match[2], syntax: 'custom' }
					: { type: 'math', content: match[1], syntax: 'latex' }
			);
			lastIndex = mathRegex.lastIndex;
		}

		// Add remaining text
		if (lastIndex < content.length) {
			segments.push({ type: 'text', content: content.slice(lastIndex) });
		}

		return segments.length > 0 ? segments : [{ type: 'text', content }];
	}

	/**
	 * For transposed tables, transpose the data so each source column becomes a row.
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
		if (!transpose) return null;

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

<!-- Snippet to render cell content with math support -->
{#snippet cellContent(content: string)}
	{#each parseCellContent(content) as segment, i (i)}
		{#if segment.type === 'math'}
			<MathInline expression={segment.content} syntax={segment.syntax} {genericFunctions} />
		{:else}
			<!-- `\~` : tilde littéral (ré-échappé par le parseur), affiché `~` -->
			{@html escapeHtml(segment.content.replaceAll('\\~', '~'))}
		{/if}
	{/each}
{/snippet}

{#snippet renderCell(cell: TableCellNode)}
	{#if customCell}
		{@render customCell(cell, cellContent)}
	{:else}
		{@render cellContent(cell.content)}
	{/if}
{/snippet}

<div class="my-6 overflow-x-auto {className}">
	<table class="min-w-full border-collapse border border-border">
		{#if transpose && transposedRows}
			<!-- Transposed table: no thead, first column is th -->
			<tbody>
				{#each transposedRows as row, rowIndex (rowIndex)}
					<tr class="border-b border-border">
						{#each row as cell, cellIndex (cellIndex)}
							{#if cellIndex === 0}
								<!-- First column: header cell with same styling as thead -->
								<th
									class="border-r-2 border-border bg-muted/50 px-4 py-2 text-center font-semibold text-foreground"
								>
									{@render renderCell(cell)}
								</th>
							{:else}
								<td class="px-4 py-2 text-center text-foreground">
									{@render renderCell(cell)}
								</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		{:else if cross}
			<!-- Cross table (double-entry): first row AND first column are headers -->
			<colgroup>
				{#each alignments as alignment, index (index)}
					<col class={getAlignmentClass(alignment)} />
				{/each}
			</colgroup>
			<thead class="border-b-2 border-border">
				<tr>
					{#each header as cell, index (index)}
						<!-- Corner cell: header styling only if it has content -->
						<th
							class="px-4 py-2 font-semibold text-foreground {getAlignmentClass(
								alignments[index] || 'center'
							)} {index === 0 ? (cell.content.trim() ? 'bg-muted/50' : '') : 'bg-muted/50'}"
						>
							{@render renderCell(cell)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, rowIndex (rowIndex)}
					<tr class="border-b border-border">
						{#each row as cell, cellIndex (cellIndex)}
							{#if cellIndex === 0}
								<!-- First column: header cell -->
								<th
									class="border-r-2 border-border bg-muted/50 px-4 py-2 font-semibold text-foreground {getAlignmentClass(
										alignments[cellIndex] || 'center'
									)}"
								>
									{@render renderCell(cell)}
								</th>
							{:else}
								<td
									class="px-4 py-2 text-foreground {getAlignmentClass(
										alignments[cellIndex] || 'center'
									)}"
								>
									{@render renderCell(cell)}
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
							{@render renderCell(cell)}
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
								{@render renderCell(cell)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>
