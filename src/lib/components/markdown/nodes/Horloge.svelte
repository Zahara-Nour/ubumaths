<!--
	Horloge — bloc ```horloge
	=========================

	Cadran à aiguilles (CP-046, CP-047, puis les minutes au CE1 / CE2 ; phase 0 :
	`docs/wip/horloge-progress.md`). Dessiné depuis `buildHorlogeScene`, la même
	scène que le PDF. Horloge à placer (`placer:`) : `HorlogePlacer.svelte`.

	- Une seule couleur d'accent (la petite aiguille) ; les aiguilles se
	  distinguent aussi par leur forme (trotteuse fine à contrepoids, dessinée
	  seulement quand des secondes sont écrites). Couleurs du thème uniquement.
	- Nom accessible « Horloge à aiguilles » : JAMAIS l'heure (ni texte, ni
	  attribut), sinon un lecteur d'écran donnerait la réponse.
	- Largeur : `taille:` du bloc, sinon `--horloge-taille` (3 cm dans un choix
	  de QCM), sinon 4 cm ; jamais plus large que le conteneur.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Horloge
-->
<script lang="ts">
	import {
		HORLOGE_ARIA_LABEL,
		HORLOGE_UNAVAILABLE,
		type HorlogeNode
	} from '$lib/ubumark/types/horloge';
	import {
		buildHorlogeScene,
		HORLOGE_FONT,
		HORLOGE_STROKE,
		HORLOGE_VIEW
	} from '$lib/ubumark/utils/horloge-scene';
	import { readAuthoringErrors } from '../authoring-errors';
	import HorlogePlacer from './HorlogePlacer.svelte';

	interface Props {
		node: HorlogeNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const VIEW_BOX = `${-HORLOGE_VIEW.half} ${-HORLOGE_VIEW.half} ${2 * HORLOGE_VIEW.half} ${2 * HORLOGE_VIEW.half}`;

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let clocks = $derived(
		node.spec === null
			? []
			: node.spec.times.map((time, i) => ({
					scene: buildHorlogeScene(node.spec!, time),
					caption: node.spec!.captions?.[i] ?? null
				}))
	);

	/** Taille donnée par l'auteur : prioritaire sur celle du contexte (choix de QCM) */
	let size = $derived(node.spec?.sizeCm == null ? undefined : `${node.spec.sizeCm}cm`);
</script>

{#if node.spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="horloge-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc horloge : horloge non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="horloge-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{HORLOGE_UNAVAILABLE}
		</div>
	{/if}
{:else if node.spec.placer}
	<!-- Horloge à placer hors question (aperçu, cours) : le geste, rien de jugé -->
	<HorlogePlacer {node} class={className} />
{:else}
	<div class="horloge-bloc my-2 flex flex-wrap items-start justify-center gap-4 {className}">
		{#each clocks as clock, i (i)}
			<figure class="horloge-figure m-0 flex max-w-full min-w-0 flex-col items-center gap-1">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox={VIEW_BOX}
					role="img"
					aria-label={HORLOGE_ARIA_LABEL}
					class="horloge-cadran"
					style:--horloge-taille={size}
				>
					<circle class="horloge-fond" r={HORLOGE_VIEW.radius} stroke-width={HORLOGE_VIEW.rim} />
					{#each clock.scene.ticks as tick, t (t)}
						<line
							class="horloge-trait"
							class:horloge-trait-heure={tick.major}
							x1={tick.x1}
							y1={tick.y1}
							x2={tick.x2}
							y2={tick.y2}
							stroke-width={tick.major ? HORLOGE_STROKE.majorTick : HORLOGE_STROKE.minorTick}
						/>
					{/each}
					{#each clock.scene.numbers as number, n (n)}
						<text
							class="horloge-chiffre"
							class:horloge-chiffre-24={number.inner}
							x={number.x}
							y={number.y}
							font-size={number.inner ? HORLOGE_FONT.innerNumbers : HORLOGE_FONT.numbers}
							text-anchor="middle"
							dominant-baseline="central">{number.text}</text
						>
					{/each}
					{#if clock.scene.minuteHand}
						<line
							class="horloge-aiguille horloge-aiguille-minutes"
							x1="0"
							y1="0"
							x2={clock.scene.minuteHand.x}
							y2={clock.scene.minuteHand.y}
							stroke-width={HORLOGE_STROKE.minuteHand}
						/>
					{/if}
					{#if clock.scene.hourHand}
						<line
							class="horloge-aiguille horloge-aiguille-heures"
							x1="0"
							y1="0"
							x2={clock.scene.hourHand.x}
							y2={clock.scene.hourHand.y}
							stroke-width={HORLOGE_STROKE.hourHand}
						/>
					{/if}
					{#if clock.scene.secondHand && clock.scene.secondTail}
						<!-- Trotteuse (secondes écrites) : fine, avec son contrepoids -->
						<line
							class="horloge-aiguille horloge-aiguille-secondes"
							x1={clock.scene.secondTail.x}
							y1={clock.scene.secondTail.y}
							x2={clock.scene.secondHand.x}
							y2={clock.scene.secondHand.y}
							stroke-width={HORLOGE_STROKE.secondHand}
						/>
					{/if}
					<circle class="horloge-axe" r={HORLOGE_STROKE.center} />
				</svg>
				{#if clock.caption}
					<figcaption class="text-center text-sm">{clock.caption}</figcaption>
				{/if}
			</figure>
		{/each}
	</div>
{/if}

<style>
	.horloge-cadran {
		width: var(--horloge-taille, 4cm);
		max-width: 100%;
		height: auto;
		aspect-ratio: 1;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.horloge-fond {
		fill: var(--color-background);
		stroke: var(--color-foreground);
	}

	.horloge-trait {
		stroke: var(--color-muted-foreground);
	}

	.horloge-trait-heure {
		stroke: var(--color-foreground);
	}

	.horloge-chiffre {
		fill: var(--color-foreground);
		font-weight: 600;
	}

	.horloge-chiffre-24 {
		fill: var(--color-muted-foreground);
		font-weight: 400;
	}

	.horloge-aiguille {
		stroke-linecap: round;
	}

	.horloge-aiguille-minutes {
		stroke: var(--color-foreground);
	}

	/* La seule couleur d'accent : la petite aiguille */
	.horloge-aiguille-heures {
		stroke: var(--color-primary);
	}

	/* Trotteuse : reconnue à sa forme, pas à une couleur de plus */
	.horloge-aiguille-secondes {
		stroke: var(--color-foreground);
	}

	.horloge-axe {
		fill: var(--color-foreground);
	}
</style>
