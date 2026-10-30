<!--
	CubesGeste — assemblage de cubes à geste (```cubes + `dessiner:` / `retrouver:`)
	===============================================================================

	Chantier `solides`, lot 2 (`docs/wip/solides-progress.md` § 7).

	- `dessiner: face` : la perspective, et à côté un quadrillage vide plus grand
	  que la vue d'un carreau de chaque côté. Toucher un carreau le colorie, le
	  retoucher l'efface (Espace, Entrée au clavier). Réponse de la case : le
	  quadrillage (`00000/01000/01110/00000`, `drawingAnswer`), jugé à une
	  translation près.
	- `retrouver: face, droite` : PAS de perspective (elle donnerait la réponse) ;
	  les vues données, et la vue de dessus en grille de saisie : une case à nombre
	  sur chaque carreau. Réponse : les hauteurs (`2 1 - / 1 0 1`, `heightsAnswer`),
	  jugée « mêmes vues ».
	- Faux : les phrases de la correction et la solution dessous.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.
	  `solution` : la réponse juste, sans geste (bonne réponse, verso de la copie).
	- Noms accessibles : jamais le nombre de cubes.

	@module components/markdown/nodes/CubesGeste
-->
<script lang="ts">
	import type { CubesSpec, CubesView, EspaceNode } from '$lib/ubumark/types/espace';
	import {
		ESPACE_CM_PER_UNIT,
		ESPACE_MARGIN,
		ESPACE_STROKE
	} from '$lib/ubumark/utils/espace-scene';
	import {
		OTHER_SOLUTIONS,
		drawingAnswer,
		drawingGridSize,
		drawingMistakes,
		expectedCubesAnswer,
		heightsAnswer,
		readDrawingAnswer,
		readHeightsAnswer,
		retrouverHasOtherSolutions,
		retrouverMistakes,
		viewGrid
	} from '$lib/ubumark/utils/cubes-gestes';
	import Cubes from './Cubes.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Assemblage à geste (`spec.task` défini) */
		node: EspaceNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** La réponse juste, sans geste */
		solution?: boolean;
		/** false : sans bouton « Tout effacer » (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let {
		node,
		answer,
		solution = false,
		showControls = true,
		class: className = ''
	}: Props = $props();

	/** À l'écran, un peu plus grand qu'au PDF : un carreau reste touchable */
	const SCREEN_ZOOM = 1.15;

	const VIEW_TITLES: Record<Exclude<CubesView, 'perspective'>, string> = {
		dessus: 'Vue de dessus',
		face: 'Vue de face',
		droite: 'Vue de droite',
		gauche: 'Vue de gauche'
	};

	// Seul un assemblage à geste arrive ici (aiguillage d'`Espace.svelte`, des cases)
	let spec = $derived(node.spec as CubesSpec);
	let task = $derived(spec.task!);
	let heights = $derived(spec.heights);
	let locked = $derived(solution || (answer?.disabled ?? false));
	let verdict = $derived<boolean | null>(solution ? null : (answer?.isCorrect ?? null));
	let value = $derived(answer?.value ?? '');

	/** Le même assemblage, dessiné seul dans une vue (sans geste) */
	const shown = (view: CubesView): EspaceNode => ({
		type: 'espace',
		genre: node.genre,
		source: node.source,
		spec: { kind: 'cubes', heights, view },
		errors: []
	});

	// ── dessiner ──────────────────────────────────────────────

	let size = $derived(task.kind === 'dessiner' ? drawingGridSize(heights, task.view) : null);

	/** Quadrillage vide, ou la vue juste à un carreau du bord (solution) */
	function startGrid(rows: number, cols: number): boolean[][] {
		const empty = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
		if (!solution || task.kind !== 'dessiner') return empty;
		viewGrid(heights, task.view).forEach((row, r) =>
			row.forEach((cell, c) => (empty[r + 1][c + 1] = cell))
		);
		return empty;
	}

	/**
	 * Carreaux coloriés : relus quand la valeur de la case change, réassignés à
	 * chaque geste (dérivé modifiable) ; une réponse d'une autre taille est ignorée
	 * à l'écran (l'interface n'en produit pas ; le juge, lui, lit la valeur telle quelle)
	 */
	let grid = $derived.by<boolean[][]>(() => {
		if (size === null) return [];
		const read = solution ? null : readDrawingAnswer(value);
		const fits = read !== null && read.length === size.rows && read[0].length === size.cols;
		return fits ? read : startGrid(size.rows, size.cols);
	});

	function toggleTile(r: number, c: number) {
		if (locked) return;
		const next = grid.map((row) => [...row]);
		next[r][c] = !next[r][c];
		grid = next;
		answer?.onChange(drawingAnswer(next));
	}

	function clearTiles() {
		grid = grid.map((row) => row.map(() => false));
		answer?.onChange('');
	}

	function handleTileKey(event: KeyboardEvent, r: number, c: number) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		toggleTile(r, c);
	}

	const tileName = (r: number, c: number) =>
		`Carreau rangée ${r + 1}, colonne ${c + 1}${grid[r]?.[c] ? ', colorié' : ''}`;

	// ── retrouver ─────────────────────────────────────────────

	/** Hauteurs écrites (null : case vide ; 0 : carreau vide de la vue de dessus) */
	let cells = $derived.by<(number | null)[][]>(() => {
		const holes = heights.map((row) => row.map((h) => (h > 0 ? null : 0)));
		if (solution) return heights.map((row) => [...row]);
		const read = readHeightsAnswer(value);
		const fits =
			read !== null && read.length === heights.length && read[0].length === heights[0].length;
		return fits ? read.map((row, r) => row.map((h, c) => (heights[r][c] > 0 ? h : 0))) : holes;
	});

	/**
	 * Une hauteur de 1 à 6, sinon la case est vide ; un caractère refusé est effacé
	 * de la case (sinon l'élève le verrait alors qu'il compte pour une case vide)
	 */
	function writeHeight(r: number, c: number, input: HTMLInputElement) {
		const digit = /^[1-6]$/.test(input.value.trim()) ? Number(input.value.trim()) : null;
		if (digit === null) input.value = '';
		const next = cells.map((row) => [...row]);
		next[r][c] = digit;
		cells = next;
		const nothing = next.every((row, i) => row.every((h, j) => heights[i][j] === 0 || h === null));
		answer?.onChange(nothing ? '' : heightsAnswer(next));
	}

	function rowName(r: number): string {
		if (heights.length === 1) return `rangée ${r + 1}`;
		if (r === 0) return `rangée ${r + 1} (au fond)`;
		return r === heights.length - 1 ? `rangée ${r + 1} (devant)` : `rangée ${r + 1}`;
	}

	// ── correction ────────────────────────────────────────────

	let mistakes = $derived.by<string[]>(() => {
		if (verdict !== false) return [];
		if (task.kind === 'dessiner') return drawingMistakes(value, task.view);
		const phrases = retrouverMistakes(value, expectedCubesAnswer(spec));
		return retrouverHasOtherSolutions(heights, task.views)
			? [...phrases, OTHER_SOLUTIONS]
			: phrases;
	});

	const cm = (units: number) => `${units * ESPACE_CM_PER_UNIT * SCREEN_ZOOM}cm`;
</script>

{#snippet heightsGrid(values: (number | null)[][], editable: boolean)}
	<figure class="flex flex-col items-center gap-1">
		<figcaption class="text-sm font-medium">{VIEW_TITLES.dessus}</figcaption>
		<div
			class="cubes-saisie grid"
			style:grid-template-columns="repeat({heights[0].length}, {cm(1)})"
			style:grid-auto-rows={cm(1)}
		>
			{#each heights as row, r (r)}
				{#each row as h, c (c)}
					{#if h === 0}
						<div class="cubes-trou" aria-hidden="true"></div>
					{:else if editable}
						<input
							class="cubes-saisie-entree h-full w-full border border-foreground bg-background text-center text-lg"
							inputmode="numeric"
							maxlength="1"
							autocomplete="off"
							aria-label="Nombre de cubes, {rowName(r)}, colonne {c + 1}"
							value={values[r][c] ?? ''}
							disabled={locked}
							oninput={(event) => writeHeight(r, c, event.currentTarget)}
						/>
					{:else}
						<div
							class="cubes-saisie-case flex items-center justify-center border border-foreground bg-background text-lg"
						>
							{values[r][c] ?? ''}
						</div>
					{/if}
				{/each}
			{/each}
		</div>
		<span class="text-xs text-muted-foreground">devant</span>
	</figure>
{/snippet}

{#snippet sideView(view: Exclude<CubesView, 'perspective'>)}
	<figure class="flex flex-col items-center gap-1">
		<figcaption class="text-sm font-medium">{VIEW_TITLES[view]}</figcaption>
		<Cubes node={shown(view)} />
	</figure>
{/snippet}

<div class="cubes-geste my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="placer-zone flex flex-wrap items-end justify-center gap-6 rounded-md border p-2"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
	>
		{#if task.kind === 'dessiner' && size !== null}
			{@const width = size.cols + 2 * ESPACE_MARGIN}
			{@const height = size.rows + 2 * ESPACE_MARGIN}
			<Cubes node={shown('perspective')} />
			<figure class="flex flex-col items-center gap-1">
				<figcaption class="text-sm font-medium">{VIEW_TITLES[task.view]}</figcaption>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 {width} {height}"
					role="group"
					aria-label="Quadrillage : {VIEW_TITLES[task.view].toLowerCase()} à colorier"
					class="cubes-quadrillage"
					class:cubes-verrouille={locked}
					style:width={cm(width)}
					style:aspect-ratio="{width} / {height}"
					stroke-width={ESPACE_STROKE}
				>
					{#each grid as row, r (r)}
						{#each row as tile, c (c)}
							<rect
								class="cubes-carreau"
								class:cubes-colorie={tile}
								x={c + ESPACE_MARGIN}
								y={r + ESPACE_MARGIN}
								width="1"
								height="1"
								role="button"
								tabindex={locked ? -1 : 0}
								aria-label={tileName(r, c)}
								aria-pressed={tile}
								aria-disabled={locked}
								onclick={() => toggleTile(r, c)}
								onkeydown={(event) => handleTileKey(event, r, c)}
							/>
						{/each}
					{/each}
				</svg>
			</figure>
		{:else if task.kind === 'retrouver'}
			{@render heightsGrid(cells, !solution)}
			{#each task.views as view (view)}
				{@render sideView(view)}
			{/each}
		{/if}
	</div>

	{#if showControls && !locked && task.kind === 'dessiner'}
		<button
			type="button"
			class="flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-40"
			disabled={!grid.some((row) => row.some(Boolean))}
			onclick={clearTiles}
		>
			Tout effacer
		</button>
	{/if}

	{#if verdict !== null}
		<p class="sr-only" role="status">
			{verdict ? 'réponse juste' : 'réponse fausse'}
		</p>
	{/if}

	{#if verdict === false}
		{#each mistakes as mistake (mistake)}
			<p class="text-sm">{mistake}</p>
		{/each}
		<div class="cubes-correction flex flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			{#if task.kind === 'dessiner'}
				{@render sideView(task.view)}
			{:else}
				{@render heightsGrid(heights, false)}
			{/if}
		</div>
	{/if}
</div>

<style>
	.cubes-quadrillage {
		max-width: 100%;
		height: auto;
		cursor: pointer;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.cubes-verrouille {
		cursor: default;
	}

	.placer-zone {
		border-color: transparent;
	}

	.placer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.placer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.cubes-carreau {
		fill: var(--color-background);
		stroke: color-mix(in srgb, var(--color-foreground) 45%, var(--color-background));
	}

	/* La seule couleur d'accent : les carreaux coloriés (comme ```partage) */
	.cubes-colorie {
		fill: var(--color-fig-orange);
		stroke: var(--color-foreground);
	}

	/*
	 * Focus : un trait, pas un `outline` — dans un SVG, l'outline se compte en
	 * unités du dessin (1 unité = 1 cm) et recouvrirait les carreaux voisins
	 */
	.cubes-carreau:focus {
		outline: none;
	}

	.cubes-carreau:focus-visible {
		stroke: var(--color-ring);
		stroke-width: 0.08;
	}

	.cubes-saisie-entree:focus-visible {
		outline: 3px solid var(--color-ring);
		outline-offset: -2px;
	}
</style>
