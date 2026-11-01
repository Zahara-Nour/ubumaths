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
	- Plusieurs figures (`unites:`, fractions > 1) : un SVG par figure, côte à côte,
	  rangs à la suite ; « Figure 2, part 3 sur 4 ». Un glissé reste dans la figure
	  où il commence.

	@module components/markdown/nodes/PartageColorier
-->
<script lang="ts">
	import { partageSpecTotal, partageTotal, type PartageNode } from '$lib/ubumark/types/partage';
	import {
		PARTAGE_CM_PER_UNIT,
		PARTAGE_MARGIN,
		PARTAGE_STROKE,
		buildPartageScenes,
		partAtPoint,
		partageFigureLabel
	} from '$lib/ubumark/utils/partage-scene';
	import {
		coloredAnswer,
		coloringMistakes,
		ranksOfAnswer
	} from '$lib/ubumark/utils/partage-colorier';
	import type { BuildCase } from './CollectionConstruire.svelte';

	type ScenePoint = { x: number; y: number };

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
	/** Pas du glissé : le plus petit côté de la figure en 40 pas (4 par part d'une grille 10 × 10) */
	const DRAG_STEPS_PER_SIDE = 40;

	let spec = $derived(node.spec!);
	/** Parts d'une figure, et de toutes les figures */
	let perUnit = $derived(partageTotal(spec.shape));
	let total = $derived(partageSpecTotal(spec));
	let scenes = $derived(buildPartageScenes(spec));
	let width = $derived(scenes[0].width + 2 * PARTAGE_MARGIN);
	let height = $derived(scenes[0].height + 2 * PARTAGE_MARGIN);

	/**
	 * Rangs coloriés : relus quand la valeur de la case change (case remise à vide,
	 * composant remonté), réassignés à chaque geste (dérivé modifiable)
	 */
	let ranks = $derived<number[]>(ranksOfAnswer(answer?.value ?? '', total) ?? []);
	let locked = $derived(answer?.disabled ?? false);
	let verdict = $derived<boolean | null>(answer?.isCorrect ?? null);
	let mistakes = $derived(verdict === false ? coloringMistakes(ranks.length, spec) : []);
	/** Les figures justes : les premières parts coloriées, les unités pleines d'abord */
	let solution = $derived(
		buildPartageScenes({
			...spec,
			gray: Array.from({ length: spec.colorier?.parts ?? 0 }, (_, i) => i + 1)
		})
	);

	/** Geste en cours : true = on colorie, false = on efface ; null hors geste */
	let painting = $state<boolean | null>(null);
	/** Figure du geste en cours (un glissé reste dans sa figure) */
	let activeUnit = 0;
	/** Dernier point du glissé, pour parcourir le segment jusqu'au suivant */
	let lastPoint: ScenePoint | null = null;
	let svgs: (SVGSVGElement | undefined)[] = $state([]);

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

	/** Point sous le doigt, en coordonnées de la scène de la figure `unit` (pas sur le DOM) */
	function scenePoint(
		event: { clientX: number; clientY: number },
		unit: number
	): ScenePoint | null {
		const svg = svgs[unit];
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		return {
			x: ((event.clientX - rect.left) / rect.width) * width - PARTAGE_MARGIN,
			y: ((event.clientY - rect.top) / rect.height) * height - PARTAGE_MARGIN
		};
	}

	function handlePointerDown(event: PointerEvent, unit: number) {
		// Bouton principal, premier doigt : un clic droit ou un second doigt ne colorie rien
		if (locked || event.button !== 0 || !event.isPrimary) return;
		const point = scenePoint(event, unit);
		const rank = point && partAtPoint(scenes[unit], point.x, point.y);
		if (!point || rank === null) return;
		painting = !ranks.includes(rank);
		activeUnit = unit;
		lastPoint = point;
		apply(rank, painting);
		svgs[unit]?.setPointerCapture?.(event.pointerId);
	}

	/**
	 * Le navigateur n'envoie que quelques mouvements pendant un glissé rapide : le
	 * segment depuis le point précédent est parcouru à petits pas, pour qu'aucune
	 * part enjambée ne soit oubliée
	 */
	function handlePointerMove(event: PointerEvent) {
		if (painting === null || !event.isPrimary) return;
		const point = scenePoint(event, activeUnit);
		if (!point) return;
		const scene = scenes[activeUnit];
		const from = lastPoint ?? point;
		const step = Math.min(scene.width, scene.height) / DRAG_STEPS_PER_SIDE;
		const count = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / step));
		for (let i = 1; i <= count; i++) {
			const t = i / count;
			const rank = partAtPoint(
				scene,
				from.x + (point.x - from.x) * t,
				from.y + (point.y - from.y) * t
			);
			if (rank !== null) apply(rank, painting);
		}
		lastPoint = point;
	}

	function handlePointerUp() {
		painting = null;
		lastPoint = null;
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

	/** « Part 3 sur 8, coloriée » ; plusieurs figures : « Figure 2, part 3 sur 4 » */
	function partName(rank: number): string {
		const colored = ranks.includes(rank) ? ', coloriée' : '';
		if (spec.units === 1) return `Part ${rank} sur ${total}${colored}`;
		const unit = Math.ceil(rank / perUnit);
		return `Figure ${unit}, part ${rank - (unit - 1) * perUnit} sur ${perUnit}${colored}`;
	}
</script>

<div class="partage-colorier my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="placer-zone flex flex-wrap justify-center gap-4 rounded-md border p-2"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
	>
		{#each scenes as scene, unit (unit)}
			<svg
				bind:this={svgs[unit]}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 {width} {height}"
				role="group"
				aria-label={partageFigureLabel(spec, unit)}
				class="partage-figure"
				class:partage-verrouillee={locked}
				style:width="{width * PARTAGE_CM_PER_UNIT * SCREEN_ZOOM}cm"
				style:aspect-ratio="{width} / {height}"
				stroke-width={PARTAGE_STROKE}
				stroke-linejoin="round"
				onpointerdown={(event) => handlePointerDown(event, unit)}
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
		{/each}
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
			<div class="flex flex-wrap justify-center gap-4 p-2">
				{#each solution as scene, unit (unit)}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 {width} {height}"
						role="img"
						aria-label="{partageFigureLabel(spec, unit)} : la correction"
						class="partage-figure"
						style:width="{width * PARTAGE_CM_PER_UNIT * SCREEN_ZOOM}cm"
						style:aspect-ratio="{width} / {height}"
						stroke-width={PARTAGE_STROKE}
						stroke-linejoin="round"
					>
						{#each scene.parts as part (part.rank)}
							<polygon
								class="partage-part"
								class:partage-coloriee={part.shaded}
								points={polygonPoints(part.points)}
							/>
						{/each}
					</svg>
				{/each}
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
