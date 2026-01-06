<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Copy, ChevronDown, AlertCircle, Lightbulb, TrendingUp, Loader2 } from 'lucide-svelte';
	import type { CalculationResult } from '$lib/stores/calculator.svelte';
	import StepsDisplay from './StepsDisplay.svelte';
	import {
		generateSteps,
		canGenerateSteps,
		suggestLevel,
		type StepGenerationResult,
		type SchoolLevel
	} from '$lib/mathAST/step-generator';
	import { parseCustomSafe } from '$lib/mathAST/parser/custom';

	interface Props {
		result: CalculationResult;
		onCopy?: () => void;
		onPlot?: (expression: string) => void;
		schoolLevel?: SchoolLevel;
	}

	let { result, onCopy, onPlot, schoolLevel = 'college' }: Props = $props();

	/**
	 * Check if the result is plottable (contains a free variable 'x')
	 * Simple heuristic: check if output contains 'x' as a variable
	 */
	function isPlottable(): boolean {
		if (result.isError) return false;
		const output = result.output;
		// Check for 'x' as a standalone variable (not part of exp, max, etc.)
		// Match x that is not preceded/followed by letters
		return /(?<![a-zA-Z])x(?![a-zA-Z])/.test(output);
	}

	function handlePlot() {
		if (onPlot) {
			onPlot(result.output);
		}
	}

	// State for steps
	let showSteps = $state(false);
	let stepsResult = $state<StepGenerationResult | null>(null);
	let stepsError = $state<string | null>(null);
	let isGeneratingSteps = $state(false);

	/**
	 * Check if steps can be generated for this result
	 */
	function canShowSteps(): boolean {
		if (result.isError) return false;
		// Commands start with '.' - can't generate steps for them
		if (result.input.trim().startsWith('.')) return false;
		return true;
	}

	/**
	 * Toggle steps display and generate if needed
	 */
	async function toggleSteps() {
		if (showSteps) {
			showSteps = false;
			return;
		}

		// Generate steps if not already done
		if (!stepsResult && !stepsError) {
			isGeneratingSteps = true;
			try {
				// Parse the input expression
				const parseResult = parseCustomSafe(result.input);
				if (!parseResult.ast) {
					stepsError = 'Impossible de parser cette expression';
				} else if (!canGenerateSteps(parseResult.ast)) {
					stepsError = "Pas d'étapes pour ce calcul simple";
				} else {
					// Suggest level based on complexity or use provided level
					const level = schoolLevel || suggestLevel(parseResult.ast);
					stepsResult = generateSteps(parseResult.ast, { level });
				}
			} catch (err) {
				stepsError = 'Erreur lors de la génération des étapes';
				console.error('Step generation error:', err);
			} finally {
				isGeneratingSteps = false;
			}
		}

		showSteps = true;
	}

	// Handle copy action
	async function handleCopy() {
		if (onCopy) {
			onCopy();
		} else {
			// Default: copy the output to clipboard
			try {
				await navigator.clipboard.writeText(result.output);
			} catch (err) {
				console.error('Failed to copy to clipboard:', err);
			}
		}
	}
</script>

{#if result.isError}
	<!-- Error display -->
	<div
		class={cn(
			'flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4',
			'text-destructive'
		)}
		role="alert"
	>
		<div class="flex items-center gap-2">
			<AlertCircle class="h-5 w-5 shrink-0" />
			<span class="font-medium">{result.errorMessage || 'Erreur de calcul'}</span>
		</div>

		{#if result.output && result.output !== result.errorMessage}
			<div class="flex items-start gap-2 text-sm text-muted-foreground">
				<Lightbulb class="mt-0.5 h-4 w-4 shrink-0" />
				<span>{result.output}</span>
			</div>
		{/if}
	</div>
{:else}
	<!-- Success display -->
	<div
		class={cn(
			'flex items-center justify-between gap-4 rounded-lg border border-border',
			'bg-card p-4 text-card-foreground'
		)}
	>
		<!-- Result -->
		<div class="flex min-w-0 flex-1 items-center gap-3">
			<span class="shrink-0 text-lg font-medium text-muted-foreground">=</span>
			<div class="min-w-0 flex-1 overflow-x-auto">
				<!-- LaTeX output - using font-mono for now, will be replaced by proper LaTeX rendering -->
				<span class="font-mono text-lg">{result.output}</span>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex shrink-0 items-center gap-1">
			<!-- Plot button (only for plottable expressions) -->
			{#if onPlot && isPlottable()}
				<Button
					variant="ghost"
					size="sm"
					onclick={handlePlot}
					class="gap-1 text-muted-foreground hover:text-foreground"
					aria-label="Tracer la courbe"
				>
					<TrendingUp class="h-4 w-4" />
					<span class="hidden sm:inline">Tracer</span>
				</Button>
			{/if}

			<!-- Steps button -->
			{#if canShowSteps()}
				<Button
					variant="ghost"
					size="sm"
					onclick={toggleSteps}
					disabled={isGeneratingSteps}
					class="gap-1 text-muted-foreground hover:text-foreground"
					aria-label="Afficher les etapes de calcul"
					aria-expanded={showSteps}
				>
					{#if isGeneratingSteps}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<ChevronDown class={cn('h-4 w-4 transition-transform', showSteps && 'rotate-180')} />
					{/if}
					<span class="hidden sm:inline">Étapes</span>
				</Button>
			{/if}

			<!-- Copy button -->
			<Button
				variant="ghost"
				size="icon"
				onclick={handleCopy}
				class="text-muted-foreground hover:text-foreground"
				aria-label="Copier le resultat"
			>
				<Copy class="h-4 w-4" />
			</Button>
		</div>
	</div>

	<!-- Steps panel -->
	{#if showSteps}
		<div class="mt-2 rounded-lg border border-border bg-muted/50 p-4">
			{#if stepsError}
				<p class="text-sm text-muted-foreground italic">{stepsError}</p>
			{:else if stepsResult}
				<StepsDisplay steps={stepsResult.steps} level={stepsResult.level} />
			{:else}
				<p class="text-sm text-muted-foreground">Chargement des étapes...</p>
			{/if}
		</div>
	{/if}
{/if}
