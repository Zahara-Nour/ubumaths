<!--
	Banc d'essai d'AnswerEditor, texte à trous avec énoncé : lie l'énoncé et les
	cases (`$bindable`) et les expose dans le DOM (case choix, PR 1b ; erreurs
	prévues, idees-format PR 6 ; veto « jamais en QCM », idée 4).
-->
<script lang="ts">
	import AnswerEditor from '../AnswerEditor.svelte';
	import type { TemplateBlank } from '#lib/questions/types.ts';
	import { templateMarkdown, type TemplateMarkdown } from '#lib/ubumark/index.ts';

	interface Props {
		initialStatement?: string;
		initialAnswers?: string[];
		/** Cases complètes de départ (erreurs prévues) ; l'emporte sur `initialAnswers` */
		initialBlanks?: TemplateBlank[];
		statementShared?: boolean;
		/** Énoncé que le bouton « coller » met à la place (l'auteur modifie l'énoncé) */
		pastedStatement?: string;
	}

	let {
		initialStatement = '',
		initialAnswers = [''],
		initialBlanks,
		statementShared = false,
		pastedStatement = ''
	}: Props = $props();

	// Copie de départ : le banc garde ensuite son propre état
	const start = () => ({
		statement: templateMarkdown(initialStatement),
		blanks: initialBlanks ?? initialAnswers.map((expectedAnswer) => ({ expectedAnswer }))
	});
	const initial = start();

	let statement = $state<TemplateMarkdown>(initial.statement);
	let blanks = $state<TemplateBlank[]>(initial.blanks);
</script>

<AnswerEditor questionType="fill_in_blanks" bind:statement bind:blanks {statementShared} />

<button
	type="button"
	data-testid="coller"
	onclick={() => (statement = templateMarkdown(pastedStatement))}
>
	coller
</button>

<output data-testid="state">
	{JSON.stringify({ statement, answers: blanks.map((b) => b.expectedAnswer) })}
</output>

<output data-testid="erreurs">
	{JSON.stringify(blanks.map((b) => b.expectedErrors ?? null))}
</output>

<output data-testid="veto">
	{JSON.stringify(blanks.map((b) => b.neverChoice ?? null))}
</output>
