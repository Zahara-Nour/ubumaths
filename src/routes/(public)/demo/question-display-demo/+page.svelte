<!--
	QuestionDisplay Component Demo
	===============================

	Demo page showcasing QuestionDisplay in both flashcard and interactive modes
	with different question types.
-->

<script lang="ts">
	import QuestionDisplay from '$lib/components/QuestionDisplay.svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	// Sample question instances
	const numericalQuestion: QuestionInstance = {
		templateId: 'demo-numerical',
		type: 'numerical_exact',
		statement: [
			{
				type: 'text',
				content: 'Calculate $$\\frac{3}{4} + \\frac{1}{2}$$'
			}
		],
		answer: '5/4',
		precision: { type: 'none' },
		grades: ['6', '5'],
		theme: 'Algèbre',
		domain: 'Fractions',
		level: 1,
		correction: [
			{
				type: 'text',
				content:
					'Pour additionner des fractions, il faut trouver un dénominateur commun:\n\n$$\\frac{3}{4} + \\frac{1}{2} = \\frac{3}{4} + \\frac{2}{4} = \\frac{5}{4}$$'
			}
		],
		generatedAt: new Date().toISOString()
	};

	const algebraicQuestion: QuestionInstance = {
		templateId: 'demo-algebraic',
		type: 'algebraic_transform',
		statement: [
			{
				type: 'text',
				content: 'Factor the expression: $$x^2 - 9$$'
			}
		],
		answer: '(x-3)(x+3)',
		transformType: 'factor',
		grades: ['3', '2'],
		theme: 'Algèbre',
		domain: 'Factorisation',
		level: 2,
		correction: [
			{
				type: 'text',
				content: "Il s'agit d'une différence de carrés:\n\n$$x^2 - 9 = x^2 - 3^2 = (x-3)(x+3)$$"
			}
		],
		generatedAt: new Date().toISOString()
	};

	const qcmQuestion: QuestionInstance = {
		templateId: 'demo-qcm',
		type: 'multiple_choice',
		statement: [
			{
				type: 'text',
				content: 'What is the value of $$\\pi$$ (approximated to 2 decimals)?'
			}
		],
		answer: '1', // Index of correct choice
		choices: [
			{ content: { type: 'text', content: '$$3.00$$' }, isCorrect: false },
			{ content: { type: 'text', content: '$$3.14$$' }, isCorrect: true },
			{ content: { type: 'text', content: '$$3.41$$' }, isCorrect: false },
			{ content: { type: 'text', content: '$$2.71$$' }, isCorrect: false }
		],
		shuffledChoices: [
			{ content: { type: 'text', content: '$$3.00$$' }, originalIndex: 0 },
			{ content: { type: 'text', content: '$$3.14$$' }, originalIndex: 1 },
			{ content: { type: 'text', content: '$$3.41$$' }, originalIndex: 2 },
			{ content: { type: 'text', content: '$$2.71$$' }, originalIndex: 3 }
		],
		multipleAnswers: false,
		grades: ['6'],
		theme: 'Géométrie',
		domain: 'Constantes',
		level: 1,
		correction: [
			{
				type: 'text',
				content: '$$\\pi \\approx 3.14159...$$ donc arrondi à 2 décimales: $$3.14$$'
			}
		],
		generatedAt: new Date().toISOString()
	};

	const fillBlanksQuestion: QuestionInstance = {
		templateId: 'demo-fill-blanks',
		type: 'fill_in_blanks',
		statement: [
			{
				type: 'text',
				content:
					'The Pythagorean theorem states that for a right triangle: $$a^2 + b^2 = ____^2$$ where ____ is the hypotenuse.'
			}
		],
		answer: ['c', 'c'],
		blanks: [
			{ position: 0, expectedAnswer: 'c' },
			{ position: 1, expectedAnswer: 'c' }
		],
		grades: ['4', '3'],
		theme: 'Géométrie',
		domain: 'Théorème de Pythagore',
		level: 2,
		correction: [
			{
				type: 'text',
				content:
					"Le théorème de Pythagore: $$a^2 + b^2 = c^2$$ où $$c$$ est l'hypoténuse (le côté opposé à l'angle droit)."
			}
		],
		generatedAt: new Date().toISOString()
	};

	// Demo state
	let selectedQuestionType = $state<string>('numerical');
	let selectedMode = $state<'flashcard' | 'interactive'>('interactive');

	// Get current question based on selection
	const currentQuestion = $derived(
		selectedQuestionType === 'numerical'
			? numericalQuestion
			: selectedQuestionType === 'algebraic'
				? algebraicQuestion
				: selectedQuestionType === 'qcm'
					? qcmQuestion
					: fillBlanksQuestion
	);

	// Event handlers
	function handleAnswerSubmit(answer: AnswerData) {
		console.log('Answer submitted:', answer);
		if (answer.isCorrect) {
			toaster.success(`Correct! Time: ${answer.timeSpent}s, Attempts: ${answer.attempts}`);
		} else {
			toaster.error(`Incorrect. Keep trying!`);
		}
	}

	function handleComplete(stats: QuestionStats) {
		console.log('Question completed:', stats);
		toaster.info(`Question completed in ${stats.timeSpent}s with ${stats.attempts} attempt(s)`);
	}

	function handleFlip(isFlipped: boolean) {
		console.log('Card flipped:', isFlipped);
	}
