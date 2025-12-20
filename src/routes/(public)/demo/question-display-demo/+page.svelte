<!--
	QuestionDisplay Component Demo
	===============================

	Demo page showcasing QuestionDisplay in both flashcard and interactive modes
	with different question types.
-->

<script lang="ts">
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { resolvedMarkdown } from '$lib/ubumark';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	// Sample question instances
	const numericalQuestion: QuestionInstance = {
		templateId: 'demo-numerical',
		type: 'numerical_exact',
		statement: resolvedMarkdown('Calculate $$\\frac{3}{4} + \\frac{1}{2}$$'),
		solution: '5/4',
		precision: { type: 'none' },
		grades: ['6', '5'],
		theme: 'Algèbre',
		domain: 'Fractions',
		level: 1,
		correction: {
			steps: [
				resolvedMarkdown(
					'Pour additionner des fractions, il faut trouver un dénominateur commun:\n\n$$\\frac{3}{4} + \\frac{1}{2} = \\frac{3}{4} + \\frac{2}{4} = \\frac{5}{4}$$'
				)
			]
		},
		generatedAt: new Date().toISOString()
	};

	const algebraicQuestion: QuestionInstance = {
		templateId: 'demo-algebraic',
		type: 'algebraic_transform',
		statement: resolvedMarkdown('Factor the expression: $$x^2 - 9$$'),
		solution: '(x-3)(x+3)',
		transformType: 'factor',
		grades: ['3', '2'],
		theme: 'Algèbre',
		domain: 'Factorisation',
		level: 2,
		correction: {
			steps: [
				resolvedMarkdown(
					"Il s'agit d'une différence de carrés:\n\n$$x^2 - 9 = x^2 - 3^2 = (x-3)(x+3)$$"
				)
			]
		},
		generatedAt: new Date().toISOString()
	};

	const qcmQuestion: QuestionInstance = {
		templateId: 'demo-qcm',
		type: 'multiple_choice',
		statement: resolvedMarkdown('What is the value of $$\\pi$$ (approximated to 2 decimals)?'),
		solution: '1', // Index of correct choice
		choices: [
			{ content: resolvedMarkdown('$$3.00$$'), isCorrect: false },
			{ content: resolvedMarkdown('$$3.14$$'), isCorrect: true },
			{ content: resolvedMarkdown('$$3.41$$'), isCorrect: false },
			{ content: resolvedMarkdown('$$2.71$$'), isCorrect: false }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown('$$3.00$$'), originalIndex: 0 },
			{ content: resolvedMarkdown('$$3.14$$'), originalIndex: 1 },
			{ content: resolvedMarkdown('$$3.41$$'), originalIndex: 2 },
			{ content: resolvedMarkdown('$$2.71$$'), originalIndex: 3 }
		],
		multipleAnswers: false,
		grades: ['6'],
		theme: 'Géométrie',
		domain: 'Constantes',
		level: 1,
		correction: {
			steps: [resolvedMarkdown('$$\\pi \\approx 3.14159...$$ donc arrondi à 2 décimales: $$3.14$$')]
		},
		generatedAt: new Date().toISOString()
	};

	const fillBlanksQuestion: QuestionInstance = {
		templateId: 'demo-fill-blanks',
		type: 'fill_in_blanks',
		statement: resolvedMarkdown(
			'The Pythagorean theorem states that for a right triangle: $$a^2 + b^2 = ____^2$$ where ____ is the hypotenuse.'
		),
		solution: ['c', 'c'],
		blanks: [
			{ position: 0, expectedAnswer: 'c' },
			{ position: 1, expectedAnswer: 'c' }
		],
		grades: ['4', '3'],
		theme: 'Géométrie',
		domain: 'Théorème de Pythagore',
		level: 2,
		correction: {
			steps: [
				resolvedMarkdown(
					"Le théorème de Pythagore: $$a^2 + b^2 = c^2$$ où $$c$$ est l'hypoténuse (le côté opposé à l'angle droit)."
				)
			]
		},
		generatedAt: new Date().toISOString()
	};

	// Demo state
	let selectedQuestionType = $state<string>('numerical');
	let interactive = $state<boolean>(true);

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
		<a
			href="/demo"
			data-sveltekit-preload-data="hover"
			class="mb-4 inline-flex items-center gap-2 text-primary hover:underline"
		>
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
				<Label class="mb-2 block">Display Mode</Label>
				<div class="flex gap-2" role="group" aria-label="Sélection du mode d'affichage">
					<Button
						variant={!interactive ? 'default' : 'outline'}
						onclick={() => (interactive = false)}
					>
						Lecture seule
					</Button>
					<Button
						variant={interactive ? 'default' : 'outline'}
						onclick={() => (interactive = true)}
					>
						Interactive
					</Button>
				</div>
			</div>

			<!-- Question Type Selection -->
			<div>
				<Label class="mb-2 block">Question Type</Label>
				<div class="flex flex-wrap gap-2" role="group" aria-label="Sélection du type de question">
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
		{#key `${interactive}-${selectedQuestionType}`}
			<FlashCard
				{interactive}
				instance={currentQuestion}
				onAnswerSubmit={handleAnswerSubmit}
				onComplete={handleComplete}
				onFlip={handleFlip}
				maxAttempts={0}
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
				<strong>Lecture seule:</strong> Mode visualisation uniquement. Cliquez sur le bouton flip pour
				voir la réponse.
			</p>
			<p>
				<strong>Mode Interactive:</strong> Répondez à la question et cliquez sur "Valider" pour vérifier.
			</p>
			<p><strong>Bouton Flip:</strong> Situé en bas à droite (icône de rotation).</p>
			<p>
				<strong>Types de questions:</strong> Testez différentes méthodes de saisie - MathField pour numérique/algébrique,
				boutons pour QCM, saisie en ligne pour remplir les blancs.
			</p>
		</Card.Content>
	</Card.Root>
</div>
