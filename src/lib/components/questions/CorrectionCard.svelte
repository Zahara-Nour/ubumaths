<!--
	CorrectionCard Component
	========================

	Carte de correction des résultats (Entraînement, Course aux nombres,
	Évaluation), retournable. Lot 2 du résultat attendu (R13, ADR 0017) :

	- Recto : statut global (juste / ½ point / faux, barème de l'évaluation même
	  en entraînement, Q105), énoncé (s'il n'est pas déjà rempli dans le résultat
	  attendu ; comparaison R1 : sa consigne seule, Q104), puis le résultat attendu
	  (`ExpectedResultView`) — remplace « Votre réponse » / « Réponse correcte ».
	- Verso : la correction, concise ↔ détaillée (`CorrectionView`) ; étapes
	  générées (mode B) inchangées.

	Verdict : celui du SERVEUR s'il est fourni (évaluation notée, `verdict`),
	sinon recalculé ici depuis l'instance et la réponse (entraînement).

	Props:
	- answerResult: TestAnswerResult - Complete answer data
	- verdict?: DetailedVerdict - verdict détaillé du serveur (évaluation)
	- questionNumber: number (optional) - Question number for display
	- size: 'sm' | 'md' | 'lg' - Card size variant
-->

<script lang="ts">
	import type { TestAnswerResult } from '$lib/types/test';
	import { getQuestionType } from '$lib/questions/types';
	import { buildExpectedResult } from '$lib/questions/expected-result';
	import {
		filledMarkdown,
		expectedOnlyMarkdown,
		solutionMarkdown
	} from '$lib/questions/expected-result-markdown';
	import {
		globalVerdictOf,
		instructionOf,
		studentAnswerFromAnswerData,
		trainingStatus
	} from '$lib/questions/correction-card-verdict';
	import { validateAnswerDetailed, type DetailedVerdict } from '$lib/utils/answer-validator';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { templateGenericFunctions } from '$lib/questions/generic-functions';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { RotateCw, Check, X, TriangleAlert } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import GeneratedStepsCorrection from './GeneratedStepsCorrection.svelte';
	import ExpectedResultView from './ExpectedResultView.svelte';
	import CorrectionView from './CorrectionView.svelte';

	// Props
	interface Props {
		answerResult: TestAnswerResult;
		/** Verdict détaillé du serveur (évaluation notée) : jamais recalculé ici */
		verdict?: DetailedVerdict;
		questionNumber?: number;
		size?: 'sm' | 'md' | 'lg';
	}

	let { answerResult, verdict, questionNumber, size = 'md' }: Props = $props();

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Flip state
	let isFlipped = $state(false);

	// Height management (FlipCard-style)
	let frontHeight = $state(0);
	let backHeight = $state(0);
	let maxViewportHeight = $state(0);

	// Element references for height measurement
	let frontElement: HTMLElement | null = null;
	let backElement: HTMLElement | null = null;

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const currentHeight = $derived(
		Math.min(Math.max(frontHeight, backHeight), maxViewportHeight || 10000)
	);

	const isScrollable = $derived(Math.max(frontHeight, backHeight) > maxViewportHeight);

	const instance = $derived(answerResult.instance);
	// Fonctions déclarées par le modèle (`P(x)`) : notation des formules `~…~`
	const genericFunctions = $derived(templateGenericFunctions(instance.genericFunctions));
	const isCourseCard = $derived(getQuestionType(instance) === 'course_card');

	// Réponse de l'élève, telle que le validateur la lit (absente : réponse vide)
	const studentAnswer = $derived(studentAnswerFromAnswerData(instance, answerResult.userAnswer));
	// Verdict du serveur, sinon recalculé (entraînement : statut global du barème
	// de l'évaluation, Q105) ; carte de cours : auto-évaluation
	const detailedVerdict = $derived.by((): DetailedVerdict | undefined => {
		if (verdict) return verdict;
		if (isCourseCard) return undefined;
		return {
			...validateAnswerDetailed(instance, studentAnswer),
			status: trainingStatus(instance, studentAnswer)
		};
	});
	const expected = $derived(
		isCourseCard ? null : buildExpectedResult(instance, studentAnswer, detailedVerdict)
	);
	const globalVerdict = $derived(detailedVerdict ? globalVerdictOf(detailedVerdict.status) : null);

	// Comparaison R1 (Q104) : la consigne seule, sans la formule à case vide
	const isComparison = $derived(
		expected?.lines.some((l) => l.kind === 'comparison' || l.kind === 'solution') ?? false
	);
	const instruction = $derived(isComparison ? instructionOf(instance.statement) : '');
	// L'énoncé rempli tient lieu d'énoncé ; sinon (QCM, attendu seul) on le montre
	const showStatement = $derived(
		!isComparison &&
			!expected?.lines.some((l) => l.kind === 'filled-statement' || l.kind === 'your-answer')
	);

	// Mode A — explicit author-written steps win over Mode B (generated) when both
	// are present, per the design decision : explicit > implicit.
	const hasModeASteps = $derived((instance.correction?.steps?.length ?? 0) > 0);

	const renderedSteps = $derived(instance.correction?._renderedSteps);
	const useGeneratedSteps = $derived(
		!hasModeASteps && renderedSteps !== undefined && renderedSteps.length > 0
	);
	const correctFeedback = $derived(instance.correction?.feedback?.correct);

	// Correction écrite (mode A) : concise ↔ détaillée par CorrectionView (ADR 0017)
	const correctionMarkdown = $derived.by(() => {
		const correction = instance.correction;
		if (!correction) return '';
		return [
			...(correction.steps ?? []),
			...(correction.feedback?.correct ? [correction.feedback.correct] : [])
		].join('\n\n');
	});

	// Réponse attendue seule (R9) : ce que montre la vue concise si tout est détail (D6)
	const expectedAnswerMarkdown = $derived.by(() => {
		if (isCourseCard) return '';
		return buildExpectedResult(instance)
			.lines.flatMap((line) => {
				if (line.kind === 'filled-statement') return [filledMarkdown(line.markdown, line.fills)];
				// Calcul R1 : `3 + 5 = 8` encadré
				if (line.kind === 'solution') return [solutionMarkdown(line.lhs, line.latex, true)];
				if (line.kind === 'expected-only') return [expectedOnlyMarkdown(line.value, line.context)];
				return [];
			})
			.join('\n\n');
	});

	// ============================================================================
	// INITIALIZATION
	// ============================================================================

	// Calculate max viewport height
	$effect(() => {
		if (typeof window !== 'undefined') {
			maxViewportHeight = window.innerHeight * 0.8; // 80vh
		}
	});

	// Measure front and back heights using ResizeObserver
	$effect(() => {
		if (!frontElement || !backElement) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === frontElement) {
					frontHeight = entry.contentRect.height;
				} else if (entry.target === backElement) {
					backHeight = entry.contentRect.height;
				}
			}
		});

		observer.observe(frontElement);
		observer.observe(backElement);

		return () => {
			observer.disconnect();
		};
	});

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	/**
	 * Handle flip button click
	 */
	function handleFlip() {
		isFlipped = !isFlipped;
	}

	// ============================================================================
	// SIZE CLASSES
	// ============================================================================

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl'
	};
