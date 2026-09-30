<!--
	FlashSeries Component
	=====================
	Forme « Flash-cards » d'une série (spécification de David, 2026-09-30).

	Une carte à la fois, sans chrono : l'élève la retourne, puis dit s'il avait
	trouvé. Ce clic enregistre sa réponse (auto-évaluation) et passe à la carte
	suivante. Les cartes de cours suivent la même mécanique.

	Fin : bilan « k cartes trouvées sur n » (cartes de cours à part, comme
	`computeTestScore`), puis revoir les cartes ratées (sans nouvelle
	sauvegarde), recommencer avec de nouvelles questions, ou revenir au panier.

	Props:
	- instances: QuestionInstance[] - Cartes de la série
	- isLoggedIn: boolean - Visiteur non connecté : message « Connecte-toi… »
	- onComplete: (result: TestResult) => void - Appelé une seule fois, à la fin du premier tour
	- onRestart: () => void - Nouvelles questions (la page régénère)
	- onBack: () => void - Retour au panier
-->

<script lang="ts">
	import { tick } from 'svelte';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { computeTestScore } from '$lib/utils/test-score';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { TestAnswerResult, TestResult } from '$lib/types/test';
	import { ArrowLeft, Check, LogIn, RefreshCw, RotateCcw, X } from '@lucide/svelte';

	// Types
	interface Props {
		instances: QuestionInstance[];
		isLoggedIn: boolean;
		onComplete: (result: TestResult) => void;
		onRestart: () => void;
		onBack: () => void;
	}

	let { instances, isLoggedIn, onComplete, onRestart, onBack }: Props = $props();

	// Variables
	// Indices (dans `instances`) des cartes du tour en cours : toutes, puis les ratées
	// svelte-ignore state_referenced_locally
	let round = $state<number[]>(instances.map((_, index) => index));
	let position = $state(0);
	// Réponses du tour en cours
	let roundAnswers = $state<TestAnswerResult[]>([]);
	// La carte a été retournée au moins une fois : la réponse a été vue
	let revealed = $state(false);
	let isFinished = $state(false);
	// Seul le premier tour est sauvegardé ; « Revoir » ne rappelle jamais onComplete
	let isFirstRound = $state(true);
	// Force un nouveau FlashCard (au recto) à chaque carte, même si une carte revient
	let cardKey = $state(0);

	let seriesStart = Date.now();
	let cardStart = Date.now();

	const currentInstance = $derived(instances[round[position]]);
	const summary = $derived(computeTestScore(roundAnswers));
	const missed = $derived(roundAnswers.filter((answer) => !answer.isCorrect));
	const foundSentence = $derived(
		`${summary.correctAnswers} ${plural(summary.correctAnswers, 'carte trouvée', 'cartes trouvées')} sur ${summary.gradedQuestions}`
	);
	const reviewedSentence = $derived(
		`${summary.reviewedCards} ${plural(summary.reviewedCards, 'carte de cours révisée', 'cartes de cours révisées')}`
	);

	// Functions
	function plural(count: number, singular: string, pluralForm: string): string {
		// En français, 0 et 1 s'accordent au singulier
		return count > 1 ? pluralForm : singular;
	}

	// Clavier : le focus suit le déroulé (sinon il retombe sur <body> à chaque carte)
	let root = $state<HTMLElement>();

	async function focusIn(selector: string) {
		await tick();
		root?.querySelector<HTMLElement>(selector)?.focus();
	}

	function handleFlip(isFlipped: boolean) {
		if (isFlipped && !revealed) {
			revealed = true;
			void focusIn('[data-self-assess="found"]');
		}
	}

	function handleSelfAssessment(isCorrect: boolean) {
		if (!revealed || !currentInstance) return;

		const index = round[position];
		roundAnswers.push({
			index,
			instance: currentInstance,
			isCorrect,
			timeSpent: Math.round((Date.now() - cardStart) / 1000),
			attempts: 1
		});

		if (position + 1 < round.length) {
			position += 1;
			showNextCard();
			return;
		}

		isFinished = true;
		void focusIn('[data-summary-title]');
		if (isFirstRound) {
			isFirstRound = false;
			onComplete(buildResult());
		}
	}

	function showNextCard() {
		revealed = false;
		cardKey += 1;
		cardStart = Date.now();
		void focusIn('.flip-card-front [aria-label="Voir la correction"]');
	}

	function buildResult(): TestResult {
		const timeSpent = Math.round((Date.now() - seriesStart) / 1000);
		const answers = [...roundAnswers];
		const { correctAnswers, reviewedCards, score, scorePercentage } = computeTestScore(answers);
		return {
			mode: 'flash',
			score,
			scorePercentage,
			totalQuestions: answers.length,
			correctAnswers,
			reviewedCards,
			timeSpent,
			averageTime: answers.length > 0 ? timeSpent / answers.length : 0,
			answers,
			completedAt: new Date().toISOString()
		};
	}

	function handleReviewMissed() {
		round = missed.map((answer) => answer.index);
		position = 0;
		roundAnswers = [];
		isFinished = false;
		showNextCard();
	}
