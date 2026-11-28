<!--
	Yohaku.svelte
	=============

	Bloc ```yohaku (chantier `outil-yohaku`, outil n° 56) : une grille 2 × 2 jugée par ses
	contraintes. Au bout de chaque ligne et de chaque colonne, son produit (ou sa somme) ;
	l'élève écrit les cases entre crochets dans des champs MathLive.

	- Réponse de la case : les valeurs des champs en tableau JSON (`ecrireReponse`), jugées par
	  le serveur (chaque ligne et chaque colonne donne son total, plusieurs remplissages sont
	  justes).
	- Après la validation : cases vertes si c'est juste, rouges sinon, avec les totaux des lignes
	  et colonnes fausses en rouge et la raison dessous.
	- Hors question (cours, aperçu) : les cases à remplir restent vides, ou montrent la
	  solution (`solution: oui`) ; aucun champ.

	@module components/markdown/nodes/Yohaku
-->
<script lang="ts">
	import { YOHAKU_UNAVAILABLE, type YohakuNode } from '#lib/ubumark/types/yohaku.ts';
	import {
		ecrireReponse,
		lireReponse,
		yohakuAnswerVerdict
	} from '#lib/ubumark/utils/yohaku-answer.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';
	import YohakuGrille, { type CelluleYohaku } from './YohakuGrille.svelte';

	interface Props {
		node: YohakuNode;
		/** La case de la question ; absente : rien à remplir, rien de jugé */
		answer?: BuildCase;
		/** Réponse attendue de la case : pourquoi c'est faux, quelles lignes et colonnes */
		expected?: string;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer */
		showErrors?: boolean;
		class?: string;
	}

	let { node, answer, expected, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	let spec = $derived(node.spec);
	let valeurs = $derived(lireReponse(answer?.value ?? '') ?? []);
	let verdict = $derived(answer?.isCorrect ?? null);
	let verrouille = $derived((answer?.disabled ?? false) || verdict !== null);
	let detail = $derived(
		verdict === false && expected !== undefined && answer !== undefined
			? yohakuAnswerVerdict(answer.value, expected)
			: null
	);

	/** Les cases à dessiner : champs si c'est une question, la solution ou le vide sinon */
	let cellules = $derived.by((): CelluleYohaku[][] => {
		if (spec === null) return [];
		let rang = 0;
		return spec.cases.map((ligne) =>
			ligne.map((c) => {
				if (!c.aRemplir) return { latex: c.latex, champ: false, rang: -1 };
				const k = rang++;
				if (answer === undefined)
					return { latex: spec.solution ? c.latex : '', champ: false, rang: k };
				return { latex: valeurs[k] ?? '', champ: true, rang: k };
			})
		);
	});

	function ecrire(rang: number, valeur: string) {
		if (answer === undefined || spec === null) return;
		const n = spec.cases.flat().filter((c) => c.aRemplir).length;
		const suivantes = Array.from({ length: n }, (_, k) => valeurs[k] ?? '');
		suivantes[rang] = valeur;
		// Grille effacée : réponse vide (« Tu n'as rien écrit dans la grille. »), pas une grille fausse
		answer.onChange(suivantes.every((v) => v.trim() === '') ? '' : ecrireReponse(suivantes));
	}
</script>

{#if spec === null || node.errors.length > 0}
	{#if errorsVisible}
		<div class="rounded-md border border-destructive p-3 text-sm text-foreground {className}">
			<p class="font-medium text-destructive">Bloc yohaku : question non affichée</p>
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
			{YOHAKU_UNAVAILABLE}
		</div>
	{/if}
{:else}
	<div class="yohaku-bloc my-3 flex flex-col items-stretch gap-2 {className}">
		<YohakuGrille
			operation={spec.operation}
			{cellules}
			lignes={spec.lignes}
			colonnes={spec.colonnes}
			{verdict}
			lignesFausses={detail?.lignesFausses ?? []}
			colonnesFausses={detail?.colonnesFausses ?? []}
			{verrouille}
			onchange={ecrire}
			label="Grille à remplir : {spec.operation === 'somme'
				? 'sommes'
				: 'produits'} des lignes et des colonnes"
		/>
		{#if detail?.message}
			<p class="text-center text-sm text-destructive">{detail.message}</p>
		{/if}
	</div>
{/if}
