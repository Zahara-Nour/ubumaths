<!--
	Banc d'essai d'AnswerEditor : lie les valeurs `$bindable` et les expose dans
	le DOM, pour que le test lise ce que le formulaire recevrait.
-->
<script lang="ts">
	import AnswerEditor from '../AnswerEditor.svelte';
	import { templateMarkdown, type TemplateMarkdown } from '$lib/ubumark';

	interface Props {
		initialChoices?: { content: string; isCorrect?: boolean }[];
		initialMultipleAnswers?: boolean;
		initialShuffleChoices?: boolean;
	}

	let {
		initialChoices = [],
		initialMultipleAnswers = false,
		initialShuffleChoices = true
	}: Props = $props();

	// Copie de départ : le banc garde ensuite son propre état
	const start = () => ({
		choices: initialChoices.map((c) => ({ ...c, content: templateMarkdown(c.content) })),
		multipleAnswers: initialMultipleAnswers,
		shuffleChoices: initialShuffleChoices
	});
	const initial = start();

	let choices = $state<{ content: TemplateMarkdown; isCorrect?: boolean }[]>(initial.choices);
	let multipleAnswers = $state<boolean | undefined>(initial.multipleAnswers);
	let shuffleChoices = $state(initial.shuffleChoices);
</script>

<AnswerEditor
	questionType="multiple_choice"
	bind:choices
	bind:multipleAnswers
	bind:shuffleChoices
/>

<output data-testid="state">
	{JSON.stringify({
		contents: choices.map((c) => c.content),
		correct: choices.map((c) => c.isCorrect ?? false),
		multipleAnswers: multipleAnswers ?? false,
		shuffleChoices
	})}
</output>
