<!--
	LabyrintheCorrige.svelte
	========================

	Corrigé d'un labyrinthe à parcourir (bloc ```labyrinthe, `parcourir: oui`) : copie
	corrigée, verso de la carte flash, bonne réponse affichée.

	- Avec la réponse de l'élève : son chemin (vert s'il est juste, rouge sinon, la case
	  fautive en rouge vif), pourquoi c'est faux, puis le bon chemin cerclé en pointillés.
	- Sans réponse : le bon chemin teinté.
	- Dessous, toujours : « Sortie 3 : 73 → 89 → … ».

	@module components/markdown/nodes/LabyrintheCorrige
-->
<script lang="ts">
	import {
		cheminDit,
		labyrintheAnswerVerdict,
		lireChemin,
		premiereFaute,
		readExpectedLabyrintheAnswer
	} from '#lib/ubumark/utils/labyrinthe-answer.ts';
	import { LABYRINTHE_UNAVAILABLE, type LabyrintheNode } from '#lib/ubumark/types/labyrinthe.ts';
	import LabyrintheGrille from './LabyrintheGrille.svelte';

	interface Props {
		node: LabyrintheNode;
		/** Chemin de l'élève (texte) ; null : le corrigé seul */
		answer: string | null;
		/** Verdict de la réponse (sans réponse : ignoré) */
		correct?: boolean;
		/** Réponse attendue de la case (`<grille> | <chemin>`) */
		expected?: string;
	}

	let { node, answer, correct = false, expected }: Props = $props();

	let spec = $derived(node.spec);
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
	let eleve = $derived.by(() => {
		if (answer === null || attendu === null) return null;
		const chemin = lireChemin(answer) ?? [];
		const f = correct ? null : premiereFaute(chemin, attendu);
		const message =
			correct || expected === undefined
				? null
				: (labyrintheAnswerVerdict(answer, expected).message ?? null);
		return { chemin, faute: f === null ? null : chemin[f.rang], message };
	});
</script>

{#if spec === null || attendu === null}
	<div
		class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
	>
		{LABYRINTHE_UNAVAILABLE}
	</div>
{:else}
	<div class="labyrinthe-corrige flex w-full flex-col gap-2">
		{#if eleve !== null}
			<LabyrintheGrille
				{spec}
				chemin={eleve.chemin}
				verdict={correct}
				faute={eleve.faute}
				attendu={correct ? null : attendu.chemin}
				label="Ton chemin{correct ? '' : ', et le bon chemin cerclé en pointillés'}"
			/>
			{#if eleve.message}
				<p class="text-center text-sm text-destructive">{eleve.message}</p>
			{/if}
		{:else}
			<LabyrintheGrille {spec} chemin={attendu.chemin} verdict={true} label="Le bon chemin" />
		{/if}
		<p class="text-center text-sm">
			<span class="text-muted-foreground">Le bon chemin :</span>
			{cheminDit({ ...spec, chemin: attendu.chemin })}
		</p>
	</div>
{/if}
