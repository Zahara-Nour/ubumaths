<!--
	TestInteractive Component
	=========================
	Forme « Contrôle blanc » d'une série (ex-« Entraînement », spécification de
	David, 2026-09-30 ; renommée le 2026-11-11, chantier `formes-de-serie`).

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
	- loginNote?: boolean - false : pas de message « Connecte-toi… » (vitrine `/demo/questions`)
	- onComplete: (result: TestResult) => void - Appelé à la fin de la série
	- onRestart: () => void - Nouvelles questions (la page régénère)
	- onBack: () => void - Retour au panier (à « Mes évaluations » pour une évaluation)
	- inEvaluation: évaluation assignée → pas de « Recommencer »
	- assessmentTitle?: string - Titre d'une évaluation assignée
	- collectOnly: évaluation notée → réponses collectées SANS correction (le
	  serveur corrige à l'envoi, ADR 0015)
	- showResults: false → pas d'écran de résultats à la fin (la page affiche
	  la correction du serveur) ; « Envoi de ta copie… » en attendant
	- buddyGain: gain du Palotin, affiché sur l'écran de résultats (`null` → rien)
	- mathouNews: nouveautés de la Chatterie, affichées sur l'écran de résultats (`null` → rien)
	- traceRecorder: série libre d'un élève connecté → une trace par question,
	  envoyée dès la réponse (lieu `mock_test`, durée de réponse, durée allouée,
	  fin, réponse case par case ; ADR 0038) ; `null` → rien (contrôle, visiteur)
	- palotinReactions: Contrôle blanc libre d'un élève connecté → le Palotin réagit
	  (5 réussites d'affilée, 3 erreurs sur une notion), une fois au plus, et la
	  question suivante attend son départ ; `null` → jamais (contrôle, visiteur).
	  Chantier `palotins`, partie C (docs/wip/palotins-progress.md).
-->

<script lang="ts">
	import { computeTestScore } from '$lib/utils/test-score';
	import type { ClassroomItem, TestResult, TestAnswerResult } from '$lib/types/test';
	import type { AnswerData } from '$lib/types/question-display';
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte';
	import TestResults from './TestResults.svelte';
	import type { BuddyGainView } from '$lib/components/buddy/buddy-gain';
	import type { MathouNews } from '$lib/mathoux/news';
	import TestTimer from './TestTimer.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import { automathsQuitLink } from '$lib/navigation/return-links';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, LogIn } from '@lucide/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { slideFromRight, slideToLeft } from '$lib/transitions/slide-transition';
	import { isCourseCard } from '$lib/questions/types';
	import { createSeanceReactions } from '$lib/components/buddy/seance-reactions';
	import { buildSeriesTrace, type TraceRecorder } from '$lib/questions/series-trace';

	// Types
	interface Props {
		items: ClassroomItem[];
		isLoggedIn: boolean;
		loginNote?: boolean;
		onComplete: (result: TestResult) => void;
		onRestart: () => void;
		onBack: () => void;
		inEvaluation?: boolean;
		assessmentTitle?: string;
		collectOnly?: boolean;
		showResults?: boolean;
		buddyGain?: BuddyGainView | null;
		mathouNews?: MathouNews | null;
		palotinReactions?: { notionOf: (templateId: string) => string | null } | null;
		traceRecorder?: TraceRecorder | null;
	}

	// Constants
	/** Pause entre une validation et la question suivante */
	const ADVANCE_DELAY_MS = 300;

	let {
		items,
		isLoggedIn,
		loginNote = true,
		onComplete,
		onRestart,
		onBack,
		assessmentTitle,
		inEvaluation = false,
		collectOnly = false,
		showResults = true,
		buddyGain = null,
		mathouNews = null,
		palotinReactions = null,
		traceRecorder = null
	}: Props = $props();

	let backLabel = $derived(inEvaluation ? 'Mes contrôles' : 'Retour au panier');
	// « Quitter » : « Mes contrôles » (avec confirmation) en contrôle, le panier sinon
	const quit = $derived(
		automathsQuitLink({ inEvaluation, attemptOpen: collectOnly, timed: false })
	);

	// Variables
	let currentIndex = $state(0);
	let answers = new SvelteMap<number, AnswerData>();
	let testResult = $state<TestResult | null>(null);
	// Carte en cours : sa réponse tapée est validée à l'expiration du chrono
	let currentCard = $state<ReturnType<typeof QuestionCard>>();
	let pendingAdvance: ReturnType<typeof setTimeout> | undefined;
	// Réactions du Palotin : une série (Recommencer = nouveau composant)
	const seanceReactions = createSeanceReactions();
	let destroyed = false;

	const startTime = Date.now();
	// Affichage de la question en cours : début de sa durée de réponse
	let questionShownAt = Date.now();

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
		questionShownAt = Date.now();
	}

	/**
	 * Trace de la question (N9, N12) : envoyée dès la réponse, le verdict reste
	 * caché jusqu'à la fin de la série. Jamais en contrôle (`traceRecorder` nul).
	 */
	function recordTrace(index: number, answerData: AnswerData, endReason: 'validated' | 'timeout') {
		if (!traceRecorder || collectOnly) return;
		const item = items[index];
		const trace = buildSeriesTrace({
			place: 'mock_test',
			instance: item.instance,
			// Rien de tapé au temps écoulé : ratée, sans réponse
			answer: answerData,
			timing: {
				responseMs: Date.now() - questionShownAt,
				allottedMs: item.delaySeconds * 1000,
				endReason
			}
		});
		if (trace) traceRecorder.record(trace);
	}

	/**
	 * Le Palotin réagit-il à cette réponse ? `null` : non, la suite arrive
	 * aussitôt. Jamais en contrôle, ni sur une carte de cours (hors score).
	 */
	function reactTo(index: number, answerData: AnswerData): Promise<void> | null {
		const item = items[index];
		if (!palotinReactions || collectOnly || isCourseCard(item.instance)) return null;
		return seanceReactions.afterAnswer({
			correct: answerData.isCorrect,
			notionId: palotinReactions.notionOf(item.templateId),
			isLast: index + 1 >= items.length
		});
	}

	/** Lance `next` une fois le Palotin reparti (aussitôt s'il ne passe pas). */
	function afterReaction(waiting: Promise<void> | null, next: () => void) {
		if (!waiting) {
			next();
			return;
		}
		void waiting.then(() => {
			if (!destroyed) next();
		});
	}

	function handleAnswerSubmit(answerData: AnswerData) {
		const index = currentIndex;
		if (answers.has(index)) return;
		answers.set(index, answerData);
		recordTrace(index, answerData, 'validated');
		afterReaction(reactTo(index, answerData), () => {
			pendingAdvance = setTimeout(() => advanceFrom(index), ADVANCE_DELAY_MS);
		});
	}

	/**
	 * Chrono écoulé : réponse déjà validée → l'avance prévue suffit ; sinon ce
	 * qui est tapé est validé, et rien de tapé compte faux.
	 */
	function handleTimerComplete() {
		const index = currentIndex;
		if (answers.has(index)) return;

		const pending = currentCard?.submitPendingAnswer() ?? null;
		const answerData = pending ?? {
			value: '',
			isCorrect: false,
			timeSpent: items[index].delaySeconds,
			attempts: 0,
			submittedAt: new Date().toISOString()
		};
		answers.set(index, answerData);
		recordTrace(index, answerData, 'timeout');
		afterReaction(reactTo(index, answerData), () => advanceFrom(index));
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
		return () => {
			destroyed = true;
			clearTimeout(pendingAdvance);
		};
	});
</script>

<div class="space-y-6">
	{#if !isLoggedIn && loginNote}
		<div
			class="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
			role="note"
		>
			<LogIn class="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
			<p>Connecte-toi pour que tes réponses comptent dans tes révisions.</p>
		</div>
	{/if}

	{#if testResult && !showResults}
		<!-- Évaluation : la correction vient du serveur, la page l'affiche -->
		<Card.Root>
			<Card.Content class="p-6 text-center" role="status">
				<p class="text-muted-foreground">Envoi de ta copie…</p>
			</Card.Content>
		</Card.Root>
	{:else if testResult}
		<TestResults
			result={testResult}
			{onRestart}
			onBackToCart={onBack}
			{inEvaluation}
			{buddyGain}
			{mathouNews}
		/>
	{:else if currentItem}
		<!-- Header with progress -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div>
					<BackLink href={quit.href} label="Quitter" kind="quit" confirmLeave={quit.confirmLeave} />
					<div>
						<h1 class="text-2xl font-bold">
							{#if assessmentTitle}
								Contrôle : {assessmentTitle}
							{:else}
								Contrôle blanc
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
						{collectOnly}
						unitKeys={currentItem.unitKeys}
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
					{backLabel}
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
