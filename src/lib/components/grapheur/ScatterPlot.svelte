<script lang="ts">
	/**
	 * Dessine un nuage de points à partir de deux séries de nombres.
	 *
	 * ⚠️ Distinct du nuage d'une suite (`SequencePlot`, représentation
	 * « rangs ») : là l'abscisse EST le rang et l'ordonnée vient d'une formule.
	 * Ici les deux coordonnées sont des données que l'élève a saisies.
	 */
	import type { ScatterPlottable } from '$lib/grapheur/types';
	import type { CoordinateTransformer } from '$lib/geometry-core/viewport';

	let {
		scatter,
		transformer
	}: {
		scatter: ScatterPlottable;
		transformer: CoordinateTransformer;
	} = $props();

	/** Rayon d'un point, en pixels. Le même que pour les termes d'une suite. */
	const POINT_RADIUS = 4;

	/**
	 * Les points effectivement dessinables.
	 *
	 * ⚠️ Deux filtres, pour deux raisons différentes :
	 *
	 * - la boucle s'arrête à la **plus courte** des deux séries : une liste plus
	 *   longue que l'autre est ordinaire quand on saisit des données, pas une
	 *   faute (§4 L1) — et c'est la vue Données qui le dit à l'élève, pas ici ;
	 * - une valeur non finie est **sautée**, les autres restent dessinées :
	 *   `NaN` projeté donnerait un attribut SVG invalide, et le navigateur
	 *   abandonnerait le point sans rien dire.
	 */
	const points = $derived.by(() => {
		const count = Math.min(scatter.xs.length, scatter.ys.length);
		const drawable: { key: number; x: number; y: number }[] = [];

		for (let i = 0; i < count; i++) {
			const x = scatter.xs[i];
			const y = scatter.ys[i];
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
			const svg = transformer.mathToSvg(x, y);
			drawable.push({ key: i, x: svg.x, y: svg.y });
		}
		return drawable;
	});
</script>

{#if scatter.visible}
	<g class="scatter-plot" data-label={scatter.label}>
		{#each points as point (point.key)}
			<circle
				cx={point.x}
				cy={point.y}
				r={POINT_RADIUS}
				fill={scatter.color}
				class="scatter-point"
			/>
		{/each}
	</g>
{/if}

<style>
	.scatter-point {
		/* Les points ne captent pas la souris : le survol de courbe doit rester
		   utilisable au travers d'un nuage. */
		pointer-events: none;
	}
</style>
