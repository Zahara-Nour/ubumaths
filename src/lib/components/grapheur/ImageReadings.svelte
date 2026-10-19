<script lang="ts">
	/**
	 * La lecture graphique de l'image : des pointillés de `a` sur l'axe des
	 * abscisses jusqu'à la courbe, puis jusqu'à `f(a)` sur l'axe des ordonnées,
	 * avec les deux valeurs écrites au pied des traits.
	 *
	 * Deux sources (lot 3 bis de `docs/archive/wip/atelier-refonte-interface-phase0.md`) :
	 * les calculs `f(a)` de la console (`reading.at`) et le point glissant de
	 * chaque courbe (`sliders`, tenu par `GraphSVG`). Décoratif, comme tout le
	 * SVG du grapheur : ce qui se lit est dit par la console et par le curseur.
	 *
	 * @component
	 */
	import { useGrapheurStore } from '$lib/stores/grapheur-context';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { isExplicitFunction } from '$lib/grapheur/types';
	import { curveColorValue } from '$lib/grapheur/colors';
	import {
		readingAt,
		readingGeometry,
		readingNumber,
		type ReadingPoint
	} from '$lib/grapheur/image-reading';
	import GraphLabel from './GraphLabel.svelte';

	let {
		transformer,
		width,
		height,
		sliders
	}: {
		transformer: CoordinateTransformer;
		width: number;
		height: number;
		/** L'abscisse du point glissant de chaque courbe lue, par identifiant. */
		sliders: ReadonlyMap<string, number>;
	} = $props();

	const grapheurStore = useGrapheurStore();

	/** Ce qu'on dessine : une entrée par lecture, avec sa courbe et sa source. */
	const drawn = $derived.by(() =>
		grapheurStore.visibleFunctions.filter(isExplicitFunction).flatMap((func) => {
			if (func.reading === undefined) return [];
			const bindings = grapheurStore.parameterBindings;
			const fromConsole = func.reading.at
				.map((at) => readingAt(func, at, bindings))
				.filter((point): point is ReadingPoint => point !== null)
				.map((point) => ({ point, source: 'console' as const }));
			const sliderAt = sliders.get(func.id);
			const slider = sliderAt === undefined ? null : readingAt(func, sliderAt, bindings);
			return [
				...fromConsole,
				...(slider === null ? [] : [{ point: slider, source: 'curseur' as const }])
			].map((entry) => ({
				...entry,
				key: `${func.id}-${entry.source}-${entry.point.at}`,
				color: curveColorValue(func.color),
				geometry: readingGeometry(entry.point, transformer, width, height)
			}));
		})
	);

	/** `≈ 1,41` ou `2,25` : comme la console. */
	function written(value: number): string {
		const number = readingNumber(value);
		return number.approx ? `≈ ${number.text}` : number.text;
	}
</script>

<g class="image-readings" pointer-events="none" aria-hidden="true">
	{#each drawn as reading (reading.key)}
		{@const { vertical, horizontal, point } = reading.geometry}
		<g data-source={reading.source}>
			<line
				class="lecture-verticale"
				x1={vertical.x1}
				y1={vertical.y1}
				x2={vertical.x2}
				y2={vertical.y2}
				style:stroke={reading.color}
				stroke-width="1.5"
				stroke-dasharray="4 3"
			/>
			<line
				class="lecture-horizontale"
				x1={horizontal.x1}
				y1={horizontal.y1}
				x2={horizontal.x2}
				y2={horizontal.y2}
				style:stroke={reading.color}
				stroke-width="1.5"
				stroke-dasharray="4 3"
			/>
			<circle
				class="lecture-point"
				cx={point.x}
				cy={point.y}
				r="4.5"
				style:fill={reading.color}
				stroke="white"
				stroke-width="1.5"
			/>
			<GraphLabel
				x={vertical.x1}
				y={vertical.y1}
				content={{ text: written(reading.point.at), latex: null }}
				accent={reading.color}
				canvasWidth={width}
				canvasHeight={height}
			/>
			<GraphLabel
				x={horizontal.x2}
				y={horizontal.y2}
				content={{ text: written(reading.point.y), latex: null }}
				accent={reading.color}
				canvasWidth={width}
				canvasHeight={height}
			/>
		</g>
	{/each}
</g>
