<!--
	Banc d'essai d'AnswerEditor, texte à trous avec énoncé : lie l'énoncé et les
	cases (`$bindable`) et les expose dans le DOM (case choix, PR 1b).
-->
<script lang="ts">
	import AnswerEditor from '../AnswerEditor.svelte';
	import type { TemplateBlank } from '$lib/questions/types';
	import { templateMarkdown, type TemplateMarkdown } from '$lib/ubumark';

	interface Props {
		initialStatement?: string;
		initialAnswers?: string[];
		statementShared?: boolean;
	}

	let { initialStatement = '', initialAnswers = [''], statementShared = false }: Props = $props();

	// Copie de départ : le banc garde ensuite son propre état
	const start = () => ({
		statement: templateMarkdown(initialStatement),
		blanks: initialAnswers.map((expectedAnswer) => ({ expectedAnswer }))
	});
	const initial = start();

	let statement = $state<TemplateMarkdown>(initial.statement);
	let blanks = $state<TemplateBlank[]>(initial.blanks);
</script>

<AnswerEditor questionType="fill_in_blanks" bind:statement bind:blanks {statementShared} />

<output data-testid="state">
	{JSON.stringify({ statement, answers: blanks.map((b) => b.expectedAnswer) })}
</output>
