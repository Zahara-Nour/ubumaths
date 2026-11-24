<!--
	Labyrinthe.svelte
	=================

	Bloc ```labyrinthe (chantier `labyrinthe`, journal `docs/wip/labyrinthe-progress.md`).
	Sans `parcourir:` : la grille seule (`solution: oui` : le bon chemin teinté). Avec
	`parcourir: oui` : l'élève trace le chemin de l'entrée à une sortie.

	- Il touche d'abord l'entrée, puis une case voisine de la dernière (haut, bas, gauche,
	  droite), jamais une case déjà prise ; les cases qu'il peut toucher sont cerclées. Toucher
	  la dernière case l'efface ; « Tout effacer ». Arrivé sur la dernière colonne, il ne peut
	  plus qu'effacer.
	- Réponse de la case : le chemin en texte (`ecrireChemin`), jugé par le serveur.
	- Après la validation : le chemin vert s'il est juste, rouge sinon, la case fautive en
	  rouge vif, le bon chemin cerclé en pointillés.
	- Hors question (aperçu, cours) : le geste libre, rien de jugé.

	@module components/markdown/nodes/Labyrinthe
-->
<script lang="ts">
	import {
		ecrireChemin,
		lireChemin,
		premiereFaute,
		readExpectedLabyrintheAnswer
	} from '#lib/ubumark/utils/labyrinthe-answer.ts';
	import { regleDite } from '#lib/ubumark/utils/labyrinthe-moteur.ts';
	import {
		LABYRINTHE_UNAVAILABLE,
		type Case,
		type LabyrintheNode
	} from '#lib/ubumark/types/labyrinthe.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';
	import LabyrintheGrille from './LabyrintheGrille.svelte';

	interface Props {
		node: LabyrintheNode;
		/** La case de la question ; absente : geste libre, rien de jugé */
		answer?: BuildCase;
		/** Réponse attendue de la case (`<grille> | <chemin>`) : le bon chemin après une erreur */
		expected?: string;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer */
		showErrors?: boolean;
		class?: string;
	}

	let { node, answer, expected, showErrors, class: className = '' }: Props = $props();

	const uid = $props.id();
	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	// =============================================================================
	// Variables
	// =============================================================================

	/** Chemin du geste libre (sans case) */
	let libre = $state('');

	let spec = $derived(node.spec);
	let valeur = $derived(answer ? answer.value : libre);
	let chemin = $derived(lireChemin(valeur) ?? []);
	let verdict = $derived(answer?.isCorrect ?? null);
	let verrouille = $derived((answer?.disabled ?? false) || verdict !== null);
	let derniere = $derived(chemin.length > 0 ? chemin[chemin.length - 1] : null);
	let arrive = $derived(spec !== null && derniere !== null && derniere.col === spec.colonnes);

	/** Les cases que l'élève peut toucher : l'entrée, puis la dernière et ses voisines libres */
	let touchables = $derived.by((): Case[] | null => {
		if (spec === null) return null;
		// Verrouillé : les cases restent des boutons (le focus ne se perd pas), aucune ne répond
		if (verrouille) return [];
		if (derniere === null) return [{ ligne: spec.entree, col: 1 }];
		if (arrive) return [derniere];
		const pris = new Set(chemin.map((c) => `${c.ligne},${c.col}`));
		const voisines = [
			{ ligne: derniere.ligne - 1, col: derniere.col },
			{ ligne: derniere.ligne + 1, col: derniere.col },
			{ ligne: derniere.ligne, col: derniere.col - 1 },
			{ ligne: derniere.ligne, col: derniere.col + 1 }
		].filter(
			(v) =>
				v.ligne >= 1 &&
				v.ligne <= spec.lignes &&
				v.col >= 1 &&
				v.col <= spec.colonnes &&
				!pris.has(`${v.ligne},${v.col}`)
		);
		return [derniere, ...voisines];
	});

	/** Après la validation : le bon chemin (la réponse attendue, sinon le bloc) */
	let attendu = $derived.by(() => {
		if (spec === null) return null;
		const lu = expected !== undefined ? readExpectedLabyrintheAnswer(expected) : null;
		return (
			lu ?? {
				colonnes: spec.colonnes,
				lignes: spec.lignes,
				entree: spec.entree,
				chemin: spec.chemin
			}
		);
	});
	let faute = $derived.by(() => {
		if (verdict !== false || attendu === null) return null;
		const f = premiereFaute(chemin, attendu);
		return f === null ? null : chemin[f.rang];
	});

	let etat = $derived.by(() => {
		if (spec === null) return '';
		if (chemin.length === 0) return 'Touche l’entrée pour commencer.';
		if (arrive && derniere !== null) return `Sortie ${derniere.ligne} atteinte.`;
		return `${chemin.length} case${chemin.length > 1 ? 's' : ''} dans ton chemin.`;
	});

	// =============================================================================
	// Fonctions
	// =============================================================================

	function emit(next: Case[]) {
		const texte = ecrireChemin(next);
		if (answer) answer.onChange(texte);
		else libre = texte;
	}

	function toucher(c: Case) {
		if (derniere !== null && derniere.ligne === c.ligne && derniere.col === c.col) {
			emit(chemin.slice(0, -1));
		} else {
			emit([...chemin, c]);
		}
	}
</script>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div class="rounded-md border border-destructive p-3 text-sm text-foreground {className}">
			<p class="font-medium text-destructive">Bloc labyrinthe : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{LABYRINTHE_UNAVAILABLE}
		</div>
	{/if}
{:else if !spec.parcourir}
	<div class="labyrinthe my-3 {className}">
		<LabyrintheGrille
			{spec}
			chemin={spec.solution ? spec.chemin : []}
			verdict={spec.solution ? true : null}
		/>
	</div>
{:else}
	<div
		class="labyrinthe my-3 flex flex-col items-stretch gap-2 rounded-md border-2 p-2 {verdict ===
		true
			? 'labyrinthe-cadre-juste'
			: verdict === false
				? 'labyrinthe-cadre-faux'
				: 'border-transparent'} {className}"
		role="group"
		aria-labelledby="{uid}-consigne"
	>
		<p id="{uid}-consigne" class="sr-only">
			Trace le chemin de l’entrée à une sortie, en ne passant que par des {regleDite(spec.regle)}.
		</p>
		<LabyrintheGrille
			{spec}
			{chemin}
			{verdict}
			{faute}
			attendu={verdict === false ? (attendu?.chemin ?? null) : null}
			{touchables}
			ontoucher={toucher}
		/>
		{#if !verrouille}
			<div class="flex flex-wrap items-center justify-center gap-3">
				<p class="text-sm text-muted-foreground" aria-live="polite">{etat}</p>
				<button
					type="button"
					class="labyrinthe-action"
					disabled={chemin.length === 0}
					onclick={() => emit([])}
				>
					Tout effacer
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.labyrinthe-cadre-juste {
		border-color: var(--color-success);
	}

	.labyrinthe-cadre-faux {
		border-color: var(--color-destructive);
	}

	.labyrinthe-action {
		min-height: 2.5rem;
		padding: 0 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		background: var(--color-background);
		font-size: 0.875rem;
	}

	.labyrinthe-action:disabled {
		opacity: 0.5;
	}
</style>
