<!--
	CourbePlacer — repère à points à placer (```courbe + `placer:`)
	===============================================================

	L'élève pose SES points sur les nœuds de la grille (chantier
	`docs/wip/points-repere-progress.md` § 3, lot 1). Calqué sur la droite à placer
	(`NumberLinePlacer`).

	- Toucher le repère pose le point actif sur le nœud le plus proche (aimant) ;
	  le glisser le déplace ; toucher un point posé le reprend.
	- Plusieurs points (`placer: A=(2 ; 3) ; B=(-1 ; 2)`) : une étiquette-bouton par
	  point sous le repère, un seul actif. Poser un point encore absent active le
	  suivant non placé.
	- Clavier : flèches = un cran de grille sur chaque axe, Début = l'origine (ou le
	  coin bas-gauche). Sans point, la première flèche pose le point de départ.
	- Les coordonnées attendues ne sont JAMAIS dans le DOM avant la correction : le
	  repère dessiné est celui du bloc SANS `placer:`, plus les points de l'élève ;
	  le nom accessible dit la position de l'élève, pas la cible.
	- Dans une question (`answers`, une case par point) : la case porte `x;y`
	  (`pointAnswer`, '' sans point), jugée par le juge ordinaire. Faux : une phrase
	  par point faux et le repère juste à côté, points en vert.
	- Sans `answers` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/CourbePlacer
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { CourbeNode, CourbeTarget } from '$lib/ubumark/types/courbe';
	import { COURBE_PAD, courbeFrame } from '$lib/ubumark/utils/courbe-scene';
	import {
		moveByStep,
		nearestNode,
		placedPointMistake,
		pointAnswer,
		pointText,
		readPointAnswer,
		startNode,
		type CourbePlacedPoint
	} from '$lib/ubumark/utils/courbe-placer';
	import Courbe, { type CourbeMark } from './Courbe.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Repère à placer (`spec.placer` défini) */
		node: CourbeNode;
		/** Une case par point de `placer:`, dans l'ordre écrit */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) */
		showErrors?: boolean;
		/** false : repère seul, sans étiquettes (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	/** Le point de l'élève : la couleur d'accent, jamais le rouge de l'erreur */
	const STUDENT_COLOR = 'bleu';
	/** Le point juste, dans la correction */
	const SOLUTION_COLOR = 'vert';
	/** Distance (px) sous laquelle toucher un point posé le reprend */
	const GRAB_DISTANCE = 18;

	let spec = $derived(node.spec!);
	let targets = $derived<CourbeTarget[]>(node.spec?.placer ?? []);
	let several = $derived(targets.length > 1);

	/**
	 * Position de chaque point : gardée ici, les cases n'en gardent que l'écriture.
	 * Relue seulement quand la valeur d'une case change (case remise à vide,
	 * composant remonté) ; réassignée à chaque geste (dérivé modifiable).
	 */
	let positions = $derived<(CourbePlacedPoint | null)[]>(
		targets.map((_, i) => readPointAnswer(answers?.[i]?.value ?? ''))
	);

	/** Point choisi par l'élève : au départ, le premier point non posé */
	let chosen = $state(untrack(() => Math.max(0, positions.indexOf(null))));
	/** Rang du point que le geste déplace (ramené dans les bornes si le prof retire des points) */
	let active = $derived(Math.min(chosen, Math.max(0, targets.length - 1)));
	let locked = $derived(answers?.some((a) => a.disabled) ?? false);
	let dragging = $state(false);
	/** Le point actif était absent quand le doigt s'est posé : au lever, on passe au suivant */
	let placingNew = false;
	let zone: HTMLDivElement | undefined = $state();

	/** Le bloc sans `placer:` : il se dessine seul (une seule fois par bloc, pour le budget) */
	let base = $derived<CourbeNode>({
		...node,
		spec: { ...spec, placer: undefined },
		caseIndex: undefined
	});

	let marks = $derived<CourbeMark[]>(
		positions.flatMap((p, i) =>
			p === null ? [] : [{ name: targets[i]?.name ?? '', x: p.x, y: p.y, color: STUDENT_COLOR }]
		)
	);

	/** Verdict du repère : faux dès qu'un point l'est, juste quand tous le sont */
	let verdict = $derived.by<boolean | null>(() => {
		if (!answers || answers.length === 0) return null;
		if (answers.some((a) => a.isCorrect === false)) return false;
		return answers.every((a) => a.isCorrect === true) ? true : null;
	});

	/** Points justes : seulement dans la correction, jamais avant */
	let solutionMarks = $derived<CourbeMark[]>(
		verdict === false
			? targets.map((t) => ({ name: t.name, x: t.x, y: t.y, color: SOLUTION_COLOR }))
			: []
	);

	/** Phrases de la correction : une par point faux */
	let mistakes = $derived(
		targets.flatMap((target, i) => {
			if (answers?.[i]?.isCorrect !== false) return [];
			const sentence = placedPointMistake(
				target.name,
				answers[i].value,
				pointAnswer(target.x, target.y)
			);
			return sentence === null ? [] : [sentence];
		})
	);

	let zoneLabel = $derived(several ? 'Repère : tes points' : 'Repère : ton point');
	let valueText = $derived.by(() => {
		const p = positions[active] ?? null;
		const name = targets[active]?.name;
		const label = name ? `point ${name}` : 'point';
		if (p === null) return name ? `${label} pas placé` : 'aucun point';
		return `${label} en ${pointText(p.x, p.y)}`;
	});

	function place(p: CourbePlacedPoint) {
		if (locked) return;
		const current = positions[active];
		if (current && current.x === p.x && current.y === p.y) return;
		positions = positions.with(active, p);
		answers?.[active]?.onChange(pointAnswer(p.x, p.y));
	}

	/** Après la pose d'un point absent : le premier point suivant non placé devient actif */
	function advance() {
		for (let step = 1; step < targets.length; step++) {
			const i = (active + step) % targets.length;
			if (positions[i] === null) {
				chosen = i;
				return;
			}
		}
	}

	/** Cadre de la figure dans la boîte du SVG : échelle de l'écran et marges */
	function frameOf(): { rect: DOMRect; scale: number } | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		const viewBoxWidth = svg.viewBox.baseVal.width;
		if (rect.width === 0 || viewBoxWidth === 0) return null;
		return { rect, scale: rect.width / viewBoxWidth };
	}

	/** Position du doigt en coordonnées mathématiques (pas encore sur un nœud) */
	function valueAt(event: { clientX: number; clientY: number }): CourbePlacedPoint | null {
		const frame = frameOf();
		if (frame === null) return null;
		const { width, height } = courbeFrame(spec.size);
		const w = spec.window;
		const px = (event.clientX - frame.rect.left) / frame.scale - COURBE_PAD;
		const py = (event.clientY - frame.rect.top) / frame.scale - COURBE_PAD;
		return {
			x: w.xMin + (px / width) * (w.xMax - w.xMin),
			y: w.yMax - (py / height) * (w.yMax - w.yMin)
		};
	}

	/** Les points posés à portée du doigt, avec leur distance (px écran) */
	function posedNear(event: {
		clientX: number;
		clientY: number;
	}): { i: number; distance: number }[] {
		const frame = frameOf();
		if (frame === null) return [];
		const { width, height } = courbeFrame(spec.size);
		const w = spec.window;
		return positions.flatMap((p, i) => {
			if (p === null) return [];
			const x =
				frame.rect.left + (COURBE_PAD + ((p.x - w.xMin) / (w.xMax - w.xMin)) * width) * frame.scale;
			const y =
				frame.rect.top + (COURBE_PAD + ((w.yMax - p.y) / (w.yMax - w.yMin)) * height) * frame.scale;
			const distance = Math.hypot(x - event.clientX, y - event.clientY);
			return distance <= GRAB_DISTANCE ? [{ i, distance }] : [];
		});
	}

	/**
	 * Le point posé sous le doigt (le point actif d'abord) ; null si aucun. Point
	 * actif absent : jamais de reprise, le toucher le pose
	 */
	function grabbedAt(event: PointerEvent): number | null {
		if (positions[active] === null) return null;
		const near = posedNear(event);
		if (near.some((p) => p.i === active)) return active;
		near.sort((a, b) => a.distance - b.distance);
		return near[0]?.i ?? null;
	}

	/**
	 * iPhone : doigt posé sur un point, la page ne défile pas, sinon Safari attend
	 * de savoir si le geste défile avant de laisser glisser le point. Écouteur non
	 * passif ; ailleurs, la page défile.
	 */
	function handleTouchStart(event: TouchEvent) {
		if (locked || event.touches.length !== 1) return;
		if (posedNear(event.touches[0]).length > 0) event.preventDefault();
	}

	$effect(() => {
		const el = zone;
		if (!el) return;
		el.addEventListener('touchstart', handleTouchStart, { passive: false });
		return () => el.removeEventListener('touchstart', handleTouchStart);
	});

	function placeAt(event: PointerEvent) {
		const value = valueAt(event);
		if (value !== null) place(nearestNode(spec, value.x, value.y));
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const grabbed = grabbedAt(event);
		if (grabbed !== null) {
			chosen = grabbed;
			placingNew = false;
		} else {
			placingNew = positions[active] === null;
			placeAt(event);
		}
		dragging = true;
		zone?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (dragging) placeAt(event);
	}

	function handlePointerUp() {
		if (dragging && placingNew) advance();
		dragging = false;
		placingNew = false;
	}

	/** Un cran de grille sur chaque axe ; sans point, la première flèche pose le point de départ */
	function stepBy(dx: number, dy: number) {
		const current = positions[active];
		place(current ? moveByStep(spec, current, dx, dy) : startNode(spec));
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1, 0),
			ArrowLeft: () => stepBy(-1, 0),
			ArrowUp: () => stepBy(0, 1),
			ArrowDown: () => stepBy(0, -1),
			Home: () => place(startNode(spec))
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		move();
	}
</script>

<div class="placer-bloc my-2 flex flex-col items-center gap-1 {className}">
	<div
		bind:this={zone}
		class="placer-zone w-full rounded-md border py-3"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
		class:placer-verrouille={locked}
		role="slider"
		tabindex={locked ? -1 : 0}
		aria-label={zoneLabel}
		aria-valuemin={spec.window.xMin}
		aria-valuemax={spec.window.xMax}
		aria-valuenow={positions[active]?.x}
		aria-valuetext={valueText}
		aria-disabled={locked}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<Courbe node={base} {showErrors} {marks} />
	</div>

	{#if showControls && several}
		<div class="flex gap-1" role="group" aria-label="Point à déplacer">
			{#each targets as target, i (target.name)}
				<button
					type="button"
					class="placer-etiquette flex min-h-11 min-w-11 items-center justify-center rounded-md border font-semibold"
					class:placer-etiquette-active={i === active}
					class:placer-etiquette-absente={positions[i] === null}
					aria-label="Point {target.name}"
					aria-pressed={i === active}
					disabled={locked}
					onclick={() => (chosen = i)}
				>
					{target.name}
				</button>
			{/each}
		</div>
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
		<div class="placer-correction flex w-full flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<Courbe node={base} showErrors={false} marks={solutionMarks} />
		</div>
	{/if}
</div>

<style>
	.placer-zone {
		border-color: transparent;
		cursor: pointer;
		/* Le défilement vertical reste à la page ; le doigt posé sur un point le garde
		   (touchstart non passif) */
		touch-action: pan-y;
		/* iPhone : un appui long ouvrirait la loupe et une sélection de texte,
		   qui coupent le glisser (pointercancel) */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.placer-zone:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.placer-verrouille {
		cursor: default;
	}

	.placer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.placer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.placer-etiquette {
		border-color: var(--color-border);
		background: var(--color-background);
	}

	/* Point pas encore posé : bord en pointillés */
	.placer-etiquette-absente {
		border-style: dashed;
	}

	.placer-etiquette-active {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.placer-etiquette:disabled {
		opacity: 0.4;
	}
</style>
