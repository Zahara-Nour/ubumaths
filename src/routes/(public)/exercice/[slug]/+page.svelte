<script lang="ts">
	/**
	 * Public Exercise Viewer
	 *
	 * Enhanced public page for viewing exercises with:
	 * - Variation selector (autonomous > intermediate > guided)
	 * - Seed-based instance generation for sharing
	 * - Copy link button with current state
	 * - PDF export via Typst
	 * - Show/hide solution toggle
	 */
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import { isVariationsExercise, getExerciseContentSafe } from '$lib/exercises/types';
	import { formatGradeForDisplay } from '$lib/utils/grades';
	import type { GradeCode } from '$lib/types/grades';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { generateExerciseTypst } from '$lib/exercises/typst/exercise-typst-generator';
	import { getTypstService, PRIORITY } from '$lib/typst/service';
	import type { PageData } from './$types';

	// Icons
	import Check from 'lucide-svelte/icons/check';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Link from 'lucide-svelte/icons/link';
	import Download from 'lucide-svelte/icons/download';
	import Loader2 from 'lucide-svelte/icons/loader-2';

	let { data }: { data: PageData } = $props();

	// ============================================================================
	// STATE
	// ============================================================================

	let showSolution = $state(false);
	let currentSeed = $state(data.initialSeed ?? Math.floor(Math.random() * 1000000));
	let linkCopied = $state(false);
	let isPdfLoading = $state(false);
	let showPdfDialog = $state(false);

	// ============================================================================
	// VARIATION LOGIC
	// ============================================================================

	/**
	 * Difficulty order: hardest first (autonomous > intermediate > guided)
	 * Unknown labels are placed at the end
	 */
	const DIFFICULTY_ORDER: Record<string, number> = {
		autonomous: 0,
		intermediate: 1,
		guided: 2
	};

	/**
	 * French display labels for variation types
	 */
	const VARIATION_LABELS: Record<string, string> = {
		autonomous: 'Boss',
		intermediate: 'Scout',
		guided: 'Rookie'
	};

	const hasVariations = $derived(isVariationsExercise(data.exercise));
	const hasVariables = $derived(data.exercise.variables && data.exercise.variables.length > 0);
	// isParameterized is true if there are variables OR variations (affects link sharing)
	const isParameterized = $derived(hasVariables || hasVariations);

	// Meta description for SEO
	const metaDescription = $derived(
		getExerciseContentSafe(data.exercise).statement_md.slice(0, 160).replace(/[#*$]/g, '')
	);

	/**
	 * Sort variations by difficulty (hardest first)
	 */
	function getSortedVariations() {
		if (!data.exercise.variations?.length) return [];

		return data.exercise.variations
			.map((v, originalIndex) => ({
				label: v.label,
				displayLabel: VARIATION_LABELS[v.label] || v.label,
				originalIndex,
				difficulty: DIFFICULTY_ORDER[v.label] ?? 999
			}))
			.sort((a, b) => a.difficulty - b.difficulty);
	}

	/**
	 * Get default slider position based on URL param or default to hardest (0)
	 */
	function getDefaultSliderPosition(): number {
		if (!data.exercise.variations?.length) return 0;

		const sorted = getSortedVariations();

		// If URL param provided, find its position in sorted list
		if (data.initialVariation) {
			const pos = sorted.findIndex((v) => v.label === data.initialVariation);
			if (pos !== -1) return pos;
		}

		// Default to hardest (first position = 0)
		return 0;
	}

	// Sorted variations with original indices (hardest first)
	const sortedVariations = $derived(getSortedVariations());

	// Slider position (0 = hardest, max = easiest)
	let sliderValue = $state<number[]>([getDefaultSliderPosition()]);

	// Map slider position to actual variation index
	const selectedVariationIndex = $derived(sortedVariations[sliderValue[0]]?.originalIndex ?? 0);

	// ============================================================================
	// SHAREABLE LINK
	// ============================================================================

	/**
	 * Generate shareable link with current state
	 */
	function getShareableLink(): string {
		const base = page.url.origin + page.url.pathname;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive context
		const params = new URLSearchParams();

		// Add variation param if exercise has variations
		if (hasVariations && data.exercise.variations?.[selectedVariationIndex]) {
			params.set('variation', data.exercise.variations[selectedVariationIndex].label);
		}

		// Add seed for parameterized exercises
		if (isParameterized) {
			params.set('seed', currentSeed.toString());
		}

		// Preserve token if present
		const token = page.url.searchParams.get('token');
		if (token) {
			params.set('token', token);
		}

		const queryString = params.toString();
		return queryString ? `${base}?${queryString}` : base;
	}

	/**
	 * Copy link to clipboard with visual feedback
	 */
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(getShareableLink());
			linkCopied = true;
			toaster.success('Lien copié dans le presse-papiers !');
			setTimeout(() => {
				linkCopied = false;
			}, 2000);
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}

	/**
	 * Regenerate exercise with new seed
	 */
	function regenerate() {
		currentSeed = Math.floor(Math.random() * 1000000);
		// Update URL without full navigation
		const url = new URL(window.location.href);
		url.searchParams.set('seed', currentSeed.toString());
		history.replaceState({}, '', url.toString());
	}

	/**
	 * Update URL when slider position changes
	 */
	$effect(() => {
		if (typeof window === 'undefined') return;
		const variation = sortedVariations[sliderValue[0]];
		if (!variation) return;

		const url = new URL(window.location.href);
		url.searchParams.set('variation', variation.label);
		history.replaceState({}, '', url.toString());
	});

	// ============================================================================
	// PDF DOWNLOAD
	// ============================================================================

	/**
	 * Download exercise as PDF
	 */
	async function downloadPdf(includeSolution: boolean) {
		showPdfDialog = false;
		isPdfLoading = true;
		console.log('[PDF] Starting download', { includeSolution, exerciseId: data.exercise.id });

		try {
			// Generate Typst content
			console.log('[PDF] Generating Typst content...');
			const typstResult = await generateExerciseTypst({
				exercise: data.exercise,
				variationIndex: selectedVariationIndex,
				seed: currentSeed,
				includeSolution,
				includeMetadata: true
			});

			if (!typstResult.success || !typstResult.typstContent) {
				console.error('[PDF] Typst generation failed', typstResult.error);
				toaster.error(typstResult.error || 'Erreur lors de la génération du PDF');
				return;
			}

			console.log('[PDF] Typst content generated', {
				length: typstResult.typstContent.length,
				preview: typstResult.typstContent.slice(0, 200)
			});

			// Compile to PDF using TypstService
			console.log('[PDF] Initializing TypstService...');
			const service = getTypstService();
			await service.initialize();
			console.log('[PDF] TypstService initialized');

			console.log('[PDF] Compiling to PDF...');
			const compileResult = await service.compileWithPriority(
				typstResult.typstContent,
				{ format: 'pdf' },
				PRIORITY.URGENT
			);

			if (!compileResult.success || !compileResult.data) {
				console.error('[PDF] Compilation failed', compileResult.error);
				toaster.error(compileResult.error || 'Erreur lors de la compilation PDF');
				return;
			}

			console.log('[PDF] Compilation successful', {
				pdfSize: (compileResult.data as Uint8Array).length
			});

			// Download the PDF
			const pdfData = compileResult.data as Uint8Array;
			const blob = new Blob([new Uint8Array(pdfData)], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${data.exercise.slug || data.exercise.id}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			console.log('[PDF] Download triggered');
			toaster.success('PDF téléchargé !');
		} catch (error) {
			console.error('[PDF] Error during PDF generation:', error);
			toaster.error('Erreur lors de la génération du PDF');
		} finally {
			isPdfLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.exercise.title || 'Exercice'} | UbuMaths</title>
	<meta name="description" content={metaDescription} />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<Button variant="ghost" href="/" class="self-start">
			<ArrowLeft class="h-4 w-4 sm:mr-2" />
			<span class="sr-only sm:not-sr-only">Retour à l'accueil</span>
		</Button>

		<!-- Action buttons -->
		<div class="flex flex-wrap items-center gap-2">
			{#if hasVariables}
				<Button
					onclick={regenerate}
					variant="outline"
					size="sm"
					title="Générer de nouvelles valeurs"
				>
					<RefreshCw class="h-4 w-4 sm:mr-2" />
					<span class="sr-only sm:not-sr-only">Régénérer</span>
				</Button>
			{/if}
			<Button
				onclick={() => (showPdfDialog = true)}
				variant="outline"
				size="sm"
				title="Télécharger en PDF"
				disabled={isPdfLoading}
			>
				{#if isPdfLoading}
					<Loader2 class="h-4 w-4 animate-spin sm:mr-2" />
					<span class="sr-only sm:not-sr-only">Génération...</span>
				{:else}
					<Download class="h-4 w-4 sm:mr-2" />
					<span class="sr-only sm:not-sr-only">PDF</span>
				{/if}
			</Button>
			<Button onclick={copyLink} variant="outline" size="sm" title="Copier le lien partageable">
				{#if linkCopied}
					<Check class="h-4 w-4 text-green-600 sm:mr-2" />
					<span class="sr-only sm:not-sr-only">Copié !</span>
				{:else}
					<Link class="h-4 w-4 sm:mr-2" />
					<span class="sr-only sm:not-sr-only">Copier</span>
				{/if}
			</Button>
		</div>
	</div>

	<!-- Exercise Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex-1">
					<Card.Title class="text-2xl">{data.exercise.title || 'Exercice'}</Card.Title>

					<!-- Exercise metadata -->
					<div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
						{#if data.exercise.grades && data.exercise.grades.length > 0}
							<span
								>Niveaux : {data.exercise.grades
									.map((g) => formatGradeForDisplay(g as GradeCode))
									.join(', ')}</span
							>
						{/if}
					</div>
				</div>

				<!-- Variation slider -->
				{#if hasVariations && sortedVariations.length > 1}
					<div class="w-full sm:w-72">
						<div class="relative">
							<Slider
								bind:value={sliderValue}
								min={0}
								max={sortedVariations.length - 1}
								step={1}
								class="w-full"
							/>
							<!-- Tick marks -->
							<div
								class="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[6px]"
							>
								{#each sortedVariations as _, i (i)}
									<div
										class="h-2 w-0.5 rounded-full {sliderValue[0] === i
											? 'bg-primary'
											: 'bg-muted-foreground/30'}"
									></div>
								{/each}
							</div>
						</div>
						<!-- Labels for each level -->
						<div class="mt-2 flex justify-between">
							{#each sortedVariations as variation, i (i)}
								<button
									type="button"
									onclick={() => (sliderValue = [i])}
									class="text-xs transition-colors {sliderValue[0] === i
										? 'font-semibold text-primary'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									{variation.displayLabel}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Exercise content with variation and seed control -->
			<ExerciseDisplay
				exercise={data.exercise}
				mode="instance"
				bind:showSolution
				variationIndex={selectedVariationIndex}
				seed={currentSeed}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Share info footer -->
	<div class="mt-6 text-center">
		<p class="text-sm text-muted-foreground">
			{#if data.hasToken}
				<span class="inline-flex items-center gap-1">
					<span
						class="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200"
					>
						Accès via lien partagé
					</span>
				</span>
			{:else if data.exercise.is_public}
				<span class="inline-flex items-center gap-1">
					<span
						class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-200"
					>
						Exercice public
					</span>
				</span>
			{/if}
		</p>
		{#if isParameterized}
			<p class="mt-2 text-xs text-muted-foreground/70">
				Seed: {currentSeed}
			</p>
		{/if}
	</div>
</div>

<!-- PDF Download Dialog -->
<Dialog.Root bind:open={showPdfDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Télécharger en PDF</Dialog.Title>
			<Dialog.Description>Voulez-vous inclure la correction dans le PDF ?</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={() => downloadPdf(false)} class="w-full sm:w-auto">
				Sans correction
			</Button>
			<Button onclick={() => downloadPdf(true)} class="w-full sm:w-auto">Avec correction</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
