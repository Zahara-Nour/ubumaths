<!--
	TypingSeries Component
	======================
	Forme « Saisie » d'une série (chantier `formes-de-serie`, N2, N3).

	Une question à la fois, sans chrono : l'élève tape sa réponse, « Valider »
	retourne la carte d'elle-même (sa réponse face à la bonne, le verdict, puis
	la correction), « Suivante » passe à la question d'après. Le retournement
	n'est offert qu'après « Valider » : valider à vide montre la réponse.
	Carte de cours : comme en Flash-cards (retourner, puis « Pas réussi /
	Réussi »).

	Fin : bilan « k questions réussies sur n » (cartes de cours à part), puis
	revoir les ratées (sans nouvelle trace), recommencer avec de nouvelles
	questions, ou revenir au panier. Gain du Palotin et nouvelles de la
	Chatterie (calculés par la page après `onComplete`) affichés sous le bilan.

	Props:
	- instances: QuestionInstance[] - Questions de la série
	- isLoggedIn: boolean - Visiteur non connecté : message « Connecte-toi… »
	- loginNote?: boolean - false : pas de message « Connecte-toi… » (vitrine `/demo/questions`)
	- onComplete: (result: TestResult) => void - Appelé une seule fois, à la fin du premier tour
	- onRestart: () => void - Nouvelles questions (la page régénère)
	- onBack: () => void - Retour au panier
	- traceRecorder: élève connecté → une trace par question du premier tour,
	  envoyée à « Valider » (ou à l'auto-évaluation d'une carte de cours), lieu
	  `typing` (ADR 0038) ; `null` → rien. « Revoir » n'en laisse pas.
	- buddyGain, mathouNews : affichés sur le bilan (`null` → rien)
-->

