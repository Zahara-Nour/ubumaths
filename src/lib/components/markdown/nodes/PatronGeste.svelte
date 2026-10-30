<!--
	PatronGeste — patron à geste (```patron + `designer:` / `completer:`)
	=====================================================================

	Chantier `solides`, lot 5 (`docs/wip/solides-progress.md` § 10).

	- `designer: opposee` (`voisines`, `sommet A`, `face EFGH`) : le patron du
	  lot 4 ; toucher une face la sélectionne, la retoucher la désélectionne
	  (Espace, Entrée au clavier). Rien ne dit combien de faces toucher. Réponse
	  de la case : les numéros des faces touchées (`2,4`, `facesAnswer`).
	- `completer: 4` : les faces données sur un quadrillage, en pointillés les
	  cases vides qui touchent une face ; toucher un emplacement y pose une face,
	  retoucher une face posée la retire. Réponse : le quadrillage
	  (`0010/0112/0010`, `completerAnswer`), juste si tout se plie en cube.
	- Faux : les phrases de la correction et la réponse du prof dessous.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.
	  `solution` : la réponse juste, sans geste (bonne réponse, verso de la copie).
	- Nom accessible : jamais « patron » ni le nom du solide (ce serait la réponse).

	@module components/markdown/nodes/PatronGeste
-->
<script lang="ts">
	import type { EspaceNode, PatronSpec } from '$lib/ubumark/types/espace';
	import { ESPACE_MARGIN, ESPACE_STROKE } from '$lib/ubumark/utils/espace-scene';
	import {
		SOLIDE_DASH,
		SOLIDE_DOT_RADIUS,
		SOLIDE_LABEL_SIZE
	} from '$lib/ubumark/utils/espace-solides';
	import {
		PATRON_FOLD_STROKE,
		buildPatronScene,
		patronLabel
	} from '$lib/ubumark/utils/espace-patrons';
	import {
		OTHER_SOLUTIONS,
		completerAnswer,
		completerHasOtherSolutions,
		completerMistakes,
		completerSpots,
		designerMistakes,
		expectedPatronAnswer,
		facesAnswer,
		givenFrame,
		readCompleterAnswer,
		readFacesAnswer,
		type CompleterCell
	} from '$lib/ubumark/utils/patron-gestes';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Patron à geste (`spec.task` défini) */
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

	/** Côté d'une case du quadrillage de `completer:`, en cm */
	const CELL_CM = 1.2;

	// Seul un patron à geste arrive ici (aiguillage d'`Espace.svelte`, des cases)
	let spec = $derived(node.spec as PatronSpec);
	let task = $derived(spec.task!);
	let expected = $derived(expectedPatronAnswer(spec));
	let locked = $derived(solution || (answer?.disabled ?? false));
	let verdict = $derived<boolean | null>(solution ? null : (answer?.isCorrect ?? null));
	let value = $derived(answer?.value ?? '');

	/** Points au format de l'attribut `points`, marge comprise */
	const pointsOf = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');

	// ── designer ──────────────────────────────────────────────

	let scene = $derived(task.kind === 'designer' ? buildPatronScene(spec) : null);
	let wantedFaces = $derived(task.kind === 'designer' ? task.faces : []);

	/**
	 * Faces touchées : relues quand la valeur de la case change, réassignées à
	 * chaque geste (dérivé modifiable)
	 */
	let touched = $derived.by<number[]>(() => {
		if (solution) return [...wantedFaces];
		const count = scene?.faces.length ?? 0;
		return (readFacesAnswer(value) ?? []).filter((i) => i < count);
	});

	function toggleFace(i: number) {
		if (locked) return;
		const next = touched.includes(i) ? touched.filter((f) => f !== i) : [...touched, i];
		touched = next;
		answer?.onChange(facesAnswer(next));
	}

	function handleFaceKey(event: KeyboardEvent, i: number) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		toggleFace(i);
	}

	// ── completer ─────────────────────────────────────────────

	let wantedFrame = $derived(
		task.kind === 'completer' ? (readCompleterAnswer(expected) ?? []) : []
	);
	let toPlace = $derived(wantedFrame.flat().filter((c) => c === 2).length);

	/**
	 * Quadrillage : relu quand la valeur de la case change, réassigné à chaque
	 * geste ; une réponse d'une autre taille est ignorée à l'écran (l'interface
	 * n'en produit pas ; le juge, lui, lit la valeur telle quelle)
	 */
	let frame = $derived.by<CompleterCell[][]>(() => {
		if (solution) return wantedFrame.map((row) => [...row]);
		const read = readCompleterAnswer(value);
		const fits =
			read !== null &&
			read.length === wantedFrame.length &&
			read[0].length === wantedFrame[0]?.length;
		return fits ? read : givenFrame(wantedFrame);
	});
	let placed = $derived(frame.flat().filter((c) => c === 2).length);
	let spots = $derived(locked || placed >= toPlace ? [] : completerSpots(frame));

	function setCell(r: number, c: number, cell: CompleterCell) {
		if (locked) return;
		const next = frame.map((row) => [...row]);
		next[r][c] = cell;
		frame = next;
		answer?.onChange(completerAnswer(next));
	}

	function handleCellKey(event: KeyboardEvent, r: number, c: number, cell: CompleterCell) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		setCell(r, c, cell);
	}

	// ── commun ────────────────────────────────────────────────

	let nothing = $derived(task.kind === 'designer' ? touched.length === 0 : placed === 0);

	function clearAll() {
		if (task.kind === 'designer') touched = [];
		else frame = givenFrame(wantedFrame);
		answer?.onChange('');
	}

	let mistakes = $derived.by<string[]>(() => {
		if (verdict !== false) return [];
		if (task.kind === 'designer') return designerMistakes(value, task.target);
		const phrases = completerMistakes(value, expected);
		return completerHasOtherSolutions(expected) ? [...phrases, OTHER_SOLUTIONS] : phrases;
	});
</script>

{#snippet facesFigure(selected: number[], interactive: boolean)}
	{#if scene !== null}
		{@const width = scene.width + 2 * ESPACE_MARGIN}
		{@const height = scene.height + 2 * ESPACE_MARGIN}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="group"
			aria-label="{patronLabel(spec)}, faces à toucher"
			class="patron-figure"
			class:patron-verrouille={!interactive}
			style:width="{width}cm"
			style:aspect-ratio="{width} / {height}"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			{#each scene.fills as fill, i (i)}
				<polygon class="patron-face-marquee" points={pointsOf(fill)} />
			{/each}
			{#each scene.faces as face, i (i)}
				<polygon
					class="patron-face"
					class:patron-touchee={selected.includes(i)}
					points={pointsOf(face)}
					role="button"
					tabindex={interactive ? 0 : -1}
					aria-label="Face {i + 1}{selected.includes(i) ? ', touchée' : ''}"
					aria-pressed={selected.includes(i)}
					aria-disabled={!interactive}
					onclick={() => interactive && toggleFace(i)}
					onkeydown={(event) => interactive && handleFaceKey(event, i)}
				/>
			{/each}
			{#each scene.lines as line, i (i)}
				<polyline
					class="patron-trait"
					points={pointsOf(line.points)}
					stroke-width={line.kind === 'pli' ? PATRON_FOLD_STROKE : ESPACE_STROKE}
					stroke-dasharray={line.kind === 'cache' ? SOLIDE_DASH.join(' ') : undefined}
				/>
			{/each}
			{#each scene.dots as dot, i (i)}
				<circle
					class="patron-point"
					cx={dot.x + ESPACE_MARGIN}
					cy={dot.y + ESPACE_MARGIN}
					r={SOLIDE_DOT_RADIUS}
				/>
			{/each}
			{#each scene.labels as label, i (i)}
				<text
					class="patron-etiquette"
					x={label.at.x + ESPACE_MARGIN}
					y={label.at.y + ESPACE_MARGIN}
					font-size={SOLIDE_LABEL_SIZE}
					text-anchor="middle"
					dominant-baseline="central">{label.text}</text
				>
			{/each}
		</svg>
	{/if}
{/snippet}

{#snippet frameFigure(cells: CompleterCell[][], places: [number, number][], interactive: boolean)}
	{@const width = (cells[0]?.length ?? 0) + 2 * ESPACE_MARGIN}
	{@const height = cells.length + 2 * ESPACE_MARGIN}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 {width} {height}"
		role="group"
		aria-label="Assemblage de carrés à plier, faces à poser"
		class="patron-figure"
		class:patron-verrouille={!interactive}
		style:width="{width * CELL_CM}cm"
		style:aspect-ratio="{width} / {height}"
		stroke-width={ESPACE_STROKE}
	>
		{#each places as [r, c] (`${r},${c}`)}
			<rect
				class="patron-emplacement"
				x={c + ESPACE_MARGIN}
				y={r + ESPACE_MARGIN}
				width="1"
				height="1"
				stroke-dasharray={SOLIDE_DASH.join(' ')}
				role="button"
				tabindex="0"
				aria-label="Emplacement rangée {r + 1}, colonne {c + 1}, vide"
				onclick={() => setCell(r, c, 2)}
				onkeydown={(event) => handleCellKey(event, r, c, 2)}
			/>
		{/each}
		{#each cells as row, r (r)}
			{#each row as cell, c (c)}
				{#if cell === 1}
					<rect
						class="patron-carre"
						x={c + ESPACE_MARGIN}
						y={r + ESPACE_MARGIN}
						width="1"
						height="1"
					/>
				{:else if cell === 2}
					<rect
						class="patron-carre patron-touchee"
						x={c + ESPACE_MARGIN}
						y={r + ESPACE_MARGIN}
						width="1"
						height="1"
						role="button"
						tabindex={interactive ? 0 : -1}
						aria-label="Face posée rangée {r + 1}, colonne {c + 1}"
						aria-disabled={!interactive}
						onclick={() => interactive && setCell(r, c, 0)}
						onkeydown={(event) => interactive && handleCellKey(event, r, c, 0)}
					/>
				{/if}
			{/each}
		{/each}
	</svg>
{/snippet}

<div class="patron-geste my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="placer-zone flex flex-col items-center gap-1 rounded-md border p-2"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
	>
		{#if task.kind === 'designer'}
			{@render facesFigure(touched, !locked)}
		{:else}
			{@render frameFigure(frame, spots, !locked)}
			{#if !locked}
				<p class="text-sm text-muted-foreground" aria-live="polite">
					Faces à poser : {toPlace - placed}
				</p>
			{/if}
		{/if}
	</div>

	{#if showControls && !locked}
		<button
			type="button"
			class="flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-40"
			disabled={nothing}
			onclick={clearAll}
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
		<div class="patron-correction flex flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			{#if task.kind === 'designer'}
				{@render facesFigure(wantedFaces, false)}
			{:else}
				{@render frameFigure(wantedFrame, [], false)}
			{/if}
		</div>
	{/if}
</div>

<style>
	.patron-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
		cursor: pointer;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.patron-verrouille {
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
	.patron-trait {
		stroke: var(--color-foreground);
	}

	.patron-face {
		fill: transparent;
		stroke: none;
	}

	.patron-face-marquee {
		fill: color-mix(in srgb, var(--color-foreground) 18%, transparent);
		stroke: none;
	}

	.patron-carre {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}

	.patron-emplacement {
		fill: transparent;
		stroke: color-mix(in srgb, var(--color-foreground) 45%, var(--color-background));
	}

	/* La seule couleur d'accent : les faces touchées ou posées (comme ```cubes) */
	.patron-touchee {
		fill: color-mix(in srgb, var(--color-fig-orange) 70%, transparent);
	}

	.patron-point,
	.patron-etiquette {
		fill: var(--color-foreground);
		stroke: none;
	}

	/*
	 * Focus : un trait, pas un `outline` — dans un SVG, l'outline se compte en
	 * unités du dessin (1 unité = 1 cm) et recouvrirait tout le patron
	 */
	.patron-face:focus,
	.patron-emplacement:focus,
	.patron-carre:focus {
		outline: none;
	}

	.patron-face:focus-visible,
	.patron-emplacement:focus-visible,
	.patron-carre:focus-visible {
		stroke: var(--color-ring);
		stroke-width: 0.08;
		stroke-dasharray: none;
	}
</style>
