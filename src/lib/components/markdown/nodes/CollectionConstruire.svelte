<!--
	CollectionConstruire — bloc ```collection à construire
	======================================================

	L'élève construit une collection de cardinal donné (CP-002 ; chantier
	`docs/wip/construire-progress.md` § 3, 4 bis, 5) : il pose des barres de dix
	(ou paquets) et des cubes (ou jetons) sur un plan de travail vide.

	- Toucher la réserve pose un objet ; toucher un objet posé l'enlève (Q1) ;
	  « Enlever » à côté de chaque objet de la réserve, pour le clavier.
	- Objets rangés d'office (Q2) : la scène de la collection, en `rangées`.
	- Le total n'est JAMAIS affiché pendant la construction (Q3), ni dans un nom
	  accessible.
	- Dans une question (`answer`) : la valeur posée est la réponse de la case
	  ('' plan vide, Q6), jugée par le juge ordinaire. Faux : la construction de
	  l'élève, sa valeur et une construction juste à côté (Q8).
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/CollectionConstruire
-->
<script module lang="ts">
	/** La case de la question portée par le bloc */
	export interface BuildCase {
		/** Réponse déjà donnée (la valeur posée), '' sinon */
		value: string;
		/** true juste, false faux, null pas encore corrigé */
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
	}
</script>

<script lang="ts">
	import type { CollectionSet, CollectionSpec } from '$lib/ubumark/types/collection';
	import {
		COLLECTION_VIEW,
		findCollectionItemAt,
		type CollectionItem
	} from '$lib/ubumark/utils/collection-scene';
	import {
		addToBuild,
		BUILD_LIMITS,
		buildAnswer,
		buildFromAnswer,
		buildScene,
		buildValue,
		EMPTY_BUILD,
		removeFromBuild,
		reserveScene,
		solutionBuild,
		type BuildPiece
	} from '$lib/ubumark/utils/collection-construire';
	import { scenePointOf } from './scene-marks.svelte';
	import CollectionObjets from './CollectionObjets.svelte';

	interface Props {
		spec: CollectionSpec;
		/** Valeur à construire (`construire:`) */
		build: number;
		answer?: BuildCase;
		/** false : plan seul, sans réserve (résultat attendu, copie corrigée) */
		showReserve?: boolean;
		class?: string;
	}

	let { spec, build: target, answer, showReserve = true, class: className = '' }: Props = $props();

	/** Hauteur minimale du plan (unités de la scène) : il ne saute pas au premier objet */
	const PLAN_MIN_HEIGHT = 150;

	/** Nom accessible du plan : jamais le nombre */
	const PLAN_ARIA_LABEL = 'Ta collection';

	/** Ce que dit chaque bouton, selon le matériel */
	const NAMES = {
		barres: { tens: 'une barre de dix', units: 'un cube' },
		paquets: { tens: 'un paquet de dix', units: 'un jeton' }
	} as const;

	/**
	 * Construction de l'élève : gardée ici, la case ne garde que la valeur. Recalculée
	 * seulement quand la valeur de la case change : la même que la construction
	 * (écho du parent) → gardée, 2 barres + 14 cubes ne deviennent pas 3 barres +
	 * 4 cubes ; une autre (case remise à vide, composant remonté) → redessinée en
	 * dizaines et unités. Réassignée à chaque geste (dérivé modifiable) ; `kept`
	 * (pas un état : aucune dépendance) garde la dernière construction.
	 */
	let kept: CollectionSet = EMPTY_BUILD;
	let current = $derived.by(() => {
		const value = answer?.value ?? '';
		return value === buildAnswer(kept) ? kept : buildFromAnswer(value);
	});

	let locked = $derived(answer?.disabled ?? false);
	let names = $derived(NAMES[spec.drawing]);
	let scene = $derived(buildScene(spec.drawing, current));
	let planHeight = $derived(Math.max(scene.height, PLAN_MIN_HEIGHT));
	let reserve = $derived(reserveScene(spec.drawing));
	let solution = $derived(buildScene(spec.drawing, solutionBuild(target)));
	let size = $derived(spec.sizeCm == null ? undefined : `${spec.sizeCm}cm`);
	let value = $derived(buildValue(current));

	function update(next: CollectionSet) {
		if (locked) return;
		kept = next;
		current = next;
		answer?.onChange(buildAnswer(next));
	}

	/** Toucher un objet posé l'enlève */
	function handleTap(event: MouseEvent) {
		if (locked) return;
		const point = scenePointOf(event);
		if (point === null) return;
		const index = findCollectionItemAt(scene, point);
		if (index === null) return;
		update(removeFromBuild(current, scene.items[index].value === 10 ? 'tens' : 'units'));
	}

	/** Boîte de vue serrée autour d'un objet de la réserve */
	function iconViewBox(item: CollectionItem): string {
		return `${item.x - 1} ${item.y - 1} ${item.width + 2} ${item.height + 2}`;
	}
</script>

{#snippet reserveItem(piece: BuildPiece, item: CollectionItem)}
	<div class="flex items-center gap-1">
		<button
			type="button"
			class="construire-ajouter flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
			aria-label="Ajouter {names[piece]}"
			disabled={locked || current[piece] >= BUILD_LIMITS[piece]}
			onclick={() => update(addToBuild(current, piece))}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox={iconViewBox(item)}
				class={piece === 'tens' ? 'construire-icone-groupe' : 'construire-icone-unite'}
				aria-hidden="true"
			>
				<CollectionObjets items={[item]} />
			</svg>
			<span aria-hidden="true" class="text-lg leading-none font-semibold">+</span>
		</button>
		<button
			type="button"
			class="flex min-h-11 min-w-9 items-center justify-center rounded-md text-lg font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
			aria-label="Enlever {names[piece]}"
			disabled={locked || current[piece] === 0}
			onclick={() => update(removeFromBuild(current, piece))}
		>
			<span aria-hidden="true">−</span>
		</button>
	</div>
{/snippet}

<div class="construire-bloc my-2 flex flex-col items-center gap-2 {className}">
	<!-- Toucher un objet posé l'enlève ; au clavier, les boutons « Enlever » -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 {COLLECTION_VIEW.fullWidth} {planHeight}"
		role="img"
		aria-label={PLAN_ARIA_LABEL}
		class="construire-plan"
		class:construire-plan-verrouille={locked}
		style:--collection-taille={size}
		onclick={handleTap}
	>
		<rect
			class="construire-cadre"
			class:construire-cadre-juste={answer?.isCorrect === true}
			class:construire-cadre-faux={answer?.isCorrect === false}
			x="0.5"
			y="0.5"
			width={COLLECTION_VIEW.fullWidth - 1}
			height={planHeight - 1}
			rx="6"
		/>
		<CollectionObjets items={scene.items} />
	</svg>

	{#if showReserve}
		<div class="construire-reserve flex flex-wrap items-center justify-center gap-3">
			{@render reserveItem('tens', reserve.items[0])}
			{@render reserveItem('units', reserve.items[1])}
			<button
				type="button"
				class="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
				disabled={locked || value === 0}
				onclick={() => update(EMPTY_BUILD)}
			>
				Tout enlever
			</button>
		</div>
	{/if}

	{#if answer?.isCorrect != null}
		<p class="sr-only" role="status">
			{answer.isCorrect ? 'réponse juste' : 'réponse fausse'}
		</p>
	{/if}

	{#if answer?.isCorrect === false}
		<p class="text-sm">
			{value === 0 ? 'Ta collection est vide.' : `Ta collection vaut ${value}.`}
		</p>
		<div class="construire-correction flex flex-col items-center gap-1">
			<p class="text-sm font-medium text-muted-foreground">Correction</p>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 {solution.width} {solution.height}"
				role="img"
				aria-label="Une collection juste"
				class="construire-solution"
				style:--collection-ratio={solution.width / COLLECTION_VIEW.fullWidth}
				style:--collection-taille={size}
			>
				<rect
					class="construire-cadre"
					x="0.5"
					y="0.5"
					width={solution.width - 1}
					height={solution.height - 1}
					rx="6"
				/>
				<CollectionObjets items={solution.items} />
			</svg>
		</div>
	{/if}
</div>

<style>
	.construire-plan {
		width: var(--collection-taille, 8cm);
		max-width: 100%;
		height: auto;
		/* Chrome rogne la boîte au pixel (cf. Collection.svelte) */
		overflow: visible;
		/* Pas de zoom au double toucher : on enlève vite plusieurs objets */
		touch-action: manipulation;
		cursor: pointer;
	}

	.construire-plan-verrouille {
		cursor: default;
	}

	.construire-solution {
		width: calc(var(--collection-taille, 8cm) * var(--collection-ratio));
		max-width: 100%;
		height: auto;
		overflow: visible;
	}

	.construire-cadre {
		fill: var(--color-background);
		stroke: var(--color-border);
	}

	.construire-cadre-juste {
		stroke: var(--color-success);
		stroke-width: 2;
	}

	.construire-cadre-faux {
		stroke: var(--color-destructive);
		stroke-width: 2;
	}

	.construire-icone-groupe {
		height: 2.5rem;
		width: auto;
	}

	.construire-icone-unite {
		height: 1rem;
		width: auto;
	}
</style>
