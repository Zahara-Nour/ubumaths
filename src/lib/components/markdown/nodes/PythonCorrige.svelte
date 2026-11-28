<!--
	PythonCorrige.svelte
	====================
	Case « programme Python » dans le résultat attendu (verso, copie corrigée, bonne réponse) :
	le programme de l'élève en bloc de code (cadre vert juste, rouge faux, avec le message du
	verdict), puis la solution de l'auteur en bloc de code ; sans réponse, la solution seule.

	@module components/markdown/nodes/PythonCorrige
-->
<script lang="ts">
	import type { PythonAEcrireNode } from '#lib/ubumark/types/python-a-ecrire.ts';
	import {
		readExpectedPythonAnswer,
		readPythonAnswer
	} from '#lib/questions/python/python-answer.ts';
	import CodeBlock from './CodeBlock.svelte';

	interface Props {
		node: PythonAEcrireNode;
		/** Valeur de la case de l'élève (code + verdict) ; null : la solution seule */
		answer: string | null;
		correct: boolean;
		/** Réponse attendue de la case : la solution (variables résolues) */
		expected?: string;
	}

	let { node, answer, correct, expected }: Props = $props();

	let student = $derived(answer === null ? null : readPythonAnswer(answer));
	let solution = $derived(
		(expected === undefined ? null : readExpectedPythonAnswer(expected))?.solution ??
			node.spec?.solution ??
			''
	);
</script>

<div class="python-corrige flex flex-col gap-1">
	{#if student}
		<p class="text-sm font-medium">Ton programme</p>
		<div
			class="rounded-md border-2 {correct ? 'border-green-600' : 'border-destructive'}"
			data-python-eleve
		>
			<CodeBlock code={student.code} language="python" class="my-0" />
		</div>
		{#if !correct && student.verdict?.message}
			<p class="text-sm text-destructive">{student.verdict.message}</p>
		{/if}
	{/if}
	{#if solution !== '' && (!student || !correct)}
		<p class="mt-2 text-sm font-medium">{student ? 'Une solution' : 'Solution'}</p>
		<CodeBlock code={solution} language="python" class="my-0" />
	{/if}
</div>