</script>

<div class="container mx-auto min-h-screen py-8">
	<!-- Header -->
	<div class="mb-8">
		<a href="/demo" class="mb-4 inline-flex items-center gap-2 text-primary hover:underline">
			<ArrowLeft class="h-4 w-4" />
			Retour aux démos
		</a>
		<h1 class="text-4xl font-bold">QuestionDisplay Component Demo</h1>
		<p class="mt-2 text-muted-foreground">
			Test the QuestionDisplay component in both flashcard and interactive modes
		</p>
	</div>

	<!-- Controls -->
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title>Configuration</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Mode Selection -->
			<div>
				<label class="mb-2 block text-sm font-medium">Display Mode</label>
				<div class="flex gap-2">
					<Button
						variant={selectedMode === 'flashcard' ? 'default' : 'outline'}
						onclick={() => (selectedMode = 'flashcard')}
					>
						Flashcard Mode
					</Button>
					<Button
						variant={selectedMode === 'interactive' ? 'default' : 'outline'}
						onclick={() => (selectedMode = 'interactive')}
					>
						Interactive Mode
					</Button>
				</div>
			</div>

			<!-- Question Type Selection -->
			<div>
				<label class="mb-2 block text-sm font-medium">Question Type</label>
				<div class="flex flex-wrap gap-2">
					<Button
						variant={selectedQuestionType === 'numerical' ? 'default' : 'outline'}
						onclick={() => (selectedQuestionType = 'numerical')}
					>
						Numerical
					</Button>
					<Button
						variant={selectedQuestionType === 'algebraic' ? 'default' : 'outline'}
						onclick={() => (selectedQuestionType = 'algebraic')}
					>
						Algebraic
					</Button>
					<Button
						variant={selectedQuestionType === 'qcm' ? 'default' : 'outline'}
						onclick={() => (selectedQuestionType = 'qcm')}
					>
						QCM
					</Button>
					<Button
						variant={selectedQuestionType === 'fillblanks' ? 'default' : 'outline'}
						onclick={() => (selectedQuestionType = 'fillblanks')}
					>
						Fill-in-Blanks
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Question Display -->
	<div class="mb-8">
		{#key `${selectedMode}-${selectedQuestionType}`}
			<QuestionDisplay
				mode={selectedMode}
				instance={currentQuestion}
				onAnswerSubmit={handleAnswerSubmit}
				onComplete={handleComplete}
				onFlip={handleFlip}
				showConfetti={true}
				allowMultipleAttempts={true}
				showCorrectionOnWrong={false}
			/>
		{/key}
	</div>

	<!-- Instructions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Instructions</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-2">
			<p>
				<strong>Flashcard Mode:</strong> View-only mode. Click the flip button to see the answer.
			</p>
			<p>
				<strong>Interactive Mode:</strong> Answer the question and click "Valider" to check. The flip
				button becomes active after submission.
			</p>
			<p><strong>Flip Button:</strong> Located in the bottom-right corner (rotate icon).</p>
			<p>
				<strong>Question Types:</strong> Test different input methods - MathField for numerical/algebraic,
				buttons for QCM, inline inputs for fill-in-blanks.
			</p>
		</Card.Content>
	</Card.Root>
</div>
