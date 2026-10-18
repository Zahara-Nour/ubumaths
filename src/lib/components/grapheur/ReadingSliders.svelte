<script lang="ts">
	/**
	 * Le point glissant de la lecture graphique : un curseur par courbe lue,
	 * posé sur l'axe des abscisses, qu'on fait glisser à la souris, au doigt ou
	 * aux flèches (lot 3 bis de `docs/wip/atelier-refonte-interface-phase0.md`).
	 *
	 * ⚠️ En HTML, À CÔTÉ du SVG et non dedans : le SVG du grapheur est masqué
	 * aux lecteurs d'écran et enveloppé dans une image (`role="img"`), dont les
	 * enfants ne sont pas atteignables. Le dessin des pointillés, lui, reste
	 * dans le SVG (`ImageReadings`).
	 *
	 * @component
	 */
	import { useGrapheurStore } from '$lib/stores/grapheur-context';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { computeGridStep } from '$lib/geometry-core/viewport';
	import { isExplicitFunction } from '$lib/grapheur/types';
	import { curveColorValue } from '$lib/grapheur/colors';
	import {
		readingAt,
		readingNumber,
		readingSentence,
		snapReading
	} from '$lib/grapheur/image-reading';

	let {
		transformer,
		width,
		height,
		sliders,
		onmove
	}: {
		transformer: CoordinateTransformer;
		width: number;
		height: number;
		/** L'abscisse du point glissant de chaque courbe lue, par identifiant. */
		sliders: ReadonlyMap<string, number>;
		/** Le point de la courbe `id` va en `at`. */
		onmove: (id: string, at: number) => void;
	} = $props();

	const grapheurStore = useGrapheurStore();

	/** Le pas des flèches : la sous-grille ; Page ↑ / Page ↓ : la grille. */
	const step = $derived(computeGridStep(transformer.scaleX));

	/** La hauteur de l'axe des abscisses, ramenée au bord s'il est hors du cadre. */
	const axisY = $derived(Math.min(Math.max(transformer.mathToSvg(0, 0).y, 0), height));

	const handles = $derived.by(() =>
		grapheurStore.visibleFunctions.filter(isExplicitFunction).flatMap((func) => {
			const at = sliders.get(func.id);
			if (func.reading === undefined || at === undefined) return [];
			const name = func.reading.name;
			const point = readingAt(func, at, grapheurStore.parameterBindings);
			const x = Math.min(Math.max(transformer.mathToSvg(at, 0).x, 0), width);
			return [
				{
					id: func.id,
					name,
					at,
					x,
					color: curveColorValue(func.color),
					text:
						point === null
							? `Lecture de ${name} en x = ${readingNumber(at).text} : ${name} n'est pas définie en ${readingNumber(at).text}`
							: readingSentence(name, point)
				}
			];
		})
	);

	/** Ce qu'on annonce au relâchement d'un glissé (les flèches, elles, font lire la valeur). */
	let announcement = $state('');

	/** La courbe dont on fait glisser le point. */
	let dragging: string | null = null;

	/** Un pas, sans les queues de flottants (`0.30000000000000004`). */
	function stepped(at: number, delta: number, unit: number): number {
		return Number((Math.round((at + delta) / unit) * unit).toFixed(10)) + 0;
	}

	function handleKeydown(event: KeyboardEvent, id: string, at: number) {
		const minor = step.minor > 0 ? step.minor : 0.5;
		const major = step.major > 0 ? step.major : 1;
		const moves: Record<string, [number, number]> = {
			ArrowRight: [minor, minor],
			ArrowUp: [minor, minor],
			ArrowLeft: [-minor, minor],
			ArrowDown: [-minor, minor],
			PageUp: [major, major],
			PageDown: [-major, major]
		};
		const move = moves[event.key];
		if (move === undefined) return;
		// Consommée : le KeyboardHandler du grapheur l'ignore (`defaultPrevented`, #1487)
		event.preventDefault();
		onmove(id, stepped(at, move[0], move[1]));
	}

	/** L'abscisse sous le pointeur, aimantée aux entiers et aux demis. */
	function pointerAt(event: PointerEvent): number {
		const frame = (event.currentTarget as HTMLElement).parentElement;
		const left = frame?.getBoundingClientRect().left ?? 0;
		return snapReading(transformer.svgToMath(event.clientX - left, 0).x);
	}

	function handlePointerDown(event: PointerEvent, id: string) {
		if (event.button !== 0) return;
		// Le graphe se déplacerait sous le même geste
		event.stopPropagation();
		event.preventDefault();
		dragging = id;
		(event.currentTarget as HTMLElement).focus();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent, id: string) {
		if (dragging !== id) return;
		onmove(id, pointerAt(event));
	}

	function handlePointerUp(event: PointerEvent, id: string, text: string) {
		if (dragging !== id) return;
		dragging = null;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		announcement = text;
	}
</script>

<div class="reading-sliders">
	{#each handles as handle (handle.id)}
		<div
			role="slider"
			tabindex="0"
			class="reading-handle"
			style:left="{handle.x}px"
			style:top="{axisY}px"
			style:--handle-color={handle.color}
			aria-label="Lecture graphique de {handle.name}"
			aria-orientation="horizontal"
			aria-valuemin={grapheurStore.viewport.xMin}
			aria-valuemax={grapheurStore.viewport.xMax}
			aria-valuenow={handle.at}
			aria-valuetext={handle.text}
			title={handle.text}
			onkeydown={(event) => handleKeydown(event, handle.id, handle.at)}
			onpointerdown={(event) => handlePointerDown(event, handle.id)}
			onpointermove={(event) => handlePointerMove(event, handle.id)}
			onpointerup={(event) => handlePointerUp(event, handle.id, handle.text)}
		></div>
	{/each}
	<p class="sr-only" aria-live="polite">{announcement}</p>
</div>

<style>
	.reading-sliders {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* 24 px de cible (WCAG 2.5.8), un losange sur l'axe : il ne se confond pas
	   avec les points ronds des courbes */
	.reading-handle {
		position: absolute;
		width: 24px;
		height: 24px;
		transform: translate(-50%, -50%);
		pointer-events: auto;
		touch-action: none;
		cursor: ew-resize;
		border-radius: 4px;
	}

	.reading-handle::before {
		content: '';
		position: absolute;
		inset: 6px;
		transform: rotate(45deg);
		background: var(--handle-color);
		border: 2px solid var(--color-background);
		box-shadow: 0 0 0 1px var(--handle-color);
	}

	.reading-handle:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
</style>
