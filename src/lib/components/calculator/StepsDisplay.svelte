<script lang="ts">
	import { cn } from '$lib/utils';
	import { ChevronRight } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { CalculationStep, SchoolLevel } from '$lib/mathAST/step-generator';
	import StepsDisplay from './StepsDisplay.svelte';

	interface Props {
		steps: readonly CalculationStep[];
		level: SchoolLevel;
		class?: string;
	}

	let { steps, level, class: className }: Props = $props();

	// Track which sub-steps are expanded
	let expandedSteps = new SvelteSet<number>();

	function toggleStep(index: number) {
		if (expandedSteps.has(index)) {
			expandedSteps.delete(index);
		} else {
			expandedSteps.add(index);
		}
	}

	// Get level label in French
	function getLevelLabel(l: SchoolLevel): string {
		switch (l) {
			case 'primaire':
				return 'Primaire';
			case 'college':
				return 'Collège';
			case 'lycee':
				return 'Lycée';
			case 'superieur':
				return 'Supérieur';
		}
	}
</script>

<div class={cn('flex flex-col gap-3', className)}>
	<!-- Level indicator -->
	<div class="flex items-center justify-between text-xs text-muted-foreground">
		<span>Étapes de calcul</span>
		<span class="rounded-full bg-muted px-2 py-0.5">
			Niveau : {getLevelLabel(level)}
		</span>
	</div>

	<!-- Steps list -->
	{#if steps.length === 0}
		<p class="text-sm text-muted-foreground italic">Aucune étape intermédiaire pour ce calcul.</p>
	{:else}
		<ol class="flex flex-col gap-2">
			{#each steps as step (step.index)}
				<li class="flex flex-col gap-1">
					<!-- Step header -->
					<div class="flex items-start gap-2">
						<!-- Step number -->
						<span
							class={cn(
								'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
								'bg-primary/10 text-xs font-medium text-primary'
							)}
						>
							{step.index}
						</span>

						<!-- Step content -->
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<!-- Description -->
							<span class="text-sm font-medium text-foreground">
								{step.description}
							</span>

							<!-- Expression (LaTeX) -->
							<code
								class={cn('block rounded bg-muted px-2 py-1 font-mono text-sm', 'text-foreground')}
							>
								{step.expression}
							</code>

							<!-- Explanation (for lower levels) -->
							{#if step.explanation}
								<p class="text-xs text-muted-foreground italic">
									{step.explanation}
								</p>
							{/if}

							<!-- Sub-steps toggle -->
							{#if step.subSteps && step.subSteps.length > 0}
								<button
									type="button"
									class={cn(
										'mt-1 flex items-center gap-1 text-xs text-muted-foreground',
										'hover:text-foreground'
									)}
									onclick={() => toggleStep(step.index)}
									aria-expanded={expandedSteps.has(step.index)}
								>
									<ChevronRight
										class={cn(
											'h-3 w-3 transition-transform',
											expandedSteps.has(step.index) && 'rotate-90'
										)}
									/>
									<span>
										{expandedSteps.has(step.index) ? 'Masquer' : 'Voir'} le détail
									</span>
								</button>

								<!-- Sub-steps (collapsible) -->
								{#if expandedSteps.has(step.index)}
									<div class="mt-2 ml-4 border-l-2 border-muted pl-3">
										<StepsDisplay steps={step.subSteps} {level} class="gap-2" />
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</div>
