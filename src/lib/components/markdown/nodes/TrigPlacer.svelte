<!--
	TrigPlacer — point(s) à placer sur le cercle trigonométrique (```trig + `placer:`)
	==================================================================================

	L'élève pose SES points sur le cercle (chantier `docs/wip/cercle-trotteuse-progress.md`
	§ 4 et § 6). Calqué sur le repère à placer (`CourbePlacer`).

	- Le cercle montre ses repères (axes, 0, π/2, π, 3π/2) et 24 graduations sans
	  étiquette, une tous les π/12 ; aucun point posé au départ.
	- Toucher le cercle pose le point actif sur le cran le plus proche (aimant) ; le
	  glisser le déplace ; toucher un point posé le choisit sans le déplacer.
	- Plusieurs points (`placer: M = 2*pi/3 ; N = -pi/4`) : une étiquette-bouton par
	  point sous le cercle, un seul actif. Poser un point encore absent active le
	  suivant non placé.
	- ◀ ▶ (toujours visibles) et flèches : un cran, dans le sens indirect ou direct ;
	  Début : le cran 0. Sans point, le premier appui le pose sur 0.
	- L'angle attendu n'est JAMAIS dans le DOM avant la correction : le cercle dessiné
	  est celui du bloc SANS `placer:`, plus les points de l'élève ; le nom accessible
	  dit la position de l'élève, pas la cible.
	- Dans une question (`answers`, une case par point) : la case porte le cran
	  (`stepAnswer`, '' sans point), jugée par le juge ordinaire. Faux : une phrase par
	  point faux (mesure principale) et le cercle juste à côté, points en vert.
	- Sans `answers` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/TrigPlacer
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { TrigCircleNode, TrigNamedPoint } from '$lib/ubumark/types/trig-circle';
	import {
		TRIG_PLACER_STEPS,
		TRIG_RADIUS,
		TRIG_SVG_SIZE,
		expectedStepAnswer,
		moveStep,
		nearestStep,
		placedAngleMistake,
		principalText,
		readStepAnswer,
		stepAnswer,
		stepOfRadians,
		stepRadians
	} from '$lib/ubumark/utils/trig-placer';
	import TrigCircle from './TrigCircle.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Cercle à placer (`placer` défini) */
		node: TrigCircleNode;
		/** Une case par point de `placer:`, dans l'ordre écrit */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) */
		showErrors?: boolean;
		/** false : cercle seul, sans étiquettes ni boutons (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	/** Le point de l'élève : la couleur d'accent, jamais le rouge de l'erreur */
	const STUDENT_COLOR = 'bleu';
	/** Le point juste, dans la correction */
	const SOLUTION_COLOR = 'vert';
	/** Distance (px) sous laquelle toucher un point posé le choisit */
	const GRAB_DISTANCE = 18;
	/** Près du centre, l'angle ne se lit pas : le toucher ne pose rien (part du rayon) */
	const CENTER_DEAD_ZONE = 0.3;

	let targets = $derived<TrigNamedPoint[]>(node.placer ?? []);
	let several = $derived(targets.length > 1);

	/**
	 * Cran de chaque point : gardé ici, les cases n'en gardent que l'écriture.
	 * Relu seulement quand la valeur d'une case change (case remise à vide,
	 * composant remonté) ; réassigné à chaque geste (dérivé modifiable).
	 */
	let positions = $derived<(number | null)[]>(
		targets.map((_, i) => readStepAnswer(answers?.[i]?.value ?? ''))
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

	/** Le bloc sans `placer:` : jamais l'angle attendu dans le dessin */
	let base = $derived<TrigCircleNode>({ ...node, placer: undefined, caseIndex: undefined });

	/** Un point nommé comme la cible, sur un cran donné (sans rien garder de l'angle attendu) */
	function pointAt(target: TrigNamedPoint, step: number): TrigNamedPoint {
		return {
			name: target.name,
			base: target.base,
			sub: target.sub,
			primes: target.primes,
			angle: { expression: '', radians: stepRadians(step) }
		};
	}

	let marks = $derived(
		positions.flatMap((step, i) =>
			step === null || targets[i] === undefined
				? []
				: [{ point: pointAt(targets[i], step), color: STUDENT_COLOR }]
		)
	);

	/** Verdict du cercle : faux dès qu'un point l'est, juste quand tous le sont */
	let verdict = $derived.by<boolean | null>(() => {
		if (!answers || answers.length === 0) return null;
		if (answers.some((a) => a.isCorrect === false)) return false;
		return answers.every((a) => a.isCorrect === true) ? true : null;
	});

	/** Cran attendu de chaque point (le cran 0 pour un angle masqué : jamais montré avant la correction) */
	let expectedSteps = $derived(targets.map((t) => stepOfRadians(t.angle.radians) ?? 0));

	/** Points justes : seulement dans la correction, jamais avant */
	let solutionMarks = $derived(
		verdict === false
			? targets.map((t, i) => ({ point: pointAt(t, expectedSteps[i]), color: SOLUTION_COLOR }))
			: []
	);

	/** Phrases de la correction : une par point faux */
	let mistakes = $derived(
		targets.flatMap((target, i) => {
			if (answers?.[i]?.isCorrect !== false) return [];
			const sentence = placedAngleMistake(
				target.name,
				answers[i].value,
				expectedStepAnswer(expectedSteps[i])
			);
			return sentence === null ? [] : [sentence];
		})
	);

	let zoneLabel = $derived(
		several ? 'Cercle trigonométrique : tes points' : 'Cercle trigonométrique : ton point'
	);
	let activeName = $derived(targets[active]?.name ?? '');
	let valueText = $derived.by(() => {
		const step = positions[active] ?? null;
		if (step === null) return `point ${activeName} pas placé`;
		return `point ${activeName} sur ${principalText(step)}`;
	});

	function place(step: number) {
		if (locked || targets.length === 0) return;
		if (positions[active] === step) return;
		positions = positions.with(active, step);
		answers?.[active]?.onChange(stepAnswer(step));
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

	/** Centre du cercle et échelle de l'écran (px par unité du dessin) */
	function frameOf(): { cx: number; cy: number; scale: number } | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0) return null;
		return {
			cx: rect.left + rect.width / 2,
			cy: rect.top + rect.height / 2,
			scale: rect.width / TRIG_SVG_SIZE
		};
	}

	/** Le cran sous le doigt ; null près du centre (l'angle ne s'y lit pas) */
	function stepAt(event: { clientX: number; clientY: number }): number | null {
		const frame = frameOf();
		if (frame === null) return null;
		const dx = event.clientX - frame.cx;
		const dy = frame.cy - event.clientY;
		if (Math.hypot(dx, dy) < CENTER_DEAD_ZONE * TRIG_RADIUS * frame.scale) return null;
		return nearestStep(Math.atan2(dy, dx));
	}

	/** Les points posés à portée du doigt, avec leur distance (px écran) */
	function posedNear(event: {
		clientX: number;
		clientY: number;
	}): { i: number; distance: number }[] {
		const frame = frameOf();
		if (frame === null) return [];
		const r = TRIG_RADIUS * frame.scale;
		return positions.flatMap((step, i) => {
			if (step === null) return [];
			const radians = stepRadians(step);
			const x = frame.cx + r * Math.cos(radians);
			const y = frame.cy - r * Math.sin(radians);
			const distance = Math.hypot(x - event.clientX, y - event.clientY);
			return distance <= GRAB_DISTANCE ? [{ i, distance }] : [];
		});
	}

	/** Le point posé sous le doigt (le point actif d'abord) ; null si aucun */
	function grabbedAt(event: PointerEvent): number | null {
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
		const step = stepAt(event);
		if (step !== null) place(step);
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const grabbed = grabbedAt(event);
		if (grabbed !== null) {
			// Toucher un point posé le choisit sans le déplacer : seul le glisser le bouge
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

	/** Un cran ; sans point, le premier appui le pose sur 0 */
	function stepBy(delta: number) {
		const current = positions[active];
		place(current === null || current === undefined ? 0 : moveStep(current, delta));
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1),
			ArrowUp: () => stepBy(1),
			ArrowLeft: () => stepBy(-1),
			ArrowDown: () => stepBy(-1),
			Home: () => place(0)
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		move();
	}
</script>

<div class="placer-bloc my-2 flex flex-col items-center gap-2 {className}">
	<div
		bind:this={zone}
		class="placer-zone rounded-md border"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
		class:placer-verrouille={locked}
		role="slider"
		tabindex={locked ? -1 : 0}
		aria-label={zoneLabel}
		aria-valuemin={0}
		aria-valuemax={TRIG_PLACER_STEPS - 1}
		aria-valuenow={positions[active] ?? undefined}
		aria-valuetext={valueText}
		aria-disabled={locked}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<TrigCircle node={base} {showErrors} ticks={TRIG_PLACER_STEPS} {marks} />
	</div>

	{#if showControls}
		<!-- Étiquettes puis ◀ ▶ : deux rangées, qui tiennent sur un téléphone -->
		<div class="flex flex-col items-center gap-2">
			{#if several}
				<div class="flex flex-wrap justify-center gap-1" role="group" aria-label="Point à placer">
					{#each targets as target, i (target.name)}
						<button
							type="button"
							class="placer-etiquette flex min-h-11 min-w-11 items-center justify-center rounded-md border font-semibold italic"
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
			<div class="flex gap-3">
				<button
					type="button"
					class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
					aria-label="Reculer le point {activeName} d’un cran (sens indirect)"
					disabled={locked}
					onclick={() => stepBy(-1)}
				>
					<span aria-hidden="true">◀</span>
				</button>
				<button
					type="button"
					class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
					aria-label="Avancer le point {activeName} d’un cran (sens direct)"
					disabled={locked}
					onclick={() => stepBy(1)}
				>
					<span aria-hidden="true">▶</span>
				</button>
			</div>
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
		<div class="placer-correction flex flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<TrigCircle node={base} showErrors={false} ticks={TRIG_PLACER_STEPS} marks={solutionMarks} />
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
