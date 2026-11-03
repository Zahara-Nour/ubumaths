<!--
	SolideGeste — vecteur à tracer sur un solide (```solide + `tracer:`)
	===================================================================

	Chantier `solide-vecteur`, lot 2 (`docs/wip/solide-vecteur-progress.md`, Phase 0,
	points 2 à 5). Le solide est dessiné comme `Solide.svelte` (même scène que le PDF).

	- Les points cliquables (sommets nommés, puis points déclarés) sont des boutons
	  « Point A » posés sur la figure. Toucher un point pose l'origine, puis
	  l'extrémité ; les boutons « Origine » / « Extrémité » choisissent ce que le
	  prochain toucher pose. Dès que les deux sont posés et distincts, une flèche
	  les relie (le dessin d'un vecteur donné, `solideArrowBetween`).
	- Origine imposée (`depuis A`) : A est posée d'office (ni bouton, ni toucher),
	  seul « Extrémité » reste.
	- Réponse de la case : `A/G` (`solideAnswer`). Rien n'est émis avant un toucher :
	  le cadre, le dessin et les noms ne donnent aucune réponse.
	- Faux : la phrase (`solideVectorMistake`, formules rendues en ubumark en ligne)
	  et la flèche juste en vert sur un second dessin.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.
	  `solution` : la flèche juste, sans geste (bonne réponse, verso de la copie).
	- Nom accessible : jamais la forme du solide (cube, pavé…) ni la flèche attendue.

	@module components/markdown/nodes/SolideGeste
-->
<script lang="ts">
	import type { EspaceNode, SolideSpec } from '$lib/ubumark/types/espace';
	import { ESPACE_MARGIN, ESPACE_STROKE } from '$lib/ubumark/utils/espace-scene';
	import {
		SOLIDE_DASH,
		SOLIDE_DOT_RADIUS,
		SOLIDE_LABEL_SIZE,
		SOLIDE_THICK_STROKE,
		buildSolideScene,
		solideArrowBetween,
		solideLabel
	} from '$lib/ubumark/utils/espace-solides';
	import {
		readSolideAnswer,
		solideAnswer,
		solideClickablePoints,
		solidePointAt,
		solideSolutionVector,
		solideVectorMistake,
		type SolideVectorEnds
	} from '$lib/ubumark/utils/solide-gestes';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Solide à geste (`spec.task` défini) */
		node: EspaceNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** La flèche juste, sans geste */
		solution?: boolean;
		/** false : sans bouton « Effacer » (copie corrigée) */
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

	/** Rayon (cm) maximal de la zone qui reçoit le toucher : ~15 px sur la figure de 4 cm */
	const HIT_RADIUS = 0.45;
	/** Rayon (cm) de l'anneau qui montre qu'un point se touche, et du point choisi */
	const RING_RADIUS = 0.15;
	const CHOSEN_RADIUS = 0.2;
	/** La flèche se distingue des arêtes : un peu plus épaisse */
	const ARROW_STROKE = ESPACE_STROKE * 1.4;

	// Seul un solide à geste arrive ici (aiguillage d'`Espace.svelte`, des cases)
	let spec = $derived(node.spec as SolideSpec);
	let task = $derived(spec.task!);
	let scene = $derived(buildSolideScene(spec));
	let clickable = $derived(solideClickablePoints(spec));
	/**
	 * Rayon des zones de toucher : HIT_RADIUS, réduit à la moitié de la plus petite distance
	 * entre deux points à l'écran (pavé aplati, points déclarés serrés) — deux zones qui se
	 * chevauchent donneraient le toucher à la dernière dessinée
	 */
	let hitRadius = $derived.by(() => {
		const at = clickable.map((c) => solidePointAt(scene, c.index));
		let radius = HIT_RADIUS;
		for (let i = 0; i < at.length; i++) {
			for (let j = i + 1; j < at.length; j++) {
				radius = Math.min(radius, Math.hypot(at[i].x - at[j].x, at[i].y - at[j].y) / 2);
			}
		}
		return radius;
	});
	let locked = $derived(solution || (answer?.disabled ?? false));
	let verdict = $derived<boolean | null>(solution ? null : (answer?.isCorrect ?? null));
	let value = $derived(answer?.value ?? '');

	/** Origine imposée (`depuis A`) : son nom, posée d'office ; null : libre */
	let fixedName = $derived(
		task.origin === null ? null : (clickable.find((c) => c.index === task.origin)?.name ?? null)
	);
	let solutionEnds = $derived(solideSolutionVector(spec));

	/** Points au format de l'attribut `points`, marge comprise */
	const pointsOf = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');

	/** Indice (sommets, puis points déclarés) du point de ce nom */
	const indexOf = (name: string | null) => clickable.find((c) => c.name === name)?.index ?? null;

	/**
	 * Origine et extrémité de l'élève : relues quand la valeur de la case change,
	 * réassignées à chaque geste (dérivé modifiable). Origine imposée : posée d'office.
	 */
	let ends = $derived.by<{ from: string | null; to: string | null }>(() => {
		const read = readSolideAnswer(value);
		return { from: fixedName ?? read.from, to: read.to };
	});

	/** Ce que pose le prochain toucher ; origine imposée : toujours l'extrémité */
	let chosen = $state<'from' | 'to'>('from');
	let active = $derived(fixedName === null ? chosen : 'to');

	/** La flèche de l'élève, dès que ses deux bouts sont posés et distincts */
	let drawn = $derived.by<SolideVectorEnds | null>(() => {
		const from = indexOf(ends.from);
		const to = indexOf(ends.to);
		return from === null || to === null || from === to ? null : { from, to };
	});

	/** Rien à effacer : ni extrémité, ni origine libre */
	let nothing = $derived(ends.to === null && (fixedName !== null || ends.from === null));

	function arrowOf(arrow: SolideVectorEnds) {
		return solideArrowBetween(solidePointAt(scene, arrow.from), solidePointAt(scene, arrow.to));
	}

	function pick(name: string) {
		if (locked) return;
		ends = active === 'from' ? { from: name, to: ends.to } : { from: ends.from, to: name };
		if (active === 'from') chosen = 'to';
		answer?.onChange(solideAnswer(ends.from, ends.to));
	}

	function handlePointKey(event: KeyboardEvent, name: string) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		pick(name);
	}

	function clearAll() {
		if (locked) return;
		ends = { from: fixedName, to: null };
		chosen = 'from';
		answer?.onChange('');
	}

	let mistake = $derived(verdict === false ? solideVectorMistake(value, spec) : null);

	/** Nom accessible d'un point : son état dit s'il est l'origine ou l'extrémité */
	function pointLabel(name: string): string {
		if (name === ends.from) return `Point ${name}, origine`;
		if (name === ends.to) return `Point ${name}, extrémité`;
		return `Point ${name}`;
	}
</script>

{#snippet figure(arrow: SolideVectorEnds | null, kind: 'eleve' | 'juste', markers: boolean)}
	{@const width = scene.width + 2 * ESPACE_MARGIN}
	{@const height = scene.height + 2 * ESPACE_MARGIN}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 {width} {height}"
		role="group"
		aria-label={markers ? `${solideLabel(spec)}, points à toucher` : solideLabel(spec)}
		class="solide-figure"
		class:solide-verrouille={locked}
		style:width="{width}cm"
		style:aspect-ratio="{width} / {height}"
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#each scene.fills as fill, i (i)}
			<polygon class="solide-face-marquee" points={pointsOf(fill)} />
		{/each}
		{#if scene.section}
			<polygon class="solide-section" points={pointsOf(scene.section)} />
		{/if}
		{#each scene.lines as line, i (i)}
			<polyline
				class="solide-trait"
				points={pointsOf(line.points)}
				stroke-width={line.thick ? SOLIDE_THICK_STROKE : ESPACE_STROKE}
				stroke-dasharray={line.dashed ? SOLIDE_DASH.join(' ') : undefined}
			/>
		{/each}
		{#each scene.arrows as given, i (i)}
			<line
				class="solide-trait"
				x1={given.shaft[0].x + ESPACE_MARGIN}
				y1={given.shaft[0].y + ESPACE_MARGIN}
				x2={given.shaft[1].x + ESPACE_MARGIN}
				y2={given.shaft[1].y + ESPACE_MARGIN}
				stroke-width={given.small ? ESPACE_STROKE * 0.8 : ESPACE_STROKE}
			/>
			<polygon class="solide-pointe" points={pointsOf(given.head)} />
		{/each}
		{#each scene.dots as dot, i (i)}
			<circle
				class="solide-point"
				cx={dot.x + ESPACE_MARGIN}
				cy={dot.y + ESPACE_MARGIN}
				r={SOLIDE_DOT_RADIUS}
			/>
		{/each}
		{#each scene.labels as label, i (i)}
			<text
				class="solide-etiquette"
				x={label.at.x + ESPACE_MARGIN}
				y={label.at.y + ESPACE_MARGIN}
				font-size={SOLIDE_LABEL_SIZE}
				text-anchor="middle"
				dominant-baseline="central">{label.text}</text
			>
		{/each}
		{#if markers}
			{#each clickable as c (c.index)}
				{@const at = solidePointAt(scene, c.index)}
				{@const isFrom = c.name === ends.from}
				{@const isTo = c.name === ends.to}
				{#if c.name === fixedName}
					<!-- Origine imposée : posée d'office, ni touchée ni reprise -->
					<circle
						class="solide-choisi solide-origine"
						cx={at.x + ESPACE_MARGIN}
						cy={at.y + ESPACE_MARGIN}
						r={CHOSEN_RADIUS}
					/>
				{:else}
					<!-- Anneau qui dit « ce point se touche » ; l'extrémité le garde : un disque bleu cacherait
					     la pointe de la flèche -->
					<circle
						class="solide-anneau"
						class:solide-choisi={isFrom}
						cx={at.x + ESPACE_MARGIN}
						cy={at.y + ESPACE_MARGIN}
						r={isFrom ? CHOSEN_RADIUS : RING_RADIUS}
					/>
					<!-- Zone de toucher confortable (doigt), invisible, autour de l'anneau -->
					<circle
						class="solide-cliquable"
						cx={at.x + ESPACE_MARGIN}
						cy={at.y + ESPACE_MARGIN}
						r={hitRadius}
						role="button"
						tabindex={locked ? -1 : 0}
						aria-label={pointLabel(c.name)}
						aria-pressed={isFrom || isTo}
						aria-disabled={locked}
						onclick={() => pick(c.name)}
						onkeydown={(event) => handlePointKey(event, c.name)}
					/>
				{/if}
			{/each}
		{/if}
		<!-- Flèche par-dessus les points : sa pointe reste visible sur le point choisi -->
		{#if arrow !== null}
			{@const drawing = arrowOf(arrow)}
			<g class={kind === 'juste' ? 'solide-fleche-juste' : 'solide-fleche-eleve'}>
				<line
					class="solide-fleche-trait"
					x1={drawing.shaft[0].x + ESPACE_MARGIN}
					y1={drawing.shaft[0].y + ESPACE_MARGIN}
					x2={drawing.shaft[1].x + ESPACE_MARGIN}
					y2={drawing.shaft[1].y + ESPACE_MARGIN}
					stroke-width={ARROW_STROKE}
				/>
				<polygon class="solide-fleche-pointe" points={pointsOf(drawing.head)} />
			</g>
		{/if}
	</svg>
{/snippet}

<div class="solide-geste my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="solide-cadre flex flex-col items-center gap-1 rounded-md border p-2"
		class:solide-juste={verdict === true}
		class:solide-faux={verdict === false}
	>
		{#if solution}
			<!-- La réponse juste : la flèche en vert, rien à toucher -->
			{@render figure(solutionEnds, 'juste', false)}
		{:else}
			{@render figure(drawn, 'eleve', true)}
		{/if}
	</div>

	{#if showControls && !locked}
		<div class="flex flex-wrap justify-center gap-1" role="group" aria-label="Ce que tu places">
			{#if fixedName === null}
				<button
					type="button"
					class="solide-bouton"
					class:solide-bouton-actif={active === 'from'}
					class:solide-bouton-absent={ends.from === null}
					aria-pressed={active === 'from'}
					aria-label={ends.from === null ? 'Origine' : `Origine : point ${ends.from}`}
					onclick={() => (chosen = 'from')}
				>
					Origine
				</button>
			{/if}
			<button
				type="button"
				class="solide-bouton"
				class:solide-bouton-actif={active === 'to'}
				class:solide-bouton-absent={ends.to === null}
				aria-pressed={active === 'to'}
				aria-label={ends.to === null ? 'Extrémité' : `Extrémité : point ${ends.to}`}
				onclick={() => (chosen = 'to')}
			>
				Extrémité
			</button>
			<button type="button" class="solide-bouton" disabled={nothing} onclick={clearAll}>
				Effacer
			</button>
		</div>
	{/if}

	{#if verdict !== null}
		<p class="sr-only" role="status">
			{verdict ? 'réponse juste' : 'réponse fausse'}
		</p>
	{/if}

	{#if verdict === false}
		{#if mistake !== null}
			<p class="text-sm"><InlineMarkdown content={mistake.text} /></p>
		{/if}
		{#if solutionEnds !== null}
			<div class="solide-correction flex flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				{@render figure(solutionEnds, 'juste', false)}
			</div>
		{/if}
	{/if}
</div>

<style>
	.solide-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.solide-cadre {
		border-color: transparent;
	}

	.solide-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.solide-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.solide-trait {
		stroke: var(--color-foreground);
	}

	/* Face marquée : translucide, les arêtes cachées restent visibles à travers */
	.solide-face-marquee {
		fill: color-mix(in srgb, var(--color-foreground) 18%, transparent);
		stroke: none;
	}

	.solide-section {
		fill: color-mix(in srgb, var(--color-fig-orange) 40%, transparent);
		stroke: none;
	}

	.solide-point,
	.solide-pointe,
	.solide-etiquette {
		fill: var(--color-foreground);
		stroke: none;
	}

	/* Les noms et les traits ne reçoivent jamais le toucher */
	.solide-trait,
	.solide-point,
	.solide-pointe,
	.solide-etiquette,
	.solide-fleche-eleve,
	.solide-fleche-juste {
		pointer-events: none;
	}

	/* La seule couleur d'accent : la flèche de l'élève et ses deux points ; la juste en vert */
	.solide-fleche-eleve {
		--fleche: var(--color-fig-bleu);
	}

	.solide-fleche-juste {
		--fleche: var(--color-fig-vert);
	}

	.solide-fleche-trait {
		stroke: var(--fleche);
	}

	.solide-fleche-pointe {
		fill: var(--fleche);
		stroke: none;
	}

	/* Anneau qui dit « ce point se touche » */
	.solide-anneau {
		fill: var(--color-background);
		stroke: color-mix(in srgb, var(--color-foreground) 60%, transparent);
		stroke-width: 0.04;
		pointer-events: none;
	}

	/* stroke-width explicite : sinon 1 unité du viewBox, soit 1 cm (disque géant) */
	.solide-choisi {
		fill: var(--color-fig-bleu);
		stroke: var(--color-fig-bleu);
		stroke-width: 0.04;
	}

	.solide-origine {
		pointer-events: none;
	}

	/* Zone de toucher invisible, plus large que l'anneau */
	.solide-cliquable {
		fill: transparent;
		stroke: none;
		cursor: pointer;
	}

	.solide-verrouille .solide-cliquable {
		cursor: default;
	}

	/*
	 * Focus : un trait, pas un `outline` — dans un SVG, l'outline se compte en
	 * unités du dessin (1 unité = 1 cm)
	 */
	.solide-cliquable:focus {
		outline: none;
	}

	.solide-cliquable:focus-visible {
		stroke: var(--color-ring);
		stroke-width: 0.06;
	}

	.solide-bouton {
		display: flex;
		min-height: 2.75rem;
		min-width: 2.75rem;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
		padding: 0 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.solide-bouton:hover:not(:disabled) {
		background: var(--color-muted);
	}

	/* Bout pas encore posé : bord en pointillés */
	.solide-bouton-absent {
		border-style: dashed;
	}

	.solide-bouton-actif {
		border-color: var(--color-fig-bleu);
		background: var(--color-fig-bleu);
		color: var(--color-background);
	}

	.solide-bouton:disabled {
		opacity: 0.4;
	}
</style>