</script>

<!-- Correction Card Component -->
<div class={cn('correction-card-wrapper mx-auto w-full', sizeClasses[size])}>
	<!-- Flip container -->
	<div
		class="flip-container"
		class:flipped={isFlipped}
		style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'}; perspective: 1000px;"
	>
		<div
			class="flip-inner"
			class:flipped={isFlipped}
			style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
		>
			<!-- ===================== FRONT FACE ===================== -->
			<div
				bind:this={frontElement}
				class={cn('flip-face flip-front', isScrollable && 'scrollable')}
				inert={isFlipped}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<div class="flex items-center justify-between gap-2">
							<Card.Title>
								{#if questionNumber !== undefined}
									Question {questionNumber}
								{:else}
									Correction
								{/if}
							</Card.Title>

							{#if isCourseCard}
								<Badge variant={answerResult.isCorrect ? 'default' : 'secondary'}>
									{answerResult.isCorrect ? 'Je savais' : 'À revoir'}
								</Badge>
							{:else if globalVerdict}
								<span
									class="verdict-badge verdict-{globalVerdict.kind}"
									data-testid="global-verdict"
									data-kind={globalVerdict.kind}
								>
									{#if globalVerdict.kind === 'correct'}
										<Check class="h-3.5 w-3.5" aria-hidden="true" />
									{:else if globalVerdict.kind === 'half'}
										<TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
									{:else}
										<X class="h-3.5 w-3.5" aria-hidden="true" />
									{/if}
									{globalVerdict.label}
								</span>
							{/if}
						</div>
					</Card.Header>

					<Card.Content class="space-y-4 pb-16">
						{#if showStatement}
							<div
								class="statement-content rounded-lg border bg-muted/30 p-4"
								data-testid="statement"
							>
								<MarkdownRenderer content={instance.statement} inputsDisabled {genericFunctions} />
							</div>
						{:else if instruction}
							<div data-testid="instruction">
								<MarkdownRenderer content={instruction} />
							</div>
						{/if}

						{#if isCourseCard}
							<!-- Carte de cours : la « réponse » est une auto-évaluation -->
							<p class="font-medium">
								Auto-évaluation : {answerResult.isCorrect ? 'je savais' : 'je ne savais pas'}
							</p>
						{:else if expected}
							<ExpectedResultView result={expected} />
						{/if}

						<!-- Stats -->
						{#if answerResult.timeSpent !== undefined || answerResult.attempts !== undefined}
							<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
								{#if answerResult.timeSpent !== undefined}
									<span>Temps : {answerResult.timeSpent} s</span>
								{/if}
								{#if answerResult.attempts !== undefined}
									<span>Tentatives : {answerResult.attempts}</span>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Flip Button -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Voir la correction"
					title="Voir la correction"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>

			<!-- ===================== BACK FACE ===================== -->
			<div
				bind:this={backElement}
				class={cn('flip-face flip-back', isScrollable && 'scrollable')}
				inert={!isFlipped}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Correction</Card.Title>
					</Card.Header>

					<Card.Content class="pb-16">
						{#if useGeneratedSteps && renderedSteps}
							<div class="space-y-3 rounded-lg border bg-muted/50 p-4">
								<GeneratedStepsCorrection steps={renderedSteps} />
								{#if correctFeedback}
									<div class="mt-3 border-t pt-3">
										<MarkdownRenderer content={correctFeedback} {genericFunctions} />
									</div>
								{/if}
							</div>
						{:else if correctionMarkdown}
							<div class="rounded-lg border bg-muted/50 p-4">
								<CorrectionView
									markdown={correctionMarkdown}
									expectedAnswer={expectedAnswerMarkdown}
									{genericFunctions}
								/>
							</div>
						{:else}
							<div
								class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center"
							>
								<p class="text-muted-foreground">Aucune correction disponible.</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Flip Button (Back) -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Retour au résultat"
					title="Retour au résultat"
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	/* ============================================================================
	 * FLIP CONTAINER (3D Transforms)
	 * ============================================================================ */

	.flip-container {
		position: relative;
		width: 100%;
		perspective: 1000px;
	}

	.flip-inner {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		transition:
			transform 0.6s cubic-bezier(0.33, 1, 0.68, 1),
			height 0.6s cubic-bezier(0.33, 1, 0.68, 1);
	}

	.flip-inner.flipped {
		transform: rotateY(180deg);
	}

	.flip-face {
		position: absolute;
		width: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.flip-front {
		transform: rotateY(0deg);
	}

	.flip-back {
		transform: rotateY(180deg);
	}

	.flip-face.scrollable {
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--muted)) transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar {
		width: 8px;
	}

	.flip-face.scrollable::-webkit-scrollbar-track {
		background: transparent;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb {
		background: var(--color-muted);
		border-radius: 4px;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-muted-foreground) 50%, transparent);
	}

	/* ============================================================================
	 * FLIP BUTTON (Bottom-Right Corner)
	 * ============================================================================ */

	.flip-button {
		position: absolute;
		bottom: calc(1rem * var(--font-scale, 1));
		right: calc(1rem * var(--font-scale, 1));
		z-index: 10;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: calc(3rem * var(--font-scale, 1));
		height: calc(3rem * var(--font-scale, 1));
		border-radius: 50%;
		background: var(--color-primary);
		color: hsl(var(--primary-foreground));
		border: none;
		cursor: pointer;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.flip-button:hover:not(:disabled) {
		transform: scale(1.1) rotate(180deg);
		box-shadow:
			0 10px 15px rgba(0, 0, 0, 0.1),
			0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.flip-button:active:not(:disabled) {
		transform: scale(1.05) rotate(180deg);
	}

	.flip-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: var(--color-muted);
		color: hsl(var(--muted-foreground));
	}

	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	.statement-content {
		animation: fadeIn 0.3s ease-in-out;
	}

	/* Statut global : icône + texte (jamais la couleur seule) ; ambre pour ½ */
	.verdict-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border: 1px solid currentColor;
		border-radius: 9999px;
		padding: 0.125rem 0.625rem;
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.verdict-correct {
		color: light-dark(var(--color-green-700, #15803d), var(--color-green-400, #4ade80));
	}

	.verdict-half {
		color: light-dark(var(--color-amber-700, #b45309), var(--color-amber-400, #fbbf24));
	}

	.verdict-incorrect {
		color: light-dark(var(--color-red-700, #b91c1c), var(--color-red-400, #f87171));
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================================================
	 * FONT SCALING
	 * ============================================================================ */

	.correction-card-wrapper {
		font-size: calc(1rem * var(--font-scale, 1));
	}

	/* ============================================================================
	 * RESPONSIVE DESIGN
	 * ============================================================================ */

	@media (max-width: 640px) {
		.flip-button {
			width: calc(2.5rem * var(--font-scale, 1));
			height: calc(2.5rem * var(--font-scale, 1));
			bottom: calc(0.75rem * var(--font-scale, 1));
			right: calc(0.75rem * var(--font-scale, 1));
		}
	}
</style>
