<!--
	SchemaBarres — bloc ```schema-barres
	====================================

	Schéma en barres (pré-algèbre, 6e) : des barres l'une sous l'autre, découpées
	en segments, avec accolades. Affichage seul : aucune case, aucun geste.
	Dessiné depuis `buildSchemaBarresScene`, la même scène que le PDF.

	- Traits `currentColor` ; segments pleins sur le fond discret `--color-muted`,
	  parties manquantes en pointillés sans fond. Aucune couleur d'accent.
	- Nom accessible : « Schéma en barres » puis les noms des barres, jamais les
	  étiquettes (ce serait la réponse).
	- Réduit à la largeur de la colonne (téléphone compris) ; jamais plus grand
	  que sa taille de fiche (`SCHEMA_BARRES_CM_PER_UNIT`). Colonne étroite (case
	  choix sur téléphone) : barres raccourcies pour que le texte garde sa taille
	  (`schemaBarresDrawWidth`, mesurée sur la colonne).
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/SchemaBarres
-->
<script lang="ts">
	import {
		SCHEMA_BARRES_UNAVAILABLE,
		type SchemaBarresNode
	} from '$lib/ubumark/types/schema-barres';
	import {
		SCHEMA_BARRES_CM_PER_UNIT,
		SCHEMA_BARRES_DASH,
		SCHEMA_BARRES_FONT_SIZE,
		SCHEMA_BARRES_STROKE,
		buildSchemaBarresScene,
		schemaBarresDrawWidth,
		schemaBarresLabel
	} from '$lib/ubumark/utils/schema-barres-scene';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: SchemaBarresNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	// Largeur de la colonne, mesurée (0 avant le montage : barres pleines, comme au PDF)
	let columnWidth = $state(0);

	let scene = $derived(
		node.spec === null
			? null
			: buildSchemaBarresScene(node.spec, {
					drawWidth: schemaBarresDrawWidth(node.spec, columnWidth)
				})
	);

	/** Sommets d'une accolade, au format de l'attribut `points` */
	const polylinePoints = (points: { x: number; y: number }[]) =>
		points.map((p) => `${p.x},${p.y}`).join(' ');

	const ANCHORS = { start: 'start', middle: 'middle', end: 'end' } as const;
</script>

{#if node.spec === null || scene === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="schema-barres-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc schema-barres : schéma non dessiné</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="schema-barres-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{SCHEMA_BARRES_UNAVAILABLE}
		</div>
	{/if}
{:else}
	{@const spec = node.spec}
	<div
		class="schema-barres-bloc my-2 flex justify-center {className}"
		bind:clientWidth={columnWidth}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {scene.width} {scene.height}"
			role="img"
			aria-label={schemaBarresLabel(spec)}
			class="schema-barres-figure"
			style:width="{scene.width * SCHEMA_BARRES_CM_PER_UNIT}cm"
			style:aspect-ratio="{scene.width} / {scene.height}"
			stroke-width={SCHEMA_BARRES_STROKE}
			stroke-linejoin="round"
			stroke-linecap="round"
			font-size={SCHEMA_BARRES_FONT_SIZE}
		>
			{#each scene.rects as rect, i (i)}
				<rect
					class="schema-barres-segment"
					class:schema-barres-manquant={rect.dashed}
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					stroke-dasharray={rect.dashed ? SCHEMA_BARRES_DASH.join(' ') : undefined}
				/>
			{/each}
			{#each scene.braces as brace, i (i)}
				<polyline class="schema-barres-accolade" points={polylinePoints(brace.points)} />
			{/each}
			{#each scene.texts as item, i (i)}
				<text
					class="schema-barres-texte"
					x={item.x}
					y={item.y}
					text-anchor={ANCHORS[item.anchor]}
					dominant-baseline="central">{item.text}</text
				>
			{/each}
		</svg>
	</div>
{/if}

<style>
	.schema-barres-figure {
		max-width: 100%;
		height: auto;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.schema-barres-segment {
		fill: var(--color-muted);
		stroke: currentColor;
	}

	/* Partie manquante : pas de fond, pointillés */
	.schema-barres-manquant {
		fill: none;
	}

	.schema-barres-accolade {
		fill: none;
		stroke: currentColor;
	}

	.schema-barres-texte {
		fill: currentColor;
		stroke: none;
	}
</style>
