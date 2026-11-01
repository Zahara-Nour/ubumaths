<!--
	Partage — bloc ```partage
	=========================

	Figure partagée en parts égales (bande, grille, disque, carré coupé par ses
	diagonales), dont certaines sont coloriées (`gris:`). Affichage seul : aucune
	case, aucun geste. Dessinée depuis `buildPartageScenes`, les mêmes scènes que le PDF.
	Plusieurs figures (`unites:`) : côte à côte, à la ligne quand la place manque.
	Figure à colorier (`colorier:`) : `PartageColorier.svelte`.

	- Une seule couleur d'accent pour les parts coloriées ; traits nets. Couleurs
	  du thème uniquement (`var(--color-*)`).
	- Nom accessible : la forme seule (« Bande partagée en parts égales »), jamais
	  le nombre de parts ni de parts coloriées (ce serait la réponse).
	- Taille réelle identique à l'écran et au PDF (`PARTAGE_CM_PER_UNIT`) ;
	  jamais plus large que le conteneur.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Partage
-->
<script lang="ts">
	import { PARTAGE_UNAVAILABLE, type PartageNode } from '$lib/ubumark/types/partage';
	import {
		PARTAGE_CM_PER_UNIT,
		PARTAGE_MARGIN,
		PARTAGE_STROKE,
		buildPartageScenes,
		partageFigureLabel
	} from '$lib/ubumark/utils/partage-scene';
	import { readAuthoringErrors } from '../authoring-errors';
	import PartageColorier from './PartageColorier.svelte';

	interface Props {
		node: PartageNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let scenes = $derived(node.spec === null ? null : buildPartageScenes(node.spec));

	/** Sommets d'une part, au format de l'attribut `points` */
	const polygonPoints = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + PARTAGE_MARGIN},${p.y + PARTAGE_MARGIN}`).join(' ');
</script>

{#if node.spec === null || scenes === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="partage-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc partage : figure non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="partage-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{PARTAGE_UNAVAILABLE}
		</div>
	{/if}
{:else if node.spec.colorier}
	<!-- Figure à colorier hors question (aperçu, cours) : le geste, rien de jugé -->
	<PartageColorier {node} class={className} />
{:else}
	{@const spec = node.spec}
	<div class="partage-bloc my-2 flex flex-wrap justify-center gap-4 {className}">
		{#each scenes as scene, unit (unit)}
			{@const width = scene.width + 2 * PARTAGE_MARGIN}
			{@const height = scene.height + 2 * PARTAGE_MARGIN}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 {width} {height}"
				role="img"
				aria-label={partageFigureLabel(spec, unit)}
				class="partage-figure"
				style:width="{width * PARTAGE_CM_PER_UNIT}cm"
				style:aspect-ratio="{width} / {height}"
				stroke-width={PARTAGE_STROKE}
				stroke-linejoin="round"
			>
				{#each scene.parts as part (part.rank)}
					<polygon
						class="partage-part"
						class:partage-coloriee={part.shaded}
						points={polygonPoints(part.points)}
					/>
				{/each}
			</svg>
		{/each}
	</div>
{/if}

<style>
	.partage-figure {
		max-width: 100%;
		height: auto;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.partage-part {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}

	/* La seule couleur d'accent : les parts coloriées */
	.partage-coloriee {
		fill: var(--color-fig-orange);
	}
</style>
