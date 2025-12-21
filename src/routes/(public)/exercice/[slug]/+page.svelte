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
	import { Button } from '$lib/components/ui/button';
	import MySelect from '$lib/components/MySelect.svelte';
	import ExerciseDisplay from '$lib/components/exercises/ExerciseDisplay.svelte';
	import { generateExerciseInstance } from '$lib/exercises/generator/instance-generator';
	import { isVariationsExercise } from '$lib/exercises/types';
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
	let selectedVariationIndex = $state(getDefaultVariationIndex());
	let currentSeed = $state(data.initialSeed ?? Math.floor(Math.random() * 1000000));
	let linkCopied = $state(false);
	let isPdfLoading = $state(false);

	// ============================================================================
	// VARIATION LOGIC
	// ============================================================================

	const hasVariations = $derived(isVariationsExercise(data.exercise));
	const variationOptions = $derived(getVariationOptions());
	const hasVariables = $derived(data.exercise.variables && data.exercise.variables.length > 0);
	// isParameterized is true if there are variables OR variations (affects link sharing)
	const isParameterized = $derived(hasVariables || hasVariations);

	/**
	 * Get default variation index based on priority order
	 * Priority: URL param > autonomous > intermediate > guided > index 0
	 */
	function getDefaultVariationIndex(): number {
		if (!data.exercise.variations?.length) return 0;

		// Priority order for automatic selection
		const priorityOrder = ['autonomous', 'intermediate', 'guided'];

		// If URL param provided, use it
		if (data.initialVariation) {
			const idx = data.exercise.variations.findIndex((v) => v.label === data.initialVariation);
			if (idx !== -1) return idx;
		}

		// Find highest priority available
		for (const label of priorityOrder) {
			const idx = data.exercise.variations.findIndex((v) => v.label === label);
			if (idx !== -1) return idx;
		}

		return 0;
	}

	/**
	 * Build variation options for select component
	 */
	function getVariationOptions(): { value: string; label: string }[] {
		if (!hasVariations || !data.exercise.variations) return [];
		return data.exercise.variations.map((v, i) => ({
			value: i.toString(),
			label: getVariationDisplayLabel(v.label)
		}));
	}

	/**
	 * Convert variation label to French display text
	 */
	function getVariationDisplayLabel(label: string): string {
		const labels: Record<string, string> = {
			autonomous: 'Version Autonome',
			intermediate: 'Version Intermédiaire',
			guided: 'Version Guidée'
		};
		return labels[label] || label;
	}

	// ============================================================================
	// SHAREABLE LINK
	// ============================================================================

	/**
	 * Generate shareable link with current state
	 */
	function getShareableLink(): string {
		const base = page.url.origin + page.url.pathname;
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
	 * Handle variation change
	 */
	function handleVariationChange(value: string) {
		selectedVariationIndex = parseInt(value, 10);
		// Update URL
		const url = new URL(window.location.href);
		if (data.exercise.variations?.[selectedVariationIndex]) {
			url.searchParams.set('variation', data.exercise.variations[selectedVariationIndex].label);
		}
		history.replaceState({}, '', url.toString());
	}

	// ============================================================================
	// PDF DOWNLOAD
	// ============================================================================

	/**
	 * Download exercise as PDF
	 */
	async function downloadPdf() {
		isPdfLoading = true;
		try {
			// Generate Typst content
			const typstResult = await generateExerciseTypst({
				exercise: data.exercise,
				variationIndex: selectedVariationIndex,
				seed: currentSeed,
				includeSolution: showSolution,
				includeMetadata: true
			});

			if (!typstResult.success || !typstResult.typstContent) {
				toaster.error(typstResult.error || 'Erreur lors de la génération du PDF');
				return;
			}

			// Compile to PDF using TypstService
			const service = getTypstService();
			await service.initialize();

			const compileResult = await service.compileWithPriority(
				typstResult.typstContent,
				{ format: 'pdf' },
				PRIORITY.URGENT
			);

			if (!compileResult.success || !compileResult.data) {
				toaster.error(compileResult.error || 'Erreur lors de la compilation PDF');
				return;
			}

			// Download the PDF
			const blob = new Blob([compileResult.data as Uint8Array], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${data.exercise.slug || data.exercise.id}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toaster.success('PDF téléchargé !');
		} catch (error) {
			toaster.error('Erreur lors de la génération du PDF');
			console.error('PDF generation error:', error);
		} finally {
			isPdfLoading = false;
		}
	}

	// ============================================================================
	// DERIVED EXERCISE DATA
	// ============================================================================

	/**
	 * Build effective exercise for display
	 * Handles variation selection and variable resolution
	 */
	const effectiveExercise = $derived.by(() => {
		if (!hasVariations || !data.exercise.variations) {
			return data.exercise;
		}

		// Generate instance with selected variation and seed
		const result = generateExerciseInstance(data.exercise, {
			seed: currentSeed,
			variationIndex: selectedVariationIndex
		});

		if (result.success && result.instance) {
			// Return a modified exercise with resolved content
			return {
				...data.exercise,
				statement_md: result.instance.statement_md,
				solution_md: result.instance.solution_md
			};
		}

		// Fallback to base exercise if generation fails
		return data.exercise;
	});
</script>

<svelte:head>
	<title>{data.exercise.title || 'Exercice'} | UbuMaths</title>
	<meta
		name="description"
		content={data.exercise.statement_md.slice(0, 160).replace(/[#*$]/g, '')}
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<Button variant="ghost" href="/">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour à l'accueil
		</Button>

		<!-- Action buttons -->
		<div class="flex items-center gap-2">
			{#if hasVariables}
				<Button
					onclick={regenerate}
					variant="outline"
					size="sm"
					title="Générer de nouvelles valeurs"
				>
					<RefreshCw class="mr-2 h-4 w-4" />
					Régénérer
				</Button>
			{/if}
			<Button
				onclick={downloadPdf}
				variant="outline"
				size="sm"
				title="Télécharger en PDF"
				disabled={isPdfLoading}
			>
				{#if isPdfLoading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Génération...
				{:else}
					<Download class="mr-2 h-4 w-4" />
					PDF
				{/if}
			</Button>
			<Button onclick={copyLink} variant="outline" size="sm" title="Copier le lien partageable">
				{#if linkCopied}
					<Check class="mr-2 h-4 w-4 text-green-600" />
					Copié !
				{:else}
					<Link class="mr-2 h-4 w-4" />
					Copier le lien
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

					{#if data.exercise.topic}
						<p class="mt-1 text-sm text-muted-foreground">{data.exercise.topic}</p>
					{/if}

					{#if data.exercise.tags && data.exercise.tags.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each data.exercise.tags as tag, idx (idx)}
								<span class="rounded bg-secondary px-2 py-1 text-xs">{tag}</span>
							{/each}
						</div>
					{/if}

					<!-- Exercise metadata -->
					<div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
						<span>
							Difficulté :
							{#if data.exercise.difficulty === 1}
								Facile
							{:else if data.exercise.difficulty === 2}
								Moyen
							{:else}
								Difficile
							{/if}
						</span>

						{#if data.exercise.grade_levels && data.exercise.grade_levels.length > 0}
							<span>Niveaux : {data.exercise.grade_levels.join(', ')}</span>
						{/if}

						{#if data.exercise.source}
							<span>Source : {data.exercise.source}</span>
						{/if}
					</div>
				</div>

				<!-- Variation selector -->
				{#if hasVariations && variationOptions.length > 1}
					<div class="sm:min-w-48">
						<label class="mb-1 block text-sm font-medium text-muted-foreground">Version</label>
						<MySelect
							type="single"
							value={selectedVariationIndex.toString()}
							items={variationOptions}
							onValueChange={handleVariationChange}
							placeholder="Sélectionner une version"
						/>
					</div>
				{/if}
			</div>
		</Card.Header>

		<Card.Content>
			<!-- Exercise content -->
			{#if hasVariations}
				<!-- For variations exercises, we use the effective exercise with resolved variation -->
				<ExerciseDisplay exercise={effectiveExercise} mode="instance" bind:showSolution />
			{:else}
				<!-- Standard exercise display -->
				<ExerciseDisplay exercise={data.exercise} mode="instance" bind:showSolution />
			{/if}
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
