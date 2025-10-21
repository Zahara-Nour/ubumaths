<!--
	TestInteractive Component
	=========================
	Interactive/Quiz mode - questions one by one with validation

	Features:
	- Display questions one by one using QuestionDisplay (interactive mode)
	- User answers and validates
	- No correction shown immediately (stored for later)
	- Auto-advance to next question after validation (1s delay for feedback)
	- At the end: show TestResults with score and corrections

	Props:
	- session: TestSession - Active test session
	- onComplete: (result: TestResult) => void - Callback when test completed
	- onBack: () => void - Callback to return to cart
-->

<script lang="ts">
	import type { TestSession, TestResult, TestAnswerResult } from '$lib/types/test';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import QuestionDisplay from '$lib/components/QuestionDisplay.svelte';
	import TestResults from './TestResults.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	interface Props {
		session: TestSession;
		onComplete: (result: TestResult) => void;
		onBack: () => void;
	}

	let { session, onComplete, onBack }: Props = $props();

	// State
	let currentIndex = $state(0);
	let answers = $state<Map<number, AnswerData>>(new Map());
	let isCompleted = $state(false);
	let testResult = $state<TestResult | null>(null);

	// Derived
	let currentInstance = $derived(session.instances[currentIndex]);
	let progressPercentage = $derived(((currentIndex + 1) / session.instances.length) * 100);
	let isLastQuestion = $derived(currentIndex === session.instances.length - 1);

	/**
	 * Handle answer submission from QuestionDisplay
	 */
	function handleAnswerSubmit(answerData: AnswerData) {
		// Store answer
		answers.set(currentIndex, answerData);

		// Advance to next question after a short delay (for visual feedback)
		setTimeout(() => {
			if (isLastQuestion) {
				// Test completed - calculate results
				completeTest();
			} else {
				// Move to next question
				currentIndex += 1;
			}
		}, 1000);
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
		answers = new Map();
		isCompleted = false;
		testResult = null;
		session.startTime = Date.now();
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
			</div>

			<!-- Progress bar -->
			<Progress value={progressPercentage} class="h-2" />
		</div>

		<!-- Question Display -->
		<QuestionDisplay
			mode="interactive"
			instance={currentInstance}
			onAnswerSubmit={handleAnswerSubmit}
			size="lg"
			showConfetti={false}
			allowMultipleAttempts={false}
		/>
	</div>
{:else if testResult}
	<!-- Show results -->
	<TestResults result={testResult} onRestart={handleRestart} onBackToCart={onBack} />
{/if}
