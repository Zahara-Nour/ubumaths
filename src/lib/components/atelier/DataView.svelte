<script lang="ts">
	/**
	 * La vue Données : la grille (tableur intégré, lot 1).
	 *
	 * Une liste est une colonne NOMMÉE ; les colonnes sans nom gardent leurs
	 * cellules dans la grille. Une cellule se lit comme une entrée de liste
	 * (`1,5`, `1/6`, sinon un mot) ; `12 ; 15 ; 9` tapé dans une cellule se
	 * répartit vers le bas (P2). Phase 0 : `docs/wip/atelier-tableur-phase0.md`.
	 *
	 * La vue n'a aucun état de modèle : cellules et noms vivent dans l'`Atelier`.
	 * Elle ne garde que la sélection et la frappe en cours.
	 */
	import { tick } from 'svelte';
	import { useAtelier } from '$lib/atelier/context';
	import { isList, type ListObject } from '$lib/atelier/types';
	import { cellName, columnLetter, GRID_COLUMNS, GRID_ROWS } from '$lib/atelier/grid';
	import { cascadeMessage } from '$lib/atelier/removal';
	import type { RemovedWithDependents } from '$lib/atelier/atelier.svelte';
	import { summarizeList } from '$lib/statistics/describe';
	import { readListValue } from '$lib/statistics/read-value';
	import { listChart } from '$lib/atelier/chart';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import StatChart from '$lib/components/markdown/nodes/StatChart.svelte';

	/** Où va la frappe en cours : dans la cellule, ou dans la barre au-dessus. */
	type Editing = 'cell' | 'bar' | null;

	/** Au moins 10 lignes et 5 colonnes, même vide ; la zone utilisée plus sa marge (§2). */
	const MIN_ROWS = 10;
	const MIN_COLUMNS = 5;
	const ROW_MARGIN = 10;
	const COLUMN_MARGIN = 3;

	const atelier = useAtelier();

	let selected = $state({ column: 0, row: 1 });
	let editing = $state<Editing>(null);
	let draft = $state('');
	let refusal = $state('');
	/** La colonne dont on tape le nom, et ce qui est tapé. */
	let naming = $state<number | null>(null);
	let nameDraft = $state('');
	/** Le retrait de nom qui attend confirmation : la liste emporte des dépendants. */
	let pendingUnname = $state<{ column: number; name: string; dependents: string[] } | null>(null);
	let confirmUnname = $state(false);

	let grid: HTMLElement | undefined = $state();
	let bar: HTMLInputElement | undefined = $state();

	const extent = $derived(atelier.usedExtent);
	const columns = $derived(
		Array.from(
			{
				length: Math.min(
					GRID_COLUMNS,
					Math.max(MIN_COLUMNS, extent.columns + COLUMN_MARGIN, selected.column + 2)
				)
			},
			(_, i) => i
		)
	);
	const rows = $derived(
		Array.from(
			{
				length: Math.min(GRID_ROWS, Math.max(MIN_ROWS, extent.rows + ROW_MARGIN, selected.row + 1))
			},
			(_, i) => i + 1
		)
	);
	const lists = $derived(atelier.objects.filter(isList));
	const empty = $derived(extent.columns === 0);
	const selectedText = $derived(atelier.cell(selected.column, selected.row));

	// -------------------------------------------------------------------------
	// Aperçu d'une colonne nommée
	// -------------------------------------------------------------------------

	/** Le nombre de valeurs écartées, quand il y en a (§4 E1 de la v1). */
	function skippedNote(skipped: number): string {
		if (skipped === 0) return '';
		return skipped === 1 ? '1 valeur ignorée' : `${skipped} valeurs ignorées`;
	}

	/** Un aperçu chiffré, pour que la colonne dise quelque chose sans clic. */
	function numericSummary(values: readonly number[]): string {
		const outcome = summarizeList(values);
		if (outcome === null) return '';
		if (!outcome.ok) return outcome.message;
		const stats = outcome.value;
		const fr = (n: number) => Number(n.toFixed(2)).toString().replace('.', ',');
		return `n = ${stats.count} · moyenne ${fr(stats.mean)}`;
	}

	/** L'aperçu d'une liste qualitative (Q84) : entrées et modalités, pas de moyenne */
	function qualitativeSummary(categories: readonly string[], because?: string): string {
		const distinct = new Set(categories).size;
		// Q92 : la cause d'une liste mélangée, pour un `2x` tapé par erreur
		const why = because === undefined ? '' : `, à cause de « ${because} »`;
		return `liste qualitative${why} · ${categories.length} entrée${categories.length > 1 ? 's' : ''} · ${distinct} modalité${distinct > 1 ? 's' : ''}`;
	}

	function summaryOf(list: ListObject): string {
		const main = list.categories
			? qualitativeSummary(list.categories, list.qualitativeBecause)
			: numericSummary(list.values);
		const skipped = skippedNote(list.skipped);
		return skipped === '' ? main : `${main} · ${skipped}`;
	}

	const summaryId = (name: string) => `atelier-apercu-${name}`;
	const chartMessageId = (name: string) => `atelier-diagramme-${name}`;

	// -------------------------------------------------------------------------
	// Sélection et frappe
	// -------------------------------------------------------------------------

	async function focusSelected() {
		await tick();
		const cell = grid?.querySelector<HTMLElement>(
			`[data-cell="${cellName(selected.column, selected.row)}"]`
		);
		cell?.focus();
	}

	function select(column: number, row: number) {
		selected = {
			column: Math.max(0, Math.min(GRID_COLUMNS - 1, column)),
			row: Math.max(1, Math.min(GRID_ROWS, row))
		};
	}

	function startEditing(where: Exclude<Editing, null>, text: string) {
		editing = where;
		draft = text;
		refusal = '';
	}

	function cancel() {
		editing = null;
		draft = '';
		refusal = '';
		focusSelected();
	}

	/** Valider la frappe, puis se déplacer. Un refus garde la frappe et le dit. */
	function commit(move?: { column: number; row: number }): boolean {
		if (editing === null) return true;
		const edited = atelier.editCells([{ column: selected.column, row: selected.row, text: draft }]);
		if (!edited.ok) {
			refusal = edited.message;
			return false;
		}
		editing = null;
		draft = '';
		refusal = '';
		if (move) select(selected.column + move.column, selected.row + move.row);
		return true;
	}

	function clearSelected() {
		const edited = atelier.editCells([{ column: selected.column, row: selected.row, text: '' }]);
		refusal = edited.ok ? '' : edited.message;
	}

	/** Les touches de la frappe en cours, dans la cellule comme dans la barre. */
	function editingKeys(event: KeyboardEvent): void {
		const moves: Record<string, { column: number; row: number }> = {
			Enter: { column: 0, row: event.shiftKey ? -1 : 1 },
			Tab: { column: event.shiftKey ? -1 : 1, row: 0 },
			ArrowDown: { column: 0, row: 1 },
			ArrowUp: { column: 0, row: -1 }
		};
		if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
			return;
		}
		const move = moves[event.key];
		if (move === undefined) return;
		event.preventDefault();
		if (commit(move)) focusSelected();
	}

	/** Les touches d'une cellule sélectionnée ; pendant la frappe, celles de la frappe. */
	function cellKeys(event: KeyboardEvent): void {
		if (editing === 'cell') {
			editingKeys(event);
			return;
		}
		const arrows: Record<string, { column: number; row: number }> = {
			ArrowLeft: { column: -1, row: 0 },
			ArrowRight: { column: 1, row: 0 },
			ArrowUp: { column: 0, row: -1 },
			ArrowDown: { column: 0, row: 1 },
			Enter: { column: 0, row: event.shiftKey ? -1 : 1 }
		};
		const arrow = arrows[event.key];
		if (arrow !== undefined) {
			event.preventDefault();
			select(selected.column + arrow.column, selected.row + arrow.row);
			focusSelected();
			return;
		}
		if (event.key === 'F2') {
			event.preventDefault();
			startEditing('cell', selectedText);
			return;
		}
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			clearSelected();
			return;
		}
		// Taper remplace le contenu, comme dans un tableur
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault();
			startEditing('cell', event.key);
		}
	}

	function clickCell(column: number, row: number) {
		select(column, row);
		focusSelected();
	}

	function doubleClickCell(column: number, row: number) {
		select(column, row);
		startEditing('cell', atelier.cell(column, row));
	}

	/** Le champ de la cellule perd le focus : la frappe est validée, sauf vers la barre. */
	function cellInputBlur(event: FocusEvent) {
		if (editing !== 'cell') return;
		if (event.relatedTarget === bar) {
			editing = 'bar';
			return;
		}
		commit();
	}

	function barInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (editing === null) refusal = '';
		editing = 'bar';
		draft = event.currentTarget.value;
	}

	function barKeys(event: KeyboardEvent) {
		if (editing === null) return;
		editingKeys(event);
	}

	function barBlur() {
		if (editing === 'bar') commit();
	}

	/** Un champ qui apparaît prend le focus, curseur en fin de texte. */
	function focusAtEnd(node: HTMLInputElement) {
		node.focus();
		node.setSelectionRange(node.value.length, node.value.length);
	}

	// -------------------------------------------------------------------------
	// Nommer une colonne, retirer son nom (§1)
	// -------------------------------------------------------------------------

	function startNaming(column: number) {
		naming = column;
		nameDraft = '';
		refusal = '';
	}

	function nameKeys(event: KeyboardEvent) {
		if (naming === null) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			naming = null;
			return;
		}
		if (event.key !== 'Enter') return;
		event.preventDefault();
		const named = atelier.nameColumn(naming, nameDraft.trim());
		if (!named.ok) {
			refusal = named.message;
			return;
		}
		naming = null;
		refusal = '';
	}

	function unname(column: number, name: string) {
		const dependents = [...atelier.removalOf(name)];
		if (dependents.length > 0) {
			pendingUnname = { column, name, dependents };
			confirmUnname = true;
			return;
		}
		unnameNow(column, name);
	}

	function unnameNow(column: number, name: string) {
		const result = atelier.unnameColumn(column);
		if (!result.ok) {
			refusal = result.message;
			return;
		}
		toaster.message(`La colonne ${columnLetter(column)} n’est plus la liste ${name}.`, {
			action: { label: 'Annuler', onClick: () => undoUnname(result) }
		});
	}

	function undoUnname(result: RemovedWithDependents) {
		if (!atelier.undoRemoval(result)) {
			toaster.warning('L’atelier a changé depuis : le nom ne peut plus être remis.');
		}
	}
