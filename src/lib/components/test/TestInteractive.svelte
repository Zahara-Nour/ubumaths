<!--
	TestInteractive Component
	=========================
	Interactive/Quiz mode - questions one by one with validation

	Features:
	- Display questions one by one using QuestionDisplay (interactive mode)
	- Countdown timer per question (from CartItem.delay)
	- User answers and validates
	- No correction shown immediately (stored for later)
	- Auto-advance to next question after validation (300ms delay)
	- If timer expires before answer: marks as incorrect and advances
	- At the end: show TestResults with score and corrections

	Props:
	- session: TestSession - Active test session
	- onComplete: (result: TestResult) => void - Callback when test completed
	- onBack: () => void - Callback to return to cart
-->

<script lang="ts">
	import type { TestSession, TestResult, TestAnswerResult } from '$lib/types/test';
	import type { AnswerData } from '$lib/types/question-display';
	import QuestionDisplay from '$lib/components/QuestionDisplay.svelte';
	import TestResults from './TestResults.svelte';
	import TestTimer from './TestTimer.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface Props {
		session: TestSession;
		onComplete: (result: TestResult) => void;
		onBack: () => void;
	}

	let { session, onComplete, onBack }: Props = $props();

	// State
	let currentIndex = $state(0);
	let answers = new SvelteMap<number, AnswerData>();
	let isCompleted = $state(false);
	let testResult = $state<TestResult | null>(null);
	let timerKey = $state(0); // Key to force timer remount when question changes

	// Build a map of instance index to BASE delay (without adjustments)
	// Each CartItem may have multiple instances (quantity > 1)
	let instanceBaseDelays = $derived.by(() => {
		const delays: number[] = [];
		for (const item of session.categories) {
			for (let i = 0; i < item.quantity; i++) {
				delays.push(item.delay);
			}
		}
		return delays;
	});

	// Derived
	let currentInstance = $derived(session.instances[currentIndex]);
	let currentDelay = $derived(instanceBaseDelays[currentIndex] || 20);
	let progressPercentage = $derived(((currentIndex + 1) / session.instances.length) * 100);
	let isLastQuestion = $derived(currentIndex === session.instances.length - 1);

	/**
	 * Handle answer submission from QuestionDisplay
	 */
	function handleAnswerSubmit(answerData: AnswerData) {
		// Store answer
		answers.set(currentIndex, answerData);

		// Advance to next question after a short delay (smooth transition)
		setTimeout(() => {
			advanceToNextQuestion();
		}, 300);
	}

	/**
	 * Handle timer completion - time expired without answer
	 */
	function handleTimerComplete() {
		// Mark question as unanswered (time expired)
		if (!answers.has(currentIndex)) {
			answers.set(currentIndex, {
				value: '',
				isCorrect: false,
				timeSpent: currentDelay,
				attempts: 0,
				submittedAt: new Date().toISOString()
			});
		}

		// Advance to next question
		advanceToNextQuestion();
	}

	/**
	 * Advance to next question or complete test
	 */
	function advanceToNextQuestion() {
		if (isLastQuestion) {
			// Test completed - calculate results
			completeTest();
		} else {
			// Move to next question
			currentIndex += 1;
			timerKey += 1; // Force timer remount
		}
	}

	/**
	 * Complete test and calculate results
	 */
	function completeTest() {
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
			mode: 'interactive',
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
		currentIndex = 0;
		answers.clear();
		isCompleted = false;
		testResult = null;
		session.startTime = Date.now();
		timerKey = 0;
	}
</script>

{#if !isCompleted}
	<!-- Interactive quiz mode -->
	<div class="space-y-6">
		<!-- Header with progress -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="icon" onclick={onBack}>
						<ArrowLeft class="h-5 w-5" />
					</Button>
					<div>
						<h1 class="text-2xl font-bold">Mode Quiz</h1>
						<p class="text-sm text-muted-foreground">
							Question {currentIndex + 1} sur {session.instances.length}
						</p>
					</div>
				</div>

				<!-- Countdown Timer -->
				{#key timerKey}
					<TestTimer duration={currentDelay} size="md" onComplete={handleTimerComplete} />
				{/key}
			</div>

			<!-- Progress bar -->
			<Progress value={progressPercentage} class="h-2" />
		</div>

		<!-- Question Display -->
		{#key currentIndex}
			<QuestionDisplay
				mode="interactive"
				instance={currentInstance}
				onAnswerSubmit={handleAnswerSubmit}
				size="lg"
				showConfetti={false}
				showValidationFeedback={false}
				allowMultipleAttempts={false}
			/>
		{/key}
	</div>
{:else if testResult}
	<!-- Show results -->
	<TestResults result={testResult} onRestart={handleRestart} onBackToCart={onBack} />
{/if}
