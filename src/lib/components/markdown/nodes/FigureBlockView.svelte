<!--
	FigureBlockView — afficheur du bloc ```figure (chargé à la demande)
	===================================================================

	Interprète le script (`buildFigureScene`, interpréteur de geometry-core) et
	dessine un SVG STATIQUE à partir des primitives SVG de geometry-core
	(`figureToSvg`) : ni `GeometryCanvas` (mathlive + roughjs), ni store, ni
	interaction.

	Importé UNIQUEMENT par `FigureBlock` via `import()` : il ne doit jamais
	entrer dans le chunk des pages Markdown.

	- Repère isotrope : la largeur suit la taille, la hauteur la fenêtre.
	- Couleur par défaut = couleur du texte (`var(--color-foreground)`), posée en
	  `style:` : `var()` dans un ATTRIBUT de présentation n'est pas fiable partout.
	- `role="img"` + `aria-label` (description de l'auteur, sinon automatique).

	@module components/markdown/nodes/FigureBlockView
-->
<script lang="ts">
	import type { FigureNode } from '$lib/ubumark/types/figure';
	import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';
	import { figureToSvg } from '$lib/ubumark/utils/figure-svg';
	import FigureErrors from './FigureErrors.svelte';

	interface Props {
		node: FigureNode;
		errorsVisible: boolean;
		class?: string;
	}

	let { node, errorsVisible, class: className = '' }: Props = $props();

	let result = $derived(buildFigureScene(node));
	let drawing = $derived(result.scene ? figureToSvg(result.scene, node.header.size) : null);
</script>

{#if result.scene && drawing}
	<figure class="figure-bloc {className}">
		<svg
			role="img"
			aria-label={result.scene.ariaLabel}
			viewBox="0 0 {drawing.width} {drawing.height}"
			style:max-width="{drawing.width}px"
			class="figure-svg"
		>
			{#each drawing.shapes as s, i (i)}
				{#if s.kind === 'line'}
					<line
						data-element={s.elementId}
						x1={s.x1}
						y1={s.y1}
						x2={s.x2}
						y2={s.y2}
						style:stroke={s.color}
						stroke-width={s.width}
						stroke-dasharray={s.dash || undefined}
					/>
				{:else if s.kind === 'circle'}
					<circle
						data-element={s.elementId}
						cx={s.cx}
						cy={s.cy}
						r={s.r}
						style:stroke={s.color}
						stroke-width={s.width}
						stroke-dasharray={s.dash || undefined}
						style:fill={s.fill ?? 'none'}
						fill-opacity={s.fill ? 0.25 : undefined}
					/>
				{:else if s.kind === 'path'}
					<path
						data-element={s.elementId}
						d={s.d}
						style:stroke={s.color}
						stroke-width={s.width}
						stroke-dasharray={s.dash || undefined}
						style:fill={s.fill ?? 'none'}
					/>
				{:else if s.kind === 'polygon'}
					<polygon
						data-element={s.elementId}
						points={s.points}
						style:stroke={s.color}
						stroke-width={s.width}
						stroke-dasharray={s.dash || undefined}
						stroke-linejoin="round"
						style:fill={s.fill ?? 'none'}
						fill-opacity={s.fill ? 0.25 : undefined}
					/>
				{:else if s.kind === 'arrowhead'}
					<polygon data-element={s.elementId} points={s.points} style:fill={s.color} />
				{:else if s.kind === 'dot'}
					<circle data-element={s.elementId} cx={s.cx} cy={s.cy} r={s.r} style:fill={s.color} />
				{:else if s.kind === 'label'}
					<text
						data-element={s.elementId}
						class="figure-etiquette"
						class:figure-nom={s.italic}
						x={s.x}
						y={s.y}
						style:fill={s.color}
						text-anchor={s.anchor}
						dominant-baseline={s.anchor === 'middle' ? 'middle' : undefined}>{s.text}</text
					>
				{/if}
			{/each}
		</svg>

		{#if errorsVisible && result.warnings.length > 0}
			<ul class="mt-1 text-xs text-warning">
				{#each result.warnings as w, i (i)}
					<li>{w.message}</li>
				{/each}
			</ul>
		{/if}
	</figure>
{:else}
	<FigureErrors errors={result.errors} {errorsVisible} class={className} />
{/if}

<style>
	.figure-bloc {
		margin: 0.5rem 0;
	}

	.figure-svg {
		display: block;
		width: 100%;
		height: auto;
		margin: 0 auto;
		overflow: hidden;
		font-family: inherit;
	}

	.figure-etiquette {
		font-size: 13px;
		stroke: var(--color-background);
		stroke-width: 3px;
		paint-order: stroke;
	}

	.figure-nom {
		font-style: italic;
	}
</style>
