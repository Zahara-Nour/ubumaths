<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Copy, ChevronDown, AlertCircle, Lightbulb } from 'lucide-svelte';
	import type { CalculationResult } from '$lib/stores/calculator.svelte';

	interface Props {
		result: CalculationResult;
		onCopy?: () => void;
	}

	let { result, onCopy }: Props = $props();

	// State for steps expansion (disabled for now)
	let showSteps = $state(false);

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
			<!-- Steps button (disabled for Phase 5) -->
			<Button
				variant="ghost"
				size="sm"
				disabled
				onclick={() => (showSteps = !showSteps)}
				class="gap-1 text-muted-foreground"
				aria-label="Afficher les etapes de calcul"
				aria-expanded={showSteps}
			>
				<ChevronDown class={cn('h-4 w-4 transition-transform', showSteps && 'rotate-180')} />
				<span class="hidden sm:inline">Etapes</span>
			</Button>

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

	<!-- Steps panel (placeholder for Phase 5) -->
	{#if showSteps}
		<div class="mt-2 rounded-lg border border-border bg-muted/50 p-4">
			<p class="text-sm text-muted-foreground">Les etapes de calcul seront disponibles bientot.</p>
		</div>
	{/if}
{/if}
