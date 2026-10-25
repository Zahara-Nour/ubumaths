<!--
	FigureACompleterView — case « figure » d'un bloc ```figure-a-completer (chargé à la demande)
	=========================================================================================

	La figure de départ (`FigureBlockView`, même SVG qu'en statique et qu'au PDF)
	et, par-dessus, le tracé de l'élève. Comportements validés par David le
	2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5) :

	- toucher un point puis un autre trace la droite, qui va jusqu'aux bords ;
	  près d'un point, le toucher est aimanté (`SNAP_RADIUS_PX` à l'écran) ;
	- clavier : les points nommés sont des boutons (Tab, puis Entrée ou Espace) ;
	- « Effacer » : le départ en attente, sinon la dernière droite ;
	- après Valider : juste → ses droites en vert ; faux → la bonne droite en
	  pointillés par-dessus (le message est celui de l'écran) ;
	- `showSolution` (mode correction) : la figure et la bonne droite.

	Importé UNIQUEMENT par `FigureBlock` via `import()`. Il inscrit le calcul des
	positions (`positions-setup`) dont le juge a besoin à la validation.

	@module components/markdown/nodes/FigureACompleterView
-->
<script lang="ts">
	import type { FigureNode } from '$lib/ubumark/types/figure';
	import type { FigureScene } from '$lib/ubumark/utils/figure-scene';
	import { createTransformer } from '$lib/geometry-core/viewport/viewport';
	// Inscrit aussi le calcul des positions du juge (effet de bord voulu, cf. positions.ts)
	import { namedPointPositions } from '$lib/questions/construction/positions-setup';
	import {
		parseConstructionAnswer,
		serializeConstructionAnswer,
		type DrawnLine
	} from '$lib/questions/construction/answer';
	import type { Position } from '$lib/questions/construction/judge';
	import {
		SNAP_RADIUS_PX,
		addTap,
		canErase,
		clipLineToWindow,
		eraseLast,
		snapTap,
		solutionLines,
		type ConstructionAnswerInput,
		type Drawing
	} from '$lib/questions/construction/drawing';
	import { Button } from '$lib/components/ui/button';
	import FigureBlockView from './FigureBlockView.svelte';

	interface Props {
		node: FigureNode;
		errorsVisible: boolean;
		/** Case de la question : l'élève trace */
		answer?: ConstructionAnswerInput;
		/** Mode correction : la bonne droite */
		showSolution?: boolean;
		class?: string;
	}

	let {
		node,
		errorsVisible,
		answer,
		showSolution = false,
		class: className = ''
	}: Props = $props();

	/**
	 * Départ d'une droite, en attente du second toucher (jamais dans la réponse),
	 * lié au bloc où il a été posé : la vue peut rester montée d'une question à
	 * la suivante (`{#each}` de `FillBlanksInput` indexé par position)
	 */
	// `raw` : sans proxy, le nœud reste comparable par référence
	let pending = $state.raw<{ node: FigureNode; at: Position } | null>(null);

	let interactive = $derived(answer !== undefined && !answer.disabled);
	let lines = $derived(parseConstructionAnswer(answer?.value ?? '') ?? []);
	// Plus de saisie (Valider, correction) ou autre bloc : le départ en attente disparaît
	let start = $derived(interactive && pending?.node === node ? pending.at : null);
	let drawing: Drawing = $derived({ lines, start });
	let corrected = $derived(answer?.isCorrect === false || showSolution);
	let checks = $derived(node.construction?.checks ?? []);

	function apply(next: Drawing) {
		pending = next.start ? { node, at: next.start } : null;
		if (next.lines !== drawing.lines) answer?.onChange(serializeConstructionAnswer(next.lines));
	}

	function tapAt(position: Position) {
		if (!interactive) return;
		apply(addTap(drawing, position));
	}

	/** Toucher (doigt, souris) : coordonnées de la fenêtre, puis de la figure */
	function handleTap(event: MouseEvent, scene: FigureScene, width: number, height: number) {
		const target = event.currentTarget;
		if (!(target instanceof SVGGraphicsElement)) return;
		const matrix = target.getScreenCTM();
		if (!matrix) return;
		const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		const transformer = createTransformer(scene.viewport, width, height);
		const math = transformer.svgToMath(local.x, local.y);
		// Rayon à l'écran → unités de la fenêtre (échelle d'affichage) → unités de la figure
		const radius = SNAP_RADIUS_PX / Math.abs(matrix.a) / transformer.scaleX;
		tapAt(snapTap(math, namedPointPositions(scene), radius));
	}

	function handlePointKey(event: KeyboardEvent, position: Position) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		tapAt({ x: position.x, y: position.y });
	}

	function erase() {
		apply(eraseLast(drawing));
	}

	/** Une droite à l'écran : découpée à la fenêtre, en coordonnées SVG */
	function toScreen(line: DrawnLine, scene: FigureScene, width: number, height: number) {
		const clipped = clipLineToWindow(line, scene.viewport);
		if (!clipped) return null;
		const transformer = createTransformer(scene.viewport, width, height);
		const a = transformer.mathToSvg(clipped.x1, clipped.y1);
		const b = transformer.mathToSvg(clipped.x2, clipped.y2);
		return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
	}