</script>

<div class="mx-auto w-full max-w-4xl space-y-6" bind:this={root}>
	{#if !isLoggedIn}
		<div
			class="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
			role="note"
		>
			<LogIn class="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
			<p>Connecte-toi pour que tes réponses comptent dans tes révisions.</p>
		</div>
	{/if}

	{#if isFinished}
		<Card.Root data-testid="flash-summary">
			<Card.Header>
				<Card.Title class="text-2xl" tabindex={-1} data-summary-title>Série terminée</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="space-y-2">
					{#if summary.gradedQuestions > 0}
						<p class="text-xl font-semibold">{foundSentence}</p>
						<Progress value={summary.scorePercentage} class="h-3" />
					{/if}
					{#if summary.reviewedCards > 0}
						<p class="text-sm text-muted-foreground">{reviewedSentence}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
					{#if missed.length > 0}
						<Button onclick={handleReviewMissed}>
							<RotateCcw class="mr-2 h-4 w-4" aria-hidden="true" />
							Revoir celles que je n'avais pas trouvées
						</Button>
					{/if}
					<Button variant="outline" onclick={onRestart}>
						<RefreshCw class="mr-2 h-4 w-4" aria-hidden="true" />
						Recommencer avec de nouvelles questions
					</Button>
					<Button variant="ghost" onclick={onBack}>
						<ArrowLeft class="mr-2 h-4 w-4" aria-hidden="true" />
						Retour au panier
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if currentInstance}
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground" data-testid="flash-position">
				Carte {position + 1} / {round.length}
			</p>
			<Progress value={(position / round.length) * 100} class="h-2" />
		</div>

		<div data-testid="flash-card">
			{#key cardKey}
				<FlashCard instance={currentInstance} interactive={false} size="lg" onFlip={handleFlip} />
			{/key}
		</div>

		{#if revealed}
			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				<Button
					class="bg-green-600 text-white hover:bg-green-700"
					data-self-assess="found"
					onclick={() => handleSelfAssessment(true)}
				>
					<Check class="mr-2 h-4 w-4" aria-hidden="true" />
					J'avais trouvé
				</Button>
				<Button variant="destructive" onclick={() => handleSelfAssessment(false)}>
					<X class="mr-2 h-4 w-4" aria-hidden="true" />
					Je n'avais pas trouvé
				</Button>
			</div>
		{:else}
			<p class="text-center text-sm text-muted-foreground">
				Retourne la carte pour voir la réponse.
			</p>
		{/if}
	{:else}
		<!-- Série vide (aucun modèle généré) : jamais un écran blanc -->
		<Card.Root>
			<Card.Content class="space-y-4 p-6 text-center">
				<p class="text-muted-foreground">Aucune carte à afficher pour cette série.</p>
				<Button variant="ghost" onclick={onBack}>
					<ArrowLeft class="mr-2 h-4 w-4" aria-hidden="true" />
					Retour au panier
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
