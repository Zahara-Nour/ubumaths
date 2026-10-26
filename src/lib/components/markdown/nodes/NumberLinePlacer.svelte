<!--
	NumberLinePlacer — droite graduée à placer (```line + `placer:`)
	================================================================

	L'élève pose SON point sur une graduation (CP-008 ; chantier
	`docs/wip/reponses-a-placer-progress.md` § 4, 6).

	- Toucher la droite pose le point sur la graduation la plus proche (aimant) ;
	  le glisser le déplace ; retoucher ailleurs le repose.
	- Boutons ◀ ▶ toujours visibles (un cran), flèches du clavier, Début, Fin.
	- La valeur attendue n'est JAMAIS affichée ni dite avant la correction ; le nom
	  accessible donne la graduation choisie par l'élève, pas celle attendue.
	- Dans une question (`answer`) : la graduation est la réponse de la case
	  (`placerAnswer`, '' sans point), jugée par le juge ordinaire. Faux : « Tu as
	  placé le point sur 9. » et la droite juste à côté.
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/NumberLinePlacer
-->
<script lang="ts">
	import type { NumberLineNode, NumberLineValue } from '$lib/ubumark/types/number-line';
	import { parseCustom } from '$lib/mathAST/parser/custom';
	import { NL_LAYOUT, numVal, xToValue } from '$lib/ubumark/utils/number-line-render';
	import {
		graduationCount,
		graduationValue,
		indexOfAnswer,
		indexOfValue,
		nearestIndex,
		placerAnswer,
		placerText
	} from '$lib/ubumark/utils/number-line-placer';
	import NumberLine from './NumberLine.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Droite à placer (`placer:` défini) */
		node: NumberLineNode;
		answer?: BuildCase;
		/** false : droite seule, sans boutons (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answer, showControls = true, class: className = '' }: Props = $props();

	/** Nom accessible de la zone : jamais la valeur attendue */
	const ZONE_ARIA_LABEL = 'Droite graduée : ton point';

	let config = $derived(node.config);
	let count = $derived(graduationCount(config));

	/**
	 * Graduation de l'élève : gardée ici, la case n'en garde que l'écriture.
	 * Relue seulement quand la valeur de la case change (case remise à vide,
	 * composant remonté) ; réassignée à chaque geste (dérivé modifiable), comme
	 * la monnaie à construire.
	 */
	let current = $derived<number | null>(indexOfAnswer(config, answer?.value ?? ''));

	let locked = $derived(answer?.disabled ?? false);
	let dragging = $state(false);
	let zone: HTMLDivElement | undefined = $state();

	/** La droite sans `placer:` (elle se dessine seule), avec un point au rang k */
	function lineWithPoint(k: number | null, color?: string): NumberLineNode {
		const rest = { ...node, placer: undefined, caseIndex: undefined };
		if (k === null) return { ...rest, points: [] };
		return { ...rest, points: [{ label: '', value: valueOf(k), ...(color && { color }) }] };
	}

	/** Valeur de la graduation k pour le dessin */
	function valueOf(k: number): NumberLineValue {
		const expression = String(Math.round(graduationValue(config, k) * 1e9) / 1e9);
		return { expression, ast: parseCustom(expression) };
	}

	let shown = $derived(lineWithPoint(current));
	let solutionIndex = $derived(node.placer ? indexOfValue(config, numVal(node.placer)) : null);
	let solution = $derived(solutionIndex === null ? null : lineWithPoint(solutionIndex));

	function place(k: number) {
		if (locked) return;
		const next = Math.max(0, Math.min(count - 1, k));
		if (next === current) return;
		current = next;
		answer?.onChange(placerAnswer(config, next));
	}

	/** Graduation la plus proche du doigt (le SVG occupe toute la largeur de la zone) */
	function indexAt(event: PointerEvent): number | null {
		const svg = zone?.querySelector('svg');
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0) return null;
		const svgX = ((event.clientX - rect.left) / rect.width) * NL_LAYOUT.SVG_WIDTH;
		return nearestIndex(config, xToValue(svgX, numVal(config.start), numVal(config.end)));
	}

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const k = indexAt(event);
		if (k === null) return;
		dragging = true;
		zone?.setPointerCapture?.(event.pointerId);
		place(k);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		const k = indexAt(event);
		if (k !== null) place(k);
	}

	function handlePointerUp() {
		dragging = false;
	}

	/** Un cran ; sans point, ▶ pose sur la première graduation, ◀ sur la dernière */
	function stepBy(delta: 1 | -1) {
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
		class="placer-zone w-full rounded-md border"
		class:placer-juste={answer?.isCorrect === true}
		class:placer-faux={answer?.isCorrect === false}
		class:placer-verrouille={locked}
		role="slider"
		tabindex={locked ? -1 : 0}
		aria-label={ZONE_ARIA_LABEL}
		aria-valuemin={0}
		aria-valuemax={count - 1}
		aria-valuenow={current ?? undefined}
		aria-valuetext={current === null ? 'aucun point' : `point sur ${placerText(config, current)}`}
		aria-disabled={locked}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		<NumberLine node={shown} />
	</div>

	{#if showControls}
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Reculer le point d’une graduation"
				disabled={locked || current === 0}
				onclick={() => stepBy(-1)}
			>
				<span aria-hidden="true">◀</span>
			</button>
			<button
				type="button"
				class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Avancer le point d’une graduation"
				disabled={locked || current === count - 1}
				onclick={() => stepBy(1)}
			>
				<span aria-hidden="true">▶</span>
			</button>
		</div>
	{/if}

	{#if answer?.isCorrect != null}
		<p class="sr-only" role="status">
			{answer.isCorrect ? 'réponse juste' : 'réponse fausse'}
		</p>
	{/if}

	{#if answer?.isCorrect === false}
		<p class="text-sm">
			{current === null
				? 'Tu n’as rien placé.'
				: `Tu as placé le point sur ${placerText(config, current)}.`}
		</p>
		{#if solution !== null}
			<div class="placer-correction flex w-full flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<NumberLine node={solution} />
			</div>
		{/if}
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
</style>
