<!--
	ExpectedResultView
	==================

	Décor écran du résultat attendu (chantier « résultat attendu », lot 2, R13) :
	rend la structure de `buildExpectedResult` ligne par ligne.

	- comparaison `3 + 5 ≠ 9` (rouge) / `3 + 5 = 8` encadré vert / forme ambre ;
	- solution `= 8` encadrée, énoncé rempli (solutions en vert), « Ta réponse : »
	  (chaque case colorée selon son statut), QCM, remarques, attendu seul,
	  « Tu n'as rien répondu. ».

	Le statut n'est jamais porté par la couleur seule : chaque ligne colorée a son
	libellé en toutes lettres (« juste », « forme à améliorer », « faux »).

	SÉCURITÉ (audit PR #643) : toute valeur math est rendue en formule
	(`expected-result-markdown`) ; la réponse de l'élève en texte et les
	remarques sont des nœuds texte, jamais du markdown.

	Couleurs : variables `--expected-*` posées ici, à partir des tokens.
-->
<script lang="ts">
	import { Check, X, TriangleAlert, Info } from '@lucide/svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { choiceLetter } from '$lib/questions/choices';
	import type {
		ExpectedChoice,
		ExpectedFill,
		ExpectedResult,
		ExpectedStatus
	} from '$lib/questions/expected-result';
	import {
		EXPECTED_STATUS_LABEL,
		alignedComparisonMarkdown,
		comparisonMarkdown,
		expectedOnlyMarkdown,
		filledMarkdown,
		remarkSegments,
		solutionMarkdown
	} from '$lib/questions/expected-result-markdown';

	interface Props {
		result: ExpectedResult;
		class?: string;
	}

	let { result, class: className = '' }: Props = $props();

	const hasComparison = $derived(result.lines.some((l) => l.kind === 'comparison'));
	// R1 faux / forme : la solution rejoint la comparaison dans UN bloc aligné
	// sur la relation (façon TinyMath) ; elle n'a plus de ligne à elle
	const mergedSolution = $derived.by(() => {
		if (!hasComparison) return undefined;
		const found = result.lines.find((l) => l.kind === 'solution');
		return found?.kind === 'solution' ? found : undefined;
	});

	/** Libellé d'un choix de QCM, selon son statut et s'il est coché */
	function choiceLabel(choice: ExpectedChoice): string {
		if (choice.status === 'correct') return 'coché, juste';
		if (choice.status === 'incorrect') return 'coché à tort';
		if (choice.status === 'unoptimal') return 'bonne réponse oubliée';
		if (choice.status === 'solution') return 'bonne réponse';
		return choice.checked ? 'coché' : '';
	}

	/** Statut de chaque case remplie par l'élève, en toutes lettres */
	function fillStatuses(fills: readonly ExpectedFill[]): string {
		return fills.map((f) => `case ${f.index + 1} : ${EXPECTED_STATUS_LABEL[f.status]}`).join(' · ');
	}

	function toneClass(status: ExpectedStatus): string {
		return `tone-${status}`;
	}
</script>

{#snippet statusTag(status: ExpectedStatus)}
	{#if EXPECTED_STATUS_LABEL[status]}
		<span class="status-tag {toneClass(status)}" data-status-label>
			{#if status === 'correct' || status === 'solution'}
				<Check class="h-3.5 w-3.5" aria-hidden="true" />
			{:else if status === 'unoptimal'}
				<TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
			{:else if status === 'incorrect'}
				<X class="h-3.5 w-3.5" aria-hidden="true" />
			{/if}
			{EXPECTED_STATUS_LABEL[status]}
		</span>
	{/if}
{/snippet}

<div class="expected-result space-y-3 {className}" data-testid="expected-result">
	{#each result.lines as line, i (i)}
		{#if line.kind === 'comparison'}
			<div class="line-row" data-kind="comparison" data-status={line.answer.status}>
				{#if mergedSolution}
					<!-- Bloc aligné : défile seul s'il est trop long (téléphone, tuile) -->
					<span class="aligned-block" data-aligned>
						<InlineMarkdown
							content={alignedComparisonMarkdown(
								line.lhs,
								line.relation,
								line.answer,
								mergedSolution.latex
							)}
						/>
					</span>
				{:else}
					<InlineMarkdown content={comparisonMarkdown(line.lhs, line.relation, line.answer)} />
				{/if}
				<!-- Statut en toutes lettres, hors formule (accessibilité) -->
				{@render statusTag(line.relation === '≠' ? 'incorrect' : line.answer.status)}
			</div>
			{#if mergedSolution?.possible}
				<p class="line-label">La réponse encadrée n'est qu'une réponse possible.</p>
			{/if}
		{:else if line.kind === 'solution' && mergedSolution}
			<!-- Déjà rendue dans le bloc aligné de la comparaison -->
		{:else if line.kind === 'solution'}
			<div class="line-row" data-kind="solution" data-status="solution">
				{#if line.possible}<span class="line-label">Une réponse possible :</span>{/if}
				<InlineMarkdown content={solutionMarkdown(line.lhs, line.latex, !hasComparison)} />
			</div>
		{:else if line.kind === 'filled-statement'}
			<div data-kind="filled-statement" data-status="solution">
				{#if line.possible}<p class="line-label">Une réponse possible :</p>{/if}
				<MarkdownRenderer content={filledMarkdown(line.markdown, line.fills)} />
			</div>
		{:else if line.kind === 'your-answer'}
			<div class="your-answer" data-kind="your-answer">
				<p class="line-label">Ta réponse :</p>
				<MarkdownRenderer content={filledMarkdown(line.markdown, line.fills)} />
				<p class="text-xs text-muted-foreground" data-fill-statuses>{fillStatuses(line.fills)}</p>
			</div>
		{:else if line.kind === 'choices'}
			<ul class="space-y-2" data-kind="choices">
				{#each line.choices as choice, position (choice.originalIndex)}
					<li class="choice {toneClass(choice.status)}" data-status={choice.status}>
						<span class="font-semibold">{choiceLetter(position)}</span>
						<span class="choice-box" aria-hidden="true">{choice.checked ? '☑' : '☐'}</span>
						<span class="min-w-0 flex-1"><InlineMarkdown content={choice.content} /></span>
						{#if choiceLabel(choice)}
							<span class="status-tag {toneClass(choice.status)}">{choiceLabel(choice)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{:else if line.kind === 'remark'}
			<p class="remark" data-kind="remark">
				<Info class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
				<span>
					<span class="sr-only">Remarque : </span>
					{#each remarkSegments(line.text) as segment, j (j)}
						{#if segment.math}<InlineMarkdown content={segment.value} />{:else}{segment.value}{/if}
					{/each}
				</span>
			</p>
		{:else if line.kind === 'expected-only'}
			<div class="space-y-1" data-kind="expected-only" data-status="solution">
				<div class="line-row">
					<span class="line-label">
						{line.possible ? 'Une réponse possible :' : 'Réponse attendue :'}
					</span>
					<InlineMarkdown content={expectedOnlyMarkdown(line.value, line.context)} />
				</div>
				{#if line.studentAnswer !== undefined && line.studentStatus}
					<div class="line-row">
						<span class="line-label">Ta réponse :</span>
						<span class={toneClass(line.studentStatus)}>
							{line.studentAnswer === '' ? '……' : line.studentAnswer}
						</span>
						{@render statusTag(line.studentStatus)}
					</div>
				{/if}
			</div>
		{:else if line.kind === 'empty'}
			<p class="text-muted-foreground italic" data-kind="empty">{line.text}</p>
		{/if}
	{/each}
</div>

<style>
	/* Couleurs du résultat attendu, à partir des tokens (docs/ref/css-color-tokens.md) :
	   teintes foncées en clair, claires en sombre, pour un contraste suffisant */
	.expected-result {
		--expected-correct: light-dark(
			var(--color-green-700, #15803d),
			var(--color-green-400, #4ade80)
		);
		--expected-incorrect: light-dark(var(--color-red-700, #b91c1c), var(--color-red-400, #f87171));
		--expected-unoptimal: light-dark(
			var(--color-amber-700, #b45309),
			var(--color-amber-400, #fbbf24)
		);
		--expected-empty: var(--color-muted-foreground);
	}

	.line-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
	}

	.aligned-block {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
	}

	.line-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}

	.status-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.tone-correct,
	.tone-solution {
		color: var(--expected-correct);
	}

	.tone-incorrect {
		color: var(--expected-incorrect);
	}

	.tone-unoptimal {
		color: var(--expected-unoptimal);
	}

	.tone-empty {
		color: var(--expected-empty);
	}

	.your-answer {
		border-left: 3px solid var(--color-border);
		padding-left: 0.75rem;
	}

	.choice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.375rem 0.75rem;
		color: var(--color-foreground);
	}

	.choice.tone-correct,
	.choice.tone-solution {
		border-color: var(--expected-correct);
	}

	.choice.tone-incorrect {
		border-color: var(--expected-incorrect);
	}

	.choice.tone-unoptimal {
		border-color: var(--expected-unoptimal);
		border-style: dashed;
	}

	.choice-box {
		color: var(--color-muted-foreground);
	}

	.remark {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-foreground);
		border-left: 3px solid var(--expected-unoptimal);
		padding-left: 0.5rem;
	}
</style>
