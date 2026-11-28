<!--
	CourbeConstruire — escalier à construire (```courbe + `construire N`)
	====================================================================

	L'élève construit u₁…u_N d'une suite récurrente u(n+1) = f(u(n)) (outil 48,
	`docs/wip/outil-escalier-suite-progress.md`). Le repère montre la courbe de f, la
	droite y = x et u₀ marqué sur l'axe des abscisses ; jamais les termes suivants
	(ils sont la réponse) avant la correction.

	- Toucher l'axe (n'importe où dans le repère : seule l'abscisse compte) pose le
	  terme actif sur l'axe, à l'abscisse touchée, arrondie (au plus 1 % de la
	  largeur) ; le glisser le déplace ; toucher un terme posé le reprend.
	- Une étiquette-bouton par terme (u₁, u₂…) sous le repère, un seul actif. Poser un
	  terme encore absent active le suivant non placé.
	- La marche DE L'ÉLÈVE se dessine après chaque terme : monter à la hauteur de son
	  terme, aller à la droite y = x, redescendre à l'axe ; un terme absent arrête le
	  dessin. Elle ne dit pas la réponse : un coin hors de la courbe se voit, comme au
	  crayon.
	- Clavier : flèches gauche / droite = un pas d'arrondi ; sans terme, la première
	  flèche le pose sur le terme précédent.
	- Dans une question (`answers`, une case par terme) : la case k porte la chaîne
	  des termes de l'élève jusqu'à k (`staircaseAnswer`), jugée depuis SON terme
	  k − 1. Faux : une phrase par terme faux et le vrai escalier en vert.

	@module components/markdown/nodes/CourbeConstruire
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { CourbeNode } from '#lib/ubumark/types/courbe.ts';
	import { COURBE_PAD, courbeFrame } from '#lib/ubumark/utils/courbe-scene.ts';
	import {
		abscissaAxisY,
		moveAbscissa,
		readStaircaseAnswer,
		snapAbscissa,
		solutionCobweb,
		staircaseAnswer,
		staircaseMistake,
		studentCobweb,
		termName,
		twoDecimals
	} from '#lib/ubumark/utils/courbe-construire.ts';
	import Courbe, { type CourbeMark, type CourbeTrace } from './Courbe.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Repère à escalier à construire (`spec.construire` défini) */
		node: CourbeNode;
		/** Une case par terme à construire, dans l'ordre (u₁, u₂…) */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) */
		showErrors?: boolean;
		/** false : repère seul, sans étiquettes (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	/** Les termes de l'élève : la couleur d'accent, jamais le rouge de l'erreur */
	const STUDENT_COLOR = 'bleu';
	/** Le vrai escalier, dans la correction */
	const SOLUTION_COLOR = 'vert' as const;
	/** Distance (px) sous laquelle toucher un terme posé le reprend */
	const GRAB_DISTANCE = 18;

	let spec = $derived(node.spec!);
	let build = $derived(spec.construire!);
	let count = $derived(build.terms.length);
	/** Ordonnée de l'axe des abscisses tel qu'il est dessiné */
	let axisY = $derived(abscissaAxisY(spec.window));
	/** Noms des termes à construire : u₁, u₂… */
	let slots = $derived(
		Array.from({ length: count }, (_, i) => termName(build.sequenceName, build.firstIndex + i + 1))
	);

	/**
	 * Terme de chaque case : le dernier de sa chaîne. Relu quand la valeur d'une case
	 * change ; réassigné à chaque geste (dérivé modifiable)
	 */
	let positions = $derived.by<(number | null)[]>(() =>
		Array.from(
			{ length: count },
			(_, i) => readStaircaseAnswer(answers?.[i]?.value ?? '')[i] ?? null
		)
	);

	/** Terme choisi par l'élève : au départ, le premier non posé */
	let chosen = $state(untrack(() => Math.max(0, positions.indexOf(null))));
	let active = $derived(Math.min(chosen, Math.max(0, count - 1)));
	let locked = $derived(answers?.some((a) => a.disabled) ?? false);
	let dragging = $state(false);
	/** Le terme actif était absent quand le doigt s'est posé : au lever, on passe au suivant */
	let placingNew = false;
	let zone: HTMLDivElement | undefined = $state();

	/** Le bloc sans le geste : courbe, y = x, u₀ (une seule figure par bloc, pour le budget) */
	let base = $derived<CourbeNode>({
		...node,
		spec: { ...spec, construire: undefined },
		caseIndex: undefined
	});

	/** Les termes posés, sur l'axe, nommés */
	let marks = $derived<CourbeMark[]>(
		positions.flatMap((x, i) =>
			x === null ? [] : [{ name: slots[i], x, y: axisY, color: STUDENT_COLOR }]
		)
	);

	/** La marche de l'élève, jusqu'au premier terme absent */
	let traces = $derived<CourbeTrace[]>(
		studentCobweb(build.start, positions, axisY).map((s) => ({ ...s, color: STUDENT_COLOR }))
	);

	/** Verdict du repère : faux dès qu'un terme l'est, juste quand tous le sont */
	let verdict = $derived.by<boolean | null>(() => {
		if (!answers || answers.length === 0) return null;
		if (answers.some((a) => a.isCorrect === false)) return false;
		return answers.every((a) => a.isCorrect === true) ? true : null;
	});

	/** Le vrai escalier : seulement dans la correction, jamais avant */
	let solutionTraces = $derived<CourbeTrace[]>(
		verdict === false
			? solutionCobweb(build, spec.window).map((s) => ({ ...s, color: SOLUTION_COLOR }))
			: []
	);
	let solutionMarks = $derived<CourbeMark[]>(
		verdict === false
			? build.terms.map((x, i) => ({ name: slots[i], x, y: axisY, color: SOLUTION_COLOR }))
			: []
	);

	/** Phrases de la correction : une par terme faux */
	let mistakes = $derived<string[]>(
		(answers ?? []).flatMap((answer, i) => {
			if (answer.isCorrect !== false) return [];
			const sentence = staircaseMistake(build, i + 1, answer.value);
			return sentence === null ? [] : [sentence];
		})
	);

	let valueText = $derived.by(() => {
		const x = positions[active] ?? null;
		const name = slots[active] ?? '';
		return x === null ? `${name} pas placé` : `${name} en ${twoDecimals(x)}`;
	});

	function place(x: number) {
		if (locked) return;
		if (positions[active] === x) return;
		positions = positions.with(active, x);
		// La chaîne de chaque case suivante change aussi (elle contient ce terme)
		positions.forEach((_, i) => {
			const value = staircaseAnswer(positions, i + 1);
			if (answers?.[i] && answers[i].value !== value) answers[i].onChange(value);
		});
	}

	/** Après la pose d'un terme absent : le premier terme suivant non placé devient actif */
	function advance() {
		for (let step = 1; step < count; step++) {
			const i = (active + step) % count;
			if (positions[i] === null) {
				chosen = i;
				return;
			}
		}
	}

	/** Cadre de la figure dans la boîte du SVG : échelle de l'écran */
	function frameOf(): { rect: DOMRect; scale: number } | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		const viewBoxWidth = svg.viewBox.baseVal.width;
		if (rect.width === 0 || viewBoxWidth === 0) return null;
		return { rect, scale: rect.width / viewBoxWidth };
	}

	/** Abscisse du doigt, en coordonnées mathématiques (pas encore arrondie) */
	function abscissaAt(event: { clientX: number }): number | null {
		const frame = frameOf();
		if (frame === null) return null;
		const { width } = courbeFrame(spec.size);
		const w = spec.window;
		const px = (event.clientX - frame.rect.left) / frame.scale - COURBE_PAD;
		return w.xMin + (px / width) * (w.xMax - w.xMin);
	}

	/** Les termes posés à portée du doigt, avec leur distance (px écran) */
	function posedNear(event: {
		clientX: number;
		clientY: number;
	}): { i: number; distance: number }[] {
		const frame = frameOf();
		if (frame === null) return [];
		const { width, height } = courbeFrame(spec.size);
		const w = spec.window;
		const y =
			frame.rect.top + (COURBE_PAD + ((w.yMax - axisY) / (w.yMax - w.yMin)) * height) * frame.scale;
		return positions.flatMap((p, i) => {
			if (p === null) return [];
			const x =
				frame.rect.left + (COURBE_PAD + ((p - w.xMin) / (w.xMax - w.xMin)) * width) * frame.scale;
			const distance = Math.hypot(x - event.clientX, y - event.clientY);
			return distance <= GRAB_DISTANCE ? [{ i, distance }] : [];
		});
	}

	/** Le terme posé sous le doigt (l'actif d'abord) ; null si aucun, ou si l'actif est absent */
	function grabbedAt(event: PointerEvent): number | null {
		if (positions[active] === null) return null;
		const near = posedNear(event);
		if (near.some((p) => p.i === active)) return active;
		near.sort((a, b) => a.distance - b.distance);
		return near[0]?.i ?? null;
	}

	/** iPhone : doigt posé sur un terme, la page ne défile pas (écouteur non passif) */
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
		const x = abscissaAt(event);
		if (x !== null) place(snapAbscissa(spec.window, x));
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

	/** Un pas d'arrondi ; sans terme, la première flèche le pose sur le terme précédent */
	function stepBy(direction: number) {
		const current = positions[active];
		if (current !== null) {
			place(moveAbscissa(spec.window, current, direction));
			return;
		}
		const previous = active === 0 ? build.start : (positions[active - 1] ?? build.start);
		place(snapAbscissa(spec.window, previous));
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1),
			ArrowLeft: () => stepBy(-1)
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		move();
	}
</script>

<div class="construire-bloc my-2 flex flex-col items-center gap-1 {className}">
	<div
		bind:this={zone}
		class="construire-zone w-full rounded-md border py-3"
		class:construire-juste={verdict === true}
		class:construire-faux={verdict === false}
		class:construire-verrouille={locked}
		role="slider"
		tabindex={locked ? -1 : 0}
		aria-label="Repère : les termes de ton escalier, sur l’axe des abscisses"
		aria-valuemin={spec.window.xMin}
		aria-valuemax={spec.window.xMax}
		aria-valuenow={positions[active] ?? undefined}
		aria-valuetext={valueText}
		aria-disabled={locked}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<Courbe node={base} {showErrors} {marks} {traces} />
	</div>

	{#if showControls && count > 1}
		<div class="flex gap-1" role="group" aria-label="Terme à placer">
			{#each slots as slot, i (slot)}
				<button
					type="button"
					class="construire-etiquette flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 font-semibold italic"
					class:construire-etiquette-active={i === active}
					class:construire-etiquette-absente={positions[i] === null}
					aria-label={`Terme ${slot}`}
					aria-pressed={i === active}
					disabled={locked}
					onclick={() => (chosen = i)}
				>
					{slot}
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
		<div class="construire-correction flex w-full flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<Courbe node={base} showErrors={false} marks={solutionMarks} traces={solutionTraces} />
		</div>
	{/if}
</div>

<style>
	.construire-zone {
		border-color: transparent;
		cursor: pointer;
		/* Le défilement vertical reste à la page ; le doigt posé sur un terme le garde */
		touch-action: pan-y;
		/* iPhone : un appui long ouvrirait la loupe, qui coupe le glisser */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.construire-zone:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.construire-verrouille {
		cursor: default;
	}

	.construire-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.construire-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.construire-etiquette {
		border-color: var(--color-border);
		background: var(--color-background);
	}

	/* Terme pas encore posé : bord en pointillés */
	.construire-etiquette-absente {
		border-style: dashed;
	}

	.construire-etiquette-active {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.construire-etiquette:disabled {
		opacity: 0.4;
	}
</style>
