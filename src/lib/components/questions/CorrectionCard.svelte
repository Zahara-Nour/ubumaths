<!--
	CorrectionCard Component
	========================

	Displays test answer corrections with flip mechanism for detailed explanations.
	Used in test results and review contexts.

	Features:
	- FlipCard-style 3D flip animation
	- Front: User answer vs Correct answer comparison
	- Back: Detailed correction/explanation
	- Collapsible statement section
	- Type-specific answer rendering
	- Visual feedback (colors, icons, badges)
	- Equal height management for front/back

	Props:
	- answerResult: TestAnswerResult - Complete answer data
	- questionNumber: number (optional) - Question number for display
	- size: 'sm' | 'md' | 'lg' - Card size variant
-->

<script lang="ts">
	import type { TestAnswerResult } from '$lib/types/test';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { RotateCw, Check, X, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	// Props
	interface Props {
		answerResult: TestAnswerResult;
		questionNumber?: number;
		size?: 'sm' | 'md' | 'lg';
	}

	let { answerResult, questionNumber, size = 'md' }: Props = $props();

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Flip state
	let isFlipped = $state(false);

	// Statement visibility state
	let showStatement = $state(false);

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

	const isCorrect = $derived(answerResult.isCorrect);

	// Markdown content - instance.statement and instance.correction are now ResolvedMarkdown (strings)
	const statementMarkdown = $derived(answerResult.instance.statement);
	// Build correction markdown from ResolvedCorrection object
	const correctionMarkdown = $derived.by(() => {
		const correction = answerResult.instance.correction;
		if (!correction) return '';
		const parts: string[] = [];
		if (correction.steps && correction.steps.length > 0) {
			parts.push(...correction.steps);
		}
		if (correction.feedback?.correct) {
			parts.push(correction.feedback.correct);
		}
		return parts.join('\n\n');
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

	/**
	 * Toggle statement visibility
	 */
	function toggleStatement() {
		showStatement = !showStatement;
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
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title>
								{#if questionNumber !== undefined}
									Question {questionNumber}
								{:else}
									Correction
								{/if}
							</Card.Title>

							{#if answerResult.userAnswer !== undefined}
								<Badge variant={isCorrect ? 'default' : 'destructive'}>
									{#if isCorrect}
										<Check class="mr-1 h-3 w-3" />
										Correct
									{:else}
										<X class="mr-1 h-3 w-3" />
										Incorrect
									{/if}
								</Badge>
							{/if}
						</div>
					</Card.Header>

					<Card.Content class="space-y-6">
						<!-- Statement (collapsible) -->
						<div class="statement-toggle">
							<Button
								variant="ghost"
								size="sm"
								onclick={toggleStatement}
								class="mb-2 w-full justify-between"
							>
								<span>{showStatement ? 'Masquer' : 'Voir'} l'énoncé</span>
								{#if showStatement}
									<ChevronUp class="h-4 w-4" />
								{:else}
									<ChevronDown class="h-4 w-4" />
								{/if}
							</Button>

							{#if showStatement}
								<div class="statement-content rounded-lg border bg-muted/30 p-4">
									<MarkdownRenderer content={statementMarkdown} />
								</div>
							{/if}
						</div>

						<!-- User Answer (only shown if user answered) -->
						{#if answerResult.userAnswer !== undefined}
							<div class="user-answer-section">
								<h3 class="mb-3 text-lg font-semibold">Votre réponse</h3>
								<div
									class={cn(
										'rounded-lg border-2 p-4',
										isCorrect
											? 'border-green-600 bg-green-100 dark:bg-green-950'
											: 'border-red-600 bg-red-100 dark:bg-red-950'
									)}
								>
									<!-- Type-specific rendering -->
									{#if answerResult.instance.type === 'fill_in_blanks' && Array.isArray(answerResult.userAnswer.value)}
										<ul class="space-y-1">
											{#each answerResult.userAnswer.value as value, i (i)}
												<li class="flex items-center gap-2">
													<code class="text-sm">{value}</code>
												</li>
											{/each}
										</ul>
									{:else if answerResult.instance.type === 'multiple_choice'}
										<ul class="space-y-1">
											{#if Array.isArray(answerResult.userAnswer.value)}
												{#each answerResult.userAnswer.value as index (index)}
													<li class="font-medium">{String.fromCharCode(65 + Number(index))}</li>
												{/each}
											{:else}
												<li class="font-medium">
													{String.fromCharCode(65 + Number(answerResult.userAnswer.value))}
												</li>
											{/if}
										</ul>
									{:else if Array.isArray(answerResult.userAnswer.value)}
										<ul class="space-y-1">
											{#each answerResult.userAnswer.value as val, i (i)}
												<li><MarkdownRenderer content={`$$${String(val)}$$`} /></li>
											{/each}
										</ul>
									{:else}
										<MarkdownRenderer content={`$$${String(answerResult.userAnswer.value)}$$`} />
									{/if}
								</div>
							</div>
						{/if}

						<!-- Correct Answer -->
						<div class="correct-answer-section">
							<h3 class="mb-3 text-lg font-semibold">Réponse correcte</h3>
							<div class="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-950">
								{#if Array.isArray(answerResult.instance.solution)}
									<ul class="space-y-1">
										{#each answerResult.instance.solution as ans, i (i)}
											<li><MarkdownRenderer content={`$$${String(ans)}$$`} /></li>
										{/each}
									</ul>
								{:else}
									<MarkdownRenderer content={`$$${String(answerResult.instance.solution)}$$`} />
								{/if}
							</div>
						</div>

						<!-- Stats -->
						{#if answerResult.timeSpent !== undefined || answerResult.attempts !== undefined}
							<div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
								{#if answerResult.timeSpent !== undefined}
									<span>⏱️ Temps : {answerResult.timeSpent}s</span>
								{/if}
								{#if answerResult.attempts !== undefined}
									<span>🔄 Tentatives : {answerResult.attempts}</span>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Flip Button -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label={isFlipped ? 'Retour aux réponses' : 'Voir la correction détaillée'}
					title={isFlipped ? 'Retour aux réponses' : 'Voir la correction détaillée'}
				>
					<RotateCw class="h-5 w-5" />
				</button>
			</div>

			<!-- ===================== BACK FACE ===================== -->
			<div
				bind:this={backElement}
				class={cn('flip-face flip-back', isScrollable && 'scrollable')}
				style="height: {currentHeight > 0 ? currentHeight + 'px' : 'auto'};"
			>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title>Correction détaillée</Card.Title>
					</Card.Header>

					<Card.Content>
						{#if correctionMarkdown}
							<div class="space-y-3 rounded-lg border bg-muted/50 p-4">
								<MarkdownRenderer content={correctionMarkdown} />
							</div>
						{:else}
							<div
								class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center"
							>
								<p class="text-muted-foreground">Aucune correction détaillée disponible.</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Flip Button (Back) -->
				<button
					class="flip-button"
					onclick={handleFlip}
					aria-label="Retour aux réponses"
					title="Retour aux réponses"
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
		background: hsl(var(--muted));
		border-radius: 4px;
	}

	.flip-face.scrollable::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--muted-foreground) / 0.5);
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
		background: hsl(var(--primary));
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
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
	}

	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	.statement-toggle,
	.user-answer-section,
	.correct-answer-section {
		animation: fadeIn 0.3s ease-in-out;
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
