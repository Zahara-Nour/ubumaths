<!--
	MonnaieConstruire — bloc ```monnaie à construire
	================================================

	L'élève constitue une somme donnée (CP-044, CP-071, CP-045 ; chantier
	`docs/wip/construire-progress.md` § 3, 4 bis, 6) : il pose des pièces et des
	billets de la réserve sur un plan de travail vide.

	- Toucher la réserve pose une coupure ; toucher une coupure posée l'enlève
	  (Q1) ; « Enlever » à côté de chaque coupure de la réserve, pour le clavier.
	- Coupures rangées d'office (Q2) : la scène de la monnaie, en `rangé`.
	- La somme n'est JAMAIS affichée pendant la construction (Q3), ni dans un nom
	  accessible (la valeur de chaque coupure, elle, est écrite : l'enfant la lit).
	- Plafonds du bloc : 100 € et 30 objets ; au-delà, le bouton se grise.
	- Dans une question (`answer`) : la somme posée est la réponse de la case
	  ('' plan vide, Q6), jugée par le juge ordinaire. Faux : la construction de
	  l'élève, sa somme et une construction juste à côté (Q8).
	- Sans `answer` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/MonnaieConstruire
-->
<script lang="ts">
	import type { MonnaieSet, MonnaieSpec } from '$lib/ubumark/types/monnaie';
	import {
		findMonnaieItemAt,
		MONNAIE_VIEW,
		type MonnaieItem
	} from '$lib/ubumark/utils/monnaie-scene';
	import {
		addToBuild,
		buildAnswer,
		buildFromAnswer,
		buildScene,
		buildValue,
		canAdd,
		EMPTY_BUILD,
		removeFromBuild,
		reserveScene,
		solutionBuild
	} from '$lib/ubumark/utils/monnaie-construire';
	import { scenePointOf } from './scene-marks.svelte';
	import MonnaieObjets from './MonnaieObjets.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		spec: MonnaieSpec;
		/** Somme à construire (`construire:`) */
		build: number;
		/** Coupures permises, de la plus grande à la plus petite */
		reserve: number[];
		answer?: BuildCase;
		/** false : plan seul, sans réserve (résultat attendu, copie corrigée) */
		showReserve?: boolean;
		class?: string;
	}

	let {
		spec,
		build: target,
		reserve,
		answer,
		showReserve = true,
		class: className = ''
	}: Props = $props();

	/** Hauteur minimale du plan (unités de la scène) : il ne saute pas à la première coupure */
	const PLAN_MIN_HEIGHT = 90;

	/** Nom accessible du plan : jamais la somme */
	const PLAN_ARIA_LABEL = 'Ton argent';

	/** Taille des coupures dans la réserve, en px par unité de scène */
	const ICON_SCALE = 1;

	/**
	 * Construction de l'élève : gardée ici, la case ne garde que la somme. Recalculée
	 * seulement quand la valeur de la case change : la même que la construction
	 * (écho du parent) → gardée, 10 + 10 + 10 + 5 € ne deviennent pas 20 + 10 + 5 € ;
	 * une autre (case remise à vide, composant remonté) → redessinée « le moins
	 * d'objets » avec la réserve. Réassignée à chaque geste (dérivé modifiable) ;
	 * `kept` (pas un état : aucune dépendance) garde la dernière construction.
	 */
	let kept: MonnaieSet = EMPTY_BUILD;
	let current = $derived.by(() => {
		const value = answer?.value ?? '';
		return value === buildAnswer(kept) ? kept : buildFromAnswer(value, reserve);
	});

	let locked = $derived(answer?.disabled ?? false);
	let scene = $derived(buildScene(current));
	let planHeight = $derived(Math.max(scene.height, PLAN_MIN_HEIGHT));
	let reserveItems = $derived(reserveScene(reserve).items);
	let solution = $derived.by(() => {
		const set = solutionBuild(target, reserve);
		return set === null ? null : buildScene(set);
	});
	let size = $derived(spec.sizeCm == null ? undefined : `${spec.sizeCm}cm`);
	let value = $derived(buildValue(current));

	function update(next: MonnaieSet) {
		if (locked) return;
		kept = next;
		current = next;
		answer?.onChange(buildAnswer(next));
	}

	/** Toucher une coupure posée l'enlève */
	function handleTap(event: MouseEvent) {
		if (locked) return;
		const point = scenePointOf(event);
		if (point === null) return;
		const index = findMonnaieItemAt(scene, point);
		if (index === null) return;
		update(removeFromBuild(current, scene.items[index].value));
	}

	/** « un billet de 10 € », « une pièce de 2 € » */
	function nameOf(item: MonnaieItem): string {
		return item.kind === 'billet' ? `un billet de ${item.value} €` : `une pièce de ${item.value} €`;
	}

	/** Combien de coupures de cette valeur sont posées */
	function placedCount(value: number): number {
		return [...current.notes, ...current.coins].filter((v) => v === value).length;
	}

	/** Boîte de vue serrée autour d'une coupure de la réserve */
	function iconViewBox(item: MonnaieItem): string {
		return `${item.x - 1} ${item.y - 1} ${item.width + 2} ${item.height + 2}`;
	}
</script>

{#snippet reserveItem(item: MonnaieItem)}
	<div class="flex items-center gap-1">
		<button
			type="button"
			class="construire-ajouter flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1 hover:bg-muted disabled:opacity-40"
			aria-label="Ajouter {nameOf(item)}"
			disabled={locked || !canAdd(current, item.value)}
			onclick={() => update(addToBuild(current, item.value))}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox={iconViewBox(item)}
				style:height="{(item.height + 2) * ICON_SCALE}px"
				style:width="auto"
				aria-hidden="true"
			>
				<MonnaieObjets items={[item]} />
			</svg>
			<span aria-hidden="true" class="text-lg leading-none font-semibold">+</span>
		</button>
		<button
			type="button"
			class="flex min-h-11 min-w-9 items-center justify-center rounded-md text-lg font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
			aria-label="Enlever {nameOf(item)}"
			disabled={locked || placedCount(item.value) === 0}
			onclick={() => update(removeFromBuild(current, item.value))}
		>
			<span aria-hidden="true">−</span>
		</button>
	</div>
{/snippet}

<div class="construire-bloc my-2 flex flex-col items-center gap-2 {className}">
	<!-- Toucher une coupure posée l'enlève ; au clavier, les boutons « Enlever » -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 {MONNAIE_VIEW.fullWidth} {planHeight}"
		role="img"
		aria-label={PLAN_ARIA_LABEL}
		class="construire-plan"
		class:construire-plan-verrouille={locked}
		style:--monnaie-taille={size}
		onclick={handleTap}
	>
		<rect
			class="construire-cadre"
			class:construire-cadre-juste={answer?.isCorrect === true}
			class:construire-cadre-faux={answer?.isCorrect === false}
			x="0.5"
			y="0.5"
			width={MONNAIE_VIEW.fullWidth - 1}
			height={planHeight - 1}
			rx="6"
		/>
		<MonnaieObjets items={scene.items} />
	</svg>

	{#if showReserve}
		<div class="construire-reserve flex max-w-full flex-wrap items-center justify-center gap-3">
			{#each reserveItems as item (item.value)}
				{@render reserveItem(item)}
			{/each}
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
			{value === 0 ? 'Tu n’as rien posé.' : `Tu as posé ${value} €.`}
		</p>
		{#if solution !== null}
			<div class="construire-correction flex flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 {solution.width} {solution.height}"
					role="img"
					aria-label="Une somme juste"
					class="construire-solution"
					style:--monnaie-ratio={solution.width / MONNAIE_VIEW.fullWidth}
					style:--monnaie-taille={size}
				>
					<rect
						class="construire-cadre"
						x="0.5"
						y="0.5"
						width={solution.width - 1}
						height={solution.height - 1}
						rx="6"
					/>
					<MonnaieObjets items={solution.items} />
				</svg>
			</div>
		{/if}
	{/if}
</div>

<style>
	.construire-plan {
		width: var(--monnaie-taille, 8cm);
		max-width: 100%;
		height: auto;
		/* Chrome rogne la boîte au pixel (cf. Monnaie.svelte) */
		overflow: visible;
		/* Pas de zoom au double toucher : on enlève vite plusieurs coupures */
		touch-action: manipulation;
		cursor: pointer;
	}

	.construire-plan-verrouille {
		cursor: default;
	}

	.construire-solution {
		width: calc(var(--monnaie-taille, 8cm) * var(--monnaie-ratio));
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
</style>
