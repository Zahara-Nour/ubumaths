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
	- `tourner: oui` (chantier `solides-3d`, lot 6, ADR 0045) : l'élève fait
	  glisser l'assemblage pour le tourner (flèches au clavier), comme un solide
	  (`solide-rotation.svelte.ts`) ; il passe en douceur de la cavalière à une
	  vue droite. Les cubes restent pleins, sans tirets : les faces vues sont
	  recalculées à chaque angle, chacune garde sa teinte (l'arrière comme le
	  devant, la gauche comme la droite, le dessous comme le dessus). « Vue de
	  départ » (ou Échap) le ramène. Cadre carré fixe, réservé dès le repos.
	  `tourner:` qu'on ne peut pas suivre : phrase pour le prof, dessin fixe.

	@module components/markdown/nodes/Cubes
-->
<script lang="ts">
	import { ESPACE_UNAVAILABLE, type EspaceNode } from '#lib/ubumark/types/espace.ts';
	import {
		ESPACE_CM_PER_UNIT,
		ESPACE_MARGIN,
		ESPACE_STROKE,
		buildEspaceScene,
		espaceLabel
	} from '#lib/ubumark/utils/espace-scene.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import { createEspaceRotation } from './solide-rotation.svelte.ts';
	import SolideRotationNote from './SolideRotationNote.svelte';
	import SolideVueDeDepart from './SolideVueDeDepart.svelte';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let spec = $derived(node.spec?.kind === 'cubes' ? node.spec : null);
	let rotatable = $derived(spec?.rotate === true && node.errors.length === 0);
	/** La vue, le glissement, le clavier : ceux d'un solide que l'on peut tourner */
	const rotation = createEspaceRotation({
		source: () => node.source,
		rotatable: () => rotatable,
		build: (vue) => (spec === null ? null : buildEspaceScene(spec, vue))
	});
	let scene = $derived(rotation.scene);

	/** Sommets d'un polygone, au format de l'attribut `points` */
	const polygonPoints = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x + ESPACE_MARGIN},${p.y + ESPACE_MARGIN}`).join(' ');
</script>

{#if spec === null || scene === null || node.errors.length > 0}
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
	<SolideRotationNote {node} {showErrors} />
	<div
		class="cubes-bloc my-2 flex {rotatable
			? 'flex-col items-center gap-1'
			: 'justify-center'} {className}"
	>
		<!-- Assemblage que l'on peut tourner : une image que le clavier atteint (flèches, Échap) ;
		     son nom le dit, le bouton en dessous fait le retour -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label={espaceLabel(spec)}
			class="cubes-figure"
			class:cubes-tournante={rotatable}
			class:cubes-en-main={rotation.dragging}
			tabindex={rotatable ? 0 : undefined}
			onpointerdown={rotatable ? rotation.handlePointerDown : undefined}
			onpointermove={rotatable ? rotation.handlePointerMove : undefined}
			onpointerup={rotatable ? rotation.handlePointerEnd : undefined}
			onpointercancel={rotatable ? rotation.handlePointerEnd : undefined}
			onkeydown={rotatable ? rotation.handleKeyDown : undefined}
			onkeyup={rotatable ? rotation.handleKeyUp : undefined}
			onblur={rotatable ? rotation.handleBlur : undefined}
			{@attach rotatable ? rotation.attach : undefined}
			style:width="{width * ESPACE_CM_PER_UNIT}cm"
			style:aspect-ratio="{width} / {height}"
			stroke-width={ESPACE_STROKE}
			stroke-linejoin="round"
		>
			{#each scene.polygons as polygon, i (i)}
				<polygon class="cubes-face cubes-{polygon.kind}" points={polygonPoints(polygon.points)} />
			{/each}
		</svg>
		{#if rotatable}
			<SolideVueDeDepart moved={rotation.moved} onreset={rotation.resetFromButton} />
		{/if}
	</div>
{/if}

<style>
	.cubes-figure {
		max-width: min(100%, var(--espace-taille, 100%));
		height: auto;
	}

	/* Assemblage que l'on peut tourner : le doigt le tourne au lieu de faire défiler la page */
	.cubes-tournante {
		touch-action: none;
		cursor: grab;
		user-select: none;
		-webkit-user-select: none;
		border-radius: 0.5rem;
	}

	.cubes-tournante.cubes-en-main {
		cursor: grabbing;
	}

	.cubes-tournante:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
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

	/* Thème sombre : mélanger vers le premier plan ÉCLAIRCIT ; les dosages
	   s'inversent pour garder la même lumière (dessus le plus clair, côté le plus
	   foncé), sinon le relief se lit à l'envers */
	:global(.dark) .cubes-dessus {
		fill: color-mix(in srgb, var(--color-foreground) 40%, var(--color-background));
	}

	:global(.dark) .cubes-devant {
		fill: color-mix(in srgb, var(--color-foreground) 22%, var(--color-background));
	}

	:global(.dark) .cubes-cote {
		fill: color-mix(in srgb, var(--color-foreground) 8%, var(--color-background));
	}
</style>
