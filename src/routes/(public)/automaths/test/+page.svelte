<script lang="ts">
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import { buildSeriesItems } from '$lib/questions/series-items';
	import { isCourseCard, seriesFormExcludesCourseCards } from '$lib/questions/course-card';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';
	import type { SeriesItem } from '$lib/validation/series';
	import type { ClassroomItem, TestMode, TestSession } from '$lib/types/test';
	import { AlertCircle } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Import test components
	import ClassroomSeries from '$lib/components/test/ClassroomSeries.svelte';
	import TestInteractive from '$lib/components/test/TestInteractive.svelte';
	import TestCourse from '$lib/components/test/TestCourse.svelte';
	import FlashSeries from '$lib/components/test/FlashSeries.svelte';
	import TypingSeries from '$lib/components/test/TypingSeries.svelte';
	import EvaluationResults from '$lib/components/test/EvaluationResults.svelte';
	import { resolveTestLaunch } from '$lib/utils/test-launch';
	import type { TestResult } from '$lib/types/test';
	import type {
		EvaluationStartResponse,
		EvaluationSubmitResponse
	} from '$lib/types/evaluation-attempt';
	import { toSubmission, type Submission } from '$lib/questions/submission';
	import { toDisplayInstance, unitKeysOf } from '$lib/questions/public-question';
	import { receiveBuddyGain, type BuddyGainView } from '$lib/components/buddy/buddy-gain';
	import { fetchMathouNews } from '$lib/components/mathoux/mathou-news';
	import type { MathouNews } from '$lib/mathoux/news';
	import { createTraceRecorder } from '$lib/questions/series-trace';

	let { data }: { data: PageData } = $props();

	// State
	let testSession = $state<TestSession | null>(null);
	// « En classe » et « Contrôle blanc » : chaque question porte sa durée et son modèle
	let seriesItems = $state<ClassroomItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let assignmentId = $state<string | null>(null);
	let assessmentTitle = $state<string | null>(null);

	// Évaluation notée (chantier 5, ADR 0015) : le SERVEUR tire, corrige et note.
	// La page ne reçoit que des questions publiques ; la correction arrive à l'envoi.
	/** Tentative en cours (null : entraînement libre ou aperçu du prof) */
	let attemptId = $state<string | null>(null);
	/** Rang de chaque question affichée dans la tentative */
	let attemptPositions = $state<number[]>([]);
	/** Touches d'unités de chaque question (calculées par le serveur) */
	let attemptUnitKeys = $state<(string[] | undefined)[]>([]);
	let evaluationResult = $state<EvaluationSubmitResponse | null>(null);
	/** Copie prête à (ré)envoyer si l'envoi a échoué */
	let pendingSubmission = $state<Submission | null>(null);
	let submitError = $state<string | null>(null);
	let isSubmitting = $state(false);
	/** Gain du Palotin de la dernière séance enregistrée (null : rien à montrer) */
	let buddyGain = $state<BuddyGainView | null>(null);
	/** Nouveautés de la Chatterie après la dernière séance enregistrée (null : rien à montrer) */
	let mathouNews = $state<MathouNews | null>(null);
	// Séance à qui revient la réponse attendue : une relance avant son arrivée la rend caduque
	let newsRequest = 0;
	/**
	 * Traces d'une série libre, question par question (ADR 0038, N9) : seulement
	 * pour un élève connecté hors contrôle (le serveur n'écrit rien pour un prof).
	 */
	const traceRecorder = createTraceRecorder();
	const seriesTraceRecorder = $derived(data.user && !assignmentId ? traceRecorder : null);

	/**
	 * Réactions du Palotin pendant le Contrôle blanc libre d'un élève connecté
	 * (chantier `palotins`, partie C) ; jamais en contrôle. La notion d'une
	 * question est celle de son modèle. Sans Palotin (prof, Palotin illisible),
	 * personne ne réagit et rien n'attend.
	 */
	const palotinReactions = $derived(
		data.user && !assignmentId
			? {
					notionOf: (templateId: string) =>
						questionTemplatesCache.templates.find((template) => template.id === templateId)
							?.classification_node_id ?? null
				}
			: null
	);

	/**
	 * Parse URL parameters and initialize test session
	 */
	async function initializeTest() {
		try {
			const launch = resolveTestLaunch(new URL(page.url).searchParams);

			if (launch.kind === 'error') {
				throw new Error(launch.message);
			}

			// Évaluation assignée : forme et temps limite viennent de l'ÉVALUATION,
			// le paramètre `mode` de l'URL est ignoré (B15). Jamais de flash-cards.
			if (launch.kind === 'assignment') {
				await startEvaluation(launch.assignmentId);
				return;
			}

			// Ancien lien de série sans forme : le serveur redirige déjà vers le
			// panier (Q46) ; filet pour une navigation qui ne passerait pas par lui
			if (launch.kind === 'cart') {
				await goto(launch.href, { replaceState: true });
				return;
			}

			startSeries(launch.mode, launch.lines, launch.timeLimit);
			isLoading = false;
		} catch (err) {
			console.error('Error initializing test:', err);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
			isLoading = false;
		}
	}

	/** Message d'erreur d'une réponse d'API (`error` ou `message`) */
	function errorMessageOf(body: unknown, fallback: string): string {
		if (body && typeof body === 'object') {
			if ('error' in body && typeof body.error === 'string') return body.error;
			if ('message' in body && typeof body.message === 'string') return body.message;
		}
		return fallback;
	}

	/**
	 * Ouvre une évaluation assignée : le serveur crée (ou reprend) la tentative et
	 * renvoie des questions SANS réponse (B6, B9). Aperçu du prof : questions
	 * générées ici, comme un entraînement libre, jamais rattachées.
	 */
	async function startEvaluation(id: string) {
		assignmentId = id;

		const response = await fetch(`/api/evaluations/assignments/${encodeURIComponent(id)}/start`, {
			method: 'POST'
		});
		const body: unknown = await response.json().catch(() => null);

		if (!response.ok) {
			throw new Error(errorMessageOf(body, "Impossible d'ouvrir le contrôle"));
		}

		const start = body as EvaluationStartResponse;
		assessmentTitle = start.evaluation.title;
		const form = start.evaluation.form;

		if (start.preview) {
			// Aperçu : les modèles sont chargés seulement maintenant (la page d'un
			// élève en évaluation n'en reçoit aucun)
			await questionTemplatesCache.fetchTemplates();
			seriesItems = generateSeriesItems(start.evaluation.items, { excludeCourseCards: true });
			testSession = {
				mode: form,
				items: start.evaluation.items,
				instances: seriesItems.map((item) => item.instance),
				userAnswers: new Map(),
				startTime: Date.now(),
				timeLimit: form === 'course' ? (start.evaluation.time_limit ?? undefined) : undefined,
				currentQuestionIndex: 0,
				isPaused: false
			};
			isLoading = false;
			return;
		}

		const { attempt } = start;
		attemptId = attempt.id;
		attemptPositions = attempt.questions.map((question) => question.position);
		attemptUnitKeys = attempt.questions.map(unitKeysOf);
		seriesItems = attempt.questions.map((question) => ({
			instance: toDisplayInstance(question),
			delaySeconds: question.delaySeconds,
			// Durée réglable par question : la tentative ne livre pas le modèle
			templateId: `position-${question.position}`,
			unitKeys: unitKeysOf(question)
		}));

		testSession = {
			mode: form,
			items: [],
			instances: seriesItems.map((item) => item.instance),
			userAnswers: new Map(),
			startTime: Date.now(),
			// Course : le temps RESTANT de la tentative (reprise comprise, B9)
			timeLimit:
				form === 'course'
					? Math.max(1, attempt.remainingSeconds ?? start.evaluation.time_limit ?? 300)
					: undefined,
			currentQuestionIndex: 0,
			isPaused: false
		};

		if (attempt.resumed) {
			toaster.info('Tu reprends ta tentative en cours : mêmes questions, réponses à retaper.');
		}
		isLoading = false;
	}

	/**
	 * Lance une série libre (panier ou lien) sous la forme choisie
	 */
	function startSeries(mode: TestMode, series: SeriesItem[], timeLimit?: number) {
		// Contrôle blanc, Course aux nombres : pas de carte de cours (non évaluable)
		const excludeCourseCards = seriesFormExcludesCourseCards(mode);
		const items = generateSeriesItems(series, { excludeCourseCards });
		// Série vide parce que toutes ses lignes sont des cartes : le dire (pas une panne)
		if (items.length === 0 && excludeCourseCards && onlyCourseCards(series)) {
			throw new Error(
				'Cette série ne contient que des cartes de cours, sans réponse à corriger : choisir la forme « En classe », « Flash » ou « Saisie ».'
			);
		}
		const instances = items.map((item) => item.instance);
		// « En classe », « Contrôle blanc » : chaque question garde sa durée et son modèle
		if (mode === 'display' || mode === 'interactive') seriesItems = items;

		testSession = {
			mode,
			items: series,
			instances,
			userAnswers: new Map(),
			startTime: Date.now(),
			timeLimit,
			currentQuestionIndex: 0,
			isPaused: false
		};
	}

	/** Toutes les lignes de la série sont-elles des cartes de cours ? */
	function onlyCourseCards(series: SeriesItem[]): boolean {
		const byId = new Map(
			questionTemplatesCache.templates.map((template) => [template.id, template])
		);
		return series.every((item) => {
			const template = byId.get(item.templateId);
			return template !== undefined && isCourseCard(template);
		});
	}

	/**
	 * Questions d'une série, chacune avec sa durée et son modèle
	 * (`buildSeriesItems`) ; modèles lus dans le cache de l'onglet.
	 */
	function generateSeriesItems(
		series: SeriesItem[],
		options: { excludeCourseCards?: boolean } = {}
	): ClassroomItem[] {
		const templates = questionTemplatesCache.templates;

		// Aucun modèle du tout (hors ligne, sans cache) : échec explicite
		if (templates.length === 0) {
			throw new Error(
				'Aucun modèle disponible. Veuillez vous reconnecter à Internet et recharger la page.'
			);
		}
		return buildSeriesItems(series, templates, options);
	}

	/**
	 * « En classe », « Contrôle blanc » : Recommencer tire de nouvelles questions
	 * (Contrôle blanc et évaluation : sans carte de cours)
	 */
	function handleSeriesRestart() {
		if (!testSession) return;
		buddyGain = null;
		mathouNews = null;
		newsRequest += 1;
		try {
			seriesItems = generateSeriesItems(testSession.items, {
				excludeCourseCards: !!assignmentId || seriesFormExcludesCourseCards(testSession.mode)
			});
			testSession.instances = seriesItems.map((item) => item.instance);
			testSession.startTime = Date.now();
		} catch (err) {
			// Hors ligne, cache vidé : dire pourquoi rien ne se passe
			toaster.error(
				err instanceof Error ? err.message : 'Impossible de tirer de nouvelles questions'
			);
		}
	}

	/**
	 * « Flash-cards », « Saisie » : Recommencer tire de nouvelles questions (cartes
	 * de cours comprises)
	 */
	function handleFlashRestart() {
		if (!testSession) return;
		buddyGain = null;
		mathouNews = null;
		newsRequest += 1;
		try {
			testSession.instances = generateSeriesItems(testSession.items).map((item) => item.instance);
			testSession.startTime = Date.now();
		} catch (err) {
			toaster.error(
				err instanceof Error ? err.message : 'Impossible de tirer de nouvelles questions'
			);
		}
	}

	/**
	 * Handle back to cart
	 */
	function handleBackToCart() {
		goto('/automaths/panier').then(() => {});
	}

	/**
	 * Évaluation : on revient à « Mes évaluations », jamais au panier (une
	 * nouvelle tentative y repasse par la vérification des tentatives)
	 */
	function handleBack() {
		if (assignmentId) {
			goto('/dashboard/student/assessments').then(() => {});
		} else {
			handleBackToCart();
		}
	}

	/**
	 * Copie notée affichée : l'URL devient celle des résultats de l'élève. Sinon
	 * un rechargement relancerait `start`, donc une nouvelle tentative.
	 */
	function showGradedCopy(copy: EvaluationSubmitResponse) {
		evaluationResult = copy;
		pendingSubmission = null;
		if (assignmentId) {
			replaceState(`/dashboard/student/assessments/${assignmentId}/results`, {});
		}
	}

	/** Envoie la copie : le serveur corrige, note et renvoie la correction (C10) */
	async function submitEvaluation() {
		if (!attemptId || !pendingSubmission || isSubmitting) return;
		isSubmitting = true;
		submitError = null;
		try {
			const response = await fetch(
				`/api/evaluations/attempts/${encodeURIComponent(attemptId)}/submit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(pendingSubmission)
				}
			);
			const body: unknown = await response.json().catch(() => null);
			// Déjà terminée (un envoi précédent a abouti, sa réponse s'est perdue) :
			// la copie déjà notée, reconstruite par le serveur ; à défaut, ses résultats
			if (response.status === 409) {
				const copy =
					body && typeof body === 'object' && 'result' in body
						? (body.result as EvaluationSubmitResponse | null)
						: null;
				if (copy) {
					showGradedCopy(copy);
				} else if (assignmentId) {
					await goto(`/dashboard/student/assessments/${assignmentId}/results`);
				}
				return;
			}
			if (!response.ok) {
				submitError = errorMessageOf(body, "Ta copie n'a pas pu être envoyée.");
				return;
			}
			showGradedCopy(body as EvaluationSubmitResponse);
		} catch {
			submitError = "Ta copie n'a pas pu être envoyée. Vérifie ta connexion et réessaie.";
		} finally {
			isSubmitting = false;
		}
	}

	function handleRetrySubmit() {
		submitEvaluation().then(() => {});
	}

	/**
	 * Fin de série : contrôle → envoi de la copie ; série libre → dernières
	 * traces, puis gain du Palotin
	 */
	async function handleTestComplete(result: TestResult) {
		// Nouvelle fin de séance : le gain précédent ne vaut plus
		buddyGain = null;
		mathouNews = null;
		newsRequest += 1;
		const request = newsRequest;
		// Évaluation notée : rien n'est corrigé ici, la copie part au serveur
		if (attemptId) {
			pendingSubmission = toSubmission(attemptPositions, result.answers);
			await submitEvaluation();
			return;
		}
		// Visiteur non connecté : rien à enregistrer (l'API répondrait 401) ; les formes
		// le disent à l'écran. Aperçu d'un contrôle par le prof : rien non plus.
		if (!data.user || assignmentId) return;

		// Traces envoyées question par question : attendre les dernières (E1),
		// le gain et les nouvelles de la Chatterie lisent l'acquisition à jour
		const { failed } = await traceRecorder.settle();
		if (failed > 0) {
			toaster.warning("Certaines réponses n'ont pas été enregistrées.");
		}

		// Flash-cards : auto-évaluées, aucun gain (et aucune séance écrite, N13).
		// Saisie : corrigée par l'appli, gain comme le Contrôle blanc (David, 2026-11-11)
		if (result.mode !== 'interactive' && result.mode !== 'course' && result.mode !== 'typing') {
			return;
		}

		// Fin de série : le gain du Palotin seulement (plus de séance libre, N13)
		try {
			const response = await fetch('/api/tests/save', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					result,
					items: testSession?.items || []
				})
			});

			if (response.ok) {
				// Gain du Palotin : montré sur l'écran de résultats, widget mis à jour.
				// Une série relancée entre-temps ne reçoit pas le gain de la précédente.
				const gain = await receiveBuddyGain(await response.json());
				if (request !== newsRequest) return;
				buddyGain = gain;
				// La Chatterie a-t-elle du nouveau ?
				const news = await fetchMathouNews();
				if (request === newsRequest) mathouNews = news;
			} else {
				// Les réponses sont déjà enregistrées : seul le gain manque
				console.error('Failed to compute buddy gain:', await response.text());
			}
		} catch (error) {
			console.error('Error computing buddy gain:', error);
		}
	}

	// Initialize on mount
	onMount(async () => {
		// Évaluation assignée : aucun modèle n'est chargé (le serveur tire les
		// questions ; l'aperçu du prof les chargera lui-même)
		if (!new URL(page.url).searchParams.has('assignment')) {
			// Modèles : cache de l'onglet, lu une fois (déjà là si on vient du catalogue
			// ou du panier ; sinon lu maintenant, lien de série ouvert directement)
			await questionTemplatesCache.fetchTemplates();
		}

		// Initialize test after cache is ready
		await initializeTest();
	});
</script>

<svelte:head>
	<title>Test - Automaths | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	{#if isLoading}
		<!-- Loading state -->
		<Card.Root>
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<div class="mb-4 animate-spin text-primary">
						<svg
							class="mx-auto h-12 w-12"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
					<h2 class="text-xl font-semibold">Préparation du test...</h2>
					<p class="mt-2 text-sm text-muted-foreground">Génération des questions en cours</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<!-- Error state -->
		<Card.Root class="border-destructive">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<AlertCircle class="mx-auto mb-4 h-16 w-16 text-destructive" />
					<h2 class="text-xl font-semibold text-destructive">Erreur</h2>
					<p class="mt-2 text-sm text-muted-foreground">{error}</p>
					<Button onclick={handleBack} class="mt-6">
						{assignmentId ? 'Mes contrôles' : 'Retour au panier'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if evaluationResult}
		<!-- Évaluation envoyée : correction, points et note du SERVEUR -->
		<EvaluationResults result={evaluationResult} title={assessmentTitle ?? undefined} />
	{:else if submitError}
		<Card.Root class="border-destructive">
			<Card.Content class="flex min-h-64 items-center justify-center p-12">
				<div class="text-center" role="alert">
					<AlertCircle class="mx-auto mb-4 h-12 w-12 text-destructive" />
					<p class="font-semibold">{submitError}</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Tes réponses sont gardées sur cette page tant que tu ne la quittes pas.
					</p>
					<div class="mt-6 flex justify-center gap-3">
						<Button onclick={handleRetrySubmit} disabled={isSubmitting}>Réessayer l'envoi</Button>
						<Button variant="outline" onclick={handleBack}>Mes contrôles</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if testSession}
		<!-- Test content -->
		{#if testSession.mode === 'display'}
			<!-- Forme « En classe » -->
			<ClassroomSeries
				items={seriesItems}
				onBack={handleBackToCart}
				onRestart={handleSeriesRestart}
			/>
		{:else if testSession.mode === 'interactive'}
			<!-- Forme « Contrôle blanc » : nouvelles questions = nouveau composant -->
			{#key seriesItems}
				<TestInteractive
					items={seriesItems}
					isLoggedIn={!!data.user}
					onComplete={handleTestComplete}
					onRestart={handleSeriesRestart}
					onBack={handleBack}
					assessmentTitle={assignmentId ? assessmentTitle || undefined : undefined}
					inEvaluation={!!assignmentId}
					collectOnly={!!attemptId}
					showResults={!attemptId}
					{buddyGain}
					{mathouNews}
					{palotinReactions}
					traceRecorder={seriesTraceRecorder}
				/>
			{/key}
		{:else if testSession.mode === 'course'}
			<!-- Course mode -->
			<TestCourse
				session={testSession}
				onComplete={handleTestComplete}
				onBack={handleBack}
				inEvaluation={!!assignmentId}
				collectOnly={!!attemptId}
				showResults={!attemptId}
				unitKeys={attemptUnitKeys}
				{buddyGain}
				{mathouNews}
				traceRecorder={seriesTraceRecorder}
			/>
		{:else if testSession.mode === 'flash' && !assignmentId}
			<!-- Forme « Flash-cards » : nouvelles questions = nouveau composant -->
			{#key testSession.instances}
				<FlashSeries
					instances={testSession.instances}
					isLoggedIn={!!data.user}
					onComplete={handleTestComplete}
					onRestart={handleFlashRestart}
					onBack={handleBackToCart}
					traceRecorder={seriesTraceRecorder}
				/>
			{/key}
		{:else if testSession.mode === 'typing' && !assignmentId}
			<!-- Forme « Saisie » : nouvelles questions = nouveau composant -->
			{#key testSession.instances}
				<TypingSeries
					instances={testSession.instances}
					isLoggedIn={!!data.user}
					onComplete={handleTestComplete}
					onRestart={handleFlashRestart}
					onBack={handleBackToCart}
					traceRecorder={seriesTraceRecorder}
					{buddyGain}
					{mathouNews}
				/>
			{/key}
		{/if}
	{/if}
</div>
