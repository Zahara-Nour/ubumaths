<!--
	Cubes — bloc ```cubes
	=====================

	Assemblage de cubes en perspective cavalière, ou l'une de ses vues (dessus,
	face, droite, gauche). Affichage seul : aucune case, aucun geste. Dessiné
	depuis `buildEspaceScene`, la même scène que le PDF.

	- Trois teintes (dessus, devant, côté) tirées des tokens du thème, contours
	  `var(--color-foreground)` ; aucune couleur d'accent. Couleurs du thème
	  uniquement (`var(--color-*)`).
	- Nom accessible : la vue seule, jamais le nombre de cubes (ce serait la réponse).
	- Taille réelle identique à l'écran et au PDF (arête = 1 cm) ; jamais plus
	  large que le conteneur ; `--espace-taille` (3 cm dans un choix) plafonne
	  la largeur, le dessin se réduit alors d'un bloc.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Cubes
-->
<script lang="ts">
	import { ESPACE_UNAVAILABLE, type EspaceNode } from '$lib/ubumark/types/espace';
	import {
		ESPACE_CM_PER_UNIT,
		ESPACE_MARGIN,
		ESPACE_STROKE,
		buildEspaceScene,
		espaceLabel
	} from '$lib/ubumark/utils/espace-scene';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let scene = $derived(node.spec === null ? null : buildEspaceScene(node.spec));

	/** Sommets d'un polygone, au format de l'attribut `points` */
	const polygonPoints = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');
</script>

{#if node.spec === null || scene === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="cubes-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc cubes : figure non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="cubes-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{ESPACE_UNAVAILABLE}
		</div>
	{/if}
{:else}
	{@const width = scene.width + 2 * ESPACE_MARGIN}
	{@const height = scene.height + 2 * ESPACE_MARGIN}
	<div class="cubes-bloc my-2 flex justify-center {className}">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label={espaceLabel(node.spec)}
			class="cubes-figure"
			style:width="{width * ESPACE_CM_PER_UNIT}cm"
			style:aspect-ratio="{width} / {height}"
			stroke-width={ESPACE_STROKE}
			stroke-linejoin="round"
		>
			{#each scene.polygons as polygon, i (i)}
				<polygon class="cubes-face cubes-{polygon.kind}" points={polygonPoints(polygon.points)} />
			{/each}
		</svg>
	</div>
{/if}

<style>
	.cubes-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) : le dessus
	   prend le fond, le devant et le côté foncent de plus en plus */
	.cubes-face {
		stroke: var(--color-foreground);
	}

	.cubes-dessus,
	.cubes-case {
		fill: var(--color-background);
	}

	.cubes-devant {
		fill: color-mix(in srgb, var(--color-foreground) 12%, var(--color-background));
	}

	.cubes-cote {
		fill: color-mix(in srgb, var(--color-foreground) 28%, var(--color-background));
	}
</style>
