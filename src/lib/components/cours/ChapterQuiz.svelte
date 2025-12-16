<!--
	ChapterQuiz Component
	=====================

	Interactive quiz component displaying questions one at a time.
	Shows immediate feedback after each answer, then score summary at end.
	Calls API to submit each answer.

	@module components/cours/ChapterQuiz
-->
<script lang="ts">
	import type {
		ChapterQuizQuestion,
		ChapterQuizResult,
		ChapterProgress
	} from '$lib/types/chapters';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import { ChevronRight, ChevronLeft } from 'lucide-svelte';

	import QuizQuestion from './QuizQuestion.svelte';
	import QuizSummary from './QuizSummary.svelte';

	// Question with results from data
	type QuizQuestionWithResult = ChapterQuizQuestion & {
		bestResult: ChapterQuizResult | null;
		attemptsCount: number;
	};

	// Question template from data
	interface QuestionTemplate {
		id: string;
		question: string;
		answer: boolean;
		explanation: string | null;
	}

	interface Props {
		questions: QuizQuestionWithResult[];
		questionTemplates: Record<string, QuestionTemplate>;
		progress: ChapterProgress;
		onComplete?: (score: number, total: number) => void;
	}

	let { questions, questionTemplates, progress: _progress, onComplete }: Props = $props();

	// Filter questions to only those with templates
	const validQuestions = $derived(questions.filter((q) => questionTemplates[q.questionTemplateId]));

	// Quiz state
	let currentIndex = $state(0);
	let score = $state(0);
	let answers = $state<(boolean | null)[]>([]);
	let showFeedback = $state(false);
	let lastAnswerCorrect = $state(false);
	let isComplete = $state(false);
	let isSubmitting = $state(false);

	// Derived values
	const currentQuestion = $derived(validQuestions[currentIndex]);
	const currentTemplate = $derived(
		currentQuestion ? questionTemplates[currentQuestion.questionTemplateId] : null
	);
	const totalQuestions = $derived(validQuestions.length);
	const progressPercent = $derived(
		Math.round(((currentIndex + (showFeedback ? 1 : 0)) / totalQuestions) * 100)
	);
	const hasNextQuestion = $derived(currentIndex < totalQuestions - 1);
	const canGoBack = $derived(currentIndex > 0 && !showFeedback);

	// Initialize answers array
	$effect(() => {
		if (answers.length !== validQuestions.length) {
			answers = validQuestions.map(() => null);
		}
	});

	// Handle answer submission
	async function handleAnswer(userAnswer: boolean) {
		if (showFeedback || isSubmitting || !currentTemplate) return;

		isSubmitting = true;

		// Calculate if user's answer matches the correct answer from template
		const userAnswerCorrect = userAnswer === currentTemplate.answer;

		// Update state
		lastAnswerCorrect = userAnswerCorrect;
		answers[currentIndex] = userAnswerCorrect;

		if (userAnswerCorrect) {
			score += 1;
		}

		// Submit to API
		try {
			await submitAnswer(currentQuestion.id, userAnswerCorrect);
		} catch (error) {
			console.error('Failed to submit quiz answer:', error);
			// Continue anyway - we don't want to block the user
		}

		showFeedback = true;
		isSubmitting = false;
	}

	// Submit answer to API
	async function submitAnswer(questionId: string, isCorrect: boolean) {
		const response = await fetch('/api/chapters/quiz/submit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chapterQuizQuestionId: questionId,
				isCorrect,
				submittedAnswer: isCorrect ? 'correct' : 'incorrect'
			})
		});

		if (!response.ok) {
			throw new Error('Failed to submit answer');
		}
	}

	// Move to next question
	function nextQuestion() {
		if (!showFeedback) return;

		showFeedback = false;

		if (hasNextQuestion) {
			currentIndex += 1;
		} else {
			// Quiz complete
			isComplete = true;
			onComplete?.(score, totalQuestions);
		}
	}

	// Go back to previous question (view only)
	function previousQuestion() {
		if (!canGoBack) return;
		currentIndex -= 1;
	}

	// Restart quiz
	function restart() {
		currentIndex = 0;
		score = 0;
		answers = validQuestions.map(() => null);
		showFeedback = false;
		lastAnswerCorrect = false;
		isComplete = false;
	}

	// Close quiz
	function close() {
		// This could navigate away or emit an event
		// For now, we just reset to show first question
		restart();
	}
</script>

<div class="chapter-quiz mx-auto max-w-2xl">
	{#if isComplete}
		<!-- Quiz Summary -->
		<QuizSummary {score} total={totalQuestions} onRestart={restart} onClose={close} />
	{:else}
		<!-- Active Quiz -->
		<Card.Root>
			<Card.Header>
				<!-- Progress header -->
				<div class="space-y-3">
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>Question {currentIndex + 1} / {totalQuestions}</span>
						<span>{progressPercent}%</span>
					</div>
					<Progress value={progressPercent} max={100} class="h-2" />
				</div>
			</Card.Header>

			<Card.Content class="pt-2">
				<!-- Question display -->
				{#if currentTemplate}
					<QuizQuestion
						question={{
							statement: currentTemplate.question,
							explanation: currentTemplate.explanation ?? undefined
						}}
						onAnswer={handleAnswer}
						{showFeedback}
						wasCorrect={lastAnswerCorrect}
					/>
				{/if}
			</Card.Content>

			<Card.Footer class="flex justify-between">
				<!-- Navigation buttons -->
				<div>
					{#if canGoBack}
						<Button variant="ghost" onclick={previousQuestion}>
							<ChevronLeft class="mr-1 h-4 w-4" />
							Precedent
						</Button>
					{/if}
				</div>

				<div>
					{#if showFeedback}
						<Button onclick={nextQuestion} size="lg">
							{#if hasNextQuestion}
								Suivant
								<ChevronRight class="ml-1 h-4 w-4" />
							{:else}
								Voir le resultat
								<ChevronRight class="ml-1 h-4 w-4" />
							{/if}
						</Button>
					{/if}
				</div>
			</Card.Footer>
		</Card.Root>

		<!-- Question dots indicator -->
		<div class="mt-4 flex justify-center gap-2">
			{#each validQuestions as _, index (index)}
				{@const isAnswered = answers[index] !== null}
				{@const isCurrent = index === currentIndex}
				{@const wasCorrect = answers[index] === true}
				<button
					class={cn(
						'h-3 w-3 rounded-full transition-all',
						isCurrent && 'ring-2 ring-primary ring-offset-2',
						!isAnswered && 'bg-muted',
						isAnswered && wasCorrect && 'bg-green-500',
						isAnswered && !wasCorrect && 'bg-red-500'
					)}
					onclick={() => {
						// Only allow going to answered questions
						if (index < currentIndex && !showFeedback) {
							currentIndex = index;
						}
					}}
					disabled={index > currentIndex || showFeedback}
					aria-label={`Question ${index + 1}${isAnswered ? (wasCorrect ? ' - correcte' : ' - incorrecte') : ''}`}
				></button>
			{/each}
		</div>
	{/if}
</div>
