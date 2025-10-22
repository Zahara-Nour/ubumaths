<!--
	TestCourse Component
	====================
	Course aux nombres mode - all questions displayed simultaneously with time limit

	Features:
	- All questions displayed in grid layout
	- Global countdown timer in sticky header
	- Each question uses QuestionDisplay in interactive mode (compact)
	- User can answer in any order
	- "Finish" button or auto-finish when time runs out
	- At the end: show TestResults with score

	Props:
	- session: TestSession - Active test session
	- onComplete: (result: TestResult) => void - Callback when test completed
	- onBack: () => void - Callback to return to cart
-->

<script lang="ts">
	import type { TestSession, TestResult, TestAnswerResult } from '$lib/types/test';
	import type { AnswerData } from '$lib/types/question-display';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import TestTimer from './TestTimer.svelte';
	import TestResults from './TestResults.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, CheckCircle2, ArrowUp } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		session: TestSession;
		onComplete: (result: TestResult) => void;
		onBack: () => void;
	}

	let { session, onComplete, onBack }: Props = $props();

	// State
	let answers = $state<Map<number, AnswerData>>(new Map());
	let isCompleted = $state(false);
	let testResult = $state<TestResult | null>(null);
	let showScrollTop = $state(false);

	// Derived
	let timeLimit = $derived(session.timeLimit || 300); // Default 5 minutes
	let answeredCount = $derived(answers.size);
	let unansweredCount = $derived(session.instances.length - answeredCount);

	/**
	 * Handle answer submission for a specific question
	 */
	function handleAnswerSubmit(index: number, answerData: AnswerData) {
		answers.set(index, answerData);
		// Force reactivity
		answers = new Map(answers);
	}

	/**
	 * Handle timer completion - auto-finish test
	 */
	function handleTimerComplete() {
		if (!isCompleted) {
			finishTest();
		}
	}

	/**
	 * Handle manual finish button
	 */
	function handleFinish() {
		if (
			unansweredCount > 0 &&
			!confirm(
				`Il reste ${unansweredCount} question${unansweredCount > 1 ? 's' : ''} non répondue${unansweredCount > 1 ? 's' : ''}. Voulez-vous vraiment terminer ?`
			)
		) {
			return;
		}
		finishTest();
	}

	/**
	 * Finish test and calculate results
	 */
	function finishTest() {
		const endTime = Date.now();
		const timeSpent = Math.round((endTime - session.startTime) / 1000);

		// Build answer results
		const answerResults: TestAnswerResult[] = session.instances.map((instance, index) => {
			const userAnswer = answers.get(index);

			return {
				index,
				instance,
				userAnswer,
				isCorrect: userAnswer?.isCorrect || false,
				timeSpent: userAnswer?.timeSpent,
				attempts: userAnswer?.attempts
			};
		});

		// Calculate score
		const correctAnswers = answerResults.filter((r) => r.isCorrect).length;
		const totalQuestions = session.instances.length;
		const scorePercentage = (correctAnswers / totalQuestions) * 100;
		const scoreOn10 = Math.round((correctAnswers / totalQuestions) * 10 * 10) / 10;
		const averageTime = timeSpent / totalQuestions;

		// Build result
		testResult = {
			mode: 'course',
			score: scoreOn10,
			scorePercentage,
			totalQuestions,
			correctAnswers,
			timeSpent,
			averageTime,
			answers: answerResults,
			completedAt: new Date().toISOString()
		};

		isCompleted = true;

		// Emit completion event
		onComplete(testResult);
	}

	/**
	 * Handle restart test
	 */
	function handleRestart() {
		// Reset state
		answers = new Map();
		isCompleted = false;
		testResult = null;
		session.startTime = Date.now();
	}

	/**
	 * Scroll to top
	 */
	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	/**
	 * Handle scroll to show/hide scroll-to-top button
	 */
	function handleScroll() {
		showScrollTop = window.scrollY > 300;
	}

	// Listen to scroll events
	if (typeof window !== 'undefined') {
		window.addEventListener('scroll', handleScroll);
	}
</script>

{#if !isCompleted}
	<!-- Course aux nombres mode -->
	<div class="space-y-6">
		<!-- Sticky header with timer and stats -->
		<div
			class="sticky top-0 z-30 -mx-4 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
		>
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<!-- Left: Back button and title -->
						<div class="flex items-center gap-3">
							<Button variant="ghost" size="icon" onclick={onBack}>
								<ArrowLeft class="h-5 w-5" />
							</Button>
							<div>
								<h1 class="font-bold">Course aux nombres</h1>
								<p class="text-sm text-muted-foreground">
									{answeredCount} / {session.instances.length} répondu{answeredCount > 1 ? 's' : ''}
								</p>
							</div>
						</div>

						<!-- Center: Timer -->
						<TestTimer
							duration={timeLimit}
							isPaused={false}
							size="md"
							onComplete={handleTimerComplete}
						/>

						<!-- Right: Finish button -->
						<Button onclick={handleFinish} size="lg">
							<CheckCircle2 class="mr-2 h-5 w-5" />
							Terminer
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Questions grid -->
		<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
			{#each session.instances as instance, index}
				<div class="relative" id="question-{index}">
					<!-- Question number badge -->
					<div
						class="absolute -top-3 -left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg"
					>
						{index + 1}
					</div>

					<!-- Question display (compact) -->
					<div
						class={cn('transition-all', answers.has(index) && 'ring-2 ring-primary ring-offset-2')}
					>
						<QuestionCard
							interactive={true}
							{instance}
							onAnswerSubmit={(answerData) => handleAnswerSubmit(index, answerData)}
							size="sm"
						/>
					</div>
				</div>
			{/each}
		</div>

		<!-- Scroll to top button -->
		{#if showScrollTop}
			<button
				onclick={scrollToTop}
				class="fixed right-8 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
				aria-label="Retour en haut"
			>
				<ArrowUp class="h-6 w-6" />
			</button>
		{/if}
	</div>
{:else if testResult}
	<!-- Show results -->
	<TestResults result={testResult} onRestart={handleRestart} onBackToCart={onBack} />
{/if}
