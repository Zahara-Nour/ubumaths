<!--
	PartageColorier — figure à colorier (```partage + `colorier:`)
	==============================================================

	L'élève colorie des parts d'une figure partagée en parts égales (fractions,
	CM1 / CM2 ; phase 0 : `docs/wip/fractions-a-colorier-progress.md` § 4, 6).

	- Toucher une part la colorie, la toucher encore l'efface. GLISSER colorie (ou
	  efface) plusieurs parts d'un coup : la première part touchée décide (pointer
	  events, souris et doigt, `touch-action: none` sur la figure).
	- Une seule couleur : celle des parts grises de `Partage.svelte`.
	- Chaque part est un bouton à bascule (`aria-pressed`) : « Part 3 sur 8,
	  coloriée » ; Tab, Espace, Entrée. Le nom de la FIGURE reste la forme seule :
	  la fraction attendue n'est JAMAIS dite ni affichée avant la correction.
	- Dans une question (`answer`) : la réponse de la case est la liste des rangs
	  coloriés (`"1, 4, 6"`, `coloredAnswer`), jugée par `isColoringCorrect`. Faux :
	  la phrase de `coloringMistakes` et la figure juste à côté.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/PartageColorier
-->
<script lang="ts">
	import { partageTotal, type PartageNode } from '$lib/ubumark/types/partage';
	import {
		PARTAGE_CM_PER_UNIT,
		PARTAGE_MARGIN,
		PARTAGE_STROKE,
		buildPartageScene,
		partAtPoint,
		partageLabel
	} from '$lib/ubumark/utils/partage-scene';
	import {
		coloredAnswer,
		coloringMistakes,
		ranksOfAnswer
	} from '$lib/ubumark/utils/partage-colorier';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Figure à colorier (`spec.colorier` défini) */
		node: PartageNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** false : figure seule, sans bouton « Tout effacer » (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answer, showControls = true, class: className = '' }: Props = $props();

	/** À l'écran, un peu plus grande qu'au PDF : une part de grille 10 × 10 reste touchable */
	const SCREEN_ZOOM = 1.15;

	let spec = $derived(node.spec!);
	let total = $derived(partageTotal(spec.shape));
	let scene = $derived(buildPartageScene(spec));
	let label = $derived(partageLabel(spec));
	let width = $derived(scene.width + 2 * PARTAGE_MARGIN);
	let height = $derived(scene.height + 2 * PARTAGE_MARGIN);

	/**
	 * Rangs coloriés : relus quand la valeur de la case change (case remise à vide,
	 * composant remonté), réassignés à chaque geste (dérivé modifiable)
	 */
	let ranks = $derived<number[]>(ranksOfAnswer(answer?.value ?? '', total) ?? []);
	let locked = $derived(answer?.disabled ?? false);
	let verdict = $derived<boolean | null>(answer?.isCorrect ?? null);
	let mistakes = $derived(verdict === false ? coloringMistakes(ranks.length, spec) : []);
	/** La figure juste : les premières parts coloriées */
	let solution = $derived(
		buildPartageScene({
			...spec,
			gray: Array.from({ length: spec.colorier?.parts ?? 0 }, (_, i) => i + 1)
		})
	);

	/** Geste en cours : true = on colorie, false = on efface ; null hors geste */
	let painting = $state<boolean | null>(null);
	let svg: SVGSVGElement | undefined = $state();

	const polygonPoints = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + PARTAGE_MARGIN},${p.y + PARTAGE_MARGIN}`).join(' ');

	function setRanks(next: number[]) {
		ranks = next;
		answer?.onChange(coloredAnswer(next));
	}

	/** Colorie (`paint`) ou efface la part `rank` ; sans effet si elle est déjà dans cet état */
	function apply(rank: number, paint: boolean) {
		if (locked || ranks.includes(rank) === paint) return;
		setRanks(paint ? [...ranks, rank].sort((a, b) => a - b) : ranks.filter((r) => r !== rank));
	}

	/** Part sous le doigt, lue sur la géométrie de la scène (pas sur le DOM) */
	function partUnder(event: { clientX: number; clientY: number }): number | null {
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		const x = ((event.clientX - rect.left) / rect.width) * width - PARTAGE_MARGIN;
		const y = ((event.clientY - rect.top) / rect.height) * height - PARTAGE_MARGIN;
		return partAtPoint(scene, x, y);
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const rank = partUnder(event);
		if (rank === null) return;
		painting = !ranks.includes(rank);
		apply(rank, painting);
		svg?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (painting === null) return;
		const rank = partUnder(event);
		if (rank !== null) apply(rank, painting);
	}

	function handlePointerUp() {
		painting = null;
	}

	function toggle(rank: number) {
		apply(rank, !ranks.includes(rank));
	}

	function handleKeyDown(event: KeyboardEvent, rank: number) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		toggle(rank);
	}

	/** Activation sans pointeur (lecteur d'écran) : un vrai clic a déjà joué à l'appui */
	function handleClick(event: MouseEvent, rank: number) {
		if (event.detail === 0) toggle(rank);
	}

	const partName = (rank: number) =>
		`Part ${rank} sur ${total}${ranks.includes(rank) ? ', coloriée' : ''}`;
</script>

<div class="partage-colorier my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="placer-zone rounded-md border p-2"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
	>
		<svg
			bind:this={svg}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="group"
			aria-label={label}
			class="partage-figure"
			class:partage-verrouillee={locked}
			style:width="{width * PARTAGE_CM_PER_UNIT * SCREEN_ZOOM}cm"
			style:aspect-ratio="{width} / {height}"
			stroke-width={PARTAGE_STROKE}
			stroke-linejoin="round"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
		>
			{#each scene.parts as part (part.rank)}
				<polygon
					class="partage-part"
					class:partage-coloriee={ranks.includes(part.rank)}
					points={polygonPoints(part.points)}
					role="button"
					tabindex={locked ? -1 : 0}
					aria-label={partName(part.rank)}
					aria-pressed={ranks.includes(part.rank)}
					aria-disabled={locked}
					onkeydown={(event) => handleKeyDown(event, part.rank)}
					onclick={(event) => handleClick(event, part.rank)}
				/>
			{/each}
		</svg>
	</div>

	{#if showControls && !locked}
		<button
			type="button"
			class="partage-effacer flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-40"
			disabled={ranks.length === 0}
			onclick={() => setRanks([])}
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
		<div class="placer-correction flex flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<div class="p-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 {width} {height}"
					role="img"
					aria-label="{label} : la correction"
					class="partage-figure"
					style:width="{width * PARTAGE_CM_PER_UNIT * SCREEN_ZOOM}cm"
					style:aspect-ratio="{width} / {height}"
					stroke-width={PARTAGE_STROKE}
					stroke-linejoin="round"
				>
					{#each solution.parts as part (part.rank)}
						<polygon
							class="partage-part"
							class:partage-coloriee={part.shaded}
							points={polygonPoints(part.points)}
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>

<style>
	.partage-figure {
		max-width: 100%;
		height: auto;
		cursor: pointer;
		/* Le doigt glisse pour colorier : la page ne défile pas sur la figure */
		touch-action: none;
		/* iPhone : un appui long ouvrirait la loupe et une sélection de texte */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.partage-verrouillee,
	.placer-correction .partage-figure {
		cursor: default;
		touch-action: auto;
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
	.partage-part {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}

	/* La seule couleur d'accent : les parts coloriées */
	.partage-coloriee {
		fill: var(--color-fig-orange);
	}

	.partage-part:focus-visible {
		outline: 3px solid var(--color-ring);
		outline-offset: -2px;
	}
</style>
