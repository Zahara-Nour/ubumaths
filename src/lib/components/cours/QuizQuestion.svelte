<!--
	QuizQuestion Component
	======================

	Single question display with answer buttons.
	Supports true/false questions and multiple choice.
	Shows immediate feedback with explanation after answer.

	@module components/cours/QuizQuestion
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { cn } from '$lib/utils';
	import { Check, X } from 'lucide-svelte';

	// Props
	interface Props {
		question: {
			statement: string;
			choices?: string[];
			explanation?: string;
		};
		onAnswer: (isCorrect: boolean) => void;
		showFeedback: boolean;
		wasCorrect?: boolean;
	}

	let { question, onAnswer, showFeedback, wasCorrect }: Props = $props();

	// Local state for tracking user's answer (for highlighting)
	let selectedAnswer = $state<string | null>(null);

	// Determine if this is a true/false question
	const isTrueFalse = $derived(!question.choices || question.choices.length === 0);

	// Handle answer selection
	function handleAnswer(answer: string, index?: number) {
		if (showFeedback) return; // Already answered

		selectedAnswer = answer;

		// For true/false, first choice is always "VRAI" (correct answer for true)
		// The parent component will determine if the answer is correct
		// Here we just pass the selection back
		const isCorrectAnswer = answer === 'VRAI' || index === 0;
		onAnswer(isCorrectAnswer);
	}

	// Handle true/false answer
	function handleTrueFalse(isTrue: boolean) {
		if (showFeedback) return;

		selectedAnswer = isTrue ? 'VRAI' : 'FAUX';
		onAnswer(isTrue);
	}
</script>

<div class="quiz-question space-y-6">
	<!-- Question statement with LaTeX support -->
	<div class="question-statement rounded-lg border bg-card p-4">
		<MarkdownRenderer content={question.statement} />
	</div>

	<!-- Answer options -->
	<div class="answer-options">
		{#if isTrueFalse}
			<!-- True/False buttons -->
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button
					size="lg"
					variant={showFeedback && selectedAnswer === 'VRAI'
						? wasCorrect
							? 'default'
							: 'destructive'
						: 'outline'}
					class={cn(
						'min-w-32 text-lg font-semibold transition-all',
						showFeedback &&
							selectedAnswer === 'VRAI' &&
							wasCorrect &&
							'bg-green-600 hover:bg-green-600',
						!showFeedback && 'hover:border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30'
					)}
					onclick={() => handleTrueFalse(true)}
					disabled={showFeedback}
				>
					{#if showFeedback && selectedAnswer === 'VRAI'}
						{#if wasCorrect}
							<Check class="mr-2 h-5 w-5" />
						{:else}
							<X class="mr-2 h-5 w-5" />
						{/if}
					{/if}
					VRAI
				</Button>

				<Button
					size="lg"
					variant={showFeedback && selectedAnswer === 'FAUX'
						? wasCorrect
							? 'default'
							: 'destructive'
						: 'outline'}
					class={cn(
						'min-w-32 text-lg font-semibold transition-all',
						showFeedback &&
							selectedAnswer === 'FAUX' &&
							wasCorrect &&
							'bg-green-600 hover:bg-green-600',
						!showFeedback && 'hover:border-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
					)}
					onclick={() => handleTrueFalse(false)}
					disabled={showFeedback}
				>
					{#if showFeedback && selectedAnswer === 'FAUX'}
						{#if wasCorrect}
							<Check class="mr-2 h-5 w-5" />
						{:else}
							<X class="mr-2 h-5 w-5" />
						{/if}
					{/if}
					FAUX
				</Button>
			</div>
		{:else if question.choices}
			<!-- Multiple choice buttons -->
			<div class="flex flex-col gap-3">
				{#each question.choices as choice, index (index)}
					{@const letter = String.fromCharCode(65 + index)}
					{@const isSelected = selectedAnswer === choice}
					{@const isCorrectChoice = index === 0}
					<!-- First choice is typically the correct one -->
					<Button
						size="lg"
						variant={showFeedback && isSelected
							? wasCorrect
								? 'default'
								: 'destructive'
							: 'outline'}
						class={cn(
							'h-auto justify-start px-4 py-3 text-left whitespace-normal transition-all',
							showFeedback && isSelected && wasCorrect && 'bg-green-600 hover:bg-green-600',
							showFeedback &&
								!isSelected &&
								isCorrectChoice &&
								'border-green-500 bg-green-50 dark:bg-green-900/30',
							!showFeedback && 'hover:bg-muted'
						)}
						onclick={() => handleAnswer(choice, index)}
						disabled={showFeedback}
					>
						<span class="flex w-full items-start gap-3">
							<span
								class={cn(
									'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
									showFeedback && isSelected
										? wasCorrect
											? 'bg-white/20'
											: 'bg-white/20'
										: 'bg-muted'
								)}
							>
								{#if showFeedback && isSelected}
									{#if wasCorrect}
										<Check class="h-4 w-4" />
									{:else}
										<X class="h-4 w-4" />
									{/if}
								{:else}
									{letter}
								{/if}
							</span>
							<span class="flex-1">
								<MarkdownRenderer content={choice} />
							</span>
						</span>
					</Button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Feedback and explanation -->
	{#if showFeedback}
		<div
			class={cn(
				'feedback-section rounded-lg border-2 p-4 transition-all',
				wasCorrect
					? 'border-green-500 bg-green-50 dark:bg-green-900/30'
					: 'border-red-500 bg-red-50 dark:bg-red-900/30'
			)}
		>
			<div class="mb-2 flex items-center gap-2">
				{#if wasCorrect}
					<Check class="h-5 w-5 text-green-600 dark:text-green-400" />
					<span class="font-semibold text-green-700 dark:text-green-300">Bonne reponse !</span>
				{:else}
					<X class="h-5 w-5 text-red-600 dark:text-red-400" />
					<span class="font-semibold text-red-700 dark:text-red-300">Mauvaise reponse</span>
				{/if}
			</div>

			{#if question.explanation}
				<div class="explanation mt-3 border-t border-current/10 pt-3 text-sm text-muted-foreground">
					<MarkdownRenderer content={question.explanation} />
				</div>
			{/if}
		</div>
	{/if}
</div>
