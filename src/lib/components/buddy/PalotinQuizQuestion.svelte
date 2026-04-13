<!--
	PalotinQuizQuestion
	=====================
	Single quiz question with 3 large answer buttons.
-->

<script lang="ts">
	import type { QuizQuestion } from '$lib/config/buddy-quiz';
	import { Button } from '$lib/components/ui/button';
	import { fade } from 'svelte/transition';

	interface Props {
		question: QuizQuestion;
		questionNumber: number;
		totalQuestions: number;
		onAnswer: (answerIndex: number) => void;
	}

	let { question, questionNumber, totalQuestions, onAnswer }: Props = $props();
</script>

<div class="flex flex-col items-center gap-6 px-4" in:fade={{ duration: 200 }}>
	<!-- Progress -->
	<div class="text-sm text-muted-foreground">
		Question {questionNumber} / {totalQuestions}
	</div>

	<!-- Question -->
	<h2 class="text-center text-lg font-semibold md:text-xl">
		{question.question}
	</h2>

	<!-- Answers -->
	<div class="flex w-full max-w-md flex-col gap-3">
		{#each question.answers as answer, i (answer.palotin)}
			<Button
				variant="outline"
				size="lg"
				class="h-auto py-4 text-left text-base whitespace-normal"
				onclick={() => onAnswer(i)}
			>
				{answer.text}
			</Button>
		{/each}
	</div>
</div>