</script>

<div class="donnees">
	<div class="barre">
		<label class="adresse" for="atelier-barre-cellule">
			{cellName(selected.column, selected.row)}
		</label>
		<input
			bind:this={bar}
			id="atelier-barre-cellule"
			type="text"
			autocomplete="off"
			spellcheck="false"
			value={editing === null ? selectedText : draft}
			oninput={barInput}
			onkeydown={barKeys}
			onblur={barBlur}
		/>
	</div>
	<p class="refus" role="status">{refusal}</p>

	{#if empty}
		<p class="consigne">
			Tape tes valeurs dans la grille, une par case. Nomme une colonne (L, M…) pour en faire une
			liste : statistiques, nuage et diagrammes s’en servent.
		</p>
	{/if}

	<div class="defilement">
		<table bind:this={grid} role="grid" aria-label="Grille des données">
			<thead>
				<tr>
					<th class="coin" scope="col"><span class="sr-only">Lignes</span></th>
					{#each columns as column (column)}
						{@const letter = columnLetter(column)}
						{@const list = atelier.listAt(column)}
						<th
							scope="col"
							data-column={letter}
							aria-describedby={list
								? `${summaryId(list.name)} ${chartMessageId(list.name)}`
								: undefined}
						>
							<span class="lettre">{letter}</span>
							{#if list}
								<span class="nom-liste">{list.name}</span>
								<button
									type="button"
									class="retirer"
									aria-label="Retirer le nom {list.name} de la colonne {letter}"
									title="Retirer le nom"
									onclick={() => unname(column, list.name)}>×</button
								>
							{:else if naming === column}
								<input
									class="saisie-nom"
									type="text"
									maxlength="4"
									autocomplete="off"
									spellcheck="false"
									aria-label="Nom de la liste de la colonne {letter}"
									bind:value={nameDraft}
									onkeydown={nameKeys}
									onblur={() => (naming = null)}
									{@attach focusAtEnd}
								/>
							{:else}
								<button
									type="button"
									class="nommer"
									aria-label="Nommer la colonne {letter}"
									onclick={() => startNaming(column)}>nommer</button
								>
							{/if}
						</th>
					{/each}
				</tr>
				{#if lists.length > 0}
					<tr class="apercus">
						<th scope="row"><span class="sr-only">Aperçu</span></th>
						{#each columns as column (column)}
							{@const list = atelier.listAt(column)}
							<td>
								{#if list}
									<!-- Un <span> : la règle globale `main p` impose sa taille -->
									<span
										id={summaryId(list.name)}
										data-apercu={list.name}
										class={list.message ? 'probleme' : 'apercu'}
									>
										{list.message ?? summaryOf(list)}
									</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/if}
			</thead>
			<tbody>
				{#each rows as row (row)}
					<tr>
						<th scope="row" class="numero">{row}</th>
						{#each columns as column (column)}
							{@const address = cellName(column, row)}
							{@const isSelected = selected.column === column && selected.row === row}
							{@const text = isSelected && editing === 'bar' ? draft : atelier.cell(column, row)}
							<td
								role="gridcell"
								data-cell={address}
								tabindex={isSelected ? 0 : -1}
								aria-selected={isSelected}
								class:nombre={readListValue(text) !== null}
								onclick={() => clickCell(column, row)}
								ondblclick={() => doubleClickCell(column, row)}
								onkeydown={cellKeys}
							>
								{#if isSelected && editing === 'cell'}
									<input
										class="edition"
										type="text"
										autocomplete="off"
										spellcheck="false"
										aria-label="Contenu de {address}"
										bind:value={draft}
										onblur={cellInputBlur}
										{@attach focusAtEnd}
									/>
								{:else}
									{text}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<p class="aide">
		La virgule est décimale : <code>3,14</code> est un seul nombre. Une fraction comme
		<code>1/6</code> se lit aussi.
	</p>

	<!-- Diagrammes vivants (outils statistiques, Q36) : recalculés à chaque
	     validation, parce qu'ils relisent la liste au lieu d'en garder une copie -->
	{#each lists as list (list.name)}
		{@const shown = atelier.chartOf(list.name)}
		{#if shown}
			{@const chart = listChart(atelier, list.name, shown.partner, shown.kind)}
			<section class="diagramme" data-diagramme={list.name}>
				{#if chart.ok}
					<StatChart node={chart.node} />
				{:else}
					<p class="probleme" id={chartMessageId(list.name)}>{chart.message}</p>
				{/if}
			</section>
		{/if}
	{/each}
</div>

<ConfirmDialog
	bind:open={confirmUnname}
	title="Retirer le nom {pendingUnname?.name ?? ''} ?"
	description={pendingUnname ? cascadeMessage(pendingUnname.name, pendingUnname.dependents) : ''}
	confirmLabel="Retirer le nom"
	onConfirm={() => {
		if (pendingUnname) unnameNow(pendingUnname.column, pendingUnname.name);
	}}
/>

<style>
	.donnees {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		height: 100%;
		min-height: 0;
	}

	.barre {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.adresse {
		min-width: 3rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}

	.barre input {
		flex: 1;
		min-width: 0;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-background);
		color: var(--color-foreground);
		font-family: var(--font-mono, monospace);
	}

	.refus {
		margin: 0;
		min-height: 1.1rem;
		font-size: 0.8125rem;
		color: var(--color-destructive);
	}

	.consigne {
		margin: 0;
		color: var(--color-muted-foreground);
		font-size: 0.875rem;
		max-width: 44rem;
	}

	.defilement {
		overflow: auto;
		min-height: 0;
		flex: 1;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
	}

	table {
		border-collapse: separate;
		border-spacing: 0;
		font-size: 0.875rem;
	}

	th,
	td {
		border-right: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		padding: 0 0.375rem;
		height: 1.75rem;
		white-space: nowrap;
	}

	thead th {
		position: sticky;
		top: 0;
		z-index: 2;
		min-width: 5.5rem;
		background: var(--color-muted);
		font-weight: 600;
		text-align: left;
	}

	.coin,
	.numero,
	.apercus th {
		position: sticky;
		left: 0;
		z-index: 1;
		min-width: 2.5rem;
		background: var(--color-muted);
		color: var(--color-muted-foreground);
		font-weight: 500;
		text-align: right;
	}

	.coin {
		z-index: 3;
	}

	.lettre {
		color: var(--color-muted-foreground);
		margin-right: 0.375rem;
	}

	.nom-liste {
		color: var(--color-foreground);
	}

	.nommer,
	.retirer {
		border: none;
		background: none;
		padding: 0 0.25rem;
		font-size: 0.75rem;
		color: var(--color-muted-foreground);
		cursor: pointer;
	}

	.nommer:hover,
	.retirer:hover {
		color: var(--color-foreground);
	}

	.saisie-nom {
		width: 3rem;
		padding: 0 0.25rem;
		border: 1px solid var(--color-border);
		border-radius: 0.1875rem;
		background: var(--color-background);
		color: var(--color-foreground);
	}

	.apercus td {
		background: var(--color-muted);
		white-space: normal;
		max-width: 12rem;
	}

	.apercu,
	.probleme {
		display: block;
		margin: 0;
		font-size: 0.75rem;
		font-weight: 400;
	}

	.apercu {
		color: var(--color-muted-foreground);
	}

	.probleme {
		color: var(--color-destructive);
	}

	td {
		min-width: 5.5rem;
		cursor: cell;
		background: var(--color-card);
		color: var(--color-foreground);
	}

	td.nombre {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	td[aria-selected='true'] {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}

	td:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}

	.edition {
		width: 100%;
		min-width: 0;
		border: none;
		padding: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		outline: none;
	}

	.aide {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-muted-foreground);
	}

	.diagramme {
		max-width: 44rem;
	}

	code {
		font-family: var(--font-mono, monospace);
		background: var(--color-muted);
		padding: 0 0.25rem;
		border-radius: 0.1875rem;
	}
</style>
