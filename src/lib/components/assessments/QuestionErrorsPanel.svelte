<!--
	QuestionErrorsPanel
	===================
	Erreurs de la classe sur UNE question (un modèle) : sans réponse, cases ratées,
	réponses fausses ou partielles regroupées (même énoncé tiré ET même réponse),
	chacune rendue comme la correction de l'élève. Les noms des élèves sont rendus
	en texte. Chantier `erreurs-frequentes` : bilan d'un contrôle (PR 1) et
	erreurs par point du programme (PR 2). Chantier `type-erreur` (PR 2) : compte
	des cases fausses par type d'erreur, et type de chaque réponse quand il est reconnu.
	Chantier `idees-format` (idée 3) : les erreurs prévues par l'auteur y comptent
	sous leur nom, formules (`$…$`) rendues comme dans la remarque de l'élève.
	Idée 4 : un groupe posé en QCM depuis ses erreurs prévues porte « en QCM ».

	Props:
	- errors: erreurs d'une question, déjà lues (statut `ok`)
-->

<script lang="ts">
	import CorrectionCard from '#lib/components/questions/CorrectionCard.svelte';
	import InlineMarkdown from '#lib/components/markdown/InlineMarkdown.svelte';
	import { blankErrorKindLabel } from '#lib/questions/error-kinds.ts';
	import { remarkSegments } from '#lib/questions/expected-result-markdown.ts';
	import type {
		EvaluationQuestionErrors,
		QuestionErrorGroup
	} from '#lib/types/evaluation-breakdown.ts';
	import type { TestAnswerResult } from '#lib/types/test.ts';

	interface Props {
		errors: Extract<EvaluationQuestionErrors, { status: 'ok' }>;
	}

	let { errors }: Props = $props();

	function answerResultOf(group: QuestionErrorGroup): TestAnswerResult {
		return {
			index: 0,
			instance: group.instance,
			isCorrect: false,
			userAnswer: {
				value: group.values,
				isCorrect: false,
				timeSpent: 0,
				attempts: 1,
				submittedAt: ''
			}
		};
	}

	/** « Erreur de signe : 4 · Puissance de 10 : 2 · Non reconnue : 6 » */
	let kindCounts = $derived([
		...errors.errorKinds.map((c) => `${c.label} : ${c.count}`),
		...(errors.unrecognized > 0 ? [`Non reconnue : ${errors.unrecognized}`] : [])
	]);

	/** Étiquette du type de chaque case typée ; numérotée sur une question à plusieurs cases */
	function kindLabelsOf(group: QuestionErrorGroup): string[] {
		const several = (group.instance.blanks?.length ?? 0) > 1;
		return group.errorKinds.map((kind) =>
			several ? `Case ${kind.blank} : ${blankErrorKindLabel(kind)}` : blankErrorKindLabel(kind)
		);
	}

	function pluralize(n: number, one: string, many: string): string {
		return `${n} ${n > 1 ? many : one}`;
	}
</script>

<!-- Texte d'un nom d'erreur prévue : ses formules `$…$` rendues, le reste en texte -->
{#snippet withMath(text: string, before = '')}
	{before}{#each remarkSegments(text) as segment, j (j)}
		{#if segment.math}<InlineMarkdown content={segment.value} />{:else}{segment.value}{/if}
	{/each}
{/snippet}

<div class="space-y-4 py-3">
	{#if errors.withoutAnswer > 0}
		<p class="text-sm text-muted-foreground">{errors.withoutAnswer} sans réponse</p>
	{/if}
	{#if errors.blanks.length > 0}
		<ul class="text-sm">
			{#each errors.blanks as stat (stat.blank)}
				<li>
					Case {stat.blank} : {pluralize(stat.errors, 'erreur', 'erreurs')} sur {stat.answers}
				</li>
			{/each}
		</ul>
	{/if}
	{#if errors.errorKinds.length > 0}
		<p class="text-sm" data-testid="error-kind-counts">
			<span class="font-medium">Types d'erreur :</span>
			<!-- Chaque compte rendu à part : un `$` isolé ne s'apparie pas avec le nom suivant -->
			{#each kindCounts as text, i (i)}{@render withMath(text, i > 0 ? ' · ' : '')}{/each}
		</p>
	{/if}
	{#if errors.groups.length === 0}
		<p class="text-sm text-muted-foreground">Aucune erreur sur cette question.</p>
	{:else}
		<div class="grid gap-4 lg:grid-cols-2">
			{#each errors.groups as group, index (index)}
				<div class="space-y-2">
					<p class="text-sm font-medium">
						{#if group.students.length > 1}
							{group.students.length} élèves ont répondu ainsi :
						{/if}
						{group.students.join(', ')}
					</p>
					{#if group.errorKinds.length > 0 || group.asChoice}
						<div class="flex flex-wrap gap-1">
							{#if group.asChoice}
								<span
									class="rounded-full border px-2 py-0.5 text-xs font-medium"
									data-testid="as-choice">en QCM</span
								>
							{/if}
							{#if group.errorKinds.length > 0}
								<span class="contents" data-testid="error-kinds">
									{#each kindLabelsOf(group) as label (label)}
										<span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
											>{@render withMath(label)}</span
										>
									{/each}
								</span>
							{/if}
						</div>
					{/if}
					<CorrectionCard answerResult={answerResultOf(group)} verdict={group.verdict} size="sm" />
				</div>
			{/each}
		</div>
	{/if}
</div>
