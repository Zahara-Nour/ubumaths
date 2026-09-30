<!--
	TestInteractive Component
	=========================
	Forme « Entraînement » d'une série (spécification de David, 2026-09-30).

	Une question à la fois, chacune avec SON chrono (durée portée par la
	question, `ClassroomItem.delaySeconds`) :
	- l'élève valide → la question suivante arrive après 300 ms ;
	- le chrono expire → ce qui est tapé ou coché est validé (Q18) ; rien →
	  la question compte fausse. Une seule avance par question, même si le
	  chrono expire pendant les 300 ms qui suivent une validation.
	Pas de chrono global (Q19). Fin : `TestResults` ; « Recommencer » demande
	de nouvelles questions à la page (`onRestart`).

	Props:
	- items: ClassroomItem[] - Questions de la série, chacune avec sa durée
	- isLoggedIn: boolean - Visiteur non connecté : message « Connecte-toi… »
	- onComplete: (result: TestResult) => void - Appelé à la fin de la série
	- onRestart: () => void - Nouvelles questions (la page régénère)
	- onBack: () => void - Retour au panier
	- assessmentTitle?: string - Titre d'une évaluation assignée
-->

<script lang="ts">
	import { computeTestScore } from '$lib/utils/test-score';
	import type { ClassroomItem, TestResult, TestAnswerResult } from '$lib/types/test';
	import type { AnswerData } from '$lib/types/question-display';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import TestResults from './TestResults.svelte';
	import TestTimer from './TestTimer.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, LogIn } from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { slideFromRight, slideToLeft } from '$lib/transitions/slide-transition';

	// Types
	interface Props {
		items: ClassroomItem[];
		isLoggedIn: boolean;
		onComplete: (result: TestResult) => void;
		onRestart: () => void;
		onBack: () => void;
		assessmentTitle?: string;
	}

	// Constants
	/** Pause entre une validation et la question suivante */
	const ADVANCE_DELAY_MS = 300;

	let { items, isLoggedIn, onComplete, onRestart, onBack, assessmentTitle }: Props = $props();

	// Variables
	let currentIndex = $state(0);
	let answers = new SvelteMap<number, AnswerData>();
	let testResult = $state<TestResult | null>(null);
	// Carte en cours : sa réponse tapée est validée à l'expiration du chrono
	let currentCard = $state<ReturnType<typeof QuestionCard>>();
	let pendingAdvance: ReturnType<typeof setTimeout> | undefined;

	const startTime = Date.now();

	const currentItem = $derived(items[currentIndex]);
	const progressPercentage = $derived(((currentIndex + 1) / items.length) * 100);

	// Functions
	/**
	 * Passe à la question suivante depuis `fromIndex`. Ignoré si la question a
	 * déjà changé : validation et expiration ne font avancer qu'une fois.
	 */
	function advanceFrom(fromIndex: number) {
		if (fromIndex !== currentIndex || testResult) return;
		clearTimeout(pendingAdvance);
		pendingAdvance = undefined;

		if (currentIndex + 1 >= items.length) {
			completeTest();
			return;
		}
		currentIndex += 1;
	}

	function handleAnswerSubmit(answerData: AnswerData) {
		const index = currentIndex;
		if (answers.has(index)) return;
		answers.set(index, answerData);
		pendingAdvance = setTimeout(() => advanceFrom(index), ADVANCE_DELAY_MS);
	}

	/**
	 * Chrono écoulé : réponse déjà validée → l'avance prévue suffit ; sinon ce
	 * qui est tapé est validé, et rien de tapé compte faux.
	 */
	function handleTimerComplete() {
		const index = currentIndex;
		if (answers.has(index)) return;

		const pending = currentCard?.submitPendingAnswer() ?? null;
		answers.set(
			index,
			pending ?? {
				value: '',
				isCorrect: false,
				timeSpent: items[index].delaySeconds,
				attempts: 0,
				submittedAt: new Date().toISOString()
			}
		);
		advanceFrom(index);
	}

	function completeTest() {
		const timeSpent = Math.round((Date.now() - startTime) / 1000);

		const answerResults: TestAnswerResult[] = items.map((item, index) => {
			const userAnswer = answers.get(index);
			return {
				index,
				instance: item.instance,
				userAnswer,
				isCorrect: userAnswer?.isCorrect || false,
				timeSpent: userAnswer?.timeSpent,
				attempts: userAnswer?.attempts
			};
		});

		// Les cartes de cours (auto-évaluées) sont hors score (décision 2026-09-28)
		const { correctAnswers, reviewedCards, score, scorePercentage } =
			computeTestScore(answerResults);
		const totalQuestions = items.length;

		testResult = {
			mode: 'interactive',
			score,
			scorePercentage,
			totalQuestions,
			correctAnswers,
			reviewedCards,
			timeSpent,
			averageTime: timeSpent / totalQuestions,
			answers: answerResults,
			completedAt: new Date().toISOString()
		};

		onComplete(testResult);
	}

	// Une avance en attente ne doit pas survivre au composant
	$effect(() => {
		return () => clearTimeout(pendingAdvance);
	});
</script>

<div class="space-y-6">
	{#if !isLoggedIn}
		<div
			class="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
			role="note"
		>
			<LogIn class="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
			<p>Connecte-toi pour que tes réponses comptent dans tes révisions.</p>
		</div>
	{/if}

	{#if testResult}
		<TestResults result={testResult} {onRestart} onBackToCart={onBack} />
	{:else if currentItem}
		<!-- Header with progress -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="icon" onclick={onBack} aria-label="Retour au panier">
						<ArrowLeft class="h-5 w-5" />
					</Button>
					<div>
						<h1 class="text-2xl font-bold">
							{#if assessmentTitle}
								Évaluation : {assessmentTitle}
							{:else}
								Entraînement
							{/if}
						</h1>
						<p class="text-sm text-muted-foreground" data-testid="interactive-position">
							Question {currentIndex + 1} sur {items.length}
						</p>
					</div>
				</div>

				<!-- Chrono de la question en cours (remonté à chaque question) -->
				{#key currentIndex}
					<TestTimer
						duration={currentItem.delaySeconds}
						size="md"
						onComplete={handleTimerComplete}
					/>
				{/key}
			</div>

			<Progress value={progressPercentage} class="h-2" />
		</div>

		<!-- Question Display -->
		<div class="relative min-h-[500px]">
			{#key currentIndex}
				<div
					class="absolute inset-x-0 top-0 w-full"
					data-testid="interactive-question"
					in:slideFromRight
					out:slideToLeft
				>
					<QuestionCard
						bind:this={currentCard}
						interactive={true}
						instance={currentItem.instance}
						onAnswerSubmit={handleAnswerSubmit}
						size="lg"
					/>
				</div>
			{/key}
		</div>
	{:else}
		<!-- Série vide (aucun modèle généré) : jamais un écran blanc -->
		<Card.Root>
			<Card.Content class="space-y-4 p-6 text-center">
				<p class="text-muted-foreground">Aucune question à afficher pour cette série.</p>
				<Button variant="ghost" onclick={onBack}>
					<ArrowLeft class="mr-2 h-4 w-4" aria-hidden="true" />
					Retour au panier
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
