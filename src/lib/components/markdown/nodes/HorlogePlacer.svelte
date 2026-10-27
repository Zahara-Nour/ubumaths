<!--
	HorlogePlacer — horloge à placer (```horloge + `placer:`)
	=========================================================

	L'élève pose les DEUX aiguilles d'un cadran (CP-047, CE1-060, CE2-058,
	CM1-093 ; chantier `docs/wip/reponses-a-placer-progress.md` § 13, 14).

	- Aiguilles indépendantes (pas de remontoir), chacune sur l'un des 60 crans.
	- Au départ, les deux aiguilles attendent sur le 12, grisées en pointillés :
	  une aiguille en attente n'est pas posée.
	- Étiquettes « petite aiguille » / « grande aiguille » sous le cadran (la
	  grande active au départ) : toucher le cadran tourne l'aiguille active vers le
	  doigt ; poser une aiguille encore en attente active l'autre si elle l'est
	  aussi ; toucher ou glisser une aiguille posée la reprend.
	- Boutons ◀ ▶ toujours visibles (un cran, l'aiguille active), flèches, Début.
	- L'heure attendue n'est JAMAIS affichée ni dite avant la correction ; le nom
	  accessible donne la position choisie par l'élève, pas celle attendue.
	- Dans une question (`answer`) : la réponse de la case est `"47 25"` (crans
	  des deux aiguilles, `handsAnswer`), jugée par `isPlacedTimeCorrect`. Faux :
	  la phrase de `handsMistakes` et le cadran juste à côté.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/HorlogePlacer
-->
<script lang="ts">
	import {
		HORLOGE_ARIA_LABEL,
		HORLOGE_SIZE_CM,
		type HorlogeNode,
		type HorlogeTime
	} from '$lib/ubumark/types/horloge';
	import {
		buildHorlogeScene,
		handTip,
		HORLOGE_FONT,
		HORLOGE_STROKE,
		HORLOGE_VIEW,
		type HorlogeScene
	} from '$lib/ubumark/utils/horloge-scene';
	import {
		HAND_TICKS,
		handsAnswer,
		handsMistakes,
		handsOfAnswer,
		tickAngle,
		tickOfAngle,
		type HorlogeHands
	} from '$lib/ubumark/utils/horloge-placer';
	import type { BuildCase } from './CollectionConstruire.svelte';

	type Hand = 'hour' | 'minute';

	interface Props {
		/** Horloge à placer (`spec.placer` défini) */
		node: HorlogeNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** false : cadran seul, sans boutons ni étiquettes (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answer, showControls = true, class: className = '' }: Props = $props();

	const VIEW_BOX = `${-HORLOGE_VIEW.half} ${-HORLOGE_VIEW.half} ${2 * HORLOGE_VIEW.half} ${2 * HORLOGE_VIEW.half}`;
	/** Écart (en crans) sous lequel toucher une aiguille posée la reprend */
	const GRAB_TICKS = 3;
	const HANDS: Hand[] = ['hour', 'minute'];
	const HAND_NAMES: Record<Hand, string> = { hour: 'petite aiguille', minute: 'grande aiguille' };

	let spec = $derived(node.spec!);
	let expected = $derived<HorlogeTime>(spec.placer!);
	/** Le cadran sans aiguilles : traits et chiffres */
	let dial = $derived(buildHorlogeScene(spec, null));
	let solution = $derived(buildHorlogeScene(spec, expected));
	let size = $derived(`${spec.sizeCm ?? HORLOGE_SIZE_CM.placer}cm`);

	/**
	 * Crans des aiguilles : relus quand la valeur de la case change (case remise à
	 * vide, composant remonté), réassignés à chaque geste (dérivé modifiable)
	 */
	let hands = $derived<HorlogeHands>(handsOfAnswer(answer?.value ?? ''));
	/** Aiguille que le geste tourne : la grande au départ */
	let active = $state<Hand>('minute');
	let locked = $derived(answer?.disabled ?? false);
	let dragging = $state(false);
	/** L'aiguille active attendait quand le doigt s'est posé : au lever, on passe à l'autre */
	let placingNew = false;
	let svg: SVGSVGElement | undefined = $state();

	let verdict = $derived<boolean | null>(answer?.isCorrect ?? null);
	let mistakes = $derived(verdict === false ? handsMistakes(hands, expected) : []);

	/** Position de l'aiguille active, dite par le lecteur d'écran (jamais l'heure attendue) */
	let valueText = $derived.by(() => {
		const tick = hands[active];
		const name = HAND_NAMES[active];
		if (tick === null) return `${name} pas placée`;
		if (active === 'minute') return `${name} sur la minute ${tick}`;
		const hour = Math.floor(tick / 5) || 12;
		if (tick % 5 === 0) return `${name} sur le ${hour}`;
		return `${name} entre le ${hour} et le ${(hour % 12) + 1}`;
	});

	function other(hand: Hand): Hand {
		return hand === 'hour' ? 'minute' : 'hour';
	}

	function place(hand: Hand, tick: number) {
		if (locked) return;
		const next = ((tick % HAND_TICKS) + HAND_TICKS) % HAND_TICKS;
		if (hands[hand] === next) return;
		hands = { ...hands, [hand]: next };
		answer?.onChange(handsAnswer(hands));
	}

	/** Angle (degrés depuis le 12) du doigt autour du centre du cadran */
	function pointerAngle(event: { clientX: number; clientY: number }): number | null {
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0) return null;
		const dx = event.clientX - (rect.left + rect.width / 2);
		const dy = event.clientY - (rect.top + rect.height / 2);
		if (dx === 0 && dy === 0) return null;
		return (Math.atan2(dx, -dy) * 180) / Math.PI;
	}

	/** Écart en crans entre deux positions, par le plus court chemin */
	function tickDistance(a: number, b: number): number {
		const d = Math.abs(a - b) % HAND_TICKS;
		return Math.min(d, HAND_TICKS - d);
	}

	/**
	 * L'aiguille posée sous le doigt (l'active d'abord) ; null si aucune. Aiguille
	 * active en attente : jamais de reprise, le toucher la pose
	 */
	function grabbedAt(tick: number): Hand | null {
		if (hands[active] === null) return null;
		const near = HANDS.filter((hand) => {
			const at = hands[hand];
			return at !== null && tickDistance(at, tick) <= GRAB_TICKS;
		});
		if (near.includes(active)) return active;
		return near[0] ?? null;
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const angle = pointerAngle(event);
		if (angle === null) return;
		const tick = tickOfAngle(angle);
		const grabbed = grabbedAt(tick);
		if (grabbed !== null) {
			active = grabbed;
			placingNew = false;
		} else {
			placingNew = hands[active] === null;
		}
		place(active, tick);
		dragging = true;
		svg?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		const angle = pointerAngle(event);
		if (angle !== null) place(active, tickOfAngle(angle));
	}

	function handlePointerUp() {
		if (dragging && placingNew && hands[other(active)] === null) active = other(active);
		dragging = false;
		placingNew = false;
	}

	/** Un cran ; aiguille en attente : elle part du 12 */
	function stepBy(delta: 1 | -1) {
		place(active, (hands[active] ?? 0) + delta);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1),
			ArrowUp: () => stepBy(1),
			ArrowLeft: () => stepBy(-1),
			ArrowDown: () => stepBy(-1),
			Home: () => place(active, 0)
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		move();
	}
</script>

{#snippet face(scene: HorlogeScene)}
	<circle class="horloge-fond" r={HORLOGE_VIEW.radius} stroke-width={HORLOGE_VIEW.rim} />
	{#each scene.ticks as tick, t (t)}
		<line
			class="horloge-trait"
			class:horloge-trait-heure={tick.major}
			x1={tick.x1}
			y1={tick.y1}
			x2={tick.x2}
			y2={tick.y2}
			stroke-width={tick.major ? HORLOGE_STROKE.majorTick : HORLOGE_STROKE.minorTick}
		/>
	{/each}
	{#each scene.numbers as number, n (n)}
		<text
			class="horloge-chiffre"
			class:horloge-chiffre-24={number.inner}
			x={number.x}
			y={number.y}
			font-size={number.inner ? HORLOGE_FONT.innerNumbers : HORLOGE_FONT.numbers}
			text-anchor="middle"
			dominant-baseline="central">{number.text}</text
		>
	{/each}
{/snippet}

{#snippet hand(kind: Hand, tick: number | null)}
	{@const tip = handTip(kind, tickAngle(tick ?? 0))}
	<line
		class="horloge-aiguille"
		class:horloge-aiguille-heures={kind === 'hour'}
		class:horloge-aiguille-minutes={kind === 'minute'}
		class:horloge-aiguille-attente={tick === null}
		x1="0"
		y1="0"
		x2={tip.x}
		y2={tip.y}
		stroke-width={kind === 'hour' ? HORLOGE_STROKE.hourHand : HORLOGE_STROKE.minuteHand}
	/>
{/snippet}

<div class="horloge-placer my-2 flex flex-col items-center gap-2 {className}">
	<div
		class="placer-zone rounded-md border p-2"
		class:placer-juste={verdict === true}
		class:placer-faux={verdict === false}
	>
		<svg
			bind:this={svg}
			xmlns="http://www.w3.org/2000/svg"
			viewBox={VIEW_BOX}
			class="horloge-cadran"
			class:placer-verrouille={locked}
			style:--horloge-taille={size}
			role="slider"
			tabindex={locked ? -1 : 0}
			aria-label="{HORLOGE_ARIA_LABEL} : {HAND_NAMES[active]}"
			aria-valuemin={0}
			aria-valuemax={HAND_TICKS - 1}
			aria-valuenow={hands[active] ?? undefined}
			aria-valuetext={valueText}
			aria-disabled={locked}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerUp}
			onkeydown={handleKeyDown}
		>
			{@render face(dial)}
			<!-- L'aiguille active par-dessus : on voit celle qu'on tourne -->
			{@render hand(other(active), hands[other(active)])}
			{@render hand(active, hands[active])}
			<circle class="horloge-axe" r={HORLOGE_STROKE.center} />
		</svg>
	</div>
	{#if spec.captions?.[0]}
		<p class="horloge-legende text-center text-sm">{spec.captions[0]}</p>
	{/if}

	{#if showControls}
		<!-- Étiquettes puis ◀ ▶ : deux rangées, qui tiennent sur un téléphone -->
		<div class="flex flex-col items-center gap-2">
			<div class="flex gap-1" role="group" aria-label="Aiguille à tourner">
				{#each HANDS as kind (kind)}
					<button
						type="button"
						class="placer-etiquette flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-semibold"
						class:placer-etiquette-active={kind === active}
						class:placer-etiquette-absente={hands[kind] === null}
						aria-pressed={kind === active}
						disabled={locked}
						onclick={() => (active = kind)}
					>
						{HAND_NAMES[kind]}
					</button>
				{/each}
			</div>
			<div class="flex gap-3">
				<button
					type="button"
					class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
					aria-label="Reculer la {HAND_NAMES[active]} d’une minute"
					disabled={locked}
					onclick={() => stepBy(-1)}
				>
					<span aria-hidden="true">◀</span>
				</button>
				<button
					type="button"
					class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
					aria-label="Avancer la {HAND_NAMES[active]} d’une minute"
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
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox={VIEW_BOX}
				role="img"
				aria-label="{HORLOGE_ARIA_LABEL} : la correction"
				class="horloge-cadran horloge-correction"
				style:--horloge-taille={size}
			>
				{@render face(solution)}
				{#if solution.minuteHand}
					<line
						class="horloge-aiguille horloge-aiguille-minutes"
						x1="0"
						y1="0"
						x2={solution.minuteHand.x}
						y2={solution.minuteHand.y}
						stroke-width={HORLOGE_STROKE.minuteHand}
					/>
				{/if}
				{#if solution.hourHand}
					<line
						class="horloge-aiguille horloge-aiguille-heures"
						x1="0"
						y1="0"
						x2={solution.hourHand.x}
						y2={solution.hourHand.y}
						stroke-width={HORLOGE_STROKE.hourHand}
					/>
				{/if}
				<circle class="horloge-axe" r={HORLOGE_STROKE.center} />
			</svg>
		</div>
	{/if}
</div>

<style>
	.horloge-cadran {
		width: var(--horloge-taille, 6cm);
		max-width: 100%;
		height: auto;
		aspect-ratio: 1;
		cursor: pointer;
		/* Le doigt tourne les aiguilles dans tous les sens : la page ne défile pas sur le cadran */
		touch-action: none;
		/* iPhone : un appui long ouvrirait la loupe et une sélection de texte */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.horloge-cadran:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
		border-radius: 50%;
	}

	.horloge-correction,
	.placer-verrouille {
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

	/* Habillage du cadran : celui de Horloge.svelte (tokens du thème) */
	.horloge-fond {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}

	.horloge-trait {
		stroke: var(--color-muted-foreground);
	}

	.horloge-trait-heure {
		stroke: var(--color-foreground);
	}

	.horloge-chiffre {
		fill: var(--color-foreground);
		font-weight: 600;
	}

	.horloge-chiffre-24 {
		fill: var(--color-muted-foreground);
		font-weight: 400;
	}

	.horloge-aiguille {
		stroke-linecap: round;
	}

	.horloge-aiguille-minutes {
		stroke: var(--color-foreground);
	}

	/* La seule couleur d'accent : la petite aiguille */
	.horloge-aiguille-heures {
		stroke: var(--color-primary);
	}

	/* Aiguille en attente sur le 12 : grisée, en pointillés */
	.horloge-aiguille-attente {
		stroke: var(--color-muted-foreground);
		stroke-dasharray: 2 8;
		opacity: 0.4;
	}

	.horloge-axe {
		fill: var(--color-foreground);
	}

	.placer-etiquette {
		border-color: var(--color-border);
		background: var(--color-background);
	}

	/* Aiguille pas encore posée : bord en pointillés */
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
