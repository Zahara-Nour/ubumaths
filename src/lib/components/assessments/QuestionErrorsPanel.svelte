<!--
	QuestionErrorsPanel
	===================
	Erreurs de la classe sur UNE question (un modèle) : sans réponse, cases ratées,
	réponses fausses ou partielles regroupées (même énoncé tiré ET même réponse),
	chacune rendue comme la correction de l'élève. Les noms des élèves sont rendus
	en texte. Chantier `erreurs-frequentes` : bilan d'un contrôle (PR 1) et
	erreurs par point du programme (PR 2). Chantier `type-erreur` (PR 2) : compte
	des cases fausses par type d'erreur, et type de chaque réponse quand il est reconnu.

	Props:
	- errors: erreurs d'une question, déjà lues (statut `ok`)
-->

<script lang="ts">
	import CorrectionCard from '#lib/components/questions/CorrectionCard.svelte';
	import { ERROR_KIND_LABELS, errorGuessLabel } from '#lib/questions/error-kinds.ts';
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
	let kindCountsText = $derived(
		[
			...errors.errorKinds.map((c) => `${ERROR_KIND_LABELS[c.kind]} : ${c.count}`),
			...(errors.unrecognized > 0 ? [`Non reconnue : ${errors.unrecognized}`] : [])
		].join(' · ')
	);

	/** Étiquette du type de chaque case typée ; numérotée sur une question à plusieurs cases */
	function kindLabelsOf(group: QuestionErrorGroup): string[] {
		const several = (group.instance.blanks?.length ?? 0) > 1;
		return group.errorKinds.map(({ blank, guess }) =>
			several ? `Case ${blank} : ${errorGuessLabel(guess)}` : errorGuessLabel(guess)
		);
	}

	function pluralize(n: number, one: string, many: string): string {
		return `${n} ${n > 1 ? many : one}`;
	}
</script>

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
			{kindCountsText}
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
					{#if group.errorKinds.length > 0}
						<div class="flex flex-wrap gap-1" data-testid="error-kinds">
							{#each kindLabelsOf(group) as label (label)}
								<span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{label}</span>
							{/each}
						</div>
					{/if}
					<CorrectionCard answerResult={answerResultOf(group)} verdict={group.verdict} size="sm" />
				</div>
			{/each}
		</div>
	{/if}
</div>
