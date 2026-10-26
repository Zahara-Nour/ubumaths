<!--
	Monnaie — bloc ```monnaie
	=========================

	Pièces et billets fictifs à lire ou comparer (CP-043, CP-042 ; phase 0 :
	`docs/archive/wip/monnaie-progress.md`). Dessinés depuis `buildMonnaieScene`, la
	même scène que le PDF.

	- Rendu stylisé (décision 1) : aucun élément des vrais billets ni pièces ;
	  une seule couleur d'accent (pièces pleines, billets en teinte claire),
	  traits et valeurs dans une teinte foncée de l'accent. Couleurs du thème.
	- La valeur de chaque coupure est écrite (l'enfant la lit) ; le TOTAL ne
	  l'est jamais (nom accessible « Pièces et billets »), sinon un lecteur
	  d'écran donnerait la réponse.
	- Échelle : `taille:` du bloc, sinon `--monnaie-taille` (10 cm dans un choix
	  de QCM), sinon 8 cm, pour un ensemble pleine largeur ; les plus étroits
	  gardent la même échelle ; jamais plus large que le conteneur.
	- Toucher pour marquer, comme la collection (`scene-marks.svelte.ts`) :
	  aide non jugée, rien n'est enregistré.
	- Bloc en erreur : messages pour le prof, cadre neutre pour l'élève (Q48).
	- Bloc à construire (`construire:`) : `MonnaieConstruire.svelte`.

	@module components/markdown/nodes/Monnaie
-->
<script lang="ts">
	import {
		MONNAIE_ARIA_LABEL,
		MONNAIE_DEFAULT_CAPTIONS,
		MONNAIE_UNAVAILABLE,
		type MonnaieNode
	} from '$lib/ubumark/types/monnaie';
	import {
		buildMonnaieScene,
		findMonnaieItemAt,
		MONNAIE_VIEW
	} from '$lib/ubumark/utils/monnaie-scene';
	import { readAuthoringErrors } from '../authoring-errors';
	import { SceneMarks, scenePointOf } from './scene-marks.svelte';
	import MonnaieObjets from './MonnaieObjets.svelte';
	import MonnaieConstruire from './MonnaieConstruire.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: MonnaieNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		/** Bloc à construire dans une question : sa case */
		answer?: BuildCase;
		class?: string;
	}

	let { node, showErrors, answer, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let ensembles = $derived.by(() => {
		const spec = node.spec;
		if (spec === null) return [];
		const captions =
			spec.captions ?? (spec.sets.length > 1 ? MONNAIE_DEFAULT_CAPTIONS.slice() : null);
		return spec.sets.map((_, i) => ({
			scene: buildMonnaieScene(spec, i),
			caption: captions?.[i] ?? null
		}));
	});

	/** Taille donnée par l'auteur : prioritaire sur celle du contexte (choix de QCM) */
	let size = $derived(node.spec?.sizeCm == null ? undefined : `${node.spec.sizeCm}cm`);

	/** Marques de l'élève, valables pour UN bloc (un autre repart sans marque) */
	const marks = new SceneMarks(() => JSON.stringify(node.spec));

	/** Toucher : la coupure la plus proche du doigt, en coordonnées de la scène */
	function handleTap(event: MouseEvent, setIndex: number) {
		const point = scenePointOf(event);
		if (point === null) return;
		const index = findMonnaieItemAt(ensembles[setIndex].scene, point);
		if (index !== null) marks.toggle(setIndex, index);
	}
</script>

{#if node.spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div
			class="monnaie-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc monnaie : pièces et billets non dessinés</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="monnaie-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{MONNAIE_UNAVAILABLE}
		</div>
	{/if}
{:else if node.spec.build !== undefined && node.spec.reserve !== undefined}
	<MonnaieConstruire
		spec={node.spec}
		build={node.spec.build}
		reserve={node.spec.reserve}
		{answer}
		class={className}
	/>
{:else}
	<div class="monnaie-bloc my-2 flex flex-col items-center gap-1 {className}">
		<div class="flex max-w-full flex-wrap items-start justify-center gap-4">
			{#each ensembles as ensemble, e (e)}
				<figure class="m-0 flex max-w-full min-w-0 flex-col items-center gap-1">
					{#if ensemble.caption}
						<figcaption class="text-center text-sm font-semibold">{ensemble.caption}</figcaption>
					{/if}
					<!-- Toucher pour marquer : aide au doigt, non jugée -->
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 {ensemble.scene.width} {ensemble.scene.height}"
						role="img"
						aria-label={MONNAIE_ARIA_LABEL}
						class="monnaie-dessin"
						style:--monnaie-ratio={ensemble.scene.width / MONNAIE_VIEW.fullWidth}
						style:--monnaie-taille={size}
						onclick={(event) => handleTap(event, e)}
					>
						<rect
							class="monnaie-cadre"
							x="0.5"
							y="0.5"
							width={ensemble.scene.width - 1}
							height={ensemble.scene.height - 1}
							rx="6"
						/>
						<MonnaieObjets items={ensemble.scene.items} isMarked={(i) => marks.has(e, i)} />
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
	.monnaie-dessin {
		width: calc(var(--monnaie-taille, 8cm) * var(--monnaie-ratio));
		max-width: 100%;
		height: auto;
		/* Chrome rogne la boîte au pixel : sans ça, le bord droit du cadre (à un demi-trait du
		   bord) disparaît sur un dessin de largeur fractionnaire. Rien d'autre n'en sort. */
		overflow: visible;
		/* Pas de zoom au double toucher : on marque vite plusieurs coupures */
		touch-action: manipulation;
		cursor: pointer;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.monnaie-cadre {
		fill: var(--color-background);
		stroke: var(--color-border);
	}
</style>
