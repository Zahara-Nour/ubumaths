<!--
	QuestionErrorsPanel
	===================
	Erreurs de la classe sur UNE question (un modèle) : sans réponse, cases ratées,
	réponses fausses ou partielles regroupées (même énoncé tiré ET même réponse),
	chacune rendue comme la correction de l'élève. Les noms des élèves sont rendus
	en texte. Chantier `erreurs-frequentes` : bilan d'un contrôle (PR 1) et
	erreurs par point du programme (PR 2).

	Props:
	- errors: erreurs d'une question, déjà lues (statut `ok`)
-->

<script lang="ts">
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import type {
		EvaluationQuestionErrors,
		QuestionErrorGroup
	} from '$lib/types/evaluation-breakdown';
	import type { TestAnswerResult } from '$lib/types/test';

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
					<CorrectionCard answerResult={answerResultOf(group)} verdict={group.verdict} size="sm" />
				</div>
			{/each}
		</div>
	{/if}
</div>