</script>

{#snippet layer({ scene, width, height }: { scene: FigureScene; width: number; height: number })}
	{@const points = namedPointPositions(scene)}
	{@const transformer = createTransformer(scene.viewport, width, height)}
	<g class="figure-a-completer-trace">
		{#if interactive}
			<!-- Zone de toucher : toute la fenêtre (un toucher hors d'un point part de là) -->
			<rect
				data-testid="zone-de-trace"
				class="zone-de-trace"
				x="0"
				y="0"
				{width}
				{height}
				fill="transparent"
				role="presentation"
				onclick={(event) => handleTap(event, scene, width, height)}
			/>
		{/if}
		{#each lines as line, i (i)}
			{@const s = toScreen(line, scene, width, height)}
			{#if s}
				<line
					data-testid="droite-eleve"
					class="droite-eleve"
					class:droite-juste={answer?.isCorrect === true}
					x1={s.x1}
					y1={s.y1}
					x2={s.x2}
					y2={s.y2}
				/>
			{/if}
		{/each}
		{#if corrected}
			{#each solutionLines(checks, points) as line, i (i)}
				{@const s = toScreen(line, scene, width, height)}
				{#if s}
					<line
						data-testid="bonne-droite"
						class="bonne-droite"
						x1={s.x1}
						y1={s.y1}
						x2={s.x2}
						y2={s.y2}
					/>
				{/if}
			{/each}
		{/if}
		{#if drawing.start}
			{@const p = transformer.mathToSvg(drawing.start.x, drawing.start.y)}
			<circle data-testid="depart" class="depart" cx={p.x} cy={p.y} r="9" />
		{/if}
		{#if interactive}
			<!-- Clavier : chaque point nommé est un bouton (le toucher passe par la zone) -->
			{#each [...points] as [name, position] (name)}
				{@const p = transformer.mathToSvg(position.x, position.y)}
				<circle
					class="point-cible"
					cx={p.x}
					cy={p.y}
					r="11"
					role="button"
					tabindex="0"
					aria-label="Point {name}"
					pointer-events="none"
					onkeydown={(event) => handlePointKey(event, position)}
				/>
			{/each}
		{/if}
	</g>
{/snippet}

<div class="figure-a-completer {className}">
	<FigureBlockView {node} {errorsVisible} overlay={layer} {interactive} />
	{#if interactive}
		<div class="figure-a-completer-outils">
			<Button variant="outline" size="sm" onclick={erase} disabled={!canErase(drawing)}>
				Effacer
			</Button>
		</div>
	{/if}
	<!-- Zone toujours présente : une zone live insérée déjà remplie est souvent tue -->
	<p class="sr-only" role="status">
		{#if answer?.isCorrect === true}réponse juste{:else if answer?.isCorrect === false}réponse
			fausse{/if}
	</p>
</div>

<style>
	.zone-de-trace {
		cursor: crosshair;
		/* Pas de double-tap pour zoomer : deux touchers rapides tracent une droite */
		touch-action: manipulation;
	}

	.droite-eleve {
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}

	.droite-juste {
		stroke: var(--color-success);
	}

	.bonne-droite {
		stroke: var(--color-success);
		stroke-width: 2.5;
		stroke-dasharray: 8 5;
		pointer-events: none;
	}

	.depart {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.5;
		pointer-events: none;
	}

	.point-cible {
		fill: transparent;
		outline: none;
	}

	.point-cible:focus-visible {
		stroke: var(--color-ring);
		stroke-width: 2;
	}

	.figure-a-completer-outils {
		display: flex;
		justify-content: center;
		margin-top: 0.25rem;
	}
</style>
