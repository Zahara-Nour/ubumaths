<!--
	FigureAnswer — case « figure » dans le résultat attendu
	=======================================================

	Verso de la carte flash et copie corrigée : la figure du bloc
	```figure-a-completer, avec ce que l'élève a tracé (juste : en vert ; faux :
	ses traits et la bonne figure en pointillés) ; sans réponse (R9), la bonne figure.
	Figure de travail (`work`, bloc ```figure-de-travail) : ses traits en gris, sans
	verdict ; sans réponse, la figure de départ seule.
	Lecture seule : la saisie est désactivée.

	@module components/questions/FigureAnswer
-->
<script lang="ts">
	import FigureBlock from '$lib/components/markdown/nodes/FigureBlock.svelte';
	import { parseFigure } from '$lib/ubumark/parser/figure-parser';
	import type { ExpectedStatus } from '$lib/questions/expected-result';

	interface Props {
		/** Texte du bloc (variables résolues), entre les clôtures */
		source: string;
		/** Tracés de l’élève (`droite(…)`, `segment(…)`) ; null : la bonne figure seule */
		answer: string | null;
		/** Sans objet pour une figure de travail (jamais notée) */
		status?: ExpectedStatus;
		/** Figure de travail : traits gris, aucun verdict */
		work?: boolean;
	}

	let { source, answer, status = 'solution', work = false }: Props = $props();

	let node = $derived.by(() => {
		const fence = work ? '```figure-de-travail' : '```figure-a-completer';
		const lines = [fence, ...source.split('\n'), '```'];
		return parseFigure(lines, 0, lines.length - 1);
	});
	let isCorrect = $derived(status === 'correct' || status === 'unoptimal');
</script>

{#if work}
	{#if answer === null}
		<FigureBlock {node} />
	{:else}
		<FigureBlock
			{node}
			answer={{ value: answer, isCorrect: null, disabled: true, onChange: () => {} }}
		/>
	{/if}
{:else if answer === null}
	<FigureBlock {node} showSolution />
{:else}
	<FigureBlock {node} answer={{ value: answer, isCorrect, disabled: true, onChange: () => {} }} />
{/if}