<script lang="ts">
	import { tick } from 'svelte';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import SelfAssessButtons from '$lib/components/questions/SelfAssessButtons.svelte';
	import BuddyGainCard from '$lib/components/buddy/BuddyGainCard.svelte';
	import MathouNewsCard from '$lib/components/mathoux/MathouNewsCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { computeTestScore } from '$lib/utils/test-score';
	import { isCourseCard } from '$lib/questions/course-card';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import type { TestAnswerResult, TestResult } from '$lib/types/test';
	import type { BuddyGainView } from '$lib/components/buddy/buddy-gain';
	import type { MathouNews } from '$lib/mathoux/news';
	import { ArrowLeft, ArrowRight, LogIn, RefreshCw, RotateCcw } from '@lucide/svelte';
	import { buildSeriesTrace, type TraceRecorder } from '$lib/questions/series-trace';

	// Types
	interface Props {
		instances: QuestionInstance[];
		isLoggedIn: boolean;
		loginNote?: boolean;
		onComplete: (result: TestResult) => void;
		onRestart: () => void;
		onBack: () => void;
		traceRecorder?: TraceRecorder | null;
		buddyGain?: BuddyGainView | null;
		mathouNews?: MathouNews | null;
	}

	let {
		instances,
		isLoggedIn,
		loginNote = true,
		onComplete,
		onRestart,
		onBack,
		traceRecorder = null,
		buddyGain = null,
		mathouNews = null
	}: Props = $props();

	// Variables
	// Indices (dans `instances`) des questions du tour en cours : toutes, puis les ratées
	// svelte-ignore state_referenced_locally
	let round = $state<number[]>(instances.map((_, index) => index));
	let position = $state(0);
	// Réponses du tour en cours
	let roundAnswers = $state<TestAnswerResult[]>([]);
	// Réponse validée de la question affichée (question) ; carte de cours retournée
	let currentAnswer = $state<AnswerData | null>(null);
	let revealed = $state(false);
	let isFinished = $state(false);
	// Seul le premier tour laisse des traces ; « Revoir » ne rappelle jamais onComplete
	let isFirstRound = $state(true);
	// Force une nouvelle FlashCard (au recto, vide) à chaque question, même si elle revient
	let cardKey = $state(0);

	let seriesStart = Date.now();
	let cardStart = Date.now();

	const currentInstance = $derived(instances[round[position]]);
	const currentIsCourseCard = $derived(currentInstance ? isCourseCard(currentInstance) : false);
	const summary = $derived(computeTestScore(roundAnswers));
	const missed = $derived(roundAnswers.filter((answer) => !answer.isCorrect));
	const foundSentence = $derived(
		`${summary.correctAnswers} ${plural(summary.correctAnswers, 'question réussie', 'questions réussies')} sur ${summary.gradedQuestions}`
	);
	const reviewedSentence = $derived(
		`${summary.reviewedCards} ${plural(summary.reviewedCards, 'carte de cours révisée', 'cartes de cours révisées')}`
	);

	// Functions
	function plural(count: number, singular: string, pluralForm: string): string {
		// En français, 0 et 1 s'accordent au singulier
		return count > 1 ? pluralForm : singular;
	}

	// Clavier : le focus suit le déroulé (sinon il retombe sur <body> à chaque question)
	let root = $state<HTMLElement>();

	async function focusIn(selector: string) {
		await tick();
		root?.querySelector<HTMLElement>(selector)?.focus();
	}

	/** Trace de la question (premier tour seulement), envoyée tout de suite */
	function recordTrace(instance: QuestionInstance, answer: AnswerData) {
		if (!isFirstRound || !traceRecorder) return;
		const trace = buildSeriesTrace({ place: 'typing', instance, answer });
		if (trace) traceRecorder.record(trace);
	}

	function keepAnswer(answer: AnswerData) {
		if (!currentInstance) return;
		roundAnswers.push({
			index: round[position],
			instance: currentInstance,
			userAnswer: answer,
			isCorrect: answer.isCorrect,
			timeSpent: Math.round((Date.now() - cardStart) / 1000),
			attempts: 1
		});
		recordTrace(currentInstance, answer);
	}

	/** « Valider » : la carte se retourne d'elle-même (FlashCard `flipOnSubmit`) */
	function handleAnswerSubmit(answer: AnswerData) {
		if (currentAnswer || !currentInstance) return;
		currentAnswer = answer;
		keepAnswer(answer);
		void focusIn('[data-typing-next]');
	}

	/** Carte de cours retournée : place à l'auto-évaluation */
	function handleFlip(isFlipped: boolean) {
		if (currentIsCourseCard && isFlipped && !revealed) {
			revealed = true;
			void focusIn('[data-self-assess="found"]');
		}
	}

	/** Carte de cours : « Réussi / Pas réussi » enregistre et passe à la suivante */
	function handleSelfAssessment(isCorrect: boolean) {
		if (!revealed || !currentIsCourseCard) return;
		keepAnswer({
			value: isCorrect ? 'knew' : 'did_not_know',
			isCorrect,
			timeSpent: 0,
			attempts: 1,
			submittedAt: new Date().toISOString()
		});
		goNext();
	}

	function goNext() {
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
		currentAnswer = null;
		revealed = false;
		cardKey += 1;
		cardStart = Date.now();
	}

	function buildResult(): TestResult {
		const timeSpent = Math.round((Date.now() - seriesStart) / 1000);
		const answers = [...roundAnswers];
		const { correctAnswers, reviewedCards, score, scorePercentage } = computeTestScore(answers);
		return {
			mode: 'typing',
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
	{#if !isLoggedIn && loginNote}
		<div
			class="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
			role="note"
		>
			<LogIn class="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
			<p>Connecte-toi pour que tes réponses comptent dans tes révisions.</p>
		</div>
	{/if}

	{#if isFinished}
		<Card.Root data-testid="typing-summary">
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
							Revoir celles que je n'avais pas réussies
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

		<!-- Gain du Palotin et nouvelles de la Chatterie (élève connecté, premier tour) -->
		<BuddyGainCard gain={buddyGain} />
		<MathouNewsCard news={mathouNews} />
	{:else if currentInstance}
		<!-- Saisie : entraînement seulement, jamais en contrôle → toujours le panier -->
		<BackLink href="/automaths/panier" label="Quitter" kind="quit" class="mb-0" />
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground" data-testid="typing-position">
				Question {position + 1} / {round.length}
			</p>
			<Progress value={(position / round.length) * 100} class="h-2" />
		</div>

		<div data-testid="typing-card">
			{#key cardKey}
				{#if currentIsCourseCard}
					<FlashCard instance={currentInstance} interactive={false} size="lg" onFlip={handleFlip} />
				{:else}
					<FlashCard
						instance={currentInstance}
						interactive
						flipOnSubmit
						flippable={currentAnswer !== null}
						size="lg"
						onAnswerSubmit={handleAnswerSubmit}
					/>
				{/if}
			{/key}
		</div>

		{#if currentIsCourseCard}
			{#if revealed}
				<SelfAssessButtons onAssess={handleSelfAssessment} keyboard />
			{:else}
				<p class="text-center text-sm text-muted-foreground">
					Retourne la carte pour voir la réponse.
				</p>
			{/if}
		{:else if currentAnswer}
			<div class="flex justify-center">
				<Button size="lg" onclick={goNext} data-typing-next>
					{position + 1 < round.length ? 'Suivante' : 'Terminer'}
					<ArrowRight class="ml-2 h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
		{/if}
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
