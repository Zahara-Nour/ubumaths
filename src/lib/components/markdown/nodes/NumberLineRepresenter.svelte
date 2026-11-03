<!--
	NumberLineRepresenter — droite graduée à représenter (```line + `representer:`)
	===============================================================================

	L'élève représente un intervalle (chantier `docs/wip/demi-droite-progress.md`
	§ « Geste de l'élève », points 10 à 17) :

	- Demi-droite (`representer: [2, +inf[`) : toucher la droite pose la borne sur
	  la graduation la plus proche (la retoucher ailleurs la déplace) ; deux boutons
	  « ← vers la gauche » / « vers la droite → » choisissent le côté des solutions
	  (grisés tant que la borne n'est pas posée) ; un bouton bascule la borne comprise / exclue (crochet).
	- Intervalle borné (`representer: [-1, 3[`) : deux touchers posent les deux
	  bornes, puis toucher déplace la plus proche ; un bouton par borne la bascule ;
	  pas de côté.
	- Boutons ◀ ▶, flèches du clavier, Début, Fin : la borne active, d'un cran.
	- La droite redessine chaque étape : borne seule = un point, borne et côté (ou
	  deux bornes) = le trait et ses crochets.
	- La réponse attendue n'est JAMAIS affichée ni dite avant la correction.
	- Dans une question (`answers`, une case) : la réponse est `representerAnswer`
	  (`[2 ; +∞[`, incomplète `2 comprise, côté ?`). Faux : les phrases de
	  `representerMistakes` et la droite juste à côté.

	@module components/markdown/nodes/NumberLineRepresenter
-->
<script lang="ts">
	import type {
		NumberLineNode,
		NumberLinePoint,
		NumberLineSegment,
		NumberLineValue
	} from '$lib/ubumark/types/number-line';
	import { parseCustom } from '$lib/mathAST/parser/custom';
	import { numVal, phoneGapWarning, xToValue } from '$lib/ubumark/utils/number-line-render';
	import {
		decimalString,
		graduationCount,
		graduationValue,
		nearestIndex,
		placerText
	} from '$lib/ubumark/utils/number-line-placer';
	import {
		expectedInterval,
		representerAnswer,
		representerMistakes,
		segmentOfState,
		stateOfAnswer,
		type RepresenterSide,
		type RepresenterState
	} from '$lib/ubumark/utils/number-line-representer';
	import NumberLine from './NumberLine.svelte';
	import { readAuthoringAdvice, readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Droite à représenter (`representer:` défini) */
		node: NumberLineNode;
		/** La case de la droite (une seule) */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) ; la correction n'en montre pas */
		showErrors?: boolean;
		/** false : droite seule, sans boutons (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	/** Le trait de l'élève : la couleur d'accent, jamais le rouge de l'erreur */
	const STUDENT_COLOR = 'bleu';
	/** L'intervalle juste, dans la correction */
	const SOLUTION_COLOR = 'vert';
	const MISSING_SIDE_HINT = 'Choisis de quel côté sont les solutions.';

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());
	const advice = readAuthoringAdvice();

	let config = $derived(node.config);
	let bounded = $derived(node.representer?.bounded ?? false);
	let count = $derived(graduationCount(config));
	let phoneWarning = $derived(phoneGapWarning(config));
	let answer = $derived(answers?.[0]);
	let locked = $derived(answer?.disabled ?? false);

	/**
	 * Ce que l'élève a fait : relu de la case quand sa valeur change (case remise à
	 * vide, composant remonté), réassigné à chaque geste (dérivé modifiable)
	 */
	let current = $derived<RepresenterState>(stateOfAnswer(config, answer?.value ?? '', bounded));
	/**
	 * Graduation de la borne que le geste déplace : suivie par sa graduation, pas
	 * par son rang dans `current.bornes`, que la relecture de la case trie
	 */
	let activeGraduation = $state<number | null>(null);
	let dragging = $state(false);
	let zone: HTMLDivElement | undefined = $state();

	/** La réponse juste, connue si l'énoncé n'est pas masqué */
	let expected = $derived.by(() => {
		const interval = node.representer?.interval;
		if (!interval) return null;
		return representerAnswer(config, expectedInterval(config, interval), bounded);
	});

	function valueOf(rank: number): NumberLineValue {
		const expression = decimalString(graduationValue(config, rank));
		return { expression, ast: parseCustom(expression) };
	}

	/** La droite sans `representer:` (elle se dessine seule), avec le dessin d'un état */
	function lineOf(drawn: RepresenterState, color: string): NumberLineNode {
		const segment = segmentOfState(config, drawn, bounded);
		const segments: NumberLineSegment[] = segment
			? [
					{
						start: segment.start === null ? config.start : valueOf(segment.start),
						end: segment.end === null ? config.end : valueOf(segment.end),
						startOpen: segment.startOpen,
						endOpen: segment.endOpen,
						...(segment.start === null && { startInfinite: true }),
						...(segment.end === null && { endInfinite: true }),
						color
					}
				]
			: [];
		// Borne posée, trait pas encore connu : un point sur la graduation
		const points: NumberLinePoint[] = segment
			? []
			: drawn.bornes.map((b) => ({ label: '', value: valueOf(b.rank), color }));
		return { ...node, representer: undefined, caseIndex: undefined, segments, points };
	}

	let shown = $derived(lineOf(current, STUDENT_COLOR));
	let solution = $derived.by(() => {
		const interval = node.representer?.interval;
		return interval ? lineOf(expectedInterval(config, interval), SOLUTION_COLOR) : null;
	});

	let verdict = $derived<boolean | null>(answer?.isCorrect ?? null);
	let mistakes = $derived(
		verdict === false && expected !== null ? representerMistakes(answer?.value ?? '', expected) : []
	);
	let missingSide = $derived(
		!bounded && !locked && verdict === null && current.bornes.length > 0 && current.side === null
	);

	/** Rang dans `current.bornes` de la borne active (la dernière si sa graduation est perdue) ; -1 sans borne */
	let active = $derived.by(() => {
		const found = current.bornes.findIndex((b) => b.rank === activeGraduation);
		return found !== -1 ? found : current.bornes.length - 1;
	});
	let activeRank = $derived(current.bornes[active]?.rank ?? null);
	let valueText = $derived.by(() => {
		if (current.bornes.length === 0) return 'aucune borne';
		const bornes = [...current.bornes]
			.sort((a, b) => a.rank - b.rank)
			.map((b) => `${placerText(config, b.rank)} ${b.included ? 'comprise' : 'exclue'}`)
			.join(', ');
		if (bounded) return `bornes : ${bornes}`;
		const side = current.side === null ? 'côté pas choisi' : `solutions à ${current.side}`;
		return `borne ${bornes}, ${side}`;
	});

	/** Nouvel état : dessiné, écrit dans la case */
	function commit(next: RepresenterState) {
		current = next;
		answer?.onChange(representerAnswer(config, next, bounded));
	}

	/** Pose ou déplace une borne sur la graduation k */
	function placeAt(k: number) {
		if (locked) return;
		const rank = Math.max(0, Math.min(count - 1, k));
		const bornes = current.bornes;
		if (!bounded) {
			const borne = bornes[0];
			if (borne?.rank === rank) return;
			activeGraduation = rank;
			commit({ ...current, bornes: [{ rank, included: borne?.included ?? true }] });
			return;
		}
		const existing = bornes.findIndex((b) => b.rank === rank);
		if (existing !== -1) {
			activeGraduation = rank;
			return;
		}
		if (bornes.length < 2) {
			activeGraduation = rank;
			commit({ ...current, bornes: [...bornes, { rank, included: true }] });
			return;
		}
		move(nearestBorne(rank), rank);
	}

	/** Déplace la borne i sur la graduation `rank` (jamais sur l'autre borne) */
	function move(i: number, rank: number) {
		const bornes = current.bornes;
		const target = Math.max(0, Math.min(count - 1, rank));
		if (bornes[i] === undefined || bornes[i].rank === target) return;
		if (bornes.some((b, j) => j !== i && b.rank === target)) return;
		activeGraduation = target;
		commit({ ...current, bornes: bornes.with(i, { ...bornes[i], rank: target }) });
	}

	/** La borne la plus proche d'une graduation (la borne active à égalité) */
	function nearestBorne(rank: number): number {
		let best = Math.max(0, active);
		current.bornes.forEach((b, i) => {
			const d = Math.abs(b.rank - rank);
			const bestD = Math.abs(current.bornes[best].rank - rank);
			if (d < bestD) best = i;
		});
		return best;
	}

	function setSide(side: RepresenterSide) {
		if (locked || current.bornes.length === 0 || current.side === side) return;
		commit({ ...current, side });
	}

	function toggle(i: number) {
		if (locked) return;
		const borne = current.bornes[i];
		if (!borne) return;
		commit({ ...current, bornes: current.bornes.with(i, { ...borne, included: !borne.included }) });
	}

	/** Graduation la plus proche du doigt */
	function indexAt(event: PointerEvent): number | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0) return null;
		const value = xToValue(
			event.clientX - rect.left,
			numVal(config.start),
			numVal(config.end),
			rect.width
		);
		return nearestIndex(config, value);
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const k = indexAt(event);
		if (k === null) return;
		placeAt(k);
		dragging = true;
		zone?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || locked) return;
		const k = indexAt(event);
		if (k === null) return;
		if (current.bornes.length === 0) placeAt(k);
		else move(active, k);
	}

	function handlePointerUp() {
		dragging = false;
	}

	/** Un cran ; sans borne, ▶ pose sur la première graduation, ◀ sur la dernière */
	function stepBy(delta: 1 | -1) {
		if (activeRank === null) placeAt(delta === 1 ? 0 : count - 1);
		else move(active, activeRank + delta);
	}

	function moveTo(rank: number) {
		if (activeRank === null) placeAt(rank);
		else move(active, rank);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1),
			ArrowUp: () => stepBy(1),
			ArrowLeft: () => stepBy(-1),
			ArrowDown: () => stepBy(-1),
			Home: () => moveTo(0),
			End: () => moveTo(count - 1)
		};
		const action = moves[event.key];
		if (!action) return;
		event.preventDefault();
		action();
	}
</script>

<div class="representer-bloc my-2 flex flex-col items-center gap-1 {className}">
	<div
		bind:this={zone}
		class="representer-zone w-full rounded-md border py-3"
		class:representer-juste={verdict === true}
		class:representer-faux={verdict === false}
		class:representer-verrouille={locked}
		role="slider"
		tabindex={locked ? -1 : 0}
		aria-label={bounded ? 'Droite graduée : tes bornes' : 'Droite graduée : ta borne'}
		aria-valuemin={0}
		aria-valuemax={count - 1}
		aria-valuenow={activeRank ?? undefined}
		aria-valuetext={valueText}
		aria-disabled={locked}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<NumberLine node={shown} {showErrors} pointsOnLine />
	</div>

	{#if showControls}
		<div class="flex flex-wrap items-center justify-center gap-2">
			<button
				type="button"
				class="representer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Reculer la borne d’une graduation"
				disabled={locked || activeRank === 0}
				onclick={() => stepBy(-1)}
			>
				<span aria-hidden="true">◀</span>
			</button>
			<button
				type="button"
				class="representer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Avancer la borne d’une graduation"
				disabled={locked || activeRank === count - 1}
				onclick={() => stepBy(1)}
			>
				<span aria-hidden="true">▶</span>
			</button>
		</div>
		<div class="flex flex-wrap items-center justify-center gap-2">
			{#if !bounded}
				<div class="flex gap-1" role="group" aria-label="Côté des solutions">
					<button
						type="button"
						class="representer-choix min-h-11 rounded-md border px-3 text-sm"
						class:representer-choix-actif={current.side === 'gauche'}
						aria-pressed={current.side === 'gauche'}
						disabled={locked || current.bornes.length === 0}
						onclick={() => setSide('gauche')}
					>
						← vers la gauche
					</button>
					<button
						type="button"
						class="representer-choix min-h-11 rounded-md border px-3 text-sm"
						class:representer-choix-actif={current.side === 'droite'}
						aria-pressed={current.side === 'droite'}
						disabled={locked || current.bornes.length === 0}
						onclick={() => setSide('droite')}
					>
						vers la droite →
					</button>
				</div>
			{/if}
			{#each current.bornes as borne, i (i)}
				<button
					type="button"
					class="representer-crochet min-h-11 rounded-md border px-3 text-sm"
					aria-pressed={borne.included}
					title="Toucher pour {borne.included ? 'exclure' : 'inclure'} cette borne"
					disabled={locked}
					onclick={() => toggle(i)}
				>
					{placerText(config, borne.rank)}
					{borne.included ? 'comprise' : 'exclue'}
				</button>
			{/each}
		</div>
	{/if}

	{#if missingSide}
		<p class="text-sm text-muted-foreground" role="status">{MISSING_SIDE_HINT}</p>
	{/if}

	{#if errorsVisible && advice() && phoneWarning !== null}
		<ul class="nl-warnings w-full text-xs text-warning">
			<li>Droite graduée — {phoneWarning}</li>
		</ul>
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
		{#if solution}
			<div class="representer-correction flex w-full flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<NumberLine node={solution} showErrors={false} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.representer-zone {
		border-color: transparent;
		cursor: pointer;
		/* Le glisser horizontal est pour la borne ; le défilement vertical reste */
		touch-action: pan-y;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.representer-zone:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.representer-verrouille {
		cursor: default;
	}

	.representer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.representer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.representer-choix,
	.representer-crochet {
		border-color: var(--color-border);
		background: var(--color-background);
	}

	.representer-choix-actif {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.representer-choix:disabled,
	.representer-crochet:disabled {
		opacity: 0.4;
	}
</style>
