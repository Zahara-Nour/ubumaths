<!--
	Collection — bloc ```collection
	===============================

	Collections d'objets à dénombrer ou comparer (CP-001, CP-070, CP-004 en
	partie ; phase 0 : `docs/wip/collection-progress.md`). Dessinées depuis
	`buildCollectionScene`, la même scène que le PDF.

	- Une seule couleur d'accent (le remplissage des objets) ; traits en couleur
	  du texte. Couleurs du thème uniquement.
	- Nom accessible « Collection d'objets » : JAMAIS le nombre (ni texte, ni
	  attribut), sinon un lecteur d'écran donnerait la réponse.
	- Échelle : `taille:` du bloc, sinon `--collection-taille` (3 cm dans un
	  choix de QCM), sinon 8 cm, pour une collection pleine largeur ; les plus
	  étroites gardent la même échelle ; jamais plus large que le conteneur.
	- Toucher pour marquer (décision 2) : un objet touché est barré, comme au
	  crayon sur papier ; aide non jugée, rien n'est enregistré, et une nouvelle
	  collection repart sans marque (`scene-marks.svelte.ts`, partagé avec la
	  monnaie). Au doigt seulement : c'est une aide de comptage, la réponse se
	  donne dans la case ou le QCM.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).

	@module components/markdown/nodes/Collection
-->
<script lang="ts">
	import {
		COLLECTION_ARIA_LABEL,
		COLLECTION_DEFAULT_CAPTIONS,
		COLLECTION_UNAVAILABLE,
		type CollectionNode
	} from '$lib/ubumark/types/collection';
	import {
		buildCollectionScene,
		COLLECTION_VIEW,
		findCollectionItemAt,
		type CollectionItem
	} from '$lib/ubumark/utils/collection-scene';
	import { readAuthoringErrors } from '../authoring-errors';
	import { SceneMarks, scenePointOf } from './scene-marks.svelte';

	interface Props {
		node: CollectionNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let collections = $derived.by(() => {
		const spec = node.spec;
		if (spec === null) return [];
		const captions =
			spec.captions ?? (spec.sets.length > 1 ? COLLECTION_DEFAULT_CAPTIONS.slice() : null);
		return spec.sets.map((_, i) => ({
			scene: buildCollectionScene(spec, i),
			caption: captions?.[i] ?? null
		}));
	});

	/** Taille donnée par l'auteur : prioritaire sur celle du contexte (choix de QCM) */
	let size = $derived(node.spec?.sizeCm == null ? undefined : `${node.spec.sizeCm}cm`);

	/** Marques de l'élève, valables pour UNE collection (une autre repart sans marque) */
	const marks = new SceneMarks(() => JSON.stringify(node.spec));

	/** Toucher : l'objet le plus proche du doigt, en coordonnées de la scène */
	function handleTap(event: MouseEvent, setIndex: number) {
		const point = scenePointOf(event);
		if (point === null) return;
		const index = findCollectionItemAt(collections[setIndex].scene, point);
		if (index !== null) marks.toggle(setIndex, index);
	}

	/** Trait de la marque : en travers de l'objet, du bas à gauche au haut à droite */
	function strike(item: CollectionItem) {
		const inset = item.kind === 'jeton' || item.kind === 'cube' ? -2 : 3;
		return {
			x1: item.x + inset,
			y1: item.y + item.height - inset,
			x2: item.x + item.width - inset,
			y2: item.y + inset
		};
	}
</script>

{#if node.spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="collection-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc collection : collection non dessinée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="collection-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{COLLECTION_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div class="collection-bloc my-2 flex flex-col items-center gap-1 {className}">
		<div class="flex max-w-full flex-wrap items-start justify-center gap-4">
			{#each collections as collection, c (c)}
				<figure class="m-0 flex max-w-full min-w-0 flex-col items-center gap-1">
					{#if collection.caption}
						<figcaption class="text-center text-sm font-semibold">{collection.caption}</figcaption>
					{/if}
					<!-- Toucher pour marquer : aide de comptage au doigt, non jugée (décision 2) -->
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 {collection.scene.width} {collection.scene.height}"
						role="img"
						aria-label={COLLECTION_ARIA_LABEL}
						class="collection-dessin"
						style:--collection-ratio={collection.scene.width / COLLECTION_VIEW.fullWidth}
						style:--collection-taille={size}
						onclick={(event) => handleTap(event, c)}
					>
						<rect
							class="collection-cadre"
							x="0.5"
							y="0.5"
							width={collection.scene.width - 1}
							height={collection.scene.height - 1}
							rx="6"
						/>
						{#each collection.scene.items as item, i (i)}
							{@const isMarked = marks.has(c, i)}
							<g
								class="collection-objet collection-{item.kind}"
								class:collection-objet-marque={isMarked}
							>
								{#if item.kind === 'jeton'}
									<circle class="collection-forme" cx={item.cx} cy={item.cy} r={item.width / 2} />
								{:else if item.kind === 'cube'}
									<rect
										class="collection-forme"
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
									/>
								{:else if item.kind === 'barre'}
									<rect
										class="collection-forme"
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
									/>
									{#each { length: 9 } as _, k (k)}
										<line
											class="collection-separation"
											x1={item.x}
											x2={item.x + item.width}
											y1={item.y + ((k + 1) * item.height) / 10}
											y2={item.y + ((k + 1) * item.height) / 10}
										/>
									{/each}
								{:else}
									<rect
										class="collection-contour"
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
										rx="6"
									/>
									{#each item.jetons ?? [] as jeton, k (k)}
										<circle
											class="collection-forme"
											cx={jeton.cx}
											cy={jeton.cy}
											r={COLLECTION_VIEW.object / 2}
										/>
									{/each}
								{/if}
							</g>
							{#if isMarked}
								<line class="collection-marque" {...strike(item)} />
							{/if}
						{/each}
					</svg>
				</figure>
			{/each}
		</div>
		{#if marks.size > 0}
			<button
				type="button"
				class="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
				onclick={() => marks.clear()}
			>
				Effacer les marques
			</button>
		{/if}
	</div>
{/if}

<style>
	.collection-dessin {
		width: calc(var(--collection-taille, 8cm) * var(--collection-ratio));
		max-width: 100%;
		height: auto;
		/* Pas de zoom au double toucher : on marque vite plusieurs objets */
		touch-action: manipulation;
		cursor: pointer;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.collection-cadre {
		fill: var(--color-background);
		stroke: var(--color-border);
	}

	/*
	 * La seule couleur d'accent : le remplissage des objets ; leurs traits dans
	 * une teinte foncée de la même couleur, lisible en clair comme en sombre
	 * (un trait de la couleur du texte, clair en sombre, s'efface sur le jaune)
	 */
	.collection-forme {
		fill: var(--color-primary);
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.8;
	}

	.collection-separation {
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.6;
	}

	.collection-contour {
		fill: none;
		stroke: var(--color-foreground);
		stroke-width: 1.2;
	}

	.collection-objet-marque {
		opacity: 0.35;
	}

	.collection-marque {
		stroke: var(--color-foreground);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}
</style>
