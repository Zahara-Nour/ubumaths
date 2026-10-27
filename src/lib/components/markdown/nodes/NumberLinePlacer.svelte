<!--
	NumberLinePlacer — droite graduée à placer (```line + `placer:`)
	================================================================

	L'élève pose SES points sur des graduations (CP-008 ; chantier
	`docs/wip/reponses-a-placer-progress.md` § 4, 6, 10).

	- Toucher la droite pose le point actif sur la graduation la plus proche
	  (aimant) ; le glisser le déplace ; retoucher ailleurs le repose.
	- Plusieurs points (`placer: A=3 ; B=7`) : une étiquette par point sous la
	  droite, une seule active. Poser un point encore absent active le suivant non
	  placé ; toucher un point posé le reprend.
	- Boutons ◀ ▶ toujours visibles (un cran, le point actif), flèches du clavier,
	  Début, Fin.
	- La valeur attendue n'est JAMAIS affichée ni dite avant la correction ; le nom
	  accessible donne la graduation choisie par l'élève, pas celle attendue.
	- Dans une question (`answers`, une case par point) : la graduation est la
	  réponse de la case (`placerAnswer`, '' sans point), jugée par le juge
	  ordinaire. Faux : « Tu as placé le point sur 9. » (« Tu as placé B sur 9. »
	  par point faux) et la droite juste à côté, tous les points en vert.
	- Sans `answers` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/NumberLinePlacer
-->
<script lang="ts">
	import type {
		NumberLineNode,
		NumberLinePoint,
		NumberLineTarget,
		NumberLineValue
	} from '$lib/ubumark/types/number-line';
	import { parseCustom } from '$lib/mathAST/parser/custom';
	import {
		numVal,
		phoneGapWarning,
		valueToX,
		xToValue
	} from '$lib/ubumark/utils/number-line-render';
	import {
		decimalString,
		graduationCount,
		graduationValue,
		indexOfAnswer,
		indexOfValue,
		nearestIndex,
		placerAnswer,
		placerText
	} from '$lib/ubumark/utils/number-line-placer';
	import NumberLine from './NumberLine.svelte';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Droite à placer (`placer:` défini) */
		node: NumberLineNode;
		/** Une case par point de `placer:`, dans l'ordre écrit */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) ; la correction n'en montre pas */
		showErrors?: boolean;
		/** false : droite seule, sans boutons ni étiquettes (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	/** Le point de l'élève : la couleur d'accent, jamais le rouge de l'erreur */
	const STUDENT_COLOR = 'bleu';
	/** Le point juste, dans la correction */
	const SOLUTION_COLOR = 'vert';
	/** Distance (px) sous laquelle toucher un point posé le reprend */
	const GRAB_DISTANCE = 16;

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let config = $derived(node.config);
	let targets = $derived<NumberLineTarget[]>(node.placer ?? []);
	let several = $derived(targets.length > 1);
	/** Prof : graduations trop serrées pour le doigt sur un téléphone */
	let phoneWarning = $derived(phoneGapWarning(config));
	let count = $derived(graduationCount(config));

	/**
	 * Graduation de chaque point : gardée ici, les cases n'en gardent que
	 * l'écriture. Relue seulement quand la valeur d'une case change (case remise à
	 * vide, composant remonté) ; réassignée à chaque geste (dérivé modifiable),
	 * comme la monnaie à construire.
	 */
	let positions = $derived<(number | null)[]>(
		targets.map((_, i) => indexOfAnswer(config, answers?.[i]?.value ?? ''))
	);

	/** Rang du point que le geste déplace */
	let active = $state(0);
	let locked = $derived(answers?.some((a) => a.disabled) ?? false);
	let dragging = $state(false);
	/** Le point actif était absent quand le doigt s'est posé : au lever, on passe au suivant */
	let placingNew = false;
	let zone: HTMLDivElement | undefined = $state();

	/** Nom d'un point dans les phrases : « le point », ou « B » */
	function pointName(i: number): string {
		return targets[i]?.name || 'le point';
	}

	/** Valeur de la graduation k pour le dessin */
	function valueOf(k: number): NumberLineValue {
		const expression = decimalString(graduationValue(config, k));
		return { expression, ast: parseCustom(expression) };
	}

	/** La droite sans `placer:` (elle se dessine seule), avec des points aux rangs donnés */
	function lineWithPoints(ranks: (number | null)[], color: string): NumberLineNode {
		const points: NumberLinePoint[] = ranks.flatMap((k, i) =>
			k === null ? [] : [{ label: targets[i]?.name ?? '', value: valueOf(k), color }]
		);
		return { ...node, placer: undefined, caseIndex: undefined, points };
	}

	let shown = $derived(lineWithPoints(positions, STUDENT_COLOR));
	let solutionRanks = $derived(targets.map((t) => indexOfValue(config, numVal(t.value))));
	let solution = $derived(lineWithPoints(solutionRanks, SOLUTION_COLOR));

	/** Verdict de la droite : faux dès qu'un point l'est, juste quand tous le sont */
	let verdict = $derived.by<boolean | null>(() => {
		if (!answers || answers.length === 0) return null;
		if (answers.some((a) => a.isCorrect === false)) return false;
		return answers.every((a) => a.isCorrect === true) ? true : null;
	});

	/** Phrases de la correction : une par point faux */
	let mistakes = $derived(
		targets.flatMap((target, i) => {
			if (answers?.[i]?.isCorrect !== false) return [];
			const k = positions[i];
			if (!several && !target.name) {
				return [
					k === null ? 'Tu n’as rien placé.' : `Tu as placé le point sur ${placerText(config, k)}.`
				];
			}
			return [
				k === null
					? `Tu n’as pas placé ${pointName(i)}.`
					: `Tu as placé ${pointName(i)} sur ${placerText(config, k)}.`
			];
		})
	);

	let zoneLabel = $derived(several ? 'Droite graduée : tes points' : 'Droite graduée : ton point');
	let valueText = $derived.by(() => {
		const k = positions[active] ?? null;
		const name = targets[active]?.name;
		if (!name) return k === null ? 'aucun point' : `point sur ${placerText(config, k)}`;
		return k === null ? `point ${name} pas placé` : `point ${name} sur ${placerText(config, k)}`;
	});

	function place(k: number) {
		if (locked) return;
		const next = Math.max(0, Math.min(count - 1, k));
		if (next === positions[active]) return;
		positions = positions.with(active, next);
		answers?.[active]?.onChange(placerAnswer(config, next));
	}

	/** Après la pose d'un point absent : le premier point suivant non placé devient actif */
	function advance() {
		for (let step = 1; step < targets.length; step++) {
			const i = (active + step) % targets.length;
			if (positions[i] === null) {
				active = i;
				return;
			}
		}
	}

	/** Position du doigt sur la droite (le SVG est dessiné à sa largeur réelle, en px) */
	function pointerX(event: PointerEvent): { x: number; width: number } | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0) return null;
		return { x: event.clientX - rect.left, width: rect.width };
	}

	/** Graduation la plus proche du doigt */
	function indexAt(event: PointerEvent): number | null {
		const at = pointerX(event);
		if (at === null) return null;
		const value = xToValue(at.x, numVal(config.start), numVal(config.end), at.width);
		return nearestIndex(config, value);
	}

	/** Le point posé sous le doigt (le point actif d'abord) ; null si aucun */
	function grabbedAt(event: PointerEvent): number | null {
		const at = pointerX(event);
		if (at === null) return null;
		const start = numVal(config.start);
		const end = numVal(config.end);
		const near = positions.flatMap((k, i) => {
			if (k === null) return [];
			const x = valueToX(graduationValue(config, k), start, end, 'linear', at.width);
			const distance = Math.abs(x - at.x);
			return distance <= GRAB_DISTANCE ? [{ i, distance }] : [];
		});
		if (near.some((p) => p.i === active)) return active;
		near.sort((a, b) => a.distance - b.distance);
		return near[0]?.i ?? null;
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const grabbed = grabbedAt(event);
		if (grabbed !== null) {
			active = grabbed;
			placingNew = false;
		} else {
			const k = indexAt(event);
			if (k === null) return;
			placingNew = positions[active] === null;
			place(k);
		}
		dragging = true;
		zone?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		const k = indexAt(event);
		if (k !== null) place(k);
	}

	function handlePointerUp() {
		if (dragging && placingNew) advance();
		dragging = false;
		placingNew = false;
	}

	/** Un cran ; sans point, ▶ pose sur la première graduation, ◀ sur la dernière */
	function stepBy(delta: 1 | -1) {
		const current = positions[active] ?? null;
		if (current === null) place(delta === 1 ? 0 : count - 1);
		else place(current + delta);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowRight: () => stepBy(1),
			ArrowUp: () => stepBy(1),
			ArrowLeft: () => stepBy(-1),
			ArrowDown: () => stepBy(-1),
			Home: () => place(0),
			End: () => place(count - 1)
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
		aria-valuemin={0}
		aria-valuemax={count - 1}
		aria-valuenow={positions[active] ?? undefined}
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
		<div class="flex flex-wrap items-center justify-center gap-3">
			<button
				type="button"
				class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Reculer le point d’une graduation"
				disabled={locked || positions[active] === 0}
				onclick={() => stepBy(-1)}
			>
				<span aria-hidden="true">◀</span>
			</button>
			{#if several}
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
							onclick={() => (active = i)}
						>
							{target.name}
						</button>
					{/each}
				</div>
			{/if}
			<button
				type="button"
				class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Avancer le point d’une graduation"
				disabled={locked || positions[active] === count - 1}
				onclick={() => stepBy(1)}
			>
				<span aria-hidden="true">▶</span>
			</button>
		</div>
	{/if}

	{#if errorsVisible && phoneWarning !== null}
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
		<div class="placer-correction flex w-full flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<NumberLine node={solution} showErrors={false} pointsOnLine />
		</div>
	{/if}
</div>

<style>
	.placer-zone {
		border-color: transparent;
		cursor: pointer;
		/* Le glisser horizontal est pour le point ; le défilement vertical reste */
		touch-action: pan-y;
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
