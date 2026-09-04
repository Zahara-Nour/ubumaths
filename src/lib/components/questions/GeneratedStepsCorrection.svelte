<!--
	GeneratedStepsCorrection
	========================

	Renders a pre-computed `RenderedStep[]` produced by the mathAST pedagogical
	pipelines (`pedagogical-arithmetic` / `pedagogical-solve/linear`). Used by
	`CorrectionCard.svelte` when an instance carries Mode B steps
	(`correction._renderedSteps`).

	V1 layout (passive) :
	- Vertical numbered list, one block per step.
	- Each block shows the rule's title (per-level vocabulary already baked
	  into the RenderedStep by the pedagogical renderer).
	- The transformation `\begin{aligned}...\end{aligned}` LaTeX is rendered
	  via the existing MarkdownRenderer wrapped in `$$...$$`.
	- Explanations are displayed only when `verbosity === 'detailed'` AND the
	  step actually carries one.
	- SubSteps render recursively, indented one level deeper.

	Props :
	- `steps`        — the pre-rendered steps to display
	- `verbosity?`   — `'summarized' | 'detailed'` (default `'detailed'`)

	@module components/questions/GeneratedStepsCorrection
-->
<script lang="ts">
	import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
	import { MarkdownRenderer } from '$lib/components/markdown';

	interface Props {
		steps: readonly RenderedStep[];
		verbosity?: 'summarized' | 'detailed';
	}

	let { steps, verbosity = 'detailed' }: Props = $props();
</script>

{#snippet stepBlock(step: RenderedStep, index: number, depth: number)}
	<li class="generated-step" class:nested={depth > 0}>
		<div class="step-header">
			<span class="step-number">Étape {index + 1}</span>
			<span class="step-title">{step.title}</span>
		</div>

		{#if step.expressionLatex}
			<div class="step-expression">
				<MarkdownRenderer content={`$$${step.expressionLatex}$$`} />
			</div>
		{/if}

		{#if verbosity === 'detailed' && step.explanation}
			<div class="step-explanation">{step.explanation}</div>
		{/if}

		{#if step.subSteps && step.subSteps.length > 0}
			<ol class="generated-substeps">
				{#each step.subSteps as sub, j (sub.id)}
					{@render stepBlock(sub, j, depth + 1)}
				{/each}
			</ol>
		{/if}
	</li>
{/snippet}

{#if steps.length > 0}
	<ol class="generated-steps">
		{#each steps as step, i (step.id)}
			{@render stepBlock(step, i, 0)}
		{/each}
	</ol>
{/if}

<style>
	.generated-steps {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.generated-step {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-left: 3px solid hsl(var(--primary) / 0.5);
		background: color-mix(in srgb, var(--color-muted) 30%, transparent);
		border-radius: 0 0.375rem 0.375rem 0;
	}

	.generated-step.nested {
		margin-left: 1.25rem;
		border-left-color: hsl(var(--muted-foreground) / 0.4);
	}

	.step-header {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.step-number {
		font-weight: 600;
		color: hsl(var(--primary));
		font-size: 0.875rem;
	}

	.step-title {
		font-weight: 500;
	}

	.step-expression {
		overflow-x: auto;
		padding: 0.25rem 0;
	}

	.step-explanation {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.generated-substeps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0 0;
	}
</style>
