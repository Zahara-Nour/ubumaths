<!--
	YohakuCorrige.svelte
	====================

	Corrigé d'une grille yohaku à remplir : copie corrigée, verso de la carte flash, bonne
	réponse affichée.

	- Avec la réponse de l'élève : sa grille (verte si c'est juste, rouge sinon), les totaux
	  des lignes et colonnes fausses en rouge, et pourquoi c'est faux.
	- Sans réponse : la solution de l'auteur dans les cases, et « D'autres remplissages sont
	  justes. »

	@module components/markdown/nodes/YohakuCorrige
-->
<script lang="ts">
	import { YOHAKU_UNAVAILABLE, type YohakuNode } from '#lib/ubumark/types/yohaku.ts';
	import {
		grilleEleve,
		lireReponse,
		readExpectedYohakuAnswer,
		yohakuAnswerVerdict,
		type YohakuAttendu
	} from '#lib/ubumark/utils/yohaku-answer.ts';
	import YohakuGrille, { type CelluleYohaku } from './YohakuGrille.svelte';

	interface Props {
		node: YohakuNode;
		/** Réponse de l'élève (JSON) ; null : le corrigé seul */
		answer: string | null;
		/** Verdict de la réponse (sans réponse : ignoré) */
		correct?: boolean;
		/** Réponse attendue de la case */
		expected?: string;
	}

	let { node, answer, correct = false, expected }: Props = $props();

	let spec = $derived(node.spec);
	let attendu = $derived.by((): YohakuAttendu | null => {
		if (spec === null) return null;
		return (
			(expected !== undefined ? readExpectedYohakuAnswer(expected) : null) ?? {
				operation: spec.operation,
				cases: spec.cases.map((l) => l.map((c) => c.latex)),
				remplir: spec.cases.map((l) => l.map((c) => c.aRemplir)),
				lignes: spec.lignes,
				colonnes: spec.colonnes
			}
		);
	});

	/** Les cases à montrer : la grille de l'élève, ou la solution de l'auteur */
	let cellules = $derived.by((): CelluleYohaku[][] => {
		if (attendu === null) return [];
		const texte = answer === null ? attendu.cases : grilleEleve(attendu, lireReponse(answer) ?? []);
		let rang = 0;
		return texte.map((ligne, l) =>
			ligne.map((latex, c) => ({
				latex,
				champ: false,
				rang: attendu.remplir[l][c] ? rang++ : -1
			}))
		);
	});

	let detail = $derived(
		answer !== null && !correct && expected !== undefined
			? yohakuAnswerVerdict(answer, expected)
			: null
	);
</script>

{#if spec === null || attendu === null}
	<div
		class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
	>
		{YOHAKU_UNAVAILABLE}
	</div>
{:else}
	<div class="yohaku-corrige flex w-full flex-col gap-2">
		<YohakuGrille
			operation={attendu.operation}
			{cellules}
			lignes={attendu.lignes}
			colonnes={attendu.colonnes}
			verdict={answer === null ? null : correct}
			lignesFausses={detail?.lignesFausses ?? []}
			colonnesFausses={detail?.colonnesFausses ?? []}
			verrouille
			label={answer === null ? 'Une grille juste' : 'Ta grille'}
		/>
		{#if detail?.message}
			<p class="text-center text-sm text-destructive">{detail.message}</p>
		{/if}
		{#if answer === null}
			<p class="text-center text-sm text-muted-foreground">D'autres remplissages sont justes.</p>
		{/if}
	</div>
{/if}
